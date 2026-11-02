/* 数值表与静态数据（BALANCE / 作物 / 鱼 / 品质 / 天气 / 宝箱 / 茶） */
/* ============================================================
 * 我的小农场 · 游戏逻辑层（纯数据，不碰 DOM）
 * 规则来源：skills/farm-game/SKILL.md
 * ============================================================ */
(function (root) {
  'use strict';

  /* ---------------- 数值表（BALANCE） ---------------- */

  const BALANCE = {
    hook: { dough: 0.92, worm: 0.95, lure: 0.72, lure2: 0.92 },
    weatherHook: { sunny: -0.12, cloudy: 0, rain: 0.08 },
    bait: { wormGood: 1.35, lureTrash: 0.3, lureGood: 1.15 },
    prices: { sprinkler: 80, harvester: 200, net: 50, netMax: 9 },
    netChance: 0.8,
    /* 渔网抓完鱼要重新布置：每张 1 体力 */
    netReset: { energy: 1 },
    /* 雇佣渔夫：钓鱼 Lv5 解锁。每天 2+等级 杆，工资 10+5×(等级-1)；
     * 每钓到 1 条 +1 经验，升级需要 6+3×(等级-1)，也可以花钱直接升 */
    fisher: { hire: 300, baseCasts: 2, wageBase: 8, wageStep: 4,
              needBase: 5, needStep: 2, upCost: 100, max: 10 },
    work: { full: 2.0, half: 1.2 },
    upkeep: { plotPerWeek: 3, plotMid: 6, plotHigh: 14, free: 5, sprinkle: 3, net: 0, harvester: 5,
              seeder: 6 },
    tax: { rate: 0.04, min: 30, every: 30 },
    order: { mult: 1.35, seasonStep: 0.6 },
    expand: { base: 25, step: 15, from: 4, steepFrom: 25, steepMul: 1.6 },
    /* 自动播种器：一台只管 5 块地，买几台就播几块（每台每天 5 块），每台每周要交维护费 */
    device: { sprinkler: 80, harvester: 300, net: 50, seeder: 400, seederPlots: 5, seederMax: 9 },
    lure: { price: 5, dur: 25 },
    /* 高级假饵：钓鱼 Lv6 解锁，20 金 / 100 次；咬钩率跟面团饵一样，好鱼率跟假饵一样 */
    lure2: { price: 20, dur: 100, lv: 6 },
    shop: { priceMul: 1.3, cropPriceMul: 1.3, restock: true, sellRate: 0.8 },
    /* 市场：供需 1.30（稀缺）→ 0.70（过剩），反季 ×1.7，每天睡觉回落 30% */
    market: { supplyMax: 1.3, supplyMin: 0.7, cropStep: 0.02, fishStep: 0.015,
              offSeason: 1.7, decay: 0.7, scarce: 1.15, glut: 0.9,
              /* 委托的市价溢价封顶，避免一张单顶掉整个农场 */
              orderCap: 1.6 },
    /* 采集：5 体力一次，100% 1 件 → 75% 再来 1 件 → 35% 再来 1 件，25% 掉一颗当季种子 */
    forage: { energy: 5, qty2: 0.75, qty3: 0.35, seedChance: 0.25 },
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
    /* 等级：每级所需经验 = 15 + 10×(级-1)，满级 10 */
    level: { max: 10, xpBase: 15, xpStep: 10 },
    /* 等级解锁：商店设备 / 高级种子 / 特效肥 / 渔网 / 渔夫 / 高级假饵 / 自动播种器 */
    gate: { sprinkler: 2, harvester: 6, net: 2, specialFert: 4, netBase: 2, fisher: 5,
            seeder: 4, lure2: 6 },
    /* 宝箱：铁箱 / 金箱按钓鱼等级解锁 */
    chest: { ironLv: 4, goldLv: 7 }
  };

  /* ---------------- 静态数据 ---------------- */

  /* 季节：0 春 / 1 夏 / 2 秋 / 3 冬。seasons 里没有的季节不能播种，种子店也不卖 */
  const CROPS = {
    carrot:     { name: '萝卜', emoji: '🥕', seed: 5,  days: 2, base: 3, price: 4,  big: false, lv: 1,
                  seasons: [0, 2], desc: '脆生生，炖汤最甜' },
    cabbage:    { name: '白菜', emoji: '🥬', seed: 7,  days: 2, base: 2, price: 8,  big: false, lv: 1,
                  seasons: [0, 2], desc: '冬天囤一车也不坏' },
    potato:     { name: '土豆', emoji: '🥔', seed: 9,  days: 3, base: 3, price: 8,  big: false, lv: 1,
                  seasons: [0, 1], desc: '怎么做都好吃，管饱' },
    spinach:    { name: '菠菜', emoji: '🥬', seed: 6,  days: 2, base: 2, price: 7,  big: false, lv: 1,
                  seasons: [0, 2], desc: '一茬接一茬，凉拌最爽口' },
    corn:       { name: '玉米', emoji: '🌽', seed: 14, days: 3, base: 2, price: 16, big: false, lv: 2,
                  seasons: [0, 1], desc: '刚摘的最甜，能磨面' },
    eggplant:   { name: '茄子', emoji: '🍆', seed: 17, days: 4, base: 2, price: 22, big: false, lv: 3,
                  seasons: [1, 2], desc: '紫得发亮，红烧下饭' },
    tomato:     { name: '番茄', emoji: '🍅', seed: 19, days: 4, base: 3, price: 16, big: false, lv: 3,
                  seasons: [1, 2], desc: '沙瓤，生吃拌糖也行' },
    chili:      { name: '辣椒', emoji: '🌶️', seed: 20, days: 4, base: 3, price: 21, big: false, lv: 3,
                  seasons: [1, 2], desc: '够辣，晒干了更好卖' },
    pumpkin:    { name: '南瓜', emoji: '🎃', seed: 26, days: 5, base: 1, price: 110, big: true, lv: 5,
                  seasons: [2], desc: '一株一个，个头抵一筐；施肥只提品质' },
    watermelon: { name: '西瓜', emoji: '🍉', seed: 36, days: 5, base: 1, price: 140, big: true, lv: 6,
                  seasons: [1], desc: '沙甜起沙，一个顶一车；施肥只提品质' },
    sweetpotato:{ name: '红薯', emoji: '🍠', seed: 12, days: 4, base: 4, price: 10, big: false, lv: 2,
                  seasons: [2], desc: '烤着吃最香，管饱又耐放' },
    cucumber:   { name: '黄瓜', emoji: '🥒', seed: 19, days: 3, price: 13, multi: true, lv: 4,
                  seasons: [1], firstQty: 2, regrowDays: 2, regrowQty: 2, regrowTimes: 2,
                  desc: '顶花带刺，摘了还能再长' },
    grape:      { name: '葡萄', emoji: '🍇', seed: 26, days: 4, price: 12, multi: true, lv: 4,
                  seasons: [1], firstQty: 3, regrowDays: 2, regrowQty: 3, regrowTimes: 2,
                  desc: '一串一串地结，越摘越有' },
    strawberry: { name: '草莓', emoji: '🍓', seed: 22, days: 3, price: 9,  multi: true, lv: 4,
                  seasons: [0], firstQty: 3, regrowDays: 1, regrowQty: 2, regrowTimes: 3,
                  desc: '娇气，但一直能摘' },

    /* 野货：只能靠「采集」拿到，不进种子店 / 委托池 / 农产品店进货 */
    shepherd:   { name: '荠菜', emoji: '🌿', price: 12, wild: true, seasons: [0],
                  desc: '田埂上一抓一把，包饺子最香' },
    berry:      { name: '野莓', emoji: '🫐', price: 18, wild: true, seasons: [1],
                  desc: '灌木丛里一串串，酸甜' },
    mushroom:   { name: '松茸', emoji: '🍄', price: 24, wild: true, seasons: [2],
                  desc: '雨后林子里的宝贝，城里人抢着要' },
    frozenpear: { name: '冻梨', emoji: '🍐', price: 22, wild: true, seasons: [3],
                  desc: '冻得梆硬，化开了甜到心里' }
  };
  Object.keys(CROPS).forEach(function (k) { CROPS[k].id = k; });
  /* CROP_LIST 只放能种的；WILD_LIST 是采集产物，只进仓库 / 市场 / 收购箱 */
  const CROP_LIST = Object.keys(CROPS).filter(function (k) { return !CROPS[k].wild; })
    .map(function (k) { return CROPS[k]; });
  const WILD_LIST = Object.keys(CROPS).filter(function (k) { return CROPS[k].wild; })
    .map(function (k) { return CROPS[k]; });

  const FERT = {
    normal:  { id: 'normal',  name: '普通肥料', emoji: '🧪', cost: 8,  add: 1, lv: 1 },
    special: { id: 'special', name: '特效肥料', emoji: '💊', cost: 18, add: 2, lv: 4 }
  };
  const FERT_SELL_RATE = 0.5;
  const SPRINKLER_COST = BALANCE.device.sprinkler;

  const TRASH = [
    { name: '易拉罐', emoji: '🥫', desc: '谁扔的，回收站都不一定收' },
    { name: '旧靴子', emoji: '👢', desc: '单只，另一只还在河底' },
    { name: '水草',   emoji: '🌿', desc: '缠在钩上，只能当肥料' }
  ];
  const TRASH_NAMES = TRASH.map(function (t) { return t.name; });

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
    { id: 'trash', name: '垃圾',     emoji: '🗑️', base: 1,  w: 18, trash: true,
      desc: '河里捞上来的不是鱼' },
    { id: 'crucian', name: '鲫鱼',   emoji: '🐟', base: 3,  w: 24, seasons: [0, 2],
      desc: '肉嫩刺多，熬汤最鲜' },
    { id: 'carp',  name: '鲤鱼',     emoji: '🐟', base: 6,  w: 20, seasons: [0, 1, 2],
      desc: '常见河鱼，红烧一绝' },
    { id: 'mandarin', name: '鳜鱼',  emoji: '🐠', base: 10, w: 13, seasons: [0, 1],
      desc: '桃花流水鳜鱼肥' },
    { id: 'bass',  name: '鲈鱼',     emoji: '🐟', base: 12, w: 11, seasons: [1, 2],
      desc: '清蒸最见功夫' },
    { id: 'puffer', name: '河豚',    emoji: '🐡', base: 20, w: 9, seasons: [2],
      desc: '有毒性，老饕甘愿冒险' },
    { id: 'koi',   name: '锦鲤',     emoji: '🐉', base: 25, w: 6, seasons: [0],
      desc: '好运的象征，卖价不菲' },
    { id: 'chestWood', name: '木制宝箱', emoji: '🪵', base: 10, w: 5, chest: 'wood', noOrder: true,
      desc: '木头做的，直接撬开就是几枚铜板' },
    { id: 'chestIron', name: '铁制宝箱', emoji: '🧰', base: 25, w: 2.5, chest: 'iron',
      lv: BALANCE.chest.ironLv, noOrder: true,
      desc: '上了锁，得用铁钥匙' },
    { id: 'chestGold', name: '黄金宝箱', emoji: '👑', base: 130, w: 1, chest: 'gold',
      lv: BALANCE.chest.goldLv, noOrder: true,
      desc: '沉甸甸的，金钥匙才打得开' }
  ];

  const FISH_BY_NAME = {};
  FISH.forEach(function (f) { FISH_BY_NAME[f.name] = f; });
  function fishByName(name) { return (name && FISH_BY_NAME[name]) || null; }
  function fishById(id) {
    for (let i = 0; i < FISH.length; i++) if (FISH[i].id === id) return FISH[i];
    return null;
  }

  /* 宝箱：木箱直接开，铁箱 / 金箱要钥匙 */
  const CHESTS = {
    wood: { id: 'wood', name: '木制宝箱', emoji: '🪵', key: null,   value: 10 },
    iron: { id: 'iron', name: '铁制宝箱', emoji: '🧰', key: 'iron', value: 25 },
    gold: { id: 'gold', name: '黄金宝箱', emoji: '👑', key: 'gold', value: 130 }
  };

  /* 钥匙：百货店卖，按钓鱼等级解锁 */
  const KEYS = {
    iron: { id: 'iron', name: '铁钥匙', emoji: '🗝️', price: 40,  lv: 4, opens: '铁制宝箱' },
    gold: { id: 'gold', name: '金钥匙', emoji: '🔑', price: 120, lv: 7, opens: '黄金宝箱' }
  };

  /* 百货店的茶：下午茶改喝这些，不再掏 3 金。大杯单价更便宜（2.5~3.0 金/体力） */
  const TEAS = {
    green:  { id: 'green',  name: '绿茶',   emoji: '🍵', price: 12, energy: 4,  day: 1,
              desc: '清清爽爽，提神又不腻' },
    black:  { id: 'black',  name: '红茶',   emoji: '🫖', price: 17, energy: 6,  day: 5,
              desc: '加一块方糖，暖到心里' },
    milk:   { id: 'milk',   name: '奶茶',   emoji: '🧋', price: 24, energy: 9,  day: 10,
              desc: '三分糖，珍珠要多' },
    coffee: { id: 'coffee', name: '咖啡',   emoji: '☕', price: 30, energy: 12, day: 16,
              desc: '一口下去，天都亮了' }
  };
  const TEA_LIST = Object.keys(TEAS).map(function (k) { return TEAS[k]; });

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
  const FISH_OFF_SEASON = 0.3;
  const FISH_IN_SEASON = 1.25;

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

  const WEATHER = {
    sunny:  { id: 'sunny',  name: '晴天',   emoji: '☀️', w: 45, hookMod: -0.12, wormMod: -1,
              note: '咬钩率 -12% · 挖蚯蚓 -1 份' },
    cloudy: { id: 'cloudy', name: '阴天',   emoji: '⛅', w: 30, hookMod: 0,     wormMod: 1,
              note: '咬钩率默认 · 挖蚯蚓 +1 份' },
    rain:   { id: 'rain',   name: '雨天',   emoji: '🌧️', w: 25, hookMod: 0.08,  wormMod: 1, autoWater: true,
              note: '自动浇水 · 咬钩率 +8% · 挖蚯蚓 +1 份' },
    snow:   { id: 'snow',   name: '雪天',   emoji: '❄️', w: 0,  hookMod: -0.3,  wormMod: -1, autoWater: true,
              note: '自动浇水（化雪）· 河面结冰，冬天本来就钓不了鱼' }
  };
  const WEATHER_LIST = Object.keys(WEATHER).map(function (k) { return WEATHER[k]; });

  /* 四季天气权重：春天多雨、夏天多晴、秋天温和、冬天有雪 */
  const SEASON_WEATHER = [
    { sunny: 25, cloudy: 25, rain: 50, snow: 0 },   // 春
    { sunny: 60, cloudy: 25, rain: 15, snow: 0 },   // 夏
    { sunny: 45, cloudy: 30, rain: 25, snow: 0 },   // 秋
    { sunny: 25, cloudy: 30, rain: 0,  snow: 45 }   // 冬
  ];

  const BAIT = {
    worm:  { id: 'worm',  name: '蚯蚓',   emoji: '🪱', desc: '好鱼概率 ×1.35 · 品质取两次较好' },
    dough: { id: 'dough', name: '面团饵', emoji: '🍞', desc: '标准钓鱼体验 · 92% 咬钩' },
    lure:  { id: 'lure',  name: '假饵',   emoji: '🎣', desc: '耐用 25 次 · 杂物少、品质取两次较好，但只有 72% 咬钩' },
    lure2: { id: 'lure2', name: '高级假饵', emoji: '🪝',
             desc: '耐用 100 次 · 咬钩率跟面团饵一样（92%），好鱼率跟假饵一样 · 钓鱼 Lv' + BALANCE.lure2.lv + ' 解锁' }
  };
  /* 各饵的咬钩基础概率（天气再加减） */
  const HOOK = BALANCE.hook;

