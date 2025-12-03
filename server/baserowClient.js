// server/baserowClient.js
require('dotenv').config();
const bcrypt = require('bcryptjs'); // npm install bcryptjs

const BASEROW_API_URL = process.env.BASEROW_API_URL;
const BASEROW_TOKEN = process.env.BASEROW_TOKEN;

const STORE_TABLE_ID = process.env.BASEROW_STORE_TABLE_ID || 748;
const WEBHOOK_TABLE_ID = process.env.BASEROW_WEBHOOK_TABLE_ID || 749;
const NOTIF_TABLE_ID = process.env.BASEROW_NOTIFICATION_TABLE_ID || 750;

if (!BASEROW_API_URL || !BASEROW_TOKEN) {
  console.warn('[Baserow] BASEROW_API_URL or BASEROW_TOKEN missing in env');
}

async function baserowFetch(path, options = {}) {
  const url = `${BASEROW_API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${BASEROW_TOKEN}`,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Baserow error ${res.status}: ${text}`);
  }

  return res.json();
}

// ---------- USER AUTHENTICATION ----------

/**
 * Create a new user account
 * @param {string} username 
 * @param {string} password - Plain text password (will be hashed)
 * @param {string} store_url - Optional: store URL if provided during signup
 */
async function createUser(username, password, store_url = null) {
  // Check if username already exists
  const existing = await findUserByUsername(username);
  if (existing) {
    throw new Error('Username already exists');
  }

  // Generate app_user_id from username + random string
  const randomStr = Math.random().toString(36).substring(2, 8);
  const app_user_id = `${username.toLowerCase().replace(/[^a-z0-9]/g, '')}-${randomStr}`;

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  const payload = {
    username,
    password: hashedPassword,
    app_user_id,
    store_url: store_url || '',
    consumer_key: '',
    consumer_secret: '',
    woo_key_id: '',
    permissions: '',
  };

  const data = await baserowFetch(
    `/database/rows/table/${STORE_TABLE_ID}/?user_field_names=true`,
    { method: 'POST', body: JSON.stringify(payload) }
  );

  return {
    id: data.id,
    username: data.username,
    app_user_id: data.app_user_id,
    store_url: data.store_url,
    has_store_connected: !!(data.consumer_key && data.consumer_secret),
  };
}

/**
 * Find user by username
 */
async function findUserByUsername(username) {
  if (!username) return null;

  const qs = new URLSearchParams({
    user_field_names: 'true',
    [`filter__username__equal`]: username,
  });

  const data = await baserowFetch(
    `/database/rows/table/${STORE_TABLE_ID}/?${qs.toString()}`
  );

  if (!data || !Array.isArray(data.results) || data.results.length === 0) {
    return null;
  }
  return data.results[0];
}

/**
 * Authenticate user with username and password
 */
async function authenticateUser(username, password) {
  const user = await findUserByUsername(username);
  
  if (!user) {
    throw new Error('Invalid username or password');
  }

  // Compare password
  const isValid = await bcrypt.compare(password, user.password);
  
  if (!isValid) {
    throw new Error('Invalid username or password');
  }

  return {
    id: user.id,
    username: user.username,
    app_user_id: user.app_user_id,
    store_url: user.store_url,
    has_store_connected: !!(user.consumer_key && user.consumer_secret),
  };
}

// ---------- STORES ----------

async function findStoreByAppUserId(app_user_id) {
  if (!app_user_id) return null;

  const qs = new URLSearchParams({
    user_field_names: 'true',
    [`filter__app_user_id__equal`]: app_user_id,
  });

  const data = await baserowFetch(
    `/database/rows/table/${STORE_TABLE_ID}/?${qs.toString()}`
  );

  if (!data || !Array.isArray(data.results) || data.results.length === 0) {
    return null;
  }
  return data.results[0];
}

async function getStoreById(storeId) {
  if (!storeId) return null;

  const data = await baserowFetch(
    `/database/rows/table/${STORE_TABLE_ID}/${storeId}/?user_field_names=true`
  );
  return data;
}

async function updateStoreRow(rowId, payload) {
  const body = JSON.stringify(payload);

  const data = await baserowFetch(
    `/database/rows/table/${STORE_TABLE_ID}/${rowId}/?user_field_names=true`,
    { method: 'PATCH', body }
  );
  return data;
}

/**
 * Update store with WooCommerce credentials after SSO
 */
async function updateStoreCredentials(app_user_id, { store_url, consumer_key, consumer_secret, woo_key_id, permissions }) {
  const existing = await findStoreByAppUserId(app_user_id);

  if (!existing) {
    throw new Error('User not found');
  }

  const payload = {
    store_url,
    consumer_key,
    consumer_secret,
    woo_key_id,
    permissions: permissions || 'read_write',
  };

  const updated = await updateStoreRow(existing.id, payload);
  return updated;
}

// ---------- WEBHOOKS ----------

async function createWebhookRow({ store_id, webhook_id, topic, delivery_url, status }) {
  const payload = {
    store_id,
    webhook_id,
    topic,
    delivery_url,
    status,
  };

  const body = JSON.stringify(payload);

  const data = await baserowFetch(
    `/database/rows/table/${WEBHOOK_TABLE_ID}/?user_field_names=true`,
    { method: 'POST', body }
  );
  return data;
}

// ---------- NOTIFICATIONS ----------

// ---------- NOTIFICATIONS ----------

async function createNotificationRow({ store_id, topic, resource, event, payload }) {
  const record = {
    store_id,
    topic,
    resource,
    event,
    payload: JSON.stringify(payload || {}),
  };

  const body = JSON.stringify(record);

  const data = await baserowFetch(
    `/database/rows/table/${NOTIF_TABLE_ID}/?user_field_names=true`,
    { method: 'POST', body }
  );
  return data;
}

// ✅ NEW: Fetch notifications for a store, with parsed Woo payload
async function getNotificationsForStoreId(store_id) {
  if (!store_id) return [];

  const qs = new URLSearchParams({
    user_field_names: 'true',
    ['filter__store_id__equal']: store_id,
    // optional: sort newest first
    order_by: '-id',
  });

  const data = await baserowFetch(
    `/database/rows/table/${NOTIF_TABLE_ID}/?${qs.toString()}`
  );

  const rows = Array.isArray(data.results) ? data.results : [];

  return rows.map((row) => {
    let payload = {};
    try {
      payload = row.payload ? JSON.parse(row.payload) : {};
    } catch (e) {
      console.warn('Failed to parse notification payload JSON for row', row.id);
    }

    return {
      id: row.id,
      store_id: row.store_id,
      topic: row.topic,
      resource: row.resource,
      event: row.event,
      payload,
      // Baserow meta timestamp if you ever need it
      created_on: row.created_on || row.created_at || null,
    };
  });
}

module.exports = {
  // User auth
  createUser,
  authenticateUser,
  findUserByUsername,

  // Store management
  updateStoreCredentials,
  findStoreByAppUserId,
  getStoreById,
  updateStoreRow,

  // Webhooks & notifications
  createWebhookRow,
  createNotificationRow,
  getNotificationsForStoreId,   // ✅ export this
};
