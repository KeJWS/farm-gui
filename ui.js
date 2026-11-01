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

  /* ---------------- 导入 / 导出 ---------------- */

  function stamp() {
    const d = new Date();
    const p2 = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + p2(d.getMonth() + 1) + p2(d.getDate()) + '-' +
           p2(d.getHours()) + p2(d.getMinutes());
  }

  function download(name, text, mime) {
    const blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 80);
  }

  function exportSave() {
    download('小农场存档-' + stamp() + '.json', G.serialize(state), 'application/json;charset=utf-8');
    toast('存档已导出 ⬇️', 'good');
  }

  function exportLog() {
    const dayWater = '第 ' + state.day + ' 天 · ' + state.coins + ' 金 · 体力 ' +
      state.energy + '/' + state.maxEnergy + ' · ' + state.plots.length + ' 块地';
    const lines = state.log.slice().reverse().map(function (r) {
      return '- **D' + r.day + '** ' + r.text;
    });
    const text = '# 我的小农场 · 游戏日志\n\n' +
      '> 导出时间：' + new Date().toLocaleString('zh-CN') + '\n' +
      '> 当前进度：' + dayWater + '\n' +
      '> 累计渔获：' + state.fishBook.count + ' 条\n\n' +
      lines.join('\n') + '\n';
    download('小农场日志-' + stamp() + '.md', text, 'text/markdown;charset=utf-8');
    toast('日志已导出 ⬇️', 'good');
  }

  function importSave(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const raw = JSON.parse(String(reader.result));
        if (!raw || !Array.isArray(raw.plots) || typeof raw.coins !== 'number') {
          throw new Error('bad save');
        }
        state = G.deserialize(raw);
        catchLog = (state.fishBook.entries || []).slice(0, 5);
        save();
        renderAll();
        toast('存档已导入：第 ' + state.day + ' 天 · ' + state.coins + ' 金', 'good');
      } catch (e) {
        toast('导入失败：不是有效的小农场存档', 'bad');
      }
    };
    reader.readAsText(file);
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
    const anyEmpty = state.plots.some(function (p) { return !p.crop; });
    const seedTotal = Object.keys(state.seeds).reduce(function (n, k) { return n + (state.seeds[k] || 0); }, 0);
    const fertList = G.fertTargets(state);

    $('[data-act="waterAll"]').disabled = !anyGrow;
    $('[data-act="harvestAll"]').disabled = !anyRipe;
    $('[data-act="plantAll"]').disabled = !anyEmpty;
    $('[data-act="fertilizeAll"]').disabled = !fertList.length || state.energy < 1 || state.coins < 5;
    $('#plantall-txt').textContent = anyEmpty
      ? (seedTotal ? '库存 ' + seedTotal + ' 颗 · 空地 ' + state.plots.filter(function (p) { return !p.crop; }).length + ' 块'
                   : '没种子 · 点这里去种子店')
      : '没有空地';
    $('#fertall-txt').textContent = fertList.length
      ? '可施 ' + fertList.length + ' 块 · 5 金起'
      : (anyGrow ? '都施过肥了' : '没有进行中的作物');
  }

  /* ---------------- 操作按钮 ---------------- */

  function renderActions() {
    const fullNeed = G.workCost(state, 'full');
    const halfNeed = G.workCost(state, 'half');
    if (state.energy >= fullNeed) {
      $('#work-txt').textContent = '全天 · -' + fullNeed + ' 体力 · +' + G.workPay(state, 'full') + ' 金';
    } else if (state.energy >= halfNeed) {
      $('#work-txt').textContent = '半天 · -' + halfNeed + ' 体力 · +' + G.workPay(state, 'half') + ' 金';
    } else if (state.energy > 0) {
      $('#work-txt').textContent = '半天 · 用光 ' + state.energy + ' 点 · +' + Math.round(state.energy) + ' 金';
    } else {
      $('#work-txt').textContent = '体力不足 · 先睡觉';
    }
    $('#expand-txt').textContent = '第 ' + (state.plots.length + 1) + ' 块 · ' + G.expandCost(state) + ' 金';
    $('#upgrade-txt').textContent = '上限 ' + state.maxEnergy + '→' + (state.maxEnergy + 5) + ' · ' + G.upgradeCost(state) + ' 金';

    const teaBtn = $('[data-act="tea"]');
    teaBtn.disabled = state.teaUsed || state.energy >= state.maxEnergy;
    $('#tea-txt').textContent = state.teaUsed
      ? '今天喝过了'
      : (state.energy >= state.maxEnergy ? '体力已满' : '3 金 · +5 体力');

    $('[data-act="dig"]').disabled = state.energy < 3;
    $('[data-act="work"]').disabled = state.energy <= 0;
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

    $('[data-act="cast"]').disabled = state.energy < 2;
    $('[data-act="cast5"]').disabled = state.energy < 2;
  }

  /* 最近渔获：单杆/连甩都按条列出来，保留最近 5 条 */
  let catchLog = [];

  function renderCatch() {
    const box = $('#catch-area');
    if (!catchLog.length) {
      box.innerHTML = '<div class="catch-empty">今天还没开张，甩一杆试试 🌊</div>';
      return;
    }
    const sum = catchLog.reduce(function (n, e) { return n + e.price; }, 0);
    box.innerHTML =
      '<div class="catch-sum">最近 ' + catchLog.length + ' 条 · 共值 ' + sum + ' 金（在仓库里卖）</div>' +
      '<div class="catch-list">' + catchLog.map(function (e) {
        const col = e.quality ? e.quality.color : '#9a866c';
        return '<div class="catch-item" style="border-left-color:' + col + '">' +
          '<span class="ce">' + e.emoji + '</span>' +
          '<span class="cn2">' + e.fish + '</span>' +
          '<span class="cq2" style="color:' + col + '">' +
            (e.quality ? e.quality.emoji + ' ' + e.quality.name : '杂物') + '</span>' +
          '<span class="cp2">值 ' + e.price + '</span>' +
        '</div>';
      }).join('') + '</div>';
  }

  function pushCatch(entry) {
    catchLog.unshift(entry);
    if (catchLog.length > 5) catchLog.length = 5;
    renderCatch();
  }

  function setCatchBatch(entries) {
    catchLog = entries.slice().reverse().slice(0, 5);
    renderCatch();
  }

  /* ---------------- 仓库 ---------------- */

  function renderStore() {
    const ids = Object.keys(state.store).filter(function (k) { return state.store[k] > 0; });
    const fish = G.fishGroups(state);
    const fishCount = fish.reduce(function (n, g) { return n + g.count; }, 0);
    const box = $('#store-list');

    const cropHtml = ids.length
      ? ids.map(function (id) {
          const c = G.CROPS[id];
          const n = state.store[id];
          return '<div class="store-row">' +
            '<span class="se">' + c.emoji + '</span>' +
            '<div><div class="sn">' + c.name + ' ×' + n + '</div>' +
            '<div class="sv">' + c.price + ' 金/个</div></div>' +
            '<span class="sp">' + n * c.price + ' 金</span>' +
            '<button class="btn mini" data-sell="' + id + '">卖出</button>' +
          '</div>';
        }).join('')
      : '';

    const fishHtml = fishCount
      ? '<div class="store-sub">🐟 渔获 · ' + fishCount + ' 条</div>' +
        fish.map(function (g) {
          const q = G.qualityById(g.q);
          const col = q ? q.color : 'var(--ink-3)';
          return '<div class="store-row">' +
            '<span class="se">' + g.emoji + '</span>' +
            '<div><div class="sn">' + g.name + ' ×' + g.count + '</div>' +
            '<div class="sv" style="color:' + col + '">' +
              (q ? q.emoji + ' ' + q.name : '杂物') + ' · ' + g.v + ' 金/条</div></div>' +
            '<span class="sp">' + (g.v * g.count) + ' 金</span>' +
            '<button class="btn mini" data-sellfish="' + g.key + '">卖出</button>' +
          '</div>';
        }).join('')
      : '';

    box.innerHTML = (cropHtml || fishHtml)
      ? cropHtml + fishHtml
      : '<div class="store-empty">仓库空空如也，去收点菜 / 钓点鱼吧 🌱</div>';

    const seeds = Object.keys(state.seeds).filter(function (k) { return state.seeds[k] > 0; });
    $('#seed-box').innerHTML = '🎒 种子：' + (seeds.length
      ? seeds.map(function (id) {
          return '<span class="tag">' + G.CROPS[id].emoji + G.CROPS[id].name + ' ×' + state.seeds[id] + '</span>';
        }).join('')
      : '<span style="color:var(--ink-3)">无（收获 30% 留种，或去商店买）</span>');

    $('[data-act="sellAll"]').disabled = !ids.length && !fishCount;
  }

  /* ---------------- 账本（按天汇总，点开看明细） ---------------- */

  let openLedgerDay = null;

  function renderLedger() {
    const days = G.ledgerByDay(state);

    const rows = days.slice(0, 14).map(function (d) {
      const open = openLedgerDay === d.day;
      const inc = d.income > 0 ? '<span class="led-inc">+' + d.income + '</span>' : '';
      const exp = d.expense > 0 ? '<span class="led-exp">-' + d.expense + '</span>' : '';
      const sep = (inc && exp) ? ' · ' : '';
      const head = (inc || exp) ? (inc + sep + exp) : '<span style="color:var(--ink-3)">—</span>';

      let html = '<div class="led-row day' + (open ? ' open' : '') + '" data-ledday="' + d.day + '"' +
        ' title="' + d.items.length + ' 笔，点击' + (open ? '收起' : '展开') + '">' +
        '<span class="led-day">D' + d.day + '</span>' +
        '<span class="led-label">' + (d.items.length > 1 ? d.items.length + ' 笔' : d.items[0].label) + '</span>' +
        '<span class="led-val">' + head + '</span>' +
        '<span class="led-bal">' + d.balance + '</span>' +
      '</div>';

      if (open) {
        html += '<div class="led-detail">' + d.items.map(function (it) {
          const v = it.income > 0 ? '+' + it.income : (it.expense > 0 ? '-' + it.expense : '—');
          const cls = it.income > 0 ? 'led-inc' : (it.expense > 0 ? 'led-exp' : '');
          return '<div class="dline"><span>' + it.label + '</span><b class="' + cls + '">' + v + '</b></div>';
        }).join('') + '</div>';
      }
      return html;
    }).join('');

    $('#ledger').innerHTML = rows || '<div class="store-empty">还没有账目</div>';
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

  /* ---------------- 日志（按天折叠，点开看当天记录） ---------------- */

  let openLogDay = null;

  function renderLog() {
    const days = G.logByDay(state);
    const rows = days.slice(0, 10).map(function (d) {
      const open = openLogDay === d.day;
      const last = d.items[0] ? d.items[0].text : '';
      let html = '<div class="log-day' + (open ? ' open' : '') + '" data-logday="' + d.day + '"' +
        ' title="' + d.items.length + ' 条记录，点击' + (open ? '收起' : '展开') + '">' +
        '<span class="ld">D' + d.day + '</span>' +
        '<span class="ld-count">' + d.items.length + ' 条</span>' +
        '<span class="ld-last">' + (open ? '（点击收起）' : last) + '</span>' +
        '<span class="ld-caret">' + (open ? '▾' : '▸') + '</span>' +
      '</div>';
      if (open) {
        html += d.items.map(function (r) {
          return '<div class="log-row ' + (r.kind || '') + '"><span>' + r.text + '</span></div>';
        }).join('');
      }
      return html;
    }).join('');
    $('#log').innerHTML = rows || '<div class="store-empty">还没有记录</div>';
  }

  /* ---------------- 总渲染 ---------------- */

  function renderAll() {
    renderHud();
    renderPlots();
    renderActions();
    renderBait();
    renderCatch();
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
    actions += '<button class="btn danger" data-pact="clear" data-i="' + i + '">🗑️ 铲除<small>不返还种子</small></button>';

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

  function confirmClear(i) {
    const p = state.plots[i];
    if (!p || !p.crop) return;
    const c = G.CROPS[p.crop];
    openModal('🗑️ 铲除 ' + c.name,
      '<div style="font-size:13px;line-height:1.8">第 ' + (i + 1) + ' 号地会变回空地，' +
      '<b>不返还种子或金币</b>，作物直接消失。<br>确定吗？</div>',
      '<button class="btn" data-close>取消</button>' +
      '<button class="btn danger" data-clear="' + i + '">确定铲除</button>');
  }

  function cropPicker(i, batch) {
    const seedTotal = Object.keys(state.seeds).reduce(function (n, k) { return n + (state.seeds[k] || 0); }, 0);
    if (!seedTotal) {
      toast('先去种子店买点种子吧 🌰', 'warn');
      return seedShop();
    }

    const cards = G.CROP_LIST.map(function (c) {
      const owned = state.seeds[c.id] || 0;
      const dis = owned <= 0 || state.energy < 1;
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
      return '<button class="crop-card" data-crop="' + c.id + '" data-plot="' + i + '"' +
        (batch ? ' data-batch="1"' : '') + (dis ? ' disabled' : '') + '>' +
        '<div class="ce">' + c.emoji + '</div>' +
        '<div class="cn">' + c.name + '</div>' +
        '<div class="cs">' + (owned ? '库存 ' + owned + ' 颗' : '没有种子') + '</div>' +
        '<div class="cm">' + lineY + '</div>' +
        '<div class="cm">' + lineP + '</div>' +
        '<div class="cp">' + (profit || '') + '</div>' +
      '</button>';
    }).join('');

    const tip = batch
      ? '💡 选一种作物，会按库存把所有空地依次种上；种子用完就停。'
      : '💡 播种只消耗背包里的种子，种子要去种子店买。';

    openModal(batch ? '🌱 全部播种 · 选一种作物' : '🌱 第 ' + (i + 1) + ' 号地 · 播种',
      cards + '<div style="margin-top:12px;font-size:11.5px;color:var(--ink-3);font-weight:600">' + tip + '</div>',
      '<button class="btn" data-act="seedshop">🌰 去种子店</button>' +
      '<button class="btn" data-close>取消</button>');
  }

  /* ---------------- 种子店 ---------------- */

  function seedShop() {
    const rows = G.CROP_LIST.map(function (c) {
      const owned = state.seeds[c.id] || 0;
      const bp = G.seedBuyPrice(c);
      const sp = G.seedSellPrice(c);
      return '<div class="shop-row">' +
        '<span class="se">' + c.emoji + '</span>' +
        '<div class="sinfo">' +
          '<div class="sn">' + c.name +
            (owned ? ' <b class="own">库存 ' + owned + '</b>' : '') + '</div>' +
          '<div class="sv">买 ' + bp + ' 金 · 卖 ' + sp + ' 金 · ' + c.days + ' 天成熟</div>' +
        '</div>' +
        '<button class="btn mini" data-buyseed="' + c.id + '" data-n="1"' + (state.coins < bp ? ' disabled' : '') + '>买1</button>' +
        '<button class="btn mini" data-buyseed="' + c.id + '" data-n="5"' + (state.coins < bp * 5 ? ' disabled' : '') + '>买5</button>' +
        '<button class="btn mini" data-sellseed="' + c.id + '"' +
          (owned <= 0 ? ' disabled' : '') +
          ' title="' + (owned ? '卖出全部，+' + owned * sp + ' 金' : '没有库存') + '">卖光</button>' +
      '</div>';
    }).join('');

    openModal('🌰 种子店',
      '<div class="shop-head">💰 <b>' + state.coins + '</b> 金 · 卖回价是买价的一半</div>' +
      '<div class="shop-list">' + rows + '</div>' +
      '<div class="shop-tip">播种只消耗背包里的种子；留种得到的种子也能在这里卖掉。</div>',
      '<button class="btn" data-close>关闭</button>');
  }

  /* ---------------- 全部施肥 ---------------- */

  function fertModal() {
    const list = G.fertTargets(state);
    if (!list.length) { toast('没有可施肥的地块', 'warn'); return; }
    if (state.energy < 1) { toast('体力不够，先睡觉吧', 'warn'); return; }

    const rows = ['normal', 'special'].map(function (k) {
      const f = G.FERT[k];
      const byMoney = Math.floor(state.coins / f.cost);
      const n = Math.max(0, Math.min(list.length, byMoney, state.energy));
      const off = n <= 0;
      return '<button class="btn" data-fert="' + k + '"' + (off ? ' disabled' : '') + '>' +
        '<span>' + f.emoji + ' ' + f.name + '</span>' +
        '<small>' + f.cost + ' 金/块 · +' + f.add + ' 产量</small>' +
        '<small>' + (off ? '钱或体力不够' : '施 ' + n + ' 块 · 共 ' + (n * f.cost) + ' 金') + '</small>' +
      '</button>';
    }).join('');

    openModal('🧪 全部施肥',
      '<div class="shop-head">可施肥地块 <b>' + list.length + '</b> 块' +
        '<span style="font-weight:600;color:var(--ink-3)"> · 大作物 / 已施肥 / 已成熟会跳过</span></div>' +
      '<div class="action-grid">' + rows + '</div>',
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
      '· 蚯蚓饵：渔获价值 +30%，且品质取两次较好的<br>' +
      '· 钓到的鱼先进仓库，卖出才换钱；天气只影响上钩概率（雨天好鱼 ×1.3）<br>' +
      '· 收获时 30% 概率留种，种子下次可免费种<br>' +
      '· 多次收获作物（黄瓜/草莓）只有最后一收才判定留种<br>' +
      '· 种子只能在种子店买，卖回价是买价的一半<br>' +
      '· 播种只消耗背包里的种子；「全部播种」会按库存把所有空地种满<br>' +
      '· 打零工：体力满就干全天（×1.5），否则干半天（×1.0）；不够半天就把剩下的体力全用上<br>' +
      '· 账本按天汇总，点某一天可展开当日明细<br>' +
      '· 全部施肥只作用于进行中的小作物，大作物 / 已施肥 / 已成熟会跳过<br>' +
      '· 种错了可以在地块详情里「铲除」，不返还种子或金币<br>' +
      '· 顶栏 ⬇️ 导出存档 / ⬆️ 导入存档，日志面板可导出日志<br>' +
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
    work: function (ev) {
      const r = G.workAuto(state);
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
    seedshop: seedShop,
    plantAll: function () { cropPicker(0, true); },
    fertilizeAll: fertModal,
    sellAll: function () {
      const r = G.sellAll(state);
      commit(r);
      if (r.ok) { toast(r.msg, 'good'); SFX.coin(); }
    },
    cast: function (ev) {
      const r = G.fish(state, baitSel);
      commit(r);
      if (r.ok) {
        pushCatch(r.entry);
        toast(r.msg, r.entry.trash ? 'warn' : 'good');
        SFX.catch();
        floatAt(ev, '+' + r.entry.price + ' 金', '');
      }
    },
    cast5: function () {
      const r = G.fishMany(state, 5, baitSel);
      commit(r);
      if (!r.ok) { toast(r.msg, 'warn'); return; }
      const got = r.results.filter(function (x) { return x.ok; }).map(function (x) { return x.entry; });
      setCatchBatch(got);
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
        catchLog = [];
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

      // 种植（单块 / 全部播种）
      const cropCard = t.closest('[data-crop]');
      if (cropCard) {
        const idx = Number(cropCard.dataset.plot);
        const batch = cropCard.dataset.batch === '1';
        const id = cropCard.dataset.crop;
        const r = batch ? G.plantAll(state, id) : G.plant(state, idx, id);
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
        if (kind === 'clear') { confirmClear(i); return; }
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

      // 全部施肥
      const fertBtn = t.closest('[data-fert]');
      if (fertBtn && !fertBtn.disabled) {
        const r = G.fertilizeAll(state, fertBtn.dataset.fert);
        closeModal();
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.good();
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

      // 卖一种鱼
      const sellFish = t.closest('[data-sellfish]');
      if (sellFish) {
        const r = G.sellFishGroup(state, sellFish.dataset.sellfish);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        return;
      }

      // 铲除确认
      const doClear = t.closest('[data-clear]');
      if (doClear) {
        const r = G.clearPlot(state, Number(doClear.dataset.clear));
        closeModal();
        commit(r);
        toast(r.msg, 'warn');
        return;
      }

      // 种子店：买种子
      const buySeed = t.closest('[data-buyseed]');
      if (buySeed) {
        const r = G.buySeed(state, buySeed.dataset.buyseed, Number(buySeed.dataset.n) || 1);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) seedShop();     // 刷新库存与价格
        return;
      }

      // 种子店：卖种子（一口价卖光那种）
      const sellSeed = t.closest('[data-sellseed]');
      if (sellSeed) {
        const r = G.sellSeed(state, sellSeed.dataset.sellseed);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) seedShop();
        return;
      }

      // 账本按天展开/收起
      const ledDay = t.closest('[data-ledday]');
      if (ledDay) {
        const d = Number(ledDay.dataset.ledday);
        openLedgerDay = (openLedgerDay === d) ? null : d;
        renderLedger();
        return;
      }

      // 日志按天展开/收起
      const logDay = t.closest('[data-logday]');
      if (logDay) {
        const d = Number(logDay.dataset.logday);
        openLogDay = (openLogDay === d) ? null : d;
        renderLog();
        return;
      }
    });

    $('#btn-help').addEventListener('click', helpModal);
    $('#btn-reset').addEventListener('click', resetModal);
    $('#btn-log').addEventListener('click', exportLog);
    $('#btn-export').addEventListener('click', exportSave);
    $('#btn-import').addEventListener('click', function () { $('#file-import').click(); });
    $('#file-import').addEventListener('change', function () {
      importSave(this.files && this.files[0]);
      this.value = '';
    });
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
      // 用钓鱼记录本里的历史把「最近渔获」补上
      catchLog = (state.fishBook.entries || []).slice(0, 5);
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
