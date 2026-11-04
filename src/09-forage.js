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

