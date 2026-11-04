/* 收益分析：node analysis.cjs
 * 把一个版本里所有赚钱途径换算成可比的单位：
 *   - 每点体力净收益（金/体力）
 *   - 每块地每天净收益（金/地/天）
 *   - 每日被动收益（渔网）
 * 再拼成早 / 中 / 后期三种经营模型的日净收入。
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
  const bonus = Math.floor(level / 4);
  return G.CROP_LIST.map(function (c) {
    const fert = !c.multi;                         // 大作物只吃肥料的品质加成
    const add = (fert && !c.big) ? G.FERT.normal.add : 0;
    const qty = c.multi ? c.firstQty + c.regrowTimes * c.regrowQty
                        : (c.big ? c.base : c.base + add + bonus);
    const rolls = fert ? 2 : 1;                    // 施肥后品质取两次较好
    const days = c.multi ? c.days + c.regrowTimes * c.regrowDays : c.days;
    const harvests = c.multi ? c.regrowTimes + 1 : 1;
    const energy = 1 + days + harvests;
    const gross = qty * c.price * qEV(rolls);
    const net = gross - c.seed - (fert ? G.FERT.normal.cost : 0);
    return { name: c.name, qty: qty, net: net, days: days, energy: energy,
             perE: net / energy, perDay: net / days, fert: fert };
  }).sort(function (a, b) { return b.perDay - a.perDay; });
}

console.log('== 种田：每块地每天的净收益 ==');
[1, 5, 8].forEach(function (lv) {
  const rows = farmRows(lv);
  console.log('\n  种田 Lv' + lv + '（产量 +' + Math.floor(lv / 5) + '）');
  rows.forEach(function (r) {
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
  else if (kind === 'lure2') s.lure2 = { owned: true, dur: 1e9 };
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
const baits = [['dough', '面团', 1], ['worm', '蚯蚓', 0], ['lure', '假饵', 0.25],
               ['lure2', '高级假饵', 20 / 100]];
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

/* 鱼汛：同一套期望，按季节各跑一遍（鱼汛期目标鱼权重 ×1，非汛期 ×0.3） */
function evBaitSeason(kind, day, level, n) {
  const s = G.createState();
  s.weather = 'cloudy'; s.maxEnergy = 1e9; s.coins = 0; s.day = day;
  s.levels.fish = level;
  if (kind === 'worm') s.bait.worm = 1e9;
  else s.bait.dough = 1e9;
  let sum = 0, bite = 0;
  for (let i = 0; i < n; i++) {
    s.energy = 1e9;
    s.levels.fishXp = 0; s.levels.fish = level;
    const r = G.fish(s, kind);
    if (r.entry) { bite++; sum += r.entry.price; }
  }
  return { ev: sum / n, bite: bite / n };
}
console.log('   鱼汛（面团饵 Lv1，每杆期望）：' + ['春', '夏', '秋'].map(function (nm, i) {
  G.setRng(mulberry32(7));
  const r = evBaitSeason('dough', 1 + i * 30, 1, 6000);
  return nm + ' ' + r.ev.toFixed(2);
}).join(' · ') + '（冬天不能钓）');
console.log('   鱼汛表：' + G.FISH.filter(function (f) { return f.seasons; })
  .map(function (f) { return f.name + ' ' + f.seasons.map(function (i) { return G.SEASONS[i]; }).join(''); })
  .join(' · '));

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
  ['收购箱', 1 - G.BALANCE.market.boxFee, '按入箱时市价锁价，睡觉结算'],
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
  ['自动收获器(36 块地)', G.HARVESTER_COST, 9 * fishPerE - 5 / 7, 9],
  /* 自动播种器：一台 5 块地，每晚省 5 点播种体力，每台每周 6 金 */
  ['自动播种器(1 台/5 块)', G.SEEDER_COST,
    5 * fishPerE - G.BALANCE.upkeep.seeder / 7, 5],
  ['自动播种器(4 台/20 块)', G.SEEDER_COST * 4,
    20 * fishPerE - G.BALANCE.upkeep.seeder * 4 / 7, 20]
];
devRows.forEach(function (r) {
  const days = r[1] / Math.max(0.1, r[2]);
  console.log('   ' + pad(r[0], 22) + r[1] + ' 金 · 每天赚 ' + r[2].toFixed(2) +
    ' 金 · 回本 ' + days.toFixed(0) + ' 天');
});

/* ---------- 5. 每天固定支出 ---------- */
function costs(maxEnergy, plots, sprinklers, nets, harvester, seeders) {
  const meal = Math.max(1, 3 + (maxEnergy - 10) / 5);
  const upkeep = G.plotUpkeep(plots) +
    sprinklers * G.BALANCE.upkeep.sprinkle + nets * G.BALANCE.upkeep.net +
    (harvester ? G.BALANCE.upkeep.harvester : 0) +
    (seeders || 0) * G.BALANCE.upkeep.seeder;
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
  const land = G.plotUpkeep(plots);
  const dev = sp * G.BALANCE.upkeep.sprinkle + nets * G.BALANCE.upkeep.net +
    (harv ? G.BALANCE.upkeep.harvester : 0);
  const week = land + dev;
  console.log('   ' + pad(plots + ' 地/' + sp + ' 洒水/' + nets + ' 网', 18) +
    '周费 ' + pad(week + ' 金', 8) + '= ' + (week / 7).toFixed(1) + ' 金/天' +
    '（土地 ' + land + ' + 设备 ' + dev + '）');
});
console.log('   土地：6–20 块 3 金/周、21–30 块 6 金/周、31 块以上 ' + G.BALANCE.upkeep.plotHigh + ' 金/周；' +
  '洒水器 3/周、收获器 5/周、渔网免费');
console.log('   参考：36 地图后期日毛收入约 1073，维护费占 ' +
  ((G.plotUpkeep(36) + 36 * 3 + 5) / 7 / 1073 * 100).toFixed(1) + '%');

/* ---------- 9. 市场价格 ---------- */
console.log('\n== 市场价格 ==');
console.log('   价格系数 = 供需 × 季节（鱼：汛期）');
console.log('   供需：1.30 - ' + G.BALANCE.market.cropStep + ' × 最近销量（作物）/ ' +
  G.BALANCE.market.fishStep + '（鱼），下限 0.70，睡觉回落 ' +
  Math.round((1 - G.BALANCE.market.decay) * 100) + '%；批量按批次中点定价');
console.log('   季节：当季 / 汛期 ×1.00 · 反季 / 非汛期 ×' + G.BALANCE.market.offSeason);
{
  const M = G.BALANCE.market;
  const supply = function (sold) { return Math.max(M.supplyMin, Math.min(M.supplyMax, M.supplyMax - M.cropStep * sold)); };
  console.log('   ' + pad('最近销量', 10) + pad('当季', 10) + pad('反季', 10) + '状态');
  [0, 3, 10, 20, 40].forEach(function (sold) {
    console.log('   ' + pad(sold + ' 件', 10) +
      pad((supply(sold) * 1.0).toFixed(2), 10) + pad((supply(sold) * M.offSeason).toFixed(2), 10) +
      G.marketTag(supply(sold)));
  });
  const e = G.CROPS.eggplant;
  const base = (e.base + 1) * e.price / e.days;   // Lv5 一株
  console.log('   例：茄子（Lv5，约 ' + base.toFixed(1) + ' 金/地/天）');
  console.log('     当季刚上市 ×' + M.supplyMax + ' → ' + (base * M.supplyMax).toFixed(1) +
    ' · 当季卖到饱和 ×' + M.supplyMin + ' → ' + (base * M.supplyMin).toFixed(1) +
    ' · 反季稀缺 ×' + (M.supplyMax * M.offSeason).toFixed(2) + ' → ' + (base * M.supplyMax * M.offSeason).toFixed(1));
  console.log('   鱼：' + M.supplyMax + ' - ' + M.fishStep + ' × 最近销量（下限 ' + M.supplyMin +
    '）→ 非汛期 ×' + M.offSeason + '，上限 ×' + (M.supplyMax * M.offSeason).toFixed(2));
  console.log('   商店进价 = 基准 × ' + G.BALANCE.shop.priceMul + ' × 市价 → 反季最贵时 ×' +
    (G.BALANCE.shop.priceMul * M.supplyMax * M.offSeason).toFixed(2));
}

/* ---------- 10. 反季种植 vs 当季 ---------- */
console.log('\n== 反季种植（种子 ×' + G.BALANCE.seed.offSeasonMul + '、慢 ' +
  G.BALANCE.seed.offSeasonDays + ' 天、少 ' + G.BALANCE.seed.offSeasonYield + ' 个、卖价 ×' +
  G.BALANCE.market.offSeason + '）==');
{
  /* 和上面的种田表同一套模型（Lv5 · 普通肥 · 品质取两次较好），只是换成反季参数 */
  const LV = 5;
  const bonus = Math.floor(LV / 4);
  function cycle(c, off) {
    const fert = !c.multi;
    const add = (fert && !c.big) ? G.FERT.normal.add : 0;
    const pen = off ? G.BALANCE.seed.offSeasonYield : 0;
    const slow = off ? G.BALANCE.seed.offSeasonDays : 0;
    const qty = c.multi
      ? Math.max(1, c.firstQty - pen) + c.regrowTimes * Math.max(1, c.regrowQty - pen)
      : (c.big ? c.base : Math.max(1, c.base + add + bonus - pen));
    const days = c.multi ? (c.days + slow) + c.regrowTimes * c.regrowDays
      : (c.big ? (off ? c.days * 2 : c.days) : c.days + slow);
    const seed = Math.ceil(c.seed * (off ? G.BALANCE.seed.offSeasonMul : 1));
    const gross = qty * c.price * (off ? G.BALANCE.market.offSeason : 1) * qEV(fert ? 2 : 1);
    const net = gross - seed - (fert ? G.FERT.normal.cost : 0);
    return { net: net, days: days, qty: qty };
  }
  const ids = ['chili', 'eggplant', 'tomato', 'corn', 'pumpkin', 'watermelon', 'strawberry', 'cucumber'];
  console.log('   ' + pad('作物', 6) + pad('当季 金/地/天', 16) + pad('反季 金/地/天', 16) + '变化');
  ids.forEach(function (id) {
    const c = G.CROPS[id];
    const a = cycle(c, false), b = cycle(c, true);
    const inPer = a.net / a.days, offPer = b.net / b.days;
    console.log('   ' + pad(c.name, 6) + pad(inPer.toFixed(1), 16) + pad(offPer.toFixed(1), 16) +
      '反季 ×' + (offPer / inPer).toFixed(2));
  });
  console.log('   注：反季收成必须在反季卖掉才吃得到 ×1.7；囤到当季卖就是当季价。');
}

/* ---------- 11. 渔网 ---------- */
console.log('\n== 渔网（' + G.NET_COST + ' 金/张，不缴维护费，抓完 1 体力重布）==');
{
  G.setRng(mulberry32(7));
  const doughNet = evBait('dough', 'cloudy', 1, 4000).ev - 1;   // 每杆净收益
  const perNet = G.NET_CHANCE * netEV - 1;                      // 每张网每天净收益（含 1 份饵）
  const netEnergy = G.NET_CHANCE * G.BALANCE.netReset.energy;    // 平均每天为这张网花的体力
  const perEnergy = perNet / netEnergy;
  console.log('   每张网每天期望 命中 ' + (G.NET_CHANCE * 100).toFixed(0) + '% × 期望 ' + netEV.toFixed(2) +
    ' − 1 饵 = 净 ' + perNet.toFixed(2) + ' 金');
  console.log('   折算到体力（每天平均 ' + netEnergy.toFixed(2) + ' 体力重布）：' + perEnergy.toFixed(2) +
    ' 金/体力 · 面团饵每杆 ' + (doughNet / 2).toFixed(2) + ' 金/体力 → 渔网更划算但每天封顶 9 条');
  console.log('   满配 9 张：每天约 ' + (9 * perNet).toFixed(1) + ' 金 · 耗 9 份饵 · 重布约 ' +
    (9 * G.NET_CHANCE).toFixed(1) + ' 体力 · 回本 ' +
    Math.round(G.NET_COST / perNet) + ' 天/张');
}

/* ---------- 12. 雇佣渔夫（有等级） ---------- */
console.log('\n== 雇佣渔夫（钓鱼 Lv' + G.BALANCE.gate.fisher + ' 解锁，每天 2+等级 杆）==');
{
  const F = G.BALANCE.fisher;

  /* 锁住等级测一整天：渔夫自己会升级，测的时候把经验压到负数 */
  function fisherDay(lv, tries) {
    const st = G.createState();
    st.fisher = { lv: lv, xp: -1e9 };
    st.levels.fish = 5;
    st.weather = 'cloudy'; st.day = 61;
    G.setRng(mulberry32(11));
    let got = 0, val = 0, casts = 0;
    for (let i = 0; i < tries; i++) {
      st.energy = 0;
      st.bait.dough = 1e9;
      const r = G.fisherCatch(st);
      casts = r.casts; got += r.got; val += r.value;
    }
    return { casts: casts, got: got / tries, value: val / tries };
  }

  console.log('   雇佣费 ' + F.hire + ' 金 · 工资 ' + F.wageBase + ' + ' + F.wageStep +
    '×(等级−1) · 花钱升级 ' + F.upCost + ' × 等级（满级 ' + F.max + '）');
  console.log('   ' + pad('Lv', 4) + pad('杆', 5) + pad('工资', 6) + pad('毛/天', 9) + pad('净/天', 9) +
    pad('累计投入', 10) + '回本');
  for (let lv = 1; lv <= F.max; lv++) {
    const d = fisherDay(lv, 1200);
    const wage = F.wageBase + F.wageStep * (lv - 1);
    const net = d.value - d.casts * 1 - wage;
    const cum = F.hire + F.upCost * (lv - 1) * lv / 2;
    console.log('   ' + pad('Lv' + lv, 4) + pad(d.casts + ' 杆', 5) + pad(wage + ' 金', 6) +
      pad(d.value.toFixed(1), 9) + pad(net.toFixed(1), 9) + pad(Math.round(cum) + ' 金', 10) +
      (net > 0 ? Math.round(cum / net) + ' 天' : '—'));
  }
  console.log('   升级需要 ' + F.needBase + ' + ' + F.needStep + '×(等级−1) 经验，每钓到 1 条 +1；');
  G.setRng(mulberry32(7));
  const perE = (evBait('dough', 'cloudy', 5, 2000).ev - 1) / 2;
  const resetVal = 9 * G.NET_CHANCE * G.BALANCE.netReset.energy * perE;
  console.log('   另外他每天免费重布渔网（省 ' + (9 * G.NET_CHANCE).toFixed(1) + ' 体力 ≈ ' +
    resetVal.toFixed(0) + ' 金），Lv1 算上这个约 ' + (10.5 + resetVal).toFixed(0) + ' 金/天');
}

/* ---------- 13. 采集 ---------- */
console.log('\n== 采集（' + G.BALANCE.forage.energy + ' 体力一次，按季节出不同野货）==');
{
  const qe = qEV(1);
  const avgQty = 1 + G.BALANCE.forage.qty2 + G.BALANCE.forage.qty3;
  const costLv1 = G.forageCost(G.createState());
  const maxSt = G.createState(); maxSt.levels.forage = G.BALANCE.level.max;
  const costMax = G.forageCost(maxSt);
  let best = null;
  G.WILD_LIST.forEach(function (w) {
    const per = w.price * qe * avgQty;
    const perE = per / costLv1;
    if (!best || perE > best.perE) best = { perE: perE, name: w.name };
    console.log('   ' + pad(w.name, 4) + pad(G.seasonText(w.id) + '季', 6) +
      pad(w.price + ' 金/件', 10) + '期望 ' + per.toFixed(1) + ' 金/次 · ' +
      perE.toFixed(2) + ' 金/体力（满级 ' + (per / costMax).toFixed(2) + '）');
  });
  console.log('   期望件数 ' + avgQty.toFixed(2) + '（保底 1 + ' +
    Math.round(G.BALANCE.forage.qty2 * 100) + '% 再来 1 + ' +
    Math.round(G.BALANCE.forage.qty3 * 100) + '% 再多 1）· 还有 ' +
    Math.round(G.BALANCE.forage.seedChance * 100) + '% 掉一颗当季种子');
  console.log('   体力：Lv1 ' + costLv1 + ' 点/次，采集满级（Lv' + G.BALANCE.level.max + '）' +
    costMax + ' 点/次；经验每次 +' + G.BALANCE.forage.xp + '（采到 3 件 +1）');
  console.log('   最好的季节是「' + best.name + '」' + best.perE.toFixed(2) +
    ' 金/体力（满级 ' + (best.perE * costLv1 / costMax).toFixed(2) + '）· 面团饵钓鱼（Lv10）约 ' +
    ((evBait('dough', 'cloudy', 10, 4000).ev - 1) / 2).toFixed(2) +
    ' 金/体力 → 采集是最强的体力出口（冬天也能用）');
}

/* ---------- 14. 小镇（金币出口） ---------- */
console.log('\n== 小镇捐赠（后期金币出口）==');
{
  let total = 0, prev = 0;
  G.BALANCE.town.forEach(function (t) {
    total = t.need;
    console.log('   ' + t.emoji + ' ' + pad(t.name, 6) + '捐满 ' + pad(t.need + ' 金', 8) +
      '（本档 ' + (t.need - prev) + ' 金）→ ' + t.desc);
    prev = t.need;
  });
  console.log('   三档捐满共 ' + total + ' 金 —— 36 块地图后期日净约 1000，约 ' +
    Math.ceil(total / 1000) + ' 天存款就能买完');
  console.log('   加成：委托 +5% / 商店进价 −10% / 买卖市价 +8%（可叠加）');
}

/* ---------- 15. 果园 ---------- */
console.log('\n== 果园（种田 Lv' + G.BALANCE.orchard.unlockLv + ' + ' + G.BALANCE.orchard.unlockCost +
  ' 金开垦，先 ' + G.BALANCE.orchard.free + ' 个树坑）==');
{
  const O = G.BALANCE.orchard;
  const S = ['春', '夏', '秋', '冬'];
  const off = G.BALANCE.market.offSeason;
  const fresh = G.BALANCE.market.supplyMax;
  const DAYS = 120;                       // 一年 = 4 季 × 30 天
  const avgFruit = (O.fruitMin + O.fruitMax) / 2;
  console.log('   产量：当季每天随机 ' + O.fruitMin + '–' + O.fruitMax + ' 个/棵，期望 ' + avgFruit.toFixed(1) + ' 个；卖价：收购箱按次日市价 ×95% 结算，当季刚上市 ×' + fresh + '，囤到反季 ×' +
    (fresh * off).toFixed(2) + '（每季只产 30 天，囤起来卖得掉吗？见文末）');
  const list = G.TREE_LIST.map(function (t) {
    const perDay = avgFruit * t.price;
    const season = perDay * 30;
    return { t: t, perDay: perDay, season: season, offSeason: Math.round(season * off) };
  });
  list.forEach(function (x) {
    console.log('   ' + pad(x.t.name, 4) + ' ' + S[x.t.season] + '季 · 种子 ' + pad(x.t.seed + ' 金', 6) +
      ' / 树苗 ' + pad(x.t.sapling + ' 金', 7) + ' · 当季 ' + pad(x.perDay + ' 金/天', 9) +
      ' · 一季 ' + pad(x.season + ' 金', 6) + '（囤到反季 ' + pad(x.offSeason + ' 金', 6) + '）');
  });
  const saplingSum = list.reduce(function (n, x) { return n + x.t.sapling; }, 0);
  const seedSum = list.reduce(function (n, x) { return n + x.t.seed; }, 0);
  const avgPerTreeDay = list.reduce(function (n, x) { return n + x.season; }, 0) / list.length / DAYS;
  const avg3Day = list.reduce(function (n, x) { return n + x.season; }, 0) / DAYS;
  const inv3 = O.unlockCost + saplingSum;
  console.log('   起步（3 个免费坑各一棵树苗）：' + inv3 + ' 金 · 3 棵合计 ' + Math.round(avg3Day) +
    ' 金/天（每棵 ' + avgPerTreeDay.toFixed(1) + '）· 回本约 ' + Math.ceil(inv3 / avg3Day) + ' 天');

  // 单棵树苗的回本：一次栽下，之后每年只产 30 天
  console.log('   单棵回本（按当季卖）：');
  list.forEach(function (x) {
    console.log('      ' + pad(x.t.name, 4) + '树苗 ' + pad(x.t.sapling + ' 金', 5) + ' vs 一季 ' +
      pad(x.season + ' 金', 6) + ' → ' +
      (x.t.sapling <= x.season
        ? '赶上当季就能回本（约 ' + Math.ceil(x.t.sapling / x.perDay) + ' 天产量）'
        : '要两季') +
      '；种子 ' + pad(x.t.seed + ' 金', 4) + ' → 先育苗 ' + O.grow.seed.days + ' 天');
  });

  // 每个树坑的边际收益：开坑价 + 一棵树苗，收入按平均树算
  const avgSeason = list.reduce(function (n, x) { return n + x.season; }, 0) / list.length;
  console.log('   树坑边际（开坑金 + 树苗 ~' + Math.round(saplingSum / list.length) +
    '，年收入 ~' + Math.round(avgSeason) + ' 金）：');
  const startSlot = O.free + 1;
  O.slotCosts.forEach(function (c, i) {
    const cost = c + saplingSum / list.length;
    console.log('      第 ' + (startSlot + i) + ' 个坑 ' + pad(c + ' 金', 6) + ' → 总投入 ' +
      pad(Math.round(cost) + ' 金', 6) + ' · 回本 ' + Math.ceil(cost / avgSeason * DAYS) + ' 天');
  });

  // 满配
  const treeCount = { peach: 3, mango: 3, apple: 2 };
  let yearIn = 0, yearOff = 0, trees = 0;
  list.forEach(function (x) {
    const n = treeCount[x.t.id] || 0;
    trees += n; yearIn += n * x.season; yearOff += n * x.offSeason;
  });
  const invest = O.unlockCost + O.slotCosts.reduce(function (a, b) { return a + b; }, 0) +
    list.reduce(function (n, x) { return n + (treeCount[x.t.id] || 0) * x.t.sapling; }, 0);
  console.log('   满配 ' + trees + ' 棵（桃 3 / 芒果 3 / 苹果 2，全树苗）：投入 ' + invest +
    ' 金 · 当季卖年入 ' + yearIn + ' 金（' + Math.round(yearIn / DAYS) + ' 金/天）· 回本 ' +
    Math.ceil(invest / (yearIn / DAYS)) + ' 天');
  console.log('     囤到反季卖：年入 ' + yearOff + ' 金（' + Math.round(yearOff / DAYS) +
    ' 金/天）· 回本 ' + Math.ceil(invest / (yearOff / DAYS)) + ' 天');
  console.log('   种子路线：三棵合计 ' + seedSum + ' 金（树苗 ' + saplingSum + '，省 ' +
    Math.round((1 - seedSum / saplingSum) * 100) + '%）· 浇水 ' + O.grow.seed.water +
    ' 天 + 生长 ' + O.grow.seed.days + ' 天');
  console.log('   体力：种子 30 点 / 树苗 15 点育苗浇水；收获 1 点/棵（攒到季末一次收）');
  console.log('   对比：农田 1 块地约 10~26 金/天；果园 1 个坑（当季卖）约 ' +
    Math.round(avgSeason / DAYS) + ' 金/天，约半块地');
  console.log('   ⚠️ 水果按季节算市价：当季 ×' + fresh + '、反季 ×' + (fresh * off).toFixed(2) +
    '，囤一季 60 个到反季卖，单棵年收入从 ' + Math.round(avgSeason) + ' 涨到 ' +
    Math.round(avgSeason * off) + ' 金');
}

/* ---------- 16. 钓鱼专项 ---------- */
console.log('\n== 钓鱼专项 ==');
{
  const KIND_LABEL = { dough: '面团饵', worm: '蚯蚓', lure: '假饵', lure2: '高级假饵' };
  const KIND_COST = { dough: 1, worm: 0, lure: G.BALANCE.lure.price / G.BALANCE.lure.dur,
                      lure2: G.BALANCE.lure2.price / G.BALANCE.lure2.dur };

  /* 一次模拟：咬钩率、毛收益、杂物/宝箱/鱼各多少 */
  function sim(kind, level, weather, day, n) {
    const s = G.createState();
    s.weather = weather; s.day = day; s.maxEnergy = 1e9; s.coins = 0;
    s.levels.fish = level;
    if (kind === 'worm') s.bait.worm = 1e9;
    else if (kind === 'dough') s.bait.dough = 1e9;
    else if (kind === 'lure2') s.lure2 = { owned: true, dur: 1e9 };
    else s.lure = { owned: true, dur: 1e9 };
    let sum = 0, bite = 0, fishN = 0, junkN = 0, chestV = 0;
    const chest = { wood: 0, iron: 0, gold: 0 };
    for (let i = 0; i < n; i++) {
      s.energy = 1e9;
      s.levels.fishXp = 0; s.levels.fish = level;
      const r = G.fish(s, kind);
      if (!r.entry) continue;
      bite++; sum += r.entry.price;
      if (r.entry.chest) { chest[r.entry.chest]++; chestV += r.entry.price; }
      else if (r.entry.trash) junkN++;
      else fishN++;
    }
    return { ev: sum / n, bite: bite / n, casts: n,
             fish: fishN / n, junk: junkN / n, chestV: chestV / n, chest: chest };
  }

  /* 1) 每杆净收益：4 种饵 × 3 个等级 */
  console.log('   ① 每杆净收益（阴天，扣饵成本；体力按 2 金/点另算）');
  console.log('   ' + pad('饵', 10) + pad('Lv1', 9) + pad('Lv5', 9) + pad('Lv10', 9) +
    pad('饵成本/杆', 11) + 'Lv10 金/体力');
  const sum1 = {}, sum10 = {};
  [['dough', 1], ['worm', 0], ['lure', 0.25], ['lure2', 0.8]].forEach(function (b) {
    G.setRng(mulberry32(7));
    const l1 = sim(b[0], 1, 'cloudy', 31, 6000);
    G.setRng(mulberry32(7));
    const l5 = sim(b[0], 5, 'cloudy', 31, 6000);
    G.setRng(mulberry32(7));
    const l10 = sim(b[0], 10, 'cloudy', 31, 6000);
    const net = function (r) { return r.ev - KIND_COST[b[0]]; };
    sum1[b[0]] = net(l1);
    sum10[b[0]] = net(l10);
    console.log('   ' + pad(KIND_LABEL[b[0]], 10) + pad(net(l1).toFixed(2), 9) +
      pad(net(l5).toFixed(2), 9) + pad(net(l10).toFixed(2), 9) +
      pad(KIND_COST[b[0]].toFixed(2), 11) + (net(l10) / 2).toFixed(2));
  });

  /* 2) 宝箱：掉率与开箱净收益 */
  G.setRng(mulberry32(9));
  const c10 = sim('dough', 10, 'cloudy', 31, 20000);
  const c1 = sim('dough', 1, 'cloudy', 31, 20000);
  const chestNames = { wood: '木制', iron: '铁制', gold: '黄金' };
  console.log('   ② 宝箱（面团饵，每 1000 杆）');
  ['wood', 'iron', 'gold'].forEach(function (k) {
    const per1000 = c10.chest[k] / 20;
    console.log('   ' + pad(chestNames[k] + '宝箱', 8) + pad(per1000.toFixed(1) + ' 个', 9) +
      'Lv1 ' + (c1.chest[k] / 20).toFixed(1) + ' 个 · 回收 ' + G.CHESTS[k].value + ' 金/个');
  });
  console.log('   宝箱回收价值合计 ' + c10.chestV.toFixed(2) + ' 金/杆（不含开箱收益）');
  console.log('   开箱：木箱 10~26（均 18）· 铁箱物资约 70 金但钥匙 40 → 基本持平；' +
    '金箱 200~320 + 高级物品，钥匙 120 → 净赚约 70~90');

  /* 3) 各玩法 1 点体力能换多少金 */
  const farmBest = farmRows(5).slice().sort(function (a, b) { return b.perE - a.perE; })[0];
  const rows = [
    ['打零工（全天）', G.WORK_RATE_FULL, '稳，每天一次'],
    ['钓鱼 面团饵 Lv1', sum1.dough / 2, '还要 2 体力/杆'],
    ['钓鱼 面团饵 Lv10', sum10.dough / 2, ''],
    ['钓鱼 高级假饵 Lv10', sum10.lure2 / 2, '最强饵'],
    ['采集 松茸（秋）', 24 * qEV(1) * (1 + G.BALANCE.forage.qty2 + G.BALANCE.forage.qty3) /
      G.BALANCE.forage.energy, '5 体力/次'],
    ['种田 ' + farmBest.name + '（Lv5）', farmBest.perE, '折算到体力']
  ];
  rows.sort(function (a, b) { return b[1] - a[1]; });
  console.log('   ③ 1 点体力的价值排行');
  rows.forEach(function (r) {
    console.log('   ' + pad(r[0], 20) + pad(r[1].toFixed(2) + ' 金', 10) + r[2]);
  });

  /* 4) 升级速度 */
  let need = 0;
  for (let l = 1; l < G.BALANCE.level.max; l++) need += G.levelNeed(l);
  const castsNeed = need * 2;
  console.log('   ④ 钓鱼 Lv1 → Lv' + G.BALANCE.level.max + '：' + need + ' 经验 ≈ ' + castsNeed +
    ' 杆（每 2 杆 1 点，完美品质 +2）');
  console.log('      开局 15 体力每天 7 杆 → 约 ' + Math.ceil(castsNeed / 7) +
    ' 天；体力拉到 40 每天 20 杆 → 约 ' + Math.ceil(castsNeed / 20) + ' 天');
  console.log('      每级咬钩 +1.1%（封顶 +10%）、好鱼 +2.5%（封顶 +22.5%）：' +
    '从 Lv1 到满级，每杆毛收益约 +' +
    (((sim('dough', 10, 'cloudy', 31, 6000).ev / sim('dough', 1, 'cloudy', 31, 6000).ev) - 1) * 100).toFixed(0) + '%');

  /* 5) 结论用数据 */
  console.log('   ⑤ 现状：Lv10 面团饵每杆净 ' + sum10.dough.toFixed(2) + '（' +
    (sum10.dough / 2).toFixed(2) + ' 金/体力），空竿率 ' + ((1 - c10.bite) * 100).toFixed(0) +
    '%；Lv1 只有 ' + (sum1.dough / 2).toFixed(2) + ' 金/体力 —— 比打零工（2.00）高，比采集（松茸 10.39）低');
}

/* ---------- 16. 交易等级 ---------- */
console.log('\n== 交易等级（买卖成交额换经验）==');
{
  const T = G.BALANCE.trade;
  const need = function (lv) { return G.levelNeed(lv, 'trade'); };
  let cumXp = 0, cumGold = 0;
  console.log('   每 ' + T.xpPer + ' 金交易额 = 1 经验 · 每级进价 −' +
    (T.buyCut * 100).toFixed(1) + '%（封顶 −' + (T.maxCut * 100).toFixed(1) + '%）');
  console.log('   ' + pad('等级', 6) + pad('升级需经验', 12) + pad('累计经验', 10) +
    pad('累计交易额', 12) + '进价折扣');
  for (let lv = 1; lv < G.BALANCE.level.max; lv++) {
    const n = need(lv);
    cumXp += n; cumGold = cumXp * T.xpPer;
    console.log('   ' + pad('Lv' + lv + '→' + (lv + 1), 6) + pad(n + ' 点', 12) +
      pad(cumXp + ' 点', 10) + pad(cumGold + ' 金', 12) +
      '−' + (Math.min(T.maxCut, lv * T.buyCut) * 100).toFixed(1) + '%');
  }
  const maxCut = 1 - T.maxCut;
  const s1 = G.createState(), s10 = G.createState();
  s10.levels.trade = G.BALANCE.level.max;
  console.log('   参考：西瓜种子 ' + G.seedBuyPrice(G.CROPS.watermelon, s1) + ' → ' +
    G.seedBuyPrice(G.CROPS.watermelon, s10) + ' 金 · 鲈鱼 ' +
    G.fishBuyPrice('bass', s1) + ' → ' + G.fishBuyPrice('bass', s10) + ' 金/条');
  console.log('   解锁：高级假饵要交易 Lv' + G.BALANCE.gate.lure2Trade + '（' +
    (need(1) + need(2)) * T.xpPer + ' 金交易额）· 金钥匙要交易 Lv' +
    G.BALANCE.gate.goldKeyTrade + '（' + (need(1) + need(2) + need(3)) * T.xpPer + ' 金）');
  console.log('   满级进价系数 ' + maxCut.toFixed(3) + '（' + ((1 - maxCut) * 100).toFixed(1) + '% off）');
}

/* ---------- 17. 成就 ---------- */
console.log('\n== 成就（' + G.ACH.length + ' 项）==');
{
  function rewardGold(r) {
    r = r || {};
    let v = r.coins || 0;
    Object.keys(r.seeds || {}).forEach(function (id) { v += (G.CROPS[id] ? G.CROPS[id].seed : 0) * r.seeds[id]; });
    Object.keys(r.ferts || {}).forEach(function (id) { v += (G.FERT[id] ? G.FERT[id].cost : 0) * r.ferts[id]; });
    Object.keys(r.bait || {}).forEach(function (id) { v += (id === 'worm' ? 3 : 1) * r.bait[id]; });
    Object.keys(r.teas || {}).forEach(function (id) { v += (G.TEAS[id] ? G.TEAS[id].price : 0) * r.teas[id]; });
    Object.keys(r.keys || {}).forEach(function (id) { v += (G.KEYS[id] ? G.KEYS[id].price : 0) * r.keys[id]; });
    return v;
  }
  const cats = Object.keys(G.ACH_CATS);
  let totalPts = 0, totalGold = 0, totalItems = 0;
  console.log('   ' + pad('分类', 10) + pad('项数', 6) + pad('点数', 6) +
    pad('现金', 8) + pad('物资折价', 10) + '合计');
  cats.forEach(function (cat) {
    const items = G.ACH.filter(function (a) { return a.cat === cat; });
    if (!items.length) return;
    let pts = 0, gold = 0, itemsVal = 0;
    items.forEach(function (a) {
      pts += a.pts || 0;
      const r = a.reward || {};
      gold += r.coins || 0;
      itemsVal += rewardGold(r) - (r.coins || 0);
    });
    totalPts += pts; totalGold += gold; totalItems += itemsVal;
    console.log('   ' + pad(G.ACH_CATS[cat], 10) + pad(items.length, 6) + pad(pts, 6) +
      pad(gold, 8) + pad(Math.round(itemsVal), 10) + Math.round(gold + itemsVal) + ' 金');
  });
  console.log('   合计 ' + totalPts + ' 点 · 奖励约 ' + Math.round(totalGold + totalItems) + ' 金（现金 ' +
    totalGold + ' + 物资 ' + Math.round(totalItems) + '）');
  const capPts = 200;
  console.log('   售价加成：每 10 点 +1%，封顶 +20%，需要 ' + capPts + ' 点 —— 现有 ' + totalPts +
    ' 点，' + (totalPts >= capPts ? '刚好够满' : '全解锁也只有 +' + Math.min(20, Math.floor(totalPts / 10)) + '%'));

  /* 设备 / 采集等新分类的占比 */
  const byCat = {};
  G.ACH.forEach(function (a) { byCat[a.cat] = (byCat[a.cat] || 0) + 1; });
  console.log('   分类占比：' + Object.keys(byCat).map(function (k) {
    return G.ACH_CATS[k] + ' ' + byCat[k] + ' 项';
  }).join(' · '));

  /* 最值钱的 5 项 */
  const rich = G.ACH.slice().sort(function (a, b) { return rewardGold(b.reward) - rewardGold(a.reward); }).slice(0, 5);
  console.log('   奖励最厚的 5 项：');
  rich.forEach(function (a) {
    console.log('   ' + pad(a.emoji + ' ' + a.name, 12) + pad(a.pts + ' 点', 6) +
      pad(Math.round(rewardGold(a.reward)) + ' 金', 9) + '（' + a.desc + '）');
  });
  /* 最容易顺手拿到的 6 项（goal 很小） */
  const easy = G.ACH.filter(function (a) { return a.goal <= 5; }).slice(0, 6);
  console.log('   顺手就能拿的低门槛项：' + easy.map(function (a) { return a.emoji + a.name + '(' + a.goal + ')'; }).join(' · '));
}

/* ---------- 12. 其他活动的收益 ---------- */
console.log('\n== 其他活动收益（每体力 / 每天）==');
{
  const B = G.BALANCE;
  const q = 1.03;                                   // 平均品质倍率（不用肥）
  const line = function (name, gold, energy, note) {
    const per = energy ? (gold / energy).toFixed(2) + ' 金/体力' : '—';
    console.log('   ' + pad(name, 16) + pad(gold.toFixed(1) + ' 金', 10) + pad(per, 14) + (note || ''));
  };

  line('打零工（全天）', B.start.maxEnergy * B.work.full, B.start.maxEnergy, '每天 1 次');
  [1, 4, 8].forEach(function (lv) {
    const ev = (B.dig.min + B.dig.max) / 2 + Math.floor(lv / B.dig.yieldAt);
    line('挖蚯蚓 Lv' + lv, ev * B.dig.value, B.dig.energy, '期望 ' + ev + ' 条');
  });
  const avgWild = G.WILD_LIST.reduce(function (a, w) { return a + w.price; }, 0) / G.WILD_LIST.length;
  const evQty = 1 + B.forage.qty2 + B.forage.qty3;
  line('采集 Lv1', evQty * avgWild * q, B.forage.energy, '期望 ' + evQty.toFixed(2) + ' 件 · 均 ' + avgWild.toFixed(1) + ' 金');
  const fishEV = G.FISH.filter(function (f) { return !f.trash && !f.chest; })
    .reduce(function (a, f) { return a + f.w * f.base * q; }, 0) /
    G.FISH.filter(function (f) { return !f.trash && !f.chest; }).reduce(function (a, f) { return a + f.w; }, 0);
  line('渔网（每张）', G.NET_CHANCE * fishEV - B.lure.price, G.NET_CHANCE * B.netReset.energy,
    '每天 1 份面团饵');
  [3, G.BALANCE.fisher.max].forEach(function (lv) {
    const casts = B.fisher.baseCasts + lv;
    const wage = B.fisher.wageBase + B.fisher.wageStep * (lv - 1);
    line('渔夫 Lv' + lv, casts * (fishEV - B.lure.price) - wage, 0, casts + ' 杆 / 天，工资 ' + wage);
  });
  G.TREE_LIST.forEach(function (t) {
    const perDay = (B.orchard.fruitMin + B.orchard.fruitMax) / 2;
    line(t.emoji + ' ' + t.name, perDay * t.price, 0,
      '当季 ' + perDay + ' 个/天 · 一季 ' + Math.round(perDay * B.seasonDays * t.price) + ' 金 · 树苗 ' + t.sapling);
  });
}
