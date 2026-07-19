/**
 * URL 解析與轉換工具
 * 負責將 Google Drive 分享連結、GitHub Blob 連結等轉換為可直接下載/請求的 Raw JSON URL
 */

export function normalizeDataUrl(url) {
    if (!url || typeof url !== 'string') return url;
    
    const trimmedUrl = url.trim();

    // 1. Google Drive /file/d/{FILE_ID}/view 網址轉換
    // 範例: https://drive.google.com/file/d/1A2B3C4D5E/view?usp=sharing
    const gDriveFileMatch = trimmedUrl.match(/drive\.google\.com\/file\/d\/([^\/?#]+)/);
    if (gDriveFileMatch && gDriveFileMatch[1]) {
        return `https://drive.google.com/uc?export=download&id=${gDriveFileMatch[1]}`;
    }

    // 2. Google Drive open?id={FILE_ID} 網址轉換
    // 範例: https://drive.google.com/open?id=1A2B3C4D5E
    const gDriveOpenMatch = trimmedUrl.match(/drive\.google\.com\/open\?id=([^&#]+)/);
    if (gDriveOpenMatch && gDriveOpenMatch[1]) {
        return `https://drive.google.com/uc?export=download&id=${gDriveOpenMatch[1]}`;
    }

    // 3. GitHub Blob 網址轉換
    // 範例: https://github.com/user/repo/blob/main/templates/itinerary.json
    const githubBlobMatch = trimmedUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.+)/);
    if (githubBlobMatch) {
        const [, user, repo, branch, filePath] = githubBlobMatch;
        return `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${filePath}`;
    }

    return trimmedUrl;
}

// 在瀏覽器環境下掛載至全域 window 物件
if (typeof window !== 'undefined') {
    window.normalizeDataUrl = normalizeDataUrl;
}
