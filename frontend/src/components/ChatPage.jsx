import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Square, Loader, Menu, Plus, MessageSquare, Trash2, ArrowLeft, Image as ImageIcon, X, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import luminoAPI from '../services/api';
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
  const [showTrimSuggestion, setShowTrimSuggestion] = useState(false);
  const [selectedTone, setSelectedTone] = useState('neutral');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [thinkingStatus, setThinkingStatus] = useState('');
  const [typingText, setTypingText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatSessions, setChatSessions] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [userId] = useState(getUserId()); // Authenticated user ID for conversation history
  const [selectedImage, setSelectedImage] = useState(null); // For image upload
  const [imagePreview, setImagePreview] = useState(null); // For image preview
  const [siteUrl, setSiteUrl] = useState('');
  const [showProfileSettings, setShowProfileSettings] = useState(false); // Profile settings modal
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const fileInputRef = useRef(null);
  const lastFailedInputRef = useRef(null);

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
      };
      reader.readAsDataURL(file);
    }
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
        await handleVoiceMessage(audioBlob);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
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
      const result = await luminoAPI.voiceRoundtrip(audioBlob, selectedTone);
      
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

  return (
    <div className="chat-container">
      <div className="flex h-screen">
        {/* Sidebar */}
        {sidebarOpen && (
          <div className="chat-sidebar">
            <div className="p-4 border-b border-blue-900/50">
              <button 
                onClick={handleNewChat}
                className="w-full flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
              >
                <Plus className="w-5 h-5" />
                <span>New Chat</span>
              </button>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="text-sm text-blue-400 mb-2">Recent Chats</div>
              {chatSessions.length === 0 ? (
                <div className="text-xs text-blue-400/50 italic text-center py-4">
                  No previous chats
                </div>
              ) : (
                <div className="space-y-2">
                  {chatSessions.map((chat) => (
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
                          <div className="text-xs text-blue-400/70 mt-1">
                            {new Date(chat.timestamp).toLocaleDateString()} • {chat.messages.length} messages
                          </div>
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
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center mb-4">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Welcome to Lumino AI</h2>
                <p className="text-blue-400">Start a conversation or use voice input</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div 
                  key={index} 
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={message.role === 'user' ? 'message-user' : 'message-assistant'}>
                    <div className="text-sm opacity-70 mb-1">
                      {message.role === 'user' ? 'You' : 'Lumino AI'}
                      {message.tone && <span className="ml-2 text-xs">({message.tone})</span>}
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
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    {message.hasAudio && (
                      <div className="mt-2 text-xs text-blue-400 flex items-center gap-1">
                        <Mic className="w-3 h-3" />
                        Voice message
                      </div>
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

              <div className="flex-1 flex items-center gap-2 bg-slate-800 border border-blue-800/50 rounded-lg px-4 py-2 focus-within:border-blue-600">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  disabled={isProcessing}
                  rows={1}
                  className="flex-1 bg-transparent outline-none resize-none"
                />
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
                🎨
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
    </div>
  );
};

export default TextChat;
