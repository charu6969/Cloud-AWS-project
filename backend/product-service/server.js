```javascript
/**
 * CO3: Product Microservice
 * CO4: Runs on EC2 Virtual Machine (IaaS)
 * Handles all product-related operations
 * Independent deployment and scaling
 */

const express = require('express');
const multer = require('multer');
const pool = require('../shared/config/database');
const { uploadToS3 } = require('../shared/config/s3');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Health check for load balancer
app.get('/health', (req, res) => {
  res.json({ 
    service: 'product-service',
    status: 'healthy',
    instance: process.env.INSTANCE_ID || 'local',
    timestamp: new Date().toISOString()
  });
});

// Get all products with pagination
app.get('/products', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      'SELECT * FROM products WHERE active = true ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM products WHERE active = true'
    );

    res.json({
      products: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      totalPages: Math.ceil(countResult.rows[0].count / limit)
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get single product
app.get('/products/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM products WHERE id = $1 AND active = true',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create product (Admin only - checked in API Gateway)
app.post('/products', upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, category, stock } = req.body;
    
    let imageUrl = null;
    // CO1: Upload image to S3
    if (req.file) {
      imageUrl = await uploadToS3(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );
    }

    const result = await pool.query(
      `INSERT INTO products (name, description, price, category, stock, image_url, active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING *`,
      [name, description, price, category, stock, imageUrl]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Product creation error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product stock (for order processing)
app.patch('/products/:id/stock', async (req, res) => {
  try {
    const { quantity } = req.body;
    
    const result = await pool.query(
      'UPDATE products SET stock = stock - $1 WHERE id = $2 RETURNING *',
      [quantity, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

app.listen(PORT, () => {
  console.log(`🛍️  Product Service running on port ${PORT}`);
  console.log(`📦 CO3: Independent microservice - Product domain`);
  console.log(`☁️  CO4: Running on EC2 instance (IaaS)`);
});
```