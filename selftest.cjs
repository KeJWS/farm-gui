/* 逻辑自测：node selftest.cjs */
require('./ensure-build.cjs')();
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
ok(s.coins > 40, '卖出后金币增加（8 折）', s.coins);
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
s.day = 31;                                    // 夏天，黄瓜当季
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
s.day = 31;                               // 夏天，黄瓜当季
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
const fishWithoutQuality = s.fishBook.entries.filter(e => !e.trash && !e.chest).every(e => e.quality && e.quality.mul);
ok(fishWithoutQuality, '非垃圾鱼都带品质');

/* 卖鱼 */
const groupsBefore = G.fishGroups(s, 'fish');
const expectFishSale = groupsBefore.reduce((a, g) =>
  a + Math.max(1, Math.round(G.shopValue(g.total) * G.sellBonus(s) * G.fishMarketMul(s, g.name, g.count))), 0);
const soldAll = G.sellAllFish(s);
ok(soldAll.ok && soldAll.income === expectFishSale && s.coins === coinsAtStart + expectFishSale && s.fishBag.every(e => G.fishIsJunk(e)),
   '全部卖鱼：按 8 折 × 市价结算，杂物和宝箱留下', { gain: soldAll.income, expect: expectFishSale });

/* 分组出售 */
s.bait.worm = 100;
let got12 = 0;
for (let i = 0; i < 60 && got12 < 12; i++) {
  s.energy = 10;
  const rr = G.fish(s, 'worm');
  if (rr.ok && rr.entry) got12++;
}
const fishLeft = () => s.fishBag.filter(e => !G.fishIsJunk(e)).length;
const fishN0 = fishLeft();
const groups = G.fishGroups(s, "fish");
ok(groups.length >= 1 && groups.reduce((n, g) => n + g.count, 0) === fishN0, '渔获按鱼种分组（不同品质合并）', groups.length);
const g0 = groups[0], coinsBeforeGroup = s.coins;
const expectGroup = Math.max(1, Math.round(G.shopValue(g0.total) * G.sellBonus(s) * G.fishMarketMul(s, g0.name, g0.count)));
const rGroup = G.sellFishGroup(s, g0.key);
ok(rGroup.ok && s.coins === coinsBeforeGroup + expectGroup && fishLeft() === fishN0 - g0.count,
   '卖一组鱼结算正确（8 折 × 市价）', { key: g0.key, gain: rGroup.income });

/* 全部卖出（作物 + 渔获） */
s = G.createState();
s.bait.worm = 20; G.addStore(s, 'carrot', 'std', 2);
for (let i = 0; i < 3; i++) { s.energy = 10; G.fish(s, 'worm'); }
const beforeAll = s.coins;
const expectAll = G.shopSellValue(s, 'carrot');
const rAll = G.sellAll(s);
ok(rAll.ok && s.coins === beforeAll + expectAll && s.fishBag.length > 0 && Object.keys(s.store).length === 0,
   '仓库「全部卖出」只卖作物（8 折 × 市价），渔获留给水产店', { coins: s.coins - beforeAll, fish: s.fishBag.length });

/* 天气只影响上钩概率，不影响售价 */
section('天气 → 上钩概率');
const wIds = Object.keys(G.WEATHER);
ok(wIds.length === 4 && wIds.includes('sunny') && wIds.includes('snow') && !wIds.includes('storm'),
  '天气有 晴/阴/雨/雪 四种', wIds);
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
ok(G.seedSellPrice(G.CROPS.watermelon) === 18, '西瓜买 36 → 卖 18');

s = G.createState();                       // 50 金
s.levels.farm = 3;                                  // 玉米种子要种田 Lv2
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
const v28big = s.plots.filter(function (p) { return p.crop; });
ok(v28big.length === 2, '反季南瓜也能种上（春天）', v28big.length);
ok(v28big.every(function (p) { return G.expectedYield(s, p) === 1; }), '大作物产量固定 1 个，反季也不减');
ok(v28big.every(function (p) { return G.fertBonus(p) === 0; }), '南瓜 / 西瓜不吃肥料产量加成');

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
s.day = 61;                                    // 秋天，南瓜当季
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
ok(ppd.every(function (x) { return x.v > 2 && x.v < 30; }),
   '所有作物利润/天落在 2~30 金', ppd.map(function (x) { return x.name + ' ' + x.v.toFixed(1); }).join(' / '));
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
const expectQ = G.shopSellValue(s, 'carrot');
ok(G.sellOne(s, 'carrot').ok && s.coins - coinsQ === expectQ && !s.store.carrot, '单卖按品质结算（8 折 × 市价）');
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
ok(G.orderPool(3).length === 5 && G.orderPool(30).length === 14, '委托池随天数解锁');

/* ---------- 5m. v1.1.0：洒水器 / 零工一天一次 / 委托过滤 / 蚯蚓 ---------- */
section('v1.1.0 新功能');
G.setRng(mulberry32(55));

s = G.createState(); s.coins = 400; s.levels.farm = 2;
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

s = G.createState(); s.coins = 500; s.levels.farm = 6;
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

s = G.createState(); s.coins = 1000; s.levels.farm = 6;
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
s = G.createState(); s.coins = 500; s.nets = 2; s.netSet = 2; s.bait.dough = 2; s.levels.fish = 3;
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
ok(ord.mul > 0 && Math.abs(ord.reward - Math.round(direct * 1.35 * ord.mul)) <= 1,
  '委托报酬 = 直售 ×1.35 × 市价溢价', { reward: ord.reward, direct: direct, mul: ord.mul });
ok(Math.abs(ord.reward - Math.round(direct * 1.35)) > 1, '市价溢价真的进账（不再等于裸 135%）');
{
  // 同一张单：把市场砸饱和，报酬应该跟着降
  const st = G.createState();
  st.day = 66;
  G.setRng(mulberry32(5));
  const a = G.makeOrders(st).filter(function (o) { return o.kind === 'crop'; })[0];
  G.addSupply(st, a.crop, 40);
  G.setRng(mulberry32(5));
  const b = G.makeOrders(st).filter(function (o) { return o.kind === 'crop'; })[0];
  ok(b.mul < a.mul && b.reward < a.reward, '卖太多之后委托价跟着掉', [a.mul, b.mul]);
}

// 设备维护费（渔网不缴维护费）
s = G.createState(); s.sprinklers = 3; s.nets = 2; s.harvester = true;
ok(G.deviceUpkeep(s) === 3 * 3 + 5, '设备周维护费 = 洒水器 3 + 收获器 5（渔网免费）', G.deviceUpkeep(s));
s = G.createState();
s.plots = new Array(10).fill(0).map(function () { return G.createState().plots[0]; });
s.day = 6; s.coins = 200; s.sprinklers = 3; s.nets = 1;
G.sleep(s);
ok(s.coins === 200 - 4 - (15 + 9), '周末同时扣土地与设备维护费', s.coins);

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
const bp = G.fishBuyPrice('crucian', s);
ok(G.buyFish(s, 'crucian', 1).ok && s.coins === 100 - bp && s.fishBag.length === 1 && s.fishBag[0].v === 3,
   '水产店能买鱼（基础 5 金 × 市价，价值 3）', { coins: s.coins, bag: s.fishBag.length });
ok(!G.buyFish(s, 'trash', 1).ok, '杂物买不到');
ok(G.fishBuyPrice('koi') === 31, '锦鲤买价 31 金（25 × 1.25）', G.fishBuyPrice('koi'));

s = G.createState(); s.coins = 1e6; s.levels.fish = 7;
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
for (let i = 0; i < 60 && G.orderHave(st2, { kind: 'fish' }) === 0; i++) G.fish(st2, 'dough');
ok(G.orderHave(st2, { kind: 'fish' }) >= 1, '自己钓的鱼可以交');

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
   G.BALANCE.device.sprinkler === 80 && G.BALANCE.hook.dough === 0.92,
   '数值表 BALANCE 对外导出（含累进税档）');

/* ---------- 5s. v1.5.2: 渔网 / 肥料品质 / 水产店 ---------- */
section('v1.5.2 渔网与肥料');
let netCatches = 0, netJunk = 0, netHigh = 0, netUsed = 0;
for (let i = 0; i < 40; i++) {
  G.setRng(mulberry32(200 + i));
  const st = G.createState();
  st.nets = 9; st.netSet = 9; st.bait.dough = 9; st.weather = 'cloudy';
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
ok(rate > 0.7 && rate < 0.9, '渔网上鱼率约 80%', (rate * 100).toFixed(0) + '%');

G.setRng(mulberry32(9)); const t1 = avgTier(1);
G.setRng(mulberry32(9)); const t2 = avgTier(2);
ok(Math.abs(t1 - t2) < 0.06, '普通肥与特效肥的品质加成一致（都是取 2 次）', [t1.toFixed(2), t2.toFixed(2)]);
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
ok(achUn1.some(x => x.id === 'harvest1') && achs.coins === achC0 + 15, '成就同时发点数与金币', achUn1);
ok(G.achPts(achs) === 1, '解锁后获得 1 点成就点', G.achPts(achs));
ok(G.checkAchievements(achs).length === 0, '同一成就不会重复发奖');

achs.fishBook.count = 1;
const achD0 = achs.bait.dough;
const achUn2 = G.checkAchievements(achs);
ok(achUn2.some(x => x.id === 'fish1') && achs.bait.dough === achD0 + 5, '成就也会发实物奖励（面团饵）', achUn2);

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
ok(G.cropBuyPrice('carrot') === 5 && G.cropBuyPrice('pumpkin') === 138, '农产品买价 = 售价 ×1.25',
  [G.cropBuyPrice('carrot'), G.cropBuyPrice('pumpkin')]);
ok(G.cropBuyPrice('carrot', cs) > Math.round(G.CROPS.carrot.price * G.BALANCE.order.mult),
  '行情正常时买农产品凑委托必亏（买价 > 委托价）');

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
G.addLevelXp(lvS, 'farm', 35 + 45);
ok(lvS.levels.farm === 5, '再 80 点升到 Lv5');
ok(G.farmYieldBonus(lvS) === 1, 'Lv5 产量 +1');
const lvPlot = { crop: 'carrot', phase: 'growing', growth: 1, fert: 0, missed: 0 };
ok(G.expectedYield(lvS, lvPlot) === 4, 'Lv5 萝卜预计产量 3+1', G.expectedYield(lvS, lvPlot));
ok(G.expectedYield(G.createState(), lvPlot) === 3, 'Lv1 萝卜预计产量 3');

let lvF = G.createState();
ok(G.fishHookBonus(lvF) === 0 && G.fishGoodBonus(lvF) === 1, 'Lv1 没有钓鱼加成');
G.addLevelXp(lvF, 'fish', 1e6);
ok(lvF.levels.fish === 10 && Math.abs(G.fishHookBonus(lvF) - 0.099) < 1e-9, '满级钓鱼咬钩 +9.9%');
ok(Math.abs(G.fishGoodBonus(lvF) - 1.225) < 1e-9, '满级好鱼权重 +22.5%', G.fishGoodBonus(lvF).toFixed(2));

ok(G.checkAchievements(lvS).some(x => x.id === 'farmLv3'), '等级成就可解锁');

/* 委托池逐档解锁 + 鱼单随季节涨价 */
ok(G.orderPool(1).length === 4 && G.orderPool(3).length === 5 && G.orderPool(9).length === 8 &&
   G.orderPool(18).length === 13, '委托池逐档解锁 4/5/8/13',
  [1, 3, 9, 18].map(d => G.orderPool(d).length).join('/'));
G.setRng(mulberry32(404));
const fishEarly = G.makeOrders({ day: 20 }).filter(o => o.kind === 'fish')[0];
const fishLate = G.makeOrders({ day: 95 }).filter(o => o.kind === 'fish')[0];
ok(fishLate.reward / fishLate.qty > fishEarly.reward / fishEarly.qty, '鱼单单价随季节上涨',
  [fishEarly.reward / fishEarly.qty, fishLate.reward / fishLate.qty]);

let lureS = G.createState(); lureS.coins = 100;
G.buyBait(lureS, 'lure', 1);
ok(lureS.lure.dur === 25 && lureS.coins === 95, '假饵 5 金 · 耐用 25 次', lureS.lure.dur);

ok(G.ACH.length === 60, '成就总数 60', G.ACH.length);

const retro = G.deserialize({ plots: [], coins: 100, day: 20, stats: { harvests: 100, casts: 300 } });
ok(retro.levels.farm > 1 && retro.levels.fish > 1, '老存档按历史次数补等级',
  [retro.levels.farm, retro.levels.fish]);

/* ---------- v1.8 等级解锁 / 商店库存 ---------- */
section('v1.8 等级解锁与库存');
G.setRng(mulberry32(88));
let gateS = G.createState(); gateS.coins = 10000;
gateS.day = 31;                                // 夏天：玉米 / 西瓜当季
ok(!G.buySeed(gateS, 'corn', 1).ok, 'Lv1 买不了玉米种子');
ok(!G.buySeed(gateS, 'watermelon', 1).ok, 'Lv1 买不了西瓜种子');
ok(G.buySeed(gateS, 'potato', 1).ok, 'Lv1 能买当季的土豆种子');
gateS.levels.farm = 6;
ok(G.buySeed(gateS, 'watermelon', 1).ok, '种田 Lv6 能买西瓜种子');
ok(G.seedUnlocked(gateS, 'pumpkin') && G.seedUnlocked(gateS, 'strawberry'), '高级种子按等级解锁');

ok(!G.fertUnlocked(G.createState(), 'special'), 'Lv1 特效肥未解锁');
gateS.levels.farm = 4;
ok(G.fertUnlocked(gateS, 'special'), '种田 Lv4 解锁特效肥');
ok(G.buyFertItem(gateS, 'special', 1).ok, '解锁后能买特效肥');

let devS = G.createState(); devS.coins = 10000;
ok(!G.sprinklerUnlocked(devS) && !G.buySprinkler(devS).ok, '洒水器要种田 Lv2');
devS.levels.farm = 2;
ok(G.buySprinkler(devS).ok, 'Lv2 能买洒水器');
ok(!G.harvesterUnlocked(devS) && !G.buyHarvester(devS).ok, '自动收获器要种田 Lv6');
devS.levels.farm = 6;
ok(G.buyHarvester(devS).ok, 'Lv6 能买自动收获器');

let netS = G.createState(); netS.coins = 10000;
ok(!G.netUnlocked(netS) && !G.buyNet(netS).ok, '渔网要钓鱼 Lv2');
netS.levels.fish = 2;
ok(G.netMax(netS) === 4 && G.buyNet(netS).ok, '钓鱼 Lv2 解锁渔网，上限 4 张', G.netMax(netS));
netS.levels.fish = 7;
ok(G.netMax(netS) === 9, '钓鱼 Lv7 上限 9 张', G.netMax(netS));
netS.levels.fish = 10;
ok(G.netMax(netS) === 9, '满级也不会超过 9 张', G.netMax(netS));

/* 库存变大 */
ok(G.SHOP_STOCK.crucian[1] === 6 && G.SHOP_STOCK.carp[1] === 6, '水产店库存上限提高');
ok(G.cropStockCap(G.CROPS.carrot) === 7 && G.cropStockCap(G.CROPS.corn) === 4, '农产品店库存上限提高');

/* 高级水产 / 作物中后期才进货 */
const fishD1 = G.rollShopStock(1);
ok(fishD1.puffer === 0 && fishD1.koi === 0 && fishD1.crucian > 0, 'D1 水产店不进高级鱼', fishD1);
let lateFish = 0;
for (let i = 0; i < 30; i++) lateFish += G.rollShopStock(30).koi;
ok(lateFish > 0, 'D30 起才进锦鲤', lateFish);

const cropD1 = G.rollCropStock(1);
ok(cropD1.pumpkin === 0 && cropD1.watermelon === 0 && cropD1.carrot > 0, 'D1 农产品店不进南瓜/西瓜', cropD1);
let lateCrop = 0;
for (let i = 0; i < 30; i++) lateCrop += G.rollCropStock(24).watermelon;
ok(lateCrop > 0, 'D24 起才进西瓜', lateCrop);

/* 老存档读过之后，渔网数量不会被上限打回 */
const netSave = G.deserialize({ plots: [], coins: 100, day: 40, nets: 9, levels: { farm: 8, fish: 10, farmXp: 0, fishXp: 0 } });
ok(netSave.nets === 9, '高等级存档的渔网数量保留', netSave.nets);

/* ---------- v1.9 收购箱 / 统计 / 播报 ---------- */
section('v1.9 收购箱与统计');
G.setRng(mulberry32(99));
let bs = G.createState(); bs.coins = 100;
G.addStore(bs, 'carrot', 'std', 10);                       // 原价 40 金
const mktCarrot = G.marketMul(bs, 'carrot', 10);
ok(G.shopSellValue(bs, 'carrot') === Math.round(32 * mktCarrot), '商店直接收购 8 折 × 批次中点市价', G.shopSellValue(bs, 'carrot'));
const boxExpect = Math.max(1, Math.round(40 * mktCarrot * (1 - G.BALANCE.market.boxFee)));
ok(G.boxPutCrop(bs, 'carrot').ok && G.boxCount(bs) === 1 && G.storeCount(bs, 'carrot') === 0,
  '作物整批放进收购箱');
ok(G.boxValue(bs) === boxExpect, '收购箱按市价 ×95% 估值', [G.boxValue(bs), boxExpect]);

const beforeShip = bs.coins, shipFee = G.mealFee(bs);
const shipExpect = G.boxValue(bs);
G.sleep(bs);
ok(G.boxCount(bs) === 0 && bs.coins === beforeShip + shipExpect - shipFee, '睡觉时按当日市价结清收购箱（扣 5%）',
  { coins: bs.coins, expect: beforeShip + shipExpect - shipFee });

let bf = G.createState();
bf.fishBag = [{ name: '鲫鱼', emoji: '🐟', q: 'std', v: 3, d: 1 }];
ok(G.boxPutFish(bf, G.fishKey(bf.fishBag[0])).ok && G.boxCount(bf) === 1 && bf.fishBag.length === 0,
  '渔获也能进收购箱');

const tb = G.createState(); tb.coins = 0;
tb.box = [{ kind: 'crop', id: 'carrot', name: '萝卜', emoji: '🥕', n: 10, raw: 40 }];
ok(G.boxValue(tb) > 0 && G.taxBase(tb) === G.boxValue(tb), '收购箱里的货按估值计入税金基数', G.taxBase(tb));

let ws = G.createState(); ws.stats.dug = 50; ws.stats.works = 30;
const unW = G.checkAchievements(ws);
ok(unW.some(x => x.id === 'dig50') && unW.some(x => x.id === 'work30'), '挖蚯蚓 / 打零工成就能解锁');

let wk = G.createState(); wk.coins = 0; wk.energy = 15;
G.work(wk, 'full');
ok(wk.stats.works === 1, '打零工计入统计');

const sleepNotes = G.sleep(G.createState()).notes.map(n => n.kind);
ok(sleepNotes.indexOf('order') < 0 && sleepNotes.indexOf('shop') < 0,
  '睡觉播报不再提示委托换新 / 商店补货', sleepNotes);

/* ---------- v2.0 长期订单 / 收购箱 / 成就点 ---------- */
section('v2.0 长期订单 / 收购箱 / 成就点');
G.setRng(mulberry32(202));

/* 委托池按等级裁剪 */
ok(G.orderPool(18, 1).length === 6, 'Lv1 时委托池只有买得到的 6 种', G.orderPool(18, 1).length);
ok(G.orderPool(18, 10).length === 13, 'Lv10 时委托池基本全开（13 种）', G.orderPool(18, 10).length);
let os2 = G.createState(); os2.day = 18; os2.levels.farm = 3;
G.setRng(mulberry32(5));
const osList = G.makeOrders(os2);
ok(osList.filter(function (o) { return o.kind === 'crop'; })
   .every(function (o) { return (G.CROPS[o.crop].lv || 1) <= 4; }),
   '委托只会要玩家买得到的作物', osList.map(function (o) { return o.name; }));

/* 长期订单 */
let ls = G.createState(); ls.day = 10; ls.levels.farm = 4;
G.setRng(mulberry32(31));
const lo = G.makeLongOrder(ls);
ok(lo && lo.deadline === 15 && lo.qty >= 6 && lo.reward > 0, '长期订单 5 天期限', lo);
ls.longOrder = lo;
if (lo.kind === 'crop') G.addStore(ls, lo.crop, 'std', lo.qty + 2);
else for (let i = 0; i < lo.qty + 2; i++) ls.fishBag.push({ name: '鲫鱼', emoji: '🐟', q: 'std', v: 3, d: 1 });
const dl = G.deliverLong(ls);
ok(dl.ok && ls.longOrder === null && ls.stats.longOrders === 1, '长期订单可交付并清空', dl);

/* 收购箱：部分放入 / 取出 / 加成 */
let bx = G.createState();
G.addStore(bx, 'carrot', 'std', 10);
const p1 = G.boxPutCrop(bx, 'carrot', 3);
ok(p1.ok && p1.n === 3 && G.storeCount(bx, 'carrot') === 7 && G.boxCount(bx) === 1, '收购箱可放自定义数量');
const tk = G.boxTake(bx);
ok(tk.ok && G.boxCount(bx) === 0 && G.storeCount(bx, 'carrot') === 10, '收购箱可取回仓库', G.storeCount(bx, 'carrot'));

/* 自定义取出 */
let bt = G.createState();
G.addStore(bt, 'carrot', 'std', 10);
G.boxPutCrop(bt, 'carrot');                       // 整批放入
G.addStore(bt, 'cabbage', 'std', 5);
G.boxPutCrop(bt, 'cabbage');
const tk2 = G.boxTake(bt, 3);
ok(tk2.ok && tk2.n === 3 && G.storeCount(bt, 'carrot') === 3 && G.boxCount(bt) === 2,
  '收购箱可自定义取回数量', { got: G.storeCount(bt, 'carrot'), box: G.boxCount(bt) });

/* 自定义卖出 */
let sc = G.createState(); G.addStore(sc, 'carrot', 'std', 10);
const s5 = G.sellCropN(sc, 'carrot', 4);
ok(s5.ok && s5.count === 4 && G.storeCount(sc, 'carrot') === 6, '农产品店可自定义卖出', s5);

/* 成就点 → 售价加成 */
let ab = G.createState();
ab.ach = {};
['harvest1', 'harvest50', 'harvest200'].forEach(function (id) { ab.ach[id] = 1; });   // 7 点
ok(G.achPts(ab) === 7 && G.sellBonus(ab) === 1, '不足 10 点没有加成', [G.achPts(ab), G.sellBonus(ab)]);
ab.ach.fish7 = 1;                                                                     // +5 → 12
ok(G.achPts(ab) === 12 && Math.abs(G.sellBonus(ab) - 1.01) < 1e-9, '满 10 点 +1% 售价', G.sellBonus(ab));
G.addStore(ab, 'carrot', 'std', 100);          // 原价 400
ok(G.shopSellValue(ab, 'carrot') === Math.round(400 * 0.8 * 1.01 * G.marketMul(ab, 'carrot', 100)),
  '售价加成作用于商店收购', G.shopSellValue(ab, 'carrot'));

/* ---------- v2.2 维护费 / 委托优化 / 收购箱 ---------- */
section('v2.2 维护费与委托');
ok(G.plotUpkeep(10) === 15 && G.plotUpkeep(20) === 45 && G.plotUpkeep(25) === 75 && G.plotUpkeep(36) === 189,
  '土地维护费分段 3 / 6 / 14',
  [G.plotUpkeep(10), G.plotUpkeep(20), G.plotUpkeep(25), G.plotUpkeep(36)]);

let ordS = G.createState(); ordS.day = 60; ordS.levels.farm = 8;
let allOrders = [];
for (let i = 0; i < 30; i++) { G.setRng(mulberry32(100 + i)); allOrders = allOrders.concat(G.makeOrders(ordS)); }
ok(allOrders.every(function (o) { return o.kind !== 'crop' || o.reward >= 40; }),
  '委托报酬最低 40 金', Math.min.apply(null, allOrders.map(function (o) { return o.reward; })));
ok(allOrders.filter(function (o) { return o.kind === 'crop' && o.qty >= 2; }).length > 0,
  '贵作物一次要 2 个以上');

/* 收购箱：按批次取出 */
let bxs = G.createState();
G.addStore(bxs, 'carrot', 'std', 10); G.boxPutCrop(bxs, 'carrot');
G.addStore(bxs, 'cabbage', 'std', 5); G.boxPutCrop(bxs, 'cabbage');
const bte1 = G.boxTakeEntry(bxs, 1, 2);
ok(bte1.ok && bte1.n === 2 && G.storeCount(bxs, 'cabbage') === 2 && G.boxCount(bxs) === 2,
  '收购箱可按批次取出', { took: bte1.n, cabbage: G.storeCount(bxs, 'cabbage') });
const bte2 = G.boxTakeEntry(bxs, 1, 99);
ok(bte2.ok && G.storeCount(bxs, 'cabbage') === 5 && G.boxCount(bxs) === 1, '取空后该批次移出箱子');

/* 水产店自定义卖出 */
let fsS = G.createState();
for (let i = 0; i < 6; i++) fsS.fishBag.push({ name: '鲤鱼', emoji: '🐟', q: 'std', v: 6, d: 1 });
const sfish = G.sellFishGroupN(fsS, G.fishKey(fsS.fishBag[0]), 2);
ok(sfish.ok && sfish.count === 2 && fsS.fishBag.length === 4, '水产店可自定义卖鱼', sfish);

/* 收购箱出货统计 + 成就 */
let bx2 = G.createState(); bx2.coins = 100;
G.addStore(bx2, 'carrot', 'std', 10);
G.boxPutCrop(bx2, 'carrot');
G.sleep(bx2);
ok(bx2.stats.boxItems === 10 && bx2.stats.boxIncome > 0, '收购箱出货计入统计', bx2.stats);
const boxAch = G.checkAchievements(Object.assign(G.createState(),
  { stats: { boxItems: 500, boxIncome: 5000 } }));
ok(boxAch.some(function (x) { return x.id === 'box100'; }) &&
   boxAch.some(function (x) { return x.id === 'boxval5k'; }), '收购箱成就能解锁');

/* ---------- 5d. v2.3 大作物 / 等级 / 委托保底 ---------- */
section('v2.3 大作物与等级');

ok(G.CROPS.pumpkin.base === 1 && G.CROPS.pumpkin.price === 110 && G.CROPS.pumpkin.seed === 26,
  '南瓜改成 1 个/株 · 110 金 · 种子 26', [G.CROPS.pumpkin.base, G.CROPS.pumpkin.price, G.CROPS.pumpkin.seed]);
ok(G.CROPS.watermelon.base === 1 && G.CROPS.watermelon.price === 140 && G.CROPS.watermelon.seed === 36,
  '西瓜改成 1 个/株 · 140 金 · 种子 36', [G.CROPS.watermelon.base, G.CROPS.watermelon.price, G.CROPS.watermelon.seed]);

/* 大作物：固定 1 个，只吃肥料品质加成 */
const v23bigS = G.createState();
const v23bigP = { crop: 'watermelon', phase: 'grow', missed: 0, fert: 2, hits: 0 };
ok(G.expectedYield(v23bigS, v23bigP) === 1, '大作物固定 1 个（肥料不加量）', G.expectedYield(v23bigS, v23bigP));
v23bigS.levels.farm = 10;
ok(G.expectedYield(v23bigS, v23bigP) === 1, '大作物不吃等级加成（Lv10 仍是 1 个）', G.expectedYield(v23bigS, v23bigP));
ok(G.fertBonus(v23bigP) === 0, '大作物肥料加成为 0', G.fertBonus(v23bigP));

/* 普通作物：每 4 级 +1 */
const v23lvS = G.createState();
const v23normP = { crop: 'eggplant', phase: 'grow', missed: 0, fert: 0, hits: 0 };
const v23yAt = (lv) => { v23lvS.levels.farm = lv; return G.expectedYield(v23lvS, v23normP); };
ok(v23yAt(3) === 2 && v23yAt(4) === 3 && v23yAt(7) === 3 && v23yAt(8) === 4,
  '产量曲线 floor(lv/4)：Lv3=2 / Lv4=3 / Lv7=3 / Lv8=4',
  [v23yAt(3), v23yAt(4), v23yAt(7), v23yAt(8)]);
ok(G.levelEffectText('farm', 8) === '收获产量 +2', '等级文案同步 floor(lv/4)', G.levelEffectText('farm', 8));

/* 委托保底：第一张单是最贵的可买作物 */
const v23fo = G.createState();
v23fo.day = 40; v23fo.levels.farm = 6;
G.setRng(mulberry32(31));
const v23fOrders = G.makeOrders(v23fo);
const v23fPool = G.orderPool(40, 6).filter(c => (c.lv || 1) <= 6);
const v23fTop = v23fPool.slice().sort((a, b) => b.price - a.price)[0];
ok(v23fOrders[0].flagship === true && v23fOrders[0].crop === v23fTop.id,
  '委托保底：第一张单是最贵可买作物', { got: v23fOrders[0].crop, want: v23fTop.id });
let v23flagshipOk = true;
for (let i = 0; i < 20; i++) {
  G.setRng(mulberry32(200 + i));
  const oo = G.makeOrders(v23fo);
  if (!oo[0].flagship || oo[0].crop !== v23fTop.id) { v23flagshipOk = false; break; }
}
ok(v23flagshipOk, '委托保底 20 次随机都成立');

/* 钓鱼等级：每 2 杆 1 点经验 */
const v23xpS = G.createState();
v23xpS.energy = 400; v23xpS.maxEnergy = 400; v23xpS.bait.dough = 400;
G.setRng(mulberry32(5));
const v23xp0 = v23xpS.levels.fishXp + (v23xpS.levels.fish - 1) * 0;
let v23xpGain = 0;
for (let i = 0; i < 10; i++) { const before = v23xpS.levels.fishXp; const r = G.fish(v23xpS, 'dough'); v23xpGain += (v23xpS.levels.fishXp - before) + (v23xpS.levels.fish > 1 ? 0 : 0); }
ok(v23xpGain >= 3 && v23xpGain <= 6, '10 杆大约 +5 点经验（2 杆 1 点）', v23xpGain);

/* ---------- 5e. v2.3 百货店：茶 / 钥匙 / 宝箱 ---------- */
section('v2.3 百货店');

let v23tS = G.createState();
v23tS.coins = 200;
const v23buyG = G.buyTea(v23tS, 'green', 3);
ok(v23buyG.ok && v23tS.coins === 164 && v23tS.teas.green === 3, '买 3 份绿茶 -36 金', { coins: v23tS.coins, teas: v23tS.teas });
v23tS.energy = 5; v23tS.maxEnergy = 20;
const v23drinkG = G.tea(v23tS, 'green');
ok(v23drinkG.ok && v23tS.energy === 9 && v23tS.teas.green === 2 && v23tS.coins === 164,
  '下午茶消耗茶、不再扣金币', { energy: v23tS.energy, teas: v23tS.teas.green, coins: v23tS.coins });
ok(v23tS.stats.teas === 1, '下午茶计入统计', v23tS.stats.teas);
ok(!G.tea(v23tS, 'green').ok, '一天只能喝一杯');
const v23tS2 = G.createState();
v23tS2.energy = 5;
ok(!G.tea(v23tS2, 'green').ok, '没有茶就喝不了');

const v23keyS = G.createState();
v23keyS.coins = 500;
v23keyS.levels.fish = 3;
ok(!G.buyKey(v23keyS, 'iron', 1).ok, '钓鱼 Lv3 买不到铁钥匙');
v23keyS.levels.fish = 4;
ok(G.buyKey(v23keyS, 'iron', 1).ok && v23keyS.keys.iron === 1 && v23keyS.coins === 460, 'Lv4 解锁铁钥匙 40 金', v23keyS.keys);
ok(!G.buyKey(v23keyS, 'gold', 1).ok, '金钥匙要 Lv7');
v23keyS.levels.fish = 7;
ok(!G.buyKey(v23keyS, 'gold', 1).ok, '金钥匙还要交易 Lv4');
v23keyS.levels.trade = G.BALANCE.gate.goldKeyTrade;
ok(G.buyKey(v23keyS, 'gold', 1).ok && v23keyS.keys.gold === 1, 'Lv7 + 交易 Lv4 解锁金钥匙');
ok(G.keyUnlocked(v23keyS, 'iron'), '铁钥匙不受交易等级限制');

/* 宝箱：木箱直接开、铁箱要钥匙 */
const v23chS = G.createState();
v23chS.fishBag.push({ name: '木制宝箱', emoji: '🪵', q: null, v: 8, d: 1, no: true, chest: 'wood' });
v23chS.fishBag.push({ name: '铁制宝箱', emoji: '🧰', q: null, v: 34, d: 1, no: true, chest: 'iron' });
const v23woodKey = G.fishGroups(v23chS, 'junk').filter(g => g.chest === 'wood')[0].key;
const v23ironKey = G.fishGroups(v23chS, 'junk').filter(g => g.chest === 'iron')[0].key;
const v23coinsBeforeChest = v23chS.coins;
const v23rWood = G.openChest(v23chS, v23woodKey);
ok(v23rWood.ok && v23chS.coins > v23coinsBeforeChest && v23chS.stats.chests === 1,
  '木制宝箱直接开、给金币', { gain: v23chS.coins - v23coinsBeforeChest });
ok(!G.openChest(v23chS, v23ironKey).ok, '没有铁钥匙开不了铁箱');
v23chS.keys.iron = 1;
const v23rIron = G.openChest(v23chS, v23ironKey);
ok(v23rIron.ok && v23chS.keys.iron === 0 && v23chS.stats.chests === 2, '用掉一把钥匙开铁箱', v23rIron.msg);
ok(v23chS.fishBag.length === 0, '开完的宝箱从仓库移除', v23chS.fishBag.length);

/* 水产店不收杂物和宝箱，收购箱收 */
const v23jS = G.createState();
v23jS.fishBag.push({ name: '易拉罐', emoji: '🥫', q: null, v: 1, d: 1, no: true, trash: true });
v23jS.fishBag.push({ name: '鲤鱼', emoji: '🐟', q: 'std', v: 6, d: 1 });
ok(G.fishGroups(v23jS, 'fish').length === 1 && G.fishGroups(v23jS, 'junk').length === 1, '渔获分组可分鱼 / 杂物', null);
const v23boxJunk = G.boxPutFish(v23jS, G.fishKey(v23jS.fishBag[0]), 1);
ok(v23boxJunk.ok, '杂物可以放进收购箱', v23boxJunk);
const v23boxTaken = G.boxTake(v23jS);
ok(v23boxTaken.ok && v23jS.fishBag.some(function (e) { return e.trash && !e.chest; }),
  '杂物从收购箱取回后仍是杂物（不会被当成鱼）', v23jS.fishBag);
const v23junkKey = G.fishGroups(v23jS, 'junk')[0].key;
const v23rJunk = G.sellJunk(v23jS, v23junkKey);
ok(v23rJunk.ok && v23jS.fishBag.length === 1, '百货店能回收杂物', v23rJunk.msg);

/* 全体力钓鱼 */
const v23allS = G.createState();
v23allS.energy = 21; v23allS.maxEnergy = 100; v23allS.bait.dough = 50;
G.setRng(mulberry32(11));
const v23rAllFish = G.fishAll(v23allS, 'dough');
ok(v23rAllFish.ok && v23rAllFish.count === 10 && v23allS.energy === 1, '全体力钓鱼：21 体力甩 10 杆', { n: v23rAllFish.count, e: v23allS.energy });
ok(Array.isArray(v23rAllFish.entries) && v23rAllFish.entries.length <= 12, '全体力钓鱼返回最近渔获', v23rAllFish.entries.length);
const v23noBait = G.createState();
v23noBait.energy = 20;
ok(!G.fishAll(v23noBait, 'dough').ok, '没饵时全体力钓鱼直接失败');

/* 新成就 */
const v23achNew = G.checkAchievements(Object.assign(G.createState(), { stats: { teas: 10, chests: 10 } }));
ok(v23achNew.some(x => x.id === 'tea10') && v23achNew.some(x => x.id === 'chest10'), '下午茶 / 开箱成就能解锁');
ok(G.ACH.length === 60, '成就总数 60', G.ACH.length);

/* ---------- 5f. v2.4 季节 ---------- */
section('v2.4 季节');

ok(G.CROP_LIST.length === 14, '作物扩到 14 种', G.CROP_LIST.length);
ok(G.isWinter(91) && !G.isWinter(90) && G.seasonOf(1) === '春' && G.seasonOf(121) === '春',
  '季节按 30 天一轮：冬 91-120，第 121 天回到春天',
  [G.seasonOf(1), G.seasonOf(31), G.seasonOf(61), G.seasonOf(91), G.seasonOf(121)]);

const v24S = G.createState();
v24S.coins = 5000;
v24S.seeds = { watermelon: 1, pumpkin: 1, carrot: 2 };
v24S.day = 1;                                     // 春
const pWater = G.plant(v24S, 0, 'watermelon');
ok(pWater.ok && pWater.off, '春天也能种西瓜（反季）', pWater.msg);
ok(v24S.plots[0].off === 1, '反季地块打上标记');
ok(G.needOf(v24S.plots[0]) === G.CROPS.watermelon.days * 2,
  '反季大作物生长时间翻倍', G.needOf(v24S.plots[0]));
const v28off = G.createState();
v28off.seeds = { chili: 1 }; v28off.day = 1;      // 春，辣椒是夏·秋
G.plant(v28off, 0, 'chili');
G.plant(v24S, 1, 'carrot');
ok(G.needOf(v24S.plots[1]) === G.CROPS.carrot.days, '当季不多花天数', G.needOf(v24S.plots[1]));
ok(G.expectedYield(v28off, v28off.plots[0]) === Math.max(1, G.CROPS.chili.base - 1),
  '反季第一茬少结 1 个', G.expectedYield(v28off, v28off.plots[0]));
ok(G.marketInfo(v24S, 'watermelon').total >= 2 - 1e-9, '反季西瓜市价 ×2 起');

const v24W = G.createState();
v24W.coins = 5000; v24W.day = 91;                 // 冬
v24W.seeds = { carrot: 1 };
ok(!G.plant(v24W, 0, 'carrot').ok, '冬天不能播种');
ok(!G.plantAll(v24W, 'carrot').ok, '冬天不能全部播种');
v24W.energy = 20; v24W.bait.dough = 10;
ok(!G.fish(v24W, 'dough').ok, '冬天不能钓鱼');
ok(!G.fishAll(v24W, 'dough').ok, '冬天不能全体力钓鱼');
ok(!G.buySeed(v24W, 'carrot', 1).ok, '冬天种子店歇业');

const v24Spr = G.createState();
v24Spr.coins = 5000; v24Spr.day = 1;
ok(!G.buySeed(v24Spr, 'watermelon', 1).ok, '春天西瓜种子要 Lv6 才解锁');
v24Spr.levels.farm = 6;
const v28buyOff = G.buySeed(v24Spr, 'watermelon', 1);
ok(v28buyOff.ok && v28buyOff.off && v28buyOff.cost === Math.ceil(36 * G.BALANCE.seed.offSeasonMul),
  '春天 Lv6 能买反季西瓜种子，价格 ×1.8', v28buyOff);
v24Spr.day = 31;
const v28buyIn = G.buySeed(v24Spr, 'watermelon', 1);
ok(v28buyIn.ok && !v28buyIn.off && v28buyIn.cost === 36, '夏天买西瓜种子是当季原价', v28buyIn);

const v24Net = G.createState();
v24Net.nets = 5; v24Net.bait.dough = 5; v24Net.day = 91;
const v24nr = G.netCatch(v24Net);
ok(v24nr.got === 0 && v24Net.bait.dough === 5, '冬天渔网不工作、也不耗饵', v24nr);

ok(G.TEAS.green.day === 1 && G.TEAS.coffee.day === 16, '茶提前到 D1 / D5 / D10 / D16',
  [G.TEAS.green.day, G.TEAS.black.day, G.TEAS.milk.day, G.TEAS.coffee.day]);

/* ---------- 5g. v2.5 四季特点 / 市场价格 ---------- */
section('v2.5 四季与市场');

G.setRng(mulberry32(77));
const wSpring = { sunny: 0, cloudy: 0, rain: 0, snow: 0 };
for (let i = 0; i < 4000; i++) wSpring[G.rollWeather(15)]++;
ok(wSpring.rain > wSpring.sunny && wSpring.snow === 0, '春天雨天最多、不下雪', wSpring);

const wSummer = { sunny: 0, cloudy: 0, rain: 0, snow: 0 };
for (let i = 0; i < 4000; i++) wSummer[G.rollWeather(45)]++;
ok(wSummer.sunny > wSummer.rain * 2, '夏天晴天明显更多', wSummer);

const wWinter = { sunny: 0, cloudy: 0, rain: 0, snow: 0 };
for (let i = 0; i < 4000; i++) wWinter[G.rollWeather(100)]++;
ok(wWinter.snow > 0 && wWinter.rain === 0, '冬天下雪、不下雨', wWinter);

/* 夏天浇水 2 体力 */
const v25w = G.createState();
v25w.day = 31; v25w.energy = 10; v25w.seeds = { potato: 1 };
G.plant(v25w, 0, 'potato');
G.water(v25w, 0);
ok(v25w.energy === 7, '夏天浇水花 2 体力（种下 1 + 浇水 2）', v25w.energy);
const v25w2 = G.createState();
v25w2.day = 1; v25w2.energy = 10; v25w2.seeds = { potato: 1 };
G.plant(v25w2, 0, 'potato');
G.water(v25w2, 0);
ok(v25w2.energy === 8, '春天浇水花 1 体力（种下 1 + 浇水 1）', v25w2.energy);

/* 秋天收获 +1 */
function v25harvest(day) {
  G.setRng(mulberry32(42));
  const st = G.createState();
  st.day = day; st.energy = 10; st.seeds = { carrot: 1 };
  G.plant(st, 0, 'carrot');
  st.plots[0].phase = 'ripe';
  st.plots[0].ripeDay = st.day - 1;
  return G.harvest(st, 0).qty;
}
ok(v25harvest(61) === v25harvest(1) + 1, '秋天收获 +1 个', [v25harvest(1), v25harvest(61)]);

/* 市场：供需 + 季节 */
const v25m = G.createState();
const v25base = G.marketMul(v25m, 'carrot');
ok(Math.abs(v25base - 1.3) < 1e-9, '没人卖过：稀缺 ×1.30 × 当季 ×1.0', v25base);
G.addSupply(v25m, 'carrot', 15);
ok(G.marketMul(v25m, 'carrot') < v25base, '卖得越多越便宜', G.marketMul(v25m, 'carrot'));
G.addSupply(v25m, 'carrot', 100);
ok(Math.abs(G.marketInfo(v25m, 'carrot').supply - 0.7) < 1e-9, '供给有 ×0.70 下限');
ok(Math.abs(G.marketInfo(v25m, 'watermelon').season - 1.7) < 1e-9, '反季作物 ×1.7');

/* 睡觉后销量衰减 25% */
const v25d = G.createState();
v25d.coins = 500;
G.addStore(v25d, 'carrot', 'std', 10);
G.sellOne(v25d, 'carrot');
const v25sold = v25d.market.carrot.sold;
G.sleep(v25d);
ok(!v25d.market.carrot || Math.abs(v25d.market.carrot.sold - v25sold * 0.75) < 1e-9,
  '睡觉后市场销量回落 25%', v25sold);

/* ---------- 5h. v2.6 渔获合并 / 鱼市价 / 长期订单提前奖励 ---------- */
section('v2.6 渔获合并与鱼市价');

const v26f = G.createState();
v26f.fishBag.push({ name: '鲫鱼', emoji: '🐟', q: 'good', v: 4, d: 1 });
v26f.fishBag.push({ name: '鲫鱼', emoji: '🐟', q: 'std', v: 3, d: 1 });
v26f.fishBag.push({ name: '鲫鱼', emoji: '🐟', q: 'bad', v: 1, d: 1 });
v26f.fishBag.push({ name: '鲤鱼', emoji: '🐟', q: 'std', v: 6, d: 1 });
const v26g = G.fishGroups(v26f, 'fish');
ok(v26g.length === 2, '同名不同品质合并成一组', v26g.map(function (g) { return g.name + '×' + g.count; }));
const v26cru = v26g.filter(function (g) { return g.name === '鲫鱼'; })[0];
ok(v26cru.count === 3 && v26cru.total === 8 && v26cru.mix.length === 3, '合并组带品质构成与总价',
  { n: v26cru.count, total: v26cru.total, mix: v26cru.mix.length });

/* 卖出时品质差的先出 */
const v26sell = G.sellFishGroupN(v26f, G.fishKey(v26f.fishBag[0]), 2);
const v26left = v26f.fishBag.filter(function (e) { return e.name === '鲫鱼'; });
ok(v26sell.ok && v26sell.count === 2 && v26left.length === 1 && v26left[0].q === 'good',
  '同组卖出先卖差的品质', v26left.map(function (e) { return e.q; }));

/* 鱼市价：卖多了降价 */
const v26m = G.createState();
const v26base = G.fishMarketMul(v26m, '鲫鱼');
G.addFishSupply(v26m, '鲫鱼', 20);
ok(G.fishMarketMul(v26m, '鲫鱼') < v26base, '鱼卖得多也会降价', G.fishMarketMul(v26m, '鲫鱼'));

/* 反季溢价 */
const v26season = G.marketInfo(G.createState(), 'watermelon');
ok(Math.abs(v26season.season - 1.7) < 1e-9 && !v26season.inSeason, '反季作物 ×1.7', v26season.season);
const v26in = G.marketInfo(Object.assign(G.createState(), { day: 31 }), 'watermelon');
ok(v26in.inSeason && Math.abs(v26in.season - 1) < 1e-9, '当季作物 ×1.00', v26in.season);

/* 长期订单提前奖励 */
function v26long(daysLeft) {
  const st = G.createState();
  st.day = 40;
  st.longOrder = { id: 'L1', kind: 'crop', crop: 'carrot', name: '萝卜', emoji: '🥕',
                   qty: 1, reward: 100, deadline: 40 + daysLeft, done: false };
  G.addStore(st, 'carrot', 'std', 5);
  const before = st.coins;
  const r = G.deliverLong(st);
  return { gain: st.coins - before, bonus: r.bonus || 0 };
}
const v26onTime = v26long(0);
ok(v26onTime.gain === 100 && v26onTime.bonus === 0, '卡点交付没有额外奖励', v26onTime);
const v26early = v26long(3);
ok(v26early.gain === 130 && v26early.bonus === 30, '提前 3 天 +30%', v26early);
const v26max = v26long(9);
ok(v26max.gain === 150 && v26max.bonus === 50, '提前奖励封顶 +50%', v26max);

/* ---------- 5i. v2.7 鱼汛 / 杂物不吃市价 / 商店买价 ---------- */
section('v2.7 鱼汛与市价');

ok(!G.fishSeasonOk('puffer', 1) && G.fishSeasonOk('puffer', 61), '河豚只在秋天有汛期',
  [G.fishSeasonOk('puffer', 1), G.fishSeasonOk('puffer', 61)]);
ok(G.fishSeasonText('crucian') === '春·秋', '鲫鱼汛期 春·秋', G.fishSeasonText('crucian'));

function v27count(day, times) {
  G.setRng(mulberry32(123));
  const st = G.createState();
  st.day = day; st.bait.dough = 1e9; st.energy = 1e9; st.maxEnergy = 1e9;
  let n = 0;
  for (let i = 0; i < times; i++) {
    st.energy = 10;
    const r = G.fish(st, 'dough');
    if (r.ok && r.entry && !r.entry.empty && r.entry.fish === '河豚') n++;
  }
  return n;
}
const v27spring = v27count(31, 3000);   // 夏（河豚非汛期）
const v27autumn = v27count(61, 3000);   // 秋（汛期）
ok(v27autumn > v27spring * 2, '汛期河豚明显更多', [v27spring, v27autumn]);

const v27box = G.createState();
v27box.fishBag.push({ name: '易拉罐', emoji: '🥫', q: null, v: 1, d: 1, no: true, trash: true });
const v27r = G.boxPutFish(v27box, G.fishKey(v27box.fishBag[0]), 1);
ok(v27r.ok && v27r.v === 1, '杂物进收购箱不吃市价', v27r.v);
ok(!v27box.marketF['易拉罐'], '杂物不计入市场销量');

const v27s = G.createState();
const v27p0 = G.cropBuyPrice('carrot', v27s);
G.addSupply(v27s, 'carrot', 20);
ok(G.cropBuyPrice('carrot', v27s) < v27p0, '卖得多，商店买价也跟着降',
  [v27p0, G.cropBuyPrice('carrot', v27s)]);

/* ---------- 5j. v2.8 汛期定价 / 渔网重布 / 反季种子 ---------- */
section('v2.8 汛期定价与渔网重布');

/* 鱼市价：汛期 ×1，非汛期 ×2 */
const v28fs = G.createState();
v28fs.day = 61;                                   // 秋
ok(G.fishSeasonOk('koi', 61) === false, '秋天锦鲤非汛期');
const v28koiAut = G.fishMarketInfo(v28fs, '锦鲤');
ok(Math.abs(v28koiAut.season - 1.7) < 1e-9 && !v28koiAut.inRun, '非汛期鱼价 ×1.7', v28koiAut.season);
const v28koiSpr = G.fishMarketInfo(Object.assign(G.createState(), { day: 1 }), '锦鲤');
ok(Math.abs(v28koiSpr.season - 1) < 1e-9 && v28koiSpr.inRun, '汛期鱼价 ×1', v28koiSpr.season);
ok(v28koiAut.total > v28koiSpr.total * 1.5, '非汛期卖锦鲤更贵', [v28koiSpr.total, v28koiAut.total]);

/* 市场系数：稀缺 ×1.30 + 反季 ×1.7 → 最高 ×2.21 */
const v28mk = G.createState();
v28mk.day = 1;                                    // 春
ok(Math.abs(G.marketMul(v28mk, 'watermelon') - 2.21) < 1e-9,
  '反季 + 稀缺最高 ×2.21', G.marketMul(v28mk, 'watermelon'));

/* 渔网：不缴维护费、抓完要重布、重布 1 体力/张 */
ok(G.BALANCE.upkeep.net === 0, '渔网维护费归零');
ok(G.NET_COST === 50, '渔网 50 金/张', G.NET_COST);

const v28net = G.createState();
v28net.levels.fish = 5; v28net.coins = 1000;
v28net.nets = 3; v28net.netSet = 3;
ok(G.netSetCount(v28net) === 3 && G.netPending(v28net) === 0, '三张网都布置好了');
G.setRng(function () { return 0.1; });            // 必上鱼
v28net.bait.dough = 3;
const v28nc = G.netCatch(v28net);
ok(v28nc.got === 3 && G.netSetCount(v28net) === 0 && G.netPending(v28net) === 3,
  '抓完鱼三张网都掉了，要重布', [v28nc.got, G.netSetCount(v28net)]);
const v28rc = G.netResetCost(v28net);
ok(v28rc === 3, '重布 3 张 = 3 体力', v28rc);
v28net.energy = 10;
ok(G.resetNets(v28net).ok && v28net.energy === 10 - v28rc && G.netSetCount(v28net) === 3,
  '重布扣体力、网恢复', [v28net.energy, G.netSetCount(v28net)]);
ok(!G.resetNets(v28net).ok, '都布好了不用再重布');

/* 没布置的网当晚不出货 */
const v28idle = G.createState();
v28idle.nets = 2; v28idle.netSet = 0; v28idle.bait.dough = 5;
const v28ir = G.netCatch(v28idle);
ok(v28ir.used === 0 && v28idle.bait.dough === 5, '没布置的网不耗饵、不抓鱼', v28ir.used);

/* 体力不够时只能布一部分 */
const v28poor = G.createState();
v28poor.nets = 5; v28poor.netSet = 0; v28poor.energy = 2;
const v28pr = G.resetNets(v28poor);
ok(v28pr.ok && v28pr.n === 2 && v28poor.energy === 0 && G.netSetCount(v28poor) === 2,
  '体力不够只布一部分', [v28pr.n, G.netSetCount(v28poor)]);

/* 买渔网默认已布置；老存档 netSet 缺失按全布好处理 */
const v28buy = G.createState();
v28buy.levels.fish = 5; v28buy.coins = 1000;
G.buyNet(v28buy);
ok(v28buy.nets === 1 && G.netSetCount(v28buy) === 1, '新买的网直接布好');
const v28old = JSON.parse(G.serialize(G.createState()));
v28old.nets = 4; delete v28old.netSet; delete v28old.shop; delete v28old.ach;
ok(G.netSetCount(G.deserialize(v28old)) === 4, '老存档渔网默认全布好');

/* 反季种植：生长 +2 天、第一茬 -1 个，卖价 ×1.7，种子 ×1.8 */
const v28pl = G.createState();
v28pl.coins = 5000; v28pl.day = 1;
v28pl.levels.farm = 3;
v28pl.seeds = { chili: 2 };
const v28seedAt1 = G.seedBuyPrice(G.CROPS.chili, v28pl);
ok(v28seedAt1 === Math.ceil(20 * 1.8), '春天买辣椒（反季）种子 36 金', v28seedAt1);
v28pl.day = 31;
ok(G.seedBuyPrice(G.CROPS.chili, v28pl) === 20, '夏天买辣椒种子回到 20 金');
v28pl.day = 1;
G.plant(v28pl, 0, 'chili');
const v28yOff = G.expectedYield(v28pl, v28pl.plots[0]);
const v28pl2 = G.createState();
v28pl2.seeds = { chili: 1 }; v28pl2.day = 31;
G.plant(v28pl2, 0, 'chili');
const v28yIn = G.expectedYield(v28pl2, v28pl2.plots[0]);
ok(v28yOff === v28yIn - 1, '反季第一茬少 1 个', [v28yOff, v28yIn]);
ok(G.marketMul(v28pl, 'chili') > G.marketMul(v28pl2, 'chili'), '反季辣椒比当季贵',
  [G.marketMul(v28pl, 'chili'), G.marketMul(v28pl2, 'chili')]);

/* 商店售价整体降了 */
ok(G.BALANCE.shop.priceMul === 1.25 && G.BALANCE.shop.cropPriceMul === 1.25,
  '水产店 / 农产品店进价系数 1.25');

/* ---------- 5k. v2.9 渔夫 / 自动重布 / 委托市价溢价 ---------- */
section('v2.9 渔夫与自动重布');

/* 多收作物：反季每茬都 −1 */
const v29m = G.createState();
v29m.day = 1;                                    // 春，黄瓜（夏）是反季
v29m.seeds = { cucumber: 1 };
G.plant(v29m, 0, 'cucumber');
const v29p = v29m.plots[0];
v29p.phase = 'regrow'; v29p.hits = 1;
ok(G.expectedYield(v29m, v29p) === Math.max(1, G.CROPS.cucumber.regrowQty - 1),
  '反季多收：后续茬也 −1', G.expectedYield(v29m, v29p));
v29p.phase = 'growing'; v29p.hits = 0;
ok(G.expectedYield(v29m, v29p) === Math.max(1, G.CROPS.cucumber.firstQty - 1),
  '反季多收：第一茬 −1', G.expectedYield(v29m, v29p));
const v29in = G.createState();
v29in.day = 31; v29in.seeds = { cucumber: 1 };
G.plant(v29in, 0, 'cucumber');
ok(G.expectedYield(v29in, v29in.plots[0]) === G.CROPS.cucumber.firstQty, '当季多收不减产');

/* 渔网 80% */
ok(Math.abs(G.NET_CHANCE - 0.8) < 1e-9, '渔网上鱼率 80%', G.NET_CHANCE);

/* 渔夫：等级门槛 / 雇佣 / 等级效果 */
const v29f = G.createState();
v29f.coins = 5000; v29f.levels.fish = G.BALANCE.gate.fisher - 1;
ok(!G.hireFisher(v29f).ok, '钓鱼等级不够雇不到渔夫');
v29f.levels.fish = G.BALANCE.gate.fisher;
const v29hire = G.hireFisher(v29f);
ok(v29hire.ok && !!v29f.fisher && v29f.fisher.lv === 1 && v29f.coins === 5000 - G.BALANCE.fisher.hire,
  '够等级就能雇，Lv1 上岗', v29f.coins);
ok(G.fisherCasts(v29f) === 3 && G.fisherWage(v29f) === 8, 'Lv1 每天 3 杆、工资 8 金',
  [G.fisherCasts(v29f), G.fisherWage(v29f)]);
ok(!G.hireFisher(v29f).ok, '不能重复雇佣');

/* 花钱升级：杆数 +1、工资 +5 */
const v29u = G.createState();
v29u.coins = 5000; v29u.levels.fish = G.BALANCE.gate.fisher;
G.hireFisher(v29u);
const v29cost = G.fisherUpCost(v29u);
ok(v29cost === G.BALANCE.fisher.upCost, '升级费 = 120 × 等级', v29cost);
const v29coin0 = v29u.coins;
ok(G.fisherUp(v29u).ok && G.fisherLv(v29u) === 2 && v29u.coins === v29coin0 - v29cost, '花钱升到 Lv2');
ok(G.fisherCasts(v29u) === 4 && G.fisherWage(v29u) === 12, 'Lv2 每天 4 杆、工资 12 金',
  [G.fisherCasts(v29u), G.fisherWage(v29u)]);
ok(G.fisherHookBonus(v29u) > 0 && G.fisherGoodBonus(v29u) > 1, '渔夫等级提升咬钩与好鱼',
  [G.fisherHookBonus(v29u), G.fisherGoodBonus(v29u)]);

/* 代钓：耗饵、不耗体力、不给玩家经验、自己涨经验 */
const v29c = G.createState();
v29c.fisher = { lv: 1, xp: 0 };
v29c.levels.fish = 5; v29c.bait.dough = 20; v29c.energy = 0;
const v29xp0 = v29c.levels.fishXp;
G.setRng(function () { return 0.1; });
const v29fc = G.fisherCatch(v29c);
ok(v29fc.casts === 3 && v29c.bait.dough === 17, '渔夫甩 3 杆、吃掉 3 份面团饵',
  [v29fc.casts, v29c.bait.dough]);
ok(v29fc.got > 0, '渔夫真的钓到鱼', v29fc.got);
ok(v29c.energy === 0, '渔夫不耗玩家体力');
ok(v29c.levels.fishXp === v29xp0 && v29c.levels.fish === 5, '渔夫代钓不给玩家经验');
ok(v29c.fisher.lv > 1 || v29c.fisher.xp > 0, '渔夫自己攒经验', v29c.fisher);

/* 钓得够多会自己升级 */
const v29l = G.createState();
v29l.fisher = { lv: 3, xp: 0 };
v29l.bait.dough = 200; v29l.energy = 0;
G.setRng(function () { return 0.1; });
for (let i = 0; i < 5; i++) G.fisherCatch(v29l);
ok(G.fisherLv(v29l) > 3, '钓多了会自己升级', [G.fisherLv(v29l), v29l.fisher.xp || 0]);

/* 满级封顶 */
const v29max = G.createState();
v29max.fisher = { lv: G.BALANCE.fisher.max, xp: 0 };
v29max.coins = 99999;
ok(!G.fisherUp(v29max).ok && G.fisherUpCost(v29max) === 0, '满级后不能再升');
ok(G.fireFisher(v29max).ok && !v29max.fisher, '可以辞退渔夫');

/* 睡觉：扣伙食 + 工资 + 重布渔网 */
const v29w = G.createState();
v29w.coins = 1000; v29w.day = 2; v29w.levels.fish = G.BALANCE.gate.fisher;
G.hireFisher(v29w);
v29w.nets = 2; v29w.netSet = 0; v29w.bait.dough = 0; v29w.energy = 0;
G.sleep(v29w);
ok(v29w.coins === 1000 - G.BALANCE.fisher.hire - G.mealFee(v29w) - 8,
  '睡觉扣伙食 + 渔夫工资（Lv1 = 8 金）', v29w.coins);
ok(v29w.netSet === 2, '渔夫替你把渔网全重布了', v29w.netSet);

/* 发不出工资就罢工 */
const v29b = G.createState();
v29b.coins = 10; v29b.fisher = { lv: 1, xp: 0 }; v29b.bait.dough = 8;
G.sleep(v29b);
ok(v29b.fishBag.length === 0, '发不出工资，渔夫罢工不钓鱼', v29b.coins);

/* 冬天渔夫休息、不发工资 */
const v29wt = G.createState();
v29wt.day = 90; v29wt.coins = 500; v29wt.fisher = { lv: 1, xp: 0 }; v29wt.bait.dough = 8;
G.sleep(v29wt);
ok(G.isWinter(v29wt.day) && v29wt.coins === 500 - G.mealFee(v29wt) && v29wt.fishBag.length === 0,
  '冬天渔夫休息、不发工资', v29wt.coins);

/* 老存档 fisher:true 迁移成 Lv1 */
const v29old = JSON.parse(G.serialize(G.createState()));
v29old.fisher = true;
ok(G.fisherLv(G.deserialize(v29old)) === 1, '老存档渔夫迁移成 Lv1');

/* 自动重布已经删掉 */
ok(!('toggleNetAuto' in G), '自动重布开关已移除');

/* ---------- 5l. v2.11 采集 / 小镇 / 委托封顶 ---------- */
section('v2.11 采集与小镇');

/* 采集：每个季节不同的野货 */
ok(G.CROP_LIST.length === 14 && G.WILD_LIST.length === 4, '14 种作物 + 4 种野货',
  [G.CROP_LIST.length, G.WILD_LIST.length]);
ok(G.WILD_LIST.every(function (w) { return w.seed == null; }), '野货没有种子，种不了');
ok(G.orderPool(99, 10).every(function (c) { return !c.wild; }), '委托池不含野货');
ok(Object.keys(G.rollCropStock(99)).every(function (id) { return !G.CROPS[id].wild; }),
  '农产品店不进野货');

const v31 = G.createState();
v31.energy = 50;
const v31r1 = G.forage(v31);
ok(v31r1.ok && v31r1.wild === 'shepherd', '春天采到荠菜', v31r1.wild);
ok(v31.energy === 50 - G.BALANCE.forage.energy && G.storeCount(v31, 'shepherd') === v31r1.qty,
  '采集扣 5 体力并进仓库', [v31.energy, G.storeCount(v31, 'shepherd')]);
ok(v31r1.qty >= 1 && v31r1.qty <= 3, '采集一次 1~3 件', v31r1.qty);
v31.day = 31;
ok(G.forage(v31).wild === 'berry', '夏天采到野莓');
v31.day = 61;
ok(G.forage(v31).wild === 'mushroom', '秋天采到松茸');
v31.day = 91;
ok(G.forage(v31).wild === 'frozenpear', '冬天也能采（冻梨）');
const v31no = G.createState();
v31no.energy = 2;
ok(!G.forage(v31no).ok, '体力不够采不了');
ok(G.marketInfo(v31, 'mushroom').total > 0, '野货也有市价');

/* 委托市价溢价封顶 */
const v31o = G.createState();
v31o.day = 30; v31o.levels.farm = 10;
G.setRng(mulberry32(11));
let v31max = 0;
for (let i = 0; i < 40; i++) {
  G.makeOrders(v31o).forEach(function (o) { if (o.mul > v31max) v31max = o.mul; });
}
ok(v31max > 1 && v31max <= G.BALANCE.market.orderCap + 1e-9, '委托市价溢价有封顶',
  [v31max, G.BALANCE.market.orderCap]);

/* 小镇捐赠 */
const v31t = G.createState();
v31t.coins = 40000;
ok(G.townTier(v31t) === 0 && !!G.townNext(v31t), '开局没有声望，有下一档');
ok(G.donate(v31t, 2000).ok && G.townTier(v31t) === 1 &&
   Math.abs(G.townBonus(v31t, 'orderBonus') - 0.05) < 1e-9, '捐 2000 解锁村口小摊（委托 +5%）');
G.donate(v31t, 6000);
ok(G.townTier(v31t) === 2 && Math.abs(G.townBonus(v31t, 'shopCut') - 0.10) < 1e-9,
  '再捐 6000 解锁镇上有名（进价 −10%）');
G.donate(v31t, 12000);
ok(G.townTier(v31t) === 3 && Math.abs(G.townBonus(v31t, 'marketBonus') - 0.08) < 1e-9,
  '捐满 20000 解锁商会会员（市价 +8%）');
ok(G.townNext(v31t) === null, '三档全解锁后没有下一档');
ok(!G.donate(G.createState(), 1e6).ok, '钱不够捐不了');

const v31e = G.createState();
const v31buy0 = G.cropBuyPrice('pumpkin', v31e);
const v31mk0 = G.marketMul(v31e, 'pumpkin');
v31e.townDonated = 20000;
ok(G.cropBuyPrice('pumpkin', v31e) < v31buy0, '小镇加成让进价变便宜',
  [v31buy0, G.cropBuyPrice('pumpkin', v31e)]);
ok(G.marketMul(v31e, 'pumpkin') > v31mk0, '商会会员让市价 +8%',
  [v31mk0, G.marketMul(v31e, 'pumpkin')]);

const v31o1 = G.createState(); v31o1.day = 30; v31o1.levels.farm = 10;
const v31o2 = G.createState(); v31o2.day = 30; v31o2.levels.farm = 10; v31o2.townDonated = 2000;
G.setRng(mulberry32(5));
const v31ord1 = G.makeOrders(v31o1).filter(function (o) { return o.kind === 'crop'; })[0];
G.setRng(mulberry32(5));
const v31ord2 = G.makeOrders(v31o2).filter(function (o) { return o.kind === 'crop'; })[0];
ok(v31ord2.reward > v31ord1.reward, '村口小摊让委托更值钱', [v31ord1.reward, v31ord2.reward]);

/* 行情「还能卖多少」 */
const v31h = G.createState();
const v31h0 = G.marketHeadroom(v31h, 'carrot');
ok(v31h0.toCalm === 10 && v31h0.toFloor === 40, '行情提示：再卖 10 件掉档、40 件到底',
  [v31h0.toCalm, v31h0.toFloor]);
G.addSupply(v31h, 'carrot', 40);
ok(G.marketHeadroom(v31h, 'carrot').atFloor, '卖到底价时提示已到底');

/* ---------- 5m. v2.12 价格历史 / 采集不受天气影响 ---------- */
section('v2.12 价格历史');

/* 采集不再吃天气 */
function v32forageQty(weather) {
  const st = G.createState();
  st.weather = weather; st.energy = 50;
  G.setRng(mulberry32(7));
  return G.forage(st).qty;
}
ok(v32forageQty('rain') === v32forageQty('sunny'), '采集不受天气影响（雨天和晴天一样）',
  [v32forageQty('rain'), v32forageQty('sunny')]);

/* 价格历史：开局 1 个点，每天 +1 */
const v32h = G.createState();
ok(G.marketSeries(v32h, 'carrot', 1).length === 1, '开局就记了 1 个价格点');
v32h.coins = 99999;
for (let i = 0; i < 5; i++) G.sleep(v32h);
ok(G.marketSeries(v32h, 'carrot', 1).length === 6, '每天睡醒多一个点',
  G.marketSeries(v32h, 'carrot', 1).length);
ok(G.marketSeries(v32h, 'f:鲫鱼', 1).length === 6, '鱼也有独立的历史');

/* 同一天不重复记，实时值覆盖当天 */
const v32l = G.createState();
const v32s = G.marketSeries(v32l, 'carrot', 2.5);
ok(v32s.length === 1 && v32s[0] === 2.5, '当天那个点用实时值覆盖', v32s);
G.sleep(v32l);
const v32s2 = G.marketSeries(v32l, 'carrot', 1.8);
ok(v32s2.length === 2 && v32s2[1] === 1.8, '第二天追加新点', v32s2);

/* 上限 30 天 */
const v32c = G.createState();
v32c.coins = 1e6;
for (let i = 0; i < 40; i++) G.sleep(v32c);
ok(v32c.marketHist.carrot.length === G.HIST_DAYS, '历史最多保留 30 天',
  v32c.marketHist.carrot.length);

/* 下季系数 */
const v32n = G.createState();
ok(G.nextSeasonIdx(1) === 1 && G.nextSeasonIdx(61) === 3, '春季下一季是夏、秋季下一季是冬',
  [G.nextSeasonIdx(1), G.nextSeasonIdx(61)]);
ok(G.cropNextSeasonMul(v32n, 'watermelon') === 1, '西瓜下季（夏）是当季');
ok(G.cropNextSeasonMul(v32n, 'pumpkin') === G.BALANCE.market.offSeason, '南瓜下季转反季',
  G.cropNextSeasonMul(v32n, 'pumpkin'));
ok(G.fishNextSeasonMul(v32n, '锦鲤') === G.BALANCE.market.offSeason, '锦鲤下季转非汛期');

/* ---------- 5n. v2.13 采集/高级假饵/茶叶/自动播种器 ---------- */
section('v2.13 高级假饵与自动播种器');

ok(Math.abs(G.BALANCE.market.offSeason - 1.7) < 1e-9, '反季系数改成 ×1.7');

/* 采集：5 体力、1~3 件 */
const v33 = G.createState();
G.setRng(mulberry32(3));
const q33 = [];
for (let i = 0; i < 300; i++) { v33.energy = 50; q33.push(G.forage(v33).qty); }
ok(Math.min.apply(null, q33) === 1 && Math.max.apply(null, q33) === 3, '采集能出 1~3 件',
  [Math.min.apply(null, q33), Math.max.apply(null, q33)]);
const avg33 = q33.reduce(function (a, b) { return a + b; }, 0) / q33.length;
ok(Math.abs(avg33 - 2.1) < 0.15, '采集期望约 2.1 件', avg33.toFixed(2));
const v33b = G.createState();
v33b.energy = 50;
G.forage(v33b);
ok(v33b.energy === 45, '采集扣 5 体力', v33b.energy);
const v33b2 = G.createState();
v33b2.levels.forage = G.BALANCE.level.max;
v33b2.energy = 50;
G.forage(v33b2);
ok(v33b2.energy === 46, '采集满级只花 4 体力', v33b2.energy);

/* 高级假饵：钓鱼 Lv6 + 交易 Lv3 */
const v33f = G.createState();
v33f.coins = 1000; v33f.levels.fish = G.BALANCE.gate.lure2 - 1;
ok(!G.buyBait(v33f, 'lure2', 1).ok, '等级不够买不到高级假饵');
v33f.levels.fish = G.BALANCE.gate.lure2;
ok(!G.buyBait(v33f, 'lure2', 1).ok, '钓鱼到级但交易等级不够也买不到');
v33f.levels.trade = G.BALANCE.gate.lure2Trade;
const v33buy = G.buyBait(v33f, 'lure2', 1);
ok(v33buy.ok && v33f.lure2.owned && v33f.lure2.dur === 100 && v33f.coins === 1000 - 20,
  '钓鱼 Lv' + G.BALANCE.gate.lure2 + ' + 交易 Lv' + G.BALANCE.gate.lure2Trade +
  ' 能买高级假饵（20 金 / 100 耐久）', v33f.coins);
ok(Math.abs(G.HOOK.lure2 - G.HOOK.dough) < 1e-9, '高级假饵咬钩率 = 面团饵');
ok(G.BALANCE.bait.lureGood === 1.10 && G.BALANCE.bait.lureTrash === 0.3, '假饵 / 高级假饵好鱼率 ×1.10');

const v33c = G.createState();
v33c.lure2 = { owned: true, dur: 5 };
v33c.weather = 'cloudy';
G.setRng(function () { return 0.5; });
const v33cast = G.fish(v33c, 'lure2');
ok(v33cast.ok && v33c.lure2.dur === 4, '用高级假饵钓一杆扣 1 耐久', v33c.lure2.dur);

/* 茶叶回收已删 */
ok(!G.sellTea && !G.teaSellPrice, '茶叶回收接口已移除');
const v33t = G.createState();
v33t.coins = 100;
G.buyTea(v33t, 'green', 2);
ok(v33t.coins === 76 && v33t.teas.green === 2, '买茶只出不进（2 杯绿茶 -24）', v33t.coins);
ok(!Object.prototype.hasOwnProperty.call(v33t, 'teaSell'), '存档里没有茶叶回收字段');

/* 自动播种器：一台只管 5 块，按台数买，每周维护 */
const v33s = G.createState();
v33s.coins = 3000; v33s.levels.farm = G.BALANCE.gate.seeder - 1;
ok(!G.buySeeder(v33s).ok, '等级不够买不到自动播种器');
v33s.levels.farm = G.BALANCE.gate.seeder;
v33s.plots = new Array(10).fill(0).map(function () { return G.createState().plots[0]; });
ok(G.seederMax(v33s) === 2, '10 块地最多 2 台', G.seederMax(v33s));
const v33sb = G.buySeeder(v33s);
ok(v33sb.ok && v33s.seeder === 1 && v33s.coins === 3000 - G.SEEDER_COST, '买到第 1 台自动播种器', v33s.coins);
ok(G.seederPlots(v33s) === 5, '一台只覆盖 5 块地', G.seederPlots(v33s));
ok(G.deviceUpkeep(v33s) === G.BALANCE.upkeep.seeder, '播种器每周 6 金维护费', G.deviceUpkeep(v33s));
ok(!G.setAutoSeed(v33s, 1, 'carrot').ok, '没种子时选不了播种品种');
v33s.seeds = { carrot: 20 };
ok(G.setAutoSeed(v33s, 1, 'carrot').ok && G.autoSeedOf(v33s, 1) === 'carrot', '选上萝卜种子');
G.sleep(v33s);
const v33planted = v33s.plots.filter(function (p) { return p.crop; }).length;
ok(v33planted === 5, '一台只播 5 块', v33planted);
ok(v33s.seeds.carrot === 15 && v33s.stats.planted === 5, '消耗 5 颗种子', v33s.seeds.carrot);
ok(G.buySeeder(v33s).ok && v33s.seeder === 2 && G.seederPlots(v33s) === 10, '买第 2 台后覆盖 10 块');
ok(!G.buySeeder(v33s).ok, '10 块地只容得下 2 台');
ok(G.deviceUpkeep(v33s) === G.BALANCE.upkeep.seeder * 2, '两台维护 12 金/周', G.deviceUpkeep(v33s));

/* 两台一起播：一晚补满 10 块 */
const v33s2 = G.createState();
v33s2.coins = 3000; v33s2.levels.farm = G.BALANCE.gate.seeder;
v33s2.plots = new Array(10).fill(0).map(function () { return G.createState().plots[0]; });
v33s2.seeds = { carrot: 20 };
G.buySeeder(v33s2); G.buySeeder(v33s2);
G.setAutoSeed(v33s2, 1, 'carrot'); G.setAutoSeed(v33s2, 2, 'carrot');
G.sleep(v33s2);
ok(v33s2.plots.filter(function (p) { return p.crop; }).length === 10, '两台一晚播满 10 块',
  v33s2.plots.filter(function (p) { return p.crop; }).length);
ok(v33s2.seeds.carrot === 10, '两台共耗 10 颗种子', v33s2.seeds.carrot);

/* 老存档 seeder: true → 1 台 */
const v33mig = G.deserialize(Object.assign(JSON.parse(G.serialize(G.createState())), { seeder: true }));
ok(v33mig.seeder === 1, '老存档的布尔播种器迁移成 1 台', v33mig.seeder);

/* v2.15：一台只管自己那 5 块地 */
const v35 = G.createState();
v35.coins = 3000; v35.levels.farm = G.BALANCE.gate.seeder;
v35.plots = new Array(10).fill(0).map(function () { return G.createState().plots[0]; });
v35.seeds = { carrot: 20 };
G.buySeeder(v35);
G.setAutoSeed(v35, 1, 'carrot');
ok(G.seederPlateOf(v35, 4) === 1 && G.seederPlateOf(v35, 5) === 0, '第 1 台只管 1–5 块');
ok(G.seederPlateRange(2).from === 6 && G.seederPlateRange(2).to === 10, '第 2 台号段 6–10');
/* 第 1 台没种子时，第 2 台（如果有）也不会替它种 */
v35.seeds.carrot = 0;
G.sleep(v35);
ok(v35.plots.every(function (p) { return !p.crop; }), '没种子时整排都不播');

/* 收完立刻补种（机器管这块地） */
const v35h = G.createState();
v35h.coins = 3000; v35h.levels.farm = G.BALANCE.gate.seeder;
v35h.seeder = 1; v35h.seederOn = true; v35h.autoSeeds = ['carrot'];
v35h.seeds = { carrot: 5 };
v35h.day = 10;
v35h.plots[0] = { crop: 'carrot', growth: 2, watered: true, missed: 0, fert: 0,
  ripeDay: 9, hits: 0, phase: 'ripe', planted: 7, auto: 0 };
const v35hr = G.harvest(v35h, 0);
ok(v35hr.ok && v35hr.replanted === 'carrot', '收获后播种器立刻补种', v35hr.replanted);
ok(v35h.plots[0].crop === 'carrot' && v35h.plots[0].phase === 'growing' &&
  v35h.plots[0].growth === 0, '补种的是同一块地');
ok(v35h.seeds.carrot === 4, '补种消耗 1 颗种子', v35h.seeds.carrot);
ok(v35h.energy === v35h.maxEnergy - 1, '补种本身不耗体力（只扣收获那 1 点）', v35h.energy);

/* 没机器的地不补种 */
const v35n = G.createState();
v35n.seeds = { carrot: 5 };
v35n.day = 10;
v35n.plots = new Array(10).fill(0).map(function () { return G.createState().plots[0]; });
v35n.plots[9] = { crop: 'carrot', growth: 2, watered: true, missed: 0, fert: 0,
  ripeDay: 9, hits: 0, phase: 'ripe', planted: 7, auto: 0 };
const v35nr = G.harvest(v35n, 9);
ok(v35nr.ok && !v35nr.replanted && !v35n.plots[9].crop, '没有播种器的地不补种');

/* 挖蚯蚓等级：每次 +2 经验，满级 2 体力 */
const v35d = G.createState();
v35d.energy = 30;
const v35dig = G.digWorms(v35d);
ok(v35dig.ok && v35d.energy === 27, '挖蚯蚓扣 3 体力', v35d.energy);
ok(v35d.levels.digXp === G.BALANCE.dig.xp, '挖一次 +2 经验', v35d.levels.digXp);
const v35d2 = G.createState();
v35d2.levels.dig = G.BALANCE.level.max;
v35d2.energy = 30;
G.digWorms(v35d2);
ok(v35d2.energy === 28, '挖蚯蚓满级只花 2 体力', v35d2.energy);
ok(G.levelEffectText('dig', 10).indexOf('2 体力') >= 0, '满级效果文案写 2 体力',
  G.levelEffectText('dig', 10));

/* 采集等级 + 采集记录 + 成就 */
const v35f = G.createState();
v35f.energy = 50;
G.setRng(mulberry32(5));
const v35fr = G.forage(v35f);
ok(v35fr.ok && v35f.levels.forageXp >= G.BALANCE.forage.xp, '采集给经验', v35f.levels.forageXp);
ok(v35f.stats.wild[v35fr.wild] === v35fr.qty, '采集记录按野货累计', v35f.stats.wild);
ok(v35f.stats.forageBest >= 1, '记录单次最多件数', v35f.stats.forageBest);
ok(G.levelEffectText('forage', 10).indexOf('4 体力') >= 0, '采集满级效果写 4 体力',
  G.levelEffectText('forage', 10));

const v35ach = G.createState();
v35ach.stats.forages = 1;
const v35got = G.checkAchievements(v35ach).map(function (a) { return a.id; });
ok(v35got.indexOf('forage1') >= 0, '采集成就：第一次进山', v35got.join(','));
v35ach.stats.wild = { shepherd: 1, berry: 1, mushroom: 1, frozenpear: 1 };
v35ach.stats.forageBest = 3;
v35ach.levels.forage = 5;
const v35got2 = G.checkAchievements(v35ach).map(function (a) { return a.id; });
ok(v35got2.indexOf('wild4') >= 0 && v35got2.indexOf('forage3') >= 0 &&
   v35got2.indexOf('forageLv5') >= 0, '四季野味 / 满载而归 / 认得百草都能解锁', v35got2.join(','));

/* ---------- v2.16：每台播种器各选各的种子 ---------- */
const v36 = G.createState();
v36.coins = 3000; v36.levels.farm = G.BALANCE.gate.seeder;
v36.plots = new Array(10).fill(0).map(function () { return G.createState().plots[0]; });
v36.seeds = { carrot: 10, potato: 10 };
G.buySeeder(v36); G.buySeeder(v36);
ok(G.setAutoSeed(v36, 1, 'carrot').ok && G.setAutoSeed(v36, 2, 'potato').ok, '两台各选各的种子');
ok(G.autoSeedOf(v36, 1) === 'carrot' && G.autoSeedOf(v36, 2) === 'potato', '每台的种子互不影响',
  [G.autoSeedOf(v36, 1), G.autoSeedOf(v36, 2)]);
ok(!G.setAutoSeed(v36, 3, 'carrot').ok, '没有第 3 台就选不了');
G.sleep(v36);
ok(v36.plots.slice(0, 5).every(function (p) { return p.crop === 'carrot'; }), '第 1 台只播萝卜');
ok(v36.plots.slice(5, 10).every(function (p) { return p.crop === 'potato'; }), '第 2 台只播土豆');

/* 收获补种也用各自那台选的种子 */
const v36h = G.createState();
v36h.coins = 3000; v36h.levels.farm = G.BALANCE.gate.seeder;
v36h.plots = new Array(10).fill(0).map(function () { return G.createState().plots[0]; });
v36h.seeds = { carrot: 5, potato: 5 };
v36h.seeder = 2; v36h.seederOn = true; v36h.autoSeeds = ['carrot', 'potato'];
v36h.day = 10;
v36h.plots[6] = { crop: 'carrot', growth: 2, watered: true, missed: 0, fert: 0,
  ripeDay: 9, hits: 0, phase: 'ripe', planted: 7, auto: 0 };
const v36hr = G.harvest(v36h, 6);
ok(v36hr.ok && v36hr.replanted === 'potato', '第 2 台的地收完补土豆', v36hr.replanted);

/* 老存档 autoSeed 复制给所有机器 */
const v36mig = G.deserialize(Object.assign(JSON.parse(G.serialize(G.createState())), {
  seeder: 2, autoSeed: 'carrot'
}));
ok(v36mig.autoSeeds.length === 2 && v36mig.autoSeeds[0] === 'carrot' && v36mig.autoSeeds[1] === 'carrot',
  '老存档单个 autoSeed 复制给两台', v36mig.autoSeeds);

/* ---------- v2.16：交易等级 ---------- */
const v36t = G.createState();
v36t.coins = 2000;
ok(G.tradeLv(v36t) === 1, '交易等级从 1 开始');
G.buySeed(v36t, 'carrot', 1);
ok(v36t.levels.tradeXp === Math.round(5 / G.BALANCE.trade.xpPer), '买种子按金额涨交易经验',
  v36t.levels.tradeXp);
const v36t2 = G.createState();
v36t2.coins = 2000;
G.levelNeed(1, 'trade');
ok(G.levelNeed(1, 'trade') === G.BALANCE.trade.xpBase, '交易等级用更长的曲线',
  G.levelNeed(1, 'trade'));
G.tradeXp(v36t2, 600);                        // 600 金 = 120 经验
ok(G.tradeLv(v36t2) >= 2, '交易额够就升级', G.tradeLv(v36t2));
/* 进价随交易等级下降 */
const v36p = G.createState();
const v36p10 = G.createState();
v36p10.levels.trade = G.BALANCE.level.max;
const seedFull = G.seedBuyPrice(G.CROPS.watermelon, v36p);
const seedCut = G.seedBuyPrice(G.CROPS.watermelon, v36p10);
ok(seedCut < seedFull, '交易满级时种子进价更低', [seedFull, seedCut]);
ok(Math.abs(G.tradeCut(v36p10) - (1 - G.BALANCE.trade.maxCut)) < 1e-9, '进价折扣封顶 4.5%',
  G.tradeCut(v36p10));

/* 挖蚯蚓 / 采集 Lv4、Lv8 加成 */
const v36d = G.createState();
v36d.levels.dig = 4;
ok(G.digYieldBonus(v36d) === 1, '挖蚯蚓 Lv4 产量 +1', G.digYieldBonus(v36d));
v36d.levels.dig = 8;
ok(G.digYieldBonus(v36d) === 2, '挖蚯蚓 Lv8 产量 +2', G.digYieldBonus(v36d));
G.setRng(mulberry32(2));
v36d.energy = 100; v36d.weather = 'cloudy';
const v36dn = G.digWorms(v36d).n;
ok(v36dn >= 3, 'Lv8 阴天至少挖 3 条', v36dn);
const v36f = G.createState();
v36f.levels.forage = 4;
ok(G.forageRolls(v36f) === 2, '采集 Lv4 品质取两次', G.forageRolls(v36f));
v36f.levels.forage = 8;
ok(G.forageRolls(v36f) === 3, '采集 Lv8 品质取三次', G.forageRolls(v36f));
ok(G.levelEffectText('forage', 8).indexOf('品质') >= 0, '采集等级文案写品质',
  G.levelEffectText('forage', 8));

const v33w = G.createState();
v33w.seeder = 2; v33w.seederOn = true; v33w.autoSeeds = ['carrot', 'carrot'];
v33w.seeds = { carrot: 10 }; v33w.day = 91; v33w.coins = 1000;
G.sleep(v33w);
ok(v33w.plots.every(function (p) { return !p.crop; }), '冬天自动播种器不工作');

/* 委托市价溢价：长期订单也吃 */
const v29L = G.createState();
G.setRng(mulberry32(9));
const v29lo = G.makeLongOrder(v29L);
if (v29lo.kind === 'crop') {
  ok(v29lo.mul > 0 && v29lo.reward === Math.round(v29lo.qty * G.CROPS[v29lo.crop].price * 2 * v29lo.mul),
    '长期订单报酬也含市价溢价', v29lo.mul);
} else {
  ok(v29lo.kind === 'fish', '这次摇到鱼单（跳过作物市价断言）');
}

/* ---------- 6. 存读档 ---------- */
section('存读档');
s = G.createState();
s.seeds = { corn: 1 };
G.plant(s, 0, 'corn');
const round = G.deserialize(G.serialize(s));
ok(round.plots[0].crop === 'corn' && round.coins === s.coins, '序列化往返一致');
ok(round.plots.length === 5 && round.fishBook.count === 0, '结构完整');

/* 存档导入是唯一的外部输入：自由文本必须洗掉能组成标签 / 属性的字符 */
const dirtySave = JSON.parse(G.serialize(G.createState()));
dirtySave.log = [{ day: 1, text: '<img src=x onerror=alert(1)>', kind: 'info' }];
dirtySave.ledger = [{ day: 1, label: '<b>注入</b>', income: 1, expense: 0, balance: 50 }];
dirtySave.fishBag = [{ name: '<iframe src=//x>', emoji: '<u>', q: 'std', v: 3, d: 1 }];
dirtySave.seeds = { '<img>': 2, carrot: 1 };
dirtySave.fishBook = {
  count: 1,
  entries: [{ day: 1, fish: '<svg onload=alert(2)>', emoji: '<i>', quality: { id: 'fake', color: 'red' }, price: 3 }],
  best: { fish: '<img>', quality: null, price: 3, day: 1 },
  priciest: { fish: '<img>', quality: null, price: 3, day: 1 }
};
const cleanSave = G.deserialize(dirtySave);
ok(cleanSave.log[0].text.indexOf('<') < 0 && cleanSave.log[0].text.indexOf('onerror') >= 0,
   '导入日志文本被清洗', cleanSave.log[0].text);
ok(cleanSave.ledger[0].label.indexOf('<') < 0, '导入账本标签被清洗', cleanSave.ledger[0].label);
ok(cleanSave.fishBag[0].name.indexOf('<') < 0 && cleanSave.fishBag[0].emoji.indexOf('<') < 0,
   '导入渔获名称 / emoji 被清洗', [cleanSave.fishBag[0].name, cleanSave.fishBag[0].emoji]);
ok(cleanSave.fishBook.entries[0].fish.indexOf('<') < 0 &&
   cleanSave.fishBook.entries[0].quality === null &&
   cleanSave.fishBook.best.fish.indexOf('<') < 0,
   '导入钓鱼记录 / 假品质被清洗');
ok(Object.keys(cleanSave.seeds).join() === 'carrot' && cleanSave.seeds.carrot === 1,
   '导入的种子只保留认识的作物', cleanSave.seeds);

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

/* ---------- 8. 果园 ---------- */
section('果园');
{
G.setRng(mulberry32(11));
s = G.createState();
s.levels.farm = 6;
s.coins = 9000;
ok(!G.orchardUnlock(s).ok, '种田 Lv6 不能开垦果园');
s.levels.farm = 7;
const unlockRes = G.orchardUnlock(s);
ok(unlockRes.ok && G.orchardSlotCount(s) === 3 && s.coins === 6500,
   '种田 Lv7 + 2500 金开垦，先给 3 个树坑', { slots: G.orchardSlotCount(s), coins: s.coins });

ok(G.orchardExpandCost(s) === 600, '第 4 个树坑 600 金');
const growSlot = G.expandOrchard(s);
ok(growSlot.ok && G.orchardSlotCount(s) === 4, '花钱开第 4 个树坑', growSlot.msg);

s.coins = 20000;
while (G.orchardSlotCount(s) < G.orchardSlots()) G.expandOrchard(s);
ok(G.orchardSlotCount(s) === 8 && !G.expandOrchard(s).ok, '树坑最多 8 个');

const stockRes = G.buyTreeStock(s, 'peach', 'seed', 1);
ok(stockRes.ok && G.treeStockCount(s, 'peach', 'seed') === 1, '百货店买果树种子进库存', stockRes.msg);
ok(!G.plantTree(s, 2, 'mango', 'seed').ok, '没有种子时不能种');

s.day = 5;
const plantSeed = G.plantTree(s, 0, 'peach', 'seed');
ok(plantSeed.ok && G.treeStage(s, 0) === 'growing', '种下种子进入育苗');
ok(!G.plantTree(s, 0, 'peach', 'seed').ok, '同一个树坑不能重复种');

s.energy = 10;
const water1 = G.waterTree(s, 0);
ok(water1.ok && water1.n === 1 && s.energy === 9, '可单独给指定树坑浇水，消耗 1 体力', { n: water1.n, e: s.energy });
ok(!G.waterTree(s, 0).ok, '同一天不能重复浇同一棵树');

ok(!G.treeMature(s, 0), '种子尚未浇足并长够天数时不成树');
s.energy = 60;
for (let k = 1; k < 30; k++) { s.day++; G.waterOrchard(s); }
ok(G.treeProgress(s, 0).water === 30 && !G.treeNeedsWater(s, 0) && !G.treeMature(s, 0),
   '种子浇足 30 天后不必再浇，仍需等满 90 天', G.treeProgress(s, 0));
s.day = 95;
ok(G.treeMature(s, 0), '种子浇水 30 天 + 生长 90 天 → 成树',
   G.treeProgress(s, 0));

// 树苗：浇水 15 天 + 生长 30 天
G.buyTreeStock(s, 'apple', 'sapling', 1);
s.day = 200;
G.plantTree(s, 1, 'apple', 'sapling');
s.energy = 60;
for (let k = 0; k < 15; k++) { G.waterOrchard(s); s.day++; }
ok(G.treeProgress(s, 1).water === 15 && !G.treeMature(s, 1), '树苗浇够 15 天但还没长满 30 天不算成树');
ok(!G.treeNeedsWater(s, 1) && !G.waterTree(s, 1).ok && !G.waterOrchard(s).ok,
   '树苗浇够 15 天后不可再浇，即使尚未成熟');
s.day = 230;
ok(G.treeMature(s, 1), '树苗浇水 15 天 + 生长 30 天 → 成树');

function orchardYieldAt(rng) {
  const st = G.createState();
  st.day = 301;
  st.orchard = { unlocked: true, slots: [
    { id: 'apple', mode: 'sapling', planted: 1, water: 15, lastWater: 1, ripe: 0 }
  ] };
  G.setRng(() => rng);
  return G.orchardTick(st, 300).fruit;
}
ok(orchardYieldAt(0) === 1 && orchardYieldAt(0.9999) === 3,
   '果树每个结果日随机产出 1~3 个', [orchardYieldAt(0), orchardYieldAt(0.9999)]);

// 结果与收获（第 301 天起是秋天，苹果当季）
s.day = 301;
G.setRng(mulberry32(301));
G.sleep(s);
const ripe1 = G.treeSlot(s, 1).ripe;
ok(ripe1 >= G.BALANCE.orchard.fruitMin && ripe1 <= G.BALANCE.orchard.fruitMax,
   '成树当季每天随机挂果', { ripe: ripe1 });
ok(G.treeSlot(s, 0).ripe === 0, '不是当季的树不结果');

s.energy = 5;
const appleStoreBefore = G.storeCount(s, 'fruit_apple');
const h1 = G.harvestTree(s, 1);
ok(h1.ok && G.storeCount(s, 'fruit_apple') === appleStoreBefore + h1.n && s.energy === 4,
   '收获 1 体力，果实进仓库', { store: G.storeCount(s, 'fruit_apple'), e: s.energy });
ok(!G.harvestTree(s, 1).ok, '没有果实可收时收获失败');

s.day = 331;                       // 冬
G.sleep(s);
ok(G.treeSlot(s, 1).ripe === 0, '休眠季不挂果');

s.day = 421; G.sleep(s);
s.energy = 0;
ok(!G.harvestTree(s, 1).ok, '体力为 0 时不能收获');

// 存档
const orchardRound = G.deserialize(G.serialize(s));
ok(G.orchardUnlocked(orchardRound) && G.orchardSlotCount(orchardRound) === 8,
   '果园读档保留树坑数量与解锁状态');
ok(G.treeProgress(orchardRound, 1).water === 15 && G.treeProgress(orchardRound, 1).ripe > 0,
   '读档保留浇水次数与挂果');
ok(G.treeStockCount(orchardRound, 'peach', 'seed') === 0 &&
   G.CROP_LIST.every(function (c) { return !c.fruit; }) && G.FRUIT_LIST.length === 3,
   '水果不进种子店 / 委托池');
}

/* ---------- 9. 每日总结 ---------- */
section('每日总结');
G.setRng(mulberry32(7));
s = G.createState();
s.coins = 300;
G.addStore(s, 'carrot', 'std', 3);
const coinsBeforeSleep = s.coins;
const sleepRes = G.sleep(s);
const rep = sleepRes.report;
ok(!!rep && rep.day === s.day, '睡觉返回结构化的每日总结');
const cashSum = rep.cash.reduce(function (n, x) { return n + x.value; }, 0);
ok(cashSum === rep.coins.after - rep.coins.before, '收支明细合计等于金币变化',
   [cashSum, rep.coins.after - rep.coins.before]);
ok(rep.coins.before === coinsBeforeSleep && rep.coins.after === s.coins, '总结里的金币前后值正确');
ok(rep.weather && rep.weather.name && rep.weather.emoji, '总结带当天天气');
ok(rep.farm && typeof rep.farm.harvested === 'number' && typeof rep.farm.missed === 'number',
   '总结带农场数据（收获 / 缺水）');
ok(Array.isArray(rep.tomorrow) && rep.orders && typeof rep.orders.fresh === 'number',
   '总结带明日提示与新委托数');

/* ---------- 10. 图鉴奖励 / 存档版本门禁 ---------- */
section('图鉴奖励');
{
  const c = G.createState();
  ok(G.checkCodexRewards(c).length === 0, '新农场没有图鉴奖励可领');
  const rw0 = G.codexRewards(c);
  ok(rw0.fish.length === 3 && rw0.crops.length === 3, '图鉴奖励是 3 档鱼 + 3 档作物');

  const addFish = function (ids) {
    ids.forEach(function (id) {
      c.codex.fish[id] = { n: 1, best: 'std', first: 1, perfect: 0, value: 3 };
    });
  };
  addFish(['crucian', 'carp']);
  const got1 = G.checkCodexRewards(c);
  ok(got1.length === 1 && got1[0].id === 'fish2', '收集 2 种鱼解锁第一档', got1);
  ok(c.coins === G.BALANCE.start.coins + 150, '第一档奖励 150 金到账', c.coins);
  ok(G.checkCodexRewards(c).length === 0, '同一档不会重复领取');

  addFish(['mandarin', 'bass', 'puffer', 'koi']);
  const got2 = G.checkCodexRewards(c);
  ok(got2.length === 2, '集满 6 种鱼一次补发后两档', got2.map(function (g) { return g.id; }));
  ok(c.bait.dough === 15, '鱼档奖励的面团饵到账（5 + 10）', c.bait.dough);

  G.CROP_LIST.forEach(function (crop) {
    c.codex.crops[crop.id] = { n: 1, best: 'std', first: 1, value: 5 };
  });
  const got3 = G.checkCodexRewards(c);
  ok(got3.length === 3, '作物 5 / 10 / 14 三档一次补齐', got3.map(function (g) { return g.id; }));
  ok(c.ferts.normal === 3 && c.ferts.special === 3, '作物档奖励的肥料到账', [c.ferts.normal, c.ferts.special]);

  const round = G.deserialize(G.serialize(c));
  ok(G.checkCodexRewards(round).length === 0, '读档后已领的档位不会重发');
  ok(G.codexRewards(round).crops.every(function (m) { return m.claimed; }), '读档保留领取状态');

  const fake = JSON.parse(G.serialize(c));
  fake.codexClaim = { hackReward: 9 };
  const clean = G.deserialize(fake);
  ok(!clean.codexClaim.hackReward, '存档里不认识的奖励档位会被丢掉');
}

section('存档版本门禁');
{
  const future = JSON.parse(G.serialize(G.createState()));
  future.v = G.SAVE_VERSION + 1;
  let err = null;
  try { G.deserialize(future); } catch (e) { err = e; }
  ok(!!err && err.code === 'FUTURE_SAVE', '来自更新版本的存档会被拒绝');

  const cur = G.deserialize(JSON.parse(G.serialize(G.createState())));
  ok(cur.v === G.SAVE_VERSION, '正常存档的版本号被归一');
}

section('全图鉴成就');
{
  const c = G.createState();
  G.FISH.forEach(function (f) {
    if (f.trash || f.chest) return;
    c.codex.fish[f.id] = { n: 1, best: 'std', first: 1, perfect: 0, value: 1 };
  });
  G.CROP_LIST.forEach(function (cr) {
    c.codex.crops[cr.id] = { n: 1, best: 'std', first: 1, value: 1 };
  });
  const ids = G.checkAchievements(c).map(function (a) { return a.id; });
  ok(ids.indexOf('codexall') >= 0, '6 种鱼 + 14 种作物能解锁「全图鉴」', ids);
}

/* ---------- 11. v2.29 市场重做 ---------- */
section('v2.29 市场（批次中点 / 收购箱 / 买货影响供需）');
{
  /* 批次中点：一次卖 30 ≈ 分三次卖 10 */
  const one = (function () {
    const s = G.createState(); s.day = 35; s.coins = 0;
    G.addStore(s, 'watermelon', 'std', 30);
    return G.sellCropN(s, 'watermelon', 30).income;
  })();
  const three = (function () {
    const s = G.createState(); s.day = 35; s.coins = 0;
    G.addStore(s, 'watermelon', 'std', 30);
    let t = 0;
    [10, 10, 10].forEach(function (n) { t += G.sellCropN(s, 'watermelon', n).income; });
    return t;
  })();
  ok(one > 0 && Math.abs(one - three) <= 3, '一次卖 30 ≈ 分三次卖 10（批次中点定价）', [one, three]);

  /* 收购箱：入箱不压价，估值 = 市价 × 95% */
  const cs = G.createState(); cs.day = 35; cs.coins = 100;
  G.addStore(cs, 'watermelon', 'std', 10);
  const soldBefore = G.marketInfo(cs, 'watermelon').sold;
  const put = G.boxPutCrop(cs, 'watermelon', 10);
  ok(put.ok && G.marketInfo(cs, 'watermelon').sold === soldBefore, '入箱不计销量（不压价）',
    [soldBefore, G.marketInfo(cs, 'watermelon').sold]);
  const net = Math.max(1, Math.round(10 * 140 * G.marketMul(cs, 'watermelon', 10) *
    (1 - G.BALANCE.market.boxFee)));
  ok(G.boxValue(cs) === net, '箱内估值 = 当时市价 × 95%', [G.boxValue(cs), net]);

  /* 结算：先算钱再压价，并扣手续费 */
  const coinsBeforeShip = cs.coins;
  const shipValue = G.boxValue(cs);
  G.sleep(cs);
  ok(cs.box.length === 0 && cs.coins === coinsBeforeShip + shipValue - G.mealFee(cs),
    '睡觉按当时市价结清并扣 5%', { coins: cs.coins, expect: coinsBeforeShip + shipValue - G.mealFee(cs) });

  /* 买货影响供需：越买越贵 */
  const bs2 = G.createState(); bs2.coins = 10000; bs2.day = 35;
  bs2.cropShop = { day: 1, stock: { carrot: 5 } };
  G.addSupply(bs2, 'carrot', 20);
  const beforeBuy = G.marketMul(bs2, 'carrot');
  const bought = G.buyCrop(bs2, 'carrot', 5);
  ok(bought.ok && G.marketMul(bs2, 'carrot') > beforeBuy, '买货把销量往回拉（越买越贵）',
    [beforeBuy, G.marketMul(bs2, 'carrot')]);

  /* 买低卖高不成立：进价 ×1.25 vs 收购箱 ×0.95 */
  const arb = G.createState(); arb.coins = 100000; arb.day = 35;
  arb.cropShop = { day: 1, stock: { watermelon: 3 } };
  const buyCost = G.cropBuyPrice('watermelon', arb) * 3;
  G.buyCrop(arb, 'watermelon', 3);
  const putArb = G.boxPutCrop(arb, 'watermelon', 3);
  ok(putArb.ok && putArb.v < buyCost, '买完立刻进收购箱仍然亏（5% 手续费 + 1.25 进价）',
    { buyCost: buyCost, box: putArb.v });
}

/* ---------- 12. v2.30 收购箱锁价 ---------- */
section('v2.30 收购箱锁价（合并定价 / 入箱快照）');
{
  const shipTotal = function (fn) {
    const s = G.createState(); s.day = 35; s.coins = 100;
    G.addStore(s, 'watermelon', 'std', 20);
    fn(s);
    const est = G.boxValue(s);
    G.sleep(s);
    return { est: est, got: s.coins - 100 + G.mealFee(s) };
  };
  const whole = shipTotal(function (s) { G.boxPutCrop(s, 'watermelon', 20); });
  const split = shipTotal(function (s) {
    G.boxPutCrop(s, 'watermelon', 10);
    G.boxPutCrop(s, 'watermelon', 10);
  });
  ok(split.est === whole.est && split.got === whole.got,
    '拆成两批放 = 一次放（合并定价）', [whole, split]);

  /* 入箱后市场被砸烂：箱内估值与结算都不受影响（锁定入箱时的供需） */
  const snap = G.createState(); snap.day = 35; snap.coins = 100;
  G.addStore(snap, 'watermelon', 'std', 10);
  G.boxPutCrop(snap, 'watermelon', 10);
  const est = G.boxValue(snap);
  G.addSupply(snap, 'watermelon', 40);
  ok(G.boxValue(snap) === est, '入箱后砸盘不影响箱内估值', [est, G.boxValue(snap)]);
  G.sleep(snap);
  ok(snap.coins === 100 + est - G.mealFee(snap), '结算按入箱时锁定的供需',
    { coins: snap.coins, expect: 100 + est - G.mealFee(snap) });

  /* 换季仍然影响：反季锁价，出箱变当季 → 少钱 */
  const season = G.createState(); season.day = 30; season.coins = 100;
  G.addStore(season, 'watermelon', 'std', 10);
  G.boxPutCrop(season, 'watermelon', 10);
  const estOff = G.boxValue(season);
  G.sleep(season);
  const gotSeason = season.coins - 100 + G.mealFee(season);
  ok(gotSeason < estOff, '换季按出箱当天的季节重算', { est: estOff, got: gotSeason });
}

/* ---------- 13. 果园图鉴 / 成就 ---------- */
section('果园图鉴与成就');
{
  const s = G.createState();
  s.day = 50; s.energy = 10; s.coins = 0;
  s.orchard = { unlocked: true, slots: [
    { id: 'peach', mode: 'sapling', planted: 10, water: 15, lastWater: 10, ripe: 3 }
  ] };
  ok(G.treeMature(s, 0), '树苗满 30 天成树');
  const r = G.harvestTree(s, 0);
  const cx = s.codex.crops.fruit_peach;
  ok(r.ok && !!cx && cx.n === 3 && cx.best === 'std' && cx.value === 3 * G.CROPS.fruit_peach.price,
    '水果收获写进图鉴（标准品质）', cx);
  ok(s.stats.orchardFruit === 3, '累计水果计入统计', s.stats.orchardFruit);

  const ids = G.checkAchievements(s).map(function (a) { return a.id; });
  ok(ids.indexOf('orchard1') >= 0 && ids.indexOf('fruit1') >= 0,
    '开垦果园 / 第一颗果子成就解锁', ids);

  const s2 = G.createState();
  s2.orchard = { unlocked: true, slots: new Array(8).fill(null) };
  const ids2 = G.checkAchievements(s2).map(function (a) { return a.id; });
  ok(ids2.indexOf('tree8') >= 0, '8 个树坑解锁「满园果树」', ids2);
}

/* ---------- 14. 账本分类 ---------- */
section('账本分类（近 30 天收益）');
{
  const s = G.createState(); s.day = 40;
  s.ledger = [
    { day: 39, label: '农产品店 · 卖 萝卜×3', income: 30, expense: 0 },
    { day: 39, label: '卖鱼 鲫鱼', income: 20, expense: 0 },
    { day: 39, label: '收购箱出货', income: 100, expense: 0 },
    { day: 39, label: '委托 · 萝卜×3', income: 50, expense: 0 },
    { day: 39, label: '卖蚯蚓', income: 9, expense: 0 },
    { day: 39, label: '开木制宝箱', income: 20, expense: 0 },
    { day: 39, label: '全天零工', income: 30, expense: 0 },
    { day: 39, label: '成就奖励', income: 15, expense: 0 },
    { day: 39, label: '伙食费', income: 0, expense: 4 },
    { day: 39, label: '买种子 萝卜', income: 0, expense: 5 },
    { day: 39, label: '月度税金', income: 0, expense: 40 },
    { day: 39, label: '捐赠小镇', income: 0, expense: 100 },
    { day: 5,  label: '卖鱼 鲤鱼', income: 999, expense: 0 }   // 窗口外
  ];
  const c = G.ledgerByCategory(s, 30);
  const by = {};
  c.list.forEach(function (x) { by[x.id] = x.total; });
  ok(c.income === 274 && c.expense === 149, '收入 / 支出合计正确', [c.income, c.expense]);
  ok(by.crop === 30 && by.fish === 20 && by.box === 100 && by.order === 50 &&
     by.dig === 9 && by.junk === 20 && by.work === 30 && by.reward === 15,
     '收入按活动归类', by);
  ok(by.food === -4 && by.buy === -5 && by.upkeep === -40 && by.donate === -100,
     '支出按类别归类', by);
  ok(by.fish === 20, '窗口外的旧账不计入', by.fish);
}

/* ---------- 15. 经营档案 ---------- */
section('经营档案（净资产 / 称号 / 累计收支）');
{
  const s = G.createState();
  s.coins = 1000;
  G.addStore(s, 'carrot', 'std', 10);
  s.sprinklers = 2;
  const w = G.netWorth(s);
  ok(w.coins === 1000 && w.device === 2 * G.BALANCE.device.sprinkler, '净资产含现金与设备', w);
  ok(w.total === w.coins + w.store + w.box + w.device + w.orchard, '净资产 = 各项之和', w);

  G.addCoins(s, 100, '测试收入');
  G.addCoins(s, -40, '测试支出');
  ok(s.stats.incomeTotal === 100 && s.stats.expenseTotal === 40, '累计收支随 addCoins 累加',
    [s.stats.incomeTotal, s.stats.expenseTotal]);

  const r = G.profileRank(s);
  ok(!!r.cur && !!r.next, '称号给出当前档与下一档', r);

  s.coins = 300000;
  const top = G.BALANCE.profile.ranks[G.BALANCE.profile.ranks.length - 1];
  const r2 = G.profileRank(s);
  ok(r2.next === null && r2.cur.name === top.name, '最高净资产拿到最高称号', r2.cur);

  const round = G.deserialize(G.serialize(s));
  ok(round.stats.incomeTotal === s.stats.incomeTotal, '累计收支随存档保存', round.stats.incomeTotal);
}

/* ---------- 16. 河边预估 / 交易折扣 ---------- */
section('河边预估与交易折扣');
{
  const s = G.createState();
  s.day = 35; s.weather = 'rain';
  const fd = G.fishForecast(s, 'dough');
  const fw = G.fishForecast(s, 'worm');
  ok(fd.hook > 0.9 && fd.hook <= 0.98, '预估咬钩率在 30%~98% 区间内', fd.hook);
  ok(fd.cost === G.BAIT.dough.price && fw.cost === G.BALANCE.dig.value, '预估成本用真实饵价',
    [fd.cost, fw.cost]);
  ok(fd.net > 0, '面团饵每杆期望为正', fd.net);

  const hi = G.createState(); hi.day = 35; hi.weather = 'rain';
  hi.levels.fish = 10;
  ok(G.fishForecast(hi, 'dough').net > fd.net, '钓鱼等级越高每杆期望越高',
    [fd.net, G.fishForecast(hi, 'dough').net]);

  const s2 = G.createState();
  s2.coins = 1000; s2.levels.trade = 10; s2.levels.fish = 10; s2.levels.farm = 10;
  const lure = G.buyBait(s2, 'lure2', 1);
  ok(lure.ok && s2.coins === 1000 - Math.round(G.BALANCE.lure2.price * G.tradeCut(s2)),
    '高级假饵吃交易折扣', { cost: 1000 - s2.coins, cut: G.tradeCut(s2) });
  const fert = G.buyFertItem(s2, 'special', 1);
  ok(fert.ok && fert.cost === Math.round(G.FERT.special.cost * G.tradeCut(s2)),
    '肥料吃交易折扣', fert);
}

/* ---------- 17. v2.35 饵料调整 / 双咬钩 / 特级饵料 ---------- */
section('饵料调整与双咬钩');
{
  ok(G.BALANCE.hook.worm === 0.97 && G.BALANCE.bait.lureGood === 1.10,
    '蚯蚓 97% 咬钩、假饵好鱼 ×1.10', [G.BALANCE.hook.worm, G.BALANCE.bait.lureGood]);

  const s = G.createState();
  s.day = 35; s.weather = 'rain'; s.levels.fish = 10;
  s.bait.worm = 5; s.energy = 20;
  G.setRng(function () { return 0; });
  const beforeE = s.energy, beforeW = s.bait.worm;
  const r = G.fish(s, 'worm');
  ok(r.ok && r.entries.length === 2 && r.bonus === 1, '咬钩超过 100% 触发双咬钩',
    r && r.entries && r.entries.length);
  ok(s.energy === beforeE - 2 && s.bait.worm === beforeW - 1, '双咬钩只消耗一份体力和饵',
    [s.energy, s.bait.worm]);

  const p = G.createState();
  p.coins = 100; p.levels.fish = G.BALANCE.gate.premium - 1;
  ok(!G.buyBait(p, 'premium', 1).ok, '钓鱼等级不够买不到特级饵料');
  p.levels.fish = G.BALANCE.gate.premium;
  ok(!G.buyBait(p, 'premium', 1).ok, '交易等级不够也买不到特级饵料');
  p.levels.trade = G.BALANCE.gate.premiumTrade;
  const buy = G.buyBait(p, 'premium', 2);
  ok(buy.ok && p.bait.premium === 2 && p.coins < 100, '特级饵料可购买并进背包', p.coins);

  const f = G.fishForecast(p, 'premium');
  ok(f.cost === G.BAIT.premium.price && f.good > 1.2, '特级饵料预估成本与好鱼率正确', f);

  p.weather = 'cloudy';
  G.setRng(function () { return 0.9; });
  const premBefore = p.bait.premium;
  const rp = G.fish(p, 'premium');
  ok(rp.ok && p.bait.premium === premBefore - 1, '特级饵料钓一杆扣 1 份', p.bait.premium);
}

console.log('\n' + (fail ? '❌' : '✅') + ' 通过 ' + pass + ' / ' + (pass + fail));
process.exit(fail ? 1 : 0);
