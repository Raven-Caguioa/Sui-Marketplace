import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, Search, Clock, CheckCircle, XCircle, Loader } from 'lucide-react';

// ==================== TRADING CONTRACT CONFIGURATION ====================
// These IDs are SEPARATE from your marketplace - no conflicts!
const TRADING_CONFIG = {
  PACKAGE_ID: '0x5281a724289520fadb5984c3686f8b63cf574d4820fcf584137a820516afa507',
  MODULE_NAME: 'trade',
  CLOCK_ID: '0x6',
};

const NFTTrading = ({ account, client, loading, setLoading, setError, setSuccess, signAndExecuteTransaction }) => {
  const [view, setView] = useState('browse'); // browse, myTrades
  const [targetAddress, setTargetAddress] = useState('');
  const [userNFTs, setUserNFTs] = useState([]);
  const [targetNFTs, setTargetNFTs] = useState([]);
  const [myTrades, setMyTrades] = useState([]);
  const [selectedMyNFT, setSelectedMyNFT] = useState(null);
  const [selectedTargetNFT, setSelectedTargetNFT] = useState(null);
  const [loadingNFTs, setLoadingNFTs] = useState(false);

  // Fetch NFTs for an address
  const fetchNFTs = async (address) => {
    if (!client || !address) return [];
    
    try {
      const objects = await client.getOwnedObjects({
        owner: address,
        options: {
          showType: true,
          showContent: true,
          showDisplay: true,
        },
      });
      
      const nfts = objects.data
        .filter(obj => {
          const type = obj.data?.type;
          return type && 
                 type.includes('::') && 
                 !type.includes('0x2::coin::Coin') &&
                 obj.data?.content?.dataType === 'moveObject';
        })
        .map(obj => ({
          id: obj.data.objectId,
          type: obj.data.type,
          display: obj.data.display?.data || {},
          content: obj.data.content?.fields || {},
        }));
      
      return nfts;
    } catch (error) {
      console.error('Error fetching NFTs:', error);
      return [];
    }
  };

  // Load user's NFTs
  useEffect(() => {
    if (account?.address) {
      setLoadingNFTs(true);
      fetchNFTs(account.address)
        .then(setUserNFTs)
        .finally(() => setLoadingNFTs(false));
    }
  }, [account, client]);

  // Browse target user's NFTs
  const handleBrowseUser = async () => {
    if (!targetAddress) {
      setError('Please enter a Sui address');
      return;
    }

    setLoadingNFTs(true);
    setError('');
    try {
      const nfts = await fetchNFTs(targetAddress);
      if (nfts.length === 0) {
        setError('No NFTs found for this address');
      }
      setTargetNFTs(nfts);
    } catch (err) {
      setError('Failed to fetch NFTs: ' + err.message);
    } finally {
      setLoadingNFTs(false);
    }
  };

  // Fetch user's trades
  const fetchMyTrades = async () => {
    if (!client || !account?.address) return;
    
    setLoadingNFTs(true);
    try {
      const events = await client.queryEvents({
        query: {
          MoveEventType: `${TRADING_CONFIG.PACKAGE_ID}::${TRADING_CONFIG.MODULE_NAME}::TradeCreatedEvent`
        },
        limit: 50,
      });

      const userTrades = events.data
        .filter(event => {
          const { initiator, target } = event.parsedJson;
          return initiator === account.address || target === account.address;
        })
        .map(event => ({
          ...event.parsedJson,
          timestamp: event.timestampMs,
          isInitiator: event.parsedJson.initiator === account.address,
        }));

      setMyTrades(userTrades);
    } catch (error) {
      console.error('Error fetching trades:', error);
      setError('Failed to fetch trades');
    } finally {
      setLoadingNFTs(false);
    }
  };

  useEffect(() => {
    if (view === 'myTrades') {
      fetchMyTrades();
    }
  }, [view, account, client]);

  // Create a trade
  const handleCreateTrade = async () => {
    if (!selectedMyNFT || !selectedTargetNFT || !account) {
      setError('Please select both NFTs');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { Transaction } = await import('@mysten/sui/transactions');
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${TRADING_CONFIG.PACKAGE_ID}::${TRADING_CONFIG.MODULE_NAME}::create_trade`,
        typeArguments: [selectedMyNFT.type, selectedTargetNFT.type],
        arguments: [
          tx.object(selectedMyNFT.id),
          tx.pure.address(targetAddress),
          tx.pure.id(selectedTargetNFT.id),
          tx.object(TRADING_CONFIG.CLOCK_ID),
        ],
      });

      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: (result) => {
            setSuccess(`Trade created! Digest: ${result.digest}`);
            setSelectedMyNFT(null);
            setSelectedTargetNFT(null);
            setView('myTrades');
          },
          onError: (error) => {
            setError('Failed to create trade: ' + error.message);
          },
        }
      );
    } catch (err) {
      setError('Failed to create trade: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cancel a trade
  const handleCancelTrade = async (trade) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { Transaction } = await import('@mysten/sui/transactions');
      const tx = new Transaction();
      
      // Note: You'll need to query the actual trade object ID
      // This is simplified - in production, query the trade object first
      tx.moveCall({
        target: `${TRADING_CONFIG.PACKAGE_ID}::${TRADING_CONFIG.MODULE_NAME}::cancel_trade`,
        typeArguments: ['TYPE1', 'TYPE2'], // Replace with actual types
        arguments: [
          tx.object(trade.trade_id),
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

  const truncateAddress = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';
  const truncateId = (id) => id ? `${id.slice(0, 8)}...${id.slice(-6)}` : '';

  if (!account) {
    return (
      <div className="text-center py-12">
        <ArrowLeftRight className="w-16 h-16 text-purple-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Connect Your Wallet</h3>
        <p className="text-gray-400">Please connect your wallet to start trading NFTs</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex gap-4 border-b border-white/10 pb-4">
        <button
          onClick={() => setView('browse')}
          className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
            view === 'browse'
              ? 'bg-purple-600 text-white'
              : 'bg-white/5 text-gray-400 hover:text-white'
          }`}
        >
          <Search className="w-4 h-4 inline mr-2" />
          Browse & Trade
        </button>
        <button
          onClick={() => setView('myTrades')}
          className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
            view === 'myTrades'
              ? 'bg-purple-600 text-white'
              : 'bg-white/5 text-gray-400 hover:text-white'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4 inline mr-2" />
          My Trades
        </button>
      </div>

      {/* Browse View */}
      {view === 'browse' && (
        <div className="space-y-6">
          {/* Search User */}
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Find User's NFTs</h3>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Enter Sui address (0x...)"
                value={targetAddress}
                onChange={(e) => setTargetAddress(e.target.value)}
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={handleBrowseUser}
                disabled={loadingNFTs || !targetAddress}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loadingNFTs ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Browse
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Create Trade */}
          {targetNFTs.length > 0 && (
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-purple-400" />
                Create Trade Offer
              </h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Your NFTs */}
                <div>
                  <h4 className="text-sm font-semibold text-purple-400 mb-3 uppercase">Your NFTs</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                    {loadingNFTs ? (
                      <div className="text-center py-8 text-gray-400">
                        <Loader className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Loading your NFTs...
                      </div>
                    ) : userNFTs.length === 0 ? (
                      <p className="text-gray-400 text-center py-8">No NFTs found in your wallet</p>
                    ) : (
                      userNFTs.map((nft) => (
                        <div
                          key={nft.id}
                          onClick={() => setSelectedMyNFT(nft)}
                          className={`p-4 rounded-lg cursor-pointer transition-all ${
                            selectedMyNFT?.id === nft.id
                              ? 'bg-purple-600/50 border-2 border-purple-400'
                              : 'bg-white/10 hover:bg-white/20 border-2 border-transparent'
                          }`}
                        >
                          <p className="font-semibold text-white truncate">
                            {nft.display.name || nft.content.name || 'Unnamed NFT'}
                          </p>
                          <p className="text-xs text-gray-400 truncate mt-1">{truncateId(nft.id)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Target NFTs */}
                <div>
                  <h4 className="text-sm font-semibold text-green-400 mb-3 uppercase">Target's NFTs</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                    {targetNFTs.map((nft) => (
                      <div
                        key={nft.id}
                        onClick={() => setSelectedTargetNFT(nft)}
                        className={`p-4 rounded-lg cursor-pointer transition-all ${
                          selectedTargetNFT?.id === nft.id
                            ? 'bg-green-600/50 border-2 border-green-400'
                            : 'bg-white/10 hover:bg-white/20 border-2 border-transparent'
                        }`}
                      >
                        <p className="font-semibold text-white truncate">
                          {nft.display.name || nft.content.name || 'Unnamed NFT'}
                        </p>
                        <p className="text-xs text-gray-400 truncate mt-1">{truncateId(nft.id)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Create Trade Button */}
              <button
                onClick={handleCreateTrade}
                disabled={!selectedMyNFT || !selectedTargetNFT || loading}
                className="w-full mt-6 px-6 py-4 bg-gradient-to-r from-purple-600 to-green-600 hover:from-purple-700 hover:to-green-700 rounded-lg font-bold text-lg text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Creating Trade...
                  </>
                ) : (
                  <>
                    <ArrowLeftRight className="w-5 h-5" />
                    Create Trade Offer
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* My Trades View */}
      {view === 'myTrades' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-white">Active Trades</h3>
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
          ) : myTrades.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-lg border border-white/10">
              <ArrowLeftRight className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No active trades found</p>
              <button
                onClick={() => setView('browse')}
                className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-semibold"
              >
                Create Your First Trade
              </button>
            </div>
          ) : (
            myTrades.map((trade, idx) => (
              <div key={idx} className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
                      trade.isInitiator 
                        ? 'bg-purple-600/50 text-purple-200' 
                        : 'bg-green-600/50 text-green-200'
                    }`}>
                      {trade.isInitiator ? '📤 You Initiated' : '📥 Offer Received'}
                    </span>
                  </div>
                  <div className="text-right text-sm text-gray-400">
                    {new Date(parseInt(trade.created_at)).toLocaleDateString()}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-white/10 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-2">Offering</p>
                    <p className="text-white font-semibold mb-1">NFT</p>
                    <p className="text-xs text-gray-400 font-mono truncate">{truncateId(trade.initiator_nft_id)}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-2">For</p>
                    <p className="text-white font-semibold mb-1">NFT</p>
                    <p className="text-xs text-gray-400 font-mono truncate">{truncateId(trade.target_nft_id)}</p>
                  </div>
                </div>

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
                        disabled={loading}
                        className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Accept Trade
                      </button>
                      <button
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
      )}
    </div>
  );
};

export default NFTTrading;