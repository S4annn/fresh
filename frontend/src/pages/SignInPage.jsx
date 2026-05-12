import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import { canAccessBusinessFeature } from '../services/subscription';
import {
  Leaf, Mail, Lock, Eye, EyeOff, AlertCircle,
  Loader2, Zap, User, Building2,
} from 'lucide-react';

export default function SignInPage() {
  const { signInLocal, signInWithGoogle, signInDemo, isFirebaseConfigured } = useAuth();
  const { setRole } = useRole();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState(
    () => localStorage.getItem('fresh_user_role') || 'personal'
  );
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');

  // Check if user can access business features
  const canAccessBusiness = canAccessBusinessFeature();
  const isBusinessSelected = selectedRole === 'business';
  const isBusinessDisabled = isBusinessSelected && !canAccessBusiness;

  function handleRoleSelect(r) {
    setSelectedRole(r);
    setRole(r);
  }

  function getRedirectPath(role) {
    return role === 'business' ? '/business/dashboard' : '/dashboard';
  }

  // ── Sign In with registered email + password ────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email wajib diisi.');
      return;
    }
    if (!password) {
      setError('Password wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      const sessionUser = await signInLocal({ email: email.trim(), password });
      const nextRole = sessionUser.role || selectedRole;
      setRole(nextRole);
      navigate(getRedirectPath(nextRole));
    } catch (err) {
      if (err.requires_otp) {
        sessionStorage.setItem("pending_verification_email", err.email);
        navigate(`/verify-otp?email=${encodeURIComponent(err.email)}`);
      } else {
        setError(err.message || 'Sign in gagal. Periksa email dan password Anda.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Google Sign In ──────────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setError('');
    if (!isFirebaseConfigured) {
      setError('Firebase belum dikonfigurasi. Isi Firebase environment variables di file .env untuk menggunakan Google Sign In.');
      return;
    }
    setLoading(true);
    try {
      setRole(selectedRole);
      await signInWithGoogle();
      navigate(getRedirectPath(selectedRole));
    } catch (err) {
      if (err.code === 'auth/unauthorized-domain') {
        setError('Domain belum ditambahkan di Firebase Authentication > Settings > Authorized domains.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup diblokir browser. Izinkan popup untuk situs ini lalu coba lagi.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Popup Google ditutup sebelum login selesai. Coba lagi.');
      } else {
        setError(err.message || 'Google sign in gagal.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Demo Login (no credentials) ─────────────────────────────────────────────
  const handleDemoLogin = () => {
    setRole(selectedRole);
    signInDemo();
    navigate(getRedirectPath(selectedRole));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(16,185,129,0.3),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(20,184,166,0.2),transparent_50%)]" />
        <div className="relative text-center max-w-md">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-8">
            <Leaf className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-4xl font-extrabold text-white mb-4">Welcome Back to F.R.E.S.H</h2>
          <p className="text-emerald-100 text-lg leading-relaxed">
            Lanjutkan misi Anda mengurangi limbah makanan. Setiap makanan yang diselamatkan membuat perbedaan.
          </p>
          <div className="flex items-center justify-center gap-6 mt-12">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">40%</p>
              <p className="text-sm text-emerald-200">Waste Reduced</p>
            </div>
            <div className="w-px h-12 bg-emerald-400/30" />
            <div className="text-center">
              <p className="text-3xl font-bold text-white">10K+</p>
              <p className="text-sm text-emerald-200">Items Saved</p>
            </div>
            <div className="w-px h-12 bg-emerald-400/30" />
            <div className="text-center">
              <p className="text-3xl font-bold text-white">500+</p>
              <p className="text-sm text-emerald-200">Donations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-extrabold text-gray-800">F.R.E.S.H</span>
          </div>

          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Sign In</h1>
          <p className="text-gray-500 mb-6">Masuk dengan akun yang sudah terdaftar.</p>

          {/* Role Selection */}
          <div className="mb-6">
            <p className="text-sm font-semibold text-gray-700 mb-3">I am signing in as:</p>
            <div className="grid grid-cols-2 gap-3">
              {/* Personal */}
              <button
                type="button"
                onClick={() => handleRoleSelect('personal')}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200
                  ${selectedRole === 'personal'
                    ? 'border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-500/15'
                    : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedRole === 'personal' ? 'bg-emerald-500' : 'bg-gray-100'}`}>
                  <User className={`w-5 h-5 ${selectedRole === 'personal' ? 'text-white' : 'text-gray-500'}`} />
                </div>
                <div>
                  <p className={`font-bold text-sm ${selectedRole === 'personal' ? 'text-emerald-700' : 'text-gray-700'}`}>Personal</p>
                  <p className="text-xs text-gray-400 leading-tight">For households & individuals</p>
                </div>
                {selectedRole === 'personal' && (
                  <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center self-end">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>

              {/* Business */}
              <button
                type="button"
                onClick={() => handleRoleSelect('business')}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200
                  ${selectedRole === 'business'
                    ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/15'
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedRole === 'business' ? 'bg-blue-500' : 'bg-gray-100'}`}>
                  <Building2 className={`w-5 h-5 ${selectedRole === 'business' ? 'text-white' : 'text-gray-500'}`} />
                </div>
                <div>
                  <p className={`font-bold text-sm ${selectedRole === 'business' ? 'text-blue-700' : 'text-gray-700'}`}>Business</p>
                  <p className="text-xs text-gray-400 leading-tight">For restaurants, cafes & hotels</p>
                </div>
                {selectedRole === 'business' && (
                  <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center self-end">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl mb-5 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Business Access Warning */}
          {isBusinessDisabled && (
            <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl mb-5 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-amber-700 font-medium mb-1">Business Pro unlocks advanced business tools</p>
                <p className="text-xs text-amber-600">
                  You can sign in to a business account, but inventory, orders, branches, and analytics require Business Pro.
                  <Link to="/pricing" className="font-semibold text-amber-700 hover:text-amber-800 underline ml-1">
                    Upgrade your plan
                  </Link>
                  {' '}to unlock the full workflow.
                </p>
                <p className="text-xs text-amber-500 mt-2">
                  <strong>Demo Login:</strong> Try all business features for free (3 uses per feature)
                </p>
              </div>
            </div>
          )}

          {/* Sign In Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="input-label">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="input-field pl-12"
                  required
                  autoComplete="email"
                />
              </div>
            </div>
            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input-field pl-12 pr-12"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 bg-transparent border-none p-0 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : `Sign In as ${selectedRole === 'business' ? 'Business' : 'Personal'}`}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-gradient-to-br from-emerald-50 via-white to-teal-50 text-gray-500">or continue with</span>
            </div>
          </div>

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign In with Google
          </button>

          {/* Demo Login — clearly separated */}
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
            <div className="flex items-start gap-2 mb-3">
              <Zap className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-amber-700 font-medium mb-1">Free Demo Mode</p>
                <p className="text-xs text-amber-600">
                  Try all features without signing up. Data is not permanently stored.
                </p>
                <p className="text-xs text-amber-500 mt-1">
                  <strong>Limit:</strong> 3 uses per feature for demo
                  {selectedRole === 'business' ? ' • All business features included' : ' • Personal features only'}
                </p>
              </div>
            </div>
            <button
              onClick={handleDemoLogin}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-100 border border-amber-300 rounded-xl font-semibold text-amber-800 hover:bg-amber-200 transition-colors text-sm"
            >
              <Zap className="w-4 h-4" />
              Demo Login — {selectedRole === 'business' ? 'Business Mode' : 'Personal Mode'}
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Belum punya akun?{' '}
            <Link to="/signup" className="font-semibold text-emerald-600 hover:text-emerald-700 no-underline">
              Daftar sekarang
            </Link>
          </p>
          <Link to="/" className="block text-center text-sm text-gray-400 hover:text-gray-600 mt-3 no-underline">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
