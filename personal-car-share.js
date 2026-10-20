/* Personal expression and precise inputs. No network, account or external assets. */
(function (root) {
  'use strict';
  const identityList = [
    { id: 'explorer', name: '远方探索家', declaration: '世界那么大，我想亲自开过去看看。', color: '#285E76', paper: '#F3F5ED', motif: 'route', match: d => d.mileage >= 25000 },
    { id: 'freedom', name: '自在随行家', declaration: '不必天天出发，但想走的时候，我有答案。', color: '#786039', paper: '#FAF4E8', motif: 'compass', match: d => d.mileage < 8000 },
    { id: 'companion', name: '长情伙伴', declaration: '陪我走得久，才算真的合拍。', color: '#89604E', paper: '#F9F0E9', motif: 'route', match: d => d.depYears >= 8 },
    { id: 'saver', name: '精打细算家', declaration: '每一公里的快乐，都要花得漂亮。', color: '#387364', paper: '#F0F5ED', motif: 'compass', match: (d, r) => d.mileage >= 8000 && r.perKm > 0 && r.perKm <= 1 },
    { id: 'everyday', name: '日常同行家', declaration: '我的生活半径，由我自己拓宽。', color: '#466A9A', paper: '#F2F3EF', motif: 'route', match: () => true }
  ];
  const configs = {
    carPrice: { stops: [0, 30, 100, 300], steps: [0.5, 1, 5], max: 10000, precision: 2, unit: '万元', defaultValue: 15, ticks: ['0', '30', '100', '300 万'] },
    mileage: { stops: [0, 20000, 50000, 100000], steps: [500, 1000, 5000], max: 1000000, precision: 0, unit: '公里 / 年', defaultValue: 12500, ticks: ['0', '2 万', '5 万', '10 万'] }
  };
  function eligibleIdentities(d, r) { return identityList.filter(item => item.match(d, r)); }
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
  const api = { eligibleIdentities, rangeToValue, valueToRange, validateValue };
  if (typeof module === 'object' && module.exports) { module.exports = api; return; }

  const $id = id => document.getElementById(id);
  const values = { carPrice: 15, mileage: 12500 };
  const invalid = new Set();
  let dialog, canvas, selection, snapshot, opener, oldOverflow, customDeclaration = false;
  const moods = ['算完吓一跳，原来我的车这么能花。', '认真算过，养你还挺划算。', '是笔开销，也是我的快乐。', '心里有数，继续出发。'];

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
    ['imageCardBtn', 'shareBtn', 'personalSave'].forEach(id => {
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
    dialog.innerHTML = `
      <header class="personal-header"><div><span class="personal-eyebrow">MY CAR, MY STORY</span><h2 id="personalShareTitle">这张账单，主角是我</h2></div><button type="button" class="personal-close" aria-label="关闭分享预览" autofocus>×</button></header>
      <div class="personal-body"><div class="personal-preview"><canvas id="personalCardCanvas" width="1080" height="1920" role="img" aria-label="我的用车人格卡预览"></canvas><span class="personal-preview-note">我的用车人格卡 · 9:16</span></div>
      <section class="personal-editor" aria-label="定制我的分享卡">
        <div class="personal-step">01 / 认领我的身份</div><p class="personal-intro">一种用车方式，一种属于我的生活。</p><div id="personalIdentities" class="personal-identities" role="group" aria-label="可认领的身份"></div><p id="personalReason" class="personal-reason" aria-live="polite"></p>
        <label class="personal-step" for="personalDeclaration">02 / 我的宣言</label><textarea id="personalDeclaration" rows="3" placeholder="用一句话，说说我和车的故事" aria-describedby="personalDeclarationCount"></textarea><span class="personal-count" id="personalDeclarationCount">0 / 40</span>
        <label class="personal-step" for="personalMood">03 / 算完的心情 <span>选填</span></label><div id="personalMoods" class="personal-moods" role="group" aria-label="选择心情"></div><textarea id="personalMood" rows="2" placeholder="也可以自己写一句，或留白" aria-describedby="personalMoodCount"></textarea><span class="personal-count" id="personalMoodCount">0 / 30</span>
        <p class="personal-privacy">只用本页参数生成，不上传个人数据。身份是趣味表达，不是驾驶评级。</p>
      </section></div><footer class="personal-footer"><span id="personalSaveStatus" role="status">认领一种身份，带走我的故事。</span><button type="button" id="personalSave" class="btn btn-primary">保存我的图片</button></footer>`;
    document.body.appendChild(dialog);
    canvas = $id('personalCardCanvas');
    dialog.querySelector('.personal-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target === dialog) {
        const box = dialog.getBoundingClientRect();
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
      }
    });
    dialog.addEventListener('close', () => { document.body.style.overflow = oldOverflow; if (opener) opener.focus(); });
    ['personalDeclaration', 'personalMood'].forEach(id => {
      const input = $id(id), limit = id === 'personalDeclaration' ? 40 : 30;
      input.addEventListener('input', event => {
        if (event.isComposing) return;
        const normalized = Array.from(input.value.replace(/[\r\n]+/g, ' ')).slice(0, limit).join('');
        if (input.value !== normalized) input.value = normalized;
        if (id === 'personalDeclaration') customDeclaration = true;
        drawPreview();
      });
      input.addEventListener('compositionend', () => input.dispatchEvent(new Event('input')));
    });
    const moodContainer = $id('personalMoods');
    ['', ...moods].forEach(mood => {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = mood || '留白，也很好';
      button.dataset.mood = mood;
      button.addEventListener('click', () => { $id('personalMood').value = mood; drawPreview(); });
      moodContainer.appendChild(button);
    });
    $id('personalSave').addEventListener('click', () => {
      if (invalid.size) return;
      $id('personalSave').disabled = true;
      canvas.toBlob(blob => {
        $id('personalSave').disabled = invalid.size > 0;
        if (!blob) { $id('personalSaveStatus').textContent = '图片生成失败，请重试'; return; }
        document.dispatchEvent(new Event('personal-card-generated'));
        const url = URL.createObjectURL(blob), link = document.createElement('a');
        link.href = url; link.download = '我的用车人格卡-' + selection.name + '.png';
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        $id('personalSaveStatus').textContent = '图片已生成；若未自动保存，可长按预览图片保存。';
        // A real image also enables long-press saving on mobile browsers.
        let image = dialog.querySelector('.personal-export');
        if (!image) { image = document.createElement('img'); image.className = 'personal-export'; image.alt = '已生成的用车人格卡，可长按保存'; dialog.querySelector('.personal-preview').prepend(image); }
        if (image.dataset.url) URL.revokeObjectURL(image.dataset.url);
        image.src = URL.createObjectURL(blob); image.dataset.url = image.src;
        canvas.hidden = true;
      }, 'image/png');
    });
  }
  function reason(identity, d, r) {
    if (identity.id === 'explorer' || identity.id === 'freedom') return '按你填写的每年 ' + fmt(d.mileage) + ' 公里推荐';
    if (identity.id === 'companion') return '按你计划持有 ' + d.depYears + ' 年推荐';
    if (identity.id === 'saver') return '按当前测算每公里 ¥' + fmt2(r.perKm) + ' 推荐';
    return '每个人都可以认领：车是日常的同行伙伴';
  }
  function open() {
    if (invalid.size) { showToast('请先修正车价和里程输入'); return; }
    if (!dialog) createDialog();
    snapshot = { d: readInputs() };
    snapshot.r = calculate(snapshot.d);
    const eligible = eligibleIdentities(snapshot.d, snapshot.r);
    const changed = selection && !eligible.some(item => item.id === selection.id);
    selection = eligible.find(item => selection && item.id === selection.id) || eligible[0];
    const container = $id('personalIdentities'); container.replaceChildren();
    eligible.forEach(identity => {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = identity.name; button.dataset.identity = identity.id;
      button.addEventListener('click', () => {
        selection = identity;
        if (!customDeclaration) $id('personalDeclaration').value = selection.declaration;
        drawPreview();
      });
      container.appendChild(button);
    });
    if (!customDeclaration) $id('personalDeclaration').value = selection.declaration;
    $id('personalSaveStatus').textContent = changed ? '参数已变化，为你重新推荐了身份。' : '认领一种身份，带走我的故事。';
    opener = document.activeElement;
    oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    updateShareValidity(); drawPreview(); dialog.showModal();
  }

  function drawPreview() {
    const { d, r } = snapshot;
    $id('personalReason').textContent = reason(selection, d, r);
    dialog.querySelectorAll('[data-identity]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.identity === selection.id)));
    dialog.querySelectorAll('[data-mood]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mood === $id('personalMood').value)));
    ['personalDeclaration', 'personalMood'].forEach(id => { $id(id + 'Count').textContent = Array.from($id(id).value).length + ' / ' + (id === 'personalDeclaration' ? 40 : 30); });
    const image = dialog.querySelector('.personal-export');
    if (image) { URL.revokeObjectURL(image.dataset.url); image.remove(); }
    canvas.hidden = false;
    drawCard(canvas, d, r, selection, $id('personalDeclaration').value, $id('personalMood').value);
  }
  function drawCard(target, d, r, identity, declaration, mood) {
    const ctx = target.getContext('2d'), accent = identity.color, ink = '#26342F', muted = '#69746D';
    const font = '"Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = identity.paper; ctx.fillRect(0, 0, 1080, 1920);
    const text = (str, x, y, size, color = ink, weight = 400, maxWidth = 920) => {
      ctx.fillStyle = color; let actualSize = size;
      do { ctx.font = weight + ' ' + actualSize + 'px ' + font; if (ctx.measureText(str).width <= maxWidth) break; actualSize--; } while (actualSize > 14);
      ctx.fillText(str, x, y);
    };
    const line = (x, y, x2, y2, color = '#D6DCCD') => { ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke(); };
    const wrap = (str, x, y, size, width, leading) => {
      ctx.font = '500 ' + size + 'px ' + font; ctx.fillStyle = ink;
      let row = '', cursor = y;
      for (const char of Array.from(str)) {
        if (row && ctx.measureText(row + char).width > width) { ctx.fillText(row, x, cursor); row = ''; cursor += leading; }
        row += char;
      }
      if (row) ctx.fillText(row, x, cursor);
    };
    // Quiet, printed-paper details and a small personal travel emblem.
    ctx.globalAlpha = 0.16; ctx.fillStyle = accent;
    for (let y = 20; y < 1920; y += 23) for (let x = 19; x < 1080; x += 29) ctx.fillRect(x, y, 1, 1);
    ctx.globalAlpha = 1;
    text('MY CAR / MY STORY', 80, 112, 24, accent, 700);
    text('我的用车人格', 80, 171, 27, muted);
    ctx.save(); ctx.translate(906, 150); ctx.strokeStyle = accent; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 54, 0, Math.PI * 2); ctx.stroke();
    if (identity.motif === 'compass') {
      ctx.beginPath(); ctx.moveTo(0, -35); ctx.lineTo(16, 15); ctx.lineTo(0, 6); ctx.lineTo(-16, 15); ctx.closePath(); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(-26, 24); ctx.bezierCurveTo(50, 25, -40, -25, 25, -25); ctx.stroke();
      ctx.beginPath(); ctx.arc(25, -25, 5, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    text('我是', 80, 273, 42, ink, 500);
    text(identity.name, 74, 393, 104, accent, 800);
    wrap(declaration || identity.declaration, 80, 475, 34, 900, 51);
    let badges = currentType === 'ev' ? '电力出行' : '燃油搭子';
    if (d.depYears >= 8 && identity.id !== 'companion') badges += '   /   计划长久相伴';
    text(badges, 80, 625, 25, accent, 500);
    line(80, 667, 1000, 667);
    let evidence = '我计划一年开 ' + fmt(d.mileage) + ' 公里';
    if (identity.id === 'companion') evidence = '我计划和这辆车相伴 ' + d.depYears + ' 年';
    if (identity.id === 'saver') evidence = '我每公里的综合成本，预计 ¥' + fmt2(r.perKm);
    text(evidence, 80, 724, 27, muted);
    text('我的车，每周预计花', 80, 805, 33, ink, 600);
    text('¥' + fmt(r.weekTotal), 72, 958, 142, accent, 800, 920);
    text('年度预计总成本', 80, 1041, 25, muted);
    text('每公里综合成本', 586, 1041, 25, muted);
    text('¥' + fmt(r.yearTotal), 80, 1105, 47, ink, 700, 450);
    text(d.mileage > 0 ? '¥' + fmt2(r.perKm) : '暂无 · 尚未行驶', 586, 1105, 43, ink, 700, 414);
    line(80, 1162, 1000, 1162);
    text('我的钱花在哪', 80, 1231, 31, ink, 700);
    text('预计 / 年', 862, 1231, 21, muted);
    const sorted = r.items.filter(item => item.value > 0).sort((a, b) => b.value - a.value);
    const rows = sorted.slice(0, 3);
    if (sorted.length > 3) rows.push({ key: 'other', value: sorted.slice(3).reduce((sum, item) => sum + item.value, 0) });
    if (!rows.length) text('当前未计入费用', 80, 1330, 30, muted);
    rows.forEach((item, index) => {
      const y = 1305 + index * 82;
      text(item.key === 'other' ? '其他' : LABELS[item.key], 80, y, 25, ink, 500, 230);
      ctx.fillStyle = '#DDE2D6'; ctx.fillRect(325, y - 17, 340, 7);
      ctx.fillStyle = accent; ctx.fillRect(325, y - 17, r.yearTotal > 0 ? 340 * item.value / r.yearTotal : 0, 7);
      text('¥' + fmt(item.value), 720, y, 26, ink, 600, 280);
    });
    line(80, 1610, 1000, 1610);
    if (mood) { text('此刻，我想说', 80, 1667, 22, muted); wrap(mood, 80, 1724, 34, 900, 50); }
    else { text('把账算清，把生活开成自己喜欢的样子。', 80, 1718, 30, accent, 500); }
    text('按填写参数估算，含折旧与资金机会成本', 80, 1830, 21, muted);
    line(80, 1854, 1000, 1854);
    text('车辆成本计算器 · 我的用车账单', 80, 1898, 20, muted);
    text('cost.ahopig.com', 793, 1898, 20, muted, 400, 207);
    target.setAttribute('aria-label', '我是' + identity.name + '。' + (declaration || identity.declaration) + ' 我的车每周预计花 ' + fmt(r.weekTotal) + ' 元。' + mood);
  }
  root.PersonalCarShare = Object.assign(api, {
    open, bindInput, setValue, value: id => values[id], hasInvalid: () => invalid.size > 0
  });
})(typeof window === 'object' ? window : globalThis);
