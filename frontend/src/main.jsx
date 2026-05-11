import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RoleProvider, useRole } from './context/RoleContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import DashboardLayout from './layouts/DashboardLayout';
import BusinessLayout from './layouts/BusinessLayout';
import LandingPage from './pages/LandingPage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import PricingPage from './pages/PricingPage';
import DashboardPage from './pages/DashboardPage';
import InventoryPage from './pages/InventoryPage';
import PredictPage from './pages/PredictPage';
import RecommendationsPage from './pages/RecommendationsPage';
import MarketplacePage from './pages/MarketplacePage';
import DonationPage from './pages/DonationPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import ScannerPage from './pages/ScannerPage';
import NotFoundPage from './pages/NotFoundPage';
import MapTestPage from './pages/MapTestPage';
import NotificationsPage from './pages/NotificationsPage';
import BusinessProRequiredPage from './pages/BusinessProRequiredPage';
import BusinessDashboardPage from './pages/business/BusinessDashboardPage';
import BusinessInventoryPage from './pages/business/BusinessInventoryPage';
import BusinessOrdersPage from './pages/business/BusinessOrdersPage';
import BusinessBranchesPage from './pages/business/BusinessBranchesPage';
import BusinessAnalyticsPage from './pages/business/BusinessAnalyticsPage';
import { canAccessBusinessFeature, useSubscription } from './services/subscription';
import './index.css';

function LoadingScreen() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 font-medium">{t('loadingFresh', 'Loading F.R.E.S.H...')}</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/signin" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const { role } = useRole();
  if (loading) return <LoadingScreen />;
  if (isAuthenticated) {
    return <Navigate to={role === 'business' ? '/business/dashboard' : '/dashboard'} replace />;
  }
  return children;
}

function BusinessProRoute({ children }) {
  useSubscription();
  if (!canAccessBusinessFeature()) return <BusinessProRequiredPage />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <RoleProvider>
        <LanguageProvider>
          <ThemeProvider>
            <BrowserRouter>
              <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/signin" element={<PublicRoute><SignInPage /></PublicRoute>} />
            <Route path="/signup" element={<PublicRoute><SignUpPage /></PublicRoute>} />

            {/* Personal Protected Routes */}
            <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/scanner" element={<ScannerPage />} />
              <Route path="/predict" element={<PredictPage />} />
              <Route path="/recommendations" element={<RecommendationsPage />} />
              <Route path="/marketplace" element={<MarketplacePage />} />
              <Route path="/donation" element={<DonationPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/report" element={<AnalyticsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Business Protected Routes */}
            <Route element={<ProtectedRoute><BusinessLayout /></ProtectedRoute>}>
              <Route path="/business/dashboard" element={<BusinessDashboardPage />} />
              <Route path="/business/inventory" element={<BusinessProRoute><BusinessInventoryPage /></BusinessProRoute>} />
              <Route path="/business/scanner" element={<ScannerPage />} />
              <Route path="/business/predict" element={<PredictPage />} />
              <Route path="/business/recommendations" element={<RecommendationsPage />} />
              <Route path="/business/marketplace" element={<MarketplacePage />} />
              <Route path="/business/donation" element={<DonationPage />} />
              <Route path="/business/orders" element={<BusinessProRoute><BusinessOrdersPage /></BusinessProRoute>} />
              <Route path="/business/branches" element={<BusinessProRoute><BusinessBranchesPage /></BusinessProRoute>} />
              <Route path="/business/analytics" element={<BusinessProRoute><BusinessAnalyticsPage /></BusinessProRoute>} />
              <Route path="/business/report" element={<BusinessProRoute><BusinessAnalyticsPage /></BusinessProRoute>} />
              <Route path="/business/notifications" element={<NotificationsPage />} />
              <Route path="/business/settings" element={<SettingsPage />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
            {/* Map Test */}
            <Route path="/map-test" element={<MapTestPage />} />
              </Routes>
            </BrowserRouter>
          </ThemeProvider>
        </LanguageProvider>
      </RoleProvider>
    </AuthProvider>
  );
}

createRoot(document.getElementById('root')).render(<App />);
