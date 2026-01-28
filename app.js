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
  const pin = prompt("Supervisor PIN");
  if (pin !== "1234") {
    alert("Wrong PIN");
    return;
  }

  if (!employees || employees.length === 0) {
    alert("No data to export");
    return;
  }

  let maxBoxes = 0;
  employees.forEach(emp => {
    if (emp.boxes.length > maxBoxes) maxBoxes = emp.boxes.length;
  });

  let csv = "Employee Name";
  for (let i = 1; i <= maxBoxes; i++) {
    csv += `,Box ${i}`;
  }
  csv += ",Total Quantity\n";

  let grandQty = 0;
  let grandBoxes = 0;

  employees.forEach(emp => {
    let empTotal = 0;
    csv += emp.name;

    emp.boxes.forEach(b => {
      const num = parseInt(b.qty); // supports 8J, 7N
      csv += `,${num}`;
      empTotal += num;
      grandBoxes++;
    });

    for (let i = emp.boxes.length; i < maxBoxes; i++) {
      csv += ",";
    }

    csv += `,${empTotal}\n`;
    grandQty += empTotal;
  });

  csv += `Total Quantity${",".repeat(maxBoxes)},${grandQty}\n`;
  csv += `Total Box Quantity${",".repeat(maxBoxes)},${grandBoxes}\n`;

  // ✅ REAL FILE DOWNLOAD (WINDOWS SAFE)
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "distribution_report.csv";
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* INIT */
updateSelect();
render();