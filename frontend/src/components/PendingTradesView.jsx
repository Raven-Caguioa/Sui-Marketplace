import React from 'react';
import { Clock, Loader, CheckCircle, XCircle } from 'lucide-react';
import { TRADING_CONFIG, truncateAddress, truncateId } from './NFTTrading';

const PendingTradesView = ({
  account,
  pendingTrades,
  loading,
  setLoading,
  setError,
  setSuccess,
  signAndExecuteTransaction,
  loadingNFTs,
  fetchMyTrades,
  setView,
}) => {
  const handleAcceptTrade = async (trade) => {
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
      
      // Accept the trade
      tx.moveCall({
        target: `${TRADING_CONFIG.PACKAGE_ID}::${TRADING_CONFIG.MODULE_NAME}::accept_trade`,
        typeArguments: [trade.type1, trade.type2],
        arguments: [
          tx.object(trade.tradeObjectId),
          tx.object(trade.target_nft_id),
          tx.object(TRADING_CONFIG.CLOCK_ID),
        ],
      });

      // Immediately complete the trade in the same transaction
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
            setSuccess(`Trade completed successfully! Digest: ${result.digest}`);
            fetchMyTrades();
          },
          onError: (error) => {
            setError('Failed to complete trade: ' + error.message);
          },
        }
      );
    } catch (err) {
      setError('Failed to complete trade: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectTrade = async (trade) => {
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
        target: `${TRADING_CONFIG.PACKAGE_ID}::${TRADING_CONFIG.MODULE_NAME}::reject_trade`,
        typeArguments: [trade.type1, trade.type2],
        arguments: [
          tx.object(trade.tradeObjectId),
        ],
      });

      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: (result) => {
            setSuccess(`Trade rejected! Digest: ${result.digest}`);
            fetchMyTrades();
          },
          onError: (error) => {
            setError('Failed to reject: ' + error.message);
          },
        }
      );
    } catch (err) {
      setError('Failed to reject: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTrade = async (trade) => {
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
        target: `${TRADING_CONFIG.PACKAGE_ID}::${TRADING_CONFIG.MODULE_NAME}::cancel_trade`,
        typeArguments: [trade.type1, trade.type2],
        arguments: [
          tx.object(trade.tradeObjectId),
        ],
      });

      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: (result) => {
            setSuccess(`Trade cancelled! Digest: ${result.digest}`);
            fetchMyTrades();
          },
          onError: (error) => {
            setError('Failed to cancel: ' + error.message);
          },
        }
      );
    } catch (err) {
      setError('Failed to cancel: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-white">Pending Trade Requests</h3>
        <button
          onClick={fetchMyTrades}
          disabled={loadingNFTs}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors flex items-center gap-2"
        >
          {loadingNFTs ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <Clock className="w-4 h-4" />
          )}
          Refresh
        </button>
      </div>

      {loadingNFTs ? (
        <div className="text-center py-12">
          <Loader className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading trades...</p>
        </div>
      ) : pendingTrades.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-lg border border-white/10">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">No pending trades</p>
          <button
            onClick={() => setView('browse')}
            className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-semibold"
          >
            Create a Trade Request
          </button>
        </div>
      ) : (
        pendingTrades.map((trade, idx) => (
          <div key={idx} className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
            <div className="flex justify-between items-start mb-4">
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
                trade.isInitiator 
                  ? 'bg-purple-600/50 text-purple-200' 
                  : 'bg-green-600/50 text-green-200'
              }`}>
                {trade.isInitiator ? '📤 You Sent Request' : '📥 Request Received'}
              </span>
              <div className="text-right text-sm text-gray-400">
                {new Date(parseInt(trade.created_at)).toLocaleDateString()}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              {/* Initiator NFT */}
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-2">
                  {trade.isInitiator ? 'Your Offering' : 'They Offer'}
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

              {/* Target NFT */}
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-2">
                  {trade.isInitiator ? 'Requesting' : 'Your NFT'}
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

            {/* Action Buttons */}
            <div className="flex gap-3">
              {trade.isInitiator ? (
                <button
                  onClick={() => handleCancelTrade(trade)}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Cancel Trade
                </button>
              ) : (
                <>
                  <button
                    onClick={() => handleAcceptTrade(trade)}
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Accept & Complete
                  </button>
                  <button
                    onClick={() => handleRejectTrade(trade)}
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 text-xs text-gray-400">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-gray-500">From:</span>{' '}
                  <span className="font-mono">{truncateAddress(trade.initiator)}</span>
                </div>
                <div>
                  <span className="text-gray-500">To:</span>{' '}
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

export default PendingTradesView;