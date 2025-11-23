import React from 'react';

const Analytics = () => {
  const SALES_DATA = [450, 120, 890, 420, 600, 750, 1200];

  const max = Math.max(...SALES_DATA);

  return (
    <div className="pb-24 pt-16 px-4 animate-fade-in">
      <div className="fixed top-0 left-0 right-0 bg-white z-10 px-4 py-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-800">Analytics</h1>
      </div>

      <div className="mt-2 space-y-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-700">Revenue (This Week)</h3>
            <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
              +14.2%
            </span>
          </div>

          <div className="h-40 flex items-end justify-between gap-2">
            {SALES_DATA.map((val, idx) => {
              const height = (val / max) * 100;
              const label = ['M', 'T', 'W', 'T', 'F', 'S', 'S'][idx];

              return (
                <div key={idx} className="flex flex-col items-center w-full group">
                  <div
                    className="w-full bg-purple-200 rounded-t-sm group-hover:bg-purple-500 transition-all duration-300 relative"
                    style={{ height: `${height}%` }}
                  >
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded pointer-events-none transition-opacity whitespace-nowrap z-10">
                      ₹{val}
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-2 font-medium">{label}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="text-gray-500 text-xs uppercase font-bold mb-1">Orders</div>
            <div className="text-2xl font-bold text-gray-800">142</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="text-gray-500 text-xs uppercase font-bold mb-1">Visitors</div>
            <div className="text-2xl font-bold text-gray-800">3.4k</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
