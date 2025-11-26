// server/baserowClient.js
require('dotenv').config();

const BASEROW_API_URL = process.env.BASEROW_API_URL;
const BASEROW_TOKEN = process.env.BASEROW_TOKEN;

// Table IDs – you can also put these in env if you want
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

// ---------- STORES ----------

async function findStoreByAppUserId(app_user_id) {
  if (!app_user_id) return null;

  const qs = new URLSearchParams({
    user_field_names: 'true',
    // assumes your Stores table has a text field called "app_user_id"
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

async function createStoreRow(payload) {
  // payload fields must match your Baserow column names:
  // e.g. { store_url, app_user_id, consumer_key, consumer_secret, woo_key_id }
  const body = JSON.stringify(payload);

  const data = await baserowFetch(
    `/database/rows/table/${STORE_TABLE_ID}/?user_field_names=true`,
    { method: 'POST', body }
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

// Upsert by app_user_id + store_url
async function upsertStore({ store_url, app_user_id, consumer_key, consumer_secret, woo_key_id }) {
  const existing = await findStoreByAppUserId(app_user_id);

  const payload = {
    store_url,
    app_user_id,
    consumer_key,
    consumer_secret,
    woo_key_id,
  };

  if (existing) {
    const updated = await updateStoreRow(existing.id, payload);
    return updated;
  } else {
    const created = await createStoreRow(payload);
    return created;
  }
}

// ---------- WEBHOOKS ----------

async function createWebhookRow({ store_id, webhook_id, topic, delivery_url, status }) {
  const payload = {
    store_id,     // numeric (link field or integer)
    webhook_id,   // WC webhook ID
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

async function createNotificationRow({ store_id, topic, resource, event, payload }) {
  const record = {
    store_id,
    topic,
    resource,
    event,
    // assumes a long text / JSON field named "payload"
    payload: JSON.stringify(payload || {}),
  };

  const body = JSON.stringify(record);

  const data = await baserowFetch(
    `/database/rows/table/${NOTIF_TABLE_ID}/?user_field_names=true`,
    { method: 'POST', body }
  );
  return data;
}

module.exports = {
  upsertStore,
  createWebhookRow,
  createNotificationRow,
  findStoreByAppUserId,
  getStoreById,
};
