/* 卖鱼与仓库（作物按品质分桶） */
  /* ---------------- 卖鱼 ---------------- */

  /* 渔获按「鱼名」分组（不同品质合并成一组，和仓库里的作物一样），杂物 / 宝箱按名字 + 种类 */
  function fishKey(e) { return e.name + (e.chest ? '|' + e.chest : ''); }

  /* 仓库渔获的一句话简述（鱼和杂物都有） */
  function fishDesc(name) {
    for (let i = 0; i < FISH.length; i++) if (FISH[i].name === name) return FISH[i].desc || '';
    for (let i = 0; i < TRASH.length; i++) if (TRASH[i].name === name) return TRASH[i].desc || '';
    return '';
  }

  /* 杂物 / 宝箱：水产店不收，只能拿去百货店或收购箱 */
  function fishIsJunk(e) {
    if (!e) return false;
    if (e.trash || e.chest) return true;
    // 老存档里的杂物可能没带 trash 标记，按名字兜底
    return TRASH_NAMES.indexOf(e.name) >= 0;
  }

  /* 渔获分组：mode='fish' 只看鱼 / 'junk' 只看杂物和宝箱 / 不传就是全部
   * 同一鱼种的不同品质合并成一行，mix 里带品质构成（界面上直接显示） */
  function fishGroups(s, mode) {
    const map = new Map();
    (s.fishBag || []).forEach(function (e) {
      if (!e) return;
      const junk = fishIsJunk(e);
      if (mode === 'fish' && junk) return;
      if (mode === 'junk' && !junk) return;
      const key = fishKey(e);
      let g = map.get(key);
      if (!g) {
        g = { key: key, name: e.name, emoji: e.emoji, count: 0, total: 0,
              junk: junk, chest: e.chest || null, mix: [], q: null, v: 0 };
        map.set(key, g);
      }
      g.count++;
      g.total += e.v || 0;
      const q = qualityById(e.q);
      let m = g.mix.filter(function (x) { return x.id === (e.q || '-'); })[0];
      if (!m) {
        m = { id: e.q || '-', n: 0, v: e.v || 0,
              name: q ? q.name : '杂物', emoji: q ? q.emoji : '🗑️',
              color: q ? q.color : 'var(--ink-3)' };
        g.mix.push(m);
      }
      m.n++;
      if (q && (!g.q || QUALITY.indexOf(q) > QUALITY.indexOf(qualityById(g.q)))) g.q = e.q;
    });
    map.forEach(function (g) {
      g.v = Math.round(g.total / Math.max(1, g.count));
      g.mix.sort(function (a, b) {
        return QUALITY.indexOf(qualityById(b.id)) - QUALITY.indexOf(qualityById(a.id));
      });
    });
    return Array.from(map.values()).sort(function (a, b) { return b.total - a.total; });
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

