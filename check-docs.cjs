/* 文档一致性检查：node check-docs.cjs
 * ------------------------------------------------------------------
 * README 和游戏内「规则说明」（ui-src/06-help.js）里的关键数值必须和 BALANCE 一致。
 * 只要改了 BALANCE，这里就会提醒你去同步文档；规则说明里也不许再写死这些数字。
 */
require('./ensure-build.cjs')();
const fs = require('fs');
const path = require('path');
const G = require('./game.js');

const B = G.BALANCE;
const O = B.orchard;
let pass = 0, fail = 0;
function ok(cond, label, extra) {
  if (cond) { pass++; console.log('  ✅ ' + label); }
  else { fail++; console.log('  ❌ ' + label + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
}

const readme = fs.readFileSync(path.join(__dirname, 'README.md'), 'utf8');
const help = fs.readFileSync(path.join(__dirname, 'ui-src', '06-help.js'), 'utf8');

console.log('\n== README 数值 ==');
const expandStart = G.expandCost({ plots: new Array(B.start.plots).fill(0) });
const upgradeFirst = G.upgradeCost({ maxEnergy: B.start.maxEnergy });

const facts = [
  ['果园开垦 / 树坑',
    '种田 Lv' + O.unlockLv + ' + ' + O.unlockCost + ' 金开垦，先给 **' + O.free +
    ' 个树坑**，第 ' + (O.free + 1) + '~' + O.slots + ' 个树坑花钱开（' + O.slotCosts.join(' / ') + ' 金）'],
  ['果园育苗进度', '浇水 x/' + O.grow.seed.water + ' · 生长 y/' + O.grow.seed.days + ' 天'],
  ['果园体力', '**浇果树**（' + O.waterEnergy + ' 体力/棵）、**收获全部**（' +
    O.harvestEnergy + ' 体力/棵）'],
  ['设备价格', '**洒水器**（' + B.device.sprinkler + ' 金/个）、**自动收获器**（' +
    B.device.harvester + ' 金）、**自动播种器**（' + B.device.seeder + ' 金/台）'],
  ['扩张土地', '扩张 ' + expandStart + ' 金起，每块 +' + B.expand.step],
  ['强化体力', '首次强化 **' + upgradeFirst + ' 金**'],
  ['强化倍率', '每级 ×' + B.upgrade.costMul],
  ['钓鱼体力', B.energy.fish + ' 体力 + 1 饵'],
  ['面团饵咬钩', '面团（' + Math.round(B.hook.dough * 100) + '% 咬钩）'],
  ['假饵耐用', '耐用 ' + B.lure.dur + ' 次'],
  ['高级假饵', '钓鱼 Lv' + B.gate.lure2 + '，' + B.lure2.price + ' 金 **' + B.lure2.dur + ' 次**'],
  ['挖蚯蚓', '挖蚯蚓：' + B.dig.energy + ' 体力，基础 ' + B.dig.min + '–' + B.dig.max + ' 条'],
  ['蚯蚓卖价', '按 ' + B.dig.value + ' 金/条卖'],
  ['采集体力', '**' + B.forage.energy + ' 体力**去后山'],
  ['夏季浇水', '**浇水要 ' + B.energy.waterSummer + ' 体力**（其他季节 ' + B.energy.water + ' 点）'],
  ['税周期', '每 ' + B.tax.every + ' 天一次'],
  ['税档', '2% / 4% / 6%'],
  ['最低税', '最低 ' + B.tax.min + ' 金']
];
facts.forEach(function (f) {
  ok(readme.indexOf(f[1]) >= 0, 'README：' + f[0], f[1]);
});

console.log('\n== 规则说明不写死数字 ==');
const stale = [
  ['每 4 级', '产量加成间隔'],
  ['×1.25', '鱼汛'],
  ['×0.3', '鱼汛 / 假饵'],
  ['×1.35', '蚯蚓好鱼'],
  ['×1.15', '假饵好鱼'],
  ['雨天 50', '春季雨天'],
  ['晴天 60', '夏季晴天'],
  ['（45%', '冬季下雪'],
  ['每 2 杆', '钓鱼经验'],
  ['15 + 10×(级−1)', '等级经验'],
  ['2 体力 + 1 份饵', '钓鱼体力']
];
stale.forEach(function (s) {
  ok(help.indexOf(s[0]) < 0, '规则说明不再写死「' + s[1] + '」', s[0]);
});

console.log('\n' + (fail ? '❌' : '✅') + ' 通过 ' + pass + ' / ' + (pass + fail));
process.exit(fail ? 1 : 0);
