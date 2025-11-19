import React from 'react';
import { User, Bot, Volume2, MessageSquare } from 'lucide-react';

/**
 * ConversationHistory Component
 * Displays the conversation between user and AI
 */
const ConversationHistory = ({ messages }) => {
  const scrollRef = React.useRef(null);

  React.useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <MessageSquare className="w-16 h-16 mx-auto mb-4 text-white/30" />
        <p className="text-white/50 text-lg">No conversation yet</p>
        <p className="text-white/30 text-sm mt-2">Start by recording your voice</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <MessageSquare className="w-5 h-5" />
        Conversation
      </h3>
      
      <div
        ref={scrollRef}
        className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar"
      >
        {messages.map((message, index) => (
          <div
            key={index}
            className={`animate-fadeIn flex gap-3 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {/* AI Avatar */}
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-lumino-primary to-lumino-secondary flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
            )}

            {/* Message Bubble */}
            <div
              className={`max-w-[80%] rounded-2xl p-4 ${
                message.role === 'user'
                  ? 'bg-gradient-to-br from-lumino-accent to-lumino-secondary'
                  : 'bg-white/10 backdrop-blur-sm'
              }`}
            >
              {/* Text */}
              <p className="text-sm leading-relaxed">{message.text}</p>
              
              {/* Metadata */}
              <div className="flex items-center gap-2 mt-2 text-xs text-white/50">
                {message.tone && (
                  <span className="px-2 py-1 rounded-full bg-white/10">
                    {message.tone}
                  </span>
                )}
                {message.hasAudio && (
                  <Volume2 className="w-3 h-3" />
                )}
                <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>

            {/* User Avatar */}
            {message.role === 'user' && (
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-lumino-accent to-pink-600 flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConversationHistory;
