// components/DelistForm.jsx
import React, { useState } from 'react';
import { Package, Wallet } from 'lucide-react';
import { Transaction } from '@mysten/sui/transactions';

export default function DelistForm({
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
  const [itemIdToDelist, setItemIdToDelist] = useState('');
  const [delistItemType, setDelistItemType] = useState('');

  const delistItem = async () => {
    if (!itemIdToDelist || !delistItemType || !account) {
      setError('Please fill all fields and connect wallet');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::marketplace::delist_and_take`,
        typeArguments: [delistItemType, coinType],
        arguments: [
          tx.object(marketplaceId),
          tx.pure.id(itemIdToDelist),
        ],
      });

      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: (result) => {
            setSuccess(`Item delisted successfully! Digest: ${result.digest}`);
            setItemIdToDelist('');
            setDelistItemType('');
            fetchMarketplaceData();
          },
          onError: (error) => {
            setError(error.message || 'Failed to delist item');
          },
        }
      );
    } catch (err) {
      setError(err.message || 'Failed to delist item');
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return (
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Delist Your Item</h2>
        <div className="text-center py-16">
          <Wallet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg mb-2">Connect Your Wallet</p>
          <p className="text-gray-500 text-sm">Please connect your wallet to delist items</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">Delist Your Item</h2>
      <div className="max-w-2xl space-y-4">
        <div>
          <label className="block text-gray-400 text-sm mb-2">Item ID</label>
          <input
            type="text"
            value={itemIdToDelist}
            onChange={(e) => setItemIdToDelist(e.target.value)}
            placeholder="0x..."
            className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
          <p className="text-gray-500 text-sm mt-1">The object ID of your listed item</p>
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-2">Item Type</label>
          <input
            type="text"
            value={delistItemType}
            onChange={(e) => setDelistItemType(e.target.value)}
            placeholder="0xPACKAGE::MODULE::STRUCT"
            className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
          <p className="text-gray-500 text-sm mt-1">Must match the item's type exactly</p>
        </div>

        <button
          onClick={delistItem}
          disabled={loading || !itemIdToDelist || !delistItemType}
          className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <Package className="w-5 h-5" />
          {loading ? 'Delisting...' : 'Delist Item'}
        </button>

        <div className="mt-6 bg-blue-600/10 border border-blue-500/30 rounded-lg p-4">
          <h3 className="text-blue-400 font-semibold mb-2">ℹ️ Note:</h3>
          <ul className="space-y-2 text-sm text-gray-300 list-disc list-inside">
            <li>Only the owner can delist an item</li>
            <li>The item will be returned to your wallet</li>
            <li>No fees are charged for delisting</li>
          </ul>
        </div>
      </div>
    </div>
  );
}