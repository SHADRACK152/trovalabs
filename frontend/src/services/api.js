/**
 * API Service for Lumino AI Backend
 * Handles all communication with the FastAPI backend
 */
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 300000, // 5 minute timeout for large file uploads
});

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect if not already on auth pages
      const currentPath = window.location.pathname;
      if (!currentPath.startsWith('/auth') && !currentPath.startsWith('/login') && !currentPath.startsWith('/signup')) {
        // Token expired or invalid
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ==================== Authentication ====================

export const register = async (email, username, password, fullName = null) => {
  const response = await api.post('/auth/register', {
    email,
    username,
    password,
    full_name: fullName,
  });
  return response.data;
};

export const login = async (email, password) => {
  const response = await api.post('/auth/login', {
    email,
    password,
  });
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const updateProfile = async (profileData) => {
  const response = await api.put('/auth/profile', profileData);
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

// ==================== Voice & Chat ====================

export const luminoAPI = {
  /**
   * Health check
   */
  async checkHealth() {
    const response = await api.get('/health');
    return response.data;
  },

  /**
   * Transcribe audio to text (ASR)
   */
  async transcribe(audioBlob, language = 'en') {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('language', language);

    const response = await api.post('/transcribe', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Get text response from LLM (no TTS)
   */
  async getTextResponse(text, tone = 'neutral', userId = null, conversationHistory = null) {
    const response = await api.post('/respond-text', {
      text,
      tone,
      user_id: userId,
      conversation_history: conversationHistory,
    });
    return response.data;
  },

  /**
   * Get audio response (LLM + TTS)
   */
  async getAudioResponse(text, tone = 'neutral', userId = null) {
    const response = await api.post('/respond', {
      text,
      tone,
      user_id: userId,
    }, {
      responseType: 'blob',
    });
    return response.data; // Returns audio blob
  },

  /**
   * Voice roundtrip: ASR → LLM → TTS
   * Returns audio blob and text transcripts in response headers
   */
  async voiceRoundtrip(audioBlob, tone = 'neutral', language = 'en', userId = null) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('tone', tone);
    formData.append('language', language);
    if (userId) {
      formData.append('user_id', userId);
    }

    console.log('Sending voiceRoundtrip request with blob size:', audioBlob.size);

    const response = await api.post('/voice-roundtrip', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      responseType: 'blob',
    });
    
    console.log('Response headers:', response.headers);
    console.log('User text:', response.headers['x-user-text']);
    console.log('Response text:', response.headers['x-response-text']);
    
    // Extract text from response headers
    return {
      audio: response.data,
      userText: response.headers['x-user-text'] || 'Could not transcribe',
      responseText: response.headers['x-response-text'] || 'No response',
    };
  },

  /**
   * Voice roundtrip with explicit voice selection
   */
  async voiceRoundtripWithVoice(audioBlob, tone = 'neutral', language = 'en', userId = null, voice = null) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('tone', tone);
    formData.append('language', language);
    if (userId) formData.append('user_id', userId);
    if (voice) formData.append('voice', voice);

    const response = await api.post('/voice-roundtrip', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      responseType: 'blob',
      timeout: 300000,
    });

    return response.data ? {
      audio: response.data,
      userText: response.headers['x-user-text'] || null,
      responseText: response.headers['x-response-text'] || null
    } : null;
  },

  /**
   * Get available TTS voices from backend
   */
  async getVoices() {
    const response = await api.get('/voices');
    return response.data;
  },

  /**
   * Generate smart title for conversation
   */
  async generateTitle(userMessage, aiResponse = null, conversationContext = null) {
    const response = await api.post('/generate-title', {
      user_message: userMessage,
      ai_response: aiResponse,
      conversation_context: conversationContext,
    }, {
      timeout: 10000, // 10 second timeout for title generation
    });
    return response.data;
  },

  /**
   * Analyze an image with optional question
   */
  async analyzeImage(imageFile, question = "What's in this image? Describe it in detail.", userId = null) {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('question', question);
    if (userId) {
      formData.append('user_id', userId);
    }

    const response = await api.post('/analyze-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, // 2 minute timeout for image analysis
    });
    return response.data;
  },

  /**
   * Get detailed description of an image
   */
  async describeImage(imageFile, userId = null) {
    const formData = new FormData();
    formData.append('image', imageFile);
    if (userId) {
      formData.append('user_id', userId);
    }

    const response = await api.post('/describe-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Upload an image to the server-side gallery (persists under uploads/images/<user_id>)
   */
  async uploadImage(imageFile, userId = null) {
    const formData = new FormData();
    formData.append('file', imageFile, imageFile.name || 'upload.png');
    if (userId) formData.append('user_id', userId);

    const response = await api.post('/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    return response.data;
  },

  /**
   * List images for a user from the server-side gallery
   */
  async listUserImages(userId) {
    const response = await api.get(`/images/${encodeURIComponent(userId)}`);
    return response.data;
  },
  /**
   * Delete a user image on the server
   */
  async deleteUserImage(userId, filename) {
    const response = await api.delete(`/images/${encodeURIComponent(userId)}/${encodeURIComponent(filename)}`);
    return response.data;
  },

  async analyzeWebsite(url) {
    const response = await api.post('/analyze-website', { url });
    return response.data;
  },

  /**
   * Generate an image from a prompt. Returns a blob (PNG).
   */
  async generateImage(prompt, options = {}) {
    const payload = { prompt, ...options };
    const response = await api.post('/generate-image', payload, { responseType: 'blob', timeout: 120000 });
    return response.data;
  },

  /**
   * Extract text from an image (OCR)
   */
  async extractText(imageFile, userId = null) {
    const formData = new FormData();
    formData.append('image', imageFile);
    if (userId) {
      formData.append('user_id', userId);
    }

    const response = await api.post('/extract-text', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // ==================== Conversation Branching ====================

  /**
   * Create a new conversation branch from a specific message
   */
  async createBranch(conversationId, parentMessageId, branchName = null, branchContext = null) {
    const response = await api.post(`/branch/${conversationId}`, {
      parent_message_id: parentMessageId,
      branch_name: branchName,
      branch_context: branchContext,
    });
    return response.data;
  },

  /**
   * Get all branches for a conversation
   */
  async getBranches(conversationId) {
    const response = await api.get(`/branches/${conversationId}`);
    return response.data;
  },

  /**
   * Get a specific branch
   */
  async getBranch(conversationId, branchId) {
    const response = await api.get(`/branch/${conversationId}/${branchId}`);
    return response.data;
  },

  /**
   * Activate a branch (make it the active conversation path)
   */
  async activateBranch(conversationId, branchId) {
    const response = await api.post(`/branch/${conversationId}/${branchId}/activate`);
    return response.data;
  },

  /**
   * Get visual tree structure of all branches
   */
  async getBranchTree(conversationId) {
    const response = await api.get(`/branch-tree/${conversationId}`);
    return response.data;
  },

  /**
   * Delete a conversation branch
   */
  async deleteBranch(conversationId, branchId) {
    const response = await api.delete(`/branch/${conversationId}/${branchId}`);
    return response.data;
  },
};

// Export both the api instance and luminoAPI
export { api };
export default luminoAPI;
