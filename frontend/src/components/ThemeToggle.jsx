import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ compact = false, className = '' }) {
  const { isDark, toggleTheme } = useTheme();
  const Icon = isDark ? Sun : Moon;
  const label = isDark ? 'Light mode' : 'Dark mode';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm transition-all hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-emerald-500 dark:hover:bg-emerald-950 ${compact ? 'h-10 w-10' : 'px-3 py-2 text-sm font-semibold'} ${className}`}
    >
      <Icon className="h-4 w-4" />
      {!compact && <span>{label}</span>}
    </button>
  );
}
