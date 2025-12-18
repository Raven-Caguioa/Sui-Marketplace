import React from 'react';
import { truncateId } from './NFTTrading';

const NFTCard = ({ nft, isSelected, onSelect, selectionColor = 'purple' }) => {
  const colorClasses = {
    purple: isSelected ? 'border-purple-400 bg-purple-600/20' : 'border-gray-700 bg-gray-800/50',
    green: isSelected ? 'border-green-400 bg-green-600/20' : 'border-gray-700 bg-gray-800/50',
    blue: isSelected ? 'border-blue-400 bg-blue-600/20' : 'border-gray-700 bg-gray-800/50',
  };

  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border-2 ${colorClasses[selectionColor]} hover:border-${selectionColor}-300`}
    >
      {/* NFT Image - Small Square */}
      <div className="flex-shrink-0 w-16 h-16 bg-gray-900 rounded-md overflow-hidden border border-white/10">
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
    </div>
  );
};

export default NFTCard;