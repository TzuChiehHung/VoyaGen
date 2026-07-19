import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const schemaPath = path.join(rootDir, 'schema.json');
const templatesDir = path.join(rootDir, 'templates');

// 讀取 Schema
if (!fs.existsSync(schemaPath)) {
    console.error('❌ 找不到 schema.json');
    process.exit(1);
}

const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

// 搜尋 templates 目錄下的所有 JSON 檔案
function findJsonFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(findJsonFiles(fullPath));
        } else if (file.endsWith('.json')) {
            results.push(fullPath);
        }
    });
    return results;
}

const jsonFiles = findJsonFiles(templatesDir);

console.log(`🔍 找到 ${jsonFiles.length} 個行程 JSON 檔進行格式驗證...\n`);

let hasError = false;

jsonFiles.forEach(filePath => {
    const relativePath = path.relative(rootDir, filePath);
    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const jsonData = JSON.parse(fileContent);
        const valid = validate(jsonData);

        if (valid) {
            console.log(`✅ [PASS] ${relativePath}`);
        } else {
            hasError = true;
            console.error(`❌ [FAIL] ${relativePath}`);
            validate.errors.forEach(err => {
                console.error(`   - 欄位: ${err.instancePath || '(root)'}`);
                console.error(`     錯誤: ${err.message}`);
                if (err.params) console.error(`     細節: ${JSON.stringify(err.params)}`);
            });
            console.error('');
        }
    } catch (e) {
        hasError = true;
        console.error(`💥 [ERROR] ${relativePath}: 語法解析失敗 (${e.message})\n`);
    }
});

if (hasError) {
    console.error('❌ 驗證完成：存在未通過格式規範的行程資料。');
    process.exit(1);
} else {
    console.log('\n🎉 所有行程 JSON 資料均完全符合 schema.json 規範！');
    process.exit(0);
}
