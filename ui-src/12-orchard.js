/* 我的小农场 · 界面层 / 12-orchard.js
 * 果园：开垦 / 树坑 / 种树 / 浇水 / 卖水果
 * 由 build-ui.cjs 按文件名顺序拼进 ui.js（共享同一个 IIFE 作用域），不要单独加载。
 */

  /* ---------------- 果园 ---------------- */

  function orchardRow(i) {
    const slot = G.treeSlot(state, i);
    const no = i + 1;
    if (!slot) {
      return '<div class="store-row">' +
        '<span class="se">🕳️</span>' +
        '<div><div class="sn">' + no + ' 号树坑 <b class="lock">空着</b></div>' +
          '<div class="sv">种子便宜但要育苗，树苗贵但立刻成树</div></div>' +
        '<button class="btn mini primary" data-tree-pick="' + i + '">种树</button></div>';
    }
    const t = G.TREES[slot.id];
    const need = G.BALANCE.orchard.growDays;
    if (slot.grown < need) {
      const pct = Math.round(slot.grown / need * 100);
      const watered = state.orchard.wateredDay === state.day;
      return '<div class="store-row">' +
        '<span class="se">' + t.emoji + '</span>' +
        '<div><div class="sn">' + t.name + ' <b class="own">育苗 ' + slot.grown + ' / ' + need + ' 天</b></div>' +
          '<div class="sv">' + (watered ? '✅ 今天已浇水' : '💧 今天还没浇水（不浇就不长）') +
            ' · ' + G.SEASONS[t.season] + '季结果</div>' +
          '<div class="cc-bar" style="margin-top:5px"><i style="width:' + pct + '%"></i></div></div>' +
        '<span class="sp">' + pct + '%</span></div>';
    }
    const inSeason = G.treeInSeason(state, i);
    return '<div class="store-row">' +
      '<span class="se">' + t.emoji + '</span>' +
      '<div><div class="sn">' + t.name + ' <b class="own">成树</b> ' +
        (inSeason ? '<b class="own">当季结果</b>' : '<b class="lock">休眠</b>') + '</div>' +
        '<div class="sv">' + (inSeason
          ? '每天产 ' + G.BALANCE.orchard.fruitPerDay + ' 个' + t.fruit + '（' + t.price + ' 金/个）'
          : '只在' + G.SEASONS[t.season] + '季结果 · ' + t.desc) + '</div></div>' +
      '<span class="sp">' + (inSeason ? '🍬' : '💤') + '</span></div>';
  }

  function orchardModal() {
    const need = G.BALANCE.orchard;
    if (!G.orchardUnlocked(state)) {
      const lv = G.farmLv(state);
      const lvOk = lv >= need.unlockLv;
      const coinOk = state.coins >= need.unlockCost;
      openModal('🍑 果园',
        '<div class="shop-head">🔒 还没开垦 · ' + need.slots + ' 个树坑</div>' +
        '<dl class="kv">' +
          '<dt>等级</dt><dd>种田 Lv' + need.unlockLv + '（现在 Lv' + lv + (lvOk ? ' ✓' : '') + '）</dd>' +
          '<dt>费用</dt><dd>' + need.unlockCost + ' 金（现有 ' + state.coins + ' 金' + (coinOk ? '' : ' ✗') + '）</dd>' +
          '<dt>成树</dt><dd>种子要育苗 ' + need.growDays + ' 天（一年），树苗种下即成树</dd>' +
          '<dt>结果</dt><dd>每种果树只在自己的季节结果，当季每天 ' + need.fruitPerDay + ' 个</dd>' +
        '</dl>' +
        '<div class="shop-tip">果树在<b>百货店</b>买；四季各一种，种齐了整年都有水果卖。后期建造，越早开垦越早回本。</div>',
        '<button class="btn primary" data-orchard-unlock="1"' +
          (lvOk && coinOk ? '' : ' disabled') + '>开垦果园（' + need.unlockCost + ' 金）</button>' +
        '<button class="btn" data-close>关闭</button>');
      return;
    }

    const sum = G.orchardSummary(state);
    const rows = [];
    for (let i = 0; i < G.orchardSlots(); i++) rows.push(orchardRow(i));
    const watered = state.orchard.wateredDay === state.day;
    openModal('🍑 果园',
      '<div class="shop-head">🌳 成树 <b>' + sum.mature + '</b> · 育苗 <b>' + sum.growing + '</b>' +
        ' · 水果 <b>' + sum.fruit + '</b> 个（<b>' + sum.value + '</b> 金）</div>' +
      '<div class="action-grid" style="margin-bottom:9px">' +
        '<button class="btn" data-orchard-water="1"' + (watered || !sum.growing ? ' disabled' : '') + '>' +
          '💧 浇果树<small>' + (watered ? '今天浇过了' : (sum.growing ? sum.growing + ' 棵育苗树' : '没有育苗树')) + '</small></button>' +
        '<button class="btn" data-orchard-sell="1"' + (sum.fruit ? '' : ' disabled') + '>' +
          '🍑 卖水果<small>' + (sum.fruit ? sum.value + ' 金' : '还没有水果') + '</small></button>' +
        '<button class="btn" data-act="depart">🏬 百货店<small>买种子 / 树苗</small></button>' +
      '</div>' +
      '<div class="store-sub">树坑 · 育苗树要每天浇水，才会长一天</div>' + rows.join('') +
      '<div class="shop-tip">成树不用浇水，只在<b>自己季节</b>每天结果；其余季节休眠。' +
        '水果不占仓库，直接在这里卖。</div>',
      '<button class="btn" data-close>关闭</button>');
  }

  function treePicker(i) {
    const need = G.BALANCE.orchard;
    const rows = G.TREE_LIST.map(function (t) {
      const seedN = G.treeStockCount(state, t.id, 'seed');
      const sapN = G.treeStockCount(state, t.id, 'sapling');
      return '<div class="store-row">' +
        '<span class="se">' + t.emoji + '</span>' +
        '<div><div class="sn">' + t.name + ' <b class="own">' + G.SEASONS[t.season] + '季结果</b></div>' +
          '<div class="sv">' + t.fruit + ' ' + t.price + ' 金/个 · ' + t.desc + '</div>' +
          '<div class="sv">种子有 ' + seedN + '（育苗 ' + need.growDays + ' 天）· 树苗有 ' + sapN + '（立刻成树）</div></div>' +
        '<button class="btn mini" data-tree-plant="' + i + '" data-tree="' + t.id + '" data-mode="seed"' +
          (seedN ? '' : ' disabled') + '>种子</button>' +
        '<button class="btn mini" data-tree-plant="' + i + '" data-tree="' + t.id + '" data-mode="sapling"' +
          (sapN ? '' : ' disabled') + '>树苗</button>' +
      '</div>';
    }).join('');
    openModal('🌰 ' + (i + 1) + ' 号树坑 · 种什么',
      '<div class="shop-head">🍑 当季每天 ' + need.fruitPerDay + ' 个水果 · 果树只在自己的季节结果</div>' + rows +
      '<div class="shop-tip">种子便宜，但要育苗 <b>' + need.growDays + '</b> 天（一年，只有浇过水的日子才算）；' +
        '树苗贵，种下立刻成树。库存为 0 的按钮是灰的，先去百货店买。</div>',
      '<button class="btn" data-act="depart">🏬 去百货店买</button>' +
      '<button class="btn" data-close>取消</button>');
  }
