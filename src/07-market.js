/* 市场价格：供需、季节、小镇声望、掉档提示、价格历史 */
  /* ---------------- 市场价格 ----------------
   * 供给：最近卖得越多越便宜（×1.30 稀缺 → ×0.70 过剩，作物每件 -0.02、鱼每条 -0.015）
   * 季节：当季 / 汛期 ×1.00，反季 / 非汛期 ×2.00（物以稀为贵）
   * 冷却：每睡一觉销量回落 30%
   */
  function marketTag(supply) {
    const M = BALANCE.market;
    if (supply >= M.scarce) return '稀缺';
    if (supply <= M.glut) return '过剩';
    return '平稳';
  }

  function marketOf(s, id) {
    s.market = s.market || {};
    if (!s.market[id]) s.market[id] = { sold: 0 };
    return s.market[id];
  }
  function marketSold(s, id) { return (s.market && s.market[id] && s.market[id].sold) || 0; }

  function marketInfo(s, id) {
    const M = BALANCE.market;
    const sold = marketSold(s, id);
    const supply = clamp(M.supplyMax - M.cropStep * sold, M.supplyMin, M.supplyMax);
    const inSeason = CROPS[id] ? cropSeasonOk(id, s.day) : true;
    const season = inSeason ? 1 : M.offSeason;
    const total = supply * season * (1 + townBonus(s, 'marketBonus'));
    return { sold: sold, supply: supply, season: season, inSeason: inSeason, total: total,
             tag: marketTag(supply) };
  }
  function marketMul(s, id) { return marketInfo(s, id).total; }
  function addSupply(s, id, n) { marketOf(s, id).sold += Math.max(0, n || 0); }

  /* ---------------- 鱼的市场（供需 + 汛期） ---------------- */
  function fishMarketOf(s, name) {
    s.marketF = s.marketF || {};
    if (!s.marketF[name]) s.marketF[name] = { sold: 0 };
    return s.marketF[name];
  }
  function fishMarketInfo(s, name) {
    const M = BALANCE.market;
    const sold = (s.marketF && s.marketF[name] && s.marketF[name].sold) || 0;
    const supply = clamp(M.supplyMax - M.fishStep * sold, M.supplyMin, M.supplyMax);
    const f = fishByName(name);
    const inRun = f && f.seasons ? f.seasons.indexOf(seasonIdx(s.day)) >= 0 : true;
    const season = inRun ? 1 : M.offSeason;
    const total = supply * season * (1 + townBonus(s, 'marketBonus'));
    return { sold: sold, supply: supply, season: season, inRun: inRun, total: total,
             tag: marketTag(supply) };
  }
  function fishMarketMul(s, name) { return fishMarketInfo(s, name).total; }
  function addFishSupply(s, name, n) { fishMarketOf(s, name).sold += Math.max(0, n || 0); }

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
    const toCalm = supply > M.scarce
      ? Math.max(0, Math.ceil((M.supplyMax - M.scarce) / step - sold - 1e-9)) : 0;
    const toGlut = supply > M.glut
      ? Math.max(0, Math.ceil((M.supplyMax - M.glut) / step - sold - 1e-9)) : 0;
    const toFloor = Math.max(0, Math.ceil((M.supplyMax - M.supplyMin) / step - sold - 1e-9));
    return { supply: supply, toCalm: toCalm, toGlut: toGlut, toFloor: toFloor,
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

  /* 每天睡醒记一次市价，攒出曲线 */
  function snapshotMarket(s) {
    CROP_LIST.forEach(function (c) { pushMarketHist(s, c.id, marketMul(s, c.id)); });
    WILD_LIST.forEach(function (c) { pushMarketHist(s, c.id, marketMul(s, c.id)); });
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
  function shopSellValue(s, id) {
    return Math.max(1, Math.round(shopValue(storeValue(s, id)) * sellBonus(s) * marketMul(s, id)));
  }

  function sellFishGroup(s, key) {
    const g = fishGroups(s, 'fish').filter(function (x) { return x.key === key; })[0];
    if (!g) return { ok: false, msg: '仓库里没有这种鱼' };
    const gain = Math.max(1, Math.round(shopValue(g.total) * sellBonus(s) * fishMarketMul(s, g.name)));
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
      gain += Math.max(1, Math.round(shopValue(g.total) * sellBonus(s) * fishMarketMul(s, g.name)));
      addFishSupply(s, g.name, g.count);
      n += g.count;
    });
    s.fishBag = (s.fishBag || []).filter(function (e) { return fishIsJunk(e); });
    addCoins(s, gain, '卖鱼');
    log(s, '💰 卖出全部渔获 ' + n + ' 条，+' + gain + ' 金（8 折）', 'good');
    return { ok: true, msg: '卖出 ' + n + ' 条鱼，+' + gain + ' 金', income: gain };
  }

