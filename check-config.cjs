/* 数值来源检查：node check-config.cjs
 * ------------------------------------------------------------------
 * 目标：所有可调数值只在 src/01-data.js 的 BALANCE 里定义一次。
 *  - BALANCE 顶层键不许重复（重复键会被 JS 静默覆盖，之前的 tax 就是这样）
 *  - 逻辑层不许写死体力消耗（必须走 BALANCE.energy / dig / forage / orchard）
 *  - 界面层不许写死「N 体力」，index.html 的动作按钮也不许带死数字
 *  - 合并掉的旧键（prices / lure2.lv / tax.rate）不许复活
 */
require('./ensure-build.cjs')();
const fs = require('fs');
const path = require('path');
const G = require('./game.js');

let pass = 0, fail = 0;
function ok(cond, label, extra) {
  if (cond) { pass++; console.log('  ✅ ' + label); }
  else { fail++; console.log('  ❌ ' + label + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
}

const root = __dirname;
const readFile = function (p) { return fs.readFileSync(path.join(root, p), 'utf8'); };

console.log('\n== 配置来源 ==');
ok(!!G.BALANCE && typeof G.BALANCE === 'object', 'BALANCE 已导出给界面层');

/* 1. BALANCE 顶层键不许重复 */
const lines = readFile('src/01-data.js').split(/\r?\n/);
const start = lines.findIndex(function (l) { return l.indexOf('const BALANCE = {') >= 0; });
let end = -1;
for (let i = start + 1; i < lines.length; i++) {
  if (lines[i] === '  };') { end = i; break; }
}
ok(start >= 0 && end > start, '找到 BALANCE 字面量');
const keys = [];
for (let i = start + 1; i < end; i++) {
  const m = lines[i].match(/^    ([A-Za-z_$][\w$]*)\s*:/);
  if (m) keys.push(m[1]);
}
const dup = keys.filter(function (k, i) { return keys.indexOf(k) !== i; });
ok(dup.length === 0, 'BALANCE 顶层键没有重复', dup);
ok(keys.length >= 25, 'BALANCE 键数量正常（' + keys.length + '）');

/* 2. 合并掉的旧键不许复活 */
ok(!('prices' in G.BALANCE), '旧键 BALANCE.prices 已合并（设备价格统一走 device）');
ok(!('lv' in G.BALANCE.lure2), '旧键 BALANCE.lure2.lv 已合并（统一走 gate.lure2）');
ok(!('rate' in G.BALANCE.tax), '重复的 BALANCE.tax.rate 已删除（税率走 bands）');

/* 3. 逻辑层不许写死体力消耗 */
const energyHits = [];
fs.readdirSync(path.join(root, 'src')).filter(function (f) { return /\.js$/.test(f); })
  .forEach(function (f) {
    readFile('src/' + f).split(/\r?\n/).forEach(function (line, i) {
      if (/s\.energy\s*(?:-=|\+=|<|<=|>=)\s*\d/.test(line)) {
        energyHits.push(f + ':' + (i + 1) + ' ' + line.trim());
      }
    });
  });
ok(energyHits.length === 0, '逻辑层没有写死的体力数字', energyHits.slice(0, 5));

/* 4. 界面层不许写死「N 体力」 */
const uiHits = [];
fs.readdirSync(path.join(root, 'ui-src')).filter(function (f) { return /\.js$/.test(f); })
  .forEach(function (f) {
    readFile('ui-src/' + f).split(/\r?\n/).forEach(function (line, i) {
      if (/\d+\s*体力/.test(line)) uiHits.push(f + ':' + (i + 1) + ' ' + line.trim());
    });
  });
ok(uiHits.length === 0, '界面层没有写死的「N 体力」', uiHits.slice(0, 5));

/* 5. index.html 静态文案不写动作数值 */
const html = readFile('index.html');
const smallNums = html.match(/<small[^>]*>\s*\d[^<]*<\/small>/g) || [];
ok(smallNums.length === 0, 'index.html 的 <small> 不带写死数值', smallNums.slice(0, 5));
const hudNums = html.match(/id="hud-[^"]*"[^>]*>[^<]*\d/g) || [];
ok(hudNums.length === 0, 'HUD 初始值不写死数字', hudNums.slice(0, 5));

/* 6. 关键配置项存在且是有效数字 */
const checks = [
  ['energy.plant', G.BALANCE.energy.plant],
  ['energy.water', G.BALANCE.energy.water],
  ['energy.waterSummer', G.BALANCE.energy.waterSummer],
  ['energy.harvest', G.BALANCE.energy.harvest],
  ['energy.fert', G.BALANCE.energy.fert],
  ['energy.fish', G.BALANCE.energy.fish],
  ['start.plots', G.BALANCE.start.plots],
  ['meal.base', G.BALANCE.meal.base],
  ['upgrade.step', G.BALANCE.upgrade.step],
  ['dig.value', G.BALANCE.dig.value],
  ['fishBatch', G.BALANCE.fishBatch]
];
const bad = checks.filter(function (c) { return typeof c[1] !== 'number' || !isFinite(c[1]); });
ok(bad.length === 0, '关键配置项都是有效数字', bad.map(function (c) { return c[0]; }));

console.log('\n' + (fail ? '❌' : '✅') + ' 通过 ' + pass + ' / ' + (pass + fail));
process.exit(fail ? 1 : 0);
