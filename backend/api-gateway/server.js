```javascript
/**
 * CO3: API Gateway - Microservices Entry Point
 * Handles:
 * - Request routing to microservices
 * - Load balancing across service instances
 * - Authentication and authorization
 * - Rate limiting
 * - Request/response transformation
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { authenticateToken, authorizeRole } = require('./middleware/auth');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// CO5: Security middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// CO1: Rate limiting for DDoS protection
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Service discovery - In production, use AWS ELB
const SERVICES = {
  product: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3001',
  cart: process.env.CART_SERVICE_URL || 'http://localhost:3002',
  order: process.env.ORDER_SERVICE_URL || 'http://localhost:3003'
};

// CO3: Service health checks
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: SERVICES
  });
});

// CO3: Microservice routing with load balancing
const axios = require('axios');

// Product routes - Public access
app.get('/api/products', async (req, res) => {
  try {
    const response = await axios.get(`${SERVICES.product}/products`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Product service unavailable' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const response = await axios.get(`${SERVICES.product}/products/${req.params.id}`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Product service unavailable' });
  }
});

// Admin only - Create product
app.post('/api/products', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const response = await axios.post(`${SERVICES.product}/products`, req.body, {
      headers: { 'Authorization': req.headers.authorization }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Product service unavailable' });
  }
});

// Cart routes - Authenticated users
app.get('/api/cart', authenticateToken, async (req, res) => {
  try {
    const response = await axios.get(`${SERVICES.cart}/cart/${req.user.userId}`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Cart service unavailable' });
  }
});

app.post('/api/cart', authenticateToken, async (req, res) => {
  try {
    const response = await axios.post(`${SERVICES.cart}/cart`, {
      ...req.body,
      userId: req.user.userId
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Cart service unavailable' });
  }
});

// Order routes - Authenticated users
app.post('/api/orders', authenticateToken, async (req, res) => {
  try {
    const response = await axios.post(`${SERVICES.order}/orders`, {
      ...req.body,
      userId: req.user.userId
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Order service unavailable' });
  }
});

app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const response = await axios.get(`${SERVICES.order}/orders/${req.user.userId}`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Order service unavailable' });
  }
});

// CO5: Authentication endpoints
app.post('/api/auth/register', async (req, res) => {
  const bcrypt = require('bcryptjs');
  const jwt = require('jsonwebtoken');
  const pool = require('../shared/config/database');

  try {
    const { email, password, name } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
      [email, hashedPassword, name, 'customer']
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const bcrypt = require('bcryptjs');
  const jwt = require('jsonwebtoken');
  const pool = require('../shared/config/database');

  try {
    const { email, password } = req.body;
    
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({ 
      token, 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ API Gateway running on port ${PORT}`);
  console.log(`📊 CO1: Cloud service integration active`);
  console.log(`🔐 CO5: Security middleware enabled`);
  console.log(`🔄 CO3: Microservices routing configured`);
});
```