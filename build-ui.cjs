/* 把 ui-src/*.js 拼成 ui.js：node build-ui.cjs
 * 所有模块共享同一个 IIFE 作用域，所以可以互相直接调用；顺序只影响顶层执行语句。
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'ui-src');
const files = fs.readdirSync(dir).filter(function (f) { return /^\d+-.+\.js$/.test(f); }).sort();

if (!files.length) {
  console.error('❌ ui-src/ 里没有模块');
  process.exit(1);
}

const parts = files.map(function (f) {
  const body = fs.readFileSync(path.join(dir, f), 'utf8')
    .replace(/\r\n/g, '\n')
    .replace(/\s+$/, '');
  return '  /* ===== ' + f + ' ===== */\n' + body + '\n';
});

const header =
  '/* ============================================================\n' +
  ' * 我的小农场 · 界面层\n' +
  ' * 由 build-ui.cjs 从 ui-src/ 拼装生成 —— 不要直接改这个文件，改 ui-src/ 下的模块。\n' +
  ' * ============================================================ */\n' +
  '(function () {\n' +
  "  'use strict';\n\n";

const out = path.join(__dirname, 'ui.js');
const text = header + parts.join('\n') + '\n})();\n';
fs.writeFileSync(out, text, 'utf8');
console.log('✅ 已拼装 ui.js（' + files.length + ' 个模块，' + files.join(' / ') + '，' +
  (Buffer.byteLength(text) / 1024).toFixed(1) + ' KB）');
