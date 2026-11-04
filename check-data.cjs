/* 数据表检查：node check-data.cjs
 * ------------------------------------------------------------------
 * src/data/*.json 是内容层唯一的源。这里守住四件事：
 *  - 每个 JSON 都能解析，并且真的被 build-modules.cjs 拼进了 game.js（不许有孤儿文件）
 *  - id 和键名一致、id 不重复，枚举 / 引用（宝箱、钥匙、果树→水果）都对得上
 *  - 数值合理：价格 / 产量 / 权重为正，季节是 0~3，等级在 1~上限
 *  - 跨表一致性：宝箱解锁等级跟 BALANCE.chest 一致，天气权重每季合计 100
 */
require('./ensure-build.cjs')();
const fs = require('fs');
const path = require('path');
const G = require('./game.js');

let pass = 0, fail = 0;
function ok(cond, label, extra) {
  if (cond) { pass++; console.log('  ✅ ' + label); }
  else { fail++; console.log('  ❌ ' + label + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
}

const root = __dirname;
const dataDir = path.join(root, 'src', 'data');
const B = G.BALANCE;

console.log('\n== 数据文件 ==');

const jsonFiles = fs.readdirSync(dataDir).filter(function (f) { return /\.json$/.test(f); }).sort();
ok(jsonFiles.length >= 10, 'src/data 下数据文件齐全（' + jsonFiles.length + ' 个）', jsonFiles);

const bundle = fs.readFileSync(path.join(root, 'game.js'), 'utf8');
const orphans = jsonFiles.filter(function (f) { return bundle.indexOf('src/data/' + f) < 0; });
ok(orphans.length === 0, '每个 JSON 都被拼进了 game.js', orphans);

/* 顶层重复键：JSON.parse 会静默取最后一个，复制粘贴一整块忘了改 id 就会悄悄丢数据。
 * 这里扫原始文本，数一遍深度为 1 的键（不依赖缩进格式）。 */
function topLevelKeys(text) {
  const keys = [];
  let depth = 0, i = 0, inStr = false, esc = false, buf = '';
  while (i < text.length) {
    const ch = text[i];
    if (inStr) {
      if (esc) { esc = false; buf += ch; }
      else if (ch === '\\') { esc = true; }
      else if (ch === '"') {
        inStr = false;
        let k = i + 1;
        while (k < text.length && /\s/.test(text[k])) k++;
        if (depth === 1 && text[k] === ':') keys.push(buf);
      } else { buf += ch; }
      i++;
      continue;
    }
    if (ch === '"') { inStr = true; buf = ''; i++; continue; }
    if (ch === '{' || ch === '[') depth++;
    else if (ch === '}' || ch === ']') depth--;
    i++;
  }
  return keys;
}

const dupKeys = jsonFiles.map(function (f) {
  const keys = topLevelKeys(fs.readFileSync(path.join(dataDir, f), 'utf8'));
  const seen = {}, dups = [];
  keys.forEach(function (k) { if (seen[k]) dups.push(k); seen[k] = 1; });
  return dups.length ? f + ' → ' + dups.join(', ') : null;
}).filter(Boolean);
ok(dupKeys.length === 0, '数据表没有重复的顶层键', dupKeys);

const parsed = {};
jsonFiles.forEach(function (f) {
  try {
    parsed[f] = JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf8'));
  } catch (e) {
    ok(false, f + ' 是合法 JSON', String(e.message));
  }
});

console.log('\n== 作物 CROPS ==');

const crops = G.CROPS;
const cropKeys = Object.keys(crops);
ok(cropKeys.length >= 10, '作物数量正常（' + cropKeys.length + '）');

const badCropId = cropKeys.filter(function (k) { return crops[k].id !== k; });
ok(badCropId.length === 0, '作物 id 和键名一致', badCropId);

const badSeasons = cropKeys.filter(function (k) {
  const s = crops[k].seasons;
  return !Array.isArray(s) || !s.length ||
    s.some(function (i) { return typeof i !== 'number' || i < 0 || i > 3; });
});
ok(badSeasons.length === 0, '作物季节都是 0~3 的非空数组', badSeasons);

const plantable = G.CROP_LIST;
const badPlant = plantable.filter(function (c) {
  return !(c.seed > 0) || !(c.days > 0) || !(c.price > 0) || !c.name || !c.emoji;
});
ok(badPlant.length === 0, '可种作物都有种子价 / 生长天数 / 售价 / 名称emoji', badPlant.map(function (c) { return c.id; }));

const badMulti = plantable.filter(function (c) {
  if (!c.multi) return false;
  return !(c.firstQty > 0) || !(c.regrowDays > 0) || !(c.regrowQty > 0) || !(c.regrowTimes > 0);
});
ok(badMulti.length === 0, '多次收获作物都有首茬 / 再生参数', badMulti.map(function (c) { return c.id; }));

const bothFlag = cropKeys.filter(function (k) { return crops[k].big && crops[k].multi; });
ok(bothFlag.length === 0, '大作物和多次收获互斥', bothFlag);

const badLv = cropKeys.filter(function (k) {
  const lv = crops[k].lv;
  return lv !== undefined && (lv < 1 || lv > B.level.max);
});
ok(badLv.length === 0, '作物解锁等级在 1~' + B.level.max, badLv);

const wildWithSeed = G.WILD_LIST.filter(function (c) { return c.seed || c.days || c.lv; });
ok(wildWithSeed.length === 0, '野货不进种子店 / 不需要等级', wildWithSeed.map(function (c) { return c.id; }));

const fruitWithSeed = G.FRUIT_LIST.filter(function (c) { return c.seed || c.days || !c.fruit; });
ok(fruitWithSeed.length === 0, '果园水果只从树上收（没有种子价 / 生长天数）', fruitWithSeed.map(function (c) { return c.id; }));

console.log('\n== 鱼 FISH ==');

const fishIds = G.FISH.map(function (f) { return f.id; });
ok(new Set(fishIds).size === fishIds.length, '鱼 id 不重复', fishIds);

const badFish = G.FISH.filter(function (f) {
  return !(f.base > 0) || !(f.w > 0) || !f.name || !f.emoji;
});
ok(badFish.length === 0, '鱼都有基础价 / 权重 / 名称emoji', badFish.map(function (f) { return f.id; }));

const badFishSeasons = G.FISH.filter(function (f) {
  return f.seasons && f.seasons.some(function (i) { return i < 0 || i > 3; });
});
ok(badFishSeasons.length === 0, '鱼的季节都是 0~3', badFishSeasons.map(function (f) { return f.id; }));

const chestFish = G.FISH.filter(function (f) { return f.chest; });
const badChestRef = chestFish.filter(function (f) { return !G.CHESTS[f.chest]; });
ok(badChestRef.length === 0, '宝箱鱼引用真实宝箱', badChestRef.map(function (f) { return f.id; }));

const lvPair = { iron: B.chest.ironLv, gold: B.chest.goldLv };
const badChestLv = chestFish.filter(function (f) {
  return f.chest !== 'wood' && f.lv !== lvPair[f.chest];
});
ok(badChestLv.length === 0, '宝箱解锁等级跟 BALANCE.chest 一致', badChestLv.map(function (f) { return f.id + ':' + f.lv; }));

console.log('\n== 品质 / 天气 ==');

const qMuls = G.QUALITY.map(function (q) { return q.mul; });
ok(qMuls.every(function (m, i) { return i === 0 || m >= qMuls[i - 1]; }), '品质倍率单调不降', qMuls);
ok(G.QUALITY.every(function (q) { return q.w > 0 && /^#[0-9a-f]{6}$/i.test(q.color); }),
   '品质都有正权重和合法颜色', G.QUALITY.filter(function (q) { return !(q.w > 0); }).map(function (q) { return q.id; }));

const weatherIds = Object.keys(G.WEATHER);
ok(weatherIds.length === 4 && ['sunny', 'cloudy', 'rain', 'snow'].every(function (id) { return !!G.WEATHER[id]; }),
   '晴天 / 阴天 / 雨天 / 雪天四种天气齐全', weatherIds);
ok(G.SEASON_WEATHER.length === 4, '四季天气表是 4 行', G.SEASON_WEATHER.length);

const badWeatherRow = G.SEASON_WEATHER.filter(function (row, i) {
  const keys = Object.keys(row);
  const sum = keys.reduce(function (n, k) { return n + row[k]; }, 0);
  return keys.some(function (k) { return weatherIds.indexOf(k) < 0 || row[k] < 0; }) || sum !== 100;
});
ok(badWeatherRow.length === 0, '四季权重只含已知天气且每季合计 100',
   G.SEASON_WEATHER.map(function (row) {
     return Object.keys(row).reduce(function (n, k) { return n + row[k]; }, 0);
   }));

console.log('\n== 果树 / 茶 / 宝箱 / 钥匙 / 肥料 ==');

const badTree = G.TREE_LIST.filter(function (t) {
  const c = G.CROPS[t.fruitId];
  return !c || !c.fruit || !(t.seed > 0) || !(t.sapling > 0) || !(t.price > 0) ||
    t.season < 0 || t.season > 3 || c.name !== t.fruit;
});
ok(badTree.length === 0, '果树的 fruitId 指向水果，价格为正，季节合法',
   badTree.map(function (t) { return t.id; }));

const badTreeSeason = G.TREE_LIST.filter(function (t) {
  const c = G.CROPS[t.fruitId];
  return c && c.seasons && c.seasons.indexOf(t.season) < 0;
});
ok(badTreeSeason.length === 0, '果树季节和水果季节一致', badTreeSeason.map(function (t) { return t.id; }));

const teaList = G.TEA_LIST;
ok(teaList.length >= 2 && teaList.every(function (t) { return t.price > 0 && t.energy > 0; }),
   '茶都有价格和体力', teaList.filter(function (t) { return !(t.price > 0 && t.energy > 0); }).map(function (t) { return t.id; }));

const badTeaDay = teaList.filter(function (t, i) { return i > 0 && t.day < teaList[i - 1].day; });
ok(badTeaDay.length === 0, '茶的解锁天数是递增的', badTeaDay.map(function (t) { return t.id; }));

const badChest = Object.keys(G.CHESTS).filter(function (k) {
  const c = G.CHESTS[k];
  return !(c.value > 0) || (c.key !== null && !G.KEYS[c.key]) || c.id !== k;
});
ok(badChest.length === 0, '宝箱价格为正、钥匙引用存在', badChest);

const badKey = Object.keys(G.KEYS).filter(function (k) {
  const key = G.KEYS[k];
  return !(key.price > 0) || key.lv < 1 || key.lv > B.level.max || key.id !== k;
});
ok(badKey.length === 0, '钥匙价格为正、解锁等级合法', badKey);

const badFert = Object.keys(G.FERT).filter(function (k) {
  const f = G.FERT[k];
  return !(f.cost > 0) || !(f.add > 0) || f.lv < 1 || f.lv > B.level.max || f.id !== k;
});
ok(badFert.length === 0, '肥料价格 / 加成 / 解锁等级合法', badFert);

console.log('\n== 进货表 ==');

const stockIds = Object.keys(G.SHOP_STOCK);
const badStock = stockIds.filter(function (id) {
  const r = G.SHOP_STOCK[id];
  return fishIds.indexOf(id) < 0 || !Array.isArray(r) || r.length !== 2 || r[0] < 0 || r[0] > r[1];
});
ok(badStock.length === 0, '水产店进货量格式正确、鱼种存在', badStock);

const badUnlock = Object.keys(G.FISH_UNLOCK).filter(function (id) { return fishIds.indexOf(id) < 0; })
  .concat(Object.keys(G.CROP_UNLOCK).filter(function (id) { return !crops[id]; }));
ok(badUnlock.length === 0, '中后期解锁表引用的都是已知鱼 / 作物', badUnlock);

const badUnlockDay = Object.keys(G.FISH_UNLOCK).filter(function (id) { return !(G.FISH_UNLOCK[id] > 0); })
  .concat(Object.keys(G.CROP_UNLOCK).filter(function (id) { return !(G.CROP_UNLOCK[id] > 0); }));
ok(badUnlockDay.length === 0, '解锁天数都是正数', badUnlockDay);

console.log('\n' + (fail ? '❌' : '✅') + ' 通过 ' + pass + ' / ' + (pass + fail));
process.exit(fail ? 1 : 0);
