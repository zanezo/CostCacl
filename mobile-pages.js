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
    shell.addEventListener('touchstart', event => {
      start = null;
      if (event.touches.length !== 1 || event.target.closest('.row,.segmented,.chart-box,input,button,textarea,select,summary,a')) return;
      start = { x:event.touches[0].clientX, y:event.touches[0].clientY };
    }, { passive:true });
    shell.addEventListener('touchmove', event => {
      if (!start || event.touches.length !== 1) return;
      const dy = event.touches[0].clientY - start.y;
      if (Math.abs(dy) > 20) start = null;
    }, { passive:true });
    shell.addEventListener('touchend', event => {
      if (!start || !event.changedTouches.length) return;
      const dx = event.changedTouches[0].clientX - start.x, dy = event.changedTouches[0].clientY - start.y; start = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) select(current + (dx < 0 ? 1 : -1));
    }, { passive:true });
    shell.addEventListener('touchcancel', () => { start = null; }, { passive:true });
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
