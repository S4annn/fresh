import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import { useLanguage } from '../context/LanguageContext';
import {
  LayoutDashboard, Package, Brain, Lightbulb, ShoppingBag, Heart,
  BarChart3, Settings, Menu, X, Bell, Search, LogOut, ChevronDown,
  Leaf, User, Scan, ArrowLeftRight, Lock, CreditCard, FileText,
} from 'lucide-react';
import { hasFeature, useSubscription } from '../services/subscription';

const baseSidebarItems = [
  { path: '/dashboard', labelKey: 'dashboard', fallback: 'Dashboard', icon: LayoutDashboard },
  { path: '/inventory', labelKey: 'inventory', fallback: 'Inventory', icon: Package },
  { path: '/scanner', labelKey: 'aiScanner', fallback: 'AI Scanner', icon: Scan },
  { path: '/predict', labelKey: 'aiPrediction', fallback: 'AI Prediction', icon: Brain },
  { path: '/recommendations', labelKey: 'recommendations', fallback: 'Recommendations', icon: Lightbulb },
  { path: '/marketplace', labelKey: 'marketplace', fallback: 'Marketplace', icon: ShoppingBag },
  { path: '/donation', labelKey: 'donation', fallback: 'Donation', icon: Heart },
  { path: '/analytics', labelKey: 'analytics', fallback: 'Analytics', icon: BarChart3 },
  { path: '/report', labelKey: 'personalReport', fallback: 'Personal Report', icon: FileText, feature: 'personal_report', requiredPlan: 'personal_plus' },
  { path: '/pricing', labelKey: 'pricing', fallback: 'Pricing', icon: CreditCard },
  { path: '/settings', labelKey: 'settings', fallback: 'Settings', icon: Settings },
];

export default function DashboardLayout() {
  const { user, logout, isDemoMode } = useAuth();
  const { setRole } = useRole();
  const { t } = useLanguage();
  const { plan } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleSwitchToBusiness = () => {
    setRole('business');
    navigate('/business/dashboard');
  };

  const sidebarItems = baseSidebarItems.map((item) => ({
    ...item,
    locked: item.feature ? !hasFeature(item.feature) : false,
    fallback: item.path === '/analytics'
      ? (plan.plan_id === 'free' ? 'Basic Analytics' : 'Advanced Analytics')
      : item.fallback,
  }));
  const currentPage = sidebarItems.find((item) => location.pathname.startsWith(item.path));

  return (
    <div className="flex h-screen bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30 overflow-hidden">
      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white/90 backdrop-blur-xl border-r border-emerald-100/50 
        flex flex-col transform transition-transform duration-300 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-emerald-100/50">
          <NavLink to="/dashboard" className="flex items-center gap-3 no-underline" onClick={() => setSidebarOpen(false)}>
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800 leading-none">F.R.E.S.H</h1>
              <p className="text-[10px] text-emerald-600 font-medium tracking-wider">{t('personalEdition', 'PERSONAL EDITION')}</p>
            </div>
          </NavLink>
          <button className="lg:hidden btn-icon hover:bg-gray-100" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 overflow-y-auto space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.locked ? '/pricing' : item.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `sidebar-link ${isActive && !item.locked ? 'active' : ''}`
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{t(item.labelKey, item.fallback)}</span>
                {item.locked && <Lock className="ml-auto h-3.5 w-3.5 text-gray-400" />}
              </NavLink>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-4 border-t border-emerald-100/50">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {user?.photo ? (
                <img src={user.photo} alt={user.name} className="w-9 h-9 rounded-full object-cover" />
              ) : (
                user?.name?.charAt(0)?.toUpperCase() || 'U'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{user?.name || t('user', 'User')}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="flex items-center justify-between px-4 lg:px-8 py-4 bg-white/60 backdrop-blur-xl border-b border-emerald-100/30 z-30">
          <div className="flex items-center gap-4">
            <button className="lg:hidden btn-icon hover:bg-emerald-50" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <div className="hidden sm:flex items-center gap-3">
              <h2 className="text-lg font-bold text-gray-800">{currentPage ? t(currentPage.labelKey, currentPage.fallback) : t('dashboard', 'Dashboard')}</h2>
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg">{t('personal', 'Personal')}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="hidden md:flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5 w-64 border border-gray-100 focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('search', 'Search...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-gray-700 placeholder:text-gray-400 w-full"
              />
            </div>

            {/* Notifications */}
            <button
              onClick={() => navigate('/notifications')}
              className="btn-icon bg-gray-50 hover:bg-emerald-50 relative border border-gray-100"
            >
              <Bell className="w-5 h-5 text-gray-500" />
              {isDemoMode && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">3</span>
              )}
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-xs">
                  {user?.photo ? (
                    <img src={user.photo} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    user?.name?.charAt(0)?.toUpperCase() || 'U'
                  )}
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-fade-in">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <NavLink
                      to="/settings"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 transition-colors no-underline"
                    >
                      <User className="w-4 h-4" />
                      {t('profileSettings', 'Profile & Settings')}
                    </NavLink>
                    <button
                      onClick={handleSwitchToBusiness}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 w-full transition-colors"
                    >
                      <ArrowLeftRight className="w-4 h-4" />
                      {t('switchToBusiness', 'Switch to Business')}
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      {t('signOut', 'Sign Out')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Bottom Navigation (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-emerald-100/50 z-30 lg:hidden">
        <div className="flex items-center justify-around py-2">
          {sidebarItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.locked ? '/pricing' : item.path}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors no-underline
                  ${isActive ? 'text-emerald-600' : 'text-gray-400'}`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{t(item.labelKey, item.fallback).split(' ')[0]}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
