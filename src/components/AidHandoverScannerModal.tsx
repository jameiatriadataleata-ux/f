import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Barcode, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  User, 
  Phone, 
  CreditCard, 
  Users, 
  Calendar, 
  Clock, 
  ShieldAlert, 
  Check, 
  X, 
  Volume2, 
  VolumeX, 
  Package,
  Layers,
  ArrowRight,
  Maximize2
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { AidDistribution, Beneficiary, DistributionHandoverRecord } from '../types';

interface AidHandoverScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  distributions: AidDistribution[];
  selectedDistributionId?: string;
  beneficiaries: Beneficiary[];
  handoverRecords: DistributionHandoverRecord[];
  currentUser?: {
    id?: string;
    name?: string;
    role?: string;
  };
  onHandoverSubmit: (data: {
    distributionId: string;
    beneficiaryId?: string;
    barcodeId: string;
    handedByUserId: string;
    handedByUserName: string;
    handedByUserRole: string;
    method: 'camera_scanner' | 'hardware_scanner' | 'manual_input';
    notes?: string;
  }) => Promise<{ success: boolean; error?: string; alreadyReceived?: boolean; record?: DistributionHandoverRecord }>;
  lang?: 'ar' | 'en';
}

export const AidHandoverScannerModal: React.FC<AidHandoverScannerModalProps> = ({
  isOpen,
  onClose,
  distributions = [],
  selectedDistributionId: initialDistId,
  beneficiaries = [],
  handoverRecords = [],
  currentUser = { id: 'staff-1', name: 'مشرف التوزيع الميداني', role: 'staff' },
  onHandoverSubmit,
  lang = 'ar'
}) => {
  // Active Distribution
  const [activeDistId, setActiveDistId] = useState<string>(initialDistId || distributions[0]?.id || '');
  
  // Scan mode: camera vs manual / hardware scanner
  const [scanMode, setScanMode] = useState<'camera' | 'hardware'>('camera');
  const [manualInput, setManualInput] = useState('');
  const [isCameraRunning, setIsCameraRunning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Verification states
  const [scannedBarcode, setScannedBarcode] = useState<string>('');
  const [foundBeneficiary, setFoundBeneficiary] = useState<Beneficiary | null>(null);
  const [alreadyReceivedRecord, setAlreadyReceivedRecord] = useState<DistributionHandoverRecord | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSuccessBen, setLastSuccessBen] = useState<Beneficiary | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);

  // Sync initial distribution
  useEffect(() => {
    if (initialDistId) {
      setActiveDistId(initialDistId);
    } else if (distributions.length > 0 && !activeDistId) {
      setActiveDistId(distributions[0].id);
    }
  }, [initialDistId, distributions]);

  // Current active distribution object
  const currentDistribution = distributions.find(d => d.id === activeDistId);

  // Handover count for this distribution
  const currentHandovers = handoverRecords.filter(h => h.distributionId === activeDistId);
  const handedBeneficiaryIds = new Set(currentHandovers.map(h => h.beneficiaryId));

  // Audio cues
  const playBeep = (type: 'success' | 'duplicate' | 'error') => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } else if (type === 'duplicate') {
        osc.frequency.setValueAtTime(330, audioCtx.currentTime);
        osc.frequency.setValueAtTime(260, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      } else {
        osc.frequency.setValueAtTime(200, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch (e) {
      // Audio context might be restricted before interaction
    }
  };

  // Barcode Evaluation Engine
  const evaluateBarcode = (barcode: string, method: 'camera_scanner' | 'hardware_scanner' | 'manual_input' = 'camera_scanner') => {
    const cleanCode = (barcode || '').trim();
    if (!cleanCode) return;

    setScannedBarcode(cleanCode);
    setNotFound(false);
    setIsDuplicate(false);
    setAlreadyReceivedRecord(null);
    setLastSuccessBen(null);

    // Match in beneficiaries
    const matched = beneficiaries.find(b => 
      (b.barcodeId && b.barcodeId.toUpperCase() === cleanCode.toUpperCase()) ||
      (b.beneficiaryNumber && b.beneficiaryNumber.toLowerCase() === cleanCode.toLowerCase()) ||
      (b.nationalId && b.nationalId === cleanCode) ||
      (b.id && b.id === cleanCode) ||
      (b.name && b.name.trim().toLowerCase() === cleanCode.toLowerCase())
    );

    if (!matched) {
      setFoundBeneficiary(null);
      setNotFound(true);
      playBeep('error');
      return;
    }

    setFoundBeneficiary(matched);

    // Check duplicate in this distribution
    const existingHandover = handoverRecords.find(
      h => h.distributionId === activeDistId && h.beneficiaryId === matched.id
    );

    if (existingHandover) {
      setIsDuplicate(true);
      setAlreadyReceivedRecord(existingHandover);
      playBeep('duplicate');
    } else {
      setIsDuplicate(false);
      playBeep('success');
    }
  };

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    const element = document.getElementById("qr-reader");
    if (!element) return;

    try {
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        } catch (e) {
          // ignore
        }
      }

      const html5QrCode = new Html5Qrcode("qr-reader");
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          evaluateBarcode(decodedText, 'camera_scanner');
        },
        (errorMessage) => {
          // Continuous frame error, ignore
        }
      );
      setIsCameraRunning(true);
    } catch (err: any) {
      console.warn("Camera init warning:", err);
      setCameraError("تعذر الوصول إلى الكاميرا أو تم رفض الإذن. يمكنك استخدام قارئ الباركود الخارجي أو الإدخال السريع.");
      setIsCameraRunning(false);
    }
  };

  // Stop Camera
  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (e) {
        // ignore
      }
      html5QrCodeRef.current = null;
    }
    setIsCameraRunning(false);
  };

  // Switch between modes
  useEffect(() => {
    if (isOpen && scanMode === 'camera') {
      const timer = setTimeout(() => {
        startCamera();
      }, 300);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
      if (scanMode === 'hardware') {
        setTimeout(() => manualInputRef.current?.focus(), 200);
      }
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, scanMode]);

  // Reset to Ready State
  const resetScannerState = () => {
    setFoundBeneficiary(null);
    setScannedBarcode('');
    setIsDuplicate(false);
    setAlreadyReceivedRecord(null);
    setNotFound(false);
    setManualInput('');
    if (scanMode === 'hardware') {
      manualInputRef.current?.focus();
    }
  };

  // Handle Confirmed Handover Button Click
  const handleConfirmHandover = async () => {
    if (!foundBeneficiary || !activeDistId || isDuplicate) return;

    setIsSubmitting(true);
    try {
      const result = await onHandoverSubmit({
        distributionId: activeDistId,
        beneficiaryId: foundBeneficiary.id,
        barcodeId: foundBeneficiary.barcodeId || scannedBarcode,
        handedByUserId: currentUser.id || 'staff',
        handedByUserName: currentUser.name || 'مشرف التوزيع',
        handedByUserRole: currentUser.role || 'staff',
        method: scanMode === 'camera' ? 'camera_scanner' : 'hardware_scanner',
        notes: `تسليم ${currentDistribution?.quantityPerBeneficiary || 'المساعدة'}`
      });

      if (result.success) {
        setLastSuccessBen(foundBeneficiary);
        playBeep('success');
        // Reset immediately for NEXT beneficiary
        setTimeout(() => {
          resetScannerState();
        }, 800);
      } else if (result.alreadyReceived) {
        setIsDuplicate(true);
        if (result.record) setAlreadyReceivedRecord(result.record);
        playBeep('duplicate');
      } else {
        alert(result.error || "تعذر إتمام التسليم");
      }
    } catch (err: any) {
      alert("خطأ: " + (err?.message || "حدث خطأ غير متوقع أثناء التسليم"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Hardware Scan / Manual Search Submit
  const handleManualSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    evaluateBarcode(manualInput.trim(), 'hardware_scanner');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div 
        className="relative bg-white dark:bg-neutral-900 rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-neutral-100 dark:border-neutral-800 text-right flex flex-col max-h-[94vh]"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3.5 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-emerald-600 text-white shadow-md">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white">
                تسليم المساعدات - مسح باركود المستفيد
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                تسجيل استلام فوري، منع التكرار، والتحقق المباشر من الأهلية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                soundEnabled 
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' 
                  : 'border-neutral-200 bg-neutral-100 text-neutral-400 dark:bg-neutral-800'
              }`}
              title={soundEnabled ? "التنبيهات الصوتية مفعلة" : "التنبيهات الصوتية مغلقة"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="py-3.5 space-y-4 overflow-y-auto flex-1 pr-1">
          {/* Distribution Selector */}
          <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-700">
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
              📦 التوزيعة الحالية المستهدفة:
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <select
                value={activeDistId}
                onChange={(e) => {
                  setActiveDistId(e.target.value);
                  resetScannerState();
                }}
                className="flex-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {distributions.map(dist => (
                  <option key={dist.id} value={dist.id}>
                    {dist.title} ({dist.aidTypeLabel || dist.aidType}) - {dist.quantityPerBeneficiary}
                  </option>
                ))}
              </select>

              <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-100/60 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                <span>تم التسليم:</span>
                <span className="text-sm font-black text-emerald-900 dark:text-white">{handedBeneficiaryIds.size}</span>
                <span>/</span>
                <span>{beneficiaries.length} مستفيد</span>
              </div>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-2 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setScanMode('camera')}
              className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                scanMode === 'camera'
                  ? 'bg-white dark:bg-neutral-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>كاميرا الجوال / الجهاز</span>
            </button>

            <button
              type="button"
              onClick={() => setScanMode('hardware')}
              className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                scanMode === 'hardware'
                  ? 'bg-white dark:bg-neutral-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              <Barcode className="w-4 h-4" />
              <span>قارئ باركود خارجي / بحث سريع</span>
            </button>
          </div>

          {/* Scanner Area */}
          {scanMode === 'camera' ? (
            <div className="space-y-2">
              <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-emerald-500/40 shadow-inner flex items-center justify-center min-h-[220px]">
                <div id="qr-reader" className="w-full h-full max-h-[260px]"></div>
                
                {/* Visual Viewfinder Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-44 h-44 border-2 border-emerald-400/80 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] relative">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1"></div>
                    <div className="w-full h-0.5 bg-emerald-400/70 absolute top-1/2 -translate-y-1/2 animate-pulse"></div>
                  </div>
                </div>
              </div>

              {cameraError && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p>{cameraError}</p>
                    <button
                      type="button"
                      onClick={() => setScanMode('hardware')}
                      className="mt-1 font-bold text-emerald-700 underline cursor-pointer"
                    >
                      التبديل إلى وضع الإدخال اليدوي وقارئ الباركود الخارجي
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Hardware / Manual Input Mode */
            <form onSubmit={handleManualSearchSubmit} className="space-y-2">
              <div className="relative">
                <input
                  ref={manualInputRef}
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="مرر الباركود بالقارئ الخارجي، أو اكتب رمز الباركود أو رقم الهوية..."
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border-2 border-emerald-500/50 rounded-2xl py-3 pr-11 pl-24 text-xs sm:text-sm font-bold text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600"
                  autoFocus
                />
                <Barcode className="w-5 h-5 text-emerald-600 absolute right-3.5 top-3.5" />
                <button
                  type="submit"
                  className="absolute left-2 top-2 bottom-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>تحقق</span>
                </button>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 text-right pr-2">
                يدعم القارئ السلكي / اللاسلكي USB أو البحث المباشر برقم الهوية أو رقم المستفيد.
              </p>
            </form>
          )}

          {/* Verification Results Panel */}
          {foundBeneficiary && (
            <div className={`p-4 rounded-2xl border-2 transition-all shadow-md ${
              isDuplicate 
                ? 'bg-red-50/80 dark:bg-red-950/30 border-red-500' 
                : 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500'
            }`}>
              {/* Status Banner */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-200 dark:border-neutral-700/60">
                <div className="flex items-center gap-2">
                  {isDuplicate ? (
                    <div className="p-1.5 rounded-xl bg-red-600 text-white">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="p-1.5 rounded-xl bg-emerald-600 text-white">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <h4 className={`text-sm font-black ${isDuplicate ? 'text-red-700 dark:text-red-400' : 'text-emerald-800 dark:text-emerald-300'}`}>
                      {isDuplicate ? '⚠️ تم استلام هذه المساعدة مسبقًا لهذا المستفيد!' : '✅ مستحق للمساعدة - جاهز للتسليم'}
                    </h4>
                    <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                      {isDuplicate 
                        ? 'ممنوع التكرار: لا يمكن تسجيل استلام المساعدة مرتين في نفس التوزيعة' 
                        : 'لم يستلم في هذه التوزيعة مسبقًا - يمكنك الضغط على "تم الاستلام"'}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-mono font-bold px-2 py-1 bg-white dark:bg-neutral-800 rounded-lg text-neutral-700 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700">
                  {foundBeneficiary.barcodeId || scannedBarcode}
                </span>
              </div>

              {/* Beneficiary Core Details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-2.5 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400">اسم المستفيد:</div>
                  <div className="font-black text-neutral-900 dark:text-white truncate mt-0.5">{foundBeneficiary.name}</div>
                </div>

                <div className="p-2.5 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400">رقم الهوية:</div>
                  <div className="font-mono font-bold text-neutral-900 dark:text-white mt-0.5">{foundBeneficiary.nationalId || '---'}</div>
                </div>

                <div className="p-2.5 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400">رقم المستفيد:</div>
                  <div className="font-mono font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                    {foundBeneficiary.beneficiaryNumber || 'BEN-2026-0000'}
                  </div>
                </div>

                <div className="p-2.5 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400">عدد أفراد الأسرة:</div>
                  <div className="font-bold text-neutral-900 dark:text-white mt-0.5">{foundBeneficiary.familySize || 1} أفراد</div>
                </div>

                <div className="p-2.5 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400">فئة الاستحقاق:</div>
                  <div className="font-bold text-neutral-900 dark:text-white mt-0.5">{foundBeneficiary.category || "أسر متعففة"}</div>
                </div>

                <div className="p-2.5 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400">المساعدة المستحقة:</div>
                  <div className="font-bold text-emerald-700 dark:text-emerald-400 mt-0.5 truncate">
                    {currentDistribution?.quantityPerBeneficiary || "1 سلة / طرد"}
                  </div>
                </div>
              </div>

              {/* Duplicate Details Warning */}
              {isDuplicate && alreadyReceivedRecord && (
                <div className="mt-3 p-3 bg-red-100/70 dark:bg-red-950/60 rounded-xl border border-red-300 dark:border-red-900 text-xs text-red-800 dark:text-red-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>بيانات الاستلام المسجل مسبقًا:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] pt-1">
                    <div>التاريخ: <strong>{alreadyReceivedRecord.date}</strong> الساعة <strong>{alreadyReceivedRecord.time}</strong></div>
                    <div>المسؤول المسلّم: <strong>{alreadyReceivedRecord.handedByUserName}</strong></div>
                    <div>طريقة المسح: <strong>{alreadyReceivedRecord.method === 'camera_scanner' ? 'كاميرا' : 'قارئ باركود'}</strong></div>
                    <div>رقم السجل: <span className="font-mono">{alreadyReceivedRecord.id}</span></div>
                  </div>
                </div>
              )}

              {/* Confirm / Reset Action Button */}
              <div className="mt-4 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={resetScannerState}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 transition-colors cursor-pointer"
                >
                  مسح مستفيد آخر
                </button>

                {!isDuplicate && (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleConfirmHandover}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جاري تسجيل الاستلام...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>✅ تم الاستلام (تسجيل التسليم الآن)</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Not Found Warning */}
          {notFound && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border-2 border-red-500 text-right text-xs text-red-800 dark:text-red-200 space-y-2">
              <div className="flex items-center gap-2 font-black text-sm text-red-700 dark:text-red-400">
                <XCircle className="w-5 h-5" />
                <span>لم يتم العثور على مستفيد بهذا الباركود!</span>
              </div>
              <p>
                الرمز الممسوح (<span className="font-mono font-bold">{scannedBarcode}</span>) غير مسجل في قاعدة بيانات المستفيدين. يرجى التأكد من استيراد كشف المستفيدين أو البحث بالاسم/الهوية.
              </p>
              <button
                type="button"
                onClick={resetScannerState}
                className="mt-2 px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-900/60 dark:hover:bg-red-800 font-bold text-red-800 dark:text-red-200 cursor-pointer"
              >
                إعادة المحاولة
              </button>
            </div>
          )}

          {/* Last Successfully Handed Banner */}
          {lastSuccessBen && !foundBeneficiary && (
            <div className="p-3 rounded-2xl bg-emerald-100/70 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 font-black" />
                <span>
                  تم تسجيل تسليم المستفيد: <strong>{lastSuccessBen.name}</strong> بنجاح!
                </span>
              </div>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                الشاشة جاهزة فوراً للمستفيد التالي
              </span>
            </div>
          )}

          {/* Quick Recent Handovers List for this Session */}
          <div className="mt-2">
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-neutral-400" />
                <span>آخر عمليات التسليم في هذه التوزيعة:</span>
              </h5>
              <span className="text-[10px] text-neutral-400">
                إجمالي المسلمين: {currentHandovers.length}
              </span>
            </div>

            {currentHandovers.length === 0 ? (
              <div className="p-3 text-center text-xs text-neutral-400 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
                لم يتم تسجيل أي استلام في هذه التوزيعة حتى الآن. ابدأ بمسح أول باركود.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {currentHandovers.slice(0, 6).map((rec) => (
                  <div
                    key={rec.id}
                    className="p-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </div>
                      <div>
                        <span className="font-bold text-neutral-900 dark:text-white">{rec.beneficiaryName}</span>
                        <span className="text-[10px] text-neutral-400 mr-2 font-mono">({rec.barcodeId})</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
                      {rec.time}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-neutral-400 dark:text-neutral-500">
            الموظف الحالي: <strong>{currentUser.name}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            إغلاق الشاشة
          </button>
        </div>
      </div>
    </div>
  );
};
