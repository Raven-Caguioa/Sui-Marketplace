import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, Search, Clock, CheckCircle, XCircle, Loader, X } from 'lucide-react';

// ==================== TRADING CONTRACT CONFIGURATION ====================
const TRADING_CONFIG = {
  PACKAGE_ID: '0x5281a724289520fadb5984c3686f8b63cf574d4820fcf584137a820516afa507',
  MODULE_NAME: 'trade',
  CLOCK_ID: '0x6',
};

const NFTTrading = ({ account, client, loading, setLoading, setError, setSuccess, signAndExecuteTransaction }) => {
  const [view, setView] = useState('browse'); // browse, pending, finalization
  const [targetAddress, setTargetAddress] = useState('');
  const [userNFTs, setUserNFTs] = useState([]);
  const [targetNFTs, setTargetNFTs] = useState([]);
  const [pendingTrades, setPendingTrades] = useState([]);
  const [acceptedTrades, setAcceptedTrades] = useState([]);
  const [selectedMyNFTs, setSelectedMyNFTs] = useState([]);
  const [selectedTargetNFT, setSelectedTargetNFT] = useState(null);
  const [loadingNFTs, setLoadingNFTs] = useState(false);

  // Fetch NFTs with images for an address
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
          image: obj.data.display?.data?.image_url || obj.data.display?.data?.img_url || null,
          name: obj.data.display?.data?.name || obj.data.content?.fields?.name || 'Unnamed NFT',
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

  // Fetch NFT details by ID
  const fetchNFTById = async (nftId) => {
    try {
      const obj = await client.getObject({
        id: nftId,
        options: {
          showType: true,
          showContent: true,
          showDisplay: true,
        },
      });

      return {
        id: obj.data.objectId,
        type: obj.data.type,
        display: obj.data.display?.data || {},
        content: obj.data.content?.fields || {},
        image: obj.data.display?.data?.image_url || obj.data.display?.data?.img_url || null,
        name: obj.data.display?.data?.name || obj.data.content?.fields?.name || 'Unnamed NFT',
      };
    } catch (error) {
      console.error('Error fetching NFT:', error);
      return null;
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

      const tradesWithDetails = await Promise.all(
        events.data
          .filter(event => {
            const { initiator, target } = event.parsedJson;
            return initiator === account.address || target === account.address;
          })
          .map(async (event) => {
            try {
              const tx = await client.getTransactionBlock({
                digest: event.id.txDigest,
                options: { showEffects: true, showObjectChanges: true }
              });

              const tradeObject = tx.objectChanges?.find(
                change => change.type === 'created' && 
                         change.objectType?.includes('TradeRequest')
              );

              if (tradeObject) {
                const typeMatch = tradeObject.objectType.match(/<(.+),\s*(.+)>/);
                const type1 = typeMatch ? typeMatch[1].trim() : null;
                const type2 = typeMatch ? typeMatch[2].trim() : null;

                // Fetch NFT details
                const initiatorNFT = await fetchNFTById(event.parsedJson.initiator_nft_id);
                const targetNFT = await fetchNFTById(event.parsedJson.target_nft_id);

                // Check trade status
                const tradeObj = await client.getObject({
                  id: tradeObject.objectId,
                  options: { showContent: true }
                });

                const status = tradeObj.data?.content?.fields?.status;

                return {
                  ...event.parsedJson,
                  timestamp: event.timestampMs,
                  isInitiator: event.parsedJson.initiator === account.address,
                  tradeObjectId: tradeObject.objectId,
                  type1,
                  type2,
                  initiatorNFT,
                  targetNFT,
                  status: parseInt(status) || 0,
                };
              }
            } catch (err) {
              console.error('Error fetching trade details:', err);
            }
            return null;
          })
      );

      const validTrades = tradesWithDetails.filter(t => t !== null);
      
      // Separate pending (0) and accepted (1) trades
      // Don't show cancelled (3) or rejected (4) trades
      const pending = validTrades.filter(t => t.status === 0);
      const accepted = validTrades.filter(t => t.status === 1);
      
      setPendingTrades(pending);
      setAcceptedTrades(accepted);
    } catch (error) {
      console.error('Error fetching trades:', error);
      setError('Failed to fetch trades');
    } finally {
      setLoadingNFTs(false);
    }
  };

  useEffect(() => {
    if (view === 'pending' || view === 'finalization') {
      fetchMyTrades();
    }
  }, [view, account, client]);

  // Toggle NFT selection for multi-select
  const toggleMyNFTSelection = (nft) => {
    setSelectedMyNFTs(prev => {
      const isSelected = prev.some(n => n.id === nft.id);
      if (isSelected) {
        return prev.filter(n => n.id !== nft.id);
      } else {
        return [...prev, nft];
      }
    });
  };

  // Create multiple trades (one for each selected NFT)
  const handleCreateTrades = async () => {
    if (selectedMyNFTs.length === 0 || !selectedTargetNFT || !account) {
      setError('Please select your NFTs and one target NFT');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { Transaction } = await import('@mysten/sui/transactions');
      
      // Create a trade for each selected NFT
      for (const myNFT of selectedMyNFTs) {
        const tx = new Transaction();
        
        tx.moveCall({
          target: `${TRADING_CONFIG.PACKAGE_ID}::${TRADING_CONFIG.MODULE_NAME}::create_trade`,
          typeArguments: [myNFT.type, selectedTargetNFT.type],
          arguments: [
            tx.object(myNFT.id),
            tx.pure.address(targetAddress),
            tx.pure.id(selectedTargetNFT.id),
            tx.object(TRADING_CONFIG.CLOCK_ID),
          ],
        });

        await new Promise((resolve, reject) => {
          signAndExecuteTransaction(
            { transaction: tx },
            {
              onSuccess: (result) => {
                resolve(result);
              },
              onError: (error) => {
                reject(error);
              },
            }
          );
        });
      }

      setSuccess(`${selectedMyNFTs.length} trade(s) created successfully!`);
      setSelectedMyNFTs([]);
      setSelectedTargetNFT(null);
      setView('pending');
    } catch (err) {
      setError('Failed to create trades: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Accept a trade
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
      
      tx.moveCall({
        target: `${TRADING_CONFIG.PACKAGE_ID}::${TRADING_CONFIG.MODULE_NAME}::accept_trade`,
        typeArguments: [trade.type1, trade.type2],
        arguments: [
          tx.object(trade.tradeObjectId),
          tx.object(trade.target_nft_id),
          tx.object(TRADING_CONFIG.CLOCK_ID),
        ],
      });

      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: (result) => {
            setSuccess(`Trade accepted! Digest: ${result.digest}`);
            fetchMyTrades();
          },
          onError: (error) => {
            setError('Failed to accept: ' + error.message);
          },
        }
      );
    } catch (err) {
      setError('Failed to accept: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Reject a trade
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

  // Complete a trade (claim NFT)
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

  // Cancel a trade
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

  const truncateAddress = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';
  const truncateId = (id) => id ? `${id.slice(0, 8)}...${id.slice(-6)}` : '';

  // NFT Card Component
  const NFTCard = ({ nft, isSelected, onSelect, selectionColor = 'purple' }) => {
    const colorClasses = {
      purple: 'border-purple-400 bg-purple-600/30',
      green: 'border-green-400 bg-green-600/30',
      blue: 'border-blue-400 bg-blue-600/30',
    };

    return (
      <div
        onClick={onSelect}
        className={`p-3 rounded-lg cursor-pointer transition-all border-2 ${
          isSelected
            ? colorClasses[selectionColor]
            : 'bg-gray-800/50 hover:bg-gray-700/50 border-transparent hover:border-gray-600'
        }`}
      >
        {nft.image && (
          <img 
            src={nft.image} 
            alt={nft.name}
            className="w-full h-32 object-cover rounded-md mb-2"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        )}
        <p className="font-semibold text-white truncate text-sm">{nft.name}</p>
        <p className="text-xs text-gray-400 truncate mt-1">{truncateId(nft.id)}</p>
      </div>
    );
  };

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
          Browse & Request
        </button>
        <button
          onClick={() => setView('pending')}
          className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
            view === 'pending'
              ? 'bg-purple-600 text-white'
              : 'bg-white/5 text-gray-400 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4 inline mr-2" />
          Pending Trades
        </button>
        <button
          onClick={() => setView('finalization')}
          className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
            view === 'finalization'
              ? 'bg-purple-600 text-white'
              : 'bg-white/5 text-gray-400 hover:text-white'
          }`}
        >
          <CheckCircle className="w-4 h-4 inline mr-2" />
          Finalization
        </button>
      </div>

      {/* Browse & Request View */}
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
                Create Trade Request
              </h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Your NFTs - Multi-select */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-semibold text-purple-400 uppercase">
                      Your NFTs (Select Multiple)
                    </h4>
                    {selectedMyNFTs.length > 0 && (
                      <span className="text-xs bg-purple-600 px-2 py-1 rounded-full">
                        {selectedMyNFTs.length} selected
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-2">
                    {loadingNFTs ? (
                      <div className="col-span-2 text-center py-8 text-gray-400">
                        <Loader className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Loading your NFTs...
                      </div>
                    ) : userNFTs.length === 0 ? (
                      <p className="col-span-2 text-gray-400 text-center py-8">No NFTs found in your wallet</p>
                    ) : (
                      userNFTs.map((nft) => (
                        <NFTCard
                          key={nft.id}
                          nft={nft}
                          isSelected={selectedMyNFTs.some(n => n.id === nft.id)}
                          onSelect={() => toggleMyNFTSelection(nft)}
                          selectionColor="purple"
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* Target NFTs - Single select */}
                <div>
                  <h4 className="text-sm font-semibold text-green-400 mb-3 uppercase">
                    Target's NFTs (Select One)
                  </h4>
                  <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-2">
                    {targetNFTs.map((nft) => (
                      <NFTCard
                        key={nft.id}
                        nft={nft}
                        isSelected={selectedTargetNFT?.id === nft.id}
                        onSelect={() => setSelectedTargetNFT(nft)}
                        selectionColor="green"
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Create Trade Button */}
              <button
                onClick={handleCreateTrades}
                disabled={selectedMyNFTs.length === 0 || !selectedTargetNFT || loading}
                className="w-full mt-6 px-6 py-4 bg-gradient-to-r from-purple-600 to-green-600 hover:from-purple-700 hover:to-green-700 rounded-lg font-bold text-lg text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Creating Trades...
                  </>
                ) : (
                  <>
                    <ArrowLeftRight className="w-5 h-5" />
                    Create {selectedMyNFTs.length} Trade Request{selectedMyNFTs.length > 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pending Trades View */}
      {view === 'pending' && (
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
                        <p className="text-xs text-gray-400 font-mono truncate">{truncateId(trade.initiator_nft_id)}</p>
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
                        <p className="text-xs text-gray-400 font-mono truncate">{truncateId(trade.target_nft_id)}</p>
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
                        Accept Trade
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
      )}

      {/* Finalization View */}
      {view === 'finalization' && (
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
                        <p className="text-xs text-gray-400 font-mono truncate">{truncateId(trade.initiator_nft_id)}</p>
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
                        <p className="text-xs text-gray-400 font-mono truncate">{truncateId(trade.target_nft_id)}</p>
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
      )}
    </div>
  );
};

export default NFTTrading;