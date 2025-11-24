// server/wooService.js
const { MOCK_ORDERS, MOCK_PRODUCTS } = require('./mockData');

const WooService = {
  cleanUrl: (url) => {
    let cleaned = url.replace(/\/$/, '').trim();
    if (!cleaned.startsWith('http')) cleaned = `https://${cleaned}`;
    return cleaned;
  },

  buildUrl: (baseUrl, endpoint, config) => {
    const { key, secret, useProxy } = config;
    const separator = endpoint.includes('?') ? '&' : '?';
    const authParams = `consumer_key=${key}&consumer_secret=${secret}`;
    const targetUrl = `${baseUrl}/wp-json/wc/v3/${endpoint}${separator}${authParams}`;

    if (useProxy) {
      return `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
    }
    return targetUrl;
  },

  // -------- ORDERS --------
  getOrders: async (config, useMock) => {
    if (useMock) return MOCK_ORDERS;

    try {
      const baseUrl = WooService.cleanUrl(config.url);
      const finalUrl = WooService.buildUrl(baseUrl, 'orders?per_page=100', config);

      const response = await fetch(finalUrl);
      if (!response.ok) throw new Error(`Order API error: ${response.status}`);

      const data = await response.json();

      return data.map((order) => ({
        id: order.id,
        customer_id: order.customer_id ?? null,      // 👈 direct mapping
        customer: order.billing
          ? `${order.billing.first_name} ${order.billing.last_name}`.trim() || 'Guest'
          : 'Guest',
        billing_email: order.billing?.email || null, // 👈 for guests
        total: parseFloat(order.total),
        status: order.status,
        date: new Date(order.date_created).toISOString(),
        items: order.line_items?.length || 0,
        line_items: order.line_items,
        billing: order.billing,
        shipping: order.shipping,
        payment_method: order.payment_method_title,
        currency_symbol: order.currency_symbol,
      }));
    } catch (err) {
      console.error('Fetch Orders Error:', err);
      throw err;
    }
  },

  // ------------------ PRODUCTS ------------------
  getProducts: async (config, useMock) => {
    if (useMock) return MOCK_PRODUCTS;

    try {
      const baseUrl = WooService.cleanUrl(config.url);
      const finalUrl = WooService.buildUrl(baseUrl, 'products?per_page=100', config);

      const response = await fetch(finalUrl);
      if (!response.ok) throw new Error(`Products API error: ${response.status}`);

      const data = await response.json();

      return data.map((p) => ({
        id: p.id,
        name: p.name,
        price: parseFloat(p.price) || 0,
        stock: p.stock_quantity || 0,
        status: p.stock_status || 'instock', // stock status
        post_status: p.status,               // publish/draft/pending
        categories: p.categories || [],      // [{id,name,slug}]
        sku: p.sku || null,
        image: p.images?.[0]?.src || null,
      }));
    } catch (err) {
      console.error('Fetch Products Error:', err);
      throw err;
    }
  },

  // ------------------ PRODUCT CATEGORIES ------------------
  getProductCategories: async (config) => {
    try {
      const baseUrl = WooService.cleanUrl(config.url);
      const finalUrl = WooService.buildUrl(
        baseUrl,
        'products/categories?per_page=100',
        config
      );

      const response = await fetch(finalUrl);
      if (!response.ok)
        throw new Error(`Categories API error: ${response.status}`);

      const data = await response.json();

      return data.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        count: c.count,
        parent: c.parent,
      }));
    } catch (err) {
      console.error('Fetch Categories Error:', err);
      throw err;
    }
  },

  // ------------------ CUSTOMERS (base data only) ------------------
  getCustomers: async (config, useMock) => {
    if (useMock) return [];

    try {
      const baseUrl = WooService.cleanUrl(config.url);
      const finalUrl = WooService.buildUrl(baseUrl, 'customers?per_page=100', config);

      const response = await fetch(finalUrl);
      if (!response.ok) throw new Error(`Customers API error: ${response.status}`);

      const data = await response.json();

      return data.map((c) => ({
        id: c.id,
        name:
          `${c.first_name || ''} ${c.last_name || ''}`.trim() ||
          c.username ||
          'Customer',
        email: c.email || '',
        phone: c.billing?.phone || '',
        date_created: c.date_created || null,
        is_paying_customer: Boolean(c.is_paying_customer),
        avatar_url: c.avatar_url || null,
        billing: c.billing || {},
        shipping: c.shipping || {},
      }));
    } catch (err) {
      console.error('Fetch Customers Error:', err);
      throw err;
    }
  },
};

module.exports = WooService;
