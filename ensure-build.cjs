/* 测试/工具脚本的保险：src/、src/data/ 或 ui-src/ 比产物新就先拼装，避免测到旧代码 */
const fs = require('fs');
const path = require('path');

function newestFile(dir, test) {
  let newest = 0;
  fs.readdirSync(dir).forEach(function (f) {
    if (!test(f)) return;
    const t = fs.statSync(path.join(dir, f)).mtimeMs;
    if (t > newest) newest = t;
  });
  return newest;
}

function newestMtime(dir) {
  return newestFile(dir, function (f) { return /\.js$/.test(f); });
}

module.exports = function ensureBuild() {
  const srcDir = path.join(__dirname, 'src');
  const dataDir = path.join(srcDir, 'data');
  const uiDir = path.join(__dirname, 'ui-src');

  if (fs.existsSync(srcDir)) {
    const out = path.join(__dirname, 'game.js');
    const newestJs = newestMtime(srcDir);
    const newestJson = fs.existsSync(dataDir)
      ? newestFile(dataDir, function (f) { return /\.json$/.test(f); })
      : 0;
    if (!fs.existsSync(out) || fs.statSync(out).mtimeMs < Math.max(newestJs, newestJson)) {
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
