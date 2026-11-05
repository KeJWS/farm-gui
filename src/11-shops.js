/* 农产品店 / 渔夫 / 种子店 */
  /* ---------------- 农产品店（作物唯一出售处 + 每日进货） ---------------- */

  /* 买价 = 售价 × 1.3 × 作物市价（缺货时更贵），一般品质（标准），转手必亏，只用来应急凑单 */
  function cropBuyPrice(id, s) {
    const c = CROPS[id];
    if (!c) return 0;
    const mkt = s ? marketMul(s, id) : 1;
    const cut = s ? (1 - townBonus(s, 'shopCut')) : 1;
    return Math.max(2, Math.round(c.price * BALANCE.shop.cropPriceMul * mkt * cut * (s ? tradeCut(s) : 1)));
  }

  function cropShopStock(s, id) {
    return (s.cropShop && s.cropShop.stock && s.cropShop.stock[id]) || 0;
  }

  function buyCrop(s, id, n) {
    const c = CROPS[id];
    if (!c) return { ok: false, msg: '没有这种作物' };
    const qty = Math.max(1, Math.floor(n || 1));
    const stock = cropShopStock(s, id);
    if (stock <= 0) return { ok: false, msg: c.name + '今天卖完了，明天再来' };
    if (stock < qty) return { ok: false, msg: '库存只剩 ' + stock + ' 个' };
    const cost = cropBuyPrice(id, s) * qty;
    if (s.coins < cost) return { ok: false, msg: '金币不够' };
    s.coins -= cost;
    s.cropShop.stock[id] = stock - qty;
    // 买农产品 = 把货从市场里拿走：销量回落一点点
    removeSupply(s, id, qty);
    ledger(s, '买农产品 ' + c.name + ' ×' + qty, 0, cost);
    tradeXp(s, cost);
    addStore(s, id, 'std', qty);
    log(s, '🛒 买进 ' + c.emoji + ' ' + c.name + ' ×' + qty + '（-' + cost + ' 金，今日剩 ' +
      s.cropShop.stock[id] + ' 个）', 'info');
    return { ok: true, qty: qty, cost: cost, msg: '买到 ' + c.name + ' ×' + qty };
  }

  /* 渔网：每天吃 1 份面团饵，70% 概率网到 1 条「标准及以下」的普通鱼（不出杂物/宝箱）
   * 网到鱼就得下水把鱼取下来，这张网要重新布置（1 体力/张） */
  const NET_QUALITIES = ['bad', 'common', 'std'];

  /* 已布置好的渔网数量（旧存档没有 netSet 字段就当作全都布置好了） */
  function netSetCount(s) {
    const all = Math.max(0, s.nets || 0);
    const set = s.netSet == null ? all : s.netSet;
    return clamp(Math.floor(set), 0, all);
  }
  function netPending(s) { return Math.max(0, (s.nets || 0) - netSetCount(s)); }
  function netResetCost(s) { return netPending(s) * BALANCE.netReset.energy; }

  /* 重新布置渔网：每张 1 体力，体力不够就只布一部分 */
  function resetNets(s) {
    const need = netPending(s);
    if (!need) return { ok: false, msg: '渔网都布置好了' };
    const per = BALANCE.netReset.energy;
    const can = Math.min(need, Math.floor((s.energy || 0) / per));
    if (can <= 0) return { ok: false, msg: '体力不够（每张渔网 ' + per + ' 体力），先睡觉吧' };
    s.energy -= can * per;
    s.netSet = netSetCount(s) + can;
    log(s, '🕸️ 重新布置 ' + can + ' 张渔网（-' + (can * per) + ' 体力）', 'info');
    return { ok: true, msg: '布置好 ' + can + ' 张渔网', n: can, spent: can * per };
  }

  /* ---------------- 雇佣渔夫（有等级） ---------------- */

  function fisherUnlocked(s) { return fishLv(s) >= BALANCE.gate.fisher; }
  function fisherObj(s) {
    return (s.fisher && typeof s.fisher === 'object') ? s.fisher : null;
  }
  function fisherLv(s) { const f = fisherObj(s); return f ? Math.round(num(f.lv, 1, 1, BALANCE.fisher.max)) : 0; }
  /* 每天甩几杆：2 + 等级 */
  function fisherCasts(s) { return fisherObj(s) ? BALANCE.fisher.baseCasts + fisherLv(s) : 0; }
  /* 日工资：10 + 5×(等级-1) */
  function fisherWage(s) {
    const f = BALANCE.fisher;
    return fisherObj(s) ? f.wageBase + f.wageStep * (fisherLv(s) - 1) : 0;
  }
  /* 升级所需经验：6 + 3×(等级-1) */
  function fisherNeed(s) {
    const f = BALANCE.fisher;
    const lv = fisherLv(s);
    if (!lv) return 0;
    return f.needBase + f.needStep * (lv - 1);
  }
  /* 花钱直接升级：120 × 当前等级 */
  function fisherUpCost(s) {
    const lv = fisherLv(s);
    if (!lv || lv >= BALANCE.fisher.max) return 0;
    return BALANCE.fisher.upCost * lv;
  }
  /* 渔夫自己的等级加成：咬钩 +1.1%/级（≤+10%）、好鱼 +2.5%/级（≤+22.5%） */
  function fisherHookBonus(s) {
    const lv = fisherLv(s);
    return lv ? Math.min(0.10, 0.011 * (lv - 1)) : 0;
  }
  function fisherGoodBonus(s) {
    const lv = fisherLv(s);
    return lv ? 1 + Math.min(0.225, 0.025 * (lv - 1)) : 1;
  }

  function hireFisher(s) {
    if (!fisherUnlocked(s)) {
      return { ok: false, msg: '渔夫要钓鱼 Lv' + BALANCE.gate.fisher + ' 才肯来（现在 Lv' + fishLv(s) + '）' };
    }
    if (fisherObj(s)) return { ok: false, msg: '已经雇了渔夫' };
    if ((s.coins || 0) < BALANCE.fisher.hire) {
      return { ok: false, msg: '金币不够（雇佣费 ' + BALANCE.fisher.hire + ' 金）' };
    }
    s.coins -= BALANCE.fisher.hire;
    ledger(s, '雇佣渔夫', 0, BALANCE.fisher.hire);
    s.fisher = { lv: 1, xp: 0 };
    log(s, '🧑‍🌾 雇了一位渔夫（Lv1）：每天替你重布渔网、自动甩 ' + fisherCasts(s) +
      ' 杆，工资 ' + fisherWage(s) + ' 金/天', 'good');
    return { ok: true, msg: '渔夫上岗了（Lv1）', cost: BALANCE.fisher.hire };
  }

  function fireFisher(s) {
    if (!fisherObj(s)) return { ok: false, msg: '还没雇渔夫' };
    s.fisher = null;
    log(s, '🧑‍🌾 把渔夫辞了（不用再发工资）', 'info');
    return { ok: true, msg: '渔夫已辞退' };
  }

  /* 花钱给渔夫升一级 */
  function fisherUp(s) {
    const f = fisherObj(s);
    if (!f) return { ok: false, msg: '还没雇渔夫' };
    if (fisherLv(s) >= BALANCE.fisher.max) return { ok: false, msg: '渔夫已经满级了' };
    const cost = fisherUpCost(s);
    if ((s.coins || 0) < cost) return { ok: false, msg: '金币不够（升级要 ' + cost + ' 金）' };
    s.coins -= cost;
    ledger(s, '渔夫升到 Lv' + (fisherLv(s) + 1), 0, cost);
    s.fisher = { lv: fisherLv(s) + 1, xp: 0 };
    log(s, '🧑‍🌾 渔夫升到 Lv' + s.fisher.lv + '（-' + cost + ' 金）：每天 ' + fisherCasts(s) +
      ' 杆，工资 ' + fisherWage(s) + ' 金', 'good');
    return { ok: true, msg: '渔夫升到 Lv' + s.fisher.lv, cost: cost, lv: s.fisher.lv };
  }

  /* 渔夫代钓：不耗玩家体力、不给玩家经验，只消耗面团饵；按自己的等级加成抽鱼 */
  function fisherCatch(s) {
    const max = fisherCasts(s);
    const dough = Math.max(0, s.bait.dough || 0);
    const n = Math.min(max, dough);
    const hook = fisherHookBonus(s), good = fisherGoodBonus(s);
    let got = 0, value = 0;
    for (let i = 0; i < n; i++) {
      const r = fish(s, 'dough', { free: true, quiet: true, noXp: true, hookBonus: hook, goodBonus: good });
      if (r.ok && r.entry) { got++; value += r.entry.price; }
    }
    // 渔夫自己攒经验：每钓到 1 条 +1，攒够自动升级
    let leveled = 0;
    if (got) {
      const f = fisherObj(s);
      if (f && fisherLv(s) < BALANCE.fisher.max) {
        f.xp = (f.xp || 0) + got;
        while (fisherLv(s) < BALANCE.fisher.max && f.xp >= fisherNeed(s)) {
          f.xp -= fisherNeed(s);
          f.lv = fisherLv(s) + 1;
          leveled++;
        }
        if (fisherLv(s) >= BALANCE.fisher.max) f.xp = 0;
      }
    }
    return { casts: n, got: got, value: value, short: dough < max, leveled: leveled, lv: fisherLv(s) };
  }

  function netCatchOne(s) {
    const pool = FISH.filter(function (f) { return !f.trash && !f.noOrder; }).map(function (f) {
      const off = (f.seasons && f.seasons.indexOf(seasonIdx(s.day)) < 0) ? FISH_OFF_SEASON : 1;
      return Object.assign({}, f, { w: f.w * off });
    });
    const f = weighted(pool, 'w');
    const qs = QUALITY.filter(function (q) { return NET_QUALITIES.indexOf(q.id) >= 0; });
    const q = weighted(qs, 'w');
    const value = Math.max(1, Math.round(f.base * q.mul));
    s.fishBag.push({ name: f.name, emoji: f.emoji, q: q.id, v: value, d: s.day });
    const cx = s.codex.fish[f.id] ||
      (s.codex.fish[f.id] = { n: 0, best: null, first: s.day, perfect: 0, value: 0 });
    cx.n++;
    cx.value = (cx.value || 0) + value;
    if (!cx.best || QUALITY.indexOf(q) > QUALITY.indexOf(qualityById(cx.best))) cx.best = q.id;
    s.stats.nets = (s.stats.nets || 0) + 1;
    return { name: f.name, q: q.id, value: value };
  }

  function netCatch(s) {
    let got = 0, used = 0, value = 0;
    if (isWinter(s.day)) return { used: 0, got: 0, value: 0, frozen: true, unset: 0 };
    const set = netSetCount(s);
    for (let i = 0; i < set; i++) {
      if ((s.bait.dough || 0) < 1) break;
      s.bait.dough--;
      used++;
      if (rand() < NET_CHANCE) {
        const r = netCatchOne(s);
        got++; value += r.value;
      }
    }
    // 网里有鱼就得取下来，这张网要重新布置
    if (got) s.netSet = Math.max(0, set - got);
    return { used: used, got: got, value: value, unset: got };
  }

  function buyNet(s) {
    if (!netUnlocked(s)) {
      return { ok: false, msg: '渔网要钓鱼 Lv' + BALANCE.gate.net + ' 才解锁（现在 Lv' + fishLv(s) + '）' };
    }
    const max = netMax(s);
    if (s.nets >= max) {
      return { ok: false, msg: '钓鱼 Lv' + fishLv(s) + ' 最多放 ' + max + ' 张渔网' };
    }
    if (s.coins < NET_COST) return { ok: false, msg: '金币不够（' + NET_COST + ' 金）' };
    s.coins -= NET_COST;
    ledger(s, '买渔网', 0, NET_COST);
    s.nets++;
    s.netSet = Math.min(s.nets, netSetCount(s) + 1);
    log(s, '🕸️ 在河边放了第 ' + s.nets + ' 张渔网（每天耗 1 面团饵，有概率上鱼；抓完要花 1 体力重布）', 'good');
    return { ok: true, msg: '渔网 ×' + s.nets, nets: s.nets, netSet: s.netSet };
  }

  function toggleHarvester(s) {
    if (!s.harvester) return { ok: false, msg: '还没买自动收获器' };
    s.harvesterOn = !s.harvesterOn;
    log(s, '🤖 自动收获器已' + (s.harvesterOn ? '开启' : '关闭'), 'info');
    return { ok: true, msg: '自动收获器已' + (s.harvesterOn ? '开启' : '关闭'), on: s.harvesterOn };
  }

  function buyHarvester(s) {
    if (s.harvester) return { ok: false, msg: '已经有自动收获器了' };
    if (!harvesterUnlocked(s)) {
      return { ok: false, msg: '自动收获器要种田 Lv' + BALANCE.gate.harvester + ' 才解锁（现在 Lv' + farmLv(s) + '）' };
    }
    if (s.coins < HARVESTER_COST) return { ok: false, msg: '金币不够（' + HARVESTER_COST + ' 金）' };
    s.coins -= HARVESTER_COST;
    ledger(s, '买自动收获器', 0, HARVESTER_COST);
    s.harvester = true;
    log(s, '🤖 买了自动收获器（每天睡觉时自动收获成熟作物，不耗体力）', 'good');
    return { ok: true, msg: '自动收获器已安装' };
  }

  /* ---------------- 自动播种器 ----------------
   * 一台只管 5 块地：买 N 台，每晚最多补 5N 块空地（不耗体力），每台每周 6 金维护费。
   * 台数上限 = 需要几台才能盖住全部地块（ceil(地块/5)），最多 9 台。
   */
  const SEEDER_COST = BALANCE.device.seeder;
  const SEEDER_PLOTS = BALANCE.device.seederPlots;

  function seederUnlocked(s) { return farmLv(s) >= BALANCE.gate.seeder; }
  function seederCount(s) { return Math.max(0, Math.round(s.seeder || 0)); }
  function seederMax(s) {
    return Math.min(BALANCE.device.seederMax,
      Math.max(1, Math.ceil((s.plots || []).length / SEEDER_PLOTS)));
  }
  /* 每晚能自动播几块 */
  function seederPlots(s) { return Math.min(seederCount(s) * SEEDER_PLOTS, (s.plots || []).length); }
  function seederUpkeep(s) { return seederCount(s) * BALANCE.upkeep.seeder; }

  /* 第 k 台负责的号段（给界面看） */
  function seederPlateRange(k) {
    const per = BALANCE.device.seederPlots;
    return { from: (k - 1) * per + 1, to: k * per };
  }

  function buySeeder(s) {
    if (!seederUnlocked(s)) {
      return { ok: false, msg: '自动播种器要种田 Lv' + BALANCE.gate.seeder + ' 才解锁（现在 Lv' + farmLv(s) + '）' };
    }
    const max = seederMax(s);
    if (seederCount(s) >= max) {
      return { ok: false, msg: seederCount(s) + ' 台已经够盖住 ' + s.plots.length +
        ' 块地了（每台 5 块，想再买先扩地）' };
    }
    if (s.coins < SEEDER_COST) return { ok: false, msg: '金币不够（' + SEEDER_COST + ' 金/台）' };
    s.coins -= SEEDER_COST;
    ledger(s, '买自动播种器 ×1', 0, SEEDER_COST);
    s.seeder = seederCount(s) + 1;
    s.seederOn = true;
    log(s, '🌱 买了第 ' + s.seeder + ' 台自动播种器（每晚补 ' + SEEDER_PLOTS + ' 块，维护 ' +
      BALANCE.upkeep.seeder + ' 金/周，记得选种子）', 'good');
    return { ok: true, msg: '自动播种器 ×' + s.seeder, n: s.seeder, cost: SEEDER_COST };
  }

  function toggleSeeder(s) {
    if (!seederCount(s)) return { ok: false, msg: '还没买自动播种器' };
    s.seederOn = !s.seederOn;
    log(s, '🌱 自动播种器已' + (s.seederOn ? '开启' : '关闭'), 'info');
    return { ok: true, msg: '自动播种器已' + (s.seederOn ? '开启' : '关闭'), on: s.seederOn };
  }

  /* 第 k 台自己选的种子（每台可以不同） */
  function autoSeedOf(s, k) {
    const arr = s.autoSeeds || [];
    const id = arr[k - 1];
    return (id && CROPS[id] && !CROPS[id].wild) ? id : null;
  }

  function setAutoSeed(s, k, id) {
    const n = seederCount(s);
    if (!n) return { ok: false, msg: '要先买自动播种器' };
    const mach = Math.round(k) || 1;
    if (mach < 1 || mach > n) return { ok: false, msg: '没有第 ' + mach + ' 台播种器' };
    if (id && !CROPS[id]) return { ok: false, msg: '没有这种作物' };
    if (id && CROPS[id].wild) return { ok: false, msg: '野货不能种' };
    if (id && (s.seeds[id] || 0) <= 0) return { ok: false, msg: '背包里没有 ' + CROPS[id].name + ' 种子' };
    s.autoSeeds = (s.autoSeeds || []).slice(0, n);
    while (s.autoSeeds.length < n) s.autoSeeds.push(null);
    s.autoSeeds[mach - 1] = id || null;
    log(s, '🌱 第 ' + mach + ' 台播种器设为 ' + (id ? CROPS[id].name : '不播种'), 'info');
    return { ok: true, msg: id ? '第 ' + mach + ' 台：' + CROPS[id].name : '第 ' + mach + ' 台已关闭播种',
             seed: id || null, mach: mach };
  }

  /* 委托手动刷新：每天一次 */
  function refreshOrders(s) {
    if (s.manualRefreshUsed) return { ok: false, msg: '今天已经手动刷新过了，明天再来' };
    s.orders = makeOrders(s);
    s.manualRefreshUsed = true;
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

  /* 反季种子照卖，但价格 ×1.8 */
  function seedOffSeason(s, id) {
    return !!s && !cropSeasonOk(id, s.day);
  }
  function seedBuyPrice(c, s) {
    if (!c) return 0;
    const base = c.seed * (seedOffSeason(s, c.id) ? BALANCE.seed.offSeasonMul : 1);
    return Math.ceil(base * (s ? tradeCut(s) : 1));
  }
  function seedSellPrice(c) { return Math.max(1, Math.floor(c.seed * SEED_SELL_RATE)); }

  function buySeed(s, id, n) {
    const c = CROPS[id];
    if (!c) return { ok: false, msg: '没有这种种子' };
    if (!seedUnlocked(s, id)) {
      return { ok: false, msg: c.name + '种子要种田 Lv' + c.lv + ' 才解锁（现在 Lv' + farmLv(s) + '）' };
    }
    if (isWinter(s.day)) return { ok: false, msg: '冬天种子店歇业了，开春再来' };
    const qty = Math.max(1, Math.floor(n || 1));
    const off = seedOffSeason(s, id);
    const cost = seedBuyPrice(c, s) * qty;
    if (s.coins < cost) return { ok: false, msg: '金币不够（需要 ' + cost + ' 金）' };
    s.coins -= cost;
    ledger(s, '买种子 ' + c.name + '×' + qty, 0, cost);
    tradeXp(s, cost);
    s.seeds[id] = (s.seeds[id] || 0) + qty;
    log(s, '🌰 买了 ' + c.name + '种子 ×' + qty + '（-' + cost + ' 金' +
      (off ? '，反季种子' : '') + '）', 'info');
    return { ok: true, msg: '买到 ' + c.name + ' 种子 ×' + qty, qty: qty, cost: cost, off: off };
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
    tradeXp(s, gain);
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
    tradeXp(s, total);
    log(s, '💰 清空种子，+' + total + ' 金', 'good');
    return { ok: true, msg: '卖出全部种子，+' + total + ' 金', income: total };
  }

  /* 全部播种：把所有空地都种上同一种作物 */
  function plantAll(s, cropId) {
    const c = CROPS[cropId];
    if (!c) return { ok: false, msg: '没有这种作物' };
    if (isWinter(s.day)) return { ok: false, msg: '冬天土地封冻了，开春再种吧' };
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
    if (s.plots.length >= BALANCE.expand.max) {
      return { ok: false, msg: '土地已经到上限（' + BALANCE.expand.max + ' 块）' };
    }
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
    s.maxEnergy += BALANCE.upgrade.step;
    log(s, '💪 体力上限 → ' + s.maxEnergy + '（伙食费 ' + mealFee(s) + ' 金/天）', 'good');
    return { ok: true, msg: '体力上限 ' + s.maxEnergy, maxEnergy: s.maxEnergy };
  }

