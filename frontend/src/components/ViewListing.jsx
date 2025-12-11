// components/ViewListing.jsx
import React, { useState } from 'react';
import { Eye, Package } from 'lucide-react';
import { Transaction } from '@mysten/sui/transactions';

export default function ViewListing({
  account,
  client,
  loading,
  setLoading,
  setError,
  packageId,
  marketplaceId,
  coinType,
}) {
  const [itemIdToView, setItemIdToView] = useState('');
  const [viewResult, setViewResult] = useState(null);

  const viewListing = async (itemId) => {
    if (!itemId || !client) return;
    
    setLoading(true);
    setError('');
    
    try {
      const tx1 = new Transaction();
      tx1.moveCall({
        target: `${packageId}::marketplace::listing_exists`,
        typeArguments: [coinType],
        arguments: [tx1.object(marketplaceId), tx1.pure.id(itemId)],
      });

      const existsResult = await client.devInspectTransactionBlock({
        sender: account?.address || '0x0000000000000000000000000000000000000000000000000000000000000000',
        transactionBlock: tx1,
      });
      
      if (existsResult.results?.[0]?.returnValues?.[0]) {
        const [bytes] = existsResult.results[0].returnValues[0];
        const exists = bytes[0] === 1;
        
        if (exists) {
          const tx2 = new Transaction();
          tx2.moveCall({
            target: `${packageId}::marketplace::view_listing`,
            typeArguments: [coinType],
            arguments: [tx2.object(marketplaceId), tx2.pure.id(itemId)],
          });

          const viewResult = await client.devInspectTransactionBlock({
            sender: account?.address || '0x0000000000000000000000000000000000000000000000000000000000000000',
            transactionBlock: tx2,
          });
          
          if (viewResult.results?.[0]?.returnValues) {
            const [priceBytes] = viewResult.results[0].returnValues[0];
            const [ownerBytes] = viewResult.results[0].returnValues[1];
            
            const price = Number(new DataView(new Uint8Array(priceBytes).buffer).getBigUint64(0, true));
            const ownerHex = Array.from(new Uint8Array(ownerBytes))
              .map(b => b.toString(16).padStart(2, '0'))
              .join('');
            const owner = '0x' + ownerHex;
            
            setViewResult({ itemId, askPrice: price.toString(), owner, exists: true });
          }
        } else {
          setViewResult({ itemId, exists: false });
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to view listing');
    } finally {
      setLoading(false);
    }
  };

  const formatSui = (mist) => (Number(mist) / 1_000_000_000).toFixed(4);
  const truncateAddress = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">View Listing Details</h2>
      <div className="max-w-2xl">
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={itemIdToView}
            onChange={(e) => setItemIdToView(e.target.value)}
            placeholder="0x..."
            className="flex-1 bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={() => viewListing(itemIdToView)}
            disabled={loading || !itemIdToView}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            {loading ? 'Loading...' : 'View'}
          </button>
        </div>

        {viewResult && (
          <div className="bg-white/5 rounded-lg p-6 border border-white/20">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-400" />
              Listing Information
            </h3>
            
            {viewResult.exists ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-white/10">
                  <span className="text-gray-400">Item ID:</span>
                  <span className="text-white font-mono text-sm">{truncateAddress(viewResult.itemId)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/10">
                  <span className="text-gray-400">Ask Price:</span>
                  <span className="text-purple-400 font-bold">{formatSui(viewResult.askPrice)} SUI</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/10">
                  <span className="text-gray-400">Owner:</span>
                  <span className="text-white font-mono text-sm">{truncateAddress(viewResult.owner)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-400">Status:</span>
                  <span className="px-3 py-1 bg-green-600/20 text-green-400 rounded-full text-sm">Active</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-yellow-400 mb-2">⚠️ Listing Not Found</p>
                <p className="text-gray-400 text-sm">This item is not currently listed in the marketplace</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}