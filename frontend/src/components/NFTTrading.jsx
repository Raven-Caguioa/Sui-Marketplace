import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, Search, Clock, CheckCircle } from 'lucide-react';
import BrowseView from './BrowseView';
import PendingTradesView from './PendingTradesView';
import TradeHistoryView from './TradeHistoryView';

// ==================== TRADING CONTRACT CONFIGURATION ====================
export const TRADING_CONFIG = {
  PACKAGE_ID: '0x5281a724289520fadb5984c3686f8b63cf574d4820fcf584137a820516afa507',
  MODULE_NAME: 'trade',
  CLOCK_ID: '0x6',
};

// ==================== UTILITY FUNCTIONS ====================
export const truncateAddress = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';
export const truncateId = (id) => id ? `${id.slice(0, 8)}...${id.slice(-6)}` : '';

// ==================== NFT FETCHING ====================
export const fetchNFTs = async (address, client) => {
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

export const fetchNFTById = async (nftId, client) => {
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

const NFTTrading = ({ account, client, loading, setLoading, setError, setSuccess, signAndExecuteTransaction }) => {
  const [view, setView] = useState('browse');
  const [userNFTs, setUserNFTs] = useState([]);
  const [pendingTrades, setPendingTrades] = useState([]);
  const [completedTrades, setCompletedTrades] = useState([]);
  const [loadingNFTs, setLoadingNFTs] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load user's NFTs
  useEffect(() => {
    if (account?.address && client) {
      setLoadingNFTs(true);
      fetchNFTs(account.address, client)
        .then(setUserNFTs)
        .finally(() => setLoadingNFTs(false));
    }
  }, [account, client, refreshTrigger]);

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

                const initiatorNFT = await fetchNFTById(event.parsedJson.initiator_nft_id, client);
                const targetNFT = await fetchNFTById(event.parsedJson.target_nft_id, client);

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
      const pending = validTrades.filter(t => t.status === 0);
      const completed = validTrades.filter(t => t.status === 2);
      
      setPendingTrades(pending);
      setCompletedTrades(completed);
    } catch (error) {
      console.error('Error fetching trades:', error);
      setError('Failed to fetch trades');
    } finally {
      setLoadingNFTs(false);
    }
  };

  useEffect(() => {
    if ((view === 'pending' || view === 'history') && account && client) {
      fetchMyTrades();
    }
  }, [view, account, client]);

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
          onClick={() => setView('history')}
          className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
            view === 'history'
              ? 'bg-purple-600 text-white'
              : 'bg-white/5 text-gray-400 hover:text-white'
          }`}
        >
          <CheckCircle className="w-4 h-4 inline mr-2" />
          Trade History
        </button>
      </div>

      {/* Render Views */}
      {view === 'browse' && (
        <BrowseView
          account={account}
          client={client}
          userNFTs={userNFTs}
          loading={loading}
          setLoading={setLoading}
          setError={setError}
          setSuccess={setSuccess}
          signAndExecuteTransaction={signAndExecuteTransaction}
          loadingNFTs={loadingNFTs}
          setLoadingNFTs={setLoadingNFTs}
          setView={setView}
          refreshTrigger={refreshTrigger}
          setRefreshTrigger={setRefreshTrigger}
        />
      )}

      {view === 'pending' && (
        <PendingTradesView
          account={account}
          client={client}
          pendingTrades={pendingTrades}
          loading={loading}
          setLoading={setLoading}
          setError={setError}
          setSuccess={setSuccess}
          signAndExecuteTransaction={signAndExecuteTransaction}
          loadingNFTs={loadingNFTs}
          fetchMyTrades={fetchMyTrades}
          setView={setView}
        />
      )}

      {view === 'history' && (
        <TradeHistoryView
          account={account}
          completedTrades={completedTrades}
          loadingNFTs={loadingNFTs}
          fetchMyTrades={fetchMyTrades}
        />
      )}
    </div>
  );
};

export default NFTTrading;