import React, { useState } from 'react';
import { Music, User, Library } from 'lucide-react';

export default function MusicTabs({ 
  listedMusic, 
  myMusic, 
  currentSession, 
  loading, 
  startListening,
  playWithoutRewards,
  account  
}) {
  const [activeTab, setActiveTab] = useState('public'); // 'public' or 'private'

  const renderMusicGrid = (musicList) => {
    if (musicList.length === 0) {
      return (
        <div className="text-center py-12">
          <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">
            {activeTab === 'private' 
              ? 'You don\'t own any music NFTs yet' 
              : 'No music available'}
          </p>
        </div>
      );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {musicList.map((track) => (
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
                {activeTab === 'public' || listedMusic.some(m => m.id === track.id) ? (
                <button
                    onClick={() => startListening(track.id)}
                    disabled={loading || currentSession !== null}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    <Music className="w-4 h-4" />
                    {currentSession ? 'Already Listening' : 'Start Listening & Earn'}
                </button>
                ) : (
                <div className="space-y-2">
                    <button
                    onClick={() => playWithoutRewards(track)}
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                    <Music className="w-4 h-4" />
                    Play (No Rewards)
                    </button>
                    <p className="text-xs text-yellow-400 text-center">
                    💡 List on marketplace to earn SUI while listening
                    </p>
                </div>
                )}
            </div>
            ))}
        </div>
    );
  };

  return (
    <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
      {/* Tab Header */}
      <div className="flex items-center gap-4 mb-6 border-b border-white/10">
        <button
          onClick={() => setActiveTab('public')}
          className={`flex items-center gap-2 px-4 py-3 font-semibold transition-all relative ${
            activeTab === 'public'
              ? 'text-purple-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Library className="w-5 h-5" />
          Public Library
          {activeTab === 'public' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400" />
          )}
        </button>
        
        <button
          onClick={() => setActiveTab('private')}
          className={`flex items-center gap-2 px-4 py-3 font-semibold transition-all relative ${
            activeTab === 'private'
              ? 'text-blue-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <User className="w-5 h-5" />
          My Collection
          {activeTab === 'private' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />
          )}
        </button>

        <div className="ml-auto">
          <span className="text-sm text-gray-400">
            {activeTab === 'public' ? listedMusic.length : myMusic.length} tracks
          </span>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {!account ? (
          <div className="text-center py-12">
            <User className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <p className="text-gray-400">Connect your wallet to view music</p>
          </div>
        ) : (
          renderMusicGrid(activeTab === 'public' ? listedMusic : myMusic)
        )}
      </div>
    </div>
  );
}