// client/src/components/ui/LoadingState.jsx
import React from 'react';
import { Loader } from 'lucide-react';

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center h-64 text-gray-400 animate-fade-in">
    <Loader className="animate-spin mb-2 text-purple-600" size={32} />
    <p className="text-xs font-medium">Syncing...</p>
  </div>
);

export default LoadingState;
