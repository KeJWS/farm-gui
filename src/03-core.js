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

