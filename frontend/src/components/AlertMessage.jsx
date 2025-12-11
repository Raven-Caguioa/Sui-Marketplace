// components/AlertMessage.jsx
import React from 'react';
import { AlertCircle, X } from 'lucide-react';

export default function AlertMessage({ type, message, onClose }) {
  if (!message) return null;

  const isError = type === 'error';
  
  return (
    <div className={`mb-6 ${isError ? 'bg-red-500/10 border-red-500/30' : 'bg-green-600/10 border-green-500/30'} border rounded-lg p-4 flex items-start gap-3`}>
      {isError ? (
        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
      ) : (
        <div className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5">✓</div>
      )}
      <div className="flex-1">
        <p className={`${isError ? 'text-red-400' : 'text-green-400'} font-semibold`}>
          {isError ? 'Error' : 'Success'}
        </p>
        <p className={`${isError ? 'text-red-300' : 'text-green-300'} text-sm`}>{message}</p>
      </div>
      {onClose && (
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}