// components/MintNFT.jsx
import React, { useState } from 'react';
import { Music, Image, Upload, Copy, Check, Sparkles } from 'lucide-react';
import { Transaction } from '@mysten/sui/transactions';

const RANDOM_OBJECT_ID = '0x8'; // Sui's shared Random object

// Rarity display configuration
const RARITY_CONFIG = {
  0: { name: 'Common', color: 'text-gray-400', bg: 'bg-gray-600/20', border: 'border-gray-600/30', chance: '50%' },
  1: { name: 'Uncommon', color: 'text-green-400', bg: 'bg-green-600/20', border: 'border-green-600/30', chance: '30%' },
  2: { name: 'Rare', color: 'text-blue-400', bg: 'bg-blue-600/20', border: 'border-blue-600/30', chance: '15%' },
  3: { name: 'Legendary', color: 'text-purple-400', bg: 'bg-purple-600/20', border: 'border-purple-600/30', chance: '4%' },
  4: { name: 'Mythic', color: 'text-yellow-400', bg: 'bg-yellow-600/20', border: 'border-yellow-600/30', chance: '1%' },
};

export default function MintNFT({
  account,
  loading,
  setLoading,
  setError,
  setSuccess,
  signAndExecuteTransaction,
  packageId,
  collectionId,
}) {
  const [formData, setFormData] = useState({
    name: '',
    artist: '',      // NEW: Artist field
    genre: '',       // NEW: Genre field (was description)
    imageUrl: '',
    musicUrl: '',
  });
  const [mintedNFT, setMintedNFT] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const mintNFT = async (e) => {
    e.preventDefault();
    
    if (!account) {
      setError('Please connect your wallet');
      return;
    }

    if (!formData.name || !formData.artist || !formData.genre) {
      setError('Name, Artist, and Genre are required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setMintedNFT(null);

    try {
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${packageId}::music_nft::mint_to_sender`,
        arguments: [
          tx.object(collectionId),
          tx.object(RANDOM_OBJECT_ID),  // NEW: Random object for rarity generation
          tx.pure.string(formData.name),
          tx.pure.string(formData.genre),    // Genre (was description parameter)
          tx.pure.string(formData.imageUrl || 'https://via.placeholder.com/400'),
          tx.pure.string(formData.musicUrl || 'https://example.com/music.mp3'),
          tx.pure.string(formData.artist),   // Artist (was attributes parameter)
        ],
      });

      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log('Mint result:', result);
            
            // Extract NFT ID and rarity from events
            const events = result.events || [];
            const mintEvent = events.find(e => 
              e.type.includes('::music_nft::NFTMinted')
            );
            
            let rarityInfo = null;
            if (mintEvent && mintEvent.parsedJson) {
              rarityInfo = {
                rarity: mintEvent.parsedJson.rarity,
                rarity_name: mintEvent.parsedJson.rarity_name,
              };
            }
            
            // Extract NFT ID from created objects
            const createdObjects = result.effects?.created;
            const nftObject = createdObjects?.find(obj => 
              obj.owner && typeof obj.owner === 'object' && 'AddressOwner' in obj.owner
            );
            
            if (nftObject) {
              const nftId = nftObject.reference.objectId;
              setMintedNFT({
                id: nftId,
                name: formData.name,
                artist: formData.artist,
                genre: formData.genre,
                digest: result.digest,
                rarity: rarityInfo?.rarity ?? null,
                rarityName: rarityInfo?.rarity_name ?? 'Unknown',
              });
              setSuccess(`NFT minted successfully with ${rarityInfo?.rarity_name || 'random'} rarity!`);
              
              // Clear form
              setFormData({
                name: '',
                artist: '',
                genre: '',
                imageUrl: '',
                musicUrl: '',
              });
            } else {
              setSuccess(`Transaction successful! Digest: ${result.digest}`);
            }
          },
          onError: (error) => {
            console.error('Mint error:', error);
            setError(error.message || 'Failed to mint NFT');
          },
        }
      );
    } catch (err) {
      console.error('Mint error:', err);
      setError(err.message || 'Failed to mint NFT');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <Music className="w-6 h-6 text-purple-400" />
        Mint Music NFT
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mint Form */}
        <div className="bg-white/5 rounded-lg p-6 border border-white/20">
          <form onSubmit={mintNFT} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Song Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Epic Beat #1"
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Artist Name *
              </label>
              <input
                type="text"
                name="artist"
                value={formData.artist}
                onChange={handleChange}
                placeholder="DJ CryptoBeats"
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Genre *
              </label>
              <input
                type="text"
                name="genre"
                value={formData.genre}
                onChange={handleChange}
                placeholder="Lofi Hip Hop"
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">e.g., Hip Hop, Electronic, Rock, Jazz</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <Image className="w-4 h-4" />
                Album Art URL
              </label>
              <input
                type="url"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleChange}
                placeholder="https://ipfs.io/ipfs/Qm..."
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty for placeholder image</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <Music className="w-4 h-4" />
                Music File URL
              </label>
              <input
                type="url"
                name="musicUrl"
                value={formData.musicUrl}
                onChange={handleChange}
                placeholder="https://ipfs.io/ipfs/Qm..."
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1">IPFS or Arweave recommended</p>
            </div>

            {/* Rarity Info */}
            <div className="bg-purple-600/10 border border-purple-600/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h4 className="text-purple-400 font-semibold text-sm">Random Rarity System</h4>
              </div>
              <p className="text-gray-400 text-xs mb-3">
                Your NFT will receive a random rarity when minted!
              </p>
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(RARITY_CONFIG).map(([key, config]) => (
                  <div key={key} className={`${config.bg} ${config.border} border rounded p-2 text-center`}>
                    <p className={`${config.color} text-xs font-bold`}>{config.name}</p>
                    <p className="text-gray-400 text-xs">{config.chance}</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !account}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5" />
              {loading ? 'Minting...' : account ? 'Mint NFT' : 'Connect Wallet'}
            </button>
          </form>
        </div>

        {/* Result Display */}
        <div className="space-y-4">
          {/* Preview Card */}
          <div className="bg-white/5 rounded-lg p-6 border border-white/20">
            <h3 className="text-white font-semibold mb-4">Preview</h3>
            <div className="bg-white/5 rounded-lg overflow-hidden">
              <div className="aspect-square bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center relative">
                {formData.imageUrl ? (
                  <img 
                    src={formData.imageUrl} 
                    alt="NFT Preview" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <Image className="w-16 h-16 text-gray-600" />
                )}
                <div className="absolute top-2 right-2 bg-purple-600/80 backdrop-blur px-3 py-1 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-white" />
                  <span className="text-white text-xs font-semibold">Random Rarity</span>
                </div>
              </div>
              <div className="p-4 space-y-2">
                <h4 className="text-white font-bold text-lg">
                  {formData.name || 'Song Name'}
                </h4>
                <p className="text-gray-400 text-sm">
                  {formData.artist || 'Artist Name'}
                </p>
                {formData.genre && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-purple-600/20 text-purple-400 px-2 py-1 rounded">
                      {formData.genre}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Minted NFT Info */}
          {mintedNFT && (
            <div className={`${RARITY_CONFIG[mintedNFT.rarity]?.bg || 'bg-green-600/10'} border ${RARITY_CONFIG[mintedNFT.rarity]?.border || 'border-green-600/30'} rounded-lg p-6`}>
              <h3 className={`${RARITY_CONFIG[mintedNFT.rarity]?.color || 'text-green-400'} font-semibold mb-4 flex items-center gap-2`}>
                <Sparkles className="w-5 h-5" />
                {mintedNFT.rarityName} NFT Minted!
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Song Name:</p>
                  <p className="text-white font-semibold">{mintedNFT.name}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Artist:</p>
                  <p className="text-white font-semibold">{mintedNFT.artist}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Genre:</p>
                  <p className="text-white font-semibold">{mintedNFT.genre}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Rarity:</p>
                  <div className={`inline-block ${RARITY_CONFIG[mintedNFT.rarity]?.bg} ${RARITY_CONFIG[mintedNFT.rarity]?.border} border px-3 py-1 rounded-full`}>
                    <span className={`${RARITY_CONFIG[mintedNFT.rarity]?.color} font-bold text-sm`}>
                      {mintedNFT.rarityName}
                    </span>
                  </div>
                </div>
                <div className="pt-3 border-t border-white/10">
                  <p className="text-gray-400 text-sm mb-1">NFT ID (Copy this!):</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-white font-mono text-xs bg-black/30 p-2 rounded break-all">
                      {mintedNFT.id}
                    </code>
                    <button
                      onClick={() => copyToClipboard(mintedNFT.id)}
                      className="p-2 bg-purple-600 hover:bg-purple-700 rounded transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-white" />}
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Transaction:</p>
                  <a
                    href={`https://suiscan.xyz/testnet/tx/${mintedNFT.digest}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 text-xs underline"
                  >
                    View on Explorer →
                  </a>
                </div>
                <div className="pt-3 border-t border-white/10">
                  <p className="text-gray-400 text-sm">
                    💡 Use this NFT ID to list it on the marketplace!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Help Text */}
          <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-4">
            <h4 className="text-blue-400 font-semibold mb-2 text-sm">Upload Guide</h4>
            <ul className="text-gray-400 text-xs space-y-1">
              <li>• Upload album art to IPFS (Pinata, NFT.Storage)</li>
              <li>• Upload music files to IPFS or Arweave</li>
              <li>• Use the returned URLs in the form</li>
              <li>• Each NFT gets random rarity automatically!</li>
              <li>• Save the NFT ID after minting!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}