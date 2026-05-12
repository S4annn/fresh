import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Mail, CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { verifyOtp, resendOtp } from '../api';

export default function VerifyOtpPage() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const inputRefs = useRef([]);

  const searchParams = new URLSearchParams(location.search);
  const emailParam = searchParams.get('email');
  const storedEmail = sessionStorage.getItem('pending_verification_email');
  const email = emailParam || storedEmail || '';

  useEffect(() => {
    if (!email) {
      navigate('/signup');
    }
  }, [email, navigate]);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    } else {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleChange = (index, e) => {
    const value = e.target.value;
    if (isNaN(value)) return;
    
    const newOtp = [...otp];
    // Allow pasting
    if (value.length > 1) {
      const pastedData = value.slice(0, 6).split('');
      for (let i = 0; i < pastedData.length; i++) {
        newOtp[i] = pastedData[i];
      }
      setOtp(newOtp);
      const focusIndex = Math.min(pastedData.length, 5);
      inputRefs.current[focusIndex].focus();
      return;
    }

    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus next
    if (value !== '' && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpValue = otp.join('');
    if (otpValue.length < 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await verifyOtp(email, otpValue);
      
      localStorage.setItem("fresh_current_user", JSON.stringify(response.user));
      if (response.subscription) {
        localStorage.setItem("fresh_user_subscription", JSON.stringify(response.subscription));
      }
      localStorage.setItem("fresh_user_role", response.user.role);
      
      // Additional fallback just in case AuthContext is active
      localStorage.setItem("fresh_session_user", JSON.stringify(response.user));
      
      setSuccess('Email verified successfully');
      
      setTimeout(() => {
        if (response.user.role === 'business') {
          window.location.href = '/business/dashboard';
        } else {
          window.location.href = '/dashboard';
        }
      }, 1000);
      
    } catch (err) {
      setError(err.data?.detail || err.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await resendOtp(email);
      setSuccess('New OTP has been sent to your email.');
      setCountdown(60);
      setCanResend(false);
    } catch (err) {
      setError(err.data?.detail || err.message || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  if (!email) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-emerald-100 p-8">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
            <Mail className="w-8 h-8 text-emerald-600" />
          </div>
        </div>
        
        <h1 className="text-3xl font-extrabold text-center text-gray-900 mb-2">Verify your email</h1>
        <p className="text-center text-gray-500 mb-8">
          We sent a 6-digit code to <br/>
          <span className="font-semibold text-emerald-600">{email}</span>
        </p>

        {error && (
          <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl mb-6 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-6 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-700">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="flex justify-between gap-2">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="text"
                maxLength={6} // Allow paste full length
                value={digit}
                onChange={e => handleChange(index, e)}
                onKeyDown={e => handleKeyDown(index, e)}
                className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold text-gray-900 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex justify-center items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify OTP'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={handleResend}
            disabled={!canResend || loading}
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${!canResend ? '' : 'animate-pulse'}`} />
            {canResend ? 'Resend OTP' : `Resend OTP in ${countdown}s`}
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
          <Link to="/signup" className="text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors">
            ← Back to Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
