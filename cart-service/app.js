const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

let cart = [];

app.post("/cart", (req, res) => {
  cart.push(req.body);
  res.json({ message: "Item added to cart", cart });
});

app.get("/cart", (req, res) => {
  res.json(cart);
});

app.listen(3002, () => console.log("Cart Service running on port 3002"));
