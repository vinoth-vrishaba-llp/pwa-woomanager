// client/src/components/ui/StatusBadge.jsx
import React from 'react';

const StatusBadge = ({ status }) => {
  const styles = {
    processing: "bg-yellow-100 text-yellow-800 border-yellow-200",
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    completed: "bg-green-100 text-green-800 border-green-200",
    cancelled: "bg-red-100 text-red-800 border-red-200",
    failed: "bg-red-100 text-red-800 border-red-200",
    instock: "bg-green-100 text-green-800 border-green-200",
    lowstock: "bg-orange-100 text-orange-800 border-orange-200",
    outofstock: "bg-gray-100 text-gray-800 border-gray-200",
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[status] || "bg-gray-100"}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
