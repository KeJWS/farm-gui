/* 存档状态：createState 与通用工具（log / ledger / addCoins） */
  /* ---------------- 状态 ---------------- */

  const SAVE_VERSION = 2;

  function makePlot() {
    return { crop: null, growth: 0, watered: false, missed: 0, fert: 0,
             ripeDay: null, hits: 0, phase: 'idle', planted: 0, auto: 0 };
  }

  /* 水产店每日进货：每种鱼随机一个库存量；高级水产要等中后期 */
  function rollShopStock(day) {
    const d = day || 1;
    const stock = {};
    FISH.forEach(function (f) {
      if (f.trash || f.noOrder) return;
      if (d < (FISH_UNLOCK[f.id] || 1)) { stock[f.id] = 0; return; }
      const r = SHOP_STOCK[f.id] || [1, 2];
      stock[f.id] = randInt(r[0], r[1]);
    });
    return stock;
  }

  function makeShop(day) {
    return { day: day || 1, stock: rollShopStock(day || 1) };
  }

  /* 农产品店每日进货：便宜菜进得多，贵菜不一定有；南瓜/西瓜中后期才有 */
  function cropStockCap(c) {
    return c.price >= 40 ? 3 : (c.price >= 16 ? 4 : 7);
  }

  function rollCropStock(day) {
    const d = day || 1;
    const stock = {};
    CROP_LIST.forEach(function (c) {
      if (d < (CROP_UNLOCK[c.id] || 1)) { stock[c.id] = 0; return; }
      const cap = cropStockCap(c);
      const low = c.price >= 40 ? 1 : (c.price >= 16 ? 2 : 3);
      stock[c.id] = randInt(low, cap);
    });
    return stock;
  }
  function makeCropShop(day) {
    return { day: day || 1, stock: rollCropStock(day || 1) };
  }

  function createState() {
    const s = {
      v: SAVE_VERSION,
      day: 1,
      weather: 'sunny',
      coins: BALANCE.start.coins,
      energy: BALANCE.start.energy,
      maxEnergy: BALANCE.start.maxEnergy,
      plots: Array.from({ length: BALANCE.start.plots }, makePlot),
      seeds: {},
      store: {},
      box: [],
      fishBag: [],
      market: {},
      marketF: {},
      marketHist: {},
      ferts: { normal: 0, special: 0 },
      sprinklers: 0,
      harvester: false,
      harvesterOn: true,
      seeder: 0,
      seederOn: true,
      autoSeeds: [],
      nets: 0,
      netSet: 0,
      fisher: null,
      orchard: { unlocked: false, slots: [] },
      treeStock: {},
      townDonated: 0,
      codex: { fish: {}, crops: {}, food: {} },
      codexClaim: {},
      manualRefreshUsed: false,
      workUsed: false,
      bait: { worm: 0, dough: 0, premium: 0 },
      lure: { owned: false, dur: 0 },
      lure2: { owned: false, dur: 0 },
      teas: { green: 0, black: 0, milk: 0, coffee: 0 },
      keys: { iron: 0, gold: 0 },
      teaUsed: false,
      /* 厨房：做好的料理（每份带品质 / 体力 / 保质期） */
      food: [],
      lunchDay: 0,
      cookedDay: 0,
      cookedToday: 0,
      /* 学会的商店 / 宝箱食谱 */
      recipes: {},
      ledger: [{ day: 1, label: '开局金币', income: 50, expense: 0, balance: 50 }],
      log: [{ day: 1, text: '🌾 欢迎来到我的小农场，第 1 天开始了。', kind: 'sys' }],
      orders: makeOrders({ day: 1 }),
      longOrder: null,
      longOrderReadyDay: 0,
      shop: makeShop(1),
      cropShop: makeCropShop(1),
      levels: { farm: 1, fish: 1, farmXp: 0, fishXp: 0, dig: 1, digXp: 0, forage: 1, forageXp: 0,
                trade: 1, tradeXp: 0, cook: 1, cookXp: 0 },
      ach: {},
      fishBook: { count: 0, entries: [], best: null, priciest: null },
      stats: { harvests: 0, casts: 0, dug: 0, planted: 0, orders: 0, cropsSold: 0, works: 0,
               longOrders: 0, boxItems: 0, boxIncome: 0, teas: 0, chests: 0, forages: 0,
               cooks: 0, meals: 0,
               incomeTotal: 0, expenseTotal: 0,
               wild: {}, forageBest: 0, orchardFruit: 0, orchardPlanted: 0, fruitSold: 0 }
    };
    TREE_LIST.forEach(function (t) {
      s.treeStock[t.id] = { seed: 0, sapling: 0 };
    });
    s.orchard.slots = new Array(BALANCE.orchard.free).fill(null);
    snapshotMarket(s);
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
    s.stats = s.stats || {};
    if (amount >= 0) {
      s.stats.incomeTotal = (s.stats.incomeTotal || 0) + amount;
      ledger(s, label, amount, 0);
    } else {
      s.stats.expenseTotal = (s.stats.expenseTotal || 0) - amount;
      ledger(s, label, 0, -amount);
    }
  }

  /* ---------------- 经营档案 ---------------- */

  /* 设备 / 果树的账面价值（按买入价折算，不折旧） */
  function deviceValue(s) {
    return (s.sprinklers || 0) * BALANCE.device.sprinkler +
           (s.harvester ? BALANCE.device.harvester : 0) +
           (s.seeder || 0) * BALANCE.device.seeder +
           (s.nets || 0) * BALANCE.device.net;
  }
  function orchardValue(s) {
    let v = 0;
    ((s.orchard && s.orchard.slots) || []).forEach(function (t) {
      if (t && TREES[t.id]) v += TREES[t.id].sapling;
    });
    return v;
  }
  /* 净资产 = 现金 + 仓库（收购箱到手口径）+ 收购箱 + 设备 + 果园 */
  function netWorth(s) {
    const coins = Math.max(0, Math.round(s.coins || 0));
    const store = storeTotal(s);
    const box = boxValue(s);
    const device = deviceValue(s);
    const orchard = orchardValue(s);
    return { coins: coins, store: store, box: box, device: device, orchard: orchard,
             total: coins + store + box + device + orchard };
  }
  /* 称号：按净资产取最高一档，并给出下一档目标 */
  function profileRank(s) {
    const R = BALANCE.profile.ranks;
    const worth = netWorth(s).total;
    let cur = R[0];
    R.forEach(function (x) { if (worth >= x.need) cur = x; });
    const next = R.filter(function (x) { return x.need > worth; })[0] || null;
    return { cur: cur, next: next, worth: worth };
  }

  /* 零工单价：体力 1 点 = 2 金（全天）/ 1.2 金（半天） */
  const WORK_RATE_FULL = BALANCE.work.full;
  const WORK_RATE_HALF = BALANCE.work.half;

  function mealFee(s) {
    const M = BALANCE.meal;
    return Math.max(M.min, M.base + (s.maxEnergy - M.from) / M.perEnergy);
  }

  /* 土地维护：超过 5 块开始收费，20 块以上 6 金/周、30 块以上 10 金/周 */
  function plotUpkeep(plots) {
    const U = BALANCE.upkeep;
    let fee = 0;
    for (let i = U.free; i < plots; i++) {
      fee += i < U.midAt ? U.plotPerWeek : (i < U.highAt ? U.plotMid : U.plotHigh);
    }
    return fee;
  }

  /* 设备每周维护费：洒水器 3、自动收获器 5、自动播种器 6/台（渔网免费） */
  function deviceUpkeep(s) {
    return (s.sprinklers || 0) * BALANCE.upkeep.sprinkle +
           (s.harvester ? BALANCE.upkeep.harvester : 0) +
           (s.seeder || 0) * BALANCE.upkeep.seeder;
  }

  function expandCost(s) {
    const n = s.plots.length;
    const B = BALANCE.expand;
    if (n < B.steepFrom) return Math.max(B.base, B.base + B.step * (n - B.from));
    // 25 块之后每块价格逐级上涨
    let c = B.base + B.step * (B.steepFrom - 1 - B.from);
    for (let k = B.steepFrom; k < n; k++) c = Math.round(c * B.steepMul);
    return c;
  }
  /* 强化体力：成本超线性增长（每级 ×1.2），避免「无脑升级」把上限堆到几百 */
  function upgradeCost(s) {
    const U = BALANCE.upgrade;
    const tier = Math.max(0, (s.maxEnergy - U.from) / U.step);
    return Math.round(U.baseCost * Math.pow(U.costMul, tier));
  }
  function workCost(s, mode) { return Math.round(mode === 'half' ? s.maxEnergy / 2 : s.maxEnergy); }
  function workPay(s, mode) {
    const c = workCost(s, mode);
    return Math.round(c * (mode === 'half' ? WORK_RATE_HALF : WORK_RATE_FULL));
  }

  function needOf(p) {
    const c = CROPS[p.crop];
    if (!c) return 0;
    let n = p.phase === 'regrow' ? c.regrowDays : c.days;
    // 反季：普通作物第一茬多花 2 天，大作物直接翻倍（收成本来就慢）
    if (p.off && p.hits === 0) n = c.big ? n * 2 : n + BALANCE.seed.offSeasonDays;
    return n;
  }

  /* 大作物：固定 1 个，不吃肥料产量加成，也不吃等级加成。 */
  function fertBonus(p) {
    const c = CROPS[p.crop];
    if (!c || c.big || c.multi) return 0;
    return p.fert || 0;
  }

  function expectedYield(s, p) {
    const c = CROPS[p.crop];
    if (!c) return 0;
    const offPen = p.off ? BALANCE.seed.offSeasonYield : 0;
    if (c.multi) return Math.max(1, (p.hits === 0 ? c.firstQty : c.regrowQty) - offPen);
    if (c.big) return Math.max(1, c.base - p.missed);
    return Math.max(1, c.base + farmYieldBonus(s) + fertBonus(p) - p.missed - offPen);
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

