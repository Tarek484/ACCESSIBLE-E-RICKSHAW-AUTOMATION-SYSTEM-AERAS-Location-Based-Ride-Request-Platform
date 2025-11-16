import React from 'react';

// Loading Spinner Component
export function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <div className="w-12 h-12 border-4 border-gray-200 border-t-emerald-500 rounded-full animate-spin"></div>
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  );
}

// Status Badge Component
export function StatusBadge({ status }) {
  const statusConfig = {
    online: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500', label: 'Online' },
    offline: { bg: 'bg-gray-100', text: 'text-gray-800', dot: 'bg-gray-500', label: 'Offline' },
    inride: { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500', label: 'On Ride' },
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500', label: 'Pending' },
    offering: { bg: 'bg-cyan-100', text: 'text-cyan-800', dot: 'bg-cyan-500', label: 'Offering' },
    accepted: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500', label: 'Accepted' },
    picked_up: { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500', label: 'Picked Up' },
    completed: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500', label: 'Completed' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500', label: 'Cancelled' },
  };

  const config = statusConfig[status] || statusConfig.offline;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${status === 'inride' || status === 'offering' || status === 'pending' ? 'animate-pulse' : ''}`}></span>
      {config.label}
    </span>
  );
}

// Stat Card Component
export function StatCard({ icon, title, value, subtitle, color = 'blue' }) {
  const colorConfig = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  const bgClass = colorConfig[color] || colorConfig.blue;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${bgClass}`}>
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

// Page Header Component
export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b-2 border-gray-100">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// Card Component
export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}>
      {children}
    </div>
  );
}

// Card Header
export function CardHeader({ title, action }) {
  return (
    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {action && <div>{action}</div>}
    </div>
  );
}

// Card Body
export function CardBody({ children, className = '' }) {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  );
}

// Empty State Component
export function EmptyState({ icon, title, message }) {
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4 opacity-50">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}
