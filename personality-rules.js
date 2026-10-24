(function(root) {
  const number = value => Number.isFinite(value) && value > 0 ? value : 0;
  const fmt = value => Number(value).toLocaleString('zh-CN', {maximumFractionDigits:2});
  function candidates(d, r = {}, type = 'ev') {
    if (type === 'phev' || type === 'erev') {
      const share = Math.min(100,Math.max(0,Number(d.electricShare)||0))/100;
      const electricMileage = number(d.mileage)*share, fuelMileage = number(d.mileage)*(1-share);
      const totalEnergy = electricMileage/100*number(d.energy1)*number(d.energy2)+fuelMileage/100*number(d.fuelConsumption)*number(d.fuelPrice);
      const dominantElectric = share >= .6, dominantFuel = share <= .4;
      const normalized = {...d,energy1:dominantElectric?d.energy1:dominantFuel?d.fuelConsumption:0,energy2:dominantElectric?d.energy2:dominantFuel?d.fuelPrice:0,parking:0};
      const list = candidates(normalized,r,dominantElectric?'ev':'gas').filter(item => !['parking'].includes(item.id));
      for(const item of list) if (['consumption','price'].includes(item.dimension)) item.reason = (dominantElectric?'纯电里程占比 '+fmt(share*100)+'%；':'用油里程占比 '+fmt((1-share)*100)+'%；')+item.reason;
      if (number(d.mileage) && share >= .85) list.push({id:'electricHybrid',name:'充电桩常驻混动',declaration:'买的时候两手准备，开起来基本靠电。',score:1.3+(share-.85)*4,tag:'混动开成纯电',reason:`纯电里程占比 ${fmt(share*100)}%，油箱主要负责给出发兜底。`,dimension:'mix'});
      else if (number(d.mileage) && share >= .3 && share <= .7) list.push({id:'versatile',name:'两头都能接',declaration:'有电用电，没电也不耽误出发。',score:.9,tag:'油电都不闲',reason:`纯电里程占比 ${fmt(share*100)}%，其余按用油行驶计算，两种能源各有各的活。`,dimension:'mix'});
      if(totalEnergy>0 && number(d.parking)>=2400 && d.parking>=totalEnergy*1.5) list.push({id:'parking',name:'车位包租侠',declaration:'车跑起来没多贵，停下来开始交租。',score:.8+Math.min(2.5,(d.parking/totalEnergy-1.5)/3),tag:'停车比能源贵',reason:`每年停车 ¥${fmt(d.parking)}，约是油电总能源费的 ${fmt(d.parking/totalEnergy)} 倍。`,dimension:'parking'});
      return list.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
    }
    const ev = type === 'ev', mileage = number(d.mileage), years = number(d.depYears);
    const consumption = number(d.energy1), price = number(d.energy2);
    const energy = mileage / 100 * consumption * price, parking = number(d.parking);
    const list = [];
    const add = (id, name, declaration, score, tag, reason, dimension) => { if (score > 0) list.push({id,name,declaration,score,tag,reason,dimension}); };
    add('road','公路常驻嘉宾','导航还没下班，我又出发了。',mileage >= 40000 ? 2 + (mileage - 40000) / 30000 : 0,'公路常驻',`每年计划开 ${fmt(mileage)} 公里，平均每天约 ${fmt(Math.round(mileage / 365))} 公里。`,'mileage');
    add('explorer','生活半径拓荒者','别人收藏目的地，我负责开过去。',mileage >= 20000 && mileage < 40000 ? .6 + (mileage - 20000) / 20000 : 0,'里程不摸鱼',`每年计划开 ${fmt(mileage)} 公里，出发是生活里的常规节目。`,'mileage');
    add('hidden','停车场隐藏款','出场次数不多，每次都算特别出演。',mileage > 0 && mileage < 3000 ? 2 + (3000 - mileage) / 3000 : 0,'特别出演',`每年计划开 ${fmt(mileage)} 公里，车更多时候在等你出场。`,'mileage');
    add('freedom','周末出逃选手','平时给车放假，周末给自己放风。',mileage >= 3000 && mileage < 8000 ? .6 + (8000 - mileage) / 5000 : 0,'随时出逃',`每年计划开 ${fmt(mileage)} 公里，不必天天开，也保留随时出发的选择。`,'mileage');
    const low = ev ? 13 : 6, high = ev ? 22 : 10;
    const unit = ev ? '度电' : '升油';
    add('efficient','能耗管理大师',ev ? '路照样走，电量慢慢扣。' : '路照样走，油量慢慢扣。',mileage && consumption && consumption <= low ? 1 + (low - consumption) / low * 3 : 0,'能耗很克制',`填写的百公里能耗为 ${fmt(consumption)} ${unit}，按这个设定，车的饭量很克制。`,'consumption');
    add('hungry','能量消耗大户','我的车不挑食，就是饭量有点大。',mileage && consumption >= high ? 1 + (consumption - high) / high * 3 : 0,'饭量不小',`填写的百公里能耗为 ${fmt(consumption)} ${unit}，这辆车属于胃口不错的选手。`,'consumption');
    add('cheap','充电省钱掌门','别人找优惠，我把优惠开成了日常。',ev && mileage && consumption && price && price <= .6 ? 1 + (.6 - price) / .6 * 3 : 0,'充电价格友好',`填写的电价为 ¥${fmt(price)}/度，按这个价格，每公里电费约 ¥${fmt(consumption * price / 100)}。`,'price');
    add('premium','充电尊享会员','同样一度电，我充出了贵宾待遇。',ev && mileage && consumption && price >= 1.5 ? 1 + (price - 1.5) / 1.5 * 3 : 0,'电价有点讲究',`填写的电价为 ¥${fmt(price)}/度；这里说的是单价，而不是开得多。`,'price');
    add('companion','老车养成玩家','别人等新款，我等它成为经典。',years >= 9 ? 1 + (years - 9) / 6 * 2 : 0,'老车养成中',`按你计划的 ${fmt(years)} 年持有时间，这是一场长线陪伴。`,'years');
    add('changer','换车体验派','人生那么长，多认识几辆车。',years && years <= 4 ? .8 + (4 - years) / 3 * 2 : 0,'下一辆也想认识',`按你计划的 ${fmt(years)} 年持有时间，下一段相遇已经留好了位置。`,'years');
    add('parking','车位包租侠','车跑起来没多贵，停下来开始交租。',energy > 0 && parking >= 2400 && parking >= energy * 1.5 ? .8 + Math.min(2.5, (parking / energy - 1.5) / 3) : 0,'停车比能源贵',`每年停车 ¥${fmt(parking)}，约是能源费的 ${fmt(parking / (energy || 1))} 倍。`,'parking');
    add('everyday','日子过得刚刚好','够用、顺手，快乐不必踩到底。',.01,'日常刚刚好',mileage ? `每年计划开 ${fmt(mileage)} 公里；里程、能耗和持有计划没有特别突出的极端特点。` : '还没计划行驶里程，先保留随时出发的选择。','balanced');
    return list.sort((a,b) => b.score - a.score || a.id.localeCompare(b.id));
  }
  function analyzePersonality(d, r, type) {
    const ranked = candidates(d,r,type), identity = ranked[0];
    const used = new Set([identity.dimension]);
    const traits = [];
    for (const item of ranked.slice(1)) {
      if (item.id !== 'everyday' && !used.has(item.dimension)) { traits.push(item.tag); used.add(item.dimension); }
      if (traits.length === 2) break;
    }
    if (traits.length < 2) traits.push(number(d.mileage) >= 8000 ? '日常好搭档' : '随时准备出发');
    if (traits.length < 2) traits.push(number(d.depYears) >= 6 ? '慢慢攒故事' : '生活自己掌舵');
    return {identity, tags:[{ev:'电力出行',gas:'燃油搭子',phev:'插混出行',erev:'增程出行'}[type] || '电力出行',...traits.slice(0,2)],reason:identity.reason,comment:r.yearTotal > 0 ? identity.declaration : '当前未计入费用。先把账补齐，再看看我的出发方式。'};
  }
  const api = {analyzePersonality,eligibleIdentities:candidates};
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CarPersonalityRules = api;
})(typeof window === 'object' ? window : globalThis);
