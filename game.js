/* ============================================================
 * 我的小农场 · 游戏逻辑层（纯数据，不碰 DOM）
 * 规则来源：skills/farm-game/SKILL.md
 * ============================================================ */
(function (root) {
  'use strict';

  /* ---------------- 静态数据 ---------------- */

  const CROPS = {
    carrot:     { name: '萝卜', emoji: '🥕', seed: 5,  days: 2, base: 3, price: 4,  big: false },
    cabbage:    { name: '白菜', emoji: '🥬', seed: 7,  days: 2, base: 2, price: 8,  big: false },
    potato:     { name: '土豆', emoji: '🥔', seed: 9,  days: 3, base: 3, price: 8,  big: false },
    corn:       { name: '玉米', emoji: '🌽', seed: 14, days: 3, base: 2, price: 16, big: false },
    eggplant:   { name: '茄子', emoji: '🍆', seed: 17, days: 4, base: 2, price: 22, big: false },
    tomato:     { name: '番茄', emoji: '🍅', seed: 19, days: 4, base: 3, price: 16, big: false },
    pumpkin:    { name: '南瓜', emoji: '🎃', seed: 24, days: 5, base: 1, price: 60, big: true  },
    watermelon: { name: '西瓜', emoji: '🍉', seed: 32, days: 5, base: 1, price: 76, big: true  },
    cucumber:   { name: '黄瓜', emoji: '🥒', seed: 19, days: 3, price: 13, multi: true,
                  firstQty: 2, regrowDays: 2, regrowQty: 2, regrowTimes: 2 },
    strawberry: { name: '草莓', emoji: '🍓', seed: 22, days: 3, price: 9,  multi: true,
                  firstQty: 3, regrowDays: 1, regrowQty: 2, regrowTimes: 3 }
  };
  Object.keys(CROPS).forEach(function (k) { CROPS[k].id = k; });
  const CROP_LIST = Object.keys(CROPS).map(function (k) { return CROPS[k]; });

  const FERT = {
    normal:  { id: 'normal',  name: '普通肥料', emoji: '🧪', cost: 8,  add: 1 },
    special: { id: 'special', name: '特效肥料', emoji: '💊', cost: 18, add: 2 }
  };
  const FERT_SELL_RATE = 0.5;
  const SPRINKLER_COST = 60;

  const TRASH = [
    { name: '易拉罐', emoji: '🥫' },
    { name: '旧靴子', emoji: '👢' },
    { name: '水草',   emoji: '🌿' }
  ];

  const QUALITY = [
    { id: 'bad',    name: '劣质', emoji: '⬜', mul: 0.4, w: 10, color: '#8d939a' },
    { id: 'common', name: '普通', emoji: '🥉', mul: 0.7, w: 25, color: '#b07a45' },
    { id: 'std',    name: '标准', emoji: '🥈', mul: 1.0, w: 35, color: '#4a86c8' },
    { id: 'good',   name: '优良', emoji: '🥇', mul: 1.3, w: 18, color: '#2f9e63' },
    { id: 'fine',   name: '优质', emoji: '💎', mul: 1.7, w: 8,  color: '#7b5cd6' },
    { id: 'perfect',name: '完美', emoji: '🌟', mul: 2.2, w: 3,  color: '#d99f2b' },
    { id: 'legend', name: '传说', emoji: '🏆', mul: 3.0, w: 1,  color: '#d2453a' }
  ];

  const FISH = [
    { id: 'trash', name: '垃圾',     emoji: '🗑️', base: 1,  w: 18, trash: true },
    { id: 'crucian', name: '鲫鱼',   emoji: '🐟', base: 3,  w: 24 },
    { id: 'carp',  name: '鲤鱼',     emoji: '🐟', base: 6,  w: 20 },
    { id: 'mandarin', name: '鳜鱼',  emoji: '🐠', base: 10, w: 13 },
    { id: 'bass',  name: '鲈鱼',     emoji: '🐟', base: 12, w: 10 },
    { id: 'puffer', name: '河豚',    emoji: '🐡', base: 20, w: 6  },
    { id: 'koi',   name: '锦鲤',     emoji: '🐉', base: 25, w: 4  },
    { id: 'chest', name: '宝箱',     emoji: '📦', base: 15, w: 5, noOrder: true }
  ];

  const Q_IDS = QUALITY.map(function (q) { return q.id; });

  const WEATHER = {
    sunny:  { id: 'sunny',  name: '晴天',   emoji: '☀️', w: 45, hookMod: -0.12, wormMod: -1,
              note: '咬钩率 -12% · 挖蚯蚓 -1 份' },
    cloudy: { id: 'cloudy', name: '阴天',   emoji: '⛅', w: 30, hookMod: 0,     wormMod: 1,
              note: '咬钩率默认 · 挖蚯蚓 +1 份' },
    rain:   { id: 'rain',   name: '雨天',   emoji: '🌧️', w: 25, hookMod: 0.08,  wormMod: 1, autoWater: true,
              note: '自动浇水 · 咬钩率 +8% · 挖蚯蚓 +1 份' }
  };
  const WEATHER_LIST = Object.keys(WEATHER).map(function (k) { return WEATHER[k]; });

  const BAIT = {
    worm:  { id: 'worm',  name: '蚯蚓',   emoji: '🪱', desc: '好鱼概率 ×1.35 · 品质取两次较好' },
    dough: { id: 'dough', name: '面团饵', emoji: '🍞', desc: '标准钓鱼体验 · 92% 咬钩' },
    lure:  { id: 'lure',  name: '假饵',   emoji: '🎣', desc: '耐用 20 次 · 杂物少好鱼多，但只有 72% 咬钩' }
  };
  /* 各饵的咬钩基础概率（天气再加减） */
  const HOOK = { dough: 0.92, worm: 0.95, lure: 0.72 };

  /* ---------------- 随机 ---------------- */

  let RNG = Math.random;
  function setRng(fn) { RNG = fn || Math.random; }
  function rand() { return RNG(); }
  function randInt(a, b) { return a + Math.floor(rand() * (b - a + 1)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function weighted(list, key) {
    let total = 0;
    for (let i = 0; i < list.length; i++) total += list[i][key] || 0;
    let r = rand() * total;
    for (let i = 0; i < list.length; i++) {
      r -= (list[i][key] || 0);
      if (r <= 0) return list[i];
    }
    return list[list.length - 1];
  }

  /* 季节目前只影响顶栏文案：每 30 天换一季（后续可挂作物限制） */
  const SEASONS = ['春', '夏', '秋', '冬'];
  function seasonOf(day) {
    return SEASONS[Math.floor((Math.max(1, day) - 1) / 30) % 4];
  }

  function rollWeather() { return weighted(WEATHER_LIST, 'w').id; }

  /* 多次取最好：boost = true 滚 2 次（蚯蚓），数字则滚 N 次（施肥） */
  function rollQuality(boost) {
    let n = 1;
    if (boost === true) n = 2;
    else if (typeof boost === 'number') n = Math.max(1, Math.round(boost));
    let best = null, bestIdx = -1;
    for (let i = 0; i < n; i++) {
      const q = weighted(QUALITY, 'w');
      const idx = QUALITY.indexOf(q);
      if (idx > bestIdx) { best = q; bestIdx = idx; }
    }
    return best;
  }

  /* ---------------- 状态 ---------------- */

  const SAVE_VERSION = 1;

  function makePlot() {
    return { crop: null, growth: 0, watered: false, missed: 0, fert: 0,
             ripeDay: null, hits: 0, phase: 'idle' };
  }

  function createState() {
    const s = {
      v: SAVE_VERSION,
      day: 1,
      weather: 'sunny',
      coins: 50,
      energy: 10,
      maxEnergy: 10,
      plots: [makePlot(), makePlot(), makePlot(), makePlot(), makePlot()],
      seeds: {},
      store: {},
      fishBag: [],
      ferts: { normal: 0, special: 0 },
      sprinklers: 0,
      harvester: false,
      harvesterOn: true,
      nets: 0,
      codex: { fish: {}, crops: {} },
      orderRefreshDay: 1,
      workUsed: false,
      bait: { worm: 0, dough: 0 },
      lure: { owned: false, dur: 0 },
      teaUsed: false,
      ledger: [{ day: 1, label: '开局金币', income: 50, expense: 0, balance: 50 }],
      log: [{ day: 1, text: '🌾 欢迎来到我的小农场，第 1 天开始了。', kind: 'sys' }],
      orders: makeOrders({ day: 1 }),
      fishBook: { count: 0, entries: [], best: null, priciest: null },
      stats: { harvests: 0, casts: 0, dug: 0, planted: 0, orders: 0 }
    };
    return s;
  }

  /* ---------------- 工具 ---------------- */

  function log(s, text, kind) {
    s.log.unshift({ day: s.day, text: text, kind: kind || 'info' });
    if (s.log.length > 400) s.log.length = 400;
  }

  function ledger(s, label, income, expense) {
    const balance = Math.round((s.coins) * 100) / 100;
    s.ledger.unshift({ day: s.day, label: label, income: income || 0, expense: expense || 0, balance: balance });
    if (s.ledger.length > 200) s.ledger.length = 200;
  }

  function addCoins(s, amount, label) {
    s.coins += amount;
    if (amount >= 0) ledger(s, label, amount, 0);
    else ledger(s, label, 0, -amount);
  }

  /* 零工单价：体力 1 点 = 2 金（全天）/ 1.2 金（半天） */
  const WORK_RATE_FULL = 2.0;
  const WORK_RATE_HALF = 1.2;

  function mealFee(s) { return Math.max(1, 3 + (s.maxEnergy - 10) / 5); }

  /* 5 块地之后，每周要交土地维护费（每多一块 3 金/周） */
  function plotUpkeep(plots) { return Math.max(0, plots - 5) * 3; }

  /* 设备每周维护费：洒水器 2、渔网 2、自动收获器 4 */
  function deviceUpkeep(s) {
    return (s.sprinklers || 0) * 3 + (s.nets || 0) * 3 + (s.harvester ? 5 : 0);
  }

  function expandCost(s) {
    const n = s.plots.length;
    if (n < 25) return Math.max(25, 25 + 15 * (n - 4));
    // 25 块之后每块价格是上一块的 2.2 倍
    let c = 25 + 15 * 20;
    for (let k = 25; k < n; k++) c = Math.round(c * 1.6);
    return c;
  }
  /* 强化体力：成本超线性增长（每级 ×1.2），避免「无脑升级」把上限堆到几百 */
  function upgradeCost(s) {
    const tier = Math.max(0, (s.maxEnergy - 10) / 5);
    return Math.round(30 * Math.pow(1.2, tier));
  }
  function workCost(s, mode) { return Math.round(mode === 'half' ? s.maxEnergy / 2 : s.maxEnergy); }
  function workPay(s, mode) {
    const c = workCost(s, mode);
    return Math.round(c * (mode === 'half' ? WORK_RATE_HALF : WORK_RATE_FULL));
  }

  function needOf(p) {
    const c = CROPS[p.crop];
    if (!c) return 0;
    return p.phase === 'regrow' ? c.regrowDays : c.days;
  }

  function fertBonus(p) {
    const c = CROPS[p.crop];
    if (!c || c.big) return 0;
    return p.fert || 0;
  }

  function expectedYield(s, p) {
    const c = CROPS[p.crop];
    if (!c) return 0;
    if (c.multi) return p.hits === 0 ? c.firstQty : c.regrowQty;
    if (c.big) return 1;
    return Math.max(1, c.base + fertBonus(p) - p.missed);
  }

  function canHarvest(s, p) {
    return p.phase === 'ripe' && s.day > p.ripeDay;
  }

  function stageEmoji(p) {
    const c = CROPS[p.crop];
    if (!c) return '🟫';
    if (p.phase === 'ripe') return c.emoji;
    const need = needOf(p) || 1;
    const r = p.growth / need;
    if (r <= 0) return '🌱';
    if (r < 0.5) return '🌿';
    return '🌾';
  }

  /* ---------------- 操作 ---------------- */

  function grow(p, s) {
    const need = needOf(p);
    if (p.growth < need) p.growth++;
    if (p.growth >= need) {
      p.phase = 'ripe';
      p.ripeDay = s.day;
      return true;
    }
    return false;
  }

  function plant(s, idx, cropId) {
    const p = s.plots[idx];
    const c = CROPS[cropId];
    if (!p) return { ok: false, msg: '没有这块地' };
    if (!c) return { ok: false, msg: '没有这种作物' };
    if (p.crop) return { ok: false, msg: '这块地不是空地' };
    if (s.energy < 1) return { ok: false, msg: '体力不够了，先睡觉吧' };

    // 种子只能从种子店买，播种时只消耗背包里的种子
    const owned = s.seeds[cropId] || 0;
    if (owned <= 0) return { ok: false, msg: '没有 ' + c.name + ' 种子了，先去种子店买' };
    s.seeds[cropId] = owned - 1;
    if (s.seeds[cropId] === 0) delete s.seeds[cropId];

    s.energy -= 1;
    p.crop = cropId;
    p.growth = 0;
    p.watered = false;
    p.missed = 0;
    p.fert = 0;
    p.ripeDay = null;
    p.hits = 0;
    p.phase = 'growing';
    s.stats.planted++;
    log(s, '🌱 ' + (idx + 1) + ' 号地种下 ' + c.name, 'good');
    return { ok: true, msg: c.name + ' 种下了' };
  }

  function water(s, idx) {
    const p = s.plots[idx];
    if (!p || !p.crop) return { ok: false, msg: '这块地还没种东西' };
    if (p.phase === 'ripe') return { ok: false, msg: '已经成熟，快点收获吧' };
    if (p.watered) return { ok: false, msg: '今天已经浇过水了' };
    if (s.energy < 1) return { ok: false, msg: '体力不够了，先睡觉吧' };
    s.energy -= 1;
    p.watered = true;
    const ripe = grow(p, s);
    log(s, '💧 ' + (idx + 1) + ' 号地浇水 ' + CROPS[p.crop].name +
            (ripe ? ' → 成熟！明天可收' : '（' + p.growth + '/' + needOf(p) + '）'),
        ripe ? 'good' : 'info');
    return { ok: true, msg: ripe ? '成熟了！' : '浇水 +1 天', ripe: ripe };
  }

  function waterAll(s) {
    let done = 0, ripened = 0, lack = 0;
    s.plots.forEach(function (p, i) {
      if (!p.crop || p.phase === 'ripe' || p.watered) return;
      const r = water(s, i);
      if (r.ok) { done++; if (r.ripe) ripened++; } else lack++;
    });
    if (!done) return { ok: false, msg: '没有需要浇水的地块' };
    return { ok: true, msg: '浇了 ' + done + ' 块地' + (ripened ? '，' + ripened + ' 块成熟' : ''), done: done };
  }

  function harvest(s, idx, free) {
    const p = s.plots[idx];
    if (!p || !p.crop) return { ok: false, msg: '这块地还没种东西' };
    if (p.phase !== 'ripe') return { ok: false, msg: '还没成熟（' + p.growth + '/' + needOf(p) + ' 天）' };
    if (s.day <= p.ripeDay) return { ok: false, msg: '刚浇成熟，明天才能收获' };
    if (!free && s.energy < 1) return { ok: false, msg: '体力不够了，先睡觉吧' };

    const c = CROPS[p.crop];
    if (!free) s.energy -= 1;

    let qty;
    if (c.multi) qty = p.hits === 0 ? c.firstQty : c.regrowQty;
    else qty = c.big ? 1 : clamp(c.base + randInt(-1, 1) - p.missed + fertBonus(p), 1, 99);

    // 作物也有品质：施肥会多滚几次取最好的（普通肥 2 次、特效肥 3 次）
    const q = rollQuality(1 + p.fert);
    const unit = unitValue(p.crop, q.id);
    addStore(s, p.crop, q.id, qty);

    // 图鉴：作物次数 / 首次 / 累计价值 / 最好品质
    const cc = s.codex.crops[p.crop] ||
      (s.codex.crops[p.crop] = { n: 0, best: null, first: s.day, value: 0 });
    cc.n += qty;
    cc.value = (cc.value || 0) + qty * unit;
    if (!cc.first) cc.first = s.day;
    if (!cc.best || QUALITY.indexOf(q) > QUALITY.indexOf(qualityById(cc.best))) cc.best = q.id;

    // 多次收获作物：只有最后一次收获才判定留种
    const willRegrow = !!c.multi && p.hits + 1 < 1 + c.regrowTimes;
    let extraSeed = false;
    if (!willRegrow && rand() < 0.3) {
      s.seeds[p.crop] = (s.seeds[p.crop] || 0) + 1;
      extraSeed = true;
    }
    s.stats.harvests++;

    let regrown = false;
    if (willRegrow) {
      p.hits++;
      p.growth = 0;
      p.phase = 'regrow';
      p.watered = false;
      p.ripeDay = null;
      p.fert = 0;
      p.missed = 0;          // 再生期重新计数，不然会一直挂着「缺水 ×N」
      regrown = true;
    } else {
      s.plots[idx] = makePlot();
    }

    const msg = '收获 ' + c.name + ' ×' + qty + ' · ' + q.emoji + q.name + '（值 ' + qty * unit + ' 金）' +
                (extraSeed ? ' · 留种 +1' : '') +
                (regrown ? ' · 进入再生期' : '');
    log(s, '🧺 ' + msg, 'good');
    return { ok: true, msg: msg, qty: qty, crop: p.crop || c.id, unit: unit, quality: q, seed: extraSeed, regrown: regrown };
  }

  function harvestAll(s) {
    let total = 0, plots = 0, last = null;
    s.plots.forEach(function (p, i) {
      if (!p.crop || p.phase !== 'ripe') return;
      const r = harvest(s, i);
      if (r.ok) { total += r.qty; plots++; last = r; }
    });
    if (!plots) return { ok: false, msg: '没有可收获的作物' };
    return { ok: true, msg: '收了 ' + plots + ' 块地，共 ' + total + ' 个' };
  }

  function sellAll(s) {
    const ids = Object.keys(s.store).filter(function (k) { return storeCount(s, k) > 0; });
    const fishTotal = (s.fishBag || []).reduce(function (n, e) { return n + e.v; }, 0);
    const fishCount = (s.fishBag || []).length;
    if (!ids.length && !fishCount) return { ok: false, msg: '仓库里没东西可卖' };

    let income = 0;
    const parts = [];
    ids.forEach(function (id) {
      const n = storeCount(s, id);
      const gain = storeValue(s, id);
      income += gain;
      parts.push(CROPS[id].name + '×' + n + ' = ' + gain + ' 金');
      delete s.store[id];
    });
    if (fishCount) {
      income += fishTotal;
      parts.push('渔获×' + fishCount + ' = ' + fishTotal + ' 金');
      s.fishBag = [];
    }
    addCoins(s, income, '卖仓库');
    log(s, '💰 卖出 ' + parts.join('、') + '，收入 ' + income + ' 金', 'good');
    return { ok: true, msg: '卖出全部，+' + income + ' 金', income: income };
  }

  /* 铲除：直接清掉这块地，不返还种子/金币 */
  function clearPlot(s, idx) {
    const p = s.plots[idx];
    if (!p || !p.crop) return { ok: false, msg: '这块地本来就是空的' };
    const name = CROPS[p.crop].name;
    s.plots[idx] = makePlot();
    log(s, '🗑️ ' + (idx + 1) + ' 号地铲除了 ' + name, 'warn');
    return { ok: true, msg: '铲除了 ' + name };
  }

  function sellOne(s, id) {
    const n = storeCount(s, id);
    if (!n) return { ok: false, msg: '没有可卖的' };
    const gain = storeValue(s, id);
    delete s.store[id];
    addCoins(s, gain, '卖 ' + CROPS[id].name);
    log(s, '💰 卖出 ' + CROPS[id].name + '×' + n + '，+' + gain + ' 金', 'good');
    return { ok: true, msg: '+' + gain + ' 金', income: gain };
  }

  /* 施肥 = 消耗仓库里的肥料（肥料在种子店买，半价卖回） */
  function useFert(s, idx, kind) {
    const p = s.plots[idx];
    const f = FERT[kind];
    if (!p || !p.crop) return { ok: false, msg: '这块地还没种东西' };
    if (!f) return { ok: false, msg: '没有这种肥料' };
    if (CROPS[p.crop].big) return { ok: false, msg: '南瓜、西瓜不吃肥料' };
    if (p.fert) return { ok: false, msg: '这块地已经施过肥了' };
    if (p.phase === 'ripe') return { ok: false, msg: '都熟了，别浪费肥料' };
    if ((s.ferts[kind] || 0) < 1) return { ok: false, msg: '肥料用完了，去种子店买' };
    if (s.energy < 1) return { ok: false, msg: '体力不够了' };
    s.ferts[kind]--;
    s.energy -= 1;
    p.fert = f.add;
    log(s, '🧪 ' + (idx + 1) + ' 号地施了' + f.name + '（产量 +' + f.add + '、品质取更优）', 'good');
    return { ok: true, msg: f.name + ' 施用成功' };
  }

  function fertSellPrice(kind) {
    const f = FERT[kind];
    return f ? Math.max(1, Math.floor(f.cost * FERT_SELL_RATE)) : 0;
  }

  function buyFertItem(s, kind, n) {
    const f = FERT[kind];
    if (!f) return { ok: false, msg: '没有这种肥料' };
    const qty = Math.max(1, Math.floor(n || 1));
    const cost = f.cost * qty;
    if (s.coins < cost) return { ok: false, msg: '金币不够（需要 ' + cost + ' 金）' };
    s.coins -= cost;
    ledger(s, '买肥料 ' + f.name + '×' + qty, 0, cost);
    s.ferts[kind] = (s.ferts[kind] || 0) + qty;
    log(s, '🧪 买了' + f.name + ' ×' + qty + '（-' + cost + ' 金）', 'info');
    return { ok: true, qty: qty, cost: cost, msg: '买到 ' + f.name + ' ×' + qty };
  }

  function sellFert(s, kind, n) {
    const f = FERT[kind];
    if (!f) return { ok: false, msg: '没有这种肥料' };
    const have = s.ferts[kind] || 0;
    if (!have) return { ok: false, msg: '没有' + f.name };
    const qty = n ? Math.min(n, have) : have;
    const gain = qty * fertSellPrice(kind);
    s.ferts[kind] = have - qty;
    addCoins(s, gain, '卖肥料 ' + f.name);
    log(s, '💰 卖出' + f.name + ' ×' + qty + '，+' + gain + ' 金', 'good');
    return { ok: true, qty: qty, income: gain, msg: '卖出 ' + f.name + ' ×' + qty + '，+' + gain + ' 金' };
  }

  /* 洒水器：每个每天自动浇 1 块地 */
  function buySprinkler(s) {
    if (s.coins < SPRINKLER_COST) return { ok: false, msg: '金币不够（' + SPRINKLER_COST + ' 金）' };
    if (s.sprinklers >= s.plots.length) return { ok: false, msg: '每块地一个就够了（现有 ' + s.plots.length + ' 块地）' };
    s.coins -= SPRINKLER_COST;
    ledger(s, '买洒水器', 0, SPRINKLER_COST);
    s.sprinklers++;
    log(s, '🚿 买了第 ' + s.sprinklers + ' 个洒水器（每天自动浇 1 块地）', 'good');
    return { ok: true, msg: '洒水器 ×' + s.sprinklers, sprinklers: s.sprinklers };
  }

  /* 这块地能不能施肥（大作物、已施肥、已成熟都不行） */
  function canFert(s, idx) {
    const p = s.plots[idx];
    if (!p || !p.crop) return false;
    if (CROPS[p.crop].big) return false;
    if (p.fert) return false;
    if (p.phase === 'ripe') return false;
    return true;
  }

  function fertTargets(s) {
    const list = [];
    s.plots.forEach(function (p, i) { if (canFert(s, i)) list.push(i); });
    return list;
  }

  /* 全部施肥：给所有可施肥的地块灌同一种肥，钱/体力不够就停 */
  function fertilizeAll(s, kind) {
    const f = FERT[kind];
    if (!f) return { ok: false, msg: '没有这种肥料' };
    const targets = fertTargets(s);
    if (!targets.length) return { ok: false, msg: '没有可施肥的地块（大作物、已施肥、已成熟都不行）' };

    let n = 0, stop = null;
    for (let k = 0; k < targets.length; k++) {
      if (s.energy < 1) { stop = '体力不够了'; break; }
      if ((s.ferts[kind] || 0) < 1) { stop = '肥料不够了'; break; }
      const p = s.plots[targets[k]];
      s.ferts[kind]--;
      s.energy -= 1;
      p.fert = f.add;
      n++;
    }
    if (!n) return { ok: false, msg: stop || '施肥失败' };

    log(s, '🧪 ' + f.name + ' × ' + n + ' 块地（每块 +' + f.add + ' 产量、品质更优）' +
            (stop ? '，' + stop : ''), 'good');
    return {
      ok: true, n: n, stop: stop,
      msg: '施了 ' + n + ' 块地' + (stop ? '（' + stop + '）' : '')
    };
  }

  function sleep(s) {
    const fee = mealFee(s);
    const notes = [];
    if (s.coins >= fee) {
      addCoins(s, -fee, '伙食费');
      notes.push('🍖 伙食费 -' + fee + ' 金');
      s.energy = s.maxEnergy;
    } else {
      // 没钱只恢复到「上限的 30%，至少 5 点」，但不会扣掉已有的体力
      const floor = Math.max(5, Math.round(s.maxEnergy * 0.3));
      s.energy = Math.max(s.energy, Math.min(floor, s.maxEnergy));
      notes.push('😵 没钱吃饭，只恢复到 ' + floor + ' 点体力');
    }

    // 自动收获器：睡觉时把能收的地块收掉，不耗体力
    if (s.harvester && s.harvesterOn) {
      let hn = 0, hval = 0;
      s.plots.forEach(function (p, i) {
        if (!p.crop || !canHarvest(s, p)) return;
        const hr = harvest(s, i, true);
        if (hr.ok) { hn++; hval += hr.qty * hr.unit; }
      });
      if (hn) notes.push('🤖 自动收获器收了 ' + hn + ' 块地（值 ' + hval + ' 金）');
    }

    s.plots.forEach(function (p) {
      if (p.crop && (p.phase === 'growing' || p.phase === 'regrow') && !p.watered) p.missed++;
    });
    s.plots.forEach(function (p) { p.watered = false; });

    s.day++;
    s.teaUsed = false;
    s.workUsed = false;
    s.weather = rollWeather();
    const w = WEATHER[s.weather];
    notes.push(w.emoji + ' 第 ' + s.day + ' 天 · ' + w.name);

    if (w.autoWater) {
      let n = 0, ripe = 0;
      s.plots.forEach(function (p) {
        if (!p.crop || p.phase === 'ripe') return;
        if (!p.watered) { if (grow(p, s)) ripe++; p.watered = true; n++; }
      });
      if (n) notes.push('🌧️ 自动浇水 ' + n + ' 块地' + (ripe ? '，' + ripe + ' 块成熟' : ''));
    } else if (s.sprinklers > 0) {
      // 洒水器：每天自动浇前 N 块没浇的地，不耗体力
      let n = 0, ripe = 0;
      s.plots.forEach(function (p) {
        if (n >= s.sprinklers) return;
        if (!p.crop || p.phase === 'ripe' || p.watered) return;
        if (grow(p, s)) ripe++;
        p.watered = true;
        n++;
      });
      if (n) notes.push('🚿 洒水器浇了 ' + n + ' 块地' + (ripe ? '，' + ripe + ' 块成熟' : ''));
    }

    // 渔网：每天消耗面团饵，有概率上鱼
    if (s.nets > 0) {
      const nr = netCatch(s);
      if (nr.used) notes.push('🕸️ 渔网用掉 ' + nr.used + ' 份面团饵，网上 ' + nr.got + ' 条鱼');
    }

    // 5 块地之后每周要交土地维护费
    const landFee = plotUpkeep(s.plots.length);
    const devFee = deviceUpkeep(s);
    const up = landFee + devFee;
    if (up > 0 && s.day % 7 === 0) {
      const pay = Math.min(up, s.coins);
      s.coins -= pay;
      ledger(s, '维护费（周）', 0, pay);
      notes.push('🧾 本周维护费 -' + pay + ' 金（土地 ' + landFee + ' + 设备 ' + devFee + '）');
    }

    // 月度税金：每 30 天按金币 5% 收
    if (s.day % 30 === 0) {
      const tax = taxDue(s);
      const pay = Math.min(tax, s.coins);
      s.coins -= pay;
      ledger(s, '月度税金', 0, pay);
      notes.push('🏛️ 月度税金 -' + pay + ' 金');
    }

    log(s, '🌙 睡觉 → 第 ' + s.day + ' 天 · ' + w.name, 'sys');
    return { ok: true, msg: '新的一天', day: s.day, notes: notes, weather: s.weather };
  }

  function pickBait(s, prefer) {
    if (prefer === 'worm' && s.bait.worm > 0) return 'worm';
    if (prefer === 'dough' && s.bait.dough > 0) return 'dough';
    if (prefer === 'lure' && s.lure.owned && s.lure.dur > 0) return 'lure';
    if (s.bait.worm > 0) return 'worm';
    if (s.bait.dough > 0) return 'dough';
    if (s.lure.owned && s.lure.dur > 0) return 'lure';
    return null;
  }

  function baitCount(s, kind) {
    if (kind === 'worm') return s.bait.worm;
    if (kind === 'dough') return s.bait.dough;
    if (kind === 'lure') return s.lure.owned ? s.lure.dur : 0;
    return 0;
  }

  function fish(s, preferBait, opts) {
    opts = opts || {};
    const w = WEATHER[s.weather];
    if (!opts.free && s.energy < 2) return { ok: false, msg: '体力不够（钓鱼要 2 点）' };
    const kind = opts.forceKind || pickBait(s, preferBait);
    if (!kind) return { ok: false, msg: '没有饵料了，先去挖蚯蚓或买面团饵' };

    if (!opts.free) s.energy -= 2;
    if (!opts.noBait) {
      if (kind === 'worm') {
        s.bait.worm--;
      } else if (kind === 'dough') {
        s.bait.dough--;
      } else {
        s.lure.dur--;
        if (s.lure.dur <= 0) { s.lure.owned = false; s.lure.dur = 0; }
      }
    }

    // 先判定咬钩：天气与饵决定「有没有鱼咬」，鱼种权重不再受天气影响
    s.stats.casts++;
    const hook = clamp((HOOK[kind] || 0.9) + (w.hookMod || 0), 0.3, 0.98);
    if (rand() > hook) {
      if (!opts.quiet) log(s, '💨 空竿：' + w.name + '，没有鱼咬钩', 'warn');
      return { ok: true, empty: true, entry: null, msg: '空竿了' };
    }

    // 鱼种权重只由饵决定：蚯蚓多好鱼、假饵少杂物
    const table = FISH.map(function (f) {
      let mul = 1;
      if (f.trash) mul = kind === 'lure' ? 0.3 : 1;
      else if (kind === 'worm') mul = 1.35;
      else if (kind === 'lure') mul = 1.15;
      return Object.assign({}, f, { w: f.w * mul });
    });
    const f = weighted(table, 'w');
    const q = f.trash ? null : rollQuality(kind === 'worm');
    const value = f.trash ? 1 : Math.max(1, Math.round(f.base * q.mul));

    let name = f.name, emoji = f.emoji;
    if (f.trash) {
      const junk = TRASH[Math.floor(rand() * TRASH.length)] || TRASH[0];
      name = junk.name;
      emoji = junk.emoji;
    }

    // 图鉴：次数 / 首次 / 完美 / 累计价值 / 最好品质
    const cx = s.codex.fish[f.id] ||
      (s.codex.fish[f.id] = { n: 0, best: null, first: s.day, perfect: 0, value: 0 });
    cx.n++;
    if (!cx.first) cx.first = s.day;
    cx.value = (cx.value || 0) + value;
    if (q && q.id === 'perfect') cx.perfect = (cx.perfect || 0) + 1;
    if (!f.trash && q && (!cx.best || QUALITY.indexOf(q) > QUALITY.indexOf(qualityById(cx.best)))) {
      cx.best = q.id;
    }

    // 渔获进仓库，卖掉才换钱
    s.fishBag = s.fishBag || [];
    const noOrder = !!f.noOrder || !!f.trash;      // 杂物、宝箱不算委托
    s.fishBag.push({ name: name, emoji: emoji, q: q ? q.id : null, v: value, d: s.day, no: noOrder || undefined });

    const entry = { day: s.day, fish: name, emoji: emoji, quality: q, price: value,
                    base: f.base, bait: kind, trash: !!f.trash, noOrder: noOrder };
    s.fishBook.count++;
    s.fishBook.entries.unshift(entry);
    if (s.fishBook.entries.length > 40) s.fishBook.entries.length = 40;
    if (!f.trash) {
      if (!s.fishBook.best || QUALITY.indexOf(q) > QUALITY.indexOf(s.fishBook.best.quality)) {
        s.fishBook.best = { fish: f.name, quality: q, price: value, day: s.day };
      }
      if (!s.fishBook.priciest || value > s.fishBook.priciest.price) {
        s.fishBook.priciest = { fish: f.name, quality: q, price: value, day: s.day };
      }
    }
    if (!opts.quiet) {
      log(s, f.trash
        ? '🎣 钓上来 ' + emoji + ' ' + name + '（不值钱，已入仓库）'
        : '🎣 钓到 ' + emoji + ' ' + name + ' · ' + q.emoji + q.name + ' · 值 ' + value + ' 金（已入仓库）',
        f.trash ? 'warn' : 'good');
    }
    return { ok: true, entry: entry, msg: name + ' 值 ' + value + ' 金' };
  }

  function fishMany(s, times, preferBait) {
    const results = [];
    let value = 0, empty = 0;
    for (let i = 0; i < times; i++) {
      const r = fish(s, preferBait);
      if (!r.ok) { results.push(r); break; }
      if (r.empty) empty++; else value += r.entry.price;
      results.push(r);
    }
    const okCount = results.filter(function (r) { return r.ok; }).length;
    if (!okCount) return results[0] || { ok: false, msg: '钓不了' };
    return { ok: true, count: okCount, empty: empty, income: value, results: results,
             msg: '甩了 ' + okCount + ' 杆' + (empty ? '（空竿 ' + empty + '）' : '') + '，渔获值 ' + value + ' 金' };
  }

  /* ---------------- 卖鱼 ---------------- */

  function fishKey(e) { return e.name + '|' + (e.q || '-') + '|' + e.v; }

  function fishGroups(s) {
    const map = new Map();
    (s.fishBag || []).forEach(function (e) {
      const key = fishKey(e);
      let g = map.get(key);
      if (!g) {
        g = { key: key, name: e.name, emoji: e.emoji, q: e.q, v: e.v, count: 0 };
        map.set(key, g);
      }
      g.count++;
    });
    return Array.from(map.values()).sort(function (a, b) { return b.v * b.count - a.v * a.count; });
  }

  const qualityById = function (id) {
    if (!id) return null;
    for (let i = 0; i < QUALITY.length; i++) if (QUALITY[i].id === id) return QUALITY[i];
    return null;
  };

  /* ---------------- 仓库：作物按品质分桶 ---------------- */

  function emptyBuckets() {
    const b = {};
    Q_IDS.forEach(function (id) { b[id] = 0; });
    return b;
  }

  function addStore(s, id, qid, n) {
    if (!CROPS[id] || !n) return;
    const b = s.store[id] || (s.store[id] = emptyBuckets());
    b[qid] = (b[qid] || 0) + n;
  }

  function storeCount(s, id) {
    const b = s.store[id];
    if (!b) return 0;
    let n = 0;
    Q_IDS.forEach(function (q) { n += b[q] || 0; });
    return n;
  }

  /* 单个作物按品质算钱：单价 = 基础价 × 品质倍率（最低 1 金） */
  function unitValue(id, qid) {
    const c = CROPS[id];
    const q = qualityById(qid);
    if (!c || !q) return 0;
    return Math.max(1, Math.round(c.price * q.mul));
  }

  function storeValue(s, id) {
    const b = s.store[id];
    if (!b) return 0;
    let v = 0;
    Q_IDS.forEach(function (q) { if (b[q]) v += b[q] * unitValue(id, q); });
    return v;
  }

  /* 品质构成（好的在前），给界面显示用 */
  function storeMix(s, id) {
    const b = s.store[id];
    if (!b) return [];
    const out = [];
    QUALITY.slice().reverse().forEach(function (q) {
      if (b[q.id]) out.push({ id: q.id, name: q.name, emoji: q.emoji, color: q.color, n: b[q.id] });
    });
    return out;
  }

  /* 交委托时按品质从低到高扣，好东西留给玩家 */
  function takeStore(s, id, n) {
    const b = s.store[id];
    if (!b) return 0;
    let left = n;
    for (let i = 0; i < QUALITY.length && left > 0; i++) {
      const q = QUALITY[i].id;
      const take = Math.min(left, b[q] || 0);
      if (take) { b[q] -= take; left -= take; }
    }
    if (storeCount(s, id) <= 0) delete s.store[id];
    return n - left;
  }

  function sellFishGroup(s, key) {
    const g = fishGroups(s).filter(function (x) { return x.key === key; })[0];
    if (!g) return { ok: false, msg: '仓库里没有这种鱼' };
    const gain = g.v * g.count;
    s.fishBag = s.fishBag.filter(function (e) { return fishKey(e) !== key; });
    addCoins(s, gain, '卖鱼 ' + g.name);
    log(s, '💰 卖出 ' + g.emoji + ' ' + g.name + ' ×' + g.count + '，+' + gain + ' 金', 'good');
    return { ok: true, msg: '卖出 ' + g.name + '×' + g.count + '，+' + gain + ' 金', income: gain };
  }

  function sellAllFish(s) {
    const bag = s.fishBag || [];
    if (!bag.length) return { ok: false, msg: '仓库里没有鱼' };
    const gain = bag.reduce(function (n, e) { return n + e.v; }, 0);
    const n = bag.length;
    s.fishBag = [];
    addCoins(s, gain, '卖鱼');
    log(s, '💰 卖出全部渔获 ' + n + ' 条，+' + gain + ' 金', 'good');
    return { ok: true, msg: '卖出 ' + n + ' 条鱼，+' + gain + ' 金', income: gain };
  }

  /* 蚯蚓也能卖：3 金/条（只在渔具店卖） */
  const WORM_VALUE = 3;

  function sellWorms(s, n) {
    const have = s.bait.worm || 0;
    if (!have) return { ok: false, msg: '没有蚯蚓可卖' };
    const qty = n ? Math.min(n, have) : have;
    const gain = qty * WORM_VALUE;
    s.bait.worm = have - qty;
    addCoins(s, gain, '卖蚯蚓');
    log(s, '💰 卖出蚯蚓 ×' + qty + '，+' + gain + ' 金', 'good');
    return { ok: true, qty: qty, income: gain, msg: '卖出蚯蚓 ×' + qty + '，+' + gain + ' 金' };
  }

  function digWorms(s) {
    if (s.energy < 3) return { ok: false, msg: '体力不够（挖蚯蚓要 3 点）' };
    const w = WEATHER[s.weather];
    const n = clamp(randInt(1, 3) + w.wormMod, 1, 5);
    s.energy -= 3;
    s.bait.worm += n;
    s.stats.dug++;
    log(s, '🪱 挖到蚯蚓 ×' + n + '（现有 ' + s.bait.worm + '）', 'good');
    return { ok: true, msg: '挖到蚯蚓 ×' + n, n: n };
  }

  function buyBait(s, kind, n) {
    n = n || 1;
    if (kind === 'dough') {
      const cost = 1 * n;
      if (s.coins < cost) return { ok: false, msg: '金币不够' };
      s.coins -= cost; ledger(s, '买面团饵 ×' + n, 0, cost);
      s.bait.dough += n;
      log(s, '🍞 买了面团饵 ×' + n + '（-' + cost + ' 金）', 'info');
      return { ok: true, msg: '面团饵 ×' + n };
    }
    if (kind === 'lure') {
      if (s.lure.owned) return { ok: false, msg: '假饵一次只能持 1 个' };
      if (s.coins < 5) return { ok: false, msg: '金币不够（5 金）' };
      s.coins -= 5; ledger(s, '买假饵', 0, 5);
      s.lure.owned = true; s.lure.dur = 20;
      log(s, '🎣 买了一个假饵（耐用 20 次）', 'info');
      return { ok: true, msg: '假饵到手' };
    }
    return { ok: false, msg: '这种饵料买不到' };
  }

  function tea(s) {
    if (s.teaUsed) return { ok: false, msg: '今天下午茶已经喝过了' };
    if (s.coins < 3) return { ok: false, msg: '金币不够（3 金）' };
    if (s.energy >= s.maxEnergy) return { ok: false, msg: '体力是满的，别浪费' };
    s.coins -= 3; ledger(s, '下午茶', 0, 3);
    s.teaUsed = true;
    s.energy = Math.min(s.maxEnergy, s.energy + 5);
    log(s, '🍵 喝了下午茶，体力 +5（' + s.energy + '/' + s.maxEnergy + '）', 'good');
    return { ok: true, msg: '体力 +5' };
  }

  /* 打零工：每天只能打一次；体力够就干全天（×2.0），否则半天（×1.2，体力不足就用光） */
  function workAuto(s) {
    const full = workCost(s, 'full');
    return work(s, s.energy >= full ? 'full' : 'half');
  }

  function work(s, mode) {
    if (s.workUsed) return { ok: false, msg: '今天已经打过零工了，明天再来' };
    const cost = workCost(s, mode);

    // 半天零工体力不足时：把剩下的体力全用上，收益仍按 ×1.2 结算
    if (mode === 'half' && s.energy < cost) {
      const spent = s.energy;
      if (spent <= 0) return { ok: false, msg: '体力已经见底了，先睡觉吧' };
      const pay = Math.round(spent * WORK_RATE_HALF);
      s.energy = 0;
      s.workUsed = true;
      addCoins(s, pay, '半天零工');
      log(s, '🕐 半天零工（体力不足，全用上）：-' + spent + ' 体力，+' + pay + ' 金', 'good');
      return { ok: true, msg: '+' + pay + ' 金（用掉全部 ' + spent + ' 体力）', pay: pay, spent: spent, partial: true };
    }

    if (s.energy < cost) return { ok: false, msg: '体力不足（需要 ' + cost + ' 点）' };
    const pay = workPay(s, mode);
    s.energy -= cost;
    s.workUsed = true;
    addCoins(s, pay, mode === 'half' ? '半天零工' : '全天零工');
    log(s, (mode === 'half' ? '🕐' : '🕑') + (mode === 'half' ? '半天' : '全天') +
            '零工：-' + cost + ' 体力，+' + pay + ' 金', 'good');
    return { ok: true, msg: '+' + pay + ' 金', pay: pay, spent: cost };
  }

  /* 自动收获器：睡觉时免费收成熟作物 */
  const HARVESTER_COST = 200;
  const NET_COST = 80;
  const NET_MAX = 9;
  const NET_CHANCE = 0.65;

  /* 月度税金：按金币 5% 收，最低 20 金 */
  function taxDue(s) { return Math.max(20, Math.round((s.coins || 0) * 0.05)); }

  /* 水产店售价：基础价的 1.8 倍 */
  function fishBuyPrice(id) {
    const f = FISH.filter(function (x) { return x.id === id; })[0];
    return f ? Math.max(3, Math.round(f.base * 1.8)) : 0;
  }

  function buyFish(s, id, n) {
    const f = FISH.filter(function (x) { return x.id === id; })[0];
    if (!f || f.trash) return { ok: false, msg: '这种水产买不到' };
    const qty = Math.max(1, Math.floor(n || 1));
    const cost = fishBuyPrice(id) * qty;
    if (s.coins < cost) return { ok: false, msg: '金币不够' };
    s.coins -= cost;
    ledger(s, '买水产 ' + f.name + ' ×' + qty, 0, cost);
    for (let i = 0; i < qty; i++) {
      s.fishBag.push({ name: f.name, emoji: f.emoji, q: 'std', v: f.base, d: s.day });
    }
    log(s, '🐟 买进 ' + f.emoji + ' ' + f.name + ' ×' + qty + '（-' + cost + ' 金）', 'info');
    return { ok: true, qty: qty, cost: cost, msg: '买到 ' + f.name + ' ×' + qty };
  }

  /* 渔网：每天吃 1 份面团饵，有概率网到 1 条鱼 */
  function netCatch(s) {
    let got = 0, used = 0;
    for (let i = 0; i < s.nets; i++) {
      if ((s.bait.dough || 0) < 1) break;
      s.bait.dough--;
      used++;
      if (rand() < NET_CHANCE) {
        const r = fish(s, 'dough', { free: true, noBait: true, forceKind: 'dough', quiet: true });
        if (r.ok) got++;
      }
    }
    return { used: used, got: got };
  }

  function buyNet(s) {
    if (s.nets >= NET_MAX) return { ok: false, msg: '最多放 ' + NET_MAX + ' 张渔网' };
    if (s.coins < NET_COST) return { ok: false, msg: '金币不够（' + NET_COST + ' 金）' };
    s.coins -= NET_COST;
    ledger(s, '买渔网', 0, NET_COST);
    s.nets++;
    log(s, '🕸️ 在河边放了第 ' + s.nets + ' 张渔网（每天耗 1 面团饵，有概率上鱼）', 'good');
    return { ok: true, msg: '渔网 ×' + s.nets, nets: s.nets };
  }

  function toggleHarvester(s) {
    if (!s.harvester) return { ok: false, msg: '还没买自动收获器' };
    s.harvesterOn = !s.harvesterOn;
    log(s, '🤖 自动收获器已' + (s.harvesterOn ? '开启' : '关闭'), 'info');
    return { ok: true, msg: '自动收获器已' + (s.harvesterOn ? '开启' : '关闭'), on: s.harvesterOn };
  }

  function buyHarvester(s) {
    if (s.harvester) return { ok: false, msg: '已经有自动收获器了' };
    if (s.coins < HARVESTER_COST) return { ok: false, msg: '金币不够（' + HARVESTER_COST + ' 金）' };
    s.coins -= HARVESTER_COST;
    ledger(s, '买自动收获器', 0, HARVESTER_COST);
    s.harvester = true;
    log(s, '🤖 买了自动收获器（每天睡觉时自动收获成熟作物，不耗体力）', 'good');
    return { ok: true, msg: '自动收获器已安装' };
  }

  /* 委托手动刷新：每天一次 */
  function refreshOrders(s) {
    if (s.orderRefreshDay === s.day) return { ok: false, msg: '今天的委托已经刷新过了，明天再来' };
    s.orders = makeOrders(s);
    s.orderRefreshDay = s.day;
    log(s, '📋 刷新了今日委托：' + s.orders.length + ' 单', 'info');
    return { ok: true, msg: '刷新了 ' + s.orders.length + ' 个委托', orders: s.orders };
  }

  /* 仓库总价：作物（按品质）+ 渔获 + 蚯蚓 + 肥料（半价） */
  function storeTotal(s) {
    let v = 0;
    Object.keys(s.store).forEach(function (id) { v += storeValue(s, id); });
    (s.fishBag || []).forEach(function (e) { v += e.v || 0; });
    v += (s.bait.worm || 0) * WORM_VALUE;
    v += (s.ferts.normal || 0) * fertSellPrice('normal');
    v += (s.ferts.special || 0) * fertSellPrice('special');
    return v;
  }

  /* ---------------- 种子店 ---------------- */

  const SEED_SELL_RATE = 0.5;          // 回收价 = 售价的一半

  function seedBuyPrice(c) { return c.seed; }
  function seedSellPrice(c) { return Math.max(1, Math.floor(c.seed * SEED_SELL_RATE)); }

  function buySeed(s, id, n) {
    const c = CROPS[id];
    if (!c) return { ok: false, msg: '没有这种种子' };
    const qty = Math.max(1, Math.floor(n || 1));
    const cost = seedBuyPrice(c) * qty;
    if (s.coins < cost) return { ok: false, msg: '金币不够（需要 ' + cost + ' 金）' };
    s.coins -= cost;
    ledger(s, '买种子 ' + c.name + '×' + qty, 0, cost);
    s.seeds[id] = (s.seeds[id] || 0) + qty;
    log(s, '🌰 买了 ' + c.name + '种子 ×' + qty + '（-' + cost + ' 金）', 'info');
    return { ok: true, msg: '买到 ' + c.name + ' 种子 ×' + qty, qty: qty, cost: cost };
  }

  function sellSeed(s, id, n) {
    const c = CROPS[id];
    if (!c) return { ok: false, msg: '没有这种种子' };
    const have = s.seeds[id] || 0;
    if (!have) return { ok: false, msg: '没有 ' + c.name + ' 种子' };
    const qty = n ? Math.min(n, have) : have;
    const gain = qty * seedSellPrice(c);
    const left = have - qty;
    if (left > 0) s.seeds[id] = left; else delete s.seeds[id];
    addCoins(s, gain, '卖种子 ' + c.name);
    log(s, '💰 卖出 ' + c.name + '种子 ×' + qty + '，+' + gain + ' 金', 'good');
    return { ok: true, msg: '卖出 ' + qty + ' 颗种子，+' + gain + ' 金', qty: qty, income: gain };
  }

  function sellAllSeeds(s) {
    const ids = Object.keys(s.seeds).filter(function (k) { return s.seeds[k] > 0; });
    if (!ids.length) return { ok: false, msg: '没有种子可卖' };
    let total = 0;
    ids.forEach(function (id) { total += (s.seeds[id] || 0) * seedSellPrice(CROPS[id]); });
    s.seeds = {};
    addCoins(s, total, '卖种子');
    log(s, '💰 清空种子，+' + total + ' 金', 'good');
    return { ok: true, msg: '卖出全部种子，+' + total + ' 金', income: total };
  }

  /* 全部播种：把所有空地都种上同一种作物 */
  function plantAll(s, cropId) {
    const c = CROPS[cropId];
    if (!c) return { ok: false, msg: '没有这种作物' };
    const targets = [];
    s.plots.forEach(function (p, i) { if (!p.crop) targets.push(i); });
    if (!targets.length) return { ok: false, msg: '没有空地了' };
    if ((s.seeds[cropId] || 0) <= 0) return { ok: false, msg: '没有 ' + c.name + ' 种子了' };

    let n = 0, stop = null;
    for (let k = 0; k < targets.length; k++) {
      const r = plant(s, targets[k], cropId);
      if (!r.ok) { stop = r.msg; break; }
      n++;
    }
    if (!n) return { ok: false, msg: stop || '播种失败' };
    return {
      ok: true, planted: n, stop: stop,
      msg: '种下 ' + c.name + ' ×' + n + (stop ? '（' + stop + '）' : '')
    };
  }

  function expand(s) {
    const cost = expandCost(s);
    if (s.coins < cost) return { ok: false, msg: '金币不够（' + cost + ' 金）' };
    s.coins -= cost; ledger(s, '开垦第 ' + (s.plots.length + 1) + ' 块地', 0, cost);
    s.plots.push(makePlot());
    log(s, '🏞️ 开垦了第 ' + s.plots.length + ' 块地（-' + cost + ' 金）', 'good');
    return { ok: true, msg: '现在有 ' + s.plots.length + ' 块地', plots: s.plots.length };
  }

  function upgrade(s) {
    const cost = upgradeCost(s);
    if (s.coins < cost) return { ok: false, msg: '金币不够（' + cost + ' 金）' };
    s.coins -= cost; ledger(s, '体力上限强化', 0, cost);
    s.maxEnergy += 5;
    log(s, '💪 体力上限 → ' + s.maxEnergy + '（伙食费 ' + mealFee(s) + ' 金/天）', 'good');
    return { ok: true, msg: '体力上限 ' + s.maxEnergy, maxEnergy: s.maxEnergy };
  }

  /* ---------------- 每日委托 ---------------- */

  /* 委托池随天数解锁：头几天只出便宜作物，后期才要贵货 */
  function orderPool(day) {
    const sorted = CROP_LIST.slice().sort(function (a, b) { return a.seed - b.seed; });
    const n = day <= 4 ? 4 : (day <= 9 ? 7 : sorted.length);
    return sorted.slice(0, n);
  }

  function makeOrders(s) {
    const day = (s && s.day) || 1;
    const pool = orderPool(day);
    const used = [];
    const orders = [];
    const mult = 1 + Math.floor((day - 1) / 30) * 0.6;    // 春 1 / 夏 1.6 / 秋 2.2 / 冬 2.8

    for (let i = 0; i < 2 && pool.length; i++) {
      let c = null;
      for (let t = 0; t < 12; t++) {
        const cand = pool[Math.floor(rand() * pool.length)];
        if (used.indexOf(cand.id) < 0) { c = cand; break; }
      }
      if (!c) c = pool[i % pool.length];
      used.push(c.id);
      const qty = Math.max(1, Math.round((c.price >= 20 ? randInt(1, 2) : randInt(3, 6)) * mult));
      const reward = Math.max(6, Math.round(qty * c.price * 1.35));
      orders.push({
        id: 'd' + day + '-c' + i, kind: 'crop', crop: c.id, name: c.name, emoji: c.emoji,
        qty: qty, reward: reward, done: false
      });
    }

    const fq = Math.max(2, Math.round(randInt(2, 3) * mult));
    orders.push({
      id: 'd' + day + '-f', kind: 'fish', crop: null, name: '任意鱼', emoji: '🐟',
      qty: fq, reward: Math.max(12, Math.round(fq * 11)), done: false
    });
    return orders;
  }

  /* 委托进度：作物看仓库，鱼看渔获袋 */
  /* 杂物、宝箱不算委托的鱼 */
  function orderFish(s) {
    return (s.fishBag || []).filter(function (e) { return e && e.q && !e.no; });
  }

  function orderHave(s, o) {
    if (!o) return 0;
    if (o.kind === 'fish') return orderFish(s).length;
    return storeCount(s, o.crop);
  }

  function deliverOrder(s, id) {
    const o = (s.orders || []).filter(function (x) { return x.id === id; })[0];
    if (!o) return { ok: false, msg: '没有这个委托' };
    if (o.done) return { ok: false, msg: '这单已经交过了' };
    const have = orderHave(s, o);
    if (have < o.qty) return { ok: false, msg: '还差 ' + (o.qty - have) + ' 个' };

    if (o.kind === 'fish') {
      // 交最便宜的可交鱼，好鱼和杂物都留着
      const drop = orderFish(s).sort(function (a, b) { return a.v - b.v; }).slice(0, o.qty);
      s.fishBag = s.fishBag.filter(function (e) { return drop.indexOf(e) < 0; });
    } else {
      takeStore(s, o.crop, o.qty);
    }
    o.done = true;
    s.stats.orders = (s.stats.orders || 0) + 1;
    addCoins(s, o.reward, '委托 · ' + o.name + '×' + o.qty);
    log(s, '📋 完成委托：' + o.emoji + ' ' + o.name + ' ×' + o.qty + '，+' + o.reward + ' 金', 'good');
    return { ok: true, reward: o.reward, msg: '委托完成，+' + o.reward + ' 金' };
  }

  function normalizeOrders(list, s) {
    if (!Array.isArray(list)) return makeOrders(s);
    const out = [];
    list.slice(0, 6).forEach(function (o, i) {
      if (!o || (o.kind !== 'crop' && o.kind !== 'fish')) return;
      if (o.kind === 'crop' && !CROPS[o.crop]) return;
      out.push({
        id: String(o.id || ('x' + i)),
        kind: o.kind,
        crop: o.kind === 'crop' ? o.crop : null,
        name: o.kind === 'crop' ? CROPS[o.crop].name : '任意鱼',
        emoji: o.kind === 'crop' ? CROPS[o.crop].emoji : '🐟',
        qty: Math.round(num(o.qty, 1, 1, 99)),
        reward: Math.round(num(o.reward, 10, 1, 9999)),
        done: !!o.done
      });
    });
    return out.length ? out : makeOrders(s);
  }

  /* ---------------- 存读档 ---------------- */

  function serialize(s) { return JSON.stringify(s); }

  /* 账本按天汇总：每天一条，balance 取当天最后一笔的余额 */
  function ledgerByDay(s) {
    const days = [];
    const map = new Map();
    (s.ledger || []).forEach(function (r) {
      let d = map.get(r.day);
      if (!d) {
        d = { day: r.day, income: 0, expense: 0, balance: r.balance, items: [] };
        map.set(r.day, d);
        days.push(d);
      }
      d.income += r.income || 0;
      d.expense += r.expense || 0;
      d.items.push(r);
    });
    return days;
  }

  /* 日志按天汇总：每天一条，items 里是当天的记录（新→旧） */
  function logByDay(s) {
    const days = [];
    const map = new Map();
    (s.log || []).forEach(function (r) {
      let d = map.get(r.day);
      if (!d) { d = { day: r.day, items: [] }; map.set(r.day, d); days.push(d); }
      d.items.push(r);
    });
    return days;
  }

  function num(v, def, min, max) {
    const n = Number(v);
    if (!isFinite(n)) return def;
    return Math.min(max == null ? Infinity : max,
                    Math.max(min == null ? -Infinity : min, n));
  }

  function deserialize(json) {
    const s = typeof json === 'string' ? JSON.parse(json) : json;
    if (!s || typeof s !== 'object') throw new Error('bad save');
    const base = createState();
    const merged = Object.assign(base, s);

    // 数值清洗：导入的存档不能带 NaN / 负数 / 离谱的地块数
    merged.maxEnergy = Math.round(num(s.maxEnergy, 10, 5, 100) / 5) * 5;
    merged.day = Math.round(num(s.day, 1, 1, 100000));
    merged.coins = Math.round(num(s.coins, 50, 0, 1e9));
    merged.energy = num(s.energy, merged.maxEnergy, 0, merged.maxEnergy);

    const plots = Array.isArray(s.plots) ? s.plots.slice(0, 40) : [];
    merged.plots = (plots.length ? plots : [{}]).map(function (p) {
      const plot = Object.assign(makePlot(), p || {});
      if (!CROPS[plot.crop]) plot.crop = null;
      plot.growth = num(plot.growth, 0, 0, 99);
      plot.missed = num(plot.missed, 0, 0, 99);
      plot.fert = num(plot.fert, 0, 0, 2);
      plot.hits = num(plot.hits, 0, 0, 9);
      if (!plot.crop) return makePlot();
      if (['growing', 'regrow', 'ripe'].indexOf(plot.phase) < 0) plot.phase = 'growing';
      return plot;
    });

    merged.bait = Object.assign({ worm: 0, dough: 0 }, s.bait || {});
    merged.bait.worm = Math.round(num(merged.bait.worm, 0, 0, 9999));
    merged.bait.dough = Math.round(num(merged.bait.dough, 0, 0, 9999));
    merged.lure = Object.assign({ owned: false, dur: 0 }, s.lure || {});
    merged.lure.dur = Math.round(num(merged.lure.dur, 0, 0, 20));
    merged.lure.owned = !!merged.lure.owned && merged.lure.dur > 0;
    merged.fishBook = Object.assign({ count: 0, entries: [], best: null, priciest: null }, s.fishBook || {});
    merged.stats = Object.assign({ harvests: 0, casts: 0, dug: 0, planted: 0, orders: 0 }, s.stats || {});
    merged.orders = normalizeOrders(s.orders, merged);
    merged.seeds = s.seeds && typeof s.seeds === 'object' ? s.seeds : {};
    // 老存档的仓库是「作物: 数量」，这里迁移成「作物: {品质: 数量}」
    merged.store = {};
    const rawStore = s.store && typeof s.store === 'object' ? s.store : {};
    Object.keys(rawStore).forEach(function (id) {
      if (!CROPS[id]) return;
      const v = rawStore[id];
      if (typeof v === 'number') {
        const n = Math.round(num(v, 0, 0, 9999));
        if (n > 0) addStore(merged, id, 'std', n);
      } else if (v && typeof v === 'object') {
        Q_IDS.forEach(function (q) {
          const n = Math.round(num(v[q], 0, 0, 9999));
          if (n > 0) addStore(merged, id, q, n);
        });
      }
    });
    merged.fishBag = Array.isArray(s.fishBag) ? s.fishBag.slice(0, 5000) : [];
    merged.ferts = Object.assign({ normal: 0, special: 0 }, s.ferts || {});
    merged.ferts.normal = Math.round(num(merged.ferts.normal, 0, 0, 999));
    merged.ferts.special = Math.round(num(merged.ferts.special, 0, 0, 999));
    merged.sprinklers = Math.round(num(s.sprinklers, 0, 0, 40));
    merged.harvester = !!s.harvester;
    merged.harvesterOn = s.harvesterOn !== false;
    merged.nets = Math.round(num(s.nets, 0, 0, NET_MAX));
    merged.codex = {
      fish: (s.codex && s.codex.fish && typeof s.codex.fish === 'object') ? s.codex.fish : {},
      crops: (s.codex && s.codex.crops && typeof s.codex.crops === 'object') ? s.codex.crops : {}
    };
    Object.keys(merged.codex.fish).forEach(function (k) {
      const c = merged.codex.fish[k] || {};
      merged.codex.fish[k] = { n: c.n || 0, best: c.best || null, first: c.first || null,
                               perfect: c.perfect || 0, value: c.value || 0 };
    });
    Object.keys(merged.codex.crops).forEach(function (k) {
      const c = merged.codex.crops[k] || {};
      merged.codex.crops[k] = { n: c.n || 0, best: c.best || null, first: c.first || null, value: c.value || 0 };
    });
    // 老存档回填：从最近 40 条钓鱼记录里反推图鉴
    if (!Object.keys(merged.codex.fish).length) {
      ((merged.fishBook && merged.fishBook.entries) || []).forEach(function (e) {
        if (!e || e.trash || !e.quality) return;
        const f = FISH.filter(function (x) { return x.name === e.fish; })[0];
        if (!f) return;
        const c = merged.codex.fish[f.id] ||
          (merged.codex.fish[f.id] = { n: 0, best: null, first: e.day || 1, perfect: 0, value: 0 });
        c.n++;
        c.value += e.price || 0;
        if (!c.first) c.first = e.day || 1;
        if (e.quality.id === 'perfect') c.perfect++;
        if (!c.best || QUALITY.indexOf(e.quality) > QUALITY.indexOf(qualityById(c.best))) c.best = e.quality.id;
      });
    }
    merged.orderRefreshDay = Math.round(num(s.orderRefreshDay, s.day || 1, 0, 100000));
    merged.workUsed = !!s.workUsed;
    merged.ledger = Array.isArray(s.ledger) ? s.ledger : base.ledger;
    merged.log = Array.isArray(s.log) ? s.log.slice(0, 400) : base.log;
    // 旧存档迁移：垃圾不参与品质判定（早期版本会给出「优质垃圾」）
    if (merged.fishBook.entries) {
      merged.fishBook.entries.forEach(function (e) { if (e && e.trash) e.quality = null; });
    }
    return merged;
  }

  /* ---------------- 导出 ---------------- */

  const API = {
    CROPS: CROPS, CROP_LIST: CROP_LIST, FERT: FERT, QUALITY: QUALITY, FISH: FISH,
    WEATHER: WEATHER, WEATHER_LIST: WEATHER_LIST, BAIT: BAIT, SAVE_VERSION: SAVE_VERSION,
    setRng: setRng, seasonOf: seasonOf, SEASONS: SEASONS,
    createState: createState, serialize: serialize, deserialize: deserialize,
    ledgerByDay: ledgerByDay, logByDay: logByDay,
    makeOrders: makeOrders, deliverOrder: deliverOrder, orderHave: orderHave, orderPool: orderPool,
    mealFee: mealFee, expandCost: expandCost, upgradeCost: upgradeCost,
    WORK_RATE_FULL: WORK_RATE_FULL, WORK_RATE_HALF: WORK_RATE_HALF,
    workCost: workCost, workPay: workPay, needOf: needOf, expectedYield: expectedYield,
    canHarvest: canHarvest, stageEmoji: stageEmoji, fertBonus: fertBonus, baitCount: baitCount,
    plant: plant, plantAll: plantAll, water: water, waterAll: waterAll,
    harvest: harvest, harvestAll: harvestAll, clearPlot: clearPlot,
    sellAll: sellAll, sellOne: sellOne, sellSeed: sellSeed, sellAllSeeds: sellAllSeeds,
    addStore: addStore, storeCount: storeCount, storeValue: storeValue, storeMix: storeMix,
    takeStore: takeStore, unitValue: unitValue,
    fishGroups: fishGroups, fishKey: fishKey, sellFishGroup: sellFishGroup, sellAllFish: sellAllFish,
    sellWorms: sellWorms, WORM_VALUE: WORM_VALUE,
    qualityById: qualityById,
    buySeed: buySeed, seedBuyPrice: seedBuyPrice, seedSellPrice: seedSellPrice,
    SEED_SELL_RATE: SEED_SELL_RATE,
    useFert: useFert, buyFertItem: buyFertItem, sellFert: sellFert, fertSellPrice: fertSellPrice,
    FERT_SELL_RATE: FERT_SELL_RATE, buySprinkler: buySprinkler, SPRINKLER_COST: SPRINKLER_COST,
    buyHarvester: buyHarvester, HARVESTER_COST: HARVESTER_COST, refreshOrders: refreshOrders,
    toggleHarvester: toggleHarvester, buyNet: buyNet, netCatch: netCatch,
    NET_COST: NET_COST, NET_MAX: NET_MAX, NET_CHANCE: NET_CHANCE, plotUpkeep: plotUpkeep,
    storeTotal: storeTotal, taxDue: taxDue, buyFish: buyFish, fishBuyPrice: fishBuyPrice, deviceUpkeep: deviceUpkeep, HOOK: HOOK,
    fertilizeAll: fertilizeAll, canFert: canFert, fertTargets: fertTargets, sleep: sleep, fish: fish,
    fishMany: fishMany, digWorms: digWorms, buyBait: buyBait, tea: tea, work: work, workAuto: workAuto,
    expand: expand, upgrade: upgrade, rollWeather: rollWeather
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.FarmGame = API;
})(typeof window !== 'undefined' ? window : globalThis);
