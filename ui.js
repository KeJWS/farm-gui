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

  function exportLedger() {
    const days = G.ledgerByDay(state);
    const lines = ['# 我的小农场 · 账本', '',
      '> 导出时间：' + new Date().toLocaleString('zh-CN'),
      '> 当前进度：第 ' + state.day + ' 天 · ' + state.coins + ' 金 · ' + state.plots.length + ' 块地', '',
      '| 天数 | 收入 | 支出 | 净 | 余额 |', '|---|---|---|---|---|'];
    days.forEach(function (d) {
      const net = d.income - d.expense;
      lines.push('| D' + d.day + ' | +' + d.income + ' | -' + d.expense + ' | ' +
        (net >= 0 ? '+' : '') + net + ' | ' + d.balance + ' |');
    });
    lines.push('', '## 明细');
    days.forEach(function (d) {
      lines.push('', '### D' + d.day);
      d.items.slice().reverse().forEach(function (it) {
        lines.push('- ' + it.label + '：' +
          (it.income ? '+' + it.income : (it.expense ? '-' + it.expense : '—')) + ' 金');
      });
    });
    const total = days.reduce(function (a, d) { return a + d.income - d.expense; }, 0);
    lines.push('', '**累计净收益：' + (total >= 0 ? '+' : '') + total + ' 金**');
    download('小农场账本-' + stamp() + '.md', lines.join('\n') + '\n', 'text/markdown;charset=utf-8');
    toast('账本已导出 ⬇️', 'good');
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
    $('#season').textContent = (G.isWinter(state.day) ? '❄️ ' : '') +
      G.seasonOf(state.day) + ' · 第 ' + state.day + ' 天';

    const lv = state.levels || { farm: 1, fish: 1, farmXp: 0, fishXp: 0 };
    const farmLvEl = $('#farm-lv'), fishLvEl = $('#fish-lv');
    if (farmLvEl) {
      farmLvEl.textContent = '🌱 Lv' + lv.farm;
      farmLvEl.title = '种田等级：' + G.levelEffectText('farm', lv.farm) +
        ' · 经验 ' + lv.farmXp + '/' + G.levelNeed(lv.farm);
    }
    if (fishLvEl) {
      fishLvEl.textContent = '🎣 Lv' + lv.fish;
      fishLvEl.title = '钓鱼等级：' + G.levelEffectText('fish', lv.fish) +
        ' · 经验 ' + lv.fishXp + '/' + G.levelNeed(lv.fish);
    }
  }

  /* ---------------- 农田 ---------------- */

  const PLOT_CLASS = { growing: 'growing', regrow: 'growing', ripe: 'ripe' };

  function renderPlots() {
    const grid = $('#plot-grid');
    const keepScroll = grid.scrollTop;          // 重绘会重置滚动条，先存下来
    grid.innerHTML = state.plots.map(function (p, i) {
      if (!p.crop) {
        return '<div class="plot empty" data-i="' + i + '" role="button" tabindex="0"' +
          ' aria-label="第 ' + (i + 1) + ' 块地，空地，点击播种">' +
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
      const aria = '第 ' + (i + 1) + ' 块地，' + c.name + '，' + p.growth + '/' + need + ' 天，' +
        (can ? '可以收获' : (p.phase === 'ripe' ? '明天可收' : (p.watered ? '今天已浇水' : '待浇水')));

      return '<div class="plot ' + cls + '" data-i="' + i + '" role="button" tabindex="0"' +
        ' aria-label="' + aria + '">' +
        '<div class="plot-top"><span class="plot-no">' + (i + 1) + '</span>' +
          '<div class="plot-badges">' + badges + '</div></div>' +
        '<div class="plot-art">' + G.stageEmoji(p) + '</div>' +
        '<div class="plot-name">' + c.name +
          '<small>' + (nameExtra ? nameExtra + ' ' : '') + p.growth + '/' + need + '天</small></div>' +
        '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
        '<div class="plot-foot">' + foot + '</div>' +
      '</div>';
    }).join('');
    grid.scrollTop = keepScroll;

    const anyGrow = state.plots.some(function (p) {
      return p.crop && p.phase !== 'ripe' && !p.watered;
    });
    const anyRipe = state.plots.some(function (p) { return p.crop && G.canHarvest(state, p); });
    const anyEmpty = state.plots.some(function (p) { return !p.crop; });
    const seedTotal = Object.keys(state.seeds).reduce(function (n, k) { return n + (state.seeds[k] || 0); }, 0);
    const fertList = G.fertTargets(state);

    const frozen = G.isWinter(state.day);
    $('[data-act="waterAll"]').disabled = !anyGrow;
    $('[data-act="harvestAll"]').disabled = !anyRipe;
    $('[data-act="plantAll"]').disabled = !anyEmpty || frozen;
    $('[data-act="fertilizeAll"]').disabled = !fertList.length || state.energy < 1 || state.coins < 5;
    $('#plantall-txt').textContent = frozen ? '❄️ 冬天土地封冻'
      : (anyEmpty
        ? (seedTotal ? '库存 ' + seedTotal + ' 颗 · 空地 ' + state.plots.filter(function (p) { return !p.crop; }).length + ' 块'
                     : '没种子 · 点这里去种子店')
        : '没有空地');
    $('#fertall-txt').textContent = fertList.length
      ? '可施 ' + fertList.length + ' 块 · 5 金起'
      : (anyGrow ? '都施过肥了' : '没有进行中的作物');
  }

  /* ---------------- 操作按钮 ---------------- */

  function renderActions() {
    const fullNeed = G.workCost(state, 'full');
    const halfNeed = G.workCost(state, 'half');
    if (state.workUsed) {
      $('#work-txt').textContent = '今天已经打过了 · 明天再来';
    } else if (state.energy >= fullNeed) {
      $('#work-txt').textContent = '全天 · -' + fullNeed + ' 体力 · +' + G.workPay(state, 'full') + ' 金';
    } else if (state.energy >= halfNeed) {
      $('#work-txt').textContent = '半天 · -' + halfNeed + ' 体力 · +' + G.workPay(state, 'half') + ' 金';
    } else if (state.energy > 0) {
      $('#work-txt').textContent = '半天 · 用光 ' + state.energy + ' 点 · +' + Math.round(state.energy * G.WORK_RATE_HALF) + ' 金';
    } else {
      $('#work-txt').textContent = '体力不足 · 先睡觉';
    }
    $('#expand-txt').textContent = '第 ' + (state.plots.length + 1) + ' 块 · ' + G.expandCost(state) + ' 金';
    $('#upgrade-txt').textContent = '上限 ' + state.maxEnergy + '→' + (state.maxEnergy + 5) + ' · ' + G.upgradeCost(state) + ' 金';
    const sprLock = !G.sprinklerUnlocked(state);
    $('#sprinkler-txt').textContent = sprLock
      ? '需种田 Lv' + G.BALANCE.gate.sprinkler + ' 解锁'
      : '已有 ' + state.sprinklers + ' 个 · ' + G.SPRINKLER_COST + ' 金/个';
    const harvLock = !G.harvesterUnlocked(state);
    $('#harvester-txt').textContent = harvLock
      ? '需种田 Lv' + G.BALANCE.gate.harvester + ' 解锁'
      : (!state.harvester
        ? G.HARVESTER_COST + ' 金 · 睡觉时自动收'
        : (state.harvesterOn ? '已开启 · 点击关闭' : '已关闭 · 点击开启'));
    const netLine = $('#net-line');
    if (netLine) {
      if (!G.netUnlocked(state)) {
        netLine.innerHTML = '🕸️ 渔网要<b>钓鱼 Lv' + G.BALANCE.gate.net + '</b>解锁（渔具店 ' +
          G.NET_COST + ' 金/张）';
      } else if (state.nets > 0) {
        const setN = G.netSetCount(state), pend = G.netPending(state);
        netLine.innerHTML = '🕸️ 已布 <b>' + setN + '</b>/' + state.nets + ' 张 · 每天耗 ' + setN +
          ' 份面团饵，' + Math.round(G.NET_CHANCE * 100) + '% 概率各上 1 条 · 不缴维护费' +
          (pend
            ? '<br><b class="lock">' + pend + ' 张网里有鱼要收，重布 ' + G.netResetCost(state) + ' 体力</b> ' +
              '<button class="btn mini" data-resetnets' + (state.energy < 1 ? ' disabled' : '') + '>🕸️ 重新布置</button>'
            : '');
      } else {
        netLine.innerHTML = '🕸️ 河边还没放渔网（渔具店 ' + G.NET_COST + ' 金/张，现在最多 ' +
          G.netMax(state) + ' 张）';
      }
    }

    const teaBtn = $('[data-act="tea"]');
    const teaHave = G.teaStock(state);
    const teaBest = teaHave.slice().sort(function (a, b) { return b.energy - a.energy; })[0];
    teaBtn.disabled = state.teaUsed || state.energy >= state.maxEnergy || !teaHave.length;
    $('#tea-txt').textContent = state.teaUsed
      ? '今天喝过了'
      : (!teaHave.length ? '没有茶了' :
        (state.energy >= state.maxEnergy ? '体力已满'
          : teaBest.emoji + ' ' + teaBest.name + ' · +' + teaBest.energy + ' 体力'));

    $('[data-act="dig"]').disabled = state.energy < 3;
    $('[data-act="work"]').disabled = state.workUsed || state.energy <= 0;
    $('[data-act="expand"]').disabled = state.coins < G.expandCost(state);
    $('[data-act="upgrade"]').disabled = state.coins < G.upgradeCost(state);
    $('[data-act="sprinkler"]').disabled = sprLock ||
      state.coins < G.SPRINKLER_COST || state.sprinklers >= state.plots.length;
    $('[data-act="harvester"]').disabled = harvLock || (!state.harvester && state.coins < G.HARVESTER_COST);
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
      const cnt = b.id === 'lure' ? (b.n ? b.n + '/' + G.BALANCE.lure.dur : '无') : '×' + b.n;
      return '<div class="bait ' + (b.id === baitSel ? 'sel ' : '') + (b.n ? '' : 'off') +
        '" data-bait="' + b.id + '" title="' + bd.desc + '"' +
        ' role="button" tabindex="0" aria-label="' + bd.name + '，' + (b.n ? b.n + ' 个' : '没有') + '"' +
        ' aria-pressed="' + (b.id === baitSel) + '">' +
        '<span>' + bd.emoji + '</span><span class="bn">' + bd.name + '</span>' +
        '<span class="bc">' + cnt + '</span></div>';
    }).join('');

    const frozen = G.isWinter(state.day);
    const castBtn = $('[data-act="cast"]');
    castBtn.disabled = frozen || state.energy < 2;
    castBtn.title = frozen ? '河面结冰，冬天钓不了鱼' : '';
    const cast5Btn = $('[data-act="cast5"]');
    cast5Btn.disabled = frozen || state.energy < 10;   // 5 杆要 10 体力，不够就别假装能连甩
    const castAllBtn = $('[data-act="castAll"]');
    if (castAllBtn) { castAllBtn.disabled = frozen; castAllBtn.title = frozen ? '河面结冰' : ''; }
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
      '<div class="catch-sum">最近 ' + catchLog.length + ' 条 · 共值 ' + sum + ' 金（已入仓库）</div>' +
      '<div class="catch-list">' + catchLog.map(function (e) {
        const col = e.quality ? e.quality.color : '#9a866c';
        return '<div class="catch-item" style="border-left-color:' + col + '">' +
          '<span class="ce">' + e.emoji + '</span>' +
          '<span class="cn2">' + e.fish + '</span>' +
          '<span class="cq2" style="color:' + col + '">' +
            (e.quality ? e.quality.emoji + ' ' + e.quality.name : (e.chest ? '宝箱' : '杂物')) + '</span>' +
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
    const ids = Object.keys(state.store).filter(function (k) { return G.storeCount(state, k) > 0; });
    const fish = G.fishGroups(state);
    const fishCount = fish.reduce(function (n, g) { return n + g.count; }, 0);
    const box = $('#store-list');

    const cropHtml = ids.length
      ? ids.map(function (id) {
          const c = G.CROPS[id];
          const n = G.storeCount(state, id);
          const val = G.storeValue(state, id);
          const mix = G.storeMix(state, id);
          const mixTxt = mix.map(function (m) {
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
            '<button class="btn mini" data-boxcrop="' + id + '" title="整批放进收购箱，原价结算">📦</button>' +
          '</div>';
        }).join('')
      : '';

    const fishHtml = fishCount
      ? '<div class="store-sub">🐟 渔获 · ' + fishCount + ' 条</div>' +
        fish.map(function (g) {
          const desc = G.fishDesc(g.name);
          const mk = g.chest ? { total: 1, tag: '宝箱' } : G.fishMarketInfo(state, g.name);
          return '<div class="store-row">' +
            '<span class="se">' + g.emoji + '</span>' +
            '<div><div class="sn">' + g.name + ' ×' + g.count +
              (g.chest ? '' : ' <b class="own">市价 ×' + mk.total.toFixed(2) + '</b>') + '</div>' +
            '<div class="sv">' +
              (desc ? '<span class="sf-note">' + desc + '</span> · ' : '') +
              fishMix(g) + ' · 均 ' + (g.total / g.count).toFixed(1) + ' 金/条' +
              (g.chest ? '' : ' · ' + mk.tag) + '</div></div>' +
            '<span class="sp">' + g.total + ' 金</span>' +
            '<button class="btn mini" data-boxfish="' + g.key + '" title="整批放进收购箱，原价结算">📦</button>' +
          '</div>';
        }).join('')
      : '';

    const wormN = state.bait.worm || 0;
    const wormHtml = wormN
      ? '<div class="store-sub">🪱 蚯蚓 · ' + wormN + ' 条（渔具店回收）</div>' +
        '<div class="store-row">' +
          '<span class="se">🪱</span>' +
          '<div><div class="sn">蚯蚓 ×' + wormN + '</div>' +
          '<div class="sv">' + G.WORM_VALUE + ' 金/条 · 也可当饵用</div></div>' +
          '<span class="sp">' + (wormN * G.WORM_VALUE) + ' 金</span>' +
        '</div>'
      : '';

    const fertRows = ['normal', 'special'].filter(function (k) { return (state.ferts[k] || 0) > 0; });
    const fertHtml = fertRows.length
      ? '<div class="store-sub">🧪 肥料 · 种子店买 / 卖</div>' +
        fertRows.map(function (k) {
          const f = G.FERT[k];
          const n = state.ferts[k];
          const sp = G.fertSellPrice(k);
          return '<div class="store-row">' +
            '<span class="se">' + f.emoji + '</span>' +
            '<div><div class="sn">' + f.name + ' ×' + n + '</div>' +
            '<div class="sv">半价回收 ' + sp + ' 金/袋 · +' + f.add + ' 产量</div></div>' +
            '<span class="sp">' + (n * sp) + ' 金</span>' +
          '</div>';
        }).join('')
      : '';

    box.innerHTML = (cropHtml || fishHtml || wormHtml || fertHtml)
      ? cropHtml + fishHtml + wormHtml + fertHtml
      : '<div class="store-empty">仓库空空如也，去收点菜 / 钓点鱼吧 🌱</div>';

    const seeds = Object.keys(state.seeds).filter(function (k) { return state.seeds[k] > 0; });
    $('#seed-box').innerHTML = '🎒 种子：' + (seeds.length
      ? seeds.map(function (id) {
          return '<span class="tag">' + G.CROPS[id].emoji + G.CROPS[id].name + ' ×' + state.seeds[id] + '</span>';
        }).join('')
      : '<span style="color:var(--ink-3)">无（收获 30% 留种，或去商店买）</span>');

    $('#store-sum').textContent = '总价 ' + G.storeTotal(state) + ' 金';
    const boxBtn = $('#btn-box');
    if (boxBtn) {
      const n = G.boxCount(state);
      boxBtn.textContent = '📦 收购箱' + (n ? ' (' + n + ')' : '');
      boxBtn.title = n ? '待出货 ' + G.boxValue(state) + ' 金' : '仓库里点 📦 放货进去';
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
      if (!lo) return '';
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
            Math.min(have, lo.qty) + '/' + lo.qty + ' · 还剩 ' + left + ' 天 · 2 倍价' +
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
            (o.kind === 'fish' ? '（交最便宜的）' : '')) + '</div>' +
        '</div>' +
        (o.done ? '' :
          '<button class="btn mini" data-order="' + o.id + '"' + (full ? '' : ' disabled') + '>交付</button>') +
      '</div>';
    }).join('');
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
        ' role="button" tabindex="0" aria-expanded="' + open + '"' +
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
        ' role="button" tabindex="0" aria-expanded="' + open + '"' +
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
    renderOrders();
    renderLedger();
    renderBook();
    renderLog();
  }

  function commit(result) {
    const unlocked = G.checkAchievements(state);
    renderAll();
    save();
    if (result && !result.ok && result.msg) toast(result.msg, 'warn');
    achToasts(unlocked);
    return result;
  }

  /* ---------------- 农田弹窗 ---------------- */

  function plotModal(i) {
    const p = state.plots[i];
    if (!p.crop) {
      if (G.isWinter(state.day)) { toast('❄️ 冬天土地封冻，开春再种', 'warn'); return; }
      return cropPicker(i);
    }

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
        const fn = G.FERT.normal, fs = G.FERT.special;
        const nOwn = state.ferts.normal || 0, sOwn = state.ferts.special || 0;
        actions += '<button class="btn" data-pact="fert-normal" data-i="' + i + '"' +
          (p.fert || !nOwn ? ' disabled' : '') + '>🧪 普通肥<small>库存 ' + nOwn + ' · +1 产量</small></button>';
        actions += '<button class="btn" data-pact="fert-special" data-i="' + i + '"' +
          (p.fert || !sOwn ? ' disabled' : '') + '>💊 特效肥<small>库存 ' + sOwn + ' · +2 产量</small></button>';
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
        '<dt>品质</dt><dd>' +
          (p.phase === 'ripe' ? '收获时揭晓'
            : (p.fert ? '施肥 ' + p.fert + ' 档 → 收获时取 ' + (p.fert + 1) + ' 次最好'
                      : '待定（施肥可拉高，最高取 3 次最好）')) + '</dd>' +
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

    const offMul = G.BALANCE.seed.offSeasonMul;
    const offDays = G.BALANCE.seed.offSeasonDays;
    const offPen = G.BALANCE.seed.offSeasonYield;
    const marketMul = G.BALANCE.market.offSeason;
    const cards = G.CROP_LIST.map(function (c) {
      const owned = state.seeds[c.id] || 0;
      const inSeason = G.cropSeasonOk(c.id, state.day);
      const dis = owned <= 0 || state.energy < 1;
      const days = inSeason ? c.days : (c.big ? c.days * 2 : c.days + offDays);
      const price = Math.round(c.price * (inSeason ? 1 : marketMul));
      const seedCost = Math.ceil(c.seed * (inSeason ? 1 : offMul));
      const lvBonus = G.farmYieldBonus(state);
      let profit = '';
      let lineY = '';
      let lineP = '';
      let qty = 0;
      if (c.multi) {
        qty = Math.max(1, c.firstQty - (inSeason ? 0 : offPen)) + c.regrowTimes * c.regrowQty;
        lineY = days + ' 天 · 共 ' + qty + ' 个';
        lineP = price + ' 金/个 · 多次收';
      } else if (c.big) {
        qty = 1;
        lineY = days + ' 天 · 固定 1 个';
        lineP = price + ' 金/个';
      } else {
        qty = Math.max(1, c.base + lvBonus - (inSeason ? 0 : offPen));
        lineY = days + ' 天 · 产 ' + qty + ' 个';
        lineP = price + ' 金/个';
      }
      profit = '净 +' + (qty * price - seedCost) + (c.multi || c.big ? '' : '~');
      return '<button class="crop-card" data-crop="' + c.id + '" data-plot="' + i + '"' +
        (batch ? ' data-batch="1"' : '') + (dis ? ' disabled' : '') + '>' +
        '<div class="ce">' + c.emoji + '</div>' +
        '<div class="cn">' + c.name + (inSeason ? '' : ' <span class="tago">反季</span>') + '</div>' +
        '<div class="cs">' + (owned ? '库存 ' + owned + ' 颗' : '没有种子') + '</div>' +
        '<div class="cm">' + lineY + '</div>' +
        '<div class="cm">' + lineP + '</div>' +
        '<div class="cp">' + profit + '</div>' +
      '</button>';
    }).join('');

    const tip = '💡 现在是' + G.seasonOf(state.day) + '季：当季作物正常，' +
      '<b>反季也能种</b>——种子贵 ' + Math.round((offMul - 1) * 100) + '%、第一茬多 ' + offDays +
      ' 天（南瓜/西瓜翻倍）、少 ' + offPen + ' 个，但收成卖价 ×' + marketMul + '。' +
      (batch ? '选一种会按库存把所有空地依次种上；种子用完就停。' : '播种只消耗背包里的种子。');

    openModal(batch ? '🌱 全部播种 · 选一种作物' : '🌱 第 ' + (i + 1) + ' 号地 · 播种',
      cards + '<div style="margin-top:12px;font-size:11.5px;color:var(--ink-3);font-weight:600">' + tip + '</div>',
      '<button class="btn" data-act="seedshop">🌰 去种子店</button>' +
      '<button class="btn" data-close>取消</button>');
  }

  /* ---------------- 种子店 ---------------- */

  function seedShop() {
    const winter = G.isWinter(state.day);
    const offMul = G.BALANCE.seed.offSeasonMul;
    const offDays = G.BALANCE.seed.offSeasonDays;
    const rows = G.CROP_LIST.map(function (c) {
      const owned = state.seeds[c.id] || 0;
      const bp = G.seedBuyPrice(c, state);
      const base = G.seedBuyPrice(c, null);
      const sp = G.seedSellPrice(c);
      const lock = !G.seedUnlocked(state, c.id);
      const inSeason = G.cropSeasonOk(c.id, state.day);
      const canBuy = !winter && !lock;
      const days = inSeason ? c.days : (c.big ? c.days * 2 : c.days + offDays);
      const tag = lock ? ' <b class="lock">需种田 Lv' + c.lv + '</b>'
        : (inSeason ? ' <b class="own">当季</b>' : ' <b class="lock">反季</b>');
      const sub = lock ? '等级不够，种子还没解锁'
        : (winter ? '冬天种子店歇业了，开春再来'
          : '买 <b>' + bp + '</b> 金' + (inSeason ? '' : '（当季 ' + base + '）') +
            ' · 卖 ' + sp + ' 金 · ' + days + ' 天熟' + (inSeason ? '' : ' · 产量 −1'));
      return '<div class="shop-row' + (canBuy ? '' : ' locked') + '">' +
        '<span class="se">' + c.emoji + '</span>' +
        '<div class="sinfo">' +
          '<div class="sn">' + c.name +
            (owned ? ' <b class="own">库存 ' + owned + '</b>' : '') + tag + '</div>' +
          '<div class="sv">' + sub + '</div>' +
        '</div>' +
        '<button class="btn mini" data-buyseed="' + c.id + '" data-n="1"' +
          (canBuy && state.coins >= bp ? '' : ' disabled') + '>买1</button>' +
        '<button class="btn mini" data-buyseed="' + c.id + '" data-n="5"' +
          (canBuy && state.coins >= bp * 5 ? '' : ' disabled') + '>买5</button>' +
        '<button class="btn mini" data-sellseed="' + c.id + '"' +
          (owned <= 0 ? ' disabled' : '') +
          ' title="' + (owned ? '卖出全部，+' + owned * sp + ' 金' : '没有库存') + '">卖光</button>' +
      '</div>';
    }).join('');

    const fertRows = ['normal', 'special'].map(function (k) {
      const f = G.FERT[k];
      const own = state.ferts[k] || 0;
      const sp = G.fertSellPrice(k);
      const lock = !G.fertUnlocked(state, k);
      return '<div class="store-row' + (lock ? ' locked' : '') + '">' +
        '<span class="se">' + f.emoji + '</span>' +
        '<div><div class="sn">' + f.name + (own ? ' <b class="own">库存 ' + own + '</b>' : '') +
          (lock ? ' <b class="lock">需种田 Lv' + f.lv + '</b>' : '') + '</div>' +
        '<div class="sv">' + (lock ? '等级不够，还没解锁'
          : '买 ' + f.cost + ' 金 · 卖 ' + sp + ' 金 · +' + f.add + ' 产量、品质更优') + '</div></div>' +
        '<button class="btn mini" data-fertbuy="' + k + '" data-n="1"' +
          (lock || state.coins < f.cost ? ' disabled' : '') + '>买1</button>' +
        '<button class="btn mini" data-fertbuy="' + k + '" data-n="5"' +
          (lock || state.coins < f.cost * 5 ? ' disabled' : '') + '>买5</button>' +
        '<button class="btn mini" data-fertsell="' + k + '"' + (own <= 0 ? ' disabled' : '') + '>卖光</button>' +
      '</div>';
    }).join('');

    openModal('🌰 种子店 · ' + G.seasonOf(state.day) + '季',
      '<div class="shop-head">💰 <b>' + state.coins + '</b> 金' +
        (winter ? ' · ❄️ 冬天歇业，只卖肥料'
                : ' · 当季原价 · 反季 ×' + offMul + '（慢 ' + offDays + ' 天、少 1 个）') + '</div>' +
      '<div class="shop-list">' + rows + '</div>' +
      '<div class="store-sub" style="margin-top:10px">🧪 肥料 · 买回来放仓库，施肥时消耗</div>' +
      '<div class="shop-list">' + fertRows + '</div>' +
      '<div class="shop-tip">反季种子<b>也能种</b>：第一茬多花 ' + offDays + ' 天（南瓜 / 西瓜直接翻倍）、少结 1 个，' +
        '但反季的收成卖价 ×' + G.BALANCE.market.offSeason + ' —— 想赌一把就囤着晚卖。<br>' +
        '冬天土地封冻，什么都不能种。肥料在「全部施肥」或地块详情里使用。</div>',
      '<button class="btn" data-sellallseeds>卖出全部种子</button>' +
      '<button class="btn" data-close>关闭</button>');
  }

  /* ---------------- 全部施肥 ---------------- */

  function fertModal() {
    const list = G.fertTargets(state);
    if (!list.length) { toast('没有可施肥的地块', 'warn'); return; }
    if (state.energy < 1) { toast('体力不够，先睡觉吧', 'warn'); return; }

    const rows = ['normal', 'special'].map(function (k) {
      const f = G.FERT[k];
      const have = state.ferts[k] || 0;
      const n = Math.max(0, Math.min(list.length, have, state.energy));
      const off = n <= 0;
      return '<button class="btn" data-fert="' + k + '"' + (off ? ' disabled' : '') + '>' +
        '<span>' + f.emoji + ' ' + f.name + '</span>' +
        '<small>库存 ' + have + ' 袋 · 每块 +' + f.add + ' 产量</small>' +
        '<small>' + (off ? (have ? '体力不够' : '库存没有，先去种子店买') : '施 ' + n + ' 块') + '</small>' +
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
    const worms = state.bait.worm || 0;
    const dough = state.bait.dough || 0;
    const lure = G.BALANCE.lure;
    const netLock = !G.netUnlocked(state);
    const netCap = G.netMax(state);
    const body =
      '<dl class="kv"><dt>🍞 面团饵</dt><dd>1 金/份 · 现有 ' + dough + ' 份 · 标准收获</dd>' +
      '<dt>🎣 假饵</dt><dd>' + lure.price + ' 金/个 · 耐用 ' + lure.dur + ' 次 · 持有上限 1</dd>' +
      '<dt>🪱 蚯蚓</dt><dd>3 体力挖 1~3 条（晴天 −1、阴雨 +1）</dd></dl>' +
      '<div class="action-grid">' +
        '<button class="btn" data-buy="dough" data-n="1">🍞 买 1 份<small>1 金</small></button>' +
        '<button class="btn" data-buy="dough" data-n="5">🍞 买 5 份<small>5 金</small></button>' +
        '<button class="btn" data-buy="lure" data-n="1">🎣 买假饵<small>' + lure.price + ' 金 · ' +
          lure.dur + ' 次</small></button>' +
      '</div>' +
      '<div class="buy-custom">' +
        '<span>🍞 面团饵自定义数量</span>' +
        '<input type="number" id="dough-qty" min="1" max="999" step="1" value="10" inputmode="numeric">' +
        '<button class="btn mini" data-buycustom="dough">买</button>' +
        '<span class="bc-tip">最多 999 份</span>' +
      '</div>' +
      '<div class="store-sub" style="margin-top:10px">🪱 蚯蚓回收</div>' +
      '<div class="store-row">' +
        '<span class="se">🪱</span>' +
        '<div><div class="sn">现有蚯蚓 ×' + worms + '</div>' +
        '<div class="sv">' + G.WORM_VALUE + ' 金/条</div></div>' +
        '<span class="sp">' + (worms * G.WORM_VALUE) + ' 金</span>' +
        '<button class="btn mini" data-sellworm' + (worms ? '' : ' disabled') + '>全部卖出</button>' +
      '</div>' +
      '<div class="buy-custom">' +
        '<span>🪱 蚯蚓自定义出售</span>' +
        '<input type="number" id="worm-qty" min="1" max="999" step="1" value="10" inputmode="numeric">' +
        '<button class="btn mini" data-sellwormn="1"' + (worms ? '' : ' disabled') + '>卖</button>' +
        '<span class="bc-tip">现有 ' + worms + ' 条</span>' +
      '</div>' +
      '<div class="store-sub" style="margin-top:10px">🕸️ 渔网 · 放到河边每天自动抓鱼（不收维护费）</div>' +
      '<div class="store-row' + (netLock ? ' locked' : '') + '">' +
        '<span class="se">🕸️</span>' +
        '<div><div class="sn">渔网 <b class="own">已布 ' + G.netSetCount(state) + '</b> / 共 ' +
          state.nets + ' / ' + (netLock ? '—' : netCap) +
          (netLock ? ' <b class="lock">需钓鱼 Lv' + G.BALANCE.gate.net + '</b>' : '') + '</div>' +
        '<div class="sv">' + (netLock ? '钓鱼等级不够，还没解锁'
          : G.NET_COST + ' 金/张 · 每天耗 1 面团饵 · ' + Math.round(G.NET_CHANCE * 100) +
            '% 概率上 1 条 · 抓完要花 ' + G.BALANCE.netReset.energy + ' 体力重布 · Lv' +
            G.fishLv(state) + ' 上限 ' + netCap + ' 张') + '</div></div>' +
        '<button class="btn mini" data-buynet' +
        ((netLock || state.nets >= netCap || state.coins < G.NET_COST) ? ' disabled' : '') + '>放一张</button>' +
      '</div>' +
      (G.netPending(state)
        ? '<div class="store-row">' +
            '<span class="se">🌀</span>' +
            '<div><div class="sn">有 <b class="lock">' + G.netPending(state) + '</b> 张网没收</div>' +
            '<div class="sv">重布要 ' + G.netResetCost(state) + ' 体力（每张 ' +
              G.BALANCE.netReset.energy + '）</div></div>' +
            '<button class="btn mini" data-resetnets' + (state.energy < 1 ? ' disabled' : '') +
              '>重新布置</button>' +
          '</div>'
        : '');
    openModal('🛒 渔具店', body, '<button class="btn" data-close>关闭</button>');
  }

  function helpModal() {
    const cropRows = G.CROP_LIST.map(function (c) {
      return '<tr><td>' + c.emoji + ' ' + c.name + '</td><td>' + c.seed + ' 金</td><td>' + c.days + ' 天</td>' +
        '<td>' + (c.multi ? '首次 ' + c.firstQty + ' 个' : (c.big ? '1 个（固定）' : c.base + ' ±1')) + '</td>' +
        '<td>' + c.price + ' 金</td><td>' + G.seasonText(c.id) + '</td><td>Lv' + (c.lv || 1) + '</td></tr>';
    }).join('');

    const body =
      '<div class="rule-sec">' +
        '<h4>🌤️ 天气</h4>' +
        '<table class="rule-table"><tr><th>天气</th><th>出现季节</th><th>效果</th></tr>' +
        G.WEATHER_LIST.map(function (w) {
          const who = G.SEASONS.filter(function (_, i) {
            const t = G.SEASON_WEATHER[i] || {};
            return (t[w.id] || 0) > 0;
          }).join(' / ');
          return '<tr><td>' + w.emoji + ' ' + w.name + '</td><td>' + (who || '—') + '</td><td>' + w.note + '</td></tr>';
        }).join('') + '</table>' +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>🌱 作物</h4>' +
        '<table class="rule-table"><tr><th>作物</th><th>种子</th><th>生长</th><th>产量/块</th><th>单果</th><th>季节</th><th>解锁</th></tr>' +
        cropRows + '</table>' +
        '<p>生长按浇水天数推进，成熟当天不能收、<b>次日</b>才能收。<br>' +
        '普通作物产量 = 基础 ±1 − 漏浇 + 施肥 + 等级加成（每 4 级 +1，最低 1）；' +
        '<b>南瓜 / 西瓜固定 1 个</b>，不吃等级和产量肥料，只有<b>肥料品质加成</b>（见「肥料」）。<br>' +
        '高级种子要<b>种田等级</b>解锁：玉米 Lv2、茄子/番茄/辣椒 Lv3、黄瓜/葡萄/草莓 Lv4、南瓜 Lv5、西瓜 Lv6。</p>' +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>🍂 季节</h4>' +
        '<p>每 <b>30 天</b>换一季：<b>春（1–30）/ 夏（31–60）/ 秋（61–90）/ 冬（91–120）</b>，然后循环。<br>' +
        '当季的种子按<b>原价</b>卖；<b>反季的种子也卖，但贵 ×' + G.BALANCE.seed.offSeasonMul + '</b>，' +
        '种下去第一茬多花 ' + G.BALANCE.seed.offSeasonDays + ' 天（南瓜 / 西瓜直接翻倍）、少结 ' +
        G.BALANCE.seed.offSeasonYield + ' 个 —— 换来的好处是反季的收成卖价 <b>×' +
        G.BALANCE.market.offSeason + '</b>。<br>' +
        '<b>冬天土地封冻、河面结冰</b>——不能播种、不能钓鱼（渔网也收不了），种子店歇业，只能打工、卖库存、交委托。<br>' +
        '已经种下的作物不受换季影响，该熟还会熟。</p>' +
        '<table class="rule-table"><tr><th>季节</th><th>特点</th></tr>' +
        '<tr><td>🌱 春</td><td><b>多雨</b>（雨天 50%，自动浇水）</td></tr>' +
        '<tr><td>☀️ 夏</td><td><b>多晴</b>（晴天 60%）· <b>浇水要 2 体力</b>（其他季节 1 点）</td></tr>' +
        '<tr><td>🍂 秋</td><td><b>丰收</b>：普通作物每次收获 <b>+1 个</b>（大作物不算）</td></tr>' +
        '<tr><td>❄️ 冬</td><td>会<b>下雪</b>（45%，化雪等于自动浇水）· 不能种也不能钓</td></tr>' +
        '</table>' +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>🎣 钓鱼</h4>' +
        '<p>2 体力 + 1 份饵甩一杆（<b>冬天河面结冰，钓不了</b>）。<b>先判定咬钩</b>：面团饵 92%、蚯蚓 95%、假饵 72%，晴天 −12%、雨天 +8%。<br>' +
        '🐟 <b>鱼汛</b>：每种鱼只在特定季节成群——汛期上钩权重 ×1.25，非汛期 ×0.3。' +
        '鲫鱼 春·秋 / 鲤鱼 春夏秋 / 鳜鱼 春·夏 / 鲈鱼 夏·秋 / 河豚 秋 / 锦鲤 春。<br>' +
        '咬钩之后才抽鱼种：蚯蚓好鱼 ×1.35 且品质取两次较好；假饵杂物 ×0.3、好鱼 ×1.15、耐用 ' +
        G.BALANCE.lure.dur + ' 次。<br>' +
        '🕸️ 渔网：<b>' + G.NET_COST + ' 金/张，不缴维护费</b>。晚上耗 1 份面团饵，<b>70%</b> 网到 1 条标准及以下的普通鱼，' +
        '<b>不会出杂物和宝箱</b>；要<b>钓鱼 Lv' + G.BALANCE.gate.net + '</b> 解锁，上限 = 2 + 钓鱼等级（最多 ' + G.NET_MAX + ' 张）。<br>' +
        '网到鱼就得下水把鱼取下来，<b>这张网要花 ' + G.BALANCE.netReset.energy + ' 体力重新布置</b>（没布置的网当晚不出货）；' +
        '在河边或渔具店点「重新布置」一次补齐。<br>' +
        '渔获先进仓库：<b>鱼</b>去水产店卖或进收购箱；<b>杂物和宝箱</b>水产店不收，去<b>百货店</b>回收或开箱。<br>' +
        '🎁 宝箱按钓鱼等级掉落（木制随便掉、铁制 Lv' + G.BALANCE.chest.ironLv + '、黄金 Lv' +
        G.BALANCE.chest.goldLv + '），开箱奖励见「百货店」。</p>' +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>🐟 水产店</h4>' +
        '<p>渔获在这里直接卖，<b>' + Math.round(G.BALANCE.shop.sellRate * 100) + ' 折</b>再乘<b>市价</b>；<b>不收杂物和宝箱</b>（那些去百货店）。<br>' +
        '<b>同一种鱼的不同品质会合并成一行</b>（和仓库里的作物一样），显示品质构成和均价；卖出时<b>先卖品质差的</b>。<br>' +
        '<b>鱼也受市场影响</b>：刚开张 ×' + G.BALANCE.market.supplyMax + '（稀缺），每卖 1 条 −' +
        G.BALANCE.market.fishStep + '，最低 ×' + G.BALANCE.market.supplyMin + '，隔天回落 ' +
        Math.round((1 - G.BALANCE.market.decay) * 100) + '%。<br>' +
        '鱼还跟着<b>汛期</b>走：汛期 ×1，<b>非汛期 ×' + G.BALANCE.market.offSeason + '</b>（稀罕货）。<br>' +
        '店里每天<b>进一批水产</b>（一般品质），每种数量随机、<b>睡觉后补货</b>，卖完只能等明天；' +
        '买价 = 基础价 × ' + G.BALANCE.shop.priceMul + ' <b>再乘鱼市价</b>（缺货 / 非汛期更贵），' +
        '买来的鱼<b>不能交委托</b>，只适合转卖或凑图鉴。<br>' +
        '河豚 <b>D' + G.FISH_UNLOCK.puffer + '</b> 起、锦鲤 <b>D' + G.FISH_UNLOCK.koi + '</b> 起才进货。</p>' +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>🧺 农产品店</h4>' +
        '<p>作物在这里直接卖，同样 <b>' + Math.round(G.BALANCE.shop.sellRate * 100) + ' 折</b>，再乘<b>市价系数</b>；仓库不再直接出售任何东西。<br>' +
        '<b>市价</b> = 供需 × 季节：<br>' +
        '· <b>供需</b>：刚开张 ×' + G.BALANCE.market.supplyMax + '（稀缺），每卖 1 件 −' +
        G.BALANCE.market.cropStep + '，最低 ×' + G.BALANCE.market.supplyMin + '（过剩）；隔天回落 ' +
        Math.round((1 - G.BALANCE.market.decay) * 100) + '%<br>' +
        '· <b>季节</b>：<b>反季 ×' + G.BALANCE.market.offSeason + '</b>（过季稀缺、卖得贵），<b>当季 ×1.00</b><br>' +
        '· 两相乘就是最终系数，界面上直接显示「市价 ×2.20 · 反季 · 稀缺」<br>' +
        '所以：<b>别一次性把同一种菜全砸出去</b>；囤到反季再卖，价格会翻倍。<br>' +
        '商店的<b>买价</b>也会跟着市价走 —— 缺货 / 反季时买得更贵。点商店面板的 <b>📈 行情</b> 看全部系数。<br>' +
        '店里每天同样进一批作物（一般品质），买价 = 售价 × ' + G.BALANCE.shop.cropPriceMul +
        ' <b>再乘市价</b>，转手必亏，只在凑委托或应急时买。<br>' +
        '南瓜 <b>D' + G.CROP_UNLOCK.pumpkin + '</b> 起、西瓜 <b>D' + G.CROP_UNLOCK.watermelon + '</b> 起才进货。</p>' +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>📦 收购箱</h4>' +
        '<p>在仓库点每行的 <b>📦</b>，把整批或自定义数量的<b>作物 / 鱼 / 杂物 / 宝箱</b>放进收购箱，<b>下次睡觉时按原价（100%）结算</b>；放错了可以「全部取出」。<br>' +
        '直接卖给水产店 / 农产品店只有 ' + Math.round(G.BALANCE.shop.sellRate * 100) +
        '%，所以：<b>急用钱走商店，不急就进收购箱</b>。箱子里的货也计入税金基数，不能用来避税。<br>' +
        '宝箱也可以直接进箱子换钱（原价），但<b>开箱通常更划算</b>。</p>' +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>⭐ 品质（作物与鱼共用）</h4>' +
        '<table class="rule-table"><tr><th>品质</th><th>倍率</th><th>概率</th></tr>' +
        G.QUALITY.map(function (q) {
          return '<tr><td>' + q.emoji + ' ' + q.name + '</td><td>×' + q.mul + '</td><td>' + q.w + '%</td></tr>';
        }).join('') + '</table>' +
        '<p>单价 = 基础价 × 品质倍率；施肥会多滚几次取最好的（普通肥 2 次、特效肥 3 次）。</p>' +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>🧪 肥料</h4>' +
        '<table class="rule-table"><tr><th>肥料</th><th>买价</th><th>半价回收</th><th>普通作物</th><th>品质</th></tr>' +
        ['normal', 'special'].map(function (k) {
          const f = G.FERT[k];
          return '<tr><td>' + f.emoji + ' ' + f.name + '</td><td>' + f.cost + ' 金</td><td>' +
            G.fertSellPrice(k) + ' 金</td><td>+' + f.add + ' 产量</td><td>取 ' + (k === 'special' ? 3 : 2) + ' 次最好</td></tr>';
        }).join('') + '</table>' +
        '<p>肥料在<b>种子店</b>购买，买回来进仓库，施肥时消耗；多收作物（黄瓜 / 草莓）只提质不加量。<br>' +
        '<b>南瓜 / 西瓜只吃品质加成</b>：数量永远是 1 个，但施肥后品质档位明显更高——这是它们唯一的施肥收益。<br>' +
        '特效肥要<b>种田 Lv' + G.FERT.special.lv + '</b> 才解锁。</p>' +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>💰 经济</h4>' +
        '<p>· 睡觉推进 1 天，扣伙食费 <b>' + G.mealFee(state) + ' 金</b>，体力回满；没钱只回 5 点（不会扣掉已有的）<br>' +
        '· 开局体力上限 <b>15</b>，强化 +5/级（成本每级 ×1.2）<br>' +
        '· 打零工：<b>每天只能打一次</b>，全天 ×2.0 金/体力、半天 ×1.2，不够半天就把剩下的体力用光<br>' +
        '· 强化体力 ' + G.upgradeCost(state) + ' 金 · 扩张土地 ' + G.expandCost(state) + ' 金<br>' +
        '· 🚿 洒水器 ' + G.SPRINKLER_COST + ' 金/个（需种田 Lv' + G.BALANCE.gate.sprinkler +
        '）：每天自动浇 1 块地，不耗体力（雨天自动浇，不叠加）<br>' +
        '· 🤖 自动收获器 ' + G.HARVESTER_COST + ' 金（需种田 Lv' + G.BALANCE.gate.harvester +
        '）：睡觉时自动收走成熟作物，不耗体力<br>' +
        '· 💰 税：每 30 天按（金币 + 仓库价值）<b>累进</b>收一次——前 2000 收 2%、2000~1 万收 4%、1 万以上收 6%，最低 ' +
        G.BALANCE.tax.min + ' 金（当前约 ' + G.taxDue(state) + ' 金）<br>' +
        '· 🧾 维护费：每 7 天收一次，土地 ' + G.plotUpkeep(state.plots.length) + ' 金（6–20 块 3 金/周、21–30 块 6 金/周、31 块以上 ' +
        G.BALANCE.upkeep.plotHigh + ' 金/周） + 设备 ' + G.deviceUpkeep(state) + ' 金（洒水器 3、自动收获器 5，' +
        '<b>渔网不收维护费</b>）<br>' +
        '· 没钱吃饭只恢复到体力上限的 30%（至少 5 点），不会扣掉已有的体力<br>' +
        '· 种子 / 肥料都在种子店买卖（半价回收），肥料也只能在种子店卖；蚯蚓只能在渔具店卖（' + G.WORM_VALUE + ' 金/条）</p>' +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>📋 委托</h4>' +
        '<p>每天 2 个作物单 + 1 个鱼单，<b>每天自动换新</b>，另外还能<b>手动刷新一次</b>。<br>' +
        '报酬约为直接卖的 ' + (G.BALANCE.order.mult * 100).toFixed(0) + '%，没交不罚；季节越往后要的量越多。<br>' +
        '委托池按天数逐档解锁（D1 / D3 / D5 / D7 / D9 / D12 / D15），并且<b>只会要你当前等级买得到的作物</b>；' +
        '<b>每天第一张单固定是「买得到的最贵作物」</b>，剩下随机；' +
        '贵的作物一次要 2–3 个，单张报酬<b>最低 40 金</b>；鱼单单价随季节涨（11 → 15 → 19 → 23）。<br>' +
        '📜 <b>长期订单</b>：5 天期限、数量大、<b>2 倍报酬</b>，完成后自动换下一张（过期也会换）。' +
        '<b>提前交货有额外奖励</b>：每提前 1 天 +10%，最多 +50%。<br>' +
        '交委托先扣<b>品质差的</b>，交鱼先交最便宜的；杂物、宝箱不算数。</p>' +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>⭐ 等级</h4>' +
        '<p>收获普通作物涨<b>种田经验</b>（大作物也涨），钓到鱼涨<b>钓鱼经验</b>（<b>每 2 杆 1 点</b>，完美品质 +2），每级所需 ' +
        G.levelNeed(1) + ' + 10×(级−1)，满级 ' + G.BALANCE.level.max + '。<br>' +
        '种田等级<b>每 4 级 +1 产量</b>（Lv4 / Lv8，大作物不吃）；钓鱼等级每级咬钩 +1.1%、好鱼权重 +2.5%' +
        '（咬钩最多 +10%、好鱼最多 +22.5%）。<br>' +
        '解锁：洒水器 Lv' + G.BALANCE.gate.sprinkler + ' · 特效肥 Lv' + G.BALANCE.gate.specialFert +
        ' · 自动收获器 Lv' + G.BALANCE.gate.harvester + '（均为种田等级）；渔网 钓鱼 Lv' + G.BALANCE.gate.net +
        '，上限随钓鱼等级提高。</p>' +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>🏬 百货店</h4>' +
        '<p>三块业务：<b>茶叶</b>、<b>钥匙</b>、<b>回收站</b>（杂物与宝箱，水产店不收这些）。<br>' +
        '🍵 <b>下午茶</b>一天一杯，<b>消耗一份茶</b>（不再扣金币，只回体力）：' +
        G.TEA_LIST.map(function (t) {
          return t.name + ' ' + t.price + ' 金/+' + t.energy;
        }).join(' · ') + '：D' + G.TEA_LIST.map(function (t) { return t.day; }).join(' / D') +
        ' 上架，<b>大杯单价更便宜</b>。<br>' +
        '🎁 <b>宝箱</b>：木制（直接开，10–26 金）· 铁制（钓鱼 Lv' + G.BALANCE.chest.ironLv +
        '，铁钥匙 ' + G.KEYS.iron.price + ' 金，一包物资约 80 金）· 黄金（Lv' + G.BALANCE.chest.goldLv +
        '，金钥匙 ' + G.KEYS.gold.price + ' 金，200–320 金 + 一件高级物品）。<br>' +
        '🗝️ 钥匙也在百货店买，<b>按钓鱼等级解锁</b>；开箱比回收划算，钥匙不够就先攒着。<br>' +
        '回收价 = 原价的 ' + Math.round(G.BALANCE.shop.sellRate * 100) + '%（和商店一致）。</p>' +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>🏆 成就</h4>' +
        '<p>共 <b>' + G.ACH.length + '</b> 项，分种田 / 钓鱼 / 经营 / 收集四类。每项给<b>成就点</b>和<b>实质奖励</b>（金币 / 种子 / 肥料 / 饵料）；' +
        '每 10 点 <b>+1% 售价</b>（最多 +20%，作用于商店与收购箱）；顶栏 🏆 里能看每项进度。</p>' +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>⌨️ 操作</h4>' +
        '<p>· 成熟地块<b>左键直接收</b>；右键或 Shift + 点击看详情（可铲除、看产量）<br>' +
        '· 顶栏 <b>📊 状态</b> 看累计数据，<b>⚙️ 设置</b> 里有规则说明 / 导入导出 / 音效 / 重新开始<br>' +
        '· 地块 / 饵料 / 账本 / 日志都可以 Tab 聚焦、Enter 或空格操作<br>' +
        '· 日志和账本都能导出 .md；进度自动存在本浏览器</p>' +
      '</div>';

    openModal('📖 规则速查', body, '<button class="btn" data-close>知道了</button>');
  }

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
      '<div><b>' + cropValue + '</b><span>作物总价值</span></div>' +
    '</div>';

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

    openModal('📖 图鉴', stat +
      '<div class="store-sub">🐟 鱼类 · 首次 / 次数 / 累计价值</div>' + fishRows +
      '<div class="store-sub" style="margin-top:10px">🎁 宝箱 · 首次 / 数量 / 累计价值</div>' + chestRows +
      '<div class="store-sub" style="margin-top:10px">🌱 作物 · 首次 / 数量 / 累计价值</div>' + cropRows,
      '<button class="btn" data-close>关闭</button>');
  }

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

    const rows = ['farm', 'fish', 'biz', 'all'].map(function (cat) {
      const items = list.filter(function (a) { return a.cat === cat; });
      if (!items.length) return '';
      return '<div class="store-sub">' + G.ACH_CATS[cat] + ' · ' +
          items.filter(function (a) { return a.done; }).length + '/' + items.length + '</div>' +
        items.map(function (a) {
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
    }).join('');

    openModal('🏆 成就', stat + rows +
      '<div class="shop-tip">每个成就给<b>成就点</b>，每 10 点 +1% 售价（最多 +20%，只作用于商店 / 收购箱）。进度存在存档里。</div>',
      '<button class="btn" data-close>关闭</button>');
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

  function statsModal() {
    const days = G.ledgerByDay(state).slice().reverse().slice(-30);
    const inc = days.reduce(function (a, d) { return a + d.income; }, 0);
    const exp = days.reduce(function (a, d) { return a + d.expense; }, 0);
    const net = inc - exp;
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
      '<div class="codex-stat" style="grid-template-columns:repeat(3,1fr)">' +
        '<div><b>' + inc + '</b><span>总收入</span></div>' +
        '<div><b>' + exp + '</b><span>总支出</span></div>' +
        '<div><b>' + (net >= 0 ? '+' : '') + net + '</b><span>净收益</span></div>' +
      '</div>' +
      '<canvas id="stat-canvas" width="640" height="220"></canvas>' + catHtml +
      '<div class="shop-tip">最近 ' + days.length + ' 天 · 绿=收入、红=支出' +
        (best ? ' · 最赚的一天 D' + best.day + '（' + (best.income - best.expense) + ' 金）' : '') + '</div>',
      '<button class="btn" data-close>关闭</button>');
    setTimeout(function () { drawChart(days); }, 0);
  }

  function drawChart(days) {
    const cv = document.getElementById('stat-canvas');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height, pad = 22;
    ctx.clearRect(0, 0, W, H);
    let max = 1;
    days.forEach(function (d) { max = Math.max(max, d.income, d.expense); });
    const bw = (W - pad * 2) / Math.max(1, days.length);
    const mid = H / 2 + 6;
    days.forEach(function (d, i) {
      const x = pad + i * bw + bw * 0.15, w = bw * 0.7;
      const ih = (d.income / max) * (H / 2 - pad);
      const eh = (d.expense / max) * (H / 2 - pad);
      ctx.fillStyle = '#5fb36f';
      ctx.fillRect(x, mid - ih, w, ih);
      ctx.fillStyle = '#d9786b';
      ctx.fillRect(x, mid, w, eh);
      ctx.fillStyle = '#8a8578';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('D' + d.day, x + w / 2, H - 6);
    });
    ctx.strokeStyle = 'rgba(138,133,120,.45)';
    ctx.beginPath();
    ctx.moveTo(pad, mid);
    ctx.lineTo(W - pad, mid);
    ctx.stroke();
  }

  /* ---------------- 农产品店（作物唯一收购处） ---------------- */

  /* 进货库存小圆点：亮着的是还有货 */
  function stockDots(st, cap) {
    const n = Math.max(0, Math.min(cap, 9));
    const on = Math.max(0, Math.min(n, st));
    let out = '<span class="stock-dots" title="今日剩 ' + st + '/' + cap + '">';
    for (let i = 0; i < n; i++) out += '<i class="' + (i < on ? 'on' : '') + '"></i>';
    return out + '</span>';
  }
  /* 进货价的构成：基准 × 市价 */
  function priceNote(base, mul) {
    return '基准 ' + base + ' × 市价 ' + mul.toFixed(2);
  }

  function cropShop() {
    const ids = Object.keys(state.store).filter(function (k) { return G.storeCount(state, k) > 0; })
      .sort(function (a, b) { return G.storeValue(state, b) - G.storeValue(state, a); });
    const total = ids.reduce(function (a, k) { return a + G.storeCount(state, k); }, 0);
    const totalVal = ids.reduce(function (a, k) { return a + G.storeValue(state, k); }, 0);

    const sellRows = ids.length ? ids.map(function (id) {
      const c = G.CROPS[id];
      const n = G.storeCount(state, id);
      const val = G.storeValue(state, id);
      const mix = G.storeMix(state, id);
      const mk = G.marketInfo(state, id);
      return '<div class="store-row">' +
        '<span class="se">' + c.emoji + '</span>' +
        '<div><div class="sn">' + c.name + ' ×' + n +
          ' <b class="own">市价 ×' + mk.total.toFixed(2) + '</b>' +
          (mk.inSeason ? ' <b class="own">当季</b>' : ' <b class="lock">反季</b>') + '</div>' +
        '<div class="sv">' + mix.map(function (m) {
          return '<span style="color:' + m.color + '">' + m.name + ' ' + m.n + '</span>';
        }).join(' · ') + ' · 均 ' + (val / n).toFixed(1) + ' 金/个 · ' +
          (mk.inSeason ? '当季 ×1' : '反季 ×' + mk.season) + ' · ' + mk.tag + '</div></div>' +
        '<span class="sp">' + val + ' 金</span>' +
        '<button class="btn mini" data-sellcrop="' + id + '">卖出</button>' +
      '</div>';
    }).join('') : '<div class="store-empty">仓库里没有作物，先去田里收点</div>';

    let stockN = 0, soldOutN = 0, openN = 0;
    const buyRows = G.CROP_LIST.map(function (c) {
      const bp = G.cropBuyPrice(c.id, state);
      const st = G.cropShopStock(state, c.id);
      const cap = G.cropStockCap(c);
      const unlock = G.CROP_UNLOCK[c.id] || 1;
      const locked = state.day < unlock;
      const soldOut = !locked && st <= 0;
      const mk = G.marketInfo(state, c.id);
      const base = Math.max(2, Math.round(c.price * G.BALANCE.shop.cropPriceMul));
      if (!locked) { stockN += st; openN++; if (soldOut) soldOutN++; }
      return '<div class="store-row' + (soldOut ? ' sold-out' : '') + (locked ? ' locked' : '') + '">' +
        '<span class="se">' + c.emoji + '</span>' +
        '<div><div class="sn">' + c.name +
          (locked ? ' <b class="lock">D' + unlock + ' 起进货</b>'
                  : ' ' + stockDots(st, cap) + ' <b class="own">' + st + '/' + cap + '</b>') +
          (mk.inSeason ? ' <b class="own">当季</b>' : ' <b class="lock">反季 ×' + mk.season + '</b>') +
          '</div>' +
        '<div class="sv">' + (locked ? '中后期才进这种作物'
          : '进价 <b>' + bp + '</b> 金/个 · ' + priceNote(base, mk.total) +
            '（' + mk.tag + '）· ' + (c.desc || '')) + '</div></div>' +
        '<button class="btn mini" data-buycrop="' + c.id + '" data-n="1"' +
          (locked || soldOut || state.coins < bp ? ' disabled' : '') + '>' +
          (locked ? '未解锁' : (soldOut ? '售罄' : '买1')) + '</button>' +
        (locked || soldOut ? '' :
          '<button class="btn mini" data-buycrop="' + c.id + '" data-n="' + st + '"' +
          (state.coins < bp * st ? ' disabled' : '') + '>买满</button>') +
      '</div>';
    }).join('');

    openModal('🧺 农产品店',
      '<div class="shop-head">💰 <b>' + state.coins + '</b> 金</div>' +
      '<div class="store-sub">卖作物 · ' + total + ' 个 · 共 ' + totalVal + ' 金</div>' + sellRows +
      (ids.length
        ? '<div class="buy-custom"><span>🧮 自定义卖出</span>' +
            '<select id="crop-sell-id">' + ids.map(function (id) {
              return '<option value="' + id + '">' + G.CROPS[id].name + '（' + G.storeCount(state, id) + '）</option>';
            }).join('') + '</select>' +
            '<input id="crop-sell-n" type="number" min="1" step="1" value="10" inputmode="numeric">' +
            '<button class="btn mini" data-sellcropn="1">卖出</button>' +
            '<span class="bc-tip">从品质差的开始卖</span></div>'
        : '') +
      '<div class="store-sub" style="margin-top:10px">今日进货 · 一般品质 · 共 <b>' + stockN + '</b> 件' +
        (soldOutN ? ' · ' + soldOutN + '/' + openN + ' 种售罄' : '') + '</div>' + buyRows +
      '<div class="shop-tip">每天补一次货，卖完等明天。进价 = 基准价 × 市价（' +
        '最近卖得多就便宜、反季贵 ×' + G.BALANCE.market.offSeason + '），所以转手必亏，只在凑委托 / 应急时买。<br>' +
        '想卖原价就把作物放进<b>收购箱</b>（仓库 📦），明天睡觉结算。</div>',
      '<button class="btn" data-sellallcrop' + (total ? '' : ' disabled') + '>全部卖出</button>' +
      '<button class="btn" data-close>关闭</button>');
  }

  /* ---------------- 收购箱 ---------------- */

  function boxModal() {
    const list = state.box || [];
    const total = G.boxValue(state);
    const rows = list.length ? list.map(function (e) {
      let sub = '原价 ' + e.v + ' 金';
      if (e.parts && e.parts.length) {
        sub = e.parts.map(function (p) {
          const q = G.qualityById(p.q);
          return (q ? q.emoji + q.name : '杂物') + ' ' + p.n;
        }).join(' · ') + ' · 原价 ' + e.v + ' 金';
      }
      return '<div class="store-row">' +
        '<span class="se">' + (e.emoji || '📦') + '</span>' +
        '<div><div class="sn">' + e.name + ' ×' + e.n + '</div>' +
        '<div class="sv">' + sub + '</div></div>' +
        '<span class="sp">' + e.v + ' 金</span>' +
      '</div>';
    }).join('') : '<div class="store-empty">收购箱是空的：在仓库点 📦 把作物 / 渔获放进来</div>';

    openModal('📦 收购箱',
      '<div class="shop-head">待出货 <b>' + list.length + '</b> 批 · 原价合计 <b>' + total + '</b> 金</div>' +
      rows +
      (list.length
        ? '<div class="buy-custom"><span>🧮 自定义取出</span>' +
            '<select id="box-pick">' + list.map(function (e, i) {
              return '<option value="' + i + '">' + (e.emoji || '📦') + ' ' + e.name + ' ×' + e.n + '</option>';
            }).join('') + '</select>' +
            '<input id="box-take" type="number" min="1" step="1" value="1" inputmode="numeric">' +
            '<button class="btn mini" data-boxtaken="1">取出</button>' +
            '<span class="bc-tip">共 ' + list.reduce(function (a, e) { return a + (e.n || 1); }, 0) + ' 件</span></div>'
        : '') +
      '<div class="shop-tip">放进去的货会在<b>下次睡觉时</b>按原价（100%）结算；' +
      '直接卖给水产店 / 农产品店只有 ' + Math.round(G.BALANCE.shop.sellRate * 100) + '%。<br>' +
      '放错了可以取出放回仓库。</div>',
      '<button class="btn" data-boxtake' + (list.length ? '' : ' disabled') + '>全部取出</button>' +
      '<button class="btn" data-close>关闭</button>');
  }

  /* 渔获品质构成（和作物仓库一个写法） */
  function fishMix(g) {
    return g.mix.map(function (m) {
      return '<span style="color:' + m.color + '">' + m.emoji + ' ' + m.name + ' ' + m.n + '</span>';
    }).join(' · ');
  }

  function fishShop() {
    const groups = G.fishGroups(state, 'fish');
    const total = groups.reduce(function (n, g) { return n + g.count; }, 0);
    const sellRows = groups.length ? groups.map(function (g) {
      const mk = G.fishMarketInfo(state, g.name);
      return '<div class="store-row">' +
        '<span class="se">' + g.emoji + '</span>' +
        '<div><div class="sn">' + g.name + ' ×' + g.count +
          ' <b class="own">市价 ×' + mk.total.toFixed(2) + '</b>' +
          (mk.inRun ? ' <b class="own">汛期</b>' : ' <b class="lock">非汛期 ×' + mk.season + '</b>') + '</div>' +
        '<div class="sv">' + fishMix(g) + ' · 均 ' + (g.total / g.count).toFixed(1) +
          ' 金/条 · ' + (mk.inRun ? '汛期 ×1' : '非汛期 ×' + mk.season) + ' · ' + mk.tag + '</div></div>' +
        '<span class="sp">' + g.total + ' 金</span>' +
        '<button class="btn mini" data-sellfish="' + g.key + '">卖出</button>' +
      '</div>';
    }).join('') : '<div class="store-empty">还没有渔获，先去河边甩两杆</div>';

    const buyList = G.FISH.filter(function (f) { return !f.trash && !f.noOrder; });
    let stockN = 0, soldOutN = 0, openN = 0;
    const buyRows = buyList.map(function (f) {
      const bp = G.fishBuyPrice(f.id, state);
      const st = G.shopStock(state, f.id);
      const cap = (G.SHOP_STOCK[f.id] || [1, 2])[1];
      const unlock = G.FISH_UNLOCK[f.id] || 1;
      const locked = state.day < unlock;
      const inRun = G.fishSeasonOk(f.id, state.day);
      const mk = G.fishMarketInfo(state, f.name);
      const base = Math.max(3, Math.round(f.base * G.BALANCE.shop.priceMul));
      const soldOut = !locked && st <= 0;
      if (!locked) { stockN += st; openN++; if (soldOut) soldOutN++; }
      return '<div class="store-row' + (soldOut ? ' sold-out' : '') + (locked ? ' locked' : '') + '">' +
        '<span class="se">' + f.emoji + '</span>' +
        '<div><div class="sn">' + f.name +
          (locked ? ' <b class="lock">D' + unlock + ' 起进货</b>'
                  : ' ' + stockDots(st, cap) + ' <b class="own">' + st + '/' + cap + '</b>') +
          (inRun ? ' <b class="own">鱼汛 ' + G.fishSeasonText(f.id) + '</b>'
                 : ' <b class="lock">非汛期 ×' + mk.season + '</b>') +
          '</div>' +
        '<div class="sv">' + (locked ? '中后期才进这种水产' :
          '进价 <b>' + bp + '</b> 金/条 · ' + priceNote(base, mk.total) +
          '（' + mk.tag + '）· ' + G.fishDesc(f.name)) + '</div></div>' +
        '<button class="btn mini" data-buyfish="' + f.id + '" data-n="1"' +
          (locked || soldOut || state.coins < bp ? ' disabled' : '') + '>' +
          (locked ? '未解锁' : (soldOut ? '售罄' : '买1')) + '</button>' +
        (locked || soldOut ? '' :
          '<button class="btn mini" data-buyfish="' + f.id + '" data-n="' + st + '"' +
          (state.coins < bp * st ? ' disabled' : '') + '>买满</button>') +
      '</div>';
    }).join('');

    openModal('🐟 水产店',
      '<div class="shop-head">💰 <b>' + state.coins + '</b> 金</div>' +
      '<div class="store-sub">卖渔获 · ' + total + ' 条</div>' + sellRows +
      (groups.length
        ? '<div class="buy-custom"><span>🧮 自定义卖出</span>' +
            '<select id="fish-sell-id">' + groups.map(function (g) {
              return '<option value="' + g.key + '">' + g.emoji + ' ' + g.name + ' ×' + g.count + '</option>';
            }).join('') + '</select>' +
            '<input id="fish-sell-n" type="number" min="1" step="1" value="1" inputmode="numeric">' +
            '<button class="btn mini" data-sellfishn="1">卖出</button>' +
            '<span class="bc-tip">共 ' + total + ' 条</span></div>'
        : '') +
      '<div class="store-sub" style="margin-top:10px">买水产 · 今日进货 · 共 <b>' + stockN + '</b> 条' +
        (soldOutN ? ' · ' + soldOutN + '/' + openN + ' 种售罄' : '') + '</div>' + buyRows +
      '<div class="shop-tip">水产店每天补一次货，卖完要等明天；买来的鱼是<b>一般品质</b>，只能卖钱、不能交委托。<br>' +
        '进价 = 基准价 × 市价（非汛期贵 ×' + G.BALANCE.market.offSeason + '）。<br>' +
        '直接卖只有 ' + Math.round(G.BALANCE.shop.sellRate * 100) + ' 折，想原价卖就放进<b>收购箱</b>（仓库 📦）。</div>',
      '<button class="btn" data-sellallfish' + (total ? '' : ' disabled') + '>全部卖出</button>' +
      '<button class="btn" data-close>关闭</button>');
  }

  function statsPlaceholder() {}

  /* ---------------- 下午茶 ---------------- */

  /* ---------------- 市场行情 ---------------- */

  function marketModal() {
    const season = G.seasonOf(state.day);
    const OFF = G.BALANCE.market.offSeason;
    const cropRows = G.CROP_LIST.map(function (c) {
      const mk = G.marketInfo(state, c.id);
      return '<div class="store-row">' +
        '<span class="se">' + c.emoji + '</span>' +
        '<div><div class="sn">' + c.name +
          (mk.inSeason ? ' <b class="own">当季 ×1</b>' : ' <b class="lock">反季 ×' + mk.season + '</b>') + '</div>' +
        '<div class="sv">' + G.seasonText(c.id) + '季 · 最近卖出 ' + mk.sold.toFixed(0) +
          ' 件 · ' + mk.tag + '（×' + mk.supply.toFixed(2) + '）· 买价 ' + G.cropBuyPrice(c.id, state) + ' 金</div></div>' +
        '<span class="sp">×' + mk.total.toFixed(2) + '</span>' +
      '</div>';
    }).join('');

    const fishRows = G.FISH.filter(function (f) { return !f.trash && !f.chest; }).map(function (f) {
      const mk = G.fishMarketInfo(state, f.name);
      return '<div class="store-row">' +
        '<span class="se">' + f.emoji + '</span>' +
        '<div><div class="sn">' + f.name +
          (mk.inRun ? ' <b class="own">汛期 ×1</b>' : ' <b class="lock">非汛期 ×' + mk.season + '</b>') + '</div>' +
        '<div class="sv">鱼汛 ' + G.fishSeasonText(f.id) + ' · 最近卖出 ' + mk.sold.toFixed(0) + ' 条 · ' +
          mk.tag + '（×' + mk.supply.toFixed(2) + '）· 买价 ' + G.fishBuyPrice(f.id, state) + ' 金</div></div>' +
        '<span class="sp">×' + mk.total.toFixed(2) + '</span>' +
      '</div>';
    }).join('');

    openModal('📈 市场行情',
      '<div class="shop-head">现在是 <b>' + season + '季</b> · 最近销量越多越便宜</div>' +
      '<div class="store-sub">🌱 作物 · 当季 ×1 / 反季 ×' + OFF + '</div>' + cropRows +
      '<div class="store-sub" style="margin-top:10px">🐟 水产 · 汛期 ×1 / 非汛期 ×' + OFF +
        '（非汛期上钩率也只有 ' + G.FISH_OFF_SEASON + '）</div>' + fishRows +
      '<div class="shop-tip">市价 = 供需 × 季节：刚开张是 <b>×' + G.BALANCE.market.supplyMax +
        '</b>（稀缺），作物每卖 1 件 −0.02、鱼每条 −0.015，最低 ×' + G.BALANCE.market.supplyMin +
        '（过剩）；每天睡觉销量回落 ' + Math.round((1 - G.BALANCE.market.decay) * 100) + '%。<br>' +
        '反季的菜 / 非汛期的鱼卖价 <b>×' + OFF + '</b>，囤到那时候再出手翻倍 —— 但砸得太狠一样会饱和。<br>' +
        '商店的<b>进价</b>也跟着市价走：缺货时进货更贵，反季进货更贵。</div>',
      '<button class="btn" data-close>关闭</button>');
  }

  function teaModal() {
    const canDrink = !state.teaUsed && state.energy < state.maxEnergy;
    const rows = G.TEA_LIST.map(function (t) {
      const have = (state.teas && state.teas[t.id]) || 0;
      const open = state.day >= t.day;
      return '<div class="store-row' + (have ? '' : ' sold-out') + (open ? '' : ' locked') + '">' +
        '<span class="se">' + t.emoji + '</span>' +
        '<div><div class="sn">' + t.name +
          ' <b class="own">库存 ' + have + '</b></div>' +
        '<div class="sv">体力 +' + t.energy + ' · ' + t.desc +
          (open ? '' : ' · 第 ' + t.day + ' 天起供应') + '</div></div>' +
        '<button class="btn mini" data-tea="' + t.id + '"' +
          (!have || !canDrink ? ' disabled' : '') + '>喝</button></div>';
    }).join('');

    openModal('🍵 下午茶',
      '<div class="shop-head">🔥 体力 <b>' + state.energy + '</b> / ' + state.maxEnergy + '</div>' +
      '<div class="store-sub">一天只能喝一杯 · 消耗一份茶' +
        (state.teaUsed ? '（今天已经喝过了）' : '') + '</div>' + rows +
      '<div class="shop-tip">茶在<b>百货店</b>买；不同的茶回体力不一样，贵的更划算。<br>' +
        '还没买的茶显示库存 0。</div>',
      '<button class="btn" data-act="depart">🏬 去百货店买茶</button>' +
      '<button class="btn" data-close>关闭</button>');
  }

  /* ---------------- 百货店 ---------------- */

  function departModal() {
    const teaRows = G.TEA_LIST.map(function (t) {
      const open = state.day >= t.day;
      const have = (state.teas && state.teas[t.id]) || 0;
      return '<div class="store-row' + (open ? '' : ' locked') + '">' +
        '<span class="se">' + t.emoji + '</span>' +
        '<div><div class="sn">' + t.name +
          (open ? ' <b class="own">库存 ' + have + '</b>' : ' <b class="lock">第 ' + t.day + ' 天起</b>') +
          '</div><div class="sv">' + t.price + ' 金 · 体力 +' + t.energy + ' · ' + t.desc + '</div></div>' +
        '<button class="btn mini" data-buytea="' + t.id + '"' +
          (!open || state.coins < t.price ? ' disabled' : '') + '>买1</button>' +
        (open ? '<button class="btn mini" data-buytea="' + t.id + '" data-n="3"' +
          (state.coins < t.price * 3 ? ' disabled' : '') + '>买3</button>' : '') +
        '</div>';
    }).join('');

    const keyRows = Object.keys(G.KEYS).map(function (id) {
      const k = G.KEYS[id];
      const open = G.keyUnlocked(state, id);
      const have = (state.keys && state.keys[id]) || 0;
      return '<div class="store-row' + (open ? '' : ' locked') + '">' +
        '<span class="se">' + k.emoji + '</span>' +
        '<div><div class="sn">' + k.name +
          (open ? ' <b class="own">持有 ' + have + '</b>' : ' <b class="lock">钓鱼 Lv' + k.lv + ' 解锁</b>') +
          '</div><div class="sv">' + (open ? k.price + ' 金 · 开' + k.opens :
            '钓鱼等级到 Lv' + k.lv + ' 才上架') + '</div></div>' +
        '<button class="btn mini" data-buykey="' + id + '"' +
          (!open || state.coins < k.price ? ' disabled' : '') + '>买1</button></div>';
    }).join('');

    // 百货店只收宝箱，杂物一律不收（只能进收购箱）
    const junk = G.fishGroups(state, 'junk').filter(function (g) { return g.chest; });
    const CHECK = {
      wood: '开箱 10–26 金',
      iron: '开箱：肥料×6–9 / 种子×8–12 / 面团×12–18 / 蚯蚓×12–18',
      gold: '开箱：200–320 金 + 特效肥×3–5 / 稀有种子×2–3 / 蚯蚓×14–18'
    };
    const junkRows = junk.length ? junk.map(function (g) {
      const k = G.CHESTS[g.chest];
      const needKey = k && k.key;
      const keys = (state.keys && state.keys[needKey]) || 0;
      const loot = CHECK[g.chest] || '';
      return '<div class="store-row">' +
        '<span class="se">' + g.emoji + '</span>' +
        '<div><div class="sn">' + g.name + ' ×' + g.count + '</div>' +
        '<div class="sv">' + (needKey ? '要' + G.KEYS[needKey].name + '（持有 ' + keys + '）· ' : '直接开 · ') +
          loot + ' · 回收 ' + G.shopValue(g.v) + ' 金/个</div></div>' +
        '<button class="btn mini primary" data-openchest="' + g.key + '"' +
          (needKey && !keys ? ' disabled' : '') + '>开箱</button>' +
        '<button class="btn mini" data-selljunk="' + g.key + '">回收</button></div>';
    }).join('') : '<div class="store-empty">还没有宝箱，去河边捞一捞</div>';

    openModal('🏬 百货店',
      '<div class="shop-head">💰 <b>' + state.coins + '</b> 金</div>' +
      '<div class="store-sub">🍵 茶叶 · 买回去喝下午茶</div>' + teaRows +
      '<div class="store-sub" style="margin-top:10px">🗝️ 钥匙 · 钓鱼 Lv' + G.KEYS.iron.lv + ' / Lv' +
        G.KEYS.gold.lv + ' 解锁</div>' + keyRows +
      '<div class="store-sub" style="margin-top:10px">♻️ 宝箱回收 · 只收宝箱，杂物不收</div>' + junkRows +
      '<div class="shop-tip">宝箱按钓鱼等级掉落：木制随便掉、铁制 <b>Lv' + G.BALANCE.chest.ironLv +
        '</b> 起、黄金 <b>Lv' + G.BALANCE.chest.goldLv + '</b> 起后两者要用钥匙开。<br>' +
        '对照：铁箱一包物资（约 80 金），钥匙 40；金箱 200–320 金 + 一件高级物品，钥匙 120 —— <b>开箱比回收划算</b>，钥匙不够就先攒着。<br>' +
        '杂物和宝箱也能放进<b>收购箱</b>按原价结算，但通常没有开箱值。</div>',
      '<button class="btn" data-close>关闭</button>');
  }

  function settingsModal() {
    openModal('⚙️ 设置',
      '<div class="action-grid">' +
        '<button class="btn" id="set-help">📖 规则说明</button>' +
        '<button class="btn" id="set-theme">' + (theme === 'dark' ? '🌙 黑夜模式：开' : '☀️ 黑夜模式：关') + '</button>' +
        '<button class="btn" id="set-export">⬇️ 导出存档<small>.json</small></button>' +
        '<button class="btn" id="set-import">⬆️ 导入存档<small>.json</small></button>' +
        '<button class="btn" id="set-sound">' + (soundOn ? '🔊 音效：开' : '🔇 音效：关') + '</button>' +
        '<button class="btn danger" id="set-reset">🔄 重新开始</button>' +
      '</div>' +
      '<div class="shop-tip">进度自动保存在本浏览器（localStorage）；换设备用导出 / 导入。</div>',
      '<button class="btn" data-close>关闭</button>');
  }

  function statusModal() {
    const lv = state.levels || { farm: 1, fish: 1, farmXp: 0, fishXp: 0 };
    const nextTax = G.BALANCE.tax.every - (state.day % G.BALANCE.tax.every);
    const rows = [
      ['进度', '第 ' + state.day + ' 天 · ' + G.seasonOf(state.day) + '季'],
      ['金币', state.coins + ' 金'],
      ['体力', state.energy + ' / ' + state.maxEnergy + ' · 伙食 ' + G.mealFee(state) + ' 金/天'],
      ['土地', state.plots.length + ' 块 · 洒水器 ' + state.sprinklers + ' 个'],
      ['设备', (state.harvester ? '自动收获器 ✅ · ' : '自动收获器 — · ') + '渔网 ' + state.nets +
        ' 张（已布 ' + G.netSetCount(state) + '）'],
      ['种田等级', 'Lv' + lv.farm + (lv.farm >= G.BALANCE.level.max ? '（满级）' :
        '（' + lv.farmXp + '/' + G.levelNeed(lv.farm) + '）') + ' · ' + G.levelEffectText('farm', lv.farm)],
      ['钓鱼等级', 'Lv' + lv.fish + (lv.fish >= G.BALANCE.level.max ? '（满级）' :
        '（' + lv.fishXp + '/' + G.levelNeed(lv.fish) + '）') + ' · ' + G.levelEffectText('fish', lv.fish)],
      ['维护费', '每周 ' + (G.plotUpkeep(state.plots.length) + G.deviceUpkeep(state)) +
        ' 金（土地 ' + G.plotUpkeep(state.plots.length) + ' + 设备 ' + G.deviceUpkeep(state) + '）'],
      ['税金', '还有 ' + nextTax + ' 天 · 约 ' + G.taxDue(state) + ' 金（累进 2% / 4% / 6%，最低 ' +
        G.BALANCE.tax.min + '）'],
      ['仓库总价', G.storeTotal(state) + ' 金'],
      ['收购箱', G.boxCount(state) + ' 批 · ' + G.boxValue(state) + ' 金（睡觉结算）'],
      ['茶叶', (function () {
        const list = G.teaStock(state);
        return list.length ? list.map(function (t) { return t.emoji + t.name + '×' + state.teas[t.id]; }).join(' · ')
          : '没有茶了（百货店有卖）';
      })()],
      ['钥匙', '🗝️ 铁 ×' + ((state.keys && state.keys.iron) || 0) + ' · 🔑 金 ×' + ((state.keys && state.keys.gold) || 0)],
      ['宝箱', '已开 ' + (state.stats.chests || 0) + ' 个 · 待开 ' +
        G.fishGroups(state, 'junk').filter(function (g) { return g.chest; })
          .reduce(function (n, g) { return n + g.count; }, 0) + ' 个'],
      ['累计播种', state.stats.planted + ' 次'],
      ['累计收获', state.stats.harvests + ' 次'],
      ['累计钓鱼', state.stats.casts + ' 次'],
      ['挖蚯蚓', state.stats.dug + ' 次'],
      ['卖出作物', (state.stats.cropsSold || 0) + ' 个'],
      ['完成委托', (state.stats.orders || 0) + ' 单'],
      ['成就', (function () {
        const list = G.achInfo(state);
        return list.filter(function (a) { return a.done; }).length + ' / ' + list.length;
      })()]
    ];
    openModal('📊 当前状态',
      '<dl class="kv">' + rows.map(function (r) {
        return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>';
      }).join('') + '</dl>',
      '<button class="btn" data-close>关闭</button>');
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
      if (r.ok) { toast(r.msg, 'good'); SFX.good(); floatAt(ev, '🧺 ' + (r.msg.split('共 ')[1] || ''), 'green'); }
    },
    sleep: function () {
      const r = G.sleep(state);
      commit(r);
      SFX.sleep();
      // 合并成一条播报，不再截断
      toast(r.summary, 'good');
    },
    dig: function (ev) {
      const r = G.digWorms(state);
      commit(r);
      if (r.ok) { toast(r.msg, 'good'); SFX.plant(); floatAt(ev, '🪱 +' + r.n, 'green'); }
    },
    tea: teaModal,
    depart: departModal,
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
    sprinkler: function () {
      const r = G.buySprinkler(state);
      commit(r);
      if (r.ok) { toast(r.msg, 'good'); SFX.coin(); }
    },
    harvester: function () {
      const r = state.harvester ? G.toggleHarvester(state) : G.buyHarvester(state);
      commit(r);
      if (r.ok) { toast(r.msg, 'good'); SFX.coin(); }
    },
    shop: shopModal,
    fishshop: fishShop,
    cropshop: cropShop,
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
      if (r.ok && r.empty) {
        toast('空竿了，没有鱼咬钩', 'warn');
        floatAt(ev, '空竿', '');
        SFX.bad();
        return;
      }
      if (r.ok) {
        pushCatch(r.entry);
        toast(r.msg, r.entry.trash ? 'warn' : 'good');
        SFX.catch();
        floatAt(ev, '+' + r.entry.price + ' 金', '');
      }
    },
    cast5: function () {
      const r = G.fishMany(state, 5, baitSel);
      commit(r);                       // commit 已经在失败时提示过一次
      if (!r.ok) return;
      const got = r.results.filter(function (x) { return x.ok && x.entry; }).map(function (x) { return x.entry; });
      setCatchBatch(got);
      toast(r.msg, 'good');
      SFX.catch();
    },
    castAll: function () {
      const r = G.fishAll(state, baitSel);
      commit(r);
      if (!r.ok) return;
      setCatchBatch(r.entries || []);
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

      // 地块：熟了一键收，其余（空地/生长中/按住 Shift）进详情
      const plot = t.closest('.plot');
      if (plot) {
        const i = Number(plot.dataset.i);
        const p = state.plots[i];
        if (p && p.crop && G.canHarvest(state, p) && !ev.shiftKey && ev.button !== 2) {
          const r = G.harvest(state, i);
          commit(r);
          if (r.ok) {
            toast(r.msg, 'good');
            SFX.good();
            floatAt(ev, '🧺 +' + r.qty, 'green');
          } else {
            toast(r.msg, 'warn');
          }
          return;
        }
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
        else if (kind === 'fert-normal') r = G.useFert(state, i, 'normal');
        else if (kind === 'fert-special') r = G.useFert(state, i, 'special');
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

      // 水产店：自定义卖出
      const sellFishN = t.closest('[data-sellfishn]');
      if (sellFishN) {
        const sel = $('#fish-sell-id'), input = $('#fish-sell-n');
        const key = sel && sel.value;
        const n = Math.floor(Number(input && input.value) || 0);
        if (!key) { toast('先选一种渔获', 'warn'); return; }
        if (!(n > 0)) { toast('请输入 1 以上的数量', 'warn'); return; }
        const r = G.sellFishGroupN(state, key, n);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) fishShop();
        return;
      }

      // 卖一种鱼（水产店）
      const sellFish = t.closest('[data-sellfish]');
      if (sellFish) {
        const r = G.sellFishGroup(state, sellFish.dataset.sellfish);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) fishShop();
        return;
      }

      // 收购箱：自定义取出（可选物品）
      const boxTakeN = t.closest('[data-boxtaken]');
      if (boxTakeN) {
        const sel = $('#box-pick'), input = $('#box-take');
        const idx = sel ? Number(sel.value) : 0;
        const n = Math.floor(Number(input && input.value) || 0);
        if (!(n > 0)) { toast('请输入 1 以上的数量', 'warn'); return; }
        const r = G.boxTakeEntry(state, idx, n);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (modalOpen()) boxModal();
        return;
      }

      // 收购箱：全部取出
      const boxTakeBtn = t.closest('[data-boxtake]');
      if (boxTakeBtn) {
        const r = G.boxTake(state);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (modalOpen()) boxModal();
        return;
      }

      // 农产品店：自定义卖出
      const sellCropN = t.closest('[data-sellcropn]');
      if (sellCropN) {
        const sel = $('#crop-sell-id'), input = $('#crop-sell-n');
        const id = sel && sel.value;
        let n = Math.floor(Number(input && input.value) || 0);
        if (!id) { toast('先选一种作物', 'warn'); return; }
        if (!(n > 0)) { toast('请输入 1 以上的数量', 'warn'); return; }
        const r = G.sellCropN(state, id, n);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) cropShop();
        return;
      }

      // 收购箱：放货
      const boxCrop = t.closest('[data-boxcrop]');
      if (boxCrop) {
        const r = G.boxPutCrop(state, boxCrop.dataset.boxcrop);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        return;
      }
      const boxFish = t.closest('[data-boxfish]');
      if (boxFish) {
        const r = G.boxPutFish(state, boxFish.dataset.boxfish);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        return;
      }

      // 农产品店：卖作物 / 全部卖出 / 买作物
      const sellCrop = t.closest('[data-sellcrop]');
      if (sellCrop) {
        const r = G.sellOne(state, sellCrop.dataset.sellcrop);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) cropShop();
        return;
      }
      const sellAllCrop = t.closest('[data-sellallcrop]');
      if (sellAllCrop && !sellAllCrop.disabled) {
        const r = G.sellAll(state);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) cropShop();
        return;
      }
      const buyCropBtn = t.closest('[data-buycrop]');
      if (buyCropBtn && !buyCropBtn.disabled) {
        const r = G.buyCrop(state, buyCropBtn.dataset.buycrop, Number(buyCropBtn.dataset.n) || 1);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) cropShop();
        return;
      }

      // 渔具店：面团饵自定义数量
      const buyCustom = t.closest('[data-buycustom]');
      if (buyCustom) {
        const input = $('#dough-qty');
        let n = Math.floor(Number(input && input.value) || 0);
        if (!(n > 0)) { toast('请输入 1 以上的数量', 'warn'); return; }
        n = Math.min(999, n);
        const r = G.buyBait(state, buyCustom.dataset.buycustom, n);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) shopModal();
        return;
      }

      // 水产店：买鱼
      const buyFish = t.closest('[data-buyfish]');      if (buyFish && !buyFish.disabled) {
        const r = G.buyFish(state, buyFish.dataset.buyfish, Number(buyFish.dataset.n) || 1);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) fishShop();
        return;
      }

      const sellAllFish = t.closest('[data-sellallfish]');
      if (sellAllFish && !sellAllFish.disabled) {
        const r = G.sellAllFish(state);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) fishShop();
        return;
      }

      // 下午茶：喝哪一杯
      const drink = t.closest('[data-tea]');
      if (drink && !drink.disabled) {
        const r = G.tea(state, drink.dataset.tea);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) { SFX.good(); if (modalOpen()) teaModal(); }
        return;
      }

      // 百货店：买茶 / 买钥匙 / 回收 / 开箱
      const buyTea = t.closest('[data-buytea]');
      if (buyTea && !buyTea.disabled) {
        const r = G.buyTea(state, buyTea.dataset.buytea, Number(buyTea.dataset.n) || 1);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) departModal();
        return;
      }
      const buyKey = t.closest('[data-buykey]');
      if (buyKey && !buyKey.disabled) {
        const r = G.buyKey(state, buyKey.dataset.buykey, 1);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) departModal();
        return;
      }
      const sellJunk = t.closest('[data-selljunk]');
      if (sellJunk && !sellJunk.disabled) {
        const r = G.sellJunk(state, sellJunk.dataset.selljunk);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) departModal();
        return;
      }
      const openChestBtn = t.closest('[data-openchest]');
      if (openChestBtn && !openChestBtn.disabled) {
        const r = G.openChest(state, openChestBtn.dataset.openchest);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.good();
        if (modalOpen()) departModal();
        return;
      }

      // 长期订单
      const longBtn = t.closest('[data-long]');
      if (longBtn && !longBtn.disabled) {
        const r = G.deliverLong(state);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        return;
      }
      // 交付委托
      const orderBtn = t.closest('[data-order]');
      if (orderBtn && !orderBtn.disabled) {
        const r = G.deliverOrder(state, orderBtn.dataset.order);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        return;
      }

      // 肥料：买 / 卖（种子店、仓库共用）
      const fertBuy = t.closest('[data-fertbuy]');
      if (fertBuy) {
        const r = G.buyFertItem(state, fertBuy.dataset.fertbuy, Number(fertBuy.dataset.n) || 1);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) seedShop();
        return;
      }
      const fertSell = t.closest('[data-fertsell]');
      if (fertSell) {
        const r = G.sellFert(state, fertSell.dataset.fertsell);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) seedShop();
        return;
      }
      const allSeeds = t.closest('[data-sellallseeds]');
      if (allSeeds) {
        const r = G.sellAllSeeds(state);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) seedShop();
        return;
      }

      // 买渔网
      const buyNet = t.closest('[data-buynet]');
      if (buyNet && !buyNet.disabled) {
        const r = G.buyNet(state);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) shopModal();
        return;
      }

      // 重新布置渔网
      const resetNet = t.closest('[data-resetnets]');
      if (resetNet && !resetNet.disabled) {
        const r = G.resetNets(state);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) shopModal();
        return;
      }

      // 卖蚯蚓（自定义数量）
      const sellWormN = t.closest('[data-sellwormn]');
      if (sellWormN && !sellWormN.disabled) {
        const input = $('#worm-qty');
        let n = Math.floor(Number(input && input.value) || 0);
        if (!(n > 0)) { toast('请输入 1 以上的数量', 'warn'); return; }
        const r = G.sellWorms(state, Math.min(999, n));
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) shopModal();
        return;
      }

      // 卖蚯蚓
      const sellWorm = t.closest('[data-sellworm]');
      if (sellWorm) {
        const r = G.sellWorms(state);
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

    $('#btn-settings').addEventListener('click', settingsModal);
    $('#btn-box').addEventListener('click', boxModal);
    $('#btn-status').addEventListener('click', statusModal);
    $('#btn-codex').addEventListener('click', codexModal);
    $('#btn-ach').addEventListener('click', achModal);
    const mktBtn = $('#btn-market');
    if (mktBtn) mktBtn.addEventListener('click', marketModal);
    $('#btn-refresh-orders').addEventListener('click', function () {
      const r = G.refreshOrders(state);
      commit(r);
      toast(r.msg, r.ok ? 'good' : 'warn');
      if (r.ok) SFX.good();
    });
    $('#btn-log').addEventListener('click', exportLog);
    $('#btn-ledger').addEventListener('click', exportLedger);
    $('#btn-stats').addEventListener('click', statsModal);
    $('#file-import').addEventListener('change', function () {
      importSave(this.files && this.files[0]);
      this.value = '';
    });

    // 设置面板里的按钮（面板每次重绘，用事件委托）
    document.addEventListener('click', function (ev) {
      const t = ev.target;
      if (t.closest('#set-help')) { closeModal(); helpModal(); return; }
      if (t.closest('#set-export')) { exportSave(); return; }
      if (t.closest('#set-import')) { $('#file-import').click(); return; }
      if (t.closest('#set-sound')) { soundOn = !soundOn; if (soundOn) SFX.good(); settingsModal(); return; }
      if (t.closest('#set-theme')) { toggleTheme(); settingsModal(); return; }
      if (t.closest('#set-reset')) { closeModal(); resetModal(); return; }
    });

    // 键盘可操作：这些「可点的 div」按 Enter / 空格 等同点击
    document.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Enter' && ev.key !== ' ' && ev.key !== 'Spacebar') return;
      const el = ev.target;
      if (!el || !el.matches || !el.matches('.plot, .bait, .led-row, .log-day')) return;
      ev.preventDefault();
      el.click();
    });

    // 右键地块 = 打开详情（左键点成熟地块是直接收获）
    document.addEventListener('contextmenu', function (ev) {
      const plot = ev.target.closest && ev.target.closest('.plot');
      if (!plot) return;
      ev.preventDefault();
      plotModal(Number(plot.dataset.i));
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
    try { if (localStorage.getItem('farm-gui-theme') === 'dark') theme = 'dark'; } catch (e) { /* 忽略 */ }
    applyTheme();
    const saved = load();
    if (saved) {
      state = saved;
      // 用钓鱼记录本里的历史把「最近渔获」补上
      catchLog = (state.fishBook.entries || []).slice(0, 5);
    } else {
      state = G.createState();
    }
    bind();
    const unlocked = G.checkAchievements(state);
    renderAll();
    save();

    if (saved) {
      setTimeout(function () { toast('读取存档：第 ' + state.day + ' 天 · ' + state.coins + ' 金', 'good'); }, 300);
    } else {
      setTimeout(function () { toast('🌾 欢迎来到我的小农场！先给空地播种吧', 'good'); }, 300);
    }
    if (unlocked.length) setTimeout(function () { achToasts(unlocked); }, 900);
  }

  boot();
})();
