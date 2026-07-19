/**
 * URL 解析與轉換工具
 * 負責將 Google Drive 分享連結、GitHub Blob 連結等轉換為標準 Raw JSON URL
 */

function normalizeDataUrl(url) {
    if (!url || typeof url !== 'string') return url;
    
    const trimmedUrl = url.trim();

    // 1. Google Drive 網址轉換 (file/d/, uc?export=download&id=, open?id=, lh3)
    const gDriveMatch = trimmedUrl.match(/drive\.google\.com\/file\/d\/([^\/?#]+)/) ||
                        trimmedUrl.match(/drive\.google\.com\/uc\?export=download&id=([^&#]+)/) ||
                        trimmedUrl.match(/drive\.google\.com\/open\?id=([^&#]+)/) ||
                        trimmedUrl.match(/lh3\.googleusercontent\.com\/d\/([^/?#]+)/);

    if (gDriveMatch && gDriveMatch[1]) {
        return `https://drive.google.com/uc?export=download&id=${gDriveMatch[1]}`;
    }

    // 2. GitHub Blob 網址轉換
    const githubBlobMatch = trimmedUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.+)/);
    if (githubBlobMatch) {
        const [, user, repo, branch, filePath] = githubBlobMatch;
        return `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${filePath}`;
    }

    return trimmedUrl;
}

if (typeof globalThis !== 'undefined') {
    globalThis.normalizeDataUrl = normalizeDataUrl;
}
if (typeof window !== 'undefined') {
    window.normalizeDataUrl = normalizeDataUrl;
}
