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
    const cost = BALANCE.forage.energy;
    const pool = foragePool(s.day);
    if (!pool.length) return { ok: false, msg: '这个季节后山没什么可采的' };
    if (s.energy < cost) return { ok: false, msg: '体力不够（采集要 ' + cost + ' 点），先睡觉吧' };
    s.energy -= cost;
    const w = pool[Math.floor(rand() * pool.length)];
    const n = 1 + (rand() < BALANCE.forage.double ? 1 : 0);
    const q = rollQuality(1);
    addStore(s, w.id, q.id, n);
    s.stats.forages = (s.stats.forages || 0) + 1;
    let seedTxt = '';
    if (rand() < BALANCE.forage.seedChance) {
      const cand = forageSeedPool(s);
      if (cand.length) {
        const c = cand[Math.floor(rand() * cand.length)];
        s.seeds[c.id] = (s.seeds[c.id] || 0) + 1;
        seedTxt = '，顺手摘到 ' + c.name + '种子 ×1';
      }
    }
    log(s, '🌿 采集：' + w.emoji + ' ' + w.name + ' ×' + n + '（' + q.name + '）' + seedTxt, 'good');
    return { ok: true, msg: '采到 ' + w.name + ' ×' + n, wild: w.id, qty: n, q: q.id,
             seed: seedTxt ? true : false };
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

