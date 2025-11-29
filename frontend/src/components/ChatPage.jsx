import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Square, Loader, Menu, Plus, MessageSquare, Trash2, ArrowLeft, Image as ImageIcon, X, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import luminoAPI from '../services/api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
import ProfileSettings from './ProfileSettings';

// Get authenticated user ID from localStorage
const getUserId = () => {
  const userData = localStorage.getItem('user');
  if (userData) {
    try {
      const user = JSON.parse(userData);
      return user.id; // Use authenticated user ID
    } catch (e) {
      console.error('Failed to parse user data:', e);
    }
  }
  
  // Fallback to generated ID (shouldn't happen if protected route works)
  let userId = localStorage.getItem('lumino_user_id');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('lumino_user_id', userId);
  }
  return userId;
};

const TextChat = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('alloy');
  const [volumeLevel, setVolumeLevel] = useState(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const volumeIntervalRef = useRef(null);
  const [showTrimSuggestion, setShowTrimSuggestion] = useState(false);
  const [selectedTone, setSelectedTone] = useState('neutral');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [thinkingStatus, setThinkingStatus] = useState('');
  const [typingText, setTypingText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatSessions, setChatSessions] = useState([]);
  const [chatQuery, setChatQuery] = useState('');
  const [currentChatId, setCurrentChatId] = useState(null);
  const [userId] = useState(getUserId()); // Authenticated user ID for conversation history
  const [selectedImage, setSelectedImage] = useState(null); // For image upload
  const [imagePreview, setImagePreview] = useState(null); // For image preview
  const [siteUrl, setSiteUrl] = useState('');
  const [showProfileSettings, setShowProfileSettings] = useState(false); // Profile settings modal
  const [showGallery, setShowGallery] = useState(false);
  const [galleryImages, setGalleryImages] = useState([]); // {id, dataUrl, caption, timestamp}
  const [sidebarView, setSidebarView] = useState('chats'); // 'chats' or 'gallery'
  const [mainView, setMainView] = useState('chat'); // 'chat' or 'gallery' - controls main area
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const fileInputRef = useRef(null);
  const lastFailedInputRef = useRef(null);
  const [expandedMessages, setExpandedMessages] = useState(new Set());
  // Typing suggestions (populated from historical chats + sensible fallbacks)
  const [historySuggestions, setHistorySuggestions] = useState([
    'Summarize this text',
    "Explain like I'm five",
    'Draft an email reply',
    'Analyze my website',
    'Create a lesson plan',
    'Fix this code',
    'Translate to Spanish',
    'Write a short bio',
  ]);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionAbove, setSuggestionAbove] = useState(false);
  const composerRef = useRef(null);

  // Recompute history-based suggestions by scanning localStorage for `luminoChats_` keys
  useEffect(() => {
    const compute = () => {
      try {
        const counts = new Map();
        const lastSeen = new Map();
        const now = Date.now();

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key) continue;
          if (key.startsWith('luminoChats_') || key === 'luminoChats') {
            try {
              const v = localStorage.getItem(key);
              if (!v) continue;
              const sessions = JSON.parse(v);
              if (!Array.isArray(sessions)) continue;
              sessions.forEach((chat) => {
                // Title as suggestion
                if (chat.title) {
                  const text = (chat.title || '').trim();
                  if (text) {
                    const k = text.toLowerCase();
                    counts.set(k, (counts.get(k) || 0) + 1);
                    lastSeen.set(k, Math.max(lastSeen.get(k) || 0, new Date(chat.timestamp || now).getTime()));
                  }
                }
                // Messages as candidates (recent ones) - only use user messages (exclude AI responses)
                if (Array.isArray(chat.messages)) {
                  const recent = chat.messages.slice(-6);
                  recent.forEach(msg => {
                    if (msg.role !== 'user') return; // skip assistant messages
                    const c = (msg.content || '').trim();
                    if (!c) return;
                    // prefer short/representative phrasing: truncate to 140 chars
                    const snippet = c.length > 140 ? c.slice(0, 137) + '...' : c;
                    const k = snippet.toLowerCase();
                    counts.set(k, (counts.get(k) || 0) + 1);
                    lastSeen.set(k, Math.max(lastSeen.get(k) || 0, new Date(msg.timestamp || now).getTime()));
                  });
                }
              });
            } catch (e) {
              // ignore parse errors for unrelated keys
            }
          }
        }

        // Build array sorted by count then recency
        const items = Array.from(counts.keys()).map(k => ({ text: k, count: counts.get(k), last: lastSeen.get(k) || 0 }));
        items.sort((a, b) => {
          if (b.count !== a.count) return b.count - a.count;
          return b.last - a.last;
        });
        const top = items.slice(0, 30).map(i => i.text);
        if (top.length) setHistorySuggestions(prev => {
          // preserve original casing where possible: prefer prev entries that match case-insensitively
          const mapped = top.map(t => {
            const found = prev.find(p => p.toLowerCase() === t);
            return found || t;
          });
          return mapped;
        });
      } catch (e) {
        console.error('Failed to compute history suggestions:', e);
      }
    };

    compute();
    // Also recompute when localStorage changes in this tab (storage event doesn't fire in same tab)
    const interval = setInterval(compute, 5000);
    return () => clearInterval(interval);
  }, [userId]);

  const toggleExpanded = (id) => {
    setExpandedMessages(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const linkify = (text) => {
    if (!text) return text;
    // Simple URL regex
    const urlRegex = /(https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+)|(www\.[\w\-._~:/?#[\]@!$&'()*+,;=%]+)/g;
    const parts = text.split(urlRegex).filter(Boolean);
    return parts.map((part, i) => {
      if (urlRegex.test(part)) {
        const href = part.startsWith('http') ? part : `http://${part}`;
        return <a key={i} href={href} target="_blank" rel="noreferrer" className="text-blue-300 underline">{part}</a>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const renderMessageContent = (message, index) => {
    const id = `${message.timestamp || index}-${index}`;
    const raw = message.content || '';
    // Handle code blocks (```)
    if (raw.includes('```')) {
      const segments = raw.split(/```/g);
      return segments.map((seg, i) => {
        if (i % 2 === 1) {
          return (
            <pre key={i} className="bg-slate-900 text-sm p-3 rounded-md overflow-auto max-h-64"><code className="font-mono">{seg}</code></pre>
          );
        }
        // linkify normal text segments
        return <div key={i} className="whitespace-pre-wrap">{linkify(seg)}</div>;
      });
    }

    // Long text: show truncated with toggle
    const LIMIT = 400;
    if (raw.length > LIMIT && !expandedMessages.has(id)) {
      const short = raw.slice(0, LIMIT) + '...';
      return (
        <div>
          <div className="whitespace-pre-wrap">{linkify(short)}</div>
          <button onClick={() => toggleExpanded(id)} className="mt-2 text-sm text-blue-300">Show more</button>
        </div>
      );
    }

    // Expanded or short
    return (
      <div>
        <div className="whitespace-pre-wrap break-words">{linkify(raw)}</div>
        {raw.length > LIMIT && (
          <button onClick={() => toggleExpanded(id)} className="mt-2 text-sm text-blue-300">{expandedMessages.has(id) ? 'Show less' : 'Show more'}</button>
        )}
      </div>
    );
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Initialize first chat on mount and load saved sessions
  useEffect(() => {
    // Load saved chat sessions from localStorage (per user)
    const chatKey = `luminoChats_${userId}`;
    const savedSessions = localStorage.getItem(chatKey);
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        // Validate the data isn't too large
        if (JSON.stringify(parsed).length > 500000) { // ~500KB limit
          console.warn('Saved chats too large, clearing...');
          localStorage.removeItem(chatKey);
          setChatSessions([]);
        } else {
          setChatSessions(parsed);
        }
      } catch (e) {
        console.error('Failed to load saved chats, clearing:', e);
        localStorage.removeItem(chatKey);
        setChatSessions([]);
      }
    }

    // Initialize first chat if none exists
    if (!currentChatId) {
      setCurrentChatId(Date.now().toString());
    }
  }, [userId]);

  // Track mobile breakpoint to show overlay behavior
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Load available TTS voices from backend
  useEffect(() => {
    (async () => {
      try {
        const res = await luminoAPI.getVoices();
        // res.voices expected as object map
        if (res && res.voices) {
          const list = Object.keys(res.voices).map(k => ({ id: k, name: res.voices[k].name || k }));
          setAvailableVoices(list);
          if (list.length && !selectedVoice) setSelectedVoice(list[0].id);
        }
      } catch (e) {
        console.warn('Failed to load voices:', e);
      }
    })();
  }, []);

  // Save chat sessions to localStorage whenever they change (per user)
  useEffect(() => {
    if (chatSessions.length > 0) {
      try {
        const chatKey = `luminoChats_${userId}`;
        // Limit to last 15 chats and truncate message content to save space
        const limitedSessions = chatSessions.slice(-15).map(chat => ({
          ...chat,
          messages: chat.messages.slice(-10).map(msg => ({
            ...msg,
            // Truncate long content to save space
            content: msg.content?.length > 500 ? msg.content.slice(0, 500) + '...' : msg.content,
            // Remove image data from storage (too large)
            image: undefined
          }))
        }));
        
        localStorage.setItem(chatKey, JSON.stringify(limitedSessions));
      } catch (e) {
        console.error('Failed to save chats (quota exceeded):', e);
        // More aggressive cleanup
        try {
          const limitedSessions = chatSessions.slice(-5).map(chat => ({
            id: chat.id,
            title: chat.title,
            timestamp: chat.timestamp,
            messages: [] // Don't save messages in emergency mode
          }));
          localStorage.setItem('luminoChats', JSON.stringify(limitedSessions));
        } catch (e2) {
          console.error('Still failed, clearing all chats');
          localStorage.removeItem('luminoChats');
          setChatSessions([]);
        }
      }
    }
  }, [chatSessions]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-save current chat session when messages change
  useEffect(() => {
    if (messages.length > 0 && currentChatId) {
      saveCurrentChat();
    }
  }, [messages]);

  const saveCurrentChat = async () => {
    if (messages.length === 0) return;

    // Generate smart title based on conversation
    let chatTitle = 'New Chat';
    
    try {
      // Get first user message and first AI response for context
      const firstUserMsg = messages.find(m => m.role === 'user');
      const firstAiMsg = messages.find(m => m.role === 'assistant');
      
      if (firstUserMsg && firstAiMsg) {
        // Build conversation context (last 4 messages for better context)
        const recentMessages = messages.slice(-4).map(m => ({
          role: m.role,
          content: m.content.slice(0, 200) // Limit content length
        }));
        
        // Use Promise.race to timeout after 5 seconds
        const titlePromise = luminoAPI.generateTitle(
          firstUserMsg.content.slice(0, 200),
          firstAiMsg?.content.slice(0, 200),
          recentMessages
        );
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        );
        
        const titleResponse = await Promise.race([titlePromise, timeoutPromise]);
        chatTitle = titleResponse.title || chatTitle;
      } else {
        // Fallback to first message
        chatTitle = messages[0]?.content?.slice(0, 40) + '...' || 'New Chat';
      }
    } catch (error) {
      if (error.message !== 'Timeout') {
        console.error('Error generating title:', error);
      }
      // Fallback to simple title
      const firstMsg = messages.find(m => m.role === 'user');
      chatTitle = firstMsg?.content?.slice(0, 40) + '...' || 'New Chat';
    }

    const timestamp = new Date().toISOString();

    setChatSessions(prev => {
      const existingIndex = prev.findIndex(chat => chat.id === currentChatId);
      const chatData = {
        id: currentChatId,
        title: chatTitle,
        messages: messages,
        timestamp: timestamp,
        tone: selectedTone
      };

      if (existingIndex >= 0) {
        // Update existing chat
        const updated = [...prev];
        updated[existingIndex] = chatData;
        return updated;
      } else {
        // Add new chat
        return [chatData, ...prev];
      }
    });
  };

  const handleNewChat = () => {
    // Save current chat if it has messages
    if (messages.length > 0) {
      saveCurrentChat();
    }
    
    // Start fresh chat
    setMessages([]);
    setCurrentChatId(Date.now().toString());
    setInputText('');
    setThinkingStatus('');
    setTypingText('');
    setIsTyping(false);
  };

  const loadChat = (chatId) => {
    const chat = chatSessions.find(c => c.id === chatId);
    if (chat) {
      setMessages(chat.messages);
      setCurrentChatId(chat.id);
      setSelectedTone(chat.tone || 'neutral');
      // Mark chat as opened (store last-opened timestamp)
      try {
        localStorage.setItem(`luminoChats_lastOpen_${chat.id}`, new Date().toISOString());
      } catch (e) {
        // ignore
      }
    }
  };

  const deleteChat = (chatId, e) => {
    e.stopPropagation();
    setChatSessions(prev => prev.filter(chat => chat.id !== chatId));
    if (currentChatId === chatId) {
      handleNewChat();
    }
  };

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        // Save preview image into user's gallery (persist)
        try {
          const galleryKey = `luminoImages_${userId}`;
          const prev = JSON.parse(localStorage.getItem(galleryKey) || '[]');
          const entry = { id: `img_${Date.now()}_${Math.random().toString(36).slice(2,8)}`, dataUrl: reader.result, caption: '', timestamp: new Date().toISOString() };
          prev.unshift(entry);
          // limit gallery to last 200 images
          localStorage.setItem(galleryKey, JSON.stringify(prev.slice(0,200)));
          setGalleryImages(prev.slice(0,200));

          // Also attempt to upload to server for persistence
          (async () => {
            try {
              const resp = await luminoAPI.uploadImage(file, userId);
              if (resp && resp.success && resp.url) {
                const serverUrl = `${API_BASE}${resp.url}`;
                // update the stored entry to include server metadata
                const updated = JSON.parse(localStorage.getItem(galleryKey) || '[]');
                const idx = updated.findIndex(x => x.id === entry.id);
                if (idx >= 0) {
                  updated[idx].serverUrl = serverUrl;
                  updated[idx].serverFilename = resp.filename;
                  localStorage.setItem(galleryKey, JSON.stringify(updated.slice(0,200)));
                  setGalleryImages(updated.slice(0,200));
                }
              }
            } catch (e) {
              // upload failed - keep local copy
              console.warn('Server upload failed for image:', e);
            }
          })();
        } catch (e) {
          console.warn('Failed to save image to gallery:', e);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Load gallery images from localStorage for current user
  useEffect(() => {
    try {
      const galleryKey = `luminoImages_${userId}`;
      const items = JSON.parse(localStorage.getItem(galleryKey) || '[]');
      if (Array.isArray(items)) setGalleryImages(items.slice(0,200));
    } catch (e) {
      // ignore
    }
  }, [userId]);

  const saveImageToGallery = async (dataUrl, caption = '') => {
    try {
      const galleryKey = `luminoImages_${userId}`;
      const prev = JSON.parse(localStorage.getItem(galleryKey) || '[]');
      const entry = { id: `img_${Date.now()}_${Math.random().toString(36).slice(2,8)}`, dataUrl, caption, timestamp: new Date().toISOString() };
      prev.unshift(entry);
      localStorage.setItem(galleryKey, JSON.stringify(prev.slice(0,200)));
      setGalleryImages(prev.slice(0,200));
      return entry;
    } catch (e) {
      console.warn('Failed to save image to gallery:', e);
      return null;
    }
  };

  const deleteGalleryImage = (id) => {
    try {
      const galleryKey = `luminoImages_${userId}`;
      const prev = JSON.parse(localStorage.getItem(galleryKey) || '[]');
      const entry = prev.find(x => x.id === id);
      const next = prev.filter(x => x.id !== id);
      localStorage.setItem(galleryKey, JSON.stringify(next));
      setGalleryImages(next);

      // If this image was uploaded to the server, attempt server-side delete
      if (entry && entry.serverFilename) {
        (async () => {
          try {
            await luminoAPI.deleteUserImage(userId, entry.serverFilename);
          } catch (e) {
            console.warn('Failed to delete server-side image:', e);
          }
        })();
      }
    } catch (e) {
      console.warn('Failed to delete gallery image:', e);
    }
  };

  const downloadImage = (dataUrl, name = 'image.png') => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Heuristic to detect if the composer text is a URL / domain
  const isLikelyUrl = (text) => {
    if (!text) return false;
    const t = text.trim();
    if (/^https?:\/\//i.test(t)) return true;
    // simple domain-like heuristic: no spaces and contains a dot with at least 2 chars after
    if (!/\s/.test(t) && /^[^\s]+\.[^\s]{2,}$/.test(t)) return true;
    return false;
  };

  const handleSendText = async () => {
    if ((!inputText.trim() && !selectedImage) || isProcessing) return;

    // Handle image message
    if (selectedImage) {
      const userMessage = {
        role: 'user',
        content: inputText.trim() || 'Analyze this image',
        image: imagePreview,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, userMessage]);
      const currentInput = inputText.trim() || "What's in this image? Describe it in detail.";
      const currentImage = selectedImage;
      
      setInputText('');
      removeImage();
      setIsProcessing(true);
      setThinkingStatus('Analyzing image...');

      try {
        const response = await luminoAPI.analyzeImage(currentImage, currentInput, userId);
        
        setThinkingStatus('');
        setIsTyping(true);
        
        const fullText = response.answer;
        let currentIndex = 0;
        
        const typingInterval = setInterval(() => {
          if (currentIndex < fullText.length) {
            setTypingText(fullText.slice(0, currentIndex + 1));
            currentIndex++;
          } else {
            clearInterval(typingInterval);
            setIsTyping(false);
            setTypingText('');
            
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: fullText,
              timestamp: new Date().toISOString(),
              tone: selectedTone,
            }]);
          }
        }, 30);
        
      } catch (error) {
        console.error('Image analysis error:', error);
        setThinkingStatus('');
        setIsTyping(false);
        setTypingText('');
        
        let errorMessage = 'Error analyzing image';
        
        if (error.code === 'ECONNABORTED') {
          errorMessage = '⏱️ Image analysis timed out. This could mean:\n\n' +
            '1. The Google API key is not configured in the backend\n' +
            '2. The image is too large or complex\n' +
            '3. Network connectivity issues\n\n' +
            '💡 Check backend logs and ensure GOOGLE_API_KEY is set in backend/.env';
        } else if (error.response?.data?.detail) {
          errorMessage = error.response.data.detail;
          
          // If API key error, provide helpful link
          if (errorMessage.includes('API key') || errorMessage.includes('GOOGLE_API_KEY')) {
            errorMessage += '\n\n🔑 Get a FREE Google API key at:\nhttps://aistudio.google.com/app/apikey';
          }
        } else {
          errorMessage = `Error analyzing image: ${error.message || 'Unknown error'}`;
        }
        
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: errorMessage,
          timestamp: new Date().toISOString(),
          isError: true,
        }]);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // Handle text-only message or website analysis
    if (!inputText.trim()) return;

    const currentInput = inputText.trim();

    // If the input looks like a URL or domain, treat it as an analyze request
    if (isLikelyUrl(currentInput)) {
      setIsProcessing(true);
      setThinkingStatus('Analyzing website...');
      // Append user message
      const userMsg = {
        role: 'user',
        content: `Analyze website: ${currentInput}`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, userMsg]);
      setInputText('');
      try {
        const res = await luminoAPI.analyzeWebsite(currentInput);
        const analysisText = res.analysis_text || '';
        const findings = res.findings || null;
        const assistantMsg = {
          role: 'assistant',
          content: analysisText,
          timestamp: new Date().toISOString(),
          findings: findings,
        };
        setMessages(prev => [...prev, assistantMsg]);
      } catch (err) {
        console.error('Analyze site error:', err);
        const msg = err.response?.data?.detail || err.message || 'Failed to analyze site';
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Error analyzing site: ${msg}`,
          timestamp: new Date().toISOString(),
          isError: true,
        }]);
      } finally {
        setIsProcessing(false);
        setThinkingStatus('');
      }
      return;
    }

    const userMessage = {
      role: 'user',
      content: currentInput,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsProcessing(true);
    setThinkingStatus('Thinking...');

    try {
      console.log('Sending text to API:', currentInput);
      console.log('User ID:', userId);
      
      // Build conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      const response = await luminoAPI.getTextResponse(
        currentInput, 
        selectedTone, 
        userId,  // Pass user ID for long-term memory
        conversationHistory
      );
      console.log('Received response:', response);
      
      setThinkingStatus('');
      setIsTyping(true);
      
      // Typing animation effect
      const fullText = response.response_text;
      let currentIndex = 0;
      
      const typingInterval = setInterval(() => {
        if (currentIndex < fullText.length) {
          setTypingText(fullText.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(typingInterval);
          setIsTyping(false);
          setTypingText('');
          
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: fullText,
            timestamp: new Date().toISOString(),
            tone: selectedTone,
          }]);
        }
      }, 30); // 30ms per character for smooth typing effect
      
    } catch (error) {
      console.error('Error details:', error);
      console.error('Error response:', error.response?.data);
      setThinkingStatus('');
      setIsTyping(false);
      setTypingText('');
      const status = error.response?.status;
      let message = error.response?.data?.detail || error.message || 'Unknown error';
      // Save failed input for a possible trimmed retry
      lastFailedInputRef.current = currentInput;
      setShowTrimSuggestion(false);
      // If server returned an HTML error page, treat as service unavailable
      if (typeof error.response?.data === 'string' && error.response.data.includes('<!DOCTYPE')) {
        message = 'The AI service is temporarily unavailable. Please try again later.';
      }
      if (status === 503) {
        message = 'The AI service is currently unavailable (503). Please try again in a few minutes.';
      }
      // If token / payload was too large, offer to trim local history and retry
      if (status === 413) {
        message = 'The AI request is too large for the model (413). Try shortening your message or trimming conversation history.';
        setShowTrimSuggestion(true);
      }
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${message}`,
        timestamp: new Date().toISOString(),
        isError: true,
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const trimHistoryAndRetry = async () => {
    if (!lastFailedInputRef.current) return;
    // Keep only last user message (or none) to reduce token usage
    const lastUser = messages.slice().reverse().find(m => m.role === 'user');
    const trimmed = lastUser ? [lastUser] : [];
    setMessages(trimmed);
    setShowTrimSuggestion(false);

    // Retry the request with trimmed history
    setIsProcessing(true);
    setThinkingStatus('Retrying with trimmed history...');
    try {
      const response = await luminoAPI.getTextResponse(
        lastFailedInputRef.current,
        selectedTone,
        userId,
        trimmed
      );

      setThinkingStatus('');
      setIsTyping(true);

      const fullText = response.response_text;
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: fullText,
        timestamp: new Date().toISOString(),
        tone: selectedTone,
      }]);
    } catch (err) {
      console.error('Retry failed:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Retry failed. Please shorten your message and try again.',
        timestamp: new Date().toISOString(),
        isError: true,
      }]);
    } finally {
      setIsProcessing(false);
      lastFailedInputRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        // stop analyser and audio context
        try {
          if (volumeIntervalRef.current) clearInterval(volumeIntervalRef.current);
          if (analyserRef.current) analyserRef.current.disconnect();
          if (audioContextRef.current) audioContextRef.current.close();
        } catch (e) {
          // ignore
        }
        await handleVoiceMessage(audioBlob);
      };

      mediaRecorder.start(100);
      setIsRecording(true);

      // Start simple volume meter using WebAudio API
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        const data = new Uint8Array(analyser.frequencyBinCount);
        volumeIntervalRef.current = setInterval(() => {
          analyser.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i];
          const avg = sum / data.length;
          // normalize 0..1
          setVolumeLevel(Math.min(1, avg / 128));
        }, 100);
      } catch (e) {
        console.warn('Volume meter init failed:', e);
      }
    } catch (error) {
      console.error('Microphone error:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleVoiceMessage = async (audioBlob) => {
    setIsProcessing(true);

    try {
      const result = await luminoAPI.voiceRoundtripWithVoice(audioBlob, selectedTone, 'en', userId, selectedVoice);
      
      setMessages(prev => [...prev, 
        {
          role: 'user',
          content: result.userText,
          timestamp: new Date().toISOString(),
          hasAudio: true,
        },
        {
          role: 'assistant',
          content: result.responseText,
          timestamp: new Date().toISOString(),
          tone: selectedTone,
          hasAudio: true,
          audioBlob: result.audio,
        }
      ]);

      // Auto-play audio response
      if (result.audio) {
        const audioUrl = URL.createObjectURL(result.audio);
        const audio = new Audio(audioUrl);
        const playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(err => {
            console.warn('Auto-play audio error:', err);
          });
        }
      }
    } catch (error) {
      console.error('Voice error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I could not process your voice message.',
        timestamp: new Date().toISOString(),
        isError: true,
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const handleKeyDown = (e) => {
    // Keyboard navigation for suggestions
    const q = inputText.trim();
    const filtered = q ? historySuggestions.filter(s => s.toLowerCase().includes(q.toLowerCase())).slice(0, 6) : [];
    if (filtered.length > 0 && showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestionIndex(i => Math.min(i + 1, filtered.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestionIndex(i => Math.max(i - 1, 0));
        return;
      }
      if ((e.key === 'Enter' || e.key === 'Tab') && suggestionIndex >= 0) {
        e.preventDefault();
        const picked = filtered[suggestionIndex];
        setInputText(picked);
        setShowSuggestions(false);
        setSuggestionIndex(-1);
        // focus back to composer
        setTimeout(() => composerRef.current?.focus(), 0);
        return;
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        setSuggestionIndex(-1);
        return;
      }
    }
  };

  return (
    <div className="chat-container">
      <div className="flex h-screen">
        {/* Sidebar */}
        {sidebarOpen && (
          <>
            {isMobile && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
            <div className="chat-sidebar">
            <div className="p-4 border-b border-blue-900/50">
              <div className="flex gap-2">
                <button 
                  onClick={handleNewChat}
                  className="flex-1 flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                >
                  <Plus className="w-5 h-5" />
                  <span>New Chat</span>
                </button>
                <button
                  onClick={() => { setMainView('gallery'); if (isMobile) setSidebarOpen(false); }}
                  className="p-3 rounded-lg bg-slate-800/40 hover:bg-slate-800/60 flex items-center gap-2"
                  title="Open gallery in main area"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-image"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="M21 15l-5-5L5 21"></path></svg>
                </button>
              </div>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto">
              {sidebarView === 'chats' ? (
                <>
                  <div className="mb-3">
                    <div className="text-sm text-blue-400 mb-2">Recent Chats</div>
                    <input
                      type="search"
                      value={chatQuery}
                      onChange={(e) => setChatQuery(e.target.value)}
                      placeholder="Search chats..."
                      className="w-full px-3 py-2 bg-slate-900 border border-blue-800/40 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  {chatSessions.length === 0 ? (
                    <div className="text-xs text-blue-400/50 italic text-center py-4">
                      No previous chats
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {chatSessions
                        .filter(chat => {
                          if (!chatQuery) return true;
                          const q = chatQuery.toLowerCase();
                          return (chat.title || '').toLowerCase().includes(q) || (chat.messages || []).some(m => (m.content || '').toLowerCase().includes(q));
                        })
                        .map((chat) => (
                        <div
                          key={chat.id}
                          onClick={() => loadChat(chat.id)}
                          className={`p-3 rounded-lg cursor-pointer transition group relative ${
                            currentChatId === chat.id
                              ? 'bg-blue-600/20 border border-blue-600'
                              : 'bg-slate-800/50 hover:bg-slate-800 border border-transparent'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">
                                {chat.title}
                              </div>
                              <div className="text-xs text-blue-400/70 mt-1 flex items-center justify-between">
                                <div className="min-w-0 truncate">
                                  {chat.messages && chat.messages.length > 0 ? (
                                    <span className="opacity-80">{(chat.messages[chat.messages.length-1].content || '').slice(0, 60)}</span>
                                  ) : (
                                    <span className="opacity-50 italic">No messages</span>
                                  )}
                                </div>
                                <div className="ml-2 text-xs text-blue-300">
                                  {chat.timestamp ? new Date(chat.timestamp).toLocaleDateString() : ''}
                                </div>
                              </div>
                              <div className="text-xs text-blue-400/70 mt-1">
                                {chat.messages.length} messages
                              </div>
                              
                              {/* Unread indicator: compare last message time to last-open */}
                              {(() => {
                                try {
                                  const lastMsg = chat.messages && chat.messages.length ? chat.messages[chat.messages.length-1].timestamp : null;
                                  const lastOpen = localStorage.getItem(`luminoChats_lastOpen_${chat.id}`);
                                  if (lastMsg && (!lastOpen || new Date(lastMsg) > new Date(lastOpen))) {
                                    return <div className="inline-block mt-2 px-2 py-0.5 bg-amber-500 text-amber-900 text-xs rounded-full">New</div>;
                                  }
                                } catch (e) {
                                  return null;
                                }
                                return null;
                              })()}
                            </div>
                            <button
                              onClick={(e) => deleteChat(chat.id, e)}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-600/20 rounded transition"
                              title="Delete chat"
                            >
                              <Trash2 className="w-3 h-3 text-red-400" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="mb-3">
                    <div className="text-sm text-blue-400 mb-2">Image Gallery</div>
                    <div className="text-xs text-blue-400/60 mb-2">Stored images for this account</div>
                  </div>
                  {galleryImages.length === 0 ? (
                    <div className="text-xs text-blue-400/50 italic text-center py-4">No images yet</div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {galleryImages.map(img => (
                        <div key={img.id} className="bg-slate-900/60 rounded-md overflow-hidden">
                          <img src={img.dataUrl} alt={img.caption || 'Uploaded'} className="w-full h-24 object-cover" />
                          <div className="p-2 flex items-center justify-between gap-2">
                            <button className="px-2 py-1 text-xs bg-blue-600 rounded" onClick={() => {
                              setImagePreview(img.dataUrl);
                              setSelectedImage(null);
                              // keep sidebar open with chats view or stay in gallery - keep gallery open
                            }}>Insert</button>
                            <button className="px-2 py-1 text-xs bg-emerald-600 rounded" onClick={() => downloadImage(img.dataUrl, `${img.id}.png`)}>Download</button>
                            <button className="px-2 py-1 text-xs bg-red-600 rounded" onClick={() => deleteGalleryImage(img.id)}>Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-4 border-t border-blue-900/50">
              <div className="text-xs text-blue-400">Tone: {selectedTone}</div>
              <select 
                value={selectedTone}
                onChange={(e) => setSelectedTone(e.target.value)}
                className="w-full mt-2 px-3 py-2 bg-slate-800 border border-blue-800 rounded-lg text-sm focus:outline-none focus:border-blue-600"
              >
                <option value="calm">Calm</option>
                <option value="neutral">Neutral</option>
                <option value="energetic">Energetic</option>
              </select>
              
            </div>
            </div>
          </>
        )}

        {/* Main Chat Area */}
        <div className="chat-main">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-blue-900/50 bg-slate-950">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/')}
                className="p-2 hover:bg-blue-900/30 rounded-lg transition"
                title="Back to home"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-blue-900/30 rounded-lg transition"
                title="Toggle sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <span className="font-semibold">Text Chat</span>
              </div>
            </div>
            
            {/* Profile Settings Button */}
            <button
              onClick={() => setShowProfileSettings(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg transition-all"
              title="Profile Settings"
            >
              <Settings className="w-5 h-5" />
              <span className="hidden sm:inline">Settings</span>
            </button>
            
          </div>

          {/* Messages */}
            <div className="chat-messages custom-scrollbar">
              {mainView === 'chat' ? (
                <>
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center mb-4">
                        <MessageSquare className="w-8 h-8" />
                      </div>
                      <h2 className="text-2xl font-bold mb-2">Welcome to Lumino AI</h2>
                      <p className="text-blue-400">Start a conversation or use voice input</p>
                      <div className="sample-prompts max-w-xl mt-6">
                        <div className="flex gap-2 justify-center flex-wrap">
                          {['Summarize this text', 'Explain like I\'m five', 'Draft an email reply', 'Analyze my website'].map((p) => (
                            <button
                              key={p}
                              onClick={() => setInputText(p)}
                              className="px-3 py-2 bg-slate-800/60 border border-blue-800 rounded-full text-sm hover:bg-slate-800/80 transition"
                              aria-label={`Insert sample prompt: ${p}`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} group`}
                      >
                        <div className="flex items-end">
                          {message.role !== 'user' && (
                            <div className="message-avatar mr-3" title="Lumino AI"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-robot"><rect x="3" y="7" width="18" height="11" rx="2" ry="2"></rect><path d="M7 14v.01"></path><path d="M17 14v.01"></path><path d="M12 7v-4"></path></svg></div>
                          )}
                          <div className={message.role === 'user' ? 'message-user' : 'message-assistant'}>
                            <div className="flex items-center justify-between">
                              <div className="text-sm opacity-70 mb-1">
                                {message.role === 'user' ? 'You' : 'Lumino AI'}
                                {message.tone && <span className="ml-2 text-xs">({message.tone})</span>}
                              </div>
                              <div className="message-actions">
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try { await navigator.clipboard.writeText(message.content || ''); alert('Copied'); } catch (err) { console.warn(err); }
                                  }}
                                  className="message-action-btn"
                                  title="Copy"
                                  aria-label="Copy message"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                </button>
                                {message.hasAudio && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (message.audioBlob) {
                                        const url = URL.createObjectURL(message.audioBlob);
                                        const a = new Audio(url);
                                        a.play().catch(() => {});
                                      }
                                    }}
                                    className="message-action-btn"
                                    title="Play audio"
                                    aria-label="Play audio"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-play"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                  </button>
                                )}
                              </div>
                            </div>

                            {message.image && (
                              <div className="mb-2">
                                <img
                                  src={message.image}
                                  alt="Uploaded"
                                  className="max-w-xs rounded-lg border border-blue-500/30"
                                />
                              </div>
                            )}

                            <div className="message-content">
                              {renderMessageContent(message, index)}
                            </div>

                            <div className="message-meta">
                              <span title={new Date(message.timestamp).toString()}>{new Date(message.timestamp).toLocaleTimeString()}</span>
                              {message.isError && <span className="text-yellow-400">• Error</span>}
                              {message.hasAudio && <span className="text-blue-400">• Voice</span>}
                            </div>
                          </div>
                          {message.role === 'user' && (
                            <div className="message-avatar ml-3" title="You"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-user"><path d="M20 21v-2a4 4 0 0 0-3-3.87"></path><path d="M4 21v-2a4 4 0 0 1 3-3.87"></path><circle cx="12" cy="7" r="4"></circle></svg></div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  {thinkingStatus && (
                    <div className="flex justify-start">
                      <div className="message-assistant">
                        <div className="flex items-center gap-2">
                          <Loader className="w-4 h-4 animate-spin" />
                          <span className="text-blue-400 italic">{thinkingStatus}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {isTyping && typingText && (
                    <div className="flex justify-start">
                      <div className="message-assistant">
                        <div className="text-sm opacity-70 mb-1">
                          Lumino AI
                          <span className="ml-2 text-xs">({selectedTone})</span>
                        </div>
                        <div className="whitespace-pre-wrap">
                          {typingText}
                          <span className="inline-block w-1 h-4 bg-blue-400 ml-1 animate-pulse"></span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              ) : (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Image Gallery</h3>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setMainView('chat'); }} className="px-3 py-1 rounded bg-slate-800/50">Back to chat</button>
                    </div>
                  </div>
                  {galleryImages.length === 0 ? (
                    <div className="text-sm text-blue-400/60 italic">No images yet — upload images when asking a question and they'll appear here.</div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {galleryImages.map(img => {
                        const src = img.serverUrl || img.dataUrl;
                        return (
                          <div key={img.id} className="bg-slate-900/60 rounded-md overflow-hidden">
                            <img src={src} alt={img.caption || 'Uploaded'} className="w-full h-44 object-cover" />
                            <div className="p-2 flex items-center justify-between gap-2">
                              <button className="px-2 py-1 text-xs bg-blue-600 rounded" onClick={() => {
                                setImagePreview(src);
                                setSelectedImage(null);
                                setMainView('chat');
                              }}>Insert</button>
                              <button className="px-2 py-1 text-xs bg-emerald-600 rounded" onClick={() => downloadImage(src, `${img.id}.png`)}>Download</button>
                              <button className="px-2 py-1 text-xs bg-red-600 rounded" onClick={() => deleteGalleryImage(img.id)}>Delete</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

          {/* Input Area */}
          <div className="chat-input-area">
            {/* Image Preview */}
            {imagePreview && (
              <div className="max-w-4xl mx-auto mb-2 relative inline-block">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="max-h-32 rounded-lg border border-blue-500/50"
                />
                <button
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 p-1 bg-red-600 hover:bg-red-700 rounded-full transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="max-w-4xl mx-auto flex items-center gap-3">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={`p-3 rounded-lg transition ${
                  isRecording 
                    ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                    : 'bg-blue-600 hover:bg-blue-700'
                } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className={`p-3 rounded-lg transition bg-purple-600 hover:bg-purple-700 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Upload image"
              >
                <ImageIcon className="w-5 h-5" />
              </button>

              <div className="flex-1 flex items-center gap-2 bg-slate-800 border border-blue-800/50 rounded-lg px-4 py-2 focus-within:border-blue-600 relative">
                <textarea
                  ref={composerRef}
                  value={inputText}
                  onChange={(e) => {
                    const v = e.target.value;
                    setInputText(v);
                    const filtered = v.trim() ? historySuggestions.filter(s => s.toLowerCase().includes(v.trim().toLowerCase())).slice(0,6) : [];
                    setShowSuggestions(filtered.length > 0);
                    setSuggestionIndex(-1);
                    // decide whether to show suggestions above composer if there's little space below
                    try {
                      const rect = composerRef.current?.getBoundingClientRect();
                      if (rect) {
                        const spaceBelow = window.innerHeight - rect.bottom;
                        // if less than 220px below, place suggestions above
                        setSuggestionAbove(spaceBelow < 220);
                      }
                    } catch (err) {
                      // ignore
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  disabled={isProcessing}
                  rows={1}
                  className="flex-1 bg-transparent outline-none resize-none"
                />

                {showSuggestions && (() => {
                  const q = inputText.trim();
                  const filtered = q ? historySuggestions.filter(s => s.toLowerCase().includes(q.toLowerCase())).slice(0,6) : [];
                  if (!filtered.length) return null;
                  return (
                    <ul className={`typing-suggestions absolute left-3 right-3 z-50 ${suggestionAbove ? 'above' : 'below'}`}>
                      {filtered.map((s, i) => (
                        <li
                          key={s}
                          className={`typing-suggestion-item ${i === suggestionIndex ? 'typing-suggestion-active' : ''}`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setInputText(s);
                            setShowSuggestions(false);
                            setSuggestionIndex(-1);
                            setTimeout(() => composerRef.current?.focus(), 0);
                          }}
                        >
                          {s}
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>

              {/* Analyzer integrated into main composer; enter a URL to analyze */}

              <button
                onClick={handleSendText}
                disabled={!inputText.trim() || isProcessing}
                className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 disabled:opacity-50 rounded-lg transition"
              >
                <Send className="w-5 h-5" />
              </button>
              {/* Image generation button: uses current composer text as prompt */}
              <button
                onClick={async () => {
                  if (!inputText.trim()) return alert('Enter a prompt to generate an image');
                  try {
                    setIsProcessing(true);
                    setThinkingStatus('Generating image...');
                    const blob = await luminoAPI.generateImage(inputText.trim());
                    // append user message
                    setMessages(prev => [...prev, { role: 'user', content: inputText.trim(), timestamp: new Date().toISOString() }]);
                    // create object URL and append assistant image message
                    const url = URL.createObjectURL(blob);
                    setMessages(prev => [...prev, { role: 'assistant', content: 'Generated image', timestamp: new Date().toISOString(), image: url }]);
                    setInputText('');
                  } catch (err) {
                    console.error('Image generation error:', err);
                    setMessages(prev => [...prev, { role: 'assistant', content: 'Image generation failed.', timestamp: new Date().toISOString(), isError: true }]);
                  } finally {
                    setIsProcessing(false);
                    setThinkingStatus('');
                  }
                }}
                disabled={isProcessing}
                className="ml-2 p-2 bg-emerald-600 hover:bg-emerald-700 rounded-md text-sm"
                title="Generate image from prompt"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-palette"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              </button>
              {showTrimSuggestion && (
                <button
                  onClick={trimHistoryAndRetry}
                  disabled={isProcessing}
                  className="ml-2 p-2 bg-yellow-600 hover:bg-yellow-700 rounded-md text-sm"
                  title="Trim conversation history and retry the last message"
                >
                  Trim history & retry
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Website analysis is now posted into the chat as assistant messages */}
      
      {/* Profile Settings Modal */}
      <ProfileSettings 
        isOpen={showProfileSettings} 
        onClose={() => setShowProfileSettings(false)} 
      />

      {/* Gallery Modal */}
      {showGallery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowGallery(false)} />
          <div className="relative z-60 w-[90%] max-w-4xl max-h-[85vh] overflow-auto bg-slate-950 border border-blue-900/60 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Your Image Gallery</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowGallery(false)} className="px-3 py-1 rounded bg-slate-800/50">Close</button>
              </div>
            </div>

            {galleryImages.length === 0 ? (
              <div className="text-sm text-blue-400/60 italic">No images yet — upload images when asking a question and they'll appear here.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {galleryImages.map(img => (
                  <div key={img.id} className="bg-slate-900/60 rounded-md overflow-hidden relative">
                    <img src={img.dataUrl} alt={img.caption || 'Uploaded image'} className="w-full h-40 object-cover" />
                    <div className="p-2">
                      <div className="text-xs text-blue-300 truncate">{img.caption || new Date(img.timestamp).toLocaleString()}</div>
                      <div className="mt-2 flex items-center gap-2">
                        <button className="px-2 py-1 text-xs bg-blue-600 rounded" onClick={() => {
                          // insert image preview into composer
                          setImagePreview(img.dataUrl);
                          setSelectedImage(null);
                          setShowGallery(false);
                        }}>Insert</button>
                        <button className="px-2 py-1 text-xs bg-emerald-600 rounded" onClick={() => downloadImage(img.dataUrl, `${img.id}.png`)}>Download</button>
                        <button className="px-2 py-1 text-xs bg-red-600 rounded" onClick={() => deleteGalleryImage(img.id)}>Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TextChat;
