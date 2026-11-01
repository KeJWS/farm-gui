/* ============================================================
 * 我的小农场 · 游戏逻辑层（纯数据，不碰 DOM）
 * 规则来源：skills/farm-game/SKILL.md
 * ============================================================ */
(function (root) {
  'use strict';

  /* ---------------- 静态数据 ---------------- */

  const CROPS = {
    carrot:     { name: '萝卜', emoji: '🥕', seed: 5,  days: 2, base: 3, price: 4,  big: false },
    cabbage:    { name: '白菜', emoji: '🥬', seed: 8,  days: 2, base: 2, price: 8,  big: false },
    potato:     { name: '土豆', emoji: '🥔', seed: 10, days: 3, base: 3, price: 8,  big: false },
    corn:       { name: '玉米', emoji: '🌽', seed: 15, days: 3, base: 2, price: 16, big: false },
    eggplant:   { name: '茄子', emoji: '🍆', seed: 18, days: 4, base: 2, price: 22, big: false },
    tomato:     { name: '番茄', emoji: '🍅', seed: 20, days: 4, base: 3, price: 16, big: false },
    pumpkin:    { name: '南瓜', emoji: '🎃', seed: 25, days: 5, base: 1, price: 60, big: true  },
    watermelon: { name: '西瓜', emoji: '🍉', seed: 30, days: 5, base: 1, price: 76, big: true  },
    cucumber:   { name: '黄瓜', emoji: '🥒', seed: 12, days: 3, price: 13, multi: true,
                  firstQty: 2, regrowDays: 2, regrowQty: 2, regrowTimes: 2 },
    strawberry: { name: '草莓', emoji: '🍓', seed: 22, days: 3, price: 9,  multi: true,
                  firstQty: 3, regrowDays: 1, regrowQty: 2, regrowTimes: 3 }
  };
  Object.keys(CROPS).forEach(function (k) { CROPS[k].id = k; });
  const CROP_LIST = Object.keys(CROPS).map(function (k) { return CROPS[k]; });

  const FERT = {
    normal:  { id: 'normal',  name: '普通肥料', emoji: '🧪', cost: 5,  add: 1 },
    special: { id: 'special', name: '特效肥料', emoji: '💊', cost: 12, add: 2 }
  };

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
    { id: 'chest', name: '宝箱',     emoji: '📦', base: 15, w: 5  }
  ];

  const WEATHER = {
    sunny:  { id: 'sunny',  name: '晴天',   emoji: '☀️', w: 40, fishMul: 0.8, wormMod: -1,
              note: '钓鱼价值 -20% · 挖蚯蚓 -1 份' },
    cloudy: { id: 'cloudy', name: '阴天',   emoji: '⛅', w: 30, fishMul: 1.5, wormMod: 1,
              note: '钓鱼价值 +50% · 挖蚯蚓 +1 份' },
    rain:   { id: 'rain',   name: '雨天',   emoji: '🌧️', w: 25, fishMul: 1.3, wormMod: 1, autoWater: true,
              note: '自动浇水 · 钓鱼价值 +30% · 挖蚯蚓 +1 份' },
    storm:  { id: 'storm',  name: '暴风雨', emoji: '⛈️', w: 5,  fishMul: 0, wormMod: 0, noFish: true, stall: true,
              note: '禁止钓鱼 · 作物停滞一天' }
  };
  const WEATHER_LIST = Object.keys(WEATHER).map(function (k) { return WEATHER[k]; });

  const BAIT = {
    worm:  { id: 'worm',  name: '蚯蚓',   emoji: '🪱', desc: '收获 +30%，品质更好' },
    dough: { id: 'dough', name: '面团饵', emoji: '🍞', desc: '标准收获' },
    lure:  { id: 'lure',  name: '假饵',   emoji: '🎣', desc: '耐用 20 次，容易空军' }
  };

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

  function rollWeather() { return weighted(WEATHER_LIST, 'w').id; }

  function rollQuality(boost) {
    function once() { return weighted(QUALITY, 'w'); }
    if (!boost) return once();
    const a = QUALITY.indexOf(once());
    const b = QUALITY.indexOf(once());
    return QUALITY[Math.max(a, b)];
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
      plots: [makePlot(), makePlot(), makePlot(), makePlot()],
      seeds: {},
      store: {},
      bait: { worm: 0, dough: 0 },
      lure: { owned: false, dur: 0 },
      teaUsed: false,
      ledger: [{ day: 1, label: '开局金币', income: 50, expense: 0, balance: 50 }],
      log: [{ day: 1, text: '🌾 欢迎来到我的小农场，第 1 天开始了。', kind: 'sys' }],
      fishBook: { count: 0, entries: [], best: null, priciest: null },
      stats: { harvests: 0, casts: 0, dug: 0, planted: 0 }
    };
    return s;
  }

  /* ---------------- 工具 ---------------- */

  function log(s, text, kind) {
    s.log.unshift({ day: s.day, text: text, kind: kind || 'info' });
    if (s.log.length > 60) s.log.length = 60;
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

  function mealFee(s) { return 3 + (s.maxEnergy - 10) / 5; }

  function expandCost(s) { return 25 + 15 * (s.plots.length - 4); }
  function upgradeCost(s) { return 30 + 10 * ((s.maxEnergy - 10) / 5); }
  function workCost(s, mode) { return Math.round(mode === 'half' ? s.maxEnergy / 2 : s.maxEnergy); }
  function workPay(s, mode) {
    const c = workCost(s, mode);
    return Math.round(c * (mode === 'half' ? 1.0 : 1.5));
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

    const owned = s.seeds[cropId] || 0;
    let paid = 0;
    if (owned > 0) {
      s.seeds[cropId] = owned - 1;
      if (s.seeds[cropId] === 0) delete s.seeds[cropId];
    } else {
      if (s.coins < c.seed) return { ok: false, msg: '金币不够买种子（' + c.seed + ' 金）' };
      paid = c.seed;
      s.coins -= c.seed;
      ledger(s, '买种子 ' + c.name, 0, c.seed);
    }

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
    log(s, '🌱 ' + (idx + 1) + ' 号地种下 ' + c.name + (paid ? '（-' + paid + ' 金）' : '（用库存种子）'), 'good');
    return { ok: true, msg: c.name + ' 种下了' };
  }

  function water(s, idx) {
    const p = s.plots[idx];
    if (!p || !p.crop) return { ok: false, msg: '这块地还没种东西' };
    if (p.phase === 'ripe') return { ok: false, msg: '已经成熟，快点收获吧' };
    if (WEATHER[s.weather].stall) return { ok: false, msg: '⛈️ 暴风雨，作物停滞一天' };
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
      if (WEATHER[s.weather].stall) return;
      const r = water(s, i);
      if (r.ok) { done++; if (r.ripe) ripened++; } else lack++;
    });
    if (!done) return { ok: false, msg: WEATHER[s.weather].stall ? '⛈️ 暴风雨，今天浇不了' : '没有需要浇水的地块' };
    return { ok: true, msg: '浇了 ' + done + ' 块地' + (ripened ? '，' + ripened + ' 块成熟' : ''), done: done };
  }

  function harvest(s, idx) {
    const p = s.plots[idx];
    if (!p || !p.crop) return { ok: false, msg: '这块地还没种东西' };
    if (p.phase !== 'ripe') return { ok: false, msg: '还没成熟（' + p.growth + '/' + needOf(p) + ' 天）' };
    if (s.day <= p.ripeDay) return { ok: false, msg: '刚浇成熟，明天才能收获' };
    if (s.energy < 1) return { ok: false, msg: '体力不够了，先睡觉吧' };

    const c = CROPS[p.crop];
    s.energy -= 1;

    let qty, unit;
    if (c.multi) {
      qty = p.hits === 0 ? c.firstQty : c.regrowQty;
      unit = c.price;
    } else {
      unit = c.price;
      qty = c.big ? 1 : clamp(c.base + randInt(-1, 1) - p.missed + fertBonus(p), 1, 99);
    }
    s.store[p.crop] = (s.store[p.crop] || 0) + qty;

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
      regrown = true;
    } else {
      s.plots[idx] = makePlot();
    }

    const msg = '收获 ' + c.name + ' ×' + qty + '（值 ' + qty * unit + ' 金）' +
                (extraSeed ? ' · 留种 +1' : '') +
                (regrown ? ' · 进入再生期' : '');
    log(s, '🧺 ' + msg, 'good');
    return { ok: true, msg: msg, qty: qty, crop: p.crop || c.id, unit: unit, seed: extraSeed, regrown: regrown };
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
    const ids = Object.keys(s.store).filter(function (k) { return s.store[k] > 0; });
    if (!ids.length) return { ok: false, msg: '仓库里没东西可卖' };
    let income = 0;
    const parts = [];
    ids.forEach(function (id) {
      const n = s.store[id];
      const gain = n * CROPS[id].price;
      income += gain;
      parts.push(CROPS[id].name + '×' + n + ' = ' + gain + ' 金');
      delete s.store[id];
    });
    addCoins(s, income, '卖作物');
    log(s, '💰 卖出 ' + parts.join('、') + '，收入 ' + income + ' 金', 'good');
    return { ok: true, msg: '卖出作物，+' + income + ' 金', income: income };
  }

  function sellOne(s, id) {
    const n = s.store[id] || 0;
    if (!n) return { ok: false, msg: '没有可卖的' };
    const gain = n * CROPS[id].price;
    delete s.store[id];
    addCoins(s, gain, '卖 ' + CROPS[id].name);
    log(s, '💰 卖出 ' + CROPS[id].name + '×' + n + '，+' + gain + ' 金', 'good');
    return { ok: true, msg: '+' + gain + ' 金', income: gain };
  }

  function buyFert(s, idx, kind) {
    const p = s.plots[idx];
    const f = FERT[kind];
    if (!p || !p.crop) return { ok: false, msg: '这块地还没种东西' };
    if (!f) return { ok: false, msg: '没有这种肥料' };
    if (CROPS[p.crop].big) return { ok: false, msg: '南瓜、西瓜不吃肥料' };
    if (p.fert) return { ok: false, msg: '这块地已经施过肥了' };
    if (p.phase === 'ripe') return { ok: false, msg: '都熟了，别浪费肥料' };
    if (s.coins < f.cost) return { ok: false, msg: '金币不够（' + f.cost + ' 金）' };
    if (s.energy < 1) return { ok: false, msg: '体力不够了' };
    s.coins -= f.cost;
    ledger(s, '买肥料 ' + f.name, 0, f.cost);
    s.energy -= 1;
    p.fert = f.add;
    log(s, '🧪 ' + (idx + 1) + ' 号地施了' + f.name + '（产量 +' + f.add + '）', 'good');
    return { ok: true, msg: f.name + ' 施用成功' };
  }

  function sleep(s) {
    const fee = mealFee(s);
    const notes = [];
    if (s.coins >= fee) {
      addCoins(s, -fee, '伙食费');
      notes.push('🍖 伙食费 -' + fee + ' 金');
      s.energy = s.maxEnergy;
    } else {
      s.energy = Math.min(5, s.maxEnergy);
      notes.push('😵 没钱吃饭，饿着睡了（只恢复 5 体力）');
    }

    const stormToday = !!WEATHER[s.weather].stall;
    if (!stormToday) {
      s.plots.forEach(function (p) {
        if (p.crop && (p.phase === 'growing' || p.phase === 'regrow') && !p.watered) p.missed++;
      });
    }
    s.plots.forEach(function (p) { p.watered = false; });

    s.day++;
    s.teaUsed = false;
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
    }
    if (w.stall) notes.push('⛈️ 暴风雨，作物今天停滞');

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

  function fish(s, preferBait) {
    const w = WEATHER[s.weather];
    if (w.noFish) return { ok: false, msg: '⛈️ 暴风雨，今天钓不了鱼' };
    if (s.energy < 2) return { ok: false, msg: '体力不够（钓鱼要 2 点）' };
    const kind = pickBait(s, preferBait);
    if (!kind) return { ok: false, msg: '没有饵料了，先去挖蚯蚓或买面团饵' };

    s.energy -= 2;
    if (kind === 'worm') {
      s.bait.worm--;
    } else if (kind === 'dough') {
      s.bait.dough--;
    } else {
      s.lure.dur--;
      if (s.lure.dur <= 0) { s.lure.owned = false; s.lure.dur = 0; }
    }

    const table = kind === 'lure'
      ? FISH.map(function (f) { return Object.assign({}, f, { w: f.trash ? f.w * 5 : f.w * 0.7 }); })
      : FISH;
    const f = weighted(table, 'w');
    const q = f.trash ? null : rollQuality(kind === 'worm');
    const mul = (kind === 'worm' ? 1.3 : 1) * (w.fishMul || 1);
    const price = f.trash ? 1 : Math.max(1, Math.round(f.base * q.mul * mul));

    let name = f.name, emoji = f.emoji;
    if (f.trash) {
      const junk = TRASH[Math.floor(rand() * TRASH.length)] || TRASH[0];
      name = junk.name;
      emoji = junk.emoji;
    }

    addCoins(s, price, '卖鱼');
    s.stats.casts++;

    const entry = { day: s.day, fish: name, emoji: emoji, quality: q, price: price,
                    base: f.base, bait: kind, trash: !!f.trash };
    s.fishBook.count++;
    s.fishBook.entries.unshift(entry);
    if (s.fishBook.entries.length > 40) s.fishBook.entries.length = 40;
    if (!f.trash) {
      if (!s.fishBook.best || QUALITY.indexOf(q) > QUALITY.indexOf(s.fishBook.best.quality)) {
        s.fishBook.best = { fish: f.name, quality: q, price: price, day: s.day };
      }
      if (!s.fishBook.priciest || price > s.fishBook.priciest.price) {
        s.fishBook.priciest = { fish: f.name, quality: q, price: price, day: s.day };
      }
    }
    log(s, f.trash
      ? '🎣 钓上来 ' + emoji + ' ' + name + '（不值钱）· +1 金'
      : '🎣 钓到 ' + emoji + ' ' + name + ' · ' + q.emoji + q.name + ' · +' + price + ' 金',
      f.trash ? 'warn' : 'good');
    return { ok: true, entry: entry, msg: name + ' +' + price + ' 金' };
  }

  function fishMany(s, times, preferBait) {
    const results = [];
    let spent = 0;
    for (let i = 0; i < times; i++) {
      const r = fish(s, preferBait);
      if (!r.ok) { results.push(r); break; }
      spent += r.entry.price;
      results.push(r);
    }
    const okCount = results.filter(function (r) { return r.ok; }).length;
    if (!okCount) return results[0] || { ok: false, msg: '钓不了' };
    return { ok: true, count: okCount, income: spent, results: results, msg: '甩了 ' + okCount + ' 杆，+' + spent + ' 金' };
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

  function work(s, mode) {
    const cost = workCost(s, mode);
    if (s.energy < cost) return { ok: false, msg: '体力不足（需要 ' + cost + ' 点）' };
    const pay = workPay(s, mode);
    s.energy -= cost;
    addCoins(s, pay, mode === 'half' ? '半天零工' : '全天零工');
    log(s, (mode === 'half' ? '🕐' : '🕑') + (mode === 'half' ? '半天' : '全天') +
            '零工：-' + cost + ' 体力，+' + pay + ' 金', 'good');
    return { ok: true, msg: '+' + pay + ' 金' };
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

  /* ---------------- 存读档 ---------------- */

  function serialize(s) { return JSON.stringify(s); }

  function deserialize(json) {
    const s = typeof json === 'string' ? JSON.parse(json) : json;
    const base = createState();
    const merged = Object.assign(base, s);
    merged.plots = (s.plots || base.plots).map(function (p) { return Object.assign(makePlot(), p); });
    merged.bait = Object.assign({ worm: 0, dough: 0 }, s.bait || {});
    merged.lure = Object.assign({ owned: false, dur: 0 }, s.lure || {});
    merged.fishBook = Object.assign({ count: 0, entries: [], best: null, priciest: null }, s.fishBook || {});
    merged.stats = Object.assign({ harvests: 0, casts: 0, dug: 0, planted: 0 }, s.stats || {});
    merged.seeds = s.seeds || {};
    merged.store = s.store || {};
    merged.ledger = s.ledger || base.ledger;
    merged.log = s.log || base.log;
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
    setRng: setRng,
    createState: createState, serialize: serialize, deserialize: deserialize,
    mealFee: mealFee, expandCost: expandCost, upgradeCost: upgradeCost,
    workCost: workCost, workPay: workPay, needOf: needOf, expectedYield: expectedYield,
    canHarvest: canHarvest, stageEmoji: stageEmoji, fertBonus: fertBonus, baitCount: baitCount,
    plant: plant, water: water, waterAll: waterAll, harvest: harvest, harvestAll: harvestAll,
    sellAll: sellAll, sellOne: sellOne, buyFert: buyFert, sleep: sleep, fish: fish,
    fishMany: fishMany, digWorms: digWorms, buyBait: buyBait, tea: tea, work: work,
    expand: expand, upgrade: upgrade, rollWeather: rollWeather
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.FarmGame = API;
})(typeof window !== 'undefined' ? window : globalThis);
