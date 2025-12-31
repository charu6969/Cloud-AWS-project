import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Cart.css";

function Cart({ onCartUpdate }) {
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/cart`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      setCart(data);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch cart:", error);
      setLoading(false);
    }
  };

  const updateQuantity = async (productId, newQuantity) => {
    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user"));

      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/cart/${user.id}/${productId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ quantity: newQuantity }),
        }
      );

      if (response.ok) {
        fetchCart();
        onCartUpdate();
      }
    } catch (error) {
      console.error("Failed to update quantity:", error);
    }
  };

  const removeItem = async (productId) => {
    updateQuantity(productId, 0);
  };

  if (loading) return <div className="loading">Loading cart...</div>;

  if (cart.items.length === 0) {
    return (
      <div className="empty-cart">
        <h2>Your cart is empty</h2>
        <button onClick={() => navigate("/")} className="btn-shop">
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="cart-container">
      <h1>Shopping Cart</h1>
      <p className="cloud-info">
        ☁️ <strong>CO3:</strong> Data managed by Cart Microservice
      </p>

      <div className="cart-content">
        <div className="cart-items">
          {cart.items.map((item) => (
            <div key={item.product_id} className="cart-item">
              <img src={item.image_url} alt={item.name} />
              <div className="item-details">
                <h3>{item.name}</h3>
                <p className="item-price">${item.price}</p>
              </div>
              <div className="quantity-controls">
                <button
                  onClick={() =>
                    updateQuantity(item.product_id, item.quantity - 1)
                  }
                >
                  -
                </button>
                <span>{item.quantity}</span>
                <button
                  onClick={() =>
                    updateQuantity(item.product_id, item.quantity + 1)
                  }
                >
                  +
                </button>
              </div>
              <div className="item-total">
                ${(item.price * item.quantity).toFixed(2)}
              </div>
              <button
                className="btn-remove"
                onClick={() => removeItem(item.product_id)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="cart-summary">
          <h2>Order Summary</h2>
          <div className="summary-row">
            <span>Subtotal:</span>
            <span>${cart.total.toFixed(2)}</span>
          </div>
          <div className="summary-row">
            <span>Shipping:</span>
            <span>FREE</span>
          </div>
          <div className="summary-row total">
            <span>Total:</span>
            <span>${cart.total.toFixed(2)}</span>
          </div>
          <button
            className="btn-checkout"
            onClick={() => navigate("/checkout")}
          >
            Proceed to Checkout
          </button>
          <button className="btn-continue" onClick={() => navigate("/")}>
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}

export default Cart;
