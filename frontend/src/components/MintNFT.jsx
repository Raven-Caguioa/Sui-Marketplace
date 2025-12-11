// components/MintNFT.jsx
import React, { useState } from 'react';
import { Music, Image, Upload, Copy, Check } from 'lucide-react';
import { Transaction } from '@mysten/sui/transactions';

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
    description: '',
    imageUrl: '',
    musicUrl: '',
    attributes: '',
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

    if (!formData.name || !formData.description) {
      setError('Name and description are required');
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
          tx.pure.string(formData.name),
          tx.pure.string(formData.description),
          tx.pure.string(formData.imageUrl || 'https://via.placeholder.com/400'),
          tx.pure.string(formData.musicUrl || 'https://example.com/music.mp3'),
          tx.pure.string(formData.attributes || 'none'),
        ],
      });

      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log('Mint result:', result);
            
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
                digest: result.digest,
              });
              setSuccess(`NFT minted successfully!`);
              
              // Clear form
              setFormData({
                name: '',
                description: '',
                imageUrl: '',
                musicUrl: '',
                attributes: '',
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
                NFT Name *
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
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="A chill lofi track for studying..."
                rows="3"
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <Image className="w-4 h-4" />
                Image URL
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
                Music URL
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

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Attributes (metadata)
              </label>
              <input
                type="text"
                name="attributes"
                value={formData.attributes}
                onChange={handleChange}
                placeholder='{"genre":"lofi","bpm":"90"}'
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1">Optional: JSON format or simple text</p>
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
              <div className="aspect-square bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center">
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
              </div>
              <div className="p-4 space-y-2">
                <h4 className="text-white font-bold text-lg">
                  {formData.name || 'NFT Name'}
                </h4>
                <p className="text-gray-400 text-sm">
                  {formData.description || 'Description will appear here...'}
                </p>
                {formData.attributes && (
                  <div className="pt-2 border-t border-white/10">
                    <p className="text-gray-500 text-xs">Attributes:</p>
                    <p className="text-gray-300 text-xs font-mono">{formData.attributes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Minted NFT Info */}
          {mintedNFT && (
            <div className="bg-green-600/10 border border-green-600/30 rounded-lg p-6">
              <h3 className="text-green-400 font-semibold mb-4 flex items-center gap-2">
                <Check className="w-5 h-5" />
                NFT Minted Successfully!
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-400 text-sm mb-1">NFT Name:</p>
                  <p className="text-white font-semibold">{mintedNFT.name}</p>
                </div>
                <div>
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
              <li>• Upload images to IPFS (Pinata, NFT.Storage)</li>
              <li>• Upload music to IPFS or Arweave</li>
              <li>• Use the returned URLs in the form</li>
              <li>• Save the NFT ID after minting!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}