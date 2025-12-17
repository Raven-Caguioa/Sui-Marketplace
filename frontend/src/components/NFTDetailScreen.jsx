import React, { useState } from 'react';
import { X, ShoppingCart, AlertCircle } from 'lucide-react';

export default function NFTDetailScreen({ 
  listing, 
  onClose, 
  account, 
  packageId, 
  marketplaceId, 
  coinType,
  signAndExecuteTransaction,
  onSuccess,
  onError 
}) {
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const formatSui = (mist) => (Number(mist) / 1_000_000_000).toFixed(4);
  const truncateAddress = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

  const handleBuyNFT = async () => {
    if (!account) {
      setError('Please connect wallet');
      return;
    }

    setBuyLoading(true);
    setError('');

    try {
      const amountInMist = Number(listing.askPrice);
      const { Transaction } = await import('@mysten/sui/transactions');
      const tx = new Transaction();
      
      const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(amountInMist)]);
      
      tx.moveCall({
        target: `${packageId}::marketplace::buy_and_take`,
        typeArguments: [listing.itemType, coinType],
        arguments: [
          tx.object(marketplaceId),
          tx.pure.id(listing.itemId),
          coin,
        ],
      });

      signAndExecuteTransaction(
        {
          transaction: tx,
          options: {
            showEffects: true,
            showObjectChanges: true,
          },
        },
        {
          onSuccess: (result) => {
            console.log('Buy transaction successful:', result);
            setSuccess(`Item purchased successfully! Digest: ${result.digest}`);
            setBuyLoading(false);
            setShowBuyModal(false);
            if (onSuccess) onSuccess(result);
            
            // Close detail screen after 2 seconds
            setTimeout(() => {
              onClose();
            }, 2000);
          },
          onError: (err) => {
            console.error('Buy transaction error:', err);
            setError(err.message || 'Failed to purchase item');
            setBuyLoading(false);
            if (onError) onError(err);
          },
        }
      );
    } catch (err) {
      console.error('Buy function error:', err);
      setError(err.message || 'Failed to purchase item');
      setBuyLoading(false);
      if (onError) onError(err);
    }
  };

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Success Modal */}
      {success && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
          style={{ zIndex: 9999, animation: 'fadeIn 0.2s ease-out' }}
          onClick={() => setSuccess('')}
        >
          <div 
            className="bg-gradient-to-br from-gray-900 to-black border border-green-500/50 rounded-2xl p-8 max-w-md w-full shadow-2xl shadow-green-500/30"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'scaleIn 0.3s ease-out' }}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-green-500/30 rounded-full flex items-center justify-center border border-green-500/50">
                <span className="text-4xl">✓</span>
              </div>
              <h3 className="text-2xl font-bold text-green-400">Purchase Successful!</h3>
              <p className="text-slate-300">{success}</p>
              <button
                onClick={() => {
                  setSuccess('');
                  onClose();
                }}
                className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all hover:shadow-lg hover:shadow-green-500/50 mt-4"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Detail Modal */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        style={{ zIndex: 9998, animation: 'fadeIn 0.2s ease-out' }}
        onClick={onClose}
      >
        <div 
          className="bg-gradient-to-br from-gray-900 to-black border border-purple-500/30 rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl shadow-purple-500/20"
          style={{ animation: 'slideUp 0.3s ease-out' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Bar */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-transparent">
            <div>
              <h2 className="text-2xl font-bold text-white">{listing.name}</h2>
              <p className="text-slate-400 text-sm mt-1">Item ID: {truncateAddress(listing.itemId)}</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center bg-white/5 border border-purple-500/30 rounded-lg hover:bg-purple-500/20 transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Content Area - Split Layout */}
          <div className="grid md:grid-cols-2 gap-6 p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {/* Left Column - Image */}
            <div className="space-y-4">
              <div className="relative w-full aspect-square bg-gradient-to-br from-purple-950/50 to-black rounded-lg overflow-hidden flex items-center justify-center border border-purple-500/30 group">
                {listing.imageUrl && listing.imageUrl !== 'https://via.placeholder.com/400x400/8b5cf6/ffffff?text=Music+NFT' ? (
                  <img
                    src={listing.imageUrl.startsWith('http') ? listing.imageUrl : `https://${listing.imageUrl}`}
                    alt={listing.name}
                    className="w-full h-full object-contain transition-transform group-hover:scale-105"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/300?text=No+Image';
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center w-full h-full text-purple-300">
                    <div className="text-8xl mb-2">🎵</div>
                    <div className="text-sm text-slate-400">Music NFT</div>
                  </div>
                )}
              </div>

              {/* Price Card - Featured */}
              <div className="bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/30 rounded-lg p-6 backdrop-blur-lg">
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Current Price</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-purple-400 font-bold text-4xl">
                    {formatSui(listing.askPrice)}
                  </p>
                  <span className="text-slate-400 text-xl">SUI</span>
                </div>
                <p className="text-slate-500 text-xs mt-2">
                  ≈ {Number(listing.askPrice).toLocaleString()} MIST
                </p>
              </div>
            </div>

            {/* Right Column - Details */}
            <div className="space-y-4">
              {/* Description */}
              <div className="bg-gradient-to-br from-purple-950/30 to-black border border-purple-500/20 rounded-lg p-4 backdrop-blur-lg">
                <p className="text-purple-400 text-xs uppercase tracking-wider mb-2 font-semibold">Description</p>
                <p className="text-white leading-relaxed">{listing.description}</p>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-purple-950/30 to-black border border-purple-500/20 rounded-lg p-4 backdrop-blur-lg">
                  <p className="text-purple-400 text-xs uppercase tracking-wider mb-2 font-semibold">Owner</p>
                  <p className="text-white font-mono text-sm">{truncateAddress(listing.owner)}</p>
                </div>

                <div className="bg-gradient-to-br from-purple-950/30 to-black border border-purple-500/20 rounded-lg p-4 backdrop-blur-lg">
                  <p className="text-purple-400 text-xs uppercase tracking-wider mb-2 font-semibold">Item ID</p>
                  <p className="text-white font-mono text-xs break-all">{truncateAddress(listing.itemId)}</p>
                </div>
              </div>

              {/* Attributes */}
              {listing.attributes && (
                <div className="bg-gradient-to-br from-purple-950/30 to-black border border-purple-500/20 rounded-lg p-4 backdrop-blur-lg">
                  <p className="text-purple-400 text-xs uppercase tracking-wider mb-2 font-semibold">Attributes</p>
                  <p className="text-white text-sm">{listing.attributes}</p>
                </div>
              )}

              {/* Item Type */}
              <div className="bg-gradient-to-br from-purple-950/30 to-black border border-purple-500/20 rounded-lg p-4 backdrop-blur-lg">
                <p className="text-purple-400 text-xs uppercase tracking-wider mb-2 font-semibold">Item Type</p>
                <p className="text-slate-300 font-mono text-xs break-all">{listing.itemType}</p>
              </div>

              {/* Action Section */}
              <div className="bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/30 rounded-lg p-4 backdrop-blur-lg">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <p className="text-green-400 text-xs uppercase tracking-wider font-semibold">Available for Purchase</p>
                </div>
                <button
                  onClick={() => setShowBuyModal(true)}
                  disabled={!account}
                  className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all hover:shadow-lg hover:shadow-green-500/50 flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {account ? 'Buy This Item' : 'Connect Wallet to Buy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Buy Confirmation Modal */}
      {showBuyModal && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          style={{ animation: 'fadeIn 0.2s ease-out' }}
          onClick={() => {
            setShowBuyModal(false);
            setError('');
          }}
        >
          <div 
            className="bg-gradient-to-br from-gray-900 to-black border border-green-500/30 rounded-2xl p-6 max-w-md w-full"
            style={{ animation: 'slideUp 0.3s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-green-400 mb-1">Buy NFT</h2>
                <p className="text-slate-400 text-sm">Confirm your purchase</p>
              </div>
              <button
                onClick={() => {
                  setShowBuyModal(false);
                  setError('');
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* NFT Preview */}
            <div className="bg-gradient-to-br from-green-950/30 to-black border border-green-500/20 rounded-lg p-4 mb-6 backdrop-blur-lg">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gradient-to-br from-green-950/50 to-black rounded-lg overflow-hidden flex items-center justify-center border border-green-500/30 flex-shrink-0">
                  {listing.imageUrl && listing.imageUrl !== 'https://via.placeholder.com/400x400/8b5cf6/ffffff?text=Music+NFT' ? (
                    <img
                      src={listing.imageUrl.startsWith('http') ? listing.imageUrl : `https://${listing.imageUrl}`}
                      alt={listing.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-3xl">🎵</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold truncate">{listing.name}</h3>
                  <p className="text-slate-400 text-xs truncate">{listing.itemId}</p>
                </div>
              </div>
            </div>

            {/* Price Display */}
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20 rounded-lg p-4 backdrop-blur-lg">
                <p className="text-slate-400 text-sm mb-2">Purchase Price</p>
                <p className="text-green-400 font-bold text-3xl">
                  {formatSui(listing.askPrice)} SUI
                </p>
                <p className="text-slate-500 text-xs mt-2">
                  ≈ {Number(listing.askPrice).toLocaleString()} MIST
                </p>
              </div>

              {error && (
                <div className="bg-gradient-to-br from-red-950/30 to-black border border-red-500/30 rounded-lg p-3 backdrop-blur-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-br from-yellow-950/30 to-black border border-yellow-500/30 rounded-lg p-3 backdrop-blur-lg">
                <p className="text-yellow-400 text-xs">
                  <strong>Note:</strong> This transaction will transfer the NFT to your wallet and deduct the purchase price from your balance.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowBuyModal(false);
                    setError('');
                  }}
                  className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
                  disabled={buyLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleBuyNFT}
                  disabled={buyLoading}
                  className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {buyLoading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Buying...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      Confirm Purchase
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}