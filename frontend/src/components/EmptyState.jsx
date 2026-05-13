import React from 'react';

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="text-center py-16 px-6">
      {Icon && (
        <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
          <Icon className="w-8 h-8 text-emerald-500" />
        </div>
      )}
      <h3 className="text-base font-bold text-gray-800 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 max-w-sm mx-auto mb-5">{description}</p>}
      {action}
    </div>
  );
}
