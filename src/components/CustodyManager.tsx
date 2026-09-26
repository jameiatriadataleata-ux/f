import React, { useState, useEffect, useRef } from "react";
import { 
  Shield, Package, UserCheck, Calendar, Search, Filter, Plus, RefreshCw, 
  Printer, CheckCircle, AlertTriangle, Clock, Mail, RotateCcw, Eye, FileText, 
  X, Check, AlertCircle, Sparkles, Send, ShieldCheck, QrCode
} from "lucide-react";
import { ElectronicCustody, CustodyHistoryItem, Volunteer } from "../types";

interface CustodyManagerProps {
  volunteers?: Volunteer[];
  currentUser?: any;
  logoUrl?: string;
  associationName?: string;
}

export const CustodyManager: React.FC<CustodyManagerProps> = ({
  volunteers = [],
  currentUser,
  logoUrl = "/logo.png",
  associationName = "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة"
}) => {
  const [custodies, setCustodies] = useState<ElectronicCustody[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [recipientTypeFilter, setRecipientTypeFilter] = useState<string>("all");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedCustody, setSelectedCustody] = useState<ElectronicCustody | null>(null);

  // Form states for Add Custody
  const [formData, setFormData] = useState({
    recipientName: "",
    recipientType: "volunteer" as ElectronicCustody["recipientType"],
    recipientIdNumber: "",
    recipientEmail: "",
    recipientPhone: "",
    itemName: "",
    itemCategory: "أجهزة تقنية وإلكترونية",
    description: "",
    quantity: 1,
    serialNumber: "",
    conditionOnDelivery: "ممتازة (جديدة)",
    deliveryDate: new Date().toISOString().split("T")[0],
    expectedReturnDate: "",
    notes: "",
    adminName: currentUser?.name || "مسؤول العهد والمستودع"
  });

  // Form state for Return Custody
  const [returnData, setReturnData] = useState({
    returnDate: new Date().toISOString().split("T")[0],
    conditionOnReturn: "جيدة",
    returnNotes: "",
    adminName: currentUser?.name || "مسؤول العهد والمستودع"
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Fetch custodies from server
  const fetchCustodies = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/db/custodies");
      if (res.ok) {
        const data = await res.json();
        setCustodies(data);
      }
    } catch (err) {
      console.error("Failed to load custodies", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustodies();
  }, []);

  const handleSelectVolunteer = (volId: string) => {
    const vol = volunteers.find(v => v.id === volId);
    if (vol) {
      setFormData(prev => ({
        ...prev,
        recipientName: vol.name,
        recipientType: "volunteer",
        recipientIdNumber: vol.membershipNumber || "",
        recipientEmail: vol.email || "",
        recipientPhone: vol.phone || ""
      }));
    }
  };

  // Submit New Custody
  const handleCreateCustody = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.recipientName.trim() || !formData.itemName.trim()) {
      setErrorMessage("يرجى ملء اسم المستلم واسم العهدة.");
      return;
    }

    try {
      setActionLoading(true);
      setErrorMessage(null);
      const res = await fetch("/api/db/custodies/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        const result = await res.json();
        setCustodies(result.custodies || []);
        setShowAddModal(false);
        setSuccessMessage("تم تسليم العهدة الإلكترونية وإنشاء السند بنجاح!");
        setTimeout(() => setSuccessMessage(null), 4000);
        // Reset form
        setFormData({
          recipientName: "",
          recipientType: "volunteer",
          recipientIdNumber: "",
          recipientEmail: "",
          recipientPhone: "",
          itemName: "",
          itemCategory: "أجهزة تقنية وإلكترونية",
          description: "",
          quantity: 1,
          serialNumber: "",
          conditionOnDelivery: "ممتازة (جديدة)",
          deliveryDate: new Date().toISOString().split("T")[0],
          expectedReturnDate: "",
          notes: "",
          adminName: currentUser?.name || "مسؤول العهد والمستودع"
        });
      } else {
        const err = await res.json();
        setErrorMessage(err.error || "تعذر تسليم العهدة.");
      }
    } catch (err) {
      setErrorMessage("حدث خطأ أثناء الاتصال بالخادم.");
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Custody Return
  const handleReturnCustody = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustody) return;

    try {
      setActionLoading(true);
      setErrorMessage(null);
      const res = await fetch("/api/db/custodies/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          custodyId: selectedCustody.id,
          ...returnData
        })
      });

      if (res.ok) {
        const result = await res.json();
        setCustodies(result.custodies || []);
        setShowReturnModal(false);
        setSelectedCustody(null);
        setSuccessMessage("تم تسجيل استرجاع العهدة وإغلاق السند بنجاح!");
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        const err = await res.json();
        setErrorMessage(err.error || "تعذر استرجاع العهدة.");
      }
    } catch (err) {
      setErrorMessage("حدث خطأ أثناء الاتصال بالخادم.");
    } finally {
      setActionLoading(false);
    }
  };

  // Resend Email Notification
  const handleResendEmail = async (custody: ElectronicCustody) => {
    try {
      setActionLoading(true);
      const res = await fetch("/api/db/custodies/resend-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ custodyId: custody.id })
      });

      if (res.ok) {
        const result = await res.json();
        setCustodies(result.custodies || []);
        setSuccessMessage(`تم إرسال إشعار العهدة إلى البريد: ${custody.recipientEmail}`);
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Print Handover Form
  const handlePrint = () => {
    window.print();
  };

  // Filtered Custodies
  const filteredCustodies = custodies.filter(c => {
    const matchesSearch = 
      c.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.custodyCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.recipientPhone && c.recipientPhone.includes(searchQuery)) ||
      (c.serialNumber && c.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesType = recipientTypeFilter === "all" || c.recipientType === recipientTypeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Stats calculation
  const totalCount = custodies.length;
  const activeCount = custodies.filter(c => c.status === "delivered").length;
  const returnedCount = custodies.filter(c => c.status === "returned").length;
  const maintenanceCount = custodies.filter(c => c.status === "under_maintenance" || c.status === "damaged").length;

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      {/* Top Banner & Stats */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 rounded-xl">
                <Shield className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">نظام إدارة العهد الإلكترونية</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              توثيق ومتابعة العهد والأجهزة والمعدات المسلمة للمتطوعين والموظفين مع محاضر تسليم رسمية وإشعارات فورية
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchCustodies}
              disabled={loading}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>تحديث</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>تسليم عهدة جديدة</span>
            </button>
          </div>
        </div>

        {/* Notifications / Alerts */}
        {successMessage && (
          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-bold animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-2 text-rose-800 dark:text-rose-300 text-xs font-bold animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block">إجمالي العهد المسجلة</span>
              <strong className="text-xl font-black text-slate-800 dark:text-slate-100 font-mono mt-0.5 block">{totalCount}</strong>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-200/70 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
              <Package className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold block">العهد النشطة (قيد الاستخدام)</span>
              <strong className="text-xl font-black text-emerald-700 dark:text-emerald-300 font-mono mt-0.5 block">{activeCount}</strong>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/40 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-blue-700 dark:text-blue-400 font-bold block">العهد المسترجعة والمغلقة</span>
              <strong className="text-xl font-black text-blue-700 dark:text-blue-300 font-mono mt-0.5 block">{returnedCount}</strong>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/60 flex items-center justify-center text-blue-700 dark:text-blue-400">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-100 dark:border-amber-900/40 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-amber-700 dark:text-amber-400 font-bold block">قيد الصيانة / متضررة</span>
              <strong className="text-xl font-black text-amber-700 dark:text-amber-300 font-mono mt-0.5 block">{maintenanceCount}</strong>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          <input
            type="text"
            placeholder="بحث برقم العهدة، اسم المستلم، اسم الجهاز، السيريال، أو رقم الجوال..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
            <Filter className="w-3.5 h-3.5 text-emerald-600" />
            <span>الحالة:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none outline-none font-bold text-xs cursor-pointer text-slate-800 dark:text-slate-200"
            >
              <option value="all">جميع الحالات</option>
              <option value="delivered">نشطة (قيد الاستخدام)</option>
              <option value="returned">مسترجعة ومغلقة</option>
              <option value="under_maintenance">تحت الصيانة</option>
              <option value="damaged">تالفة</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
            <span>صفة المستلم:</span>
            <select
              value={recipientTypeFilter}
              onChange={(e) => setRecipientTypeFilter(e.target.value)}
              className="bg-transparent border-none outline-none font-bold text-xs cursor-pointer text-slate-800 dark:text-slate-200"
            >
              <option value="all">جميع المستلمين</option>
              <option value="volunteer">متطوع</option>
              <option value="employee">موظف</option>
              <option value="leader">قائد فريق</option>
              <option value="authorized_user">مستخدم مصرح</option>
            </select>
          </div>
        </div>
      </div>

      {/* Custodies Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                <th className="p-3.5">كود العهدة</th>
                <th className="p-3.5">العهدة والمواصفات</th>
                <th className="p-3.5">المستلم والصفة</th>
                <th className="p-3.5">تاريخ التسليم / الإرجاع</th>
                <th className="p-3.5 text-center">حالة العهدة</th>
                <th className="p-3.5 text-center">إشعار البريد</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCustodies.length > 0 ? (
                filteredCustodies.map((custody) => {
                  const isDelivered = custody.status === "delivered";
                  const isReturned = custody.status === "returned";

                  return (
                    <tr key={custody.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-slate-700 dark:text-slate-300">
                        <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-[11px] border border-slate-200 dark:border-slate-700 block w-fit">
                          {custody.custodyCode}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          <span className="font-black text-slate-900 dark:text-white block">{custody.itemName}</span>
                          <span className="text-[10.5px] text-slate-400 block">{custody.itemCategory} • الكمية: <b>{custody.quantity}</b></span>
                          {custody.serialNumber && (
                            <span className="text-[10px] text-slate-400 font-mono block">الرقم التسلسلي: {custody.serialNumber}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-800 dark:text-slate-200 block">{custody.recipientName}</span>
                          <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500 dark:text-slate-400">
                            <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 rounded font-semibold text-[10px]">
                              {custody.recipientType === "volunteer" ? "متطوع" :
                               custody.recipientType === "employee" ? "موظف" :
                               custody.recipientType === "leader" ? "قائد فريق" : "مصرح له"}
                            </span>
                            {custody.recipientPhone && <span>• {custody.recipientPhone}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono">
                        <span className="text-slate-700 dark:text-slate-300 block text-[11px]">تسليم: {custody.deliveryDate}</span>
                        {custody.expectedReturnDate && isDelivered && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 block mt-0.5">
                            استحقاق: {custody.expectedReturnDate}
                          </span>
                        )}
                        {custody.actualReturnDate && isReturned && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-0.5">
                            استرجعت: {custody.actualReturnDate}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10.5px] font-bold ${
                          custody.status === "delivered" 
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                            : custody.status === "returned"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                            : custody.status === "under_maintenance"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                        }`}>
                          {custody.status === "delivered" ? "قيد الاستخدام" :
                           custody.status === "returned" ? "مسترجعة ومغلقة" :
                           custody.status === "under_maintenance" ? "تحت الصيانة" : "تالفة"}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            custody.emailStatus === "sent" || custody.emailStatus === "resent"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          }`}>
                            <Mail className="w-3 h-3" />
                            <span>{custody.emailStatus === "sent" || custody.emailStatus === "resent" ? "تم الإرسال" : "غير مفعل"}</span>
                          </span>
                          {custody.recipientEmail && (
                            <button
                              onClick={() => handleResendEmail(custody)}
                              className="text-[9.5px] text-slate-400 hover:text-emerald-600 underline cursor-pointer"
                              title="إعادة إرسال الإشعار"
                            >
                              إعادة الإرسال
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Print Handover Receipt */}
                          <button
                            onClick={() => {
                              setSelectedCustody(custody);
                              setShowPrintModal(true);
                            }}
                            className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                            title="عرض وطباعة محضر التسليم الرسمي"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* View History */}
                          <button
                            onClick={() => {
                              setSelectedCustody(custody);
                              setShowHistoryModal(true);
                            }}
                            className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                            title="سجل الحركات والتتبع"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>

                          {/* Return Custody action */}
                          {isDelivered && (
                            <button
                              onClick={() => {
                                setSelectedCustody(custody);
                                setShowReturnModal(true);
                              }}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:hover:bg-amber-900 dark:text-amber-300 font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                              title="استرجاع العهدة وإغلاق السند"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>استرجاع</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                    لا توجد عهد إلكترونية مسجلة مطابقة لمعايير البحث.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ----------------- MODALS ----------------- */}

      {/* 1. Add New Custody Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base">تسليم عهدة إلكترونية جديدة</h3>
                  <p className="text-[11px] text-slate-400">إنشاء محضر تسليم رسمي وإرسال إشعار للمستلم</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustody} className="space-y-4 text-xs">
              {/* Quick Select Volunteer */}
              {volunteers.length > 0 && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block">اختيار سريع لمتطوع مسجل بالجمعية:</span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) handleSelectVolunteer(e.target.value);
                    }}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                    defaultValue=""
                  >
                    <option value="">-- أو كتابة بيانات المستلم يدوياً بالأسفل --</option>
                    {volunteers.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.membershipNumber || "عضوية"}) • {v.phone}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Recipient Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">اسم المستلم الكامل *</label>
                  <input
                    type="text"
                    required
                    value={formData.recipientName}
                    onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    placeholder="الاسم الرباعي للمستلم"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">الصفة أو نوع الحساب</label>
                  <select
                    value={formData.recipientType}
                    onChange={(e) => setFormData({ ...formData, recipientType: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="volunteer">متطوع</option>
                    <option value="employee">موظف رسمي</option>
                    <option value="leader">قائد فريق ميداني</option>
                    <option value="authorized_user">مستخدم مصرح</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">رقم الهوية الوطنية / العضوية</label>
                  <input
                    type="text"
                    value={formData.recipientIdNumber}
                    onChange={(e) => setFormData({ ...formData, recipientIdNumber: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                    placeholder="10XXXXXXXX"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">رقم الجوال</label>
                  <input
                    type="text"
                    value={formData.recipientPhone}
                    onChange={(e) => setFormData({ ...formData, recipientPhone: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                    placeholder="05XXXXXXXX"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">البريد الإلكتروني (لاستلام السند الإلكتروني)</label>
                  <input
                    type="email"
                    value={formData.recipientEmail}
                    onChange={(e) => setFormData({ ...formData, recipientEmail: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    placeholder="user@example.com"
                  />
                </div>
              </div>

              {/* Item Details */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">اسم العهدة أو الجهاز *</label>
                  <input
                    type="text"
                    required
                    value={formData.itemName}
                    onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    placeholder="مثال: جهاز لاسلكي ميداني موترولا، كاميرا احترافية، جهاز لوحي iPad..."
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">التصنيف</label>
                  <input
                    type="text"
                    value={formData.itemCategory}
                    onChange={(e) => setFormData({ ...formData, itemCategory: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    placeholder="أجهزة تقنية، معدات تنظيم، حقائب إسعافية..."
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">الرقم التسلسلي / الباركود</label>
                  <input
                    type="text"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                    placeholder="S/N: 8849202"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">الكمية</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">حالة العهدة عند التسليم</label>
                  <select
                    value={formData.conditionOnDelivery}
                    onChange={(e) => setFormData({ ...formData, conditionOnDelivery: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="ممتازة (جديدة)">ممتازة (جديدة بالكرتون)</option>
                    <option value="جيدة جداً">جيدة جداً وبحالة تشغيل كاملة</option>
                    <option value="جيدة (مستعملة)">جيدة (مستعملة بحالة سليمة)</option>
                    <option value="بها خدوش طفيفة">بها خدوش طفيفة لا تؤثر على العمل</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">تاريخ التسليم</label>
                  <input
                    type="date"
                    value={formData.deliveryDate}
                    onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">تاريخ الإرجاع المتوقع (اختياري)</label>
                  <input
                    type="date"
                    value={formData.expectedReturnDate}
                    onChange={(e) => setFormData({ ...formData, expectedReturnDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">ملاحظات أو مواصفات العهدة</label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl resize-none"
                    placeholder="مرفقات العهدة (شاحن، حقيبة، كابلات...)، الغرض من الاستخدام..."
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-xl cursor-pointer shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{actionLoading ? "جاري الحفظ..." : "اعتماد وتسليم العهدة الإلكترونية"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Return Custody Modal */}
      {showReturnModal && selectedCustody && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-700 dark:text-amber-400">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base">استرجاع العهدة وإغلاق السند</h3>
                  <p className="text-[11px] text-slate-400">كود العهدة: {selectedCustody.custodyCode}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowReturnModal(false);
                  setSelectedCustody(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReturnCustody} className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                <span className="text-[11px] text-slate-400 block">العهدة المسترجعة:</span>
                <strong className="text-slate-900 dark:text-white block text-sm">{selectedCustody.itemName}</strong>
                <span className="text-slate-500 text-[11px] block">المستلم: {selectedCustody.recipientName} ({selectedCustody.recipientPhone || "بدون جوال"})</span>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">تاريخ الاسترجاع الفعلي *</label>
                <input
                  type="date"
                  required
                  value={returnData.returnDate}
                  onChange={(e) => setReturnData({ ...returnData, returnDate: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">حالة العهدة عند الاسترجاع *</label>
                <select
                  value={returnData.conditionOnReturn}
                  onChange={(e) => setReturnData({ ...returnData, conditionOnReturn: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  <option value="ممتازة">سليمة وممتازة كحالتها عند التسليم</option>
                  <option value="جيدة">بحالة جيدة وتعمل بصورة طبيعية</option>
                  <option value="تحتاج صيانة">بها عطل وتحتاج إلى صيانة مستودعية</option>
                  <option value="تالفة / مفقودة أجزاء">تالفة أو مفقود جزء من ملحقاتها</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">ملاحظات الاسترجاع والفحص</label>
                <textarea
                  rows={3}
                  value={returnData.returnNotes}
                  onChange={(e) => setReturnData({ ...returnData, returnNotes: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl resize-none"
                  placeholder="تم فحص الجهاز وملحقاته والتأكد من سلامته وإعادته للرف المخصص..."
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl cursor-pointer shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{actionLoading ? "جاري الإغلاق..." : "تأكيد استرجاع العهدة وإغلاق السند"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowReturnModal(false);
                    setSelectedCustody(null);
                  }}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Official Printable Handover Document (محضر تسليم عهدة رسمي) */}
      {showPrintModal && selectedCustody && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-8 shadow-2xl text-slate-900 space-y-6 print:p-0 print:shadow-none print:w-full">
            {/* Header controls for screen only */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-700" />
                <h3 className="font-black text-slate-900 text-base">محضر وسند تسليم عهدة إلكترونية رسمي</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة السند</span>
                </button>
                <button
                  onClick={() => {
                    setShowPrintModal(false);
                    setSelectedCustody(null);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Area */}
            <div ref={printAreaRef} className="space-y-6 text-right p-4 border border-slate-200 rounded-2xl bg-white" dir="rtl">
              {/* Document Header */}
              <div className="flex items-center justify-between border-b-2 border-emerald-800 pb-4">
                <div className="flex items-center gap-4">
                  <img
                    src={logoUrl}
                    alt={associationName}
                    className="w-16 h-16 object-contain"
                    crossOrigin="anonymous"
                  />
                  <div>
                    <h2 className="font-bold text-lg text-emerald-900" style={{ fontFamily: "'Lyon Arabic', 'Amiri', serif" }}>
                      {associationName}
                    </h2>
                    <p className="text-[11px] text-slate-500 font-bold">إدارة العهد والمستودعات والخدمات المساندة</p>
                    <p className="text-[10px] text-slate-400">المملكة العربية السعودية • تصريح رسمي</p>
                  </div>
                </div>

                <div className="text-left font-mono space-y-1">
                  <div className="bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg text-xs font-bold text-emerald-900">
                    {selectedCustody.custodyCode}
                  </div>
                  <span className="text-[10px] text-slate-400 block">تاريخ التحرير: {selectedCustody.deliveryDate}</span>
                </div>
              </div>

              {/* Title Banner */}
              <div className="text-center py-2 bg-emerald-50/70 border-y border-emerald-200">
                <h3 className="text-base font-black text-emerald-950" style={{ fontFamily: "'Lyon Arabic', 'Amiri', serif" }}>
                  محضر تسليم واستلام عهدة مؤقتة
                </h3>
                <span className="text-[10.5px] text-emerald-800">Electronic Custody Handover Document</span>
              </div>

              {/* Recipient Box */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10.5px]">اسم المستلم:</span>
                  <strong className="text-slate-900 text-sm">{selectedCustody.recipientName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10.5px]">الصفة التطوعية / الوظيفية:</span>
                  <strong className="text-slate-800">
                    {selectedCustody.recipientType === "volunteer" ? "متطوع رسمي بالجمعية" :
                     selectedCustody.recipientType === "employee" ? "موظف" :
                     selectedCustody.recipientType === "leader" ? "قائد فريق تطوعي" : "مصرح له"}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10.5px]">رقم الهوية الوطنية / العضوية:</span>
                  <strong className="text-slate-800 font-mono">{selectedCustody.recipientIdNumber || "مسجل بالملف"}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10.5px]">رقم الجوال:</span>
                  <strong className="text-slate-800 font-mono">{selectedCustody.recipientPhone || "غير مسجل"}</strong>
                </div>
              </div>

              {/* Item Specification Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-right">
                  <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">م</th>
                      <th className="p-2.5">بيان العهدة والمواصفات</th>
                      <th className="p-2.5">الرقم التسلسلي / S/N</th>
                      <th className="p-2.5 text-center">الكمية</th>
                      <th className="p-2.5">الحالة عند التسليم</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-2.5 font-bold">1</td>
                      <td className="p-2.5 font-bold text-slate-900">{selectedCustody.itemName}</td>
                      <td className="p-2.5 font-mono text-slate-600">{selectedCustody.serialNumber || "-"}</td>
                      <td className="p-2.5 text-center font-mono font-bold">{selectedCustody.quantity}</td>
                      <td className="p-2.5 text-emerald-800 font-bold">{selectedCustody.conditionOnDelivery}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Notes */}
              {selectedCustody.notes && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <span className="font-bold text-slate-700 block mb-0.5">ملاحظات الاستخدام والملحقات:</span>
                  <p className="text-slate-600 leading-relaxed">{selectedCustody.notes}</p>
                </div>
              )}

              {/* Legal Pledge (الإقرار والتعهد) */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                <strong>إقرار وتعهد بالاستلام:</strong> أقر أنا الموقع أدناه بأنني قد استلمت العهدة الموضحة بياناتها أعلاه بحالة سليمة وجاهزة للاستخدام، وأتعهد بالمحافظة عليها واستخدامها في الأغراض المخصصة لها فقط، وإعادتها فور انتهاء المهمة أو عند طلب إدارة الجمعية، وأتحمل المسؤولية الكاملة في حال التلف أو الإهمال أو الفقدان.
              </div>

              {/* Signatures Area */}
              <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-200 text-center text-xs">
                <div className="space-y-8">
                  <span className="font-bold text-slate-700 block">المسلّم (مسؤول العهد):</span>
                  <p className="font-bold text-slate-900">{selectedCustody.adminName || "إدارة العهد والمستودع"}</p>
                  <div className="border-t border-dashed border-slate-300 pt-1 text-[10px] text-slate-400">التوقيع والختم</div>
                </div>

                <div className="space-y-8">
                  <span className="font-bold text-slate-700 block">المستلم للعهدة:</span>
                  <p className="font-bold text-slate-900">{selectedCustody.recipientName}</p>
                  <div className="border-t border-dashed border-slate-300 pt-1 text-[10px] text-slate-400">التوقيع والبصمة</div>
                </div>

                <div className="space-y-8">
                  <span className="font-bold text-slate-700 block">اعتماد الإدارة:</span>
                  <p className="font-bold text-emerald-800">معتمد إلكترونياً</p>
                  <div className="border-t border-dashed border-slate-300 pt-1 text-[10px] text-slate-400">الرمز: {selectedCustody.id.substring(0, 8)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. History Timeline Modal */}
      {showHistoryModal && selectedCustody && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base">سجل حركات العهدة</h3>
                  <p className="text-[11px] text-slate-400">{selectedCustody.itemName} • {selectedCustody.custodyCode}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedCustody(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto p-1 text-xs">
              {selectedCustody.history && selectedCustody.history.length > 0 ? (
                selectedCustody.history.map((h, i) => (
                  <div key={h.id || i} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <strong className="text-slate-900 dark:text-white">{h.action}</strong>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(h.timestamp).toLocaleDateString("ar-SA")}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">بواسطة: <b>{h.actor}</b></p>
                      {h.notes && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                          {h.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-slate-400">لا توجد حركات مسجلة إضافية.</div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedCustody(null);
                }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
