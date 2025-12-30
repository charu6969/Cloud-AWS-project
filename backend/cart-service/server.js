```javascript
/**
 * CO3: Cart Microservice
 * Manages shopping cart operations
 * Uses in-memory storage (Redis in production)
 */

const express = require('express');
const pool = require('../shared/config/database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    service: 'cart-service',
    status: 'healthy',
    instance: process.env.INSTANCE_ID || 'local'
  });
});

// Get user's cart
app.get('/cart/:userId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, p.name, p.price, p.image_url 
       FROM cart_items c
       JOIN products p ON c.product_id = p.id
       WHERE c.user_id = $1`,
      [req.params.userId]
    );

    const total = result.rows.reduce((sum, item) => 
      sum + (item.price * item.quantity), 0
    );

    res.json({
      items: result.rows,
      total,
      itemCount: result.rows.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// Add item to cart
app.post('/cart', async (req, res) => {
  try {
    const { userId, productId, quantity } = req.body;

    // Check if item already in cart
    const existing = await pool.query(
      'SELECT * FROM cart_items WHERE user_id = $1 AND product_id = $2',
      [userId, productId]
    );

    let result;
    if (existing.rows.length > 0) {
      // Update quantity
      result = await pool.query(
        `UPDATE cart_items 
         SET quantity = quantity + $1, updated_at = NOW()
         WHERE user_id = $2 AND product_id = $3
         RETURNING *`,
        [quantity, userId, productId]
      );
    } else {
      // Insert new item
      result = await pool.query(
        `INSERT INTO cart_items (user_id, product_id, quantity)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [userId, productId, quantity]
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add to cart' });
  }
});

// Update cart item quantity
app.put('/cart/:userId/:productId', async (req, res) => {
  try {
    const { quantity } = req.body;

    if (quantity <= 0) {
      // Remove item if quantity is 0
      await pool.query(
        'DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2',
        [req.params.userId, req.params.productId]
      );
      return res.json({ message: 'Item removed from cart' });
    }

    const result = await pool.query(
      `UPDATE cart_items 
       SET quantity = $1, updated_at = NOW()
       WHERE user_id = $2 AND product_id = $3
       RETURNING *`,
      [quantity, req.params.userId, req.params.productId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update cart' });
  }
});

// Clear cart (after order)
app.delete('/cart/:userId', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM cart_items WHERE user_id = $1',
      [req.params.userId]
    );
    res.json({ message: 'Cart cleared' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

app.listen(PORT, () => {
  console.log(`🛒 Cart Service running on port ${PORT}`);
  console.log(`📦 CO3: Independent microservice - Cart domain`);
});
```
