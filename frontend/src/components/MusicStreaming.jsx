import React, { useState, useEffect } from 'react';
import { Music, Play, Pause, Clock, Coins, Award, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import { Transaction } from '@mysten/sui/transactions';

const PACKAGE_ID = '0x989abceb5afcc1ee7f460b41e79f03ee4d3406191ee964da95db51a20fa95f27';
const MARKETPLACE_ID = '0xc92b9ba2f210fadaa565de58660757916c48fd44521998296c4157d0764b5cac';
const CLOCK_ID = '0x6';

export default function MusicStreaming({ account, client, loading, setLoading, setError, setSuccess, signAndExecuteTransaction }) {
  const [listedMusic, setListedMusic] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [playingTrack, setPlayingTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [listeningTime, setListeningTime] = useState(0);
  const [pendingRewards, setPendingRewards] = useState(0);
  const [marketplaceStats, setMarketplaceStats] = useState({ totalMusic: 0, totalListens: 0, totalRewards: 0, poolBalance: 0 });
  const audioRef = React.useRef(null);

  // Fetch listed music NFTs
    const fetchListedMusic = async () => {
    if (!client) return;
    
    try {
        // Get marketplace stats
        const tx = new Transaction();
        tx.moveCall({
        target: `${PACKAGE_ID}::music_marketplace::get_marketplace_stats`,
        arguments: [tx.object(MARKETPLACE_ID)],
        });

        const result = await client.devInspectTransactionBlock({
        sender: account?.address || '0x0000000000000000000000000000000000000000000000000000000000000000',
        transactionBlock: tx,
        });

        if (result.results?.[0]?.returnValues) {
        const [musicCount, listens, rewards, pool] = result.results[0].returnValues;
        setMarketplaceStats({
            totalMusic: Number(new DataView(new Uint8Array(musicCount[0]).buffer).getBigUint64(0, true)),
            totalListens: Number(new DataView(new Uint8Array(listens[0]).buffer).getBigUint64(0, true)),
            totalRewards: Number(new DataView(new Uint8Array(rewards[0]).buffer).getBigUint64(0, true)) / 1_000_000_000,
            poolBalance: Number(new DataView(new Uint8Array(pool[0]).buffer).getBigUint64(0, true)) / 1_000_000_000,
        });
        }

        // Fetch actual music NFTs from the marketplace
        const marketplaceObject = await client.getObject({
        id: MARKETPLACE_ID,
        options: { showContent: true }
        });

        if (marketplaceObject?.data?.content?.fields) {
        const musicLibrary = marketplaceObject.data.content.fields.music_library;
        
        // Get all listed music from the table
        if (musicLibrary?.fields?.id?.id) {
            const tableId = musicLibrary.fields.id.id;
            
            // Get ALL dynamic fields with pagination
            let allDynamicFields = [];
            let hasNextPage = true;
            let cursor = null;

            while (hasNextPage) {
            const dynamicFieldsResponse = await client.getDynamicFields({
                parentId: tableId,
                cursor: cursor,
                limit: 50, // Fetch 50 at a time
            });

            allDynamicFields = allDynamicFields.concat(dynamicFieldsResponse.data);
            hasNextPage = dynamicFieldsResponse.hasNextPage;
            cursor = dynamicFieldsResponse.nextCursor;
            }

            console.log(`Found ${allDynamicFields.length} total music NFTs in marketplace`);

            const musicPromises = allDynamicFields.map(async (field) => {
            try {
                const fieldObject = await client.getObject({
                id: field.objectId,
                options: { showContent: true }
                });

                if (fieldObject?.data?.content?.fields?.value?.fields) {
                const listing = fieldObject.data.content.fields.value.fields;
                const nft = listing.nft.fields;
                
                return {
                    id: field.name.value,
                    title: nft.name || 'Untitled',
                    artist: nft.creator ? `${nft.creator.slice(0, 6)}...${nft.creator.slice(-4)}` : 'Unknown',
                    image: nft.image_url || 'https://via.placeholder.com/300',
                    audioUrl: nft.music_url || '',
                    description: nft.description || '',
                    totalListens: Number(listing.total_listens || 0),
                    totalListenTime: Number(listing.total_listen_time_seconds || 0),
                    owner: listing.owner || '',
                };
                }
            } catch (err) {
                console.error('Error fetching music NFT:', err);
                return null;
            }
            });

            const musicList = (await Promise.all(musicPromises)).filter(m => m !== null);
            console.log(`Successfully loaded ${musicList.length} music NFTs`);
            setListedMusic(musicList);
        }
        }
    } catch (err) {
        console.error('Error fetching music:', err);
    }
    };
  // Check if user has active session (only sets initial state, doesn't override timer)
  const checkActiveSession = async () => {
    if (!client || !account) return;
    
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::music_marketplace::is_listening`,
        arguments: [tx.object(MARKETPLACE_ID), tx.pure.address(account.address)],
      });

      const result = await client.devInspectTransactionBlock({
        sender: account.address,
        transactionBlock: tx,
      });

      if (result.results?.[0]?.returnValues?.[0]) {
        const isListening = new Uint8Array(result.results[0].returnValues[0][0])[0] === 1;
        
        if (isListening) {
          // Get session details
          const tx2 = new Transaction();
          tx2.moveCall({
            target: `${PACKAGE_ID}::music_marketplace::get_listening_session`,
            arguments: [tx2.object(MARKETPLACE_ID), tx2.pure.address(account.address)],
          });

          const sessionResult = await client.devInspectTransactionBlock({
            sender: account.address,
            transactionBlock: tx2,
          });

          if (sessionResult.results?.[0]?.returnValues) {
            const [nftId, startTime, seconds, rewards] = sessionResult.results[0].returnValues;
            const nftIdStr = '0x' + Array.from(new Uint8Array(nftId[0])).map(b => b.toString(16).padStart(2, '0')).join('');
            const totalSeconds = Number(new DataView(new Uint8Array(seconds[0]).buffer).getBigUint64(0, true));
            const pendingRewardsMist = Number(new DataView(new Uint8Array(rewards[0]).buffer).getBigUint64(0, true));
            
            // Only set session if we don't have one (initial load)
            if (!currentSession) {
              setCurrentSession({
                nftId: nftIdStr,
                startTime: Number(new DataView(new Uint8Array(startTime[0]).buffer).getBigUint64(0, true)),
                totalSeconds: totalSeconds,
                pendingRewards: pendingRewardsMist / 1_000_000_000,
              });
              setListeningTime(totalSeconds);
              setPendingRewards(pendingRewardsMist / 1_000_000_000);
              
              // Find and set the playing track
              const track = listedMusic.find(m => m.id === nftIdStr);
              if (track) {
                setPlayingTrack(track);
              }
            }
          }
        } else {
          // No active session on-chain, clear local state
          if (currentSession) {
            setCurrentSession(null);
            setPlayingTrack(null);
            setIsPlaying(false);
            setListeningTime(0);
            setPendingRewards(0);
            if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
            }
          }
        }
      }
    } catch (err) {
      console.error('Error checking session:', err);
    }
  };

  useEffect(() => {
    fetchListedMusic();
  }, [client, account]);
  
  // Check session only once on mount
  useEffect(() => {
    if (account && listedMusic.length > 0) {
      checkActiveSession();
    }
  }, [account, listedMusic.length]);

  // Timer for listening rewards
  useEffect(() => {
    if (isPlaying && currentSession) {
      const interval = setInterval(() => {
        setListeningTime(prev => prev + 1);
        setPendingRewards(prev => prev + 0.0000001); // 100 MIST per second = 0.0000001 SUI
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPlaying, currentSession]);
  
  // Pause when wallet disconnects or component unmounts
  useEffect(() => {
    if (!account && isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
    }
  }, [account]);
  
  // Pause when leaving page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isPlaying) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        setIsPlaying(false);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isPlaying]);

  const startListening = async (nftId) => {
    if (!account) {
      setError('Please connect your wallet');
      return;
    }

    setLoading(true);
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::music_marketplace::start_listening`,
        arguments: [
          tx.object(MARKETPLACE_ID),
          tx.pure.id(nftId),
          tx.object(CLOCK_ID),
        ],
      });

      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: (result) => {
            setSuccess('Started listening! Rewards are accumulating...');
            const track = listedMusic.find(m => m.id === nftId);
            setCurrentSession({ nftId, startTime: Date.now(), totalSeconds: 0, pendingRewards: 0 });
            setPlayingTrack(track);
            setIsPlaying(true);
            setListeningTime(0);
            setPendingRewards(0);
            
            // Play audio
            if (audioRef.current && track?.audioUrl) {
              audioRef.current.src = track.audioUrl;
              audioRef.current.play().catch(err => {
                console.error('Audio play error:', err);
                setError('Failed to play audio. Please check the music URL.');
              });
            }
            
            fetchListedMusic();
          },
          onError: (error) => {
            setError(error.message || 'Failed to start listening');
          },
        }
      );
    } catch (err) {
      setError(err.message || 'Failed to start listening');
    } finally {
      setLoading(false);
    }
  };

  const updateListening = async () => {
    if (!currentSession) return;

    setLoading(true);
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::music_marketplace::update_listening`,
        arguments: [
          tx.object(MARKETPLACE_ID),
          tx.pure.u64(10), // Update with 10 seconds increment
          tx.object(CLOCK_ID),
        ],
      });

      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: () => {
            setSuccess('Listening time updated!');
            checkActiveSession();
          },
          onError: (error) => {
            setError(error.message || 'Failed to update listening');
          },
        }
      );
    } catch (err) {
      setError(err.message || 'Failed to update listening');
    } finally {
      setLoading(false);
    }
  };

  const claimAndStop = async () => {
    if (!currentSession) return;

    setLoading(true);
    try {
      // First update listening time, then claim, then stop
      const tx = new Transaction();
      
      // Update listening time first
      tx.moveCall({
        target: `${PACKAGE_ID}::music_marketplace::update_listening`,
        arguments: [
          tx.object(MARKETPLACE_ID),
          tx.pure.u64(Math.floor(listeningTime)),
          tx.object(CLOCK_ID),
        ],
      });
      
      // Then claim rewards
      tx.moveCall({
        target: `${PACKAGE_ID}::music_marketplace::claim_rewards`,
        arguments: [tx.object(MARKETPLACE_ID)],
      });
      
      // Then stop listening
      tx.moveCall({
        target: `${PACKAGE_ID}::music_marketplace::stop_listening`,
        arguments: [tx.object(MARKETPLACE_ID)],
      });

      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: () => {
            setSuccess(`Claimed ${pendingRewards.toFixed(8)} SUI and ended session!`);
            setCurrentSession(null);
            setPlayingTrack(null);
            setIsPlaying(false);
            setListeningTime(0);
            setPendingRewards(0);
            
            // Stop audio
            if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
            }
            
            // Refresh to see updated pool balance
            setTimeout(() => {
              fetchListedMusic();
            }, 2000);
          },
          onError: (error) => {
            setError(error.message || 'Failed to claim and stop');
          },
        }
      );
    } catch (err) {
      setError(err.message || 'Failed to claim and stop');
    } finally {
      setLoading(false);
    }
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(err => console.error('Audio play error:', err));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Hidden audio player */}
      <audio ref={audioRef} loop />
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl p-4 border border-purple-500/30">
          <div className="flex items-center gap-3">
            <Music className="w-8 h-8 text-purple-400" />
            <div>
              <div className="text-sm text-gray-400">Total Music</div>
              <div className="text-2xl font-bold text-white">{marketplaceStats.totalMusic}</div>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl p-4 border border-blue-500/30">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-blue-400" />
            <div>
              <div className="text-sm text-gray-400">Total Listens</div>
              <div className="text-2xl font-bold text-white">{marketplaceStats.totalListens}</div>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl p-4 border border-green-500/30">
          <div className="flex items-center gap-3">
            <Award className="w-8 h-8 text-green-400" />
            <div>
              <div className="text-sm text-gray-400">Total Distributed</div>
              <div className="text-xl font-bold text-white">{marketplaceStats.totalRewards.toFixed(8)} SUI</div>
              <div className="text-xs text-gray-500">{(marketplaceStats.totalRewards * 1_000_000_000).toFixed(0)} MIST</div>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 rounded-xl p-4 border border-yellow-500/30">
          <div className="flex items-center gap-3">
            <Coins className="w-8 h-8 text-yellow-400" />
            <div>
              <div className="text-sm text-gray-400">Reward Pool</div>
              <div className="text-xl font-bold text-white">{marketplaceStats.poolBalance.toFixed(8)} SUI</div>
              <div className="text-xs text-gray-500">{(marketplaceStats.poolBalance * 1_000_000_000).toFixed(0)} MIST</div>
            </div>
          </div>
        </div>
      </div>

      {/* Current Session */}
      {currentSession && (
        <div className="bg-gradient-to-r from-purple-600/30 to-blue-600/30 rounded-xl p-6 border border-purple-500/30">
          <h3 className="text-xl font-bold text-white mb-4">Current Session</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-black/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Listening Time</span>
              </div>
              <div className="text-2xl font-bold text-white">{formatTime(listeningTime)}</div>
            </div>
            <div className="bg-black/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Coins className="w-4 h-4" />
                <span className="text-sm">Pending Rewards</span>
              </div>
              <div className="text-2xl font-bold text-yellow-400">{pendingRewards.toFixed(8)} SUI</div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={updateListening}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-semibold disabled:opacity-50"
              >
                Update Time
              </button>
              <button
                onClick={claimAndStop}
                disabled={loading || pendingRewards === 0}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-semibold disabled:opacity-50"
              >
                Claim & End Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Now Playing */}
      {playingTrack && (
        <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
          <h3 className="text-xl font-bold text-white mb-4">Now Playing</h3>
          <div className="flex items-center gap-4">
            <img src={playingTrack.image} alt={playingTrack.title} className="w-24 h-24 rounded-lg object-cover" />
            <div className="flex-1">
              <h4 className="text-2xl font-bold text-white">{playingTrack.title}</h4>
              <p className="text-gray-400">{playingTrack.artist}</p>
              <p className="text-sm text-purple-400 mt-2">Earning 0.0000001 SUI per second</p>
            </div>
            <button
              onClick={togglePlayPause}
              className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-full"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>
          </div>
        </div>
      )}

      {/* Available Music */}
      <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Available Music</h3>
          <button
            onClick={fetchListedMusic}
            disabled={loading}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
        
        {!account ? (
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <p className="text-gray-400">Connect your wallet to start listening</p>
          </div>
        ) : listedMusic.length === 0 ? (
          <div className="text-center py-12">
            <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No music listed yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {listedMusic.map((track) => (
              <div key={track.id} className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors border border-white/10">
                <img 
                  src={track.image} 
                  alt={track.title} 
                  className="w-full h-48 object-cover rounded-lg mb-3"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/300?text=No+Image';
                  }}
                />
                <h4 className="font-bold text-white mb-1">{track.title}</h4>
                <p className="text-sm text-gray-400 mb-1">{track.artist}</p>
                {track.description && (
                  <p className="text-xs text-gray-500 mb-2 line-clamp-2">{track.description}</p>
                )}
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>🎧 {track.totalListens} plays</span>
                  <span>⏱️ {Math.floor(track.totalListenTime / 60)}m</span>
                </div>
                <button
                  onClick={() => startListening(track.id)}
                  disabled={loading || currentSession !== null}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  {currentSession ? 'Already Listening' : 'Start Listening'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* How it Works */}
      <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
        <h3 className="text-xl font-bold text-white mb-4">How It Works</h3>
        <div className="space-y-3 text-gray-300">
          <div className="flex items-start gap-3">
            <div className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">1</div>
            <div>
              <p className="font-semibold text-white">Start Listening</p>
              <p className="text-sm">Click on any music track to start your session</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">2</div>
            <div>
              <p className="font-semibold text-white">Earn Rewards</p>
              <p className="text-sm">Earn 0.0000001 SUI per second (100 MIST/second)</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">3</div>
            <div>
              <p className="font-semibold text-white">Claim Anytime</p>
              <p className="text-sm">Claim your rewards whenever you want and keep listening</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}