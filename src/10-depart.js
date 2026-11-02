/* 百货店：茶、钥匙、宝箱回收 */
  /* ---------------- 百货店：茶 / 钥匙 / 收杂物宝箱 ---------------- */

  function teaUnlocked(s, t) { return (s.day || 1) >= (t.day || 1); }

  function buyTea(s, id, n) {
    const t = TEAS[id];
    if (!t) return { ok: false, msg: '没有这种茶' };
    if (!teaUnlocked(s, t)) return { ok: false, msg: '第 ' + t.day + ' 天才上架' };
    const qty = Math.max(1, Math.min(20, Math.floor(n || 1)));
    const cost = t.price * qty;
    if (s.coins < cost) return { ok: false, msg: '金币不够（' + cost + ' 金）' };
    s.coins -= cost; ledger(s, '买' + t.name + ' ×' + qty, 0, cost);
    s.teas = s.teas || {};
    s.teas[id] = (s.teas[id] || 0) + qty;
    log(s, t.emoji + ' 买了' + t.name + ' ×' + qty + '（-' + cost + ' 金）', 'info');
    return { ok: true, msg: t.name + ' ×' + qty, qty: qty, cost: cost };
  }

  function keyUnlocked(s, id) {
    const k = KEYS[id];
    return !!k && fishLv(s) >= (k.lv || 1);
  }

  function buyKey(s, id, n) {
    const k = KEYS[id];
    if (!k) return { ok: false, msg: '没有这种钥匙' };
    if (!keyUnlocked(s, id)) return { ok: false, msg: '钓鱼 Lv' + k.lv + ' 才上架' };
    const qty = Math.max(1, Math.min(9, Math.floor(n || 1)));
    const cost = k.price * qty;
    if (s.coins < cost) return { ok: false, msg: '金币不够（' + cost + ' 金）' };
    s.coins -= cost; ledger(s, '买' + k.name + ' ×' + qty, 0, cost);
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

  /* 水产店售价：基础价 × 1.8 × 鱼市价（缺鱼时更贵） */
  function fishBuyPrice(id, s) {
    const f = FISH.filter(function (x) { return x.id === id; })[0];
    if (!f) return 0;
    const mkt = s ? fishMarketMul(s, f.name) : 1;
    const cut = s ? (1 - townBonus(s, 'shopCut')) : 1;
    return Math.max(3, Math.round(f.base * BALANCE.shop.priceMul * mkt * cut));
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
    ledger(s, '买水产 ' + f.name + ' ×' + qty, 0, cost);
    for (let i = 0; i < qty; i++) {
      s.fishBag.push({ name: f.name, emoji: f.emoji, q: 'std', v: f.base, d: s.day, bought: true });
    }
    log(s, '🐟 买进 ' + f.emoji + ' ' + f.name + ' ×' + qty + '（-' + cost + ' 金，今日剩 ' +
      s.shop.stock[id] + ' 条）', 'info');
    return { ok: true, qty: qty, cost: cost, msg: '买到 ' + f.name + ' ×' + qty };
  }

