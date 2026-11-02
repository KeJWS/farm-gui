/* 一次性脚本：从 _old.js（v1.9.0）取回成就奖励，合并到当前 ACH（保留 pts）
 * 用括号配对精确截取 reward 对象，避免嵌套对象截断 */
const fs = require('fs');

function matchBrace(str, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < str.length; i++) {
    if (str[i] === '{') depth++;
    else if (str[i] === '}') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

const oldSrc = fs.readFileSync('_old.js', 'utf8');
const startOld = oldSrc.indexOf('const ACH = [');
const endOld = oldSrc.indexOf('\n  ];', startOld);
const oldBlock = oldSrc.slice(startOld, endOld);

const rewards = {};
const idRe = /id: '(\w+)'/g;
let m;
while ((m = idRe.exec(oldBlock))) {
  const seg = oldBlock.slice(m.index, m.index + 400);
  const rIdx = seg.indexOf('reward:');
  if (rIdx < 0) continue;
  const open = seg.indexOf('{', rIdx);
  const close = matchBrace(seg, open);
  if (close < 0) continue;
  rewards[m[1]] = seg.slice(open, close + 1);
}

let src = fs.readFileSync('game.js', 'utf8');
const start = src.indexOf('const ACH = [');
const end = src.indexOf('\n  ];', start);
let block = src.slice(start, end);

let injected = 0;
let out = '';
let last = 0;
const re = /id: '(\w+)',/g;
while ((m = re.exec(block))) {
  const id = m[1];
  const ptsIdx = block.indexOf('pts:', m.index);
  if (ptsIdx < 0) continue;
  const ptsEnd = block.indexOf('}', ptsIdx);
  if (!rewards[id]) continue;
  out += block.slice(last, ptsIdx) + 'reward: ' + rewards[id] + ', ' + block.slice(ptsIdx, ptsEnd + 1);
  last = ptsEnd + 1;
  injected++;
  re.lastIndex = ptsEnd + 1;
}
out += block.slice(last);
src = src.slice(0, start) + out + src.slice(end);
fs.writeFileSync('game.js', src);
console.log('injected', injected, 'of', Object.keys(rewards).length);
