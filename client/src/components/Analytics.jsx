// client/src/components/Analytics.jsx
import React, { useState, useMemo } from 'react';
import { RefreshCw, BarChart2, ChevronDown } from 'lucide-react';
import LoadingState from './ui/LoadingState';
import ErrorState from './ui/ErrorState';

const Analytics = ({ data, salesReport, loading, error, onRefresh }) => {
  const [activeMetric, setActiveMetric] = useState('total_sales'); // 'total_sales' | 'total_orders' | 'avg_order'
  const [isRangeOpen, setIsRangeOpen] = useState(false);
  const [rangeLabel, setRangeLabel] = useState('Last 30 days');

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={onRefresh} />;

  const orders = Array.isArray(data.orders) ? data.orders : [];
  const report = salesReport || null;

  // ---- Base totals from report or orders (full period) ----
  const baseTotalSales = report
    ? Number(report.total_sales || 0)
    : orders.reduce((acc, o) => acc + (Number(o.total) || 0), 0);

  const baseTotalOrders = report ? Number(report.total_orders || 0) : orders.length;

  const baseNetSales = report ? Number(report.net_sales || 0) : baseTotalSales;

  const baseAvgOrder =
    baseTotalOrders > 0 ? baseTotalSales / baseTotalOrders : 0;

  // ---- Build daily series (report.totals OR orders grouped by day) ----
  const dailySeries = useMemo(() => {
    // 1) collect all days into a map
    const map = new Map(); // dateStr -> { sales, orders }

    const addToMap = (dateStr, salesDelta, ordersDelta) => {
      if (!dateStr) return;
      const key = dateStr;
      const prev = map.get(key) || { sales: 0, orders: 0 };
      prev.sales += salesDelta;
      prev.orders += ordersDelta;
      map.set(key, prev);
    };

    // Prefer server report if it has totals
    if (report && report.totals && Object.keys(report.totals).length > 0) {
      Object.entries(report.totals).forEach(([dateStr, row]) => {
        addToMap(
          dateStr,
          Number(row.sales || 0),
          Number(row.orders || 0)
        );
      });
    } else {
      // Fallback: derive from orders
      orders.forEach((o) => {
        if (!o.date) return;
        const d = new Date(o.date);
        if (Number.isNaN(d.getTime())) return;
        const dateStr = d.toISOString().slice(0, 10); // YYYY-MM-DD
        addToMap(dateStr, Number(o.total) || 0, 1);
      });
    }

    const allEntries = Array.from(map.entries());
    if (!allEntries.length) return [];

    // 2) sort ascending by date
    allEntries.sort((a, b) => new Date(a[0]) - new Date(b[0]));

    // 3) apply range filter (Last 7/30/90 days)
    const match = rangeLabel.match(/\d+/);
    const windowDays = match ? Number(match[0]) : 30;

    const lastDate = new Date(allEntries[allEntries.length - 1][0]);
    const cutoff = new Date(lastDate);
    cutoff.setDate(lastDate.getDate() - (windowDays - 1));

    return allEntries
      .filter(([dateStr]) => {
        const d = new Date(dateStr);
        return d >= cutoff && d <= lastDate;
      })
      .map(([dateStr, row]) => ({
        date: dateStr,
        sales: row.sales,
        orders: row.orders,
      }));
  }, [report, orders, rangeLabel]);

  // ---- Totals in CURRENT range (this is what should change on range change) ----
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
  const displayNetSales = displaySales; // for now, same as sales in range

  // ---- Choose which metric to visualize for value + chart ----
  const { chartValues, maxValue } = useMemo(() => {
    if (!dailySeries.length) return { chartValues: [], maxValue: 0 };

    let values;
    if (activeMetric === 'total_orders') {
      values = dailySeries.map((d) => d.orders);
    } else {
      values = dailySeries.map((d) => d.sales);
    }

    const max = Math.max(...values, 0);
    return { chartValues: values, maxValue: max };
  }, [dailySeries, activeMetric]);

  const startLabel =
    dailySeries.length > 0 ? dailySeries[0].date : '–';
  const endLabel =
    dailySeries.length > 0 ? dailySeries[dailySeries.length - 1].date : '–';

  // ---- Main metric number & title ----
  let metricValue = displaySales;
  let metricTitle = 'Sales in selected period';
  if (activeMetric === 'total_orders') {
    metricValue = displayOrders;
    metricTitle = 'Orders in selected period';
  } else if (activeMetric === 'avg_order') {
    metricValue = displayAvgOrder;
    metricTitle = 'Average order value';
  }

  const formattedMetricValue =
    activeMetric === 'total_orders'
      ? metricValue.toFixed(0)
      : `₹${metricValue.toFixed(2)}`;

  // Fake growth + fallback progress
  const growthPercent = 0.0;
  const progressPercent =
    maxValue > 0 && chartValues.length > 0
      ? Math.min(
          100,
          (chartValues.reduce((a, v) => a + v, 0) /
            (maxValue * chartValues.length)) * 100
        )
      : 30;

  const handleSelectRange = (label) => {
    setRangeLabel(label);
    setIsRangeOpen(false);
  };

  return (
    <div className="pb-24 pt-16 px-4 animate-fade-in">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-white z-10 px-4 py-4 border-b border-gray-100 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Analytics</h1>
        <button
          onClick={onRefresh}
          className="p-2 bg-gray-100 rounded-full active:scale-95 transition"
        >
          <RefreshCw size={20} className="text-gray-600" />
        </button>
      </div>

      <div className="mt-2">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mt-4">
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
              </div>
            </div>
            <span className="inline-flex items-center bg-green-50 border border-green-200 text-green-700 text-[11px] font-medium px-2 py-0.5 rounded-full">
              ↑ {growthPercent.toFixed(1)}%
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
              <span className="font-semibold text-gray-900">
                {displayOrders}
              </span>
            </div>
          </div>

          {/* Metric filter chips */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveMetric('total_sales')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                activeMetric === 'total_sales'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-200'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              Total Sales
            </button>
            <button
              onClick={() => setActiveMetric('total_orders')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                activeMetric === 'total_orders'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-200'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              Total Orders
            </button>
            <button
              onClick={() => setActiveMetric('avg_order')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                activeMetric === 'avg_order'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-200'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              Avg. Order Value
            </button>
          </div>

          {/* Chart / fallback */}
          <div className="mt-1">
            {dailySeries.length === 0 ? (
              <div className="mb-3">
                <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  No per-day breakdown available. Showing overall period progress.
                </p>
              </div>
            ) : (
              <>
                <div className="h-24 flex items-end gap-[3px] overflow-hidden">
                  {dailySeries.map((day, idx) => {
                    const value =
                      activeMetric === 'total_orders' ? day.orders : day.sales;
                    const pct =
                      maxValue > 0 ? (value / maxValue) * 100 : 0;
                    const height = Math.max(pct, 8); // minimum height

                    return (
                      <div
                        key={day.date || idx}
                        className="flex-1 flex flex-col items-center group"
                      >
                        <div
                          className="w-full rounded-full bg-purple-200 group-hover:bg-purple-500 transition-all duration-200 relative"
                          style={{ height: `${height}%` }}
                        >
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] px-1.5 py-0.5 rounded bg-gray-900 text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            {activeMetric === 'total_orders'
                              ? `${day.orders} orders`
                              : `₹${day.sales.toFixed(0)}`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 mt-2">
                  <span>{startLabel}</span>
                  <span>{endLabel}</span>
                </div>
              </>
            )}
          </div>

          {/* Footer: range dropdown + link */}
          <div className="relative flex justify-between items-center border-t border-gray-100 mt-4 pt-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsRangeOpen((v) => !v)}
                className="inline-flex items-center text-xs font-medium text-gray-700 hover:text-gray-900"
              >
                {rangeLabel}
                <ChevronDown size={14} className="ml-1" />
              </button>

              {isRangeOpen && (
                <div className="absolute mt-2 w-36 bg-white border border-gray-200 rounded-lg shadow-lg text-xs z-20">
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-gray-50"
                    onClick={() => handleSelectRange('Last 7 days')}
                  >
                    Last 7 days
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-gray-50"
                    onClick={() => handleSelectRange('Last 30 days')}
                  >
                    Last 30 days
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-gray-50"
                    onClick={() => handleSelectRange('Last 90 days')}
                  >
                    Last 90 days
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              className="inline-flex items-center text-xs font-medium text-purple-600 hover:text-purple-700"
            >
              Sales Report
              <span className="ml-1 text-sm">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
