import React, { useState } from 'react';
import { 
  Star, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Heart, 
  Calendar, 
  Package, 
  FileText,
  Sparkles,
  Loader2
} from 'lucide-react';
import { BeneficiaryRating } from '../types';

interface BeneficiaryRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  aidItem: {
    id: string;
    title?: string;
    type?: string;
    date?: string;
  };
  beneficiary: {
    id: string;
    name: string;
    nationalId?: string;
    phone?: string;
  };
  onSubmit: (ratingData: Partial<BeneficiaryRating>) => Promise<boolean | any>;
  lang?: "ar" | "en";
}

export const BeneficiaryRatingModal: React.FC<BeneficiaryRatingModalProps> = ({
  isOpen,
  onClose,
  aidItem,
  beneficiary,
  onSubmit,
  lang = "ar"
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const getRatingLabel = (val: number) => {
    switch (val) {
      case 5: return lang === "ar" ? "ممتاز ورائع جداً ★★★★★" : "Excellent";
      case 4: return lang === "ar" ? "جيد جداً ★★★★☆" : "Very Good";
      case 3: return lang === "ar" ? "جيد ومناسب ★★★☆☆" : "Good";
      case 2: return lang === "ar" ? "مقبول ★★☆☆☆" : "Fair";
      case 1: return lang === "ar" ? "يحتاج لتحسين وتطوير ★☆☆☆☆" : "Needs Improvement";
      default: return "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      setError(lang === "ar" ? "يرجى تحديد تقييم من 1 إلى 5 نجوم" : "Please choose a rating between 1 and 5 stars");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: Partial<BeneficiaryRating> = {
        beneficiaryId: beneficiary.id,
        beneficiaryName: beneficiary.name,
        nationalId: beneficiary.nationalId || "",
        phone: beneficiary.phone || "",
        aidId: aidItem.id,
        aidType: aidItem.type || "مساعدة عامة",
        aidTitle: aidItem.title || aidItem.type || "المساعدة المستلمة",
        receivedDate: aidItem.date || new Date().toISOString().split("T")[0],
        rating,
        notes: notes.trim()
      };

      const res = await onSubmit(payload);
      if (res && res.error) {
        setError(res.error);
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(err?.message || (lang === "ar" ? "حدث خطأ أثناء إرسال التقييم" : "Error submitting rating"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200/80 dark:border-neutral-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white p-6 relative">
          <button
            onClick={onClose}
            disabled={submitting}
            className="absolute top-5 left-5 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-white/15 rounded-2xl backdrop-blur-xs">
              <Star className="w-6 h-6 text-amber-300 fill-amber-300 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold">
                {lang === "ar" ? "تقييم الخدمة بعد الاستلام" : "Beneficiary Service Rating"}
              </h3>
              <p className="text-xs text-emerald-100/90 font-medium">
                {lang === "ar" ? "رأيك وملاحظاتك تهمنا لتطوير خدمات جمعية ريادة العطاء لخدمة الإنسان بالعسيلة" : "Your feedback helps us improve our charitable services"}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        {success ? (
          <div className="p-8 text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>
            <h4 className="text-base font-bold text-neutral-800 dark:text-neutral-100">
              {lang === "ar" ? "شكراً لك! تم استلام تقييمك بنجاح" : "Thank you! Your feedback has been received"}
            </h4>
            <p className="text-xs text-neutral-500 max-w-sm">
              {lang === "ar" ? "نقدر وقتك وملاحظاتك القيمة، ونسأل الله أن يجعل هذه المساعدات عوناً وخيراً لكم." : "We appreciate your valuable feedback."}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
            {/* Aid Summary Card */}
            <div className="bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl p-4 border border-neutral-200/60 dark:border-neutral-700/60 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500 flex items-center gap-1.5 font-medium">
                  <Package className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{lang === "ar" ? "المساعدة المستلمة:" : "Aid received:"}</span>
                </span>
                <span className="font-bold text-neutral-800 dark:text-neutral-200">
                  {aidItem.title || aidItem.type || "مساعدة إنسانية"}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500 flex items-center gap-1.5 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{lang === "ar" ? "تاريخ الاستلام:" : "Date received:"}</span>
                </span>
                <span className="font-mono text-neutral-700 dark:text-neutral-300 font-semibold">
                  {aidItem.date || new Date().toISOString().split("T")[0]}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-neutral-200/50 dark:border-neutral-700/50">
                <span className="text-neutral-500 font-medium">
                  {lang === "ar" ? "المستفيد المستلم:" : "Beneficiary:"}
                </span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  {beneficiary.name}
                </span>
              </div>
            </div>

            {/* Star Rating Selection */}
            <div className="text-center space-y-3 py-2">
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                {lang === "ar" ? "كم تقيم مستوى الخدمة وجودة وسرعة الاستلام؟" : "How would you rate the service quality and handover?"}
              </label>
              
              <div className="flex items-center justify-center gap-2 sm:gap-3 py-1">
                {[1, 2, 3, 4, 5].map((starVal) => {
                  const active = (hoverRating || rating) >= starVal;
                  return (
                    <button
                      key={starVal}
                      type="button"
                      onClick={() => setRating(starVal)}
                      onMouseEnter={() => setHoverRating(starVal)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1.5 sm:p-2 rounded-2xl hover:scale-115 transition-transform focus:outline-hidden cursor-pointer"
                      title={`${starVal} نجوم`}
                    >
                      <Star 
                        className={`w-9 h-9 sm:w-10 sm:h-10 transition-colors ${
                          active 
                            ? 'text-amber-400 fill-amber-400 drop-shadow-sm' 
                            : 'text-neutral-300 dark:text-neutral-600'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Rating Label */}
              <div className="inline-block px-4 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-200/60 dark:border-amber-800/60 transition-all">
                {getRatingLabel(hoverRating || rating)}
              </div>
            </div>

            {/* Optional Notes / Feedback */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
                <span>{lang === "ar" ? "ملاحظات أو اقتراحات لتطوير الخدمة (اختياري)" : "Notes or suggestions (optional)"}</span>
                <span className="text-[11px] text-neutral-400 font-normal">
                  {notes.length} / 500
                </span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                rows={3}
                placeholder={lang === "ar" ? "أخبرنا برأيك أو أي اقتراح يساهم في تحسين جودة المساعدات وسرعة التسليم مستقبلاً..." : "Share any suggestions or thoughts..."}
                className="w-full text-xs p-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden transition-all resize-none"
              />
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Notice */}
            <p className="text-[11px] text-neutral-400 leading-relaxed text-center">
              {lang === "ar" 
                ? "💡 ملاحظة: لا يمكن إرسال أكثر من تقييم لنفس عملية الاستلام، وسيتم توثيق التقييم في ملفك الإنساني." 
                : "Note: Only one evaluation can be submitted per receipt."}
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{lang === "ar" ? "جاري إرسال التقييم..." : "Submitting..."}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>{lang === "ar" ? "إرسال التقييم" : "Submit Rating"}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="py-3 px-4 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                {lang === "ar" ? "إلغاء" : "Cancel"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
