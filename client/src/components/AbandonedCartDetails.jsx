import React from "react";
import {
  ArrowLeft,
  ShoppingCart,
  Mail,
  User,
  Globe2,
  Phone,
  MapPin,
  FileText,
} from "lucide-react";
import LoadingState from "./ui/LoadingState";
import ErrorState from "./ui/ErrorState";

// 🔹 Force all cart timestamps to Asia/Kolkata
const formatDateTimeIST = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  }).format(d);
};

const AbandonedCartDetails = ({ cart, loading, error, onBack, onRefresh }) => {
  if (loading) return <LoadingState />;

  if (error) {
    return <ErrorState message={error} onRetry={onRefresh} />;
  }

  if (!cart) {
    return (
      <div className="pb-24 pt-16 px-4 min-h-screen bg-gray-50">
        <div className="fixed top-0 left-0 right-0 bg-white z-10 px-4 py-4 border-b border-gray-100 flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-800">Abandoned Cart</h1>
        </div>
        <div className="mt-16 text-center text-gray-400 text-sm">
          No cart selected.
        </div>
      </div>
    );
  }

  // Support both normalized shape { raw: {...} } and direct raw cart
  const raw = cart.raw || cart;

  const id = raw.id ?? cart.id;
  const email = raw.email ?? cart.email ?? null;
  const orderStatus = raw.orderStatus || cart.orderStatus || "Abandoned";
  const cartTotal =
    Number(raw.cartTotal ?? cart.cartTotal ?? cart.total ?? 0) || 0;
  const currency = raw.currency || cart.currency || "INR";

  // Prefer normalized IST date from backend
  const createdAtRaw =
    raw.date_iso ||
    cart.date_iso ||
    raw.created_at ||
    cart.created_at ||
    cart.dateTime ||
    null;

  const userDetails = raw.user_details || {};
  const orderDetails = raw.order_details || {};

  const summary = orderDetails.summary || {};
  const itemsArray =
    (Array.isArray(orderDetails.items) && orderDetails.items) ||
    (Array.isArray(cart.items) && cart.items) ||
    [];

  const firstName =
    userDetails.wcf_first_name ||
    cart.userName ||
    cart.customer ||
    "Guest";
  const lastName = userDetails.wcf_last_name || "";
  const name = `${firstName} ${lastName}`.trim() || "Guest";

  const phone =
    userDetails.wcf_phone_number ||
    userDetails.phone ||
    raw.phone ||
    cart.phone ||
    null;

  const location =
    userDetails.wcf_location ||
    userDetails.wcf_billing_city ||
    userDetails.wcf_shipping_city ||
    null;

  const unsubscribed =
    raw.unsubscribed ||
    cart.unsubscribed ||
    false;

  const status = orderStatus;
  const statusColor =
    status === "Abandoned"
      ? "bg-orange-100 text-orange-700"
      : status === "Successful"
      ? "bg-green-100 text-green-700"
      : status === "Lost"
      ? "bg-red-100 text-red-700"
      : "bg-gray-100 text-gray-600";

  const createdAtLabel = createdAtRaw ? formatDateTimeIST(createdAtRaw) : "";

  const formatMoney = (amount) =>
    `${currency === "INR" ? "₹" : ""}${Number(amount || 0).toFixed(2)}`;

  const billingAddressLines = [
    userDetails.wcf_billing_company,
    userDetails.wcf_billing_address_1,
    userDetails.wcf_billing_address_2,
    userDetails.wcf_billing_state,
    userDetails.wcf_billing_postcode,
  ].filter(Boolean);

  const shippingAddressLines = [
    [userDetails.wcf_shipping_first_name, userDetails.wcf_shipping_last_name]
      .filter(Boolean)
      .join(" "),
    userDetails.wcf_shipping_company,
    userDetails.wcf_shipping_address_1,
    userDetails.wcf_shipping_address_2,
    userDetails.wcf_shipping_city,
    userDetails.wcf_shipping_state,
    userDetails.wcf_shipping_postcode,
    userDetails.wcf_shipping_country,
  ].filter(Boolean);

  const checkoutLink = raw.checkout_link || cart.checkout_link || null;

  return (
    <div className="pb-24 pt-16 px-4 animate-fade-in min-h-screen bg-gray-50">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-white z-10 px-4 py-4 border-b border-gray-100 flex justify-between items-center">
        <button
          onClick={onBack}
          className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </button>

        <h1 className="text-lg font-bold text-gray-800">
          Cart #{id}
        </h1>

        <button
          onClick={onRefresh}
          className="px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-700 active:scale-95"
        >
          Refresh
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {/* Summary card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex gap-3">
          <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
            <ShoppingCart size={18} className="text-yellow-700" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start mb-1">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Abandoned Cart #{id}
                </p>
                {createdAtLabel && (
                  <p className="text-xs text-gray-500">{createdAtLabel}</p>
                )}
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColor}`}
              >
                {status}
              </span>
            </div>

            <div className="mt-2 flex justify-between items-center text-xs text-gray-600">
              <span>Total cart value</span>
              <span className="text-base font-bold text-gray-900">
                {formatMoney(cartTotal)}
              </span>
            </div>

            {unsubscribed ? (
              <p className="mt-2 text-[11px] text-red-500">
                This contact has unsubscribed from follow-ups.
              </p>
            ) : null}
          </div>
        </div>

        {/* Customer info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-500 mb-1">
            Customer
          </p>

          <div className="flex items-center gap-2 text-sm text-gray-800">
            <User size={14} className="text-gray-500" />
            <span>{name}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-800">
            <Mail size={14} className="text-gray-500" />
            <span>{email || "No email"}</span>
          </div>

          {phone && (
            <div className="flex items-center gap-2 text-sm text-gray-800">
              <Phone size={14} className="text-gray-500" />
              <span>{phone}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-gray-800">
            <Globe2 size={14} className="text-gray-500" />
            <span>{location || "Location not specified"}</span>
          </div>
        </div>

        {/* Addresses */}
        {(billingAddressLines.length > 0 ||
          shippingAddressLines.length > 0) && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
            <p className="text-xs font-semibold text-gray-500 mb-1">
              Addresses
            </p>

            {billingAddressLines.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-gray-500 mb-1">
                  Billing
                </p>
                <div className="flex items-start gap-2 text-xs text-gray-800">
                  <MapPin size={12} className="mt-[2px] text-gray-500" />
                  <div>
                    {billingAddressLines.map((line, idx) => (
                      <p key={idx}>{line}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {shippingAddressLines.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-gray-500 mb-1">
                  Shipping
                </p>
                <div className="flex items-start gap-2 text-xs text-gray-800">
                  <MapPin size={12} className="mt-[2px] text-gray-500" />
                  <div>
                    {shippingAddressLines.map((line, idx) => (
                      <p key={idx}>{line}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Items list */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 mb-2">
            Cart items
          </p>

          {itemsArray.length === 0 && (
            <p className="text-xs text-gray-400">
              No item-level data available.
            </p>
          )}

          {itemsArray.length > 0 && (
            <div className="space-y-3">
              {itemsArray.map((item, idx) => {
                const title =
                  item.name ||
                  item.product_name ||
                  item.productTitle ||
                  "Cart item";
                const qty = item.quantity || item.qty || 1;
                const lineTotal = Number(
                  item.line_total ||
                    item.line_subtotal ||
                    item.total ||
                    0
                );
                const imageUrl = item.image_url || item.image || null;

                return (
                  <div
                    key={item.id || item.product_id || idx}
                    className="flex gap-3 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0"
                  >
                    {imageUrl && (
                      <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                        <img
                          src={imageUrl}
                          alt={title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-900">
                        {title}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        Qty: {qty}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-gray-900">
                        {formatMoney(lineTotal)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Order summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={14} className="text-gray-500" />
            <p className="text-xs font-semibold text-gray-700">
              Order summary
            </p>
          </div>

          <div className="text-xs text-gray-700 space-y-1">
            <div className="flex justify-between">
              <span>Items subtotal</span>
              <span>{formatMoney(summary.items_subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>{formatMoney(summary.shipping)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <span>{formatMoney(summary.tax)}</span>
            </div>
            <div className="flex justify-between">
              <span>Discount</span>
              <span>-{formatMoney(summary.discount)}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 mt-1 flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatMoney(summary.cart_total || cartTotal)}</span>
            </div>
          </div>
        </div>

        {/* Checkout link if available */}
        {checkoutLink && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-500 mb-2">
              Recoverable checkout link
            </p>
            <a
              href={checkoutLink}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-purple-700 underline break-all"
            >
              {checkoutLink}
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default AbandonedCartDetails;
