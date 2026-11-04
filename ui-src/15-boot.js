/* 我的小农场 · 界面层 / 14-boot.js
 * 启动：读档、渲染、成就检查、欢迎提示
 * 由 build-ui.cjs 按文件名顺序拼进 ui.js（共享同一个 IIFE 作用域），不要单独加载。
 */

  /* ---------------- 启动 ---------------- */

  function boot() {
    window.addEventListener('error', function (e) {
      console.error(e.error || e.message);
      toast('出错了：' + (e.message || '未知错误'), 'bad');
    });
    if (location.hash === '#fresh') {
      try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 忽略 */ }
    }
    try { if (localStorage.getItem('farm-gui-theme') === 'dark') theme = 'dark'; } catch (e) { /* 忽略 */ }
    applyTheme();
    const saved = load();
    if (saved) {
      state = saved;
      // 用钓鱼记录本里的历史把「最近渔获」补上
      catchLog = (state.fishBook.entries || []).slice(0, 5);
    } else {
      state = G.createState();
    }
    bind();
    const unlocked = G.checkAchievements(state);
    renderAll();
    save();

    if (saved) {
      setTimeout(function () { toast('读取存档：第 ' + state.day + ' 天 · ' + state.coins + ' 金', 'good'); }, 300);
    } else {
      setTimeout(function () { toast('🌾 欢迎来到我的小农场！先给空地播种吧', 'good'); }, 300);
    }
    if (unlocked.length) setTimeout(function () { achToasts(unlocked); }, 900);
  }

  boot();
