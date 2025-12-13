import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Plus, Library, Sparkles, Upload, Music, Headphones, Home, ArrowLeft, CheckCircle, Loader, AlertCircle, Users, Layers, Settings, ChevronDown } from 'lucide-react';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import AudiobookUploader from './AudiobookUploader';
import AudiobookLibrary from './AudiobookLibrary';
import AudiobookPlayer from './AudiobookPlayer';
import AudiobookDetailView from './AudiobookDetailView';

const AudiobookPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('library'); // 'library' or 'upload'
  const [selectedAudiobook, setSelectedAudiobook] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [summary, setSummary] = useState({ total: 0, processing: 0, completed: 0, processingList: [] });
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef(null);
  const settingsBtnRef = useRef(null);
  const seriesBtnRef = useRef(null);
  const collectionsBtnRef = useRef(null);
  const authorsBtnRef = useRef(null);
  const narratorsBtnRef = useRef(null);
  const prefsBtnRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const loadSummary = async () => {
      try {
        const resp = await api.get('/audiobook/library');
        const audiobooks = resp.data.audiobooks || [];
        const total = audiobooks.length;
        const processingList = audiobooks.filter(ab => ab.status === 'processing');
        const processing = processingList.length;
        const completed = audiobooks.filter(ab => ab.status === 'completed').length;

        if (mounted) {
          setSummary({ total, processing, completed, processingList });
        }
      } catch (err) {
        // ignore summary errors silently
        console.error('Failed to load audiobook summary', err);
      }
    };

    loadSummary();
    const interval = setInterval(loadSummary, 5000);
    // click-outside / Escape for settings dropdown
    const onDocClick = (e) => {
      if (settingsRef.current && settingsBtnRef.current) {
        if (!settingsRef.current.contains(e.target) && !settingsBtnRef.current.contains(e.target)) {
          setShowSettings(false);
        }
      }
    };

    const onKey = (e) => {
      if (e.key === 'Escape') setShowSettings(false);
    };

    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      mounted = false;
      clearInterval(interval);
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // when settings open, focus first item; simple focus trap inside menu
  useEffect(() => {
    if (showSettings) {
      // focus first button
      setTimeout(() => {
        if (seriesBtnRef.current) seriesBtnRef.current.focus();
      }, 0);
    }
  }, [showSettings]);

  const handleUploadSuccess = (audiobook) => {
    setActiveTab('library');
  };

  const handleSelectAudiobook = async (audiobook) => {
    // Show detail view for any audiobook (processing or completed)
    setSelectedAudiobook(audiobook);
    setShowDetailView(true);
  };

  const handleBackFromDetail = () => {
    setShowDetailView(false);
    setSelectedAudiobook(null);
  };

  const handlePlayChapter = (audiobook, chapterNumber) => {
    if (audiobook.status === 'completed') {
      setSelectedAudiobook({ ...audiobook, startChapter: chapterNumber });
      setShowPlayer(true);
      setShowDetailView(false);
    }
  };

  const handleClosePlayer = () => {
    setShowPlayer(false);
    setSelectedAudiobook(null);
  };

  // Show detail view if an audiobook is selected
  if (showDetailView && selectedAudiobook) {
    return (
      <AudiobookDetailView
        audiobook={selectedAudiobook}
        onBack={handleBackFromDetail}
        onPlayChapter={handlePlayChapter}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-purple-900 to-slate-900 flex flex-col relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Glassmorphism Header */}
      <div className="w-full p-4 relative z-10">
        <div className="max-w-7xl mx-auto bg-white/5 backdrop-blur-xl rounded-2xl px-4 py-3 border border-white/10 shadow-2xl shadow-purple-500/20">
          <div className="flex items-center justify-between">
            {/* Logo Section */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="group relative p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-400/50 transition-all duration-300"
                title="Back to Home"
              >
                <Home className="w-5 h-5 text-purple-300 group-hover:text-white transition-colors" />
              </button>
              
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur-lg opacity-75"></div>
                <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-purple-500 flex items-center justify-center shadow-2xl">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Audiobook Studio
                </h1>
                <p className="text-xs text-purple-300/80">Transform text into voice</p>
              </div>
            </div>

            {/* Tab Navigation (compact) */}
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setActiveTab('library')}
                className={`group relative px-3 py-2 rounded-lg font-semibold text-sm transition-all duration-300 overflow-hidden ${
                  activeTab === 'library' ? 'text-white' : 'text-purple-300 hover:text-white'
                }`}
                title="My Library"
              >
                {activeTab === 'library' && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg"></div>
                  </>
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Library className="w-4 h-4" />
                  <span className="hidden sm:inline">My Library</span>
                </span>
              </button>

              <button
                onClick={() => setActiveTab('upload')}
                className={`group relative px-3 py-2 rounded-lg font-semibold text-sm transition-all duration-300 overflow-hidden ${
                  activeTab === 'upload' ? 'text-white' : 'text-purple-300 hover:text-white'
                }`}
                title="Upload New"
              >
                {activeTab === 'upload' && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-purple-600 rounded-lg"></div>
                  </>
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline">Upload</span>
                </span>
              </button>
            </div>

            {/* Icon features removed from top bar; accessible via Settings only */}

            {/* Settings dropdown toggle */}
            <div className="relative ml-2">
              <button
                ref={settingsBtnRef}
                onClick={() => setShowSettings(s => !s)}
                title="Settings"
                className="p-2 rounded-md bg-white/3 hover:bg-white/10 text-purple-200 flex items-center gap-1"
                aria-haspopup="true"
                aria-expanded={showSettings}
              >
                <Settings className="w-4 h-4" />
                <ChevronDown className="w-3 h-3" />
              </button>

              {showSettings && (
                <div
                  ref={settingsRef}
                  onMouseDown={(e) => e.stopPropagation()}
                  role="menu"
                  aria-label="Audiobook settings"
                  onKeyDown={(e) => {
                    // basic focus trap: if Tab from last, go to first; if Shift+Tab from first, go to last
                    const focusable = [seriesBtnRef.current, collectionsBtnRef.current, authorsBtnRef.current, narratorsBtnRef.current, prefsBtnRef.current].filter(Boolean);
                    if (e.key === 'Tab' && focusable.length) {
                      const first = focusable[0];
                      const last = focusable[focusable.length - 1];
                      if (!e.shiftKey && document.activeElement === last) {
                        e.preventDefault();
                        first.focus();
                      } else if (e.shiftKey && document.activeElement === first) {
                        e.preventDefault();
                        last.focus();
                      }
                    }
                    if (e.key === 'Escape') setShowSettings(false);
                  }}
                  className="absolute right-0 mt-2 w-56 rounded-lg bg-white/5 backdrop-blur-md border border-white/10 shadow-lg z-20 overflow-hidden"
                >
                  <div className="flex flex-col py-1">
                    <button ref={seriesBtnRef} role="menuitem" aria-label="Series" onMouseDown={(e) => e.stopPropagation()} onClick={() => { setShowSettings(false); navigate('/audiobooks/series'); }} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-white/6 text-sm text-white/90">
                      <span className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-purple-200" /><span>Series</span></span>
                      <CheckCircle className="w-4 h-4 text-green-300" />
                    </button>

                    <button ref={collectionsBtnRef} role="menuitem" aria-label="Collections" onMouseDown={(e) => e.stopPropagation()} onClick={() => { setShowSettings(false); console.log('Settings: Collections clicked'); setTimeout(() => navigate('/audiobooks/collections'), 10); }} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-white/6 text-sm text-white/90">
                      <span className="flex items-center gap-2"><Layers className="w-4 h-4 text-purple-200" /><span>Collections</span></span>
                      <CheckCircle className="w-4 h-4 text-green-300" />
                    </button>

                    <button ref={authorsBtnRef} role="menuitem" aria-label="Authors" onMouseDown={(e) => e.stopPropagation()} onClick={() => { setShowSettings(false); console.log('Settings: Authors clicked'); setTimeout(() => navigate('/audiobooks/authors'), 10); }} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-white/6 text-sm text-white/90">
                      <span className="flex items-center gap-2"><Users className="w-4 h-4 text-purple-200" /><span>Authors</span></span>
                      <CheckCircle className="w-4 h-4 text-green-300" />
                    </button>

                    <button ref={narratorsBtnRef} role="menuitem" aria-label="Narrators" onMouseDown={(e) => e.stopPropagation()} onClick={() => { setShowSettings(false); console.log('Settings: Narrators clicked'); setTimeout(() => navigate('/audiobooks/narrators'), 10); }} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-white/6 text-sm text-white/90">
                      <span className="flex items-center gap-2"><Headphones className="w-4 h-4 text-purple-200" /><span>Narrators</span></span>
                      <CheckCircle className="w-4 h-4 text-green-300" />
                    </button>

                    <div className="border-t border-white/5 mt-1" />
                    <button ref={prefsBtnRef} role="menuitem" aria-label="Preferences" onMouseDown={(e) => e.stopPropagation()} onClick={() => { setShowSettings(false); console.log('Settings: Preferences clicked'); setTimeout(() => navigate('/audiobooks/preferences'), 10); }} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-white/6 text-sm text-white/90">
                      <span className="flex items-center gap-2"><Settings className="w-4 h-4 text-purple-200" /><span>Preferences</span></span>
                      <CheckCircle className="w-4 h-4 text-green-300" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Compact summary badges on the right (fit into the same bar) */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white/3 px-2 py-1 rounded-md text-xs text-white/90">
                <Music className="w-4 h-4 text-purple-200" />
                <span className="font-medium">{summary.total}</span>
                <span className="text-[10px] text-purple-200/70 ml-1 hidden sm:inline">total</span>
              </div>

              <div className="flex items-center gap-2 bg-white/3 px-2 py-1 rounded-md text-xs text-white/90">
                <Loader className="w-4 h-4 text-yellow-300 animate-spin" />
                <span className="font-medium">{summary.processing}</span>
                <span className="text-[10px] text-yellow-200/70 ml-1 hidden sm:inline">processing</span>
              </div>

              <div className="flex items-center gap-2 bg-white/3 px-2 py-1 rounded-md text-xs text-white/90">
                <CheckCircle className="w-4 h-4 text-green-300" />
                <span className="font-medium">{summary.completed}</span>
                <span className="text-[10px] text-green-200/70 ml-1 hidden sm:inline">ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative z-10 px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div>
            {activeTab === 'library' && (
              <AudiobookLibrary onSelectAudiobook={handleSelectAudiobook} />
            )}

            {activeTab === 'upload' && (
              <AudiobookUploader onUploadSuccess={handleUploadSuccess} />
            )}
          </div>
        </div>
      </div>

      {/* Player Modal */}
      {showPlayer && selectedAudiobook && (
        <AudiobookPlayer
          audiobook={selectedAudiobook}
          onClose={handleClosePlayer}
        />
      )}

      {/* Feature Cards moved to top navigation - removed duplicate section */}
    </div>
  );
};

export default AudiobookPage;
