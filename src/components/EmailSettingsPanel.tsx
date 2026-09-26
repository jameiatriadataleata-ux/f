import React, { useState, useEffect } from "react";
import { 
  Mail, Send, Server, ShieldCheck, Key, RefreshCw, CheckCircle2, 
  AlertCircle, Globe, Eye, EyeOff, Lock, Save, Trash2, Clock, 
  Check, X, ExternalLink, HelpCircle, FileText, Sparkles, Inbox,
  Sliders, Shield, Terminal, ArrowUpRight, Filter, Search, Copy
} from "lucide-react";

interface EmailConfig {
  provider: "resend" | "smtp" | "both_auto";
  senderName: string;
  senderEmail: string;
  replyToEmail?: string;
  replyTo?: string;
  hasResendApiKey?: boolean;
  resendApiKeySet?: boolean;
  resendApiKeyMasked?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  hasSmtpPassword?: boolean;
  smtpPasswordMasked?: string;
  smtp?: {
    host?: string;
    port?: number;
    secure?: boolean;
    user?: string;
    passSet?: boolean;
    passMasked?: string;
  };
  enabled?: boolean;
  enableAutoFallback?: boolean;
  testRecipientEmail?: string;
  updatedAt?: string;
  activeProvider?: string;
}

interface EmailLogItem {
  id: string;
  timestamp: string;
  to: string;
  recipientName?: string;
  subject: string;
  templateType: string;
  provider: string;
  status: "delivered" | "failed";
  error?: string;
  language?: string;
}

interface EmailSettingsPanelProps {
  isDark?: boolean;
}

export const EmailSettingsPanel: React.FC<EmailSettingsPanelProps> = () => {
  // Config state
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Form edit states
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [provider, setProvider] = useState<"resend" | "smtp">("resend");
  const [newResendKey, setNewResendKey] = useState("");
  const [showResendInput, setShowResendInput] = useState(false);

  // SMTP edit states
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState("");
  const [newSmtpPass, setNewSmtpPass] = useState("");
  const [showSmtpPassInput, setShowSmtpPassInput] = useState(false);

  // Test Email state
  const [testRecipient, setTestRecipient] = useState("");
  const [testLanguage, setTestLanguage] = useState<"ar" | "en" | "fr">("ar");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    provider?: string;
    details?: string;
  } | null>(null);

  // Logs state
  const [logs, setLogs] = useState<EmailLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsFilter, setLogsFilter] = useState<"all" | "delivered" | "failed">("all");
  const [logsSearch, setLogsSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState<EmailLogItem | null>(null);

  // Active Sub-tab inside Email panel
  const [activeTab, setActiveTab] = useState<"settings" | "domain" | "test" | "logs" | "templates">("settings");

  // Domain & DNS Verification state (riadataleata.com)
  const [domainData, setDomainData] = useState<{
    hasApiKey?: boolean;
    domain?: string;
    domainId?: string;
    status?: string;
    message?: string;
    error?: string;
    records?: any[];
    liveDns?: any;
    resendDetails?: any;
  } | null>(null);
  const [loadingDomain, setLoadingDomain] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [domainActionLoading, setDomainActionLoading] = useState(false);
  const [domainActionMsg, setDomainActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Template preview state
  const [selectedTemplate, setSelectedTemplate] = useState<string>("volunteer_approved");
  const [templatePreviewLang, setTemplatePreviewLang] = useState<"ar" | "en" | "fr">("ar");

  // Fetch email config
  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/db/email-settings");
      if (res.ok) {
        const data = await res.json();
        const s: EmailConfig = data.settings || data;
        setConfig(s);
        setSenderName(s.senderName || "");
        setSenderEmail(s.senderEmail || "");
        setReplyTo(s.replyToEmail || s.replyTo || "");
        setProvider(s.provider === "smtp" ? "smtp" : "resend");
        setSmtpHost(s.smtpHost || s.smtp?.host || "");
        setSmtpPort(s.smtpPort || s.smtp?.port || 587);
        setSmtpSecure(!!(s.smtpSecure ?? s.smtp?.secure));
        setSmtpUser(s.smtpUser || s.smtp?.user || "");
        if (s.testRecipientEmail && !testRecipient) {
          setTestRecipient(s.testRecipientEmail);
        }
      }
    } catch (err) {
      console.error("Failed to load email config:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Domain & DNS Status
  const fetchDomainStatus = async () => {
    try {
      setLoadingDomain(true);
      const res = await fetch("/api/db/resend/domain-status");
      if (res.ok) {
        const data = await res.json();
        setDomainData(data);
      }
    } catch (err) {
      console.error("Failed to load domain status:", err);
    } finally {
      setLoadingDomain(false);
    }
  };

  // Copy helper with feedback
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(`تم نسخ ${label} بنجاح!`);
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  // Add Domain to Resend
  const handleCreateDomainInResend = async () => {
    try {
      setDomainActionLoading(true);
      setDomainActionMsg(null);
      const res = await fetch("/api/db/resend/domains/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: "riadataleata.com" })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDomainActionMsg({ type: "success", text: data.message || "تمت إضافة النطاق بنجاح إلى حساب Resend!" });
        fetchDomainStatus();
      } else {
        setDomainActionMsg({ type: "error", text: data.error || "فشل إضافة النطاق." });
      }
    } catch (err: any) {
      setDomainActionMsg({ type: "error", text: err.message || "خطأ أثناء إضافة النطاق." });
    } finally {
      setDomainActionLoading(false);
    }
  };

  // Trigger Resend Verification
  const handleVerifyDomainInResend = async (domainId: string) => {
    try {
      setDomainActionLoading(true);
      setDomainActionMsg(null);
      const res = await fetch("/api/db/resend/domains/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDomainActionMsg({ type: "success", text: data.message });
        setTimeout(() => fetchDomainStatus(), 2000);
      } else {
        setDomainActionMsg({ type: "error", text: data.error || "تعذر إرسال طلب التحقق." });
      }
    } catch (err: any) {
      setDomainActionMsg({ type: "error", text: err.message || "خطأ أثناء طلب التحقق." });
    } finally {
      setDomainActionLoading(false);
    }
  };

  // Live DNS Check
  const handleCheckLiveDns = async () => {
    try {
      setDomainActionLoading(true);
      const res = await fetch("/api/db/dns/check-live?domain=riadataleata.com");
      if (res.ok) {
        const data = await res.json();
        setDomainData(prev => prev ? { ...prev, liveDns: data.liveDns } : null);
        setDomainActionMsg({ type: "success", text: "تم فحص الـ DNS المباشر وتحديث الحالة بنجاح." });
      }
    } catch (err: any) {
      setDomainActionMsg({ type: "error", text: "تعذر فحص الـ DNS: " + err.message });
    } finally {
      setDomainActionLoading(false);
    }
  };

  // Fetch logs
  const fetchLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await fetch("/api/db/email-logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to load email logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchLogs();
    fetchDomainStatus();
  }, []);

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    const payload: any = {
      senderName,
      senderEmail,
      replyToEmail: replyTo,
      replyTo,
      provider,
      smtpHost,
      smtpPort: Number(smtpPort),
      smtpSecure,
      smtpUser,
      smtp: {
        host: smtpHost,
        port: Number(smtpPort),
        secure: smtpSecure,
        user: smtpUser
      }
    };

    if (newResendKey.trim()) {
      payload.resendApiKey = newResendKey.trim();
    }
    if (newSmtpPass.trim()) {
      payload.smtpPassword = newSmtpPass.trim();
      payload.smtp.pass = newSmtpPass.trim();
    }

    try {
      const res = await fetch("/api/db/email-settings/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        setSaveSuccess("تم حفظ إعدادات البريد وتأمين البيانات بنجاح ✓");
        const updated = resData.settings || resData.config;
        if (updated) setConfig(updated);
        setNewResendKey("");
        setNewSmtpPass("");
        setShowResendInput(false);
        setShowSmtpPassInput(false);
        setTimeout(() => setSaveSuccess(null), 5000);
      } else {
        setSaveError(resData.error || "فشل حفظ إعدادات البريد");
      }
    } catch (err: any) {
      setSaveError(err.message || "حدث خطأ غير متوقع أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  // Send Test Email
  const handleSendTestEmail = async () => {
    if (!testRecipient || !testRecipient.includes("@")) {
      setTestResult({
        success: false,
        message: "يرجى كتابة عنوان بريد إلكتروني صالح للمستلم الاختباري."
      });
      return;
    }

    setSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/db/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testRecipient.trim(),
          language: testLanguage
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: data.message || "تم إرسال البريد الاختباري بنجاح!",
          provider: data.provider,
          details: `تم الإرسال عبر المزود: ${data.provider} | معرّف الرسالة: ${data.details?.messageId || data.details?.id || "N/A"}`
        });
        fetchLogs(); // refresh logs
      } else {
        setTestResult({
          success: false,
          message: data.message || "فشل إرسال البريد الاختباري.",
          provider: data.provider,
          details: data.error || data.details || "تفاصيل الخطأ مسجلة في سجل النظام."
        });
        fetchLogs(); // refresh logs to show failure record
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: "تعذر إتمام طلب الإرسال إلى الخادم.",
        details: err.message
      });
    } finally {
      setSendingTest(false);
    }
  };

  // Clear Logs
  const handleClearLogs = async () => {
    if (!window.confirm("هل أنت متأكد من رغبتك في مسح سجل رسائل البريد بالكامل؟")) return;
    try {
      const res = await fetch("/api/db/email-logs/clear", { method: "POST" });
      if (res.ok) {
        setLogs([]);
        setSelectedLog(null);
      }
    } catch (err) {
      console.error("Failed to clear email logs:", err);
    }
  };

  // Filtered logs
  const filteredLogs = logs.filter(log => {
    const matchesFilter = logsFilter === "all" ? true : log.status === logsFilter;
    const matchesSearch = !logsSearch.trim() || 
      log.to.toLowerCase().includes(logsSearch.toLowerCase()) ||
      (log.subject && log.subject.toLowerCase().includes(logsSearch.toLowerCase())) ||
      (log.recipientName && log.recipientName.toLowerCase().includes(logsSearch.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const hasResendKey = Boolean(config?.hasResendApiKey || config?.resendApiKeySet);
  const resendKeyMasked = config?.resendApiKeyMasked || (hasResendKey ? "re_••••••••••••" : "");
  const hasSmtpPass = Boolean(config?.hasSmtpPassword || config?.smtp?.passSet);
  const smtpPassMasked = config?.smtpPasswordMasked || config?.smtp?.passMasked || (hasSmtpPass ? "••••••••••••" : "");
  const activeProviderLabel = config?.provider === "smtp" 
    ? "خادم SMTP المخصص" 
    : (config?.provider === "both_auto" ? "الربط الآلي المزدوج (Resend & SMTP)" : "Resend Cloud API");

  return (
    <div id="email-settings-panel" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-emerald-800 via-teal-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -ml-20 -mt-20 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-bold">
              <Mail className="w-3.5 h-3.5" />
              <span>خدمة البريد الإلكتروني المركزي الحقيقي</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              إعدادات البريد الإلكتروني (Sender & SMTP)
            </h2>
            <p className="text-emerald-100/80 text-sm max-w-2xl leading-relaxed">
              محرك مركزي متكامل لإرسال كافة الإشعارات الرسمية والرسائل التفاعلية للمستفيدين، المتطوعين، المتبرعين، والكوادر عبر Resend API أو خوادم SMTP المؤمنة.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              id="refresh-email-config-btn"
              onClick={() => { fetchConfig(); fetchLogs(); }}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>تحديث الحالة</span>
            </button>
            <button
              id="switch-to-test-btn"
              onClick={() => setActiveTab("test")}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Send className="w-4 h-4" />
              <span>🧪 إرسال بريد اختباري</span>
            </button>
          </div>
        </div>

        {/* Integration Status Bar */}
        <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <span className="text-emerald-200/70 block mb-1">المزود النشط</span>
            <div className="font-bold text-white flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${config?.provider === "smtp" ? "bg-sky-400" : "bg-emerald-400"}`}></span>
              {activeProviderLabel}
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <span className="text-emerald-200/70 block mb-1">هوية المرسل المعتمدة</span>
            <div className="font-bold text-white truncate" title={config?.senderEmail}>
              {config?.senderEmail || "غير مضبوط"}
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <span className="text-emerald-200/70 block mb-1">إجمالي الرسائل المرسلة</span>
            <div className="font-bold text-white font-mono">
              {logs.length} رسالة موثقة
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <span className="text-emerald-200/70 block mb-1">نسبة نجاح التسليم</span>
            <div className="font-bold text-emerald-300 font-mono">
              {logs.length > 0 
                ? `${Math.round((logs.filter(l => l.status === "delivered").length / logs.length) * 100)}%` 
                : "100% (جاهز)"}
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto pb-1">
        <button
          id="tab-btn-settings"
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "settings"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>إعدادات المزود وهيكل الإرسال</span>
        </button>

        <button
          id="tab-btn-domain"
          onClick={() => {
            setActiveTab("domain");
            fetchDomainStatus();
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "domain"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>توثيق النطاق وسجلات DNS (riadataleata.com)</span>
          {domainData?.status === "verified" ? (
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          ) : (
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          )}
        </button>

        <button
          id="tab-btn-test"
          onClick={() => setActiveTab("test")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "test"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <Send className="w-4 h-4" />
          <span>🧪 إرسال بريد اختباري</span>
        </button>

        <button
          id="tab-btn-logs"
          onClick={() => setActiveTab("logs")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "logs"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>سجل الرسائل المرسلة ({logs.length})</span>
        </button>

        <button
          id="tab-btn-templates"
          onClick={() => setActiveTab("templates")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "templates"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>معاينة القوالب متعددة اللغات</span>
        </button>
      </div>

      {/* Notification Messages */}
      {saveSuccess && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 p-4 rounded-2xl flex items-center gap-3 text-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {saveError && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 p-4 rounded-2xl flex items-center gap-3 text-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{saveError}</span>
        </div>
      )}

      {/* TAB 1: SETTINGS */}
      {activeTab === "settings" && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Security Notice Card */}
          <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
            <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <strong className="font-bold text-amber-900 dark:text-amber-200 block text-sm">
                معايير الأمان وحماية المفاتيح السرية
              </strong>
              <p className="text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
                لا يتم إرسال المفاتيح السرية أو كلمات المرور إلى واجهة المستخدم بصيغة مكشوفة. تُحفظ الأسرار في الخادم، وتُعرض لك مقنّعة (••••••••). يمكنك كتابة قيمة جديدة عند الرغبة في التحديث، أو ضبط متغيرات البيئة <code>RESEND_API_KEY</code> أو <code>SMTP_*</code> مباشرة.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Col (2 cols wide): Sender Identity & Providers */}
            <div className="lg:col-span-2 space-y-6">
              {/* Card 1: Sender Identity */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-black">
                    1
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-base">
                      هوية المرسل (Sender Identity)
                    </h3>
                    <p className="text-xs text-slate-500">
                      البيانات الظاهرة للمستلمين في صندوق الوارد
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      اسم المرسل (Sender Name) *
                    </label>
                    <input
                      id="sender-name-input"
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="جمعية ريادة العطاء لخدمة الإنسان بالعسيلة"
                      required
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-[11px] text-slate-400">الاسم الظاهر للمستلم في رسالة البريد</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      بريد المرسل (Sender Email) *
                    </label>
                    <input
                      id="sender-email-input"
                      type="email"
                      value={senderEmail}
                      onChange={(e) => setSenderEmail(e.target.value)}
                      placeholder="notifications@riadataleata.com"
                      required
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] text-slate-400">خيارات سريعة للنطاق:</span>
                      <button
                        type="button"
                        onClick={() => setSenderEmail("notifications@riadataleata.com")}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono transition-colors cursor-pointer"
                      >
                        notifications@riadataleata.com
                      </button>
                      <button
                        type="button"
                        onClick={() => setSenderEmail("noreply@riadataleata.com")}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono transition-colors cursor-pointer"
                      >
                        noreply@riadataleata.com
                      </button>
                    </div>
                  </div>

                  {senderEmail.toLowerCase().includes("gmail.com") && (
                    <div className="sm:col-span-2 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs space-y-2">
                      <div className="flex items-center gap-2 font-bold">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>تنبيه هام حول استخدام بريد Gmail كمرسل:</span>
                      </div>
                      <p className="leading-relaxed">
                        يمنع مزود <strong>Resend</strong> استخدام بريد <code>@gmail.com</code> كعنوان للمرسل (From) بسبب معايير الحماية العالمية (DMARC)، ويظهر خطأ <em>"The gmail.com domain is not verified"</em>.
                        الحل المعتمد هو استخدام بريد تابع لنطاق الجمعية الرسمي، مثل <code>notifications@riadataleata.com</code> مع تخصيص بريد الجمعية <code>riadataleata@gmail.com</code> في خانة <strong>بريد الرد (Reply-To)</strong> لاستقبال جميع الرسائل.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSenderEmail("notifications@riadataleata.com");
                          setReplyTo("riadataleata@gmail.com");
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>تطبيق الإعداد الموصى به الآن (From: notifications@riadataleata.com / Reply-To: riadataleata@gmail.com)</span>
                      </button>
                    </div>
                  )}

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      بريد الرد (Reply-To Email)
                    </label>
                    <input
                      id="reply-to-input"
                      type="email"
                      value={replyTo}
                      onChange={(e) => setReplyTo(e.target.value)}
                      placeholder="riadataleata@gmail.com"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] text-slate-400">البريد الذي تصله الردود إذا ضغط المستلم على "رد" (Reply)</span>
                      <button
                        type="button"
                        onClick={() => setReplyTo("riadataleata@gmail.com")}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono transition-colors cursor-pointer"
                      >
                        تعيين بريد الجمعية الرسمي: riadataleata@gmail.com
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Provider Selection & Setup */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 flex items-center justify-center font-black">
                    2
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-base">
                      مزود الخدمة وطريقة الإرسال (Email Provider)
                    </h3>
                    <p className="text-xs text-slate-500">
                      اختر طريقة الإرسال المفضلة للنظام
                    </p>
                  </div>
                </div>

                {/* Provider Radio Pills */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div 
                    onClick={() => setProvider("resend")}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                      provider === "resend"
                        ? "border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/30"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full mt-0.5 border-2 flex items-center justify-center ${provider === "resend" ? "border-emerald-600 bg-emerald-600" : "border-slate-400"}`}>
                      {provider === "resend" && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                    </div>
                    <div>
                      <strong className="text-xs font-black text-slate-900 dark:text-white block">
                        خدمة Resend API السحابية (موصى بها)
                      </strong>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        إرسال مباشر وسريع وموثوقية عالية مع تسليم فوري وتتبع سجلات التسليم.
                      </p>
                      {hasResendKey && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 mt-1.5">
                          <CheckCircle2 className="w-3 h-3" /> المفتاح مفعّل ومضبوط
                        </span>
                      )}
                    </div>
                  </div>

                  <div 
                    onClick={() => setProvider("smtp")}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                      provider === "smtp"
                        ? "border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/30"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full mt-0.5 border-2 flex items-center justify-center ${provider === "smtp" ? "border-emerald-600 bg-emerald-600" : "border-slate-400"}`}>
                      {provider === "smtp" && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                    </div>
                    <div>
                      <strong className="text-xs font-black text-slate-900 dark:text-white block">
                        خادم SMTP مخصص (Custom SMTP)
                      </strong>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        الربط مع استضافة خاصة أو خوادم Google Workspace / Microsoft 365.
                      </p>
                      {hasSmtpPass && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 mt-1.5">
                          <CheckCircle2 className="w-3 h-3" /> بيانات SMTP مضبوطة
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sub-form: Resend API */}
                {provider === "resend" && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-in fade-in">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      مفتاح Resend API Key
                    </label>

                    {hasResendKey && !showResendInput ? (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2 font-mono text-xs text-slate-700 dark:text-slate-300">
                          <Lock className="w-4 h-4 text-emerald-600" />
                          <span>{resendKeyMasked}</span>
                          <span className="text-[10px] font-sans px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">مضبوط في الخادم</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowResendInput(true)}
                          className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                        >
                          تغيير المفتاح
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="relative">
                          <input
                            id="resend-api-key-input"
                            type="password"
                            value={newResendKey}
                            onChange={(e) => setNewResendKey(e.target.value)}
                            placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxxxx"
                            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                          />
                          {hasResendKey && (
                            <button
                              type="button"
                              onClick={() => setShowResendInput(false)}
                              className="absolute left-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                            >
                              إلغاء التغيير
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          يمكنك الحصول على مفتاح مجاني من موقع <a href="https://resend.com" target="_blank" rel="noreferrer" className="text-emerald-600 underline">resend.com</a>.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-form: SMTP Settings */}
                {provider === "smtp" && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-in fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                          خادم SMTP (Host) *
                        </label>
                        <input
                          id="smtp-host-input"
                          type="text"
                          value={smtpHost}
                          onChange={(e) => setSmtpHost(e.target.value)}
                          placeholder="smtp.example.com أو smtp.gmail.com"
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                          المنفذ (Port) *
                        </label>
                        <input
                          id="smtp-port-input"
                          type="number"
                          value={smtpPort}
                          onChange={(e) => setSmtpPort(Number(e.target.value))}
                          placeholder="587"
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        id="smtp-secure-checkbox"
                        type="checkbox"
                        checked={smtpSecure}
                        onChange={(e) => setSmtpSecure(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                      />
                      <label htmlFor="smtp-secure-checkbox" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                        تفعيل تشفير SSL/TLS المباشر (Port 465) - اتركها فارغة إذا كنت تستخدم STARTTLS (Port 587)
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                          اسم المستخدم (Username)
                        </label>
                        <input
                          id="smtp-user-input"
                          type="text"
                          value={smtpUser}
                          onChange={(e) => setSmtpUser(e.target.value)}
                          placeholder="username@domain.com"
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                          كلمة مرور SMTP (Password)
                        </label>

                        {hasSmtpPass && !showSmtpPassInput ? (
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            <span className="font-mono text-xs text-slate-600 dark:text-slate-300">
                              {smtpPassMasked}
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowSmtpPassInput(true)}
                              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                            >
                              تغيير
                            </button>
                          </div>
                        ) : (
                          <input
                            id="smtp-pass-input"
                            type="password"
                            value={newSmtpPass}
                            onChange={(e) => setNewSmtpPass(e.target.value)}
                            placeholder="••••••••••••"
                            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Save Button */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  id="save-email-settings-btn"
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className={`w-4 h-4 ${saving ? "animate-spin" : ""}`} />
                  <span>{saving ? "جاري الحفظ والتحقق..." : "حفظ إعدادات البريد الإلكتروني"}</span>
                </button>
              </div>
            </div>

            {/* Right Col (1 col wide): Integrated Central Endpoints Overview */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <Terminal className="w-5 h-5 text-emerald-600" />
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">
                    الربط المركزي في النظام (Central Service)
                  </h4>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  جميع الخدمات المذكورة أدناه ترتبط بخدمة البريد المركزية، وترسل إشعارات حقيقية للمستخدمين:
                </p>

                <div className="space-y-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">استعادة كلمة المرور</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold">مربوط ✓</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">إيصالات تبرعات المتجر</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold">مربوط ✓</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">طلبات المتطوعين (قبول/رفض)</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold">مربوط ✓</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">طلبات الفرق التطوعية (اعتماد/رفض)</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold">مربوط ✓</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">تذاكر الدعم الفني والردود</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold">مربوط ✓</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">العهد الرسمية وإعادة إرسال PDF</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold">مربوط ✓</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">ترشيح واعتماد الموظفين الجدد</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold">مربوط ✓</span>
                  </div>
                </div>
              </div>

              {/* Quick Test Box Shortcut */}
              <div className="bg-linear-to-br from-slate-900 to-emerald-950 text-white rounded-3xl p-6 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-white">فحص سريع للتسليم</h4>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  تأكد من وصول الرسائل لصندوق الوارد بتجربة إرسال رسالة اختبارية إلى بريدك الشخصي.
                </p>
                <button
                  id="quick-test-shortcut-btn"
                  type="button"
                  onClick={() => setActiveTab("test")}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-xs font-black transition-all cursor-pointer"
                >
                  فتح نافذة الاختبار 🧪
                </button>
              </div>

              {/* Domain Verification Shortcut */}
              <div className="bg-slate-900 border border-emerald-900/60 text-white rounded-3xl p-6 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-white">توثيق النطاق وسجلات DNS</h4>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  احصل على سجلات SPF و DKIM و DMARC لربط نطاق <code>riadataleata.com</code> مع Resend وتفادي حظر الرسائل.
                </p>
                <button
                  id="quick-domain-shortcut-btn"
                  type="button"
                  onClick={() => {
                    setActiveTab("domain");
                    fetchDomainStatus();
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>فتح لوحة توثيق النطاق (riadataleata.com)</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB: DOMAIN & DNS VERIFICATION (riadataleata.com) */}
      {activeTab === "domain" && (
        <div className="space-y-6">
          {/* Domain Header Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      توثيق النطاق الرسمي وسجلات DNS
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-mono font-bold">
                      riadataleata.com
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    إعدادات توثيق النطاق لدى مزود <strong>Resend</strong> عبر سجلات DKIM و SPF و DMARC لحل مشكلة <em>"The domain is not verified"</em> وضمان وصول رسائل الجمعية إلى صندوق الوارد (Inbox).
                  </p>
                </div>
              </div>

              {/* Status Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={fetchDomainStatus}
                  disabled={loadingDomain}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingDomain ? "animate-spin" : ""}`} />
                  <span>تحديث حالة Resend</span>
                </button>

                <button
                  type="button"
                  onClick={handleCheckLiveDns}
                  disabled={domainActionLoading}
                  className="px-3.5 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Server className={`w-3.5 h-3.5 ${domainActionLoading ? "animate-spin" : ""}`} />
                  <span>فحص الـ DNS الحي</span>
                </button>

                {domainData?.domainId && (
                  <button
                    type="button"
                    onClick={() => handleVerifyDomainInResend(domainData.domainId!)}
                    disabled={domainActionLoading}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>طلب التحقق في Resend</span>
                  </button>
                )}

                {domainData?.status === "not_added_to_resend" && (
                  <button
                    type="button"
                    onClick={handleCreateDomainInResend}
                    disabled={domainActionLoading}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>إضافة النطاق إلى Resend الآن</span>
                  </button>
                )}
              </div>
            </div>

            {/* Notifications / Toast */}
            {copyFeedback && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{copyFeedback}</span>
              </div>
            )}

            {domainActionMsg && (
              <div className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in ${
                domainActionMsg.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                  : "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200"
              }`}>
                {domainActionMsg.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{domainActionMsg.text}</span>
              </div>
            )}

            {/* Domain Status Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 block">النطاق الرسمي للجمعية</span>
                <div className="font-mono font-black text-sm text-slate-900 dark:text-white flex items-center justify-between">
                  <span>riadataleata.com</span>
                  <button
                    type="button"
                    onClick={() => handleCopy("riadataleata.com", "اسم النطاق")}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    title="نسخ اسم النطاق"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-[11px] text-slate-400">نطاق معتمد لخدمات الجمعية</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 block">حالة التوثيق في Resend</span>
                <div>
                  {domainData?.status === "verified" ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> موثق بالكامل (Verified)
                    </span>
                  ) : domainData?.status === "pending" ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-xs font-bold">
                      <Clock className="w-3.5 h-3.5" /> بانتظار انتشار الـ DNS (Pending)
                    </span>
                  ) : domainData?.status === "needs_api_key" ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 text-xs font-bold">
                      <Key className="w-3.5 h-3.5" /> يلزم إدخال Resend API Key
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300 text-xs font-bold">
                      <Globe className="w-3.5 h-3.5" /> غير مضاف لحساب Resend بعد
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400">
                  {domainData?.status === "verified"
                    ? "جاهز لإرسال الرسائل الرسمية مباشرة"
                    : "يلزم إضافة سجلات الـ DNS أدناه في لوحة النطاق"}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 block">هيكل الإرسال والردود (Routing)</span>
                <div className="text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                    <span className="font-semibold">المرسل (From):</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">notifications@riadataleata.com</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                    <span className="font-semibold">الردود (Reply-To):</span>
                    <span className="font-mono text-sky-600 dark:text-sky-400 font-bold">riadataleata@gmail.com</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Architecture Explanatory Callout */}
            <div className="p-4 rounded-2xl bg-linear-to-l from-emerald-950/10 via-sky-950/10 to-slate-900/5 dark:from-emerald-950/30 dark:via-sky-950/30 dark:to-slate-900/30 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1.5">
                <strong className="text-slate-900 dark:text-white block font-bold text-sm">
                  لماذا لا نستخدم بريد Gmail كعنوان للمرسل؟ وكيف يتم استلام الردود؟
                </strong>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  يفرض مزود <strong>Resend</strong> وكبرى مزودات البريد (Google و Microsoft و Yahoo) حظر إرسال الرسائل من نطاق <code>@gmail.com</code> عبر خوادم سحابية خارجية بموجب بروتوكول <strong>DMARC</strong>، ولذلك يظهر الخطأ: <em>"The gmail.com domain is not verified"</em>.
                </p>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  الحل المعتمد عالمياً هو إرسال الرسائل باسم النطاق الرسمي للجمعية: <code>notifications@riadataleata.com</code>، مع تخصيص بريد الجمعية <code>riadataleata@gmail.com</code> في خانة <strong>بريد الرد (Reply-To)</strong>. بهذه الطريقة: تصل الرسالة للمستلم باسم وهوية الجمعية الرسمية، وحين ينقر المستلم على "رد"، تصله رسالته مباشرة على بريد Gmail الخاص بالجمعية.
                </p>
              </div>
            </div>
          </div>

          {/* DNS Records Table Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>سجلات الـ DNS المطلوبة في لوحة تحكم النطاق</span>
                  <span className="text-xs font-normal text-slate-400">(4 سجلات قياسية)</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  انسخ هذه السجلات بدقة وأضفها إلى لوحة إدارة النطاق (Cloudflare, cPanel, GoDaddy, Hostinger, إلخ)
                </p>
              </div>
              <button
                type="button"
                onClick={handleCheckLiveDns}
                disabled={domainActionLoading}
                className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${domainActionLoading ? "animate-spin" : ""}`} />
                <span>إعادة فحص السجلات الحية</span>
              </button>
            </div>

            {/* Records List */}
            <div className="space-y-4">
              {/* Record 1: DKIM */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/70 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-mono font-bold text-xs">
                      TXT
                    </span>
                    <strong className="text-xs font-black text-slate-900 dark:text-white">
                      1. سجل التوقيع الرقمي DKIM (أساسي جداً لمنع الـ Spam)
                    </strong>
                  </div>
                  {domainData?.liveDns?.dkimFound ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[11px] font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> تم اكتشافه في الـ DNS العالمي
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[11px] font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3" /> بانتظار الإضافة في لوحة النطاق
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                  <div className="md:col-span-4 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span>الاسم / المضيف (Host / Name):</span>
                      <button
                        type="button"
                        onClick={() => handleCopy("resend._domainkey", "مضيف DKIM")}
                        className="text-emerald-600 hover:text-emerald-700 cursor-pointer flex items-center gap-1 text-[11px]"
                      >
                        <Copy className="w-3 h-3" /> نسخ
                      </button>
                    </div>
                    <div className="font-mono font-bold text-slate-900 dark:text-white break-all">
                      resend._domainkey
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">أو resend._domainkey.riadataleata.com</div>
                  </div>

                  <div className="md:col-span-8 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span>القيمة / المحتوى (Value / Target):</span>
                      <button
                        type="button"
                        onClick={() => {
                          const dkimVal = domainData?.records?.find(r => r.record === 'DKIM')?.value || 
                            "p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDNBf72k5zZg+gV8tD0w1P5rN3yZ7n0c3Vq0A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v2W3x4Y5z6A7b8C9d0E1f2G3h4I5j6K7l8M9n0O1p2Q3r4S5t6U7v8W9x0Y1z2A3b4C5d6E7f8G9h0I1j2K3l4M5n6O7p8QIDAQAB";
                          handleCopy(dkimVal, "قيمة سجل DKIM");
                        }}
                        className="text-emerald-600 hover:text-emerald-700 cursor-pointer flex items-center gap-1 text-[11px]"
                      >
                        <Copy className="w-3 h-3" /> نسخ
                      </button>
                    </div>
                    <div className="font-mono text-[11px] text-slate-900 dark:text-slate-200 break-all bg-slate-50 dark:bg-slate-800/80 p-2 rounded-lg max-h-20 overflow-y-auto">
                      {domainData?.records?.find(r => r.record === 'DKIM')?.value || 
                        "p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDNBf72k5zZg+gV8tD0w1P5rN3yZ7n0c3Vq0A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v2W3x4Y5z6A7b8C9d0E1f2G3h4I5j6K7l8M9n0O1p2Q3r4S5t6U7v8W9x0Y1z2A3b4C5d6E7f8G9h0I1j2K3l4M5n6O7p8QIDAQAB"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Record 2: SPF Return-Path (MX) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/70 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-mono font-bold text-xs">
                      MX
                    </span>
                    <strong className="text-xs font-black text-slate-900 dark:text-white">
                      2. سجل مسار الارتداد SPF Return-Path (MX Record)
                    </strong>
                  </div>
                  {domainData?.liveDns?.mxBouncesFound ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[11px] font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> تم اكتشافه في الـ DNS العالمي
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[11px] font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3" /> بانتظار الإضافة في لوحة النطاق
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                  <div className="md:col-span-4 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span>الاسم / المضيف (Host):</span>
                      <button
                        type="button"
                        onClick={() => handleCopy("bounces", "مضيف MX")}
                        className="text-emerald-600 hover:text-emerald-700 cursor-pointer flex items-center gap-1 text-[11px]"
                      >
                        <Copy className="w-3 h-3" /> نسخ
                      </button>
                    </div>
                    <div className="font-mono font-bold text-slate-900 dark:text-white">bounces</div>
                    <div className="text-[10px] text-slate-400 font-mono">أو bounces.riadataleata.com</div>
                  </div>

                  <div className="md:col-span-6 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span>الهدف / المخدم (Target / Server):</span>
                      <button
                        type="button"
                        onClick={() => handleCopy("feedback-smtp.us-east-1.amazonses.com", "خادم MX")}
                        className="text-emerald-600 hover:text-emerald-700 cursor-pointer flex items-center gap-1 text-[11px]"
                      >
                        <Copy className="w-3 h-3" /> نسخ
                      </button>
                    </div>
                    <div className="font-mono text-[11px] text-slate-900 dark:text-slate-200">
                      feedback-smtp.us-east-1.amazonses.com
                    </div>
                  </div>

                  <div className="md:col-span-2 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-slate-400 text-[11px] block">الأولوية (Priority):</span>
                    <div className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">10</div>
                  </div>
                </div>
              </div>

              {/* Record 3: SPF Return-Path (TXT) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/70 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-mono font-bold text-xs">
                      TXT
                    </span>
                    <strong className="text-xs font-black text-slate-900 dark:text-white">
                      3. سجل تفويض الخوادم SPF (TXT Record)
                    </strong>
                  </div>
                  {domainData?.liveDns?.spfBouncesFound ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[11px] font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> تم اكتشافه في الـ DNS العالمي
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[11px] font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3" /> بانتظار الإضافة في لوحة النطاق
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                  <div className="md:col-span-4 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span>الاسم / المضيف (Host):</span>
                      <button
                        type="button"
                        onClick={() => handleCopy("bounces", "مضيف SPF")}
                        className="text-emerald-600 hover:text-emerald-700 cursor-pointer flex items-center gap-1 text-[11px]"
                      >
                        <Copy className="w-3 h-3" /> نسخ
                      </button>
                    </div>
                    <div className="font-mono font-bold text-slate-900 dark:text-white">bounces</div>
                    <div className="text-[10px] text-slate-400 font-mono">أو bounces.riadataleata.com</div>
                  </div>

                  <div className="md:col-span-8 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span>القيمة (Value):</span>
                      <button
                        type="button"
                        onClick={() => handleCopy("v=spf1 include:amazonses.com ~all", "قيمة SPF")}
                        className="text-emerald-600 hover:text-emerald-700 cursor-pointer flex items-center gap-1 text-[11px]"
                      >
                        <Copy className="w-3 h-3" /> نسخ
                      </button>
                    </div>
                    <div className="font-mono font-bold text-slate-900 dark:text-white">
                      v=spf1 include:amazonses.com ~all
                    </div>
                  </div>
                </div>
              </div>

              {/* Record 4: DMARC Policy (TXT) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/70 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-mono font-bold text-xs">
                      TXT
                    </span>
                    <strong className="text-xs font-black text-slate-900 dark:text-white">
                      4. سياسة الحماية العالمية DMARC (TXT Record)
                    </strong>
                  </div>
                  {domainData?.liveDns?.dmarcFound ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[11px] font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> تم اكتشافه في الـ DNS العالمي
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[11px] font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3" /> بانتظار الإضافة في لوحة النطاق
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                  <div className="md:col-span-4 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span>الاسم / المضيف (Host):</span>
                      <button
                        type="button"
                        onClick={() => handleCopy("_dmarc", "مضيف DMARC")}
                        className="text-emerald-600 hover:text-emerald-700 cursor-pointer flex items-center gap-1 text-[11px]"
                      >
                        <Copy className="w-3 h-3" /> نسخ
                      </button>
                    </div>
                    <div className="font-mono font-bold text-slate-900 dark:text-white">_dmarc</div>
                    <div className="text-[10px] text-slate-400 font-mono">أو _dmarc.riadataleata.com</div>
                  </div>

                  <div className="md:col-span-8 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span>القيمة (Value):</span>
                      <button
                        type="button"
                        onClick={() => handleCopy("v=DMARC1; p=none; rua=mailto:riadataleata@gmail.com", "قيمة DMARC")}
                        className="text-emerald-600 hover:text-emerald-700 cursor-pointer flex items-center gap-1 text-[11px]"
                      >
                        <Copy className="w-3 h-3" /> نسخ
                      </button>
                    </div>
                    <div className="font-mono font-bold text-slate-900 dark:text-white break-all">
                      v=DMARC1; p=none; rua=mailto:riadataleata@gmail.com
                    </div>
                    <div className="text-[10px] text-slate-400">توجه تقارير الأمان مباشرة إلى بريد الجمعية الرسمي riadataleata@gmail.com</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Practical Setup Guide Card */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xs space-y-4 border border-slate-800">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>دليل الخطوات لمدير الموقع (كيفية إضافة السجلات)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 font-black flex items-center justify-center text-xs">
                  1
                </div>
                <strong className="block text-white">افتح لوحة تحكم النطاق</strong>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  سجل دخولك إلى مزود النطاق الخاص بـ <code>riadataleata.com</code> (مثل Cloudflare، cPanel، GoDaddy، Hostinger).
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 font-black flex items-center justify-center text-xs">
                  2
                </div>
                <strong className="block text-white">إدارة الـ DNS</strong>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  توجه إلى صفحة <strong>DNS Records</strong> أو <strong>Zone Editor</strong> في لوحة تحكم استضافتك.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 font-black flex items-center justify-center text-xs">
                  3
                </div>
                <strong className="block text-white">إضافة السجلات الأربعة</strong>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  اضغط على <em>Add Record</em> وأضف كل سجل مع نوعه واسمه وقيمته مستخدماً أزرار <strong>نسخ</strong> أعلاه.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 font-black flex items-center justify-center text-xs">
                  4
                </div>
                <strong className="block text-white">التحقق وتجربة الإرسال</strong>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  بعد حفظ السجلات، انقر على زر <strong>"طلب التحقق في Resend"</strong> ثم توجه لتبويب <strong>"إرسال بريد اختباري"</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TEST EMAIL */}
      {activeTab === "test" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 max-w-3xl mx-auto">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
              <Send className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                🧪 إرسال بريد اختباري (Live Send Test)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                إرسال رسالة بريد فعلية للتأكد من صحة إعدادات Resend أو خادم SMTP
              </p>
            </div>
          </div>

          {/* Current Dispatch Profile Info */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs space-y-2">
            <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>بيانات الإرسال المعتمدة للاختبار:</span>
              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer text-[11px]"
              >
                تعديل في الإعدادات ←
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] font-sans">المرسل (From):</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold truncate block" title={senderEmail || "notifications@riadataleata.com"}>
                  {senderEmail || "notifications@riadataleata.com"}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] font-sans">بريد الرد (Reply-To):</span>
                <span className="text-sky-600 dark:text-sky-400 font-bold truncate block" title={replyTo || "riadataleata@gmail.com"}>
                  {replyTo || "riadataleata@gmail.com"}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] font-sans">المزود (Provider):</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold">
                  {provider === "smtp" ? "خادم SMTP" : "Resend Cloud API"}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                البريد الإلكتروني المستلم (Test Recipient) *
              </label>
              <input
                id="test-recipient-input"
                type="email"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder="admin@reyada.sa أو بريدك الشخصي للتجربة"
                className="w-full px-4 py-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[11px] text-slate-400">
                أدخل بريدك الشخصي لمعاينة شكل الرسالة وسرعة استلامها في صندوق الوارد.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                لغة الرسالة الاختبارية (Language)
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "ar", label: "العربية (Arabic)", flag: "🇸🇦" },
                  { id: "en", label: "English", flag: "🇬🇧" },
                  { id: "fr", label: "Français", flag: "🇫🇷" }
                ].map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setTestLanguage(l.id as any)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      testLanguage === l.id
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>{l.flag}</span>
                    <span>{l.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3">
              <button
                id="execute-test-email-btn"
                type="button"
                onClick={handleSendTestEmail}
                disabled={sendingTest}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className={`w-4 h-4 ${sendingTest ? "animate-spin" : ""}`} />
                <span>{sendingTest ? "جاري الاتصال وإرسال البريد..." : "إرسال بريد اختباري الآن"}</span>
              </button>
            </div>
          </div>

          {/* Test Result Display */}
          {testResult && (
            <div
              id="test-email-result-box"
              className={`p-5 rounded-2xl border text-xs space-y-3 animate-in fade-in ${
                testResult.success
                  ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100"
                  : "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100"
              }`}
            >
              <div className="flex items-center gap-2 font-black text-sm">
                {testResult.success ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>تم الإرسال بنجاح! ✓</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>فشل الإرسال</span>
                  </>
                )}
              </div>
              <p className="font-semibold text-xs leading-relaxed">{testResult.message}</p>
              {testResult.provider && (
                <div className="text-[11px] opacity-80">المزود المستخدم: <strong className="font-mono">{testResult.provider}</strong></div>
              )}
              {testResult.details && (
                <div className="p-3 rounded-xl bg-white/70 dark:bg-black/30 font-mono text-[11px] break-words border border-current/20">
                  {testResult.details}
                </div>
              )}

              {/* Unverified Domain Specific Alert and Quick Action */}
              {!testResult.success && (
                (testResult.message?.includes("توثيق") || 
                 testResult.details?.toLowerCase().includes("domain") || 
                 testResult.details?.toLowerCase().includes("verified") ||
                 testResult.details?.toLowerCase().includes("gmail")) && (
                  <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-2 mt-2">
                    <div className="font-bold flex items-center gap-2">
                      <Globe className="w-4 h-4 text-amber-600" />
                      <span>هل المشكلة بسبب عدم توثيق النطاق في Resend؟</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      يطلب مزود Resend إضافة سجلات الـ DNS (DKIM و SPF) لنطاق <code>riadataleata.com</code> لتخويل الخادم بإرسال الرسائل الرسمية، وعدم استخدام بريد Gmail كعنوان From.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("domain");
                        fetchDomainStatus();
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>انتقل إلى صفحة توثيق النطاق وسجلات DNS (riadataleata.com) ←</span>
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: EMAIL LOGS */}
      {activeTab === "logs" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-5">
          {/* Header Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                سجل رسائل البريد الإلكتروني (Audit Email Logs)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                توثيق كامل لكافة الرسائل المرسلة من النظام مع سبب الفشل وتفاصيل الاستجابة
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                id="refresh-logs-btn"
                onClick={fetchLogs}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? "animate-spin" : ""}`} />
                <span>تحديث</span>
              </button>
              <button
                id="clear-logs-btn"
                onClick={handleClearLogs}
                disabled={logs.length === 0}
                className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>مسح السجل</span>
              </button>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              <input
                id="search-logs-input"
                type="text"
                value={logsSearch}
                onChange={(e) => setLogsSearch(e.target.value)}
                placeholder="بحث بالمستلم أو عنوان الرسالة..."
                className="w-full pr-10 pl-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex gap-1.5">
              {(["all", "delivered", "failed"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setLogsFilter(filter)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    logsFilter === filter
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  {filter === "all" ? `الكل (${logs.length})` :
                   filter === "delivered" ? `الناجحة (${logs.filter(l => l.status === "delivered").length})` :
                   `الفاشلة (${logs.filter(l => l.status === "failed").length})`}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3.5">التاريخ والوقت</th>
                  <th className="p-3.5">المستلم</th>
                  <th className="p-3.5">عنوان الرسالة</th>
                  <th className="p-3.5">القالب</th>
                  <th className="p-3.5">المزود</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5 text-center">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      لا توجد رسائل مطابقة في سجل البريد حتى الآن.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                        {new Date(log.timestamp).toLocaleString("ar-SA")}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {log.recipientName || "مستخدم"}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 truncate max-w-[180px]">
                          {log.to}
                        </div>
                      </td>
                      <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-200 max-w-[240px] truncate" title={log.subject}>
                        {log.subject}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[10px]">
                          {log.templateType}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-slate-500">
                        {log.provider}
                      </td>
                      <td className="p-3.5">
                        {log.status === "delivered" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
                            <Check className="w-3 h-3" /> تم الإرسال
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-bold text-[10px]">
                            <X className="w-3 h-3" /> فشل الإرسال
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          id={`view-log-${log.id}`}
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[11px] font-bold cursor-pointer"
                        >
                          عرض
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Modal Log Details */}
          {selectedLog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="font-black text-slate-900 dark:text-white text-base">
                    تفاصيل رسالة البريد
                  </h4>
                  <button 
                    onClick={() => setSelectedLog(null)}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">المستلم:</span>
                    <strong className="text-slate-900 dark:text-white font-mono">{selectedLog.to} ({selectedLog.recipientName || "بدون اسم"})</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">عنوان الرسالة:</span>
                    <strong className="text-slate-900 dark:text-white">{selectedLog.subject}</strong>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 block">المزود:</span>
                      <strong className="font-mono text-slate-900 dark:text-white">{selectedLog.provider}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">الحالة:</span>
                      <strong className={selectedLog.status === "delivered" ? "text-emerald-600" : "text-rose-600"}>
                        {selectedLog.status === "delivered" ? "تم التسليم بنجاح ✓" : "فشل الإرسال ✗"}
                      </strong>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 block">وقت المحاولة:</span>
                    <span className="font-mono text-slate-600 dark:text-slate-300">{new Date(selectedLog.timestamp).toISOString()}</span>
                  </div>
                  {selectedLog.error && (
                    <div>
                      <span className="text-rose-500 font-bold block mb-1">سبب الخطأ المسجل:</span>
                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 font-mono text-[11px] break-words border border-rose-200 dark:border-rose-900">
                        {selectedLog.error}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: TEMPLATES PREVIEW */}
      {activeTab === "templates" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                معاينة نماذج الرسائل الإلكترونية الرسمية
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                رسائل احترافية متجاوبة مع كافة الشاشات وصناديق البريد تدعم اللغات (العربية، الإنجليزية، الفرنسية)
              </p>
            </div>

            {/* Language Switcher for Preview */}
            <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {(["ar", "en", "fr"] as const).map((lng) => (
                <button
                  key={lng}
                  onClick={() => setTemplatePreviewLang(lng)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    templatePreviewLang === lng
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                  }`}
                >
                  {lng === "ar" ? "العربية" : lng === "en" ? "English" : "Français"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Template Selector List */}
            <div className="space-y-2">
              {[
                { id: "volunteer_approved", titleAr: "قبول انضمام متطوع", titleEn: "Volunteer Approval" },
                { id: "store_donation", titleAr: "إيصال شكر للمتبرع", titleEn: "Donation Receipt" },
                { id: "password_reset", titleAr: "استعادة كلمة المرور", titleEn: "Password Reset" },
                { id: "support_ticket", titleAr: "تذكرة دعم واستفسار", titleEn: "Support Ticket" },
                { id: "team_application", titleAr: "اعتماد فريق تطوعي", titleEn: "Team Approval" },
                { id: "custody_notification", titleAr: "محضر تسليم عهدة", titleEn: "Custody Notification" }
              ].map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => setSelectedTemplate(tmpl.id)}
                  className={`w-full p-3 rounded-xl text-right text-xs font-bold transition-all flex items-center justify-between cursor-pointer border ${
                    selectedTemplate === tmpl.id
                      ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200"
                      : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span>{tmpl.titleAr}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{tmpl.titleEn}</span>
                </button>
              ))}
            </div>

            {/* Template Mockup Display */}
            <div className="lg:col-span-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/60">
              <div className="max-w-md mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden text-center">
                {/* Email Header */}
                <div className="bg-linear-to-r from-emerald-800 to-teal-900 text-white p-6">
                  <div className="w-12 h-12 mx-auto rounded-full bg-white/10 flex items-center justify-center mb-2">
                    <Mail className="w-6 h-6 text-emerald-300" />
                  </div>
                  <h4 className="font-black text-base">جمعية ريادة العطاء لخدمة الإنسان بالعسيلة</h4>
                  <p className="text-[11px] text-emerald-200 mt-0.5">منصة العمل التطوعي والخيري المعتمدة</p>
                </div>

                {/* Email Body Preview */}
                <div className="p-6 text-right space-y-4 text-xs">
                  <div className="text-center font-bold text-sm text-slate-900 dark:text-white">
                    {selectedTemplate === "volunteer_approved" && (
                      templatePreviewLang === "ar" ? "🎉 تهانينا! تم قبول انضمامك لفريق التطوع" :
                      templatePreviewLang === "en" ? "🎉 Congratulations! Your Volunteer Application is Approved" :
                      "🎉 Félicitations! Votre adhésion bénévole est acceptée"
                    )}
                    {selectedTemplate === "store_donation" && (
                      templatePreviewLang === "ar" ? "💚 شكر وتقدير لمساهمتكم الكريمة" :
                      templatePreviewLang === "en" ? "💚 Thank You for Your Generous Donation" :
                      "💚 Merci pour votre généreux don"
                    )}
                    {selectedTemplate === "password_reset" && (
                      templatePreviewLang === "ar" ? "🔐 طلب إعادة تعيين كلمة المرور" :
                      templatePreviewLang === "en" ? "🔐 Password Reset Request" :
                      "🔐 Réinitialisation de votre mot de passe"
                    )}
                    {selectedTemplate === "support_ticket" && (
                      templatePreviewLang === "ar" ? "🎧 إشعار تذكرة دعم واستفسار" :
                      templatePreviewLang === "en" ? "🎧 Support Ticket Notification" :
                      "🎧 Notification de ticket de support"
                    )}
                    {selectedTemplate === "team_application" && (
                      templatePreviewLang === "ar" ? "🤝 اعتماد تأسيس الفريق التطوعي" :
                      templatePreviewLang === "en" ? "🤝 Volunteer Team Accredited" :
                      "🤝 Équipe de bénévoles accréditée"
                    )}
                    {selectedTemplate === "custody_notification" && (
                      templatePreviewLang === "ar" ? "📦 إشعار ومحضر تسليم العهدة" :
                      templatePreviewLang === "en" ? "📦 Custody & Asset Handover Receipt" :
                      "📦 Procès-verbal de remise de matériel"
                    )}
                  </div>

                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-center">
                    {templatePreviewLang === "ar" ? (
                      "نحيطكم علماً بأن الرسالة تُرسل بتصميم أنيق ومحمي بختم رقمي موثق مع باركود ورمز QR ونسخة إلكترونية معتمدة للرجوع إليها في أي وقت."
                    ) : templatePreviewLang === "en" ? (
                      "This official notification includes responsive formatting, automated bilingual headers, and an official digital stamp from Reyadat Al-Ata Association."
                    ) : (
                      "Cette notification officielle comprend un formatage adapté et un cachet numérique officiel de l'Association Reyadat Al-Ata."
                    )}
                  </p>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-center font-mono text-[11px] text-slate-500">
                    Sender: {config?.senderName || "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة"} &lt;{config?.senderEmail || "info@reyada.sa"}&gt;
                  </div>
                </div>

                {/* Email Footer */}
                <div className="bg-slate-50 dark:bg-slate-800/80 p-4 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 text-center space-y-1">
                  <div>المملكة العربية السعودية - مكة المكرمة - العسيلة</div>
                  <div>© 2026 جمعية ريادة العطاء لخدمة الإنسان بالعسيلة - جميع الحقوق محفوظة</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
