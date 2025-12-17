import React, { useState, useEffect } from 'react';
import { ShoppingCart, Search, AlertCircle, RefreshCw } from 'lucide-react';
import NFTDetailScreen from './NFTDetailScreen';

export default function ActiveListings({
  account,
  client,
  loading,
  setLoading,
  setError,
  setSuccess,
  signAndExecuteTransaction,
  packageId,
  marketplaceId,
  coinType,
}) {
  const [listings, setListings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const [selectedListing, setSelectedListing] = useState(null);

  useEffect(() => {
    fetchAllListings();
  }, [client, marketplaceId]);

  const fetchAllListings = async () => {
    if (!client) return;
    
    setLoading(true);
    setError('');
    setDebugInfo('Fetching listings from marketplace...');
    
    try {
      // Get the marketplace object with dynamic fields
      const marketplaceObj = await client.getObject({
        id: marketplaceId,
        options: {
          showContent: true,
          showType: true,
        },
      });

      console.log('Marketplace object:', marketplaceObj);
      setDebugInfo('Marketplace loaded. Searching for listed items...');

      // Get all dynamic fields (this is where listings are stored)
      const dynamicFields = await client.getDynamicFields({
        parentId: marketplaceObj.data.content.fields.items.fields.id.id,
      });

      console.log('Dynamic fields:', dynamicFields);
      setDebugInfo(`Found ${dynamicFields.data.length} dynamic fields`);

      if (dynamicFields.data.length === 0) {
        setDebugInfo('No items in marketplace bag. List an NFT first!');
        setListings([]);
        setLoading(false);
        return;
      }

      // Fetch each listing
      const activeListings = [];
      for (const field of dynamicFields.data) {
        try {
          // Get the listing object
          const listingField = await client.getObject({
            id: field.objectId,
            options: {
              showContent: true,
            },
          });

          console.log('Listing field:', listingField);

          const listingData = listingField.data?.content?.fields?.value?.fields;
          if (!listingData) continue;

          const itemId = field.name.value;
          const askPrice = listingData.ask;
          const owner = listingData.owner;

          // Now get the actual NFT data
          // The NFT is stored as a dynamic object field inside the listing
          const listingId = listingData.id.id;
          
          // Get dynamic fields of the listing to find the NFT
          const nftFields = await client.getDynamicFields({
            parentId: listingId,
          });

          console.log('NFT fields:', nftFields);

          if (nftFields.data.length > 0) {
            // Get the NFT object
            const nftFieldObj = await client.getObject({
              id: nftFields.data[0].objectId,
              options: {
                showContent: true,
                showType: true,
              },
            });

            console.log('NFT object:', nftFieldObj);

            // Try multiple possible data structures
            let nftContent = nftFieldObj.data?.content?.fields?.value?.fields || {};
            
            // If fields are empty, try alternative structure
            if (!nftContent.name) {
              nftContent = nftFieldObj.data?.content?.fields || {};
            }
            
            // Log the full structure to understand it better
            console.log('Full NFT structure:', JSON.stringify(nftFieldObj.data, null, 2));
            console.log('NFT Content Details:', {
              name: nftContent.name,
              description: nftContent.description,
              image_url: nftContent.image_url,
              music_url: nftContent.music_url,
              attributes: nftContent.attributes
            });
            
            activeListings.push({
              itemId: itemId,
              askPrice: askPrice,
              owner: owner,
              listingId: listingId,
              name: nftContent.name || 'Unknown NFT',
              description: nftContent.description || 'No description',
              imageUrl: nftContent.image_url || 'https://via.placeholder.com/400x400/8b5cf6/ffffff?text=Music+NFT',
              musicUrl: nftContent.music_url || '',
              attributes: nftContent.attributes || '',
              itemType: nftFieldObj.data?.type || 'Unknown',
            });
          }
        } catch (err) {
          console.error('Error fetching listing:', err);
        }
      }

      setDebugInfo(`Successfully loaded ${activeListings.length} active listings`);
      setListings(activeListings);
      
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError(err.message || 'Failed to fetch listings');
      setDebugInfo(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatSui = (mist) => (Number(mist) / 1_000_000_000).toFixed(4);
  const truncateAddress = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

  const filteredListings = listings.filter(listing =>
    listing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    listing.itemId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    listing.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* Show detail screen if an NFT is selected - Full screen overlay */}
      {selectedListing && (
        <NFTDetailScreen 
          listing={selectedListing} 
          onClose={() => setSelectedListing(null)}
          account={account}
          packageId={packageId}
          marketplaceId={marketplaceId}
          coinType={coinType}
          signAndExecuteTransaction={signAndExecuteTransaction}
          onSuccess={(result) => {
            setSuccess('Purchase successful!');
            fetchAllListings();
          }}
          onError={(err) => {
            setError(err.message || 'Purchase failed');
          }}
        />
      )}

      <div className="space-y-6">
        {/* Header Section */}
        <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Active Listings</h2>
              <p className="text-gray-400 text-sm">
                Browse all NFTs currently listed on the marketplace
              </p>
            </div>
            <button
              onClick={fetchAllListings}
              disabled={loading}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, ID, or description..."
              className="w-full bg-white/5 border border-white/20 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Debug Info */}
        {debugInfo && (
          <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-blue-400 text-sm font-semibold">Debug Info:</p>
                <p className="text-gray-300 text-xs mt-1">{debugInfo}</p>
                <p className="text-gray-400 text-xs mt-1">
                  Marketplace ID: {truncateAddress(marketplaceId)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Listings Grid */}
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Loading listings...</p>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-lg rounded-xl p-12 border border-white/10 text-center">
            <ShoppingCart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">
              {searchTerm ? 'No listings match your search.' : 'No active listings found.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredListings.map((listing) => (
              <div
                key={listing.itemId}
                onClick={() => setSelectedListing(listing)}
                className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-all border border-white/10 group hover:border-purple-500/50 cursor-pointer"
              >
                {/* Image */}
                <div className="relative w-full h-48 bg-black/30 rounded-lg overflow-hidden mb-3">
                  {listing.imageUrl && listing.imageUrl !== 'https://via.placeholder.com/400x400/8b5cf6/ffffff?text=Music+NFT' ? (
                    <img
                      src={listing.imageUrl}
                      alt={listing.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/300?text=No+Image';
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full text-purple-300">
                      <div className="text-6xl mb-2">🎵</div>
                      <div className="text-sm text-purple-400">Music NFT</div>
                    </div>
                  )}
                </div>

                {/* NFT Info */}
                <h4 className="font-bold text-white mb-1 truncate">{listing.name}</h4>
                <p className="text-sm text-gray-400 mb-1 truncate">
                  Owner: {truncateAddress(listing.owner)}
                </p>
                <p className="text-xs text-gray-500 mb-2 line-clamp-3 h-12">
                  {listing.description || ' '}
                </p>
                
                {/* Price */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                  <div>
                    <p className="text-xs text-gray-500">Price</p>
                    <p className="text-lg font-bold text-purple-400">{formatSui(listing.askPrice)} SUI</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedListing(listing);
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors text-sm"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}