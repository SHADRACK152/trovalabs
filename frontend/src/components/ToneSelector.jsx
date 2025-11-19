import React from 'react';
import { Smile, Meh, Zap } from 'lucide-react';

/**
 * ToneSelector Component
 * Allows users to choose the AI's speaking tone
 */
const TONES = [
  {
    id: 'calm',
    name: 'Calm',
    icon: Smile,
    description: 'Slow, soothing, peaceful',
    color: 'from-blue-500 to-cyan-500',
    emoji: '😌',
  },
  {
    id: 'neutral',
    name: 'Neutral',
    icon: Meh,
    description: 'Balanced and clear',
    color: 'from-purple-500 to-pink-500',
    emoji: '😊',
  },
  {
    id: 'energetic',
    name: 'Energetic',
    icon: Zap,
    description: 'Fast, enthusiastic, upbeat',
    color: 'from-orange-500 to-red-500',
    emoji: '🚀',
  },
];

const ToneSelector = ({ selectedTone, onToneChange }) => {
  return (
    <div className="glass-card p-6">
      <h3 className="text-xl font-bold mb-4 text-center">Choose Tone</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TONES.map((tone) => {
          const Icon = tone.icon;
          const isSelected = selectedTone === tone.id;
          
          return (
            <button
              key={tone.id}
              onClick={() => onToneChange(tone.id)}
              className={`tone-card ${isSelected ? 'tone-card-active' : ''}`}
            >
              {/* Icon and Emoji */}
              <div className="flex items-center justify-center mb-3">
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${tone.color} flex items-center justify-center text-3xl shadow-lg ${isSelected ? 'scale-110' : ''} transition-transform`}>
                  {tone.emoji}
                </div>
              </div>
              
              {/* Name */}
              <h4 className="text-lg font-bold mb-2">{tone.name}</h4>
              
              {/* Description */}
              <p className="text-sm text-white/70">{tone.description}</p>
              
              {/* Selected Indicator */}
              {isSelected && (
                <div className="mt-3 flex items-center justify-center gap-2 text-lumino-primary">
                  <div className="w-2 h-2 rounded-full bg-lumino-primary animate-pulse" />
                  <span className="text-xs font-semibold">SELECTED</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ToneSelector;
