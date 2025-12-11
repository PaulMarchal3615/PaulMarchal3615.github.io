(() => {
// Firebase configuration
const firebaseConfig = {
apiKey: "API_KEY",
authDomain: "PROJECT_ID.firebaseapp.com",
databaseURL: "https://PROJECT_ID.firebaseio.com",
projectId: "PROJECT_ID",
storageBucket: "PROJECT_ID.appspot.com",
messagingSenderId: "SENDER_ID",
appId: "APP_ID"
};
firebase.initializeApp(firebaseConfig);
const dbRef = firebase.database().ref('concepts');


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
const GRID = 60;


let db = {};


// helpers
function save() { dbRef.set(db); }


function normX(x) { return x / 100; }
function normY(y) { return y / 100; }
function pixelFromXY(x, y, w=mapCanvas.width, h=mapCanvas.height) {
const nx = normX(x); const ny = normY(y);
return [w/2 + nx*(w/2 - padding), h/2 - ny*(h/2 - padding)];
}
function hueFromX(x){ return 240*((x+100)/200); }
function lightFromY(y){ return 30 + ((y+100)/200)*50; }


function refreshDropdown() {
const last = localStorage.getItem('last_concept');
conceptSelect.innerHTML = '<option value="">-- Choisir --</option>';
Object.keys(db).sort((a,b) => db[b].votes.length - db[a].votes.length)
.forEach(k => { const opt=document.createElement('option'); opt.value=k; opt.textContent=`${k} (${db[k].votes.length})`; conceptSelect.appendChild(opt); });
if(last && db[last]) conceptSelect.value=last;
if(conceptSelect.value) updateDetails(conceptSelect.value);
}


function updateDetails(concept){
if(!db[concept]){ histClear(); voterList.innerHTML=''; return; }
localStorage.setItem('last_concept', concept);
const votes = db[concept].votes.slice().reverse();
drawHistogram(histX.getContext('2d'), votes.map(v=>v.x), true);
drawHistogram(histY.getContext('2d'), votes.map(v=>v.y), false);
voterList.innerHTML='';
votes.slice(0,50).forEach(v=>{ const li=document.createElement('li'); li.textContent=`${v.user} — x=${v.x.toFixed(0)} y=${v.y.toFixed(0)} (${new Date(v.ts).toLocaleString()})`; voterList.appendChild(li); });
}


function histClear(){ drawHistogram(histX.getContext('2d'), []); drawHistogram(histY.getContext('2d'), []); }


function drawHistogram(g, values, isX){
const w=g.canvas.width,h=g.canvas.height; g.clearRect(0,0,w,h);
const bins=12; const counts=Array(bins).fill(0);
values.forEach(v=>{ let idx=Math.floor(((v+100)/200)*bins); if(idx<0)idx=0;if(idx>=bins)idx=bins-1; counts[idx]++; });
const maxC = Math.max(...counts);
for(let i=0;i<bins;i++){ const bw=w/bins; const bh=(counts[i]/maxC)*(h-10);
const center=-100+(i+0.5)*(200/bins); const hue=hueFromX(center); const light=isX?55:lightFromY(center);
g.fillStyle=`hsl(${hue},70%,${light}%)`; g.fillRect(i*bw+2,h-bh-2,bw-4,bh); }
}
})();