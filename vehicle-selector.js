(() => {
  const silhouettes = {
    ev:'M15 48h91l-5-17-14-3-15-14H43L30 30H20z M39 29l10-10h20l11 10',
    gas:'M13 48h95l-4-16-22-4-14-13H42L28 30H16z M38 29l9-9h18l9 9',
    phev:'M13 48h96l-5-18-16-2-12-15H39L26 29H17z M36 28l8-10h27l8 10',
    erev:'M13 48h96l-3-23-20-3-11-11H38L24 25H15z M34 24l9-8h29l8 8'
  };
  document.querySelectorAll('#typeSegment button').forEach(button => {
    const type=button.dataset.type, art=button.querySelector('.vehicle-art');
    const badge = type==='gas' ? 'M96 7h9v12h-9z M105 9h4v13' : type==='phev' ? 'M93 6v6m8-6v6 M90 12h14v6l-7 5v5' : type==='erev' ? 'M92 5h16v17H92z M98 7v7h6l-6 6' : 'M101 3l-9 13h8l-4 12 14-17h-9z';
    art.innerHTML='<svg viewBox="0 0 124 65" aria-hidden="true"><path class="vehicle-body" d="'+silhouettes[type]+'"/><circle cx="33" cy="48" r="9"/><circle cx="87" cy="48" r="9"/><path class="vehicle-badge" d="'+badge+'"/><path class="vehicle-road" d="M10 61h103"/></svg>';
  });
})();
