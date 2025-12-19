// components/ListingForm.jsx
import React, { useState } from 'react';
import { Package, Wallet, Music, Sparkles, AlertCircle } from 'lucide-react';
import { Transaction } from '@mysten/sui/transactions';

const RARITY_CONFIG = {
  0: { name: 'Common', color: 'text-gray-400', bg: 'bg-gray-600/20' },
  1: { name: 'Uncommon', color: 'text-green-400', bg: 'bg-green-600/20' },
  2: { name: 'Rare', color: 'text-blue-400', bg: 'bg-blue-600/20' },
  3: { name: 'Legendary', color: 'text-purple-400', bg: 'bg-purple-600/20' },
  4: { name: 'Mythic', color: 'text-yellow-400', bg: 'bg-yellow-600/20' },
};

export default function ListingForm({
  account,
  loading,
  setLoading,
  setError,
  setSuccess,
  signAndExecuteTransaction,
  fetchMarketplaceData,
  nftPackageId,        // NEW package (for NFT type)
  marketplacePackageId, // OLD package (for marketplace functions)
  marketplaceId,
  coinType,
}) {
  const [itemToList, setItemToList] = useState('');
  const [askPrice, setAskPrice] = useState('');
  const [autoFillType, setAutoFillType] = useState(true);
  const [customItemType, setCustomItemType] = useState('');

  // Auto-generate the item type based on NFT package ID
  const getItemType = () => {
    if (!autoFillType && customItemType) {
      return customItemType;
    }
    // Use the NEW package ID where music_nft with rarity is deployed
    return `${nftPackageId}::music_nft::MusicNFT`;
  };

  const listItem = async () => {
    if (!itemToList || !askPrice || !account) {
      setError('Please fill all fields and connect wallet');
      return;
    }

    if (!nftPackageId || !marketplacePackageId || !marketplaceId) {
      setError('NFT Package ID, Marketplace Package ID, or Marketplace ID is missing');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const priceInMist = Math.floor(parseFloat(askPrice) * 1_000_000_000);
      const itemType = getItemType();

      console.log('🏷️ Listing NFT:');
      console.log('NFT Package ID:', nftPackageId);
      console.log('Marketplace Package ID:', marketplacePackageId);
      console.log('Item ID:', itemToList);
      console.log('Item Type:', itemType);
      console.log('Price:', askPrice, 'SUI =', priceInMist, 'MIST');
      console.log('Marketplace:', marketplaceId);
      console.log('Coin Type:', coinType);
      console.log('Target:', `${marketplacePackageId}::marketplace::list`);

      const tx = new Transaction();
      
      tx.moveCall({
        target: `${marketplacePackageId}::marketplace::list`, // Use OLD package for marketplace
        typeArguments: [itemType, coinType], // Use NEW package in itemType
        arguments: [
          tx.object(marketplaceId),
          tx.object(itemToList),
          tx.pure.u64(priceInMist),
        ],
      });

      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log('✅ Listed successfully:', result);
            setSuccess(`Music NFT listed successfully for ${askPrice} SUI!`);
            setItemToList('');
            setAskPrice('');
            if (fetchMarketplaceData) {
              fetchMarketplaceData();
            }
          },
          onError: (error) => {
            console.error('❌ Listing error:', error);
            
            let errorMessage = error.message || 'Failed to list item';
            
            if (errorMessage.includes('not owned')) {
              errorMessage = 'You do not own this NFT or it is already listed';
            } else if (errorMessage.includes('not found')) {
              errorMessage = 'NFT not found. Please check the Object ID';
            } else if (errorMessage.includes('type')) {
              errorMessage = 'Type mismatch. Make sure the Package IDs are correct';
            }
            
            setError(errorMessage);
          },
        }
      );
    } catch (err) {
      console.error('❌ Error:', err);
      setError(err.message || 'Failed to list item');
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return (
      <div>
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Package className="w-6 h-6 text-purple-400" />
          List Music NFT
        </h2>
        <div className="bg-white/5 rounded-lg p-12 border border-white/20 text-center">
          <Wallet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg mb-2">Connect Your Wallet</p>
          <p className="text-gray-500 text-sm">Please connect your wallet to list items on the marketplace</p>
        </div>
      </div>
    );
  }

  const currentItemType = getItemType();

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <Package className="w-6 h-6 text-purple-400" />
        List Music NFT
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Listing Form */}
        <div className="bg-white/5 rounded-lg p-6 border border-white/20">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                NFT Object ID *
              </label>
              <input
                type="text"
                value={itemToList}
                onChange={(e) => setItemToList(e.target.value)}
                placeholder="0x..."
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 font-mono text-sm"
              />
              <p className="text-gray-500 text-xs mt-1">
                The Object ID of your Music NFT (from minting or your wallet)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Price (in SUI) *
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={askPrice}
                onChange={(e) => setAskPrice(e.target.value)}
                placeholder="1.5"
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
              {askPrice && parseFloat(askPrice) > 0 && (
                <p className="text-purple-400 text-sm mt-1 font-semibold">
                  = {Math.floor(parseFloat(askPrice) * 1_000_000_000).toLocaleString()} MIST
                </p>
              )}
            </div>

            {/* NFT Type Configuration */}
            <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-blue-400">
                  NFT Type
                </label>
                <button
                  onClick={() => setAutoFillType(!autoFillType)}
                  className="text-xs text-blue-400 hover:text-blue-300 underline"
                >
                  {autoFillType ? 'Edit Manually' : 'Auto-fill'}
                </button>
              </div>
              
              {autoFillType ? (
                <div className="bg-black/20 rounded p-2">
                  <code className="text-xs text-gray-300 break-all">
                    {currentItemType}
                  </code>
                  <p className="text-gray-500 text-xs mt-1">
                    Using NEW package: {nftPackageId?.slice(0, 10)}...
                  </p>
                </div>
              ) : (
                <input
                  type="text"
                  value={customItemType}
                  onChange={(e) => setCustomItemType(e.target.value)}
                  placeholder={`${nftPackageId}::music_nft::MusicNFT`}
                  className="w-full bg-white/5 border border-blue-500/30 rounded px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              )}
              <p className="text-gray-500 text-xs mt-2">
                {autoFillType 
                  ? '✓ Auto-filled based on your NFT Package ID' 
                  : 'Enter custom type if using different NFT contract'}
              </p>
            </div>

            <button
              onClick={listItem}
              disabled={loading || !itemToList || !askPrice || parseFloat(askPrice) <= 0}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
            >
              <Package className="w-5 h-5" />
              {loading ? 'Listing...' : 'List on Marketplace'}
            </button>
          </div>
        </div>

        {/* Help & Info */}
        <div className="space-y-4">
          {/* How to Find NFT ID */}
          <div className="bg-white/5 rounded-lg p-6 border border-white/20">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Music className="w-5 h-5 text-purple-400" />
              How to Find Your NFT ID
            </h3>
            <ol className="space-y-3 text-sm text-gray-300">
              <li className="flex gap-3">
                <span className="text-purple-400 font-bold">1.</span>
                <span>After minting, copy the NFT ID shown in the success message</span>
              </li>
              <li className="flex gap-3">
                <span className="text-purple-400 font-bold">2.</span>
                <span>Or check your wallet's "Objects" or "NFTs" section</span>
              </li>
              <li className="flex gap-3">
                <span className="text-purple-400 font-bold">3.</span>
                <span>Or use CLI: <code className="bg-black/30 px-2 py-1 rounded text-xs">sui client objects</code></span>
              </li>
              <li className="flex gap-3">
                <span className="text-purple-400 font-bold">4.</span>
                <span>Paste the Object ID here and set your price</span>
              </li>
            </ol>
          </div>

          {/* Configuration Status */}
          <div className="bg-white/5 rounded-lg p-6 border border-white/20">
            <h3 className="text-white font-semibold mb-4">Configuration Status</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className={account ? 'text-green-400' : 'text-red-400'}>●</span>
                <span className="text-gray-300">Wallet: {account ? 'Connected' : 'Not Connected'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={nftPackageId ? 'text-green-400' : 'text-red-400'}>●</span>
                <span className="text-gray-300">NFT Package: {nftPackageId ? '✓' : 'Missing'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={marketplacePackageId ? 'text-green-400' : 'text-red-400'}>●</span>
                <span className="text-gray-300">Marketplace Package: {marketplacePackageId ? '✓' : 'Missing'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={marketplaceId ? 'text-green-400' : 'text-red-400'}>●</span>
                <span className="text-gray-300">Marketplace ID: {marketplaceId ? '✓' : 'Missing'}</span>
              </div>
            </div>
          </div>

          {/* Pricing Tips */}
          <div className="bg-purple-600/10 border border-purple-600/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <h4 className="text-purple-400 font-semibold text-sm">Pricing Tips</h4>
            </div>
            <ul className="space-y-1 text-xs text-gray-300">
              <li>• Common NFTs: 0.1 - 1 SUI</li>
              <li>• Uncommon NFTs: 1 - 3 SUI</li>
              <li>• Rare NFTs: 3 - 10 SUI</li>
              <li>• Legendary NFTs: 10 - 50 SUI</li>
              <li>• Mythic NFTs: 50+ SUI</li>
            </ul>
            <p className="text-gray-400 text-xs mt-2">
              💡 Adjust based on artist popularity and music quality
            </p>
          </div>

          {/* Important Notes */}
          <div className="bg-yellow-600/10 border border-yellow-600/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-yellow-400" />
              <h4 className="text-yellow-400 font-semibold text-sm">Important</h4>
            </div>
            <ul className="space-y-1 text-xs text-gray-300">
              <li>• You must own the NFT to list it</li>
              <li>• NFT will be locked in marketplace until sold or delisted</li>
              <li>• You can delist anytime before someone buys it</li>
              <li>• Buyer pays the exact price you set</li>
              <li>• Payment goes to your wallet automatically</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}