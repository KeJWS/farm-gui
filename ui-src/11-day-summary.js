/* 我的小农场 · 界面层 / 11-day-summary.js
 * 每日总结（睡觉结算面板）
 * 由 build-ui.cjs 按文件名顺序拼进 ui.js（共享同一个 IIFE 作用域），不要单独加载。
 */

  /* ---------------- 每日总结（睡觉结算） ---------------- */

  function daySummaryModal(r) {
    const rep = r && r.report;
    if (!rep) { if (r && r.summary) toast(r.summary, 'good'); return; }
    const num = function (v) { return (v > 0 ? '+' : '') + v; };
    const cls = function (v) { return v > 0 ? 'up' : (v < 0 ? 'down' : ''); };

    const cashIn = rep.cash.reduce(function (sum, x) { return sum + Math.max(0, x.value || 0); }, 0);
    const cashOut = rep.cash.reduce(function (sum, x) { return sum + Math.max(0, -(x.value || 0)); }, 0);
    const goodsValue = rep.goods.reduce(function (sum, x) { return sum + Math.max(0, x.value || 0); }, 0);
    const money = rep.cash.concat(rep.goods.map(function (g) {
      return { label: g.label, value: g.value, goods: true };
    }));
    const dailyNet = rep.coins.delta;
    const netLabel = dailyNet > 0 ? '金币净增加' : (dailyNet < 0 ? '金币净减少' : '金币持平');
    const cashBalance = rep.coins.before > 0 ? Math.round(rep.coins.after / rep.coins.before * 100) : 0;
    const moneyHtml = money.length ? '<div class="day-list">' + money.map(function (x) {
      return '<div class="day-line' + (x.goods ? ' goods' : '') + '"><span>' + x.label +
        (x.goods ? ' <i>入库</i>' : '') + '</span><b class="' + cls(x.value) + '">' +
        num(x.value) + ' 金</b></div>';
    }).join('') + '</div>' : '<div class="day-empty">没有现金收支</div>';

    const farm = [];
    if (rep.farm.harvested) farm.push(['🤖 自动收获', rep.farm.harvested + ' 块 · 值 ' + rep.farm.harvestValue + ' 金']);
    if (rep.farm.replanted) farm.push(['🌱 自动补种', rep.farm.replanted + ' 块']);
    if (rep.farm.seeder) farm.push(['🌾 自动播种', rep.farm.seeder + ' 块']);
    if (rep.farm.watered) farm.push(['💧 浇水', rep.farm.watered + ' 块' +
      (rep.farm.ripened ? ' · 成熟 ' + rep.farm.ripened : '')]);
    if (rep.farm.missed) farm.push(['🥀 缺水', rep.farm.missed + ' 块（晚一天成熟）']);

    const fish = [];
    if (rep.fisher) {
      fish.push(['🧑‍🌾 渔夫 Lv' + rep.fisher.lv, rep.fisher.strike
        ? '罢工（工资 ' + rep.fisher.wage + ' 金）'
        : rep.fisher.got + '/' + rep.fisher.casts + ' 条 · 值 ' + rep.fisher.value + ' 金 · 工资 -' +
          rep.fisher.wage + (rep.fisher.leveled ? ' · 升级 ×' + rep.fisher.leveled : '')]);
    }
    if (rep.net) {
      fish.push(['🕸️ 渔网', rep.net.got + '/' + rep.net.used + ' 条 · 值 ' + rep.net.value + ' 金' +
        (rep.net.pending ? ' · ' + rep.net.pending + ' 张待重布' : '')]);
    }

    const orders = [['📋 今日委托', rep.orders.fresh + ' 张 · 能交 ' + rep.orders.deliverable + ' 张']];
    if (rep.longOrder) {
      orders.push(['⏳ 长期订单', rep.longOrder.emoji + ' ' + rep.longOrder.name + ' ×' + rep.longOrder.qty +
        '（有 ' + rep.longOrder.have + '）· 还剩 ' + rep.longOrder.days + ' 天']);
    }

    const orchard = [];
    if (rep.orchard) {
      if (rep.orchard.fruit) orchard.push(['🍑 挂果', '+' + rep.orchard.fruit + ' 个（等着收）']);
      if (rep.orchard.ripe) orchard.push(['🧺 待收', rep.orchard.ripe + ' 个 · 每棵 ' + G.BALANCE.orchard.harvestEnergy + ' 体力']);
      if (rep.orchard.thirsty) orchard.push(['💧 待浇水', rep.orchard.thirsty + ' 棵育苗树 · ' +
        G.BALANCE.orchard.waterEnergy + ' 体力/棵']);
    }

    function sec(title, rows) {
      if (!rows.length) return '';
      return '<div class="day-sec"><h4>' + title + '</h4><dl class="kv">' + rows.map(function (x) {
        return '<dt>' + x[0] + '</dt><dd>' + x[1] + '</dd>';
      }).join('') + '</dl></div>';
    }

    openModal('📋 每日总结 · 第 ' + rep.day + ' 天',
      '<div class="day-sum-top">' +
        '<div class="dh-coin ' + cls(rep.coins.delta) + '">' + num(rep.coins.delta) + '<small> 金</small></div>' +
        '<div class="dh-meta"><b>' + netLabel + '</b><br>' + rep.weather.emoji + ' ' + rep.weather.name + ' · ' +
          G.seasonOf(rep.day) + '季<br><small>金币 ' + rep.coins.before + ' → <b>' + rep.coins.after + '</b>' +
          (cashBalance ? ' · 余额 ' + cashBalance + '%' : '') + '</small></div>' +
      '</div>' +
      '<div class="day-kpis">' +
        '<div class="day-kpi"><span>现金收入</span><b class="up">+' + cashIn + '</b><small>金</small></div>' +
        '<div class="day-kpi"><span>现金支出</span><b class="down">-' + cashOut + '</b><small>金</small></div>' +
        '<div class="day-kpi"><span>入库货值</span><b>+' + goodsValue + '</b><small>金（估值）</small></div>' +
      '</div>' +
      '<div class="day-sec"><h4>💰 今日收支明细</h4>' + moneyHtml + '</div>' +
      sec('🌾 农场', farm) + sec('🌳 果园', orchard) + sec('🐟 渔获', fish) + sec('📋 委托', orders) +
      (rep.tomorrow.length ? '<div class="day-sec"><h4>☀️ 明天</h4><ul class="day-todo">' +
        rep.tomorrow.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul></div>' : '') +
      '<div class="shop-tip">现金收支会改变金币；「入库货值」是收进仓库的估值，不是现金。余额变化率仅供快速参考。</div>',
      '<button class="btn primary" data-close>开始新的一天</button>');
  }

  function resetModal() {
    openModal('🔄 重新开始', '<div style="font-size:13px;line-height:1.7">' +
      '这会清空当前存档，从第 1 天、50 金重新开始。<br>确定吗？</div>',
      '<button class="btn" data-close>取消</button>' +
      '<button class="btn danger" id="do-reset">确定重开</button>');
  }
