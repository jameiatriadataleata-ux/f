import React, { useState, useMemo } from "react";
import { 
  Mail, Search, Filter, Eye, Download, CheckCircle, Clock, 
  AlertCircle, FileText, Paperclip, Building, User, Phone, 
  Trash2, Printer, Check, X, Tag, Shield, Calendar, ArrowUpRight
} from "lucide-react";
import { OfficialLetter } from "../types";

export interface AdminLettersManagerProps {
  letters: OfficialLetter[];
  onUpdateLetterStatus: (letterId: string, status: OfficialLetter['status'], adminNotes?: string) => Promise<void>;
  onMarkLetterAsRead: (letterId: string) => Promise<void>;
  onDeleteLetter?: (letterId: string) => Promise<void>;
}

export const AdminLettersManager: React.FC<AdminLettersManagerProps> = ({
  letters = [],
  onUpdateLetterStatus,
  onMarkLetterAsRead,
  onDeleteLetter
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLetter, setSelectedLetter] = useState<OfficialLetter | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<OfficialLetter['status']>('under_review');
  const [isUpdating, setIsUpdating] = useState(false);

  // Helper to format letter source as requested: "قائد — اسم", "موظف — اسم", "زائر — اسم"
  const getSourceType = (letter: OfficialLetter): 'قائد' | 'موظف' | 'زائر' => {
    const st = (letter.senderType || '').toLowerCase();
    if (st.includes('قائد') || letter.userRole === 'leader' || letter.teamId) return 'قائد';
    if (
      st.includes('موظف') || 
      letter.userRole === 'department_admin' || 
      letter.userRole === 'employee' || 
      letter.userRole === 'storekeeper' || 
      letter.departmentId
    ) return 'موظف';
    return 'زائر';
  };

  const formatLetterSource = (letter: OfficialLetter) => {
    const typeLabel = getSourceType(letter);
    return `${typeLabel} — ${letter.senderName}`;
  };

  // Statistics
  const totalLetters = letters.length;
  const unreadLetters = letters.filter(l => !l.isRead || l.status === 'new').length;
  const leaderLetters = letters.filter(l => getSourceType(l) === 'قائد').length;
  const employeeLetters = letters.filter(l => getSourceType(l) === 'موظف').length;
  const visitorLetters = letters.filter(l => getSourceType(l) === 'زائر').length;
  const partnershipLetters = letters.filter(l => l.partnershipDetails && (l.partnershipDetails.whatYouOffer || l.partnershipDetails.whatYouWant)).length;

  // Filtered Letters
  const filteredLetters = useMemo(() => {
    return letters.filter(letter => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = letter.senderName.toLowerCase().includes(q);
        const matchesNumber = letter.letterNumber.toLowerCase().includes(q);
        const matchesPhone = letter.senderPhone.includes(q);
        const matchesOrg = (letter.senderOrganization || "").toLowerCase().includes(q);
        const matchesSubject = (letter.subject || "").toLowerCase().includes(q);
        const matchesSource = formatLetterSource(letter).toLowerCase().includes(q);
        if (!matchesName && !matchesNumber && !matchesPhone && !matchesOrg && !matchesSubject && !matchesSource) {
          return false;
        }
      }

      // Type Filter
      if (typeFilter !== 'all') {
        if (typeFilter === 'partnership') {
          if (!letter.partnershipDetails || (!letter.partnershipDetails.whatYouOffer && !letter.partnershipDetails.whatYouWant)) {
            return false;
          }
        } else {
          const sourceType = getSourceType(letter);
          if (sourceType !== typeFilter) {
            return false;
          }
        }
      }

      // Status Filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'unread') {
          if (letter.isRead && letter.status !== 'new') return false;
        } else if (letter.status !== statusFilter) {
          return false;
        }
      }

      return true;
    });
  }, [letters, searchQuery, typeFilter, statusFilter]);

  const handleOpenLetter = (letter: OfficialLetter) => {
    setSelectedLetter(letter);
    setReviewNotes(letter.adminNotes || "");
    setSelectedStatus(letter.status);

    if (!letter.isRead) {
      onMarkLetterAsRead(letter.id);
    }
  };

  const handleSaveReview = async () => {
    if (!selectedLetter) return;
    setIsUpdating(true);
    try {
      await onUpdateLetterStatus(selectedLetter.id, selectedStatus, reviewNotes);
      setSelectedLetter(prev => prev ? { ...prev, status: selectedStatus, adminNotes: reviewNotes, isRead: true } : null);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: OfficialLetter['status'], isRead: boolean) => {
    if (!isRead || status === 'new') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          جديد وغير مقروء
        </span>
      );
    }
    switch (status) {
      case 'under_review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-700">
            <Clock className="w-3 h-3" />
            قيد المراجعة
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
            <CheckCircle className="w-3 h-3" />
            معتمد ومقبول
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-700">
            <X className="w-3 h-3" />
            مرفوض
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
            مؤرشف
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
            مقروء
          </span>
        );
    }
  };

  const getSenderSourceBadge = (letter: OfficialLetter) => {
    const sourceType = getSourceType(letter);
    if (sourceType === 'قائد') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shadow-2xs whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-purple-600" />
          <span>قائد — {letter.senderName}</span>
        </span>
      );
    }
    if (sourceType === 'موظف') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-indigo-600" />
          <span>موظف — {letter.senderName}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 shadow-2xs whitespace-nowrap">
        <span className="w-2 h-2 rounded-full bg-teal-600" />
        <span>زائر — {letter.senderName}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 rounded-3xl p-6 sm:p-7 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-white/15 text-white text-xs font-bold border border-white/20">
              سجل المراسلات الرسمية
            </span>
            {unreadLetters > 0 && (
              <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black animate-bounce shadow-md">
                {unreadLetters} خطاب جديد
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            الخطابات والمراسلات الواردة
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-2xl font-medium">
            متابعة ومراجعة جميع الخطابات الرسمية الواردة من قادة الفرق التطوعية، الموظفين، والزوار، ومقترحات الشراكة والعطاء
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 text-center min-w-[100px]">
            <span className="text-2xl font-black text-white block">{totalLetters}</span>
            <span className="text-[10px] text-emerald-100 font-bold block">إجمالي الخطابات</span>
          </div>
          <div className="bg-amber-400/20 backdrop-blur-md rounded-2xl p-3 border border-amber-400/30 text-center min-w-[100px]">
            <span className="text-2xl font-black text-amber-300 block">{unreadLetters}</span>
            <span className="text-[10px] text-amber-100 font-bold block">غير مقروءة</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <button
          onClick={() => { setStatusFilter('all'); setTypeFilter('all'); }}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-right shadow-2xs hover:border-emerald-500 cursor-pointer transition-all"
        >
          <span className="text-xs text-slate-500 font-bold block">كل الخطابات</span>
          <span className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1 block">{totalLetters}</span>
          <span className="text-[10px] text-emerald-600 font-bold mt-1 block">السجل الكامل</span>
        </button>

        <button
          onClick={() => { setStatusFilter('unread'); setTypeFilter('all'); }}
          className={`p-4 rounded-2xl border text-right shadow-2xs cursor-pointer transition-all ${
            unreadLetters > 0
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/60'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <span className="text-xs text-amber-800 dark:text-amber-300 font-bold block">جديدة وغير مقروءة</span>
          <span className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1 block">{unreadLetters}</span>
          <span className="text-[10px] text-amber-600 font-bold mt-1 block">تتطلب المراجعة</span>
        </button>

        <button
          onClick={() => { setTypeFilter('قائد'); setStatusFilter('all'); }}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-right shadow-2xs hover:border-purple-500 cursor-pointer transition-all"
        >
          <span className="text-xs text-purple-700 dark:text-purple-300 font-bold block">القادة</span>
          <span className="text-2xl font-black text-purple-800 dark:text-purple-200 mt-1 block">{leaderLetters}</span>
          <span className="text-[10px] text-slate-400 font-bold mt-1 block">قادة الفرق</span>
        </button>

        <button
          onClick={() => { setTypeFilter('موظف'); setStatusFilter('all'); }}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-right shadow-2xs hover:border-indigo-500 cursor-pointer transition-all"
        >
          <span className="text-xs text-indigo-700 dark:text-indigo-300 font-bold block">الموظفون</span>
          <span className="text-2xl font-black text-indigo-800 dark:text-indigo-200 mt-1 block">{employeeLetters}</span>
          <span className="text-[10px] text-slate-400 font-bold mt-1 block">كادر وإدارات الجمعية</span>
        </button>

        <button
          onClick={() => { setTypeFilter('زائر'); setStatusFilter('all'); }}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-right shadow-2xs hover:border-teal-500 cursor-pointer transition-all col-span-2 sm:col-span-1"
        >
          <span className="text-xs text-teal-700 dark:text-teal-300 font-bold block">الزوار</span>
          <span className="text-2xl font-black text-teal-800 dark:text-teal-200 mt-1 block">{visitorLetters}</span>
          <span className="text-[10px] text-slate-400 font-bold mt-1 block">مراسلات خارجية</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3.5">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بمصدر الخطاب، الاسم، الجوال، الموضوع..."
            className="w-full pr-10 pl-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
            <span className="text-[11px] text-slate-500 px-2">المصدر:</span>
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1 rounded-lg cursor-pointer ${typeFilter === 'all' ? 'bg-white dark:bg-slate-700 text-emerald-700 shadow-xs' : 'text-slate-600'}`}
            >
              الكل
            </button>
            <button
              onClick={() => setTypeFilter('قائد')}
              className={`px-2.5 py-1 rounded-lg cursor-pointer ${typeFilter === 'قائد' ? 'bg-white dark:bg-slate-700 text-purple-700 shadow-xs' : 'text-slate-600'}`}
            >
              قائد
            </button>
            <button
              onClick={() => setTypeFilter('موظف')}
              className={`px-2.5 py-1 rounded-lg cursor-pointer ${typeFilter === 'موظف' ? 'bg-white dark:bg-slate-700 text-indigo-700 shadow-xs' : 'text-slate-600'}`}
            >
              موظف
            </button>
            <button
              onClick={() => setTypeFilter('زائر')}
              className={`px-2.5 py-1 rounded-lg cursor-pointer ${typeFilter === 'زائر' ? 'bg-white dark:bg-slate-700 text-teal-700 shadow-xs' : 'text-slate-600'}`}
            >
              زائر
            </button>
            <button
              onClick={() => setTypeFilter('partnership')}
              className={`px-2.5 py-1 rounded-lg cursor-pointer ${typeFilter === 'partnership' ? 'bg-white dark:bg-slate-700 text-amber-700 shadow-xs' : 'text-slate-600'}`}
            >
              شراكات
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
            <span className="text-[11px] text-slate-500 px-2">الحالة:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-hidden py-1 px-1.5"
            >
              <option value="all">كل الحالات</option>
              <option value="unread">جديدة وغير مقروءة</option>
              <option value="under_review">قيد المراجعة</option>
              <option value="approved">معتمد ومقبول</option>
              <option value="rejected">مرفوض</option>
              <option value="archived">مؤرشف</option>
            </select>
          </div>
        </div>
      </div>

      {/* Letters Table / List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        {filteredLetters.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Mail className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              لا توجد خطابات تطابق خيارات البحث الحالية
            </h3>
            <p className="text-xs text-slate-400">
              يمكنك إعادة ضبط الفلاتر أو إرسال خطاب جديد للتجربة
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">رقم الخطاب</th>
                  <th className="py-3 px-4">مصدر الخطاب</th>
                  <th className="py-3 px-4">المرسل والجهة</th>
                  <th className="py-3 px-4">موضوع / نوع الخطاب</th>
                  <th className="py-3 px-4">المرفقات</th>
                  <th className="py-3 px-4">تاريخ ووقت الإرسال</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLetters.map((letter) => {
                  const isUnread = !letter.isRead || letter.status === 'new';
                  return (
                    <tr
                      key={letter.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                        isUnread ? 'bg-amber-50/40 dark:bg-amber-950/20 font-semibold' : ''
                      }`}
                    >
                      {/* Letter Number */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {letter.letterNumber}
                      </td>

                      {/* Letter Source (e.g. قائد — موسى حسن / موظف — محمد أحمد / زائر — أحمد محمد) */}
                      <td className="py-3.5 px-4">
                        {getSenderSourceBadge(letter)}
                      </td>

                      {/* Sender Details */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {letter.senderName}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          {letter.senderOrganization || letter.senderRole || letter.senderPhone}
                        </div>
                      </td>

                      {/* Subject */}
                      <td className="py-3.5 px-4 max-w-xs truncate">
                        <div className="flex items-center gap-1.5 truncate">
                          {letter.submissionType === 'ready_file' ? (
                            <span className="px-1.5 py-0.5 rounded-sm bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0">
                              خطاب جاهز
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-sm bg-blue-100 text-blue-800 text-[10px] font-bold shrink-0">
                              خطاب مخصص
                            </span>
                          )}
                          <span className="truncate text-slate-800 dark:text-slate-200 font-bold">
                            {letter.subject || letter.letterFileName || "بدون عنوان"}
                          </span>
                        </div>
                        {letter.partnershipDetails && (letter.partnershipDetails.whatYouOffer || letter.partnershipDetails.whatYouWant) && (
                          <span className="text-[10px] text-teal-600 font-bold block mt-0.5">
                            ★ يتضمن مقترح شراكة وعطاء
                          </span>
                        )}
                      </td>

                      {/* Attachments */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1">
                          {letter.letterFileUrl && (
                            <span className="p-1 rounded-md bg-slate-100 text-slate-700" title="يحتوي على ملف الخطاب">
                              <FileText className="w-3.5 h-3.5" />
                            </span>
                          )}
                          {letter.attachmentFileUrl && (
                            <span className="p-1 rounded-md bg-slate-100 text-slate-700" title="يحتوي على مرفق إضافي">
                              <Paperclip className="w-3.5 h-3.5" />
                            </span>
                          )}
                          {!letter.letterFileUrl && !letter.attachmentFileUrl && (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                        <div className="font-medium">
                          {new Date(letter.createdAt).toLocaleDateString("ar-SA", {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {new Date(letter.createdAt).toLocaleTimeString("ar-SA", { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(letter.status, letter.isRead)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenLetter(letter)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>معاينة ومراجعة</span>
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

      {/* DETAILED LETTER REVIEW MODAL */}
      {selectedLetter && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 md:p-6" dir="rtl">
          <div
            onClick={() => setSelectedLetter(null)}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
          />

          <div className="relative bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full shadow-2xl z-10 border border-slate-200 dark:border-slate-800 text-right overflow-hidden my-auto max-h-[94vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-white/20">
                      {selectedLetter.letterNumber}
                    </span>
                    {getSenderSourceBadge(selectedLetter)}
                  </div>
                  <h3 className="text-base sm:text-lg font-black mt-1">
                    {selectedLetter.subject || "خطاب رسمي وارد"}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="طباعة الخطاب"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLetter(null)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="إغلاق"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-7 overflow-y-auto space-y-6">
              {/* Official Letterhead Simulation for Printing & View */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">
                    جمعية ريادة العطاء لخدمة الإنسان بالعسيلة
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    منظومة المراسلات والخطابات الرسمية والتعاون المؤسسي
                  </p>
                </div>
                <div className="text-left font-mono text-xs text-slate-500 dark:text-slate-400">
                  <div>تاريخ الإرسال: {new Date(selectedLetter.createdAt).toLocaleDateString('ar-SA')}</div>
                  <div>الوقت: {new Date(selectedLetter.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>

              {/* Sender Details */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-emerald-600" />
                    <span>مصدر الخطاب ومعلومات الاتصال</span>
                  </h4>
                  {getSenderSourceBadge(selectedLetter)}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">مصدر الخطاب:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{formatLetterSource(selectedLetter)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">الاسم الكامل:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{selectedLetter.senderName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">رقم الجوال:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-100" dir="ltr">{selectedLetter.senderPhone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">البريد الإلكتروني:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{selectedLetter.senderEmail || "-"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">المنصب / الوظيفة:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{selectedLetter.senderRole || "-"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">الجهة / المنظمة:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{selectedLetter.senderOrganization || "-"}</span>
                  </div>
                </div>

                {/* Account verification & linkage badge */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-[11px] text-slate-400 font-bold">حالة ربط الحساب بالنظام:</span>
                  {getSourceType(selectedLetter) === 'قائد' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[11px] font-bold">
                      <CheckCircle className="w-3.5 h-3.5 text-purple-600" />
                      <span>حساب قائد فريق موثق {selectedLetter.senderAccountName ? `(فريق: ${selectedLetter.senderAccountName})` : ''}</span>
                    </span>
                  ) : getSourceType(selectedLetter) === 'موظف' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold">
                      <CheckCircle className="w-3.5 h-3.5 text-indigo-600" />
                      <span>حساب موظف إدارة موثق {selectedLetter.senderAccountName ? `(إدارة: ${selectedLetter.senderAccountName})` : ''}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold">
                      <span>زائر خارجي (تم الإرسال من البوابة المفتوحة بدون حساب مسجل)</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Ready Letter File Download/View (if uploaded) */}
              {selectedLetter.submissionType === 'ready_file' && selectedLetter.letterFileUrl && (
                <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                  <h4 className="text-xs font-black text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>ملف الخطاب الجاهز المرفوع</span>
                  </h4>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-emerald-100 dark:border-emerald-900 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {selectedLetter.letterFileName || "ملف الخطاب الرسمي"}
                        </div>
                        {selectedLetter.letterFileSize && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            الحجم: {selectedLetter.letterFileSize}
                          </div>
                        )}
                      </div>
                    </div>

                    <a
                      href={selectedLetter.letterFileUrl}
                      download={selectedLetter.letterFileName || `Letter-${selectedLetter.letterNumber}.pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>تحميل / معاينة الخطاب</span>
                    </a>
                  </div>

                  {/* If it's an image, preview directly */}
                  {selectedLetter.letterFileUrl.startsWith('data:image/') && (
                    <div className="mt-3 p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                      <img
                        src={selectedLetter.letterFileUrl}
                        alt="معاينة الخطاب"
                        className="max-h-96 mx-auto rounded-lg object-contain shadow-xs"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Custom Letter Content */}
              {selectedLetter.submissionType === 'custom_letter' && (
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 space-y-3">
                  <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>محتوى الخطاب والرسالة</span>
                  </h4>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {selectedLetter.messageContent}
                  </div>
                </div>
              )}

              {/* Partnership & Giving Details (تفاصيل الشراكة والعطاء) */}
              {selectedLetter.partnershipDetails && (
                selectedLetter.partnershipDetails.whatYouOffer || 
                selectedLetter.partnershipDetails.whatYouWant ||
                selectedLetter.partnershipDetails.ourRole ||
                selectedLetter.partnershipDetails.yourRole
              ) && (
                <div className="p-4 sm:p-5 rounded-2xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 space-y-3">
                  <h4 className="text-xs font-black text-teal-900 dark:text-teal-200 flex items-center gap-1.5 border-b border-teal-200/60 pb-2">
                    <Building className="w-4 h-4 text-teal-600" />
                    <span>تفاصيل الشراكة والعطاء (مقترح الشراكة)</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                    {selectedLetter.partnershipDetails.whatYouOffer && (
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-teal-100 dark:border-teal-900">
                        <span className="text-teal-700 dark:text-teal-300 font-bold block mb-1">
                          ماذا تقدمون لنا؟ (المساهمة):
                        </span>
                        <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {selectedLetter.partnershipDetails.whatYouOffer}
                        </p>
                      </div>
                    )}

                    {selectedLetter.partnershipDetails.whatYouWant && (
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-teal-100 dark:border-teal-900">
                        <span className="text-teal-700 dark:text-teal-300 font-bold block mb-1">
                          ماذا تريدون منا؟ (الطلب):
                        </span>
                        <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {selectedLetter.partnershipDetails.whatYouWant}
                        </p>
                      </div>
                    )}

                    {selectedLetter.partnershipDetails.ourRole && (
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-teal-100 dark:border-teal-900">
                        <span className="text-teal-700 dark:text-teal-300 font-bold block mb-1">
                          دورنا (ريادة العطاء):
                        </span>
                        <p className="text-slate-700 dark:text-slate-200">
                          {selectedLetter.partnershipDetails.ourRole}
                        </p>
                      </div>
                    )}

                    {selectedLetter.partnershipDetails.yourRole && (
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-teal-100 dark:border-teal-900">
                        <span className="text-teal-700 dark:text-teal-300 font-bold block mb-1">
                          دوركم (الجهة المرسلة):
                        </span>
                        <p className="text-slate-700 dark:text-slate-200">
                          {selectedLetter.partnershipDetails.yourRole}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Additional Attachments */}
              {selectedLetter.attachmentFileUrl && (
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Paperclip className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                        {selectedLetter.attachmentFileName || "ملف مرفق إضافي"}
                      </span>
                      {selectedLetter.attachmentFileSize && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {selectedLetter.attachmentFileSize}
                        </span>
                      )}
                    </div>
                  </div>

                  <a
                    href={selectedLetter.attachmentFileUrl}
                    download={selectedLetter.attachmentFileName || `Attachment-${selectedLetter.letterNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تحميل المرفق</span>
                  </a>
                </div>
              )}

              {/* Admin Review & Decision Section */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-4">
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-700 pb-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>المراجعة الإدارية والقرار</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      حالة الخطاب
                    </label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value as any)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold cursor-pointer"
                    >
                      <option value="under_review">قيد المراجعة</option>
                      <option value="approved">معتمد ومقبول</option>
                      <option value="rejected">مرفوض</option>
                      <option value="archived">أرشفة الخطاب</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ملاحظات وتوجيهات الإدارة
                    </label>
                    <textarea
                      rows={2}
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="أدخل توجيهات المتابعة أو أسباب القرار..."
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium leading-relaxed"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveReview}
                    disabled={isUpdating}
                    className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isUpdating ? "جاري الحفظ..." : "حفظ القرار والملاحظات"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
