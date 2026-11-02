/* UI 冒烟测试：node dom-test.cjs
 * 不装 jsdom，用一个最小 DOM 桩把 ui.js 真正跑起来：
 * boot → renderAll → 点几个按钮打开弹窗 → 检查渲染结果。
 */
const fs = require('fs');

let pass = 0, fail = 0;
function ok(cond, label, extra) {
  if (cond) { pass++; console.log('  ✅ ' + label); }
  else { fail++; console.log('  ❌ ' + label + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
}

function classList() {
  return { add() {}, remove() {}, toggle() {}, contains() { return false; } };
}

class El {
  constructor(sel) {
    this.sel = sel;
    this._html = '';
    this.textContent = '';
    this.value = '';
    this.title = '';
    this.dataset = {};
    this.style = {};
    this.classList = classList();
    this.disabled = false;
    this.files = [];
    this._listeners = {};
  }
  get innerHTML() { return this._html; }
  set innerHTML(v) { this._html = String(v); }
  addEventListener(t, fn) { (this._listeners[t] = this._listeners[t] || []).push(fn); }
  fire(t, ev) { (this._listeners[t] || []).forEach(function (fn) { fn(ev || { target: {} }); }); }
  click() { this.fire('click', { target: this }); }
  appendChild(c) { this._text = (this._text || '') + (c && c.textContent || ''); }
  remove() {}
  focus() {}
  closest() { return null; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  matches() { return false; }
  getContext() {
    return {
      clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {},
      stroke() {}, fillText() {}, arc() {},
      set fillStyle(v) {}, set strokeStyle(v) {}, set font(v) {}, set textAlign(v) {}
    };
  }
}

const nodes = new Map();
const docListeners = {};
const document = {
  documentElement: { dataset: {} },
  body: new El('body'),
  querySelector(sel) {
    if (!nodes.has(sel)) nodes.set(sel, new El(sel));
    return nodes.get(sel);
  },
  querySelectorAll() { return []; },
  getElementById(id) { return document.querySelector('#' + id); },
  createElement(tag) { return new El(tag); },
  addEventListener(t, fn) { (docListeners[t] = docListeners[t] || []).push(fn); }
};

const mem = new Map();
const localStorage = {
  getItem(k) { return mem.has(k) ? mem.get(k) : null; },
  setItem(k, v) { mem.set(k, String(v)); },
  removeItem(k) { mem.delete(k); }
};

global.window = global;
global.document = document;
global.localStorage = localStorage;
window.document = document;
window.localStorage = localStorage;
window.location = { hash: '' };
window.addEventListener = function () {};
window.AudioContext = function () {
  return {
    currentTime: 0,
    destination: {},
    createOscillator() { return { type: '', frequency: {}, connect() {}, start() {}, stop() {} }; },
    createGain() {
      return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
    }
  };
};

/* 加载逻辑层 + 界面层（ui.js 会立即 boot） */
const G = require('./game.js');
require('./ui.js');

function html(sel) { return document.querySelector(sel).innerHTML; }
function text(sel) { return document.querySelector(sel).textContent; }

/* 用假事件触发 data-act 按钮 */
function clickAct(act) {
  const btn = { dataset: { act: act }, disabled: false };
  const target = {
    closest: function (sel) { return sel === '[data-act]' ? btn : null; },
    classList: classList()
  };
  (docListeners.click || []).forEach(function (fn) { fn({ target: target, clientX: 0, clientY: 0 }); });
}

console.log('== 首屏渲染 ==');
ok(html('#plot-grid').indexOf('class="plot') >= 0 && (html('#plot-grid').match(/class="plot /g) || []).length === 5,
   '农田渲染出 5 块地');
ok(text('#hud-plots').indexOf('5 块') >= 0, 'HUD 显示 5 块地', text('#hud-plots'));
ok(text('#store-sum').indexOf('总价') >= 0, '仓库显示总价值', text('#store-sum'));
ok(html('#order-list').indexOf('报酬') >= 0 && html('#order-list').indexOf('交付') >= 0, '委托面板渲染出报酬与交付按钮');
ok(html('#ledger').indexOf('D1') >= 0, '账本渲染出 D1');
ok(html('#log').indexOf('D1') >= 0, '日志渲染出 D1');

console.log('\n== 弹窗 ==');
clickAct('seedshop');
ok(html('#modal-root').indexOf('种子店') >= 0 && html('#modal-root').indexOf('肥料') >= 0,
   '种子店弹窗（含肥料）能打开');
clickAct('fishshop');
ok(html('#modal-root').indexOf('水产店') >= 0 && html('#modal-root').indexOf('不能交委托') >= 0,
   '水产店弹窗能打开，并提示买来的鱼不能交委托');
clickAct('shop');
ok(html('#modal-root').indexOf('渔具店') >= 0 && html('#modal-root').indexOf('渔网') >= 0,
   '渔具店弹窗（含渔网）能打开');
clickAct('fertilizeAll');
const toastText = document.querySelector('#toast-root')._text || '';
ok(toastText.indexOf('没有可施肥') >= 0 || html('#modal-root').indexOf('全部施肥') >= 0,
   '全部施肥没地时只弹提示、不报错', toastText.slice(0, 30));

console.log('\n== 统计图 ==');
document.querySelector('#btn-stats').fire('click', { target: {} });
ok(html('#modal-root').indexOf('收益统计') >= 0 && html('#modal-root').indexOf('canvas') >= 0,
   '统计弹窗能打开并含 canvas');

setTimeout(function () {
  console.log('\n' + (fail ? '❌' : '✅') + ' 通过 ' + pass + ' / ' + (pass + fail));
  process.exit(fail ? 1 : 0);
}, 30);
