import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'fresh_language';

const translations = {
  id: {
    dashboard: 'Dasbor',
    inventory: 'Inventaris',
    aiScanner: 'Pemindai AI',
    aiPrediction: 'Prediksi AI',
    riskForecast: 'Prakiraan Risiko',
    recommendations: 'Rekomendasi',
    marketplace: 'Marketplace',
    donation: 'Donasi',
    orders: 'Pesanan',
    branches: 'Cabang',
    analytics: 'Analitik',
    settings: 'Pengaturan',
    pricing: 'Harga',
    personalReport: 'Laporan Personal',
    sustainabilityReport: 'Laporan Keberlanjutan',
    personalEdition: 'EDISI PERSONAL',
    businessEdition: 'EDISI BISNIS',
    personal: 'Personal',
    business: 'Bisnis',
    search: 'Cari...',
    profileSettings: 'Profil & Pengaturan',
    switchToBusiness: 'Beralih ke Bisnis',
    switchToPersonal: 'Beralih ke Personal',
    signOut: 'Keluar',
    user: 'Pengguna',
    businessUser: 'Pengguna Bisnis',
    businessAccount: 'Akun Bisnis',
    loadingFresh: 'Memuat F.R.E.S.H...',

    settingsSubtitle: 'Kelola akun dan preferensi aplikasi Anda.',
    userInformation: 'Informasi Pengguna',
    displayName: 'Nama Tampilan',
    email: 'Email',
    appPreferences: 'Preferensi Aplikasi',
    language: 'Bahasa',
    languageDesc: 'Pilih bahasa yang Anda inginkan',
    theme: 'Tema',
    themeDesc: 'Pilih mode terang atau gelap',
    light: 'Terang',
    dark: 'Gelap',
    notificationSettings: 'Pengaturan Notifikasi',
    expiryNotifications: 'Notifikasi Kedaluwarsa',
    expiryNotificationsDesc: 'Dapatkan notifikasi saat makanan akan kedaluwarsa',
    riskAlerts: 'Peringatan Risiko',
    riskAlertsDesc: 'Terima peringatan untuk makanan berisiko tinggi',
    weeklyReports: 'Laporan Mingguan',
    weeklyReportsDesc: 'Dapatkan laporan limbah makanan mingguan via email',
    marketplaceUpdates: 'Pembaruan Marketplace',
    marketplaceUpdatesDesc: 'Notifikasi aktivitas marketplace',
    connectedAccounts: 'Akun Terhubung',
    googleAccount: 'Akun Google',
    demoAccount: 'Akun Demo',
    connected: 'Terhubung',
    notConnected: 'Belum Terhubung',
    firebaseNotConfigured: 'Firebase belum dikonfigurasi',
    notConfigured: 'Belum dikonfigurasi',
    accountType: 'Tipe Akun',
    active: 'Aktif',
    switchModesDesc: 'Beralih antara mode Personal dan Bisnis kapan saja',
    saveChanges: 'Simpan Perubahan',
    saved: 'Tersimpan!',
    noEmail: 'Tidak ada email',

    goodMorning: 'Selamat Pagi',
    goodAfternoon: 'Selamat Siang',
    goodEvening: 'Selamat Malam',
    todayOverview: 'Berikut ringkasan pengelolaan makanan Anda hari ini.',
    operationalOverview: 'Berikut ringkasan operasional Anda hari ini.',
    addFood: 'Tambah Makanan',
    addStock: 'Tambah Stok',
    totalFoodItems: 'Total Makanan',
    highRiskItems: 'Item Risiko Tinggi',
    expiringSoon: 'Segera Kedaluwarsa',
    savedWasteEst: 'Estimasi Limbah Dicegah',
    aiRiskOverview: 'Ringkasan Risiko AI',
    stockRiskOverview: 'Ringkasan Risiko Stok',
    viewAll: 'Lihat Semua',
    safe: 'Aman',
    warning: 'Peringatan',
    highRisk: 'Risiko Tinggi',
    overallHealthScore: 'Skor Kesehatan Keseluruhan',
    inventoryHealthScore: 'Skor Kesehatan Inventaris',
    quickActions: 'Aksi Cepat',
    createDonation: 'Buat Donasi',
    expiryAlerts: 'Peringatan Kedaluwarsa',
    expired: 'Kedaluwarsa',
    expiredBang: 'Sudah kedaluwarsa!',
    expiresIn: 'Kedaluwarsa dalam',
    day: 'hari',
    days: 'hari',
    noExpiryAlerts: 'Tidak ada peringatan kedaluwarsa. Semua item aman.',
    smartRecommendations: 'Rekomendasi Cerdas',
    useToday: 'Gunakan Hari Ini',
    cook: 'Masak',
    sell: 'Jual',
    recentInventory: 'Inventaris Terbaru',
    foodItem: 'Makanan',
    category: 'Kategori',
    quantity: 'Jumlah',
    expiryDate: 'Tanggal Kedaluwarsa',
    status: 'Status',
    noFoodItemsYet: 'Belum ada makanan. Tambahkan item pertama Anda!',

    foodInventory: 'Inventaris Makanan',
    itemsTracked: 'item dipantau',
    addFoodItem: 'Tambah Item Makanan',
    searchFoodItems: 'Cari makanan...',
    allCategories: 'Semua Kategori',
    allStatus: 'Semua Status',
    editFoodItem: 'Edit Item Makanan',
    addNewFoodItem: 'Tambah Item Makanan Baru',
    foodName: 'Nama Makanan',
    storageType: 'Jenis Penyimpanan',
    unit: 'Satuan',
    purchaseDate: 'Tanggal Beli',
    notes: 'Catatan',
    optionalNotes: 'Catatan opsional...',
    cancel: 'Batal',
    update: 'Perbarui',
    save: 'Simpan',
    storage: 'Penyimpanan',
    purchase: 'Beli',
    expiry: 'Kedaluwarsa',
    actions: 'Aksi',
    daysLeft: 'hari tersisa',
    noFoodItemsFound: 'Tidak ada makanan ditemukan',
    adjustSearchFilters: 'Coba ubah pencarian atau filter Anda.',
    deleteConfirm: 'Yakin ingin menghapus item ini?',
    loadingInventory: 'Memuat inventaris...',

    aiFoodWastePrediction: 'Prediksi Limbah Makanan AI',
    predictSubtitle: 'Prediksi risiko limbah makanan menggunakan model AI kami.',
    predictionInput: 'Input Prediksi',
    daysToExpiry: 'Hari menuju Kedaluwarsa',
    usageFrequency: 'Frekuensi Penggunaan',
    temperatureOptional: 'Suhu (opsional)',
    rarely: 'Jarang',
    normal: 'Normal',
    often: 'Sering',
    analyzing: 'Menganalisis...',
    predictRisk: 'Prediksi Risiko',
    riskScore: 'Skor Risiko',
    lowRisk: 'Risiko Rendah',
    analysis: 'Analisis',
    suggestedAction: 'Aksi yang Disarankan',
    predictionDetails: 'Detail Prediksi',
    usage: 'Penggunaan',
    readyToPredict: 'Siap Memprediksi',
    readyToPredictDesc: 'Isi detail makanan dan klik "Prediksi Risiko" untuk mendapatkan analisis limbah berbasis AI.',

    recommendationsSubtitle: 'Saran berbasis AI untuk meminimalkan limbah makanan.',
    useTheseFirst: 'Gunakan Ini Lebih Dulu',
    noPriorityFoods: 'Belum ada makanan prioritas.',
    all: 'Semua',
    urgent: 'Mendesak',
    recipes: 'Resep',
    donate: 'Donasikan',
    foodWasteTips: 'Tips Mengurangi Limbah Makanan',
    noRecommendationsYet: 'Belum ada rekomendasi',
    addInventoryForSuggestions: 'Tambahkan item inventaris untuk membuat saran.',
    noTipsAvailable: 'Belum ada tips tersedia.',

    businessControlCenter: 'Pusat Kendali Bisnis',
    totalStockItems: 'Total Item Stok',
    acrossAllBranches: 'Di semua cabang',
    highRiskInventory: 'Inventaris Risiko Tinggi',
    needsImmediateAction: 'Butuh tindakan segera',
    estLossPrevented: 'Estimasi Kerugian Dicegah',
    thisMonth: 'Bulan ini',
    surplusListings: 'Listing Surplus',
    activeMarketplace: 'Marketplace aktif',
    activeBranches: 'Cabang Aktif',
    allOperational: 'Semua beroperasi',
    wasteReduction: 'Pengurangan Limbah',
    vsLastMonth: 'vs bulan lalu',
    scanStock: 'Pindai Stok',
    addInventory: 'Tambah Inventaris',
    createListing: 'Buat Listing',
    scheduleDonation: 'Jadwalkan Donasi',
    viewOrders: 'Lihat Pesanan',
    forecast: 'Prakiraan',
    estimatedLossAtRisk: 'Estimasi Kerugian Berisiko',
    lossRiskDesc: 'Dari item risiko tinggi dan peringatan di semua cabang',
    urgentStockAlerts: 'Peringatan Stok Mendesak',
    recentOrders: 'Pesanan Terbaru',
    noOrdersYet: 'Belum ada pesanan.',
    branchPerformance: 'Performa Cabang',
    manage: 'Kelola',
    stock: 'Stok',
    prevented: 'Dicegah',
    listings: 'Listing',
    noBranchesYet: 'Belum ada cabang.',
  },
  en: {},
};

const valueTranslations = {
  id: {
    'High Risk': 'Risiko Tinggi',
    Warning: 'Peringatan',
    Safe: 'Aman',
    Completed: 'Selesai',
    Confirmed: 'Dikonfirmasi',
    Pending: 'Menunggu',
    Donation: 'Donasi',
    Dairy: 'Susu & Olahan',
    Fruit: 'Buah',
    Vegetable: 'Sayur',
    Meat: 'Daging',
    Protein: 'Protein',
    Bakery: 'Roti & Kue',
    Refrigerated: 'Dingin',
    Frozen: 'Beku',
    Ambient: 'Suhu Ruang',
  },
  en: {},
};

const LanguageContext = createContext(null);

function getInitialLanguage() {
  if (typeof window === 'undefined') return 'id';
  return localStorage.getItem(STORAGE_KEY) || 'id';
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);

  const setLanguage = (nextLanguage) => {
    const normalized = nextLanguage === 'en' ? 'en' : 'id';
    setLanguageState(normalized);
    localStorage.setItem(STORAGE_KEY, normalized);
  };

  useEffect(() => {
    document.documentElement.lang = language === 'en' ? 'en' : 'id';
  }, [language]);

  const value = useMemo(() => {
    const t = (key, fallback = key) => translations[language]?.[key] || fallback;
    const tv = (text) => valueTranslations[language]?.[text] || text;
    return { language, setLanguage, t, tv, isIndonesian: language === 'id' };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
