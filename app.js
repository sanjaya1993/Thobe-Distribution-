/* CONFIG */
const SUPERVISOR_PIN = "";

/* DATA */
let employees = JSON.parse(localStorage.getItem("employees") || "[]");

/* HELPERS */
function save() {
  localStorage.setItem("employees", JSON.stringify(employees));
}

function nowTime() {
  return new Date().toLocaleTimeString();
}

function askPin() {
  return prompt("Supervisor PIN") === SUPERVISOR_PIN;
}

/* PIN SCREEN */
function unlock() {
  if (pinInput.value === SUPERVISOR_PIN) {
    pinScreen.style.display = "none";
  } else {
    alert("Wrong PIN");
  }
}

/* PARSE BOX INPUT — supports: 1, 1J, 1N */
function parseBoxInput(input) {
  const trimmed = input.trim().toUpperCase();

  // Case 1: Only number
  if (/^\d+$/.test(trimmed)) {
    return {
      qty: parseInt(trimmed),
      type: "",
      label: trimmed,
      time: nowTime()
    };
  }

  // Case 2: Number + letter (J/N)
  const match = trimmed.match(/^(\d+)([A-Z])$/);
  if (match) {
    return {
      qty: parseInt(match[1]),
      type: match[2],
      label: `${match[1]}${match[2]}`,
      time: nowTime()
    };
  }

  return null;
}

/* EMPLOYEES */
function addEmployee() {
  const no = empNumber.value.trim();
  const name = empName.value.trim();

  if (!no || !name) return;
  if (employees.some(e => e.no === no)) return alert("Employee already exists");

  employees.push({ no, name, boxes: [] });

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

/* BOXES */
function assignBox() {
  const empIndex = empSelect.value;
  const raw = qtyInput.value.trim();

  if (empIndex === "") return alert("Select employee");

  const parsed = parseBoxInput(raw);
  if (!parsed) {
    alert("Invalid format. Use: 1 or 1J or 1N");
    return;
  }

  employees[empIndex].boxes.push(parsed);

  qtyInput.value = "";
  save();
  render();
}

function editBox(empIndex, boxIndex) {
  const current = employees[empIndex].boxes[boxIndex].label;
  const input = prompt("Edit box", current);
  if (!input) return;

  const parsed = parseBoxInput(input);
  if (!parsed) return alert("Invalid format. Use: 1 or 1J or 1N");

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

/* CALCULATIONS */
function totals() {
  let totalQty = 0;
  let totalBoxes = 0;

  employees.forEach(e => {
    totalBoxes += e.boxes.length;
    totalQty += e.boxes.reduce((sum, b) => sum + b.qty, 0);
  });

  return { totalQty, totalBoxes };
}

function nextEmployeeIndex() {
  let min = Infinity;
  let idx = -1;

  employees.forEach((e, i) => {
    const t = e.boxes.reduce((s, b) => s + b.qty, 0);
    if (t < min) {
      min = t;
      idx = i;
    }
  });

  return idx;
}

/* RENDER UI */
function render() {
  employeesRow.innerHTML = "";
  const next = nextEmployeeIndex();

  employees.forEach((e, i) => {
    const total = e.boxes.reduce((s, b) => s + b.qty, 0);

    const div = document.createElement("div");
    div.className = "employee" + (i === next ? " highlight" : "");

    div.innerHTML = `
      <div class="emp-info">
        <div class="emp-no">#${e.no}</div>
        <div class="emp-name">${e.name}</div>
        <button onclick="deleteEmployee(${i})" class="del-btn">🗑</button>
      </div>

      <div class="boxes">
        ${e.boxes
          .map((b, bi) => {
            const cls = b.type === "J" ? "j" : b.type === "N" ? "n" : "default";

            return `
              <div class="box ${cls}" onclick="editBox(${i},${bi})">
                ${b.label}
                <small>${b.time}</small>
                <button onclick="event.stopPropagation();deleteBox(${i},${bi})">×</button>
              </div>
            `;
          })
          .join("")}
      </div>

      <div class="stats">
        Boxes: ${e.boxes.length}<br>
        Total: ${total}
      </div>
    `;

    employeesRow.appendChild(div);
  });

  const t = totals();
  summary.innerHTML = `Total Boxes: ${t.totalBoxes}<br>Total Quantity: ${t.totalQty}`;
}

/* SELECT DROPDOWN */
function updateSelect() {
  empSelect.innerHTML = `<option value="">Select</option>`;
  employees.forEach((e, i) => {
    empSelect.innerHTML += `<option value="${i}">#${e.no} → ${e.name}</option>`;
  });
}

/* RESET */
function dailyReset() {
  if (!askPin()) return;
  employees.forEach(e => (e.boxes = []));
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

/* INIT */
updateSelect();
render();