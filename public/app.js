const rows = document.getElementById("employeeRows");
const dialog = document.getElementById("employeeDialog");
const form = document.getElementById("employeeForm");
const toast = document.getElementById("toast");
const fields = ["name", "department", "role", "salary", "join_date"];
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}
function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
}
function currency(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}
function dateLabel(value) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}
function currentQuery() {
  const [sort, direction] = document.getElementById("sortSelect").value.split(":");
  const search = document.getElementById("searchInput").value.trim();
  return `?search=${encodeURIComponent(search)}&sort=${encodeURIComponent(sort)}&direction=${encodeURIComponent(direction)}`;
}
async function loadEmployees() {
  rows.innerHTML = '<tr><td colspan="6" class="loading">Loading employees…</td></tr>';
  try {
    const employees = await api(`/api/employees${currentQuery()}`);
    rows.innerHTML = "";
    if (!employees.length) {
      rows.innerHTML = '<tr><td colspan="6" class="empty-state">No employees found. Click “Add employee” to create your first record.</td></tr>';
    } else {
      for (const employee of employees) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><div class="employee-cell"><div class="employee-avatar">${escapeHTML(initials(employee.name))}</div><div><span class="employee-name">${escapeHTML(employee.name)}</span><span class="employee-id">EMP-${String(employee.id).padStart(4, "0")}</span></div></div></td>
          <td><span class="department-pill">${escapeHTML(employee.department)}</span></td>
          <td>${escapeHTML(employee.role)}</td>
          <td class="salary">${currency(employee.salary)}</td>
          <td>${dateLabel(employee.join_date)}</td>
          <td><div class="action-group"><button class="icon-button edit" data-edit="${employee.id}" aria-label="Edit ${escapeHTML(employee.name)}" title="Edit">✎</button><button class="icon-button delete" data-delete="${employee.id}" aria-label="Delete ${escapeHTML(employee.name)}" title="Delete">⌫</button></div></td>`;
        rows.appendChild(tr);
      }
    }
    document.getElementById("totalEmployees").textContent = employees.length;
    document.getElementById("totalDepartments").textContent = new Set(employees.map(e => e.department)).size;
    document.getElementById("monthlyPayroll").textContent = currency(employees.reduce((sum, e) => sum + Number(e.salary), 0));
    document.getElementById("recordCount").textContent = `${employees.length} employee${employees.length === 1 ? "" : "s"} shown`;
  } catch (error) {
    rows.innerHTML = `<tr><td colspan="6" class="empty-state">${escapeHTML(error.message)} Check that the backend server is running.</td></tr>`;
    showToast(error.message);
  }
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}
function openAddDialog() {
  form.reset();
  document.getElementById("employeeId").value = "";
  document.getElementById("dialogTitle").textContent = "Add employee";
  document.getElementById("saveEmployeeBtn").textContent = "Save employee";
  document.getElementById("formError").textContent = "";
  document.getElementById("join_date").value = new Date().toISOString().slice(0, 10);
  dialog.showModal();
}
async function openEditDialog(id) {
  try {
    const employee = await api(`/api/employees/${id}`);
    document.getElementById("employeeId").value = employee.id;
    for (const field of fields) {
  const input = document.getElementById(field);
  if (input) input.value = employee[field] ?? "";
}
    document.getElementById("dialogTitle").textContent = "Edit employee";
    document.getElementById("saveEmployeeBtn").textContent = "Update employee";
    document.getElementById("formError").textContent = "";
    dialog.showModal();
  } catch (error) { showToast(error.message); }
}
document.getElementById("addEmployeeBtn").addEventListener("click", openAddDialog);
document.getElementById("closeDialog").addEventListener("click", () => dialog.close());
document.getElementById("cancelDialog").addEventListener("click", () => dialog.close());
document.getElementById("searchInput").addEventListener("input", loadEmployees);
document.getElementById("sortSelect").addEventListener("change", loadEmployees);

rows.addEventListener("click", async event => {
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");
  if (editButton) return openEditDialog(editButton.dataset.edit);
  if (deleteButton) {
    const id = deleteButton.dataset.delete;
    const employeeName = deleteButton.closest("tr").querySelector(".employee-name").textContent;
    if (!confirm(`Delete ${employeeName}'s record? This action cannot be undone.`)) return;
    try {
      await api(`/api/employees/${id}`, { method: "DELETE" });
      showToast("Employee deleted successfully.");
      loadEmployees();
    } catch (error) { showToast(error.message); }
  }
});

form.addEventListener("submit", async event => {
  event.preventDefault();
  const id = document.getElementById("employeeId").value;
  const employee = Object.fromEntries(fields.map(field => [field, document.getElementById(field).value.trim()]));
  employee.salary = Number(employee.salary);
  const errors = [];
  if (!employee.name || !employee.department || !employee.role || !employee.join_date) errors.push("Please fill in all fields.");
  if (!Number.isFinite(employee.salary) || employee.salary < 0) errors.push("Enter a valid salary.");
  if (errors.length) {
    document.getElementById("formError").textContent = errors.join(" ");
    return;
  }
  const saveButton = document.getElementById("saveEmployeeBtn");
  saveButton.disabled = true;
  saveButton.textContent = id ? "Updating…" : "Saving…";
  try {
    await api(id ? `/api/employees/${id}` : "/api/employees", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(employee)
    });
    dialog.close();
    showToast(id ? "Employee updated successfully." : "Employee added successfully.");
    await loadEmployees();
  } catch (error) {
    document.getElementById("formError").textContent = error.message;
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = id ? "Update employee" : "Save employee";
  }
});

loadEmployees();
