const express = require("express");
const axios = require("axios");
const pool = require("../shared/config/database");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());

// Service URLs
const PRODUCT_SERVICE =
  process.env.PRODUCT_SERVICE_URL || "http://localhost:3001";
const CART_SERVICE = process.env.CART_SERVICE_URL || "http://localhost:3002";

// Health check
app.get("/health", (req, res) => {
  res.json({
    service: "order-service",
    status: "healthy",
    instance: process.env.INSTANCE_ID || "local",
  });
});

// Create order
app.post("/orders", async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { userId, shippingAddress, paymentMethod } = req.body;

    // Fetch cart items
    const cartResponse = await axios.get(`${CART_SERVICE}/cart/${userId}`);

    const { items, total } = cartResponse.data;

    if (items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    // CO1: SaaS Integration - Payment Gateway (Simulated)
    const paymentResult = await processPayment(paymentMethod, total);

    if (!paymentResult.success) {
      throw new Error("Payment failed");
    }

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, total_amount, status, shipping_address, payment_method, payment_id)
       VALUES ($1, $2, 'processing', $3, $4, $5)
       RETURNING *`,
      [
        userId,
        total,
        JSON.stringify(shippingAddress),
        paymentMethod,
        paymentResult.transactionId,
      ]
    );

    const orderId = orderResult.rows[0].id;

    // Create order items
    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [orderId, item.product_id, item.quantity, item.price]
      );

      // Update product stock
      await axios.patch(
        `${PRODUCT_SERVICE}/products/${item.product_id}/stock`,
        {
          quantity: item.quantity,
        }
      );
    }

    // Clear cart
    await axios.delete(`${CART_SERVICE}/cart/${userId}`);

    await client.query("COMMIT");

    res.status(201).json({
      order: orderResult.rows[0],
      message: "Order placed successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Order creation error:", error);
    res.status(500).json({ error: "Failed to create order" });
  } finally {
    client.release();
  }
});

// Get user orders
app.get("/orders/:userId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, 
              json_agg(json_build_object(
                'product_id', oi.product_id,
                'quantity', oi.quantity,
                'price', oi.price,
                'name', p.name,
                'image_url', p.image_url
              )) as items
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [req.params.userId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// Get order details
app.get("/orders/detail/:orderId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, 
              json_agg(json_build_object(
                'product_id', oi.product_id,
                'quantity', oi.quantity,
                'price', oi.price,
                'name', p.name,
                'image_url', p.image_url
              )) as items
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       WHERE o.id = $1
       GROUP BY o.id`,
      [req.params.orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

/**
 * CO1: SaaS Integration - Simulated Payment Gateway
 * In production: Stripe, PayPal, Square, etc.
 */
async function processPayment(paymentMethod, amount) {
  // Simulate payment processing
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        transactionId: `TXN-${Date.now()}`,
        amount,
        method: paymentMethod,
      });
    }, 1000);
  });
}

app.listen(PORT, () => {
  console.log(`💳 Order Service running on port ${PORT}`);
  console.log(`📦 CO3: Independent microservice - Order domain`);
  console.log(`💰 CO1: SaaS payment integration configured`);
});
