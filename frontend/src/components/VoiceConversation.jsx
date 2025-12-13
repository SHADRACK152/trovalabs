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
  const [naturalDropdownOpen, setNaturalDropdownOpen] = useState(false);
  const [selectedRate, setSelectedRate] = useState(1.0);
  const [selectedPitch, setSelectedPitch] = useState(1.0);
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
    <div className="min-h-screen">
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
          {/* Modern Voice Conversation UI */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Left: Controls */}
            <div className="col-span-1">
              <div className="bg-white/5 p-4 rounded-xl mb-4 voice-controls-panel">
                <div className="text-sm text-white/80 mb-2">Voice Mode</div>
                <div className="flex flex-col gap-2">
                  {/* Natural voice dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setNaturalDropdownOpen(prev => !prev)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded bg-white/5 text-white/90"
                      aria-expanded={naturalDropdownOpen}
                      aria-haspopup="listbox"
                    >
                      <span className="text-sm">
                        {useNaturalVoice ? `Natural: ${selectedNaturalVoice}` : 'Use Natural Voice'}
                      </span>
                      <svg className={`w-4 h-4 ml-2 transform ${naturalDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                      </svg>
                    </button>

                    {naturalDropdownOpen && (
                      <div className="mt-2 bg-white/5 rounded shadow-lg z-20 max-h-56 overflow-auto">
                        {naturalVoicesLoading ? (
                          <div className="px-3 py-2 text-sm text-white/60">Loading voices…</div>
                        ) : naturalVoices.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-white/60">No natural voices available</div>
                        ) : (
                          naturalVoices.map(nv => (
                            <button
                              key={nv.name}
                              onClick={() => {
                                setSelectedNaturalVoice(nv.name);
                                setUseNaturalVoice(true);
                                setUseClonedVoice(false);
                                setNaturalDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-sm ${selectedNaturalVoice === nv.name ? 'bg-blue-600 text-white' : 'text-white/90 hover:bg-white/5'}`}
                            >
                              {nv.name}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {hasClonedVoice && (
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={useClonedVoice} onChange={(e) => { setUseClonedVoice(e.target.checked); if (e.target.checked) setUseNaturalVoice(false); }} className="w-4 h-4" />
                      <span className="text-white text-sm">Use My Cloned Voice</span>
                    </label>
                  )}
                </div>
              </div>

              <div className="bg-white/5 p-4 rounded-xl mb-4">
                <div className="text-sm text-white/80 mb-2">Voice Selection</div>
                {!useNaturalVoice && !useClonedVoice ? (
                  <div className="flex flex-col gap-2">
                    {availableVoices.slice(0,6).map((v) => (
                      <button key={v.id} onClick={() => setSelectedVoice(v)} className={`text-left px-3 py-2 rounded ${selectedVoice?.id === v.id ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/80'}`}>
                        {v.name || v.id}
                      </button>
                    ))}
                  </div>
                ) : useNaturalVoice ? (
                  <div className="flex flex-col gap-2">
                    <div className="px-3 py-2 rounded bg-white/5 text-white/90 flex items-center justify-between">
                      <div className="text-sm">{selectedNaturalVoice}</div>
                      <button onClick={() => setNaturalDropdownOpen(true)} className="text-sm text-blue-200 hover:underline">Change</button>
                    </div>
                  </div>
                ) : (
                  <div className="text-white/80">Using cloned voice</div>
                )}
              </div>

              <div className="bg-white/5 p-4 rounded-xl">
                <div className="text-sm text-white/80 mb-2">Playback</div>
                <div className="text-xs text-white/70 mb-2">Speed: {selectedRate.toFixed(2)}</div>
                <input type="range" min="0.6" max="1.6" step="0.05" value={selectedRate} onChange={(e) => setSelectedRate(parseFloat(e.target.value))} />
                <div className="text-xs text-white/70 mt-3 mb-2">Pitch: {selectedPitch.toFixed(2)}</div>
                <input type="range" min="0.6" max="1.8" step="0.05" value={selectedPitch} onChange={(e) => setSelectedPitch(parseFloat(e.target.value))} />
                <div className="flex gap-2 mt-3">
                  <button onClick={() => {
                    try {
                      const synth = window.speechSynthesis;
                      if (!synth) return alert('SpeechSynthesis not available');
                      const utter = new SpeechSynthesisUtterance('This is a preview from Lumino.');
                      utter.rate = selectedRate;
                      utter.pitch = selectedPitch;
                      const voices = synth.getVoices();
                      const found = voices.find(x => selectedVoice && (x.name || '').toLowerCase().includes((selectedVoice.name || selectedVoice.id || '').toLowerCase()));
                      if (found) utter.voice = found;
                      synth.cancel(); synth.speak(utter);
                    } catch (e) { console.warn(e); }
                  }} className="px-3 py-2 rounded bg-blue-600">Preview</button>
                  <button onClick={() => { setSelectedRate(1.0); setSelectedPitch(1.0); }} className="px-3 py-2 rounded bg-white/5">Reset</button>
                </div>
              </div>
            </div>

            {/* Center: Big Lumino talking circle */}
            <div className="col-span-1 md:col-span-1 flex flex-col items-center justify-center">
              <div className={`stage ${isSpeaking ? 'stage-speaking' : ''}`}>
                <img src="/assets/lumai.png" alt="Lumino" className="stage-logo w-56 h-56" />
              </div>

              <div className="mt-4 text-center">
                <div className="text-2xl font-extrabold text-white">Lumino AI</div>
                <div className="mt-2 text-sm text-white/90">{isRecording ? 'Listening…' : isSpeaking ? 'Speaking…' : 'Ready'}</div>
              </div>

              <div className="mt-6 flex items-center gap-4">
                <div className="flex items-center">
                  <button onClick={isRecording ? stopRecording : startRecording} className={`record-btn ${isRecording ? 'recording' : ''}`} title="Record">
                    {!isRecording ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="mic-icon">
                        <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3z" />
                        <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 5 5 0 0 0 4 4.9V19H7a1 1 0 1 0 0 2h10a1 1 0 1 0 0-2h-2v-3.1A5 5 0 0 0 19 11z" />
                      </svg>
                    ) : (
                      '■'
                    )}
                  </button>

                  <div className="vu-meter">
                    {[12,18,24,30,36].map((h, i) => (
                      <div key={i} className="audio-bar" style={{ height: `${h}px`, width: 4 }} />
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-start">
                  <button onClick={interrupt} className="px-3 py-2 rounded bg-blue-700 text-white">Interrupt</button>
                  <div className="text-xs text-white/70 mt-2">{currentTranscript ? currentTranscript.slice(0,120) + (currentTranscript.length>120 ? '...' : '') : 'Speak to start a conversation.'}</div>
                </div>
              </div>
            </div>

            {/* Right: small transcript / history */}
            <div className="col-span-1">
              <div className="bg-white/5 p-4 rounded-xl mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-white/80">Conversation</div>
                  <button onClick={() => { setTranscriptHistory([]); }} className="text-xs text-white/60">Clear</button>
                </div>
                <div className="max-h-64 overflow-auto text-white/80 text-sm">
                  {transcriptHistory.length === 0 ? (<div className="text-white/50">No messages yet</div>) : (
                    transcriptHistory.slice().reverse().map((t, i) => (
                      <div key={i} className={`transcript-entry ${t.role==='user' ? 'bg-purple-600/10' : 'bg-blue-600/10'}`}>
                        <div className="flex items-center justify-between">
                          <div className="text-xs opacity-80">{t.role === 'user' ? 'You' : 'Lumino'}</div>
                          <div className="transcript-time">{t.timestamp ? new Date(t.timestamp).toLocaleTimeString() : ''}</div>
                        </div>
                        <div className="text-sm mt-1">{t.text}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
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
