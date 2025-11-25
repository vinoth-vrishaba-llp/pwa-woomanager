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

app.get('/api/categories', async (req, res) => {
  try {
    const { config } = req.query;
    const parsedConfig = JSON.parse(config);

    const categories = await WooService.getProductCategories(parsedConfig);

    res.json({ categories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get customers (enriched with total_spent + orders_count)
app.post('/api/customers', async (req, res) => {
  try {
    const { config } = req.body;
    if (!config) return res.status(400).json({ error: 'Missing config' });

    // Fetch both in parallel
    const [customersBase, orders] = await Promise.all([
      WooService.getCustomers(config, config.useMock),
      WooService.getOrders(config, config.useMock),
    ]);

    // 1) Build stats map from orders
    const statsByKey = new Map();

    orders.forEach((o) => {
      // Prefer customer_id if > 0, otherwise use billing_email (guest)
      let key = null;

      if (o.customer_id && o.customer_id !== 0) {
        key = `id:${o.customer_id}`;
      } else if (o.billing_email) {
        key = `email:${o.billing_email.toLowerCase()}`;
      }

      if (!key) return;

      const existing = statsByKey.get(key) || {
        total_spent: 0,
        orders_count: 0,
      };

      existing.total_spent += Number(o.total) || 0;
      existing.orders_count += 1;

      statsByKey.set(key, existing);
    });

    // 2) Enrich customers with stats
    const customers = customersBase.map((c) => {
      // Try by id first, then email
      let stats = null;

      if (c.id) {
        stats = statsByKey.get(`id:${c.id}`) || null;
      }

      if (!stats && c.email) {
        stats = statsByKey.get(`email:${c.email.toLowerCase()}`) || null;
      }

      return {
        ...c,
        total_spent: stats ? stats.total_spent : 0,
        orders_count: stats ? stats.orders_count : 0,
      };
    });

    res.json({ customers });
  } catch (err) {
    console.error('Customers API error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Sales report (default: last 7 days)
app.post('/api/reports/sales', async (req, res) => {
  try {
    const { config, date_min, date_max } = req.body;
    if (!config) return res.status(400).json({ error: 'Missing config' });

    let startDate = date_min;
    let endDate = date_max;

    // Default: last 30 days
if (!startDate || !endDate) {
  const now = new Date();
  const end = new Date(now);
  end.setUTCHours(23, 59, 59, 999);

  const start = new Date(now);
  start.setDate(start.getDate() - 29); // 30 days including today
  start.setUTCHours(0, 0, 0, 0);

  const fmt = (d) => d.toISOString().slice(0, 10);

  startDate = fmt(start);
  endDate = fmt(end);
}


    const report = await WooService.getSalesReport(config, {
      date_min: startDate,
      date_max: endDate,
    });

    res.json({
      report,
      date_min: startDate,
      date_max: endDate,
    });
  } catch (err) {
    console.error('Sales report API error:', err);
    res.status(500).json({ error: err.message });
  }
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
