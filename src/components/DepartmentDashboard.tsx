import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Send, 
  Users, 
  FileText, 
  ShieldCheck, 
  Key, 
  Plus, 
  Sparkles, 
  CheckSquare, 
  MessageSquare,
  Award,
  ChevronRight,
  UserCheck,
  Briefcase,
  HeartHandshake,
  Mail,
  Boxes,
  Package,
  DollarSign,
  FolderKanban,
  Newspaper,
  Image,
  ShieldAlert,
  Lock,
  RefreshCw,
  LogOut,
  Eye,
  Search,
  Filter,
  Check,
  X,
  Calendar,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { 
  Department, 
  DepartmentDirective, 
  VolunteerTeam, 
  Volunteer, 
  Initiative, 
  Beneficiary, 
  OfficialLetter, 
  Employee, 
  EmployeeRequest, 
  AidDistribution, 
  DistributionHandoverRecord, 
  InventoryItem, 
  Notification,
  DepartmentPermissionKey
} from '../types';
import { InventoryManager } from './InventoryManager';
import { BeneficiariesMasterDashboard } from './BeneficiariesMasterDashboard';
import { SendLetterModal } from './SendLetterModal';
import { DepartmentStaffManager } from './DepartmentStaffManager';
import { DashboardErrorBoundary } from './DashboardErrorBoundary';
import { AccessDeniedCard } from './AccessDeniedCard';

export interface DepartmentDashboardProps {
  currentUser?: any;
  userRole?: string;
  userDepartmentId?: string;
  departments?: Department[];
  currentDepartment?: Department;
  directives?: DepartmentDirective[];
  teams?: VolunteerTeam[];
  volunteers?: Volunteer[];
  initiatives?: Initiative[];
  requests?: any[];
  employees?: Employee[];
  employeeRequests?: EmployeeRequest[];
  beneficiaries?: Beneficiary[];
  distributions?: AidDistribution[];
  distributionHandovers?: DistributionHandoverRecord[];
  inventoryItems?: InventoryItem[];
  financialTransactions?: any[];
  storeDonations?: any[];
  storeProjects?: any[];
  news?: any[];
  partners?: any[];
  gallery?: any[];
  heroSlides?: any[];
  notifications?: Notification[];
  letters?: OfficialLetter[];
  homeSettings?: any;
  onRefreshGlobalData?: () => void;
  onSubmitEmployeeRequest?: (req: Partial<EmployeeRequest>) => Promise<boolean>;
  onUpdateEmployeeRequest?: (req: Partial<EmployeeRequest>) => Promise<boolean>;
  onApproveEmployeeRequest?: (id: string) => Promise<boolean>;
  onRejectEmployeeRequest?: (id: string) => Promise<boolean>;
  onUpdateDirectiveStatus: (directiveId: string, status: 'pending' | 'in_progress' | 'completed' | 'needs_review', notes?: string) => void;
  onUpdateDepartmentTasks?: (departmentId: string, tasks: string[]) => void;
  onActionRequest?: (id: string, action: 'approved' | 'rejected') => void;
  onAddInitiative?: (init: Partial<Initiative>) => Promise<boolean>;
  onCopyInitiative?: (id: string, date: string, name: string) => void;
  onCreateDistribution?: (data: Partial<AidDistribution>) => Promise<boolean>;
  onUpdateDistribution?: (data: Partial<AidDistribution>) => Promise<boolean>;
  onDeleteDistribution?: (id: string) => Promise<boolean>;
  onHandoverSubmit?: (data: any) => Promise<any>;
  onCancelHandover?: (handoverId: string) => Promise<boolean>;
  onAddBeneficiary?: (data: Partial<Beneficiary>) => Promise<boolean>;
  onUpdateBeneficiaryStatus?: (id: string, status: "approved" | "pending" | "rejected") => Promise<boolean>;
  onSubmitOfficialLetter?: (letter: Partial<OfficialLetter>) => Promise<{ success: boolean; letter?: OfficialLetter; message?: string }>;
  onAddExpense?: (exp: any) => Promise<boolean>;
  onAddProject?: (proj: any) => Promise<boolean>;
  onAddNewsItem?: (item: any) => Promise<boolean>;
  onDeleteNewsItem?: (id: string) => Promise<boolean>;
  onAddPartnerItem?: (item: any) => Promise<boolean>;
  onDeletePartnerItem?: (id: string) => Promise<boolean>;
  onAddGalleryItem?: (item: any) => Promise<boolean>;
  onDeleteGalleryItem?: (id: string) => Promise<boolean>;
  onLogout?: () => void;
}

export const DepartmentDashboard: React.FC<DepartmentDashboardProps> = ({
  currentUser,
  userRole = 'department_admin',
  userDepartmentId,
  departments = [],
  currentDepartment,
  directives = [],
  teams = [],
  volunteers = [],
  initiatives = [],
  requests = [],
  employees = [],
  employeeRequests = [],
  beneficiaries = [],
  distributions = [],
  distributionHandovers = [],
  inventoryItems = [],
  financialTransactions = [],
  storeDonations = [],
  storeProjects = [],
  news = [],
  partners = [],
  gallery = [],
  heroSlides = [],
  notifications = [],
  letters = [],
  homeSettings,
  onRefreshGlobalData,
  onSubmitEmployeeRequest,
  onUpdateEmployeeRequest,
  onApproveEmployeeRequest,
  onRejectEmployeeRequest,
  onUpdateDirectiveStatus,
  onUpdateDepartmentTasks,
  onActionRequest,
  onAddInitiative,
  onCopyInitiative,
  onCreateDistribution = async () => false,
  onUpdateDistribution = async () => false,
  onDeleteDistribution = async () => false,
  onHandoverSubmit = async () => ({ success: false }),
  onCancelHandover = async () => false,
  onAddBeneficiary,
  onUpdateBeneficiaryStatus,
  onSubmitOfficialLetter,
  onAddExpense,
  onAddProject,
  onAddNewsItem,
  onDeleteNewsItem,
  onAddPartnerItem,
  onDeletePartnerItem,
  onAddGalleryItem,
  onDeleteGalleryItem,
  onLogout
}) => {
  // Resolve Target Department
  const deptId = currentDepartment?.id || userDepartmentId || currentUser?.departmentId || currentUser?.primaryDepartmentId || 'dep-1';
  const currentDept = currentDepartment || departments.find(d => d.id === deptId) || departments[0] || {
    id: deptId,
    nameAr: currentUser?.departmentName || currentUser?.departmentNameAr || "إدارة الجمعية",
    nameEn: "Department Management",
    directorName: currentUser?.name || "مدير الإدارة",
    nationalId: currentUser?.nationalId || "1010000001",
    email: currentUser?.email || "dept@riadataleata.org.sa",
    phone: currentUser?.phone || "0550000000",
    tasks: [
      "متابعة وتنفيذ خطة الإدارة التشغيلية.",
      "رفع تقارير الإنجاز الدورية لمجلس الإدارة.",
      "إدارة فرق العمل والمهام الموكلة."
    ]
  };

  const deptNameAr = (currentDept.nameAr || currentUser?.departmentName || currentUser?.departmentNameAr || '').toLowerCase();
  const jobTitle = (currentUser?.jobTitle || '').toLowerCase();
  const effectiveRole = currentUser?.role || userRole;

  // Department Type Classification
  const isWarehouseDept = deptId === 'dep-8' || deptNameAr.includes('مخزن') || deptNameAr.includes('مستودع') || deptNameAr.includes('مساندة') || jobTitle.includes('مخزن') || jobTitle.includes('مستودع') || effectiveRole === 'storekeeper';
  const isVolunteerDept = deptId === 'dep-5' || deptNameAr.includes('تطوع') || jobTitle.includes('تطوع');
  const isBeneficiaryDept = deptId === 'dep-4' || deptNameAr.includes('مستفيد') || jobTitle.includes('مستفيد');
  const isHRDept = deptId === 'dep-9' || deptId === 'dep-6_hr' || deptNameAr.includes('موارد بشرية') || deptNameAr.includes('كوادر') || jobTitle.includes('موارد بشرية');
  const isFinanceDept = deptId === 'dep-2' || deptNameAr.includes('مالي') || jobTitle.includes('مالي') || jobTitle.includes('محاسب');
  const isProjectsDept = deptId === 'dep-3' || deptNameAr.includes('برامج') || deptNameAr.includes('مشاريع') || jobTitle.includes('مشاريع');
  const isMediaDept = deptId === 'dep-6' || deptNameAr.includes('إعلام') || deptNameAr.includes('علاقات عامة') || jobTitle.includes('إعلام');
  const isExecutiveDept = deptId === 'dep-1' || deptNameAr.includes('تنفيذية') || effectiveRole === 'admin';

  // Role & Granular RBAC Permissions
  const isDirector = effectiveRole === 'department_admin' || effectiveRole === 'admin' || effectiveRole === 'storekeeper';
  const userPermissions: string[] = currentUser?.permissions || (isDirector ? [
    'view_department', 'create_data', 'edit_data', 'delete_data', 'approve_data', 
    'disburse_data', 'receive_data', 'print_data', 'export_pdf', 'export_excel', 
    'manage_staff', 'manage_tasks', 'view_reports', 'super_admin'
  ] : ['view_department']);

  const hasPermission = (permKey: DepartmentPermissionKey | string): boolean => {
    if (isDirector || userPermissions.includes('super_admin') || userPermissions.includes('all_permissions')) return true;
    if (userPermissions.includes(permKey as any)) return true;

    // Granular alias checks
    return userPermissions.some((p: string) => {
      if (permKey === 'create_data') {
        return p.includes('_add_') || p.includes('_create') || p === 'items' || p === 'create_initiatives';
      }
      if (permKey === 'edit_data') {
        return p.includes('_edit_') || p.includes('_manage_') || p.includes('_points') || p.includes('_quantities');
      }
      if (permKey === 'delete_data') {
        return p.includes('_delete_');
      }
      if (permKey === 'view_department') {
        return p.includes('_view_') || p.includes('_audit_') || p.includes('view_stock');
      }
      if (permKey === 'approve_data') {
        return p.includes('_approve_') || p.includes('_evaluations') || p.includes('_leaves');
      }
      if (permKey === 'disburse_data') {
        return p.includes('_disburse') || p === 'outbound' || p.includes('_payroll') || p.includes('_record_receipt');
      }
      if (permKey === 'receive_data') {
        return p.includes('_receive') || p === 'inbound' || p.includes('_record_receipt');
      }
      if (permKey === 'print_data') {
        return p.includes('_print') || p.includes('_barcode');
      }
      if (permKey === 'view_reports') {
        return p.includes('_reports') || p.includes('_audit_') || p === 'audit';
      }
      if (permKey === 'export_excel' || permKey === 'export_pdf') {
        return p.includes('_export');
      }
      if (permKey === 'manage_staff') {
        return p.includes('_staff') || p.includes('_files');
      }
      if (permKey === 'manage_tasks') {
        return p.includes('_manage_') || p.includes('_attendance');
      }
      return false;
    });
  };

  const allowedPages: string[] = currentUser?.allowedPages || [];
  const isPageAllowed = (pageKey: string): boolean => {
    if (isDirector || userPermissions.includes('super_admin') || allowedPages.length === 0) return true;
    return allowedPages.includes(pageKey);
  };

  const allDepartmentTabs = useMemo(() => {
    const tabs: { id: string; label: string }[] = [];
    if (isWarehouseDept) tabs.push({ id: 'inventory', label: 'إدارة المخزون والمستودعات' });
    if (isVolunteerDept) tabs.push({ id: 'volunteer_ops', label: 'الفرص والمبادرات التطوعية' });
    if (isVolunteerDept) tabs.push({ id: 'requests', label: 'طلبات الانضمام والتطوع' });
    if (isBeneficiaryDept) tabs.push({ id: 'beneficiaries', label: 'إدارة المستفيدين والتوزيعات' });
    if (isHRDept) tabs.push({ id: 'hr_staff', label: 'سجل الكوادر والموظفين' });
    if (isFinanceDept) tabs.push({ id: 'finance_ledger', label: 'المعاملات وسندات الصرف والقبض' });
    if (isProjectsDept) tabs.push({ id: 'projects_list', label: 'المشاريع والبرامج التنموية' });
    if (isMediaDept) tabs.push({ id: 'media_news', label: 'المركز الإعلامي والأخبار' });
    tabs.push({ id: 'directives', label: 'تكليفات الإدارة العليا' });
    tabs.push({ id: 'tasks', label: 'المهام والتكليفات' });
    tabs.push({ id: 'staff', label: 'كوادر الإدارة والتوظيف' });
    tabs.push({ id: 'letters', label: 'الخطابات والمراسلات' });
    tabs.push({ id: 'credentials', label: 'بيانات الاعتماد' });
    return tabs;
  }, [isWarehouseDept, isVolunteerDept, isBeneficiaryDept, isHRDept, isFinanceDept, isProjectsDept, isMediaDept]);

  const allowedDepartmentTabs = useMemo(() => {
    return allDepartmentTabs.filter(t => isPageAllowed(t.id));
  }, [allDepartmentTabs, allowedPages, isDirector, userPermissions]);

  // Default active tab based on department domain and allowed permissions
  const getDefaultTab = () => {
    if (allowedPages && allowedPages.length > 0 && !isDirector && !userPermissions.includes('super_admin')) {
      const match = allowedDepartmentTabs[0]?.id;
      if (match) return match;
    }
    if (isWarehouseDept && isPageAllowed('inventory')) return 'inventory';
    if (isBeneficiaryDept && isPageAllowed('beneficiaries')) return 'beneficiaries';
    if (isVolunteerDept && isPageAllowed('volunteer_ops')) return 'volunteer_ops';
    if (isHRDept && isPageAllowed('hr_staff')) return 'hr_staff';
    if (isFinanceDept && isPageAllowed('finance_ledger')) return 'finance_ledger';
    if (isProjectsDept && isPageAllowed('projects_list')) return 'projects_list';
    if (isMediaDept && isPageAllowed('media_news')) return 'media_news';
    if (isPageAllowed('directives')) return 'directives';
    if (isPageAllowed('tasks')) return 'tasks';
    return allowedDepartmentTabs[0]?.id || 'directives';
  };

  const [activeTab, setActiveTab] = useState<string>(getDefaultTab());
  const [isLetterModalOpen, setIsLetterModalOpen] = useState(false);
  const [selectedDirective, setSelectedDirective] = useState<DepartmentDirective | null>(null);
  const [reportNotes, setReportNotes] = useState('');
  const [targetStatus, setTargetStatus] = useState<'pending' | 'in_progress' | 'completed' | 'needs_review'>('completed');

  // Operational Tasks State
  const [deptTasks, setDeptTasks] = useState<string[]>(currentDept.tasks || []);
  const [newTaskInput, setNewTaskInput] = useState('');

  // Opportunities & Initiatives state (For Volunteer Management)
  const [showAddInitiativeModal, setShowAddInitiativeModal] = useState(false);
  const [newInitData, setNewInitData] = useState({
    title: '',
    category: 'إنساني',
    location: 'مكة المكرمة - العسيلة',
    hours: 4,
    requiredVolunteers: 20,
    startDate: new Date().toISOString().split('T')[0],
    description: '',
    targetBeneficiaryGroup: 'عام'
  });
  const [initFilterCategory, setInitFilterCategory] = useState<string>('all');
  const [initSearchQuery, setInitSearchQuery] = useState('');

  // Finance Voucher State
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [newExpenseData, setNewExpenseData] = useState({
    title: '',
    amount: '',
    category: 'تشغيلي',
    recipient: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Projects Modal State
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [newProjectData, setNewProjectData] = useState({
    title: '',
    budget: '',
    targetBeneficiaries: 100,
    description: '',
    category: 'تنموي',
    durationDays: 30
  });

  // Department Directives, Teams, Staff Filtering
  const myDirectives = directives.filter(d => 
    d.departmentId === currentDept.id || 
    d.departmentId === 'all' || 
    (d.assignedToDirectorId && d.assignedToDirectorId === currentUser?.id)
  );

  const myTeams = teams.filter(t => t.departmentId === currentDept.id || !t.departmentId);
  const myTeamIds = myTeams.map(t => t.id);
  const myVolunteers = volunteers.filter(v => v.departmentId === currentDept.id || myTeamIds.includes(v.teamId || ''));
  const myEmployees = employees.filter(e => e.departmentId === currentDept.id || e.departmentName === currentDept.nameAr);

  // Department-specific letters
  const myLetters = letters.filter(l => 
    l.targetDepartmentId === currentDept.id || 
    l.departmentId === currentDept.id || 
    l.senderId === currentUser?.id || 
    l.targetDirectorId === currentUser?.id ||
    l.departmentName === currentDept.nameAr
  );

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission('manage_tasks') && !hasPermission('create_data')) {
      alert("عذراً، لا تملك صلاحية إضافة مهام تشغيلية جديدة.");
      return;
    }
    if (!newTaskInput.trim()) return;
    const updated = [...deptTasks, newTaskInput.trim()];
    setDeptTasks(updated);
    setNewTaskInput('');
    if (onUpdateDepartmentTasks) {
      onUpdateDepartmentTasks(currentDept.id, updated);
    }
  };

  const handleRemoveTask = (idx: number) => {
    if (!hasPermission('manage_tasks') && !hasPermission('delete_data')) {
      alert("عذراً، لا تملك صلاحية حذف المهام التشغيلية.");
      return;
    }
    const updated = deptTasks.filter((_, i) => i !== idx);
    setDeptTasks(updated);
    if (onUpdateDepartmentTasks) {
      onUpdateDepartmentTasks(currentDept.id, updated);
    }
  };

  const handleOpenReportModal = (directive: DepartmentDirective) => {
    setSelectedDirective(directive);
    setReportNotes(directive.completionNotes || '');
    setTargetStatus(directive.status || 'completed');
  };

  const handleSaveReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDirective) return;
    onUpdateDirectiveStatus(selectedDirective.id, targetStatus, reportNotes);
    setSelectedDirective(null);
  };

  const handleCreateInitiativeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission('create_data')) {
      alert("عذراً، حسابك لا يملك صلاحية إنشاء وطرح فرص تطوعية جديدة.");
      return;
    }
    if (!newInitData.title.trim()) return;
    if (onAddInitiative) {
      const success = await onAddInitiative({
        ...newInitData,
        departmentId: currentDept.id,
        hours: Number(newInitData.hours) || 4,
        requiredVolunteers: Number(newInitData.requiredVolunteers) || 10,
        currentVolunteersCount: 0,
        acceptedVolunteerIds: [],
        status: 'published',
        registrationStatus: 'open',
        createdBy: currentUser?.name || currentDept.directorName
      });
      if (success) {
        setShowAddInitiativeModal(false);
        setNewInitData({
          title: '',
          category: 'إنساني',
          location: 'مكة المكرمة - العسيلة',
          hours: 4,
          requiredVolunteers: 20,
          startDate: new Date().toISOString().split('T')[0],
          description: '',
          targetBeneficiaryGroup: 'عام'
        });
        if (onRefreshGlobalData) onRefreshGlobalData();
      }
    }
  };

  const handleCreateExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission('disburse_data') && !hasPermission('create_data')) {
      alert("عذراً، لا تملك صلاحية اعتماد سندات الصرف أو القيود المالية.");
      return;
    }
    if (!newExpenseData.title || !newExpenseData.amount) return;
    if (onAddExpense) {
      const ok = await onAddExpense({
        ...newExpenseData,
        amount: Number(newExpenseData.amount),
        departmentId: currentDept.id,
        departmentName: currentDept.nameAr,
        createdById: currentUser?.id,
        createdByName: currentUser?.name || currentDept.directorName
      });
      if (ok) {
        setShowAddExpenseModal(false);
        setNewExpenseData({
          title: '',
          amount: '',
          category: 'تشغيلي',
          recipient: '',
          notes: '',
          date: new Date().toISOString().split('T')[0]
        });
        if (onRefreshGlobalData) onRefreshGlobalData();
      }
    }
  };

  const handleCreateProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission('create_data')) {
      alert("عذراً، لا تملك صلاحية إدراج مشاريع وبرامج جديدة.");
      return;
    }
    if (!newProjectData.title) return;
    if (onAddProject) {
      const ok = await onAddProject({
        ...newProjectData,
        budget: Number(newProjectData.budget) || 0,
        departmentId: currentDept.id,
        departmentName: currentDept.nameAr,
        status: 'in_progress',
        progressPercent: 0,
        createdById: currentUser?.id
      });
      if (ok) {
        setShowAddProjectModal(false);
        setNewProjectData({
          title: '',
          budget: '',
          targetBeneficiaries: 100,
          description: '',
          category: 'تنموي',
          durationDays: 30
        });
        if (onRefreshGlobalData) onRefreshGlobalData();
      }
    }
  };

  return (
    <div className="w-full text-slate-100 font-sans dir-rtl" dir="rtl">
      <div className="w-full space-y-6">

        {/* TOP PROFILE & DEPARTMENT IDENTITY BANNER */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 border border-emerald-800/80 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
          
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 border-2 border-emerald-400/40 flex items-center justify-center shadow-lg text-white shrink-0">
                {isWarehouseDept ? (
                  <Boxes className="w-8 h-8 text-emerald-200" />
                ) : isVolunteerDept ? (
                  <Sparkles className="w-8 h-8 text-emerald-200" />
                ) : isBeneficiaryDept ? (
                  <HeartHandshake className="w-8 h-8 text-emerald-200" />
                ) : isHRDept ? (
                  <Users className="w-8 h-8 text-emerald-200" />
                ) : isFinanceDept ? (
                  <DollarSign className="w-8 h-8 text-emerald-200" />
                ) : isProjectsDept ? (
                  <FolderKanban className="w-8 h-8 text-emerald-200" />
                ) : isMediaDept ? (
                  <Newspaper className="w-8 h-8 text-emerald-200" />
                ) : (
                  <Building2 className="w-8 h-8 text-emerald-200" />
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="px-3 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs">
                    {currentDept.nameAr}
                  </span>
                  {isDirector ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      👑 مدير الإدارة - صلاحيات إدارية كاملة
                    </span>
                  ) : effectiveRole === 'storekeeper' ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      📦 أمين مستودع معتمد
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      👔 موظف إدارة معتمد
                    </span>
                  )}
                  {currentUser?.jobTitle && (
                    <span className="text-xs text-slate-300 font-medium">
                      المسمى: <span className="text-emerald-300 font-bold">{currentUser.jobTitle}</span>
                    </span>
                  )}
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-white">
                  مرحباً بك، {currentUser?.name || currentDept.directorName}
                </h1>
                <p className="text-xs sm:text-sm text-emerald-200/80 mt-1 max-w-2xl leading-relaxed">
                  {isWarehouseDept ? (
                    "مساحة العمل المتكاملة لإدارة المخزون، الأصناف، والعمليات المستودعية، والصرف والاستلام والجرد والباركود."
                  ) : isVolunteerDept ? (
                    "مساحة إدارة الفرص التطوعية والمبادرات واعتماد المتطوعين والفرق وسجلات الساعات المعتمدة."
                  ) : isBeneficiaryDept ? (
                    "المنظومة المركزية لإدارة شؤون المستفيدين ومطابقة الاستحقاق ومتابعة قوافل التوزيع والتسليم الميداني."
                  ) : isHRDept ? (
                    "مساحة إدارة الكوادر البشرية، طلبات التوظيف والاحتياج، والبطاقات التعريفية للموظفين."
                  ) : isFinanceDept ? (
                    "مساحة الإدارة المالية وسندات الصرف والقيود ومتابعة إيرادات المتجر الإلكتروني."
                  ) : isProjectsDept ? (
                    "مساحة إدارة البرامج والمشاريع التنموية ومتابعة نسب الإنجاز والميزانيات المعتمدة."
                  ) : isMediaDept ? (
                    "مساحة المركز الإعلامي، التوثيق الميداني، نشر الأخبار، وإدارة شركاء النجاح."
                  ) : (
                    "لوحة إدارة المهام التشغيلية وتكليفات مجلس الإدارة ومتابعة مؤشرات الإنجاز."
                  )}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <button
                type="button"
                onClick={() => setIsLetterModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Mail className="w-4 h-4" />
                <span>إرسال خطاب رسمي</span>
              </button>

              {onRefreshGlobalData && (
                <button
                  type="button"
                  onClick={onRefreshGlobalData}
                  title="تحديث البيانات"
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  title="تسجيل الخروج"
                  className="p-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800/80 text-rose-300 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-emerald-800/60">
            <div className="bg-emerald-950/60 p-3 rounded-2xl border border-emerald-800/50">
              <div className="text-[11px] text-emerald-300/80 mb-0.5">تكليفات الإدارة</div>
              <div className="text-lg font-black text-white font-mono">{myDirectives.length} تكليف</div>
            </div>

            <div className="bg-emerald-950/60 p-3 rounded-2xl border border-emerald-800/50">
              <div className="text-[11px] text-emerald-300/80 mb-0.5">المهام التشغيلية</div>
              <div className="text-lg font-black text-white font-mono">{deptTasks.length} مهمة</div>
            </div>

            <div className="bg-emerald-950/60 p-3 rounded-2xl border border-emerald-800/50">
              <div className="text-[11px] text-emerald-300/80 mb-0.5">كوادر الإدارة</div>
              <div className="text-lg font-black text-white font-mono">{myEmployees.length} موظف</div>
            </div>

            <div className="bg-emerald-950/60 p-3 rounded-2xl border border-emerald-800/50">
              <div className="text-[11px] text-emerald-300/80 mb-0.5">الخطابات والمراسلات</div>
              <div className="text-lg font-black text-emerald-400 font-mono">{myLetters.length} خطاب</div>
            </div>
          </div>
        </div>

        {/* WORKSPACE NAVIGATION TABS */}
        <div className="flex border-b border-slate-800 space-x-2 space-x-reverse overflow-x-auto pb-1 scrollbar-thin">
          
          {/* 1. DEDICATED DOMAIN TAB */}
          {isWarehouseDept && isPageAllowed('inventory') && (
            <button
              type="button"
              onClick={() => setActiveTab('inventory')}
              className={`px-5 py-3 rounded-t-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'inventory'
                  ? 'bg-emerald-600 text-white shadow-lg border-b-2 border-emerald-400'
                  : 'bg-slate-900/80 text-emerald-300 hover:bg-slate-800 border-t border-x border-slate-800'
              }`}
            >
              <Boxes className="w-4 h-4 text-emerald-300" />
              <span>إدارة المخزون والمستودعات</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-900/90 text-[10px] font-mono font-bold text-emerald-300 border border-emerald-700">
                {inventoryItems.length} صنف
              </span>
            </button>
          )}

          {isVolunteerDept && isPageAllowed('volunteer_ops') && (
            <button
              type="button"
              onClick={() => setActiveTab('volunteer_ops')}
              className={`px-5 py-3 rounded-t-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'volunteer_ops'
                  ? 'bg-emerald-600 text-white shadow-lg border-b-2 border-emerald-400'
                  : 'bg-slate-900/80 text-emerald-300 hover:bg-slate-800 border-t border-x border-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4 text-emerald-300" />
              <span>الفرص والمبادرات التطوعية</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-900/90 text-[10px] font-mono font-bold text-emerald-300 border border-emerald-700">
                {initiatives.length} فرصة
              </span>
            </button>
          )}

          {isVolunteerDept && isPageAllowed('requests') && (
            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              className={`px-5 py-3 rounded-t-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'requests'
                  ? 'bg-emerald-600 text-white shadow-lg border-b-2 border-emerald-400'
                  : 'bg-slate-900/80 text-emerald-300 hover:bg-slate-800 border-t border-x border-slate-800'
              }`}
            >
              <UserCheck className="w-4 h-4 text-emerald-300" />
              <span>طلبات الانضمام والتطوع</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-900/90 text-[10px] font-mono font-bold text-emerald-300 border border-emerald-700">
                {requests.length} طلب
              </span>
            </button>
          )}

          {isBeneficiaryDept && isPageAllowed('beneficiaries') && (
            <button
              type="button"
              onClick={() => setActiveTab('beneficiaries')}
              className={`px-5 py-3 rounded-t-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'beneficiaries'
                  ? 'bg-emerald-600 text-white shadow-lg border-b-2 border-emerald-400'
                  : 'bg-slate-900/80 text-emerald-300 hover:bg-slate-800 border-t border-x border-slate-800'
              }`}
            >
              <HeartHandshake className="w-4 h-4 text-emerald-300" />
              <span>إدارة المستفيدين والتوزيعات</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-900/90 text-[10px] font-mono font-bold text-emerald-300 border border-emerald-700">
                {beneficiaries.length} مستفيد
              </span>
            </button>
          )}

          {isHRDept && isPageAllowed('hr_staff') && (
            <button
              type="button"
              onClick={() => setActiveTab('hr_staff')}
              className={`px-5 py-3 rounded-t-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'hr_staff'
                  ? 'bg-emerald-600 text-white shadow-lg border-b-2 border-emerald-400'
                  : 'bg-slate-900/80 text-emerald-300 hover:bg-slate-800 border-t border-x border-slate-800'
              }`}
            >
              <Users className="w-4 h-4 text-emerald-300" />
              <span>سجل الكوادر والموظفين</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-900/90 text-[10px] font-mono font-bold text-emerald-300 border border-emerald-700">
                {employees.length} موظف
              </span>
            </button>
          )}

          {isFinanceDept && isPageAllowed('finance_ledger') && (
            <button
              type="button"
              onClick={() => setActiveTab('finance_ledger')}
              className={`px-5 py-3 rounded-t-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'finance_ledger'
                  ? 'bg-emerald-600 text-white shadow-lg border-b-2 border-emerald-400'
                  : 'bg-slate-900/80 text-emerald-300 hover:bg-slate-800 border-t border-x border-slate-800'
              }`}
            >
              <DollarSign className="w-4 h-4 text-emerald-300" />
              <span>المعاملات وسندات الصرف والقبض</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-900/90 text-[10px] font-mono font-bold text-emerald-300 border border-emerald-700">
                {financialTransactions.length} قيد
              </span>
            </button>
          )}

          {isProjectsDept && isPageAllowed('projects_list') && (
            <button
              type="button"
              onClick={() => setActiveTab('projects_list')}
              className={`px-5 py-3 rounded-t-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'projects_list'
                  ? 'bg-emerald-600 text-white shadow-lg border-b-2 border-emerald-400'
                  : 'bg-slate-900/80 text-emerald-300 hover:bg-slate-800 border-t border-x border-slate-800'
              }`}
            >
              <FolderKanban className="w-4 h-4 text-emerald-300" />
              <span>المشاريع والبرامج التنموية</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-900/90 text-[10px] font-mono font-bold text-emerald-300 border border-emerald-700">
                {storeProjects.length} مشروع
              </span>
            </button>
          )}

          {isMediaDept && isPageAllowed('media_news') && (
            <button
              type="button"
              onClick={() => setActiveTab('media_news')}
              className={`px-5 py-3 rounded-t-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'media_news'
                  ? 'bg-emerald-600 text-white shadow-lg border-b-2 border-emerald-400'
                  : 'bg-slate-900/80 text-emerald-300 hover:bg-slate-800 border-t border-x border-slate-800'
              }`}
            >
              <Newspaper className="w-4 h-4 text-emerald-300" />
              <span>المركز الإعلامي والأخبار</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-900/90 text-[10px] font-mono font-bold text-emerald-300 border border-emerald-700">
                {news.length} خبر
              </span>
            </button>
          )}

          {/* COMMON TABS */}
          {isPageAllowed('directives') && (
            <button
              type="button"
              onClick={() => setActiveTab('directives')}
              className={`px-5 py-3 rounded-t-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'directives'
                  ? 'bg-emerald-600 text-white shadow-lg border-b-2 border-emerald-400'
                  : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border-t border-x border-slate-800'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>تكليفات الإدارة العليا</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono text-emerald-300">
                {myDirectives.length}
              </span>
            </button>
          )}

          {isPageAllowed('tasks') && (
            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className={`px-5 py-3 rounded-t-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'tasks'
                  ? 'bg-emerald-600 text-white shadow-lg border-b-2 border-emerald-400'
                  : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border-t border-x border-slate-800'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>المهام والتكليفات</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono text-emerald-300">
                {deptTasks.length}
              </span>
            </button>
          )}

          {isPageAllowed('staff') && (
            <button
              type="button"
              onClick={() => setActiveTab('staff')}
              className={`px-5 py-3 rounded-t-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'staff'
                  ? 'bg-emerald-600 text-white shadow-lg border-b-2 border-emerald-400'
                  : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border-t border-x border-slate-800'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>كوادر الإدارة والتوظيف</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono text-emerald-300">
                {myEmployees.length}
              </span>
            </button>
          )}

          {isPageAllowed('letters') && (
            <button
              type="button"
              onClick={() => setActiveTab('letters')}
              className={`px-5 py-3 rounded-t-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'letters'
                  ? 'bg-emerald-600 text-white shadow-lg border-b-2 border-emerald-400'
                  : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border-t border-x border-slate-800'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>الخطابات والمراسلات</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono text-emerald-300">
                {myLetters.length}
              </span>
            </button>
          )}

          {isPageAllowed('credentials') && (
            <button
              type="button"
              onClick={() => setActiveTab('credentials')}
              className={`px-5 py-3 rounded-t-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'credentials'
                  ? 'bg-emerald-600 text-white shadow-lg border-b-2 border-emerald-400'
                  : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border-t border-x border-slate-800'
              }`}
            >
              <Key className="w-4 h-4" />
              <span>بيانات الاعتماد</span>
            </button>
          )}
        </div>

        {/* ======================================================== */}
        {/* TAB CONTENT RENDERERS */}
        {/* ======================================================== */}

        <DashboardErrorBoundary 
          pageName={`إدارة ${currentDept.nameAr} - ${allDepartmentTabs.find(t => t.id === activeTab)?.label || activeTab}`}
          onReset={() => setActiveTab(getDefaultTab())}
        >
        {!isPageAllowed(activeTab) ? (
          <AccessDeniedCard
            pageTitle={allDepartmentTabs.find(t => t.id === activeTab)?.label || activeTab}
            departmentName={currentDept.nameAr}
            allowedPages={allowedDepartmentTabs}
            onNavigateToAllowed={(pageId) => setActiveTab(pageId)}
          />
        ) : (
          <>
        {/* 1. WAREHOUSE TAB: FULL INVENTORY MANAGER */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            <InventoryManager
              initiatives={initiatives}
              onRefreshGlobalData={onRefreshGlobalData}
              currentUser={currentUser}
              storekeeperMode={effectiveRole === 'storekeeper'}
              onLogout={onLogout}
            />
          </div>
        )}

        {/* 2. VOLUNTEER OPS TAB */}
        {activeTab === 'volunteer_ops' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-emerald-400" />
                    الفرص والمبادرات التطوعية التابعة لإدارة ({currentDept.nameAr})
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    إدارة وطرح الفرص التطوعية في العسيلة ومكة المكرمة، متابعة المقاعد، والساعات المعتمدة.
                  </p>
                </div>

                {hasPermission('create_data') ? (
                  <button
                    type="button"
                    onClick={() => setShowAddInitiativeModal(true)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>طرح فرصة تطوعية جديدة</span>
                  </button>
                ) : (
                  <div className="text-xs text-amber-400/90 bg-amber-950/40 border border-amber-800/40 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>صلاحية إضافة المبادرات مخصصة لمدير الإدارة</span>
                  </div>
                )}
              </div>

              {/* Initiatives Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                {initiatives.map((init) => (
                  <div key={init.id} className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 hover:border-emerald-600/50 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {init.category || 'تطوع عام'}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          init.registrationStatus === 'open' 
                            ? 'bg-emerald-500/20 text-emerald-300' 
                            : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {init.registrationStatus === 'open' ? 'التسجيل متاح' : 'مكتمل / مغلق'}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white mb-2 line-clamp-1">{init.title}</h3>
                      <p className="text-xs text-slate-400 mb-4 line-clamp-2 leading-relaxed">
                        {init.description || 'فرصة تطوعية ميدانية لخدمة ضيوف الرحمن وأهالي مكة المكرمة.'}
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl mb-4">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-emerald-400" />
                          <span>الساعات: <strong className="text-white font-mono">{init.hours || 4} س</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-emerald-400" />
                          <span>المقاعد: <strong className="text-white font-mono">{init.requiredVolunteers || 20}</strong></span>
                        </div>
                        <div className="col-span-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="truncate">{init.location || 'العسيلة - مكة المكرمة'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-mono">{init.startDate || '2026-03-30'}</span>
                      <span className="text-emerald-400 font-bold">
                        المسجلين: {init.acceptedVolunteerIds?.length || 0}
                      </span>
                    </div>
                  </div>
                ))}

                {initiatives.length === 0 && (
                  <div className="col-span-3 text-center py-12 text-slate-500 text-sm">
                    لا توجد فرص تطوعية مسجلة حتى الآن.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 3. VOLUNTEER REQUESTS TAB */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
                <UserCheck className="w-6 h-6 text-emerald-400" />
                طلبات الانضمام والتطوع الواردة ({requests.length})
              </h2>

              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-950 text-slate-400 text-xs">
                    <tr>
                      <th className="p-3">اسم المتقدم</th>
                      <th className="p-3">رقم الجوال</th>
                      <th className="p-3">الفرصة / المبادرة</th>
                      <th className="p-3">تاريخ التقديم</th>
                      <th className="p-3">الحالة</th>
                      <th className="p-3 text-center">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {requests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-white">{req.volunteerName || req.name || 'متطوع'}</td>
                        <td className="p-3 font-mono text-xs">{req.phone || '05XXXXXXXX'}</td>
                        <td className="p-3 text-xs">{req.initiativeTitle || 'مبادرة عامة'}</td>
                        <td className="p-3 font-mono text-xs text-slate-400">{req.date || req.createdAt?.split('T')[0] || '2026-03-23'}</td>
                        <td className="p-3 text-xs">
                          <span className={`px-2 py-0.5 rounded-full ${
                            req.status === 'approved' 
                              ? 'bg-emerald-500/20 text-emerald-300' 
                              : req.status === 'rejected'
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {req.status === 'approved' ? 'معتمد' : req.status === 'rejected' ? 'مرفوض' : 'قيد الانتظار'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {hasPermission('approve_data') ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onActionRequest && onActionRequest(req.id, 'approved')}
                                className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs cursor-pointer"
                                title="قبول واعتماد"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onActionRequest && onActionRequest(req.id, 'rejected')}
                                className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs cursor-pointer"
                                title="رفض الطلب"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-500">للمدير فقط</span>
                          )}
                        </td>
                      </tr>
                    ))}

                    {requests.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500 text-sm">
                          لا توجد طلبات انضمام جديدة قيد المراجعة حالياً.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 4. BENEFICIARIES MASTER DASHBOARD TAB */}
        {activeTab === 'beneficiaries' && (
          <BeneficiariesMasterDashboard
            beneficiaries={beneficiaries}
            distributions={distributions}
            handoverRecords={distributionHandovers}
            inventoryItems={inventoryItems}
            notifications={notifications}
            homeSettings={homeSettings}
            currentUser={{
              id: currentDept.id,
              name: currentUser?.name || currentDept.directorName,
              role: effectiveRole,
              departmentId: currentDept.id
            }}
            onCreateDistribution={onCreateDistribution}
            onUpdateDistribution={onUpdateDistribution}
            onDeleteDistribution={onDeleteDistribution}
            onHandoverSubmit={onHandoverSubmit}
            onCancelHandover={onCancelHandover}
            onUpdateBeneficiaryStatus={onUpdateBeneficiaryStatus}
            onAddBeneficiary={onAddBeneficiary}
            lang="ar"
          />
        )}

        {/* 5. HR STAFF & RECRUITMENT TAB */}
        {activeTab === 'hr_staff' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <Users className="w-6 h-6 text-emerald-400" />
                    سجل الكوادر والموظفين بالجمعية ({employees.length})
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    استعراض الموظفين، الإدارات، المسميات الوظيفية، والبطاقات التعريفية الرقمية.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                {employees.map((emp) => (
                  <div key={emp.id} className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-emerald-600/40 transition-all">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white font-black text-base shrink-0">
                          {emp.name?.charAt(0) || 'م'}
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm">{emp.name}</h4>
                          <span className="text-xs text-emerald-400">{emp.jobTitle || 'موظف'}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl mb-3">
                        <div className="flex justify-between">
                          <span className="text-slate-400">الإدارة:</span>
                          <span className="font-semibold">{emp.departmentName || currentDept.nameAr}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">رقم الهوية:</span>
                          <span className="font-mono">{emp.nationalId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">رقم الموظف:</span>
                          <span className="font-mono text-emerald-400">{emp.employeeNumber || emp.id}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
                      <span className="text-slate-400">{emp.phone}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px]">
                        {emp.status === 'active' ? 'على رأس العمل' : 'معلق'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recruitment requests */}
            <DepartmentStaffManager
              currentDepartment={currentDept}
              employees={employees}
              employeeRequests={employeeRequests}
              onSubmitRequest={onSubmitEmployeeRequest || (async () => false)}
              onUpdateRequest={onUpdateEmployeeRequest || (async () => false)}
            />
          </div>
        )}

        {/* 6. FINANCE LEDGER & EXPENSES TAB */}
        {activeTab === 'finance_ledger' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <DollarSign className="w-6 h-6 text-emerald-400" />
                    المعاملات المالية وسندات الصرف والقبض
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    إدارة القيود المالية وسندات الصرف المعتمدة والتبرعات الواردة للجمعية.
                  </p>
                </div>

                {hasPermission('disburse_data') ? (
                  <button
                    type="button"
                    onClick={() => setShowAddExpenseModal(true)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إصدار سند صرف مالي</span>
                  </button>
                ) : (
                  <div className="text-xs text-amber-400/90 bg-amber-950/40 border border-amber-800/40 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>صلاحية سندات الصرف للمدير المالي المعتمد</span>
                  </div>
                )}
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-950 text-slate-400 text-xs">
                    <tr>
                      <th className="p-3">رقم السند</th>
                      <th className="p-3">البيان / الوصف</th>
                      <th className="p-3">البند المالي</th>
                      <th className="p-3">المستفيد / الجهة</th>
                      <th className="p-3">المبلغ (ر.س)</th>
                      <th className="p-3">التاريخ</th>
                      <th className="p-3">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {financialTransactions.map((tx: any, idx: number) => (
                      <tr key={tx.id || idx} className="hover:bg-slate-800/40">
                        <td className="p-3 font-mono text-xs text-emerald-400">{tx.voucherNumber || tx.id || `VCH-${1000 + idx}`}</td>
                        <td className="p-3 font-bold text-white">{tx.title || tx.description || 'سند صرف تشغيلي'}</td>
                        <td className="p-3 text-xs text-slate-400">{tx.category || 'تشغيلي'}</td>
                        <td className="p-3 text-xs">{tx.recipient || currentDept.nameAr}</td>
                        <td className="p-3 font-mono text-emerald-300 font-bold">{Number(tx.amount || 0).toLocaleString()} ر.س</td>
                        <td className="p-3 font-mono text-xs text-slate-400">{tx.date || '2026-03-23'}</td>
                        <td className="p-3 text-xs">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                            معتمد
                          </span>
                        </td>
                      </tr>
                    ))}

                    {financialTransactions.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500 text-sm">
                          لا توجد سندات صرف مسجلة حالياً في هذا القسم.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 7. PROJECTS & PROGRAMS TAB */}
        {activeTab === 'projects_list' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <FolderKanban className="w-6 h-6 text-emerald-400" />
                    المشاريع التنموية والبرامج المعتمدة ({storeProjects.length})
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    إدارة المشاريع التنموية، نسب الإنجاز الميداني، وميزانيات المبادرات.
                  </p>
                </div>

                {hasPermission('create_data') && (
                  <button
                    type="button"
                    onClick={() => setShowAddProjectModal(true)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إدراج مشروع تنموي جديد</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                {storeProjects.map((proj: any, idx: number) => (
                  <div key={proj.id || idx} className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 hover:border-emerald-600/40 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {proj.category || 'تنموي'}
                        </span>
                        <span className="text-xs text-emerald-400 font-mono font-bold">
                          {Number(proj.budget || 50000).toLocaleString()} ر.س
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white mb-2">{proj.title || 'مشروع تنموي'}</h3>
                      <p className="text-xs text-slate-400 mb-4 line-clamp-2 leading-relaxed">
                        {proj.description || 'مشروع تنموي مستدام لخدمة أسر وأهالي مكة المكرمة.'}
                      </p>

                      <div className="space-y-1.5 mb-4">
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>نسبة الإنجاز:</span>
                          <span className="font-mono text-emerald-300 font-bold">{proj.progressPercent || 35}%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2">
                          <div 
                            className="bg-emerald-500 h-2 rounded-full" 
                            style={{ width: `${proj.progressPercent || 35}%` }} 
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                      <span>المستفيدين: {proj.targetBeneficiaries || 200}</span>
                      <span className="text-emerald-400">قيد التنفيذ</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 8. MEDIA & PR TAB */}
        {activeTab === 'media_news' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <Newspaper className="w-6 h-6 text-emerald-400" />
                    المركز الإعلامي والبيانات الصحفية ({news.length})
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    إدارة ونشر الأخبار، وتوثيق إنجازات الجمعية والمشاريع الميدانية.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                {news.map((item: any, idx: number) => (
                  <div key={item.id || idx} className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-emerald-600/40 transition-all">
                    {item.imageUrl && (
                      <div className="h-40 bg-slate-900 overflow-hidden">
                        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                        {item.category || 'خبر صحفي'}
                      </span>
                      <h4 className="font-bold text-white text-sm mt-2 mb-1 line-clamp-1">{item.title}</h4>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {item.content || item.summary || 'تغطية إعلامية لأنشطة وبرامج الجمعية.'}
                      </p>
                    </div>

                    <div className="p-4 pt-0 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                      <span>{item.date || '2026-03-23'}</span>
                      {hasPermission('delete_data') && onDeleteNewsItem && (
                        <button
                          type="button"
                          onClick={() => onDeleteNewsItem(item.id)}
                          className="text-rose-400 hover:text-rose-300 text-xs cursor-pointer"
                        >
                          حذف
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 9. DIRECTIVES TAB */}
        {activeTab === 'directives' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  تكليفات وإرشادات مجلس الإدارة الموجهة لإدارة ({currentDept.nameAr})
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  يتلقى مدير الإدارة التكليفات العاجلة والخطط التشغيلية الرسمية، ويمكنه رفع تقارير الإنجاز مباشرة.
                </p>
              </div>
            </div>

            {myDirectives.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/60 rounded-3xl border border-slate-800 p-8">
                <CheckCircle2 className="w-12 h-12 text-emerald-500/60 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white">لا توجد تكليفات جديدة حالياً من مجلس الإدارة</h3>
                <p className="text-slate-400 text-sm mt-1">
                  سيظهر هنا كل تكليف رسمي جديد يتم إرساله من الإدارة التنفيذية ومجلس الإدارة لمتابعة تنفيذه.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myDirectives.map((dir) => (
                  <div 
                    key={dir.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-emerald-600/60 transition-all shadow-lg flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          dir.priority === 'urgent' 
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                            : dir.priority === 'high' 
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {dir.priority === 'urgent' ? '🔴 أولوية عاجلة جداً' : dir.priority === 'high' ? '🟠 أولوية هامة' : '🟢 أولوية عادية'}
                        </span>

                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          dir.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : dir.status === 'in_progress'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            : dir.status === 'needs_review'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-stone-500/20 text-stone-300 border border-stone-500/40'
                        }`}>
                          {dir.status === 'completed' ? '✓ تم الإنجاز' : dir.status === 'in_progress' ? '⚙️ قيد التنفيذ' : dir.status === 'needs_review' ? '⚠️ تحت المراجعة' : '⏳ معلق لم يبدأ'}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white mb-2">{dir.title}</h3>
                      <p className="text-slate-300 text-sm leading-relaxed mb-4 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                        {dir.description}
                      </p>

                      {dir.completionNotes && (
                        <div className="mb-4 bg-teal-950/60 border border-teal-800/60 rounded-xl p-3 text-xs text-teal-200">
                          <div className="font-bold text-teal-300 mb-1 flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" />
                            تقرير وملاحظات الإنجاز المرفوعة لمجلس الإدارة:
                          </div>
                          {dir.completionNotes}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          تاريخ التسليم: <span className="font-mono text-emerald-300">{dir.dueDate}</span>
                        </span>
                        <span>الجهة الصادرة: <span className="text-white font-semibold">{dir.createdBy}</span></span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenReportModal(dir)}
                      className="mt-4 w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      تحديث حالة التكليف ورفع تقرير لمجلس الإدارة
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 10. TASKS TAB */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <CheckSquare className="w-6 h-6 text-emerald-400" />
                    المهام والتكليفات التشغيلية المعتمدة لـ ({currentDept.nameAr})
                  </h2>
                  <p className="text-slate-400 text-xs mt-1">
                    قائمة المهام والواجبات اليومية لكوادر الإدارة.
                  </p>
                </div>
              </div>

              {hasPermission('manage_tasks') && (
                <form onSubmit={handleAddTask} className="flex gap-2 mb-6">
                  <input
                    type="text"
                    value={newTaskInput}
                    onChange={(e) => setNewTaskInput(e.target.value)}
                    placeholder="أدخل مهمة أو تكليف إداري جديد للإدارة..."
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-400"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة مهمة
                  </button>
                </form>
              )}

              <div className="space-y-3">
                {deptTasks.map((task, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between bg-slate-950/80 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-300 font-mono text-xs font-bold mt-0.5">
                        {idx + 1}
                      </div>
                      <p className="text-slate-200 text-sm font-medium leading-relaxed">
                        {task}
                      </p>
                    </div>

                    {hasPermission('manage_tasks') && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTask(idx)}
                        className="text-rose-400 hover:text-rose-300 text-xs px-2.5 py-1 rounded-lg bg-rose-950/40 border border-rose-900/60 transition-all cursor-pointer"
                      >
                        حذف
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 11. LETTERS TAB */}
        {activeTab === 'letters' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <Mail className="w-6 h-6 text-emerald-400" />
                    الخطابات والمراسلات الرسمية الخاصة بإدارة ({currentDept.nameAr})
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    أرشيف الخطابات الواردة والصادرة، والردود الإدارية الموثقة.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsLetterModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Mail className="w-4 h-4" />
                  <span>إرسال خطاب جديد</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-950 text-slate-400 text-xs">
                    <tr>
                      <th className="p-3">رقم الخطاب</th>
                      <th className="p-3">موضوع الخطاب</th>
                      <th className="p-3">المرسل / الجهة</th>
                      <th className="p-3">المستلم / الإدارة</th>
                      <th className="p-3">التاريخ</th>
                      <th className="p-3">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {myLetters.map((letter) => (
                      <tr key={letter.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-mono text-xs text-emerald-400">{letter.referenceNumber || letter.id}</td>
                        <td className="p-3 font-bold text-white">{letter.subject || letter.title}</td>
                        <td className="p-3 text-xs">{letter.senderName || 'المرسل'}</td>
                        <td className="p-3 text-xs text-slate-400">{letter.departmentName || currentDept.nameAr}</td>
                        <td className="p-3 font-mono text-xs text-slate-400">{letter.createdAt?.split('T')[0] || '2026-03-23'}</td>
                        <td className="p-3 text-xs">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px]">
                            {letter.status || 'مسجل'}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {myLetters.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500 text-sm">
                          لا توجد مراسلات أو خطابات مؤرشفة لهذه الإدارة حالياً.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 12. STAFF & RECRUITMENT TAB (COMMON) */}
        {activeTab === 'staff' && (
          <DepartmentStaffManager
            currentDepartment={currentDept}
            employees={employees}
            employeeRequests={employeeRequests}
            onSubmitRequest={onSubmitEmployeeRequest || (async () => false)}
            onUpdateRequest={onUpdateEmployeeRequest || (async () => false)}
          />
        )}

        {/* 13. CREDENTIALS TAB */}
        {activeTab === 'credentials' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Key className="w-6 h-6 text-emerald-400" />
              بيانات الدخول والاعتماد الإداري
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                  <ShieldCheck className="w-8 h-8 text-emerald-400" />
                  <div>
                    <h3 className="font-bold text-white">بيانات الدخول لحساب ({currentUser?.name || currentDept.directorName})</h3>
                    <p className="text-xs text-slate-400">تتيح لك الدخول المباشر إلى لوحة إدارة ({currentDept.nameAr})</p>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400">رقم الهوية الإدارية:</span>
                    <span className="font-mono text-emerald-400 font-bold">{currentUser?.nationalId || currentDept.nationalId || '1010000008'}</span>
                  </div>

                  <div className="flex justify-between items-center bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400">كلمة المرور:</span>
                    <span className="font-mono text-emerald-400 font-bold">123</span>
                  </div>

                  <div className="flex justify-between items-center bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400">البريد الإلكتروني:</span>
                    <span className="font-mono text-slate-300">{currentUser?.email || currentDept.email || 'dept@riadataleata.org.sa'}</span>
                  </div>

                  <div className="flex justify-between items-center bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400">رقم الجوال:</span>
                    <span className="font-mono text-slate-300">{currentUser?.phone || currentDept.phone || '0550000000'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-400" />
                    تعليمات صلاحيات الإدارات والكوادر
                  </h3>
                  <p className="text-slate-300 text-xs leading-relaxed space-y-2">
                    1. يملك مدير الإدارة كامل الصلاحيات لإدارته ووظائفها التشغيلية والتقارير.<br/>
                    2. يملك موظفو الإدارة صلاحيات تشغيلية محددة يتم ضبطها من مصفوفة الصلاحيات.<br/>
                    3. تسجل جميع عمليات الصرف والاستلام والتعديل تلقائياً في الأرشيف الرقابي.<br/>
                    4. الحساب الإداري الرئيسي يملك الصلاحية والإشراف الكامل على كافة الإدارات.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-emerald-400/80 font-mono text-center">
                  جمعية ريادة العطاء لخدمة الإنسان بالعسيلة - مكة المكرمة
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fallback for unmapped tabs */}
        {![
          'inventory', 'volunteer_ops', 'requests', 'beneficiaries', 'hr_staff',
          'finance_ledger', 'projects_list', 'media_news', 'directives', 'tasks',
          'staff', 'letters', 'credentials'
        ].includes(activeTab) && (
          <AccessDeniedCard
            pageTitle={activeTab}
            departmentName={currentDept.nameAr}
            allowedPages={allowedDepartmentTabs}
            onNavigateToAllowed={(pageId) => setActiveTab(pageId)}
          />
        )}
          </>
        )}
        </DashboardErrorBoundary>

      </div>

      {/* REPORT TO BOARD MODAL */}
      {selectedDirective && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 dir-rtl">
          <div className="bg-slate-900 border border-emerald-700/80 rounded-3xl max-w-lg w-full p-6 space-y-4 text-right shadow-2xl">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-emerald-400" />
              رفع تقرير إنجاز التكليف لمجلس الإدارة
            </h3>

            <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800">
              التكليف: <span className="text-white font-bold">{selectedDirective.title}</span>
            </p>

            <form onSubmit={handleSaveReport} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  حالة التنفيذ الحالية:
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as any)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-400"
                >
                  <option value="in_progress">⚙️ قيد التنفيذ والمتابعة</option>
                  <option value="completed">✓ تم الإنجاز بالكامل</option>
                  <option value="needs_review">⚠️ يحتاج مراجعة أو دعم من المجلس</option>
                  <option value="pending">⏳ معلق</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  تقرير وملاحظات التنفيذ المرفوعة لمجلس الإدارة:
                </label>
                <textarea
                  rows={4}
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  placeholder="اكتب هنا تفاصيل ونتائج تنفيذ المهمة، التحديات، والإنجاز المحقق..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-400"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDirective(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm cursor-pointer"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  إرسال التقرير للمجلس
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE INITIATIVE MODAL (VOLUNTEER DEPT) */}
      {showAddInitiativeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 dir-rtl">
          <div className="bg-slate-900 border border-emerald-700 rounded-3xl max-w-lg w-full p-6 space-y-4 text-right shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                طرح فرصة تطوعية جديدة
              </h3>
              <button 
                onClick={() => setShowAddInitiativeModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInitiativeSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">عنوان الفرصة التطوعية:</label>
                <input
                  type="text"
                  required
                  value={newInitData.title}
                  onChange={e => setNewInitData({ ...newInitData, title: e.target.value })}
                  placeholder="مثال: إكرام ضيوف الرحمن بمكة المكرمة"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">المجال / التصنيف:</label>
                  <select
                    value={newInitData.category}
                    onChange={e => setNewInitData({ ...newInitData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value="إنساني">إنساني</option>
                    <option value="ديني وخدمة معتمرين">ديني وخدمة معتمرين</option>
                    <option value="صحي">صحي</option>
                    <option value="تنظيمي وميداني">تنظيمي وميداني</option>
                    <option value="تعليمي وتدريبي">تعليمي وتدريبي</option>
                    <option value="بيئي">بيئي</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">الموقع الميداني:</label>
                  <input
                    type="text"
                    value={newInitData.location}
                    onChange={e => setNewInitData({ ...newInitData, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">الساعات المعتمدة:</label>
                  <input
                    type="number"
                    min="1"
                    max="48"
                    value={newInitData.hours}
                    onChange={e => setNewInitData({ ...newInitData, hours: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">المقاعد المطلوبة:</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={newInitData.requiredVolunteers}
                    onChange={e => setNewInitData({ ...newInitData, requiredVolunteers: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">وصف الفرصة والشروط:</label>
                <textarea
                  rows={3}
                  value={newInitData.description}
                  onChange={e => setNewInitData({ ...newInitData, description: e.target.value })}
                  placeholder="وصف المهام التطوعية، الشروط، وأوقات الحضور..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddInitiativeModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  طرح الفرصة فوراً
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE EXPENSE VOUCHER MODAL (FINANCE DEPT) */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 dir-rtl">
          <div className="bg-slate-900 border border-emerald-700 rounded-3xl max-w-lg w-full p-6 space-y-4 text-right shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                إصدار سند صرف مالي جديد
              </h3>
              <button 
                onClick={() => setShowAddExpenseModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpenseSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">البيان / الوصف:</label>
                <input
                  type="text"
                  required
                  value={newExpenseData.title}
                  onChange={e => setNewExpenseData({ ...newExpenseData, title: e.target.value })}
                  placeholder="مثال: تكاليف مستلزمات توزيع السلال الغذائية بالعسيلة"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">المبلغ (ر.س):</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newExpenseData.amount}
                    onChange={e => setNewExpenseData({ ...newExpenseData, amount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">البند المالي:</label>
                  <select
                    value={newExpenseData.category}
                    onChange={e => setNewExpenseData({ ...newExpenseData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value="تشغيلي">تشغيلي</option>
                    <option value="برامج ومشاريع">برامج ومشاريع</option>
                    <option value="مساعدات عينية">مساعدات عينية</option>
                    <option value="رواتب وكوادر">رواتب وكوادر</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">المستفيد / الجهة الصادر لها:</label>
                <input
                  type="text"
                  value={newExpenseData.recipient}
                  onChange={e => setNewExpenseData({ ...newExpenseData, recipient: e.target.value })}
                  placeholder="اسم الشخص أو المورد أو المؤسسة"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  اعتماد وحفظ السند
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE PROJECT MODAL (PROJECTS DEPT) */}
      {showAddProjectModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 dir-rtl">
          <div className="bg-slate-900 border border-emerald-700 rounded-3xl max-w-lg w-full p-6 space-y-4 text-right shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-emerald-400" />
                إدراج مشروع تنموي جديد
              </h3>
              <button 
                onClick={() => setShowAddProjectModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProjectSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">اسم المشروع:</label>
                <input
                  type="text"
                  required
                  value={newProjectData.title}
                  onChange={e => setNewProjectData({ ...newProjectData, title: e.target.value })}
                  placeholder="مثال: مشروع كسوة الشتاء ورعاية الأيتام بالعسيلة"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">الميزانية المقدرة (ر.س):</label>
                  <input
                    type="number"
                    value={newProjectData.budget}
                    onChange={e => setNewProjectData({ ...newProjectData, budget: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">عدد المستفيدين المستهدف:</label>
                  <input
                    type="number"
                    value={newProjectData.targetBeneficiaries}
                    onChange={e => setNewProjectData({ ...newProjectData, targetBeneficiaries: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">الوصف والأهداف:</label>
                <textarea
                  rows={3}
                  value={newProjectData.description}
                  onChange={e => setNewProjectData({ ...newProjectData, description: e.target.value })}
                  placeholder="أهداف ومخرجات المشروع..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddProjectModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  إدراج المشروع
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OFFICIAL SEND LETTER MODAL FOR DEPARTMENT / EMPLOYEE */}
      <SendLetterModal
        isOpen={isLetterModalOpen}
        onClose={() => setIsLetterModalOpen(false)}
        defaultSenderType={isDirector ? "مدير إدارة" : "موظف"}
        currentUser={{
          id: currentUser?.id || currentDept.id,
          name: currentUser?.name || currentDept.directorName,
          role: effectiveRole,
          phone: currentUser?.phone || currentDept.phone,
          email: currentUser?.email || currentDept.email,
          departmentId: currentDept.id,
          departmentName: currentDept.nameAr,
          jobTitle: currentUser?.jobTitle || `مدير ${currentDept.nameAr}`
        }}
        onSubmitLetter={async (letterData) => {
          if (onSubmitOfficialLetter) {
            return await onSubmitOfficialLetter(letterData);
          }
          return { success: false, message: "تعذر إرسال الخطاب" };
        }}
      />

    </div>
  );
};
