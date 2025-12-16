import React, { useState, useEffect } from 'react';
import { Music, List, Loader2, CheckCircle, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { Transaction } from '@mysten/sui/transactions';

const PACKAGE_ID = '0x989abceb5afcc1ee7f460b41e79f03ee4d3406191ee964da95db51a20fa95f27';
const MARKETPLACE_ID = '0xc92b9ba2f210fadaa565de58660757916c48fd44521998296c4157d0764b5cac';

export default function ListMyNFTs({ account, client, loading, setLoading, setError, setSuccess, signAndExecuteTransaction }) {
  const [myNFTs, setMyNFTs] = useState([]);
  const [fetchingNFTs, setFetchingNFTs] = useState(false);

  // Fetch user's owned Music NFTs
  const fetchMyNFTs = async () => {
    if (!account || !client) {
      setMyNFTs([]);
      return;
    }

    setFetchingNFTs(true);
    try {
      // Get all objects owned by the user
      const ownedObjects = await client.getOwnedObjects({
        owner: account.address,
        filter: {
          StructType: `${PACKAGE_ID}::music_nft::MusicNFT`
        },
        options: {
          showContent: true,
          showDisplay: true,
          showType: true,
        },
      });

      console.log('Found owned NFTs:', ownedObjects.data.length);

      // Parse the NFT data
      const nfts = ownedObjects.data
        .filter(obj => obj.data?.content?.fields)
        .map(obj => {
          const fields = obj.data.content.fields;
          return {
            id: obj.data.objectId,
            name: fields.name || 'Untitled',
            description: fields.description || '',
            imageUrl: fields.image_url || 'https://via.placeholder.com/300',
            musicUrl: fields.music_url || '',
            creator: fields.creator || '',
            attributes: fields.attributes || '{}',
          };
        });

      console.log('Parsed NFTs:', nfts);
      setMyNFTs(nfts);
    } catch (err) {
      console.error('Error fetching NFTs:', err);
      setError('Failed to fetch your NFTs: ' + err.message);
    } finally {
      setFetchingNFTs(false);
    }
  };

  // List an NFT on the marketplace
  const listNFT = async (nftId) => {
    if (!account) {
      setError('Please connect your wallet');
      return;
    }

    setLoading(true);
    try {
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${PACKAGE_ID}::music_marketplace::list_music`,
        arguments: [
          tx.object(MARKETPLACE_ID),
          tx.object(nftId),
        ],
      });

      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: (result) => {
            setSuccess('Successfully listed your music on the marketplace!');
            // Refresh the list after listing
            setTimeout(() => {
              fetchMyNFTs();
            }, 2000);
          },
          onError: (error) => {
            setError(error.message || 'Failed to list NFT on marketplace');
          },
        }
      );
    } catch (err) {
      setError(err.message || 'Failed to list NFT');
    } finally {
      setLoading(false);
    }
  };

  // Fetch NFTs when component mounts or account changes
  useEffect(() => {
    fetchMyNFTs();
  }, [account, client]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600/30 to-blue-600/30 rounded-xl p-6 border border-purple-500/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <List className="w-8 h-8" />
              My Music NFTs
            </h2>
            <p className="text-gray-300">List your music NFTs on the marketplace for others to listen and for you to earn!</p>
          </div>
          <button
            onClick={fetchMyNFTs}
            disabled={fetchingNFTs}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${fetchingNFTs ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-200">
            <p className="font-semibold mb-1">How to list your music:</p>
            <ol className="list-decimal list-inside space-y-1 text-gray-300">
              <li>Mint a Music NFT (or receive one from someone)</li>
              <li>It will appear in "My Music NFTs" below</li>
              <li>Click "List on Marketplace" to make it available for listening</li>
              <li>Once listed, it will appear in the "Available Music" section</li>
              <li>Listeners will earn SUI rewards when they listen to your music!</li>
            </ol>
          </div>
        </div>
      </div>

      {/* NFT Grid */}
      <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
        <h3 className="text-xl font-bold text-white mb-4">Your Unlisted NFTs</h3>
        
        {!account ? (
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <p className="text-gray-400">Connect your wallet to see your NFTs</p>
          </div>
        ) : fetchingNFTs ? (
          <div className="text-center py-12">
            <Loader2 className="w-16 h-16 text-purple-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-400">Loading your NFTs...</p>
          </div>
        ) : myNFTs.length === 0 ? (
          <div className="text-center py-12">
            <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">You don't have any music NFTs in your wallet</p>
            <p className="text-sm text-gray-500">Mint a new NFT or receive one from someone to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myNFTs.map((nft) => (
              <div key={nft.id} className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors border border-white/10">
                <img 
                  src={nft.imageUrl} 
                  alt={nft.name} 
                  className="w-full h-48 object-cover rounded-lg mb-3"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/300?text=No+Image';
                  }}
                />
                
                <h4 className="font-bold text-white mb-1">{nft.name}</h4>
                
                {nft.description && (
                  <p className="text-xs text-gray-400 mb-2 line-clamp-2">{nft.description}</p>
                )}
                
                <div className="mb-3 p-2 bg-black/30 rounded">
                  <p className="text-xs text-gray-500 mb-1">Object ID:</p>
                  <p className="text-xs text-gray-300 font-mono break-all">
                    {nft.id.slice(0, 20)}...{nft.id.slice(-10)}
                  </p>
                </div>

                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">Creator:</p>
                  <p className="text-xs text-purple-400 font-mono">
                    {nft.creator ? `${nft.creator.slice(0, 8)}...${nft.creator.slice(-6)}` : 'Unknown'}
                  </p>
                </div>

                {nft.musicUrl && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">Music URL:</p>
                    <p className="text-xs text-blue-400 break-all line-clamp-1" title={nft.musicUrl}>
                      {nft.musicUrl.slice(0, 30)}...
                    </p>
                  </div>
                )}
                
                <button
                  onClick={() => listNFT(nft.id)}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-2 px-4 rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                >
                  <ArrowRight className="w-4 h-4" />
                  List on Marketplace
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl p-4 border border-purple-500/30">
          <div className="flex items-center gap-3">
            <Music className="w-8 h-8 text-purple-400" />
            <div>
              <div className="text-sm text-gray-400">Total NFTs Owned</div>
              <div className="text-2xl font-bold text-white">{myNFTs.length}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl p-4 border border-blue-500/30">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-blue-400" />
            <div>
              <div className="text-sm text-gray-400">Ready to List</div>
              <div className="text-2xl font-bold text-white">{myNFTs.length}</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl p-4 border border-green-500/30">
          <div className="flex items-center gap-3">
            <List className="w-8 h-8 text-green-400" />
            <div>
              <div className="text-sm text-gray-400">Connected Wallet</div>
              <div className="text-sm font-bold text-white truncate">
                {account ? `${account.address.slice(0, 8)}...${account.address.slice(-6)}` : 'Not Connected'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
        <h3 className="text-xl font-bold text-white mb-4">How Listing Works</h3>
        <div className="space-y-3 text-gray-300">
          <div className="flex items-start gap-3">
            <div className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">1</div>
            <div>
              <p className="font-semibold text-white">NFT Leaves Your Wallet</p>
              <p className="text-sm">When you list an NFT, it's transferred from your wallet to the marketplace smart contract</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">2</div>
            <div>
              <p className="font-semibold text-white">Becomes Available</p>
              <p className="text-sm">Your music appears in the "Available Music" section for all users to discover and listen</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">3</div>
            <div>
              <p className="font-semibold text-white">Users Listen & Earn</p>
              <p className="text-sm">Listeners earn SUI rewards from the reward pool while enjoying your music</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">4</div>
            <div>
              <p className="font-semibold text-white">You Can Unlist Anytime</p>
              <p className="text-sm">Call the unlist function to remove your NFT from the marketplace and return it to your wallet</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contract Info */}
      <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl p-6 border border-indigo-500/30">
        <h3 className="text-xl font-bold text-white mb-4">Contract Information</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Package ID:</span>
            <span className="text-white font-mono text-xs">{PACKAGE_ID.slice(0, 20)}...{PACKAGE_ID.slice(-10)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Marketplace ID:</span>
            <span className="text-white font-mono text-xs">{MARKETPLACE_ID.slice(0, 20)}...{MARKETPLACE_ID.slice(-10)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}