/* 我的小农场 · 界面层 / 03-panels.js
 * 仓库 / 今日委托 / 账本 / 钓鱼记录本 / 日志 / 总渲染与提交
 * 由 build-ui.cjs 按文件名顺序拼进 ui.js（共享同一个 IIFE 作用域），不要单独加载。
 */

  /* ---------------- 仓库 ---------------- */

  function renderStore() {
    const ids = Object.keys(state.store).filter(function (k) { return G.storeCount(state, k) > 0; });
    const fish = G.fishGroups(state);
    const query = storeQuery.trim().toLocaleLowerCase();
    const box = $('#store-list');
    const crops = ids.map(function (id) { return { id: id, crop: G.CROPS[id] }; })
      .filter(function (x) { return !!x.crop; });
    const planted = crops.filter(function (x) { return !x.crop.wild; });
    const wild = crops.filter(function (x) { return !!x.crop.wild; });
    const fishOnly = fish.filter(function (g) { return !g.junk && !g.chest; });
    const junk = fish.filter(function (g) { return g.junk || g.chest; });
    const wormN = state.bait.worm || 0;
    const fertRows = ['normal', 'special'].filter(function (k) { return (state.ferts[k] || 0) > 0; });
    const counts = {
      all: crops.length + fish.length + (wormN ? 1 : 0) + fertRows.length,
      crops: planted.length,
      wild: wild.length,
      fish: fishOnly.length,
      junk: junk.length,
      supplies: (wormN ? 1 : 0) + fertRows.length
    };
    function matches(text) { return !query || String(text || '').toLocaleLowerCase().indexOf(query) >= 0; }
    function cropRows(items) {
      return items.filter(function (x) { return matches(x.crop.name + ' ' + (x.crop.desc || '')); })
        .sort(function (a, b) { return G.shopSellValue(state, b.id) - G.shopSellValue(state, a.id); })
        .map(function (x) {
          const id = x.id, c = x.crop;
          const n = G.storeCount(state, id);
          const val = G.storeValue(state, id);
          const mixTxt = G.storeMix(state, id).map(function (m) {
            return '<span style="color:' + m.color + '">' + m.name + ' ' + m.n + '</span>';
          }).join(' · ');
          const mk = G.marketInfo(state, id);
          return '<div class="store-row">' +
            '<span class="se">' + c.emoji + '</span>' +
            '<div><div class="sn">' + c.name + ' ×' + n +
              ' <b class="own">市价 ×' + mk.total.toFixed(2) + '</b>' +
              (mk.inSeason ? ' <b class="own">当季</b>' : ' <b class="lock">反季</b>') + '</div>' +
            '<div class="sv"><span class="sf-note">' + (c.desc || '') + '</span> · ' + mixTxt +
              ' · 均 ' + (val / n).toFixed(1) + ' 金 · ' + mk.tag + '</div></div>' +
            '<span class="sp">' + val + ' 金</span>' +
             '<span class="spw">' +
             '<button class="btn mini" data-boxall="crop|' + id + '" title="全部放进收购箱">全部</button>' +
             '<button class="btn mini" data-boxcrop="' + id + '" title="自定义数量放进收购箱">📦</button>' +
             '</span>' +
          '</div>';
        }).join('');
    }
    function cropSection(title, items) {
      const visible = items.filter(function (x) { return matches(x.crop.name + ' ' + (x.crop.desc || '')); });
      const rows = cropRows(visible);
      return rows ? '<div class="store-sub">' + title + ' · ' + visible.length + ' 种</div>' + rows : '';
    }
    function fishRows(items) {
      return items.filter(function (g) { return matches(g.name + ' ' + G.fishDesc(g.name)); })
        .map(function (g) {
          const desc = G.fishDesc(g.name);
          // 杂物 / 宝箱不吃市价，别再挂「市价 ×1.30 · 稀缺」
          const priced = !g.junk && !g.chest;
          const mk = priced ? G.fishMarketInfo(state, g.name) : null;
          return '<div class="store-row">' +
            '<span class="se">' + esc(g.emoji) + '</span>' +
            '<div><div class="sn">' + esc(g.name) + ' ×' + g.count +
              (priced ? ' <b class="own">市价 ×' + mk.total.toFixed(2) + '</b>' : '') + '</div>' +
            '<div class="sv">' + (desc ? '<span class="sf-note">' + esc(desc) + '</span> · ' : '') +
              fishMix(g) + ' · 均 ' + (g.total / g.count).toFixed(1) + ' 金/条' +
              (priced ? ' · ' + mk.tag : (g.chest ? ' · 宝箱' : '')) + '</div></div>' +
            '<span class="sp">' + g.total + ' 金</span>' +
             '<span class="spw">' +
             '<button class="btn mini" data-boxall="fish|' + esc(g.key) + '" title="全部放进收购箱">全部</button>' +
             '<button class="btn mini" data-boxfish="' + esc(g.key) + '" title="自定义数量放进收购箱">📦</button>' +
             '</span>' +
          '</div>';
        }).join('');
    }
    const sections = [];
    if (storeFilter === 'all' || storeFilter === 'crops') sections.push(cropSection('🌱 作物', planted));
    if (storeFilter === 'all' || storeFilter === 'wild') sections.push(cropSection('🌿 野生收集物', wild));
    if (storeFilter === 'all' || storeFilter === 'fish') {
      const visible = fishOnly.filter(function (g) { return matches(g.name + ' ' + G.fishDesc(g.name)); });
      const rows = fishRows(visible);
      if (rows) sections.push('<div class="store-sub">🐟 渔获 · ' + visible.reduce(function (n, g) { return n + g.count; }, 0) + ' 条</div>' + rows);
    }
    if (storeFilter === 'all' || storeFilter === 'junk') {
      const visible = junk.filter(function (g) { return matches(g.name + ' ' + G.fishDesc(g.name)); });
      const rows = fishRows(visible);
      if (rows) sections.push('<div class="store-sub">🗑️ 杂物与宝箱 · ' + visible.reduce(function (n, g) { return n + g.count; }, 0) + ' 件</div>' + rows);
    }
    if (storeFilter === 'all' || storeFilter === 'supplies') {
      const supplyRows = [];
      if (wormN && matches('蚯蚓 worm')) supplyRows.push('<div class="store-row"><span class="se">🪱</span><div><div class="sn">蚯蚓 ×' + wormN + '</div><div class="sv">' + G.WORM_VALUE + ' 金/条 · 也可当饵用</div></div><span class="sp">' + (wormN * G.WORM_VALUE) + ' 金</span></div>');
      fertRows.forEach(function (k) {
        const f = G.FERT[k], n = state.ferts[k], sp = G.fertSellPrice(k);
        if (!matches(f.name + ' 肥料')) return;
        supplyRows.push('<div class="store-row"><span class="se">' + f.emoji + '</span><div><div class="sn">' + f.name + ' ×' + n + '</div><div class="sv">半价回收 ' + sp + ' 金/袋 · +' + f.add + ' 产量</div></div><span class="sp">' + (n * sp) + ' 金</span></div>');
      });
      if (supplyRows.length) sections.push('<div class="store-sub">🧰 农场用品 · ' + supplyRows.length + ' 类</div>' + supplyRows.join(''));
    }
    const content = sections.filter(Boolean).join('');
    box.innerHTML = content || (query
      ? '<div class="store-empty">没有找到匹配的库存，试试别的名称 🔎</div>'
      : (counts.all ? '<div class="store-empty">这个分类目前没有库存</div>' : '<div class="store-empty">仓库空空如也，去收点菜 / 钓点鱼吧 🌱</div>'));
    $$('[data-store-filter]').forEach(function (btn) {
      const active = btn.dataset.storeFilter === storeFilter;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      btn.querySelector('span').textContent = counts[btn.dataset.storeFilter] || 0;
    });

    const seeds = Object.keys(state.seeds).filter(function (k) { return state.seeds[k] > 0; });
    $('#seed-box').innerHTML = '🎒 种子：' + (seeds.length
      ? seeds.map(function (id) {
          return '<span class="tag">' + G.CROPS[id].emoji + G.CROPS[id].name + ' ×' + state.seeds[id] + '</span>';
        }).join('')
      : '<span style="color:var(--ink-3)">无（收获 30% 留种，或去商店买）</span>');

    const quantity = ids.reduce(function (n, id) { return n + G.storeCount(state, id); }, 0) +
      fish.reduce(function (n, g) { return n + g.count; }, 0) + wormN +
      fertRows.reduce(function (n, k) { return n + (state.ferts[k] || 0); }, 0);
    $('#store-sum').textContent = '收购箱到手约 ' + G.storeNetEstimate(state) + ' 金 · ' + quantity + ' 件';
    const boxBtn = $('#btn-box');
    if (boxBtn) {
      const n = G.boxCount(state);
      boxBtn.textContent = '📦 收购箱' + (n ? ' (' + n + ')' : '');
      boxBtn.title = n ? '待出货 ' + G.boxValue(state) + ' 金（入箱锁价，含 5% 费）' : '仓库里点 📦 放货进去';
    }
  }

  /* ---------------- 配送委托（按天刷新） ---------------- */

  function renderOrders() {
    const list = state.orders || [];
    const box = $('#order-list');
    const doneN = list.filter(function (o) { return o.done; }).length;
    $('#orders-sum').textContent = list.length ? doneN + '/' + list.length + ' 完成' : '';
    const rb = $('#btn-refresh-orders');
    if (rb) {
      rb.disabled = !!state.manualRefreshUsed;
      rb.title = rb.disabled ? '今天已经手动刷新过了，明天自动换新' : '手动换一批委托（每天一次）';
    }
    if (!list.length) {
      box.innerHTML = '<div class="store-empty">今天没有委托，睡一觉再来看</div>';
      return;
    }
    const longHtml = (function () {
      const lo = state.longOrder;
      if (!lo) {
        return state.longOrderReadyDay > state.day
          ? '<div class="order-row long"><span class="oe">📜</span>' +
            '<div class="oi"><div class="on">长期委托已交付</div>' +
            '<div class="os">明日睡醒后刷新下一张</div></div></div>'
          : '';
      }
      const have = G.orderHave(state, lo);
      const full = have >= lo.qty;
      const left = Math.max(0, (lo.deadline || 0) - state.day);
      const bonus = Math.round(lo.reward * Math.min(0.5, 0.1 * left));
      return '<div class="order-row long">' +
        '<span class="oe">📜</span>' +
        '<div class="oi">' +
          '<div class="on">长期 · ' + lo.emoji + ' ' + lo.name + ' ×' + lo.qty +
            ' · 报酬 ' + lo.reward + ' 金</div>' +
          '<div class="os">' + (lo.kind === 'fish' ? '渔获' : '仓库') + ' ' +
            Math.min(have, lo.qty) + '/' + lo.qty + ' · ' + (left === 0 ? '今天截止' : '还剩 ' + left + ' 天') + ' · 2 倍价' +
            (lo.mul && Math.abs(lo.mul - 1) > 0.01 ? '（含市价 ×' + lo.mul.toFixed(2) + '）' : '') +
            (lo.kind === 'fish' ? ' · 交付时优先扣低价的自钓鱼' : '') +
            (bonus ? ' · <b style="color:var(--green-d)">今天交 +' + bonus + ' 金</b>' : '') + '</div>' +
        '</div>' +
        '<button class="btn mini" data-long="1"' + (full ? '' : ' disabled') + '>交付</button>' +
      '</div>';
    })();
    box.innerHTML = longHtml + list.map(function (o) {
      const have = G.orderHave(state, o);
      const full = have >= o.qty;
      const thing = o.kind === 'fish' ? '渔获' : '仓库';
      return '<div class="order-row' + (o.done ? ' done' : '') + '">' +
        '<span class="oe">' + o.emoji + '</span>' +
        '<div class="oi">' +
          '<div class="on">' + o.name + ' ×' + o.qty + ' · 报酬 ' + o.reward + ' 金</div>' +
          '<div class="os">' + (o.done ? '✅ 已完成' : thing + ' ' + Math.min(have, o.qty) + '/' + o.qty +
            ' · 约 ' + Math.round(o.reward / o.qty) + ' 金/个' +
            (o.mul && Math.abs(o.mul - 1) > 0.01 ? ' · 含市价 ×' + o.mul.toFixed(2) : '') +
            (o.kind === 'fish' ? '（交最便宜的）' : '')) + '</div>' +
        '</div>' +
        (o.done ? '' :
          '<button class="btn mini" data-order="' + o.id + '"' + (full ? '' : ' disabled') + '>交付</button>') +
      '</div>';
    }).join('');
  }

  /* ---------------- 账本（Tab 筛选 + 每日折叠） ---------------- */

  let ledgerFilter = 'all'; // 'all' | 'income' | 'expense'
  const LEDGER_ICONS = { 
    '委托': '📋', '收购箱': '📦', '农产品店': '🧺', '水产店': '🐟',
    '洒水器': '🚿', '伙食': '🍖', '维护': '🔧', '捐赠': '🏘️' 
  };

  function renderLedger() {
    const box = $('#ledger');
    // 使用 G.ledgerByDay 获取按天分组的数据
    const days = G.ledgerByDay(state);
    
    // Tab 按钮
    const tabs = ['全部', '收入', '支出'].map(function (t) {
      const k = t === '全部' ? 'all' : (t === '收入' ? 'income' : 'expense');
      return '<button class="ledger-tab' + (ledgerFilter === k ? ' active' : '') + 
             '" data-ledger-filter="' + k + '">' + t + '</button>';
    }).join('');
    
    let html = '<div class="ledger-tabs">' + tabs + '</div>';
    html += '<ol class="ledger-list">';
    
    days.slice(0, 14).forEach(function (d) {
      const net = d.income - d.expense;

      html += '<li class="ledger-day">';
      html += '<details>';
      html += '<summary class="ledger-summary">' +
              '<span>D' + d.day + '</span>' +
              '<span class="ledger-net">' + (net >= 0 ? '+' : '') + net + ' 金</span>' +
              '</summary>';
      html += '<ul class="ledger-entries">';
      d.items.forEach(function (e) {
        if (ledgerFilter === 'income' && !e.income) return;
        if (ledgerFilter === 'expense' && !e.expense) return;
        
        const isInc = e.income > 0;
        const amt = isInc ? '+' + e.income : '-' + e.expense;
        const cls = isInc ? ' inc' : ' exp';
        const mainLabel = e.label.split('·')[0];
        const icon = LEDGER_ICONS[mainLabel] || '💰';
        
        html += '<li class="ledger-item' + cls + '">' +
                '<span class="ledger-icon">' + icon + '</span>' +
                '<span class="ledger-label">' + esc(e.label) + '</span>' +
                '<span class="ledger-amt">' + amt + ' 金</span></li>';
      });
      html += '</ul></details></li>';
    });
    html += '</ol>';
    box.innerHTML = html;
    $('#ledger-sum').textContent = '余额 ' + state.coins + ' 金';
  }

  /* ---------------- 钓鱼记录（卡片网格 + Tab） ---------------- */

  let bookFilter = 'all'; // 'all' | 'fish' | 'chest'

  function renderBook() {
    const b = state.fishBook;
    const entries = b.entries || [];
    const fishN = entries.filter(function (e) { return !e.noOrder; }).length;
    const chestN = entries.filter(function (e) { return !!e.chest; }).length;

    // 统计摘要：累计渔获 / 最高品质 / 最贵一条（沿用逻辑层维护的字段）
    const statHtml = '<div class="book-stats-bar">' +
      '<div class="bstat"><div class="bl">累计渔获</div><div class="bv">' + b.count + ' 条</div></div>' +
      '<div class="bstat"><div class="bl">最高品质</div><div class="bv" style="color:' +
        esc(b.best && b.best.quality ? b.best.quality.color : 'var(--ink-3)') + '">' +
        (b.best && b.best.quality ? esc(b.best.quality.emoji) + ' ' + esc(b.best.quality.name) + ' · ' + esc(b.best.fish) : '—') + '</div></div>' +
      '<div class="bstat"><div class="bl">最贵一条</div><div class="bv" style="color:var(--gold)">' +
        (b.priciest ? esc(b.priciest.fish) + ' · ' + b.priciest.price + ' 金' : '—') + '</div></div>' +
    '</div>';

    // Tab（杂物并入「全部」，不单列）
    const tabs = [
      { k: 'all', l: '全部', n: entries.length },
      { k: 'fish', l: '🐟 鱼', n: fishN },
      { k: 'chest', l: '🎁 宝箱', n: chestN }
    ].map(function (t) {
      return '<button class="book-tab' + (bookFilter === t.k ? ' active' : '') +
             '" data-book-filter="' + t.k + '">' + t.l + ' (' + t.n + ')</button>';
    }).join('');

    // 过滤 + 倒序（新的在前）
    if (bookFilter === 'junk') bookFilter = 'all';
    const filtered = entries.filter(function (e) {
      if (bookFilter === 'chest') return !!e.chest;
      if (bookFilter === 'fish') return !e.noOrder && !e.chest;
      return true;
    }).slice().reverse();

    // 卡片：名字 → 品质 → 价格
    const cards = filtered.map(function (e) {
      const q = e.quality || null;
      const col = q ? q.color : (e.chest ? '#c08c1f' : 'var(--ink-3)');
      const bg = e.chest ? 'background:linear-gradient(135deg, rgba(192,140,31,.1), rgba(192,140,31,.03));' : '';
      const qtxt = q ? (q.emoji + ' ' + q.name) : (e.chest ? '宝箱' : '杂物');
      return '<div class="book-card book-card-sm" style="border-left-color:' + col + ';' + bg + '">' +
        '<span class="book-card-emoji">' + esc(e.emoji) + '</span>' +
        '<span class="book-card-name">' + esc(e.fish) + '</span>' +
        '<span class="book-card-type" style="color:' + col + '">' + esc(qtxt) + '</span>' +
        '<span class="book-card-price">' + e.price + ' 金</span>' +
      '</div>';
    }).join('');

    document.getElementById('book-stats').innerHTML = statHtml + '<div class="book-tabs">' + tabs + '</div>';
    document.getElementById('book-list').innerHTML = cards || '<div class="store-empty">暂无记录</div>';
  }

  /* ---------------- 日志（时间线视图） ---------------- */

  const LOG_ICONS = { 
    good: '✅', warn: '⚠️', info: 'ℹ️', 
    ach: '🏆', order: '📋', fish: '🎣', orchard: '🍑' 
  };

  function renderLog() {
    const box = $('#log');
    if (!state.log.length) {
      box.innerHTML = '<div class="log-empty">还没有任何记录，开始种田吧 🌱</div>';
      return;
    }
    
    // 按天分组
    const days = {};
    state.log.forEach(function (e) {
      if (!days[e.day]) days[e.day] = [];
      days[e.day].push(e);
    });
    
    // 生成时间线 HTML（每天一个 details，默认收起）
    let html = '<ol class="log-timeline">';
    Object.keys(days).sort(function (a, b) { return b - a; }).forEach(function (day) {
      html += '<li class="log-day" id="log-d' + day + '">';
      html += '<details>';
      html += '<summary class="log-date">D' + day +
              '<span class="log-count">' + days[day].length + ' 条</span></summary>';
      html += '<ul class="log-entries">';
      days[day].forEach(function (e) {
        const icon = LOG_ICONS[e.kind] || 'ℹ️';
        const cls = e.kind === 'warn' ? ' warn' : (e.kind === 'good' ? ' good' : '');
        html += '<li class="log-entry' + cls + '">' +
                '<span class="log-icon">' + icon + '</span>' +
                '<span class="log-text">' + esc(e.text) + '</span></li>';
      });
      html += '</ul></details></li>';
    });
    html += '</ol>';
    box.innerHTML = html;
  }

  /* ---------------- 焦点保持 ---------------- */
  /* 每次操作都会全量重绘面板，DOM 节点被换掉，键盘用户的焦点会掉回 body，
   * 得从头 Tab。这里在重绘前记下焦点元素的 data 标识，重绘后按同样的标识找回来。
   * 弹窗（#modal-root）里的焦点不归这里管，直接跳过。 */

  const FOCUS_DATA = ['i', 'bait', 'order', 'long', 'tree', 'orc',
                      'marketPage', 'storeFilter'];

  function dataAttr(key) {
    return 'data-' + key.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); });
  }

  function focusSnapshot() {
    const el = document.activeElement;
    if (!el || el === document.body || !el.dataset) return null;
    if (el.closest && el.closest('#modal-root')) return null;
    const keys = Object.keys(el.dataset);
    if (!keys.length) return null;
    for (let i = 0; i < FOCUS_DATA.length; i++) {
      const k = FOCUS_DATA[i];
      if (el.dataset[k] !== undefined && el.dataset[k] !== '') {
        return { key: k, value: String(el.dataset[k]) };
      }
    }
    return { key: keys[0], value: String(el.dataset[keys[0]]) };
  }

  function restoreFocus(snap) {
    if (!snap) return;
    const value = snap.value.replace(/["\\]/g, '\\$&');
    const next = document.querySelector('[' + dataAttr(snap.key) + '="' + value + '"]');
    if (!next || !next.focus) return;
    try { next.focus({ preventScroll: true }); } catch (e) { next.focus(); }
  }

  /* ---------------- 总渲染 ---------------- */

  function renderAll() {
    const focus = focusSnapshot();
    renderHud();
    renderPlots();
    renderOrchard();
    renderActions();
    renderBait();
    renderCatch();
    renderStore();
    renderOrders();
    renderLedger();
    renderBook();
    renderLog();
    restoreFocus(focus);
  }

  function commit(result) {
    const unlocked = G.checkAchievements(state);
    const codexGot = G.checkCodexRewards(state);
    renderAll();
    save();
    if (result && !result.ok && result.msg) toast(result.msg, 'warn');
    achToasts(unlocked);
    codexToasts(codexGot);
    return result;
  }
