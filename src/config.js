/**
 * VoyaGen 全域專案配置文件
 * 包含預設的 Google Cloud API Key 與專案基本設定
 */

const VOYA_CONFIG = {
    // 預設 Google OAuth Client ID (已於 GCP 設定來源網址限制)
    DEFAULT_CLIENT_ID: '164419304196-srr4aps1p8h4c29bl6530kke7221hq4t.apps.googleusercontent.com',

    // 預設 Google Apps Script 中繼代理網址
    GAS_PROXY_URL: 'https://script.google.com/macros/s/AKfycbxz8-xP1NKN8SOD-8ZWqvI9t3C267Ob6qQxlIRpEaAPxHNT_vYNX7k7zRO7jQUvJk1W/exec'
};

// 在瀏覽器環境下掛載至全域 window 物件
if (typeof window !== 'undefined') {
    window.VOYA_CONFIG = VOYA_CONFIG;
}
