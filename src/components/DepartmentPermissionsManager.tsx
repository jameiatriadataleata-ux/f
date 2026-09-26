import React, { useState, useMemo, useEffect } from 'react';
import {
  Shield,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Filter,
  Boxes,
  UserCheck,
  HeartHandshake,
  Users,
  Wallet,
  FolderKanban,
  Megaphone,
  HandCoins,
  ShieldAlert,
  Printer,
  Download,
  Eye,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  ArrowUpRight,
  ArrowDownLeft,
  BarChart3,
  Settings,
  Lock,
  Sparkles,
  Building2,
  AlertCircle
} from 'lucide-react';
import {
  getAllDepartmentPermissions,
  getDepartmentPermissions,
  getDepartmentPermissionIds,
  expandPermissionsWithLegacyKeys,
  OPERATION_TYPE_CONFIG,
  OperationType,
  DepartmentPermissionGroup,
  PermissionDefinition
} from '../data/departmentPermissionsRegistry';

interface DepartmentPermissionsManagerProps {
  selectedAccount: any;
  departments: Array<{ id: string; nameAr: string; nameEn?: string; descriptionAr?: string }>;
  currentRole: string;
  currentDepartmentId: string;
  selectedPermissions: string[];
  onChangePermissions: (perms: string[]) => void;
  onChangeDepartment?: (deptId: string) => void;
  onSave: () => Promise<void> | void;
  isSaving?: boolean;
  saveSuccess?: boolean;
  saveMessage?: string;
  isSuperAdmin?: boolean;
}

export const DepartmentPermissionsManager: React.FC<DepartmentPermissionsManagerProps> = ({
  selectedAccount,
  departments,
  currentRole,
  currentDepartmentId,
  selectedPermissions,
  onChangePermissions,
  onChangeDepartment,
  onSave,
  isSaving = false,
  saveSuccess = false,
  saveMessage = '',
  isSuperAdmin = true
}) => {
  // 1. Department Selection state ("اختر الإدارة أولاً")
  // Defaults to user's assigned department, or first department, or 'all' if super admin allows
  const [activeDepartmentFilter, setActiveDepartmentFilter] = useState<string>(
    currentDepartmentId || 'dep-8'
  );

  // Sync with prop changes if selected account changes
  useEffect(() => {
    if (currentDepartmentId) {
      setActiveDepartmentFilter(currentDepartmentId);
    }
  }, [currentDepartmentId, selectedAccount?.id]);

  // Operation Type Filter (عرض، إضافة، تعديل، حذف، اعتماد، صرف، استلام، طباعة، تصدير، تقارير)
  const [selectedOperationFilter, setSelectedOperationFilter] = useState<string>('all');

  // Search query within permissions
  const [searchQuery, setSearchQuery] = useState('');

  // Accordion open/close state for departments
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    departments.forEach(d => {
      initial[d.id] = (d.id === (currentDepartmentId || 'dep-8'));
    });
    return initial;
  });

  // Toggle accordion section
  const toggleDeptExpanded = (deptId: string) => {
    setExpandedDepts(prev => ({
      ...prev,
      [deptId]: !prev[deptId]
    }));
  };

  // Determine user mode
  const isDirector = currentRole === 'department_admin' || currentRole === 'admin';
  const isEmployee = currentRole === 'employee' || currentRole === 'storekeeper';
  const isStorekeeper = currentRole === 'storekeeper' || (selectedAccount && selectedAccount.type === 'warehouse');

  // Allow cross-department permissions toggle (only for admins)
  const [allowCrossDept, setAllowCrossDept] = useState(false);

  // All groups from registry dynamically merged with actual departments
  const allGroups = useMemo(() => {
    return getAllDepartmentPermissions(departments);
  }, [departments]);

  // Department groups to display based on department filter and user constraints
  const displayedGroups = useMemo(() => {
    let groups = allGroups;

    // Strict Employee Rule (#5 & #7): If user is an employee, only show their department unless explicitly expanded
    if (isEmployee && !allowCrossDept) {
      const empDept = currentDepartmentId || 'dep-8';
      groups = groups.filter(g => g.departmentId === empDept);
    } else if (activeDepartmentFilter !== 'all') {
      groups = groups.filter(g => g.departmentId === activeDepartmentFilter);
    }

    return groups;
  }, [allGroups, activeDepartmentFilter, isEmployee, allowCrossDept, currentDepartmentId]);

  // Icon mapping helper
  const getDeptIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Boxes': return <Boxes className="w-5 h-5 text-amber-600" />;
      case 'UserCheck': return <UserCheck className="w-5 h-5 text-indigo-600" />;
      case 'HeartHandshake': return <HeartHandshake className="w-5 h-5 text-emerald-600" />;
      case 'Users': return <Users className="w-5 h-5 text-teal-600" />;
      case 'Wallet': return <Wallet className="w-5 h-5 text-emerald-600" />;
      case 'FolderKanban': return <FolderKanban className="w-5 h-5 text-blue-600" />;
      case 'Megaphone': return <Megaphone className="w-5 h-5 text-purple-600" />;
      case 'HandCoins': return <HandCoins className="w-5 h-5 text-amber-600" />;
      case 'ShieldAlert': return <ShieldAlert className="w-5 h-5 text-rose-600" />;
      default: return <Building2 className="w-5 h-5 text-emerald-600" />;
    }
  };

  const getOpIcon = (opType: OperationType) => {
    switch (opType) {
      case 'view': return <Eye className="w-3.5 h-3.5" />;
      case 'create': return <Plus className="w-3.5 h-3.5" />;
      case 'edit': return <Edit className="w-3.5 h-3.5" />;
      case 'delete': return <Trash2 className="w-3.5 h-3.5" />;
      case 'approve': return <CheckCircle className="w-3.5 h-3.5" />;
      case 'disburse': return <ArrowUpRight className="w-3.5 h-3.5" />;
      case 'receive': return <ArrowDownLeft className="w-3.5 h-3.5" />;
      case 'print': return <Printer className="w-3.5 h-3.5" />;
      case 'export': return <Download className="w-3.5 h-3.5" />;
      case 'reports': return <BarChart3 className="w-3.5 h-3.5" />;
      case 'manage': return <Settings className="w-3.5 h-3.5" />;
      default: return <Shield className="w-3.5 h-3.5" />;
    }
  };

  // Permission item checkbox toggle
  const handleTogglePermission = (perm: PermissionDefinition) => {
    const isChecked = selectedPermissions.includes(perm.id);
    let updated: string[];
    if (isChecked) {
      updated = selectedPermissions.filter(id => id !== perm.id);
    } else {
      updated = [...selectedPermissions, perm.id];
    }
    onChangePermissions(updated);
  };

  // 4. صلاحيات مدير الإدارة: تحديد جميع صلاحيات الإدارة
  const handleSelectAllDepartmentPermissions = (deptId: string) => {
    const deptPermIds = getDepartmentPermissionIds(deptId, departments);
    const set = new Set([...selectedPermissions, ...deptPermIds]);
    onChangePermissions(Array.from(set));
  };

  // 4. صلاحيات مدير الإدارة: إلغاء جميع صلاحيات الإدارة
  const handleDeselectAllDepartmentPermissions = (deptId: string) => {
    const deptPermIds = new Set(getDepartmentPermissionIds(deptId, departments));
    const updated = selectedPermissions.filter(id => !deptPermIds.has(id));
    onChangePermissions(updated);
  };

  // Global "Select All" currently visible
  const handleSelectAllVisible = () => {
    const visibleIds: string[] = [];
    displayedGroups.forEach(g => {
      g.permissions.forEach(p => {
        if (selectedOperationFilter === 'all' || p.operationType === selectedOperationFilter) {
          if (!searchQuery || p.label.toLowerCase().includes(searchQuery.toLowerCase())) {
            visibleIds.push(p.id);
          }
        }
      });
    });
    const set = new Set([...selectedPermissions, ...visibleIds]);
    onChangePermissions(Array.from(set));
  };

  // Global "Deselect All" currently visible
  const handleDeselectAllVisible = () => {
    const visibleIds = new Set<string>();
    displayedGroups.forEach(g => {
      g.permissions.forEach(p => {
        if (selectedOperationFilter === 'all' || p.operationType === selectedOperationFilter) {
          if (!searchQuery || p.label.toLowerCase().includes(searchQuery.toLowerCase())) {
            visibleIds.add(p.id);
          }
        }
      });
    });
    const updated = selectedPermissions.filter(id => !visibleIds.has(id));
    onChangePermissions(updated);
  };

  // Active department object
  const currentDeptObj = departments.find(d => d.id === (activeDepartmentFilter || currentDepartmentId));

  return (
    <div className="space-y-5 text-right font-sans">
      {/* 1. اختيار الإدارة أولاً (Primary Department Selector) */}
      <div className="bg-neutral-50/90 border border-neutral-200/90 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100/80 text-emerald-800">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-neutral-800">اختر الإدارة:</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  خطوة 1: تحديد نطاق الإدارة
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                تحديد الإدارة لعرض الصلاحيات والوظائف التابعة لها بدقة ومنع التداخل.
              </p>
            </div>
          </div>

          {/* Department Select Dropdown */}
          <div className="w-full sm:w-72">
            <select
              value={activeDepartmentFilter}
              onChange={(e) => {
                const newDeptId = e.target.value;
                setActiveDepartmentFilter(newDeptId);
                if (onChangeDepartment && newDeptId !== 'all') {
                  onChangeDepartment(newDeptId);
                }
                if (newDeptId !== 'all') {
                  setExpandedDepts(prev => ({ ...prev, [newDeptId]: true }));
                }
              }}
              className="w-full border-2 border-emerald-600/30 rounded-xl p-2.5 text-xs font-bold text-neutral-800 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all shadow-sm"
            >
              {isSuperAdmin && (
                <option value="all">📂 عرض جميع الإدارات المتاحة ({departments.length})</option>
              )}
              {departments.map(d => (
                <option key={d.id} value={d.id}>
                  🏢 {d.nameAr} ({d.id})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Department Info Banner */}
        {currentDeptObj && activeDepartmentFilter !== 'all' && (
          <div className="flex items-center justify-between bg-white border border-emerald-100 rounded-xl p-3 text-xs">
            <div className="flex items-center gap-2 text-neutral-700">
              <span className="font-bold text-emerald-900">{currentDeptObj.nameAr}</span>
              <span className="text-neutral-400">|</span>
              <span className="text-[11px] text-neutral-500">{currentDeptObj.descriptionAr || 'إدارة معتمدة في الهيكل الإداري'}</span>
            </div>
            <span className="text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
              رمز الإدارة: {currentDeptObj.id}
            </span>
          </div>
        )}
      </div>

      {/* Role Notice & Quick Presets Header (صلاحيات مدير الإدارة vs صلاحيات الموظف) */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm ${
        isDirector 
          ? 'bg-amber-50/70 border-amber-200/90 text-amber-950' 
          : isStorekeeper
          ? 'bg-orange-50/70 border-orange-200/90 text-orange-950'
          : 'bg-teal-50/70 border-teal-200/90 text-teal-950'
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
              isDirector 
                ? 'bg-amber-200 text-amber-900' 
                : isStorekeeper
                ? 'bg-orange-200 text-orange-900'
                : 'bg-teal-200 text-teal-900'
            }`}>
              {isDirector ? '👑 صلاحيات مدير الإدارة' : isStorekeeper ? '📦 صلاحيات أمين المستودع' : '👤 صلاحيات موظف الإدارة'}
            </span>
            <span className="text-xs font-bold text-neutral-700">
              المستخدم المحدد: {selectedAccount?.name || 'مستخدم جديد'}
            </span>
          </div>
          <p className="text-[11px] text-neutral-600">
            {isDirector 
              ? 'يمكن لمدير الإدارة الحصول على كامل صلاحيات إدارته بنقرة واحدة، مع إمكانية التعديل والتخصيص اليدوي.'
              : 'يقتصر وصول الموظف على العمليات المحددة له داخل نطاق إدارته فقط، وتُحجب صلاحيات الإدارات الأخرى.'
            }
          </p>
        </div>

        {/* 4. أزرار التحكم السريعة لمدير الإدارة */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleSelectAllDepartmentPermissions(activeDepartmentFilter !== 'all' ? activeDepartmentFilter : (currentDepartmentId || 'dep-8'))}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>تحديد جميع صلاحيات الإدارة</span>
          </button>

          <button
            type="button"
            onClick={() => handleDeselectAllDepartmentPermissions(activeDepartmentFilter !== 'all' ? activeDepartmentFilter : (currentDepartmentId || 'dep-8'))}
            className="px-3 py-1.5 rounded-xl bg-neutral-200 hover:bg-neutral-300 text-neutral-700 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>إلغاء جميع صلاحيات الإدارة</span>
          </button>
        </div>
      </div>

      {/* 6. التصفية حسب نوع العملية (Filter by Operation Type) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-neutral-700 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-emerald-600" />
            <span>الصلاحيات حسب نوع العملية:</span>
          </label>
          <span className="text-[10px] text-neutral-400">
            محدد حالياً: {selectedPermissions.length} صلاحيات
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setSelectedOperationFilter('all')}
            className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
              selectedOperationFilter === 'all'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            كافة العمليات
          </button>

          {(Object.keys(OPERATION_TYPE_CONFIG) as OperationType[]).map(opKey => {
            const cfg = OPERATION_TYPE_CONFIG[opKey];
            const isSelected = selectedOperationFilter === opKey;
            return (
              <button
                key={opKey}
                type="button"
                onClick={() => setSelectedOperationFilter(opKey)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {getOpIcon(opKey)}
                <span>{cfg.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 8. أدوات أعلى القائمة (تحديد الكل، إلغاء الكل، حفظ الصلاحيات) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-neutral-50 p-3 rounded-2xl border border-neutral-200/70">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSelectAllVisible}
            className="px-3 py-1.5 rounded-xl bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm"
          >
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>تحديد الكل</span>
          </button>

          <button
            type="button"
            onClick={handleDeselectAllVisible}
            className="px-3 py-1.5 rounded-xl bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm"
          >
            <X className="w-3.5 h-3.5 text-rose-600" />
            <span>إلغاء الكل</span>
          </button>

          {isEmployee && (
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-600 cursor-pointer select-none mr-2">
              <input
                type="checkbox"
                checked={allowCrossDept}
                onChange={e => setAllowCrossDept(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>توسيع الصلاحيات لإدارات أخرى (استثناء إداري)</span>
            </label>
          )}
        </div>

        {/* زر حفظ الصلاحيات الرئيسي */}
        <button
          type="button"
          disabled={isSaving}
          onClick={onSave}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black py-2 px-5 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Shield className="w-4 h-4" />
          <span>{isSaving ? 'جارٍ الحفظ...' : 'حفظ الصلاحيات'}</span>
        </button>
      </div>

      {/* رسالة النجاح الواضحة (المعيار #8: تم حفظ صلاحيات المستخدم بنجاح) */}
      {saveSuccess && (
        <div className="bg-emerald-50 border-2 border-emerald-500/50 text-emerald-900 text-xs font-bold p-3.5 rounded-2xl flex items-center gap-2.5 shadow-sm animate-fade-in">
          <div className="p-1 rounded-full bg-emerald-500 text-white">
            <Check className="w-4 h-4" />
          </div>
          <div>
            <span>{saveMessage || "تم حفظ صلاحيات المستخدم بنجاح."}</span>
            <span className="block text-[10px] text-emerald-700 font-normal mt-0.5">
              تم تحديث الصلاحيات والعمليات المصرح بها على مستوى الخادم وقاعدة البيانات والجلسات.
            </span>
          </div>
        </div>
      )}

      {/* 2 & 8. قائمة الصلاحيات المنظمة حسب الإدارة بأقسام قابلة للفتح والإغلاق (Accordions) */}
      <div className="space-y-4">
        {displayedGroups.map(group => {
          const isExpanded = expandedDepts[group.departmentId] ?? (group.departmentId === activeDepartmentFilter);
          
          // Filter group permissions by operation filter and search query
          const filteredPerms = group.permissions.filter(p => {
            if (selectedOperationFilter !== 'all' && p.operationType !== selectedOperationFilter) {
              return false;
            }
            if (searchQuery.trim()) {
              const q = searchQuery.trim().toLowerCase();
              return p.label.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
            }
            return true;
          });

          const totalDeptPerms = group.permissions.length;
          const grantedDeptPerms = group.permissions.filter(p => selectedPermissions.includes(p.id)).length;
          const isAllDeptGranted = totalDeptPerms > 0 && grantedDeptPerms === totalDeptPerms;

          return (
            <div
              key={group.departmentId}
              className="border border-neutral-200/90 rounded-2xl bg-white shadow-sm overflow-hidden transition-all"
            >
              {/* Accordion Header */}
              <div
                onClick={() => toggleDeptExpanded(group.departmentId)}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-neutral-50 to-white hover:bg-neutral-100/70 cursor-pointer select-none transition-all border-b border-neutral-100"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white border border-neutral-200 shadow-xs">
                    {getDeptIcon(group.iconName)}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-neutral-800">{group.departmentNameAr}</h4>
                      <span className="text-[10px] font-mono text-neutral-400">({group.departmentId})</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-0.5">{group.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Badge showing granted / total */}
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                    grantedDeptPerms > 0
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-neutral-100 text-neutral-500'
                  }`}>
                    {grantedDeptPerms} / {totalDeptPerms} صلاحية
                  </span>

                  {/* Toggle Arrow */}
                  <div className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </div>

              {/* Accordion Content: Permissions Matrix */}
              {isExpanded && (
                <div className="p-4 bg-white space-y-3">
                  {/* Sub-header inside accordion */}
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-neutral-100">
                    <span className="font-bold text-neutral-600">
                      الوظائف والصلاحيات التشغيلية ({filteredPerms.length}):
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectAllDepartmentPermissions(group.departmentId);
                        }}
                        className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
                      >
                        تحديد صلاحيات هذه الإدارة
                      </button>
                      <span className="text-neutral-300">•</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeselectAllDepartmentPermissions(group.departmentId);
                        }}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                      >
                        إلغاء تحديد الإدارة
                      </button>
                    </div>
                  </div>

                  {/* Permissions Checkbox Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {filteredPerms.map(perm => {
                      const isChecked = selectedPermissions.includes(perm.id);
                      const opConfig = OPERATION_TYPE_CONFIG[perm.operationType] || OPERATION_TYPE_CONFIG.manage;

                      return (
                        <label
                          key={perm.id}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none text-xs ${
                            isChecked
                              ? 'bg-emerald-50/70 border-emerald-500/70 shadow-xs'
                              : 'bg-neutral-50/60 border-neutral-200/80 hover:bg-neutral-100/70 hover:border-neutral-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleTogglePermission(perm)}
                              className="w-4 h-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 shrink-0"
                            />
                            <span className={`font-bold truncate ${isChecked ? 'text-emerald-950' : 'text-neutral-700'}`}>
                              {perm.label}
                            </span>
                          </div>

                          {/* Operation Type Badge */}
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 flex items-center gap-1 ${opConfig.badgeClass}`}>
                            {getOpIcon(perm.operationType)}
                            <span>{opConfig.label}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  {filteredPerms.length === 0 && (
                    <div className="text-center py-6 text-neutral-400 text-xs">
                      لا توجد صلاحيات مطابقة لنوع العملية المحدد في هذه الإدارة.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {displayedGroups.length === 0 && (
          <div className="text-center py-10 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200 text-neutral-400 text-xs">
            لا توجد إدارات متاحة للعرض وفق الفلتر المحدد.
          </div>
        )}
      </div>

      {/* Sticky Bottom Save Action Bar */}
      <div className="border-t border-neutral-200 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-neutral-500">
          <span>الصلاحيات المحددة جاهزة للاعتماد: </span>
          <span className="font-bold text-neutral-800">{selectedPermissions.length} صلاحية تشغيلية</span>
        </div>

        <button
          type="button"
          disabled={isSaving}
          onClick={onSave}
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs py-3 px-8 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 shadow-md"
        >
          <Shield className="w-4 h-4" />
          <span>{isSaving ? 'جارٍ حفظ الصلاحيات ومزامنتها...' : 'حفظ الصلاحيات الآن'}</span>
        </button>
      </div>
    </div>
  );
};

export default DepartmentPermissionsManager;
