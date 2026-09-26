import React, { useState, useMemo, useEffect } from 'react';
import { 
  Package, 
  Calendar, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  FileSpreadsheet, 
  Printer, 
  Camera, 
  Barcode, 
  Filter, 
  Edit3, 
  Trash2, 
  Eye, 
  Check, 
  X, 
  AlertCircle, 
  Share2, 
  User, 
  Phone,
  Layers,
  ChevronDown,
  Building2,
  Undo2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { AidDistribution, Beneficiary, DistributionHandoverRecord, HomeSettings } from '../types';
import { AidHandoverScannerModal } from './AidHandoverScannerModal';
import { BeneficiaryBarcodeCard } from './BeneficiaryBarcodeCard';

interface DistributionsManagerProps {
  distributions: AidDistribution[];
  beneficiaries: Beneficiary[];
  handoverRecords: DistributionHandoverRecord[];
  homeSettings?: HomeSettings;
  currentUser?: {
    id?: string;
    name?: string;
    role?: string;
  };
  onCreateDistribution: (data: Partial<AidDistribution>) => Promise<boolean>;
  onUpdateDistribution: (data: Partial<AidDistribution>) => Promise<boolean>;
  onDeleteDistribution: (id: string) => Promise<boolean>;
  onHandoverSubmit: (data: any) => Promise<any>;
  onCancelHandover: (handoverId: string) => Promise<boolean>;
  lang?: 'ar' | 'en';
}

export const DistributionsManager: React.FC<DistributionsManagerProps> = ({
  distributions = [],
  beneficiaries = [],
  handoverRecords = [],
  homeSettings,
  currentUser = { id: 'admin', name: 'الإدارة العامة', role: 'admin' },
  onCreateDistribution,
  onUpdateDistribution,
  onDeleteDistribution,
  onHandoverSubmit,
  onCancelHandover,
  lang = 'ar'
}) => {
  // Active selected distribution for detail view
  const [selectedDistId, setSelectedDistId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('reyadat_dist_id');
      if (saved && distributions.some(d => d.id === saved)) return saved;
    } catch {}
    return distributions[0]?.id || '';
  });

  useEffect(() => {
    try {
      if (selectedDistId) localStorage.setItem('reyadat_dist_id', selectedDistId);
    } catch {}
  }, [selectedDistId]);

  // Keep selected distribution valid if distributions change
  useEffect(() => {
    if (selectedDistId && !distributions.some(d => d.id === selectedDistId) && distributions[0]) {
      setSelectedDistId(distributions[0].id);
    } else if (!selectedDistId && distributions[0]) {
      setSelectedDistId(distributions[0].id);
    }
  }, [distributions]);
  
  // Modals
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingDist, setEditingDist] = useState<AidDistribution | null>(null);
  const [selectedBarcodeBen, setSelectedBarcodeBen] = useState<Beneficiary | null>(null);

  // Form State for Create/Edit
  const [formTitle, setFormTitle] = useState('');
  const [formAidType, setFormAidType] = useState('food_basket');
  const [formAidTypeLabel, setFormAidTypeLabel] = useState('سلال غذائية');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formQty, setFormQty] = useState('1 سلة غذائية متكاملة');
  const [formTargetAudience, setFormTargetAudience] = useState<'all' | 'specific_categories' | 'custom'>('all');
  const [formLocation, setFormLocation] = useState('مقر الجمعية الرئيسي بالعسيلة');
  const [formStatus, setFormStatus] = useState<'planned' | 'active' | 'completed' | 'archived'>('active');
  const [formNotes, setFormNotes] = useState('');
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  // Filters & Search for beneficiary list inside distribution
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'received' | 'not_received'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Currently selected distribution object
  const currentDist = distributions.find(d => d.id === selectedDistId) || distributions[0];

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingDist(null);
    setFormTitle('');
    setFormAidType('food_basket');
    setFormAidTypeLabel('سلال غذائية');
    setFormDescription('توزيع السلال الغذائية المتكاملة لمستفيدي الجمعية والأسر المتعففة بالعسيلة');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormQty('1 سلة غذائية متكاملة');
    setFormTargetAudience('all');
    setFormLocation('مقر الجمعية الرئيسي بالعسيلة');
    setFormStatus('active');
    setFormNotes('');
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (dist: AidDistribution) => {
    setEditingDist(dist);
    setFormTitle(dist.title);
    setFormAidType(dist.aidType);
    setFormAidTypeLabel(dist.aidTypeLabel);
    setFormDescription(dist.description || '');
    setFormDate(dist.distributionDate);
    setFormQty(dist.quantityPerBeneficiary);
    setFormTargetAudience(dist.targetAudience);
    setFormLocation(dist.location || 'مقر الجمعية الرئيسي بالعسيلة');
    setFormStatus(dist.status);
    setFormNotes(dist.notes || '');
    setIsCreateModalOpen(true);
  };

  // Save Distribution (Create or Update)
  const handleSaveDistribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert("يرجى كتابة اسم التوزيعة");
      return;
    }

    setIsSubmittingForm(true);
    try {
      const payload: Partial<AidDistribution> = {
        title: formTitle.trim(),
        aidType: formAidType,
        aidTypeLabel: formAidTypeLabel,
        description: formDescription.trim(),
        distributionDate: formDate,
        quantityPerBeneficiary: formQty.trim() || '1 وحدة / طرد',
        targetAudience: formTargetAudience,
        location: formLocation.trim(),
        status: formStatus,
        notes: formNotes.trim(),
        createdBy: currentUser.name || 'الإدارة'
      };

      if (editingDist) {
        payload.id = editingDist.id;
        await onUpdateDistribution(payload);
      } else {
        await onCreateDistribution(payload);
      }

      setIsCreateModalOpen(false);
    } catch (err: any) {
      alert("خطأ أثناء حفظ التوزيعة: " + (err?.message || "خطأ غير متوقع"));
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // Delete Distribution
  const handleDelete = async (dist: AidDistribution) => {
    if (confirm(`هل أنت متأكد من حذف توزيعة (${dist.title})؟`)) {
      await onDeleteDistribution(dist.id);
      if (selectedDistId === dist.id && distributions.length > 1) {
        setSelectedDistId(distributions.find(d => d.id !== dist.id)?.id || '');
      }
    }
  };

  // Aid Type Presets
  const handleAidTypeChange = (type: string) => {
    setFormAidType(type);
    switch (type) {
      case 'food_basket':
        setFormAidTypeLabel('سلال غذائية');
        setFormQty('1 سلة غذائية متكاملة');
        break;
      case 'clothing':
        setFormAidTypeLabel('كسوة وملابس');
        setFormQty('1 قسيمة / طقم كسوة');
        break;
      case 'water':
        setFormAidTypeLabel('سقيا ومياه');
        setFormQty('2 كرتون مياه صحية (40 عبوة)');
        break;
      case 'financial':
        setFormAidTypeLabel('دعم مالي وعيني');
        setFormQty('مبلغ نقدي / قسيمة شراء');
        break;
      case 'dates':
        setFormAidTypeLabel('تمور وفاكهة');
        setFormQty('1 كرتون تمور فاخرة');
        break;
      case 'school_bag':
        setFormAidTypeLabel('حقيبة مدرسية');
        setFormQty('1 حقيبة مدرسية بالقرطاسية');
        break;
      case 'appliances':
        setFormAidTypeLabel('أجهزة كهربائية');
        setFormQty('1 جهاز كهربائي منزلي');
        break;
      default:
        setFormAidTypeLabel('مساعدات متنوعة');
        setFormQty('1 طرد / مساعدة');
    }
  };

  // Current handovers map for fast lookup
  const handoversMap = useMemo(() => {
    const map = new Map<string, DistributionHandoverRecord>();
    if (!currentDist) return map;
    handoverRecords
      .filter(h => h.distributionId === currentDist.id)
      .forEach(h => {
        map.set(h.beneficiaryId, h);
      });
    return map;
  }, [currentDist, handoverRecords]);

  // Beneficiaries table rows enriched with receipt status
  const enrichedBeneficiaries = useMemo(() => {
    return beneficiaries.map(ben => {
      const handover = handoversMap.get(ben.id);
      return {
        ...ben,
        hasReceived: !!handover,
        handoverRecord: handover
      };
    });
  }, [beneficiaries, handoversMap]);

  // Statistics for Current Distribution
  const stats = useMemo(() => {
    const total = enrichedBeneficiaries.length;
    const received = enrichedBeneficiaries.filter(b => b.hasReceived).length;
    const notReceived = total - received;
    const percentage = total > 0 ? Math.round((received / total) * 100) : 0;
    return { total, received, notReceived, percentage };
  }, [enrichedBeneficiaries]);

  // Filtered Beneficiaries List
  const filteredBeneficiaries = useMemo(() => {
    return enrichedBeneficiaries.filter(ben => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesName = ben.name.toLowerCase().includes(q);
        const matchesId = (ben.nationalId || '').includes(q);
        const matchesBenNum = (ben.beneficiaryNumber || '').toLowerCase().includes(q);
        const matchesBarcode = (ben.barcodeId || '').toUpperCase().includes(q.toUpperCase());
        const matchesPhone = (ben.phone || '').includes(q);
        if (!matchesName && !matchesId && !matchesBenNum && !matchesBarcode && !matchesPhone) {
          return false;
        }
      }

      // Status
      if (statusFilter === 'received' && !ben.hasReceived) return false;
      if (statusFilter === 'not_received' && ben.hasReceived) return false;

      // Category
      if (categoryFilter !== 'all' && ben.category !== categoryFilter) return false;

      return true;
    });
  }, [enrichedBeneficiaries, searchQuery, statusFilter, categoryFilter]);

  // Unique categories
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    beneficiaries.forEach(b => {
      if (b.category) set.add(b.category);
    });
    return Array.from(set);
  }, [beneficiaries]);

  // Export to Excel
  const handleExportExcel = () => {
    if (!currentDist) return;

    const dataToExport = enrichedBeneficiaries.map((b, idx) => ({
      "م": idx + 1,
      "اسم المستفيد": b.name,
      "رقم المستفيد": b.beneficiaryNumber || "---",
      "رقم الهوية": b.nationalId || "---",
      "رمز الباركود": b.barcodeId || "---",
      "رقم الجوال": b.phone || "---",
      "عدد أفراد الأسرة": b.familySize || 1,
      "فئة الاستحقاق": b.category || "أسر متعففة",
      "حالة الاستلام": b.hasReceived ? "تم الاستلام" : "لم يستلم بعد",
      "تاريخ الاستلام": b.handoverRecord?.date || "---",
      "وقت الاستلام": b.handoverRecord?.time || "---",
      "الموظف المسلم": b.handoverRecord?.handedByUserName || "---",
      "طريقة المسح": b.handoverRecord?.method === 'camera_scanner' ? 'كاميرا' : b.handoverRecord ? 'قارئ باركود' : '---',
      "المساعدة المخصصة": currentDist.quantityPerBeneficiary
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "تقرير التوزيعة");
    XLSX.writeFile(wb, `تقرير_توزيعة_${currentDist.title.replace(/\s+/g, '_')}_${currentDist.distributionDate}.xlsx`);
  };

  // Export / Print PDF Report
  const handlePrintPdfReport = () => {
    if (!currentDist) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const orgName = homeSettings?.siteNameAr || "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة";

    const rowsHtml = enrichedBeneficiaries.map((b, idx) => `
      <tr style="background: ${idx % 2 === 0 ? '#fff' : '#f8fafc'}">
        <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-size: 11px;">${idx + 1}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1; font-weight: bold; font-size: 11px;">${b.name}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace; font-size: 11px;">${b.beneficiaryNumber || '---'}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace; font-size: 11px;">${b.nationalId || '---'}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace; font-size: 10px;">${b.barcodeId || '---'}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-size: 11px;">${b.category || 'أسر متعففة'}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: ${b.hasReceived ? '#047857' : '#b91c1c'}; font-size: 11px;">
          ${b.hasReceived ? '✓ تم الاستلام' : ' لم يستلم'}
        </td>
        <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-size: 10px;">
          ${b.hasReceived ? `${b.handoverRecord?.date} ${b.handoverRecord?.time || ''}` : '---'}
        </td>
        <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-size: 10px;">
          ${b.handoverRecord?.handedByUserName || '---'}
        </td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8">
          <title>تقرير توزيع المساعدات - ${currentDist.title}</title>
          <style>
            @page { size: A4 landscape; margin: 12mm; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              margin: 0; 
              padding: 10px; 
              color: #0f172a; 
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #059669;
              padding-bottom: 12px;
              margin-bottom: 16px;
            }
            .org { font-size: 16px; font-weight: 800; color: #065f46; }
            .title { font-size: 18px; font-weight: 900; margin-top: 4px; }
            .meta-strip {
              display: flex;
              gap: 15px;
              background: #f0fdf4;
              border: 1px solid #bbf7d0;
              border-radius: 8px;
              padding: 10px 14px;
              margin-bottom: 16px;
              font-size: 12px;
            }
            .meta-strip div { flex: 1; text-align: center; }
            .meta-strip strong { display: block; font-size: 15px; color: #065f46; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #065f46; color: #ffffff; padding: 8px; font-size: 11px; border: 1px solid #047857; text-align: center; }
            .footer {
              margin-top: 20px;
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              color: #64748b;
              border-top: 1px solid #e2e8f0;
              padding-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="org">${orgName}</div>
              <div class="title">تقرير كشف تسليم المساعدات: ${currentDist.title}</div>
              <div style="font-size: 12px; color: #475569; margin-top: 4px;">
                النوع: ${currentDist.aidTypeLabel} | المخصص للمستفيد: ${currentDist.quantityPerBeneficiary} | تاريخ التوزيع: ${currentDist.distributionDate}
              </div>
            </div>
            <div style="text-align: left; font-size: 11px; color: #64748b;">
              تاريخ استخراج التقرير: ${new Date().toLocaleDateString('ar-SA')}<br>
              المسؤول: ${currentUser.name}
            </div>
          </div>

          <div class="meta-strip">
            <div>إجمالي المستهدفين<strong>${stats.total}</strong></div>
            <div>تم التسليم<strong>${stats.received}</strong></div>
            <div>المتبقي<strong>${stats.notReceived}</strong></div>
            <div>نسبة الإنجاز<strong>${stats.percentage}%</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 30px;">#</th>
                <th>اسم المستفيد</th>
                <th>رقم المستفيد</th>
                <th>رقم الهوية</th>
                <th>رمز الباركود</th>
                <th>الفئة</th>
                <th>حالة الاستلام</th>
                <th>تاريخ ووقت التسليم</th>
                <th>الموظف المسلم</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer">
            <div>نظام إدارة التوزيعات والباركود الموحد - جمعية ريادة العطاء لخدمة الإنسان بالعسيلة</div>
            <div>ختم واعتماد المشرف: _______________________</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Quick Direct Handover Click
  const handleQuickHandover = async (ben: Beneficiary) => {
    if (!currentDist) return;
    try {
      const res = await onHandoverSubmit({
        distributionId: currentDist.id,
        beneficiaryId: ben.id,
        barcodeId: ben.barcodeId || `BC-BEN-${ben.id}`,
        handedByUserId: currentUser.id || 'admin',
        handedByUserName: currentUser.name || 'المشرف',
        handedByUserRole: currentUser.role || 'admin',
        method: 'manual_input',
        notes: `تسليم يدوي فوري: ${currentDist.quantityPerBeneficiary}`
      });

      if (!res.success) {
        alert(res.error || "تعذر التسليم");
      }
    } catch (err: any) {
      alert("خطأ: " + err?.message);
    }
  };

  // Quick Cancel Handover Click
  const handleCancelClick = async (handoverId: string) => {
    if (confirm("هل أنت متأكد من إلغاء سجل استلام هذه المساعدة؟")) {
      await onCancelHandover(handoverId);
    }
  };

  return (
    <div className="space-y-6 text-right" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-neutral-900 dark:text-white">
                إدارة توزيعات المساعدات ومسح الباركود
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                إنشاء حملات التوزيع، إدارة تسليم السلال، والمسح الفوري للباركود بكاميرا الجوال
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>تسليم المساعدات (مسح الباركود)</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-neutral-900 hover:bg-black dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء توزيعة جديدة</span>
          </button>
        </div>
      </div>

      {/* Distribution Campaigns Carousel / Pills */}
      <div className="bg-neutral-50 dark:bg-neutral-900/60 p-4 rounded-3xl border border-neutral-200 dark:border-neutral-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-neutral-600 dark:text-neutral-400">
            حملات التوزيع المعتمدة ({distributions.length}):
          </h3>
          <span className="text-[11px] text-neutral-400">اختر توزيعة لعرض كشف الاستلام الخاص بها</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {distributions.map((dist) => {
            const isSelected = dist.id === (currentDist?.id || '');
            const distHandoversCount = handoverRecords.filter(h => h.distributionId === dist.id).length;
            const distTotal = beneficiaries.length;
            const distPct = distTotal > 0 ? Math.round((distHandoversCount / distTotal) * 100) : 0;

            return (
              <div
                key={dist.id}
                onClick={() => setSelectedDistId(dist.id)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'border-emerald-600 bg-white dark:bg-neutral-900 shadow-md'
                    : 'border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/40 hover:border-neutral-300'
                }`}
              >
                {/* Status chip */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    dist.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : dist.status === 'completed'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                  }`}>
                    {dist.status === 'active' ? '● جاري التوزيع' : dist.status === 'completed' ? '✓ مكتمل' : 'مجدول'}
                  </span>

                  <span className="text-[11px] font-bold text-neutral-400 font-mono">
                    {dist.distributionDate}
                  </span>
                </div>

                <h4 className="font-black text-sm text-neutral-900 dark:text-white truncate">
                  {dist.title}
                </h4>
                
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1 mt-1">
                  {dist.quantityPerBeneficiary}
                </p>

                {/* Progress bar */}
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-neutral-500 dark:text-neutral-400">
                    <span>نسبة الإنجاز: {distPct}%</span>
                    <span>{distHandoversCount} من {distTotal}</span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                      style={{ width: `${distPct}%` }}
                    ></div>
                  </div>
                </div>

                {/* Card Quick Actions */}
                <div className="mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                    {dist.aidTypeLabel}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleOpenEdit(dist); }}
                      className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      title="تعديل التوزيعة"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDelete(dist); }}
                      className="p-1 text-neutral-400 hover:text-red-600 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      title="حذف التوزيعة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Distribution Detail View */}
      {currentDist && (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-5 sm:p-6 shadow-xs space-y-5">
          {/* Header of Distribution */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {currentDist.aidTypeLabel}
                </span>
                <span className="text-xs text-neutral-400 font-mono">
                  تاريخ التوزيع: {currentDist.distributionDate}
                </span>
              </div>
              <h3 className="text-xl font-black text-neutral-900 dark:text-white mt-1">
                {currentDist.title}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-2xl">
                {currentDist.description || "توزيع المساعدات والسلال المقررة للمستفيدين المسجلين في الجمعية."}
              </p>
              <div className="text-xs font-bold text-neutral-700 dark:text-neutral-300 mt-2 flex items-center gap-2">
                <span className="text-emerald-600 dark:text-emerald-400">المساعدة المخصصة لكل مستفيد:</span>
                <span className="font-mono">{currentDist.quantityPerBeneficiary}</span>
                <span>•</span>
                <span>الموقع: {currentDist.location || "مقر الجمعية بالعسيلة"}</span>
              </div>
            </div>

            {/* Quick Handover Button & Export Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>فتح شاشة المسح والتسليم</span>
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>تصدير Excel</span>
              </button>

              <button
                type="button"
                onClick={handlePrintPdfReport}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4 text-neutral-600" />
                <span>طباعة تقرير PDF</span>
              </button>
            </div>
          </div>

          {/* Real-time Reporting Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700">
              <div className="text-xs font-bold text-neutral-500 dark:text-neutral-400">إجمالي المستهدفين</div>
              <div className="text-2xl font-black text-neutral-900 dark:text-white mt-1">{stats.total}</div>
              <div className="text-[10px] text-neutral-400 mt-0.5">مستفيد مسجل بالنظام</div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">عدد الذين استلموا</div>
              <div className="text-2xl font-black text-emerald-800 dark:text-emerald-300 mt-1">{stats.received}</div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">تم تسليمهم بنجاح</div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
              <div className="text-xs font-bold text-amber-700 dark:text-amber-400">لم يستلموا بعد</div>
              <div className="text-2xl font-black text-amber-800 dark:text-amber-300 mt-1">{stats.notReceived}</div>
              <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">في انتظار الحضور</div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
              <div className="text-xs font-bold text-blue-700 dark:text-blue-400">نسبة الإنجاز المئوية</div>
              <div className="text-2xl font-black text-blue-800 dark:text-blue-300 mt-1">{stats.percentage}%</div>
              <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">من إجمالي المستهدفين</div>
            </div>
          </div>

          {/* Beneficiaries Table Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالاسم، رقم المستفيد، الهوية، أو الباركود..."
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl pr-9 pl-3 py-2 text-xs font-medium text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-2.5" />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-bold text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">جميع الحالات ({stats.total})</option>
                <option value="received">تم الاستلام فقط ({stats.received})</option>
                <option value="not_received">لم يستلم بعد ({stats.notReceived})</option>
              </select>

              {categoriesList.length > 0 && (
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-bold text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">جميع الفئات</option>
                  {categoriesList.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Beneficiaries Table */}
          <div className="border border-neutral-200 dark:border-neutral-700 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-right text-xs">
                <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-bold sticky top-0 z-10 border-b border-neutral-200 dark:border-neutral-700">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">المستفيد</th>
                    <th className="p-3">رقم المستفيد</th>
                    <th className="p-3">الهوية / الجوال</th>
                    <th className="p-3">الفئة</th>
                    <th className="p-3">حالة الاستلام</th>
                    <th className="p-3">تفاصيل التسليم</th>
                    <th className="p-3 text-center">الباركود</th>
                    <th className="p-3 text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-neutral-800 dark:text-neutral-200">
                  {filteredBeneficiaries.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-neutral-400">
                        لا يوجد مستفيدين يطابقون شروط البحث الحالية.
                      </td>
                    </tr>
                  ) : (
                    filteredBeneficiaries.map((ben, idx) => (
                      <tr 
                        key={ben.id}
                        className={`hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors ${
                          ben.hasReceived ? 'bg-emerald-50/20 dark:bg-emerald-950/10' : ''
                        }`}
                      >
                        <td className="p-3 text-neutral-400 font-mono">{idx + 1}</td>
                        <td className="p-3">
                          <div className="font-bold text-neutral-900 dark:text-white">{ben.name}</div>
                          <div className="text-[10px] text-neutral-400">{ben.familySize || 1} أفراد</div>
                        </td>
                        <td className="p-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          {ben.beneficiaryNumber || `BEN-2026-${String(idx + 1).padStart(4, '0')}`}
                        </td>
                        <td className="p-3">
                          <div className="font-mono">{ben.nationalId || '---'}</div>
                          <div className="text-[10px] text-neutral-400" dir="ltr">{ben.phone || '---'}</div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                            {ben.category || "أسر متعففة"}
                          </span>
                        </td>
                        <td className="p-3">
                          {ben.hasReceived ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>تم الاستلام</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-500 border border-neutral-200 dark:border-neutral-700">
                              <Clock className="w-3 h-3" />
                              <span>لم يستلم بعد</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-[11px]">
                          {ben.hasReceived && ben.handoverRecord ? (
                            <div>
                              <div className="font-mono text-neutral-700 dark:text-neutral-300">
                                {ben.handoverRecord.date} - {ben.handoverRecord.time}
                              </div>
                              <div className="text-[10px] text-neutral-400">
                                الموظف: {ben.handoverRecord.handedByUserName}
                              </div>
                            </div>
                          ) : (
                            <span className="text-neutral-400">---</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedBarcodeBen(ben)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                            title="عرض وطباعة بطاقة باركود المستفيد"
                          >
                            <Barcode className="w-3.5 h-3.5" />
                            <span>البطاقة</span>
                          </button>
                        </td>
                        <td className="p-3 text-center">
                          {ben.hasReceived ? (
                            <button
                              type="button"
                              onClick={() => ben.handoverRecord && handleCancelClick(ben.handoverRecord.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                              title="إلغاء الاستلام"
                            >
                              <Undo2 className="w-3 h-3" />
                              <span>إلغاء</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleQuickHandover(ben)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
                              title="تسجيل استلام فوري"
                            >
                              <Check className="w-3 h-3" />
                              <span>تسليم</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Card Modal */}
      {selectedBarcodeBen && (
        <BeneficiaryBarcodeCard
          beneficiary={selectedBarcodeBen}
          homeSettings={homeSettings}
          isOpen={true}
          onClose={() => setSelectedBarcodeBen(null)}
          lang={lang}
        />
      )}

      {/* Handover Scanner Modal */}
      {isScannerOpen && (
        <AidHandoverScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          distributions={distributions}
          selectedDistributionId={selectedDistId}
          beneficiaries={beneficiaries}
          handoverRecords={handoverRecords}
          currentUser={currentUser}
          onHandoverSubmit={onHandoverSubmit}
          lang={lang}
        />
      )}

      {/* Create / Edit Distribution Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div 
            className="relative bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-100 dark:border-neutral-800 text-right"
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-neutral-100 dark:border-neutral-800 mb-4">
              <h3 className="text-base font-black text-neutral-900 dark:text-white">
                {editingDist ? "تعديل بيانات التوزيعة" : "إنشاء توزيعة مساعدات جديدة"}
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDistribution} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  اسم التوزيعة *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="مثال: توزيع سلال غذائية - رمضان 1448"
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    نوع المساعدة
                  </label>
                  <select
                    value={formAidType}
                    onChange={(e) => handleAidTypeChange(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="food_basket">سلال غذائية</option>
                    <option value="clothing">كسوة وملابس</option>
                    <option value="water">سقيا ومياه</option>
                    <option value="financial">دعم مالي وعيني</option>
                    <option value="dates">تمور ومواد غذائية</option>
                    <option value="school_bag">حقائب مدرسية</option>
                    <option value="appliances">أجهزة كهربائية</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    تاريخ التوزيع
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  الكمية / الوحدة المخصصة لكل مستفيد
                </label>
                <input
                  type="text"
                  value={formQty}
                  onChange={(e) => setFormQty(e.target.value)}
                  placeholder="مثال: 1 سلة غذائية متكاملة أو 2 كرتون مياه"
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    حالة التوزيعة
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="active">نشطة (جاري التوزيع)</option>
                    <option value="planned">مجدولة (قريباً)</option>
                    <option value="completed">مكتملة</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    الموقع / مركز التوزيع
                  </label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="مثال: مقر الجمعية الرئيسي بالعسيلة"
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  وصف وتفاصيل التوزيعة
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="وصف تفصيلي للأصناف أو شروط الاستلام..."
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-2.5 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-neutral-600 dark:text-neutral-300 font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingForm}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md"
                >
                  {isSubmittingForm ? "جاري الحفظ..." : editingDist ? "حفظ التعديلات" : "إنشاء التوزيعة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
