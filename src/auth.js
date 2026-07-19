/**
 * VoyaGen Google Identity Services (GSI) 登入與 Token 管理模組
 * 處理 Google OAuth 2.0 授權 (Drive.file & Generative-Language Scopes)
 */

// 預設 Client ID，可於網頁介面上讓使用者設定或置換
let GOOGLE_CLIENT_ID = localStorage.getItem('voyagen_google_client_id') || '';

const SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/cloud-platform'
].join(' ');

let tokenClient = null;
let currentTokenResponse = null;

// 設定並儲存 Client ID
function setClientId(newClientId) {
    GOOGLE_CLIENT_ID = newClientId.trim();
    localStorage.setItem('voyagen_google_client_id', GOOGLE_CLIENT_ID);
    initTokenClient();
}

// 初始化 Token Client
function initTokenClient() {
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
        console.warn('Google GSI SDK 尚未載入完成');
        return;
    }
    if (!GOOGLE_CLIENT_ID) {
        console.info('未設定 Google Client ID，請至設定或登入頁填寫');
        return;
    }

    try {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: SCOPES,
            callback: (response) => {
                if (response.error) {
                    console.error('Google OAuth 授權失敗:', response);
                    alert(`授權失敗: ${response.error_description || response.error}`);
                    return;
                }
                
                currentTokenResponse = response;
                // 計算過期時間 (保留 60 秒 buffer)
                const expiresInMs = (parseInt(response.expires_in) - 60) * 1000;
                const expiryTime = Date.now() + expiresInMs;

                localStorage.setItem('voyagen_access_token', response.access_token);
                localStorage.setItem('voyagen_token_expiry', expiryTime.toString());

                console.log('✅ 成功取得 Google AccessToken');
                updateAuthUI();

                // 登入後自動切換至 Dashboard
                if (typeof navigateTo === 'function') {
                    navigateTo('dashboard');
                }
            },
        });
    } catch (e) {
        console.error('初始化 Google Token Client 出錯:', e);
    }
}

// 觸發登入
function login() {
    if (!GOOGLE_CLIENT_ID) {
        const inputId = prompt('請輸入您的 Google Cloud OAuth Client ID：\n(可在 Google Cloud Console 的 Credentials 頁面取得)');
        if (inputId && inputId.trim()) {
            setClientId(inputId);
        } else {
            return;
        }
    }

    if (!tokenClient) {
        initTokenClient();
    }

    if (tokenClient) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        alert('請先填寫有效的 Google OAuth Client ID');
    }
}

// 登出
function logout() {
    const token = getAccessToken();
    if (token && typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
        google.accounts.oauth2.revoke(token, () => {
            console.log('已撤銷 AccessToken');
        });
    }
    localStorage.removeItem('voyagen_access_token');
    localStorage.removeItem('voyagen_token_expiry');
    currentTokenResponse = null;
    updateAuthUI();
    if (typeof navigateTo === 'function') {
        navigateTo('login');
    }
}

// 取得目前的 AccessToken (自動檢查過期)
function getAccessToken() {
    const token = localStorage.getItem('voyagen_access_token');
    const expiry = localStorage.getItem('voyagen_token_expiry');

    if (!token || !expiry) return null;
    if (Date.now() > parseInt(expiry)) {
        console.warn('AccessToken 已過期，請重新登入');
        localStorage.removeItem('voyagen_access_token');
        localStorage.removeItem('voyagen_token_expiry');
        return null;
    }
    return token;
}

// 檢查是否已登入
function isLoggedIn() {
    return !!getAccessToken();
}

// 更新頁面上的登入狀態與 UI
function updateAuthUI() {
    const loggedIn = isLoggedIn();
    const navUserLabel = document.getElementById('nav-user-label');
    const loginBtnContainer = document.getElementById('login-btn-action');
    const clientIdInput = document.getElementById('client-id-input');

    if (clientIdInput) {
        clientIdInput.value = GOOGLE_CLIENT_ID;
    }

    if (navUserLabel) {
        navUserLabel.innerText = loggedIn ? '已登入 (登出)' : '登入';
    }

    // 登入頁按鈕與面板切換
    const loginCardNotAuth = document.getElementById('login-card-not-auth');
    const loginCardAuth = document.getElementById('login-card-auth');

    if (loginCardNotAuth && loginCardAuth) {
        if (loggedIn) {
            loginCardNotAuth.classList.add('hidden');
            loginCardAuth.classList.remove('hidden');
        } else {
            loginCardNotAuth.classList.remove('hidden');
            loginCardAuth.classList.add('hidden');
        }
    }
}

// DOM 加載後初始化
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    // 延遲等 GSI SDK 加載
    setTimeout(initTokenClient, 500);
});

// 暴露全域 API
window.voyaAuth = {
    setClientId,
    login,
    logout,
    getAccessToken,
    isLoggedIn,
    updateAuthUI
};
