import React from 'react';
import { CheckCircle, Loader, History } from 'lucide-react';
import { truncateAddress, truncateId } from './NFTTrading';

const TradeHistoryView = ({
  account,
  completedTrades,
  loadingNFTs,
  fetchMyTrades,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-white">Trade History</h3>
        <button
          onClick={fetchMyTrades}
          disabled={loadingNFTs}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors flex items-center gap-2"
        >
          {loadingNFTs ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <History className="w-4 h-4" />
          )}
          Refresh
        </button>
      </div>

      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
        <p className="text-green-300 text-sm">
          ✅ Your completed trades are shown here. These NFTs have been successfully exchanged.
        </p>
      </div>

      {loadingNFTs ? (
        <div className="text-center py-12">
          <Loader className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading trade history...</p>
        </div>
      ) : completedTrades.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-lg border border-white/10">
          <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">No completed trades yet</p>
          <p className="text-sm text-gray-500 mt-2">Your trade history will appear here</p>
        </div>
      ) : (
        completedTrades.map((trade, idx) => (
          <div key={idx} className="bg-gradient-to-r from-green-900/20 to-blue-900/20 backdrop-blur-sm rounded-lg p-6 border border-green-500/30">
            <div className="flex justify-between items-start mb-4">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold bg-green-600/50 text-green-200">
                ✅ Trade Completed
              </span>
              <div className="text-right text-sm text-gray-400">
                {new Date(parseInt(trade.created_at)).toLocaleDateString()}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              {/* Initiator's NFT */}
              <div className="bg-white/10 rounded-lg p-4 border-2 border-black">
                <p className="text-xs text-gray-400 mb-2">
                  {trade.isInitiator ? 'You Traded' : 'You Received'}
                </p>
                {trade.initiatorNFT && (
                  <>
                    {trade.initiatorNFT.image ? (
                      <img 
                        src={trade.initiatorNFT.image} 
                        alt={trade.initiatorNFT.name}
                        className="w-full h-32 object-cover rounded-md mb-2 border-2 border-black"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-32 bg-gray-900 rounded-md mb-2 flex items-center justify-center border-2 border-black">
                        <span className="text-gray-600 text-sm">No Image</span>
                      </div>
                    )}
                    <p className="text-white font-semibold mb-1">{trade.initiatorNFT.name}</p>
                    <p className="text-xs text-gray-400 font-mono truncate">ID: {truncateId(trade.initiator_nft_id)}</p>
                  </>
                )}
              </div>

              {/* Target's NFT */}
              <div className="bg-white/10 rounded-lg p-4 border-2 border-black">
                <p className="text-xs text-green-400 mb-2 font-semibold">
                  {trade.isInitiator ? 'You Received' : 'You Traded'}
                </p>
                {trade.targetNFT && (
                  <>
                    {trade.targetNFT.image ? (
                      <img 
                        src={trade.targetNFT.image} 
                        alt={trade.targetNFT.name}
                        className="w-full h-32 object-cover rounded-md mb-2 border-2 border-black"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-32 bg-gray-900 rounded-md mb-2 flex items-center justify-center border-2 border-black">
                        <span className="text-gray-600 text-sm">No Image</span>
                      </div>
                    )}
                    <p className="text-white font-semibold mb-1">{trade.targetNFT.name}</p>
                    <p className="text-xs text-gray-400 font-mono truncate">ID: {truncateId(trade.target_nft_id)}</p>
                  </>
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 text-xs text-gray-400">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-gray-500">Trader 1:</span>{' '}
                  <span className="font-mono">{truncateAddress(trade.initiator)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Trader 2:</span>{' '}
                  <span className="font-mono">{truncateAddress(trade.target)}</span>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default TradeHistoryView;