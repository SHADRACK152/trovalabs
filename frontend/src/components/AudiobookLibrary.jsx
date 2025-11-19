import React, { useState, useEffect, useRef } from 'react';
import { Book, Play, Trash2, Download, Clock, CheckCircle, Loader } from 'lucide-react';
import { api } from '../services/api';

const AudiobookLibrary = ({ onSelectAudiobook }) => {
  const [audiobooks, setAudiobooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingIds, setProcessingIds] = useState(new Set());
  const pollingIntervalRef = useRef(null);

  useEffect(() => {
    loadAudiobooks();
    
    return () => {
      // Cleanup interval on unmount
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []); // Only load once on mount

  useEffect(() => {
    // Start polling if there are processing audiobooks
    if (processingIds.size > 0 && !pollingIntervalRef.current) {
      pollingIntervalRef.current = setInterval(() => {
        loadAudiobooks();
      }, 5000); // Poll every 5 seconds
    }
    
    // Stop polling if no processing audiobooks
    if (processingIds.size === 0 && pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, [processingIds.size]);

  const loadAudiobooks = async () => {
    try {
      // Don't show loading spinner on background refreshes
      if (audiobooks.length === 0) {
        setLoading(true);
      }
      const response = await api.get('/audiobook/library');
      setAudiobooks(response.data.audiobooks);
      
      // Track which audiobooks are processing
      const processing = new Set();
      response.data.audiobooks.forEach(ab => {
        if (ab.status === 'processing') {
          processing.add(ab.audiobook_id);
        }
      });
      setProcessingIds(processing);
    } catch (err) {
      console.error('Error loading audiobooks:', err);
      console.error('Error details:', err.response?.data || err.message);
      setError(err.response?.data?.detail || 'Failed to load audiobooks. Please make sure you are logged in.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (audiobookId, e) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this audiobook?')) {
      return;
    }

    try {
      await api.delete(`/audiobook/${audiobookId}`);
      setAudiobooks(audiobooks.filter(ab => ab.audiobook_id !== audiobookId));
    } catch (err) {
      console.error('Error deleting audiobook:', err);
      alert('Failed to delete audiobook');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: {
        label: 'Pending',
        icon: Clock,
        color: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30',
      },
      processing: {
        label: 'Processing',
        icon: Loader,
        color: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
      },
      completed: {
        label: 'Ready',
        icon: CheckCircle,
        color: 'bg-green-500/20 text-green-300 border-green-400/30',
      },
      failed: {
        label: 'Failed',
        icon: Clock,
        color: 'bg-red-500/20 text-red-300 border-red-400/30',
      },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold backdrop-blur-xl border ${config.color}`}>
        <Icon className={`w-3 h-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 backdrop-blur-xl border border-red-400/30 text-red-300 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  if (audiobooks.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-12 border border-white/10">
          <Book className="w-16 h-16 mx-auto text-purple-400 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            No audiobooks yet
          </h3>
          <p className="text-purple-200/70">
            Upload your first novel or story to get started!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-8">
        My Audiobooks
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {audiobooks.map((audiobook) => (
          <div
            key={audiobook.audiobook_id}
            className="group bg-white/5 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/10 hover:border-purple-400/50 transition-all cursor-pointer shadow-xl hover:shadow-purple-500/50 hover:scale-105 duration-300"
            onClick={() => onSelectAudiobook && onSelectAudiobook(audiobook)}
          >
            {/* Cover/Header */}
            <div className="relative bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-purple-500/20 p-6 border-b border-white/10">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 to-pink-600/30 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Book className="w-6 h-6 text-white" />
                  </div>
                  {getStatusBadge(audiobook.status)}
                </div>
                <h3 className="text-xl font-bold mb-1 line-clamp-2 text-white group-hover:text-purple-300 transition-colors">
                  {audiobook.title}
                </h3>
                <p className="text-purple-200/70 text-sm">
                  {audiobook.author}
                </p>
              </div>
            </div>

            {/* Details */}
            <div className="p-4 space-y-3">
              {/* Progress Bar for Processing */}
              {audiobook.status === 'processing' && (
                <div className="space-y-2 bg-purple-500/10 rounded-lg p-3 border border-purple-400/20">
                  <div className="flex justify-between text-xs text-purple-200">
                    <span>
                      Chapter {audiobook.current_chapter || 0} / {audiobook.total_chapters_to_process || audiobook.chapter_count}
                    </span>
                    <span className="font-bold">
                      {Math.round(((audiobook.current_chapter || 0) / (audiobook.total_chapters_to_process || audiobook.chapter_count)) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500 shadow-lg shadow-purple-500/50"
                      style={{
                        width: `${((audiobook.current_chapter || 0) / (audiobook.total_chapters_to_process || audiobook.chapter_count)) * 100}%`,
                      }}
                    />
                  </div>
                  {audiobook.processing_message && (
                    <p className="text-xs text-purple-300/80 truncate">
                      {audiobook.processing_message}
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-sm text-purple-200/70">
                <span>{audiobook.chapter_count} chapters</span>
                <span>{(audiobook.character_count / 1000).toFixed(1)}k chars</span>
              </div>

              <div className="text-xs text-purple-200/50">
                Created {formatDate(audiobook.created_at)}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {audiobook.status === 'completed' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAudiobook && onSelectAudiobook(audiobook);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-purple-500/50"
                  >
                    <Play className="w-4 h-4" />
                    Listen
                  </button>
                )}
                
                {audiobook.status === 'processing' && (
                  <button
                    disabled
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/10 text-purple-300/50 rounded-lg cursor-not-allowed"
                  >
                    <Loader className="w-4 h-4 animate-spin" />
                    Processing...
                  </button>
                )}

                {audiobook.status === 'pending' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onSelectAudiobook && onSelectAudiobook(audiobook); }}
                    className="flex-1 px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-blue-500/50"
                  >
                    Start Listening
                  </button>
                )}

                <button
                  onClick={(e) => handleDelete(audiobook.audiobook_id, e)}
                  className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors border border-transparent hover:border-red-400/30"
                  title="Delete audiobook"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AudiobookLibrary;
