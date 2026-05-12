import React, { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RoleProvider, useRole } from './context/RoleContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import DashboardLayout from './layouts/DashboardLayout';
import BusinessLayout from './layouts/BusinessLayout';
import { canAccessBusinessFeature, useSubscription } from './services/subscription';
import './index.css';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const SignInPage = lazy(() => import('./pages/SignInPage'));
const SignUpPage = lazy(() => import('./pages/SignUpPage'));
const VerifyOtpPage = lazy(() => import('./pages/VerifyOtpPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const InventoryPage = lazy(() => import('./pages/InventoryPage'));
const PredictPage = lazy(() => import('./pages/PredictPage'));
const RecommendationsPage = lazy(() => import('./pages/RecommendationsPage'));
const MarketplacePage = lazy(() => import('./pages/MarketplacePage'));
const DonationPage = lazy(() => import('./pages/DonationPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const PersonalReportPage = lazy(() => import('./pages/PersonalReportPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ScannerPage = lazy(() => import('./pages/ScannerPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const MapTestPage = lazy(() => import('./pages/MapTestPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const BusinessProRequiredPage = lazy(() => import('./pages/BusinessProRequiredPage'));
const BusinessDashboardPage = lazy(() => import('./pages/business/BusinessDashboardPage'));
const BusinessInventoryPage = lazy(() => import('./pages/business/BusinessInventoryPage'));
const BusinessOrdersPage = lazy(() => import('./pages/business/BusinessOrdersPage'));
const BusinessBranchesPage = lazy(() => import('./pages/business/BusinessBranchesPage'));
const BusinessAnalyticsPage = lazy(() => import('./pages/business/BusinessAnalyticsPage'));

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
              <Suspense fallback={<LoadingScreen />}>
                <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/signin" element={<PublicRoute><SignInPage /></PublicRoute>} />
            <Route path="/signup" element={<PublicRoute><SignUpPage /></PublicRoute>} />
            <Route path="/verify-otp" element={<PublicRoute><VerifyOtpPage /></PublicRoute>} />

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
              <Route path="/report" element={<PersonalReportPage />} />
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
              </Suspense>
            </BrowserRouter>
          </ThemeProvider>
        </LanguageProvider>
      </RoleProvider>
    </AuthProvider>
  );
}

createRoot(document.getElementById('root')).render(<App />);
