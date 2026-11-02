/* 逻辑自测：node selftest.cjs */
const G = require('./game.js');

let pass = 0, fail = 0;
function ok(cond, label, extra) {
  if (cond) { pass++; console.log('  ✅ ' + label); }
  else { fail++; console.log('  ❌ ' + label + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
}
function section(t) { console.log('\n== ' + t + ' =='); }

/* 可复现随机 */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* ---------- 1. 播种 / 浇水 / 次日收获 ---------- */
section('播种 · 浇水 · 次日收获');
G.setRng(mulberry32(7));
let s = G.createState();
ok(s.coins === 50 && s.energy === 15 && s.plots.length === 5, '初始状态 50 金/15 体力/5 块地');

let r = G.plant(s, 0, 'carrot');
ok(!r.ok, '没有种子不能播种', r.msg);

let bsr = G.buySeed(s, 'carrot', 1);
ok(bsr.ok && s.coins === 45 && s.seeds.carrot === 1, '种子店买 1 颗萝卜种子：-5 金', { coins: s.coins, seeds: s.seeds });

r = G.plant(s, 0, 'carrot');
ok(r.ok && s.energy === 14 && s.coins === 45 && !s.seeds.carrot, '播种只扣 1 颗种子 + 1 体力，不扣金币', { coins: s.coins, energy: s.energy, seeds: s.seeds });

r = G.water(s, 0);
ok(r.ok && s.plots[0].growth === 1, '浇水 +1 天');

r = G.water(s, 0);
ok(!r.ok, '同一天不能重复浇水');

r = G.sleep(s);
ok(s.day === 2 && s.coins === 41 && s.energy === 15, '睡觉：第 2 天、扣伙食 4 金、体力回满', { day: s.day, coins: s.coins, energy: s.energy });

// 雨天会自动浇水，避免干扰：强制晴天
s.weather = 'sunny';
r = G.water(s, 0);
ok(s.plots[0].phase === 'ripe', '浇满 2 天 → 成熟');
r = G.harvest(s, 0);
ok(!r.ok, '成熟当天不能收（次日才能收）', r.msg);

r = G.sleep(s);
s.weather = 'sunny';
r = G.harvest(s, 0);
ok(r.ok && r.qty >= 1, '次日可收获', r);
ok(G.storeCount(s, 'carrot') === r.qty && s.store.carrot[r.quality.id] === r.qty, '收获进仓库（按品质分桶）');

r = G.sellAll(s);
ok(r.ok && G.storeCount(s, 'carrot') === 0, '卖出清空仓库');
ok(s.coins > 42, '卖出后金币增加', s.coins);

/* ---------- 2. 漏浇减产 ---------- */
section('漏浇减产');
G.setRng(mulberry32(11));
s = G.createState();
s.seeds = { potato: 1 };
G.plant(s, 0, 'potato');
G.sleep(s); // 没浇水 → missed
s.weather = 'sunny';
ok(s.plots[0].missed === 1, '漏浇一天 → missed=1', s.plots[0].missed);
const exp = G.expectedYield(s, s.plots[0]);
ok(exp === Math.max(1, 3 - 1), '预计产量扣除漏浇', exp);

/* ---------- 3. 多收作物 ---------- */
section('黄瓜 / 草莓 多次收获');
G.setRng(mulberry32(3));
s = G.createState();
s.coins = 999;
s.seeds = { cucumber: 1 };
G.plant(s, 0, 'cucumber');
for (let d = 0; d < 3; d++) { s.energy = 10; G.water(s, 0); if (d < 2) { s.weather = 'sunny'; G.sleep(s); } }
s.plots[0].ripeDay = s.day - 1;
let r1 = G.harvest(s, 0);
ok(r1.ok && r1.qty === 2, '黄瓜首收 2 个', r1);
ok(s.plots[0].phase === 'regrow', '首收后进入再生期');
/* 再生 2 天 → 收 → 再生 2 天 → 收 → 之后清空 */
for (let cycle = 0; cycle < 2; cycle++) {
  s.energy = 10;
  for (let d = 0; d < 2; d++) { G.water(s, 0); if (d < 1) { s.weather = 'sunny'; G.sleep(s); } }
  s.plots[0].ripeDay = s.day - 1;
  const rr = G.harvest(s, 0);
  ok(rr.ok && rr.qty === 2, '第 ' + (cycle + 2) + ' 次收 2 个', rr);
}
ok(!s.plots[0].crop, '收满 3 次后地块清空');

/* ---------- 3b. 留种：多收作物只在最后一收判定 ---------- */
section('留种规则');
G.setRng(() => 0.05);                     // 必定触发 30% 留种
s = G.createState();
s.coins = 999;
s.seeds = { cucumber: 1 };
G.plant(s, 0, 'cucumber');
const harvestNow = () => {
  s.energy += 1;
  s.plots[0].phase = 'ripe';
  s.plots[0].ripeDay = s.day - 1;
  return G.harvest(s, 0);
};
let hs = harvestNow();
ok(hs.ok && !hs.seed && !s.seeds.cucumber, '黄瓜第 1 收不留种', { seed: hs.seed, seeds: s.seeds });
hs = harvestNow();
ok(hs.ok && !hs.seed && !s.seeds.cucumber, '黄瓜第 2 收不留种', { seed: hs.seed, seeds: s.seeds });
hs = harvestNow();
ok(hs.ok && hs.seed === true && s.seeds.cucumber === 1, '黄瓜第 3 收（最后一收）留种 +1', { seed: hs.seed, seeds: s.seeds });

s = G.createState();
s.coins = 999;
s.seeds = { carrot: 1 };
G.plant(s, 0, 'carrot');
s.plots[0].growth = 2;
const rs = harvestNow();
ok(rs.ok && rs.seed === true && s.seeds.carrot === 1, '单收作物照常 30% 留种', { seed: rs.seed, seeds: s.seeds });

/* ---------- 4. 钓鱼 ---------- */
section('钓鱼 / 品质 / 入仓');
G.setRng(mulberry32(99));
s = G.createState();
s.bait.worm = 1000; s.energy = 30; s.maxEnergy = 30;
const coinsAtStart = s.coins;
let total = 0, casts = 0, trash = 0, empties = 0;
for (let i = 0; i < 200; i++) {
  s.energy = 10;                 // 每杆补满体力，只测钓鱼本身
  const fr = G.fish(s, 'worm');
  if (!fr.ok) break;
  casts++;
  if (fr.empty) { empties++; continue; }
  total += fr.entry.price;
  if (fr.entry.trash) trash++;
}
ok(casts === 200, '连甩 200 杆全部成功', casts);
ok(total > 0 && Number.isFinite(total), '渔获总价值为正数', total);
ok(s.coins === coinsAtStart, '钓鱼不再直接给钱，渔获先入仓库', s.coins);
ok(s.fishBag.length === 200 - empties, '渔获进 fishBag（空竿不算）', s.fishBag.length);
ok(s.fishBook.count === 200 - empties, '钓鱼记录本计数正确', s.fishBook.count);
ok(s.fishBook.best && s.fishBook.priciest, '最高品质/最贵鱼已记录');
ok(trash > 0 && trash < 200, '垃圾与鱼都有（' + trash + ' 条垃圾）');
ok(s.energy === 0 - 0 || s.energy >= 0, '体力不为负', s.energy);

/* 垃圾不带品质、固定 1 金 */
const junkEntries = s.fishBook.entries.filter(e => e.trash);
const junkOk = junkEntries.length > 0 && junkEntries.every(e =>
  e.quality === null && e.price === 1 && ['易拉罐', '旧靴子', '水草'].includes(e.fish));
ok(junkOk, '垃圾无品质、固定 1 金、名字来自三种杂物', junkEntries.slice(0, 2));
const fishWithoutQuality = s.fishBook.entries.filter(e => !e.trash).every(e => e.quality && e.quality.mul);
ok(fishWithoutQuality, '非垃圾鱼都带品质');

/* 卖鱼 */
const bagBefore = s.fishBag.slice();
const soldAll = G.sellAllFish(s);
ok(soldAll.ok && soldAll.income === total && s.coins === coinsAtStart + total && s.fishBag.length === 0,
   '全部卖鱼：金币 = 初始 + 渔获总值', { gain: soldAll.income, coins: s.coins });

/* 分组出售 */
s.bait.worm = 100;
let got12 = 0;
for (let i = 0; i < 60 && got12 < 12; i++) {
  s.energy = 10;
  const rr = G.fish(s, 'worm');
  if (rr.ok && rr.entry) got12++;
}
const groups = G.fishGroups(s);
ok(groups.length >= 1 && groups.reduce((n, g) => n + g.count, 0) === 12, '渔获按鱼种+品质分组', groups.length);
const g0 = groups[0], coinsBeforeGroup = s.coins;
const rGroup = G.sellFishGroup(s, g0.key);
ok(rGroup.ok && s.coins === coinsBeforeGroup + g0.v * g0.count && s.fishBag.length === 12 - g0.count,
   '卖一组鱼结算正确', { key: g0.key, gain: rGroup.income });

/* 全部卖出（作物 + 渔获） */
s = G.createState();
s.bait.worm = 20; G.addStore(s, 'carrot', 'std', 2);
for (let i = 0; i < 3; i++) { s.energy = 10; G.fish(s, 'worm'); }
const beforeAll = s.coins;
const rAll = G.sellAll(s);
ok(rAll.ok && s.coins === beforeAll + 8 && s.fishBag.length > 0 && Object.keys(s.store).length === 0,
   '仓库「全部卖出」只卖作物，渔获留给水产店', { coins: s.coins - beforeAll, fish: s.fishBag.length });

/* 天气只影响上钩概率，不影响售价 */
section('天气 → 上钩概率');
const wIds = Object.keys(G.WEATHER);
ok(wIds.length === 3 && !wIds.includes('storm'), '天气只有 晴/阴/雨 三种', wIds);
ok(G.WEATHER.sunny.w + G.WEATHER.cloudy.w + G.WEATHER.rain.w === 100, '天气概率合计 100%',
   [G.WEATHER.sunny.w, G.WEATHER.cloudy.w, G.WEATHER.rain.w]);
ok(G.WEATHER.sunny.hookMod === -0.12 && G.WEATHER.cloudy.hookMod === 0 && G.WEATHER.rain.hookMod === 0.08,
   '天气改成影响咬钩率：晴 -12% / 阴 0 / 雨 +8%');
ok(!('fishMul' in G.WEATHER.rain), '天气不再带售价系数');

/* 蚯蚓只影响品质与上钩，不影响售价 */
const wormEntry = (function () {
  const st = G.createState();
  st.bait.worm = 500; st.energy = 1e6; st.maxEnergy = 1e6;
  G.setRng(mulberry32(31));
  for (let i = 0; i < 200; i++) {
    const r = G.fish(st, 'worm');
    if (r.ok && r.entry && !r.entry.trash) return r.entry;
  }
  return null;
})();
ok(!!wormEntry && wormEntry.price === Math.round(
     G.FISH.filter(function (f) { return f.name === wormEntry.fish; })[0].base * wormEntry.quality.mul),
   '蚯蚓不再给售价加成（售价 = 基础价 × 品质）', wormEntry && wormEntry.price);

function sampleValues(weather) {
  const st = G.createState();
  st.maxEnergy = 1e6; st.coins = 0;
  st.bait.worm = 5000; st.weather = weather;
  const map = {};
  for (let i = 0; i < 400; i++) {
    st.energy = 1e6;
    const r = G.fish(st, 'worm');
    if (!r.ok) break;
    if (!r.entry) continue;
    map[r.entry.fish + '|' + (r.entry.quality ? r.entry.quality.id : '-')] = r.entry.price;
  }
  return map;
}
G.setRng(mulberry32(777));
const vSun = sampleValues('sunny');
G.setRng(mulberry32(777));
const vRain = sampleValues('rain');
const commonKeys = Object.keys(vSun).filter(k => k in vRain);
ok(commonKeys.length >= 4 && commonKeys.every(k => vSun[k] === vRain[k]),
   '同种鱼同品质在晴天/雨天售价相同', commonKeys.length);

function hookStats(weather) {
  const st = G.createState();
  st.maxEnergy = 1e6; st.bait.worm = 5000; st.weather = weather;
  let bites = 0, trashN = 0, castsN = 0;
  for (let i = 0; i < 600; i++) {
    st.energy = 1e6;
    const r = G.fish(st, 'worm');
    if (!r.ok) break;
    castsN++;
    if (r.entry) { bites++; if (r.entry.trash) trashN++; }
  }
  return { bites: bites, casts: castsN, trashRate: bites ? trashN / bites : 0 };
}
G.setRng(mulberry32(4242)); const hSun = hookStats('sunny');
G.setRng(mulberry32(4242)); const hRain = hookStats('rain');
ok(hRain.bites > hSun.bites, '雨天咬钩更多（天气影响咬钩率，而不是鱼种）', [hSun.bites, hRain.bites]);
ok(Math.abs(hSun.trashRate - hRain.trashRate) < 0.08, '垃圾率不再随天气变化（只受饵影响）',
   [hSun.trashRate.toFixed(3), hRain.trashRate.toFixed(3)]);

/* 无饵料 */
s.weather = 'sunny'; s.bait = { worm: 0, dough: 0 }; s.lure = { owned: false, dur: 0 };
ok(!G.fish(s).ok, '没有饵料钓不了');

/* ---------- 5. 经济：扩张 / 强化 / 零工 / 下午茶 ---------- */
section('经济系统');
G.setRng(mulberry32(5));
s = G.createState();
ok(G.expandCost(s) === 40, '默认 5 块地，第 6 块 40 金');
s.coins = 1000;
G.expand(s);
ok(G.expandCost(s) === 55, '第 7 块 55 金');
ok(G.upgradeCost(s) === 36, '首次强化 36 金（Lv15 → 20）');
G.upgrade(s);
ok(s.maxEnergy === 20 && G.mealFee(s) === 5, '强化后上限 20、伙食 5 金', { max: s.maxEnergy, fee: G.mealFee(s) });
ok(G.upgradeCost(s) === 43, '第二次强化 43 金（每级 ×1.2）');
ok(G.workCost(s, 'half') === 10 && G.workPay(s, 'half') === 12, '半天零工：消耗 10、赚 12（×1.2）');
ok(G.workCost(s, 'full') === 20 && G.workPay(s, 'full') === 40, '全天零工：消耗 20、赚 40（×2.0）');

s.energy = 20; const c0 = s.coins;
G.work(s, 'full');
ok(s.coins - c0 === 40 && s.energy === 0, '全天零工结算正确', { gain: s.coins - c0, energy: s.energy });

/* ---------- 5b. 半天零工：体力不足时全用上，收益仍 ×1.0 ---------- */
section('半天零工 · 体力不足');
s = G.createState();                 // 上限 10，半天需要 5
s.coins = 100; s.energy = 3;
let wr = G.work(s, 'half');
ok(wr.ok && wr.partial === true && s.energy === 0, '体力不足时把剩余体力全用上', { energy: s.energy, wr: wr });
ok(s.coins === 104, '收益按消耗 ×1.2 结算 = 4 金', s.coins);

s.energy = 0;
ok(!G.work(s, 'half').ok, '一点体力都没有时干不了零工');

s = G.createState(); s.coins = 0; s.energy = 5;
wr = G.work(s, 'half');
ok(wr.ok && s.energy === 0 && s.coins === 6, '刚好够半天：消耗 5、赚 6', { coins: s.coins });

/* ---------- 5c. 种子店：买 / 卖（半价） ---------- */
section('种子店');
ok(G.seedBuyPrice(G.CROPS.carrot) === 5 && G.seedSellPrice(G.CROPS.carrot) === 2, '萝卜：买 5 金 / 卖 2 金');
ok(G.seedSellPrice(G.CROPS.corn) === 7, '玉米买 14 → 卖 7（向下取整）');
ok(G.seedSellPrice(G.CROPS.watermelon) === 16, '西瓜买 32 → 卖 16');

s = G.createState();                       // 50 金
let rb = G.buySeed(s, 'corn', 2);
ok(rb.ok && s.coins === 22 && s.seeds.corn === 2, '买 2 颗玉米种子：-28 金', { coins: s.coins, seeds: s.seeds });
ok(!G.buySeed(s, 'watermelon', 1).ok, '金币不够时买不了', s.coins);

s.coins = 0;
let rsp = G.sellSeed(s, 'corn', 1);
ok(rsp.ok && rsp.income === 7 && s.seeds.corn === 1 && s.coins === 7, '卖 1 颗玉米种子得 7 金', { coins: s.coins, seeds: s.seeds });
rsp = G.sellSeed(s, 'corn');
ok(rsp.ok && s.seeds.corn === undefined && s.coins === 14, '卖光后种子从背包移除', { coins: s.coins });
ok(!G.sellSeed(s, 'corn').ok, '没有库存时卖不了');

s.seeds = { carrot: 2, cabbage: 1 }; s.coins = 0;
let rsa = G.sellAllSeeds(s);
ok(rsa.ok && rsa.income === 7 && s.coins === 7 && Object.keys(s.seeds).length === 0,
   '一键卖光：萝卜 2×2 + 白菜 1×3 = 7 金', rsa.income);

/* ---------- 5d. 全部播种 ---------- */
section('全部播种');
s = G.createState();
s.seeds = { carrot: 10 };
let rp = G.plantAll(s, 'carrot');
ok(rp.ok && rp.planted === 5 && s.plots.every(function (p) { return p.crop === 'carrot'; }), '5 块空地一次种满', rp);
ok(s.seeds.carrot === 5 && s.energy === 10, '消耗 5 颗种子 + 5 体力', { seeds: s.seeds, energy: s.energy });

s = G.createState();
s.seeds = { carrot: 2 };
rp = G.plantAll(s, 'carrot');
ok(rp.ok && rp.planted === 2 && s.plots.filter(function (p) { return !p.crop; }).length === 3,
   '种子不够时种多少算多少', rp);
ok(/没有/.test(rp.stop || ''), '并给出停止原因', rp.stop);

s = G.createState();
s.seeds = { carrot: 10 };
G.plantAll(s, 'carrot');
ok(!G.plantAll(s, 'carrot').ok, '没有空地时提示');

/* ---------- 5d. 全部施肥 ---------- */
section('全部施肥');
s = G.createState();
s.seeds = { carrot: 4 }; s.coins = 100; s.energy = 20;
s.ferts = { normal: 4, special: 0 };
G.plantAll(s, 'carrot');
ok(G.fertTargets(s).length === 4, '4 块地都可施肥', G.fertTargets(s).length);

let rf = G.fertilizeAll(s, 'normal');
ok(rf.ok && rf.n === 4 && s.ferts.normal === 0 && s.energy === 12,
   '普通肥 ×4：消耗 4 袋、-4 体力', { n: rf.n, ferts: s.ferts.normal, energy: s.energy });
ok(s.plots.filter(function (p) { return p.crop; }).every(function (p) { return p.fert === 1; }), '每块种了的地 +1 产量');
ok(G.expectedYield(s, s.plots[0]) === 4, '预计产量含施肥（萝卜 3+1）', G.expectedYield(s, s.plots[0]));
ok(!G.fertilizeAll(s, 'normal').ok, '已施肥的地块不再重复施');

s = G.createState();
s.seeds = { pumpkin: 2 }; s.coins = 100;
G.plantAll(s, 'pumpkin');
ok(G.fertTargets(s).length === 0, '南瓜 / 西瓜不吃肥料');

s = G.createState();
s.seeds = { carrot: 4 }; s.coins = 100; s.energy = 20;
s.ferts = { normal: 2, special: 0 };
G.plantAll(s, 'carrot');
rf = G.fertilizeAll(s, 'normal');
ok(rf.ok && rf.n === 2 && s.ferts.normal === 0 && /肥料/.test(rf.stop || ''),
   '肥料只够 2 块时施 2 块后停', rf);

s = G.createState();
s.seeds = { carrot: 4 }; s.coins = 100; s.energy = 5;
s.ferts = { normal: 0, special: 3 };
G.plantAll(s, 'carrot');                       // 播完还剩 1 体力
rf = G.fertilizeAll(s, 'special');
ok(rf.ok && rf.n === 1 && s.energy === 0 && /体力/.test(rf.stop || ''),
   '体力只够 1 块时施 1 块后停', rf);

/* 肥料：种子店买、半价卖、入仓库 */
s = G.createState(); s.coins = 100;
ok(G.buyFertItem(s, 'normal', 2).ok && s.ferts.normal === 2 && s.coins === 84, '种子店买 2 袋普通肥 = 16 金');
ok(G.fertSellPrice('normal') === 4 && G.fertSellPrice('special') === 9, '肥料半价回收 4 / 9 金');
ok(G.sellFert(s, 'normal').ok && s.ferts.normal === 0 && s.coins === 92, '肥料全部卖回 +8 金');
s.ferts.normal = 0;
ok(!G.useFert(s, 0, 'normal').ok, '没肥料时施不了肥');

/* ---------- 5e. 铲除 ---------- */
section('铲除作物');
s = G.createState();
s.seeds = { carrot: 1, pumpkin: 1 };
G.plant(s, 0, 'carrot');
ok(G.clearPlot(s, 0).ok && !s.plots[0].crop, '铲除后地块变回空地');
ok(!G.clearPlot(s, 0).ok, '空地不能铲除');
G.plant(s, 0, 'pumpkin');
s.plots[0].phase = 'ripe';
s.plots[0].growth = 5;
ok(G.clearPlot(s, 0).ok && !s.plots[0].crop, '成熟未收的作物也能铲掉');

/* ---------- 5f. 账本按天汇总 ---------- */
section('账本按天汇总');
s = G.createState();
s.ledger = [
  { day: 3, label: '卖鱼', income: 12, expense: 0, balance: 62 },
  { day: 3, label: '卖鱼', income: 8, expense: 0, balance: 50 },
  { day: 3, label: '伙食费', income: 0, expense: 7, balance: 42 },
  { day: 2, label: '卖萝卜', income: 20, expense: 0, balance: 49 },
  { day: 1, label: '开局金币', income: 50, expense: 0, balance: 50 }
];
const agg = G.ledgerByDay(s);
ok(agg.length === 3, '三天合成 3 条', agg.length);
ok(agg[0].day === 3 && agg[0].income === 20 && agg[0].expense === 7, '第 3 天收 20 支 7', agg[0]);
ok(agg[0].balance === 62 && agg[0].items.length === 3, '当天余额取最后一笔，明细 3 条', { b: agg[0].balance, n: agg[0].items.length });
ok(agg[2].day === 1 && agg[2].balance === 50, '最早一天正常汇总', agg[2]);

/* ---------- 5g. 打零工合并 ---------- */
section('打零工（半天/全天合并）');
s = G.createState(); s.coins = 0; s.energy = 15;
let wa = G.workAuto(s);
ok(wa.ok && s.energy === 0 && s.coins === 30, '体力满 → 全天（-15 体力 +30 金）', { e: s.energy, c: s.coins });

s = G.createState(); s.coins = 0; s.energy = 6;
wa = G.workAuto(s);
ok(wa.ok && s.energy === 0 && s.coins === 7, '体力 6 → 半天（体力用光 +7 金）', { e: s.energy, c: s.coins });

s = G.createState(); s.coins = 0; s.energy = 3;
wa = G.workAuto(s);
ok(wa.ok && s.energy === 0 && s.coins === 4, '体力不足半天 → 用光全部', { e: s.energy, c: s.coins });

s = G.createState(); s.energy = 0;
ok(!G.workAuto(s).ok, '没有体力时打不了零工');

/* ---------- 5h. 蚯蚓可卖 + 种子价格平衡 ---------- */
section('蚯蚓出售 / 种子平衡');
s = G.createState(); s.bait.worm = 10; s.coins = 0;
const rw = G.sellWorms(s);
ok(G.WORM_VALUE === 3 && rw.ok && s.coins === 30 && s.bait.worm === 0, '蚯蚓 3 金/条，卖 10 条得 30 金', { coins: s.coins });
ok(!G.sellWorms(s).ok, '没有蚯蚓时卖不了');

function profitPerDay(c) {
  const revenue = c.multi
    ? c.firstQty * c.price + c.regrowTimes * c.regrowQty * c.price
    : (c.big ? 1 : c.base) * c.price;
  const days = c.multi ? c.days + c.regrowTimes * c.regrowDays : c.days;
  return (revenue - c.seed) / days;
}
const ppd = G.CROP_LIST.map(function (c) { return { name: c.name, v: profitPerDay(c) }; });
ok(ppd.every(function (x) { return x.v > 2 && x.v < 10; }),
   '所有作物利润/天落在 2~10 金', ppd.map(function (x) { return x.name + ' ' + x.v.toFixed(1); }).join(' / '));
ok(ppd[0].name === '萝卜' && ppd[0].v === Math.min.apply(null, ppd.map(function (x) { return x.v; })),
   '萝卜仍是最低收益（3.5/天）');

/* ---------- 5i. 日志按天折叠 ---------- */
section('日志按天折叠');
s = G.createState();
s.log = [
  { day: 3, text: 'c', kind: 'good' },
  { day: 3, text: 'b', kind: 'info' },
  { day: 2, text: 'a', kind: 'sys' }
];
const ldays = G.logByDay(s);
ok(ldays.length === 2 && ldays[0].day === 3 && ldays[0].items.length === 2,
   '第 3 天 2 条、第 2 天 1 条', ldays.map(function (d) { return [d.day, d.items.length]; }));
ok(ldays[1].day === 2 && ldays[1].items[0].text === 'a', '组内保留原文与顺序');

/* 没钱吃饭 */
s = G.createState();
s.coins = 0; s.energy = 2;
G.sleep(s);
ok(s.energy === 5 && s.coins === 0, '没钱吃饭只恢复 5 体力', { e: s.energy, c: s.coins });

/* ---------- 5j. v0.8.0 修复回归 ---------- */
section('v0.8.0 修复回归');

// 再生期不再残留「缺水 ×N」
// 再生期不再残留「缺水 ×N」（固定成晴天，否则雨天会自动浇水，漏浇就白测了）
G.setRng(function () { return 0.1; });        // 0.1 → 晴天
s = G.createState(); s.seeds = { strawberry: 1 }; s.energy = 99; s.coins = 99;
G.plant(s, 0, 'strawberry');
G.water(s, 0); G.sleep(s);
G.sleep(s);                        // 漏浇一天 → missed +1
for (let i = 0; i < 5 && s.plots[0].phase !== 'ripe'; i++) { G.water(s, 0); G.sleep(s); }
ok(s.plots[0].missed === 1, '漏浇会累计 missed', s.plots[0].missed);
G.sleep(s);
G.harvest(s, 0);
ok(s.plots[0].phase === 'regrow' && s.plots[0].missed === 0, '进入再生期后 missed 清零', s.plots[0]);

// 没钱睡觉不再扣掉本来就更高的体力
s = G.createState(); s.coins = 0; s.energy = 9;
G.sleep(s);
ok(s.energy === 9, '没钱睡觉不会把 9 点体力扣成 5', s.energy);

// 强化体力成本逐级上涨（×1.2）
s = G.createState();
const upCosts = [];
for (let i = 0; i < 4; i++) { upCosts.push(G.upgradeCost(s)); s.maxEnergy += 5; }
ok(upCosts[0] === 36 && upCosts[1] === 43 && upCosts[2] === 52 && upCosts[3] === 62,
   '强化成本 36/43/52/62', upCosts.join('/'));

// 天气影响咬钩率：晴天咬钩更少
function biteRate(weather) {
  const st = G.createState(); st.weather = weather; st.energy = 99999; st.bait.dough = 99999; st.coins = 99999;
  let bites = 0;
  for (let i = 0; i < 2000; i++) {
    st.levels.fish = 1; st.levels.fishXp = 0;          // 隔离等级加成，测基础咬钩率
    if (G.fish(st, 'dough').entry) bites++;
  }
  return bites / 2000;
}
G.setRng(mulberry32(4242)); const sunnyBite = biteRate('sunny');
G.setRng(mulberry32(4242)); const rainBite = biteRate('rain');
ok(rainBite > sunnyBite + 0.1,
   '雨天咬钩率明显高于晴天（' + (sunnyBite * 100).toFixed(0) + '% vs ' + (rainBite * 100).toFixed(0) + '%）');

// 季节文案（每 30 天换一季，目前只影响顶栏）
ok(G.seasonOf(1) === '春' && G.seasonOf(30) === '春' && G.seasonOf(31) === '夏' &&
   G.seasonOf(61) === '秋' && G.seasonOf(91) === '冬' && G.seasonOf(121) === '春',
   '季节每 30 天轮换', [1, 31, 61, 91, 121].map(function (d) { return G.seasonOf(d); }).join('/'));

// 日志上限放宽到 400 条
s = G.createState();
for (let i = 0; i < 600; i++) G.sleep(s);
ok(s.log.length === 400, '日志上限 400 条（不再只剩 60 条）', s.log.length);

// 导入存档清洗：空地块数组 / 字符串金币 / 离谱体力上限
s = G.deserialize({ plots: [], coins: 'abc', maxEnergy: 999, energy: 999, day: 0 });
ok(s.plots.length === 1 && s.coins === 50 && s.maxEnergy === 100 && s.energy === 100 && s.day === 1,
   '导入存档会清洗地块数/金币/体力上限', { plots: s.plots.length, coins: s.coins, max: s.maxEnergy, e: s.energy, day: s.day });
ok(G.expandCost(s) === 25, '地块数为 1 时扩张成本不为负', G.expandCost(s));
s.coins = 30;
const ex = G.expand(s);
ok(ex.ok && s.coins === 5 && s.plots.length === 2, '导入脏档后扩张不会白送金币', { coins: s.coins });


/* ---------- 5l. 作物品质 ---------- */
section('作物品质');
G.setRng(mulberry32(2026));

function harvestOnce(fert) {
  const st = G.createState();
  st.plots[0] = { crop: 'carrot', growth: 2, watered: false, missed: 0, fert: fert,
                  ripeDay: 0, hits: 0, phase: 'ripe' };
  st.day = 5;
  return G.harvest(st, 0);
}

const h1 = harvestOnce(0);
ok(!!h1.quality && !!h1.quality.id, '收获会带品质', h1.quality && h1.quality.name);
ok(G.unitValue('carrot', h1.quality.id) === Math.max(1, Math.round(4 * h1.quality.mul)),
   '单价 = 基础价 × 品质倍率', G.unitValue('carrot', h1.quality.id));

function avgTier(fert) {
  let sum = 0;
  for (let i = 0; i < 300; i++) {
    const h = harvestOnce(fert);
    sum += G.QUALITY.findIndex(function (q) { return q.id === h.quality.id; });
  }
  return sum / 300;
}
const q0 = avgTier(0), q2 = avgTier(2);
ok(q2 > q0 + 0.3, '施肥会拉高品质', q0.toFixed(2) + ' → ' + q2.toFixed(2));

s = G.createState();
G.addStore(s, 'carrot', 'bad', 2);
G.addStore(s, 'carrot', 'legend', 1);
const vAll = 2 * G.unitValue('carrot', 'bad') + G.unitValue('carrot', 'legend');
ok(G.storeValue(s, 'carrot') === vAll && G.storeCount(s, 'carrot') === 3, '仓库估值按品质累加', G.storeValue(s, 'carrot'));
const coinsQ = s.coins;
ok(G.sellOne(s, 'carrot').ok && s.coins - coinsQ === vAll && !s.store.carrot, '单卖按品质结算');
ok(G.storeMix(s, 'carrot').length === 0, '卖空后仓库不留空桶');

s = G.createState();
G.addStore(s, 'carrot', 'bad', 2);
G.addStore(s, 'carrot', 'legend', 1);
G.takeStore(s, 'carrot', 2);
ok(G.storeCount(s, 'carrot') === 1 && s.store.carrot.legend === 1, '交委托先扣品质差的');

s = G.createState();
G.addStore(s, 'carrot', 'bad', 1);
G.addStore(s, 'carrot', 'fine', 2);
const mix = G.storeMix(s, 'carrot');
ok(mix[0].id === 'fine' && mix[1].id === 'bad', '仓库品质构成按好的在前',
   mix.map(function (m) { return m.id; }).join(','));

const mig = G.deserialize({ plots: [], store: { carrot: 3, corn: 1 } });
ok(G.storeCount(mig, 'carrot') === 3 && mig.store.carrot.std === 3 && G.storeCount(mig, 'corn') === 1,
   '老存档的数字仓库迁移成「标准」品质');

/* ---------- 5k. 每日委托 ---------- */
section('每日委托');
G.setRng(mulberry32(77));
s = G.createState();
ok(s.orders.length === 3 && s.orders.filter(function (o) { return o.kind === 'crop'; }).length === 2,
   '每天 2 个作物单 + 1 个鱼单', s.orders.map(function (o) { return o.kind; }).join(','));

const co = s.orders[0];
s.store[co.crop] = { std: co.qty - 1 };
const coinsBefore = s.coins;
ok(!G.deliverOrder(s, co.id).ok && s.coins === coinsBefore, '仓库不够时交不了');

s.store[co.crop] = { std: co.qty };
const good = G.deliverOrder(s, co.id);
ok(good.ok && s.coins === coinsBefore + co.reward && !s.store[co.crop] && co.done === true,
   '交单：给报酬、扣库存、标记完成', { coins: s.coins, left: s.store[co.crop], reward: co.reward });
ok(!G.deliverOrder(s, co.id).ok, '同一单不能交两次');
ok(co.reward > co.qty * G.CROPS[co.crop].price, '委托报酬高于直接卖',
   co.reward + ' vs ' + co.qty * G.CROPS[co.crop].price);

const fo = s.orders.filter(function (o) { return o.kind === 'fish'; })[0];
s.fishBag = [
  { name: '锦鲤', emoji: '🐉', q: 'legend', v: 75, d: 1 },
  { name: '鲫鱼', emoji: '🐟', q: 'std', v: 3, d: 1 },
  { name: '鲤鱼', emoji: '🐟', q: 'std', v: 6, d: 1 }
];
const c1 = s.coins;
ok(G.deliverOrder(s, fo.id).ok && s.coins === c1 + fo.reward, '鱼单也能交');
ok(s.fishBag.length === 3 - fo.qty && s.fishBag.some(function (e) { return e.name === '锦鲤'; }),
   '交鱼先交最便宜的，锦鲤留着', s.fishBag.map(function (e) { return e.name; }).join('/'));

s = G.createState();
const day1Orders = s.orders.map(function (o) { return o.id; }).join();
ok(G.refreshOrders(s).ok, '开局就能手动刷新一次');
ok(!G.refreshOrders(s).ok, '同一天只能手动刷新一次');
s.coins = 100;
G.sleep(s);
ok(s.orders[0].id.indexOf('d' + s.day + '-') === 0, '睡觉后委托自动换新');
ok(s.manualRefreshUsed === false && G.refreshOrders(s).ok, '新的一天又有一次手动刷新');

const oldSave = G.deserialize({ plots: [], coins: 10, day: 3 });
ok(Array.isArray(oldSave.orders) && oldSave.orders.length === 3, '老存档没有委托字段时自动补一份');
ok(G.orderPool(3).length === 4 && G.orderPool(30).length === 10, '委托池随天数解锁');

/* ---------- 5m. v1.1.0：洒水器 / 零工一天一次 / 委托过滤 / 蚯蚓 ---------- */
section('v1.1.0 新功能');
G.setRng(mulberry32(55));

s = G.createState(); s.coins = 400;
ok(G.buySprinkler(s).ok && s.sprinklers === 1 && s.coins === 320, '洒水器 80 金/个', { c: s.coins });
s.coins = 100000;
while (G.buySprinkler(s).ok) { /* 买满 */ }
ok(s.sprinklers === s.plots.length, '洒水器最多每块地一个', s.sprinklers);

G.setRng(function () { return 0.1; });        // 固定晴天
s = G.createState(); s.sprinklers = 2; s.seeds = { carrot: 3 }; s.coins = 100;
G.plantAll(s, 'carrot');
G.sleep(s);
ok(s.plots.filter(function (p) { return p.crop && p.growth === 1; }).length === 2,
   '洒水器每天自动浇 2 块地（不耗体力）',
   s.plots.map(function (p) { return p.crop ? p.growth : '-'; }).join(''));

s = G.createState(); s.energy = 10; s.coins = 0;
ok(G.workAuto(s).ok && s.workUsed === true, '打零工后标记当天已用');
ok(!G.workAuto(s).ok, '同一天打不了第二次零工');
G.sleep(s);
ok(s.workUsed === false, '睡一觉后才能再打');

s = G.createState();
s.fishBag = [
  { name: '旧靴子', q: null, v: 1, d: 1 },
  { name: '宝箱', q: 'std', v: 15, d: 1, no: true },
  { name: '鲫鱼', q: 'std', v: 3, d: 1 }
];
ok(G.orderHave(s, { kind: 'fish' }) === 1, '杂物 / 宝箱不算委托进度', G.orderHave(s, { kind: 'fish' }));
const fishOrder = { id: 't', kind: 'fish', qty: 1, reward: 10, name: '任意鱼', done: false };
s.orders = [fishOrder];
ok(G.deliverOrder(s, 't').ok, '只有 1 条有效鱼也能交鱼单');
ok(s.fishBag.length === 2 && s.fishBag.some(function (e) { return e.name === '宝箱'; }) &&
   s.fishBag.some(function (e) { return e.name === '旧靴子'; }), '交完只剩杂物和宝箱');

G.setRng(mulberry32(9));
let minSun = 9, maxSun = 0, minRain = 9, maxRain = 0;
for (let i = 0; i < 60; i++) {
  let st = G.createState(); st.weather = 'sunny'; st.energy = 99;
  let r = G.digWorms(st); minSun = Math.min(minSun, r.n); maxSun = Math.max(maxSun, r.n);
  st = G.createState(); st.weather = 'rain'; st.energy = 99;
  r = G.digWorms(st); minRain = Math.min(minRain, r.n); maxRain = Math.max(maxRain, r.n);
}
ok(minSun === 1 && maxSun === 2, '晴天挖蚯蚓 1~2 条', minSun + '~' + maxSun);
ok(minRain === 2 && maxRain === 4, '雨天挖蚯蚓 2~4 条', minRain + '~' + maxRain);

/* ---------- 5n. v1.2.0：自动收获器 / 没钱恢复 / 仓库总价 ---------- */
section('v1.2.0 新功能');
G.setRng(mulberry32(33));

s = G.createState(); s.coins = 500;
ok(G.buyHarvester(s).ok && s.harvester === true && s.coins === 200, '自动收获器 300 金');
ok(!G.buyHarvester(s).ok, '只能装一个');

G.setRng(function () { return 0.1; });          // 晴天
s = G.createState();
s.harvester = true; s.coins = 1000; s.energy = 0;
s.plots[0] = { crop: 'carrot', growth: 2, watered: false, missed: 0, fert: 0, ripeDay: 0, hits: 0, phase: 'ripe' };
const storeBefore = G.storeCount(s, 'carrot');
G.sleep(s);
ok(G.storeCount(s, 'carrot') > storeBefore && s.plots[0].crop === null,
   '睡觉时自动收走成熟作物（不耗体力）', { n: G.storeCount(s, 'carrot') });

// 没钱吃饭：只恢复到上限的 30%，至少 5 点
s = G.createState(); s.maxEnergy = 40; s.coins = 0; s.energy = 0;
G.sleep(s);
ok(s.energy === 12, '没钱时恢复到上限 30%（40 → 12）', s.energy);
s = G.createState(); s.maxEnergy = 10; s.coins = 0; s.energy = 0;
G.sleep(s);
ok(s.energy === 5, '上限低时保底 5 点', s.energy);
s = G.createState(); s.maxEnergy = 40; s.coins = 0; s.energy = 20;
G.sleep(s);
ok(s.energy === 20, '没钱也不会扣掉已有的体力', s.energy);

// 仓库总价 = 作物 + 鱼 + 蚯蚓 + 肥料（半价）
s = G.createState();
G.addStore(s, 'carrot', 'std', 2);              // 2 × 4 = 8
s.fishBag = [{ name: '鲫鱼', q: 'std', v: 5, d: 1 }];
s.bait.worm = 2;                                // 6
s.ferts = { normal: 1, special: 0 };            // +4
ok(G.storeTotal(s) === 8 + 5 + 6 + 4, '仓库总价把作物/鱼/蚯蚓/肥料都算上', G.storeTotal(s));

/* ---------- 5o. v1.3.0：开关 / 渔网 / 周费 / 扩展 / 图鉴 ---------- */
section('v1.3.0 新功能');
G.setRng(mulberry32(88));

s = G.createState(); s.coins = 1000;
G.buyHarvester(s);
ok(s.harvester && s.harvesterOn === true, '买到自动收获器默认开启');
ok(G.toggleHarvester(s).ok && s.harvesterOn === false, '自动收获器可以关闭');
s.plots[0] = { crop: 'carrot', growth: 2, watered: false, missed: 0, fert: 0, ripeDay: 0, hits: 0, phase: 'ripe' };
G.setRng(function () { return 0.1; });
G.sleep(s);
ok(G.storeCount(s, 'carrot') === 0, '关闭时睡觉不会自动收');
G.toggleHarvester(s);
G.sleep(s);
ok(G.storeCount(s, 'carrot') > 0, '开启后睡觉自动收');

// 渔网
G.setRng(function () { return 0.1; });
s = G.createState(); s.coins = 500; s.nets = 2; s.bait.dough = 2;
G.sleep(s);
ok(s.bait.dough === 0 && s.fishBag.length === 2, '渔网每天耗面团饵并上鱼', { dough: s.bait.dough, n: s.fishBag.length });
ok(G.buyNet(s).ok && s.nets === 3, '渔具店能买渔网');

// 5 块之后的周维护费
s = G.createState();
s.plots = new Array(10).fill(0).map(function () { return G.createState().plots[0]; });
s.day = 6; s.coins = 100;
G.sleep(s);
ok(s.coins === 100 - 4 - 15, '10 块地周末扣 15 金维护费', s.coins);

// 25 块之后扩展费暴涨
function costAt(n) {
  const st = G.createState();
  st.plots = new Array(n).fill(0).map(function () { return G.createState().plots[0]; });
  return G.expandCost(st);
}
ok(costAt(5) === 40 && costAt(24) === 325 && costAt(25) === 325 && costAt(26) === 520 && costAt(27) === 832,
   '25 块之后扩展费每块 ×1.6', [costAt(24), costAt(25), costAt(26), costAt(27)].join('/'));

// 春季过后委托需求变大
G.setRng(mulberry32(5));
const sumQ = function (os) {
  return os.filter(function (o) { return o.kind === 'crop'; })
    .reduce(function (a, o) { return a + o.qty; }, 0);
};
ok(sumQ(G.makeOrders({ day: 70 })) > sumQ(G.makeOrders({ day: 10 })) * 1.5,
   '春季过后委托需求明显变大');

// 图鉴
s = G.createState(); s.energy = 999; s.bait.dough = 10; s.weather = 'cloudy';
G.setRng(mulberry32(3));
for (let i = 0; i < 10; i++) G.fish(s, 'dough');
const fishN = Object.keys(s.codex.fish).reduce(function (a, k) { return a + s.codex.fish[k].n; }, 0);
ok(fishN === 10, '图鉴记录钓鱼次数', fishN);
s.plots[0] = { crop: 'carrot', growth: 2, watered: false, missed: 0, fert: 0, ripeDay: 0, hits: 0, phase: 'ripe' };
s.day = 9;
const hh = G.harvest(s, 0);
ok(s.codex.crops.carrot && s.codex.crops.carrot.n === hh.qty, '图鉴记录作物收获', s.codex.crops.carrot);

/* ---------- 5p. v1.4.0：空竿 / 饵定位 / 图鉴统计 ---------- */
section('v1.4.0 钓鱼与图鉴');
function rates(kind, weather, n) {
  n = n || 3000;
  const st = G.createState();
  st.weather = weather; st.maxEnergy = 1e9; st.coins = 1e9;
  if (kind === 'worm') st.bait.worm = 1e9;
  else if (kind === 'dough') st.bait.dough = 1e9;
  else st.lure = { owned: true, dur: 1e9 };
  let bites = 0, trash = 0;
  for (let i = 0; i < n; i++) {
    st.energy = 1e9;
    st.levels.fish = 1; st.levels.fishXp = 0;          // 隔离等级加成
    const r = G.fish(st, kind);
    if (r.ok && r.entry) { bites++; if (r.entry.trash) trash++; }
  }
  return { bite: bites / n, trash: bites ? trash / bites : 0 };
}
G.setRng(mulberry32(101));
const rDough = rates('dough', 'cloudy');
G.setRng(mulberry32(101));
const rLure = rates('lure', 'cloudy');
G.setRng(mulberry32(101));
const rWorm = rates('worm', 'cloudy');
ok(Math.abs(rDough.bite - 0.92) < 0.03, '面团饵咬钩率约 92%', (rDough.bite * 100).toFixed(1));
ok(Math.abs(rLure.bite - 0.72) < 0.04, '假饵有真正的空竿（约 72% 咬钩）', (rLure.bite * 100).toFixed(1));
ok(rLure.trash < rDough.trash * 0.6, '假饵杂物率明显低于面团饵',
   [(rLure.trash * 100).toFixed(1), (rDough.trash * 100).toFixed(1)]);
ok(rWorm.bite > rDough.bite - 0.01, '蚯蚓咬钩率不低于面团饵', (rWorm.bite * 100).toFixed(1));

// 图鉴：首次 / 完美 / 累计价值
s = G.createState(); s.energy = 1e9; s.bait.dough = 200; s.weather = 'cloudy';
G.setRng(mulberry32(9));
let caughtN = 0;
for (let i = 0; i < 60 && caughtN < 10; i++) { if (G.fish(s, 'dough').entry) caughtN++; }
const someFish = Object.keys(s.codex.fish)[0];
const fx = s.codex.fish[someFish];
ok(caughtN === 10 && fx && fx.n > 0 && fx.first >= 1 && fx.value > 0, '图鉴记录首次日期与累计价值', fx);
ok(typeof fx.perfect === 'number', '图鉴记录完美品质条数');

// 委托溢价稳定 35%
G.setRng(mulberry32(5));
const ord = G.makeOrders({ day: 66 }).filter(function (o) { return o.kind === 'crop'; })[0];
const direct = ord.qty * G.CROPS[ord.crop].price;
ok(Math.abs(ord.reward - Math.round(direct * 1.35)) <= 1, '委托报酬稳定在直售的 135%',
   { reward: ord.reward, direct: direct });

// 设备维护费
s = G.createState(); s.sprinklers = 3; s.nets = 2; s.harvester = true;
ok(G.deviceUpkeep(s) === 3 * 3 + 2 * 3 + 5, '设备周维护费 = 洒水器 3 + 渔网 3 + 收获器 5', G.deviceUpkeep(s));
s = G.createState();
s.plots = new Array(10).fill(0).map(function () { return G.createState().plots[0]; });
s.day = 6; s.coins = 200; s.sprinklers = 3; s.nets = 1;
G.sleep(s);
ok(s.coins === 200 - 4 - (15 + 9 + 3), '周末同时扣土地与设备维护费', s.coins);

// 老存档图鉴回填
const migFish = G.deserialize({
  plots: [], fishBook: { count: 0, entries: [
    { day: 4, fish: '鲫鱼', quality: { id: 'good', mul: 1.3 }, price: 7, trash: false }
  ], best: null, priciest: null }, stats: {}
});
ok(migFish.codex.fish.crucian && migFish.codex.fish.crucian.n === 1 && migFish.codex.fish.crucian.first === 4,
   '老存档从钓鱼记录回填图鉴', migFish.codex.fish.crucian);

/* ---------- 5q. v1.5.0：税金 / 水产店 / 渔网上限 ---------- */
section('v1.5.0 税金与水产店');
G.setRng(mulberry32(321));

s = G.createState(); s.coins = 0;
ok(G.taxDue(s) === 30, '税金最低 30 金', G.taxDue(s));
s.coins = 1000;
ok(G.taxDue(s) === 30, '1000 金落在 2% 档，仍按下限 30', G.taxDue(s));
s.coins = 6000;
ok(G.taxDue(s) === 200, '6000 金 = 2000×2% + 4000×4% = 200', G.taxDue(s));
s.coins = 12000;
ok(G.taxDue(s) === 480, '12000 金 = 40 + 320 + 120 = 480', G.taxDue(s));

s = G.createState(); s.coins = 1000; s.day = 29;
G.sleep(s);
ok(s.day === 30 && s.coins === 1000 - 4 - 30, '第 30 天结算月税（税前 996 → 税 30）', s.coins);
ok(G.taxInDays(s) === 30, '刚缴完税，下次还有 30 天', G.taxInDays(s));

s = G.createState(); s.coins = 100; s.fishBag = [];
const bp = G.fishBuyPrice('crucian');
ok(G.buyFish(s, 'crucian', 1).ok && s.coins === 100 - bp && s.fishBag.length === 1 && s.fishBag[0].v === 3,
   '水产店能买鱼（5 金/条，价值 3）', { coins: s.coins, bag: s.fishBag.length });
ok(!G.buyFish(s, 'trash', 1).ok, '杂物买不到');
ok(G.fishBuyPrice('koi') === 45, '锦鲤买价 45 金', G.fishBuyPrice('koi'));

s = G.createState(); s.coins = 1e6;
while (G.buyNet(s).ok) { /* 买满 */ }
ok(s.nets === 9 && G.NET_MAX === 9, '渔网最多 9 张', s.nets);

/* ---------- 5r. v1.5.1: 买鱼套利 / 假饵 / 播报合并 ---------- */
section('v1.5.1 修复与平衡');
G.setRng(mulberry32(11));

s = G.createState(); s.coins = 1000; s.bait = { worm: 0, dough: 0 }; s.lure = { owned: false, dur: 0 };
s.orders = [{ id: 't', kind: 'fish', qty: 2, reward: 22, name: '任意鱼', done: false }];
G.buyFish(s, 'crucian', 2);
ok(G.orderHave(s, { kind: 'fish' }) === 0, '买来的水产不算委托进度', G.orderHave(s, { kind: 'fish' }));
ok(!G.deliverOrder(s, 't').ok, '买来的鱼交不了鱼单');

const st2 = G.createState(); st2.weather = 'cloudy'; st2.energy = 1e9; st2.bait.dough = 1e9;
for (let i = 0; i < 40; i++) { const rr = G.fish(st2, 'dough'); if (rr.entry) break; }
ok(G.orderHave(st2, { kind: 'fish' }) === 1, '自己钓的鱼可以交');

function evBait(kind, weather, n) {
  const s2 = G.createState(); s2.weather = weather; s2.maxEnergy = 1e9; s2.coins = 0;
  if (kind === 'worm') s2.bait.worm = 1e9; else if (kind === 'dough') s2.bait.dough = 1e9;
  else s2.lure = { owned: true, dur: 1e9 };
  let sum = 0;
  for (let i = 0; i < n; i++) { s2.energy = 1e9; const rr = G.fish(s2, kind); if (rr.entry) sum += rr.entry.price; }
  return sum / n;
}
G.setRng(mulberry32(77)); const evD = evBait('dough', 'cloudy', 4000);
G.setRng(mulberry32(77)); const evL = evBait('lure', 'cloudy', 4000);
ok(evL > evD * 0.85 && evL < evD, '假饵期望略低于面团但差距不大', [evD.toFixed(2), evL.toFixed(2)]);

s = G.createState(); s.day = 29; s.coins = 1000;
const sr = G.sleep(s);
ok(typeof sr.summary === 'string' && sr.summary.indexOf('🌙 第 30 天') === 0 && sr.summary.indexOf('税') >= 0,
   '睡觉播报合并成一条且包含税金', sr.summary.slice(0, 50));
ok(Array.isArray(sr.notes) && sr.notes.every(function (n) { return n && n.kind && n.text; }),
   '播报已改成结构化 {kind,text}');

ok(G.BALANCE && G.BALANCE.tax.bands.length === 3 && G.BALANCE.tax.bands[1].rate === 0.04 &&
   G.BALANCE.prices.sprinkler === 80 && G.BALANCE.hook.dough === 0.92,
   '数值表 BALANCE 对外导出（含累进税档）');

/* ---------- 5s. v1.5.2: 渔网 / 肥料品质 / 水产店 ---------- */
section('v1.5.2 渔网与肥料');
let netCatches = 0, netJunk = 0, netHigh = 0, netUsed = 0;
for (let i = 0; i < 40; i++) {
  G.setRng(mulberry32(200 + i));
  const st = G.createState();
  st.nets = 9; st.bait.dough = 9; st.weather = 'cloudy';
  G.sleep(st);
  netUsed += 9;
  st.fishBag.forEach(function (e) {
    netCatches++;
    if (!e.q) netJunk++;
    if (e.q && ['good', 'fine', 'perfect', 'legend'].indexOf(e.q) >= 0) netHigh++;
  });
}
ok(netCatches > 0 && netJunk === 0, '渔网不会网到杂物/宝箱', netJunk);
ok(netHigh === 0, '渔网只出标准及以下品质', netHigh);
const rate = netCatches / netUsed;
ok(rate > 0.6 && rate < 0.8, '渔网上鱼率约 70%', (rate * 100).toFixed(0) + '%');

G.setRng(mulberry32(9)); const t1 = avgTier(1);
G.setRng(mulberry32(9)); const t2 = avgTier(2);
ok(Math.abs(t1 - t2) < 0.06, '普通肥与特效肥的品质加成一致', [t1.toFixed(2), t2.toFixed(2)]);
ok(t1 > 0.3, '施肥仍然提升品质', t1.toFixed(2));

s = G.createState(); s.coins = 1000;
ok(!G.buyFish(s, 'chest', 1).ok, '水产店不卖宝箱');

/* ---------- v1.6 水产店库存 ---------- */
section('水产店库存（v1.6）');
G.setRng(mulberry32(31));
let shp = G.createState();
const buyable = G.FISH.filter(f => !f.trash && !f.noOrder);
ok(buyable.every(f => typeof G.shopStock(shp, f.id) === 'number'), '每种可买水产都有今日库存');
ok(!('trash' in shp.shop.stock) && !('chest' in shp.shop.stock), '杂物 / 宝箱不进货');
ok(buyable.every(f => {
  const shopCap = (G.SHOP_STOCK[f.id] || [1, 2])[1];
  const n = G.shopStock(shp, f.id);
  return n >= 0 && n <= shopCap;
}), '库存不超过当日进货上限');

shp.coins = 500;
const shopBefore = G.shopStock(shp, 'crucian');
ok(shopBefore >= 2, '鲫鱼每天至少进 2 条', shopBefore);
const shopBR = G.buyFish(shp, 'crucian', shopBefore);
ok(shopBR.ok && G.shopStock(shp, 'crucian') === 0, '可以买光当日库存', { shopBefore, left: G.shopStock(shp, 'crucian') });
ok(!G.buyFish(shp, 'crucian', 1).ok, '售罄后买不到');
ok(!G.buyFish(shp, 'carp', 99).ok, '一次买超过库存会被拒绝');

shp.shop.stock.crucian = 0;
G.sleep(shp);
ok(shp.shop.day === shp.day && G.shopStock(shp, 'crucian') > 0, '睡一觉水产店补货',
  { day: shp.day, stock: G.shopStock(shp, 'crucian') });

/* ---------- v1.6 成就 ---------- */
section('成就与奖励（v1.6）');
G.setRng(mulberry32(41));
let achs = G.createState();
ok(G.checkAchievements(achs).length === 0, '开局不会白送成就');

achs.stats.harvests = 1;
const achC0 = achs.coins;
const achUn1 = G.checkAchievements(achs);
ok(achUn1.some(x => x.id === 'harvest1') && achs.coins === achC0 + 15, '收获 1 次解锁成就并发 +15 金', achUn1);
ok(G.checkAchievements(achs).length === 0, '同一成就不会重复发奖');

achs.fishBook.count = 1;
const achD0 = achs.bait.dough;
const achUn2 = G.checkAchievements(achs);
ok(achUn2.some(x => x.id === 'fish1') && achs.bait.dough === achD0 + 5, '钓到第一条鱼奖励 5 份面团饵', achUn2);

achs.coins = 100000;
while (achs.plots.length < 10) G.expand(achs);
ok(G.checkAchievements(achs).some(x => x.id === 'plot10'), '10 块地解锁成就');

const achInf = G.achInfo(achs);
ok(achInf.length === G.ACH.length, '成就面板条目数一致', achInf.length);
ok(achInf.every(x => x.cur >= 0 && x.cur <= x.goal), '成就进度不会超过目标');
ok(achInf.filter(x => x.done).length >= 3, '已解锁成就标记正确');

ok(G.fishDesc('鲫鱼').length > 0 && G.fishDesc('易拉罐').length > 0, '渔获与杂物都有简述');
ok(G.fishDesc('不存在的鱼') === '', '未知渔获没有简述');

const achRT = G.deserialize(G.serialize(achs));
ok(achRT.ach.harvest1 && achRT.shop && typeof achRT.shop.stock === 'object', '成就与库存写进存档');

const achLegacy = JSON.parse(G.serialize(G.createState()));
delete achLegacy.shop; delete achLegacy.ach;
const achMig = G.deserialize(achLegacy);
ok(achMig.shop && Object.keys(achMig.shop.stock).length > 0, '老存档自动补进货表');
ok(achMig.ach && Object.keys(achMig.ach).length === 0, '老存档成就为空');

/* ---------- v1.7 农产品店 / 等级 / 委托池 / 假饵 ---------- */
section('v1.7 农产品店与等级');
G.setRng(mulberry32(77));
let cs = G.createState();
cs.coins = 1000;
ok(G.cropBuyPrice('carrot') === 9 && G.cropBuyPrice('pumpkin') === 132, '农产品买价 = 售价 ×2.2',
  [G.cropBuyPrice('carrot'), G.cropBuyPrice('pumpkin')]);
ok(G.cropBuyPrice('tomato') > Math.round(G.CROPS.tomato.price * G.BALANCE.order.mult),
  '买农产品凑委托必亏（买价 > 委托价）');

const st0 = G.cropShopStock(cs, 'carrot');
ok(st0 >= 1, '农产品店蔬菜有货', st0);
ok(G.buyCrop(cs, 'carrot', 1).ok && G.storeCount(cs, 'carrot') === 1 &&
   G.cropShopStock(cs, 'carrot') === st0 - 1, '买农产品进仓库并扣库存');
ok(!G.buyCrop(cs, 'carrot', st0 + 5).ok, '超过库存买不到');
cs.cropShop.stock.carrot = 0;
ok(!G.buyCrop(cs, 'carrot', 1).ok, '售罄买不到');
G.sleep(cs);
ok(cs.cropShop.day === cs.day && G.cropShopStock(cs, 'carrot') >= 1, '睡一觉农产品店补货');

let cs2 = G.createState();
G.addStore(cs2, 'carrot', 'std', 10);
const csCoins = cs2.coins;
const csSell = G.sellOne(cs2, 'carrot');
ok(csSell.ok && cs2.stats.cropsSold === 10 && cs2.coins === csCoins + csSell.income,
  '农产品店卖出计入统计', { sold: cs2.stats.cropsSold, gain: csSell.income });

/* 等级 */
let lvS = G.createState();
ok(lvS.levels.farm === 1 && lvS.levels.fish === 1, '开局种田 / 钓鱼都是 Lv1');
ok(G.levelNeed(1) === 15 && G.levelNeed(2) === 25, '升级所需经验 15 / 25');
ok(G.addLevelXp(lvS, 'farm', 15) === 1 && lvS.levels.farm === 2 && lvS.levels.farmXp === 0,
  '15 点经验升到 Lv2');
G.addLevelXp(lvS, 'farm', 25);
ok(lvS.levels.farm === 3, '再 25 点升到 Lv3');
ok(G.farmYieldBonus(lvS) === 1, 'Lv3 产量 +1');
const lvPlot = { crop: 'carrot', phase: 'growing', growth: 1, fert: 0, missed: 0 };
ok(G.expectedYield(lvS, lvPlot) === 4, 'Lv3 萝卜预计产量 3+1', G.expectedYield(lvS, lvPlot));
ok(G.expectedYield(G.createState(), lvPlot) === 3, 'Lv1 萝卜预计产量 3');

let lvF = G.createState();
ok(G.fishHookBonus(lvF) === 0 && G.fishGoodBonus(lvF) === 1, 'Lv1 没有钓鱼加成');
G.addLevelXp(lvF, 'fish', 1e6);
ok(lvF.levels.fish === 10 && Math.abs(G.fishHookBonus(lvF) - 0.12) < 1e-9, '满级钓鱼咬钩 +12%');
ok(G.fishGoodBonus(lvF) > 1.2, '满级好鱼权重明显提升', G.fishGoodBonus(lvF).toFixed(2));

ok(G.checkAchievements(lvS).some(x => x.id === 'farmLv3'), '等级成就可解锁');

/* 委托池逐档解锁 + 鱼单随季节涨价 */
ok(G.orderPool(1).length === 3 && G.orderPool(3).length === 4 && G.orderPool(9).length === 7 &&
   G.orderPool(18).length === 10, '委托池逐档解锁 3/4/7/10',
  [1, 3, 9, 18].map(d => G.orderPool(d).length).join('/'));
G.setRng(mulberry32(404));
const fishEarly = G.makeOrders({ day: 20 }).filter(o => o.kind === 'fish')[0];
const fishLate = G.makeOrders({ day: 95 }).filter(o => o.kind === 'fish')[0];
ok(fishLate.reward / fishLate.qty > fishEarly.reward / fishEarly.qty, '鱼单单价随季节上涨',
  [fishEarly.reward / fishEarly.qty, fishLate.reward / fishLate.qty]);

let lureS = G.createState(); lureS.coins = 100;
G.buyBait(lureS, 'lure', 1);
ok(lureS.lure.dur === 25 && lureS.coins === 95, '假饵 5 金 · 耐用 25 次', lureS.lure.dur);

ok(G.ACH.length === 32, '成就总数 32', G.ACH.length);

const retro = G.deserialize({ plots: [], coins: 100, day: 20, stats: { harvests: 100, casts: 300 } });
ok(retro.levels.farm > 1 && retro.levels.fish > 1, '老存档按历史次数补等级',
  [retro.levels.farm, retro.levels.fish]);

/* ---------- 6. 存读档 ---------- */
section('存读档');
s = G.createState();
s.seeds = { corn: 1 };
G.plant(s, 0, 'corn');
const round = G.deserialize(G.serialize(s));
ok(round.plots[0].crop === 'corn' && round.coins === s.coins, '序列化往返一致');
ok(round.plots.length === 5 && round.fishBook.count === 0, '结构完整');

/* ---------- 7. 随机压测 ---------- */
section('随机压测 3000 步');
G.setRng(mulberry32(2024));
s = G.createState();
const acts = [
  () => G.waterAll(s), () => G.harvestAll(s), () => G.sleep(s), () => G.digWorms(s),
  () => G.tea(s), () => G.work(s, 'half'), () => G.work(s, 'full'), () => G.fish(s),
  () => G.fishMany(s, 3), () => G.sellAll(s), () => G.expand(s), () => G.upgrade(s),
  () => G.buyBait(s, 'dough', 1), () => G.buyBait(s, 'lure', 1),
  () => G.buySeed(s, Object.keys(G.CROPS)[Math.floor(Math.random() * 10)], 1 + Math.floor(Math.random() * 3)),
  () => G.sellSeed(s, Object.keys(G.CROPS)[Math.floor(Math.random() * 10)]),
  () => { const ids = Object.keys(G.CROPS); return G.plantAll(s, ids[Math.floor(Math.random() * ids.length)]); },
  () => { const i = Math.floor(Math.random() * s.plots.length); const ids = Object.keys(G.CROPS); return G.plant(s, i, ids[Math.floor(Math.random() * ids.length)]); },
  () => { const i = Math.floor(Math.random() * s.plots.length); return G.useFert(s, i, Math.random() < 0.5 ? 'normal' : 'special'); },
  () => { const i = Math.floor(Math.random() * s.plots.length); return Math.random() < 0.5 ? G.water(s, i) : G.harvest(s, i); },
  () => { const ids = ['crucian', 'carp', 'mandarin', 'bass', 'puffer', 'koi']; return G.buyFish(s, ids[Math.floor(Math.random() * ids.length)], 1); },
  () => G.checkAchievements(s)
];
let err = null;
for (let i = 0; i < 3000; i++) {
  try { acts[Math.floor(Math.random() * acts.length)](); } catch (e) { err = e; break; }
  if (s.coins < 0 || s.energy < 0 || s.energy > s.maxEnergy || s.day < 1) {
    err = new Error('不变量被破坏 @step ' + i + ' ' + JSON.stringify({ c: s.coins, e: s.energy, m: s.maxEnergy }));
    break;
  }
  if (s.plots.some(p => p.growth < 0 || (p.crop && p.growth > G.needOf(p)))) {
    err = new Error('生长值越界 @step ' + i); break;
  }
}
ok(!err, '3000 步随机操作无异常、不变量成立', err && err.message);
ok(JSON.stringify(s).length > 0, '最终状态可序列化（' + (JSON.stringify(s).length / 1024).toFixed(1) + ' KB）');

console.log('\n' + (fail ? '❌' : '✅') + ' 通过 ' + pass + ' / ' + (pass + fail));
process.exit(fail ? 1 : 0);
