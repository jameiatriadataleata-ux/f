import React, { useState } from "react";
import { 
  ShoppingBag, Heart, Droplets, BookOpen, Package, GlassWater, 
  CreditCard, CheckCircle2, QrCode, Printer, ShieldCheck, Sparkles, 
  ArrowLeft, Search, Filter, Lock, Zap, FileText, Check, DollarSign
} from "lucide-react";
import { StoreProject, StoreDonation } from "../types";

interface AssociationStoreProps {
  projects: StoreProject[];
  onDonateSuccess: (donationData: {
    projectId: string;
    amount: number;
    donorName: string;
    donorPhone: string;
    donorEmail?: string;
    paymentMethod: string;
    notes?: string;
  }) => Promise<{ status: string; donation?: StoreDonation; error?: string }>;
  isDark?: boolean;
}

export const AssociationStore: React.FC<AssociationStoreProps> = ({
  projects = [],
  onDonateSuccess,
  isDark = false
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Donation Modal state
  const [selectedProject, setSelectedProject] = useState<StoreProject | null>(null);
  const [donationAmount, setDonationAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>("100");
  const [quantity, setQuantity] = useState<number>(1);
  const [isUnitMode, setIsUnitMode] = useState<boolean>(false);

  // Donor Details
  const [donorName, setDonorName] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<'mada' | 'visa' | 'apple_pay' | 'stc_pay'>('mada');

  // Simulated Payment Card Form
  const [cardNumber, setCardNumber] = useState("4111 2222 3333 4444");
  const [cardHolder, setCardHolder] = useState("ABDULLAH ALMAKKI");
  const [expiryDate, setExpiryDate] = useState("08/28");
  const [cvv, setCvv] = useState("123");

  // Flow status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedDonation, setCompletedDonation] = useState<StoreDonation | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const categories = [
    { id: "all", name: "جميع المشاريع" },
    { id: "سقيا الماء", name: "سقيا الماء", icon: Droplets },
    { id: "توزيع المصاحف", name: "توزيع المصاحف", icon: BookOpen },
    { id: "السلال الغذائية", name: "السلال الغذائية", icon: Package },
    { id: "سقيا ماء زمزم", name: "سقيا ماء زمزم", icon: GlassWater }
  ];

  const filteredProjects = projects.filter(p => {
    const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;
    const matchesSearch = p.titleAr.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.descriptionAr.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const openDonationModal = (project: StoreProject) => {
    setSelectedProject(project);
    const initialPrice = project.unitPrice || 50;
    setDonationAmount(initialPrice);
    setCustomAmount(initialPrice.toString());
    setQuantity(1);
    setIsUnitMode(false);
    setErrorMessage("");
  };

  const handlePresetClick = (amount: number) => {
    setDonationAmount(amount);
    setCustomAmount(amount.toString());
    setIsUnitMode(false);
  };

  const handleCustomAmountChange = (val: string) => {
    setCustomAmount(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setDonationAmount(num);
    }
    setIsUnitMode(false);
  };

  const handleQuantityChange = (delta: number) => {
    if (!selectedProject) return;
    const newQty = Math.max(1, quantity + delta);
    setQuantity(newQty);
    const unitPrice = selectedProject.unitPrice || 10;
    const total = newQty * unitPrice;
    setDonationAmount(total);
    setCustomAmount(total.toString());
    setIsUnitMode(true);
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    if (donationAmount <= 0) {
      setErrorMessage("الرجاء تحديد مبلغ تبرع أسرع أو إدخال مبلغ صحيح");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await onDonateSuccess({
        projectId: selectedProject.id,
        amount: donationAmount,
        donorName: donorName || "فاعل خير",
        donorPhone: donorPhone || "0500000000",
        donorEmail,
        paymentMethod,
        notes
      });

      if (res.status === "success" && res.donation) {
        setCompletedDonation(res.donation);
      } else {
        setErrorMessage(res.error || "حدث خطأ أثناء إتمام التبرع، يرجى المحاولة مرة أخرى.");
      }
    } catch (err: any) {
      setErrorMessage("تعذر الاتصال بخادم بوابة الدفع: " + (err.message || "خطأ غير متوقع"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800'} py-8 px-4 sm:px-6 lg:px-8 dir-rtl font-sans`}>
      {/* Store Header Banner */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white p-8 md:p-12 shadow-xl border border-emerald-700/50">
          <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute right-0 top-0 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 grid md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs sm:text-sm font-semibold">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                متجر جمعية ريادة العطاء لخدمة الإنسان بالعسيلة (ترخيص رقم: 5081)
              </div>
              <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
                ساهم في صناعة الأثر.. وشاركنا الأجر بمكة المكرمة
              </h1>
              <p className="text-slate-200 text-sm sm:text-base leading-relaxed max-w-2xl">
                بوابة التبرع المباشرة والآمنة 100%. يتم ربط كل تبرع تلقائياً وحظياً بالحساب المالي المستقل للمشروع وإدارة المشاريع والإدارة المالية دون أي تدخل يدوي.
              </p>

              <div className="flex flex-wrap items-center gap-6 pt-2 text-xs sm:text-sm text-emerald-100 font-medium">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>ربط مالي وآني معتمد</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-400" />
                  <span>تخصيص كامل 100% للمشروع</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-emerald-400" />
                  <span>إيصال تبرع فوري موثق</span>
                </div>
              </div>
            </div>

            <div className="md:col-span-4 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/15 text-center space-y-3">
              <p className="text-xs text-emerald-200 font-medium">إحصائيات المتجر الإلكتروني المباشر</p>
              <div className="text-3xl font-extrabold text-amber-300">
                {(projects.reduce((acc, p) => acc + (p.raisedAmount || 0), 0)).toLocaleString("ar-SA")} <span className="text-sm text-white font-normal">ريال</span>
              </div>
              <p className="text-xs text-slate-200">إجمالي التبرعات المجمعة للمشاريع الحالية</p>
              <div className="pt-2 border-t border-white/10 flex justify-between text-xs text-emerald-100">
                <span>المشاريع المتاحة: <strong className="text-white">{projects.length}</strong></span>
                <span>المتبرعين: <strong className="text-white">{projects.reduce((acc, p) => acc + (p.donationCount || 0), 0)}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="max-w-7xl mx-auto mb-8 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          {/* Categories */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500"
                      : isDark
                      ? "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-sm"
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute right-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث عن مشروع..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pr-10 pl-4 py-2.5 rounded-xl text-xs sm:text-sm outline-none transition-all ${
                isDark 
                  ? "bg-slate-800 border-slate-700 text-white focus:border-emerald-500"
                  : "bg-white border-slate-200 text-slate-900 focus:border-emerald-500 shadow-sm"
              } border`}
            />
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="max-w-7xl mx-auto">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8">
            <ShoppingBag className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">لا توجد مشاريع مطابقة</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">جرب تغيير تصنيف البحث أو كلمة البحث</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProjects.map((project) => {
              const target = project.targetAmount || 1;
              const raised = project.raisedAmount || 0;
              const percentage = Math.min(100, Math.round((raised / target) * 100));

              return (
                <div
                  key={project.id}
                  className={`rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between ${
                    isDark
                      ? "bg-slate-800 border-slate-700 hover:border-emerald-500/50"
                      : "bg-white border-slate-200 hover:border-emerald-400 shadow-sm"
                  } border`}
                >
                  <div>
                    {/* Project Image */}
                    <div className="relative h-48 w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
                      <img
                        src={project.imageUrl}
                        alt={project.titleAr}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                      <div className="absolute top-3 right-3 bg-emerald-600/90 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg shadow-sm">
                        {project.category}
                      </div>

                      <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md text-slate-200 text-[10px] font-mono px-2 py-0.5 rounded border border-slate-700">
                        حساب: {project.accountCode}
                      </div>
                    </div>

                    {/* Project Info */}
                    <div className="p-5 space-y-3">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                        {project.titleAr}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {project.descriptionAr}
                      </p>

                      {/* Progress Bar */}
                      <div className="pt-2 space-y-1.5">
                        <div className="flex justify-between items-center text-xs font-semibold">
                          <span className="text-slate-500 dark:text-slate-400">المكتمل: {percentage}%</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            {raised.toLocaleString("ar-SA")} / {target.toLocaleString("ar-SA")} ريال
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Donate Quick Action */}
                  <div className="p-5 pt-0 mt-auto">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-3 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                      <span>سعر الوحدة: <strong>{project.unitPrice || 10} ريال</strong></span>
                      <span>التبرعات: <strong>{project.donationCount || 0}</strong></span>
                    </div>

                    <button
                      onClick={() => openDonationModal(project)}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
                    >
                      <Heart className="w-4 h-4 fill-white/20" />
                      <span>تبرع الآن لهذا المشروع</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Checkout Donation Modal */}
      {selectedProject && !completedDonation && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className={`w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden my-8 ${isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'} border border-slate-200 dark:border-slate-700 dir-rtl`}>
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white p-6 relative">
              <button
                onClick={() => setSelectedProject(null)}
                className="absolute left-5 top-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                ✕
              </button>

              <div className="flex items-center gap-3 mb-2">
                <span className="bg-emerald-500/30 text-emerald-200 text-xs px-2.5 py-0.5 rounded-md border border-emerald-400/30 font-mono">
                  كود الحساب: {selectedProject.accountCode}
                </span>
                <span className="text-xs text-emerald-100">ربط مالي وآني مباشر</span>
              </div>
              <h2 className="text-xl font-bold">{selectedProject.titleAr}</h2>
              <p className="text-xs text-emerald-100 mt-1">
                تأكيد التبرع للمشروع وتسجيل العملية في الحساب المالي المخصص فوراً.
              </p>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleProcessPayment} className="p-6 space-y-6">

              {/* 1. Select Amount or Units */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    حدد مبلغ التبرع (ريال سعودي)
                  </label>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    سعر الوحدة الواحدة: {selectedProject.unitPrice || 10} ريال
                  </span>
                </div>

                {/* Preset Options */}
                <div className="grid grid-cols-4 gap-2">
                  {[20, 50, 100, 500].map((amt) => (
                    <button
                      type="button"
                      key={amt}
                      onClick={() => handlePresetClick(amt)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                        donationAmount === amt && !isUnitMode
                          ? "bg-emerald-600 text-white ring-2 ring-emerald-500 shadow-sm"
                          : isDark
                          ? "bg-slate-700 text-slate-200 hover:bg-slate-600"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {amt} ريال
                    </button>
                  ))}
                </div>

                {/* Custom Amount or Unit Quantity */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">مبلغ مخصص:</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        value={customAmount}
                        onChange={(e) => handleCustomAmountChange(e.target.value)}
                        className={`w-full py-2 px-3 pl-12 rounded-xl text-xs font-bold outline-none ${
                          isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                        } border`}
                        placeholder="أدخل المبلغ"
                      />
                      <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">ر.س</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">تبرع بالوحدات / الأسهم:</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(-1)}
                        className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-lg hover:bg-slate-300 flex items-center justify-center"
                      >
                        -
                      </button>
                      <span className="flex-1 text-center py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs rounded-xl border border-emerald-200 dark:border-emerald-800">
                        {quantity} {selectedProject.category === "سقيا الماء" ? "كرتون" : "وحدة"} ({quantity * (selectedProject.unitPrice || 10)} ر.س)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(1)}
                        className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-lg hover:bg-slate-300 flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Donation Banner */}
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-600 dark:text-slate-400 block">إجمالي مبلغ التبرع الإجمالي:</span>
                  <span className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300">
                    {donationAmount.toLocaleString("ar-SA")} ريال سعودي
                  </span>
                </div>
                <div className="text-left text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  شامل كافة الرسوم والوثائق
                </div>
              </div>

              {/* 2. Donor Info */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">بيانات المتبرع (اختياري للإيصال)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="الاسم الكامل (أو اترك فارغاً كفاعل خير)"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    className={`py-2 px-3 rounded-xl text-xs outline-none ${
                      isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                    } border`}
                  />
                  <input
                    type="tel"
                    placeholder="رقم الجوال (لاستلام إيصال الواتساب)"
                    value={donorPhone}
                    onChange={(e) => setDonorPhone(e.target.value)}
                    className={`py-2 px-3 rounded-xl text-xs outline-none ${
                      isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                    } border`}
                  />
                </div>
              </div>

              {/* 3. Payment Methods */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  اختر وسيلة الدفع الإلكتروني المعتمدة:
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'mada', name: 'مدى (Mada)', icon: CreditCard, color: 'border-emerald-500' },
                    { id: 'visa', name: 'فيزا / ماستركارد', icon: CreditCard, color: 'border-blue-500' },
                    { id: 'apple_pay', name: 'Apple Pay', icon: Zap, color: 'border-slate-900' },
                    { id: 'stc_pay', name: 'STC Pay', icon: DollarSign, color: 'border-purple-500' }
                  ].map((method) => {
                    const isSelected = paymentMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setPaymentMethod(method.id as any)}
                        className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                          isSelected
                            ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-600 ring-2 ring-emerald-500 text-emerald-800 dark:text-emerald-200 font-bold"
                            : isDark
                            ? "bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <method.icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-[11px]">{method.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Simulated Card Details if Mada/Visa */}
                {(paymentMethod === 'mada' || paymentMethod === 'visa') && (
                  <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3">
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">محاكي بوابات الدفع (Mada / Visa Secure)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">رقم البطاقة:</label>
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          className="w-full py-1.5 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">اسم حامل البطاقة:</label>
                        <input
                          type="text"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          className="w-full py-1.5 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">تاريخ الانتهاء:</label>
                        <input
                          type="text"
                          value={expiryDate}
                          onChange={(e) => setExpiryDate(e.target.value)}
                          className="w-full py-1.5 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">رمز الأمان (CVV):</label>
                        <input
                          type="password"
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value)}
                          className="w-full py-1.5 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 text-xs font-semibold">
                  {errorMessage}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setSelectedProject(null)}
                  className="px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>جاري معالجة الدفع والربط المالي...</span>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>تأكيد ودفع مبلغ ({donationAmount} ر.س)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Instant Digital Receipt Modal */}
      {completedDonation && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-emerald-200 dir-rtl p-8 relative space-y-6">
            
            {/* Success Checkmark */}
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-extrabold text-emerald-800">تقبل الله طاعتكم وجزاكم الله خيراً</h3>
              <p className="text-xs text-slate-500">تم إتمام عملية التبرع وتوثيقها مالياً بالأنظمة بنجاح</p>
            </div>

            {/* Official Voucher Ticket */}
            <div className="p-6 rounded-2xl bg-slate-50 border-2 border-dashed border-emerald-300 space-y-4 text-xs font-sans relative">
              {/* Header */}
              <div className="flex justify-between items-start pb-3 border-b border-slate-200">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">جمعية ريادة العطاء لخدمة الإنسان بالعسيلة</h4>
                  <p className="text-[10px] text-slate-500">رقم الترخيص الرسمي: 5081 - العسيلة بمكة المكرمة</p>
                </div>
                <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-1 rounded text-[10px]">
                  سند إيصال إلكتروني
                </span>
              </div>

              {/* Receipt Details */}
              <div className="grid grid-cols-2 gap-3 text-slate-700">
                <div>
                  <span className="text-[10px] text-slate-400 block">رقم التبرع:</span>
                  <strong className="font-mono text-emerald-700">{completedDonation.donationNumber}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">الرقم المرجعي للدفع:</span>
                  <strong className="font-mono text-slate-800">{completedDonation.transactionRef}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">اسم المتبرع الكريم:</span>
                  <strong className="text-slate-800">{completedDonation.donorName}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">وسيلة الدفع:</span>
                  <strong className="text-slate-800">{completedDonation.paymentMethod.toUpperCase()}</strong>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-400 block">المشروع المتبرع له:</span>
                  <strong className="text-emerald-800 font-bold">{completedDonation.projectNameAr}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">تاريخ وساعة التبرع:</span>
                  <span className="text-[11px] text-slate-600">{new Date(completedDonation.createdAt).toLocaleString("ar-SA")}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">مبلغ التبرع المستلم:</span>
                  <strong className="text-base text-emerald-700 font-extrabold">{completedDonation.amount} ريال سعودي</strong>
                </div>
              </div>

              {/* Verification & QR Code */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>مربوط آلياً بإدارة المشاريع والإدارة المالية</span>
                  </div>
                  <p className="text-[9px] text-slate-400">هذا الإيصال موثق رسمياً ويعتد به لدى الجمعية</p>
                </div>

                <div className="w-12 h-12 bg-white border border-slate-200 rounded p-1 flex items-center justify-center">
                  <QrCode className="w-10 h-10 text-slate-800" />
                </div>
              </div>
            </div>

            {/* Receipt Modal Actions */}
            <div className="flex gap-3">
              <button
                onClick={handlePrintReceipt}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الإيصال الرسمية</span>
              </button>

              <button
                onClick={() => {
                  setCompletedDonation(null);
                  setSelectedProject(null);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2"
              >
                <span>العودة للمتجر</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
