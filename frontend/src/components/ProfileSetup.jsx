import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfile } from '../services/api';

const ProfileSetup = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    preferred_tone: 'neutral',
    conversation_style: 'balanced',
    interests: '',
    personality_traits: {
      formality: 'casual',
      humor: 'medium'
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handlePersonalityChange = (key, value) => {
    setFormData({
      ...formData,
      personality_traits: {
        ...formData.personality_traits,
        [key]: value
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Parse interests into array
      const interests = formData.interests
        .split(',')
        .map(i => i.trim())
        .filter(i => i);

      await updateProfile({
        full_name: formData.full_name,
        bio: formData.bio,
        preferred_tone: formData.preferred_tone,
        conversation_style: formData.conversation_style,
        interests,
        personality_traits: formData.personality_traits
      });

      navigate('/chat');
    } catch (err) {
      setError('Failed to save profile. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/chat');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 w-full max-w-2xl border border-white/20">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Personalize Your AI
          </h1>
          <p className="text-gray-300">
            Help us understand you better for a tailored experience
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Basic Information</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Full Name
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Bio
              </label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Tell us a bit about yourself..."
              />
            </div>
          </div>

          {/* Preferences */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">AI Preferences</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Preferred Tone
              </label>
              <select
                name="preferred_tone"
                value={formData.preferred_tone}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="calm">Calm - Soothing and gentle</option>
                <option value="neutral">Neutral - Balanced and professional</option>
                <option value="energetic">Energetic - Upbeat and enthusiastic</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Conversation Style
              </label>
              <select
                name="conversation_style"
                value={formData.conversation_style}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="concise">Concise - Short and to the point</option>
                <option value="balanced">Balanced - Moderate detail</option>
                <option value="detailed">Detailed - Comprehensive explanations</option>
              </select>
            </div>
          </div>

          {/* Personality */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Personality Settings</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Formality Level
              </label>
              <div className="flex gap-2">
                {['formal', 'neutral', 'casual'].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => handlePersonalityChange('formality', level)}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                      formData.personality_traits.formality === level
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Humor Level
              </label>
              <div className="flex gap-2">
                {['low', 'medium', 'high'].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => handlePersonalityChange('humor', level)}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                      formData.personality_traits.humor === level
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Interests (comma-separated)
              </label>
              <input
                type="text"
                name="interests"
                value={formData.interests}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="technology, music, travel, cooking"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Profile'}
            </button>
            <button
              type="button"
              onClick={handleSkip}
              className="px-6 py-3 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-all"
            >
              Skip for Now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetup;
