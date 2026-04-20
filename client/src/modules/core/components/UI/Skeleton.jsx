// client/src/modules/core/components/UI/Skeleton.jsx
import React from 'react';

export default function Skeleton({ className = '', variant = 'text', count = 1 }) {
  const getBaseClass = () => {
    switch (variant) {
      case 'circle': return 'rounded-full';
      case 'rect': return 'rounded-2xl';
      default: return 'rounded-lg h-4';
    }
  };

  const skeletons = Array.from({ length: count });

  return (
    <>
      {skeletons.map((_, i) => (
        <div
          key={i}
          className={`animate-pulse bg-gray-200 ${getBaseClass()} ${className} ${i > 0 ? 'mt-2' : ''}`}
        />
      ))}
    </>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="w-full animate-pulse">
      <div className="flex gap-4 mb-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 bg-gray-200 rounded-lg flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-4 border-b border-gray-100">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-4 bg-gray-100 rounded-lg flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 bg-gray-200 rounded-2xl" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded-lg w-1/2 mb-2" />
          <div className="h-3 bg-gray-100 rounded-lg w-1/3" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-3 bg-gray-100 rounded-lg w-full" />
        <div className="h-3 bg-gray-100 rounded-lg w-full" />
        <div className="h-3 bg-gray-100 rounded-lg w-2/3" />
      </div>
    </div>
  );
}
