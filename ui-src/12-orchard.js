/* 我的小农场 · 界面层 / 12-orchard.js
 * 果园面板：开垦 / 扩坑 / 树坑 / 种树 / 浇水 / 收获
 * 由 build-ui.cjs 按文件名顺序拼进 ui.js（共享同一个 IIFE 作用域），不要单独加载。
 */

  /* ---------------- 果园面板 ---------------- */

  function orchardCard(i) {
    const slot = G.treeSlot(state, i);
    const no = i + 1;
    if (!slot) {
      return '<div class="orc-card empty">' +
        '<div class="orc-top"><span class="orc-emoji">🕳️</span><span class="orc-no">' + no + ' 号坑</span></div>' +
        '<div class="orc-mid">空着 · 可以种果树</div>' +
        '<div class="orc-act"><button class="btn mini" data-tree-pick="' + i + '">种树</button></div></div>';
    }
    const t = G.TREES[slot.id];
    const p = G.treeProgress(state, i);
    if (!p.done) {
      const needsWater = G.treeNeedsWater(state, i);
      const watered = slot.lastWater === state.day;
      const pct = Math.min(100, Math.round(Math.min(p.water / p.needWater, p.age / p.needDays) * 100));
      return '<div class="orc-card">' +
        '<div class="orc-top"><span class="orc-emoji">' + t.emoji + '</span><span class="orc-no">' + no + ' 号坑</span>' +
          '<b class="orc-tag">育苗</b></div>' +
        '<div class="orc-mid">' + t.name + ' · ' + (p.mode === 'sapling' ? '树苗' : '种子') + '<br>' +
          '💧 ' + p.water + '/' + p.needWater + ' 天 · 🌱 ' + p.age + '/' + p.needDays + ' 天</div>' +
        '<div class="cc-bar orc-bar"><i style="width:' + pct + '%"></i></div>' +
        '<div class="orc-act"><span class="orc-note">' + (!needsWater ? '✅ 育苗浇水已完成' :
          (watered ? '✅ 今天浇过' : '💧 待浇水（' + G.BALANCE.orchard.waterEnergy + ' 体力）')) + '</span>' +
        (needsWater ? '<button class="btn mini" data-tree-water="' + i + '"' +
          (watered || state.energy < G.BALANCE.orchard.waterEnergy ? ' disabled' : '') + '>浇水</button>' : '') +
        '</div></div>';
    }
    const inSeason = G.treeInSeason(state, i);
    const lvTxt = G.treeLevelText(G.treeSlot(state, i) || {});
    return '<div class="orc-card mature' + (inSeason ? ' on' : '') + '">' +
      '<div class="orc-top"><span class="orc-emoji">' + t.emoji + '</span><span class="orc-no">' + no + ' 号坑</span>' +
        '<b class="orc-lv">' + lvTxt + '</b>' +
        '<b class="orc-tag' + (inSeason ? '' : ' off') + '">' + (inSeason ? '当季' : '休眠') + '</b></div>' +
      '<div class="orc-mid">' + t.name + '<br>' +
        (inSeason
          ? '每天挂 ' + G.BALANCE.orchard.fruitMin + '–' + G.BALANCE.orchard.fruitMax + ' 个' +
            (p.yieldBonus > 0 ? '（+' + Math.round(p.yieldBonus * 100) + '%）' : '') +
            ' · 待收 ' + p.ripe + '/' + G.BALANCE.orchard.ripeCap +
            (p.ripe >= G.BALANCE.orchard.ripeCap ? ' <b class="orc-full">已挂满</b>' : '')
          : G.SEASONS[t.season] + '季结果') + '</div>' +
      '<div class="orc-act">' +
        '<button class="btn mini primary" data-tree-harvest="' + i + '"' + (p.ripe ? '' : ' disabled') + '>' +
          '收获' + (p.ripe ? ' ' + p.ripe : '') + '</button></div></div>';
  }

  function renderOrchard() {
    const sum = G.orchardSummary(state);
    const locked = $('#orchard-locked');
    const grid = $('#orchard-grid');
    const foot = $('#orchard-foot');
    if (!locked || !grid || !foot) return;
    const head = $('#orchard-sum');
    const need = G.BALANCE.orchard;
    if (!G.orchardUnlocked(state)) {
      const lv = G.farmLv(state);
      const lvOk = lv >= need.unlockLv;
      const coinOk = state.coins >= need.unlockCost;
      locked.innerHTML = '<div class="orc-locked">🔒 种田 <b>Lv' + need.unlockLv + '</b> + <b>' +
        need.unlockCost + '</b> 金开垦（现在 Lv' + lv + (lvOk ? ' ✓' : '') + '）<br>' +
        '<span>开垦后先给 ' + need.free + ' 个树坑，后面每个树坑再花钱开</span><br>' +
        '<button class="btn primary" data-orchard-unlock="1"' +
          (lvOk && coinOk ? '' : ' disabled') + '>开垦果园（' + need.unlockCost + ' 金）</button></div>';
      locked.hidden = false;
      grid.hidden = true;
      foot.hidden = true;
      if (head) head.textContent = '';
      return;
    }
    locked.hidden = true;
    grid.hidden = false;
    foot.hidden = false;
    const cards = [];
    for (let i = 0; i < G.orchardSlotCount(state); i++) cards.push(orchardCard(i));
    grid.innerHTML = cards.join('');
    if (head) head.textContent = '树坑 ' + sum.total + '/' + sum.max + ' · 成树 ' + sum.mature +
      ' · 待收 ' + sum.ripe;
    const waterTxt = $('#orchard-water-txt');
    if (waterTxt) {
      waterTxt.textContent = sum.thirsty
        ? sum.thirsty + ' 棵 · ' + (sum.thirsty * G.BALANCE.orchard.waterEnergy) + ' 体力'
        : (sum.growing ? '今天没有待浇树' : '没有育苗树');
    }
    const harvTxt = $('#orchard-harvest-txt');
    if (harvTxt) {
      harvTxt.textContent = sum.ripe ? '待收 ' + sum.ripe + ' 个' : '没有可收的';
    }
    const expTxt = $('#orchard-expand-txt');
    if (expTxt) {
      const cost = G.orchardExpandCost(state);
      expTxt.textContent = sum.total >= sum.max ? '已开满' : (cost + ' 金');
    }
    const waterBtn = $('[data-act="orchardWater"]');
    if (waterBtn) waterBtn.disabled = !sum.thirsty;
    const harvBtn = $('[data-act="orchardHarvest"]');
    if (harvBtn) harvBtn.disabled = !sum.ripe;
    const expBtn = $('[data-act="orchardExpand"]');
    if (expBtn) expBtn.disabled = sum.total >= sum.max;
  }

  function treePicker(i) {
    const need = G.BALANCE.orchard;
    const rows = G.TREE_LIST.map(function (t) {
      const seedN = G.treeStockCount(state, t.id, 'seed');
      const sapN = G.treeStockCount(state, t.id, 'sapling');
      return '<div class="store-row">' +
        '<span class="se">' + t.emoji + '</span>' +
        '<div><div class="sn">' + t.name + ' <b class="own">' + G.SEASONS[t.season] + '季结果</b></div>' +
           '<div class="sv">' + t.fruit + ' ' + t.price + ' 金/个 · 成树后当季每天 ' + need.fruitMin + '–' + need.fruitMax +
             ' 个 · 种子需浇水 ' + need.grow.seed.water +
            ' 天 + 生长 ' + need.grow.seed.days + ' 天 · 树苗需 浇水 ' + need.grow.sapling.water +
            ' 天 + 生长 ' + need.grow.sapling.days + ' 天</div>' +
          '<div class="sv">种子有 ' + seedN + ' · 树苗有 ' + sapN + '</div></div>' +
        '<button class="btn mini" data-tree-plant="' + i + '" data-tree="' + t.id + '" data-mode="seed"' +
          (seedN ? '' : ' disabled') + '>种子</button>' +
        '<button class="btn mini" data-tree-plant="' + i + '" data-tree="' + t.id + '" data-mode="sapling"' +
          (sapN ? '' : ' disabled') + '>树苗</button>' +
      '</div>';
    }).join('');
    openModal('🌰 ' + (i + 1) + ' 号树坑 · 种什么',
      '<div class="shop-head">🍑 当季每天随机挂 ' + need.fruitMin + '–' + need.fruitMax +
        ' 个水果 · 每棵果树只在自己的季节结果</div>' + rows +
      '<div class="shop-tip">果树可以逐棵浇水。种子便宜，但要<b>浇水 ' + need.grow.seed.water + ' 天</b>并且<b>生长满 ' +
        need.grow.seed.days + ' 天</b>才成树；树苗贵，<b>浇水 ' + need.grow.sapling.water +
        ' 天后不再需要浇水，生长满 ' + need.grow.sapling.days + ' 天才成树。浇水 ' + need.waterEnergy +
        ' 体力/棵、收获 ' + need.harvestEnergy + ' 体力/棵。</div>',
      '<button class="btn" data-act="depart">🏬 去百货店买</button>' +
      '<button class="btn" data-close>取消</button>');
  }
