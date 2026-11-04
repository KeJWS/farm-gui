/* 我的小农场 · 界面层 / 10-tea-depart-status.js
 * 下午茶 / 百货店 / 设置 / 当前状态
 * 由 build-ui.cjs 按文件名顺序拼进 ui.js（共享同一个 IIFE 作用域），不要单独加载。
 */

  function teaModal() {
    const canDrink = !state.teaUsed && state.energy < state.maxEnergy;
    const rows = G.TEA_LIST.map(function (t) {
      const have = (state.teas && state.teas[t.id]) || 0;
      const open = state.day >= t.day;
      return '<div class="store-row' + (have ? '' : ' sold-out') + (open ? '' : ' locked') + '">' +
        '<span class="se">' + t.emoji + '</span>' +
        '<div><div class="sn">' + t.name +
          ' <b class="own">库存 ' + have + '</b></div>' +
        '<div class="sv">体力 +' + t.energy + ' · ' + t.desc +
          (open ? '' : ' · 第 ' + t.day + ' 天起供应') + '</div></div>' +
        '<button class="btn mini" data-tea="' + t.id + '"' +
          (!have || !canDrink ? ' disabled' : '') + '>喝</button></div>';
    }).join('');

    openModal('🍵 下午茶',
      '<div class="shop-head">🔥 体力 <b>' + state.energy + '</b> / ' + state.maxEnergy + '</div>' +
      '<div class="store-sub">一天只能喝一杯 · 消耗一份茶' +
        (state.teaUsed ? '（今天已经喝过了）' : '') + '</div>' + rows +
      '<div class="shop-tip">茶在<b>百货店</b>买；不同的茶回体力不一样，贵的更划算。<br>' +
        '还没买的茶显示库存 0。</div>',
      '<button class="btn" data-act="depart">🏬 去百货店买茶</button>' +
      '<button class="btn" data-close>关闭</button>');
  }

  /* ---------------- 百货店 ---------------- */

  function departModal() {
    const teaRows = G.TEA_LIST.map(function (t) {
      const open = state.day >= t.day;
      const have = (state.teas && state.teas[t.id]) || 0;
      return '<div class="store-row' + (open ? '' : ' locked') + '">' +
        '<span class="se">' + t.emoji + '</span>' +
        '<div><div class="sn">' + t.name +
          (open ? ' <b class="own">库存 ' + have + '</b>' : ' <b class="lock">第 ' + t.day + ' 天起</b>') +
          '</div><div class="sv">' + t.price + ' 金 · 体力 +' + t.energy + ' · ' + t.desc + '</div></div>' +
        '<button class="btn mini" data-buytea="' + t.id + '"' +
          (!open || state.coins < t.price ? ' disabled' : '') + '>买1</button>' +
        (open ? '<button class="btn mini" data-buytea="' + t.id + '" data-n="3"' +
          (state.coins < t.price * 3 ? ' disabled' : '') + '>买3</button>' : '') +
        '</div>';
    }).join('');

    const treeRows = G.TREE_LIST.map(function (t) {
      const seedPrice = G.treeBuyPrice(state, t.id, 'seed');
      const sapPrice = G.treeBuyPrice(state, t.id, 'sapling');
      const seedN = G.treeStockCount(state, t.id, 'seed');
      const sapN = G.treeStockCount(state, t.id, 'sapling');
      return '<div class="store-row">' +
        '<span class="se">' + t.emoji + '</span>' +
        '<div><div class="sn">' + t.name + ' <b class="own">' + G.SEASONS[t.season] + '季结果</b>' +
          ((seedN || sapN) ? ' <b class="own">库存 ' + (seedN + sapN) + '</b>' : '') + '</div>' +
          '<div class="sv">种子 ' + seedPrice + ' 金（浇水 ' + G.BALANCE.orchard.grow.seed.water +
            ' 天 + 生长 ' + G.BALANCE.orchard.grow.seed.days + ' 天）· 树苗 ' + sapPrice + ' 金（浇水 ' +
            G.BALANCE.orchard.grow.sapling.water + ' 天 + 生长 ' + G.BALANCE.orchard.grow.sapling.days +
            ' 天）· 成树当季每天 ' + G.BALANCE.orchard.fruitMin + '–' + G.BALANCE.orchard.fruitMax +
            ' 个 · ' + t.fruit + ' ' + t.price + ' 金/个</div></div>' +
        '<button class="btn mini" data-buytree="' + t.id + '" data-mode="seed"' +
          (state.coins < seedPrice ? ' disabled' : '') + '>种子</button>' +
        '<button class="btn mini" data-buytree="' + t.id + '" data-mode="sapling"' +
          (state.coins < sapPrice ? ' disabled' : '') + '>树苗</button></div>';
    }).join('');

    const keyRows = Object.keys(G.KEYS).map(function (id) {
      const k = G.KEYS[id];
      const open = G.keyUnlocked(state, id);
      const have = (state.keys && state.keys[id]) || 0;
      const tGate = G.keyTradeGate(id);
      const fishOk = G.fishLv(state) >= k.lv;
      const lockTxt = !fishOk ? '钓鱼 Lv' + k.lv + ' 解锁' : '交易 Lv' + tGate + ' 解锁';
      return '<div class="store-row' + (open ? '' : ' locked') + '">' +
        '<span class="se">' + k.emoji + '</span>' +
        '<div><div class="sn">' + k.name +
          (open ? ' <b class="own">持有 ' + have + '</b>' : ' <b class="lock">' + lockTxt + '</b>') +
          '</div><div class="sv">' + (open ? Math.round(k.price * G.tradeCut(state)) + ' 金 · 开' + k.opens :
            (!fishOk ? '钓鱼等级到 Lv' + k.lv + ' 才上架' : '交易等级到 Lv' + tGate + ' 才上架')) + '</div></div>' +
        '<button class="btn mini" data-buykey="' + id + '"' +
          (!open || state.coins < k.price ? ' disabled' : '') + '>买1</button></div>';
    }).join('');

    // 百货店只收宝箱，杂物一律不收（只能进收购箱）
    const junk = G.fishGroups(state, 'junk').filter(function (g) { return g.chest; });    const CHECK = {
      wood: '开箱 10–26 金',
      iron: '开箱：肥料×6–9 / 种子×8–12 / 面团×12–18 / 蚯蚓×12–18',
      gold: '开箱：200–320 金 + 特效肥×3–5 / 稀有种子×2–3 / 蚯蚓×14–18'
    };
    const junkRows = junk.length ? junk.map(function (g) {
      const k = G.CHESTS[g.chest];
      const needKey = k && k.key;
      const keys = (state.keys && state.keys[needKey]) || 0;
      const loot = CHECK[g.chest] || '';
      return '<div class="store-row">' +
        '<span class="se">' + g.emoji + '</span>' +
        '<div><div class="sn">' + g.name + ' ×' + g.count + '</div>' +
        '<div class="sv">' + (needKey ? '要' + G.KEYS[needKey].name + '（持有 ' + keys + '）· ' : '直接开 · ') +
          loot + ' · 回收 ' + G.shopValue(g.v) + ' 金/个</div></div>' +
        '<button class="btn mini primary" data-openchest="' + g.key + '"' +
          (needKey && !keys ? ' disabled' : '') + '>开箱</button>' +
        '<button class="btn mini" data-selljunk="' + g.key + '">回收</button></div>';
    }).join('') : '<div class="store-empty">还没有宝箱，去河边捞一捞</div>';

    openModal('🏬 百货店',
      '<div class="shop-head">💰 <b>' + state.coins + '</b> 金</div>' +
      '<div class="store-sub">🍵 茶叶 · 买回去喝下午茶</div>' + teaRows +
      '<div class="store-sub" style="margin-top:10px">🌳 果树种子 / 树苗 · ' +
        (G.orchardUnlocked(state) ? '果园已开垦' : '种田 Lv' + G.BALANCE.orchard.unlockLv + ' 开垦果园后能种') +
        '</div>' + treeRows +
      '<div class="store-sub" style="margin-top:10px">🗝️ 钥匙 · 钓鱼 Lv' + G.KEYS.iron.lv + ' / Lv' +
        G.KEYS.gold.lv + ' + 交易 Lv' + G.BALANCE.gate.goldKeyTrade + ' 解锁</div>' + keyRows +
      '<div class="store-sub" style="margin-top:10px">♻️ 宝箱回收 · 只收宝箱，杂物不收</div>' + junkRows +
      '<div class="shop-tip">宝箱按钓鱼等级掉落：木制随便掉、铁制 <b>Lv' + G.BALANCE.chest.ironLv +
        '</b> 起、黄金 <b>Lv' + G.BALANCE.chest.goldLv + '</b> 起后两者要用钥匙开。<br>' +
        '对照：铁箱一包物资（约 80 金），钥匙 40；金箱 200–320 金 + 一件高级物品，钥匙 120 —— <b>开箱比回收划算</b>，钥匙不够就先攒着。<br>' +
        '杂物和宝箱也能放进<b>收购箱</b>按原价结算，但通常没有开箱值。</div>',
      '<button class="btn" data-close>关闭</button>');
  }

  function settingsModal() {
    openModal('⚙️ 设置',
      '<div class="action-grid">' +
        '<button class="btn" id="set-help">📖 农场指南</button>' +
        '<button class="btn" id="set-theme">' + (theme === 'dark' ? '🌙 黑夜模式：开' : '☀️ 黑夜模式：关') + '</button>' +
        '<button class="btn" id="set-share">🖼️ 分享名片<small>当前农场 · PNG</small></button>' +
        '<button class="btn" id="set-export">⬇️ 导出存档<small>.json</small></button>' +
        '<button class="btn" id="set-import">⬆️ 导入存档<small>.json</small></button>' +
        '<button class="btn" id="set-sound">' + (soundOn ? '🔊 音效：开' : '🔇 音效：关') + '</button>' +
        '<button class="btn danger" id="set-reset">🔄 重新开始</button>' +
      '</div>' +
      '<div class="shop-tip">进度自动保存在本浏览器（localStorage）；换设备用导出 / 导入。</div>',
      '<button class="btn" data-close>关闭</button>');
  }

  /* ---------------- 经营档案 ---------------- */

  function profileModal() {
    const w = G.netWorth(state);
    const rank = G.profileRank(state);
    const st = state.stats || {};
    const inc = st.incomeTotal || 0;
    const exp = st.expenseTotal || 0;
    const net = inc - exp;
    const days = Math.max(1, state.day || 1);
    const perDay = Math.round(net / days);
    const byDay = G.ledgerByDay(state);
    const best = byDay.slice().sort(function (a, b) {
      return (b.income - b.expense) - (a.income - a.expense);
    })[0];

    const bar = function (name, value, max) {
      return '<div class="stat-bar">' +
        '<span class="sb-n">' + name + '</span>' +
        '<span class="sb-t"><i class="in" style="width:' + Math.max(2, Math.round(value / max * 100)) + '%"></i></span>' +
        '<b>' + value + '</b>' +
      '</div>';
    };

    const parts = [
      ['💰 现金', w.coins], ['🧺 仓库', w.store], ['📦 收购箱', w.box],
      ['🔧 设备', w.device], ['🍑 果园', w.orchard]
    ].filter(function (p) { return p[1] > 0; });
    const maxPart = Math.max(1, parts.reduce(function (m, p) { return Math.max(m, p[1]); }, 0));
    const partBars = parts.map(function (p) { return bar(p[0], p[1], maxPart); }).join('') ||
      '<div class="store-empty">身上什么都没有</div>';

    /* 全程收入构成：账本最多保留 200 笔，这里按剩余账本 + 累计值说明 */
    const cat = G.ledgerByCategory(state, days);
    const maxCat = Math.max(1, cat.list.reduce(function (m, c) { return Math.max(m, Math.abs(c.total)); }, 0));
    const catBars = cat.list.map(function (c) {
      const v = Math.abs(c.total);
      return '<div class="stat-bar">' +
        '<span class="sb-n">' + c.name + '</span>' +
        '<span class="sb-t"><i class="' + (c.total > 0 ? 'in' : 'out') + '" style="width:' +
          Math.max(2, Math.round(v / maxCat * 100)) + '%"></i></span>' +
        '<b class="' + (c.total > 0 ? 'up' : 'down') + '">' + (c.total > 0 ? '+' : '−') + v + '</b>' +
      '</div>';
    }).join('') || '<div class="store-empty">还没有账目</div>';

    const fx = (state.codex && state.codex.fish) || {};
    const cx = (state.codex && state.codex.crops) || {};
    const species = G.FISH.filter(function (f) { return !f.trash && !f.chest; });
    const fishGot = species.filter(function (f) { return fx[f.id] && fx[f.id].n > 0; }).length;
    const cropGot = G.CROP_LIST.filter(function (c) { return cx[c.id] && cx[c.id].n > 0; }).length;
    const fruitGot = G.FRUIT_LIST.filter(function (c) { return cx[c.id] && cx[c.id].n > 0; }).length;
    const achs = G.achInfo(state);
    const done = achs.filter(function (a) { return a.done; }).length;
    const lv = state.levels || {};
    const topLv = Math.max(lv.farm || 1, lv.fish || 1, lv.dig || 1, lv.forage || 1, lv.trade || 1);

    const body =
      '<div class="profile-head">' +
        '<span class="profile-rank">' + rank.cur.emoji + '</span>' +
        '<div class="profile-title"><b>' + rank.cur.name + '</b>' +
          '<small>第 ' + state.day + ' 天 · ' + G.seasonOf(state.day) + '季 · ' +
          state.plots.length + ' 块地</small></div>' +
        '<div class="profile-worth"><small>净资产</small><b>' + w.total + '</b><small>金</small></div>' +
      '</div>' +
      '<div class="stat-kpis">' +
        '<div class="stat-kpi"><span>累计收入</span><b class="up">+' + inc + '</b><small>日均 +' +
          Math.round(inc / days) + '</small></div>' +
        '<div class="stat-kpi"><span>累计支出</span><b class="down">−' + exp + '</b><small>日均 −' +
          Math.round(exp / days) + '</small></div>' +
        '<div class="stat-kpi"><span>累计净收益</span><b class="' + (net >= 0 ? 'up' : 'down') + '">' +
          (net >= 0 ? '+' : '−') + Math.abs(net) + '</b><small>日均 ' + (perDay >= 0 ? '+' : '−') +
          Math.abs(perDay) + '</small></div>' +
        '<div class="stat-kpi"><span>经营天数</span><b>' + state.day + '</b><small>' +
          (best ? '最佳 D' + best.day + ' +' + (best.income - best.expense) : '还没有账目') + '</small></div>' +
      '</div>' +
      '<div class="stat-sec"><h4>💰 资产构成 · 合计 ' + w.total + ' 金</h4>' + partBars + '</div>' +
      '<div class="stat-sec"><h4>📈 收入构成</h4>' + catBars + '</div>' +
      '<div class="stat-sec"><h4>🏅 经营进度</h4><dl class="kv">' +
        '<dt>成就</dt><dd>' + done + ' / ' + achs.length + '</dd>' +
        '<dt>图鉴</dt><dd>🐟 ' + fishGot + '/' + species.length + ' · 🌱 ' + cropGot + '/' +
          G.CROP_LIST.length + ' · 🍑 ' + fruitGot + '/' + G.FRUIT_LIST.length + '</dd>' +
        '<dt>最高等级</dt><dd>Lv' + topLv + ' / ' + G.BALANCE.level.max + '</dd>' +
        '<dt>完成委托</dt><dd>' + (st.orders || 0) + ' 单 · 累计收获 ' + (st.harvests || 0) +
          ' 次 · 钓鱼 ' + (st.casts || 0) + ' 次</dd>' +
        '<dt>累计种树</dt><dd>' + (st.orchardPlanted || 0) + ' 棵 · 收果 ' + (st.orchardFruit || 0) + ' 个</dd>' +
      '</dl></div>' +
      '<div class="stat-tip">' +
        (rank.next
          ? '再攒 <b>' + (rank.next.need - w.total) + '</b> 金净资产 → ' + rank.next.emoji + ' ' + rank.next.name
          : '已经是最高称号 ' + rank.cur.emoji + ' ' + rank.cur.name) +
        '。累计收支从本版本开始精确累计，老存档按剩余账本估算。</div>';

    openModal('🗂️ 经营档案', body, '<button class="btn" data-close>关闭</button>');
  }

  function statusModal() {
    const lv = state.levels || { farm: 1, fish: 1, farmXp: 0, fishXp: 0 };
    const nextTax = G.BALANCE.tax.every - (state.day % G.BALANCE.tax.every);

    const sec = function (title, rows) {
      return '<div class="stat-sec"><h4>' + title + '</h4><dl class="kv">' +
        rows.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>'; }).join('') +
      '</dl></div>';
    };

    const progress = [
      ['进度', '第 ' + state.day + ' 天 · ' + G.seasonOf(state.day) + '季'],
      ['金币', state.coins + ' 金'],
      ['体力', state.energy + ' / ' + state.maxEnergy + ' · 伙食 ' + G.mealFee(state) + ' 金/天'],
      ['土地', state.plots.length + ' 块 · 洒水器 ' + state.sprinklers + ' 个'],
      ['设备', (state.harvester ? '自动收获器 ✅ · ' : '自动收获器 — · ') +
        '自动播种器 ×' + G.seederCount(state) + (G.seederCount(state) ? '（每晚 ' + G.seederPlots(state) + ' 块）' : '') +
        ' · 渔网 ' + state.nets + ' 张（已布 ' + G.netSetCount(state) + '）' +
        (state.fisher ? ' · 渔夫 Lv' + G.fisherLv(state) : '')],
      ['果园', (function () {
        if (!G.orchardUnlocked(state)) {
          return '未开垦（种田 Lv' + G.BALANCE.orchard.unlockLv + ' + ' + G.BALANCE.orchard.unlockCost + ' 金）';
        }
        const o = G.orchardSummary(state);
        return '树坑 ' + o.total + '/' + o.max + ' · 成树 ' + o.mature + '（当季 ' + o.inSeason + '）' +
          ' · 育苗 ' + o.growing + ' · 待收 ' + o.ripe + ' 个 · 待浇水 ' + o.thirsty + ' 棵';
      })()],
      ['果园累计', (function () {
        const cx = (state.codex && state.codex.crops) || {};
        const val = G.FRUIT_LIST.reduce(function (a, f) {
          return a + ((cx[f.id] && cx[f.id].value) || 0);
        }, 0);
        const got = G.FRUIT_LIST.filter(function (f) { return cx[f.id] && cx[f.id].n > 0; }).length;
        return '种树 ' + ((state.stats && state.stats.orchardPlanted) || 0) + ' 棵 · 收果 ' +
          ((state.stats && state.stats.orchardFruit) || 0) + ' 个 · 水果图鉴 ' + got + '/' +
          G.FRUIT_LIST.length + ' · 价值 ' + val + ' 金';
      })()]
    ];

    const assets = [
      ['仓库', '收购箱到手约 ' + G.storeNetEstimate(state) + ' 金'],
      ['收购箱', G.boxCount(state) + ' 批 · 预计 ' + G.boxValue(state) + ' 金（睡觉结算，扣 5%）'],
      ['茶叶', (function () {
        const list = G.teaStock(state);
        return list.length ? list.map(function (t) { return t.emoji + t.name + '×' + state.teas[t.id]; }).join(' · ')
          : '没有茶了（百货店有卖）';
      })()],
      ['钥匙', '🗝️ 铁 ×' + ((state.keys && state.keys.iron) || 0) + ' · 🔑 金 ×' + ((state.keys && state.keys.gold) || 0)],
      ['宝箱', '已开 ' + (state.stats.chests || 0) + ' 个 · 待开 ' +
        G.fishGroups(state, 'junk').filter(function (g) { return g.chest; })
          .reduce(function (n, g) { return n + g.count; }, 0) + ' 个'],
      ['维护费', '每周 ' + (G.plotUpkeep(state.plots.length) + G.deviceUpkeep(state)) +
        ' 金（土地 ' + G.plotUpkeep(state.plots.length) + ' + 设备 ' + G.deviceUpkeep(state) + '）'],
      ['税金', '还有 ' + nextTax + ' 天 · 约 ' + G.taxDue(state) + ' 金（累进 2% / 4% / 6%，最低 ' +
        G.BALANCE.tax.min + '）']
    ];

    const levels = [
      ['种田等级', 'Lv' + lv.farm + (lv.farm >= G.BALANCE.level.max ? '（满级）' :
        '（' + lv.farmXp + '/' + G.levelNeed(lv.farm) + '）') + ' · ' + G.levelEffectText('farm', lv.farm)],
      ['钓鱼等级', 'Lv' + lv.fish + (lv.fish >= G.BALANCE.level.max ? '（满级）' :
        '（' + lv.fishXp + '/' + G.levelNeed(lv.fish) + '）') + ' · ' + G.levelEffectText('fish', lv.fish)],
      ['挖蚯蚓等级', 'Lv' + (lv.dig || 1) + ((lv.dig || 1) >= G.BALANCE.level.max ? '（满级）' :
        '（' + (lv.digXp || 0) + '/' + G.levelNeed(lv.dig || 1) + '）') + ' · ' +
        G.levelEffectText('dig', lv.dig || 1)],
      ['采集等级', 'Lv' + (lv.forage || 1) + ((lv.forage || 1) >= G.BALANCE.level.max ? '（满级）' :
        '（' + (lv.forageXp || 0) + '/' + G.levelNeed(lv.forage || 1) + '）') + ' · ' +
        G.levelEffectText('forage', lv.forage || 1)],
      ['交易等级', 'Lv' + (lv.trade || 1) + ((lv.trade || 1) >= G.BALANCE.level.max ? '（满级）' :
        '（' + (lv.tradeXp || 0) + '/' + G.levelNeed(lv.trade || 1, 'trade') + '）') + ' · ' +
        G.levelEffectText('trade', lv.trade || 1)]
    ];

    const totals = [
      ['累计播种', state.stats.planted + ' 次'],
      ['累计收获', state.stats.harvests + ' 次'],
      ['累计钓鱼', state.stats.casts + ' 次'],
      ['累计挖蚯蚓', state.stats.dug + ' 次'],
      ['采集记录', (function () {
        const n = state.stats.forages || 0;
        if (!n) return '还没去过后山';
        const w = state.stats.wild || {};
        const parts = G.WILD_LIST.filter(function (x) { return (w[x.id] || 0) > 0; })
          .map(function (x) { return x.emoji + x.name + '×' + w[x.id]; });
        return '共 ' + n + ' 次' + (parts.length ? ' · ' + parts.join(' · ') : '') +
          (state.stats.forageBest >= 3 ? ' · 单次最多 3 件' : '');
      })()],
      ['卖出作物', (state.stats.cropsSold || 0) + ' 个'],
      ['完成委托', (state.stats.orders || 0) + ' 单'],
      ['成就', (function () {
        const list = G.achInfo(state);
        return list.filter(function (a) { return a.done; }).length + ' / ' + list.length;
      })()]
    ];

    openModal('📊 当前状态',
      sec('🌱 农场与进度', progress) + sec('💰 资产与开销', assets) +
      sec('📈 等级', levels) + sec('🏆 累计', totals),
      '<button class="btn" data-close>关闭</button>');
  }
