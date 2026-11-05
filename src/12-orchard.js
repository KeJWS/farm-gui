/* 果园：开垦 / 扩坑 / 买树苗 / 浇水 / 收获 */
  /* ---------------- 果园 ---------------- */

  /* 开垦：种田 Lv7 + 2500 金，先给 3 个树坑；第 4~8 个树坑逐个花钱开 */
  function orchardSlots() { return BALANCE.orchard.slots; }

  function orchardFree() { return BALANCE.orchard.free; }

  function orchardUnlocked(s) { return !!(s && s.orchard && s.orchard.unlocked); }

  function orchardSlotCount(s) {
    return (s.orchard && s.orchard.slots) ? s.orchard.slots.length : 0;
  }

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
    s.orchard = { unlocked: true, slots: new Array(BALANCE.orchard.free).fill(null) };
    log(s, '🍑 开垦了一片果园（-' + cost + ' 金），有 ' + BALANCE.orchard.free + ' 个树坑', 'good');
    return { ok: true, msg: '果园开垦完成，先给你 ' + BALANCE.orchard.free + ' 个树坑' };
  }

  /* 第 n 个树坑（从 4 开始）的价格；满了返回 0 */
  function orchardExpandCost(s) {
    if (!orchardUnlocked(s)) return 0;
    const extra = orchardSlotCount(s) - BALANCE.orchard.free;
    if (extra < 0) return 0;
    return BALANCE.orchard.slotCosts[extra] || 0;
  }

  function expandOrchard(s) {
    if (!orchardUnlocked(s)) return { ok: false, msg: '先去开垦果园' };
    if (orchardSlotCount(s) >= BALANCE.orchard.slots) {
      return { ok: false, msg: '树坑已经开满了（' + BALANCE.orchard.slots + ' 个）' };
    }
    const cost = orchardExpandCost(s);
    if ((s.coins || 0) < cost) return { ok: false, msg: '金币不够（' + cost + ' 金）' };
    s.coins -= cost;
    ledger(s, '开垦第 ' + (orchardSlotCount(s) + 1) + ' 个树坑', 0, cost);
    s.orchard.slots.push(null);
    log(s, '🕳️ 开垦出第 ' + s.orchard.slots.length + ' 个树坑（-' + cost + ' 金）', 'good');
    return { ok: true, msg: '现在有 ' + s.orchard.slots.length + ' 个树坑', slots: s.orchard.slots.length };
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

  /* 成树条件：浇够水数 且 长够天数（两项都要满足） */
  function treeNeed(t) {
    const g = BALANCE.orchard.grow[t && t.mode === 'sapling' ? 'sapling' : 'seed'];
    return { days: g.days, water: g.water };
  }

  function treeAge(s, t) { return t ? Math.max(0, (s.day || 1) - (t.planted || 1)) : 0; }

  function treeMature(s, i) {
    const t = treeSlot(s, i);
    if (!t) return false;
    const need = treeNeed(t);
    return treeAge(s, t) >= need.days && (t.water || 0) >= need.water;
  }

  function treeNeedsWater(s, i) {
    const t = treeSlot(s, i);
    return !!t && (t.water || 0) < treeNeed(t).water;
  }

  function treeStage(s, i) {
    const t = treeSlot(s, i);
    if (!t) return 'empty';
    return treeMature(s, i) ? 'mature' : 'growing';
  }

  function treeInSeason(s, i) {
    const t = treeSlot(s, i);
    if (!t || !TREES[t.id]) return false;
    return seasonIdx(s.day || 1) === TREES[t.id].season;
  }

  /* ---------------- 成树等级 ----------------
   * 成树以后靠「收获」攒经验：每次收获 +1，升到下一级要 2 / 4 / 6 / 8 次（满级 5）。
   * 每高一级，「当天多挂 1 个果」的概率 +10%，挂果上限不变。 */
  function treeLevel(t) {
    return clamp(t && t.lv ? t.lv : 1, 1, BALANCE.orchard.treeLvMax);
  }
  function treeXpNeed(lv) {
    return BALANCE.orchard.treeXpBase + BALANCE.orchard.treeXpStep * (lv - 1);
  }
  function treeXp(t) { return (t && t.xp) || 0; }
  function treeYieldBonus(lv) {
    return Math.max(0, (lv - 1) * BALANCE.orchard.treeLvYield);
  }
  function treeLevelText(t) {
    const lv = treeLevel(t);
    if (lv >= BALANCE.orchard.treeLvMax) return 'Lv' + lv + '（满级 +' +
      Math.round(treeYieldBonus(lv) * 100) + '%）';
    return 'Lv' + lv + ' · ' + treeXp(t) + '/' + treeXpNeed(lv);
  }
  /* 收获后加经验，返回升了几级 */
  function treeGainXp(t) {
    const max = BALANCE.orchard.treeLvMax;
    t.lv = treeLevel(t);
    t.xp = treeXp(t) + 1;
    let up = 0;
    while (t.lv < max && t.xp >= treeXpNeed(t.lv)) {
      t.xp -= treeXpNeed(t.lv);
      t.lv++;
      up++;
    }
    if (t.lv >= max) t.xp = 0;
    return up;
  }

  /* 育苗进度：给界面显示已浇水天数与自然生长天数 */
  function treeProgress(s, i) {
    const t = treeSlot(s, i);
    if (!t) return null;
    const need = treeNeed(t);
    return { age: treeAge(s, t), needDays: need.days,
             water: t.water || 0, needWater: need.water,
             done: treeMature(s, i), ripe: t.ripe || 0, mode: t.mode || 'seed',
             lv: treeLevel(t), xp: treeXp(t), xpNeed: treeXpNeed(treeLevel(t)),
             lvMax: BALANCE.orchard.treeLvMax, yieldBonus: treeYieldBonus(treeLevel(t)) };
  }

  /* 种树：种子要浇水 30 天 + 满 90 天；树苗浇水 15 天 + 满 30 天 */
  function plantTree(s, i, id, mode) {
    if (!orchardUnlocked(s)) return { ok: false, msg: '先去农场开垦果园' };
    const t = TREES[id];
    if (!t) return { ok: false, msg: '没有这种果树' };
    const slots = s.orchard.slots || [];
    if (!(i >= 0 && i < slots.length)) return { ok: false, msg: '这个树坑还没开垦' };
    if (slots[i]) return { ok: false, msg: '这个树坑已经种了 ' + TREES[slots[i].id].name };
    const m = mode === 'sapling' ? 'sapling' : 'seed';
    if (treeStockCount(s, id, m) <= 0) {
      return { ok: false, msg: '没有' + t.name + (m === 'sapling' ? '树苗' : '种子') + '了，先去百货店买' };
    }
    s.treeStock[id][m]--;
    slots[i] = { id: id, mode: m, planted: s.day || 1, water: 0, lastWater: 0, ripe: 0, lv: 1, xp: 0 };
    s.orchard.slots = slots;
    s.stats.orchardPlanted = (s.stats.orchardPlanted || 0) + 1;
    const need = treeNeed(slots[i]);
    log(s, t.emoji + ' 在 ' + (i + 1) + ' 号树坑种下' + t.name +
      '（浇水 ' + need.water + ' 天 + 生长 ' + need.days + ' 天）', 'info');
    return { ok: true, slot: i, msg: t.name + ' 种下了（浇水 ' + need.water + ' 天 · 生长 ' + need.days + ' 天）' };
  }

  /* 单棵浇水；完成该树苗所需浇水天数后，无需再浇 */
  function waterTree(s, i) {
    if (!orchardUnlocked(s)) return { ok: false, msg: '还没有果园' };
    const t = treeSlot(s, i);
    if (!t) return { ok: false, msg: '这个树坑还是空的' };
    if (!treeNeedsWater(s, i)) return { ok: false, msg: '这棵树苗已经浇足水了' };
    if (t.lastWater === s.day) return { ok: false, msg: '这棵树今天已经浇过了' };
    const E = BALANCE.orchard.waterEnergy;
    if ((s.energy || 0) < E) return { ok: false, msg: '体力不够，浇水要 ' + E + ' 点' };
    t.lastWater = s.day;
    t.water = Math.min(treeNeed(t).water, (t.water || 0) + 1);
    s.energy -= E;
    log(s, '💧 给第 ' + (i + 1) + ' 棵育苗树浇水（-' + E + ' 体力）', 'info');
    return { ok: true, n: 1, cost: E, msg: '给第 ' + (i + 1) + ' 棵育苗树浇水（-' + E + ' 体力）' };
  }

  /* 批量浇水：依序浇所有今天还需浇水的育苗树，每棵 1 体力 */
  function waterOrchard(s) {
    if (!orchardUnlocked(s)) return { ok: false, msg: '还没有果园' };
    const E = BALANCE.orchard.waterEnergy;
    const slots = s.orchard.slots || [];
    const todo = [];
    slots.forEach(function (t, i) {
      if (!t || !treeNeedsWater(s, i)) return;
      if (t.lastWater === s.day) return;
      todo.push({ tree: t, index: i });
    });
    if (!todo.length) return { ok: false, msg: '今天没有要浇水的果树' };
    const canPay = Math.floor((s.energy || 0) / E);
    if (canPay <= 0) return { ok: false, msg: '体力不够，浇水要 ' + E + ' 点/棵' };
    const n = Math.min(canPay, todo.length);
    for (let k = 0; k < n; k++) {
      const t = todo[k].tree;
      t.lastWater = s.day;
      t.water = Math.min(treeNeed(t).water, (t.water || 0) + 1);
    }
    s.energy -= n * E;
    log(s, '💧 给 ' + n + ' 棵果树浇水（-' + (n * E) + ' 体力）', 'info');
    return { ok: true, n: n, cost: n * E,
             msg: '给 ' + n + ' 棵果树浇水（-' + (n * E) + ' 体力）' +
               (n < todo.length ? '，体力不够还有 ' + (todo.length - n) + ' 棵没浇' : '') };
  }

  /* 收获：每棵 1 体力，果实直接进仓库 */
  function harvestTree(s, i) {
    const t = treeSlot(s, i);
    if (!t) return { ok: false, msg: '这个树坑还是空的' };
    if (!t.ripe) return { ok: false, msg: '还没有可收的果实' };
    const E = BALANCE.orchard.harvestEnergy;
    if ((s.energy || 0) < E) return { ok: false, msg: '体力不够，收获要 ' + E + ' 点' };
    const tr = TREES[t.id];
    const n = t.ripe;
    t.ripe = 0;
    s.energy -= E;
    addStore(s, tr.fruitId, 'std', n);
    s.stats.orchardFruit = (s.stats.orchardFruit || 0) + n;
    const lvUp = treeGainXp(t);
    // 水果也进图鉴（和作物共用 codex.crops，果实固定标准品质）
    s.codex = s.codex || { fish: {}, crops: {} };
    s.codex.crops = s.codex.crops || {};
    const fr = CROPS[tr.fruitId];
    const cx = s.codex.crops[tr.fruitId] ||
      (s.codex.crops[tr.fruitId] = { n: 0, best: null, first: s.day, value: 0 });
    cx.n += n;
    cx.value += n * (fr ? fr.price : 0);
    if (!cx.best) cx.best = 'std';   // 果树果实固定标准品质
    log(s, '🧺 收获 ' + tr.emoji + ' ' + tr.fruit + ' ×' + n + '（-' + E + ' 体力）' +
      (lvUp ? ' · 果树升到 Lv' + t.lv : ''), 'good');
    return { ok: true, n: n, cost: E, lv: t.lv, levelUp: lvUp,
             msg: '收获 ' + tr.fruit + ' ×' + n + ' 进仓库（-' + E + ' 体力）' +
               (lvUp ? ' · 果树 Lv' + t.lv : '') };
  }

  function harvestOrchard(s) {
    if (!orchardUnlocked(s)) return { ok: false, msg: '还没有果园' };
    const E = BALANCE.orchard.harvestEnergy;
    const slots = s.orchard.slots || [];
    let n = 0, fruit = 0;
    for (let i = 0; i < slots.length; i++) {
      const t = slots[i];
      if (!t || !t.ripe) continue;
      if ((s.energy || 0) < E) break;
      const r = harvestTree(s, i);
      if (r.ok) { n++; fruit += r.n; }
    }
    if (!n) return { ok: false, msg: '现在没有可收的果实' };
    return { ok: true, n: n, fruit: fruit, cost: n * E,
             msg: '收了 ' + n + ' 棵树共 ' + fruit + ' 个水果（-' + (n * E) + ' 体力）' };
  }

  /* 睡觉结算：成树在当季每天随机挂 1~3 个果实，等人来收（每棵最多挂 ripeCap 个，满了不再挂） */
  function orchardTick(s, prevDay) {
    if (!orchardUnlocked(s)) return { fruit: 0, mature: 0, growing: 0, thirsty: 0, ripe: 0, full: 0 };
    const slots = s.orchard.slots || [];
    let fruit = 0, mature = 0, growing = 0, thirsty = 0, ripe = 0, full = 0;
    const cap = BALANCE.orchard.ripeCap;
    const season = seasonIdx(s.day || 1);
    slots.forEach(function (t, i) {
      if (!t) return;
      if (treeMature(s, i)) {
        mature++;
        if (TREES[t.id].season === season) {
          const n = randInt(BALANCE.orchard.fruitMin, BALANCE.orchard.fruitMax);
          const bonus = treeYieldBonus(treeLevel(t));
          const extra = (bonus > 0 && rand() < bonus) ? 1 : 0;
          const had = t.ripe || 0;
          t.ripe = Math.min(cap, had + n + extra);
          fruit += t.ripe - had;
          if (t.ripe >= cap) full++;
        }
      } else {
        growing++;
        if (treeNeedsWater(s, i) && t.lastWater !== s.day) thirsty++;
      }
      ripe += t.ripe || 0;
    });
    return { fruit: fruit, mature: mature, growing: growing, thirsty: thirsty, ripe: ripe, full: full };
  }

  /* 果园概况：给界面 / 总结用 */
  function orchardSummary(s) {
    const slots = (s.orchard && s.orchard.slots) || [];
    let mature = 0, growing = 0, inSeason = 0, ripe = 0, thirsty = 0;
    slots.forEach(function (t, i) {
      if (!t) return;
      ripe += t.ripe || 0;
      if (treeMature(s, i)) {
        mature++;
        if (treeInSeason(s, i)) inSeason++;
      } else {
        growing++;
        if (treeNeedsWater(s, i) && t.lastWater !== s.day) thirsty++;
      }
    });
    return { total: slots.length, max: BALANCE.orchard.slots, mature: mature, growing: growing,
             inSeason: inSeason, ripe: ripe, thirsty: thirsty };
  }
