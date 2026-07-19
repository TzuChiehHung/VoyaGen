/**
 * VoyaGen Google Drive API v3 整合與 Dashboard 模組
 * 處理資料夾建立、檔案讀寫、公開分享與儀表板卡片渲染
 */

const FOLDER_NAME = 'VoyaGen_Itineraries';
let cachedFolderId = null;

// 1. 取得或自動建立專屬 App 資料夾
async function getOrCreateAppFolder() {
    if (cachedFolderId) return cachedFolderId;

    const token = voyaAuth.getAccessToken();
    if (!token) throw new Error('尚未取得有效的 Google 登入 Token');

    // 搜尋是否已有該資料夾
    const query = encodeURIComponent(`name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;

    const res = await fetch(searchUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) throw new Error(`Google Drive API 錯誤: ${res.status}`);
    const data = await res.json();

    if (data.files && data.files.length > 0) {
        cachedFolderId = data.files[0].id;
        makeFilePublic(cachedFolderId, token);
        return cachedFolderId;
    }

    // 若無，則建立新資料夾
    const createUrl = 'https://www.googleapis.com/drive/v3/files';
    const metadata = {
        name: FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder'
    };

    const createRes = await fetch(createUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
    });

    if (!createRes.ok) throw new Error(`建立資料夾失敗: ${createRes.status}`);
    const newFolder = await createRes.json();
    cachedFolderId = newFolder.id;
    makeFilePublic(cachedFolderId, token);
    return cachedFolderId;
}

// 輔助函式：將 Google Drive 檔案/資料夾設為公開唯讀
async function makeFilePublic(fileId, token) {
    if (!fileId || !token) return;
    try {
        const permUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`;
        const res = await fetch(permUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                role: 'reader',
                type: 'anyone',
                allowFileDiscovery: false
            })
        });
        
        if (!res.ok) {
            const errText = await res.text();
            console.error(`❌ 設定公開權限失敗 (${fileId}) HTTP ${res.status}:`, errText);
        } else {
            console.log(`✅ 成功將檔案 ${fileId} 權限設為公開唯讀 (anyone reader)`);
        }
    } catch (e) {
        console.error(`設定公開權限例外 (${fileId}):`, e);
    }
}

// 2. 讀取資料夾內的所有行程 JSON 檔案
async function listItineraries() {
    const token = voyaAuth.getAccessToken();
    if (!token) return [];

    const folderId = await getOrCreateAppFolder();
    const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const listUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,createdTime,modifiedTime,webViewLink)&orderBy=modifiedTime desc`;

    const res = await fetch(listUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) throw new Error(`撈取行程失敗: ${res.status}`);
    const data = await res.json();
    const files = data.files || [];

    // 背景批次確保所有資料夾內的行程檔案皆具備公開唯讀權限
    files.forEach(file => makeFilePublic(file.id, token));

    return files;
}

// 3. 將行程 JSON 儲存至 Google Drive 並設定為公開唯讀
async function saveItineraryToDrive(fileName, itineraryData) {
    const token = voyaAuth.getAccessToken();
    if (!token) throw new Error('請先登入 Google 帳號才能儲存至雲端硬碟');

    const folderId = await getOrCreateAppFolder();
    const safeFileName = fileName.endsWith('.json') ? fileName : `${fileName}.json`;

    // 建立 multipart 上傳主體
    const metadata = {
        name: safeFileName,
        mimeType: 'application/json',
        parents: [folderId]
    };

    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        (typeof itineraryData === 'string' ? itineraryData : JSON.stringify(itineraryData, null, 2)) +
        close_delim;

    const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary="${boundary}"`
        },
        body: multipartRequestBody
    });

    if (!uploadRes.ok) throw new Error(`上傳檔案失敗: ${uploadRes.status}`);
    const file = await uploadRes.json();

    // 修改檔案權限為「公開唯讀 (anyone reader)」
    const permUrl = `https://www.googleapis.com/drive/v3/files/${file.id}/permissions`;
    await fetch(permUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            role: 'reader',
            type: 'anyone'
        })
    });

    // 直連下載/讀取網址
    const directUrl = `https://drive.google.com/uc?export=download&id=${file.id}`;
    return {
        fileId: file.id,
        fileName: file.name,
        directUrl: directUrl,
        shareUrl: `${window.location.origin}${window.location.pathname}?data=${encodeURIComponent(directUrl)}`
    };
}

// 4. 刪除檔案 (移至垃圾桶)
async function deleteItineraryFromDrive(fileId) {
    const token = voyaAuth.getAccessToken();
    if (!token) return;

    const deleteUrl = `https://www.googleapis.com/drive/v3/files/${fileId}`;
    const res = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) throw new Error(`刪除失敗: ${res.status}`);
    await renderDashboard();
}

// 5. 渲染 Dashboard 儀表板
async function renderDashboard() {
    const container = document.getElementById('dashboard-list');
    if (!container) return;

    if (!voyaAuth.isLoggedIn()) {
        container.innerHTML = `
            <div class="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center bg-white/50 col-span-full">
                <div class="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3 text-lg">
                    <i class="fa-solid fa-cloud-arrow-up"></i>
                </div>
                <h3 class="font-bold text-slate-800 text-base mb-1">尚未連結 Google Drive 帳號</h3>
                <p class="text-xs text-slate-500 max-w-md mx-auto mb-4">登入 Google 帳號授權後，系統將為您建立專屬行程雲端資料夾，並列出所有行程。</p>
                <button onclick="voyaAuth.login()" class="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all">
                    立即登入 Google 帳號
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="col-span-full py-12 text-center text-slate-400">
            <i class="fa-solid fa-circle-notch fa-spin text-2xl mb-2 block text-indigo-600"></i>
            <span class="text-xs font-medium">讀取 Google Drive 行程庫中...</span>
        </div>
    `;

    try {
        const files = await listItineraries();

        if (files.length === 0) {
            container.innerHTML = `
                <div class="border border-slate-200 rounded-2xl p-8 text-center bg-white col-span-full">
                    <div class="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-3 text-lg">
                        <i class="fa-solid fa-folder-open"></i>
                    </div>
                    <h3 class="font-bold text-slate-800 text-base mb-1">雲端資料夾空空如也</h3>
                    <p class="text-xs text-slate-500 max-w-md mx-auto mb-4">您在 Google Drive 的 VoyaGen_Itineraries 資料夾中尚無行程。立即點擊下方按鈕開始生成第一個 AI 行程吧！</p>
                    <button onclick="navigateTo('generator')" class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all inline-flex items-center gap-2">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> 建立第一個行程
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = files.map(file => {
            const fileDirectUrl = `https://drive.google.com/uc?export=download&id=${file.id}`;
            const shareUrl = `${window.location.origin}${window.location.pathname}?data=${encodeURIComponent(fileDirectUrl)}`;
            const modifiedDate = new Date(file.modifiedTime).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });

            return `
                <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                        <div class="flex items-start justify-between gap-2 mb-2">
                            <h3 class="font-bold text-slate-800 text-base line-clamp-1">${file.name.replace('.json', '')}</h3>
                            <span class="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full shrink-0">JSON</span>
                        </div>
                        <p class="text-xs text-slate-400 mb-4 flex items-center gap-1">
                            <i class="fa-regular fa-clock"></i>
                            最後更新：${modifiedDate}
                        </p>
                    </div>

                    <div class="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
                        <a href="${shareUrl}" class="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-2 rounded-lg text-center transition-all flex items-center justify-center gap-1.5">
                            <i class="fa-solid fa-eye text-[11px]"></i> 檢視行程
                        </a>
                        <button onclick="navigator.clipboard.writeText('${shareUrl}'); voyaDrive.showToast('已複製分享網址！', 'success');" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-lg transition-all flex items-center gap-1" title="複製分享連結">
                            <i class="fa-solid fa-share-nodes text-[11px]"></i> 分享
                        </button>
                        <button onclick="if(confirm('確定要將此行程移至垃圾桶嗎？')) voyaDrive.deleteItineraryFromDrive('${file.id}')" class="text-slate-400 hover:text-rose-500 p-2 text-xs transition-colors" title="刪除行程">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('載入儀表板失敗:', err);
        container.innerHTML = `
            <div class="border border-rose-100 bg-rose-50 rounded-2xl p-6 text-center text-rose-600 col-span-full text-xs">
                <i class="fa-solid fa-circle-exclamation text-xl mb-2 block"></i>
                讀取雲端資料夾失敗：${err.message}<br>
                <span class="text-slate-400 mt-1 block">請確認您的權限或嘗試重新登入。</span>
            </div>
        `;
    }
}

// 顯示非阻塞式 Toast 提示與進度 Notify
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return null;

    const toast = document.createElement('div');
    const bgClass = type === 'success' ? 'bg-slate-900 text-emerald-400 border-emerald-500/30'
        : type === 'error' ? 'bg-rose-900 text-rose-200 border-rose-500/30'
        : 'bg-slate-900 text-indigo-300 border-indigo-500/30';
    const icon = type === 'success' ? 'fa-circle-check text-emerald-400'
        : type === 'error' ? 'fa-circle-exclamation text-rose-400'
        : 'fa-circle-notch fa-spin text-indigo-400';

    toast.className = `flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl text-xs font-semibold backdrop-blur-md transition-all duration-300 ${bgClass}`;
    toast.innerHTML = `<i class="fa-solid ${icon} text-base shrink-0"></i><span>${message}</span>`;

    container.appendChild(toast);

    if (duration > 0) {
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
    return toast;
}

// 6. 選擇並批次上傳多個本地 JSON 檔案至 Google Drive
async function uploadLocalJsonFile(fileInput) {
    if (!fileInput.files || fileInput.files.length === 0) return;
    const files = Array.from(fileInput.files);
    const total = files.length;
    let successCount = 0;

    const progressToast = showToast(`正在準備上傳 ${total} 個行程...`, 'info', 0);

    for (let i = 0; i < total; i++) {
        const file = files[i];
        const fileName = file.name.endsWith('.json') ? file.name : `${file.name}.json`;

        if (progressToast) {
            progressToast.querySelector('span').innerText = `[${i + 1}/${total}] 上傳中：${fileName}...`;
        }

        try {
            const text = await file.text();
            const json = JSON.parse(text);
            await saveItineraryToDrive(fileName, json);
            successCount++;
        } catch (err) {
            console.error(`上傳 ${fileName} 失敗:`, err);
            showToast(`檔案 ${fileName} 解析或上傳失敗: ${err.message}`, 'error', 4000);
        }
    }

    if (progressToast) progressToast.remove();

    if (successCount > 0) {
        showToast(`🎉 成功完成 ${successCount}/${total} 個行程上傳！`, 'success', 3500);
        await renderDashboard();
    }

    fileInput.value = ''; // 清空 input 方便重複選擇
}

// 暴露全域 API
window.voyaDrive = {
    getOrCreateAppFolder,
    listItineraries,
    saveItineraryToDrive,
    deleteItineraryFromDrive,
    uploadLocalJsonFile,
    renderDashboard,
    showToast
};
