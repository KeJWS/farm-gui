/* 我的小农场 · 界面层 / 12-actions.js
 * 重置确认 / ACTIONS 动作表 / 飘字定位
 * 由 build-ui.cjs 按文件名顺序拼进 ui.js（共享同一个 IIFE 作用域），不要单独加载。
 */

  /* ---------------- 动作 ---------------- */

  const ACTIONS = {
    waterAll: function (ev) {
      const r = G.waterAll(state);
      commit(r);
      if (r.ok) { toast(r.msg, 'good'); SFX.water(); floatAt(ev, '💧 ' + r.done, 'water'); }
    },
    harvestAll: function (ev) {
      const r = G.harvestAll(state);
      commit(r);
      if (r.ok) { toast(r.msg, 'good'); SFX.good(); floatAt(ev, '🧺 ' + (r.msg.split('共 ')[1] || ''), 'green'); }
    },
    sleep: function () {
      const r = G.sleep(state);
      commit(r);
      SFX.sleep();
      // 睡眠播报升级成「每日总结」面板
      daySummaryModal(r);
    },
    dig: function (ev) {
      const r = G.digWorms(state);
      commit(r);
      if (r.ok) { toast(r.msg, 'good'); SFX.plant(); floatAt(ev, '🪱 +' + r.n, 'green'); }
    },
    forage: function (ev) {
      const r = G.forage(state);
      commit(r);
      if (r.ok) {
        toast(r.msg + (r.seed ? ' · 还捡到一颗种子' : ''), 'good');
        SFX.plant();
        floatAt(ev, '🌿 +' + r.qty, 'green');
      } else {
        toast(r.msg, 'warn');
      }
    },
    tea: teaModal,
    depart: departModal,
    work: function (ev) {
      const r = G.workAuto(state);
      commit(r);
      if (r.ok) { toast(r.msg, 'good'); SFX.coin(); floatAt(ev, r.msg, ''); }
    },
    expand: function () {
      const r = G.expand(state);
      commit(r);
      if (r.ok) { toast(r.msg, 'good'); SFX.coin(); }
    },
    upgrade: function () {
      const r = G.upgrade(state);
      commit(r);
      if (r.ok) { toast(r.msg, 'good'); SFX.good(); }
    },
    sprinkler: function () {
      const r = G.buySprinkler(state);
      commit(r);
      if (r.ok) { toast(r.msg, 'good'); SFX.coin(); }
    },
    harvester: function () {
      const r = state.harvester ? G.toggleHarvester(state) : G.buyHarvester(state);
      commit(r);
      if (r.ok) { toast(r.msg, 'good'); SFX.coin(); }
    },
    seeder: function () { seederModal(); },
    shop: shopModal,
    fishshop: fishShop,
    cropshop: cropShop,
    seedshop: seedShop,
    plantAll: function () { cropPicker(0, true); },
    fertilizeAll: fertModal,
    sellAll: function () {
      const r = G.sellAll(state);
      commit(r);
      if (r.ok) { toast(r.msg, 'good'); SFX.coin(); }
    },
    cast: function (ev) {
      const r = G.fish(state, baitSel);
      commit(r);
      if (r.ok && r.empty) {
        toast('空竿了，没有鱼咬钩', 'warn');
        floatAt(ev, '空竿', '');
        SFX.bad();
        return;
      }
      if (r.ok) {
        pushCatch(r.entry);
        toast(r.msg, r.entry.trash ? 'warn' : 'good');
        SFX.catch();
        floatAt(ev, '+' + r.entry.price + ' 金', '');
      }
    },
    cast5: function () {
      const r = G.fishMany(state, 5, baitSel);
      commit(r);                       // commit 已经在失败时提示过一次
      if (!r.ok) return;
      const got = r.results.filter(function (x) { return x.ok && x.entry; }).map(function (x) { return x.entry; });
      setCatchBatch(got);
      toast(r.msg, 'good');
      SFX.catch();
    },
    castAll: function () {
      const r = G.fishAll(state, baitSel);
      commit(r);
      if (!r.ok) return;
      setCatchBatch(r.entries || []);
      toast(r.msg, 'good');
      SFX.catch();
    }
  };

  function floatAt(ev, text, cls) {
    if (!ev || !ev.clientX) return;
    floatText(ev.clientX, ev.clientY - 10, text, cls);
  }
