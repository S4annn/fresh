import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Bell, ShoppingBag, Heart, CheckCircle2, XCircle, X } from 'lucide-react';

const WS_INITIAL_DELAY = 2000;
const WS_MAX_DELAY = 60000;
const WS_MAX_RETRIES = 10;
const MAX_NOTIFICATIONS = 10;
const NOTIFICATION_DISPLAY_TIME = 8000;

const NOTIFICATION_ICONS = {
  marketplace_reservation: ShoppingBag,
  donation_request: Heart,
  reservation_accepted: CheckCircle2,
  reservation_rejected: XCircle,
  donation_accepted: CheckCircle2,
  donation_rejected: XCircle,
};

const NOTIFICATION_COLORS = {
  marketplace_reservation: 'bg-pink-500',
  donation_request: 'bg-red-500',
  reservation_accepted: 'bg-emerald-500',
  reservation_rejected: 'bg-gray-500',
  donation_accepted: 'bg-emerald-500',
  donation_rejected: 'bg-gray-500',
};

export default function NotificationListener() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);
  const retriesRef = useRef(0);
  const delayRef = useRef(WS_INITIAL_DELAY);

  const userId = typeof window !== 'undefined'
    ? localStorage.getItem('fresh_user_id') || ''
    : '';

  const connectWebSocket = useCallback(() => {
    if (!userId || userId === 'demo-user' || userId.startsWith('demo-user')) return;
    if (retriesRef.current >= WS_MAX_RETRIES) {
      console.log('[WS] Max retries reached, stopping reconnection.');
      return;
    }

    const apiUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
    const wsUrl = apiUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    const token = localStorage.getItem('fresh_auth_token') || '';

    try {
      // Pass token as query param for authentication
      const wsEndpoint = `${wsUrl}/ws/notifications/${userId}${token ? `?token=${token}` : ''}`;
      const ws = new WebSocket(wsEndpoint);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected for notifications');
        // Reset backoff on successful connection
        retriesRef.current = 0;
        delayRef.current = WS_INITIAL_DELAY;

        // Send ping every 30s to keep alive
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          } else {
            clearInterval(pingInterval);
          }
        }, 30000);
        ws._pingInterval = pingInterval;
      };

      ws.onmessage = (event) => {
        if (event.data === 'pong') return;
        try {
          const data = JSON.parse(event.data);
          const notification = {
            id: Date.now() + Math.random(),
            ...data,
            read: false,
            receivedAt: new Date().toISOString(),
          };
          setNotifications((prev) => [notification, ...prev].slice(0, MAX_NOTIFICATIONS));
          setUnreadCount((prev) => prev + 1);

          // Auto-dismiss after timeout
          setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
          }, NOTIFICATION_DISPLAY_TIME);
        } catch {
          // ignore non-JSON messages
        }
      };

      ws.onclose = () => {
        if (ws._pingInterval) clearInterval(ws._pingInterval);
        retriesRef.current += 1;

        if (retriesRef.current < WS_MAX_RETRIES) {
          // Exponential backoff: 2s, 4s, 8s, 16s, 32s, 60s max
          const delay = Math.min(delayRef.current * 2, WS_MAX_DELAY);
          delayRef.current = delay;
          console.log(`[WS] Disconnected, retry ${retriesRef.current}/${WS_MAX_RETRIES} in ${delay / 1000}s`);
          reconnectRef.current = setTimeout(connectWebSocket, delay);
        } else {
          console.log('[WS] Max retries reached.');
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      retriesRef.current += 1;
      const delay = Math.min(delayRef.current * 2, WS_MAX_DELAY);
      delayRef.current = delay;
      reconnectRef.current = setTimeout(connectWebSocket, delay);
    }
  }, [userId]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [connectWebSocket]);

  const dismissNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  return (
    <>
      {/* Floating notification toasts (top-right) */}
      <div className="fixed top-4 right-4 z-[150] space-y-2 pointer-events-none max-w-sm">
        {notifications.filter((n) => !n.read).slice(0, 3).map((notif) => {
          const Icon = NOTIFICATION_ICONS[notif.type] || Bell;
          const color = NOTIFICATION_COLORS[notif.type] || 'bg-blue-500';
          return (
            <div
              key={notif.id}
              className="pointer-events-auto flex items-start gap-3 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 animate-slide-in-right"
            >
              <div className={`w-9 h-9 ${color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800">{notif.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{notif.message}</p>
              </div>
              <button
                onClick={() => dismissNotification(notif.id)}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
