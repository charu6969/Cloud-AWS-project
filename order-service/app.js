const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: "RDS_ENDPOINT",
  user: "admin",
  password: "PASSWORD",
  database: "ecommerce",
});

app.post("/order", (req, res) => {
  const { total } = req.body;
  db.query("INSERT INTO Orders (total) VALUES (?)", [total], () =>
    res.json({ message: "Order placed successfully" })
  );
});

app.listen(3003, () => console.log("Order Service running on port 3003"));
