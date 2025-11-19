import React, { useState, useEffect } from 'react';
import { X, User, Save, Loader } from 'lucide-react';
import { getCurrentUser, updateProfile } from '../services/api';

const ProfileSettings = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [profileData, setProfileData] = useState({
    full_name: '',
    bio: '',
    preferred_tone: 'neutral',
    conversation_style: 'balanced',
    interests: [],
    personality_traits: {
      formality: 'casual',
      humor: 'medium'
    }
  });

  useEffect(() => {
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const user = await getCurrentUser();
      setProfileData({
        full_name: user.full_name || '',
        bio: user.bio || '',
        preferred_tone: user.preferred_tone || 'neutral',
        conversation_style: user.conversation_style || 'balanced',
        interests: user.interests || [],
        personality_traits: user.personality_traits || { formality: 'casual', humor: 'medium' }
      });
    } catch (err) {
      setError('Failed to load profile');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      await updateProfile(profileData);
      
      setSuccess('Profile updated successfully!');
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError('Failed to save profile');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePersonalityChange = (key, value) => {
    setProfileData(prev => ({
      ...prev,
      personality_traits: {
        ...prev.personality_traits,
        [key]: value
      }
    }));
  };

  const handleInterestsChange = (e) => {
    const interests = e.target.value.split(',').map(i => i.trim()).filter(i => i);
    handleInputChange('interests', interests);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4 border border-slate-700">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-slate-900 to-slate-800 p-6 border-b border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Profile Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-slate-400 hover:text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-500/20 border border-green-500 text-green-200 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
          ) : (
            <>
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Basic Information</h3>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profileData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Bio
                  </label>
                  <textarea
                    value={profileData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Interests (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={profileData.interests.join(', ')}
                    onChange={handleInterestsChange}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="AI, Technology, Science, Art..."
                  />
                </div>
              </div>

              {/* AI Preferences */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">AI Preferences</h3>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Preferred Tone
                  </label>
                  <select
                    value={profileData.preferred_tone}
                    onChange={(e) => handleInputChange('preferred_tone', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="calm">Calm - Soothing and gentle</option>
                    <option value="neutral">Neutral - Balanced and professional</option>
                    <option value="energetic">Energetic - Upbeat and enthusiastic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Conversation Style
                  </label>
                  <select
                    value={profileData.conversation_style}
                    onChange={(e) => handleInputChange('conversation_style', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="concise">Concise - Short and to the point</option>
                    <option value="balanced">Balanced - Moderate detail</option>
                    <option value="detailed">Detailed - Comprehensive explanations</option>
                  </select>
                </div>
              </div>

              {/* Personality */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Personality Settings</h3>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Formality Level
                  </label>
                  <div className="flex gap-2">
                    {['formal', 'neutral', 'casual'].map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => handlePersonalityChange('formality', level)}
                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                          profileData.personality_traits.formality === level
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Humor Level
                  </label>
                  <div className="flex gap-2">
                    {['low', 'medium', 'high'].map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => handlePersonalityChange('humor', level)}
                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                          profileData.personality_traits.humor === level
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gradient-to-r from-slate-900 to-slate-800 p-6 border-t border-slate-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
