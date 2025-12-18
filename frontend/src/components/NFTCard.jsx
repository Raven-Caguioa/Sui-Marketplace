import React from 'react';
import { truncateId } from './NFTTrading';

const NFTCard = ({ nft, isSelected, onSelect, selectionColor = 'purple' }) => {
  const getColorClasses = () => {
    if (isSelected) {
      switch(selectionColor) {
        case 'purple':
          return 'border-black-3 bg-purple-500 ring-2 ring-purple-400';
        case 'green':
          return 'border-black-3 bg-green-500 ring-2 ring-green-400';
        case 'blue':
          return 'border-black-3 bg-blue-500 ring-2 ring-blue-400';
        default:
          return 'border-black-3 bg-purple-500 ring-2 ring-purple-400';
      }
    }
    return 'border-black-2 bg-gray-800/50 hover:border-black-3';
  };

  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${getColorClasses()}`}
    >
      {/* NFT Image - Small Square */}
      <div className="flex-shrink-0 w-16 h-16 bg-gray-900 rounded-md overflow-hidden">
        {nft.image ? (
          <img 
            src={nft.image} 
            alt={nft.name}
            className="w-full h-full object-cover"
            onError={(e) => { 
              e.target.style.display = 'none';
              e.target.parentElement.classList.add('flex', 'items-center', 'justify-center');
              e.target.parentElement.innerHTML = '<span class="text-gray-600 text-xs">No Image</span>';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-gray-600 text-xs">No Image</span>
          </div>
        )}
      </div>

      {/* NFT Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white truncate text-sm">{nft.name}</p>
        <p className="text-xs text-gray-400 truncate mt-0.5">ID: {truncateId(nft.id)}</p>
      </div>

      {/* Selection Indicator - Checkmark */}
      {isSelected && (
        <div className="flex-shrink-0">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
            selectionColor === 'purple' ? 'bg-purple-500' :
            selectionColor === 'green' ? 'bg-green-500' :
            'bg-blue-500'
          }`}>
            <svg className="w-4 h-4 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};

export default NFTCard;