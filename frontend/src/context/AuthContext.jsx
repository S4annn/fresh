import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider, isConfigured } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const isDemoMode = user?.provider === 'demo';

  useEffect(() => {
    if (isConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          setUser({
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || 'User',
            email: firebaseUser.email,
            photo: firebaseUser.photoURL,
            provider: 'google',
          });
        } else {
          // Check for demo user in localStorage
          const demoUser = localStorage.getItem('fresh_demo_user');
          if (demoUser) {
            setUser(JSON.parse(demoUser));
          } else {
            setUser(null);
          }
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      // No Firebase, check for demo user
      const demoUser = localStorage.getItem('fresh_demo_user');
      if (demoUser) {
        setUser(JSON.parse(demoUser));
      }
      setLoading(false);
    }
  }, []);

  const signInWithGoogle = async () => {
    if (!isConfigured || !auth || !googleProvider) {
      throw new Error('Firebase belum dikonfigurasi. Silakan isi Firebase environment variables di file .env');
    }

    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  };

  const signInDemo = (email = 'demo@fresh.app', name = 'Demo User') => {
    const demoUser = {
      uid: 'demo-user-001',
      name,
      email,
      photo: null,
      provider: 'demo',
    };
    localStorage.setItem('fresh_demo_user', JSON.stringify(demoUser));
    setUser(demoUser);
    return demoUser;
  };

  const signUpDemo = (name, email) => {
    const demoUser = {
      uid: 'demo-user-' + Date.now(),
      name,
      email,
      photo: null,
      provider: 'demo',
    };
    localStorage.setItem('fresh_demo_user', JSON.stringify(demoUser));
    setUser(demoUser);
    return demoUser;
  };

  const logout = async () => {
    if (isConfigured && auth && user?.provider === 'google') {
      await signOut(auth);
    }
    localStorage.removeItem('fresh_demo_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        isDemoMode,
        isFirebaseConfigured: isConfigured,
        signInWithGoogle,
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
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
