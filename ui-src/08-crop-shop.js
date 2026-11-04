/* 我的小农场 · 界面层 / 08-crop-shop.js
 * 农产品店 / 收购箱 / 水产店
 * 由 build-ui.cjs 按文件名顺序拼进 ui.js（共享同一个 IIFE 作用域），不要单独加载。
 */

  /* ---------------- 农产品店（作物唯一收购处） ---------------- */

  /* 进货库存小圆点：亮着的是还有货 */
  function stockDots(st, cap) {
    const n = Math.max(0, Math.min(cap, 9));
    const on = Math.max(0, Math.min(n, st));
    let out = '<span class="stock-dots" title="今日剩 ' + st + '/' + cap + '">';
    for (let i = 0; i < n; i++) out += '<i class="' + (i < on ? 'on' : '') + '"></i>';
    return out + '</span>';
  }
  /* 进货价的构成：基准 × 市价 */
  function priceNote(base, mul) {
    return '基准 ' + base + ' × 市价 ' + mul.toFixed(2);
  }
  /* 还能卖多少才掉档（商店卖出行用的一行小字） */
  function headroomShort(hr, unit) {
    if (hr.atFloor) return '已到底价';
    if (hr.toCalm > 0) return '再卖 ' + hr.toCalm + ' ' + unit + '掉档';
    if (hr.toGlut > 0) return '再卖 ' + hr.toGlut + ' ' + unit + '掉档';
    return '再卖 ' + hr.toFloor + ' ' + unit + '到底';
  }

  function cropShop() {
    const ids = Object.keys(state.store).filter(function (k) { return G.storeCount(state, k) > 0; })
      .sort(function (a, b) { return G.storeValue(state, b) - G.storeValue(state, a); });
    const total = ids.reduce(function (a, k) { return a + G.storeCount(state, k); }, 0);
    const totalVal = ids.reduce(function (a, k) { return a + G.storeValue(state, k); }, 0);

    const sellRows = ids.length ? ids.map(function (id) {
      const c = G.CROPS[id];
      const n = G.storeCount(state, id);
      const val = G.storeValue(state, id);
      const mix = G.storeMix(state, id);
      const mk = G.marketInfo(state, id);
      return '<div class="store-row">' +
        '<span class="se">' + c.emoji + '</span>' +
        '<div><div class="sn">' + c.name + ' ×' + n +
          ' <b class="own">市价 ×' + mk.total.toFixed(2) + '</b>' +
          (mk.inSeason ? ' <b class="own">当季</b>' : ' <b class="lock">反季</b>') + '</div>' +
        '<div class="sv">' + mix.map(function (m) {
          return '<span style="color:' + m.color + '">' + m.name + ' ' + m.n + '</span>';
        }).join(' · ') + ' · 均 ' + (val / n).toFixed(1) + ' 金/个 · ' +
          (mk.inSeason ? '当季 ×1' : '反季 ×' + mk.season) + ' · ' + mk.tag +
          ' · ' + headroomShort(G.marketHeadroom(state, id), '件') + '</div></div>' +
        '<span class="sp">' + val + ' 金</span>' +
        '<button class="btn mini" data-sellcrop="' + id + '">卖出</button>' +
      '</div>';
    }).join('') : '<div class="store-empty">仓库里没有作物，先去田里收点</div>';

    let stockN = 0, soldOutN = 0, openN = 0;
    const buyRows = G.CROP_LIST.map(function (c) {
      const bp = G.cropBuyPrice(c.id, state);
      const st = G.cropShopStock(state, c.id);
      const cap = G.cropStockCap(c);
      const unlock = G.CROP_UNLOCK[c.id] || 1;
      const locked = state.day < unlock;
      const soldOut = !locked && st <= 0;
      const mk = G.marketInfo(state, c.id);
      const base = Math.max(2, Math.round(c.price * G.BALANCE.shop.cropPriceMul));
      if (!locked) { stockN += st; openN++; if (soldOut) soldOutN++; }
      return '<div class="store-row' + (soldOut ? ' sold-out' : '') + (locked ? ' locked' : '') + '">' +
        '<span class="se">' + c.emoji + '</span>' +
        '<div><div class="sn">' + c.name +
          (locked ? ' <b class="lock">D' + unlock + ' 起进货</b>'
                  : ' ' + stockDots(st, cap) + ' <b class="own">' + st + '/' + cap + '</b>') +
          (mk.inSeason ? ' <b class="own">当季</b>' : ' <b class="lock">反季 ×' + mk.season + '</b>') +
          '</div>' +
        '<div class="sv">' + (locked ? '中后期才进这种作物'
          : '进价 <b>' + bp + '</b> 金/个 · ' + priceNote(base, mk.total) +
            '（' + mk.tag + '）· ' + (c.desc || '')) + '</div></div>' +
        '<button class="btn mini" data-buycrop="' + c.id + '" data-n="1"' +
          (locked || soldOut || state.coins < bp ? ' disabled' : '') + '>' +
          (locked ? '未解锁' : (soldOut ? '售罄' : '买1')) + '</button>' +
        (locked || soldOut ? '' :
          '<button class="btn mini" data-buycrop="' + c.id + '" data-n="' + st + '"' +
          (state.coins < bp * st ? ' disabled' : '') + '>买满</button>') +
      '</div>';
    }).join('');

    openModal('🧺 农产品店',
      '<div class="shop-head">💰 <b>' + state.coins + '</b> 金</div>' +
      '<div class="store-sub">卖作物 · ' + total + ' 个 · 共 ' + totalVal + ' 金</div>' + sellRows +
      (ids.length
        ? '<div class="buy-custom"><span>🧮 自定义卖出</span>' +
            '<select id="crop-sell-id">' + ids.map(function (id) {
              return '<option value="' + id + '">' + G.CROPS[id].name + '（' + G.storeCount(state, id) + '）</option>';
            }).join('') + '</select>' +
            '<input id="crop-sell-n" type="number" min="1" step="1" value="10" inputmode="numeric">' +
            '<button class="btn mini" data-sellcropn="1">卖出</button>' +
            '<span class="bc-tip">从品质差的开始卖</span></div>'
        : '') +
      '<div class="store-sub" style="margin-top:10px">今日进货 · 一般品质 · 共 <b>' + stockN + '</b> 件' +
        (soldOutN ? ' · ' + soldOutN + '/' + openN + ' 种售罄' : '') + '</div>' + buyRows +
      '<div class="shop-tip">每天补一次货，卖完等明天。进价 = 基准价 × 市价（' +
        '最近卖得多就便宜、反季贵 ×' + G.BALANCE.market.offSeason + '），所以转手必亏，只在凑委托 / 应急时买。<br>' +
        '想卖原价就把作物放进<b>收购箱</b>（仓库 📦），明天睡觉结算。</div>',
      '<button class="btn" data-sellallcrop' + (total ? '' : ' disabled') + '>全部卖出</button>' +
      '<button class="btn" data-close>关闭</button>');
  }

  /* ---------------- 收购箱 ---------------- */

  function boxPutModal(kind, key, name, available) {
    const n = Math.max(1, Math.floor(available || 1));
    openModal('📦 放入收购箱',
      '<div class="shop-head">' + name + ' · 仓库有 <b>' + n + '</b> 件</div>' +
      '<label class="buy-custom"><span>放入数量</span>' +
        '<input id="box-put-n" type="number" min="1" max="' + n + '" step="1" value="1" inputmode="numeric"></label>' +
      '<div class="shop-tip">指定数量会从仓库移入收购箱，剩余库存不变；下次睡觉按放入时的金额结算。</div>',
      '<button class="btn primary" data-boxput-kind="' + kind + '" data-boxput-key="' + key + '">放入收购箱</button>' +
      '<button class="btn" data-close>取消</button>');
  }

  function boxModal() {
    const list = state.box || [];
    const total = G.boxValue(state);
    const rows = list.length ? list.map(function (e) {
      let sub = '原价 ' + e.v + ' 金';
      if (e.parts && e.parts.length) {
        sub = e.parts.map(function (p) {
          const q = G.qualityById(p.q);
          return (q ? q.emoji + q.name : '杂物') + ' ' + p.n;
        }).join(' · ') + ' · 原价 ' + e.v + ' 金';
      }
      return '<div class="store-row">' +
        '<span class="se">' + (e.emoji || '📦') + '</span>' +
        '<div><div class="sn">' + e.name + ' ×' + e.n + '</div>' +
        '<div class="sv">' + sub + '</div></div>' +
        '<span class="sp">' + e.v + ' 金</span>' +
      '</div>';
    }).join('') : '<div class="store-empty">收购箱是空的：在仓库点 📦 把作物 / 渔获放进来</div>';

    openModal('📦 收购箱',
      '<div class="shop-head">待出货 <b>' + list.length + '</b> 批 · 原价合计 <b>' + total + '</b> 金</div>' +
      rows +
      (list.length
        ? '<div class="buy-custom"><span>🧮 自定义取出</span>' +
            '<select id="box-pick">' + list.map(function (e, i) {
              return '<option value="' + i + '">' + (e.emoji || '📦') + ' ' + e.name + ' ×' + e.n + '</option>';
            }).join('') + '</select>' +
            '<input id="box-take" type="number" min="1" step="1" value="1" inputmode="numeric">' +
            '<button class="btn mini" data-boxtaken="1">取出</button>' +
            '<span class="bc-tip">共 ' + list.reduce(function (a, e) { return a + (e.n || 1); }, 0) + ' 件</span></div>'
        : '') +
      '<div class="shop-tip">放进去的货会在<b>下次睡觉时</b>按原价（100%）结算；' +
      '直接卖给水产店 / 农产品店只有 ' + Math.round(G.BALANCE.shop.sellRate * 100) + '%。<br>' +
      '放错了可以取出放回仓库。</div>',
      '<button class="btn" data-boxtake' + (list.length ? '' : ' disabled') + '>全部取出</button>' +
      '<button class="btn" data-close>关闭</button>');
  }

  /* 渔获品质构成（和作物仓库一个写法） */
  function fishMix(g) {
    return g.mix.map(function (m) {
      return '<span style="color:' + m.color + '">' + m.emoji + ' ' + m.name + ' ' + m.n + '</span>';
    }).join(' · ');
  }

  function fishShop() {
    const groups = G.fishGroups(state, 'fish');
    const total = groups.reduce(function (n, g) { return n + g.count; }, 0);
    const sellRows = groups.length ? groups.map(function (g) {
      const mk = G.fishMarketInfo(state, g.name);
      return '<div class="store-row">' +
        '<span class="se">' + g.emoji + '</span>' +
        '<div><div class="sn">' + g.name + ' ×' + g.count +
          ' <b class="own">市价 ×' + mk.total.toFixed(2) + '</b>' +
          (mk.inRun ? ' <b class="own">汛期</b>' : ' <b class="lock">非汛期 ×' + mk.season + '</b>') + '</div>' +
        '<div class="sv">' + fishMix(g) + ' · 均 ' + (g.total / g.count).toFixed(1) +
          ' 金/条 · ' + (mk.inRun ? '汛期 ×1' : '非汛期 ×' + mk.season) + ' · ' + mk.tag +
          ' · ' + headroomShort(G.fishMarketHeadroom(state, g.name), '条') + '</div></div>' +
        '<span class="sp">' + g.total + ' 金</span>' +
        '<button class="btn mini" data-sellfish="' + g.key + '">卖出</button>' +
      '</div>';
    }).join('') : '<div class="store-empty">还没有渔获，先去河边甩两杆</div>';

    const buyList = G.FISH.filter(function (f) { return !f.trash && !f.noOrder; });
    let stockN = 0, soldOutN = 0, openN = 0;
    const buyRows = buyList.map(function (f) {
      const bp = G.fishBuyPrice(f.id, state);
      const st = G.shopStock(state, f.id);
      const cap = (G.SHOP_STOCK[f.id] || [1, 2])[1];
      const unlock = G.FISH_UNLOCK[f.id] || 1;
      const locked = state.day < unlock;
      const inRun = G.fishSeasonOk(f.id, state.day);
      const mk = G.fishMarketInfo(state, f.name);
      const base = Math.max(3, Math.round(f.base * G.BALANCE.shop.priceMul));
      const soldOut = !locked && st <= 0;
      if (!locked) { stockN += st; openN++; if (soldOut) soldOutN++; }
      return '<div class="store-row' + (soldOut ? ' sold-out' : '') + (locked ? ' locked' : '') + '">' +
        '<span class="se">' + f.emoji + '</span>' +
        '<div><div class="sn">' + f.name +
          (locked ? ' <b class="lock">D' + unlock + ' 起进货</b>'
                  : ' ' + stockDots(st, cap) + ' <b class="own">' + st + '/' + cap + '</b>') +
          (inRun ? ' <b class="own">鱼汛 ' + G.fishSeasonText(f.id) + '</b>'
                 : ' <b class="lock">非汛期 ×' + mk.season + '</b>') +
          '</div>' +
        '<div class="sv">' + (locked ? '中后期才进这种水产' :
          '进价 <b>' + bp + '</b> 金/条 · ' + priceNote(base, mk.total) +
          '（' + mk.tag + '）· ' + G.fishDesc(f.name)) + '</div></div>' +
        '<button class="btn mini" data-buyfish="' + f.id + '" data-n="1"' +
          (locked || soldOut || state.coins < bp ? ' disabled' : '') + '>' +
          (locked ? '未解锁' : (soldOut ? '售罄' : '买1')) + '</button>' +
        (locked || soldOut ? '' :
          '<button class="btn mini" data-buyfish="' + f.id + '" data-n="' + st + '"' +
          (state.coins < bp * st ? ' disabled' : '') + '>买满</button>') +
      '</div>';
    }).join('');

    openModal('🐟 水产店',
      '<div class="shop-head">💰 <b>' + state.coins + '</b> 金</div>' +
      '<div class="store-sub">卖渔获 · ' + total + ' 条</div>' + sellRows +
      (groups.length
        ? '<div class="buy-custom"><span>🧮 自定义卖出</span>' +
            '<select id="fish-sell-id">' + groups.map(function (g) {
              return '<option value="' + g.key + '">' + g.emoji + ' ' + g.name + ' ×' + g.count + '</option>';
            }).join('') + '</select>' +
            '<input id="fish-sell-n" type="number" min="1" step="1" value="1" inputmode="numeric">' +
            '<button class="btn mini" data-sellfishn="1">卖出</button>' +
            '<span class="bc-tip">共 ' + total + ' 条</span></div>'
        : '') +
      '<div class="store-sub" style="margin-top:10px">买水产 · 今日进货 · 共 <b>' + stockN + '</b> 条' +
        (soldOutN ? ' · ' + soldOutN + '/' + openN + ' 种售罄' : '') + '</div>' + buyRows +
      '<div class="shop-tip">水产店每天补一次货，卖完要等明天；买来的鱼是<b>一般品质</b>，只能卖钱、不能交委托。<br>' +
        '进价 = 基准价 × 市价（非汛期贵 ×' + G.BALANCE.market.offSeason + '）。<br>' +
        '直接卖只有 ' + Math.round(G.BALANCE.shop.sellRate * 100) + ' 折，想原价卖就放进<b>收购箱</b>（仓库 📦）。</div>',
      '<button class="btn" data-sellallfish' + (total ? '' : ' disabled') + '>全部卖出</button>' +
      '<button class="btn" data-close>关闭</button>');
  }

  function statsPlaceholder() {}

  /* ---------------- 下午茶 ---------------- */

  /* ---------------- 市场行情 ---------------- */
