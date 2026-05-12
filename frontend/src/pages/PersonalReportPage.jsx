import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../services/subscription';
import * as api from '../api';
import { DUMMY_ANALYTICS, DUMMY_FOODS } from '../data/dummyData';
import {
  FileText, Download, Printer, Calendar, User, Leaf, TrendingDown, Heart,
  ShoppingBag, DollarSign, Target, Award, CheckCircle2, AlertTriangle,
  Package, Sparkles,
} from 'lucide-react';

function formatRupiah(value) {
  return `Rp${Number(value || 0).toLocaleString('id-ID')}`;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function generateInsights(data, foods) {
  const insights = [];

  const highRisk = foods.filter((f) => (f.risk_label || f.risk_level) === 'High Risk').length;
  const warning = foods.filter((f) => (f.risk_label || f.risk_level) === 'Warning').length;
  const safe = foods.filter((f) => (f.risk_label || f.risk_level) === 'Safe').length;

  if (highRisk > 0) {
    insights.push({
      type: 'warning',
      title: 'Item Berisiko Tinggi',
      message: `Ada ${highRisk} item yang berisiko tinggi terbuang. Prioritaskan untuk segera digunakan, dijual, atau didonasikan.`,
    });
  }

  if (safe > warning + highRisk && foods.length > 0) {
    insights.push({
      type: 'success',
      title: 'Pengelolaan Baik',
      message: `Sebagian besar inventaris Anda (${safe} item) dalam kondisi aman. Pertahankan kebiasaan ini.`,
    });
  }

  if (data.total_waste_prevented > 0) {
    insights.push({
      type: 'info',
      title: 'Dampak Positif',
      message: `Anda sudah mencegah ${data.total_waste_prevented} item dari terbuang. Ini setara dengan ${data.co2_reduced} kg CO2 yang tidak dilepas ke atmosfer.`,
    });
  }

  if (data.money_saved > 0) {
    insights.push({
      type: 'success',
      title: 'Hemat Pengeluaran',
      message: `Anda sudah menghemat ${formatRupiah(data.money_saved)} dengan mengelola makanan dengan bijak.`,
    });
  }

  if (foods.length === 0) {
    insights.push({
      type: 'info',
      title: 'Mulai Tambah Inventaris',
      message: 'Tambahkan makanan ke inventaris untuk mulai melacak dampak positif Anda.',
    });
  }

  return insights;
}

function generateRecommendations(data, foods) {
  const recs = [];

  const highRisk = foods.filter((f) => (f.risk_label || f.risk_level) === 'High Risk');
  const warning = foods.filter((f) => (f.risk_label || f.risk_level) === 'Warning');

  if (highRisk.length > 0) {
    recs.push('Gunakan segera atau donasikan item berisiko tinggi hari ini');
  }
  if (warning.length > 0) {
    recs.push('Rencanakan menu masakan menggunakan item peringatan dalam 1-3 hari');
  }
  if (data.total_marketplace < 2 && foods.length > 5) {
    recs.push('Coba jual makanan berlebih di Marketplace untuk hasilkan uang tambahan');
  }
  if (data.total_donations < 1) {
    recs.push('Donasikan makanan berlebih untuk membantu komunitas yang membutuhkan');
  }
  recs.push('Gunakan AI Food Scanner sebelum belanja untuk mencegah pembelian berlebih');
  recs.push('Periksa inventaris setiap minggu untuk memastikan stok tetap terkelola');

  return recs;
}

export default function PersonalReportPage() {
  const { user, isDemoMode } = useAuth();
  const { plan } = useSubscription();
  const [data, setData] = useState(null);
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    loadReport();
  }, [isDemoMode]);

  async function loadReport() {
    setLoading(true);
    try {
      const [analyticsResult, foodsResult] = await Promise.all([
        api.getAnalytics().catch(() => null),
        api.getFoods().catch(() => null),
      ]);

      const defaultAnalytics = isDemoMode ? DUMMY_ANALYTICS : {
        total_items: 0, total_waste_prevented: 0, total_donations: 0,
        total_marketplace: 0, money_saved: 0, co2_reduced: 0, risk_distribution: [],
      };

      const analytics = analyticsResult || defaultAnalytics;
      setData({
        total_items: analytics.total_items ?? analytics.total_food_items ?? 0,
        total_waste_prevented: analytics.total_waste_prevented ?? analytics.estimated_waste_prevented_kg ?? 0,
        total_donations: analytics.total_donations ?? 0,
        total_marketplace: analytics.total_marketplace ?? analytics.total_marketplace_listings ?? 0,
        money_saved: analytics.money_saved ?? analytics.estimated_money_saved ?? 0,
        co2_reduced: analytics.co2_reduced ?? analytics.estimated_co2e_reduced ?? 0,
        risk_distribution: analytics.risk_distribution || [],
      });

      const foodsList = Array.isArray(foodsResult) ? foodsResult : (isDemoMode ? DUMMY_FOODS : []);
      setFoods(foodsList);
    } finally {
      setLoading(false);
    }
  }

  const insights = useMemo(() => (data ? generateInsights(data, foods) : []), [data, foods]);
  const recommendations = useMemo(() => (data ? generateRecommendations(data, foods) : []), [data, foods]);

  const currentDate = new Date();
  const reportPeriod = `${currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`;

  function exportToCSV() {
    if (!data) return;
    const rows = [
      ['F.R.E.S.H Laporan Personal'],
      ['Nama Pengguna', user?.name || '-'],
      ['Email', user?.email || '-'],
      ['Paket', plan?.plan_name || '-'],
      ['Periode Laporan', reportPeriod],
      ['Tanggal Dibuat', currentDate.toLocaleString('id-ID')],
      [],
      ['RINGKASAN METRIK'],
      ['Metrik', 'Nilai'],
      ['Total Item Dilacak', data.total_items],
      ['Limbah Dicegah', `${data.total_waste_prevented} item`],
      ['Total Donasi', data.total_donations],
      ['Listing Marketplace', data.total_marketplace],
      ['Uang Dihemat', formatRupiah(data.money_saved)],
      ['CO2 Dikurangi', `${data.co2_reduced} kg`],
      [],
      ['DISTRIBUSI RISIKO'],
      ['Kategori', 'Jumlah'],
      ...(data.risk_distribution || []).map((r) => [r.name, r.value]),
      [],
      ['INSIGHT'],
      ...insights.map((i) => [i.title, i.message]),
      [],
      ['REKOMENDASI'],
      ...recommendations.map((r, i) => [`${i + 1}`, r]),
    ];

    const csv = rows.map((row) => row.map((cell) => {
      const s = String(cell ?? '');
      return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',')).join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fresh-laporan-${currentDate.toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExportOpen(false);
  }

  function exportToJSON() {
    if (!data) return;
    const payload = {
      report: 'F.R.E.S.H Personal Report',
      period: reportPeriod,
      generated_at: currentDate.toISOString(),
      user: { name: user?.name, email: user?.email, role: user?.role, plan: plan?.plan_name },
      summary: data,
      insights,
      recommendations,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fresh-laporan-${currentDate.toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExportOpen(false);
  }

  function exportToPDF() {
    window.print();
    setExportOpen(false);
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Memuat laporan...</p>
        </div>
      </div>
    );
  }

  const keyMetrics = [
    { label: 'Total Item Dilacak', value: data.total_items, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Limbah Dicegah', value: `${data.total_waste_prevented} item`, icon: TrendingDown, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Uang Dihemat', value: formatRupiah(data.money_saved), icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'CO2 Dikurangi', value: `${data.co2_reduced} kg`, icon: Leaf, color: 'text-teal-600', bg: 'bg-teal-50' },
  ];

  const activityMetrics = [
    { label: 'Donasi Dilakukan', value: data.total_donations, icon: Heart, color: 'text-red-600' },
    { label: 'Listing Marketplace', value: data.total_marketplace, icon: ShoppingBag, color: 'text-pink-600' },
  ];

  return (
    <div className="max-w-5xl mx-auto pb-20 lg:pb-6 animate-fade-in print:pb-0">
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-page { box-shadow: none !important; border: none !important; }
          aside, header, nav { display: none !important; }
        }
      `}</style>

      {/* Action Bar (hidden in print) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 no-print">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-600" />
            Laporan Personal
          </h1>
          <p className="text-gray-500 mt-1">Ringkasan lengkap pengelolaan makanan dan dampak Anda.</p>
        </div>

        <div className="relative">
          <button onClick={() => setExportOpen(!exportOpen)} className="btn-primary flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Laporan
          </button>

          {exportOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-fade-in">
                <button onClick={exportToCSV} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 transition-colors text-left">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="font-medium">CSV (Excel)</div>
                    <div className="text-[10px] text-gray-400">Format spreadsheet</div>
                  </div>
                </button>
                <button onClick={exportToJSON} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 transition-colors text-left">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <div>
                    <div className="font-medium">JSON</div>
                    <div className="text-[10px] text-gray-400">Data mentah</div>
                  </div>
                </button>
                <button onClick={exportToPDF} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 transition-colors text-left">
                  <Printer className="w-4 h-4 text-red-600" />
                  <div>
                    <div className="font-medium">PDF / Print</div>
                    <div className="text-[10px] text-gray-400">Cetak atau simpan PDF</div>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Report Document */}
      <div className="print-page bg-white rounded-2xl shadow-sm border border-gray-100 p-8 lg:p-12 space-y-8">
        {/* Report Header */}
        <div className="border-b border-gray-200 pb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                  <Leaf className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-extrabold text-gray-800">F.R.E.S.H</span>
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900">Laporan Personal</h2>
              <p className="text-sm text-gray-500 mt-1">Periode: {reportPeriod}</p>
            </div>

            <div className="text-right text-xs text-gray-500 space-y-1">
              <div className="flex items-center justify-end gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatDate(currentDate)}</span>
              </div>
              <div className="flex items-center justify-end gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span className="font-medium text-gray-700">{user?.name || '-'}</span>
              </div>
              <div>{user?.email || '-'}</div>
              <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md font-semibold">
                {plan?.plan_name || 'Free Starter'}
              </span>
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <section>
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-600" />
            Ringkasan Eksekutif
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {keyMetrics.map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.label} className={`${m.bg} rounded-xl p-4`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${m.color}`} />
                    <p className="text-xs text-gray-600 font-medium">{m.label}</p>
                  </div>
                  <p className="text-2xl font-extrabold text-gray-900">{m.value}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Activity Summary */}
        <section>
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-600" />
            Aktivitas Anda
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {activityMetrics.map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.label} className="border border-gray-200 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
                    <Icon className={`w-5 h-5 ${m.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{m.label}</p>
                    <p className="text-xl font-bold text-gray-900">{m.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Risk Distribution Table */}
        {data.risk_distribution && data.risk_distribution.length > 0 && (
          <section>
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Distribusi Risiko Inventaris
            </h3>
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Kategori</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700">Jumlah Item</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700">Persentase</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.risk_distribution.map((r) => {
                    const total = data.risk_distribution.reduce((acc, x) => acc + (x.value || 0), 0);
                    const pct = total > 0 ? ((r.value / total) * 100).toFixed(1) : '0';
                    return (
                      <tr key={r.name}>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color || '#64748b' }} />
                            {r.name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">{r.value}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Insights */}
        {insights.length > 0 && (
          <section>
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-600" />
              Insight & Pencapaian
            </h3>
            <div className="space-y-3">
              {insights.map((ins, i) => (
                <div
                  key={i}
                  className={`rounded-xl p-4 border ${
                    ins.type === 'warning' ? 'bg-amber-50 border-amber-200'
                    : ins.type === 'success' ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <p className={`font-semibold text-sm mb-1 ${
                    ins.type === 'warning' ? 'text-amber-800'
                    : ins.type === 'success' ? 'text-emerald-800'
                    : 'text-blue-800'
                  }`}>
                    {ins.title}
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">{ins.message}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recommendations */}
        <section>
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Rekomendasi Tindakan
          </h3>
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-100">
            <ol className="space-y-2.5">
              {recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-800">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{rec}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Footer */}
        <div className="border-t border-gray-200 pt-6 text-center">
          <p className="text-xs text-gray-500">
            Laporan dibuat secara otomatis oleh F.R.E.S.H — Food Resource Efficiency &amp; Smart Handling
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Dicetak pada {currentDate.toLocaleString('id-ID')}
          </p>
        </div>
      </div>
    </div>
  );
}
