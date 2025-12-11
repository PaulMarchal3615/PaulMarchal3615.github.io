let db = JSON.parse(localStorage.getItem("conceptDB") || "{}");

const conceptInput = document.getElementById("conceptInput");
const axisXInput = document.getElementById("axisX");
const axisYInput = document.getElementById("axisY");
const addButton = document.getElementById("addButton");

const canvas = document.getElementById("chart");
const ctx = canvas.getContext("2d");

addButton.addEventListener("click", () => {
    const name = conceptInput.value.trim();
    const x = parseFloat(axisXInput.value);
    const y = parseFloat(axisYInput.value);

    if (!name) {
        alert("Entre un mot !");
        return;
    }

    if (!db[name]) db[name] = { votes: [] };
    db[name].votes.push({ x, y });

    localStorage.setItem("conceptDB", JSON.stringify(db));
    conceptInput.value = "";

    drawChart();
});

function average(votes) {
    if (votes.length === 0) return { x: 0, y: 0 };
    let sx = 0, sy = 0;
    for (let v of votes) { sx += v.x; sy += v.y; }
    return { x: sx / votes.length, y: sy / votes.length };
}

function drawChart() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#cccccc";
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    for (let concept in db) {
        const { x, y } = average(db[concept].votes);
        const px = canvas.width / 2 + x * 2;
        const py = canvas.height / 2 - y * 2;

        ctx.fillStyle = "blue";
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "black";
        ctx.font = "12px sans-serif";
        ctx.fillText(concept, px + 8, py + 3);
    }
}

drawChart();
