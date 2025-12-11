// components/NFTDetailScreen.jsx
import React, { useState } from 'react';
import { X, Copy, Check, Music, ExternalLink, ArrowLeft } from 'lucide-react';

export default function NFTDetailScreen({ listing, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!listing) return null;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatSui = (mist) => (Number(mist) / 1_000_000_000).toFixed(4);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 z-50 overflow-y-auto">
      {/* Header Bar */}
      <div className="sticky top-0 z-10 bg-black/50 backdrop-blur-lg border-b border-purple-500/30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-white hover:text-purple-400 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold">Back to Marketplace</span>
          </button>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-purple-600 hover:bg-purple-700 rounded-full flex items-center justify-center transition-all hover:scale-110"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Side - Image */}
          <div className="space-y-6">
            <div className="relative bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-2xl overflow-hidden border-4 border-purple-500/50">
              <div className="w-full max-w-[500px] mx-auto" style={{ maxHeight: '500px' }}>
                <img
                  src={listing.imageUrl}
                  alt={listing.name}
                  className="w-full h-full object-contain"
                  style={{ maxWidth: '100%', maxHeight: '500px' }}
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/500x500/8b5cf6/ffffff?text=NFT+Image';
                  }}
                />
              </div>
            </div>

            {/* Audio Player */}
            {listing.musicUrl && listing.musicUrl !== 'https://example.com/music.mp3' && (
              <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 backdrop-blur-sm rounded-2xl p-6 border-2 border-purple-500/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                    <Music className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">Audio Preview</h3>
                    <p className="text-purple-300 text-sm">Listen to this NFT</p>
                  </div>
                </div>
                <audio 
                  controls 
                  className="w-full"
                  style={{
                    filter: 'hue-rotate(270deg) saturate(1.5)',
                  }}
                >
                  <source src={listing.musicUrl} type="audio/mpeg" />
                  <source src={listing.musicUrl} type="audio/wav" />
                  <source src={listing.musicUrl} type="audio/ogg" />
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
          </div>

          {/* Right Side - Details */}
          <div className="space-y-6">
            {/* Title and Description */}
            <div>
              <h1 className="text-5xl font-bold text-white mb-4 uppercase tracking-wide">
                {listing.name}
              </h1>
              <p className="text-gray-300 text-lg leading-relaxed">
                {listing.description}
              </p>
            </div>

            {/* Price Card */}
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-6 shadow-2xl shadow-purple-500/50">
              <p className="text-purple-100 text-sm uppercase tracking-wider mb-2">Current Price</p>
              <div className="flex items-baseline gap-2">
                <span className="text-white font-bold text-5xl">{formatSui(listing.askPrice)}</span>
                <span className="text-purple-200 text-2xl font-semibold">SUI</span>
              </div>
            </div>

            {/* Details Sections */}
            <div className="space-y-4">
              {/* Object ID */}
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-purple-500/20">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-purple-300 font-bold uppercase tracking-wider text-sm">Object ID</h3>
                  <button
                    onClick={() => copyToClipboard(listing.itemId)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded-lg transition-all hover:scale-105"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-white" />
                        <span className="text-white text-xs font-semibold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-white" />
                        <span className="text-white text-xs font-semibold">Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <code className="text-white font-mono text-sm break-all block bg-black/30 p-3 rounded-lg">
                  {listing.itemId}
                </code>
              </div>

              {/* Type */}
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-purple-500/20">
                <h3 className="text-purple-300 font-bold uppercase tracking-wider text-sm mb-3">Type</h3>
                <p className="text-white font-mono text-lg">MusicNFT</p>
              </div>

              {/* Seller */}
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-purple-500/20">
                <h3 className="text-purple-300 font-bold uppercase tracking-wider text-sm mb-3">Seller</h3>
                <code className="text-white font-mono text-sm break-all block bg-black/30 p-3 rounded-lg">
                  {listing.owner}
                </code>
              </div>

              {/* Attributes */}
              {listing.attributes && listing.attributes !== 'none' && (
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-purple-500/20">
                  <h3 className="text-purple-300 font-bold uppercase tracking-wider text-sm mb-3">Attributes</h3>
                  <p className="text-white font-mono text-sm break-all bg-black/30 p-3 rounded-lg">
                    {listing.attributes}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <a
                href={`https://suiscan.xyz/testnet/object/${listing.itemId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl font-bold transition-all hover:scale-105 text-center flex items-center justify-center gap-2 shadow-lg"
              >
                <ExternalLink className="w-5 h-5" />
                View on Explorer
              </a>
            </div>

            {/* Buy Instructions */}
            <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-2 border-green-500/40 rounded-xl p-5">
              <div className="flex gap-3">
                <div className="text-3xl">💡</div>
                <div>
                  <h4 className="text-green-300 font-bold mb-1">How to Buy</h4>
                  <p className="text-green-200 text-sm leading-relaxed">
                    Copy the Object ID above and paste it in the "Buy NFT" tab to purchase this item.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}