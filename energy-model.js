(function(root) {
  const hybrid = type => type === 'phev' || type === 'erev';
  const safe = value => Math.max(0, Number(value) || 0);
  function calculateEnergy(d) {
    const mileage = safe(d.mileage), mixed = hybrid(d.type);
    const electricShare = mixed ? Math.min(100, safe(d.electricShare)) / 100 : d.type === 'gas' ? 0 : 1;
    const electric = mixed || d.type !== 'gas' ? mileage * electricShare / 100 * safe(d.energy1) * safe(d.energy2) : 0;
    const fuel = mixed ? mileage * (1 - electricShare) / 100 * safe(d.fuelConsumption) * safe(d.fuelPrice) : d.type === 'gas' ? mileage / 100 * safe(d.energy1) * safe(d.energy2) : 0;
    return {electric, fuel, total:electric + fuel, electricShare};
  }
  const api = {hybrid,calculateEnergy};
  if (typeof module === 'object' && module.exports) module.exports = api; else root.CarEnergy = api;
})(typeof window === 'object' ? window : globalThis);
