/* ============================================================
 * 我的小农场 · 游戏逻辑层（自动生成，别直接改这个文件！）
 * 源码在 src/*.js，静态表在 src/data/*.json，改完运行： node build-modules.cjs
 * 拼装后仍然是一个 IIFE，所有模块共享同一个闭包作用域。
 * ============================================================ */
(function (root) {
  'use strict';

  /* ---- src/data/crops.json ---- */
  const CROPS = {
    "carrot": {
      "name": "萝卜",
      "emoji": "🥕",
      "seed": 5,
      "days": 2,
      "base": 3,
      "price": 4,
      "big": false,
      "lv": 1,
      "seasons": [
        0,
        2
      ],
      "desc": "脆生生，炖汤最甜"
    },
    "cabbage": {
      "name": "白菜",
      "emoji": "🥬",
      "seed": 7,
      "days": 2,
      "base": 2,
      "price": 8,
      "big": false,
      "lv": 1,
      "seasons": [
        0,
        2
      ],
      "desc": "冬天囤一车也不坏"
    },
    "potato": {
      "name": "土豆",
      "emoji": "🥔",
      "seed": 9,
      "days": 3,
      "base": 3,
      "price": 8,
      "big": false,
      "lv": 1,
      "seasons": [
        0,
        1
      ],
      "desc": "怎么做都好吃，管饱"
    },
    "spinach": {
      "name": "菠菜",
      "emoji": "🥬",
      "seed": 6,
      "days": 2,
      "base": 2,
      "price": 7,
      "big": false,
      "lv": 1,
      "seasons": [
        0,
        2
      ],
      "desc": "一茬接一茬，凉拌最爽口"
    },
    "corn": {
      "name": "玉米",
      "emoji": "🌽",
      "seed": 14,
      "days": 3,
      "base": 2,
      "price": 16,
      "big": false,
      "lv": 2,
      "seasons": [
        0,
        1
      ],
      "desc": "刚摘的最甜，能磨面"
    },
    "eggplant": {
      "name": "茄子",
      "emoji": "🍆",
      "seed": 17,
      "days": 4,
      "base": 2,
      "price": 22,
      "big": false,
      "lv": 3,
      "seasons": [
        1,
        2
      ],
      "desc": "紫得发亮，红烧下饭"
    },
    "tomato": {
      "name": "番茄",
      "emoji": "🍅",
      "seed": 19,
      "days": 4,
      "base": 3,
      "price": 16,
      "big": false,
      "lv": 3,
      "seasons": [
        1,
        2
      ],
      "desc": "沙瓤，生吃拌糖也行"
    },
    "chili": {
      "name": "辣椒",
      "emoji": "🌶️",
      "seed": 20,
      "days": 4,
      "base": 3,
      "price": 21,
      "big": false,
      "lv": 3,
      "seasons": [
        1,
        2
      ],
      "desc": "够辣，晒干了更好卖"
    },
    "pumpkin": {
      "name": "南瓜",
      "emoji": "🎃",
      "seed": 26,
      "days": 5,
      "base": 1,
      "price": 110,
      "big": true,
      "lv": 5,
      "seasons": [
        2
      ],
      "desc": "一株一个，个头抵一筐；施肥只提品质"
    },
    "watermelon": {
      "name": "西瓜",
      "emoji": "🍉",
      "seed": 36,
      "days": 5,
      "base": 1,
      "price": 140,
      "big": true,
      "lv": 6,
      "seasons": [
        1
      ],
      "desc": "沙甜起沙，一个顶一车；施肥只提品质"
    },
    "sweetpotato": {
      "name": "红薯",
      "emoji": "🍠",
      "seed": 12,
      "days": 4,
      "base": 4,
      "price": 10,
      "big": false,
      "lv": 2,
      "seasons": [
        2
      ],
      "desc": "烤着吃最香，管饱又耐放"
    },
    "cucumber": {
      "name": "黄瓜",
      "emoji": "🥒",
      "seed": 19,
      "days": 3,
      "price": 13,
      "multi": true,
      "lv": 4,
      "seasons": [
        1
      ],
      "firstQty": 2,
      "regrowDays": 2,
      "regrowQty": 2,
      "regrowTimes": 2,
      "desc": "顶花带刺，摘了还能再长"
    },
    "grape": {
      "name": "葡萄",
      "emoji": "🍇",
      "seed": 26,
      "days": 4,
      "price": 12,
      "multi": true,
      "lv": 4,
      "seasons": [
        1
      ],
      "firstQty": 3,
      "regrowDays": 2,
      "regrowQty": 3,
      "regrowTimes": 2,
      "desc": "一串一串地结，越摘越有"
    },
    "strawberry": {
      "name": "草莓",
      "emoji": "🍓",
      "seed": 22,
      "days": 3,
      "price": 9,
      "multi": true,
      "lv": 4,
      "seasons": [
        0
      ],
      "firstQty": 3,
      "regrowDays": 1,
      "regrowQty": 2,
      "regrowTimes": 3,
      "desc": "娇气，但一直能摘"
    },
    "shepherd": {
      "name": "荠菜",
      "emoji": "🌿",
      "price": 12,
      "wild": true,
      "seasons": [
        0
      ],
      "desc": "田埂上一抓一把，包饺子最香"
    },
    "berry": {
      "name": "野莓",
      "emoji": "🫐",
      "price": 18,
      "wild": true,
      "seasons": [
        1
      ],
      "desc": "灌木丛里一串串，酸甜"
    },
    "mushroom": {
      "name": "松茸",
      "emoji": "🍄",
      "price": 24,
      "wild": true,
      "seasons": [
        2
      ],
      "desc": "雨后林子里的宝贝，城里人抢着要"
    },
    "frozenpear": {
      "name": "冻梨",
      "emoji": "🍐",
      "price": 22,
      "wild": true,
      "seasons": [
        3
      ],
      "desc": "冻得梆硬，化开了甜到心里"
    },
    "fruit_peach": {
      "name": "桃",
      "emoji": "🍑",
      "price": 24,
      "fruit": true,
      "seasons": [
        0
      ],
      "desc": "果园当季现摘，软甜多汁"
    },
    "fruit_mango": {
      "name": "芒果",
      "emoji": "🥭",
      "price": 30,
      "fruit": true,
      "seasons": [
        1
      ],
      "desc": "晒足太阳的热带甜"
    },
    "fruit_apple": {
      "name": "苹果",
      "emoji": "🍎",
      "price": 26,
      "fruit": true,
      "seasons": [
        2
      ],
      "desc": "秋天第一口脆"
    }
  };

  /* ---- src/data/fish.json ---- */
  const FISH = [
    {
      "id": "trash",
      "name": "垃圾",
      "emoji": "🗑️",
      "base": 1,
      "w": 18,
      "trash": true,
      "desc": "河里捞上来的不是鱼"
    },
    {
      "id": "crucian",
      "name": "鲫鱼",
      "emoji": "🐟",
      "base": 3,
      "w": 24,
      "seasons": [
        0,
        2
      ],
      "desc": "肉嫩刺多，熬汤最鲜"
    },
    {
      "id": "carp",
      "name": "鲤鱼",
      "emoji": "🐟",
      "base": 6,
      "w": 20,
      "seasons": [
        0,
        1,
        2
      ],
      "desc": "常见河鱼，红烧一绝"
    },
    {
      "id": "mandarin",
      "name": "鳜鱼",
      "emoji": "🐠",
      "base": 10,
      "w": 13,
      "seasons": [
        0,
        1
      ],
      "desc": "桃花流水鳜鱼肥"
    },
    {
      "id": "bass",
      "name": "鲈鱼",
      "emoji": "🐟",
      "base": 12,
      "w": 11,
      "seasons": [
        1,
        2
      ],
      "desc": "清蒸最见功夫"
    },
    {
      "id": "puffer",
      "name": "河豚",
      "emoji": "🐡",
      "base": 20,
      "w": 9,
      "seasons": [
        2
      ],
      "desc": "有毒性，老饕甘愿冒险"
    },
    {
      "id": "koi",
      "name": "锦鲤",
      "emoji": "🐉",
      "base": 25,
      "w": 6,
      "seasons": [
        0
      ],
      "desc": "好运的象征，卖价不菲"
    },
    {
      "id": "chestWood",
      "name": "木制宝箱",
      "emoji": "🪵",
      "base": 10,
      "w": 5,
      "chest": "wood",
      "noOrder": true,
      "desc": "木头做的，直接撬开就是几枚铜板"
    },
    {
      "id": "chestIron",
      "name": "铁制宝箱",
      "emoji": "🧰",
      "base": 25,
      "w": 2.5,
      "chest": "iron",
      "lv": 4,
      "noOrder": true,
      "desc": "上了锁，得用铁钥匙"
    },
    {
      "id": "chestGold",
      "name": "黄金宝箱",
      "emoji": "👑",
      "base": 130,
      "w": 1,
      "chest": "gold",
      "lv": 7,
      "noOrder": true,
      "desc": "沉甸甸的，金钥匙才打得开"
    }
  ];

  /* ---- src/data/quality.json ---- */
  const QUALITY = [
    {
      "id": "bad",
      "name": "劣质",
      "emoji": "⬜",
      "mul": 0.4,
      "w": 10,
      "color": "#8d939a"
    },
    {
      "id": "common",
      "name": "普通",
      "emoji": "🥉",
      "mul": 0.7,
      "w": 25,
      "color": "#b07a45"
    },
    {
      "id": "std",
      "name": "标准",
      "emoji": "🥈",
      "mul": 1,
      "w": 35,
      "color": "#4a86c8"
    },
    {
      "id": "good",
      "name": "优良",
      "emoji": "🥇",
      "mul": 1.3,
      "w": 18,
      "color": "#2f9e63"
    },
    {
      "id": "fine",
      "name": "优质",
      "emoji": "💎",
      "mul": 1.7,
      "w": 8,
      "color": "#7b5cd6"
    },
    {
      "id": "perfect",
      "name": "完美",
      "emoji": "🌟",
      "mul": 2.2,
      "w": 3,
      "color": "#d99f2b"
    },
    {
      "id": "legend",
      "name": "传说",
      "emoji": "🏆",
      "mul": 3,
      "w": 1,
      "color": "#d2453a"
    }
  ];

  /* ---- src/data/weather.json ---- */
  const WEATHER = {
    "sunny": {
      "id": "sunny",
      "name": "晴天",
      "emoji": "☀️",
      "w": 45,
      "hookMod": -0.12,
      "wormMod": -1,
      "note": "咬钩率 -12% · 挖蚯蚓 -1 份"
    },
    "cloudy": {
      "id": "cloudy",
      "name": "阴天",
      "emoji": "⛅",
      "w": 30,
      "hookMod": 0,
      "wormMod": 1,
      "note": "咬钩率默认 · 挖蚯蚓 +1 份"
    },
    "rain": {
      "id": "rain",
      "name": "雨天",
      "emoji": "🌧️",
      "w": 25,
      "hookMod": 0.08,
      "wormMod": 1,
      "autoWater": true,
      "note": "自动浇水 · 咬钩率 +8% · 挖蚯蚓 +1 份"
    },
    "snow": {
      "id": "snow",
      "name": "雪天",
      "emoji": "❄️",
      "w": 0,
      "hookMod": -0.3,
      "wormMod": -1,
      "autoWater": true,
      "note": "自动浇水（化雪）· 河面结冰，冬天本来就钓不了鱼"
    }
  };

  /* ---- src/data/season-weather.json ---- */
  const SEASON_WEATHER = [
    {
      "sunny": 25,
      "cloudy": 25,
      "rain": 50,
      "snow": 0
    },
    {
      "sunny": 60,
      "cloudy": 25,
      "rain": 15,
      "snow": 0
    },
    {
      "sunny": 45,
      "cloudy": 30,
      "rain": 25,
      "snow": 0
    },
    {
      "sunny": 25,
      "cloudy": 30,
      "rain": 0,
      "snow": 45
    }
  ];

  /* ---- src/data/trees.json ---- */
  const TREES = {
    "peach": {
      "id": "peach",
      "name": "桃树",
      "fruit": "桃",
      "fruitId": "fruit_peach",
      "emoji": "🍑",
      "season": 0,
      "seed": 90,
      "sapling": 750,
      "price": 24,
      "desc": "早春挂果，软甜多汁"
    },
    "mango": {
      "id": "mango",
      "name": "芒果树",
      "fruit": "芒果",
      "fruitId": "fruit_mango",
      "emoji": "🥭",
      "season": 1,
      "seed": 110,
      "sapling": 900,
      "price": 30,
      "desc": "晒足太阳才够甜"
    },
    "apple": {
      "id": "apple",
      "name": "苹果树",
      "fruit": "苹果",
      "fruitId": "fruit_apple",
      "emoji": "🍎",
      "season": 2,
      "seed": 95,
      "sapling": 780,
      "price": 26,
      "desc": "秋天第一口脆"
    }
  };

  /* ---- src/data/teas.json ---- */
  const TEAS = {
    "green": {
      "id": "green",
      "name": "绿茶",
      "emoji": "🍵",
      "price": 12,
      "energy": 4,
      "day": 1,
      "desc": "清清爽爽，提神又不腻"
    },
    "black": {
      "id": "black",
      "name": "红茶",
      "emoji": "🫖",
      "price": 17,
      "energy": 6,
      "day": 5,
      "desc": "加一块方糖，暖到心里"
    },
    "milk": {
      "id": "milk",
      "name": "奶茶",
      "emoji": "🧋",
      "price": 24,
      "energy": 9,
      "day": 10,
      "desc": "三分糖，珍珠要多"
    },
    "coffee": {
      "id": "coffee",
      "name": "咖啡",
      "emoji": "☕",
      "price": 30,
      "energy": 12,
      "day": 16,
      "desc": "一口下去，天都亮了"
    }
  };

  /* ---- src/data/chests.json ---- */
  const CHESTS = {
    "wood": {
      "id": "wood",
      "name": "木制宝箱",
      "emoji": "🪵",
      "key": null,
      "value": 10
    },
    "iron": {
      "id": "iron",
      "name": "铁制宝箱",
      "emoji": "🧰",
      "key": "iron",
      "value": 25
    },
    "gold": {
      "id": "gold",
      "name": "黄金宝箱",
      "emoji": "👑",
      "key": "gold",
      "value": 130
    }
  };

  /* ---- src/data/keys.json ---- */
  const KEYS = {
    "iron": {
      "id": "iron",
      "name": "铁钥匙",
      "emoji": "🗝️",
      "price": 40,
      "lv": 4,
      "opens": "铁制宝箱"
    },
    "gold": {
      "id": "gold",
      "name": "金钥匙",
      "emoji": "🔑",
      "price": 120,
      "lv": 7,
      "opens": "黄金宝箱"
    }
  };

  /* ---- src/data/fert.json ---- */
  const FERT = {
    "normal": {
      "id": "normal",
      "name": "普通肥料",
      "emoji": "🧪",
      "cost": 8,
      "add": 1,
      "lv": 1
    },
    "special": {
      "id": "special",
      "name": "特效肥料",
      "emoji": "💊",
      "cost": 18,
      "add": 2,
      "lv": 4
    }
  };

/* ==================== src/01-data.js ==================== */
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
    /* 伙食费：base + (上限 − from) / perEnergy，最低 min；没钱吃饭只回 pct（至少 noMoneyMin） */
    meal: { base: 3, perEnergy: 5, from: 10, min: 1, noMoneyPct: 0.3, noMoneyMin: 5 },
    /* 体力上限强化：每次 +step，成本 baseCost × costMul^档（档 = (上限 − from) / step） */
    upgrade: { step: 5, baseCost: 30, costMul: 1.2, from: 10 },
    /* 一季 30 天（春 1–30 / 夏 31–60 / 秋 61–90 / 冬 91–120） */
    seasonDays: 30,
    /* 鱼汛：汛期权重 ×in、非汛期 ×off */
    fishSeason: { in: 1.25, off: 0.3 },

    hook: { dough: 0.92, worm: 0.97, lure: 0.72, lure2: 0.92, premium: 0.95 },
    weatherHook: { sunny: -0.12, cloudy: 0, rain: 0.08 },
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
             fishBase: 11, longFishBase: 18, fishStep: 4 },
    expand: { base: 25, step: 15, from: 4, steepFrom: 25, steepMul: 1.6 },
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

/* ==================== src/02-ach.js ==================== */
/* 成就表与判定 */
  /* ---------------- 成就 ---------------- */

  function cropSpeciesOwned(s) {
    const cx = (s.codex && s.codex.crops) || {};
    return CROP_LIST.filter(function (c) { return cx[c.id] && cx[c.id].n > 0; }).length;
  }
  function fishSpeciesOwned(s) {
    const fx = (s.codex && s.codex.fish) || {};
    return FISH.filter(function (f) { return !f.trash && !f.chest && fx[f.id] && fx[f.id].n > 0; }).length;
  }
  /* 果园水果：和作物共用 codex.crops（果实固定标准品质） */
  function fruitSpeciesOwned(s) {
    const cx = (s.codex && s.codex.crops) || {};
    return FRUIT_LIST.filter(function (f) { return cx[f.id] && cx[f.id].n > 0; }).length;
  }
  function perfectFish(s) {
    const fx = (s.codex && s.codex.fish) || {};
    return Object.keys(fx).reduce(function (a, k) { return a + (fx[k].perfect || 0); }, 0);
  }
  function fishValueTotal(s) {
    const fx = (s.codex && s.codex.fish) || {};
    return Object.keys(fx).reduce(function (a, k) { return a + (fx[k].value || 0); }, 0);
  }
  function cropValueTotal(s) {
    const cx = (s.codex && s.codex.crops) || {};
    return Object.keys(cx).reduce(function (a, k) { return a + (cx[k].value || 0); }, 0);
  }

  /* ---------------- 图鉴奖励 ---------------- */
  /* 鱼只算 6 种正经鱼（杂物 / 宝箱不进图鉴），作物算上架的全部 14 种。
   * 每档按 id 记一次，跨存档恢复也不会重复领。 */

  const CODEX_TOTAL = {
    fish: FISH.filter(function (f) { return !f.trash && !f.chest; }).length,
    crops: CROP_LIST.length
  };
  const CODEX_LABEL = { fish: '🐟 鱼类', crops: '🌾 作物' };

  function codexSpecies(s, kind) {
    return kind === 'fish' ? fishSpeciesOwned(s) : cropSpeciesOwned(s);
  }

  /* 每档奖励 + 当前进度，给界面用 */
  function codexRewards(s) {
    s.codexClaim = s.codexClaim || {};
    const out = { fish: [], crops: [] };
    ['fish', 'crops'].forEach(function (kind) {
      const have = codexSpecies(s, kind);
      (BALANCE.codex[kind] || []).forEach(function (m) {
        out[kind].push({
          id: m.id, kind: kind, label: CODEX_LABEL[kind], need: m.need,
          total: CODEX_TOTAL[kind], have: have, got: Math.min(have, m.need),
          claimed: !!s.codexClaim[m.id], day: s.codexClaim[m.id] || 0,
          text: rewardText({ reward: m.reward })
        });
      });
    });
    return out;
  }

  /* 达标就发奖，每个 id 只发一次；返回本次新领到的档位 */
  function checkCodexRewards(s) {
    s.codexClaim = s.codexClaim || {};
    const out = [];
    ['fish', 'crops'].forEach(function (kind) {
      const have = codexSpecies(s, kind);
      (BALANCE.codex[kind] || []).forEach(function (m) {
        if (s.codexClaim[m.id] || have < m.need) return;
        s.codexClaim[m.id] = s.day || 1;
        applyReward(s, m.reward, '图鉴奖励');
        const text = rewardText({ reward: m.reward });
        log(s, '📖 图鉴奖励：' + CODEX_LABEL[kind] + '收集 ' + m.need + ' 种（' + text + '）', 'good');
        out.push({ id: m.id, kind: kind, label: CODEX_LABEL[kind], need: m.need, text: text });
      });
    });
    return out;
  }

  /* 成就表：val(s) 是当前进度，达到 goal 就算解锁，奖励自动发放 */
  const ACH = [
    /* 种田 */
    { id: 'harvest1',  cat: 'farm', emoji: '🌱', name: '第一筐菜',   desc: '收获 1 次作物',        goal: 1,
      val: function (s) { return s.stats.harvests || 0; }, reward: { coins: 15 }, pts: 1 },
    { id: 'harvest50', cat: 'farm', emoji: '🧺', name: '田里好手',   desc: '累计收获 50 次',       goal: 50,
      val: function (s) { return s.stats.harvests || 0; }, reward: { coins: 60, seeds: { carrot: 3 } }, pts: 2 },
    { id: 'harvest200', cat: 'farm', emoji: '🚜', name: '老农把式',  desc: '累计收获 200 次',      goal: 200,
      val: function (s) { return s.stats.harvests || 0; }, reward: { coins: 250 }, pts: 4 },
    { id: 'plot10',    cat: 'farm', emoji: '🏞️', name: '小有规模',   desc: '土地达到 10 块',       goal: 10,
      val: function (s) { return s.plots.length; }, reward: { coins: 40 }, pts: 2 },
    { id: 'plot20',    cat: 'farm', emoji: '🌾', name: '良田成片',   desc: '土地达到 20 块',       goal: 20,
      val: function (s) { return s.plots.length; }, reward: { ferts: { normal: 5 } }, pts: 3 },
    { id: 'plot36',    cat: 'farm', emoji: '🗺️', name: '大地主',     desc: '土地达到 36 块',       goal: 36,
      val: function (s) { return s.plots.length; }, reward: { coins: 2000 }, pts: 6 },
    { id: 'crop10',    cat: 'farm', emoji: '🌽', name: '五谷丰登',   desc: '收获过全部 14 种作物', goal: 14,
      val: cropSpeciesOwned, reward: { coins: 250, seeds: { pumpkin: 1 } }, pts: 3 },

    /* 果园 */
    { id: 'orchard1',  cat: 'farm', emoji: '🍑', name: '开垦果园',   desc: '开出第一片果园',       goal: 1,
      val: function (s) { return orchardUnlocked(s) ? 1 : 0; }, reward: { coins: 150 }, pts: 3 },
    { id: 'fruit1',    cat: 'farm', emoji: '🌰', name: '第一颗果子', desc: '从果树上收到 1 个水果', goal: 1,
      val: function (s) { return s.stats.orchardFruit || 0; }, reward: { coins: 60 }, pts: 1 },
    { id: 'fruit100',  cat: 'farm', emoji: '🧺', name: '果园丰收',   desc: '累计收获 100 个水果',  goal: 100,
      val: function (s) { return s.stats.orchardFruit || 0; }, reward: { coins: 400 }, pts: 3 },
    { id: 'tree8',     cat: 'farm', emoji: '🌳', name: '满园果树',   desc: '把 8 个树坑全开出来',  goal: 8,
      val: function (s) { return orchardSlotCount(s); }, reward: { coins: 600 }, pts: 4 },
    { id: 'fruit3',    cat: 'farm', emoji: '🍎', name: '三种果子',   desc: '桃 / 芒果 / 苹果都收过', goal: 3,
      val: fruitSpeciesOwned, reward: { coins: 500, ferts: { special: 2 } }, pts: 4 },

    /* 钓鱼 */
    { id: 'fish1',     cat: 'fish', emoji: '🎣', name: '开张啦',     desc: '钓上第 1 条鱼',        goal: 1,
      val: function (s) { return (s.fishBook && s.fishBook.count) || 0; }, reward: { bait: { dough: 5 } }, pts: 1 },
    { id: 'cast100',   cat: 'fish', emoji: '🌊', name: '垂钓老手',   desc: '累计甩杆 100 次',      goal: 100,
      val: function (s) { return s.stats.casts || 0; }, reward: { coins: 100 }, pts: 2 },
    { id: 'perfect1',  cat: 'fish', emoji: '🌟', name: '完美一击',   desc: '钓到 1 条完美品质的鱼', goal: 1,
      val: perfectFish, reward: { coins: 80 }, pts: 2 },
    { id: 'perfect10', cat: 'fish', emoji: '💫', name: '完美主义者', desc: '钓到 10 条完美品质的鱼', goal: 10,
      val: perfectFish, reward: { coins: 500 }, pts: 4 },
    { id: 'fish7',     cat: 'fish', emoji: '🐠', name: '鱼类图鉴',   desc: '集齐 7 种鱼',          goal: 7,
      val: fishSpeciesOwned, reward: { ferts: { special: 3 } }, pts: 5 },
    { id: 'fishval',   cat: 'fish', emoji: '💎', name: '鱼市大亨',   desc: '鱼类累计价值 5000 金', goal: 5000,
      val: fishValueTotal, reward: { coins: 400 }, pts: 3 },

    /* 经营 */
    { id: 'order1',    cat: 'biz',  emoji: '📋', name: '第一单',     desc: '完成 1 个委托',        goal: 1,
      val: function (s) { return s.stats.orders || 0; }, reward: { coins: 20 }, pts: 1 },
    { id: 'order30',   cat: 'biz',  emoji: '🤝', name: '可靠伙伴',   desc: '累计完成 30 个委托',   goal: 30,
      val: function (s) { return s.stats.orders || 0; }, reward: { coins: 150 }, pts: 3 },
    { id: 'coins1k',   cat: 'biz',  emoji: '💰', name: '小有积蓄',   desc: '金币达到 1000',        goal: 1000,
      val: function (s) { return Math.max(s.coins || 0, 0); }, reward: { coins: 80 }, pts: 2 },
    { id: 'coins10k',  cat: 'biz',  emoji: '🤑', name: '万元户',     desc: '金币达到 10000',       goal: 10000,
      val: function (s) { return Math.max(s.coins || 0, 0); }, reward: { coins: 1500 }, pts: 5 },
    { id: 'day30',     cat: 'biz',  emoji: '📅', name: '一个月',     desc: '经营满 30 天',         goal: 30,
      val: function (s) { return s.day || 1; }, reward: { coins: 50 }, pts: 2 },
    { id: 'day100',    cat: 'biz',  emoji: '🏡', name: '百日农场',   desc: '经营满 100 天',        goal: 100,
      val: function (s) { return s.day || 1; }, reward: { coins: 400 }, pts: 4 },

    /* 收集：6 种正经鱼 + 14 种作物 = 20（杂物和宝箱不进图鉴） */
    { id: 'codexall',  cat: 'all',  emoji: '📖', name: '全图鉴',     desc: '6 种鱼 + 14 种作物都收过', goal: 20,
      val: function (s) { return fishSpeciesOwned(s) + cropSpeciesOwned(s); },
      reward: { coins: 500, ferts: { special: 5 } }, pts: 8 },

    /* v1.7 追加：等级 / 经营 / 长期 */
    { id: 'farmLv3',   cat: 'farm', emoji: '🌿', name: '种田入门',   desc: '种田等级到 Lv3',       goal: 3,
      val: function (s) { return (s.levels && s.levels.farm) || 1; }, reward: { coins: 40 }, pts: 2 },
    { id: 'farmLv6',   cat: 'farm', emoji: '🌻', name: '老把式',     desc: '种田等级到 Lv6',       goal: 6,
      val: function (s) { return (s.levels && s.levels.farm) || 1; }, reward: { ferts: { normal: 6 } }, pts: 3 },
    { id: 'fishLv3',   cat: 'fish', emoji: '🎏', name: '手感来了',   desc: '钓鱼等级到 Lv3',       goal: 3,
      val: function (s) { return (s.levels && s.levels.fish) || 1; }, reward: { bait: { dough: 10 } }, pts: 2 },
    { id: 'fishLv6',   cat: 'fish', emoji: '🐋', name: '河边常客',   desc: '钓鱼等级到 Lv6',       goal: 6,
      val: function (s) { return (s.levels && s.levels.fish) || 1; }, reward: { coins: 300 }, pts: 3 },
    { id: 'cropsold100', cat: 'biz', emoji: '🛒', name: '农产品大客户', desc: '累计卖出 100 个作物', goal: 100,
      val: function (s) { return s.stats.cropsSold || 0; }, reward: { coins: 80 }, pts: 2 },
    { id: 'order100',  cat: 'biz',  emoji: '📦', name: '老主顾',     desc: '累计完成 100 个委托',  goal: 100,
      val: function (s) { return s.stats.orders || 0; }, reward: { coins: 600 }, pts: 5 },
    { id: 'coins50k',  cat: 'biz',  emoji: '🏦', name: '富甲一方',   desc: '金币达到 50000',       goal: 50000,
      val: function (s) { return Math.max(s.coins || 0, 0); }, reward: { coins: 3000 }, pts: 8 },
    { id: 'day200',    cat: 'biz',  emoji: '🗓️', name: '两百天',     desc: '经营满 200 天',        goal: 200,
      val: function (s) { return s.day || 1; }, reward: { coins: 800 }, pts: 6 },
    { id: 'perfect50', cat: 'fish', emoji: '✨', name: '完美猎手',   desc: '钓到 50 条完美品质的鱼', goal: 50,
      val: perfectFish, reward: { coins: 1200 }, pts: 6 },
    { id: 'fishval20k', cat: 'fish', emoji: '🐚', name: '水产大户',  desc: '鱼类累计价值 20000 金', goal: 20000,
      val: fishValueTotal, reward: { coins: 800 }, pts: 5 },
    { id: 'cropval5k', cat: 'farm', emoji: '🌾', name: '粮仓满满',   desc: '作物累计价值 5000 金', goal: 5000,
      val: cropValueTotal, reward: { coins: 300 }, pts: 3 },
    { id: 'net9',      cat: 'fish', emoji: '🕸️', name: '网罗天下',   desc: '渔网放满 9 张',        goal: 9,
      val: function (s) { return s.nets || 0; }, reward: { coins: 200 }, pts: 3 },

    /* v1.9 追加：挖蚯蚓 / 打零工 */
    { id: 'dig50',     cat: 'fish', emoji: '🪱', name: '蚯蚓猎手',   desc: '累计挖蚯蚓 50 次',     goal: 50,
      val: function (s) { return s.stats.dug || 0; }, reward: { coins: 60, bait: { dough: 5 } }, pts: 2 },
    { id: 'dig200',    cat: 'fish', emoji: '🕳️', name: '土里刨食',   desc: '累计挖蚯蚓 200 次',    goal: 200,
      val: function (s) { return s.stats.dug || 0; }, reward: { coins: 300 }, pts: 4 },
    { id: 'work30',    cat: 'biz',  emoji: '🕐', name: '打工人',     desc: '累计打零工 30 次',     goal: 30,
      val: function (s) { return s.stats.works || 0; }, reward: { coins: 150 }, pts: 2 },
    { id: 'work100',   cat: 'biz',  emoji: '🕑', name: '劳模',       desc: '累计打零工 100 次',    goal: 100,
      val: function (s) { return s.stats.works || 0; }, reward: { coins: 600 }, pts: 5 },

    /* v2.2 追加：收购箱 */
    { id: 'box100',    cat: 'biz',  emoji: '📦', name: '第一车货',   desc: '收购箱累计出货 100 件', goal: 100,
      val: function (s) { return s.stats.boxItems || 0; }, reward: { coins: 100 }, pts: 2 },
    { id: 'box500',    cat: 'biz',  emoji: '🚚', name: '物流大户',   desc: '收购箱累计出货 500 件', goal: 500,
      val: function (s) { return s.stats.boxItems || 0; }, reward: { coins: 400, ferts: { normal: 3 } }, pts: 4 },
    { id: 'boxval5k',  cat: 'biz',  emoji: '💴', name: '箱赚五千',   desc: '收购箱累计收益 5000 金', goal: 5000,
      val: function (s) { return s.stats.boxIncome || 0; }, reward: { coins: 300 }, pts: 3 },

    /* v2.3 追加：下午茶 / 宝箱 */
    { id: 'tea10',     cat: 'biz',  emoji: '🍵', name: '喝茶的人',   desc: '累计喝 10 次下午茶',   goal: 10,
      val: function (s) { return s.stats.teas || 0; }, reward: { coins: 80, teas: { green: 2 } }, pts: 2 },
    { id: 'tea30',     cat: 'biz',  emoji: '🫖', name: '下午三点',   desc: '累计喝 30 次下午茶',   goal: 30,
      val: function (s) { return s.stats.teas || 0; }, reward: { coins: 300, teas: { black: 3 } }, pts: 4 },
    { id: 'chest10',   cat: 'fish', emoji: '🪵', name: '开箱手气',   desc: '累计打开 10 个宝箱',   goal: 10,
      val: function (s) { return s.stats.chests || 0; }, reward: { coins: 120 }, pts: 2 },
    { id: 'chest30',   cat: 'fish', emoji: '👑', name: '宝箱猎人',   desc: '累计打开 30 个宝箱',   goal: 30,
      val: function (s) { return s.stats.chests || 0; }, reward: { coins: 500, keys: { iron: 2 } }, pts: 4 },

    /* v2.15 追加：采集 */
    { id: 'forage1',   cat: 'all',  emoji: '🌿', name: '第一次进山', desc: '采集 1 次',             goal: 1,
      val: function (s) { return s.stats.forages || 0; }, reward: { coins: 15 }, pts: 1 },
    { id: 'forage30',  cat: 'all',  emoji: '🧺', name: '跑山人',     desc: '累计采集 30 次',       goal: 30,
      val: function (s) { return s.stats.forages || 0; },
      reward: { coins: 120, ferts: { normal: 2 } }, pts: 2 },
    { id: 'forage120', cat: 'all',  emoji: '🏕️', name: '山野行家',   desc: '累计采集 120 次',      goal: 120,
      val: function (s) { return s.stats.forages || 0; }, reward: { coins: 500 }, pts: 4 },
    { id: 'forage3',   cat: 'all',  emoji: '🎒', name: '满载而归',   desc: '一次采到 3 件野货',    goal: 3,
      val: function (s) { return s.stats.forageBest || 0; }, reward: { coins: 100 }, pts: 2 },
    { id: 'wild4',     cat: 'all',  emoji: '🍄', name: '四季野味',   desc: '荠菜 / 野莓 / 松茸 / 冻梨都采过', goal: 4,
      val: function (s) {
        const w = s.stats.wild || {};
        return WILD_LIST.filter(function (x) { return (w[x.id] || 0) > 0; }).length;
      }, reward: { coins: 250, ferts: { special: 2 } }, pts: 3 },
    { id: 'forageLv5', cat: 'all',  emoji: '🧭', name: '认得百草',   desc: '采集等级到 Lv5',       goal: 5,
      val: function (s) { return (s.levels && s.levels.forage) || 1; },
      reward: { coins: 200, bait: { dough: 10 } }, pts: 3 },

    /* v2.17 追加：设备 */
    { id: 'devSprinkler', cat: 'dev', emoji: '🚿', name: '第一根水管', desc: '买 1 个洒水器',        goal: 1,
      val: function (s) { return s.sprinklers || 0; }, reward: { coins: 30 }, pts: 1 },
    { id: 'devSprinkler10', cat: 'dev', emoji: '⛲', name: '自动灌溉',   desc: '洒水器达到 10 个',     goal: 10,
      val: function (s) { return s.sprinklers || 0; }, reward: { coins: 200 }, pts: 3 },
    { id: 'devHarvester', cat: 'dev', emoji: '🤖', name: '铁牛下地',    desc: '买自动收获器',         goal: 1,
      val: function (s) { return s.harvester ? 1 : 0; }, reward: { coins: 150 }, pts: 2 },
    { id: 'devSeeder',    cat: 'dev', emoji: '🌱', name: '播种流水线',  desc: '买 1 台自动播种器',    goal: 1,
      val: function (s) { return Math.round(s.seeder || 0); }, reward: { coins: 150 }, pts: 2 },
    { id: 'devSeeder4',   cat: 'dev', emoji: '🏭', name: '育苗车间',    desc: '自动播种器达到 4 台',  goal: 4,
      val: function (s) { return Math.round(s.seeder || 0); }, reward: { coins: 400 }, pts: 4 },
    { id: 'devAuto',      cat: 'dev', emoji: '🏗️', name: '全自动农场',  desc: '洒水器 5 个 + 自动收获器 + 播种器 2 台',
      goal: 1,
      val: function (s) {
        return ((s.sprinklers || 0) >= 5 && s.harvester && Math.round(s.seeder || 0) >= 2) ? 1 : 0;
      },
      reward: { coins: 500, ferts: { special: 2 } }, pts: 5 }
  ];

  const ACH_CATS = { farm: '🌱 种田', fish: '🎣 钓鱼', dev: '🔧 设备', biz: '💰 经营', all: '🏆 收集' };

  /* 成就奖励文案：成就点 + 金币 / 种子 / 肥料 / 饵料 / 茶 / 钥匙 */
  function rewardText(a) {
    const parts = [];
    if (a.pts) parts.push(a.pts + ' 点');
    const r = a.reward || {};
    if (r.coins) parts.push(r.coins + ' 金');
    ['seeds', 'ferts', 'bait', 'teas', 'keys'].forEach(function (k) {
      const bag = r[k] || {};
      Object.keys(bag).forEach(function (id) {
        let name = id;
        if (k === 'seeds' && CROPS[id]) name = CROPS[id].name + '种子';
        if (k === 'ferts' && FERT[id]) name = FERT[id].name;
        if (k === 'bait') name = id === 'worm' ? '蚯蚓' : '面团饵';
        if (k === 'teas' && TEAS[id]) name = TEAS[id].name;
        if (k === 'keys' && KEYS[id]) name = KEYS[id].name;
        parts.push(name + '×' + bag[id]);
      });
    });
    return '奖励 ' + parts.join(' · ');
  }

  function applyReward(s, r, label) {
    r = r || {};
    if (r.coins) addCoins(s, r.coins, label || '成就奖励');
    Object.keys(r.seeds || {}).forEach(function (id) {
      s.seeds[id] = (s.seeds[id] || 0) + r.seeds[id];
    });
    Object.keys(r.ferts || {}).forEach(function (id) {
      s.ferts[id] = (s.ferts[id] || 0) + r.ferts[id];
    });
    Object.keys(r.bait || {}).forEach(function (id) {
      s.bait[id] = (s.bait[id] || 0) + r.bait[id];
    });
    Object.keys(r.teas || {}).forEach(function (id) {
      s.teas = s.teas || {};
      s.teas[id] = (s.teas[id] || 0) + r.teas[id];
    });
    Object.keys(r.keys || {}).forEach(function (id) {
      s.keys = s.keys || {};
      s.keys[id] = (s.keys[id] || 0) + r.keys[id];
    });
  }

  /* 成就点 → 售价加成：每 10 点 +1%，最多 +20% */
  function achPts(s) {
    s.ach = s.ach || {};
    return ACH.reduce(function (n, a) { return n + (s.ach[a.id] ? (a.pts || 0) : 0); }, 0);
  }
  function sellBonus(s) {
    return 1 + Math.min(0.2, Math.floor(achPts(s) / 10) * 0.01);
  }

  /* 检查并解锁：点数 + 实质奖励一起发放 */
  function checkAchievements(s) {
    s.ach = s.ach || {};
    const out = [];
    ACH.forEach(function (a) {
      if (s.ach[a.id]) return;
      if (a.val(s) < a.goal) return;
      s.ach[a.id] = s.day;
      applyReward(s, a.reward);
      const bonus = Math.round((sellBonus(s) - 1) * 100);
      log(s, '🏆 成就解锁：' + a.emoji + ' ' + a.name + '（' + rewardText(a) +
        ' · 售价 +' + bonus + '%）', 'good');
      out.push({ id: a.id, name: a.name, emoji: a.emoji, pts: a.pts, bonus: bonus, text: rewardText(a) });
    });
    return out;
  }

  /* 单个成就的进度信息，给界面用 */
  function achInfo(s) {
    s.ach = s.ach || {};
    return ACH.map(function (a) {
      const cur = Math.min(a.val(s), a.goal);
      return { id: a.id, cat: a.cat, emoji: a.emoji, name: a.name, desc: a.desc,
               goal: a.goal, cur: cur, done: !!s.ach[a.id], day: s.ach[a.id] || 0,
               pts: a.pts, reward: rewardText(a) };
    });
  }

/* ==================== src/03-core.js ==================== */
/* 基础工具：随机、季节、等级、等级解锁 */
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

  /* 季节：每 30 天换一季，冬天（第 4 季）土地封冻、河面结冰 */
  const SEASONS = ['春', '夏', '秋', '冬'];
  const WINTER = 3;
  function seasonIdx(day) {
    return Math.floor((Math.max(1, day || 1) - 1) / BALANCE.seasonDays) % 4;
  }
  function seasonOf(day) { return SEASONS[seasonIdx(day)]; }
  function isWinter(day) { return seasonIdx(day) === WINTER; }

  /* 这种作物现在能不能种 / 买 */
  function cropSeasonOk(id, day) {
    const c = CROPS[id];
    if (!c) return false;
    return (c.seasons || [0, 1, 2]).indexOf(seasonIdx(day)) >= 0;
  }
  function seasonText(id) {
    const c = CROPS[id];
    const ss = (c && c.seasons) || [];
    return ss.map(function (i) { return SEASONS[i]; }).join('·');
  }

  /* 天气按季节抽：权重表见 SEASON_WEATHER（冬天会下雪） */
  function seasonWeatherTable(day) {
    const t = SEASON_WEATHER[seasonIdx(day)] || SEASON_WEATHER[0];
    return Object.keys(t).filter(function (id) { return t[id] > 0 && WEATHER[id]; })
      .map(function (id) { return { id: id, w: t[id] }; });
  }
  function rollWeather(day) { return weighted(seasonWeatherTable(day || 1), 'w').id; }

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

  /* ---------------- 等级（种田 / 钓鱼 / 挖蚯蚓 / 采集 / 交易） ---------------- */

  const SKILLS = ['farm', 'fish', 'dig', 'forage', 'trade'];
  const SKILL_NAME = { farm: '种田', fish: '钓鱼', dig: '挖蚯蚓', forage: '采集', trade: '交易' };

  /* 交易等级用一条更长的曲线（经验来自交易额，来得快） */
  function levelNeed(lv, kind) {
    const l = lv || 1;
    if (kind === 'trade') {
      const T = BALANCE.trade;
      return T.xpBase + T.xpStep * (l - 1);
    }
    const L = BALANCE.level;
    return L.xpBase + L.xpStep * (l - 1);
  }

  /* 挖蚯蚓每 4 级 +1 条（Lv4 / Lv8） */
  function digYieldBonus(s) {
    return Math.floor(skillLv(s, 'dig') / BALANCE.dig.yieldAt);
  }
  /* 采集每 4 级多取一次品质（Lv4 / Lv8），效果等同施肥 */
  function forageRolls(s) {
    return 1 + Math.floor(skillLv(s, 'forage') / BALANCE.forage.qualityAt);
  }

  function tradeLv(s) { return skillLv(s, 'trade'); }
  /* 交易等级：商店进价小幅下调 */
  function tradeCut(s) {
    const T = BALANCE.trade;
    return 1 - Math.min(T.maxCut, (tradeLv(s) - 1) * T.buyCut);
  }
  /* 交易经验：按成交金额给（每 5 金 1 点） */
  function tradeXp(s, gold) {
    const g = Math.max(0, Math.round(gold || 0));
    if (!g) return 0;
    return addLevelXp(s, 'trade', g / BALANCE.trade.xpPer);
  }

  function levelEffectText(kind, lv) {
    const max = BALANCE.level.max;
    if (kind === 'fish') {
      return '咬钩 +' + Math.min(10, (lv - 1) * 1.1).toFixed(1) + '% · 好鱼 +' +
        Math.min(22.5, (lv - 1) * 2.5).toFixed(1) + '%';
    }
    if (kind === 'dig') {
      return '挖蚯蚓 ' + digCostByLv(lv) + ' 体力 · 产量 +' + Math.floor(lv / BALANCE.dig.yieldAt) +
        (lv >= max ? '（满级已省 1 点）' : '');
    }
    if (kind === 'forage') {
      return '采集 ' + forageCostByLv(lv) + ' 体力 · 品质 ×' +
        (1 + Math.floor(lv / BALANCE.forage.qualityAt)) +
        (lv >= max ? '（满级已省 1 点）' : '');
    }
    if (kind === 'trade') {
      return '商店进价 −' + (Math.min(BALANCE.trade.maxCut, (lv - 1) * BALANCE.trade.buyCut) * 100).toFixed(1) + '%';
    }
    return '收获产量 +' + Math.floor(lv / 4);
  }

  /* 满级奖励：挖蚯蚓 3→2、采集 5→4 */
  function digCostByLv(lv) {
    return BALANCE.dig.energy - ((lv >= BALANCE.level.max) ? BALANCE.level.maxEnergySave : 0);
  }
  function forageCostByLv(lv) {
    return BALANCE.forage.energy - ((lv >= BALANCE.level.max) ? BALANCE.level.maxEnergySave : 0);
  }
  function digCost(s) { return digCostByLv(skillLv(s, 'dig')); }
  function forageCost(s) { return forageCostByLv(skillLv(s, 'forage')); }

  /* 加经验，返回升了几级 */
  function addLevelXp(s, kind, n) {
    if (!s.levels) s.levels = {};
    const key = SKILLS.indexOf(kind) >= 0 ? kind : 'farm';
    const xpKey = key + 'Xp';
    if (!s.levels[key]) s.levels[key] = 1;
    // n 省略时默认 +1；显式传 0 就是「这一杆不给经验」
    const gain = (n === undefined || n === null) ? 1 : Math.max(0, Math.round(n));
    s.levels[xpKey] = (s.levels[xpKey] || 0) + gain;
    let ups = 0;
    while (s.levels[key] < BALANCE.level.max && s.levels[xpKey] >= levelNeed(s.levels[key], key)) {
      s.levels[xpKey] -= levelNeed(s.levels[key], key);
      s.levels[key]++;
      ups++;
    }
    if (s.levels[key] >= BALANCE.level.max) {
      s.levels[xpKey] = Math.min(s.levels[xpKey], levelNeed(BALANCE.level.max, key) - 1);
    }
    if (ups) {
      log(s, '⭐ ' + SKILL_NAME[key] + '等级 → Lv' + s.levels[key] +
        '（' + levelEffectText(key, s.levels[key]) + '）', 'good');
    }
    return ups;
  }

  /* 种田等级：每 yieldEvery 级 +1 产量（普通作物）；大作物不吃等级 */
  function farmYieldBonus(s) {
    return Math.floor((((s.levels && s.levels.farm) || 1)) / BALANCE.level.yieldEvery);
  }
  /* 钓鱼等级：咬钩率 +hookPerLv/级（上限 +hookMax），好鱼权重 +goodPerLv/级（上限 +goodMax） */
  function fishHookBonus(s) {
    const L = BALANCE.level;
    return Math.min(L.hookMax, L.hookPerLv * ((((s.levels && s.levels.fish) || 1)) - 1));
  }
  function fishGoodBonus(s) {
    const L = BALANCE.level;
    return 1 + Math.min(L.goodMax, L.goodPerLv * ((((s.levels && s.levels.fish) || 1)) - 1));
  }

  /* ---------------- 等级解锁 ---------------- */

  function farmLv(s) { return (s.levels && s.levels.farm) || 1; }
  function fishLv(s) { return (s.levels && s.levels.fish) || 1; }
  function digLv(s) { return (s.levels && s.levels.dig) || 1; }
  function forageLv(s) { return (s.levels && s.levels.forage) || 1; }
  function skillLv(s, kind) { return (s.levels && s.levels[kind]) || 1; }

  /* 种子：高级种子要种田等级 */
  function seedUnlocked(s, id) {
    const c = CROPS[id];
    return !!c && farmLv(s) >= (c.lv || 1);
  }
  /* 肥料：特效肥要种田等级 */
  function fertUnlocked(s, kind) {
    const f = FERT[kind];
    return !!f && farmLv(s) >= (f.lv || 1);
  }
  function sprinklerUnlocked(s) { return farmLv(s) >= BALANCE.gate.sprinkler; }
  function harvesterUnlocked(s) { return farmLv(s) >= BALANCE.gate.harvester; }
  function netUnlocked(s) { return fishLv(s) >= BALANCE.gate.net; }
  /* 渔网上限随钓鱼等级提高：钓鱼 Lv2 可放 4 张，Lv7 起封顶 9 张 */
  function netMax(s) {
    if (!netUnlocked(s)) return 0;
    return Math.min(NET_MAX, BALANCE.gate.netBase + fishLv(s));
  }

/* ==================== src/04-state.js ==================== */
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
      codex: { fish: {}, crops: {} },
      codexClaim: {},
      manualRefreshUsed: false,
      workUsed: false,
      bait: { worm: 0, dough: 0, premium: 0 },
      lure: { owned: false, dur: 0 },
      lure2: { owned: false, dur: 0 },
      teas: { green: 0, black: 0, milk: 0, coffee: 0 },
      keys: { iron: 0, gold: 0 },
      teaUsed: false,
      ledger: [{ day: 1, label: '开局金币', income: 50, expense: 0, balance: 50 }],
      log: [{ day: 1, text: '🌾 欢迎来到我的小农场，第 1 天开始了。', kind: 'sys' }],
      orders: makeOrders({ day: 1 }),
      longOrder: null,
      longOrderReadyDay: 0,
      shop: makeShop(1),
      cropShop: makeCropShop(1),
      levels: { farm: 1, fish: 1, farmXp: 0, fishXp: 0, dig: 1, digXp: 0, forage: 1, forageXp: 0,
                trade: 1, tradeXp: 0 },
      ach: {},
      fishBook: { count: 0, entries: [], best: null, priciest: null },
      stats: { harvests: 0, casts: 0, dug: 0, planted: 0, orders: 0, cropsSold: 0, works: 0,
               longOrders: 0, boxItems: 0, boxIncome: 0, teas: 0, chests: 0, forages: 0,
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

/* ==================== src/05-farm.js ==================== */
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

/* ==================== src/06-trade.js ==================== */
/* 卖鱼与仓库（作物按品质分桶） */
  /* ---------------- 卖鱼 ---------------- */

  /* 渔获按「鱼名」分组（不同品质合并成一组，和仓库里的作物一样），杂物 / 宝箱按名字 + 种类 */
  function fishKey(e) { return e.name + (e.chest ? '|' + e.chest : ''); }

  /* 仓库渔获的一句话简述（鱼和杂物都有） */
  function fishDesc(name) {
    for (let i = 0; i < FISH.length; i++) if (FISH[i].name === name) return FISH[i].desc || '';
    for (let i = 0; i < TRASH.length; i++) if (TRASH[i].name === name) return TRASH[i].desc || '';
    return '';
  }

  /* 杂物 / 宝箱：水产店不收，只能拿去百货店或收购箱 */
  function fishIsJunk(e) {
    if (!e) return false;
    if (e.trash || e.chest) return true;
    // 老存档里的杂物可能没带 trash 标记，按名字兜底
    return TRASH_NAMES.indexOf(e.name) >= 0;
  }

  /* 渔获分组：mode='fish' 只看鱼 / 'junk' 只看杂物和宝箱 / 不传就是全部
   * 同一鱼种的不同品质合并成一行，mix 里带品质构成（界面上直接显示） */
  function fishGroups(s, mode) {
    const map = new Map();
    (s.fishBag || []).forEach(function (e) {
      if (!e) return;
      const junk = fishIsJunk(e);
      if (mode === 'fish' && junk) return;
      if (mode === 'junk' && !junk) return;
      const key = fishKey(e);
      let g = map.get(key);
      if (!g) {
        g = { key: key, name: e.name, emoji: e.emoji, count: 0, total: 0,
              junk: junk, chest: e.chest || null, mix: [], q: null, v: 0 };
        map.set(key, g);
      }
      g.count++;
      g.total += e.v || 0;
      const q = qualityById(e.q);
      let m = g.mix.filter(function (x) { return x.id === (e.q || '-'); })[0];
      if (!m) {
        m = { id: e.q || '-', n: 0, v: e.v || 0,
              name: q ? q.name : '杂物', emoji: q ? q.emoji : '🗑️',
              color: q ? q.color : 'var(--ink-3)' };
        g.mix.push(m);
      }
      m.n++;
      if (q && (!g.q || QUALITY.indexOf(q) > QUALITY.indexOf(qualityById(g.q)))) g.q = e.q;
    });
    map.forEach(function (g) {
      g.v = Math.round(g.total / Math.max(1, g.count));
      g.mix.sort(function (a, b) {
        return QUALITY.indexOf(qualityById(b.id)) - QUALITY.indexOf(qualityById(a.id));
      });
    });
    return Array.from(map.values()).sort(function (a, b) { return b.total - a.total; });
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

/* ==================== src/07-market.js ==================== */
/* 市场价格：供需、季节、小镇声望、掉档提示、价格历史 */
  /* ---------------- 市场价格 ----------------
   * 供给：最近卖得越多越便宜（×1.30 稀缺 → ×0.70 过剩，作物每件 -0.015、鱼每条 -0.010）
   * 批量：按「批次中点」取供需（一次卖 n 件 = 在这 n 件的中间点定价），
   *       所以整批砸和分批卖的单位价一样，堵住「攒一大票一次出货」的漏洞
   * 季节：当季 / 汛期 ×1.00，反季 / 非汛期 ×1.70（物以稀为贵）
   * 冷却：每睡一觉销量回落 25%
   */
  function marketTag(supply) {
    const M = BALANCE.market;
    if (supply >= M.scarce) return '稀缺';
    if (supply <= M.glut) return '过剩';
    return '平稳';
  }

  /* 一批 n 件的定价位置：批次中点（sold 是成交前的销量） */
  function midSold(sold, n) {
    const cnt = Math.max(1, Math.round(n || 1));
    return sold + (cnt - 1) / 2;
  }

  function marketOf(s, id) {
    s.market = s.market || {};
    if (!s.market[id]) s.market[id] = { sold: 0 };
    return s.market[id];
  }
  function marketSold(s, id) { return (s.market && s.market[id] && s.market[id].sold) || 0; }

  function marketInfo(s, id, n, soldBase) {
    const M = BALANCE.market;
    const sold = soldBase == null ? marketSold(s, id) : soldBase;
    const supply = clamp(M.supplyMax - M.cropStep * midSold(sold, n), M.supplyMin, M.supplyMax);
    const inSeason = CROPS[id] ? cropSeasonOk(id, s.day) : true;
    const season = inSeason ? 1 : M.offSeason;
    const total = supply * season * (1 + townBonus(s, 'marketBonus'));
    return { sold: sold, supply: supply, season: season, inSeason: inSeason, total: total,
             tag: marketTag(supply) };
  }
  function marketMul(s, id, n, soldBase) { return marketInfo(s, id, n, soldBase).total; }
  function addSupply(s, id, n) { marketOf(s, id).sold += Math.max(0, n || 0); }
  function removeSupply(s, id, n) {
    const m = s.market && s.market[id];
    if (!m) return;
    m.sold = Math.max(0, Math.round(((m.sold || 0) - Math.max(0, n || 0)) * 10) / 10);
    if (m.sold <= 0) delete s.market[id];
  }

  /* ---------------- 鱼的市场（供需 + 汛期） ---------------- */
  function fishMarketOf(s, name) {
    s.marketF = s.marketF || {};
    if (!s.marketF[name]) s.marketF[name] = { sold: 0 };
    return s.marketF[name];
  }
  function fishMarketInfo(s, name, n, soldBase) {
    const M = BALANCE.market;
    const sold = soldBase == null
      ? ((s.marketF && s.marketF[name] && s.marketF[name].sold) || 0)
      : soldBase;
    const supply = clamp(M.supplyMax - M.fishStep * midSold(sold, n), M.supplyMin, M.supplyMax);
    const f = fishByName(name);
    const inRun = f && f.seasons ? f.seasons.indexOf(seasonIdx(s.day)) >= 0 : true;
    const season = inRun ? 1 : M.offSeason;
    const total = supply * season * (1 + townBonus(s, 'marketBonus'));
    return { sold: sold, supply: supply, season: season, inRun: inRun, total: total,
             tag: marketTag(supply) };
  }
  function fishMarketMul(s, name, n, soldBase) { return fishMarketInfo(s, name, n, soldBase).total; }
  function addFishSupply(s, name, n) { fishMarketOf(s, name).sold += Math.max(0, n || 0); }
  function removeFishSupply(s, name, n) {
    const m = s.marketF && s.marketF[name];
    if (!m) return;
    m.sold = Math.max(0, Math.round(((m.sold || 0) - Math.max(0, n || 0)) * 10) / 10);
    if (m.sold <= 0) delete s.marketF[name];
  }

  /* ---------------- 小镇声望（捐钱换永久加成，后期金币出口） ---------------- */
  function townTier(s) {
    const T = BALANCE.town;
    let t = 0;
    for (let i = 0; i < T.length; i++) if ((s.townDonated || 0) >= T[i].need) t = i + 1;
    return t;
  }
  /* 已解锁档位的某项加成之和 */
  function townBonus(s, key) {
    const T = BALANCE.town, t = townTier(s);
    let v = 0;
    for (let i = 0; i < t; i++) v += (T[i][key] || 0);
    return v;
  }
  function townNext(s) {
    const t = townTier(s);
    return t >= BALANCE.town.length ? null : BALANCE.town[t];
  }
  function donate(s, amount) {
    const amt = Math.max(1, Math.floor(amount || 0));
    if ((s.coins || 0) < amt) return { ok: false, msg: '金币不够（要捐 ' + amt + ' 金）' };
    const before = townTier(s);
    s.coins -= amt;
    s.townDonated = (s.townDonated || 0) + amt;
    ledger(s, '捐赠小镇', 0, amt);
    const after = townTier(s);
    const up = after > before ? BALANCE.town[after - 1] : null;
    log(s, '🏘️ 给小镇捐了 ' + amt + ' 金' + (up ? '，解锁「' + up.name + '」：' + up.desc : ''), 'good');
    return { ok: true, msg: up ? '解锁「' + up.name + '」：' + up.desc : '捐了 ' + amt + ' 金',
             tier: after, unlocked: !!up };
  }

  /* ---------------- 还能卖多少（行情面板提示） ---------------- */
  function headroomOf(sold, step) {
    const M = BALANCE.market;
    const supply = clamp(M.supplyMax - step * sold, M.supplyMin, M.supplyMax);
    const need = function (target) {
      return Math.max(0, Math.ceil((M.supplyMax - target) / step - sold - 1e-6));
    };
    return { supply: supply,
             toCalm: supply > M.scarce ? need(M.scarce) : 0,
             toGlut: supply > M.glut ? need(M.glut) : 0,
             toFloor: need(M.supplyMin),
             atFloor: supply <= M.supplyMin + 1e-9 };
  }
  function marketHeadroom(s, id) {
    return headroomOf(marketSold(s, id), BALANCE.market.cropStep);
  }
  function fishMarketHeadroom(s, name) {
    const sold = (s.marketF && s.marketF[name] && s.marketF[name].sold) || 0;
    return headroomOf(sold, BALANCE.market.fishStep);
  }

  /* ---------------- 价格历史（市场分析面板 + 曲线） ---------------- */
  const HIST_DAYS = 30;

  function pushMarketHist(s, key, mul) {
    s.marketHist = s.marketHist || {};
    const arr = s.marketHist[key] || (s.marketHist[key] = []);
    const m = Math.round(mul * 100) / 100;
    const last = arr[arr.length - 1];
    if (last && last.d === s.day) { last.m = m; return arr; }
    arr.push({ d: s.day, m: m });
    if (arr.length > HIST_DAYS) arr.splice(0, arr.length - HIST_DAYS);
    return arr;
  }

  /* 每天睡醒记一次市价，攒出曲线（水果和作物同属仓库货，一起记） */
  function snapshotMarket(s) {
    CROP_LIST.forEach(function (c) { pushMarketHist(s, c.id, marketMul(s, c.id)); });
    WILD_LIST.forEach(function (c) { pushMarketHist(s, c.id, marketMul(s, c.id)); });
    FRUIT_LIST.forEach(function (c) { pushMarketHist(s, c.id, marketMul(s, c.id)); });
    FISH.forEach(function (f) {
      if (f.trash || f.chest) return;
      pushMarketHist(s, 'f:' + f.name, fishMarketMul(s, f.name));
    });
  }

  /* 画曲线用：历史 + 今天的实时值（当天那个点直接用实时值覆盖） */
  function marketSeries(s, key, live) {
    const arr = (s.marketHist && s.marketHist[key]) || [];
    const out = arr.map(function (p) { return p.m; });
    if (typeof live === 'number') {
      if (!out.length) out.push(live);
      else if (arr[arr.length - 1].d === s.day) out[out.length - 1] = live;
      else out.push(live);
    }
    return out;
  }

  /* 预计下一季的系数：作物看下季在不在成熟季，鱼看下季在不在汛期 */
  function nextSeasonIdx(day) { return (seasonIdx(day) + 1) % 4; }
  function cropNextSeasonMul(s, id) {
    const c = CROPS[id];
    const ns = nextSeasonIdx(s.day);
    const inS = !!(c && c.seasons && c.seasons.indexOf(ns) >= 0);
    return inS ? 1 : BALANCE.market.offSeason;
  }
  function fishNextSeasonMul(s, name) {
    const f = fishByName(name);
    const ns = nextSeasonIdx(s.day);
    const inS = !f || !f.seasons || f.seasons.indexOf(ns) >= 0;
    return inS ? 1 : BALANCE.market.offSeason;
  }

  /* 从渔获袋里按「品质差的先出」取 n 条同名鱼，返回 parts */
  function takeFishN(s, key, n) {
    const idx = [];
    (s.fishBag || []).forEach(function (e, i) { if (fishKey(e) === key) idx.push(i); });
    idx.sort(function (a, b) {
      const qa = QUALITY.indexOf(qualityById(s.fishBag[a].q));
      const qb = QUALITY.indexOf(qualityById(s.fishBag[b].q));
      return qa - qb;
    });
    const picked = idx.slice(0, Math.max(0, Math.min(idx.length, n)));
    const set = picked.map(function (i) { return s.fishBag[i]; });
    const parts = [];
    set.forEach(function (e) {
      const qid = e.q || '-';
      let p = parts.filter(function (x) { return x.q === qid && x.unit === e.v; })[0];
      if (!p) { p = { q: qid, n: 0, unit: e.v || 0 }; parts.push(p); }
      p.n++;
    });
    s.fishBag = (s.fishBag || []).filter(function (e) { return set.indexOf(e) < 0; });
    return parts;
  }

  /* 商店直接收购只给 8 折；想卖原价就放收购箱，等第二天结算 */
  function shopValue(v) { return Math.max(1, Math.round((v || 0) * BALANCE.shop.sellRate)); }
  function shopSellValue(s, id, n) {
    const cnt = n == null ? storeCount(s, id) : n;
    return Math.max(1, Math.round(shopValue(storeValue(s, id)) * sellBonus(s) * marketMul(s, id, cnt)));
  }

  /* 走收购箱的预估到手：按当前市价、扣手续费（实际以次日结算价为准） */
  function cropNetEstimate(s, id, n) {
    const cnt = n == null ? storeCount(s, id) : n;
    if (!cnt) return 0;
    return Math.max(1, Math.round(storeValue(s, id) * sellBonus(s) * marketMul(s, id, cnt) *
      (1 - BALANCE.market.boxFee)));
  }
  function fishNetEstimate(s, name, count, total) {
    if (!count) return 0;
    return Math.max(1, Math.round((total || 0) * sellBonus(s) * fishMarketMul(s, name, count) *
      (1 - BALANCE.market.boxFee)));
  }
  /* 仓库里的作物 + 渔获全走收购箱的预估到手（界面统一用这个口径） */
  function storeNetEstimate(s) {
    let v = 0;
    Object.keys(s.store || {}).forEach(function (id) {
      if (CROPS[id] && storeCount(s, id)) v += cropNetEstimate(s, id);
    });
    fishGroups(s, 'fish').forEach(function (g) { v += fishNetEstimate(s, g.name, g.count, g.total); });
    return v;
  }

  function sellFishGroup(s, key) {
    const g = fishGroups(s, 'fish').filter(function (x) { return x.key === key; })[0];
    if (!g) return { ok: false, msg: '仓库里没有这种鱼' };
    const gain = Math.max(1, Math.round(shopValue(g.total) * sellBonus(s) * fishMarketMul(s, g.name, g.count)));
    s.fishBag = s.fishBag.filter(function (e) { return fishKey(e) !== key; });
    addFishSupply(s, g.name, g.count);
    addCoins(s, gain, '卖鱼 ' + g.name);
    log(s, '💰 卖出 ' + g.emoji + ' ' + g.name + ' ×' + g.count + '，+' + gain + ' 金（8 折）', 'good');
    return { ok: true, msg: '卖出 ' + g.name + '×' + g.count + '，+' + gain + ' 金', income: gain };
  }

  function sellAllFish(s) {
    const groups = fishGroups(s, 'fish');
    if (!groups.length) return { ok: false, msg: '仓库里没有鱼（杂物和宝箱要去百货店）' };
    let gain = 0, n = 0;
    groups.forEach(function (g) {
      gain += Math.max(1, Math.round(shopValue(g.total) * sellBonus(s) * fishMarketMul(s, g.name, g.count)));
      addFishSupply(s, g.name, g.count);
      n += g.count;
    });
    s.fishBag = (s.fishBag || []).filter(function (e) { return fishIsJunk(e); });
    addCoins(s, gain, '卖鱼');
    log(s, '💰 卖出全部渔获 ' + n + ' 条，+' + gain + ' 金（8 折）', 'good');
    return { ok: true, msg: '卖出 ' + n + ' 条鱼，+' + gain + ' 金', income: gain };
  }

/* ==================== src/08-box.js ==================== */
/* 收购箱（按入箱时的市价锁价，睡觉结算） */
  /* ---------------- 收购箱 ---------------- */

  function boxCount(s) { return (s.box || []).length; }

  function boxRaw(e) { return e.raw != null ? e.raw : (e.v || 0); }
  function boxSold(e) { return e.sold != null ? e.sold : 0; }
  function boxKeyOf(e) { return e.kind === 'crop' ? 'c:' + e.id : 'f:' + e.name; }

  /* 同一品种的几批货合成一批：按「入箱时供需的批次中点」锁价，
   * 所以拆成几批放进去和一次全放，价格完全一样。
   * 出箱时只跟随当天季节（换季会影响），不再吃隔夜回落的红利。 */
  function boxGroups(s) {
    const map = {}, out = [];
    (s.box || []).forEach(function (e) {
      const key = boxKeyOf(e);
      if (!map[key]) {
        map[key] = { key: key, kind: e.kind, id: e.id, name: e.name,
                     junk: e.kind === 'fish' && fishIsJunk(e),
                     n: 0, raw: 0, sold: boxSold(e) };
        out.push(map[key]);
      }
      const g = map[key];
      g.n += e.n || 1;
      g.raw += boxRaw(e);
      g.sold = Math.min(g.sold, boxSold(e));
    });
    return out;
  }

  /* 一组货的到手金额：锁定供需 × 出箱当天季节 × 成就加成 ×（1−手续费） */
  function boxGroupNet(s, g) {
    const mkt = g.junk ? 1
      : (g.kind === 'fish'
        ? fishMarketMul(s, g.name, g.n, g.sold)
        : marketMul(s, g.id, g.n, g.sold));
    return Math.max(1, Math.round(g.raw * sellBonus(s) * mkt * (1 - BALANCE.market.boxFee)));
  }

  /* 单个批次的展示金额：按它在同品种里的原价占比分摊 */
  function boxEntryNet(s, e) {
    const groups = boxGroups(s);
    let g = null;
    for (let i = 0; i < groups.length; i++) if (groups[i].key === boxKeyOf(e)) { g = groups[i]; break; }
    if (!g) return 0;
    const total = boxGroupNet(s, g);
    if (g.raw <= 0) return total;
    return Math.max(0, Math.round(total * boxRaw(e) / g.raw));
  }

  function boxValue(s) {
    return boxGroups(s).reduce(function (n, g) { return n + boxGroupNet(s, g); }, 0);
  }

  /* 从仓库按「品质差的先出」取 n 个，返回 parts 与总价值 */
  function takeStoreN(s, id, n) {
    const parts = [];
    let left = n;
    Q_IDS.forEach(function (q) {
      if (!left) return;
      const b = s.store[id];
      const have = (b && b[q]) || 0;
      if (!have) return;
      const take = Math.min(have, left);
      b[q] = have - take;
      left -= take;
      parts.push({ q: q, n: take, unit: unitValue(id, q) });
    });
    if (s.store[id] && storeCount(s, id) === 0) delete s.store[id];
    return { parts: parts, left: left };
  }

  /* 放进收购箱：只记账，不压价、不计销量；入箱那一刻的供需被锁进批次里 */
  function boxPutCrop(s, id, n) {
    const have = storeCount(s, id);
    if (!have) return { ok: false, msg: '仓库里没有这种作物' };
    const qty = Math.max(1, Math.min(have, Math.floor(n || have)));
    const c = CROPS[id];
    const t = takeStoreN(s, id, qty);
    const raw = t.parts.reduce(function (a, p) { return a + p.n * p.unit; }, 0);
    s.box = s.box || [];
    const entry = { kind: 'crop', id: id, name: c.name, emoji: c.emoji, n: qty, parts: t.parts,
                    raw: raw, sold: marketSold(s, id) };
    s.box.push(entry);
    log(s, '📦 ' + c.name + '×' + qty + ' 放进收购箱（按入箱时市价约 ' + boxEntryNet(s, entry) +
      ' 金，睡觉结算，扣 ' + Math.round(BALANCE.market.boxFee * 100) + '% 手续费）', 'info');
    return { ok: true, msg: c.name + '×' + qty + ' 已入箱', v: boxEntryNet(s, entry), n: qty };
  }

  /* 放进收购箱：鱼、杂物、宝箱都收；杂物 / 宝箱不吃市价 */
  function boxPutFish(s, key, n) {
    const g = fishGroups(s).filter(function (x) { return x.key === key; })[0];
    if (!g) return { ok: false, msg: '没有这种渔获' };
    const qty = Math.max(1, Math.min(g.count, Math.floor(n || g.count)));
    const parts = takeFishN(s, key, qty);
    const raw = parts.reduce(function (a, p) { return a + p.n * p.unit; }, 0);
    const soldNow = (s.marketF && s.marketF[g.name] && s.marketF[g.name].sold) || 0;
    s.box = s.box || [];
    const entry = { kind: 'fish', name: g.name, emoji: g.emoji, n: qty, parts: parts, raw: raw,
                    sold: soldNow,
                    chest: g.chest || undefined, junk: g.junk || undefined,
                    trash: (g.junk && !g.chest) ? true : undefined };
    s.box.push(entry);
    log(s, '📦 ' + g.emoji + ' ' + g.name + '×' + qty + ' 放进收购箱（按入箱时市价约 ' +
      boxEntryNet(s, entry) + ' 金，睡觉结算）', 'info');
    return { ok: true, msg: g.name + '×' + qty + ' 已入箱', v: boxEntryNet(s, entry), n: qty };
  }

  /* 从某一批里取回 take 件（就地修改 entry，鱼和作物共用 parts）
   * 入箱时不计销量，所以取回也不用回滚市场。 */
  function takeFromEntry(s, e, take) {
    const total = e.n || 1;
    const t = Math.min(total, take);
    const parts = (e.parts && e.parts.length)
      ? e.parts.map(function (p) { return { q: p.q, n: p.n, unit: p.unit }; })
      : [{ q: 'std', n: total, unit: Math.max(1, Math.round((e.raw || e.v || 1) / total)) }];
    let remain = t;
    const kept = [];
    parts.forEach(function (p) {
      if (remain <= 0) { kept.push({ q: p.q, n: p.n, unit: p.unit }); return; }
      const cut = Math.min(p.n, remain);
      remain -= cut;
      if (e.kind === 'crop') {
        if (e.id) addStore(s, e.id, p.q, cut);
      } else {
        for (let i = 0; i < cut; i++) {
          s.fishBag.push({ name: e.name, emoji: e.emoji, q: (p.q && p.q !== '-') ? p.q : null,
                           v: p.unit, d: s.day, no: e.junk || undefined,
                           chest: e.chest || undefined, trash: e.trash || undefined });
        }
      }
      if (p.n - cut > 0) kept.push({ q: p.q, n: p.n - cut, unit: p.unit });
    });
    e.parts = kept;
    e.n = total - t;
    e.raw = Math.max(1, Math.round((e.raw != null ? e.raw : (e.v || 1)) * e.n / total));
    return t;
  }

  /* 从收购箱取回 n 件（不传 n 就全取） */
  function boxTake(s, n) {
    const list = s.box || [];
    if (!list.length) return { ok: false, msg: '收购箱是空的' };
    let left = n ? Math.max(1, Math.floor(n)) : Infinity;
    let took = 0;
    const rest = [];
    list.forEach(function (e) {
      if (left <= 0) { rest.push(e); return; }
      const t = takeFromEntry(s, e, left);
      left -= t; took += t;
      if (e.n > 0) rest.push(e);
    });
    s.box = rest;
    log(s, '📦 从收购箱取回 ' + took + ' 件', 'info');
    return { ok: true, msg: '取回 ' + took + ' 件', n: took };
  }

  /* 从收购箱取回指定批次 n 件 */
  function boxTakeEntry(s, idx, n) {
    const list = s.box || [];
    const e = list[idx];
    if (!e) return { ok: false, msg: '没有这一项' };
    const took = takeFromEntry(s, e, n ? Math.max(1, Math.floor(n)) : (e.n || 1));
    if (e.n <= 0) list.splice(idx, 1);
    log(s, '📦 从收购箱取回 ' + e.name + ' ×' + took, 'info');
    return { ok: true, msg: '取回 ' + e.name + ' ×' + took, n: took };
  }

  /* 收购箱出货：睡觉时按入箱时锁定的供需 × 当天季节一次性结清
   * （先算完所有组的钱，再统一记销量 —— 顺序不影响总价） */
  function shipBox(s) {
    const list = s.box || [];
    if (!list.length) return { n: 0, value: 0 };
    const groups = boxGroups(s);
    let value = 0, n = 0;
    groups.forEach(function (g) {
      value += boxGroupNet(s, g);
      n += g.n;
    });
    groups.forEach(function (g) {
      if (g.kind === 'crop' && g.id) addSupply(s, g.id, g.n);
      else if (g.kind === 'fish' && !g.junk) addFishSupply(s, g.name, g.n);
    });
    s.box = [];
    s.stats.boxItems = (s.stats.boxItems || 0) + n;
    s.stats.boxIncome = (s.stats.boxIncome || 0) + value;
    addCoins(s, value, '收购箱出货');
    tradeXp(s, value);
    return { n: n, value: value };
  }

  /* 水产店：自定义卖 n 条（同一鱼种的不同品质合并，按品质差的先卖） */
  function sellFishGroupN(s, key, n) {
    const g = fishGroups(s, 'fish').filter(function (x) { return x.key === key; })[0];
    if (!g) return { ok: false, msg: '仓库里没有这种鱼' };
    const qty = Math.max(1, Math.min(g.count, Math.floor(n || g.count)));
    const parts = takeFishN(s, key, qty);
    const raw = parts.reduce(function (a, p) { return a + p.n * p.unit; }, 0);
    const gain = Math.max(1, Math.round(shopValue(raw) * sellBonus(s) * fishMarketMul(s, g.name, qty)));
    addFishSupply(s, g.name, qty);
    addCoins(s, gain, '卖鱼 ' + g.name);
    tradeXp(s, gain);
    log(s, '💰 卖出 ' + g.emoji + ' ' + g.name + ' ×' + qty + '，+' + gain + ' 金（8 折）', 'good');
    return { ok: true, msg: '卖出 ' + g.name + '×' + qty + '，+' + gain + ' 金', income: gain, count: qty };
  }

  /* 蚯蚓也能卖：3 金/条（只在渔具店卖） */
  const WORM_VALUE = BALANCE.dig.value;

  function sellWorms(s, n) {
    const have = s.bait.worm || 0;
    if (!have) return { ok: false, msg: '没有蚯蚓可卖' };
    const qty = n ? Math.min(n, have) : have;
    const gain = qty * WORM_VALUE;
    s.bait.worm = have - qty;
    addCoins(s, gain, '卖蚯蚓');
    tradeXp(s, gain);
    log(s, '💰 卖出蚯蚓 ×' + qty + '，+' + gain + ' 金', 'good');
    return { ok: true, qty: qty, income: gain, msg: '卖出蚯蚓 ×' + qty + '，+' + gain + ' 金' };
  }

  function digWorms(s) {
    const cost = digCost(s);
    if (s.energy < cost) return { ok: false, msg: '体力不够（挖蚯蚓要 ' + cost + ' 点）' };
    const w = WEATHER[s.weather];
    const bonus = digYieldBonus(s);
    const n = clamp(randInt(BALANCE.dig.min, BALANCE.dig.max) + w.wormMod + bonus, 1, BALANCE.dig.cap + bonus);
    s.energy -= cost;
    s.bait.worm += n;
    s.stats.dug++;
    const up = addLevelXp(s, 'dig', BALANCE.dig.xp);
    log(s, '🪱 挖到蚯蚓 ×' + n + '（现有 ' + s.bait.worm + '）' +
      (bonus ? ' · 等级产量 +' + bonus : '') + (up ? ' · 挖蚯蚓 Lv' + digLv(s) : ''), 'good');
    return { ok: true, msg: '挖到蚯蚓 ×' + n, n: n, levelUp: up, cost: cost, bonus: bonus };
  }

/* ==================== src/09-forage.js ==================== */
/* 采集：按季节捡野货 */
  /* ---------------- 采集：去后山捡当季野货 ---------------- */

  function foragePool(day) {
    const si = seasonIdx(day);
    return WILD_LIST.filter(function (w) { return w.seasons.indexOf(si) >= 0; });
  }

  /* 当季、当前等级买得到的作物（采集的小彩蛋：掉一颗种子） */
  function forageSeedPool(s) {
    return CROP_LIST.filter(function (c) {
      return cropSeasonOk(c.id, s.day) && (c.lv || 1) <= farmLv(s);
    });
  }

  function forage(s) {
    const cost = forageCost(s);
    const pool = foragePool(s.day);
    if (!pool.length) return { ok: false, msg: '这个季节后山没什么可采的' };
    if (s.energy < cost) return { ok: false, msg: '体力不够（采集要 ' + cost + ' 点），先睡觉吧' };
    s.energy -= cost;
    const w = pool[Math.floor(rand() * pool.length)];
    // 100% 1 件 → 75% 再来 1 件 → 35% 再来 1 件（最多 3 件）
    let n = 1;
    if (rand() < BALANCE.forage.qty2) n++;
    if (rand() < BALANCE.forage.qty3) n++;
    const q = rollQuality(forageRolls(s));
    addStore(s, w.id, q.id, n);
    s.stats.forages = (s.stats.forages || 0) + 1;
    s.stats.wild = s.stats.wild || {};
    s.stats.wild[w.id] = (s.stats.wild[w.id] || 0) + n;
    s.stats.forageBest = Math.max(s.stats.forageBest || 0, n);
    const up = addLevelXp(s, 'forage', BALANCE.forage.xp + (n >= 3 ? 1 : 0));
    let seedTxt = '';
    if (rand() < BALANCE.forage.seedChance) {
      const cand = forageSeedPool(s);
      if (cand.length) {
        const c = cand[Math.floor(rand() * cand.length)];
        s.seeds[c.id] = (s.seeds[c.id] || 0) + 1;
        seedTxt = '，顺手摘到 ' + c.name + '种子 ×1';
      }
    }
    log(s, '🌿 采集：' + w.emoji + ' ' + w.name + ' ×' + n + '（' + q.name + '）' + seedTxt +
      (up ? ' · 采集 Lv' + forageLv(s) : ''), 'good');
    return { ok: true, msg: '采到 ' + w.name + ' ×' + n, wild: w.id, qty: n, q: q.id,
             seed: seedTxt ? true : false, levelUp: up, cost: cost };
  }

  function buyBait(s, kind, n) {
    n = n || 1;
    if (kind === 'dough') {
      const cost = Math.round(BAIT.dough.price * tradeCut(s)) * n;
      if (s.coins < cost) return { ok: false, msg: '金币不够' };
      s.coins -= cost; ledger(s, '买面团饵 ×' + n, 0, cost);
      tradeXp(s, cost);
      s.bait.dough += n;
      log(s, '🍞 买了面团饵 ×' + n + '（-' + cost + ' 金）', 'info');
      return { ok: true, msg: '面团饵 ×' + n };
    }
    if (kind === 'lure') {
      const price = Math.round(BALANCE.lure.price * tradeCut(s)), dur = BALANCE.lure.dur;
      if (s.lure.owned) return { ok: false, msg: '假饵一次只能持 1 个' };
      if (s.coins < price) return { ok: false, msg: '金币不够（' + price + ' 金）' };
      s.coins -= price; ledger(s, '买假饵', 0, price);
      tradeXp(s, price);
      s.lure.owned = true; s.lure.dur = dur;
      log(s, '🎣 买了一个假饵（耐用 ' + dur + ' 次）', 'info');
      return { ok: true, msg: '假饵到手' };
    }
    if (kind === 'lure2') {
      const L = BALANCE.lure2;
      if (fishLv(s) < BALANCE.gate.lure2) {
        return { ok: false, msg: '高级假饵要钓鱼 Lv' + BALANCE.gate.lure2 + ' 才解锁（现在 Lv' + fishLv(s) + '）' };
      }
      if (tradeLv(s) < BALANCE.gate.lure2Trade) {
        return { ok: false, msg: '高级假饵要交易 Lv' + BALANCE.gate.lure2Trade + ' 才解锁（现在 Lv' + tradeLv(s) + '）' };
      }
      if (s.lure2.owned) return { ok: false, msg: '高级假饵一次只能持 1 个' };
      const price2 = Math.round(L.price * tradeCut(s));
      if (s.coins < price2) return { ok: false, msg: '金币不够（' + price2 + ' 金）' };
      s.coins -= price2; ledger(s, '买高级假饵', 0, price2);
      tradeXp(s, price2);
      s.lure2.owned = true; s.lure2.dur = L.dur;
      log(s, '🪝 买了一个高级假饵（耐用 ' + L.dur + ' 次，咬钩同面团饵、好鱼同假饵）', 'info');
      return { ok: true, msg: '高级假饵到手' };
    }
    if (kind === 'premium') {
      if (fishLv(s) < BALANCE.gate.premium) {
        return { ok: false, msg: '特级饵料要钓鱼 Lv' + BALANCE.gate.premium + ' 才解锁（现在 Lv' + fishLv(s) + '）' };
      }
      if (tradeLv(s) < BALANCE.gate.premiumTrade) {
        return { ok: false, msg: '特级饵料要交易 Lv' + BALANCE.gate.premiumTrade + ' 才解锁（现在 Lv' + tradeLv(s) + '）' };
      }
      const price = Math.round(BAIT.premium.price * tradeCut(s)) * n;
      if (s.coins < price) return { ok: false, msg: '金币不够（' + price + ' 金）' };
      s.coins -= price; ledger(s, '买特级饵料 ×' + n, 0, price);
      tradeXp(s, price);
      s.bait.premium = (s.bait.premium || 0) + n;
      log(s, '🍤 买了特级饵料 ×' + n + '（-' + price + ' 金）', 'info');
      return { ok: true, qty: n, cost: price, msg: '特级饵料 ×' + n };
    }
    return { ok: false, msg: '这种饵料买不到' };
  }

  /* 下午茶：改成消耗一份茶，不再直接掏金币；不传 id 就用库存里最顶的那杯 */
  function teaById(id) { return TEAS[id] || null; }

  function teaList() { return TEA_LIST.slice(); }

  function teaStock(s) {
    return TEA_LIST.filter(function (t) { return (s.teas && s.teas[t.id]) > 0; });
  }

  function tea(s, id) {
    if (s.teaUsed) return { ok: false, msg: '今天下午茶已经喝过了' };
    const avail = teaStock(s);
    if (!avail.length) return { ok: false, msg: '家里没有茶了，去百货店买点' };
    let t = TEAS[id];
    if (!t || !(s.teas[t.id] > 0)) {
      t = avail.slice().sort(function (a, b) { return b.energy - a.energy; })[0];
    }
    if (s.energy >= s.maxEnergy) return { ok: false, msg: '体力是满的，别浪费' };
    s.teas[t.id]--;
    s.teaUsed = true;
    s.energy = Math.min(s.maxEnergy, s.energy + t.energy);
    s.stats.teas = (s.stats.teas || 0) + 1;
    log(s, t.emoji + ' 喝了一杯' + t.name + '，体力 +' + t.energy +
      '（' + s.energy + '/' + s.maxEnergy + '）', 'good');
    return { ok: true, msg: t.name + ' · 体力 +' + t.energy, tea: t.id, gain: t.energy };
  }

/* ==================== src/10-depart.js ==================== */
/* 百货店：茶、钥匙、宝箱回收 */
  /* ---------------- 百货店：茶 / 钥匙 / 收杂物宝箱 ---------------- */

  function teaUnlocked(s, t) { return (s.day || 1) >= (t.day || 1); }

  function buyTea(s, id, n) {
    const t = TEAS[id];
    if (!t) return { ok: false, msg: '没有这种茶' };
    if (!teaUnlocked(s, t)) return { ok: false, msg: '第 ' + t.day + ' 天才上架' };
    const qty = Math.max(1, Math.min(20, Math.floor(n || 1)));
    const cost = Math.round(t.price * tradeCut(s)) * qty;
    if (s.coins < cost) return { ok: false, msg: '金币不够（' + cost + ' 金）' };
    s.coins -= cost; ledger(s, '买' + t.name + ' ×' + qty, 0, cost);
    tradeXp(s, cost);
    s.teas = s.teas || {};
    s.teas[id] = (s.teas[id] || 0) + qty;
    log(s, t.emoji + ' 买了' + t.name + ' ×' + qty + '（-' + cost + ' 金）', 'info');
    return { ok: true, msg: t.name + ' ×' + qty, qty: qty, cost: cost };
  }

  /* 金钥匙要交易等级（常跑商店的人才拿得到渠道） */
  function keyTradeGate(id) {
    return id === 'gold' ? BALANCE.gate.goldKeyTrade : 0;
  }
  function keyUnlocked(s, id) {
    const k = KEYS[id];
    if (!k || fishLv(s) < (k.lv || 1)) return false;
    return tradeLv(s) >= keyTradeGate(id);
  }

  function buyKey(s, id, n) {
    const k = KEYS[id];
    if (!k) return { ok: false, msg: '没有这种钥匙' };
    if (fishLv(s) < k.lv) return { ok: false, msg: '钓鱼 Lv' + k.lv + ' 才上架' };
    if (tradeLv(s) < keyTradeGate(id)) {
      return { ok: false, msg: k.name + '要交易 Lv' + keyTradeGate(id) + ' 才上架（现在 Lv' + tradeLv(s) + '）' };
    }
    const qty = Math.max(1, Math.min(9, Math.floor(n || 1)));
    const cost = Math.round(k.price * tradeCut(s)) * qty;
    if (s.coins < cost) return { ok: false, msg: '金币不够（' + cost + ' 金）' };
    s.coins -= cost; ledger(s, '买' + k.name + ' ×' + qty, 0, cost);
    tradeXp(s, cost);
    s.keys = s.keys || { iron: 0, gold: 0 };
    s.keys[id] = (s.keys[id] || 0) + qty;
    log(s, k.emoji + ' 买了' + k.name + ' ×' + qty + '（-' + cost + ' 金）', 'info');
    return { ok: true, msg: k.name + ' ×' + qty, qty: qty, cost: cost };
  }

  /* 百货店回收杂物 / 宝箱（8 折，和卖鱼一个价） */
  function sellJunk(s, key) {
    const g = fishGroups(s, 'junk').filter(function (x) { return x.key === key; })[0];
    if (!g) return { ok: false, msg: '没有这一项' };
    const gain = Math.max(1, Math.round(shopValue(g.v * g.count) * sellBonus(s)));
    let left = g.count;
    s.fishBag = (s.fishBag || []).filter(function (e) {
      if (fishKey(e) === key && left > 0) { left--; return false; }
      return true;
    });
    addCoins(s, gain, '回收 ' + g.name);
    tradeXp(s, gain);
    log(s, '💰 回收 ' + g.emoji + ' ' + g.name + ' ×' + g.count + '，+' + gain + ' 金（8 折）', 'good');
    return { ok: true, msg: '回收 ' + g.name + '×' + g.count + '，+' + gain + ' 金', income: gain };
  }

  function randChar(arr) { return arr[Math.floor(rand() * arr.length)] || arr[0]; }

  /* 开宝箱：木箱直接开，铁箱 / 金箱要先有钥匙 */
  function openChest(s, key) {
    const g = fishGroups(s, 'junk').filter(function (x) { return x.key === key && x.chest; })[0];
    if (!g) return { ok: false, msg: '仓库里没有这个宝箱' };
    const kind = g.chest;
    const C = CHESTS[kind];
    if (!C) return { ok: false, msg: '这个宝箱打不开' };
    if (C.key) {
      s.keys = s.keys || { iron: 0, gold: 0 };
      if (!(s.keys[C.key] > 0)) {
        return { ok: false, msg: '需要' + KEYS[C.key].name + '（百货店有卖，钓鱼 Lv' + KEYS[C.key].lv + ' 解锁）' };
      }
    }

    // 消耗一个
    let left = 1;
    s.fishBag = (s.fishBag || []).filter(function (e) {
      if (fishKey(e) === key && left > 0) { left--; return false; }
      return true;
    });
    if (C.key) s.keys[C.key]--;

    s.stats.chests = (s.stats.chests || 0) + 1;
    const gains = [];
    if (kind === 'wood') {
      const c = randInt(10, 26);
      addCoins(s, c, '开木制宝箱');
      gains.push('🪙 ' + c + ' 金');
    } else if (kind === 'iron') {
      // 铁箱：一包「一般数量」的物资，期望价值 ≈ 85 金（钥匙 40 + 箱子回收 25）
      const pick = randInt(1, 5);
      if (pick === 1) {
        const n = randInt(6, 9);
        s.ferts.normal = (s.ferts.normal || 0) + n;
        gains.push('🧪 普通肥料×' + n);
      } else if (pick === 2 || pick === 3) {
        const c = randChar(CROP_LIST.filter(function (x) { return (x.lv || 1) <= 4; }));
        const n = randInt(8, 12);
        s.seeds[c.id] = (s.seeds[c.id] || 0) + n;
        gains.push(c.emoji + ' ' + c.name + '种子×' + n);
      } else if (pick === 4) {
        const n = randInt(4, 6);
        s.bait.dough = (s.bait.dough || 0) + n;
        gains.push('🍞 面团饵×' + n);
      } else {
        const n = randInt(5, 7);
        s.bait.worm = (s.bait.worm || 0) + n;
        gains.push('🪱 蚯蚓×' + n);
      }
    } else {
      // 金箱：一大笔金币 + 一件高级物品
      const c = randInt(200, 320);
      addCoins(s, c, '开黄金宝箱');
      gains.push('🪙 ' + c + ' 金');
      const pick = randInt(1, 3);
      if (pick === 1) {
        const n = randInt(3, 5);
        s.ferts.special = (s.ferts.special || 0) + n;
        gains.push('💊 特效肥料×' + n);
      } else if (pick === 2) {
        const c2 = randChar([CROPS.pumpkin, CROPS.watermelon]);
        const n = randInt(2, 3);
        s.seeds[c2.id] = (s.seeds[c2.id] || 0) + n;
        gains.push(c2.emoji + ' ' + c2.name + '种子×' + n);
      } else {
        const n = randInt(8, 10);
        s.bait.worm = (s.bait.worm || 0) + n;
        gains.push('🪱 蚯蚓×' + n);
      }
    }

    log(s, C.emoji + ' 打开' + C.name + '：' + gains.join(' · '), 'good');
    return { ok: true, chest: kind, gains: gains, msg: gains.join(' · ') };
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
      s.stats.works = (s.stats.works || 0) + 1;
      addCoins(s, pay, '半天零工');
      log(s, '🕐 半天零工（体力不足，全用上）：-' + spent + ' 体力，+' + pay + ' 金', 'good');
      return { ok: true, msg: '+' + pay + ' 金（用掉全部 ' + spent + ' 体力）', pay: pay, spent: spent, partial: true };
    }

    if (s.energy < cost) return { ok: false, msg: '体力不足（需要 ' + cost + ' 点）' };
    const pay = workPay(s, mode);
    s.energy -= cost;
    s.workUsed = true;
    s.stats.works = (s.stats.works || 0) + 1;
    addCoins(s, pay, mode === 'half' ? '半天零工' : '全天零工');
    log(s, (mode === 'half' ? '🕐' : '🕑') + (mode === 'half' ? '半天' : '全天') +
            '零工：-' + cost + ' 体力，+' + pay + ' 金', 'good');
    return { ok: true, msg: '+' + pay + ' 金', pay: pay, spent: cost };
  }

  /* 自动收获器：睡觉时免费收成熟作物 */
  const HARVESTER_COST = BALANCE.device.harvester;
  const NET_COST = BALANCE.device.net;
  const NET_MAX = BALANCE.device.netMax;
  const NET_CHANCE = BALANCE.netChance;

  /* 月度累进税：按（金币 + 仓库价值）分档，0~2k 收 2%、2k~10k 收 4%、1w 以上收 6%，最低 30 金 */
  function taxBase(s) { return Math.max(0, s.coins || 0) + storeTotal(s) + boxValue(s); }

  function taxDue(s) {
    const base = taxBase(s);
    let tax = 0, prev = 0;
    const bands = BALANCE.tax.bands;
    for (let i = 0; i < bands.length; i++) {
      const top = bands[i].upTo == null ? Infinity : bands[i].upTo;
      if (base > prev) tax += (Math.min(base, top) - prev) * bands[i].rate;
      prev = top;
      if (base <= top) break;
    }
    return Math.max(BALANCE.tax.min, Math.round(tax));
  }

  /* 距离下次缴税还有几天 */
  function taxInDays(s) {
    return BALANCE.tax.every - ((s.day || 1) % BALANCE.tax.every);
  }

  /* 水产店售价：基础价 × 1.3 × 鱼市价（缺鱼时更贵） */
  function fishBuyPrice(id, s) {
    const f = FISH.filter(function (x) { return x.id === id; })[0];
    if (!f) return 0;
    const mkt = s ? fishMarketMul(s, f.name) : 1;
    const cut = s ? (1 - townBonus(s, 'shopCut')) : 1;
    return Math.max(3, Math.round(f.base * BALANCE.shop.priceMul * mkt * cut * (s ? tradeCut(s) : 1)));
  }

  /* 今日库存（0 表示卖完 / 没进到货） */
  function shopStock(s, id) {
    return (s.shop && s.shop.stock && s.shop.stock[id]) || 0;
  }

  function buyFish(s, id, n) {
    const f = FISH.filter(function (x) { return x.id === id; })[0];
    if (!f || f.trash || f.noOrder) return { ok: false, msg: '这种水产买不到' };
    const qty = Math.max(1, Math.floor(n || 1));
    const stock = shopStock(s, id);
    if (stock <= 0) return { ok: false, msg: f.name + '今天卖完了，明天再来' };
    if (stock < qty) return { ok: false, msg: '库存只剩 ' + stock + ' 条' };
    const cost = fishBuyPrice(id, s) * qty;
    if (s.coins < cost) return { ok: false, msg: '金币不够' };
    s.coins -= cost;
    s.shop.stock[id] = stock - qty;
    // 买鱼 = 把鱼从市场里拿走：销量回落，之后卖鱼的价格会略微回升
    removeFishSupply(s, f.name, qty);
    ledger(s, '买水产 ' + f.name + ' ×' + qty, 0, cost);
    tradeXp(s, cost);
    for (let i = 0; i < qty; i++) {
      s.fishBag.push({ name: f.name, emoji: f.emoji, q: 'std', v: f.base, d: s.day, bought: true });
    }
    log(s, '🐟 买进 ' + f.emoji + ' ' + f.name + ' ×' + qty + '（-' + cost + ' 金，今日剩 ' +
      s.shop.stock[id] + ' 条）', 'info');
    return { ok: true, qty: qty, cost: cost, msg: '买到 ' + f.name + ' ×' + qty };
  }

/* ==================== src/11-shops.js ==================== */
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

/* ==================== src/12-orchard.js ==================== */
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

  /* 育苗进度：给界面显示已浇水天数与自然生长天数 */
  function treeProgress(s, i) {
    const t = treeSlot(s, i);
    if (!t) return null;
    const need = treeNeed(t);
    return { age: treeAge(s, t), needDays: need.days,
             water: t.water || 0, needWater: need.water,
             done: treeMature(s, i), ripe: t.ripe || 0, mode: t.mode || 'seed' };
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
    slots[i] = { id: id, mode: m, planted: s.day || 1, water: 0, lastWater: 0, ripe: 0 };
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
    // 水果也进图鉴（和作物共用 codex.crops，果实固定标准品质）
    s.codex = s.codex || { fish: {}, crops: {} };
    s.codex.crops = s.codex.crops || {};
    const fr = CROPS[tr.fruitId];
    const cx = s.codex.crops[tr.fruitId] ||
      (s.codex.crops[tr.fruitId] = { n: 0, best: null, first: s.day, value: 0 });
    cx.n += n;
    cx.value += n * (fr ? fr.price : 0);
    if (!cx.best) cx.best = 'std';   // 果树果实固定标准品质
    log(s, '🧺 收获 ' + tr.emoji + ' ' + tr.fruit + ' ×' + n + '（-' + E + ' 体力）', 'good');
    return { ok: true, n: n, cost: E, msg: '收获 ' + tr.fruit + ' ×' + n + ' 进仓库（-' + E + ' 体力）' };
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
          const had = t.ripe || 0;
          t.ripe = Math.min(cap, had + n);
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

/* ==================== src/13-orders.js ==================== */
/* 每日委托与长期订单 */
  /* ---------------- 每日委托 ---------------- */

  /* 委托池：按天数一档档解锁（前期慢一点，后期全开）；同档内按解锁等级 + 种子价排 */
  const ORDER_TIERS = [
    { day: 1, n: 4 }, { day: 3, n: 5 }, { day: 5, n: 6 }, { day: 7, n: 7 },
    { day: 9, n: 8 }, { day: 12, n: 10 }, { day: 15, n: 11 }, { day: 18, n: 13 }, { day: 21, n: 14 }
  ];

  function orderPool(day, farmLevel) {
    const lv = farmLevel || 10;                       // 不传等级时不做裁剪（给测试/兼容用）
    const sorted = CROP_LIST.slice()
      .filter(function (c) { return (c.lv || 1) <= lv + 1; })
      .sort(function (a, b) { return ((a.lv || 1) - (b.lv || 1)) || (a.seed - b.seed); });
    let n = ORDER_TIERS[0].n;
    ORDER_TIERS.forEach(function (t) { if (day >= t.day) n = t.n; });
    return sorted.slice(0, Math.min(n, sorted.length));
  }

  /* 委托权重：越贵的作物越容易被点单，便宜菜不再天天刷屏 */
  function orderWeight(c) {
    return 1 + Math.min(5, Math.floor(c.price / 12));
  }

  function pickOrderCrop(pool, used) {
    const cand = pool.filter(function (c) { return used.indexOf(c.id) < 0; });
    if (!cand.length) return null;
    let total = 0;
    cand.forEach(function (c) { total += orderWeight(c); });
    let r = rand() * total;
    for (let i = 0; i < cand.length; i++) {
      r -= orderWeight(cand[i]);
      if (r <= 0) return cand[i];
    }
    return cand[cand.length - 1];
  }

  function makeOrders(s) {
    const day = (s && s.day) || 1;
    const farmLv = (s && s.levels && s.levels.farm) || 1;
    const pool = orderPool(day, farmLv);
    const used = [];
    const orders = [];
    const season = Math.floor((day - 1) / 30);                                  // 0 春 / 1 夏 / 2 秋 / 3 冬
    const mult = 1 + season * BALANCE.order.seasonStep;                        // 1 / 1.6 / 2.2 / 2.8

    function pushCrop(c) {
      used.push(c.id);
      const qty = Math.max(1, Math.round((c.price >= 20 ? randInt(2, 3) : randInt(3, 6)) * mult));
      // 市价溢价：合同价跟着该作物当前市价走（反季 / 稀缺时更值钱），但有封顶
      const mk = Math.min(BALANCE.market.orderCap, marketMul(s, c.id));
      const reward = Math.max(40, Math.round(qty * c.price * BALANCE.order.mult * mk *
        (1 + townBonus(s, 'orderBonus'))));
      orders.push({
        id: 'd' + day + '-c' + orders.length, kind: 'crop', crop: c.id, name: c.name, emoji: c.emoji,
        qty: qty, reward: reward, mul: mk, done: false, flagship: orders.length === 0
      });
    }

    // 保底：第一张单固定是「能买到的种子里最贵的那个」，避免一天全是白菜单
    if (pool.length) {
      const buyable = pool.filter(function (c) { return (c.lv || 1) <= farmLv; });
      const src = buyable.length ? buyable : pool;
      const top = src.slice().sort(function (a, b) { return b.price - a.price; })[0];
      pushCrop(top);
    }
    for (let i = orders.length; i < 2 && pool.length; i++) {
      let c = pickOrderCrop(pool, used);
      if (!c) c = pool[i % pool.length];
      pushCrop(c);
    }

    // 鱼单：单价随季节上涨（11 → 15 → 19 → 23），不再后期白送
    const fq = Math.max(2, Math.round(randInt(2, 3) * mult));
    const per = BALANCE.order.fishBase + BALANCE.order.fishStep * season;
    orders.push({
      id: 'd' + day + '-f', kind: 'fish', crop: null, name: '任意鱼', emoji: '🐟',
      qty: fq, reward: Math.max(12, per * fq), done: false
    });
    return orders;
  }

  /* ---------------- 长期订单（5 天期限，2 倍报酬） ---------------- */

  function makeLongOrder(s) {
    const day = (s && s.day) || 1;
    const season = Math.floor((day - 1) / 30);
    const pool = orderPool(day, (s && s.levels && s.levels.farm) || 1);
    if (rand() < 0.3) {
      const qty = Math.max(6, Math.round(randInt(8, 14) * (1 + season * 0.3)));
      return { id: 'L' + day, kind: 'fish', crop: null, name: '任意鱼', emoji: '🐟',
               qty: qty, reward: Math.round(qty * (BALANCE.order.longFishBase + BALANCE.order.fishStep * season)),
               deadline: day + 5, done: false };
    }
    const c = pool[Math.floor(rand() * pool.length)];
    const qty = Math.max(6, Math.round((c.price >= 40 ? randInt(6, 10) : randInt(12, 20)) * (1 + season * 0.3)));
    const mk = Math.min(BALANCE.market.orderCap, marketMul(s, c.id));
    return { id: 'L' + day, kind: 'crop', crop: c.id, name: c.name, emoji: c.emoji,
             qty: qty, reward: Math.round(qty * c.price * 2 * mk *
               (1 + townBonus(s, 'orderBonus'))), mul: mk,
             deadline: day + 5, done: false };
  }

  function deliverLong(s) {
    const o = s.longOrder;
    if (!o) return { ok: false, msg: '现在没有长期订单' };
    const have = orderHave(s, o);
    if (have < o.qty) return { ok: false, msg: '还差 ' + (o.qty - have) + ' 个' };
    if (o.kind === 'fish') {
      const drop = orderFish(s).sort(function (a, b) { return a.v - b.v; }).slice(0, o.qty);
      s.fishBag = s.fishBag.filter(function (e) { return drop.indexOf(e) < 0; });
    } else {
      takeStoreN(s, o.crop, o.qty);
    }
    // 提前交货：每提前一天 +10%，最多 +50%
    const early = Math.max(0, (o.deadline || 0) - s.day);
    const bonus = Math.round(o.reward * Math.min(0.5, 0.1 * early));
    const total = o.reward + bonus;
    addCoins(s, total, '长期订单 · ' + o.name + '×' + o.qty);
    tradeXp(s, total);
    log(s, '📜 长期订单完成：' + o.emoji + ' ' + o.name + ' ×' + o.qty + '，+' + total + ' 金' +
      (bonus ? '（提前 ' + early + ' 天，额外 +' + bonus + '）' : ''), 'good');
    s.stats.longOrders = (s.stats.longOrders || 0) + 1;
    // 下一张长期委托在隔天睡醒后生成，期间保留该日期以便读档时不提前补单。
    s.longOrder = null;
    s.longOrderReadyDay = s.day + 1;
    return { ok: true, msg: '长期订单完成，+' + total + ' 金' + (bonus ? '（含提前奖励 +' + bonus + '）' : ''),
             reward: o.reward, bonus: bonus, early: early };
  }

  /* 委托进度：作物看仓库，鱼看渔获袋 */
  /* 杂物、宝箱不算委托的鱼 */
  function orderFish(s) {
    // 买来的水产（bought）不能拿去交委托，避免套利
    return (s.fishBag || []).filter(function (e) { return e && e.q && !e.no && !e.bought; });
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
    tradeXp(s, o.reward);
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
        mul: (o.kind === 'crop' && o.mul != null) ? num(o.mul, 1, 0.5, 3) : 0,
        done: !!o.done
      });
    });
    return out.length ? out : makeOrders(s);
  }

/* ==================== src/14-save.js ==================== */
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
    merged.stats = Object.assign({ harvests: 0, casts: 0, dug: 0, planted: 0, orders: 0, cropsSold: 0, works: 0, longOrders: 0, boxItems: 0, boxIncome: 0, teas: 0, chests: 0, forages: 0, incomeTotal: 0, expenseTotal: 0, wild: {}, forageBest: 0, orchardFruit: 0, orchardPlanted: 0, fruitSold: 0 }, s.stats || {});
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
        ripe: Math.round(num(t.ripe, 0, 0, BALANCE.orchard.ripeCap))
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
      return e && (e.kind === 'crop' || e.kind === 'fish') && e.name;
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
        mul: lo.kind === 'crop' && lo.mul != null ? num(lo.mul, 1, 0.5, 3) : 0,
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
      farmXp: Math.round(num(rawLv && rawLv.farmXp, 0, 0, 999999)),
      fishXp: Math.round(num(rawLv && rawLv.fishXp, 0, 0, 999999)),
      digXp: Math.round(num(rawLv && rawLv.digXp, 0, 0, 999999)),
      forageXp: Math.round(num(rawLv && rawLv.forageXp, 0, 0, 999999)),
      tradeXp: Math.round(num(rawLv && rawLv.tradeXp, 0, 0, 999999))
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

})(typeof window !== 'undefined' ? window : globalThis);
