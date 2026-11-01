/* ============================================================
 * 我的小农场 · 界面层
 * ============================================================ */
(function () {
  'use strict';

  const G = window.FarmGame;
  const SAVE_KEY = 'farm-gui-save-v1';

  let state = null;
  let baitSel = 'worm';
  let soundOn = true;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.prototype.slice.call(document.querySelectorAll(sel));

  /* ---------------- 存档 ---------------- */

  function save() {
    try { localStorage.setItem(SAVE_KEY, G.serialize(state)); } catch (e) { /* 忽略 */ }
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) return G.deserialize(raw);
    } catch (e) { /* 忽略 */ }
    return null;
  }

  /* ---------------- 音效 ---------------- */

  let actx = null;
  function beep(freq, dur, type, gain) {
    if (!soundOn) return;
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(gain || 0.06, actx.currentTime + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + (dur || 0.12));
      o.connect(g); g.connect(actx.destination);
      o.start(); o.stop(actx.currentTime + (dur || 0.12) + 0.02);
    } catch (e) { /* 忽略 */ }
  }
  const SFX = {
    plant: () => beep(330, 0.1, 'triangle', 0.05),
    water: () => beep(520, 0.08, 'sine', 0.04),
    coin:  () => { beep(880, 0.09, 'triangle', 0.06); setTimeout(() => beep(1180, 0.1, 'triangle', 0.05), 70); },
    catch: () => { beep(660, 0.09, 'sine', 0.06); setTimeout(() => beep(990, 0.14, 'sine', 0.05), 80); },
    good:  () => beep(740, 0.13, 'sine', 0.05),
    bad:   () => beep(200, 0.16, 'sawtooth', 0.05),
    sleep: () => { beep(420, 0.14, 'sine', 0.05); setTimeout(() => beep(300, 0.18, 'sine', 0.04), 120); }
  };

  /* ---------------- Toast / 飘字 ---------------- */

  function toast(msg, kind) {
    if (!msg) return;
    const root = $('#toast-root');
    const el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(function () {
      el.classList.add('out');
      setTimeout(function () { el.remove(); }, 320);
    }, 1900);
  }

  function floatText(x, y, text, cls) {
    const el = document.createElement('div');
    el.className = 'float ' + (cls || '');
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    $('#fx').appendChild(el);
    setTimeout(function () { el.remove(); }, 1100);
  }

  /* ---------------- 弹窗 ---------------- */

  function openModal(title, body, foot, opts) {
    const root = $('#modal-root');
    root.innerHTML =
      '<div class="modal-mask" data-close></div>' +
      '<div class="modal">' +
        '<div class="modal-head"><h3>' + title + '</h3>' +
          '<button class="x" data-close>✕</button></div>' +
        '<div class="modal-body">' + body + '</div>' +
        (foot ? '<div class="modal-foot">' + foot + '</div>' : '') +
      '</div>';
    root.classList.add('on');
    if (opts && opts.onMount) opts.onMount(root);
  }

  function closeModal() {
    const root = $('#modal-root');
    root.classList.remove('on');
    root.innerHTML = '';
  }

  const modalOpen = () => $('#modal-root').classList.contains('on');

  /* ---------------- HUD ---------------- */

  function renderHud() {
    const w = G.WEATHER[state.weather];
    $('#hud-coins').innerHTML = '💰 <b>' + state.coins + '</b>';
    $('#hud-ebar').style.width = (state.energy / state.maxEnergy * 100) + '%';
    $('#hud-etxt').textContent = state.energy + '/' + state.maxEnergy;
    const ec = $('.chip.energy');
    ec.classList.toggle('low', state.energy / state.maxEnergy <= 0.45 && state.energy > 0);
    ec.classList.toggle('empty', state.energy <= 0);

    const wc = $('#hud-weather');
    wc.textContent = w.emoji + ' ' + w.name;
    wc.dataset.w = w.id;
    wc.title = w.note;

    $('#hud-fee').textContent = '🍖 ' + G.mealFee(state) + ' 金/天';
    $('#hud-plots').textContent = '🏞️ ' + state.plots.length + ' 块';
    $('#season').textContent = '春 · 第 ' + state.day + ' 天';
  }

  /* ---------------- 农田 ---------------- */

  const PLOT_CLASS = { growing: 'growing', regrow: 'growing', ripe: 'ripe' };

  function renderPlots() {
    const grid = $('#plot-grid');
    grid.innerHTML = state.plots.map(function (p, i) {
      if (!p.crop) {
        return '<div class="plot empty" data-i="' + i + '">' +
          '<div class="plot-top"><span class="plot-no">' + (i + 1) + '</span></div>' +
          '<div class="plot-art soil"><span class="seed-dot">＋</span></div>' +
          '<div class="plot-name">空地</div>' +
          '<div class="bar"><i style="width:0%"></i></div>' +
          '<div class="plot-foot">点击播种</div>' +
        '</div>';
      }
      const c = G.CROPS[p.crop];
      const need = G.needOf(p);
      const pct = Math.round(p.growth / need * 100);
      const can = G.canHarvest(state, p);
      const cls = PLOT_CLASS[p.phase] || '';

      let badges = '';
      if (p.watered) badges += '<span title="今日已浇水">💧</span>';
      if (p.fert) badges += '<span title="已施肥 +' + p.fert + '">🧪</span>';

      let foot;
      if (p.phase === 'ripe') {
        foot = can ? '<span style="color:var(--green-d)">✨ 点击收获</span>'
                   : '明天可收';
      } else if (p.watered) {
        foot = '<span style="color:var(--blue)">今日已浇</span>';
      } else {
        foot = p.missed > 0 ? '<span class="warn">缺水 ×' + p.missed + '</span>' : '待浇水';
      }

      const nameExtra = p.phase === 'regrow' ? '再生' : '';

      return '<div class="plot ' + cls + '" data-i="' + i + '">' +
        '<div class="plot-top"><span class="plot-no">' + (i + 1) + '</span>' +
          '<div class="plot-badges">' + badges + '</div></div>' +
        '<div class="plot-art">' + G.stageEmoji(p) + '</div>' +
        '<div class="plot-name">' + c.name +
          '<small>' + (nameExtra ? nameExtra + ' ' : '') + p.growth + '/' + need + '天</small></div>' +
        '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
        '<div class="plot-foot">' + foot + '</div>' +
      '</div>';
    }).join('');

    const anyGrow = state.plots.some(function (p) {
      return p.crop && p.phase !== 'ripe' && !p.watered;
    });
    const anyRipe = state.plots.some(function (p) { return p.crop && G.canHarvest(state, p); });
    $('[data-act="waterAll"]').disabled = !anyGrow || !!G.WEATHER[state.weather].stall;
    $('[data-act="harvestAll"]').disabled = !anyRipe;
  }

  /* ---------------- 操作按钮 ---------------- */

  function renderActions() {
    $('#work-half-txt').textContent = '-' + G.workCost(state, 'half') + ' 体力 · +' + G.workPay(state, 'half') + ' 金';
    $('#work-full-txt').textContent = '-' + G.workCost(state, 'full') + ' 体力 · +' + G.workPay(state, 'full') + ' 金';
    $('#expand-txt').textContent = '第 ' + (state.plots.length + 1) + ' 块 · ' + G.expandCost(state) + ' 金';
    $('#upgrade-txt').textContent = '上限 ' + state.maxEnergy + '→' + (state.maxEnergy + 5) + ' · ' + G.upgradeCost(state) + ' 金';

    const teaBtn = $('[data-act="tea"]');
    teaBtn.disabled = state.teaUsed;
    teaBtn.querySelector('small').textContent = state.teaUsed ? '今天喝过了' : '3 金 · +5 体力';

    $('[data-act="dig"]').disabled = state.energy < 3;
    $('[data-act="work-half"]').disabled = state.energy < G.workCost(state, 'half');
    $('[data-act="work-full"]').disabled = state.energy < G.workCost(state, 'full');
    $('[data-act="expand"]').disabled = state.coins < G.expandCost(state);
    $('[data-act="upgrade"]').disabled = state.coins < G.upgradeCost(state);
  }

  /* ---------------- 钓鱼 ---------------- */

  function renderBait() {
    const list = [
      { id: 'worm', n: state.bait.worm },
      { id: 'dough', n: state.bait.dough },
      { id: 'lure', n: state.lure.owned ? state.lure.dur : 0 }
    ];
    if (!list.some(function (b) { return b.id === baitSel && b.n > 0; })) {
      const first = list.filter(function (b) { return b.n > 0; })[0];
      baitSel = first ? first.id : 'worm';
    }
    $('#bait-row').innerHTML = list.map(function (b) {
      const bd = G.BAIT[b.id];
      const cnt = b.id === 'lure' ? (b.n ? b.n + '/20' : '无') : '×' + b.n;
      return '<div class="bait ' + (b.id === baitSel ? 'sel ' : '') + (b.n ? '' : 'off') +
        '" data-bait="' + b.id + '" title="' + bd.desc + '">' +
        '<span>' + bd.emoji + '</span><span class="bn">' + bd.name + '</span>' +
        '<span class="bc">' + cnt + '</span></div>';
    }).join('');

    const w = G.WEATHER[state.weather];
    $('#fish-meta').innerHTML = w.noFish
      ? '⛔ 今天禁钓'
      : '价值 ×' + (w.fishMul || 1).toFixed(2) + ' · 体力 ' + state.energy;
    $('[data-act="cast"]').disabled = w.noFish || state.energy < 2;
    $('[data-act="cast5"]').disabled = w.noFish || state.energy < 2;
  }

  function catchCard(e) {
    const col = e.quality ? e.quality.color : '#9a866c';
    const sub = e.quality ? (e.quality.emoji + ' ' + e.quality.name) : '杂物 · 只能卖 1 金';
    return '<div class="catch-card" style="border-color:' + col + '44;box-shadow:0 4px 16px ' + col + '22">' +
      '<div class="ce">' + e.emoji + '</div>' +
      '<div><div class="cname">' + e.fish + '</div>' +
      '<div class="cq" style="color:' + col + '">' + sub + '</div></div>' +
      '<div class="cprice">+' + e.price + ' 金</div></div>';
  }

  function showCatch(e) {
    $('#catch-area').innerHTML = catchCard(e);
  }

  /* ---------------- 仓库 ---------------- */

  function renderStore() {
    const ids = Object.keys(state.store).filter(function (k) { return state.store[k] > 0; });
    const box = $('#store-list');
    if (!ids.length) {
      box.innerHTML = '<div class="store-empty">仓库空空如也，去收点菜吧 🌱</div>';
    } else {
      box.innerHTML = ids.map(function (id) {
        const c = G.CROPS[id];
        const n = state.store[id];
        return '<div class="store-row">' +
          '<span class="se">' + c.emoji + '</span>' +
          '<div><div class="sn">' + c.name + ' ×' + n + '</div>' +
          '<div class="sv">' + c.price + ' 金/个</div></div>' +
          '<span class="sp">' + n * c.price + ' 金</span>' +
          '<button class="btn mini" data-sell="' + id + '">卖出</button>' +
        '</div>';
      }).join('');
    }

    const seeds = Object.keys(state.seeds).filter(function (k) { return state.seeds[k] > 0; });
    $('#seed-box').innerHTML = '🎒 种子：' + (seeds.length
      ? seeds.map(function (id) {
          return '<span class="tag">' + G.CROPS[id].emoji + G.CROPS[id].name + ' ×' + state.seeds[id] + '</span>';
        }).join('')
      : '<span style="color:var(--ink-3)">无（收获时 30% 概率留种，多收作物仅最后一收）</span>');

    $('[data-act="sellAll"]').disabled = !ids.length;
  }

  /* ---------------- 账本 ---------------- */

  function renderLedger() {
    const rows = state.ledger.slice(0, 40);
    $('#ledger').innerHTML = rows.map(function (r) {
      const val = r.income > 0 ? '+' + r.income : (r.expense > 0 ? '-' + r.expense : '—');
      const cls = r.income > 0 ? 'up' : (r.expense > 0 ? 'down' : '');
      return '<div class="led-row">' +
        '<span class="led-day">D' + r.day + '</span>' +
        '<span class="led-label">' + r.label + '</span>' +
        '<span class="led-val ' + cls + '">' + val + '</span>' +
        '<span class="led-bal">' + r.balance + '</span>' +
      '</div>';
    }).join('') || '<div class="store-empty">还没有账目</div>';
    $('#ledger-sum').textContent = '余额 ' + state.coins + ' 金';
  }

  /* ---------------- 钓鱼记录 ---------------- */

  function renderBook() {
    const b = state.fishBook;
    $('#book-stats').innerHTML =
      '<div class="bstat"><div class="bl">累计渔获</div><div class="bv">' + b.count + ' 条</div></div>' +
      '<div class="bstat"><div class="bl">最高品质</div><div class="bv" style="color:' +
        (b.best && b.best.quality ? b.best.quality.color : 'var(--ink-3)') + '">' +
        (b.best && b.best.quality ? b.best.quality.emoji + ' ' + b.best.quality.name + ' · ' + b.best.fish : '—') + '</div></div>' +
      '<div class="bstat"><div class="bl">最贵一条</div><div class="bv" style="color:var(--gold)">' +
        (b.priciest ? b.priciest.fish + ' · ' + b.priciest.price + ' 金' : '—') + '</div></div>';

    $('#book-list').innerHTML = b.entries.length
      ? b.entries.map(function (e) {
          const col = e.quality ? e.quality.color : 'var(--ink-3)';
          const qtxt = e.quality ? (e.quality.emoji + e.quality.name) : '—';
          return '<div class="book-row">' +
            '<span class="be">' + e.emoji + '</span>' +
            '<span class="bn2">' + e.fish + '</span>' +
            '<span class="bq" style="color:' + col + '">' + qtxt + '</span>' +
            '<span class="bp">' + e.price + '</span></div>';
        }).join('')
      : '<div class="store-empty">还没钓过鱼 🎣</div>';
  }

  /* ---------------- 日志 ---------------- */

  function renderLog() {
    $('#log').innerHTML = state.log.slice(0, 40).map(function (r) {
      return '<div class="log-row ' + (r.kind || '') + '">' +
        '<span class="ld">D' + r.day + '</span><span>' + r.text + '</span></div>';
    }).join('');
  }

  /* ---------------- 总渲染 ---------------- */

  function renderAll() {
    renderHud();
    renderPlots();
    renderActions();
    renderBait();
    renderStore();
    renderLedger();
    renderBook();
    renderLog();
  }

  function commit(result) {
    renderAll();
    save();
    if (result && !result.ok && result.msg) toast(result.msg, 'warn');
    return result;
  }

  /* ---------------- 农田弹窗 ---------------- */

  function plotModal(i) {
    const p = state.plots[i];
    if (!p.crop) return cropPicker(i);

    const c = G.CROPS[p.crop];
    const need = G.needOf(p);
    const can = G.canHarvest(state, p);
    const big = !!c.big;

    let actions = '';
    if (p.phase === 'ripe') {
      actions += '<button class="btn primary" data-pact="harvest" data-i="' + i + '">' +
        (can ? '🧺 收获' : '⏳ 明天才能收') + '<small>1 体力</small></button>';
    } else {
      actions += '<button class="btn primary" data-pact="water" data-i="' + i + '"' +
        (p.watered ? ' disabled' : '') + '>💧 浇水<small>' + (p.watered ? '今天浇过了' : '1 体力 · +1 天') + '</small></button>';
      if (!big) {
        actions += '<button class="btn" data-pact="fert-normal" data-i="' + i + '"' + (p.fert ? ' disabled' : '') + '>🧪 普通肥<small>5 金 · +1 产量</small></button>';
        actions += '<button class="btn" data-pact="fert-special" data-i="' + i + '"' + (p.fert ? ' disabled' : '') + '>💊 特效肥<small>12 金 · +2 产量</small></button>';
      }
    }

    const body =
      '<div style="display:flex;gap:16px;align-items:center;margin-bottom:14px">' +
        '<div style="font-size:54px;filter:drop-shadow(0 4px 8px rgba(90,65,35,.2))">' + G.stageEmoji(p) + '</div>' +
        '<div><div style="font-size:17px;font-weight:800">' + c.name +
          (p.phase === 'regrow' ? ' <span style="font-size:11px;color:var(--ink-3)">（再生期 ' + (p.hits) + '/' + (c.regrowTimes + 1) + ' 次）</span>' : '') +
        '</div>' +
        '<div style="font-size:12px;color:var(--ink-2);margin-top:3px">' +
          '生长 ' + p.growth + '/' + need + ' 天 · 售价 ' + c.price + ' 金/个</div></div>' +
      '</div>' +
      '<dl class="kv">' +
        '<dt>当前状态</dt><dd>' + (p.phase === 'ripe' ? (can ? '✅ 可以收获' : '🌾 刚成熟，明天可收') : '🌱 生长中') + '</dd>' +
        '<dt>预计产量</dt><dd>' + G.expectedYield(state, p) + ' 个' +
          (big ? '（大作物固定 1）' : (p.fert ? '（含施肥 +' + p.fert + '）' : '')) + '</dd>' +
        '<dt>漏浇天数</dt><dd>' + (p.missed ? '<span style="color:#b4771f">' + p.missed + ' 天（产量 -' + p.missed + '）</span>' : '0 天 👍') + '</dd>' +
        '<dt>施肥</dt><dd>' + (p.fert ? '🧪 +' + p.fert + ' 产量' : (big ? '大作物不吃肥料' : '未施肥')) + '</dd>' +
      '</dl>' +
      (c.multi
        ? '<div style="margin:-2px 0 12px;font-size:11.5px;font-weight:700;color:var(--ink-2);' +
          'background:#f2f8ee;border:1px solid rgba(79,156,95,.28);border-radius:9px;padding:7px 10px">' +
          '🌿 多次收获：共 ' + (c.regrowTimes + 1) + ' 收，仅最后一收才判定 30% 留种</div>'
        : '') +
      '<div class="action-grid">' + actions + '</div>';

    openModal(c.emoji + ' ' + '第 ' + (i + 1) + ' 号地 · ' + c.name, body,
      '<button class="btn" data-close>关闭</button>');
  }

  function cropPicker(i) {
    const cards = G.CROP_LIST.map(function (c) {
      const owned = state.seeds[c.id] || 0;
      const cost = owned > 0 ? 0 : c.seed;
      const dis = cost > state.coins || state.energy < 1;
      let profit = '';
      let lineY = '';
      let lineP = '';
      if (c.multi) {
        const total = c.firstQty + c.regrowTimes * c.regrowQty;
        lineY = c.days + ' 天 · 共 ' + total + ' 个';
        lineP = c.price + ' 金/个 · 多次收';
        profit = '';
      } else if (c.big) {
        lineY = c.days + ' 天 · 固定 1 个';
        lineP = c.price + ' 金/个';
        profit = '利润 +' + (c.price - c.seed);
      } else {
        lineY = c.days + ' 天 · 产 ' + c.base + ' 个';
        lineP = c.price + ' 金/个';
        profit = '利润 +' + (c.base * c.price - c.seed) + '~';
      }
      return '<button class="crop-card" data-crop="' + c.id + '" data-plot="' + i + '"' + (dis ? ' disabled' : '') + '>' +
        '<div class="ce">' + c.emoji + '</div>' +
        '<div class="cn">' + c.name + (owned ? ' <span style="font-size:10px;color:var(--green-d)">×' + owned + '</span>' : '') + '</div>' +
        '<div class="cs">' + (owned ? '用库存种子' : '种子 ' + c.seed + ' 金') + '</div>' +
        '<div class="cm">' + lineY + '</div>' +
        '<div class="cm">' + lineP + '</div>' +
        '<div class="cp">' + profit + '</div>' +
      '</button>';
    }).join('');

    openModal('🌱 第 ' + (i + 1) + ' 号地 · 播种', cards +
      '<div style="margin-top:12px;font-size:11.5px;color:var(--ink-3);font-weight:600">' +
      '💡 生长按浇水天数计算，成熟后次日才能收获；漏浇会减产。</div>',
      '<button class="btn" data-close>取消</button>');
  }

  /* ---------------- 商店 / 帮助 / 重置 ---------------- */

  function shopModal() {
    const body =
      '<dl class="kv"><dt>🍞 面团饵</dt><dd>1 金/份 · 标准收获</dd>' +
      '<dt>🎣 假饵</dt><dd>5 金/个 · 耐用 20 次 · 持有上限 1</dd>' +
      '<dt>🪱 蚯蚓</dt><dd>只能自己挖（3 体力 → 1~3 份）</dd></dl>' +
      '<div class="action-grid">' +
        '<button class="btn" data-buy="dough" data-n="1">🍞 买 1 份<small>1 金</small></button>' +
        '<button class="btn" data-buy="dough" data-n="5">🍞 买 5 份<small>5 金</small></button>' +
        '<button class="btn" data-buy="lure" data-n="1">🎣 买假饵<small>5 金 · 20 次</small></button>' +
      '</div>';
    openModal('🛒 渔具店', body, '<button class="btn" data-close>关闭</button>');
  }

  function helpModal() {
    const cropRows = G.CROP_LIST.map(function (c) {
      return '<tr><td>' + c.emoji + ' ' + c.name + '</td><td>' + c.seed + ' 金</td><td>' + c.days + ' 天</td>' +
        '<td>' + (c.multi ? '首次 ' + c.firstQty + ' 个' : (c.big ? '1 个（固定）' : c.base + ' ±1')) + '</td>' +
        '<td>' + c.price + ' 金</td></tr>';
    }).join('');

    const body =
      '<h4 style="margin:0 0 6px;font-size:12.5px">🌤️ 天气</h4>' +
      '<table class="rule-table"><tr><th>天气</th><th>概率</th><th>效果</th></tr>' +
      G.WEATHER_LIST.map(function (w) {
        return '<tr><td>' + w.emoji + ' ' + w.name + '</td><td>' + w.w + '%</td><td>' + w.note + '</td></tr>';
      }).join('') + '</table>' +

      '<h4 style="margin:0 0 6px;font-size:12.5px">🌱 作物</h4>' +
      '<table class="rule-table"><tr><th>作物</th><th>种子</th><th>生长</th><th>产量/块</th><th>单果</th></tr>' +
      cropRows + '</table>' +

      '<h4 style="margin:0 0 6px;font-size:12.5px">⭐ 鱼获品质</h4>' +
      '<table class="rule-table"><tr><th>品质</th><th>倍率</th><th>概率</th></tr>' +
      G.QUALITY.map(function (q) {
        return '<tr><td>' + q.emoji + ' ' + q.name + '</td><td>×' + q.mul + '</td><td>' + q.w + '%</td></tr>';
      }).join('') + '</table>' +

      '<div style="font-size:11.5px;color:var(--ink-2);line-height:1.7;font-weight:600">' +
      '· 睡觉推进 1 天，扣伙食费（' + G.mealFee(state) + ' 金/天），体力回满<br>' +
      '· 体力耗尽就得睡觉；没钱吃饭只能恢复 5 点<br>' +
      '· 蚯蚓饵：收获 +30% 且品质取两次较好的<br>' +
      '· 收获时 30% 概率留种，种子下次可免费种<br>' +
      '· 多次收获作物（黄瓜/草莓）只有最后一收才判定留种<br>' +
      '· 进度自动保存在本浏览器（localStorage）</div>';

    openModal('📖 规则速查', body, '<button class="btn" data-close>知道了</button>');
  }

  function resetModal() {
    openModal('🔄 重新开始', '<div style="font-size:13px;line-height:1.7">' +
      '这会清空当前存档，从第 1 天、50 金重新开始。<br>确定吗？</div>',
      '<button class="btn" data-close>取消</button>' +
      '<button class="btn danger" id="do-reset">确定重开</button>');
  }

  /* ---------------- 动作 ---------------- */

  const ACTIONS = {
    waterAll: function (ev) {
      const r = G.waterAll(state);
      commit(r);
      if (r.ok) { toast(r.msg, 'good'); SFX.water(); floatAt(ev, '💧 ' + r.done, 'water'); }
    },
    harvestAll: function (ev) {
      const r = G.harvestAll(state);
      commit(r);
      if (r.ok) { toast(r.msg, 'good'); SFX.good(); floatAt(ev, '🧺 ' + r.msg.split('共 ')[1] || '', 'green'); }
    },
    sleep: function () {
      const r = G.sleep(state);
      commit(r);
      SFX.sleep();
      toast(r.notes[0], 'good');
      setTimeout(function () { toast(r.notes[1], ''); }, 380);
      if (r.notes[2]) setTimeout(function () { toast(r.notes[2], ''); }, 760);
    },
    dig: function (ev) {
      const r = G.digWorms(state);
      commit(r);
      if (r.ok) { toast(r.msg, 'good'); SFX.plant(); floatAt(ev, '🪱 +' + r.n, 'green'); }
    },
    tea: function (ev) {
      const r = G.tea(state);
      commit(r);
      if (r.ok) { toast(r.msg, 'good'); SFX.good(); floatAt(ev, '🔋 +5', 'green'); }
    },
    'work-half': function (ev) {
      const r = G.work(state, 'half');
      commit(r);
      if (r.ok) { toast(r.msg, 'good'); SFX.coin(); floatAt(ev, r.msg, ''); }
    },
    'work-full': function (ev) {
      const r = G.work(state, 'full');
      commit(r);
      if (r.ok) { toast(r.msg, 'good'); SFX.coin(); floatAt(ev, r.msg, ''); }
    },
    expand: function () {
      const r = G.expand(state);
      commit(r);
      if (r.ok) { toast(r.msg, 'good'); SFX.coin(); }
    },
    upgrade: function () {
      const r = G.upgrade(state);
      commit(r);
      if (r.ok) { toast(r.msg, 'good'); SFX.good(); }
    },
    shop: shopModal,
    sellAll: function () {
      const r = G.sellAll(state);
      commit(r);
      if (r.ok) { toast(r.msg, 'good'); SFX.coin(); }
    },
    cast: function (ev) {
      const r = G.fish(state, baitSel);
      commit(r);
      if (r.ok) {
        showCatch(r.entry);
        toast(r.msg, r.entry.trash ? 'warn' : 'good');
        SFX.catch();
        floatAt(ev, '+' + r.entry.price + ' 金', '');
      }
    },
    cast5: function () {
      const r = G.fishMany(state, 5, baitSel);
      commit(r);
      if (!r.ok) { toast(r.msg, 'warn'); return; }
      const best = r.results.filter(function (x) { return x.ok; })
        .sort(function (a, b) { return b.entry.price - a.entry.price; })[0];
      if (best) showCatch(best.entry);
      toast(r.msg, 'good');
      SFX.catch();
    }
  };

  function floatAt(ev, text, cls) {
    if (!ev || !ev.clientX) return;
    floatText(ev.clientX, ev.clientY - 10, text, cls);
  }

  /* ---------------- 事件绑定 ---------------- */

  function bind() {
    document.addEventListener('click', function (ev) {
      const t = ev.target;

      // 关闭弹窗
      const closer = t.closest('[data-close]');
      if (closer) { closeModal(); return; }

      if (t.closest('#do-reset')) {
        state = G.createState();
        closeModal();
        renderAll();
        save();
        toast('新的开始 🌱', 'good');
        return;
      }

      // 地块
      const plot = t.closest('.plot');
      if (plot) {
        const i = Number(plot.dataset.i);
        plotModal(i);
        return;
      }

      // 主要动作按钮
      const actBtn = t.closest('[data-act]');
      if (actBtn && !actBtn.disabled) {
        const fn = ACTIONS[actBtn.dataset.act];
        if (fn) { fn(ev); return; }
      }

      // 种植
      const cropCard = t.closest('[data-crop]');
      if (cropCard) {
        const idx = Number(cropCard.dataset.plot);
        const r = G.plant(state, idx, cropCard.dataset.crop);
        if (r.ok) {
          closeModal();
          commit(r);
          toast(r.msg, 'good');
          SFX.plant();
        } else {
          toast(r.msg, 'bad');
          SFX.bad();
        }
        return;
      }

      // 地块内动作
      const pact = t.closest('[data-pact]');
      if (pact && !pact.disabled) {
        const i = Number(pact.dataset.i);
        const kind = pact.dataset.pact;
        let r;
        if (kind === 'water') r = G.water(state, i);
        else if (kind === 'harvest') r = G.harvest(state, i);
        else if (kind === 'fert-normal') r = G.buyFert(state, i, 'normal');
        else if (kind === 'fert-special') r = G.buyFert(state, i, 'special');
        if (r) {
          if (r.ok) { closeModal(); commit(r); toast(r.msg, 'good'); SFX[r.crop ? 'coin' : 'water'](); }
          else { toast(r.msg, 'warn'); SFX.bad(); }
        }
        return;
      }

      // 贝壳状：饵料
      const bait = t.closest('[data-bait]');
      if (bait) {
        if (bait.classList.contains('off')) { toast('这个饵料用完了', 'warn'); return; }
        baitSel = bait.dataset.bait;
        renderBait();
        return;
      }

      // 商店购买
      const buy = t.closest('[data-buy]');
      if (buy) {
        const r = G.buyBait(state, buy.dataset.buy, Number(buy.dataset.n) || 1);
        commit(r);
        toast(r.ok ? r.msg : r.msg, r.ok ? 'good' : 'warn');
        return;
      }

      // 仓库单卖
      const sell = t.closest('[data-sell]');
      if (sell) {
        const r = G.sellOne(state, sell.dataset.sell);
        commit(r);
        toast(r.msg, 'good');
        SFX.coin();
        return;
      }
    });

    $('#btn-help').addEventListener('click', helpModal);
    $('#btn-reset').addEventListener('click', resetModal);
    $('#btn-save').addEventListener('click', function () { save(); toast('已存档 💾', 'good'); });
    $('#btn-sound').addEventListener('click', function () {
      soundOn = !soundOn;
      this.textContent = soundOn ? '🔊' : '🔇';
      this.classList.toggle('off', !soundOn);
      if (soundOn) SFX.good();
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && modalOpen()) closeModal();
    });
  }

  /* ---------------- 启动 ---------------- */

  function boot() {
    window.addEventListener('error', function (e) {
      console.error(e.error || e.message);
      toast('出错了：' + (e.message || '未知错误'), 'bad');
    });
    if (location.hash === '#fresh') {
      try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 忽略 */ }
    }
    const saved = load();
    if (saved) {
      state = saved;
    } else {
      state = G.createState();
    }
    bind();
    renderAll();
    save();

    if (saved) {
      setTimeout(function () { toast('读取存档：第 ' + state.day + ' 天 · ' + state.coins + ' 金', 'good'); }, 300);
    } else {
      setTimeout(function () { toast('🌾 欢迎来到我的小农场！先给空地播种吧', 'good'); }, 300);
    }
  }

  boot();
})();
