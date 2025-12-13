import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Mic, Sparkles, Zap, Brain, Heart, LogOut, User, ArrowRight, Shield, Clock, Rocket, Star, Check, ChevronDown, Globe, Lightbulb, TrendingUp, Users, Award, Infinity, BookOpen } from 'lucide-react';
import { logout } from '../services/api';

const LandingPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    logout();
    setUser(null);
    navigate('/');
  };

  const handleChatClick = () => {
    if (user) {
      navigate('/chat');
    } else {
      navigate('/login');
    }
  };

  const handleVoiceClick = () => {
    if (user) {
      navigate('/voice');
    } else {
      navigate('/login');
    }
  };

  const handleAudiobooksClick = () => {
    if (user) {
      navigate('/audiobooks');
    } else {
      navigate('/login');
    }
  };

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Content Creator",
      image: <User className="w-8 h-8 text-white" />,
      text: "Lumino AI has revolutionized how I brainstorm content ideas. The voice conversations feel incredibly natural!",
      rating: 5
    },
    {
      name: "Michael Chen",
      role: "Software Developer",
      image: <User className="w-8 h-8 text-white" />,
      text: "The context-aware responses are impressive. It remembers our previous conversations and builds on them seamlessly.",
      rating: 5
    },
    {
      name: "Emma Davis",
      role: "Marketing Manager",
      image: <User className="w-8 h-8 text-white" />,
      text: "I use Lumino daily for strategy planning. The customizable tones help me get exactly the perspective I need.",
      rating: 5
    }
  ];

  const faqs = [
    {
      question: "What makes Lumino AI different?",
      answer: "Lumino AI offers both text and voice conversations with advanced context awareness, customizable tones, and natural turn-taking in voice mode. Our AI remembers your conversation history and adapts to your preferences over time."
    },
    {
      question: "Is my data secure and private?",
      answer: "Absolutely! We use enterprise-grade encryption for all conversations. Your data is stored securely, and we never share your personal information or conversations with third parties."
    },
    {
      question: "Can I switch between chat and voice modes?",
      answer: "Yes! You can seamlessly switch between text chat and voice conversations based on your preference and situation. Both modes maintain conversation context."
    },
    {
      question: "How does the free plan work?",
      answer: "Our free plan gives you access to core features including both chat and voice modes, with reasonable usage limits. You can upgrade anytime for unlimited conversations and advanced features."
    },
    {
      question: "What are the customizable tone settings?",
      answer: "You can adjust Lumino's personality and response style - from professional and formal to casual and friendly. This helps tailor the AI's communication to match your needs and preferences."
    }
  ];

  const pricingPlans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for getting started",
      features: [
        "50 messages per day",
        "Basic chat conversations",
        "Voice conversations (5 min/day)",
        "Standard response speed",
        "Community support"
      ],
      cta: "Get Started Free",
      popular: false,
      gradient: "from-slate-600 to-slate-700"
    },
    {
      name: "Pro",
      price: "$19",
      period: "per month",
      description: "For power users",
      features: [
        "Unlimited messages",
        "Advanced chat features",
        "Unlimited voice conversations",
        "Priority response speed",
        "Custom tone presets",
        "Conversation history export",
        "Priority support",
        "Early access to new features"
      ],
      cta: "Upgrade to Pro",
      popular: true,
      gradient: "from-purple-600 to-pink-600"
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "contact us",
      description: "For teams and businesses",
      features: [
        "Everything in Pro",
        "Dedicated account manager",
        "Custom AI training",
        "API access",
        "Advanced analytics",
        "Team collaboration tools",
        "SSO & advanced security",
        "Custom integration support",
        "SLA guarantee"
      ],
      cta: "Contact Sales",
      popular: false,
      gradient: "from-blue-600 to-cyan-600"
    }
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-purple-900 to-slate-900 flex flex-col relative overflow-hidden">
      {/* Animated Background Elements with Beautiful Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Glassmorphism Header */}
      <div className="w-full p-6 relative z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center bg-white/5 backdrop-blur-xl rounded-2xl px-6 py-4 border border-white/10 shadow-2xl shadow-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur-lg opacity-75"></div>
                <div className="relative w-14 h-14 flex items-center justify-center overflow-hidden">
                <img src="/assets/lumai.png" alt="Lumino logo" className="w-14 h-14 object-contain" />
              </div>
            </div>
            <span className="text-white font-bold text-2xl">Lumino AI</span>
          </div>
          
          {user ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 px-5 py-2.5 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg">
                <User className="w-5 h-5 text-blue-400" />
                <span className="text-white font-medium">{user.username}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl transition-all hover:shadow-lg hover:shadow-red-500/50 font-medium hover:scale-105 transform"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-2.5 text-white hover:text-blue-300 transition-colors font-medium hover:scale-105 transform"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="relative group px-8 py-3 overflow-hidden rounded-xl font-semibold text-white"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 group-hover:scale-110 transition-transform duration-300"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
                <span className="relative z-10">Get Started Free</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <div className="max-w-7xl w-full">
          {/* Hero Section with Stunning Design */}
          <div className="text-center mb-20">
            {/* Glowing Logo */}
            <div className="flex items-center justify-center mb-10">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl blur-3xl opacity-60 animate-pulse"></div>
                  <div className="relative w-32 h-32 flex items-center justify-center overflow-hidden">
                    <img src="/assets/lumai.png" alt="Lumino logo" className="w-28 h-28 object-contain" />
                  </div>
              </div>
            </div>
            
            {/* Title with Gradient and Shadow */}
            <h1 className="logo-heading text-8xl font-black mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-2xl">
              Lumino AI
            </h1>
            
            <p className="text-4xl text-white mb-6 font-light tracking-wide drop-shadow-lg">
              Your Intelligent AI Companion
            </p>
            
            <p className="text-xl text-blue-200/80 max-w-3xl mx-auto leading-relaxed mb-8">
              Experience the future of AI conversations. Engage in meaningful dialogues
              <br />through text or voice, perfectly tailored to your needs.
            </p>

            {!user && (
              <div className="mt-12 flex items-center justify-center gap-6">
                <button
                  onClick={() => navigate('/signup')}
                  className="relative group px-10 py-5 overflow-hidden rounded-2xl font-bold text-lg text-white shadow-2xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 blur-2xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
                  <span className="relative z-10 flex items-center gap-3">
                    <span>Get Started Free</span>
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                  </span>
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="px-10 py-5 bg-white/10 backdrop-blur-xl text-white rounded-2xl hover:bg-white/20 transition-all font-bold text-lg border border-white/20 shadow-2xl hover:scale-105 transform"
                >
                  Sign In
                </button>
              </div>
            )}
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
            <div className="text-center bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-xl">
              <div className="text-5xl font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">10K+</div>
              <div className="text-slate-300 text-sm">Active Users</div>
            </div>
            <div className="text-center bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-xl">
              <div className="text-5xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">1M+</div>
              <div className="text-slate-300 text-sm">Conversations</div>
            </div>
            <div className="text-center bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-xl">
              <div className="text-5xl font-black bg-gradient-to-r from-pink-400 to-red-400 bg-clip-text text-transparent mb-2">99.9%</div>
              <div className="text-slate-300 text-sm">Uptime</div>
            </div>
            <div className="text-center bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-xl">
              <div className="text-5xl font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2">4.9★</div>
              <div className="text-slate-300 text-sm">User Rating</div>
            </div>
          </div>

          {/* Beautiful Feature Cards with Glassmorphism */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
            <div className="group relative bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 hover:border-blue-400/50 transition-all shadow-2xl hover:shadow-blue-500/50 hover:scale-105 transform duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/50 group-hover:scale-110 transition-transform">
                  <Rocket className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">Lightning Fast</h3>
                <p className="text-slate-300 leading-relaxed">Instant AI responses powered by cutting-edge technology for seamless conversations</p>
              </div>
            </div>
            
            <div className="group relative bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 hover:border-purple-400/50 transition-all shadow-2xl hover:shadow-purple-500/50 hover:scale-105 transform duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center mb-6 shadow-lg shadow-purple-500/50 group-hover:scale-110 transition-transform">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-purple-400 transition-colors">Secure & Private</h3>
                <p className="text-slate-300 leading-relaxed">Your conversations are encrypted and completely private with enterprise-grade security</p>
              </div>
            </div>
            
            <div className="group relative bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 hover:border-pink-400/50 transition-all shadow-2xl hover:shadow-pink-500/50 hover:scale-105 transform duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-pink-700 flex items-center justify-center mb-6 shadow-lg shadow-pink-500/50 group-hover:scale-110 transition-transform">
                  <Clock className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-pink-400 transition-colors">24/7 Available</h3>
                <p className="text-slate-300 leading-relaxed">Access your AI companion anytime, anywhere - always ready to assist you</p>
              </div>
            </div>

            <div className="group relative bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 hover:border-cyan-400/50 transition-all shadow-2xl hover:shadow-cyan-500/50 hover:scale-105 transform duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center mb-6 shadow-lg shadow-cyan-500/50 group-hover:scale-110 transition-transform">
                  <Globe className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-cyan-400 transition-colors">Multi-Language</h3>
                <p className="text-slate-300 leading-relaxed">Communicate in multiple languages with natural understanding and responses</p>
              </div>
            </div>

            <div className="group relative bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 hover:border-yellow-400/50 transition-all shadow-2xl hover:shadow-yellow-500/50 hover:scale-105 transform duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500 to-yellow-700 flex items-center justify-center mb-6 shadow-lg shadow-yellow-500/50 group-hover:scale-110 transition-transform">
                  <Lightbulb className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-yellow-400 transition-colors">Smart Context</h3>
                <p className="text-slate-300 leading-relaxed">Remembers your preferences and conversation history for personalized interactions</p>
              </div>
            </div>

            <div className="group relative bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 hover:border-green-400/50 transition-all shadow-2xl hover:shadow-green-500/50 hover:scale-105 transform duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center mb-6 shadow-lg shadow-green-500/50 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-green-400 transition-colors">Always Learning</h3>
                <p className="text-slate-300 leading-relaxed">Continuously improving with the latest AI advancements and updates</p>
              </div>
            </div>
          </div>

        {/* Mode Selection Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {/* Chat Mode */}
          <div
            onClick={handleChatClick}
            className="group relative bg-gradient-to-br from-slate-900/80 to-blue-900/40 backdrop-blur-lg rounded-3xl p-10 border border-blue-800/30 hover:border-blue-500/60 transition-all duration-300 cursor-pointer transform hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/30"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/0 to-blue-600/0 group-hover:from-blue-600/5 group-hover:to-purple-600/5 rounded-3xl transition-all duration-300"></div>
            
            <div className="relative z-10">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mb-6 group-hover:shadow-2xl group-hover:shadow-blue-500/60 transition-all duration-300 group-hover:scale-110">
                <MessageSquare className="w-10 h-10 text-white" />
              </div>
              
              <h2 className="text-4xl font-bold text-white mb-4 group-hover:text-blue-300 transition-colors">
                Chat with Lumino
              </h2>
              
              <p className="text-blue-300/90 mb-8 leading-relaxed text-lg">
                Engage in intelligent text conversations. Perfect for detailed discussions, 
                brainstorming, and getting thoughtful responses at your own pace.
              </p>
              
              <div className="space-y-3 text-base mb-8">
                <div className="flex items-center gap-3 text-blue-300/80">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-blue-400" />
                  </div>
                  <span>Context-aware responses</span>
                </div>
                <div className="flex items-center gap-3 text-blue-300/80">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-blue-400" />
                  </div>
                  <span>Multiple conversation threads</span>
                </div>
                <div className="flex items-center gap-3 text-blue-300/80">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Heart className="w-4 h-4 text-blue-400" />
                  </div>
                  <span>Customizable tone settings</span>
                </div>
              </div>
              
              <div className="mt-6 text-blue-400 font-bold text-lg flex items-center gap-3 group-hover:gap-5 transition-all">
                {user ? 'Start Chatting' : 'Sign In to Chat'}
                <ArrowRight className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Voice Mode */}
          <div
            onClick={handleVoiceClick}
            className="group relative bg-gradient-to-br from-slate-900/80 to-purple-900/40 backdrop-blur-lg rounded-3xl p-10 border border-purple-800/30 hover:border-purple-500/60 transition-all duration-300 cursor-pointer transform hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/30"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/0 to-purple-600/0 group-hover:from-purple-600/5 group-hover:to-blue-600/5 rounded-3xl transition-all duration-300"></div>
            
            <div className="relative z-10">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center mb-6 group-hover:shadow-2xl group-hover:shadow-purple-500/60 transition-all duration-300 group-hover:scale-110">
                <Mic className="w-10 h-10 text-white" />
              </div>
              
              <h2 className="text-4xl font-bold text-white mb-4 group-hover:text-purple-300 transition-colors">
                Talk to Lumino
              </h2>
              
              <p className="text-purple-300/90 mb-8 leading-relaxed text-lg">
                Have natural voice conversations with turn-taking interaction. 
                Experience hands-free communication just like talking to a friend.
              </p>
              
              <div className="space-y-3 text-base mb-8">
                <div className="flex items-center gap-3 text-purple-300/80">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-purple-400" />
                  </div>
                  <span>Real-time voice recognition</span>
                </div>
                <div className="flex items-center gap-3 text-purple-300/80">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-purple-400" />
                  </div>
                  <span>Natural turn-taking flow</span>
                </div>
                <div className="flex items-center gap-3 text-purple-300/80">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Heart className="w-4 h-4 text-purple-400" />
                  </div>
                  <span>Expressive voice responses</span>
                </div>
              </div>
              
              <div className="mt-6 text-purple-400 font-bold text-lg flex items-center gap-3 group-hover:gap-5 transition-all">
                {user ? 'Start Talking' : 'Sign In to Talk'}
                <ArrowRight className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Audiobook Mode */}
          <div
            onClick={handleAudiobooksClick}
            className="group relative bg-gradient-to-br from-slate-900/80 to-pink-900/40 backdrop-blur-lg rounded-3xl p-10 border border-pink-800/30 hover:border-pink-500/60 transition-all duration-300 cursor-pointer transform hover:scale-[1.02] hover:shadow-2xl hover:shadow-pink-500/30"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-pink-600/0 to-pink-600/0 group-hover:from-pink-600/5 group-hover:to-purple-600/5 rounded-3xl transition-all duration-300"></div>
            
            <div className="relative z-10">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-500 to-pink-700 flex items-center justify-center mb-6 group-hover:shadow-2xl group-hover:shadow-pink-500/60 transition-all duration-300 group-hover:scale-110">
                <BookOpen className="w-10 h-10 text-white" />
              </div>
              
              <h2 className="text-4xl font-bold text-white mb-4 group-hover:text-pink-300 transition-colors">
                Create Audiobooks
              </h2>
              
              <p className="text-pink-300/90 mb-8 leading-relaxed text-lg">
                Upload novels and stories to create audiobooks. Listen instantly using
                natural browser speech synthesis, customize voices, and record your readings.
              </p>
              
              <div className="space-y-3 text-base mb-8">
                <div className="flex items-center gap-3 text-pink-300/80">
                  <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
                    <Mic className="w-4 h-4 text-pink-400" />
                  </div>
                  <span>Instant browser speech synthesis</span>
                </div>
                <div className="flex items-center gap-3 text-pink-300/80">
                  <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-pink-400" />
                  </div>
                  <span>Chapter-by-chapter playback</span>
                </div>
                <div className="flex items-center gap-3 text-pink-300/80">
                  <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
                    <Heart className="w-4 h-4 text-pink-400" />
                  </div>
                  <span>Voice customization & recording</span>
                </div>
              </div>
              
              <div className="mt-6 text-pink-400 font-bold text-lg flex items-center gap-3 group-hover:gap-5 transition-all">
                {user ? 'Browse Audiobooks' : 'Sign In for Audiobooks'}
                <ArrowRight className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

          {/* Footer */}
          <div className="text-center">
            <p className="text-blue-400/60 text-base mb-2">Powered by advanced AI technology</p>
            <p className="text-slate-500 text-sm">© 2025 Lumino AI. Choose your experience and start conversing.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
