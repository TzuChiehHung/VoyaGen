// 行程資料
let itineraryData = null;

// 取得網址參數
function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// 顏色轉換輔助函式 (HEX 轉 RGBA)
function hexToRgba(hex, alpha = 1) {
    if (!hex || typeof hex !== 'string') return `rgba(71, 85, 105, ${alpha})`;
    let cleanHex = hex.replace('#', '').trim();
    if (cleanHex.length === 3) {
        cleanHex = cleanHex.split('').map(c => c + c).join('');
    }
    if (cleanHex.length !== 6) return `rgba(71, 85, 105, ${alpha})`;
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// 將 HEX 色碼加深 (調暗)，用於產生奢華寶石漸層背景
function darkenHex(hex, factor = 0.3) {
    if (!hex || typeof hex !== 'string') return '#1e293b';
    let cleanHex = hex.replace('#', '').trim();
    if (cleanHex.length === 3) {
        cleanHex = cleanHex.split('').map(c => c + c).join('');
    }
    if (cleanHex.length !== 6) return '#1e293b';
    const r = Math.max(0, Math.min(255, Math.floor(parseInt(cleanHex.substring(0, 2), 16) * factor)));
    const g = Math.max(0, Math.min(255, Math.floor(parseInt(cleanHex.substring(2, 4), 16) * factor)));
    const b = Math.max(0, Math.min(255, Math.floor(parseInt(cleanHex.substring(4, 6), 16) * factor)));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// 將 HEX 色碼提亮 (粉軟高光)，用於產生發光副標題
function lightenHex(hex) {
    if (!hex || typeof hex !== 'string') return '#7dd3fc';
    let cleanHex = hex.replace('#', '').trim();
    if (cleanHex.length === 3) {
        cleanHex = cleanHex.split('').map(c => c + c).join('');
    }
    if (cleanHex.length !== 6) return '#7dd3fc';
    let r = parseInt(cleanHex.substring(0, 2), 16);
    let g = parseInt(cleanHex.substring(2, 4), 16);
    let b = parseInt(cleanHex.substring(4, 6), 16);
    r = Math.min(255, Math.floor(r + (255 - r) * 0.45));
    g = Math.min(255, Math.floor(g + (255 - g) * 0.45));
    b = Math.min(255, Math.floor(b + (255 - b) * 0.45));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// 內建設計師等級主題調色盤資料庫 (寶石級奢華漸層)
const DESIGNER_PALETTES = {
    rose: {
        primary_dark: '#0f172a',
        primary_mid: '#881337',
        accent_primary: '#e11d48',
        accent_light: '#fb7185',
        accent_bg: '#fff1f2',
        accent_shadow: 'rgba(225, 29, 72, 0.4)',
        timeline_border: '#fda4af',
        btn_gradient_from: '#881337',
        btn_gradient_to: '#e11d48',
        btn_border: '#881337',
        btn_shadow: 'rgba(225, 29, 72, 0.25)',
        milestone_bg_from: '#fff1f2',
        milestone_bg_to: '#ffe4e6',
        milestone_border: '#fda4af',
        milestone_shadow: 'rgba(225, 29, 72, 0.08)',
        flight_text: '#e11d48',
        map_hover: '#be123c',
        subtitle_text: '#fda4af',
        date_text: '#e11d48',
        hero_gradient_from: '#0f172a',
        hero_gradient_via: '#4c0519',
        hero_gradient_to: '#1e1b4b'
    },
    sky: {
        primary_dark: '#0f172a',
        primary_mid: '#1e3a8a',
        accent_primary: '#0284c7',
        accent_light: '#38bdf8',
        accent_bg: '#f0f9ff',
        accent_shadow: 'rgba(2, 132, 199, 0.6)',
        timeline_border: '#bae6fd',
        btn_gradient_from: '#1e3a8a',
        btn_gradient_to: '#0284c7',
        btn_border: '#1e3a8a',
        btn_shadow: 'rgba(2, 132, 199, 0.3)',
        milestone_bg_from: '#f0f9ff',
        milestone_bg_to: '#e0f2fe',
        milestone_border: '#bae6fd',
        milestone_shadow: 'rgba(2, 132, 199, 0.1)',
        flight_text: '#0284c7',
        map_hover: '#0369a1',
        subtitle_text: '#7dd3fc',
        date_text: '#0284c7',
        hero_gradient_from: '#0f172a',
        hero_gradient_via: '#1e3a8a',
        hero_gradient_to: '#0c4a6e'
    },
    emerald: {
        primary_dark: '#0f172a',
        primary_mid: '#064e3b',
        accent_primary: '#10b981',
        accent_light: '#6ee7b7',
        accent_bg: '#f0fdf4',
        accent_shadow: 'rgba(16, 185, 129, 0.4)',
        timeline_border: '#a7f3d0',
        btn_gradient_from: '#064e3b',
        btn_gradient_to: '#10b981',
        btn_border: '#064e3b',
        btn_shadow: 'rgba(16, 185, 129, 0.25)',
        milestone_bg_from: '#f0fdf4',
        milestone_bg_to: '#dcfce7',
        milestone_border: '#a7f3d0',
        milestone_shadow: 'rgba(16, 185, 129, 0.08)',
        flight_text: '#059669',
        map_hover: '#047857',
        subtitle_text: '#6ee7b7',
        date_text: '#059669',
        hero_gradient_from: '#0f172a',
        hero_gradient_via: '#064e3b',
        hero_gradient_to: '#0f172a'
    },
    amber: {
        primary_dark: '#1e1b4b',
        primary_mid: '#451a03',
        accent_primary: '#f59e0b',
        accent_light: '#fcd34d',
        accent_bg: '#fffbeb',
        accent_shadow: 'rgba(245, 158, 11, 0.4)',
        timeline_border: '#fde68a',
        btn_gradient_from: '#451a03',
        btn_gradient_to: '#f59e0b',
        btn_border: '#451a03',
        btn_shadow: 'rgba(245, 158, 11, 0.25)',
        milestone_bg_from: '#fffbeb',
        milestone_bg_to: '#fef3c7',
        milestone_border: '#fde68a',
        milestone_shadow: 'rgba(245, 158, 11, 0.08)',
        flight_text: '#d97706',
        map_hover: '#b45309',
        subtitle_text: '#fde047',
        date_text: '#d97706',
        hero_gradient_from: '#1e1b4b',
        hero_gradient_via: '#451a03',
        hero_gradient_to: '#0f172a'
    },
    indigo: {
        primary_dark: '#0f172a',
        primary_mid: '#311042',
        accent_primary: '#6366f1',
        accent_light: '#a5b4fc',
        accent_bg: '#eef2ff',
        accent_shadow: 'rgba(99, 102, 241, 0.4)',
        timeline_border: '#c7d2fe',
        btn_gradient_from: '#311042',
        btn_gradient_to: '#6366f1',
        btn_border: '#311042',
        btn_shadow: 'rgba(99, 102, 241, 0.25)',
        milestone_bg_from: '#eef2ff',
        milestone_bg_to: '#e0e7ff',
        milestone_border: '#c7d2fe',
        milestone_shadow: 'rgba(99, 102, 241, 0.08)',
        flight_text: '#4f46e5',
        map_hover: '#4338ca',
        subtitle_text: '#a5b4fc',
        date_text: '#4f46e5',
        hero_gradient_from: '#0f172a',
        hero_gradient_via: '#311042',
        hero_gradient_to: '#1e1b4b'
    }
};

// 動態更新 Tailwind CSS 色彩配置與主題變數 (含同色系自動衍生)
function applyTheme(theme) {
    const root = document.documentElement;
    if (typeof theme === 'string') {
        theme = { primary: theme };
    }
    theme = theme || {};

    const themeName = (theme.primary || '').toLowerCase();
    const basePalette = DESIGNER_PALETTES[themeName] || null;

    // 核心主視覺 Accent 顏色，若未提供則多層備用
    const accentPrimary = theme.accent_primary || (basePalette ? basePalette.accent_primary : '#0284c7');

    // 若無 Preset 匹配，依據 accentPrimary 動態推算 22 個 Token
    const computedHeroVia = (basePalette && basePalette.hero_gradient_via) ? basePalette.hero_gradient_via : darkenHex(accentPrimary, 0.35);
    const computedSubtitle = (basePalette && basePalette.subtitle_text) ? basePalette.subtitle_text : lightenHex(accentPrimary);
    const computedAccentLight = (basePalette && basePalette.accent_light) ? basePalette.accent_light : hexToRgba(accentPrimary, 0.35);
    const computedAccentBg = (basePalette && basePalette.accent_bg) ? basePalette.accent_bg : hexToRgba(accentPrimary, 0.08);
    const computedAccentShadow = (basePalette && basePalette.accent_shadow) ? basePalette.accent_shadow : hexToRgba(accentPrimary, 0.4);
    const computedTimelineBorder = (basePalette && basePalette.timeline_border) ? basePalette.timeline_border : hexToRgba(accentPrimary, 0.35);
    const computedDateText = (basePalette && basePalette.date_text) ? basePalette.date_text : accentPrimary;

    const computedTheme = {
        '--color-primary-dark': theme.primary_dark || (basePalette ? basePalette.primary_dark : '#0f172a'),
        '--color-primary-mid': theme.primary_mid || (basePalette ? basePalette.primary_mid : accentPrimary),
        '--color-accent-primary': accentPrimary,
        '--color-accent-light': theme.accent_light || computedAccentLight,
        '--color-accent-bg': theme.accent_bg || computedAccentBg,
        '--color-accent-shadow': theme.accent_shadow || computedAccentShadow,
        '--color-timeline-border': theme.timeline_border || computedTimelineBorder,
        '--color-btn-gradient-from': theme.btn_gradient_from || (basePalette ? basePalette.btn_gradient_from : accentPrimary),
        '--color-btn-gradient-to': theme.btn_gradient_to || (basePalette ? basePalette.btn_gradient_to : accentPrimary),
        '--color-btn-border': theme.btn_border || (basePalette ? basePalette.btn_border : accentPrimary),
        '--color-btn-shadow': theme.btn_shadow || (basePalette ? basePalette.btn_shadow : hexToRgba(accentPrimary, 0.25)),
        '--color-milestone-bg-from': theme.milestone_bg_from || (basePalette ? basePalette.milestone_bg_from : computedAccentBg),
        '--color-milestone-bg-to': theme.milestone_bg_to || (basePalette ? basePalette.milestone_bg_to : hexToRgba(accentPrimary, 0.15)),
        '--color-milestone-border': theme.milestone_border || (basePalette ? basePalette.milestone_border : computedTimelineBorder),
        '--color-milestone-shadow': theme.milestone_shadow || (basePalette ? basePalette.milestone_shadow : hexToRgba(accentPrimary, 0.08)),
        '--color-flight-text': theme.flight_text || (basePalette ? basePalette.flight_text : accentPrimary),
        '--color-map-hover': theme.map_hover || (basePalette ? basePalette.map_hover : accentPrimary),
        '--color-subtitle-text': theme.subtitle_text || computedSubtitle,
        '--color-date-text': theme.date_text || computedDateText,
        '--color-hero-gradient-from': theme.hero_gradient_from || (basePalette ? basePalette.hero_gradient_from : '#0f172a'),
        '--color-hero-gradient-via': theme.hero_gradient_via || computedHeroVia,
        '--color-hero-gradient-to': theme.hero_gradient_to || (basePalette ? basePalette.hero_gradient_to : '#1e1b4b')
    };

    for (const [cssVar, val] of Object.entries(computedTheme)) {
        root.style.setProperty(cssVar, val);
    }

    // 3. 動態更新 Favicon 顏色以符合主題色彩
    const faviconColor = accentPrimary;
    const faviconEl = document.getElementById("favicon");
    if (faviconEl) {
        const svgContent = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><circle cx='16' cy='16' r='14' fill='${encodeURIComponent(faviconColor)}'/><path d='M16 2 A14 14 0 0 0 2 16 A14 14 0 0 0 16 30 A14 14 0 0 0 30 16 A14 14 0 0 0 16 2 Z' fill='none' stroke='white' stroke-width='1.5' opacity='0.3'/><path d='M16 2 Q22 16 16 30 Q10 16 16 2' fill='none' stroke='white' stroke-width='1.5' opacity='0.4'/><path d='M2 16 H30' fill='none' stroke='white' stroke-width='1.5' opacity='0.4'/><path d='M12 18 L24 8 L20 22 L16 19 L12 18 Z M16 19 L24 8 L12 18 Z' fill='white'/></svg>`;
        faviconEl.href = `data:image/svg+xml,${svgContent}`;
    }
}


// 切換天數
function switchDay(dayNum) {
    localStorage.setItem('selectedDay', dayNum);
    
    // 更新側邊欄 active 狀態
    document.querySelectorAll('.day-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.classList.add('text-slate-600', 'border-slate-100', 'hover:bg-slate-50');
    });
    
    const activeBtn = document.getElementById('btn-day' + dayNum);
    if (activeBtn) {
        activeBtn.classList.remove('text-slate-600', 'border-slate-100', 'hover:bg-slate-50');
        activeBtn.classList.add('active');
    }
    
    const dayContentArea = document.getElementById('day-content-area');
    if (!dayContentArea || !itineraryData) return;
    
    const days = itineraryData.days || [];
    const dayData = days.find(d => d.day_number === dayNum);
    if (!dayData) {
        dayContentArea.innerHTML = `<div class="p-8 bg-rose-50 text-rose-600 rounded-xl font-bold text-center">找不到 Day ${dayNum} 行程內容</div>`;
        return;
    }
    
    // 渲染 Day Header & Timeline HTML
    const timeline = dayData.timeline || dayData.items || dayData.activities || [];
    let timelineHtml = timeline.map(item => {
        if (item.type === "split") {
            return renderSplitHtml(item);
        } else {
            return renderItemHtml(item);
        }
    }).join("");
    
    const dayHeaderHtml = `
        <div class="mb-6 border-b pb-4 border-slate-100">
            <div class="text-amber-600 font-bold text-base tracking-widest font-mono uppercase mb-1.5">${dayData.date_label || `Day ${dayNum}`}</div>
            <h2 class="text-2xl font-black text-indigo-900 tracking-tight">${dayData.day_title}</h2>
        </div>
    `;
    
    dayContentArea.innerHTML = `<div class="animate-fade-in">${dayHeaderHtml} ${timelineHtml}</div>`;
    
    // 復原交通切換開關狀態
    const toggleEl = document.getElementById('transfer-toggle');
    if (toggleEl && localStorage.getItem('showTransfers') !== null) {
        toggleEl.checked = localStorage.getItem('showTransfers') === 'true';
    }
    
    toggleTransfers();
}
window.switchDay = switchDay;

// 切換交通隱藏與顯示
function toggleTransfers() {
    const toggleElement = document.getElementById('transfer-toggle');
    if (!toggleElement) return;
    
    const isChecked = toggleElement.checked;
    localStorage.setItem('showTransfers', isChecked);
    
    document.querySelectorAll('.timeline-item-transfer').forEach(el => {
        el.classList.toggle('hidden', !isChecked);
    });
}
window.toggleTransfers = toggleTransfers;

let currentLoadedUrl = null;

// 從 URL 載入資料並初始化網頁
async function init(forceReload = false) {
    const rawDataUrl = getQueryParam('data') || 'templates/itinerary.json';
    const dataUrl = (typeof normalizeDataUrl === 'function') ? normalizeDataUrl(rawDataUrl) : rawDataUrl;
    const dayContentArea = document.getElementById('day-content-area');

    if (!forceReload && currentLoadedUrl === dataUrl && itineraryData) {
        return; // 若已載入相同資料則跳過
    }
    
    try {
        let headers = {};
        let finalUrl = dataUrl;

        // 提取 Google Drive File ID (包含 lh3, uc?export=, file/d/)
        const gDriveIdMatch = dataUrl.match(/lh3\.googleusercontent\.com\/d\/([^/?#]+)/) ||
                              dataUrl.match(/drive\.google\.com\/uc\?export=download&id=([^&]+)/) ||
                              dataUrl.match(/drive\.google\.com\/file\/d\/([^/?#]+)/);

        const fileId = gDriveIdMatch ? gDriveIdMatch[1] : null;
        const token = (typeof voyaAuth !== 'undefined') ? voyaAuth.getAccessToken() : null;
        const apiKey = (typeof voyaAuth !== 'undefined') ? voyaAuth.getApiKey() : null;

        // 若已登入且為 Google Drive 檔案，優先使用 Drive API + Bearer Token
        if (fileId && token) {
            finalUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
            headers['Authorization'] = `Bearer ${token}`;
        } else if (fileId && apiKey) {
            // 未登入但有設定 API Key，使用 Google 官方 Drive API (秒讀且原生開放 CORS)
            finalUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
        }

        let response;
        try {
            response = await fetch(finalUrl, { headers });
            if (!response.ok) throw new Error(`HTTP 錯誤: ${response.status}`);
            itineraryData = await response.json();
        } catch (fetchErr) {
            // 未登入/跨域阻檔時，嘗試多重 CORS 代理通道
            if (fileId) {
                console.warn('直連受限，啟動多軌 CORS 代理備援通道...');
                const targetUrl = `https://drive.google.com/uc?export=download&confirm=no_antivirus&id=${fileId}`;
                let fetchedJson = null;

                // 嘗試 1: AllOrigins JSON 包裹模式
                try {
                    const res1 = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`);
                    if (res1.ok) {
                        const data1 = await res1.json();
                        if (data1 && data1.contents) {
                            fetchedJson = (typeof data1.contents === 'string') ? JSON.parse(data1.contents) : data1.contents;
                        }
                    }
                } catch (e1) {
                    console.warn('AllOrigins 代理通道失敗:', e1);
                }

                // 嘗試 2: Corsproxy.io 模式
                if (!fetchedJson) {
                    try {
                        const res2 = await fetch(`https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`);
                        if (res2.ok) fetchedJson = await res2.json();
                    } catch (e2) {
                        console.warn('Corsproxy 代理通道失敗:', e2);
                    }
                }

                // 嘗試 3: Thingproxy 模式
                if (!fetchedJson) {
                    try {
                        const res3 = await fetch(`https://thingproxy.freeboard.io/fetch/${targetUrl}`);
                        if (res3.ok) fetchedJson = await res3.json();
                    } catch (e3) {
                        console.warn('Thingproxy 代理通道失敗:', e3);
                    }
                }

                if (fetchedJson) {
                    itineraryData = fetchedJson;
                } else {
                    throw fetchErr;
                }
            } else {
                throw fetchErr;
            }
        }
        currentLoadedUrl = dataUrl;
        
        // 相容性拆包檢查 (適應不同 AI 輸出的根物件包裹結構)
        if (itineraryData && !itineraryData.days && itineraryData.itinerary?.days) {
            itineraryData = itineraryData.itinerary;
        } else if (itineraryData && !itineraryData.days && itineraryData.data?.days) {
            itineraryData = itineraryData.data;
        }
        itineraryData.meta = itineraryData.meta || {};
        itineraryData.days = itineraryData.days || [];

        // 1. 初始化 Meta 與主題
        document.title = itineraryData.meta.title || "VoyaGen 旅遊行程";
        const titleEl = document.getElementById('trip-title');
        if (titleEl) {
            const titleText = itineraryData.meta.title || "";
            const titleParts = titleText.split(' ');
            if (titleParts.length >= 2) {
                const mainTitle = titleParts.slice(0, -1).join(' ');
                const highlightTitle = titleParts[titleParts.length - 1];
                titleEl.innerHTML = `
                    ${mainTitle} <br class="md:hidden">
                    <span class="text-transparent bg-clip-text" style="background-image: linear-gradient(to right, var(--color-accent-light), var(--color-accent-primary)) !important;">${highlightTitle}</span>
                `;
            } else {
                titleEl.innerText = titleText;
            }
        }
        document.getElementById('trip-subtitle').innerText = `✦ ${itineraryData.meta.subtitle || '旅遊行程'} ✦`;
        document.getElementById('trip-date').innerText = itineraryData.meta.date_range || '';
        
        const routeEl = document.getElementById('trip-route');
        const dividerEl = document.getElementById('trip-divider');
        if (routeEl) {
            routeEl.innerText = itineraryData.meta.route || "";
            if (itineraryData.meta.route) {
                routeEl.classList.remove('hidden');
                if (dividerEl) dividerEl.classList.remove('hidden');
            } else {
                routeEl.classList.add('hidden');
                if (dividerEl) dividerEl.classList.add('hidden');
            }
        }
        
        document.getElementById('trip-update').innerText = `最後更新：${itineraryData.meta.last_updated || '無'}`;
        
        applyTheme(itineraryData.meta.theme || {});
        
        // 2. 初始化側邊欄
        const sidebar = document.getElementById('day-sidebar');
        if (sidebar) {
            const daysList = itineraryData.days || [];
            sidebar.innerHTML = daysList.map(day => `
                <button onclick="switchDay(${day.day_number})" id="btn-day${day.day_number}" class="day-btn flex-shrink-0 text-left px-4 py-3 rounded-xl border border-slate-100 font-medium text-slate-600 hover:bg-slate-50 transition-all">
                    Day ${day.day_number}
                    <span class="block text-xs font-normal opacity-80 mt-0.5">${day.day_title || ''}</span>
                </button>
            `).join("");
        }
        
        // 3. 綁定開關事件
        const toggleEl = document.getElementById('transfer-toggle');
        if (toggleEl) {
            toggleEl.addEventListener('change', toggleTransfers);
        }
        
        // 4. 載入上次或預設 Day 1
        const savedDay = parseInt(localStorage.getItem('selectedDay')) || 1;
        // 確保 savedDay 在有效範圍內
        const startDay = itineraryData.days.some(d => d.day_number === savedDay) ? savedDay : itineraryData.days[0].day_number;
        switchDay(startDay);
        
    } catch (error) {
        console.error("載入行程失敗:", error);
        if (dayContentArea) {
            dayContentArea.innerHTML = `
                <div class="p-8 bg-rose-50 text-rose-600 rounded-xl font-bold text-center shadow-sm">
                    <i class="fa-solid fa-circle-exclamation text-3xl mb-3 block"></i>
                    載入行程資料失敗！<br>
                    <span class="text-sm font-normal text-rose-400 mt-2 block">錯誤原因: ${error.message}</span>
                    <span class="text-xs font-normal text-slate-400 mt-1 block">請檢查網址參數 ?data= 是否正確，或是否在本地啟動了 Live Server。</span>
                </div>
            `;
        }
    }
}

// 頁面加載完成後執行
document.addEventListener('DOMContentLoaded', init);
window.initItineraryView = init;
window.getItineraryData = () => itineraryData;
window.renderItineraryData = (data) => {
    if (!data) return;
    itineraryData = data;
    itineraryData.meta = itineraryData.meta || {};
    itineraryData.days = itineraryData.days || [];

    // 1. 更新 Meta 與主題
    document.title = itineraryData.meta.title || "VoyaGen 旅遊行程";
    const titleEl = document.getElementById('trip-title');
    if (titleEl) {
        titleEl.innerText = itineraryData.meta.title || "";
    }
    const subtitleEl = document.getElementById('trip-subtitle');
    if (subtitleEl) {
        subtitleEl.innerText = itineraryData.meta.subtitle || "✦ 旅遊行程 ✦";
    }
    const dateEl = document.getElementById('trip-date');
    if (dateEl) {
        dateEl.innerText = itineraryData.meta.date_range || "";
    }
    const routeEl = document.getElementById('trip-route');
    const dividerEl = document.getElementById('trip-divider');
    if (routeEl) {
        routeEl.innerText = itineraryData.meta.route || "";
        if (itineraryData.meta.route) {
            routeEl.classList.remove('hidden');
            if (dividerEl) dividerEl.classList.remove('hidden');
        }
    }
    const updateEl = document.getElementById('trip-update');
    if (updateEl) {
        updateEl.innerText = `最後更新：${itineraryData.meta.last_updated || '無'}`;
    }

    applyTheme(itineraryData.meta.theme || {});

    // 2. 初始化側邊欄
    const sidebar = document.getElementById('day-sidebar');
    if (sidebar) {
        const daysList = itineraryData.days || [];
        sidebar.innerHTML = daysList.map(day => `
            <button onclick="switchDay(${day.day_number})" id="btn-day${day.day_number}" class="day-btn flex-shrink-0 text-left px-4 py-3 rounded-xl border border-slate-100 font-medium text-slate-600 hover:bg-slate-50 transition-all">
                Day ${day.day_number}
                <span class="block text-xs font-normal opacity-80 mt-0.5">${day.day_title || ''}</span>
            </button>
        `).join("");
    }

    // 3. 載入 Day 1
    const startDay = itineraryData.days.length > 0 ? itineraryData.days[0].day_number : 1;
    switchDay(startDay);
};
