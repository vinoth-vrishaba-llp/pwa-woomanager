// server/wooService.js
const { MOCK_ORDERS, MOCK_PRODUCTS } = require('./mockData');

const WooService = {
  // Returns full URL with https:// for API calls
  cleanUrl: (url) => {
    let cleaned = url.replace(/\/$/, '').trim();
    if (!cleaned.startsWith('http')) cleaned = `https://${cleaned}`;
    return cleaned;
  },

  // ✅ NEW: Extracts just the domain without protocol (for user_id encoding)
  extractDomain: (url) => {
    let cleaned = url.replace(/\/$/, '').trim();
    // Remove protocol if present
    cleaned = cleaned.replace(/^https?:\/\//i, '');
    // Remove any path
    cleaned = cleaned.split('/')[0];
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
      const perPage = 100;
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
        allOrders = allOrders.concat(batch);

        if (totalPages == null) {
          const headerVal = response.headers.get('X-WP-TotalPages');
          totalPages = headerVal ? parseInt(headerVal, 10) : 0;
        }

        if (!totalPages || page >= totalPages || batch.length < perPage) {
          break;
        }

        page += 1;
        if (page > 50) break;
      }

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
        payment_method: order.payment_method,
        payment_method_title: order.payment_method_title,
        transaction_id: order.transaction_id || null,
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
        status: p.stock_status || 'instock',
        post_status: p.status,
        categories: p.categories || [],
        sku: p.sku || null,
        image: p.images?.[0]?.src || null,
      }));
    } catch (err) {
      console.error('Fetch Products Error:', err);
      throw err;
    }
  },

    getOrdersPaginated: async (config, options = {}) => {
    const {
      page = 1,
      per_page = 20,
      status,
      search,
      date_after,
      date_before,
      useMock = false
    } = options;

    if (useMock) {
      const filtered = MOCK_ORDERS.filter(order => {
        if (status && order.status !== status) return false;
        if (search) {
          const searchLower = search.toLowerCase();
          const orderIdMatch = String(order.id).toLowerCase().includes(searchLower);
          const customerMatch = order.customer.toLowerCase().includes(searchLower);
          if (!orderIdMatch && !customerMatch) return false;
        }
        return true;
      });

      const total = filtered.length;
      const totalPages = Math.ceil(total / per_page);
      const start = (page - 1) * per_page;
      const end = start + per_page;
      const orders = filtered.slice(start, end);

      return {
        orders,
        total,
        total_pages: totalPages,
        page,
        per_page,
      };
    }

    try {
      const baseUrl = WooService.cleanUrl(config.url);
      
      const params = [`per_page=${per_page}`, `page=${page}`];
      
      if (status) {
        params.push(`status=${encodeURIComponent(status)}`);
      }
      
      if (search) {
        params.push(`search=${encodeURIComponent(search)}`);
      }
      
      if (date_after) {
        params.push(`after=${encodeURIComponent(date_after)}T00:00:00`);
      }
      
      if (date_before) {
        params.push(`before=${encodeURIComponent(date_before)}T23:59:59`);
      }

      params.push('orderby=date');
      params.push('order=desc');

      const endpoint = `orders?${params.join('&')}`;
      const finalUrl = WooService.buildUrl(baseUrl, endpoint, config);

      const response = await fetch(finalUrl);
      
      if (!response.ok) {
        throw new Error(`Order API error: ${response.status}`);
      }

      const orders = await response.json();
      
      const totalOrders = parseInt(response.headers.get('X-WP-Total') || '0', 10);
      const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1', 10);

      const mappedOrders = orders.map((order) => ({
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
        payment_method: order.payment_method,
        payment_method_title: order.payment_method_title,
        transaction_id: order.transaction_id || null,
        currency_symbol: order.currency_symbol,
        shipping_total: parseFloat(order.shipping_total || '0') || 0,
        discount_total: parseFloat(order.discount_total || '0') || 0,
      }));

      return {
        orders: mappedOrders,
        total: totalOrders,
        total_pages: totalPages,
        page,
        per_page,
      };
    } catch (err) {
      console.error('Fetch Orders Paginated Error:', err);
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

  // ------------------ CUSTOMERS ------------------
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

    const data = await response.json();
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

  // ------------------ CREATE WEBHOOK ------------------
  createWebhook: async (config, { name, topic, delivery_url }) => {
    const baseUrl = WooService.cleanUrl(config.url);
    const finalUrl = WooService.buildUrl(baseUrl, 'webhooks', config);

    const body = {
      name,
      topic,
      delivery_url,
      status: 'active',
    };

    const response = await fetch(finalUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Create webhook error ${response.status}: ${text}`);
    }

    return response.json();
  },
};
// ------------------ ABANDONED CARTS ------------------
// NOTE: wc-wcar plugin uses its own REST namespace: wc-wcar/v1

WooService.getAbandonedCarts = async (config, useMock) => {
  if (useMock) return [];

  const baseUrl = WooService.cleanUrl(config.url);
  const { key, secret } = config;

  const url = `${baseUrl}/wp-json/wc-wcar/v1/abandoned-carts?consumer_key=${encodeURIComponent(
    key
  )}&consumer_secret=${encodeURIComponent(secret)}`;

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Abandoned carts API error ${res.status}: ${text}`);
  }

  const data = await res.json();

  // Plugin returns: { items: [...], total, page, per_page, total_pages }
  const items = Array.isArray(data.items) ? data.items : [];

  return items.map((c) => {
    // list endpoint doesn't give line-items, it's just meta
    const dateTime = c.dateTime || null;
    let date_iso = null;
    if (dateTime) {
      const d = new Date(dateTime);
      if (!Number.isNaN(d.getTime())) {
        date_iso = d.toISOString();
      }
    }

    return {
      id: c.id,
      userName: c.userName || '',
      email: c.email || null,
      cartTotal: Number(c.cartTotal || 0),
      orderStatus: c.orderStatus || '',
      country: c.country || '',
      dateTime,
      date_iso,
      unsubscribed: c.unsubscribed ?? 0,
      // no items here – list endpoint usually doesn't have them
      items: [],
      items_count: 0,
      raw: c,
    };
  });
};

WooService.getAbandonedCartById = async (config, cartId, useMock) => {
  if (useMock) {
    // you can return null or some mock
    return null;
  }

  const baseUrl = WooService.cleanUrl(config.url);
  const { key, secret } = config;

  const url = `${baseUrl}/wp-json/wc-wcar/v1/abandoned-carts/${encodeURIComponent(
    cartId
  )}?consumer_key=${encodeURIComponent(
    key
  )}&consumer_secret=${encodeURIComponent(secret)}`;

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Abandoned cart detail API error ${res.status}: ${text}`
    );
  }

  const c = await res.json();

  const items = c.items || c.line_items || c.cart || [];
  const email =
    c.email ||
    c.customer_email ||
    c.billing_email ||
    (c.billing && c.billing.email) ||
    null;

  const dateTime = c.dateTime || null;
  let date_iso = null;
  if (dateTime) {
    const d = new Date(dateTime);
    if (!Number.isNaN(d.getTime())) {
      date_iso = d.toISOString();
    }
  }

  return {
    id: c.id,
    userName: c.userName || '',
    email,
    cartTotal: Number(c.cartTotal || 0),
    orderStatus: c.orderStatus || '',
    country: c.country || '',
    dateTime,
    date_iso,
    items,
    items_count: Array.isArray(items) ? items.length : 0,
    raw: c,
  };
};


module.exports = WooService;