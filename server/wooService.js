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
    const perPage = 100;               // Woo max
    let page = 1;
    let allOrders = [];
    let totalPages = null;

    while (true) {
      const endpoint = `orders?per_page=${perPage}&page=${page}`;
      const finalUrl = WooService.buildUrl(baseUrl, endpoint, config);

      const response = await fetch(finalUrl);
      if (!response.ok) {
        throw new Error(`Order API error: ${response.status}`);
      }

      const batch = await response.json();

      // Append this page
      allOrders = allOrders.concat(batch);

      // Read total pages from header (Woo exposes this)
      if (totalPages == null) {
        const headerVal = response.headers.get('X-WP-TotalPages');
        totalPages = headerVal ? parseInt(headerVal, 10) : 0;
      }

      // Stop when:
      // - no header OR
      // - we reached the last page OR
      // - batch returned less than perPage (safety)
      if (!totalPages || page >= totalPages || batch.length < perPage) {
        break;
      }

      page += 1;

      // hard safety cap so we don't DDOS if something is wrong
      if (page > 50) break;
    }

    // Map merged orders
    return allOrders.map((order) => ({
      id: order.id,
      customer_id: order.customer_id ?? null,
      customer: order.billing
        ? `${order.billing.first_name} ${order.billing.last_name}`.trim() || 'Guest'
        : 'Guest',
      billing_email: order.billing?.email || null,
      total: parseFloat(order.total),
      status: order.status,
      date: new Date(order.date_created).toISOString(),
      items: order.line_items?.length || 0,
      line_items: order.line_items,
      billing: order.billing,
      shipping: order.shipping,
      payment_method: order.payment_method_title,
      currency_symbol: order.currency_symbol,
      shipping_total: parseFloat(order.shipping_total || '0') || 0,
  discount_total: parseFloat(order.discount_total || '0') || 0,
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

  getSalesReport: async (config, { date_min, date_max } = {}) => {
    const baseUrl = WooService.cleanUrl(config.url);

    const params = [];
    if (date_min) params.push(`date_min=${date_min}`);
    if (date_max) params.push(`date_max=${date_max}`);
    let endpoint = 'reports/sales';
    if (params.length) {
      endpoint += `?${params.join('&')}`;
    }

    const finalUrl = WooService.buildUrl(baseUrl, endpoint, config);

    const response = await fetch(finalUrl);
    if (!response.ok) {
      throw new Error(`Sales report API error: ${response.status}`);
    }

    const data = await response.json(); // array with one element
    const raw = Array.isArray(data) && data.length > 0 ? data[0] : null;
    if (!raw) return null;

    return {
      total_sales: parseFloat(raw.total_sales || '0') || 0,
      net_sales: parseFloat(raw.net_sales || '0') || 0,
      average_sales: parseFloat(raw.average_sales || '0') || 0,
      total_orders: raw.total_orders || 0,
      total_items: raw.total_items || 0,
      total_tax: parseFloat(raw.total_tax || '0') || 0,
      total_shipping: parseFloat(raw.total_shipping || '0') || 0,
      total_refunds: raw.total_refunds || 0,
      total_discount: parseFloat(raw.total_discount || '0') || 0,
      totals_grouped_by: raw.totals_grouped_by || null,
      totals: raw.totals || {},
    };
  },
};

module.exports = WooService;
