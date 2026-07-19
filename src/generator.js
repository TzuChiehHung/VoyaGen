/**
 * VoyaGen AI 行程生成與微調模組
 * 負責直連 Gemini 3.5 Flash API、注入 Schema 規範、與存檔跳轉
 */

let currentEditSourceData = null; // 若為微調模式，儲存被微調的原始行程 JSON

/**
 * 確保生成的 JSON 結構符合 ItinerarySchema 規範 (schema.json)
 */
function normalizeItinerarySchema(json) {
    if (!json || typeof json !== 'object') json = {};
    if (!json.meta || typeof json.meta !== 'object') json.meta = {};
    if (!json.meta.title) json.meta.title = 'AI 智慧旅遊行程';
    if (!json.meta.date_range) json.meta.date_range = '2026';
    if (!Array.isArray(json.days)) json.days = [];
    return json;
}

/**
 * 初始化 AI 生成器視圖
 * @param {Object} sourceData - 選擇性傳入現有行程 JSON 以開啟 AI 微調模式
 */
function initGeneratorView(sourceData = null) {
    currentEditSourceData = sourceData;
    const modeBadge = document.getElementById('gen-mode-badge');
    const modeTitle = document.getElementById('gen-mode-title');
    const modeDesc = document.getElementById('gen-mode-desc');
    const submitBtnText = document.getElementById('gen-submit-text');

    const destInput = document.getElementById('gen-destination');
    const daysInput = document.getElementById('gen-days');
    const draftInput = document.getElementById('gen-draft');
    const themeSelect = document.getElementById('gen-theme');

    if (sourceData && sourceData.meta) {
        // 微調模式
        if (modeBadge) modeBadge.innerText = 'AI 行程微調模式';
        if (modeTitle) modeTitle.innerText = `編輯：${sourceData.meta.title || '現有行程'}`;
        if (modeDesc) modeDesc.innerText = '請輸入您希望修改的內容（如：增加景點、調整順序或風格），Gemini 將自動重新整合。';
        if (submitBtnText) submitBtnText.innerText = '使用 AI 套用修改';

        if (destInput) destInput.value = sourceData.meta.title || '';
        if (daysInput) daysInput.value = sourceData.days ? sourceData.days.length : '';
        if (themeSelect && sourceData.meta.theme) themeSelect.value = sourceData.meta.theme;
        if (draftInput) draftInput.placeholder = '例如：請幫我將第二天的行程與第三天對調，並在第一天晚餐加上西面烤肉...';
    } else {
        // 全新生成模式
        if (modeBadge) modeBadge.innerText = '全新 AI 生成';
        if (modeTitle) modeTitle.innerText = '規劃您的夢幻旅程';
        if (modeDesc) modeDesc.innerText = '填寫目的地與偏好，Gemini 3.5 Flash 將秒級為您規劃完美行程。';
        if (submitBtnText) submitBtnText.innerText = '開始 AI 智慧生成';

        if (destInput) destInput.value = '';
        if (daysInput) daysInput.value = '';
        if (themeSelect) themeSelect.value = 'auto';
        if (draftInput) draftInput.value = '';
        const apiKeyInput = document.getElementById('gen-user-api-key');
        if (apiKeyInput) {
            apiKeyInput.value = localStorage.getItem('voyagen_user_gemini_key') || '';
        }
    }
}

/**
 * 核心函式：呼叫 Gemini 2.5 Flash API 生成或編修行程
 */
async function generateItineraryWithAI() {
    const destInput = document.getElementById('gen-destination');
    const daysInput = document.getElementById('gen-days');
    const draftInput = document.getElementById('gen-draft');
    const themeSelect = document.getElementById('gen-theme');
    const userApiKeyInput = document.getElementById('gen-user-api-key');

    const destination = destInput ? destInput.value.trim() : '';
    const days = daysInput ? daysInput.value.trim() : '';
    const draft = draftInput ? draftInput.value.trim() : '';
    const theme = themeSelect ? themeSelect.value : 'auto';
    const userGeminiKey = (userApiKeyInput ? userApiKeyInput.value.trim() : '') || localStorage.getItem('voyagen_user_gemini_key') || '';

    if (!destination && !draft) {
        voyaDrive.showToast('請輸入旅遊目的地或行程文字草稿！', 'error');
        return;
    }

    // 取得 Google OAuth AccessToken
    const token = voyaAuth.getAccessToken();

    if (!token) {
        voyaDrive.showToast('請先登入 Google 帳號以使用 AI 規劃功能！', 'error');
        return;
    }

    setGenLoadingState(true);

    try {
        const daysGuide = days ? `- 規劃天數：${days} 天` : '';
        const themeGuide = (theme && theme !== 'auto') ? `指定主題風格色調：${theme}。` : '主題風格設為自動，為其分配協調的主題色彩。';

        // 建立 System Instruction 與 User Prompt
        const systemInstruction = `你是一位頂級專業的旅遊規劃專家。請根據使用者的需求，輸出符合標準 JSON 格式的旅遊行程。

【重要：輸出 JSON 格式規範】
你輸出的 JSON 必須嚴格符合以下結構：
{
  "meta": {
    "title": "請將使用者輸入潤飾為吸引人且好辨識的專業標題 (如：2026 日本京都大阪 5天4夜古都櫻花質感之旅)",
    "subtitle": "副標題 (如：清水寺散策 ✕ 嵐山小火車 ✕ 道頓堀美食體驗)",
    "date_range": "日期區間 (如：2026/04/01 - 2026/04/05)",
    "version": "1.0",
    "last_updated": "${new Date().toISOString().split('T')[0]}",
    "route": "景點路線概括 (如：關西機場 ➔ 京都 ➔ 大阪 ➔ 關西機場)",
    "theme": ${theme === 'auto' ? `{
      "primary": "#1e293b",
      "accent": "#6366f1",
      "accent_light": "#a5b4fc",
      "bg_gradient_start": "#0f172a",
      "bg_gradient_end": "#1e1b4b"
    }` : `"${theme}"`}
  },
  "days": [
    {
      "day_number": 1,
      "date_label": "DAY 1",
      "day_title": "單日主題 (如：抵達關西與京都古都風華)",
      "timeline": [
        {
          "time": "14:00",
          "title": "搭乘 HARUKA 特急前往京都",
          "type": "transfer",
          "description": "於關西國際機場搭乘 HARUKA 直接抵達京都車站 Check-in。",
          "bullets": ["建議提前預訂 ICOCA & HARUKA 優惠套票"],
          "map_link": "https://www.google.com/maps/search/?api=1&query=京都車站"
        },
        {
          "time": "16:00",
          "title": "清水寺與二年坂、三年坂散策",
          "type": "milestone",
          "description": "漫步於古色古香的石板路，遠眺京都塔夕陽美景。",
          "bullets": ["必訪本堂舞台", "地主神社祈求良緣"],
          "notes": [
            {
              "title": "貼心提醒",
              "content": "石板路較多階梯，建議穿著舒適步行鞋。",
              "icon": "fa-solid fa-person-walking"
            }
          ],
          "map_link": "https://www.google.com/maps/search/?api=1&query=清水寺"
        }
      ]
    }
  ]
}

請確保：
1. title 必須經過 AI 專業潤飾，變成兼具年份、地區、天數與主題特點的吸睛標題 (例如：2026 釜山海景與巨濟島 4天3夜質感之旅)。
2. ${themeGuide}
3. 物件 Key 名稱必須精準為 day_number, day_title, date_label, timeline, time, title, type, description, bullets, notes, map_link。
4. type 可為 "milestone" (主要景點/美食) 或 "transfer" (交通移動)。
5. map_link 必須為完整的 Google Maps 搜尋網址，格式為 https://www.google.com/maps/search/?api=1&query=地點名稱。
6. 輸出必須是純粹的合法 JSON 格式，不可以包含 Markdown 註解如 \`\`\`json。`;

        let userPrompt = "";

        if (currentEditSourceData) {
            userPrompt = `【行程微調任務】
以下是目前的現有行程 JSON：
${JSON.stringify(currentEditSourceData, null, 2)}

使用者希望進行以下修改與編修：
"${draft || '請優化景點順序與交通銜接'}"

請根據上述修改要求，修訂並輸出最終完整的行程 JSON。`;
        } else {
            userPrompt = `【全新行程規劃任務】
- 旅遊目的地：${destination || '根據草稿規劃'}
${daysGuide}
- 指定主題/細節草稿：${draft || '請安排最具代表性的熱門景點與美食體驗'}

請生成一份專業、結構完整且符合 JSON 規範的旅遊行程。`;
        }

        // 呼叫 Generative Language API
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent`;
        const requestHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        const clientId = (typeof VOYA_CONFIG !== 'undefined') ? VOYA_CONFIG.DEFAULT_CLIENT_ID : '';
        const projectIdMatch = clientId.match(/^(\d+)-/);
        if (projectIdMatch) {
            requestHeaders['x-goog-user-project'] = projectIdMatch[1];
        }

        const requestBody = {
            contents: [
                {
                    role: "user",
                    parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }]
                }
            ],
            generationConfig: {
                temperature: 0.7,
                response_mime_type: "application/json"
            }
        };

        const res = await fetch(apiUrl, {
            method: 'POST',
            headers: requestHeaders,
            body: JSON.stringify(requestBody)
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Gemini API 錯誤 (${res.status}): ${errText}`);
        }

        const resData = await res.json();
        const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawText) {
            throw new Error('Gemini 未回傳有效的文字內容');
        }

        // 解析 JSON 並實施結構歸一化
        const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedJson = JSON.parse(cleanedText);
        const generatedItinerary = normalizeItinerarySchema(parsedJson);

        voyaDrive.showToast('✨ AI 行程規劃完成！正在儲存至 Google Drive...', 'success');

        // 自動寫入或更新至 Google Drive (若已登入)
        let savedDirectUrl = null;
        if (voyaAuth.isLoggedIn()) {
            try {
                // 若為微調模式，優先使用原始標題作為檔名，實現原地覆蓋 (不重複建立多餘檔案)
                const targetTitle = (currentEditSourceData && currentEditSourceData.meta && currentEditSourceData.meta.title)
                    ? currentEditSourceData.meta.title
                    : (generatedItinerary.meta ? generatedItinerary.meta.title : 'itinerary');

                const saveResult = await voyaDrive.saveItineraryToDrive(targetTitle, generatedItinerary);
                savedDirectUrl = saveResult.directUrl;
            } catch (saveErr) {
                console.warn('自動儲存至 Drive 失敗，改用記憶體快取:', saveErr);
            }
        }

        // 跳轉至行程展示頁
        if (savedDirectUrl) {
            window.location.hash = `#viewer?data=${encodeURIComponent(savedDirectUrl)}`;
        } else {
            // 直接以全域記憶體載入並展示
            if (typeof window.initItineraryView === 'function') {
                window.location.hash = '#viewer';
                setTimeout(() => {
                    window.renderItineraryData(generatedItinerary);
                }, 100);
            }
        }

    } catch (err) {
        console.error('AI 生成行程失敗:', err);
        voyaDrive.showToast(`生成失敗: ${err.message}`, 'error');
    } finally {
        setGenLoadingState(false);
    }
}

/**
 * 控制 Loading 狀態 UI
 */
function setGenLoadingState(isLoading) {
    const submitBtn = document.getElementById('gen-submit-btn');
    const submitText = document.getElementById('gen-submit-text');
    const spinner = document.getElementById('gen-spinner');

    if (submitBtn) submitBtn.disabled = isLoading;
    if (spinner) {
        if (isLoading) spinner.classList.remove('hidden');
        else spinner.classList.add('hidden');
    }
    if (submitText) {
        if (isLoading) submitText.innerText = currentEditSourceData ? 'AI 正在精緻編修行程中...' : 'AI 正在規劃完美行程中...';
        else submitText.innerText = currentEditSourceData ? '使用 AI 套用修改' : '開始 AI 智慧生成';
    }
}

// 暴露全域 API
window.voyaGenerator = {
    initGeneratorView,
    generateItineraryWithAI
};
