/* 静态检查：ui.js 里用到的 id / data-act 是否都在 index.html 里存在
 * node check-ui.cjs
 */
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const ui = fs.readFileSync(path.join(__dirname, 'ui.js'), 'utf8');

let fail = 0;
const bad = (msg) => { console.log('  ❌ ' + msg); fail++; };

/* 1. HTML 里定义的 id */
const htmlIds = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));

/* 2. ui.js 里 $('#xxx') 直接引用的 id */
const usedIds = new Set([...ui.matchAll(/\$\('#([\w-]+)'\)/g)].map(m => m[1]));
const dynamicIds = new Set(['do-reset', 'dough-qty', 'worm-qty']);   // 运行时才生成的元素

console.log('== id 引用 ==');
[...usedIds].sort().forEach(id => {
  if (!htmlIds.has(id) && !dynamicIds.has(id)) bad("ui.js 引用了不存在的 #" + id);
});
console.log('  检查 ' + usedIds.size + ' 个 id');

/* 3. HTML 里的 data-act */
const htmlActs = [...html.matchAll(/data-act="([^"]+)"/g)].map(m => m[1]);
/* 4. ui.js 里 ACTIONS 的键 */
const actBlock = ui.slice(ui.indexOf('const ACTIONS = {'), ui.indexOf('function floatAt'));
const uiActs = new Set([...actBlock.matchAll(/^\s{4}'?([\w-]+)'?\s*:\s*/gm)].map(m => m[1]));

console.log('== data-act 绑定 ==');
[...new Set(htmlActs)].sort().forEach(a => {
  if (!uiActs.has(a)) bad('按钮 data-act="' + a + '" 没有对应的处理函数');
});
console.log('  按钮 ' + new Set(htmlActs).size + ' 个，处理函数 ' + uiActs.size + ' 个');

/* 5. 关键结构存在性 */
const must = [
  '#plot-grid', '#store-list', '#ledger', '#log', '#seed-box',
  '[data-act="plantAll"]', '[data-act="seedshop"]', '[data-act="sleep"]',
  '[data-act="tea"]', '[data-act="expand"]', '[data-act="upgrade"]'
];
console.log('== 关键节点 ==');
must.forEach(sel => {
  const ok = sel.startsWith('[data-act')
    ? html.includes('data-act="' + sel.slice(11, -2) + '"')
    : html.includes('id="' + sel.slice(1) + '"');
  if (!ok) bad('index.html 缺少 ' + sel);
});

console.log(fail ? '\n❌ 发现 ' + fail + ' 个问题' : '\n✅ 界面绑定检查通过');
process.exit(fail ? 1 : 0);
