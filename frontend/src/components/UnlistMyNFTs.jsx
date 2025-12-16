import React, { useState, useEffect } from 'react';
import { Music, XCircle, Loader2, AlertCircle, RefreshCw, ArrowLeft, TrendingUp, Clock } from 'lucide-react';
import { Transaction } from '@mysten/sui/transactions';

// MUSIC STREAMING MARKETPLACE IDs (same as MusicStreaming component)
const MUSIC_PACKAGE_ID = '0x989abceb5afcc1ee7f460b41e79f03ee4d3406191ee964da95db51a20fa95f27';
const MUSIC_MARKETPLACE_ID = '0xc92b9ba2f210fadaa565de58660757916c48fd44521998296c4157d0764b5cac';

export default function UnlistMyNFTs({ account, client, loading, setLoading, setError, setSuccess, signAndExecuteTransaction }) {
  const [listedNFTs, setListedNFTs] = useState([]);
  const [fetchingNFTs, setFetchingNFTs] = useState(false);

  // Fetch user's listed NFTs from the marketplace
  const fetchListedNFTs = async () => {
    if (!account || !client) {
      setListedNFTs([]);
      return;
    }

    setFetchingNFTs(true);
    try {
      // Get marketplace object
      const marketplaceObject = await client.getObject({
        id: MUSIC_MARKETPLACE_ID,
        options: { showContent: true }
      });

      console.log('Marketplace object:', JSON.stringify(marketplaceObject, null, 2));

      if (!marketplaceObject?.data?.content?.fields) {
        console.error('Marketplace object structure is invalid');
        setError('Could not access marketplace data');
        return;
      }

      const musicLibrary = marketplaceObject.data.content.fields.music_library;
      console.log('Music library:', JSON.stringify(musicLibrary, null, 2));

      if (!musicLibrary?.fields?.id?.id) {
        console.error('Music library table ID not found');
        setError('Could not find music library table');
        return;
      }

      const tableId = musicLibrary.fields.id.id;
      console.log('Table ID:', tableId);
      
      // Get ALL dynamic fields with pagination
      let allDynamicFields = [];
      let hasNextPage = true;
      let cursor = null;

      while (hasNextPage) {
        const dynamicFieldsResponse = await client.getDynamicFields({
          parentId: tableId,
          cursor: cursor,
          limit: 50,
        });

        allDynamicFields = allDynamicFields.concat(dynamicFieldsResponse.data);
        hasNextPage = dynamicFieldsResponse.hasNextPage;
        cursor = dynamicFieldsResponse.nextCursor;
      }

      console.log(`Found ${allDynamicFields.length} total music NFTs in marketplace`);
      console.log('Dynamic fields sample:', JSON.stringify(allDynamicFields[0], null, 2));

      // Fetch each listing and filter by current user
      const musicPromises = allDynamicFields.map(async (field) => {
        try {
          const fieldObject = await client.getObject({
            id: field.objectId,
            options: { showContent: true }
          });

          console.log('Field object:', JSON.stringify(fieldObject, null, 2));

          if (!fieldObject?.data?.content?.fields) {
            console.error('Field object has no fields');
            return null;
          }

          // Try different possible structures
          let listing, nft;
          
          if (fieldObject.data.content.fields.value?.fields) {
            // Structure: fields.value.fields
            listing = fieldObject.data.content.fields.value.fields;
            nft = listing.nft?.fields;
          } else if (fieldObject.data.content.fields.nft?.fields) {
            // Direct structure
            listing = fieldObject.data.content.fields;
            nft = listing.nft.fields;
          } else {
            console.error('Unknown field structure:', fieldObject.data.content.fields);
            return null;
          }

          if (!listing || !nft) {
            console.error('Could not extract listing or nft');
            return null;
          }

          // Only include NFTs owned by current user
          if (listing.owner === account.address) {
            console.log('Found user NFT:', nft.name);
            return {
              nftId: field.name.value,
              name: nft.name || 'Untitled',
              description: nft.description || '',
              imageUrl: nft.image_url || 'https://via.placeholder.com/300',
              musicUrl: nft.music_url || '',
              creator: nft.creator || '',
              totalListens: Number(listing.total_listens || 0),
              totalListenTime: Number(listing.total_listen_time_seconds || 0),
              owner: listing.owner,
            };
          }
          
          return null;
        } catch (err) {
          console.error('Error fetching listing:', err);
          return null;
        }
      });

      const userListings = (await Promise.all(musicPromises)).filter(m => m !== null);
      console.log(`Found ${userListings.length} NFTs owned by user`);
      setListedNFTs(userListings);
    } catch (err) {
      console.error('Error fetching listed NFTs:', err);
      console.error('Full error:', err);
      setError('Failed to fetch your listed NFTs: ' + err.message);
    } finally {
      setFetchingNFTs(false);
    }
  };

  // Unlist an NFT from the marketplace
  const unlistNFT = async (nftId) => {
    if (!account) {
      setError('Please connect your wallet');
      return;
    }

    setLoading(true);
    try {
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${MUSIC_PACKAGE_ID}::music_marketplace::unlist_music`,
        arguments: [
          tx.object(MUSIC_MARKETPLACE_ID),
          tx.pure.id(nftId),
        ],
      });

      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: (result) => {
            setSuccess('Successfully unlisted your music! NFT returned to your wallet.');
            // Refresh the list after unlisting
            setTimeout(() => {
              fetchListedNFTs();
            }, 2000);
          },
          onError: (error) => {
            setError(error.message || 'Failed to unlist NFT from marketplace');
          },
        }
      );
    } catch (err) {
      setError(err.message || 'Failed to unlist NFT');
    } finally {
      setLoading(false);
    }
  };

  // Format seconds to readable time
  const formatListenTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  // Fetch NFTs when component mounts or account changes
  useEffect(() => {
    fetchListedNFTs();
  }, [account, client]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600/30 to-orange-600/30 rounded-xl p-6 border border-red-500/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <XCircle className="w-8 h-8" />
              My Listed NFTs
            </h2>
            <p className="text-gray-300">Manage and unlist your music NFTs from the marketplace</p>
          </div>
          <button
            onClick={fetchListedNFTs}
            disabled={fetchingNFTs}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${fetchingNFTs ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-200">
            <p className="font-semibold mb-1">About Unlisting:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-300">
              <li>When you unlist an NFT, it's removed from the marketplace</li>
              <li>The NFT is immediately returned to your wallet</li>
              <li>Users can no longer listen to the unlisted music</li>
              <li>You can re-list the NFT anytime from "Send Music NFT"</li>
              <li>View your listening statistics before unlisting</li>
            </ul>
          </div>
        </div>
      </div>

      {/* NFT Grid */}
      <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
        <h3 className="text-xl font-bold text-white mb-4">Your Listed Music</h3>
        
        {!account ? (
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <p className="text-gray-400">Connect your wallet to see your listed NFTs</p>
          </div>
        ) : fetchingNFTs ? (
          <div className="text-center py-12">
            <Loader2 className="w-16 h-16 text-red-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-400">Loading your listed NFTs...</p>
          </div>
        ) : listedNFTs.length === 0 ? (
          <div className="text-center py-12">
            <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">You don't have any music listed on the marketplace</p>
            <p className="text-sm text-gray-500">List some NFTs from "Send Music NFT" to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {listedNFTs.map((nft) => (
              <div key={nft.nftId} className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors border border-white/10">
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
                  <p className="text-xs text-gray-500 mb-1">NFT ID:</p>
                  <p className="text-xs text-gray-300 font-mono break-all">
                    {nft.nftId.slice(0, 20)}...{nft.nftId.slice(-10)}
                  </p>
                </div>

                {/* Statistics */}
                <div className="mb-3 space-y-2">
                  <div className="flex items-center justify-between bg-blue-500/20 rounded p-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-400" />
                      <span className="text-xs text-gray-400">Total Listens</span>
                    </div>
                    <span className="text-sm font-bold text-white">{nft.totalListens}</span>
                  </div>
                  
                  <div className="flex items-center justify-between bg-purple-500/20 rounded p-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-purple-400" />
                      <span className="text-xs text-gray-400">Listen Time</span>
                    </div>
                    <span className="text-sm font-bold text-white">
                      {formatListenTime(nft.totalListenTime)}
                    </span>
                  </div>
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
                  onClick={() => unlistNFT(nft.nftId)}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white py-2 px-4 rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Unlist from Marketplace
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-xl p-4 border border-red-500/30">
          <div className="flex items-center gap-3">
            <Music className="w-8 h-8 text-red-400" />
            <div>
              <div className="text-sm text-gray-400">Total Listed</div>
              <div className="text-2xl font-bold text-white">{listedNFTs.length}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-xl p-4 border border-orange-500/30">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-orange-400" />
            <div>
              <div className="text-sm text-gray-400">Total Listens</div>
              <div className="text-2xl font-bold text-white">
                {listedNFTs.reduce((sum, nft) => sum + nft.totalListens, 0)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 rounded-xl p-4 border border-yellow-500/30">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-yellow-400" />
            <div>
              <div className="text-sm text-gray-400">Total Listen Time</div>
              <div className="text-lg font-bold text-white">
                {formatListenTime(listedNFTs.reduce((sum, nft) => sum + nft.totalListenTime, 0))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
        <h3 className="text-xl font-bold text-white mb-4">How Unlisting Works</h3>
        <div className="space-y-3 text-gray-300">
          <div className="flex items-start gap-3">
            <div className="bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">1</div>
            <div>
              <p className="font-semibold text-white">View Your Listed NFTs</p>
              <p className="text-sm">See all your music NFTs currently available on the marketplace with their statistics</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">2</div>
            <div>
              <p className="font-semibold text-white">Check Statistics</p>
              <p className="text-sm">Review how many times your music was played and total listening time before unlisting</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">3</div>
            <div>
              <p className="font-semibold text-white">Unlist Your NFT</p>
              <p className="text-sm">Click "Unlist from Marketplace" to remove it and return it to your wallet</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">4</div>
            <div>
              <p className="font-semibold text-white">NFT Returns to Wallet</p>
              <p className="text-sm">The NFT is immediately transferred back to your wallet and removed from the marketplace</p>
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
            <span className="text-white font-mono text-xs">{MUSIC_PACKAGE_ID.slice(0, 20)}...{MUSIC_PACKAGE_ID.slice(-10)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Marketplace ID:</span>
            <span className="text-white font-mono text-xs">{MUSIC_MARKETPLACE_ID.slice(0, 20)}...{MUSIC_MARKETPLACE_ID.slice(-10)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}