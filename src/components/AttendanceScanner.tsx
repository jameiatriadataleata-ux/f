import React, { useState, useRef, useEffect } from "react";
import { Search, CheckCircle, AlertCircle, Scan, User, Check, Info, Award, LogOut, Clock, AlertTriangle, X, ShieldAlert } from "lucide-react";
import { Volunteer, Initiative, AttendanceRecord } from "../types";

interface AttendanceScannerProps {
  initiative: Initiative;
  volunteers: Volunteer[];
  attendanceRecords: AttendanceRecord[];
  onRecordAttendance: (data: {
    initiativeId: string;
    volunteerId: string;
    status: 'full' | 'late' | 'excused' | 'unexcused';
    wearingVest: boolean;
    recorderBy: string;
    method?: 'barcode' | 'manual' | 'qr';
    forceUpdate?: boolean;
  }) => void;
  onCheckoutAttendance?: (data: {
    initiativeId: string;
    volunteerId: string;
    checkedOutBy?: string;
  }) => void;
  currentLeaderName: string;
}

export const AttendanceScanner: React.FC<AttendanceScannerProps> = ({
  initiative,
  volunteers,
  attendanceRecords,
  onRecordAttendance,
  onCheckoutAttendance,
  currentLeaderName
}) => {
  const [activeTab, setActiveTab] = useState<'scan' | 'search' | 'list'>('scan');
  
  // Scan Simulator & Barcode input state
  const [scannedCode, setScannedCode] = useState("");
  const [manualBarcodeInput, setManualBarcodeInput] = useState("");
  const [matchedVolunteer, setMatchedVolunteer] = useState<Volunteer | null>(null);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error' | 'duplicate'>('idle');
  const [scanErrorMessage, setScanErrorMessage] = useState("");
  
  // Duplicate alert modal / banner state
  const [duplicateModal, setDuplicateModal] = useState<{
    volunteer: Volunteer;
    record: AttendanceRecord;
  } | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  
  // Dialog state for post-attendance (Is wearing vest?)
  const [showVestDialog, setShowVestDialog] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);
  const [attendanceStatusType, setAttendanceStatusType] = useState<'full' | 'late' | 'excused' | 'unexcused'>('full');
  const [isWearingVest, setIsWearingVest] = useState(true);
  const [recordingMethod, setRecordingMethod] = useState<'barcode' | 'manual' | 'qr'>('barcode');

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus barcode input when in scan mode
  useEffect(() => {
    if (activeTab === 'scan' && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [activeTab]);

  // Filter volunteers that are registered for this initiative
  const registeredVolunteers = volunteers.filter(v => 
    initiative.acceptedVolunteerIds.includes(v.id) || 
    initiative.applicantVolunteerIds.includes(v.id)
  );

  // Check if a volunteer already has attendance recorded
  const getAttendanceRecord = (volunteerId: string) => {
    return attendanceRecords.find(a => a.volunteerId === volunteerId && a.initiativeId === initiative.id);
  };

  // Process a barcode (from physical scanner, input, or simulated click)
  const processBarcodeScan = (rawCode: string, methodType: 'barcode' | 'qr' = 'barcode') => {
    const code = rawCode.trim();
    if (!code) return;

    setScanStatus('scanning');
    setMatchedVolunteer(null);
    setScannedCode(code);
    setScanErrorMessage("");

    setTimeout(() => {
      // Find volunteer by barcode, QR code, national ID, or membership number
      const vol = volunteers.find(v => 
        v.barcode === code || 
        v.qrCode === code || 
        v.qrCode === `MEM-${code}` || 
        v.membershipNumber === code ||
        v.nationalId === code
      );

      if (!vol) {
        setScanStatus('error');
        setScanErrorMessage(`الباركود الممسوح (${code}) غير مسجل في النظام.`);
        return;
      }

      // Check if volunteer is registered in this initiative
      const isRegistered = initiative.acceptedVolunteerIds.includes(vol.id) || initiative.applicantVolunteerIds.includes(vol.id);
      
      // Section 9 & 10: Duplicate attendance prevention check
      const existingRecord = getAttendanceRecord(vol.id);
      if (existingRecord) {
        setScanStatus('duplicate');
        setMatchedVolunteer(vol);
        setDuplicateModal({
          volunteer: vol,
          record: existingRecord
        });
        return;
      }

      setMatchedVolunteer(vol);
      setScanStatus('success');
      setRecordingMethod(methodType);
      handleInitiateAttendance(vol, 'full', methodType);
    }, 450);
  };

  // Trigger scanning simulation from predefined chip
  const handleSimulateScan = (barcode: string) => {
    processBarcodeScan(barcode, 'barcode');
  };

  // Handle Enter key on physical barcode scanner / input
  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      processBarcodeScan(manualBarcodeInput, 'barcode');
      setManualBarcodeInput("");
    }
  };

  const handleInitiateAttendance = (
    vol: Volunteer, 
    status: 'full' | 'late' | 'excused' | 'unexcused',
    method: 'barcode' | 'manual' | 'qr' = 'manual'
  ) => {
    // Check duplicate first
    const existing = getAttendanceRecord(vol.id);
    if (existing) {
      setDuplicateModal({
        volunteer: vol,
        record: existing
      });
      return;
    }

    setSelectedVolunteer(vol);
    setAttendanceStatusType(status);
    setIsWearingVest(true); // Default
    setRecordingMethod(method);
    setShowVestDialog(true);
  };

  const handleConfirmAttendance = (forceUpdate = false) => {
    if (!selectedVolunteer) return;
    
    onRecordAttendance({
      initiativeId: initiative.id,
      volunteerId: selectedVolunteer.id,
      status: attendanceStatusType,
      wearingVest: isWearingVest,
      recorderBy: currentLeaderName,
      method: recordingMethod,
      forceUpdate
    });

    // Reset simulator
    setScanStatus('idle');
    setMatchedVolunteer(null);
    setScannedCode("");
    setShowVestDialog(false);
    setSelectedVolunteer(null);
    setDuplicateModal(null);
  };

  const handleTriggerCheckout = (volunteerId: string) => {
    if (onCheckoutAttendance) {
      onCheckoutAttendance({
        initiativeId: initiative.id,
        volunteerId,
        checkedOutBy: currentLeaderName
      });
    }
    setDuplicateModal(null);
  };

  const filteredSearchVolunteers = registeredVolunteers.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.membershipNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.nationalId && v.nationalId.includes(searchQuery))
  );

  return (
    <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-xs" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-neutral-100 pb-4 mb-5 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-bold">تسجيل وتأكيد الحضور بالباركود</span>
            <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full font-mono">الباركود الذكي v2.0</span>
          </div>
          <h3 className="text-md font-black text-neutral-800 mt-1">{initiative.name}</h3>
        </div>
        <div className="flex gap-2 bg-neutral-100 p-1 rounded-lg">
          <button
            id="tab-attendance-scan"
            onClick={() => setActiveTab('scan')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${activeTab === 'scan' ? 'bg-white text-emerald-700 shadow-xs' : 'text-neutral-500 hover:text-neutral-800'}`}
          >
            <Scan className="w-3.5 h-3.5" />
            <span>مسح الباركود / QR</span>
          </button>
          <button
            id="tab-attendance-search"
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${activeTab === 'search' ? 'bg-white text-emerald-700 shadow-xs' : 'text-neutral-500 hover:text-neutral-800'}`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>البحث السريع</span>
          </button>
          <button
            id="tab-attendance-list"
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${activeTab === 'list' ? 'bg-white text-emerald-700 shadow-xs' : 'text-neutral-500 hover:text-neutral-800'}`}
          >
            <User className="w-3.5 h-3.5" />
            <span>القائمة الشاملة ({registeredVolunteers.length})</span>
          </button>
        </div>
      </div>

      {/* METHOD 1: QR & BARCODE SCANNER WITH PHYSICAL SCANNER SUPPORT */}
      {activeTab === 'scan' && (
        <div className="space-y-6">
          {/* Physical Scanner Direct Input Bar */}
          <div className="bg-emerald-50/40 border border-emerald-100 p-4 rounded-xl flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs shrink-0">
              <Scan className="w-4 h-4 text-emerald-600" />
              <span>إدخال الباركود المباشر / القارئ اليدوي:</span>
            </div>
            <div className="relative flex-1 w-full">
              <input
                ref={barcodeInputRef}
                type="text"
                value={manualBarcodeInput}
                onChange={(e) => setManualBarcodeInput(e.target.value)}
                onKeyDown={handleBarcodeKeyDown}
                placeholder="مرر قارئ الباركود على بطاقة المتطوع أو اكتب الرمز واضغط Enter..."
                className="w-full bg-white border border-emerald-200 rounded-lg px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-hidden"
              />
            </div>
            <button
              onClick={() => {
                processBarcodeScan(manualBarcodeInput, 'barcode');
                setManualBarcodeInput("");
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer shrink-0 shadow-xs"
            >
              مسح وتحضير
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Visual Laser Scan Frame */}
            <div className="md:col-span-6 flex flex-col items-center justify-center p-6 bg-neutral-900 rounded-2xl border-2 border-neutral-800 relative overflow-hidden min-h-[260px]">
              {/* Camera Scanning Frame Corner accents */}
              <div className="absolute top-4 right-4 w-5 h-5 border-t-2 border-r-2 border-emerald-500" />
              <div className="absolute top-4 left-4 w-5 h-5 border-t-2 border-l-2 border-emerald-500" />
              <div className="absolute bottom-4 right-4 w-5 h-5 border-b-2 border-r-2 border-emerald-500" />
              <div className="absolute bottom-4 left-4 w-5 h-5 border-b-2 border-l-2 border-emerald-500" />

              {scanStatus === 'scanning' && (
                <div className="absolute inset-x-0 h-0.5 bg-emerald-500 animate-bounce shadow-[0_0_15px_rgba(34,197,94,1)] z-10" />
              )}

              <div className="text-center z-5">
                <Scan className={`w-16 h-16 mx-auto mb-3 transition-all ${
                  scanStatus === 'scanning' ? 'text-emerald-500 scale-110 animate-pulse' : 
                  scanStatus === 'duplicate' ? 'text-amber-500' :
                  scanStatus === 'error' ? 'text-rose-500' : 'text-neutral-500'
                }`} />

                {scanStatus === 'idle' && (
                  <p className="text-xs text-neutral-400">وجه بطاقة المتطوع أو باركود العضوية نحو قارئ الباركود</p>
                )}
                {scanStatus === 'scanning' && (
                  <p className="text-xs text-emerald-400 font-bold animate-pulse">جاري التحقق من هوية المتطوع والباركود...</p>
                )}
                {scanStatus === 'success' && (
                  <p className="text-xs text-emerald-400 font-bold">تم التعرف على المتطوع بنجاح! ✓</p>
                )}
                {scanStatus === 'duplicate' && (
                  <p className="text-xs text-amber-400 font-bold flex items-center justify-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    <span>تنبيه: المتطوع مسجل حضوره مسبقاً في هذه المبادرة</span>
                  </p>
                )}
                {scanStatus === 'error' && (
                  <div className="space-y-1">
                    <p className="text-xs text-rose-400 font-bold flex items-center justify-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      <span>{scanErrorMessage || "رمز غير صالح أو غير موجود"}</span>
                    </p>
                    <p className="text-[10px] text-neutral-400">تأكد من رقم العضوية أو الباركود</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Trigger Actions for Volunteers in this initiative */}
            <div className="md:col-span-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-neutral-600 uppercase tracking-wider">بطاقات متطوعي المبادرة (محاكاة سريعة بالباركود)</h4>
                <span className="text-[10px] text-neutral-400">{registeredVolunteers.length} متطوع</span>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {registeredVolunteers.map(v => {
                  const att = getAttendanceRecord(v.id);
                  return (
                    <button
                      key={v.id}
                      onClick={() => handleSimulateScan(v.barcode)}
                      className={`flex items-center justify-between text-right p-2 rounded-xl border text-[11px] cursor-pointer transition-all ${
                        att 
                          ? 'border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50' 
                          : 'border-neutral-200 hover:border-emerald-500 hover:bg-emerald-50/25'
                      }`}
                    >
                      <div className="truncate pl-1">
                        <div className="font-bold text-neutral-800 truncate">{v.name}</div>
                        <div className="text-[9.5px] text-neutral-400 font-mono">{v.membershipNumber}</div>
                      </div>
                      <div className="shrink-0 flex items-center gap-1">
                        {att && (
                          <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-full font-bold">
                            حاضر
                          </span>
                        )}
                        <span className="font-mono text-neutral-400 bg-neutral-100 px-1 py-0.5 rounded-sm text-[9px]">
                          {v.barcode.slice(-4)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="border-t border-neutral-100 pt-3">
                <p className="text-[10px] text-neutral-500 flex items-center gap-1.5 bg-neutral-50 p-2.5 rounded-lg">
                  <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>يدعم النظام المسح بالليزر والكاميرا، ويمنع تسجيل الحضور مرتين لنفس المتطوع في المبادرة الواحدة تلقائياً.</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* METHOD 2: SEARCH BY NAME */}
      {activeTab === 'search' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute right-3.5 top-3 w-4 h-4 text-neutral-400" />
            <input
              id="attendance-search-input"
              type="text"
              placeholder="ابحث بالاسم الكامل للمتطوع، رقم الهوية الوطنية، أو رقم العضوية..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:outline-hidden"
            />
          </div>

          <div className="border border-neutral-100 rounded-xl overflow-hidden divide-y divide-neutral-50 max-h-80 overflow-y-auto">
            {filteredSearchVolunteers.length > 0 ? (
              filteredSearchVolunteers.map(v => {
                const record = getAttendanceRecord(v.id);
                return (
                  <div key={v.id} className="flex items-center justify-between p-3.5 hover:bg-neutral-50/50 transition-all">
                    <div className="flex items-center gap-3">
                      <img src={v.photo} alt={v.name} className="w-10 h-10 rounded-lg object-cover border border-neutral-100" referrerPolicy="no-referrer" />
                      <div>
                        <h4 className="text-xs font-bold text-neutral-800">{v.name}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-0.5 font-mono">
                          <span>عضوية: {v.membershipNumber}</span>
                          <span>•</span>
                          <span>هوية: {v.nationalId || "1033481230"}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      {record ? (
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2.5 py-1 rounded-full font-black ${record.status === 'full' ? 'bg-emerald-100 text-emerald-800' : record.status === 'late' ? 'bg-amber-100 text-amber-800' : 'bg-neutral-100 text-neutral-600'}`}>
                            محضر ({record.status === 'full' ? 'كامل' : 'متأخر'})
                          </span>
                          {!record.checkoutTimestamp && onCheckoutAttendance && (
                            <button
                              onClick={() => handleTriggerCheckout(v.id)}
                              className="text-[10px] bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1"
                            >
                              <LogOut className="w-3 h-3" />
                              <span>تسجيل انصراف</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex gap-1.5">
                          <button
                            id={`btn-attend-full-${v.id}`}
                            onClick={() => handleInitiateAttendance(v, 'full', 'manual')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all shadow-xs"
                          >
                            حضور كامل
                          </button>
                          <button
                            id={`btn-attend-late-${v.id}`}
                            onClick={() => handleInitiateAttendance(v, 'late', 'manual')}
                            className="bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                          >
                            متأخر
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-neutral-400 text-xs">لا يوجد متطوعين مسجلين يطابقون بحثك</div>
            )}
          </div>
        </div>
      )}

      {/* METHOD 3: CHECKLIST OF ALL VOLUNTEERS */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          <div className="overflow-x-auto border border-neutral-100 rounded-xl">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-neutral-50 text-neutral-500 border-b border-neutral-100 font-bold">
                  <th className="p-3 text-right">المتطوع</th>
                  <th className="p-3 text-right">رقم العضوية</th>
                  <th className="p-3 text-right">الباركود</th>
                  <th className="p-3 text-center">حالة الحضور</th>
                  <th className="p-3 text-center">وقت الحضور</th>
                  <th className="p-3 text-center">الإجراء الميداني</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {registeredVolunteers.map(v => {
                  const record = getAttendanceRecord(v.id);
                  return (
                    <tr key={v.id} className="hover:bg-neutral-50/20 transition-all">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <img src={v.photo} alt={v.name} className="w-8 h-8 rounded-md object-cover" referrerPolicy="no-referrer" />
                          <div>
                            <span className="font-bold text-neutral-800 block">{v.name}</span>
                            <span className="text-[9.5px] text-neutral-400 font-mono">{v.nationalId || "1033481230"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-neutral-500">{v.membershipNumber}</td>
                      <td className="p-3 font-mono text-neutral-400 text-[10px]">{v.barcode}</td>
                      <td className="p-3 text-center">
                        {record ? (
                          <span className={`inline-block text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                            record.status === 'full' ? 'bg-emerald-100 text-emerald-800' :
                            record.status === 'late' ? 'bg-amber-100 text-amber-800' :
                            record.status === 'excused' ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {record.status === 'full' ? 'حضور كامل ✓' :
                             record.status === 'late' ? 'تأخر' :
                             record.status === 'excused' ? 'غياب بعذر' : 'غياب بدون عذر'}
                            {record.wearingVest ? ' (سديري ✓)' : ''}
                          </span>
                        ) : (
                          <span className="text-neutral-400 text-[11px]">معلق</span>
                        )}
                      </td>
                      <td className="p-3 text-center font-mono text-[10px] text-neutral-500">
                        {record && record.timestamp ? new Date(record.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="p-3 text-center">
                        {record ? (
                          <div className="flex items-center justify-center gap-1">
                            {!record.checkoutTimestamp && onCheckoutAttendance ? (
                              <button
                                onClick={() => handleTriggerCheckout(v.id)}
                                className="bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                              >
                                <LogOut className="w-3 h-3" />
                                <span>انصراف</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-neutral-400 font-mono">
                                انصرف {record.checkoutTimestamp ? new Date(record.checkoutTimestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex gap-1 justify-center">
                            <button
                              id={`btn-list-full-${v.id}`}
                              onClick={() => handleInitiateAttendance(v, 'full', 'manual')}
                              className="bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer"
                            >
                              حضور كامل
                            </button>
                            <button
                              id={`btn-list-late-${v.id}`}
                              onClick={() => handleInitiateAttendance(v, 'late', 'manual')}
                              className="bg-amber-50 text-amber-700 hover:bg-amber-500 hover:text-white px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer"
                            >
                              متأخر
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DUPLICATE ATTENDANCE WARNING MODAL (SECTIONS 9 & 10) */}
      {duplicateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in no-print">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-right border border-amber-200 shadow-xl space-y-4 animate-scale-up" dir="rtl">
            <div className="flex items-center justify-between border-b border-amber-100 pb-3">
              <div className="flex items-center gap-2 text-amber-600">
                <ShieldAlert className="w-6 h-6" />
                <h3 className="text-md font-black text-neutral-800">تنبيه: تم تسجيل الحضور مسبقاً</h3>
              </div>
              <button 
                onClick={() => setDuplicateModal(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50/60 border border-amber-200 p-3.5 rounded-xl text-xs space-y-2 text-amber-950">
              <div className="flex justify-between">
                <span className="text-amber-800 font-bold">اسم المتطوع:</span>
                <strong className="text-neutral-900">{duplicateModal.volunteer.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-800 font-bold">رقم العضوية:</span>
                <span className="font-mono">{duplicateModal.volunteer.membershipNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-800 font-bold">وقت التحضير المسجل:</span>
                <span className="font-mono font-bold text-emerald-800">
                  {duplicateModal.record.timestamp 
                    ? new Date(duplicateModal.record.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    : "مسجل سابقاً"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-800 font-bold">الحالة المعتمدة:</span>
                <span className="font-bold">
                  {duplicateModal.record.status === 'full' ? 'حضور كامل (3 نقاط)' : 'حضور متأخر (2 نقاط)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-800 font-bold">ارتداء السديري:</span>
                <span>{duplicateModal.record.wearingVest ? 'نعم (ملتزم ✓)' : 'لا'}</span>
              </div>
            </div>

            <p className="text-[11px] text-neutral-500 leading-relaxed">
              وفقاً لضوابط الحضور الذكي بالباركود، لا يُسمح بتكرار احتساب الحضور أو النقاط لنفس المتطوع في المبادرة نفسها مرتين.
            </p>

            <div className="flex flex-col gap-2 pt-2">
              {!duplicateModal.record.checkoutTimestamp && onCheckoutAttendance && (
                <button
                  onClick={() => handleTriggerCheckout(duplicateModal.volunteer.id)}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>تسجيل انصراف وخروج المتطوع الآن</span>
                </button>
              )}
              <button
                onClick={() => setDuplicateModal(null)}
                className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer"
              >
                إغلاق التنبيه
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VEST CONFIRMATION POPUP DIALOG */}
      {showVestDialog && selectedVolunteer && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in no-print">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-right border border-neutral-100 shadow-xl space-y-5 animate-scale-up" dir="rtl">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-md font-black text-neutral-800">تأكيد تحضير المتطوع</h3>
              <p className="text-xs text-neutral-500 mt-1">التحقق من هوية المتطوع وارتداء الزي الميداني</p>
            </div>

            <div className="bg-neutral-50 p-3.5 rounded-xl text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-500">المتطوع:</span>
                <strong className="text-neutral-800">{selectedVolunteer.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">رقم العضوية:</span>
                <span className="font-mono text-neutral-700">{selectedVolunteer.membershipNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">طريقة التحضير:</span>
                <span className="font-bold text-emerald-800">
                  {recordingMethod === 'barcode' ? 'مسح الباركود الرقمي' : 'تحضير يدوي'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">الحالة المختارة:</span>
                <strong className="text-emerald-700 font-bold">
                  {attendanceStatusType === 'full' ? 'حضور كامل (+3 نقاط)' :
                   attendanceStatusType === 'late' ? 'حضور متأخر (+2 نقاط)' :
                   attendanceStatusType === 'excused' ? 'غياب بعذر (+1 نقطة)' : 'غياب بدون عذر (0 نقطة)'}
                </strong>
              </div>
            </div>

            {/* Vest Checkbox question */}
            <div className="border border-emerald-100 bg-emerald-50/20 p-4 rounded-xl">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  id="checkbox-wearing-vest"
                  type="checkbox"
                  checked={isWearingVest}
                  onChange={(e) => setIsWearingVest(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 bg-neutral-100 border-neutral-300 rounded-sm focus:ring-emerald-500 focus:ring-2 mt-0.5 cursor-pointer"
                />
                <div>
                  <strong className="text-xs text-neutral-800 block">هل يرتدي السديري والبطاقة الرسمية؟</strong>
                  <span className="text-[10px] text-neutral-500 block mt-0.5">يرجى التحقق من ارتداء السديري والبطاقة الذكية كجزء من معايير الجودة للجمعية.</span>
                </div>
              </label>
            </div>

            <div className="flex gap-2">
              <button
                id="btn-confirm-attendance-submit"
                onClick={() => handleConfirmAttendance(false)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                اعتماد وتسجيل
              </button>
              <button
                id="btn-confirm-attendance-cancel"
                onClick={() => {
                  setShowVestDialog(false);
                  setSelectedVolunteer(null);
                }}
                className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

