/* 厨房 / 烹饪（v2.44）
 * 食谱用作物、渔获、野货做菜；做好的美食进仓库（s.food），可吃（每天一次午饭）或进收购箱。
 * 由 build-modules.cjs 按文件名顺序拼进 game.js（共享同一个 IIFE 作用域），不要单独加载。
 */

  /* 食谱：lv = 烹饪等级门槛；energy = 做这道菜要花的体力；days = 保质期；restore = 基础回复；price = 基础卖价
   * cost.crops 里的 id 可以是作物 / 野货 / 水果（都在 CROPS 表和仓库里） */
  const RECIPES = [
    { id: 'soup', name: '蔬菜汤', emoji: '🥣', lv: 1, energy: 1, restore: 8, days: 3, price: 46,
      cost: { crops: { carrot: 2, cabbage: 1 } }, desc: '萝卜炖白菜，暖胃' },
    { id: 'grill', name: '香烤鱼', emoji: '🍢', lv: 1, energy: 1, restore: 10, days: 2, price: 58,
      cost: { fish: 1 }, desc: '现钓现烤，撒点盐' },
    { id: 'jam', name: '野莓酱', emoji: '🍯', lv: 2, energy: 1, restore: 9, days: 4, price: 62,
      cost: { crops: { berry: 3 } }, desc: '抹面包能吃一星期' },
    { id: 'stew', name: '蘑菇炖菜', emoji: '🍲', lv: 3, energy: 2, restore: 16, days: 3, price: 96,
      cost: { crops: { mushroom: 1, potato: 2 } }, desc: '松茸配土豆，鲜掉眉毛' },
    { id: 'salad', name: '水果沙拉', emoji: '🥗', lv: 4, energy: 2, restore: 14, days: 2, price: 108,
      cost: { crops: { fruit_peach: 1, berry: 2 } }, desc: '桃子野莓拌一拌' },
    { id: 'pie', name: '南瓜派', emoji: '🥧', lv: 6, energy: 2, restore: 24, days: 4, price: 188,
      cost: { crops: { pumpkin: 1, corn: 2 } }, desc: '烤得金黄，切八块' },
    { id: 'sashimi', name: '鱼生拼盘', emoji: '🍣', lv: 7, energy: 2, restore: 28, days: 1, price: 232,
      cost: { fish: 2, crops: { carrot: 1 } }, desc: '刀工比食材更值钱' },
    { id: 'feast', name: '农家盛宴', emoji: '🍱', lv: 9, energy: 3, restore: 45, days: 3, price: 520,
      cost: { fish: 2, crops: { watermelon: 1, pumpkin: 1, mushroom: 1 } }, desc: '一桌硬菜' }
  ];

  function recipeById(id) {
    return RECIPES.filter(function (r) { return r.id === id; })[0] || null;
  }

  /* 能下锅的鱼：有品质、不是杂物/宝箱（买来的也行） */
  function cookFishBag(s) {
    return (s.fishBag || []).filter(function (e) { return e && e.q && !e.no && !e.chest; });
  }

  function cookHave(s, r) {
    if (!r) return false;
    const crops = r.cost.crops || {};
    for (const id in crops) {
      if (storeCount(s, id) < crops[id]) return false;
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

  /* 从渔获袋按最便宜的先扣（和交鱼单一致） */
  function takeCookFish(s, n) {
    const drop = cookFishBag(s).sort(function (a, b) { return a.v - b.v; }).slice(0, n);
    s.fishBag = (s.fishBag || []).filter(function (e) { return drop.indexOf(e) < 0; });
    return drop.length;
  }

  /* 做一道菜 */
  function cookMeal(s, rid) {
    const r = recipeById(rid);
    if (!r) return { ok: false, msg: '没有这个食谱' };
    if (!kitchenUnlocked(s)) return { ok: false, msg: '厨房还没解锁（种田 Lv' +
      BALANCE.cook.unlockFarm + ' + 钓鱼 Lv' + BALANCE.cook.unlockFish + '）' };
    if (cookLv(s) < r.lv) return { ok: false, msg: '烹饪 Lv' + r.lv + ' 才解锁' };
    const cost = r.energy;
    if (s.energy < cost) {
      return { ok: false, msg: '体力不够（做这道菜要 ' + cost + ' 点）' };
    }
    if (!cookHave(s, r)) return { ok: false, msg: '食材不够：' + ingredientText(r) };

    const crops = r.cost.crops || {};
    Object.keys(crops).forEach(function (id) { takeStore(s, id, crops[id]); });
    if (r.cost.fish) takeCookFish(s, r.cost.fish);
    s.energy -= cost;
    s.stats.cooks = (s.stats.cooks || 0) + 1;
    if (!Array.isArray(s.food)) s.food = [];

    const fail = rand() < cookFail(s);
    const up = addLevelXp(s, 'cook', BALANCE.cook.xp);
    if (fail) {
      const f = { rid: 'fail', name: '焦糊料理', emoji: '🫕', q: null, energy: 0, price: 1,
                  day: s.day, expire: s.day + 1 };
      s.food.push(f);
      log(s, '🔥 做菜失手：' + r.name + ' 变成了焦糊料理（-' + cost + ' 体力）', 'warn');
      return { ok: true, fail: true, food: f, levelUp: up, cost: cost };
    }
    const q = rollQuality(cookRolls(s));
    const f = { rid: r.id, name: r.name, emoji: r.emoji, q: q.id,
                energy: Math.round(r.restore * q.mul), price: Math.round(r.price * q.mul),
                day: s.day, expire: s.day + r.days };
    s.food.push(f);
    /* 图鉴：记录做过的菜（次数 / 最好品质 / 首次 / 累计价值） */
    s.codex = s.codex || {};
    s.codex.food = s.codex.food || {};
    const ce = s.codex.food[r.id] || (s.codex.food[r.id] = { n: 0, best: null, first: s.day, value: 0 });
    ce.n++;
    ce.value += f.price;
    if (!ce.best || QUALITY.indexOf(q) > QUALITY.indexOf(qualityById(ce.best))) ce.best = q.id;
    log(s, '🍳 做好 ' + f.emoji + ' ' + f.name + '（' + q.name + ' · +' + f.energy + ' 体力 · 保质 ' +
      r.days + ' 天）' + (up ? ' · 烹饪 Lv' + cookLv(s) : ''), 'good');
    return { ok: true, fail: false, food: f, q: q.id, levelUp: up, cost: cost };
  }

  /* 吃午饭：每天一次，回复美食体力；吃过的当天不再算「没吃午饭」 */
  function eatFood(s, idx) {
    if (!kitchenUnlocked(s)) return { ok: false, msg: '厨房还没解锁' };
    if (lunchEaten(s)) return { ok: false, msg: '今天已经吃过午饭了' };
    const list = s.food || [];
    const f = list[idx];
    if (!f) return { ok: false, msg: '没有这份料理' };
    if (f.rid === 'fail') return { ok: false, msg: '焦糊料理不能吃，扔收购箱吧' };
    if ((f.expire || 0) < (s.day || 1)) {
      list.splice(idx, 1);
      return { ok: false, msg: '这份已经过期了（保质期到 D' + f.expire + '）' };
    }
    list.splice(idx, 1);
    const room = Math.max(0, s.maxEnergy - s.energy);
    const gain = Math.min(room, f.energy || 0);
    s.energy += gain;
    s.lunchDay = s.day;
    s.stats.meals = (s.stats.meals || 0) + 1;
    log(s, '🍽️ 吃午饭：' + f.emoji + ' ' + f.name + '，+ ' + gain + ' 体力' +
      (f.energy > gain ? '（体力已接近上限）' : ''), 'good');
    return { ok: true, gain: gain, energy: f.energy, name: f.name, emoji: f.emoji };
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
    list.splice(idx, 1);
    s.box = s.box || [];
    s.box.push({ kind: 'food', name: f.name, emoji: f.emoji, n: 1, raw: f.price || 1,
                 q: f.q, energy: f.energy, rid: f.rid, expire: f.expire });
    log(s, '📦 ' + f.emoji + ' ' + f.name + ' 放进收购箱（' + (f.price || 1) + ' 金，睡觉结算）', 'info');
    return { ok: true, name: f.name, v: f.price || 1 };
  }
