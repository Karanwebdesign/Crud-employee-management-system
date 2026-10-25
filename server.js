const express = require("express");
const fs = require("fs");
const path = require("path");
const initSqlJs = require("sql.js");

const app = express();
const PORT = 3000;
const dbFile = path.join(__dirname, "employees.sqlite");
const jsonFile = path.join(__dirname, "employees.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let db;

function saveDatabase() {
  fs.writeFileSync(dbFile, Buffer.from(db.export()));
}

function getEmployees() {
  return db.exec("SELECT * FROM employees");
}

function rowsToObjects(result) {
  if (!result.length) return [];
  return result[0].values.map((row) =>
    Object.fromEntries(
      result[0].columns.map((column, i) => [column, row[i]])
    )
  );
}

function getEmployee(id) {
  const result = db.exec(
    "SELECT * FROM employees WHERE id = ?",
    [Number(id)]
  );
  return rowsToObjects(result)[0];
}

function validEmployee(data) {
  return (
    typeof data.name === "string" && data.name.trim() &&
    typeof data.department === "string" && data.department.trim() &&
    typeof data.role === "string" && data.role.trim() &&
    data.salary !== "" && data.salary !== null &&
    Number.isFinite(Number(data.salary)) && Number(data.salary) >= 0 &&
    typeof data.join_date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(data.join_date)
  );
}

async function startServer() {
  const SQL = await initSqlJs();

  if (fs.existsSync(dbFile)) {
    db = new SQL.Database(
      new Uint8Array(fs.readFileSync(dbFile))
    );
  } else {
    db = new SQL.Database();

    db.run(`
      CREATE TABLE employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        department TEXT NOT NULL,
        role TEXT NOT NULL,
        salary REAL NOT NULL CHECK (salary >= 0),
        join_date TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    if (fs.existsSync(jsonFile)) {
      try {
        const employees = JSON.parse(
          fs.readFileSync(jsonFile, "utf8")
        );

        for (const e of employees) {
          if (
            e.name && e.department && e.role &&
            Number.isFinite(Number(e.salary)) &&
            e.join_date
          ) {
            db.run(
              `INSERT INTO employees
               (name, department, role, salary, join_date)
               VALUES (?, ?, ?, ?, ?)`,
              [
                e.name, e.department, e.role,
                Number(e.salary), e.join_date
              ]
            );
          }
        }
      } catch (error) {
        console.error("Could not import employees.json:", error.message);
      }
    }

    saveDatabase();
  }

  app.get("/api/employees", (req, res) => {
    const all = rowsToObjects(getEmployees());
    const search = String(req.query.search || "").toLowerCase();

    let filtered = all.filter((e) =>
      [e.name, e.department, e.role]
        .some((v) => String(v).toLowerCase().includes(search))
    );

    const allowed = ["id", "name", "department", "role", "salary", "join_date"];
    const sort = allowed.includes(req.query.sort)
      ? req.query.sort
      : "id";

    const direction = req.query.direction === "desc" ? -1 : 1;

    filtered.sort((a, b) => {
      const x = a[sort];
      const y = b[sort];
      if (typeof x === "number" && typeof y === "number") {
        return (x - y) * direction;
      }
      return String(x ?? "").localeCompare(String(y ?? "")) * direction;
    });

    res.json(filtered);
  });

  app.get("/api/employees/:id", (req, res) => {
    const employee = getEmployee(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.json(employee);
  });

  app.post("/api/employees", (req, res) => {
    if (!validEmployee(req.body)) {
      return res.status(400).json({ message: "Please enter valid employee details" });
    }

    const { name, department, role, salary, join_date } = req.body;

    db.run(
      `INSERT INTO employees (name, department, role, salary, join_date)
       VALUES (?, ?, ?, ?, ?)`,
      [name.trim(), department.trim(), role.trim(), Number(salary), join_date]
    );

    saveDatabase();

    res.status(201).json({
      message: "Employee added successfully",
      employee: getEmployee(db.exec("SELECT last_insert_rowid() AS id")[0].values[0][0])
    });
  });

  app.put("/api/employees/:id", (req, res) => {
    const id = Number(req.params.id);

    if (!getEmployee(id)) {
      return res.status(404).json({ message: "Employee not found" });
    }

    if (!validEmployee(req.body)) {
      return res.status(400).json({ message: "Please enter valid employee details" });
    }

    const { name, department, role, salary, join_date } = req.body;

    db.run(
      `UPDATE employees
       SET name = ?, department = ?, role = ?, salary = ?, join_date = ?
       WHERE id = ?`,
      [name.trim(), department.trim(), role.trim(), Number(salary), join_date, id]
    );

    saveDatabase();
    res.json({
      message: "Employee updated successfully",
      employee: getEmployee(id)
    });
  });

  app.delete("/api/employees/:id", (req, res) => {
    const id = Number(req.params.id);

    if (!getEmployee(id)) {
      return res.status(404).json({ message: "Employee not found" });
    }

    db.run("DELETE FROM employees WHERE id = ?", [id]);
    saveDatabase();

    res.json({ message: "Employee deleted successfully" });
  });

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Server failed to start:", error);
});