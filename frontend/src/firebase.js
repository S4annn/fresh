import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app = null;
let auth = null;
let googleProvider = null;
let isConfigured = false;

// Only initialize Firebase if config values are provided
if (firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    isConfigured = true;
  } catch (error) {
    console.warn('Firebase initialization failed:', error.message);
  }
}

export { app, auth, googleProvider, isConfigured };
