/* 我的小农场 · 界面层 / 06-help.js
 * 规则说明（分页正文 + 弹窗）
 * 由 build-ui.cjs 按文件名顺序拼进 ui.js（共享同一个 IIFE 作用域），不要单独加载。
 */

  let helpPage = 0;
  /* 自动播种器面板：正在给哪一台选种子 */
  let seedMach = 1;

  function helpPages() {
    const cropRows = G.CROP_LIST.map(function (c) {
      return '<tr><td>' + c.emoji + ' ' + c.name + '</td><td>' + c.seed + ' 金</td><td>' + c.days + ' 天</td>' +
        '<td>' + (c.multi ? '首次 ' + c.firstQty + ' 个' : (c.big ? '1 个（固定）' : c.base + ' ±1')) + '</td>' +
        '<td>' + c.price + ' 金</td><td>' + G.seasonText(c.id) + '</td><td>Lv' + (c.lv || 1) + '</td></tr>';
    }).join('');

    const P1 =
      '<div class="rule-sec">' +
        '<h4>🌤️ 天气</h4>' +
        '<table class="rule-table"><tr><th>天气</th><th>出现季节</th><th>效果</th></tr>' +
        G.WEATHER_LIST.map(function (w) {
          const who = G.SEASONS.filter(function (_, i) {
            const t = G.SEASON_WEATHER[i] || {};
            return (t[w.id] || 0) > 0;
          }).join(' / ');
          return '<tr><td>' + w.emoji + ' ' + w.name + '</td><td>' + (who || '—') + '</td><td>' + w.note + '</td></tr>';
        }).join('') + '</table>' +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>🌱 作物</h4>' +
        '<table class="rule-table"><tr><th>作物</th><th>种子</th><th>生长</th><th>产量/块</th><th>单果</th><th>季节</th><th>解锁</th></tr>' +
        cropRows + '</table>' +
        '<p>生长按浇水天数推进，成熟当天不能收、<b>次日</b>才能收。<br>' +
        '普通作物产量 = 基础 ±1 − 漏浇 + 施肥 + 等级加成（每 ' +
        G.BALANCE.level.yieldEvery + ' 级 +1，最低 1）；' +
        '<b>南瓜 / 西瓜固定 1 个</b>，不吃等级和产量肥料，只有<b>肥料品质加成</b>（见「肥料」）。<br>' +
        '高级种子要<b>种田等级</b>解锁：' +
        G.CROP_LIST.filter(function (c) { return (c.lv || 1) > 1; })
          .map(function (c) { return c.name + ' Lv' + c.lv; }).join('、') + '。</p>' +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>🍂 季节</h4>' +
        '<p>每 <b>' + G.BALANCE.seasonDays + ' 天</b>换一季：' +
        G.SEASONS.map(function (s, i) {
          return '<b>' + s + '（' + (i * G.BALANCE.seasonDays + 1) + '–' +
            ((i + 1) * G.BALANCE.seasonDays) + '）</b>';
        }).join('/') + '，然后循环。<br>' +
        '当季的种子按<b>原价</b>卖；<b>反季的种子也卖，但贵 ×' + G.BALANCE.seed.offSeasonMul + '</b>，' +
        '种下去第一茬多花 ' + G.BALANCE.seed.offSeasonDays + ' 天（南瓜 / 西瓜直接翻倍）、每茬少结 ' +
        G.BALANCE.seed.offSeasonYield + ' 个 —— 换来的好处是反季的收成卖价 <b>×' +
        G.BALANCE.market.offSeason + '</b>（多收作物每茬都少 1 个）。<br>' +
        '<b>冬天土地封冻、河面结冰</b>——不能播种、不能钓鱼（渔网也收不了），种子店歇业，只能打工、卖库存、交委托。<br>' +
        '已经种下的作物不受换季影响，该熟还会熟。</p>' +
        '<table class="rule-table"><tr><th>季节</th><th>特点</th></tr>' +
        '<tr><td>🌱 春</td><td><b>多雨</b>（雨天 ' + G.SEASON_WEATHER[0].rain + '%，自动浇水）</td></tr>' +
        '<tr><td>☀️ 夏</td><td><b>多晴</b>（晴天 ' + G.SEASON_WEATHER[1].sunny + '%）· <b>浇水要 ' + G.BALANCE.energy.waterSummer +
          ' 体力</b>（其他季节 ' + G.BALANCE.energy.water + ' 点）</td></tr>' +
        '<tr><td>🍂 秋</td><td><b>丰收</b>：普通作物每次收获 <b>+1 个</b>（大作物不算）</td></tr>' +
        '<tr><td>❄️ 冬</td><td>会<b>下雪</b>（' + G.SEASON_WEATHER[3].snow + '%，化雪等于自动浇水）· 不能种也不能钓</td></tr>' +
        '</table>' +
      '</div>';

    const P2 =
      '<div class="rule-sec">' +
        '<h4>🎣 钓鱼</h4>' +
        '<p>' + G.BALANCE.energy.fish + ' 体力 + 1 份饵甩一杆（<b>冬天河面结冰，钓不了</b>）。<b>先判定咬钩</b>：面团饵 ' +
        Math.round(G.BALANCE.hook.dough * 100) + '%、蚯蚓 ' + Math.round(G.BALANCE.hook.worm * 100) +
        '%、假饵 ' + Math.round(G.BALANCE.hook.lure * 100) + '%，晴天 ' +
        Math.round(G.BALANCE.weatherHook.sunny * 100) + '%、雨天 +' +
        Math.round(G.BALANCE.weatherHook.rain * 100) + '%。<br>' +
        '🐟 <b>鱼汛</b>：每种鱼只在特定季节成群——汛期上钩权重 ×' + G.BALANCE.fishSeason.in +
        '，非汛期 ×' + G.BALANCE.fishSeason.off + '。' +
        '鲫鱼 春·秋 / 鲤鱼 春夏秋 / 鳜鱼 春·夏 / 鲈鱼 夏·秋 / 河豚 秋 / 锦鲤 春。<br>' +
        '咬钩之后才抽鱼种：蚯蚓好鱼 ×' + G.BALANCE.bait.wormGood + ' 且品质取两次较好；假饵杂物 ×' +
        G.BALANCE.bait.lureTrash + '、好鱼 ×' + G.BALANCE.bait.lureGood + '、耐用 ' +
        G.BALANCE.lure.dur + ' 次。<br>' +
        '🪝 <b>高级假饵</b>（钓鱼 Lv' + G.BALANCE.gate.lure2 + ' + <b>交易 Lv' +
        G.BALANCE.gate.lure2Trade + '</b> 解锁）：' + G.BALANCE.lure2.price +
        ' 金 / 耐用 <b>' + G.BALANCE.lure2.dur + '</b> 次 —— <b>咬钩率同面团饵（' +
        Math.round(G.BALANCE.hook.dough * 100) + '%）、好鱼率同假饵</b>' +
        '（杂物 ×' + G.BALANCE.bait.lureTrash + '、好鱼 ×' + G.BALANCE.bait.lureGood +
        '、品质取两次较好），是后期最省心的饵。<br>' +
        '🕸️ 渔网：<b>' + G.NET_COST + ' 金/张，不缴维护费</b>。晚上耗 1 份面团饵，<b>' +
        Math.round(G.NET_CHANCE * 100) + '%</b> 网到 1 条标准及以下的普通鱼，' +
        '<b>不会出杂物和宝箱</b>；要<b>钓鱼 Lv' + G.BALANCE.gate.net + '</b> 解锁，上限 = ' +
        G.BALANCE.gate.netBase + ' + 钓鱼等级（最多 ' + G.NET_MAX + ' 张）。<br>' +
        '网到鱼就得下水把鱼取下来，<b>这张网要花 ' + G.BALANCE.netReset.energy + ' 体力重新布置</b>（没布置的网当晚不出货）；' +
        '河边那张「渔网」卡上有「重新布置」按钮。<br>' +
        '🧑‍🌾 <b>渔夫</b>（钓鱼 Lv' + G.BALANCE.gate.fisher + '）：花 ' + G.BALANCE.fisher.hire +
        ' 金雇一个，每天工资 <b>' + G.BALANCE.fisher.wageBase + ' + ' + G.BALANCE.fisher.wageStep +
        '×(等级−1)</b> 金；他每天替你<b>重布全部渔网</b>（不花你的体力）+ 自动甩 <b>' +
        G.BALANCE.fisher.baseCasts + ' + 等级</b> 杆' +
        '（耗你的面团饵，不给经验）。<br>' +
        '渔夫<b>自己会练级</b>：每钓到 1 条 +1 经验，够 <b>' + G.BALANCE.fisher.needBase + ' + ' +
        G.BALANCE.fisher.needStep + '×(等级−1)</b> 就升一级，也可以花 ' + G.BALANCE.fisher.upCost +
        ' × 等级 金直接升（满级 ' + G.BALANCE.fisher.max + '）；等级影响<b>咬钩、好鱼、每天杆数和工资</b>。' +
        '发不出工资就罢工，冬天他也休息。<br>' +
        '渔获先进仓库：<b>鱼</b>去水产店卖或进收购箱；<b>杂物和宝箱</b>水产店不收，去<b>百货店</b>回收或开箱。<br>' +
        '🎁 宝箱按钓鱼等级掉落（木制随便掉、铁制 Lv' + G.BALANCE.chest.ironLv + '、黄金 Lv' +
        G.BALANCE.chest.goldLv + '），开箱奖励见「百货店」。</p>' +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>🌿 采集</h4>' +
        '<p>' + G.BALANCE.forage.energy + ' 体力去后山转一圈，<b>每个季节能采到不一样的东西</b>：' +
        G.WILD_LIST.map(function (w) {
          return w.emoji + ' ' + w.name + '（' + G.seasonText(w.id) + ' · ' + w.price + ' 金）';
        }).join(' · ') + '。<br>' +
        '一次保底 1 件，<b>' + Math.round(G.BALANCE.forage.qty2 * 100) + '% 概率再来 1 件</b>、' +
        '<b>' + Math.round(G.BALANCE.forage.qty3 * 100) + '% 概率再多 1 件</b>（最多 3 件）；' +
        Math.round(G.BALANCE.forage.seedChance * 100) + '% 概率顺手摘到一颗当季作物种子（<b>和天气无关</b>）。<br>' +
        '野货直接进仓库，和作物一样按品质定价、一样吃<b>市价</b>，可以卖给农产品店或放进收购箱；' +
        '冬天也能采，是封冻期唯一的野外收入。<br>' +
        '🌿 <b>采集等级</b>：每次采集 +' + G.BALANCE.forage.xp + ' 经验（一次采到 3 件再 +1），' +
        '<b>Lv4 / Lv8 各多取一次品质</b>（野货更容易出优良以上），' +
        '满级 Lv' + G.BALANCE.level.max + ' 后<b>采集只花 ' + (G.BALANCE.forage.energy - 1) + ' 体力</b>。</p>' +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>🐟 水产店</h4>' +
        '<p>渔获在这里直接卖，<b>' + Math.round(G.BALANCE.shop.sellRate * 100) + ' 折</b>再乘<b>市价</b>；<b>不收杂物和宝箱</b>（那些去百货店）。<br>' +
        '<b>同一种鱼的不同品质会合并成一行</b>（和仓库里的作物一样），显示品质构成和均价；卖出时<b>先卖品质差的</b>。<br>' +
        '<b>鱼也受市场影响</b>：刚开张 ×' + G.BALANCE.market.supplyMax + '（稀缺），每卖 1 条 −' +
        G.BALANCE.market.fishStep + '，最低 ×' + G.BALANCE.market.supplyMin + '，隔天回落 ' +
        Math.round((1 - G.BALANCE.market.decay) * 100) + '%。<br>' +
        '鱼还跟着<b>汛期</b>走：汛期 ×1，<b>非汛期 ×' + G.BALANCE.market.offSeason + '</b>（稀罕货）。<br>' +
        '店里每天<b>进一批水产</b>（一般品质），每种数量随机、<b>睡觉后补货</b>，卖完只能等明天；' +
        '买价 = 基础价 × ' + G.BALANCE.shop.priceMul + ' <b>再乘鱼市价</b>（缺货 / 非汛期更贵），' +
        '买来的鱼<b>不能交委托</b>，只适合转卖或凑图鉴。<br>' +
        '河豚 <b>D' + G.FISH_UNLOCK.puffer + '</b> 起、锦鲤 <b>D' + G.FISH_UNLOCK.koi + '</b> 起才进货。</p>' +
      '</div>';

    const P3 =
      '<div class="rule-sec">' +
        '<h4>🧺 农产品店</h4>' +
        '<p>作物在这里直接卖，同样 <b>' + Math.round(G.BALANCE.shop.sellRate * 100) + ' 折</b>，再乘<b>市价系数</b>；仓库不再直接出售任何东西。<br>' +
        '<b>市价</b> = 供需 × 季节：<br>' +
        '· <b>供需</b>：刚开张 ×' + G.BALANCE.market.supplyMax + '（稀缺），每卖 1 件 −' +
        G.BALANCE.market.cropStep + '，最低 ×' + G.BALANCE.market.supplyMin + '（过剩）；隔天回落 ' +
        Math.round((1 - G.BALANCE.market.decay) * 100) + '%<br>' +
        '· <b>季节</b>：<b>反季 ×' + G.BALANCE.market.offSeason + '</b>（过季稀缺、卖得贵），<b>当季 ×1.00</b><br>' +
        '· 两相乘就是最终系数，界面上直接显示「市价 ×' +
        (G.BALANCE.market.supplyMax * G.BALANCE.market.offSeason).toFixed(2) + ' · 反季 · 稀缺」<br>' +
        '· <b>批量按批次中点定价</b>：一次卖 30 件和分三次卖 10 件到手一样多 —— 想卖高价靠<b>换着品种卖 / 囤到反季</b>，' +
        '不是靠攒一大票一次砸<br>' +
        '所以：<b>同一个品种别连着几天猛卖</b>；囤到反季再卖，价格会翻上去。<br>' +
        '商店的<b>买价</b>也会跟着市价走 —— 缺货 / 反季时买得更贵，而且<b>买货会把销量往回拉</b>（越买越贵）。点商店面板的 <b>📈 行情</b> 看全部系数。<br>' +
        '店里每天同样进一批作物（一般品质），买价 = 售价 × ' + G.BALANCE.shop.cropPriceMul +
        ' <b>再乘市价</b>，转手必亏，只在凑委托或应急时买。<br>' +
        '🤝 <b>交易等级</b>会把所有商店的<b>进价</b>往下压（每级 −' +
        (G.BALANCE.trade.buyCut * 100).toFixed(1) + '%，满级 −' +
        (G.BALANCE.trade.maxCut * 100).toFixed(1) + '%）：买种子 / 茶 / 钥匙 / 鲜活水产都算，钱花得多、卖得勤，等级就涨。<br>' +
        '南瓜 <b>D' + G.CROP_UNLOCK.pumpkin + '</b> 起、西瓜 <b>D' + G.CROP_UNLOCK.watermelon + '</b> 起才进货。</p>' +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>🏘️ 小镇（金币出口）</h4>' +
        '<p>商店面板右上角的 <b>🏘️ 小镇</b> 可以把钱捐给镇子，换<b>永久加成</b>（三档可叠加）：<br>' +
        G.BALANCE.town.map(function (t, i) {
          return (i + 1) + '. ' + t.emoji + ' <b>' + t.name + '</b>（捐满 ' + t.need + ' 金）—— ' + t.desc;
        }).join('<br>') + '<br>' +
        '捐出去不退，但加成是永久的。后期田里赚的钱花不完，就往这儿扔。</p>' +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>📦 收购箱</h4>' +
        '<p>在仓库点每行的 <b>📦</b>，把整批或自定义数量的<b>作物 / 鱼 / 杂物 / 宝箱</b>放进收购箱，' +
        '<b>下次睡觉时按当时的市价结算</b>，并扣 <b>' + Math.round(G.BALANCE.market.boxFee * 100) +
        '% 手续费</b>；放错了可以「全部取出」。<br>' +
        '直接卖给水产店 / 农产品店只有 ' + Math.round(G.BALANCE.shop.sellRate * 100) +
        '%，所以：<b>急用钱走商店，不急就进收购箱</b>（市价可能涨也可能跌，入箱本身不压价）。' +
        '箱子里的货也计入税金基数，不能用来避税。<br>' +
        '宝箱也可以直接进箱子换钱，但<b>开箱通常更划算</b>。</p>' +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>⭐ 品质（作物与鱼共用）</h4>' +
        '<table class="rule-table"><tr><th>品质</th><th>倍率</th><th>概率</th></tr>' +
        G.QUALITY.map(function (q) {
          return '<tr><td>' + q.emoji + ' ' + q.name + '</td><td>×' + q.mul + '</td><td>' + q.w + '%</td></tr>';
        }).join('') + '</table>' +
        '<p>单价 = 基础价 × 品质倍率；施肥后品质判定取 2 次最好（普通肥和特效肥相同）。</p>' +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>🧪 肥料</h4>' +
        '<table class="rule-table"><tr><th>肥料</th><th>买价</th><th>半价回收</th><th>普通作物</th><th>品质</th></tr>' +
        ['normal', 'special'].map(function (k) {
          const f = G.FERT[k];
          return '<tr><td>' + f.emoji + ' ' + f.name + '</td><td>' + f.cost + ' 金</td><td>' +
            G.fertSellPrice(k) + ' 金</td><td>+' + f.add + ' 产量</td><td>取 2 次最好</td></tr>';
        }).join('') + '</table>' +
        '<p>肥料在<b>种子店</b>购买，买回来进仓库，施肥时消耗；多收作物（黄瓜 / 草莓）只提质不加量。<br>' +
        '<b>南瓜 / 西瓜只吃品质加成</b>：数量永远是 1 个，但施肥后品质档位明显更高——这是它们唯一的施肥收益。<br>' +
        '特效肥要<b>种田 Lv' + G.FERT.special.lv + '</b> 才解锁。</p>' +
      '</div>';

    const P4 =
      '<div class="rule-sec">' +
        '<h4>💰 经济</h4>' +
        '<p>· 睡觉推进 1 天，扣伙食费 <b>' + G.mealFee(state) + ' 金</b>，体力回满；没钱只回 ' +
        G.BALANCE.meal.noMoneyMin + ' 点（不会扣掉已有的）<br>' +
        '· 睡醒会弹出<b>每日总结</b>：金币收支、农场自动操作、渔获、委托和明日提示<br>' +
        '· 开局体力上限 <b>' + G.BALANCE.start.maxEnergy + '</b>，强化 +' + G.BALANCE.upgrade.step +
        '/级（成本每级 ×' + G.BALANCE.upgrade.costMul + '）<br>' +
        '· 打零工：<b>每天只能打一次</b>，全天 ×' + G.BALANCE.work.full + ' 金/体力、半天 ×' +
        G.BALANCE.work.half + '，不够半天就把剩下的体力用光<br>' +
        '· 挖蚯蚓 ' + G.BALANCE.dig.energy + ' 体力一次（挖蚯蚓满级 ' + (G.BALANCE.dig.energy - 1) +
        ' 体力，Lv4 / Lv8 各 +1 条），晴天 −1 条、阴雨 +1 条，最多 ' +
        (G.BALANCE.dig.cap + Math.floor(G.BALANCE.level.max / G.BALANCE.dig.yieldAt)) + ' 条<br>' +
        '· 强化体力 ' + G.upgradeCost(state) + ' 金 · 扩张土地 ' + G.expandCost(state) + ' 金<br>' +
        '· 🔧 <b>设备</b>都攒在右栏的「设备」面板里<br>' +
        '· 🚿 洒水器 ' + G.SPRINKLER_COST + ' 金/个（需种田 Lv' + G.BALANCE.gate.sprinkler +
        '）：每天自动浇 ' + G.BALANCE.device.sprinklerPerDay + ' 块地，不耗体力（雨天自动浇，不叠加）<br>' +
        '· 🤖 自动收获器 ' + G.HARVESTER_COST + ' 金（需种田 Lv' + G.BALANCE.gate.harvester +
        '）：睡觉时自动收走成熟作物，不耗体力<br>' +
        '· 🌱 自动播种器 ' + G.SEEDER_COST + ' 金/台（需种田 Lv' + G.BALANCE.gate.seeder +
        '）：<b>一台只管自己的 ' + G.SEEDER_PLOTS + ' 块地</b>（第 1 台管 1–' + G.SEEDER_PLOTS +
        ' 块、第 2 台管 ' + (G.SEEDER_PLOTS + 1) + '–' + (G.SEEDER_PLOTS * 2) + ' 块…），' +
        '那块地<b>收完立刻补种</b>，睡觉时再把空着的补上；用你选的种子、不耗体力，每台每周维护 ' +
        G.BALANCE.upkeep.seeder + ' 金<br>' +
        '· 🍑 果园：种田 Lv' + G.BALANCE.orchard.unlockLv + ' + ' + G.BALANCE.orchard.unlockCost +
        ' 金开垦，先给 ' + G.BALANCE.orchard.free + ' 个树坑，第 ' + (G.BALANCE.orchard.free + 1) +
        '~' + G.BALANCE.orchard.slots + ' 个树坑要花钱开（' + G.BALANCE.orchard.slotCosts.join(' / ') + ' 金）；种子要<b>浇水 ' +
        G.BALANCE.orchard.grow.seed.water + ' 天 + 生长 ' + G.BALANCE.orchard.grow.seed.days +
        ' 天</b>，树苗要<b>浇水 ' + G.BALANCE.orchard.grow.sapling.water + ' 天 + 生长 ' +
        G.BALANCE.orchard.grow.sapling.days + ' 天</b>（浇够水后不必继续浇，两项都满足才成树）；每棵树可独立浇水，浇水 ' +
        G.BALANCE.orchard.waterEnergy + ' 体力 / 收获 ' + G.BALANCE.orchard.harvestEnergy + ' 体力；' +
        '成树只在自己的季节每天随机挂 ' + G.BALANCE.orchard.fruitMin + '–' + G.BALANCE.orchard.fruitMax +
        ' 个水果，收进仓库后去农产品店卖<br>' +
        '· 💰 税：每 ' + G.BALANCE.tax.every + ' 天按（金币 + 仓库价值）<b>累进</b>收一次——' +
        G.BALANCE.tax.bands.map(function (b, i) {
          const from = i ? G.BALANCE.tax.bands[i - 1].upTo : 0;
          const rate = Math.round(b.rate * 100) + '%';
          if (b.upTo == null) return from + ' 以上收 ' + rate;
          return (i ? from + '~' + b.upTo : '前 ' + b.upTo) + ' 收 ' + rate;
        }).join('、') + '，最低 ' +
        G.BALANCE.tax.min + ' 金（当前约 ' + G.taxDue(state) + ' 金）<br>' +
        '· 🧾 维护费：每 7 天收一次，土地 ' + G.plotUpkeep(state.plots.length) + ' 金（' +
        G.BALANCE.upkeep.free + ' 块以内免费，第 ' + (G.BALANCE.upkeep.free + 1) + '–' +
        G.BALANCE.upkeep.midAt + ' 块 ' + G.BALANCE.upkeep.plotPerWeek + ' 金/块/周、第 ' +
        (G.BALANCE.upkeep.midAt + 1) + '–' + G.BALANCE.upkeep.highAt + ' 块 ' +
        G.BALANCE.upkeep.plotMid + ' 金/块/周、' + (G.BALANCE.upkeep.highAt + 1) + ' 块以上 ' +
        G.BALANCE.upkeep.plotHigh + ' 金/块/周） + 设备 ' +
        G.deviceUpkeep(state) + ' 金（洒水器 ' + G.BALANCE.upkeep.sprinkle + '、自动收获器 ' +
        G.BALANCE.upkeep.harvester + '、自动播种器 ' + G.BALANCE.upkeep.seeder +
        '/台，<b>渔网不收维护费</b>）<br>' +
        '· 没钱吃饭只恢复到体力上限的 ' + Math.round(G.BALANCE.meal.noMoneyPct * 100) + '%（至少 ' +
        G.BALANCE.meal.noMoneyMin + ' 点），不会扣掉已有的体力<br>' +
        '· 种子 / 肥料都在种子店买卖（半价回收），肥料也只能在种子店卖；蚯蚓只能在渔具店卖（' + G.WORM_VALUE + ' 金/条）</p>' +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>📋 委托</h4>' +
        '<p>每天 2 个作物单 + 1 个鱼单，<b>每天自动换新</b>，另外还能<b>手动刷新一次</b>。<br>' +
        '报酬约为直接卖的 ' + (G.BALANCE.order.mult * 100).toFixed(0) + '%，没交不罚；季节越往后要的量越多。<br>' +
        '委托池按天数逐档解锁（D1 / D3 / D5 / D7 / D9 / D12 / D15），并且<b>只会要你当前等级买得到的作物</b>；' +
        '<b>每天第一张单固定是「买得到的最贵作物」</b>，剩下随机；' +
        '贵的作物一次要 2–3 个，单张报酬<b>最低 40 金</b>；鱼单单价随季节涨（11 → 15 → 19 → 23）。<br>' +
        '<b>市价溢价</b>：指定作物的单子按<b>该作物当前市价</b>结算（反季 / 稀缺时合同价更高），' +
        '面板上会写「含市价 ×1.30」；「任意鱼」的单子不指定品种，价格固定。<br>' +
        '📜 <b>长期订单</b>：5 天期限、数量大、<b>2 倍报酬</b>（同样吃市价溢价），交付或过期后隔天睡醒换下一张。' +
        '<b>提前交货有额外奖励</b>：每提前 1 天 +10%，最多 +50%。<br>' +
        '交委托先扣<b>品质差的</b>，交鱼先交最便宜的；杂物、宝箱不算数。</p>' +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>⭐ 等级</h4>' +
        '<p>四条技能线：<b>种田 / 钓鱼 / 挖蚯蚓 / 采集</b>，各自独立升级，满级 Lv' + G.BALANCE.level.max +
        '，每级所需 ' + G.BALANCE.level.xpBase + ' + ' + G.BALANCE.level.xpStep + '×(级−1)。<br>' +
        '· <b>种田</b>：收获作物 +' + G.BALANCE.level.farmXpHarvest + ' 经验，每 ' +
        G.BALANCE.level.yieldEvery + ' 级 +1 产量（Lv' + G.BALANCE.level.yieldEvery + ' / Lv' +
        (G.BALANCE.level.yieldEvery * 2) + '，大作物不吃）<br>' +
        '· <b>钓鱼</b>：每 ' + G.BALANCE.level.fishXpEvery + ' 杆 1 点（完美品质 +' +
        G.BALANCE.level.fishXpPerfect + '），每级咬钩 +' + (G.BALANCE.level.hookPerLv * 100).toFixed(1) +
        '%（≤+' + Math.round(G.BALANCE.level.hookMax * 100) + '%）、好鱼 +' +
        (G.BALANCE.level.goodPerLv * 100).toFixed(1) + '%（≤+' +
        Math.round(G.BALANCE.level.goodMax * 100) + '%）<br>' +
        '· <b>挖蚯蚓</b>：每次 +' + G.BALANCE.dig.xp + ' 经验；<b>Lv4 / Lv8 各 +1 条</b>；<b>满级后只要 ' +
        (G.BALANCE.dig.energy - 1) + ' 体力</b><br>' +
        '· <b>采集</b>：每次 +' + G.BALANCE.forage.xp + ' 经验（采到 3 件 +1）；<b>Lv4 / Lv8 各多取一次品质</b>；<b>满级后只要 ' +
        (G.BALANCE.forage.energy - 1) + ' 体力</b><br>' +
        '· <b>交易</b>：买卖成交按金额涨经验（每 ' + G.BALANCE.trade.xpPer + ' 金 1 点），每级把<b>商店进价压低 ' +
        (G.BALANCE.trade.buyCut * 100).toFixed(1) + '%</b>（最多 −' +
        (G.BALANCE.trade.maxCut * 100).toFixed(1) + '%）；高级假饵要交易 Lv' +
        G.BALANCE.gate.lure2Trade + '、金钥匙要交易 Lv' + G.BALANCE.gate.goldKeyTrade + '<br>' +
        '解锁：洒水器 Lv' + G.BALANCE.gate.sprinkler + ' · 特效肥 Lv' + G.BALANCE.gate.specialFert +
        ' · 自动播种器 Lv' + G.BALANCE.gate.seeder + ' · 自动收获器 Lv' + G.BALANCE.gate.harvester +
        '（均为种田等级）；渔网 钓鱼 Lv' + G.BALANCE.gate.net +
        '，上限随钓鱼等级提高；渔夫 钓鱼 Lv' + G.BALANCE.gate.fisher +
        '；高级假饵 钓鱼 Lv' + G.BALANCE.gate.lure2 + '。</p>' +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>🏬 百货店</h4>' +
        '<p>三块业务：<b>茶叶</b>、<b>钥匙</b>、<b>回收站</b>（杂物与宝箱，水产店不收这些）。<br>' +
        '🍵 <b>下午茶</b>一天一杯，<b>消耗一份茶</b>（不再扣金币，只回体力）：' +
        G.TEA_LIST.map(function (t) {
          return t.name + ' ' + t.price + ' 金/+' + t.energy;
        }).join(' · ') + '：D' + G.TEA_LIST.map(function (t) { return t.day; }).join(' / D') +
        ' 上架，<b>大杯单价更便宜</b>。<br>' +
        '🎁 <b>宝箱</b>：木制（直接开，10–26 金）· 铁制（钓鱼 Lv' + G.BALANCE.chest.ironLv +
        '，铁钥匙 ' + G.KEYS.iron.price + ' 金，一包物资约 80 金）· 黄金（Lv' + G.BALANCE.chest.goldLv +
        '，金钥匙 ' + G.KEYS.gold.price + ' 金，200–320 金 + 一件高级物品）。<br>' +
        '🗝️ 钥匙也在百货店买，<b>按钓鱼等级解锁</b>（金钥匙另要<b>交易 Lv' +
        G.BALANCE.gate.goldKeyTrade + '</b>）；开箱比回收划算，钥匙不够就先攒着。<br>' +
        '回收价 = 原价的 ' + Math.round(G.BALANCE.shop.sellRate * 100) + '%（和商店一致）。</p>' +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>🏆 成就</h4>' +
        '<p>共 <b>' + G.ACH.length + '</b> 项，分<b>种田 / 钓鱼 / 设备 / 经营 / 收集</b>五类，顶栏 🏆 里按分类翻页看。' +
        '每项给<b>成就点</b>和<b>实质奖励</b>（金币 / 种子 / 肥料 / 饵料）；' +
        '每 10 点 <b>+1% 售价</b>（最多 +20%，作用于商店与收购箱）；顶栏 🏆 里能看每项进度。</p>' +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>📖 图鉴奖励</h4>' +
        '<p>第一次钓到 / 收到某种鱼或作物就进图鉴。收集到一定数量会<b>自动发奖</b>：' +
        '鱼类分 ' + G.BALANCE.codex.fish.map(function (m) { return m.need; }).join(' / ') + ' 种，' +
        '作物分 ' + G.BALANCE.codex.crops.map(function (m) { return m.need; }).join(' / ') + ' 种，' +
        '每档只发一次（金币 / 饵料 / 肥料）。<br>' +
        '顶栏 <b>📖 图鉴</b> 里能看到每档进度和领取状态；旧存档按现有进度补发。</p>' +
      '</div>' +

      '<div class="rule-sec">' +
        '<h4>⌨️ 操作</h4>' +
        '<p>· 成熟地块<b>左键直接收</b>；右键或 Shift + 点击看详情（可铲除、看产量）<br>' +
        '· 顶栏 <b>📊 状态</b> 看累计数据；<b>⚙️ 设置</b> 里有规则说明（分 4 页）/ 分享名片（导出 PNG）/ 导入导出 / 音效 / 重新开始<br>' +
        '· 地块 / 饵料 / 账本 / 日志都可以 Tab 聚焦、Enter 或空格操作<br>' +
        '· 日志和账本都能导出 .md；进度自动存在本浏览器</p>' +
      '</div>';

    return [
      { emoji: '🌱', name: '种植', desc: '天气 · 作物 · 季节', html: P1 },
      { emoji: '🎣', name: '钓鱼', desc: '钓鱼 · 采集 · 水产店', html: P2 },
      { emoji: '🧺', name: '买卖', desc: '农产品店 · 小镇 · 收购箱 · 品质 · 肥料', html: P3 },
      { emoji: '💰', name: '经营', desc: '经济 · 委托 · 等级 · 百货店 · 成就 · 操作', html: P4 }
    ];
  }

  function helpModal() {
    const pages = helpPages();
    if (helpPage >= pages.length) helpPage = 0;
    const p = pages[helpPage];
    const tabs = pages.map(function (pg, i) {
      return '<button class="rule-tab' + (i === helpPage ? ' on' : '') + '" data-helppage="' + i + '">' +
        pg.emoji + ' ' + pg.name + '</button>';
    }).join('');
    const body = '<div class="rule-tabs">' + tabs + '</div>' +
      '<div class="rule-crumb">' + (helpPage + 1) + ' / ' + pages.length + ' · ' + p.desc + '</div>' +
      '<div class="rule-page">' + p.html + '</div>';
    const nav = helpPage > 0
      ? '<button class="btn" data-helpnav="-1">← 上一页</button>'
      : '<button class="btn" disabled>← 上一页</button>';
    const nav2 = helpPage < pages.length - 1
      ? '<button class="btn" data-helpnav="1">下一页 →</button>'
      : '<button class="btn" disabled>下一页 →</button>';
    openModal('📖 规则速查', body, nav + nav2 + '<button class="btn" data-close>关闭</button>');
  }
