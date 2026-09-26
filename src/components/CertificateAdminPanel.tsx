import React, { useState } from "react";
import { Award, Plus, Trash2, Edit3, Send, CheckCircle2, ShieldCheck, Star, QrCode, Sliders, Eye, Sparkles, AlertCircle, FileText, Filter } from "lucide-react";
import { CertificateTemplate, IssuedCertificate, Initiative, Volunteer, InitiativeRating, AttendanceRecord } from "../types";
import { ImagePickerControl } from "./ImagePickerControl";
import { CertificateViewer } from "./CertificateViewer";

interface CertificateAdminPanelProps {
  certificateTemplates?: CertificateTemplate[];
  issuedCertificates?: IssuedCertificate[];
  initiativeRatings?: InitiativeRating[];
  initiatives: Initiative[];
  volunteers: Volunteer[];
  attendanceRecords?: AttendanceRecord[];
  onAddTemplate: (tmpl: any) => Promise<boolean>;
  onDeleteTemplate: (id: string) => Promise<boolean>;
  onIssueCertificates: (payload: any) => Promise<boolean>;
}

export const CertificateAdminPanel: React.FC<CertificateAdminPanelProps> = ({
  certificateTemplates = [],
  issuedCertificates = [],
  initiativeRatings = [],
  initiatives = [],
  volunteers = [],
  attendanceRecords = [],
  onAddTemplate,
  onDeleteTemplate,
  onIssueCertificates
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'templates' | 'issue' | 'issued_list' | 'ratings'>('issue');
  const [editingTemplate, setEditingTemplate] = useState<Partial<CertificateTemplate> | null>(null);

  // Issue Certificate Form State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(certificateTemplates[0]?.id || "");
  const [issueMode, setIssueMode] = useState<'initiative' | 'manual'>('initiative');
  const [selectedInitiativeId, setSelectedInitiativeId] = useState<string>(initiatives[0]?.id || "");
  const [customInitiativeName, setCustomInitiativeName] = useState<string>("");
  const [customHours, setCustomHours] = useState<number>(4);
  const [selectedVolunteerIds, setSelectedVolunteerIds] = useState<string[]>([]);
  const [issuingLoading, setIssuingLoading] = useState(false);
  const [issueSuccessMsg, setIssueSuccessMsg] = useState<string | null>(null);

  // Preview Certificate State
  const [previewCert, setPreviewCert] = useState<IssuedCertificate | null>(null);

  const handleSaveTemplate = async () => {
    if (!editingTemplate || !editingTemplate.title || !editingTemplate.backgroundUrl) {
      alert("يرجى إدخال اسم القالب ورابط صورة الخلفية");
      return;
    }
    const success = await onAddTemplate(editingTemplate);
    if (success) {
      setEditingTemplate(null);
    }
  };

  const handleExecuteIssuance = async () => {
    if (!selectedTemplateId) {
      alert("يرجى اختيار قالب الشهادة أولاً");
      return;
    }
    setIssuingLoading(true);
    try {
      const payload = {
        templateId: selectedTemplateId,
        initiativeId: issueMode === 'initiative' ? selectedInitiativeId : undefined,
        volunteerIds: issueMode === 'manual' ? selectedVolunteerIds : undefined,
        customInitiativeName: issueMode === 'manual' ? customInitiativeName : undefined,
        hours: customHours,
        issueDate: new Date().toISOString().split('T')[0]
      };
      const res = await onIssueCertificates(payload);
      if (res) {
        setIssueSuccessMsg("تم إصدار وتوثيق الشهادات بنجاح! الشهادات معلقة بانتظار تقييم المبادرة بواسطة المتطوع لاستلامها.");
        setTimeout(() => setIssueSuccessMsg(null), 5000);
      }
    } finally {
      setIssuingLoading(false);
    }
  };

  // Default initial template setup helper
  const defaultTemplateState: Partial<CertificateTemplate> = {
    title: "قالب شهادة الشكر والتطوع المعتمد",
    backgroundUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&h=800&fit=crop",
    nameX: 50,
    nameY: 42,
    nameFontSize: 24,
    nameColor: "#15803d",
    initiativeX: 50,
    initiativeY: 56,
    initiativeFontSize: 16,
    initiativeColor: "#1e293b",
    hoursX: 35,
    hoursY: 68,
    hoursFontSize: 14,
    hoursColor: "#0f766e",
    dateX: 65,
    dateY: 68,
    dateFontSize: 14,
    dateColor: "#64748b",
    qrX: 85,
    qrY: 78,
    qrSize: 70
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 p-6 rounded-2xl text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-[10px] font-bold border border-white/10">
            <Award className="w-4 h-4 text-emerald-300" />
            <span>نظام إدارة وتوثيق الشهادات الرقمية</span>
          </div>
          <h2 className="text-md font-black">إدارة وتصميم شهادات التطوع وتقييم الفعاليات</h2>
          <p className="text-xs text-emerald-100">رفع القوالب، تحديد أماكن النصوص والـ QR، وإصدار الشهادات بشرط تقييم المبادرة</p>
        </div>

        {/* Action Tabs */}
        <div className="flex bg-black/20 p-1 rounded-xl backdrop-blur-xs border border-white/10">
          <button
            onClick={() => setActiveSubTab('issue')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeSubTab === 'issue' ? 'bg-white text-emerald-900 shadow-xs' : 'text-white/80 hover:text-white'}`}
          >
            إصدار الشهادات
          </button>
          <button
            onClick={() => setActiveSubTab('templates')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeSubTab === 'templates' ? 'bg-white text-emerald-900 shadow-xs' : 'text-white/80 hover:text-white'}`}
          >
            قوالب الشهادات ({certificateTemplates.length})
          </button>
          <button
            onClick={() => setActiveSubTab('issued_list')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeSubTab === 'issued_list' ? 'bg-white text-emerald-900 shadow-xs' : 'text-white/80 hover:text-white'}`}
          >
            الشهادات الصادرة ({issuedCertificates.length})
          </button>
          <button
            onClick={() => setActiveSubTab('ratings')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeSubTab === 'ratings' ? 'bg-white text-emerald-900 shadow-xs' : 'text-white/80 hover:text-white'}`}
          >
            تقييمات المتطوعين ({initiativeRatings.length})
          </button>
        </div>
      </div>

      {/* SUBTAB 1: ISSUE CERTIFICATES */}
      {activeSubTab === 'issue' && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-150 shadow-2xs space-y-6">
          <div className="border-b border-neutral-100 pb-3">
            <h3 className="text-xs font-black text-neutral-800">إصدار وترحيل شهادات التطوع لبطاقات الأعضاء</h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              💡 <b>ملاحظة نظام التقييم الإجباري:</b> عند إصدار الشهادة، تصل للمتطوع في خزينته بحالة <b>(معلقة 🔒)</b> ولن يستطيع تنزيلها أو طباعتها حتى يقوم بتقييم المبادرة أولاً.
            </p>
          </div>

          {issueSuccessMsg && (
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 animate-bounce" />
              <span>{issueSuccessMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Step 1: Select Template */}
            <div className="space-y-4 bg-neutral-50 p-4 rounded-2xl border border-neutral-150">
              <h4 className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
                <span>1. اختر قالب الشهادة المعتمد:</span>
              </h4>

              {certificateTemplates.length === 0 ? (
                <div className="text-center p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                  لا توجد قوالب شهادات حالياً. يرجى الانتقال إلى تبويب "قوالب الشهادات" وإضافة قالب أولاً.
                </div>
              ) : (
                <div className="space-y-3">
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {certificateTemplates.map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>

                  {/* Template Quick Thumbnail Preview */}
                  {selectedTemplateId && (
                    <div className="relative aspect-16/10 bg-neutral-200 rounded-xl overflow-hidden border border-neutral-300">
                      {(() => {
                        const tmpl = certificateTemplates.find(t => t.id === selectedTemplateId);
                        if (!tmpl) return null;
                        return (
                          <>
                            <img src={tmpl.backgroundUrl} alt="قالب" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center text-white text-[10px] font-bold">
                              معاينة القالب المختار ✓
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 2: Target Selection */}
            <div className="space-y-4 bg-neutral-50 p-4 rounded-2xl border border-neutral-150">
              <h4 className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
                <span>2. تحديد الفئة المستهدفة بالشهادة:</span>
              </h4>

              <div className="flex gap-2 bg-neutral-200 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setIssueMode('initiative')}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${issueMode === 'initiative' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-neutral-600'}`}
                >
                  حسب المبادرة المكتملة
                </button>
                <button
                  onClick={() => setIssueMode('manual')}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${issueMode === 'manual' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-neutral-600'}`}
                >
                  اختيار متطوعين محددين
                </button>
              </div>

              {/* Mode A: Select Initiative */}
              {issueMode === 'initiative' && (
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-neutral-500 block">اختر المبادرة المنفذة:</label>
                  <select
                    value={selectedInitiativeId}
                    onChange={(e) => setSelectedInitiativeId(e.target.value)}
                    className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {initiatives.map(i => (
                      <option key={i.id} value={i.id}>
                        {i.name} ({i.date})
                      </option>
                    ))}
                  </select>

                  {/* Attendance Count indicator */}
                  {selectedInitiativeId && (
                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-150 text-[11px] text-emerald-900 font-bold">
                      👥 عدد الحاضرين والمقبولين بهذه المبادرة:{" "}
                      <b>
                        {(() => {
                          const init = initiatives.find(i => i.id === selectedInitiativeId);
                          const atts = attendanceRecords.filter(a => a.initiativeId === selectedInitiativeId && (a.status === 'full' || a.status === 'late'));
                          return Math.max(init?.acceptedVolunteerIds?.length || 0, atts.length || 1);
                        })()} متطوعاً
                      </b>
                    </div>
                  )}
                </div>
              )}

              {/* Mode B: Manual selection */}
              {issueMode === 'manual' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 block">عنوان المبادرة / الفعالية:</label>
                    <input
                      type="text"
                      placeholder="مثال: مبادرة تنظيم فعاليات يوم التأسيس"
                      value={customInitiativeName}
                      onChange={(e) => setCustomInitiativeName(e.target.value)}
                      className="w-full border border-neutral-200 rounded-xl p-2 text-xs focus:ring-2 focus:ring-emerald-500/20 font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 block">اختر المتطوعين المستحقين:</label>
                    <div className="max-h-36 overflow-y-auto border border-neutral-200 rounded-xl p-2 space-y-1 bg-white">
                      {volunteers.map(v => (
                        <label key={v.id} className="flex items-center gap-2 p-1.5 hover:bg-neutral-50 rounded-lg text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedVolunteerIds.includes(v.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedVolunteerIds([...selectedVolunteerIds, v.id]);
                              } else {
                                setSelectedVolunteerIds(selectedVolunteerIds.filter(id => id !== v.id));
                              }
                            }}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="font-bold text-neutral-800">{v.name}</span>
                          <span className="text-[10px] text-neutral-400">({v.membershipNumber})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Hours input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-500 block">عدد الساعات التطوعية المعتمدة:</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={customHours}
                  onChange={(e) => setCustomHours(Number(e.target.value))}
                  className="w-full border border-neutral-200 rounded-xl p-2 text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

            </div>

          </div>

          {/* Submit Action */}
          <div className="flex justify-end pt-3 border-t border-neutral-100">
            <button
              onClick={handleExecuteIssuance}
              disabled={issuingLoading || certificateTemplates.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-6 py-3 rounded-xl transition-all shadow-md inline-flex items-center gap-2 cursor-pointer disabled:bg-neutral-300"
            >
              <Send className="w-4 h-4" />
              <span>إصدار الشهادات وترحيلها لحسابات المتطوعين الآن</span>
            </button>
          </div>
        </div>
      )}

      {/* SUBTAB 2: CERTIFICATE TEMPLATES BUILDER */}
      {activeSubTab === 'templates' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-neutral-150">
            <div>
              <h3 className="text-xs font-black text-neutral-800">مكتبة قوالب الشهادات الرقمية</h3>
              <p className="text-[11px] text-neutral-500">قم بتحديد مواضع الأسماء والعناوين والألوان ونسبة الخط على قالب الشهادة</p>
            </div>

            <button
              onClick={() => setEditingTemplate(defaultTemplateState)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة قالب شهادة جديد</span>
            </button>
          </div>

          {/* Edit Modal / Form if open */}
          {editingTemplate && (
            <div className="bg-white p-6 rounded-2xl border-2 border-emerald-500/30 shadow-lg space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h4 className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4" />
                  <span>تخصيص أبعاد ومواضع النصوص لقالب الشهادة</span>
                </h4>
                <button
                  onClick={() => setEditingTemplate(null)}
                  className="text-xs text-neutral-400 hover:text-neutral-700 font-bold"
                >
                  إلغاء ✕
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Controls Column */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500">عنوان القالب:</label>
                    <input
                      type="text"
                      placeholder="عنوان وصف القالب..."
                      value={editingTemplate.title || ''}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                      className="w-full border border-neutral-200 rounded-xl p-2 text-xs font-bold"
                    />
                  </div>

                  <ImagePickerControl
                    label="صورة خلفية القالب"
                    description="ارفع تصميم خلفية الشهادة بدون نصوص"
                    value={editingTemplate.backgroundUrl || ''}
                    onChange={(val) => setEditingTemplate({ ...editingTemplate, backgroundUrl: val })}
                    aspectRatio="banner"
                  />

                  {/* Positioning Sliders */}
                  <div className="space-y-3 pt-2 border-t border-neutral-150">
                    <h5 className="text-[11px] font-black text-neutral-800">موقع اسم المتطوع:</h5>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-[10px] text-neutral-500">
                        أفقي (X): {editingTemplate.nameX}%
                        <input
                          type="range" min="10" max="90" value={editingTemplate.nameX || 50}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, nameX: Number(e.target.value) })}
                          className="w-full accent-emerald-600"
                        />
                      </label>
                      <label className="text-[10px] text-neutral-500">
                        رأسي (Y): {editingTemplate.nameY}%
                        <input
                          type="range" min="10" max="90" value={editingTemplate.nameY || 42}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, nameY: Number(e.target.value) })}
                          className="w-full accent-emerald-600"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-neutral-150">
                    <h5 className="text-[11px] font-black text-neutral-800">موقع اسم المبادرة:</h5>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-[10px] text-neutral-500">
                        أفقي (X): {editingTemplate.initiativeX}%
                        <input
                          type="range" min="10" max="90" value={editingTemplate.initiativeX || 50}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, initiativeX: Number(e.target.value) })}
                          className="w-full accent-emerald-600"
                        />
                      </label>
                      <label className="text-[10px] text-neutral-500">
                        رأسي (Y): {editingTemplate.initiativeY}%
                        <input
                          type="range" min="10" max="90" value={editingTemplate.initiativeY || 56}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, initiativeY: Number(e.target.value) })}
                          className="w-full accent-emerald-600"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3">
                    <button
                      onClick={handleSaveTemplate}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-xs"
                    >
                      حفظ القالب المعاين ✓
                    </button>
                  </div>
                </div>

                {/* Live Preview Canvas Column */}
                <div className="lg:col-span-7 flex flex-col items-center justify-center bg-neutral-100 p-4 rounded-2xl border border-neutral-200">
                  <div className="text-center mb-2">
                    <span className="text-[10px] font-bold text-neutral-500">المعاينة الحية التفاعلية المباشرة:</span>
                  </div>

                  <div className="relative w-full aspect-16/11 bg-white rounded-xl shadow-lg overflow-hidden border border-neutral-300">
                    <img
                      src={editingTemplate.backgroundUrl || "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&h=800&fit=crop"}
                      alt="معاينة"
                      className="w-full h-full object-cover select-none pointer-events-none"
                    />

                    {/* Name Preview */}
                    <div
                      className="absolute -translate-x-1/2 -translate-y-1/2 text-center font-black whitespace-nowrap"
                      style={{
                        left: `${editingTemplate.nameX || 50}%`,
                        top: `${editingTemplate.nameY || 42}%`,
                        fontSize: `clamp(12px, ${editingTemplate.nameFontSize ? editingTemplate.nameFontSize / 12 : 2}vw, 28px)`,
                        color: editingTemplate.nameColor || "#15803d"
                      }}
                    >
                      [اسم المتطوع الثلاثي المعاين]
                    </div>

                    {/* Initiative Title Preview */}
                    <div
                      className="absolute -translate-x-1/2 -translate-y-1/2 text-center font-bold"
                      style={{
                        left: `${editingTemplate.initiativeX || 50}%`,
                        top: `${editingTemplate.initiativeY || 56}%`,
                        fontSize: `clamp(10px, ${editingTemplate.initiativeFontSize ? editingTemplate.initiativeFontSize / 14 : 1.4}vw, 20px)`,
                        color: editingTemplate.initiativeColor || "#1e293b"
                      }}
                    >
                      [مبادرة تنظيم إفطار صائم بالعسيلة]
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* List of Templates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {certificateTemplates.map(t => (
              <div key={t.id} className="bg-white p-4 rounded-2xl border border-neutral-150 space-y-3 shadow-2xs">
                <div className="relative aspect-16/10 rounded-xl overflow-hidden border border-neutral-200">
                  <img src={t.backgroundUrl} alt={t.title} className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2 bg-emerald-800/90 text-white text-[9.5px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                    مستند معتمد ✓
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-neutral-800">{t.title}</h4>
                  <button
                    onClick={() => onDeleteTemplate(t.id)}
                    className="text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* SUBTAB 3: ISSUED CERTIFICATES LIST */}
      {activeSubTab === 'issued_list' && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-150 shadow-2xs space-y-4">
          <h3 className="text-xs font-black text-neutral-800">سجل الشهادات الرقمية الصادرة للأعضاء</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-neutral-50 text-neutral-500 font-bold border-b border-neutral-100">
                <tr>
                  <th className="p-3">كود الشهادة</th>
                  <th className="p-3">اسم المتطوع</th>
                  <th className="p-3">اسم المبادرة</th>
                  <th className="p-3">الساعات</th>
                  <th className="p-3">تاريخ الإصدار</th>
                  <th className="p-3">حالة الاستلام</th>
                  <th className="p-3">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {issuedCertificates.map(cert => (
                  <tr key={cert.id} className="hover:bg-neutral-50/80 transition-all">
                    <td className="p-3 font-mono font-bold text-emerald-700">{cert.certificateCode}</td>
                    <td className="p-3 font-black text-neutral-800">{cert.volunteerName}</td>
                    <td className="p-3 text-neutral-600">{cert.initiativeName}</td>
                    <td className="p-3 font-mono font-bold">{cert.hours} س</td>
                    <td className="p-3 text-neutral-400 font-mono text-[11px]">{cert.issueDate}</td>
                    <td className="p-3">
                      {cert.status === 'unlocked' ? (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                          تم التقييم ومستلمة ✓
                        </span>
                      ) : (
                        <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 inline-flex">
                          🔒 معلقة (بانتظار تقييم المتطوع)
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => setPreviewCert(cert)}
                        className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-[10px] px-3 py-1 rounded-lg transition-all"
                      >
                        معاينة الشهادة
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 4: VOLUNTEER RATINGS & FEEDBACK ANALYTICS */}
      {activeSubTab === 'ratings' && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-150 shadow-2xs space-y-4">
          <div>
            <h3 className="text-xs font-black text-neutral-800">تغذية وسجل تقييمات المبادرات التطوعية</h3>
            <p className="text-[11px] text-neutral-500">آراء وملحوظات المتطوعين عقب مشاركتهم الميدانية لتطوير الفعاليات المستقبلية</p>
          </div>

          {initiativeRatings.length === 0 ? (
            <div className="text-center p-8 bg-neutral-50 rounded-2xl border border-neutral-100 text-neutral-400 text-xs font-bold">
              لا توجد تقييمات مسجلة حتى الآن من قِبل المتطوعين.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {initiativeRatings.map(rate => (
                <div key={rate.id} className="bg-neutral-50/50 p-4 rounded-2xl border border-neutral-150 space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                    <div>
                      <h4 className="text-xs font-black text-neutral-800">{rate.initiativeName}</h4>
                      <p className="text-[10px] text-neutral-400">المتطوع: <b>{rate.volunteerName}</b></p>
                    </div>
                    <div className="flex items-center text-amber-500 font-black text-xs">
                      ★ {rate.overallRating} / 5
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[10px] text-center font-bold">
                    <div className="bg-white p-1.5 rounded-lg border border-neutral-100">
                      <span className="text-neutral-400 block">التنظيم</span>
                      <strong className="text-emerald-700">{rate.organizationRating}★</strong>
                    </div>
                    <div className="bg-white p-1.5 rounded-lg border border-neutral-100">
                      <span className="text-neutral-400 block">الأثر والتجربة</span>
                      <strong className="text-emerald-700">{rate.impactRating}★</strong>
                    </div>
                    <div className="bg-white p-1.5 rounded-lg border border-neutral-100">
                      <span className="text-neutral-400 block">دعم القائد</span>
                      <strong className="text-emerald-700">{rate.leaderSupportRating}★</strong>
                    </div>
                  </div>

                  {rate.feedbackText && (
                    <div className="bg-white p-2.5 rounded-xl border border-neutral-150 text-[11px] text-neutral-600 leading-relaxed italic">
                      "{rate.feedbackText}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Preview Certificate Modal */}
      {previewCert && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto space-y-4">
            <CertificateViewer certificate={previewCert} onClose={() => setPreviewCert(null)} />
          </div>
        </div>
      )}

    </div>
  );
};
