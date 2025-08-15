// components/LeaderboardPage.tsx
import React, { useState, useEffect } from 'react';
import { Trophy, Loader2 } from 'lucide-react';
import { ScavengerAPI } from '../api';
import type { LeaderboardEntry } from '../types';
import { formatTime, maskPhoneNumber } from '../utils';

interface LeaderboardPageProps {
  currentUserPhone: string;
  onPlayAgain: () => void;
}

const LeaderboardPage: React.FC<LeaderboardPageProps> = ({ 
  currentUserPhone, 
  onPlayAgain 
}) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const data = await ScavengerAPI.getLeaderboard();

        if (Array.isArray(data)) {
          setLeaderboard(data);
        } else {
          setError('Failed to load leaderboard');
        }
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return '🥇';
      case 1:
        return '🥈';
      case 2:
        return '🥉';
      default:
        return `${index + 1}`;
    }
  };

  const getRankBgColor = (index: number) => {
    switch (index) {
      case 0:
        return 'bg-yellow-500 text-white';
      case 1:
        return 'bg-gray-400 text-white';
      case 2:
        return 'bg-orange-500 text-white';
      default:
        return 'bg-gray-200 text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={onPlayAgain}
            className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-center mb-6">
            <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800">Leaderboard</h2>
            <p className="text-gray-600">Top Hunters</p>
          </div>
          
          {leaderboard.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No entries yet. Be the first!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboard.slice(0, 10).map((entry, index) => {
                const isCurrentUser = entry.phone === currentUserPhone;
                
                return (
                  <div 
                    key={`${entry.phone}-${entry.completedAt}`} 
                    className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                      isCurrentUser 
                        ? 'bg-orange-100 border-2 border-orange-300 shadow-md' 
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3 ${
                        getRankBgColor(index)
                      }`}>
                        {typeof getRankIcon(index) === 'string' && getRankIcon(index).length > 2 
                          ? getRankIcon(index) 
                          : <span className="text-xs">{getRankIcon(index)}</span>
                        }
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">
                          {isCurrentUser ? 'You' : maskPhoneNumber(entry.phone)}
                        </div>
                        <div className="text-sm text-gray-500">{entry.tier} Tier</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-gray-800">{formatTime(entry.time)}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(entry.completedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          <div className="mt-6 space-y-3">
            <button 
              onClick={onPlayAgain}
              className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
            >
              Play Again
            </button>
            
            <p className="text-center text-xs text-gray-500">
              Rankings update every few minutes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;