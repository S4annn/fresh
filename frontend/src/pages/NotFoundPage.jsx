import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search, Leaf } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-extrabold text-gray-800">F.R.E.S.H</span>
        </div>

        {/* 404 */}
        <div className="mb-8">
          <h1 className="text-8xl font-extrabold gradient-text mb-4">404</h1>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Halaman Tidak Ditemukan</h2>
          <p className="text-gray-500">
            Halaman yang Anda cari tidak ditemukan. Mungkin sudah dipindahkan atau dihapus.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/" className="btn-primary w-full sm:w-auto no-underline">
            <Home className="w-4 h-4" />
            Kembali ke Beranda
          </Link>
          <Link to="/dashboard" className="btn-secondary w-full sm:w-auto no-underline">
            <ArrowLeft className="w-4 h-4" />
            Ke Dasbor
          </Link>
        </div>
      </div>
    </div>
  );
}
