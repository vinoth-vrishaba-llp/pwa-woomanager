// server/index.js
const express = require('express');
const cors = require('cors');
const WooService = require('./wooService');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Test connection (optional)
app.post('/api/auth/test', async (req, res) => {
  try {
    const { config } = req.body;
    if (!config || !config.url || !config.key || !config.secret) {
      return res.status(400).json({ error: 'Missing credentials' });
    }
    // simple test: try fetching 1 order
    await WooService.getOrders(config, config.useMock);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get orders
app.post('/api/orders', async (req, res) => {
  try {
    const { config } = req.body;
    if (!config) return res.status(400).json({ error: 'Missing config' });
    const orders = await WooService.getOrders(config, config.useMock);
    res.json({ orders });
  } catch (err) {
    console.error('Orders API error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get products
app.post('/api/products', async (req, res) => {
  try {
    const { config } = req.body;
    if (!config) return res.status(400).json({ error: 'Missing config' });
    const products = await WooService.getProducts(config, config.useMock);
    res.json({ products });
  } catch (err) {
    console.error('Products API error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
