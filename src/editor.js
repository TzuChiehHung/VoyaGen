/**
 * VoyaGen 手動編輯器模組 (Manual Itinerary Editor)
 * 負責視覺化編輯模式切換、Modal 編輯器、順序調整、跨 Day 移動與拖曳
 */

let editModeActive = false;
let editingTarget = null; // { dayNumber, itemIndex }
let draggedItemInfo = null; // { dayNumber, itemIndex }

/**
 * 檢查是否為手動編輯模式
 */
function isEditMode() {
    return editModeActive;
}

/**
 * 切換手動編輯模式
 */
function toggleEditMode(forceState = null) {
    editModeActive = (forceState !== null) ? forceState : !editModeActive;

    const btn = document.getElementById('btn-toggle-edit-mode');
    if (btn) {
        if (editModeActive) {
            btn.classList.add('bg-amber-500', 'text-white', 'border-amber-600', 'ring-2', 'ring-amber-300');
            btn.classList.remove('bg-slate-100', 'text-slate-700', 'border-slate-200');
            btn.setAttribute('data-tooltip', '離開編輯模式');
            if (typeof voyaDrive !== 'undefined' && voyaDrive.showToast) {
                voyaDrive.showToast('✏️ 已開啟手動編輯模式！點擊景點卡片上方按鈕即可編輯', 'info');
            }
        } else {
            btn.classList.remove('bg-amber-500', 'text-white', 'border-amber-600', 'ring-2', 'ring-amber-300');
            btn.classList.add('bg-slate-100', 'text-slate-700', 'border-slate-200');
            btn.setAttribute('data-tooltip', '手動編輯模式');
        }
    }

    // 重繪當前行程檢視
    if (typeof window.renderItineraryData === 'function' && typeof window.getItineraryData === 'function') {
        const data = window.getItineraryData();
        if (data) {
            window.renderItineraryData(data);
        }
    }
}

/**
 * 將目前行程狀態推入 Undo 並發起自動寫入 Google Drive
 */
function recordStateAndSave(data) {
    if (window.voyaUndoStack && typeof window.voyaUndoStack.push === 'function') {
        window.voyaUndoStack.push(data);
    }

    // 即時重繪 UI
    if (typeof window.renderItineraryData === 'function') {
        window.renderItineraryData(data);
    }

    // 自動異步同步至 Google Drive
    if (typeof voyaAuth !== 'undefined' && voyaAuth.isLoggedIn() && window.currentLoadedFileId) {
        const title = (data.meta && data.meta.title) ? data.meta.title : 'itinerary';
        if (typeof voyaDrive !== 'undefined' && voyaDrive.saveItineraryToDrive) {
            voyaDrive.saveItineraryToDrive(title, data).catch(err => {
                console.warn('手動編輯後自動同步至 Drive 失敗:', err);
            });
        }
    }
}

/**
 * 開啟項目編輯 Modal
 */
function openItemEditModal(dayNumber, itemIndex) {
    const data = typeof window.getItineraryData === 'function' ? window.getItineraryData() : null;
    if (!data || !data.days) return;

    const day = data.days.find(d => d.day_number === dayNumber);
    if (!day || !day.timeline || !day.timeline[itemIndex]) return;

    editingTarget = { dayNumber, itemIndex };
    const item = day.timeline[itemIndex];

    // 填入 modal 欄位
    const inputTime = document.getElementById('modal-edit-time');
    const inputTitle = document.getElementById('modal-edit-title');
    const inputType = document.getElementById('modal-edit-type');
    const inputDesc = document.getElementById('modal-edit-desc');
    const inputMapLink = document.getElementById('modal-edit-maplink');
    const bulletsContainer = document.getElementById('modal-edit-bullets-container');
    const notesContainer = document.getElementById('modal-edit-notes-container');

    if (inputTime) inputTime.value = item.time || '';
    if (inputTitle) inputTitle.value = item.title || '';
    if (inputType) inputType.value = item.type || 'activity';
    if (inputDesc) inputDesc.value = item.description || '';
    if (inputMapLink) inputMapLink.value = item.map_link || '';

    // 渲染 Bullets 編輯列表
    if (bulletsContainer) {
        bulletsContainer.innerHTML = '';
        const bullets = item.bullets || [];
        bullets.forEach((b) => {
            addBulletInputRow(bulletsContainer, b);
        });
    }

    // 渲染 Notes 編輯列表
    if (notesContainer) {
        notesContainer.innerHTML = '';
        const notes = item.notes || [];
        notes.forEach((note) => {
            addNoteInputRow(notesContainer, note.title || '', note.content || '', note.icon || 'fa-solid fa-lightbulb');
        });
    }

    // 顯示 Modal
    const modal = document.getElementById('item-edit-modal');
    if (modal) modal.classList.remove('hidden');
}

/**
 * 新增 Bullet 輸入列
 */
function addBulletInputRow(container, value = '') {
    const div = document.createElement('div');
    div.className = 'flex items-center gap-2 mb-2 bullet-row';
    div.innerHTML = `
        <input type="text" class="bullet-input w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500" value="${escapeHtml(value)}" placeholder="新增重點提醒 (例如：建議提前預訂門票)">
        <button type="button" onclick="this.parentElement.remove()" class="text-rose-500 hover:text-rose-700 px-2 py-1 text-xs">
            <i class="fa-solid fa-trash-can"></i>
        </button>
    `;
    container.appendChild(div);
}

/**
 * 新增 Note 輸入列
 */
function addNoteInputRow(container, title = '', content = '', icon = 'fa-solid fa-lightbulb') {
    const div = document.createElement('div');
    div.className = 'bg-slate-50 p-3 rounded-lg border border-slate-200 mb-2.5 note-row';
    div.innerHTML = `
        <div class="flex items-center gap-2 mb-1.5">
            <input type="text" class="note-title-input w-1/3 px-2.5 py-1 text-xs font-bold rounded border border-slate-200" value="${escapeHtml(title)}" placeholder="卡片標題 (如: 貼心提醒)">
            <input type="text" class="note-icon-input w-2/3 px-2.5 py-1 text-xs rounded border border-slate-200 font-mono text-slate-500" value="${escapeHtml(icon)}" placeholder="FontAwesome Icon (如: fa-solid fa-taxi)">
        </div>
        <div class="flex items-center gap-2">
            <input type="text" class="note-content-input w-full px-2.5 py-1 text-xs rounded border border-slate-200" value="${escapeHtml(content)}" placeholder="詳細提醒內容...">
            <button type="button" onclick="this.closest('.note-row').remove()" class="text-rose-500 hover:text-rose-700 px-2 py-1 text-xs">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        </div>
    `;
    container.appendChild(div);
}

/**
 * 儲存 Modal 編輯變更
 */
function saveItemModal() {
    if (!editingTarget) return;

    const data = typeof window.getItineraryData === 'function' ? window.getItineraryData() : null;
    if (!data || !data.days) return;

    const day = data.days.find(d => d.day_number === editingTarget.dayNumber);
    if (!day || !day.timeline || !day.timeline[editingTarget.itemIndex]) return;

    const item = day.timeline[editingTarget.itemIndex];

    const inputTime = document.getElementById('modal-edit-time');
    const inputTitle = document.getElementById('modal-edit-title');
    const inputType = document.getElementById('modal-edit-type');
    const inputDesc = document.getElementById('modal-edit-desc');
    const inputMapLink = document.getElementById('modal-edit-maplink');

    if (inputTime) item.time = inputTime.value.trim();
    if (inputTitle) item.title = inputTitle.value.trim();
    if (inputType) item.type = inputType.value;
    if (inputDesc) item.description = inputDesc.value.trim();
    if (inputMapLink) item.map_link = inputMapLink.value.trim();

    // 收集 Bullets
    const bulletInputs = document.querySelectorAll('.bullet-input');
    const bullets = [];
    bulletInputs.forEach(inp => {
        if (inp.value.trim()) bullets.push(inp.value.trim());
    });
    item.bullets = bullets;

    // 收集 Notes
    const noteRows = document.querySelectorAll('.note-row');
    const notes = [];
    noteRows.forEach(row => {
        const titleInp = row.querySelector('.note-title-input');
        const iconInp = row.querySelector('.note-icon-input');
        const contentInp = row.querySelector('.note-content-input');
        if (titleInp && contentInp && (titleInp.value.trim() || contentInp.value.trim())) {
            notes.push({
                title: titleInp.value.trim(),
                icon: (iconInp && iconInp.value.trim()) ? iconInp.value.trim() : 'fa-solid fa-lightbulb',
                content: contentInp.value.trim()
            });
        }
    });
    item.notes = notes;

    // 關閉 Modal
    closeItemEditModal();

    // 紀錄 State 並存檔
    recordStateAndSave(data);
    if (typeof voyaDrive !== 'undefined' && voyaDrive.showToast) {
        voyaDrive.showToast('✅ 景點內容已更新', 'success');
    }
}

/**
 * 關閉 Modal
 */
function closeItemEditModal() {
    const modal = document.getElementById('item-edit-modal');
    if (modal) modal.classList.add('hidden');
    editingTarget = null;
}

/**
 * 於同天內調整項目順序 (-1: 上移, 1: 下移)
 */
function moveItem(dayNumber, itemIndex, direction) {
    const data = typeof window.getItineraryData === 'function' ? window.getItineraryData() : null;
    if (!data || !data.days) return;

    const day = data.days.find(d => d.day_number === dayNumber);
    if (!day || !day.timeline) return;

    const targetIdx = itemIndex + direction;
    if (targetIdx < 0 || targetIdx >= day.timeline.length) return;

    // 交換元素
    const temp = day.timeline[itemIndex];
    day.timeline[itemIndex] = day.timeline[targetIdx];
    day.timeline[targetIdx] = temp;

    recordStateAndSave(data);
}

/**
 * 跨 Day 移動項目 (將項目移至目標天數末尾)
 */
function moveItemToDay(fromDayNumber, itemIndex, toDayNumber) {
    toDayNumber = Number(toDayNumber);
    if (fromDayNumber === toDayNumber) return;

    const data = typeof window.getItineraryData === 'function' ? window.getItineraryData() : null;
    if (!data || !data.days) return;

    const fromDay = data.days.find(d => d.day_number === fromDayNumber);
    const toDay = data.days.find(d => d.day_number === toDayNumber);
    if (!fromDay || !toDay || !fromDay.timeline || !toDay.timeline) return;

    // 從原天數取出項目
    const [movedItem] = fromDay.timeline.splice(itemIndex, 1);
    if (!movedItem) return;

    // 插入至目標天數末尾
    toDay.timeline.push(movedItem);

    recordStateAndSave(data);
    if (typeof voyaDrive !== 'undefined' && voyaDrive.showToast) {
        voyaDrive.showToast(`🚚 已將景點移至 Day ${toDayNumber}`, 'success');
    }
}

/**
 * 刪除項目
 */
function deleteItem(dayNumber, itemIndex) {
    const data = typeof window.getItineraryData === 'function' ? window.getItineraryData() : null;
    if (!data || !data.days) return;

    const day = data.days.find(d => d.day_number === dayNumber);
    if (!day || !day.timeline || !day.timeline[itemIndex]) return;

    if (!confirm(`確定要刪除景點「${day.timeline[itemIndex].title || '此項目'}」嗎？`)) {
        return;
    }

    day.timeline.splice(itemIndex, 1);
    recordStateAndSave(data);
    if (typeof voyaDrive !== 'undefined' && voyaDrive.showToast) {
        voyaDrive.showToast('🗑️ 景點已刪除 (可點擊工具列「復原」復原)', 'info');
    }
}

/**
 * 新增行程項目
 */
function addItem(dayNumber) {
    const data = typeof window.getItineraryData === 'function' ? window.getItineraryData() : null;
    if (!data || !data.days) return;

    const day = data.days.find(d => d.day_number === dayNumber);
    if (!day) return;
    if (!day.timeline) day.timeline = [];

    const newItem = {
        time: '12:00',
        title: '新行程景點',
        type: 'activity',
        description: '請輸入景點簡介與活動內容...',
        bullets: [],
        notes: [],
        map_link: ''
    };

    day.timeline.push(newItem);
    const newItemIndex = day.timeline.length - 1;

    recordStateAndSave(data);

    // 自動開啟該新項目的 Modal 編輯器
    setTimeout(() => {
        openItemEditModal(dayNumber, newItemIndex);
    }, 100);
}

/**
 * HTML5 拖曳控制 (Drag & Drop)
 */
function handleDragStart(event, dayNumber, itemIndex) {
    draggedItemInfo = { dayNumber, itemIndex };
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', JSON.stringify(draggedItemInfo));
    if (event.currentTarget && event.currentTarget.classList) {
        event.currentTarget.classList.add('opacity-40');
    }
}

function handleDragEnd(event) {
    if (event.currentTarget && event.currentTarget.classList) {
        event.currentTarget.classList.remove('opacity-40');
    }
    draggedItemInfo = null;
}

function handleDropOnDay(event, targetDayNumber) {
    event.preventDefault();
    if (!draggedItemInfo) return;
    const { dayNumber, itemIndex } = draggedItemInfo;
    moveItemToDay(dayNumber, itemIndex, targetDayNumber);
    // 自動切換至目標 Day 視圖
    if (typeof window.switchDay === 'function') {
        window.switchDay(targetDayNumber);
    }
}

/**
 * 同天 (單頁) 或跨天拖曳至特定卡片位置重排 (Item-to-Item Drop)
 */
function handleItemDragOver(event) {
    event.preventDefault();
    if (event.currentTarget && event.currentTarget.classList) {
        event.currentTarget.classList.add('ring-2', 'ring-amber-400', 'bg-amber-50/30');
    }
}

function handleItemDragLeave(event) {
    if (event.currentTarget && event.currentTarget.classList) {
        event.currentTarget.classList.remove('ring-2', 'ring-amber-400', 'bg-amber-50/30');
    }
}

function handleItemDropOnItem(event, targetDayNumber, targetItemIndex) {
    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget && event.currentTarget.classList) {
        event.currentTarget.classList.remove('ring-2', 'ring-amber-400', 'bg-amber-50/30');
    }
    if (!draggedItemInfo) return;

    const { dayNumber: fromDay, itemIndex: fromIdx } = draggedItemInfo;

    const data = typeof window.getItineraryData === 'function' ? window.getItineraryData() : null;
    if (!data || !data.days) return;

    if (fromDay === targetDayNumber) {
        // 同天單頁內拖曳重排 (Same day reorder)
        const day = data.days.find(d => d.day_number === fromDay);
        if (!day || !day.timeline) return;

        if (fromIdx === targetItemIndex) return;

        // 移出原項目並插入至目標位置
        const [moved] = day.timeline.splice(fromIdx, 1);
        day.timeline.splice(targetItemIndex, 0, moved);

        recordStateAndSave(data);
        if (typeof voyaDrive !== 'undefined' && voyaDrive.showToast) {
            voyaDrive.showToast('↕️ 已調整景點卡片順序', 'info');
        }
    } else {
        // 跨天拖曳並插入至指定位置 (Cross day insert to specific position)
        const fromDayObj = data.days.find(d => d.day_number === fromDay);
        const toDayObj = data.days.find(d => d.day_number === targetDayNumber);
        if (!fromDayObj || !toDayObj || !fromDayObj.timeline || !toDayObj.timeline) return;

        const [moved] = fromDayObj.timeline.splice(fromIdx, 1);
        if (!moved) return;

        toDayObj.timeline.splice(targetItemIndex, 0, moved);

        recordStateAndSave(data);
        if (typeof voyaDrive !== 'undefined' && voyaDrive.showToast) {
            voyaDrive.showToast(`🚚 已將景點移至 Day ${targetDayNumber}`, 'success');
        }
    }
}

/**
 * 天數自動歸一化重編號 (Re-index Days)
 */
function reindexDays(data) {
    if (!data || !data.days) return;
    data.days.forEach((day, index) => {
        const newNum = index + 1;
        day.day_number = newNum;
        if (!day.date_label || /^DAY\s*\d+$/i.test(day.date_label.trim())) {
            day.date_label = `DAY ${newNum}`;
        }
    });
}

/**
 * 手動新增一天 (Add Day)
 */
function addDay() {
    const data = typeof window.getItineraryData === 'function' ? window.getItineraryData() : null;
    if (!data) return;
    if (!data.days) data.days = [];

    const newDayNum = data.days.length + 1;

    const newDay = {
        day_number: newDayNum,
        date_label: `DAY ${newDayNum}`,
        day_title: `DAY ${newDayNum} 行程規劃`,
        timeline: []
    };

    data.days.push(newDay);
    reindexDays(data);

    recordStateAndSave(data);

    // 異步切換至新天數視圖
    if (typeof window.switchDay === 'function') {
        window.switchDay(newDayNum);
    }

    if (typeof voyaDrive !== 'undefined' && voyaDrive.showToast) {
        voyaDrive.showToast(`✨ 已新增 Day ${newDayNum}！`, 'success');
    }
}

/**
 * 調整 Day 順序 (-1: 左/前移, 1: 右/後移)
 */
function moveDay(dayNumber, direction, event = null) {
    if (event) event.stopPropagation();

    const data = typeof window.getItineraryData === 'function' ? window.getItineraryData() : null;
    if (!data || !data.days) return;

    const currentIdx = data.days.findIndex(d => d.day_number === dayNumber);
    if (currentIdx === -1) return;

    const targetIdx = currentIdx + direction;
    if (targetIdx < 0 || targetIdx >= data.days.length) return;

    // 交換天數
    const temp = data.days[currentIdx];
    data.days[currentIdx] = data.days[targetIdx];
    data.days[targetIdx] = temp;

    // 自動組裝重編號
    reindexDays(data);

    recordStateAndSave(data);

    const newDayNum = targetIdx + 1;
    if (typeof window.switchDay === 'function') {
        window.switchDay(newDayNum);
    }
}

/**
 * 刪除整天 (Delete Day)
 */
function deleteDay(dayNumber, event = null) {
    if (event) event.stopPropagation();

    const data = typeof window.getItineraryData === 'function' ? window.getItineraryData() : null;
    if (!data || !data.days) return;

    if (data.days.length <= 1) {
        if (typeof voyaDrive !== 'undefined' && voyaDrive.showToast) {
            voyaDrive.showToast('⚠️ 最少需保留 1 天行程，無法再刪除', 'warning');
        }
        return;
    }

    const dayObj = data.days.find(d => d.day_number === dayNumber);
    const dayTitle = dayObj ? (dayObj.day_title || `Day ${dayNumber}`) : `Day ${dayNumber}`;

    if (!confirm(`確定要刪除「${dayTitle}」及其內的所有景點嗎？`)) {
        return;
    }

    const currentIdx = data.days.findIndex(d => d.day_number === dayNumber);
    if (currentIdx !== -1) {
        data.days.splice(currentIdx, 1);
    }

    // 自動重編號
    reindexDays(data);

    recordStateAndSave(data);

    const nextDayNum = Math.min(Math.max(currentIdx + 1, 1), data.days.length);
    if (typeof window.switchDay === 'function') {
        window.switchDay(nextDayNum);
    }

    if (typeof voyaDrive !== 'undefined' && voyaDrive.showToast) {
        voyaDrive.showToast(`🗑️ 已刪除天數 (全天數已自動重新編號)`, 'info');
    }
}

/**
 * Day 頁籤拖曳排序 (Day Tab Drag & Drop)
 */
let draggedDayNumber = null;

function handleDayTabDragStart(event, dayNumber) {
    draggedDayNumber = dayNumber;
    event.dataTransfer.effectAllowed = 'move';
    if (event.currentTarget && event.currentTarget.classList) {
        event.currentTarget.classList.add('opacity-40');
    }
}

function handleDayTabDragEnd(event) {
    if (event.currentTarget && event.currentTarget.classList) {
        event.currentTarget.classList.remove('opacity-40');
    }
    draggedDayNumber = null;
}

function handleDayTabDrop(event, targetDayNumber) {
    event.preventDefault();
    if (!draggedDayNumber || draggedDayNumber === targetDayNumber) return;

    const data = typeof window.getItineraryData === 'function' ? window.getItineraryData() : null;
    if (!data || !data.days) return;

    const fromIdx = data.days.findIndex(d => d.day_number === draggedDayNumber);
    const toIdx = data.days.findIndex(d => d.day_number === targetDayNumber);

    if (fromIdx === -1 || toIdx === -1) return;

    const [movedDay] = data.days.splice(fromIdx, 1);
    data.days.splice(toIdx, 0, movedDay);

    reindexDays(data);
    recordStateAndSave(data);

    const newTargetDayNum = toIdx + 1;
    if (typeof window.switchDay === 'function') {
        window.switchDay(newTargetDayNum);
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 暴露全域 API
window.voyaEditor = {
    isEditMode,
    toggleEditMode,
    openItemEditModal,
    addBulletInputRow,
    addNoteInputRow,
    saveItemModal,
    closeItemEditModal,
    moveItem,
    moveItemToDay,
    deleteItem,
    addItem,
    addDay,
    moveDay,
    deleteDay,
    handleDragStart,
    handleDragEnd,
    handleDropOnDay,
    handleItemDragOver,
    handleItemDragLeave,
    handleItemDropOnItem,
    handleDayTabDragStart,
    handleDayTabDragEnd,
    handleDayTabDrop
};
