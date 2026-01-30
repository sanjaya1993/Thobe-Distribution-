const SUPERVISOR_PIN = "";
let employees = JSON.parse(localStorage.getItem("employees") || "[]");

/* SAVE */
function save() {
  localStorage.setItem("employees", JSON.stringify(employees));
}

/* PIN */
function unlock() {
  if (pinInput.value === SUPERVISOR_PIN) {
    pinScreen.style.display = "none";
  } else alert("Wrong PIN");
}

function askPin() {
  return prompt("Supervisor PIN") === SUPERVISOR_PIN;
}

/* TIME */
function nowTime() {
  return new Date().toLocaleTimeString();
}

/* EMPLOYEE */
function addEmployee() {
  const no = empNumber.value.trim();
  const name = empName.value.trim();
  if (!no || !name) return;
  if (employees.some(e => e.no === no)) return alert("Exists");

  employees.push({ no, name, boxes: [] });
  empNumber.value = empName.value = "";
  save(); updateSelect(); render();
}

function deleteEmployee(i) {
  if (!askPin()) return;
  employees.splice(i, 1);
  save(); updateSelect(); render();
}

/* BOX */
function assignBox() {
  const i = empSelect.value;
  const input = qtyInput.value.trim();
  if (i === "" || !input) return;

  const match = input.match(/\d+/);
  if (!match) return alert("Must contain number");

  employees[i].boxes.push({
    label: input,
    qty: Number(match[0]),
    time: nowTime()
  });

  qtyInput.value = "";
  save(); render();
}

function editBox(ei, bi) {
  const cur = employees[ei].boxes[bi].label;
  const input = prompt("Edit", cur);
  if (!input) return;

  const match = input.match(/\d+/);
  if (!match) return alert("Must contain number");

  employees[ei].boxes[bi].label = input;
  employees[ei].boxes[bi].qty = Number(match[0]);
  save(); render();
}

function deleteBox(ei, bi) {
  if (!askPin()) return;
  employees[ei].boxes.splice(bi, 1);
  save(); render();
}

/* CALC */
function nextEmployeeIndex() {
  let min = Infinity, idx = -1;
  employees.forEach((e,i)=>{
    const t = e.boxes.reduce((s,b)=>s+b.qty,0);
    if (t < min) { min = t; idx = i; }
  });
  return idx;
}

function totals() {
  let totalQty = 0, totalBoxes = 0;
  employees.forEach(e=>{
    totalBoxes += e.boxes.length;
    totalQty += e.boxes.reduce((s,b)=>s+b.qty,0);
  });
  return { totalQty, totalBoxes };
}

/* RENDER */
function render() {
  employeesRow.innerHTML = "";
  const next = nextEmployeeIndex();

  employees.forEach((e,i)=>{
    const total = e.boxes.reduce((s,b)=>s+b.qty,0);
    const div = document.createElement("div");
    div.className = "employee" + (i===next?" highlight":"");

    div.innerHTML = `
      <div class="emp-info">
        <div class="emp-no">#${e.no}</div>
        <div class="emp-name">${e.name}</div>
        <button onclick="deleteEmployee(${i})" class="del-btn">🗑</button>
      </div>

      <div class="boxes">
        ${e.boxes.map((b,bi)=>{
          const letter = b.label.replace(/[0-9]/g,"").toUpperCase();
          let cls = "default";
          if (letter==="J") cls="j";
          else if (letter==="N") cls="n";

          return `
            <div class="box ${cls}" onclick="editBox(${i},${bi})">
              ${b.label}
              <small>${b.time}</small>
              <button onclick="event.stopPropagation();deleteBox(${i},${bi})">×</button>
            </div>
          `;
        }).join("")}
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

/* SELECT */
function updateSelect() {
  empSelect.innerHTML = `<option value="">Select</option>`;
  employees.forEach((e,i)=>{
    empSelect.innerHTML += `<option value="${i}">#${e.no} → ${e.name}</option>`;
  });
}

/* RESET */
function dailyReset() {
  if (!askPin()) return;
  employees.forEach(e=>e.boxes=[]);
  save(); render();
}

/* CSV */

  function exportCSV() {
  if (!employees.length) {
    alert("No data to export");
    return;
  }

  // CSV HEADER
  let csv = "Employee Number,Employee Name,Quantities,Total Quantity,Box Count\n";

  let grandTotalQty = 0;
  let grandTotalBoxes = 0;

  employees.forEach(emp => {
    const quantities = emp.boxes.map(b => b.qty).join("|");
    const totalQty = emp.boxes.reduce((s, b) => s + b.qty, 0);
    const boxCount = emp.boxes.length;

    grandTotalQty += totalQty;
    grandTotalBoxes += boxCount;

    // FIXED: emp.no (NOT emp.number)
    csv += `${emp.no},${emp.name},"${quantities}",${totalQty},${boxCount}\n`;
  });

  // GRAND TOTALS
  csv += `\nTotal Quantity,${grandTotalQty}\n`;
  csv += `Total Boxes,${grandTotalBoxes}\n`;

  // DOWNLOAD CSV
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `distribution_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js');
}


/* INIT */
updateSelect();
render();