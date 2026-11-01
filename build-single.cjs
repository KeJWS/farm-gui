/* 打包成单文件：node build-single.cjs  →  我的小农场.html */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

let html = read('index.html');
const css = read('style.css');
const game = read('game.js');
const ui = read('ui.js');

// 用函数替换，避免 $& / $$ 等被 String.replace 当成特殊记号
html = html.replace('<link rel="stylesheet" href="style.css">', () => '<style>\n' + css + '\n</style>');
html = html.replace(
  '<script src="game.js"></script>\n<script src="ui.js"></script>',
  () => '<script>\n' + game + '\n</script>\n<script>\n' + ui + '\n</script>'
);

if (html.includes('src="game.js"') || html.includes('href="style.css"')) {
  console.error('❌ 内联失败：仍有外部引用');
  process.exit(1);
}

const out = path.join(root, '我的小农场.html');
fs.writeFileSync(out, html, 'utf8');
console.log('✅ 已生成 ' + out + '（' + (Buffer.byteLength(html) / 1024).toFixed(1) + ' KB）');
