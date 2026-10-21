// Move existing controls, never clone them: inputs and calculation state stay intact.
(() => {
  const media = matchMedia('(max-width: 959px)');
  let shell, panels, tabs, current = 0, originals = [], touch;
  function select(index, focus = false) {
    current = Math.max(0, Math.min(2, index));
    panels.forEach((panel, i) => { panel.hidden = i !== current; });
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === current));
      tab.tabIndex = i === current ? 0 : -1;
    });
    shell.querySelector('.mobile-page-count').textContent = (current + 1) + ' / 3';
    shell.querySelector('#mobilePrevious').disabled = current === 0;
    const next = shell.querySelector('#mobileNext');
    next.textContent = current === 2 ? '返回车辆信息' : current === 1 ? '查看费用账单 →' : '下一步：用车开销 →';
    if (focus) tabs[current].focus();
    if (shell.getBoundingClientRect().top < 0) shell.scrollIntoView({ block: 'start' });
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }
  function mount() {
    if (shell || !media.matches) return;
    const wrap = document.querySelector('.wrap');
    const groups = [...document.querySelectorAll('details.group')];
    if (groups.length !== 3) return;
    shell = document.createElement('section'); shell.className = 'mobile-pages';
    shell.innerHTML = `<nav class="mobile-page-tabs" role="tablist" aria-label="计算器页面"></nav><div class="mobile-page-panels"></div><div class="mobile-page-navigation"><button id="mobilePrevious" type="button">← 上一步</button><span class="mobile-page-count" aria-live="polite"></span><button id="mobileNext" type="button"></button></div><p class="mobile-page-hint">左右滑动切换页面 · 参数会自动保留</p>`;
    wrap.appendChild(shell);
    const names = ['车辆信息', '用车开销', '费用账单'];
    panels = names.map((name, i) => {
      const panel = document.createElement('section'); panel.className = 'mobile-page-panel'; panel.id = 'mobilePanel' + i;
      panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', 'mobileTab' + i);
      shell.querySelector('.mobile-page-panels').appendChild(panel); return panel;
    });
    tabs = names.map((name, i) => {
      const tab = document.createElement('button'); tab.type = 'button'; tab.id = 'mobileTab' + i;
      tab.setAttribute('role', 'tab'); tab.setAttribute('aria-controls', panels[i].id);
      tab.innerHTML = '<span>' + (i + 1) + '</span>' + name;
      tab.addEventListener('click', () => select(i));
      tab.addEventListener('keydown', event => {
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
          event.preventDefault(); select(event.key === 'Home' ? 0 : event.key === 'End' ? 2 : current + (event.key === 'ArrowRight' ? 1 : -1), true);
        }
      });
      shell.querySelector('nav').appendChild(tab); return tab;
    });
    const move = (node, page) => {
      const marker = document.createComment('mobile-page-original'); node.before(marker);
      originals.push([node, marker]); panels[page].appendChild(node);
    };
    move(document.querySelector('#typeSegment').closest('.card'), 0); move(groups[0], 0);
    move(groups[1], 1); move(groups[2], 1);
    ['.hero', '.chart-card', '.taxi-card', '.detail-card'].forEach(selector => move(document.querySelector(selector), 2));
    shell.querySelector('#mobilePrevious').addEventListener('click', () => select(current - 1));
    shell.querySelector('#mobileNext').addEventListener('click', () => select(current === 2 ? 0 : current + 1));
    shell.addEventListener('touchstart', event => {
      touch = null;
      if (event.touches.length !== 1 || event.target.closest('input, button, textarea, select, summary, a, dialog')) return;
      touch = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }, { passive: true });
    shell.addEventListener('touchend', event => {
      if (!touch || !event.changedTouches.length) return;
      const dx = event.changedTouches[0].clientX - touch.x, dy = event.changedTouches[0].clientY - touch.y;
      touch = null;
      if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.6) select(current + (dx < 0 ? 1 : -1));
    }, { passive: true });
    shell.addEventListener('touchcancel', () => { touch = null; }, { passive: true });
    select(current);
  }
  function update() {
    if (media.matches) mount();
    else if (shell) {
      originals.forEach(([node, marker]) => { marker.replaceWith(node); });
      originals = []; shell.remove(); shell = null;
      window.dispatchEvent(new Event('resize'));
    }
  }
  media.addEventListener('change', update);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', update); else update();
})();
