import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { luminoAPI } from '../services/api';
import ProfileSettings from './ProfileSettings';

// Get authenticated user ID from localStorage (shared with ChatPage)
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

export default function VoiceConversationSimple() {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [transcriptHistory, setTranscriptHistory] = useState([]);
  const [selectedTone, setSelectedTone] = useState('neutral');
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [useNaturalVoice, setUseNaturalVoice] = useState(false);
  const [naturalVoices, setNaturalVoices] = useState([]);
  const [naturalVoicesError, setNaturalVoicesError] = useState(null);
  const [naturalVoicesLoading, setNaturalVoicesLoading] = useState(true);
  const [selectedNaturalVoice, setSelectedNaturalVoice] = useState('lisa');
  const [hasInteracted, setHasInteracted] = useState(false);
  
  // Voice cloning states
  const [showVoiceClone, setShowVoiceClone] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [isRecordingClone, setIsRecordingClone] = useState(false);
  const [cloneStatus, setCloneStatus] = useState('');
  const [useClonedVoice, setUseClonedVoice] = useState(false);
  const [hasClonedVoice, setHasClonedVoice] = useState(false);
  const [userId] = useState(getUserId()); // Authenticated user ID for conversation history
  const [showProfileSettings, setShowProfileSettings] = useState(false); // Profile settings modal
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const cloneRecorderRef = useRef(null);
  const cloneAudioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const shouldStopMonitoringRef = useRef(false);
  const currentAudioRef = useRef(null); // Track current audio element for interruption

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop all audio when component unmounts
      console.log('🧹 Cleaning up audio on unmount');
      window.speechSynthesis.cancel();
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
    };
  }, []);

  // Load FREE natural voices from backend
  const loadNaturalVoices = async () => {
    try {
      setNaturalVoicesLoading(true);
      const response = await fetch('http://localhost:8000/voices');
      const data = await response.json();
      console.log('DEBUG: /voices response', data);

      let voiceList = [];
      // API may return an object ({voices: {...}}) or a list; handle both
      if (!data || !data.voices) {
        throw new Error('No voices returned from backend');
      }
      if (Array.isArray(data.voices)) {
        voiceList = data.voices;
      } else if (typeof data.voices === 'object') {
        voiceList = Object.entries(data.voices).map(([name, info]) => ({
          name,
          ...info
        }));
      }

      setNaturalVoices(voiceList);
      setNaturalVoicesError(null);
      console.log(`Loaded ${voiceList.length} natural voices`);
      // Ensure selectedNaturalVoice is valid - prefer previous choice, else pick first
      if (voiceList.length > 0) {
        const names = voiceList.map(v => v.name);
        if (!names.includes(selectedNaturalVoice)) {
          setSelectedNaturalVoice(voiceList[0].name);
        }
      }
    } catch (error) {
      console.error('Error loading natural voices:', error);
      setNaturalVoices([]);
      setNaturalVoicesError(error.message || String(error));
    } finally {
      setNaturalVoicesLoading(false);
    }
  };

  useEffect(() => {
    loadNaturalVoices();
  }, []);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      
      // Filter for English voices and categorize them
      const englishVoices = voices.filter(v => v.lang.startsWith('en'));
      
      // Prioritize natural-sounding voices (Google and Microsoft Neural voices)
      const femaleVoices = englishVoices.filter(v => 
        v.name.includes('Female') || 
        v.name.includes('Zira') || 
        v.name.includes('Samantha') ||
        v.name.includes('Karen') ||
        v.name.includes('Victoria') ||
        v.name.includes('Aria') ||
        v.name.includes('Jenny') ||
        v.name.includes('Google US English Female') ||
        v.name.includes('Google UK English Female') ||
        v.name.includes('Microsoft Zira') ||
        v.name.includes('Microsoft Aria') ||
        (!v.name.includes('Male') && (v.name.includes('Natural') || v.name.includes('Neural')))
      ).sort((a, b) => {
        // Prioritize Neural/Natural voices
        const aScore = (a.name.includes('Neural') || a.name.includes('Natural')) ? 10 : 0;
        const bScore = (b.name.includes('Neural') || b.name.includes('Natural')) ? 10 : 0;
        return bScore - aScore;
      });
      
      const maleVoices = englishVoices.filter(v => 
        v.name.includes('Male') || 
        v.name.includes('David') || 
        v.name.includes('Mark') ||
        v.name.includes('Daniel') ||
        v.name.includes('Guy') ||
        v.name.includes('Google US English Male') ||
        v.name.includes('Google UK English Male') ||
        v.name.includes('Microsoft David') ||
        v.name.includes('Microsoft Guy')
      ).sort((a, b) => {
        const aScore = (a.name.includes('Neural') || a.name.includes('Natural')) ? 10 : 0;
        const bScore = (b.name.includes('Neural') || b.name.includes('Natural')) ? 10 : 0;
        return bScore - aScore;
      });
      
      const voiceOptions = [
        ...femaleVoices.slice(0, 4).map(v => ({ 
          voice: v, 
          label: `👩 ${v.name.split(' - ')[0].replace('Microsoft', '').replace('Google', '').trim()}`, 
          gender: 'female' 
        })),
        ...maleVoices.slice(0, 4).map(v => ({ 
          voice: v, 
          label: `👨 ${v.name.split(' - ')[0].replace('Microsoft', '').replace('Google', '').trim()}`, 
          gender: 'male' 
        }))
      ];
      
      setAvailableVoices(voiceOptions);
      
      // Set default voice (prefer Neural/Natural female voice)
      if (voiceOptions.length > 0) {
        setSelectedVoice(voiceOptions[0]);
      }
    };

    loadVoices();
    
    // Chrome loads voices asynchronously
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const startConversation = () => {
    setHasInteracted(true);
    startRecording();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      
      audioChunksRef.current = [];
      shouldStopMonitoringRef.current = false;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        await processAudio();
      };
      
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setCurrentTranscript('Listening... (speak now)');
      
      // Start monitoring for silence
      monitorSilence(stream);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setCurrentTranscript('Error: Could not access microphone');
    }
  };

  const monitorSilence = (stream) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    analyser.fftSize = 2048;
    microphone.connect(analyser);
    
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    
    let silenceStart = null;
    let hasDetectedSpeech = false;
    const SILENCE_THRESHOLD = 30;
    const SILENCE_DURATION = 1500; // 1.5 seconds
    
    const checkAudioLevel = () => {
      if (shouldStopMonitoringRef.current) {
        audioContext.close();
        return;
      }
      
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      
      if (average > SILENCE_THRESHOLD) {
        hasDetectedSpeech = true;
        silenceStart = null;
      } else if (hasDetectedSpeech) {
        if (!silenceStart) {
          silenceStart = Date.now();
        } else if (Date.now() - silenceStart > SILENCE_DURATION) {
          stopRecording();
          return;
        }
      }
      
      requestAnimationFrame(checkAudioLevel);
    };
    
    checkAudioLevel();
  };

  const stopRecording = () => {
    shouldStopMonitoringRef.current = true;
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  const processAudio = async () => {
    if (audioChunksRef.current.length === 0) {
      setCurrentTranscript('No audio recorded');
      setTimeout(() => startRecording(), 1000);
      return;
    }

    setCurrentTranscript('Transcribing...');

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      // Use unified API service which handles auth and multipart
      let responseData;
      try {
  responseData = await luminoAPI.transcribe(audioBlob, 'en');
      } catch (err) {
        console.error('Transcription API error:', err);
        // Extract friendly message
        const detail = (err?.response && (err.response.data?.detail || err.response.data)) || err.message;
        setCurrentTranscript('Error: ' + (detail || 'Transcription failed'));
        setTimeout(() => startRecording(), 2000);
        return;
      }

      console.log('Transcription response:', responseData);
      const userText = responseData.text?.trim() || '';

      if (!userText) {
        setCurrentTranscript('No speech detected');
        setTimeout(() => startRecording(), 1000);
        return;
      }

      console.log('You said:', userText);

      // Add user message
      setTranscriptHistory(prev => [
        ...prev,
        { role: 'user', text: userText, timestamp: new Date() }
      ]);

      setCurrentTranscript(`You: ${userText}`);

      // Get AI response
      const conversationHistory = transcriptHistory.map(entry => ({
        role: entry.role,
        content: entry.text
      }));

      const response = await luminoAPI.getTextResponse(
        userText,
        selectedTone,
        userId,  // Pass user ID for long-term memory
        conversationHistory
      );

      const aiText = response.response_text;
      console.log('AI says:', aiText);

      // Add AI message
      setTranscriptHistory(prev => [
        ...prev,
        { role: 'assistant', text: aiText, timestamp: new Date() }
      ]);

      // Speak the response
      await speakText(aiText);

      // Restart recording after AI finishes
      setTimeout(() => {
        if (!isSpeaking) {
          startRecording();
        }
      }, 500);

    } catch (error) {
      console.error('Error:', error);
      setCurrentTranscript('Error: ' + (error.message || 'Unknown error'));
      setTimeout(() => startRecording(), 2000);
    }
  };

  const speakText = async (text) => {
    setIsSpeaking(true);
    setCurrentTranscript(`AI: ${text}`);

    console.log('=== VOICE SELECTION DEBUG ===');
    console.log('useClonedVoice:', useClonedVoice);
    console.log('hasClonedVoice:', hasClonedVoice);
    console.log('useNaturalVoice:', useNaturalVoice);
    console.log('selectedNaturalVoice:', selectedNaturalVoice);

    try {
      // Use cloned voice if enabled and available
      if (useClonedVoice && hasClonedVoice) {
        console.log('✅ USING CLONED VOICE');
        await speakWithClonedVoice(text);
        setIsSpeaking(false);
        return;
      }

      // Use FREE natural voice if enabled
      if (useNaturalVoice) {
        console.log(`✅ USING NATURAL VOICE: ${selectedNaturalVoice}`);
        
        // Validate selectedNaturalVoice
        let voiceToUse = selectedNaturalVoice;
        if (!voiceToUse || !naturalVoices.some(v => v.name === voiceToUse)) {
          // fall back to first available natural voice if present
          if (naturalVoices.length > 0) {
            voiceToUse = naturalVoices[0].name;
            setSelectedNaturalVoice(voiceToUse);
          } else {
            console.warn('No natural voices available; falling back to browser TTS.');
            setIsSpeaking(false);
            // proceed to browser voice handling below by skipping this branch
            return;
          }
        }

        const formData = new FormData();
        formData.append('text', text);
        formData.append('voice', voiceToUse);

        console.log('Requesting audio from backend...');
        const response = await fetch('http://localhost:8000/speak', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Backend error:', errorText);
          throw new Error(`Natural TTS failed: ${response.status}`);
        }

        console.log('Received audio, creating blob...');
        const audioBlob = await response.blob();
        console.log('Audio blob size:', audioBlob.size, 'bytes, type:', audioBlob.type);
        
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        currentAudioRef.current = audio; // Store reference for interruption

        console.log('Playing audio...');
        await new Promise((resolve, reject) => {
          audio.onended = () => {
            console.log('Audio finished playing');
            URL.revokeObjectURL(audioUrl);
            currentAudioRef.current = null;
            resolve();
          };
          audio.onerror = (error) => {
            console.error('Audio playback error:', error);
            URL.revokeObjectURL(audioUrl);
            currentAudioRef.current = null;
            reject(error);
          };
          audio.play().catch(err => {
            console.error('Play error:', err);
            currentAudioRef.current = null;
            reject(err);
          });
        });

        setIsSpeaking(false);
        return;
      }

      // Use browser voices with natural variations
      console.log('✅ USING BROWSER VOICE:', selectedVoice?.voice?.name || 'default');
      return new Promise((resolve) => {
        // Split text into sentences for more natural pauses and variation
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        
        const speakSentences = async (index = 0) => {
          if (index >= sentences.length) {
            setIsSpeaking(false);
            resolve();
            return;
          }

          const sentence = sentences[index].trim();
          const utterance = new SpeechSynthesisUtterance(sentence);
          
          // Use selected voice
          if (selectedVoice && selectedVoice.voice) {
            utterance.voice = selectedVoice.voice;
          }

          // Enhanced tone settings for more human-like speech
          if (selectedTone === 'calm') {
            utterance.rate = 0.85;
            utterance.pitch = 0.95;
            utterance.volume = 0.9;
          } else if (selectedTone === 'energetic') {
            utterance.rate = 1.15;
            utterance.pitch = 1.15;
            utterance.volume = 1.0;
          } else {
            utterance.rate = 0.95;
            utterance.pitch = 1.0;
            utterance.volume = 0.95;
          }

          // Add natural variation based on sentence content
          const lowerSentence = sentence.toLowerCase();
          
          // Questions - higher pitch at end
          if (sentence.includes('?')) {
            utterance.pitch += 0.1;
            utterance.rate -= 0.05;
          }
          
          // Exclamations - more energy
          if (sentence.includes('!')) {
            utterance.pitch += 0.05;
            utterance.rate += 0.05;
            utterance.volume = 1.0;
          }
          
          // Emphasis words - slight variation
          if (lowerSentence.includes('very') || lowerSentence.includes('really') || 
              lowerSentence.includes('important') || lowerSentence.includes('must')) {
            utterance.rate -= 0.05;
          }

          utterance.onend = () => {
            // Natural pause between sentences (100-300ms based on punctuation)
            const pauseDuration = sentence.includes('?') || sentence.includes('!') ? 300 : 
                                 sentence.includes('.') ? 200 : 100;
            
            setTimeout(() => {
              speakSentences(index + 1);
            }, pauseDuration);
          };

          utterance.onerror = () => {
            console.error('Speech error, continuing...');
            speakSentences(index + 1);
          };

          window.speechSynthesis.speak(utterance);
        };

        speakSentences(0);
      });

    } catch (error) {
      console.error('TTS Error:', error);
      setIsSpeaking(false);
      // If natural voice fails, show error message
      setCurrentTranscript(`Error: ${error.message}`);
    }
  };

  // Voice cloning functions
  const startCloneRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      
      cloneAudioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          cloneAudioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        await processCloneAudio();
      };
      
      mediaRecorder.start();
      cloneRecorderRef.current = mediaRecorder;
      setIsRecordingClone(true);
      setCloneStatus('🎤 Recording... Speak for 5-10 seconds');
      
      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (cloneRecorderRef.current && cloneRecorderRef.current.state === 'recording') {
          stopCloneRecording();
        }
      }, 10000);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setCloneStatus('Error: Could not access microphone');
    }
  };

  const stopCloneRecording = () => {
    if (cloneRecorderRef.current && cloneRecorderRef.current.state === 'recording') {
      cloneRecorderRef.current.stop();
      setIsRecordingClone(false);
    }
  };

  const processCloneAudio = async () => {
    if (cloneAudioChunksRef.current.length === 0) {
      console.error('❌ No audio chunks recorded');
      setCloneStatus('No audio recorded');
      return;
    }

    console.log('🎤 Processing clone audio...');
    console.log('Audio chunks:', cloneAudioChunksRef.current.length);
    setIsCloning(true);
    setCloneStatus('⏳ Step 1/3: Preparing audio...');

    try {
      // Test backend connection first
      console.log('Testing backend connection...');
      try {
        const testResponse = await fetch('http://localhost:8000/health');
        console.log('Backend is reachable, health check:', testResponse.status);
      } catch (testError) {
        console.error('❌ Backend not reachable:', testError);
        throw new Error('Backend server is not running! Start it with: python backend/main.py');
      }

      const audioBlob = new Blob(cloneAudioChunksRef.current, { type: 'audio/webm' });
      console.log('Audio blob created:', audioBlob.size, 'bytes');
      
      // Simulate progress
      await new Promise(resolve => setTimeout(resolve, 300));
      setCloneStatus('📤 Step 2/3: Uploading to server...');
      
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice_sample.webm');
      formData.append('user_id', userId);
      formData.append('profile_name', 'default');

      console.log('📤 Sending POST request to http://localhost:8000/voice-clone/create');
      console.log('FormData:', { audioSize: audioBlob.size, userId, profileName: 'default' });

      const response = await fetch('http://localhost:8000/voice-clone/create', {
        method: 'POST',
        body: formData,
      });

      console.log('✅ Response received! Status:', response.status);
      setCloneStatus('✅ Step 3/3: Finalizing...');

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend error response:', errorText);
        throw new Error(`Server error: ${response.status} - ${errorText.substring(0, 100)}`);
      }

      const result = await response.json();
      console.log('Backend result:', result);
      
      if (result.success) {
        console.log('✅ Voice clone created successfully!');
        console.log('Setting hasClonedVoice = true');
        setHasClonedVoice(true);
        setCloneStatus('✅ Success! Your voice has been cloned!');
        
        // Auto-enable cloned voice
        setUseClonedVoice(true);
        setUseNaturalVoice(false);
        
        setTimeout(() => {
          setShowVoiceClone(false);
          setCloneStatus('');
        }, 2000);
      } else {
        console.error('❌ Backend returned success=false:', result.error);
        setCloneStatus('❌ Error: ' + (result.error || 'Unknown error'));
        setTimeout(() => setCloneStatus(''), 5000);
      }

    } catch (error) {
      console.error('❌ Error cloning voice:', error);
      setCloneStatus('❌ ' + error.message);
      setTimeout(() => setCloneStatus(''), 8000);
    } finally {
      setIsCloning(false);
      // Reset audio chunks
      cloneAudioChunksRef.current = [];
    }
  };

  const speakWithClonedVoice = async (text) => {
    try {
      console.log('🎤 Requesting cloned voice synthesis...');
      console.log('User ID:', userId);
      console.log('Text:', text.substring(0, 50) + '...');
      
      const formData = new FormData();
      formData.append('text', text);
      formData.append('user_id', userId);
      formData.append('profile_name', 'default');
      formData.append('speed', '1.0');

      const response = await fetch('http://localhost:8000/voice-clone/speak', {
        method: 'POST',
        body: formData,
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend error:', errorText);
        throw new Error('Cloned voice synthesis failed: ' + errorText);
      }

      console.log('✅ Received audio from backend');
      const audioBlob = await response.blob();
      console.log('Audio blob size:', audioBlob.size, 'bytes');
      
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio; // Store reference for interruption

      console.log('▶️ Playing cloned voice audio...');
      await new Promise((resolve, reject) => {
        audio.onended = () => {
          console.log('✅ Cloned voice playback finished');
          URL.revokeObjectURL(audioUrl);
          currentAudioRef.current = null;
          resolve();
        };
        audio.onerror = (err) => {
          console.error('❌ Audio playback error:', err);
          currentAudioRef.current = null;
          reject(err);
        };
        audio.play().catch(err => {
          console.error('❌ Play error:', err);
          currentAudioRef.current = null;
          reject(err);
        });
      });

    } catch (error) {
      console.error('Cloned voice playback error:', error);
      throw error;
    }
  };

  const interrupt = () => {
    console.log('🛑 Interrupt button pressed - stopping all audio');
    
    // Stop speech synthesis (browser voices)
    window.speechSynthesis.cancel();
    
    // Stop HTML5 audio element (natural voices and cloned voice)
    if (currentAudioRef.current) {
      console.log('Stopping current audio playback');
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    
    // Update state
    setIsSpeaking(false);
    
    // Stop any ongoing recording
    stopRecording();
    
    // Start listening for user input after a brief delay
    setTimeout(() => {
      console.log('✅ Ready to listen after interrupt');
      startRecording();
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm transition-all"
          >
            ← Back
          </button>
          <h1 className="text-4xl font-bold text-white">Talk to Lumino</h1>
          
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

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          {/* Voice Cloning Section */}
          <div className="mb-4 flex justify-center items-center gap-4 flex-wrap">
            <button
              onClick={() => setShowVoiceClone(!showVoiceClone)}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold transition-all transform hover:scale-105"
            >
              🎤 Clone My Voice
            </button>
            
            {hasClonedVoice && (
              <label className="text-white flex items-center gap-2 cursor-pointer bg-white/10 px-4 py-3 rounded-lg backdrop-blur-sm">
                <input
                  type="checkbox"
                  checked={useClonedVoice}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    console.log('🔊 Cloned voice toggle changed to:', checked);
                    setUseClonedVoice(checked);
                    if (checked) {
                      console.log('Disabling natural voice...');
                      setUseNaturalVoice(false);
                    }
                  }}
                  className="w-5 h-5"
                />
                <span className="text-lg font-medium">🔊 Use My Cloned Voice</span>
              </label>
            )}
          </div>

          {/* Voice Clone Modal */}
          {showVoiceClone && (
            <div className="mb-6 bg-white/10 backdrop-blur-lg rounded-xl p-6">
              <h3 className="text-white text-xl font-bold mb-4 text-center">Clone Your Voice</h3>
              <p className="text-white/80 text-center mb-4">
                Record 5-10 seconds of your voice. Speak clearly and naturally.
              </p>
              
              <div className="flex flex-col items-center gap-4">
                {!isRecordingClone && !isCloning && (
                  <button
                    onClick={startCloneRecording}
                    className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-lg text-lg font-semibold transition-all"
                  >
                    🎤 Start Recording Sample
                  </button>
                )}
                
                {isRecordingClone && (
                  <button
                    onClick={stopCloneRecording}
                    className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-lg text-lg font-semibold animate-pulse"
                  >
                    ⏹️ Stop Recording
                  </button>
                )}
                
                {isCloning && (
                  <div className="w-full max-w-md">
                    <div className="bg-white/20 rounded-full h-3 overflow-hidden mb-2">
                      <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full animate-pulse" 
                           style={{width: '100%'}}></div>
                    </div>
                  </div>
                )}
                
                {cloneStatus && (
                  <div className={`text-center text-lg font-medium px-6 py-3 rounded-lg ${
                    cloneStatus.includes('✅') ? 'bg-green-500/20 text-green-200' :
                    cloneStatus.includes('❌') ? 'bg-red-500/20 text-red-200' :
                    'bg-blue-500/20 text-blue-200'
                  }`}>
                    {cloneStatus}
                  </div>
                )}
                
                <div className="text-white/60 text-sm text-center mt-2">
                  <p>💡 Tip: Say something like:</p>
                  <p className="italic">"Hello, this is my voice. I'm creating a voice clone for my AI assistant."</p>
                </div>
              </div>
            </div>
          )}

          {/* Natural Voice Toggle */}
          {!useClonedVoice && (
            <div className="mb-4 flex justify-center items-center gap-4">
              <label className="text-white flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useNaturalVoice}
                  disabled={naturalVoicesLoading}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    console.log('🎭 Natural voice toggle changed to:', checked);
                    setUseNaturalVoice(checked);
                    if (checked) {
                      console.log('Disabling cloned voice...');
                      setUseClonedVoice(false);
                    }
                  }}
                  className="w-5 h-5"
                />
                <span className="text-lg font-medium">🎭 Use FREE Natural Voices (More Human)</span>
                {naturalVoicesLoading && (
                  <span className="ml-2 text-sm opacity-80 text-yellow-300">Loading voices…</span>
                )}
              </label>
            </div>
          )}

          {/* Natural Voice Selector - Only shown if enabled */}
          {useNaturalVoice && naturalVoices.length > 0 && (
            <div className="mb-4">
              <label className="block text-white text-center mb-2 text-sm font-medium">
                Choose Natural AI Voice (FREE)
              </label>
              <div className="flex justify-center gap-2 flex-wrap">
                {naturalVoices.map((voice) => (
                  <button
                    key={voice.name}
                    onClick={() => setSelectedNaturalVoice(voice.name)}
                    className={`px-4 py-2 rounded-lg text-sm transition-all ${
                      selectedNaturalVoice === voice.name
                        ? 'bg-green-600 text-white scale-105'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    {voice.gender === 'female' ? '👩' : '👨'} {voice.name.charAt(0).toUpperCase() + voice.name.slice(1)}
                    <span className="block text-xs opacity-75">{voice.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {useNaturalVoice && naturalVoices.length === 0 && (
            <div className="mb-4 text-center text-yellow-300">
              {naturalVoicesError ? (
                <>
                  <div className="font-medium">Free Voices Not Available</div>
                  <div className="text-sm opacity-80">{naturalVoicesError}</div>
                  <div className="text-sm mt-1">Please try again later or check the server.</div>
                  <div className="mt-2">
                    <button
                      onClick={() => loadNaturalVoices()}
                      className="px-3 py-1 bg-white/10 rounded-lg text-xs text-white/80 hover:bg-white/20"
                    >
                      Retry
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-sm opacity-80">No natural voices available right now.</div>
              )}
            </div>
          )}

          {/* Browser Voice Selector - Only shown if not using natural voices or cloned voice */}
          {!useNaturalVoice && !useClonedVoice && (
            <div className="mb-4">
              <label className="block text-white text-center mb-2 text-sm font-medium">
                Choose Browser Voice
              </label>
              <div className="flex justify-center gap-2 flex-wrap">
                {availableVoices.map((voiceOption, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedVoice(voiceOption)}
                    className={`px-4 py-2 rounded-lg text-sm transition-all ${
                      selectedVoice?.voice.name === voiceOption.voice.name
                        ? 'bg-pink-600 text-white scale-105'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    {voiceOption.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tone Selector */}
          <div className="mb-6 flex justify-center gap-4">
            {['calm', 'neutral', 'energetic'].map((tone) => (
              <button
                key={tone}
                onClick={() => setSelectedTone(tone)}
                className={`px-6 py-3 rounded-lg capitalize transition-all ${
                  selectedTone === tone
                    ? 'bg-purple-600 text-white scale-105'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {tone}
              </button>
            ))}
          </div>

          {/* Status Display */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-6">
            <div className="text-center">
              {!hasInteracted ? (
                <button
                  onClick={startConversation}
                  className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl text-xl font-semibold transition-all transform hover:scale-105"
                >
                  🎙️ Start Conversation
                </button>
              ) : (
                <>
                  <div className="mb-4">
                    {isRecording && (
                      <div className="inline-block w-4 h-4 bg-red-500 rounded-full animate-pulse mr-2" />
                    )}
                    {isSpeaking && (
                      <div className="inline-block w-4 h-4 bg-blue-500 rounded-full animate-pulse mr-2" />
                    )}
                    <span className="text-xl text-white">
                      {isRecording ? '🎤 Recording...' : isSpeaking ? '🗣️ Speaking...' : '⏸️ Paused'}
                    </span>
                  </div>

                  <div className="text-2xl text-white/90 min-h-[60px] mb-6">
                    {currentTranscript || 'Ready to talk...'}
                  </div>

                  {isSpeaking && (
                    <button
                      onClick={interrupt}
                      className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all"
                    >
                      ✋ Interrupt
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Conversation History */}
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 max-h-96 overflow-y-auto">
            <h2 className="text-xl font-semibold text-white mb-4">Conversation</h2>
            {transcriptHistory.length === 0 ? (
              <p className="text-white/50 text-center py-8">
                Start speaking to begin the conversation...
              </p>
            ) : (
              <div className="space-y-4">
                {transcriptHistory.map((entry, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg ${
                      entry.role === 'user'
                        ? 'bg-purple-600/30 ml-8'
                        : 'bg-blue-600/30 mr-8'
                    }`}
                  >
                    <div className="text-white/70 text-sm mb-1">
                      {entry.role === 'user' ? '👤 You' : '🤖 Lumino'}
                    </div>
                    <div className="text-white">{entry.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Profile Settings Modal */}
      <ProfileSettings 
        isOpen={showProfileSettings} 
        onClose={() => setShowProfileSettings(false)} 
      />
    </div>
  );
}
