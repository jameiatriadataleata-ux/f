import React from "react";
import { Lock, ShieldAlert, ArrowRight, ArrowLeft } from "lucide-react";

interface AccessDeniedCardProps {
  pageTitle?: string;
  departmentName?: string;
  allowedPages?: { id: string; label: string }[];
  onNavigateToAllowed?: (pageId: string) => void;
  onGoBack?: () => void;
}

export const AccessDeniedCard: React.FC<AccessDeniedCardProps> = ({
  pageTitle,
  departmentName,
  allowedPages = [],
  onNavigateToAllowed,
  onGoBack
}) => {
  return (
    <div className="min-h-[350px] p-6 sm:p-10 flex items-center justify-center text-right font-sans" dir="rtl">
      <div className="max-w-xl w-full bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/40 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 animate-fade-in">
        {/* Header Icon & Message */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center shrink-0 text-rose-600 shadow-sm">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-rose-700 dark:text-rose-400">
              ليس لديك صلاحية للوصول إلى هذه الصفحة.
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {pageTitle ? `الصفحة المطلوبة: (${pageTitle}). ` : ""}
              حسابك الحالي لا يمتلك الإذن الكافي لعرض هذا القسم
              {departmentName ? ` التابع لـ (${departmentName})` : ""}.
              يرجى التواصل مع مدير الإدارة أو الإدارة العامة لمنحك الصلاحية اللازمة.
            </p>
          </div>
        </div>

        {/* Allowed Pages Shortcuts */}
        {allowedPages.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
              الأقسام المصرح لك بالوصول إليها حالياً:
            </span>
            <div className="flex flex-wrap gap-2">
              {allowedPages.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => onNavigateToAllowed?.(page.id)}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{page.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Back Button */}
        {onGoBack && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onGoBack}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة إلى القسم السابق</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
