# Employee Management System

A responsive full-stack CRUD application built for the WeIntern Full Stack Development Week 2 Task 2.

## Features
- Create employee records with name, department, role, salary, and join date
- Read and view employee records in a searchable, sortable table
- Update employee details using a pre-filled form
- Delete employee records with a confirmation prompt
- Backend REST API with `GET`, `POST`, `PUT`, and `DELETE` endpoints
- Employee records stored in a local SQLite database
- Frontend and backend validation
- Responsive desktop, tablet, and mobile layout
- Summary cards for employee count, departments, and monthly payroll

## Technology
- HTML5, CSS3, JavaScript (Fetch API)
- Node.js and Express.js
- SQLite database using sql.js
- Postman collection in `postman/employee-management.postman_collection.json`

## Requirements
Install Node.js 18 or later. npm is included with Node.js.

## Run locally
1. Download or clone this repository.
2. Open a terminal in the project folder.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm start
   ```
5. Open `http://localhost:3000` in your browser.

The "employees.sqlite" database file is created automatically when the server starts for the first time. If an existing database is present, it is loaded when the server starts.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/employees` | List employees; supports `search`, `sort`, and `direction` query parameters |
| GET | `/api/employees/:id` | Get one employee |
| POST | `/api/employees` | Create an employee |
| PUT | `/api/employees/:id` | Update an employee |
| DELETE | `/api/employees/:id` | Delete an employee |

## Test with Postman
Import `postman/employee-management.postman_collection.json` into Postman. Start the server first. The collection includes requests for listing, creating, reading, updating, and deleting employees. Run Create before Update/Delete and replace `{{employeeId}}` with the ID returned by Create.

## Database schema
The SQLite database has an `employees` table with:
- `id` — auto-generated primary key
- `name` — required employee name
- `department` — required department
- `role` — required job role
- `salary` — required non-negative numeric salary
- `join_date` — required date (`YYYY-MM-DD`)
- `created_at` — record creation timestamp

## Notes
This project is intended for local learning and demonstration. For production deployment, use a persistent database/service and configure environment variables, authentication, authorization, and secure hosting. GitHub Pages alone cannot run the Node.js backend.
