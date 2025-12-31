import React, { useEffect, useState } from "react";
import "./Orders.css"; // Create this file for styling

function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/orders`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setOrders(data || []);
      } catch (err) {
        console.error("Orders fetch failed", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  if (loading) return <div className="loading">Loading your orders...</div>;

  return (
    <div className="orders-container">
      <h1>My Order History</h1>
      {orders.length === 0 ? (
        <div className="empty-state">No orders placed yet.</div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <span>Order #ORD-{order.id}</span>
                <span className={`status-badge ${order.status}`}>
                  {order.status}
                </span>
              </div>
              <div className="order-details">
                <p>Date: {new Date(order.created_at).toLocaleDateString()}</p>
                <p className="order-total">Total: ${order.total_amount}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Orders;
