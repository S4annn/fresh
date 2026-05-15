import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import ThemeToggle from '../components/ThemeToggle';
import AIAssistantWidget from '../components/AIAssistantWidget';
import NotificationListener from '../components/NotificationListener';
import {
  LayoutDashboard, Package, Scan, Brain, Lightbulb, ShoppingBag,
  Heart, BarChart3, Settings, Menu, X, Bell, Search, LogOut,
  ChevronDown, User, ClipboardList, GitBranch, Building2,
  Lock, FileText,
} from 'lucide-react';
import { hasFeature, useSubscription, isDemoUser } from '../services/subscription';

const baseBusinessNavItems = [
  { path: '/business/dashboard', labelKey: 'dashboard', fallback: 'Dashboard', icon: LayoutDashboard },
  { path: '/business/inventory', labelKey: 'inventory', fallback: 'Inventory', icon: Package, feature: 'business_inventory' },
  { path: '/business/scanner', labelKey: 'aiScanner', fallback: 'AI Scanner', icon: Scan },
  { path: '/business/predict', labelKey: 'riskForecast', fallback: 'Risk Forecast', icon: Brain },
  { path: '/business/recommendations', labelKey: 'recommendations', fallback: 'Recommendations', icon: Lightbulb },
  { path: '/business/marketplace', labelKey: 'marketplace', fallback: 'Marketplace', icon: ShoppingBag },
  { path: '/business/donation', labelKey: 'donation', fallback: 'Donation', icon: Heart },
  { path: '/business/orders', labelKey: 'orders', fallback: 'Orders', icon: ClipboardList, feature: 'business_orders' },
  { path: '/business/branches', labelKey: 'branches', fallback: 'Branches', icon: GitBranch, feature: 'business_branches' },
  { path: '/business/analytics', labelKey: 'analytics', fallback: 'Business Analytics', icon: BarChart3, feature: 'business_analytics' },
  { path: '/business/report', labelKey: 'sustainabilityReport', fallback: 'Sustainability Report', icon: FileText, feature: 'sustainability_report' },
  { path: '/business/settings', labelKey: 'settings', fallback: 'Settings', icon: Settings },
];

export default function BusinessLayout() {
  const { user, logout, isDemoMode } = useAuth();
  const { t } = useLanguage();
  const { plan } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isDemo = isDemoUser();
  const businessNavItems = baseBusinessNavItems.map((item) => ({
    ...item,
    // In demo mode, don't lock features
    locked: isDemo ? false : (item.feature ? !hasFeature(item.feature) : false),
  }));
  const currentPage = businessNavItems.find((item) => location.pathname.startsWith(item.path));
  const editionLabel = plan.plan_id === 'business_pro'
    ? 'BUSINESS'
    : plan.plan_id === 'personal_plus'
      ? 'PERSONAL PLUS'
      : isDemo
        ? 'DEMO EDITION'
        : 'FREE EDITION';

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white/90 backdrop-blur-xl border-r border-blue-100/50 flex flex-col transform transition-transform duration-300 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-blue-100/50">
          <NavLink to="/business/dashboard" className="flex items-center gap-3 no-underline" onClick={() => setSidebarOpen(false)}>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800 leading-none">F.R.E.S.H</h1>
              <p className="text-[10px] text-blue-600 font-medium tracking-wider">{editionLabel}</p>
            </div>
          </NavLink>
          <button className="lg:hidden btn-icon hover:bg-gray-100" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-4 overflow-y-auto space-y-0.5">
          {businessNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.locked ? '/pricing' : item.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 no-underline
                  ${isActive && !item.locked
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'}`
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
        <div className="p-4 border-t border-blue-100/50">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {user?.photo ? <img src={user.photo} alt={user.name} className="w-9 h-9 rounded-full object-cover" /> : user?.name?.charAt(0)?.toUpperCase() || 'B'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{user?.name || t('businessUser', 'Business User')}</p>
              <p className="text-xs text-blue-600 font-medium">{t('businessAccount', 'Business Account')}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-4 lg:px-8 py-4 bg-white/60 backdrop-blur-xl border-b border-blue-100/30 z-30">
          <div className="flex items-center gap-4">
            <button className="lg:hidden btn-icon hover:bg-blue-50" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <div className="hidden sm:flex items-center gap-3">
              <h2 className="text-lg font-bold text-gray-800">{currentPage ? t(currentPage.labelKey, currentPage.fallback) : t('dashboard', 'Dashboard')}</h2>
              <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg">{t('business', 'Business')}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5 w-56 border border-gray-100 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <Search className="w-4 h-4 text-gray-400" />
              <input type="text" placeholder={t('search', 'Search...')} className="bg-transparent border-none outline-none text-sm text-gray-700 placeholder:text-gray-400 w-full" />
            </div>

            <ThemeToggle compact />

            <button
              onClick={() => navigate('/business/notifications')}
              className="btn-icon bg-gray-50 hover:bg-blue-50 relative border border-gray-100"
            >
              <Bell className="w-5 h-5 text-gray-500" />
              {isDemoMode && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">5</span>
              )}
            </button>

            <div className="relative">
              <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-xs">
                  {user?.photo ? <img src={user.photo} alt="" className="w-8 h-8 rounded-full object-cover" /> : user?.name?.charAt(0)?.toUpperCase() || 'B'}
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-fade-in">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
                      <p className="text-xs text-blue-600 font-medium">{t('businessAccount', 'Business Account')}</p>
                    </div>
                    <NavLink to="/business/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 transition-colors no-underline">
                      <User className="w-4 h-4" /> {t('settings', 'Settings')}
                    </NavLink>
                    <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full transition-colors">
                      <LogOut className="w-4 h-4" /> {t('signOut', 'Sign Out')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-blue-100/50 z-30 lg:hidden">
        <div className="flex items-center justify-around py-2">
          {businessNavItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <NavLink key={item.path} to={item.locked ? '/pricing' : item.path} className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors no-underline ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{t(item.labelKey, item.fallback).split(' ')[0]}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* AI Assistant (floating widget) */}
      <AIAssistantWidget />

      {/* Real-time notifications */}
      <NotificationListener />
    </div>
  );
}
