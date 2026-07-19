// 行程資料
let itineraryData = null;

// 取得網址參數
function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// 動態更新 Tailwind CSS 色彩配置與主題變數
function applyTheme(theme) {
    const root = document.documentElement;
    
    // 預設中性配色 (作為 fallback，如果行程 JSON 沒定義某些欄位時使用)
    const defaults = {
        '--color-primary-dark': '#0f172a',
        '--color-primary-mid': '#334155',
        '--color-accent-primary': '#475569',
        '--color-accent-light': '#cbd5e1',
        '--color-accent-bg': '#f8fafc',
        '--color-accent-shadow': 'rgba(71, 85, 105, 0.2)',
        '--color-timeline-border': '#e2e8f0',
        '--color-btn-gradient-from': '#334155',
        '--color-btn-gradient-to': '#475569',
        '--color-btn-border': '#334155',
        '--color-btn-shadow': 'rgba(71, 85, 105, 0.1)',
        '--color-milestone-bg-from': '#f8fafc',
        '--color-milestone-bg-to': '#f1f5f9',
        '--color-milestone-border': '#e2e8f0',
        '--color-milestone-shadow': 'rgba(0, 0, 0, 0.05)',
        '--color-flight-text': '#475569',
        '--color-map-hover': '#1e293b',
        '--color-subtitle-text': '#94a3b8',
        '--color-date-text': '#475569',
        '--color-hero-gradient-from': '#0f172a',
        '--color-hero-gradient-via': '#334155',
        '--color-hero-gradient-to': '#475569'
    };
    
    // 1. 套用預設中性色
    for (const [key, val] of Object.entries(defaults)) {
        root.style.setProperty(key, val);
    }
    
    // 2. 從 JSON theme 中讀取自訂屬性進行覆蓋
    const customMapping = {
        'primary_dark': '--color-primary-dark',
        'primary_mid': '--color-primary-mid',
        'accent_primary': '--color-accent-primary',
        'accent_light': '--color-accent-light',
        'accent_bg': '--color-accent-bg',
        'accent_shadow': '--color-accent-shadow',
        'timeline_border': '--color-timeline-border',
        'btn_gradient_from': '--color-btn-gradient-from',
        'btn_gradient_to': '--color-btn-gradient-to',
        'btn_border': '--color-btn-border',
        'btn_shadow': '--color-btn-shadow',
        'milestone_bg_from': '--color-milestone-bg-from',
        'milestone_bg_to': '--color-milestone-bg-to',
        'milestone_border': '--color-milestone-border',
        'milestone_shadow': '--color-milestone-shadow',
        'flight_text': '--color-flight-text',
        'map_hover': '--color-map-hover',
        'subtitle_text': '--color-subtitle-text',
        'date_text': '--color-date-text',
        'hero_gradient_from': '--color-hero-gradient-from',
        'hero_gradient_via': '--color-hero-gradient-via',
        'hero_gradient_to': '--color-hero-gradient-to'
    };
    
    for (const [jsonKey, cssVar] of Object.entries(customMapping)) {
        if (theme && theme[jsonKey]) {
            root.style.setProperty(cssVar, theme[jsonKey]);
        }
    }
    
    // 3. 動態更新 Favicon 顏色以符合主題色彩
    const faviconColor = root.style.getPropertyValue('--color-accent-primary').trim() || '#475569';
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
    
    const dayData = itineraryData.days.find(d => d.day_number === dayNum);
    if (!dayData) {
        dayContentArea.innerHTML = `<div class="p-8 bg-rose-50 text-rose-600 rounded-xl font-bold text-center">找不到 Day ${dayNum} 行程內容</div>`;
        return;
    }
    
    // 渲染 Day Header & Timeline HTML
    let timelineHtml = dayData.timeline.map(item => {
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

// 從 URL 載入資料並初始化網頁
async function init() {
    const dataUrl = getQueryParam('data') || 'templates/itinerary.json';
    const dayContentArea = document.getElementById('day-content-area');
    
    try {
        const response = await fetch(dataUrl);
        if (!response.ok) throw new Error(`HTTP 錯誤: ${response.status}`);
        
        itineraryData = await response.json();
        
        // 1. 初始化 Meta 與主題
        document.title = itineraryData.meta.title;
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
        document.getElementById('trip-date').innerText = itineraryData.meta.date_range;
        
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
            sidebar.innerHTML = itineraryData.days.map(day => `
                <button onclick="switchDay(${day.day_number})" id="btn-day${day.day_number}" class="day-btn flex-shrink-0 text-left px-4 py-3 rounded-xl border border-slate-100 font-medium text-slate-600 hover:bg-slate-50 transition-all">
                    Day ${day.day_number}
                    <span class="block text-xs font-normal opacity-80 mt-0.5">${day.day_title}</span>
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
