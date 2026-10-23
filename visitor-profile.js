(() => {
  const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const write = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
  let id = read('costcalc:visitor-id');
  if (!id || !/^[a-zA-Z0-9_-]{16,80}$/.test(id)) id = crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
  write('costcalc:visitor-id', id);
  const clean = value => typeof value === 'string' ? value.normalize('NFKC').replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, '').trim() : '';
  const valid = value => Array.from(value).length >= 1 && Array.from(value).length <= 16;
  let nickname = clean(read('costcalc:nickname'));
  const legacyDefaults = ['钱包漏风的车主', '电门一踩就快乐', '四个轮子的打工人', '停车位头号侦探', '人菜但爱开', '方向盘在逃选手', '车贷清零许愿家', '副驾零食管理员', '红绿灯发呆冠军', '周末出逃预备役', '续航焦虑退退退', '快乐不打表'];
  if (!valid(nickname) || (read('costcalc:nickname-custom') !== '1' && legacyDefaults.includes(nickname))) {
    let hash = 0; for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
    nickname = '车主' + hash.toString(36).toUpperCase().padStart(6, '0').slice(-6);
  }
  write('costcalc:nickname', nickname);
  window.VisitorProfile = {id, revealed: false, get nickname() { return nickname; }, setNickname(value) { const next = clean(value); if (!valid(next)) return false; nickname = next; write('costcalc:nickname', nickname); write('costcalc:nickname-custom', '1'); document.dispatchEvent(new Event('visitor-profile-updated')); return true; }};
})();
