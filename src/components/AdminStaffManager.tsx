import React, { useState } from 'react';
import { 
  Users, 
  UserCheck, 
  UserPlus, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Search, 
  Filter, 
  Building2, 
  Phone, 
  Mail, 
  FileText, 
  Paperclip, 
  Check, 
  X, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  History, 
  Briefcase,
  ShieldAlert,
  Send,
  Download,
  CreditCard
} from 'lucide-react';
import { Department, Employee, EmployeeRequest, TeamStaffAssignment } from '../types';
import { VolunteerProfileCardSection } from './VolunteerProfileCardSection';

interface AdminStaffManagerProps {
  departments: Department[];
  employees: Employee[];
  employeeRequests: EmployeeRequest[];
  teamStaffAssignments?: TeamStaffAssignment[];
  onApproveRequest: (requestId: string, reviewerName: string, notes?: string) => Promise<boolean>;
  onRejectRequest: (requestId: string, reviewerName: string, rejectionReason: string) => Promise<boolean>;
  onRequestModification: (requestId: string, reviewerName: string, modificationNotes: string) => Promise<boolean>;
}

export const AdminStaffManager: React.FC<AdminStaffManagerProps> = ({
  departments = [],
  employees = [],
  employeeRequests = [],
  teamStaffAssignments = [],
  onApproveRequest,
  onRejectRequest,
  onRequestModification
}) => {
  const [activeTab, setActiveTab] = useState<'requests' | 'employees'>('requests');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'needs_modification' | 'approved' | 'rejected'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);

  // Action Modals
  const [selectedRequest, setSelectedRequest] = useState<EmployeeRequest | null>(null);
  const [selectedEmployeeForCard, setSelectedEmployeeForCard] = useState<Employee | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'modify' | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter requests
  const filteredRequests = employeeRequests.filter(req => {
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    const matchesDept = departmentFilter === 'all' || req.departmentId === departmentFilter;
    const matchesSearch = 
      req.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.requestNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.nationalId && req.nationalId.includes(searchQuery));

    return matchesStatus && matchesDept && matchesSearch;
  });

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    const matchesDept = departmentFilter === 'all' || emp.departmentId === departmentFilter;
    const matchesSearch = 
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.nationalId && emp.nationalId.includes(searchQuery));

    return matchesDept && matchesSearch;
  });

  const pendingCount = employeeRequests.filter(r => r.status === 'pending').length;
  const needsModCount = employeeRequests.filter(r => r.status === 'needs_modification').length;
  const approvedCount = employeeRequests.filter(r => r.status === 'approved').length;
  const rejectedCount = employeeRequests.filter(r => r.status === 'rejected').length;

  const handleOpenAction = (req: EmployeeRequest, type: 'approve' | 'reject' | 'modify') => {
    setSelectedRequest(req);
    setActionType(type);
    setActionNotes('');
  };

  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !actionType) return;

    if (actionType === 'reject' && !actionNotes.trim()) {
      alert('يرجى كتابة سبب الرفض لتوضيحه لمدير الإدارة');
      return;
    }

    if (actionType === 'modify' && !actionNotes.trim()) {
      alert('يرجى توضيح البيانات والمستندات المطلوبة استكمالها وتعديلها');
      return;
    }

    setIsProcessing(true);
    try {
      if (actionType === 'approve') {
        await onApproveRequest(selectedRequest.id, 'الإدارة العليا للجمعية', actionNotes.trim());
      } else if (actionType === 'reject') {
        await onRejectRequest(selectedRequest.id, 'الإدارة العليا للجمعية', actionNotes.trim());
      } else if (actionType === 'modify') {
        await onRequestModification(selectedRequest.id, 'الإدارة العليا للجمعية', actionNotes.trim());
      }
      setSelectedRequest(null);
      setActionType(null);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Banner with Stats */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
                منظومة الموارد البشرية والكوادر
              </span>
              <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full font-mono">
                لوحة المراجعة والاعتماد
              </span>
            </div>
            <h2 className="text-lg font-black text-neutral-900 mt-1 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <span>إدارة طلبات توظيف الكوادر وسجل الموظفين العام</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              مراجعة طلبات التوظيف المرفوعة من مدراء الإدارات التنفيذية، والبت فيها بالقبول أو طلب الاستكمال أو الرفض
            </p>
          </div>

          <div className="flex items-center gap-2 bg-neutral-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'requests'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>طلبات الإضافة ({employeeRequests.length})</span>
              {pendingCount > 0 && (
                <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('employees')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'employees'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>سجل الموظفين العام ({employees.length})</span>
            </button>
          </div>
        </div>

        {/* Counter Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-neutral-100">
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 text-center">
            <span className="text-[11px] text-amber-800 font-bold block">طلبات بانتظار الاعتماد</span>
            <span className="text-xl font-black text-amber-900 font-mono">{pendingCount}</span>
          </div>
          <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3 text-center">
            <span className="text-[11px] text-blue-800 font-bold block">تحت التعديل والاستكمال</span>
            <span className="text-xl font-black text-blue-900 font-mono">{needsModCount}</span>
          </div>
          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 text-center">
            <span className="text-[11px] text-emerald-800 font-bold block">إجمالي الموظفين المعتمدين</span>
            <span className="text-xl font-black text-emerald-900 font-mono">{employees.length}</span>
          </div>
          <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-3 text-center">
            <span className="text-[11px] text-neutral-600 font-bold block">طلبات مرفوضة</span>
            <span className="text-xl font-black text-neutral-700 font-mono">{rejectedCount}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === 'requests' && (
            <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  statusFilter === 'all' ? 'bg-white text-emerald-800 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  statusFilter === 'pending' ? 'bg-amber-500 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                قيد المراجعة ({pendingCount})
              </button>
              <button
                onClick={() => setStatusFilter('needs_modification')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  statusFilter === 'needs_modification' ? 'bg-blue-600 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                طلب تعديل ({needsModCount})
              </button>
              <button
                onClick={() => setStatusFilter('approved')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  statusFilter === 'approved' ? 'bg-emerald-600 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                المعتمدة ({approvedCount})
              </button>
            </div>
          )}

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="bg-neutral-50 border border-neutral-200 text-neutral-800 text-xs rounded-xl px-3 py-2 font-bold focus:outline-hidden focus:border-emerald-600"
          >
            <option value="all">جميع الإدارات</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.nameAr}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute right-3 top-3 text-neutral-400" />
          <input
            type="text"
            placeholder="ابحث بالاسم، رقم الطلب، الهوية الوطنية..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pr-9 pl-3 py-2 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-hidden focus:border-emerald-600"
          />
        </div>
      </div>

      {/* TAB 1: EMPLOYEE REQUESTS LIST */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {filteredRequests.length > 0 ? (
            <div className="space-y-3">
              {filteredRequests.map((req) => {
                const isExpanded = expandedRequestId === req.id;
                return (
                  <div
                    key={req.id}
                    className={`bg-white border rounded-2xl transition-all overflow-hidden shadow-xs ${
                      req.status === 'pending'
                        ? 'border-amber-300'
                        : req.status === 'needs_modification'
                        ? 'border-blue-300'
                        : req.status === 'approved'
                        ? 'border-emerald-200'
                        : 'border-neutral-200'
                    }`}
                  >
                    {/* Header */}
                    <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            {req.requestNumber}
                          </span>
                          <span className="text-xs bg-neutral-100 text-neutral-700 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-neutral-500" />
                            <span>{req.departmentName}</span>
                          </span>
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                            req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                            req.status === 'needs_modification' ? 'bg-blue-100 text-blue-800' :
                            req.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {req.status === 'approved' ? 'معتمد ✓' :
                             req.status === 'needs_modification' ? 'مطلوب استكمال بيانات' :
                             req.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                          </span>
                          <span className="text-[10.5px] text-neutral-400 font-mono">
                            {req.createdAt ? new Date(req.createdAt).toLocaleDateString('ar-SA') : ''}
                          </span>
                        </div>

                        <h3 className="text-base font-black text-neutral-900">{req.candidateName}</h3>

                        <div className="flex items-center gap-3 text-xs text-neutral-500 flex-wrap">
                          <span>المسمى المرشح له: <strong className="text-neutral-800">{req.jobTitle}</strong></span>
                          <span>•</span>
                          <span>مقدم الطلب: <strong className="text-neutral-700">{req.requestedBy}</strong></span>
                          <span>•</span>
                          <span className="font-mono">هوية: {req.nationalId}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 self-end md:self-center flex-wrap">
                        {req.status === 'pending' && (
                          <>
                            <button
                              id={`btn-approve-request-${req.id}`}
                              onClick={() => handleOpenAction(req, 'approve')}
                              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>قبول واعتماد الموظف</span>
                            </button>
                            <button
                              id={`btn-modify-request-${req.id}`}
                              onClick={() => handleOpenAction(req, 'modify')}
                              className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>طلب تعديل بيانات</span>
                            </button>
                            <button
                              id={`btn-reject-request-${req.id}`}
                              onClick={() => handleOpenAction(req, 'reject')}
                              className="px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white font-bold text-xs rounded-xl border border-rose-200 transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>رفض الطلب</span>
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => setExpandedRequestId(isExpanded ? null : req.id)}
                          className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <span>{isExpanded ? 'طي التفاصيل' : 'التفاصيل'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Section */}
                    {isExpanded && (
                      <div className="p-4 sm:p-5 border-t border-neutral-100 bg-neutral-50/60 space-y-4 text-xs animate-fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="bg-white p-3 rounded-xl border border-neutral-200/80">
                            <span className="text-[10.5px] text-neutral-500 block">رقم الجوال:</span>
                            <span className="font-mono text-neutral-900 font-bold">{req.phone}</span>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-neutral-200/80">
                            <span className="text-[10.5px] text-neutral-500 block">البريد الإلكتروني:</span>
                            <span className="text-neutral-900">{req.email || '-'}</span>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-neutral-200/80">
                            <span className="text-[10.5px] text-neutral-500 block">المؤهل الأكاديمي:</span>
                            <span className="text-neutral-900 font-bold">{req.qualification || 'جامعي'}</span>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-neutral-200/80">
                            <span className="text-[10.5px] text-neutral-500 block">نوع التوظيف:</span>
                            <span className="text-neutral-900">
                              {req.employmentType === 'full_time' ? 'دوام كامل' :
                               req.employmentType === 'part_time' ? 'دوام جزئي' :
                               req.employmentType === 'volunteer_staff' ? 'كادر تطوعي معتمد' : 'عقد مؤقت'}
                            </span>
                          </div>
                        </div>

                        {req.notes && (
                          <div className="bg-white p-3.5 rounded-xl border border-neutral-200/80">
                            <strong className="text-neutral-700 block mb-1">مبررات وملاحظات مدير الإدارة:</strong>
                            <p className="text-neutral-600 leading-relaxed whitespace-pre-wrap">{req.notes}</p>
                          </div>
                        )}

                        {/* Documents */}
                        {req.documents && req.documents.length > 0 && (
                          <div>
                            <strong className="text-neutral-700 block mb-2 flex items-center gap-1.5">
                              <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
                              <span>المرفقات والوثائق الرسمية ({req.documents.length}):</span>
                            </strong>
                            <div className="flex flex-wrap gap-2">
                              {req.documents.map(doc => (
                                <div
                                  key={doc.id}
                                  className="bg-white border border-neutral-200 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs text-neutral-800"
                                >
                                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>{doc.title}</span>
                                  <span className="text-[10px] text-neutral-400 font-mono">({doc.fileName})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Modification notes or Rejection Reason if any */}
                        {req.modificationNotes && (
                          <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-xl text-blue-900 space-y-1">
                            <strong className="block text-blue-950 font-bold">توجيهات الاستكمال السابقة من الإدارة العليا:</strong>
                            <p className="text-xs text-blue-800">{req.modificationNotes}</p>
                          </div>
                        )}
                        {req.rejectionReason && (
                          <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl text-rose-900 space-y-1">
                            <strong className="block text-rose-950 font-bold">سبب الرفض المعتمد:</strong>
                            <p className="text-xs text-rose-800">{req.rejectionReason}</p>
                          </div>
                        )}

                        {/* Review History */}
                        {req.reviewHistory && req.reviewHistory.length > 0 && (
                          <div className="border-t border-neutral-200 pt-3">
                            <strong className="text-neutral-700 block mb-2 flex items-center gap-1.5">
                              <History className="w-3.5 h-3.5" />
                              <span>سجل الإجراءات والتدقيق:</span>
                            </strong>
                            <div className="space-y-1.5">
                              {req.reviewHistory.map((step, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-[11px] text-neutral-600">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                                  <div>
                                    <strong className="text-neutral-800">
                                      {step.action === 'submitted' ? 'تم الرفع من الإدارة' :
                                       step.action === 'resubmitted' ? 'إعادة الإرسال بعد التعديل' :
                                       step.action === 'approved' ? 'تم الاعتماد النهائي والتعيين' :
                                       step.action === 'needs_modification' ? 'طلب تعديل واستكمال' : 'رفض الطلب'}
                                    </strong>
                                    <span className="text-neutral-400 font-mono mx-1.5">({new Date(step.date).toLocaleDateString('ar-SA')})</span>
                                    <span>المسؤول: {step.performedBy}</span>
                                    {step.notes && <p className="text-neutral-500 mt-0.5">{step.notes}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center text-neutral-400 space-y-2">
              <FileText className="w-12 h-12 mx-auto text-neutral-300" />
              <p className="text-sm font-bold text-neutral-700">لا توجد طلبات تطابق معايير التصفية المحددة</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MASTER EMPLOYEES DIRECTORY */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          {filteredEmployees.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEmployees.map((emp) => {
                const assignedTeams = teamStaffAssignments.filter(
                  a => a.employeeId === emp.id && a.status === 'active'
                );
                return (
                  <div
                    key={emp.id}
                    className="bg-white border border-neutral-200/90 rounded-2xl p-5 hover:border-emerald-500 transition-all shadow-xs space-y-3.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-sm border border-emerald-100">
                          {emp.name.split(' ')[0][0]}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-neutral-900">{emp.name}</h4>
                          <span className="text-xs text-neutral-500 font-medium block">{emp.jobTitle}</span>
                        </div>
                      </div>
                      <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full font-mono font-bold border border-emerald-200">
                        {emp.employeeNumber}
                      </span>
                    </div>

                    <div className="bg-neutral-50 rounded-xl p-3 text-xs space-y-1.5 border border-neutral-100">
                      <div className="flex justify-between">
                        <span className="text-neutral-500">الإدارة التابع لها:</span>
                        <strong className="text-neutral-800">{emp.departmentName}</strong>
                      </div>
                      {emp.section && (
                        <div className="flex justify-between">
                          <span className="text-neutral-500">القسم / الوحدة:</span>
                          <span className="text-neutral-700">{emp.section}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-neutral-500">الهوية الوطنية:</span>
                        <span className="font-mono text-neutral-800">{emp.nationalId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">نوع التوظيف:</span>
                        <span className="text-neutral-700">
                          {emp.employmentType === 'full_time' ? 'دوام كامل' :
                           emp.employmentType === 'part_time' ? 'دوام جزئي' :
                           emp.employmentType === 'volunteer_staff' ? 'كادر تطوعي معتمد' : 'عقد مؤقت'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">المؤهل الأكاديمي:</span>
                        <span className="text-neutral-700">{emp.qualification || 'جامعي'}</span>
                      </div>
                    </div>

                    {/* Assigned Team Role (if any) */}
                    {assignedTeams.length > 0 && (
                      <div className="bg-emerald-50/70 border border-emerald-200 p-2.5 rounded-xl text-xs space-y-1">
                        <span className="text-[10.5px] text-emerald-800 font-bold block">المهام المسندة بالفرق الميدانية:</span>
                        {assignedTeams.map(t => (
                          <div key={t.id} className="text-[11px] text-emerald-950 font-bold flex items-center justify-between">
                            <span>فريق {t.teamName}</span>
                            <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded-sm">{t.teamRole}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1 border-t border-neutral-100">
                      <div className="flex items-center gap-1.5 font-mono">
                        <Phone className="w-3.5 h-3.5 text-neutral-400" />
                        <span>{emp.phone}</span>
                      </div>
                      <span className="text-emerald-700 font-bold">نشط معتمد ✓</span>
                    </div>

                    {/* Employee Card Button (Requirement 17) */}
                    <button
                      type="button"
                      onClick={() => setSelectedEmployeeForCard(emp)}
                      className="w-full mt-2 py-2 px-3 bg-neutral-100 hover:bg-emerald-50 hover:text-emerald-800 text-neutral-700 text-xs font-bold rounded-xl border border-neutral-200 hover:border-emerald-300 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                    >
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      <span>بطاقة الموظف الرسمية (عرض / تحميل)</span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center text-neutral-400 space-y-2">
              <Users className="w-12 h-12 mx-auto text-neutral-300" />
              <p className="text-sm font-bold text-neutral-700">لا يوجد موظفون يطابقون خيارات البحث والتصفية</p>
            </div>
          )}
        </div>
      )}

      {/* ACTION DIALOG MODAL (APPROVE / REJECT / REQUEST MODIFICATION) */}
      {selectedRequest && actionType && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in no-print">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 text-right space-y-4 shadow-xl border border-neutral-100 animate-scale-up" dir="rtl">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                {actionType === 'approve' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                {actionType === 'modify' && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                {actionType === 'reject' && <XCircle className="w-5 h-5 text-rose-600" />}
                <h3 className="text-base font-black text-neutral-900">
                  {actionType === 'approve' ? 'اعتماد وقبول طلب التوظيف' :
                   actionType === 'modify' ? 'طلب استكمال وتعديل بيانات المرشح' : 'رفض طلب التوظيف'}
                </h3>
              </div>
              <button
                onClick={() => { setSelectedRequest(null); setActionType(null); }}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Request Summary Box */}
            <div className="bg-neutral-50 p-3.5 rounded-xl text-xs space-y-1.5 border border-neutral-150">
              <div className="flex justify-between">
                <span className="text-neutral-500">رقم الطلب:</span>
                <span className="font-mono font-bold text-neutral-800">{selectedRequest.requestNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">اسم المرشح:</span>
                <strong className="text-neutral-900">{selectedRequest.candidateName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">الإدارة:</span>
                <span className="text-neutral-800">{selectedRequest.departmentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">الوظيفة:</span>
                <strong className="text-emerald-700">{selectedRequest.jobTitle}</strong>
              </div>
            </div>

            <form onSubmit={handleExecuteAction} className="space-y-4 text-xs">
              <div>
                <label className="text-neutral-700 font-bold block mb-1">
                  {actionType === 'approve' ? 'ملاحظات وتوجيهات الاعتماد (اختياري):' :
                   actionType === 'modify' ? 'التوجيهات والبيانات والمستندات المطلوب استكمالها (إلزامي) *:' :
                   'سبب رفض الطلب لإشعار مدير الإدارة (إلزامي) *:'}
                </label>
                <textarea
                  required={actionType !== 'approve'}
                  rows={3}
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder={
                    actionType === 'approve' ? 'أي ملاحظات إدارية ترغب بتسجيلها في قرار التعيين...' :
                    actionType === 'modify' ? 'وضح بالتفصيل ما يجب تعديله أو إرفاقه (مثال: يرجى إرفاق صورة طبق الأصل من شهادة التخرج)...' :
                    'اذكر الأسباب الإدارية للرفض...'
                  }
                  className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-800 focus:outline-hidden focus:border-emerald-600"
                />
              </div>

              {actionType === 'approve' && (
                <div className="p-3 bg-emerald-50 rounded-xl text-emerald-800 text-[11px] leading-relaxed">
                  عند الاعتماد، سيتم تلقائياً إصدار رقم وظيفي للمرشح وإضافته في سجل موظفي {selectedRequest.departmentName}، وإشعار مدير الإدارة بالاعتماد.
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className={`flex-1 py-2.5 font-bold rounded-xl text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs ${
                    actionType === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' :
                    actionType === 'modify' ? 'bg-amber-500 hover:bg-amber-600' :
                    'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isProcessing ? 'جاري التنفيذ...' :
                     actionType === 'approve' ? 'تأكيد اعتماد وتعيين الموظف' :
                     actionType === 'modify' ? 'إرسال طلب التعديل للمدير' : 'تأكيد رفض الطلب'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => { setSelectedRequest(null); setActionType(null); }}
                  className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Card Modal (Requirement 17) */}
      {selectedEmployeeForCard && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl border border-neutral-200 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <CreditCard className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-base font-black text-neutral-900">
                    بطاقة الموظف الرسمية: {selectedEmployeeForCard.name}
                  </h3>
                  <span className="text-[11px] text-neutral-500 font-medium">
                    الرقم الوظيفي: {selectedEmployeeForCard.employeeNumber} • {selectedEmployeeForCard.jobTitle}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedEmployeeForCard(null)}
                className="p-2 text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 rounded-xl transition-all cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <VolunteerProfileCardSection
              employee={selectedEmployeeForCard}
              category="employee"
              teams={[]}
              departments={departments}
              title={`بطاقة موظف معتمدة: ${selectedEmployeeForCard.name}`}
            />
          </div>
        </div>
      )}
    </div>
  );
};
