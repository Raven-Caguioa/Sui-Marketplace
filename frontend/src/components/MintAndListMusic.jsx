import React, { useState } from 'react';
import { Music, Upload, Send, Loader2, AlertCircle } from 'lucide-react';
import { Transaction } from '@mysten/sui/transactions';

const PACKAGE_ID = '0x989abceb5afcc1ee7f460b41e79f03ee4d3406191ee964da95db51a20fa95f27';
const COLLECTION_ID = '0x4638a72793aea3c5ff3ca1f48ae5f88ff1b0c079448ee8995925264405c36f0c';

export default function MintMusicNFT({ account, client, loading, setLoading, setError, setSuccess, signAndExecuteTransaction }) {
  const [mintForm, setMintForm] = useState({
    name: '',
    description: '',
    imageUrl: '',
    musicUrl: '',
    attributes: '{}',
    recipient: ''
  });

  const handleFormChange = (e) => {
    setMintForm({
      ...mintForm,
      [e.target.name]: e.target.value
    });
  };

  const mintNFT = async (toRecipient = false) => {
    if (!account) {
      setError('Please connect your wallet');
      return;
    }

    if (!mintForm.name || !mintForm.description || !mintForm.imageUrl || !mintForm.musicUrl) {
      setError('Please fill in all required fields (name, description, image URL, music URL)');
      return;
    }

    if (toRecipient && !mintForm.recipient) {
      setError('Please enter recipient address');
      return;
    }

    setLoading(true);
    try {
      const tx = new Transaction();
      
      if (toRecipient) {
        // Mint to specific recipient
        tx.moveCall({
          target: `${PACKAGE_ID}::music_nft::mint`,
          arguments: [
            tx.object(COLLECTION_ID),
            tx.pure.string(mintForm.name),
            tx.pure.string(mintForm.description),
            tx.pure.string(mintForm.imageUrl),
            tx.pure.string(mintForm.musicUrl),
            tx.pure.string(mintForm.attributes || '{}'),
            tx.pure.address(mintForm.recipient),
          ],
        });
      } else {
        // Mint to self
        tx.moveCall({
          target: `${PACKAGE_ID}::music_nft::mint_to_sender`,
          arguments: [
            tx.object(COLLECTION_ID),
            tx.pure.string(mintForm.name),
            tx.pure.string(mintForm.description),
            tx.pure.string(mintForm.imageUrl),
            tx.pure.string(mintForm.musicUrl),
            tx.pure.string(mintForm.attributes || '{}'),
          ],
        });
      }

      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: (result) => {
            setSuccess(`Successfully minted "${mintForm.name}"! Go to "My NFTs" to list it on the marketplace.`);
            setMintForm({
              name: '',
              description: '',
              imageUrl: '',
              musicUrl: '',
              attributes: '{}',
              recipient: ''
            });
          },
          onError: (error) => {
            setError(error.message || 'Failed to mint NFT');
          },
        }
      );
    } catch (err) {
      setError(err.message || 'Failed to mint NFT');
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setMintForm({
      name: '',
      description: '',
      imageUrl: '',
      musicUrl: '',
      attributes: '{}',
      recipient: ''
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600/30 to-blue-600/30 rounded-xl p-6 border border-purple-500/30">
        <div className="flex items-center gap-4">
          <div className="bg-purple-600 p-4 rounded-xl">
            <Music className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Mint Music NFT</h2>
            <p className="text-gray-300">Create your unique music NFT with custom metadata</p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-blue-400 font-semibold mb-1">Quick Guide</p>
            <p className="text-sm text-blue-200">
              Upload your music and cover art to Pinata/IPFS first, then use those URLs here. 
              After minting, go to "My NFTs" page to list your NFT on the marketplace.
            </p>
          </div>
        </div>
      </div>

      {/* Minting Form */}
      <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <Upload className="w-6 h-6 text-purple-400" />
          NFT Details
        </h3>
        
        <div className="space-y-4">
          {/* Name & Image URL Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={mintForm.name}
                onChange={handleFormChange}
                placeholder="Epic Beat #1"
                className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Cover Image URL <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="imageUrl"
                value={mintForm.imageUrl}
                onChange={handleFormChange}
                placeholder="https://gateway.pinata.cloud/ipfs/..."
                className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              name="description"
              value={mintForm.description}
              onChange={handleFormChange}
              placeholder="Describe your music NFT... (genre, mood, inspiration, etc.)"
              rows="4"
              className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
            />
          </div>

          {/* Music URL */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Music File URL <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="musicUrl"
              value={mintForm.musicUrl}
              onChange={handleFormChange}
              placeholder="https://copper-efficient-felidae-814.mypinata.cloud/ipfs/..."
              className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
            <p className="text-xs text-gray-500 mt-2">
              💡 Tip: Use Pinata, IPFS, or Arweave for permanent hosting
            </p>
          </div>

          {/* Attributes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Attributes (JSON format)
            </label>
            <input
              type="text"
              name="attributes"
              value={mintForm.attributes}
              onChange={handleFormChange}
              placeholder='{"genre": "Electronic", "bpm": 128, "mood": "Energetic"}'
              className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-2">
              Optional: Add custom properties in JSON format
            </p>
          </div>

          {/* Recipient Address */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Recipient Address (Optional)
            </label>
            <input
              type="text"
              name="recipient"
              value={mintForm.recipient}
              onChange={handleFormChange}
              placeholder="0x... (leave empty to mint to yourself)"
              className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-2">
              Leave blank to mint to yourself, or enter a wallet address to gift the NFT
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => mintNFT(false)}
              disabled={loading || !account}
              className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white py-3 px-6 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-purple-500/50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Minting...
                </>
              ) : (
                <>
                  <Music className="w-5 h-5" />
                  Mint to Myself
                </>
              )}
            </button>
            
            <button
              onClick={() => mintNFT(true)}
              disabled={loading || !account || !mintForm.recipient}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 px-6 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-blue-500/50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Minting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Mint to Recipient
                </>
              )}
            </button>

            <button
              onClick={clearForm}
              disabled={loading}
              className="bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
        <h3 className="text-xl font-bold text-white mb-4">How to Mint & List Your Music</h3>
        <div className="space-y-3 text-gray-300">
          <div className="flex items-start gap-3">
            <div className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">1</div>
            <div>
              <p className="font-semibold text-white">Upload Your Files</p>
              <p className="text-sm">Upload your music file and cover art to Pinata, IPFS, or Arweave. Get the URLs.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">2</div>
            <div>
              <p className="font-semibold text-white">Fill the Form</p>
              <p className="text-sm">Enter your NFT details with the URLs from step 1</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">3</div>
            <div>
              <p className="font-semibold text-white">Mint Your NFT</p>
              <p className="text-sm">Click "Mint to Myself" - the NFT will appear in your wallet</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">4</div>
            <div>
              <p className="font-semibold text-white">List on Marketplace</p>
              <p className="text-sm">Go to "My NFTs" page and click "List on Marketplace" to make it public</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">5</div>
            <div>
              <p className="font-semibold text-white">Users Listen & Earn</p>
              <p className="text-sm">Your music is now available! Users can listen and earn SUI rewards</p>
            </div>
          </div>
        </div>
      </div>

      {/* Collection Info */}
      <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl p-6 border border-indigo-500/30">
        <h3 className="text-xl font-bold text-white mb-4">Technical Details</h3>
        <div className="space-y-2 text-sm font-mono">
          <div className="flex flex-col gap-1">
            <span className="text-gray-400">Collection ID:</span>
            <span className="text-white text-xs break-all bg-black/30 p-2 rounded">{COLLECTION_ID}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-gray-400">Package ID:</span>
            <span className="text-white text-xs break-all bg-black/30 p-2 rounded">{PACKAGE_ID}</span>
          </div>
        </div>
      </div>

      {/* Warning */}
      {!account && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-400 font-semibold mb-1">Wallet Not Connected</p>
              <p className="text-sm text-yellow-200">
                Please connect your Sui wallet to mint NFTs
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}