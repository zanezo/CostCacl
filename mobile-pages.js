// Reuse actual controls so paging never duplicates calculation state.
(() => {
  const media = matchMedia('(max-width: 959px)');
  let shell, panels, dots, current = 0, stage = 'config', originals = [], start;
  const names = ['车辆信息', '日常开销', '长期成本', '费用总览', '费用明细', '打车参考'];
  function select(index, focus = false) {
    current = Math.max(stage === 'config' ? 0 : 3, Math.min(stage === 'config' ? 2 : 5, index));
    panels.forEach((panel, i) => {
      panel.dataset.position = i < current ? 'before' : i > current ? 'after' : 'active';
      panel.inert = i !== current;
      panel.setAttribute('aria-hidden', String(i !== current));
      panel.style.setProperty('--distance', Math.min(3, Math.abs(i - current)));
      panel.style.visibility = (stage === 'config' ? i < 3 : i >= 3) && Math.abs(i - current) <= 1 ? 'visible' : 'hidden';
    });
    dots.forEach((dot, i) => { dot.setAttribute('aria-current', String(i === current)); dot.hidden = stage === 'config' ? i >= 3 : i < 3; });
    shell.querySelector('.mobile-deck-title').textContent = names[current];
    shell.querySelector('.mobile-deck-count').textContent = String(current % 3 + 1).padStart(2, '0') + ' / 3';
    shell.dataset.stage = stage;
    shell.querySelector('.mobile-phase').textContent = stage === 'config' ? '01 / 配置我的车' : '02 / 看懂我的账';
    shell.querySelector('.mobile-calculate').disabled = PersonalCarShare.hasInvalid();
    if (focus) dots[current].focus();
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }
  function mount() {
    if (shell || !media.matches) return;
    const wrap = document.querySelector('.wrap'), groups = [...document.querySelectorAll('details.group')];
    if (groups.length !== 3) return;
    shell = document.createElement('section'); shell.className = 'mobile-pages';
    shell.setAttribute('aria-label', '用车成本卡片');
    shell.innerHTML = '<header class="mobile-deck-heading"><span class="mobile-deck-title"></span><span class="mobile-deck-count" aria-live="polite"></span></header><div class="mobile-deck"></div><nav class="mobile-deck-dots" aria-label="选择成本卡片"></nav>';
    shell.insertAdjacentHTML('afterbegin', '<div class="mobile-phase"></div>');
    wrap.appendChild(shell);
    shell.addEventListener('input', () => {
      shell.querySelector('.mobile-calculate').disabled = PersonalCarShare.hasInvalid();
    });
    panels = names.map((name, i) => {
      const panel = document.createElement('section'); panel.className = 'mobile-page-panel'; panel.id = 'mobilePanel' + i;
      panel.setAttribute('aria-label', name); panel.setAttribute('role', 'group'); panel.setAttribute('aria-roledescription', '卡片');
      const grip = document.createElement('div'); grip.className = 'mobile-card-grip'; grip.setAttribute('aria-hidden', 'true');
      const inner = document.createElement('div'); inner.className = 'mobile-card-content'; panel.appendChild(inner); panel.appendChild(grip);
      shell.querySelector('.mobile-deck').appendChild(panel); return panel;
    });
    dots = names.map((name, i) => {
      const dot = document.createElement('button'); dot.type = 'button'; dot.setAttribute('aria-label', name + '，第' + (i + 1) + '张');
      dot.addEventListener('click', () => select(i)); shell.querySelector('nav').appendChild(dot); return dot;
    });
    const move = (node, page) => {
      const marker = document.createComment('mobile-original'); node.before(marker); originals.push([node, marker]);
      panels[page].firstChild.appendChild(node);
    };
    move(document.querySelector('#typeSegment').closest('.card'), 0); move(groups[0], 0);
    const fixedRows = [...groups[1].querySelectorAll('.group-body > .row')];
    move(groups[1], 1);
    const long = document.createElement('div'); long.className = 'mobile-long-cost';
    long.innerHTML = '<h3>长期成本</h3>'; panels[2].firstChild.appendChild(long);
    fixedRows.slice(3).forEach(row => {
      const marker = document.createComment('mobile-original'); row.before(marker); originals.push([row, marker]); long.appendChild(row);
    });
    move(groups[2], 1);
    move(document.querySelector('.hero'), 3); move(document.querySelector('.chart-card'), 3);
    move(document.querySelector('.detail-card'), 4); move(document.querySelector('.taxi-card'), 5);
    const calculateAction = document.createElement('div'); calculateAction.className = 'mobile-card-actions';
    calculateAction.innerHTML = '<span class="mobile-action-caption">准备好了，就出发</span><button type="button" class="mobile-calculate">开始测算 <span aria-hidden="true">↗</span></button>';
    panels[2].firstChild.appendChild(calculateAction);
    calculateAction.querySelector('button').addEventListener('click', () => {
      if (PersonalCarShare.hasInvalid()) return;
      render(); stage = 'results'; select(3);
      document.dispatchEvent(new Event('calculation-viewed'));
    });
    const resultActions = document.createElement('div'); resultActions.className = 'mobile-card-actions mobile-result-actions';
    resultActions.innerHTML = '<span class="mobile-action-caption">账算清了，看看我的另一面</span><div><button type="button" class="mobile-refill">重新填写</button><button type="button" class="mobile-reveal">揭晓用车人格 <span aria-hidden="true">↗</span></button></div>';
    panels[5].firstChild.appendChild(resultActions);
    resultActions.querySelector('.mobile-refill').addEventListener('click', () => { stage = 'config'; select(0); });
    resultActions.querySelector('.mobile-reveal').addEventListener('click', () => document.getElementById('imageCardBtn').click());
    shell.addEventListener('keydown', event => {
      if (event.target.closest('input,textarea,select,summary')) return;
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        event.preventDefault(); select(event.key === 'Home' ? 0 : event.key === 'End' ? names.length - 1 : current + (event.key === 'ArrowRight' ? 1 : -1), true);
      }
    });
    // Gesture ownership is chosen once at pointer-down, never while crossing a slider.
    shell.addEventListener('touchstart', event => {
      if (event.target.closest('input[type=range]')) event.preventDefault();
    }, { passive:false });
    shell.addEventListener('touchmove', event => {
      if (!start || event.touches.length !== 1) return;
      const dx = event.touches[0].clientX - start.x;
      const dy = event.touches[0].clientY - start.y;
      if (start.slider || (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.15)) {
        if (event.cancelable) event.preventDefault();
      }
    }, { passive:false });
    shell.addEventListener('pointerdown', event => {
      start = null;
      if (!event.isPrimary || event.button !== 0) return;
      if (event.target.closest('button,.mobile-deck-dots')) return;
      const range = event.target.closest('input[type=range]');
      let slider = null;
      if (range) {
        const rect = range.getBoundingClientRect();
        const ratio = (Number(range.value) - Number(range.min || 0)) / (Number(range.max || 100) - Number(range.min || 0));
        const center = rect.left + 22 + ratio * Math.max(0, rect.width - 44);
        if (Math.abs(event.clientX - center) <= 24 && Math.abs(event.clientY - (rect.top + rect.height / 2)) <= 22) slider = range;
        // Never let the browser jump the range value on a track click.
        event.preventDefault();
      }
      start = { x:event.clientX, y:event.clientY, pointer:event.pointerId, slider, initial:slider ? Number(slider.value) : null, width:slider ? slider.getBoundingClientRect().width : 0 };
      if (slider) {
        slider.focus({preventScroll:true});
        shell.setPointerCapture(event.pointerId);
        slider.classList.add('is-dragging');
      }
    });
    shell.addEventListener('pointermove', event => {
      if (!start || event.pointerId !== start.pointer) return;
      const dx = event.clientX - start.x, dy = event.clientY - start.y;
      if (start.slider) {
        const range = start.slider, min = Number(range.min || 0), max = Number(range.max || 100);
        range.value = Math.max(min, Math.min(max, start.initial + dx / Math.max(1, start.width - 44) * (max - min)));
        range.dispatchEvent(new Event('input', {bubbles:true}));
      } else if (Math.abs(dy) > 20 && Math.abs(dy) > Math.abs(dx)) start = null;
    });
    const finish = event => {
      if (!start || event.pointerId !== start.pointer) return;
      const gesture = start; start = null;
      if (gesture.slider) {
        gesture.slider.classList.remove('is-dragging');
        gesture.slider.dispatchEvent(new Event('change', {bubbles:true}));
      } else if (event.type === 'pointerup') {
        const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
        if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy) * 1.25) select(current + (dx < 0 ? 1 : -1));
      }
    };
    shell.addEventListener('pointerup', finish);
    shell.addEventListener('pointercancel', finish);
    const guides = [
      ['M12 37h65l-8-17H28z M22 37v9m43-9v9 M29 20l9-10h20l11 10', '先认识你的座驾', '车型、车价和年里程，组成测算的起点。'],
      ['M21 11h48v42H21z M30 22h30 M30 32h20 M30 42h25', '把日常开销算进去', '保险、停车和能耗，都可以按实际情况调整。'],
      ['M15 42l19-13 15 8 25-26 M60 11h14v14', '最后一步，看看长期成本', '折旧和资金占用也算在内，账单才更完整。'],
      ['M18 41V26 M36 41V15 M54 41V7 M12 47h57', '账单已经为你算好', '先看总花费，再看看钱花在哪。'],
      ['M20 9h45v43H20z M29 21h27 M29 31h27 M29 41h18', '每一笔，都有去处', '这里是各项成本的每周分摊。'],
      ['M15 34h57l-8-15H27z M24 35v9 M61 35v9 M75 13l6 6-6 6', '有账单，也有我的态度', '看完打车参考，再揭晓你的专属用车人格。']
    ];
    panels.forEach((panel, i) => {
      const guide = document.createElement('div'); guide.className = 'mobile-card-guide';
      guide.innerHTML = '<svg viewBox="0 0 90 60" aria-hidden="true"><path d="' + guides[i][0] + '"/></svg><div><strong>' + guides[i][1] + '</strong><p>' + guides[i][2] + '</p></div>';
      panel.firstChild.prepend(guide);
      const art = document.createElement('div'); art.className = 'mobile-card-art'; art.setAttribute('aria-hidden', 'true');
      const scenes = [
        'M30 80h175l-18-35H68z M63 45l26-24h65l33 24 M56 80v13m120-13v13 M40 105h180 M210 22v24m-12-12h24',
        'M60 18h110v85H60z M79 38h68 M79 57h48 M79 76h58 M180 44h35v59h-35 M190 59h15 M190 75h15',
        'M35 92l47-34 42 17 70-53 M160 22h34v33 M35 106h190 M65 100v6m45-6v6m45-6v6',
        'M48 101V64h28v37 M103 101V40h28v61 M158 101V18h28v83 M33 107h173',
        'M72 12h102v100l-13-8-13 8-13-8-13 8-13-8-13 8-12-8-12 8z M90 37h65 M90 56h65 M90 75h42',
        'M25 90h67q20 0 20-23V46q0-23 23-23h83 M24 73h51 M174 68h58l-10-18h-36z M186 69v10m34-10v10 M43 22v24m-12-12h24'
      ];
      const captions = ['每一程，都从这里开始', '把日常，算得明明白白', '目光放远，账也算长一点', '心里有数，出发有底', '每一笔，都在自己的掌握里', '选择自己的出发方式'];
      art.innerHTML = '<svg viewBox="0 0 260 125"><ellipse cx="130" cy="106" rx="100" ry="9" class="art-ground"/><circle cx="194" cy="34" r="28" class="art-orbit"/><path d="' + scenes[i] + '"/></svg><span>' + captions[i] + '</span>';
      const actions = panel.querySelector('.mobile-card-actions');
      if (actions) actions.before(art); else panel.firstChild.appendChild(art);
    });
    // Moving controls uses the content container, which remains the first child.
    document.body.classList.add('mobile-deck-mode');
    select(current);
  }
  function update() {
    if (media.matches) mount();
    else if (shell) {
      originals.reverse().forEach(([node, marker]) => marker.replaceWith(node));
      originals = []; shell.remove(); shell = null; document.body.classList.remove('mobile-deck-mode');
      window.dispatchEvent(new Event('resize'));
    }
  }
  media.addEventListener('change', update);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', update); else update();
})();
