import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, Send, X, Trash2, MessageCircle, Loader2 } from 'lucide-react';
import { chatWithAssistant } from '../api';

const STORAGE_KEY = 'fresh_ai_assistant_chat';
const MAX_MESSAGES = 20;

const SUGGESTED_PROMPTS = [
  'Bagaimana cara mengurangi food waste hari ini?',
  'Apa arti High Risk pada inventory?',
  'Cara memakai AI Food Scanner',
  'Bagaimana cara menjual surplus food?',
];

function detectPageContext(pathname) {
  if (!pathname) return null;
  const p = pathname.toLowerCase();

  if (p.startsWith('/business/')) {
    if (p.startsWith('/business/dashboard')) return 'business_dashboard';
    if (p.startsWith('/business/inventory')) return 'business_inventory';
    if (p.startsWith('/business/orders')) return 'business_orders';
    if (p.startsWith('/business/branches')) return 'business_branches';
    if (p.startsWith('/business/analytics')) return 'business_analytics';
    return 'business_dashboard';
  }

  if (p.startsWith('/dashboard')) return 'dashboard';
  if (p.startsWith('/inventory')) return 'inventory';
  if (p.startsWith('/scanner')) return 'scanner';
  if (p.startsWith('/predict')) return 'predict';
  if (p.startsWith('/recommendations')) return 'recommendations';
  if (p.startsWith('/marketplace')) return 'marketplace';
  if (p.startsWith('/donation')) return 'donation';
  if (p.startsWith('/analytics')) return 'analytics';
  if (p.startsWith('/settings')) return 'settings';
  if (p.startsWith('/pricing')) return 'pricing';
  return null;
}

function loadMessages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-MAX_MESSAGES) : [];
  } catch {
    return [];
  }
}

function saveMessages(messages) {
  try {
    const trimmed = messages.slice(-MAX_MESSAGES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore */
  }
}

export default function AIAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => loadMessages());
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const pageContext = useMemo(
    () => (typeof window !== 'undefined' ? detectPageContext(window.location.pathname) : null),
    [isOpen]
  );

  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      const t = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const handleSend = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    const userMessage = {
      role: 'user',
      content: text,
      ts: Date.now(),
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const userId = (typeof window !== 'undefined' && localStorage.getItem('fresh_user_id')) || null;
      const role = (typeof window !== 'undefined' && localStorage.getItem('fresh_user_role')) || null;

      const result = await chatWithAssistant({
        message: text,
        user_id: userId,
        role,
        page_context: pageContext,
      });

      const assistantMessage = {
        role: 'assistant',
        content: result?.reply || 'Maaf, tidak ada jawaban.',
        source: result?.source,
        topic_allowed: result?.topic_allowed !== false,
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Maaf, terjadi kesalahan saat menghubungi AI Assistant. Coba lagi sebentar lagi.',
          source: 'network_error',
          topic_allowed: true,
          ts: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Buka F.R.E.S.H Assistant"
          className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-transform flex items-center justify-center group"
        >
          <Sparkles className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 ring-2 ring-white animate-pulse" />
          <span className="sr-only">Chat dengan F.R.E.S.H Assistant</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className="fixed z-50 bottom-20 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-[400px] max-w-[400px] h-[min(600px,calc(100vh-6rem))] bg-white rounded-2xl shadow-2xl border border-emerald-100 flex flex-col overflow-hidden animate-fade-in"
          role="dialog"
          aria-label="F.R.E.S.H Assistant Chat"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm leading-tight">F.R.E.S.H Assistant</h3>
                <p className="text-[10px] text-emerald-50/90 leading-tight">
                  Tanya seputar food waste & aplikasi
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClear}
                title="Hapus riwayat chat"
                aria-label="Hapus riwayat chat"
                className="w-8 h-8 rounded-lg hover:bg-white/15 flex items-center justify-center transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Tutup"
                aria-label="Tutup chat"
                className="w-8 h-8 rounded-lg hover:bg-white/15 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-4 bg-gradient-to-b from-emerald-50/40 via-white to-white"
          >
            {isEmpty ? (
              <div className="flex flex-col items-center justify-center text-center h-full">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mb-3">
                  <MessageCircle className="w-7 h-7 text-emerald-600" />
                </div>
                <h4 className="font-semibold text-gray-800 text-sm mb-1">
                  Halo! Ada yang bisa saya bantu?
                </h4>
                <p className="text-xs text-gray-500 mb-4 max-w-[260px]">
                  Saya bisa bantu jawab pertanyaan seputar F.R.E.S.H, food waste, inventory, dan fitur aplikasi.
                </p>
                <div className="w-full space-y-2">
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide text-left">
                    Coba tanya:
                  </p>
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleSend(prompt)}
                      className="w-full text-left text-xs px-3 py-2.5 rounded-xl bg-white border border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50/50 text-gray-700 transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg, idx) => {
                  if (msg.role === 'user') {
                    return (
                      <div key={idx} className="flex justify-end">
                        <div className="max-w-[80%] bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl rounded-br-sm px-3.5 py-2.5 shadow-sm">
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        </div>
                      </div>
                    );
                  }
                  const isOffTopic = msg.topic_allowed === false;
                  return (
                    <div key={idx} className="flex justify-start">
                      <div
                        className={`max-w-[85%] rounded-2xl rounded-bl-sm px-3.5 py-2.5 shadow-sm border ${
                          isOffTopic
                            ? 'bg-gray-50 border-gray-100 text-gray-500 italic'
                            : 'bg-white border-emerald-100 text-gray-800'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-emerald-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5 shadow-sm flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                      <span className="text-xs text-gray-500">Mengetik...</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-emerald-100 bg-white px-3 py-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tulis pertanyaan kamu..."
                rows={1}
                disabled={loading}
                className="flex-1 resize-none max-h-24 text-sm px-3 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 outline-none bg-gray-50 placeholder:text-gray-400 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                aria-label="Kirim pesan"
                className="w-10 h-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:scale-105 active:scale-95 transition-all"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 text-center">
              Powered by Gemini · Hanya topik F.R.E.S.H & food waste
            </p>
          </div>
        </div>
      )}
    </>
  );
}
