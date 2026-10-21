(() => {
  const themes = PersonalCarShare.themes;
  const picker = document.createElement('details'); picker.className = 'page-theme-picker';
  picker.innerHTML = '<summary aria-label="更换页面配色"><span class="theme-preview"></span><span>配色</span></summary><div class="page-theme-options" role="group" aria-label="页面主题"></div>';
  document.querySelector('.nav-title').after(picker);
  const apply = id => {
    const theme = themes[id] || themes.forest;
    if (!themes[id]) id = 'forest';
    const [ink, pop, paper] = theme.colors, root = document.documentElement;
    root.dataset.theme = id;
    Object.entries({ '--theme-ink':ink, '--theme-pop':pop, '--theme-paper':paper, '--blue':ink, '--bg':paper, '--green':ink }).forEach(([key, value]) => root.style.setProperty(key, value));
    picker.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.pageTheme === id)));
    try { localStorage.setItem('costcalc:theme', id); } catch (_) { /* Theme still works without storage. */ }
  };
  Object.entries(themes).forEach(([id, theme]) => {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.pageTheme = id;
    button.textContent = theme.name; button.style.setProperty('--swatch', theme.colors[0]);
    button.addEventListener('click', () => { apply(id); picker.open = false; });
    picker.querySelector('.page-theme-options').appendChild(button);
  });
  let initial = 'forest'; try { initial = localStorage.getItem('costcalc:theme') || initial; } catch (_) {}
  apply(initial);
  document.addEventListener('click', event => { if (!picker.contains(event.target)) picker.open = false; });
})();
