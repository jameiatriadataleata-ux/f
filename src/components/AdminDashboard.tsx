import React, { useState, useMemo, useEffect } from "react";
import { 
  Building2, Users, Calendar, BarChart3, Database, FileSpreadsheet, FileDown, 
  Trash2, Plus, Edit3, Shield, Copy, Archive, Check, AlertTriangle, 
  Moon, Sun, Search, Printer, RefreshCw, Smartphone, ShieldAlert, Lock, Trophy, Send, Eye, Settings, Activity, FileText, Globe, X,
  Menu, ChevronDown, Briefcase, Network, Image as ImageIcon
} from "lucide-react";
import { 
  Department, VolunteerTeam, Volunteer, Initiative, OperationLog, SystemStats,
  HomeSettings, NewsItem, PartnerItem, GalleryItem, Beneficiary, BenefitRequest,
  VolunteerApplication, OpportunityRequest, DepartmentDirective, Notification, BeneficiaryRating,
  OrgMember, HeroSlide
} from "../types";
import { SmartCard } from "./SmartCard";
import { ImagePickerControl } from "./ImagePickerControl";
import { ImageUploadField } from "./ImageUploadField";
import { HomepageAdminPanel } from "./HomepageAdminPanel";
import { OrgChartAdminPanel } from "./OrgChartAdminPanel";
import { HeroSlidesAdminPanel } from "./HeroSlidesAdminPanel";
import { JoinApplicationsPanel } from "./JoinApplicationsPanel";
import { InternalChatPanel } from "./InternalChatPanel";
import { SupportAdminPanel } from "./SupportAdminPanel";
import { SystemSettingsPanel } from "./SystemSettingsPanel";
import { NotificationSendPanel } from "./NotificationSendPanel";
import { FinancialProjectsManager } from "./FinancialProjectsManager";
import { FinancialManagement } from "./financial/FinancialManagement";
import { InventoryManager } from "./InventoryManager";
import { CustodyManager } from "./CustodyManager";
import { TeamJoinApplicationsPanel } from "./TeamJoinApplicationsPanel";
import { VolunteerCardTemplatesPanel } from "./VolunteerCardTemplatesPanel";
import { ModernAppSidebar, NavGroup, NavItem } from "./ModernAppSidebar";
import { StoreProject, StoreDonation, FinancialTransaction, TeamApplication, OfficialLetter } from "../types";
import { MessageSquare, Headphones, ShoppingBag, Boxes, Package, UsersRound, CreditCard, Pin, PinOff, HeartHandshake, Mail, Wallet, Star } from "lucide-react";
import { BeneficiariesManager } from "./BeneficiariesManager";
import { DistributionsManager } from "./DistributionsManager";
import { BeneficiaryRatingsManager } from "./BeneficiaryRatingsManager";
import { AdminLettersManager } from "./AdminLettersManager";
import { VolunteerMonthlyReportModal } from "./VolunteerMonthlyReportModal";
import { AdminStaffManager } from "./AdminStaffManager";
import { EmailSettingsPanel } from "./EmailSettingsPanel";
import { VolunteerManagementDashboard } from "./VolunteerManagementDashboard";
import { HRDashboard } from "./HRDashboard";
import { VolunteerKnightsModal } from "./VolunteerKnights";
import { AidDistribution, DistributionHandoverRecord, Employee, EmployeeRequest, TeamStaffAssignment } from "../types";
import { DepartmentPermissionsManager } from "./DepartmentPermissionsManager";
import { expandPermissionsWithLegacyKeys } from "../data/departmentPermissionsRegistry";
import { DashboardErrorBoundary } from "./DashboardErrorBoundary";
import { AccessDeniedCard } from "./AccessDeniedCard";

interface AdminDashboardProps {
  data: {
    departments: Department[];
    teams: VolunteerTeam[];
    volunteers: Volunteer[];
    initiatives: Initiative[];
    logs: OperationLog[];
    stats: SystemStats;
    homeSettings?: HomeSettings;
    news?: NewsItem[];
    partners?: PartnerItem[];
    gallery?: GalleryItem[];
    beneficiaries?: Beneficiary[];
    benefitRequests?: BenefitRequest[];
    volunteerApplications?: VolunteerApplication[];
    teamApplications?: TeamApplication[];
    letters?: OfficialLetter[];
    attendance?: any[];
    departmentDirectives?: DepartmentDirective[];
    notifications?: Notification[];
    storeProjects?: StoreProject[];
    storeDonations?: StoreDonation[];
    financialTransactions?: FinancialTransaction[];
    distributions?: AidDistribution[];
    distributionHandovers?: DistributionHandoverRecord[];
    beneficiaryRatings?: BeneficiaryRating[];
    orgMembers?: OrgMember[];
    heroSlides?: HeroSlide[];
  };
  onAddDepartment: (dep: Partial<Department>) => void;
  onDeleteDepartment: (id: string) => void;
  onAddTeam: (team: Partial<VolunteerTeam>) => void;
  onDeleteTeam: (id: string) => void;
  onAddVolunteer: (vol: Partial<Volunteer>) => void;
  onDeleteVolunteer: (id: string) => void;
  onBatchCreateVolunteers: (list: Array<{ name: string; email?: string; phone?: string; teamId: string; departmentId: string }>) => void;
  onAddInitiative: (init: Partial<Initiative>) => void;
  onCopyInitiative: (originalId: string, newDate: string, newName: string) => void;
  onResetDb: () => void;
  onRestoreDb: (dbJson: any) => void;
  onReissueCard: (id: string) => void;
  onToggleVolunteerStatus: (id: string, status: 'active' | 'inactive' | 'suspended') => void;
  onUpdateVolunteerPermissions: (id: string, role: string, permissions: string[]) => void;
  onSendMultiChannelBroadcast: (data: {
    type: 'all' | 'department' | 'team' | 'initiative' | 'individual';
    targetId: string;
    titleAr: string;
    titleEn: string;
    bodyAr: string;
    bodyEn: string;
    channels: { system: boolean; whatsapp: boolean; sms: boolean; email: boolean };
  }) => void;
  isDark: boolean;
  onToggleDark: () => void;
  lang: 'ar' | 'en';
  onUpdateHomeSettings?: (updated: HomeSettings) => Promise<boolean>;
  onAddNewsItem?: (item: Partial<NewsItem>) => Promise<boolean>;
  onDeleteNewsItem?: (id: string) => Promise<boolean>;
  onAddPartnerItem?: (item: Partial<PartnerItem>) => Promise<boolean>;
  onDeletePartnerItem?: (id: string) => Promise<boolean>;
  onBatchUpdatePartners?: (partnersList: PartnerItem[]) => Promise<boolean>;
  onAddGalleryItem?: (item: Partial<GalleryItem>) => Promise<boolean>;
  onDeleteGalleryItem?: (id: string) => Promise<boolean>;
  onAddOrgMember?: (member: Partial<OrgMember>) => Promise<boolean>;
  onDeleteOrgMember?: (id: string) => Promise<boolean>;
  onToggleOrgMemberActive?: (id: string, isActive?: boolean) => Promise<boolean>;
  onBatchUpdateOrgMembers?: (members: OrgMember[]) => Promise<boolean>;
  onImportDirectors?: () => Promise<boolean>;
  onAddHeroSlide?: (slide: Partial<HeroSlide>) => Promise<boolean>;
  onDeleteHeroSlide?: (id: string) => Promise<boolean>;
  onToggleSlideActive?: (id: string, isActive?: boolean) => Promise<boolean>;
  onBatchUpdateHeroSlides?: (slides: HeroSlide[]) => Promise<boolean>;
  onAddDepartmentDirective?: (directive: Partial<DepartmentDirective>) => void;
  onDeleteDepartmentDirective?: (id: string) => void;
  onUpdateBeneficiaryStatus?: (id: string, status: "approved" | "pending" | "rejected") => Promise<boolean>;
  onUpdateBenefitRequestStatus?: (id: string, status: "pending" | "approved" | "in_progress" | "completed" | "rejected", notes: string) => Promise<boolean>;
  onAcceptVolunteerApplication?: (applicationId: string, teamId: string) => Promise<boolean>;
  onRejectVolunteerApplication?: (applicationId: string, rejectionReason: string) => Promise<boolean>;
  onAcceptTeamApplication?: (applicationId: string, departmentId: string, reviewerNotes?: string) => Promise<boolean>;
  onRejectTeamApplication?: (applicationId: string, rejectionReason: string) => Promise<boolean>;
  onRequestTeamApplicationCorrection?: (applicationId: string, correctionNotes: string) => Promise<boolean>;
  onDeleteTeamApplication?: (applicationId: string) => Promise<boolean>;
  opportunityRequests?: OpportunityRequest[];
  onUpdateOpportunityRequest?: (payload: { id: string; status: string; nationalPlatformUrl?: string; opportunityCode?: string; rejectionReason?: string; correctionNotes?: string; reviewerName?: string; startDate?: string; endDate?: string }) => void;
  onSendCustomNotification?: (payload: any) => Promise<boolean>;
  onDeleteNotification?: (id: string, clearAll?: boolean) => Promise<boolean>;
  onResendNotification?: (id: string) => Promise<boolean>;
  onAddExpense?: (data: { projectId: string; amount: number; vendorName: string; description: string; paymentMethod?: string }) => Promise<boolean>;
  onAddProject?: (project: Partial<StoreProject>) => Promise<boolean>;
  onAddBeneficiary?: (ben: Partial<Beneficiary>) => Promise<boolean>;
  onUpdateLetterStatus?: (letterId: string, status: OfficialLetter['status'], adminNotes?: string) => Promise<void>;
  onMarkLetterAsRead?: (letterId: string) => Promise<void>;
  onDeleteLetter?: (letterId: string) => Promise<void>;
  onCreateDistribution?: (data: Partial<AidDistribution>) => Promise<boolean>;
  onUpdateDistribution?: (data: Partial<AidDistribution>) => Promise<boolean>;
  onDeleteDistribution?: (id: string) => Promise<boolean>;
  onHandoverSubmit?: (data: any) => Promise<any>;
  onCancelHandover?: (handoverId: string) => Promise<boolean>;
  onImportBeneficiaries?: (beneficiaries: Partial<Beneficiary>[], fileType: 'excel' | 'pdf') => Promise<boolean>;
  onEvaluateTeamPoints?: (payload: {
    initiativeId: string;
    evaluationType: 'completed_best' | 'average_with_notes';
    notes?: string;
    evaluatorName?: string;
    evaluatorRole?: string;
  }) => Promise<boolean>;
  employees?: Employee[];
  employeeRequests?: EmployeeRequest[];
  teamStaffAssignments?: TeamStaffAssignment[];
  onApproveEmployeeRequest?: (requestId: string, reviewerName: string, notes?: string) => Promise<boolean>;
  onRejectEmployeeRequest?: (requestId: string, reviewerName: string, rejectionReason: string) => Promise<boolean>;
  onRequestEmployeeModification?: (requestId: string, reviewerName: string, modificationNotes: string) => Promise<boolean>;
  initialSubTab?: string;
  onSubTabChange?: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  data,
  initialSubTab,
  onSubTabChange,
  onAddDepartment,
  onDeleteDepartment,
  onAddTeam,
  onDeleteTeam,
  onAddVolunteer,
  onDeleteVolunteer,
  onBatchCreateVolunteers,
  onAddInitiative,
  onCopyInitiative,
  onResetDb,
  onRestoreDb,
  onReissueCard,
  onToggleVolunteerStatus,
  onUpdateVolunteerPermissions,
  onSendMultiChannelBroadcast,
  isDark,
  onToggleDark,
  lang,
  onUpdateHomeSettings,
  onAddNewsItem,
  onDeleteNewsItem,
  onAddPartnerItem,
  onDeletePartnerItem,
  onBatchUpdatePartners,
  onAddGalleryItem,
  onDeleteGalleryItem,
  onAddOrgMember,
  onDeleteOrgMember,
  onToggleOrgMemberActive,
  onBatchUpdateOrgMembers,
  onImportDirectors,
  onAddHeroSlide,
  onDeleteHeroSlide,
  onToggleSlideActive,
  onBatchUpdateHeroSlides,
  onAddDepartmentDirective,
  onDeleteDepartmentDirective,
  onUpdateBeneficiaryStatus,
  onUpdateBenefitRequestStatus,
  onAcceptVolunteerApplication,
  onRejectVolunteerApplication,
  onAcceptTeamApplication,
  onRejectTeamApplication,
  onRequestTeamApplicationCorrection,
  onDeleteTeamApplication,
  opportunityRequests = [],
  onUpdateOpportunityRequest,
  onSendCustomNotification,
  onDeleteNotification,
  onResendNotification,
  onAddExpense,
  onAddProject,
  onAddBeneficiary,
  onUpdateLetterStatus,
  onMarkLetterAsRead,
  onDeleteLetter,
  onCreateDistribution,
  onUpdateDistribution,
  onDeleteDistribution,
  onHandoverSubmit,
  onCancelHandover,
  onImportBeneficiaries,
  onEvaluateTeamPoints,
  employees = [],
  employeeRequests = [],
  teamStaffAssignments = [],
  onApproveEmployeeRequest,
  onRejectEmployeeRequest,
  onRequestEmployeeModification
}: AdminDashboardProps) => {
  const [activeSubTab, setActiveSubTab] = useState<'stats' | 'deps' | 'org_chart' | 'hero_slides' | 'employee_requests' | 'teams' | 'vols' | 'cards' | 'init' | 'logs' | 'backup' | 'permissions' | 'notifications' | 'leaderboard' | 'globalsearch' | 'homepage' | 'attendance_archive' | 'joinrequests' | 'team_join_requests' | 'chat' | 'support' | 'system_settings' | 'email_settings' | 'opp_requests' | 'enterprise_finance' | 'store_finance' | 'inventory' | 'custody' | 'beneficiaries' | 'distributions' | 'beneficiary_ratings' | 'letters'>(() => {
    try {
      const saved = localStorage.getItem('reyadat_admin_subtab');
      if (saved) return saved as any;
    } catch {}
    return (initialSubTab as any) || 'enterprise_finance';
  });

  useEffect(() => {
    try {
      if (activeSubTab) {
        localStorage.setItem('reyadat_admin_subtab', activeSubTab);
        if (onSubTabChange) onSubTabChange(activeSubTab);
      }
    } catch {}
  }, [activeSubTab, onSubTabChange]);

  useEffect(() => {
    if (initialSubTab && initialSubTab !== activeSubTab) {
      setActiveSubTab(initialSubTab as any);
    }
  }, [initialSubTab]);
  
  // Modern Off-Canvas & Dockable Sidebar States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showKnightsModal, setShowKnightsModal] = useState(false);

  // Define the 8 Core Administrative Categories (Consolidated, Distinct, Well-Categorized)
  const primaryCategories = useMemo(() => [
    {
      id: 'volunteers' as const,
      label: "إدارة التطوع",
      icon: HeartHandshake,
      description: "إحصائيات التطوع الموحدة، الفرص المعتمدة، الفرق، المتطوعين وسجلات الساعات",
      badge: opportunityRequests.filter(r => r.status === 'pending').length || undefined,
      items: [
        { id: 'volunteer_mgmt_dashboard', label: 'لوحة إدارة التطوع والإحصائيات', icon: BarChart3, badge: 'نظام متكامل' },
        { id: 'opp_requests', label: 'اعتماد وإدارة الفرص التطوعية', icon: FileText, badge: opportunityRequests.filter(r => r.status === 'pending').length || undefined },
        { id: 'init', label: 'المبادرات التطوعية', icon: Calendar, badge: data.initiatives?.length || 0 },
        { id: 'vols', label: 'سجلات وساعات المتطوعين', icon: Users, badge: data.volunteers?.length || 0 },
        { id: 'teams', label: 'الفرق التطوعية وقادتها', icon: UsersRound, badge: data.teams?.length || 0 },
        { id: 'joinrequests', label: 'طلبات انضمام الأفراد', icon: FileText, badge: (data.volunteerApplications || []).filter(a => a.status === 'pending').length || undefined },
        { id: 'team_join_requests', label: 'طلبات انضمام الفرق', icon: UsersRound, badge: (data.teamApplications || []).filter(a => a.status === 'pending').length || undefined },
        { id: 'cards', label: 'قوالب بطاقات المتطوعين', icon: CreditCard, badge: 'نظام متكامل' }
      ]
    },
    {
      id: 'beneficiaries' as const,
      label: "إدارة المستفيدين",
      icon: HeartHandshake,
      description: "إدارة المستفيدين، طلبات الإعانة، توزيع السلال والكسوة، وتقييمات الرضا",
      badge: (data.beneficiaries || []).length || undefined,
      items: [
        { id: 'beneficiaries', label: 'المستفيدون وطلبات الإعانة', icon: Users, badge: (data.beneficiaries || []).length || undefined },
        { id: 'distributions', label: 'التوزيعات وسندات الاستلام', icon: Package, badge: (data.distributions || []).filter(d => d.status === 'active').length || undefined },
        { id: 'beneficiary_ratings', label: 'تقييمات ورضا المستفيدين', icon: Star, badge: (data.beneficiaryRatings || []).length || undefined }
      ]
    },
    {
      id: 'hr' as const,
      label: "الموارد البشرية",
      icon: Briefcase,
      description: "الموظفون، العقود والبدلات، الحضور والانصراف، الإجازات، مسيرات الرواتب والقرارات الإدارية",
      badge: (employeeRequests || []).filter(r => r.status === 'pending').length || (employees?.length || 0),
      items: [
        { id: 'hr_dashboard', label: 'نظام إدارة الموارد البشرية (HR Master)', icon: Briefcase, badge: 'شامل' },
        { id: 'employee_requests', label: 'طلبات واستقطاب الكوادر', icon: Users, badge: (employeeRequests || []).filter(r => r.status === 'pending').length || undefined }
      ]
    },
    {
      id: 'management' as const,
      label: "الإدارة العامة",
      icon: Building2,
      description: "الهيكلة والموقع والصلاحيات والتواصل",
      badge: data.departments?.length || 0,
      items: [
        { id: 'deps', label: 'هيكلة الإدارات', icon: Building2, badge: data.departments?.length || 0 },
        { id: 'org_chart', label: 'إدارة الهيكل الإداري', icon: Network, badge: (data.orgMembers || []).length || undefined },
        { id: 'hero_slides', label: 'إدارة صور الصفحة الرئيسية', icon: ImageIcon, badge: (data.heroSlides || []).length || undefined },
        { id: 'letters', label: 'الخطابات والمراسلات الرسمية', icon: Mail, badge: (data.letters || []).filter(l => !l.isRead).length || undefined },
        { id: 'homepage', label: 'إدارة المحتوى والموقع', icon: Globe },
        { id: 'permissions', label: 'الصلاحيات والأدوار', icon: Lock },
        { id: 'chat', label: 'الدردشة الداخلية', icon: MessageSquare },
        { id: 'notifications', label: 'الإشعارات والتعاميم', icon: Send }
      ]
    },
    {
      id: 'support' as const,
      label: "الدعم والتذاكر",
      icon: Headphones,
      description: "مركز خدمة المستفيدين والتذاكر الفنية",
      badge: 'مباشر',
      items: [
        { id: 'support', label: 'إدارة الدعم الفني والتذاكر', icon: Headphones, badge: 'مباشر' }
      ]
    },
    {
      id: 'finance' as const,
      label: "المالية والمشتريات",
      icon: Wallet,
      description: "نظام الإدارة المالية الشامل، التبرعات، الميزانيات، المشتريات، والرواتب",
      badge: 'جديد متكامل',
      items: [
        { id: 'enterprise_finance', label: 'الإدارة المالية الشاملة', icon: Wallet, badge: 'نظام متكامل' },
        { id: 'store_finance', label: 'المتجر والمالية للمشاريع', icon: ShoppingBag, badge: 'ربط مباشر' },
        { id: 'inventory', label: 'إدارة المخزون والجرد', icon: Boxes, badge: 'مستودع' },
        { id: 'custody', label: 'العهدة الإلكترونية والمستودع', icon: Shield, badge: 'جديد' }
      ]
    },
    {
      id: 'reports' as const,
      label: "التقارير",
      icon: BarChart3,
      description: "الإحصائيات والبحث ولوحة الشرف وسجل العمليات",
      items: [
        { id: 'stats', label: 'الإحصائيات والتحليلات', icon: BarChart3 },
        { id: 'leaderboard', label: 'لوحة الشرف الصدارة', icon: Trophy },
        { id: 'globalsearch', label: 'البحث الشامل المتقدم', icon: Search },
        { id: 'logs', label: 'سجل العمليات والتدقيق', icon: Shield }
      ]
    },
    {
      id: 'settings' as const,
      label: "الإعدادات",
      icon: Settings,
      description: "إعدادات البريد والنظام العام وقاعدة البيانات",
      badge: 'المدير',
      items: [
        { id: 'email_settings', label: 'إعدادات البريد الحقيقي (Sender & SMTP)', icon: Mail, badge: 'جديد' },
        { id: 'system_settings', label: 'إعدادات النظام الشاملة', icon: Settings, badge: 'المدير' },
        { id: 'backup', label: 'قاعدة البيانات والنسخ', icon: Database }
      ]
    }
  ], [data, opportunityRequests, employeeRequests]);

  // Derive navGroups for ModernAppSidebar to maintain 100% synchronization
  const navGroups: NavGroup[] = useMemo(() => {
    return primaryCategories.map(cat => ({
      category: cat.label,
      items: cat.items
    }));
  }, [primaryCategories]);

  const totalPendingCount = useMemo(() => {
    return (data.teamApplications || []).filter(a => a.status === 'pending').length +
      (data.volunteerApplications || []).filter(a => a.status === 'pending').length +
      opportunityRequests.filter(r => r.status === 'pending').length;
  }, [data, opportunityRequests]);

  const getActiveTabTitle = (tabId: string) => {
    for (const cat of primaryCategories) {
      const found = cat.items.find(i => i.id === tabId);
      if (found) return found.label;
    }
    return "لوحة التحكم";
  };

  const getActiveCategory = (tabId: string) => {
    return primaryCategories.find(cat => cat.items.some(i => i.id === tabId)) || primaryCategories[0];
  };

  const activeCategory = getActiveCategory(activeSubTab);
  const [activeCategoryId, setActiveCategoryId] = useState<string>(activeCategory.id);
  const [openDropdownCategoryId, setOpenDropdownCategoryId] = useState<string | null>(null);

  // Keep active category synchronized whenever activeSubTab changes externally
  useEffect(() => {
    const matched = primaryCategories.find(cat => cat.items.some(i => i.id === activeSubTab));
    if (matched && matched.id !== activeCategoryId) {
      setActiveCategoryId(matched.id);
    }
  }, [activeSubTab, primaryCategories, activeCategoryId]);

  // Support jumping to subtab from external props (e.g. Header Settings button)
  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab as any);
      const matched = primaryCategories.find(cat => cat.items.some(i => i.id === initialSubTab));
      if (matched) {
        setActiveCategoryId(matched.id);
      }
    }
  }, [initialSubTab, primaryCategories]);

  // Close floating dropdowns on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.category-dropdown-group')) {
        setOpenDropdownCategoryId(null);
      }
    };
    if (openDropdownCategoryId) {
      document.addEventListener('mousedown', handleOutsideClick);
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }
  }, [openDropdownCategoryId]);

  // Opportunity Request Review Modal state
  const [reviewingOpp, setReviewingOpp] = useState<OpportunityRequest | null>(null);
  const [oppPlatformUrl, setOppPlatformUrl] = useState("");
  const [oppCode, setOppCode] = useState("");
  const [oppRejectReason, setOppRejectReason] = useState("");
  const [oppCorrectionNotes, setOppCorrectionNotes] = useState("");
  const [oppStartDate, setOppStartDate] = useState("");
  const [oppEndDate, setOppEndDate] = useState("");
  const [oppModalError, setOppModalError] = useState<string | null>(null);
  const [oppActionType, setOppActionType] = useState<'accept' | 'reject' | 'return'>('accept');
  const [oppStatusFilter, setOppStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected' | 'returned'>('all');

  // Department Modal State
  const [showDepModal, setShowDepModal] = useState(false);
  const [editingDep, setEditingDep] = useState<Partial<Department> | null>(null);

  // Board Directives Modal State
  const [showDirectiveModal, setShowDirectiveModal] = useState(false);
  const [editingDirective, setEditingDirective] = useState<Partial<DepartmentDirective> | null>(null);

  // Team Modal State
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Partial<VolunteerTeam> | null>(null);

  // Initiative Modal State
  const [showInitModal, setShowInitModal] = useState(false);
  const [editingInit, setEditingInit] = useState<Partial<Initiative> | null>(null);

  // Copy Initiative State
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyId, setCopyId] = useState("");
  const [newCopyDate, setNewCopyDate] = useState("");
  const [newCopyName, setNewCopyName] = useState("");

  // Volunteer Modal State
  const [showVolModal, setShowVolModal] = useState(false);
  const [editingVol, setEditingVol] = useState<Partial<Volunteer> | null>(null);

  // Volunteer Monthly Report Modal State
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportVolunteer, setSelectedReportVolunteer] = useState<Volunteer | null>(null);

  // Excel Importer Simulator State
  const [excelText, setExcelText] = useState("");
  const [excelTeamId, setExcelTeamId] = useState("");
  const [showExcelModal, setShowExcelModal] = useState(false);

  // --- STAGE 2 STATED PROPERTIES ---
  // Permissions tab states
  const [permVolId, setPermVolId] = useState("");
  const [permRole, setPermRole] = useState("volunteer");
  const [permList, setPermList] = useState<string[]>([]);
  const [permSuccess, setPermSuccess] = useState(false);
  const [permFilterCategory, setPermFilterCategory] = useState<'all' | 'directors' | 'employees' | 'warehouse' | 'leaders' | 'volunteers'>('all');
  const [permSelectedDeptFilter, setPermSelectedDeptFilter] = useState<string>('all');
  const [permSearchQuery, setPermSearchQuery] = useState('');
  const [permDepartmentId, setPermDepartmentId] = useState('');
  const [permJobTitle, setPermJobTitle] = useState('');
  const [permAllowedPages, setPermAllowedPages] = useState<string[]>([]);
  const [permStatus, setPermStatus] = useState<'active' | 'inactive' | 'suspended'>('active');
  const [permSelectedAccount, setPermSelectedAccount] = useState<any>(null);
  const [permIsSaving, setPermIsSaving] = useState(false);
  const [permSaveMessage, setPermSaveMessage] = useState('');

  // Notifications tab states
  const [notifTitleAr, setNotifTitleAr] = useState("");
  const [notifTitleEn, setNotifTitleEn] = useState("");
  const [notifBodyAr, setNotifBodyAr] = useState("");
  const [notifBodyEn, setNotifBodyEn] = useState("");
  const [notifType, setNotifType] = useState<'all' | 'department' | 'team' | 'initiative' | 'individual'>("all");
  const [notifTargetId, setNotifTargetId] = useState("");
  const [notifChannels, setNotifChannels] = useState({ system: true, whatsapp: false, sms: false, email: false });
  const [notifSuccess, setNotifSuccess] = useState(false);
  const [simulatedDeliveries, setSimulatedDeliveries] = useState<any[]>([]);

  // Leaderboard tab states
  const [leaderboardDeptFilter, setLeaderboardDeptFilter] = useState("");
  const [leaderboardTeamFilter, setLeaderboardTeamFilter] = useState("");

  // Global search tab states
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");
  const [globalSearchDept, setGlobalSearchDept] = useState("");
  const [globalSearchTeam, setGlobalSearchTeam] = useState("");
  const [globalSearchMinPoints, setGlobalSearchMinPoints] = useState("");
  const [globalSearchMaxPoints, setGlobalSearchMaxPoints] = useState("");
  const [globalSearchStatus, setGlobalSearchStatus] = useState("");

  // Search Filters
  const [volSearch, setVolSearch] = useState("");
  const [volTeamFilter, setVolTeamFilter] = useState<string>("all");
  const [logSearch, setLogSearch] = useState("");

  const handleSaveDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDep) {
      onAddDepartment(editingDep);
      setShowDepModal(false);
      setEditingDep(null);
    }
  };

  const handleSaveDirective = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDirective && onAddDepartmentDirective) {
      onAddDepartmentDirective(editingDirective);
      setShowDirectiveModal(false);
      setEditingDirective(null);
    }
  };

  const handleSaveTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTeam) {
      onAddTeam(editingTeam);
      setShowTeamModal(false);
      setEditingTeam(null);
    }
  };

  const handleSaveInitiative = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingInit) {
      onAddInitiative(editingInit);
      setShowInitModal(false);
      setEditingInit(null);
    }
  };

  const handleSaveVolunteer = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingVol) {
      onAddVolunteer(editingVol);
      setShowVolModal(false);
      setEditingVol(null);
    }
  };

  const handleExcelImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!excelText.trim() || !excelTeamId) return;

    // Parse CSV-like input: Name, Phone, Email
    const lines = excelText.split("\n");
    const parsedList: any[] = [];
    const selectedTeam = data.teams.find(t => t.id === excelTeamId);
    
    lines.forEach(line => {
      const parts = line.split(",");
      if (parts[0] && parts[0].trim().length > 0) {
        parsedList.push({
          name: parts[0].trim(),
          phone: parts[1] ? parts[1].trim() : "0500000000",
          email: parts[2] ? parts[2].trim() : "",
          teamId: excelTeamId,
          departmentId: selectedTeam ? selectedTeam.departmentId : ""
        });
      }
    });

    if (parsedList.length > 0) {
      onBatchCreateVolunteers(parsedList);
      setExcelText("");
      setShowExcelModal(false);
    }
  };

  const handleTriggerBackupDownload = () => {
    window.open("/api/db/backup", "_blank");
  };

  const handleTriggerRestoreUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          onRestoreDb(json);
          alert(lang === 'ar' ? "تم استيراد قاعدة البيانات بنجاح ✓" : "Database restored successfully ✓");
        } catch (err) {
          alert(lang === 'ar' ? "فشل قراءة الملف! يرجى تحميل ملف JSON صالح." : "Failed to parse file. Please upload a valid JSON backup.");
        }
      };
      reader.readAsText(file);
    }
  };

  // Filter lists
  const filteredVolunteers = data.volunteers.filter(v => {
    const matchSearch = 
      v.name.toLowerCase().includes(volSearch.toLowerCase()) || 
      v.membershipNumber.toLowerCase().includes(volSearch.toLowerCase()) ||
      (v.phone || '').includes(volSearch);
    const matchTeam = volTeamFilter === 'all' || v.teamId === volTeamFilter;
    return matchSearch && matchTeam;
  });

  const filteredLogs = data.logs.filter(l => 
    l.action.toLowerCase().includes(logSearch.toLowerCase()) || 
    l.user.toLowerCase().includes(logSearch.toLowerCase())
  );

  const triggerBatchPrint = () => {
    const win = window.open("", "_blank");
    if (win) {
      const cardsHtml = data.volunteers.map(v => {
        const team = data.teams.find(t => t.id === v.teamId);
        const dept = data.departments.find(d => d.id === v.departmentId);
        return `
          <div class="print-card" style="page-break-inside: avoid; margin-bottom: 30px; width: 350px; border: 2px solid #16a34a; border-radius: 16px; padding: 15px; background: #fff; direction: rtl; font-family: sans-serif; position: relative;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 10px;">
              <span style="font-weight: bold; color: #15803d; font-size: 13px;">جمعية ريادة العطاء لخدمة الإنسان بالعسيلة</span>
              <span style="font-size: 9px; color: #666;">ترخيص: 100088868</span>
            </div>
            <div style="display: flex; gap: 10px; align-items: start;">
              <img src="${v.photo}" style="width: 70px; height: 70px; border-radius: 8px; object-fit: cover; border: 1px solid #16a34a;" />
              <div style="font-size: 11px; line-height: 1.5;">
                <div style="font-weight: bold; font-size: 12px; margin-bottom: 4px;">${v.name}</div>
                <div>العضوية: <b>${v.membershipNumber}</b></div>
                <div>الفريق: ${team ? team.nameAr : "مستقل"}</div>
                <div>الحالة: <span style="color: #15803d; font-weight: bold;">نشط ✓</span></div>
              </div>
            </div>
            <div style="margin-top: 10px; text-align: center; font-size: 10px; font-family: monospace;">
              ||||| | |||| ||| | || ${v.barcode}
            </div>
          </div>
        `;
      }).join("");

      win.document.write(`
        <html>
          <head><title>طباعة جميع بطاقات المتطوعين</title></head>
          <body style="display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; padding: 20px; background: #f8fafc;">
            ${cardsHtml}
            <script>window.print();</script>
          </body>
        </html>
      `);
      win.document.close();
    }
  };

  return (
    <div className="dir-rtl text-right w-full space-y-6">
      {/* Modern Off-Canvas Right Drawer */}
      <ModernAppSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeSubTab={activeSubTab}
        onSelectTab={(tabId) => {
          setActiveSubTab(tabId as any);
        }}
        navGroups={navGroups}
        totalVolunteersCount={data.volunteers?.length || 0}
        pendingRequestsCount={
          (data.teamApplications || []).filter(a => a.status === 'pending').length +
          (data.volunteerApplications || []).filter(a => a.status === 'pending').length
        }
        pendingOpportunitiesCount={opportunityRequests.filter(r => r.status === 'pending').length}
        onOpenQuickSupport={() => setActiveSubTab('support')}
        onOpenQuickSettings={() => setActiveSubTab('system_settings')}
      />

      {/* Main Content Area */}
      <div className="w-full space-y-6">
        {/* Modern Categorized Command Center & Navigation */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative z-30 overflow-visible space-y-0">
          
          {/* Top Administrative Context & Fast Actions */}
          <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/40 rounded-t-2xl">
            {/* System Hierarchy Breadcrumbs */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-black border border-emerald-200/60 dark:border-emerald-800/60">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                إدارة جمعية ريادة العطاء لخدمة الإنسان بالعسيلة
              </span>
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300">
                {activeCategory.label}
              </span>
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <span className="text-xs font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700">
                {getActiveTabTitle(activeSubTab)}
              </span>
            </div>

            {/* Top Quick Actions (Organized, Aligned) */}
            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end flex-wrap">
              {/* Primary ☰ Comprehensive Sidebar Trigger */}
              <button
                id="btn-toggle-sidebar"
                onClick={() => setIsSidebarOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer hover:shadow-md active:scale-95"
                title="فتح القائمة الجانبية الشاملة لجميع أقسام النظام (☰)"
              >
                <Menu className="w-4 h-4" />
                <span>القائمة الجانبية (☰)</span>
                {totalPendingCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                    {totalPendingCount}
                  </span>
                )}
              </button>

              {/* Fast Global Search Shortcut */}
              <button
                onClick={() => setActiveSubTab('globalsearch')}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                  activeSubTab === 'globalsearch'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs font-black'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
                title="البحث الشامل في المتطوعين والفرق والمبادرات"
              >
                <Search className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden md:inline">البحث الشامل</span>
              </button>

              {/* Fast Support & Tickets Shortcut */}
              <button
                onClick={() => setActiveSubTab('support')}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                  activeSubTab === 'support'
                    ? 'bg-red-600 text-white border-red-600 shadow-xs font-black'
                    : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/60 hover:bg-red-100'
                }`}
                title="إدارة الدعم الفني والتذاكر"
              >
                <Headphones className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                <span>الدعم والتذاكر</span>
              </button>
            </div>
          </div>

          {/* Mobile Responsive Category Selector (< md) */}
          <div className="md:hidden p-3 bg-slate-50/90 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">القسم الإداري النشط:</span>
              <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
                {activeCategory.label}
              </span>
            </div>
            <div className="relative">
              <select
                id="mobile-category-select"
                value={activeCategoryId}
                onChange={(e) => {
                  const catId = e.target.value;
                  setActiveCategoryId(catId);
                  const foundCat = primaryCategories.find(c => c.id === catId);
                  if (foundCat && foundCat.items.length > 0) {
                    if (!foundCat.items.some(i => i.id === activeSubTab)) {
                      setActiveSubTab(foundCat.items[0].id as any);
                    }
                  }
                }}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-100 shadow-xs appearance-none pr-8 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
              >
                {primaryCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label} ({cat.items.length} {cat.items.length === 1 ? 'صفحة' : 'صفحات'})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Primary Navigation Level: The 8 Clear Categories (Desktop & Tablet) */}
          <div className="hidden md:block p-3 bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800/80 relative z-30 overflow-visible">
            {/* Responsive Categories Bar */}
            <div className="grid grid-cols-4 lg:grid-cols-8 gap-2 relative overflow-visible">
              {primaryCategories.map((cat, catIndex) => {
                const CatIcon = cat.icon;
                const isSelected = activeCategoryId === cat.id;
                const hasMultipleSubPages = cat.items.length > 1;
                const isDropdownOpen = openDropdownCategoryId === cat.id;

                return (
                  <div key={cat.id} className={`relative category-dropdown-group ${isDropdownOpen ? 'z-50' : 'z-10'}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCategoryId(cat.id);
                        if (hasMultipleSubPages) {
                          // Toggle dropdown on click
                          setOpenDropdownCategoryId(isDropdownOpen ? null : cat.id);
                          if (!cat.items.some(i => i.id === activeSubTab)) {
                            setActiveSubTab(cat.items[0].id as any);
                          }
                        } else {
                          setActiveSubTab(cat.items[0].id as any);
                          setOpenDropdownCategoryId(null);
                        }
                      }}
                      className={`w-full h-11 px-2.5 rounded-xl text-xs font-bold flex items-center justify-between gap-1.5 border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm font-black'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:border-emerald-500/60 hover:bg-emerald-50/50 dark:hover:bg-slate-700'
                      }`}
                      title={cat.description}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 truncate">
                        <CatIcon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} />
                        <span className="truncate">{cat.label}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {cat.badge !== undefined && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : typeof cat.badge === 'number' && cat.badge > 0
                              ? 'bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                          }`}>
                            {cat.badge}
                          </span>
                        )}
                        {hasMultipleSubPages && (
                          <ChevronDown className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180 text-white' : isSelected ? 'text-white' : 'text-slate-400'}`} />
                        )}
                      </div>
                    </button>

                    {/* Floating Dropdown for Categories with Multiple Sub-Pages */}
                    {isDropdownOpen && hasMultipleSubPages && (
                      <div 
                        className={`absolute top-full mt-2.5 ${catIndex >= 4 ? 'left-0' : 'right-0'} w-64 sm:w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 py-2 z-50 animate-in fade-in zoom-in-95 dropdown-menu-floating`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <span className="text-[11px] font-black text-slate-500 dark:text-slate-400">
                            صفحات {cat.label} ({cat.items.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => setOpenDropdownCategoryId(null)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-md"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="py-1 max-h-64 overflow-y-auto">
                          {cat.items.map((subItem) => {
                            const SubIcon = subItem.icon;
                            const isSubActive = activeSubTab === subItem.id;
                            return (
                              <button
                                key={subItem.id}
                                type="button"
                                onClick={() => {
                                  setActiveCategoryId(cat.id);
                                  setActiveSubTab(subItem.id as any);
                                  setOpenDropdownCategoryId(null);
                                }}
                                className={`w-full px-3 py-2 text-xs font-bold flex items-center justify-between text-right transition-colors cursor-pointer ${
                                  isSubActive
                                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-black'
                                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <SubIcon className={`w-3.5 h-3.5 shrink-0 ${isSubActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                                  <span className="truncate">{subItem.label}</span>
                                </div>
                                {subItem.badge !== undefined && (
                                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                                    isSubActive
                                      ? 'bg-emerald-600 text-white'
                                      : typeof subItem.badge === 'number' && subItem.badge > 0
                                      ? 'bg-red-500 text-white'
                                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                  }`}>
                                    {subItem.badge}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Secondary Sub-Pages Level (Filtered cleanly by the chosen Category) */}
          <div className="p-3 bg-white dark:bg-slate-900 border-t md:border-t-0 border-slate-100 dark:border-slate-800/80 rounded-b-2xl">
            {(() => {
              const currentCat = primaryCategories.find(c => c.id === activeCategoryId) || activeCategory;
              const CurrentCatIcon = currentCat.icon;
              return (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                      <CurrentCatIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>صفحات قسم {currentCat.label}:</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                    {currentCat.items.map((subItem) => {
                      const SubIcon = subItem.icon;
                      const isSubActive = activeSubTab === subItem.id;
                      return (
                        <button
                          key={subItem.id}
                          id={`subtab-${subItem.id}`}
                          onClick={() => setActiveSubTab(subItem.id as any)}
                          className={`h-9 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
                            isSubActive
                              ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs font-black scale-[1.01]'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-emerald-700 dark:hover:text-emerald-300'
                          }`}
                        >
                          <SubIcon className={`w-3.5 h-3.5 ${isSubActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                          <span>{subItem.label}</span>
                          {subItem.badge !== undefined && (
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                              isSubActive
                                ? 'bg-white/20 text-white'
                                : typeof subItem.badge === 'number' && subItem.badge > 0
                                ? 'bg-red-500 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}>
                              {subItem.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

        </div>

        {/* Main Dynamic Panel Container */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-right">
          <DashboardErrorBoundary 
            pageName={`قسم: ${getActiveTabTitle(activeSubTab)}`}
            onReset={() => setActiveSubTab('enterprise_finance')}
          >
          {/* TAB: OFFICIAL LETTERS & CORRESPONDENCE */}
          {activeSubTab === 'letters' && (
            <AdminLettersManager
              letters={data.letters || []}
              onUpdateLetterStatus={async (letterId, status, adminNotes) => {
                await onUpdateLetterStatus?.(letterId, status, adminNotes);
              }}
              onMarkLetterAsRead={async (letterId) => {
                await onMarkLetterAsRead?.(letterId);
              }}
              onDeleteLetter={async (letterId) => {
                await onDeleteLetter?.(letterId);
              }}
            />
          )}

          {/* TAB: INVENTORY & STOCK AUDIT MANAGER */}
          {activeSubTab === 'inventory' && (
            <InventoryManager
              initiatives={data.initiatives}
            />
          )}

          {/* TAB: ELECTRONIC CUSTODY MANAGER */}
          {activeSubTab === 'custody' && (
            <CustodyManager
              volunteers={data.volunteers}
              currentUser={{ name: "إدارة الجمعية والمستودع" }}
              logoUrl={data.homeSettings?.logoUrl || "/logo.png"}
              associationName={data.homeSettings?.associationNameAr || "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة"}
            />
          )}

          {/* TAB: EMAIL SETTINGS & SENDER SMTP */}
          {activeSubTab === 'email_settings' && (
            <EmailSettingsPanel isDark={isDark} />
          )}

          {/* TAB: SYSTEM SETTINGS PANEL */}
          {activeSubTab === 'system_settings' && (
            <SystemSettingsPanel
              logs={data.logs || []}
              stats={data.stats}
              onRestoreDb={onRestoreDb}
            />
          )}
          
          {/* TAB: INTERNAL CHAT */}
          {activeSubTab === 'chat' && (
            <InternalChatPanel
              currentUser={{
                id: "admin-1",
                name: "المدير التنفيذي",
                role: "الإدارة العليا",
                avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop"
              }}
              teams={data.teams}
              volunteers={data.volunteers}
            />
          )}

          {/* TAB: SUPPORT ADMIN PANEL */}
          {activeSubTab === 'support' && (
            <SupportAdminPanel
              currentUserRole="admin"
              currentAgentName="مهندس الدعم التقني - عبد الرحمن"
            />
          )}

          {/* TAB: DEDICATED VOLUNTEER MANAGEMENT DASHBOARD & STATISTICS */}
          {activeSubTab === 'volunteer_mgmt_dashboard' && (
            <VolunteerManagementDashboard
              initiatives={data.initiatives || []}
              opportunityRequests={opportunityRequests || []}
              volunteers={data.volunteers || []}
              teams={data.teams || []}
              volunteerApplications={data.volunteerApplications || []}
              onAcceptApplication={async (appId, teamId) => {
                if (onAcceptVolunteerApplication) {
                  return await onAcceptVolunteerApplication(appId, teamId);
                }
                return false;
              }}
              onRejectApplication={async (appId, reason) => {
                if (onRejectVolunteerApplication) {
                  return await onRejectVolunteerApplication(appId, reason);
                }
                return false;
              }}
              onReviewOpportunity={(opp) => {
                setActiveSubTab('opp_requests');
              }}
              onEvaluateTeamPoints={onEvaluateTeamPoints}
            />
          )}
          
          {/* TAB: OPPORTUNITY REQUESTS REVIEW BY ADMIN */}
          {activeSubTab === 'opp_requests' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100">
                <div>
                  <h3 className="text-sm font-black text-emerald-950">مراجعة الفرص التطوعية</h3>
                  <p className="text-xs text-emerald-800/80 mt-0.5">عرض ومراجعة الفرص التطوعية المقدمة من قادة الفرق، تعيين معرف الفرصة الرسمي، واعتمادها أو إعادتها للتصحيح أو رفضها.</p>
                </div>
                <span className="text-xs font-mono font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-xl self-start md:self-auto">
                  إجمالي الفرص: {opportunityRequests.length}
                </span>
              </div>

              {/* Counter Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-150 text-center">
                  <strong className="text-lg font-black text-neutral-800 font-mono block">{opportunityRequests.length}</strong>
                  <span className="text-[11px] text-neutral-500 font-bold block">إجمالي الفرص</span>
                </div>
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-center">
                  <strong className="text-lg font-black text-amber-700 font-mono block">{opportunityRequests.filter(r => r.status === 'pending').length}</strong>
                  <span className="text-[11px] text-amber-800 font-bold block">قيد المراجعة</span>
                </div>
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center">
                  <strong className="text-lg font-black text-emerald-700 font-mono block">{opportunityRequests.filter(r => r.status === 'accepted').length}</strong>
                  <span className="text-[11px] text-emerald-800 font-bold block">مقبولة</span>
                </div>
                <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-center">
                  <strong className="text-lg font-black text-rose-700 font-mono block">{opportunityRequests.filter(r => r.status === 'rejected').length}</strong>
                  <span className="text-[11px] text-rose-800 font-bold block">مرفوضة</span>
                </div>
                <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-center col-span-2 md:col-span-1">
                  <strong className="text-lg font-black text-blue-700 font-mono block">{opportunityRequests.filter(r => r.status === 'returned').length}</strong>
                  <span className="text-[11px] text-blue-800 font-bold block">معادة للتصحيح</span>
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex border-b border-neutral-100 gap-2 overflow-x-auto pb-2">
                {(['all', 'pending', 'accepted', 'returned', 'rejected'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setOppStatusFilter(st)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      oppStatusFilter === st 
                        ? 'bg-emerald-600 text-white shadow-2xs' 
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {st === 'all' ? `الكل (${opportunityRequests.length})` :
                     st === 'pending' ? `قيد المراجعة (${opportunityRequests.filter(r => r.status === 'pending').length})` :
                     st === 'accepted' ? `مقبولة (${opportunityRequests.filter(r => r.status === 'accepted').length})` :
                     st === 'returned' ? `معادة للتصحيح (${opportunityRequests.filter(r => r.status === 'returned').length})` :
                     `مرفوضة (${opportunityRequests.filter(r => r.status === 'rejected').length})`}
                  </button>
                ))}
              </div>

              {/* Requests Table */}
              <div className="border border-neutral-150 rounded-xl overflow-hidden overflow-x-auto shadow-2xs">
                <table className="w-full text-right text-xs">
                  <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-150 font-bold">
                    <tr>
                      <th className="p-3">معرف الفرصة</th>
                      <th className="p-3">اسم الفرصة</th>
                      <th className="p-3">قائد الفريق</th>
                      <th className="p-3">الفريق</th>
                      <th className="p-3">النوع</th>
                      <th className="p-3">المجال</th>
                      <th className="p-3 text-center">العدد المطلوب</th>
                      <th className="p-3">تاريخ الإنشاء</th>
                      <th className="p-3">آخر تحديث</th>
                      <th className="p-3">الحالة</th>
                      <th className="p-3 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 font-medium">
                    {opportunityRequests
                      .filter(r => oppStatusFilter === 'all' || r.status === oppStatusFilter)
                      .map(r => (
                        <tr key={r.id} className="hover:bg-neutral-50/50 transition-all">
                          <td className="p-3 font-mono text-[11px]">
                            {r.opportunityCode ? (
                              <span className="bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-md border border-emerald-200">
                                #{r.opportunityCode}
                              </span>
                            ) : (
                              <span className="bg-neutral-100 text-neutral-400 text-[10px] px-2 py-0.5 rounded-md">
                                قيد التعيين
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-bold text-neutral-800">
                            <div>{r.title}</div>
                            <span className="text-[10px] font-mono text-neutral-400">طلب: #{r.id}</span>
                          </td>
                          <td className="p-3 text-neutral-700 font-bold">{r.leaderName || "قائد الفريق"}</td>
                          <td className="p-3 text-neutral-600">{r.teamName || "فريق تطوعي"}</td>
                          <td className="p-3">
                            <span className="bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-md text-[10.5px] font-bold inline-block">
                              {r.opportunityType}
                            </span>
                          </td>
                          <td className="p-3 text-neutral-600">{r.domain}</td>
                          <td className="p-3 text-center font-mono font-bold text-emerald-800">{r.neededCount} متطوع</td>
                          <td className="p-3 text-neutral-500 font-mono text-[11px]">
                            {r.createdAt ? new Date(r.createdAt).toLocaleDateString('ar-SA') : "-"}
                          </td>
                          <td className="p-3 text-neutral-500 font-mono text-[11px]">
                            {r.updatedAt ? new Date(r.updatedAt).toLocaleDateString('ar-SA') : (r.createdAt ? new Date(r.createdAt).toLocaleDateString('ar-SA') : "-")}
                          </td>
                          <td className="p-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                              r.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
                              r.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                              r.status === 'returned' ? 'bg-blue-100 text-blue-800' :
                              r.status === 'draft' ? 'bg-neutral-100 text-neutral-600' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {r.status === 'accepted' ? '✓ مقبولة' :
                               r.status === 'rejected' ? '❌ مرفوضة' :
                               r.status === 'returned' ? '⚠️ معادة للتصحيح' :
                               r.status === 'draft' ? '📝 مسودة' : '⏳ قيد المراجعة'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => {
                                setReviewingOpp(r);
                                setOppPlatformUrl(r.nationalPlatformUrl || "");
                                setOppCode(r.opportunityCode || "");
                                setOppRejectReason(r.rejectionReason || "");
                                setOppCorrectionNotes(r.correctionNotes || "");
                                setOppStartDate(r.startDate || "");
                                setOppEndDate(r.endDate || "");
                                setOppActionType(r.status === 'returned' ? 'return' : r.status === 'rejected' ? 'reject' : 'accept');
                                setOppModalError(null);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                            >
                              مراجعة واتخاذ قرار
                            </button>
                          </td>
                        </tr>
                      ))}
                    {opportunityRequests.filter(r => oppStatusFilter === 'all' || r.status === oppStatusFilter).length === 0 && (
                      <tr>
                        <td colSpan={11} className="p-8 text-center text-neutral-400 text-xs">
                          لا توجد فرص تطوعية ضمن هذا التصنيف حالياً.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: VOLUNTEER TEAM JOIN APPLICATIONS */}
          {activeSubTab === 'team_join_requests' && (
            <TeamJoinApplicationsPanel
              applications={data.teamApplications || []}
              teams={data.teams || []}
              departments={data.departments || []}
              onAcceptApplication={async (appId, depId, notes) => {
                if (onAcceptTeamApplication) {
                  return await onAcceptTeamApplication(appId, depId, notes);
                }
                return false;
              }}
              onRejectApplication={async (appId, reason) => {
                if (onRejectTeamApplication) {
                  return await onRejectTeamApplication(appId, reason);
                }
                return false;
              }}
              onRequestCorrection={async (appId, notes) => {
                if (onRequestTeamApplicationCorrection) {
                  return await onRequestTeamApplicationCorrection(appId, notes);
                }
                return false;
              }}
              onDeleteApplication={onDeleteTeamApplication}
              lang={lang}
            />
          )}

          {/* TAB: VOLUNTEER JOIN APPLICATIONS */}
          {activeSubTab === 'joinrequests' && (
            <JoinApplicationsPanel
              applications={data.volunteerApplications || []}
              teams={data.teams || []}
              onAcceptApplication={async (appId, teamId) => {
                if (onAcceptVolunteerApplication) {
                  return await onAcceptVolunteerApplication(appId, teamId);
                }
                return false;
              }}
              onRejectApplication={async (appId, reason) => {
                if (onRejectVolunteerApplication) {
                  return await onRejectVolunteerApplication(appId, reason);
                }
                return false;
              }}
              lang={lang}
            />
          )}

          {/* TAB 1: SYSTEM STATISTICS BREAKDOWN */}
          {activeSubTab === 'stats' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-md font-black text-neutral-800">إحصائيات وأداء الجمعية الكلي</h3>
                <p className="text-xs text-neutral-500 mt-0.5">تقرير إحصائي فوري مستخرج لحظياً من سجلات النظام</p>
              </div>

              {/* Stats Bento Grid Layout */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-emerald-50/40 border border-emerald-100/50 p-4 rounded-2xl text-right">
                  <div className="flex justify-between items-center text-emerald-600 mb-1">
                    <Building2 className="w-5 h-5" />
                    <span className="text-[10px] font-bold">نشط</span>
                  </div>
                  <strong className="text-lg font-black text-emerald-800 block leading-none">{data.departments?.length || 0}</strong>
                  <span className="text-[10px] text-neutral-500 font-bold mt-1 block">إدارات هيكلية</span>
                </div>

                <div className="bg-emerald-50/40 border border-emerald-100/50 p-4 rounded-2xl text-right">
                  <div className="flex justify-between items-center text-emerald-600 mb-1">
                    <Users className="w-5 h-5" />
                    <span className="text-[10px] font-bold">نشط</span>
                  </div>
                  <strong className="text-lg font-black text-emerald-800 block leading-none">{data.teams?.length || 0}</strong>
                  <span className="text-[10px] text-neutral-500 font-bold mt-1 block">فرق تطوعية</span>
                </div>

                <div className="bg-emerald-50/40 border border-emerald-100/50 p-4 rounded-2xl text-right">
                  <div className="flex justify-between items-center text-emerald-600 mb-1">
                    <Users className="w-5 h-5" />
                    <span className="text-[10px] font-bold">مسجل</span>
                  </div>
                  <strong className="text-lg font-black text-emerald-800 block leading-none">{data.volunteers?.length || 0}</strong>
                  <span className="text-[10px] text-neutral-500 font-bold mt-1 block">متطوع معتمد</span>
                </div>

                <div className="bg-emerald-50/40 border border-emerald-100/50 p-4 rounded-2xl text-right">
                  <div className="flex justify-between items-center text-emerald-600 mb-1">
                    <Calendar className="w-5 h-5" />
                    <span className="text-[10px] font-bold">إجمالي</span>
                  </div>
                  <strong className="text-lg font-black text-emerald-800 block leading-none">{data.initiatives?.length || 0}</strong>
                  <span className="text-[10px] text-neutral-500 font-bold mt-1 block">مبادرة تطوعية</span>
                </div>
              </div>

              {/* Core Analytics Rates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-neutral-100 p-5 rounded-2xl space-y-4">
                  <h4 className="text-xs font-black text-neutral-800">نسبة التزام الحضور مقابل الغياب الكلي</h4>
                  <div className="flex gap-4 items-center">
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-emerald-700">الحضور الكامل (3 نقاط)</span>
                        <span>80%</span>
                      </div>
                      <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: '80%' }} />
                      </div>
                    </div>
                    <div className="text-center shrink-0">
                      <span className="text-lg font-black text-emerald-600 block leading-none">80%</span>
                      <span className="text-[8.5px] text-neutral-400 block mt-1">نسبة الحضور</span>
                    </div>
                  </div>

                  <div className="flex gap-4 items-center border-t border-neutral-50 pt-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-rose-700">الغياب والاعتذار</span>
                        <span>20%</span>
                      </div>
                      <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-rose-500 h-full rounded-full" style={{ width: '20%' }} />
                      </div>
                    </div>
                    <div className="text-center shrink-0">
                      <span className="text-lg font-black text-rose-500 block leading-none">20%</span>
                      <span className="text-[8.5px] text-neutral-400 block mt-1">نسبة الغياب</span>
                    </div>
                  </div>
                </div>

                {/* Rank lists */}
                <div className="border border-neutral-100 p-5 rounded-2xl space-y-3">
                  <h4 className="text-xs font-black text-neutral-800">لوحة الشرف الصدارة والترتيب</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center bg-neutral-50 p-2 rounded-lg">
                      <span className="text-neutral-500">🏆 أفضل متطوع (نقاط):</span>
                      <strong className="text-neutral-800">
                        {(data.volunteers && data.volunteers.length > 0) ? [...data.volunteers].sort((a,b)=> (b.points || 0) - (a.points || 0))[0]?.name || "أحمد الغامدي" : "أحمد الغامدي"}
                      </strong>
                    </div>
                    <div className="flex justify-between items-center bg-neutral-50 p-2 rounded-lg">
                      <span className="text-neutral-500">👔 أفضل قائد فريق:</span>
                      <strong className="text-neutral-800">سعود الحربي (فريق التنظيم)</strong>
                    </div>
                    <div className="flex justify-between items-center bg-neutral-50 p-2 rounded-lg">
                      <span className="text-neutral-500">👥 أفضل فريق تطوعي:</span>
                      <strong className="text-neutral-800">فريق الإعلام (إدارة الإعلام)</strong>
                    </div>
                    <div className="flex justify-between items-center bg-neutral-50 p-2 rounded-lg">
                      <span className="text-neutral-500">🏢 أفضل إدارة فاعلة:</span>
                      <strong className="text-neutral-800">إدارة التطوع (ريادة العطاء)</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DEPARTMENTS & BOARD DIRECTIVES (CRUD) */}
          {activeSubTab === 'deps' && (
            <div className="space-y-8">
              
              {/* SECTION A: BOARD OF DIRECTORS DIRECTIVES TO DEPARTMENTS */}
              <div className="bg-amber-50/40 p-5 rounded-2xl border border-amber-200/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-200/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-amber-950">إرسال وتوجيهات مجلس الإدارة للإدارات التنفيذية</h3>
                      <p className="text-xs text-amber-800/80 mt-0.5">يمكن لمجلس الإدارة توجيه القرارات والتكليفات الرسمية مباشرة لكل مدير إدارة متابعة الإنجاز لحظياً</p>
                    </div>
                  </div>
                  <button
                    id="btn-add-directive"
                    onClick={() => {
                      setEditingDirective({
                        departmentId: data.departments[0]?.id || "",
                        title: "",
                        description: "",
                        priority: "high",
                        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        status: "pending"
                      });
                      setShowDirectiveModal(true);
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-xs self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إرسال تكليف/قرار جديد من مجلس الإدارة</span>
                  </button>
                </div>

                {/* Directives List Table */}
                <div className="overflow-x-auto border border-amber-200/60 rounded-xl bg-white shadow-2xs">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-amber-100/50 text-amber-900 border-b border-amber-200/60 font-bold">
                        <th className="p-3">الإدارة المكلفة</th>
                        <th className="p-3">عنوان القرار والتكليف</th>
                        <th className="p-3 text-center">الأهمية</th>
                        <th className="p-3 text-center">تاريخ الاستحقاق</th>
                        <th className="p-3 text-center">حالة الإنجاز</th>
                        <th className="p-3">ملاحظات تقرير المدير التنفيذي</th>
                        <th className="p-3 text-center">الإجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100 font-medium">
                      {(data.departmentDirectives || []).length > 0 ? (
                        (data.departmentDirectives || []).map(dir => {
                          const targetDept = data.departments.find(d => d.id === dir.departmentId);
                          return (
                            <tr key={dir.id} className="hover:bg-amber-50/30 transition-all">
                              <td className="p-3 font-bold text-neutral-800">
                                <div>
                                  <span className="block text-emerald-800 font-black">{targetDept ? targetDept.nameAr : "إدارة عامة"}</span>
                                  <span className="text-[10px] text-neutral-500 font-normal">{targetDept?.directorName}</span>
                                </div>
                              </td>
                              <td className="p-3">
                                <span className="font-bold text-neutral-900 block">{dir.title}</span>
                                <span className="text-[10.5px] text-neutral-600 line-clamp-1">{dir.description}</span>
                              </td>
                              <td className="p-3 text-center">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  dir.priority === 'urgent' ? 'bg-rose-100 text-rose-800' :
                                  dir.priority === 'high' ? 'bg-amber-100 text-amber-900' :
                                  'bg-neutral-100 text-neutral-700'
                                }`}>
                                  {dir.priority === 'urgent' ? 'عاجل طارئ' : dir.priority === 'high' ? 'مرتفع' : 'عادي'}
                                </span>
                              </td>
                              <td className="p-3 text-center font-mono font-bold text-neutral-700">{dir.dueDate}</td>
                              <td className="p-3 text-center">
                                <span className={`text-[10.5px] px-2.5 py-1 rounded-full font-bold inline-block ${
                                  dir.status === 'completed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                  dir.status === 'in_progress' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                                  'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                                }`}>
                                  {dir.status === 'completed' ? 'مكتمل ومستلم' : dir.status === 'in_progress' ? 'قيد التنفيذ والعمل' : 'بانتظار البدء'}
                                </span>
                              </td>
                              <td className="p-3 text-xs text-neutral-600 italic">
                                {dir.completionNotes ? dir.completionNotes : <span className="text-neutral-400 font-normal">لا توجد ملاحظات مرفوعة بعد</span>}
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => {
                                    if(confirm("هل أنت متأكد من رغبتك بحذف هذا التكليف؟")) {
                                      if(onDeleteDepartmentDirective) onDeleteDepartmentDirective(dir.id);
                                    }
                                  }}
                                  className="text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-all text-xs font-bold"
                                >
                                  حذف
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-neutral-500 font-bold">
                            لا توجد تكليفات نشطة مرسلة من مجلس الإدارة حالياً. اضغط أحدث زر أعلاه لإرسال تكليف جديد.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION B: EXECUTIVE DEPARTMENTS CARDS & CREDENTIALS */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                  <div>
                    <h3 className="text-md font-black text-emerald-950">الهيكلة التنفيذية والحسابات الإدارية (8 إدارات معتمدة)</h3>
                    <p className="text-xs text-emerald-800/80 mt-0.5">تقسيم وتوزيع المهام والتكليفات الإدارية وحسابات تسجيل دخول المدراء</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      id="btn-add-dep"
                      onClick={() => {
                        setEditingDep({ nameAr: "", nameEn: "", directorName: "", descriptionAr: "", descriptionEn: "", tasks: [], nationalId: "1010000009", password: "123" });
                        setShowDepModal(true);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة إدارة جديدة</span>
                    </button>
                  </div>
                </div>

                {/* Grid of 8 Executive Departments */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                  {data.departments.map((d, index) => (
                    <div key={d.id} className="border border-neutral-150 bg-white p-5 rounded-2xl flex flex-col justify-between hover:border-emerald-500 transition-all shadow-2xs hover:shadow-md space-y-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start gap-2 border-b border-neutral-100 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-xl bg-emerald-600 text-white text-xs font-black font-mono flex items-center justify-center shrink-0 shadow-2xs">
                              #{index + 1}
                            </span>
                            <div>
                              <h4 className="text-sm font-black text-neutral-900">{d.nameAr}</h4>
                              <span className="text-[10.5px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md font-mono mt-0.5 inline-block">{d.nameEn}</span>
                            </div>
                          </div>
                          <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full font-bold shrink-0">
                            إدارة تنفيذية
                          </span>
                        </div>

                        {/* Director and Login Credentials Badge */}
                        <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-100 space-y-2">
                          <div className="text-xs font-bold text-neutral-800 flex items-center justify-between">
                            <span className="text-neutral-600">المدير المسؤول:</span>
                            <span className="text-emerald-950 font-black">{d.directorName}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-emerald-100/80 text-[11px] font-mono">
                            <div className="bg-white p-1.5 rounded-lg border border-emerald-200/60 text-center">
                              <span className="text-[9.5px] text-neutral-500 font-sans block font-bold">الهوية الوطنية / اليوزر:</span>
                              <strong className="text-emerald-900 font-bold block">{d.nationalId || `101000000${index + 1}`}</strong>
                            </div>
                            <div className="bg-white p-1.5 rounded-lg border border-emerald-200/60 text-center">
                              <span className="text-[9.5px] text-neutral-500 font-sans block font-bold">كلمة المرور:</span>
                              <strong className="text-emerald-900 font-bold block">{d.password || "123"}</strong>
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-neutral-600 leading-relaxed bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">{d.descriptionAr || "لا يوجد وصف عربي حالياً."}</p>

                        {/* Executive Tasks List */}
                        <div className="space-y-2 pt-1">
                          <span className="text-[11px] font-black text-neutral-800 block flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>المهام والتكليفات الإدارية المعتمدة:</span>
                          </span>
                          {d.tasks && d.tasks.length > 0 ? (
                            <ul className="space-y-1.5 pr-1">
                              {d.tasks.map((task, tIdx) => (
                                <li key={tIdx} className="text-[11px] text-neutral-700 flex items-start gap-2 bg-neutral-50/60 p-2 rounded-lg border border-neutral-100/80">
                                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 font-mono text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                    {tIdx + 1}
                                  </span>
                                  <span className="leading-tight font-medium">{task}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-[10.5px] text-neutral-400 italic pr-2">لا توجد مهام مسجلة تفصيلياً حالياً لهذه الإدارة.</p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end pt-3 border-t border-neutral-100">
                        <button
                          id={`btn-edit-dep-${d.id}`}
                          onClick={() => {
                            setEditingDep(d);
                            setShowDepModal(true);
                          }}
                          className="text-neutral-600 hover:text-emerald-700 hover:bg-emerald-50 p-2 rounded-xl transition-all text-xs font-bold flex items-center gap-1 cursor-pointer border border-neutral-150"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>تعديل الحساب والمهام</span>
                        </button>
                        <button
                          id={`btn-delete-dep-${d.id}`}
                          onClick={() => {
                            if(confirm("هل أنت متأكد من رغبتك بحذف هذه الإدارة وكافة الفرق التابعة لها؟")) {
                              onDeleteDepartment(d.id);
                            }
                          }}
                          className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 p-2 rounded-xl transition-all text-xs font-bold flex items-center gap-1 cursor-pointer border border-neutral-150"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: HR MASTER DASHBOARD */}
          {activeSubTab === 'hr_dashboard' && (
            <HRDashboard
              departments={data.departments || []}
              employees={employees || []}
              employeeRequests={employeeRequests || []}
              onApproveRequest={onApproveEmployeeRequest}
              onRejectRequest={onRejectEmployeeRequest}
              onSaveEmployee={async (empData) => {
                try {
                  const res = await fetch("/api/db/hr/employees/save", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(empData)
                  });
                  return res.ok;
                } catch {
                  return false;
                }
              }}
            />
          )}

          {/* TAB: EMPLOYEE REQUESTS & MASTER STAFF REGISTRY */}
          {activeSubTab === 'employee_requests' && (
            <AdminStaffManager
              departments={data.departments || []}
              employees={employees || []}
              employeeRequests={employeeRequests || []}
              teamStaffAssignments={teamStaffAssignments || []}
              onApproveRequest={onApproveEmployeeRequest || (async () => false)}
              onRejectRequest={onRejectEmployeeRequest || (async () => false)}
              onRequestModification={onRequestEmployeeModification || (async () => false)}
            />
          )}

          {/* TAB 3: TEAMS (CRUD) */}
          {activeSubTab === 'teams' && (
            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-md font-black text-neutral-800">الفرق التطوعية</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">إنشاء ومتابعة الفرق والمجالس المسؤولة عن المبادرات</p>
                </div>
                <button
                  id="btn-add-team"
                  onClick={() => {
                    setEditingTeam({ nameAr: "", nameEn: "", leaderName: "", departmentId: data.departments[0]?.id || "", descriptionAr: "", descriptionEn: "" });
                    setShowTeamModal(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إنشاء فريق تطوعي</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {data.teams.map(t => {
                  const dep = data.departments.find(d => d.id === t.departmentId);
                  return (
                    <div key={t.id} className="border border-neutral-100 p-4 rounded-2xl flex flex-col justify-between hover:border-emerald-500 transition-all">
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-xs font-black text-neutral-800">{t.nameAr}</h4>
                            <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full mt-1 inline-block">
                              {dep ? dep.nameAr : "مستقل"}
                            </span>
                          </div>
                          <span className="text-[10px] bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-sm font-mono">{t.nameEn}</span>
                        </div>
                        <p className="text-[11px] text-neutral-500 mt-2">{t.descriptionAr || "لا يوجد وصف حالياً."}</p>
                        <div className="text-[11px] font-bold text-neutral-700 mt-3 flex justify-between items-center bg-neutral-50 p-2 rounded-lg">
                          <span>قائد الفريق المعين:</span>
                          <span className="text-emerald-700 font-bold">{t.leaderName}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-neutral-50">
                        <button
                          id={`btn-edit-team-${t.id}`}
                          onClick={() => {
                            setEditingTeam(t);
                            setShowTeamModal(true);
                          }}
                          className="text-neutral-500 hover:text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-lg transition-all text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>تعديل</span>
                        </button>
                        <button
                          id={`btn-delete-team-${t.id}`}
                          onClick={() => {
                            if(confirm("هل أنت متأكد من رغبتك بحذف هذا الفريق التطوعي؟")) {
                              onDeleteTeam(t.id);
                            }
                          }}
                          className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg transition-all text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: VOLUNTEERS DIRECTORY */}
          {activeSubTab === 'vols' && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-md font-black text-neutral-800">سجل ملفات المتطوعين</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">البحث، استيراد المتطوعين، وإدارة العضويات الفردية</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    id="btn-excel-import-trigger"
                    onClick={() => {
                      setExcelText("أحمد عادل الشهري, 0550000001, ahmed@reyada.sa\nفاطمة خالد الروقي, 0550000002, fatima@reyada.sa\nسليمان محمد العسيري, 0550000003, soliman@reyada.sa");
                      setExcelTeamId(data.teams[0]?.id || "");
                      setShowExcelModal(true);
                    }}
                    className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>استيراد جماعي (Excel)</span>
                  </button>
                  <button
                    id="btn-add-vol-trigger"
                    onClick={() => {
                      setEditingVol({ name: "", email: "", phone: "", teamId: data.teams[0]?.id || "", departmentId: data.departments[0]?.id || "", titleAr: "متطوع تنظيمي", titleEn: "Organizing Volunteer", status: "active" });
                      setShowVolModal(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة متطوع جديد</span>
                  </button>
                </div>
              </div>

              {/* Search & Team Filter */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute right-3.5 top-3 w-4 h-4 text-neutral-400" />
                  <input
                    id="admin-vol-search"
                    type="text"
                    placeholder="ابحث بالاسم الكامل للمتطوع، رقم العضوية، أو رقم الجوال..."
                    value={volSearch}
                    onChange={(e) => setVolSearch(e.target.value)}
                    className="w-full pr-10 pl-4 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 border border-neutral-200 rounded-xl px-3 py-1.5 bg-neutral-50 text-xs font-bold text-neutral-700">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>فلترة بالفريق:</span>
                    <select
                      value={volTeamFilter}
                      onChange={(e) => setVolTeamFilter(e.target.value)}
                      className="bg-transparent outline-none cursor-pointer font-bold text-xs pr-1"
                    >
                      <option value="all">جميع الفرق ({data.volunteers.length})</option>
                      {data.teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nameAr} ({data.volunteers.filter(v => v.teamId === t.id).length})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto border border-neutral-100 rounded-xl">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-neutral-50 text-neutral-500 border-b border-neutral-100 font-bold">
                      <th className="p-3">المتطوع</th>
                      <th className="p-3">رقم العضوية</th>
                      <th className="p-3">رقم الجوال</th>
                      <th className="p-3">الفريق المعين</th>
                      <th className="p-3 text-center">النقاط</th>
                      <th className="p-3 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {filteredVolunteers.map(v => {
                      const team = data.teams.find(t => t.id === v.teamId);
                      return (
                        <tr key={v.id} className="hover:bg-neutral-50/20 transition-all">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <img src={v.photo} alt={v.name} className="w-8 h-8 rounded-full object-cover border border-neutral-100" referrerPolicy="no-referrer" />
                              <div>
                                <span className="font-bold text-neutral-800 block">{v.name}</span>
                                <span className="text-[10px] text-neutral-400 block">{v.email || "بدون بريد إلكتروني"}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 font-mono font-bold text-neutral-600">{v.membershipNumber}</td>
                          <td className="p-3 font-mono text-neutral-500">{v.phone}</td>
                          <td className="p-3">
                            {team ? (
                              <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2.5 py-1 rounded-lg font-bold">
                                <Users className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>{team.nameAr}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full font-bold">
                                غير معين
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center font-bold text-amber-600 font-mono">{v.points}</td>
                          <td className="p-3 text-center">
                            <div className="flex gap-1.5 justify-center items-center">
                              <button
                                id={`btn-report-vol-${v.id}`}
                                onClick={() => {
                                  setSelectedReportVolunteer(v);
                                  setShowReportModal(true);
                                }}
                                className="text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-sm transition-all cursor-pointer font-bold flex items-center gap-1 text-[11px]"
                                title="تصدير تقرير الإنجاز الشهري وساعات التطوع المعتمدة PDF"
                              >
                                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                                <span>تقرير إنجاز</span>
                              </button>
                              <button
                                id={`btn-edit-vol-${v.id}`}
                                onClick={() => {
                                  setEditingVol(v);
                                  setShowVolModal(true);
                                }}
                                className="text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded-sm transition-all cursor-pointer font-bold"
                              >
                                تعديل
                              </button>
                              <button
                                id={`btn-delete-vol-${v.id}`}
                                onClick={() => {
                                  if(confirm("هل أنت متأكد من رغبتك بحذف ملف هذا المتطوع بالكامل؟")) {
                                    onDeleteVolunteer(v.id);
                                  }
                                }}
                                className="text-rose-500 hover:bg-rose-50 px-2 py-1 rounded-sm transition-all cursor-pointer font-bold"
                              >
                                حذف
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

          {/* TAB 5: VOLUNTEER CARD TEMPLATES & ISSUANCE SYSTEM */}
          {activeSubTab === 'cards' && (
            <VolunteerCardTemplatesPanel 
              volunteers={data.volunteers}
              teams={data.teams}
              departments={data.departments}
              femaleUnifiedPhotoUrl={data.homeSettings?.femaleUnifiedCardPhoto}
              onUpdateVolunteer={(vol) => onAddVolunteer(vol)}
            />
          )}

          {/* TAB 6: INITIATIVES (COPY, ARCHIVE, NEW) */}
          {activeSubTab === 'init' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-md font-black text-neutral-800">إدارة الفرص والمبادرات التطوعية</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">طرح مبادرات جديدة، أرشفة الفرص المكتملة، وتكرار المبادرات السابقة</p>
                </div>
                <button
                  id="btn-add-init"
                  onClick={() => {
                    setEditingInit({ name: "", description: "", place: "", date: new Date().toISOString().split('T')[0], startTime: "17:00", endTime: "20:00", departmentId: data.departments[0]?.id || "", teamId: data.teams[0]?.id || "", neededCount: 15, registrationStatus: "open" });
                    setShowInitModal(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>طرح مبادرة جديدة</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-neutral-100 rounded-xl">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-neutral-50 text-neutral-500 border-b border-neutral-100 font-bold">
                      <th className="p-3">المبادرة</th>
                      <th className="p-3">التاريخ والوقت</th>
                      <th className="p-3">الإدارة والفريق المسؤول</th>
                      <th className="p-3 text-center">العدد المطلوب</th>
                      <th className="p-3 text-center">الحالة</th>
                      <th className="p-3 text-center">إجراءات إضافية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {data.initiatives.map(i => {
                      const dep = data.departments.find(d => d.id === i.departmentId);
                      const team = data.teams.find(t => t.id === i.teamId);
                      return (
                        <tr key={i.id} className="hover:bg-neutral-50/20 transition-all">
                          <td className="p-3">
                            <span className="font-bold text-neutral-800 block">{i.name}</span>
                            <span className="text-[10px] text-neutral-400 block max-w-xs truncate">{i.place}</span>
                          </td>
                          <td className="p-3 font-mono">
                            <span className="block text-neutral-700">{i.date}</span>
                            <span className="block text-[10px] text-neutral-400 mt-0.5">{i.startTime} - {i.endTime}</span>
                          </td>
                          <td className="p-3">
                            <span className="text-neutral-500 block">{dep ? dep.nameAr : "مستقل"}</span>
                            <span className="text-[10px] text-emerald-600 block mt-0.5">{team ? team.nameAr : ""}</span>
                          </td>
                          <td className="p-3 text-center font-bold text-neutral-700 font-mono">{i.acceptedVolunteerIds.length} / {i.neededCount}</td>
                          <td className="p-3 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[9px] ${
                              i.registrationStatus === 'open' ? 'bg-emerald-100 text-emerald-800' :
                              i.registrationStatus === 'closed' ? 'bg-amber-100 text-amber-800' : 'bg-neutral-100 text-neutral-600'
                            }`}>
                              {i.registrationStatus === 'open' ? 'مفتوح للتسجيل' : i.registrationStatus === 'closed' ? 'مكتمل' : 'مؤرشفة'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex gap-1.5 justify-center">
                              <button
                                id={`btn-copy-init-${i.id}`}
                                onClick={() => {
                                  setCopyId(i.id);
                                  setNewCopyName(`${i.name} - نسخة مكررة`);
                                  setNewCopyDate(new Date().toISOString().split('T')[0]);
                                  setShowCopyModal(true);
                                }}
                                className="text-emerald-700 hover:bg-emerald-50 p-1.5 rounded-md transition-all text-[11px] font-bold cursor-pointer flex items-center gap-1"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>نسخ</span>
                              </button>
                              <button
                                id={`btn-edit-init-${i.id}`}
                                onClick={() => {
                                  setEditingInit(i);
                                  setShowInitModal(true);
                                }}
                                className="text-neutral-500 hover:bg-neutral-100 p-1.5 rounded-md transition-all text-[11px] font-bold cursor-pointer"
                              >
                                تعديل
                              </button>
                              <button
                                id={`btn-archive-init-${i.id}`}
                                onClick={() => {
                                  onAddInitiative({ ...i, registrationStatus: 'archived' });
                                }}
                                className="text-neutral-400 hover:text-neutral-600 p-1.5 rounded-md transition-all text-[11px] font-bold cursor-pointer flex items-center gap-1"
                                disabled={i.registrationStatus === 'archived'}
                              >
                                <Archive className="w-3.5 h-3.5" />
                                <span>أرشفة</span>
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

          {/* TAB 7: OPERATION AUDIT TRAIL LOGS */}
          {activeSubTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-md font-black text-neutral-800">سجل العمليات والتدقيق (Audit Trail)</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">تسجيل فوري لعمليات الدخول وقبول الطلبات والبطاقات وتأكيد الحضور مع عنوان IP والجهاز</p>
                </div>
              </div>

              {/* Search log bar */}
              <div className="relative">
                <Search className="absolute right-3.5 top-3 w-4 h-4 text-neutral-400" />
                <input
                  id="admin-log-search"
                  type="text"
                  placeholder="ابحث باسم المستخدم أو طبيعة العملية للتصفية الفورية..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="border border-neutral-100 rounded-xl overflow-hidden divide-y divide-neutral-50 max-h-96 overflow-y-auto">
                {filteredLogs.map(log => (
                  <div key={log.id} className="p-3.5 hover:bg-neutral-50/50 transition-all text-xs flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-800">{log.user}</span>
                        <span className="text-[10px] text-neutral-400 font-mono">{log.timestamp}</span>
                      </div>
                      <p className="text-neutral-600 font-medium">{log.action}</p>
                    </div>
                    <div className="text-[10px] text-neutral-400 font-mono text-left space-y-0.5 shrink-0">
                      <div>IP: {log.ip}</div>
                      <div>الجهاز: {log.device}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 9: ROLE & PERMISSION SYSTEM (ENTERPRISE RBAC MATRIX) */}
          {activeSubTab === 'permissions' && (() => {
            // Aggregate all accounts across departments, employees, storekeepers, leaders, and volunteers
            const allAccountsList: any[] = [];

            // 1. Department Directors
            (data.departments || []).forEach(d => {
              allAccountsList.push({
                id: d.id,
                type: 'director',
                name: d.directorName || `مدير ${d.nameAr}`,
                nationalId: d.nationalId || '',
                phone: d.phone || '',
                email: d.email || '',
                departmentId: d.id,
                departmentName: d.nameAr,
                jobTitle: `مدير ${d.nameAr}`,
                role: d.id === 'dep-8' ? 'storekeeper' : 'department_admin',
                status: 'active',
                permissions: [
                  'view_department', 'create_data', 'edit_data', 'delete_data', 'approve_data',
                  'disburse_data', 'receive_data', 'print_data', 'export_pdf', 'export_excel',
                  'manage_staff', 'manage_tasks', 'view_reports'
                ],
                allowedPages: ['inventory', 'volunteer_ops', 'requests', 'beneficiaries', 'hr_staff', 'finance_ledger', 'projects_list', 'media_news', 'directives', 'tasks', 'staff', 'letters']
              });
            });

            // 2. Employees & Storekeepers
            const staffList = (employees && employees.length > 0) ? employees : ((data as any).employees || []);
            staffList.forEach((e: any) => {
              if (!allAccountsList.some(x => x.id === e.id || (e.nationalId && x.nationalId === e.nationalId))) {
                const isWarehouse = e.departmentId === 'dep-8' || (e.jobTitle && e.jobTitle.includes('مخزن')) || (e.jobTitle && e.jobTitle.includes('مستودع'));
                allAccountsList.push({
                  id: e.id,
                  type: isWarehouse ? 'warehouse' : 'employee',
                  name: e.name,
                  nationalId: e.nationalId,
                  phone: e.phone,
                  email: e.email,
                  departmentId: e.departmentId || (isWarehouse ? 'dep-8' : 'dep-1'),
                  departmentName: e.departmentName || (data.departments.find(d => d.id === e.departmentId)?.nameAr) || (isWarehouse ? 'إدارة المستودع والمخزن' : 'إدارة عامة'),
                  jobTitle: e.jobTitle || (isWarehouse ? 'أمين مستودع' : 'موظف إدارة'),
                  role: e.role || (isWarehouse ? 'storekeeper' : 'employee'),
                  status: e.status || 'active',
                  permissions: e.permissions || (isWarehouse ? ['view_department', 'create_data', 'edit_data', 'disburse_data', 'receive_data', 'print_data'] : ['view_department', 'create_data', 'edit_data']),
                  allowedPages: e.allowedPages || (isWarehouse ? ['inventory', 'tasks', 'directives', 'letters'] : ['tasks', 'directives'])
                });
              }
            });

            // 3. Team Leaders
            (data.teams || []).forEach(t => {
              if (t.leaderNationalId && !allAccountsList.some(x => x.nationalId === t.leaderNationalId)) {
                allAccountsList.push({
                  id: `leader-${t.id}`,
                  type: 'leader',
                  name: t.leaderName,
                  nationalId: t.leaderNationalId,
                  phone: t.leaderPhone,
                  email: t.leaderEmail,
                  departmentId: t.departmentId || 'dep-5',
                  departmentName: t.nameAr,
                  jobTitle: `قائد فريق ${t.nameAr}`,
                  role: 'leader',
                  status: 'active',
                  permissions: ['create_initiatives', 'confirm_attendance', 'view_reports', 'manage_notifications'],
                  allowedPages: ['teams', 'tasks']
                });
              }
            });

            // 4. Volunteers
            (data.volunteers || []).forEach(v => {
              if (!allAccountsList.some(x => x.id === v.id || (v.nationalId && x.nationalId === v.nationalId))) {
                allAccountsList.push({
                  id: v.id,
                  type: 'volunteer',
                  name: v.name,
                  nationalId: v.nationalId,
                  phone: v.phone,
                  email: v.email,
                  membershipNumber: v.membershipNumber,
                  departmentId: v.departmentId || 'dep-5',
                  departmentName: (data.departments.find(d => d.id === v.departmentId)?.nameAr) || 'إدارة العمل التطوعي',
                  jobTitle: (v as any).jobTitle || (v as any).titleAr || 'متطوع معتمد',
                  role: (v as any).role || 'volunteer',
                  status: v.status || 'active',
                  permissions: (v as any).permissions || [],
                  allowedPages: []
                });
              }
            });

            // Filter accounts
            const filteredAccounts = allAccountsList.filter(acc => {
              if (permSelectedDeptFilter !== 'all' && acc.departmentId !== permSelectedDeptFilter) {
                if (permSelectedDeptFilter === 'dep-8' && (acc.role === 'storekeeper' || acc.type === 'warehouse')) {
                  // match warehouse
                } else {
                  return false;
                }
              }

              if (permFilterCategory === 'directors' && acc.type !== 'director') return false;
              if (permFilterCategory === 'employees' && acc.type !== 'employee') return false;
              if (permFilterCategory === 'warehouse' && acc.type !== 'warehouse' && acc.role !== 'storekeeper' && acc.departmentId !== 'dep-8') return false;
              if (permFilterCategory === 'leaders' && acc.type !== 'leader' && acc.role !== 'leader') return false;
              if (permFilterCategory === 'volunteers' && acc.type !== 'volunteer') return false;

              if (permSearchQuery.trim()) {
                const q = permSearchQuery.trim().toLowerCase();
                const matchName = (acc.name || '').toLowerCase().includes(q);
                const matchNId = (acc.nationalId || '').includes(q);
                const matchPhone = (acc.phone || '').includes(q);
                const matchJob = (acc.jobTitle || '').toLowerCase().includes(q);
                const matchDept = (acc.departmentName || '').toLowerCase().includes(q);
                const matchMem = (acc.membershipNumber || '').includes(q);
                if (!matchName && !matchNId && !matchPhone && !matchJob && !matchDept && !matchMem) return false;
              }
              return true;
            });

            const handleSelectAccount = (acc: any) => {
              setPermSelectedAccount(acc);
              setPermVolId(acc.id);
              setPermRole(acc.role || 'volunteer');
              setPermDepartmentId(acc.departmentId || 'dep-1');
              setPermJobTitle(acc.jobTitle || '');
              setPermList(acc.permissions || []);
              setPermAllowedPages(acc.allowedPages || []);
              setPermStatus(acc.status || 'active');
              setPermSuccess(false);
              setPermSaveMessage('');
            };

            const handleSaveComprehensivePermissions = async () => {
              if (!permSelectedAccount) return;
              setPermIsSaving(true);
              setPermSaveMessage('');
              try {
                // Expand granular permissions with legacy keys for full server & UI backward compatibility
                const expandedPerms = expandPermissionsWithLegacyKeys(permList, data.departments);

                const payload = {
                  userId: permSelectedAccount.id,
                  nationalId: permSelectedAccount.nationalId,
                  name: permSelectedAccount.name,
                  role: permRole,
                  departmentId: permDepartmentId,
                  jobTitle: permJobTitle,
                  permissions: expandedPerms,
                  allowedPages: permAllowedPages,
                  status: permStatus
                };

                const res = await fetch("/api/db/permissions/update", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload)
                });
                const resData = await res.json();
                if (res.ok && (resData.success || resData.status === 'success')) {
                  setPermSuccess(true);
                  setPermSaveMessage("تم حفظ صلاحيات المستخدم بنجاح.");
                  // Update locally
                  if (permSelectedAccount.type === 'volunteer' || permRole === 'volunteer') {
                    onUpdateVolunteerPermissions(permSelectedAccount.id, permRole, expandedPerms);
                  }
                  // Update account in list
                  permSelectedAccount.role = permRole;
                  permSelectedAccount.departmentId = permDepartmentId;
                  permSelectedAccount.jobTitle = permJobTitle;
                  permSelectedAccount.permissions = expandedPerms;
                  permSelectedAccount.allowedPages = permAllowedPages;
                  permSelectedAccount.status = permStatus;

                  setTimeout(() => {
                    setPermSuccess(false);
                    setPermSaveMessage('');
                  }, 4000);
                } else {
                  alert(resData.message || "حدث خطأ أثناء حفظ الصلاحيات.");
                }
              } catch (err: any) {
                alert("تعذر الاتصال بالخادم: " + err.message);
              } finally {
                setPermIsSaving(false);
              }
            };

            return (
              <div className="space-y-6 animate-fade-in text-right">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
                  <div>
                    <h3 className="text-base font-black text-neutral-800 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-emerald-600" />
                      <span>مصفوفة الصلاحيات والحسابات المركزية (Enterprise RBAC)</span>
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1">
                      إدارة مساحات عمل الإدارات، تعيين مدراء وموظفي الإدارات، أمناء المستودعات، وضبط صلاحيات العمليات بدقة كاملة.
                    </p>
                  </div>
                  <div className="text-xs font-mono bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full font-bold border border-emerald-200">
                    إجمالي الحسابات المسجلة: {allAccountsList.length}
                  </div>
                </div>

                {/* 1. اختيار الإدارة أولاً (Primary Department Selector) */}
                <div className="bg-gradient-to-r from-emerald-900 via-teal-950 to-neutral-900 text-white p-4 sm:p-5 rounded-2xl shadow-md border border-emerald-700/40">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm sm:text-base font-black text-white">اختر الإدارة أولاً:</h4>
                          <span className="text-[10px] font-bold text-emerald-200 bg-emerald-500/30 px-2 py-0.5 rounded-full border border-emerald-400/30">
                            قائمة الصلاحيات المنظمة حسب الإدارة
                          </span>
                        </div>
                        <p className="text-xs text-emerald-200/80 mt-1">
                          اختر الإدارة لعرض وتخصيص الصلاحيات والوظائف والكوادر المرتبطة بها مباشرة.
                        </p>
                      </div>
                    </div>

                    <div className="w-full md:w-80">
                      <select
                        value={permSelectedDeptFilter}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPermSelectedDeptFilter(val);
                          if (val !== 'all') {
                            setPermDepartmentId(val);
                            const deptAcc = allAccountsList.find(x => x.departmentId === val && x.type === 'director') ||
                              allAccountsList.find(x => x.departmentId === val);
                            if (deptAcc) {
                              handleSelectAccount(deptAcc);
                            }
                          }
                        }}
                        className="w-full border-2 border-emerald-400/60 rounded-xl p-3 text-xs font-bold text-white bg-neutral-900/90 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all cursor-pointer shadow-inner"
                      >
                        <option value="all" className="bg-neutral-900 text-white">📂 كافة الإدارات والمنظومة ({data.departments.length})</option>
                        {data.departments.map(d => (
                          <option key={d.id} value={d.id} className="bg-neutral-900 text-white">
                            🏢 {d.nameAr} ({d.id})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Category Filters */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold scrollbar-none">
                  {[
                    { id: 'all', label: 'جميع الحسابات والكوادر', count: allAccountsList.length },
                    { id: 'directors', label: 'مدراء الإدارات التنفيذية', count: allAccountsList.filter(x => x.type === 'director').length },
                    { id: 'warehouse', label: 'المستودع والمخزن', count: allAccountsList.filter(x => x.type === 'warehouse' || x.role === 'storekeeper' || x.departmentId === 'dep-8').length },
                    { id: 'employees', label: 'موظفو الإدارات والمنسقون', count: allAccountsList.filter(x => x.type === 'employee').length },
                    { id: 'leaders', label: 'قادة الفرق التطوعية', count: allAccountsList.filter(x => x.type === 'leader' || x.role === 'leader').length },
                    { id: 'volunteers', label: 'المتطوعون المسجلون', count: allAccountsList.filter(x => x.type === 'volunteer').length },
                  ].map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setPermFilterCategory(cat.id as any)}
                      className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                        permFilterCategory === cat.id
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      }`}
                    >
                      <span>{cat.label}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        permFilterCategory === cat.id ? 'bg-emerald-700 text-emerald-100' : 'bg-neutral-200 text-neutral-700'
                      }`}>
                        {cat.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    value={permSearchQuery}
                    onChange={(e) => setPermSearchQuery(e.target.value)}
                    placeholder="ابحث بالاسم، رقم الهوية الوطنية، رقم الجوال، المسمى الوظيفي، أو الإدارة..."
                    className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-neutral-200 text-xs bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <div className="absolute top-1/2 -translate-y-1/2 right-3 text-neutral-400">
                    <Search className="w-4 h-4" />
                  </div>
                </div>

                {/* Main 2-Column Interface */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Account Selector Cards */}
                  <div className="lg:col-span-4 border border-neutral-100 p-4 rounded-2xl bg-white space-y-3 max-h-[680px] flex flex-col">
                    <div className="flex items-center justify-between text-xs font-bold text-neutral-700 border-b border-neutral-100 pb-2">
                      <span>الحسابات المطابقة ({filteredAccounts.length})</span>
                      <span className="text-[10px] text-neutral-400">انقر لتعديل الصلاحيات</span>
                    </div>

                    <div className="overflow-y-auto space-y-2 flex-1 pr-1">
                      {filteredAccounts.map(acc => {
                        const isSelected = permSelectedAccount?.id === acc.id;
                        return (
                          <div
                            key={acc.id}
                            onClick={() => handleSelectAccount(acc)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer text-xs ${
                              isSelected
                                ? 'bg-emerald-50/80 border-emerald-500 shadow-sm'
                                : 'bg-neutral-50/60 border-neutral-200/80 hover:bg-neutral-100/80'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="font-bold text-neutral-800 text-xs truncate">{acc.name}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                acc.role === 'department_admin' 
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                  : acc.role === 'storekeeper'
                                  ? 'bg-orange-100 text-orange-800 border border-orange-200'
                                  : acc.role === 'employee'
                                  ? 'bg-teal-100 text-teal-800 border border-teal-200'
                                  : acc.role === 'leader'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-neutral-200 text-neutral-700'
                              }`}>
                                {acc.role === 'department_admin' ? 'مدير إدارة' : acc.role === 'storekeeper' ? 'أمين مستودع' : acc.role === 'employee' ? 'موظف إدارة' : acc.role === 'leader' ? 'قائد فريق' : 'متطوع'}
                              </span>
                            </div>

                            <div className="text-[11px] text-neutral-500 flex items-center justify-between">
                              <span className="truncate">{acc.departmentName || 'إدارة عامة'}</span>
                              <span className="font-mono text-neutral-400">{acc.nationalId || '---'}</span>
                            </div>

                            {acc.jobTitle && (
                              <div className="text-[10px] text-emerald-700 font-semibold mt-1">
                                {acc.jobTitle}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {filteredAccounts.length === 0 && (
                        <div className="text-center py-8 text-neutral-400 text-xs">
                          لا توجد حسابات مطابقة لبحثك.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Full RBAC Permissions Matrix */}
                  <div className="lg:col-span-8 border border-neutral-100 p-6 rounded-2xl bg-white space-y-6">
                    {!permSelectedAccount ? (
                      <div className="h-96 flex flex-col items-center justify-center text-center p-8 bg-neutral-50/50 rounded-2xl border border-dashed border-neutral-200">
                        <Users className="w-12 h-12 text-neutral-300 mb-3" />
                        <h4 className="text-sm font-bold text-neutral-700">لم يتم اختيار حساب بعد</h4>
                        <p className="text-xs text-neutral-400 mt-1 max-w-sm">
                          يرجى اختيار حساب من القائمة الجانبية لتعديل إدارته التابعة، مسماه الوظيفي، ومصفوفة الصلاحيات الممنوحة له.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6 animate-fade-in">
                        {/* Selected Account Header Card */}
                        <div className="bg-gradient-to-r from-emerald-900 to-teal-950 text-white p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="bg-amber-400 text-emerald-950 font-black px-2.5 py-0.5 rounded-full text-[10px]">
                                {permSelectedAccount.role === 'department_admin' ? 'مدير إدارة تنفيذي' : permSelectedAccount.role === 'storekeeper' ? 'أمين مستودع معتمد' : permSelectedAccount.role === 'employee' ? 'موظف إدارة' : 'متطوع'}
                              </span>
                              <span className="text-xs text-emerald-200 font-bold">{permSelectedAccount.departmentName}</span>
                            </div>
                            <h4 className="text-base font-black text-white mt-1">{permSelectedAccount.name}</h4>
                            <div className="text-[11px] text-emerald-200/80 font-mono mt-0.5">
                              رقم الهوية: {permSelectedAccount.nationalId} | الجوال: {permSelectedAccount.phone || 'غير مسجل'}
                            </div>
                          </div>

                          <div className="text-left sm:text-right">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              permStatus === 'active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            }`}>
                              {permStatus === 'active' ? '✓ حساب نشط ومفعل' : '⛔ حساب موقوف إدارياً'}
                            </span>
                          </div>
                        </div>

                        {/* Quick Presets */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-neutral-500">نماذج الصلاحيات السريعة (Quick Presets):</label>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => {
                                setPermRole('department_admin');
                                setPermList([
                                  'view_department', 'create_data', 'edit_data', 'delete_data', 'approve_data',
                                  'disburse_data', 'receive_data', 'print_data', 'export_pdf', 'export_excel',
                                  'manage_staff', 'manage_tasks', 'view_reports'
                                ]);
                                setPermAllowedPages(['inventory', 'volunteer_ops', 'requests', 'beneficiaries', 'hr_staff', 'finance_ledger', 'projects_list', 'media_news', 'directives', 'tasks', 'staff', 'letters']);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 font-bold cursor-pointer transition-all"
                            >
                              👑 صلاحيات مدير إدارة كاملة
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setPermRole('storekeeper');
                                setPermDepartmentId('dep-8');
                                setPermJobTitle('أمين مستودع معتمد');
                                setPermList(['view_department', 'create_data', 'edit_data', 'disburse_data', 'receive_data', 'print_data', 'view_reports', 'export_excel']);
                                setPermAllowedPages(['inventory', 'tasks', 'directives', 'letters']);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-orange-50 text-orange-800 border border-orange-200 hover:bg-orange-100 font-bold cursor-pointer transition-all"
                            >
                              📦 صلاحيات أمين مستودع (صرف واستلام وجرد)
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setPermRole('employee');
                                setPermList(['view_department', 'create_data', 'edit_data', 'print_data']);
                                setPermAllowedPages(['tasks', 'directives']);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 font-bold cursor-pointer transition-all"
                            >
                              ⚡ صلاحيات موظف عمليات وإدخال
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setPermRole('employee');
                                setPermList(['view_department', 'view_reports', 'print_data']);
                                setPermAllowedPages(['directives']);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 font-bold cursor-pointer transition-all"
                            >
                              👁️ صلاحيات استعراض وتقارير فقط
                            </button>
                          </div>
                        </div>

                        {/* Department Assignment & Job Title */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-neutral-100 pt-4">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-neutral-600">التبعية الإدارية (Department):</label>
                            <select
                              value={permDepartmentId}
                              onChange={(e) => setPermDepartmentId(e.target.value)}
                              className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs bg-white focus:ring-2 focus:ring-emerald-500/20"
                            >
                              {data.departments.map(d => (
                                <option key={d.id} value={d.id}>{d.nameAr} ({d.id})</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-neutral-600">المسمى الوظيفي المعتمد:</label>
                            <input
                              type="text"
                              value={permJobTitle}
                              onChange={(e) => setPermJobTitle(e.target.value)}
                              placeholder="مثال: مدير المخزن، أمين مستودع، أخصائي شؤون مستفيدين..."
                              className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs bg-white focus:ring-2 focus:ring-emerald-500/20"
                            />
                          </div>
                        </div>

                        {/* Role Tier & Status */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-neutral-600">المستوى الهيكلي (Role Tier):</label>
                            <select
                              value={permRole}
                              onChange={(e) => setPermRole(e.target.value)}
                              className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs bg-white focus:ring-2 focus:ring-emerald-500/20"
                            >
                              <option value="admin">مدير النظام العام (System Admin - كافة الصلاحيات)</option>
                              <option value="department_admin">مدير إدارة تنفيذي (كامل صلاحيات إدارته)</option>
                              <option value="storekeeper">أمين مستودع معتمد (إدارة المخزون والصرف والجرد)</option>
                              <option value="employee">موظف إدارة (صلاحيات مخصصة مقيدة)</option>
                              <option value="leader">قائد فريق تطوعي</option>
                              <option value="volunteer">متطوع معتمد</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-neutral-600">حالة الحساب الإداري:</label>
                            <select
                              value={permStatus}
                              onChange={(e) => setPermStatus(e.target.value as any)}
                              className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs bg-white focus:ring-2 focus:ring-emerald-500/20"
                            >
                              <option value="active">نشط ومفعل (Active)</option>
                              <option value="suspended">موقوف إدارياً (Suspended)</option>
                              <option value="inactive">غير مفعل / مؤقت (Inactive)</option>
                            </select>
                          </div>
                        </div>

                        {/* Dynamic Department Permissions Matrix Organized by Department */}
                        <div className="border-t border-neutral-100 pt-5">
                          <DepartmentPermissionsManager
                            selectedAccount={permSelectedAccount}
                            departments={data.departments}
                            currentRole={permRole}
                            currentDepartmentId={permDepartmentId}
                            selectedPermissions={permList}
                            onChangePermissions={(updated) => setPermList(updated)}
                            onChangeDepartment={(newDeptId) => setPermDepartmentId(newDeptId)}
                            onSave={handleSaveComprehensivePermissions}
                            isSaving={permIsSaving}
                            saveSuccess={permSuccess}
                            saveMessage={permSaveMessage}
                            isSuperAdmin={true}
                          />
                        </div>

                        {/* Allowed Workspaces & Pages */}
                        <div className="space-y-2 border-t border-neutral-100 pt-4">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-black text-neutral-700">مساحات العمل والصفحات المصرح بالدخول إليها (Allowed Workspaces):</label>
                            <span className="text-[10px] text-neutral-400">محدد: {permAllowedPages.length} مساحات</span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {[
                              { key: 'inventory', label: 'المخزن والمستودعات' },
                              { key: 'volunteer_ops', label: 'المبادرات والفرص التطوعية' },
                              { key: 'requests', label: 'طلبات التطوع والانضمام' },
                              { key: 'beneficiaries', label: 'شؤون المستفيدين والتوزيعات' },
                              { key: 'hr_staff', label: 'الموارد البشرية والكوادر' },
                              { key: 'finance_ledger', label: 'الإدارة المالية والمصروفات' },
                              { key: 'projects_list', label: 'المشاريع والبرامج التنموية' },
                              { key: 'media_news', label: 'المركز الإعلامي والأخبار' },
                              { key: 'directives', label: 'تكليفات مجلس الإدارة' },
                              { key: 'tasks', label: 'المهام والتكليفات التشغيلية' },
                              { key: 'letters', label: 'الخطابات والمراسلات الرسمية' },
                            ].map(ws => {
                              const checked = permAllowedPages.includes(ws.key);
                              return (
                                <label key={ws.key} className="flex items-center gap-2 p-2 rounded-xl border border-neutral-100 hover:bg-neutral-50 cursor-pointer text-xs select-none">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      if (checked) {
                                        setPermAllowedPages(permAllowedPages.filter(k => k !== ws.key));
                                      } else {
                                        setPermAllowedPages([...permAllowedPages, ws.key]);
                                      }
                                    }}
                                    className="rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
                                  />
                                  <span className="text-neutral-700 font-medium">{ws.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB 10: NOTIFICATIONS & MULTI-CHANNEL BROADCAST CENTER */}
          {activeSubTab === 'notifications' && (
            <NotificationSendPanel
              notifications={data.notifications || []}
              volunteers={data.volunteers || []}
              beneficiaries={data.beneficiaries || []}
              teams={data.teams || []}
              currentUserName="إدارة النظام"
              currentUserRole="admin"
              onSendNotification={async (payload) => {
                if (onSendCustomNotification) {
                  return await onSendCustomNotification(payload);
                }
                return false;
              }}
              onDeleteNotification={async (id) => {
                if (onDeleteNotification) {
                  return await onDeleteNotification(id);
                }
                return false;
              }}
              onResendNotification={async (id) => {
                if (onResendNotification) {
                  return await onResendNotification(id);
                }
                return false;
              }}
            />
          )}

          {/* TAB 11: INTERACTIVE LIVE LEADERBOARD */}
          {activeSubTab === 'leaderboard' && (() => {
            let filteredVols = [...(data.volunteers || [])];
            if (leaderboardDeptFilter) {
              filteredVols = filteredVols.filter(v => v.departmentId === leaderboardDeptFilter);
            }
            if (leaderboardTeamFilter) {
              filteredVols = filteredVols.filter(v => v.teamId === leaderboardTeamFilter);
            }
            const sortedLeaderboard = filteredVols.sort((a, b) => (b.points || 0) - (a.points || 0));
            
            const top1 = sortedLeaderboard[0];
            const top2 = sortedLeaderboard[1];
            const top3 = sortedLeaderboard[2];

            return (
              <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-md font-black text-neutral-800">لوحة الشرف والترتيب العام (Leaderboard)</h3>
                    <p className="text-xs text-neutral-500 mt-0.5">ترتيب وتصنيف المتطوعين وفقاً للنقاط التطوعية المعتمدة بالجمعية</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowKnightsModal(true)}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer select-none shadow-xs"
                    >
                      <Trophy className="w-3.5 h-3.5 text-amber-300" />
                      <span>عرض لوحة فرسان التطوع والفرق 🏆</span>
                    </button>

                    <button
                      onClick={() => {
                        window.print();
                      }}
                      className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer select-none"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>طباعة تقرير لوحة الشرف</span>
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 flex flex-wrap gap-4 items-center">
                  <span className="text-[10px] font-black text-neutral-500">خيارات التصفية السريعة:</span>
                  <div className="space-y-1">
                    <select
                      id="lead-dept-filter"
                      value={leaderboardDeptFilter}
                      onChange={(e) => {
                        setLeaderboardDeptFilter(e.target.value);
                        setLeaderboardTeamFilter("");
                      }}
                      className="border border-neutral-200 rounded-lg p-1.5 text-xs bg-white focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="">كافة الإدارات</option>
                      {data.departments.map(d => (
                        <option key={d.id} value={d.id}>{d.nameAr}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <select
                      id="lead-team-filter"
                      value={leaderboardTeamFilter}
                      onChange={(e) => setLeaderboardTeamFilter(e.target.value)}
                      disabled={!leaderboardDeptFilter}
                      className="border border-neutral-200 rounded-lg p-1.5 text-xs bg-white focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                    >
                      <option value="">كافة الفرق</option>
                      {data.teams.filter(t => t.departmentId === leaderboardDeptFilter).map(t => (
                        <option key={t.id} value={t.id}>{t.nameAr}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Podium Display */}
                {sortedLeaderboard.length >= 3 && (
                  <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto pt-6 pb-2 relative" dir="rtl">
                    {/* Position 2 (Silver) */}
                    {top2 && (
                      <div className="flex flex-col items-center justify-end text-center space-y-2 animate-fade-in">
                        <div className="relative">
                          <img src={top2.photo} alt={top2.name} className="w-14 h-14 rounded-full border-2 border-slate-300 object-cover shadow-md" referrerPolicy="no-referrer" />
                          <span className="absolute -top-2 -right-2 bg-slate-300 text-slate-800 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs border border-white">2</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-xs font-black block text-neutral-800 truncate max-w-[120px]">{top2.name}</span>
                          <span className="text-[10px] font-mono text-slate-600 block">{top2.points} نقطة</span>
                        </div>
                        <div className="bg-slate-100 border border-slate-200/50 w-full h-16 rounded-t-xl flex items-center justify-center font-mono font-black text-slate-500 text-lg">🥈</div>
                      </div>
                    )}

                    {/* Position 1 (Gold) */}
                    {top1 && (
                      <div className="flex flex-col items-center justify-end text-center space-y-2 animate-fade-in relative -top-4">
                        <div className="relative">
                          <img src={top1.photo} alt={top1.name} className="w-18 h-18 rounded-full border-4 border-amber-400 object-cover shadow-lg" referrerPolicy="no-referrer" />
                          <span className="absolute -top-2 -right-2 bg-amber-400 text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs border-2 border-white animate-bounce">1</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-xs font-black block text-emerald-800 truncate max-w-[140px]">{top1.name}</span>
                          <span className="text-[11px] font-mono font-black text-emerald-700 block">{top1.points} نقطة</span>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 w-full h-24 rounded-t-2xl flex flex-col items-center justify-center font-mono font-black text-amber-500 text-2xl shadow-xs">
                          <span>🏆</span>
                          <span className="text-[10px] text-amber-800 mt-1">المتصدر</span>
                        </div>
                      </div>
                    )}

                    {/* Position 3 (Bronze) */}
                    {top3 && (
                      <div className="flex flex-col items-center justify-end text-center space-y-2 animate-fade-in">
                        <div className="relative">
                          <img src={top3.photo} alt={top3.name} className="w-14 h-14 rounded-full border-2 border-amber-600 object-cover shadow-md" referrerPolicy="no-referrer" />
                          <span className="absolute -top-2 -right-2 bg-amber-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs border border-white">3</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-xs font-black block text-neutral-800 truncate max-w-[120px]">{top3.name}</span>
                          <span className="text-[10px] font-mono text-amber-800 block">{top3.points} نقطة</span>
                        </div>
                        <div className="bg-amber-100/45 border border-amber-200/20 w-full h-12 rounded-t-xl flex items-center justify-center font-mono font-black text-amber-700 text-lg">🥉</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Leaderboard Table List */}
                <div className="border border-neutral-100 rounded-2xl overflow-hidden shadow-2xs bg-white">
                  <div className="p-4 bg-neutral-50/50 border-b border-neutral-100 flex justify-between items-center text-xs font-black text-neutral-500">
                    <span>قائمة المتطوعين وفقاً للنقاط</span>
                    <span className="text-[10px] font-bold text-emerald-600">نشط: {sortedLeaderboard.length} متطوع</span>
                  </div>

                  <div className="divide-y divide-neutral-100 overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-neutral-50 text-neutral-500 font-bold">
                        <tr>
                          <th className="p-3">الترتيب</th>
                          <th className="p-3">الاسم والملف</th>
                          <th className="p-3">العضوية</th>
                          <th className="p-3">الفريق والمنطقة</th>
                          <th className="p-3">إجمالي النقاط</th>
                          <th className="p-3 text-center">شارة التميز</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {sortedLeaderboard.map((v, index) => {
                          const rank = index + 1;
                          const team = data.teams.find(t => t.id === v.teamId);
                          return (
                            <tr key={v.id} className="hover:bg-neutral-50/50 transition-all border-b border-neutral-100/50">
                              <td className="p-3 font-mono font-black text-neutral-600">
                                {rank === 1 ? "🥇 #1" : rank === 2 ? "🥈 #2" : rank === 3 ? "🥉 #3" : `#${rank}`}
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <img src={v.photo} alt={v.name} className="w-7 h-7 rounded-full object-cover border" referrerPolicy="no-referrer" />
                                  <span className="font-bold text-neutral-800">{v.name}</span>
                                </div>
                              </td>
                              <td className="p-3 font-mono text-neutral-500">{v.membershipNumber}</td>
                              <td className="p-3 text-neutral-600 font-medium">{team ? team.nameAr : "غير معين"}</td>
                              <td className="p-3 font-mono font-black text-emerald-600">{v.points} نقطة</td>
                              <td className="p-3 text-center">
                                {v.points >= 150 ? (
                                  <span className="bg-amber-100 text-amber-800 text-[9px] px-2 py-0.5 rounded-full font-bold border border-amber-200">الوسام الماسي</span>
                                ) : v.points >= 80 ? (
                                  <span className="bg-slate-100 text-slate-700 text-[9px] px-2 py-0.5 rounded-full font-bold border border-slate-200">العضوية الفضية</span>
                                ) : (
                                  <span className="bg-neutral-100 text-neutral-600 text-[9px] px-2 py-0.5 rounded-full font-bold">العضوية البرونزية</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {showKnightsModal && (
                  <VolunteerKnightsModal
                    volunteers={data.volunteers}
                    teams={data.teams}
                    initiatives={data.initiatives}
                    onClose={() => setShowKnightsModal(false)}
                  />
                )}
              </div>
            );
          })()}

          {/* TAB 12: ADVANCED SYSTEM-WIDE SEARCH */}
          {activeSubTab === 'globalsearch' && (() => {
            const q = globalSearchTerm.toLowerCase().trim();

            let matchedVols = data.volunteers || [];
            let matchedInits = data.initiatives || [];
            let matchedLogs = data.logs || [];

            // Apply global filters
            if (globalSearchDept) {
              matchedVols = matchedVols.filter(v => v.departmentId === globalSearchDept);
              matchedInits = matchedInits.filter(i => {
                const team = (data.teams || []).find(t => t.id === i.teamId);
                return team ? team.departmentId === globalSearchDept : false;
              });
            }
            if (globalSearchTeam) {
              matchedVols = matchedVols.filter(v => v.teamId === globalSearchTeam);
              matchedInits = matchedInits.filter(i => i.teamId === globalSearchTeam);
            }
            if (globalSearchStatus) {
              matchedVols = matchedVols.filter(v => v.status === globalSearchStatus);
            }
            if (globalSearchMinPoints) {
              matchedVols = matchedVols.filter(v => (v.points || 0) >= Number(globalSearchMinPoints));
            }
            if (globalSearchMaxPoints) {
              matchedVols = matchedVols.filter(v => (v.points || 0) <= Number(globalSearchMaxPoints));
            }

            // Apply text query
            if (q) {
              matchedVols = matchedVols.filter(v => 
                (v.name || '').toLowerCase().includes(q) || 
                (v.membershipNumber || '').includes(q) || 
                (v.phone || '').includes(q) || 
                ((v.email || '').toLowerCase().includes(q))
              );
              matchedInits = matchedInits.filter(i => 
                (i.name || '').toLowerCase().includes(q) || 
                ((i.nameEn || '').toLowerCase().includes(q)) || 
                ((i.details || '').toLowerCase().includes(q))
              );
              matchedLogs = matchedLogs.filter(l => 
                (l.action || '').toLowerCase().includes(q) || 
                (l.user || '').toLowerCase().includes(q)
              );
            }

            const totalMatches = (matchedVols?.length || 0) + (matchedInits?.length || 0) + (matchedLogs?.length || 0);

            return (
              <div className="space-y-6 animate-fade-in text-right">
                <div>
                  <h3 className="text-md font-black text-neutral-800">محرك البحث المتقدم الشامل</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">البحث الفوري المتزامن عبر كافة السجلات والملفات والمبادرات وسجلات التدقيق والعمليات</p>
                </div>

                {/* Filters Panel */}
                <div className="border border-neutral-100 p-5 rounded-2xl bg-white space-y-4">
                  <div className="relative">
                    <Search className="w-5 h-5 absolute right-3.5 top-3.5 text-neutral-400" />
                    <input
                      id="global-search-input"
                      type="text"
                      placeholder="ابحث بالاسم، رقم العضوية، الهاتف، البريد، أو تفاصيل المبادرة..."
                      value={globalSearchTerm}
                      onChange={(e) => setGlobalSearchTerm(e.target.value)}
                      className="w-full border border-neutral-200 rounded-xl pr-10 pl-4 py-3 text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-400">تصفية حسب الإدارة:</label>
                      <select
                        id="global-search-dept"
                        value={globalSearchDept}
                        onChange={(e) => {
                          setGlobalSearchDept(e.target.value);
                          setGlobalSearchTeam("");
                        }}
                        className="w-full border border-neutral-200 rounded-lg p-2 text-xs bg-white focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value="">جميع الإدارات</option>
                        {data.departments.map(d => (
                          <option key={d.id} value={d.id}>{d.nameAr}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-400">تصفية حسب الفريق:</label>
                      <select
                        id="global-search-team"
                        value={globalSearchTeam}
                        onChange={(e) => setGlobalSearchTeam(e.target.value)}
                        disabled={!globalSearchDept}
                        className="w-full border border-neutral-200 rounded-lg p-2 text-xs bg-white focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                      >
                        <option value="">جميع الفرق</option>
                        {data.teams.filter(t => t.departmentId === globalSearchDept).map(t => (
                          <option key={t.id} value={t.id}>{t.nameAr}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-400">حالة بطاقة المتطوع:</label>
                      <select
                        id="global-search-status"
                        value={globalSearchStatus}
                        onChange={(e) => setGlobalSearchStatus(e.target.value)}
                        className="w-full border border-neutral-200 rounded-lg p-2 text-xs bg-white focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value="">جميع الحالات</option>
                        <option value="active">نشطة (Active)</option>
                        <option value="suspended">موقوفة (Suspended)</option>
                        <option value="inactive">غير نشطة (Inactive)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-400">نطاق النقاط (الحد الأدنى):</label>
                      <input
                        id="global-search-min-points"
                        type="number"
                        placeholder="مثال: 50"
                        value={globalSearchMinPoints}
                        onChange={(e) => setGlobalSearchMinPoints(e.target.value)}
                        className="w-full border border-neutral-200 rounded-lg p-2 text-xs bg-white focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Results Section */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between text-xs font-bold text-neutral-500 border-b border-neutral-100 pb-2">
                    <span>نتائج المطابقة والفرز الذكي:</span>
                    <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-mono">العثور على {totalMatches} نتيجة</span>
                  </div>

                  {totalMatches === 0 ? (
                    <div className="text-center py-12 text-xs text-neutral-400 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
                      لا توجد تطابقات لخيارات البحث المحددة. يرجى تعديل الكلمات الدلالية أو الفلاتر.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Matched Volunteers */}
                      {matchedVols.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-black text-neutral-800 flex items-center gap-1">
                            <Users className="w-4 h-4 text-emerald-600" />
                            <span>المتطوعين ({matchedVols.length})</span>
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {matchedVols.slice(0, 10).map(v => (
                              <div key={v.id} className="border border-neutral-100 p-3.5 rounded-xl flex items-center justify-between hover:bg-neutral-50 transition-all bg-white shadow-2xs">
                                <div className="flex items-center gap-3">
                                  <img src={v.photo} alt={v.name} className="w-10 h-10 rounded-full object-cover border" referrerPolicy="no-referrer" />
                                  <div className="space-y-0.5 text-right">
                                    <div className="font-bold text-neutral-800 text-xs">{v.name}</div>
                                    <div className="text-[10px] text-neutral-400">عضوية: {v.membershipNumber} • نقاط: {v.points}</div>
                                  </div>
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${v.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                                  {v.status === 'active' ? 'نشط' : 'موقوف'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Matched Initiatives */}
                      {matchedInits.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-black text-neutral-800 flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-emerald-600" />
                            <span>المبادرات ({matchedInits.length})</span>
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {matchedInits.slice(0, 10).map(i => (
                              <div key={i.id} className="border border-neutral-100 p-3.5 rounded-xl space-y-2 hover:bg-neutral-50 transition-all bg-white shadow-2xs">
                                <div className="flex justify-between items-start">
                                  <h5 className="font-bold text-neutral-800 text-xs">{i.name}</h5>
                                  <span className="bg-emerald-50 text-emerald-700 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">{i.pointsGained} نقطة</span>
                                </div>
                                <p className="text-[10px] text-neutral-500 line-clamp-2">{i.details}</p>
                                <div className="text-[9.5px] text-neutral-400 flex justify-between">
                                  <span>التاريخ: {i.startDate}</span>
                                  <span>المستهدف: {i.targetVolunteers} متطوع</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Matched Logs */}
                      {matchedLogs.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-black text-neutral-800 flex items-center gap-1">
                            <FileText className="w-4 h-4 text-emerald-600" />
                            <span>سجل العمليات والتدقيق ({matchedLogs.length})</span>
                          </h4>
                          <div className="divide-y divide-neutral-100 border border-neutral-100 rounded-xl overflow-hidden bg-white">
                            {matchedLogs.slice(0, 8).map(log => (
                              <div key={log.id} className="p-3 text-[11px] hover:bg-neutral-50/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-right">
                                <div className="space-y-1 text-right">
                                  <span className="font-bold text-neutral-800 block">{log.action}</span>
                                  <span className="text-[9.5px] text-neutral-400">المنفذ: {log.user} • {log.timestamp}</span>
                                </div>
                                <span className="bg-neutral-50 text-neutral-500 border border-neutral-200/50 rounded font-mono text-[9px] px-1.5 py-0.5 self-start sm:self-center">IP: {log.ip}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
          
          {/* TAB: BENEFICIARIES & SOCIAL CARE MANAGEMENT WITH EXPORT */}
          {activeSubTab === 'beneficiaries' && (
            <BeneficiariesManager
              beneficiaries={data.beneficiaries || []}
              onUpdateBeneficiaryStatus={onUpdateBeneficiaryStatus || (async () => false)}
              homeSettings={data.homeSettings}
              lang={lang}
              currentUserRole="admin"
              currentUserName="المدير العام للجمعية"
              onAddNewBeneficiary={onAddBeneficiary}
              onImportBeneficiaries={onImportBeneficiaries}
              onNavigateToDistributions={() => setActiveSubTab('distributions')}
              activeDistributionsCount={(data.distributions || []).filter(d => d.status === 'active').length}
            />
          )}

          {/* TAB: AID DISTRIBUTIONS & BARCODE MANAGEMENT */}
          {activeSubTab === 'distributions' && (
            <DistributionsManager
              distributions={data.distributions || []}
              beneficiaries={data.beneficiaries || []}
              handoverRecords={data.distributionHandovers || []}
              homeSettings={data.homeSettings}
              currentUser={{
                id: "admin",
                name: "المدير العام للجمعية",
                role: "admin"
              }}
              onCreateDistribution={onCreateDistribution || (async () => false)}
              onUpdateDistribution={onUpdateDistribution || (async () => false)}
              onDeleteDistribution={onDeleteDistribution || (async () => false)}
              onHandoverSubmit={onHandoverSubmit || (async () => ({ success: false }))}
              onCancelHandover={onCancelHandover || (async () => false)}
              lang={lang}
            />
          )}

          {/* TAB: BENEFICIARY AID RATINGS & SATISFACTION */}
          {activeSubTab === 'beneficiary_ratings' && (
            <BeneficiaryRatingsManager
              ratings={data.beneficiaryRatings || []}
              homeSettings={data.homeSettings}
              lang={lang}
            />
          )}

          {/* TAB 13: HOMEPAGE & BENEFICIARIES CONTENT MANAGER */}
          {activeSubTab === 'homepage' && (
            <HomepageAdminPanel
              settings={data.homeSettings || {
                logoUrl: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=120&h=120&fit=crop",
                videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-hand-holding-a-growing-sprout-42234-large.mp4",
                videoCoverUrl: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1600&h=900&fit=crop",
                associationNameAr: "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة",
                associationNameEn: "Reyadat Al-Ata Association",
                licenseNumber: "100088868",
                heroTitleAr: "ريادةٌ في العطاء.. وخدمةٌ للإنسان",
                heroTitleEn: "Leadership in Giving",
                heroDescAr: "نسعى لتقديم الخدمات التنموية والخيرية المبتكرة والمستدامة لتأهيل وتنمية المجتمع بمخطط العسيلة المكي",
                heroDescEn: "We strive to provide innovative and sustainable developmental and charitable services",
                aboutUsAr: "تأسست جمعية ريادة العطاء لخدمة الإنسان بالعسيلة لتباشر مسؤوليتها المجتمعية والخيرية",
                aboutUsEn: "Established to carry out community and charitable responsibility",
                visionAr: "الريادة في تمكين العمل الخيري والتطوعي وخدمة ضيوف الرحمن وأهالي العسيلة بجودة وتميز",
                visionEn: "Leadership in charity",
                missionAr: "تقديم خدمات إنسانية وتنموية ومبادرات تطوعية مبتكرة تسهم في سد الاحتياجات وبناء القدرات",
                missionEn: "Providing innovative humanitarian and developmental services",
                goalsAr: [],
                goalsEn: [],
                valuesAr: [],
                valuesEn: [],
                donationLink: "https://store.riadataleata.org.sa",
                contactPhone: "0550123456",
                contactEmail: "info@riadataleata.org.sa",
                contactLocationAr: "مكة المكرمة - مخطط العسيلة",
                contactLocationEn: "Mecca - Al-Asilah Scheme",
                contactHoursAr: "الأحد - الخميس",
                contactHoursEn: "Sunday - Thursday",
                themePrimary: "#059669",
                themeSecondary: "#0d9488",
                fontFamily: "Inter",
                sectionVisibility: {
                  about: true,
                  stats: true,
                  initiatives: true,
                  news: true,
                  achievements: true,
                  partners: true,
                  gallery: true,
                  contact: true
                }
              }}
              news={data.news || []}
              partners={data.partners || []}
              gallery={data.gallery || []}
              beneficiaries={data.beneficiaries || []}
              benefitRequests={data.benefitRequests || []}
              orgMembers={data.orgMembers || data.homeSettings?.orgMembers || []}
              heroSlides={data.heroSlides || data.homeSettings?.heroSlides || []}
              onUpdateSettings={onUpdateHomeSettings || (async () => false)}
              onAddNews={onAddNewsItem || (async () => false)}
              onDeleteNews={onDeleteNewsItem || (async () => false)}
              onAddPartner={onAddPartnerItem || (async () => false)}
              onDeletePartner={onDeletePartnerItem || (async () => false)}
              onBatchUpdatePartners={onBatchUpdatePartners}
              onAddGallery={onAddGalleryItem || (async () => false)}
              onDeleteGallery={onDeleteGalleryItem || (async () => false)}
              onUpdateBeneficiaryStatus={onUpdateBeneficiaryStatus || (async () => false)}
              onUpdateBenefitRequestStatus={onUpdateBenefitRequestStatus || (async () => false)}
              onAddOrgMember={onAddOrgMember}
              onDeleteOrgMember={onDeleteOrgMember}
              onToggleOrgMemberActive={onToggleOrgMemberActive}
              onBatchUpdateOrgMembers={onBatchUpdateOrgMembers}
              onImportDirectors={onImportDirectors}
              onAddHeroSlide={onAddHeroSlide}
              onDeleteHeroSlide={onDeleteHeroSlide}
              onToggleSlideActive={onToggleSlideActive}
              onBatchUpdateHeroSlides={onBatchUpdateHeroSlides}
              lang={lang}
              currentUserRole="admin"
              currentUserName="المدير العام للجمعية"
              onAddNewBeneficiary={onAddBeneficiary}
            />
          )}

          {/* TAB: ORG CHART (الهيكل الإداري) */}
          {activeSubTab === 'org_chart' && (
            <OrgChartAdminPanel
              members={data.orgMembers || data.homeSettings?.orgMembers || []}
              onAddMember={onAddOrgMember || (async () => false)}
              onDeleteMember={onDeleteOrgMember || (async () => false)}
              onToggleMemberActive={onToggleOrgMemberActive || (async () => false)}
              onBatchUpdateMembers={onBatchUpdateOrgMembers || (async () => false)}
              onImportDirectors={onImportDirectors}
              lang={lang}
            />
          )}

          {/* TAB: HERO SLIDES (معرض صور الصفحة الرئيسية) */}
          {activeSubTab === 'hero_slides' && (
            <HeroSlidesAdminPanel
              slides={data.heroSlides || data.homeSettings?.heroSlides || []}
              onAddSlide={onAddHeroSlide || (async () => false)}
              onDeleteSlide={onDeleteHeroSlide || (async () => false)}
              onToggleSlideActive={onToggleSlideActive || (async () => false)}
              onBatchUpdateSlides={onBatchUpdateHeroSlides || (async () => false)}
              lang={lang}
            />
          )}
          
          {/* TAB 8: DATABASE BACKUP / RESTORE */}
          {activeSubTab === 'backup' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-md font-black text-neutral-800">إدارة قاعدة البيانات والنسخ الاحتياطي التلقائي</h3>
                <p className="text-xs text-neutral-500 mt-0.5">تنفيذ أعمال الصيانة، النسخ الاحتياطي الفوري، واستعادة السجلات بنقرة واحدة</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Backup export card */}
                <div className="border border-neutral-100 p-5 rounded-2xl space-y-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <FileDown className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-neutral-800">تصدير النسخة الاحتياطية (Backup JSON)</h4>
                    <p className="text-[11px] text-neutral-500 mt-1">تنزيل ملف النسخة الاحتياطية الكاملة لكافة الإدارات والفرق والمتطوعين وسجل الحضور والتقييمات للكمبيوتر كملف JSON آمن ومحمي.</p>
                  </div>
                  <button
                    id="btn-backup-download"
                    onClick={handleTriggerBackupDownload}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl cursor-pointer flex items-center gap-1.5 transition-all"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>تنزيل ملف النسخة الاحتياطية</span>
                  </button>
                </div>

                {/* Restore database file pick */}
                <div className="border border-neutral-100 p-5 rounded-2xl space-y-4">
                  <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-neutral-800">استعادة قاعدة البيانات المرفوعة</h4>
                    <p className="text-[11px] text-neutral-500 mt-1">قم باختيار ملف JSON للنسخة الاحتياطية المسبقة لرفعها واستبدال قاعدة البيانات الفعالة الحالية بالنظام فوراً.</p>
                  </div>
                  <label className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-2.5 px-4 rounded-xl cursor-pointer transition-all">
                    <Database className="w-4 h-4" />
                    <span>اختر ملف واسترجع الآن</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleTriggerRestoreUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Reset to initial seed state */}
              <div className="border border-rose-100 bg-rose-50/20 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-rose-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>منطقة الخطر: إعادة تعيين قاعدة البيانات</span>
                  </h4>
                  <p className="text-[11px] text-rose-600">سيؤدي هذا الإجراء لحذف كافة التعديلات، المتطوعين الجدد، وسجلات الحضور والتقييمات، وإعادة تهيئة السجلات إلى الحالة الافتراضية للجمعية.</p>
                </div>
                <button
                  id="btn-reset-db-trigger"
                  onClick={() => {
                    if (confirm("هل أنت متأكد تماماً من رغبتك بمسح وإعادة تعيين كافة السجلات بالنظام؟")) {
                      onResetDb();
                      alert(lang === 'ar' ? "تمت إعادة تهيئة قاعدة البيانات بنجاح ✓" : "Database reset successfully ✓");
                    }
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer shrink-0"
                >
                  إعادة تهيئة النظام الافتراضي
                </button>
              </div>
            </div>
          )}

          {/* Enterprise Comprehensive Financial Management System Subtab */}
          {activeSubTab === 'enterprise_finance' && (
            <FinancialManagement
              currentUser={{
                id: 'admin-current',
                name: 'المدير التنفيذي',
                role: 'مدير عام الجمعية'
              }}
            />
          )}

          {/* Store & Financial Linkage Subtab */}
          {activeSubTab === 'store_finance' && (
            <FinancialProjectsManager
              projects={data.storeProjects || []}
              donations={data.storeDonations || []}
              transactions={data.financialTransactions || []}
              onAddExpense={onAddExpense || (async () => false)}
              onAddProject={onAddProject || (async () => false)}
              isDark={isDark}
            />
          )}

          {/* Fallback for Unrecognized / Unmapped Subtabs to prevent white screen */}
          {![
            'letters', 'inventory', 'custody', 'email_settings', 'system_settings', 'chat',
            'support', 'volunteer_mgmt_dashboard', 'opp_requests', 'team_join_requests',
            'joinrequests', 'stats', 'deps', 'hr_dashboard', 'employee_requests', 'teams',
            'vols', 'cards', 'init', 'logs', 'permissions', 'notifications', 'leaderboard',
            'globalsearch', 'beneficiaries', 'distributions', 'beneficiary_ratings', 'homepage',
            'org_chart', 'hero_slides', 'backup', 'enterprise_finance', 'store_finance'
          ].includes(activeSubTab) && (
            <AccessDeniedCard
              pageTitle={getActiveTabTitle(activeSubTab)}
              allowedPages={[
                { id: 'enterprise_finance', label: 'الإدارة المالية الشاملة' },
                { id: 'deps', label: 'هيكلة الإدارات والتكليفات' },
                { id: 'permissions', label: 'إدارة الصلاحيات والمستخدمين' },
                { id: 'beneficiaries', label: 'إدارة المستفيدين' }
              ]}
              onNavigateToAllowed={(pageId) => setActiveSubTab(pageId as any)}
              onGoBack={() => setActiveSubTab('enterprise_finance')}
            />
          )}
          </DashboardErrorBoundary>
        </div>
      </div>

      {/* MODALS */}

      {/* Department Modal */}
      {showDepModal && editingDep && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <form 
            onSubmit={handleSaveDepartment}
            className="bg-white rounded-2xl max-w-md w-full p-6 text-right space-y-4 border border-neutral-100 shadow-xl"
            dir="rtl"
          >
            <h3 className="text-md font-black text-neutral-800">{editingDep.id ? "تعديل بيانات الإدارة" : "إضافة إدارة جديدة"}</h3>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400">اسم الإدارة بالعربية:</label>
                <input
                  id="modal-dep-name-ar"
                  type="text"
                  required
                  value={editingDep.nameAr}
                  onChange={(e) => setEditingDep({ ...editingDep, nameAr: e.target.value })}
                  className="w-full border border-neutral-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400">اسم الإدارة بالإنجليزية:</label>
                <input
                  id="modal-dep-name-en"
                  type="text"
                  required
                  value={editingDep.nameEn}
                  onChange={(e) => setEditingDep({ ...editingDep, nameEn: e.target.value })}
                  className="w-full border border-neutral-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400">اسم مدير الإدارة المسؤول:</label>
                <input
                  id="modal-dep-director"
                  type="text"
                  required
                  value={editingDep.directorName}
                  onChange={(e) => setEditingDep({ ...editingDep, directorName: e.target.value })}
                  className="w-full border border-neutral-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-emerald-900">رقم الهوية الوطنية / اسم المستخدم:</label>
                  <input
                    id="modal-dep-nationalid"
                    type="text"
                    required
                    value={editingDep.nationalId || ''}
                    onChange={(e) => setEditingDep({ ...editingDep, nationalId: e.target.value })}
                    placeholder="101000000X"
                    className="w-full border border-emerald-200 rounded-lg p-2 text-xs font-mono font-bold bg-white focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-emerald-900">كلمة المرور:</label>
                  <input
                    id="modal-dep-password"
                    type="text"
                    required
                    value={editingDep.password || ''}
                    onChange={(e) => setEditingDep({ ...editingDep, password: e.target.value })}
                    placeholder="123"
                    className="w-full border border-emerald-200 rounded-lg p-2 text-xs font-mono font-bold bg-white focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400">رقم الجوال:</label>
                  <input
                    type="text"
                    value={editingDep.phone || ''}
                    onChange={(e) => setEditingDep({ ...editingDep, phone: e.target.value })}
                    placeholder="0500000000"
                    className="w-full border border-neutral-200 rounded-lg p-2 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400">البريد الإلكتروني الرسمي:</label>
                  <input
                    type="email"
                    value={editingDep.email || ''}
                    onChange={(e) => setEditingDep({ ...editingDep, email: e.target.value })}
                    placeholder="dept@reyada.sa"
                    className="w-full border border-neutral-200 rounded-lg p-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400">الوصف التعريفي للنشاط:</label>
                <textarea
                  id="modal-dep-description"
                  value={editingDep.descriptionAr || ""}
                  onChange={(e) => setEditingDep({ ...editingDep, descriptionAr: e.target.value })}
                  className="w-full border border-neutral-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500/20 h-16 resize-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400">المهام والتكليفات الإدارية (مهمة واحدة في كل سطر):</label>
                <textarea
                  id="modal-dep-tasks"
                  value={(editingDep.tasks || []).join("\n")}
                  onChange={(e) => {
                    const taskList = e.target.value.split("\n").filter(t => t.trim().length > 0);
                    setEditingDep({ ...editingDep, tasks: taskList });
                  }}
                  placeholder="مثال:&#10;تنفيذ قرارات مجلس الإدارة.&#10;إعداد الخطط التشغيلية ومتابعة تنفيذها."
                  className="w-full border border-neutral-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500/20 h-28 resize-none font-sans"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-3">
              <button
                id="modal-dep-submit"
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-lg cursor-pointer"
              >
                حفظ التعديلات
              </button>
              <button
                type="button"
                onClick={() => setShowDepModal(false)}
                className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs py-2 rounded-lg cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Board Directive Modal */}
      {showDirectiveModal && editingDirective && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <form 
            onSubmit={handleSaveDirective}
            className="bg-white rounded-2xl max-w-lg w-full p-6 text-right space-y-4 border border-neutral-100 shadow-xl"
            dir="rtl"
          >
            <div className="flex items-center gap-2 text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-100">
              <Shield className="w-5 h-5" />
              <h3 className="text-sm font-black">{editingDirective.id ? "تعديل توجيه مجلس الإدارة" : "إصدار تكليف جديد من مجلس الإدارة"}</h3>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-700">الإدارة التنفيذية المكلفة:</label>
                <select
                  required
                  value={editingDirective.departmentId || ''}
                  onChange={(e) => setEditingDirective({ ...editingDirective, departmentId: e.target.value })}
                  className="w-full border border-neutral-200 rounded-lg p-2.5 text-xs font-bold focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">اختر الإدارة الموجه لها التكليف...</option>
                  {data.departments.map(d => (
                    <option key={d.id} value={d.id}>{d.nameAr} ({d.directorName})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-700">عنوان التكليف / القرار الإداري:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: إعداد الخطة التشغيلية الربع سنوية وحصر الفرص"
                  value={editingDirective.title || ''}
                  onChange={(e) => setEditingDirective({ ...editingDirective, title: e.target.value })}
                  className="w-full border border-neutral-200 rounded-lg p-2.5 text-xs font-bold focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-700">تفاصيل وشروط التكليف المكتوبة:</label>
                <textarea
                  required
                  placeholder="اكتب التوجيهات والقرارات المطلوب تنفيذها بالتفصيل..."
                  value={editingDirective.description || ''}
                  onChange={(e) => setEditingDirective({ ...editingDirective, description: e.target.value })}
                  className="w-full border border-neutral-200 rounded-lg p-2.5 text-xs h-24 resize-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-700">مستوى الأهمية والولاء:</label>
                  <select
                    value={editingDirective.priority || 'high'}
                    onChange={(e) => setEditingDirective({ ...editingDirective, priority: e.target.value as any })}
                    className="w-full border border-neutral-200 rounded-lg p-2 text-xs font-bold"
                  >
                    <option value="urgent">عاجل وطارئ جداً 🔥</option>
                    <option value="high">مرتفع الأهمية ⚡</option>
                    <option value="medium">متوسط 📌</option>
                    <option value="low">عادي 📝</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-700">تاريخ الاستحقاق الإنجاز:</label>
                  <input
                    type="date"
                    required
                    value={editingDirective.dueDate || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setEditingDirective({ ...editingDirective, dueDate: e.target.value })}
                    className="w-full border border-neutral-200 rounded-lg p-2 text-xs font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-neutral-100">
              <button
                type="submit"
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer shadow-xs"
              >
                إرسال التكليف فوراً
              </button>
              <button
                type="button"
                onClick={() => setShowDirectiveModal(false)}
                className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs py-2.5 rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Team Modal */}
      {showTeamModal && editingTeam && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <form 
            onSubmit={handleSaveTeam}
            className="bg-white rounded-2xl max-w-md w-full p-6 text-right space-y-4 border border-neutral-100 shadow-xl"
            dir="rtl"
          >
            <h3 className="text-md font-black text-neutral-800">{editingTeam.id ? "تعديل الفريق التطوعي" : "إنشاء فريق تطوعي جديد"}</h3>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400">اسم الفريق بالعربية:</label>
                <input
                  id="modal-team-name-ar"
                  type="text"
                  required
                  value={editingTeam.nameAr}
                  onChange={(e) => setEditingTeam({ ...editingTeam, nameAr: e.target.value })}
                  className="w-full border border-neutral-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400">اسم الفريق بالإنجليزية:</label>
                <input
                  id="modal-team-name-en"
                  type="text"
                  required
                  value={editingTeam.nameEn}
                  onChange={(e) => setEditingTeam({ ...editingTeam, nameEn: e.target.value })}
                  className="w-full border border-neutral-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400">الإدارة التابع لها الفريق:</label>
                <select
                  id="modal-team-dep"
                  value={editingTeam.departmentId}
                  onChange={(e) => setEditingTeam({ ...editingTeam, departmentId: e.target.value })}
                  className="w-full border border-neutral-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500/20"
                >
                  {data.departments.map(d => (
                    <option key={d.id} value={d.id}>{d.nameAr}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400">اسم قائد الفريق المسؤول:</label>
                <input
                  id="modal-team-leader"
                  type="text"
                  required
                  value={editingTeam.leaderName}
                  onChange={(e) => setEditingTeam({ ...editingTeam, leaderName: e.target.value })}
                  className="w-full border border-neutral-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Team Card Template Settings Section */}
              <div className="pt-3 border-t border-neutral-150 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-emerald-800">🎴 تخصيص قالب بطاقة المتطوعين للفريق:</h4>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-500">طابع ولون قالب البطاقة الرقمية:</label>
                  <select
                    value={editingTeam.cardTemplateBg || 'emerald-gold'}
                    onChange={(e) => setEditingTeam({ ...editingTeam, cardTemplateBg: e.target.value })}
                    className="w-full border border-neutral-200 rounded-lg p-2 text-xs font-bold focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="emerald-gold">النموذج القياسي الملكي (زمردي وذهبي)</option>
                    <option value="royal-blue">طابع التميز والتنفيذ (أزرق كحلي ملكي)</option>
                    <option value="deep-purple">طابع الابتكار والإعلام (بنفسجي فاخر)</option>
                    <option value="ruby-crimson">طابع الإسعاف والطوارئ (ياقوتي داكن)</option>
                    <option value="slate-dark">طابع الخبرة والتخصص (رمادي فحمي)</option>
                    <option value="custom-bg">صورة خلفية مخصصة للبطاقة</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-500">عنوان شعار البطاقة الفرعي:</label>
                  <input
                    type="text"
                    placeholder="مثال: بطاقة متطوع - فريق الإعلام"
                    value={editingTeam.cardBadgeTitle || ''}
                    onChange={(e) => setEditingTeam({ ...editingTeam, cardBadgeTitle: e.target.value })}
                    className="w-full border border-neutral-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500/20 font-bold"
                  />
                </div>

                <ImagePickerControl
                  label="شعار الفريق المخصص (اللوجو)"
                  description="يظهر أعلى بطاقة المتطوع التابع لهذا الفريق"
                  value={editingTeam.logoUrl || ''}
                  onChange={(val) => setEditingTeam({ ...editingTeam, logoUrl: val })}
                  aspectRatio="logo"
                />

                {editingTeam.cardTemplateBg === 'custom-bg' && (
                  <ImagePickerControl
                    label="صورة خلفية قالب البطاقة المخصصة"
                    description="صورة خلفية بديلة لقالب البطاقة الذكية"
                    value={editingTeam.cardBgImageUrl || ''}
                    onChange={(val) => setEditingTeam({ ...editingTeam, cardBgImageUrl: val })}
                    aspectRatio="banner"
                  />
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-3">
              <button
                id="modal-team-submit"
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-lg cursor-pointer"
              >
                حفظ الفريق
              </button>
              <button
                type="button"
                onClick={() => setShowTeamModal(false)}
                className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs py-2 rounded-lg cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Volunteer Modal */}
      {showVolModal && editingVol && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <form 
            onSubmit={handleSaveVolunteer}
            className="bg-white rounded-2xl max-w-md w-full p-6 text-right space-y-4 border border-neutral-100 shadow-xl"
            dir="rtl"
          >
            <h3 className="text-md font-black text-neutral-800">{editingVol.id ? "تعديل ملف المتطوع" : "تسجيل متطوع جديد"}</h3>
            
            <div className="space-y-3 overflow-y-auto max-h-[380px] p-1">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400">الاسم الكامل للمتطوع:</label>
                <input
                  id="modal-vol-name"
                  type="text"
                  required
                  value={editingVol.name}
                  onChange={(e) => setEditingVol({ ...editingVol, name: e.target.value })}
                  className="w-full border border-neutral-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400">البريد الإلكتروني:</label>
                <input
                  id="modal-vol-email"
                  type="email"
                  value={editingVol.email}
                  onChange={(e) => setEditingVol({ ...editingVol, email: e.target.value })}
                  className="w-full border border-neutral-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400">رقم الجوال:</label>
                <input
                  id="modal-vol-phone"
                  type="text"
                  required
                  value={editingVol.phone}
                  onChange={(e) => setEditingVol({ ...editingVol, phone: e.target.value })}
                  className="w-full border border-neutral-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400">الفريق المعين له:</label>
                <select
                  id="modal-vol-team"
                  value={editingVol.teamId}
                  onChange={(e) => {
                    const selectedTeam = data.teams.find(t => t.id === e.target.value);
                    setEditingVol({ 
                      ...editingVol, 
                      teamId: e.target.value,
                      departmentId: selectedTeam ? selectedTeam.departmentId : ""
                    });
                  }}
                  className="w-full border border-neutral-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500/20"
                >
                  {data.teams.map(t => (
                    <option key={t.id} value={t.id}>{t.nameAr}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400">المسمى التطوعي (عربي):</label>
                <input
                  id="modal-vol-title-ar"
                  type="text"
                  value={editingVol.titleAr}
                  onChange={(e) => setEditingVol({ ...editingVol, titleAr: e.target.value })}
                  className="w-full border border-neutral-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400">الجنس والبطاقة:</label>
                <select
                  value={editingVol.gender || 'male'}
                  onChange={(e) => {
                    const genderVal = e.target.value as 'male' | 'female';
                    setEditingVol({ 
                      ...editingVol, 
                      gender: genderVal,
                      photo: genderVal === 'female' ? 'female_unified' : editingVol.photo
                    });
                  }}
                  className="w-full border border-neutral-200 rounded-lg p-2 text-xs font-bold focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="male">ذكر (رفع صورة شخصية خاضعة للبطاقة)</option>
                  <option value="female">أنثى (اعتماد الصورة الموحدة لحفظ الخصوصية)</option>
                </select>
              </div>

              {editingVol.gender !== 'female' && (
                <ImageUploadField
                  label="الصورة الشخصية للمتطوع (رفع ملف مباشر)"
                  description="الصورة ستظهر على بطاقة المتطوع الرقمية وسجله الرسمي"
                  value={editingVol.photo || ""}
                  onChange={(val) => setEditingVol({ ...editingVol, photo: val })}
                  previewAspect="square"
                />
              )}
            </div>

            <div className="flex gap-2 pt-3">
              <button
                id="modal-vol-submit"
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-lg cursor-pointer"
              >
                حفظ المتطوع
              </button>
              <button
                type="button"
                onClick={() => setShowVolModal(false)}
                className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs py-2 rounded-lg cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Copy Initiative Modal */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              onCopyInitiative(copyId, newCopyDate, newCopyName);
              setShowCopyModal(false);
            }}
            className="bg-white rounded-2xl max-w-md w-full p-6 text-right space-y-4 border border-neutral-100 shadow-xl"
            dir="rtl"
          >
            <h3 className="text-md font-black text-neutral-800">نسخ وتكرار المبادرة السابقة</h3>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400">الاسم الجديد للمبادرة المكررة:</label>
                <input
                  id="modal-copy-name"
                  type="text"
                  required
                  value={newCopyName}
                  onChange={(e) => setNewCopyName(e.target.value)}
                  className="w-full border border-neutral-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400">تاريخ الانعقاد الجديد:</label>
                <input
                  id="modal-copy-date"
                  type="date"
                  required
                  value={newCopyDate}
                  onChange={(e) => setNewCopyDate(e.target.value)}
                  className="w-full border border-neutral-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-3">
              <button
                id="modal-copy-submit"
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-lg cursor-pointer"
              >
                تكرار وحفظ الآن
              </button>
              <button
                type="button"
                onClick={() => setShowCopyModal(false)}
                className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs py-2 rounded-lg cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Excel Importer Modal */}
      {showExcelModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <form 
            onSubmit={handleExcelImport}
            className="bg-white rounded-2xl max-w-lg w-full p-6 text-right space-y-4 border border-neutral-100 shadow-xl"
            dir="rtl"
          >
            <div className="flex items-center gap-2 text-emerald-600">
              <FileSpreadsheet className="w-6 h-6" />
              <h3 className="text-md font-black text-neutral-800">استيراد المتطوعين من جدول Excel</h3>
            </div>
            
            <p className="text-[11px] text-neutral-500">قم بلصق صفوف متطوعيك من جدول البيانات أدناه بصيغة سطرية مفصولة بفواصل:</p>
            <div className="bg-neutral-50 p-2.5 rounded-lg font-mono text-[10px] text-neutral-500 border border-neutral-100">
              الاسم الكامل, رقم الجوال, البريد الإلكتروني (اختياري)<br />
              أحمد عادل الشهري, 0550000001, ahmed@reyada.sa
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400">الفريق المعين للدفعة المستوردة:</label>
                <select
                  id="modal-excel-team"
                  required
                  value={excelTeamId}
                  onChange={(e) => setExcelTeamId(e.target.value)}
                  className="w-full border border-neutral-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500/20"
                >
                  {data.teams.map(t => (
                    <option key={t.id} value={t.id}>{t.nameAr}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400">الصق البيانات هنا:</label>
                <textarea
                  id="modal-excel-textarea"
                  required
                  rows={6}
                  value={excelText}
                  onChange={(e) => setExcelText(e.target.value)}
                  className="w-full border border-neutral-200 rounded-lg p-2 text-xs font-mono focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="أحمد عادل الشهري, 0550000001, ahmed@reyada.sa"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-3">
              <button
                id="modal-excel-submit"
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-lg cursor-pointer"
              >
                استيراد واعتماد الدفعة ✓
              </button>
              <button
                type="button"
                onClick={() => setShowExcelModal(false)}
                className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs py-2 rounded-lg cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Initiative Editor Modal */}
      {showInitModal && editingInit && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <form 
            onSubmit={handleSaveInitiative}
            className="bg-white rounded-2xl max-w-md w-full p-6 text-right space-y-4 border border-neutral-100 shadow-xl"
            dir="rtl"
          >
            <h3 className="text-md font-black text-neutral-800">{editingInit.id ? "تعديل المبادرة" : "طرح مبادرة تطوعية جديدة"}</h3>
            
            <div className="space-y-3 overflow-y-auto max-h-[380px] p-1">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400">اسم المبادرة والفعالية:</label>
                <input
                  id="modal-init-name"
                  type="text"
                  required
                  value={editingInit.name}
                  onChange={(e) => setEditingInit({ ...editingInit, name: e.target.value })}
                  className="w-full border border-neutral-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400">المكان والموقع التفصيلي بالعسيلة:</label>
                <input
                  id="modal-init-place"
                  type="text"
                  required
                  value={editingInit.place}
                  onChange={(e) => setEditingInit({ ...editingInit, place: e.target.value })}
                  className="w-full border border-neutral-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400">تاريخ الانعقاد:</label>
                  <input
                    id="modal-init-date"
                    type="date"
                    required
                    value={editingInit.date}
                    onChange={(e) => setEditingInit({ ...editingInit, date: e.target.value })}
                    className="w-full border border-neutral-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400">العدد المطلوب:</label>
                  <input
                    id="modal-init-needed"
                    type="number"
                    required
                    value={editingInit.neededCount}
                    onChange={(e) => setEditingInit({ ...editingInit, neededCount: Number(e.target.value) })}
                    className="w-full border border-neutral-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400">وقت البدء:</label>
                  <input
                    id="modal-init-start"
                    type="time"
                    required
                    value={editingInit.startTime}
                    onChange={(e) => setEditingInit({ ...editingInit, startTime: e.target.value })}
                    className="w-full border border-neutral-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400">وقت الانتهاء:</label>
                  <input
                    id="modal-init-end"
                    type="time"
                    required
                    value={editingInit.endTime}
                    onChange={(e) => setEditingInit({ ...editingInit, endTime: e.target.value })}
                    className="w-full border border-neutral-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400">الفريق المسؤول عن المبادرة:</label>
                <select
                  id="modal-init-team"
                  value={editingInit.teamId}
                  onChange={(e) => {
                    const selectedTeam = data.teams.find(t => t.id === e.target.value);
                    setEditingInit({ 
                      ...editingInit, 
                      teamId: e.target.value,
                      departmentId: selectedTeam ? selectedTeam.departmentId : ""
                    });
                  }}
                  className="w-full border border-neutral-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500/20"
                >
                  {data.teams.map(t => (
                    <option key={t.id} value={t.id}>{t.nameAr}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400">وصف المبادرة بالتفصيل:</label>
                <textarea
                  id="modal-init-desc"
                  required
                  rows={3}
                  value={editingInit.description}
                  onChange={(e) => setEditingInit({ ...editingInit, description: e.target.value })}
                  className="w-full border border-neutral-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500/20 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-3">
              <button
                id="modal-init-submit"
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-lg cursor-pointer"
              >
                طرح المبادرة المعتمدة
              </button>
              <button
                type="button"
                onClick={() => setShowInitModal(false)}
                className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs py-2 rounded-lg cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* OPPORTUNITY REQUEST REVIEW MODAL FOR ADMIN */}
      {reviewingOpp && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
          <div 
            className="bg-white rounded-2xl max-w-2xl w-full p-6 text-right border border-neutral-100 shadow-2xl space-y-4 my-8 animate-scale-up"
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-700">
                <FileText className="w-6 h-6" />
                <div>
                  <h3 className="text-md font-black text-neutral-800">مراجعة الفرصة التطوعية واتخاذ قرار</h3>
                  <p className="text-[11px] text-neutral-500">مقدمة من: <b>{reviewingOpp.teamName || "فريق تطوعي"}</b> (القائد: {reviewingOpp.leaderName})</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setReviewingOpp(null);
                  setOppModalError(null);
                }}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {oppModalError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                <span>⚠️ {oppModalError}</span>
              </div>
            )}

            <div className="space-y-4 text-xs max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-base font-black text-neutral-900">{reviewingOpp.title}</h4>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    reviewingOpp.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
                    reviewingOpp.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                    reviewingOpp.status === 'returned' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {reviewingOpp.status === 'accepted' ? '✓ مقبولة' :
                     reviewingOpp.status === 'rejected' ? '❌ مرفوضة' :
                     reviewingOpp.status === 'returned' ? '⚠️ معادة للتصحيح' : '⏳ قيد المراجعة'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="bg-emerald-50 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full text-[10.5px]">النوع: {reviewingOpp.opportunityType}</span>
                  <span className="bg-blue-50 text-blue-800 font-bold px-2.5 py-0.5 rounded-full text-[10.5px]">المجال: {reviewingOpp.domain}</span>
                  <span className="bg-purple-50 text-purple-800 font-bold px-2.5 py-0.5 rounded-full text-[10.5px]">المطلوب: {reviewingOpp.neededCount} متطوع</span>
                  {reviewingOpp.place && (
                    <span className="bg-neutral-100 text-neutral-700 font-bold px-2.5 py-0.5 rounded-full text-[10.5px]">📍 {reviewingOpp.place}</span>
                  )}
                  {reviewingOpp.opportunityCode && (
                    <span className="bg-emerald-600 text-white font-mono font-bold px-2.5 py-0.5 rounded-full text-[10.5px]">معرف معتمد: #{reviewingOpp.opportunityCode}</span>
                  )}
                </div>
              </div>

              {reviewingOpp.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-neutral-200 max-h-48">
                  <img src={reviewingOpp.imageUrl} alt={reviewingOpp.title} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-150 space-y-1">
                <span className="font-bold text-neutral-700 block">الوصف والتفاصيل:</span>
                <p className="text-neutral-600 leading-relaxed text-[11px] whitespace-pre-line">{reviewingOpp.description || "لا يوجد وصف محدد."}</p>
              </div>

              {reviewingOpp.goals && reviewingOpp.goals.length > 0 && (
                <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-150 space-y-1">
                  <span className="font-bold text-neutral-700 block">أهداف المبادرة:</span>
                  <ul className="list-disc list-inside space-y-1 text-neutral-600 text-[11px]">
                    {reviewingOpp.goals.map((g, idx) => (
                      <li key={idx}>{g}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Review History / Audit Trail */}
              {reviewingOpp.reviewHistory && reviewingOpp.reviewHistory.length > 0 && (
                <div className="bg-neutral-50/70 p-3 rounded-xl border border-neutral-200 space-y-2">
                  <span className="font-bold text-neutral-800 block text-xs">سجل المراجعة والاعتماد (Audit Trail):</span>
                  <div className="space-y-2">
                    {reviewingOpp.reviewHistory.map((h, i) => (
                      <div key={h.id || i} className="bg-white p-2.5 rounded-lg border border-neutral-150 space-y-1 text-[11px]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              h.action === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
                              h.action === 'rejected' ? 'bg-rose-100 text-rose-800' :
                              h.action === 'returned' ? 'bg-blue-100 text-blue-800' :
                              h.action === 'resubmitted' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {h.action === 'accepted' ? 'قبول واعتماد' :
                               h.action === 'rejected' ? 'رفض' :
                               h.action === 'returned' ? 'إعادة للتصحيح' :
                               h.action === 'resubmitted' ? 'إعادة إرسال من القائد' : 'تقديم جديد'}
                            </span>
                            <span className="font-bold text-neutral-700">{h.performedByName}</span>
                            <span className="text-neutral-400 text-[10px]">({h.performedByRole === 'admin' ? 'إدارة التطوع' : 'قائد الفريق'})</span>
                          </div>
                          <span className="text-neutral-400 font-mono text-[10px]">{new Date(h.timestamp).toLocaleString('ar-SA')}</span>
                        </div>
                        {h.notes && (
                          <div className="text-neutral-600 bg-neutral-50 p-1.5 rounded text-[10.5px]">
                            {h.notes}
                          </div>
                        )}
                        {h.opportunityCodeAssigned && (
                          <div className="text-emerald-700 font-mono font-bold text-[10px]">
                            تم تعيين المعرف: #{h.opportunityCodeAssigned}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Tabs for Admin */}
              <div className="space-y-3 pt-2 border-t border-neutral-100">
                <label className="font-bold text-neutral-800 block">الإجراء المطلوب اتخاذه:</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOppActionType('accept');
                      setOppModalError(null);
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      oppActionType === 'accept' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    ✓ قبول الفرصة
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOppActionType('return');
                      setOppModalError(null);
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      oppActionType === 'return' ? 'bg-blue-600 text-white shadow-xs' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    ⚠️ إعادة للتصحيح
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOppActionType('reject');
                      setOppModalError(null);
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      oppActionType === 'reject' ? 'bg-rose-600 text-white shadow-xs' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    ❌ رفض الفرصة
                  </button>
                </div>

                {oppActionType === 'accept' && (
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-emerald-950 block">
                          معرف الفرصة (إلزامي من إدارة التطوع) *
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            // Generate unique code starting with 87 + 8 digits
                            const randSuffix = Math.floor(10000000 + Math.random() * 90000000);
                            const generated = `87${randSuffix}`;
                            setOppCode(generated);
                            setOppModalError(null);
                          }}
                          className="text-[10px] font-bold text-emerald-800 bg-white border border-emerald-300 hover:bg-emerald-100 px-2 py-0.5 rounded cursor-pointer transition-all"
                        >
                          توليد معرف تلقائي
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="أدخل معرف الفرصة (مثال: 8749201538)"
                        value={oppCode}
                        onChange={(e) => {
                          setOppCode(e.target.value);
                          setOppModalError(null);
                        }}
                        className="w-full border border-emerald-300 rounded-xl p-2.5 text-xs bg-white font-mono font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none"
                      />
                      <p className="text-[10px] text-emerald-700 mt-1">إدارة التطوع هي الجهة الوحيدة المخولة بتعيين معرف الفرصة، ويتم التحقق من عدم تكراره.</p>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-emerald-950 block mb-1">
                        رابط الفرصة على المنصة الوطنية للتطوع (اختياري)
                      </label>
                      <input
                        type="url"
                        placeholder="https://nvp.gov.sa/opportunities/..."
                        value={oppPlatformUrl}
                        onChange={(e) => setOppPlatformUrl(e.target.value)}
                        className="w-full border border-emerald-300 rounded-xl p-2.5 text-xs bg-white font-mono focus:ring-2 focus:ring-emerald-500/20 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-emerald-900 block mb-1">تاريخ البداية (اختياري)</label>
                        <input
                          type="date"
                          value={oppStartDate}
                          onChange={(e) => setOppStartDate(e.target.value)}
                          className="w-full border border-emerald-300 rounded-xl p-2 text-xs bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-emerald-900 block mb-1">تاريخ الانتهاء (اختياري)</label>
                        <input
                          type="date"
                          value={oppEndDate}
                          onChange={(e) => setOppEndDate(e.target.value)}
                          className="w-full border border-emerald-300 rounded-xl p-2 text-xs bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none"
                        />
                      </div>
                    </div>

                    <p className="text-[10.5px] text-emerald-800">عند قبول الفرصة، سيتم نشرها فوراً كـ "مبادرة متاحة" وإرسال إشعار فوري لقائد الفريق.</p>
                  </div>
                )}

                {oppActionType === 'return' && (
                  <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                    <label className="text-xs font-bold text-blue-950 block">
                      سبب طلب التعديل وملاحظات التصحيح (إلزامي) *
                    </label>
                    <textarea
                      rows={3}
                      placeholder="اذكر بدقة البيانات الناقصة أو التعديلات المطلوبة من قائد الفريق..."
                      value={oppCorrectionNotes}
                      onChange={(e) => {
                        setOppCorrectionNotes(e.target.value);
                        setOppModalError(null);
                      }}
                      className="w-full border border-blue-300 rounded-xl p-2.5 text-xs bg-white focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                    />
                    <p className="text-[10px] text-blue-700">ستعود الفرصة لقائد الفريق بحالة [معادة للتصحيح] مع إشعار فوري وتظهر له ملاحظاتكم لتعديلها وإعادة إرسالها.</p>
                  </div>
                )}

                {oppActionType === 'reject' && (
                  <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2">
                    <label className="text-xs font-bold text-rose-950 block">
                      سبب الرفض الرسمي (إلزامي) *
                    </label>
                    <textarea
                      rows={3}
                      placeholder="اذكر سبب رفض الفرصة التطوعية لتوضيحه لقائد الفريق بشكل رسمي..."
                      value={oppRejectReason}
                      onChange={(e) => {
                        setOppRejectReason(e.target.value);
                        setOppModalError(null);
                      }}
                      className="w-full border border-rose-300 rounded-xl p-2.5 text-xs bg-white focus:ring-2 focus:ring-rose-500/20 outline-none resize-none"
                    />
                    <p className="text-[10px] text-rose-700">سيتم تغيير حالة الفرصة إلى [مرفوضة] وإشعار قائد الفريق مع توضيح سبب الرفض المسجل.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-neutral-100">
              <button
                onClick={() => {
                  if (!reviewingOpp) return;

                  if (oppActionType === 'accept') {
                    if (!oppCode || !oppCode.trim()) {
                      setOppModalError("معرف الفرصة حقل إلزامي لاعتماد الفرصة. يرجى إدخال المعرف أو الضغط على 'توليد معرف تلقائي'.");
                      return;
                    }
                    // Check duplicate code
                    const trimmedCode = oppCode.trim();
                    const duplicate = opportunityRequests.find(r => r.id !== reviewingOpp.id && r.opportunityCode === trimmedCode);
                    if (duplicate) {
                      setOppModalError(`معرف الفرصة (${trimmedCode}) مستخدم مسبقاً في فرصة أخرى بعنوان "${duplicate.title}". يرجى اختيار معرف فريد.`);
                      return;
                    }

                    if (onUpdateOpportunityRequest) {
                      onUpdateOpportunityRequest({
                        id: reviewingOpp.id,
                        status: 'accepted',
                        opportunityCode: trimmedCode,
                        nationalPlatformUrl: oppPlatformUrl.trim(),
                        startDate: oppStartDate || undefined,
                        endDate: oppEndDate || undefined,
                        reviewerName: "إدارة التطوع"
                      });
                    }
                  } else if (oppActionType === 'return') {
                    if (!oppCorrectionNotes || !oppCorrectionNotes.trim()) {
                      setOppModalError("يرجى كتابة ملاحظات التعديل والتصحيح المطلوبة من قائد الفريق.");
                      return;
                    }
                    if (onUpdateOpportunityRequest) {
                      onUpdateOpportunityRequest({
                        id: reviewingOpp.id,
                        status: 'returned',
                        correctionNotes: oppCorrectionNotes.trim(),
                        reviewerName: "إدارة التطوع"
                      });
                    }
                  } else {
                    if (!oppRejectReason || !oppRejectReason.trim()) {
                      setOppModalError("يرجى كتابة سبب رفض الفرصة التطوعية.");
                      return;
                    }
                    if (onUpdateOpportunityRequest) {
                      onUpdateOpportunityRequest({
                        id: reviewingOpp.id,
                        status: 'rejected',
                        rejectionReason: oppRejectReason.trim(),
                        reviewerName: "إدارة التطوع"
                      });
                    }
                  }

                  setReviewingOpp(null);
                  setOppModalError(null);
                }}
                className={`flex-1 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer transition-all ${
                  oppActionType === 'accept' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-xs' :
                  oppActionType === 'return' ? 'bg-blue-600 hover:bg-blue-700 shadow-xs' : 'bg-rose-600 hover:bg-rose-700 shadow-xs'
                }`}
              >
                {oppActionType === 'accept' ? 'اعتماد الفرصة ونشرها' :
                 oppActionType === 'return' ? 'إعادة الفرصة للتصحيح' : 'تأكيد رفض الفرصة'}
              </button>
              <button
                onClick={() => {
                  setReviewingOpp(null);
                  setOppModalError(null);
                }}
                className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs py-2.5 rounded-xl cursor-pointer transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Volunteer Monthly Achievement Report Modal */}
      {showReportModal && selectedReportVolunteer && (
        <VolunteerMonthlyReportModal
          isOpen={showReportModal}
          onClose={() => {
            setShowReportModal(false);
            setSelectedReportVolunteer(null);
          }}
          volunteer={selectedReportVolunteer}
          initiatives={data.initiatives}
          attendanceRecords={data.attendance || []}
          teams={data.teams}
          departments={data.departments}
          logoUrl={data.homeSettings?.logoUrl}
        />
      )}

    </div>
  );
};
