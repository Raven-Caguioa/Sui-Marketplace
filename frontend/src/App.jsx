import React, { useState, useEffect } from 'react';
import { ShoppingCart, Wallet, RefreshCw } from 'lucide-react';
import { ConnectButton, useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import StatCard from './components/StatCard';
import ListingForm from './components/ListingForm';
import BuyForm from './components/BuyForm';
import DelistForm from './components/DelistForm';
import ViewListing from './components/ViewListing';
import InfoTab from './components/InfoTab';
import AlertMessage from './components/AlertMessage';
import MintNFT from './components/MintNFT';
import ActiveListings from './components/ActiveListings';
import MyCollection from './components/MyCollection';
import MusicStreaming from './components/MusicStreaming';
import MintAndListMusic from './components/MintAndListMusic';
import ListYourNFTs from './components/ListYourNFTs';
import UnlistMyNFTs from './components/UnlistMyNFTs';
import NFTTrading from './components/NFTTrading';

// OLD PACKAGE (where marketplace was created)
const OLD_PACKAGE_ID = '0x08ac46b00eb814de6e803b7abb60b42abbaf49712314f4ed188f4fea6d4ce3ec';
const OLD_COLLECTION_ID = '0x07c09c81925e5f995479fac9caa6fdc0983863e800ee4b04831bcd44e4fb427a';

// NEW PACKAGE (with rarity system for minting)
const NEW_PACKAGE_ID = "0xef31a73e2b31f94fc64fba29c65482857ef60c30a10932da7e86c74f9a9a4ac8";
const NEW_COLLECTION_ID = "0xb0d2997345aed39db636afb6f66f96e660aef921f0eb7a440e412afe69285d05";

// Shared marketplace and coin type
const MARKETPLACE_ID = '0xb9aa59546415a92290e60ad5d90a9d0b013da1b3daa046aba44a0be113a83b84';
const COIN_TYPE = '0x2::sui::SUI';

export default function MarketplaceFrontend() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  
  const [activeTab, setActiveTab] = useState('browse');
  const [listingCount, setListingCount] = useState(0);
  const [pendingPayment, setPendingPayment] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchMarketplaceData = async () => {
    if (!client) return;
    
    setLoading(true);
    setError('');
    
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${OLD_PACKAGE_ID}::marketplace::get_listing_count`,
        typeArguments: [COIN_TYPE],
        arguments: [tx.object(MARKETPLACE_ID)],
      });

      const countResult = await client.devInspectTransactionBlock({
        sender: account?.address || '0x0000000000000000000000000000000000000000000000000000000000000000',
        transactionBlock: tx,
      });
      
      if (countResult.results?.[0]?.returnValues?.[0]) {
        const [bytes] = countResult.results[0].returnValues[0];
        const count = Number(new DataView(new Uint8Array(bytes).buffer).getBigUint64(0, true));
        setListingCount(count);
      }

      if (account?.address) {
        const tx2 = new Transaction();
        tx2.moveCall({
          target: `${OLD_PACKAGE_ID}::marketplace::get_pending_payment`,
          typeArguments: [COIN_TYPE],
          arguments: [tx2.object(MARKETPLACE_ID), tx2.pure.address(account.address)],
        });

        const pendingResult = await client.devInspectTransactionBlock({
          sender: account.address,
          transactionBlock: tx2,
        });
        
        if (pendingResult.results?.[0]?.returnValues?.[0]) {
          const [bytes] = pendingResult.results[0].returnValues[0];
          const amount = Number(new DataView(new Uint8Array(bytes).buffer).getBigUint64(0, true));
          setPendingPayment(amount);
        }
      }
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to fetch marketplace data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketplaceData();
  }, [client, account]);

  const takeProfits = async () => {
    if (!account) {
      setError('Please connect wallet');
      return;
    }

    if (pendingPayment === 0) {
      setError('No pending payments to collect');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${OLD_PACKAGE_ID}::marketplace::take_profits_and_keep`, // Use OLD package
        typeArguments: [COIN_TYPE],
        arguments: [tx.object(MARKETPLACE_ID)],
      });

      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: (result) => {
            setSuccess(`Profits collected successfully! Digest: ${result.digest}`);
            fetchMarketplaceData();
          },
          onError: (error) => {
            setError(error.message || 'Failed to collect profits');
          },
        }
      );
    } catch (err) {
      setError(err.message || 'Failed to collect profits');
    } finally {
      setLoading(false);
    }
  };

  const truncateAddress = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

  const tabs = [
    { id: 'streaming', label: '🎵 Music Rewards' },
    { id: 'upload', label: '🎤 Upload Music' },
    { id: 'mynfts', label: '📁 Send Music NFT' },
    { id: 'unlist', label: '📤 Unlist My NFTs' },
    { id: 'trading', label: '🔄 P2P Trading' },    
    { id: 'browse', label: 'Browse' },
    { id: 'collection', label: 'My Collection' },
    { id: 'mint', label: 'Mint NFT' },
    { id: 'list', label: 'List' },
    { id: 'buy', label: 'Buy' },
    { id: 'delist', label: 'Delist' },
    { id: 'view', label: 'View' },
    { id: 'info', label: 'Info' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="bg-black/30 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-8 h-8 text-purple-400" />
              <h1 className="text-2xl font-bold text-white">Sui Marketplace</h1>
            </div>
            <div className="flex items-center gap-4">
              {account ? (
                <div className="bg-white/10 backdrop-blur-md rounded-lg px-4 py-2 border border-white/20">
                  <div className="flex items-center gap-2 text-white">
                    <Wallet className="w-4 h-4" />
                    <span className="text-sm font-mono">{truncateAddress(account.address)}</span>
                  </div>
                </div>
              ) : (
                <ConnectButton />
              )}
              <button
                onClick={fetchMarketplaceData}
                className="p-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                disabled={loading}
              >
                <RefreshCw className={`w-5 h-5 text-white ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <AlertMessage type="error" message={error} onClose={() => setError('')} />
        <AlertMessage type="success" message={success} onClose={() => setSuccess('')} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            label="Total Listings"
            value={listingCount}
            icon="package"
            color="purple"
          />
          <StatCard
            label="Pending Payment"
            value={`${(pendingPayment / 1_000_000_000).toFixed(4)} SUI`}
            icon="dollar"
            color="green"
            showButton={pendingPayment > 0 && account}
            buttonLabel={loading ? 'Collecting...' : 'Collect Payment'}
            onButtonClick={takeProfits}
            buttonDisabled={loading}
          />
          <StatCard
            label="Wallet Status"
            value={account ? 'Connected' : 'Not Connected'}
            icon="user"
            color="blue"
          />
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
          <div className="flex border-b border-white/20 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-6 py-4 font-semibold transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === 'streaming' && (
              <MusicStreaming
                account={account}
                client={client}
                loading={loading}
                setLoading={setLoading}
                setError={setError}
                setSuccess={setSuccess}
                signAndExecuteTransaction={signAndExecuteTransaction}
              />
            )}

            {activeTab === 'upload' && (
              <MintAndListMusic
                account={account}
                loading={loading}
                setLoading={setLoading}
                setError={setError}
                setSuccess={setSuccess}
                signAndExecuteTransaction={signAndExecuteTransaction}
              />
            )}

            {activeTab === 'mynfts' && (
              <ListYourNFTs
                account={account}
                client={client}
                loading={loading}
                setLoading={setLoading}
                setError={setError}
                setSuccess={setSuccess}
                signAndExecuteTransaction={signAndExecuteTransaction}
              />
            )}

            {activeTab === 'unlist' && (
              <UnlistMyNFTs
                account={account}
                client={client}
                loading={loading}
                setLoading={setLoading}
                setError={setError}
                setSuccess={setSuccess}
                signAndExecuteTransaction={signAndExecuteTransaction}
                marketplacePackageId={OLD_PACKAGE_ID} // Use OLD package for marketplace functions
                marketplaceId={MARKETPLACE_ID}
              />
            )}

            {activeTab === 'trading' && (
              <NFTTrading
                account={account}
                client={client}
                loading={loading}
                setLoading={setLoading}
                setError={setError}
                setSuccess={setSuccess}
                signAndExecuteTransaction={signAndExecuteTransaction}
              />
            )}

            {activeTab === 'browse' && (
              <ActiveListings
                account={account}
                client={client}
                loading={loading}
                setLoading={setLoading}
                setError={setError}
                marketplacePackageId={OLD_PACKAGE_ID} // Use OLD package for marketplace
                nftPackageId={NEW_PACKAGE_ID} // Can view both old and new NFTs
                marketplaceId={MARKETPLACE_ID}
                coinType={COIN_TYPE}
              />
            )}

            {activeTab === 'collection' && (
              <MyCollection
                account={account}
                client={client}
                loading={loading}
                setLoading={setLoading}
                setError={setError}
                nftPackageId={NEW_PACKAGE_ID} // Show new NFTs with rarity
                oldNftPackageId={OLD_PACKAGE_ID} // Also show old NFTs
              />
            )}

            {activeTab === 'mint' && (
              <MintNFT
                account={account}
                loading={loading}
                setLoading={setLoading}
                setError={setError}
                setSuccess={setSuccess}
                signAndExecuteTransaction={signAndExecuteTransaction}
                packageId={NEW_PACKAGE_ID} // Use NEW package for minting with rarity
                collectionId={NEW_COLLECTION_ID}
              />
            )}

            {activeTab === 'list' && (
              <ListingForm
                account={account}
                loading={loading}
                setLoading={setLoading}
                setError={setError}
                setSuccess={setSuccess}
                signAndExecuteTransaction={signAndExecuteTransaction}
                fetchMarketplaceData={fetchMarketplaceData}
                nftPackageId={NEW_PACKAGE_ID} // NEW package for NFT type
                marketplacePackageId={OLD_PACKAGE_ID} // OLD package for marketplace functions
                marketplaceId={MARKETPLACE_ID}
                coinType={COIN_TYPE}
              />
            )}

            {activeTab === 'buy' && (
              <BuyForm
                account={account}
                loading={loading}
                setLoading={setLoading}
                setError={setError}
                setSuccess={setSuccess}
                signAndExecuteTransaction={signAndExecuteTransaction}
                fetchMarketplaceData={fetchMarketplaceData}
                marketplacePackageId={OLD_PACKAGE_ID} // Use OLD package for marketplace
                nftPackageId={NEW_PACKAGE_ID} // NFT type from NEW package
                marketplaceId={MARKETPLACE_ID}
                coinType={COIN_TYPE}
              />
            )}

            {activeTab === 'delist' && (
              <DelistForm
                account={account}
                loading={loading}
                setLoading={setLoading}
                setError={setError}
                setSuccess={setSuccess}
                signAndExecuteTransaction={signAndExecuteTransaction}
                fetchMarketplaceData={fetchMarketplaceData}
                marketplacePackageId={OLD_PACKAGE_ID} // Use OLD package for marketplace
                nftPackageId={NEW_PACKAGE_ID} // NFT type from NEW package
                marketplaceId={MARKETPLACE_ID}
                coinType={COIN_TYPE}
              />
            )}

            {activeTab === 'view' && (
              <ViewListing
                account={account}
                client={client}
                loading={loading}
                setLoading={setLoading}
                setError={setError}
                marketplacePackageId={OLD_PACKAGE_ID} // Use OLD package for marketplace
                marketplaceId={MARKETPLACE_ID}
                coinType={COIN_TYPE}
              />
            )}

            {activeTab === 'info' && (
              <InfoTab
                oldPackageId={OLD_PACKAGE_ID}
                newPackageId={NEW_PACKAGE_ID}
                marketplaceId={MARKETPLACE_ID}
                oldCollectionId={OLD_COLLECTION_ID}
                newCollectionId={NEW_COLLECTION_ID}
                coinType={COIN_TYPE}
                listingCount={listingCount}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}