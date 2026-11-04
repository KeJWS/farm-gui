/* 果园：开垦 / 买树苗 / 育苗 / 当季结果 / 卖水果 */
  /* ---------------- 果园 ---------------- */

  /* 解锁：种田 Lv7 + 2500 金，开垦后给 8 个树坑 */
  function orchardSlots() { return BALANCE.orchard.slots; }

  function orchardUnlocked(s) { return !!(s && s.orchard && s.orchard.unlocked); }

  function orchardUnlock(s) {
    if (orchardUnlocked(s)) return { ok: false, msg: '果园已经开垦过了' };
    const lv = farmLv(s);
    if (lv < BALANCE.orchard.unlockLv) {
      return { ok: false, msg: '种田 Lv' + BALANCE.orchard.unlockLv + ' 才能开垦果园（现在 Lv' + lv + '）' };
    }
    const cost = BALANCE.orchard.unlockCost;
    if ((s.coins || 0) < cost) return { ok: false, msg: '金币不够（' + cost + ' 金）' };
    s.coins -= cost;
    ledger(s, '开垦果园', 0, cost);
    s.orchard = { unlocked: true, wateredDay: 0, slots: new Array(BALANCE.orchard.slots).fill(null) };
    log(s, '🍑 开垦了一片果园（-' + cost + ' 金），有 ' + BALANCE.orchard.slots + ' 个树坑', 'good');
    return { ok: true, msg: '果园开垦完成，有 ' + BALANCE.orchard.slots + ' 个树坑' };
  }

  /* ---------------- 树苗 / 种子 ---------------- */

  function treeData(id) { return TREES[id] || null; }

  function treeBuyPrice(s, id, mode) {
    const t = TREES[id];
    if (!t) return 0;
    const base = mode === 'sapling' ? t.sapling : t.seed;
    return Math.max(1, Math.round(base * tradeCut(s)));
  }

  function treeStockCount(s, id, mode) {
    const row = s.treeStock && s.treeStock[id];
    return (row && row[mode === 'sapling' ? 'sapling' : 'seed']) || 0;
  }

  /* 百货店买果树种子 / 树苗：买回来存在 stock 里，果园那边再种 */
  function buyTreeStock(s, id, mode, n) {
    const t = TREES[id];
    if (!t) return { ok: false, msg: '没有这种果树' };
    const m = mode === 'sapling' ? 'sapling' : 'seed';
    const qty = Math.max(1, Math.min(9, Math.floor(n || 1)));
    const unit = treeBuyPrice(s, id, m);
    const cost = unit * qty;
    if ((s.coins || 0) < cost) return { ok: false, msg: '金币不够（' + cost + ' 金）' };
    s.coins -= cost;
    ledger(s, '买' + t.name + (m === 'sapling' ? '树苗' : '种子') + ' ×' + qty, 0, cost);
    tradeXp(s, cost);
    s.treeStock = s.treeStock || {};
    s.treeStock[id] = s.treeStock[id] || { seed: 0, sapling: 0 };
    s.treeStock[id][m] += qty;
    log(s, t.emoji + ' 买了' + t.name + (m === 'sapling' ? '树苗' : '种子') + ' ×' + qty + '（-' + cost + ' 金）', 'info');
    return { ok: true, qty: qty, cost: cost,
             msg: t.name + (m === 'sapling' ? '树苗' : '种子') + ' ×' + qty + '（-' + cost + ' 金）' };
  }

  /* ---------------- 树坑 ---------------- */

  function treeSlot(s, i) {
    const slots = (s.orchard && s.orchard.slots) || [];
    return slots[i] || null;
  }

  function treeStage(s, i) {
    const t = treeSlot(s, i);
    if (!t) return 'empty';
    return t.grown >= BALANCE.orchard.growDays ? 'mature' : 'growing';
  }

  function treeInSeason(s, i) {
    const t = treeSlot(s, i);
    if (!t || !TREES[t.id]) return false;
    return seasonIdx(s.day || 1) === TREES[t.id].season;
  }

  /* 种树：树苗直接成树，种子要育苗（浇水才长），满 120 天才成树 */
  function plantTree(s, i, id, mode) {
    if (!orchardUnlocked(s)) return { ok: false, msg: '先去农场开垦果园' };
    const t = TREES[id];
    if (!t) return { ok: false, msg: '没有这种果树' };
    const slots = s.orchard.slots || [];
    if (!(i >= 0 && i < slots.length)) return { ok: false, msg: '没有这个树坑' };
    if (slots[i]) return { ok: false, msg: '这个树坑已经种了 ' + TREES[slots[i].id].name };
    const m = mode === 'sapling' ? 'sapling' : 'seed';
    if (treeStockCount(s, id, m) <= 0) {
      return { ok: false, msg: '没有' + t.name + (m === 'sapling' ? '树苗' : '种子') + '了，先去百货店买' };
    }
    s.treeStock[id][m]--;
    slots[i] = { id: id, grown: m === 'sapling' ? BALANCE.orchard.growDays : 0, day: s.day || 1 };
    s.orchard.slots = slots;
    s.stats.orchardPlanted = (s.stats.orchardPlanted || 0) + 1;
    log(s, t.emoji + ' 在 ' + (i + 1) + ' 号树坑种下' + t.name +
      (m === 'sapling' ? '（树苗，立刻成树）' : '（种子，育苗 ' + BALANCE.orchard.growDays + ' 天）'), 'info');
    return { ok: true, slot: i, msg: t.name + (m === 'sapling' ? ' 已经成树' : ' 开始育苗') };
  }

  /* 浇水：一次浇所有育苗中的树；只有浇过水的当天才会长 */
  function waterOrchard(s) {
    if (!orchardUnlocked(s)) return { ok: false, msg: '还没有果园' };
    if (s.orchard.wateredDay === s.day) return { ok: false, msg: '今天已经浇过果树了' };
    const growing = (s.orchard.slots || []).filter(function (t) {
      return t && t.grown < BALANCE.orchard.growDays;
    }).length;
    s.orchard.wateredDay = s.day;
    if (!growing) return { ok: true, n: 0, msg: '果树都成树了，不用浇水' };
    log(s, '💧 给 ' + growing + ' 棵育苗中的果树浇水', 'info');
    return { ok: true, n: growing, msg: '给 ' + growing + ' 棵育苗树浇了水' };
  }

  /* 睡觉结算：浇过水 → 育苗 +1 天；成树在当季每天结果 */
  function orchardTick(s, prevDay) {
    if (!orchardUnlocked(s)) return { grown: 0, grownReady: 0, fruit: 0, value: 0, species: [] };
    const slots = s.orchard.slots || [];
    const watered = s.orchard.wateredDay === prevDay;
    let grown = 0, grownReady = 0;
    const G0 = BALANCE.orchard.growDays;
    if (watered) {
      slots.forEach(function (t) {
        if (!t || t.grown >= G0) return;
        t.grown++;
        grown++;
        if (t.grown === G0) grownReady++;
      });
    }
    const season = seasonIdx(s.day || 1);
    let fruit = 0, value = 0;
    const species = [];
    slots.forEach(function (t) {
      if (!t || t.grown < G0 || !TREES[t.id]) return;
      if (TREES[t.id].season !== season) return;
      const n = BALANCE.orchard.fruitPerDay;
      s.fruits = s.fruits || {};
      s.fruits[t.id] = (s.fruits[t.id] || 0) + n;
      fruit += n;
      value += n * TREES[t.id].price;
      species.push(TREES[t.id]);
    });
    if (fruit) s.stats.orchardFruit = (s.stats.orchardFruit || 0) + fruit;
    return { grown: grown, grownReady: grownReady, fruit: fruit, value: value, species: species };
  }

  /* ---------------- 水果仓库 / 卖出 ---------------- */

  function fruitCount(s) {
    let n = 0;
    TREE_LIST.forEach(function (t) { n += (s.fruits && s.fruits[t.id]) || 0; });
    return n;
  }

  function fruitValue(s) {
    let v = 0;
    TREE_LIST.forEach(function (t) { v += ((s.fruits && s.fruits[t.id]) || 0) * t.price; });
    return v;
  }

  function sellFruits(s) {
    if (!orchardUnlocked(s)) return { ok: false, msg: '还没有果园' };
    const n = fruitCount(s);
    if (!n) return { ok: false, msg: '果园里还没有水果' };
    const raw = fruitValue(s);
    const gain = Math.max(1, Math.round(raw * sellBonus(s) * (1 + townBonus(s, 'marketBonus'))));
    s.fruits = {};
    TREE_LIST.forEach(function (t) { s.fruits[t.id] = 0; });
    addCoins(s, gain, '卖水果');
    tradeXp(s, gain);
    s.stats.fruitSold = (s.stats.fruitSold || 0) + n;
    log(s, '🍑 卖掉 ' + n + ' 个水果，+' + gain + ' 金', 'good');
    return { ok: true, n: n, income: gain, msg: '卖掉 ' + n + ' 个水果，+' + gain + ' 金' };
  }

  /* 果园概况：给界面 / 总结用 */
  function orchardSummary(s) {
    const slots = (s.orchard && s.orchard.slots) || [];
    let mature = 0, growing = 0, inSeason = 0;
    slots.forEach(function (t, i) {
      if (!t) return;
      if (t.grown >= BALANCE.orchard.growDays) { mature++; if (treeInSeason(s, i)) inSeason++; }
      else growing++;
    });
    return { total: slots.length, mature: mature, growing: growing, inSeason: inSeason,
             fruit: fruitCount(s), value: fruitValue(s) };
  }
