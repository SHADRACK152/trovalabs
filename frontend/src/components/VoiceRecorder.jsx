import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader } from 'lucide-react';

/**
 * VoiceRecorder Component
 * Handles microphone input, recording, and audio visualization
 */
const VoiceRecorder = ({ onRecordingComplete, isProcessing, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const timerRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    return () => {
      // Cleanup
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onRecordingComplete(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      // Setup audio visualization
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 256;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Start visualizer
      visualize();

    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    }
  };

  const visualize = () => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setAudioLevel(Math.min(100, (average / 128) * 100));
      
      if (isRecording) {
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      }
    };

    updateLevel();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass-card p-8 text-center">
      {/* Microphone Button */}
      <div className="flex justify-center mb-6">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={disabled || isProcessing}
          className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 animate-pulse'
              : 'bg-gradient-to-br from-lumino-primary to-lumino-secondary hover:scale-110'
          } ${
            disabled || isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          } shadow-2xl`}
        >
          {isProcessing ? (
            <Loader className="w-12 h-12 animate-spin" />
          ) : isRecording ? (
            <Square className="w-12 h-12" />
          ) : (
            <Mic className="w-12 h-12" />
          )}
          
          {/* Audio level ring */}
          {isRecording && (
            <div
              className="absolute inset-0 rounded-full border-4 border-white/30"
              style={{
                transform: `scale(${1 + audioLevel / 200})`,
                transition: 'transform 0.1s ease-out',
              }}
            />
          )}
        </button>
      </div>

      {/* Recording Info */}
      {isRecording && (
        <div className="animate-fadeIn">
          <div className="text-2xl font-bold mb-2">{formatTime(recordingTime)}</div>
          <div className="text-sm text-white/70 mb-4">Recording...</div>
          
          {/* Audio Visualizer */}
          <div className="flex justify-center items-end gap-1 h-16">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="audio-bar w-2"
                style={{
                  height: `${Math.max(10, audioLevel * 0.6)}%`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {!isRecording && !isProcessing && (
        <div className="text-white/70">
          <p className="text-lg font-medium mb-2">Click to start recording</p>
          <p className="text-sm">Speak naturally and click again to stop</p>
        </div>
      )}

      {isProcessing && (
        <div className="text-white/70">
          <p className="text-lg font-medium mb-2">Processing...</p>
          <p className="text-sm">Lumino is thinking...</p>
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;
