import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider, isConfigured } from '../firebase';
import { createDemoSubscription, saveSubscription } from '../services/subscription';

const AuthContext = createContext(null);

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
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
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
  // Keep legacy key clean too
  localStorage.removeItem('fresh_demo_user');
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
          const u = {
            uid:      firebaseUser.uid,
            name:     firebaseUser.displayName || 'User',
            email:    firebaseUser.email,
            photo:    firebaseUser.photoURL,
            provider: 'google',
          };
          setUser(u);
          saveSession(u);
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
    return result.user;
  };

  // ── Local Sign Up (register new account) ───────────────────────────────────
  const signUpLocal = async ({ name, email, password, role = 'personal', businessName, businessType, businessLocation, contactNumber }) => {
    if (!email || !password || !name) {
      throw new Error('Nama, email, dan password wajib diisi.');
    }

    try {
      // Call backend API to register user
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      
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

      // Auto sign-in after successful registration
      const sessionUser = {
        uid: data.uid,
        name: data.name,
        email: data.email,
        role: data.role,
        provider: 'local',
        business_name: data.business_name,
        business_type: data.business_type,
        business_location: data.business_location,
        contact_number: data.contact_number,
        createdAt: new Date().toISOString(),
      };

      saveSession(sessionUser);
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
  const signInLocal = ({ email, password }) => {
    if (!email || !password) {
      throw new Error('Email dan password wajib diisi.');
    }
    const accounts = getAccounts();
    const key = email.toLowerCase().trim();
    const account = accounts[key];

    if (!account) {
      throw new Error('Email tidak ditemukan. Silakan daftar terlebih dahulu.');
    }
    if (account.password !== password) {
      throw new Error('Password salah. Silakan coba lagi.');
    }

    const sessionUser = _buildSessionUser(account);
    saveSession(sessionUser);
    setUser(sessionUser);
    return sessionUser;
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
    const demoUser = {
      uid:      'demo-user-' + Date.now(),
      name,
      email,
      photo:    null,
      provider: 'demo',
    };
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
