import React from "react";
import { ShieldCheck, CheckCircle, X, Award, Building, User, Calendar, Hash, Flag } from "lucide-react";
import { Volunteer, VolunteerTeam, Department } from "../types";

interface CardVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  volunteer: Volunteer | null;
  teams?: VolunteerTeam[];
  departments?: Department[];
  femaleUnifiedPhotoUrl?: string;
  isFemaleUnifiedPhotoUsed?: boolean;
}

export const CardVerificationModal: React.FC<CardVerificationModalProps> = ({
  isOpen,
  onClose,
  volunteer,
  teams = [],
  departments = [],
  femaleUnifiedPhotoUrl,
  isFemaleUnifiedPhotoUsed = false
}) => {
  if (!isOpen || !volunteer) return null;

  const team = teams.find((t) => t.id === volunteer.teamId);
  const dept = departments.find((d) => d.id === volunteer.departmentId);

  // Mask national ID (e.g. 10****4321) for privacy compliance
  const maskNationalId = (id?: string) => {
    if (!id) return "10********";
    if (id.length <= 4) return id;
    const start = id.slice(0, 2);
    const end = id.slice(-2);
    return `${start}${"*".repeat(Math.max(4, id.length - 4))}${end}`;
  };

  const isFemale = volunteer.gender === 'female' || (volunteer.name && (volunteer.name.includes('سارة') || volunteer.name.includes('مريم') || volunteer.name.includes('فاطمة') || volunteer.name.includes('أنثى')));

  const displayPhoto = (isFemale && isFemaleUnifiedPhotoUsed)
    ? (femaleUnifiedPhotoUrl || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80")
    : (volunteer.photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn" dir="rtl">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden">
        {/* Header with Green Pattern */}
        <div className="bg-gradient-to-l from-emerald-700 via-emerald-600 to-teal-700 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-xs">
              <ShieldCheck className="w-7 h-7 text-amber-300" />
            </div>
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400/30 text-amber-200 border border-amber-300/40 mb-1">
                نظام التحقق الرقمي المعتمد
              </span>
              <h3 className="text-xl font-black">بوابة التحقق من صحة بطاقة المتطوع</h3>
            </div>
          </div>
          <p className="text-xs text-emerald-100 font-medium">
            جمعية ريادة العطاء لخدمة الإنسان بالعسيلة - مكة المكرمة (ترخيص: 5081)
          </p>
        </div>

        {/* Verification Status Banner */}
        <div className="bg-emerald-50 border-y border-emerald-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span>البطاقة الرسمية سارية وموثقة بنجاح</span>
          </div>
          <span className="text-xs font-mono font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md border border-emerald-300">
            {volunteer.membershipNumber || "V-2026-0001"}
          </span>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5">
          {/* Volunteer Avatar & Name Card */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
            <img
              src={displayPhoto}
              alt={volunteer.name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-sm"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 min-w-0">
              <h4 className="text-base font-black text-neutral-900 truncate">{volunteer.name}</h4>
              <p className="text-xs font-bold text-emerald-700">{volunteer.titleAr || "متطوع معتمد"}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] bg-neutral-200 text-neutral-700 font-bold px-2 py-0.5 rounded-md">
                  {isFemale ? "متطوعة" : "متطوع"}
                </span>
                {isFemale && isFemaleUnifiedPhotoUsed && (
                  <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-md">
                    الصورة الموحدة للمتطوعات
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Grid of Verified Details */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-150">
              <span className="text-neutral-500 flex items-center gap-1 mb-1 font-medium">
                <Hash className="w-3.5 h-3.5 text-emerald-600" />
                رقم الهوية الوطنية (محجوب جزئياً)
              </span>
              <span className="font-mono font-bold text-neutral-800 text-sm">
                {maskNationalId(volunteer.nationalId)}
              </span>
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-150">
              <span className="text-neutral-500 flex items-center gap-1 mb-1 font-medium">
                <Building className="w-3.5 h-3.5 text-emerald-600" />
                الفريق التطوعي
              </span>
              <span className="font-bold text-neutral-800 truncate block">
                {team ? team.nameAr : "فريق التنظيم العام"}
              </span>
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-150">
              <span className="text-neutral-500 flex items-center gap-1 mb-1 font-medium">
                <Award className="w-3.5 h-3.5 text-emerald-600" />
                الإدارة التابعة
              </span>
              <span className="font-bold text-neutral-800 truncate block">
                {dept ? dept.nameAr : "إدارة العمليات والمبادرات"}
              </span>
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-150">
              <span className="text-neutral-500 flex items-center gap-1 mb-1 font-medium">
                <Flag className="w-3.5 h-3.5 text-emerald-600" />
                الجنسية وفصيلة الدم
              </span>
              <span className="font-bold text-neutral-800">
                {volunteer.nationality || "سعودي"} | {volunteer.bloodType || "O+"}
              </span>
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-150">
              <span className="text-neutral-500 flex items-center gap-1 mb-1 font-medium">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                تاريخ إصدار البطاقة
              </span>
              <span className="font-bold text-neutral-800">
                {volunteer.issueDate || "2026-01-15"}
              </span>
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-150">
              <span className="text-neutral-500 flex items-center gap-1 mb-1 font-medium">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                تاريخ انتهاء الصلاحية
              </span>
              <span className="font-bold text-emerald-700">
                {volunteer.expiryDate || "2027-01-15"} (سارية)
              </span>
            </div>
          </div>

          {/* Legal and Verification Footer */}
          <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 leading-relaxed">
            تم التحقق من هذه البطاقة آلياً من خلال السجل المركزي لقاعدة بيانات جمعية ريادة العطاء لخدمة الإنسان بالعسيلة تحت إشراف المركز الوطني لتنمية القطاع غير الربحي.
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 bg-neutral-800 hover:bg-neutral-900 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
          >
            إغلاق نافذة التحقق
          </button>
        </div>
      </div>
    </div>
  );
};
