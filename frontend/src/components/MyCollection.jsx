import React, { useState, useEffect } from 'react';
import { Wallet, Search, AlertCircle, RefreshCw } from 'lucide-react';
import NFTDetailScreen from './NFTDetailScreen';

export default function MyCollection({
  account,
  client,
  loading,
  setLoading,
  setError,
  packageId,
}) {
  const [nfts, setNfts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const [selectedNFT, setSelectedNFT] = useState(null);

  useEffect(() => {
    if (account) {
      fetchUserNFTs();
    } else {
      setNfts([]);
      setDebugInfo('Please connect your wallet to view your collection');
    }
  }, [client, account]);

  const fetchUserNFTs = async () => {
    if (!client || !account) return;
    
    setLoading(true);
    setError('');
    setDebugInfo('Fetching your NFT collection...');
    
    try {
      // Get all objects owned by the user
      const ownedObjects = await client.getOwnedObjects({
        owner: account.address,
        options: {
          showContent: true,
          showType: true,
        },
      });

      console.log('Owned objects:', ownedObjects);
      setDebugInfo(`Found ${ownedObjects.data.length} total objects`);

      // Filter for MusicNFT objects
      const musicNFTs = [];
      
      for (const obj of ownedObjects.data) {
        try {
          const objData = obj.data;
          
          // Check if this is a MusicNFT by looking at the type
          if (objData?.type && objData.type.includes('music_nft::MusicNFT')) {
            const nftContent = objData.content?.fields || {};
            
            console.log('Found MusicNFT:', {
              objectId: objData.objectId,
              content: nftContent
            });

            musicNFTs.push({
              itemId: objData.objectId,
              name: nftContent.name || 'Unknown NFT',
              description: nftContent.description || 'No description',
              imageUrl: nftContent.image_url || 'https://via.placeholder.com/400x400/8b5cf6/ffffff?text=Music+NFT',
              musicUrl: nftContent.music_url || '',
              creator: nftContent.creator || 'Unknown',
              attributes: nftContent.attributes || '',
              itemType: objData.type,
              isListed: false, // Not listed in marketplace
              owner: account.address,
            });
          }
        } catch (err) {
          console.error('Error processing object:', err);
        }
      }

      setDebugInfo(`Successfully loaded ${musicNFTs.length} Music NFTs from your wallet`);
      setNfts(musicNFTs);
      
    } catch (err) {
      console.error('Error fetching NFTs:', err);
      setError(err.message || 'Failed to fetch your NFT collection');
      setDebugInfo(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const truncateAddress = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

  const filteredNFTs = nfts.filter(nft =>
    nft.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    nft.itemId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    nft.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!account) {
    return (
      <div className="text-center py-16">
        <Wallet className="w-16 h-16 text-purple-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h3>
        <p className="text-gray-400">Please connect your wallet to view your NFT collection</p>
      </div>
    );
  }

  return (
    <div>
      {/* Show detail screen if an NFT is selected */}
      {selectedNFT && (
        <NFTDetailScreen 
          listing={selectedNFT} 
          onClose={() => setSelectedNFT(null)}
          isOwned={true}
        />
      )}

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">My Collection</h2>
        <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm mb-2">
                View all Music NFTs in your wallet. You can list them on the marketplace or keep them in your collection.
              </p>
              <p className="text-purple-400 text-xs">
                <strong>Wallet:</strong> {truncateAddress(account.address)}
              </p>
            </div>
            <button
              onClick={fetchUserNFTs}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded-lg font-semibold transition-colors text-sm flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Debug Info */}
      {debugInfo && (
        <div className="mb-4 bg-blue-600/10 border border-blue-600/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-blue-400 text-sm font-semibold">Status:</p>
              <p className="text-gray-300 text-xs mt-1">{debugInfo}</p>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search your NFTs by name, ID, or description..."
            className="w-full bg-white/5 border border-white/20 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your collection...</p>
        </div>
      ) : filteredNFTs.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🎵</div>
          <h3 className="text-xl font-bold text-white mb-2">No NFTs Found</h3>
          <p className="text-gray-400">
            {searchTerm 
              ? 'No NFTs match your search.' 
              : "You don't have any Music NFTs in your wallet yet. Mint or buy some to get started!"}
          </p>
        </div>
      ) : (
        <div>
          <div className="mb-4 text-sm text-gray-400">
            Showing {filteredNFTs.length} {filteredNFTs.length === 1 ? 'NFT' : 'NFTs'}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredNFTs.map((nft) => (
              <div
                key={nft.itemId}
                onClick={() => setSelectedNFT(nft)}
                style={{ backgroundColor: 'rgba(109, 40, 217, 0.3)' }}
                className="backdrop-blur-sm border-2 border-purple-500 rounded-xl p-5 hover:border-purple-400 transition-all cursor-pointer shadow-xl hover:shadow-2xl hover:shadow-purple-500/40 hover:-translate-y-1"
              >
                {/* Image Container - Centered */}
                <div className="flex justify-center mb-4">
                  <div className="relative w-full max-w-[200px] h-[200px] bg-purple-950/70 rounded-lg overflow-hidden flex items-center justify-center border-2 border-purple-500/40">
                    {nft.imageUrl && nft.imageUrl !== 'https://via.placeholder.com/400x400/8b5cf6/ffffff?text=Music+NFT' ? (
                      <img
                        src={nft.imageUrl}
                        alt={nft.name}
                        className="w-full h-full object-contain"
                        style={{ maxWidth: '100%', maxHeight: '200px' }}
                        onError={(e) => {
                          console.error('Image failed to load:', nft.imageUrl);
                          e.target.style.display = 'none';
                          const parent = e.target.parentElement;
                          parent.innerHTML = '<div class="flex flex-col items-center justify-center w-full h-full text-purple-300"><div class="text-6xl mb-2">🎵</div><div class="text-sm text-purple-400">No Image</div></div>';
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center w-full h-full text-purple-300">
                        <div className="text-6xl mb-2">🎵</div>
                        <div className="text-sm text-purple-400">Music NFT</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* NFT Info */}
                <div className="text-center">
                  <h3 className="text-white font-bold text-lg mb-2 truncate">{nft.name}</h3>
                  
                  <p className="text-gray-400 text-xs mb-2">
                    <strong>Object ID:</strong> {nft.itemId.slice(0, 16)}...
                  </p>
                  
                  <div className="mb-3 px-3 py-1 bg-green-600/20 border border-green-500/30 rounded-full inline-block">
                    <p className="text-green-400 text-xs font-semibold">
                      ✓ Owned
                    </p>
                  </div>
                  
                  <p className="text-gray-500 text-xs mb-3 line-clamp-2">
                    {nft.description}
                  </p>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNFT(nft);
                    }}
                    className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors text-sm"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}