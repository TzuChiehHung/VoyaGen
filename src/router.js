/**
 * VoyaGen SPA 輕量前端路由器 (Router)
 * 管理 Login, Dashboard, Generator, Viewer 視圖切換
 */

const routes = {
    'login': 'view-login',
    'dashboard': 'view-dashboard',
    'generator': 'view-generator',
    'viewer': 'view-viewer'
};

function navigateTo(routeName) {
    const targetRoute = routes[routeName] ? routeName : 'viewer';
    
    // 更新 URL Hash (若非預設或有 data 參數時適度處理)
    if (window.location.hash !== `#${targetRoute}`) {
        window.location.hash = targetRoute;
    }

    // 切換視圖容器顯示
    Object.keys(routes).forEach(r => {
        const elementId = routes[r];
        const viewEl = document.getElementById(elementId);
        if (viewEl) {
            if (r === targetRoute) {
                viewEl.classList.remove('hidden');
            } else {
                viewEl.classList.add('hidden');
            }
        }
    });

    // 若切換至 dashboard，觸發 Dashboard 讀取
    if (targetRoute === 'dashboard' && typeof window.voyaDrive !== 'undefined' && typeof window.voyaDrive.renderDashboard === 'function') {
        window.voyaDrive.renderDashboard();
    }

    // 若切換至 generator，初始化 AI 生成器
    if (targetRoute === 'generator' && typeof window.voyaGenerator !== 'undefined' && typeof window.voyaGenerator.initGeneratorView === 'function') {
        window.voyaGenerator.initGeneratorView();
    }

    // 若切換至 viewer，觸發 行程載入
    if (targetRoute === 'viewer' && typeof window.initItineraryView === 'function') {
        window.initItineraryView();
    }

    // 更新導覽列 Active 狀態
    document.querySelectorAll('.nav-link').forEach(link => {
        const linkRoute = link.getAttribute('data-route');
        if (linkRoute === targetRoute) {
            link.classList.add('text-indigo-600', 'border-b-2', 'border-indigo-600', 'font-bold');
            link.classList.remove('text-slate-600', 'hover:text-slate-900');
        } else {
            link.classList.remove('text-indigo-600', 'border-b-2', 'border-indigo-600', 'font-bold');
            link.classList.add('text-slate-600', 'hover:text-slate-900');
        }
    });
}

function handleHashChange() {
    const rawHash = window.location.hash.replace('#', '').trim();
    const cleanRoute = rawHash.split('?')[0];
    const urlParams = new URLSearchParams(window.location.search);

    if (cleanRoute && routes[cleanRoute]) {
        navigateTo(cleanRoute);
    } else if (urlParams.has('data')) {
        navigateTo('viewer');
    } else {
        navigateTo('dashboard');
    }
}

// 初始化路由器
function initRouter() {
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
}

document.addEventListener('DOMContentLoaded', initRouter);
window.navigateTo = navigateTo;
