/* 我的小农场 · 界面层 / 17-cook.js
 * 厨房弹窗 / 吃午饭
 * 由 build-ui.cjs 按文件名顺序拼进 ui.js（共享同一个 IIFE 作用域），不要单独加载。
 */

  function cookCard(r) {
    const locked = G.cookLv(state) < r.lv;
    const have = G.cookHave(state, r);
    const canDo = !locked && have && state.energy >= r.energy;
    return '<div class="cook-card' + (locked ? ' locked' : '') + '">' +
      '<div class="cc-head"><span class="cc-e">' + r.emoji + '</span>' +
        '<b>' + esc(r.name) + '</b><span class="cc-lv">Lv' + r.lv + '</span></div>' +
      '<div class="cc-desc">' + esc(r.desc || '') + '</div>' +
      '<div class="cc-row">' + G.ingredientText(r) + '</div>' +
      '<div class="cc-row">耗 ' + r.energy + ' 体力 · 回复 +' + r.restore + ' 体力 · 保质 ' +
        r.days + ' 天 · 约 ' + r.price + ' 金</div>' +
      (locked
        ? '<div class="cc-lock">烹饪 Lv' + r.lv + ' 解锁</div>'
        : '<button class="btn mini" data-cook="' + r.id + '"' + (canDo ? '' : ' disabled') + '>' +
          (have ? (state.energy >= r.energy ? '烹饪' : '体力不够') : '缺食材') + '</button>') +
    '</div>';
  }

  function kitchenModal() {
    const unlocked = G.kitchenUnlocked(state);
    const lv = G.cookLv(state);
    const xp = (state.levels && state.levels.cookXp) || 0;
    const body = unlocked
      ? '<div class="cook-top">🍳 烹饪 <b>Lv' + lv + '</b> · 经验 ' + xp + '/' + G.levelNeed(lv, 'cook') +
          ' · 做砸 ' + Math.round(G.cookFail(state) * 100) + '% · 品质取 ' +
          G.cookRolls(state) + ' 次最好 · 体力消耗按食谱</div>' +
        '<div class="cook-grid">' + G.cookRecipes().map(cookCard).join('') + '</div>'
      : '<div class="shop-tip">厨房还没解锁：<b>种田 Lv' + G.BALANCE.cook.unlockFarm + ' + 钓鱼 Lv' +
          G.BALANCE.cook.unlockFish + '</b> 后开张。<br>解锁后能拿作物 / 渔获 / 野货做菜，' +
          '菜有保质期，吃了回体力，也能进收购箱卖。</div>';
    openModal('🍳 厨房', body, '<button class="btn" data-close>关闭</button>');
  }

  function lunchModal() {
    const list = state.food || [];
    const eaten = G.lunchEaten(state);
    const rows = list.length
      ? list.map(function (f, i) {
          const q = G.qualityById(f.q);
          const bad = f.rid === 'fail';
          return '<div class="store-row">' +
            '<span class="se">' + esc(f.emoji || '🍲') + '</span>' +
            '<div><div class="sn">' + esc(f.name) +
              (q ? ' <b class="own">' + q.emoji + q.name + '</b>' : '') + '</div>' +
            '<div class="sv">+' + (f.energy || 0) + ' 体力 · 保质到 D' + f.expire +
              (bad ? ' · 焦糊了不能吃' : '') + '</div></div>' +
            '<span class="spw"><button class="btn mini" data-eat="' + i + '"' +
              (eaten || bad ? ' disabled' : '') + '>吃</button></span></div>';
        }).join('')
      : '<div class="store-empty">仓库里没有做好的菜，先去厨房做两道 🍳</div>';
    openModal('🍽️ 吃午饭',
      '<div class="shop-tip">每天只能吃一次，回复菜品的体力。' +
        (G.kitchenUnlocked(state)
          ? (eaten ? '今天已经吃过了 ✅' : '今天还没吃，不吃的话今晚伙食费 <b>×' + G.BALANCE.meal.skipLunchMul + '</b>。')
          : '厨房解锁后才生效。') + '</div>' + rows,
      '<button class="btn" data-close>关闭</button>');
  }
