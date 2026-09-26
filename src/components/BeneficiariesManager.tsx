import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Printer, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ShieldAlert, 
  ChevronDown, 
  RotateCcw, 
  Eye, 
  UserPlus, 
  X, 
  Check, 
  MapPin, 
  Phone, 
  Mail,
  Calendar, 
  AlertCircle, 
  Upload, 
  Barcode, 
  Package,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  ChevronLeft,
  LayoutGrid,
  Table as TableIcon,
  Tag,
  Info,
  Sparkles,
  Hash,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Beneficiary, HomeSettings } from '../types';
import { BeneficiariesImportModal } from './BeneficiariesImportModal';
import { BeneficiaryBarcodeCard } from './BeneficiaryBarcodeCard';

interface BeneficiariesManagerProps {
  beneficiaries: Beneficiary[];
  onUpdateBeneficiaryStatus: (id: string, status: "approved" | "pending" | "rejected") => Promise<boolean>;
  homeSettings?: HomeSettings;
  lang?: "ar" | "en";
  currentUserRole?: string;
  currentUserName?: string;
  onAddNewBeneficiary?: (ben: Partial<Beneficiary>) => Promise<boolean>;
  onImportBeneficiaries?: (beneficiaries: Partial<Beneficiary>[], fileType: 'excel' | 'pdf') => Promise<boolean>;
  onNavigateToDistributions?: () => void;
  activeDistributionsCount?: number;
}

type SortField = 'index' | 'name' | 'nationalId' | 'phone' | 'familySize' | 'createdAt' | 'status';
type SortOrder = 'asc' | 'desc';

export const BeneficiariesManager: React.FC<BeneficiariesManagerProps> = ({
  beneficiaries = [],
  onUpdateBeneficiaryStatus,
  homeSettings,
  lang = "ar",
  currentUserRole = "admin",
  currentUserName = "الإدارة العامة",
  onAddNewBeneficiary,
  onImportBeneficiaries,
  onNavigateToDistributions,
  activeDistributionsCount = 0
}) => {
  // -------------------------------------------------------------
  // Filter and Search states (Requirement 6)
  // -------------------------------------------------------------
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "pending" | "rejected">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month" | "year">("all");
  const [familySizeFilter, setFamilySizeFilter] = useState<"all" | "small" | "medium" | "large">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Sorting states (Requirement 1 & 6)
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Pagination states (Requirement 6)
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number | "all">(25);

  // View mode: Table vs Cards for responsive layouts
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Export menu and modal states
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    if (isExportMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isExportMenuOpen]);

  const [showPdfModal, setShowPdfModal] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedBarcodeBen, setSelectedBarcodeBen] = useState<Beneficiary | null>(null);
  const [selectedDetailsBen, setSelectedDetailsBen] = useState<Beneficiary | null>(null);

  // Add Beneficiary Form Data
  const [newBenData, setNewBenData] = useState({
    name: "",
    nationalId: "",
    phone: "",
    email: "",
    familySize: 4,
    address: "مكة المكرمة - العسيلة",
    category: "أسر متعففة",
    notes: "",
    status: "approved" as "approved" | "pending" | "rejected"
  });

  // Security Check: Authorized roles (Requirement 6)
  const isAuthorizedToExport = useMemo(() => {
    const authorizedRoles = ["admin", "department_admin", "supervisor", "leader", "staff"];
    return authorizedRoles.includes(currentUserRole);
  }, [currentUserRole]);

  // Unique categories extracted from existing data
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    beneficiaries.forEach(b => {
      if (b.category && b.category.trim()) set.add(b.category.trim());
    });
    return Array.from(set);
  }, [beneficiaries]);

  // -------------------------------------------------------------
  // Filtering & Sorting Logic
  // -------------------------------------------------------------
  const filteredBeneficiaries = useMemo(() => {
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    const sevenDaysAgo = new Date(now.getTime() - 7 * oneDay);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * oneDay);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    return beneficiaries
      .filter((ben) => {
        // Status filter
        if (statusFilter !== "all" && ben.status !== statusFilter) {
          return false;
        }

        // Date filter
        if (dateFilter !== "all" && ben.createdAt) {
          const benDate = new Date(ben.createdAt);
          if (!isNaN(benDate.getTime())) {
            if (dateFilter === "today") {
              const todayStr = now.toISOString().split('T')[0];
              const benStr = benDate.toISOString().split('T')[0];
              if (todayStr !== benStr) return false;
            } else if (dateFilter === "week") {
              if (benDate < sevenDaysAgo) return false;
            } else if (dateFilter === "month") {
              if (benDate < thirtyDaysAgo) return false;
            } else if (dateFilter === "year") {
              if (benDate < startOfYear) return false;
            }
          }
        }

        // Family size filter
        if (familySizeFilter === "small" && (ben.familySize > 3)) return false;
        if (familySizeFilter === "medium" && (ben.familySize < 4 || ben.familySize > 6)) return false;
        if (familySizeFilter === "large" && (ben.familySize < 7)) return false;

        // Category filter
        if (categoryFilter !== "all" && ben.category !== categoryFilter) {
          return false;
        }

        // Multi-criteria Search filter (Name, National ID, Phone, Email, Address, Notes)
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase().trim();
          const matchesName = (ben.name || "").toLowerCase().includes(q);
          const matchesId = (ben.nationalId || "").toLowerCase().includes(q);
          const matchesPhone = (ben.phone || "").toLowerCase().includes(q);
          const matchesEmail = (ben.email || "").toLowerCase().includes(q);
          const matchesAddress = (ben.address || "").toLowerCase().includes(q);
          const matchesCategory = (ben.category || "").toLowerCase().includes(q);
          const matchesNotes = (ben.notes || "").toLowerCase().includes(q);
          const matchesBenNum = (ben.beneficiaryNumber || "").toLowerCase().includes(q);
          const matchesBarcode = (ben.barcodeId || "").toLowerCase().includes(q);

          return (
            matchesName || 
            matchesId || 
            matchesPhone || 
            matchesEmail || 
            matchesAddress || 
            matchesCategory || 
            matchesNotes || 
            matchesBenNum || 
            matchesBarcode
          );
        }

        return true;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sortField === 'name') {
          comparison = (a.name || "").localeCompare(b.name || "", "ar");
        } else if (sortField === 'nationalId') {
          comparison = (a.nationalId || "").localeCompare(b.nationalId || "");
        } else if (sortField === 'phone') {
          comparison = (a.phone || "").localeCompare(b.phone || "");
        } else if (sortField === 'familySize') {
          comparison = (Number(a.familySize) || 0) - (Number(b.familySize) || 0);
        } else if (sortField === 'createdAt') {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          comparison = timeA - timeB;
        } else if (sortField === 'status') {
          comparison = (a.status || "").localeCompare(b.status || "");
        }

        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [beneficiaries, statusFilter, dateFilter, familySizeFilter, categoryFilter, searchTerm, sortField, sortOrder]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, dateFilter, familySizeFilter, categoryFilter, rowsPerPage]);

  // Paginated records
  const totalPages = rowsPerPage === 'all' ? 1 : Math.ceil(filteredBeneficiaries.length / (rowsPerPage as number)) || 1;
  const paginatedBeneficiaries = useMemo(() => {
    if (rowsPerPage === 'all') return filteredBeneficiaries;
    const start = (currentPage - 1) * (rowsPerPage as number);
    return filteredBeneficiaries.slice(start, start + (rowsPerPage as number));
  }, [filteredBeneficiaries, currentPage, rowsPerPage]);

  // Quick stats
  const stats = useMemo(() => {
    const total = beneficiaries.length;
    const approved = beneficiaries.filter((b) => b.status === "approved").length;
    const pending = beneficiaries.filter((b) => b.status === "pending").length;
    const rejected = beneficiaries.filter((b) => b.status === "rejected").length;
    const totalIndividuals = beneficiaries.reduce((sum, b) => sum + (Number(b.familySize) || 0), 0);
    return { total, approved, pending, rejected, totalIndividuals };
  }, [beneficiaries]);

  // Status label translation & styling
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "approved":
        return {
          label: lang === "ar" ? "معتمد نشط" : "Approved",
          color: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: CheckCircle2
        };
      case "pending":
        return {
          label: lang === "ar" ? "قيد الدراسة" : "Pending",
          color: "bg-amber-50 text-amber-700 border-amber-200",
          icon: Clock
        };
      case "rejected":
        return {
          label: lang === "ar" ? "موقوف / مرفوض" : "Rejected",
          color: "bg-rose-50 text-rose-700 border-rose-200",
          icon: XCircle
        };
      default:
        return {
          label: status || "-",
          color: "bg-neutral-100 text-neutral-600 border-neutral-200",
          icon: AlertCircle
        };
    }
  };

  // Format Date & Time in Arabic
  const getExportTimestamp = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const timeStr = now.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit'
    });
    return `${dateStr} - الساعة ${timeStr}`;
  };

  // Helper to log export event to server
  const logExportToServer = async (format: "excel" | "pdf", count: number) => {
    try {
      await fetch('/api/db/beneficiaries/export-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: currentUserName,
          role: currentUserRole,
          format,
          count,
          filterStatus: statusFilter !== 'all' ? statusFilter : 'جميع الحالات'
        })
      });
    } catch {
      // Non-blocking
    }
  };

  // Sort toggle handler
  const handleSortToggle = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // -------------------------------------------------------------
  // EXCEL EXPORT ENGINE (SheetJS / xlsx) - Requirements 4 & 7
  // -------------------------------------------------------------
  const handleExportExcel = async () => {
    if (!isAuthorizedToExport) {
      alert("عفوًا، ليس لديك صلاحية تصدير بيانات وسجلات المستفيدين.");
      return;
    }

    setIsExporting(true);
    setIsExportMenuOpen(false);

    try {
      const now = new Date();
      const timestampFormatted = getExportTimestamp();
      const associationName = homeSettings?.associationNameAr || "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة";
      const licenseNumber = homeSettings?.licenseNumber || "100088868";

      // Filter summary description
      let filterSummary = "جميع الحالات المسجلة";
      if (statusFilter === "approved") filterSummary = "المستفيدين المعتمدين فقط";
      if (statusFilter === "pending") filterSummary = "الطلبات قيد الدراسة فقط";
      if (statusFilter === "rejected") filterSummary = "الحالات الموقوفة والمرفوضة فقط";
      if (dateFilter !== "all") {
        const dateLabels: Record<string, string> = {
          today: "اليوم",
          week: "آخر 7 أيام",
          month: "آخر 30 يوماً",
          year: "خلال هذا العام"
        };
        filterSummary += ` | تاريخ التسجيل: ${dateLabels[dateFilter] || dateFilter}`;
      }
      if (categoryFilter !== "all") filterSummary += ` | الفئة: ${categoryFilter}`;
      if (searchTerm.trim()) filterSummary += ` | بحث نصي: "${searchTerm.trim()}"`;

      const totalFamilySum = filteredBeneficiaries.reduce((sum, b) => sum + (Number(b.familySize) || 0), 0);

      // Section 7 Requirement:
      // اسم الجمعية: [اسم الجمعية]
      // رقم الترخيص: [رقم الترخيص]
      // عنوان التقرير: سجل بيانات المستفيدين
      // تاريخ التقرير: [التاريخ]
      // ثم يبدأ جدول البيانات أسفل الرأس بشكل منظم، دون دمج أو خلط يعطل التصفية.
      const worksheetData: any[][] = [
        ["اسم الجمعية:", associationName, "", "", "", "", "", "", "", "", "", "", "", ""],
        ["رقم الترخيص:", `${licenseNumber} - المركز الوطني لتنمية القطاع غير الربحي`, "", "", "", "", "", "", "", "", "", "", "", ""],
        ["عنوان التقرير:", "سجل بيانات المستفيدين المعتمد", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["تاريخ التقرير:", timestampFormatted, "", "", "", "", "", "", "", "", "", "", "", ""],
        ["نطاق التصفية:", filterSummary, "", "", "", "", "", "", "", "", "", "", "", ""],
        ["إجمالي المستفيدين:", `${filteredBeneficiaries.length} مستفيد`, "إجمالي أفراد الأسر:", `${totalFamilySum} فرد`, "", "", "", "", "", "", "", "", "", ""],
        [], // Empty separator row
        [
          "الرقم التسلسلي",
          "اسم المستفيد",
          "رقم الهوية الوطنية",
          "رقم الجوال",
          "البريد الإلكتروني",
          "عدد أفراد الأسرة",
          "العنوان ومقر السكن",
          "فئة الاستحقاق",
          "حالة الملف / الاستحقاق",
          "تاريخ التسجيل بالمنصة",
          "تاريخ الإضافة",
          "الملاحظات",
          "الرقم المرجعي",
          "رمز الباركود"
        ]
      ];

      // Add Data Rows (Row 9 in 1-based indexing)
      filteredBeneficiaries.forEach((ben, index) => {
        const statusArabic = 
          ben.status === "approved" ? "معتمد نشط" :
          ben.status === "pending" ? "قيد الدراسة" : "موقوف / غير معتمد";

        const regDate = ben.createdAt 
          ? new Date(ben.createdAt).toLocaleDateString('ar-SA')
          : "مسجل سابقًا";

        const addedDate = ben.createdAt
          ? new Date(ben.createdAt).toLocaleDateString('ar-SA')
          : "-";

        worksheetData.push([
          index + 1,
          ben.name || "-",
          String(ben.nationalId || "-"),
          String(ben.phone || "-"),
          ben.email || "-",
          Number(ben.familySize) || 1,
          ben.address || "مكة المكرمة - العسيلة",
          ben.category || "أسر متعففة",
          statusArabic,
          regDate,
          addedDate,
          ben.notes || "لا توجد ملاحظات",
          ben.beneficiaryNumber || `BEN-2026-${String(index + 1).padStart(4, '0')}`,
          ben.barcodeId || `BC-BEN-${(ben.nationalId || ben.id).slice(-6)}`
        ]);
      });

      // Summary row at the bottom (Requirement 4.11 & 4.12)
      worksheetData.push([]);
      worksheetData.push([
        "الإجمالي العام",
        `عدد المستفيدين: ${filteredBeneficiaries.length} مستفيد`,
        "",
        "",
        "",
        `إجمالي الأفراد: ${totalFamilySum} فرد`,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        ""
      ]);

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);

      // Set sheet direction to RTL and freeze panes at row 8 (table header)
      ws['!views'] = [{ RTL: true, state: 'frozen', ySplit: 8 }];

      // Enable autofilter on table headers (Row 8, cols A to N)
      const headerRowIndex = 8;
      const lastDataRowIndex = headerRowIndex + filteredBeneficiaries.length;
      ws['!autofilter'] = { ref: `A${headerRowIndex}:N${lastDataRowIndex}` };

      // Ensure National ID, Phone, BenNum, Barcode are stored explicitly as strings with text format (@)
      // to avoid Excel truncating leading zeros (Requirement 4.10)
      for (let r = headerRowIndex; r < lastDataRowIndex; r++) {
        const cellId = XLSX.utils.encode_cell({ r, c: 2 });
        const cellPhone = XLSX.utils.encode_cell({ r, c: 3 });
        const cellBenNum = XLSX.utils.encode_cell({ r, c: 12 });
        const cellBarcode = XLSX.utils.encode_cell({ r, c: 13 });

        if (ws[cellId]) { ws[cellId].t = 's'; ws[cellId].z = '@'; }
        if (ws[cellPhone]) { ws[cellPhone].t = 's'; ws[cellPhone].z = '@'; }
        if (ws[cellBenNum]) { ws[cellBenNum].t = 's'; ws[cellBenNum].z = '@'; }
        if (ws[cellBarcode]) { ws[cellBarcode].t = 's'; ws[cellBarcode].z = '@'; }
      }

      // Column widths (Requirement 4.6: auto width based on content without text truncation)
      ws['!cols'] = [
        { wch: 14 }, // الرقم التسلسلي
        { wch: 32 }, // اسم المستفيد
        { wch: 20 }, // رقم الهوية
        { wch: 18 }, // رقم الجوال
        { wch: 28 }, // البريد
        { wch: 16 }, // أفراد الأسرة
        { wch: 38 }, // العنوان ومقر السكن
        { wch: 20 }, // فئة الاستحقاق
        { wch: 22 }, // حالة الملف
        { wch: 20 }, // تاريخ التسجيل
        { wch: 20 }, // تاريخ الإضافة
        { wch: 35 }, // الملاحظات
        { wch: 20 }, // الرقم المرجعي
        { wch: 20 }  // رمز الباركود
      ];

      // Append sheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "سجل بيانات المستفيدين");

      // Generate filename with date
      const dateStr = now.toISOString().split('T')[0];
      const fileName = `سجل_بيانات_المستفيدين_جمعية_ريادة_العطاء_${dateStr}.xlsx`;

      // Write and download
      XLSX.writeFile(wb, fileName);

      // Log export action
      await logExportToServer("excel", filteredBeneficiaries.length);

      setExportNotice(`تم بنجاح تحميل ملف Excel مرتباً (${filteredBeneficiaries.length} مستفيد)`);
      setTimeout(() => setExportNotice(null), 4500);
    } catch (err) {
      console.error("Excel export error:", err);
      alert("حدث خطأ أثناء تصدير ملف Excel. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsExporting(false);
    }
  };

  // -------------------------------------------------------------
  // PDF EXPORT / PRINT ENGINE - Requirement 5
  // -------------------------------------------------------------
  const handleOpenPdfModal = () => {
    if (!isAuthorizedToExport) {
      alert("عفوًا، ليس لديك صلاحية تصدير بيانات وسجلات المستفيدين.");
      return;
    }
    setIsExportMenuOpen(false);
    setShowPdfModal(true);
  };

  const handlePrintPdf = async () => {
    await logExportToServer("pdf", filteredBeneficiaries.length);
    window.print();
  };

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setDateFilter("all");
    setFamilySizeFilter("all");
    setCategoryFilter("all");
    setSortField("createdAt");
    setSortOrder("desc");
    setCurrentPage(1);
  };

  const isFiltered = searchTerm.trim() !== "" || 
    statusFilter !== "all" || 
    dateFilter !== "all" || 
    familySizeFilter !== "all" || 
    categoryFilter !== "all";

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* SUCCESS / EXPORT NOTIFICATION BANNER */}
      {exportNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between animate-fade-in shadow-xs">
          <div className="flex items-center gap-2.5 text-emerald-900 font-bold text-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{exportNotice}</span>
          </div>
          <button 
            onClick={() => setExportNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs cursor-pointer p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* HEADER BAR & CONTROLS */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
                <Users className="w-6 h-6" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-neutral-900">
                    {lang === "ar" ? "سجل وبيانات المستفيدين والدعم الاجتماعي" : "Beneficiaries & Social Care Registry"}
                  </h2>
                  <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full font-mono">
                    {beneficiaries.length} مستفيد
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {lang === "ar" 
                    ? "إدارة وتدقيق ملفات المستحقين بمخطط العسيلة، الهوية الوطنية، فئات الدعم، وتصدير التقارير المعتمدة." 
                    : "Manage eligible family records, national IDs, support categories, and certified reports."}
                </p>
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS: IMPORT, DISTRIBUTIONS, ADD BENEFICIARY & EXPORT */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* VIEW MODE TOGGLE */}
            <div className="hidden sm:inline-flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'table' ? "bg-white text-emerald-700 shadow-2xs" : "text-neutral-600 hover:text-neutral-900"
                }`}
                title="عرض الجدول الكامل"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>جدول</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'cards' ? "bg-white text-emerald-700 shadow-2xs" : "text-neutral-600 hover:text-neutral-900"
                }`}
                title="عرض البطاقات"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>بطاقات</span>
              </button>
            </div>

            {/* IMPORT BENEFICIARIES BUTTON (EXCEL / PDF) */}
            {onImportBeneficiaries && (
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-black transition-all cursor-pointer border border-emerald-200 shadow-2xs"
                title="استيراد بيانات المستفيدين من ملف Excel أو PDF وتوليد الباركود تلقائياً"
              >
                <Upload className="w-4 h-4 text-emerald-700" />
                <span>{lang === "ar" ? "استيراد بيانات" : "Import"}</span>
              </button>
            )}

            {/* DISTRIBUTIONS NAVIGATION SHORTCUT */}
            {onNavigateToDistributions && (
              <button
                type="button"
                onClick={onNavigateToDistributions}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs"
                title="الانتقال إلى نظام إدارة توزيعات المساعدات والمسح بالباركود"
              >
                <Package className="w-4 h-4 text-emerald-400" />
                <span>{lang === "ar" ? "التوزيعات" : "Aid Distributions"}</span>
                {activeDistributionsCount > 0 && (
                  <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                    {activeDistributionsCount}
                  </span>
                )}
              </button>
            )}

            {/* ADD BENEFICIARY BUTTON */}
            {onAddNewBeneficiary && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold transition-all cursor-pointer border border-neutral-200"
              >
                <UserPlus className="w-4 h-4 text-neutral-600" />
                <span>{lang === "ar" ? "إضافة مستفيد" : "Add Beneficiary"}</span>
              </button>
            )}

            {/* EXPORT DATA BUTTON WITH DROPDOWN */}
            <div className={`relative ${isExportMenuOpen ? "z-50" : "z-10"}`} ref={exportMenuRef}>
              <button
                id="export-beneficiaries-btn"
                onClick={() => {
                  if (!isAuthorizedToExport) {
                    alert("عفوًا، عملية تصدير البيانات مقصورة على مديري النظام وإدارة المستفيدين.");
                    return;
                  }
                  setIsExportMenuOpen(!isExportMenuOpen);
                }}
                disabled={isExporting}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm ${
                  isExportMenuOpen 
                    ? "bg-emerald-700 text-white ring-2 ring-emerald-400/30" 
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
                title="تصدير وتحميل بيانات المستفيدين بصيغة Excel أو PDF"
              >
                <Download className="w-4 h-4" />
                <span>{lang === "ar" ? "تصدير البيانات" : "Export Data"}</span>
                <span className="bg-emerald-800/60 text-emerald-100 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                  {filteredBeneficiaries.length}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExportMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {/* DROPDOWN MENU */}
              {isExportMenuOpen && (
                <div 
                  className="absolute left-0 mt-2.5 w-72 bg-white rounded-2xl shadow-2xl border border-neutral-200 p-2 z-50 animate-fade-in text-right dropdown-menu-floating"
                  dir="rtl"
                >
                  <div className="px-3 py-2 border-b border-neutral-100 mb-1">
                    <p className="text-[11px] font-black text-neutral-800">خيارات تصدير التقرير الرسمي</p>
                    <p className="text-[10px] text-neutral-500">
                      سيتم تصدير <strong className="text-emerald-700">{filteredBeneficiaries.length}</strong> سجل مستفيد وفق الفلاتر الحالية
                    </p>
                  </div>

                  {/* OPTION 1: EXCEL */}
                  <button
                    onClick={handleExportExcel}
                    className="w-full flex items-start gap-3 p-2.5 hover:bg-emerald-50/70 rounded-xl text-right transition-colors cursor-pointer group"
                  >
                    <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-neutral-800 group-hover:text-emerald-800">
                          تصدير Excel (.xlsx)
                        </span>
                        <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">RTL مرتب</span>
                      </div>
                      <p className="text-[10px] text-neutral-500 mt-0.5 leading-relaxed">
                        ترويسة مرتبة، تصفية تلقائية، ترميز عربي UTF-8، وحفظ أرقام الهويات والجوالات كاملة.
                      </p>
                    </div>
                  </button>

                  {/* OPTION 2: PDF */}
                  <button
                    onClick={handleOpenPdfModal}
                    className="w-full flex items-start gap-3 p-2.5 hover:bg-rose-50/70 rounded-xl text-right transition-colors cursor-pointer group mt-1"
                  >
                    <div className="p-2 bg-rose-100 text-rose-800 rounded-lg group-hover:bg-rose-600 group-hover:text-white transition-colors shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-neutral-800 group-hover:text-rose-800">
                          معاينة وطباعة PDF
                        </span>
                        <span className="text-[9px] font-bold bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded">رسمي معتمد</span>
                      </div>
                      <p className="text-[10px] text-neutral-500 mt-0.5 leading-relaxed">
                        تنسيق A4 أفقي landscape بدون اقتطاع، تكرار صف العناوين، وخانات التوقيع والختم.
                      </p>
                    </div>
                  </button>

                  <div className="p-2 mt-1 bg-neutral-50 rounded-xl border border-neutral-100 text-[10px] text-neutral-500 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span>تصدير آمن ومسجل بسجل الرقابة الإدارية.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* QUICK STATS TILES */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-neutral-100">
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
            <span className="text-[10.5px] font-bold text-neutral-500 block">إجمالي المستفيدين</span>
            <span className="text-lg font-black text-neutral-800 font-mono">{stats.total}</span>
          </div>
          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
            <span className="text-[10.5px] font-bold text-emerald-700 block">معتمدون ونشطون</span>
            <span className="text-lg font-black text-emerald-800 font-mono">{stats.approved}</span>
          </div>
          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100">
            <span className="text-[10.5px] font-bold text-amber-700 block">قيد الدراسة والمراجعة</span>
            <span className="text-lg font-black text-amber-800 font-mono">{stats.pending}</span>
          </div>
          <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100">
            <span className="text-[10.5px] font-bold text-rose-700 block">موقوفون ومرفوضون</span>
            <span className="text-lg font-black text-rose-800 font-mono">{stats.rejected}</span>
          </div>
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 col-span-2 sm:col-span-1">
            <span className="text-[10.5px] font-bold text-blue-700 block">إجمالي أفراد الأسر</span>
            <span className="text-lg font-black text-blue-800 font-mono">{stats.totalIndividuals} فرد</span>
          </div>
        </div>

        {/* SEARCH & FILTERS TOOLBAR (Requirement 6) */}
        <div className="pt-3 border-t border-neutral-100 space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
            {/* SEARCH INPUT */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث بالاسم، رقم الهوية الوطنية، رقم الجوال، البريد، أو الحي بالعسيلة..."
                className="w-full pr-9 pl-8 py-2.5 bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white border border-neutral-200 rounded-xl text-xs text-neutral-900 outline-none focus:border-emerald-500 transition-all placeholder:text-neutral-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-1 cursor-pointer"
                  title="مسح البحث"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* FILTER CONTROLS GROUP */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* STATUS FILTER */}
              <div className="inline-flex items-center gap-1.5 bg-neutral-50 px-2.5 py-1.5 rounded-xl border border-neutral-200 text-xs">
                <Filter className="w-3.5 h-3.5 text-neutral-500" />
                <span className="text-neutral-500 text-[11px] font-bold">الحالة:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-transparent font-bold text-neutral-800 outline-none cursor-pointer text-xs"
                >
                  <option value="all">جميع الحالات ({beneficiaries.length})</option>
                  <option value="approved">معتمد نشط ({stats.approved})</option>
                  <option value="pending">قيد الدراسة ({stats.pending})</option>
                  <option value="rejected">موقوف/مرفوض ({stats.rejected})</option>
                </select>
              </div>

              {/* REGISTRATION DATE FILTER (Requirement 6) */}
              <div className="inline-flex items-center gap-1.5 bg-neutral-50 px-2.5 py-1.5 rounded-xl border border-neutral-200 text-xs">
                <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                <span className="text-neutral-500 text-[11px] font-bold">التسجيل:</span>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as any)}
                  className="bg-transparent font-bold text-neutral-800 outline-none cursor-pointer text-xs"
                >
                  <option value="all">كل التواريخ</option>
                  <option value="today">المسجلون اليوم</option>
                  <option value="week">آخر 7 أيام</option>
                  <option value="month">آخر 30 يوماً</option>
                  <option value="year">هذا العام (2026)</option>
                </select>
              </div>

              {/* FAMILY SIZE FILTER */}
              <div className="inline-flex items-center gap-1.5 bg-neutral-50 px-2.5 py-1.5 rounded-xl border border-neutral-200 text-xs">
                <span className="text-neutral-500 text-[11px] font-bold">الأسرة:</span>
                <select
                  value={familySizeFilter}
                  onChange={(e) => setFamilySizeFilter(e.target.value as any)}
                  className="bg-transparent font-bold text-neutral-800 outline-none cursor-pointer text-xs"
                >
                  <option value="all">كل الأحجام</option>
                  <option value="small">صغيرة (1 - 3 أفراد)</option>
                  <option value="medium">متوسطة (4 - 6 أفراد)</option>
                  <option value="large">كبيرة (7+ أفراد)</option>
                </select>
              </div>

              {/* CATEGORY FILTER */}
              {availableCategories.length > 0 && (
                <div className="inline-flex items-center gap-1.5 bg-neutral-50 px-2.5 py-1.5 rounded-xl border border-neutral-200 text-xs">
                  <span className="text-neutral-500 text-[11px] font-bold">الفئة:</span>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-transparent font-bold text-neutral-800 outline-none cursor-pointer text-xs"
                  >
                    <option value="all">كافة الفئات</option>
                    {availableCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* ROWS PER PAGE (Requirement 6) */}
              <div className="inline-flex items-center gap-1.5 bg-neutral-50 px-2.5 py-1.5 rounded-xl border border-neutral-200 text-xs">
                <span className="text-neutral-500 text-[11px] font-bold">عرض:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => setRowsPerPage(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="bg-transparent font-bold text-neutral-800 outline-none cursor-pointer text-xs"
                >
                  <option value={10}>10 صفوف</option>
                  <option value={25}>25 صفاً</option>
                  <option value={50}>50 صفاً</option>
                  <option value={100}>100 صف</option>
                  <option value="all">عرض الكل</option>
                </select>
              </div>

              {/* RESET FILTERS */}
              {isFiltered && (
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all cursor-pointer border border-rose-200"
                  title="إلغاء جميع الفلاتر المطبقة"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>إعادة ضبط</span>
                </button>
              )}
            </div>
          </div>

          {/* ACTIVE FILTER STATUS STRIP */}
          {isFiltered && (
            <div className="text-[11px] bg-emerald-50/60 border border-emerald-200 p-2.5 rounded-xl flex items-center justify-between">
              <span className="text-emerald-950 font-medium">
                تم تطبيق الفلاتر: عرض <strong>{filteredBeneficiaries.length}</strong> من أصل <strong>{beneficiaries.length}</strong> مستفيد.
              </span>
              <span className="text-[10.5px] text-emerald-800 font-bold">
                جاهز للتصدير والعرض
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* BENEFICIARIES DATA TABLE / CARDS VIEW (Requirement 1 & 2)     */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'table' ? (
        <div className="bg-white border border-neutral-200 rounded-2xl shadow-xs overflow-hidden">
          {/* HORIZONTAL SCROLL CONTAINER */}
          <div className="overflow-x-auto w-full">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-100/80 text-neutral-700 border-b border-neutral-200 font-bold">
                  
                  {/* 1. الرقم التسلسلي */}
                  <th className="p-3.5 text-center w-14 whitespace-nowrap">
                    <button 
                      onClick={() => handleSortToggle('createdAt')} 
                      className="inline-flex items-center gap-1 hover:text-emerald-700 cursor-pointer font-bold mx-auto"
                      title="ترتيب حسب التسلسل"
                    >
                      <span>#</span>
                      {sortField === 'createdAt' && (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-emerald-600" />
                      )}
                    </button>
                  </th>

                  {/* 2. اسم المستفيد */}
                  <th className="p-3.5 min-w-[200px] whitespace-nowrap">
                    <button 
                      onClick={() => handleSortToggle('name')} 
                      className="inline-flex items-center gap-1 hover:text-emerald-700 cursor-pointer font-bold"
                      title="ترتيب بالاسم"
                    >
                      <span>اسم المستفيد</span>
                      {sortField === 'name' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-neutral-400 opacity-60" />
                      )}
                    </button>
                  </th>

                  {/* 3. رقم الهوية الوطنية */}
                  <th className="p-3.5 min-w-[130px] whitespace-nowrap">
                    <button 
                      onClick={() => handleSortToggle('nationalId')} 
                      className="inline-flex items-center gap-1 hover:text-emerald-700 cursor-pointer font-bold"
                      title="ترتيب برقم الهوية"
                    >
                      <span>رقم الهوية الوطنية</span>
                      {sortField === 'nationalId' && (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-emerald-600" />
                      )}
                    </button>
                  </th>

                  {/* 4. رقم الجوال */}
                  <th className="p-3.5 min-w-[130px] whitespace-nowrap">
                    <span>رقم الجوال</span>
                  </th>

                  {/* 5. البريد الإلكتروني */}
                  <th className="p-3.5 min-w-[160px] whitespace-nowrap">
                    <span>البريد الإلكتروني</span>
                  </th>

                  {/* 6. عدد أفراد الأسرة */}
                  <th className="p-3.5 text-center min-w-[110px] whitespace-nowrap">
                    <button 
                      onClick={() => handleSortToggle('familySize')} 
                      className="inline-flex items-center gap-1 hover:text-emerald-700 cursor-pointer font-bold mx-auto"
                      title="ترتيب بعدد الأفراد"
                    >
                      <span>أفراد الأسرة</span>
                      {sortField === 'familySize' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-neutral-400 opacity-60" />
                      )}
                    </button>
                  </th>

                  {/* 7. العنوان ومقر السكن */}
                  <th className="p-3.5 min-w-[200px]">
                    <span>العنوان ومقر السكن</span>
                  </th>

                  {/* 8. فئة الاستحقاق */}
                  <th className="p-3.5 text-center min-w-[120px] whitespace-nowrap">
                    <span>فئة الاستحقاق</span>
                  </th>

                  {/* 9. حالة الملف / الاستحقاق */}
                  <th className="p-3.5 text-center min-w-[130px] whitespace-nowrap">
                    <button 
                      onClick={() => handleSortToggle('status')} 
                      className="inline-flex items-center gap-1 hover:text-emerald-700 cursor-pointer font-bold mx-auto"
                      title="ترتيب بالحالة"
                    >
                      <span>حالة الملف</span>
                      {sortField === 'status' && (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-emerald-600" />
                      )}
                    </button>
                  </th>

                  {/* 10. تاريخ التسجيل بالمنصة */}
                  <th className="p-3.5 text-center min-w-[120px] whitespace-nowrap">
                    <button 
                      onClick={() => handleSortToggle('createdAt')} 
                      className="inline-flex items-center gap-1 hover:text-emerald-700 cursor-pointer font-bold mx-auto"
                      title="ترتيب بتاريخ التسجيل"
                    >
                      <span>تاريخ التسجيل</span>
                      {sortField === 'createdAt' && (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-emerald-600" />
                      )}
                    </button>
                  </th>

                  {/* 11. الملاحظات */}
                  <th className="p-3.5 min-w-[160px]">
                    <span>الملاحظات</span>
                  </th>

                  {/* 12. الإجراءات والاعتماد */}
                  <th className="p-3.5 text-center min-w-[160px] whitespace-nowrap">
                    <span>الإجراءات</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {paginatedBeneficiaries.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-12 text-center text-neutral-400">
                      <AlertCircle className="w-10 h-10 mx-auto text-neutral-300 mb-2" />
                      <p className="font-bold text-neutral-700 text-sm">لا توجد سجلات مستفيدين تطابق معايير البحث والفلترة.</p>
                      <p className="text-neutral-400 text-xs mt-1">تأكد من كتابة الاسم أو رقم الهوية بشكل صحيح أو قم بإلغاء الفلاتر.</p>
                      <button 
                        onClick={resetFilters}
                        className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-all cursor-pointer border border-emerald-200"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>إعادة ضبط وعرض الكل</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  paginatedBeneficiaries.map((ben, index) => {
                    const status = getStatusInfo(ben.status);
                    const StatusIcon = status.icon;
                    const rowNumber = rowsPerPage === 'all' 
                      ? index + 1 
                      : (currentPage - 1) * (rowsPerPage as number) + index + 1;

                    return (
                      <tr 
                        key={ben.id} 
                        className="hover:bg-neutral-50/80 transition-colors group"
                      >
                        {/* 1. الرقم التسلسلي */}
                        <td className="p-3.5 text-center font-mono text-neutral-400 font-bold whitespace-nowrap">
                          {rowNumber}
                        </td>

                        {/* 2. اسم المستفيد */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0">
                              {ben.name?.trim().charAt(0) || "م"}
                            </div>
                            <div className="min-w-0">
                              <strong className="text-neutral-900 block text-xs font-black truncate max-w-[180px]">
                                {ben.name}
                              </strong>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">
                                  {ben.beneficiaryNumber || `BEN-2026-${String(rowNumber).padStart(4, '0')}`}
                                </span>
                                {ben.barcodeId && (
                                  <span className="text-[9px] font-mono text-neutral-500 bg-neutral-100 px-1.5 py-0.2 rounded">
                                    {ben.barcodeId}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 3. رقم الهوية الوطنية */}
                        <td className="p-3.5 whitespace-nowrap">
                          <span 
                            dir="ltr" 
                            className="font-mono font-bold text-neutral-800 bg-neutral-100 px-2 py-1 rounded-md text-[11px] inline-block tracking-wider"
                          >
                            {ben.nationalId || "-"}
                          </span>
                        </td>

                        {/* 4. رقم الجوال */}
                        <td className="p-3.5 whitespace-nowrap">
                          <span 
                            dir="ltr" 
                            className="font-mono text-neutral-700 text-[11px] font-bold inline-flex items-center gap-1 bg-neutral-50 px-2 py-1 rounded-md border border-neutral-150"
                          >
                            <Phone className="w-3 h-3 text-neutral-400 shrink-0" />
                            <span>{ben.phone || "-"}</span>
                          </span>
                        </td>

                        {/* 5. البريد الإلكتروني */}
                        <td className="p-3.5">
                          {ben.email ? (
                            <span 
                              dir="ltr" 
                              className="font-mono text-neutral-600 text-[11px] inline-flex items-center gap-1 truncate max-w-[170px]" 
                              title={ben.email}
                            >
                              <Mail className="w-3 h-3 text-neutral-400 shrink-0" />
                              <span className="truncate">{ben.email}</span>
                            </span>
                          ) : (
                            <span className="text-neutral-400 text-[11px]">-</span>
                          )}
                        </td>

                        {/* 6. عدد أفراد الأسرة */}
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <span className="inline-block px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full font-bold font-mono text-[11px] border border-blue-150">
                            {ben.familySize || 1} أفراد
                          </span>
                        </td>

                        {/* 7. العنوان ومقر السكن */}
                        <td className="p-3.5">
                          <span className="text-[11px] text-neutral-700 flex items-start gap-1 leading-relaxed max-w-[220px]">
                            <MapPin className="w-3 h-3 text-neutral-400 shrink-0 mt-0.5" />
                            <span className="break-words">{ben.address || "مكة المكرمة - العسيلة"}</span>
                          </span>
                        </td>

                        {/* 8. فئة الاستحقاق */}
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 bg-neutral-100 text-neutral-700 rounded-md text-[10.5px] font-bold border border-neutral-200">
                            {ben.category || "أسر متعففة"}
                          </span>
                        </td>

                        {/* 9. حالة الملف / الاستحقاق */}
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold border ${status.color}`}>
                            <StatusIcon className="w-3 h-3 shrink-0" />
                            <span>{status.label}</span>
                          </span>
                        </td>

                        {/* 10. تاريخ التسجيل بالمنصة */}
                        <td className="p-3.5 text-center whitespace-nowrap font-mono text-[11px] text-neutral-600">
                          {ben.createdAt ? new Date(ben.createdAt).toLocaleDateString('ar-SA') : "-"}
                        </td>

                        {/* 11. الملاحظات */}
                        <td className="p-3.5">
                          <span className="text-[11px] text-neutral-500 block max-w-[160px] truncate" title={ben.notes || "لا توجد ملاحظات"}>
                            {ben.notes || "-"}
                          </span>
                        </td>

                        {/* 12. الإجراءات والاعتماد */}
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {/* Barcode Card Trigger */}
                            <button
                              type="button"
                              onClick={() => setSelectedBarcodeBen(ben)}
                              title="عرض وطباعة بطاقة الباركود الرسمية للمستفيد"
                              className="inline-flex items-center gap-1 px-2 py-1 text-[10.5px] font-bold rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-all cursor-pointer shadow-2xs"
                            >
                              <Barcode className="w-3.5 h-3.5" />
                              <span>الباركود</span>
                            </button>

                            {/* View Full Profile */}
                            <button
                              type="button"
                              onClick={() => setSelectedDetailsBen(ben)}
                              title="عرض كافة تفاصيل المستفيد"
                              className="p-1 text-neutral-500 hover:text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Approve Status */}
                            <button
                              onClick={() => onUpdateBeneficiaryStatus(ben.id, "approved")}
                              title="اعتماد استحقاق المستفيد"
                              className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                                ben.status === "approved"
                                  ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-300"
                              }`}
                            >
                              اعتماد
                            </button>

                            {/* Reject / Suspend */}
                            <button
                              onClick={() => onUpdateBeneficiaryStatus(ben.id, "rejected")}
                              title="إيقاف ملف المستفيد"
                              className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                                ben.status === "rejected"
                                  ? "bg-rose-600 text-white border-rose-600 shadow-2xs"
                                  : "bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-300"
                              }`}
                            >
                              إيقاف
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* TABLE FOOTER / PAGINATION (Requirement 6) */}
          <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-neutral-600 font-medium">
              عرض{" "}
              <strong>
                {filteredBeneficiaries.length === 0 
                  ? 0 
                  : (currentPage - 1) * (rowsPerPage === 'all' ? filteredBeneficiaries.length : rowsPerPage) + 1}
              </strong>
              {" "}-{" "}
              <strong>
                {rowsPerPage === 'all' 
                  ? filteredBeneficiaries.length 
                  : Math.min(currentPage * (rowsPerPage as number), filteredBeneficiaries.length)}
              </strong>
              {" "}من إجمالي{" "}
              <strong className="text-emerald-700 font-bold">{filteredBeneficiaries.length}</strong> مستفيد
            </div>

            {/* PAGINATION CONTROLS */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span>السابق</span>
                </button>

                <div className="flex items-center gap-1 font-mono text-xs">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5 && currentPage > 3) {
                      pageNum = currentPage - 2 + i;
                      if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                    }
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 rounded-lg font-bold transition-all cursor-pointer ${
                          currentPage === pageNum
                            ? "bg-emerald-600 text-white shadow-2xs"
                            : "bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <span className="px-1 text-neutral-400">...</span>
                  )}
                </div>

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>التالي</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* CARDS VIEW FOR RESPONSIVE PREFERENCE */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
            {paginatedBeneficiaries.map((ben, idx) => {
              const status = getStatusInfo(ben.status);
              const StatusIcon = status.icon;
              return (
                <div 
                  key={ben.id} 
                  className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs hover:border-emerald-300 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-neutral-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-sm shrink-0">
                        {ben.name?.charAt(0) || "م"}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-neutral-900 leading-tight">{ben.name}</h4>
                        <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">
                          {ben.beneficiaryNumber || `BEN-2026-${String(idx + 1).padStart(4, '0')}`}
                        </span>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${status.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      <span>{status.label}</span>
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-neutral-600">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-neutral-400 font-bold">الهوية الوطنية:</span>
                      <span dir="ltr" className="font-mono font-bold text-neutral-800 bg-neutral-100 px-1.5 py-0.5 rounded">
                        {ben.nationalId}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-neutral-400 font-bold">رقم الجوال:</span>
                      <span dir="ltr" className="font-mono font-bold text-neutral-700 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-neutral-400" />
                        {ben.phone}
                      </span>
                    </div>

                    {ben.email && (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-neutral-400 font-bold">البريد:</span>
                        <span dir="ltr" className="font-mono text-neutral-700 text-[11px] truncate max-w-[170px]">
                          {ben.email}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-neutral-400 font-bold">أفراد الأسرة:</span>
                      <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md font-mono">
                        {ben.familySize} أفراد
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-2 pt-1">
                      <span className="text-[11px] text-neutral-400 font-bold shrink-0">العنوان:</span>
                      <span className="text-neutral-700 text-left text-[11px] truncate">
                        {ben.address || "مكة المكرمة - العسيلة"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedBarcodeBen(ben)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Barcode className="w-3.5 h-3.5" />
                      <span>بطاقة الباركود</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onUpdateBeneficiaryStatus(ben.id, "approved")}
                        className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                          ben.status === "approved" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        اعتماد
                      </button>
                      <button
                        onClick={() => onUpdateBeneficiaryStatus(ben.id, "rejected")}
                        className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                          ben.status === "rejected" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        إيقاف
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cards Pagination */}
          {totalPages > 1 && (
            <div className="p-4 bg-white rounded-2xl border border-neutral-200 flex items-center justify-between">
              <span className="text-xs text-neutral-600">
                صفحة {currentPage} من {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-neutral-200 text-xs font-bold disabled:opacity-40"
                >
                  السابق
                </button>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-neutral-200 text-xs font-bold disabled:opacity-40"
                >
                  التالي
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FOOTER AUDIT & DATA PRIVACY BANNER */}
      <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-neutral-600 gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>البيانات سرية ومحمية وفق نظام حماية البيانات الشخصية بالقطاع غير الربحي بالمملكة العربية السعودية.</span>
        </div>
        <div className="font-bold text-neutral-700">
          المستخدم المسؤول المصرح: <span className="text-emerald-700 font-black">{currentUserName}</span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PDF REPORT & PRINT PREVIEW MODAL (Requirement 5)              */}
      {/* ------------------------------------------------------------- */}
      {showPdfModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:static print:bg-white animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-6xl border border-neutral-200 shadow-2xl overflow-hidden my-auto print:border-none print:shadow-none print:w-full print:max-w-none">
            
            {/* MODAL ACTION TOOLBAR (Hidden in Print) */}
            <div className="p-4 bg-neutral-900 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-xs sm:text-sm font-black">معاينة التقرير الرسمي لسجل بيانات المستفيدين (PDF)</h3>
                  <p className="text-[10.5px] text-neutral-300">
                    تنسيق A4 أفقي رسمي landscape مع تكرار صف العناوين وإحصائيات الاستحقاق المعتمدة.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintPdf}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة وحفظ PDF</span>
                </button>
                <button
                  onClick={handleExportExcel}
                  className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold rounded-xl inline-flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Excel</span>
                </button>
                <button
                  onClick={() => setShowPdfModal(false)}
                  className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
                  title="إغلاق المعاينة"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* PRINTABLE REPORT SHEET (Rendered in Modal & Printed natively) */}
            <div className="p-6 sm:p-10 space-y-5 text-right print:p-2 bg-white" dir="rtl">
              
              {/* OFFICIAL LETTERHEAD */}
              <div className="border-b-2 border-emerald-700 pb-4">
                <div className="flex items-center justify-between gap-4">
                  
                  {/* NGO Logo & Titles */}
                  <div className="flex items-center gap-3">
                    <img 
                      src={homeSettings?.logoUrl || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=120&h=120&fit=crop"} 
                      alt="Logo"
                      className="w-14 h-14 object-contain rounded-xl border border-neutral-200"
                    />
                    <div>
                      <h1 className="text-sm sm:text-base font-black text-neutral-900 leading-tight">
                        {homeSettings?.associationNameAr || "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة"}
                      </h1>
                      <p className="text-[11px] text-neutral-600 font-bold mt-0.5">
                        المركز الوطني لتنمية القطاع غير الربحي | ترخيص رقم: {homeSettings?.licenseNumber || "100088868"}
                      </p>
                      <p className="text-[10px] text-emerald-800 font-bold">
                        إدارة الرعاية الاجتماعية وشؤون المستفيدين - مكة المكرمة
                      </p>
                    </div>
                  </div>

                  {/* Document Official Header Meta */}
                  <div className="text-left font-mono text-[10.5px] text-neutral-700 space-y-0.5 bg-neutral-50 p-2.5 rounded-xl border border-neutral-200">
                    <div><strong>رقم الوثيقة:</strong> REP-BEN-{new Date().getFullYear()}-{filteredBeneficiaries.length}</div>
                    <div><strong>تاريخ التصدير:</strong> {new Date().toLocaleDateString('ar-SA')}</div>
                    <div><strong>وقت الإصدار:</strong> {new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>

                {/* REPORT TITLE BANNER */}
                <div className="mt-4 text-center bg-emerald-50/90 border border-emerald-200 py-2.5 px-4 rounded-xl">
                  <h2 className="text-sm font-black text-emerald-950">
                    سجل بيانات المستفيدين المعتمد
                  </h2>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    كشف رسمي معتمد بالحالات المسجلة المستحقة للدعم الإنساني والاجتماعي بمخطط العسيلة المكي
                  </p>
                </div>
              </div>

              {/* REPORT METADATA KPI STRIP */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-neutral-50 p-3 rounded-xl border border-neutral-200 text-xs">
                <div>
                  <span className="text-[10px] text-neutral-500 block font-bold">المستخدم المصدر:</span>
                  <span className="font-black text-neutral-900">{currentUserName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 block font-bold">نطاق التصفية:</span>
                  <span className="font-black text-emerald-800">
                    {statusFilter === "all" ? "كافة الحالات" :
                     statusFilter === "approved" ? "المعتمدين فقط" :
                     statusFilter === "pending" ? "قيد الدراسة فقط" : "الموقوفين فقط"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 block font-bold">إجمالي الأسر:</span>
                  <span className="font-black text-neutral-900 font-mono">{filteredBeneficiaries.length} أسرة</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 block font-bold">إجمالي أفراد الأسر:</span>
                  <span className="font-black text-neutral-900 font-mono">
                    {filteredBeneficiaries.reduce((sum, b) => sum + (Number(b.familySize) || 0), 0)} فرد
                  </span>
                </div>
              </div>

              {/* DATA TABLE FOR PDF PRINT */}
              <div className="border border-neutral-300 rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs border-collapse">
                  <thead className="print-table-header">
                    <tr className="bg-neutral-100 text-neutral-800 border-b border-neutral-300 font-bold">
                      <th className="p-2 text-center w-8 border-l border-neutral-300">م</th>
                      <th className="p-2 border-l border-neutral-300">اسم المستفيد</th>
                      <th className="p-2 border-l border-neutral-300">الهوية الوطنية</th>
                      <th className="p-2 border-l border-neutral-300">الجوال</th>
                      <th className="p-2 border-l border-neutral-300">البريد الإلكتروني</th>
                      <th className="p-2 text-center border-l border-neutral-300">الأفراد</th>
                      <th className="p-2 border-l border-neutral-300">العنوان ومقر السكن</th>
                      <th className="p-2 text-center border-l border-neutral-300">الفئة</th>
                      <th className="p-2 text-center border-l border-neutral-300">الحالة</th>
                      <th className="p-2 text-center border-l border-neutral-300">التسجيل</th>
                      <th className="p-2">الملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {filteredBeneficiaries.map((ben, idx) => (
                      <tr key={ben.id} className={`print-row ${idx % 2 === 1 ? "bg-neutral-50/70" : "bg-white"}`}>
                        <td className="p-2 text-center font-mono font-bold text-neutral-600 border-l border-neutral-200">
                          {idx + 1}
                        </td>
                        <td className="p-2 font-bold text-neutral-900 border-l border-neutral-200">
                          {ben.name}
                        </td>
                        <td className="p-2 font-mono text-neutral-800 border-l border-neutral-200 whitespace-nowrap">
                          {ben.nationalId}
                        </td>
                        <td className="p-2 font-mono text-neutral-800 border-l border-neutral-200 whitespace-nowrap">
                          {ben.phone}
                        </td>
                        <td className="p-2 font-mono text-[10px] text-neutral-600 border-l border-neutral-200">
                          {ben.email || "-"}
                        </td>
                        <td className="p-2 text-center font-mono font-bold text-neutral-800 border-l border-neutral-200">
                          {ben.familySize}
                        </td>
                        <td className="p-2 text-neutral-700 border-l border-neutral-200 text-[11px]">
                          {ben.address || "مكة المكرمة - العسيلة"}
                        </td>
                        <td className="p-2 text-center text-[10.5px] border-l border-neutral-200">
                          {ben.category || "أسر متعففة"}
                        </td>
                        <td className="p-2 text-center border-l border-neutral-200">
                          {ben.status === "approved" ? (
                            <span className="text-emerald-800 font-bold">معتمد</span>
                          ) : ben.status === "pending" ? (
                            <span className="text-amber-800 font-bold">قيد الدراسة</span>
                          ) : (
                            <span className="text-rose-800 font-bold">موقوف</span>
                          )}
                        </td>
                        <td className="p-2 text-center font-mono text-[10px] text-neutral-600 border-l border-neutral-200 whitespace-nowrap">
                          {ben.createdAt ? new Date(ben.createdAt).toLocaleDateString('ar-SA') : "-"}
                        </td>
                        <td className="p-2 text-[10px] text-neutral-500 max-w-[140px] truncate">
                          {ben.notes || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* OFFICIAL SIGNATURE AND STAMP BOXES (Requirement 5) */}
              <div className="pt-4 border-t-2 border-neutral-300 grid grid-cols-3 gap-6 text-center text-xs print-row">
                <div className="space-y-6 p-3 border border-neutral-200 rounded-xl bg-neutral-50/50">
                  <span className="block font-bold text-neutral-800">الباحث الاجتماعي المختص</span>
                  <div className="font-mono text-neutral-400 text-[11px]">..............................</div>
                </div>
                <div className="space-y-6 p-3 border border-neutral-200 rounded-xl bg-neutral-50/50">
                  <span className="block font-bold text-neutral-800">مدير إدارة المستفيدين</span>
                  <div className="font-mono text-neutral-400 text-[11px]">أ. مريم الغامدي</div>
                </div>
                <div className="space-y-6 p-3 border border-neutral-200 rounded-xl bg-neutral-50/50 relative">
                  <span className="block font-bold text-neutral-800">الختم الرسمي واعتماد الجمعية</span>
                  <div className="w-14 h-14 mx-auto rounded-full border-2 border-dashed border-emerald-700/60 flex items-center justify-center text-[10px] text-emerald-800 font-bold">
                    ختم الإدارة
                  </div>
                </div>
              </div>

              {/* DOCUMENT FOOTER LEGAL NOTE */}
              <div className="text-center text-[10px] text-neutral-500 pt-2 border-t border-neutral-200">
                صدر هذا التقرير آليًا من النظام الإلكتروني الموحد لجمعية ريادة العطاء لخدمة الإنسان بالعسيلة وهو مستند رسمي معتمد.
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* BENEFICIARY DETAILS MODAL                                      */}
      {/* ------------------------------------------------------------- */}
      {selectedDetailsBen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in text-right" dir="rtl">
          <div className="bg-white rounded-3xl w-full max-w-lg border border-neutral-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-neutral-900">{selectedDetailsBen.name}</h3>
                  <span className="text-[11px] font-mono text-emerald-700">
                    {selectedDetailsBen.beneficiaryNumber || "ملف مستفيد مسجل"}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDetailsBen(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 rounded-xl cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 bg-neutral-50 rounded-xl">
                <span className="text-[10px] text-neutral-400 block font-bold">الهوية الوطنية:</span>
                <span dir="ltr" className="font-mono font-bold text-neutral-800 block text-right">
                  {selectedDetailsBen.nationalId}
                </span>
              </div>
              <div className="p-2.5 bg-neutral-50 rounded-xl">
                <span className="text-[10px] text-neutral-400 block font-bold">رقم الجوال:</span>
                <span dir="ltr" className="font-mono font-bold text-neutral-800 block text-right">
                  {selectedDetailsBen.phone}
                </span>
              </div>
              <div className="p-2.5 bg-neutral-50 rounded-xl">
                <span className="text-[10px] text-neutral-400 block font-bold">البريد الإلكتروني:</span>
                <span className="font-mono text-neutral-800 block truncate">
                  {selectedDetailsBen.email || "غير مسجل"}
                </span>
              </div>
              <div className="p-2.5 bg-neutral-50 rounded-xl">
                <span className="text-[10px] text-neutral-400 block font-bold">عدد أفراد الأسرة:</span>
                <span className="font-black text-blue-700 block font-mono">
                  {selectedDetailsBen.familySize} أفراد
                </span>
              </div>
              <div className="p-2.5 bg-neutral-50 rounded-xl col-span-2">
                <span className="text-[10px] text-neutral-400 block font-bold">العنوان ومقر السكن:</span>
                <span className="text-neutral-800 block font-medium">
                  {selectedDetailsBen.address || "مكة المكرمة - مخطط العسيلة"}
                </span>
              </div>
              <div className="p-2.5 bg-neutral-50 rounded-xl">
                <span className="text-[10px] text-neutral-400 block font-bold">فئة الاستحقاق:</span>
                <span className="text-emerald-800 font-bold block">
                  {selectedDetailsBen.category || "أسر متعففة"}
                </span>
              </div>
              <div className="p-2.5 bg-neutral-50 rounded-xl">
                <span className="text-[10px] text-neutral-400 block font-bold">رمز الباركود:</span>
                <span className="font-mono font-bold text-neutral-700 block">
                  {selectedDetailsBen.barcodeId || "-"}
                </span>
              </div>
              {selectedDetailsBen.notes && (
                <div className="p-2.5 bg-neutral-50 rounded-xl col-span-2">
                  <span className="text-[10px] text-neutral-400 block font-bold">الملاحظات:</span>
                  <span className="text-neutral-800 block">{selectedDetailsBen.notes}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => {
                  setSelectedBarcodeBen(selectedDetailsBen);
                  setSelectedDetailsBen(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-xl text-xs font-bold border border-emerald-200 cursor-pointer"
              >
                <Barcode className="w-4 h-4" />
                <span>بطاقة الباركود</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDetailsBen(null)}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* ADD NEW BENEFICIARY MODAL                                      */}
      {/* ------------------------------------------------------------- */}
      {showAddModal && onAddNewBeneficiary && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg border border-neutral-200 shadow-2xl p-6 text-right space-y-4" dir="rtl">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-neutral-800">إضافة ملف مستفيد جديد</h3>
                  <p className="text-[11px] text-neutral-400">تسجيل بيانات رب الأسرة في النظام</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 rounded-xl cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newBenData.name || !newBenData.nationalId || !newBenData.phone) {
                  alert("يرجى إدخال كافة الحقول الإلزامية");
                  return;
                }
                const ok = await onAddNewBeneficiary({
                  ...newBenData,
                  beneficiaryNumber: `BEN-2026-${String(beneficiaries.length + 1).padStart(4, '0')}`,
                  barcodeId: `BC-BEN-${newBenData.nationalId.trim() || Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                });
                if (ok) {
                  setShowAddModal(false);
                  setNewBenData({
                    name: "",
                    nationalId: "",
                    phone: "",
                    email: "",
                    familySize: 4,
                    address: "مكة المكرمة - العسيلة",
                    category: "أسر متعففة",
                    notes: "",
                    status: "approved"
                  });
                  setExportNotice("تمت إضافة المستفيد بنجاح مع توليد بطاقة الباركود الفريدة.");
                  setTimeout(() => setExportNotice(null), 4000);
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">اسم المستفيد / رب الأسرة *</label>
                <input
                  type="text"
                  required
                  value={newBenData.name}
                  onChange={(e) => setNewBenData({ ...newBenData, name: e.target.value })}
                  placeholder="مثال: عبدالله بن صالح الحربي"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1">رقم الهوية الوطنية *</label>
                  <input
                    type="text"
                    required
                    value={newBenData.nationalId}
                    onChange={(e) => setNewBenData({ ...newBenData, nationalId: e.target.value })}
                    placeholder="10XXXXXXXX"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1">رقم الجوال *</label>
                  <input
                    type="tel"
                    required
                    value={newBenData.phone}
                    onChange={(e) => setNewBenData({ ...newBenData, phone: e.target.value })}
                    placeholder="05XXXXXXXX"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1">عدد أفراد الأسرة</label>
                  <input
                    type="number"
                    min={1}
                    max={25}
                    value={newBenData.familySize}
                    onChange={(e) => setNewBenData({ ...newBenData, familySize: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1">فئة الاستحقاق</label>
                  <select
                    value={newBenData.category}
                    onChange={(e) => setNewBenData({ ...newBenData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs outline-none focus:border-emerald-500 bg-white"
                  >
                    <option value="أسر متعففة">أسر متعففة</option>
                    <option value="أيتام">أيتام</option>
                    <option value="أرامل ومطلقات">أرامل ومطلقات</option>
                    <option value="ذوي الاحتياجات">ذوي الاحتياجات الخاصة</option>
                    <option value="كبار السن">كبار السن</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">العنوان والحي بالعسيلة</label>
                <input
                  type="text"
                  value={newBenData.address}
                  onChange={(e) => setNewBenData({ ...newBenData, address: e.target.value })}
                  placeholder="مكة المكرمة - مخطط العسيلة - خلف مدرسة الرضوان"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1">البريد الإلكتروني (اختياري)</label>
                  <input
                    type="email"
                    value={newBenData.email}
                    onChange={(e) => setNewBenData({ ...newBenData, email: e.target.value })}
                    placeholder="example@email.com"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1">حالة الاستحقاق</label>
                  <select
                    value={newBenData.status}
                    onChange={(e) => setNewBenData({ ...newBenData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs outline-none focus:border-emerald-500 bg-white"
                  >
                    <option value="approved">معتمد نشط</option>
                    <option value="pending">قيد الدراسة</option>
                    <option value="rejected">موقوف/مرفوض</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">ملاحظات الحالة الاجتماعية</label>
                <input
                  type="text"
                  value={newBenData.notes}
                  onChange={(e) => setNewBenData({ ...newBenData, notes: e.target.value })}
                  placeholder="ملاحظات الباحث الاجتماعي أو متطلبات الدعم الخاصة"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-neutral-100 text-neutral-700 text-xs font-bold rounded-xl hover:bg-neutral-200 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white text-xs font-black rounded-xl hover:bg-emerald-700 cursor-pointer shadow-sm"
                >
                  حفظ المستفيد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT BENEFICIARIES MODAL (EXCEL / PDF) */}
      {showImportModal && onImportBeneficiaries && (
        <BeneficiariesImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImportConfirm={onImportBeneficiaries}
          existingBeneficiaries={beneficiaries}
          lang={lang}
        />
      )}

      {/* BENEFICIARY BARCODE CARD MODAL */}
      {selectedBarcodeBen && (
        <BeneficiaryBarcodeCard
          beneficiary={selectedBarcodeBen}
          homeSettings={homeSettings}
          isOpen={true}
          onClose={() => setSelectedBarcodeBen(null)}
          lang={lang}
        />
      )}

    </div>
  );
};
