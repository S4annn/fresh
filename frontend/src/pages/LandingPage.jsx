import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import ThemeToggle from '../components/ThemeToggle';
import {
  Leaf, Brain, Package, Bell, Lightbulb, ShoppingBag, Heart, BarChart3,
  ArrowRight, ChevronRight, Sparkles, Shield, TrendingDown, Users,
  CheckCircle2, Menu, X, Play, User, Building2, Scan, Tag,
} from 'lucide-react';

const features = [
  {
    icon: Scan,
    title: 'AI Food Scanner',
    description: 'Upload or scan food images and let AI identify ingredients, estimate shelf life, and suggest the best action.',
    color: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50',
  },
  {
    icon: Brain,
    title: 'AI Food Waste Prediction',
    description: 'Prediksi risiko makanan terbuang menggunakan machine learning yang akurat.',
    color: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-50',
  },
  {
    icon: Package,
    title: 'Smart Inventory Tracking',
    description: 'Kelola stok makanan dengan mudah, pantau jumlah dan kondisi setiap saat.',
    color: 'from-blue-500 to-cyan-600',
    bg: 'bg-blue-50',
  },
  {
    icon: Bell,
    title: 'Expiry Reminder',
    description: 'Dapatkan notifikasi otomatis ketika makanan mendekati tanggal kedaluwarsa.',
    color: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-50',
  },
  {
    icon: Lightbulb,
    title: 'Recipe Recommendation',
    description: 'AI merekomendasikan resep berdasarkan bahan makanan yang perlu segera digunakan.',
    color: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50',
  },
  {
    icon: ShoppingBag,
    title: 'Marketplace for Surplus Food',
    description: 'Jual makanan berlebih dengan harga diskon, kurangi waste dan hasilkan uang.',
    color: 'from-pink-500 to-rose-600',
    bg: 'bg-pink-50',
  },
  {
    icon: Heart,
    title: 'Food Donation',
    description: 'Donasikan makanan berlebih untuk membantu komunitas yang membutuhkan.',
    color: 'from-red-500 to-rose-600',
    bg: 'bg-red-50',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description: 'Lihat data dan insight tentang pola konsumsi serta dampak positif Anda.',
    color: 'from-teal-500 to-cyan-600',
    bg: 'bg-teal-50',
  },
];

const steps = [
  {
    step: '01',
    title: 'Scan or Add Food',
    description: 'Scan food images with AI or manually add items to your inventory.',
    icon: Scan,
  },
  {
    step: '02',
    title: 'AI Identifies & Predicts',
    description: 'AI identifies ingredients and predicts waste risk based on expiry and storage.',
    icon: Brain,
  },
  {
    step: '03',
    title: 'Get Smart Recommendations',
    description: 'Receive recipe, storage, selling, or donation recommendations.',
    icon: Lightbulb,
  },
  {
    step: '04',
    title: 'Track Your Impact',
    description: 'Monitor food saved, money saved, and your sustainability contribution.',
    icon: BarChart3,
  },
];

const impacts = [
  {
    icon: TrendingDown,
    title: 'Reduce Household Waste',
    description: 'Kurangi limbah rumah tangga hingga 40% dengan manajemen stok cerdas.',
    stat: '40%',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    icon: Shield,
    title: 'Save Money',
    description: 'Hemat pengeluaran belanja bulanan dengan mengurangi pembelian berlebih.',
    stat: 'Rp350K+',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    icon: Sparkles,
    title: 'Support Sustainability',
    description: 'Kurangi emisi karbon dan dukung gaya hidup berkelanjutan.',
    stat: '12.5 kg',
    color: 'text-teal-600',
    bg: 'bg-teal-50',
  },
  {
    icon: Users,
    title: 'Help Communities',
    description: 'Bantu komunitas yang membutuhkan melalui donasi makanan berlebih.',
    stat: '50+',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
];

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const { setRole } = useRole();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  function handleUseAs(role) {
    setRole(role);
    navigate('/signup');
  }

  return (
    <div className="landing-page min-h-screen bg-white">
      {/* Navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white/90 backdrop-blur-xl shadow-lg shadow-emerald-500/5 border-b border-emerald-100/50' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 no-underline">
              <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-extrabold text-gray-800">F.R.E.S.H</span>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden lg:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-gray-600 hover:text-emerald-600 transition-colors no-underline">Features</a>
              <a href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-emerald-600 transition-colors no-underline">How It Works</a>
              <a href="#for-you" className="text-sm font-medium text-gray-600 hover:text-emerald-600 transition-colors no-underline">For You</a>
              <a href="#impact" className="text-sm font-medium text-gray-600 hover:text-emerald-600 transition-colors no-underline">Impact</a>
              <Link to="/pricing" className="text-sm font-medium text-gray-600 hover:text-emerald-600 transition-colors no-underline">Pricing</Link>
              <Link to="/marketplace" className="text-sm font-medium text-gray-600 hover:text-emerald-600 transition-colors no-underline">Marketplace</Link>
              <ThemeToggle compact />
            </div>

            {/* Auth Buttons */}
            <div className="hidden lg:flex items-center gap-3">
              {isAuthenticated ? (
                <Link to="/dashboard" className="btn-primary text-sm no-underline">Dashboard</Link>
              ) : (
                <>
                  <Link to="/signin" className="text-sm font-semibold text-gray-700 hover:text-emerald-600 px-4 py-2.5 transition-colors no-underline">Sign In</Link>
                  <Link to="/signup" className="btn-primary text-sm no-underline">Get Started</Link>
                </>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button className="lg:hidden btn-icon hover:bg-emerald-50" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6 text-gray-600" /> : <Menu className="w-6 h-6 text-gray-600" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white/95 backdrop-blur-xl border-t border-emerald-100/50 animate-fade-in">
            <div className="px-4 py-4 space-y-2">
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3 text-gray-700 font-medium hover:bg-emerald-50 rounded-xl no-underline">Features</a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3 text-gray-700 font-medium hover:bg-emerald-50 rounded-xl no-underline">How It Works</a>
              <a href="#impact" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3 text-gray-700 font-medium hover:bg-emerald-50 rounded-xl no-underline">Impact</a>
              <ThemeToggle className="w-full" />
              <div className="pt-2 border-t border-gray-100 flex gap-3">
                <Link to="/signin" onClick={() => setMobileMenuOpen(false)} className="flex-1 btn-secondary text-sm text-center no-underline">Sign In</Link>
                <Link to="/signup" onClick={() => setMobileMenuOpen(false)} className="flex-1 btn-primary text-sm text-center no-underline">Get Started</Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="landing-hero relative min-h-screen flex items-center overflow-hidden">
        {/* Background decorations */}
        <div className="landing-hero-bg absolute inset-0 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/50" />
        <div className="landing-hero-orb absolute top-20 right-10 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="landing-hero-orb absolute bottom-20 left-10 w-80 h-80 bg-teal-200/20 rounded-full blur-3xl animate-pulse-slow animate-delay-300" />
        <div className="landing-hero-orb absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-emerald-100/10 to-teal-100/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 lg:pt-32 lg:pb-24">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 dark:bg-emerald-500 backdrop-blur-sm rounded-full mb-8 animate-fade-in">
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-sm font-semibold text-white">AI-Powered Food Management Platform</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-gray-900 leading-[1.1] mb-6 animate-slide-up">
              Reduce Food Waste with{' '}
              <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 bg-clip-text text-transparent">
                AI-Powered
              </span>{' '}
              Smart Food Management
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up animate-delay-100">
              F.R.E.S.H membantu Anda memantau stok makanan, memprediksi risiko food waste, 
              dan memberi rekomendasi cerdas untuk penggunaan bahan makanan. Mulai kurangi limbah makanan hari ini.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up animate-delay-200">
              <Link
                to={isAuthenticated ? '/dashboard' : '/signup'}
                className="btn-primary text-base px-8 py-4 no-underline w-full sm:w-auto"
              >
                Start Managing Food
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/signin"
                className="btn-secondary text-base px-8 py-4 no-underline w-full sm:w-auto"
                onClick={(e) => {
                  if (!isAuthenticated) return;
                  e.preventDefault();
                  navigate('/dashboard');
                }}
              >
                <Play className="w-5 h-5" />
                View Demo
              </Link>
            </div>

            {/* Stats Row */}
            <div className="flex items-center justify-center gap-8 sm:gap-16 mt-16 animate-slide-up animate-delay-300">
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-extrabold gradient-text">40%</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Waste Reduced</p>
              </div>
              <div className="w-px h-10 bg-gray-200" />
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-extrabold gradient-text">10K+</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Food Items Saved</p>
              </div>
              <div className="w-px h-10 bg-gray-200" />
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-extrabold gradient-text">500+</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Donations Made</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-32 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 rounded-full mb-4">
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-sm font-semibold text-white">Powerful Features</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
              Everything You Need to{' '}
              <span className="gradient-text">Fight Food Waste</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Platform lengkap dengan teknologi AI untuk membantu Anda mengelola makanan secara cerdas dan berkelanjutan.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="group bg-white rounded-2xl p-8 border border-gray-100 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className={`w-14 h-14 ${feature.bg} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`w-7 h-7 bg-gradient-to-r ${feature.color} bg-clip-text`} style={{ color: 'inherit' }} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500 rounded-full mb-4">
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span className="text-sm font-semibold text-white">Simple Process</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
              How <span className="gradient-text">F.R.E.S.H</span> Works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Empat langkah sederhana untuk mulai mengurangi limbah makanan dengan bantuan AI.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="relative text-center group">
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-emerald-300 to-emerald-100" />
                  )}
                  <div className="relative inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mb-6 shadow-xl shadow-emerald-500/25 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-8 h-8 text-white" />
                    <span className="absolute -top-2 -right-2 w-7 h-7 bg-white rounded-lg shadow-md flex items-center justify-center text-xs font-extrabold text-emerald-600">{step.step}</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* For You Section */}
      <section id="for-you" className="py-20 lg:py-32 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 rounded-full mb-4">
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-sm font-semibold text-white">Choose How You Use F.R.E.S.H</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
              Built for <span className="gradient-text">Everyone</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Whether you're managing your home fridge or running a restaurant, F.R.E.S.H has the right experience for you.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Personal Card */}
            <div className="bg-white rounded-3xl border-2 border-emerald-200 p-8 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-1 group">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/25 group-hover:scale-110 transition-transform">
                <User className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-extrabold text-gray-800 mb-2">For Personal</h3>
              <p className="text-gray-500 mb-6">Manage your home food stock and save money</p>
              <ul className="space-y-3 mb-8">
                {['Manage home food stock', 'Get expiry reminders', 'Save grocery money', 'Find recipe ideas', 'Donate surplus food'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-700">
                    <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <button onClick={() => handleUseAs('personal')} className="w-full btn-primary py-3.5 text-base">
                <User className="w-5 h-5" /> Use as Personal <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            {/* Business Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl border-2 border-blue-300 p-8 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden">
              <div className="absolute top-4 right-4 px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">Business Pro</div>
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-extrabold text-gray-800 mb-2">For Business</h3>
              <p className="text-gray-500 mb-6">Manage inventory and branches professionally</p>
              <ul className="space-y-3 mb-8">
                {['Manage inventory and branches', 'Predict stock waste risk', 'Sell surplus food', 'Schedule donations', 'Track sustainability impact'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-700">
                    <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-blue-600" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <button onClick={() => handleUseAs('business')} className="w-full py-3.5 text-base rounded-xl font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25">
                <Building2 className="w-5 h-5" /> Use as Business <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="text-center mt-8">
            <Link to="/pricing" className="inline-flex items-center gap-2 text-emerald-600 font-semibold hover:text-emerald-700 no-underline">
              View all plans & pricing <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 rounded-full mb-4">
              <Shield className="w-4 h-4 text-white" />
              <span className="text-sm font-semibold text-white">Plan-based access</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              Start free, upgrade when you grow
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              F.R.E.S.H keeps basic food-saving workflows free, then unlocks higher limits and business tools when your needs grow.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {[
              { title: 'Free Starter', desc: 'Free for personal basic use: inventory, reminders, marketplace browsing, and donation listings.', icon: User, color: 'emerald' },
              { title: 'Personal Plus', desc: 'For households that need unlimited inventory, smarter recommendations, and advanced analytics.', icon: Heart, color: 'teal' },
              { title: 'Business Pro', desc: 'For restaurants, hotels, cafes, catering, bakeries, and grocery teams managing surplus at scale.', icon: Building2, color: 'blue' },
            ].map(({ title, desc, icon: Icon, color }) => (
              <div key={title} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-6">
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${color === 'blue' ? 'bg-blue-600' : 'bg-emerald-600'} text-white`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-extrabold text-gray-800">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button onClick={() => handleUseAs('personal')} className="btn-primary">
              Start Free <ArrowRight className="w-4 h-4" />
            </button>
            <Link to="/pricing" className="btn-secondary no-underline">
              View Pricing
            </Link>
            <button onClick={() => handleUseAs('business')} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700">
              Start Business Pro <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Impact Section */}
      <section id="impact" className="py-20 lg:py-32 bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(16,185,129,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,rgba(20,184,166,0.1),transparent_50%)]" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 rounded-full mb-4">
              <Sparkles className="w-4 h-4 text-emerald-300" />
              <span className="text-sm font-semibold text-emerald-300">Real Impact</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4">
              Making a <span className="text-emerald-300">Real Difference</span>
            </h2>
            <p className="text-lg text-emerald-200/80 max-w-2xl mx-auto">
              Setiap makanan yang diselamatkan berkontribusi pada perubahan yang lebih besar.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {impacts.map((impact, index) => {
              const Icon = impact.icon;
              return (
                <div
                  key={index}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/15 transition-all duration-300 hover:-translate-y-1 group"
                >
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-6 h-6 text-emerald-300" />
                  </div>
                  <p className="text-3xl font-extrabold text-white mb-2">{impact.stat}</p>
                  <h3 className="text-base font-bold text-white mb-1">{impact.title}</h3>
                  <p className="text-sm text-emerald-200/70">{impact.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-6">
            Ready to Reduce <span className="gradient-text">Food Waste</span>?
          </h2>
          <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto">
            Bergabunglah sekarang dan mulai mengelola makanan dengan lebih cerdas. Gratis untuk memulai.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup" className="btn-primary text-base px-10 py-4 no-underline">
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/signin" className="btn-secondary text-base px-10 py-4 no-underline">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                  <Leaf className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-extrabold text-white">F.R.E.S.H</span>
              </div>
              <p className="text-sm leading-relaxed">
                Food Resource Efficiency & Smart Handling. Platform AI untuk mengurangi food waste secara cerdas dan berkelanjutan.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-white font-bold mb-4">Quick Links</h4>
              <ul className="space-y-2 list-none p-0 m-0">
                <li><a href="#features" className="text-sm hover:text-emerald-400 transition-colors no-underline text-gray-400">Features</a></li>
                <li><a href="#how-it-works" className="text-sm hover:text-emerald-400 transition-colors no-underline text-gray-400">How It Works</a></li>
                <li><a href="#impact" className="text-sm hover:text-emerald-400 transition-colors no-underline text-gray-400">Impact</a></li>
                <li><Link to="/marketplace" className="text-sm hover:text-emerald-400 transition-colors no-underline text-gray-400">Marketplace</Link></li>
              </ul>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-white font-bold mb-4">Product</h4>
              <ul className="space-y-2 list-none p-0 m-0">
                <li><Link to="/dashboard" className="text-sm hover:text-emerald-400 transition-colors no-underline text-gray-400">Dashboard</Link></li>
                <li><Link to="/inventory" className="text-sm hover:text-emerald-400 transition-colors no-underline text-gray-400">Inventory</Link></li>
                <li><Link to="/predict" className="text-sm hover:text-emerald-400 transition-colors no-underline text-gray-400">AI Prediction</Link></li>
                <li><Link to="/donation" className="text-sm hover:text-emerald-400 transition-colors no-underline text-gray-400">Donation</Link></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-white font-bold mb-4">Contact</h4>
              <ul className="space-y-2 list-none p-0 m-0">
                <li className="text-sm">hello@fresh.app</li>
                <li className="text-sm">Jakarta, Indonesia</li>
                <li className="text-sm">+62 812 3456 7890</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-sm">© {new Date().getFullYear()} F.R.E.S.H — Food Resource Efficiency & Smart Handling. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
