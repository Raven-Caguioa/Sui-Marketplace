import React, { useState } from 'react';
import { Search, Loader, ArrowLeftRight } from 'lucide-react';
import { TRADING_CONFIG, fetchNFTs } from './NFTTrading';
import NFTCard from './NFTCard';

const BrowseView = ({
  account,
  client,
  userNFTs,
  loading,
  setLoading,
  setError,
  setSuccess,
  signAndExecuteTransaction,
  loadingNFTs,
  setLoadingNFTs,
  setView,
}) => {
  const [targetAddress, setTargetAddress] = useState('');
  const [targetNFTs, setTargetNFTs] = useState([]);
  const [selectedMyNFTs, setSelectedMyNFTs] = useState([]);
  const [selectedTargetNFT, setSelectedTargetNFT] = useState(null);

  const handleBrowseUser = async () => {
    if (!targetAddress) {
      setError('Please enter a Sui address');
      return;
    }

    setLoadingNFTs(true);
    setError('');
    try {
      const nfts = await fetchNFTs(targetAddress, client);
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

      setSuccess(`${selectedMyNFTs.length} trade request(s) created successfully!`);
      setSelectedMyNFTs([]);
      setSelectedTargetNFT(null);
      setView('pending');
    } catch (err) {
      setError('Failed to create trades: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
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
                  YOUR NFTS (Selected {selectedMyNFTs.length})
                </h4>
              </div>
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
                OTHERS NFT (Selected {selectedTargetNFT ? 1 : 0})
              </h4>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
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
                Create {selectedMyNFTs.length > 0 ? selectedMyNFTs.length : ''} Trade Request{selectedMyNFTs.length > 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default BrowseView;