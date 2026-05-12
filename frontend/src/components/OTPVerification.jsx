import React, { useState, useEffect, useRef } from 'react';
import { Mail, ArrowLeft, RefreshCw, CheckCircle2, AlertCircle, Timer } from 'lucide-react';

export default function OTPVerification({ 
  email, 
  onBack, 
  onSuccess, 
  onResendOTP,
  loading = false,
  initialMessage = ''
}) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [isExpired, setIsExpired] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState(initialMessage || ''); // OTP display message
  const [verified, setVerified] = useState(false); // true only after successful verification
  const [verifying, setVerifying] = useState(false);
  const inputRefs = useRef([]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0 && !isExpired) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      setIsExpired(true);
    }
  }, [timeLeft, isExpired]);

  // Auto-focus next input
  const handleChange = (index, value) => {
    if (value.length > 1) {
      value = value.slice(-1); // Take last character
    }
    
    if (/^\d*$/.test(value)) { // Only allow digits
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);
      
      // Auto-focus next input
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  // Handle backspace
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (/^\d{6}$/.test(pastedData)) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      inputRefs.current[5]?.focus();
    }
  };

  // Format time display
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Verify OTP
  const handleVerify = async () => {
    const otpString = otp.join('');
    
    if (otpString.length !== 6) {
      setError('Masukkan 6 digit kode OTP');
      return;
    }

    if (isExpired) {
      setError('Kode OTP telah kadaluarsa. Silakan minta kode baru.');
      return;
    }

    setVerifying(true);
    setError('');

    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      
      const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          otp: otpString
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const detail = data.detail;
        const errorMsg = typeof detail === 'string' ? detail : 'Kode OTP salah. Silakan coba lagi.';
        throw new Error(errorMsg);
      }

      setVerified(true);
      setInfo('Verifikasi berhasil! Mengalihkan ke dashboard...');
      
      // Save auth token and user data for session persistence
      if (data.access_token) {
        localStorage.setItem('fresh_auth_token', data.access_token);
        localStorage.setItem('fresh_token', data.access_token);
        localStorage.setItem('fresh_session_user', JSON.stringify(data.user));
        localStorage.setItem('fresh_current_user', JSON.stringify(data.user));
        if (data.user?.uid) localStorage.setItem('fresh_user_id', data.user.uid);
        if (data.user?.role) localStorage.setItem('fresh_user_role', data.user.role);
        
        // Redirect to dashboard after short delay
        setTimeout(() => {
          onSuccess(data.user);
        }, 1000);
      } else {
        // No token returned - still call onSuccess with user data
        onSuccess(data.user);
      }

    } catch (err) {
      const msg = typeof err.message === 'string' ? err.message : 'Kode OTP salah. Silakan coba lagi.';
      setError(msg);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    if (loading) return;
    
    setError('');
    
    try {
      await onResendOTP(email);
      setInfo('Kode OTP baru telah dikirim.');
      setTimeLeft(600); // Reset timer
      setIsExpired(false);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.message || 'Gagal mengirim ulang OTP. Silakan coba lagi.');
    }
  };

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifikasi Email</h2>
          <p className="text-gray-600 text-sm">
            Masukkan kode 6 digit untuk verifikasi<br />
            <span className="font-medium text-emerald-600">{email}</span>
          </p>
        </div>

        {/* Timer */}
        <div className="flex items-center justify-center mb-6">
          <Timer className={`w-4 h-4 mr-2 ${isExpired ? 'text-red-500' : 'text-gray-500'}`} />
          <span className={`text-sm font-medium ${isExpired ? 'text-red-500' : 'text-gray-500'}`}>
            {isExpired ? 'Kadaluarsa' : `Berlaku: ${formatTime(timeLeft)}`}
          </span>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl mb-6">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {info && (
          <div className="flex items-start gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl mb-6">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-700">{info}</p>
          </div>
        )}

        {/* OTP Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-4">
            Masukkan Kode OTP
          </label>
          <div className="flex justify-between gap-2">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                pattern="[0-9]"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors
                  ${digit ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300'}
                  ${isExpired ? 'border-red-300 bg-red-50' : ''}
                `}
                disabled={verifying}
              />
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleVerify}
            disabled={verifying || verified || otp.join('').length !== 6 || isExpired}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {verifying ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Memverifikasi...
              </>
            ) : (
              'Verifikasi OTP'
            )}
          </button>

          <button
            onClick={handleResend}
            disabled={loading || timeLeft > 540} // Only allow resend after 1 minute
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {timeLeft > 540 ? `Tunggu ${Math.floor((timeLeft - 540) / 60)} menit` : 'Kirim Ulang OTP'}
          </button>

          <button
            onClick={onBack}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Registrasi
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Tidak menerima email? Periksa folder spam atau<br />
            pastikan email yang dimasukkan benar.
          </p>
        </div>
      </div>
    </div>
  );
}
