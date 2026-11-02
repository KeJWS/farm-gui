/* 数值体检：node balance.cjs
 * 跑一遍蒙特卡洛，打印钓鱼期望 / 设备回本 / 委托溢价 / 税费占比，
 * 并对明显不合理的数值报警（例如「假饵比面团还亏」「买鱼能套利」）。
 */
require('./ensure-build.cjs')();
const G = require('./game.js');

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function evBait(kind, weather, n) {
  const s = G.createState();
  s.weather = weather; s.maxEnergy = 1e9; s.coins = 0;
  if (kind === 'worm') s.bait.worm = 1e9;
  else if (kind === 'dough') s.bait.dough = 1e9;
  else s.lure = { owned: true, dur: 1e9 };
  let sum = 0, bites = 0;
  for (let i = 0; i < n; i++) {
    s.energy = 1e9;
    s.levels.fish = 1; s.levels.fishXp = 0;      // 隔离等级加成，测基础数值
    const r = G.fish(s, kind);
    if (r.entry) { bites++; sum += r.entry.price; }
  }
  return { ev: sum / n, bite: bites / n };
}

const warn = [];
const N = 8000;

console.log('== 钓鱼期望（每杆 / 咬钩率）==');
const evs = {};
['sunny', 'cloudy', 'rain'].forEach(function (w) {
  const row = ['dough', 'worm', 'lure'].map(function (b) {
    G.setRng(mulberry32(7));
    const r = evBait(b, w, N);
    evs[b + '|' + w] = r;
    return b + ' ' + r.ev.toFixed(2) + ' (' + (r.bite * 100).toFixed(0) + '%)';
  });
  console.log(' ', w.padEnd(6), row.join('   '));
});

console.log('\n== 每点体力净收益（1 份饵 1 金）==');
G.setRng(mulberry32(7));
const d = evs['dough|cloudy'];
const perE = (d.ev - 1) / 2;
console.log('  面团饵', perE.toFixed(2), '金/体力');

console.log('\n== 三种活计（金 / 体力）==');
/* 品质期望倍率：取 times 次最好 */
function qualityEV(times) {
  let ev = 0, prev = 0;
  G.QUALITY.forEach(function (q) {
    const cum = prev + q.w / 100;
    ev += (Math.pow(cum, times) - Math.pow(prev, times)) * q.mul;
    prev = cum;
  });
  return ev;
}
const jobs = [];
G.CROP_LIST.forEach(function (c) {
  [[false, '裸种'], [true, '普通肥']].forEach(function (pair) {
    const fert = pair[0];
    const add = fert && !c.big && !c.multi ? G.FERT.normal.add : 0;
    const qty = c.big ? 1 : (c.multi ? c.firstQty + c.regrowTimes * c.regrowQty : c.base + add);
    const waters = c.multi ? c.days + c.regrowTimes * c.regrowDays : c.days;
    const harvests = c.multi ? c.regrowTimes + 1 : 1;
    const energy = 1 + waters + harvests;
    const gross = qty * c.price * qualityEV(fert ? 2 : 1);
    const net = gross - c.seed - (fert ? G.FERT.normal.cost : 0);
    jobs.push({ name: c.name, label: pair[1], per: net / energy, net: net, energy: energy });
  });
});
jobs.sort(function (a, b) { return b.per - a.per; });
const cropTop = jobs[0];
jobs.slice(0, 5).forEach(function (j) {
  console.log('  ' + j.name.padEnd(5) + j.label.padEnd(6) + j.per.toFixed(2) + ' 金/体力' +
    '（净 ' + Math.round(j.net) + ' 金 / ' + j.energy + ' 体力）');
});
console.log('  打工  全天  ' + G.WORK_RATE_FULL.toFixed(2) + ' 金/体力');
console.log('  打工  半天  ' + G.WORK_RATE_HALF.toFixed(2) + ' 金/体力');
console.log('  钓鱼  面团  ' + perE.toFixed(2) + ' 金/体力');

console.log('\n== 委托样本（前 / 中 / 后期）==');
[2, 6, 12, 45, 75, 105].forEach(function (day) {
  G.setRng(mulberry32(7));
  const os = G.makeOrders({ day: day });
  console.log('  D' + String(day).padEnd(4) + os.map(function (o) {
    return o.name + '×' + o.qty + '（' + o.reward + '金）';
  }).join(' · '));
});

console.log('\n== 设备回本 ==');
const pb = [
  ['洒水器', G.SPRINKLER_COST, perE - 3 / 7],
  ['自动收获器(按每天省3体力)', G.HARVESTER_COST, 3 * perE - 5 / 7],
  ['渔网', G.NET_COST, 0.65 * d.ev - 3 / 7]
];
pb.forEach(function (x) {
  const days = x[1] / x[2];
  console.log('  ' + x[0].padEnd(24), x[1] + ' 金 · ' + days.toFixed(0) + ' 天');
  if (days > 45) warn.push(x[0] + ' 回本 ' + days.toFixed(0) + ' 天，偏慢');
});

console.log('\n== 委托溢价 ==');
[5, 45, 75, 105].forEach(function (day) {
  G.setRng(mulberry32(7));
  const os = G.makeOrders({ day: day });
  const co = os.filter(function (o) { return o.kind === 'crop'; })[0];
  const direct = co.qty * G.CROPS[co.crop].price;
  const pct = (co.reward / direct - 1) * 100;
  console.log('  D' + String(day).padEnd(4), co.crop.padEnd(10), 'x' + co.qty, '报酬', co.reward,
    '直卖', direct, '溢价', pct.toFixed(0) + '%');
  if (pct < 20) warn.push('D' + day + ' 委托溢价只有 ' + pct.toFixed(0) + '%');
});

console.log('\n== 税费 ==');
[10, 25, 36].forEach(function (n) {
  const s = G.createState();
  s.plots = new Array(n).fill(0).map(function () { return G.createState().plots[0]; });
  s.coins = 10000; s.sprinklers = Math.min(n, 10); s.harvester = true;
  const up = G.plotUpkeep(n) + G.deviceUpkeep(s);
  console.log('  ' + String(n).padEnd(3) + ' 块：维护 ' + up + ' 金/周（' + (up / 7).toFixed(1) +
    '/天）· 税 ' + G.taxDue(s) + ' 金/月');
});

console.log('\n== 套利检查 ==');
const ab = G.createState();
ab.coins = 10000; ab.bait = { worm: 0, dough: 0 }; ab.lure = { owned: false, dur: 0 };
ab.orders = [{ id: 't', kind: 'fish', qty: 1, reward: 11, name: '任意鱼', done: false }];
G.buyFish(ab, 'crucian', 1);
const canCheat = G.orderHave(ab, ab.orders[0]) > 0;
console.log('  买来的鱼能否交单：', canCheat ? '⚠️ 能（有套利）' : '不能（OK）');
if (canCheat) warn.push('买鱼仍能交委托，存在套利');

const lure = evs['lure|cloudy'].ev, dough = evs['dough|cloudy'].ev;
const doughNet = dough - 1, lureNet = lure - 5 / 20;
console.log('  每杆净收益：面团', doughNet.toFixed(2), '· 假饵', lureNet.toFixed(2));
if (lureNet < doughNet * 0.9) warn.push('假饵净收益比面团低 10% 以上');

if (warn.length) {
  console.log('\n⚠️ 需要关注：');
  warn.forEach(function (w) { console.log('  - ' + w); });
  process.exitCode = 1;
} else {
  console.log('\n✅ 数值体检通过');
}
