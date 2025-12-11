// components/StatCard.jsx
import React from 'react';
import { Package, DollarSign, User } from 'lucide-react';

const iconMap = {
  package: Package,
  dollar: DollarSign,
  user: User,
};

const colorMap = {
  purple: 'text-purple-400',
  green: 'text-green-400',
  blue: 'text-blue-400',
};

export default function StatCard({ 
  label, 
  value, 
  icon, 
  color = 'purple',
  showButton = false,
  buttonLabel = 'Action',
  onButtonClick,
  buttonDisabled = false
}) {
  const Icon = iconMap[icon] || Package;
  const iconColor = colorMap[color] || 'text-purple-400';

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm mb-1">{label}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
        </div>
        <Icon className={`w-12 h-12 ${iconColor}`} />
      </div>
      {showButton && (
        <button
          onClick={onButtonClick}
          disabled={buttonDisabled}
          className="mt-4 w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white rounded-lg font-semibold transition-colors text-sm"
        >
          {buttonLabel}
        </button>
      )}
    </div>
  );
}