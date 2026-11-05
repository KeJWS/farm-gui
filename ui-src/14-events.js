/* 我的小农场 · 界面层 / 14-events.js
 * 全部事件绑定：点击委托、输入、快捷键、文件导入
 * 由 build-ui.cjs 按文件名顺序拼进 ui.js（共享同一个 IIFE 作用域），不要单独加载。
 */

  /* ---------------- 事件绑定 ---------------- */

  function bind() {
    $('#store-search').addEventListener('input', function () {
      storeQuery = this.value || '';
      renderStore();
    });
    document.addEventListener('click', function (ev) {
      const t = ev.target;

      const marketPageBtn = t.closest('[data-market-page]');
      if (marketPageBtn) {
        if (marketPageBtn.dataset.marketPage === 'analysis') analysisModal();
        else marketModal();
        return;
      }

      const storeFilterBtn = t.closest('[data-store-filter]');
      if (storeFilterBtn) {
        storeFilter = storeFilterBtn.dataset.storeFilter || 'all';
        renderStore();
        return;
      }

      // 关闭弹窗
      const closer = t.closest('[data-close]');
      if (closer) { closeModal(); return; }

      if (t.closest('#do-reset')) {
        state = G.createState();
        catchLog = [];
        closeModal();
        renderAll();
        save();
        toast('新的开始 🌱', 'good');
        return;
      }

      // 农场指南翻页
      const helpTab = t.closest('[data-helppage]');
      if (helpTab) {
        helpPage = Number(helpTab.dataset.helppage) || 0;
        helpModal();
        return;
      }
      const helpNav = t.closest('[data-helpnav]');
      if (helpNav && !helpNav.disabled) {
        helpPage = Math.max(0, Math.min(helpPages().length - 1,
          helpPage + Number(helpNav.dataset.helpnav)));
        helpModal();
        return;
      }

      // 成就翻页
      const achTab = t.closest('[data-achcat]');
      if (achTab) {
        achCat = achTab.dataset.achcat;
        achModal();
        return;
      }
      const achNav = t.closest('[data-achnav]');
      if (achNav && !achNav.disabled) {
        let i = ACH_ORDER.indexOf(achCat) + Number(achNav.dataset.achnav);
        i = Math.max(0, Math.min(ACH_ORDER.length - 1, i));
        achCat = ACH_ORDER[i];
        achModal();
        return;
      }

      // 果园：开垦 / 种树 / 浇水 / 收获 / 买树苗
      const orcUnlock = t.closest('[data-orchard-unlock]');
      if (orcUnlock && !orcUnlock.disabled) {
        const r = G.orchardUnlock(state);
        if (r.ok) { commit(r); toast(r.msg, 'good'); SFX.coin(); }
        else { toast(r.msg, 'warn'); SFX.bad(); }
        return;
      }
      const treePick = t.closest('[data-tree-pick]');
      if (treePick) { treePicker(Number(treePick.dataset.treePick)); return; }
      const treePlant = t.closest('[data-tree-plant]');
      if (treePlant && !treePlant.disabled) {
        const r = G.plantTree(state, Number(treePlant.dataset.treePlant),
          treePlant.dataset.tree, treePlant.dataset.mode);
        if (r.ok) { closeModal(); commit(r); toast(r.msg, 'good'); SFX.plant(); }
        else { toast(r.msg, 'bad'); SFX.bad(); }
        return;
      }
      const treeWater = t.closest('[data-tree-water]');
      if (treeWater && !treeWater.disabled) {
        const r = G.waterTree(state, Number(treeWater.dataset.treeWater));
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.water();
        return;
      }
      const treeHarvest = t.closest('[data-tree-harvest]');
      if (treeHarvest && !treeHarvest.disabled) {
        const r = G.harvestTree(state, Number(treeHarvest.dataset.treeHarvest));
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.good();
        return;
      }
      const buyTree = t.closest('[data-buytree]');
      if (buyTree && !buyTree.disabled) {
        const r = G.buyTreeStock(state, buyTree.dataset.buytree, buyTree.dataset.mode, 1);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok && modalOpen()) departModal();
        return;
      }

      // 地块：熟了一键收，其余（空地/生长中/按住 Shift）进详情
      const plot = t.closest('.plot');
      if (plot) {
        const i = Number(plot.dataset.i);
        const p = state.plots[i];
        if (p && p.crop && G.canHarvest(state, p) && !ev.shiftKey && ev.button !== 2) {
          const r = G.harvest(state, i);
          commit(r);
          if (r.ok) {
            toast(r.msg, 'good');
            SFX.good();
            floatAt(ev, '🧺 +' + r.qty, 'green');
          } else {
            toast(r.msg, 'warn');
          }
          return;
        }
        plotModal(i);
        return;
      }

      // 主要动作按钮
      const actBtn = t.closest('[data-act]');
      if (actBtn && !actBtn.disabled) {
        const fn = ACTIONS[actBtn.dataset.act];
        if (fn) { fn(ev); return; }
      }

      // 种植（单块 / 全部播种）
      const cropCard = t.closest('[data-crop]');
      if (cropCard) {
        const idx = Number(cropCard.dataset.plot);
        const batch = cropCard.dataset.batch === '1';
        const id = cropCard.dataset.crop;
        const r = batch ? G.plantAll(state, id) : G.plant(state, idx, id);
        if (r.ok) {
          closeModal();
          commit(r);
          toast(r.msg, 'good');
          SFX.plant();
        } else {
          toast(r.msg, 'bad');
          SFX.bad();
        }
        return;
      }

      // 地块内动作
      const pact = t.closest('[data-pact]');
      if (pact && !pact.disabled) {
        const i = Number(pact.dataset.i);
        const kind = pact.dataset.pact;
        if (kind === 'clear') { confirmClear(i); return; }
        let r;
        if (kind === 'water') r = G.water(state, i);
        else if (kind === 'harvest') r = G.harvest(state, i);
        else if (kind === 'fert-normal') r = G.useFert(state, i, 'normal');
        else if (kind === 'fert-special') r = G.useFert(state, i, 'special');
        if (r) {
          if (r.ok) { closeModal(); commit(r); toast(r.msg, 'good'); SFX[r.crop ? 'coin' : 'water'](); }
          else { toast(r.msg, 'warn'); SFX.bad(); }
        }
        return;
      }

      // 全部施肥
      const fertBtn = t.closest('[data-fert]');
      if (fertBtn && !fertBtn.disabled) {
        const r = G.fertilizeAll(state, fertBtn.dataset.fert);
        closeModal();
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.good();
        return;
      }

      // 贝壳状：饵料
      const bait = t.closest('[data-bait]');
      if (bait) {
        if (bait.classList.contains('off')) { toast('这个饵料用完了', 'warn'); return; }
        baitSel = bait.dataset.bait;
        renderBait();
        return;
      }

      // 商店购买
      const buy = t.closest('[data-buy]');
      if (buy) {
        const r = G.buyBait(state, buy.dataset.buy, Number(buy.dataset.n) || 1);
        commit(r);
        toast(r.ok ? r.msg : r.msg, r.ok ? 'good' : 'warn');
        if (r.ok && modalOpen()) shopModal();
        return;
      }

      // 仓库单卖
      const sell = t.closest('[data-sell]');
      if (sell) {
        const r = G.sellOne(state, sell.dataset.sell);
        commit(r);
        toast(r.msg, 'good');
        SFX.coin();
        return;
      }

      // 水产店：自定义卖出
      const sellFishN = t.closest('[data-sellfishn]');
      if (sellFishN) {
        const sel = $('#fish-sell-id'), input = $('#fish-sell-n');
        const key = sel && sel.value;
        const n = Math.floor(Number(input && input.value) || 0);
        if (!key) { toast('先选一种渔获', 'warn'); return; }
        if (!(n > 0)) { toast('请输入 1 以上的数量', 'warn'); return; }
        const r = G.sellFishGroupN(state, key, n);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) fishShop();
        return;
      }

      // 卖一种鱼（水产店）
      const sellFish = t.closest('[data-sellfish]');
      if (sellFish) {
        const r = G.sellFishGroup(state, sellFish.dataset.sellfish);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) fishShop();
        return;
      }

      // 收购箱：自定义取出（可选物品）
      const boxTakeN = t.closest('[data-boxtaken]');
      if (boxTakeN) {
        const sel = $('#box-pick'), input = $('#box-take');
        const idx = sel ? Number(sel.value) : 0;
        const n = Math.floor(Number(input && input.value) || 0);
        if (!(n > 0)) { toast('请输入 1 以上的数量', 'warn'); return; }
        const r = G.boxTakeEntry(state, idx, n);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (modalOpen()) boxModal();
        return;
      }

      // 收购箱：全部取出
      const boxTakeBtn = t.closest('[data-boxtake]');
      if (boxTakeBtn) {
        const r = G.boxTake(state);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (modalOpen()) boxModal();
        return;
      }

      // 农产品店：自定义卖出
      const sellCropN = t.closest('[data-sellcropn]');
      if (sellCropN) {
        const sel = $('#crop-sell-id'), input = $('#crop-sell-n');
        const id = sel && sel.value;
        let n = Math.floor(Number(input && input.value) || 0);
        if (!id) { toast('先选一种作物', 'warn'); return; }
        if (!(n > 0)) { toast('请输入 1 以上的数量', 'warn'); return; }
        const r = G.sellCropN(state, id, n);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) cropShop();
        return;
      }

      // 收购箱：仓库行上的「全部」按钮
      const boxAllRow = t.closest('[data-boxall]');
      if (boxAllRow) {
        const raw = String(boxAllRow.dataset.boxall || '');
        const cut = raw.indexOf('|');
        const kind = raw.slice(0, cut);
        const key = raw.slice(cut + 1);
        const available = kind === 'crop'
          ? G.storeCount(state, key)
          : ((G.fishGroups(state).filter(function (g) { return g.key === key; })[0] || {}).count || 0);
        if (!(available > 0)) { toast('仓库里已经没有这件了', 'warn'); return; }
        const r = kind === 'crop'
          ? G.boxPutCrop(state, key, available)
          : G.boxPutFish(state, key, available);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        return;
      }

      // 收购箱：弹窗里的「全部放入」（保留兼容）
      const boxAll = t.closest('[data-boxput-all]');
      if (boxAll) {
        const raw = String(boxAll.dataset.boxputAll || '');
        const cut = raw.indexOf('|');
        const kind = raw.slice(0, cut);
        const key = raw.slice(cut + 1);
        const available = kind === 'crop'
          ? G.storeCount(state, key)
          : ((G.fishGroups(state).filter(function (g) { return g.key === key; })[0] || {}).count || 0);
        if (!(available > 0)) { toast('仓库里已经没有这件了', 'warn'); return; }
        const r = kind === 'crop'
          ? G.boxPutCrop(state, key, available)
          : G.boxPutFish(state, key, available);
        if (r.ok) closeModal();
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        return;
      }

      // 收购箱：确认自定义放货数量
      const boxPut = t.closest('[data-boxput-kind]');
      if (boxPut) {
        const kind = boxPut.dataset.boxputKind;
        const key = boxPut.dataset.boxputKey;
        const qty = Math.floor(Number($('#box-put-n').value) || 0);
        const available = kind === 'crop'
          ? G.storeCount(state, key)
          : ((G.fishGroups(state).filter(function (g) { return g.key === key; })[0] || {}).count || 0);
        if (!(qty > 0)) { toast('请输入 1 以上的数量', 'warn'); return; }
        if (qty > available) { toast('仓库只有 ' + available + ' 件', 'warn'); return; }
        const r = kind === 'crop' ? G.boxPutCrop(state, key, qty) : G.boxPutFish(state, key, qty);
        if (r.ok) closeModal();
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        return;
      }

      // 仓库点 📦 后选择放入收购箱的数量
      const boxCrop = t.closest('[data-boxcrop]');
      if (boxCrop) {
        const id = boxCrop.dataset.boxcrop;
        boxPutModal('crop', id, G.CROPS[id].name, G.storeCount(state, id));
        return;
      }
      const boxFish = t.closest('[data-boxfish]');
      if (boxFish) {
        const key = boxFish.dataset.boxfish;
        const g = G.fishGroups(state).filter(function (x) { return x.key === key; })[0];
        if (g) boxPutModal('fish', key, g.name, g.count);
        return;
      }

      // 农产品店：卖作物 / 全部卖出 / 买作物
      const sellCrop = t.closest('[data-sellcrop]');
      if (sellCrop) {
        const r = G.sellOne(state, sellCrop.dataset.sellcrop);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) cropShop();
        return;
      }
      const sellAllCrop = t.closest('[data-sellallcrop]');
      if (sellAllCrop && !sellAllCrop.disabled) {
        const r = G.sellAll(state);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) cropShop();
        return;
      }
      const buyCropBtn = t.closest('[data-buycrop]');
      if (buyCropBtn && !buyCropBtn.disabled) {
        const r = G.buyCrop(state, buyCropBtn.dataset.buycrop, Number(buyCropBtn.dataset.n) || 1);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) cropShop();
        return;
      }

      // 渔具店：面团饵自定义数量
      const buyCustom = t.closest('[data-buycustom]');
      if (buyCustom) {
        const input = $('#dough-qty');
        let n = Math.floor(Number(input && input.value) || 0);
        if (!(n > 0)) { toast('请输入 1 以上的数量', 'warn'); return; }
        n = Math.min(999, n);
        const r = G.buyBait(state, buyCustom.dataset.buycustom, n);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) shopModal();
        return;
      }

      // 水产店：买鱼
      const buyFish = t.closest('[data-buyfish]');      if (buyFish && !buyFish.disabled) {
        const r = G.buyFish(state, buyFish.dataset.buyfish, Number(buyFish.dataset.n) || 1);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) fishShop();
        return;
      }

      const sellAllFish = t.closest('[data-sellallfish]');
      if (sellAllFish && !sellAllFish.disabled) {
        const r = G.sellAllFish(state);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) fishShop();
        return;
      }

      // 厨房：做菜 / 吃午饭 / 放收购箱
      const cookBtn = t.closest('[data-cook]');
      if (cookBtn && !cookBtn.disabled) {
        const r = G.cookMeal(state, cookBtn.dataset.cook);
        commit(r);
        if (r.ok) {
          SFX.good();
          toast(r.fail ? '🔥 做砸了，得到一份焦糊料理' : '🍳 ' + r.food.name + ' 做好了', r.fail ? 'warn' : 'good');
          if (modalOpen()) kitchenModal();
        } else {
          toast(r.msg, 'warn');
        }
        return;
      }
      const eatBtn = t.closest('[data-eatfood]');
      if (eatBtn && !eatBtn.disabled) {
        const r = G.eatFoodGroup(state, eatBtn.dataset.eatfood);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) { SFX.good(); closeModal(); }
        return;
      }
      const boxFood = t.closest('[data-boxfood]');
      if (boxFood && !boxFood.disabled) {
        const r = G.boxPutFoodGroup(state, boxFood.dataset.boxfood);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) kitchenModal();
        return;
      }

      // 下午茶：喝哪一杯
      const drink = t.closest('[data-tea]');
      if (drink && !drink.disabled) {
        const r = G.tea(state, drink.dataset.tea);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) { SFX.good(); if (modalOpen()) teaModal(); }
        return;
      }

      // 百货店：买茶 / 买钥匙 / 回收 / 开箱
      const buyTea = t.closest('[data-buytea]');
      if (buyTea && !buyTea.disabled) {
        const r = G.buyTea(state, buyTea.dataset.buytea, Number(buyTea.dataset.n) || 1);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) departModal();
        return;
      }
      const buyKey = t.closest('[data-buykey]');
      if (buyKey && !buyKey.disabled) {
        const r = G.buyKey(state, buyKey.dataset.buykey, 1);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) departModal();
        return;
      }
      const buyRecipe = t.closest('[data-buyrecipe]');
      if (buyRecipe && !buyRecipe.disabled) {
        const r = G.buyRecipe(state, buyRecipe.dataset.buyrecipe);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) { SFX.coin(); if (modalOpen()) departModal(); }
        return;
      }
      const sellJunk = t.closest('[data-selljunk]');
      if (sellJunk && !sellJunk.disabled) {
        const r = G.sellJunk(state, sellJunk.dataset.selljunk);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) departModal();
        return;
      }
      const openChestBtn = t.closest('[data-openchest]');
      if (openChestBtn && !openChestBtn.disabled) {
        const r = G.openChest(state, openChestBtn.dataset.openchest);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.good();
        if (modalOpen()) departModal();
        return;
      }

      // 长期订单
      const longBtn = t.closest('[data-long]');
      if (longBtn && !longBtn.disabled) {
        const r = G.deliverLong(state);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        return;
      }
      // 交付委托
      const orderBtn = t.closest('[data-order]');
      if (orderBtn && !orderBtn.disabled) {
        const r = G.deliverOrder(state, orderBtn.dataset.order);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        return;
      }

      // 肥料：买 / 卖（种子店、仓库共用）
      const fertBuy = t.closest('[data-fertbuy]');
      if (fertBuy) {
        const r = G.buyFertItem(state, fertBuy.dataset.fertbuy, Number(fertBuy.dataset.n) || 1);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) seedShop();
        return;
      }
      const fertSell = t.closest('[data-fertsell]');
      if (fertSell) {
        const r = G.sellFert(state, fertSell.dataset.fertsell);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) seedShop();
        return;
      }
      const allSeeds = t.closest('[data-sellallseeds]');
      if (allSeeds) {
        const r = G.sellAllSeeds(state);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) seedShop();
        return;
      }

      // 买渔网
      const buyNet = t.closest('[data-buynet]');
      if (buyNet && !buyNet.disabled) {
        const r = G.buyNet(state);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) shopModal();
        return;
      }

      // 重新布置渔网
      const resetNet = t.closest('[data-resetnets]');
      if (resetNet && !resetNet.disabled) {
        const r = G.resetNets(state);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) shopModal();
        return;
      }

      // 自动播种器：买 / 开关 / 每台选种子
      const buySeeder = t.closest('[data-buyseeder]');
      if (buySeeder && !buySeeder.disabled) {
        const r = G.buySeeder(state);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) { SFX.coin(); seederModal(); }
        return;
      }
      const togSeeder = t.closest('[data-toggleseeder]');
      if (togSeeder) {
        const r = G.toggleSeeder(state);
        commit(r);
        toast(r.msg, 'good');
        seederModal();
        return;
      }
      const machBtn = t.closest('[data-mach]');
      if (machBtn) {
        seedMach = Number(machBtn.dataset.mach) || 1;
        seederModal();
        return;
      }
      const autoSeedBtn = t.closest('[data-autoseed]');
      if (autoSeedBtn) {
        const id = autoSeedBtn.dataset.autoseed;
        const cur = G.autoSeedOf(state, seedMach);
        const r = G.setAutoSeed(state, seedMach, cur === id ? null : id);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        seederModal();
        return;
      }

      // 雇佣 / 升级 / 辞退渔夫
      const donateBtn = t.closest('[data-donate]');
      if (donateBtn && !donateBtn.disabled) {
        const r = G.donate(state, Number(donateBtn.dataset.donate) || 0);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) townModal();
        return;
      }
      const hireBtn = t.closest('[data-hirefisher]');
      if (hireBtn && !hireBtn.disabled) {
        const r = G.hireFisher(state);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) shopModal();
        return;
      }
      const fisherUpBtn = t.closest('[data-fisherup]');
      if (fisherUpBtn && !fisherUpBtn.disabled) {
        const r = G.fisherUp(state);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) shopModal();
        return;
      }
      const fireBtn = t.closest('[data-firefisher]');
      if (fireBtn) {
        const r = G.fireFisher(state);
        commit(r);
        toast(r.msg, 'warn');
        if (modalOpen()) shopModal();
        return;
      }

      // 卖蚯蚓（自定义数量）
      const sellWormN = t.closest('[data-sellwormn]');
      if (sellWormN && !sellWormN.disabled) {
        const input = $('#worm-qty');
        let n = Math.floor(Number(input && input.value) || 0);
        if (!(n > 0)) { toast('请输入 1 以上的数量', 'warn'); return; }
        const r = G.sellWorms(state, Math.min(999, n));
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) shopModal();
        return;
      }

      // 卖蚯蚓
      const sellWorm = t.closest('[data-sellworm]');
      if (sellWorm) {
        const r = G.sellWorms(state);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        return;
      }

      // 铲除确认
      const doClear = t.closest('[data-clear]');
      if (doClear) {
        const r = G.clearPlot(state, Number(doClear.dataset.clear));
        closeModal();
        commit(r);
        toast(r.msg, 'warn');
        return;
      }

      // 种子店：买种子
      const buySeed = t.closest('[data-buyseed]');
      if (buySeed) {
        const r = G.buySeed(state, buySeed.dataset.buyseed, Number(buySeed.dataset.n) || 1);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) seedShop();     // 刷新库存与价格
        return;
      }

      // 种子店：卖种子（一口价卖光那种）
      const sellSeed = t.closest('[data-sellseed]');
      if (sellSeed) {
        const r = G.sellSeed(state, sellSeed.dataset.sellseed);
        commit(r);
        toast(r.msg, r.ok ? 'good' : 'warn');
        if (r.ok) SFX.coin();
        if (modalOpen()) seedShop();
        return;
      }

      // 账本按天展开/收起
      const ledDay = t.closest('[data-ledday]');
      if (ledDay) {
        const d = Number(ledDay.dataset.ledday);
        openLedgerDay = (openLedgerDay === d) ? null : d;
        renderLedger();
        return;
      }

      // 日志按天展开/收起
      const logDay = t.closest('[data-logday]');
      if (logDay) {
        const d = Number(logDay.dataset.logday);
        openLogDay = (openLogDay === d) ? null : d;
        renderLog();
        return;
      }

      // 钓鱼记录 Tab 筛选
      const bookTab = t.closest('[data-book-filter]');
      if (bookTab) {
        bookFilter = bookTab.dataset.bookFilter;
        renderBook();
        return;
      }
    });

    $('#btn-settings').addEventListener('click', settingsModal);
    $('#btn-box').addEventListener('click', boxModal);
    $('#btn-status').addEventListener('click', statusModal);
    $('#btn-codex').addEventListener('click', codexModal);
    $('#btn-profile').addEventListener('click', profileModal);
    $('#btn-ach').addEventListener('click', achModal);
    const mktBtn = $('#btn-market');
    if (mktBtn) mktBtn.addEventListener('click', marketModal);
    const townBtn = $('#btn-town');
    if (townBtn) townBtn.addEventListener('click', townModal);
    $('#btn-refresh-orders').addEventListener('click', function () {
      const r = G.refreshOrders(state);
      commit(r);
      toast(r.msg, r.ok ? 'good' : 'warn');
      if (r.ok) SFX.good();
    });
    $('#btn-log').addEventListener('click', exportLog);
    $('#btn-ledger').addEventListener('click', exportLedger);
    $('#btn-stats').addEventListener('click', statsModal);
    $('#file-import').addEventListener('change', function () {
      importSave(this.files && this.files[0]);
      this.value = '';
    });

    // 设置面板里的按钮（面板每次重绘，用事件委托）
    document.addEventListener('click', function (ev) {
      const t = ev.target;
      if (t.closest('#set-help')) { closeModal(); helpModal(); return; }
      if (t.closest('#set-export')) { exportSave(); return; }
      if (t.closest('#set-import')) { $('#file-import').click(); return; }
      if (t.closest('#set-sound')) { soundOn = !soundOn; if (soundOn) SFX.good(); settingsModal(); return; }
      if (t.closest('#set-theme')) { toggleTheme(); settingsModal(); return; }
      if (t.closest('#set-share')) { closeModal(); shareCardModal(); return; }
      if (t.closest('#set-reset')) { closeModal(); resetModal(); return; }
    });

    // 键盘可操作：这些「可点的 div」按 Enter / 空格 等同点击
    document.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Enter' && ev.key !== ' ' && ev.key !== 'Spacebar') return;
      const el = ev.target;
      if (!el || !el.matches || !el.matches('.plot, .bait, .led-row, .log-day')) return;
      ev.preventDefault();
      el.click();
    });

    // 右键地块 = 打开详情（左键点成熟地块是直接收获）
    document.addEventListener('contextmenu', function (ev) {
      const plot = ev.target.closest && ev.target.closest('.plot');
      if (!plot) return;
      ev.preventDefault();
      plotModal(Number(plot.dataset.i));
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && modalOpen()) closeModal();
    });
  }
