/**
 * VoyaGen 全域專案配置文件
 * 包含預設的 Google Cloud API Key 與專案基本設定
 */

const VOYA_CONFIG = {
    // 預設 Google Cloud API Key (已於 GCP 設定 HTTP Referrer 網站限制)
    DEFAULT_API_KEY: 'AIzaSyDxCBu8q087TfqnMAuhE7qUZlarjSKGpLA',

    // 預設 Google OAuth Client ID (已於 GCP 設定來源網址限制)
    DEFAULT_CLIENT_ID: '164419304196-srr4aps1p8h4c29bl6530kke7221hq4t.apps.googleusercontent.com'
};

// 在瀏覽器環境下掛載至全域 window 物件
if (typeof window !== 'undefined') {
    window.VOYA_CONFIG = VOYA_CONFIG;
}
