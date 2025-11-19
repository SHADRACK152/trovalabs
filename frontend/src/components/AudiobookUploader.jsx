import React, { useState } from 'react';
import { Upload, Book, FileText, Mic } from 'lucide-react';
import { api, getCurrentUser } from '../services/api';

const AudiobookUploader = ({ onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [voice, setVoice] = useState('lisa');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const [availableVoices, setAvailableVoices] = useState([]);

  // Load voices (both natural voices from backend and browser voices)
  React.useEffect(() => {
    const loadVoices = async () => {
      try {
        // Fetch natural voices from backend (Free TTS)
        const result = await api.get('/voices');
        const allVoices = Object.entries(result.voices || {}).map(([name, info]) => ({
          name,
          value: name,
          displayName: name.charAt(0).toUpperCase() + name.slice(1),
          label: `${name.charAt(0).toUpperCase() + name.slice(1)} - ${info.description}`,
          description: info.description,
          provider: info.provider || 'natural',
          gender: info.gender || 'unknown',
        }));

        const natural = allVoices.filter(v => v.provider !== 'openai');
        const openai = allVoices.filter(v => v.provider === 'openai');

        // Browser voices
        let browserVoices = [];
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          let voices = window.speechSynthesis.getVoices();
          if (!voices || voices.length === 0) {
            // If voices not yet loaded, wait for the onvoiceschanged event
            await new Promise((resolve) => {
              window.speechSynthesis.onvoiceschanged = () => {
                voices = window.speechSynthesis.getVoices();
                resolve();
              };
            });
          }
          browserVoices = voices
            .filter(v => v.lang && v.lang.startsWith('en'))
            .slice(0, 20) // limit to 20 to avoid massive lists
            .map(v => ({
                value: `browser:${v.name}`,
                label: `${v.name} (${v.lang}) - Browser`,
                lang: v.lang,
              source: 'browser'
            }));
        }

        // Fetch cloned voices for the current user (if available and logged in)
        let cloneVoices = [];
        try {
          const user = await getCurrentUser();
          const resp = await api.get(`/voice-clone/profiles/${user.id}`);
          if (resp.data && resp.data.profiles) {
            cloneVoices = resp.data.profiles.map((p) => ({
              value: `clone:${p.profile_name}`,
              label: `Cloned: ${p.profile_name}`,
              source: 'clone',
            }));
          }
        } catch (e) {
          // Not logged in or no profiles; ignore
          console.debug('No cloned voices available or user not logged in');
        }

  const combined = [...natural, ...openai, ...cloneVoices, ...browserVoices];
        if (combined.length === 0) {
          // Fallback to Lisa if no voices available
          combined.push({ value: 'lisa', label: 'Lisa - Natural, expressive', source: 'natural' });
        }

        setAvailableVoices(combined);
        // Set a sensible default voice if the current voice isn't available
        const values = combined.map(v => v.value);
        if (!values.includes(voice)) {
          const defaultVoice = (natural.length && natural[0].value) ||
            (openai.length && openai[0].value) ||
            (cloneVoices.length && cloneVoices[0].value) ||
            (browserVoices.length && browserVoices[0].value) ||
            'lisa';
          setVoice(defaultVoice);
        }
      } catch (err) {
        console.error('Failed loading voices:', err);
        // Provide a default set of natural voices in case the backend is unreachable
        const defaultVoices = [
          { value: 'emma', displayName: 'Emma', label: 'Emma - British, clear', description: 'British, clear', provider: 'natural', gender: 'female' },
          { value: 'mary', displayName: 'Mary', label: 'Mary - American, natural', description: 'American, natural', provider: 'natural', gender: 'female' },
          { value: 'sarah', displayName: 'Sarah', label: 'Sarah - Australian, friendly', description: 'Australian, friendly', provider: 'natural', gender: 'female' },
          { value: 'john', displayName: 'John', label: 'John - British, professional', description: 'British, professional', provider: 'natural', gender: 'male' },
          { value: 'david', displayName: 'David', label: 'David - American, deep', description: 'American, deep', provider: 'natural', gender: 'male' },
          { value: 'lisa', displayName: 'Lisa', label: 'Lisa - Natural, expressive', description: 'Natural, expressive', provider: 'natural', gender: 'female' },
          { value: 'jenny', displayName: 'Jenny', label: 'Jenny - Friendly, warm', description: 'Friendly, warm', provider: 'natural', gender: 'female' },
          { value: 'aria', displayName: 'Aria', label: 'Aria - Professional, clear', description: 'Professional, clear', provider: 'natural', gender: 'female' },
          { value: 'guy', displayName: 'Guy', label: 'Guy - Energetic, modern', description: 'Energetic, modern', provider: 'natural', gender: 'male' },
          { value: 'tony', displayName: 'Tony', label: 'Tony - Professional, news', description: 'Professional, news', provider: 'natural', gender: 'male' },
        ];
        setAvailableVoices(defaultVoices);
        // Set default voice
        if (!defaultVoices.find(v => v.value === voice)) {
          setVoice(defaultVoices[0].value);
        }
      }
    };
    loadVoices();
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (selectedFile) => {
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/epub+zip',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];

    if (!allowedTypes.includes(selectedFile.type) && 
        !selectedFile.name.match(/\.(pdf|txt|epub|docx|doc)$/i)) {
      setError('Please upload a PDF, TXT, EPUB, or DOCX file');
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB');
      return;
    }

    setFile(selectedFile);
    setError('');

    // Auto-fill title from filename
    if (!title) {
      const filename = selectedFile.name.replace(/\.[^/.]+$/, '');
      setTitle(filename);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError('');
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (title) formData.append('title', title);
      if (author) formData.append('author', author);
      // Map browser-only voice to a server-side fallback
      let voiceToUse = voice;
      if (voice && voice.startsWith('browser:')) {
        const selected = availableVoices.find(v => v.value === voice);
        const lang = selected?.lang || 'en-US';
        // Very simple mapping: British -> emma, Australian -> sarah, US -> mary
        if (lang.startsWith('en-GB')) voiceToUse = 'emma';
        else if (lang.startsWith('en-AU')) voiceToUse = 'sarah';
        else voiceToUse = 'lisa';
      }
      formData.append('voice', voiceToUse);

      // Upload with progress tracking
      const response = await api.post('/audiobook/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 5 minute timeout for large files
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        },
      });

      setUploadProgress(100);

      const audiobook = response.data.audiobook;
      // No server-side audio processing - we use client-side speech synthesis for playback

      // Reset form
      setFile(null);
      setTitle('');
      setAuthor('');
      setVoice('lisa');
      setUploadProgress(0);

      if (onUploadSuccess) {
        onUploadSuccess(audiobook);
      }
    } catch (err) {
      console.error('Upload error:', err);
      console.error('Error details:', err.response?.data || err.message);
      
      if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        setError('Upload timeout. File may be too large. Try a smaller file or check your connection.');
      } else {
        setError(err.response?.data?.detail || 'Upload failed. Please try again.');
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // derived grouped lists
  let naturalVoiceList = availableVoices.filter(
    (v) => v.provider !== 'openai' && !v.value.startsWith('browser:') && !v.value.startsWith('clone:')
  );
  // Preferred order for display
  const preferredOrder = ['emma','mary','sarah','john','david','lisa','jenny','aria','guy','tony'];
  naturalVoiceList = naturalVoiceList.sort((a,b) => {
    const ai = preferredOrder.indexOf(a.value) === -1 ? 999 : preferredOrder.indexOf(a.value);
    const bi = preferredOrder.indexOf(b.value) === -1 ? 999 : preferredOrder.indexOf(b.value);
    return ai - bi;
  });
  let openaiVoiceList = availableVoices.filter((v) => v.provider === 'openai');
  const openaiOrder = ['alloy','echo','fable','onyx','nova','shimmer'];
  openaiVoiceList = openaiVoiceList.sort((a,b) => {
    const ai = openaiOrder.indexOf(a.value) === -1 ? 999 : openaiOrder.indexOf(a.value);
    const bi = openaiOrder.indexOf(b.value) === -1 ? 999 : openaiOrder.indexOf(b.value);
    return ai - bi;
  });
  const cloneVoiceList = availableVoices.filter((v) => v.value.startsWith('clone:'));
  const browserVoiceList = availableVoices.filter((v) => v.value.startsWith('browser:'));

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
            <Book className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
            Create Audiobook
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload Area */}
          <div
            className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
              dragActive
                ? 'border-purple-400 bg-purple-500/10 scale-105'
                : 'border-white/20 hover:border-purple-400/50 bg-white/5'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".pdf,.txt,.epub,.docx,.doc"
              onChange={(e) => e.target.files[0] && handleFileSelect(e.target.files[0])}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            {file ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-white">{file.name}</p>
                  <p className="text-sm text-purple-200/70">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center backdrop-blur-xl border border-white/10">
                  <Upload className="w-8 h-8 text-purple-400" />
                </div>
                <p className="text-white font-medium mb-2">
                  Drag & drop your file here, or click to browse
                </p>
                <p className="text-sm text-purple-200/70">
                  Supports PDF, TXT, EPUB, DOCX (max 50MB)
                </p>
              </div>
            )}
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">
              Book Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter book title"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-200/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-xl transition-all"
            />
          </div>

          {/* Author Input */}
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">
              Author
            </label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Enter author name"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-200/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-xl transition-all"
            />
          </div>

          {/* Voice Selection */}
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">
              <Mic className="w-4 h-4 inline mr-2" />
              Voice
            </label>
            <select
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-xl transition-all"
            >
              {/* Group voices by provider */}
              {availableVoices.length > 0 && (
                <>
                  <optgroup label="Natural AI Voices (FREE)">
                    {naturalVoiceList.map(v => (
                      <option key={v.value} value={v.value} className="bg-slate-800">
                        {v.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="OpenAI Voices">
                    {openaiVoiceList.map(v => (
                      <option key={v.value} value={v.value} className="bg-slate-800">
                        {v.label}
                      </option>
                    ))}
                  </optgroup>
                  {cloneVoiceList.length > 0 && (
                    <optgroup label="Cloned Voices (Your Voice)">
                      {cloneVoiceList.map(v => (
                        <option key={v.value} value={v.value} className="bg-slate-800">
                          {v.label}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {browserVoiceList.length > 0 && (
                    <optgroup label="Browser Voices (Client Only)">
                      {browserVoiceList.map(v => (
                        <option key={v.value} value={v.value} className="bg-slate-800">
                          {v.label}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </>
              )}
            </select>
            <p className="text-xs text-purple-200/70 mt-2">
              Note: Browser voices are client-only and will not be used for server-side audiobook generation. If you select a browser voice, a similar server voice will be used instead.
            </p>

            {/* Display a quick voice guide grid */}
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-purple-200 mb-2">Choose Natural AI Voice (FREE)</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {naturalVoiceList.slice(0, 12).map(v => (
                  <div
                    key={v.value}
                    role="button"
                    onClick={() => setVoice(v.value)}
                    className={`bg-white/5 p-2 rounded-lg text-sm text-left cursor-pointer transition-all ${
                      voice === v.value ? 'ring-2 ring-purple-500 bg-white/10' : ''
                    }`}
                  >
                    <div className="font-semibold">{v.gender === 'male' ? '👨 ' : v.gender === 'female' ? '👩 ' : ''}{v.displayName}</div>
                    <div className="text-xs text-purple-200/60">{v.description}</div>
                  </div>
                ))}
              </div>

              {openaiVoiceList.length > 0 && (
                <>
                  <h4 className="text-sm font-semibold text-purple-200 mt-4 mb-2">OpenAI Voices</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {openaiVoiceList.map(v => (
                      <div
                        key={v.value}
                        role="button"
                        onClick={() => setVoice(v.value)}
                        className={`bg-white/5 p-2 rounded-lg text-sm text-left cursor-pointer transition-all ${
                          voice === v.value ? 'ring-2 ring-purple-500 bg-white/10' : ''
                        }`}
                      >
                        <div className="font-semibold">👨 {v.displayName}</div>
                        <div className="text-xs text-purple-200/60">{v.description}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-purple-200/70 mt-2">Note: OpenAI voices require server-side OpenAI TTS provider and API key to be configured.</p>
                </>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 backdrop-blur-xl border border-red-400/30 text-red-300 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Upload Progress */}
          {uploading && uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-purple-200">
                <span>Uploading file...</span>
                <span className="font-bold">{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-purple-900/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-purple-300/70">
                Large files may take several minutes to upload
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!file || uploading}
            className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all shadow-lg ${
              !file || uploading
                ? 'bg-white/10 cursor-not-allowed border border-white/20'
                : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 hover:shadow-purple-500/50 hover:scale-105'
            }`}
          >
            {uploading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {uploadProgress < 100 ? `Uploading ${uploadProgress}%...` : 'Starting conversion...'}
              </span>
            ) : (
              'Create Audiobook'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AudiobookUploader;
