/* 成就表与判定 */
  /* ---------------- 成就 ---------------- */

  function cropSpeciesOwned(s) {
    const cx = (s.codex && s.codex.crops) || {};
    return CROP_LIST.filter(function (c) { return cx[c.id] && cx[c.id].n > 0; }).length;
  }
  function fishSpeciesOwned(s) {
    const fx = (s.codex && s.codex.fish) || {};
    return FISH.filter(function (f) { return !f.trash && !f.chest && fx[f.id] && fx[f.id].n > 0; }).length;
  }
  /* 果园水果：和作物共用 codex.crops（果实固定标准品质） */
  function fruitSpeciesOwned(s) {
    const cx = (s.codex && s.codex.crops) || {};
    return FRUIT_LIST.filter(function (f) { return cx[f.id] && cx[f.id].n > 0; }).length;
  }
  /* 野货：和作物共用 codex.crops */
  function wildSpeciesOwned(s) {
    const cx = (s.codex && s.codex.crops) || {};
    return WILD_LIST.filter(function (w) { return cx[w.id] && cx[w.id].n > 0; }).length;
  }
  /* 最高果树等级（成树才会升级） */
  function maxTreeLevel(s) {
    const slots = (s.orchard && s.orchard.slots) || [];
    let best = 0;
    slots.forEach(function (t) {
      if (!t) return;
      best = Math.max(best, (t.lv || 1));
    });
    return best >= BALANCE.orchard.treeLvMax ? 1 : 0;
  }
  function perfectFish(s) {
    const fx = (s.codex && s.codex.fish) || {};
    return Object.keys(fx).reduce(function (a, k) { return a + (fx[k].perfect || 0); }, 0);
  }
  function fishValueTotal(s) {
    const fx = (s.codex && s.codex.fish) || {};
    return Object.keys(fx).reduce(function (a, k) { return a + (fx[k].value || 0); }, 0);
  }
  function cropValueTotal(s) {
    const cx = (s.codex && s.codex.crops) || {};
    return Object.keys(cx).reduce(function (a, k) { return a + (cx[k].value || 0); }, 0);
  }

  /* ---------------- 图鉴奖励 ---------------- */
  /* 鱼只算 6 种正经鱼（杂物 / 宝箱不进图鉴），作物算上架的全部 14 种。
   * 每档按 id 记一次，跨存档恢复也不会重复领。 */

  const CODEX_TOTAL = {
    fish: FISH.filter(function (f) { return !f.trash && !f.chest; }).length,
    crops: CROP_LIST.length
  };
  const CODEX_LABEL = { fish: '🐟 鱼类', crops: '🌾 作物' };

  function codexSpecies(s, kind) {
    return kind === 'fish' ? fishSpeciesOwned(s) : cropSpeciesOwned(s);
  }

  /* 每档奖励 + 当前进度，给界面用 */
  function codexRewards(s) {
    s.codexClaim = s.codexClaim || {};
    const out = { fish: [], crops: [] };
    ['fish', 'crops'].forEach(function (kind) {
      const have = codexSpecies(s, kind);
      (BALANCE.codex[kind] || []).forEach(function (m) {
        out[kind].push({
          id: m.id, kind: kind, label: CODEX_LABEL[kind], need: m.need,
          total: CODEX_TOTAL[kind], have: have, got: Math.min(have, m.need),
          claimed: !!s.codexClaim[m.id], day: s.codexClaim[m.id] || 0,
          text: rewardText({ reward: m.reward })
        });
      });
    });
    return out;
  }

  /* 达标就发奖，每个 id 只发一次；返回本次新领到的档位 */
  function checkCodexRewards(s) {
    s.codexClaim = s.codexClaim || {};
    const out = [];
    ['fish', 'crops'].forEach(function (kind) {
      const have = codexSpecies(s, kind);
      (BALANCE.codex[kind] || []).forEach(function (m) {
        if (s.codexClaim[m.id] || have < m.need) return;
        s.codexClaim[m.id] = s.day || 1;
        applyReward(s, m.reward, '图鉴奖励');
        const text = rewardText({ reward: m.reward });
        log(s, '📖 图鉴奖励：' + CODEX_LABEL[kind] + '收集 ' + m.need + ' 种（' + text + '）', 'good');
        out.push({ id: m.id, kind: kind, label: CODEX_LABEL[kind], need: m.need, text: text });
      });
    });
    return out;
  }

  /* 成就表：val(s) 是当前进度，达到 goal 就算解锁，奖励自动发放 */
  const ACH = [
    /* 种田 */
    { id: 'harvest1',  cat: 'farm', emoji: '🌱', name: '第一筐菜',   desc: '收获 1 次作物',        goal: 1,
      val: function (s) { return s.stats.harvests || 0; }, reward: { coins: 15 }, pts: 1 },
    { id: 'harvest50', cat: 'farm', emoji: '🧺', name: '田里好手',   desc: '累计收获 50 次',       goal: 50,
      val: function (s) { return s.stats.harvests || 0; }, reward: { coins: 60, seeds: { carrot: 3 } }, pts: 2 },
    { id: 'harvest200', cat: 'farm', emoji: '🚜', name: '老农把式',  desc: '累计收获 200 次',      goal: 200,
      val: function (s) { return s.stats.harvests || 0; }, reward: { coins: 250 }, pts: 4 },
    { id: 'plot10',    cat: 'farm', emoji: '🏞️', name: '小有规模',   desc: '土地达到 10 块',       goal: 10,
      val: function (s) { return s.plots.length; }, reward: { coins: 40 }, pts: 2 },
    { id: 'plot20',    cat: 'farm', emoji: '🌾', name: '良田成片',   desc: '土地达到 20 块',       goal: 20,
      val: function (s) { return s.plots.length; }, reward: { ferts: { normal: 5 } }, pts: 3 },
    { id: 'plot40',    cat: 'farm', emoji: '🗺️', name: '大地主',     desc: '土地达到 40 块',       goal: 40,
      val: function (s) { return s.plots.length; }, reward: { coins: 2000 }, pts: 6 },
    { id: 'plot50',    cat: 'farm', emoji: '🏞️', name: '田连阡陌',   desc: '土地达到 50 块（35 块后地价陡涨）', goal: 50,
      val: function (s) { return s.plots.length; }, reward: { coins: 6000 }, pts: 4 },
    { id: 'crop10',    cat: 'farm', emoji: '🌽', name: '五谷丰登',   desc: '收获过全部 14 种作物', goal: 14,
      val: cropSpeciesOwned, reward: { coins: 250, seeds: { pumpkin: 1 } }, pts: 3 },

    /* 果园 */
    { id: 'orchard1',  cat: 'farm', emoji: '🍑', name: '开垦果园',   desc: '开出第一片果园',       goal: 1,
      val: function (s) { return orchardUnlocked(s) ? 1 : 0; }, reward: { coins: 150 }, pts: 3 },
    { id: 'fruit1',    cat: 'farm', emoji: '🌰', name: '第一颗果子', desc: '从果树上收到 1 个水果', goal: 1,
      val: function (s) { return s.stats.orchardFruit || 0; }, reward: { coins: 60 }, pts: 1 },
    { id: 'fruit100',  cat: 'farm', emoji: '🧺', name: '果园丰收',   desc: '累计收获 100 个水果',  goal: 100,
      val: function (s) { return s.stats.orchardFruit || 0; }, reward: { coins: 400 }, pts: 3 },
    { id: 'tree8',     cat: 'farm', emoji: '🌳', name: '满园果树',   desc: '把 8 个树坑全开出来',  goal: 8,
      val: function (s) { return orchardSlotCount(s); }, reward: { coins: 600 }, pts: 4 },
    { id: 'fruit3',    cat: 'farm', emoji: '🍎', name: '三种果子',   desc: '桃 / 芒果 / 苹果都收过', goal: 3,
      val: fruitSpeciesOwned, reward: { coins: 500, ferts: { special: 2 } }, pts: 4 },
    { id: 'treeLv5',   cat: 'farm', emoji: '🌳', name: '老树盘根',   desc: '把一棵果树养到满级 Lv5', goal: 1,
      val: maxTreeLevel, reward: { coins: 800, ferts: { special: 2 } }, pts: 2 },
    { id: 'wild4',     cat: 'farm', emoji: '🌿', name: '山野通',     desc: '四种野货都采过',       goal: 4,
      val: wildSpeciesOwned, reward: { coins: 400 }, pts: 2 },

    /* 钓鱼 */
    { id: 'fish1',     cat: 'fish', emoji: '🎣', name: '开张啦',     desc: '钓上第 1 条鱼',        goal: 1,
      val: function (s) { return (s.fishBook && s.fishBook.count) || 0; }, reward: { bait: { dough: 5 } }, pts: 1 },
    { id: 'cast100',   cat: 'fish', emoji: '🌊', name: '垂钓老手',   desc: '累计甩杆 100 次',      goal: 100,
      val: function (s) { return s.stats.casts || 0; }, reward: { coins: 100 }, pts: 2 },
    { id: 'perfect1',  cat: 'fish', emoji: '🌟', name: '完美一击',   desc: '钓到 1 条完美品质的鱼', goal: 1,
      val: perfectFish, reward: { coins: 80 }, pts: 2 },
    { id: 'perfect10', cat: 'fish', emoji: '💫', name: '完美主义者', desc: '钓到 10 条完美品质的鱼', goal: 10,
      val: perfectFish, reward: { coins: 500 }, pts: 4 },
    { id: 'fish7',     cat: 'fish', emoji: '🐠', name: '鱼类图鉴',   desc: '集齐 7 种鱼',          goal: 7,
      val: fishSpeciesOwned, reward: { ferts: { special: 3 } }, pts: 5 },
    { id: 'fishval',   cat: 'fish', emoji: '💎', name: '鱼市大亨',   desc: '鱼类累计价值 5000 金', goal: 5000,
      val: fishValueTotal, reward: { coins: 400 }, pts: 3 },

    /* 经营 */
    { id: 'order1',    cat: 'biz',  emoji: '📋', name: '第一单',     desc: '完成 1 个委托',        goal: 1,
      val: function (s) { return s.stats.orders || 0; }, reward: { coins: 20 }, pts: 1 },
    { id: 'order30',   cat: 'biz',  emoji: '🤝', name: '可靠伙伴',   desc: '累计完成 30 个委托',   goal: 30,
      val: function (s) { return s.stats.orders || 0; }, reward: { coins: 150 }, pts: 3 },
    { id: 'coins1k',   cat: 'biz',  emoji: '💰', name: '小有积蓄',   desc: '金币达到 1000',        goal: 1000,
      val: function (s) { return Math.max(s.coins || 0, 0); }, reward: { coins: 80 }, pts: 2 },
    { id: 'coins10k',  cat: 'biz',  emoji: '🤑', name: '万元户',     desc: '金币达到 10000',       goal: 10000,
      val: function (s) { return Math.max(s.coins || 0, 0); }, reward: { coins: 1500 }, pts: 5 },
    { id: 'day30',     cat: 'biz',  emoji: '📅', name: '一个月',     desc: '经营满 30 天',         goal: 30,
      val: function (s) { return s.day || 1; }, reward: { coins: 50 }, pts: 2 },
    { id: 'day100',    cat: 'biz',  emoji: '🏡', name: '百日农场',   desc: '经营满 100 天',        goal: 100,
      val: function (s) { return s.day || 1; }, reward: { coins: 400 }, pts: 4 },

    /* 收集：6 种正经鱼 + 14 种作物 = 20（杂物和宝箱不进图鉴） */
    { id: 'codexall',  cat: 'all',  emoji: '📖', name: '全图鉴',     desc: '6 种鱼 + 14 种作物都收过', goal: 20,
      val: function (s) { return fishSpeciesOwned(s) + cropSpeciesOwned(s); },
      reward: { coins: 500, ferts: { special: 5 } }, pts: 8 },

    /* v1.7 追加：等级 / 经营 / 长期 */
    { id: 'farmLv3',   cat: 'farm', emoji: '🌿', name: '种田入门',   desc: '种田等级到 Lv3',       goal: 3,
      val: function (s) { return (s.levels && s.levels.farm) || 1; }, reward: { coins: 40 }, pts: 2 },
    { id: 'farmLv6',   cat: 'farm', emoji: '🌻', name: '老把式',     desc: '种田等级到 Lv6',       goal: 6,
      val: function (s) { return (s.levels && s.levels.farm) || 1; }, reward: { ferts: { normal: 6 } }, pts: 3 },
    { id: 'fishLv3',   cat: 'fish', emoji: '🎏', name: '手感来了',   desc: '钓鱼等级到 Lv3',       goal: 3,
      val: function (s) { return (s.levels && s.levels.fish) || 1; }, reward: { bait: { dough: 10 } }, pts: 2 },
    { id: 'fishLv6',   cat: 'fish', emoji: '🐋', name: '河边常客',   desc: '钓鱼等级到 Lv6',       goal: 6,
      val: function (s) { return (s.levels && s.levels.fish) || 1; }, reward: { coins: 300 }, pts: 3 },
    { id: 'cropsold100', cat: 'biz', emoji: '🛒', name: '农产品大客户', desc: '累计卖出 100 个作物', goal: 100,
      val: function (s) { return s.stats.cropsSold || 0; }, reward: { coins: 80 }, pts: 2 },
    { id: 'order100',  cat: 'biz',  emoji: '📦', name: '老主顾',     desc: '累计完成 100 个委托',  goal: 100,
      val: function (s) { return s.stats.orders || 0; }, reward: { coins: 600 }, pts: 5 },
    { id: 'coins50k',  cat: 'biz',  emoji: '🏦', name: '富甲一方',   desc: '金币达到 50000',       goal: 50000,
      val: function (s) { return Math.max(s.coins || 0, 0); }, reward: { coins: 3000 }, pts: 8 },
    { id: 'day200',    cat: 'biz',  emoji: '🗓️', name: '两百天',     desc: '经营满 200 天',        goal: 200,
      val: function (s) { return s.day || 1; }, reward: { coins: 800 }, pts: 6 },
    { id: 'perfect50', cat: 'fish', emoji: '✨', name: '完美猎手',   desc: '钓到 50 条完美品质的鱼', goal: 50,
      val: perfectFish, reward: { coins: 1200 }, pts: 6 },
    { id: 'fishval20k', cat: 'fish', emoji: '🐚', name: '水产大户',  desc: '鱼类累计价值 20000 金', goal: 20000,
      val: fishValueTotal, reward: { coins: 800 }, pts: 5 },
    { id: 'cropval5k', cat: 'farm', emoji: '🌾', name: '粮仓满满',   desc: '作物累计价值 5000 金', goal: 5000,
      val: cropValueTotal, reward: { coins: 300 }, pts: 3 },
    { id: 'net9',      cat: 'fish', emoji: '🕸️', name: '网罗天下',   desc: '渔网放满 9 张',        goal: 9,
      val: function (s) { return s.nets || 0; }, reward: { coins: 200 }, pts: 3 },

    /* v2.44 追加：厨房 / 烹饪 / 午饭 */
    { id: 'cook1',     cat: 'biz',  emoji: '🍳', name: '开火',       desc: '做 1 道菜',            goal: 1,
      val: function (s) { return s.stats.cooks || 0; }, reward: { coins: 40 }, pts: 1 },
    { id: 'cook20',    cat: 'biz',  emoji: '🥘', name: '家常便饭',   desc: '累计做 20 道菜',       goal: 20,
      val: function (s) { return s.stats.cooks || 0; }, reward: { coins: 150, ferts: { normal: 2 } }, pts: 3 },
    { id: 'cookLv5',   cat: 'biz',  emoji: '👨‍🍳', name: '掌勺',       desc: '烹饪等级到 Lv5',       goal: 5,
      val: function (s) { return (s.levels && s.levels.cook) || 1; }, reward: { coins: 300 }, pts: 3 },
    { id: 'cookLv10',  cat: 'biz',  emoji: '🌟', name: '米其林',     desc: '烹饪等级满级',         goal: 10,
      val: function (s) { return (s.levels && s.levels.cook) || 1; }, reward: { coins: 800, ferts: { special: 3 } }, pts: 5 },
    { id: 'meal30',    cat: 'biz',  emoji: '🍽️', name: '好好吃饭',   desc: '累计吃 30 次午饭',     goal: 30,
      val: function (s) { return s.stats.meals || 0; }, reward: { coins: 200 }, pts: 2 },

    /* v1.9 追加：挖蚯蚓 / 打零工 */
    { id: 'dig50',     cat: 'fish', emoji: '🪱', name: '蚯蚓猎手',   desc: '累计挖蚯蚓 50 次',     goal: 50,
      val: function (s) { return s.stats.dug || 0; }, reward: { coins: 60, bait: { dough: 5 } }, pts: 2 },
    { id: 'dig200',    cat: 'fish', emoji: '🕳️', name: '土里刨食',   desc: '累计挖蚯蚓 200 次',    goal: 200,
      val: function (s) { return s.stats.dug || 0; }, reward: { coins: 300 }, pts: 4 },
    { id: 'work30',    cat: 'biz',  emoji: '🕐', name: '打工人',     desc: '累计打零工 30 次',     goal: 30,
      val: function (s) { return s.stats.works || 0; }, reward: { coins: 150 }, pts: 2 },
    { id: 'work100',   cat: 'biz',  emoji: '🕑', name: '劳模',       desc: '累计打零工 100 次',    goal: 100,
      val: function (s) { return s.stats.works || 0; }, reward: { coins: 600 }, pts: 5 },

    /* v2.2 追加：收购箱 */
    { id: 'box100',    cat: 'biz',  emoji: '📦', name: '第一车货',   desc: '收购箱累计出货 100 件', goal: 100,
      val: function (s) { return s.stats.boxItems || 0; }, reward: { coins: 100 }, pts: 2 },
    { id: 'box500',    cat: 'biz',  emoji: '🚚', name: '物流大户',   desc: '收购箱累计出货 500 件', goal: 500,
      val: function (s) { return s.stats.boxItems || 0; }, reward: { coins: 400, ferts: { normal: 3 } }, pts: 4 },
    { id: 'boxval5k',  cat: 'biz',  emoji: '💴', name: '箱赚五千',   desc: '收购箱累计收益 5000 金', goal: 5000,
      val: function (s) { return s.stats.boxIncome || 0; }, reward: { coins: 300 }, pts: 3 },

    /* v2.3 追加：下午茶 / 宝箱 */
    { id: 'tea10',     cat: 'biz',  emoji: '🍵', name: '喝茶的人',   desc: '累计喝 10 次下午茶',   goal: 10,
      val: function (s) { return s.stats.teas || 0; }, reward: { coins: 80, teas: { green: 2 } }, pts: 2 },
    { id: 'tea30',     cat: 'biz',  emoji: '🫖', name: '下午三点',   desc: '累计喝 30 次下午茶',   goal: 30,
      val: function (s) { return s.stats.teas || 0; }, reward: { coins: 300, teas: { black: 3 } }, pts: 4 },
    { id: 'chest10',   cat: 'fish', emoji: '🪵', name: '开箱手气',   desc: '累计打开 10 个宝箱',   goal: 10,
      val: function (s) { return s.stats.chests || 0; }, reward: { coins: 120 }, pts: 2 },
    { id: 'chest30',   cat: 'fish', emoji: '👑', name: '宝箱猎人',   desc: '累计打开 30 个宝箱',   goal: 30,
      val: function (s) { return s.stats.chests || 0; }, reward: { coins: 500, keys: { iron: 2 } }, pts: 4 },

    /* v2.15 追加：采集 */
    { id: 'forage1',   cat: 'all',  emoji: '🌿', name: '第一次进山', desc: '采集 1 次',             goal: 1,
      val: function (s) { return s.stats.forages || 0; }, reward: { coins: 15 }, pts: 1 },
    { id: 'forage30',  cat: 'all',  emoji: '🧺', name: '跑山人',     desc: '累计采集 30 次',       goal: 30,
      val: function (s) { return s.stats.forages || 0; },
      reward: { coins: 120, ferts: { normal: 2 } }, pts: 2 },
    { id: 'forage120', cat: 'all',  emoji: '🏕️', name: '山野行家',   desc: '累计采集 120 次',      goal: 120,
      val: function (s) { return s.stats.forages || 0; }, reward: { coins: 500 }, pts: 4 },
    { id: 'forage3',   cat: 'all',  emoji: '🎒', name: '满载而归',   desc: '一次采到 3 件野货',    goal: 3,
      val: function (s) { return s.stats.forageBest || 0; }, reward: { coins: 100 }, pts: 2 },
    { id: 'wild4',     cat: 'all',  emoji: '🍄', name: '四季野味',   desc: '荠菜 / 野莓 / 松茸 / 冻梨都采过', goal: 4,
      val: function (s) {
        const w = s.stats.wild || {};
        return WILD_LIST.filter(function (x) { return (w[x.id] || 0) > 0; }).length;
      }, reward: { coins: 250, ferts: { special: 2 } }, pts: 3 },
    { id: 'forageLv5', cat: 'all',  emoji: '🧭', name: '认得百草',   desc: '采集等级到 Lv5',       goal: 5,
      val: function (s) { return (s.levels && s.levels.forage) || 1; },
      reward: { coins: 200, bait: { dough: 10 } }, pts: 3 },

    /* v2.17 追加：设备 */
    { id: 'devSprinkler', cat: 'dev', emoji: '🚿', name: '第一根水管', desc: '买 1 个洒水器',        goal: 1,
      val: function (s) { return s.sprinklers || 0; }, reward: { coins: 30 }, pts: 1 },
    { id: 'devSprinkler10', cat: 'dev', emoji: '⛲', name: '自动灌溉',   desc: '洒水器达到 10 个',     goal: 10,
      val: function (s) { return s.sprinklers || 0; }, reward: { coins: 200 }, pts: 3 },
    { id: 'devHarvester', cat: 'dev', emoji: '🤖', name: '铁牛下地',    desc: '买自动收获器',         goal: 1,
      val: function (s) { return s.harvester ? 1 : 0; }, reward: { coins: 150 }, pts: 2 },
    { id: 'devSeeder',    cat: 'dev', emoji: '🌱', name: '播种流水线',  desc: '买 1 台自动播种器',    goal: 1,
      val: function (s) { return Math.round(s.seeder || 0); }, reward: { coins: 150 }, pts: 2 },
    { id: 'devSeeder4',   cat: 'dev', emoji: '🏭', name: '育苗车间',    desc: '自动播种器达到 4 台',  goal: 4,
      val: function (s) { return Math.round(s.seeder || 0); }, reward: { coins: 400 }, pts: 4 },
    { id: 'devAuto',      cat: 'dev', emoji: '🏗️', name: '全自动农场',  desc: '洒水器 5 个 + 自动收获器 + 播种器 2 台',
      goal: 1,
      val: function (s) {
        return ((s.sprinklers || 0) >= 5 && s.harvester && Math.round(s.seeder || 0) >= 2) ? 1 : 0;
      },
      reward: { coins: 500, ferts: { special: 2 } }, pts: 5 }
  ];

  const ACH_CATS = { farm: '🌱 种田', fish: '🎣 钓鱼', dev: '🔧 设备', biz: '💰 经营', all: '🏆 收集' };

  /* 成就奖励文案：成就点 + 金币 / 种子 / 肥料 / 饵料 / 茶 / 钥匙 */
  function rewardText(a) {
    const parts = [];
    if (a.pts) parts.push(a.pts + ' 点');
    const r = a.reward || {};
    if (r.coins) parts.push(r.coins + ' 金');
    ['seeds', 'ferts', 'bait', 'teas', 'keys'].forEach(function (k) {
      const bag = r[k] || {};
      Object.keys(bag).forEach(function (id) {
        let name = id;
        if (k === 'seeds' && CROPS[id]) name = CROPS[id].name + '种子';
        if (k === 'ferts' && FERT[id]) name = FERT[id].name;
        if (k === 'bait') name = id === 'worm' ? '蚯蚓' : '面团饵';
        if (k === 'teas' && TEAS[id]) name = TEAS[id].name;
        if (k === 'keys' && KEYS[id]) name = KEYS[id].name;
        parts.push(name + '×' + bag[id]);
      });
    });
    return '奖励 ' + parts.join(' · ');
  }

  function applyReward(s, r, label) {
    r = r || {};
    if (r.coins) addCoins(s, r.coins, label || '成就奖励');
    Object.keys(r.seeds || {}).forEach(function (id) {
      s.seeds[id] = (s.seeds[id] || 0) + r.seeds[id];
    });
    Object.keys(r.ferts || {}).forEach(function (id) {
      s.ferts[id] = (s.ferts[id] || 0) + r.ferts[id];
    });
    Object.keys(r.bait || {}).forEach(function (id) {
      s.bait[id] = (s.bait[id] || 0) + r.bait[id];
    });
    Object.keys(r.teas || {}).forEach(function (id) {
      s.teas = s.teas || {};
      s.teas[id] = (s.teas[id] || 0) + r.teas[id];
    });
    Object.keys(r.keys || {}).forEach(function (id) {
      s.keys = s.keys || {};
      s.keys[id] = (s.keys[id] || 0) + r.keys[id];
    });
  }

  /* 成就点 → 售价加成：每 10 点 +1%，最多 +20% */
  function achPts(s) {
    s.ach = s.ach || {};
    return ACH.reduce(function (n, a) { return n + (s.ach[a.id] ? (a.pts || 0) : 0); }, 0);
  }
  function sellBonus(s) {
    return 1 + Math.min(0.2, Math.floor(achPts(s) / 10) * 0.01);
  }

  /* 检查并解锁：点数 + 实质奖励一起发放 */
  function checkAchievements(s) {
    s.ach = s.ach || {};
    const out = [];
    ACH.forEach(function (a) {
      if (s.ach[a.id]) return;
      if (a.val(s) < a.goal) return;
      s.ach[a.id] = s.day;
      applyReward(s, a.reward);
      const bonus = Math.round((sellBonus(s) - 1) * 100);
      log(s, '🏆 成就解锁：' + a.emoji + ' ' + a.name + '（' + rewardText(a) +
        ' · 售价 +' + bonus + '%）', 'good');
      out.push({ id: a.id, name: a.name, emoji: a.emoji, pts: a.pts, bonus: bonus, text: rewardText(a) });
    });
    return out;
  }

  /* 单个成就的进度信息，给界面用 */
  function achInfo(s) {
    s.ach = s.ach || {};
    return ACH.map(function (a) {
      const cur = Math.min(a.val(s), a.goal);
      return { id: a.id, cat: a.cat, emoji: a.emoji, name: a.name, desc: a.desc,
               goal: a.goal, cur: cur, done: !!s.ach[a.id], day: s.ach[a.id] || 0,
               pts: a.pts, reward: rewardText(a) };
    });
  }

