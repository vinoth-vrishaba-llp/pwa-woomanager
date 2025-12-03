// client/src/components/Analytics.jsx
import React, { useState, useMemo } from "react";
import { RefreshCw, BarChart2 } from "lucide-react";
import LoadingState from "./ui/LoadingState";
import ErrorState from "./ui/ErrorState";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const Analytics = ({
  data,
  salesReport,
  loading,
  error,
  onRefresh,
  session,
  serverTimeIso,   // <-- make sure this exists here
}) => {
  const [activeMetric, setActiveMetric] = useState("total_sales");
  const [rangeType, setRangeType] = useState("30d");
  const [rangeLabel, setRangeLabel] = useState("Last 30 days");

  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [report, setReport] = useState(salesReport || null);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState(null);

  const isLoading = loading || localLoading;
  const mergedError = localError || error;

  const orders = Array.isArray(data.orders) ? data.orders : [];

  // ---------- helpers ----------

  // Local YYYY-MM-DD (no UTC shift)
  const fmtDate = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Same as OrderList fix: always anchor ranges on server time if available
  const getAnchorDate = () => {
    if (serverTimeIso) {
      const d = new Date(serverTimeIso);
      if (!Number.isNaN(d.getTime())) return d;
    }
    return new Date(); // fallback if server time missing
  };

  const fetchRangeReport = async (dateMin, dateMax) => {
    if (!session) return;

    setLocalLoading(true);
    setLocalError(null);

    let body;
    if (session.type === "sso") {
      body = { store_id: session.store_id, date_min: dateMin, date_max: dateMax };
    } else if (session.type === "manual") {
      body = { config: session.config, date_min: dateMin, date_max: dateMax };
    } else {
      setLocalLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/reports/sales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to fetch sales report");
      const json = await res.json(); // { report, date_min, date_max }
      setReport(json.report || null);
    } catch (e) {
      setLocalError(e.message || "Failed to load analytics");
    } finally {
      setLocalLoading(false);
    }
  };

  const handlePresetRange = async (type) => {
    setRangeType(type);
    let label = "Last 30 days";
    let days = 30;

    if (type === "7d") {
      label = "Last 7 days";
      days = 7;
    } else if (type === "90d") {
      label = "Last 90 days";
      days = 90;
    }
    setRangeLabel(label);

    // Use server time as anchor if available
    const base = serverTimeIso ? new Date(serverTimeIso) : new Date();

    const end = new Date(base);
    end.setHours(23, 59, 59, 999);

    const start = new Date(base);
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

    await fetchRangeReport(fmtDate(start), fmtDate(end));
  };

  const handleApplyCustom = async () => {
    if (!customStart || !customEnd) return;
    setRangeType("custom");
    setRangeLabel("Custom range");
    await fetchRangeReport(customStart, customEnd);
  };

  // ---------- base totals (current report) ----------

  const baseTotalSales = report
    ? Number(report.total_sales || 0)
    : orders.reduce((acc, o) => acc + (Number(o.total) || 0), 0);

  const baseTotalOrders = report
    ? Number(report.total_orders || 0)
    : orders.length;

  const baseNetSales = report ? Number(report.net_sales || 0) : baseTotalSales;
  const baseAvgOrder =
    baseTotalOrders > 0 ? baseTotalSales / baseTotalOrders : 0;

  // ---------- dailySeries ----------

  const dailySeries = useMemo(() => {
    const series = [];

    if (report && report.totals && Object.keys(report.totals).length > 0) {
      // Woo report already grouped per day in requested range
      Object.entries(report.totals).forEach(([dateStr, row]) => {
        series.push({
          date: dateStr,
          sales: Number(row.sales || 0),
          orders: Number(row.orders || 0),
        });
      });
    } else {
      // Fallback: group orders by LOCAL date
      const map = new Map(); // dateStr -> { sales, orders }

      orders.forEach((o) => {
        if (!o.date) return;
        const d = new Date(o.date);
        if (Number.isNaN(d.getTime())) return;

        const dateStr = fmtDate(d);

        const prev = map.get(dateStr) || { sales: 0, orders: 0 };
        prev.sales += Number(o.total) || 0;
        prev.orders += 1;
        map.set(dateStr, prev);
      });

      map.forEach((row, dateStr) => {
        series.push({
          date: dateStr,
          sales: row.sales,
          orders: row.orders,
        });
      });
    }

    if (!series.length) return [];

    series.sort((a, b) => new Date(a.date) - new Date(b.date));
    return series;
  }, [report, orders]);

  // ---------- totals from current series ----------

  const rangeTotals = useMemo(() => {
    if (!dailySeries.length) {
      return {
        sales: baseTotalSales,
        orders: baseTotalOrders,
        avgOrder: baseAvgOrder,
      };
    }
    const sales = dailySeries.reduce((acc, d) => acc + d.sales, 0);
    const ordersCount = dailySeries.reduce((acc, d) => acc + d.orders, 0);
    const avgOrder = ordersCount > 0 ? sales / ordersCount : 0;
    return { sales, orders: ordersCount, avgOrder };
  }, [dailySeries, baseTotalSales, baseTotalOrders, baseAvgOrder]);

  const displaySales = rangeTotals.sales;
  const displayOrders = rangeTotals.orders;
  const displayAvgOrder = rangeTotals.avgOrder;
  const displayNetSales = displaySales;

  const { maxValue } = useMemo(() => {
    if (!dailySeries.length) return { maxValue: 0 };

    let values;
    if (activeMetric === "total_orders") {
      values = dailySeries.map((d) => d.orders);
    } else if (activeMetric === "avg_order") {
      values = dailySeries.map((d) =>
        d.orders > 0 ? d.sales / d.orders : 0
      );
    } else {
      values = dailySeries.map((d) => d.sales);
    }
    const max = Math.max(...values, 0);
    return { maxValue: max };
  }, [dailySeries, activeMetric]);

  const startLabel = dailySeries.length > 0 ? dailySeries[0].date : "–";
  const endLabel =
    dailySeries.length > 0 ? dailySeries[dailySeries.length - 1].date : "–";

  // main metric
  let metricValue = displaySales;
  let metricTitle = "Sales in selected period";
  if (activeMetric === "total_orders") {
    metricValue = displayOrders;
    metricTitle = "Orders in selected period";
  } else if (activeMetric === "avg_order") {
    metricValue = displayAvgOrder;
    metricTitle = "Average order value";
  }

  const formattedMetricValue =
    activeMetric === "total_orders"
      ? metricValue.toFixed(0)
      : `₹${metricValue.toFixed(2)}`;

  // ---------- growth % ----------

  const growthPercent = useMemo(() => {
    if (!dailySeries || dailySeries.length < 2) {
      return 0.0;
    }

    const midPoint = Math.floor(dailySeries.length / 2);
    const firstHalf = dailySeries.slice(0, midPoint);
    const secondHalf = dailySeries.slice(midPoint);

    let firstHalfTotal = 0;
    let secondHalfTotal = 0;

    if (activeMetric === "total_orders") {
      firstHalfTotal = firstHalf.reduce(
        (sum, day) => sum + (day.orders || 0),
        0
      );
      secondHalfTotal = secondHalf.reduce(
        (sum, day) => sum + (day.orders || 0),
        0
      );
    } else if (activeMetric === "avg_order") {
      const firstHalfSales = firstHalf.reduce(
        (sum, day) => sum + (day.sales || 0),
        0
      );
      const firstHalfOrders = firstHalf.reduce(
        (sum, day) => sum + (day.orders || 0),
        0
      );
      firstHalfTotal =
        firstHalfOrders > 0 ? firstHalfSales / firstHalfOrders : 0;

      const secondHalfSales = secondHalf.reduce(
        (sum, day) => sum + (day.sales || 0),
        0
      );
      const secondHalfOrders = secondHalf.reduce(
        (sum, day) => sum + (day.orders || 0),
        0
      );
      secondHalfTotal =
        secondHalfOrders > 0 ? secondHalfSales / secondHalfOrders : 0;
    } else {
      firstHalfTotal = firstHalf.reduce(
        (sum, day) => sum + (day.sales || 0),
        0
      );
      secondHalfTotal = secondHalf.reduce(
        (sum, day) => sum + (day.sales || 0),
        0
      );
    }

    if (firstHalfTotal === 0 && secondHalfTotal === 0) return 0;
    if (firstHalfTotal === 0) return 100;
    if (!isFinite(firstHalfTotal) || !isFinite(secondHalfTotal)) return 0;

    const growth = ((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100;
    return isFinite(growth) ? growth : 0;
  }, [dailySeries, activeMetric]);

  // ---------- render ----------

  if (loading && !report) return <LoadingState />;
  if (mergedError && !report)
    return <ErrorState message={mergedError} onRetry={onRefresh} />;

  return (
    <div className="pb-24 pt-16 px-4 animate-fade-in">
      {/* Header */}
     <div className="fixed top-0 left-0 right-0 bg-white z-10 px-4 py-4 border-b border-gray-100 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Analytics</h1>
        <button
          onClick={onRefresh}
          className="p-2 bg-gray-100 rounded-full active:scale-95 transition"
          disabled={localLoading}
        >
          <RefreshCw
            size={20}
            className={`text-gray-600 ${localLoading ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {/* Range filter chips + custom dates (TOP) */}
      <div className="mt-4 mb-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => handlePresetRange("7d")}
            disabled={localLoading}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition ${
              rangeType === "7d"
                ? "bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-200"
                : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Last 7 days
          </button>
          <button
            type="button"
            onClick={() => handlePresetRange("30d")}
            disabled={localLoading}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition ${
              rangeType === "30d"
                ? "bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-200"
                : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Last 30 days
          </button>
          <button
            type="button"
            onClick={() => handlePresetRange("90d")}
            disabled={localLoading}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition ${
              rangeType === "90d"
                ? "bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-200"
                : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Last 90 days
          </button>
          <button
            type="button"
            onClick={() => setRangeType("custom")}
            disabled={localLoading}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition ${
              rangeType === "custom"
                ? "bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-200"
                : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Custom
          </button>
        </div>

        {rangeType === "custom" && (
          <div className="mt-3 bg-white rounded-xl border border-gray-200 p-3 flex flex-col gap-2 text-[11px]">
            <div className="flex gap-2">
              <div className="flex-1">
                <div className="text-gray-500 mb-1">From</div>
                <input
                  type="date"
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  disabled={localLoading}
                />
              </div>
              <div className="flex-1">
                <div className="text-gray-500 mb-1">To</div>
                <input
                  type="date"
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  disabled={localLoading}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleApplyCustom}
                disabled={!customStart || !customEnd || localLoading}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {localLoading ? "Loading..." : "Apply"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main analytics card */}
      <div
        className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-5 transition-opacity ${
          localLoading ? "opacity-60" : "opacity-100"
        }`}
      >
        {/* Top row */}
        <div className="flex justify-between items-start pb-4 mb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center">
              <BarChart2 className="text-purple-700" size={26} />
            </div>
            <div>
              <div className="text-2xl font-semibold text-gray-900">
                {formattedMetricValue}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{metricTitle}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{rangeLabel}</p>
            </div>
          </div>
          <span
            className={`inline-flex items-center ${
              growthPercent >= 0
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-red-50 border-red-200 text-red-700"
            } border text-[11px] font-medium px-2 py-0.5 rounded-full`}
          >
            {growthPercent >= 0 ? "↑" : "↓"}{" "}
            {Math.abs(growthPercent).toFixed(1)}%
          </span>
        </div>

        {/* Net sales vs orders */}
        <div className="flex justify-between text-sm mb-4">
          <div>
            <span className="text-gray-500 mr-1">Net sales:</span>
            <span className="font-semibold text-gray-900">
              ₹{displayNetSales.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-gray-500 mr-1">Orders:</span>
            <span className="font-semibold text-gray-900">{displayOrders}</span>
          </div>
        </div>

        {/* Metric filter chips */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveMetric("total_sales")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
              activeMetric === "total_sales"
                ? "bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-200"
                : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
            }`}
          >
            Total Sales
          </button>
          <button
            onClick={() => setActiveMetric("total_orders")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
              activeMetric === "total_orders"
                ? "bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-200"
                : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
            }`}
          >
            Total Orders
          </button>
          <button
            onClick={() => setActiveMetric("avg_order")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
              activeMetric === "avg_order"
                ? "bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-200"
                : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
            }`}
          >
            Avg. Order Value
          </button>
        </div>

        {/* Chart */}
        <div className="mt-1">
          {dailySeries.length === 0 ? (
            <div className="mb-3">
              <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 w-1/3" />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                No per-day breakdown available for this range.
              </p>
            </div>
          ) : (
            <>
              <div className="relative bg-gray-50 rounded-lg p-3 pt-12 overflow-hidden">
                <div className="h-40 flex items-end gap-0.5 overflow-x-auto no-scrollbar">
                  {dailySeries.map((day, idx) => {
                    let value;

                    if (activeMetric === "total_orders") {
                      value = day.orders;
                    } else if (activeMetric === "avg_order") {
                      // Calculate average order value for THIS specific day
                      value = day.orders > 0 ? day.sales / day.orders : 0;
                    } else {
                      value = day.sales;
                    }

                    // Use pixel-based minimum height to ensure bars are always visible
                    const minHeightPx = value > 0 ? 12 : 4; // 12px for data, 4px for zero
                    const calculatedHeightPx =
                      maxValue > 0 ? (value / maxValue) * 152 : 0; // 152px = 160px container - 8px padding
                    const heightPx = Math.max(calculatedHeightPx, minHeightPx);

                    return (
                      <div
                        key={day.date || idx}
                        className="flex-1 flex flex-col items-center justify-end group min-w-[18px] relative"
                      >
                        {/* Tooltip - appears on the right side to always be visible */}
                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 text-[10px] px-2 py-1.5 rounded-md bg-gray-900 text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30 font-medium shadow-lg">
                          <div className="text-left">
                            <div className="font-semibold">
                              {activeMetric === "total_orders"
                                ? `${day.orders} orders`
                                : activeMetric === "avg_order"
                                ? `₹${value.toFixed(2)}`
                                : `₹${day.sales.toFixed(2)}`}
                            </div>
                            <div className="text-[9px] text-gray-300">
                              {day.date}
                            </div>
                          </div>
                          {/* Arrow pointing left */}
                          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
                        </div>

                        {/* Bar */}
                        <div
                          className="w-full rounded-t-md transition-all duration-200 relative cursor-pointer"
                          style={{
                            height: `${heightPx}px`,
                            maxHeight: "152px",
                            background:
                              activeMetric === "total_orders"
                                ? "linear-gradient(to top, #10b981, #34d399)" // green for orders
                                : activeMetric === "avg_order"
                                ? "linear-gradient(to top, #f59e0b, #fbbf24)" // orange for avg
                                : "linear-gradient(to top, #a855f7, #c084fc)", // purple for sales
                            boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
                            minHeight: `${minHeightPx}px`,
                          }}
                        ></div>

                        {/* Date label */}
                        <div className="text-[8px] text-gray-400 mt-1.5 text-center">
                          {day.date.slice(5)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 mt-4 px-1">
                <span>{startLabel}</span>
                <span>{endLabel}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
