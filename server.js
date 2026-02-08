const path = require("path");
const express = require("express");
const mysql = require("mysql2");
const app = express();

app.use(express.json());

// Connecting through mySQL
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root@123",
  database: "servicedesk"
});

// Automation Rules
function detectCategory(issue) {
  issue = issue.toLowerCase();

  const rules = [
    {category : "O365", keywords : ["outlook", "teams", "mail", "support"]},
    {category : "Account", keywords : ["password"]},
    {category : "Network", keywords : ["network", "vpn"]},
    {category : "Backend", keywords : ["backend", "api", "connection"]}
  ];

  for (const rule of rules){
    if (rule.keywords.some(word => issue.includes(word))){
        return rule.category;
    }
  }

  return "General";
}

// function detectPriority(issue) {
//     issue = issue.toLowerCase();

//     const rules = [
//         {category : "High", keywords : ["urgent", "high", "immediate", "emergency", "empty"]},
//         {category : "Medium", keywords : ["not working", "medium", "fix"]}
//         // {category : "Low", keywords : ["low", "minor", "can wait"]}
//     ];

//     for (const rule of rules){
//         if (rule.keywords.some(word => issue.includes(word))){
//             return rule.category;
//         }
//     }

//     return "Low";
// }

function detectPriority(issue){
    issue = issue.toLowerCase();

    if (issue.includes("not working") || issue.includes("urgent") || issue.includes("high") || issue.includes("immediate") || issue.includes("emergency") || issue.includes("empty")) return "High";
    if (issue.includes("medium") || issue.includes("fix")) return "medium";
    return "Low";

}

function assignTeam(category) {
  if (category === "O365") return "O365 Support";
  if (category === "Network") return "Infra Team";
  if (category === "Account") return "IAM Team";
  if (category === "Backend") return "Backend Team";
  return "General Support";
}

// Create API for Ticket
app.post("/api/create-ticket", (req, res) => {
  const { employee, issue } = req.body;

  const category = detectCategory(issue);
  const priority = detectPriority(issue);
  const team = assignTeam(category);
  const ticketId = "INC" + Date.now();

  const query = `
    INSERT INTO tickets 
    (ticket_id, employee, issue, category, priority, assigned_team, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(query, [
    ticketId,
    employee,
    issue,
    category,
    priority,
    team,
    "Open"
  ]);

  res.json({
    message: "Ticket created",
    ticketId,
    category,
    priority,
    assignedTeam: team
  });
});

// View Tickets - API
app.get("/api/tickets", (req, res) => {
  db.query("SELECT * FROM tickets", (err, results) => {
    res.json(results);
  });
});

app.get("/api/health", (req, res) => {
    res.json({
      status: "UP",
      message: "Server is connected"
    });
});

// Get all tickets (Admin view)
app.get("/api/tickets", (req, res) => {
    const {employee} = req.params;

    const query = "SELECT * FROM tickets where employee = ? ORDER BY created_at DESC";
  
    db.query(query, employee, (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to fetch tickets" });
      }
      res.json(results);
    });
});
  

// Serve frontend
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});


app.listen(3000, () => {
  console.log("Server running on port 3000");
});
