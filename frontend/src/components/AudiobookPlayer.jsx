import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Download,
  Share2,
  List,
  X,
} from 'lucide-react';
import { api } from '../services/api';

const AudiobookPlayer = ({ audiobook, onClose }) => {
  const [currentChapter, setCurrentChapter] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [serverPlayback, setServerPlayback] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showChapterList, setShowChapterList] = useState(false);
  const [chapterText, setChapterText] = useState('');
  const [ttsChunks, setTtsChunks] = useState([]);
  const [readingPosition, setReadingPosition] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [speechPitch, setSpeechPitch] = useState(1.0);

  const utteranceRef = useRef(null);
  const speechSynthesisRef = useRef(window.speechSynthesis);
  const audioRef = useRef(null);
  const chunksContainerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedAudioChunksRef = useRef([]);

  useEffect(() => {
    loadChapterText(currentChapter);
  }, [currentChapter]);

  useEffect(() => {
    // Load voice settings from localStorage
    const savedVoice = localStorage.getItem('audiobookVoice');
    const savedRate = localStorage.getItem('audiobookRate');
    const savedPitch = localStorage.getItem('audiobookPitch');
    const savedAvoidGen = localStorage.getItem('avoidServerGeneration');
    if (savedVoice) setSelectedVoice(savedVoice);
    if (savedRate) setSpeechRate(parseFloat(savedRate));
    if (savedPitch) setSpeechPitch(parseFloat(savedPitch));
    if (savedAvoidGen) setAvoidServerGeneration(savedAvoidGen === 'true');
  }, []);

  // Fetch available voices (natural + browser)
  useEffect(() => {
    const loadVoices = async () => {
      try {
        const res = await api.get('/voices');
        const natural = Object.entries(res.data.voices || {}).map(([name, info]) => ({ value: name, label: `${name} - ${info.description}`, source: 'natural' }));
        let browserVoices = [];
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          const voices = window.speechSynthesis.getVoices() || [];
          browserVoices = voices.filter(v => v.lang && v.lang.startsWith('en')).slice(0, 20).map(v => ({ value: `browser:${v.name}`, label: `${v.name} (${v.lang}) - Browser`, source: 'browser' }));
        }
        const combined = [...natural, ...browserVoices];
        if (combined.length === 0) combined.push({ value: 'lisa', label: 'Lisa - Natural, expressive', source: 'natural' });
        setAvailableVoices(combined);
      } catch (err) {
        console.error('Failed to load voices', err);
        setAvailableVoices([{ value: 'lisa', label: 'Lisa - Natural, expressive', source: 'natural' }]);
      }
    };
    loadVoices();
  }, []);

  const [avoidServerGeneration, setAvoidServerGeneration] = useState(false);

  useEffect(() => {
    // If the user explicitly opted to avoid server generation, enforce browser playback
    if (avoidServerGeneration) {
      setServerPlayback(false);
      return;
    }
    // If selected voice is a browser voice, use client-side speech synthesis; otherwise server-side audio
    if (selectedVoice && selectedVoice.startsWith('browser:')) {
      setServerPlayback(false);
      setAvoidServerGeneration(true);
    } else {
      setServerPlayback(true);
      // keep avoidServerGeneration as the user left it
    }
  }, [selectedVoice, avoidServerGeneration]);

  // If the user switches server-side voice while playback is in progress, swap the audio source
  useEffect(() => {
    if (!isPlaying || !serverPlayback || !audioRef.current) return;
    try {
      const prevTime = audioRef.current.currentTime || 0;
      const base = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const genParam = avoidServerGeneration ? 'generate=false' : 'generate=true';
      const url = `${base}/audiobook/${audiobook.audiobook_id}/chapter/${currentChapter}?${genParam}${selectedVoice && !selectedVoice.startsWith('browser:') ? `&voice=${encodeURIComponent(selectedVoice)}` : ''}`;
      if (audioRef.current.src !== url) {
        audioRef.current.pause();
        audioRef.current.src = url;
        audioRef.current.onloadedmetadata = () => {
          try { audioRef.current.currentTime = prevTime; } catch (e) {}
        };
        audioRef.current.play().catch(e => { console.warn('Playback error on voice change', e); });
      }
    } catch (e) {
      console.warn('Could not update playback on voice change', e);
    }
  }, [selectedVoice, avoidServerGeneration]);

  useEffect(() => {
    // reset simple UI state when chapter changes
    setCurrentTime(0);
    setDuration(0);
    setLoading(false);
    setError(null);
    setReadingPosition(0);
  }, [currentChapter, audiobook.chapter_count]);

  useEffect(() => {
    try {
      const el = document.getElementById(`pchunk-${readingPosition}`);
      if (el && chunksContainerRef.current) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch (e) {}
  }, [readingPosition]);

  const loadChapterText = async (chapterNum) => {
    try {
      setLoading(true);
      setError(null);
      const chapters = audiobook.chapters || [];
      const chapterData = chapters[chapterNum - 1];
      if (!chapterData) throw new Error('Chapter not found');
      const text = chapterData.content || chapterData.text || '';
      if (!text) throw new Error('Chapter has no content');

      let fullText = '';
      if (chapterNum === 1) {
        const bookTitle = audiobook.title || 'Audiobook';
        const author = audiobook.author || '';
        fullText = `${bookTitle}`;
        if (author) fullText += `, by ${author}. `;
        fullText += ` ${chapterData.title || `Chapter ${chapterNum}`}. `;
      } else {
        fullText = `${chapterData.title || `Chapter ${chapterNum}`}. `;
      }
      fullText += text;
      setChapterText(fullText);
      // split text into chunks for highlighting & progress (chunk size affects readability)
      const chunkSize2 = 200;
      const words2 = fullText.split(' ');
      let cur2 = '';
      let chunkCount = 0;
      const ttsChunksArr = [];
      for (const w of words2) {
        if (cur2.length + w.length + 1 > chunkSize2 && cur2.length > 0) { ttsChunksArr.push(cur2.trim()); chunkCount++; cur2 = w; } else { cur2 += (cur2 ? ' ' : '') + w; }
      }
      if (cur2) { ttsChunksArr.push(cur2.trim()); chunkCount++; }
      setDuration(chunkCount); // repurpose duration to represent total chunks
      setTtsChunks(ttsChunksArr);
      setLoading(false);
      setIsPlaying(false);
    } catch (err) {
      console.error('Error loading chapter text:', err);
      setError(err.message || 'Failed to load chapter');
      setLoading(false);
    }
  };

  const speakChunk = (text, rate = speechRate) => {
    return new Promise((resolve, reject) => {
      try {
        const u = new SpeechSynthesisUtterance(text);
        u.rate = Math.max(0.1, Math.min(10, rate));
        u.pitch = Math.max(0, Math.min(2, speechPitch));
        u.volume = volume;
        const voices = speechSynthesisRef.current.getVoices() || [];
        if (selectedVoice) {
          if (selectedVoice.startsWith('browser:')) {
            const browserName = selectedVoice.split(':')[1];
            const voiceObj = voices.find(v => v.name === browserName);
            if (voiceObj) u.voice = voiceObj;
            // Selected server-side voice - don't set a browser voice, use defaults
          }
        } else {
          const pref = voices.find(v => v.lang && v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Natural')));
          if (pref) u.voice = pref;
        }
        u.onend = () => resolve();
        u.onerror = (e) => reject(e);
        speechSynthesisRef.current.speak(u);
      } catch (err) { reject(err); }
    });
  };

  const speakChapter = (text) => {
    speechSynthesisRef.current.cancel();
    // Split into sentences and combine into reasonable chunks
    const chunkSize = 200;
    const sentences = text.split(/(?<=[.!?])\s+/);
    const chunks = [];
    let cur = '';
    for (const s of sentences) {
      if (cur.length + s.length + 1 > chunkSize && cur.length > 0) { chunks.push(cur.trim()); cur = s; } else { cur += (cur ? ' ' : '') + s; }
    }
    if (cur) chunks.push(cur.trim());
    setDuration(chunks.length);
    let idx = 0;
    const speakNext = async () => {
      if (idx >= chunks.length) { setIsPlaying(false); if (currentChapter < audiobook.chapter_count) setCurrentChapter(c=>c+1); return; }
      try {
        await speakChunk(chunks[idx]);
        idx++;
        setReadingPosition(idx);
        speakNext();
      } catch (err) {
        console.error('Speech error:', err);
        setError('Speech synthesis error');
        setIsPlaying(false);
      }
    };
    setIsPlaying(true);
    setReadingPosition(0);
    speakNext();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: false, audio: { sampleRate: 44100 }});
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      recordedAudioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) recordedAudioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedAudioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `${audiobook.title.replace(/[^a-z0-9]/gi,'_')}_Chapter_${currentChapter}.webm`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        setRecordedChunks([...recordedAudioChunksRef.current]);
      };
      mediaRecorder.start(); setIsRecording(true);
    } catch (err) { console.error('Recording error:', err); setError(err.message || 'Failed to start recording'); }
  };

  const stopRecording = () => { if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); setIsRecording(false); }};

  const togglePlay = () => {
    if (isPlaying) {
      if (avoidServerGeneration) {
        // Use browser TTS instead of server audio
        try { speechSynthesisRef.current.cancel(); } catch (e) {}
        speakChapter(chapterText);
        return;
      }
      if (serverPlayback) {
        if (audioRef.current) { audioRef.current.pause(); }
      } else {
        speechSynthesisRef.current.pause();
      }
      setIsPlaying(false);
    } else {
      if (serverPlayback) {
        // We rely on the server playback flow below
      } else if (speechSynthesisRef.current.paused) {
        speechSynthesisRef.current.resume();
        setIsPlaying(true);
        return;
      }
      if (chapterText) {
        // Start reading the chapter using same chunk logic as stream player
        if (serverPlayback) {
          // Play server-generated audio for this chapter; include voice override if present
          let base = import.meta.env.VITE_API_URL || 'http://localhost:8000';
          if (base.includes('5173')) base = 'http://localhost:8000';
          const genParam = avoidServerGeneration ? 'generate=false' : 'generate=true';
          const url = `${base}/audiobook/${audiobook.audiobook_id}/chapter/${currentChapter}?${genParam}${selectedVoice && !selectedVoice.startsWith('browser:') ? `&voice=${encodeURIComponent(selectedVoice)}` : ''}`;
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.volume = volume;
          audio.onended = () => { setIsPlaying(false); if (currentChapter < audiobook.chapter_count) setCurrentChapter(c=>c+1); };
          audio.ontimeupdate = () => {
            try {
              if (ttsChunks && ttsChunks.length > 0 && audio.duration && !isNaN(audio.duration)) {
                const fraction = audio.currentTime / audio.duration;
                const idx = Math.min(ttsChunks.length - 1, Math.floor(fraction * ttsChunks.length));
                setReadingPosition(idx);
              }
            } catch (e) {}
          };
          audio.onerror = (e) => { setError('Playback error'); setIsPlaying(false); };
          const playPromise = audio.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch((err) => {
              console.warn('Audio play() error:', err);
              setError('Playback error');
              setIsPlaying(false);
            });
          }
          setIsPlaying(true);
          return;
        }
        const startReading = async () => {
          // reuse logic from AudiobookStreamPlayer by creating utterances in chunks
          const words = chapterText.split(' ');
          const chunkSize = 200;
          const chunks = [];
          let cur='';
          for (const w of words) {
            if (cur.length + w.length + 1 > chunkSize && cur.length>0) {
              chunks.push(cur.trim()); cur=w;
            } else { cur += (cur? ' ':'') + w; }
          }
          if (cur) chunks.push(cur.trim());
          setTtsChunks(chunks);
          let idx = 0;
          const speakNext = async () => {
            if (idx >= chunks.length) {
              setIsPlaying(false);
              if (currentChapter < audiobook.chapter_count) setCurrentChapter(c => c+1);
              return;
            }
            // Update highlight to current chunk
            setReadingPosition(idx);
            const utter = new SpeechSynthesisUtterance(chunks[idx]);
            utteranceRef.current = utter;
            utter.onend = () => { idx++; speakNext(); };
            utter.onerror = (err) => { console.error('Speech error:', err); setIsPlaying(false); };
            speechSynthesisRef.current.speak(utter);
            setIsPlaying(true);
          };
          speakNext();
        };
        startReading();
      }
    }
  };

  const handlePrevChapter = () => {
    if (currentChapter > 1) {
      if (serverPlayback && audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
      else { speechSynthesisRef.current.cancel(); }
      setIsPlaying(false);
      setCurrentChapter(currentChapter - 1);
    }
  };

  const handleNextChapter = () => {
    if (currentChapter < audiobook.chapter_count) {
      if (serverPlayback && audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
      else { speechSynthesisRef.current.cancel(); }
      setIsPlaying(false);
      setCurrentChapter(currentChapter + 1);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    // volume applies to next utterances
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (isMuted) {
      setVolume(volume || 1);
      setIsMuted(false);
    } else {
      setVolume(0);
      setIsMuted(true);
    }
  };

  const handleSeek = (e) => {
    // Seek not supported for speech synthesis - restart chapter
    if (chapterText) {
      speechSynthesisRef.current.cancel();
      setIsPlaying(false);
      // restart reading
      setTimeout(() => { setIsPlaying(true); togglePlay(); }, 100);
    }
  };

  const handleVoiceChange = (voiceName) => {
    setSelectedVoice(voiceName);
    localStorage.setItem('audiobookVoice', voiceName);
  };

  const handleRateChange = (rate) => {
    setSpeechRate(rate);
    localStorage.setItem('audiobookRate', rate.toString());
  };

  const handlePitchChange = (pitch) => {
    setSpeechPitch(pitch);
    localStorage.setItem('audiobookPitch', pitch.toString());
  };

  const handleAvoidGenChange = (value) => {
    setAvoidServerGeneration(value);
    localStorage.setItem('avoidServerGeneration', value ? 'true' : 'false');
  };

  const handleDownloadChapter = async () => {
    // No pre-generated audio files anymore. Instead, offer to record current reading
    alert('Audio is now generated client-side using Speech Synthesis. Use the Record button to capture and download audio.');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: audiobook.title,
          text: `Listen to "${audiobook.title}" by ${audiobook.author}`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      const url = window.location.href;
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  const currentChapterInfo = audiobook.chapters?.[currentChapter - 1];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 backdrop-blur-2xl rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-white/20">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-purple-500/30 via-pink-500/30 to-purple-500/30 p-6 text-white border-b border-white/10">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-pink-600/20"></div>
          <div className="relative">
            {/* Playback source badge: Server audio vs Browser TTS */}
            <div className="absolute top-3 right-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-purple-200">
                <span className="font-semibold">{(avoidServerGeneration || !serverPlayback) ? 'Browser TTS' : 'Server audio'}</span>
              </div>
            </div>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-1">{audiobook.title}</h2>
                <p className="text-purple-200">{audiobook.author}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-all backdrop-blur-xl border border-white/10"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="text-sm bg-white/10 backdrop-blur-xl px-3 py-1.5 rounded-lg inline-flex items-center gap-2 border border-white/20">
              <span className="font-semibold">Chapter {currentChapter} of {audiobook.chapter_count}</span>
              {currentChapterInfo && <span className="text-purple-200">• {currentChapterInfo.title}</span>}
            </div>
          </div>
        </div>

        {/* Player Controls */}
        <div className="p-6 space-y-6">
          {/* Using browser speech synthesis instead of audio files */}

          {/* Progress Bar */}
          <div className="space-y-2">
            <div
              className="h-3 bg-white/10 rounded-full cursor-pointer overflow-hidden backdrop-blur-xl border border-white/20"
              onClick={handleSeek}
            >
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all shadow-lg shadow-purple-500/50"
                style={{
                  width: `${duration ? (readingPosition / duration) * 100 : 0}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-sm text-purple-200">
              <span className="font-medium">{readingPosition} / {duration}</span>
              <span className="font-medium">{formatTime(0)}</span>
            </div>
          </div>

          {/* Chapter text with highlighted chunk */}
          <div className="bg-white/3 p-4 rounded-xl max-h-56 overflow-auto text-sm text-slate-200">
            {ttsChunks && ttsChunks.length > 0 ? (
              ttsChunks.map((chunk, idx) => (
                <span id={`pchunk-${idx}`} key={idx} className={`inline-block mr-1 mb-1 px-2 py-1 rounded ${idx === readingPosition ? 'bg-purple-600/80 text-white' : 'bg-white/5 text-purple-200'}`}>
                  {chunk}
                </span>
              ))
            ) : (
              <p className="text-purple-200">{chapterText}</p>
            )}
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handlePrevChapter}
              disabled={currentChapter === 1}
              className="p-3 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all backdrop-blur-xl border border-white/20 text-white"
            >
              <SkipBack className="w-6 h-6" />
            </button>

            <button
              onClick={togglePlay}
              disabled={loading}
              className="p-5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all shadow-xl shadow-purple-500/50 hover:scale-110"
            >
              {loading ? (
                <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-8 h-8" />
              ) : (
                <Play className="w-8 h-8 ml-1" />
              )}
            </button>

            <button
              onClick={handleNextChapter}
              disabled={currentChapter === audiobook.chapter_count}
              className="p-3 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all backdrop-blur-xl border border-white/20 text-white"
            >
              <SkipForward className="w-6 h-6" />
            </button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl backdrop-blur-xl border border-white/10">
            <button onClick={toggleMute} className="p-2 hover:bg-white/20 rounded-lg transition-colors text-purple-300">
              {isMuted || volume === 0 ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="flex-1 h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-purple-500 [&::-webkit-slider-thumb]:to-pink-500"
            />
          </div>

          {/* Voice Settings */}
          <div className="space-y-3">
            <button
              onClick={() => setShowVoiceSettings(!showVoiceSettings)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg transition-all backdrop-blur-xl border border-white/20 text-white font-medium"
            >
              <Volume2 className="w-5 h-5" />
              Voice Settings
            </button>
            {showVoiceSettings && (
              <div className="bg-white/5 p-4 rounded-xl backdrop-blur-xl border border-white/10 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">Voice</label>
                  <select
                    value={selectedVoice || ''}
                    onChange={(e) => handleVoiceChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Default</option>
                    {availableVoices.map((v) => (
                      <option key={v.value} value={v.value}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">Rate: {speechRate.toFixed(1)}</label>
                  <input
                    type="range"
                    min="0.1"
                    max="2.0"
                    step="0.1"
                    value={speechRate}
                    onChange={(e) => handleRateChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-purple-500 [&::-webkit-slider-thumb]:to-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">Pitch: {speechPitch.toFixed(1)}</label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={speechPitch}
                    onChange={(e) => handlePitchChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-purple-500 [&::-webkit-slider-thumb]:to-pink-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-purple-200">Avoid server generation</label>
                  <input type="checkbox" checked={avoidServerGeneration} onChange={(e) => handleAvoidGenChange(e.target.checked)} />
                </div>
              </div>
            )}
          </div>

          {/* Additional Controls */}
          <div className="flex gap-2 pt-4 border-t border-white/10">
            <button
              onClick={() => setShowChapterList(!showChapterList)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg transition-all backdrop-blur-xl border border-white/20 text-white font-medium"
            >
              <List className="w-5 h-5" />
              Chapters
            </button>
            <button
              onClick={() => isRecording ? stopRecording() : startRecording()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg transition-all backdrop-blur-xl border border-white/20 text-white font-medium"
            >
              <Download className="w-5 h-5" />
              {isRecording ? 'Stop & Save' : 'Record'}
            </button>
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg transition-all backdrop-blur-xl border border-white/20 text-white font-medium"
            >
              <Share2 className="w-5 h-5" />
              Share
            </button>
          </div>

          {/* Chapter List */}
          {showChapterList && audiobook.chapters && (
            <div className="max-h-64 overflow-y-auto bg-white/5 rounded-lg backdrop-blur-xl border border-white/10">
              {audiobook.chapters.map((chapter, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrentChapter(idx + 1);
                    setShowChapterList(false);
                    setIsPlaying(true);
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-white/10 transition-colors border-b border-white/5 last:border-b-0 ${
                    currentChapter === idx + 1 ? 'bg-purple-500/20 text-purple-300' : 'text-white'
                  }`}
                >
                  <div className="font-semibold">Chapter {idx + 1}</div>
                  <div className="text-sm text-purple-200/70 line-clamp-1">
                    {chapter.title}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AudiobookPlayer;
