/* Personal expression and precise inputs. No network, account or external assets. */
(function (root) {
  'use strict';
  const { analyzePersonality, eligibleIdentities } = typeof module === 'object' && module.exports ? require('./personality-rules.js') : root.CarPersonalityRules;
  const configs = {
    carPrice: { stops: [0, 30, 100, 300], steps: [0.5, 1, 5], max: 10000, precision: 2, unit: '万元', defaultValue: 15, ticks: ['0', '30', '100', '300 万'] },
    mileage: { stops: [0, 20000, 50000, 100000], steps: [500, 1000, 5000], max: 1000000, precision: 0, unit: '公里 / 年', defaultValue: 12500, ticks: ['0', '2 万', '5 万', '10 万'] }
  };
  function validateValue(id, raw) {
    const c = configs[id];
    if (String(raw).trim() === '') return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > c.max) return null;
    const scaled = n * 10 ** c.precision;
    return Math.abs(scaled - Math.round(scaled)) <= 1e-6 ? n : null;
  }
  function rangeToValue(id, position) {
    const c = configs[id], p = Math.max(0, Math.min(300, Number(position)));
    const i = Math.min(2, Math.floor(p / 100));
    const n = c.stops[i] + (p - i * 100) / 100 * (c.stops[i + 1] - c.stops[i]);
    return Math.min(c.stops[i + 1], Math.round(n / c.steps[i]) * c.steps[i]);
  }
  function valueToRange(id, value) {
    const stops = configs[id].stops;
    const v = Math.max(0, Math.min(stops[3], value));
    const i = v <= stops[1] ? 0 : v <= stops[2] ? 1 : 2;
    return i * 100 + (v - stops[i]) / (stops[i + 1] - stops[i]) * 100;
  }
  const SHARE_DESTINATION = 'https://cost.ahopig.com/';
  const themes = {
    forest: { name: '旷野绿', colors: ['#214D42', '#DDF17B', '#ECF0DE'] },
    violet: { name: '暮光紫', colors: ['#514271', '#E5D3FF', '#F4EEFA'] },
    sunset: { name: '落日橘', colors: ['#713F33', '#FFCD92', '#FAEEE0'] },
    ocean: { name: '海盐青', colors: ['#205860', '#ADF0DD', '#E8F4EC'] },
    blue: { name: '晴空蓝', colors: ['#274977', '#BFD9FF', '#EAF0F8'] },
    rose: { name: '莓果粉', colors: ['#733C56', '#FFD5E4', '#F8ECF1'] },
    mono: { name: '极简黑白', colors: ['#292D30', '#F0EEE6', '#E7E7E3'] }
  };
  const api = { themes, analyzePersonality, SHARE_DESTINATION, eligibleIdentities, rangeToValue, valueToRange, validateValue };
  if (typeof module === 'object' && module.exports) { module.exports = api; return; }

  const $id = id => document.getElementById(id);
  const values = { carPrice: 15, mileage: 12500 };
  const invalid = new Set();
  let dialog, canvas, snapshot, opener, oldOverflow, imageUrl, cardFile, generation = 0;
  document.addEventListener('page-theme-changed', () => { if (dialog?.open && snapshot) generateCard(); });
  let updateNicknameHint = () => {};

  function syncControls(id) {
    const c = configs[id], range = $id(id + 'Range');
    range.value = valueToRange(id, values[id]);
    range.setAttribute('aria-valuetext', values[id] + ' ' + c.unit);
    $id(id + 'Val').textContent = values[id] + (id === 'carPrice' ? ' 万' : ' km');
    const note = $id(id + 'Note');
    note.textContent = values[id] > c.stops[3] ? '超出滑块常用范围，按输入值计算' : '';
    $id(id).setAttribute('aria-invalid', 'false');
  }
  function updateShareValidity() {
    ['imageCardBtn', 'personalSave'].forEach(id => {
      const button = $id(id);
      if (button) button.disabled = invalid.size > 0;
    });
  }
  function setValue(id, raw, fromLink, preserveInput) {
    const value = validateValue(id, raw);
    if (value === null) {
      if (fromLink) {
        values[id] = configs[id].defaultValue;
        $id(id).value = values[id];
        invalid.delete(id);
        syncControls(id);
        $id(id + 'Note').textContent = '链接中的数值无效，已恢复默认值';
        updateShareValidity();
      }
      return false;
    }
    values[id] = value;
    if (!preserveInput) $id(id).value = value;
    invalid.delete(id);
    syncControls(id);
    updateShareValidity();
    return true;
  }
  function bindInput(id) {
    const input = $id(id), range = $id(id + 'Range'), c = configs[id];
    const report = () => {
      invalid.add(id);
      input.setAttribute('aria-invalid', 'true');
      $id(id + 'Note').textContent = '请输入 0～' + c.max.toLocaleString('zh-CN') + ' ' + c.unit + (c.precision ? '，最多两位小数' : '，限整数') + '；结果保留最近有效值';
      updateShareValidity();
    };
    input.addEventListener('input', () => {
      if (validateValue(id, input.value) === null) report();
      else { setValue(id, input.value, false, true); render(); }
    });
    input.addEventListener('blur', () => { if (!setValue(id, input.value)) report(); });
    input.addEventListener('keydown', event => { if (event.key === 'Enter') input.blur(); });
    range.addEventListener('input', () => { setValue(id, rangeToValue(id, range.value)); render(); });
    syncControls(id);
  }

  function createDialog() {
    dialog = document.createElement('dialog');
    dialog.id = 'personalShareDialog';
    dialog.className = 'personal-share';
    dialog.setAttribute('aria-labelledby', 'personalShareTitle');
    dialog.innerHTML = `<header class="personal-header"><div><span class="personal-eyebrow">MY CAR PERSONALITY</span><h2 id="personalShareTitle">我的用车人格</h2></div><button type="button" class="personal-close" aria-label="关闭揭晓用车人格" autofocus>×</button></header>
      <div class="personal-themes" role="group" aria-label="卡片主题色"><span>换个心情色</span><div id="personalThemeDots"></div></div>
      <div class="personal-preview"><canvas id="personalCardCanvas" width="1080" height="1920" hidden></canvas><div class="personal-card-surface"><img class="personal-export" alt="正在生成我的人格卡片" hidden><input id="cardNickname" class="personal-inline-nickname" autocomplete="nickname" aria-label="编辑卡片昵称" maxlength="32" hidden></div><p id="personalSaveStatus" role="status">正在生成我的专属用车人格卡片…</p></div>
      <footer class="personal-footer"><span>把我的用车人格晒出去<br><small>也让朋友测测 TA 的</small></span><div class="personal-actions"><button type="button" id="personalSave" class="personal-save" disabled>保存图片</button><button type="button" id="personalNativeShare" class="personal-native" hidden>分享卡片</button></div></footer>`;
    document.body.appendChild(dialog);
    canvas = $id('personalCardCanvas');
    $id('cardNickname').value = root.VisitorProfile.nickname;
    const nickname = $id('cardNickname');
    const surface = dialog.querySelector('.personal-card-surface');
    const hint = document.createElement('button'); hint.type = 'button'; hint.className = 'personal-name-hint';
    hint.innerHTML = '<span>怎么称呼你？</span><svg viewBox="0 0 92 40" aria-hidden="true"><path d="M67 5l8 8-17 17-10 2 2-10zM52 20l8 8M39 12C15 4 8 21 21 31m-8-2 8 2-1-8"/></svg>';
    hint.setAttribute('aria-label', '修改卡片昵称'); surface.append(hint);
    updateNicknameHint = () => { let custom = false; try { custom = localStorage.getItem('costcalc:nickname-custom') === '1'; } catch {} hint.hidden = custom; };
    hint.addEventListener('click', () => { nickname.focus(); nickname.select(); });
    nickname.addEventListener('focus', () => nickname.select());
    let nicknameTimer;
    const saveNickname = () => {
      clearTimeout(nicknameTimer);
      if (nickname.value === root.VisitorProfile.nickname) return;
      if (root.VisitorProfile.setNickname(nickname.value)) { hint.hidden = true; generateCard(); }
    };
    nickname.addEventListener('input', event => {
      if (!event.isComposing) { clearTimeout(nicknameTimer); nicknameTimer = setTimeout(saveNickname, 450); }
    });
    nickname.addEventListener('compositionend', () => { clearTimeout(nicknameTimer); nicknameTimer = setTimeout(saveNickname, 450); });
    nickname.addEventListener('blur', () => { saveNickname(); nickname.value = root.VisitorProfile.nickname; });
    nickname.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.isComposing) { event.preventDefault(); nickname.blur(); } });
    Object.entries(themes).forEach(([id, theme]) => {
      const button = document.createElement('button');
      button.type = 'button'; button.dataset.theme = id;
      button.title = theme.name; button.setAttribute('aria-label', theme.name);
      button.style.setProperty('--swatch', theme.colors[0]);
      button.style.setProperty('--swatch-pop', theme.colors[1]);
      button.addEventListener('click', () => { root.PageTheme.apply(id); });
      $id('personalThemeDots').appendChild(button);
    });
    dialog.querySelector('.personal-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => {
      document.body.style.overflow = oldOverflow;
      if (opener) opener.focus();
    });
    $id('personalSave').addEventListener('click', () => {
      if (!cardFile || invalid.size) return;
      const link = document.createElement('a');
      link.href = imageUrl; link.download = cardFile.name;
      document.body.appendChild(link); link.click(); link.remove();
      document.dispatchEvent(new Event('personal-card-saved'));
      $id('personalSaveStatus').textContent = '图片已保存；若未自动下载，可长按卡片保存。';
    });
    $id('personalNativeShare').addEventListener('click', async () => {
      if (!cardFile || invalid.size) return;
      const button = $id('personalNativeShare');
      button.disabled = true;
      try {
        await navigator.share({ files: [cardFile], title: '我的用车人格是' + snapshot.analysis.identity.name });
        document.dispatchEvent(new Event('personal-card-shared'));
        $id('personalSaveStatus').textContent = '我的用车人格，已经出发。';
      } catch (error) {
        $id('personalSaveStatus').textContent = error.name === 'AbortError' ? '分享已取消，卡片还在这里。' : '当前无法直接分享，可保存图片后发送给朋友。';
      } finally { button.disabled = false; }
    });
  }

  function open() {
    if (invalid.size) { showToast('请先修正车价和里程输入'); return; }
    document.dispatchEvent(new Event('calculation-viewed'));
    if (!dialog) createDialog();
    const d = readInputs(), r = calculate(d);
    snapshot = { d, r, analysis: analyzePersonality(d, r, currentType) };
    opener = document.activeElement;
    oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    dialog.scrollTop = 0;
    generateCard();
  }

  function generateCard() {
    const token = ++generation;
    const { d, r, analysis } = snapshot;
    const themeId = document.documentElement.dataset.theme || 'blue';
    dialog.querySelectorAll('[data-theme]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.theme === themeId)));
    cardFile = null;
    const image = dialog.querySelector('.personal-export');
    if (!image.src) image.hidden = true;
    $id('personalSave').disabled = true;
    $id('personalNativeShare').hidden = true;
    $id('personalSaveStatus').textContent = '正在生成我的专属用车人格卡片…';
    try {
      drawCard(canvas, d, r, analysis, themeId);
      canvas.toBlob(blob => {
        if (token !== generation) return;
        if (!blob) { $id('personalSaveStatus').textContent = '图片生成失败，请关闭后重试。'; return; }
        if (imageUrl) URL.revokeObjectURL(imageUrl);
        imageUrl = URL.createObjectURL(blob);
        cardFile = new File([blob], '我的用车人格-' + snapshot.analysis.identity.name + '.png', { type: 'image/png' });
        image.src = imageUrl;
        image.alt = canvas.getAttribute('aria-label') + ' 可长按保存。';
        image.hidden = false;
        const nickname = $id('cardNickname');
        nickname.hidden = false;
        nickname.style.color = themes[themeId].colors[2];
        nickname.style.backgroundColor = themes[themeId].colors[0];
        const nameWidth = Math.min(650, Math.max(130, Number(canvas.dataset.nicknameWidth)));
        nickname.style.width = (nameWidth / 1080 * 100) + '%';
        dialog.querySelector('.personal-card-surface').style.setProperty('--name-hint-color', themes[themeId].colors[1]);
        updateNicknameHint();
        if (document.activeElement !== nickname) nickname.value = root.VisitorProfile.nickname;
        $id('personalSave').disabled = false;
        let canShare = false;
        try { canShare = !!(navigator.share && navigator.canShare && navigator.canShare({ files: [cardFile] })); } catch (_) { /* Save remains available. */ }
        $id('personalNativeShare').hidden = !canShare;
        $id('personalSaveStatus').textContent = themes[themeId].name + ' · 可长按图片保存';
        root.VisitorProfile.revealed = true;
        document.dispatchEvent(new Event('personal-card-generated'));
      }, 'image/png');
    } catch (_) { $id('personalSaveStatus').textContent = '图片生成失败，请刷新页面重试。'; }
  }

  function drawCard(target, d, r, analysis, themeId) {
    const { identity, tags, comment } = analysis;
    const ctx = target.getContext('2d');
    const [ink, pop, paper] = themes[themeId].colors;
    const font = '"Microsoft YaHei", "PingFang SC", sans-serif';
    const text = (str, x, y, size, color = ink, weight = 500, width = 920) => {
      ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      let actual = size;
      do { ctx.font = weight + ' ' + actual + 'px ' + font; if (ctx.measureText(str).width <= width) break; } while (--actual > 14);
      ctx.fillText(str, x, y);
    };
    const box = (x, y, w, h, radius, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fill(); };
    const stroke = (x, y, x2, y2, color, width = 2) => { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke(); };
    const wrap = (str, x, y, size, width, leading, color = ink) => {
      ctx.font = '500 ' + size + 'px ' + font; ctx.fillStyle = color; ctx.textAlign = 'left';
      let row = '', cursor = y;
      for (const char of Array.from(str)) {
        if (row && ctx.measureText(row + char).width > width && !/[，。！？、；：]/.test(char)) { ctx.fillText(row, x, cursor); row = ''; cursor += leading; }
        row += char;
      }
      if (row) ctx.fillText(row, x, cursor);
    };
    ctx.fillStyle = paper; ctx.fillRect(0, 0, 1080, 1920);
    box(40, 40, 1000, 1840, 38, '#FFFEF7');
    box(40, 40, 1000, 740, 38, ink);
    ctx.fillStyle = ink; ctx.fillRect(40, 700, 1000, 80);
    text('用 车 人 格 报 告', 94, 119, 29, pop, 700);
    text('MY CAR PERSONALITY', 650, 117, 19, pop, 600, 330);
    stroke(94, 154, 986, 154, pop);
    const nickname = root.VisitorProfile ? root.VisitorProfile.nickname : '我';
    text(nickname, 94, 222, 38, '#FFFEF7', 700, 650);
    const nicknameWidth = ctx.measureText(nickname).width;
    target.dataset.nicknameWidth = String(nicknameWidth);
    ctx.strokeStyle = '#FFFEF7'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(94, 232); ctx.quadraticCurveTo(94 + nicknameWidth / 2, 235, 94 + nicknameWidth, 231); ctx.stroke();
    text(identity.name, 86, 351, 112, pop, 800);
    wrap(identity.declaration, 94, 418, 32, 860, 48, '#FFFEF7');

    // A playful road trip badge: car silhouette, rolling wheels and a destination star.
    ctx.save(); ctx.translate(592, 501); ctx.rotate(-0.07);
    ctx.strokeStyle = pop; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-180, 143); ctx.bezierCurveTo(-20, 80, 150, 200, 342, 114); ctx.stroke();
    ctx.setLineDash([14, 16]); ctx.globalAlpha = .45;
    ctx.beginPath(); ctx.moveTo(-180, 168); ctx.bezierCurveTo(-20, 105, 150, 225, 342, 139); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    box(-35, 60, 245, 76, 25, pop);
    ctx.beginPath(); ctx.moveTo(8, 63); ctx.lineTo(48, 7); ctx.quadraticCurveTo(57, -5, 80, -5); ctx.lineTo(125, -5); ctx.quadraticCurveTo(146, -5, 158, 10); ctx.lineTo(194, 63); ctx.closePath(); ctx.fillStyle = pop; ctx.fill();
    ctx.fillStyle = ink; ctx.beginPath(); ctx.moveTo(59, 12); ctx.lineTo(44, 48); ctx.lineTo(95, 48); ctx.lineTo(95, 12); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(108, 12); ctx.lineTo(108, 48); ctx.lineTo(165, 48); ctx.lineTo(139, 12); ctx.closePath(); ctx.fill();
    [20, 158].forEach(x => { ctx.beginPath(); ctx.arc(x, 135, 27, 0, Math.PI * 2); ctx.fillStyle = '#FFFEF7'; ctx.fill(); ctx.beginPath(); ctx.arc(x, 135, 13, 0, Math.PI * 2); ctx.fillStyle = ink; ctx.fill(); });
    stroke(270, 7, 270, 49, pop, 5); stroke(249, 28, 291, 28, pop, 5);
    ctx.restore();
    text('为什么是我？', 94, 534, 22, pop);
    wrap(analysis.reason, 94, 573, 22, 400, 31, '#FFFEF7');
    tags.forEach((tag, i) => { const x = 94 + i * 301; box(x, 704, 284, 48, 24, pop); text(tag, x + 19, 736, 21, ink, 600, 247); });

    text('我的车，每周预计花', 94, 856, 29, ink, 600);
    text('¥' + fmt(r.weekTotal), 86, 990, 129, ink, 800, 890);
    text('年度预计总成本', 94, 1057, 23, '#6A736C');
    text('每公里综合成本', 573, 1057, 23, '#6A736C');
    text('¥' + fmt(r.yearTotal), 94, 1114, 41, ink, 700, 428);
    text(d.mileage > 0 ? '¥' + fmt2(r.perKm) : '暂无 · 尚未行驶', 573, 1114, 39, ink, 700, 413);
    box(80, 1161, 920, 236, 24, paper);
    const top = r.items.filter(item => item.value > 0).sort((a, b) => b.value - a.value)[0];
    text('我的最大开销', 108, 1210, 23, ink, 600);
    text(top ? LABELS[top.key] : '账单待补充', 108, 1280, 43, ink, 800, 410);
    text(top ? '预计 ¥' + fmt(top.value) + '/年' : '填写完整参数后再看', 510, 1280, 32, ink, 700, 450);
    text(top && r.yearTotal > 0 ? '占年度总成本 ' + Math.round(top.value / r.yearTotal * 100) + '%' : '当前未计入费用', 108, 1345, 24, ink, 500, 860);

    // Ticket perforation separates the personal result from the invitation to friends.
    ctx.setLineDash([10, 10]); stroke(80, 1451, 1000, 1451, '#C8CEC4', 2); ctx.setLineDash([]);
    for (const x of [40, 1040]) { ctx.fillStyle = paper; ctx.beginPath(); ctx.arc(x, 1451, 21, 0, Math.PI * 2); ctx.fill(); }
    text('你的用车人格是什么？', 94, 1541, 47, ink, 800, 610);
    text('扫码测测，看看我们是不是同路人。', 94, 1599, 27, ink, 500, 620);
    box(94, 1640, 540, 57, 28, pop);
    text('不用登录 · 调好参数 · 一键揭晓', 118, 1677, 23, ink, 700, 493);
    text('cost.ahopig.com', 94, 1742, 26, ink, 700);
    const qr = qrcode(0, 'M'); qr.addData(SHARE_DESTINATION, 'Byte'); qr.make();
    const count = qr.getModuleCount(), cell = 6, quiet = 4;
    const side = (count + quiet * 2) * cell, qx = 746, qy = 1510;
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(qx, qy, side, side);
    ctx.fillStyle = '#14251F';
    for (let row = 0; row < count; row++) for (let col = 0; col < count; col++) if (qr.isDark(row, col)) ctx.fillRect(qx + (col + quiet) * cell, qy + (row + quiet) * cell, cell, cell);
    text('长按识别', qx + 53, qy + side + 30, 20, ink, 500, side);
    text('测测你的用车人格', qx + 13, qy + side + 58, 20, ink, 500, side + 10);
    text('基于填写参数的趣味归类，不代表真实驾驶记录或人群排名', 94, 1812, 19, '#798276', 400, 890);
    text('费用为估算，含折旧与资金机会成本', 94, 1844, 19, '#798276');
    target.dataset.identity = identity.id;
    target.dataset.theme = themeId;
    target.setAttribute('aria-label', '我是' + identity.name + '。' + identity.declaration + ' 我的车每周预计花 ' + fmt(r.weekTotal) + ' 元。' + comment + ' 你的用车人格是什么？扫码测测。');
  }
  root.PersonalCarShare = Object.assign(api, { open, bindInput, setValue, value: id => values[id], hasInvalid: () => invalid.size > 0 });
})(typeof window === 'object' ? window : globalThis);
