import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import { BUSINESS_TYPES } from '../data/businessDummyData';
import OTPVerification from '../components/OTPVerification';
import { Leaf, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, User, Building2, Phone, MapPin, Briefcase, CheckCircle2 } from 'lucide-react';
import { registerUser } from '../api';

export default function SignUpPage() {
  const { signUpLocal, signInWithGoogle, isFirebaseConfigured } = useAuth();
  const { setRole } = useRole();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState(
    () => localStorage.getItem('fresh_user_role') || 'personal'
  );
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');
  const [showOTP, setShowOTP]           = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const [form, setForm] = useState({
    full_name:         '',
    email:             '',
    password:          '',
    confirm_password:  '',
    business_name:     '',
    business_type:     'Restaurant',
    business_location: '',
    contact_number:    '',
  });

  function handleRoleSelect(r) {
    setSelectedRole(r);
    setRole(r);
  }

  function getRedirectPath(role) {
    return role === 'business' ? '/business/dashboard' : '/dashboard';
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validations
    if (!form.full_name.trim())                                    { setError('Nama lengkap wajib diisi.'); return; }
    if (!form.email.trim())                                        { setError('Email wajib diisi.'); return; }
    if (form.password.length < 6)                                  { setError('Password minimal 6 karakter.'); return; }
    if (form.password !== form.confirm_password)                   { setError('Password dan konfirmasi password tidak cocok.'); return; }
    if (selectedRole === 'business' && !form.business_name.trim()) { setError('Nama bisnis wajib diisi.'); return; }

    setLoading(true);
    try {
      setRole(selectedRole);
      
      // Call backend API to initiate registration with OTP
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: selectedRole === 'business' ? form.business_name.trim() : form.full_name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: selectedRole,
          business_name: form.business_name || null,
          business_type: form.business_type || null,
          business_location: form.business_location || null,
          contact_number: form.contact_number || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const detail = data.detail;
        let errorMsg = 'Pendaftaran gagal. Silakan coba lagi.';
        if (typeof detail === 'string') {
          errorMsg = detail;
        } else if (Array.isArray(detail)) {
          // FastAPI validation error format: [{msg: "...", loc: [...]}]
          errorMsg = detail.map((e) => e.msg || e.message || JSON.stringify(e)).join('. ');
        } else if (detail && typeof detail === 'object') {
          errorMsg = detail.msg || detail.message || JSON.stringify(detail);
        }
        throw new Error(errorMsg);
      }

      // Show OTP verification screen
      setRegisteredEmail(form.email.trim());
      setShowOTP(true);
      
      // Show OTP code from response (when email delivery is unavailable)
      if (data.dev_otp) {
        setSuccess(`Kode OTP Anda: ${data.dev_otp}`);
      } else {
        setSuccess(`OTP telah dikirim ke ${form.email.trim()}. Silakan periksa email Anda.`);
      }

    } catch (err) {
      setError(err.message || 'Pendaftaran gagal. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async (email) => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      
      const response = await fetch(`${API_BASE_URL}/auth/resend-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Gagal mengirim ulang OTP.');
      }

      if (data.dev_otp) {
        setSuccess(`Kode OTP baru: ${data.dev_otp}`);
      } else {
        setSuccess('OTP baru telah dikirim ke email Anda.');
      }

    } catch (err) {
      throw new Error(err.message || 'Gagal mengirim ulang OTP. Silakan coba lagi.');
    }
  };

  const handleOTPSuccess = (user) => {
    // Set role in context
    const userRole = user?.role || selectedRole;
    setRole(userRole);
    
    // Force page reload to pick up new auth state from localStorage
    const dashboardPath = userRole === 'business' ? '/business/dashboard' : '/dashboard';
    window.location.href = dashboardPath;
  };

  const handleBackToRegistration = () => {
    setShowOTP(false);
    setError('');
    setSuccess('');
  };

  const handleGoogleSignUp = async () => {
    setError('');
    if (!isFirebaseConfigured) {
      setError('Firebase belum dikonfigurasi. Silakan isi Firebase environment variables.');
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
        setError('Popup Google ditutup sebelum selesai. Coba lagi.');
      } else {
        setError(err.message || 'Google sign up gagal.');
      }
    } finally {
      setLoading(false);
    }
  };

  const f = (key, val) => setForm({ ...form, [key]: val });

  // Show OTP verification screen if needed
  if (showOTP) {
    return (
      <OTPVerification
        email={registeredEmail}
        onBack={handleBackToRegistration}
        onSuccess={handleOTPSuccess}
        onResendOTP={handleResendOTP}
        loading={loading}
        initialMessage={success}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-teal-600 via-emerald-700 to-emerald-800 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(20,184,166,0.3),transparent_60%)]" />
        <div className="relative text-center max-w-md">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-8">
            <Leaf className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-4xl font-extrabold text-white mb-4">Bergabung dengan F.R.E.S.H Hari Ini</h2>
          <p className="text-emerald-100 text-lg leading-relaxed mb-10">
            Mulai langkah pertama Anda untuk mengurangi limbah makanan.
          </p>
          <div className="space-y-3 text-left">
            {['Prediksi limbah makanan berbasis AI', 'Manajemen inventaris cerdas', 'Rekomendasi resep', 'Marketplace komunitas & donasi', 'Analitik & laporan bisnis'].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 bg-emerald-400/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-emerald-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <span className="text-emerald-100">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-md py-4">
          <div className="lg:hidden flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-extrabold text-gray-800">F.R.E.S.H</span>
          </div>

          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Buat Akun</h1>
          <p className="text-gray-500 mb-5">Daftar dan mulai kelola makanan secara cerdas.</p>

          {/* Role Selection */}
          <div className="mb-5">
            <p className="text-sm font-semibold text-gray-700 mb-3">Saya ingin menggunakan F.R.E.S.H sebagai:</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'personal', label: 'Personal', sub: 'Rumah tangga & individu', icon: User, color: 'emerald' },
                { key: 'business', label: 'Bisnis', sub: 'Restoran, kafe & hotel', icon: Building2, color: 'blue' },
              ].map(({ key, label, sub, icon: Icon, color }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleRoleSelect(key)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200
                    ${selectedRole === key
                      ? `border-${color}-500 bg-${color}-50 shadow-lg shadow-${color}-500/15`
                      : 'border-gray-200 bg-white hover:border-gray-300'}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedRole === key ? `bg-${color}-500` : 'bg-gray-100'}`}>
                    <Icon className={`w-5 h-5 ${selectedRole === key ? 'text-white' : 'text-gray-500'}`} />
                  </div>
                  <div className="text-center">
                    <p className={`font-bold text-sm ${selectedRole === key ? `text-${color}-700` : 'text-gray-700'}`}>{label}</p>
                    <p className="text-xs text-gray-400">{sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl mb-4 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl mb-4 animate-fade-in">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Common Fields */}
            <div>
              <label className="input-label">Nama Lengkap</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" value={form.full_name} onChange={(e) => f('full_name', e.target.value)} placeholder="Masukkan nama lengkap Anda" className="input-field pl-12" required />
              </div>
            </div>

            {/* Business Extra Fields */}
            {selectedRole === 'business' && (
              <>
                <div>
                  <label className="input-label">Nama Bisnis</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" value={form.business_name} onChange={(e) => f('business_name', e.target.value)} placeholder="misalnya Kafe Segar Jakarta" className="input-field pl-12" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="input-label">Jenis Bisnis</label>
                    <div className="relative">
                      <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <select value={form.business_type} onChange={(e) => f('business_type', e.target.value)} className="input-field pl-10 appearance-none">
                        {BUSINESS_TYPES.map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="input-label">Nomor Kontak</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="tel" value={form.contact_number} onChange={(e) => f('contact_number', e.target.value)} placeholder="+62 812..." className="input-field pl-10" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="input-label">Lokasi Bisnis</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={form.business_location} onChange={(e) => f('business_location', e.target.value)} placeholder="misalnya Jakarta Selatan" className="input-field pl-10" />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="input-label">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="email" value={form.email} onChange={(e) => f('email', e.target.value)} placeholder="name@example.com" className="input-field pl-12" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => f('password', e.target.value)} placeholder="Min. 6 karakter" className="input-field pl-12 pr-10" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 bg-transparent border-none p-0 cursor-pointer">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="input-label">Konfirmasi Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type={showPassword ? 'text' : 'password'} value={form.confirm_password} onChange={(e) => f('confirm_password', e.target.value)} placeholder="Ulangi password" className="input-field pl-12" required />
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-base mt-1">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : `Buat Akun ${selectedRole === 'business' ? 'Bisnis' : 'Personal'}`}
            </button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center text-sm"><span className="px-4 bg-gradient-to-br from-emerald-50 via-white to-teal-50 text-gray-500">atau daftar dengan</span></div>
          </div>

          <button onClick={handleGoogleSignUp} className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Daftar dengan Google
          </button>

          <p className="text-center text-sm text-gray-500 mt-5">
            Sudah punya akun?{' '}
            <Link to="/signin" className="font-semibold text-emerald-600 hover:text-emerald-700 no-underline">Masuk</Link>
          </p>
          <Link to="/" className="block text-center text-sm text-gray-400 hover:text-gray-600 mt-3 no-underline">← Kembali ke beranda</Link>
        </div>
      </div>
    </div>
  );
}
