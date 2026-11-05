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

  /* 账本按类别汇总：给状态页的「近 30 天收益构成」用。
   * 账本 label 是自由文本，这里按前缀归类；认不出的条目不进任何一类。 */
  const LEDGER_CATS = [
    { id: 'crop',   name: '🌾 卖作物',      kind: 'in',  test: /^农产品店/ },
    { id: 'box',    name: '📦 收购箱',      kind: 'in',  test: /^收购箱/ },
    { id: 'order',  name: '📋 委托',        kind: 'in',  test: /^(委托|长期订单)/ },
    { id: 'fish',   name: '🎣 卖鱼',        kind: 'in',  test: /^卖鱼/ },
    { id: 'dig',    name: '🪱 挖蚯蚓',      kind: 'in',  test: /^卖蚯蚓/ },
    { id: 'junk',   name: '🎁 开箱 / 回收', kind: 'in',  test: /^(回收|开.*宝箱|卖种子|卖肥料)/ },
    { id: 'work',   name: '🕐 打零工',      kind: 'in',  test: /零工/ },
    { id: 'reward', name: '🏆 奖励',        kind: 'in',  test: /奖励/ },
    { id: 'food',   name: '🍖 伙食',        kind: 'out', test: /^伙食/ },
    { id: 'upkeep', name: '🧾 维护 / 税',   kind: 'out', test: /^(维护|月度税金)/ },
    { id: 'buy',    name: '🛒 采购',        kind: 'out', test: /^买/ },
    { id: 'build',  name: '🏗️ 建设 / 升级', kind: 'out', test: /^(开垦|体力上限|雇佣|渔夫升)/ },
    { id: 'wage',   name: '🧑‍🌾 渔夫工资',  kind: 'out', test: /^渔夫工资/ },
    { id: 'donate', name: '🏘️ 捐赠',        kind: 'out', test: /^捐赠/ }
  ];

  function ledgerByCategory(s, days) {
    const span = days || 30;
    const from = Math.max(1, (s.day || 1) - span + 1);
    const map = {};
    LEDGER_CATS.forEach(function (c) {
      map[c.id] = { id: c.id, name: c.name, kind: c.kind, total: 0, n: 0 };
    });
    (s.ledger || []).forEach(function (r) {
      if ((r.day || 0) < from) return;
      const v = (r.income || 0) - (r.expense || 0);
      if (!v) return;
      const label = String(r.label || '');
      const cat = LEDGER_CATS.filter(function (c) { return c.test.test(label); })[0];
      if (!cat) return;
      map[cat.id].total += v;
      map[cat.id].n++;
    });
    const list = Object.keys(map).map(function (k) { return map[k]; })
      .filter(function (c) { return c.n > 0; })
      .sort(function (a, b) { return Math.abs(b.total) - Math.abs(a.total); });
    return {
      days: span,
      list: list,
      income: list.reduce(function (n, c) { return n + Math.max(0, c.total); }, 0),
      expense: list.reduce(function (n, c) { return n + Math.max(0, -c.total); }, 0)
    };
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

  /* 存档是唯一的外部输入：日志 / 账本 / 鱼名这些自由文本最终会拼进 innerHTML，
   * 导入时就把能组成标签或属性的字符去掉。正常游戏文本不含这些字符，显示不受影响。 */
  function plain(v, max) {
    return String(v == null ? '' : v).replace(/[<>&"']/g, '').slice(0, max || 40);
  }

  /* 品质只认 QUALITY 里的对象，防止存档塞进来的假品质被当成颜色 / 文本直接使用 */
  function safeQuality(q) {
    if (!q || typeof q !== 'object' || !q.id) return null;
    return qualityById(q.id) || null;
  }

  /* 钓鱼记录本的「最高品质 / 最贵一条」：只保留展示字段并清洗 */
  function safeBookTop(v, day) {
    if (!v || typeof v !== 'object') return null;
    const out = Object.assign({}, v);
    out.fish = plain(out.fish, 20);
    out.quality = safeQuality(out.quality);
    out.price = Math.round(num(out.price, 0, 0, 1e9));
    out.day = Math.round(num(out.day, day, 1, 100000));
    return out.fish ? out : null;
  }

  function deserialize(json) {
    const s = typeof json === 'string' ? JSON.parse(json) : json;
    if (!s || typeof s !== 'object') throw new Error('bad save');
    // 版本门禁：来自更新版本的存档，旧代码不该假装能读懂（否则会静默改坏数据）
    if (s.v && s.v > SAVE_VERSION) {
      const err = new Error('存档来自更新的版本（v' + s.v + '）');
      err.code = 'FUTURE_SAVE';
      throw err;
    }
    const base = createState();
    const merged = Object.assign(base, s);
    merged.v = SAVE_VERSION;

    // 数值清洗：导入的存档不能带 NaN / 负数 / 离谱的地块数
    merged.maxEnergy = Math.round(num(s.maxEnergy, 10, 5, 100) / 5) * 5;
    merged.day = Math.round(num(s.day, 1, 1, 100000));
    merged.longOrderReadyDay = Math.round(num(s.longOrderReadyDay, 0, 0, 100000));
    merged.coins = Math.round(num(s.coins, 50, 0, 1e9));
    merged.energy = num(s.energy, merged.maxEnergy, 0, merged.maxEnergy);

    const plots = Array.isArray(s.plots) ? s.plots.slice(0, BALANCE.expand.max) : [];
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

    merged.bait = Object.assign({ worm: 0, dough: 0, premium: 0 }, s.bait || {});
    merged.bait.worm = Math.round(num(merged.bait.worm, 0, 0, 9999));
    merged.bait.dough = Math.round(num(merged.bait.dough, 0, 0, 9999));
    merged.bait.premium = Math.round(num(merged.bait.premium, 0, 0, 9999));
    merged.lure = Object.assign({ owned: false, dur: 0 }, s.lure || {});
    merged.lure.dur = Math.round(num(merged.lure.dur, 0, 0, BALANCE.lure.dur));
    merged.lure.owned = !!merged.lure.owned && merged.lure.dur > 0;
    merged.lure2 = Object.assign({ owned: false, dur: 0 }, s.lure2 || {});
    merged.lure2.dur = Math.round(num(merged.lure2.dur, 0, 0, BALANCE.lure2.dur));
    merged.lure2.owned = !!merged.lure2.owned && merged.lure2.dur > 0;
    merged.fishBook = Object.assign({ count: 0, entries: [], best: null, priciest: null }, s.fishBook || {});
    const bookEntries = Array.isArray(merged.fishBook.entries) ? merged.fishBook.entries : [];
    merged.fishBook.entries = bookEntries.slice(0, 200).filter(function (e) {
      return e && typeof e === 'object';
    }).map(function (e) {
      const out = Object.assign({}, e);
      out.day = Math.round(num(e.day, merged.day, 1, 100000));
      out.fish = plain(e.fish, 20);
      out.emoji = plain(e.emoji, 4);
      out.quality = safeQuality(e.quality);
      out.price = Math.round(num(e.price, 0, 0, 1e9));
      out.base = Math.round(num(e.base, 0, 0, 1e9));
      out.bait = plain(e.bait, 12) || undefined;
      out.trash = !!e.trash;
      out.chest = CHESTS[e.chest] ? e.chest : null;
      out.noOrder = !!e.noOrder;
      return out;
    }).filter(function (e) { return e.fish; });
    merged.fishBook.count = Math.round(num(merged.fishBook.count, 0, 0, 1e9));
    merged.fishBook.best = safeBookTop(merged.fishBook.best, merged.day);
    merged.fishBook.priciest = safeBookTop(merged.fishBook.priciest, merged.day);
    merged.stats = Object.assign({ harvests: 0, casts: 0, dug: 0, planted: 0, orders: 0, cropsSold: 0, works: 0, longOrders: 0, boxItems: 0, boxIncome: 0, teas: 0, chests: 0, forages: 0, cooks: 0, meals: 0, incomeTotal: 0, expenseTotal: 0, wild: {}, forageBest: 0, orchardFruit: 0, orchardPlanted: 0, fruitSold: 0 }, s.stats || {});
    // 老存档没有累计收支：用现有账本（最多 200 笔）估算，之后由 addCoins 继续累加
    if (s.stats == null || s.stats.incomeTotal == null) {
      merged.stats.incomeTotal = (s.ledger || []).reduce(function (n, r) { return n + (r.income || 0); }, 0);
      merged.stats.expenseTotal = (s.ledger || []).reduce(function (n, r) { return n + (r.expense || 0); }, 0);
    }
    merged.stats.incomeTotal = Math.round(num(merged.stats.incomeTotal, 0, 0, 1e12));
    merged.stats.expenseTotal = Math.round(num(merged.stats.expenseTotal, 0, 0, 1e12));
    merged.stats.wild = Object.assign({}, (s.stats && s.stats.wild) || {});
    Object.keys(merged.stats.wild).forEach(function (id) {
      if (!CROPS[id] || !CROPS[id].wild) { delete merged.stats.wild[id]; return; }
      merged.stats.wild[id] = Math.round(num(merged.stats.wild[id], 0, 0, 999999));
    });
    merged.stats.forages = Math.round(num(merged.stats.forages, 0, 0, 999999));
    merged.stats.forageBest = Math.round(num(merged.stats.forageBest, 0, 0, 3));
    merged.stats.dug = Math.round(num(merged.stats.dug, 0, 0, 999999));
    merged.stats.orchardFruit = Math.round(num(merged.stats.orchardFruit, 0, 0, 9999999));
    merged.stats.orchardPlanted = Math.round(num(merged.stats.orchardPlanted, 0, 0, 999));
    merged.stats.fruitSold = Math.round(num(merged.stats.fruitSold, 0, 0, 9999999));
    merged.teas = Object.assign({ green: 0, black: 0, milk: 0, coffee: 0 }, s.teas || {});    Object.keys(merged.teas).forEach(function (id) {
      if (!TEAS[id]) { delete merged.teas[id]; return; }
      merged.teas[id] = Math.round(num(merged.teas[id], 0, 0, 999));
    });
    merged.orchard = Object.assign({ unlocked: false }, s.orchard || {});
    merged.orchard.unlocked = !!merged.orchard.unlocked;
    const treeSlots = Array.isArray(merged.orchard.slots) ? merged.orchard.slots : [];
    const slotCount = merged.orchard.unlocked
      ? Math.max(BALANCE.orchard.free,
          Math.min(BALANCE.orchard.slots, treeSlots.length || BALANCE.orchard.free))
      : 0;
    merged.orchard.slots = Array.from({ length: slotCount }).map(function (_, i) {
      const t = treeSlots[i];
      if (!t || !TREES[t.id]) return null;
      const mode = t.mode === 'sapling' ? 'sapling' : 'seed';
      const need = BALANCE.orchard.grow[mode];
      const water = Math.min(need.water, Math.round(num(t.water, 0, 0, 9999)));
      /* v2.20 的老存档只有 grown，这里换算成新的成长进度 */
      const planted = t.planted != null
        ? Math.round(num(t.planted, 1, 1, 100000))
        : Math.max(1, merged.day - Math.round(num(t.grown, 0, 0, need.days)));
      return {
        id: t.id, mode: mode, planted: planted,
        water: t.water != null ? water : Math.min(need.water, Math.round(num(t.grown, 0, 0, need.water))),
        lastWater: Math.round(num(t.lastWater, 0, 0, 100000)),
        ripe: Math.round(num(t.ripe, 0, 0, BALANCE.orchard.ripeCap)),
        lv: Math.round(num(t.lv, 1, 1, BALANCE.orchard.treeLvMax)),
        xp: Math.round(num(t.xp, 0, 0, 999))
      };
    });
    merged.treeStock = {};
    TREE_LIST.forEach(function (t) {
      const row = (s.treeStock && s.treeStock[t.id]) || {};
      merged.treeStock[t.id] = {
        seed: Math.round(num(row.seed, 0, 0, 999)),
        sapling: Math.round(num(row.sapling, 0, 0, 999))
      };
    });
    merged.keys = Object.assign({ iron: 0, gold: 0 }, s.keys || {});
    Object.keys(merged.keys).forEach(function (id) {
      if (!KEYS[id]) { delete merged.keys[id]; return; }
      merged.keys[id] = Math.round(num(merged.keys[id], 0, 0, 99));
    });
    merged.box = Array.isArray(s.box) ? s.box.slice(0, 500).filter(function (e) {
      return e && (e.kind === 'crop' || e.kind === 'fish' || e.kind === 'food') && e.name;
    }).map(function (e) {
      // v2.29 起收购箱只记「原价 raw」，结算时才按当日市价算；老存档的 v 直接当 raw
      const raw = Math.round(num(e.raw != null ? e.raw : e.v, 0, 0, 1e9));
      const out = { kind: e.kind, name: plain(e.name, 20), emoji: plain(e.emoji, 4),
                    n: Math.round(num(e.n, 1, 1, 9999)), raw: raw,
                    sold: Math.round(num(e.sold, 0, 0, 1e6)) };
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
      if (e.kind === 'food') {
        if (Q_IDS.indexOf(e.q) >= 0) out.q = e.q;
        out.energy = Math.round(num(e.energy, 0, 0, 999));
        out.rid = e.rid === 'fail' ? 'fail' : String(e.rid || 'food');
        out.expire = Math.round(num(e.expire, merged.day, 1, 100000));
      }
      return out;
    }) : [];
    /* 厨房：熟食（过期的不留） + 今天有没有吃午饭 */
    merged.food = Array.isArray(s.food) ? s.food.slice(0, 200).filter(function (f) {
      return f && (f.rid === 'fail' ? true : (recipeById(f.rid === 'smokedfish' ? 'steamedfish' : f.rid) &&
        Q_IDS.indexOf(f.q) >= 0));
    }).map(function (f) {
      const rid = f.rid === 'smokedfish' ? 'steamedfish' : f.rid;
      const r = f.rid === 'fail' ? null : recipeById(rid);
      return {
        rid: rid,
        name: plain(f.name || (r && r.name), 20),
        emoji: plain(f.emoji || (r && r.emoji), 4),
        q: f.rid === 'fail' ? null : f.q,
        energy: Math.round(num(f.energy, 0, 0, 999)),
        price: Math.round(num(f.price, 1, 0, 99999)),
        day: Math.round(num(f.day, merged.day, 1, 100000)),
        expire: Math.round(num(f.expire, merged.day + 1, 1, 100000)),
        n: Math.round(num(f.n, 1, 1, 999))
      };
    }).filter(function (f) { return f.expire >= merged.day; }) : [];
    merged.lunchDay = Math.round(num(s.lunchDay, 0, 0, 100000));
    merged.cookedDay = Math.round(num(s.cookedDay, 0, 0, 100000));
    merged.cookedToday = Math.round(num(s.cookedToday, 0, 0, 999));
    /* 学会的食谱：只保留认识、且确实需要解锁的那些 */
    merged.recipes = {};
    Object.keys(s.recipes && typeof s.recipes === 'object' ? s.recipes : {}).forEach(function (id) {
      const rid = id === 'smokedfish' ? 'steamedfish' : id;
      const r = recipeById(rid);
      if (r && r.source) merged.recipes[rid] = true;
    });
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
        mul: lo.kind === 'crop' && lo.mul != null ? num(lo.mul, 1, 0.5, 3) : 0,
        offSeason: !!lo.offSeason,
        deadline: Math.round(num(lo.deadline, merged.day + 5, 1, 100000)),
        done: false
      };
      merged.longOrderReadyDay = 0;
    } else {
      merged.longOrder = null;
    }
    // 老存档没有长期订单时补一张；新存档的隔日等待标记则保留。
    if (!merged.longOrder && (!merged.longOrderReadyDay || merged.longOrderReadyDay <= merged.day)) {
      merged.longOrder = makeLongOrder(merged);
      merged.longOrderReadyDay = 0;
    }
    // 种子只认认识的作物：存档里塞进来的杂键会让仓库的种子行直接崩
    merged.seeds = {};
    const rawSeeds = s.seeds && typeof s.seeds === 'object' ? s.seeds : {};
    Object.keys(rawSeeds).forEach(function (id) {
      if (!CROPS[id]) return;
      const n = Math.round(num(rawSeeds[id], 0, 0, 9999));
      if (n > 0) merged.seeds[id] = n;
    });
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
      // 鱼名 / 杂物名 / emoji 会拼进 innerHTML，先洗掉能组成标签的字符
      out.name = plain(out.name, 20);
      out.emoji = plain(out.emoji, 4);
      out.v = Math.round(num(out.v, 0, 0, 1e9));
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
    // 每台播种器各选各的种子；老存档只有单个 autoSeed，就复制给全部机器
    merged.autoSeeds = [];
    const rawAuto = Array.isArray(s.autoSeeds) ? s.autoSeeds : [];
    const legacyAuto = (s.autoSeed && CROPS[s.autoSeed] && !CROPS[s.autoSeed].wild) ? s.autoSeed : null;
    for (let i = 0; i < merged.seeder; i++) {
      const id = rawAuto[i] || legacyAuto;
      merged.autoSeeds.push((id && CROPS[id] && !CROPS[id].wild) ? id : null);
    }
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
      crops: (s.codex && s.codex.crops && typeof s.codex.crops === 'object') ? s.codex.crops : {},
      food: (s.codex && s.codex.food && typeof s.codex.food === 'object') ? s.codex.food : {}
    };
    Object.keys(merged.codex.food).forEach(function (k) {
      const id = k === 'smokedfish' ? 'steamedfish' : k;
      if (!recipeById(id)) { delete merged.codex.food[k]; return; }
      const c = merged.codex.food[k] || {};
      if (id !== k) delete merged.codex.food[k];
      merged.codex.food[id] = { n: c.n || 0, best: c.best || null, first: c.first || null, value: c.value || 0 };
    });
    Object.keys(merged.codex.fish).forEach(function (k) {
      const c = merged.codex.fish[k] || {};
      merged.codex.fish[k] = { n: c.n || 0, best: c.best || null, first: c.first || null,
                               perfect: c.perfect || 0, value: c.value || 0 };
    });
    Object.keys(merged.codex.crops).forEach(function (k) {
      const c = merged.codex.crops[k] || {};
      merged.codex.crops[k] = { n: c.n || 0, best: c.best || null, first: c.first || null, value: c.value || 0 };
    });
    // 图鉴奖励：只保留表里存在的档位 id（老存档没有这一项，首次检查时会补发）
    merged.codexClaim = {};
    const claimable = {};
    ['fish', 'crops'].forEach(function (kind) {
      (BALANCE.codex[kind] || []).forEach(function (m) { claimable[m.id] = 1; });
    });
    Object.keys(s.codexClaim || {}).forEach(function (id) {
      if (claimable[id]) merged.codexClaim[id] = Math.round(num(s.codexClaim[id], 1, 1, 100000));
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
      trade: Math.round(num(rawLv && rawLv.trade, 1, 1, BALANCE.level.max)),
      cook: Math.round(num(rawLv && rawLv.cook, 1, 1, BALANCE.level.max)),
      farmXp: Math.round(num(rawLv && rawLv.farmXp, 0, 0, 999999)),
      fishXp: Math.round(num(rawLv && rawLv.fishXp, 0, 0, 999999)),
      digXp: Math.round(num(rawLv && rawLv.digXp, 0, 0, 999999)),
      forageXp: Math.round(num(rawLv && rawLv.forageXp, 0, 0, 999999)),
      tradeXp: Math.round(num(rawLv && rawLv.tradeXp, 0, 0, 999999)),
      cookXp: Math.round(num(rawLv && rawLv.cookXp, 0, 0, 999999))
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
    // 账本 / 日志：导入的文本会直接拼进 innerHTML，数量和文本都要过一遍
    const rawLedger = Array.isArray(s.ledger) ? s.ledger : base.ledger;
    merged.ledger = rawLedger.slice(0, 200).filter(function (r) {
      return r && typeof r === 'object';
    }).map(function (r) {
      return {
        day: Math.round(num(r.day, merged.day, 1, 100000)),
        label: plain(r.label, 60),
        income: Math.round(num(r.income, 0, 0, 1e9)),
        expense: Math.round(num(r.expense, 0, 0, 1e9)),
        balance: Math.round(num(r.balance, 0, 0, 1e12))
      };
    });
    const rawLog = Array.isArray(s.log) ? s.log : base.log;
    merged.log = rawLog.slice(0, 400).filter(function (r) {
      return r && typeof r === 'object';
    }).map(function (r) {
      return {
        day: Math.round(num(r.day, merged.day, 1, 100000)),
        text: plain(r.text, 240),
        kind: plain(r.kind, 12) || 'info'
      };
    }).filter(function (r) { return r.text; });
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
    ledgerByDay: ledgerByDay, logByDay: logByDay, ledgerByCategory: ledgerByCategory, LEDGER_CATS: LEDGER_CATS,
    makeOrders: makeOrders, deliverOrder: deliverOrder, orderHave: orderHave, orderPool: orderPool,
    mealFee: mealFee, expandCost: expandCost, upgradeCost: upgradeCost,
    /* 厨房 / 烹饪 */
    cookRecipes: function () { return RECIPES; },
    recipeById: recipeById, ingredientText: ingredientText, cookHave: cookHave,
    recipeKnown: recipeKnown, recipeReqText: recipeReqText, recipeLockText: recipeLockText,
    shopRecipes: shopRecipes, buyRecipe: buyRecipe, grantChestRecipe: grantChestRecipe, chestRecipes: chestRecipes,
    cookMeal: cookMeal, eatFood: eatFood, foodTick: foodTick, boxPutFood: boxPutFood,
    eatFoodGroup: eatFoodGroup, boxPutFoodGroup: boxPutFoodGroup, foodGroups: foodGroups,
    foodDaysLeft: foodDaysLeft, foodSoon: foodSoon, foodEnergyNow: foodEnergyNow, foodPriceNow: foodPriceNow,
    foodFreshMul: foodFreshMul, cookDailyLimit: cookDailyLimit, cookLeft: cookLeft,
    kitchenUnlocked: kitchenUnlocked, cookLv: cookLv, cookFail: cookFail, cookRolls: cookRolls,
    mealFeeDue: mealFeeDue, lunchEaten: lunchEaten, cookFishBag: cookFishBag,
    netWorth: netWorth, profileRank: profileRank, deviceValue: deviceValue, orchardValue: orchardValue,
    addCoins: addCoins, log: log,
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
    autoSeedOf: autoSeedOf,
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
    boxCount: boxCount, boxValue: boxValue, boxEntryNet: boxEntryNet, boxPutCrop: boxPutCrop, boxPutFish: boxPutFish, boxTake: boxTake,
    cropNetEstimate: cropNetEstimate, fishNetEstimate: fishNetEstimate, storeNetEstimate: storeNetEstimate,
    boxTakeEntry: boxTakeEntry, sellFishGroupN: sellFishGroupN, shipBox: shipBox,
    cropBuyPrice: cropBuyPrice, cropShopStock: cropShopStock, buyCrop: buyCrop, makeCropShop: makeCropShop,    rollCropStock: rollCropStock, cropStockCap: cropStockCap, FISH_UNLOCK: FISH_UNLOCK, CROP_UNLOCK: CROP_UNLOCK,
    seedUnlocked: seedUnlocked, fertUnlocked: fertUnlocked,    sprinklerUnlocked: sprinklerUnlocked, harvesterUnlocked: harvesterUnlocked,
    netUnlocked: netUnlocked, netMax: netMax, farmLv: farmLv, fishLv: fishLv,
    digLv: digLv, forageLv: forageLv, skillLv: skillLv, digCost: digCost, forageCost: forageCost,
    digYieldBonus: digYieldBonus, forageRolls: forageRolls,
    tradeLv: tradeLv, tradeCut: tradeCut, tradeXp: tradeXp, keyTradeGate: keyTradeGate,
    SKILLS: SKILLS, SKILL_NAME: SKILL_NAME,
    levelNeed: levelNeed, addLevelXp: addLevelXp, levelEffectText: levelEffectText,
    farmYieldBonus: farmYieldBonus, fishHookBonus: fishHookBonus, fishGoodBonus: fishGoodBonus,
    taxBase: taxBase, taxInDays: taxInDays, orderWeight: orderWeight, ORDER_TIERS: ORDER_TIERS,
    ACH: ACH, ACH_CATS: ACH_CATS, checkAchievements: checkAchievements, achInfo: achInfo, rewardText: rewardText,
    CODEX_TOTAL: CODEX_TOTAL, codexRewards: codexRewards, checkCodexRewards: checkCodexRewards,
    achPts: achPts, sellBonus: sellBonus, makeLongOrder: makeLongOrder, deliverLong: deliverLong,
    fertilizeAll: fertilizeAll, canFert: canFert, fertTargets: fertTargets, sleep: sleep, fish: fish,
    fishForecast: fishForecast, expectedQualityMul: expectedQualityMul,
    fishMany: fishMany, fishAll: fishAll, digWorms: digWorms, buyBait: buyBait, tea: tea, work: work, workAuto: workAuto,
    forage: forage, foragePool: foragePool, forageSeedPool: forageSeedPool,
    donate: donate, townTier: townTier, townBonus: townBonus, townNext: townNext,
    TREES: TREES, TREE_LIST: TREE_LIST, FRUIT_LIST: FRUIT_LIST,
     orchardSlots: orchardSlots, orchardFree: orchardFree, orchardUnlocked: orchardUnlocked,
    orchardUnlock: orchardUnlock, orchardSlotCount: orchardSlotCount,
    orchardExpandCost: orchardExpandCost, expandOrchard: expandOrchard,
    treeData: treeData, treeBuyPrice: treeBuyPrice, treeStockCount: treeStockCount,
    buyTreeStock: buyTreeStock, treeSlot: treeSlot, treeStage: treeStage, treeInSeason: treeInSeason,
     treeNeed: treeNeed, treeAge: treeAge, treeMature: treeMature, treeNeedsWater: treeNeedsWater, treeProgress: treeProgress,
     treeLevel: treeLevel, treeXpNeed: treeXpNeed, treeYieldBonus: treeYieldBonus, treeLevelText: treeLevelText,
     plantTree: plantTree, waterTree: waterTree, waterOrchard: waterOrchard, orchardTick: orchardTick,
    harvestTree: harvestTree, harvestOrchard: harvestOrchard, orchardSummary: orchardSummary,
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
