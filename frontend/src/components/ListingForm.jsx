// components/ListingForm.jsx
import React, { useState } from 'react';
import { Package, Wallet } from 'lucide-react';
import { Transaction } from '@mysten/sui/transactions';

export default function ListingForm({
  account,
  loading,
  setLoading,
  setError,
  setSuccess,
  signAndExecuteTransaction,
  fetchMarketplaceData,
  packageId,
  marketplaceId,
  coinType,
}) {
  const [itemToList, setItemToList] = useState('');
  const [askPrice, setAskPrice] = useState('');
  const [itemType, setItemType] = useState('');

  const listItem = async () => {
    if (!itemToList || !askPrice || !itemType || !account) {
      setError('Please fill all fields and connect wallet');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const priceInMist = Math.floor(parseFloat(askPrice) * 1_000_000_000);

      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::marketplace::list`,
        typeArguments: [itemType, coinType],
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
            setSuccess(`Item listed successfully! Digest: ${result.digest}`);
            setItemToList('');
            setAskPrice('');
            setItemType('');
            fetchMarketplaceData();
          },
          onError: (error) => {
            setError(error.message || 'Failed to list item');
          },
        }
      );
    } catch (err) {
      setError(err.message || 'Failed to list item');
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return (
      <div>
        <h2 className="text-xl font-bold text-white mb-4">List an Item</h2>
        <div className="text-center py-16">
          <Wallet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg mb-2">Connect Your Wallet</p>
          <p className="text-gray-500 text-sm">Please connect your wallet to list items</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">List an Item</h2>
      <div className="max-w-2xl space-y-4">
        <div>
          <label className="block text-gray-400 text-sm mb-2">Item Object ID</label>
          <input
            type="text"
            value={itemToList}
            onChange={(e) => setItemToList(e.target.value)}
            placeholder="0x..."
            className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
          <p className="text-gray-500 text-sm mt-1">The object ID of the NFT/item you want to list</p>
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-2">Item Type (Full Type)</label>
          <input
            type="text"
            value={itemType}
            onChange={(e) => setItemType(e.target.value)}
            placeholder="0xPACKAGE::MODULE::STRUCT"
            className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
          <p className="text-gray-500 text-sm mt-1">Example: 0x123::my_nft::MyNFT</p>
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-2">Price (in SUI)</label>
          <input
            type="number"
            step="0.001"
            value={askPrice}
            onChange={(e) => setAskPrice(e.target.value)}
            placeholder="1.5"
            className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
          {askPrice && (
            <p className="text-gray-500 text-sm mt-1">
              ≈ {Math.floor(parseFloat(askPrice) * 1_000_000_000).toLocaleString()} MIST
            </p>
          )}
        </div>

        <button
          onClick={listItem}
          disabled={loading || !itemToList || !askPrice || !itemType}
          className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <Package className="w-5 h-5" />
          {loading ? 'Listing...' : 'List Item'}
        </button>

        <div className="mt-6 bg-blue-600/10 border border-blue-500/30 rounded-lg p-4">
          <h3 className="text-blue-400 font-semibold mb-2">💡 How to find your Item ID & Type:</h3>
          <ol className="space-y-2 text-sm text-gray-300 list-decimal list-inside">
            <li>Go to your wallet or use <code className="text-purple-400">sui client objects</code></li>
            <li>Find the object you want to list and copy its ID</li>
            <li>Get the full type from the object details (Package::Module::Struct)</li>
            <li>Paste both here and set your price</li>
          </ol>
        </div>
      </div>
    </div>
  );
}