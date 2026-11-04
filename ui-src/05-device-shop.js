/* 我的小农场 · 界面层 / 05-device-shop.js
 * 自动播种器面板 / 商店大类（种子·渔具·水产·农产品·百货）
 * 由 build-ui.cjs 按文件名顺序拼进 ui.js（共享同一个 IIFE 作用域），不要单独加载。
 */

  /* ---------------- 自动播种器 ---------------- */

  function seederModal() {
    if (!G.seederUnlocked(state)) {
      toast('自动播种器要种田 Lv' + G.BALANCE.gate.seeder + ' 才解锁', 'warn');
      return;
    }
    const per = G.SEEDER_PLOTS;
    const have = G.seederCount(state);
    const max = G.seederMax(state);
    const cover = G.seederPlots(state);
    const upkeep = G.BALANCE.upkeep.seeder;
    if (seedMach > have) seedMach = 1;
    const buyBtn = '<button class="btn" data-buyseeder' +
      (state.coins < G.SEEDER_COST || have >= max ? ' disabled' : '') + '>再买一台（' +
      G.SEEDER_COST + ' 金）</button>';

    if (!have) {
      openModal('🌱 自动播种器',
        '<div class="shop-head">💰 <b>' + state.coins + '</b> 金 · 现在有 <b>' + state.plots.length + '</b> 块地</div>' +
        '<div class="shop-tip">一台机器<b>只管 ' + per + ' 块地</b>：每晚睡前自动往空地里播 ' + per +
          ' 块，<b>不耗体力</b>，只消耗背包里的种子；每台每周要交 <b>' + upkeep + ' 金</b>维护费。<br>' +
          '你现在的地块需要 <b>' + max + '</b> 台才能全自动；冬天不工作，种子用完就停。</div>',
        '<button class="btn" data-buyseeder' + (state.coins < G.SEEDER_COST ? ' disabled' : '') +
          '>买一台（' + G.SEEDER_COST + ' 金）</button>' +
        '<button class="btn" data-close>取消</button>');
      return;
    }

    const rows = G.CROP_LIST.filter(function (c) { return (state.seeds[c.id] || 0) > 0; })
      .map(function (c) {
        const users = [];
        for (let k = 1; k <= have; k++) if (G.autoSeedOf(state, k) === c.id) users.push(k);
        const on = users.indexOf(seedMach) >= 0;
        return '<div class="store-row' + (on ? ' on' : '') + '">' +
          '<span class="se">' + c.emoji + '</span>' +
          '<div><div class="sn">' + c.name + ' <b class="own">种子 ×' + state.seeds[c.id] + '</b>' +
            (users.length ? ' <b class="own">第 ' + users.join('·') + ' 台在用</b>' : '') + '</div>' +
          '<div class="sv">' + (G.cropSeasonOk(c.id, state.day) ? '当季' : '反季') + ' · ' +
            c.days + ' 天熟</div></div>' +
          '<button class="btn mini" data-autoseed="' + c.id + '">' +
            (on ? '取消' : '给第 ' + seedMach + ' 台') + '</button>' +
        '</div>';
      }).join('');

    /* 每台机器负责的号段 + 自己选的种子 */
    const machineRows = [];
    for (let k = 1; k <= have; k++) {
      const rg = G.seederPlateRange(k);
      const real = Math.min(rg.to, state.plots.length);
      const seed = G.autoSeedOf(state, k);
      let stTxt = seed ? (seed && (state.seeds[seed] || 0) ? '播种中' : '种子用完了') : '没选种子';
      if (!state.seederOn) stTxt = '已关闭';
      else if (G.isWinter(state.day)) stTxt = '冬天停工';
      const done = state.plots.slice(rg.from - 1, real)
        .filter(function (p) { return p.crop; }).length;
      machineRows.push('<div class="store-row' + (seedMach === k ? ' on' : '') + '">' +
        '<span class="se">🌱</span>' +
        '<div><div class="sn">第 ' + k + ' 台 <b class="own">第 ' + rg.from + '–' + real + ' 块</b>' +
          ' · ' + (seed ? G.CROPS[seed].emoji + ' ' + G.CROPS[seed].name : '未选种子') + '</div>' +
        '<div class="sv">' + stTxt + ' · 已占 ' + done + '/' + (real - rg.from + 1) + ' 块 · 维护 ' +
        upkeep + ' 金/周</div></div>' +
        '<button class="btn mini" data-mach="' + k + '">' + (seedMach === k ? '选种子中' : '选种子') + '</button>' +
        '</div>');
    }

    openModal('🌱 自动播种器',
      '<div class="shop-head"><b>' + have + '</b> / ' + max + ' 台 · 每晚自动播 <b>' + cover + '</b> / ' +
        state.plots.length + ' 块 · ' + (state.seederOn ? '已开启' : '已关闭') +
        ' · 维护 ' + G.seederUpkeep(state) + ' 金/周</div>' +
      '<div class="store-sub">🐣 每台只管自己那 ' + per + ' 块地，各选各的种子，收完立刻补种</div>' +
      '<div class="shop-list">' + machineRows.join('') + '</div>' +
      '<div class="shop-tip">买第 ' + (have + 1) + ' 台要 ' + G.SEEDER_COST +
        ' 金（维护 +' + upkeep + ' 金/周）。台数上限 = 盖住全部地块所需（' + max + ' 台），想多买先扩地。<br>' +
        '自动播种不耗体力，只消耗种子；冬天不工作。</div>' +
      '<div class="store-sub" style="margin-top:10px">🌰 给<b>第 ' + seedMach + ' 台</b>选种子</div>' +
      (rows || '<div class="store-empty">背包里没有种子，先去种子店买</div>'),
      (have < max ? buyBtn : '') +
      '<button class="btn" data-toggleseeder>' + (state.seederOn ? '关掉自动播种' : '开启自动播种') + '</button>' +
      '<button class="btn" data-close>关闭</button>');
  }

  /* ---------------- 商店 / 帮助 / 重置 ---------------- */

  function shopModal() {
    const worms = state.bait.worm || 0;
    const dough = state.bait.dough || 0;
    const lure = G.BALANCE.lure;
    const lure2 = G.BALANCE.lure2;
    const lure2FishOk = G.fishLv(state) >= G.BALANCE.gate.lure2;
    const lure2TradeOk = G.tradeLv(state) >= G.BALANCE.gate.lure2Trade;
    const lure2Open = lure2FishOk && lure2TradeOk;
    const lure2LockTxt = !lure2FishOk
      ? '需钓鱼 Lv' + G.BALANCE.gate.lure2
      : '还需交易 Lv' + G.BALANCE.gate.lure2Trade;
    const lure2Have = (state.lure2 && state.lure2.owned) ? state.lure2.dur : 0;
    const netLock = !G.netUnlocked(state);
    const netCap = G.netMax(state);
    const body =
      '<dl class="kv"><dt>🍞 面团饵</dt><dd>1 金/份 · 现有 ' + dough + ' 份 · 标准收获</dd>' +
      '<dt>🎣 假饵</dt><dd>' + lure.price + ' 金/个 · 耐用 ' + lure.dur + ' 次 · 持有上限 1</dd>' +
      '<dt>🪝 高级假饵</dt><dd>' + (lure2Open
        ? lure2.price + ' 金/个 · 耐用 ' + lure2.dur + ' 次 · 现有 ' + lure2Have + ' 次'
        : lure2LockTxt + ' 解锁') + '</dd>' +
      '<dt>🪱 蚯蚓</dt><dd>' + G.BALANCE.dig.energy + ' 体力挖 ' + G.BALANCE.dig.min + '~' +
        G.BALANCE.dig.max + ' 条（晴天 −1、阴雨 +1）</dd></dl>' +
      '<div class="action-grid">' +
        '<button class="btn" data-buy="dough" data-n="1">🍞 买 1 份<small>' + G.BAIT.dough.price + ' 金</small></button>' +
        '<button class="btn" data-buy="dough" data-n="5">🍞 买 5 份<small>' + G.BAIT.dough.price * 5 + ' 金</small></button>' +
        '<button class="btn" data-buy="lure" data-n="1">🎣 买假饵<small>' + lure.price + ' 金 · ' +
          lure.dur + ' 次</small></button>' +
        '<button class="btn' + (lure2Open ? '' : ' locked') + '" data-buy="lure2" data-n="1"' +
          (lure2Open && state.coins >= lure2.price ? '' : ' disabled') + '>' +
          '🪝 买高级假饵<small>' + (lure2Open ? lure2.price + ' 金 · ' + lure2.dur + ' 次'
            : lure2LockTxt) + '</small></button>' +
      '</div>' +
      '<div class="buy-custom">' +
        '<span>🍞 面团饵自定义数量</span>' +
        '<input type="number" id="dough-qty" min="1" max="999" step="1" value="10" inputmode="numeric">' +
        '<button class="btn mini" data-buycustom="dough">买</button>' +
        '<span class="bc-tip">最多 999 份</span>' +
      '</div>' +
      '<div class="store-sub" style="margin-top:10px">🪱 蚯蚓回收</div>' +
      '<div class="store-row">' +
        '<span class="se">🪱</span>' +
        '<div><div class="sn">现有蚯蚓 ×' + worms + '</div>' +
        '<div class="sv">' + G.WORM_VALUE + ' 金/条</div></div>' +
        '<span class="sp">' + (worms * G.WORM_VALUE) + ' 金</span>' +
        '<button class="btn mini" data-sellworm' + (worms ? '' : ' disabled') + '>全部卖出</button>' +
      '</div>' +
      '<div class="buy-custom">' +
        '<span>🪱 蚯蚓自定义出售</span>' +
        '<input type="number" id="worm-qty" min="1" max="999" step="1" value="10" inputmode="numeric">' +
        '<button class="btn mini" data-sellwormn="1"' + (worms ? '' : ' disabled') + '>卖</button>' +
        '<span class="bc-tip">现有 ' + worms + ' 条</span>' +
      '</div>' +
      '<div class="store-sub" style="margin-top:10px">🕸️ 渔网 · 放到河边每天自动抓鱼</div>' +
      '<div class="store-row' + (netLock ? ' locked' : '') + '">' +
        '<span class="se">🕸️</span>' +
        '<div><div class="sn">渔网 <b class="own">已布 ' + G.netSetCount(state) + '</b> / 共 ' +
          state.nets + ' / ' + (netLock ? '—' : netCap) +
          (netLock ? ' <b class="lock">需钓鱼 Lv' + G.BALANCE.gate.net + '</b>' : '') + '</div>' +
        '<div class="sv">' + (netLock ? '钓鱼等级不够，还没解锁'
          : G.NET_COST + ' 金/张 · 每天耗 1 面团饵 · ' + Math.round(G.NET_CHANCE * 100) +
            '% 概率上 1 条 · 抓完要花 ' + G.BALANCE.netReset.energy + ' 体力重布 · Lv' +
            G.fishLv(state) + ' 上限 ' + netCap + ' 张') + '</div></div>' +
        '<button class="btn mini" data-buynet' +
        ((netLock || state.nets >= netCap || state.coins < G.NET_COST) ? ' disabled' : '') + '>放一张</button>' +
      '</div>' +
      '<div class="store-sub" style="margin-top:10px">🧑‍🌾 雇个渔夫 · 替你重布渔网 + 每天自动钓鱼</div>' +
      '<div class="store-row' + (G.fisherUnlocked(state) ? '' : ' locked') + '">' +
        '<span class="se">🧑‍🌾</span>' +
        '<div><div class="sn">渔夫 ' +
          (state.fisher ? '<b class="own">Lv' + G.fisherLv(state) + '</b>' : '<b class="own">待雇</b>') +
          (G.fisherUnlocked(state) ? '' : ' <b class="lock">需钓鱼 Lv' + G.BALANCE.gate.fisher + '</b>') +
          '</div>' +
        '<div class="sv">' + (G.fisherUnlocked(state)
          ? (state.fisher
            ? '每天 ' + G.fisherCasts(state) + ' 杆（耗你的面团饵）+ 重布全部渔网 · 工资 ' +
              G.fisherWage(state) + ' 金/天 · 经验 ' +
              (G.fisherLv(state) >= G.BALANCE.fisher.max ? '已满级'
                : ((state.fisher.xp || 0) + '/' + G.fisherNeed(state)))
            : '雇佣费 ' + G.BALANCE.fisher.hire + ' 金 · Lv1 每天 ' +
              (G.BALANCE.fisher.baseCasts + 1) + ' 杆，工资 ' + G.BALANCE.fisher.wageBase + ' 金/天')
          : '钓鱼等级到 Lv' + G.BALANCE.gate.fisher + ' 才招得到人') + '</div></div>' +
        (state.fisher
          ? (G.fisherLv(state) >= G.BALANCE.fisher.max
            ? '<button class="btn mini" data-firefisher>辞退</button>'
            : '<button class="btn mini" data-fisherup' +
              (state.coins < G.fisherUpCost(state) ? ' disabled' : '') + '>升 Lv' +
              (G.fisherLv(state) + 1) + '<br><small>' + G.fisherUpCost(state) + ' 金</small></button>' +
              '<button class="btn mini" data-firefisher>辞退</button>')
          : '<button class="btn mini" data-hirefisher' +
            ((!G.fisherUnlocked(state) || state.coins < G.BALANCE.fisher.hire) ? ' disabled' : '') +
            '>雇佣</button>') +
      '</div>' +
      '<div class="shop-tip" style="margin-top:8px">渔夫每天替你<b>重布全部渔网</b>（不花你的体力），' +
        '再自动甩 <b>2 + 等级</b> 杆（耗你的面团饵，钓上来的鱼照常进仓库）。<br>' +
        '他自己会练级：每钓到 1 条 +1 经验，够 <b>' + G.BALANCE.fisher.needBase + ' + ' +
        G.BALANCE.fisher.needStep + '×(等级−1)</b> 就升一级；也能直接花钱升' +
        '（' + G.BALANCE.fisher.upCost + ' × 等级 金）。等级影响<b>咬钩、好鱼、每天杆数和工资</b>。<br>' +
        '发不出工资他会罢工，冬天休息也没工资。</div>';
    openModal('🛒 渔具店', body, '<button class="btn" data-close>关闭</button>');
  }

  /* 规则说明分页：种植 / 钓鱼 / 买卖 / 经营 */
