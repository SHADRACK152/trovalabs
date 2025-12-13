import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  X,
  Loader,
  Book,
  SkipForward,
  SkipBack,
  Circle,
  Download,
  Settings,
  RotateCcw
} from 'lucide-react';
import { api } from '../services/api';

const AudiobookStreamPlayer = ({ audiobook, startChapter = 1, onClose, forceAvoidServerGeneration = false }) => {
  const [currentChapter, setCurrentChapter] = useState(startChapter);
  const [currentChapterTitle, setCurrentChapterTitle] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [serverPlayback, setServerPlayback] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chapterText, setChapterText] = useState('');
  const [ttsChunks, setTtsChunks] = useState([]);
  const [readingPosition, setReadingPosition] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [speechPitch, setSpeechPitch] = useState(1.0);
  const [isPortrait, setIsPortrait] = useState(false);
  const [showFullChapter, setShowFullChapter] = useState(false);

  const utteranceRef = useRef(null);
  const speechSynthesisRef = useRef(window.speechSynthesis);
  // Incrementing session id to prevent overlapping speakChapter runs
  const speakSessionRef = useRef(0);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const destinationRef = useRef(null);
  const recordedAudioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const chunksContainerRef = useRef(null);

  useEffect(() => {
    // Update chapter title and load text
    const chapters = audiobook.chapters || [];
    const chapterData = chapters[currentChapter - 1];
    setCurrentChapterTitle(chapterData?.title || `Chapter ${currentChapter}`);
    
    // Load chapter text
    loadChapterText(currentChapter);
    
    return () => {
      // Cleanup - stop speech synthesis and recording
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [currentChapter]);

  // No audioRef needed - using speechSynthesis for playback
  useEffect(() => {
    // When chapter changes, reset progress and loading
    setCurrentTime(0);
    setDuration(0);
    setLoading(false);
    setError(null);
  }, [currentChapter, audiobook.chapter_count]);

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

  // Load available voices from backend and browser
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

  const [avoidServerGeneration, setAvoidServerGeneration] = useState(forceAvoidServerGeneration || false);

  useEffect(() => {
    // If user opted to avoid server generation, enforce browser playback regardless of voice chosen
    if (avoidServerGeneration) {
      setServerPlayback(false);
      return;
    }
    if (selectedVoice && selectedVoice.startsWith('browser:')) {
      setServerPlayback(false);
    } else {
      setServerPlayback(true);
    }
  }, [selectedVoice, avoidServerGeneration]);

  // Scroll highlighted chunk into view when readingPosition changes
  useEffect(() => {
    try {
      const el = document.getElementById(`chunk-${readingPosition}`);
      if (el && chunksContainerRef.current) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch (e) {}
  }, [readingPosition]);

  // Grid class reactive to orientation
  const gridColsClass = isPortrait ? 'grid grid-cols-1 gap-6' : 'grid grid-cols-1 md:grid-cols-3 gap-6';
  // Layout classes for portrait vs landscape
  const layoutClass = isPortrait ? 'grid grid-cols-1 gap-6' : 'flex flex-row gap-6 items-stretch';
  const leftColClass = isPortrait ? 'md:col-span-2' : 'flex-1 flex flex-col';
  // Limit right column width so it doesn't consume too much horizontal space
  const rightColClass = isPortrait ? 'md:col-span-1' : 'w-1/3 max-w-xs flex-shrink-0 flex flex-col justify-between';
  // Use a moderate max width and center the panel; lower min-height so it doesn't overflow smaller viewports
  // Cap the panel height to viewport so it stays centered; inner content will scroll
  const panelClass = isPortrait
    ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full mx-auto border border-purple-500/20 overflow-hidden max-h-[calc(100vh-6rem)]'
    : 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-3xl shadow-2xl max-w-4xl w-full mx-auto min-h-[12rem] md:min-h-[16rem] border border-purple-500/20 overflow-hidden max-h-[calc(100vh-6rem)]';

  // When selectedVoice changes during playback, restart the playback in the new voice
  useEffect(() => {
    if (!isPlaying) return;
    // No chapterText -> nothing to do
    if (!chapterText) return;
    if (avoidServerGeneration) {
      // If user set 'Avoid server generation', fall back to browser TTS immediately
      try {
        speechSynthesisRef.current.cancel();
        setTimeout(() => speakChapter(chapterText, readingPosition), 50);
      } catch (e) { console.warn('Failed to use browser TTS after avoid flag changed', e); }
      return;
    }
    if (serverPlayback) {
      // Restart server stream with voice override
      try {
        const base = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const streamUrl = `${base}/audiobook/${audiobook.audiobook_id}/stream?start_chapter=${currentChapter}${selectedVoice ? `&voice=${encodeURIComponent(selectedVoice)}` : ''}${avoidServerGeneration ? '&generate=false' : ''}`;
        if (audioRef.current) {
          try { audioRef.current.pause(); } catch (e) {}
          try { URL.revokeObjectURL(audioRef.current.src); } catch (e) {}
          audioRef.current.src = '';
          audioRef.current = null;
        }
  startServerStream(streamUrl, chapterText, audioRef.current?.currentTime || 0).catch(e => {
          console.warn('Server stream restart failed, falling back to browser TTS', e);
          speakChapter(chapterText, readingPosition);
        });
      } catch (e) {
        console.warn('Restart server stream failed', e);
        // Fallback to browser TTS
        speechSynthesisRef.current.cancel();
        speakChapter(chapterText, readingPosition);
      }
    } else {
      // Browser TTS: cancel current utterances and resume from readingPosition with new voice
      try {
        speechSynthesisRef.current.cancel();
        // Slight delay to ensure cancel has effect
        setTimeout(() => speakChapter(chapterText, readingPosition), 50);
      } catch (e) {
        console.warn('Failed to restart browser TTS with new voice', e);
      }
    }
  }, [selectedVoice, avoidServerGeneration]);

  const loadChapterText = async (chapterNum) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get chapter text from audiobook data
      const chapters = audiobook.chapters || [];
      const chapterData = chapters[chapterNum - 1];
      
      if (!chapterData) {
        throw new Error('Chapter not found');
      }
      
      const text = chapterData.content || chapterData.text || '';
      
      if (!text) {
        throw new Error('Chapter has no content');
      }
      
      // Add introduction
      let fullText = '';
      if (chapterNum === 1) {
        // First chapter - include book title
        const bookTitle = audiobook.title || 'Audiobook';
        const author = audiobook.author || '';
        fullText = `${bookTitle}`;
        if (author) {
          fullText += `, by ${author}. `;
        }
        fullText += ` ${currentChapterTitle}. `;
      } else {
        fullText = `${currentChapterTitle}. `;
      }
      
      fullText += text;
      
      setChapterText(fullText);
      // Pre-split into TTS chunks to enable synchronized highlights for browser and server playback
      const chunkSize = 200;
      const words = fullText.split(' ');
      const chunks = [];
      let currentChunk = '';
      for (const word of words) {
        if (currentChunk.length + word.length + 1 > chunkSize && currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = word;
        } else {
          currentChunk += (currentChunk ? ' ' : '') + word;
        }
      }
      if (currentChunk) chunks.push(currentChunk.trim());
      setTtsChunks(chunks);
      setLoading(false);
      
      // Auto-start reading or server-side streaming
  setTimeout(async () => {
            if (avoidServerGeneration || (selectedVoice && selectedVoice.startsWith('browser:'))) {
          // user requested browser-only TTS; speak locally
          speakChapter(fullText);
        } else {
          // Start server streaming from this chapter
          try {
            let base = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            // If env is not configured and resolves to front-end dev server, override to backend default
            if (base.includes('5173')) base = 'http://localhost:8000';
            const genParam = avoidServerGeneration ? 'generate=false' : 'generate=true';
            const streamUrl = `${base}/audiobook/${audiobook.audiobook_id}/stream?start_chapter=${chapterNum}&${genParam}${selectedVoice && !selectedVoice.startsWith('browser:') ? `&voice=${encodeURIComponent(selectedVoice)}` : ''}`;
            // Attempt to stream via audio element, but provide robust fallbacks
            await startServerStream(streamUrl, fullText);
          } catch (e) {
            console.warn('Server streaming failed, falling back to browser TTS', e);
            speakChapter(fullText);
          }
        }
      }, 500);
      
    } catch (err) {
      console.error('Error loading chapter:', err);
      setError(err.message || 'Failed to load chapter');
      setLoading(false);
    }
  };

  const startServerStream = (streamUrl, fallbackText, seekSeconds = 0) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Clean up previous audio
        if (audioRef.current) {
          try { audioRef.current.pause(); } catch (e) {}
          try { URL.revokeObjectURL(audioRef.current.src); } catch (e) {}
          audioRef.current.src = '';
          audioRef.current = null;
        }

        const audio = new Audio();
        audio.crossOrigin = 'anonymous';
        audio.preload = 'metadata';
        audioRef.current = audio;

        let fallbackTimer = null;
        const clearAll = () => {
          if (fallbackTimer) clearTimeout(fallbackTimer);
          audio.oncanplay = null;
          audio.onerror = null;
          audio.onended = null;
        };

        audio.onended = () => { setIsPlaying(false); };
        audio.ontimeupdate = () => {
          try { setCurrentTime(audio.currentTime); } catch (e) {}
        };
        audio.onloadedmetadata = () => {
          try { setDuration(audio.duration); } catch (e) {}
          // If we have precomputed ttsChunks, use audio timeupdate to set readingPosition
          audio.ontimeupdate = () => {
            try {
              setCurrentTime(audio.currentTime);
              if (ttsChunks && ttsChunks.length > 0 && audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
                const fraction = audio.currentTime / audio.duration;
                const idx = Math.min(ttsChunks.length - 1, Math.floor(fraction * ttsChunks.length));
                setReadingPosition(idx);
              }
            } catch (e) {}
          };
        };

        audio.onerror = async () => {
          // Attempt axios GET as a last-ditch check in case the audio element's request failed due to auth
          console.error('Audio element error:', audio.error, 'src=', audio.src);
          try {
            const resp = await api.get(streamUrl, { responseType: 'blob' });
            const ct = (resp.headers['content-type'] || '').toString();
            console.log('audio.onerror axios probe:', resp.status, ct);
            if (resp.status >= 200 && resp.status < 300 && ct.includes('audio')) {
              const blobUrl = URL.createObjectURL(resp.data);
              audio.src = blobUrl;
              // Let oncanplay take over
              return;
            }
          } catch (probeErr) {
            console.warn('audio.onerror: axios probe failed', probeErr);
          }

          clearAll();
          setIsPlaying(false);
          setError('Server playback error: failed to load audio stream. Falling back to browser TTS.');
          // If fallback text available, speak using browser
          if (fallbackText) speakChapter(fallbackText);
          reject(new Error('Audio element error'));
        };

        audio.oncanplay = async () => {
          try {
            // Clear fallback timeout
            if (fallbackTimer) clearTimeout(fallbackTimer);
            setIsPlaying(true);
            // Seek if requested (after metadata loaded)
            try {
              if (seekSeconds && !isNaN(seekSeconds) && audio.duration && seekSeconds < audio.duration) {
                audio.currentTime = seekSeconds;
              }
            } catch (err) {}
            const playPromise = audio.play();
            if (playPromise && typeof playPromise.catch === 'function') {
              playPromise.catch(err => {
                if (err && err.name === 'AbortError') {
                  // ignore pause/abort
                  return;
                }
                console.error('Audio play() error:', err);
                setError('Playback error');
                setIsPlaying(false);
              });
            }
            resolve();
          } catch (e) {
            console.error('Could not start server audio playback:', e);
            clearAll();
            setIsPlaying(false);
            setError('Playback failed');
            if (fallbackText) speakChapter(fallbackText);
            reject(e);
          }
        };

        // Proactively try to GET the stream via axios (includes auth headers)
        // This helps when the streaming endpoint is protected and the audio element
        // can't send auth headers. If axios returns audio, we provide a blob URL.
        (async () => {
          try {
            const resp = await api.get(streamUrl, { responseType: 'blob', timeout: 5000 });
            if (resp.status >= 200 && resp.status < 300) {
              const ct = (resp.headers['content-type'] || '').toString();
              if (ct.includes('audio')) {
                const initialBlobUrl = URL.createObjectURL(resp.data);
                audio.src = initialBlobUrl;
                console.info('startServerStream: initial axios probe found audio blob and set audio.src');
                return;
              }
            }
          } catch (e) {
            // Inspect auth failures and show user-friendly message
            if (e?.response?.status === 401 || e?.response?.status === 403) {
              console.warn('startServerStream: stream requires authentication; please log in');
              setError('Server stream requires login; please sign in to listen to audiobooks');
              // Fallback to browser TTS immediately
              if (fallbackText) speakChapter(fallbackText);
              reject(new Error('Authentication required for server stream'));
              return;
            }
            // Otherwise, ignore - fall back to timer-based check below that will also attempt axios
            console.debug('startServerStream: initial axios probe failed', e.message || e);
          }
        })();
        fallbackTimer = setTimeout(async () => {
          try {
            // Try to GET the audio as a blob using axios (sends auth headers)
            let ok = false;
            let blobUrl = null;
              try {
              const resp = await api.get(streamUrl, { responseType: 'blob' });
              if (resp.status >= 200 && resp.status < 300) {
                const ct = (resp.headers['content-type'] || '').toString();
                console.log('startServerStream: axios GET success headers:', { status: resp.status, contentType: ct });
                if (ct.includes('audio')) {
                  ok = true;
                  // Create object URL and set audio source
                  blobUrl = URL.createObjectURL(resp.data);
                  audio.src = blobUrl;
                  // Play will be handled by oncanplay
                }
              }
            } catch (e) {
              console.warn('axios GET check for stream failed', e);
            }

            if (!ok) {
              console.warn('Stream content does not appear to be audio or is not available; falling back');
              // Cleanup and fallback
              clearAll();
              setIsPlaying(false);
              setError('Server stream not available, falling back to browser TTS.');
              if (fallbackText) speakChapter(fallbackText);
              reject(new Error('Server stream not available'));
              return;
            }

            // If OK and we already set a blob URL, keep it; otherwise set src to streamUrl
            if (!blobUrl) {
              audio.src = streamUrl;
            }
            // The 'oncanplay' handler will start playback
          } catch (e) {
            console.error('Error checking stream or setting src', e);
            clearAll();
            setIsPlaying(false);
            setError('Error preparing stream, falling back to TTS');
            if (fallbackText) speakChapter(fallbackText);
            reject(e);
          }
        }, 4000);

      } catch (err) {
        console.error('startServerStream error', err);
        setError('Server streaming not available');
        if (fallbackText) speakChapter(fallbackText);
        reject(err);
      }
    });
  };

  const speakChapter = (text, startChunk = 0) => {
    // Stop any current speech and bump the speak session id so previous promises abort
    speakSessionRef.current += 1;
    const session = speakSessionRef.current;
    try { speechSynthesisRef.current.cancel(); } catch (e) {}
    
    // Split text into chunks (speech synthesis has limits) - prefer sentence boundaries
    const chunkSize = 200; // characters per chunk
    const sentences = text.split(/(?<=[.!?])\s+/);
    const chunks = [];
    let currentChunk = '';
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length + 1 > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
    
  console.log(`📖 Reading chapter in ${chunks.length} chunks`);
  setTtsChunks(chunks);
    
  let chunkIndex = startChunk || 0;
    
    const speakChunk = (text, rate = speechRate, attempt = 1) => {
      return new Promise((resolve, reject) => {
        try {
          // If session changed since speakChapter started, abort
          if (session !== speakSessionRef.current) return reject(new Error('Speak session aborted'));
          const utterance = new SpeechSynthesisUtterance(text);
          utteranceRef.current = utterance;
          utterance.rate = Math.max(0.1, Math.min(2.0, rate));
          utterance.pitch = speechPitch;
          utterance.volume = volume;
          utterance.lang = 'en-US';

          // Choose voice if available
          let voices = speechSynthesisRef.current.getVoices() || [];
          if (selectedVoice) {
            const voiceMatchName = selectedVoice.startsWith('browser:') ? selectedVoice.replace(/^browser:/, '') : selectedVoice;
            const selectedVoiceObj = voices.find(v => v.name === voiceMatchName || v.name === selectedVoice);
            if (selectedVoiceObj) {
              utterance.voice = selectedVoiceObj;
            }
          } else {
            // Fallback to preferred voice if no selection
            const preferredVoice = (voices || []).find(v => v.lang && v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Natural')));
            if (preferredVoice) utterance.voice = preferredVoice;
          }

          utterance.onend = () => {
            // If session changed, treat as aborted
            if (session !== speakSessionRef.current) return resolve();
            // Clear current utterance ref
            try { if (utteranceRef.current === utterance) utteranceRef.current = null; } catch (e) {}
            resolve();
          };
          utterance.onerror = (errEvent) => {
            console.error('Speech utterance error event:', errEvent);
            // Clear current utterance ref
            try { if (utteranceRef.current === utterance) utteranceRef.current = null; } catch (e) {}
            reject(errEvent);
          };
          try {
            speechSynthesisRef.current.speak(utterance);
          } catch (e) {
            console.error('speak() threw:', e);
            reject(e);
          }
        } catch (e) {
          reject(e);
        }
      });
    };

    const speakNextChunk = async () => {
      // If session changed, stop progressing
      if (session !== speakSessionRef.current) return;
      if (chunkIndex >= chunks.length) {
        // Chapter finished
        setIsPlaying(false);
        // Auto-advance to next chapter
        if (currentChapter < audiobook.chapter_count) {
          setTimeout(() => setCurrentChapter(prev => prev + 1), 1000);
        }
        return;
      }
      
      const currentChunk = chunks[chunkIndex];
      let attempt = 0;
      let maxAttempts = 3;
      let curRate = 1.0;
      let curChunk = currentChunk;
      while (attempt < maxAttempts) {
        try {
          await speakChunk(curChunk, curRate, attempt + 1);
          // Success: move to next chunk
          chunkIndex++;
          // readingPosition indexes the next chunk we will read; highlight next chunk on UI
          setReadingPosition(chunkIndex);
          // Check if session still active before recursing
          if (session !== speakSessionRef.current) return;
          // Proceed to next chunk
          await speakNextChunk();
          return;
        } catch (err) {
          attempt++;
          console.warn(`Speech chunk failed (attempt ${attempt}/${maxAttempts}):`, err);
          // If attempt left, try reducing rate and chunk size
          if (attempt < maxAttempts) {
            curRate = Math.max(0.6, curRate - 0.15);
            // halve the chunk size if possible
            if (curChunk.length > 80) {
              curChunk = curChunk.substring(0, Math.floor(curChunk.length / 2));
            }
            await new Promise(res => setTimeout(res, 300));
            continue;
          }
          // All retries failed: log and stop playback
          console.error('All TTS attempts failed for chunk:', currentChunk);
          setError('Speech synthesis failed - try changing the voice in Voice Settings or reload the page');
          setIsPlaying(false);
          return;
        }
      }
    };
    
  setIsPlaying(true);
  setReadingPosition(chunkIndex);
    speakNextChunk();
  };

  const startRecording = async () => {
    try {
      console.log('📹 Starting recording...');
      
      // Note: Recording speech synthesis directly is complex
      // Alternative: Use MediaRecorder with display/tab capture
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: false,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 44100
        }
      });
      
      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;
      recordedAudioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedAudioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        console.log('Recording stopped, creating download...');
        const blob = new Blob(recordedAudioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${audiobook.title.replace(/[^a-z0-9]/gi, '_')}_Chapter_${currentChapter}.webm`;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
        
        setRecordedChunks([...recordedAudioChunksRef.current]);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      console.log('✅ Recording started - make sure this tab is selected for audio capture');
      
    } catch (error) {
      console.error('Recording error:', error);
      if (error.name === 'NotAllowedError') {
        setError('Recording permission denied. Please select "Share audio" when prompted.');
      } else {
        setError('Failed to start recording. Please try again.');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      console.log('⏹️ Recording stopped');
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const togglePlay = async () => {
    if (isPlaying) {
      // Pause speech or audio
      if (serverPlayback && audioRef.current) {
        audioRef.current.pause();
      } else {
        speechSynthesisRef.current.pause();
      }
      setIsPlaying(false);
    } else {
      // Resume speech or audio
          if (avoidServerGeneration) {
        // If client-only requested, resume browser TTS instead
        speechSynthesisRef.current.resume();
        setIsPlaying(true);
        return;
      }
          if (serverPlayback && audioRef.current) {
        // If selected voice changed while paused, ensure the stream URL reflects selectedVoice
      try {
  let base = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  if (base.includes('5173')) base = 'http://localhost:8000';
  const genParam2 = avoidServerGeneration ? 'generate=false' : 'generate=true';
  const streamUrl = `${base}/audiobook/${audiobook.audiobook_id}/stream?start_chapter=${currentChapter}&${genParam2}${selectedVoice && !selectedVoice.startsWith('browser:') ? `&voice=${encodeURIComponent(selectedVoice)}` : ''}`;
      console.log('togglePlay: VITE_API_URL', import.meta.env.VITE_API_URL, 'computed base', base, 'streamUrl', streamUrl);
          // Restart the stream using the robust helper which validates the audio response
          // Restart the stream; startServerStream handles play and will set setIsPlaying on success.
            await startServerStream(streamUrl, chapterText, audioRef.current?.currentTime || 0).catch((e) => {
            console.error('Error resuming server stream', e);
            // Fallback to directly playing the audio ref if available
            try { 
              const p = audioRef.current?.play();
              if (p && typeof p.catch === 'function') p.catch(err => console.warn(err));
            } catch (err) { console.warn(err); }
          });
        } catch (e) {
          console.warn('Could not update server stream URL on resume', e);
        }
        setIsPlaying(true);
      } else if (speechSynthesisRef.current.paused) {
        speechSynthesisRef.current.resume();
        setIsPlaying(true);
      } else if (chapterText) {
        // Restart TTS with new voice if needed - cancel previous utterances and resume from reading position
        try { speechSynthesisRef.current.cancel(); } catch (e) {}
        speakChapter(chapterText, readingPosition);
      }
    }
  };

  const handlePrevChapter = () => {
    if (currentChapter > 1) {
      speechSynthesisRef.current.cancel();
      setIsPlaying(false);
      setCurrentChapter(currentChapter - 1);
    }
  };

  const handleNextChapter = () => {
    if (currentChapter < audiobook.chapter_count) {
      speechSynthesisRef.current.cancel();
      setIsPlaying(false);
      setCurrentChapter(currentChapter + 1);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    // Volume change will apply to next utterance
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

  const handleVoiceChange = (voiceName) => {
    setSelectedVoice(voiceName);
    localStorage.setItem('audiobookVoice', voiceName);
  };

  const handleAvoidGenChange = (value) => {
    setAvoidServerGeneration(value);
    localStorage.setItem('avoidServerGeneration', value ? 'true' : 'false');
  };

  const handleRateChange = (rate) => {
    setSpeechRate(rate);
    localStorage.setItem('audiobookRate', rate.toString());
  };

  const handlePitchChange = (pitch) => {
    setSpeechPitch(pitch);
    localStorage.setItem('audiobookPitch', pitch.toString());
  };

  const handleSeek = (e) => {
    // Seeking not supported with speech synthesis
    // Just restart the chapter
    if (chapterText) {
      speechSynthesisRef.current.cancel();
      speakChapter(chapterText);
    }
  };

  const handleJumpToChunk = (idx) => {
    // Jump UI to a chunk and optionally resume playback from there
    setReadingPosition(idx);
    try { speechSynthesisRef.current.cancel(); } catch (e) {}
    if (chapterText) {
      // Start speaking from the selected chunk
      speakChapter(chapterText, idx);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={panelClass}>
        {/* Header */}
        <div className="bg-white/5 backdrop-blur-xl border-b border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Book className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white truncate">{audiobook.title}</h2>
                <p className="text-sm text-purple-300 truncate">by {audiobook.author}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-purple-200 mr-2">
                <span className="font-semibold">{(avoidServerGeneration || !serverPlayback) ? 'Browser TTS' : 'Server audio'}</span>
              </div>
              <button
                onClick={() => setIsPortrait(!isPortrait)}
                title={isPortrait ? 'Switch to landscape' : 'Switch to portrait'}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
              >
                <RotateCcw className="w-5 h-5 text-purple-300" />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-red-400/50 transition-all"
              >
                <X className="w-6 h-6 text-purple-300 hover:text-red-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Player Content - two-column layout: left = main reading, right = settings/subtopics */}
        <div className="p-3 overflow-auto" style={{ maxHeight: 'calc(100vh - 6rem)' }}>
          <div className={layoutClass}>
            {/* Left: main reading area */}
            <div className={`${leftColClass} space-y-3`}>
              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                  <p className="text-red-400 text-center">{error}</p>
                </div>
              )}

              {/* Loading State */}
              {loading && (
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-2">
                  <p className="text-purple-300 text-center flex items-center justify-center gap-2 text-sm">
                    <Loader className="w-4 h-4 animate-spin" />
                    Loading chapter...
                  </p>
                </div>
              )}

              {/* Chapter Info */}
              <div className="text-left space-y-1">
                <div className="text-purple-300 text-xs">Chapter {currentChapter} of {audiobook.chapter_count}</div>
                <h3 className="text-lg font-semibold text-white truncate">{currentChapterTitle}</h3>
                {isPlaying && (
                  <div className="text-purple-400 text-sm flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                    Reading...
                  </div>
                )}
              </div>

              {/* Chapter display area: compact (single chunk) or expanded (full chapter) */}
              <div className="flex-1 flex flex-col">
                {!showFullChapter ? (
                  // Compact chunk view: show only the current chunk, with smaller nav and expand toggle
                  <div className="flex-1 flex flex-col items-stretch">
                    <div className="bg-white/3 p-3 rounded-md flex-1 flex items-center justify-center text-sm text-slate-200">
                      {ttsChunks && ttsChunks.length > 0 ? (
                        <div id={`chunk-${readingPosition}`} className="w-full">
                          <div className="text-slate-200 text-sm leading-snug">{ttsChunks[readingPosition]}</div>
                        </div>
                      ) : (
                        <p className="text-purple-200 text-sm">{chapterText}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-2">
                      <div className="flex items-center gap-2">
                        <button onClick={() => { if (readingPosition > 0) { setReadingPosition(readingPosition - 1); try{ speechSynthesisRef.current.cancel(); }catch(e){} }} } className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-purple-200 text-sm disabled:opacity-40" disabled={readingPosition === 0}>
                          Prev
                        </button>
                        <button onClick={() => { if (ttsChunks && readingPosition < ttsChunks.length - 1) { setReadingPosition(readingPosition + 1); try{ speechSynthesisRef.current.cancel(); }catch(e){} } }} className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-purple-200 text-sm disabled:opacity-40" disabled={!(ttsChunks && readingPosition < ttsChunks.length - 1)}>
                          Next
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button onClick={() => { setShowFullChapter(true); }} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-sm">Expand</button>
                        <div className="text-xs text-purple-300">{Math.min(ttsChunks.length, readingPosition + 1)}/{ttsChunks.length || 0}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Expanded chapter view: full scrollable text but constrained height to avoid page overflow
                  <div className="flex-1 flex flex-col">
                    <div className="bg-white/3 p-3 rounded-md overflow-auto text-sm text-slate-200 flex-1" style={{ maxHeight: '45vh' }}>
                      <div className="whitespace-pre-wrap text-sm">{chapterText}</div>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-2">
                      <button onClick={() => setShowFullChapter(false)} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-sm">Collapse</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Progress Indicator (simulated) */}
              <div className="space-y-2">
                <div className="h-2 bg-purple-900/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                    style={{ width: isPlaying ? '50%' : '0%' }}
                  />
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-6">
                {/* Previous Chapter */}
                <button
                  onClick={handlePrevChapter}
                  disabled={currentChapter === 1 || loading}
                  className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 hover:border-purple-400/50 flex items-center justify-center transition-all"
                >
                  <SkipBack className="w-5 h-5 text-purple-300" />
                </button>

                {/* Play/Pause Button */}
                <button
                  onClick={togglePlay}
                  disabled={loading}
                  className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-700 flex items-center justify-center transition-all shadow-lg hover:shadow-purple-500/50 hover:scale-105 disabled:scale-100"
                >
                  {loading ? (
                    <Loader className="w-8 h-8 text-white animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-8 h-8 text-white" />
                  ) : (
                    <Play className="w-8 h-8 text-white ml-1" />
                  )}
                </button>

                {/* Next Chapter */}
                <button
                  onClick={handleNextChapter}
                  disabled={currentChapter === audiobook.chapter_count || loading}
                  className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 hover:border-purple-400/50 flex items-center justify-center transition-all"
                >
                  <SkipForward className="w-5 h-5 text-purple-300" />
                </button>
              </div>

              {/* Recording Control */}
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={toggleRecording}
                  disabled={!isPlaying && !isRecording}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                    isRecording
                      ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                      : 'bg-white/5 hover:bg-white/10 text-purple-300 border border-white/10'
                  } disabled:opacity-30 disabled:cursor-not-allowed`}
                  title={isRecording ? 'Stop recording and download' : 'Record the audio as it plays'}
                >
                  {isRecording ? (
                    <>
                      <Circle className="w-4 h-4 fill-current" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Circle className="w-4 h-4" />
                      Record Reading
                    </>
                  )}
                </button>
                {isRecording && (
                  <p className="text-xs text-purple-300 text-center">
                    🎙️ Recording in progress... File will download when you stop
                  </p>
                )}
                {recordedChunks.length > 0 && !isRecording && (
                  <div className="text-sm text-green-400 flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Recording saved!
                  </div>
                )}
              </div>

              {/* Volume Control */}
              <div className="flex items-center gap-4">
                <button
                  onClick={toggleMute}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-5 h-5 text-purple-300" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-purple-300" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="flex-1 h-2 bg-purple-900/30 rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-4
                    [&::-webkit-slider-thumb]:h-4
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-gradient-to-r
                    [&::-webkit-slider-thumb]:from-purple-500
                    [&::-webkit-slider-thumb]:to-pink-500
                    [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-webkit-slider-thumb]:shadow-lg
                    [&::-webkit-slider-thumb]:hover:scale-110
                    [&::-webkit-slider-thumb]:transition-transform"
                />
              </div>
            </div>

            {/* Right: settings and subtopics */}
            <div className={`${rightColClass} space-y-4`}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-purple-200">
                <span className="font-semibold">{(avoidServerGeneration || !serverPlayback) ? 'Browser TTS' : 'Server audio'}</span>
              </div>

              <button
                onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg transition-all backdrop-blur-xl border border-white/20 text-white font-medium"
              >
                <Settings className="w-5 h-5" />
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
                    <input type="checkbox" checked={avoidServerGeneration} onChange={(e) => setAvoidServerGeneration(e.target.checked)} />
                  </div>
                </div>
              )}

              {/* Subtopics / Chunks list - clickable for quick navigation */}
              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <div className="text-sm text-purple-200 font-semibold mb-2">Subtopics</div>
                <div className="space-y-2 max-h-64 overflow-auto">
                  {ttsChunks && ttsChunks.length > 0 ? (
                    ttsChunks.map((c, i) => (
                      <button key={i} onClick={() => { handleJumpToChunk(i); setShowFullChapter(false); }} className={`w-full text-left px-3 py-2 rounded ${i === readingPosition ? 'bg-purple-600/80 text-white' : 'bg-white/5 text-purple-200'} hover:bg-purple-600/60` }>
                        <div className="text-sm">
                          {c.length > 120 ? `${c.substring(0,120).trim()}...` : c}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-sm text-purple-300">No subtopics available</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudiobookStreamPlayer;
