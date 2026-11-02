/* 收益分析：node analysis.cjs
 * 把一个版本里所有赚钱途径换算成可比的单位：
 *   - 每点体力净收益（金/体力）
 *   - 每块地每天净收益（金/地/天）
 *   - 每日被动收益（渔网）
 * 再拼成早 / 中 / 后期三种经营模型的日净收入。
 */
const G = require('./game.js');

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* 品质期望倍率：取 times 次最好 */
function qEV(times) {
  let ev = 0, prev = 0;
  G.QUALITY.forEach(function (q) {
    const cum = prev + q.w / 100;
    ev += (Math.pow(cum, times) - Math.pow(prev, times)) * q.mul;
    prev = cum;
  });
  return ev;
}

const pad = function (s, n) { s = String(s); while (s.length < n) s += ' '; return s; };

/* ---------- 1. 种田 ---------- */
function farmRows(level) {
  const bonus = Math.floor(level / 5);
  return G.CROP_LIST.map(function (c) {
    const fert = !c.big && !c.multi;
    const add = fert ? G.FERT.normal.add : 0;
    const qty = c.big ? 1 : (c.multi ? c.firstQty + c.regrowTimes * c.regrowQty : c.base + add + bonus);
    const days = c.multi ? c.days + c.regrowTimes * c.regrowDays : c.days;
    const harvests = c.multi ? c.regrowTimes + 1 : 1;
    const energy = 1 + days + harvests;
    const gross = qty * c.price * qEV(fert ? 2 : 1);
    const net = gross - c.seed - (fert ? G.FERT.normal.cost : 0);
    return { name: c.name, qty: qty, net: net, days: days, energy: energy,
             perE: net / energy, perDay: net / days, fert: fert };
  }).sort(function (a, b) { return b.perDay - a.perDay; });
}

console.log('== 种田：每块地每天的净收益 ==');
[1, 5, 8].forEach(function (lv) {
  const rows = farmRows(lv);
  console.log('\n  种田 Lv' + lv + '（产量 +' + Math.floor(lv / 5) + '）');
  rows.slice(0, 5).forEach(function (r) {
    console.log('   ' + pad(r.name, 4) + pad(r.qty + '个/' + r.days + '天', 11) +
      pad('净 ' + Math.round(r.net) + ' 金', 11) +
      pad(r.perE.toFixed(2) + ' 金/体力', 13) + r.perDay.toFixed(1) + ' 金/地/天');
  });
});

/* ---------- 2. 钓鱼 ---------- */
function evBait(kind, weather, level, n) {
  const s = G.createState();
  s.weather = weather; s.maxEnergy = 1e9; s.coins = 0;
  s.levels.fish = level;
  if (kind === 'worm') s.bait.worm = 1e9;
  else if (kind === 'dough') s.bait.dough = 1e9;
  else s.lure = { owned: true, dur: 1e9 };
  let sum = 0, bite = 0;
  for (let i = 0; i < n; i++) {
    s.energy = 1e9;
    s.levels.fishXp = 0; s.levels.fish = level;   // 固定等级，避免升级干扰
    const r = G.fish(s, kind);
    if (r.entry) { bite++; sum += r.entry.price; }
  }
  return { ev: sum / n, bite: bite / n };
}

console.log('\n== 钓鱼：每杆期望（阴天，Lv1 / Lv10）==');
const baits = [['dough', '面团', 1], ['worm', '蚯蚓', 0], ['lure', '假饵', 0.25]];
baits.forEach(function (b) {
  G.setRng(mulberry32(7));
  const a = evBait(b[0], 'cloudy', 1, 6000);
  G.setRng(mulberry32(7));
  const z = evBait(b[0], 'cloudy', 10, 6000);
  console.log('   ' + pad(b[1], 4) + '咬钩 ' + (a.bite * 100).toFixed(0) + '% / ' + (z.bite * 100).toFixed(0) +
    '% · 每杆 ' + a.ev.toFixed(2) + ' / ' + z.ev.toFixed(2) + ' 金' +
    ' · 净 ' + (a.ev - b[2]).toFixed(2) + ' / ' + (z.ev - b[2]).toFixed(2) +
    ' · 每体力 ' + ((a.ev - b[2]) / 2).toFixed(2) + ' / ' + ((z.ev - b[2]) / 2).toFixed(2));
});

const weatherRow = ['sunny', 'cloudy', 'rain'].map(function (w) {
  G.setRng(mulberry32(7));
  const r = evBait('dough', w, 1, 4000);
  return G.WEATHER[w].name + ' ' + r.ev.toFixed(2);
});
console.log('   面团饵 天气对比：' + weatherRow.join(' · '));
/* 蚯蚓要花体力挖：3 体力挖 1~3 条，晴天 −1、阴雨 +1 */
const wormAvg = 3;                        // 阴天 2~4 条
const wormPerCastE = 2 + 3 / wormAvg;     // 1 杆 2 点体力 + 一根蚯蚓摊到的挖掘体力
console.log('   蚯蚓算上挖掘成本：阴天约 ' + (9.21 / wormPerCastE).toFixed(2) +
  ' 金/体力，晴天约 ' + (8.1 / (2 + 3 / 1.5)).toFixed(2) + ' 金/体力');

/* ---------- 3. 渔网 ---------- */
const netPool = G.FISH.filter(function (f) { return !f.trash && !f.noOrder; });
const netQs = G.QUALITY.filter(function (q) { return ['bad', 'common', 'std'].indexOf(q.id) >= 0; });
const netW = netPool.reduce(function (a, f) { return a + f.w; }, 0);
const netQW = netQs.reduce(function (a, q) { return a + q.w; }, 0);
let netEV = 0;
netPool.forEach(function (f) {
  netQs.forEach(function (q) {
    netEV += (f.w / netW) * (q.w / netQW) * Math.max(1, Math.round(f.base * q.mul));
  });
});
const netPerDay = G.NET_CHANCE * netEV - 1;      // 每天 1 份面团饵
console.log('\n== 渔网 ==');
console.log('   每条网每天：命中 ' + (G.NET_CHANCE * 100).toFixed(0) + '% × 期望 ' + netEV.toFixed(1) +
  ' 金 − 1 饵 = 净 ' + netPerDay.toFixed(2) + ' 金');
console.log('   回本：' + G.NET_COST + ' 金 / ' + netPerDay.toFixed(2) + ' ≈ ' + Math.round(G.NET_COST / netPerDay) + ' 天');

/* ---------- 4. 打工 / 委托 / 商店 ---------- */
console.log('\n== 打工 / 委托 / 商店 ==');
console.log('   打零工：全天 ' + G.WORK_RATE_FULL.toFixed(2) + ' 金/体力 · 半天 ' + G.WORK_RATE_HALF.toFixed(2));
console.log('   委托溢价：×' + G.BALANCE.order.mult + '，鱼单 ' +
  [0, 1, 2, 3].map(function (s) { return 11 + 4 * s; }).join(' / ') + ' 金/条（按季节）');
console.log('   水产店买入：基础价 ×' + G.BALANCE.shop.priceMul + '（转卖亏 ' +
  Math.round((1 - 1 / G.BALANCE.shop.priceMul) * 100) + '%）');
console.log('   农产品店买入：售价 ×' + G.BALANCE.shop.cropPriceMul + '（转卖亏 ' +
  Math.round((1 / G.BALANCE.shop.cropPriceMul - 1) * -100) + '%）');

console.log('\n== 卖货渠道（1000 金货值）==');
const saleRows = [
  ['委托', G.BALANCE.order.mult, '立刻（每天 2 作物单 + 1 鱼单）'],
  ['收购箱', 1, '下次睡觉结算'],
  ['水产店 / 农产品店', G.BALANCE.shop.sellRate, '立刻']
];
saleRows.forEach(function (r) {
  console.log('   ' + pad(r[0], 20) + Math.round(r[1] * 100) + '% → ' +
    Math.round(1000 * r[1]) + ' 金 · ' + r[2]);
});

/* ---------- 4.2 委托池 vs 种子等级 ---------- */
console.log('\n== 委托池 vs 种子等级（能否买到）==');
function levelAt(harvests) {
  let lv = 1, xp = harvests;
  while (lv < G.BALANCE.level.max && xp >= G.levelNeed(lv)) { xp -= G.levelNeed(lv); lv++; }
  return lv;
}
G.ORDER_TIERS.forEach(function (t) {
  const pool = G.orderPool(t.day);
  const need = pool.reduce(function (a, c) { return Math.max(a, c.lv || 1); }, 1);
  const lv = levelAt(t.day * 4);          // 粗估：每天 4 次收获
  const bad = pool.filter(function (c) { return (c.lv || 1) > lv; });
  console.log('   D' + pad(t.day, 3) + pool.length + ' 种 · 最高需 Lv' + need +
    ' · 同期约 Lv' + lv + ' · 买不到：' + (bad.length ? bad.map(function (c) { return c.name; }).join('/') : '—'));
});

/* ---------- 4.5 设备回本 ---------- */
const fishPerE = evBait('dough', 'cloudy', 10, 4000).ev / 2;   // 1 点体力的钓鱼价值（算上饵）
console.log('\n== 设备回本（按 1 点体力 = ' + fishPerE.toFixed(2) + ' 金 折算）==');
const devRows = [
  ['渔网', G.NET_COST, netPerDay, 0],
  ['洒水器', G.SPRINKLER_COST, fishPerE - 3 / 7, 1],                 // 每天省 1 点浇水体力
  ['自动收获器(5 块地)', G.HARVESTER_COST, 1.25 * fishPerE - 5 / 7, 1.25],
  ['自动收获器(36 块地)', G.HARVESTER_COST, 9 * fishPerE - 5 / 7, 9]
];
devRows.forEach(function (r) {
  const days = r[1] / Math.max(0.1, r[2]);
  console.log('   ' + pad(r[0], 22) + r[1] + ' 金 · 每天赚 ' + r[2].toFixed(2) +
    ' 金 · 回本 ' + days.toFixed(0) + ' 天');
});

/* ---------- 5. 每天固定支出 ---------- */
function costs(maxEnergy, plots, sprinklers, nets, harvester) {
  const meal = Math.max(1, 3 + (maxEnergy - 10) / 5);
  const upkeep = Math.max(0, plots - G.BALANCE.upkeep.free) * G.BALANCE.upkeep.plotPerWeek +
    sprinklers * G.BALANCE.upkeep.sprinkle + nets * G.BALANCE.upkeep.net +
    (harvester ? G.BALANCE.upkeep.harvester : 0);
  return { meal: meal, upkeep: upkeep / 7 };
}

/* ---------- 6. 三种经营模型 ---------- */
function scenario(label, day, level, plots, energy, nets, sprinklers, harvester, cropId, coins) {
  const c = G.CROPS[cropId];
  const bonus = Math.floor(level / 5);
  const fert = !c.big && !c.multi;
  const qty = c.big ? 1 : (c.multi ? c.firstQty + c.regrowTimes * c.regrowQty : c.base + G.FERT.normal.add + bonus);
  const days = c.multi ? c.days + c.regrowTimes * c.regrowDays : c.days;
  const perPlotDay = (qty * c.price * qEV(fert ? 2 : 1) - c.seed - (fert ? G.FERT.normal.cost : 0)) / days;
  const co = costs(energy, plots, sprinklers, nets, harvester);
  const farmPerDay = plots * perPlotDay;
  /* 种田占用的体力：浇水按没被洒水器覆盖的地算，播种 + 收获按地块算 */
  const waterPerDay = Math.max(0, plots - sprinklers) * (days / days);
  const otherPerDay = plots * (1 + (c.multi ? c.regrowTimes + 1 : 1)) / days;
  const farmEnergy = waterPerDay + otherPerDay;
  const fishCasts = Math.floor(Math.max(0, energy - farmEnergy) / 2);
  const fishPerDay = fishCasts * (level >= 10 ? 6.73 : (level >= 5 ? 6.5 : 6.27));
  const netIncome = nets * netPerDay;
  const st = G.createState(); st.coins = coins; st.day = day;
  const tax = G.taxDue(st);
  const gross = farmPerDay + fishPerDay + netIncome;
  console.log('\n  ' + label + '（D' + day + ' · Lv' + level + ' · ' + plots + ' 地 · 体力 ' + energy +
    ' · 网 ' + nets + '）');
  console.log('   种田 ' + farmPerDay.toFixed(0) + '（耗体力 ' + farmEnergy.toFixed(0) + '）' +
    ' + 钓鱼 ' + fishPerDay.toFixed(0) + '（' + fishCasts + ' 杆）' +
    ' + 渔网 ' + netIncome.toFixed(0) + ' = 毛收入 ' + gross.toFixed(0) + ' 金/天');
  console.log('   伙食 ' + co.meal.toFixed(1) + ' + 维护 ' + co.upkeep.toFixed(1) +
    ' + 税 ' + (tax / 30).toFixed(1) + ' = 支出 ' + (co.meal + co.upkeep + tax / 30).toFixed(1) +
    ' → 净 ' + (gross - co.meal - co.upkeep - tax / 30).toFixed(0) + ' 金/天');
}

console.log('\n== 三种经营模型的日净收入 ==');
scenario('早期', 3, 1, 5, 15, 0, 0, false, 'carrot', 100);
scenario('中期', 20, 4, 15, 45, 3, 10, false, 'corn', 2000);
scenario('后期', 60, 8, 36, 100, 9, 36, true, 'eggplant', 15000);

/* ---------- 7. 委托 ---------- */
console.log('\n== 委托收益 ==');
[5, 20, 45, 75].forEach(function (day) {
  const lv = day < 10 ? 2 : (day < 30 ? 3 : (day < 60 ? 5 : 7));
  G.setRng(mulberry32(7));
  const st = G.createState(); st.day = day; st.levels.farm = lv;
  const os = G.makeOrders(st);
  const sum = os.reduce(function (a, o) { return a + o.reward; }, 0);
  console.log('   D' + pad(day, 3) + 'Lv' + lv + ' 三单合计 ' + sum + ' 金 · ' +
    os.map(function (o) { return o.name + '×' + o.qty + '(' + o.reward + ')'; }).join(' · '));
});
G.setRng(mulberry32(8));
const lo1 = G.makeLongOrder({ day: 45, levels: { farm: 5 } });
console.log('   长期订单样本：' + lo1.name + '×' + lo1.qty + ' → ' + lo1.reward +
  ' 金（5 天，约 ' + Math.round(lo1.reward / 5) + ' 金/天，2 倍价）');
const osFish = (function () {
  G.setRng(mulberry32(7));
  const st = G.createState(); st.day = 45; st.levels.farm = 5;
  return G.makeOrders(st).filter(function (o) { return o.kind === 'fish'; })[0];
})();
console.log('   鱼单：' + osFish.qty + ' 条 → ' + osFish.reward + ' 金（约 ' +
  Math.round(osFish.reward / osFish.qty) + ' 金/条，直接卖鱼约 7 金/条）');

/* ---------- 8. 维护费 ---------- */
console.log('\n== 维护费 ==');
[[10, 0, 0, 0], [20, 10, 3, 1], [36, 36, 9, 1]].forEach(function (row) {
  const plots = row[0], sp = row[1], nets = row[2], harv = !!row[3];
  const land = Math.max(0, plots - G.BALANCE.upkeep.free) * G.BALANCE.upkeep.plotPerWeek;
  const dev = sp * G.BALANCE.upkeep.sprinkle + nets * G.BALANCE.upkeep.net +
    (harv ? G.BALANCE.upkeep.harvester : 0);
  const week = land + dev;
  console.log('   ' + pad(plots + ' 地/' + sp + ' 洒水/' + nets + ' 网', 18) +
    '周费 ' + pad(week + ' 金', 8) + '= ' + (week / 7).toFixed(1) + ' 金/天' +
    '（土地 ' + land + ' + 设备 ' + dev + '）');
});
console.log('   土地 = (地块数 − 5) × 3/周；洒水器 3/周、渔网 3/周、收获器 5/周');
console.log('   参考：36 地图后期日毛收入约 1073，维护费占 ' +
  (233 / 7 / 1073 * 100).toFixed(1) + '%');
