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
    const per = 11 + 4 * season;
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
               qty: qty, reward: Math.round(qty * (18 + 4 * season)), deadline: day + 5, done: false };
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

