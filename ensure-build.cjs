/* 测试/工具脚本的保险：src/ 或 ui-src/ 比产物新就先拼装，避免测到旧代码 */
const fs = require('fs');
const path = require('path');

function newestMtime(dir) {
  let newest = 0;
  fs.readdirSync(dir).forEach(function (f) {
    if (!/\.js$/.test(f)) return;
    const t = fs.statSync(path.join(dir, f)).mtimeMs;
    if (t > newest) newest = t;
  });
  return newest;
}

module.exports = function ensureBuild() {
  const srcDir = path.join(__dirname, 'src');
  const uiDir = path.join(__dirname, 'ui-src');

  if (fs.existsSync(srcDir)) {
    const out = path.join(__dirname, 'game.js');
    if (!fs.existsSync(out) || fs.statSync(out).mtimeMs < newestMtime(srcDir)) {
      process.stdout.write('（src/ 有更新，先拼装 game.js）\n');
      require('./build-modules.cjs');
    }
  }

  if (fs.existsSync(uiDir)) {
    const uiOut = path.join(__dirname, 'ui.js');
    if (!fs.existsSync(uiOut) || fs.statSync(uiOut).mtimeMs < newestMtime(uiDir)) {
      process.stdout.write('（ui-src/ 有更新，先拼装 ui.js）\n');
      require('./build-ui.cjs');
    }
  }
};
