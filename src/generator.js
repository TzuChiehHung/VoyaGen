/**
 * VoyaGen AI 行程生成與微調模組
 * 負責直連 Gemini 3.5 Flash API、注入 Schema 規範、與存檔跳轉
 */

let currentEditSourceData = null; // 若為微調模式，儲存被微調的原始行程 JSON

// 將 JSON 字串值內的未轉義控制字元 (如換行 \n、Tab \t) 轉義或替換
function sanitizeJsonControlChars(str) {
    let inString = false;
    let isEscaped = false;
    let result = '';

    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (inString) {
            if (isEscaped) {
                result += char;
                isEscaped = false;
            } else if (char === '\\') {
                result += char;
                isEscaped = true;
            } else if (char === '"') {
                result += char;
                inString = false;
            } else if (char === '\n') {
                result += '\\n';
            } else if (char === '\r') {
                result += '\\r';
            } else if (char === '\t') {
                result += '\\t';
            } else {
                const code = char.charCodeAt(0);
                if (code < 32) {
                    result += ' ';
                } else {
                    result += char;
                }
            }
        } else {
            if (char === '"') {
                inString = true;
            }
            result += char;
        }
    }
    return result;
}

/**
 * 容錯 JSON 解析函式 (自動清理 Markdown 標籤、控制字元、尾隨逗號與多餘文字)
 */
function cleanAndParseJson(rawText) {
    if (!rawText) throw new Error('未取得有效內容');

    // 1. 清理 Markdown Code Block 標籤
    let text = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

    // 2. 嘗試直接解析
    try {
        return JSON.parse(text);
    } catch (e1) {
        // 3. 容錯處理：自動修復控制字元 (如未轉義換行/Tab) 與尾隨逗號
        try {
            const sanitized = sanitizeJsonControlChars(text)
                .replace(/,\s*([\]}])/g, '$1')
                .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
            return JSON.parse(sanitized);
        } catch (e2) {
            // 4. 擷取 JSON 物件主體 ({ ... }) 再度嘗試
            const firstBrace = text.indexOf('{');
            const lastBrace = text.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                const subText = sanitizeJsonControlChars(text.substring(firstBrace, lastBrace + 1))
                    .replace(/,\s*([\]}])/g, '$1');
                return JSON.parse(subText);
            }
            throw e1;
        }
    }
}

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
        if (modeBadge) modeBadge.innerText = '✦ AI 專屬規劃 ✦';
        if (modeTitle) modeTitle.innerText = '規劃您的夢幻旅程';
        if (modeDesc) modeDesc.innerText = '填寫目的地與偏好，Gemini 3.5 Flash 將秒級為您規劃完美行程';
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
        // 呼叫 voyaPrompts 建立 System Instruction 與 User Prompt (預設自動主題)
        const systemInstruction = voyaPrompts.buildSystemInstruction('auto');
        const userPrompt = voyaPrompts.buildUserPrompt({
            destination,
            days,
            draft,
            currentEditSourceData
        });

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
        const parsedJson = cleanAndParseJson(rawText);
        const generatedItinerary = normalizeItinerarySchema(parsedJson);

        voyaDrive.showToast('✨ AI 旅遊助理規劃完成！正在儲存至 Google Drive...', 'success');

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

        // 立即渲染最新生成的行程至 DOM
        if (typeof window.renderItineraryData === 'function') {
            window.renderItineraryData(generatedItinerary);
        }

        // 切換至行程預覽頁面
        if (savedDirectUrl) {
            window.location.hash = `#viewer?data=${encodeURIComponent(savedDirectUrl)}`;
        } else {
            window.location.hash = '#viewer';
        }
        if (typeof window.navigateTo === 'function') {
            window.navigateTo('viewer');
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
        else submitText.innerText = currentEditSourceData ? '使用 AI 套用修改' : '開始規劃行程';
    }
}

// 暴露全域 API
window.voyaGenerator = {
    initGeneratorView,
    generateItineraryWithAI
};
