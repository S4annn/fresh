import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeFoodImage, createFood } from '../api';
import { useRole } from '../context/RoleContext';
import {
  Camera, Upload, X, Scan, Loader2, CheckCircle2, AlertTriangle,
  Flame, Package, Thermometer, Lightbulb, ShoppingBag,
  Heart, RefreshCw, Info, Leaf, Brain, Video, VideoOff,
  Cpu, WifiOff, Zap,
} from 'lucide-react';

const riskConfig = {
  Safe:        { color: 'badge-safe',    bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: CheckCircle2 },
  Warning:     { color: 'badge-warning', bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   icon: AlertTriangle },
  'High Risk': { color: 'badge-danger',  bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     icon: Flame },
};

// Map source field from backend/fallback to a human-readable badge
function SourceBadge({ source }) {
  if (!source) return null;

  const configs = {
    tensorflow_vision_model: {
      icon: Cpu,
      label: 'AI Vision Model',
      className: 'bg-violet-100 text-violet-700 border border-violet-200',
    },
    vision_model: {
      icon: Cpu,
      label: 'AI Vision Model',
      className: 'bg-violet-100 text-violet-700 border border-violet-200',
    },
    fallback_filename: {
      icon: WifiOff,
      label: 'Backend Fallback',
      className: 'bg-amber-100 text-amber-700 border border-amber-200',
    },
    fallback_no_model: {
      icon: WifiOff,
      label: 'Backend Fallback',
      className: 'bg-amber-100 text-amber-700 border border-amber-200',
    },
    local_fallback: {
      icon: WifiOff,
      label: 'Local Demo Fallback',
      className: 'bg-gray-100 text-gray-600 border border-gray-200',
    },
    frontend_filename_fallback: {
      icon: WifiOff,
      label: 'Local Demo Fallback',
      className: 'bg-gray-100 text-gray-600 border border-gray-200',
    },
  };

  const cfg = configs[source] || {
    icon: Zap,
    label: source,
    className: 'bg-blue-100 text-blue-700 border border-blue-200',
  };
  const Icon = cfg.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${cfg.className}`}>
      <Icon className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  );
}

export default function ScannerPage() {
  const navigate = useNavigate();
  const { isBusiness } = useRole();
  const fileInputRef = useRef(null);

  // Camera stream refs
  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const streamRef   = useRef(null);

  const [imageFile, setImageFile]         = useState(null);
  const [imagePreview, setImagePreview]   = useState(null);
  const [analyzing, setAnalyzing]         = useState(false);
  const [result, setResult]               = useState(null);
  const [error, setError]                 = useState(null);
  const [addingToInventory, setAddingToInventory] = useState(false);
  const [addedSuccess, setAddedSuccess]   = useState(false);
  const [toast, setToast]                 = useState(null);

  // Camera state
  const [cameraOpen, setCameraOpen]       = useState(false);
  const [cameraError, setCameraError]     = useState(null);
  const [cameraReady, setCameraReady]     = useState(false);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  function validateFile(file) {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) return 'Only JPG, PNG, or WebP images are allowed.';
    if (file.size > 5 * 1024 * 1024) return 'File size must be under 5MB.';
    return null;
  }

  function handleFileSelect(file) {
    if (!file) return;
    const err = validateFile(file);
    if (err) { setError(err); return; }
    setError(null);
    setResult(null);
    setAddedSuccess(false);
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files[0]);
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    setResult(null);
    setError(null);
    setAddedSuccess(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // ─── Camera functions ───────────────────────────────────────────────────────
  const openCamera = useCallback(async () => {
    setCameraError(null);
    setCameraReady(false);
    setCameraOpen(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      // Wait for video element to be in DOM
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            setCameraReady(true);
          };
        }
      }, 100);
    } catch (err) {
      let msg = 'Camera access denied.';
      if (err.name === 'NotFoundError')     msg = 'No camera found on this device.';
      if (err.name === 'NotAllowedError')   msg = 'Camera permission denied. Please allow camera access in your browser settings.';
      if (err.name === 'NotReadableError')  msg = 'Camera is already in use by another app.';
      if (err.name === 'OverconstrainedError') msg = 'Camera does not support the requested settings.';
      setCameraError(msg);
      setCameraReady(false);
    }
  }, []);

  const closeCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
    setCameraReady(false);
    setCameraError(null);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
      handleFileSelect(file);
      closeCamera();
    }, 'image/jpeg', 0.92);
  }, [closeCamera]);

  // ─── Analyze ────────────────────────────────────────────────────────────────
  async function handleAnalyze() {
    if (!imageFile) return;
    setAnalyzing(true);
    setError(null);
    setResult(null);
    try {
      const data = await analyzeFoodImage(imageFile);
      setResult(data);
    } catch {
      setError('Analysis failed. Please try again with a clearer image.');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleAddToInventory() {
    if (!result?.suggested_inventory) return;
    setAddingToInventory(true);
    const today      = new Date();
    const expiryDate = new Date(today.getTime() + result.estimated_shelf_life_days * 86400000);
    const inventoryData = {
      food_name:         result.suggested_inventory.food_name,
      category:          result.suggested_inventory.category,
      quantity:          result.suggested_inventory.quantity,
      unit:              result.suggested_inventory.unit,
      purchase_date:     today.toISOString().slice(0, 10),
      expiry_date:       expiryDate.toISOString().slice(0, 10),
      storage_type:      result.suggested_inventory.storage_type,
      days_to_expiry:    result.estimated_shelf_life_days,
      storage_condition: result.suggested_inventory.storage_type,
      shelf_life:        result.estimated_shelf_life_days,
    };
    try {
      await createFood(inventoryData);
      showToast(`${result.detected_food} added to inventory!`);
    } catch {
      const existing = JSON.parse(localStorage.getItem('fresh_scanned_items') || '[]');
      existing.push({ ...inventoryData, id: 'scan_' + Date.now(), risk_level: result.risk_label });
      localStorage.setItem('fresh_scanned_items', JSON.stringify(existing));
      showToast(`${result.detected_food} saved locally!`);
    }
    setAddedSuccess(true);
    setAddingToInventory(false);
  }

  const risk    = result ? riskConfig[result.risk_label] || riskConfig.Safe : null;
  const RiskIcon = risk?.icon;
  const scannerSourceLabel = result?.classifier === 'vision_model'
    ? `Vision model${result.model_label ? `: ${result.model_label}` : ''}`
    : result?.classifier === 'frontend_filename_fallback'
      ? 'Local fallback scanner'
      : result?.classifier === 'filename_fallback'
        ? 'Filename fallback scanner'
        : null;

  const inventoryLabel  = isBusiness() ? 'Add to Business Inventory' : 'Add to Home Inventory';
  const marketplacePath = isBusiness() ? '/business/marketplace' : '/marketplace';
  const donationPath    = isBusiness() ? '/business/donation'    : '/donation';
  const predictPath     = isBusiness() ? '/business/predict'     : '/predict';

  return (
    <div className="space-y-6 pb-20 lg:pb-6 animate-fade-in max-w-4xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl animate-slide-up ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'}`}>
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium text-sm">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
            <Scan className="w-5 h-5 text-white" />
          </div>
          AI Food Scanner
          {isBusiness() && <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg">Business Mode</span>}
        </h1>
        <p className="text-gray-500 mt-1">Scan or upload food images to identify ingredients and reduce waste.</p>
      </div>

      {/* ── CAMERA MODAL ── */}
      {cameraOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-gray-800">Camera</h3>
                {cameraReady && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse inline-block" />
                    Live
                  </span>
                )}
              </div>
              <button onClick={closeCamera} className="btn-icon hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Camera view */}
            <div className="relative bg-black" style={{ minHeight: 300 }}>
              {cameraError ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
                  <VideoOff className="w-12 h-12 text-red-400" />
                  <p className="text-white font-semibold">{cameraError}</p>
                  <p className="text-gray-400 text-sm">
                    To allow camera: click the 🔒 icon in your browser address bar → Site settings → Camera → Allow
                  </p>
                  <button onClick={closeCamera} className="btn-secondary text-sm">Close</button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full"
                    style={{ display: 'block', maxHeight: 400, objectFit: 'cover' }}
                  />
                  {!cameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                      <div className="text-center text-white">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                        <p className="text-sm">Starting camera...</p>
                      </div>
                    </div>
                  )}
                  {/* Viewfinder overlay */}
                  {cameraReady && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-48 h-48 border-2 border-white/60 rounded-2xl" style={{
                        boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)',
                      }} />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Canvas (hidden, used for capture) */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Actions */}
            {!cameraError && (
              <div className="flex items-center justify-center gap-4 p-5">
                <button onClick={closeCamera} className="btn-secondary text-sm px-5">
                  Cancel
                </button>
                <button
                  onClick={capturePhoto}
                  disabled={!cameraReady}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/30 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                >
                  <Camera className="w-5 h-5" />
                  Capture Photo
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upload Card */}
        <div className="space-y-4">
          <div
            className={`relative border-2 border-dashed rounded-2xl transition-all duration-200 overflow-hidden ${imagePreview ? 'border-emerald-300 bg-emerald-50/30' : 'border-gray-200 bg-gray-50/50 hover:border-emerald-300 hover:bg-emerald-50/30'}`}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="Preview" className="w-full h-72 object-cover" />
                <button onClick={clearImage} className="absolute top-3 right-3 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-red-50 transition-colors">
                  <X className="w-4 h-4 text-gray-600" />
                </button>
                <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-1.5 text-xs font-medium text-gray-700 flex items-center gap-1.5">
                  <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                  {imageFile?.name}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
                  <Camera className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="text-gray-700 font-semibold mb-1">Drop your food image here</p>
                <p className="text-gray-400 text-sm mb-4">JPG, PNG, WebP — max 5MB</p>
                <p className="text-xs text-gray-400">or use the buttons below</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Upload from file */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:border-emerald-300 hover:bg-emerald-50 transition-all text-sm"
            >
              <Upload className="w-4 h-4 text-emerald-600" /> Upload Image
            </button>

            {/* Open real camera */}
            <button
              onClick={openCamera}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:border-emerald-300 hover:bg-emerald-50 transition-all text-sm"
            >
              <Camera className="w-4 h-4 text-emerald-600" /> Open Camera
            </button>
          </div>

          {/* Hidden file input — upload only, no camera */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files[0])}
          />

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          {imageFile && !analyzing && !result && (
            <button onClick={handleAnalyze} className="w-full btn-primary py-3.5 text-base">
              <Scan className="w-5 h-5" /> Analyze Food
            </button>
          )}

          {analyzing && (
            <div className="w-full flex items-center justify-center gap-3 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold">
              <Loader2 className="w-5 h-5 animate-spin" /> Analyzing with AI...
            </div>
          )}

          {result && (
            <button onClick={clearImage} className="w-full btn-secondary py-3 text-sm">
              <RefreshCw className="w-4 h-4" /> Scan Another Food
            </button>
          )}

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-700 space-y-1">
                <p className="font-semibold">Tips for best results:</p>
                <p>• Use clear, well-lit photos</p>
                <p>• Center the food in the frame</p>
                <p>• Avoid blurry or dark images</p>
                <p>• Camera works best on mobile devices</p>
              </div>
            </div>
          </div>
        </div>

        {/* Result Card */}
        <div>
          {!result && !analyzing && (
            <div className="h-full flex flex-col items-center justify-center text-center py-16 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <Scan className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">Results will appear here</p>
              <p className="text-gray-400 text-sm mt-1">Upload an image and click Analyze</p>
            </div>
          )}

          {analyzing && (
            <div className="h-full flex flex-col items-center justify-center text-center py-16 bg-emerald-50/50 rounded-2xl border-2 border-dashed border-emerald-200">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4 animate-pulse">
                <Brain className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="text-emerald-700 font-semibold">AI is analyzing your food...</p>
              <p className="text-emerald-500 text-sm mt-1">This may take a few seconds</p>
            </div>
          )}

          {result && (
            <div className="space-y-4 animate-fade-in">
              {/* Fallback warning — only shown when backend was unavailable */}
              {(result.source === 'local_fallback' || result.source === 'frontend_filename_fallback' || result.classifier === 'frontend_filename_fallback') && (
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <WifiOff className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-700">
                    <p className="font-semibold mb-0.5">Backend AI model unavailable</p>
                    <p>Using local demo fallback. Results are based on filename only, not image content. Start the backend server (<code>uvicorn app.main:app --reload</code>) to use the real AI model.</p>
                  </div>
                </div>
              )}

              {/* Main Result */}
              <div className={`rounded-2xl border-2 p-5 ${risk.bg} ${risk.border}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-2xl font-extrabold text-gray-800">{result.detected_food}</h2>
                    <p className="text-gray-500 text-sm mt-0.5">{result.category}</p>
                  </div>
                  <span className={`badge ${risk.color} text-sm px-3 py-1.5`}>{result.risk_label}</span>
                </div>
                {/* Source badge */}
                <div className="mb-4">
                  <SourceBadge source={result.source || result.classifier} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/70 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">Confidence</p>
                    <p className="text-lg font-extrabold text-gray-800">{Math.round(result.confidence * 100)}%</p>
                  </div>
                  <div className="bg-white/70 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">Shelf Life</p>
                    <p className="text-lg font-extrabold text-gray-800">{result.estimated_shelf_life_days}d</p>
                  </div>
                  <div className="bg-white/70 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">Risk</p>
                    <RiskIcon className={`w-6 h-6 mx-auto ${risk.text}`} />
                  </div>
                </div>
              </div>

              {/* Storage Advice */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Thermometer className="w-4 h-4 text-blue-500" />
                  <span className="font-semibold text-gray-700 text-sm">Storage Advice</span>
                </div>
                <p className="text-gray-600 text-sm">{result.storage_advice}</p>
              </div>

              {/* Recommendations */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span className="font-semibold text-gray-700 text-sm">Recommendations</span>
                </div>
                <ul className="space-y-2">
                  {result.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="w-5 h-5 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleAddToInventory}
                  disabled={addingToInventory || addedSuccess}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${addedSuccess ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-200' : 'btn-primary'}`}
                >
                  {addingToInventory ? <Loader2 className="w-4 h-4 animate-spin" /> : addedSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                  {addedSuccess ? 'Added!' : inventoryLabel}
                </button>
                <button onClick={() => navigate(predictPath)} className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm btn-secondary">
                  <Brain className="w-4 h-4" /> Predict Risk
                </button>
                <button onClick={() => navigate(marketplacePath)} className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm bg-pink-50 text-pink-700 border-2 border-pink-200 hover:bg-pink-100 transition-colors">
                  <ShoppingBag className="w-4 h-4" /> {isBusiness() ? 'Create Listing' : 'Marketplace'}
                </button>
                <button onClick={() => navigate(donationPath)} className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm bg-red-50 text-red-700 border-2 border-red-200 hover:bg-red-100 transition-colors">
                  <Heart className="w-4 h-4" /> {isBusiness() ? 'Schedule Donation' : 'Donate'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
