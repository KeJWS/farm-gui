/* ============================================================
 * 我的小农场 · 游戏逻辑层（纯数据，不碰 DOM）
 * 规则来源：skills/farm-game/SKILL.md
 * ============================================================ */
(function (root) {
  'use strict';

  /* ---------------- 数值表（BALANCE） ---------------- */

  const BALANCE = {
    hook: { dough: 0.92, worm: 0.95, lure: 0.72 },
    weatherHook: { sunny: -0.12, cloudy: 0, rain: 0.08 },
    bait: { wormGood: 1.35, lureTrash: 0.3, lureGood: 1.15 },
    prices: { sprinkler: 80, harvester: 200, net: 80, netMax: 9 },
    netChance: 0.7,
    work: { full: 2.0, half: 1.2 },
    upkeep: { plotPerWeek: 3, free: 5, sprinkle: 3, net: 3, harvester: 5 },
    tax: { rate: 0.04, min: 30, every: 30 },
    order: { mult: 1.35, seasonStep: 0.6 },
    expand: { base: 25, step: 15, from: 4, steepFrom: 25, steepMul: 1.6 },
    device: { sprinkler: 80, harvester: 300, net: 80 },
    lure: { price: 5, dur: 25 },
    shop: { priceMul: 1.8, cropPriceMul: 2.2, restock: true, sellRate: 0.8 },
    /* 累进税：0~2000 收 2%、2000~10000 收 4%、10000 以上收 6%，最低 30 金 */
    tax: { min: 30, every: 30,
           bands: [{ upTo: 2000, rate: 0.02 }, { upTo: 10000, rate: 0.04 }, { upTo: null, rate: 0.06 }] },
    /* 等级：每级所需经验 = 15 + 10×(级-1)，满级 10 */
    level: { max: 10, xpBase: 15, xpStep: 10 },
    /* 等级解锁：商店设备 / 高级种子 / 特效肥 / 渔网 */
    gate: { sprinkler: 2, harvester: 6, net: 2, specialFert: 4, netBase: 2 }
  };

  /* ---------------- 静态数据 ---------------- */

  const CROPS = {
    carrot:     { name: '萝卜', emoji: '🥕', seed: 5,  days: 2, base: 3, price: 4,  big: false, lv: 1,
                  desc: '脆生生，炖汤最甜' },
    cabbage:    { name: '白菜', emoji: '🥬', seed: 7,  days: 2, base: 2, price: 8,  big: false, lv: 1,
                  desc: '冬天囤一车也不坏' },
    potato:     { name: '土豆', emoji: '🥔', seed: 9,  days: 3, base: 3, price: 8,  big: false, lv: 1,
                  desc: '怎么做都好吃，管饱' },
    corn:       { name: '玉米', emoji: '🌽', seed: 14, days: 3, base: 2, price: 16, big: false, lv: 2,
                  desc: '刚摘的最甜，能磨面' },
    eggplant:   { name: '茄子', emoji: '🍆', seed: 17, days: 4, base: 2, price: 22, big: false, lv: 3,
                  desc: '紫得发亮，红烧下饭' },
    tomato:     { name: '番茄', emoji: '🍅', seed: 19, days: 4, base: 3, price: 16, big: false, lv: 3,
                  desc: '沙瓤，生吃拌糖也行' },
    pumpkin:    { name: '南瓜', emoji: '🎃', seed: 24, days: 5, base: 1, price: 60, big: true,  lv: 5,
                  desc: '一个能熬一冬天的粥' },
    watermelon: { name: '西瓜', emoji: '🍉', seed: 32, days: 5, base: 1, price: 76, big: true,  lv: 6,
                  desc: '沙甜起沙，夏天抢手' },
    cucumber:   { name: '黄瓜', emoji: '🥒', seed: 19, days: 3, price: 13, multi: true, lv: 4,
                  firstQty: 2, regrowDays: 2, regrowQty: 2, regrowTimes: 2, desc: '顶花带刺，摘了还能再长' },
    strawberry: { name: '草莓', emoji: '🍓', seed: 22, days: 3, price: 9,  multi: true, lv: 4,
                  firstQty: 3, regrowDays: 1, regrowQty: 2, regrowTimes: 3, desc: '娇气，但一直能摘' }
  };
  Object.keys(CROPS).forEach(function (k) { CROPS[k].id = k; });
  const CROP_LIST = Object.keys(CROPS).map(function (k) { return CROPS[k]; });

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
    { id: 'crucian', name: '鲫鱼',   emoji: '🐟', base: 3,  w: 24,
      desc: '肉嫩刺多，熬汤最鲜' },
    { id: 'carp',  name: '鲤鱼',     emoji: '🐟', base: 6,  w: 20,
      desc: '常见河鱼，红烧一绝' },
    { id: 'mandarin', name: '鳜鱼',  emoji: '🐠', base: 10, w: 13,
      desc: '桃花流水鳜鱼肥' },
    { id: 'bass',  name: '鲈鱼',     emoji: '🐟', base: 12, w: 10,
      desc: '清蒸最见功夫' },
    { id: 'puffer', name: '河豚',    emoji: '🐡', base: 20, w: 6,
      desc: '有毒性，老饕甘愿冒险' },
    { id: 'koi',   name: '锦鲤',     emoji: '🐉', base: 25, w: 4,
      desc: '好运的象征，卖价不菲' },
    { id: 'chest', name: '宝箱',     emoji: '📦', base: 15, w: 5, noOrder: true,
      desc: '沉在河底，打开有惊喜' }
  ];

  /* 水产店每日进货量：[最少, 最多]；越稀有的鱼进得越少 */
  const SHOP_STOCK = {
    crucian: [3, 6], carp: [3, 6], mandarin: [2, 4],
    bass: [2, 4], puffer: [1, 3], koi: [0, 2]
  };
  /* 高级水产中后期才进货 */
  const FISH_UNLOCK = { puffer: 20, koi: 30 };
  /* 高级作物中后期才进货 */
  const CROP_UNLOCK = { pumpkin: 18, watermelon: 24 };

  const Q_IDS = QUALITY.map(function (q) { return q.id; });

  const WEATHER = {
    sunny:  { id: 'sunny',  name: '晴天',   emoji: '☀️', w: 45, hookMod: -0.12, wormMod: -1,
              note: '咬钩率 -12% · 挖蚯蚓 -1 份' },
    cloudy: { id: 'cloudy', name: '阴天',   emoji: '⛅', w: 30, hookMod: 0,     wormMod: 1,
              note: '咬钩率默认 · 挖蚯蚓 +1 份' },
    rain:   { id: 'rain',   name: '雨天',   emoji: '🌧️', w: 25, hookMod: 0.08,  wormMod: 1, autoWater: true,
              note: '自动浇水 · 咬钩率 +8% · 挖蚯蚓 +1 份' }
  };
  const WEATHER_LIST = Object.keys(WEATHER).map(function (k) { return WEATHER[k]; });

  const BAIT = {
    worm:  { id: 'worm',  name: '蚯蚓',   emoji: '🪱', desc: '好鱼概率 ×1.35 · 品质取两次较好' },
    dough: { id: 'dough', name: '面团饵', emoji: '🍞', desc: '标准钓鱼体验 · 92% 咬钩' },
    lure:  { id: 'lure',  name: '假饵',   emoji: '🎣', desc: '耐用 20 次 · 杂物少、品质取两次较好，但只有 72% 咬钩' }
  };
  /* 各饵的咬钩基础概率（天气再加减） */
  const HOOK = BALANCE.hook;

  /* ---------------- 成就 ---------------- */

  function cropSpeciesOwned(s) {
    const cx = (s.codex && s.codex.crops) || {};
    return CROP_LIST.filter(function (c) { return cx[c.id] && cx[c.id].n > 0; }).length;
  }
  function fishSpeciesOwned(s) {
    const fx = (s.codex && s.codex.fish) || {};
    return FISH.filter(function (f) { return !f.trash && fx[f.id] && fx[f.id].n > 0; }).length;
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

  /* 成就表：val(s) 是当前进度，达到 goal 就算解锁，奖励自动发放 */
  const ACH = [
    /* 种田 */
    { id: 'harvest1',  cat: 'farm', emoji: '🌱', name: '第一筐菜',   desc: '收获 1 次作物',        goal: 1,
      val: function (s) { return s.stats.harvests || 0; }, reward: { coins: 15 } },
    { id: 'harvest50', cat: 'farm', emoji: '🧺', name: '田里好手',   desc: '累计收获 50 次',       goal: 50,
      val: function (s) { return s.stats.harvests || 0; }, reward: { coins: 60, seeds: { carrot: 3 } } },
    { id: 'harvest200', cat: 'farm', emoji: '🚜', name: '老农把式',  desc: '累计收获 200 次',      goal: 200,
      val: function (s) { return s.stats.harvests || 0; }, reward: { coins: 250 } },
    { id: 'plot10',    cat: 'farm', emoji: '🏞️', name: '小有规模',   desc: '土地达到 10 块',       goal: 10,
      val: function (s) { return s.plots.length; }, reward: { coins: 40 } },
    { id: 'plot20',    cat: 'farm', emoji: '🌾', name: '良田成片',   desc: '土地达到 20 块',       goal: 20,
      val: function (s) { return s.plots.length; }, reward: { ferts: { normal: 5 } } },
    { id: 'plot36',    cat: 'farm', emoji: '🗺️', name: '大地主',     desc: '土地达到 36 块',       goal: 36,
      val: function (s) { return s.plots.length; }, reward: { coins: 2000 } },
    { id: 'crop10',    cat: 'farm', emoji: '🌽', name: '五谷丰登',   desc: '收获过全部 10 种作物', goal: 10,
      val: cropSpeciesOwned, reward: { coins: 250, seeds: { pumpkin: 1 } } },

    /* 钓鱼 */
    { id: 'fish1',     cat: 'fish', emoji: '🎣', name: '开张啦',     desc: '钓上第 1 条鱼',        goal: 1,
      val: function (s) { return (s.fishBook && s.fishBook.count) || 0; }, reward: { bait: { dough: 5 } } },
    { id: 'cast100',   cat: 'fish', emoji: '🌊', name: '垂钓老手',   desc: '累计甩杆 100 次',      goal: 100,
      val: function (s) { return s.stats.casts || 0; }, reward: { coins: 100 } },
    { id: 'perfect1',  cat: 'fish', emoji: '🌟', name: '完美一击',   desc: '钓到 1 条完美品质的鱼', goal: 1,
      val: perfectFish, reward: { coins: 80 } },
    { id: 'perfect10', cat: 'fish', emoji: '💫', name: '完美主义者', desc: '钓到 10 条完美品质的鱼', goal: 10,
      val: perfectFish, reward: { coins: 500 } },
    { id: 'fish7',     cat: 'fish', emoji: '🐠', name: '鱼类图鉴',   desc: '集齐 7 种鱼',          goal: 7,
      val: fishSpeciesOwned, reward: { ferts: { special: 3 } } },
    { id: 'fishval',   cat: 'fish', emoji: '💎', name: '鱼市大亨',   desc: '鱼类累计价值 5000 金', goal: 5000,
      val: fishValueTotal, reward: { coins: 400 } },

    /* 经营 */
    { id: 'order1',    cat: 'biz',  emoji: '📋', name: '第一单',     desc: '完成 1 个委托',        goal: 1,
      val: function (s) { return s.stats.orders || 0; }, reward: { coins: 20 } },
    { id: 'order30',   cat: 'biz',  emoji: '🤝', name: '可靠伙伴',   desc: '累计完成 30 个委托',   goal: 30,
      val: function (s) { return s.stats.orders || 0; }, reward: { coins: 150 } },
    { id: 'coins1k',   cat: 'biz',  emoji: '💰', name: '小有积蓄',   desc: '金币达到 1000',        goal: 1000,
      val: function (s) { return Math.max(s.coins || 0, 0); }, reward: { coins: 80 } },
    { id: 'coins10k',  cat: 'biz',  emoji: '🤑', name: '万元户',     desc: '金币达到 10000',       goal: 10000,
      val: function (s) { return Math.max(s.coins || 0, 0); }, reward: { coins: 1500 } },
    { id: 'day30',     cat: 'biz',  emoji: '📅', name: '一个月',     desc: '经营满 30 天',         goal: 30,
      val: function (s) { return s.day || 1; }, reward: { coins: 50 } },
    { id: 'day100',    cat: 'biz',  emoji: '🏡', name: '百日农场',   desc: '经营满 100 天',        goal: 100,
      val: function (s) { return s.day || 1; }, reward: { coins: 400 } },

    /* 收集 */
    { id: 'codexall',  cat: 'all',  emoji: '📖', name: '全图鉴',     desc: '7 种鱼 + 10 种作物都收过', goal: 17,
      val: function (s) { return fishSpeciesOwned(s) + cropSpeciesOwned(s); },
      reward: { coins: 500, ferts: { special: 5 } } },

    /* v1.7 追加：等级 / 经营 / 长期 */
    { id: 'farmLv3',   cat: 'farm', emoji: '🌿', name: '种田入门',   desc: '种田等级到 Lv3',       goal: 3,
      val: function (s) { return (s.levels && s.levels.farm) || 1; }, reward: { coins: 40 } },
    { id: 'farmLv6',   cat: 'farm', emoji: '🌻', name: '老把式',     desc: '种田等级到 Lv6',       goal: 6,
      val: function (s) { return (s.levels && s.levels.farm) || 1; }, reward: { ferts: { normal: 6 } } },
    { id: 'fishLv3',   cat: 'fish', emoji: '🎏', name: '手感来了',   desc: '钓鱼等级到 Lv3',       goal: 3,
      val: function (s) { return (s.levels && s.levels.fish) || 1; }, reward: { bait: { dough: 10 } } },
    { id: 'fishLv6',   cat: 'fish', emoji: '🐋', name: '河边常客',   desc: '钓鱼等级到 Lv6',       goal: 6,
      val: function (s) { return (s.levels && s.levels.fish) || 1; }, reward: { coins: 300 } },
    { id: 'cropsold100', cat: 'biz', emoji: '🛒', name: '农产品大客户', desc: '累计卖出 100 个作物', goal: 100,
      val: function (s) { return s.stats.cropsSold || 0; }, reward: { coins: 80 } },
    { id: 'order100',  cat: 'biz',  emoji: '📦', name: '老主顾',     desc: '累计完成 100 个委托',  goal: 100,
      val: function (s) { return s.stats.orders || 0; }, reward: { coins: 600 } },
    { id: 'coins50k',  cat: 'biz',  emoji: '🏦', name: '富甲一方',   desc: '金币达到 50000',       goal: 50000,
      val: function (s) { return Math.max(s.coins || 0, 0); }, reward: { coins: 3000 } },
    { id: 'day200',    cat: 'biz',  emoji: '🗓️', name: '两百天',     desc: '经营满 200 天',        goal: 200,
      val: function (s) { return s.day || 1; }, reward: { coins: 800 } },
    { id: 'perfect50', cat: 'fish', emoji: '✨', name: '完美猎手',   desc: '钓到 50 条完美品质的鱼', goal: 50,
      val: perfectFish, reward: { coins: 1200 } },
    { id: 'fishval20k', cat: 'fish', emoji: '🐚', name: '水产大户',  desc: '鱼类累计价值 20000 金', goal: 20000,
      val: fishValueTotal, reward: { coins: 800 } },
    { id: 'cropval5k', cat: 'farm', emoji: '🌾', name: '粮仓满满',   desc: '作物累计价值 5000 金', goal: 5000,
      val: cropValueTotal, reward: { coins: 300 } },
    { id: 'net9',      cat: 'fish', emoji: '🕸️', name: '网罗天下',   desc: '渔网放满 9 张',        goal: 9,
      val: function (s) { return s.nets || 0; }, reward: { coins: 200 } },

    /* v1.9 追加：挖蚯蚓 / 打零工 */
    { id: 'dig50',     cat: 'fish', emoji: '🪱', name: '蚯蚓猎手',   desc: '累计挖蚯蚓 50 次',     goal: 50,
      val: function (s) { return s.stats.dug || 0; }, reward: { coins: 60, bait: { dough: 5 } } },
    { id: 'dig200',    cat: 'fish', emoji: '🕳️', name: '土里刨食',   desc: '累计挖蚯蚓 200 次',    goal: 200,
      val: function (s) { return s.stats.dug || 0; }, reward: { coins: 300 } },
    { id: 'work30',    cat: 'biz',  emoji: '🕐', name: '打工人',     desc: '累计打零工 30 次',     goal: 30,
      val: function (s) { return s.stats.works || 0; }, reward: { coins: 150 } },
    { id: 'work100',   cat: 'biz',  emoji: '🕑', name: '劳模',       desc: '累计打零工 100 次',    goal: 100,
      val: function (s) { return s.stats.works || 0; }, reward: { coins: 600 } }
  ];

  const ACH_CATS = { farm: '🌱 种田', fish: '🎣 钓鱼', biz: '💰 经营', all: '🏆 收集' };

  function rewardText(r) {
    const parts = [];
    if (r.coins) parts.push('+' + r.coins + ' 金');
    ['seeds', 'ferts', 'bait'].forEach(function (k) {
      const bag = r[k] || {};
      Object.keys(bag).forEach(function (id) {
        let name = id;
        if (k === 'seeds' && CROPS[id]) name = CROPS[id].name + '种子';
        if (k === 'ferts' && FERT[id]) name = FERT[id].name;
        if (k === 'bait') name = id === 'worm' ? '蚯蚓' : '面团饵';
        parts.push(name + '×' + bag[id]);
      });
    });
    return parts.join(' + ');
  }

  function applyReward(s, r) {
    if (r.coins) addCoins(s, r.coins, '成就奖励');
    Object.keys(r.seeds || {}).forEach(function (id) {
      s.seeds[id] = (s.seeds[id] || 0) + r.seeds[id];
    });
    Object.keys(r.ferts || {}).forEach(function (id) {
      s.ferts[id] = (s.ferts[id] || 0) + r.ferts[id];
    });
    Object.keys(r.bait || {}).forEach(function (id) {
      s.bait[id] = (s.bait[id] || 0) + r.bait[id];
    });
  }

  /* 检查并解锁：返回本次新解锁的成就（奖励已自动发放） */
  function checkAchievements(s) {
    s.ach = s.ach || {};
    const out = [];
    ACH.forEach(function (a) {
      if (s.ach[a.id]) return;
      if (a.val(s) < a.goal) return;
      s.ach[a.id] = s.day;
      applyReward(s, a.reward);
      log(s, '🏆 成就解锁：' + a.emoji + ' ' + a.name + '（' + rewardText(a.reward) + '）', 'good');
      out.push({ id: a.id, name: a.name, emoji: a.emoji, reward: rewardText(a.reward) });
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
               reward: rewardText(a.reward) };
    });
  }

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

  /* 季节目前只影响顶栏文案：每 30 天换一季（后续可挂作物限制） */
  const SEASONS = ['春', '夏', '秋', '冬'];
  function seasonOf(day) {
    return SEASONS[Math.floor((Math.max(1, day) - 1) / 30) % 4];
  }

  function rollWeather() { return weighted(WEATHER_LIST, 'w').id; }

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

  /* ---------------- 等级（种田 / 钓鱼） ---------------- */

  function levelNeed(lv) {
    const L = BALANCE.level;
    return L.xpBase + L.xpStep * ((lv || 1) - 1);
  }

  function levelEffectText(kind, lv) {
    if (kind === 'fish') {
      return '咬钩 +' + Math.min(8, (lv - 1) * 1).toFixed(1) + '% · 好鱼 +' + Math.min(18, (lv - 1) * 2) + '%';
    }
    return '收获产量 +' + Math.floor(lv / 5);
  }

  /* 加经验，返回升了几级 */
  function addLevelXp(s, kind, n) {
    if (!s.levels) s.levels = { farm: 1, fish: 1, farmXp: 0, fishXp: 0 };
    const key = kind === 'fish' ? 'fish' : 'farm';
    const xpKey = key + 'Xp';
    s.levels[xpKey] = (s.levels[xpKey] || 0) + (n || 1);
    let ups = 0;
    while (s.levels[key] < BALANCE.level.max && s.levels[xpKey] >= levelNeed(s.levels[key])) {
      s.levels[xpKey] -= levelNeed(s.levels[key]);
      s.levels[key]++;
      ups++;
    }
    if (s.levels[key] >= BALANCE.level.max) {
      s.levels[xpKey] = Math.min(s.levels[xpKey], levelNeed(BALANCE.level.max) - 1);
    }
    if (ups) {
      log(s, '⭐ ' + (key === 'fish' ? '钓鱼' : '种田') + '等级 → Lv' + s.levels[key] +
        '（' + levelEffectText(key, s.levels[key]) + '）', 'good');
    }
    return ups;
  }

  /* 种田等级：每 5 级 +1 产量（普通作物） */
  function farmYieldBonus(s) {
    return Math.floor((((s.levels && s.levels.farm) || 1)) / 5);
  }
  /* 钓鱼等级：咬钩率 +1%/级（最多 +8%），好鱼权重 +2%/级（最多 +18%） */
  function fishHookBonus(s) {
    return Math.min(0.08, 0.01 * ((((s.levels && s.levels.fish) || 1)) - 1));
  }
  function fishGoodBonus(s) {
    return 1 + Math.min(0.18, 0.02 * ((((s.levels && s.levels.fish) || 1)) - 1));
  }

  /* ---------------- 等级解锁 ---------------- */

  function farmLv(s) { return (s.levels && s.levels.farm) || 1; }
  function fishLv(s) { return (s.levels && s.levels.fish) || 1; }

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

  /* ---------------- 状态 ---------------- */

  const SAVE_VERSION = 1;

  function makePlot() {
    return { crop: null, growth: 0, watered: false, missed: 0, fert: 0,
             ripeDay: null, hits: 0, phase: 'idle' };
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
      coins: 50,
      energy: 15,
      maxEnergy: 15,
      plots: [makePlot(), makePlot(), makePlot(), makePlot(), makePlot()],
      seeds: {},
      store: {},
      box: [],
      fishBag: [],
      ferts: { normal: 0, special: 0 },
      sprinklers: 0,
      harvester: false,
      harvesterOn: true,
      nets: 0,
      codex: { fish: {}, crops: {} },
      manualRefreshUsed: false,
      workUsed: false,
      bait: { worm: 0, dough: 0 },
      lure: { owned: false, dur: 0 },
      teaUsed: false,
      ledger: [{ day: 1, label: '开局金币', income: 50, expense: 0, balance: 50 }],
      log: [{ day: 1, text: '🌾 欢迎来到我的小农场，第 1 天开始了。', kind: 'sys' }],
      orders: makeOrders({ day: 1 }),
      shop: makeShop(1),
      cropShop: makeCropShop(1),
      levels: { farm: 1, fish: 1, farmXp: 0, fishXp: 0 },
      ach: {},
      fishBook: { count: 0, entries: [], best: null, priciest: null },
      stats: { harvests: 0, casts: 0, dug: 0, planted: 0, orders: 0, cropsSold: 0, works: 0 }
    };
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
    if (amount >= 0) ledger(s, label, amount, 0);
    else ledger(s, label, 0, -amount);
  }

  /* 零工单价：体力 1 点 = 2 金（全天）/ 1.2 金（半天） */
  const WORK_RATE_FULL = BALANCE.work.full;
  const WORK_RATE_HALF = BALANCE.work.half;

  function mealFee(s) { return Math.max(1, 3 + (s.maxEnergy - 10) / 5); }

  /* 5 块地之后，每周要交土地维护费（每多一块 3 金/周） */
  function plotUpkeep(plots) { return Math.max(0, plots - BALANCE.upkeep.free) * BALANCE.upkeep.plotPerWeek; }

  /* 设备每周维护费：洒水器 2、渔网 2、自动收获器 4 */
  function deviceUpkeep(s) {
    return (s.sprinklers || 0) * BALANCE.upkeep.sprinkle +
           (s.nets || 0) * BALANCE.upkeep.net +
           (s.harvester ? BALANCE.upkeep.harvester : 0);
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
    const tier = Math.max(0, (s.maxEnergy - 10) / 5);
    return Math.round(30 * Math.pow(1.2, tier));
  }
  function workCost(s, mode) { return Math.round(mode === 'half' ? s.maxEnergy / 2 : s.maxEnergy); }
  function workPay(s, mode) {
    const c = workCost(s, mode);
    return Math.round(c * (mode === 'half' ? WORK_RATE_HALF : WORK_RATE_FULL));
  }

  function needOf(p) {
    const c = CROPS[p.crop];
    if (!c) return 0;
    return p.phase === 'regrow' ? c.regrowDays : c.days;
  }

  function fertBonus(p) {
    const c = CROPS[p.crop];
    if (!c || c.big) return 0;
    return p.fert || 0;
  }

  function expectedYield(s, p) {
    const c = CROPS[p.crop];
    if (!c) return 0;
    if (c.multi) return p.hits === 0 ? c.firstQty : c.regrowQty;
    if (c.big) return 1;
    return Math.max(1, c.base + farmYieldBonus(s) + fertBonus(p) - p.missed);
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

  function plant(s, idx, cropId) {
    const p = s.plots[idx];
    const c = CROPS[cropId];
    if (!p) return { ok: false, msg: '没有这块地' };
    if (!c) return { ok: false, msg: '没有这种作物' };
    if (p.crop) return { ok: false, msg: '这块地不是空地' };
    if (s.energy < 1) return { ok: false, msg: '体力不够了，先睡觉吧' };

    // 种子只能从种子店买，播种时只消耗背包里的种子
    const owned = s.seeds[cropId] || 0;
    if (owned <= 0) return { ok: false, msg: '没有 ' + c.name + ' 种子了，先去种子店买' };
    s.seeds[cropId] = owned - 1;
    if (s.seeds[cropId] === 0) delete s.seeds[cropId];

    s.energy -= 1;
    p.crop = cropId;
    p.growth = 0;
    p.watered = false;
    p.missed = 0;
    p.fert = 0;
    p.ripeDay = null;
    p.hits = 0;
    p.phase = 'growing';
    s.stats.planted++;
    log(s, '🌱 ' + (idx + 1) + ' 号地种下 ' + c.name, 'good');
    return { ok: true, msg: c.name + ' 种下了' };
  }

  function water(s, idx) {
    const p = s.plots[idx];
    if (!p || !p.crop) return { ok: false, msg: '这块地还没种东西' };
    if (p.phase === 'ripe') return { ok: false, msg: '已经成熟，快点收获吧' };
    if (p.watered) return { ok: false, msg: '今天已经浇过水了' };
    if (s.energy < 1) return { ok: false, msg: '体力不够了，先睡觉吧' };
    s.energy -= 1;
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
    if (!free && s.energy < 1) return { ok: false, msg: '体力不够了，先睡觉吧' };

    const c = CROPS[p.crop];
    if (!free) s.energy -= 1;

    let qty;
    if (c.multi) qty = p.hits === 0 ? c.firstQty : c.regrowQty;
    else qty = c.big ? 1 : clamp(c.base + farmYieldBonus(s) + randInt(-1, 1) - p.missed + fertBonus(p), 1, 99);

    // 作物也有品质：施肥会多滚几次取最好的（普通肥 2 次、特效肥 3 次）
    const q = rollQuality(p.fert > 0 ? 2 : 1);   // 普通/特效肥料品质一致
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
    const levelUp = addLevelXp(s, 'farm', 1);

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
    log(s, '🧺 ' + msg, 'good');
    return { ok: true, msg: msg, qty: qty, crop: p.crop || c.id, unit: unit, quality: q,
             seed: extraSeed, regrown: regrown, levelUp: levelUp };
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
      const gain = shopSellValue(s, id);
      income += gain; count += n;
      parts.push(CROPS[id].name + '×' + n + ' = ' + gain + ' 金');
      delete s.store[id];
    });
    s.stats.cropsSold = (s.stats.cropsSold || 0) + count;
    addCoins(s, income, '农产品店 · 卖作物');
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

  function sellOne(s, id) {
    const n = storeCount(s, id);
    if (!n) return { ok: false, msg: '没有可卖的' };
    const gain = shopSellValue(s, id);
    delete s.store[id];
    s.stats.cropsSold = (s.stats.cropsSold || 0) + n;
    addCoins(s, gain, '农产品店 · 卖 ' + CROPS[id].name);
    log(s, '💰 农产品店收购 ' + CROPS[id].name + '×' + n + '，+' + gain + ' 金（8 折）', 'good');
    return { ok: true, msg: '+' + gain + ' 金', income: gain, count: n };
  }

  /* 施肥 = 消耗仓库里的肥料（肥料在种子店买，半价卖回） */
  function useFert(s, idx, kind) {
    const p = s.plots[idx];
    const f = FERT[kind];
    if (!p || !p.crop) return { ok: false, msg: '这块地还没种东西' };
    if (!f) return { ok: false, msg: '没有这种肥料' };
    if (CROPS[p.crop].big) return { ok: false, msg: '南瓜、西瓜不吃肥料' };
    if (p.fert) return { ok: false, msg: '这块地已经施过肥了' };
    if (p.phase === 'ripe') return { ok: false, msg: '都熟了，别浪费肥料' };
    if ((s.ferts[kind] || 0) < 1) return { ok: false, msg: '肥料用完了，去种子店买' };
    if (s.energy < 1) return { ok: false, msg: '体力不够了' };
    s.ferts[kind]--;
    s.energy -= 1;
    p.fert = f.add;
    log(s, '🧪 ' + (idx + 1) + ' 号地施了' + f.name + '（产量 +' + f.add + '、品质取更优）', 'good');
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
    const cost = f.cost * qty;
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
    if (CROPS[p.crop].big) return false;
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
    if (!targets.length) return { ok: false, msg: '没有可施肥的地块（大作物、已施肥、已成熟都不行）' };

    let n = 0, stop = null;
    for (let k = 0; k < targets.length; k++) {
      if (s.energy < 1) { stop = '体力不够了'; break; }
      if ((s.ferts[kind] || 0) < 1) { stop = '肥料不够了'; break; }
      const p = s.plots[targets[k]];
      s.ferts[kind]--;
      s.energy -= 1;
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
    if (s.coins >= fee) {
      addCoins(s, -fee, '伙食费');
      notes.push({ kind: 'meal', text: '🍖 伙食 -' + fee });
      s.energy = s.maxEnergy;
    } else {
      // 没钱只恢复到「上限的 30%，至少 5 点」，但不会扣掉已有的体力
      const floor = Math.max(5, Math.round(s.maxEnergy * 0.3));
      s.energy = Math.max(s.energy, Math.min(floor, s.maxEnergy));
      notes.push({ kind: 'meal', text: '😵 没钱吃饭，只回 ' + floor + ' 体力' });
    }

    // 自动收获器：睡觉时把能收的地块收掉，不耗体力
    if (s.harvester && s.harvesterOn) {
      let hn = 0, hval = 0;
      s.plots.forEach(function (p, i) {
        if (!p.crop || !canHarvest(s, p)) return;
        const hr = harvest(s, i, true);
        if (hr.ok) { hn++; hval += hr.qty * hr.unit; }
      });
      if (hn) notes.push({ kind: 'harvest', text: '🤖 收获 ' + hn + ' 块（值 ' + hval + '）' });
    }

    s.plots.forEach(function (p) {
      if (p.crop && (p.phase === 'growing' || p.phase === 'regrow') && !p.watered) p.missed++;
    });
    s.plots.forEach(function (p) { p.watered = false; });

    s.day++;
    s.teaUsed = false;
    s.workUsed = false;
    s.weather = rollWeather();
    const w = WEATHER[s.weather];
    notes.push({ kind: 'weather', text: w.emoji + ' ' + w.name });

    if (w.autoWater) {
      let n = 0, ripe = 0;
      s.plots.forEach(function (p) {
        if (!p.crop || p.phase === 'ripe') return;
        if (!p.watered) { if (grow(p, s)) ripe++; p.watered = true; n++; }
      });
      if (n) notes.push({ kind: 'water', text: '🌧️ 自动浇 ' + n + ' 块' + (ripe ? '，熟 ' + ripe : '') });
    } else if (s.sprinklers > 0) {
      // 洒水器：每天自动浇前 N 块没浇的地，不耗体力
      let n = 0, ripe = 0;
      s.plots.forEach(function (p) {
        if (n >= s.sprinklers) return;
        if (!p.crop || p.phase === 'ripe' || p.watered) return;
        if (grow(p, s)) ripe++;
        p.watered = true;
        n++;
      });
      if (n) notes.push({ kind: 'water', text: '🚿 洒水器浇 ' + n + ' 块' + (ripe ? '，熟 ' + ripe : '') });
    }

    // 渔网：每天消耗面团饵，有概率上鱼
    if (s.nets > 0) {
      const nr = netCatch(s);
      if (nr.used) notes.push({ kind: 'net', text: '🕸️ 渔网 ' + nr.got + '/' + nr.used + ' 条' });
    }

    // 收购箱：昨晚放进去的货，天亮按原价结清
    const ship = shipBox(s);
    if (ship.n) notes.push({ kind: 'box', text: '📦 收购箱 +' + ship.value });

    // 5 块地之后每周要交土地维护费
    const landFee = plotUpkeep(s.plots.length);
    const devFee = deviceUpkeep(s);
    const up = landFee + devFee;
    if (up > 0 && s.day % 7 === 0) {
      const pay = Math.min(up, s.coins);
      s.coins -= pay;
      ledger(s, '维护费（周）', 0, pay);
      notes.push({ kind: 'upkeep', text: '🧾 维护 -' + pay + '（土地 ' + landFee + ' + 设备 ' + devFee + '）' });
    }

    // 月度税金：每 30 天按金币 5% 收
    if (s.day % 30 === 0) {
      const tax = taxDue(s);
      const pay = Math.min(tax, s.coins);
      s.coins -= pay;
      ledger(s, '月度税金', 0, pay);
      notes.push({ kind: 'tax', text: '🏛️ 税 -' + pay + '（4%）' });
    }

    // 每天自动换一批委托，同时给一次手动刷新机会
    s.orders = makeOrders(s);
    s.manualRefreshUsed = false;

    // 水产店 / 农产品店每天补货
    s.shop = makeShop(s.day);
    s.cropShop = makeCropShop(s.day);

    const head = '🌙 第 ' + s.day + ' 天 · ' + w.name;
    const body = notes.filter(function (n) { return n.kind !== 'weather'; })
                      .map(function (n) { return n.text; }).join(' · ');
    log(s, '🌙 睡觉 → 第 ' + s.day + ' 天 · ' + w.name, 'sys');
    return { ok: true, msg: '新的一天', day: s.day, notes: notes, weather: s.weather,
             summary: body ? head + ' ｜ ' + body : head };
  }

  function pickBait(s, prefer) {
    if (prefer === 'worm' && s.bait.worm > 0) return 'worm';
    if (prefer === 'dough' && s.bait.dough > 0) return 'dough';
    if (prefer === 'lure' && s.lure.owned && s.lure.dur > 0) return 'lure';
    if (s.bait.worm > 0) return 'worm';
    if (s.bait.dough > 0) return 'dough';
    if (s.lure.owned && s.lure.dur > 0) return 'lure';
    return null;
  }

  function baitCount(s, kind) {
    if (kind === 'worm') return s.bait.worm;
    if (kind === 'dough') return s.bait.dough;
    if (kind === 'lure') return s.lure.owned ? s.lure.dur : 0;
    return 0;
  }

  function fish(s, preferBait, opts) {
    opts = opts || {};
    const w = WEATHER[s.weather];
    if (!opts.free && s.energy < 2) return { ok: false, msg: '体力不够（钓鱼要 2 点）' };
    const kind = opts.forceKind || pickBait(s, preferBait);
    if (!kind) return { ok: false, msg: '没有饵料了，先去挖蚯蚓或买面团饵' };

    if (!opts.free) s.energy -= 2;
    if (!opts.noBait) {
      if (kind === 'worm') {
        s.bait.worm--;
      } else if (kind === 'dough') {
        s.bait.dough--;
      } else {
        s.lure.dur--;
        if (s.lure.dur <= 0) { s.lure.owned = false; s.lure.dur = 0; }
      }
    }

    // 先判定咬钩：天气与饵决定「有没有鱼咬」，鱼种权重不再受天气影响
    s.stats.casts++;
    const hook = clamp((HOOK[kind] || 0.9) + (w.hookMod || 0) + fishHookBonus(s), 0.3, 0.98);
    if (rand() > hook) {
      if (!opts.quiet) log(s, '💨 空竿：' + w.name + '，没有鱼咬钩', 'warn');
      return { ok: true, empty: true, entry: null, msg: '空竿了' };
    }

    // 鱼种权重只由饵决定：蚯蚓多好鱼、假饵少杂物
    const table = FISH.map(function (f) {
      let mul = 1;
      if (f.trash) mul = kind === 'lure' ? BALANCE.bait.lureTrash : 1;
      else if (kind === 'worm') mul = BALANCE.bait.wormGood;
      else if (kind === 'lure') mul = BALANCE.bait.lureGood;
      if (!f.trash) mul *= fishGoodBonus(s);
      return Object.assign({}, f, { w: f.w * mul });
    });
    const f = weighted(table, 'w');
    const q = f.trash ? null : rollQuality(kind === 'worm' ? 2 : 1);
    const value = f.trash ? 1 : Math.max(1, Math.round(f.base * q.mul));

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
    s.fishBag.push({ name: name, emoji: emoji, q: q ? q.id : null, v: value, d: s.day, no: noOrder || undefined });

    const entry = { day: s.day, fish: name, emoji: emoji, quality: q, price: value,
                    base: f.base, bait: kind, trash: !!f.trash, noOrder: noOrder };
    s.fishBook.count++;
    const levelUp = addLevelXp(s, 'fish', (q && q.id === 'perfect') ? 3 : 1);
    s.fishBook.entries.unshift(entry);
    if (s.fishBook.entries.length > 40) s.fishBook.entries.length = 40;
    if (!f.trash) {
      if (!s.fishBook.best || QUALITY.indexOf(q) > QUALITY.indexOf(s.fishBook.best.quality)) {
        s.fishBook.best = { fish: f.name, quality: q, price: value, day: s.day };
      }
      if (!s.fishBook.priciest || value > s.fishBook.priciest.price) {
        s.fishBook.priciest = { fish: f.name, quality: q, price: value, day: s.day };
      }
    }
    if (!opts.quiet) {
      log(s, f.trash
        ? '🎣 钓上来 ' + emoji + ' ' + name + '（不值钱，已入仓库）'
        : '🎣 钓到 ' + emoji + ' ' + name + ' · ' + q.emoji + q.name + ' · 值 ' + value + ' 金（已入仓库）',
        f.trash ? 'warn' : 'good');
    }
    return { ok: true, entry: entry, msg: name + ' 值 ' + value + ' 金', levelUp: levelUp };
  }

  function fishMany(s, times, preferBait) {
    const results = [];
    let value = 0, empty = 0;
    for (let i = 0; i < times; i++) {
      const r = fish(s, preferBait);
      if (!r.ok) { results.push(r); break; }
      if (r.empty) empty++; else value += r.entry.price;
      results.push(r);
    }
    const okCount = results.filter(function (r) { return r.ok; }).length;
    if (!okCount) return results[0] || { ok: false, msg: '钓不了' };
    return { ok: true, count: okCount, empty: empty, income: value, results: results,
             msg: '甩了 ' + okCount + ' 杆' + (empty ? '（空竿 ' + empty + '）' : '') + '，渔获值 ' + value + ' 金' };
  }

  /* ---------------- 卖鱼 ---------------- */

  function fishKey(e) { return e.name + '|' + (e.q || '-') + '|' + e.v; }

  /* 仓库渔获的一句话简述（鱼和杂物都有） */
  function fishDesc(name) {
    for (let i = 0; i < FISH.length; i++) if (FISH[i].name === name) return FISH[i].desc || '';
    for (let i = 0; i < TRASH.length; i++) if (TRASH[i].name === name) return TRASH[i].desc || '';
    return '';
  }

  function fishGroups(s) {
    const map = new Map();
    (s.fishBag || []).forEach(function (e) {
      const key = fishKey(e);
      let g = map.get(key);
      if (!g) {
        g = { key: key, name: e.name, emoji: e.emoji, q: e.q, v: e.v, count: 0 };
        map.set(key, g);
      }
      g.count++;
    });
    return Array.from(map.values()).sort(function (a, b) { return b.v * b.count - a.v * a.count; });
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

  /* 商店直接收购只给 8 折；想卖原价就放收购箱，等第二天结算 */
  function shopValue(v) { return Math.max(1, Math.round((v || 0) * BALANCE.shop.sellRate)); }
  function shopSellValue(s, id) { return shopValue(storeValue(s, id)); }

  function sellFishGroup(s, key) {
    const g = fishGroups(s).filter(function (x) { return x.key === key; })[0];
    if (!g) return { ok: false, msg: '仓库里没有这种鱼' };
    const gain = shopValue(g.v * g.count);
    s.fishBag = s.fishBag.filter(function (e) { return fishKey(e) !== key; });
    addCoins(s, gain, '卖鱼 ' + g.name);
    log(s, '💰 卖出 ' + g.emoji + ' ' + g.name + ' ×' + g.count + '，+' + gain + ' 金（8 折）', 'good');
    return { ok: true, msg: '卖出 ' + g.name + '×' + g.count + '，+' + gain + ' 金', income: gain };
  }

  function sellAllFish(s) {
    const bag = s.fishBag || [];
    if (!bag.length) return { ok: false, msg: '仓库里没有鱼' };
    const full = bag.reduce(function (n, e) { return n + e.v; }, 0);
    const gain = shopValue(full);
    const n = bag.length;
    s.fishBag = [];
    addCoins(s, gain, '卖鱼');
    log(s, '💰 卖出全部渔获 ' + n + ' 条，+' + gain + ' 金（8 折）', 'good');
    return { ok: true, msg: '卖出 ' + n + ' 条鱼，+' + gain + ' 金', income: gain };
  }

  /* ---------------- 收购箱 ---------------- */

  function boxCount(s) { return (s.box || []).length; }
  function boxValue(s) {
    return (s.box || []).reduce(function (n, e) { return n + (e.v || 0); }, 0);
  }

  /* 整批放进收购箱：按原价，第二天睡觉时结算 */
  function boxPutCrop(s, id) {
    const n = storeCount(s, id);
    if (!n) return { ok: false, msg: '仓库里没有这种作物' };
    const c = CROPS[id];
    const v = storeValue(s, id);
    delete s.store[id];
    s.box = s.box || [];
    s.box.push({ kind: 'crop', name: c.name, emoji: c.emoji, n: n, v: v });
    log(s, '📦 ' + c.name + '×' + n + ' 放进收购箱（原价 ' + v + ' 金，明天结算）', 'info');
    return { ok: true, msg: c.name + '×' + n + ' 已入箱', v: v };
  }

  function boxPutFish(s, key) {
    const g = fishGroups(s).filter(function (x) { return x.key === key; })[0];
    if (!g) return { ok: false, msg: '没有这种渔获' };
    s.fishBag = (s.fishBag || []).filter(function (e) { return fishKey(e) !== key; });
    s.box = s.box || [];
    s.box.push({ kind: 'fish', name: g.name, emoji: g.emoji, n: g.count, v: g.v * g.count });
    log(s, '📦 ' + g.emoji + ' ' + g.name + '×' + g.count + ' 放进收购箱（原价 ' +
      (g.v * g.count) + ' 金，明天结算）', 'info');
    return { ok: true, msg: g.name + '×' + g.count + ' 已入箱', v: g.v * g.count };
  }

  /* 收购箱出货：睡觉时按原价一次性结清 */
  function shipBox(s) {
    const list = s.box || [];
    if (!list.length) return { n: 0, value: 0 };
    const value = boxValue(s);
    const n = list.reduce(function (a, e) { return a + (e.n || 1); }, 0);
    s.box = [];
    addCoins(s, value, '收购箱出货');
    return { n: n, value: value };
  }

  /* 蚯蚓也能卖：3 金/条（只在渔具店卖） */
  const WORM_VALUE = 3;

  function sellWorms(s, n) {
    const have = s.bait.worm || 0;
    if (!have) return { ok: false, msg: '没有蚯蚓可卖' };
    const qty = n ? Math.min(n, have) : have;
    const gain = qty * WORM_VALUE;
    s.bait.worm = have - qty;
    addCoins(s, gain, '卖蚯蚓');
    log(s, '💰 卖出蚯蚓 ×' + qty + '，+' + gain + ' 金', 'good');
    return { ok: true, qty: qty, income: gain, msg: '卖出蚯蚓 ×' + qty + '，+' + gain + ' 金' };
  }

  function digWorms(s) {
    if (s.energy < 3) return { ok: false, msg: '体力不够（挖蚯蚓要 3 点）' };
    const w = WEATHER[s.weather];
    const n = clamp(randInt(1, 3) + w.wormMod, 1, 5);
    s.energy -= 3;
    s.bait.worm += n;
    s.stats.dug++;
    log(s, '🪱 挖到蚯蚓 ×' + n + '（现有 ' + s.bait.worm + '）', 'good');
    return { ok: true, msg: '挖到蚯蚓 ×' + n, n: n };
  }

  function buyBait(s, kind, n) {
    n = n || 1;
    if (kind === 'dough') {
      const cost = 1 * n;
      if (s.coins < cost) return { ok: false, msg: '金币不够' };
      s.coins -= cost; ledger(s, '买面团饵 ×' + n, 0, cost);
      s.bait.dough += n;
      log(s, '🍞 买了面团饵 ×' + n + '（-' + cost + ' 金）', 'info');
      return { ok: true, msg: '面团饵 ×' + n };
    }
    if (kind === 'lure') {
      const price = BALANCE.lure.price, dur = BALANCE.lure.dur;
      if (s.lure.owned) return { ok: false, msg: '假饵一次只能持 1 个' };
      if (s.coins < price) return { ok: false, msg: '金币不够（' + price + ' 金）' };
      s.coins -= price; ledger(s, '买假饵', 0, price);
      s.lure.owned = true; s.lure.dur = dur;
      log(s, '🎣 买了一个假饵（耐用 ' + dur + ' 次）', 'info');
      return { ok: true, msg: '假饵到手' };
    }
    return { ok: false, msg: '这种饵料买不到' };
  }

  function tea(s) {
    if (s.teaUsed) return { ok: false, msg: '今天下午茶已经喝过了' };
    if (s.coins < 3) return { ok: false, msg: '金币不够（3 金）' };
    if (s.energy >= s.maxEnergy) return { ok: false, msg: '体力是满的，别浪费' };
    s.coins -= 3; ledger(s, '下午茶', 0, 3);
    s.teaUsed = true;
    s.energy = Math.min(s.maxEnergy, s.energy + 5);
    log(s, '🍵 喝了下午茶，体力 +5（' + s.energy + '/' + s.maxEnergy + '）', 'good');
    return { ok: true, msg: '体力 +5' };
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
  const NET_MAX = BALANCE.prices.netMax;
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

  /* 水产店售价：基础价的 1.8 倍 */
  function fishBuyPrice(id) {
    const f = FISH.filter(function (x) { return x.id === id; })[0];
    return f ? Math.max(3, Math.round(f.base * BALANCE.shop.priceMul)) : 0;
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
    const cost = fishBuyPrice(id) * qty;
    if (s.coins < cost) return { ok: false, msg: '金币不够' };
    s.coins -= cost;
    s.shop.stock[id] = stock - qty;
    ledger(s, '买水产 ' + f.name + ' ×' + qty, 0, cost);
    for (let i = 0; i < qty; i++) {
      s.fishBag.push({ name: f.name, emoji: f.emoji, q: 'std', v: f.base, d: s.day, bought: true });
    }
    log(s, '🐟 买进 ' + f.emoji + ' ' + f.name + ' ×' + qty + '（-' + cost + ' 金，今日剩 ' +
      s.shop.stock[id] + ' 条）', 'info');
    return { ok: true, qty: qty, cost: cost, msg: '买到 ' + f.name + ' ×' + qty };
  }

  /* ---------------- 农产品店（作物唯一出售处 + 每日进货） ---------------- */

  /* 买价 = 售价 ×2.2，一般品质（标准），转手必亏，只用来应急凑单 */
  function cropBuyPrice(id) {
    const c = CROPS[id];
    return c ? Math.max(2, Math.round(c.price * BALANCE.shop.cropPriceMul)) : 0;
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
    const cost = cropBuyPrice(id) * qty;
    if (s.coins < cost) return { ok: false, msg: '金币不够' };
    s.coins -= cost;
    s.cropShop.stock[id] = stock - qty;
    ledger(s, '买农产品 ' + c.name + ' ×' + qty, 0, cost);
    addStore(s, id, 'std', qty);
    log(s, '🛒 买进 ' + c.emoji + ' ' + c.name + ' ×' + qty + '（-' + cost + ' 金，今日剩 ' +
      s.cropShop.stock[id] + ' 个）', 'info');
    return { ok: true, qty: qty, cost: cost, msg: '买到 ' + c.name + ' ×' + qty };
  }

  /* 渔网：每天吃 1 份面团饵，70% 概率网到 1 条「标准及以下」的普通鱼（不出杂物/宝箱） */
  const NET_QUALITIES = ['bad', 'common', 'std'];
  function netCatchOne(s) {
    const pool = FISH.filter(function (f) { return !f.trash && !f.noOrder; });
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
    for (let i = 0; i < s.nets; i++) {
      if ((s.bait.dough || 0) < 1) break;
      s.bait.dough--;
      used++;
      if (rand() < NET_CHANCE) {
        const r = netCatchOne(s);
        got++; value += r.value;
      }
    }
    return { used: used, got: got, value: value };
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
    log(s, '🕸️ 在河边放了第 ' + s.nets + ' 张渔网（每天耗 1 面团饵，有概率上鱼）', 'good');
    return { ok: true, msg: '渔网 ×' + s.nets, nets: s.nets };
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

  function seedBuyPrice(c) { return c.seed; }
  function seedSellPrice(c) { return Math.max(1, Math.floor(c.seed * SEED_SELL_RATE)); }

  function buySeed(s, id, n) {
    const c = CROPS[id];
    if (!c) return { ok: false, msg: '没有这种种子' };
    if (!seedUnlocked(s, id)) {
      return { ok: false, msg: c.name + '种子要种田 Lv' + c.lv + ' 才解锁（现在 Lv' + farmLv(s) + '）' };
    }
    const qty = Math.max(1, Math.floor(n || 1));
    const cost = seedBuyPrice(c) * qty;
    if (s.coins < cost) return { ok: false, msg: '金币不够（需要 ' + cost + ' 金）' };
    s.coins -= cost;
    ledger(s, '买种子 ' + c.name + '×' + qty, 0, cost);
    s.seeds[id] = (s.seeds[id] || 0) + qty;
    log(s, '🌰 买了 ' + c.name + '种子 ×' + qty + '（-' + cost + ' 金）', 'info');
    return { ok: true, msg: '买到 ' + c.name + ' 种子 ×' + qty, qty: qty, cost: cost };
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
    log(s, '💰 清空种子，+' + total + ' 金', 'good');
    return { ok: true, msg: '卖出全部种子，+' + total + ' 金', income: total };
  }

  /* 全部播种：把所有空地都种上同一种作物 */
  function plantAll(s, cropId) {
    const c = CROPS[cropId];
    if (!c) return { ok: false, msg: '没有这种作物' };
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
    s.maxEnergy += 5;
    log(s, '💪 体力上限 → ' + s.maxEnergy + '（伙食费 ' + mealFee(s) + ' 金/天）', 'good');
    return { ok: true, msg: '体力上限 ' + s.maxEnergy, maxEnergy: s.maxEnergy };
  }

  /* ---------------- 每日委托 ---------------- */

  /* 委托池：按天数一档档解锁（前期慢一点，后期全开） */
  const ORDER_TIERS = [
    { day: 1, n: 3 }, { day: 3, n: 4 }, { day: 5, n: 5 }, { day: 7, n: 6 },
    { day: 9, n: 7 }, { day: 12, n: 8 }, { day: 15, n: 9 }, { day: 18, n: 10 }
  ];

  function orderPool(day) {
    const sorted = CROP_LIST.slice().sort(function (a, b) { return a.seed - b.seed; });
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
    const pool = orderPool(day);
    const used = [];
    const orders = [];
    const season = Math.floor((day - 1) / 30);                                  // 0 春 / 1 夏 / 2 秋 / 3 冬
    const mult = 1 + season * BALANCE.order.seasonStep;                        // 1 / 1.6 / 2.2 / 2.8

    for (let i = 0; i < 2 && pool.length; i++) {
      let c = pickOrderCrop(pool, used);
      if (!c) c = pool[i % pool.length];
      used.push(c.id);
      const qty = Math.max(1, Math.round((c.price >= 20 ? randInt(1, 2) : randInt(3, 6)) * mult));
      const reward = Math.max(6, Math.round(qty * c.price * BALANCE.order.mult));
      orders.push({
        id: 'd' + day + '-c' + i, kind: 'crop', crop: c.id, name: c.name, emoji: c.emoji,
        qty: qty, reward: reward, done: false
      });
    }

    // 鱼单：单价随季节上涨（11 → 15 → 19 → 23），不再后期白送
    const fq = Math.max(2, Math.round(randInt(2, 3) * mult));
    const per = 11 + 4 * season;
    orders.push({
      id: 'd' + day + '-f', kind: 'fish', crop: null, name: '任意鱼', emoji: '🐟',
      qty: fq, reward: Math.max(12, per * fq), done: false
    });
    return orders;
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
        done: !!o.done
      });
    });
    return out.length ? out : makeOrders(s);
  }

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
    merged.fishBook = Object.assign({ count: 0, entries: [], best: null, priciest: null }, s.fishBook || {});
    merged.stats = Object.assign({ harvests: 0, casts: 0, dug: 0, planted: 0, orders: 0, cropsSold: 0, works: 0 }, s.stats || {});
    merged.box = Array.isArray(s.box) ? s.box.slice(0, 500).filter(function (e) {
      return e && (e.kind === 'crop' || e.kind === 'fish') && e.name;
    }).map(function (e) {
      return { kind: e.kind, name: String(e.name).slice(0, 20), emoji: String(e.emoji || '').slice(0, 4),
               n: Math.round(num(e.n, 1, 1, 9999)), v: Math.round(num(e.v, 0, 0, 1e9)) };
    }) : [];
    merged.orders = normalizeOrders(s.orders, merged);
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
    merged.fishBag = Array.isArray(s.fishBag) ? s.fishBag.slice(0, 5000) : [];
    merged.ferts = Object.assign({ normal: 0, special: 0 }, s.ferts || {});
    merged.ferts.normal = Math.round(num(merged.ferts.normal, 0, 0, 999));
    merged.ferts.special = Math.round(num(merged.ferts.special, 0, 0, 999));
    merged.sprinklers = Math.round(num(s.sprinklers, 0, 0, 40));
    merged.harvester = !!s.harvester;
    merged.harvesterOn = s.harvesterOn !== false;
    merged.nets = Math.round(num(s.nets, 0, 0, NET_MAX));
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

    // 等级：老存档按已有收获 / 钓鱼次数补等级（新存档从 1 级开始）
    const rawLv = s.levels && typeof s.levels === 'object' ? s.levels : null;
    merged.levels = {
      farm: Math.round(num(rawLv && rawLv.farm, 1, 1, BALANCE.level.max)),
      fish: Math.round(num(rawLv && rawLv.fish, 1, 1, BALANCE.level.max)),
      farmXp: Math.round(num(rawLv && rawLv.farmXp, 0, 0, 999999)),
      fishXp: Math.round(num(rawLv && rawLv.fishXp, 0, 0, 999999))
    };
    if (!rawLv || (merged.levels.farm === 1 && merged.levels.farmXp === 0 &&
                   merged.levels.fish === 1 && merged.levels.fishXp === 0 &&
                   (merged.stats.harvests || 0) + (merged.stats.casts || 0) > 0)) {
      [['farm', merged.stats.harvests || 0], ['fish', merged.stats.casts || 0]].forEach(function (pair) {
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
    BALANCE: BALANCE, CROPS: CROPS, CROP_LIST: CROP_LIST, FERT: FERT, QUALITY: QUALITY, FISH: FISH,
    WEATHER: WEATHER, WEATHER_LIST: WEATHER_LIST, BAIT: BAIT, SAVE_VERSION: SAVE_VERSION,
    setRng: setRng, seasonOf: seasonOf, SEASONS: SEASONS,
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
    sellWorms: sellWorms, WORM_VALUE: WORM_VALUE,
    qualityById: qualityById,
    buySeed: buySeed, seedBuyPrice: seedBuyPrice, seedSellPrice: seedSellPrice,
    SEED_SELL_RATE: SEED_SELL_RATE,
    useFert: useFert, buyFertItem: buyFertItem, sellFert: sellFert, fertSellPrice: fertSellPrice,
    FERT_SELL_RATE: FERT_SELL_RATE, buySprinkler: buySprinkler, SPRINKLER_COST: SPRINKLER_COST,
    buyHarvester: buyHarvester, HARVESTER_COST: HARVESTER_COST, refreshOrders: refreshOrders,
    toggleHarvester: toggleHarvester, buyNet: buyNet, netCatch: netCatch,
    NET_COST: NET_COST, NET_MAX: NET_MAX, NET_CHANCE: NET_CHANCE, plotUpkeep: plotUpkeep,
    storeTotal: storeTotal, taxDue: taxDue, buyFish: buyFish, fishBuyPrice: fishBuyPrice, deviceUpkeep: deviceUpkeep, HOOK: HOOK,
    fishDesc: fishDesc, shopStock: shopStock, rollShopStock: rollShopStock, makeShop: makeShop, SHOP_STOCK: SHOP_STOCK,
    shopValue: shopValue, shopSellValue: shopSellValue,
    boxCount: boxCount, boxValue: boxValue, boxPutCrop: boxPutCrop, boxPutFish: boxPutFish, shipBox: shipBox,
    cropBuyPrice: cropBuyPrice, cropShopStock: cropShopStock, buyCrop: buyCrop, makeCropShop: makeCropShop,
    rollCropStock: rollCropStock, cropStockCap: cropStockCap, FISH_UNLOCK: FISH_UNLOCK, CROP_UNLOCK: CROP_UNLOCK,
    seedUnlocked: seedUnlocked, fertUnlocked: fertUnlocked,    sprinklerUnlocked: sprinklerUnlocked, harvesterUnlocked: harvesterUnlocked,
    netUnlocked: netUnlocked, netMax: netMax, farmLv: farmLv, fishLv: fishLv,
    levelNeed: levelNeed, addLevelXp: addLevelXp, levelEffectText: levelEffectText,
    farmYieldBonus: farmYieldBonus, fishHookBonus: fishHookBonus, fishGoodBonus: fishGoodBonus,
    taxBase: taxBase, taxInDays: taxInDays, orderWeight: orderWeight, ORDER_TIERS: ORDER_TIERS,
    ACH: ACH, ACH_CATS: ACH_CATS, checkAchievements: checkAchievements, achInfo: achInfo, rewardText: rewardText,
    fertilizeAll: fertilizeAll, canFert: canFert, fertTargets: fertTargets, sleep: sleep, fish: fish,
    fishMany: fishMany, digWorms: digWorms, buyBait: buyBait, tea: tea, work: work, workAuto: workAuto,
    expand: expand, upgrade: upgrade, rollWeather: rollWeather
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.FarmGame = API;
})(typeof window !== 'undefined' ? window : globalThis);
