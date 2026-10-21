// Reuse actual controls so paging never duplicates calculation state.
(() => {
  const media = matchMedia('(max-width: 959px)');
  let shell, panels, dots, current = 0, originals = [], start;
  const names = ['车辆信息', '日常开销', '长期成本', '费用总览', '费用明细', '打车参考'];
  function select(index, focus = false) {
    current = Math.max(0, Math.min(names.length - 1, index));
    panels.forEach((panel, i) => {
      panel.dataset.position = i < current ? 'before' : i > current ? 'after' : 'active';
      panel.inert = i !== current;
      panel.setAttribute('aria-hidden', String(i !== current));
      panel.style.setProperty('--distance', Math.min(3, Math.abs(i - current)));
      panel.style.visibility = Math.abs(i - current) <= 1 ? 'visible' : 'hidden';
    });
    dots.forEach((dot, i) => { dot.setAttribute('aria-current', String(i === current)); });
    shell.querySelector('.mobile-deck-title').textContent = names[current];
    shell.querySelector('.mobile-deck-count').textContent = String(current + 1).padStart(2, '0') + ' / ' + names.length;
    shell.querySelector('.mobile-deck-previous').disabled = current === 0;
    shell.querySelector('.mobile-deck-next').disabled = current === names.length - 1;
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
    wrap.appendChild(shell);
    const deck = shell.querySelector('.mobile-deck');
    [['previous', '上一张卡片', -1], ['next', '下一张卡片', 1]].forEach(([direction, label, delta]) => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'mobile-deck-arrow mobile-deck-' + direction;
      button.setAttribute('aria-label', label);
      button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + (delta < 0 ? 'M14 5l-7 7 7 7' : 'M10 5l7 7-7 7') + '"/></svg>';
      button.addEventListener('click', () => select(current + delta));
      deck.appendChild(button);
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
      if (event.target.closest('.mobile-deck-arrow,.mobile-deck-dots')) return;
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
