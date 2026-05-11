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
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveAccounts(accounts) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
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
  const signUpLocal = ({ name, email, password, role = 'personal', businessName, businessType, businessLocation, contactNumber }) => {
    if (!email || !password || !name) {
      throw new Error('Nama, email, dan password wajib diisi.');
    }
    const accounts = getAccounts();
    const key = email.toLowerCase().trim();
    if (accounts[key]) {
      throw new Error('Email sudah terdaftar. Silakan sign in atau gunakan email lain.');
    }

    const uid = 'local-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    const newAccount = {
      uid,
      name:             name.trim(),
      email:            key,
      password,                    // stored as-is (MVP — no backend hashing)
      role,
      provider:         'local',
      businessName:     businessName || null,
      businessType:     businessType || null,
      businessLocation: businessLocation || null,
      contactNumber:    contactNumber || null,
      createdAt:        new Date().toISOString(),
    };

    accounts[key] = newAccount;
    saveAccounts(accounts);

    // Auto sign-in after registration
    const sessionUser = _buildSessionUser(newAccount);
    saveSession(sessionUser);
    setUser(sessionUser);
    return sessionUser;
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
