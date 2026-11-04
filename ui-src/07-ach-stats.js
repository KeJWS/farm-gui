/* 我的小农场 · 界面层 / 07-ach-stats.js
 * 主题切换 / 图鉴 / 成就 / 统计 / 图表
 * 由 build-ui.cjs 按文件名顺序拼进 ui.js（共享同一个 IIFE 作用域），不要单独加载。
 */

  let theme = 'light';
  function applyTheme() { document.documentElement.dataset.theme = theme; }
  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('farm-gui-theme', theme); } catch (e) { /* 忽略 */ }
    applyTheme();
  }

  function codexModal() {
    const fx = state.codex.fish || {}, cx = state.codex.crops || {};
    const species = G.FISH.filter(function (f) { return !f.trash && !f.chest; });
    const got = species.filter(function (f) { return fx[f.id] && fx[f.id].n > 0; }).length;
    const perfect = species.reduce(function (a, f) { return a + ((fx[f.id] && fx[f.id].perfect) || 0); }, 0);
    const fishValue = Object.keys(fx).reduce(function (a, k) { return a + (fx[k].value || 0); }, 0);
    const cropValue = Object.keys(cx).reduce(function (a, k) { return a + (cx[k].value || 0); }, 0);

    const stat = '<div class="codex-stat">' +
      '<div><b>' + got + '/' + species.length + '</b><span>鱼种收集</span></div>' +
      '<div><b>' + perfect + '</b><span>完美品质</span></div>' +
      '<div><b>' + fishValue + '</b><span>鱼类总价值</span></div>' +
      '<div><b>' + cropValue + '</b><span>作物 + 水果价值</span></div>' +
    '</div>';

    /* 图鉴奖励：收集到 N 种鱼 / 作物自动发奖，这里显示进度和领取状态 */
    const rw = G.codexRewards(state);
    const rwAll = rw.fish.concat(rw.crops);
    const rwDone = rwAll.filter(function (m) { return m.claimed; }).length;
    const rewardHtml =
      '<div class="store-sub">🎁 图鉴奖励 · ' + rwDone + '/' + rwAll.length + ' 已领取</div>' +
      rwAll.map(function (m) {
        const pct = Math.max(0, Math.min(100, Math.round(m.got / m.need * 100)));
        const ico = m.claimed ? '✅' : (m.got >= m.need ? '🎁' : '🔒');
        return '<div class="codex-rw' + (m.claimed ? ' got' : '') + '">' +
          '<span class="cw-k">' + ico + ' ' + m.label + ' ' + m.need + ' 种</span>' +
          '<span class="cw-bar"><i style="width:' + pct + '%"></i></span>' +
          '<span class="cw-n">' + m.got + '/' + m.need + '</span>' +
          '<span class="cw-r">' + (m.claimed ? '已领取' : m.text.replace(/^奖励\s*/, '')) + '</span>' +
        '</div>';
      }).join('');

    const bookRow = function (item, rec, emptyText) {
      const q = G.qualityById(rec.best);
      return '<div class="book-row">' +
        '<span class="be">' + item.emoji + '</span>' +
        '<span class="bn2">' + item.name + '</span>' +
        '<span class="bq" style="color:' + (q ? q.color : 'var(--ink-3)') + '">' +
          (q ? q.emoji + ' ' + q.name : (rec.n ? '—' : emptyText)) + '</span>' +
        '<span class="bd">' + (rec.first ? 'D' + rec.first : '—') + '</span>' +
        '<span class="bp">' + rec.n + '</span>' +
        '<span class="bv">' + (rec.value || 0) + '</span></div>';
    };
    const emptyRec = { n: 0, best: null, first: null, perfect: 0, value: 0 };

    const fishRows = species.map(function (f) {
      return bookRow(f, fx[f.id] || emptyRec, '未捕获');
    }).join('');

    const chestRows = G.FISH.filter(function (f) { return f.chest; }).map(function (f) {
      return bookRow(f, fx[f.id] || emptyRec, '未捞到');
    }).join('');

    const cropRows = G.CROP_LIST.map(function (c) {
      const v = cx[c.id] || { n: 0, best: null, first: null, value: 0 };
      const q = G.qualityById(v.best);
      return '<div class="book-row">' +
        '<span class="be">' + c.emoji + '</span>' +
        '<span class="bn2">' + c.name + '</span>' +
        '<span class="bq" style="color:' + (q ? q.color : 'var(--ink-3)') + '">' +
          (q ? q.emoji + ' ' + q.name : (v.n ? '—' : '未收获')) + '</span>' +
        '<span class="bd">' + (v.first ? 'D' + v.first : '—') + '</span>' +
        '<span class="bp">' + v.n + '</span>' +
        '<span class="bv">' + (v.value || 0) + '</span></div>';
    }).join('');

    /* 果园水果：和作物共用 codex.crops，单独列一段 */
    const fruitList = G.FRUIT_LIST || [];
    const gotFruit = fruitList.filter(function (c) { return cx[c.id] && cx[c.id].n > 0; }).length;
    const fruitRows = fruitList.map(function (c) {
      return bookRow(c, cx[c.id] || emptyRec, '未收获');
    }).join('');

    openModal('📖 图鉴', stat +
      rewardHtml +
      '<div class="store-sub">🐟 鱼类 · 首次 / 次数 / 累计价值</div>' + fishRows +
      '<div class="store-sub" style="margin-top:10px">🎁 宝箱 · 首次 / 数量 / 累计价值</div>' + chestRows +
      '<div class="store-sub" style="margin-top:10px">🌱 作物 · 首次 / 数量 / 累计价值</div>' + cropRows +
      '<div class="store-sub" style="margin-top:10px">🍑 水果 · ' + gotFruit + '/' + fruitList.length +
        ' 种 · 首次 / 数量 / 累计价值</div>' + fruitRows,
      '<button class="btn" data-close>关闭</button>');
  }

  /* 成就分页：按分类一页一页翻 */
  let achCat = 'farm';
  const ACH_ORDER = ['farm', 'fish', 'dev', 'biz', 'all'];

  function achModal() {
    const list = G.achInfo(state);
    const done = list.filter(function (a) { return a.done; }).length;
    const pts = G.achPts(state);
    const bonus = Math.round((G.sellBonus(state) - 1) * 100);
    const stat = '<div class="codex-stat" style="grid-template-columns:repeat(4,1fr)">' +
      '<div><b>' + done + '/' + list.length + '</b><span>已解锁</span></div>' +
      '<div><b>' + pts + '</b><span>成就点</span></div>' +
      '<div><b>+' + bonus + '%</b><span>售价加成</span></div>' +
      '<div><b>' + Math.round(done / list.length * 100) + '%</b><span>完成度</span></div>' +
    '</div>';

    if (ACH_ORDER.indexOf(achCat) < 0) achCat = 'farm';
    const tabs = ACH_ORDER.map(function (cat) {
      const items = list.filter(function (a) { return a.cat === cat; });
      const d = items.filter(function (a) { return a.done; }).length;
      return '<button class="rule-tab' + (achCat === cat ? ' on' : '') + '" data-achcat="' + cat + '">' +
        G.ACH_CATS[cat] + '<br><small>' + d + '/' + items.length + '</small></button>';
    }).join('');

    const items = list.filter(function (a) { return a.cat === achCat; });
    const rows = items.map(function (a) {
      const pct = Math.round(a.cur / a.goal * 100);
      return '<div class="ach-row' + (a.done ? ' done' : '') + '">' +
        '<span class="ae">' + a.emoji + '</span>' +
        '<div class="ai">' +
          '<div class="an">' + a.name +
            (a.done ? ' <span class="adone">D' + a.day + '</span>' : '') + '</div>' +
          '<div class="ad">' + a.desc + ' · ' + a.reward + '</div>' +
          '<div class="abar"><i style="width:' + pct + '%"></i></div>' +
        '</div>' +
        '<span class="ap">' + a.cur + '/' + a.goal + '</span>' +
      '</div>';
    }).join('');

    const idx = ACH_ORDER.indexOf(achCat);
    const nav = (idx > 0
      ? '<button class="btn" data-achnav="-1">← 上一类</button>'
      : '<button class="btn" disabled>← 上一类</button>') +
      (idx < ACH_ORDER.length - 1
        ? '<button class="btn" data-achnav="1">下一类 →</button>'
        : '<button class="btn" disabled>下一类 →</button>');

    openModal('🏆 成就',
      stat + '<div class="rule-tabs">' + tabs + '</div>' +
      '<div class="rule-crumb">' + G.ACH_CATS[achCat] + ' · ' +
        items.filter(function (a) { return a.done; }).length + '/' + items.length + ' 已解锁</div>' +
      (rows || '<div class="store-empty">这一类还没有成就</div>') +
      '<div class="shop-tip">每个成就给<b>成就点</b>，每 10 点 +1% 售价（最多 +20%，只作用于商店 / 收购箱）。进度存在存档里。</div>',
      nav + '<button class="btn" data-close>关闭</button>');
  }

  /* 成就解锁提示：一次解锁太多就合并成一条 */
  function achToasts(list) {
    if (!list || !list.length) return;
    if (list.length > 3) {
      toast('🏆 解锁 ' + list.length + ' 项成就，奖励已到账', 'good');
      SFX.good();
      return;
    }
    list.forEach(function (a, i) {
      setTimeout(function () {
        toast('🏆 ' + a.emoji + ' ' + a.name + ' · ' + (a.text || a.reward), 'good');
        SFX.good();
      }, 260 + i * 620);
    });
  }

  /* 图鉴奖励提示：一次可能同时解锁好几档 */
  function codexToasts(list) {
    if (!list || !list.length) return;
    setTimeout(function () {
      toast(list.length === 1
        ? '📖 图鉴奖励：' + list[0].label + ' ' + list[0].need + ' 种 · ' + list[0].text
        : '📖 图鉴奖励 ×' + list.length + ' 档，奖励已到账', 'good');
      SFX.good();
    }, 500);
  }

  function statsModal() {
    const days = G.ledgerByDay(state).slice().reverse().slice(-30);
    const dayCount = days.length;
    const inc = days.reduce(function (a, d) { return a + d.income; }, 0);
    const exp = days.reduce(function (a, d) { return a + d.expense; }, 0);
    const net = inc - exp;
    const netPerDay = dayCount ? Math.round(net / dayCount) : 0;
    const avgIncome = dayCount ? Math.round(inc / dayCount) : 0;
    const avgExpense = dayCount ? Math.round(exp / dayCount) : 0;
    const best = days.slice().sort(function (a, b) {
      return (b.income - b.expense) - (a.income - a.expense);
    })[0];

    const cat = {};
    function put(k, inc, exp) {
      cat[k] = cat[k] || { inc: 0, exp: 0 };
      cat[k].inc += inc; cat[k].exp += exp;
    }
    function catOf(label) {
      if (/委托/.test(label)) return '委托';
      if (/卖鱼|水产|卖蚯蚓/.test(label)) return '渔获';
      if (/卖仓库|卖 /.test(label)) return '作物';
      if (/零工/.test(label)) return '打工';
      if (/伙食/.test(label)) return '伙食';
      if (/税/.test(label)) return '税金';
      if (/维护/.test(label)) return '维护';
      if (/买/.test(label)) return '采购';
      return '其他';
    }
    days.forEach(function (d) {
      d.items.forEach(function (it) { put(catOf(it.label), it.income || 0, it.expense || 0); });
    });
    const catHtml = '<div class="stat-cats">' + Object.keys(cat).map(function (k) {
      const c = cat[k];
      const net2 = c.inc - c.exp;
      return '<span class="cat-chip"><b>' + k + '</b>' +
        (c.inc ? '<i class="cat-in">+' + c.inc + '</i>' : '') +
        (c.exp ? '<i class="cat-out">-' + c.exp + '</i>' : '') +
        '</span>';
    }).join('') + '</div>';
    openModal('📈 收益统计',
      '<div class="stat-kpis">' +
        '<div class="stat-kpi"><span>收入</span><b class="cat-in">+' + inc + '</b><small>日均 +' + avgIncome + '</small></div>' +
        '<div class="stat-kpi"><span>支出</span><b class="cat-out">-' + exp + '</b><small>日均 -' + avgExpense + '</small></div>' +
        '<div class="stat-kpi"><span>净收益</span><b class="' + (net >= 0 ? 'cat-in' : 'cat-out') + '">' +
          (net >= 0 ? '+' : '') + net + '</b><small>日均 ' + (netPerDay >= 0 ? '+' : '') + netPerDay + '</small></div>' +
      '</div>' +
      '<div class="stat-chart-head"><b>近 ' + days.length + ' 天收支趋势</b><span><i class="legend-in"></i>收入 <i class="legend-out"></i>支出</span></div>' +
      '<canvas id="stat-canvas" width="720" height="250" role="img" aria-label="最近 ' + days.length + ' 天每日收入和支出柱状图"></canvas>' +
      '<div class="stat-chart-foot"><span>柱高表示每日金额；鼠标悬停可查看具体数值</span>' +
        (best ? '<b>最佳 D' + best.day + ' · +' + (best.income - best.expense) + ' 金</b>' : '') + '</div>' + catHtml +
      '<div class="shop-tip">按账本统计最近 ' + days.length + ' 天；收入 / 支出分别汇总，净收益 = 收入 - 支出。' +
        '未发生交易的日期不会显示为零值。</div>',
      '<button class="btn" data-close>关闭</button>');
    setTimeout(function () { drawChart(days); }, 0);
  }

  function drawChart(days) {
    const cv = document.getElementById('stat-canvas');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const W = cv.width, H = cv.height;
    const compact = days.length > 14;
    const pad = { l: 44, r: 12, t: 14, b: 30 };
    const plotW = W - pad.l - pad.r, plotH = H - pad.t - pad.b;
    const scale = window.devicePixelRatio || 1;
    const dark = document.documentElement.dataset.theme === 'dark';
    const grid = dark ? '#353b43' : '#e8e1d4';
    const ink = dark ? '#a8a294' : '#817b70';
    const incomeColor = dark ? '#70c783' : '#4a9b5b';
    const expenseColor = dark ? '#ed8179' : '#d46a5f';
    ctx.clearRect(0, 0, W, H);
    let max = 1;
    days.forEach(function (d) { max = Math.max(max, d.income || 0, d.expense || 0); });
    const niceMax = Math.pow(10, Math.ceil(Math.log(max) / Math.LN10));
    const step = niceMax / 4;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
      const v = step * i, y = pad.t + plotH - plotH * (v / niceMax);
      ctx.strokeStyle = grid; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
      ctx.fillStyle = ink;
      ctx.fillText(v >= 1000 ? (v / 1000) + 'k' : String(v), pad.l - 7, y);
    }
    const slot = plotW / Math.max(1, days.length);
    const gap = Math.min(compact ? 3 : 8, slot * 0.16);
    const barW = Math.max(1, (slot - gap * 2) / 2);
    const maxLabels = compact ? 6 : 15;
    const labelEvery = Math.max(1, Math.ceil(days.length / maxLabels));
    days.forEach(function (d, i) {
      const groupX = pad.l + i * slot;
      const ih = Math.max(0, plotH * ((d.income || 0) / niceMax));
      const eh = Math.max(0, plotH * ((d.expense || 0) / niceMax));
      const ix = groupX + gap, ex = ix + barW + gap;
      ctx.fillStyle = incomeColor;
      if (ih > 0) ctx.fillRect(ix, pad.t + plotH - ih, barW, ih);
      ctx.fillStyle = expenseColor;
      if (eh > 0) ctx.fillRect(ex, pad.t + plotH - eh, barW, eh);
      const showLabel = (i % labelEvery === 0) || i === days.length - 1;
      if (showLabel) {
        ctx.fillStyle = ink; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('D' + d.day, groupX + slot / 2, H - 12);
      }
      d._chartHit = { x: groupX, width: slot, income: d.income || 0, expense: d.expense || 0 };
    });
    cv._chartDays = days;
    cv._chartScale = scale;
    cv.onmousemove = function (ev) {
      if (!cv.getBoundingClientRect || !ev) return;
      const rect = cv.getBoundingClientRect();
      const x = (ev.clientX - rect.left) * W / Math.max(1, rect.width);
      const row = days.find(function (d) { return d._chartHit && x >= d._chartHit.x && x <= d._chartHit.x + d._chartHit.width; });
      if (row) cv.title = 'D' + row.day + ' · 收入 +' + row._chartHit.income + ' 金 · 支出 -' + row._chartHit.expense + ' 金 · 净收益 ' + (row._chartHit.income - row._chartHit.expense) + ' 金';
    };
    cv.onmouseleave = function () { cv.title = '柱高表示每日收入和支出；将鼠标移到柱形上查看具体数值'; };
    cv.title = '柱高表示每日收入和支出；将鼠标移到柱形上查看具体数值';
    if (cv.setAttribute) cv.setAttribute('data-chart-ready', 'true');
  }
