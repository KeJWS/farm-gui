/* 我的小农场 · 界面层 / 16-share.js
 * 分享名片：把当前农场画成一张 PNG 名片（纯本地 canvas，不上传任何数据）
 * 由 build-ui.cjs 按文件名顺序拼进 ui.js（共享同一个 IIFE 作用域），不要单独加载。
 */

  /* ---------------- 分享名片 ---------------- */

  const SHARE_FONT = '"PingFang SC","Microsoft YaHei","Segoe UI",system-ui,sans-serif';

  /* canvas 2d 在极老的浏览器 / 测试桩里可能不可用，先探一下 */
  function shareSupported() {
    try {
      const cv = document.createElement('canvas');
      return !!(cv && cv.getContext && cv.getContext('2d') && typeof cv.toDataURL === 'function');
    } catch (e) { return false; }
  }

  /* 名片上的数据：只取展示用的字段，不动 state */
  function shareCardData(s) {
    const lv = s.levels || {};
    const achMax = (G.ACH || []).reduce(function (n, a) { return n + (a.pts || 0); }, 0);
    const planted = (s.plots || []).filter(function (p) { return p && p.crop && G.CROPS[p.crop]; });
    const emojis = [];
    planted.forEach(function (p) {
      const e = G.CROPS[p.crop].emoji;
      if (emojis.indexOf(e) < 0) emojis.push(e);
    });
    return {
      day: s.day || 1,
      season: G.seasonOf(s.day || 1),
      weather: G.WEATHER[s.weather] || { emoji: '☀️', name: '晴天' },
      coins: Math.round(s.coins || 0),
      plots: (s.plots || []).length,
      farmLv: lv.farm || 1,
      fishLv: lv.fish || 1,
      achPts: G.achPts(s),
      achMax: achMax,
      harvests: (s.stats && s.stats.harvests) || 0,
      catches: (s.fishBook && s.fishBook.count) || 0,
      planted: planted.length,
      emojis: emojis.slice(0, 9),
      today: new Date()
    };
  }

  function shareRoundRect(c, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + rr, y);
    c.arcTo(x + w, y, x + w, y + h, rr);
    c.arcTo(x + w, y + h, x, y + h, rr);
    c.arcTo(x, y + h, x, y, rr);
    c.arcTo(x, y, x + w, y, rr);
    c.closePath();
  }

  function shareLabel(c, str, x, y, size, color, opts) {
    const o = opts || {};
    c.font = (o.weight || 700) + ' ' + size + 'px ' + SHARE_FONT;
    c.fillStyle = color;
    c.textAlign = o.align || 'left';
    c.textBaseline = 'alphabetic';
    c.fillText(str, x, y);
  }

  function shareDateText(d) {
    const p2 = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  }

  /* 画一张 720×980（2 倍高清）的名片，返回 canvas */
  function drawShareCard(d) {
    const W = 720, H = 980, S = 2;
    const cv = document.createElement('canvas');
    cv.width = W * S;
    cv.height = H * S;
    const c = cv.getContext('2d');
    c.scale(S, S);

    /* 背景：米色渐变 */
    const bg = c.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#fffaf0');
    bg.addColorStop(1, '#f0dfbe');
    c.fillStyle = bg;
    c.fillRect(0, 0, W, H);

    /* 顶部绿色横幅（下缘圆角） */
    const band = c.createLinearGradient(0, 0, W, 320);
    band.addColorStop(0, '#5aa86a');
    band.addColorStop(1, '#37794a');
    c.fillStyle = band;
    shareRoundRect(c, -40, -80, W + 80, 372, 44);
    c.fill();

    /* 装饰光圈 */
    c.globalAlpha = 0.12;
    c.fillStyle = '#ffffff';
    c.beginPath(); c.arc(W - 92, 40, 74, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(W - 178, 152, 32, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1;

    shareLabel(c, '🌾 我的小农场', 44, 72, 21, 'rgba(255,255,255,.94)', { weight: 700 });
    shareLabel(c, '第 ' + d.day + ' 天 · ' + d.season + '季', W - 44, 72, 19, 'rgba(255,255,255,.9)',
      { align: 'right', weight: 600 });

    shareLabel(c, '第 ' + d.day + ' 天的农场主', 44, 158, 44, '#ffffff', { weight: 800 });
    shareLabel(c, d.weather.emoji + ' ' + d.weather.name + ' · 已经种下 ' + d.planted + ' 块地',
      44, 202, 19, 'rgba(255,255,255,.88)', { weight: 600 });

    /* 金币卡 */
    c.save();
    c.shadowColor = 'rgba(102,78,44,.20)';
    c.shadowBlur = 26;
    c.shadowOffsetY = 10;
    shareRoundRect(c, 40, 246, W - 80, 156, 26);
    c.fillStyle = '#fffdf7';
    c.fill();
    c.restore();

    shareLabel(c, '💰 金币', 72, 292, 16, '#9a866c', { weight: 700 });
    c.font = '800 60px ' + SHARE_FONT;
    c.fillStyle = '#d9a32c';
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
    const coinsTxt = String(d.coins);
    c.fillText(coinsTxt, 70, 366);
    const coinW = c.measureText(coinsTxt).width;
    shareLabel(c, '金', 70 + coinW + 10, 366, 20, '#b98d2f', { weight: 700 });
    shareLabel(c, '成就 ' + d.achPts + ' 点', W - 72, 292, 15, '#9a866c', { align: 'right', weight: 700 });
    shareLabel(c, '土地 ' + d.plots + ' 块', W - 72, 366, 24, '#6d5b45', { align: 'right', weight: 800 });

    /* 六宫格数据 */
    const tiles = [
      ['🏞️ 土地', d.plots + ' 块'],
      ['🌱 种田', 'Lv' + d.farmLv],
      ['🎣 钓鱼', 'Lv' + d.fishLv],
      ['🏆 成就', d.achPts + ' / ' + d.achMax + ' 点'],
      ['🧺 累计收获', d.harvests + ' 次'],
      ['🐟 累计渔获', d.catches + ' 条']
    ];
    const gap = 16;
    const tw = (W - 80 - gap * 2) / 3;
    const th = 118;
    tiles.forEach(function (t, i) {
      const x = 40 + (i % 3) * (tw + gap);
      const y = 430 + Math.floor(i / 3) * (th + gap);
      c.save();
      c.shadowColor = 'rgba(102,78,44,.10)';
      c.shadowBlur = 14;
      c.shadowOffsetY = 4;
      shareRoundRect(c, x, y, tw, th, 20);
      c.fillStyle = 'rgba(255,253,247,.95)';
      c.fill();
      c.restore();
      c.strokeStyle = 'rgba(122,96,60,.12)';
      c.lineWidth = 1;
      shareRoundRect(c, x, y, tw, th, 20);
      c.stroke();
      shareLabel(c, t[0], x + 18, y + 40, 14, '#9a866c', { weight: 700 });
      shareLabel(c, t[1], x + 18, y + 86, t[1].length > 8 ? 21 : 27, '#3d3122', { weight: 800 });
    });

    /* 农场一角 */
    const y0 = 430 + 2 * (th + gap) + 48;
    shareLabel(c, '🌾 农场一角', 44, y0, 17, '#6d5b45', { weight: 700 });
    shareLabel(c, d.emojis.length ? d.emojis.join('  ') : '🌱 还没播种', 44, y0 + 58, 33, '#3d3122',
      { weight: 700 });

    /* 页脚 */
    c.strokeStyle = 'rgba(122,96,60,.16)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(44, 896);
    c.lineTo(W - 44, 896);
    c.stroke();
    shareLabel(c, '我的小农场 · GUI 版', 44, 932, 15, '#9a866c', { weight: 600 });
    shareLabel(c, shareDateText(d.today), W - 44, 932, 15, '#9a866c', { align: 'right', weight: 600 });

    return cv;
  }

  /* 不支持 canvas 时退回文字版名片 */
  function shareTextCard(d) {
    return '<div class="share-fallback">' +
      '<div class="share-fb-day">第 ' + d.day + ' 天 · ' + d.season + '季 · ' + d.weather.emoji + ' ' + d.weather.name + '</div>' +
      '<div class="share-fb-coins">💰 ' + d.coins + ' 金</div>' +
      '<div class="share-fb-grid">' +
        '<div><b>🏞️ ' + d.plots + ' 块</b><span>土地</span></div>' +
        '<div><b>🌱 Lv' + d.farmLv + '</b><span>种田</span></div>' +
        '<div><b>🎣 Lv' + d.fishLv + '</b><span>钓鱼</span></div>' +
        '<div><b>🏆 ' + d.achPts + '</b><span>成就点</span></div>' +
        '<div><b>🧺 ' + d.harvests + '</b><span>次收获</span></div>' +
        '<div><b>🐟 ' + d.catches + '</b><span>条渔获</span></div>' +
      '</div>' +
      '<div class="shop-tip">这个浏览器不支持导出图片，先看文字版名片。</div>' +
    '</div>';
  }

  function saveSharePng(cv, d) {
    const name = '小农场名片-D' + d.day + '-' + shareDateText(d.today) + '.png';
    const go = function (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () {
        if (String(url).indexOf('blob:') === 0 && window.URL && URL.revokeObjectURL) {
          URL.revokeObjectURL(url);
        }
      }, 100);
      toast('名片已保存 ⬇️', 'good');
    };
    try {
      if (cv.toBlob && window.URL && URL.createObjectURL) {
        cv.toBlob(function (blob) {
          if (blob) go(URL.createObjectURL(blob));
          else go(cv.toDataURL('image/png'));
        }, 'image/png');
      } else {
        go(cv.toDataURL('image/png'));
      }
    } catch (e) {
      toast('导出失败：这个浏览器不支持图片导出', 'bad');
    }
  }

  function shareCardModal() {
    const d = shareCardData(state);
    let cv = null;
    try { if (shareSupported()) cv = drawShareCard(d); } catch (e) { cv = null; }
    const body = cv
      ? '<div class="share-preview"><img alt="农场名片预览" src="' + cv.toDataURL('image/png') + '"></div>' +
        '<div class="shop-tip">图片在本机生成，不会上传任何数据。</div>'
      : shareTextCard(d);
    openModal('🖼️ 分享名片', body,
      '<button class="btn" data-close>关闭</button>' +
      (cv ? '<button class="btn primary" id="do-share-save">⬇️ 下载图片</button>' : ''),
      { onMount: function (root) {
          const btn = root && root.querySelector ? root.querySelector('#do-share-save') : null;
          if (btn && cv) btn.addEventListener('click', function () { saveSharePng(cv, d); });
        } });
  }

  /* 方便直接看效果 / 截图：我的小农场.html#share */
  if (typeof location !== 'undefined' && location.hash === '#share') {
    setTimeout(shareCardModal, 0);
  }
