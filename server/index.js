// server/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const WooService = require('./wooService');
const Baserow = require('./baserowClient');
const jwt = require('jsonwebtoken'); // npm install jsonwebtoken
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

const app = express();
const PORT = process.env.PORT || 5000;

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const API_BASE_URL = process.env.API_BASE_URL || `http://localhost:${PORT}`;
const WOO_APP_NAME = process.env.WOO_APP_NAME || 'WooManager';


// 🔹 Razorpay keys from env
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_ORIGIN,       
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



// ------------------ USER SIGNUP ------------------
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, password, store_url } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Validate username (alphanumeric, min 3 chars)
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(username)) {
      return res.status(400).json({ 
        error: 'Username must be 3-20 characters (letters, numbers, -, _)' 
      });
    }

    // Validate password (min 6 chars)
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await Baserow.createUser(username, password, store_url);

    // Create JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        app_user_id: user.app_user_id 
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    console.log('✅ User created:', { username, app_user_id: user.app_user_id });

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        app_user_id: user.app_user_id,
        has_store_connected: user.has_store_connected,
      },
    });
  } catch (err) {
    console.error('Signup error:', err);
    
    // Check if user already exists
    if (err.message && err.message.includes('already exists')) {
      return res.status(409).json({ error: 'Username already exists. Please choose another or sign in.' });
    }
    
    return res.status(400).json({ error: err.message });
  }
});

// ------------------ USER LOGIN ------------------
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await Baserow.authenticateUser(username, password);

    // Create JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        app_user_id: user.app_user_id 
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    console.log('✅ User logged in:', { username, app_user_id: user.app_user_id });

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        app_user_id: user.app_user_id,
        store_url: user.store_url,
        has_store_connected: user.has_store_connected,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    
    // Provide specific error messages
    const errorMessage = err.message.toLowerCase();
    
    if (errorMessage.includes('user not found') || errorMessage.includes('no user found')) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'No account exists with this username. Please sign up first.' 
      });
    }
    
    if (errorMessage.includes('invalid password') || errorMessage.includes('incorrect password')) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    // Generic authentication failure
    return res.status(401).json({ 
      error: 'Authentication failed',
      message: err.message 
    });
  }
});

// ------------------ VERIFY TOKEN (Get Current User) ------------------
app.get('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch fresh user data
    const user = await Baserow.findStoreByAppUserId(decoded.app_user_id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      user: {
        id: user.id,
        username: user.username,
        app_user_id: user.app_user_id,
        store_url: user.store_url,
        has_store_connected: !!(user.consumer_key && user.consumer_secret),
      },
    });
  } catch (err) {
    console.error('Token verification error:', err);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});
// ------------------ WOO SSO: START AUTH ------------------
app.post('/api/auth/woo/start', async (req, res) => {
  try {
    const { store_url, app_user_id } = req.body;
    
    if (!store_url || !app_user_id) {
      return res.status(400).json({ error: 'store_url and app_user_id are required' });
    }

    // Verify user exists
    const user = await Baserow.findStoreByAppUserId(app_user_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // ✅ Use extractDomain to get ONLY the domain (no https://)
    const domain = WooService.extractDomain(store_url);
    // Use cleanUrl for the full URL with protocol
    const base = WooService.cleanUrl(store_url);
    const endpoint = '/wc-auth/v1/authorize';

    // ✅ Create user_id with DOUBLE UNDERSCORE delimiter
    // Format: "app_user_id__domain" (e.g., "john-abc123__shop.bharatkewow.com")
    const encodedUserId = `${app_user_id}__${domain}`;

    const params = new URLSearchParams({
      app_name: WOO_APP_NAME,
      scope: 'read_write',
      user_id: encodedUserId,
      return_url: `${FRONTEND_ORIGIN}/sso-complete`,
      callback_url: `${API_BASE_URL}/api/auth/woo/callback`,
    });

    const authUrl = `${base}${endpoint}?${params.toString()}`;
    
    console.log('🚀 Starting WooCommerce SSO:', {
      username: user.username,
      original_store_url: store_url,
      domain: domain,
      full_base_url: base,
      app_user_id,
      encoded_user_id: encodedUserId,
    });

    return res.json({ authUrl });
  } catch (err) {
    console.error('❌ Auth start error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ------------------ WOO SSO: CALLBACK (RECEIVE KEYS) ------------------
app.post('/api/auth/woo/callback', async (req, res) => {
  try {
    const { key_id, user_id, consumer_key, consumer_secret } = req.body || {};

    console.log('🔔 Woo callback received:', { 
      key_id, 
      user_id, 
      has_consumer_key: !!consumer_key, 
      has_consumer_secret: !!consumer_secret 
    });

    if (!key_id || !user_id || !consumer_key || !consumer_secret) {
      console.error('❌ Invalid Woo callback payload:', req.body);
      return res.status(400).json({ error: 'Invalid payload from Woo' });
    }

    // ✅ Parse user_id (using DOUBLE UNDERSCORE as delimiter)
    let appUserId, store_url;

    if (String(user_id).includes('__')) {
      // Expected format: "john-abc123__shop.bharatkewow.com"
      const parts = String(user_id).split('__');
      appUserId = parts[0];
      const domainPart = parts[1];
      
      store_url = WooService.extractDomain(domainPart);
      console.log('✅ Parsed user_id correctly:', { appUserId, store_url });
    } else {
      console.warn('⚠️ user_id missing double underscore delimiter:', user_id);
      
      // Fallback parsing
      const domainMatch = String(user_id).match(/([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?)$/);
      
      if (domainMatch) {
        const extractedDomain = domainMatch[1];
        appUserId = String(user_id).replace(extractedDomain, '').replace(/[^a-zA-Z0-9-_]/g, '');
        store_url = WooService.extractDomain(extractedDomain);
        console.log('⚠️ Extracted from malformed user_id:', { appUserId, store_url });
      } else {
        appUserId = String(user_id).trim();
        store_url = '';
        console.error('❌ Could not extract store URL from user_id:', user_id);
      }
    }

    if (!appUserId || !store_url) {
      console.error('❌ Invalid parsed values:', { appUserId, store_url });
      return res.status(400).json({ error: 'Invalid user_id format' });
    }

    console.log('📝 Final parsed values:', { appUserId, store_url, key_id });

    // 1) Update store credentials in Baserow
    console.log('💾 Updating store credentials in Baserow...');
    const storeRow = await Baserow.updateStoreCredentials(appUserId, {
      store_url,
      consumer_key,
      consumer_secret,
      woo_key_id: key_id,
      permissions: 'read_write',
    });

    const store_id = storeRow.id;
    console.log('✅ Store credentials updated:', { 
      store_id, 
      app_user_id: appUserId, 
      store_url 
    });

    // 2) Create webhook for order.created
    const configForWebhook = {
      url: WooService.cleanUrl(store_url),
      key: consumer_key,
      secret: consumer_secret,
      useProxy: false,
    };

    const delivery_url = `${API_BASE_URL}/api/webhooks/woocommerce/${store_id}`;

    let webhook;
    try {
      console.log('🔔 Creating WooCommerce webhook...');
      webhook = await WooService.createWebhook(configForWebhook, {
        name: 'WooManager – Order created',
        topic: 'order.created',
        delivery_url,
      });
      console.log('✅ Webhook created:', { webhook_id: webhook.id, topic: webhook.topic });
    } catch (webhookErr) {
      console.error('⚠️ Failed to create webhook (non-fatal):', webhookErr.message);
    }

    // 3) Save webhook row in Baserow
    if (webhook) {
      try {
        console.log('💾 Saving webhook to Baserow...');
        await Baserow.createWebhookRow({
          store_id,
          webhook_id: webhook.id,
          topic: webhook.topic,
          delivery_url: webhook.delivery_url,
          status: webhook.status,
        });
        console.log('✅ Webhook saved to Baserow');
      } catch (webhookRowErr) {
        console.error('⚠️ Failed to save webhook to Baserow (non-fatal):', webhookRowErr.message);
      }
    }

    console.log('🎉 WooCommerce SSO callback completed successfully');

    return res.json({ 
      ok: true, 
      store_id, 
      app_user_id: appUserId,
      store_url 
    });
  } catch (err) {
    console.error('❌ Woo callback error:', err);
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

    // ---- default last 30 days (same logic as /api/reports/sales) ----
    let startDate;
    let endDate;
    {
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

    const [orders, products, report] = await Promise.all([
      cachedOrders || WooService.getOrders(resolvedConfig, resolvedConfig.useMock),
      cachedProducts || WooService.getProducts(resolvedConfig, resolvedConfig.useMock),
      cachedReport ||
        WooService.getSalesReport(resolvedConfig, {
          date_min: startDate,
          date_max: endDate,
        }),
    ]);

    let customers = cachedCustomers;
    if (!customers) {
      const baseCustomers = await WooService.getCustomers(
        resolvedConfig,
        resolvedConfig.useMock
      );
      customers = enrichCustomersWithOrders(baseCustomers, orders);
      setCached('customers', key, customers);
    }

    if (!cachedOrders) setCached('orders', key, orders);
    if (!cachedProducts) setCached('products', key, products);
    if (!cachedReport) setCached('report', key, report);

    return res.json({
      orders,
      products,
      customers,
      report,
      date_min: startDate,
      date_max: endDate,
    });
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

app.get("/api/server-time", (req, res) => {
  res.json({ now: new Date().toISOString() });
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

async function getRazorpayPayment(paymentId) {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay keys are not configured on the server');
  }

  const authToken = Buffer.from(
    `${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`,
    'utf8'
  ).toString('base64');

  const url = `https://api.razorpay.com/v1/payments/${paymentId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${authToken}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('Razorpay payment API error:', response.status, text);
    throw new Error(`Razorpay API error: ${response.status}`);
  }

  return response.json(); // Razorpay payment object
}

/**
 * 🔹 Backend endpoint to fetch Razorpay payment details
 * Body: { transaction_id: "pay_xxx" }
 */
app.post('/api/razorpay/payment', async (req, res) => {
  try {
    const { transaction_id } = req.body || {};
    if (!transaction_id) {
      return res.status(400).json({ error: 'transaction_id is required' });
    }

    const payment = await getRazorpayPayment(transaction_id);
    return res.json({ payment });
  } catch (err) {
    console.error('Razorpay payment route error:', err);
    return res.status(500).json({ error: err.message });
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

function enrichCustomersWithOrders(customersBase, orders) {
  const statsByCustomerId = new Map();
  const statsByEmail = new Map();

  orders.forEach((order) => {
    const customerId = order.customer_id;
    const email = order.billing_email?.toLowerCase();
    const orderTotal = Number(order.total) || 0;

    // Map by customer_id
    if (customerId && customerId !== 0) {
      const existing = statsByCustomerId.get(customerId) || {
        total_spent: 0,
        orders_count: 0,
        orders: [],
      };

      existing.total_spent += orderTotal;
      existing.orders_count += 1;
      existing.orders.push({
        id: order.id,
        total: order.total,
        status: order.status,
        date: order.date,
        items: order.items,
      });

      statsByCustomerId.set(customerId, existing);
    }

    // Map by email (guests / fallback)
    if (email) {
      const existing = statsByEmail.get(email) || {
        total_spent: 0,
        orders_count: 0,
        orders: [],
      };

      existing.total_spent += orderTotal;
      existing.orders_count += 1;
      existing.orders.push({
        id: order.id,
        total: order.total,
        status: order.status,
        date: order.date,
        items: order.items,
      });

      statsByEmail.set(email, existing);
    }
  });

  const customers = customersBase.map((customer) => {
    let stats = null;

    if (customer.id && customer.id !== 0) {
      stats = statsByCustomerId.get(customer.id);
    }

    if (!stats && customer.email) {
      stats = statsByEmail.get(customer.email.toLowerCase());
    }

    return {
      ...customer,
      total_spent: stats ? stats.total_spent : 0,
      orders_count: stats ? stats.orders_count : 0,
      orders: stats ? stats.orders : [],
    };
  });

  // Sort by total_spent desc
  customers.sort((a, b) => b.total_spent - a.total_spent);

  return customers;
}


// Customers (enriched)
app.post('/api/customers', async (req, res) => {
  try {
    const { config, store_id } = req.body;
    const resolvedConfig = await resolveConfig({ config, store_id });

    const [customersBase, orders] = await Promise.all([
      WooService.getCustomers(resolvedConfig, resolvedConfig.useMock),
      WooService.getOrders(resolvedConfig, resolvedConfig.useMock),
    ]);

    const customers = enrichCustomersWithOrders(customersBase, orders);

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
