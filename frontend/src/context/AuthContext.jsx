import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider, isConfigured } from '../firebase';
import {
  createDemoSubscription,
  ensureSubscriptionForRole,
  getCurrentSubscription,
  saveSubscription,
  setCurrentSubscription,
} from '../services/subscription';

const AuthContext = createContext(null);
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const TOKEN_KEY = 'fresh_auth_token';

// ─── Local account store (persisted in localStorage) ─────────────────────────
// Schema: { [email]: { uid, name, email, password, role, provider: 'local', createdAt } }
const ACCOUNTS_KEY = 'fresh_accounts';
const SESSION_KEY  = 'fresh_session_user';

function getAccounts() {
  // Legacy function - no longer used for signup
  // Kept for backward compatibility with existing sessions
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveAccounts(accounts) {
  // Legacy function - no longer saves new accounts
  // Only used for migration purposes
  console.warn('saveAccounts is deprecated - using database for new users');
}

function saveSession(user) {
  if (user?.provider !== 'demo') {
    localStorage.removeItem('fresh_demo_user');
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  localStorage.setItem('fresh_current_user', JSON.stringify(user));
  if (user?.uid) localStorage.setItem('fresh_user_id', user.uid);
  if (user?.role) localStorage.setItem('fresh_user_role', user.role);
}

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('fresh_current_user');
  localStorage.removeItem('fresh_user_id');
  localStorage.removeItem(TOKEN_KEY);
  // Keep legacy key clean too
  localStorage.removeItem('fresh_demo_user');
}

async function fetchCurrentUser(accessToken) {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Gagal mengambil data user setelah login.');
  }

  return response.json();
}

async function fetchSubscriptionForUser(user, accessToken) {
  const response = await fetch(`${API_BASE_URL}/subscription`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Fresh-User-Id': user.uid,
      'X-Fresh-Role': user.role || 'personal',
      'X-Fresh-Demo': 'false',
    },
  });

  if (!response.ok) {
    throw new Error('Gagal mengambil data subscription.');
  }

  return response.json();
}

function buildSessionUser(data) {
  return {
    uid: data.uid,
    name: data.name,
    email: data.email,
    role: data.role || 'personal',
    provider: data.provider || 'local',
    business_name: data.business_name,
    business_type: data.business_type,
    business_location: data.business_location,
    contact_number: data.contact_number,
    createdAt: data.created_at || new Date().toISOString(),
  };
}

function getPreferredRole() {
  const role = localStorage.getItem('fresh_user_role');
  return role === 'business' ? 'business' : 'personal';
}

function buildGoogleSessionUser(firebaseUser) {
  return {
    uid: firebaseUser.uid,
    name: firebaseUser.displayName || 'User',
    email: firebaseUser.email,
    photo: firebaseUser.photoURL,
    provider: 'google',
    role: getPreferredRole(),
    createdAt: new Date().toISOString(),
  };
}

function ensureRealUserSubscription(role = 'personal') {
  const subscription = getCurrentSubscription();
  if (subscription?.is_demo || subscription?.plan_id === 'demo') {
    return setCurrentSubscription('free', role, 'monthly');
  }
  // Don't overwrite existing real subscription - just return it
  return subscription;
}

function persistRealSession(user) {
  localStorage.removeItem(TOKEN_KEY);
  saveSession(user);
  // Only reset subscription if it was a demo subscription - never overwrite real subscriptions
  const subscription = getCurrentSubscription();
  if (subscription?.is_demo || subscription?.plan_id === 'demo') {
    setCurrentSubscription('free', user.role || 'personal', 'monthly');
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  const isDemoMode = user?.provider === 'demo';

  useEffect(() => {
    if (isConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          const u = buildGoogleSessionUser(firebaseUser);
          persistRealSession(u);
          setUser(u);
        } else {
          // Firebase signed out — check local session
          const session = loadSession();
          setUser(session || null);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      // No Firebase — use local session only
      const session = loadSession();
      setUser(session || null);
      setLoading(false);
    }
  }, []);

  // ── Google Sign In ──────────────────────────────────────────────────────────
  const signInWithGoogle = async () => {
    if (!isConfigured || !auth || !googleProvider) {
      throw new Error('Firebase belum dikonfigurasi. Silakan isi Firebase environment variables di file .env');
    }
    const result = await signInWithPopup(auth, googleProvider);
    const sessionUser = buildGoogleSessionUser(result.user);
    persistRealSession(sessionUser);
    setUser(sessionUser);
    return sessionUser;
  };

  // ── Local Sign Up (register new account) ───────────────────────────────────
  const signUpLocal = async ({ name, email, password, role = 'personal', businessName, businessType, businessLocation, contactNumber }) => {
    if (!email || !password || !name) {
      throw new Error('Nama, email, dan password wajib diisi.');
    }

    try {
      // Call backend API to register user
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          password: password,
          role: role,
          business_name: businessName || null,
          business_type: businessType || null,
          business_location: businessLocation || null,
          contact_number: contactNumber || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle backend error messages
        if (response.status === 400 && data.detail && data.detail.includes('Email already registered')) {
          throw new Error('Email sudah terdaftar. Silakan sign in atau gunakan email lain.');
        }
        throw new Error(data.detail || 'Registrasi gagal. Silakan coba lagi.');
      }

      // Auto sign-in after successful registration so real accounts get a token.
      const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
        }),
      });

      const loginData = await loginResponse.json();
      if (!loginResponse.ok) {
        throw new Error(loginData.detail || 'Pendaftaran berhasil, tapi auto-login gagal. Silakan sign in.');
      }

      localStorage.setItem(TOKEN_KEY, loginData.access_token);
      const userData = loginData.user || await fetchCurrentUser(loginData.access_token);
      const sessionUser = buildSessionUser(userData || data);

      saveSession(sessionUser);
      // Use subscription from login response directly
      if (loginData.subscription && loginData.subscription.plan_id) {
        saveSubscription(loginData.subscription);
      } else {
        try {
          saveSubscription(await fetchSubscriptionForUser(sessionUser, loginData.access_token));
        } catch {
          ensureSubscriptionForRole(sessionUser.role);
        }
      }
      setUser(sessionUser);
      return sessionUser;

    } catch (error) {
      // If it's already our error message, just rethrow it
      if (error.message.includes('Email sudah terdaftar')) {
        throw error;
      }
      
      // For network errors or other issues
      console.error('Signup error:', error);
      throw new Error('Registrasi gagal. Periksa koneksi internet dan coba lagi.');
    }
  };

  // ── Local Sign In (validate credentials) ───────────────────────────────────
  const signInLocal = async ({ email, password }) => {
    if (!email || !password) {
      throw new Error('Email dan password wajib diisi.');
    }

    try {
      // Call backend API to authenticate user
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle backend error messages
        if (response.status === 403 && data.detail && data.detail === 'Email not verified') {
          const err = new Error('Email not verified');
          err.requires_otp = true;
          err.email = data.email || email.toLowerCase().trim();
          throw err;
        }
        if (response.status === 401) {
          throw new Error('Email tidak ditemukan atau password salah. Silakan coba lagi.');
        }
        throw new Error(data.detail || 'Login gagal. Silakan coba lagi.');
      }

      localStorage.setItem(TOKEN_KEY, data.access_token);
      const userData = data.user || await fetchCurrentUser(data.access_token);
      const sessionUser = buildSessionUser(userData);

      // Save session and update context
      saveSession(sessionUser);
      
      // Use subscription from login response directly (persisted in database)
      // This avoids a separate fetch that might fail and reset to free
      if (data.subscription && data.subscription.plan_id) {
        saveSubscription(data.subscription);
      } else {
        // Fallback: try fetching from backend
        try {
          const subData = await fetchSubscriptionForUser(sessionUser, data.access_token);
          saveSubscription(subData);
        } catch {
          // Only ensure something exists if nothing is stored - don't overwrite
          ensureSubscriptionForRole(sessionUser.role);
        }
      }
      
      setUser(sessionUser);
      return sessionUser;

    } catch (error) {
      // Re-throw errors with proper messages
      if (error.message.includes('Email not verified') || 
          error.message.includes('tidak ditemukan') ||
          error.message.includes('Login gagal')) {
        throw error;
      }
      console.error('Login error:', error);
      throw new Error('Login gagal. Periksa koneksi internet dan coba lagi.');
    }
  };

  // ── Demo Login (no credentials needed) ─────────────────────────────────────
  const signInDemo = (email = 'demo@fresh.app', name = 'Demo User') => {
    const role = localStorage.getItem('fresh_user_role') || 'personal';
    const demoUser = {
      uid:      `demo-user-${role}-${Date.now()}`,
      name:     `${role === 'business' ? 'Business' : 'Personal'} Demo User`,
      email,
      photo:    null,
      provider: 'demo',
      role:     role,
    };
    
    // Create demo subscription with role-specific limits
    const demoSubscription = createDemoSubscription(role);
    saveSubscription(demoSubscription);
    
    saveSession(demoUser);
    // Keep legacy key for backward compat
    localStorage.setItem('fresh_demo_user', JSON.stringify(demoUser));
    setUser(demoUser);
    return demoUser;
  };

  // Legacy alias used by some pages
  const signUpDemo = (name, email) => {
    const role = getPreferredRole();
    const demoUser = {
      uid:      'demo-user-' + Date.now(),
      name,
      email,
      photo:    null,
      provider: 'demo',
      role,
    };
    saveSubscription(createDemoSubscription(role));
    saveSession(demoUser);
    localStorage.setItem('fresh_demo_user', JSON.stringify(demoUser));
    setUser(demoUser);
    return demoUser;
  };

  // ── Logout ──────────────────────────────────────────────────────────────────
  const logout = async () => {
    if (isConfigured && auth && user?.provider === 'google') {
      await signOut(auth);
    }
    clearSession();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated:      !!user,
        isDemoMode,
        isFirebaseConfigured: isConfigured,
        // New proper auth methods
        signInLocal,
        signUpLocal,
        // Google
        signInWithGoogle,
        // Demo / legacy
        signInDemo,
        signUpDemo,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────
function _buildSessionUser(account) {
  return {
    uid:          account.uid,
    name:         account.name,
    email:        account.email,
    photo:        null,
    provider:     'local',
    role:         account.role || 'personal',
    businessName: account.businessName || null,
  };
}
