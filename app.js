/* ================= CONFIG ================= */
const SUPERVISOR_PIN = "";

/* ================= DATA ================= */
let employees = JSON.parse(localStorage.getItem("employees") || "[]");

/* ================= HELPERS ================= */


function save() {
  localStorage.setItem("employees", JSON.stringify(employees));
}

function nowTime() {
  return new Date().toLocaleTimeString();
}

function askPin() {
  return prompt("Supervisor PIN") === SUPERVISOR_PIN;
}

function formatDuration(ms) {
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h.toString().padStart(2,"0")}:` +
         `${m.toString().padStart(2,"0")}:` +
         `${s.toString().padStart(2,"0")}`;
}

function getWaitingMs(emp) {
  if (!emp.waitingFrom) return emp.totalWaitingMs;
  return emp.totalWaitingMs + (Date.now() - emp.waitingFrom);
}

/* ================= PIN SCREEN ================= */
function unlock() {
  if (pinInput.value === SUPERVISOR_PIN) {
    pinScreen.style.display = "none";
  } else {
    alert("Wrong PIN");
  }
}

/* ================= PARSE BOX INPUT ================= */
function parseBoxInput(input) {
  const trimmed = input.trim().toUpperCase();

  if (/^\d+$/.test(trimmed)) {
    return { qty: parseInt(trimmed), type: "", label: trimmed, time: nowTime() };
  }

  const match = trimmed.match(/^(\d+)([A-Z])$/);
  if (match) {
    const type = match[2].toLowerCase(); // normalize to lowercase class
    return {
      qty: parseInt(match[1]),
      type: type,
      label: match[1] + match[2],
      time: nowTime()
    };
  }

  return null;
}

/* ================= EMPLOYEES ================= */
function addEmployee() {
  const no = empNumber.value.trim();
  const name = empName.value.trim();

  if (!no || !name) return;
  if (employees.some(e => e.no === no)) return alert("Employee already exists");

  employees.push({
    no,
    name,
    boxes: [],
    working: false,
    waitingFrom: Date.now(),
    totalWaitingMs: 0
  });

  empNumber.value = "";
  empName.value = "";

  save();
  updateSelect();
  render();
}

function deleteEmployee(index) {
  if (!askPin()) return;
  employees.splice(index, 1);
  save();
  updateSelect();
  render();
}

/* ================= ASSIGN BOX ================= */
function assignBox() {
  const empIndex = empSelect.value;
  const raw = qtyInput.value.trim();

  if (empIndex === "") return alert("Select employee");
  

  const emp = employees[empIndex];
  const parsed = parseBoxInput(raw);
  if (!parsed) return alert("Invalid format");




  // ✅ RESET waiting when new box assigned
  emp.waitingFrom = null;
  emp.totalWaitingMs = 0;
  emp.working = true;

  emp.boxes.push(parsed);

  qtyInput.value = "";
  save();
  render();
}

/* ================= FINISHED → WAITING ================= */
function setWaiting(index) {
  const emp = employees[index];

  if (!emp.working) return;

  emp.working = false;
  emp.waitingFrom = Date.now();

  save();
  render();
}

/* ================= BOX EDIT / DELETE ================= */
function editBox(empIndex, boxIndex) {
  const current = employees[empIndex].boxes[boxIndex].label;
  const input = prompt("Edit box", current);
  if (!input) return;

  const parsed = parseBoxInput(input);
  if (!parsed) return alert("Invalid format");

  employees[empIndex].boxes[boxIndex] = parsed;
  save();
  render();
}

function deleteBox(empIndex, boxIndex) {
  if (!askPin()) return;
  employees[empIndex].boxes.splice(boxIndex, 1);
  save();
  render();
}

/* ================= TOTALS ================= */
function totals() {
  let totalQty = 0;
  let totalBoxes = 0;

  employees.forEach(e => {
    totalBoxes += e.boxes.length;
    totalQty += e.boxes.reduce((s, b) => s + b.qty, 0);
  });

  return { totalQty, totalBoxes };
}

/* ================= RENDER ================= */
function render() {
  employeesRow.innerHTML = "";

  employees.forEach((e, i) => {
    const total = e.boxes.reduce((s, b) => s + b.qty, 0);
    const waitingTime = formatDuration(getWaitingMs(e));

    const div = document.createElement("div");
    div.className = "employee" + (!e.working ? " waiting" : "");

    div.innerHTML = `
      <div class="emp-info">
        <div class="emp-left">
          <div class="emp-label">#${e.no} - ${e.name}</div>
        </div>

        <div class="emp-actions">
          <button class="wait-btn"
            onclick="setWaiting(${i})"
            ${!e.working ? "disabled" : ""}>
            ⏸ Finished
          </button>

          <button onclick="deleteEmployee(${i})" class="del-btn">🗑</button>
        </div>
      </div>

      <div class="boxes">
        ${e.boxes.map((b, bi) => `
          <div class="box ${b.type || "default"}" onclick="editBox(${i},${bi})">
            ${b.label}
            <small>${b.time}</small>
            <button onclick="event.stopPropagation();deleteBox(${i},${bi})">×</button>
          </div>
        `).join("")}
      </div>

      <div class="stats">
        Boxes: ${e.boxes.length}<br>
        Total Qty: ${total}<br>
        Waiting: ${waitingTime}
      </div>
    `;

    employeesRow.appendChild(div);
  });

  const t = totals();
  summary.innerHTML =
    `Total Boxes: ${t.totalBoxes}<br>Total Quantity: ${t.totalQty}`;
}
/* ================= SELECT ================= */
function updateSelect() {
  empSelect.innerHTML = `<option value="">Select</option>`;
  employees.forEach((e, i) => {
    empSelect.innerHTML += `<option value="${i}">#${e.no} → ${e.name}</option>`;
  });
}

/* ================= RESET ================= */
function dailyReset() {
  if (!askPin()) return;

  employees.forEach(e => {
    e.boxes = [];
    e.working = false;
    e.waitingFrom = Date.now();
    e.totalWaitingMs = 0;
  });

  save();
  render();
}

/* CSV EXPORT */
function exportCSV() {
  if (!employees.length) return alert("No data to export");

  const max = Math.max(0, ...employees.map(e => e.boxes.length));

  let csv = "Employee Number,Employee Name";

  // Bold-friendly headers
  for (let i = 1; i <= max; i++) {
    csv += `,="B${i}"`;
  }

  csv += ",Total Quantity,Box Count\n";

  let grandTotalQty = 0;
  let grandTotalBoxes = 0;

  employees.forEach(emp => {
    const boxes = emp.boxes;

    const totalQty = boxes.reduce((s, b) => s + b.qty, 0);
    const boxCount = boxes.length;

    grandTotalQty += totalQty;
    grandTotalBoxes += boxCount;

    csv += `${emp.no},${emp.name}`;

    boxes.forEach(b => {
      csv += `,${b.label}`;
    });

    for (let i = boxes.length; i < max; i++) {
      csv += ",";
    }

    csv += `,${totalQty},${boxCount}\n`;
  });

  csv += `\nTotal Quantity,${grandTotalQty}\n`;
  csv += `Total Boxes,${grandTotalBoxes}\n`;

  const d = new Date();
  const pad = n => String(n).padStart(2, "0");
  const timestamp =
    `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_` +
    `${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `distribution_${timestamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}
function exportAnalysisJSON() {
  const data = {
    exportedAt: new Date().toISOString(),
    employees: employees.map(emp => ({
      number: emp.number,
      name: emp.name,
      boxes: emp.boxes.map(b => ({
        qty: b.qty,
        time: b.time
      }))
    }))
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "distribution-analysis-data.json";
  a.click();
}

/* ================= INIT ================= */
updateSelect();
render();
setInterval(render, 1000);
