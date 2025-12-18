import React from 'react';
import { CheckCircle, Loader } from 'lucide-react';
import { TRADING_CONFIG, truncateAddress, truncateId } from './NFTTrading';

const FinalizationView = ({
  account,
  acceptedTrades,
  loading,
  setLoading,
  setError,
  setSuccess,
  signAndExecuteTransaction,
  loadingNFTs,
  fetchMyTrades,
}) => {
  const handleCompleteTrade = async (trade) => {
    if (!trade.type1 || !trade.type2) {
      setError('Cannot determine NFT types for this trade');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { Transaction } = await import('@mysten/sui/transactions');
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${TRADING_CONFIG.PACKAGE_ID}::${TRADING_CONFIG.MODULE_NAME}::complete_trade`,
        typeArguments: [trade.type1, trade.type2],
        arguments: [
          tx.object(trade.tradeObjectId),
          tx.object(TRADING_CONFIG.CLOCK_ID),
        ],
      });

      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: (result) => {
            setSuccess(`NFT claimed successfully! Digest: ${result.digest}`);
            fetchMyTrades();
          },
          onError: (error) => {
            setError('Failed to claim: ' + error.message);
          },
        }
      );
    } catch (err) {
      setError('Failed to claim: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-white">Trade Finalization</h3>
        <button
          onClick={fetchMyTrades}
          disabled={loadingNFTs}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors flex items-center gap-2"
        >
          {loadingNFTs ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          Refresh
        </button>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
        <p className="text-blue-300 text-sm">
          ℹ️ Both parties have agreed to the trade. Click "Claim NFT" to finalize and receive your NFT.
        </p>
      </div>

      {loadingNFTs ? (
        <div className="text-center py-12">
          <Loader className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading trades...</p>
        </div>
      ) : acceptedTrades.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-lg border border-white/10">
          <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">No trades ready for finalization</p>
          <p className="text-sm text-gray-500 mt-2">Accepted trades will appear here</p>
        </div>
      ) : (
        acceptedTrades.map((trade, idx) => (
          <div key={idx} className="bg-gradient-to-r from-green-900/20 to-blue-900/20 backdrop-blur-sm rounded-lg p-6 border border-green-500/30">
            <div className="flex justify-between items-start mb-4">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold bg-green-600/50 text-green-200">
                ✅ Trade Accepted - Ready to Claim
              </span>
              <div className="text-right text-sm text-gray-400">
                {new Date(parseInt(trade.created_at)).toLocaleDateString()}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {/* What they gave */}
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-2">
                  {trade.isInitiator ? 'You Gave' : 'You Receive'}
                </p>
                {trade.initiatorNFT && (
                  <>
                    {trade.initiatorNFT.image && (
                      <img 
                        src={trade.initiatorNFT.image} 
                        alt={trade.initiatorNFT.name}
                        className="w-full h-32 object-cover rounded-md mb-2"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <p className="text-white font-semibold mb-1">{trade.initiatorNFT.name}</p>
                    <p className="text-xs text-gray-400 font-mono truncate">ID: {truncateId(trade.initiator_nft_id)}</p>
                  </>
                )}
              </div>

              {/* What you get */}
              <div className="bg-white/10 rounded-lg p-4 ring-2 ring-green-500/50">
                <p className="text-xs text-green-400 mb-2 font-semibold">
                  {trade.isInitiator ? 'You Receive ⭐' : 'You Gave'}
                </p>
                {trade.targetNFT && (
                  <>
                    {trade.targetNFT.image && (
                      <img 
                        src={trade.targetNFT.image} 
                        alt={trade.targetNFT.name}
                        className="w-full h-32 object-cover rounded-md mb-2"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <p className="text-white font-semibold mb-1">{trade.targetNFT.name}</p>
                    <p className="text-xs text-gray-400 font-mono truncate">ID: {truncateId(trade.target_nft_id)}</p>
                  </>
                )}
              </div>
            </div>

            {/* Claim Button */}
            <button
              onClick={() => handleCompleteTrade(trade)}
              disabled={loading}
              className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 rounded-lg font-bold text-lg text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Claiming...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Claim NFT
                </>
              )}
            </button>

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

export default FinalizationView;