import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Book, Play, Download, Clock, CheckCircle, Loader, Volume2, FileText, Radio } from 'lucide-react';
import { api } from '../services/api';
import AudiobookStreamPlayer from './AudiobookStreamPlayer';

const AudiobookDetailView = ({ audiobook, onBack, onPlayChapter }) => {
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentAudiobook, setCurrentAudiobook] = useState(audiobook);
  const [showStreamPlayer, setShowStreamPlayer] = useState(false);
  const [streamStartChapter, setStreamStartChapter] = useState(1);
  const [forceBrowserTTS, setForceBrowserTTS] = useState(false);
  const pollingIntervalRef = useRef(null);
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    loadChapterDetails();
    
    // Auto-refresh every 5 seconds if processing
    if (currentAudiobook.status === 'processing') {
      pollingIntervalRef.current = setInterval(() => {
        loadChapterDetails();
      }, 5000);
    }
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [audiobook.audiobook_id, currentAudiobook.status]);

  const loadChapterDetails = async () => {
    try {
      // Only show loading spinner on initial load, not on background refreshes
      if (isInitialLoadRef.current) {
        setLoading(true);
      }
      
      const response = await api.get(`/audiobook/${audiobook.audiobook_id}`);
      
      // Update current audiobook data
      setCurrentAudiobook(response.data);
      
      // Create chapter list with actual titles from backend
      const chapterList = [];
      const backendChapters = response.data.chapters || [];
      
      for (let i = 1; i <= response.data.chapter_count; i++) {
        const chapterData = backendChapters[i - 1];
        chapterList.push({
          number: i,
          status: i <= (response.data.current_chapter || 0) ? 'completed' : 'pending',
          title: chapterData?.title || `Chapter ${i}`
        });
      }
      setChapters(chapterList);
    } catch (err) {
      console.error('Error loading chapter details:', err);
    } finally {
      if (isInitialLoadRef.current) {
        setLoading(false);
        isInitialLoadRef.current = false;
      }
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'processing':
        return <Loader className="w-5 h-5 text-blue-400 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const handlePlayChapter = (chapterNumber) => {
    // Use streaming player for real-time playback
    setStreamStartChapter(chapterNumber);
    setForceBrowserTTS(false);
    setShowStreamPlayer(true);
  };

  const handleStreamFromBeginning = () => {
    setStreamStartChapter(1);
    setForceBrowserTTS(false);
    setShowStreamPlayer(true);
  };

  const handleReadWithBrowser = (chapterNumber) => {
    setStreamStartChapter(chapterNumber || 1);
    setForceBrowserTTS(true);
    setShowStreamPlayer(true);
  };

  const getProgressPercentage = () => {
    return Math.round(((currentAudiobook.current_chapter || 0) / currentAudiobook.chapter_count) * 100);
  };

  return (
    <>
      {/* Stream Player Modal */}
      {showStreamPlayer && (
        <AudiobookStreamPlayer
          audiobook={currentAudiobook}
          startChapter={streamStartChapter}
          forceAvoidServerGeneration={forceBrowserTTS}
          onClose={() => setShowStreamPlayer(false)}
        />
      )}

      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-xl border-b border-white/10 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-400/50 transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-purple-300" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {audiobook.title}
              </h1>
              <p className="text-purple-300/80 text-sm">by {audiobook.author}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Book Info Card */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 mb-8">
          <div className="flex items-start gap-6">
            {/* Book Cover/Icon */}
            <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-2xl">
              <Book className="w-16 h-16 text-white" />
            </div>

            {/* Book Details */}
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">{currentAudiobook.title}</h2>
                <p className="text-purple-300 text-lg">by {currentAudiobook.author}</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-400/20">
                  <div className="text-purple-200/70 text-xs mb-1">Total Chapters</div>
                  <div className="text-white font-bold text-xl">{currentAudiobook.chapter_count}</div>
                </div>
                <div className="bg-pink-500/10 rounded-lg p-3 border border-pink-400/20">
                  <div className="text-pink-200/70 text-xs mb-1">Completed</div>
                  <div className="text-white font-bold text-xl">{currentAudiobook.current_chapter || 0}</div>
                </div>
                <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-400/20">
                  <div className="text-blue-200/70 text-xs mb-1">Characters</div>
                  <div className="text-white font-bold text-xl">
                    {currentAudiobook.total_chars ? (currentAudiobook.total_chars / 1000).toFixed(1) + 'k' : 'N/A'}
                  </div>
                </div>
                <div className="bg-green-500/10 rounded-lg p-3 border border-green-400/20">
                  <div className="text-green-200/70 text-xs mb-1">Progress</div>
                  <div className="text-white font-bold text-xl">{getProgressPercentage()}%</div>
                </div>
              </div>

              {/* Start Listening Button */}
              <button
                onClick={handleStreamFromBeginning}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-purple-500/50 transition-all hover:scale-[1.02] flex items-center justify-center gap-3"
              >
                <Radio className="w-6 h-6" />
                {currentAudiobook.status === 'ready' || currentAudiobook.current_chapter === 0 
                  ? 'Start Listening Now - No Waiting!' 
                  : 'Continue Listening'}
              </button>

              <button
                onClick={() => handleReadWithBrowser(1)}
                className="ml-3 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl shadow-lg transition-all hover:scale-[1.02] flex items-center justify-center gap-3"
              >
                Read With Browser TTS
              </button>

              {/* Regenerate Chapter Titles Button */}
              <div className="mt-3">
                <button
                  onClick={async () => {
                    try {
                      setLoading(true);
                      await api.post(`/audiobook/${audiobook.audiobook_id}/generate-chapter-titles`);
                      await loadChapterDetails();
                    } catch (e) {
                      console.error('Error generating chapter titles', e);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="w-full px-4 py-2 text-sm bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 text-purple-300"
                >
                  Regenerate Chapter Titles
                </button>
              </div>

              {/* Info Message */}
              {(currentAudiobook.status === 'ready' || currentAudiobook.current_chapter === 0) && (
                <div className="bg-blue-500/10 border border-blue-400/20 rounded-xl p-4 text-center">
                  <p className="text-blue-200 text-sm">
                    🎧 AI will read aloud in real-time - No generation wait! Just click and listen.
                  </p>
                </div>
              )}

              {/* Progress Bar - Only show if chapters are being saved */}
              {currentAudiobook.current_chapter > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-purple-200">
                    <span>Chapters saved for instant replay</span>
                    <span className="font-bold">{getProgressPercentage()}%</span>
                  </div>
                  <div className="h-2 bg-purple-900/30 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                      style={{ width: `${getProgressPercentage()}%` }}
                    ></div>
                  </div>
                  <p className="text-purple-300/70 text-xs">
                    ✅ Chapters auto-save as you listen - replay anytime instantly!
                  </p>
                </div>
              )}

              {currentAudiobook.status === 'completed' && (
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">Audiobook ready!</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chapter List */}
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
            <Volume2 className="w-7 h-7 text-purple-400" />
            Chapters
            <span className="text-sm text-purple-300 font-normal">(Click any chapter to start from there)</span>
            <button
              onClick={async () => {
                try {
                  setLoading(true);
                  const res = await api.post(`/audiobook/${audiobook.audiobook_id}/generate-chapter-titles`);
                  if (res?.data) {
                    // reload chapters
                    await loadChapterDetails();
                  }
                } catch (err) {
                  console.error('Title generation failed', err);
                  alert('Failed to generate chapter titles');
                } finally {
                  setLoading(false);
                }
              }}
              className="ml-3 px-3 py-1 text-xs rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-purple-300"
            >
              Generate Titles
            </button>
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 text-purple-400 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {chapters.map((chapter) => {
                // All chapters are available for streaming
                const isAvailable = true;
                // Show which chapter is currently being saved
                const isProcessing = currentAudiobook.status === 'processing' && 
                                    chapter.number === (currentAudiobook.current_chapter || 0) + 1;
                const isCompleted = chapter.number <= (currentAudiobook.current_chapter || 0);
                
                return (
                  <div
                    key={chapter.number}
                    onClick={() => isAvailable && handlePlayChapter(chapter.number)}
                    className={`
                      group relative bg-white/5 backdrop-blur-xl rounded-xl border transition-all
                      ${isAvailable 
                        ? 'border-white/10 hover:border-purple-400/50 cursor-pointer hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/20' 
                        : 'border-white/5 opacity-50 cursor-not-allowed'
                      }
                    `}
                  >
                    <div className="flex items-center gap-4 p-4">
                      {/* Chapter Number */}
                      <div className={`
                        w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg relative
                        ${isCompleted 
                          ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white' 
                          : 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                        }
                      `}>
                        {chapter.number}
                        {isCompleted && (
                          <CheckCircle className="w-4 h-4 absolute -top-1 -right-1 text-green-400 bg-slate-900 rounded-full" />
                        )}
                      </div>

                      {/* Chapter Title */}
                      <div className="flex-1">
                        <h4 className="text-white font-semibold mb-1">{chapter.title}</h4>
                        <p className="text-purple-200/70 text-sm">
                          {isProcessing ? '🎙️ Converting & saving now...' : 
                           isCompleted ? '✅ Saved - Click to start from here' : 
                           '🎧 Click to start listening from here'}
                        </p>
                      </div>

                      {/* Status/Play Icon */}
                      <div className="flex items-center gap-3">
                        {isProcessing ? (
                          <Loader className="w-5 h-5 text-blue-400 animate-spin" />
                        ) : isAvailable ? (
                          <Play className="w-6 h-6 text-purple-400 group-hover:text-white group-hover:scale-110 transition-all" />
                        ) : (
                          <Clock className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                    </div>

                    {/* Hover Effect */}
                    {isAvailable && (
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-pink-500/0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  );
};

export default AudiobookDetailView;
