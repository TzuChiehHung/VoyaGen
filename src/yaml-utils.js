/**
 * VoyaGen YAML / JSON 雙向轉換與解析工具模組
 * 依賴 js-yaml (CDN 全域變數 jsyaml)
 */

/**
 * 智慧解析 YAML 或 JSON 字串 (js-yaml 可相容解析 JSON)
 * @param {string} text 
 * @returns {Object}
 */
function parseYamlOrJson(text) {
    if (!text || typeof text !== 'string') {
        throw new Error('未提供有效的文字內容');
    }

    // 1. 清除 Markdown 程式碼區塊標記 ```yaml, ```json, ```
    let cleanText = text.replace(/```(yaml|json)?/gi, '').replace(/```/g, '').trim();

    // 2. 優先使用 jsyaml 解析
    if (typeof jsyaml !== 'undefined' && typeof jsyaml.load === 'function') {
        try {
            const result = jsyaml.load(cleanText);
            if (result && typeof result === 'object') {
                return result;
            }
        } catch (e) {
            console.warn('jsyaml 解析失敗，嘗試 JSON 容錯解析:', e.message);
        }
    }

    // 3. Fallback 到原生 JSON 解析
    try {
        return JSON.parse(cleanText);
    } catch (e) {
        throw new Error(`YAML/JSON 解析失敗: ${e.message}`);
    }
}

/**
 * 將 JavaScript 物件導出為格式化良好的 YAML 字串
 * @param {Object} obj 
 * @returns {string}
 */
function dumpYaml(obj) {
    if (!obj || typeof obj !== 'object') {
        return '';
    }

    if (typeof jsyaml !== 'undefined' && typeof jsyaml.dump === 'function') {
        try {
            return jsyaml.dump(obj, {
                indent: 2,
                lineWidth: -1,
                noRefs: true,
                skipInvalid: true,
                quotingType: '"',
                forceQuotes: false
            });
        } catch (e) {
            console.error('jsyaml 轉檔失敗，改用 JSON:', e);
        }
    }

    return JSON.stringify(obj, null, 2);
}

// 暴露全域 API
if (typeof window !== 'undefined') {
    window.voyaYaml = {
        parseYamlOrJson,
        dumpYaml
    };
}
