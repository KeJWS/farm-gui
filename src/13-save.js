/* 存读档与对外导出（FarmGame API） */
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
      plot.planted = Math.round(num(plot.planted, 0, 0, 1e6));
      plot.auto = plot.auto ? 1 : 0;
      plot.off = plot.off ? 1 : 0;
      if (!plot.crop) return makePlot();
      if (['growing', 'regrow', 'ripe'].indexOf(plot.phase) < 0) plot.phase = 'growing';
      return plot;
    });

    merged.bait = Object.assign({ worm: 0, dough: 0 }, s.bait || {});
    merged.bait.worm = Math.round(num(merged.bait.worm, 0, 0, 9999));
    merged.bait.dough = Math.round(num(merged.bait.dough, 0, 0, 9999));
    merged.lure = Object.assign({ owned: false, dur: 0 }, s.lure || {});
    merged.lure.dur = Math.round(num(merged.lure.dur, 0, 0, BALANCE.lure.dur));
    merged.lure.owned = !!merged.lure.owned && merged.lure.dur > 0;
    merged.lure2 = Object.assign({ owned: false, dur: 0 }, s.lure2 || {});
    merged.lure2.dur = Math.round(num(merged.lure2.dur, 0, 0, BALANCE.lure2.dur));
    merged.lure2.owned = !!merged.lure2.owned && merged.lure2.dur > 0;
    merged.fishBook = Object.assign({ count: 0, entries: [], best: null, priciest: null }, s.fishBook || {});
    merged.stats = Object.assign({ harvests: 0, casts: 0, dug: 0, planted: 0, orders: 0, cropsSold: 0, works: 0, longOrders: 0, boxItems: 0, boxIncome: 0, teas: 0, chests: 0, forages: 0, wild: {}, forageBest: 0 }, s.stats || {});
    merged.stats.wild = Object.assign({}, (s.stats && s.stats.wild) || {});
    Object.keys(merged.stats.wild).forEach(function (id) {
      if (!CROPS[id] || !CROPS[id].wild) { delete merged.stats.wild[id]; return; }
      merged.stats.wild[id] = Math.round(num(merged.stats.wild[id], 0, 0, 999999));
    });
    merged.stats.forages = Math.round(num(merged.stats.forages, 0, 0, 999999));
    merged.stats.forageBest = Math.round(num(merged.stats.forageBest, 0, 0, 3));
    merged.stats.dug = Math.round(num(merged.stats.dug, 0, 0, 999999));
    merged.teas = Object.assign({ green: 0, black: 0, milk: 0, coffee: 0 }, s.teas || {});
    Object.keys(merged.teas).forEach(function (id) {
      if (!TEAS[id]) { delete merged.teas[id]; return; }
      merged.teas[id] = Math.round(num(merged.teas[id], 0, 0, 999));
    });
    merged.keys = Object.assign({ iron: 0, gold: 0 }, s.keys || {});
    Object.keys(merged.keys).forEach(function (id) {
      if (!KEYS[id]) { delete merged.keys[id]; return; }
      merged.keys[id] = Math.round(num(merged.keys[id], 0, 0, 99));
    });
    merged.box = Array.isArray(s.box) ? s.box.slice(0, 500).filter(function (e) {
      return e && (e.kind === 'crop' || e.kind === 'fish') && e.name;
    }).map(function (e) {
      const out = { kind: e.kind, name: String(e.name).slice(0, 20), emoji: String(e.emoji || '').slice(0, 4),
                    n: Math.round(num(e.n, 1, 1, 9999)), v: Math.round(num(e.v, 0, 0, 1e9)) };
      if (e.kind === 'crop' && CROPS[e.id]) {
        out.id = e.id;
        out.parts = Array.isArray(e.parts) ? e.parts.filter(function (p) {
          return p && Q_IDS.indexOf(p.q) >= 0 && p.n > 0;
        }).map(function (p) {
          return { q: p.q, n: Math.round(num(p.n, 1, 1, 9999)), unit: Math.round(num(p.unit, 1, 0, 9999)) };
        }) : null;
      }
      if (e.kind === 'fish') {
        out.parts = Array.isArray(e.parts) ? e.parts.filter(function (p) {
          return p && p.n > 0 && (p.q === '-' || Q_IDS.indexOf(p.q) >= 0);
        }).map(function (p) {
          return { q: p.q, n: Math.round(num(p.n, 1, 1, 9999)), unit: Math.round(num(p.unit, 1, 0, 9999)) };
        }) : null;
      }
      if (e.kind === 'fish' && Q_IDS.indexOf(e.q) >= 0) out.q = e.q;
      if (e.kind === 'fish' && e.chest && CHESTS[e.chest]) out.chest = e.chest;
      if (e.kind === 'fish' && e.junk) out.junk = true;
      if (e.kind === 'fish' && e.trash) out.trash = true;
      return out;
    }) : [];
    merged.orders = normalizeOrders(s.orders, merged);

    // 长期订单
    const lo = s.longOrder;
    if (lo && (lo.kind === 'crop' || lo.kind === 'fish') && (lo.kind === 'fish' || CROPS[lo.crop])) {
      merged.longOrder = {
        id: String(lo.id || 'L' + merged.day),
        kind: lo.kind,
        crop: lo.kind === 'crop' ? lo.crop : null,
        name: lo.kind === 'crop' ? CROPS[lo.crop].name : '任意鱼',
        emoji: lo.kind === 'crop' ? CROPS[lo.crop].emoji : '🐟',
        qty: Math.round(num(lo.qty, 10, 1, 999)),
        reward: Math.round(num(lo.reward, 20, 1, 999999)),
        deadline: Math.round(num(lo.deadline, merged.day + 5, 1, 100000)),
        done: false
      };
    } else {
      merged.longOrder = null;
    }
    // 老存档没有长期订单：读档时补一张
    if (!merged.longOrder) merged.longOrder = makeLongOrder(merged);
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
    merged.fishBag = Array.isArray(s.fishBag) ? s.fishBag.slice(0, 5000).map(function (e) {
      if (!e || typeof e !== 'object') return null;
      const out = Object.assign({}, e);
      // v2.2 之前的「宝箱」不分级，统一当木制宝箱
      if (out.name === '宝箱') {
        out.name = '木制宝箱'; out.emoji = '🪵'; out.v = CHESTS.wood.value;
        out.q = null; out.no = true; out.chest = 'wood';
      }
      if (out.trash) out.q = null;
      if (out.chest && !CHESTS[out.chest]) delete out.chest;
      return out;
    }).filter(Boolean) : [];
    // 市场：只保留认识的作物，销量限个范围
    merged.market = {};
    const rawMarket = s.market && typeof s.market === 'object' ? s.market : {};
    Object.keys(rawMarket).forEach(function (id) {
      if (!CROPS[id]) return;
      const sold = num(rawMarket[id] && rawMarket[id].sold, 0, 0, 9999);
      if (sold > 0) merged.market[id] = { sold: Math.round(sold * 10) / 10 };
    });
    merged.marketF = {};
    const rawMarketF = s.marketF && typeof s.marketF === 'object' ? s.marketF : {};
    Object.keys(rawMarketF).forEach(function (name) {
      const sold = num(rawMarketF[name] && rawMarketF[name].sold, 0, 0, 9999);
      if (sold > 0 && String(name).length <= 12) merged.marketF[name] = { sold: Math.round(sold * 10) / 10 };
    });
    merged.ferts = Object.assign({ normal: 0, special: 0 }, s.ferts || {});
    merged.ferts.normal = Math.round(num(merged.ferts.normal, 0, 0, 999));
    merged.ferts.special = Math.round(num(merged.ferts.special, 0, 0, 999));
    merged.sprinklers = Math.round(num(s.sprinklers, 0, 0, 40));
    merged.harvester = !!s.harvester;
    merged.harvesterOn = s.harvesterOn !== false;
    merged.seeder = Math.round(num(s.seeder === true ? 1 : s.seeder, 0, 0, BALANCE.device.seederMax));
    merged.seederOn = s.seederOn !== false;
    merged.autoSeed = (s.autoSeed && CROPS[s.autoSeed] && !CROPS[s.autoSeed].wild) ? s.autoSeed : null;
    merged.nets = Math.round(num(s.nets, 0, 0, NET_MAX));
    // 老存档没有 netSet：默认所有渔网都已布置好
    merged.netSet = Math.round(num(s.netSet == null ? merged.nets : s.netSet, merged.nets, 0, merged.nets));
    merged.townDonated = Math.round(num(s.townDonated, 0, 0, 1e9));
    // 价格历史：只保留 30 天 / 合法条目；老存档没有就从今天开始记
    merged.marketHist = {};
    const rawHist = s.marketHist && typeof s.marketHist === 'object' ? s.marketHist : {};
    Object.keys(rawHist).forEach(function (k) {
      if (String(k).length > 24) return;
      const arr = rawHist[k];
      if (!Array.isArray(arr)) return;
      const out = [];
      arr.slice(-HIST_DAYS).forEach(function (p) {
        if (!p || typeof p !== 'object') return;
        out.push({ d: Math.round(num(p.d, 1, 1, 1e6)), m: Math.round(num(p.m, 1, 0.1, 10) * 100) / 100 });
      });
      if (out.length) merged.marketHist[k] = out;
    });
    if (!Object.keys(merged.marketHist).length) snapshotMarket(merged);
    // 渔夫：老存档是 true（没有等级），补成 Lv1
    merged.fisher = s.fisher
      ? { lv: Math.round(num(s.fisher.lv, 1, 1, BALANCE.fisher.max)),
          xp: Math.round(num(s.fisher.xp, 0, 0, 9999)) }
      : null;
    if (merged.fisher && merged.fisher.lv >= BALANCE.fisher.max) merged.fisher.xp = 0;
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
    merged.manualRefreshUsed = !!s.manualRefreshUsed;
    merged.workUsed = !!s.workUsed;

    // 成就：只保留仍然存在的成就 id
    merged.ach = {};
    if (s.ach && typeof s.ach === 'object') {
      ACH.forEach(function (a) {
        const d = s.ach[a.id];
        if (d) merged.ach[a.id] = Math.round(num(d, 1, 1, 100000));
      });
    }

    // 水产店：老存档没有进货记录，按当天重新进一次货
    const rawShop = s.shop && typeof s.shop === 'object' ? s.shop : null;
    if (rawShop && rawShop.stock && typeof rawShop.stock === 'object') {
      merged.shop = { day: merged.day, stock: {} };
      FISH.forEach(function (f) {
        if (f.trash || f.noOrder) return;
        const r = SHOP_STOCK[f.id] || [1, 2];
        merged.shop.stock[f.id] = Math.round(num(rawShop.stock[f.id], 0, 0, r[1]));
      });
    } else {
      merged.shop = makeShop(merged.day);
    }

    // 农产品店：同样按当天补一次货
    const rawCropShop = s.cropShop && typeof s.cropShop === 'object' ? s.cropShop : null;
    if (rawCropShop && rawCropShop.stock && typeof rawCropShop.stock === 'object') {
      merged.cropShop = { day: merged.day, stock: {} };
      CROP_LIST.forEach(function (c) {
        merged.cropShop.stock[c.id] = Math.round(num(rawCropShop.stock[c.id], 0, 0, cropStockCap(c)));
      });
    } else {
      merged.cropShop = makeCropShop(merged.day);
    }

    // 等级：老存档按已有收获 / 钓鱼 / 采集 / 挖蚯蚓次数补等级（新存档从 1 级开始）
    const rawLv = s.levels && typeof s.levels === 'object' ? s.levels : null;
    merged.levels = {
      farm: Math.round(num(rawLv && rawLv.farm, 1, 1, BALANCE.level.max)),
      fish: Math.round(num(rawLv && rawLv.fish, 1, 1, BALANCE.level.max)),
      dig: Math.round(num(rawLv && rawLv.dig, 1, 1, BALANCE.level.max)),
      forage: Math.round(num(rawLv && rawLv.forage, 1, 1, BALANCE.level.max)),
      farmXp: Math.round(num(rawLv && rawLv.farmXp, 0, 0, 999999)),
      fishXp: Math.round(num(rawLv && rawLv.fishXp, 0, 0, 999999)),
      digXp: Math.round(num(rawLv && rawLv.digXp, 0, 0, 999999)),
      forageXp: Math.round(num(rawLv && rawLv.forageXp, 0, 0, 999999))
    };
    if (!rawLv || (merged.levels.farm === 1 && merged.levels.farmXp === 0 &&
                   merged.levels.fish === 1 && merged.levels.fishXp === 0 &&
                   (merged.stats.harvests || 0) + (merged.stats.casts || 0) > 0)) {
      [['farm', merged.stats.harvests || 0], ['fish', merged.stats.casts || 0],
       ['dig', (merged.stats.dug || 0) * BALANCE.dig.xp],
       ['forage', (merged.stats.forages || 0) * BALANCE.forage.xp]].forEach(function (pair) {
        const key = pair[0];
        merged.levels[key + 'Xp'] = Math.min(1e6, pair[1]);
        while (merged.levels[key] < BALANCE.level.max &&
               merged.levels[key + 'Xp'] >= levelNeed(merged.levels[key])) {
          merged.levels[key + 'Xp'] -= levelNeed(merged.levels[key]);
          merged.levels[key]++;
        }
        if (merged.levels[key] >= BALANCE.level.max) {
          merged.levels[key + 'Xp'] = Math.min(merged.levels[key + 'Xp'], levelNeed(BALANCE.level.max) - 1);
        }
      });
    }
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
    BALANCE: BALANCE, CROPS: CROPS, CROP_LIST: CROP_LIST, WILD_LIST: WILD_LIST,
    FERT: FERT, QUALITY: QUALITY, FISH: FISH,
    WEATHER: WEATHER, WEATHER_LIST: WEATHER_LIST, BAIT: BAIT, SAVE_VERSION: SAVE_VERSION,
    setRng: setRng, seasonOf: seasonOf, SEASONS: SEASONS,
    seasonIdx: seasonIdx, isWinter: isWinter, cropSeasonOk: cropSeasonOk, seasonText: seasonText,
    waterCost: waterCost, seasonWeatherTable: seasonWeatherTable, SEASON_WEATHER: SEASON_WEATHER,
    marketInfo: marketInfo, marketMul: marketMul, addSupply: addSupply,
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
    fishMarketInfo: fishMarketInfo, fishMarketMul: fishMarketMul, addFishSupply: addFishSupply, takeFishN: takeFishN,
    fishSeasonOk: fishSeasonOk, fishSeasonText: fishSeasonText, FISH_OFF_SEASON: FISH_OFF_SEASON,
    sellWorms: sellWorms, WORM_VALUE: WORM_VALUE,
    qualityById: qualityById,
    buySeed: buySeed, seedBuyPrice: seedBuyPrice, seedSellPrice: seedSellPrice,
    SEED_SELL_RATE: SEED_SELL_RATE,
    useFert: useFert, buyFertItem: buyFertItem, sellFert: sellFert, fertSellPrice: fertSellPrice,
    FERT_SELL_RATE: FERT_SELL_RATE, buySprinkler: buySprinkler, SPRINKLER_COST: SPRINKLER_COST,
    buyHarvester: buyHarvester, HARVESTER_COST: HARVESTER_COST, refreshOrders: refreshOrders,
    seederUnlocked: seederUnlocked, buySeeder: buySeeder, toggleSeeder: toggleSeeder,
    setAutoSeed: setAutoSeed, SEEDER_COST: SEEDER_COST, seederCount: seederCount,
    seederMax: seederMax, seederPlots: seederPlots, seederUpkeep: seederUpkeep,
    seederPlateRange: seederPlateRange, seederPlateOf: seederPlateOf, canAutoSeed: canAutoSeed,
    SEEDER_PLOTS: SEEDER_PLOTS,
    toggleHarvester: toggleHarvester, buyNet: buyNet, netCatch: netCatch,
    resetNets: resetNets, netSetCount: netSetCount, netPending: netPending, netResetCost: netResetCost,
    hireFisher: hireFisher, fireFisher: fireFisher,
    fisherUnlocked: fisherUnlocked, fisherCatch: fisherCatch, fisherLv: fisherLv,
    fisherCasts: fisherCasts, fisherWage: fisherWage, fisherNeed: fisherNeed,
    fisherUpCost: fisherUpCost, fisherUp: fisherUp, fisherHookBonus: fisherHookBonus,
    fisherGoodBonus: fisherGoodBonus,
    seedOffSeason: seedOffSeason, marketTag: marketTag, fishByName: fishByName, fishById: fishById,
    NET_COST: NET_COST, NET_MAX: NET_MAX, NET_CHANCE: NET_CHANCE, plotUpkeep: plotUpkeep,
    storeTotal: storeTotal, taxDue: taxDue, buyFish: buyFish, fishBuyPrice: fishBuyPrice, deviceUpkeep: deviceUpkeep, HOOK: HOOK,
    fishDesc: fishDesc, shopStock: shopStock, rollShopStock: rollShopStock, makeShop: makeShop, SHOP_STOCK: SHOP_STOCK,
    shopValue: shopValue, shopSellValue: shopSellValue, sellCropN: sellCropN, takeStoreN: takeStoreN,
    boxCount: boxCount, boxValue: boxValue, boxPutCrop: boxPutCrop, boxPutFish: boxPutFish, boxTake: boxTake,
    boxTakeEntry: boxTakeEntry, sellFishGroupN: sellFishGroupN, shipBox: shipBox,
    cropBuyPrice: cropBuyPrice, cropShopStock: cropShopStock, buyCrop: buyCrop, makeCropShop: makeCropShop,
    rollCropStock: rollCropStock, cropStockCap: cropStockCap, FISH_UNLOCK: FISH_UNLOCK, CROP_UNLOCK: CROP_UNLOCK,
    seedUnlocked: seedUnlocked, fertUnlocked: fertUnlocked,    sprinklerUnlocked: sprinklerUnlocked, harvesterUnlocked: harvesterUnlocked,
    netUnlocked: netUnlocked, netMax: netMax, farmLv: farmLv, fishLv: fishLv,
    digLv: digLv, forageLv: forageLv, skillLv: skillLv, digCost: digCost, forageCost: forageCost,
    SKILLS: SKILLS, SKILL_NAME: SKILL_NAME,
    levelNeed: levelNeed, addLevelXp: addLevelXp, levelEffectText: levelEffectText,
    farmYieldBonus: farmYieldBonus, fishHookBonus: fishHookBonus, fishGoodBonus: fishGoodBonus,
    taxBase: taxBase, taxInDays: taxInDays, orderWeight: orderWeight, ORDER_TIERS: ORDER_TIERS,
    ACH: ACH, ACH_CATS: ACH_CATS, checkAchievements: checkAchievements, achInfo: achInfo, rewardText: rewardText,
    achPts: achPts, sellBonus: sellBonus, makeLongOrder: makeLongOrder, deliverLong: deliverLong,
    fertilizeAll: fertilizeAll, canFert: canFert, fertTargets: fertTargets, sleep: sleep, fish: fish,
    fishMany: fishMany, fishAll: fishAll, digWorms: digWorms, buyBait: buyBait, tea: tea, work: work, workAuto: workAuto,
    forage: forage, foragePool: foragePool, forageSeedPool: forageSeedPool,
    donate: donate, townTier: townTier, townBonus: townBonus, townNext: townNext,
    marketHeadroom: marketHeadroom, fishMarketHeadroom: fishMarketHeadroom,
    snapshotMarket: snapshotMarket, marketSeries: marketSeries, pushMarketHist: pushMarketHist,
    cropNextSeasonMul: cropNextSeasonMul, fishNextSeasonMul: fishNextSeasonMul,
    nextSeasonIdx: nextSeasonIdx, HIST_DAYS: HIST_DAYS,
    expand: expand, upgrade: upgrade, rollWeather: rollWeather,
    TEAS: TEAS, TEA_LIST: TEA_LIST, teaList: teaList, teaStock: teaStock, teaById: teaById,
    teaUnlocked: teaUnlocked, buyTea: buyTea,
    KEYS: KEYS, CHESTS: CHESTS, keyUnlocked: keyUnlocked, buyKey: buyKey,
    sellJunk: sellJunk, openChest: openChest, fishIsJunk: fishIsJunk
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.FarmGame = API;
})(typeof window !== 'undefined' ? window : globalThis);

