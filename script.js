
// ---------------- DB locale ----------------
let db = JSON.parse(localStorage.getItem("conceptDB2") || "{}");

// ---------------- DOM refs ----------------
const conceptSelect = document.getElementById("conceptSelect");
const conceptInput = document.getElementById("conceptInput");
const axisXInput = document.getElementById("axisX");
const axisYInput = document.getElementById("axisY");
const xValue = document.getElementById("xValue");
const yValue = document.getElementById("yValue");
const addButton = document.getElementById("addButton");
const userInput = document.getElementById("userInput");

const histX = document.getElementById("histX").getContext("2d");
const histY = document.getElementById("histY").getContext("2d");
const userList = document.getElementById("userList");

const canvas = document.getElementById("chart");
const ctx = canvas.getContext("2d");

// ---------------- Update slider text ----------------
axisXInput.addEventListener("input", () => xValue.textContent = axisXInput.value);
axisYInput.addEventListener("input", () => yValue.textContent = axisYInput.value);

// ---------------- Populate dropdown ----------------
function refreshDropdown() {
  conceptSelect.innerHTML = "<option value=''>-- Choisir --</option>";
  for (let c in db) {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    conceptSelect.appendChild(opt);
  }
}

refreshDropdown();

// ---------------- Utils ----------------
function average(votes) {
  if (votes.length === 0) return { x: 0, y: 0 };
  let sx = 0, sy = 0;
  for (let v of votes) { sx += v.x; sy += v.y; }
  return { x: sx / votes.length, y: sy / votes.length };
}

function save() {
  localStorage.setItem("conceptDB2", JSON.stringify(db));
}

// ---------------- Add / vote a concept ----------------
addButton.addEventListener("click", () => {
  const user = userInput.value.trim();
  if (!user) return alert("Entre un pseudo !");

  const newConcept = conceptInput.value.trim();
  const selected = conceptSelect.value;

  const name = newConcept || selected;
  if (!name) return alert("Choisis ou entre un concept");

  const x = parseFloat(axisXInput.value);
  const y = parseFloat(axisYInput.value);

  if (!db[name]) db[name] = { votes: [] };
  db[name].votes.push({ x, y, user });

  save();
  conceptInput.value = "";
  refreshDropdown();
  updateDetails(name);
  drawChart();
});

// ---------------- Draw global chart ----------------
function drawChart() {
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // Axes
  ctx.strokeStyle = "#aaa";
  ctx.beginPath();
  ctx.moveTo(canvas.width/2, 0);
  ctx.lineTo(canvas.width/2, canvas.height);
  ctx.moveTo(0, canvas.height/2);
  ctx.lineTo(canvas.width, canvas.height/2);
  ctx.stroke();

  for (let name in db) {
    const {x, y} = average(db[name].votes);
    const px = canvas.width/2 + x * 2;
    const py = canvas.height/2 - y * 2;

    // Color gradient for X (red↔blue)
    const hue = 240 * ((x + 100) / 200);
    ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;

    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = "black";
    ctx.font = "12px sans-serif";
    ctx.fillText(name, px+10, py+4);
  }
}

drawChart();

// ---------------- Histograms ----------------
function drawHistogram(ctx, values, color) {
  ctx.clearRect(0,0,300,120);
  if (values.length === 0) return;

  const bins = 10;
  const counts = Array(bins).fill(0);

  for (let v of values) {
    const idx = Math.floor(((v+100)/200) * bins);
    counts[Math.min(idx, bins-1)]++;
  }

  const maxCount = Math.max(...counts);

  for (let i=0; i<bins; i++) {
    const barHeight = (counts[i] / maxCount) * 100;

    ctx.fillStyle = color;
    ctx.fillRect(i*30, 120 - barHeight, 28, barHeight);
  }
}

// ---------------- Update detail panel ----------------
function updateDetails(concept) {
  if (!db[concept]) return;

  const votes = db[concept].votes;
  const xs = votes.map(v => v.x);
  const ys = votes.map(v => v.y);

  drawHistogram(histX, xs, "red");
  drawHistogram(histY, ys, "gray");

  userList.innerHTML = "";
  votes.forEach(v => {
    const li = document.createElement("li");
    li.textContent = `${v.user} : (${v.x}, ${v.y})`;
    userList.appendChild(li);
  });
}

conceptSelect.addEventListener("change", () => {
  if (conceptSelect.value) updateDetails(conceptSelect.value);
});

