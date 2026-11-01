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
ok(s.coins === 50 && s.energy === 10 && s.plots.length === 5, '初始状态 50 金/10 体力/5 块地');

let r = G.plant(s, 0, 'carrot');
ok(!r.ok, '没有种子不能播种', r.msg);

let bsr = G.buySeed(s, 'carrot', 1);
ok(bsr.ok && s.coins === 45 && s.seeds.carrot === 1, '种子店买 1 颗萝卜种子：-5 金', { coins: s.coins, seeds: s.seeds });

r = G.plant(s, 0, 'carrot');
ok(r.ok && s.energy === 9 && s.coins === 45 && !s.seeds.carrot, '播种只扣 1 颗种子 + 1 体力，不扣金币', { coins: s.coins, energy: s.energy, seeds: s.seeds });

r = G.water(s, 0);
ok(r.ok && s.plots[0].growth === 1, '浇水 +1 天');

r = G.water(s, 0);
ok(!r.ok, '同一天不能重复浇水');

r = G.sleep(s);
ok(s.day === 2 && s.coins === 42 && s.energy === 10, '睡觉：第 2 天、扣伙食 3 金、体力回满', { day: s.day, coins: s.coins, energy: s.energy });

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
let total = 0, casts = 0, trash = 0;
for (let i = 0; i < 200; i++) {
  s.energy = 10;                 // 每杆补满体力，只测钓鱼本身
  const fr = G.fish(s, 'worm');
  if (!fr.ok) break;
  casts++; total += fr.entry.price;
  if (fr.entry.trash) trash++;
}
ok(casts === 200, '连甩 200 杆全部成功', casts);
ok(total > 0 && Number.isFinite(total), '渔获总价值为正数', total);
ok(s.coins === coinsAtStart, '钓鱼不再直接给钱，渔获先入仓库', s.coins);
ok(s.fishBag.length === 200, '渔获进 fishBag', s.fishBag.length);
ok(s.fishBook.count === 200, '钓鱼记录本计数正确', s.fishBook.count);
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
for (let i = 0; i < 12; i++) { s.energy = 10; G.fish(s, 'worm'); }
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
ok(rAll.ok && s.coins > beforeAll && s.fishBag.length === 0 && Object.keys(s.store).length === 0,
   '「全部卖出」同时清掉作物和渔获', rAll);

/* 天气只影响上钩概率，不影响售价 */
section('天气 → 上钩概率');
const wIds = Object.keys(G.WEATHER);
ok(wIds.length === 3 && !wIds.includes('storm'), '天气只有 晴/阴/雨 三种', wIds);
ok(G.WEATHER.sunny.w + G.WEATHER.cloudy.w + G.WEATHER.rain.w === 100, '天气概率合计 100%',
   [G.WEATHER.sunny.w, G.WEATHER.cloudy.w, G.WEATHER.rain.w]);
ok(G.WEATHER.sunny.biteMul === 0.8 && G.WEATHER.cloudy.biteMul === 1, '晴天好鱼上钩 ×0.8、阴天 ×1');
ok(G.WEATHER.rain.biteMul === 1.3, '雨天好鱼上钩 ×1.3');
ok(!('fishMul' in G.WEATHER.rain), '天气不再带售价系数');

/* 蚯蚓只影响品质与上钩，不影响售价 */
const wormEntry = (function () {
  const st = G.createState();
  st.bait.worm = 500; st.energy = 1e6; st.maxEnergy = 1e6;
  G.setRng(mulberry32(31));
  for (let i = 0; i < 200; i++) {
    const r = G.fish(st, 'worm');
    if (r.ok && !r.entry.trash) return r.entry;
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

function trashCount(weather) {
  const st = G.createState();
  st.maxEnergy = 1e6; st.bait.worm = 5000; st.weather = weather;
  let n = 0;
  for (let i = 0; i < 600; i++) {
    st.energy = 1e6;
    const r = G.fish(st, 'worm');
    if (!r.ok) break;
    if (r.entry.trash) n++;
  }
  return n;
}
G.setRng(mulberry32(4242)); const tSun = trashCount('sunny');
G.setRng(mulberry32(4242)); const tRain = trashCount('rain');
ok(tRain < tSun, '雨天垃圾更少（好鱼更容易上钩）', [tSun, tRain]);

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
ok(G.upgradeCost(s) === 30, '首次强化 30 金');
G.upgrade(s);
ok(s.maxEnergy === 15 && G.mealFee(s) === 4, '强化后上限 15、伙食 4 金', { max: s.maxEnergy, fee: G.mealFee(s) });
ok(G.upgradeCost(s) === 36, '第二次强化 36 金（每级 ×1.2）');
ok(G.workCost(s, 'half') === 8 && G.workPay(s, 'half') === 10, '半天零工：消耗 8、赚 10（×1.2）');
ok(G.workCost(s, 'full') === 15 && G.workPay(s, 'full') === 30, '全天零工：消耗 15、赚 30（×2.0）');

s.energy = 15; const c0 = s.coins;
G.work(s, 'full');
ok(s.coins - c0 === 30 && s.energy === 0, '全天零工结算正确', { gain: s.coins - c0, energy: s.energy });

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
ok(s.seeds.carrot === 5 && s.energy === 5, '消耗 5 颗种子 + 5 体力', { seeds: s.seeds, energy: s.energy });

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
G.plantAll(s, 'carrot');
ok(G.fertTargets(s).length === 4, '4 块地都可施肥', G.fertTargets(s).length);

let rf = G.fertilizeAll(s, 'normal');
ok(rf.ok && rf.n === 4 && rf.cost === 20 && s.coins === 80 && s.energy === 12,
   '普通肥 ×4：-20 金、-4 体力', { n: rf.n, coins: s.coins, energy: s.energy });
ok(s.plots.filter(function (p) { return p.crop; }).every(function (p) { return p.fert === 1; }), '每块种了的地 +1 产量');
ok(G.expectedYield(s, s.plots[0]) === 4, '预计产量含施肥（萝卜 3+1）', G.expectedYield(s, s.plots[0]));
ok(!G.fertilizeAll(s, 'normal').ok, '已施肥的地块不再重复施');

s = G.createState();
s.seeds = { pumpkin: 2 }; s.coins = 100;
G.plantAll(s, 'pumpkin');
ok(G.fertTargets(s).length === 0, '南瓜 / 西瓜不吃肥料');

s = G.createState();
s.seeds = { carrot: 4 }; s.coins = 12; s.energy = 20;
G.plantAll(s, 'carrot');
rf = G.fertilizeAll(s, 'normal');
ok(rf.ok && rf.n === 2 && s.coins === 2 && /金币/.test(rf.stop || ''),
   '金币只够 2 块时施 2 块后停', rf);

s = G.createState();
s.seeds = { carrot: 4 }; s.coins = 100; s.energy = 5;
G.plantAll(s, 'carrot');                       // 播完还剩 1 体力
rf = G.fertilizeAll(s, 'special');
ok(rf.ok && rf.n === 1 && s.energy === 0 && /体力/.test(rf.stop || ''),
   '体力只够 1 块时施 1 块后停', rf);

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
s = G.createState(); s.coins = 0; s.energy = 10;
let wa = G.workAuto(s);
ok(wa.ok && s.energy === 0 && s.coins === 20, '体力满 → 全天（-10 体力 +20 金）', { e: s.energy, c: s.coins });

s = G.createState(); s.coins = 0; s.energy = 6;
wa = G.workAuto(s);
ok(wa.ok && s.energy === 1 && s.coins === 6, '体力 6 → 半天（-5 体力 +6 金）', { e: s.energy, c: s.coins });

s = G.createState(); s.coins = 0; s.energy = 3;
wa = G.workAuto(s);
ok(wa.ok && s.energy === 0 && s.coins === 4, '体力不足半天 → 用光全部', { e: s.energy, c: s.coins });

s = G.createState(); s.energy = 0;
ok(!G.workAuto(s).ok, '没有体力时打不了零工');

/* ---------- 5h. 蚯蚓可卖 + 种子价格平衡 ---------- */
section('蚯蚓出售 / 种子平衡');
s = G.createState(); s.bait.worm = 10; s.coins = 0;
const rw = G.sellWorms(s);
ok(G.WORM_VALUE === 2 && rw.ok && s.coins === 20 && s.bait.worm === 0, '蚯蚓 2 金/条，卖 10 条得 20 金', { coins: s.coins });
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
ok(upCosts[0] === 30 && upCosts[1] === 36 && upCosts[2] === 43 && upCosts[3] === 52,
   '强化成本 30/36/43/52', upCosts.join('/'));

// 天气真的影响收益：晴天杂物明显更多
function trashRate(weather) {
  const st = G.createState(); st.weather = weather; st.energy = 99999; st.bait.dough = 99999; st.coins = 99999;
  let junk = 0;
  for (let i = 0; i < 2000; i++) if (G.fish(st, 'dough').entry.trash) junk++;
  return junk / 2000;
}
const sunnyJunk = trashRate('sunny'), rainJunk = trashRate('rain');
ok(sunnyJunk > rainJunk + 0.15,
   '晴天空军/杂物明显多于雨天（' + (sunnyJunk * 100).toFixed(0) + '% vs ' + (rainJunk * 100).toFixed(0) + '%）');

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
s.coins = 100;
G.sleep(s);
ok(s.orders.length === 3 && s.orders.every(function (o) { return !o.done; }) &&
   s.orders.map(function (o) { return o.id; }).join() !== day1Orders,
   '睡一觉刷新当天委托', s.orders.length);

const oldSave = G.deserialize({ plots: [], coins: 10, day: 3 });
ok(Array.isArray(oldSave.orders) && oldSave.orders.length === 3, '老存档没有委托字段时自动补一份');
ok(G.orderPool(3).length === 4 && G.orderPool(30).length === 10, '委托池随天数解锁');

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
  () => { const i = Math.floor(Math.random() * s.plots.length); return G.buyFert(s, i, Math.random() < 0.5 ? 'normal' : 'special'); },
  () => { const i = Math.floor(Math.random() * s.plots.length); return Math.random() < 0.5 ? G.water(s, i) : G.harvest(s, i); }
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
