/* 把 src/*.js 拼成 game.js：node build-modules.cjs
 * ------------------------------------------------------------------
 * 逻辑层被拆成若干模块，但它们共享同一个闭包（拼装后仍然是一个 IIFE），
 * 这样既能分文件维护，又不依赖打包器、也能在 file:// 下直接跑。
 *
 * 静态内容表在 src/data/*.json（作物 / 鱼 / 品质 / 天气 / 果树 / 茶 / 宝箱 / 钥匙 / 肥料），
 * 构建时内联成 const 声明塞进闭包开头 —— 浏览器在 file:// 下不能 fetch JSON。
 * 闭包的头尾也由这里生成，所以 src/ 里的模块不再自己开闭包，
 * 想加新模块只要按 15-xxx.js 这样编号即可（顺序＝文件名排序）。
 *
 * 改完源码跑：node build-modules.cjs（build-single.cjs 会自动先跑一次）
 */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const srcDir = path.join(root, 'src');
const dataDir = path.join(srcDir, 'data');

/* 数据文件 → 闭包里的常量名（顺序和命名都写死在这里，不靠文件名猜） */
const DATA_FILES = [
  ['crops.json', 'CROPS'],
  ['fish.json', 'FISH'],
  ['quality.json', 'QUALITY'],
  ['weather.json', 'WEATHER'],
  ['season-weather.json', 'SEASON_WEATHER'],
  ['trees.json', 'TREES'],
  ['teas.json', 'TEAS'],
  ['chests.json', 'CHESTS'],
  ['keys.json', 'KEYS'],
  ['fert.json', 'FERT']
];

function readJsonConst(file, name) {
  const full = path.join(dataDir, file);
  if (!fs.existsSync(full)) throw new Error('缺少数据文件：src/data/' + file);
  const text = fs.readFileSync(full, 'utf8').replace(/\r\n/g, '\n').trim();
  // 先 JSON.parse 校验：没有注释、尾逗号、语法错误才会通过
  JSON.parse(text);
  // 整块再缩进 2 格，和模块里的其他代码对齐
  const indented = text.split('\n').map(function (line, i) {
    return i ? '  ' + line : line;
  }).join('\n');
  return '  /* ---- src/data/' + file + ' ---- */\n' +
    '  const ' + name + ' = ' + indented + ';\n';
}

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
  ' * 源码在 src/*.js，静态表在 src/data/*.json，改完运行： node build-modules.cjs\n' +
  ' * 拼装后仍然是一个 IIFE，所有模块共享同一个闭包作用域。\n' +
  ' * ============================================================ */\n' +
  '(function (root) {\n' +
  "  'use strict';\n\n";

const tail = "\n})(typeof window !== 'undefined' ? window : globalThis);\n";

const data = DATA_FILES.map(function (pair) { return readJsonConst(pair[0], pair[1]); }).join('\n');

const body = files.map(function (f) {
  return '/* ==================== src/' + f + ' ==================== */\n' +
    fs.readFileSync(path.join(srcDir, f), 'utf8').replace(/\s+$/, '') + '\n';
}).join('\n');

const out = head + data + '\n' + body + tail;
fs.writeFileSync(path.join(root, 'game.js'), out, 'utf8');

if (require.main === module) {
  console.log('✅ 已拼装 game.js（' + files.length + ' 个模块 + ' +
    DATA_FILES.length + ' 张数据表，' + (Buffer.byteLength(out) / 1024).toFixed(1) + ' KB）');
}

module.exports = {
  files: files,
  dataFiles: DATA_FILES.map(function (p) { return p[0]; })
};
