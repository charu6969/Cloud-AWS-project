const PRODUCT_API = "http://EC2_PUBLIC_IP:3001/products";
const CART_API = "http://EC2_PUBLIC_IP:3002/cart";
const ORDER_API = "http://EC2_PUBLIC_IP:3003/order";

fetch(PRODUCT_API)
  .then((res) => res.json())
  .then((data) => {
    const container = document.getElementById("products");
    data.forEach((p) => {
      container.innerHTML += `
        <div class="card">
          <img src="${p.image}">
          <h3>${p.name}</h3>
          <p>₹${p.price}</p>
          <button onclick="addToCart(${p.price})">Add to Cart</button>
        </div>
      `;
    });
  });

let total = 0;

function addToCart(price) {
  total += price;
  fetch(CART_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ price }),
  });
}

function checkout() {
  fetch(ORDER_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ total }),
  }).then(() => alert("Order Placed Successfully!"));
}
