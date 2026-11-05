/* 我的小农场 · 界面层 / 02-view.js
 * HUD / 农田地块 / 底部操作按钮 / 河边小队 / 选饵 / 最近渔获
 * 由 build-ui.cjs 按文件名顺序拼进 ui.js（共享同一个 IIFE 作用域），不要单独加载。
 */

  /* ---------------- HUD ---------------- */

  function renderHud() {
    const w = G.WEATHER[state.weather];
    $('#hud-coins').innerHTML = '💰 <b>' + state.coins + '</b>';
    $('#hud-ebar').style.width = (state.energy / state.maxEnergy * 100) + '%';
    $('#hud-etxt').textContent = state.energy + '/' + state.maxEnergy;
    const ec = $('.chip.energy');
    ec.classList.toggle('low', state.energy / state.maxEnergy <= 0.45 && state.energy > 0);
    ec.classList.toggle('empty', state.energy <= 0);

    const wc = $('#hud-weather');
    wc.textContent = w.emoji + ' ' + w.name;
    wc.dataset.w = w.id;
    wc.title = w.note;

    $('#hud-fee').textContent = '🍖 ' + G.mealFeeDue(state) + ' 金/天' +
      (G.mealFeeDue(state) !== G.mealFee(state) ? '（没吃午饭）' : '');
    $('#hud-fee').title = G.kitchenUnlocked(state)
      ? '今天' + (G.lunchEaten(state) ? '已吃' : '没吃') + '午饭：' +
        G.mealFee(state) + ' → ' + G.mealFeeDue(state) + ' 金'
      : '每天睡觉扣一次';
    $('#hud-plots').textContent = '🏞️ ' + state.plots.length + ' 块';
    $('#season').textContent = (G.isWinter(state.day) ? '❄️ ' : '') +
      G.seasonOf(state.day) + ' · 第 ' + state.day + ' 天';

    const lv = state.levels || { farm: 1, fish: 1, farmXp: 0, fishXp: 0, dig: 1, digXp: 0, forage: 1, forageXp: 0 };
    const farmLvEl = $('#farm-lv'), fishLvEl = $('#fish-lv');
    if (farmLvEl) {
      farmLvEl.textContent = '🌱 Lv' + lv.farm;
      farmLvEl.title = '种田等级：' + G.levelEffectText('farm', lv.farm) +
        ' · 经验 ' + lv.farmXp + '/' + G.levelNeed(lv.farm);
    }
    if (fishLvEl) {
      fishLvEl.textContent = '🎣 Lv' + lv.fish;
      fishLvEl.title = '钓鱼等级：' + G.levelEffectText('fish', lv.fish) +
        ' · 经验 ' + lv.fishXp + '/' + G.levelNeed(lv.fish);
    }
    const digLvEl = $('#dig-lv'), forLvEl = $('#forage-lv');
    if (digLvEl) {
      digLvEl.textContent = '🪱 Lv' + (lv.dig || 1);
      digLvEl.title = '挖蚯蚓等级：' + G.levelEffectText('dig', lv.dig || 1) +
        ' · 经验 ' + (lv.digXp || 0) + '/' + G.levelNeed(lv.dig || 1);
    }
    if (forLvEl) {
      forLvEl.textContent = '🌿 Lv' + (lv.forage || 1);
      forLvEl.title = '采集等级：' + G.levelEffectText('forage', lv.forage || 1) +
        ' · 经验 ' + (lv.forageXp || 0) + '/' + G.levelNeed(lv.forage || 1);
    }
    const trLvEl = $('#trade-lv');
    if (trLvEl) {
      trLvEl.textContent = '🤝 Lv' + (lv.trade || 1);
      trLvEl.title = '交易等级：' + G.levelEffectText('trade', lv.trade || 1) +
        ' · 经验 ' + (lv.tradeXp || 0) + '/' + G.levelNeed(lv.trade || 1, 'trade');
    }
  }

  /* ---------------- 农田 ---------------- */

  const PLOT_CLASS = { growing: 'growing', regrow: 'growing', ripe: 'ripe' };

  function renderPlots() {
    const grid = $('#plot-grid');
    const keepScroll = grid.scrollTop;          // 重绘会重置滚动条，先存下来
    grid.innerHTML = state.plots.map(function (p, i) {
      if (!p.crop) {
        return '<div class="plot empty" data-i="' + i + '" role="button" tabindex="0"' +
          ' aria-label="第 ' + (i + 1) + ' 块地，空地，点击播种">' +
          '<div class="plot-top"><span class="plot-no">' + (i + 1) + '</span></div>' +
          '<div class="plot-art soil"><span class="seed-dot">＋</span></div>' +
          '<div class="plot-name">空地</div>' +
          '<div class="bar"><i style="width:0%"></i></div>' +
          '<div class="plot-foot">点击播种</div>' +
        '</div>';
      }
      const c = G.CROPS[p.crop];
      const need = G.needOf(p);
      const pct = Math.round(p.growth / need * 100);
      const can = G.canHarvest(state, p);
      const cls = PLOT_CLASS[p.phase] || '';

      let badges = '';
      if (p.watered) badges += '<span title="今日已浇水">💧</span>';
      if (p.fert) badges += '<span title="已施肥 +' + p.fert + '">🧪</span>';

      let foot;
      if (p.phase === 'ripe') {
        foot = can ? '<span style="color:var(--green-d)">✨ 点击收获</span>'
                   : '明天可收';
      } else if (p.watered) {
        foot = '<span style="color:var(--blue)">今日已浇</span>';
      } else {
        foot = p.missed > 0 ? '<span class="warn">缺水 ×' + p.missed + '</span>' : '待浇水';
      }

      const nameExtra = p.phase === 'regrow' ? '再生' : '';
      const aria = '第 ' + (i + 1) + ' 块地，' + c.name + '，' + p.growth + '/' + need + ' 天，' +
        (can ? '可以收获' : (p.phase === 'ripe' ? '明天可收' : (p.watered ? '今天已浇水' : '待浇水')));

      return '<div class="plot ' + cls + '" data-i="' + i + '" role="button" tabindex="0"' +
        ' aria-label="' + aria + '">' +
        '<div class="plot-top"><span class="plot-no">' + (i + 1) + '</span>' +
          '<div class="plot-badges">' + badges + '</div></div>' +
        '<div class="plot-art">' + G.stageEmoji(p) + '</div>' +
        '<div class="plot-name">' + c.name +
          '<small>' + (nameExtra ? nameExtra + ' ' : '') + p.growth + '/' + need + '天</small></div>' +
        '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
        '<div class="plot-foot">' + foot + '</div>' +
      '</div>';
    }).join('');
    grid.scrollTop = keepScroll;

    const anyGrow = state.plots.some(function (p) {
      return p.crop && p.phase !== 'ripe' && !p.watered;
    });
    const anyRipe = state.plots.some(function (p) { return p.crop && G.canHarvest(state, p); });
    const anyEmpty = state.plots.some(function (p) { return !p.crop; });
    const seedTotal = Object.keys(state.seeds).reduce(function (n, k) { return n + (state.seeds[k] || 0); }, 0);
    const fertList = G.fertTargets(state);

    const frozen = G.isWinter(state.day);
    $('[data-act="waterAll"]').disabled = !anyGrow;
    $('[data-act="harvestAll"]').disabled = !anyRipe;
    $('[data-act="plantAll"]').disabled = !anyEmpty || frozen;
    $('[data-act="fertilizeAll"]').disabled = !fertList.length || state.energy < 1 || state.coins < 5;
    $('#plantall-txt').textContent = frozen ? '❄️ 冬天土地封冻'
      : (anyEmpty
        ? (seedTotal ? '库存 ' + seedTotal + ' 颗 · 空地 ' + state.plots.filter(function (p) { return !p.crop; }).length + ' 块'
                     : '没种子 · 点这里去种子店')
        : '没有空地');
    $('#fertall-txt').textContent = fertList.length
      ? '可施 ' + fertList.length + ' 块 · 5 金起'
      : (anyGrow ? '都施过肥了' : '没有进行中的作物');
  }

  /* ---------------- 操作按钮 ---------------- */

  function renderActions() {
    const fullNeed = G.workCost(state, 'full');
    const halfNeed = G.workCost(state, 'half');
    if (state.workUsed) {
      $('#work-txt').textContent = '今天已经打过了 · 明天再来';
    } else if (state.energy >= fullNeed) {
      $('#work-txt').textContent = '全天 · -' + fullNeed + ' 体力 · +' + G.workPay(state, 'full') + ' 金';
    } else if (state.energy >= halfNeed) {
      $('#work-txt').textContent = '半天 · -' + halfNeed + ' 体力 · +' + G.workPay(state, 'half') + ' 金';
    } else if (state.energy > 0) {
      $('#work-txt').textContent = '半天 · 用光 ' + state.energy + ' 点 · +' + Math.round(state.energy * G.WORK_RATE_HALF) + ' 金';
    } else {
      $('#work-txt').textContent = '体力不足 · 先睡觉';
    }
    $('#expand-txt').textContent = state.plots.length >= G.BALANCE.expand.max
      ? '已到上限 · ' + G.BALANCE.expand.max + ' 块'
      : '第 ' + (state.plots.length + 1) + ' 块 · ' + G.expandCost(state) + ' 金';
    $('#upgrade-txt').textContent = '上限 ' + state.maxEnergy + '→' + (state.maxEnergy + G.BALANCE.upgrade.step) + ' · ' + G.upgradeCost(state) + ' 金';
    const sprLock = !G.sprinklerUnlocked(state);
    $('#sprinkler-txt').textContent = sprLock
      ? '需种田 Lv' + G.BALANCE.gate.sprinkler + ' 解锁'
      : '已有 ' + state.sprinklers + ' 个 · ' + G.SPRINKLER_COST + ' 金/个';
    const harvLock = !G.harvesterUnlocked(state);
    $('#harvester-txt').textContent = harvLock
      ? '需种田 Lv' + G.BALANCE.gate.harvester + ' 解锁'
      : (!state.harvester
        ? G.HARVESTER_COST + ' 金 · 睡觉时自动收'
        : (state.harvesterOn ? '已开启 · 点击关闭' : '已关闭 · 点击开启'));
    const seedTxt = $('#seeder-txt');
    if (seedTxt) {
      const seedLock = !G.seederUnlocked(state);
      const sc = G.seederCount(state);
      let picked = 0;
      for (let k = 1; k <= sc; k++) if (G.autoSeedOf(state, k)) picked++;
      seedTxt.textContent = seedLock
        ? '需种田 Lv' + G.BALANCE.gate.seeder + ' 解锁'
        : (!sc
          ? G.SEEDER_COST + ' 金/台 · 一台管 ' + G.SEEDER_PLOTS + ' 块'
          : (sc + ' 台 · 每晚播 ' + G.seederPlots(state) + ' 块' +
            (state.seederOn ? '' : '（已关）') +
            (picked ? ' · ' + picked + ' 台已选种子' : ' · 都没选种子')));
    }
    const devSum = $('#dev-sum');
    if (devSum) {
      const fee = G.deviceUpkeep(state);
      devSum.textContent = fee ? '维护 ' + fee + ' 金/周' : '';
    }
    renderCrew();

    const teaBtn = $('[data-act="tea"]');
    const teaHave = G.teaStock(state);
    const teaBest = teaHave.slice().sort(function (a, b) { return b.energy - a.energy; })[0];
    teaBtn.disabled = state.teaUsed || state.energy >= state.maxEnergy || !teaHave.length;
    $('#tea-txt').textContent = state.teaUsed
      ? '今天喝过了'
      : (!teaHave.length ? '没有茶了' :
        (state.energy >= state.maxEnergy ? '体力已满'
          : teaBest.emoji + ' ' + teaBest.name + ' · +' + teaBest.energy + ' 体力'));

    const digCost = G.digCost(state);    const digFrozen = G.isWinter(state.day);
    $('[data-act="dig"]').disabled = digFrozen || state.energy < digCost;
    const digTxt = $('#dig-txt');
    if (digTxt) digTxt.textContent = digFrozen ? '封冻期 · 挖不了' : digCost + ' 体力';

    /* 厨房 */
    const cookLv = state.levels.cook || 1;
    const cookLvEl = $('#cook-lv');
    if (cookLvEl) {
      cookLvEl.textContent = '🍳 Lv' + cookLv;
      cookLvEl.title = G.levelEffectText('cook', cookLv);
    }
    const unlocked = G.kitchenUnlocked(state);
    const kitchenTxt = $('#kitchen-txt');
    if (kitchenTxt) {
      kitchenTxt.textContent = unlocked
        ? '今日 ' + G.cookLeft(state) + '/' + G.cookDailyLimit(state) + ' 份 · 食谱 ' +
          G.cookRecipes().filter(function (r) { return r.lv <= cookLv; }).length + ' 道'
        : '需种田 Lv' + G.BALANCE.cook.unlockFarm + ' + 钓鱼 Lv' + G.BALANCE.cook.unlockFish;
    }
    const lunchBtn = $('[data-act="lunch"]');
    if (lunchBtn) lunchBtn.disabled = !unlocked;
    const lunchTxt = $('#lunch-txt');
    if (lunchTxt) {
      lunchTxt.textContent = !unlocked ? '厨房未解锁'
        : (G.lunchEaten(state) ? '今天吃过了' : '今天还没吃 · 伙食 ×' + G.BALANCE.meal.skipLunchMul);
    }
    const forageBtn = $('[data-act="forage"]');
    if (forageBtn) {
      const fp = G.foragePool(state.day);
      const fCost = G.forageCost(state);
      forageBtn.disabled = state.energy < fCost || !fp.length;
      const ft = $('#forage-txt');
      if (ft) {
        ft.textContent = fp.length
          ? fCost + ' 体力 · ' + fp.map(function (w) { return w.name; }).join('/')
          : '这个季节没得采';
      }
    }
    $('[data-act="work"]').disabled = state.workUsed || state.energy <= 0;
    $('[data-act="expand"]').disabled = state.plots.length >= G.BALANCE.expand.max ||
      state.coins < G.expandCost(state);
    $('[data-act="upgrade"]').disabled = state.coins < G.upgradeCost(state);
    $('[data-act="sprinkler"]').disabled = sprLock ||
      state.coins < G.SPRINKLER_COST || state.sprinklers >= state.plots.length;
    $('[data-act="harvester"]').disabled = harvLock || (!state.harvester && state.coins < G.HARVESTER_COST);
  }

  /* ---------------- 河边「渔网 / 渔夫」小队卡 ---------------- */

  function renderCrew() {
    const box = $('#crew-row');
    if (!box) return;

    /* --- 渔网卡 --- */
    let netCard;
    if (!G.netUnlocked(state)) {
      netCard = '<div class="crew-card locked">' +
        '<div class="cc-head"><span class="cc-ic">🕸️</span><span class="cc-t">渔网</span>' +
          '<span class="cc-tag">未解锁</span></div>' +
        '<div class="cc-sub">钓鱼 Lv' + G.BALANCE.gate.net + ' 解锁 · 渔具店 ' + G.NET_COST + ' 金/张</div>' +
      '</div>';
    } else if (!state.nets) {
      netCard = '<div class="crew-card empty">' +
        '<div class="cc-head"><span class="cc-ic">🕸️</span><span class="cc-t">渔网</span>' +
          '<span class="cc-tag">0 / ' + G.netMax(state) + '</span></div>' +
        '<div class="cc-sub">河边还没放网 · 渔具店 ' + G.NET_COST + ' 金/张</div>' +
      '</div>';
    } else {
      const setN = G.netSetCount(state), pend = G.netPending(state), cost = G.netResetCost(state);
      let dots = '';
      for (let i = 0; i < Math.min(state.nets, 9); i++) {
        dots += '<i class="' + (i < setN ? 'on' : '') + '"></i>';
      }
      netCard = '<div class="crew-card' + (pend ? ' warn' : ' on') + '">' +
        '<div class="cc-head"><span class="cc-ic">🕸️</span><span class="cc-t">渔网</span>' +
          '<span class="cc-tag">' + setN + ' / ' + state.nets + ' 已布</span></div>' +
        '<div class="cc-dots">' + dots + '</div>' +
        '<div class="cc-sub">' + Math.round(G.NET_CHANCE * 100) + '% 各上 1 条 · 每天 ' + setN +
          ' 份面团饵</div>' +
        '<div class="cc-sub2">上限 ' + G.netMax(state) + ' 张 · 重布 ' +
          G.BALANCE.netReset.energy + ' 体力/张</div>' +
        '<div class="cc-act">' +
          (pend
            ? '<button class="btn mini" data-resetnets' + (state.energy < 1 ? ' disabled' : '') +
              '>重新布置 ' + pend + ' 张 · ' + cost + ' 体力</button>'
            : '<span class="cc-ok">网都在水里</span>') +
        '</div>' +
      '</div>';
    }

    /* --- 渔夫卡 --- */
    let fisherCard;
    if (!G.fisherUnlocked(state)) {
      fisherCard = '<div class="crew-card locked">' +
        '<div class="cc-head"><span class="cc-ic">🧑‍🌾</span><span class="cc-t">渔夫</span>' +
          '<span class="cc-tag">未解锁</span></div>' +
        '<div class="cc-sub">钓鱼 Lv' + G.BALANCE.gate.fisher + ' 才招得到人</div>' +
      '</div>';
    } else if (!state.fisher) {
      fisherCard = '<div class="crew-card empty">' +
        '<div class="cc-head"><span class="cc-ic">🧑‍🌾</span><span class="cc-t">渔夫</span>' +
          '<span class="cc-tag">待雇</span></div>' +
        '<div class="cc-sub">雇佣 ' + G.BALANCE.fisher.hire + ' 金 · 重布渔网 + 每天自动钓鱼</div>' +
        '<div class="cc-act"><button class="btn mini primary" data-hirefisher' +
          (state.coins < G.BALANCE.fisher.hire ? ' disabled' : '') + '>雇佣</button></div>' +
      '</div>';
    } else {
      const max = G.BALANCE.fisher.max;
      const lv = G.fisherLv(state);
      const need = G.fisherNeed(state);
      const xp = (state.fisher && state.fisher.xp) || 0;
      const ratio = lv >= max ? 1 : Math.max(0, Math.min(1, xp / Math.max(1, need)));
      const upCost = G.fisherUpCost(state);
      fisherCard = '<div class="crew-card on">' +
        '<div class="cc-head"><span class="cc-ic">🧑‍🌾</span><span class="cc-t">渔夫</span>' +
          '<span class="cc-tag">Lv' + lv + '</span></div>' +
        '<div class="cc-bar"><i style="width:' + Math.round(ratio * 100) + '%"></i></div>' +
        '<div class="cc-sub">' + (lv >= max ? '已满级' : '经验 ' + xp + ' / ' + need) +
          ' · 每天 ' + G.fisherCasts(state) + ' 杆 · 工资 ' + G.fisherWage(state) + ' 金</div>' +
        '<div class="cc-sub2">咬钩 +' + (G.fisherHookBonus(state) * 100).toFixed(1) + '% · 好鱼 +' +
          ((G.fisherGoodBonus(state) - 1) * 100).toFixed(1) + '%</div>' +
        '<div class="cc-act">' +
          (lv >= max
            ? '<span class="cc-ok">满级</span>'
            : '<button class="btn mini" data-fisherup' + (state.coins < upCost ? ' disabled' : '') +
              '>升 Lv' + (lv + 1) + ' · ' + upCost + ' 金</button>') +
          '<button class="btn mini" data-firefisher>辞退</button>' +
        '</div>' +
      '</div>';
    }

    box.innerHTML = netCard + fisherCard;
  }

  /* ---------------- 钓鱼 ---------------- */

  function renderBait() {
    const lure2Open = G.fishLv(state) >= G.BALANCE.gate.lure2 &&
      G.tradeLv(state) >= G.BALANCE.gate.lure2Trade;
    const premiumOpen = G.fishLv(state) >= G.BALANCE.gate.premium &&
      G.tradeLv(state) >= G.BALANCE.gate.premiumTrade;
    const list = [
      { id: 'worm', n: state.bait.worm },
      { id: 'dough', n: state.bait.dough },
      { id: 'premium', n: state.bait.premium || 0, lock: !premiumOpen,
        lockTxt: 'Lv' + G.BALANCE.gate.premium + '·交易' + G.BALANCE.gate.premiumTrade },
      { id: 'lure', n: state.lure.owned ? state.lure.dur : 0 },
      { id: 'lure2', n: (state.lure2 && state.lure2.owned) ? state.lure2.dur : 0, lock: !lure2Open,
        lockTxt: 'Lv' + G.BALANCE.gate.lure2 + '·交易' + G.BALANCE.gate.lure2Trade }
    ];
    if (!list.some(function (b) { return b.id === baitSel && b.n > 0; })) {
      const first = list.filter(function (b) { return b.n > 0; })[0];
      baitSel = first ? first.id : 'worm';
    }
    $('#bait-row').innerHTML = list.map(function (b) {
      const bd = G.BAIT[b.id];
      const max = b.id === 'lure' ? G.BALANCE.lure.dur : (b.id === 'lure2' ? G.BALANCE.lure2.dur : 0);
      const cnt = max
        ? (b.n ? b.n + '/' + max : (b.lock ? (b.lockTxt || '未解锁') : '无'))
        : '×' + b.n;
      return '<div class="bait ' + (b.id === baitSel ? 'sel ' : '') + (b.n || b.lock ? '' : 'off') +
        '" data-bait="' + b.id + '" title="' + bd.desc + '"' +
        ' role="button" tabindex="0" aria-label="' + bd.name + '，' + (b.n ? b.n + ' 个' : '没有') + '"' +
        ' aria-pressed="' + (b.id === baitSel) + '">' +
        '<span>' + bd.emoji + '</span><span class="bn">' + bd.name + '</span>' +
        '<span class="bc">' + cnt + '</span></div>';
    }).join('');

    const frozen = G.isWinter(state.day);
    const FISH_E = G.BALANCE.energy.fish;
    const BATCH = G.BALANCE.fishBatch;
    const canCast = frozen ? 0 : Math.floor(state.energy / FISH_E);
    const meta = $('#fish-meta');
    if (meta) {
      meta.textContent = frozen ? '❄️ 河面结冰'
        : (canCast ? '还能甩 ' + canCast + ' 杆' : '体力不够，先睡觉');
    }
    const ff = $('#fish-forecast');
    if (ff) {
      if (frozen) {
        ff.innerHTML = '<span class="ff-warn">❄️ 河面结冰，冬天钓不了鱼</span>';
      } else {
        const f = G.fishForecast(state, baitSel);
        const w = G.WEATHER[state.weather] || {};
        const mod = w.hookMod || 0;
        ff.innerHTML =
          '<span>咬钩 <b>' + Math.round(f.hook * 100) + '%</b>' +
            (mod ? '<i class="' + (mod > 0 ? 'up' : 'down') + '">' + (mod > 0 ? '+' : '') +
              Math.round(mod * 100) + '%</i>' : '') + '</span>' +
          '<span>好鱼 <b>×' + f.good.toFixed(2) + '</b></span>' +
          (f.bonusHook > 0
            ? '<span>双咬钩 <b class="up">+' + Math.round(f.bonusHook * 100) + '%</b></span>' : '') +
          '<span>每杆 <b class="' + (f.net >= 0 ? 'up' : 'down') + '">' +
            (f.net >= 0 ? '+' : '') + f.net.toFixed(1) + '</b> 金' +
            '<i>毛 ' + f.ev.toFixed(1) + ' · 饵 ' + f.cost.toFixed(1) + '</i></span>';
      }
    }
    const castBtn = $('[data-act="cast"]');
    castBtn.disabled = frozen || state.energy < FISH_E;
    castBtn.title = frozen ? '河面结冰，冬天钓不了鱼' : '';
    const cast5Btn = $('[data-act="cast5"]');
    cast5Btn.disabled = frozen || state.energy < FISH_E * BATCH;
    const cast5n = $('#cast5-n');
    if (cast5n) cast5n.textContent = String(BATCH);
    const castCost = $('#cast-cost');
    if (castCost) castCost.textContent = FISH_E + ' 体力';
    const castAllBtn = $('[data-act="castAll"]');
    if (castAllBtn) { castAllBtn.disabled = frozen || canCast < 1; castAllBtn.title = frozen ? '河面结冰' : ''; }
    const castAllN = $('#castall-n');
    if (castAllN) castAllN.textContent = frozen ? '' : (canCast ? canCast + ' 杆' : '体力不够');
  }

  /* 最近渔获：单杆/连甩都按条列出来，保留最近 5 条 */
  let catchLog = [];

  function renderCatch() {
    const box = $('#catch-area');
    if (!catchLog.length) {
      box.innerHTML = '<div class="catch-empty">今天还没开张，甩一杆试试 🌊</div>';
      return;
    }
    const sum = catchLog.reduce(function (n, e) { return n + e.price; }, 0);
    box.innerHTML =
      '<div class="catch-sum">最近 ' + catchLog.length + ' 条 · 共值 ' + sum + ' 金（已入仓库）</div>' +
      '<div class="catch-list">' + catchLog.map(function (e) {
        const col = esc(e.quality ? e.quality.color : '#9a866c');
        return '<div class="catch-item" style="border-left-color:' + col + '">' +
          '<span class="ce">' + esc(e.emoji) + '</span>' +
          '<span class="cn2">' + esc(e.fish) + '</span>' +
          '<span class="cq2" style="color:' + col + '">' +
            (e.quality ? esc(e.quality.emoji) + ' ' + esc(e.quality.name) : (e.chest ? '宝箱' : '杂物')) + '</span>' +
          '<span class="cp2">值 ' + e.price + '</span>' +
        '</div>';
      }).join('') + '</div>';
  }

  function pushCatch(entry) {
    catchLog.unshift(entry);
    if (catchLog.length > 5) catchLog.length = 5;
    renderCatch();
  }

  function setCatchBatch(entries) {
    catchLog = entries.slice().reverse().slice(0, 5);
    renderCatch();
  }
