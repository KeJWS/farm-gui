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
