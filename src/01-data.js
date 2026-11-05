/* 数值表与派生结构（静态内容表在 src/data/*.json，构建时内联进 game.js） */
/* ============================================================
 * 我的小农场 · 游戏逻辑层（纯数据，不碰 DOM）
 * ============================================================ */

  /* ---------------- 数值表（BALANCE） ---------------- */

  const BALANCE = {
    /* ---------------- 全局入口：所有可调数值都在这里，界面 / 分析脚本只读这里 ---------------- */

    /* 开局 */
    start: { coins: 50, energy: 15, maxEnergy: 15, plots: 5 },
    /* 各动作体力消耗（统一在这里改，不要在逻辑里写死数字） */
    energy: { plant: 1, water: 1, waterSummer: 2, harvest: 1, fert: 1, fish: 2 },
    /* 伙食费：base + (上限 − from) / perEnergy，最低 min；没钱吃饭只回 pct（至少 noMoneyMin）
     * skipLunchMul：厨房解锁后，当天没吃午饭，睡觉伙食费 ×1.5 */
    meal: { base: 3, perEnergy: 5, from: 10, min: 1, noMoneyPct: 0.3, noMoneyMin: 5, skipLunchMul: 1.5 },
    /* 厨房：种田 + 钓鱼等级双门槛；烹饪等级单独一条线；每道菜的体力写在食谱里 */
    cook: { unlockFarm: 3, unlockFish: 2, xp: 2, xpBase: 12, xpStep: 8,
            failBase: 0.25, failStep: 0.025, failMin: 0.02,
            /* 达到这些等级，品质多取一次（Lv4 / Lv8） */
            qualityAt: [4, 8],
            /* 每天最多做几份：基础 3，Lv4 +1，Lv8 再 +1 */
            dailyBase: 3, dailyAt: [4, 8],
            /* 高级菜（Lv≥advLv）额外经验 */
            advLv: 4, advXp: 2,
            /* 食材只收普通及以上；成品品质下限 = 食材最好品质 − 1 档 */
            minQuality: 'common', qualityFloorDrop: 1,
            /* 宝箱掉食谱的概率 */
            goldRecipeChance: 0.09, ironRecipeChance: 0.06,
            /* 新鲜度：剩 0 天时卖价 / 回复打几折；刚做好是 1 */
            freshMin: 0.25 },
    /* 体力上限强化：每次 +step，成本 baseCost × costMul^档（档 = (上限 − from) / step） */
    upgrade: { step: 5, baseCost: 30, costMul: 1.2, from: 10 },
    /* 一季 30 天（春 1–30 / 夏 31–60 / 秋 61–90 / 冬 91–120） */
    seasonDays: 30,
    /* 鱼汛：汛期权重 ×in、非汛期 ×off */
    fishSeason: { in: 1.25, off: 0.3 },

    /* 各饵咬钩基础率；天气修正只在 WEATHER[*].hookMod 里写一份，别处不要再抄 */
    hook: { dough: 0.92, worm: 0.97, lure: 0.72, lure2: 0.92, premium: 0.95 },
    bait: { wormGood: 1.35, lureTrash: 0.3, lureGood: 1.10, premiumGood: 1.25 },
    netChance: 0.8,
    /* 渔网抓完鱼要重新布置：每张 1 体力 */
    netReset: { energy: 1 },
    /* 「连甩 N 杆」的杆数 */
    fishBatch: 5,
    /* 雇佣渔夫：钓鱼 Lv5 解锁。每天 2+等级 杆，工资 8+4×(等级-1)；
     * 每钓到 1 条 +1 经验，升级需要 5+2×(等级-1)，也可以花钱直接升 */
    fisher: { hire: 300, baseCasts: 2, wageBase: 8, wageStep: 4,
              needBase: 5, needStep: 2, upCost: 100, max: 10 },
    work: { full: 2.0, half: 1.2 },
    upkeep: { plotPerWeek: 3, plotMid: 6, plotHigh: 14, free: 5, midAt: 20, highAt: 30,
              sprinkle: 3, net: 0, harvester: 5, seeder: 6 },
    order: { mult: 1.35, seasonStep: 0.6,
             /* 鱼单单价：每日单 11 + 4×季 / 长期单 18 + 4×季 */
             fishBase: 11, longFishBase: 18, fishStep: 4,
             /* 委托默认只收普通及以上品质（劣质只能自己卖） */
             minQuality: 'common',
             /* 非冬季每张作物单有多大概率点名反季作物（卖价按反季市价算） */
             offSeasonChance: 0.15 },
    /* 土地：4~34 块按 25 + 15×(n−4) 线性涨；到 35 块以后每块 ×1.8 陡涨 */
    expand: { base: 25, step: 15, from: 4, steepFrom: 35, steepMul: 1.8, max: 60 },
    /* 自动播种器：一台只管 5 块地，买几台就播几块（每台每天 5 块），每台每周要交维护费 */
    device: { sprinkler: 80, harvester: 300, net: 50, seeder: 400, seederPlots: 5,
              seederMax: 9, netMax: 9, sprinklerPerDay: 1 },
    lure: { price: 5, dur: 25 },
    /* 高级假饵：钓鱼 Lv6 解锁，20 金 / 100 次；咬钩率跟面团饵一样，好鱼率跟假饵一样 */
    lure2: { price: 20, dur: 100 },
    shop: { priceMul: 1.25, cropPriceMul: 1.25, restock: true, sellRate: 0.8 },
    /* 市场：供需 1.30（稀缺）→ 0.70（过剩）；作物每件 −0.015、鱼每条 −0.010，睡一觉销量回落 25%。
     * 批量按「批次中点」定价：一次卖 30 件 ≈ 分三次卖 10 件，整批砸盘不再有价格优势。
     * 收购箱次日按当时市价结算，并扣 boxFee 手续费。 */
    market: { supplyMax: 1.3, supplyMin: 0.7, cropStep: 0.015, fishStep: 0.01,
              offSeason: 1.7, decay: 0.75, scarce: 1.15, glut: 0.9,
              boxFee: 0.05,
              /* 熟食进收购箱的额外手续费（在 boxFee 之上再加 10%） */
              boxFoodExtra: 0.10,
              /* 委托的市价溢价封顶，避免一张单顶掉整个农场 */
              orderCap: 1.6 },
    /* 采集：5 体力一次（采集满级 4），100% 1 件 → 75% 再来 1 件 → 35% 再来 1 件，25% 掉一颗当季种子
     * Lv4 / Lv8 各多取一次品质（野货品质更好） */
    forage: { energy: 5, qty2: 0.75, qty3: 0.35, seedChance: 0.25, xp: 2, qualityAt: 4 },
    /* 挖蚯蚓：3 体力一次（满级 2），1–3 条；Lv4 / Lv8 各 +1 条（封顶 cap + 加成） */
    dig: { energy: 3, xp: 2, yieldAt: 4, min: 1, max: 3, cap: 5, value: 3 },
    /* 交易等级：买东西 / 卖东西按交易额涨经验（每 5 金 1 点），每级把商店进价压低 0.5%（最多 −4.5%） */
    trade: { xpPer: 5, buyCut: 0.005, maxCut: 0.045, xpBase: 60, xpStep: 30 },
    /* 小镇捐赠：三档，捐得越多加成越多（金币出口） */
    town: [
      { id: 'stall', name: '村口小摊', emoji: '🏪', need: 2000, orderBonus: 0.05,
        desc: '委托报酬 +5%' },
      { id: 'fame', name: '镇上有名', emoji: '🏅', need: 8000, shopCut: 0.10,
        desc: '商店进价 −10%' },
      { id: 'guild', name: '商会会员', emoji: '🎖️', need: 20000, marketBonus: 0.08,
        desc: '所有买卖市价 +8%' }
    ],
    /* 反季种子：价格 ×1.8；反季播种生长 +2 天、产量 −1（大作物只慢不减个数） */
    seed: { offSeasonMul: 1.8, offSeasonDays: 2, offSeasonYield: 1 },
    /* 累进税：0~2000 收 2%、2000~10000 收 4%、10000 以上收 6%，最低 30 金 */
    tax: { min: 30, every: 30,
           bands: [{ upTo: 2000, rate: 0.02 }, { upTo: 10000, rate: 0.04 }, { upTo: null, rate: 0.06 }] },
    /* 等级：每级所需经验 = 15 + 10×(级-1)，满级 10；满级时挖蚯蚓 / 采集各少花 1 点体力。
     * 种田每 yieldEvery 级 +1 产量；钓鱼每级咬钩 +hookPerLv（上限 hookMax）、好鱼 +goodPerLv（上限 goodMax） */
    level: { max: 10, xpBase: 15, xpStep: 10, maxEnergySave: 1, yieldEvery: 4,
             hookPerLv: 0.011, hookMax: 0.10, goodPerLv: 0.025, goodMax: 0.225,
             farmXpHarvest: 1, fishXpEvery: 2, fishXpPerfect: 2 },
    /* 等级解锁：商店设备 / 高级种子 / 特效肥 / 渔网 / 渔夫 / 高级假饵 / 自动播种器 */
    gate: { sprinkler: 2, harvester: 6, net: 2, specialFert: 4, netBase: 2, fisher: 5,
            seeder: 4, lure2: 7, lure2Trade: 5, goldKeyTrade: 4,
            premium: 9, premiumTrade: 7 },
    /* 宝箱：铁箱 / 金箱按钓鱼等级解锁 */
    chest: { ironLv: 4, goldLv: 7 },
    /* 果园：种田 Lv7 + 2500 金开垦，先给 3 个树坑，后面每个花钱开（第 4~8 个）。
     * 种子：浇水 30 天 + 生长满 90 天才成树；树苗：浇水 15 天 + 生长满 30 天，浇足后无需再浇。
     * 成树只在自己季节结果，当季每天随机 1~3 个；浇水 / 收获各 1 体力。 */
    orchard: { unlockLv: 7, unlockCost: 2500, slots: 8, free: 3, fruitMin: 1, fruitMax: 3,
               waterEnergy: 1, harvestEnergy: 1, ripeCap: 10,
               /* 成树等级：收获攒经验，满级 5；每级让「当天多挂 1 个」的概率 +10% */
               treeLvMax: 5, treeXpBase: 2, treeXpStep: 2, treeLvYield: 0.10,
               grow: { seed: { days: 90, water: 30 }, sapling: { days: 30, water: 15 } },
               slotCosts: [600, 1000, 1600, 2400, 3200] },
    /* 经营档案：按净资产给的称号 */
    profile: {
      ranks: [
        { need: 0,      name: '小农户',   emoji: '🌱' },
        { need: 2000,   name: '家庭农场', emoji: '🏡' },
        { need: 10000,  name: '种植大户', emoji: '🚜' },
        { need: 50000,  name: '庄园主',   emoji: '🏰' },
        { need: 200000, name: '农业大亨', emoji: '👑' }
      ]
    },
    /* 图鉴奖励：收集到 need 种鱼 / 作物时自动发一次奖励（按 id 记一次，不可重复领）。
     * 鱼只算 6 种正经鱼（杂物和宝箱不进图鉴），作物算上架的全部 14 种。 */
    codex: {
      fish: [
        { id: 'fish2', need: 2, reward: { coins: 150 } },
        { id: 'fish4', need: 4, reward: { coins: 400, bait: { dough: 5 } } },
        { id: 'fish6', need: 6, reward: { coins: 1000, bait: { dough: 10 } } }
      ],
      crops: [
        { id: 'crop5', need: 5, reward: { coins: 200 } },
        { id: 'crop10', need: 10, reward: { coins: 600, ferts: { normal: 3 } } },
        { id: 'crop14', need: 14, reward: { coins: 1800, ferts: { special: 3 } } }
      ]
    }
  };

  /* ---------------- 静态数据 ---------------- */

  /* 季节：0 春 / 1 夏 / 2 秋 / 3 冬。seasons 里没有的季节不能播种，种子店也不卖 */
  Object.keys(CROPS).forEach(function (k) { CROPS[k].id = k; });
  /* CROP_LIST 只放能种的；WILD_LIST 是采集产物，水果走果园单独收获 */
  const CROP_LIST = Object.keys(CROPS).filter(function (k) {
    return !CROPS[k].wild && !CROPS[k].fruit;
  }).map(function (k) { return CROPS[k]; });
  const WILD_LIST = Object.keys(CROPS).filter(function (k) { return CROPS[k].wild; })
    .map(function (k) { return CROPS[k]; });
  const FRUIT_LIST = Object.keys(CROPS).filter(function (k) { return CROPS[k].fruit; })
    .map(function (k) { return CROPS[k]; });

  const FERT_SELL_RATE = 0.5;
  const SPRINKLER_COST = BALANCE.device.sprinkler;

  const TRASH = [
    { name: '易拉罐', emoji: '🥫', desc: '谁扔的，回收站都不一定收' },
    { name: '旧靴子', emoji: '👢', desc: '单只，另一只还在河底' },
    { name: '水草',   emoji: '🌿', desc: '缠在钩上，只能当肥料' }
  ];
  const TRASH_NAMES = TRASH.map(function (t) { return t.name; });

  const FISH_BY_NAME = {};
  FISH.forEach(function (f) { FISH_BY_NAME[f.name] = f; });
  function fishByName(name) { return (name && FISH_BY_NAME[name]) || null; }
  function fishById(id) {
    for (let i = 0; i < FISH.length; i++) if (FISH[i].id === id) return FISH[i];
    return null;
  }

  /* 百货店的茶：下午茶改喝这些，不再掏 3 金。大杯单价更便宜（2.5~3.0 金/体力） */
  const TEA_LIST = Object.keys(TEAS).map(function (k) { return TEAS[k]; });

  /* 果树：每种只在自己的季节结果（当季每天随机 BALANCE.orchard.fruitMin~fruitMax 个）
   * seed = 种子价（便宜，要浇水 30 天 + 满 90 天），sapling = 树苗价（贵，浇水 15 天 + 满 30 天）
   * price = 果实单价，fruitId 指向 CROPS 里对应的水果（收获进仓库） */
  const TREE_LIST = Object.keys(TREES).map(function (k) { return TREES[k]; });

  /* 水产店每日进货量：[最少, 最多]；越稀有的鱼进得越少 */
  const SHOP_STOCK = {
    crucian: [3, 6], carp: [3, 6], mandarin: [2, 4],
    bass: [2, 4], puffer: [1, 3], koi: [0, 2]
  };
  /* 高级水产中后期才进货 */
  const FISH_UNLOCK = { puffer: 20, koi: 30 };
  /* 高级作物中后期才进货 */
  const CROP_UNLOCK = { pumpkin: 18, watermelon: 24 };

  /* 鱼群季节：汛期权重 ×1.25，非汛期 ×0.3（还能钓到，但明显少） */
  const FISH_OFF_SEASON = BALANCE.fishSeason.off;
  const FISH_IN_SEASON = BALANCE.fishSeason.in;

  function fishSeasonOk(id, day) {
    const f = FISH.filter(function (x) { return x.id === id; })[0];
    if (!f || !f.seasons) return true;
    return f.seasons.indexOf(seasonIdx(day || 1)) >= 0;
  }
  function fishSeasonText(id) {
    const f = FISH.filter(function (x) { return x.id === id; })[0];
    if (!f || !f.seasons) return '四季';
    return f.seasons.map(function (i) { return SEASONS[i]; }).join('·');
  }

  const Q_IDS = QUALITY.map(function (q) { return q.id; });

  const WEATHER_LIST = Object.keys(WEATHER).map(function (k) { return WEATHER[k]; });

  /* 鱼饵：名称 / 价格 / 说明，咬钩率走 BALANCE.hook */
  const BAIT = {
    worm:  { id: 'worm',  name: '蚯蚓',   emoji: '🪱', desc: '好鱼概率 ×' + BALANCE.bait.wormGood + ' · 品质取两次较好' },
    dough: { id: 'dough', name: '面团饵', emoji: '🍞', price: 1, desc: '标准钓鱼体验 · ' + Math.round(BALANCE.hook.dough * 100) + '% 咬钩' },
    lure:  { id: 'lure',  name: '假饵',   emoji: '🎣',
             desc: '耐用 ' + BALANCE.lure.dur + ' 次 · 杂物少、品质取两次较好，但只有 ' + Math.round(BALANCE.hook.lure * 100) + '% 咬钩' },
    lure2: { id: 'lure2', name: '高级假饵', emoji: '🪝',
             desc: '耐用 ' + BALANCE.lure2.dur + ' 次 · 咬钩率跟面团饵一样（' + Math.round(BALANCE.hook.lure2 * 100) +
               '%），好鱼 ×' + BALANCE.bait.lureGood + ' · 钓鱼 Lv' + BALANCE.gate.lure2 + ' + 交易 Lv' +
               BALANCE.gate.lure2Trade + ' 解锁' },
    premium: { id: 'premium', name: '特级饵料', emoji: '🍤', price: 4,
               desc: '一次一份 · ' + Math.round(BALANCE.hook.premium * 100) + '% 咬钩、好鱼 ×' +
                 BALANCE.bait.premiumGood + '、品质取两次较好 · 钓鱼 Lv' + BALANCE.gate.premium +
                 ' + 交易 Lv' + BALANCE.gate.premiumTrade + ' 解锁' }
  };
  /* 各饵的咬钩基础概率（天气再加减） */
  const HOOK = BALANCE.hook;
