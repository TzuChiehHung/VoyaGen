# VoyaGen - 旅遊行程 AI 產生器 (Travel Itinerary Generator)

一個結合 AI 行程生成、Google Drive 雲端儲存與零伺服器費用的網頁旅遊行程展示 App。透過 JSON 資料檔描述行程，部署至 GitHub Pages 搭配存放在 Google Drive 的個人行程資料，產出精美的分享連結。

## ✨ 功能特色

- **資料與展示完全分離**：行程 JSON 存於 Google Drive，展示器部署於 GitHub Pages，互不相依
- **AI 生成行程**：行程 JSON 可由 AI（如 ChatGPT、Gemini）依照範本格式自動產出
- **主題色系自訂**：每份行程可獨立設定配色，從 Hero 橫幅到時間軸顏色全面客製
- **交通顯示開關**：右上角切換開關，可隱藏/顯示所有交通移動區段
- **多人分流支援**：`split` 類型支援行程分岔（如：A 去逛街、B 去爬山），並提供集合說明

## 🚀 快速開始

### 本地預覽

使用任意 HTTP Server 在專案根目錄啟動：

```bash
# 方法一：VS Code Live Server 擴充套件（推薦，開啟後預設為 5500）

# 方法二：Python
python -m http.server 5500

# 方法三：Node.js
npx serve . -p 5500
```

開啟瀏覽器至 `http://localhost:5500`，預設會載入 `templates/itinerary.json` 範本。

### 載入指定行程

在網址後加上 `?data=` 參數指定 JSON 路徑：

```
# 本地測試
http://localhost:5500/index.html?data=templates/itinerary.json

# 指定 Google Drive 公開連結
https://TzuChiehHung.github.io/VoyaGen/?data=https://YOUR_GOOGLE_DRIVE_DIRECT_LINK
```

## 📁 專案結構

```
VoyaGen/
├── index.html              # 主頁面與 SPA 視圖容器
├── schema.json             # JSON Schema 定義（供格式驗證使用）
├── package.json            # 專案套件與 script 配置
├── assets/
│   └── css/
│       └── theme.css       # 主題樣式（時間軸、里程碑、提示框等）
├── src/
│   ├── auth.js             # Google OAuth 2.0 登入授權與 Token 管理
│   ├── router.js           # 前端 SPA Hash 路由器 (Dashboard, Generator, Login, Viewer)
│   ├── url-parser.js       # Google Drive / GitHub Raw 網址自動解析轉換
│   ├── render.js           # 核心渲染邏輯（資料載入、主題套用、Timeline 渲染）
│   └── templates.js        # HTML 片段產生器
├── tests/
│   └── url-parser.test.js  # URL 解析單元測試
└── templates/
    └── itinerary.json      # 📖 行程範本說明書（含完整欄位說明與範例）
```

## 📝 行程 JSON 格式說明

請參考 [`templates/itinerary.json`](templates/itinerary.json)，其中包含：

- 完整的欄位說明（以 `_comment` 標注）
- 覆蓋所有 `type` 的示範行程（`milestone`、`activity`、`transfer`、`split`）
- 主題色系填寫範例
- 底部 `_field_reference` 快速查閱表

### Timeline 項目類型

| type | 說明 | 顯示方式 |
|------|------|----------|
| `milestone` | 重要里程碑（出發、抵達） | 特殊強調框，帶色彩邊框 |
| `activity` | 一般活動 | 標準時間軸條目 |
| `transfer` | 交通移動 | 縮排顯示，可被右上角開關隱藏 |
| `split` | 行程分流 | 多欄並排，支援 2 條以上路線 |

### Notes 提示框 icon

`icon` 欄位填入 FontAwesome class 名稱，提示框顏色會自動跟隨 `meta.theme` 主題色（或 split track 色系）：

```json
{ "icon": "fa-solid fa-lightbulb", "title": "提示：", "content": "..." }
{ "icon": "fa-solid fa-triangle-exclamation", "title": "注意：", "content": "..." }
{ "icon": "fa-solid fa-circle-check", "title": "確認：", "content": "..." }
```

## 🌐 部署至 GitHub Pages

1. 將此專案推送至 GitHub Repository (`TzuChiehHung/VoyaGen`)
2. 至 Repository 設定 → Pages → Branch 選 `main`，儲存
3. 等待約 1 分鐘，取得網址：`https://TzuChiehHung.github.io/VoyaGen/`

## 📤 Google Drive 分享流程

1. 使用 AI 依照 `templates/itinerary.json` 格式生成你的行程 JSON
2. 將 JSON 上傳至 Google Drive，右鍵 → 共用 → 設為「知道連結的人都能查看」
3. 取得直接下載連結（需將 `drive.google.com/file/d/FILE_ID/view` 轉換為 `drive.google.com/uc?export=download&id=FILE_ID`）
4. 組合分享網址：

```
https://TzuChiehHung.github.io/VoyaGen/?data=https://drive.google.com/uc?export=download&id=YOUR_FILE_ID
```

## 🛠 給 AI 的生成提示詞

生成行程 JSON 時，可將以下提示詞交給 AI：

```
請依照以下 JSON 範本格式，為我生成一份 [目的地] [天數] 的旅遊行程。
格式範本請參考：[貼上 templates/itinerary.json 的內容]

注意事項：
1. 保留 _comment 欄位但可修改說明內容，或直接刪除 _comment
2. meta.theme 請依旅遊目的地的氛圍選擇合適的主題色
3. timeline 中請善用 notes 欄位補充實用的旅遊資訊（票價、注意事項等）
4. 若有多人分頭行動的情境，請使用 split 類型
```
