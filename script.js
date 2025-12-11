(() => {
  // Local DB shape: { concept: { votes: [{x: -100..100, y: -100..100, user, ts}], createdAt } }
  const KEY = 'concept_compass_v2';
  let db = JSON.parse(localStorage.getItem(KEY) || '{}');

  const $ = id => document.getElementById(id);
  const conceptSelect = $('conceptSelect');
  const conceptInput = $('conceptInput');
  const userInput = $('userInput');
  const axisX = $('axisX');
  const axisY = $('axisY');
  const xLabel = $('xLabel');
  const yLabel = $('yLabel');
  const voteBtn = $('voteBtn');
  const showHeat = $('showHeat');
  const histX = $('histX');
  const histY = $('histY');
  const voterList = $('voterList');

  const mapCanvas = $('mapCanvas');
  const ctx = mapCanvas.getContext('2d');
  const padding = 40;

  // heatmap grid resolution
  const GRID = 60;

  // helpers
  function save() { localStorage.setItem(KEY, JSON.stringify(db)); }

  function normX(x) { return x / 100; } // -1..1
  function normY(y) { return y / 100; }

  function pixelFromXY(x, y, w=mapCanvas.width, h=mapCanvas.height) {
    const nx = normX(x);
    const ny = normY(y);
    const px = w/2 + nx * (w/2 - padding);
    const py = h/2 - ny * (h/2 - padding);
    return [px, py];
  }

  function hueFromX(x) { // x -100..100 -> hue 0(red) .. 240(blue)
    const t = (x + 100) / 200; return 240 * t; }
  function lightFromY(y) { // y -100..100 -> lightness 30% (prol) .. 80% (bourgeois)
    const t = (y + 100) / 200; return 30 + t * 50; }

  // populate dropdown
  function refreshDropdown() {
    const last = localStorage.getItem(KEY + '.last');
    conceptSelect.innerHTML = '<option value="">-- Choisir --</option>';
    Object.keys(db).sort((a,b) => (db[b].votes.length - db[a].votes.length)).forEach(k => {
      const opt = document.createElement('option'); opt.value = k; opt.textContent = `${k} (${db[k].votes.length})`; conceptSelect.appendChild(opt);
    });
    // select last if exists
    if (last && db[last]) conceptSelect.value = last;
    if (conceptSelect.value) updateDetails(conceptSelect.value);
  }

  // update histograms and voter list for a concept
  function updateDetails(concept) {
    if (!db[concept]) { histClear(); voterList.innerHTML = ''; return; }
    localStorage.setItem(KEY + '.last', concept);
    const votes = db[concept].votes.slice().reverse();

    // histograms
    drawHistogram(histX.getContext('2d'), votes.map(v => v.x), true);
    drawHistogram(histY.getContext('2d'), votes.map(v => v.y), false);

    // voter list (last 50)
    voterList.innerHTML = '';
    votes.slice(0,50).forEach(v => {
      const li = document.createElement('li'); li.textContent = `${v.user} — x=${v.x.toFixed(0)} y=${v.y.toFixed(0)} (${new Date(v.ts).toLocaleString()})`; voterList.appendChild(li);
    });
  }

  function histClear() {
    drawHistogram(histX.getContext('2d'), []);
    drawHistogram(histY.getContext('2d'), []);
  }

  function drawHistogram(g, values, isX) {
    const w = g.canvas.width, h = g.canvas.height; g.clearRect(0,0,w,h);
    const bins = 12; const counts = Array(bins).fill(0);
    if (values.length === 0) return;
    values.forEach(v => {
      let idx = Math.floor(((v + 100) / 200) * bins); if (idx < 0) idx = 0; if (idx >= bins) idx = bins-1; counts[idx]++;
    });
    const maxC = Math.max(...counts);
    for (let i=0;i<bins;i++){
      const bw = w / bins; const bh = (counts[i] / maxC) * (h - 10);
      // color by bin center
      const center = -100 + (i + 0.5) * (200 / bins);
      const hue = hueFromX(center);
      const light = isX ? 55 : lightFromY(center);
      g.fillStyle = `hsl(${hue},70%,${light}%)`;
      g.fillRect(i*bw + 2, h - bh - 2, bw - 4, bh);
    }
  }

  // Draw full map: optionally heatmap for selected concept, then all averages
  function drawMap() {
    const w = mapCanvas.width, h = mapCanvas.height;
    ctx.clearRect(0,0,w,h);
    // background grid
    ctx.strokeStyle = '#e6eef8'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(w/2,0); ctx.lineTo(w/2,h); ctx.moveTo(0,h/2); ctx.lineTo(w,h/2); ctx.stroke();

    // draw heatmap of selected concept
    const sel = conceptSelect.value;
    if (sel && db[sel] && showHeat.checked) drawHeatmap(db[sel].votes);

    // draw all averages
    for (let k in db) {
      const votes = db[k].votes;
      if (!votes.length) continue;
      const avg = votes.reduce((acc,v)=>{acc.x+=v.x;acc.y+=v.y;return acc},{x:0,y:0}); avg.x/=votes.length; avg.y/=votes.length;
      const [px,py] = pixelFromXY(avg.x, avg.y);
      const hue = hueFromX(avg.x); const light = lightFromY(avg.y);
      ctx.fillStyle = `hsl(${hue},80%,${light}%)`;
      ctx.beginPath(); ctx.arc(px,py,8,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#001020'; ctx.font = '13px sans-serif'; ctx.fillText(k, px+10, py+5);
    }

    // if a concept selected, draw its individual votes as small semi-transparent dots
    if (sel && db[sel]){
      const votes = db[sel].votes;
      for (let v of votes){
        const [px,py] = pixelFromXY(v.x, v.y);
        const hue = hueFromX(v.x); const light = lightFromY(v.y);
        ctx.fillStyle = `hsla(${hue},70%,${light}%,0.18)`;
        ctx.beginPath(); ctx.arc(px,py,4,0,Math.PI*2); ctx.fill();
      }
      // average point on top
      const av = votes.reduce((a,b)=>({x:a.x+b.x,y:a.y+b.y}),{x:0,y:0}); av.x/=votes.length; av.y/=votes.length;
      const [apx,apy] = pixelFromXY(av.x,av.y);
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(apx,apy,6,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(apx,apy,6,0,Math.PI*2); ctx.stroke();
    }
  }

  // heatmap generation: grid of counts + average color per cell
  function drawHeatmap(votes){
    if (!votes || votes.length===0) return;
    const w = mapCanvas.width, h = mapCanvas.height;
    // grid cells
    const gx = GRID, gy = GRID;
    const counts = Array.from({length:gy}, ()=>Array(gx).fill(0));
    const sumX = Array.from({length:gy}, ()=>Array(gx).fill(0));
    const sumY = Array.from({length:gy}, ()=>Array(gx).fill(0));

    for (let v of votes){
      const nx = Math.max(0, Math.min(1, (v.x + 100) / 200));
      const ny = Math.max(0, Math.min(1, (v.y + 100) / 200));
      const ix = Math.floor(nx * (gx-1));
      const iy = Math.floor((1-ny) * (gy-1)); // flip y to grid row
      counts[iy][ix]++;
      sumX[iy][ix] += v.x;
      sumY[iy][ix] += v.y;
    }
    // find max count
    let maxC = 0; for (let r=0;r<gy;r++) for (let c=0;c<gx;c++) if (counts[r][c]>maxC) maxC = counts[r][c];
    // draw cells
    const cellW = (w - 2*padding) / gx; const cellH = (h - 2*padding) / gy;
    for (let r=0;r<gy;r++){
      for (let c=0;c<gx;c++){
        const cnt = counts[r][c]; if (cnt===0) continue;
        const avgX = sumX[r][c]/cnt; const avgY = sumY[r][c]/cnt;
        const hue = hueFromX(avgX); const light = lightFromY(avgY);
        const alpha = Math.min(0.9, (cnt / maxC) ** 0.6);
        ctx.fillStyle = `hsla(${hue},75%,${light}%,${alpha})`;
        const px = padding + c*cellW; const py = padding + r*cellH;
        ctx.fillRect(px, py, Math.ceil(cellW)+1, Math.ceil(cellH)+1);
      }
    }
  }

  // UI events
  axisX.addEventListener('input', ()=> xLabel.textContent = axisX.value);
  axisY.addEventListener('input', ()=> yLabel.textContent = axisY.value);

  voteBtn.addEventListener('click', ()=>{
    const user = userInput.value.trim(); if (!user) return alert('Entre un pseudo');
    const newc = conceptInput.value.trim(); const sel = conceptSelect.value;
    const name = newc || sel; if (!name) return alert('Choisis ou entre un concept');
    const x = parseInt(axisX.value,10); const y = parseInt(axisY.value,10);
    if (!db[name]) db[name] = { votes: [] };
    db[name].votes.push({ x, y, user, ts: Date.now() }); save(); refreshDropdown(); updateDetails(name); drawMap();
  });

  conceptSelect.addEventListener('change', ()=>{ const v = conceptSelect.value; if (v){ updateDetails(v); drawMap(); } });
  showHeat.addEventListener('change', ()=> drawMap());

  // initial setup
  function ensureDemo(){ if (Object.keys(db).length===0){ // add demo data
      db['taupes'] = { votes: [ {x:1,y:-1,user:'José',ts:Date.now()-3600*1000}, {x:0,y:0,user:'Paolo',ts:Date.now()-2000*1000}, {x:-1,y:1,user:'Jack',ts:Date.now()-1000*1000} ] };
      db['pomme'] = { votes: [ {x:50,y:50,user:'José',ts:Date.now()-3600*1000}, {x:40,y:45,user:'Paolo',ts:Date.now()-2000*1000}, {x:65,y:18,user:'Jack',ts:Date.now()-1000*1000} ] };
      save(); }
  }

  ensureDemo(); refreshDropdown(); drawMap();
})();