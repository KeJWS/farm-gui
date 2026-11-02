/* 测试/工具脚本的保险：src/ 比 game.js 新就先拼装，避免测到旧代码 */
const fs = require('fs');
const path = require('path');

module.exports = function ensureBuild() {
  const dir = path.join(__dirname, 'src');
  if (!fs.existsSync(dir)) return;
  const out = path.join(__dirname, 'game.js');
  let newest = 0;
  fs.readdirSync(dir).forEach(function (f) {
    if (!/\.js$/.test(f)) return;
    const t = fs.statSync(path.join(dir, f)).mtimeMs;
    if (t > newest) newest = t;
  });
  if (!fs.existsSync(out) || fs.statSync(out).mtimeMs < newest) {
    process.stdout.write('（src/ 有更新，先拼装 game.js）\n');
    require('./build-modules.cjs');
  }
};
