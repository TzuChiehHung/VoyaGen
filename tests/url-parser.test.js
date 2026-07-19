import { normalizeDataUrl } from '../src/url-parser.js';
import assert from 'assert';

console.log('🧪 測試 normalizeDataUrl 網址轉址邏輯...\n');

const testCases = [
    {
        name: 'Google Drive file view 網址轉換',
        input: 'https://drive.google.com/file/d/1ABC123xyz_456-789/view?usp=sharing',
        expected: 'https://drive.google.com/uc?export=download&id=1ABC123xyz_456-789'
    },
    {
        name: 'Google Drive open id 網址轉換',
        input: 'https://drive.google.com/open?id=1ABC123xyz_456-789&authuser=0',
        expected: 'https://drive.google.com/uc?export=download&id=1ABC123xyz_456-789'
    },
    {
        name: 'GitHub Blob 網址轉為 Raw 網址',
        input: 'https://github.com/user/my-repo/blob/main/templates/thailand/itinerary.json',
        expected: 'https://raw.githubusercontent.com/user/my-repo/main/templates/thailand/itinerary.json'
    },
    {
        name: '相對路徑保原樣',
        input: 'templates/itinerary.json',
        expected: 'templates/itinerary.json'
    },
    {
        name: '一般 HTTP Raw 網址保原樣',
        input: 'https://raw.githubusercontent.com/user/my-repo/main/data.json',
        expected: 'https://raw.githubusercontent.com/user/my-repo/main/data.json'
    }
];

let passed = 0;
let failed = 0;

testCases.forEach(({ name, input, expected }) => {
    const result = normalizeDataUrl(input);
    if (result === expected) {
        console.log(`✅ [PASS] ${name}`);
        passed++;
    } else {
        console.error(`❌ [FAIL] ${name}`);
        console.error(`   輸入: ${input}`);
        console.error(`   預期: ${expected}`);
        console.error(`   實際: ${result}\n`);
        failed++;
    }
});

if (failed > 0) {
    console.error(`\n❌ ${failed} 個測試案例未通過。`);
    process.exit(1);
} else {
    console.log(`\n🎉 通過所有 ${passed} 個單元測試！`);
    process.exit(0);
}
