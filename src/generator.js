/**
 * VoyaGen AI 行程生成與對話微調模組
 * 負責直連 Gemini 3.5 Flash API、注入 Schema 規範、與存檔跳轉
 */

let currentEditSourceData = null; // 若為微調模式，儲存被微調的原始行程資料

/**
 * 智慧容錯解析函式 (結合 voyaYaml)
 */
function cleanAndParseContent(rawText) {
    if (!rawText) throw new Error('未取得有效內容');

    if (window.voyaYaml && typeof window.voyaYaml.parseYamlOrJson === 'function') {
        return window.voyaYaml.parseYamlOrJson(rawText);
    }

    let text = rawText.replace(/```(json|yaml)?/gi, '').replace(/```/g, '').trim();
    return JSON.parse(text);
}

/**
 * 確保生成的 JSON/YAML 結構符合規範
 */
function normalizeItinerarySchema(data) {
    if (!data || typeof data !== 'object') data = {};
    if (!data.meta || typeof data.meta !== 'object') data.meta = {};
    if (!data.meta.title) data.meta.title = 'AI 智慧旅遊行程';
    if (!data.meta.date_range) data.meta.date_range = '2026';
    if (!Array.isArray(data.days)) data.days = [];
    return data;
}

/**
 * 初始化 AI 生成器視圖
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
        if (modeDesc) modeDesc.innerText = '填寫目的地與偏好，AI 旅遊規劃師將為您規劃完美行程';
        if (submitBtnText) submitBtnText.innerText = '開始 AI 智慧生成';

        const startDateInput = document.getElementById('gen-start-date');
        const endDateInput = document.getElementById('gen-end-date');

        if (destInput) destInput.value = '';
        if (daysInput) daysInput.value = '';
        if (startDateInput) startDateInput.value = '';
        if (endDateInput) endDateInput.value = '';
        if (themeSelect) themeSelect.value = 'auto';
        if (draftInput) draftInput.value = '';
    }
}

/**
 * 當使用者選擇日曆出發或結束日期時，自動計算與同步預計天數
 */
function handleDateChange() {
    const startEl = document.getElementById('gen-start-date');
    const endEl = document.getElementById('gen-end-date');
    const daysEl = document.getElementById('gen-days');

    if (startEl && endEl && startEl.value && endEl.value) {
        const start = new Date(startEl.value);
        const end = new Date(endEl.value);
        if (end >= start) {
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            if (daysEl) daysEl.value = diffDays;
        }
    }
}

/**
 * 當使用者輸入或修改天數時，若已有出發日期，自動計算結束日期
 */
function handleDaysChange() {
    const startEl = document.getElementById('gen-start-date');
    const endEl = document.getElementById('gen-end-date');
    const daysEl = document.getElementById('gen-days');

    if (startEl && daysEl && startEl.value && daysEl.value) {
        const days = parseInt(daysEl.value, 10);
        if (days > 0) {
            const start = new Date(startEl.value);
            const end = new Date(start);
            end.setDate(start.getDate() + days - 1);
            const yyyy = end.getFullYear();
            const mm = String(end.getMonth() + 1).padStart(2, '0');
            const dd = String(end.getDate()).padStart(2, '0');
            if (endEl) endEl.value = `${yyyy}-${mm}-${dd}`;
        }
    }
}

/**
 * 核心函式：呼叫 Gemini 3.5 Flash API 全新生成或編修行程
 */
async function generateItineraryWithAI() {
    const destInput = document.getElementById('gen-destination');
    const daysInput = document.getElementById('gen-days');
    const startDateInput = document.getElementById('gen-start-date');
    const endDateInput = document.getElementById('gen-end-date');
    const draftInput = document.getElementById('gen-draft');

    const destination = destInput ? destInput.value.trim() : '';
    const days = daysInput ? daysInput.value.trim() : '';
    const startDate = startDateInput ? startDateInput.value : '';
    const endDate = endDateInput ? endDateInput.value : '';
    const draft = draftInput ? draftInput.value.trim() : '';

    let dateRange = '';
    if (startDate && endDate) {
        const s = new Date(startDate);
        const e = new Date(endDate);
        if (e >= s) {
            dateRange = `${s.getFullYear()}/${s.getMonth() + 1}/${s.getDate()} - ${e.getFullYear()}/${e.getMonth() + 1}/${e.getDate()}`;
        }
    }

    if (!destination && !draft) {
        voyaDrive.showToast('請輸入旅遊目的地或行程文字草稿！', 'error');
        return;
    }

    const token = voyaAuth.getAccessToken();
    if (!token) {
        voyaDrive.showToast('請先登入 Google 帳號以使用 AI 規劃功能！', 'error');
        return;
    }

    setGenLoadingState(true);

    try {
        const systemInstruction = voyaPrompts.buildSystemInstruction('auto');
        const userPrompt = voyaPrompts.buildUserPrompt({
            destination,
            days,
            dateRange,
            draft,
            currentEditSourceData
        });

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent`;
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
                temperature: 0.7
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
            throw new Error('Gemini 未回傳有效的內容');
        }

        const parsed = cleanAndParseContent(rawText);
        const generatedItinerary = normalizeItinerarySchema(parsed);

        voyaDrive.showToast('✨ AI 旅遊規劃師已完成行程！正在儲存至 Google Drive...', 'success');

        let savedDirectUrl = null;
        if (voyaAuth.isLoggedIn()) {
            try {
                const targetTitle = (currentEditSourceData && currentEditSourceData.meta && currentEditSourceData.meta.title)
                    ? currentEditSourceData.meta.title
                    : (generatedItinerary.meta ? generatedItinerary.meta.title : 'itinerary');

                const saveResult = await voyaDrive.saveItineraryToDrive(targetTitle, generatedItinerary);
                savedDirectUrl = saveResult.directUrl;
            } catch (saveErr) {
                console.warn('自動儲存至 Drive 失敗，改用記憶體快取:', saveErr);
            }
        }

        if (typeof window.renderItineraryData === 'function') {
            window.renderItineraryData(generatedItinerary);
        }

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
 * 封裝呼叫 Gemini API 並具備 503/429 自動重試 (Retry with Backoff) 的請求工具
 */
async function fetchGeminiWithRetry(apiUrl, requestHeaders, requestBody, statusEl = null, maxRetries = 2) {
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (attempt > 0) {
            const delayMs = attempt * 2500;
            if (statusEl) statusEl.innerText = `伺服器忙碌中，${delayMs / 1000} 秒後自動重試 (${attempt}/${maxRetries})...`;
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }

        const res = await fetch(apiUrl, {
            method: 'POST',
            headers: requestHeaders,
            body: JSON.stringify(requestBody)
        });

        if (res.ok) {
            const resData = await res.json();
            const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!rawText) throw new Error('Gemini 未回傳有效的內容');
            return rawText;
        }

        const errText = await res.text();
        lastError = new Error(`Gemini API 錯誤 (${res.status}): ${errText}`);

        // 僅針對 503 (High Demand) 與 429 (Rate Limit) 進行自動重試
        if (res.status !== 503 && res.status !== 429) {
            throw lastError;
        }
    }

    throw lastError;
}
async function chatModifyWithAI(userInstruction) {
    if (!userInstruction || !userInstruction.trim()) return;

    const token = voyaAuth.getAccessToken();
    if (!token) {
        voyaDrive.showToast('請先登入 Google 帳號才能使用 AI 對話助理！', 'error');
        return;
    }

    const currentData = (typeof window.getItineraryData === 'function') ? window.getItineraryData() : null;
    if (!currentData) {
        voyaDrive.showToast('無法取得目前行程資料！', 'error');
        return;
    }

    const sendBtn = document.getElementById('ai-chat-send-btn');
    const statusText = document.getElementById('ai-chat-status');
    const chatLog = document.getElementById('ai-chat-log');
    const inputArea = document.getElementById('ai-chat-input');

    if (sendBtn) sendBtn.disabled = true;
    if (statusText) statusText.innerText = 'AI 思考與調整中...';

    // 1. 將使用者訊息加入 Chat Log DOM
    if (chatLog) {
        const userMsgEl = document.createElement('div');
        userMsgEl.className = 'chat-msg user bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl px-4 py-3 text-sm shadow-md ml-8 self-end leading-relaxed border border-slate-700/80 animate-fade-in';
        userMsgEl.innerText = userInstruction;
        chatLog.appendChild(userMsgEl);
        chatLog.scrollTop = chatLog.scrollHeight;
    }

    // 2. 備份當前狀態至 UndoStack
    if (window.voyaUndoStack && typeof window.voyaUndoStack.push === 'function') {
        window.voyaUndoStack.push(currentData);
    }

    try {
        const systemInstruction = voyaPrompts.buildChatSystemInstruction();
        const userPrompt = voyaPrompts.buildChatUserPrompt({
            currentItineraryData: currentData,
            userInstruction
        });

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent`;
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
                temperature: 0.5
            }
        };

        const rawText = await fetchGeminiWithRetry(apiUrl, requestHeaders, requestBody, statusText, 2);
        const parsed = cleanAndParseContent(rawText);

        // 3. Smart Merge 區塊替換邏輯
        const updatedData = JSON.parse(JSON.stringify(currentData));

        if (parsed.meta) {
            updatedData.meta = Object.assign({}, updatedData.meta, parsed.meta);
        }

        const updatedDays = parsed.updated_days || parsed.days;
        if (Array.isArray(updatedDays) && updatedDays.length > 0) {
            updatedDays.forEach(newDay => {
                const idx = updatedData.days.findIndex(d => d.day_number === newDay.day_number);
                if (idx !== -1) {
                    updatedData.days[idx] = newDay;
                } else {
                    updatedData.days.push(newDay);
                }
            });
            updatedData.days.sort((a, b) => a.day_number - b.day_number);
        }

        updatedData.meta.last_updated = new Date().toISOString().split('T')[0];

        // 4. 重新渲染畫面
        if (typeof window.renderItineraryData === 'function') {
            window.renderItineraryData(updatedData);
        }

        // 5. 將 AI 回應訊息加入 Chat Log DOM
        const summaryText = parsed.summary || '已成功為您更新行程！';
        if (chatLog) {
            const aiMsgEl = document.createElement('div');
            aiMsgEl.className = 'chat-msg ai bg-white border border-slate-200/80 rounded-2xl p-4 text-sm text-slate-700 shadow-sm mr-6 leading-relaxed animate-fade-in';
            aiMsgEl.innerHTML = `
                <div class="flex items-center gap-1.5 font-bold text-sky-600 mb-1">
                    <i class="fa-solid fa-wand-magic-sparkles"></i>
                    <span>AI 修改完成</span>
                </div>
                <div>${summaryText}</div>
            `;
            chatLog.appendChild(aiMsgEl);
            chatLog.scrollTop = chatLog.scrollHeight;
        }

        if (inputArea) inputArea.value = '';
        voyaDrive.showToast(`✨ ${summaryText}`, 'success');

        // 6. 同步覆蓋儲存至 Google Drive (在背景執行)
        if (voyaAuth.isLoggedIn() && window.currentLoadedFileId) {
            voyaDrive.saveItineraryToDrive(
                updatedData.meta.title || 'itinerary',
                updatedData,
                window.currentLoadedFileId
            ).catch(err => console.warn('背景同步至 Drive 失敗:', err));
        }

    } catch (err) {
        console.error('AI 對話微調失敗:', err);
        voyaDrive.showToast(`微調失敗: ${err.message}`, 'error');

        if (chatLog) {
            const errMsgEl = document.createElement('div');
            errMsgEl.className = 'chat-msg error bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl p-4 text-sm shadow-sm mr-6 animate-fade-in';
            errMsgEl.innerText = `抱歉，修改時發生錯誤：${err.message}`;
            chatLog.appendChild(errMsgEl);
            chatLog.scrollTop = chatLog.scrollHeight;
        }
    } finally {
        if (sendBtn) sendBtn.disabled = false;
        if (statusText) statusText.innerText = '就緒';
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
    generateItineraryWithAI,
    chatModifyWithAI,
    handleDateChange,
    handleDaysChange
};
