const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

const products = [
  {
    id: 1,
    name: "Cloud Laptop",
    price: 65000,
    image: "https://YOUR_S3_BUCKET_URL/laptop.jpg",
  },
  {
    id: 2,
    name: "Smart Phone",
    price: 25000,
    image: "https://YOUR_S3_BUCKET_URL/phone.jpg",
  },
];

app.get("/products", (req, res) => {
  res.json(products);
});

app.listen(3001, () => console.log("Product Service running on port 3001"));
