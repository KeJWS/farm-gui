/* 农田操作：播种、浇水、收获、肥料、扩张、睡觉、钓鱼主流程 */
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

  function plant(s, idx, cropId, opts) {
    const free = !!(opts && opts.free);          // 自动播种器：不花体力
    const p = s.plots[idx];
    const c = CROPS[cropId];
    if (!p) return { ok: false, msg: '没有这块地' };
    if (!c) return { ok: false, msg: '没有这种作物' };
    if (isWinter(s.day)) return { ok: false, msg: '冬天土地封冻了，开春再种吧' };
    if (p.crop) return { ok: false, msg: '这块地不是空地' };
    if (!free && s.energy < BALANCE.energy.plant) return { ok: false, msg: '体力不够了，先睡觉吧' };

    // 种子只能从种子店买，播种时只消耗背包里的种子
    const owned = s.seeds[cropId] || 0;
    if (owned <= 0) return { ok: false, msg: '没有 ' + c.name + ' 种子了，先去种子店买' };
    s.seeds[cropId] = owned - 1;
    if (s.seeds[cropId] === 0) delete s.seeds[cropId];

    const off = !cropSeasonOk(cropId, s.day);
    if (!free) s.energy -= BALANCE.energy.plant;
    p.crop = cropId;
    p.off = off ? 1 : 0;
    p.growth = 0;
    p.watered = false;
    p.missed = 0;
    p.fert = 0;
    p.ripeDay = null;
    p.hits = 0;
    p.phase = 'growing';
    p.planted = s.day;
    p.auto = free ? 1 : 0;      // 机器补种的地当晚不算「漏浇」
    s.stats.planted++;
    if (!(opts && opts.quiet)) {
      log(s, '🌱 ' + (idx + 1) + ' 号地种下 ' + c.name + (off ? '（反季，长得慢、结果少）' : ''), 'good');
    }
    return { ok: true, msg: c.name + ' 种下了' + (off ? '（反季）' : ''), off: off };
  }

  /* ---------------- 自动播种器（按片负责） ----------------
   * 第 k 台只管第 [5(k-1)+1, 5k] 块地；收完这块地它立刻补种，睡觉时再把空着的补上。
   */
  function seederPlateOf(s, idx) {
    const per = BALANCE.device.seederPlots;
    const k = Math.floor(idx / per) + 1;
    return k <= Math.max(0, Math.round(s.seeder || 0)) ? k : 0;
  }

  /* 这块地能不能被播种器补种：有对应的机器、那台选了种子、开着、不是冬天、还有种子 */
  function canAutoSeed(s, idx) {
    const k = seederPlateOf(s, idx);
    if (!k) return false;
    const seed = autoSeedOf(s, k);
    if (!seed || !s.seederOn || isWinter(s.day)) return false;
    return (s.seeds[seed] || 0) > 0;
  }

  /* 收完立刻补种，返回种下的作物 id；不满足条件返回 null */
  function autoReplant(s, idx) {
    const k = seederPlateOf(s, idx);
    if (!k || !canAutoSeed(s, idx)) return null;
    const seed = autoSeedOf(s, k);
    const r = plant(s, idx, seed, { free: true, quiet: true });
    return r.ok ? seed : null;
  }

  /* 季节特性：夏天浇水更费体力（2 点），其他季节 1 点 */
  function waterCost(s) {
    return seasonIdx(s.day) === 1 ? BALANCE.energy.waterSummer : BALANCE.energy.water;
  }

  function water(s, idx) {
    const p = s.plots[idx];
    if (!p || !p.crop) return { ok: false, msg: '这块地还没种东西' };
    if (p.phase === 'ripe') return { ok: false, msg: '已经成熟，快点收获吧' };
    if (p.watered) return { ok: false, msg: '今天已经浇过水了' };
    const cost = waterCost(s);
    if (s.energy < cost) return { ok: false, msg: '体力不够（浇水要 ' + cost + ' 点），先睡觉吧' };
    s.energy -= cost;
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
    if (!free && s.energy < BALANCE.energy.harvest) return { ok: false, msg: '体力不够了，先睡觉吧' };

    const c = CROPS[p.crop];
    if (!free) s.energy -= BALANCE.energy.harvest;

    let qty;
    if (c.multi) qty = p.hits === 0 ? c.firstQty : c.regrowQty;
    else if (c.big) qty = clamp(c.base - p.missed, 1, 9);
    else qty = clamp(c.base + farmYieldBonus(s) + randInt(-1, 1) - p.missed + fertBonus(p), 1, 99);
    // 季节特性：秋天大丰收，普通作物（含多次收）每收一次 +1
    if (seasonIdx(s.day) === 2 && !c.big) qty += 1;

    // 作物也有品质：施肥会多滚一次取最好的（普通肥 / 特效肥都是取 2 次最好）
    const q = rollQuality(p.fert > 0 ? 2 : 1);
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
    const levelUp = addLevelXp(s, 'farm', BALANCE.level.farmXpHarvest);

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
    // 这块地有自动播种器 → 收完立刻补种，不用等睡觉
    let replanted = null;
    if (!regrown) replanted = autoReplant(s, idx);
    const fullMsg = msg + (replanted ? ' · 🌱 已补种 ' + CROPS[replanted].name : '');
    log(s, '🧺 ' + fullMsg, 'good');
    return { ok: true, msg: fullMsg, qty: qty, crop: p.crop || c.id, unit: unit, quality: q,
             seed: extraSeed, regrown: regrown, levelUp: levelUp, replanted: replanted };
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

  /* 农产品收购：作物只能在这里卖（仓库不出售任何东西） */
  function sellAll(s) {
    const ids = Object.keys(s.store).filter(function (k) { return storeCount(s, k) > 0; });
    if (!ids.length) return { ok: false, msg: '仓库里没有作物可卖' };

    let income = 0, count = 0;
    const parts = [];
    ids.forEach(function (id) {
      const n = storeCount(s, id);
      const gain = shopSellValue(s, id, n);
      income += gain; count += n;
      parts.push(CROPS[id].name + '×' + n + ' = ' + gain + ' 金');
      addSupply(s, id, n);
      delete s.store[id];
    });
    s.stats.cropsSold = (s.stats.cropsSold || 0) + count;
    addCoins(s, income, '农产品店 · 卖作物');
    tradeXp(s, income);
    log(s, '💰 农产品店收购 ' + parts.join('、') + '，收入 ' + income + ' 金（8 折）', 'good');
    return { ok: true, msg: '卖出全部，+' + income + ' 金', income: income, count: count };
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

  /* 自定义卖出 n 个（从品质差的开始卖） */
  function sellCropN(s, id, n) {
    const have = storeCount(s, id);
    if (!have) return { ok: false, msg: '没有可卖的' };
    const qty = Math.max(1, Math.min(have, Math.floor(n || have)));
    const t = takeStoreN(s, id, qty);
    const raw = t.parts.reduce(function (a, p) { return a + p.n * p.unit; }, 0);
    const gain = Math.max(1, Math.round(shopValue(raw) * sellBonus(s) * marketMul(s, id, qty)));
    addSupply(s, id, qty);
    s.stats.cropsSold = (s.stats.cropsSold || 0) + qty;
    addCoins(s, gain, '农产品店 · 卖 ' + CROPS[id].name + '×' + qty);
    tradeXp(s, gain);
    log(s, '💰 农产品店收购 ' + CROPS[id].name + '×' + qty + '，+' + gain + ' 金（8 折）', 'good');
    return { ok: true, msg: '+' + gain + ' 金', income: gain, count: qty };
  }

  function sellOne(s, id) {
    const n = storeCount(s, id);
    if (!n) return { ok: false, msg: '没有可卖的' };
    const gain = shopSellValue(s, id, n);
    addSupply(s, id, n);
    delete s.store[id];
    s.stats.cropsSold = (s.stats.cropsSold || 0) + n;
    addCoins(s, gain, '农产品店 · 卖 ' + CROPS[id].name);
    tradeXp(s, gain);
    log(s, '💰 农产品店收购 ' + CROPS[id].name + '×' + n + '，+' + gain + ' 金（8 折）', 'good');
    return { ok: true, msg: '+' + gain + ' 金', income: gain, count: n };
  }

  /* 施肥 = 消耗仓库里的肥料（肥料在种子店买，半价卖回） */
  function useFert(s, idx, kind) {
    const p = s.plots[idx];
    const f = FERT[kind];
    if (!p || !p.crop) return { ok: false, msg: '这块地还没种东西' };
    if (!f) return { ok: false, msg: '没有这种肥料' };
    if (p.fert) return { ok: false, msg: '这块地已经施过肥了' };
    if (p.phase === 'ripe') return { ok: false, msg: '都熟了，别浪费肥料' };
    if ((s.ferts[kind] || 0) < 1) return { ok: false, msg: '肥料用完了，去种子店买' };
    if (s.energy < BALANCE.energy.fert) return { ok: false, msg: '体力不够了' };
    s.ferts[kind]--;
    s.energy -= BALANCE.energy.fert;
    p.fert = f.add;
    const big = !!CROPS[p.crop].big;
    log(s, '🧪 ' + (idx + 1) + ' 号地施了' + f.name +
      (big ? '（大作物只提品质）' : '（产量 +' + f.add + '、品质取更优）'), 'good');
    return { ok: true, msg: f.name + ' 施用成功' };
  }

  function fertSellPrice(kind) {
    const f = FERT[kind];
    return f ? Math.max(1, Math.floor(f.cost * FERT_SELL_RATE)) : 0;
  }

  function buyFertItem(s, kind, n) {
    const f = FERT[kind];
    if (!f) return { ok: false, msg: '没有这种肥料' };
    if (!fertUnlocked(s, kind)) {
      return { ok: false, msg: f.name + '要种田 Lv' + f.lv + ' 才解锁（现在 Lv' + farmLv(s) + '）' };
    }
    const qty = Math.max(1, Math.floor(n || 1));
    const unit = Math.round(f.cost * tradeCut(s));
    const cost = unit * qty;
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
    if (!sprinklerUnlocked(s)) {
      return { ok: false, msg: '洒水器要种田 Lv' + BALANCE.gate.sprinkler + ' 才解锁（现在 Lv' + farmLv(s) + '）' };
    }
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
    if (!targets.length) return { ok: false, msg: '没有可施肥的地块（已施肥、已成熟都不行）' };

    let n = 0, stop = null;
    for (let k = 0; k < targets.length; k++) {
      if (s.energy < BALANCE.energy.fert) { stop = '体力不够了'; break; }
      if ((s.ferts[kind] || 0) < 1) { stop = '肥料不够了'; break; }
      const p = s.plots[targets[k]];
      s.ferts[kind]--;
      s.energy -= BALANCE.energy.fert;
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
    const coinsBefore = s.coins || 0;
    const cash = [];        // 当日现金收支（正负号）
    const goods = [];       // 入库产出（折算成金，不算现金）
    let missedNow = 0;
    if (s.coins >= fee) {
      addCoins(s, -fee, '伙食费');
      cash.push({ label: '🍖 伙食', value: -fee });
      notes.push({ kind: 'meal', text: '🍖 伙食 -' + fee });
      s.energy = s.maxEnergy;
    } else {
      // 没钱只恢复到「上限的 pct，至少 min」，但不会扣掉已有的体力
      const floor = Math.max(BALANCE.meal.noMoneyMin,
        Math.round(s.maxEnergy * BALANCE.meal.noMoneyPct));
      s.energy = Math.max(s.energy, Math.min(floor, s.maxEnergy));
      notes.push({ kind: 'meal', text: '😵 没钱吃饭，只回 ' + floor + ' 体力' });
    }

    // 自动收获器：睡觉时把能收的地块收掉，不耗体力
    let hn = 0, hval = 0, hrp = 0;
    if (s.harvester && s.harvesterOn) {
      s.plots.forEach(function (p, i) {
        if (!p.crop || !canHarvest(s, p)) return;
        const hr = harvest(s, i, true);
        if (hr.ok) { hn++; hval += hr.qty * hr.unit; if (hr.replanted) hrp++; }
      });
      if (hn) notes.push({ kind: 'harvest', text: '🤖 收获 ' + hn + ' 块（值 ' + hval + '）' +
        (hrp ? ' · 补种 ' + hrp + ' 块' : '') });
    }

    // 自动播种器：每台只管自己那 5 块，用自己选的种子把空着的补上（不耗体力）
    let sn = 0;
    if (s.seeder && s.seederOn && !isWinter(s.day)) {
      const per = BALANCE.device.seederPlots;
      const machines = Math.round(s.seeder || 0);
      for (let k = 1; k <= machines; k++) {
        const seed = autoSeedOf(s, k);
        if (!seed) continue;
        for (let i = (k - 1) * per; i < Math.min(k * per, s.plots.length); i++) {
          if (s.plots[i].crop) continue;
          if ((s.seeds[seed] || 0) <= 0) break;
          if (plant(s, i, seed, { free: true, quiet: true }).ok) sn++;
        }
      }
      if (sn) notes.push({ kind: 'seeder', text: '🌱 自动播种 ' + sn + ' 块' });
    }

    s.plots.forEach(function (p) {
      if (p.crop && (p.phase === 'growing' || p.phase === 'regrow') && !p.watered &&
          !(p.auto && p.planted === s.day)) { p.missed++; missedNow++; }
    });
    s.plots.forEach(function (p) { p.watered = false; });

    const prevDay = s.day;
    s.day++;
    s.teaUsed = false;
    s.workUsed = false;
    // 市场冷却：昨天的销量今天只算 70%（回落 30%）
    const decay = BALANCE.market.decay;
    s.market = s.market || {};
    Object.keys(s.market).forEach(function (id) {
      const m = s.market[id];
      if (!m) return;
      m.sold = Math.round((m.sold || 0) * decay * 10) / 10;
      if (m.sold < 0.5) delete s.market[id];
    });
    s.marketF = s.marketF || {};
    Object.keys(s.marketF).forEach(function (name) {
      const m = s.marketF[name];
      if (!m) return;
      m.sold = Math.round((m.sold || 0) * decay * 10) / 10;
      if (m.sold < 0.5) delete s.marketF[name];
    });
    s.weather = rollWeather(s.day);
    const w = WEATHER[s.weather];
    notes.push({ kind: 'weather', text: w.emoji + ' ' + w.name });
    snapshotMarket(s);            // 记一笔今天的市价，攒历史曲线

    let watered = 0, ripened = 0;
    if (w.autoWater) {
      let n = 0, ripe = 0;
      s.plots.forEach(function (p) {
        if (!p.crop || p.phase === 'ripe') return;
        if (!p.watered) { if (grow(p, s)) ripe++; p.watered = true; n++; }
      });
      watered += n; ripened += ripe;
      if (n) notes.push({ kind: 'water', text: '🌧️ 自动浇 ' + n + ' 块' + (ripe ? '，熟 ' + ripe : '') });
    } else if (s.sprinklers > 0) {
      // 洒水器：每天自动浇前 N 块没浇的地，不耗体力
      let n = 0, ripe = 0;
      s.plots.forEach(function (p) {
        if (n >= s.sprinklers * BALANCE.device.sprinklerPerDay) return;
        if (!p.crop || p.phase === 'ripe' || p.watered) return;
        if (grow(p, s)) ripe++;
        p.watered = true;
        n++;
      });
      watered += n; ripened += ripe;
      if (n) notes.push({ kind: 'water', text: '🚿 洒水器浇 ' + n + ' 块' + (ripe ? '，熟 ' + ripe : '') });
    }

    // 果园：成树在当季每天挂果（等玩家花体力收），每棵挂满 ripeCap 个就不再长
    const orc = orchardTick(s, prevDay);
    if (orc.fruit) {
      notes.push({ kind: 'orchard', text: '🍑 果园挂了 ' + orc.fruit + ' 个水果，等你收' });
    }
    if (orc.full) {
      notes.push({ kind: 'orchard', text: '🍑 ' + orc.full + ' 棵树挂满了（' +
        BALANCE.orchard.ripeCap + ' 个），收完才会继续长' });
    }
    if (orc.thirsty) {
      notes.push({ kind: 'orchard', text: '💧 ' + orc.thirsty + ' 棵育苗树今天没浇水' });
    }

    // 渔夫：发工资 → 替你重布渔网 → 自动甩杆（不耗玩家体力、不给玩家经验）
    let fisherReport = null;
    if (fisherObj(s) && !isWinter(s.day)) {
      const wage = fisherWage(s);
      if ((s.coins || 0) >= wage) {
        addCoins(s, -wage, '渔夫工资');
        cash.push({ label: '🧑‍🌾 渔夫工资', value: -wage });
        if (s.nets > 0) s.netSet = s.nets;
        const fr = fisherCatch(s);
        fisherReport = { lv: fr.lv, got: fr.got, casts: fr.casts, value: fr.value, wage: wage,
                         leveled: fr.leveled, short: fr.short };
        if (fr.value) goods.push({ label: '🧑‍🌾 渔夫渔获', value: fr.value });
        notes.push({ kind: 'fisher', text: '🧑‍🌾 渔夫 Lv' + fr.lv + ' · ' + fr.got + '/' + fr.casts +
          ' 条（值 ' + fr.value + '）· 工资 -' + wage +
          (fr.leveled ? ' · 升级 ×' + fr.leveled : '') + (fr.short ? ' · 面团饵不够' : '') });
      } else {
        fisherReport = { lv: fisherLv(s), got: 0, casts: 0, value: 0, wage: wage, strike: true };
        notes.push({ kind: 'fisher', text: '🧑‍🌾 渔夫没领到工资，今天罢工' });
      }
    }

    // 渔网：只算布置好的那些，每天消耗面团饵，有概率上鱼
    let netReport = null;
    if (s.nets > 0) {
      const nr = netCatch(s);
      if (nr.used) {
        netReport = { got: nr.got, used: nr.used, value: nr.value, pending: netPending(s) };
        if (nr.value) goods.push({ label: '🕸️ 渔网渔获', value: nr.value });
        notes.push({ kind: 'net', text: '🕸️ 渔网 ' + nr.got + '/' + nr.used + ' 条' +
          (netPending(s) ? '（' + netPending(s) + ' 张待重布）' : '') });
      }
    }

    // 收购箱：昨晚放进去的货，天亮按原价结清
    const ship = shipBox(s);
    if (ship.n) {
      cash.push({ label: '📦 收购箱', value: ship.value });
      notes.push({ kind: 'box', text: '📦 收购箱 +' + ship.value });
    }

    // 5 块地之后每周要交土地维护费
    const landFee = plotUpkeep(s.plots.length);
    const devFee = deviceUpkeep(s);
    const up = landFee + devFee;
    if (up > 0 && s.day % 7 === 0) {
      const pay = Math.min(up, s.coins);
      s.coins -= pay;
      ledger(s, '维护费（周）', 0, pay);
      cash.push({ label: '🧾 维护费', value: -pay });
      notes.push({ kind: 'upkeep', text: '🧾 维护 -' + pay + '（土地 ' + landFee + ' + 设备 ' + devFee + '）' });
    }

    // 月度税金：每 30 天按金币 5% 收
    if (s.day % 30 === 0) {
      const tax = taxDue(s);
      const pay = Math.min(tax, s.coins);
      s.coins -= pay;
      ledger(s, '月度税金', 0, pay);
      cash.push({ label: '🏛️ 税金', value: -pay });
      notes.push({ kind: 'tax', text: '🏛️ 税 -' + pay + '（4%）' });
    }

    // 每天自动换一批委托，同时给一次手动刷新机会
    s.orders = makeOrders(s);
    s.manualRefreshUsed = false;

    // 长期订单：完成后等到指定日期，过期单则在隔天自动换新。
    const longOrderReady = !s.longOrder && s.longOrderReadyDay && s.day >= s.longOrderReadyDay;
    if ((!s.longOrder && (!s.longOrderReadyDay || longOrderReady)) ||
        (s.longOrder && s.day > (s.longOrder.deadline || 0))) {
      s.longOrder = makeLongOrder(s);
      s.longOrderReadyDay = 0;
    }

    // 水产店 / 农产品店每天补货
    s.shop = makeShop(s.day);
    s.cropShop = makeCropShop(s.day);

    const head = '🌙 第 ' + s.day + ' 天 · ' + w.name;
    const body = notes.filter(function (n) { return n.kind !== 'weather'; })
                      .map(function (n) { return n.text; }).join(' · ');
    log(s, '🌙 睡觉 → 第 ' + s.day + ' 天 · ' + w.name, 'sys');

    // 每日总结：把这一晚发生的事整理成结构化数据，给界面做「一天结算」面板
    const ready = s.plots.filter(function (p) { return p.crop && p.phase === 'ripe'; }).length;
    const thirsty = s.plots.filter(function (p) {
      return p.crop && (p.phase === 'growing' || p.phase === 'regrow') && !p.watered;
    }).length;
    const deliverable = (s.orders || []).filter(function (o) { return orderHave(s, o) >= o.qty; }).length;
    const longLeft = s.longOrder && s.longOrder.deadline ? Math.max(0, s.longOrder.deadline - s.day) : null;
    const tomorrow = [];
    if (ready) tomorrow.push('有 ' + ready + ' 块地可以收割');
    if (thirsty) tomorrow.push(thirsty + ' 块地要浇水');
    if (deliverable) tomorrow.push(deliverable + ' 张委托能交');
    if (longLeft !== null) tomorrow.push('长期订单还剩 ' + longLeft + ' 天');
    if (s.coins < fee) tomorrow.push('金币不够明天的伙食（' + fee + ' 金）');
    const orcSummary = orchardSummary(s);
    if (orcSummary.thirsty) tomorrow.push('果园有 ' + orcSummary.thirsty + ' 棵育苗树要浇水（1 体力/棵）');
    if (orcSummary.ripe) tomorrow.push('果园有 ' + orcSummary.ripe + ' 个水果可以收（1 体力/棵）');
    const report = {
      day: s.day,
      weather: { id: s.weather, emoji: w.emoji, name: w.name },
      coins: { before: coinsBefore, after: s.coins, delta: s.coins - coinsBefore },
      cash: cash,
      goods: goods,
      farm: { harvested: hn, harvestValue: hval, replanted: hrp, seeder: sn,
              watered: watered, ripened: ripened, missed: missedNow },
      fisher: fisherReport,
      net: netReport,
      orders: { fresh: (s.orders || []).length, deliverable: deliverable },
      orchard: { fruit: orc.fruit, mature: orcSummary.mature, growing: orcSummary.growing,
                 ripe: orcSummary.ripe, thirsty: orcSummary.thirsty },
      longOrder: s.longOrder ? { name: s.longOrder.name, emoji: s.longOrder.emoji,
        qty: s.longOrder.qty, have: orderHave(s, s.longOrder), days: longLeft } : null,
      tomorrow: tomorrow
    };
    return { ok: true, msg: '新的一天', day: s.day, notes: notes, weather: s.weather,
             summary: body ? head + ' ｜ ' + body : head, report: report };
  }

  /* 品质取 r 次最好的期望倍率（r=1 单次；r=2 蚯蚓 / 高级假饵） */
  function expectedQualityMul(rolls) {
    const r = Math.max(1, Math.round(rolls || 1));
    const total = QUALITY.reduce(function (a, q) { return a + q.w; }, 0);
    let out = 0, prev = 0, cum = 0;
    QUALITY.forEach(function (q) {
      cum += q.w;
      const p = cum / total;
      out += q.mul * (Math.pow(p, r) - Math.pow(prev, r));
      prev = p;
    });
    return out;
  }

  /* 钓鱼预估：当前饵 / 天气 / 等级下的一杆期望（河边面板 + 分析脚本共用） */
  function fishForecast(s, kind) {
    kind = kind || 'dough';
    const w = WEATHER[s.weather] || { hookMod: 0 };
    const rawHook = (HOOK[kind] || 0.9) + (w.hookMod || 0) + fishHookBonus(s);
    const hook = clamp(rawHook, 0.3, 1);            // 咬钩不设 98% 上限：满 100% 必中，超出部分走双咬钩
    const bonusHook = Math.max(0, rawHook - 1);      // 超过 100% 的部分 = 再来一条的概率
    const lvNow = fishLv(s);
    const lureLike = kind === 'lure' || kind === 'lure2';
    let total = 0;
    const table = FISH.map(function (f) {
      if (f.chest && lvNow < (f.lv || 1)) return null;
      let mul = 1;
      if (f.trash) mul = lureLike ? BALANCE.bait.lureTrash : 1;
      else if (f.chest) mul = lureLike ? 1.4 : 1;
      else if (kind === 'worm') mul = BALANCE.bait.wormGood;
      else if (kind === 'premium') mul = BALANCE.bait.premiumGood;
      else if (lureLike) mul = BALANCE.bait.lureGood;
      if (!f.trash && !f.chest) mul *= fishGoodBonus(s);
      if (f.seasons) mul *= f.seasons.indexOf(seasonIdx(s.day)) >= 0 ? FISH_IN_SEASON : FISH_OFF_SEASON;
      const ww = f.w * mul;
      total += ww;
      return { f: f, w: ww };
    }).filter(Boolean);
    const qMul = expectedQualityMul((kind === 'worm' || kind === 'lure2' || kind === 'premium') ? 2 : 1);
    let ev = 0;
    table.forEach(function (x) {
      const f = x.f;
      const v = f.trash ? 1 : (f.chest ? f.base : f.base * qMul);
      ev += (x.w / total) * v;
    });
    ev *= hook * (1 + bonusHook);                    // 双咬钩把每杆期望抬高
    const cost = kind === 'worm' ? BALANCE.dig.value
      : (kind === 'dough' ? BAIT.dough.price
        : (kind === 'premium' ? BAIT.premium.price
          : (kind === 'lure' ? BALANCE.lure.price / BALANCE.lure.dur
            : BALANCE.lure2.price / BALANCE.lure2.dur)));
    const baitGood = kind === 'worm' ? BALANCE.bait.wormGood
      : (kind === 'premium' ? BALANCE.bait.premiumGood
        : (kind === 'lure' || kind === 'lure2' ? BALANCE.bait.lureGood : 1));
    return { hook: hook, bonusHook: bonusHook, ev: ev, cost: cost, net: ev - cost,
             good: fishGoodBonus(s) * baitGood, qMul: qMul, kind: kind };
  }

  function pickBait(s, prefer) {
    if (prefer === 'worm' && s.bait.worm > 0) return 'worm';
    if (prefer === 'dough' && s.bait.dough > 0) return 'dough';
    if (prefer === 'premium' && s.bait.premium > 0) return 'premium';
    if (prefer === 'lure' && s.lure.owned && s.lure.dur > 0) return 'lure';
    if (prefer === 'lure2' && s.lure2 && s.lure2.owned && s.lure2.dur > 0) return 'lure2';
    if (s.bait.worm > 0) return 'worm';
    if (s.bait.dough > 0) return 'dough';
    if (s.bait.premium > 0) return 'premium';
    if (s.lure.owned && s.lure.dur > 0) return 'lure';
    if (s.lure2 && s.lure2.owned && s.lure2.dur > 0) return 'lure2';
    return null;
  }

  function baitCount(s, kind) {
    if (kind === 'worm') return s.bait.worm;
    if (kind === 'dough') return s.bait.dough;
    if (kind === 'premium') return s.bait.premium || 0;
    if (kind === 'lure') return s.lure.owned ? s.lure.dur : 0;
    if (kind === 'lure2') return (s.lure2 && s.lure2.owned) ? s.lure2.dur : 0;
    return 0;
  }

  /* 上钩之后：抽鱼种 / 品质 / 图鉴 / 入包（不含咬钩判定、体力与饵料消耗） */
  function landFish(s, kind, opts) {
    opts = opts || {};
    const lvNow = fishLv(s);
    const lureLike = kind === 'lure' || kind === 'lure2';
    const table = FISH.map(function (f) {
      if (f.chest && lvNow < (f.lv || 1)) return null;
      let mul = 1;
      if (f.trash) mul = lureLike ? BALANCE.bait.lureTrash : 1;
      else if (f.chest) mul = lureLike ? 1.4 : 1;
      else if (kind === 'worm') mul = BALANCE.bait.wormGood;
      else if (kind === 'premium') mul = BALANCE.bait.premiumGood;
      else if (lureLike) mul = BALANCE.bait.lureGood;
      if (!f.trash && !f.chest) mul *= (opts.goodBonus == null ? fishGoodBonus(s) : opts.goodBonus);
      if (f.seasons) {
        mul *= f.seasons.indexOf(seasonIdx(s.day)) >= 0 ? FISH_IN_SEASON : FISH_OFF_SEASON;
      }
      return Object.assign({}, f, { w: f.w * mul });
    }).filter(Boolean);
    const f = weighted(table, 'w');
    const rolls = (kind === 'worm' || kind === 'lure2' || kind === 'premium') ? 2 : 1;
    const q = (f.trash || f.chest) ? null : rollQuality(rolls);
    const value = f.trash ? 1 : (f.chest ? f.base : Math.max(1, Math.round(f.base * q.mul)));

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
    s.fishBag.push({ name: name, emoji: emoji, q: q ? q.id : null, v: value, d: s.day,
                     no: noOrder || undefined, chest: f.chest || undefined });

    const entry = { day: s.day, fish: name, emoji: emoji, quality: q, price: value,
                    base: f.base, bait: kind, trash: !!f.trash, chest: f.chest || null, noOrder: noOrder };
    s.fishBook.count++;
    s.fishBook.entries.unshift(entry);
    if (s.fishBook.entries.length > 50) s.fishBook.entries.length = 50;
    if (!f.trash && !f.chest) {
      if (!s.fishBook.best || QUALITY.indexOf(q) > QUALITY.indexOf(s.fishBook.best.quality)) {
        s.fishBook.best = { fish: f.name, quality: q, price: value, day: s.day };
      }
      if (!s.fishBook.priciest || value > s.fishBook.priciest.price) {
        s.fishBook.priciest = { fish: f.name, quality: q, price: value, day: s.day };
      }
    }
    if (!opts.quiet) {
      log(s, f.trash
        ? '🎣 钓上来 ' + emoji + ' ' + name + '（不值钱，拿去百货店回收）'
        : f.chest
          ? '🎣 捞上来 ' + emoji + ' ' + name + '（带去百货店开箱或回收）'
          : '🎣 钓到 ' + emoji + ' ' + name + ' · ' + q.emoji + q.name + ' · 值 ' + value + ' 金（已入仓库）',
        f.trash ? 'warn' : 'good');
    }
    return entry;
  }

  function fish(s, preferBait, opts) {
    opts = opts || {};
    const w = WEATHER[s.weather];
    if (isWinter(s.day)) return { ok: false, msg: '河面结冰了，冬天钓不了鱼' };
    if (!opts.free && s.energy < BALANCE.energy.fish) {
      return { ok: false, msg: '体力不够（钓鱼要 ' + BALANCE.energy.fish + ' 点）' };
    }
    const kind = opts.forceKind || pickBait(s, preferBait);
    if (!kind) return { ok: false, msg: '没有饵料了，先去挖蚯蚓或买饵' };

    if (!opts.free) s.energy -= BALANCE.energy.fish;
    if (!opts.noBait) {
      if (kind === 'worm') {
        s.bait.worm--;
      } else if (kind === 'dough') {
        s.bait.dough--;
      } else if (kind === 'premium') {
        s.bait.premium--;
      } else if (kind === 'lure2') {
        s.lure2.dur--;
        if (s.lure2.dur <= 0) { s.lure2.owned = false; s.lure2.dur = 0; }
      } else {
        s.lure.dur--;
        if (s.lure.dur <= 0) { s.lure.owned = false; s.lure.dur = 0; }
      }
    }

    // 先判定咬钩：天气与饵决定「有没有鱼咬」，鱼种权重不再受天气影响
    s.stats.casts++;
    const hookExtra = (opts.hookBonus == null) ? fishHookBonus(s) : opts.hookBonus;
    // 超过 100% 的咬钩率不浪费：多出来的部分再判定一次（当前理论上限约 1.15）
    const rawHook = (HOOK[kind] || 0.9) + (w.hookMod || 0) + hookExtra;
    const hook = clamp(rawHook, 0.3, 1);            // 咬钩不设 98% 上限：满 100% 必中，超出部分走双咬钩
    if (rand() > hook) {
      if (!opts.quiet) log(s, '💨 空竿：' + w.name + '，没有鱼咬钩', 'warn');
      return { ok: true, empty: true, entry: null, entries: [], bonus: 0, msg: '空竿了' };
    }

    const entries = [landFish(s, kind, opts)];
    let over = Math.max(0, rawHook - 1);
    while (over > 0 && rand() < Math.min(1, over)) {
      entries.push(landFish(s, kind, Object.assign({}, opts, { quiet: true })));
      over -= 1;
    }
    const entry = entries[0];
    const total = entries.reduce(function (n, e) { return n + e.price; }, 0);

    // 经验：每 fishXpEvery 杆 1 点，完美品质给 fishXpPerfect（渔夫代钓不给经验）
    const L = BALANCE.level;
    const q = entry.quality;
    const xpGain = opts.noXp ? 0
      : ((q && q.id === 'perfect') ? L.fishXpPerfect : ((s.stats.casts % L.fishXpEvery === 0) ? 1 : 0));
    const levelUp = xpGain ? addLevelXp(s, 'fish', xpGain) : false;
    if (!opts.quiet && entries.length > 1) {
      log(s, '🎣 双咬钩！这一杆上了 ' + entries.length + ' 条', 'good');
    }
    return { ok: true, entry: entry, entries: entries, bonus: entries.length - 1,
             levelUp: levelUp, msg: entries.length > 1
               ? entries.length + ' 条 · 值 ' + total + ' 金'
               : entry.fish + ' 值 ' + entry.price + ' 金' };
  }

  /* 全体力钓鱼：一直甩到体力不够 / 没饵，日志只留一条汇总 */
  function fishAll(s, preferBait) {
    let n = 0, empty = 0, value = 0, chests = 0, ups = 0, doubles = 0, lastErr = '';
    const got = [];
    while (s.energy >= BALANCE.energy.fish && n < 400) {
      const r = fish(s, preferBait, { quiet: true });
      if (!r.ok) { lastErr = r.msg; break; }
      n++;
      if (r.empty) empty++;
      else {
        doubles += r.bonus || 0;
        (r.entries || [r.entry]).forEach(function (e) {
          value += e.price;
          if (e.chest) chests++;
          got.unshift(e);
        });
        if (got.length > 12) got.length = 12;
      }
      ups += r.levelUp || 0;
    }
    if (!n) return { ok: false, msg: lastErr || '体力不够（钓鱼要 2 点），先睡觉吧' };
    log(s, '⚡ 一口气甩了 ' + n + ' 杆' + (empty ? '（空竿 ' + empty + '）' : '') +
      '，渔获值 ' + value + ' 金' + (doubles ? '（双咬钩 ' + doubles + ' 次）' : '') +
      (chests ? '，捞到宝箱 ' + chests + ' 个' : ''), 'good');
    return { ok: true, count: n, empty: empty, income: value, chests: chests, levelUp: ups, doubles: doubles,
             entries: got, msg: '甩了 ' + n + ' 杆，渔获值 ' + value + ' 金' + (doubles ? ' · 双咬钩 ×' + doubles : '') };
  }

  function fishMany(s, times, preferBait) {
    const results = [];
    let value = 0, empty = 0, doubles = 0;
    for (let i = 0; i < times; i++) {
      const r = fish(s, preferBait);
      if (!r.ok) { results.push(r); break; }
      if (r.empty) empty++; else {
        doubles += r.bonus || 0;
        (r.entries || [r.entry]).forEach(function (e) { value += e.price; });
      }
      results.push(r);
    }
    const okCount = results.filter(function (r) { return r.ok; }).length;
    if (!okCount) return results[0] || { ok: false, msg: '钓不了' };
    return { ok: true, count: okCount, empty: empty, income: value, results: results, doubles: doubles,
             msg: '甩了 ' + okCount + ' 杆' + (empty ? '（空竿 ' + empty + '）' : '') + '，渔获值 ' + value + ' 金' +
               (doubles ? ' · 双咬钩 ×' + doubles : '') };
  }

