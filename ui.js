/* ============================================================
 * 我的小农场 · 界面层
 * 由 build-ui.cjs 从 ui-src/ 拼装生成 —— 不要直接改这个文件，改 ui-src/ 下的模块。
 * ============================================================ */
(function () {
  'use strict';

  /* ===== 01-core.js ===== */
/* 我的小农场 · 界面层 / 01-core.js
 * 顶层依赖 / 存档与读写 / 导入导出 / 音效 / Toast 与飘字 / 弹窗开合
 * 由 build-ui.cjs 按文件名顺序拼进 ui.js（共享同一个 IIFE 作用域），不要单独加载。
 */

  const G = window.FarmGame;
  const SAVE_KEY = 'farm-gui-save-v1';

  let state = null;
  let baitSel = 'worm';
  let soundOn = true;
  let storeFilter = 'all';
  let storeQuery = '';
  let futureSave = false;   // 读档时发现「来自更新版本」的存档 → 备份并提示

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.prototype.slice.call(document.querySelectorAll(sel));

  /* HTML 转义：日志 / 账本 / 鱼名这些来自存档的文本，拼进 innerHTML 前一律先过一遍。
   * 存档导入（G.deserialize）已经清洗过一轮，这里是输出侧的第二层保险。 */
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------------- 存档 ---------------- */

  /* 写入去抖：连续操作（连点、连甩、全部浇水）只落一次盘；
   * 页面隐藏 / 关闭时用 flushSave() 同步补写，保证不丢最后一笔。 */
  const SAVE_DEBOUNCE = 400;
  let saveTimer = null;

  function saveNow() {
    try { localStorage.setItem(SAVE_KEY, G.serialize(state)); } catch (e) { /* 忽略 */ }
  }

  function save() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      saveTimer = null;
      saveNow();
    }, SAVE_DEBOUNCE);
    // Node 下（dom-test）不要因为这个定时器拖住进程
    if (saveTimer && typeof saveTimer.unref === 'function') saveTimer.unref();
  }

  function flushSave() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    if (state) saveNow();
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) return G.deserialize(raw);
    } catch (e) {
      // 存档来自更新的版本：先把原文另存一份，免得被新档覆盖丢掉
      if (e && e.code === 'FUTURE_SAVE') {
        futureSave = true;
        try { localStorage.setItem(SAVE_KEY + '-future', localStorage.getItem(SAVE_KEY) || ''); } catch (e2) { /* 忽略 */ }
      }
    }
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

  /* ===== 02-view.js ===== */
/* 我的小农场 · 界面层 / 02-view.js
 * HUD / 农田地块 / 底部操作按钮 / 河边小队 / 选饵 / 最近渔获
 * 由 build-ui.cjs 按文件名顺序拼进 ui.js（共享同一个 IIFE 作用域），不要单独加载。
 */

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

    $('#hud-fee').textContent = '🍖 ' + G.mealFeeDue(state) + ' 金/天' +
      (G.mealFeeDue(state) !== G.mealFee(state) ? '（没吃午饭）' : '');
    $('#hud-fee').title = G.kitchenUnlocked(state)
      ? '今天' + (G.lunchEaten(state) ? '已吃' : '没吃') + '午饭：' +
        G.mealFee(state) + ' → ' + G.mealFeeDue(state) + ' 金'
      : '每天睡觉扣一次';
    $('#hud-plots').textContent = '🏞️ ' + state.plots.length + ' 块';
    $('#season').textContent = (G.isWinter(state.day) ? '❄️ ' : '') +
      G.seasonOf(state.day) + ' · 第 ' + state.day + ' 天';

    const lv = state.levels || { farm: 1, fish: 1, farmXp: 0, fishXp: 0, dig: 1, digXp: 0, forage: 1, forageXp: 0 };
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
    const digLvEl = $('#dig-lv'), forLvEl = $('#forage-lv');
    if (digLvEl) {
      digLvEl.textContent = '🪱 Lv' + (lv.dig || 1);
      digLvEl.title = '挖蚯蚓等级：' + G.levelEffectText('dig', lv.dig || 1) +
        ' · 经验 ' + (lv.digXp || 0) + '/' + G.levelNeed(lv.dig || 1);
    }
    if (forLvEl) {
      forLvEl.textContent = '🌿 Lv' + (lv.forage || 1);
      forLvEl.title = '采集等级：' + G.levelEffectText('forage', lv.forage || 1) +
        ' · 经验 ' + (lv.forageXp || 0) + '/' + G.levelNeed(lv.forage || 1);
    }
    const trLvEl = $('#trade-lv');
    if (trLvEl) {
      trLvEl.textContent = '🤝 Lv' + (lv.trade || 1);
      trLvEl.title = '交易等级：' + G.levelEffectText('trade', lv.trade || 1) +
        ' · 经验 ' + (lv.tradeXp || 0) + '/' + G.levelNeed(lv.trade || 1, 'trade');
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
    $('#expand-txt').textContent = state.plots.length >= G.BALANCE.expand.max
      ? '已到上限 · ' + G.BALANCE.expand.max + ' 块'
      : '第 ' + (state.plots.length + 1) + ' 块 · ' + G.expandCost(state) + ' 金';
    $('#upgrade-txt').textContent = '上限 ' + state.maxEnergy + '→' + (state.maxEnergy + G.BALANCE.upgrade.step) + ' · ' + G.upgradeCost(state) + ' 金';
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
    const seedTxt = $('#seeder-txt');
    if (seedTxt) {
      const seedLock = !G.seederUnlocked(state);
      const sc = G.seederCount(state);
      let picked = 0;
      for (let k = 1; k <= sc; k++) if (G.autoSeedOf(state, k)) picked++;
      seedTxt.textContent = seedLock
        ? '需种田 Lv' + G.BALANCE.gate.seeder + ' 解锁'
        : (!sc
          ? G.SEEDER_COST + ' 金/台 · 一台管 ' + G.SEEDER_PLOTS + ' 块'
          : (sc + ' 台 · 每晚播 ' + G.seederPlots(state) + ' 块' +
            (state.seederOn ? '' : '（已关）') +
            (picked ? ' · ' + picked + ' 台已选种子' : ' · 都没选种子')));
    }
    const devSum = $('#dev-sum');
    if (devSum) {
      const fee = G.deviceUpkeep(state);
      devSum.textContent = fee ? '维护 ' + fee + ' 金/周' : '';
    }
    renderCrew();

    const teaBtn = $('[data-act="tea"]');
    const teaHave = G.teaStock(state);
    const teaBest = teaHave.slice().sort(function (a, b) { return b.energy - a.energy; })[0];
    teaBtn.disabled = state.teaUsed || state.energy >= state.maxEnergy || !teaHave.length;
    $('#tea-txt').textContent = state.teaUsed
      ? '今天喝过了'
      : (!teaHave.length ? '没有茶了' :
        (state.energy >= state.maxEnergy ? '体力已满'
          : teaBest.emoji + ' ' + teaBest.name + ' · +' + teaBest.energy + ' 体力'));

    const digCost = G.digCost(state);    const digFrozen = G.isWinter(state.day);
    $('[data-act="dig"]').disabled = digFrozen || state.energy < digCost;
    const digTxt = $('#dig-txt');
    if (digTxt) digTxt.textContent = digFrozen ? '封冻期 · 挖不了' : digCost + ' 体力';

    /* 厨房 */
    const cookLv = state.levels.cook || 1;
    const cookLvEl = $('#cook-lv');
    if (cookLvEl) {
      cookLvEl.textContent = '🍳 Lv' + cookLv;
      cookLvEl.title = G.levelEffectText('cook', cookLv);
    }
    const unlocked = G.kitchenUnlocked(state);
    const kitchenTxt = $('#kitchen-txt');
    if (kitchenTxt) {
      kitchenTxt.textContent = unlocked
        ? '今日 ' + G.cookLeft(state) + '/' + G.cookDailyLimit(state) + ' 份 · 食谱 ' +
          G.cookRecipes().filter(function (r) { return r.lv <= cookLv; }).length + ' 道'
        : '需种田 Lv' + G.BALANCE.cook.unlockFarm + ' + 钓鱼 Lv' + G.BALANCE.cook.unlockFish;
    }
    const lunchBtn = $('[data-act="lunch"]');
    if (lunchBtn) lunchBtn.disabled = !unlocked;
    const lunchTxt = $('#lunch-txt');
    if (lunchTxt) {
      lunchTxt.textContent = !unlocked ? '厨房未解锁'
        : (G.lunchEaten(state) ? '今天吃过了' : '今天还没吃 · 伙食 ×' + G.BALANCE.meal.skipLunchMul);
    }
    const forageBtn = $('[data-act="forage"]');
    if (forageBtn) {
      const fp = G.foragePool(state.day);
      const fCost = G.forageCost(state);
      forageBtn.disabled = state.energy < fCost || !fp.length;
      const ft = $('#forage-txt');
      if (ft) {
        ft.textContent = fp.length
          ? fCost + ' 体力 · ' + fp.map(function (w) { return w.name; }).join('/')
          : '这个季节没得采';
      }
    }
    $('[data-act="work"]').disabled = state.workUsed || state.energy <= 0;
    $('[data-act="expand"]').disabled = state.plots.length >= G.BALANCE.expand.max ||
      state.coins < G.expandCost(state);
    $('[data-act="upgrade"]').disabled = state.coins < G.upgradeCost(state);
    $('[data-act="sprinkler"]').disabled = sprLock ||
      state.coins < G.SPRINKLER_COST || state.sprinklers >= state.plots.length;
    $('[data-act="harvester"]').disabled = harvLock || (!state.harvester && state.coins < G.HARVESTER_COST);
  }

  /* ---------------- 河边「渔网 / 渔夫」小队卡 ---------------- */

  function renderCrew() {
    const box = $('#crew-row');
    if (!box) return;

    /* --- 渔网卡 --- */
    let netCard;
    if (!G.netUnlocked(state)) {
      netCard = '<div class="crew-card locked">' +
        '<div class="cc-head"><span class="cc-ic">🕸️</span><span class="cc-t">渔网</span>' +
          '<span class="cc-tag">未解锁</span></div>' +
        '<div class="cc-sub">钓鱼 Lv' + G.BALANCE.gate.net + ' 解锁 · 渔具店 ' + G.NET_COST + ' 金/张</div>' +
      '</div>';
    } else if (!state.nets) {
      netCard = '<div class="crew-card empty">' +
        '<div class="cc-head"><span class="cc-ic">🕸️</span><span class="cc-t">渔网</span>' +
          '<span class="cc-tag">0 / ' + G.netMax(state) + '</span></div>' +
        '<div class="cc-sub">河边还没放网 · 渔具店 ' + G.NET_COST + ' 金/张</div>' +
      '</div>';
    } else {
      const setN = G.netSetCount(state), pend = G.netPending(state), cost = G.netResetCost(state);
      let dots = '';
      for (let i = 0; i < Math.min(state.nets, 9); i++) {
        dots += '<i class="' + (i < setN ? 'on' : '') + '"></i>';
      }
      netCard = '<div class="crew-card' + (pend ? ' warn' : ' on') + '">' +
        '<div class="cc-head"><span class="cc-ic">🕸️</span><span class="cc-t">渔网</span>' +
          '<span class="cc-tag">' + setN + ' / ' + state.nets + ' 已布</span></div>' +
        '<div class="cc-dots">' + dots + '</div>' +
        '<div class="cc-sub">' + Math.round(G.NET_CHANCE * 100) + '% 各上 1 条 · 每天 ' + setN +
          ' 份面团饵</div>' +
        '<div class="cc-sub2">上限 ' + G.netMax(state) + ' 张 · 重布 ' +
          G.BALANCE.netReset.energy + ' 体力/张</div>' +
        '<div class="cc-act">' +
          (pend
            ? '<button class="btn mini" data-resetnets' + (state.energy < 1 ? ' disabled' : '') +
              '>重新布置 ' + pend + ' 张 · ' + cost + ' 体力</button>'
            : '<span class="cc-ok">网都在水里</span>') +
        '</div>' +
      '</div>';
    }

    /* --- 渔夫卡 --- */
    let fisherCard;
    if (!G.fisherUnlocked(state)) {
      fisherCard = '<div class="crew-card locked">' +
        '<div class="cc-head"><span class="cc-ic">🧑‍🌾</span><span class="cc-t">渔夫</span>' +
          '<span class="cc-tag">未解锁</span></div>' +
        '<div class="cc-sub">钓鱼 Lv' + G.BALANCE.gate.fisher + ' 才招得到人</div>' +
      '</div>';
    } else if (!state.fisher) {
      fisherCard = '<div class="crew-card empty">' +
        '<div class="cc-head"><span class="cc-ic">🧑‍🌾</span><span class="cc-t">渔夫</span>' +
          '<span class="cc-tag">待雇</span></div>' +
        '<div class="cc-sub">雇佣 ' + G.BALANCE.fisher.hire + ' 金 · 重布渔网 + 每天自动钓鱼</div>' +
        '<div class="cc-act"><button class="btn mini primary" data-hirefisher' +
          (state.coins < G.BALANCE.fisher.hire ? ' disabled' : '') + '>雇佣</button></div>' +
      '</div>';
    } else {
      const max = G.BALANCE.fisher.max;
      const lv = G.fisherLv(state);
      const need = G.fisherNeed(state);
      const xp = (state.fisher && state.fisher.xp) || 0;
      const ratio = lv >= max ? 1 : Math.max(0, Math.min(1, xp / Math.max(1, need)));
      const upCost = G.fisherUpCost(state);
      fisherCard = '<div class="crew-card on">' +
        '<div class="cc-head"><span class="cc-ic">🧑‍🌾</span><span class="cc-t">渔夫</span>' +
          '<span class="cc-tag">Lv' + lv + '</span></div>' +
        '<div class="cc-bar"><i style="width:' + Math.round(ratio * 100) + '%"></i></div>' +
        '<div class="cc-sub">' + (lv >= max ? '已满级' : '经验 ' + xp + ' / ' + need) +
          ' · 每天 ' + G.fisherCasts(state) + ' 杆 · 工资 ' + G.fisherWage(state) + ' 金</div>' +
        '<div class="cc-sub2">咬钩 +' + (G.fisherHookBonus(state) * 100).toFixed(1) + '% · 好鱼 +' +
          ((G.fisherGoodBonus(state) - 1) * 100).toFixed(1) + '%</div>' +
        '<div class="cc-act">' +
          (lv >= max
            ? '<span class="cc-ok">满级</span>'
            : '<button class="btn mini" data-fisherup' + (state.coins < upCost ? ' disabled' : '') +
              '>升 Lv' + (lv + 1) + ' · ' + upCost + ' 金</button>') +
          '<button class="btn mini" data-firefisher>辞退</button>' +
        '</div>' +
      '</div>';
    }

    box.innerHTML = netCard + fisherCard;
  }

  /* ---------------- 钓鱼 ---------------- */

  function renderBait() {
    const lure2Open = G.fishLv(state) >= G.BALANCE.gate.lure2 &&
      G.tradeLv(state) >= G.BALANCE.gate.lure2Trade;
    const premiumOpen = G.fishLv(state) >= G.BALANCE.gate.premium &&
      G.tradeLv(state) >= G.BALANCE.gate.premiumTrade;
    const list = [
      { id: 'worm', n: state.bait.worm },
      { id: 'dough', n: state.bait.dough },
      { id: 'premium', n: state.bait.premium || 0, lock: !premiumOpen,
        lockTxt: 'Lv' + G.BALANCE.gate.premium + '·交易' + G.BALANCE.gate.premiumTrade },
      { id: 'lure', n: state.lure.owned ? state.lure.dur : 0 },
      { id: 'lure2', n: (state.lure2 && state.lure2.owned) ? state.lure2.dur : 0, lock: !lure2Open,
        lockTxt: 'Lv' + G.BALANCE.gate.lure2 + '·交易' + G.BALANCE.gate.lure2Trade }
    ];
    if (!list.some(function (b) { return b.id === baitSel && b.n > 0; })) {
      const first = list.filter(function (b) { return b.n > 0; })[0];
      baitSel = first ? first.id : 'worm';
    }
    $('#bait-row').innerHTML = list.map(function (b) {
      const bd = G.BAIT[b.id];
      const max = b.id === 'lure' ? G.BALANCE.lure.dur : (b.id === 'lure2' ? G.BALANCE.lure2.dur : 0);
      const cnt = max
        ? (b.n ? b.n + '/' + max : (b.lock ? (b.lockTxt || '未解锁') : '无'))
        : '×' + b.n;
      return '<div class="bait ' + (b.id === baitSel ? 'sel ' : '') + (b.n || b.lock ? '' : 'off') +
        '" data-bait="' + b.id + '" title="' + bd.desc + '"' +
        ' role="button" tabindex="0" aria-label="' + bd.name + '，' + (b.n ? b.n + ' 个' : '没有') + '"' +
        ' aria-pressed="' + (b.id === baitSel) + '">' +
        '<span>' + bd.emoji + '</span><span class="bn">' + bd.name + '</span>' +
        '<span class="bc">' + cnt + '</span></div>';
    }).join('');

    const frozen = G.isWinter(state.day);
    const FISH_E = G.BALANCE.energy.fish;
    const BATCH = G.BALANCE.fishBatch;
    const canCast = frozen ? 0 : Math.floor(state.energy / FISH_E);
    const meta = $('#fish-meta');
    if (meta) {
      meta.textContent = frozen ? '❄️ 河面结冰'
        : (canCast ? '还能甩 ' + canCast + ' 杆' : '体力不够，先睡觉');
    }
    const ff = $('#fish-forecast');
    if (ff) {
      if (frozen) {
        ff.innerHTML = '<span class="ff-warn">❄️ 河面结冰，冬天钓不了鱼</span>';
      } else {
        const f = G.fishForecast(state, baitSel);
        const w = G.WEATHER[state.weather] || {};
        const mod = w.hookMod || 0;
        ff.innerHTML =
          '<span>咬钩 <b>' + Math.round(f.hook * 100) + '%</b>' +
            (mod ? '<i class="' + (mod > 0 ? 'up' : 'down') + '">' + (mod > 0 ? '+' : '') +
              Math.round(mod * 100) + '%</i>' : '') + '</span>' +
          '<span>好鱼 <b>×' + f.good.toFixed(2) + '</b></span>' +
          (f.bonusHook > 0
            ? '<span>双咬钩 <b class="up">+' + Math.round(f.bonusHook * 100) + '%</b></span>' : '') +
          '<span>每杆 <b class="' + (f.net >= 0 ? 'up' : 'down') + '">' +
            (f.net >= 0 ? '+' : '') + f.net.toFixed(1) + '</b> 金' +
            '<i>毛 ' + f.ev.toFixed(1) + ' · 饵 ' + f.cost.toFixed(1) + '</i></span>';
      }
    }
    const castBtn = $('[data-act="cast"]');
    castBtn.disabled = frozen || state.energy < FISH_E;
    castBtn.title = frozen ? '河面结冰，冬天钓不了鱼' : '';
    const cast5Btn = $('[data-act="cast5"]');
    cast5Btn.disabled = frozen || state.energy < FISH_E * BATCH;
    const cast5n = $('#cast5-n');
    if (cast5n) cast5n.textContent = String(BATCH);
    const castCost = $('#cast-cost');
    if (castCost) castCost.textContent = FISH_E + ' 体力';
    const castAllBtn = $('[data-act="castAll"]');
    if (castAllBtn) { castAllBtn.disabled = frozen || canCast < 1; castAllBtn.title = frozen ? '河面结冰' : ''; }
    const castAllN = $('#castall-n');
    if (castAllN) castAllN.textContent = frozen ? '' : (canCast ? canCast + ' 杆' : '体力不够');
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
        const col = esc(e.quality ? e.quality.color : '#9a866c');
        return '<div class="catch-item" style="border-left-color:' + col + '">' +
          '<span class="ce">' + esc(e.emoji) + '</span>' +
          '<span class="cn2">' + esc(e.fish) + '</span>' +
          '<span class="cq2" style="color:' + col + '">' +
            (e.quality ? esc(e.quality.emoji) + ' ' + esc(e.quality.name) : (e.chest ? '宝箱' : '杂物')) + '</span>' +
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

  /* ===== 03-panels.js ===== */
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
      all: crops.length + fish.length + (wormN ? 1 : 0) + fertRows.length + G.foodGroups(state).length,
      crops: planted.length,
      wild: wild.length,
      fish: fishOnly.length,
      food: G.foodGroups(state).length,
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
    if (storeFilter === 'all' || storeFilter === 'food') {
      const groups = G.foodGroups(state).filter(function (g) { return matches(g.name); });
      const rows = groups.map(function (g) {
        const q = G.qualityById(g.q);
        const left = G.foodDaysLeft(g, state.day);
        return '<div class="store-row">' +
          '<span class="se">' + esc(g.emoji || '🍲') + '</span>' +
          '<div><div class="sn">' + esc(g.name) + (g.n > 1 ? ' ×' + g.n : '') +
            (q ? ' <b class="own">' + q.emoji + q.name + '</b>' : '') + '</div>' +
          '<div class="sv">+' + (g.energy || 0) + ' 体力 · <span class="' +
            (left <= 1 ? 'exp-soon' : '') + '">' +
            (left <= 0 ? '今天到期' : '还剩 ' + left + ' 天') + '</span>' +
            ' · 约 ' + (g.price || 0) + ' 金/份 · 去厨房吃</div></div>' +
          '<span class="sp">' + (g.priceTotal || 0) + ' 金</span>' +
          '<span class="spw">' +
            '<button class="btn mini" data-boxfood="' + g.key + '" title="整组放进收购箱">📦</button>' +
          '</span></div>';
      }).join('');
      if (rows) sections.push('<div class="store-sub">🍲 熟食 · ' + groups.length + ' 种</div>' + rows);
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
            ' · 报酬 ' + lo.reward + ' 金' + (lo.offSeason ? ' · 🌗 反季' : '') + '</div>' +
          '<div class="os">' + (lo.kind === 'fish' ? '渔获' : '仓库') + ' ' +
            Math.min(have, lo.qty) + '/' + lo.qty + ' · 只收普通及以上 · ' +
            (left === 0 ? '今天截止' : '还剩 ' + left + ' 天') + (lo.kind === 'fish' ? '' : ' · 2 倍价') +
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
          '<div class="on">' + o.name + ' ×' + o.qty + ' · 报酬 ' + o.reward + ' 金' +
            (o.offSeason ? ' · 🌗 反季' : '') + '</div>' +
          '<div class="os">' + (o.done ? '✅ 已完成' : thing + ' ' + Math.min(have, o.qty) + '/' + o.qty +
            ' · 先扣劣质 · 约 ' + Math.round(o.reward / o.qty) + (o.kind === 'fish' ? ' 金/条' : ' 金/个') +
            (o.mul && Math.abs(o.mul - 1) > 0.01 ? ' · 含市价 ×' + o.mul.toFixed(2) : '') +
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
        '<span class="led-label">' + (d.items.length > 1 ? d.items.length + ' 笔' : esc(d.items[0].label)) + '</span>' +
        '<span class="led-val">' + head + '</span>' +
        '<span class="led-bal">' + d.balance + '</span>' +
      '</div>';

      if (open) {
        html += '<div class="led-detail">' + d.items.map(function (it) {
          const v = it.income > 0 ? '+' + it.income : (it.expense > 0 ? '-' + it.expense : '—');
          const cls = it.income > 0 ? 'led-inc' : (it.expense > 0 ? 'led-exp' : '');
          return '<div class="dline"><span>' + esc(it.label) + '</span><b class="' + cls + '">' + v + '</b></div>';
        }).join('') + '</div>';
      }
      return html;
    }).join('');

    $('#ledger').innerHTML = rows || '<div class="store-empty">还没有账目</div>';
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
        '<span class="ld-last">' + (open ? '（点击收起）' : esc(last)) + '</span>' +
        '<span class="ld-caret">' + (open ? '▾' : '▸') + '</span>' +
      '</div>';
      if (open) {
        html += d.items.map(function (r) {
          return '<div class="log-row ' + esc(r.kind || '') + '"><span>' + esc(r.text) + '</span></div>';
        }).join('');
      }
      return html;
    }).join('');
    $('#log').innerHTML = rows || '<div class="store-empty">还没有记录</div>';
  }

  /* ---------------- 焦点保持 ---------------- */
  /* 每次操作都会全量重绘面板，DOM 节点被换掉，键盘用户的焦点会掉回 body，
   * 得从头 Tab。这里在重绘前记下焦点元素的 data 标识，重绘后按同样的标识找回来。
   * 弹窗（#modal-root）里的焦点不归这里管，直接跳过。 */

  const FOCUS_DATA = ['i', 'bait', 'ledday', 'logday', 'order', 'long', 'tree', 'orc',
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

  /* ===== 04-plot-modals.js ===== */
/* 我的小农场 · 界面层 / 04-plot-modals.js
 * 地块弹窗 / 铲除确认 / 选种 / 种子店 / 全部施肥
 * 由 build-ui.cjs 按文件名顺序拼进 ui.js（共享同一个 IIFE 作用域），不要单独加载。
 */

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
        (can ? '🧺 收获' : '⏳ 明天才能收') + '<small>' + G.BALANCE.energy.harvest + ' 体力</small></button>';
    } else {
      actions += '<button class="btn primary" data-pact="water" data-i="' + i + '"' +
        (p.watered ? ' disabled' : '') + '>💧 浇水<small>' + (p.watered ? '今天浇过了' : G.waterCost(state) + ' 体力 · +1 天') + '</small></button>';
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
      ' 天（南瓜/西瓜翻倍）、每茬少 ' + offPen + ' 个，但收成卖价 ×' + marketMul + '。' +
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
      '<div class="shop-tip">反季种子<b>也能种</b>：第一茬多花 ' + offDays + ' 天（南瓜 / 西瓜直接翻倍）、' +
        '少结 1 个（黄瓜 / 葡萄 / 草莓<b>每茬都少</b>），但反季的收成卖价 ×' +
        G.BALANCE.market.offSeason + ' —— 想赌一把就囤着晚卖。<br>' +
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

  /* ===== 05-device-shop.js ===== */
/* 我的小农场 · 界面层 / 05-device-shop.js
 * 自动播种器面板 / 商店大类（种子·渔具·水产·农产品·百货）
 * 由 build-ui.cjs 按文件名顺序拼进 ui.js（共享同一个 IIFE 作用域），不要单独加载。
 */

  /* ---------------- 自动播种器 ---------------- */

  function seederModal() {
    if (!G.seederUnlocked(state)) {
      toast('自动播种器要种田 Lv' + G.BALANCE.gate.seeder + ' 才解锁', 'warn');
      return;
    }
    const per = G.SEEDER_PLOTS;
    const have = G.seederCount(state);
    const max = G.seederMax(state);
    const cover = G.seederPlots(state);
    const upkeep = G.BALANCE.upkeep.seeder;
    if (seedMach > have) seedMach = 1;
    const buyBtn = '<button class="btn" data-buyseeder' +
      (state.coins < G.SEEDER_COST || have >= max ? ' disabled' : '') + '>再买一台（' +
      G.SEEDER_COST + ' 金）</button>';

    if (!have) {
      openModal('🌱 自动播种器',
        '<div class="shop-head">💰 <b>' + state.coins + '</b> 金 · 现在有 <b>' + state.plots.length + '</b> 块地</div>' +
        '<div class="shop-tip">一台机器<b>只管 ' + per + ' 块地</b>：每晚睡前自动往空地里播 ' + per +
          ' 块，<b>不耗体力</b>，只消耗背包里的种子；每台每周要交 <b>' + upkeep + ' 金</b>维护费。<br>' +
          '你现在的地块需要 <b>' + max + '</b> 台才能全自动；冬天不工作，种子用完就停。</div>',
        '<button class="btn" data-buyseeder' + (state.coins < G.SEEDER_COST ? ' disabled' : '') +
          '>买一台（' + G.SEEDER_COST + ' 金）</button>' +
        '<button class="btn" data-close>取消</button>');
      return;
    }

    const rows = G.CROP_LIST.filter(function (c) { return (state.seeds[c.id] || 0) > 0; })
      .map(function (c) {
        const users = [];
        for (let k = 1; k <= have; k++) if (G.autoSeedOf(state, k) === c.id) users.push(k);
        const on = users.indexOf(seedMach) >= 0;
        return '<button class="seed-chip' + (on ? ' on' : '') + '" data-autoseed="' + c.id + '">' +
          '<span class="sc-emoji">' + c.emoji + '</span>' +
          '<span class="sc-name">' + c.name + '</span>' +
          '<span class="sc-n">×' + state.seeds[c.id] + '</span>' +
          (users.length ? '<span class="sc-used">第' + users.join('·') + '台</span>' : '') +
        '</button>';
      }).join('');

    /* 每台机器负责的号段 + 自己选的种子（卡片网格） */
    const machineRows = [];
    for (let k = 1; k <= have; k++) {
      const rg = G.seederPlateRange(k);
      const real = Math.min(rg.to, state.plots.length);
      const seed = G.autoSeedOf(state, k);
      let stTxt = seed ? ((state.seeds[seed] || 0) ? '播种中' : '种子用完了') : '没选种子';
      if (!state.seederOn) stTxt = '已关闭';
      else if (G.isWinter(state.day)) stTxt = '冬天停工';
      const span = real - rg.from + 1;
      const done = state.plots.slice(rg.from - 1, real)
        .filter(function (p) { return p.crop; }).length;
      const c = seed ? G.CROPS[seed] : null;
      machineRows.push('<div class="seed-card' + (seedMach === k ? ' on' : '') +
        (seed ? '' : ' empty') + '">' +
        '<div class="sc-head"><b>第 ' + k + ' 台</b><span>第 ' + rg.from + '–' + real + ' 块</span></div>' +
        '<div class="sc-main">' + (c ? c.emoji + ' ' + c.name : '— 未选种子') + '</div>' +
        '<div class="sc-foot">' + stTxt + ' · 已占 ' + done + '/' + span + '</div>' +
        '<button class="btn mini" data-mach="' + k + '">' +
          (seedMach === k ? '选种子中' : '选种子') + '</button>' +
        '</div>');
    }

    openModal('🌱 自动播种器',
      '<div class="shop-head"><b>' + have + '</b> / ' + max + ' 台 · 每晚自动播 <b>' + cover + '</b> / ' +
        state.plots.length + ' 块 · ' + (state.seederOn ? '已开启' : '已关闭') +
        ' · 维护 ' + G.seederUpkeep(state) + ' 金/周</div>' +
      '<div class="store-sub">🐣 每台只管自己那 ' + per + ' 块地，各选各的种子，收完立刻补种</div>' +
      '<div class="seed-grid">' + machineRows.join('') + '</div>' +
      '<div class="shop-tip">买第 ' + (have + 1) + ' 台要 ' + G.SEEDER_COST +
        ' 金（维护 +' + upkeep + ' 金/周）。台数上限 = 盖住全部地块所需（' + max + ' 台），想多买先扩地。<br>' +
        '自动播种不耗体力，只消耗种子；冬天不工作。</div>' +
      '<div class="store-sub" style="margin-top:10px">🌰 给第 ' + seedMach + ' 台选种子</div>' +
      (rows ? '<div class="seed-picks">' + rows + '</div>'
            : '<div class="store-empty">背包里没有种子，先去种子店买</div>'),
      (have < max ? buyBtn : '') +
      '<button class="btn" data-toggleseeder>' + (state.seederOn ? '关掉自动播种' : '开启自动播种') + '</button>' +
      '<button class="btn" data-close>关闭</button>');
  }

  /* ---------------- 商店 / 帮助 / 重置 ---------------- */

  function shopModal() {
    const worms = state.bait.worm || 0;
    const dough = state.bait.dough || 0;
    const lure = G.BALANCE.lure;
    const lure2 = G.BALANCE.lure2;
    const lure2FishOk = G.fishLv(state) >= G.BALANCE.gate.lure2;
    const lure2TradeOk = G.tradeLv(state) >= G.BALANCE.gate.lure2Trade;
    const lure2Open = lure2FishOk && lure2TradeOk;
    const lure2LockTxt = !lure2FishOk
      ? '需钓鱼 Lv' + G.BALANCE.gate.lure2
      : '还需交易 Lv' + G.BALANCE.gate.lure2Trade;
    const lure2Have = (state.lure2 && state.lure2.owned) ? state.lure2.dur : 0;
    const premFishOk = G.fishLv(state) >= G.BALANCE.gate.premium;
    const premTradeOk = G.tradeLv(state) >= G.BALANCE.gate.premiumTrade;
    const premOpen = premFishOk && premTradeOk;
    const premLockTxt = !premFishOk
      ? '需钓鱼 Lv' + G.BALANCE.gate.premium
      : '还需交易 Lv' + G.BALANCE.gate.premiumTrade;
    const netLock = !G.netUnlocked(state);
    const netCap = G.netMax(state);
    const evOf = function (id) {
      const f = G.fishForecast(state, id);
      return '每杆约 <b class="' + (f.net >= 0 ? 'up' : 'down') + '">' + (f.net >= 0 ? '+' : '') +
        f.net.toFixed(1) + '</b> 金';
    };
    const buyBtn = function (id, n, label, ok) {
      return '<button class="btn mini" data-buy="' + id + '" data-n="' + n + '"' +
        (ok === false ? ' disabled' : '') + '>' + label + '</button>';
    };
    const lureHave = state.lure.owned ? state.lure.dur : 0;
    const body =
      '<div class="shop-head">🎣 饵料 · 金币 <b>' + state.coins + '</b> · 钓鱼 Lv' + G.fishLv(state) +
        ' · ' + ((G.WEATHER[state.weather] || {}).name || '') + '</div>' +
      '<div class="store-row">' +
        '<span class="se">🍞</span>' +
        '<div><div class="sn">面团饵 <b class="own">现有 ' + dough + '</b></div>' +
        '<div class="sv">' + Math.round(G.BALANCE.hook.dough * 100) + '% 咬钩 · ' +
          G.BAIT.dough.price + ' 金/份 · ' + evOf('dough') + '</div></div>' +
        '<span class="spw">' + buyBtn('dough', 1, '买 1') + buyBtn('dough', 5, '买 5') + '</span>' +
      '</div>' +
      '<div class="store-row">' +
        '<span class="se">🎣</span>' +
        '<div><div class="sn">假饵' +
          (lureHave ? ' <b class="own">剩 ' + lureHave + ' 次</b>' : '') + '</div>' +
        '<div class="sv">' + Math.round(G.BALANCE.hook.lure * 100) + '% 咬钩 · 好鱼 ×' +
          G.BALANCE.bait.lureGood + ' · 杂物 ×' + G.BALANCE.bait.lureTrash + ' · ' +
          lure.price + ' 金 / 耐用 ' + lure.dur + ' 次 · ' + evOf('lure') + '</div></div>' +
        '<span class="spw">' + buyBtn('lure', 1, '买 1', !lureHave && state.coins >= lure.price) +
        '</span>' +
      '</div>' +
      '<div class="store-row' + (lure2Open ? '' : ' locked') + '">' +
        '<span class="se">🪝</span>' +
        '<div><div class="sn">高级假饵' +
          (lure2Have ? ' <b class="own">剩 ' + lure2Have + ' 次</b>' : '') +
          (lure2Open ? '' : ' <b class="lock">' + lure2LockTxt + '</b>') + '</div>' +
        '<div class="sv">' + (lure2Open
          ? Math.round(G.BALANCE.hook.lure2 * 100) + '% 咬钩 · 好鱼 ×' + G.BALANCE.bait.lureGood +
            ' · ' + lure2.price + ' 金 / ' + lure2.dur + ' 次 · ' + evOf('lure2')
          : lure2LockTxt + ' 解锁') + '</div></div>' +
        '<span class="spw">' + buyBtn('lure2', 1, '买 1',
          lure2Open && !lure2Have && state.coins >= lure2.price) + '</span>' +
      '</div>' +
      '<div class="store-row' + (premOpen ? '' : ' locked') + '">' +
        '<span class="se">🍤</span>' +
        '<div><div class="sn">特级饵料 <b class="own">现有 ' + (state.bait.premium || 0) + '</b>' +
          (premOpen ? '' : ' <b class="lock">' + premLockTxt + '</b>') + '</div>' +
        '<div class="sv">' + (premOpen
          ? Math.round(G.BALANCE.hook.premium * 100) + '% 咬钩 · 好鱼 ×' + G.BALANCE.bait.premiumGood +
            ' · 品质取两次 · ' + G.BAIT.premium.price + ' 金/份 · ' + evOf('premium')
          : premLockTxt + ' 解锁') + '</div></div>' +
        '<span class="spw">' + buyBtn('premium', 1, '买 1', premOpen) +
          buyBtn('premium', 5, '买 5', premOpen) + '</span>' +
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
      '<div class="store-sub" style="margin-top:10px">🕸️ 渔网 · 放到河边每天自动抓鱼</div>' +
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
      '<div class="store-sub" style="margin-top:10px">🧑‍🌾 雇个渔夫 · 替你重布渔网 + 每天自动钓鱼</div>' +
      '<div class="store-row' + (G.fisherUnlocked(state) ? '' : ' locked') + '">' +
        '<span class="se">🧑‍🌾</span>' +
        '<div><div class="sn">渔夫 ' +
          (state.fisher ? '<b class="own">Lv' + G.fisherLv(state) + '</b>' : '<b class="own">待雇</b>') +
          (G.fisherUnlocked(state) ? '' : ' <b class="lock">需钓鱼 Lv' + G.BALANCE.gate.fisher + '</b>') +
          '</div>' +
        '<div class="sv">' + (G.fisherUnlocked(state)
          ? (state.fisher
            ? '每天 ' + G.fisherCasts(state) + ' 杆（耗你的面团饵）+ 重布全部渔网 · 工资 ' +
              G.fisherWage(state) + ' 金/天 · 经验 ' +
              (G.fisherLv(state) >= G.BALANCE.fisher.max ? '已满级'
                : ((state.fisher.xp || 0) + '/' + G.fisherNeed(state)))
            : '雇佣费 ' + G.BALANCE.fisher.hire + ' 金 · Lv1 每天 ' +
              (G.BALANCE.fisher.baseCasts + 1) + ' 杆，工资 ' + G.BALANCE.fisher.wageBase + ' 金/天')
          : '钓鱼等级到 Lv' + G.BALANCE.gate.fisher + ' 才招得到人') + '</div></div>' +
        (state.fisher
          ? (G.fisherLv(state) >= G.BALANCE.fisher.max
            ? '<button class="btn mini" data-firefisher>辞退</button>'
            : '<button class="btn mini" data-fisherup' +
              (state.coins < G.fisherUpCost(state) ? ' disabled' : '') + '>升 Lv' +
              (G.fisherLv(state) + 1) + '<br><small>' + G.fisherUpCost(state) + ' 金</small></button>' +
              '<button class="btn mini" data-firefisher>辞退</button>')
          : '<button class="btn mini" data-hirefisher' +
            ((!G.fisherUnlocked(state) || state.coins < G.BALANCE.fisher.hire) ? ' disabled' : '') +
            '>雇佣</button>') +
      '</div>' +
      '<div class="shop-tip" style="margin-top:8px">渔夫每天替你<b>重布全部渔网</b>（不花你的体力），' +
        '再自动甩 <b>2 + 等级</b> 杆（耗你的面团饵，钓上来的鱼照常进仓库）。<br>' +
        '他自己会练级：每钓到 1 条 +1 经验，够 <b>' + G.BALANCE.fisher.needBase + ' + ' +
        G.BALANCE.fisher.needStep + '×(等级−1)</b> 就升一级；也能直接花钱升' +
        '（' + G.BALANCE.fisher.upCost + ' × 等级 金）。等级影响<b>咬钩、好鱼、每天杆数和工资</b>。<br>' +
        '发不出工资他会罢工，冬天休息也没工资。</div>';
    openModal('🛒 渔具店', body, '<button class="btn" data-close>关闭</button>');
  }

  /* 农场指南分页：种植 / 钓鱼 / 买卖 / 经营 */

  /* ===== 06-help.js ===== */
/* 我的小农场 · 界面层 / 06-help.js
 * 农场指南（分页正文 + 弹窗）
 * 由 build-ui.cjs 按文件名顺序拼进 ui.js（共享同一个 IIFE 作用域），不要单独加载。
 */

  let helpPage = 0;
  /* 自动播种器面板：正在给哪一台选种子 */
  let seedMach = 1;

  /* 指南排版小工具：一组要点 → 无序列表（每条一行，比 <br> 连串好扫读） */
  function guideList(items) {
    return '<ul class="guide-list">' + items.map(function (x) {
      return '<li>' + x + '</li>';
    }).join('') + '</ul>';
  }
  /* 带小标题的一小节（页内二级标题，比整段粗体更醒目） */
  function guideSub(title, body) {
    return '<div class="guide-sub"><div class="guide-sub-t">' + title + '</div>' + body + '</div>';
  }

  function helpPages() {
    const cropRows = G.CROP_LIST.map(function (c) {
      return '<tr><td>' + c.emoji + ' ' + c.name + '</td><td>' + c.seed + ' 金</td><td>' + c.days + ' 天</td>' +
        '<td>' + (c.multi ? '首次 ' + c.firstQty + ' 个' : (c.big ? '1 个（固定）' : c.base + ' ±1')) + '</td>' +
        '<td>' + c.price + ' 金</td><td>' + G.seasonText(c.id) + '</td><td>Lv' + (c.lv || 1) + '</td></tr>';
    }).join('');

    const P1 =
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
        guideList([
          '生长按<b>浇水天数</b>推进；成熟当天不能收，<b>次日</b>才能收。',
          '普通作物产量 = 基础 ±1 − 漏浇 + 施肥 + 等级加成（每 ' + G.BALANCE.level.yieldEvery +
            ' 级 +1，最低 1）。',
          '<b>南瓜 / 西瓜固定 1 个</b>，不吃等级和产量肥料，只有<b>肥料品质加成</b>（见「肥料」）。',
          '高级种子要<b>种田等级</b>解锁：' +
            G.CROP_LIST.filter(function (c) { return (c.lv || 1) > 1; })
              .map(function (c) { return c.name + ' Lv' + c.lv; }).join('、') + '。'
        ]) +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>🏞️ 土地与扩张</h4>' +
        '<p>从第 ' + G.BALANCE.expand.from + ' 块起，每多开一块地的价格是 <b>' + G.BALANCE.expand.base +
        ' + ' + G.BALANCE.expand.step + '×(已有块数−' + G.BALANCE.expand.from + ')</b>，<b>一路线性涨到 ' +
        G.BALANCE.expand.steepFrom + ' 块</b>；<b>' + G.BALANCE.expand.steepFrom +
        ' 块以后每块 ×' + G.BALANCE.expand.steepMul + '</b> 陡涨（' +
        G.expandCost({ plots: new Array(G.BALANCE.expand.steepFrom - 1) }) + ' → ' +
        G.expandCost({ plots: new Array(G.BALANCE.expand.steepFrom) }) + ' → ' +
        G.expandCost({ plots: new Array(G.BALANCE.expand.steepFrom + 1) }) + ' 金）。<br>' +
        '所以主力田块先铺到 <b>' + G.BALANCE.expand.steepFrom + ' 块</b>，再往上就是纯烧钱；' +
        '土地最多 <b>' + G.BALANCE.expand.max + ' 块</b>。' +
        '土地维护费也按块数分档（' + G.BALANCE.upkeep.free + ' 块内免费，之后逐档变贵）。</p>' +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>🍂 季节</h4>' +
        '<p>每 <b>' + G.BALANCE.seasonDays + ' 天</b>换一季，四季循环：' +
        G.SEASONS.map(function (s, i) {
          return '<b>' + s + '（' + (i * G.BALANCE.seasonDays + 1) + '–' +
            ((i + 1) * G.BALANCE.seasonDays) + '）</b>';
        }).join(' · ') + '。</p>' +
        guideSub('🌾 种子怎么买', guideList([
          '当季的种子按<b>原价</b>卖。',
          '<b>反季的种子也卖，但贵 ×' + G.BALANCE.seed.offSeasonMul + '</b>：第一茬多花 ' +
            G.BALANCE.seed.offSeasonDays + ' 天（南瓜 / 西瓜直接翻倍），每茬少结 ' +
            G.BALANCE.seed.offSeasonYield + ' 个。',
          '好处是反季收成的卖价 <b>×' + G.BALANCE.market.offSeason + '</b>，所以囤到反季卖更划算。',
          '已经种下的作物不受换季影响，该熟还会熟。'
        ])) +
        '<div class="guide-warn">❄️ <b>冬天土地封冻、河面结冰</b>：不能播种、不能钓鱼、不能挖蚯蚓（渔网也收不了），' +
          '种子店歇业，只能打工、采集、卖库存、交委托。</div>' +
        '<table class="rule-table"><tr><th>季节</th><th>特点</th></tr>' +
        '<tr><td>🌱 春</td><td><b>多雨</b>（雨天 ' + G.SEASON_WEATHER[0].rain + '%，自动浇水）</td></tr>' +
        '<tr><td>☀️ 夏</td><td><b>多晴</b>（晴天 ' + G.SEASON_WEATHER[1].sunny + '%）· <b>浇水要 ' + G.BALANCE.energy.waterSummer +
          ' 体力</b>（其他季节 ' + G.BALANCE.energy.water + ' 点）</td></tr>' +
        '<tr><td>🍂 秋</td><td><b>丰收</b>：普通作物每次收获 <b>+1 个</b>（大作物不算）</td></tr>' +
        '<tr><td>❄️ 冬</td><td>会<b>下雪</b>（' + G.SEASON_WEATHER[3].snow + '%，化雪等于自动浇水）· 不能种也不能钓</td></tr>' +
        '</table>' +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>🍑 果园</h4>' +
        '<p><b>种田 Lv' + G.BALANCE.orchard.unlockLv + ' + ' + G.BALANCE.orchard.unlockCost +
        ' 金</b>开垦，先给 <b>' + G.BALANCE.orchard.free + ' 个树坑</b>，第 ' +
        (G.BALANCE.orchard.free + 1) + '~' + G.BALANCE.orchard.slots + ' 个要花钱开（' +
        G.BALANCE.orchard.slotCosts.join(' / ') + ' 金）。</p>' +
        guideSub('🌱 育苗', guideList([
          '<b>果树种子</b>：浇水 ' + G.BALANCE.orchard.grow.seed.water + ' 天 + 生长 ' +
            G.BALANCE.orchard.grow.seed.days + ' 天才成树。',
          '<b>树苗</b>：浇水 ' + G.BALANCE.orchard.grow.sapling.water + ' 天 + 生长 ' +
            G.BALANCE.orchard.grow.sapling.days + ' 天才成树。',
          '两项都满足才成树；浇够就不用再浇。每棵可单独浇水（' + G.BALANCE.orchard.waterEnergy + ' 体力 / 棵）。'
        ])) +
        guideSub('🍎 结果', guideList([
          '成树<b>只在自己的季节</b>每天随机挂 <b>' + G.BALANCE.orchard.fruitMin + '~' +
            G.BALANCE.orchard.fruitMax + ' 个</b>；每棵最多挂 <b>' + G.BALANCE.orchard.ripeCap +
            ' 个</b>，挂满就不再长，记得去收（收获 ' + G.BALANCE.orchard.harvestEnergy + ' 体力 / 棵）。',
          '水果固定<b>标准品质</b>，进仓库后和作物一样吃<b>市价</b>（当季 ×1、囤到反季 ×' +
            G.BALANCE.market.offSeason + '）。',
          '可以卖给农产品店、放进收购箱；市场「行情 / 分析」里有单独的「🍑 水果」一栏。'
        ])) +
        '<table class="rule-table"><tr><th>果树</th><th>结果季</th><th>果实</th><th>果价</th><th>种子</th><th>树苗</th></tr>' +
        G.TREE_LIST.map(function (t) {
          return '<tr><td>' + t.emoji + ' ' + t.name + '</td><td>' + G.SEASONS[t.season] + '</td><td>' +
            t.fruit + '</td><td>' + t.price + ' 金</td><td>' + t.seed + ' 金</td><td>' + t.sapling + ' 金</td></tr>';
        }).join('') + '</table>' +
        guideSub('💡 怎么算', guideList([
          '一棵成树当季满产约 ' +
            Math.round((G.BALANCE.orchard.fruitMin + G.BALANCE.orchard.fruitMax) / 2 * G.BALANCE.seasonDays) +
            ' 个（按每天 ' + ((G.BALANCE.orchard.fruitMin + G.BALANCE.orchard.fruitMax) / 2) + ' 个估），' +
            '按果价折算约 ' +
            Math.round((G.BALANCE.orchard.fruitMin + G.BALANCE.orchard.fruitMax) / 2 * G.BALANCE.seasonDays *
              G.TREE_LIST[0].price) + ' 金/季（桃）。',
          '<b>种子</b>要养一整季才成树，<b>树苗</b>下季就能结果；买哪个看现金和耐心。'
        ])) +
        guideSub('🌳 成树等级', guideList([
          '成树之后，每收获一次攒 1 点经验；升到下一级要 2 / 4 / 6 / 8 次（<b>满级 Lv' +
            G.BALANCE.orchard.treeLvMax + '</b>）。',
          '每高一级，当天「多挂 1 个果」的概率 <b>+10%</b>（满级 +' +
            Math.round((G.BALANCE.orchard.treeLvMax - 1) * G.BALANCE.orchard.treeLvYield * 100) +
            '%），挂果上限不变。',
          '果园卡片上直接显示等级与经验。'
        ])) +
      '</div>';

    const fishRows = G.FISH.filter(function (f) { return !f.trash && !f.chest; }).map(function (f) {
      return '<tr><td>' + f.emoji + ' ' + f.name + '</td><td>' + G.fishSeasonText(f.id) +
        '</td><td>' + f.base + ' 金</td></tr>';
    }).join('');

    const wildRows = G.WILD_LIST.map(function (w) {
      return '<tr><td>' + w.emoji + ' ' + w.name + '</td><td>' + G.seasonText(w.id) +
        '</td><td>' + w.price + ' 金</td><td>' + w.desc + '</td></tr>';
    }).join('');

    const P2 =
      '<div class="rule-sec">' +
        '<h4>🎣 钓鱼</h4>' +
        '<p>甩一杆 = <b>' + G.BALANCE.energy.fish + ' 体力 + 1 份饵</b>；<b>冬天河面结冰，钓不了</b>。' +
        '流程是<b>先判咬钩、再抽鱼种</b>，所以用什么饵直接决定上鱼率和好鱼率。</p>' +
        guideSub('🎯 咬钩', guideList([
          '基础值：面团饵 <b>' + Math.round(G.BALANCE.hook.dough * 100) + '%</b> · 蚯蚓 <b>' +
            Math.round(G.BALANCE.hook.worm * 100) + '%</b> · 假饵 <b>' + Math.round(G.BALANCE.hook.lure * 100) + '%</b>。',
          '天气修正：' + G.WEATHER_LIST.filter(function (w) { return w.hookMod && w.id !== 'snow'; })
            .map(function (w) {
              return w.name + (w.hookMod > 0 ? ' <b>+' : ' <b>−') + Math.abs(Math.round(w.hookMod * 100)) + '%</b>';
            }).join(' · ') + '，阴天不增不减。',
          '<b>咬钩没有上限</b>：满 100% 必中，超出的概率再判一次双咬钩（例如 107% = 必中 1 条 + 7% 再来 1 条）。',
          '河边左栏的小胶囊实时显示<b>咬钩率 / 好鱼倍率 / 双咬钩 / 每杆净收益</b>（毛收益 − 饵成本）；右栏「小队」管渔网和渔夫。'
        ])) +
        guideSub('🎣 五种饵怎么选', guideList([
          '🍞 <b>面团饵</b>：' + G.BAIT.dough.price + ' 金/份、' + Math.round(G.BALANCE.hook.dough * 100) +
            '% 咬钩、品质正常 —— 便宜大碗的默认选择，渔网和渔夫也只吃它。',
          '🪱 <b>蚯蚓</b>：好鱼 ×' + G.BALANCE.bait.wormGood + '，品质取两次较好；靠挖蚯蚓获得（冬天封冻，挖不了）。',
          '🎣 <b>假饵</b>：杂物 ×' + G.BALANCE.bait.lureTrash + '、好鱼 ×' + G.BALANCE.bait.lureGood +
            '、品质取两次较好，但咬钩只有 ' + Math.round(G.BALANCE.hook.lure * 100) + '%，耐用 ' + G.BALANCE.lure.dur + ' 次。',
          '🪝 <b>高级假饵</b>（钓鱼 Lv' + G.BALANCE.gate.lure2 + ' + 交易 Lv' + G.BALANCE.gate.lure2Trade + '）：' +
            G.BALANCE.lure2.price + ' 金 / 耐用 ' + G.BALANCE.lure2.dur + ' 次；咬钩率同面团饵（' +
            Math.round(G.BALANCE.hook.lure2 * 100) + '%）、好鱼率同假饵，是后期最省心的饵。',
          '🍤 <b>特级饵料</b>（钓鱼 Lv' + G.BALANCE.gate.premium + ' + 交易 Lv' + G.BALANCE.gate.premiumTrade + '）：' +
            G.BAIT.premium.price + ' 金 / 份，' + Math.round(G.BALANCE.hook.premium * 100) + '% 咬钩、好鱼 ×' +
            G.BALANCE.bait.premiumGood + '、品质取两次较好，冲好鱼用。'
        ])) +
        guideSub('📅 鱼汛', '<p>每种鱼只在特定季节成群：汛期上钩权重 <b>×' + G.BALANCE.fishSeason.in +
          '</b>，非汛期 <b>×' + G.BALANCE.fishSeason.off + '</b>；非汛期照样能钓到，只是少。</p>' +
          '<table class="rule-table"><tr><th>鱼</th><th>汛期</th><th>基础价</th></tr>' + fishRows + '</table>') +
        guideSub('🕸️ 渔网', guideList([
          '<b>' + G.NET_COST + ' 金/张，不缴维护费</b>；钓鱼 Lv' + G.BALANCE.gate.net + ' 解锁，上限 = ' +
            G.BALANCE.gate.netBase + ' + 钓鱼等级（最多 ' + G.NET_MAX + ' 张）。',
          '晚上耗 1 份面团饵，<b>' + Math.round(G.NET_CHANCE * 100) + '%</b> 网到 1 条标准及以下的普通鱼，<b>不出杂物和宝箱</b>。',
          '网到鱼要下水取，<b>这张网花 ' + G.BALANCE.netReset.energy + ' 体力重新布置</b>；没布置的网当晚不出货。'
        ])) +
        guideSub('🧑‍🌾 渔夫', guideList([
          '钓鱼 Lv' + G.BALANCE.gate.fisher + ' 解锁，' + G.BALANCE.fisher.hire + ' 金雇一个。',
          '每天工资 <b>' + G.BALANCE.fisher.wageBase + ' + ' + G.BALANCE.fisher.wageStep + '×(等级−1)</b> 金；' +
            '他替你<b>重布全部渔网</b>（不花你的体力），再自动甩 <b>' + G.BALANCE.fisher.baseCasts +
            ' + 等级</b> 杆（耗你的面团饵，不给经验）。',
          '他自己练级：每钓到 1 条 +1 经验，够 <b>' + G.BALANCE.fisher.needBase + ' + ' + G.BALANCE.fisher.needStep +
            '×(等级−1)</b> 升一级；也能花 ' + G.BALANCE.fisher.upCost + ' × 等级 金直接升（满级 ' + G.BALANCE.fisher.max + '）。',
          '等级影响<b>咬钩、好鱼、每天杆数和工资</b>；发不出工资就罢工，冬天他也休息。'
        ])) +
        guideSub('🎁 渔获去哪', guideList([
          '🐟 <b>鱼</b>：水产店卖，或放进收购箱。',
          '🗑️ <b>杂物 / 宝箱</b>：水产店不收，去百货店回收或开箱。',
          '🎁 宝箱按钓鱼等级掉：木制（无门槛）、铁制 Lv' + G.BALANCE.chest.ironLv + '、黄金 Lv' +
            G.BALANCE.chest.goldLv + '。'
        ])) +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>🌿 采集</h4>' +
        '<p>' + G.BALANCE.forage.energy + ' 体力去后山转一圈，每个季节的野货都不一样：</p>' +
        '<table class="rule-table"><tr><th>野货</th><th>季节</th><th>基础价</th><th>备注</th></tr>' + wildRows + '</table>' +
        guideList([
          '一次保底 1 件，<b>' + Math.round(G.BALANCE.forage.qty2 * 100) + '% 再来 1 件</b>、<b>' +
            Math.round(G.BALANCE.forage.qty3 * 100) + '% 再多 1 件</b>（最多 3 件）；' +
            Math.round(G.BALANCE.forage.seedChance * 100) + '% 顺手摘到一颗当季种子（<b>和天气无关</b>）。',
          '野货直接进仓库，按品质定价、一样吃<b>市价</b>；可以卖农产品店或放收购箱。',
          '<b>冬天也能采</b>，是封冻期唯一的野外收入。',
          '采到的野货会记进 📖 图鉴（首次 / 次数 / 最好品质 / 累计价值），顶栏「🌿 野货」看进度。',
          '<b>采集等级</b>：每次 +' + G.BALANCE.forage.xp + ' 经验（一次采到 3 件再 +1），Lv' + G.BALANCE.forage.qualityAt +
            ' / Lv' + (G.BALANCE.forage.qualityAt * 2) + ' 各多取一次品质，满级 Lv' + G.BALANCE.level.max + ' 后只花 ' +
            (G.BALANCE.forage.energy - 1) + ' 体力。'
        ]) +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>🐟 水产店</h4>' +
        guideList([
          '渔获直接卖，按原价的 <b>' + Math.round(G.BALANCE.shop.sellRate * 100) + '%</b> 收，再乘<b>市价</b>；<b>不收杂物和宝箱</b>。',
          '<b>同种鱼的不同品质合并成一行</b>，显示品质构成和均价；卖出时<b>先卖品质差的</b>。',
          '<b>鱼也吃市价</b>：稀缺 ×' + G.BALANCE.market.supplyMax + ' 起，每卖 1 条 −' + G.BALANCE.market.fishStep +
            '，最低 ×' + G.BALANCE.market.supplyMin + '，隔天回落 ' + Math.round((1 - G.BALANCE.market.decay) * 100) + '%；' +
            '汛期 ×1、<b>非汛期 ×' + G.BALANCE.market.offSeason + '</b>。',
          '每天<b>进一批水产</b>（一般品质），数量随机、<b>睡觉后补货</b>；' +
            '买价 = 基础价 × ' + G.BALANCE.shop.priceMul + ' <b>再乘鱼市价</b>，<b>越买越贵</b>，买来的鱼<b>不能交委托</b>。',
          '河豚 <b>D' + G.FISH_UNLOCK.puffer + '</b> 起、锦鲤 <b>D' + G.FISH_UNLOCK.koi + '</b> 起才进货。'
        ]) +
      '</div>';

    const P3 =
      '<div class="rule-sec">' +
        '<h4>🧺 农产品店</h4>' +
        '<p>作物在这里直接卖，按原价的 <b>' + Math.round(G.BALANCE.shop.sellRate * 100) +
        '%</b> 收，再乘<b>市价系数</b>；仓库不再直接出售任何东西。</p>' +
        guideSub('💹 市价怎么算', guideList([
          '<b>供需</b>：刚开张 ×' + G.BALANCE.market.supplyMax + '（稀缺），每卖 1 件 −' + G.BALANCE.market.cropStep +
            '，最低 ×' + G.BALANCE.market.supplyMin + '（过剩）；隔天回落 ' +
            Math.round((1 - G.BALANCE.market.decay) * 100) + '%。',
          '<b>季节</b>：<b>反季 ×' + G.BALANCE.market.offSeason + '</b>（过季稀缺、卖得贵），当季 ×1.00。',
          '<b>水果</b>：桃 / 芒果 / 苹果按<b>自己那一季</b>算当季，囤到别的季节同样 ×' + G.BALANCE.market.offSeason +
            '；水果有独立的供需与价格历史。',
          '两相乘就是最终系数，界面直接写「市价 ×' +
            (G.BALANCE.market.supplyMax * G.BALANCE.market.offSeason).toFixed(2) + ' · 反季 · 稀缺」。',
          '<b>批量按批次中点定价</b>：一次卖 30 件和分三次卖 10 件到手一样多 —— 想卖高价靠<b>换着品种卖 / 囤到反季</b>，不是靠攒一大票一次砸。'
        ])) +
        '<div class="guide-warn">💡 同一个品种别连着几天猛卖；囤到反季再卖，价格会翻上去。</div>' +
        guideSub('🛒 从商店买', guideList([
          '买价跟着市价走：缺货 / 反季时买得更贵，而且<b>买货会把销量往回拉</b>（越买越贵）；点面板的 <b>📈 行情</b> 看全部系数。',
          '每天进一批作物（一般品质），买价 = 售价 × ' + G.BALANCE.shop.cropPriceMul +
            ' <b>再乘市价</b>，转手必亏，只在凑委托或应急时买。',
          '南瓜 <b>D' + G.CROP_UNLOCK.pumpkin + '</b> 起、西瓜 <b>D' + G.CROP_UNLOCK.watermelon + '</b> 起才进货。'
        ])) +
        guideSub('🤝 交易等级', '<p>交易等级会把商店的<b>进价</b>往下压：每级 −' +
          (G.BALANCE.trade.buyCut * 100).toFixed(1) + '%，满级 −' + (G.BALANCE.trade.maxCut * 100).toFixed(1) +
          '%。种子 / 饵料 / 肥料 / 茶 / 钥匙 / 水产 / 农产品 / 果树苗都算（设备按标价）；' +
          '钱花得多、卖得勤，等级就涨。</p>') +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>🏘️ 小镇（金币出口）</h4>' +
        '<p>商店面板右上角的 <b>🏘️ 小镇</b> 可以把钱捐给镇子，换<b>永久加成</b>（三档可叠加）：</p>' +
        '<table class="rule-table"><tr><th>项目</th><th>捐满</th><th>永久加成</th></tr>' +
        G.BALANCE.town.map(function (t) {
          return '<tr><td>' + t.emoji + ' <b>' + t.name + '</b></td><td>' + t.need + ' 金</td><td>' + t.desc + '</td></tr>';
        }).join('') + '</table>' +
        '<p>捐出去不退，但加成是永久的；后期田里赚的钱花不完，就往这儿扔。</p>' +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>📦 收购箱</h4>' +
        guideList([
          '仓库每行的 <b>全部</b> 一键全放（📦 可按数量放）；放错了可以「全部取出」。',
          '<b>按入箱那一刻的市价锁价</b>，睡觉结算时只跟随<b>出箱当天的季节</b>（换季会变），并扣 <b>' +
            Math.round(G.BALANCE.market.boxFee * 100) + '% 手续费</b>。',
          '直接卖店只有 ' + Math.round(G.BALANCE.shop.sellRate * 100) +
            '%，所以<b>急用钱走商店，不急就进收购箱</b>。',
          '入箱不压价：拆几批放和一次放单价一样。',
          '箱子里的货也计入税金基数，不能用来避税。',
          '宝箱也能进箱子换钱，但<b>开箱通常更划算</b>。'
        ]) +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>⭐ 品质（作物与鱼共用）</h4>' +
        '<table class="rule-table"><tr><th>品质</th><th>倍率</th><th>概率</th></tr>' +
        G.QUALITY.map(function (q) {
          return '<tr><td>' + q.emoji + ' ' + q.name + '</td><td>×' + q.mul + '</td><td>' + q.w + '%</td></tr>';
        }).join('') + '</table>' +
        guideList([
          '单价 = 基础价 × 品质倍率。',
          '施肥后品质判定取 2 次最好（普通肥和特效肥相同）。'
        ]) +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>🧪 肥料</h4>' +
        '<table class="rule-table"><tr><th>肥料</th><th>买价</th><th>半价回收</th><th>普通作物</th><th>品质</th></tr>' +
        ['normal', 'special'].map(function (k) {
          const f = G.FERT[k];
          return '<tr><td>' + f.emoji + ' ' + f.name + '</td><td>' + f.cost + ' 金</td><td>' +
            G.fertSellPrice(k) + ' 金</td><td>+' + f.add + ' 产量</td><td>取 2 次最好</td></tr>';
        }).join('') + '</table>' +
        guideList([
          '在<b>种子店</b>购买，买回来进仓库，施肥时消耗。',
          '多收作物（黄瓜 / 草莓）只提质不加量。',
          '<b>南瓜 / 西瓜只吃品质加成</b>：数量永远是 1 个，但施肥后品质档位明显更高 —— 这是它们唯一的施肥收益。',
          '特效肥要<b>种田 Lv' + G.FERT.special.lv + '</b> 才解锁。'
        ]) +
      '</div>';

    const P4 =
      '<div class="rule-sec">' +
        '<h4>💰 经济</h4>' +
        guideSub('🌙 睡觉与体力', guideList([
          '睡觉推进 1 天，扣伙食费 <b>' + G.mealFee(state) + ' 金</b>，体力回满；没钱只回上限的 ' +
            Math.round(G.BALANCE.meal.noMoneyPct * 100) + '%（至少 ' + G.BALANCE.meal.noMoneyMin +
            ' 点），不会扣掉已有的体力。',
          '体力上限开局 <b>' + G.BALANCE.start.maxEnergy + '</b>，强化 +' + G.BALANCE.upgrade.step + '/级（成本每级 ×' +
            G.BALANCE.upgrade.costMul + '）；当前强化 ' + G.upgradeCost(state) + ' 金、扩张土地 ' + G.expandCost(state) + ' 金。',
          '睡醒弹出<b>每日总结</b>：金币收支、农场自动操作、渔获、委托和明日提示。',
          '打零工：<b>每天只能打一次</b>，全天 ×' + G.BALANCE.work.full + ' 金/体力、半天 ×' + G.BALANCE.work.half +
            '，不够半天就把剩下的体力用光。',
          '挖蚯蚓 ' + G.BALANCE.dig.energy + ' 体力一次（满级 ' + (G.BALANCE.dig.energy - 1) + ' 体力）：基础 ' +
            G.BALANCE.dig.min + '–' + G.BALANCE.dig.max + ' 条，Lv' + G.BALANCE.dig.yieldAt + ' / Lv' +
            (G.BALANCE.dig.yieldAt * 2) + ' 各 +1 条，晴天 −1、阴雨 +1，最多 ' +
            (G.BALANCE.dig.cap + Math.floor(G.BALANCE.level.max / G.BALANCE.dig.yieldAt)) + ' 条；<b>冬天封冻，挖不了</b>。'
        ])) +
        guideSub('🔧 设备（都在右栏「设备」面板）', guideList([
          '🚿 洒水器 ' + G.SPRINKLER_COST + ' 金/个（种田 Lv' + G.BALANCE.gate.sprinkler + '）：每个每天自动浇 <b>' +
            G.BALANCE.device.sprinklerPerDay + ' 块地</b>，不耗体力；每块地一个就够，雨天自动浇、不叠加。',
          '🤖 自动收获器 ' + G.HARVESTER_COST + ' 金（种田 Lv' + G.BALANCE.gate.harvester +
            '）：睡觉时自动收走成熟作物，不耗体力。',
          '🌱 自动播种器 ' + G.SEEDER_COST + ' 金/台（种田 Lv' + G.BALANCE.gate.seeder + '）：<b>一台只管自己的 ' +
            G.SEEDER_PLOTS + ' 块地</b>（第 1 台 1–' + G.SEEDER_PLOTS + ' 块、第 2 台 ' + (G.SEEDER_PLOTS + 1) + '–' +
            (G.SEEDER_PLOTS * 2) + ' 块…），那块地<b>收完立刻补种</b>，睡觉时再把空着的补上；用你选的种子、不耗体力。'
        ])) +
        guideSub('🧾 税与维护费', guideList([
          '💰 <b>税</b>：每 ' + G.BALANCE.tax.every + ' 天按（金币 + 仓库价值 + 收购箱估值）<b>累进</b>收一次 —— ' +
            G.BALANCE.tax.bands.map(function (b, i) {
              const from = i ? G.BALANCE.tax.bands[i - 1].upTo : 0;
              const rate = Math.round(b.rate * 100) + '%';
              if (b.upTo == null) return from + ' 以上收 ' + rate;
              return (i ? from + '~' + b.upTo : '前 ' + b.upTo) + ' 收 ' + rate;
            }).join('、') + '，最低 ' + G.BALANCE.tax.min + ' 金（当前约 ' + G.taxDue(state) + ' 金）。',
          '🧾 <b>维护费</b>：每 7 天一次，土地 ' + G.plotUpkeep(state.plots.length) + ' 金（' + G.BALANCE.upkeep.free +
            ' 块以内免费，第 ' + (G.BALANCE.upkeep.free + 1) + '–' + G.BALANCE.upkeep.midAt + ' 块 ' +
            G.BALANCE.upkeep.plotPerWeek + ' 金/块/周、第 ' + (G.BALANCE.upkeep.midAt + 1) + '–' + G.BALANCE.upkeep.highAt +
            ' 块 ' + G.BALANCE.upkeep.plotMid + ' 金/块/周、' + (G.BALANCE.upkeep.highAt + 1) + ' 块以上 ' +
            G.BALANCE.upkeep.plotHigh + ' 金/块/周） + 设备 ' + G.deviceUpkeep(state) + ' 金（洒水器 ' +
            G.BALANCE.upkeep.sprinkle + '、自动收获器 ' + G.BALANCE.upkeep.harvester + '、自动播种器 ' +
            G.BALANCE.upkeep.seeder + '/台，<b>渔网不收维护费</b>）。'
        ])) +
        guideSub('🛒 买卖渠道', guideList([
          '种子 / 肥料在<b>种子店</b>买卖（半价回收），肥料也只能在种子店卖。',
          '蚯蚓只能在<b>渔具店</b>卖（' + G.WORM_VALUE + ' 金/条）。'
        ])) +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>📋 委托</h4>' +
        '<p>每天 2 个作物单 + 1 个鱼单，<b>每天自动换新</b>，还能<b>手动刷新一次</b>。</p>' +
        guideSub('💰 报酬怎么算', guideList([
          '报酬 = 数量 × 基础价 × ' + G.BALANCE.order.mult + ' × 市价（市价封顶 ×' + G.BALANCE.market.orderCap + '）。',
          '约是商店直售（' + G.BALANCE.shop.sellRate + ' × 市价）的 ' +
            (G.BALANCE.order.mult / G.BALANCE.shop.sellRate).toFixed(1) + ' 倍；没交不罚。',
          '季节越往后要的量越多；贵的作物一次 2–3 个（入冬可到 6–8 个），单张报酬<b>最低 40 金</b>。'
        ])) +
        guideSub('🎲 出什么单', guideList([
          '委托池按天数逐档解锁（D1 / D3 / D5 / D7 / D9 / D12 / D15）；<b>最多比种田等级高一档</b>，' +
            '刚提前的那档可能还买不到种子，交不上不罚。',
          '<b>平时点当季作物</b>；非冬季有 <b>' + Math.round(G.BALANCE.order.offSeasonChance * 100) +
            '%</b> 概率点名一批<b>反季作物</b>（价更高，但得囤着或有温室命）。',
          '<b>每天第一张固定是「当季买得到的最贵作物」</b>，剩下随机。',
          '鱼单单价随季节上涨（' + G.BALANCE.order.fishBase + ' → ' +
            (G.BALANCE.order.fishBase + 3 * G.BALANCE.order.fishStep) + ' 金/条）；长期鱼单 ' +
            G.BALANCE.order.longFishBase + ' → ' + (G.BALANCE.order.longFishBase + 3 * G.BALANCE.order.fishStep) + ' 金/条。'
        ])) +
        guideSub('📜 长期订单', guideList([
          '5 天期限、数量大、<b>2 倍报酬</b>（同样吃市价溢价）；交付或过期后隔天睡醒换下一张。',
          '点单<b>按价值加权</b>：贵的作物更容易被点中，不会总是一单萝卜。',
          '<b>提前交货有额外奖励</b>：每提前 1 天 +10%，最多 +50%。'
        ])) +
        guideList([
          '<b>市价溢价</b>：指定作物的单子按<b>该作物当前市价</b>结算（反季 / 稀缺时合同价更高），面板会写「含市价 ×1.30」；' +
            '「任意鱼」不指定品种，价格固定。',
          '<b>普通单不挑品质</b>：交的时候先扣劣质，好的留着卖钱；<b>长期单只收普通及以上</b>，劣质交不进去。',
          '交鱼先交最便宜的（普通单什么品质都收）；杂物、宝箱不算数。'
        ]) +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>⭐ 等级</h4>' +
        '<p>五条线各自独立升级，满级 Lv' + G.BALANCE.level.max + '，每级所需 ' + G.BALANCE.level.xpBase + ' + ' +
        G.BALANCE.level.xpStep + '×(级−1)。</p>' +
        guideList([
          '<b>种田</b>：收获 +' + G.BALANCE.level.farmXpHarvest + ' 经验；每 ' + G.BALANCE.level.yieldEvery +
            ' 级 +1 产量（Lv' + G.BALANCE.level.yieldEvery + ' / Lv' + (G.BALANCE.level.yieldEvery * 2) +
            '，大作物不吃）。',
          '<b>钓鱼</b>：每 ' + G.BALANCE.level.fishXpEvery + ' 杆 1 点（完美品质 +' + G.BALANCE.level.fishXpPerfect +
            '）；每级咬钩 +' + (G.BALANCE.level.hookPerLv * 100).toFixed(1) + '%（≤+' +
            Math.round(G.BALANCE.level.hookMax * 100) + '%）、好鱼 +' + (G.BALANCE.level.goodPerLv * 100).toFixed(1) +
            '%（≤+' + Math.round(G.BALANCE.level.goodMax * 100) + '%）。',
          '<b>挖蚯蚓</b>：每次 +' + G.BALANCE.dig.xp + ' 经验；Lv' + G.BALANCE.dig.yieldAt + ' / Lv' +
            (G.BALANCE.dig.yieldAt * 2) + ' 各 +1 条；满级后只要 ' + (G.BALANCE.dig.energy - 1) + ' 体力。',
          '<b>采集</b>：每次 +' + G.BALANCE.forage.xp + ' 经验（采到 3 件 +1）；Lv' + G.BALANCE.forage.qualityAt +
            ' / Lv' + (G.BALANCE.forage.qualityAt * 2) + ' 各多取一次品质；满级后只要 ' + (G.BALANCE.forage.energy - 1) + ' 体力。',
          '<b>交易</b>：买卖成交按金额涨经验（每 ' + G.BALANCE.trade.xpPer + ' 金 1 点），每级把商店进价压低 ' +
            (G.BALANCE.trade.buyCut * 100).toFixed(1) + '%（最多 −' + (G.BALANCE.trade.maxCut * 100).toFixed(1) + '%）。'
        ]) +
        '<div class="guide-warn">🔓 <b>解锁</b> · 种田：洒水器 Lv' + G.BALANCE.gate.sprinkler + '、特效肥 Lv' +
          G.BALANCE.gate.specialFert + '、自动播种器 Lv' + G.BALANCE.gate.seeder + '、自动收获器 Lv' +
          G.BALANCE.gate.harvester + '；钓鱼：渔网 Lv' + G.BALANCE.gate.net + '、渔夫 Lv' + G.BALANCE.gate.fisher +
          '、高级假饵 Lv' + G.BALANCE.gate.lure2 + '；金钥匙另要交易 Lv' + G.BALANCE.gate.goldKeyTrade + '。</div>' +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>🏬 百货店</h4>' +
        '<p>三块业务：<b>茶叶</b>、<b>钥匙</b>、<b>回收站</b>（杂物与宝箱，水产店不收这些）。</p>' +
        guideList([
          '🍵 <b>下午茶</b>一天一杯，<b>消耗一份茶</b>（不再扣金币，只回体力）：' + G.TEA_LIST.map(function (t) {
            return t.name + ' ' + t.price + ' 金/+' + t.energy;
          }).join(' · ') + '；D' + G.TEA_LIST.map(function (t) { return t.day; }).join(' / D') + ' 上架，<b>大杯单价更便宜</b>。',
          '🎁 <b>宝箱</b>：木制（直接开，10–26 金）· 铁制（钓鱼 Lv' + G.BALANCE.chest.ironLv + '，铁钥匙 ' +
            G.KEYS.iron.price + ' 金，一包物资约 80 金）· 黄金（Lv' + G.BALANCE.chest.goldLv + '，金钥匙 ' +
            G.KEYS.gold.price + ' 金，200–320 金 + 一件高级物品）。',
          '🗝️ 钥匙也在这里买，<b>按钓鱼等级解锁</b>（金钥匙另要<b>交易 Lv' + G.BALANCE.gate.goldKeyTrade +
            '</b>）；开箱比回收划算，钥匙不够就先攒着。',
          '回收价 = 原价的 ' + Math.round(G.BALANCE.shop.sellRate * 100) + '%（和商店一致）。'
        ]) +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>🏆 成就</h4>' +
        guideList([
          '共 <b>' + G.ACH.length + '</b> 项，分<b>种田 / 钓鱼 / 设备 / 经营 / 收集</b>五类，顶栏 🏆 里按分类翻页看。',
          '每项给<b>成就点</b>和<b>实质奖励</b>（金币 / 种子 / 肥料 / 饵料）；每 10 点 <b>+1% 售价</b>（最多 +20%，作用于商店与收购箱）。',
          '顶栏 🏆 里能看每项进度。'
        ]) +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>📖 图鉴奖励</h4>' +
        guideList([
          '第一次钓到 / 收到某种鱼或作物就进图鉴；收集到一定数量会<b>自动发奖</b>：鱼类分 ' +
            G.BALANCE.codex.fish.map(function (m) { return m.need; }).join(' / ') + ' 种，作物分 ' +
            G.BALANCE.codex.crops.map(function (m) { return m.need; }).join(' / ') + ' 种，每档只发一次（金币 / 饵料 / 肥料）。',
          '图鉴还会单独记录<b>野货</b>（' + G.WILD_LIST.map(function (w) { return w.name; }).join(' / ') +
            '）、<b>水果</b>和<b>菜品</b>，这几类只做收集展示，不计入上面两档奖励。',
          '顶栏 <b>📖 图鉴</b> 里能看到每档进度和领取状态（奖励区可折叠）；旧存档按现有进度补发。'
        ]) +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>⌨️ 操作</h4>' +
        guideList([
          '成熟地块<b>左键直接收</b>；右键或 Shift + 点击看详情（可铲除、看产量）。',
          '顶栏 <b>📊 状态</b> 看累计数据；<b>⚙️ 设置</b> 里有<b>农场指南</b>（分 5 页）/ 分享名片（导出 PNG）/ 导入导出 / 音效 / 重新开始。',
          '地块 / 饵料 / 账本 / 日志都可以 Tab 聚焦、Enter 或空格操作。',
          '日志和账本都能导出 .md；进度自动存在本浏览器。'
        ]) +
      '</div>';

    const P5 =
      '<div class="rule-sec">' +
        '<h4>🍳 厨房</h4>' +
        '<p><b>种田 Lv' + G.BALANCE.cook.unlockFarm + ' + 钓鱼 Lv' + G.BALANCE.cook.unlockFish +
        '</b> 解锁。用<b>作物 / 渔获 / 野货</b>做菜，菜进仓库、有保质期，可以吃，也可以放进收购箱卖。</p>' +
        guideSub('👨‍🍳 烹饪等级', guideList([
          '每做一道菜 +' + G.BALANCE.cook.xp + ' 经验（Lv' + G.BALANCE.cook.advLv + '+ 的菜再 +' +
            G.BALANCE.cook.advXp + '）；升级要 ' + G.BALANCE.cook.xpBase + ' + ' +
            G.BALANCE.cook.xpStep + '×(级−1)。',
          '<b>每天最多做 ' + G.BALANCE.cook.dailyBase + ' 份</b>，Lv' + G.BALANCE.cook.dailyAt[0] +
            ' +1、Lv' + G.BALANCE.cook.dailyAt[1] + ' 再 +1。',
          '<b>做砸概率</b>：Lv1 ' + Math.round(G.BALANCE.cook.failBase * 100) + '%，每级 −' +
            (G.BALANCE.cook.failStep * 100).toFixed(1) + '%，最低 ' + Math.round(G.BALANCE.cook.failMin * 100) +
            '%；做砸得到一份<b>焦糊料理</b>（没有品质、不能吃，只能进收购箱）。',
          '<b>食材只收' + G.qualityById(G.BALANCE.cook.minQuality).name + '及以上</b>：更低品质的做不了菜；' +
            '成品品质至少比食材最好品质低 ' + G.BALANCE.cook.qualityFloorDrop + ' 档。',
          '<b>品质判定</b>：Lv' + G.BALANCE.cook.qualityAt[0] + ' / Lv' + G.BALANCE.cook.qualityAt[1] +
            ' 各多取一次最好，和施肥一个道理。',
          '<b>体力按食谱算</b>：简单菜 2–3 点，硬菜 4–5 点，食材不够 / 等级不够都做不了。'
        ])) +
        '<table class="rule-table"><tr><th>菜</th><th>条件</th><th>食材</th><th>耗体力</th><th>回复</th><th>保质</th><th>卖价</th></tr>' +
        G.cookRecipes().map(function (r) {
          return '<tr><td>' + r.emoji + ' ' + r.name + '</td><td>' + G.recipeReqText(r) + '</td><td>' +
            G.ingredientText(r) + '</td><td>' + r.energy + '</td><td>+' + r.restore + '</td><td>' +
            r.days + ' 天</td><td>' + (r.fishPriced ? '按鱼价 ×' + r.priceMul : r.price + ' 金') + '</td></tr>';
        }).join('') + '</table>' +
        guideSub('📜 食谱从哪来', guideList([
          '<b>等级解锁</b>：烹饪等级 + 种田 / 钓鱼 / 采集等级，够了自动会做。',
          '<b>百货店买</b>：' + G.shopRecipes().map(function (r) {
            return r.name + '（交易 Lv' + r.trade + '，' + r.shopPrice + ' 金）';
          }).join(' / ') + '，买一次永久学会。',
          '<b>黄金宝箱</b>：' + G.cookRecipes().filter(function (r) { return r.source === 'gold'; })
            .map(function (r) { return r.name; }).join(' / ') + '，金箱 ' +
            Math.round(G.BALANCE.cook.goldRecipeChance * 100) + '%；<b>铁制宝箱</b>：' +
            G.cookRecipes().filter(function (r) { return r.source === 'iron'; })
              .map(function (r) { return r.name; }).join(' / ') + '，铁箱 ' +
            Math.round(G.BALANCE.cook.ironRecipeChance * 100) + '%。'
        ])) +
        guideSub('🍽️ 吃午饭', guideList([
          '<b>每天一次</b>，吃一份菜回复它的体力；菜也吃品质，品质越高回的体力越多。',
          '<b>不能直接在仓库里吃</b>：要打开「吃午饭」再选一份（厨房页不列熟食）。',
          '<b>不吃午饭</b>：当天睡觉的伙食费 <b>×' + G.BALANCE.meal.skipLunchMul +
            '</b>（厨房解锁后生效）。',
          '菜有保质期，越接近到期<b>回复和卖价越低</b>（最低打 ' +
            Math.round(G.BALANCE.cook.freshMin * 100) + '%）；仓库 / 午饭里会显示「还剩 N 天」，≤1 天标红。'
        ])) +
        guideSub('📦 怎么卖', guideList([
          '熟食<b>只能进收购箱</b>（农产品店 / 水产店不收），扣 <b>' +
            Math.round((G.BALANCE.market.boxFee + G.BALANCE.market.boxFoodExtra) * 100) +
            '%</b> 手续费（普通货 5% + 熟食额外 10%），<b>不吃市价</b>。',
          '相同的菜和品质会在仓库里合并成一份，显示总份数与最近到期日。',
          '焦糊料理也能进收购箱，只值 1 金——做砸的代价。'
        ])) +
      '</div>';

    return [
      { emoji: '🌱', name: '种植', desc: '天气 · 作物 · 季节 · 果园', html: P1 },
      { emoji: '🎣', name: '钓鱼', desc: '钓鱼 · 采集 · 水产店', html: P2 },
      { emoji: '🧺', name: '买卖', desc: '农产品店 · 小镇 · 收购箱 · 品质 · 肥料', html: P3 },
      { emoji: '💰', name: '经营', desc: '经济 · 委托 · 等级 · 百货店 · 图鉴 · 成就 · 操作', html: P4 },
      { emoji: '🍳', name: '厨房', desc: '烹饪 · 食谱 · 吃午饭 · 熟食收购', html: P5 }
    ];
  }

  function helpModal() {
    const pages = helpPages();
    if (helpPage >= pages.length) helpPage = 0;
    const p = pages[helpPage];
    const tabs = pages.map(function (pg, i) {
      return '<button class="rule-tab' + (i === helpPage ? ' on' : '') + '" data-helppage="' + i + '">' +
        pg.emoji + ' ' + pg.name + '</button>';
    }).join('');
    const body = '<div class="rule-tabs">' + tabs + '</div>' +
      '<div class="rule-crumb">' + (helpPage + 1) + ' / ' + pages.length + ' · ' + p.desc + '</div>' +
      '<div class="rule-page">' + p.html + '</div>';
    const nav = helpPage > 0
      ? '<button class="btn" data-helpnav="-1">← 上一页</button>'
      : '<button class="btn" disabled>← 上一页</button>';
    const nav2 = helpPage < pages.length - 1
      ? '<button class="btn" data-helpnav="1">下一页 →</button>'
      : '<button class="btn" disabled>下一页 →</button>';
    openModal('📖 农场指南', body, nav + nav2 + '<button class="btn" data-close>关闭</button>');
  }

  /* ===== 07-ach-stats.js ===== */
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
      '<div><b>' + cropValue + '</b><span>作物 + 野货 + 水果价值</span></div>' +
    '</div>';

    /* 图鉴奖励：收集到 N 种鱼 / 作物自动发奖，这里显示进度和领取状态 */
    const rw = G.codexRewards(state);
    const rwAll = rw.fish.concat(rw.crops);
    const rwDone = rwAll.filter(function (m) { return m.claimed; }).length;
    const rewardHtml =
      '<details class="codex-rw-box"><summary>🎁 图鉴奖励 · ' + rwDone + '/' + rwAll.length +
        ' 已领取（点开看进度）</summary>' +
      rwAll.map(function (m) {
        const pct = Math.max(0, Math.min(100, Math.round(m.got / m.need * 100)));
        const ico = m.claimed ? '✅' : (m.got >= m.need ? '🎁' : '🔒');
        return '<div class="codex-rw' + (m.claimed ? ' got' : '') + '">' +
          '<span class="cw-k">' + ico + ' ' + m.label + ' ' + m.need + ' 种</span>' +
          '<span class="cw-bar"><i style="width:' + pct + '%"></i></span>' +
          '<span class="cw-n">' + m.got + '/' + m.need + '</span>' +
          '<span class="cw-r">' + (m.claimed ? '已领取' : m.text.replace(/^奖励\s*/, '')) + '</span>' +
        '</div>';
      }).join('') + '</details>';

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

    /* v2.44：图鉴改成卡片网格，一组一块；未收集的置灰 */
    const card = function (item, rec, emptyText) {
      const q = G.qualityById(rec.best);
      const got = rec.n > 0;
      return '<div class="codex-card' + (got ? '' : ' miss') + '">' +
        '<span class="cx-e">' + item.emoji + '</span>' +
        '<span class="cx-n">' + item.name + '</span>' +
        '<span class="cx-q" style="color:' + (q ? q.color : 'var(--ink-3)') + '">' +
          (got ? (q ? q.emoji + ' ' + q.name : '—') : emptyText) + '</span>' +
        '<span class="cx-m">' + (got ? rec.n + ' 次' + (rec.first ? ' · D' + rec.first : '') : '—') + '</span>' +
        '<span class="cx-v">' + (got ? (rec.value || 0) + ' 金' : '') + '</span>' +
      '</div>';
    };
    const sec = function (title, got, total, cards) {
      const pct = total ? Math.round(got / total * 100) : 0;
      return '<div class="codex-sec">' +
        '<div class="codex-sec-head"><span>' + title + '</span>' +
          '<span class="codex-prog"><i><b style="width:' + pct + '%"></b></i>' + got + '/' + total + '</span></div>' +
        '<div class="codex-grid">' + cards + '</div></div>';
    };

    const fishRows = species.map(function (f) { return card(f, fx[f.id] || emptyRec, '未捕获'); }).join('');
    const chestRows = G.FISH.filter(function (f) { return f.chest; })
      .map(function (f) { return card(f, fx[f.id] || emptyRec, '未捞到'); }).join('');
    const cropRows = G.CROP_LIST.map(function (c) { return card(c, cx[c.id] || emptyRec, '未收获'); }).join('');

    /* 果园水果 / 野货：和作物共用 codex.crops，单独成组 */
    const fruitList = G.FRUIT_LIST || [];
    const gotFruit = fruitList.filter(function (c) { return cx[c.id] && cx[c.id].n > 0; }).length;
    const fruitRows = fruitList.map(function (c) { return card(c, cx[c.id] || emptyRec, '未收获'); }).join('');

    const wildList = G.WILD_LIST || [];
    const gotWild = wildList.filter(function (c) { return cx[c.id] && cx[c.id].n > 0; }).length;
    const wildRows = wildList.map(function (c) { return card(c, cx[c.id] || emptyRec, '未采到'); }).join('');

    /* 菜品图鉴：每道菜记次数 / 最好品质 / 首次 / 累计卖价 */
    const cf = state.codex.food || {};
    const dishes = G.cookRecipes();
    const gotDish = dishes.filter(function (r) { return cf[r.id] && cf[r.id].n > 0; }).length;
    const dishRows = dishes.map(function (r) {
      return card({ emoji: r.emoji, name: r.name }, cf[r.id] || emptyRec, '未做过');
    }).join('');

    openModal('📖 图鉴',
      stat +
      rewardHtml +
      sec('🐟 鱼类', got, species.length, fishRows) +
      sec('🎁 宝箱', G.FISH.filter(function (f) { return f.chest && fx[f.id] && fx[f.id].n > 0; }).length,
        G.FISH.filter(function (f) { return f.chest; }).length, chestRows) +
      sec('🌱 作物', G.CROP_LIST.filter(function (c) { return cx[c.id] && cx[c.id].n > 0; }).length,
        G.CROP_LIST.length, cropRows) +
      sec('🌿 野货', gotWild, wildList.length, wildRows) +
      sec('🍑 水果', gotFruit, fruitList.length, fruitRows) +
      sec('🍳 菜品', gotDish, dishes.length, dishRows),
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

    /* 收益构成：按活动 / 类别拆分（和账本共用一套分类） */
    const byCat = G.ledgerByCategory(state, 30);
    const catNet = byCat.income - byCat.expense;
    const maxAbs = Math.max(1, byCat.list.reduce(function (m, c) { return Math.max(m, Math.abs(c.total)); }, 0));
    const catBars = byCat.list.map(function (c) {
      const v = Math.abs(c.total);
      return '<div class="stat-bar">' +
        '<span class="sb-n">' + c.name + '</span>' +
        '<span class="sb-t"><i class="' + (c.total > 0 ? 'in' : 'out') + '" style="width:' +
          Math.max(2, Math.round(v / maxAbs * 100)) + '%"></i></span>' +
        '<b class="' + (c.total > 0 ? 'up' : 'down') + '">' + (c.total > 0 ? '+' : '−') + v + '</b>' +
      '</div>';
    }).join('');
    const catHtml = '<div class="stat-sec"><h4>📊 收入 / 支出构成</h4>' +
      '<div class="stat-sum">收入 <b class="up">+' + byCat.income + '</b> · 支出 <b class="down">−' +
        byCat.expense + '</b> · 净 <b class="' + (catNet >= 0 ? 'up' : 'down') + '">' +
        (catNet >= 0 ? '+' : '−') + Math.abs(catNet) + '</b></div>' +
      (catBars || '<div class="store-empty">最近 30 天还没有账目</div>') +
      '<div class="stat-tip">按账本标签归类：卖种子 / 卖肥料 / 回收 / 开箱并入「开箱 · 回收」。</div>' +
    '</div>';
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

  /* ===== 08-crop-shop.js ===== */
/* 我的小农场 · 界面层 / 08-crop-shop.js
 * 农产品店 / 收购箱 / 水产店
 * 由 build-ui.cjs 按文件名顺序拼进 ui.js（共享同一个 IIFE 作用域），不要单独加载。
 */

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
  /* 还能卖多少才掉档（商店卖出行用的一行小字） */
  function headroomShort(hr, unit) {
    if (hr.atFloor) return '已到底价';
    if (hr.toCalm > 0) return '再卖 ' + hr.toCalm + ' ' + unit + '掉档';
    if (hr.toGlut > 0) return '再卖 ' + hr.toGlut + ' ' + unit + '掉档';
    return '再卖 ' + hr.toFloor + ' ' + unit + '到底';
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
          (mk.inSeason ? '当季 ×1' : '反季 ×' + mk.season) + ' · ' + mk.tag +
          ' · ' + headroomShort(G.marketHeadroom(state, id), '件') + '</div></div>' +
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
      '<div class="shop-tip">每天补一次货，卖完等明天。进价 = 基准价 × ' + G.BALANCE.shop.cropPriceMul +
        ' × 市价（卖得多就便宜、反季贵 ×' + G.BALANCE.market.offSeason + '），而且<b>买货会把销量往回拉</b>，' +
        '越买越贵 —— 转手必亏，只在凑委托 / 应急时买。<br>' +
        '想卖得贵就把作物放进<b>收购箱</b>，下次睡觉按当时市价结算（扣 ' +
        Math.round(G.BALANCE.market.boxFee * 100) + '% 手续费）。</div>',
      '<button class="btn" data-sellallcrop' + (total ? '' : ' disabled') + '>全部卖出</button>' +
      '<button class="btn" data-close>关闭</button>');
  }

  /* ---------------- 收购箱 ---------------- */

  function boxPutModal(kind, key, name, available) {
    const n = Math.max(1, Math.floor(available || 1));
    openModal('📦 放入收购箱',
      '<div class="shop-head">' + name + ' · 仓库有 <b>' + n + '</b> 件</div>' +
      '<label class="buy-custom"><span>放入数量</span>' +
        '<input id="box-put-n" type="number" min="1" max="' + n + '" step="1" value="1" inputmode="numeric"></label>' +
      '<div class="shop-tip">指定数量会从仓库移入收购箱，剩余库存不变；<b>按入箱时的市价锁价</b>，' +
        '睡觉结算时只跟随<b>当天季节</b>，并扣 ' + Math.round(G.BALANCE.market.boxFee * 100) +
        '% 手续费。入箱不压价，拆几批放和一次放价格一样。</div>',
      '<button class="btn primary" data-boxput-kind="' + kind + '" data-boxput-key="' + key + '">按数量放入</button>' +
      '<button class="btn" data-close>取消</button>');
  }

  function boxModal() {
    const list = state.box || [];
    const total = G.boxValue(state);
    const rows = list.length ? list.map(function (e) {
      const raw = e.raw != null ? e.raw : (e.v || 0);
      let sub = '原价 ' + raw + ' 金';
      if (e.parts && e.parts.length) {
        sub = e.parts.map(function (p) {
          const q = G.qualityById(p.q);
          return (q ? q.emoji + q.name : '杂物') + ' ' + p.n;
        }).join(' · ') + ' · 原价 ' + raw + ' 金';
      }
      return '<div class="store-row">' +
        '<span class="se">' + esc(e.emoji || '📦') + '</span>' +
        '<div><div class="sn">' + esc(e.name) + ' ×' + e.n + '</div>' +
        '<div class="sv">' + sub + '</div></div>' +
        '<span class="sp">约 ' + G.boxEntryNet(state, e) + ' 金</span>' +
      '</div>';
    }).join('') : '<div class="store-empty">收购箱是空的：在仓库点 📦 把作物 / 渔获放进来</div>';

    openModal('📦 收购箱',
      '<div class="shop-head">待出货 <b>' + list.length + '</b> 批 · 预计到手 <b>' + total + '</b> 金' +
        '（按入箱时市价 ×' + Math.round((1 - G.BALANCE.market.boxFee) * 100) + '%）</div>' +
      rows +
      (list.length
        ? '<div class="buy-custom"><span>🧮 自定义取出</span>' +
            '<select id="box-pick">' + list.map(function (e, i) {
              return '<option value="' + i + '">' + esc(e.emoji || '📦') + ' ' + esc(e.name) + ' ×' + e.n + '</option>';
            }).join('') + '</select>' +
            '<input id="box-take" type="number" min="1" step="1" value="1" inputmode="numeric">' +
            '<button class="btn mini" data-boxtaken="1">取出</button>' +
            '<span class="bc-tip">共 ' + list.reduce(function (a, e) { return a + (e.n || 1); }, 0) + ' 件</span></div>'
        : '') +
      '<div class="shop-tip">放进去的货按<b>入箱时的市价锁价</b>，睡觉结算时只跟随<b>出箱当天的季节</b>' +
      '（换季会变），扣 ' + Math.round(G.BALANCE.market.boxFee * 100) + '% 手续费；' +
      '直接卖给水产店 / 农产品店只有 ' + Math.round(G.BALANCE.shop.sellRate * 100) + '%。<br>' +
      '放错了可以取出放回仓库，入箱 / 取出都不影响市价。</div>',
      '<button class="btn" data-boxtake' + (list.length ? '' : ' disabled') + '>全部取出</button>' +
      '<button class="btn" data-close>关闭</button>');
  }

  /* 渔获品质构成（和作物仓库一个写法） */
  function fishMix(g) {
    return g.mix.map(function (m) {
      return '<span style="color:' + esc(m.color) + '">' + esc(m.emoji) + ' ' + esc(m.name) + ' ' + m.n + '</span>';
    }).join(' · ');
  }

  function fishShop() {
    const groups = G.fishGroups(state, 'fish');
    const total = groups.reduce(function (n, g) { return n + g.count; }, 0);
    const sellRows = groups.length ? groups.map(function (g) {
      const mk = G.fishMarketInfo(state, g.name);
      return '<div class="store-row">' +
        '<span class="se">' + esc(g.emoji) + '</span>' +
        '<div><div class="sn">' + esc(g.name) + ' ×' + g.count +
          ' <b class="own">市价 ×' + mk.total.toFixed(2) + '</b>' +
          (mk.inRun ? ' <b class="own">汛期</b>' : ' <b class="lock">非汛期 ×' + mk.season + '</b>') + '</div>' +
        '<div class="sv">' + fishMix(g) + ' · 均 ' + (g.total / g.count).toFixed(1) +
          ' 金/条 · ' + (mk.inRun ? '汛期 ×1' : '非汛期 ×' + mk.season) + ' · ' + mk.tag +
          ' · ' + headroomShort(G.fishMarketHeadroom(state, g.name), '条') + '</div></div>' +
        '<span class="sp">' + g.total + ' 金</span>' +
        '<button class="btn mini" data-sellfish="' + esc(g.key) + '">卖出</button>' +
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
              return '<option value="' + esc(g.key) + '">' + esc(g.emoji) + ' ' + esc(g.name) + ' ×' + g.count + '</option>';
            }).join('') + '</select>' +
            '<input id="fish-sell-n" type="number" min="1" step="1" value="1" inputmode="numeric">' +
            '<button class="btn mini" data-sellfishn="1">卖出</button>' +
            '<span class="bc-tip">共 ' + total + ' 条</span></div>'
        : '') +
      '<div class="store-sub" style="margin-top:10px">买水产 · 今日进货 · 共 <b>' + stockN + '</b> 条' +
        (soldOutN ? ' · ' + soldOutN + '/' + openN + ' 种售罄' : '') + '</div>' + buyRows +
      '<div class="shop-tip">水产店每天补一次货，卖完要等明天；买来的鱼是<b>一般品质</b>，只能卖钱、不能交委托。<br>' +
        '进价 = 基准价 × 市价（非汛期贵 ×' + G.BALANCE.market.offSeason + '）。<br>' +
        '直接卖只有 ' + Math.round(G.BALANCE.shop.sellRate * 100) + ' 折，想卖得贵就放进<b>收购箱</b>（仓库 📦），' +
      '下次睡觉按当时市价结算、扣 ' + Math.round(G.BALANCE.market.boxFee * 100) + '% 手续费。</div>',
      '<button class="btn" data-sellallfish' + (total ? '' : ' disabled') + '>全部卖出</button>' +
      '<button class="btn" data-close>关闭</button>');
  }

  function statsPlaceholder() {}

  /* ---------------- 下午茶 ---------------- */

  /* ---------------- 市场行情 ---------------- */

  /* ===== 09-town-market.js ===== */
/* 我的小农场 · 界面层 / 09-town-market.js
 * 小镇捐赠 / 市场行情 / 市场分析（价格历史）
 * 由 build-ui.cjs 按文件名顺序拼进 ui.js（共享同一个 IIFE 作用域），不要单独加载。
 */

  /* ---------------- 小镇（捐赠换永久加成） ---------------- */

  function townModal() {
    const T = G.BALANCE.town;
    const don = state.townDonated || 0;
    const tier = G.townTier(state);
    const rows = T.map(function (t) {
      const got = don >= t.need;
      const pct = Math.min(100, Math.round(don / t.need * 100));
      return '<div class="store-row' + (got ? '' : ' sold-out') + '">' +
        '<span class="se">' + t.emoji + '</span>' +
        '<div><div class="sn">' + t.name +
          (got ? ' <b class="own">已解锁</b>' : ' <b class="lock">还差 ' + (t.need - don) + ' 金</b>') + '</div>' +
        '<div class="sv">' + t.desc + '</div>' +
        (got ? '' : '<div class="cc-bar" style="margin-top:5px"><i style="width:' + pct + '%"></i></div>') +
        '</div>' +
        '<span class="sp">' + (got ? '✅' : Math.round(pct) + '%') + '</span>' +
      '</div>';
    }).join('');
    const next = G.townNext(state);
    const gap = next ? Math.max(1, next.need - don) : 0;
    function dbtn(amt, label) {
      return '<button class="btn mini" data-donate="' + amt + '"' +
        (state.coins < amt ? ' disabled' : '') + '>' + label + '</button>';
    }
    openModal('🏘️ 小镇 · 捐赠换声望',
      '<div class="shop-head">💰 <b>' + state.coins + '</b> 金 · 累计捐出 <b>' + don +
        '</b> 金 · 声望 ' + tier + ' / ' + T.length + '</div>' +
      rows +
      '<div class="buy-custom" style="margin-top:10px">' +
        '<span>💝 捐赠</span>' +
        (next ? dbtn(gap, '补足下一档 ' + gap + ' 金') : '') +
        dbtn(500, '捐 500') +
        dbtn(2000, '捐 2000') +
        dbtn(10000, '捐 1 万') +
      '</div>' +
      '<div class="shop-tip">捐出去的钱不退，换来的是<b>永久加成</b>：' +
        '「村口小摊」委托报酬 +5%、「镇上有名」商店进价 −10%、「商会会员」买卖市价 +8%，三档可叠加。<br>' +
        '这是后期金币的主要出口 —— 田里赚的钱，最后都该花在镇上。</div>',
      '<button class="btn" data-close>关闭</button>');
  }

  function marketTabs(active) {
    return '<div class="market-tabs" role="tablist" aria-label="市场页面">' +
      '<button class="market-tab' + (active === 'quote' ? ' active' : '') + '"' +
        ' data-market-page="quote" role="tab" aria-selected="' + (active === 'quote') + '">📈 行情</button>' +
      '<button class="market-tab' + (active === 'analysis' ? ' active' : '') + '"' +
        ' data-market-page="analysis" role="tab" aria-selected="' + (active === 'analysis') + '">📊 分析</button>' +
    '</div>';
  }

  function marketModal() {
    const season = G.seasonOf(state.day);
    const OFF = G.BALANCE.market.offSeason;
    /* 再卖多少就掉档 —— 让「饱和」变成能提前规划的事 */
    const headroomText = function (hr, unit) {
      if (hr.atFloor) return '已经到底价了，明天再卖';
      if (hr.toCalm > 0) return '再卖 <b>' + hr.toCalm + '</b> ' + unit + '掉到「平稳」';
      if (hr.toGlut > 0) return '再卖 <b>' + hr.toGlut + '</b> ' + unit + '掉到「过剩」';
      return '再卖 <b>' + hr.toFloor + '</b> ' + unit + '到底价';
    };
    const cropRow = function (c, wild, fruit) {
      const mk = G.marketInfo(state, c.id);
      const hr = G.marketHeadroom(state, c.id);
      return '<div class="store-row">' +
        '<span class="se">' + c.emoji + '</span>' +
        '<div><div class="sn">' + c.name +
          (mk.inSeason ? ' <b class="own">当季 ×1</b>' : ' <b class="lock">反季 ×' + mk.season + '</b>') +
          (wild ? ' <b class="own">采集</b>' : '') +
          (fruit ? ' <b class="own">果园</b>' : '') + '</div>' +
        '<div class="sv">供需 ×' + mk.supply.toFixed(2) + ' · ' + mk.tag +
          ' · ' + headroomText(hr, '件') + '</div></div>' +
        '<span class="sp">×' + mk.total.toFixed(2) + '</span>' +
      '</div>';
    };
    const cropRows = G.CROP_LIST.map(function (c) { return cropRow(c, false); }).join('');
    const fruitRows = G.FRUIT_LIST.map(function (c) { return cropRow(c, false, true); }).join('');
    const wildRows = G.WILD_LIST.map(function (c) { return cropRow(c, true); }).join('');

    const fishRows = G.FISH.filter(function (f) { return !f.trash && !f.chest; }).map(function (f) {
      const mk = G.fishMarketInfo(state, f.name);
      const hr = G.fishMarketHeadroom(state, f.name);
      return '<div class="store-row">' +
        '<span class="se">' + f.emoji + '</span>' +
        '<div><div class="sn">' + f.name +
          (mk.inRun ? ' <b class="own">汛期 ×1</b>' : ' <b class="lock">非汛期 ×' + mk.season + '</b>') + '</div>' +
        '<div class="sv">供需 ×' + mk.supply.toFixed(2) + ' · ' + mk.tag +
          ' · ' + headroomText(hr, '条') + '</div></div>' +
        '<span class="sp">×' + mk.total.toFixed(2) + '</span>' +
      '</div>';
    }).join('');

    openModal('📈 市场',
      marketTabs('quote') +
      '<div class="shop-head">现在是 <b>' + season + '季</b> · 售出会压低供需，睡觉后回落 ' +
        Math.round((1 - G.BALANCE.market.decay) * 100) + '%</div>' +
      '<div class="store-sub">🌱 作物 · 当季 ×1 / 反季 ×' + OFF + '</div>' + cropRows +
      '<div class="store-sub" style="margin-top:10px">🍑 水果 · 果园当季采摘 · 当季 ×1 / 反季 ×' + OFF + '</div>' + fruitRows +
      '<div class="store-sub" style="margin-top:10px">🌿 野货 · 采集获得</div>' + wildRows +
      '<div class="store-sub" style="margin-top:10px">🐟 水产 · 汛期 ×1 / 非汛期 ×' + OFF + '</div>' + fishRows +
      '<div class="shop-tip">右侧是当前市价系数；每行显示供需状态和距离下个价格档位的销量。' +
      '一批货按<b>批次中点</b>定价 —— 一次卖 30 件和分三次卖 10 件到手一样多；' +
      '收购箱<b>按入箱时市价锁价</b>、扣 ' + Math.round(G.BALANCE.market.boxFee * 100) + '%。' +
      '水果和作物一样吃市价：当季 ×1，囤到反季 ×' + OFF + '（每种水果只在自己那季结果）。' +
      '成本、利润、走势与下季估值见「分析」。</div>',
      '<button class="btn" data-close>关闭</button>');
  }

  /* ---------------- 市场分析（价格历史） ---------------- */

  /* 迷你折线：宽 120，高 28，纵轴固定 0.5~2.8，跨品种可比 */
  function sparkline(vals) {
    const W = 120, H = 28, PAD = 3, LO = 0.5, HI = 2.8;
    const n = vals.length;
    if (!n) return '<svg class="spark" width="' + W + '" height="' + H + '"></svg>';
    const px = function (i) {
      return PAD + (W - 2 * PAD) * (n === 1 ? 0.5 : i / (n - 1));
    };
    const py = function (v) {
      const t = Math.max(0, Math.min(1, (v - LO) / (HI - LO)));
      return H - PAD - (H - 2 * PAD) * t;
    };
    const pts = vals.map(function (v, i) { return px(i).toFixed(1) + ',' + py(v).toFixed(1); }).join(' ');
    return '<svg class="spark" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">' +
      '<polyline points="' + pts + '" fill="none" stroke="currentColor" stroke-width="1.6" ' +
        'stroke-linejoin="round" stroke-linecap="round"/>' +
      '<circle cx="' + px(n - 1).toFixed(1) + '" cy="' + py(vals[n - 1]).toFixed(1) +
        '" r="2.4" fill="currentColor"/>' +
    '</svg>';
  }

  function analysisModal() {
    const season = G.seasonOf(state.day);
    const days = G.HIST_DAYS;
    const market = G.BALANCE.market;
    const daysToNextSeason = 30 - ((state.day - 1) % 30);
    const townMul = 1 + G.townBonus(state, 'marketBonus');

    /* 预测到下季开季：逐日模拟供需冷却（与睡觉结算的 30% 回落规则一致）。 */
    function nextSeasonMarket(mk, item, isFish) {
      let sold = mk.sold;
      for (let i = 0; i < daysToNextSeason; i++) {
        sold = Math.round(sold * market.decay * 10) / 10;
        if (sold < 0.5) sold = 0;
      }
      const step = isFish ? market.fishStep : market.cropStep;
      const supply = Math.max(market.supplyMin,
        Math.min(market.supplyMax, market.supplyMax - step * sold));
      const seasonMul = isFish
        ? G.fishNextSeasonMul(state, item.name)
        : G.cropNextSeasonMul(state, item.id);
      return { supply: supply, total: supply * seasonMul * townMul };
    }

    /* 当前背包卖给商店的到手金额，与囤到下季开季的估算对比。 */
    const holdings = [];
    G.CROP_LIST.concat(G.WILD_LIST, G.FRUIT_LIST).forEach(function (c) {
      const qty = G.storeCount(state, c.id);
      if (!qty) return;
      const mk = G.marketInfo(state, c.id);
      const nextMk = nextSeasonMarket(mk, c, false);
      const raw = G.storeValue(state, c.id);
      holdings.push({
        name: c.name, emoji: c.emoji, qty: qty, unit: '个',
        now: G.cropNetEstimate(state, c.id),
        next: Math.max(1, Math.round(raw * G.sellBonus(state) * nextMk.total *
          (1 - G.BALANCE.market.boxFee))),
        cost: (c.wild || c.fruit) ? null : G.cropBuyPrice(c.id, state) * qty
      });
    });
    G.fishGroups(state, 'fish').forEach(function (g) {
      const mk = G.fishMarketInfo(state, g.name);
      const nextMk = nextSeasonMarket(mk, { name: g.name }, true);
      const fishDef = G.fishByName(g.name);
      holdings.push({
        name: g.name, emoji: g.emoji, qty: g.count, unit: '条',
        now: G.fishNetEstimate(state, g.name, g.count, g.total),
        next: Math.max(1, Math.round(g.total * G.sellBonus(state) * nextMk.total *
          (1 - G.BALANCE.market.boxFee))),
        cost: fishDef ? G.fishBuyPrice(fishDef.id, state) * g.count : null
      });
    });
    const holdNow = holdings.reduce(function (n, h) { return n + h.now; }, 0);
    const holdNext = holdings.reduce(function (n, h) { return n + h.next; }, 0);
    const holdDelta = holdNext - holdNow;
    const costed = holdings.filter(function (h) { return h.cost != null; });
    const referenceCost = costed.reduce(function (n, h) { return n + h.cost; }, 0);
    const costedNow = costed.reduce(function (n, h) { return n + h.now; }, 0);
    const costedNext = costed.reduce(function (n, h) { return n + h.next; }, 0);
    const nowMargin = costedNow - referenceCost;
    const nextMargin = costedNext - referenceCost;
    const bestWaits = holdings.filter(function (h) { return h.next > h.now; })
      .sort(function (a, b) { return (b.next - b.now) - (a.next - a.now); }).slice(0, 3);
    const waitText = bestWaits.length
      ? '更适合等的库存：' + bestWaits.map(function (h) {
          return h.emoji + ' ' + h.name + ' ×' + h.qty + h.unit + ' +' + (h.next - h.now) + ' 金';
        }).join(' · ')
      : (holdings.length ? '按当前估算，现有库存没有品种适合等到下季再卖。' : '仓库里还没有可比较的作物或鱼。');

    function row(key, item, isFish) {
      const mk = isFish ? G.fishMarketInfo(state, item.name) : G.marketInfo(state, item.id);
      const series = G.marketSeries(state, key, mk.total);
      const nxt = isFish ? G.fishNextSeasonMul(state, item.name) : G.cropNextSeasonMul(state, item.id);
      const base = isFish ? item.base : item.price;
      const marketBase = Math.max(1, Math.round(base * mk.total));
      const nextMk = nextSeasonMarket(mk, item, isFish);
      const nextSale = Math.max(1, Math.round(base * G.sellBonus(state) * nextMk.total *
        (1 - G.BALANCE.market.boxFee)));
      const unit = isFish ? '条' : '个';
      const buyCost = isFish ? G.fishBuyPrice(item.id, state)
        : ((item.wild || item.fruit) ? null : G.cropBuyPrice(item.id, state));
      const costNote = isFish ? '水产店进价' : (item.fruit ? '果园自产 · 育苗成本未计' : '采集现金成本未计');
      const oneSale = Math.max(1, Math.round(base * G.sellBonus(state) * mk.total *
        (1 - G.BALANCE.market.boxFee)));
      const unitMargin = buyCost == null ? null : oneSale - buyCost;
      const wk = series.slice(-7);
      const trend = wk.length > 1 && wk[0] > 0
        ? (wk[wk.length - 1] - wk[0]) / wk[0] * 100 : 0;
      const head = wk.length > 1
        ? '近 ' + wk.length + ' 点 ' + wk[0].toFixed(2) + ' → ' + wk[wk.length - 1].toFixed(2) +
          '（' + (trend > 0 ? '+' : '') + trend.toFixed(0) + '%）'
        : '只有今天 ' + (wk[0] || 0).toFixed(2);
      const tag = isFish
        ? (mk.inRun ? '<b class="own">汛期</b>' : '<b class="lock">非汛期</b>')
        : (mk.inSeason ? '<b class="own">当季</b>' : '<b class="lock">反季</b>');
      return '<div class="store-row">' +
        '<span class="se">' + (item.emoji || '') + '</span>' +
        '<div style="flex:1;min-width:0">' +
          '<div class="sn">' + item.name + ' ' + tag +
            ' <b class="own">×' + mk.total.toFixed(2) + '</b> · 标准品质市场基准价 <b>' + marketBase + '</b> 金/' + unit + '</div>' +
          '<div class="sv">销量 ' + mk.sold.toFixed(0) + ' ' + unit + ' · 供需 ×' +
            mk.supply.toFixed(2) + ' · 季节 ×' + mk.season.toFixed(2) + ' · ' + head + '</div>' +
          '<div class="sv">' + (buyCost == null
            ? '单件收购箱到手 ' + oneSale + ' 金 · ' + costNote
            : '单件参考进价 ' + buyCost + ' 金 · 收购箱到手 ' + oneSale + ' 金 · 毛差 <b class="' +
              (unitMargin > 0 ? 'market-up' : (unitMargin < 0 ? 'market-down' : '')) + '">' +
              (unitMargin > 0 ? '+' : '') + unitMargin + ' 金</b>') + '</div>' +
          '<div class="sv">' + daysToNextSeason + ' 天后下季开市 ×' + nextMk.total.toFixed(2) +
            (nxt > 1 ? '（转' + (isFish ? '非汛期' : '反季') + '）' : '') +
            ' → 单件卖出到手约 <b>' + nextSale + '</b> 金</div>' +
        '</div>' +
        '<span class="sparkwrap">' + sparkline(series) + '</span>' +
      '</div>';
    }

    const cropRows = G.CROP_LIST.map(function (c) { return row(c.id, c, false); }).join('');
    const fruitRows = G.FRUIT_LIST.map(function (c) { return row(c.id, c, false); }).join('');
    const wildRows = G.WILD_LIST.map(function (c) { return row(c.id, c, false); }).join('');
    const fishRows = G.FISH.filter(function (f) { return !f.trash && !f.chest; })
      .map(function (f) { return row('f:' + f.name, f, true); }).join('');

    const tracked = Object.keys(state.marketHist || {}).length;
    const portfolio = '<div class="market-portfolio">' +
      '<div class="store-sub">📦 当前库存 · 成本与利润参考 · ' +
        holdings.reduce(function (n, h) { return n + h.qty; }, 0) + ' 件</div>' +
      (holdings.length
        ? '<div class="market-portfolio-grid">' +
            '<div><span>参考进货成本</span><b>' + referenceCost + ' 金</b></div>' +
            '<div><span>成本货现在卖</span><b>' + costedNow + ' 金</b></div>' +
            '<div class="' + (nowMargin > 0 ? 'market-up' : (nowMargin < 0 ? 'market-down' : '')) + '">' +
              '<span>现在参考毛差</span><b>' + (nowMargin > 0 ? '+' : '') + nowMargin + ' 金</b></div>' +
            '<div><span>成本货下季卖</span><b>' + costedNext + ' 金</b></div>' +
            '<div class="' + (nextMargin > 0 ? 'market-up' : (nextMargin < 0 ? 'market-down' : '')) + '">' +
              '<span>下季参考毛差</span><b>' + (nextMargin > 0 ? '+' : '') + nextMargin + ' 金</b></div>' +
          '</div><div class="sv market-wait-note">' +
            '全库存估算：现在卖 ' + holdNow + ' 金 · 下季卖 ' + holdNext + ' 金 · 等待变化 ' +
            (holdDelta > 0 ? '+' : '') + holdDelta + ' 金。' + waitText + '</div>'
        : '<div class="sv market-wait-note">仓库里还没有可比较的作物或鱼。</div>') +
    '</div>';
    openModal('📈 市场',
      marketTabs('analysis') +
      '<div class="shop-head">现在是 <b>' + season + '季</b> · 已记录 <b>' + days +
        '</b> 天内最多 <b>' + days + '</b> 个价格点（存了 ' + tracked + ' 种货）</div>' +
      portfolio +
      '<div class="store-sub">🌱 作物</div>' + cropRows +
      '<div class="store-sub" style="margin-top:10px">🍑 水果（果园）</div>' + fruitRows +
      '<div class="store-sub" style="margin-top:10px">🌿 野货（采集）</div>' + wildRows +
      '<div class="store-sub" style="margin-top:10px">🐟 水产</div>' + fishRows +
      '<div class="shop-tip">每行显示<b>标准品质市场基准价</b>、<b>单件商店进价 / 卖出价 / 毛差</b>、<b>销量 / 供需 / 季节</b>、<b>近期价格变化</b>和价格曲线，' +
        '右边那条线是最近 30 天的市价系数（纵轴固定 0.5~2.8，所以不同货能直接比）。<br>' +
        '<b>成本口径：</b>单件买卖价按标准品质估算；持仓毛差使用当前商店进价作补货成本参考，不是历史实际成本；自产成本、水果育苗成本、野货采集体力未计。' +
        '<b>下季开市估算</b>按“等待期间不再卖货”计算，并逐日计入市场销量回落；未计入委托收益、税费和等待期间的经营成本。</div>',
      '<button class="btn" data-close>关闭</button>');
  }

  /* ===== 10-tea-depart-status.js ===== */
/* 我的小农场 · 界面层 / 10-tea-depart-status.js
 * 下午茶 / 百货店 / 设置 / 当前状态
 * 由 build-ui.cjs 按文件名顺序拼进 ui.js（共享同一个 IIFE 作用域），不要单独加载。
 */

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

    const treeRows = G.TREE_LIST.map(function (t) {
      const seedPrice = G.treeBuyPrice(state, t.id, 'seed');
      const sapPrice = G.treeBuyPrice(state, t.id, 'sapling');
      const seedN = G.treeStockCount(state, t.id, 'seed');
      const sapN = G.treeStockCount(state, t.id, 'sapling');
      return '<div class="store-row">' +
        '<span class="se">' + t.emoji + '</span>' +
        '<div><div class="sn">' + t.name + ' <b class="own">' + G.SEASONS[t.season] + '季结果</b>' +
          ((seedN || sapN) ? ' <b class="own">库存 ' + (seedN + sapN) + '</b>' : '') + '</div>' +
          '<div class="sv">种子 ' + seedPrice + ' 金（浇水 ' + G.BALANCE.orchard.grow.seed.water +
            ' 天 + 生长 ' + G.BALANCE.orchard.grow.seed.days + ' 天）· 树苗 ' + sapPrice + ' 金（浇水 ' +
            G.BALANCE.orchard.grow.sapling.water + ' 天 + 生长 ' + G.BALANCE.orchard.grow.sapling.days +
            ' 天）· 成树当季每天 ' + G.BALANCE.orchard.fruitMin + '–' + G.BALANCE.orchard.fruitMax +
            ' 个 · ' + t.fruit + ' ' + t.price + ' 金/个</div></div>' +
        '<button class="btn mini" data-buytree="' + t.id + '" data-mode="seed"' +
          (state.coins < seedPrice ? ' disabled' : '') + '>种子</button>' +
        '<button class="btn mini" data-buytree="' + t.id + '" data-mode="sapling"' +
          (state.coins < sapPrice ? ' disabled' : '') + '>树苗</button></div>';
    }).join('');

    const keyRows = Object.keys(G.KEYS).map(function (id) {
      const k = G.KEYS[id];
      const open = G.keyUnlocked(state, id);
      const have = (state.keys && state.keys[id]) || 0;
      const tGate = G.keyTradeGate(id);
      const fishOk = G.fishLv(state) >= k.lv;
      const lockTxt = !fishOk ? '钓鱼 Lv' + k.lv + ' 解锁' : '交易 Lv' + tGate + ' 解锁';
      return '<div class="store-row' + (open ? '' : ' locked') + '">' +
        '<span class="se">' + k.emoji + '</span>' +
        '<div><div class="sn">' + k.name +
          (open ? ' <b class="own">持有 ' + have + '</b>' : ' <b class="lock">' + lockTxt + '</b>') +
          '</div><div class="sv">' + (open ? Math.round(k.price * G.tradeCut(state)) + ' 金 · 开' + k.opens :
            (!fishOk ? '钓鱼等级到 Lv' + k.lv + ' 才上架' : '交易等级到 Lv' + tGate + ' 才上架')) + '</div></div>' +
        '<button class="btn mini" data-buykey="' + id + '"' +
          (!open || state.coins < k.price ? ' disabled' : '') + '>买1</button></div>';
    }).join('');

    const recipeRows = G.shopRecipes().map(function (r) {
      const known = G.recipeKnown(state, r);
      const open = G.tradeLv(state) >= r.trade;
      const price = Math.round(r.shopPrice * G.tradeCut(state));
      return '<div class="store-row' + (!known && !open ? ' locked' : '') + '">' +
        '<span class="se">📜</span>' +
        '<div><div class="sn">' + r.emoji + ' ' + r.name +
          (known ? ' <b class="own">已学会</b>' : '') + '</div>' +
        '<div class="sv">' + G.ingredientText(r) + ' · +' + r.restore + ' 体力 · ' +
          (known ? '可在厨房做' : (open ? price + ' 金' : '交易 Lv' + r.trade + ' 才出售')) +
        '</div></div>' +
        (known ? '<span class="sp">✅</span>' :
          '<button class="btn mini" data-buyrecipe="' + r.id + '"' +
            (!open || state.coins < price ? ' disabled' : '') + '>买配方</button>') +
      '</div>';
    }).join('');

    // 百货店只收宝箱，杂物一律不收（只能进收购箱）
    const junk = G.fishGroups(state, 'junk').filter(function (g) { return g.chest; });    const CHECK = {
      wood: '开箱 10–26 金',
      iron: '开箱：肥料×6–9 / 种子×8–12 / 面团×12–18 / 蚯蚓×12–18 + ' +
        Math.round(G.BALANCE.cook.ironRecipeChance * 100) + '% 掉食谱',
      gold: '开箱：200–320 金 + 特效肥×3–5 / 稀有种子×2–3 / 蚯蚓×14–18 + ' +
        Math.round(G.BALANCE.cook.goldRecipeChance * 100) + '% 掉食谱',
      ironNote: Math.round(G.BALANCE.cook.ironRecipeChance * 100) + '% 掉食谱'
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
      '<div class="store-sub" style="margin-top:10px">🌳 果树种子 / 树苗 · ' +
        (G.orchardUnlocked(state) ? '果园已开垦' : '种田 Lv' + G.BALANCE.orchard.unlockLv + ' 开垦果园后能种') +
        '</div>' + treeRows +
      '<div class="store-sub" style="margin-top:10px">🗝️ 钥匙 · 钓鱼 Lv' + G.KEYS.iron.lv + ' / Lv' +
        G.KEYS.gold.lv + ' + 交易 Lv' + G.BALANCE.gate.goldKeyTrade + ' 解锁</div>' + keyRows +
      '<div class="store-sub" style="margin-top:10px">📜 食谱 · 交易等级解锁，买一次永久学会</div>' + recipeRows +
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
        '<button class="btn" id="set-help">📖 农场指南</button>' +
        '<button class="btn" id="set-theme">' + (theme === 'dark' ? '🌙 黑夜模式：开' : '☀️ 黑夜模式：关') + '</button>' +
        '<button class="btn" id="set-share">🖼️ 分享名片<small>当前农场 · PNG</small></button>' +
        '<button class="btn" id="set-export">⬇️ 导出存档<small>.json</small></button>' +
        '<button class="btn" id="set-import">⬆️ 导入存档<small>.json</small></button>' +
        '<button class="btn" id="set-sound">' + (soundOn ? '🔊 音效：开' : '🔇 音效：关') + '</button>' +
        '<button class="btn danger" id="set-reset">🔄 重新开始</button>' +
      '</div>' +
      '<div class="shop-tip">进度自动保存在本浏览器（localStorage）；换设备用导出 / 导入。</div>',
      '<button class="btn" data-close>关闭</button>');
  }

  /* ---------------- 经营档案 ---------------- */

  function profileModal() {
    const w = G.netWorth(state);
    const rank = G.profileRank(state);
    const st = state.stats || {};
    const inc = st.incomeTotal || 0;
    const exp = st.expenseTotal || 0;
    const net = inc - exp;
    const days = Math.max(1, state.day || 1);
    const perDay = Math.round(net / days);
    const byDay = G.ledgerByDay(state);
    const best = byDay.slice().sort(function (a, b) {
      return (b.income - b.expense) - (a.income - a.expense);
    })[0];

    const bar = function (name, value, max) {
      return '<div class="stat-bar">' +
        '<span class="sb-n">' + name + '</span>' +
        '<span class="sb-t"><i class="in" style="width:' + Math.max(2, Math.round(value / max * 100)) + '%"></i></span>' +
        '<b>' + value + '</b>' +
      '</div>';
    };

    const parts = [
      ['💰 现金', w.coins], ['🧺 仓库', w.store], ['📦 收购箱', w.box],
      ['🔧 设备', w.device], ['🍑 果园', w.orchard]
    ].filter(function (p) { return p[1] > 0; });
    const maxPart = Math.max(1, parts.reduce(function (m, p) { return Math.max(m, p[1]); }, 0));
    const partBars = parts.map(function (p) { return bar(p[0], p[1], maxPart); }).join('') ||
      '<div class="store-empty">身上什么都没有</div>';

    /* 全程收入构成：账本最多保留 200 笔，这里按剩余账本 + 累计值说明 */
    const cat = G.ledgerByCategory(state, days);
    const maxCat = Math.max(1, cat.list.reduce(function (m, c) { return Math.max(m, Math.abs(c.total)); }, 0));
    const catBars = cat.list.map(function (c) {
      const v = Math.abs(c.total);
      return '<div class="stat-bar">' +
        '<span class="sb-n">' + c.name + '</span>' +
        '<span class="sb-t"><i class="' + (c.total > 0 ? 'in' : 'out') + '" style="width:' +
          Math.max(2, Math.round(v / maxCat * 100)) + '%"></i></span>' +
        '<b class="' + (c.total > 0 ? 'up' : 'down') + '">' + (c.total > 0 ? '+' : '−') + v + '</b>' +
      '</div>';
    }).join('') || '<div class="store-empty">还没有账目</div>';

    const fx = (state.codex && state.codex.fish) || {};
    const cx = (state.codex && state.codex.crops) || {};
    const species = G.FISH.filter(function (f) { return !f.trash && !f.chest; });
    const fishGot = species.filter(function (f) { return fx[f.id] && fx[f.id].n > 0; }).length;
    const cropGot = G.CROP_LIST.filter(function (c) { return cx[c.id] && cx[c.id].n > 0; }).length;
    const fruitGot = G.FRUIT_LIST.filter(function (c) { return cx[c.id] && cx[c.id].n > 0; }).length;
    const achs = G.achInfo(state);
    const done = achs.filter(function (a) { return a.done; }).length;
    const lv = state.levels || {};
    const topLv = Math.max(lv.farm || 1, lv.fish || 1, lv.dig || 1, lv.forage || 1, lv.trade || 1);

    const body =
      '<div class="profile-head">' +
        '<span class="profile-rank">' + rank.cur.emoji + '</span>' +
        '<div class="profile-title"><b>' + rank.cur.name + '</b>' +
          '<small>第 ' + state.day + ' 天 · ' + G.seasonOf(state.day) + '季 · ' +
          state.plots.length + ' 块地</small></div>' +
        '<div class="profile-worth"><small>净资产</small><b>' + w.total + '</b><small>金</small></div>' +
      '</div>' +
      '<div class="stat-kpis">' +
        '<div class="stat-kpi"><span>累计收入</span><b class="up">+' + inc + '</b><small>日均 +' +
          Math.round(inc / days) + '</small></div>' +
        '<div class="stat-kpi"><span>累计支出</span><b class="down">−' + exp + '</b><small>日均 −' +
          Math.round(exp / days) + '</small></div>' +
        '<div class="stat-kpi"><span>累计净收益</span><b class="' + (net >= 0 ? 'up' : 'down') + '">' +
          (net >= 0 ? '+' : '−') + Math.abs(net) + '</b><small>日均 ' + (perDay >= 0 ? '+' : '−') +
          Math.abs(perDay) + '</small></div>' +
        '<div class="stat-kpi"><span>经营天数</span><b>' + state.day + '</b><small>' +
          (best ? '最佳 D' + best.day + ' +' + (best.income - best.expense) : '还没有账目') + '</small></div>' +
      '</div>' +
      '<div class="stat-sec"><h4>💰 资产构成 · 合计 ' + w.total + ' 金</h4>' + partBars + '</div>' +
      '<div class="stat-sec"><h4>📈 收入构成</h4>' + catBars + '</div>' +
      '<div class="stat-sec"><h4>🏅 经营进度</h4><dl class="kv">' +
        '<dt>成就</dt><dd>' + done + ' / ' + achs.length + '</dd>' +
        '<dt>图鉴</dt><dd>🐟 ' + fishGot + '/' + species.length + ' · 🌱 ' + cropGot + '/' +
          G.CROP_LIST.length + ' · 🍑 ' + fruitGot + '/' + G.FRUIT_LIST.length + '</dd>' +
        '<dt>最高等级</dt><dd>Lv' + topLv + ' / ' + G.BALANCE.level.max + '</dd>' +
        '<dt>完成委托</dt><dd>' + (st.orders || 0) + ' 单 · 累计收获 ' + (st.harvests || 0) +
          ' 次 · 钓鱼 ' + (st.casts || 0) + ' 次</dd>' +
        '<dt>累计种树</dt><dd>' + (st.orchardPlanted || 0) + ' 棵 · 收果 ' + (st.orchardFruit || 0) + ' 个</dd>' +
      '</dl></div>' +
      '<div class="stat-tip">' +
        (rank.next
          ? '再攒 <b>' + (rank.next.need - w.total) + '</b> 金净资产 → ' + rank.next.emoji + ' ' + rank.next.name
          : '已经是最高称号 ' + rank.cur.emoji + ' ' + rank.cur.name) +
        '。累计收支从本版本开始精确累计，老存档按剩余账本估算。</div>';

    openModal('🗂️ 经营档案', body, '<button class="btn" data-close>关闭</button>');
  }

  function statusModal() {
    const lv = state.levels || { farm: 1, fish: 1, farmXp: 0, fishXp: 0 };
    const nextTax = G.BALANCE.tax.every - (state.day % G.BALANCE.tax.every);

    const sec = function (title, rows) {
      return '<div class="stat-sec"><h4>' + title + '</h4><dl class="kv">' +
        rows.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>'; }).join('') +
      '</dl></div>';
    };

    const progress = [
      ['进度', '第 ' + state.day + ' 天 · ' + G.seasonOf(state.day) + '季'],
      ['金币', state.coins + ' 金'],
      ['体力', state.energy + ' / ' + state.maxEnergy + ' · 伙食 ' + G.mealFeeDue(state) + ' 金/天' +
        (G.mealFeeDue(state) !== G.mealFee(state) ? '（没吃午饭 ×' + G.BALANCE.meal.skipLunchMul + '）' : '')],
      ['土地', state.plots.length + ' 块 · 洒水器 ' + state.sprinklers + ' 个'],
      ['设备', (state.harvester ? '自动收获器 ✅ · ' : '自动收获器 — · ') +
        '自动播种器 ×' + G.seederCount(state) + (G.seederCount(state) ? '（每晚 ' + G.seederPlots(state) + ' 块）' : '') +
        ' · 渔网 ' + state.nets + ' 张（已布 ' + G.netSetCount(state) + '）' +
        (state.fisher ? ' · 渔夫 Lv' + G.fisherLv(state) : '')],
      ['果园', (function () {
        if (!G.orchardUnlocked(state)) {
          return '未开垦（种田 Lv' + G.BALANCE.orchard.unlockLv + ' + ' + G.BALANCE.orchard.unlockCost + ' 金）';
        }
        const o = G.orchardSummary(state);
        return '树坑 ' + o.total + '/' + o.max + ' · 成树 ' + o.mature + '（当季 ' + o.inSeason + '）' +
          ' · 育苗 ' + o.growing + ' · 待收 ' + o.ripe + ' 个 · 待浇水 ' + o.thirsty + ' 棵';
      })()],
      ['果园累计', (function () {
        const cx = (state.codex && state.codex.crops) || {};
        const val = G.FRUIT_LIST.reduce(function (a, f) {
          return a + ((cx[f.id] && cx[f.id].value) || 0);
        }, 0);
        const got = G.FRUIT_LIST.filter(function (f) { return cx[f.id] && cx[f.id].n > 0; }).length;
        return '种树 ' + ((state.stats && state.stats.orchardPlanted) || 0) + ' 棵 · 收果 ' +
          ((state.stats && state.stats.orchardFruit) || 0) + ' 个 · 水果图鉴 ' + got + '/' +
          G.FRUIT_LIST.length + ' · 价值 ' + val + ' 金';
      })()]
    ];

    const assets = [
      ['仓库', '收购箱到手约 ' + G.storeNetEstimate(state) + ' 金'],
      ['收购箱', G.boxCount(state) + ' 批 · 预计 ' + G.boxValue(state) + ' 金（睡觉结算，扣 5%）'],
      ['茶叶', (function () {
        const list = G.teaStock(state);
        return list.length ? list.map(function (t) { return t.emoji + t.name + '×' + state.teas[t.id]; }).join(' · ')
          : '没有茶了（百货店有卖）';
      })()],
      ['钥匙', '🗝️ 铁 ×' + ((state.keys && state.keys.iron) || 0) + ' · 🔑 金 ×' + ((state.keys && state.keys.gold) || 0)],
      ['宝箱', '已开 ' + (state.stats.chests || 0) + ' 个 · 待开 ' +
        G.fishGroups(state, 'junk').filter(function (g) { return g.chest; })
          .reduce(function (n, g) { return n + g.count; }, 0) + ' 个'],
      ['维护费', '每周 ' + (G.plotUpkeep(state.plots.length) + G.deviceUpkeep(state)) +
        ' 金（土地 ' + G.plotUpkeep(state.plots.length) + ' + 设备 ' + G.deviceUpkeep(state) + '）'],
      ['税金', '还有 ' + nextTax + ' 天 · 约 ' + G.taxDue(state) + ' 金（累进 2% / 4% / 6%，最低 ' +
        G.BALANCE.tax.min + '）']
    ];

    const levels = [
      ['种田等级', 'Lv' + lv.farm + (lv.farm >= G.BALANCE.level.max ? '（满级）' :
        '（' + lv.farmXp + '/' + G.levelNeed(lv.farm) + '）') + ' · ' + G.levelEffectText('farm', lv.farm)],
      ['钓鱼等级', 'Lv' + lv.fish + (lv.fish >= G.BALANCE.level.max ? '（满级）' :
        '（' + lv.fishXp + '/' + G.levelNeed(lv.fish) + '）') + ' · ' + G.levelEffectText('fish', lv.fish)],
      ['挖蚯蚓等级', 'Lv' + (lv.dig || 1) + ((lv.dig || 1) >= G.BALANCE.level.max ? '（满级）' :
        '（' + (lv.digXp || 0) + '/' + G.levelNeed(lv.dig || 1) + '）') + ' · ' +
        G.levelEffectText('dig', lv.dig || 1)],
      ['采集等级', 'Lv' + (lv.forage || 1) + ((lv.forage || 1) >= G.BALANCE.level.max ? '（满级）' :
        '（' + (lv.forageXp || 0) + '/' + G.levelNeed(lv.forage || 1) + '）') + ' · ' +
        G.levelEffectText('forage', lv.forage || 1)],
      ['交易等级', 'Lv' + (lv.trade || 1) + ((lv.trade || 1) >= G.BALANCE.level.max ? '（满级）' :
        '（' + (lv.tradeXp || 0) + '/' + G.levelNeed(lv.trade || 1, 'trade') + '）') + ' · ' +
        G.levelEffectText('trade', lv.trade || 1)]
    ];

    const totals = [
      ['累计播种', state.stats.planted + ' 次'],
      ['累计收获', state.stats.harvests + ' 次'],
      ['累计钓鱼', state.stats.casts + ' 次'],
      ['累计挖蚯蚓', state.stats.dug + ' 次'],
      ['采集记录', (function () {
        const n = state.stats.forages || 0;
        if (!n) return '还没去过后山';
        const w = state.stats.wild || {};
        const parts = G.WILD_LIST.filter(function (x) { return (w[x.id] || 0) > 0; })
          .map(function (x) { return x.emoji + x.name + '×' + w[x.id]; });
        return '共 ' + n + ' 次' + (parts.length ? ' · ' + parts.join(' · ') : '') +
          (state.stats.forageBest >= 3 ? ' · 单次最多 3 件' : '');
      })()],
      ['卖出作物', (state.stats.cropsSold || 0) + ' 个'],
      ['完成委托', (state.stats.orders || 0) + ' 单'],
      ['成就', (function () {
        const list = G.achInfo(state);
        return list.filter(function (a) { return a.done; }).length + ' / ' + list.length;
      })()]
    ];

    openModal('📊 当前状态',
      sec('🌱 农场与进度', progress) + sec('💰 资产与开销', assets) +
      sec('📈 等级', levels) + sec('🏆 累计', totals),
      '<button class="btn" data-close>关闭</button>');
  }

  /* ===== 11-day-summary.js ===== */
/* 我的小农场 · 界面层 / 11-day-summary.js
 * 每日总结（睡觉结算面板）
 * 由 build-ui.cjs 按文件名顺序拼进 ui.js（共享同一个 IIFE 作用域），不要单独加载。
 */

  /* ---------------- 每日总结（睡觉结算） ---------------- */

  function daySummaryModal(r) {
    const rep = r && r.report;
    if (!rep) { if (r && r.summary) toast(r.summary, 'good'); return; }
    const num = function (v) { return (v > 0 ? '+' : '') + v; };
    const cls = function (v) { return v > 0 ? 'up' : (v < 0 ? 'down' : ''); };

    const cashIn = rep.cash.reduce(function (sum, x) { return sum + Math.max(0, x.value || 0); }, 0);
    const cashOut = rep.cash.reduce(function (sum, x) { return sum + Math.max(0, -(x.value || 0)); }, 0);
    const goodsValue = rep.goods.reduce(function (sum, x) { return sum + Math.max(0, x.value || 0); }, 0);
    const money = rep.cash.concat(rep.goods.map(function (g) {
      return { label: g.label, value: g.value, goods: true };
    }));
    const dailyNet = rep.coins.delta;
    const netLabel = dailyNet > 0 ? '金币净增加' : (dailyNet < 0 ? '金币净减少' : '金币持平');
    const cashBalance = rep.coins.before > 0 ? Math.round(rep.coins.after / rep.coins.before * 100) : 0;
    const moneyHtml = money.length ? '<div class="day-list">' + money.map(function (x) {
      return '<div class="day-line' + (x.goods ? ' goods' : '') + '"><span>' + x.label +
        (x.goods ? ' <i>入库</i>' : '') + '</span><b class="' + cls(x.value) + '">' +
        num(x.value) + ' 金</b></div>';
    }).join('') + '</div>' : '<div class="day-empty">没有现金收支</div>';

    const farm = [];
    if (rep.farm.harvested) farm.push(['🤖 自动收获', rep.farm.harvested + ' 块 · 值 ' + rep.farm.harvestValue + ' 金']);
    if (rep.farm.replanted) farm.push(['🌱 自动补种', rep.farm.replanted + ' 块']);
    if (rep.farm.seeder) farm.push(['🌾 自动播种', rep.farm.seeder + ' 块']);
    if (rep.farm.watered) farm.push(['💧 浇水', rep.farm.watered + ' 块' +
      (rep.farm.ripened ? ' · 成熟 ' + rep.farm.ripened : '')]);
    if (rep.farm.missed) farm.push(['🥀 缺水', rep.farm.missed + ' 块（晚一天成熟）']);

    const fish = [];
    if (rep.fisher) {
      fish.push(['🧑‍🌾 渔夫 Lv' + rep.fisher.lv, rep.fisher.strike
        ? '罢工（工资 ' + rep.fisher.wage + ' 金）'
        : rep.fisher.got + '/' + rep.fisher.casts + ' 条 · 值 ' + rep.fisher.value + ' 金 · 工资 -' +
          rep.fisher.wage + (rep.fisher.leveled ? ' · 升级 ×' + rep.fisher.leveled : '')]);
    }
    if (rep.net) {
      fish.push(['🕸️ 渔网', rep.net.got + '/' + rep.net.used + ' 条 · 值 ' + rep.net.value + ' 金' +
        (rep.net.pending ? ' · ' + rep.net.pending + ' 张待重布' : '')]);
    }

    const orders = [['📋 今日委托', rep.orders.fresh + ' 张 · 能交 ' + rep.orders.deliverable + ' 张']];
    if (rep.longOrder) {
      orders.push(['⏳ 长期订单', rep.longOrder.emoji + ' ' + rep.longOrder.name + ' ×' + rep.longOrder.qty +
        '（有 ' + rep.longOrder.have + '）· 还剩 ' + rep.longOrder.days + ' 天']);
    }

    const orchard = [];
    if (rep.orchard) {
      if (rep.orchard.fruit) orchard.push(['🍑 挂果', '+' + rep.orchard.fruit + ' 个（等着收）']);
      if (rep.orchard.ripe) orchard.push(['🧺 待收', rep.orchard.ripe + ' 个 · 每棵 ' + G.BALANCE.orchard.harvestEnergy + ' 体力']);
      if (rep.orchard.thirsty) orchard.push(['💧 待浇水', rep.orchard.thirsty + ' 棵育苗树 · ' +
        G.BALANCE.orchard.waterEnergy + ' 体力/棵']);
    }

    function sec(title, rows) {
      if (!rows.length) return '';
      return '<div class="day-sec"><h4>' + title + '</h4><dl class="kv">' + rows.map(function (x) {
        return '<dt>' + x[0] + '</dt><dd>' + x[1] + '</dd>';
      }).join('') + '</dl></div>';
    }

    openModal('📋 每日总结 · 第 ' + rep.day + ' 天',
      '<div class="day-sum-top">' +
        '<div class="dh-coin ' + cls(rep.coins.delta) + '">' + num(rep.coins.delta) + '<small> 金</small></div>' +
        '<div class="dh-meta"><b>' + netLabel + '</b><br>' + rep.weather.emoji + ' ' + rep.weather.name + ' · ' +
          G.seasonOf(rep.day) + '季<br><small>金币 ' + rep.coins.before + ' → <b>' + rep.coins.after + '</b>' +
          (cashBalance ? ' · 余额 ' + cashBalance + '%' : '') + '</small></div>' +
      '</div>' +
      '<div class="day-kpis">' +
        '<div class="day-kpi"><span>现金收入</span><b class="up">+' + cashIn + '</b><small>金</small></div>' +
        '<div class="day-kpi"><span>现金支出</span><b class="down">-' + cashOut + '</b><small>金</small></div>' +
        '<div class="day-kpi"><span>入库货值</span><b>+' + goodsValue + '</b><small>金（估值）</small></div>' +
      '</div>' +
      '<div class="day-sec"><h4>💰 今日收支明细</h4>' + moneyHtml + '</div>' +
      sec('🌾 农场', farm) + sec('🌳 果园', orchard) + sec('🐟 渔获', fish) + sec('📋 委托', orders) +
      (rep.tomorrow.length ? '<div class="day-sec"><h4>☀️ 明天</h4><ul class="day-todo">' +
        rep.tomorrow.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul></div>' : '') +
      '<div class="shop-tip">现金收支会改变金币；「入库货值」是收进仓库的估值，不是现金。余额变化率仅供快速参考。</div>',
      '<button class="btn primary" data-close>开始新的一天</button>');
  }

  function resetModal() {
    openModal('🔄 重新开始', '<div style="font-size:13px;line-height:1.7">' +
      '这会清空当前存档，从第 1 天、50 金重新开始。<br>确定吗？</div>',
      '<button class="btn" data-close>取消</button>' +
      '<button class="btn danger" id="do-reset">确定重开</button>');
  }

  /* ===== 12-orchard.js ===== */
/* 我的小农场 · 界面层 / 12-orchard.js
 * 果园面板：开垦 / 扩坑 / 树坑 / 种树 / 浇水 / 收获
 * 由 build-ui.cjs 按文件名顺序拼进 ui.js（共享同一个 IIFE 作用域），不要单独加载。
 */

  /* ---------------- 果园面板 ---------------- */

  function orchardCard(i) {
    const slot = G.treeSlot(state, i);
    const no = i + 1;
    if (!slot) {
      return '<div class="orc-card empty">' +
        '<div class="orc-top"><span class="orc-emoji">🕳️</span><span class="orc-no">' + no + ' 号坑</span></div>' +
        '<div class="orc-mid">空着 · 可以种果树</div>' +
        '<div class="orc-act"><button class="btn mini" data-tree-pick="' + i + '">种树</button></div></div>';
    }
    const t = G.TREES[slot.id];
    const p = G.treeProgress(state, i);
    if (!p.done) {
      const needsWater = G.treeNeedsWater(state, i);
      const watered = slot.lastWater === state.day;
      const pct = Math.min(100, Math.round(Math.min(p.water / p.needWater, p.age / p.needDays) * 100));
      return '<div class="orc-card">' +
        '<div class="orc-top"><span class="orc-emoji">' + t.emoji + '</span><span class="orc-no">' + no + ' 号坑</span>' +
          '<b class="orc-tag">育苗</b></div>' +
        '<div class="orc-mid">' + t.name + ' · ' + (p.mode === 'sapling' ? '树苗' : '种子') + '<br>' +
          '💧 ' + p.water + '/' + p.needWater + ' 天 · 🌱 ' + p.age + '/' + p.needDays + ' 天</div>' +
        '<div class="cc-bar orc-bar"><i style="width:' + pct + '%"></i></div>' +
        '<div class="orc-act"><span class="orc-note">' + (!needsWater ? '✅ 育苗浇水已完成' :
          (watered ? '✅ 今天浇过' : '💧 待浇水（' + G.BALANCE.orchard.waterEnergy + ' 体力）')) + '</span>' +
        (needsWater ? '<button class="btn mini" data-tree-water="' + i + '"' +
          (watered || state.energy < G.BALANCE.orchard.waterEnergy ? ' disabled' : '') + '>浇水</button>' : '') +
        '</div></div>';
    }
    const inSeason = G.treeInSeason(state, i);
    const lvTxt = G.treeLevelText(G.treeSlot(state, i) || {});
    return '<div class="orc-card mature' + (inSeason ? ' on' : '') + '">' +
      '<div class="orc-top"><span class="orc-emoji">' + t.emoji + '</span><span class="orc-no">' + no + ' 号坑</span>' +
        '<b class="orc-lv">' + lvTxt + '</b>' +
        '<b class="orc-tag' + (inSeason ? '' : ' off') + '">' + (inSeason ? '当季' : '休眠') + '</b></div>' +
      '<div class="orc-mid">' + t.name + '<br>' +
        (inSeason
          ? '每天挂 ' + G.BALANCE.orchard.fruitMin + '–' + G.BALANCE.orchard.fruitMax + ' 个' +
            (p.yieldBonus > 0 ? '（+' + Math.round(p.yieldBonus * 100) + '%）' : '') +
            ' · 待收 ' + p.ripe + '/' + G.BALANCE.orchard.ripeCap +
            (p.ripe >= G.BALANCE.orchard.ripeCap ? ' <b class="orc-full">已挂满</b>' : '')
          : G.SEASONS[t.season] + '季结果') + '</div>' +
      '<div class="orc-act">' +
        '<button class="btn mini primary" data-tree-harvest="' + i + '"' + (p.ripe ? '' : ' disabled') + '>' +
          '收获' + (p.ripe ? ' ' + p.ripe : '') + '</button></div></div>';
  }

  function renderOrchard() {
    const sum = G.orchardSummary(state);
    const locked = $('#orchard-locked');
    const grid = $('#orchard-grid');
    const foot = $('#orchard-foot');
    if (!locked || !grid || !foot) return;
    const head = $('#orchard-sum');
    const need = G.BALANCE.orchard;
    if (!G.orchardUnlocked(state)) {
      const lv = G.farmLv(state);
      const lvOk = lv >= need.unlockLv;
      const coinOk = state.coins >= need.unlockCost;
      locked.innerHTML = '<div class="orc-locked">🔒 种田 <b>Lv' + need.unlockLv + '</b> + <b>' +
        need.unlockCost + '</b> 金开垦（现在 Lv' + lv + (lvOk ? ' ✓' : '') + '）<br>' +
        '<span>开垦后先给 ' + need.free + ' 个树坑，后面每个树坑再花钱开</span><br>' +
        '<button class="btn primary" data-orchard-unlock="1"' +
          (lvOk && coinOk ? '' : ' disabled') + '>开垦果园（' + need.unlockCost + ' 金）</button></div>';
      locked.hidden = false;
      grid.hidden = true;
      foot.hidden = true;
      if (head) head.textContent = '';
      return;
    }
    locked.hidden = true;
    grid.hidden = false;
    foot.hidden = false;
    const cards = [];
    for (let i = 0; i < G.orchardSlotCount(state); i++) cards.push(orchardCard(i));
    grid.innerHTML = cards.join('');
    if (head) head.textContent = '树坑 ' + sum.total + '/' + sum.max + ' · 成树 ' + sum.mature +
      ' · 待收 ' + sum.ripe;
    const waterTxt = $('#orchard-water-txt');
    if (waterTxt) {
      waterTxt.textContent = sum.thirsty
        ? sum.thirsty + ' 棵 · ' + (sum.thirsty * G.BALANCE.orchard.waterEnergy) + ' 体力'
        : (sum.growing ? '今天没有待浇树' : '没有育苗树');
    }
    const harvTxt = $('#orchard-harvest-txt');
    if (harvTxt) {
      harvTxt.textContent = sum.ripe ? '待收 ' + sum.ripe + ' 个' : '没有可收的';
    }
    const expTxt = $('#orchard-expand-txt');
    if (expTxt) {
      const cost = G.orchardExpandCost(state);
      expTxt.textContent = sum.total >= sum.max ? '已开满' : (cost + ' 金');
    }
    const waterBtn = $('[data-act="orchardWater"]');
    if (waterBtn) waterBtn.disabled = !sum.thirsty;
    const harvBtn = $('[data-act="orchardHarvest"]');
    if (harvBtn) harvBtn.disabled = !sum.ripe;
    const expBtn = $('[data-act="orchardExpand"]');
    if (expBtn) expBtn.disabled = sum.total >= sum.max;
  }

  function treePicker(i) {
    const need = G.BALANCE.orchard;
    const rows = G.TREE_LIST.map(function (t) {
      const seedN = G.treeStockCount(state, t.id, 'seed');
      const sapN = G.treeStockCount(state, t.id, 'sapling');
      return '<div class="store-row">' +
        '<span class="se">' + t.emoji + '</span>' +
        '<div><div class="sn">' + t.name + ' <b class="own">' + G.SEASONS[t.season] + '季结果</b></div>' +
           '<div class="sv">' + t.fruit + ' ' + t.price + ' 金/个 · 成树后当季每天 ' + need.fruitMin + '–' + need.fruitMax +
             ' 个 · 种子需浇水 ' + need.grow.seed.water +
            ' 天 + 生长 ' + need.grow.seed.days + ' 天 · 树苗需 浇水 ' + need.grow.sapling.water +
            ' 天 + 生长 ' + need.grow.sapling.days + ' 天</div>' +
          '<div class="sv">种子有 ' + seedN + ' · 树苗有 ' + sapN + '</div></div>' +
        '<button class="btn mini" data-tree-plant="' + i + '" data-tree="' + t.id + '" data-mode="seed"' +
          (seedN ? '' : ' disabled') + '>种子</button>' +
        '<button class="btn mini" data-tree-plant="' + i + '" data-tree="' + t.id + '" data-mode="sapling"' +
          (sapN ? '' : ' disabled') + '>树苗</button>' +
      '</div>';
    }).join('');
    openModal('🌰 ' + (i + 1) + ' 号树坑 · 种什么',
      '<div class="shop-head">🍑 当季每天随机挂 ' + need.fruitMin + '–' + need.fruitMax +
        ' 个水果 · 每棵果树只在自己的季节结果</div>' + rows +
      '<div class="shop-tip">果树可以逐棵浇水。种子便宜，但要<b>浇水 ' + need.grow.seed.water + ' 天</b>并且<b>生长满 ' +
        need.grow.seed.days + ' 天</b>才成树；树苗贵，<b>浇水 ' + need.grow.sapling.water +
        ' 天后不再需要浇水，生长满 ' + need.grow.sapling.days + ' 天才成树。浇水 ' + need.waterEnergy +
        ' 体力/棵、收获 ' + need.harvestEnergy + ' 体力/棵。</div>',
      '<button class="btn" data-act="depart">🏬 去百货店买</button>' +
      '<button class="btn" data-close>取消</button>');
  }

  /* ===== 13-actions.js ===== */
/* 我的小农场 · 界面层 / 13-actions.js
 * 重置确认 / ACTIONS 动作表 / 飘字定位
 * 由 build-ui.cjs 按文件名顺序拼进 ui.js（共享同一个 IIFE 作用域），不要单独加载。
 */

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
      // 睡眠播报升级成「每日总结」面板
      daySummaryModal(r);
    },
    dig: function (ev) {
      const r = G.digWorms(state);
      commit(r);
      if (r.ok) { toast(r.msg, 'good'); SFX.plant(); floatAt(ev, '🪱 +' + r.n, 'green'); }
    },
    forage: function (ev) {
      const r = G.forage(state);
      commit(r);
      if (r.ok) {
        toast(r.msg + (r.seed ? ' · 还捡到一颗种子' : ''), 'good');
        SFX.plant();
        floatAt(ev, '🌿 +' + r.qty, 'green');
      } else {
        toast(r.msg, 'warn');
      }
    },
    tea: teaModal,
    kitchen: kitchenModal,
    lunch: lunchModal,
    depart: departModal,
    orchardWater: function () {
      const r = G.waterOrchard(state);
      commit(r);
      toast(r.msg, r.ok ? 'good' : 'warn');
      if (r.ok) SFX.water();
    },
    orchardHarvest: function () {
      const r = G.harvestOrchard(state);
      commit(r);
      toast(r.msg, r.ok ? 'good' : 'warn');
      if (r.ok) SFX.good();
    },
    orchardExpand: function () {
      const r = G.expandOrchard(state);
      commit(r);
      toast(r.msg, r.ok ? 'good' : 'warn');
      if (r.ok) SFX.coin();
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
    seeder: function () { seederModal(); },
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
        (r.entries || [r.entry]).forEach(function (e) { pushCatch(e); });
        toast(r.msg + (r.bonus ? '（双咬钩！）' : ''), r.entry.trash ? 'warn' : 'good');
        SFX.catch();
        floatAt(ev, '+' + (r.entries || [r.entry]).reduce(function (n, e) { return n + e.price; }, 0) + ' 金', '');
      }
    },
    cast5: function () {
      const r = G.fishMany(state, G.BALANCE.fishBatch, baitSel);
      commit(r);                       // commit 已经在失败时提示过一次
      if (!r.ok) return;
      /* 双咬钩的第二条鱼也要进「最近渔获」，以前只取每条杆的第一条 */
      const got = [];
      r.results.forEach(function (x) {
        if (!x.ok) return;
        (x.entries && x.entries.length ? x.entries : (x.entry ? [x.entry] : [])).forEach(function (e) { got.push(e); });
      });
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

  /* ===== 14-events.js ===== */
/* 我的小农场 · 界面层 / 14-events.js
 * 全部事件绑定：点击委托、输入、快捷键、文件导入
 * 由 build-ui.cjs 按文件名顺序拼进 ui.js（共享同一个 IIFE 作用域），不要单独加载。
 */

  /* ---------------- 事件绑定 ---------------- */

  function bind() {
    $('#store-search').addEventListener('input', function () {
      storeQuery = this.value || '';
      renderStore();
    });
    document.addEventListener('click', function (ev) {
      const t = ev.target;

      const marketPageBtn = t.closest('[data-market-page]');
      if (marketPageBtn) {
        if (marketPageBtn.dataset.marketPage === 'analysis') analysisModal();
        else marketModal();
        return;
      }

      const storeFilterBtn = t.closest('[data-store-filter]');
      if (storeFilterBtn) {
        storeFilter = storeFilterBtn.dataset.storeFilter || 'all';
        renderStore();
        return;
      }

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

      // 农场指南翻页
      const helpTab = t.closest('[data-helppage]');
      if (helpTab) {
        helpPage = Number(helpTab.dataset.helppage) || 0;
        helpModal();
        return;
      }
      const helpNav = t.closest('[data-helpnav]');
      if (helpNav && !helpNav.disabled) {
        helpPage = Math.max(0, Math.min(helpPages().length - 1,
          helpPage + Number(helpNav.dataset.helpnav)));
        helpModal();
        return;
      }

      // 成就翻页
      const achTab = t.closest('[data-achcat]');
      if (achTab) {
        achCat = achTab.dataset.achcat;
        achModal();
        return;
      }
      const achNav = t.closest('[data-achnav]');
      if (achNav && !achNav.disabled) {
        let i = ACH_ORDER.indexOf(achCat) + Number(achNav.dataset.achnav);
        i = Math.max(0, Math.min(ACH_ORDER.length - 1, i));
        achCat = ACH_ORDER[i];
        achModal();
        return;
      }

      // 果园：开垦 / 种树 / 浇水 / 收获 / 买树苗
      const orcUnlock = t.closest('[data-orchard-unlock]');
      if (orcUnlock && !orcUnlock.disabled) {
        const r = G.orchardUnlock(state);
        if (r.ok) { commit(r); toast(r.msg, 'good'); SFX.coin(); }
        else { toast(r.msg, 'warn'); SFX.bad(); }
        return;
      }
      const treePick = t.closest('[data-tree-pick]');
      if (treePick) { treePicker(Number(treePick.dataset.treePick)); return; }
      const treePlant = t.closest('[data-tree-plant]');
      if (treePlant && !treePlant.disabled) {
        const r = G.plantTree(state, Number(treePlant.dataset.treePlant),
          treePlant.dataset.tree, treePlant.dataset.mode);
        if (r.ok) { closeModal(); commit(r); toast(r.msg, 'good'); SFX.plant(); }
        else { toast(r.msg, 'bad'); SFX.bad(); }
        return;
      }
      const treeWater = t.closest('[data-tree-water]');
      if (treeWater && !treeWater.disabled) {
        const r = G.waterTree(state, Number(treeWater.dataset.treeWater));
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.water();
        return;
      }
      const treeHarvest = t.closest('[data-tree-harvest]');
      if (treeHarvest && !treeHarvest.disabled) {
        const r = G.harvestTree(state, Number(treeHarvest.dataset.treeHarvest));
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.good();
        return;
      }
      const buyTree = t.closest('[data-buytree]');
      if (buyTree && !buyTree.disabled) {
        const r = G.buyTreeStock(state, buyTree.dataset.buytree, buyTree.dataset.mode, 1);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok && modalOpen()) departModal();
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
        if (r.ok && modalOpen()) shopModal();
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

      // 收购箱：仓库行上的「全部」按钮
      const boxAllRow = t.closest('[data-boxall]');
      if (boxAllRow) {
        const raw = String(boxAllRow.dataset.boxall || '');
        const cut = raw.indexOf('|');
        const kind = raw.slice(0, cut);
        const key = raw.slice(cut + 1);
        const available = kind === 'crop'
          ? G.storeCount(state, key)
          : ((G.fishGroups(state).filter(function (g) { return g.key === key; })[0] || {}).count || 0);
        if (!(available > 0)) { toast('仓库里已经没有这件了', 'warn'); return; }
        const r = kind === 'crop'
          ? G.boxPutCrop(state, key, available)
          : G.boxPutFish(state, key, available);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        return;
      }

      // 收购箱：弹窗里的「全部放入」（保留兼容）
      const boxAll = t.closest('[data-boxput-all]');
      if (boxAll) {
        const raw = String(boxAll.dataset.boxputAll || '');
        const cut = raw.indexOf('|');
        const kind = raw.slice(0, cut);
        const key = raw.slice(cut + 1);
        const available = kind === 'crop'
          ? G.storeCount(state, key)
          : ((G.fishGroups(state).filter(function (g) { return g.key === key; })[0] || {}).count || 0);
        if (!(available > 0)) { toast('仓库里已经没有这件了', 'warn'); return; }
        const r = kind === 'crop'
          ? G.boxPutCrop(state, key, available)
          : G.boxPutFish(state, key, available);
        if (r.ok) closeModal();
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        return;
      }

      // 收购箱：确认自定义放货数量
      const boxPut = t.closest('[data-boxput-kind]');
      if (boxPut) {
        const kind = boxPut.dataset.boxputKind;
        const key = boxPut.dataset.boxputKey;
        const qty = Math.floor(Number($('#box-put-n').value) || 0);
        const available = kind === 'crop'
          ? G.storeCount(state, key)
          : ((G.fishGroups(state).filter(function (g) { return g.key === key; })[0] || {}).count || 0);
        if (!(qty > 0)) { toast('请输入 1 以上的数量', 'warn'); return; }
        if (qty > available) { toast('仓库只有 ' + available + ' 件', 'warn'); return; }
        const r = kind === 'crop' ? G.boxPutCrop(state, key, qty) : G.boxPutFish(state, key, qty);
        if (r.ok) closeModal();
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        return;
      }

      // 仓库点 📦 后选择放入收购箱的数量
      const boxCrop = t.closest('[data-boxcrop]');
      if (boxCrop) {
        const id = boxCrop.dataset.boxcrop;
        boxPutModal('crop', id, G.CROPS[id].name, G.storeCount(state, id));
        return;
      }
      const boxFish = t.closest('[data-boxfish]');
      if (boxFish) {
        const key = boxFish.dataset.boxfish;
        const g = G.fishGroups(state).filter(function (x) { return x.key === key; })[0];
        if (g) boxPutModal('fish', key, g.name, g.count);
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

      // 厨房：做菜 / 分页 / 吃午饭 / 放收购箱
      const cookTabBtn = t.closest('[data-cooktab]');
      if (cookTabBtn) {
        cookTab = cookTabBtn.dataset.cooktab || 'all';
        if (modalOpen()) kitchenModal();
        return;
      }
      const cookBtn = t.closest('[data-cook]');
      if (cookBtn && !cookBtn.disabled) {
        const r = G.cookMeal(state, cookBtn.dataset.cook);
        commit(r);
        if (r.ok) {
          SFX.good();
          toast(r.fail ? '🔥 做砸了，得到一份焦糊料理' : '🍳 ' + r.food.name + ' 做好了', r.fail ? 'warn' : 'good');
          if (modalOpen()) kitchenModal();
        } else {
          toast(r.msg, 'warn');
        }
        return;
      }
      const eatBtn = t.closest('[data-eatfood]');
      if (eatBtn && !eatBtn.disabled) {
        const r = G.eatFoodGroup(state, eatBtn.dataset.eatfood);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) { SFX.good(); closeModal(); }
        return;
      }
      const boxFood = t.closest('[data-boxfood]');
      if (boxFood && !boxFood.disabled) {
        const r = G.boxPutFoodGroup(state, boxFood.dataset.boxfood);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) kitchenModal();
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
      const buyRecipe = t.closest('[data-buyrecipe]');
      if (buyRecipe && !buyRecipe.disabled) {
        const r = G.buyRecipe(state, buyRecipe.dataset.buyrecipe);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) { SFX.coin(); if (modalOpen()) departModal(); }
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

      // 自动播种器：买 / 开关 / 每台选种子
      const buySeeder = t.closest('[data-buyseeder]');
      if (buySeeder && !buySeeder.disabled) {
        const r = G.buySeeder(state);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) { SFX.coin(); seederModal(); }
        return;
      }
      const togSeeder = t.closest('[data-toggleseeder]');
      if (togSeeder) {
        const r = G.toggleSeeder(state);
        commit(r);
        toast(r.msg, 'good');
        seederModal();
        return;
      }
      const machBtn = t.closest('[data-mach]');
      if (machBtn) {
        seedMach = Number(machBtn.dataset.mach) || 1;
        seederModal();
        return;
      }
      const autoSeedBtn = t.closest('[data-autoseed]');
      if (autoSeedBtn) {
        const id = autoSeedBtn.dataset.autoseed;
        const cur = G.autoSeedOf(state, seedMach);
        const r = G.setAutoSeed(state, seedMach, cur === id ? null : id);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        seederModal();
        return;
      }

      // 雇佣 / 升级 / 辞退渔夫
      const donateBtn = t.closest('[data-donate]');
      if (donateBtn && !donateBtn.disabled) {
        const r = G.donate(state, Number(donateBtn.dataset.donate) || 0);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) townModal();
        return;
      }
      const hireBtn = t.closest('[data-hirefisher]');
      if (hireBtn && !hireBtn.disabled) {
        const r = G.hireFisher(state);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) shopModal();
        return;
      }
      const fisherUpBtn = t.closest('[data-fisherup]');
      if (fisherUpBtn && !fisherUpBtn.disabled) {
        const r = G.fisherUp(state);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) shopModal();
        return;
      }
      const fireBtn = t.closest('[data-firefisher]');
      if (fireBtn) {
        const r = G.fireFisher(state);
        commit(r);
        toast(r.msg, 'warn');
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

      // 钓鱼记录 Tab 筛选
      const bookTab = t.closest('[data-book-filter]');
      if (bookTab) {
        bookFilter = bookTab.dataset.bookFilter;
        renderBook();
        return;
      }
    });

    $('#btn-settings').addEventListener('click', settingsModal);
    $('#btn-box').addEventListener('click', boxModal);
    $('#btn-status').addEventListener('click', statusModal);
    $('#btn-codex').addEventListener('click', codexModal);
    $('#btn-profile').addEventListener('click', profileModal);
    $('#btn-ach').addEventListener('click', achModal);
    const mktBtn = $('#btn-market');
    if (mktBtn) mktBtn.addEventListener('click', marketModal);
    const townBtn = $('#btn-town');
    if (townBtn) townBtn.addEventListener('click', townModal);
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
      if (t.closest('#set-share')) { closeModal(); shareCardModal(); return; }
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

  /* ===== 15-boot.js ===== */
/* 我的小农场 · 界面层 / 15-boot.js
 * 启动：读档、渲染、成就检查、欢迎提示
 * 由 build-ui.cjs 按文件名顺序拼进 ui.js（共享同一个 IIFE 作用域），不要单独加载。
 */

  /* ---------------- 启动 ---------------- */

  function boot() {
    window.addEventListener('error', function (e) {
      console.error(e.error || e.message);
      toast('出错了：' + (e.message || '未知错误'), 'bad');
    });
    // 存档写入去抖：离开页面 / 切到后台时同步补写最后一笔
    window.addEventListener('pagehide', flushSave);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') flushSave();
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
    const codexGot = G.checkCodexRewards(state);
    renderAll();
    save();

    if (futureSave) {
      setTimeout(function () {
        toast('存档来自更新的版本，已备份为 farm-gui-save-v1-future，本次从新农场开始', 'warn');
      }, 300);
    } else if (saved) {
      setTimeout(function () { toast('读取存档：第 ' + state.day + ' 天 · ' + state.coins + ' 金', 'good'); }, 300);
    } else {
      setTimeout(function () { toast('🌾 欢迎来到我的小农场！先给空地播种吧', 'good'); }, 300);
    }
    if (unlocked.length) setTimeout(function () { achToasts(unlocked); }, 900);
    if (codexGot.length) setTimeout(function () { codexToasts(codexGot); }, 1400);
  }

  boot();

  /* ===== 16-share.js ===== */
/* 我的小农场 · 界面层 / 16-share.js
 * 分享名片：把当前农场画成一张 PNG 名片（纯本地 canvas，不上传任何数据）
 * 由 build-ui.cjs 按文件名顺序拼进 ui.js（共享同一个 IIFE 作用域），不要单独加载。
 */

  /* ---------------- 分享名片 ---------------- */

  const SHARE_FONT = '"PingFang SC","Microsoft YaHei","Segoe UI",system-ui,sans-serif';

  /* canvas 2d 在极老的浏览器 / 测试桩里可能不可用，先探一下 */
  function shareSupported() {
    try {
      const cv = document.createElement('canvas');
      return !!(cv && cv.getContext && cv.getContext('2d') && typeof cv.toDataURL === 'function');
    } catch (e) { return false; }
  }

  /* 名片上的数据：只取展示用的字段，不动 state */
  function shareCardData(s) {
    const lv = s.levels || {};
    const achMax = (G.ACH || []).reduce(function (n, a) { return n + (a.pts || 0); }, 0);
    const planted = (s.plots || []).filter(function (p) { return p && p.crop && G.CROPS[p.crop]; });
    const emojis = [];
    planted.forEach(function (p) {
      const e = G.CROPS[p.crop].emoji;
      if (emojis.indexOf(e) < 0) emojis.push(e);
    });
    return {
      day: s.day || 1,
      season: G.seasonOf(s.day || 1),
      weather: G.WEATHER[s.weather] || { emoji: '☀️', name: '晴天' },
      coins: Math.round(s.coins || 0),
      plots: (s.plots || []).length,
      farmLv: lv.farm || 1,
      fishLv: lv.fish || 1,
      achPts: G.achPts(s),
      achMax: achMax,
      harvests: (s.stats && s.stats.harvests) || 0,
      catches: (s.fishBook && s.fishBook.count) || 0,
      planted: planted.length,
      emojis: emojis.slice(0, 9),
      today: new Date()
    };
  }

  function shareRoundRect(c, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + rr, y);
    c.arcTo(x + w, y, x + w, y + h, rr);
    c.arcTo(x + w, y + h, x, y + h, rr);
    c.arcTo(x, y + h, x, y, rr);
    c.arcTo(x, y, x + w, y, rr);
    c.closePath();
  }

  function shareLabel(c, str, x, y, size, color, opts) {
    const o = opts || {};
    c.font = (o.weight || 700) + ' ' + size + 'px ' + SHARE_FONT;
    c.fillStyle = color;
    c.textAlign = o.align || 'left';
    c.textBaseline = 'alphabetic';
    c.fillText(str, x, y);
  }

  function shareDateText(d) {
    const p2 = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  }

  /* 画一张 720×980（2 倍高清）的名片，返回 canvas */
  function drawShareCard(d) {
    const W = 720, H = 980, S = 2;
    const cv = document.createElement('canvas');
    cv.width = W * S;
    cv.height = H * S;
    const c = cv.getContext('2d');
    c.scale(S, S);

    /* 背景：米色渐变 */
    const bg = c.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#fffaf0');
    bg.addColorStop(1, '#f0dfbe');
    c.fillStyle = bg;
    c.fillRect(0, 0, W, H);

    /* 顶部绿色横幅（下缘圆角） */
    const band = c.createLinearGradient(0, 0, W, 320);
    band.addColorStop(0, '#5aa86a');
    band.addColorStop(1, '#37794a');
    c.fillStyle = band;
    shareRoundRect(c, -40, -80, W + 80, 372, 44);
    c.fill();

    /* 装饰光圈 */
    c.globalAlpha = 0.12;
    c.fillStyle = '#ffffff';
    c.beginPath(); c.arc(W - 92, 40, 74, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(W - 178, 152, 32, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1;

    shareLabel(c, '🌾 我的小农场', 44, 72, 21, 'rgba(255,255,255,.94)', { weight: 700 });
    shareLabel(c, '第 ' + d.day + ' 天 · ' + d.season + '季', W - 44, 72, 19, 'rgba(255,255,255,.9)',
      { align: 'right', weight: 600 });

    shareLabel(c, '第 ' + d.day + ' 天的农场主', 44, 158, 44, '#ffffff', { weight: 800 });
    shareLabel(c, d.weather.emoji + ' ' + d.weather.name + ' · 已经种下 ' + d.planted + ' 块地',
      44, 202, 19, 'rgba(255,255,255,.88)', { weight: 600 });

    /* 金币卡 */
    c.save();
    c.shadowColor = 'rgba(102,78,44,.20)';
    c.shadowBlur = 26;
    c.shadowOffsetY = 10;
    shareRoundRect(c, 40, 246, W - 80, 156, 26);
    c.fillStyle = '#fffdf7';
    c.fill();
    c.restore();

    shareLabel(c, '💰 金币', 72, 292, 16, '#9a866c', { weight: 700 });
    c.font = '800 60px ' + SHARE_FONT;
    c.fillStyle = '#d9a32c';
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
    const coinsTxt = String(d.coins);
    c.fillText(coinsTxt, 70, 366);
    const coinW = c.measureText(coinsTxt).width;
    shareLabel(c, '金', 70 + coinW + 10, 366, 20, '#b98d2f', { weight: 700 });
    shareLabel(c, '成就 ' + d.achPts + ' 点', W - 72, 292, 15, '#9a866c', { align: 'right', weight: 700 });
    shareLabel(c, '土地 ' + d.plots + ' 块', W - 72, 366, 24, '#6d5b45', { align: 'right', weight: 800 });

    /* 六宫格数据 */
    const tiles = [
      ['🏞️ 土地', d.plots + ' 块'],
      ['🌱 种田', 'Lv' + d.farmLv],
      ['🎣 钓鱼', 'Lv' + d.fishLv],
      ['🏆 成就', d.achPts + ' / ' + d.achMax + ' 点'],
      ['🧺 累计收获', d.harvests + ' 次'],
      ['🐟 累计渔获', d.catches + ' 条']
    ];
    const gap = 16;
    const tw = (W - 80 - gap * 2) / 3;
    const th = 118;
    tiles.forEach(function (t, i) {
      const x = 40 + (i % 3) * (tw + gap);
      const y = 430 + Math.floor(i / 3) * (th + gap);
      c.save();
      c.shadowColor = 'rgba(102,78,44,.10)';
      c.shadowBlur = 14;
      c.shadowOffsetY = 4;
      shareRoundRect(c, x, y, tw, th, 20);
      c.fillStyle = 'rgba(255,253,247,.95)';
      c.fill();
      c.restore();
      c.strokeStyle = 'rgba(122,96,60,.12)';
      c.lineWidth = 1;
      shareRoundRect(c, x, y, tw, th, 20);
      c.stroke();
      shareLabel(c, t[0], x + 18, y + 40, 14, '#9a866c', { weight: 700 });
      shareLabel(c, t[1], x + 18, y + 86, t[1].length > 8 ? 21 : 27, '#3d3122', { weight: 800 });
    });

    /* 农场一角 */
    const y0 = 430 + 2 * (th + gap) + 48;
    shareLabel(c, '🌾 农场一角', 44, y0, 17, '#6d5b45', { weight: 700 });
    shareLabel(c, d.emojis.length ? d.emojis.join('  ') : '🌱 还没播种', 44, y0 + 58, 33, '#3d3122',
      { weight: 700 });

    /* 页脚 */
    c.strokeStyle = 'rgba(122,96,60,.16)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(44, 896);
    c.lineTo(W - 44, 896);
    c.stroke();
    shareLabel(c, '我的小农场 · GUI 版', 44, 932, 15, '#9a866c', { weight: 600 });
    shareLabel(c, shareDateText(d.today), W - 44, 932, 15, '#9a866c', { align: 'right', weight: 600 });

    return cv;
  }

  /* 不支持 canvas 时退回文字版名片 */
  function shareTextCard(d) {
    return '<div class="share-fallback">' +
      '<div class="share-fb-day">第 ' + d.day + ' 天 · ' + d.season + '季 · ' + d.weather.emoji + ' ' + d.weather.name + '</div>' +
      '<div class="share-fb-coins">💰 ' + d.coins + ' 金</div>' +
      '<div class="share-fb-grid">' +
        '<div><b>🏞️ ' + d.plots + ' 块</b><span>土地</span></div>' +
        '<div><b>🌱 Lv' + d.farmLv + '</b><span>种田</span></div>' +
        '<div><b>🎣 Lv' + d.fishLv + '</b><span>钓鱼</span></div>' +
        '<div><b>🏆 ' + d.achPts + '</b><span>成就点</span></div>' +
        '<div><b>🧺 ' + d.harvests + '</b><span>次收获</span></div>' +
        '<div><b>🐟 ' + d.catches + '</b><span>条渔获</span></div>' +
      '</div>' +
      '<div class="shop-tip">这个浏览器不支持导出图片，先看文字版名片。</div>' +
    '</div>';
  }

  function saveSharePng(cv, d) {
    const name = '小农场名片-D' + d.day + '-' + shareDateText(d.today) + '.png';
    const go = function (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () {
        if (String(url).indexOf('blob:') === 0 && window.URL && URL.revokeObjectURL) {
          URL.revokeObjectURL(url);
        }
      }, 100);
      toast('名片已保存 ⬇️', 'good');
    };
    try {
      if (cv.toBlob && window.URL && URL.createObjectURL) {
        cv.toBlob(function (blob) {
          if (blob) go(URL.createObjectURL(blob));
          else go(cv.toDataURL('image/png'));
        }, 'image/png');
      } else {
        go(cv.toDataURL('image/png'));
      }
    } catch (e) {
      toast('导出失败：这个浏览器不支持图片导出', 'bad');
    }
  }

  function shareCardModal() {
    const d = shareCardData(state);
    let cv = null;
    try { if (shareSupported()) cv = drawShareCard(d); } catch (e) { cv = null; }
    const body = cv
      ? '<div class="share-preview"><img alt="农场名片预览" src="' + cv.toDataURL('image/png') + '"></div>' +
        '<div class="shop-tip">图片在本机生成，不会上传任何数据。</div>'
      : shareTextCard(d);
    openModal('🖼️ 分享名片', body,
      '<button class="btn" data-close>关闭</button>' +
      (cv ? '<button class="btn primary" id="do-share-save">⬇️ 下载图片</button>' : ''),
      { onMount: function (root) {
          const btn = root && root.querySelector ? root.querySelector('#do-share-save') : null;
          if (btn && cv) btn.addEventListener('click', function () { saveSharePng(cv, d); });
        } });
  }

  /* 方便直接看效果 / 截图：我的小农场.html#share */
  if (typeof location !== 'undefined' && location.hash === '#share') {
    setTimeout(shareCardModal, 0);
  }

  /* ===== 17-cook.js ===== */
/* 我的小农场 · 界面层 / 17-cook.js
 * 厨房弹窗 / 吃午饭
 * 由 build-ui.cjs 按文件名顺序拼进 ui.js（共享同一个 IIFE 作用域），不要单独加载。
 */

  /* 厨房分页：all / level / skill / shop / chest */
  let cookTab = 'all';

  function foodRowsHtml(allowEat) {
    let groups = G.foodGroups(state);
    if (allowEat) groups = groups.filter(function (g) { return g.rid !== 'fail'; });
    if (!groups.length) return '<div class="store-empty">仓库里没有能吃的菜，先去做两道 🍳</div>';
    const eaten = G.lunchEaten(state);
    return groups.map(function (g) {
      const q = G.qualityById(g.q);
      const left = G.foodDaysLeft(g, state.day);
      return '<div class="store-row">' +
        '<span class="se">' + esc(g.emoji || '🍲') + '</span>' +
        '<div><div class="sn">' + esc(g.name) + (g.n > 1 ? ' ×' + g.n : '') +
          (q ? ' <b class="own">' + q.emoji + q.name + '</b>' : '') + '</div>' +
        '<div class="sv">+' + (g.energy || 0) + ' 体力 · <span class="' +
          (left <= 1 ? 'exp-soon' : '') + '">' +
          (left <= 0 ? '今天到期' : '还剩 ' + left + ' 天') + '</span></div></div>' +
        (allowEat
          ? '<span class="spw"><button class="btn mini" data-eatfood="' + g.key + '"' +
            (eaten ? ' disabled' : '') + '>吃</button></span>'
          : '') +
      '</div>';
    }).join('');
  }

  function cookCard(r) {
    const known = G.recipeKnown(state, r);
    const lockText = G.recipeLockText(state, r);
    const locked = !known || !!lockText;
    const have = G.cookHave(state, r);
    const canDo = !locked && have && state.energy >= r.energy && G.cookLeft(state) > 0;
    return '<div class="cook-card' + (locked ? ' locked' : '') + '">' +
      '<div class="cc-head"><span class="cc-e">' + r.emoji + '</span>' +
        '<b>' + esc(r.name) + '</b><span class="cc-lv">Lv' + r.lv + '</span></div>' +
      '<div class="cc-desc">' + esc(r.desc || '') + '</div>' +
      '<div class="cc-row">' + G.ingredientText(r) + '</div>' +
      '<div class="cc-row">耗 ' + r.energy + ' 体力 · 回复 +' + r.restore + ' 体力 · 保质 ' +
        r.days + ' 天 · ' + (r.fishPriced
          ? '按鱼价 ×' + r.priceMul + ' 折算'
          : '约 ' + r.price + ' 金') + '</div>' +
      '<div class="cc-row cc-req">' + G.recipeReqText(r) + '</div>' +
      (locked
        ? '<div class="cc-lock">' + (known ? '还需 ' + lockText : lockText) + '</div>'
        : '<button class="btn mini" data-cook="' + r.id + '"' + (canDo ? '' : ' disabled') + '>' +
          (!have ? '缺食材（' + G.qualityById(G.BALANCE.cook.minQuality).name + '+）'
            : state.energy < r.energy ? '体力不够'
              : G.cookLeft(state) <= 0 ? '今日份数用完' : '烹饪') + '</button>') +
    '</div>';
  }

  function kitchenModal() {
    const unlocked = G.kitchenUnlocked(state);
    const lv = G.cookLv(state);
    const xp = (state.levels && state.levels.cookXp) || 0;
    const all = G.cookRecipes();
    const groups = [
      { id: 'level', title: '⭐ 等级食谱',
        list: all.filter(function (r) { return !r.source && !r.req; }) },
      { id: 'skill', title: '🌱 技能食谱 · 种田 / 钓鱼 / 采集',
        list: all.filter(function (r) { return !r.source && r.req; }) },
      { id: 'shop', title: '🏬 百货店配方 · 交易等级', list: G.shopRecipes() },
      { id: 'chest', title: '🎁 宝箱配方 · 铁箱 / 金箱',
        list: all.filter(function (r) { return r.source === 'iron' || r.source === 'gold'; }) }
    ];
    const tabs = [{ id: 'all', name: '全部' }].concat(groups.map(function (g) {
      return { id: g.id, name: g.title.split(' ')[1] || g.title };
    }));
    const tabHtml = '<div class="rule-tabs cook-tabs">' + tabs.map(function (t) {
      return '<button class="rule-tab' + (cookTab === t.id ? ' on' : '') +
        '" data-cooktab="' + t.id + '">' + t.name + '</button>';
    }).join('') + '</div>';
    const shown = cookTab === 'all' ? groups : groups.filter(function (g) { return g.id === cookTab; });
    const body = unlocked
      ? '<div class="cook-top">🍳 烹饪 <b>Lv' + lv + '</b> · 经验 ' + xp + '/' + G.levelNeed(lv, 'cook') +
          ' · 今日 <b>' + G.cookLeft(state) + '/' + G.cookDailyLimit(state) + '</b> 份' +
          ' · 做砸 ' + Math.round(G.cookFail(state) * 100) + '% · 品质取 ' +
          G.cookRolls(state) + ' 次最好</div>' + tabHtml +
        shown.map(function (g) {
          return '<div class="cook-sec"><div class="cook-sec-t">' + g.title +
            ' <span>' + g.list.length + ' 道</span></div>' +
            '<div class="cook-grid">' + g.list.map(cookCard).join('') + '</div></div>';
        }).join('')
      : '<div class="shop-tip">厨房还没解锁：<b>种田 Lv' + G.BALANCE.cook.unlockFarm + ' + 钓鱼 Lv' +
          G.BALANCE.cook.unlockFish + '</b> 后开张。<br>解锁后能拿作物 / 渔获 / 野货做菜，' +
          '菜有保质期，吃了回体力，也能进收购箱卖。</div>';
    openModal('🍳 厨房', body, '<button class="btn" data-close>关闭</button>');
  }

  function lunchModal() {
    const body = '<div class="shop-tip">每天只能吃一次，回复菜品的体力；' +
      '<b>放得越久，回复和卖价越低</b>。' +
      (G.kitchenUnlocked(state)
        ? (G.lunchEaten(state) ? '今天已经吃过了 ✅' : '今天还没吃，不吃的话今晚伙食费 <b>×' +
            G.BALANCE.meal.skipLunchMul + '</b>。')
        : '厨房解锁后才生效。') + '</div>' + foodRowsHtml(true);
    openModal('🍽️ 吃午饭', body, '<button class="btn" data-close>关闭</button>');
  }

})();
