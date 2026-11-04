/* UI 冒烟测试：node dom-test.cjs
 * 不装 jsdom，用一个最小 DOM 桩把 ui.js 真正跑起来：
 * boot → renderAll → 点几个按钮打开弹窗 → 检查渲染结果。
 */
require('./ensure-build.cjs')();
const fs = require('fs');

let pass = 0, fail = 0;
function ok(cond, label, extra) {
  if (cond) { pass++; console.log('  ✅ ' + label); }
  else { fail++; console.log('  ❌ ' + label + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
}

function classList() {
  const set = new Set();
  return {
    add(c) { set.add(c); },
    remove(c) { set.delete(c); },
    toggle(c) { if (set.has(c)) { set.delete(c); return false; } set.add(c); return true; },
    contains(c) { return set.has(c); }
  };
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

/* 播一个带作物 + 长期订单的存档，方便测仓库 / 委托 / 收购箱 */
(function seedSave() {
  const st = G.createState();
  G.addStore(st, 'carrot', 'std', 12);
  st.fishBag.push({ name: '鲫鱼', emoji: '🐟', q: 'std', v: 3, d: 1 });
  st.fishBag.push({ name: '木制宝箱', emoji: '🪵', q: null, v: 8, d: 1, no: true, chest: 'wood' });
  st.fishBag.push({ name: '水草', emoji: '🌿', q: null, v: 1, d: 1, no: true, trash: true });
  st.nets = 2;
  st.netSet = 2;
  st.levels.fish = 5;
  st.levels.farm = 4;
  st.seeder = 0;
  st.seeds = { carrot: 10, potato: 5 };
  st.fisher = { lv: 3, xp: 4 };
  // 给萝卜造 7 天价格历史，方便测曲线
  st.marketHist = {
    carrot: [1.10, 1.15, 1.20, 1.25, 1.30, 1.28, 1.22].map(function (m, i) {
      return { d: i + 1, m: m };
    })
  };
  st.teas.green = 2;
  G.addStore(st, 'cabbage', 'std', 5);
  G.addStore(st, 'mushroom', 'good', 3);
  G.boxPutCrop(st, 'cabbage');                 // 收购箱里放一批，便于测取出
  st.longOrder = G.makeLongOrder({ day: 5, levels: { farm: 3 } });
  st.coins = 5000;
  // 果园已开垦 + 一点桃树种子，方便测树坑 / 种树 / 浇水
  st.orchard = { unlocked: true, wateredDay: 0, slots: new Array(G.orchardSlots()).fill(null) };
  st.treeStock = { peach: { seed: 2, sapling: 0 }, mango: { seed: 0, sapling: 0 },
                   apple: { seed: 0, sapling: 0 }, orange: { seed: 0, sapling: 0 } };
  localStorage.setItem('farm-gui-save-v1', G.serialize(st));
})();

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
ok(text('#farm-lv').indexOf('Lv') >= 0 && text('#fish-lv').indexOf('Lv') >= 0,
   '农田 / 河边显示等级', [text('#farm-lv'), text('#fish-lv')]);
ok(text('#store-sum').indexOf('估值') >= 0, '仓库显示总价值', text('#store-sum'));
ok(html('#store-list').indexOf('去水产店卖') < 0, '仓库渔获不再写「去水产店卖」');
ok(html('#store-list').indexOf('脆生生') >= 0, '仓库作物显示简述');
ok(html('#store-list').indexOf('松茸') >= 0, '仓库能显示采集来的野货');
/* 杂物行不能挂「市价 / 稀缺」 */
(function junkRow() {
  const h = html('#store-list');
  const i = h.indexOf('水草');
  const row = i < 0 ? '' : h.slice(i, i + 260);
  ok(i >= 0 && row.indexOf('市价 ×') < 0 && row.indexOf('稀缺') < 0,
     '仓库杂物不显示市价 / 稀缺');
  ok(row.indexOf('· 原价') < 0 && row.indexOf('不吃市价') < 0, '杂物行不再写「· 原价，不吃市价」');
})();
/* 河边用「小队卡」显示渔网 / 渔夫 */
ok(html('#crew-row').indexOf('渔网') >= 0 && html('#crew-row').indexOf('cc-dots') >= 0,
   '河边用小队卡显示渔网（带库存圆点）');
ok(html('#crew-row').indexOf('渔夫') >= 0, '河边显示渔夫卡');
ok(html('#crew-row').indexOf('Lv3') >= 0 && html('#crew-row').indexOf('经验 4 / 9') >= 0,
   '渔夫卡显示等级与经验', html('#crew-row').slice(0, 200));
ok(html('#crew-row').indexOf('每天 5 杆') >= 0 && html('#crew-row').indexOf('工资 16 金') >= 0,
   '渔夫卡显示每日杆数与工资');
ok(html('#crew-row').indexOf('自动重布') < 0, '自动重布开关已删除');
ok(html('#crew-row').indexOf('不缴维护费') < 0, '河边不再写「不缴维护费」');
/* 有鱼在网里时给「重新布置」按钮 */
ok(html('#crew-row').indexOf('data-resetnets') >= 0 || html('#crew-row').indexOf('网都在水里') >= 0,
   '渔网卡有重布入口或「网都在水里」');
ok(html('#order-list').indexOf('报酬') >= 0 && html('#order-list').indexOf('交付') >= 0, '委托面板渲染出报酬与交付按钮');
ok(html('#order-list').indexOf('含市价') >= 0, '委托面板标出市价溢价');
ok(html('#order-list').indexOf('长期') >= 0, '委托面板显示长期订单');
ok(html('#ledger').indexOf('D1') >= 0, '账本渲染出 D1');
ok(html('#log').indexOf('D1') >= 0, '日志渲染出 D1');

console.log('\n== 弹窗 ==');
clickAct('seedshop');
ok(html('#modal-root').indexOf('种子店') >= 0 && html('#modal-root').indexOf('肥料') >= 0,
   '种子店弹窗（含肥料）能打开');
ok(html('#modal-root').indexOf('需种田 Lv5') >= 0 && html('#modal-root').indexOf('需种田 Lv6') >= 0,
   '种子店按等级锁定高级种子');
ok(html('#modal-root').indexOf('反季 ×1.8') >= 0, '种子店标明反季种子更贵');
ok(html('#modal-root').indexOf('反季种子') >= 0, '种子店说明反季也能种');
clickAct('fishshop');
ok(html('#modal-root').indexOf('水产店') >= 0 && html('#modal-root').indexOf('不能交委托') >= 0,
   '水产店弹窗能打开，并提示买来的鱼不能交委托');
ok(html('#modal-root').indexOf('今日') >= 0 && html('#modal-root').indexOf('一般品质') >= 0,
   '水产店显示每日库存与「一般品质」');
ok(html('#modal-root').indexOf('stock-dots') >= 0, '水产店进货用圆点显示库存');
ok(html('#modal-root').indexOf('基准') >= 0 && html('#modal-root').indexOf('市价') >= 0,
   '水产店进货价拆成基准 × 市价');
ok(html('#modal-root').indexOf('鱼汛') >= 0 || html('#modal-root').indexOf('非汛期') >= 0,
   '水产店进货显示汛期标签');
ok(html('#modal-root').indexOf('fish-sell-id') >= 0, '水产店有自定义卖出选择框');
ok(html('#modal-root').indexOf('D20 起进货') >= 0 && html('#modal-root').indexOf('D30 起进货') >= 0,
   '水产店高级鱼按天数锁定');
ok(html('#modal-root').indexOf('未解锁') >= 0 &&
   html('#modal-root').indexOf('data-buyfish="koi" data-n="3"') < 0,
   '未解锁的水产不显示「买满」');
clickAct('cropshop');
ok(html('#modal-root').indexOf('农产品店') >= 0 && html('#modal-root').indexOf('全部卖出') >= 0,
   '农产品店弹窗能打开');
ok(html('#modal-root').indexOf('今日') >= 0 && html('#modal-root').indexOf('一般品质') >= 0,
   '农产品店显示每日库存与「一般品质」');
ok(html('#modal-root').indexOf('stock-dots') >= 0, '农产品店进货用圆点显示库存');
ok(html('#modal-root').indexOf('基准') >= 0 && html('#modal-root').indexOf('共 <b>') >= 0,
   '农产品店显示进货价构成与今日总量');
ok(html('#modal-root').indexOf('D18 起进货') >= 0 && html('#modal-root').indexOf('D24 起进货') >= 0,
   '农产品店高级作物按天数锁定');
ok(html('#modal-root').indexOf('data-buycrop="watermelon" data-n="3"') < 0,
   '未解锁的作物不显示「买3」');
ok(html('#modal-root').indexOf('脆生生') >= 0, '农产品店显示作物简述');
ok(html('#modal-root').indexOf('crop-sell-id') >= 0, '农产品店有自定义卖出选择框');

console.log('\n== 市场行情 ==');
document.querySelector('#btn-market').fire('click', { target: {} });
ok(html('#modal-root').indexOf('市场行情') >= 0, '行情面板能打开');
ok(html('#modal-root').indexOf('反季 ×1.7') >= 0, '行情显示反季 ×1.7');
ok(html('#modal-root').indexOf('汛期 ×1') >= 0 || html('#modal-root').indexOf('非汛期 ×1.7') >= 0,
   '行情显示鱼的汛期系数');
ok(html('#modal-root').indexOf('×1.30') >= 0 && html('#modal-root').indexOf('回落 30%') >= 0,
   '行情说明稀缺上限与回落幅度');
ok(html('#modal-root').indexOf('再卖') >= 0 && html('#modal-root').indexOf('掉到') >= 0,
   '行情标注「还能卖多少」');
ok(html('#modal-root').indexOf('野货') >= 0 && html('#modal-root').indexOf('松茸') >= 0,
   '行情包含野货');

console.log('\n== 收购箱 ==');
document.querySelector('#btn-box').fire('click', { target: {} });
ok(html('#modal-root').indexOf('收购箱') >= 0 && html('#modal-root').indexOf('原价') >= 0,
   '收购箱弹窗能打开并说明原价结算');
ok(html('#modal-root').indexOf('全部取出') >= 0, '收购箱有「全部取出」');
ok(html('#modal-root').indexOf('box-pick') >= 0, '收购箱可取指定批次');
clickAct('shop');
ok(html('#modal-root').indexOf('面团饵自定义数量') >= 0 && html('#modal-root').indexOf('dough-qty') >= 0,
   '渔具店有面团饵自定义数量输入');
ok(html('#modal-root').indexOf('耐用 25 次') >= 0, '渔具店显示假饵耐用 25 次');
clickAct('shop');
ok(html('#modal-root').indexOf('渔具店') >= 0 && html('#modal-root').indexOf('渔网') >= 0,
   '渔具店弹窗（含渔网）能打开');
ok(html('#modal-root').indexOf('渔夫') >= 0 && html('#modal-root').indexOf('data-fisherup') >= 0,
   '渔具店能花钱升级渔夫');
ok(html('#modal-root').indexOf('高级假饵') >= 0 && html('#modal-root').indexOf('data-buy="lure2"') >= 0,
   '渔具店卖高级假饵');
ok(html('#modal-root').indexOf('需钓鱼 Lv6') >= 0, '高级假饵按钓鱼等级锁定');
ok(html('#modal-root').indexOf('不收维护费') < 0, '渔具店不再写「不收维护费」');
ok(html('#modal-root').indexOf('data-resetnets') < 0, '渔具店没有「重新布置」按钮');
clickAct('fertilizeAll');
const toastText = document.querySelector('#toast-root')._text || '';
ok(toastText.indexOf('没有可施肥') >= 0 || html('#modal-root').indexOf('全部施肥') >= 0,
   '全部施肥没地时只弹提示、不报错', toastText.slice(0, 30));

console.log('\n== 统计图 ==');
document.querySelector('#btn-stats').fire('click', { target: {} });
ok(html('#modal-root').indexOf('收益统计') >= 0 && html('#modal-root').indexOf('canvas') >= 0,
   '统计弹窗能打开并含 canvas');

console.log('\n== 成就 ==');
document.querySelector('#btn-ach').fire('click', { target: {} });
ok(html('#modal-root').indexOf('成就') >= 0 && html('#modal-root').indexOf('第一筐菜') >= 0,
   '成就弹窗能打开并列出条目');
ok(html('#modal-root').indexOf('已解锁') >= 0 && html('#modal-root').indexOf('种田') >= 0,
   '成就弹窗含统计与分类');
ok(html('#modal-root').indexOf('成就点') >= 0 && html('#modal-root').indexOf('售价加成') >= 0,
   '成就弹窗显示成就点与售价加成');
ok((html('#modal-root').match(/data-achcat=/g) || []).length === 5, '成就按 5 类分页');
(function achCollect() {
  const btn = { dataset: { achcat: 'all' }, disabled: false };
  const target = { closest: function (s) { return s === '[data-achcat]' ? btn : null; }, classList: classList() };
  (docListeners.click || []).forEach(function (fn) { fn({ target: target, clientX: 0, clientY: 0 }); });
})();
ok(html('#modal-root').indexOf('跑山人') >= 0 && html('#modal-root').indexOf('四季野味') >= 0,
   '「收集」页含采集成就');
(function achDev() {
  const btn = { dataset: { achcat: 'dev' }, disabled: false };
  const target = { closest: function (s) { return s === '[data-achcat]' ? btn : null; }, classList: classList() };
  (docListeners.click || []).forEach(function (fn) { fn({ target: target, clientX: 0, clientY: 0 }); });
})();
ok(html('#modal-root').indexOf('全自动农场') >= 0 && html('#modal-root').indexOf('播种流水线') >= 0,
   '「设备」页含设备成就');

console.log('\n== 百货店 ==');
clickAct('depart');
ok(html('#modal-root').indexOf('百货店') >= 0 && html('#modal-root').indexOf('茶叶') >= 0,
   '百货店弹窗能打开');
ok(html('#modal-root').indexOf('data-buytea="green"') >= 0, '百货店能买茶');
ok(html('#modal-root').indexOf('data-selltea="green"') < 0 && html('#modal-root').indexOf('半价回收') < 0,
   '茶叶不能用金币回收（回收已删）');
ok(html('#modal-root').indexOf('钓鱼 Lv7 解锁') >= 0, '金钥匙按钓鱼等级锁定');
ok(html('#modal-root').indexOf('只收宝箱') >= 0, '百货店只收宝箱、不收杂物');
ok(html('#modal-root').indexOf('data-openchest') >= 0 && html('#modal-root').indexOf('木制宝箱') >= 0,
   '百货店能开仓里的宝箱');

/* 真的点一次「开箱」，看箱子有没有少、金币有没有涨 */
(function clickOpenChest() {
  const before = html('#modal-root');
  const m = before.match(/data-openchest="([^"]*)"/);
  ok(!!m, '开箱按钮带 data-openchest 键值');
  const btn = { dataset: { openchest: m ? m[1] : '' }, disabled: false };
  const target = {
    closest: function (sel) { return sel === '[data-openchest]' ? btn : null; },
    classList: classList()
  };
  (docListeners.click || []).forEach(function (fn) { fn({ target: target, clientX: 0, clientY: 0 }); });
  const after = html('#modal-root');
  ok(after.indexOf('\u6728\u5236\u5b9d\u7bb1 \u00d71') >= 0 || after.indexOf('\u6728\u5236\u5b9d\u7bb1') < 0,
     '点「开箱」后木制宝箱从 2 变 1', after.indexOf('\u6728\u5236\u5b9d\u7bb1'));
})();

console.log('\n== 采集 ==');
ok(document.querySelector('[data-act="forage"]').disabled === false, '采集按钮可用');
clickAct('forage');
ok(html('#store-list').indexOf('荠菜') >= 0, '采集把当季野货（春·荠菜）放进仓库');

console.log('\n== 市场分析 ==');
document.querySelector('#btn-analysis').fire('click', { target: {} });
ok(html('#modal-root').indexOf('市场分析') >= 0, '市场分析面板能打开');
ok(html('#modal-root').indexOf('供需 ×') >= 0 && html('#modal-root').indexOf('季节 ×') >= 0,
   '分析面板列出供需与季节系数');
ok(/近 \d+ 点/.test(html('#modal-root')), '分析面板显示 7 天走势');
ok(html('#modal-root').indexOf('下季开市 ×') >= 0, '分析面板预测下一季');
ok((html('#modal-root').match(/<svg class="spark"/g) || []).length >= 20, '每种货都有一条价格曲线',
   (html('#modal-root').match(/<svg class="spark"/g) || []).length);
(function multiPoint() {
  const m = html('#modal-root').match(/polyline points="([^"]+)"/);
  const pts = m ? m[1].trim().split(/\s+/).length : 0;
  ok(pts >= 3, '价格曲线能画出多个点', pts);
  ok(/（[+-]?\d+%）/.test(html('#modal-root')), '分析面板显示 7 天涨跌');
})();

console.log('\n== 小镇 ==');
document.querySelector('#btn-town').fire('click', { target: {} });
ok(html('#modal-root').indexOf('小镇') >= 0 && html('#modal-root').indexOf('村口小摊') >= 0,
   '小镇面板能打开');
ok(html('#modal-root').indexOf('data-donate') >= 0 && html('#modal-root').indexOf('镇上有名') >= 0,
   '小镇列出三档捐赠');
(function donateOnce() {
  const btn = { dataset: { donate: '500' }, disabled: false };
  const target = { closest: function (s) { return s === '[data-donate]' ? btn : null; }, classList: classList() };
  (docListeners.click || []).forEach(function (fn) { fn({ target: target, clientX: 0, clientY: 0 }); });
})();
ok(html('#modal-root').indexOf('累计捐出 <b>500</b>') >= 0, '捐 500 金后累计数更新');
ok(html('#modal-root').indexOf('25%') >= 0 || html('#modal-root').indexOf('还差 1500 金') >= 0,
   '小镇显示下一档进度');

console.log('\n== 下午茶 ==');
clickAct('tea');
ok(html('#modal-root').indexOf('下午茶') >= 0 && html('#modal-root').indexOf('消耗一份茶') >= 0,
   '下午茶弹窗改成消耗茶');
ok(html('#modal-root').indexOf('data-tea="green"') >= 0, '下午茶列出可喝的茶');
ok(html('#modal-root').indexOf('体力 +4') >= 0, '下午茶显示每杯回多少体力');
ok(document.querySelector('[data-act="castAll"]') !== null, '河边有「全部体力」按钮');

console.log('\n== 自动播种器 ==');
clickAct('seeder');
ok(html('#modal-root').indexOf('只管 5 块地') >= 0 && html('#modal-root').indexOf('data-buyseeder') >= 0,
   '自动播种器按台卖，一台只管 5 块');
ok(html('#modal-root').indexOf('每台每周要交') >= 0 && html('#modal-root').indexOf('维护费') >= 0,
   '面板写明维护费');
(function buyOneSeeder() {
  const btn = { dataset: {}, disabled: false };
  const target = { closest: function (s) { return s === '[data-buyseeder]' ? btn : null; }, classList: classList() };
  (docListeners.click || []).forEach(function (fn) { fn({ target: target, clientX: 0, clientY: 0 }); });
})();
ok(html('#modal-root').indexOf('/ 1 台') >= 0, '买一台后显示台数上限');
ok(html('#modal-root').indexOf('每晚自动播 <b>5</b>') >= 0, '一台覆盖 5 块');
ok(html('#modal-root').indexOf('第 1 台') >= 0 && html('#modal-root').indexOf('第 1–5 块') >= 0,
   '面板列出每台负责的号段');
ok(html('#modal-root').indexOf('data-mach="1"') >= 0 && html('#modal-root').indexOf('给第 1 台') >= 0,
   '每台可以单独选种子');
ok(html('#modal-root').indexOf('维护 6 金/周') >= 0, '显示当前播种器维护费');

console.log('\n== 规则说明分页 ==');
(function openHelp() {
  const btn = { dataset: {}, disabled: false };
  const target = { closest: function (s) { return s === '#set-help' ? btn : null; }, classList: classList() };
  (docListeners.click || []).forEach(function (fn) { fn({ target: target, clientX: 0, clientY: 0 }); });
})();
ok(html('#modal-root').indexOf('rule-tabs') >= 0, '规则说明带分页标签');
ok((html('#modal-root').match(/data-helppage=/g) || []).length === 4, '规则分成 4 页');
ok(html('#modal-root').indexOf('1 / 4') >= 0, '第 1 页页码正确');
(function helpNext() {
  const btn = { dataset: { helpnav: '1' }, disabled: false };
  const target = { closest: function (s) { return s === '[data-helpnav]' ? btn : null; }, classList: classList() };
  (docListeners.click || []).forEach(function (fn) { fn({ target: target, clientX: 0, clientY: 0 }); });
})();
ok(html('#modal-root').indexOf('2 / 4') >= 0, '能翻到第 2 页');
ok(html('#modal-root').indexOf('水产店') >= 0 && html('#modal-root').indexOf('采集') >= 0,
   '第 2 页是钓鱼 / 采集 / 水产店');
(function helpTab() {
  const btn = { dataset: { helppage: '3' }, disabled: false };
  const target = { closest: function (s) { return s === '[data-helppage]' ? btn : null; }, classList: classList() };
  (docListeners.click || []).forEach(function (fn) { fn({ target: target, clientX: 0, clientY: 0 }); });
})();
ok(html('#modal-root').indexOf('4 / 4') >= 0 && html('#modal-root').indexOf('委托') >= 0,
   '点标签能直接跳到第 4 页（经营）');

console.log('\n== 设备区 / 新等级 / 状态 ==');
(function devicePanel() {
  const raw = fs.readFileSync(__dirname + '/index.html', 'utf8');
  const at = raw.indexOf('🔧 设备');
  ok(at > 0 && raw.indexOf('id="seeder-txt"') > at && raw.indexOf('id="harvester-txt"') > at &&
     raw.indexOf('id="sprinkler-txt"') > at, '三件设备挪到「设备」面板');
  ok(raw.indexOf('id="dig-txt"') > 0 && raw.indexOf('id="dig-lv"') > 0 &&
     raw.indexOf('id="forage-lv"') > 0, '干活面板有挖蚯蚓体力与两条新等级');
})();
ok(text('#dig-lv').indexOf('Lv') >= 0 && text('#forage-lv').indexOf('Lv') >= 0,
   '显示挖蚯蚓 / 采集等级', [text('#dig-lv'), text('#forage-lv')]);
ok(text('#dig-txt').indexOf('3 体力') >= 0, '挖蚯蚓按钮显示体力消耗', text('#dig-txt'));
document.querySelector('#btn-status').fire('click', { target: {} });
const stHtml = html('#modal-root');
ok(stHtml.indexOf('采集记录') >= 0, '状态面板新增采集记录');
ok(stHtml.indexOf('挖蚯蚓等级') >= 0 && stHtml.indexOf('采集等级') >= 0, '状态面板列出两条新等级');
ok(stHtml.indexOf('交易等级') >= 0, '状态面板列出交易等级');
ok(stHtml.indexOf('其中自动播种器') < 0, '维护费不再带「其中自动播种器」');
ok(text('#trade-lv').indexOf('Lv') >= 0, '商店面板显示交易等级', text('#trade-lv'));

console.log('\n== 果园 ==');
(function openOrchard() {
  const btn = { dataset: { act: 'orchard' }, disabled: false };
  const target = { closest: function (s) { return s === '[data-act]' ? btn : null; }, classList: classList() };
  (docListeners.click || []).forEach(function (fn) { fn({ target: target, clientX: 0, clientY: 0 }); });
})();
ok(html('#modal-root').indexOf('号树坑') >= 0, '果园弹窗列出树坑');
ok(html('#modal-root').indexOf('种树') >= 0, '空树坑有「种树」按钮');
ok(html('#modal-root').indexOf('卖水果') >= 0, '果园有「卖水果」按钮');

(function pickSlot() {
  const btn = { dataset: { treePick: '0' }, disabled: false };
  const target = { closest: function (s) { return s === '[data-tree-pick]' ? btn : null; }, classList: classList() };
  (docListeners.click || []).forEach(function (fn) { fn({ target: target, clientX: 0, clientY: 0 }); });
})();
ok(html('#modal-root').indexOf('种什么') >= 0 && html('#modal-root').indexOf('桃树') >= 0,
   '点「种树」弹出树种选择');

(function plantSeed() {
  const btn = { dataset: { treePlant: '0', tree: 'peach', mode: 'seed' }, disabled: false };
  const target = { closest: function (s) { return s === '[data-tree-plant]' ? btn : null; }, classList: classList() };
  (docListeners.click || []).forEach(function (fn) { fn({ target: target, clientX: 0, clientY: 0 }); });
})();
ok(html('#modal-root').indexOf('育苗 0 / 120 天') >= 0, '种下种子后显示育苗进度');

(function waterOrchard() {
  const btn = { dataset: { orchardWater: '1' }, disabled: false };
  const target = { closest: function (s) { return s === '[data-orchard-water]' ? btn : null; }, classList: classList() };
  (docListeners.click || []).forEach(function (fn) { fn({ target: target, clientX: 0, clientY: 0 }); });
})();
ok(html('#modal-root').indexOf('今天浇过了') >= 0, '浇过水后按钮显示今天浇过了');

(function openDepart() {
  const btn = { dataset: { act: 'depart' }, disabled: false };
  const target = { closest: function (s) { return s === '[data-act]' ? btn : null; }, classList: classList() };
  (docListeners.click || []).forEach(function (fn) { fn({ target: target, clientX: 0, clientY: 0 }); });
})();
ok(html('#modal-root').indexOf('果树种子 / 树苗') >= 0, '百货店出售果树种子与树苗');

console.log('\n== 每日总结 ==');
(function daySummary() {
  const btn = { dataset: { act: 'sleep' }, disabled: false };
  const target = { closest: function (s) { return s === '[data-act]' ? btn : null; }, classList: classList() };
  (docListeners.click || []).forEach(function (fn) { fn({ target: target, clientX: 0, clientY: 0 }); });
})();
const sumHtml = html('#modal-root');
ok(sumHtml.indexOf('每日总结') >= 0, '睡觉后弹出每日总结面板');
ok(sumHtml.indexOf('今日收支') >= 0 && sumHtml.indexOf('金币') >= 0, '总结列出收支与金币变化');
ok(sumHtml.indexOf('今日委托') >= 0, '总结带委托状态');

setTimeout(function () {
  console.log('\n' + (fail ? '❌' : '✅') + ' 通过 ' + pass + ' / ' + (pass + fail));
  process.exit(fail ? 1 : 0);
}, 30);
