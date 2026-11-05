/* 我的小农场 · 界面层 / 17-cook.js
 * 厨房弹窗 / 吃午饭
 * 由 build-ui.cjs 按文件名顺序拼进 ui.js（共享同一个 IIFE 作用域），不要单独加载。
 */

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
    const body = unlocked
      ? '<div class="cook-top">🍳 烹饪 <b>Lv' + lv + '</b> · 经验 ' + xp + '/' + G.levelNeed(lv, 'cook') +
          ' · 今日 <b>' + G.cookLeft(state) + '/' + G.cookDailyLimit(state) + '</b> 份' +
          ' · 做砸 ' + Math.round(G.cookFail(state) * 100) + '% · 品质取 ' +
          G.cookRolls(state) + ' 次最好</div>' +
        '<div class="cook-grid">' + G.cookRecipes().map(cookCard).join('') + '</div>' +
        '<div class="store-sub" style="margin-top:12px">🍲 现有熟食 · 吃午饭每天一次</div>' +
        foodRowsHtml(true)
      : '<div class="shop-tip">厨房还没解锁：<b>种田 Lv' + G.BALANCE.cook.unlockFarm + ' + 钓鱼 Lv' +
          G.BALANCE.cook.unlockFish + '</b> 后开张。<br>解锁后能拿作物 / 渔获 / 野货做菜，' +
          '菜有保质期，吃了回体力，也能进收购箱卖。</div>';
    openModal('🍳 厨房', body, '<button class="btn" data-close>关闭</button>');
  }

  function lunchModal() {
    const body = '<div class="shop-tip">每天只能吃一次，回复菜品的体力。' +
      (G.kitchenUnlocked(state)
        ? (G.lunchEaten(state) ? '今天已经吃过了 ✅' : '今天还没吃，不吃的话今晚伙食费 <b>×' +
            G.BALANCE.meal.skipLunchMul + '</b>。')
        : '厨房解锁后才生效。') + '</div>' + foodRowsHtml(true);
    openModal('🍽️ 吃午饭', body, '<button class="btn" data-close>关闭</button>');
  }
