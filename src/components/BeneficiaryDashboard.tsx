import React, { useState } from "react";
import { 
  User, ClipboardList, Bell, ShieldCheck, Phone, Mail, MapPin, 
  Users, CheckCircle2, AlertTriangle, Clock, Calendar, HelpCircle, 
  Send, Plus, Eye, CheckCircle, Ban, Hourglass, Download, Printer,
  Star, CheckCheck, Loader2, Package, Sparkles
} from "lucide-react";
import { Beneficiary, BenefitRequest, Initiative, DistributionHandoverRecord, AidDistribution, BeneficiaryRating } from "../types";
import { BeneficiaryRatingModal } from "./BeneficiaryRatingModal";

interface BeneficiaryDashboardProps {
  beneficiary: Beneficiary;
  requests: BenefitRequest[];
  initiatives: Initiative[];
  handovers?: DistributionHandoverRecord[];
  distributions?: AidDistribution[];
  beneficiaryRatings?: BeneficiaryRating[];
  onUpdateProfile: (updated: Partial<Beneficiary>) => Promise<boolean>;
  onSubmitRequest: (req: Partial<BenefitRequest>) => Promise<boolean>;
  onConfirmAidReceipt?: (payload: { aidId: string; aidType?: string; beneficiaryId: string }) => Promise<any>;
  onSubmitBeneficiaryRating?: (ratingData: Partial<BeneficiaryRating>) => Promise<any>;
  onLogout: () => void;
  lang: "ar" | "en";
}

export function BeneficiaryDashboard({
  beneficiary,
  requests,
  initiatives,
  handovers = [],
  distributions = [],
  beneficiaryRatings = [],
  onUpdateProfile,
  onSubmitRequest,
  onConfirmAidReceipt,
  onSubmitBeneficiaryRating,
  onLogout,
  lang = "ar"
}: BeneficiaryDashboardProps) {
  const [activeTab, setActiveTab] = useState<"portal" | "apply" | "history" | "initiatives" | "profile">("portal");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Rating Modal States
  const [ratingModalOpen, setRatingModalOpen] = useState<boolean>(false);
  const [selectedAidToRate, setSelectedAidToRate] = useState<{ id: string; title?: string; type?: string; date?: string } | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // New Request Form States
  const [reqType, setReqType] = useState<string>("food");
  const [reqDetails, setReqDetails] = useState<string>("");

  // Edit Profile States
  const [phone, setPhone] = useState(beneficiary.phone);
  const [email, setEmail] = useState(beneficiary.email);
  const [address, setAddress] = useState(beneficiary.address);
  const [familySize, setFamilySize] = useState(beneficiary.familySize);

  // Filter requests & handovers for current beneficiary
  const myRequests = requests.filter(r => r.beneficiaryId === beneficiary.id);
  const myHandovers = handovers.filter(h => 
    h.beneficiaryId === beneficiary.id || 
    h.nationalId === beneficiary.nationalId ||
    (beneficiary.barcodeId && h.beneficiaryBarcode === beneficiary.barcodeId)
  );

  const handleConfirmAidReceiptClick = async (aidItem: { id: string; title?: string; type?: string; date?: string }) => {
    setActionLoadingId(aidItem.id);
    try {
      if (onConfirmAidReceipt) {
        await onConfirmAidReceipt({
          aidId: aidItem.id,
          aidType: aidItem.type || aidItem.title || "مساعدة إنسانية",
          beneficiaryId: beneficiary.id
        });
      }
      // Immediately open rating modal directly after receipt confirmation
      setSelectedAidToRate(aidItem);
      setRatingModalOpen(true);
    } catch (err: any) {
      console.error(err);
      alert(lang === "ar" ? "تعذر تأكيد الاستلام، يرجى المحاولة لاحقاً" : "Failed to confirm receipt");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenRatingOnly = (aidItem: { id: string; title?: string; type?: string; date?: string }) => {
    setSelectedAidToRate(aidItem);
    setRatingModalOpen(true);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqDetails.trim()) {
      alert(lang === "ar" ? "الرجاء كتابة تفاصيل الطلب" : "Please provide request details");
      return;
    }

    setIsSubmitting(true);
    const success = await onSubmitRequest({
      beneficiaryId: beneficiary.id,
      beneficiaryName: beneficiary.name,
      type: reqType,
      details: reqDetails,
      status: "pending",
      date: new Date().toISOString().split("T")[0],
      notes: ""
    });

    if (success) {
      alert(lang === "ar" ? "تم إرسال طلب الاستفادة بنجاح وجاري تدقيقه" : "Request submitted successfully and is being audited");
      setReqDetails("");
      setActiveTab("history");
    }
    setIsSubmitting(false);
  };

  const handleUpdateProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const success = await onUpdateProfile({
      id: beneficiary.id,
      phone,
      email,
      address,
      familySize: Number(familySize)
    });
    if (success) {
      alert(lang === "ar" ? "تم تحديث الملف الشخصي بنجاح" : "Profile updated successfully");
    }
    setIsSubmitting(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Hourglass className="w-3.5 h-3.5 animate-spin" />
            <span>{lang === "ar" ? "قيد الدراسة" : "Pending Audit"}</span>
          </span>
        );
      case "approved":
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{status === "completed" ? (lang === "ar" ? "تم التسليم" : "Completed") : (lang === "ar" ? "مقبول" : "Approved")}</span>
          </span>
        );
      case "in_progress":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3.5 h-3.5" />
            <span>{lang === "ar" ? "جاري التجهيز" : "Processing"}</span>
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <Ban className="w-3.5 h-3.5" />
            <span>{lang === "ar" ? "مرفوض" : "Declined"}</span>
          </span>
        );
      default:
        return null;
    }
  };

  const handlePrintRequest = (req: BenefitRequest) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html dir="rtl" lang="ar">
      <head>
        <title>طلب الاستفادة - ريادة العطاء</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Inter', sans-serif; padding: 40px; color: #333; }
          .header { text-align: center; border-bottom: 2px solid #059669; padding-bottom: 20px; margin-bottom: 30px; }
          .title { font-size: 24px; font-weight: bold; color: #059669; }
          .info-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .info-table th, .info-table td { border: 1px solid #ddd; padding: 12px; text-align: right; }
          .info-table th { bg-color: #f9fafb; font-weight: bold; }
          .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>جمعية ريادة العطاء لخدمة الإنسان بالعسيلة</h2>
          <p>ترخيص رقم: 5081 | وزارة الموارد البشرية والتنمية الاجتماعية</p>
          <div class="title">إشعار طلب تقديم خدمة مستفيد</div>
        </div>
        
        <table class="info-table">
          <tr>
            <th>رقم الطلب</th>
            <td>${req.id}</td>
            <th>تاريخ التقديم</th>
            <td>${req.date}</td>
          </tr>
          <tr>
            <th>اسم المستفيد</th>
            <td>${beneficiary.name}</td>
            <th>رقم الهوية الوطنية</th>
            <td>${beneficiary.nationalId}</td>
          </tr>
          <tr>
            <th>رقم الجوال</th>
            <td>${beneficiary.phone}</td>
            <th>عنوان السكن</th>
            <td>${beneficiary.address}</td>
          </tr>
          <tr>
            <th>نوع الدعم المطلوب</th>
            <td>${req.type === 'food' ? 'سلة غذائية' : req.type === 'financial' ? 'مساعدة مالية' : req.type === 'medical' ? 'دعم طبي' : req.type === 'housing' ? 'إيجار/ترميم مسكن' : 'خدمات عامة أخرى'}</td>
            <th>حالة الطلب الحالية</th>
            <td>${req.status === 'pending' ? 'قيد الدراسة والتدقيق الميداني' : req.status === 'approved' ? 'مقبول وبانتظار التسليم' : req.status === 'in_progress' ? 'جاري التحضير والتعبئة' : req.status === 'completed' ? 'تم التسليم وإغلاق الملف' : 'نعتذر، لم يتم الموافقة'}</td>
          </tr>
          <tr>
            <th colspan="4">تفاصيل الطلب والاحتياج</th>
          </tr>
          <tr>
            <td colspan="4" style="height: 100px; vertical-align: top;">${req.details}</td>
          </tr>
          <tr>
            <th colspan="4">ملاحظات وقرار الجمعية</th>
          </tr>
          <tr>
            <td colspan="4" style="height: 60px; vertical-align: top;">${req.notes || "طلبك حالياً تحت مراجعة الباحث الاجتماعي بالجمعية للتحقق من شروط الاستحقاق مكة المكرمة بالعسيلة."}</td>
          </tr>
        </table>

        <div class="footer">
          <p>جمعية ريادة العطاء لخدمة الإنسان بالعسيلة - مكة المكرمة</p>
          <p>التقرير مستخرج آلياً من نظام الجمعية الموحد | تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-SA')}</p>
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="bg-neutral-50 rounded-2xl border border-neutral-100 shadow-xl overflow-hidden text-right min-h-[600px]" dir="rtl">
      {/* Portal Top Bar */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 relative">
        <div className="absolute top-0 right-0 w-32 h-full bg-white/5 rounded-bl-full pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center border-2 border-white/20 text-white font-bold text-2xl uppercase shadow-md">
              {beneficiary.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">{beneficiary.name}</h1>
                <span className="bg-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-full border border-white/20">
                  {lang === "ar" ? "حساب مستفيد معتمد" : "Beneficiary Account"}
                </span>
              </div>
              <p className="text-emerald-100 text-xs mt-1 font-mono">
                {lang === "ar" ? "رقم الهوية الوطنية" : "National ID"}: {beneficiary.nationalId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("apply")}
              className="px-4 py-2 bg-white text-emerald-700 hover:bg-emerald-50 rounded-xl font-bold text-xs transition-all shadow-sm flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === "ar" ? "طلب استفادة جديد" : "Apply for Aid"}</span>
            </button>
            <button
              onClick={onLogout}
              className="px-3 py-2 bg-emerald-700/50 hover:bg-emerald-700 text-emerald-100 hover:text-white rounded-xl font-semibold text-xs transition-all border border-emerald-500/30 cursor-pointer"
            >
              {lang === "ar" ? "تسجيل خروج" : "Log out"}
            </button>
          </div>
        </div>

        {/* Portal Mini Navigation */}
        <div className="flex flex-wrap gap-2 mt-6 border-t border-white/10 pt-4">
          <button
            onClick={() => setActiveTab("portal")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "portal" ? "bg-white text-emerald-700 shadow-md" : "text-emerald-100 hover:bg-white/10"}`}
          >
            {lang === "ar" ? "الرئيسية والمتابعة" : "Portal Home"}
          </button>
          <button
            onClick={() => setActiveTab("apply")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "apply" ? "bg-white text-emerald-700 shadow-md" : "text-emerald-100 hover:bg-white/10"}`}
          >
            {lang === "ar" ? "تقديم طلب مساعدة" : "Submit Request"}
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "history" ? "bg-white text-emerald-700 shadow-md" : "text-emerald-100 hover:bg-white/10"}`}
          >
            {lang === "ar" ? "سجل طلباتي السابقة" : "My Requests History"} ({myRequests.length})
          </button>
          <button
            onClick={() => setActiveTab("initiatives")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "initiatives" ? "bg-white text-emerald-700 shadow-md" : "text-emerald-100 hover:bg-white/10"}`}
          >
            {lang === "ar" ? "المبادرات التموينية والخدمية" : "Available Programs"}
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "profile" ? "bg-white text-emerald-700 shadow-md" : "text-emerald-100 hover:bg-white/10"}`}
          >
            {lang === "ar" ? "البيانات الشخصية والملف" : "My Profile"}
          </button>
        </div>
      </div>

      {/* Portal Content Area */}
      <div className="p-6">
        
        {/* TAB 1: PORTAL MAIN OVERVIEW */}
        {activeTab === "portal" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left/Main Column: Active Requests Tracker */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm">
                <h2 className="text-sm font-black text-neutral-800 flex items-center gap-1.5 border-b border-neutral-100 pb-3">
                  <ClipboardList className="w-5 h-5 text-emerald-600" />
                  <span>{lang === "ar" ? "متابعة حالة الطلبات النشطة" : "Active Application Status"}</span>
                </h2>

                {myRequests.filter(r => r.status !== "completed" && r.status !== "rejected").length === 0 ? (
                  <div className="text-center py-10 text-neutral-400">
                    <p className="text-xs">{lang === "ar" ? "لا توجد طلبات نشطة حالياً." : "No active requests currently."}</p>
                    <button
                      onClick={() => setActiveTab("apply")}
                      className="mt-4 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl font-bold text-xs transition-all cursor-pointer"
                    >
                      {lang === "ar" ? "تقديم طلب استفادة الآن" : "Apply for assistance"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6 mt-4">
                    {myRequests.filter(r => r.status !== "completed" && r.status !== "rejected").map(req => {
                      const steps = ["pending", "approved", "in_progress", "completed"];
                      const currentStepIdx = steps.indexOf(req.status);
                      
                      return (
                        <div key={req.id} className="p-5 rounded-xl border border-neutral-100 bg-neutral-50/50 space-y-4">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <span className="text-[10px] text-neutral-400 font-mono block">رقم المعاملة: {req.id}</span>
                              <h3 className="text-xs font-black text-neutral-800 mt-1">
                                {lang === "ar" ? "نوع الطلب:" : "Aid Type:"}{" "}
                                {req.type === "food" ? "سلة غذائية تموينية" : req.type === "financial" ? "مساعدة مالية طارئة" : req.type === "medical" ? "دعم طبي وأدوية" : req.type === "housing" ? "مسكن وترميم" : "خدمة إنسانية عامة"}
                              </h3>
                              <p className="text-[11px] text-neutral-500 mt-1.5 leading-relaxed">{req.details}</p>
                            </div>
                            {getStatusBadge(req.status)}
                          </div>

                          {/* Interactive Step Timeline */}
                          <div className="pt-2">
                            <div className="relative flex justify-between items-center w-full">
                              {/* Background Line */}
                              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-neutral-200 pointer-events-none z-0"></div>
                              {/* Filled Active Line */}
                              <div 
                                className="absolute right-0 top-1/2 -translate-y-1/2 h-1 bg-emerald-500 pointer-events-none z-0 transition-all duration-500"
                                style={{ 
                                  width: `${(currentStepIdx / (steps.length - 1)) * 100}%`,
                                  right: 0
                                }}
                              ></div>

                              {/* Step 1: Submitting */}
                              <div className="flex flex-col items-center z-10 relative">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${currentStepIdx >= 0 ? "bg-emerald-500 text-white" : "bg-neutral-200 text-neutral-400"}`}>
                                  1
                                </div>
                                <span className="text-[10px] font-bold text-neutral-700 mt-1">{lang === "ar" ? "تلقي الطلب" : "Received"}</span>
                              </div>

                              {/* Step 2: Approved/Audited */}
                              <div className="flex flex-col items-center z-10 relative">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${currentStepIdx >= 1 ? "bg-emerald-500 text-white" : "bg-neutral-200 text-neutral-400"}`}>
                                  2
                                </div>
                                <span className="text-[10px] font-bold text-neutral-700 mt-1">{lang === "ar" ? "الموافقة المبدئية" : "Approved"}</span>
                              </div>

                              {/* Step 3: Preparing */}
                              <div className="flex flex-col items-center z-10 relative">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${currentStepIdx >= 2 ? "bg-emerald-500 text-white" : "bg-neutral-200 text-neutral-400"}`}>
                                  3
                                </div>
                                <span className="text-[10px] font-bold text-neutral-700 mt-1">{lang === "ar" ? "جاري التجهيز" : "Processing"}</span>
                              </div>

                              {/* Step 4: Handover */}
                              <div className="flex flex-col items-center z-10 relative">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${currentStepIdx >= 3 ? "bg-emerald-500 text-white" : "bg-neutral-200 text-neutral-400"}`}>
                                  4
                                </div>
                                <span className="text-[10px] font-bold text-neutral-700 mt-1">{lang === "ar" ? "جاهز للتسليم" : "Ready"}</span>
                              </div>
                            </div>
                          </div>

                          {req.notes && (
                            <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg text-amber-800 text-[11px] leading-relaxed">
                              <strong>ملاحظة الباحث الإداري بالجمعية:</strong> {req.notes}
                            </div>
                          )}

                          <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
                            <button
                              onClick={() => handlePrintRequest(req)}
                              className="px-3 py-1.5 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>{lang === "ar" ? "طباعة إشعار مالي" : "Print Receipt"}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Side Column: Account Information and Status */}
            <div className="space-y-6">
              {/* Account Status Card */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-4">
                <h3 className="text-xs font-black text-neutral-800 uppercase tracking-wider">
                  {lang === "ar" ? "حالة ملف الضمان الاجتماعي الموحد" : "Social Security File Status"}
                </h3>
                
                {beneficiary.status === "approved" ? (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-emerald-800">{lang === "ar" ? "الملف نشط ومعتمد" : "Active File"}</h4>
                      <p className="text-[10px] text-emerald-700/80 mt-1 leading-relaxed">
                        أنت الآن مستفيد مسجل ومعتمد بجمعية ريادة العطاء لخدمة الإنسان بالعسيلة مكة المكرمة. يمكنك الاستفادة من كافة السلال التموينية والمبادرات المخصصة.
                      </p>
                    </div>
                  </div>
                ) : beneficiary.status === "pending" ? (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-3">
                    <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-800">{lang === "ar" ? "الملف قيد المراجعة والمطابقة" : "File Pending Review"}</h4>
                      <p className="text-[10px] text-amber-700/80 mt-1 leading-relaxed">
                        يتم الآن تدقيق معلومات الهوية الوطنية وصحة عنوان السكن في مخطط العسيلة وتحديثات صك الإعالة لضمان استحقاق الدعم.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-rose-800">{lang === "ar" ? "الملف موقوف / نعتذر" : "File Suspended / Declined"}</h4>
                      <p className="text-[10px] text-rose-700/80 mt-1 leading-relaxed">
                        نعتذر منك، الملف غير معتمد حالياً. الرجاء مراجعة مقر الجمعية الرئيسي بالعسيلة لتقديم الأوراق الثبوتية والتقارير الطبية اللازمة.
                      </p>
                    </div>
                  </div>
                )}

                <div className="border-t border-neutral-100 pt-4 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-400">{lang === "ar" ? "حجم الأسرة المسجل" : "Family Size"}:</span>
                    <strong className="text-neutral-700">{beneficiary.familySize} {lang === "ar" ? "أفراد" : "Members"}</strong>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-400">{lang === "ar" ? "نطاق الحي السكني" : "District"}:</span>
                    <strong className="text-neutral-700">{beneficiary.address || "العسيلة"}</strong>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-400">{lang === "ar" ? "تاريخ التسجيل" : "Created Date"}:</span>
                    <strong className="text-neutral-500 font-mono">{new Date(beneficiary.createdAt).toLocaleDateString('ar-SA')}</strong>
                  </div>
                </div>
              </div>

              {/* Quick Instructions */}
              <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-3">
                <h3 className="text-xs font-black text-neutral-800 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-emerald-600" />
                  <span>{lang === "ar" ? "إرشادات وتوجيهات" : "Instructions"}</span>
                </h3>
                <ul className="text-[10px] text-neutral-500 space-y-2 leading-relaxed list-disc pr-4">
                  <li>{lang === "ar" ? "يرجى تحديث بيانات الاتصال ورقم الجوال فور تغيرها لكي نصلك في حالات التوزيع الميداني." : "Update your mobile number to let researchers contact you easily."}</li>
                  <li>{lang === "ar" ? "جميع طلبات الدعم المالي تخضع لبحث اجتماعي شامل وزيارات تفقدية قبل الصرف." : "All financial assistance is subject to home visits."}</li>
                  <li>{lang === "ar" ? "في حال القبول، سيصلك إشعار بالرمز السري لاستلام الدعم التمويني من مركز التوزيع." : "Upon acceptance, you will receive a secure OTP to collect food baskets."}</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: APPLY FOR AID */}
        {activeTab === "apply" && (
          <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm">
            <div className="border-b border-neutral-100 pb-4 mb-6">
              <h2 className="text-sm font-black text-neutral-800 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                <span>{lang === "ar" ? "تقديم طلب مالي / عيني جديد" : "Apply for New Social Aid"}</span>
              </h2>
              <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                يرجى إدخال تفاصيل الحاجة وتوضيح مبررات طلب الدعم بالتفصيل. سيقوم الباحث الاجتماعي المعين بمراجعة ملف الأسرة الوطني والتواصل معك.
              </p>
            </div>

            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">{lang === "ar" ? "نوع الخدمة المطلوبة" : "Type of Assistance"}</label>
                <select
                  value={reqType}
                  onChange={(e) => setReqType(e.target.value)}
                  className="w-full px-4 py-2 text-xs rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                >
                  <option value="food">{lang === "ar" ? "سلة غذائية عينية للأسرة" : "Monthly Food Basket"}</option>
                  <option value="financial">{lang === "ar" ? "مساعدة مالية مقطوعة طارئة" : "Emergency Financial Aid"}</option>
                  <option value="medical">{lang === "ar" ? "توفير مستلزمات طبية وأدوية" : "Medical Support / Medication"}</option>
                  <option value="housing">{lang === "ar" ? "دعم ترميم منزل / سداد إيجار" : "Housing / Rental Support"}</option>
                  <option value="other">{lang === "ar" ? "خدمات أخرى (كفالة، كسوة، تنقل)" : "Other Human Services"}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">{lang === "ar" ? "تفاصيل الطلب ومبررات الاحتياج بالتفصيل" : "Request Details & Justification"}</label>
                <textarea
                  value={reqDetails}
                  onChange={(e) => setReqDetails(e.target.value)}
                  placeholder={lang === "ar" ? "اكتب هنا تفاصيل الدعم المطلوب، عدد الأفراد المتأثرين، أسباب طلب المساعدة (مثال: تقارير طبية، انتهاء العقد، الدخل المحدود) لمساعدتنا في الإسراع بالدراسة الميدانية بالعسيلة." : "Explain your request here, listing families size, monthly income, medical status, or emergency reasons..."}
                  rows={6}
                  className="w-full px-4 py-3 text-xs rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none leading-relaxed"
                />
              </div>

              <div className="bg-neutral-50 border border-neutral-200 p-4 rounded-xl">
                <h4 className="text-[11px] font-bold text-neutral-700 mb-2">{lang === "ar" ? "المستندات الثبوتية المطلوبة (يتم تسليمها للباحث الميداني):" : "Required documents (To be handed to the field agent)"}</h4>
                <ul className="text-[10px] text-neutral-500 space-y-1 list-disc pr-4">
                  <li>{lang === "ar" ? "نسخة من سجل الأسرة الوطني أو صك الإعالة الشرعي" : "Copy of family book."}</li>
                  <li>{lang === "ar" ? "إثبات سكن بمخطط العسيلة (عقد إيجار إلكتروني نشط أو فاتورة كهرباء)" : "Proof of address in Al-Asilah."}</li>
                  <li>{lang === "ar" ? "مشهد بالدخل الشهري أو التقارير الطبية المعتمدة للطلب الطبي" : "Income statements or certified medical reports."}</li>
                </ul>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("portal")}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-bold text-xs transition-all cursor-pointer"
                >
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-300 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{lang === "ar" ? "تقديم الطلب للتدقيق" : "Submit for auditing"}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: REQUESTS HISTORY */}
        {activeTab === "history" && (
          <div className="space-y-6">
            {/* Aid Requests Archive */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm">
              <div className="border-b border-neutral-100 pb-3 mb-4 flex items-center justify-between">
                <h2 className="text-sm font-black text-neutral-800 flex items-center gap-1.5">
                  <ClipboardList className="w-5 h-5 text-emerald-600" />
                  <span>{lang === "ar" ? "أرشيف وتاريخ طلبات المساعدات السابقة" : "Historical Aid Requests"}</span>
                </h2>
                <span className="text-xs text-neutral-400 font-semibold">
                  {myRequests.length} {lang === "ar" ? "طلب مسجل" : "Requests"}
                </span>
              </div>

              {myRequests.length === 0 ? (
                <div className="text-center py-12 text-neutral-400">
                  {lang === "ar" ? "لم تقم بتقديم أي طلب مساعدة مسبقاً." : "No previous applications in your history."}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-right border-collapse">
                    <thead>
                      <tr className="bg-neutral-50 text-neutral-500 border-b border-neutral-100">
                        <th className="p-3 font-bold">{lang === "ar" ? "رقم المعاملة" : "Request ID"}</th>
                        <th className="p-3 font-bold">{lang === "ar" ? "التاريخ" : "Date"}</th>
                        <th className="p-3 font-bold">{lang === "ar" ? "نوع المساعدة" : "Type"}</th>
                        <th className="p-3 font-bold">{lang === "ar" ? "تفاصيل" : "Details"}</th>
                        <th className="p-3 font-bold">{lang === "ar" ? "حالة المعاملة" : "Status"}</th>
                        <th className="p-3 font-bold text-center">{lang === "ar" ? "تأكيد الاستلام والتقييم" : "Receipt & Rating"}</th>
                        <th className="p-3 font-bold text-left">{lang === "ar" ? "إجراءات" : "Actions"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myRequests.map(req => {
                        const isDelivered = req.status === "completed" || req.status === "approved" || req.beneficiaryConfirmedReceipt;
                        return (
                          <tr key={req.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                            <td className="p-3 font-mono text-neutral-400">{req.id}</td>
                            <td className="p-3 font-mono text-neutral-500">{req.date}</td>
                            <td className="p-3 font-bold text-neutral-800">
                              {req.type === "food" ? "سلة غذائية" : req.type === "financial" ? "دعم مالي" : req.type === "medical" ? "دعم طبي" : req.type === "housing" ? "مسكن" : "أخرى"}
                            </td>
                            <td className="p-3 text-neutral-500 max-w-xs truncate">{req.details}</td>
                            <td className="p-3">{getStatusBadge(req.status)}</td>
                            
                            {/* Receipt Confirmation & Rating Column */}
                            <td className="p-3 text-center">
                              {isDelivered ? (
                                req.isRated ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold border border-emerald-200">
                                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                    <span>{lang === "ar" ? "تم التقييم بنجاح" : "Rated"}</span>
                                  </span>
                                ) : req.beneficiaryConfirmedReceipt ? (
                                  <button
                                    onClick={() => handleOpenRatingOnly({
                                      id: req.id,
                                      title: req.details || req.type,
                                      type: req.type === "food" ? "سلة غذائية" : req.type === "financial" ? "دعم مالي" : "مساعدة إنسانية",
                                      date: req.date
                                    })}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer animate-pulse"
                                  >
                                    <Star className="w-3.5 h-3.5 fill-white text-white" />
                                    <span>{lang === "ar" ? "تقييم الخدمة ⭐" : "Rate Service"}</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleConfirmAidReceiptClick({
                                      id: req.id,
                                      title: req.details || req.type,
                                      type: req.type === "food" ? "سلة غذائية" : req.type === "financial" ? "دعم مالي" : "مساعدة إنسانية",
                                      date: req.date
                                    })}
                                    disabled={actionLoadingId === req.id}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                                  >
                                    {actionLoadingId === req.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    )}
                                    <span>{lang === "ar" ? "تم الاستلام ✓" : "Received"}</span>
                                  </button>
                                )
                              ) : (
                                <span className="text-[11px] text-neutral-400">
                                  {lang === "ar" ? "قيد المعالجة" : "In process"}
                                </span>
                              )}
                            </td>

                            <td className="p-3 text-left">
                              <button
                                onClick={() => handlePrintRequest(req)}
                                className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-[10px] font-semibold flex items-center gap-1 inline-flex cursor-pointer"
                              >
                                <Printer className="w-3 h-3" />
                                <span>{lang === "ar" ? "طباعة" : "Print"}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Field Aid Handovers Archive */}
            {myHandovers.length > 0 && (
              <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-4">
                <div className="border-b border-neutral-100 pb-3 flex items-center justify-between">
                  <h2 className="text-sm font-black text-neutral-800 flex items-center gap-1.5">
                    <Package className="w-5 h-5 text-emerald-600" />
                    <span>{lang === "ar" ? "سندات استلام السلال والمساعدات الميدانية" : "Field Aid Handover Records"}</span>
                  </h2>
                  <span className="text-xs text-neutral-400 font-semibold">
                    {myHandovers.length} {lang === "ar" ? "سند استلام" : "Handovers"}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-right border-collapse">
                    <thead>
                      <tr className="bg-neutral-50 text-neutral-500 border-b border-neutral-100">
                        <th className="p-3 font-bold">{lang === "ar" ? "رقم السند" : "Receipt No"}</th>
                        <th className="p-3 font-bold">{lang === "ar" ? "اسم الحملة / التوزيعة" : "Campaign / Distribution"}</th>
                        <th className="p-3 font-bold">{lang === "ar" ? "الصنف المستلم" : "Item"}</th>
                        <th className="p-3 font-bold">{lang === "ar" ? "تاريخ الاستلام" : "Handover Date"}</th>
                        <th className="p-3 font-bold text-center">{lang === "ar" ? "تقييم الخدمة" : "Rating"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myHandovers.map(h => (
                        <tr key={h.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                          <td className="p-3 font-mono text-neutral-400">{h.id}</td>
                          <td className="p-3 font-bold text-neutral-800">{h.distributionTitle}</td>
                          <td className="p-3 text-neutral-600">{h.itemName} ({h.quantity} {h.unit})</td>
                          <td className="p-3 font-mono text-neutral-500">{h.handoverDate}</td>
                          <td className="p-3 text-center">
                            {h.isRated ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                <span>{lang === "ar" ? "تم التقييم بنجاح" : "Rated"}</span>
                              </span>
                            ) : h.beneficiaryConfirmedReceipt ? (
                              <button
                                onClick={() => handleOpenRatingOnly({
                                  id: h.id,
                                  title: h.distributionTitle || h.itemName,
                                  type: h.itemName || "سلة غذائية تموينية",
                                  date: h.handoverDate
                                })}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer animate-pulse"
                              >
                                <Star className="w-3.5 h-3.5 fill-white text-white" />
                                <span>{lang === "ar" ? "تقييم الخدمة ⭐" : "Rate Service"}</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleConfirmAidReceiptClick({
                                  id: h.id,
                                  title: h.distributionTitle || h.itemName,
                                  type: h.itemName || "سلة غذائية تموينية",
                                  date: h.handoverDate
                                })}
                                disabled={actionLoadingId === h.id}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                              >
                                {actionLoadingId === h.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                                <span>{lang === "ar" ? "تم الاستلام ✓" : "Received"}</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PROGRAMS AND INITIATIVES */}
        {activeTab === "initiatives" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm">
              <h2 className="text-sm font-black text-neutral-800 flex items-center gap-1.5 border-b border-neutral-100 pb-3">
                <Users className="w-5 h-5 text-emerald-600" />
                <span>{lang === "ar" ? "مبادرات وخدمات تموينية مستمرة للمستفيدين" : "Active Distribution and Services"}</span>
              </h2>
              <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                تطرح جمعية ريادة العطاء لخدمة الإنسان بالعسيلة برامج اجتماعية وتموينية دورية مخصصة للرعاية الأسرية وخدمة المجتمع المكي.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {/* Fixed Mock Programs for Beneficiaries */}
                <div className="bg-neutral-50 border border-neutral-200/60 rounded-xl p-5 space-y-3">
                  <span className="text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-block">
                    {lang === "ar" ? "برنامج تمويني رائد" : "Food Basket Program"}
                  </span>
                  <h3 className="text-xs font-black text-neutral-800">{lang === "ar" ? "توزيع السلال الرمضانية بالعسيلة 1447" : "Ramadan Food Baskets 1447"}</h3>
                  <p className="text-[11px] text-neutral-500 leading-relaxed">
                    توفير كافة المواد والسلع التموينية الأساسية للأسر المستحقة والمسجلة في مخطط العسيلة بالتنسيق مع باحثي الجمعية.
                  </p>
                  <div className="border-t border-neutral-200/50 pt-3 flex justify-between items-center text-[10px] text-neutral-400">
                    <span>{lang === "ar" ? "المقاعد والكميات المتاحة" : "Limit"}: 500 سلة</span>
                    <strong className="text-emerald-600">{lang === "ar" ? "مستمر حالياً" : "Ongoing"}</strong>
                  </div>
                </div>

                <div className="bg-neutral-50 border border-neutral-200/60 rounded-xl p-5 space-y-3">
                  <span className="text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-block">
                    {lang === "ar" ? "برنامج كسوة وملابس" : "Winter Clothes"}
                  </span>
                  <h3 className="text-xs font-black text-neutral-800">{lang === "ar" ? "كسوة الشتاء لعام 2026 للأسر المسجلة" : "Winter Clothes Distribution"}</h3>
                  <p className="text-[11px] text-neutral-500 leading-relaxed">
                    تأمين الكسوة الشتوية لجميع أطفال الأسر المستفيدة، بهدف سد الحاجات الأساسية وتخفيف الأعباء المعيشية بالعسيلة.
                  </p>
                  <div className="border-t border-neutral-200/50 pt-3 flex justify-between items-center text-[10px] text-neutral-400">
                    <span>{lang === "ar" ? "المستهدف" : "Target"}: 120 أسرة</span>
                    <strong className="text-amber-600">{lang === "ar" ? "قيد التدقيق" : "Planning"}</strong>
                  </div>
                </div>

                <div className="bg-neutral-50 border border-neutral-200/60 rounded-xl p-5 space-y-3">
                  <span className="text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-block">
                    {lang === "ar" ? "رعاية صحية وتوعية" : "Health Care Service"}
                  </span>
                  <h3 className="text-xs font-black text-neutral-800">{lang === "ar" ? "برنامج الفحص الطبي الشامل المجاني" : "Free Comprehensive Medical Checkup"}</h3>
                  <p className="text-[11px] text-neutral-500 leading-relaxed">
                    فحوصات طبية دورية وصرف الأدوية المزمنة للمستفيدين كبار السن بمقر عيادة الجمعية بالعسيلة بالتنسيق مع فريق الإسعافات الطبي.
                  </p>
                  <div className="border-t border-neutral-200/50 pt-3 flex justify-between items-center text-[10px] text-neutral-400">
                    <span>{lang === "ar" ? "المقاعد والكميات المتاحة" : "Limit"}: 100 مستفيد</span>
                    <strong className="text-emerald-600">{lang === "ar" ? "نشط ومتاح" : "Active"}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: MY PROFILE */}
        {activeTab === "profile" && (
          <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm">
            <div className="border-b border-neutral-100 pb-4 mb-6">
              <h2 className="text-sm font-black text-neutral-800 flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-600" />
                <span>{lang === "ar" ? "الملف الشخصي وإدارة بيانات المستفيد" : "My Profile and Personal Settings"}</span>
              </h2>
              <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                يمكنك تحديث بيانات الجوال والبريد الإلكتروني وحجم الأسرة لكي يتم تحديث قاعدة بيانات الباحثين تلقائياً.
              </p>
            </div>

            <form onSubmit={handleUpdateProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">{lang === "ar" ? "الاسم الرباعي الكامل (ثابت)" : "Full Name (Read-only)"}</label>
                  <input
                    type="text"
                    value={beneficiary.name}
                    disabled
                    className="w-full px-4 py-2 text-xs rounded-xl border border-neutral-200 bg-neutral-100 text-neutral-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">{lang === "ar" ? "رقم الهوية الوطنية (ثابت)" : "National ID (Read-only)"}</label>
                  <input
                    type="text"
                    value={beneficiary.nationalId}
                    disabled
                    className="w-full px-4 py-2 text-xs rounded-xl border border-neutral-200 bg-neutral-100 text-neutral-500 font-mono outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">{lang === "ar" ? "رقم الجوال الفعال" : "Mobile Phone"}</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full px-4 py-2 text-xs rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-mono text-left"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">{lang === "ar" ? "البريد الإلكتروني" : "Email Address"}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2 text-xs rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-mono text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">{lang === "ar" ? "عدد أفراد الأسرة المسجلين بالصك" : "Number of Family Members"}</label>
                  <input
                    type="number"
                    value={familySize}
                    onChange={(e) => setFamilySize(Number(e.target.value))}
                    min={1}
                    required
                    className="w-full px-4 py-2 text-xs rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">{lang === "ar" ? "عنوان وتفاصيل السكن الدقيق بالعسيلة" : "Detailed Address in Al-Asilah"}</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                    placeholder={lang === "ar" ? "مثال: مكة المكرمة - العسيلة - الشارع التجاري" : "Mecca, Al-Asilah Scheme..."}
                    className="w-full px-4 py-2 text-xs rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-neutral-100">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-300 text-white rounded-xl font-bold text-xs transition-all cursor-pointer"
                >
                  {lang === "ar" ? "حفظ وتعديل البيانات الشخصية" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>

      {/* Post-Receipt Service Rating Modal */}
      {ratingModalOpen && selectedAidToRate && (
        <BeneficiaryRatingModal
          isOpen={ratingModalOpen}
          onClose={() => {
            setRatingModalOpen(false);
            setSelectedAidToRate(null);
          }}
          aidItem={selectedAidToRate}
          beneficiary={{
            id: beneficiary.id,
            name: beneficiary.name,
            nationalId: beneficiary.nationalId,
            phone: beneficiary.phone
          }}
          onSubmit={async (ratingData) => {
            if (onSubmitBeneficiaryRating) {
              return await onSubmitBeneficiaryRating(ratingData);
            }
            return true;
          }}
          lang={lang}
        />
      )}
    </div>
  );
}
