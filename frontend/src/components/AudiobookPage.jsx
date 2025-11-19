import React, { useState } from 'react';
import { BookOpen, Plus, Library, Sparkles, Upload, Music, Headphones, Home, ArrowLeft } from 'lucide-react';
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
      <div className="w-full p-6 relative z-10">
        <div className="max-w-7xl mx-auto bg-white/5 backdrop-blur-xl rounded-2xl px-6 py-4 border border-white/10 shadow-2xl shadow-purple-500/20">
          <div className="flex items-center justify-between">
            {/* Logo Section */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="group relative p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-400/50 transition-all duration-300"
                title="Back to Home"
              >
                <Home className="w-5 h-5 text-purple-300 group-hover:text-white transition-colors" />
              </button>
              
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur-lg opacity-75"></div>
                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-purple-500 flex items-center justify-center shadow-2xl">
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Audiobook Studio
                </h1>
                <p className="text-sm text-purple-300/80">Transform text into voice</p>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-3">
              <button
                onClick={() => setActiveTab('library')}
                className={`group relative px-6 py-3 rounded-xl font-semibold transition-all duration-300 overflow-hidden ${
                  activeTab === 'library'
                    ? 'text-white'
                    : 'text-purple-300 hover:text-white'
                }`}
              >
                {activeTab === 'library' && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 blur-xl opacity-75"></div>
                  </>
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Library className="w-5 h-5" />
                  My Library
                </span>
              </button>
              
              <button
                onClick={() => setActiveTab('upload')}
                className={`group relative px-6 py-3 rounded-xl font-semibold transition-all duration-300 overflow-hidden ${
                  activeTab === 'upload'
                    ? 'text-white'
                    : 'text-purple-300 hover:text-white'
                }`}
              >
                {activeTab === 'upload' && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-purple-600"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-purple-600 blur-xl opacity-75"></div>
                  </>
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload New
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative z-10 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'library' && (
            <AudiobookLibrary onSelectAudiobook={handleSelectAudiobook} />
          )}

          {activeTab === 'upload' && (
            <AudiobookUploader onUploadSuccess={handleUploadSuccess} />
          )}
        </div>
      </div>

      {/* Player Modal */}
      {showPlayer && selectedAudiobook && (
        <AudiobookPlayer
          audiobook={selectedAudiobook}
          onClose={handleClosePlayer}
        />
      )}

      {/* Feature Cards Section */}
      <div className="relative z-10 px-4 sm:px-6 lg:px-8 pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="group bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-purple-400/50 transition-all shadow-xl hover:shadow-purple-500/50 hover:scale-105 duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/50 group-hover:scale-110 transition-transform">
                  <Upload className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">
                  Upload Any Format
                </h3>
                <p className="text-purple-200/80 text-sm leading-relaxed">
                  Support for PDF, TXT, EPUB, and DOCX files up to 50MB
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-pink-400/50 transition-all shadow-xl hover:shadow-pink-500/50 hover:scale-105 duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-500 to-pink-700 flex items-center justify-center mb-4 shadow-lg shadow-pink-500/50 group-hover:scale-110 transition-transform">
                  <Music className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-pink-400 transition-colors">
                  AI-Powered Voices
                </h3>
                <p className="text-pink-200/80 text-sm leading-relaxed">
                  Natural-sounding narration with multiple voice options
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-blue-400/50 transition-all shadow-xl hover:shadow-blue-500/50 hover:scale-105 duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/50 group-hover:scale-110 transition-transform">
                  <Headphones className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                  Listen Anywhere
                </h3>
                <p className="text-blue-200/80 text-sm leading-relaxed">
                  Record chapters as you listen and share with friends
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudiobookPage;
