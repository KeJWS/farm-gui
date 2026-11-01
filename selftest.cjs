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
ok(s.coins === 50 && s.energy === 10 && s.plots.length === 4, '初始状态 50 金/10 体力/4 块地');

let r = G.plant(s, 0, 'carrot');
ok(r.ok && s.coins === 45 && s.energy === 9, '种萝卜：扣 5 金 + 1 体力', { coins: s.coins, energy: s.energy });

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
ok(s.store.carrot === r.qty, '收获进仓库');

r = G.sellAll(s);
ok(r.ok && s.store.carrot === undefined, '卖出清空仓库');
ok(s.coins > 42, '卖出后金币增加', s.coins);

/* ---------- 2. 漏浇减产 ---------- */
section('漏浇减产');
G.setRng(mulberry32(11));
s = G.createState();
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
G.plant(s, 0, 'carrot');
s.plots[0].growth = 2;
const rs = harvestNow();
ok(rs.ok && rs.seed === true && s.seeds.carrot === 1, '单收作物照常 30% 留种', { seed: rs.seed, seeds: s.seeds });

/* ---------- 4. 钓鱼 ---------- */
section('钓鱼 / 品质 / 结算');
G.setRng(mulberry32(99));
s = G.createState();
s.bait.worm = 1000; s.energy = 30; s.maxEnergy = 30;
let total = 0, casts = 0, trash = 0;
for (let i = 0; i < 200; i++) {
  s.energy = 10;                 // 每杆补满体力，只测钓鱼本身
  const fr = G.fish(s, 'worm');
  if (!fr.ok) break;
  casts++; total += fr.entry.price;
  if (fr.entry.trash) trash++;
}
ok(casts === 200, '连甩 200 杆全部成功', casts);
ok(total > 0 && Number.isFinite(total), '总收入为正数', total);
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

/* 暴风雨禁钓 */
s.energy = 10; s.weather = 'storm';
ok(!G.fish(s).ok, '暴风雨禁止钓鱼');

/* 无饵料 */
s.weather = 'sunny'; s.bait = { worm: 0, dough: 0 }; s.lure = { owned: false, dur: 0 };
ok(!G.fish(s).ok, '没有饵料钓不了');

/* ---------- 5. 经济：扩张 / 强化 / 零工 / 下午茶 ---------- */
section('经济系统');
G.setRng(mulberry32(5));
s = G.createState();
ok(G.expandCost(s) === 25, '第 5 块地 25 金');
s.coins = 1000;
G.expand(s);
ok(G.expandCost(s) === 40, '第 6 块地 40 金');
ok(G.upgradeCost(s) === 30, '首次强化 30 金');
G.upgrade(s);
ok(s.maxEnergy === 15 && G.mealFee(s) === 4, '强化后上限 15、伙食 4 金', { max: s.maxEnergy, fee: G.mealFee(s) });
ok(G.upgradeCost(s) === 40, '第二次强化 40 金');
ok(G.workCost(s, 'half') === 8 && G.workPay(s, 'half') === 8, '半天零工：消耗 8、赚 8');
ok(G.workCost(s, 'full') === 15 && G.workPay(s, 'full') === 23, '全天零工：消耗 15、赚 23（15×1.5 四舍五入）');

s.energy = 15; const c0 = s.coins;
G.work(s, 'full');
ok(s.coins - c0 === 23 && s.energy === 0, '全天零工结算正确', { gain: s.coins - c0, energy: s.energy });

/* 没钱吃饭 */
s = G.createState();
s.coins = 0; s.energy = 2;
G.sleep(s);
ok(s.energy === 5 && s.coins === 0, '没钱吃饭只恢复 5 体力', { e: s.energy, c: s.coins });

/* ---------- 6. 存读档 ---------- */
section('存读档');
s = G.createState();
G.plant(s, 0, 'corn');
const round = G.deserialize(G.serialize(s));
ok(round.plots[0].crop === 'corn' && round.coins === s.coins, '序列化往返一致');
ok(round.plots.length === 4 && round.fishBook.count === 0, '结构完整');

/* ---------- 7. 随机压测 ---------- */
section('随机压测 3000 步');
G.setRng(mulberry32(2024));
s = G.createState();
const acts = [
  () => G.waterAll(s), () => G.harvestAll(s), () => G.sleep(s), () => G.digWorms(s),
  () => G.tea(s), () => G.work(s, 'half'), () => G.work(s, 'full'), () => G.fish(s),
  () => G.fishMany(s, 3), () => G.sellAll(s), () => G.expand(s), () => G.upgrade(s),
  () => G.buyBait(s, 'dough', 1), () => G.buyBait(s, 'lure', 1),
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
