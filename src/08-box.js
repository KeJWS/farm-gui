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
    if (isWinter(s.day)) return { ok: false, msg: '冬天土地封冻，挖不了蚯蚓' };
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

