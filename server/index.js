// server/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const WooService = require('./wooService');
const Baserow = require('./baserowClient');

const app = express();
const PORT = process.env.PORT || 5000;

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const API_BASE_URL = process.env.API_BASE_URL || `http://localhost:${PORT}`;
const WOO_APP_NAME = process.env.WOO_APP_NAME || 'WooManager';
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_ORIGIN,       // Render Frontend
];

app.use(cors({
  origin: function (origin, callback) {
    // allow mobile apps / postman with no origin
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.warn('Blocked CORS origin:', origin);
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// ------------------ SIMPLE CACHE (per store + resource) ------------------
const cache = {
  orders: new Map(),
  products: new Map(),
  customers: new Map(),
  report: new Map(),
};

function cacheKeyFromConfig(config) {
  return WooService.cleanUrl(config.url);
}

function getCached(resource, key, ttlMs) {
  const entry = cache[resource].get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > ttlMs) {
    cache[resource].delete(key);
    return null;
  }
  return entry.data;
}

function setCached(resource, key, data) {
  cache[resource].set(key, { data, ts: Date.now() });
}

// ------------------ RESOLVE CONFIG FROM STORE_ID ------------------
async function resolveConfig({ config, store_id }) {
  // 1) Legacy: direct config from client (manual mode / demo)
  if (config && config.url && config.key && config.secret) {
    return config;
  }

  // 2) Secure path: store_id -> Baserow
  if (store_id) {
    const row = await Baserow.getStoreById(store_id);
    if (!row) throw new Error(`Store not found for id ${store_id}`);

    // these field names must match your Baserow columns
    const url = row.store_url;
    const key = row.consumer_key;
    const secret = row.consumer_secret;

    if (!url || !key || !secret) {
      throw new Error('Incomplete credentials in Baserow for this store');
    }

    return {
      url,
      key,
      secret,
      useProxy: false,
      useMock: false,
    };
  }

  throw new Error('No config or store_id provided');
}

// ------------------ WOO SSO: START AUTH ------------------
app.post('/api/auth/woo/start', (req, res) => {
  try {
    const { store_url, app_user_id } = req.body;
    if (!store_url || !app_user_id) {
      return res.status(400).json({ error: 'store_url and app_user_id are required' });
    }

    const base = WooService.cleanUrl(store_url);
    const endpoint = '/wc-auth/v1/authorize';

    const params = new URLSearchParams({
      app_name: WOO_APP_NAME,
      scope: 'read_write',
      user_id: app_user_id, // you decide the scheme: e.g. "pwa-user-1|mystore.com"
      return_url: `${FRONTEND_ORIGIN}/sso-complete`,
      callback_url: `${API_BASE_URL}/api/auth/woo/callback`,
    });

    const authUrl = `${base}${endpoint}?${params.toString()}`;
    return res.json({ authUrl });
  } catch (err) {
    console.error('Auth start error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ------------------ WOO SSO: CALLBACK (RECEIVE KEYS) ------------------
app.post('/api/auth/woo/callback', async (req, res) => {
  try {
    const { key_id, user_id, consumer_key, consumer_secret } = req.body || {};

    if (!key_id || !user_id || !consumer_key || !consumer_secret) {
      console.error('Invalid Woo callback payload:', req.body);
      return res.status(400).json({ error: 'Invalid payload from Woo' });
    }

    // You encoded app_user_id as "pwa-user-1|storeUrl"
    const [appUserId, storeUrlRaw] = String(user_id).split('|');
    const store_url = WooService.cleanUrl(storeUrlRaw || '');

    // 1) Upsert store in Baserow
    const storeRow = await Baserow.upsertStore({
      store_url,
      app_user_id: appUserId,
      consumer_key,
      consumer_secret,
      woo_key_id: key_id,
    });

    const store_id = storeRow.id;

    // 2) Create webhook for order.created
    const configForWebhook = {
      url: store_url,
      key: consumer_key,
      secret: consumer_secret,
      useProxy: false,
    };

    const delivery_url = `${API_BASE_URL}/api/webhooks/woocommerce/${store_id}`;

    const webhook = await WooService.createWebhook(configForWebhook, {
      name: 'WooManager – Order created',
      topic: 'order.created',
      delivery_url,
    });

    // 3) Save webhook row in Baserow
    await Baserow.createWebhookRow({
      store_id,
      webhook_id: webhook.id,
      topic: webhook.topic,
      delivery_url: webhook.delivery_url,
      status: webhook.status,
    });

    // Woo just needs 2xx
    return res.json({ ok: true });
  } catch (err) {
    console.error('Woo callback error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ------------------ WOO WEBHOOK RECEIVER ------------------
app.post('/api/webhooks/woocommerce/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;

    const topic = req.header('X-WC-Webhook-Topic') || null;
    const resource = req.header('X-WC-Webhook-Resource') || null;
    const event = req.header('X-WC-Webhook-Event') || null;

    const payload = req.body;

    await Baserow.createNotificationRow({
      store_id: Number(storeId),
      topic,
      resource,
      event,
      payload,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Woo webhook handler error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ------------------ STORE LOOKUP FOR FRONTEND (SSO) ------------------
app.post('/api/store/by-app-user', async (req, res) => {
  try {
    const { app_user_id } = req.body;
    if (!app_user_id) {
      return res.status(400).json({ error: 'app_user_id is required' });
    }

    const row = await Baserow.findStoreByAppUserId(app_user_id);
    if (!row) {
      return res.status(404).json({ error: 'Store not found for this app_user_id' });
    }

    return res.json({
      store_id: row.id,
      store_url: row.store_url,
      app_user_id: row.app_user_id,
    });
  } catch (err) {
    console.error('Store by app_user error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ------------------ BOOTSTRAP: ORDERS + PRODUCTS + CUSTOMERS + REPORT ------------------
app.post('/api/bootstrap', async (req, res) => {
  try {
    const { config, store_id } = req.body;

    const resolvedConfig = await resolveConfig({ config, store_id });
    const key = cacheKeyFromConfig(resolvedConfig);

    const cachedOrders = getCached('orders', key, 60 * 1000);
    const cachedProducts = getCached('products', key, 2 * 60 * 60 * 1000);
    const cachedCustomers = getCached('customers', key, 2 * 60 * 60 * 1000);
    const cachedReport = getCached('report', key, 5 * 60 * 1000);

    const [orders, products, customers, report] = await Promise.all([
      cachedOrders || WooService.getOrders(resolvedConfig, resolvedConfig.useMock),
      cachedProducts || WooService.getProducts(resolvedConfig, resolvedConfig.useMock),
      (async () => {
        if (cachedCustomers) return cachedCustomers;
        const baseCustomers = await WooService.getCustomers(
          resolvedConfig,
          resolvedConfig.useMock
        );
        return baseCustomers;
      })(),
      cachedReport || WooService.getSalesReport(resolvedConfig, {}),
    ]);

    if (!cachedOrders) setCached('orders', key, orders);
    if (!cachedProducts) setCached('products', key, products);
    if (!cachedCustomers) setCached('customers', key, customers);
    if (!cachedReport) setCached('report', key, report);

    return res.json({ orders, products, customers, report });
  } catch (err) {
    console.error('Bootstrap API error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ------------------ HEALTH ------------------
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ------------------ LEGACY / TEST ENDPOINTS (still work) ------------------

// Test connection (manual keys)
app.post('/api/auth/test', async (req, res) => {
  try {
    const { config } = req.body;
    if (!config || !config.url || !config.key || !config.secret) {
      return res.status(400).json({ error: 'Missing credentials' });
    }
    await WooService.getOrders(config, config.useMock);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Orders
app.post('/api/orders', async (req, res) => {
  try {
    const { config, store_id } = req.body;
    const resolvedConfig = await resolveConfig({ config, store_id });
    const orders = await WooService.getOrders(resolvedConfig, resolvedConfig.useMock);
    res.json({ orders });
  } catch (err) {
    console.error('Orders API error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Products
app.post('/api/products', async (req, res) => {
  try {
    const { config, store_id } = req.body;
    const resolvedConfig = await resolveConfig({ config, store_id });
    const products = await WooService.getProducts(resolvedConfig, resolvedConfig.useMock);
    res.json({ products });
  } catch (err) {
    console.error('Products API error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Categories (still expects config in query for now)
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

// Customers (enriched)
app.post('/api/customers', async (req, res) => {
  try {
    const { config, store_id } = req.body;
    const resolvedConfig = await resolveConfig({ config, store_id });

    const [customersBase, orders] = await Promise.all([
      WooService.getCustomers(resolvedConfig, resolvedConfig.useMock),
      WooService.getOrders(resolvedConfig, resolvedConfig.useMock),
    ]);

    const statsByKey = new Map();

    orders.forEach((o) => {
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

    const customers = customersBase.map((c) => {
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

// Sales report (supports store_id)
app.post('/api/reports/sales', async (req, res) => {
  try {
    const { config, store_id, date_min, date_max } = req.body;

    const resolvedConfig = await resolveConfig({ config, store_id });

    let startDate = date_min;
    let endDate = date_max;

    if (!startDate || !endDate) {
      const now = new Date();
      const end = new Date(now);
      end.setUTCHours(23, 59, 59, 999);

      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      start.setUTCHours(0, 0, 0, 0);

      const fmt = (d) => d.toISOString().slice(0, 10);
      startDate = fmt(start);
      endDate = fmt(end);
    }

    const report = await WooService.getSalesReport(resolvedConfig, {
      date_min: startDate,
      date_max: endDate,
    });

    res.json({ report, date_min: startDate, date_max: endDate });
  } catch (err) {
    console.error('Sales report API error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
