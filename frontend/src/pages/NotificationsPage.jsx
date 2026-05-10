import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DUMMY_FOODS } from '../data/dummyData';
import {
  Bell, AlertTriangle, Clock, Lightbulb, ShoppingBag, Heart,
  CheckCircle2, X, Flame, ChefHat, Package, Trash2, BellOff,
} from 'lucide-react';

// ─── Generate notifications from dummy food data ──────────────────────────────
function generateNotifications(foods) {
  const notifs = [];
  const today  = new Date();

  foods.forEach((food) => {
    const daysLeft = Math.ceil((new Date(food.expiry_date) - today) / 86400000);

    if (daysLeft <= 0) {
      notifs.push({
        id:       `exp-${food.id}`,
        type:     'expired',
        icon:     Flame,
        iconBg:   'bg-red-100',
        iconColor:'text-red-600',
        title:    `${food.food_name} has expired`,
        body:     'This item has passed its expiry date. Check if it\'s still safe or dispose of it properly.',
        time:     'Today',
        read:     false,
        actions:  [{ label: 'Donate', path: '/donation', style: 'emerald' }, { label: 'View Inventory', path: '/inventory', style: 'gray' }],
        food,
      });
    } else if (daysLeft === 1) {
      notifs.push({
        id:       `exp1-${food.id}`,
        type:     'expiring_today',
        icon:     AlertTriangle,
        iconBg:   'bg-red-100',
        iconColor:'text-red-600',
        title:    `${food.food_name} expires tomorrow`,
        body:     `Use it today! ${food.recommendation || 'Cook, donate, or sell before it goes to waste.'}`,
        time:     'Today',
        read:     false,
        actions:  [
          { label: 'Add to Marketplace', path: '/marketplace', style: 'pink' },
          { label: 'Donate', path: '/donation', style: 'red' },
        ],
        food,
      });
    } else if (daysLeft <= 3) {
      notifs.push({
        id:       `exp3-${food.id}`,
        type:     'expiring_soon',
        icon:     Clock,
        iconBg:   'bg-amber-100',
        iconColor:'text-amber-600',
        title:    `${food.food_name} expires in ${daysLeft} days`,
        body:     `Plan to use this soon. ${food.recommendation || 'Consider cooking or listing in marketplace.'}`,
        time:     `${daysLeft}d left`,
        read:     false,
        actions:  [
          { label: 'Get Recipe', path: '/recommendations', style: 'violet' },
          { label: 'Sell Surplus', path: '/marketplace', style: 'gray' },
        ],
        food,
      });
    }

    if (food.risk_level === 'High Risk' && daysLeft > 0) {
      notifs.push({
        id:       `risk-${food.id}`,
        type:     'high_risk',
        icon:     Flame,
        iconBg:   'bg-orange-100',
        iconColor:'text-orange-600',
        title:    `High risk: ${food.food_name}`,
        body:     `AI predicts ${food.food_name} has a high chance of going to waste. Take action now.`,
        time:     'AI Alert',
        read:     false,
        actions:  [{ label: 'Predict Risk', path: '/predict', style: 'violet' }],
        food,
      });
    }
  });

  // Add static tips
  notifs.push({
    id:       'tip-1',
    type:     'tip',
    icon:     Lightbulb,
    iconBg:   'bg-emerald-100',
    iconColor:'text-emerald-600',
    title:    'Tip: Use FIFO method',
    body:     'Always use older items first (First In, First Out). Move older items to the front of your fridge.',
    time:     '1 day ago',
    read:     true,
    actions:  [],
    food:     null,
  });
  notifs.push({
    id:       'tip-2',
    type:     'marketplace',
    icon:     ShoppingBag,
    iconBg:   'bg-pink-100',
    iconColor:'text-pink-600',
    title:    'New listings near you',
    body:     'There are 3 new surplus food listings within 5km of your location.',
    time:     '2 hours ago',
    read:     true,
    actions:  [{ label: 'Browse Marketplace', path: '/marketplace', style: 'pink' }],
    food:     null,
  });
  notifs.push({
    id:       'tip-3',
    type:     'donation',
    icon:     Heart,
    iconBg:   'bg-red-100',
    iconColor:'text-red-500',
    title:    'Donation request nearby',
    body:     'Panti Asuhan Harapan is looking for food donations in your area.',
    time:     '3 hours ago',
    read:     false,
    actions:  [{ label: 'View Donations', path: '/donation', style: 'red' }],
    food:     null,
  });

  return notifs.sort((a, b) => (a.read ? 1 : 0) - (b.read ? 1 : 0));
}

const ACTION_STYLES = {
  emerald: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200',
  gray:    'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200',
  pink:    'bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-200',
  red:     'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200',
  violet:  'bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200',
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(() => generateNotifications(DUMMY_FOODS));
  const [filter, setFilter] = useState('all'); // all | unread | expiry | tips

  const unreadCount = notifications.filter((n) => !n.read).length;

  function markRead(id) {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function dismiss(id) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  function clearAll() {
    setNotifications([]);
  }

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'expiry') return ['expired', 'expiring_today', 'expiring_soon', 'high_risk'].includes(n.type);
    if (filter === 'tips')   return ['tip', 'marketplace', 'donation'].includes(n.type);
    return true;
  });

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-20 lg:pb-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
            <Bell className="w-6 h-6 text-emerald-600" />
            Notifications
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-gray-500 mt-0.5 text-sm">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-xs text-emerald-600 font-semibold hover:text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors">
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={clearAll} className="text-xs text-gray-400 font-semibold hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1">
              <Trash2 className="w-3.5 h-3.5" /> Clear all
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { key: 'all',    label: 'All',         count: notifications.length },
          { key: 'unread', label: 'Unread',       count: unreadCount },
          { key: 'expiry', label: 'Expiry Alerts', count: notifications.filter((n) => ['expired','expiring_today','expiring_soon','high_risk'].includes(n.type)).length },
          { key: 'tips',   label: 'Tips & Updates', count: notifications.filter((n) => ['tip','marketplace','donation'].includes(n.type)).length },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              filter === key
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
            {count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${filter === key ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notification list */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <BellOff className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No notifications</p>
          <p className="text-gray-400 text-sm mt-1">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((notif) => {
            const Icon = notif.icon;
            return (
              <div
                key={notif.id}
                onClick={() => markRead(notif.id)}
                className={`card cursor-pointer transition-all duration-200 hover:-translate-y-0.5 relative ${
                  !notif.read ? 'border-l-4 border-l-emerald-500 bg-emerald-50/30' : ''
                }`}
              >
                {/* Unread dot */}
                {!notif.read && (
                  <div className="absolute top-4 right-12 w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                )}

                {/* Dismiss button */}
                <button
                  onClick={(e) => { e.stopPropagation(); dismiss(notif.id); }}
                  className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-start gap-4 pr-8">
                  {/* Icon */}
                  <div className={`w-11 h-11 ${notif.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${notif.iconColor}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className={`font-semibold text-sm ${notif.read ? 'text-gray-700' : 'text-gray-900'}`}>
                        {notif.title}
                      </p>
                      <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">{notif.time}</span>
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed mb-3">{notif.body}</p>

                    {/* Food info */}
                    {notif.food && (
                      <div className="flex items-center gap-2 mb-3 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                        <Package className="w-3.5 h-3.5" />
                        <span>{notif.food.quantity} {notif.food.unit} · {notif.food.category} · {notif.food.storage_type}</span>
                      </div>
                    )}

                    {/* Action buttons */}
                    {notif.actions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {notif.actions.map((action, i) => (
                          <button
                            key={i}
                            onClick={(e) => { e.stopPropagation(); markRead(notif.id); navigate(action.path); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${ACTION_STYLES[action.style] || ACTION_STYLES.gray}`}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
