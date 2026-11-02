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
  function seasonIdx(day) { return Math.floor((Math.max(1, day || 1) - 1) / 30) % 4; }
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

  /* ---------------- 等级（种田 / 钓鱼） ---------------- */

  function levelNeed(lv) {
    const L = BALANCE.level;
    return L.xpBase + L.xpStep * ((lv || 1) - 1);
  }

  function levelEffectText(kind, lv) {
    if (kind === 'fish') {
      return '咬钩 +' + Math.min(10, (lv - 1) * 1.1).toFixed(1) + '% · 好鱼 +' +
        Math.min(22.5, (lv - 1) * 2.5).toFixed(1) + '%';
    }
    return '收获产量 +' + Math.floor(lv / 4);
  }

  /* 加经验，返回升了几级 */
  function addLevelXp(s, kind, n) {
    if (!s.levels) s.levels = { farm: 1, fish: 1, farmXp: 0, fishXp: 0 };
    const key = kind === 'fish' ? 'fish' : 'farm';
    const xpKey = key + 'Xp';
    // n 省略时默认 +1；显式传 0 就是「这一杆不给经验」
    const gain = (n === undefined || n === null) ? 1 : Math.max(0, Math.round(n));
    s.levels[xpKey] = (s.levels[xpKey] || 0) + gain;
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

  /* 种田等级：每 4 级 +1 产量（普通作物）；大作物不吃等级 */
  function farmYieldBonus(s) {
    return Math.floor((((s.levels && s.levels.farm) || 1)) / 4);
  }
  /* 钓鱼等级：咬钩率 +1.1%/级（最多 +10%），好鱼权重 +2.5%/级（最多 +22.5%） */
  function fishHookBonus(s) {
    return Math.min(0.10, 0.011 * ((((s.levels && s.levels.fish) || 1)) - 1));
  }
  function fishGoodBonus(s) {
    return 1 + Math.min(0.225, 0.025 * ((((s.levels && s.levels.fish) || 1)) - 1));
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

