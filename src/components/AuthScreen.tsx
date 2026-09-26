import React, { useState, useEffect } from "react";
import { 
  Lock, Eye, EyeOff, Sparkles, ShieldCheck, AlertCircle, 
  RefreshCw, Globe, ArrowRight, ArrowLeft, CheckCircle2, 
  ChevronDown, ChevronUp, HeartHandshake, Award, X,
  KeyRound, CreditCard, Mail, Check, User
} from "lucide-react";

interface AuthScreenProps {
  onLoginSuccess: (role: 'admin' | 'leader' | 'volunteer' | 'beneficiary' | 'supervisor' | 'department_admin' | 'storekeeper' | string, user: any) => void;
  onBackToHome: () => void;
  lang?: 'ar' | 'en';
  onToggleLang?: (l: 'ar' | 'en') => void;
  onRegisterNewAccount?: () => void;
  homeSettings?: any;
}

export function AuthScreen({ 
  onLoginSuccess, 
  onBackToHome, 
  lang = 'ar',
  onToggleLang,
  onRegisterNewAccount,
  homeSettings
}: AuthScreenProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password recovery modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [recoveryIdentifier, setRecoveryIdentifier] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoverySuccess, setRecoverySuccess] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  // Google Login modal/state
  const [googleLoading, setGoogleLoading] = useState(false);

  // Collapsible quick test credentials for evaluation
  const [showDemoCredentials, setShowDemoCredentials] = useState(false);

  // Load saved identifier if "Remember Me" was previously selected (never stores password)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("reyadat_saved_identifier");
      if (saved) {
        setIdentifier(saved);
        setRememberMe(true);
      }
    } catch {
      // LocalStorage access failsafe
    }
  }, []);

  const isRtl = lang === 'ar';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client validation with accurate Arabic messages
    if (!identifier.trim()) {
      setError(
        lang === 'ar' 
          ? "يرجى إدخال رقم الهوية أو اسم المستخدم أو البريد الإلكتروني." 
          : "Please enter your National ID, username, or email."
      );
      return;
    }

    if (!password.trim()) {
      setError(
        lang === 'ar' 
          ? "يرجى إدخال كلمة المرور." 
          : "Please enter your password."
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/db/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          identifier: identifier.trim(), 
          password: password.trim() 
        })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const errorMsg = data?.error || (
          lang === 'ar' 
            ? "بيانات الدخول غير صحيحة، يرجى التحقق من البيانات والمحاولة مرة أخرى." 
            : "Invalid login credentials. Please verify your details and try again."
        );
        setError(errorMsg);
        return;
      }

      if (data && data.status === "success" && data.role) {
        // Handle "Remember Me" for identifier ONLY (Strictly NEVER save password in localStorage)
        try {
          if (rememberMe) {
            localStorage.setItem("reyadat_saved_identifier", identifier.trim());
          } else {
            localStorage.removeItem("reyadat_saved_identifier");
          }
        } catch {
          // Ignore localStorage errors
        }

        // Successfully authenticated! Route to target role dashboard automatically
        onLoginSuccess(data.role, data.user);
      } else {
        setError(
          lang === 'ar' 
            ? "بيانات الدخول غير صحيحة، يرجى التحقق من البيانات والمحاولة مرة أخرى." 
            : "Invalid login credentials."
        );
      }
    } catch {
      setError(
        lang === 'ar' 
          ? "تعذر الاتصال بالخادم، يرجى التحقق من اتصال الإنترنت والمحاولة مجددًا." 
          : "Could not connect to server. Please check your network and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      // Authenticate with Google identity endpoint
      const googleEmail = identifier.includes("@") ? identifier : "volunteer.google@riadataleata.org.sa";
      const res = await fetch("/api/db/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: googleEmail, 
          name: "مستخدم حساب Google" 
        })
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.status === "success") {
        onLoginSuccess(data.role, data.user);
      } else {
        setError(data?.error || (lang === 'ar' ? "فشل تسجيل الدخول بواسطة Google." : "Google Sign-In failed."));
      }
    } catch {
      setError(lang === 'ar' ? "فشل الاتصال بخدمة Google." : "Could not connect to Google services.");
    } finally {
      setGoogleLoading(false);
    }
  };

  // Password Recovery Handler
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    setRecoverySuccess(null);

    if (!recoveryIdentifier.trim()) {
      setRecoveryError(
        lang === 'ar' 
          ? "يرجى إدخال رقم الهوية أو البريد الإلكتروني المسجل." 
          : "Please enter your registered ID or email."
      );
      return;
    }

    setRecoveryLoading(true);
    try {
      const res = await fetch("/api/db/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: recoveryIdentifier.trim() })
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.status === "success") {
        setRecoverySuccess(
          data.message || (
            lang === 'ar'
              ? "تم إرسال رابط إعادة تعيين كلمة المرور إلى البريد المسجل بحسابك بنجاح."
              : "Password recovery link has been sent to your registered address."
          )
        );
      } else {
        setRecoveryError(data?.error || (lang === 'ar' ? "تعذر إرسال طلب الاستعادة." : "Failed to process request."));
      }
    } catch {
      setRecoveryError(lang === 'ar' ? "حدث خطأ أثناء معالجة الطلب." : "An error occurred.");
    } finally {
      setRecoveryLoading(false);
    }
  };

  // Quick helper to fill test accounts
  const handleSelectDemoAccount = (id: string, pass: string = "123") => {
    setIdentifier(id);
    setPassword(pass);
    setError(null);
  };

  return (
    <div 
      className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* 1. TOP UTILITY BAR (Official Association Bar) */}
      <header className="w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 z-20 py-3.5 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo & Association Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-sm ring-2 ring-emerald-500/20 overflow-hidden shrink-0">
              {homeSettings?.logoUrl ? (
                <img 
                  src={homeSettings.logoUrl} 
                  alt="شعار الجمعية" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <Sparkles className="w-5 h-5 text-emerald-100" />
              )}
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                {lang === 'ar' ? "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة" : "Reyadat Al-Ata Association"}
              </h1>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  {lang === 'ar' ? "ترخيص رقم: 5081" : "License No: 5081"}
                </span>
                <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  {lang === 'ar' ? "بوابة النفاذ الموحدة" : "Unified Access Portal"}
                </span>
              </div>
            </div>
          </div>

          {/* Top Actions: Language & Return to Home */}
          <div className="flex items-center gap-2 sm:gap-3">
            {onToggleLang && (
              <button
                type="button"
                onClick={() => onToggleLang(lang === 'ar' ? 'en' : 'ar')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                title="تغيير اللغة / Switch Language"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{lang === 'ar' ? "English" : "العربية"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onBackToHome}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
              title={lang === 'ar' ? "العودة للموقع الرسمي للجمعية" : "Back to official homepage"}
            >
              {isRtl ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{lang === 'ar' ? "الرئيسية" : "Home"}</span>
            </button>
          </div>

        </div>
      </header>

      {/* 2. MAIN BODY (SPLIT VIEW: VISUAL BRANDING + UNIFIED LOGIN CARD) */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* ======================================================== */}
          {/* SECTION 1: CHARITY BRANDING & MISSION SIDE (القسم التعريفي) */}
          {/* ======================================================== */}
          <div className="lg:col-span-5 flex flex-col justify-between p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-emerald-800 via-teal-900 to-slate-900 text-white shadow-xl relative overflow-hidden order-2 lg:order-1 border border-emerald-700/40">
            {/* Background Decorative Accents */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>
            
            {/* Soft Charity Community Background Image with subtle overlay */}
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-10 mix-blend-overlay pointer-events-none"
              style={{ 
                backgroundImage: `url('https://images.unsplash.com/photo-1593113598332-cd288d649433?w=900&auto=format&fit=crop&q=80')` 
              }}
            ></div>

            <div className="relative z-10 space-y-6">
              
              {/* Association Emblem Badge */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                  <ShieldCheck className="w-6 h-6 text-emerald-300" />
                </div>
                <div>
                  <div className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-300">
                    {lang === 'ar' ? "منظومة العطاء المتكاملة" : "Nonprofit Portal"}
                  </div>
                  <div className="text-sm font-bold text-white">
                    {lang === 'ar' ? "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة" : "Reyadat Al-Ata Association"}
                  </div>
                </div>
              </div>

              {/* Main Headline */}
              <div className="space-y-2.5 pt-2">
                <h2 className="text-2xl sm:text-3xl font-black text-white leading-snug tracking-tight">
                  {lang === 'ar' ? "معًا نصنع أثرًا ونبني مجتمعًا أفضل" : "Together Making Impact & Building a Better Society"}
                </h2>
                <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed font-normal">
                  {lang === 'ar' 
                    ? "منصة إلكترونية متكاملة لخدمة المستفيدين وتمكين المتطوعين والموظفين والشركاء ودعم الأعمال والمبادرات المجتمعية."
                    : "An integrated portal empowering beneficiaries, volunteers, staff, partners, and community programs."}
                </p>
              </div>

              {/* 3 Charity Pillars (الأثر المستدام، الخدمة الموثوقة، المجتمع الأفضل) */}
              <div className="space-y-3 pt-2">
                
                {/* Pillar 1: Sustainable Impact */}
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white">
                      {lang === 'ar' ? "أثر مستدام" : "Sustainable Impact"}
                    </h3>
                    <p className="text-[11px] text-emerald-100/80 leading-relaxed">
                      {lang === 'ar' ? "نساهم في صناعة أثر إيجابي مستمر في خدمة الإنسان." : "Creating lasting positive community impact."}
                    </p>
                  </div>
                </div>

                {/* Pillar 2: Reliable Service */}
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white">
                      {lang === 'ar' ? "خدمة موثوقة" : "Reliable Services"}
                    </h3>
                    <p className="text-[11px] text-emerald-100/80 leading-relaxed">
                      {lang === 'ar' ? "نقدم خدماتنا للمستخدمين بأعلى معايير الجودة والحوكمة." : "Providing high governance and quality standards."}
                    </p>
                  </div>
                </div>

                {/* Pillar 3: Better Community */}
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
                  <div className="w-8 h-8 rounded-xl bg-emerald-400/20 text-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                    <HeartHandshake className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white">
                      {lang === 'ar' ? "مجتمع أفضل" : "Better Community"}
                    </h3>
                    <p className="text-[11px] text-emerald-100/80 leading-relaxed">
                      {lang === 'ar' ? "نعمل معًا لخدمة المجتمع وتعزيز التكافل الاجتماعي والتطوع." : "Working together to promote solidarity and volunteerism."}
                    </p>
                  </div>
                </div>

              </div>

            </div>

            {/* Bottom Footer Note */}
            <div className="relative z-10 pt-6 mt-6 border-t border-white/10 flex items-center justify-between text-[10px] text-emerald-200/80">
              <span>{lang === 'ar' ? "العسيلة - مكة المكرمة" : "Al-Useilah, Makkah"}</span>
              <span className="flex items-center gap-1 font-bold text-white">
                <Check className="w-3 h-3 text-emerald-400" />
                {lang === 'ar' ? "نظام دخول مشفر وآمن" : "Encrypted Access"}
              </span>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 2: THE UNIFIED LOGIN CARD (بطاقة تسجيل الدخول) */}
          {/* ======================================================== */}
          <div className="lg:col-span-7 flex flex-col justify-center order-1 lg:order-2">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl p-6 sm:p-10 space-y-6">
              
              {/* Card Header */}
              <div className="space-y-1.5 text-right">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold border border-emerald-200/60 dark:border-emerald-800">
                  <KeyRound className="w-3 h-3 text-emerald-600" />
                  <span>{lang === 'ar' ? "البوابة الموحدة لكافة الحسابات" : "Unified All-Accounts Portal"}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {lang === 'ar' ? "تسجيل الدخول" : "Sign In"}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                  {lang === 'ar' 
                    ? "مرحبًا بك، قم بتسجيل الدخول للوصول إلى حسابك (المدير، الموظف، المتطوع، المستفيد، الشريك)"
                    : "Welcome back! Sign in to access your account dashboard."}
                </p>
              </div>

              {/* Error Alert Display */}
              {error && (
                <div 
                  role="alert"
                  className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 p-4 rounded-2xl text-rose-800 dark:text-rose-300 text-xs flex items-start gap-3 transition-all animate-in fade-in duration-200"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                  <div className="font-semibold leading-relaxed text-right flex-1">
                    {error}
                  </div>
                </div>
              )}

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* FIELD 1: Identifier (National ID / Username / Email / Phone) */}
                <div className="space-y-1.5">
                  <label 
                    htmlFor="user-identifier"
                    className="block text-xs font-black text-slate-700 dark:text-slate-300 text-right"
                  >
                    {lang === 'ar' 
                      ? "رقم الهوية الوطنية / اسم المستخدم / البريد الإلكتروني" 
                      : "National ID / Username / Email / Phone"}
                    <span className="text-rose-500 mr-1">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="user-identifier"
                      name="identifier"
                      type="text"
                      autoComplete="username"
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder={
                        lang === 'ar' 
                          ? "أدخل رقم الهوية أو اسم المستخدم أو البريد الإلكتروني" 
                          : "Enter your National ID, username, or email"
                      }
                      className="w-full pr-10 pl-4 py-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                      disabled={loading}
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* FIELD 2: Password with Show/Hide toggle */}
                <div className="space-y-1.5">
                  <label 
                    htmlFor="user-password"
                    className="block text-xs font-black text-slate-700 dark:text-slate-300 text-right"
                  >
                    {lang === 'ar' ? "كلمة المرور" : "Password"}
                    <span className="text-rose-500 mr-1">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="user-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder={lang === 'ar' ? "أدخل كلمة المرور" : "Enter your password"}
                      className="w-full pr-10 pl-11 py-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                      disabled={loading}
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    
                    {/* Show/Hide password toggle */}
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* ROW: Remember Me & Forgot Password */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  {/* Remember me checkbox */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                    />
                    <span className="text-slate-600 dark:text-slate-400 font-bold">
                      {lang === 'ar' ? "تذكرني" : "Remember me"}
                    </span>
                  </label>

                  {/* Forgot Password link */}
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryIdentifier(identifier);
                      setShowForgotModal(true);
                      setRecoveryError(null);
                      setRecoverySuccess(null);
                    }}
                    className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-bold transition-colors cursor-pointer"
                  >
                    {lang === 'ar' ? "نسيت كلمة المرور؟" : "Forgot Password?"}
                  </button>
                </div>

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs sm:text-sm rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>{lang === 'ar' ? "جاري التحقق والمصادقة..." : "Verifying credentials..."}</span>
                    </>
                  ) : (
                    <span>{lang === 'ar' ? "تسجيل الدخول" : "Sign In"}</span>
                  )}
                </button>
              </form>

              {/* DIVIDER: OR (Strictly Google Only - Apple & Facebook Permanently Removed) */}
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 font-medium">
                    {lang === 'ar' ? "أو المتابعة باستخدام" : "Or continue with"}
                  </span>
                </div>
              </div>

              {/* GOOGLE SIGN IN BUTTON (Official Google Brand) */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="w-full py-3 px-4 bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-3 cursor-pointer shadow-xs disabled:opacity-60"
              >
                {googleLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-500" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>
                  {lang === 'ar' ? "تسجيل الدخول بواسطة Google" : "Sign in with Google"}
                </span>
              </button>

              {/* CREATE NEW ACCOUNT LINK */}
              <div className="pt-2 text-center">
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  {lang === 'ar' ? "ليس لديك حساب؟" : "Don't have an account?"}{" "}
                  <button
                    type="button"
                    onClick={() => {
                      if (onRegisterNewAccount) {
                        onRegisterNewAccount();
                      } else {
                        onBackToHome();
                      }
                    }}
                    className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-black underline underline-offset-4 cursor-pointer"
                  >
                    {lang === 'ar' ? "إنشاء حساب جديد" : "Create New Account"}
                  </button>
                </p>
              </div>

              {/* QUICK DEMO CREDENTIALS COLLAPSIBLE (For testing and evaluating all roles) */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDemoCredentials(!showDemoCredentials)}
                  className="w-full flex items-center justify-between py-2 text-[11px] font-bold text-slate-500 hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-300 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{lang === 'ar' ? "بيانات الحسابات المعتمدة للتجربة (اضغط للتعبئة التلقائية)" : "Test Accounts Demo Access"}</span>
                  </span>
                  {showDemoCredentials ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showDemoCredentials && (
                  <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-[11px] space-y-2">
                    <p className="text-slate-500 dark:text-slate-400 leading-normal">
                      {lang === 'ar' 
                        ? "انقر على أي حساب لتعبئة بيانات الدخول مباشرة وتجربة التعرف التلقائي على الصلاحيات:" 
                        : "Click any profile to autofill and test auto-role detection:"}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                      
                      {/* Admin */}
                      <button
                        type="button"
                        onClick={() => handleSelectDemoAccount("admin", "123")}
                        className="p-2 text-right bg-white dark:bg-slate-800 hover:border-emerald-500 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer group"
                      >
                        <div className="font-black text-slate-800 dark:text-white group-hover:text-emerald-600">
                          المدير التنفيذي / الإدارة
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          ID: admin / كلمة المرور: 123
                        </div>
                      </button>

                      {/* Volunteer by National ID */}
                      <button
                        type="button"
                        onClick={() => handleSelectDemoAccount("1087654321", "123")}
                        className="p-2 text-right bg-white dark:bg-slate-800 hover:border-emerald-500 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer group"
                      >
                        <div className="font-black text-slate-800 dark:text-white group-hover:text-emerald-600">
                          متطوع (برقم الهوية)
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          هوية: 1087654321 / 123
                        </div>
                      </button>

                      {/* Beneficiary by Email or National ID */}
                      <button
                        type="button"
                        onClick={() => handleSelectDemoAccount("1023456789", "123")}
                        className="p-2 text-right bg-white dark:bg-slate-800 hover:border-emerald-500 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer group"
                      >
                        <div className="font-black text-slate-800 dark:text-white group-hover:text-emerald-600">
                          مستفيد (أبو محمد المكي)
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          هوية: 1023456789 / 123
                        </div>
                      </button>

                      {/* Storekeeper */}
                      <button
                        type="button"
                        onClick={() => handleSelectDemoAccount("1010000099", "123")}
                        className="p-2 text-right bg-white dark:bg-slate-800 hover:border-emerald-500 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer group"
                      >
                        <div className="font-black text-slate-800 dark:text-white group-hover:text-emerald-600">
                          أمين المستودع الرئيسي
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          هوية: 1010000099 / 123
                        </div>
                      </button>

                      {/* Warehouse & Support Services Director */}
                      <button
                        type="button"
                        onClick={() => handleSelectDemoAccount("1010000008", "123")}
                        className="p-2 text-right bg-white dark:bg-slate-800 hover:border-emerald-500 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer group"
                      >
                        <div className="font-black text-slate-800 dark:text-white group-hover:text-emerald-600">
                          مدير المخزن والخدمات المساندة
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          هوية: 1010000008 / 123
                        </div>
                      </button>

                      {/* Department Employee (HR & Warehouse) */}
                      <button
                        type="button"
                        onClick={() => handleSelectDemoAccount("1034567890", "123")}
                        className="p-2 text-right bg-white dark:bg-slate-800 hover:border-emerald-500 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer group"
                      >
                        <div className="font-black text-slate-800 dark:text-white group-hover:text-emerald-600">
                          موظف إدارة معتمد (سعود الهذلي)
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          هوية: 1034567890 / 123
                        </div>
                      </button>

                      {/* Volunteer Management Director */}
                      <button
                        type="button"
                        onClick={() => handleSelectDemoAccount("1010000005", "123")}
                        className="p-2 text-right bg-white dark:bg-slate-800 hover:border-emerald-500 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer group"
                      >
                        <div className="font-black text-slate-800 dark:text-white group-hover:text-emerald-600">
                          مديرة إدارة التطوع
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          هوية: 1010000005 / 123
                        </div>
                      </button>

                      {/* Beneficiaries Director */}
                      <button
                        type="button"
                        onClick={() => handleSelectDemoAccount("1010000004", "123")}
                        className="p-2 text-right bg-white dark:bg-slate-800 hover:border-emerald-500 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer group"
                      >
                        <div className="font-black text-slate-800 dark:text-white group-hover:text-emerald-600">
                          مديرة إدارة المستفيدين
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          هوية: 1010000004 / 123
                        </div>
                      </button>

                      {/* Team Leader */}
                      <button
                        type="button"
                        onClick={() => handleSelectDemoAccount("سعود الحربي", "123")}
                        className="p-2 text-right bg-white dark:bg-slate-800 hover:border-emerald-500 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer group"
                      >
                        <div className="font-black text-slate-800 dark:text-white group-hover:text-emerald-600">
                          قائد فريق تطوعي
                        </div>
                        <div className="text-[10px] text-slate-500">
                          الاسم: سعود الحربي / 123
                        </div>
                      </button>

                      {/* Test Inactive Account Error State */}
                      <button
                        type="button"
                        onClick={() => handleSelectDemoAccount("1099999991", "123")}
                        className="p-2 text-right bg-rose-50/60 dark:bg-rose-950/20 hover:border-rose-400 border border-rose-200 dark:border-rose-900/50 rounded-xl transition-all cursor-pointer group"
                      >
                        <div className="font-black text-rose-800 dark:text-rose-300">
                          تجربة حساب غير مفعل
                        </div>
                        <div className="text-[10px] text-rose-600/80 font-mono">
                          1099999991 (رسالة الحساب غير مفعل)
                        </div>
                      </button>

                      {/* Test Suspended Account Error State */}
                      <button
                        type="button"
                        onClick={() => handleSelectDemoAccount("1099999992", "123")}
                        className="p-2 text-right bg-amber-50/60 dark:bg-amber-950/20 hover:border-amber-400 border border-amber-200 dark:border-amber-900/50 rounded-xl transition-all cursor-pointer group"
                      >
                        <div className="font-black text-amber-800 dark:text-amber-300">
                          تجربة حساب موقوف
                        </div>
                        <div className="text-[10px] text-amber-600/80 font-mono">
                          1099999992 (رسالة الإيقاف المؤقت)
                        </div>
                      </button>

                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. FORGOT PASSWORD / RECOVERY MODAL */}
      {/* ======================================================== */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 text-right relative">
            
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="absolute left-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {lang === 'ar' ? "استعادة كلمة المرور" : "Password Recovery"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {lang === 'ar'
                  ? "أدخل رقم الهوية أو اسم المستخدم أو البريد الإلكتروني المرتبط بحسابك، وسنرسل لك تعليمات استعادة كلمة المرور فورًا."
                  : "Enter your registered ID, username, or email to receive recovery instructions."}
              </p>
            </div>

            {/* Error in modal */}
            {recoveryError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{recoveryError}</span>
              </div>
            )}

            {/* Success in modal */}
            {recoverySuccess ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-black">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{lang === 'ar' ? "تم إرسال الطلب بنجاح" : "Request Submitted"}</span>
                  </div>
                  <p className="leading-relaxed font-medium">
                    {recoverySuccess}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  {lang === 'ar' ? "العودة لصفحة الدخول" : "Back to Sign In"}
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {lang === 'ar' ? "رقم الهوية أو البريد الإلكتروني" : "National ID or Email"}
                  </label>
                  <input
                    type="text"
                    value={recoveryIdentifier}
                    onChange={(e) => setRecoveryIdentifier(e.target.value)}
                    placeholder={lang === 'ar' ? "مثال: 1087654321 أو name@example.com" : "e.g. 1087654321 or email"}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    autoFocus
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={recoveryLoading}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {recoveryLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>{lang === 'ar' ? "إرسال رابط الاستعادة" : "Send Recovery Link"}</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    {lang === 'ar' ? "إلغاء" : "Cancel"}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
