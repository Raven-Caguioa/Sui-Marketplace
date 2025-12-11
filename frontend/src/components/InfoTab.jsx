// components/InfoTab.jsx
import React from 'react';

export default function InfoTab({ packageId, marketplaceId, coinType, listingCount }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">Integration Information</h2>
      <div className="space-y-4 text-gray-300">
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <h3 className="text-white font-semibold mb-2">Package ID</h3>
          <code className="text-purple-400 text-sm font-mono break-all">{packageId}</code>
        </div>
        
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <h3 className="text-white font-semibold mb-2">Marketplace ID</h3>
          <code className="text-purple-400 text-sm font-mono break-all">{marketplaceId}</code>
        </div>

        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <h3 className="text-white font-semibold mb-2">Coin Type</h3>
          <code className="text-purple-400 text-sm font-mono break-all">{coinType}</code>
        </div>

        <div className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-4">
          <h3 className="text-blue-400 font-semibold mb-2">📚 Available Functions</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>✅ <strong>list</strong> - List an item for sale</li>
            <li>✅ <strong>buy_and_take</strong> - Purchase a listed item</li>
            <li>✅ <strong>delist_and_take</strong> - Remove your listing</li>
            <li>✅ <strong>take_profits_and_keep</strong> - Collect your earnings</li>
            <li>✅ <strong>view_listing</strong> - View listing details</li>
            <li>✅ <strong>get_listing_count</strong> - Get total listings</li>
            <li>✅ <strong>get_pending_payment</strong> - Check your balance</li>
          </ul>
        </div>

        <div className="bg-green-600/10 border border-green-500/30 rounded-lg p-4">
          <h3 className="text-green-400 font-semibold mb-2">🎯 How to Use</h3>
          <ol className="space-y-2 text-sm text-gray-300 list-decimal list-inside">
            <li><strong>List:</strong> Enter your item's object ID, type, and price</li>
            <li><strong>Buy:</strong> Find an item ID, enter the type and exact price</li>
            <li><strong>Delist:</strong> Remove your listing by entering item ID and type</li>
            <li><strong>View:</strong> Check any listing details by item ID</li>
            <li><strong>Collect:</strong> Withdraw your earnings when you have pending payments</li>
          </ol>
        </div>

        <div className="bg-purple-600/10 border border-purple-500/30 rounded-lg p-4">
          <h3 className="text-purple-400 font-semibold mb-2">💡 Tips</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>• Make sure you own the item before listing</li>
            <li>• Prices are in SUI (will be converted to MIST automatically)</li>
            <li>• You must pay the exact asking price to buy an item</li>
            <li>• Only the owner can delist their items</li>
            <li>• Check your pending payments regularly and collect them</li>
          </ul>
        </div>

        <div className="bg-yellow-600/10 border border-yellow-500/30 rounded-lg p-4">
          <h3 className="text-yellow-400 font-semibold mb-2">⚠️ Important Notes</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>• Item Type must be the full type path (Package::Module::Struct)</li>
            <li>• Item IDs are the object IDs of the NFTs/items</li>
            <li>• All transactions require wallet connection</li>
            <li>• Gas fees apply to all transactions</li>
          </ul>
        </div>

        <div className="bg-green-600/10 border border-green-500/30 rounded-lg p-4">
          <h3 className="text-green-400 font-semibold mb-2">✅ Marketplace Ready!</h3>
          <p className="text-sm text-gray-300 mb-2">
            Your marketplace is deployed and the frontend is connected. You can now:
          </p>
          <ul className="mt-2 space-y-1 text-sm list-disc list-inside text-gray-400">
            <li>List items on the marketplace</li>
            <li>View total listings count (currently: {listingCount})</li>
            <li>Buy items from other sellers</li>
            <li>Delist your own items</li>
            <li>Check pending payments</li>
            <li>View listing details by entering an item ID</li>
          </ul>
        </div>
      </div>
    </div>
  );
}