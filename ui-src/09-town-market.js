/* 我的小农场 · 界面层 / 09-town-market.js
 * 小镇捐赠 / 市场行情 / 市场分析（价格历史）
 * 由 build-ui.cjs 按文件名顺序拼进 ui.js（共享同一个 IIFE 作用域），不要单独加载。
 */

  /* ---------------- 小镇（捐赠换永久加成） ---------------- */

  function townModal() {
    const T = G.BALANCE.town;
    const don = state.townDonated || 0;
    const tier = G.townTier(state);
    const rows = T.map(function (t) {
      const got = don >= t.need;
      const pct = Math.min(100, Math.round(don / t.need * 100));
      return '<div class="store-row' + (got ? '' : ' sold-out') + '">' +
        '<span class="se">' + t.emoji + '</span>' +
        '<div><div class="sn">' + t.name +
          (got ? ' <b class="own">已解锁</b>' : ' <b class="lock">还差 ' + (t.need - don) + ' 金</b>') + '</div>' +
        '<div class="sv">' + t.desc + '</div>' +
        (got ? '' : '<div class="cc-bar" style="margin-top:5px"><i style="width:' + pct + '%"></i></div>') +
        '</div>' +
        '<span class="sp">' + (got ? '✅' : Math.round(pct) + '%') + '</span>' +
      '</div>';
    }).join('');
    const next = G.townNext(state);
    const gap = next ? Math.max(1, next.need - don) : 0;
    function dbtn(amt, label) {
      return '<button class="btn mini" data-donate="' + amt + '"' +
        (state.coins < amt ? ' disabled' : '') + '>' + label + '</button>';
    }
    openModal('🏘️ 小镇 · 捐赠换声望',
      '<div class="shop-head">💰 <b>' + state.coins + '</b> 金 · 累计捐出 <b>' + don +
        '</b> 金 · 声望 ' + tier + ' / ' + T.length + '</div>' +
      rows +
      '<div class="buy-custom" style="margin-top:10px">' +
        '<span>💝 捐赠</span>' +
        (next ? dbtn(gap, '补足下一档 ' + gap + ' 金') : '') +
        dbtn(500, '捐 500') +
        dbtn(2000, '捐 2000') +
        dbtn(10000, '捐 1 万') +
      '</div>' +
      '<div class="shop-tip">捐出去的钱不退，换来的是<b>永久加成</b>：' +
        '「村口小摊」委托报酬 +5%、「镇上有名」商店进价 −10%、「商会会员」买卖市价 +8%，三档可叠加。<br>' +
        '这是后期金币的主要出口 —— 田里赚的钱，最后都该花在镇上。</div>',
      '<button class="btn" data-close>关闭</button>');
  }

  function marketTabs(active) {
    return '<div class="market-tabs" role="tablist" aria-label="市场页面">' +
      '<button class="market-tab' + (active === 'quote' ? ' active' : '') + '"' +
        ' data-market-page="quote" role="tab" aria-selected="' + (active === 'quote') + '">📈 行情</button>' +
      '<button class="market-tab' + (active === 'analysis' ? ' active' : '') + '"' +
        ' data-market-page="analysis" role="tab" aria-selected="' + (active === 'analysis') + '">📊 分析</button>' +
    '</div>';
  }

  function marketModal() {
    const season = G.seasonOf(state.day);
    const OFF = G.BALANCE.market.offSeason;
    /* 再卖多少就掉档 —— 让「饱和」变成能提前规划的事 */
    const headroomText = function (hr, unit) {
      if (hr.atFloor) return '已经到底价了，明天再卖';
      if (hr.toCalm > 0) return '再卖 <b>' + hr.toCalm + '</b> ' + unit + '掉到「平稳」';
      if (hr.toGlut > 0) return '再卖 <b>' + hr.toGlut + '</b> ' + unit + '掉到「过剩」';
      return '再卖 <b>' + hr.toFloor + '</b> ' + unit + '到底价';
    };
    const cropRow = function (c, wild) {
      const mk = G.marketInfo(state, c.id);
      const hr = G.marketHeadroom(state, c.id);
      return '<div class="store-row">' +
        '<span class="se">' + c.emoji + '</span>' +
        '<div><div class="sn">' + c.name +
          (mk.inSeason ? ' <b class="own">当季 ×1</b>' : ' <b class="lock">反季 ×' + mk.season + '</b>') +
          (wild ? ' <b class="own">采集</b>' : '') + '</div>' +
        '<div class="sv">供需 ×' + mk.supply.toFixed(2) + ' · ' + mk.tag +
          ' · ' + headroomText(hr, '件') + '</div></div>' +
        '<span class="sp">×' + mk.total.toFixed(2) + '</span>' +
      '</div>';
    };
    const cropRows = G.CROP_LIST.map(function (c) { return cropRow(c, false); }).join('');
    const wildRows = G.WILD_LIST.map(function (c) { return cropRow(c, true); }).join('');

    const fishRows = G.FISH.filter(function (f) { return !f.trash && !f.chest; }).map(function (f) {
      const mk = G.fishMarketInfo(state, f.name);
      const hr = G.fishMarketHeadroom(state, f.name);
      return '<div class="store-row">' +
        '<span class="se">' + f.emoji + '</span>' +
        '<div><div class="sn">' + f.name +
          (mk.inRun ? ' <b class="own">汛期 ×1</b>' : ' <b class="lock">非汛期 ×' + mk.season + '</b>') + '</div>' +
        '<div class="sv">供需 ×' + mk.supply.toFixed(2) + ' · ' + mk.tag +
          ' · ' + headroomText(hr, '条') + '</div></div>' +
        '<span class="sp">×' + mk.total.toFixed(2) + '</span>' +
      '</div>';
    }).join('');

    openModal('📈 市场',
      marketTabs('quote') +
      '<div class="shop-head">现在是 <b>' + season + '季</b> · 售出会压低供需，睡觉后回落 ' +
        Math.round((1 - G.BALANCE.market.decay) * 100) + '%</div>' +
      '<div class="store-sub">🌱 作物 · 当季 ×1 / 反季 ×' + OFF + '</div>' + cropRows +
      '<div class="store-sub" style="margin-top:10px">🌿 野货 · 采集获得</div>' + wildRows +
      '<div class="store-sub" style="margin-top:10px">🐟 水产 · 汛期 ×1 / 非汛期 ×' + OFF + '</div>' + fishRows +
      '<div class="shop-tip">右侧是当前市价系数；每行显示供需状态和距离下个价格档位的销量。' +
      '一批货按<b>批次中点</b>定价 —— 一次卖 30 件和分三次卖 10 件到手一样多；' +
      '收购箱<b>按入箱时市价锁价</b>、扣 ' + Math.round(G.BALANCE.market.boxFee * 100) + '%。' +
      '成本、利润、走势与下季估值见「分析」。</div>',
      '<button class="btn" data-close>关闭</button>');
  }

  /* ---------------- 市场分析（价格历史） ---------------- */

  /* 迷你折线：宽 120，高 28，纵轴固定 0.5~2.8，跨品种可比 */
  function sparkline(vals) {
    const W = 120, H = 28, PAD = 3, LO = 0.5, HI = 2.8;
    const n = vals.length;
    if (!n) return '<svg class="spark" width="' + W + '" height="' + H + '"></svg>';
    const px = function (i) {
      return PAD + (W - 2 * PAD) * (n === 1 ? 0.5 : i / (n - 1));
    };
    const py = function (v) {
      const t = Math.max(0, Math.min(1, (v - LO) / (HI - LO)));
      return H - PAD - (H - 2 * PAD) * t;
    };
    const pts = vals.map(function (v, i) { return px(i).toFixed(1) + ',' + py(v).toFixed(1); }).join(' ');
    return '<svg class="spark" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">' +
      '<polyline points="' + pts + '" fill="none" stroke="currentColor" stroke-width="1.6" ' +
        'stroke-linejoin="round" stroke-linecap="round"/>' +
      '<circle cx="' + px(n - 1).toFixed(1) + '" cy="' + py(vals[n - 1]).toFixed(1) +
        '" r="2.4" fill="currentColor"/>' +
    '</svg>';
  }

  function analysisModal() {
    const season = G.seasonOf(state.day);
    const days = G.HIST_DAYS;
    const market = G.BALANCE.market;
    const daysToNextSeason = 30 - ((state.day - 1) % 30);
    const townMul = 1 + G.townBonus(state, 'marketBonus');

    /* 预测到下季开季：逐日模拟供需冷却（与睡觉结算的 30% 回落规则一致）。 */
    function nextSeasonMarket(mk, item, isFish) {
      let sold = mk.sold;
      for (let i = 0; i < daysToNextSeason; i++) {
        sold = Math.round(sold * market.decay * 10) / 10;
        if (sold < 0.5) sold = 0;
      }
      const step = isFish ? market.fishStep : market.cropStep;
      const supply = Math.max(market.supplyMin,
        Math.min(market.supplyMax, market.supplyMax - step * sold));
      const seasonMul = isFish
        ? G.fishNextSeasonMul(state, item.name)
        : G.cropNextSeasonMul(state, item.id);
      return { supply: supply, total: supply * seasonMul * townMul };
    }

    /* 当前背包卖给商店的到手金额，与囤到下季开季的估算对比。 */
    const holdings = [];
    G.CROP_LIST.concat(G.WILD_LIST).forEach(function (c) {
      const qty = G.storeCount(state, c.id);
      if (!qty) return;
      const mk = G.marketInfo(state, c.id);
      const nextMk = nextSeasonMarket(mk, c, false);
      const raw = G.storeValue(state, c.id);
      holdings.push({
        name: c.name, emoji: c.emoji, qty: qty, unit: '个',
        now: G.cropNetEstimate(state, c.id),
        next: Math.max(1, Math.round(raw * G.sellBonus(state) * nextMk.total *
          (1 - G.BALANCE.market.boxFee))),
        cost: c.wild ? null : G.cropBuyPrice(c.id, state) * qty
      });
    });
    G.fishGroups(state, 'fish').forEach(function (g) {
      const mk = G.fishMarketInfo(state, g.name);
      const nextMk = nextSeasonMarket(mk, { name: g.name }, true);
      const fishDef = G.fishByName(g.name);
      holdings.push({
        name: g.name, emoji: g.emoji, qty: g.count, unit: '条',
        now: G.fishNetEstimate(state, g.name, g.count, g.total),
        next: Math.max(1, Math.round(g.total * G.sellBonus(state) * nextMk.total *
          (1 - G.BALANCE.market.boxFee))),
        cost: fishDef ? G.fishBuyPrice(fishDef.id, state) * g.count : null
      });
    });
    const holdNow = holdings.reduce(function (n, h) { return n + h.now; }, 0);
    const holdNext = holdings.reduce(function (n, h) { return n + h.next; }, 0);
    const holdDelta = holdNext - holdNow;
    const costed = holdings.filter(function (h) { return h.cost != null; });
    const referenceCost = costed.reduce(function (n, h) { return n + h.cost; }, 0);
    const costedNow = costed.reduce(function (n, h) { return n + h.now; }, 0);
    const costedNext = costed.reduce(function (n, h) { return n + h.next; }, 0);
    const nowMargin = costedNow - referenceCost;
    const nextMargin = costedNext - referenceCost;
    const bestWaits = holdings.filter(function (h) { return h.next > h.now; })
      .sort(function (a, b) { return (b.next - b.now) - (a.next - a.now); }).slice(0, 3);
    const waitText = bestWaits.length
      ? '更适合等的库存：' + bestWaits.map(function (h) {
          return h.emoji + ' ' + h.name + ' ×' + h.qty + h.unit + ' +' + (h.next - h.now) + ' 金';
        }).join(' · ')
      : (holdings.length ? '按当前估算，现有库存没有品种适合等到下季再卖。' : '仓库里还没有可比较的作物或鱼。');

    function row(key, item, isFish) {
      const mk = isFish ? G.fishMarketInfo(state, item.name) : G.marketInfo(state, item.id);
      const series = G.marketSeries(state, key, mk.total);
      const nxt = isFish ? G.fishNextSeasonMul(state, item.name) : G.cropNextSeasonMul(state, item.id);
      const base = isFish ? item.base : item.price;
      const marketBase = Math.max(1, Math.round(base * mk.total));
      const nextMk = nextSeasonMarket(mk, item, isFish);
      const nextSale = Math.max(1, Math.round(base * G.sellBonus(state) * nextMk.total *
        (1 - G.BALANCE.market.boxFee)));
      const unit = isFish ? '条' : '个';
      const buyCost = isFish ? G.fishBuyPrice(item.id, state)
        : (item.wild ? null : G.cropBuyPrice(item.id, state));
      const oneSale = Math.max(1, Math.round(base * G.sellBonus(state) * mk.total *
        (1 - G.BALANCE.market.boxFee)));
      const unitMargin = buyCost == null ? null : oneSale - buyCost;
      const wk = series.slice(-7);
      const trend = wk.length > 1 && wk[0] > 0
        ? (wk[wk.length - 1] - wk[0]) / wk[0] * 100 : 0;
      const head = wk.length > 1
        ? '近 ' + wk.length + ' 点 ' + wk[0].toFixed(2) + ' → ' + wk[wk.length - 1].toFixed(2) +
          '（' + (trend > 0 ? '+' : '') + trend.toFixed(0) + '%）'
        : '只有今天 ' + (wk[0] || 0).toFixed(2);
      const tag = isFish
        ? (mk.inRun ? '<b class="own">汛期</b>' : '<b class="lock">非汛期</b>')
        : (mk.inSeason ? '<b class="own">当季</b>' : '<b class="lock">反季</b>');
      return '<div class="store-row">' +
        '<span class="se">' + (item.emoji || '') + '</span>' +
        '<div style="flex:1;min-width:0">' +
          '<div class="sn">' + item.name + ' ' + tag +
            ' <b class="own">×' + mk.total.toFixed(2) + '</b> · 标准品质市场基准价 <b>' + marketBase + '</b> 金/' + unit + '</div>' +
          '<div class="sv">销量 ' + mk.sold.toFixed(0) + ' ' + unit + ' · 供需 ×' +
            mk.supply.toFixed(2) + ' · 季节 ×' + mk.season.toFixed(2) + ' · ' + head + '</div>' +
          '<div class="sv">' + (buyCost == null
            ? '单件收购箱到手 ' + oneSale + ' 金 · 采集现金成本未计'
            : '单件参考进价 ' + buyCost + ' 金 · 收购箱到手 ' + oneSale + ' 金 · 毛差 <b class="' +
              (unitMargin > 0 ? 'market-up' : (unitMargin < 0 ? 'market-down' : '')) + '">' +
              (unitMargin > 0 ? '+' : '') + unitMargin + ' 金</b>') + '</div>' +
          '<div class="sv">' + daysToNextSeason + ' 天后下季开市 ×' + nextMk.total.toFixed(2) +
            (nxt > 1 ? '（转' + (isFish ? '非汛期' : '反季') + '）' : '') +
            ' → 单件卖出到手约 <b>' + nextSale + '</b> 金</div>' +
        '</div>' +
        '<span class="sparkwrap">' + sparkline(series) + '</span>' +
      '</div>';
    }

    const cropRows = G.CROP_LIST.map(function (c) { return row(c.id, c, false); }).join('');
    const wildRows = G.WILD_LIST.map(function (c) { return row(c.id, c, false); }).join('');
    const fishRows = G.FISH.filter(function (f) { return !f.trash && !f.chest; })
      .map(function (f) { return row('f:' + f.name, f, true); }).join('');

    const tracked = Object.keys(state.marketHist || {}).length;
    const portfolio = '<div class="market-portfolio">' +
      '<div class="store-sub">📦 当前库存 · 成本与利润参考 · ' +
        holdings.reduce(function (n, h) { return n + h.qty; }, 0) + ' 件</div>' +
      (holdings.length
        ? '<div class="market-portfolio-grid">' +
            '<div><span>参考进货成本</span><b>' + referenceCost + ' 金</b></div>' +
            '<div><span>成本货现在卖</span><b>' + costedNow + ' 金</b></div>' +
            '<div class="' + (nowMargin > 0 ? 'market-up' : (nowMargin < 0 ? 'market-down' : '')) + '">' +
              '<span>现在参考毛差</span><b>' + (nowMargin > 0 ? '+' : '') + nowMargin + ' 金</b></div>' +
            '<div><span>成本货下季卖</span><b>' + costedNext + ' 金</b></div>' +
            '<div class="' + (nextMargin > 0 ? 'market-up' : (nextMargin < 0 ? 'market-down' : '')) + '">' +
              '<span>下季参考毛差</span><b>' + (nextMargin > 0 ? '+' : '') + nextMargin + ' 金</b></div>' +
          '</div><div class="sv market-wait-note">' +
            '全库存估算：现在卖 ' + holdNow + ' 金 · 下季卖 ' + holdNext + ' 金 · 等待变化 ' +
            (holdDelta > 0 ? '+' : '') + holdDelta + ' 金。' + waitText + '</div>'
        : '<div class="sv market-wait-note">仓库里还没有可比较的作物或鱼。</div>') +
    '</div>';
    openModal('📈 市场',
      marketTabs('analysis') +
      '<div class="shop-head">现在是 <b>' + season + '季</b> · 已记录 <b>' + days +
        '</b> 天内最多 <b>' + days + '</b> 个价格点（存了 ' + tracked + ' 种货）</div>' +
      portfolio +
      '<div class="store-sub">🌱 作物</div>' + cropRows +
      '<div class="store-sub" style="margin-top:10px">🌿 野货（采集）</div>' + wildRows +
      '<div class="store-sub" style="margin-top:10px">🐟 水产</div>' + fishRows +
      '<div class="shop-tip">每行显示<b>标准品质市场基准价</b>、<b>单件商店进价 / 卖出价 / 毛差</b>、<b>销量 / 供需 / 季节</b>、<b>近期价格变化</b>和价格曲线，' +
        '右边那条线是最近 30 天的市价系数（纵轴固定 0.5~2.8，所以不同货能直接比）。<br>' +
        '<b>成本口径：</b>单件买卖价按标准品质估算；持仓毛差使用当前商店进价作补货成本参考，不是历史实际成本；自产成本、野货采集体力未计。' +
        '<b>下季开市估算</b>按“等待期间不再卖货”计算，并逐日计入市场销量回落；未计入委托收益、税费和等待期间的经营成本。</div>',
      '<button class="btn" data-close>关闭</button>');
  }
