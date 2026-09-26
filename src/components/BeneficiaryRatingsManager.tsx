import React, { useState, useMemo } from 'react';
import { 
  Star, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  CheckCircle2, 
  Heart, 
  Calendar, 
  Package, 
  FileText, 
  TrendingUp, 
  Users, 
  Sparkles,
  MessageSquare,
  ChevronDown,
  RotateCcw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { BeneficiaryRating, HomeSettings } from '../types';

interface BeneficiaryRatingsManagerProps {
  ratings: BeneficiaryRating[];
  homeSettings?: HomeSettings;
  lang?: "ar" | "en";
}

export const BeneficiaryRatingsManager: React.FC<BeneficiaryRatingsManagerProps> = ({
  ratings = [],
  homeSettings,
  lang = "ar"
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStars, setSelectedStars] = useState<string>('all');
  const [selectedAidType, setSelectedAidType] = useState<string>('all');

  // Calculate High-Level Metrics
  const stats = useMemo(() => {
    const total = ratings.length;
    if (total === 0) {
      return {
        total: 0,
        average: 0,
        satisfactionRate: 0,
        starCounts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        notesCount: 0
      };
    }

    const sum = ratings.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    const average = (sum / total).toFixed(1);
    const highRatings = ratings.filter(r => r.rating >= 4).length;
    const satisfactionRate = Math.round((highRatings / total) * 100);

    const starCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let notesCount = 0;
    ratings.forEach(r => {
      const rounded = Math.round(Number(r.rating) || 5);
      if (starCounts[rounded] !== undefined) {
        starCounts[rounded]++;
      }
      if (r.notes && r.notes.trim().length > 0) {
        notesCount++;
      }
    });

    return {
      total,
      average: Number(average),
      satisfactionRate,
      starCounts,
      notesCount
    };
  }, [ratings]);

  // Unique Aid Types for filtering
  const aidTypesList = useMemo(() => {
    const set = new Set<string>();
    ratings.forEach(r => {
      if (r.aidType) set.add(r.aidType);
    });
    return Array.from(set);
  }, [ratings]);

  // Filtered List
  const filteredRatings = useMemo(() => {
    return ratings.filter(item => {
      const matchSearch = 
        (item.beneficiaryName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.nationalId || '').includes(searchTerm) ||
        (item.phone || '').includes(searchTerm) ||
        (item.aidTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.aidType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.notes || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchStar = selectedStars === 'all' || String(item.rating) === selectedStars;
      const matchType = selectedAidType === 'all' || item.aidType === selectedAidType;

      return matchSearch && matchStar && matchType;
    });
  }, [ratings, searchTerm, selectedStars, selectedAidType]);

  // Export to Excel
  const handleExportExcel = () => {
    const dataToExport = filteredRatings.map((r, idx) => ({
      'م': idx + 1,
      'اسم المستفيد': r.beneficiaryName,
      'رقم الهوية': r.nationalId || '-',
      'رقم الجوال': r.phone || '-',
      'نوع المساعدة': r.aidType,
      'عنوان المساعدة': r.aidTitle || '-',
      'تاريخ الاستلام': r.receivedDate,
      'التقييم (من 5)': r.rating,
      'ملاحظات المستفيد': r.notes || 'لا توجد ملاحظات',
      'تاريخ تسجيل التقييم': r.createdAt ? new Date(r.createdAt).toLocaleString('ar-SA') : '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'تقييمات المستفيدين');
    XLSX.writeFile(workbook, `تقييمات_المستفيدين_جمعية_ريادة_العطاء_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-white/15 rounded-2xl backdrop-blur-md ring-1 ring-white/20">
              <Star className="w-8 h-8 text-amber-300 fill-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                  {lang === "ar" ? "تقييمات المستفيدين بعد استلام المساعدة" : "Beneficiary Aid Ratings & Satisfaction"}
                </h1>
                <span className="px-3 py-1 bg-amber-400 text-emerald-950 font-black text-xs rounded-full shadow-xs">
                  {stats.total} {lang === "ar" ? "تقييم" : "Ratings"}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-100/90 font-medium mt-1">
                {lang === "ar" 
                  ? "متابعة مباشرة ومؤشرات جودة الخدمات الميدانية والمساعدات المقدمة للأسر المستفيدة" 
                  : "Direct monitoring of service quality and aid distribution feedback"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
            <button
              onClick={handleExportExcel}
              className="px-4 py-2.5 bg-white text-emerald-900 hover:bg-emerald-50 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-700" />
              <span>{lang === "ar" ? "تصدير إكسل (Excel)" : "Export Excel"}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              title="طباعة التقرير"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Average Rating */}
        <div className="bg-white dark:bg-neutral-800 p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-700 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
              {lang === "ar" ? "متوسط تقييمات المستفيدين" : "Average Rating"}
            </span>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/50 rounded-xl text-amber-500">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-neutral-900 dark:text-white">
              {stats.average || 5.0}
            </span>
            <span className="text-xs font-bold text-neutral-400">/ 5.0</span>
          </div>
          <div className="flex items-center gap-1 mt-2 text-amber-400">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star 
                key={s} 
                className={`w-3.5 h-3.5 ${s <= Math.round(stats.average) ? 'fill-amber-400' : 'text-neutral-300 dark:text-neutral-600'}`} 
              />
            ))}
          </div>
        </div>

        {/* Metric 2: Satisfaction Rate */}
        <div className="bg-white dark:bg-neutral-800 p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-700 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
              {lang === "ar" ? "معدل الرضا العام" : "Satisfaction Rate"}
            </span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {stats.satisfactionRate}%
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-2">
            {lang === "ar" ? "نسبة التقييمات من 4 و 5 نجوم" : "4-5 stars percentage"}
          </p>
        </div>

        {/* Metric 3: Total Evaluations */}
        <div className="bg-white dark:bg-neutral-800 p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-700 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
              {lang === "ar" ? "إجمالي التقييمات المستلمة" : "Total Evaluations"}
            </span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/50 rounded-xl text-blue-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-3xl font-black text-neutral-900 dark:text-white">
              {stats.total}
            </span>
            <span className="text-xs font-bold text-neutral-400">{lang === "ar" ? "عملية استلام" : "Receipts"}</span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-2">
            {lang === "ar" ? "موثقة تلقائياً برقم المساعدة" : "Linked with receipt IDs"}
          </p>
        </div>

        {/* Metric 4: Notes & Comments */}
        <div className="bg-white dark:bg-neutral-800 p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-700 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
              {lang === "ar" ? "ملاحظات واقتراحات المستفيدين" : "Feedback Notes"}
            </span>
            <div className="p-2 bg-teal-50 dark:bg-teal-950/50 rounded-xl text-teal-600">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-3xl font-black text-teal-700 dark:text-teal-400">
              {stats.notesCount}
            </span>
            <span className="text-xs font-bold text-neutral-400">{lang === "ar" ? "ملاحظة مكتوبة" : "Notes"}</span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-2">
            {lang === "ar" ? "اقتراحات تطويرية مباشرة" : "Constructive user suggestions"}
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-neutral-800 p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-700 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={lang === "ar" ? "ابحث باسم المستفيد، رقم الهوية، نوع المساعدة أو الملاحظات..." : "Search by name, ID, aid type, or notes..."}
            className="w-full text-xs pr-9 pl-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/50 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Star Filter */}
          <select
            value={selectedStars}
            onChange={(e) => setSelectedStars(e.target.value)}
            className="text-xs px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 font-semibold focus:outline-hidden cursor-pointer"
          >
            <option value="all">{lang === "ar" ? "جميع النجوم (1-5)" : "All Ratings"}</option>
            <option value="5">⭐⭐⭐⭐⭐ 5 نجوم (ممتاز)</option>
            <option value="4">⭐⭐⭐⭐ 4 نجوم (جيد جداً)</option>
            <option value="3">⭐⭐⭐ 3 نجوم (جيد)</option>
            <option value="2">⭐⭐ 2 نجوم (مقبول)</option>
            <option value="1">⭐ نجمة واحدة (يحتاج تحسين)</option>
          </select>

          {/* Aid Type Filter */}
          {aidTypesList.length > 0 && (
            <select
              value={selectedAidType}
              onChange={(e) => setSelectedAidType(e.target.value)}
              className="text-xs px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 font-semibold focus:outline-hidden cursor-pointer"
            >
              <option value="all">{lang === "ar" ? "جميع أنواع المساعدات" : "All Aid Types"}</option>
              {aidTypesList.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          )}

          {(searchTerm || selectedStars !== 'all' || selectedAidType !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedStars('all');
                setSelectedAidType('all');
              }}
              className="p-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl transition-colors cursor-pointer"
              title="إعادة التعيين"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Ratings Table / List */}
      <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200/80 dark:border-neutral-700 shadow-xs overflow-hidden">
        {filteredRatings.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 bg-neutral-100 dark:bg-neutral-700 rounded-full flex items-center justify-center text-neutral-400">
              <Star className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
              {lang === "ar" ? "لا توجد تقييمات مطابقة لخيارات البحث" : "No evaluations found"}
            </h3>
            <p className="text-xs text-neutral-400">
              {lang === "ar" ? "تظهر هنا التقييمات فور قيام المستفيد بتأكيد الاستلام والتقييم عبر بوابته الخاصة." : "Evaluations will appear here once submitted by beneficiaries."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50/90 dark:bg-neutral-900/60 text-neutral-500 dark:text-neutral-400 border-b border-neutral-200/80 dark:border-neutral-700">
                  <th className="p-3.5 font-bold">{lang === "ar" ? "المستفيد" : "Beneficiary"}</th>
                  <th className="p-3.5 font-bold">{lang === "ar" ? "نوع المساعدة وتفاصيلها" : "Aid Type & Details"}</th>
                  <th className="p-3.5 font-bold">{lang === "ar" ? "تاريخ الاستلام" : "Receipt Date"}</th>
                  <th className="p-3.5 font-bold">{lang === "ar" ? "التقييم (النجوم)" : "Rating"}</th>
                  <th className="p-3.5 font-bold">{lang === "ar" ? "ملاحظات المستفيد" : "Notes"}</th>
                  <th className="p-3.5 font-bold">{lang === "ar" ? "وقت التسجيل" : "Recorded At"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/60">
                {filteredRatings.map((ratingItem) => (
                  <tr key={ratingItem.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-700/30 transition-colors">
                    {/* Beneficiary Info */}
                    <td className="p-3.5">
                      <div className="flex flex-col">
                        <span className="font-bold text-neutral-900 dark:text-white">
                          {ratingItem.beneficiaryName}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-0.5">
                          {ratingItem.nationalId && <span>هوية: {ratingItem.nationalId}</span>}
                          {ratingItem.phone && <span>• جوال: {ratingItem.phone}</span>}
                        </div>
                      </div>
                    </td>

                    {/* Aid Type & Title */}
                    <td className="p-3.5">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="font-bold text-neutral-800 dark:text-neutral-200">
                            {ratingItem.aidType}
                          </span>
                        </div>
                        {ratingItem.aidTitle && ratingItem.aidTitle !== ratingItem.aidType && (
                          <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                            {ratingItem.aidTitle}
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-neutral-400">
                          معرف: {ratingItem.aidId}
                        </span>
                      </div>
                    </td>

                    {/* Receipt Date */}
                    <td className="p-3.5 font-mono text-neutral-600 dark:text-neutral-300 font-semibold whitespace-nowrap">
                      {ratingItem.receivedDate}
                    </td>

                    {/* Stars */}
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star 
                            key={s} 
                            className={`w-3.5 h-3.5 ${s <= ratingItem.rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-300 dark:text-neutral-600'}`} 
                          />
                        ))}
                        <span className="mr-1.5 font-bold text-amber-600 dark:text-amber-400 text-[11px]">
                          ({ratingItem.rating}/5)
                        </span>
                      </div>
                    </td>

                    {/* Beneficiary Notes */}
                    <td className="p-3.5 max-w-sm">
                      {ratingItem.notes ? (
                        <div className="p-2 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-800/40 text-neutral-800 dark:text-neutral-200 text-xs leading-relaxed">
                          "{ratingItem.notes}"
                        </div>
                      ) : (
                        <span className="text-neutral-400 text-[11px] italic">
                          {lang === "ar" ? "لا توجد ملاحظات إضافية" : "No written notes"}
                        </span>
                      )}
                    </td>

                    {/* Timestamp */}
                    <td className="p-3.5 font-mono text-[11px] text-neutral-400 whitespace-nowrap">
                      {ratingItem.createdAt ? new Date(ratingItem.createdAt).toLocaleDateString('ar-SA') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
