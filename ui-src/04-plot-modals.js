/* 我的小农场 · 界面层 / 04-plot-modals.js
 * 地块弹窗 / 铲除确认 / 选种 / 种子店 / 全部施肥
 * 由 build-ui.cjs 按文件名顺序拼进 ui.js（共享同一个 IIFE 作用域），不要单独加载。
 */

  /* ---------------- 农田弹窗 ---------------- */

  function plotModal(i) {
    const p = state.plots[i];
    if (!p.crop) {
      if (G.isWinter(state.day)) { toast('❄️ 冬天土地封冻，开春再种', 'warn'); return; }
      return cropPicker(i);
    }

    const c = G.CROPS[p.crop];
    const need = G.needOf(p);
    const can = G.canHarvest(state, p);
    const big = !!c.big;

    let actions = '';
    if (p.phase === 'ripe') {
      actions += '<button class="btn primary" data-pact="harvest" data-i="' + i + '">' +
        (can ? '🧺 收获' : '⏳ 明天才能收') + '<small>' + G.BALANCE.energy.harvest + ' 体力</small></button>';
    } else {
      actions += '<button class="btn primary" data-pact="water" data-i="' + i + '"' +
        (p.watered ? ' disabled' : '') + '>💧 浇水<small>' + (p.watered ? '今天浇过了' : G.waterCost(state) + ' 体力 · +1 天') + '</small></button>';
      if (!big) {
        const fn = G.FERT.normal, fs = G.FERT.special;
        const nOwn = state.ferts.normal || 0, sOwn = state.ferts.special || 0;
        actions += '<button class="btn" data-pact="fert-normal" data-i="' + i + '"' +
          (p.fert || !nOwn ? ' disabled' : '') + '>🧪 普通肥<small>库存 ' + nOwn + ' · +1 产量</small></button>';
        actions += '<button class="btn" data-pact="fert-special" data-i="' + i + '"' +
          (p.fert || !sOwn ? ' disabled' : '') + '>💊 特效肥<small>库存 ' + sOwn + ' · +2 产量</small></button>';
      }
    }
    actions += '<button class="btn danger" data-pact="clear" data-i="' + i + '">🗑️ 铲除<small>不返还种子</small></button>';

    const body =
      '<div style="display:flex;gap:16px;align-items:center;margin-bottom:14px">' +
        '<div style="font-size:54px;filter:drop-shadow(0 4px 8px rgba(90,65,35,.2))">' + G.stageEmoji(p) + '</div>' +
        '<div><div style="font-size:17px;font-weight:800">' + c.name +
          (p.phase === 'regrow' ? ' <span style="font-size:11px;color:var(--ink-3)">（再生期 ' + (p.hits) + '/' + (c.regrowTimes + 1) + ' 次）</span>' : '') +
        '</div>' +
        '<div style="font-size:12px;color:var(--ink-2);margin-top:3px">' +
          '生长 ' + p.growth + '/' + need + ' 天 · 售价 ' + c.price + ' 金/个</div></div>' +
      '</div>' +
      '<dl class="kv">' +
        '<dt>当前状态</dt><dd>' + (p.phase === 'ripe' ? (can ? '✅ 可以收获' : '🌾 刚成熟，明天可收') : '🌱 生长中') + '</dd>' +
        '<dt>预计产量</dt><dd>' + G.expectedYield(state, p) + ' 个' +
          (big ? '（大作物固定 1）' : (p.fert ? '（含施肥 +' + p.fert + '）' : '')) + '</dd>' +
        '<dt>漏浇天数</dt><dd>' + (p.missed ? '<span style="color:#b4771f">' + p.missed + ' 天（产量 -' + p.missed + '）</span>' : '0 天 👍') + '</dd>' +
        '<dt>施肥</dt><dd>' + (p.fert ? '🧪 +' + p.fert + ' 产量' : (big ? '大作物不吃肥料' : '未施肥')) + '</dd>' +
        '<dt>品质</dt><dd>' +
          (p.phase === 'ripe' ? '收获时揭晓'
            : (p.fert ? '施肥 ' + p.fert + ' 档 → 收获时取 ' + (p.fert + 1) + ' 次最好'
                      : '待定（施肥可拉高，最高取 3 次最好）')) + '</dd>' +
      '</dl>' +
      (c.multi
        ? '<div style="margin:-2px 0 12px;font-size:11.5px;font-weight:700;color:var(--ink-2);' +
          'background:#f2f8ee;border:1px solid rgba(79,156,95,.28);border-radius:9px;padding:7px 10px">' +
          '🌿 多次收获：共 ' + (c.regrowTimes + 1) + ' 收，仅最后一收才判定 30% 留种</div>'
        : '') +
      '<div class="action-grid">' + actions + '</div>';

    openModal(c.emoji + ' ' + '第 ' + (i + 1) + ' 号地 · ' + c.name, body,
      '<button class="btn" data-close>关闭</button>');
  }

  function confirmClear(i) {
    const p = state.plots[i];
    if (!p || !p.crop) return;
    const c = G.CROPS[p.crop];
    openModal('🗑️ 铲除 ' + c.name,
      '<div style="font-size:13px;line-height:1.8">第 ' + (i + 1) + ' 号地会变回空地，' +
      '<b>不返还种子或金币</b>，作物直接消失。<br>确定吗？</div>',
      '<button class="btn" data-close>取消</button>' +
      '<button class="btn danger" data-clear="' + i + '">确定铲除</button>');
  }

  function cropPicker(i, batch) {
    const seedTotal = Object.keys(state.seeds).reduce(function (n, k) { return n + (state.seeds[k] || 0); }, 0);
    if (!seedTotal) {
      toast('先去种子店买点种子吧 🌰', 'warn');
      return seedShop();
    }

    const offMul = G.BALANCE.seed.offSeasonMul;
    const offDays = G.BALANCE.seed.offSeasonDays;
    const offPen = G.BALANCE.seed.offSeasonYield;
    const marketMul = G.BALANCE.market.offSeason;
    const cards = G.CROP_LIST.map(function (c) {
      const owned = state.seeds[c.id] || 0;
      const inSeason = G.cropSeasonOk(c.id, state.day);
      const dis = owned <= 0 || state.energy < 1;
      const days = inSeason ? c.days : (c.big ? c.days * 2 : c.days + offDays);
      const price = Math.round(c.price * (inSeason ? 1 : marketMul));
      const seedCost = Math.ceil(c.seed * (inSeason ? 1 : offMul));
      const lvBonus = G.farmYieldBonus(state);
      let profit = '';
      let lineY = '';
      let lineP = '';
      let qty = 0;
      if (c.multi) {
        qty = Math.max(1, c.firstQty - (inSeason ? 0 : offPen)) + c.regrowTimes * c.regrowQty;
        lineY = days + ' 天 · 共 ' + qty + ' 个';
        lineP = price + ' 金/个 · 多次收';
      } else if (c.big) {
        qty = 1;
        lineY = days + ' 天 · 固定 1 个';
        lineP = price + ' 金/个';
      } else {
        qty = Math.max(1, c.base + lvBonus - (inSeason ? 0 : offPen));
        lineY = days + ' 天 · 产 ' + qty + ' 个';
        lineP = price + ' 金/个';
      }
      profit = '净 +' + (qty * price - seedCost) + (c.multi || c.big ? '' : '~');
      return '<button class="crop-card" data-crop="' + c.id + '" data-plot="' + i + '"' +
        (batch ? ' data-batch="1"' : '') + (dis ? ' disabled' : '') + '>' +
        '<div class="ce">' + c.emoji + '</div>' +
        '<div class="cn">' + c.name + (inSeason ? '' : ' <span class="tago">反季</span>') + '</div>' +
        '<div class="cs">' + (owned ? '库存 ' + owned + ' 颗' : '没有种子') + '</div>' +
        '<div class="cm">' + lineY + '</div>' +
        '<div class="cm">' + lineP + '</div>' +
        '<div class="cp">' + profit + '</div>' +
      '</button>';
    }).join('');

    const tip = '💡 现在是' + G.seasonOf(state.day) + '季：当季作物正常，' +
      '<b>反季也能种</b>——种子贵 ' + Math.round((offMul - 1) * 100) + '%、第一茬多 ' + offDays +
      ' 天（南瓜/西瓜翻倍）、每茬少 ' + offPen + ' 个，但收成卖价 ×' + marketMul + '。' +
      (batch ? '选一种会按库存把所有空地依次种上；种子用完就停。' : '播种只消耗背包里的种子。');

    openModal(batch ? '🌱 全部播种 · 选一种作物' : '🌱 第 ' + (i + 1) + ' 号地 · 播种',
      cards + '<div style="margin-top:12px;font-size:11.5px;color:var(--ink-3);font-weight:600">' + tip + '</div>',
      '<button class="btn" data-act="seedshop">🌰 去种子店</button>' +
      '<button class="btn" data-close>取消</button>');
  }

  /* ---------------- 种子店 ---------------- */

  function seedShop() {
    const winter = G.isWinter(state.day);
    const offMul = G.BALANCE.seed.offSeasonMul;
    const offDays = G.BALANCE.seed.offSeasonDays;
    const rows = G.CROP_LIST.map(function (c) {
      const owned = state.seeds[c.id] || 0;
      const bp = G.seedBuyPrice(c, state);
      const base = G.seedBuyPrice(c, null);
      const sp = G.seedSellPrice(c);
      const lock = !G.seedUnlocked(state, c.id);
      const inSeason = G.cropSeasonOk(c.id, state.day);
      const canBuy = !winter && !lock;
      const days = inSeason ? c.days : (c.big ? c.days * 2 : c.days + offDays);
      const tag = lock ? ' <b class="lock">需种田 Lv' + c.lv + '</b>'
        : (inSeason ? ' <b class="own">当季</b>' : ' <b class="lock">反季</b>');
      const sub = lock ? '等级不够，种子还没解锁'
        : (winter ? '冬天种子店歇业了，开春再来'
          : '买 <b>' + bp + '</b> 金' + (inSeason ? '' : '（当季 ' + base + '）') +
            ' · 卖 ' + sp + ' 金 · ' + days + ' 天熟' + (inSeason ? '' : ' · 产量 −1'));
      return '<div class="shop-row' + (canBuy ? '' : ' locked') + '">' +
        '<span class="se">' + c.emoji + '</span>' +
        '<div class="sinfo">' +
          '<div class="sn">' + c.name +
            (owned ? ' <b class="own">库存 ' + owned + '</b>' : '') + tag + '</div>' +
          '<div class="sv">' + sub + '</div>' +
        '</div>' +
        '<button class="btn mini" data-buyseed="' + c.id + '" data-n="1"' +
          (canBuy && state.coins >= bp ? '' : ' disabled') + '>买1</button>' +
        '<button class="btn mini" data-buyseed="' + c.id + '" data-n="5"' +
          (canBuy && state.coins >= bp * 5 ? '' : ' disabled') + '>买5</button>' +
        '<button class="btn mini" data-sellseed="' + c.id + '"' +
          (owned <= 0 ? ' disabled' : '') +
          ' title="' + (owned ? '卖出全部，+' + owned * sp + ' 金' : '没有库存') + '">卖光</button>' +
      '</div>';
    }).join('');

    const fertRows = ['normal', 'special'].map(function (k) {
      const f = G.FERT[k];
      const own = state.ferts[k] || 0;
      const sp = G.fertSellPrice(k);
      const lock = !G.fertUnlocked(state, k);
      return '<div class="store-row' + (lock ? ' locked' : '') + '">' +
        '<span class="se">' + f.emoji + '</span>' +
        '<div><div class="sn">' + f.name + (own ? ' <b class="own">库存 ' + own + '</b>' : '') +
          (lock ? ' <b class="lock">需种田 Lv' + f.lv + '</b>' : '') + '</div>' +
        '<div class="sv">' + (lock ? '等级不够，还没解锁'
          : '买 ' + f.cost + ' 金 · 卖 ' + sp + ' 金 · +' + f.add + ' 产量、品质更优') + '</div></div>' +
        '<button class="btn mini" data-fertbuy="' + k + '" data-n="1"' +
          (lock || state.coins < f.cost ? ' disabled' : '') + '>买1</button>' +
        '<button class="btn mini" data-fertbuy="' + k + '" data-n="5"' +
          (lock || state.coins < f.cost * 5 ? ' disabled' : '') + '>买5</button>' +
        '<button class="btn mini" data-fertsell="' + k + '"' + (own <= 0 ? ' disabled' : '') + '>卖光</button>' +
      '</div>';
    }).join('');

    openModal('🌰 种子店 · ' + G.seasonOf(state.day) + '季',
      '<div class="shop-head">💰 <b>' + state.coins + '</b> 金' +
        (winter ? ' · ❄️ 冬天歇业，只卖肥料'
                : ' · 当季原价 · 反季 ×' + offMul + '（慢 ' + offDays + ' 天、少 1 个）') + '</div>' +
      '<div class="shop-list">' + rows + '</div>' +
      '<div class="store-sub" style="margin-top:10px">🧪 肥料 · 买回来放仓库，施肥时消耗</div>' +
      '<div class="shop-list">' + fertRows + '</div>' +
      '<div class="shop-tip">反季种子<b>也能种</b>：第一茬多花 ' + offDays + ' 天（南瓜 / 西瓜直接翻倍）、' +
        '少结 1 个（黄瓜 / 葡萄 / 草莓<b>每茬都少</b>），但反季的收成卖价 ×' +
        G.BALANCE.market.offSeason + ' —— 想赌一把就囤着晚卖。<br>' +
        '冬天土地封冻，什么都不能种。肥料在「全部施肥」或地块详情里使用。</div>',
      '<button class="btn" data-sellallseeds>卖出全部种子</button>' +
      '<button class="btn" data-close>关闭</button>');
  }

  /* ---------------- 全部施肥 ---------------- */

  function fertModal() {
    const list = G.fertTargets(state);
    if (!list.length) { toast('没有可施肥的地块', 'warn'); return; }
    if (state.energy < 1) { toast('体力不够，先睡觉吧', 'warn'); return; }

    const rows = ['normal', 'special'].map(function (k) {
      const f = G.FERT[k];
      const have = state.ferts[k] || 0;
      const n = Math.max(0, Math.min(list.length, have, state.energy));
      const off = n <= 0;
      return '<button class="btn" data-fert="' + k + '"' + (off ? ' disabled' : '') + '>' +
        '<span>' + f.emoji + ' ' + f.name + '</span>' +
        '<small>库存 ' + have + ' 袋 · 每块 +' + f.add + ' 产量</small>' +
        '<small>' + (off ? (have ? '体力不够' : '库存没有，先去种子店买') : '施 ' + n + ' 块') + '</small>' +
      '</button>';
    }).join('');

    openModal('🧪 全部施肥',
      '<div class="shop-head">可施肥地块 <b>' + list.length + '</b> 块' +
        '<span style="font-weight:600;color:var(--ink-3)"> · 大作物 / 已施肥 / 已成熟会跳过</span></div>' +
      '<div class="action-grid">' + rows + '</div>',
      '<button class="btn" data-close>取消</button>');
  }
