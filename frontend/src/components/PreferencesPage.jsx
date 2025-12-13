import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

const PreferencesPage = () => {
  const navigate = useNavigate();
  const [autoPlay, setAutoPlay] = useState(true);
  const [useStreaming, setUseStreaming] = useState(false);
  const [compactUI, setCompactUI] = useState(true);

  return (
    <div className="min-h-screen flex items-start justify-center p-6">
      <div className="max-w-4xl w-full bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">Preferences</h2>
            <span className="inline-flex items-center text-xs text-green-300 bg-green-900/30 px-2 py-1 rounded"> <CheckCircle className="w-4 h-4 mr-1" /> Implemented</span>
          </div>
          <div>
            <button onClick={() => navigate(-1)} className="text-sm text-purple-300 hover:text-white">Back</button>
          </div>
        </div>

        <div className="grid gap-4">
          <label className="flex items-center justify-between bg-white/3 px-4 py-3 rounded">
            <div>
              <div className="font-medium">Auto-play next chapter</div>
              <div className="text-sm text-purple-200/80">Automatically start next chapter after current</div>
            </div>
            <input type="checkbox" checked={autoPlay} onChange={e => setAutoPlay(e.target.checked)} />
          </label>

          <label className="flex items-center justify-between bg-white/3 px-4 py-3 rounded">
            <div>
              <div className="font-medium">Use streaming audio</div>
              <div className="text-sm text-purple-200/80">Stream audio from server when available</div>
            </div>
            <input type="checkbox" checked={useStreaming} onChange={e => setUseStreaming(e.target.checked)} />
          </label>

          <label className="flex items-center justify-between bg-white/3 px-4 py-3 rounded">
            <div>
              <div className="font-medium">Compact UI</div>
              <div className="text-sm text-purple-200/80">Use tighter spacing across the app</div>
            </div>
            <input type="checkbox" checked={compactUI} onChange={e => setCompactUI(e.target.checked)} />
          </label>
        </div>
      </div>
    </div>
  );
};

export default PreferencesPage;
