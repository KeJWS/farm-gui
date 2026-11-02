/* 把 src/*.js 拼成 game.js：node build-modules.cjs
 * ------------------------------------------------------------------
 * 逻辑层被拆成 13 个模块，但它们共享同一个闭包（拼装后仍然是一个 IIFE），
 * 这样既能分文件维护，又不依赖打包器、也能在 file:// 下直接跑。
 * 改代码请编辑 src/，然后跑这个脚本（build-single.cjs 会自动先跑一次）。
 */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const srcDir = path.join(root, 'src');

const files = fs.readdirSync(srcDir)
  .filter(function (f) { return /^\d\d-[\w-]+\.js$/.test(f); })
  .sort();

if (!files.length) {
  console.error('❌ src/ 下没有模块');
  process.exit(1);
}

const head =
  '/* ============================================================\n' +
  ' * 我的小农场 · 游戏逻辑层（自动生成，别直接改这个文件！）\n' +
  ' * 源码在 src/*.js，改完运行： node build-modules.cjs\n' +
  ' * 拼装后仍然是一个 IIFE，所有模块共享同一个闭包作用域。\n' +
  ' * ============================================================ */\n';

const body = files.map(function (f) {
  return '/* ==================== src/' + f + ' ==================== */\n' +
    fs.readFileSync(path.join(srcDir, f), 'utf8').replace(/\s+$/, '') + '\n';
}).join('\n');

const out = head + '\n' + body;
fs.writeFileSync(path.join(root, 'game.js'), out, 'utf8');

if (require.main === module) {
  console.log('✅ 已拼装 game.js（' + files.length + ' 个模块，' +
    (Buffer.byteLength(out) / 1024).toFixed(1) + ' KB）');
}

module.exports = { files: files };
