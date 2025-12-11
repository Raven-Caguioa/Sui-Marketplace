// components/BuyForm.jsx
import React, { useState } from 'react';
import { ShoppingCart, Wallet } from 'lucide-react';
import { Transaction } from '@mysten/sui/transactions';

export default function BuyForm({
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
  const [itemIdToBuy, setItemIdToBuy] = useState('');
  const [buyItemType, setBuyItemType] = useState('');
  const [buyAmount, setBuyAmount] = useState('');

  const buyItem = async () => {
    if (!itemIdToBuy || !buyItemType || !buyAmount || !account) {
      setError('Please fill all fields and connect wallet');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const amountInMist = Math.floor(parseFloat(buyAmount) * 1_000_000_000);

      const tx = new Transaction();
      const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(amountInMist)]);
      
      tx.moveCall({
        target: `${packageId}::marketplace::buy_and_take`,
        typeArguments: [buyItemType, coinType],
        arguments: [
          tx.object(marketplaceId),
          tx.pure.id(itemIdToBuy),
          coin,
        ],
      });

      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: (result) => {
            setSuccess(`Item purchased successfully! Digest: ${result.digest}`);
            setItemIdToBuy('');
            setBuyItemType('');
            setBuyAmount('');
            fetchMarketplaceData();
          },
          onError: (error) => {
            setError(error.message || 'Failed to purchase item');
          },
        }
      );
    } catch (err) {
      setError(err.message || 'Failed to purchase item');
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return (
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Buy an Item</h2>
        <div className="text-center py-16">
          <Wallet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg mb-2">Connect Your Wallet</p>
          <p className="text-gray-500 text-sm">Please connect your wallet to buy items</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">Buy an Item</h2>
      <div className="max-w-2xl space-y-4">
        <div>
          <label className="block text-gray-400 text-sm mb-2">Item ID</label>
          <input
            type="text"
            value={itemIdToBuy}
            onChange={(e) => setItemIdToBuy(e.target.value)}
            placeholder="0x..."
            className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
          <p className="text-gray-500 text-sm mt-1">The object ID of the listed item</p>
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-2">Item Type</label>
          <input
            type="text"
            value={buyItemType}
            onChange={(e) => setBuyItemType(e.target.value)}
            placeholder="0xPACKAGE::MODULE::STRUCT"
            className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
          <p className="text-gray-500 text-sm mt-1">Must match the item's type exactly</p>
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-2">Payment (SUI)</label>
          <input
            type="number"
            step="0.001"
            value={buyAmount}
            onChange={(e) => setBuyAmount(e.target.value)}
            placeholder="1.5"
            className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
          {buyAmount && (
            <p className="text-gray-500 text-sm mt-1">
              ≈ {Math.floor(parseFloat(buyAmount) * 1_000_000_000).toLocaleString()} MIST
            </p>
          )}
        </div>

        <button
          onClick={buyItem}
          disabled={loading || !itemIdToBuy || !buyItemType || !buyAmount}
          className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <ShoppingCart className="w-5 h-5" />
          {loading ? 'Buying...' : 'Buy Item'}
        </button>

        <div className="mt-6 bg-yellow-600/10 border border-yellow-500/30 rounded-lg p-4">
          <h3 className="text-yellow-400 font-semibold mb-2">⚠️ Important:</h3>
          <ul className="space-y-2 text-sm text-gray-300 list-disc list-inside">
            <li>Payment amount must match the asking price exactly</li>
            <li>Item type must be the exact full type path</li>
            <li>Use the View tab to check listing details first</li>
          </ul>
        </div>
      </div>
    </div>
  );
}