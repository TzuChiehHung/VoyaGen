// 渲染單個行程時間軸項目
function renderItemHtml(item, colorTheme = '') {
    let classes = "";
    let dotClass = "";
    const itemClass = (colorTheme && colorTheme !== 'amber')
        ? `timeline-item-${colorTheme}`
        : 'timeline-item-theme';
    
    if (item.type === "transfer") {
        classes = "timeline-item-transfer";
        dotClass = "timeline-dot-transfer";
    } else if (item.type === "milestone") {
        classes = `${itemClass} milestone-highlight rounded-xl p-4 mb-6 border-l-4 border-transparent shadow-sm`;
        dotClass = "timeline-dot";
    } else {
        classes = itemClass;
        dotClass = "timeline-dot";
    }
    
    let mapHtml = "";
    if (item.map_link) {
        mapHtml = `
            <a href="${item.map_link}" target="_blank" class="ml-1 map-link-${colorTheme || 'theme'}" title="Google Maps導航">
                <i class="fa-solid fa-location-dot text-[10px]"></i>
            </a>
        `;
    }
    
    let descHtml = "";
    if (item.description) {
        descHtml = `<p class="text-slate-600 text-sm">${item.description}</p>`;
    }
    
    let bulletHtml = "";
    const bullets = item.bullets || [];
    if (bullets.length > 0) {
        bulletHtml = `
            <ul class="bullet-list text-slate-600 text-sm mt-1">
                ${bullets.map(b => `<li>${b}</li>`).join("")}
            </ul>
        `;
    }
    
    let notesHtml = "";
    const notes = item.notes || [];
    if (notes.length > 0) {
        notesHtml = notes.map(note => {
            // 所有 note 全部跟隨主題色：主 timeline 用 CSS 變數，split track 用 note-box-{colorTheme}
            const noteClass = (colorTheme && colorTheme !== 'amber') ? `note-box-${colorTheme}` : "";
            const iconClass = note.icon || "fa-solid fa-lightbulb";
            const iconStyle = !noteClass ? `style="color: var(--color-accent-primary)"` : "";

            return `
                <div class="note-box ${noteClass} text-xs p-3.5 rounded-lg flex items-start mt-3 shadow-sm">
                    <i class="${iconClass} text-[14px] mr-2 shrink-0 mt-0.5" ${iconStyle}></i>
                    <div>
                        <span class="font-bold block mb-0.5">${note.title || ''}</span>
                        ${note.content || ''}
                    </div>
                </div>
            `;
        }).join("");
    }
    
    // split track 內的 item 不加 timeline-item base class，避免 :last-child 詮則把有色指線覆蓋成透明
    const baseClass = (colorTheme && colorTheme !== 'amber') ? '' : 'timeline-item';
    return `
        <div class="${[baseClass, classes].filter(Boolean).join(' ')}">
            <div class="${dotClass}"></div>
            <div class="text-amber-600 font-bold text-sm mb-1 tracking-wider font-mono">${item.time || ''}</div>
            <h3 class="text-lg font-bold text-slate-800 mb-1 leading-snug">
                ${item.title || ''}
                ${mapHtml}
            </h3>
            ${descHtml}
            ${bulletHtml}
            ${notesHtml}
        </div>
    `;
}

// 渲染雙軌分流區塊
function renderSplitHtml(item) {
    const colClass = "px-4 py-4 md:first:border-r md:first:border-slate-100";
    const tracks = item.tracks || [];
    
    const tracksHtml = tracks.map(track => {
        const theme = track.color_theme || '';
        const badgeClass = `split-badge-${(theme && theme !== 'amber') ? theme : 'theme'}`;
        const badgeIcon = track.icon || 'fa-solid fa-star';
        const items = track.items || [];
        
        return `
            <div class="${colClass}">
                <div class="inline-flex items-center ${badgeClass} border text-xs font-bold px-3 py-1.5 rounded-md mb-5 shadow-sm">
                    <i class="${badgeIcon} mr-1.5"></i>${track.track_name || ''}
                </div>
                <div class="pt-2">
                    ${items.map(subItem => renderItemHtml(subItem, theme)).join("")}
                </div>
            </div>
        `;
    }).join("");
    
    let convergeHtml = "";
    if (item.converge_note) {
        convergeHtml = `
            <div class="bg-slate-100/50 px-5 py-4 border-t border-slate-200 flex items-start">
                <div class="bg-slate-500 text-white rounded-full w-6 h-6 flex items-center justify-center shrink-0 mr-3 mt-0.5 text-xs shadow-sm">
                    <i class="fa-solid fa-users"></i>
                </div>
                <div>
                    <h4 class="font-bold text-slate-800 text-sm">${item.converge_note}</h4>
                </div>
            </div>
        `;
    }
    
    return `
        <div class="bg-slate-50/50 rounded-2xl border border-slate-100 mb-6 overflow-hidden mt-4">
            <div class="bg-white/80 px-4 py-3 border-b border-slate-200 flex items-center">
                <i class="fa-solid fa-code-branch text-slate-600 mr-2 mt-0.5"></i>
                <h3 class="font-bold text-slate-900 leading-none">${item.time || ''} ${item.title || ''}</h3>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2">
                ${tracksHtml}
            </div>
            ${convergeHtml}
        </div>
    `;
}
