import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
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
  Undo2,
  Bell,
  BarChart3,
  ShieldCheck,
  CheckSquare,
  Sparkles,
  ArrowRight,
  Download,
  FileText,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Inbox
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  AidDistribution, 
  Beneficiary, 
  DistributionHandoverRecord, 
  HomeSettings,
  InventoryItem,
  Notification
} from '../types';
import { AidHandoverScannerModal } from './AidHandoverScannerModal';
import { BeneficiaryBarcodeCard } from './BeneficiaryBarcodeCard';

interface BeneficiariesMasterDashboardProps {
  beneficiaries: Beneficiary[];
  distributions: AidDistribution[];
  handoverRecords: DistributionHandoverRecord[];
  inventoryItems?: InventoryItem[];
  notifications?: Notification[];
  homeSettings?: HomeSettings;
  currentUser?: {
    id?: string;
    name?: string;
    role?: string;
    departmentId?: string;
  };
  onCreateDistribution: (data: Partial<AidDistribution>) => Promise<boolean>;
  onUpdateDistribution: (data: Partial<AidDistribution>) => Promise<boolean>;
  onDeleteDistribution: (id: string) => Promise<boolean>;
  onHandoverSubmit: (data: any) => Promise<any>;
  onCancelHandover: (handoverId: string) => Promise<boolean>;
  onUpdateBeneficiaryStatus?: (id: string, status: 'approved' | 'rejected') => Promise<boolean>;
  onAddBeneficiary?: (data: Partial<Beneficiary>) => Promise<boolean>;
  lang?: 'ar' | 'en';
}

type TabType = 
  | 'overview' 
  | 'beneficiaries' 
  | 'distributions' 
  | 'eligibilities' 
  | 'handover_ledger' 
  | 'upcoming' 
  | 'completed' 
  | 'barcode' 
  | 'reports' 
  | 'notifications';

export const BeneficiariesMasterDashboard: React.FC<BeneficiariesMasterDashboardProps> = ({
  beneficiaries = [],
  distributions = [],
  handoverRecords = [],
  inventoryItems = [],
  notifications = [],
  homeSettings,
  currentUser = { id: 'depadmin-dep-4', name: 'أ. مريم الغامدي', role: 'department_admin', departmentId: 'dep-4' },
  onCreateDistribution,
  onUpdateDistribution,
  onDeleteDistribution,
  onHandoverSubmit,
  onCancelHandover,
  onUpdateBeneficiaryStatus,
  onAddBeneficiary,
  lang = 'ar'
}) => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    try {
      const saved = localStorage.getItem('reyadat_beneficiaries_tab');
      if (saved) return saved as TabType;
    } catch {}
    return 'overview';
  });

  useEffect(() => {
    try {
      localStorage.setItem('reyadat_beneficiaries_tab', activeTab);
    } catch {}
  }, [activeTab]);

  // Modals & States
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedScannerDistId, setSelectedScannerDistId] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingDist, setEditingDist] = useState<AidDistribution | null>(null);
  const [selectedBarcodeBen, setSelectedBarcodeBen] = useState<Beneficiary | null>(null);
  const [isAddBenModalOpen, setIsAddBenModalOpen] = useState(false);
  const [manualBarcodeQuery, setManualBarcodeQuery] = useState('');
  const [quickHandoverMsg, setQuickHandoverMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Distribution Form State
  const [formTitle, setFormTitle] = useState('');
  const [formAidType, setFormAidType] = useState('food_basket');
  const [formAidTypeLabel, setFormAidTypeLabel] = useState('سلال ومساعدات غذائية');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formLocation, setFormLocation] = useState('مقر الجمعية - مخطط العسيلة');
  const [formInventoryItemId, setFormInventoryItemId] = useState<string>('');
  const [formUnitQty, setFormUnitQty] = useState<number>(1);
  const [formTargetAudience, setFormTargetAudience] = useState<'all' | 'specific_categories' | 'custom'>('all');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [formNotes, setFormNotes] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Beneficiary Form State
  const [benName, setBenName] = useState('');
  const [benNationalId, setBenNationalId] = useState('');
  const [benPhone, setBenPhone] = useState('');
  const [benFamilySize, setBenFamilySize] = useState<number>(4);
  const [benAddress, setBenAddress] = useState('مكة المكرمة - مخطط العسيلة');
  const [benCategory, setBenCategory] = useState('أسر متعففة');
  const [benNotes, setBenNotes] = useState('');
  const [benSubmitting, setBenSubmitting] = useState(false);

  // Search & Filter States
  const [benSearchQuery, setBenSearchQuery] = useState('');
  const [benCategoryFilter, setBenCategoryFilter] = useState('all');
  const [benStatusFilter, setBenStatusFilter] = useState('all');
  const [distSearchQuery, setDistSearchQuery] = useState('');
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState('');
  const [ledgerDistFilter, setLedgerDistFilter] = useState('all');

  // Statistics Calculations
  const stats = useMemo(() => {
    const totalBeneficiaries = beneficiaries.length;
    const approvedBeneficiaries = beneficiaries.filter(b => b.status === 'approved').length;
    const totalDistributions = distributions.length;
    const activeDistributions = distributions.filter(d => d.status === 'active').length;
    const completedDistributions = distributions.filter(d => d.status === 'completed').length;
    const plannedDistributions = distributions.filter(d => d.status === 'planned').length;
    const totalHandovers = handoverRecords.length;

    // Inventory linked stats
    let totalReservedStock = 0;
    let totalAllocatedStock = 0;
    distributions.forEach(d => {
      if (d.reservedStock) totalReservedStock += Number(d.reservedStock) || 0;
      if (d.allocatedQuantity) totalAllocatedStock += Number(d.allocatedQuantity) || 0;
    });

    const completionRate = totalAllocatedStock > 0 
      ? Math.round((totalHandovers / totalAllocatedStock) * 100) 
      : (totalDistributions > 0 ? Math.round((completedDistributions / totalDistributions) * 100) : 0);

    return {
      totalBeneficiaries,
      approvedBeneficiaries,
      totalDistributions,
      activeDistributions,
      completedDistributions,
      plannedDistributions,
      totalHandovers,
      totalReservedStock,
      totalAllocatedStock,
      completionRate
    };
  }, [beneficiaries, distributions, handoverRecords]);

  // Available warehouse items for linking
  const availableInventoryItems = useMemo(() => {
    return (inventoryItems || []).map(item => {
      const current = Number(item.currentQty) || 0;
      const reserved = Number(item.reservedQty) || 0;
      const available = Math.max(0, current - reserved);
      return {
        ...item,
        availableStock: available
      };
    });
  }, [inventoryItems]);

  // Filtered beneficiaries
  const filteredBeneficiaries = useMemo(() => {
    return beneficiaries.filter(b => {
      const matchSearch = 
        !benSearchQuery ||
        b.name.toLowerCase().includes(benSearchQuery.toLowerCase()) ||
        (b.nationalId && b.nationalId.includes(benSearchQuery)) ||
        (b.phone && b.phone.includes(benSearchQuery)) ||
        (b.barcodeId && b.barcodeId.toLowerCase().includes(benSearchQuery.toLowerCase())) ||
        (b.beneficiaryNumber && b.beneficiaryNumber.toLowerCase().includes(benSearchQuery.toLowerCase()));
      
      const matchCategory = benCategoryFilter === 'all' || b.category === benCategoryFilter;
      const matchStatus = benStatusFilter === 'all' || b.status === benStatusFilter;
      return matchSearch && matchCategory && matchStatus;
    });
  }, [beneficiaries, benSearchQuery, benCategoryFilter, benStatusFilter]);

  // Filtered distributions
  const filteredDistributions = useMemo(() => {
    return distributions.filter(d => {
      return !distSearchQuery || 
        d.title.toLowerCase().includes(distSearchQuery.toLowerCase()) ||
        (d.aidTypeLabel && d.aidTypeLabel.toLowerCase().includes(distSearchQuery.toLowerCase())) ||
        (d.location && d.location.toLowerCase().includes(distSearchQuery.toLowerCase()));
    });
  }, [distributions, distSearchQuery]);

  // Upcoming distributions
  const upcomingDistributions = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return distributions.filter(d => d.status === 'planned' || (d.distributionDate >= today && d.status !== 'completed'));
  }, [distributions]);

  // Completed distributions
  const completedDistributionsList = useMemo(() => {
    return distributions.filter(d => d.status === 'completed' || (d.completionRate && d.completionRate >= 100));
  }, [distributions]);

  // Filtered Handover Ledger
  const filteredLedger = useMemo(() => {
    return handoverRecords.filter(r => {
      const matchDist = ledgerDistFilter === 'all' || r.distributionId === ledgerDistFilter;
      const matchSearch = !ledgerSearchQuery ||
        r.beneficiaryName.toLowerCase().includes(ledgerSearchQuery.toLowerCase()) ||
        (r.nationalId && r.nationalId.includes(ledgerSearchQuery)) ||
        (r.barcodeId && r.barcodeId.toLowerCase().includes(ledgerSearchQuery.toLowerCase())) ||
        (r.itemName && r.itemName.toLowerCase().includes(ledgerSearchQuery.toLowerCase())) ||
        (r.handedByUserName && r.handedByUserName.toLowerCase().includes(ledgerSearchQuery.toLowerCase()));
      return matchDist && matchSearch;
    });
  }, [handoverRecords, ledgerDistFilter, ledgerSearchQuery]);

  // Filtered department notifications
  const beneficiaryNotifications = useMemo(() => {
    return notifications.filter(n => 
      n.category === 'beneficiary' || 
      n.targetDepartmentId === 'dep-4' ||
      n.recipientType === 'beneficiaries' ||
      n.titleAr.includes('مستفيد') ||
      n.titleAr.includes('توزيع') ||
      n.titleAr.includes('مخزون')
    );
  }, [notifications]);

  // Handle open create distribution
  const handleOpenCreateModal = () => {
    setEditingDist(null);
    setFormTitle('');
    setFormAidType('food_basket');
    setFormAidTypeLabel('سلال ومساعدات غذائية');
    setFormDescription('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormLocation('مقر الجمعية - مخطط العسيلة');
    setFormInventoryItemId(availableInventoryItems[0]?.id || '');
    setFormUnitQty(1);
    setFormTargetAudience('all');
    setSelectedCategories([]);
    setFormNotes('');
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  // Handle Inventory Selection Change
  const handleInventoryItemChange = (itemId: string) => {
    setFormInventoryItemId(itemId);
    const item = availableInventoryItems.find(i => i.id === itemId);
    if (item) {
      setFormTitle(`توزيع ${item.name}`);
      setFormAidTypeLabel(item.name);
      setFormDescription(item.description || `توزيع أصناف ${item.name} للمستحقين المسجلين`);
    }
  };

  // Submit Distribution Form with Inventory Link
  const handleSaveDistribution = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    try {
      // Calculate targeted beneficiaries
      let targetedIds: string[] = [];
      if (formTargetAudience === 'all') {
        targetedIds = beneficiaries.map(b => b.id);
      } else if (formTargetAudience === 'specific_categories' && selectedCategories.length > 0) {
        targetedIds = beneficiaries
          .filter(b => b.category && selectedCategories.includes(b.category))
          .map(b => b.id);
      } else {
        targetedIds = beneficiaries.filter(b => b.status === 'approved').map(b => b.id);
      }

      if (targetedIds.length === 0) {
        setFormError('يرجى التأكد من وجود مستفيدين مستهدفين لهذه التوزيعة.');
        setFormSubmitting(false);
        return;
      }

      // Check stock if inventory item selected
      const selectedItem = availableInventoryItems.find(i => i.id === formInventoryItemId);
      if (selectedItem) {
        const totalNeeded = formUnitQty * targetedIds.length;
        if (totalNeeded > selectedItem.availableStock) {
          setFormError(`الرصيد المتاح في المستودع للصنف (${selectedItem.name}) هو ${selectedItem.availableStock}، بينما الكمية المطلوبة لتغطية ${targetedIds.length} مستفيد هي ${totalNeeded}. يرجى تقليل الكمية أو تعديل الفئات المستهدفة.`);
          setFormSubmitting(false);
          return;
        }
      }

      const payload: Partial<AidDistribution> = {
        title: formTitle || (selectedItem ? `توزيع ${selectedItem.name}` : 'توزيعة مساعدات جديدة'),
        aidType: formAidType,
        aidTypeLabel: formAidTypeLabel || (selectedItem ? selectedItem.name : 'مساعدات عينية'),
        description: formDescription,
        distributionDate: formDate,
        quantityPerBeneficiary: `${formUnitQty} ${selectedItem ? selectedItem.unitOfMeasure : 'طرد'}`,
        targetAudience: formTargetAudience,
        targetedBeneficiaryIds: targetedIds,
        location: formLocation,
        notes: formNotes,
        createdBy: currentUser.name || 'مدير إدارة المستفيدين',
        inventoryItemId: formInventoryItemId || undefined,
        inventoryItemName: selectedItem ? selectedItem.name : undefined,
        unitQuantityPerBeneficiary: formUnitQty,
        eligibilityFilterCategory: selectedCategories.join('، ') || 'كافة الفئات المعتمدة'
      };

      let success = false;
      if (editingDist) {
        success = await onUpdateDistribution({ id: editingDist.id, ...payload });
      } else {
        success = await onCreateDistribution(payload);
      }

      if (success) {
        setIsCreateModalOpen(false);
      } else {
        setFormError('حدث خطأ أثناء حفظ التوزيعة، يرجى المحاولة لاحقاً.');
      }
    } catch (err: any) {
      setFormError(err.message || 'حدث خطأ غير متوقع');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Submit Add Beneficiary Form
  const handleSaveBeneficiary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!benName || !benNationalId) return;
    setBenSubmitting(true);
    try {
      if (onAddBeneficiary) {
        const barcodeSeq = Math.floor(100000 + Math.random() * 900000);
        await onAddBeneficiary({
          name: benName,
          nationalId: benNationalId,
          phone: benPhone,
          familySize: Number(benFamilySize) || 1,
          address: benAddress,
          category: benCategory,
          notes: benNotes,
          barcodeId: `BC-BEN-${barcodeSeq}`,
          beneficiaryNumber: `BEN-2026-${String(beneficiaries.length + 1).padStart(4, '0')}`,
          status: 'approved',
          createdAt: new Date().toISOString()
        });
        setIsAddBenModalOpen(false);
        setBenName('');
        setBenNationalId('');
        setBenPhone('');
      }
    } finally {
      setBenSubmitting(false);
    }
  };

  // Direct Handover from Manual Barcode Query
  const handleDirectManualHandover = async (distId: string) => {
    if (!manualBarcodeQuery.trim()) return;
    setQuickHandoverMsg(null);
    try {
      const res = await onHandoverSubmit({
        distributionId: distId,
        barcodeId: manualBarcodeQuery.trim(),
        handedByUserId: currentUser.id || 'staff',
        handedByUserName: currentUser.name || 'مدير إدارة المستفيدين',
        handedByUserRole: 'department_admin',
        method: 'hardware_scanner'
      });

      if (res && res.success) {
        setQuickHandoverMsg({ type: 'success', text: `تم تسجيل الصرف بنجاح للمستفيد: (${res.beneficiary?.name || 'مستفيد'})` });
        setManualBarcodeQuery('');
      } else {
        setQuickHandoverMsg({ type: 'error', text: res?.error || 'فشلت عملية الصرف.' });
      }
    } catch (err: any) {
      setQuickHandoverMsg({ type: 'error', text: err.message || 'خطأ في عملية التحقق' });
    }
  };

  // Export Beneficiaries to Excel
  const exportBeneficiariesToExcel = () => {
    const data = filteredBeneficiaries.map((b, idx) => ({
      'م': idx + 1,
      'رقم المستفيد': b.beneficiaryNumber || `BEN-${idx + 1}`,
      'كود الباركود': b.barcodeId || '',
      'اسم المستفيد': b.name,
      'رقم الهوية': b.nationalId || '',
      'رقم الجوال': b.phone || '',
      'عدد أفراد الأسرة': b.familySize || 1,
      'فئة الرعاية': b.category || 'عام',
      'العنوان': b.address || '',
      'حالة الاستحقاق': b.status === 'approved' ? 'معتمد' : b.status === 'pending' ? 'قيد المراجعة' : 'مرفوض'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'المستفيدون');
    XLSX.writeFile(wb, `سجل_المستفيدين_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export Handover Ledger to Excel
  const exportHandoverLedgerToExcel = () => {
    const data = filteredLedger.map((r, idx) => ({
      'م': idx + 1,
      'رقم السند': r.id,
      'التاريخ': r.date,
      'الوقت': r.time,
      'اسم المستفيد': r.beneficiaryName,
      'رقم الهوية': r.nationalId || '',
      'الباركود': r.barcodeId,
      'التوزيعة': r.distributionTitle || '',
      'الصنف المسلّم': r.itemName || '',
      'الكمية': r.quantity || 1,
      'المسؤول عن التسليم': r.handedByUserName,
      'طريقة المسح': r.method === 'camera_scanner' ? 'كاميرا الموبايل' : r.method === 'hardware_scanner' ? 'قارئ باركود خارجي' : 'إدخال يدوي'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'سجل الاستلام');
    XLSX.writeFile(wb, `سجل_تسليم_المساعدات_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Aid Categories for Eligibility Matrix
  const aidCategories = [
    { id: 'food', name: 'سلال ومواد غذائية', icon: '🥫', criteria: 'الأسر المتعففة، الأرامل، كبار السن، محدودي الدخل', freq: 'شهرياً أو موسمي' },
    { id: 'water', name: 'سقيا ماء وتمور', icon: '💧', criteria: 'متاح لكافة المستفيدين المسجلين والمعتمدين', freq: 'مستمر' },
    { id: 'clothes', name: 'كسوة العيد والحقيبة المدرسية', icon: '👕', criteria: 'أسر الأيتام والمطلقات والأسر ذات الدخل المحدود', freq: 'موسمي' },
    { id: 'winter', name: 'بطانيات ودفايات شتوية', icon: '❄️', criteria: 'الأسر الأكثر احتياجاً وفق المسح الميداني', freq: 'شتوي' },
    { id: 'appliances', name: 'أجهزة كهربائية ومساعدات عينية', icon: '🔌', criteria: 'دراسة حالة معتمدة من الباحث الاجتماعي', freq: 'حسب توفر الدعم' },
    { id: 'financial', name: 'مساعدات مالية وتفريج كربة', icon: '💳', criteria: 'حالات الإعسار وانقطاع الدخل الموثقة رسمياً', freq: 'طارئ' }
  ];

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-900/10 space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                إدارة المستفيدين (dep-4)
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                المدير المسؤول: {currentUser.name || 'أ. مريم الغامدي'}
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-neutral-100 text-neutral-600 border border-neutral-200">
                الهوية: 1010000004
              </span>
            </div>

            <h1 className="text-2xl font-black text-neutral-900 flex items-center gap-3">
              <Package className="w-7 h-7 text-emerald-600" />
              نظام إدارة المستفيدين والتوزيعات الذكي
            </h1>
            <p className="text-xs text-neutral-500">
              منظومة متكاملة لفرز واستحقاق المستفيدين، تسليم المساعدات عبر الباركود، والربط اللحظي المباشر مع إدارة المخزون والمستودعات.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                setSelectedScannerDistId(distributions[0]?.id || '');
                setIsScannerOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              مسح الباركود والتسليم الفوري
            </button>

            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              إنشاء توزيعة مرتبطة بالمخزون
            </button>
          </div>
        </div>

        {/* 10 Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-2 border-t border-neutral-100 scrollbar-thin">
          {[
            { id: 'overview', label: 'إدارة المستفيدين', icon: Building2 },
            { id: 'beneficiaries', label: 'المستفيدون', icon: Users, badge: beneficiaries.length },
            { id: 'distributions', label: 'التوزيعات', icon: Package, badge: distributions.length },
            { id: 'eligibilities', label: 'الاستحقاقات', icon: CheckSquare },
            { id: 'handover_ledger', label: 'سجل الاستلام', icon: FileText, badge: handoverRecords.length },
            { id: 'upcoming', label: 'التوزيعات القادمة', icon: Calendar, badge: upcomingDistributions.length },
            { id: 'completed', label: 'التوزيعات المكتملة', icon: CheckCircle2, badge: completedDistributionsList.length },
            { id: 'barcode', label: 'الباركود', icon: Barcode },
            { id: 'reports', label: 'التقارير', icon: BarChart3 },
            { id: 'notifications', label: 'الإشعارات', icon: Bell, badge: beneficiaryNotifications.length }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-600 border border-neutral-200/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-700'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW (إدارة المستفيدين) */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-neutral-500 block">إجمالي المستفيدين</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-neutral-900">{stats.totalBeneficiaries}</span>
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-[10px] text-emerald-600 font-bold block">{stats.approvedBeneficiaries} مستفيد معتمد</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-neutral-500 block">التوزيعات النشطة</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-neutral-900">{stats.activeDistributions}</span>
                <Package className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-[10px] text-neutral-500 block">من إجمالي {stats.totalDistributions} حملة</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-neutral-500 block">عمليات التسليم الموثقة</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-neutral-900">{stats.totalHandovers}</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-[10px] text-emerald-600 block">عبر الباركود الذكي</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-neutral-500 block">المخزون المحجوز</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-neutral-900">{stats.totalReservedStock}</span>
                <Layers className="w-5 h-5 text-indigo-600" />
              </div>
              <span className="text-[10px] text-indigo-600 block">وحدة محجوزة بالمستودع</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-neutral-500 block">معدل الإنجاز والتسليم</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-neutral-900">{stats.completionRate}%</span>
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="w-full bg-neutral-100 rounded-full h-1.5 mt-1 overflow-hidden">
                <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: `${Math.min(100, stats.completionRate)}%` }} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-neutral-500 block">التوزيعات القادمة</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-neutral-900">{stats.plannedDistributions}</span>
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-[10px] text-blue-600 block">قيد التحضير الميداني</span>
            </div>
          </div>

          {/* Quick Hardware Handover & Linked Inventory Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Barcode Handover Box */}
            <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <Barcode className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">تسليم سريع بماسح الباركود</h3>
                    <p className="text-[11px] text-neutral-400">مرر باركود المستفيد للتحقق والصرف الفوري</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">اختر التوزيعة النشطة:</label>
                  <select
                    value={selectedScannerDistId}
                    onChange={(e) => setSelectedScannerDistId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-bold text-neutral-800 focus:outline-none focus:border-emerald-500"
                  >
                    {distributions.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.title} ({d.quantityPerBeneficiary}) - {d.status === 'completed' ? 'مكتملة' : 'نشطة'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">كود الباركود أو رقم الهوية:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualBarcodeQuery}
                      onChange={(e) => setManualBarcodeQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleDirectManualHandover(selectedScannerDistId || distributions[0]?.id);
                        }
                      }}
                      placeholder="مثال: BC-BEN-884920 أو رقم الهوية..."
                      className="flex-1 px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-mono font-bold text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={() => handleDirectManualHandover(selectedScannerDistId || distributions[0]?.id)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-all"
                    >
                      صرف
                    </button>
                  </div>
                </div>

                {quickHandoverMsg && (
                  <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    quickHandoverMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {quickHandoverMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
                    <span>{quickHandoverMsg.text}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Warehouse Stock Linked Status */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <Inbox className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">حالة الربط المباشر مع إدارة المخزون والمستودعات (dep-8)</h3>
                    <p className="text-[11px] text-neutral-400">تحديث لحظي لأرصدة الأصناف المتاحة والمحجوزة والمنصرفة للمستفيدين</p>
                  </div>
                </div>

                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  ربط متزامن ومباشر ✓
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-neutral-100 text-neutral-500 font-bold bg-neutral-50/60">
                      <th className="p-2.5 rounded-r-xl">اسم الصنف بالمستودع</th>
                      <th className="p-2.5">الرصيد الفعلي</th>
                      <th className="p-2.5">المحجوز للتوزيع</th>
                      <th className="p-2.5">المتاح للصرف</th>
                      <th className="p-2.5">إجمالي المنصرف</th>
                      <th className="p-2.5 rounded-l-xl">حالة الوفرة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {availableInventoryItems.slice(0, 5).map(item => (
                      <tr key={item.id} className="hover:bg-neutral-50/80 transition-colors">
                        <td className="p-2.5 font-bold text-neutral-900 flex items-center gap-2">
                          <Package className="w-4 h-4 text-neutral-400" />
                          <span>{item.name}</span>
                          <span className="text-[10px] font-normal text-neutral-400 font-mono">({item.barcode})</span>
                        </td>
                        <td className="p-2.5 font-mono font-bold text-neutral-800">{item.currentQty} {item.unitOfMeasure}</td>
                        <td className="p-2.5 font-mono font-bold text-amber-600">{item.reservedQty || 0}</td>
                        <td className="p-2.5 font-mono font-black text-emerald-600">{item.availableStock}</td>
                        <td className="p-2.5 font-mono text-neutral-600">{item.issuedQty || 0}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.availableStock > 50 ? 'bg-emerald-100 text-emerald-800' :
                            item.availableStock > 0 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {item.availableStock > 50 ? 'متوفر بكثرة' : item.availableStock > 0 ? 'مخزون محدود' : 'نفد الرصيد'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Active Campaigns Quick Cards */}
          <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">حملات التوزيع الجارية</h3>
                <p className="text-[11px] text-neutral-400">متابعة نسب التسليم اللحظية لكل حملة توزيع</p>
              </div>

              <button
                onClick={() => setActiveTab('distributions')}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
              >
                <span>عرض كافة التوزيعات</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {distributions.slice(0, 3).map(dist => {
                const targetCount = dist.targetedBeneficiaryIds?.length || beneficiaries.length || 1;
                const handedCount = dist.distributedCount || 0;
                const pct = Math.min(100, Math.round((handedCount / targetCount) * 100));

                return (
                  <div key={dist.id} className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-xs text-neutral-900">{dist.title}</h4>
                        <span className="text-[10px] text-neutral-500 block">{dist.quantityPerBeneficiary}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        dist.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {dist.status === 'completed' ? 'مكتملة' : 'نشطة'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-neutral-500">نسبة الإنجاز:</span>
                        <span className="text-emerald-700">{handedCount} من {targetCount} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-neutral-200 rounded-full h-2 overflow-hidden">
                        <div className="bg-emerald-600 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-neutral-200/60 flex items-center justify-between text-[10px] text-neutral-500">
                      <span>التاريخ: {dist.distributionDate}</span>
                      <button
                        onClick={() => {
                          setSelectedScannerDistId(dist.id);
                          setIsScannerOpen(true);
                        }}
                        className="font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Camera className="w-3 h-3" />
                        صرف بالباركود
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BENEFICIARIES (المستفيدون) */}
      {/* ========================================================================= */}
      {activeTab === 'beneficiaries' && (
        <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                سجل المستفيدين والأسر المستحقة
              </h2>
              <p className="text-xs text-neutral-400">إدارة بيانات الأسر المستفيدة، الباركود الذكي المعتمد، وتحديث حالات الاستحقاق</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={exportBeneficiariesToExcel}
                className="px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                تصدير إكسل
              </button>

              <button
                onClick={() => setIsAddBenModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                إضافة مستفيد جديد
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={benSearchQuery}
                onChange={(e) => setBenSearchQuery(e.target.value)}
                placeholder="بحث بالاسم، الهوية، الجوال، كود الباركود..."
                className="w-full pr-9 pl-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <select
                value={benCategoryFilter}
                onChange={(e) => setBenCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-700 font-bold focus:outline-none focus:border-emerald-500"
              >
                <option value="all">كافة الفئات (الكل)</option>
                <option value="أسر متعففة">أسر متعففة</option>
                <option value="أيتام">أيتام</option>
                <option value="أرامل ومطلقات">أرامل ومطلقات</option>
                <option value="ذوي الاحتياجات">ذوي الاحتياجات الخاصة</option>
                <option value="كبار السن">كبار السن</option>
                <option value="محدودي الدخل">محدودي الدخل</option>
              </select>
            </div>

            <div>
              <select
                value={benStatusFilter}
                onChange={(e) => setBenStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-700 font-bold focus:outline-none focus:border-emerald-500"
              >
                <option value="all">كافة الحالات</option>
                <option value="approved">معتمد ومستحق</option>
                <option value="pending">قيد المراجعة</option>
                <option value="rejected">مرفوض</option>
              </select>
            </div>
          </div>

          {/* Beneficiaries Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-neutral-100 text-neutral-500 font-bold bg-neutral-50">
                  <th className="p-3 rounded-r-xl">المستفيد والباركود</th>
                  <th className="p-3">رقم الهوية</th>
                  <th className="p-3">الجوال</th>
                  <th className="p-3">عدد الأفراد</th>
                  <th className="p-3">فئة الاستحقاق</th>
                  <th className="p-3">حالة الملف</th>
                  <th className="p-3 text-center rounded-l-xl">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredBeneficiaries.map(ben => (
                  <tr key={ben.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-neutral-900">{ben.name}</div>
                      <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-mono">
                        <span className="text-emerald-700 font-bold">{ben.beneficiaryNumber || 'BEN-2026'}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Barcode className="w-3 h-3 text-neutral-500" />
                          {ben.barcodeId || 'BC-BEN-000000'}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 font-mono font-bold text-neutral-700">{ben.nationalId || '—'}</td>
                    <td className="p-3 font-mono text-neutral-600">{ben.phone || '—'}</td>
                    <td className="p-3 font-bold text-neutral-800">{ben.familySize || 1} أفراد</td>
                    <td className="p-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-800">
                        {ben.category || 'عام'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        ben.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        ben.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {ben.status === 'approved' ? 'معتمد' : ben.status === 'pending' ? 'قيد المراجعة' : 'مرفوض'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setSelectedBarcodeBen(ben)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-all flex items-center gap-1.5 mx-auto cursor-pointer"
                      >
                        <Barcode className="w-3.5 h-3.5" />
                        بطاقة الباركود
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DISTRIBUTIONS & INVENTORY LINK (التوزيعات) */}
      {/* ========================================================================= */}
      {activeTab === 'distributions' && (
        <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-600" />
                حملات التوزيع والربط بالمخزون
              </h2>
              <p className="text-xs text-neutral-400">
                إنشاء حملات التوزيع، حجز الكميات التلقائي من المستودع، ومتابعة معدلات الصرف
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedScannerDistId(distributions[0]?.id || '');
                  setIsScannerOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                صرف بالباركود
              </button>

              <button
                onClick={handleOpenCreateModal}
                className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                توزيعة جديدة
              </button>
            </div>
          </div>

          {/* Distributions Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-neutral-100 text-neutral-500 font-bold bg-neutral-50">
                  <th className="p-3 rounded-r-xl">عنوان التوزيعة</th>
                  <th className="p-3">الصنف والمخزون المرتبط</th>
                  <th className="p-3">الكمية لكل مستفيد</th>
                  <th className="p-3">تاريخ التوزيع</th>
                  <th className="p-3">نسبة الإنجاز</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3 text-center rounded-l-xl">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredDistributions.map(dist => {
                  const targetCount = dist.targetedBeneficiaryIds?.length || beneficiaries.length || 1;
                  const handedCount = dist.distributedCount || 0;
                  const pct = Math.min(100, Math.round((handedCount / targetCount) * 100));

                  return (
                    <tr key={dist.id} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-neutral-900">{dist.title}</div>
                        <div className="text-[10px] text-neutral-400">{dist.location || 'مقر الجمعية بالعسيلة'}</div>
                      </td>
                      <td className="p-3">
                        {dist.inventoryItemName ? (
                          <div className="flex items-center gap-1.5 text-indigo-700 font-bold">
                            <Layers className="w-3.5 h-3.5" />
                            <span>{dist.inventoryItemName}</span>
                          </div>
                        ) : (
                          <span className="text-neutral-500">{dist.aidTypeLabel || 'مساعدات عينية'}</span>
                        )}
                        {dist.reservedStock ? (
                          <span className="text-[10px] text-neutral-400 block font-mono">محجوز: {dist.reservedStock} وحدة</span>
                        ) : null}
                      </td>
                      <td className="p-3 font-bold text-neutral-800">{dist.quantityPerBeneficiary}</td>
                      <td className="p-3 font-mono text-neutral-600">{dist.distributionDate}</td>
                      <td className="p-3">
                        <div className="w-32 space-y-1">
                          <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-neutral-500">{handedCount} / {targetCount}</span>
                            <span className="text-emerald-700">{pct}%</span>
                          </div>
                          <div className="w-full bg-neutral-200 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          dist.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {dist.status === 'completed' ? 'مكتملة' : 'نشطة'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedScannerDistId(dist.id);
                              setIsScannerOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-all cursor-pointer"
                            title="صرف وتسجيل بالباركود"
                          >
                            <Camera className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`هل أنت متأكد من حذف التوزيعة (${dist.title}) وإلغاء حجز المخزون؟`)) {
                                onDeleteDistribution(dist.id);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all cursor-pointer"
                            title="حذف التوزيعة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ELIGIBILITIES (الاستحقاقات) */}
      {/* ========================================================================= */}
      {activeTab === 'eligibilities' && (
        <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-emerald-600" />
              مصفوفة الاستحقاقات وضوابط صرف المساعدات
            </h2>
            <p className="text-xs text-neutral-400">
              تحديد معايير استحقاق الفئات للأصناف المختلفة ومنع صرف المساعدات لغير المسجلين أو غير المستحقين
            </p>
          </div>

          {/* Aid Category Matrix Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {aidCategories.map(cat => (
              <div key={cat.id} className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{cat.icon}</span>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">{cat.name}</h3>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                      تواتر الصرف: {cat.freq}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <span className="text-[11px] font-bold text-neutral-600 block">شروط ومعايير الاستحقاق:</span>
                  <p className="text-neutral-500 leading-relaxed text-[11px] bg-white p-2.5 rounded-xl border border-neutral-100">
                    {cat.criteria}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: HANDOVER LEDGER (سجل الاستلام) */}
      {/* ========================================================================= */}
      {activeTab === 'handover_ledger' && (
        <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                سجل الاستلام والتسليم الموثق بالباركود
              </h2>
              <p className="text-xs text-neutral-400">
                سجل رسمي لحظي لجميع سندات الصرف المسلمة للمستفيدين، مع خاصية إلغاء السند وإعادة الكمية للمخزون
              </p>
            </div>

            <button
              onClick={exportHandoverLedgerToExcel}
              className="px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              تصدير سجل الاستلام إكسل
            </button>
          </div>

          {/* Search & Filter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={ledgerSearchQuery}
                onChange={(e) => setLedgerSearchQuery(e.target.value)}
                placeholder="بحث باسم المستفيد، الهوية، الباركود، أو المسؤول..."
                className="w-full pr-9 pl-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <select
                value={ledgerDistFilter}
                onChange={(e) => setLedgerDistFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-700 font-bold focus:outline-none focus:border-emerald-500"
              >
                <option value="all">كافة التوزيعات والحملات</option>
                {distributions.map(d => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-neutral-100 text-neutral-500 font-bold bg-neutral-50">
                  <th className="p-3 rounded-r-xl">المستفيد</th>
                  <th className="p-3">التاريخ والوقت</th>
                  <th className="p-3">التوزيعة والصنف المسلّم</th>
                  <th className="p-3">الكمية</th>
                  <th className="p-3">المسؤول عن التسليم</th>
                  <th className="p-3">وسيلة التحقق</th>
                  <th className="p-3 text-center rounded-l-xl">إلغاء السند</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredLedger.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-neutral-400">
                      لا توجد سجلات تسليم مطابقة للبحث حتى الآن.
                    </td>
                  </tr>
                ) : (
                  filteredLedger.map(rec => (
                    <tr key={rec.id} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-neutral-900">{rec.beneficiaryName}</div>
                        <div className="text-[10px] text-neutral-400 font-mono">
                          {rec.nationalId || rec.barcodeId}
                        </div>
                      </td>
                      <td className="p-3 font-mono text-neutral-600">
                        <div>{rec.date}</div>
                        <div className="text-[10px] text-neutral-400">{rec.time}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-neutral-800">{rec.itemName || rec.distributionTitle}</div>
                        <div className="text-[10px] text-neutral-400">{rec.distributionTitle}</div>
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-700">
                        {rec.quantity || 1} {rec.unit || 'طرد'}
                      </td>
                      <td className="p-3 font-medium text-neutral-700">{rec.handedByUserName}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-700 flex items-center gap-1 w-fit">
                          <Barcode className="w-3 h-3 text-neutral-500" />
                          {rec.method === 'camera_scanner' ? 'كاميرا الموبايل' : rec.method === 'hardware_scanner' ? 'قارئ باركود' : 'يدوي'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            if (confirm(`هل أنت متأكد من إلغاء سند الاستلام للمستفيد (${rec.beneficiaryName}) وإعادة الكمية للمخزون؟`)) {
                              onCancelHandover(rec.id);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 mx-auto"
                        >
                          <Undo2 className="w-3 h-3" />
                          إلغاء
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: UPCOMING (التوزيعات القادمة) */}
      {/* ========================================================================= */}
      {activeTab === 'upcoming' && (
        <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-sm space-y-5">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              التوزيعات والحملات القادمة المجدولة
            </h2>
            <p className="text-xs text-neutral-400">التوزيعات المخططة التي تم حجز مخزونها وجارٍ التنسيق الميداني لها</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingDistributions.length === 0 ? (
              <div className="col-span-3 p-8 text-center text-neutral-400">
                لا توجد حملات توزيع قادمة مجدولة حالياً.
              </div>
            ) : (
              upcomingDistributions.map(dist => (
                <div key={dist.id} className="p-5 rounded-2xl bg-blue-50/40 border border-blue-200/60 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-neutral-900">{dist.title}</h4>
                      <span className="text-xs text-blue-700 font-bold block mt-0.5">{dist.quantityPerBeneficiary}</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                      قيد التحضير
                    </span>
                  </div>

                  <p className="text-xs text-neutral-600 leading-relaxed">{dist.description || 'توزيع مساعدات وفق جدول الإدارة'}</p>

                  <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between text-xs">
                    <span className="text-neutral-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      تاريخ الصرف: {dist.distributionDate}
                    </span>
                    <span className="font-bold text-blue-800">
                      {dist.targetedBeneficiaryIds?.length || beneficiaries.length} مستحق
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: COMPLETED (التوزيعات المكتملة) */}
      {/* ========================================================================= */}
      {activeTab === 'completed' && (
        <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-sm space-y-5">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              أرشيف التوزيعات المكتملة
            </h2>
            <p className="text-xs text-neutral-400">حملات التوزيع التي تم إنجازها بنسبة 100% وإغلاق سجلاتها الميدانية</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedDistributionsList.length === 0 ? (
              <div className="col-span-3 p-8 text-center text-neutral-400">
                لا توجد حملات توزيع مكتملة ومغلقة حتى الآن.
              </div>
            ) : (
              completedDistributionsList.map(dist => (
                <div key={dist.id} className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/60 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-neutral-900">{dist.title}</h4>
                      <span className="text-xs text-emerald-800 font-bold block mt-0.5">{dist.quantityPerBeneficiary}</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      مكتملة 100%
                    </span>
                  </div>

                  <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-xs text-neutral-600">
                    <span>تاريخ التنفيذ: {dist.distributionDate}</span>
                    <span className="font-bold text-emerald-800">
                      تم تسليم: {dist.distributedCount || dist.targetedBeneficiaryIds?.length || 0} طرد
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: BARCODE (الباركود) */}
      {/* ========================================================================= */}
      {activeTab === 'barcode' && (
        <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                <Barcode className="w-5 h-5 text-emerald-600" />
                منظومة الباركود الذكي للبطاقات والتسليم الميداني
              </h2>
              <p className="text-xs text-neutral-400">طباعة بطاقات الباركود للمستفيدين، مسح الكاميرا، والتحقق الفوري لمنع التكرار</p>
            </div>

            <button
              onClick={() => {
                setSelectedScannerDistId(distributions[0]?.id || '');
                setIsScannerOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Camera className="w-4 h-4" />
              تشغيل ماسح الباركود بالكاميرا
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {beneficiaries.slice(0, 6).map(ben => (
              <div key={ben.id} className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-neutral-900">{ben.name}</h4>
                    <span className="text-[10px] text-neutral-400 font-mono">{ben.nationalId || 'هوية وطنية'}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200 text-neutral-700">
                    {ben.category || 'عام'}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-neutral-200/60 text-center font-mono font-bold text-neutral-800 text-xs flex items-center justify-center gap-2">
                  <Barcode className="w-4 h-4 text-emerald-600" />
                  <span>{ben.barcodeId || 'BC-BEN-000000'}</span>
                </div>

                <button
                  onClick={() => setSelectedBarcodeBen(ben)}
                  className="w-full py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  معاينة وطباعة بطاقة المستفيد
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 9: REPORTS (التقارير) */}
      {/* ========================================================================= */}
      {activeTab === 'reports' && (
        <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                التقارير الإحصائية والتحليلية
              </h2>
              <p className="text-xs text-neutral-400">مؤشرات أداء التوزيعات، مطابقة المخزون، ونسب التغطية للمستفيدين</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-4">
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                توزيع المستفيدين حسب فئات الرعاية
              </h3>
              
              <div className="space-y-2 text-xs">
                {['أسر متعففة', 'أيتام', 'أرامل ومطلقات', 'ذوي الاحتياجات', 'كبار السن', 'محدودي الدخل'].map(cat => {
                  const count = beneficiaries.filter(b => b.category === cat).length;
                  const pct = beneficiaries.length > 0 ? Math.round((count / beneficiaries.length) * 100) : 0;
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between font-bold">
                        <span className="text-neutral-700">{cat}</span>
                        <span className="text-neutral-500 font-mono">{count} أسرة ({pct}%)</span>
                      </div>
                      <div className="w-full bg-neutral-200 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-4">
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                ملخص تسليم المساعدات والمخزون
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between p-3 bg-white rounded-xl border border-neutral-200/60">
                  <span className="text-neutral-600">إجمالي عمليات التسليم المنجزة:</span>
                  <span className="font-bold text-emerald-700 font-mono">{stats.totalHandovers} عملية</span>
                </div>
                <div className="flex justify-between p-3 bg-white rounded-xl border border-neutral-200/60">
                  <span className="text-neutral-600">إجمالي الطرود المخصصة:</span>
                  <span className="font-bold text-neutral-800 font-mono">{stats.totalAllocatedStock} طرد</span>
                </div>
                <div className="flex justify-between p-3 bg-white rounded-xl border border-neutral-200/60">
                  <span className="text-neutral-600">الرصيد المحجوز الحالي:</span>
                  <span className="font-bold text-amber-700 font-mono">{stats.totalReservedStock} وحدة</span>
                </div>
                <div className="flex justify-between p-3 bg-white rounded-xl border border-neutral-200/60">
                  <span className="text-neutral-600">متوسط معدل الإنجاز العام:</span>
                  <span className="font-bold text-emerald-600 font-mono">{stats.completionRate}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 10: NOTIFICATIONS (الإشعارات) */}
      {/* ========================================================================= */}
      {activeTab === 'notifications' && (
        <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-sm space-y-5">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-600" />
              إشعارات المستفيدين وتنبيهات المخزون
            </h2>
            <p className="text-xs text-neutral-400">سجل الإشعارات الموجهة للمستفيدين وإشعارات حجز الكميات من إدارة المستودعات</p>
          </div>

          <div className="space-y-2.5">
            {beneficiaryNotifications.length === 0 ? (
              <div className="p-8 text-center text-neutral-400 text-xs">
                لا توجد إشعارات مسجلة حديثاً في هذا القسم.
              </div>
            ) : (
              beneficiaryNotifications.map(notif => (
                <div key={notif.id} className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/60 flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                    notif.type === 'urgent' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-neutral-900">{notif.titleAr}</h4>
                      <span className="text-[10px] text-neutral-400 font-mono">{notif.date || notif.createdAt?.split('T')[0]}</span>
                    </div>
                    <p className="text-xs text-neutral-600 leading-relaxed">{notif.bodyAr}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE DISTRIBUTION WITH INVENTORY LINK */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-right" dir="rtl">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-neutral-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-neutral-900">إنشاء توزيعة مساعدات جديدة وربطها بالمخزون</h3>
                  <p className="text-[10px] text-neutral-400">حجز تلقائي للكميات من المستودع وإشعار المستفيدين</p>
                </div>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-neutral-400 hover:text-neutral-700 font-bold p-1">✕</button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveDistribution} className="space-y-4 text-xs">
              {/* Warehouse Inventory Selector */}
              <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-200/80 space-y-2">
                <label className="font-bold text-indigo-950 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  ربط الصنف من إدارة المستودعات والمخزون:
                </label>
                <select
                  value={formInventoryItemId}
                  onChange={(e) => handleInventoryItemChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-indigo-200 font-bold text-indigo-900 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- بدون ربط مخزون (مساعدات مباشرة / خارجية) --</option>
                  {availableInventoryItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} (المتاح بالمستودع: {item.availableStock} {item.unitOfMeasure})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-indigo-700/80">
                  عند تحديد صنف، سيتم فحص الرصيد المتاح بالمستودع وحجز الكميات المطلوبة تلقائياً مع إشعار إدارة المخزون فوراً.
                </p>
              </div>

              <div>
                <label className="font-bold text-neutral-700 block mb-1">عنوان التوزيعة / الحملة:</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="مثال: توزيع سلال غذائية متكاملة - رجب 1448"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-neutral-700 block mb-1">الكمية لكل مستفيد:</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formUnitQty}
                    onChange={(e) => setFormUnitQty(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-neutral-700 block mb-1">تاريخ التوزيع الميداني:</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-neutral-700 block mb-1">موقع التوزيع والتسليم:</label>
                <input
                  type="text"
                  required
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-neutral-700 block mb-1">الفئات المستهدفة وضوابط الاستحقاق:</label>
                <select
                  value={formTargetAudience}
                  onChange={(e: any) => setFormTargetAudience(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 font-bold focus:outline-none focus:border-emerald-500 mb-2"
                >
                  <option value="all">كافة المستفيدين المسجلين ({beneficiaries.length} مستفيد)</option>
                  <option value="specific_categories">فئات استحقاق محددة فقط</option>
                  <option value="approved_only">المستفيدين المعتمدين فقط</option>
                </select>

                {formTargetAudience === 'specific_categories' && (
                  <div className="grid grid-cols-2 gap-2 bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                    {['أسر متعففة', 'أيتام', 'أرامل ومطلقات', 'ذوي الاحتياجات', 'كبار السن', 'محدودي الدخل'].map(cat => {
                      const isChecked = selectedCategories.includes(cat);
                      return (
                        <label key={cat} className="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-700">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCategories([...selectedCategories, cat]);
                              } else {
                                setSelectedCategories(selectedCategories.filter(c => c !== cat));
                              }
                            }}
                            className="rounded text-emerald-600"
                          />
                          <span>{cat}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-neutral-700 block mb-1">وصف المساعدات وملاحظات الصرف:</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="أدخل أي ملاحظات إضافية حول التوزيعة..."
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-100 text-neutral-700 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer transition-all shadow-sm"
                >
                  {formSubmitting ? 'جاري الحجز والإنشاء...' : 'اعتماد التوزيعة وحجز المخزون'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD BENEFICIARY */}
      {/* ========================================================================= */}
      {isAddBenModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-right" dir="rtl">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-neutral-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-neutral-900">إضافة مستفيد جديد إلى السجل</h3>
                  <p className="text-[10px] text-neutral-400">توليد باركود تلقائي وتخصيص فئة الرعاية</p>
                </div>
              </div>
              <button onClick={() => setIsAddBenModalOpen(false)} className="text-neutral-400 hover:text-neutral-700 font-bold p-1">✕</button>
            </div>

            <form onSubmit={handleSaveBeneficiary} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-neutral-700 block mb-1">الاسم الرباعي للمستفيد:</label>
                <input
                  type="text"
                  required
                  value={benName}
                  onChange={(e) => setBenName(e.target.value)}
                  placeholder="مثال: عبدالله بن فهد السلمي"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-neutral-700 block mb-1">رقم الهوية الوطنية / الإقامة:</label>
                  <input
                    type="text"
                    required
                    value={benNationalId}
                    onChange={(e) => setBenNationalId(e.target.value)}
                    placeholder="10XXXXXXXX"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-neutral-700 block mb-1">رقم الجوال:</label>
                  <input
                    type="text"
                    required
                    value={benPhone}
                    onChange={(e) => setBenPhone(e.target.value)}
                    placeholder="05XXXXXXXX"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-neutral-700 block mb-1">عدد أفراد الأسرة:</label>
                  <input
                    type="number"
                    min={1}
                    value={benFamilySize}
                    onChange={(e) => setBenFamilySize(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-neutral-700 block mb-1">فئة الرعاية / الاستحقاق:</label>
                  <select
                    value={benCategory}
                    onChange={(e) => setBenCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 font-bold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="أسر متعففة">أسر متعففة</option>
                    <option value="أيتام">أيتام</option>
                    <option value="أرامل ومطلقات">أرامل ومطلقات</option>
                    <option value="ذوي الاحتياجات">ذوي الاحتياجات الخاصة</option>
                    <option value="كبار السن">كبار السن</option>
                    <option value="محدودي الدخل">محدودي الدخل</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-neutral-700 block mb-1">عنوان السكن والحي:</label>
                <input
                  type="text"
                  value={benAddress}
                  onChange={(e) => setBenAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddBenModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-100 text-neutral-700 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={benSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer transition-all shadow-sm"
                >
                  {benSubmitting ? 'جاري الحفظ...' : 'حفظ المستفيد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BARCODE SCANNER */}
      {/* ========================================================================= */}
      {isScannerOpen && (
        <AidHandoverScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          distributions={distributions}
          selectedDistributionId={selectedScannerDistId}
          beneficiaries={beneficiaries}
          handoverRecords={handoverRecords}
          currentUser={currentUser}
          onHandoverSubmit={onHandoverSubmit}
          lang={lang}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: BENEFICIARY BARCODE CARD PREVIEW & PRINT */}
      {/* ========================================================================= */}
      {selectedBarcodeBen && (
        <BeneficiaryBarcodeCard
          beneficiary={selectedBarcodeBen}
          homeSettings={homeSettings}
          isOpen={!!selectedBarcodeBen}
          onClose={() => setSelectedBarcodeBen(null)}
          lang={lang}
        />
      )}
    </div>
  );
};
