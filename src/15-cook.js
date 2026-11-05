/* 厨房 / 烹饪（v2.44）
 * 食谱用作物、渔获、野货做菜；做好的美食进仓库（s.food），可吃（每天一次午饭）或进收购箱。
 * 由 build-modules.cjs 按文件名顺序拼进 game.js（共享同一个 IIFE 作用域），不要单独加载。
 */

  /* 食谱：lv = 烹饪等级门槛；energy = 做这道菜要花的体力；days = 保质期；restore = 基础回复
   * price = 固定卖价；fishPriced + priceMul = 按实际食材价折算（鱼类食谱）
   * cost.crops 里的 id 可以是作物 / 野货 / 水果（都在 CROPS 表和仓库里） */
  const RECIPES = [
    { id: 'soup', name: '蔬菜汤', emoji: '🥣', lv: 1, energy: 1, restore: 8, days: 3, price: 46,
      cost: { crops: { carrot: 2, cabbage: 1 } }, desc: '萝卜炖白菜，暖胃' },
    { id: 'grill', name: '香烤鱼', emoji: '🍢', lv: 1, energy: 1, restore: 10, days: 2,
      fishPriced: true, priceMul: 5,
      cost: { fish: 1 }, desc: '现钓现烤，鱼越贵菜越值钱' },
    { id: 'jam', name: '野莓酱', emoji: '🍯', lv: 2, energy: 1, restore: 9, days: 4, price: 66,
      cost: { crops: { berry: 2 } }, desc: '抹面包能吃一星期' },
    { id: 'stew', name: '蘑菇炖菜', emoji: '🍲', lv: 3, energy: 2, restore: 16, days: 3, price: 96,
      cost: { crops: { mushroom: 1, potato: 2 } }, desc: '松茸配土豆，鲜掉眉毛' },
    { id: 'salad', name: '水果沙拉', emoji: '🥗', lv: 4, energy: 2, restore: 14, days: 2, price: 108,
      cost: { crops: { fruit_peach: 1, berry: 2 } }, desc: '桃子野莓拌一拌' },
    { id: 'pie', name: '南瓜派', emoji: '🥧', lv: 6, energy: 2, restore: 24, days: 4, price: 188,
      cost: { crops: { pumpkin: 1, corn: 2 } }, desc: '烤得金黄，切八块' },
    { id: 'sashimi', name: '鱼生拼盘', emoji: '🍣', lv: 7, energy: 2, restore: 28, days: 1,
      fishPriced: true, priceMul: 5,
      cost: { fish: 2, crops: { carrot: 1 } }, desc: '刀工比食材更值钱' },
    { id: 'feast', name: '农家盛宴', emoji: '🍱', lv: 9, energy: 3, restore: 45, days: 3, price: 520,
      cost: { fish: 2, crops: { watermelon: 1, pumpkin: 1, mushroom: 1 } }, desc: '一桌硬菜' }
  ];

  function recipeById(id) {
    return RECIPES.filter(function (r) { return r.id === id; })[0] || null;
  }

  /* 食材只收「标准」及以上；成品品质下限 = 食材最好品质 − 1 档 */
  const COOK_MIN_RANK = Math.max(0, Q_IDS.indexOf(BALANCE.cook.minQuality));
  function cookQRank(q) { return Q_IDS.indexOf(q); }
  function cookQOk(q) { return cookQRank(q) >= COOK_MIN_RANK; }

  /* 能下锅的鱼：标准及以上、不是杂物/宝箱（买来的也行） */
  function cookFishBag(s) {
    return (s.fishBag || []).filter(function (e) {
      return e && e.q && !e.no && !e.chest && cookQOk(e.q);
    });
  }

  function cookHave(s, r) {
    if (!r) return false;
    const crops = r.cost.crops || {};
    for (const id in crops) {
      const b = s.store[id] || {};
      let n = 0;
      for (let i = COOK_MIN_RANK; i < Q_IDS.length; i++) n += b[Q_IDS[i]] || 0;
      if (n < crops[id]) return false;
    }
    if (r.cost.fish && cookFishBag(s).length < r.cost.fish) return false;
    return true;
  }

  function ingredientText(r) {
    const parts = [];
    const crops = (r && r.cost && r.cost.crops) || {};
    Object.keys(crops).forEach(function (id) {
      const c = CROPS[id];
      parts.push((c ? c.emoji + ' ' + c.name : id) + '×' + crops[id]);
    });
    if (r && r.cost && r.cost.fish) parts.push('🐟 任意鱼×' + r.cost.fish);
    return parts.join(' · ');
  }

  /* 从仓库按「标准→更好」取作物，返回用掉的品质（含最好一档） */
  function takeCookCrops(s, crops) {
    let best = -1;
    Object.keys(crops).forEach(function (id) {
      let left = crops[id];
      const b = s.store[id];
      if (!b) return;
      for (let i = COOK_MIN_RANK; i < Q_IDS.length && left > 0; i++) {
        const q = Q_IDS[i], have = b[q] || 0, take = Math.min(have, left);
        if (!take) continue;
        b[q] = have - take; left -= take;
        best = Math.max(best, i);
      }
      if (storeCount(s, id) <= 0) delete s.store[id];
    });
    return best;
  }

  /* 从渔获袋取最便宜的合规鱼，返回 { best, fish } */
  function takeCookFish(s, n) {
    const picked = cookFishBag(s).sort(function (a, b) { return a.v - b.v; }).slice(0, n);
    s.fishBag = (s.fishBag || []).filter(function (e) { return picked.indexOf(e) < 0; });
    let best = -1;
    picked.forEach(function (e) { best = Math.max(best, cookQRank(e.q)); });
    return { best: best, fish: picked };
  }

  /* 鱼类食谱按实际食材价折算基础卖价（鱼用 base 价，不含品质） */
  function cookFishBase(e) {
    const f = FISH.filter(function (x) { return x.name === e.name; })[0];
    return f ? f.base : (e.v || 1);
  }
  function cookBasePrice(s, r, fish) {
    if (!r.fishPriced) return r.price;
    let v = 0;
    const crops = r.cost.crops || {};
    Object.keys(crops).forEach(function (id) { v += (CROPS[id] ? CROPS[id].price : 0) * crops[id]; });
    fish.forEach(function (e) { v += cookFishBase(e); });
    return Math.max(6, Math.round(v * r.priceMul));
  }

  /* 做一道菜 */
  function cookMeal(s, rid) {
    const r = recipeById(rid);
    if (!r) return { ok: false, msg: '没有这个食谱' };
    if (!kitchenUnlocked(s)) return { ok: false, msg: '厨房还没解锁（种田 Lv' +
      BALANCE.cook.unlockFarm + ' + 钓鱼 Lv' + BALANCE.cook.unlockFish + '）' };
    if (cookLv(s) < r.lv) return { ok: false, msg: '烹饪 Lv' + r.lv + ' 才解锁' };
    if (cookLeft(s) <= 0) {
      return { ok: false, msg: '今天的烹饪次数用完了（' + cookDailyLimit(s) + ' 份/天）' };
    }
    const cost = r.energy;
    if (s.energy < cost) {
      return { ok: false, msg: '体力不够（做这道菜要 ' + cost + ' 点）' };
    }
    if (!cookHave(s, r)) {
      return { ok: false, msg: '食材不够（要' + qualityById(BALANCE.cook.minQuality).name + '及以上品质）：' +
        ingredientText(r) };
    }

    const crops = r.cost.crops || {};
    const cropBest = takeCookCrops(s, crops);
    const fishRes = r.cost.fish ? takeCookFish(s, r.cost.fish) : { best: -1, fish: [] };
    const ingBest = Math.max(cropBest, fishRes.best);
    const basePrice = cookBasePrice(s, r, fishRes.fish);

    s.energy -= cost;
    s.stats.cooks = (s.stats.cooks || 0) + 1;
    const usedToday = (s.cookedDay === s.day ? (s.cookedToday || 0) : 0);
    s.cookedToday = usedToday + 1;
    s.cookedDay = s.day;
    if (!Array.isArray(s.food)) s.food = [];

    const fail = rand() < cookFail(s);
    const xp = BALANCE.cook.xp + (r.lv >= BALANCE.cook.advLv ? BALANCE.cook.advXp : 0);
    const up = addLevelXp(s, 'cook', xp);
    if (fail) {
      const f = { rid: 'fail', name: '焦糊料理', emoji: '🫕', q: null, energy: 0, price: 1,
                  day: s.day, expire: s.day + 1, n: 1 };
      addFoodEntry(s, f);
      log(s, '🔥 做菜失手：' + r.name + ' 变成了焦糊料理（-' + cost + ' 体力）', 'warn');
      return { ok: true, fail: true, food: f, levelUp: up, cost: cost };
    }
    let q = rollQuality(cookRolls(s));
    /* 食材品质托底：成品至少比食材最好品质低 1 档 */
    const floorRank = ingBest >= 0 ? Math.max(0, ingBest - BALANCE.cook.qualityFloorDrop) : 0;
    if (cookQRank(q.id) < floorRank) q = QUALITY[floorRank];
    const f = { rid: r.id, name: r.name, emoji: r.emoji, q: q.id,
                energy: Math.round(r.restore * q.mul), price: Math.round(basePrice * q.mul),
                day: s.day, expire: s.day + r.days, n: 1 };
    addFoodEntry(s, f);
    /* 图鉴：记录做过的菜（次数 / 最好品质 / 首次 / 累计价值） */
    s.codex = s.codex || {};
    s.codex.food = s.codex.food || {};
    const ce = s.codex.food[r.id] || (s.codex.food[r.id] = { n: 0, best: null, first: s.day, value: 0 });
    ce.n++;
    ce.value += f.price;
    if (!ce.best || cookQRank(q.id) > cookQRank(ce.best)) ce.best = q.id;
    log(s, '🍳 做好 ' + f.emoji + ' ' + f.name + '（' + q.name + ' · +' + f.energy + ' 体力 · 保质 ' +
      r.days + ' 天）' + (up ? ' · 烹饪 Lv' + cookLv(s) : ''), 'good');
    return { ok: true, fail: false, food: f, q: q.id, levelUp: up, cost: cost, xp: xp };
  }

  /* 同菜同品质、且同一天到期 → 叠在同一份里 */
  function addFoodEntry(s, f) {
    const same = s.food.filter(function (x) {
      return x.rid === f.rid && x.q === f.q && x.expire === f.expire && x.name === f.name;
    })[0];
    if (same && f.rid !== 'fail') {
      same.n = (same.n || 1) + 1;
      same.price = f.price;
      same.energy = f.energy;
    } else {
      s.food.push(f);
    }
  }

  function foodDaysLeft(f, day) { return Math.max(0, (f.expire || 0) - (day || 1)); }
  function foodSoon(f, day) { return foodDaysLeft(f, day) <= 1; }

  /* 仓库里的熟食按「菜 + 品质」合并显示 */
  function foodGroups(s) {
    const map = {}, out = [];
    (s.food || []).forEach(function (f, i) {
      const key = (f.rid || 'food') + '|' + (f.q || '-');
      if (!map[key]) {
        map[key] = { key: key, rid: f.rid, name: f.name, emoji: f.emoji, q: f.q,
                     n: 0, energy: f.energy, price: f.price, expire: f.expire, idx: [] };
        out.push(map[key]);
      }
      const g = map[key];
      g.n += f.n || 1;
      g.expire = Math.min(g.expire, f.expire);
      g.idx.push(i);
    });
    return out;
  }

  /* 吃午饭：吃一份（优先吃掉最快过期的那份） */
  function eatFood(s, idx) {
    if (!kitchenUnlocked(s)) return { ok: false, msg: '厨房还没解锁' };
    if (lunchEaten(s)) return { ok: false, msg: '今天已经吃过午饭了' };
    const list = s.food || [];
    const f = list[idx];
    if (!f) return { ok: false, msg: '没有这份料理' };
    return eatFoodEntry(s, f);
  }

  function eatFoodEntry(s, f) {
    if (f.rid === 'fail') return { ok: false, msg: '焦糊料理不能吃，扔收购箱吧' };
    if ((f.expire || 0) < (s.day || 1)) return { ok: false, msg: '这份已经过期了' };
    const room = Math.max(0, s.maxEnergy - s.energy);
    const gain = Math.min(room, f.energy || 0);
    s.energy += gain;
    s.lunchDay = s.day;
    s.stats.meals = (s.stats.meals || 0) + 1;
    if ((f.n || 1) > 1) f.n--;
    else (s.food || []).splice((s.food || []).indexOf(f), 1);
    log(s, '🍽️ 吃午饭：' + f.emoji + ' ' + f.name + '，+ ' + gain + ' 体力' +
      (f.energy > gain ? '（体力已接近上限）' : ''), 'good');
    return { ok: true, gain: gain, energy: f.energy, name: f.name, emoji: f.emoji };
  }

  /* 按合并后的组吃一份 */
  function eatFoodGroup(s, key) {
    if (!kitchenUnlocked(s)) return { ok: false, msg: '厨房还没解锁' };
    if (lunchEaten(s)) return { ok: false, msg: '今天已经吃过午饭了' };
    const g = foodGroups(s).filter(function (x) { return x.key === key; })[0];
    if (!g) return { ok: false, msg: '没有这种熟食' };
    const list = s.food || [];
    const f = g.idx.map(function (i) { return list[i]; })
      .filter(Boolean)
      .sort(function (a, b) { return (a.expire || 0) - (b.expire || 0); })[0];
    return eatFoodEntry(s, f);
  }

  /* 睡觉时清掉过期料理，返回坏掉的份数 */
  function foodTick(s) {
    const list = s.food || [];
    const keep = list.filter(function (f) { return (f.expire || 0) >= (s.day || 1); });
    s.food = keep;
    return list.length - keep.length;
  }

  /* 放进收购箱：一份一份放（每份品质 / 保质期可能不同） */
  function boxPutFood(s, idx) {
    const list = s.food || [];
    const f = list[idx];
    if (!f) return { ok: false, msg: '没有这份料理' };
    const n = f.n || 1;
    list.splice(idx, 1);
    s.box = s.box || [];
    s.box.push({ kind: 'food', name: f.name, emoji: f.emoji, n: n, raw: (f.price || 1) * n,
                 q: f.q, energy: f.energy, rid: f.rid, expire: f.expire });
    log(s, '📦 ' + f.emoji + ' ' + f.name + '×' + n + ' 放进收购箱（' + ((f.price || 1) * n) + ' 金，睡觉结算）', 'info');
    return { ok: true, name: f.name, v: (f.price || 1) * n, n: n };
  }

  /* 按合并后的组整组放进收购箱 */
  function boxPutFoodGroup(s, key) {
    const g = foodGroups(s).filter(function (x) { return x.key === key; })[0];
    if (!g) return { ok: false, msg: '没有这种熟食' };
    const list = s.food || [];
    let n = 0, raw = 0;
    g.idx.slice().sort(function (a, b) { return b - a; }).forEach(function (i) {
      const f = list[i];
      if (!f) return;
      n += f.n || 1;
      raw += (f.price || 1) * (f.n || 1);
      list.splice(i, 1);
    });
    s.box = s.box || [];
    s.box.push({ kind: 'food', name: g.name, emoji: g.emoji, n: n, raw: raw,
                 q: g.q, energy: g.energy, rid: g.rid, expire: g.expire });
    log(s, '📦 ' + g.emoji + ' ' + g.name + '×' + n + ' 放进收购箱（' + raw + ' 金，睡觉结算）', 'info');
    return { ok: true, name: g.name, v: raw, n: n };
  }
