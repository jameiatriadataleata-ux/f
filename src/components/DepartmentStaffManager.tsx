import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Search, 
  FileText, 
  Briefcase, 
  Phone, 
  Mail, 
  Calendar, 
  Paperclip, 
  Plus, 
  Edit3, 
  Check, 
  X, 
  Info,
  Building,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  History,
  CreditCard
} from 'lucide-react';
import { Department, Employee, EmployeeRequest, EmployeeRequestDocument } from '../types';
import { VolunteerProfileCardSection } from './VolunteerProfileCardSection';

interface DepartmentStaffManagerProps {
  currentDepartment: Department;
  employees: Employee[];
  employeeRequests: EmployeeRequest[];
  onSubmitRequest: (reqData: Partial<EmployeeRequest>) => Promise<boolean>;
  onUpdateRequest: (reqData: Partial<EmployeeRequest>) => Promise<boolean>;
}

export const DepartmentStaffManager: React.FC<DepartmentStaffManagerProps> = ({
  currentDepartment,
  employees = [],
  employeeRequests = [],
  onSubmitRequest,
  onUpdateRequest
}) => {
  const [subTab, setSubTab] = useState<'employees' | 'requests'>('employees');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'needs_modification'>('all');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEmployeeForCard, setSelectedEmployeeForCard] = useState<Employee | null>(null);
  const [editingRequest, setEditingRequest] = useState<EmployeeRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);

  // Form states for Create/Edit Request
  const [candidateName, setCandidateName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [section, setSection] = useState('');
  const [employmentType, setEmploymentType] = useState('full_time');
  const [qualification, setQualification] = useState('بكالوريوس');
  const [hireDate, setHireDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [documents, setDocuments] = useState<EmployeeRequestDocument[]>([
    { id: 'doc-1', title: 'السيرة الذاتية (CV)', fileName: 'cv_candidate.pdf', fileUrl: '#' },
    { id: 'doc-2', title: 'صورة الهوية الوطنية', fileName: 'national_id_copy.pdf', fileUrl: '#' }
  ]);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocFileName, setNewDocFileName] = useState('');

  // Department filtered data
  const myEmployees = employees.filter(e => e.departmentId === currentDepartment.id);
  const myRequests = employeeRequests.filter(r => r.departmentId === currentDepartment.id);

  const pendingRequests = myRequests.filter(r => r.status === 'pending');
  const needsModRequests = myRequests.filter(r => r.status === 'needs_modification');
  const approvedRequests = myRequests.filter(r => r.status === 'approved');

  const filteredEmployees = myEmployees.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.nationalId && e.nationalId.includes(searchQuery)) ||
    e.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.employeeNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRequests = myRequests.filter(r => {
    const matchesSearch = 
      r.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.requestNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.jobTitle.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && r.status === statusFilter;
  });

  const handleOpenCreate = () => {
    setEditingRequest(null);
    setCandidateName('');
    setNationalId('');
    setPhone('');
    setEmail('');
    setJobTitle('');
    setSection('');
    setEmploymentType('full_time');
    setQualification('بكالوريوس');
    setHireDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setDocuments([
      { id: 'doc-1', title: 'السيرة الذاتية (CV)', fileName: 'cv_candidate.pdf', fileUrl: '#' },
      { id: 'doc-2', title: 'صورة الهوية الوطنية', fileName: 'national_id_copy.pdf', fileUrl: '#' }
    ]);
    setShowCreateModal(true);
  };

  const handleOpenEdit = (req: EmployeeRequest) => {
    setEditingRequest(req);
    setCandidateName(req.candidateName || '');
    setNationalId(req.nationalId || '');
    setPhone(req.phone || '');
    setEmail(req.email || '');
    setJobTitle(req.jobTitle || '');
    setSection(req.section || '');
    setEmploymentType(req.employmentType || 'full_time');
    setQualification(req.qualification || 'بكالوريوس');
    setHireDate(req.hireDate || new Date().toISOString().split('T')[0]);
    setNotes(req.notes || '');
    setDocuments(req.documents || [
      { id: 'doc-1', title: 'السيرة الذاتية (CV)', fileName: 'cv_candidate.pdf', fileUrl: '#' }
    ]);
    setShowCreateModal(true);
  };

  const handleAddDocument = () => {
    if (!newDocTitle.trim()) return;
    setDocuments(prev => [
      ...prev,
      {
        id: `doc-${Date.now()}`,
        title: newDocTitle.trim(),
        fileName: newDocFileName.trim() || `${newDocTitle.trim()}.pdf`,
        fileUrl: '#'
      }
    ]);
    setNewDocTitle('');
    setNewDocFileName('');
  };

  const handleRemoveDocument = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateName.trim() || !nationalId.trim() || !jobTitle.trim() || !phone.trim()) {
      alert('يرجى ملء جميع الحقول الإلزامية (اسم المرشح، رقم الهوية، المسمى الوظيفي، ورقم الجوال)');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingRequest) {
        // Update request (e.g. resubmit after needs_modification)
        const success = await onUpdateRequest({
          id: editingRequest.id,
          fullName: candidateName.trim(),
          candidateName: candidateName.trim(),
          nationalId: nationalId.trim(),
          phone: phone.trim(),
          email: email.trim(),
          jobTitle: jobTitle.trim(),
          section: section.trim(),
          employmentType,
          qualification,
          hireDate,
          notes: notes.trim(),
          documents
        });
        if (success) {
          setShowCreateModal(false);
          setEditingRequest(null);
        }
      } else {
        // Create new request
        const success = await onSubmitRequest({
          departmentId: currentDepartment.id,
          departmentName: currentDepartment.nameAr,
          requestedBy: currentDepartment.directorName || 'مدير الإدارة',
          fullName: candidateName.trim(),
          candidateName: candidateName.trim(),
          nationalId: nationalId.trim(),
          phone: phone.trim(),
          email: email.trim(),
          jobTitle: jobTitle.trim(),
          section: section.trim(),
          employmentType,
          qualification,
          hireDate,
          notes: notes.trim(),
          documents
        });
        if (success) {
          setShowCreateModal(false);
          setSubTab('requests');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: EmployeeRequest['status']) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-full text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>معتمد ومضاف ✓</span>
          </span>
        );
      case 'needs_modification':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-full text-xs font-bold animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>مطلوب تعديل واستكمال بيانات</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2.5 py-1 rounded-full text-xs font-bold">
            <XCircle className="w-3.5 h-3.5" />
            <span>مرفوض</span>
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2.5 py-1 rounded-full text-xs font-bold">
            <Clock className="w-3.5 h-3.5" />
            <span>قيد المراجعة الإدارية</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Action Bar & Stat Badges */}
      <div className="bg-emerald-900/30 border border-emerald-800/80 rounded-2xl p-5 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              <span>إدارة كوادر وموظفي {currentDepartment.nameAr}</span>
            </h2>
            <p className="text-xs text-emerald-300/80 mt-1">
              متابعة الموظفين المعتمدين ورفع طلبات التوظيف واستكمال الكوادر للإدارة العليا
            </p>
          </div>

          <button
            id="btn-create-employee-request"
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>رفع طلب إضافة موظف جديد</span>
          </button>
        </div>

        {/* Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-emerald-800/60">
          <div className="bg-emerald-950/60 border border-emerald-800/60 p-3 rounded-xl text-center">
            <span className="text-[11px] text-emerald-300/70 block">الموظفون المعتمدون</span>
            <span className="text-lg font-bold text-white font-mono">{myEmployees.length}</span>
          </div>
          <div className="bg-blue-950/40 border border-blue-800/40 p-3 rounded-xl text-center">
            <span className="text-[11px] text-blue-300/70 block">طلبات قيد المراجعة</span>
            <span className="text-lg font-bold text-blue-400 font-mono">{pendingRequests.length}</span>
          </div>
          <div className="bg-amber-950/40 border border-amber-800/40 p-3 rounded-xl text-center">
            <span className="text-[11px] text-amber-300/70 block">طلبات تحتاج تعديل</span>
            <span className="text-lg font-bold text-amber-400 font-mono">{needsModRequests.length}</span>
          </div>
          <div className="bg-emerald-900/60 border border-emerald-700/60 p-3 rounded-xl text-center">
            <span className="text-[11px] text-emerald-200/80 block">إجمالي الطلبات المرفوعة</span>
            <span className="text-lg font-bold text-emerald-300 font-mono">{myRequests.length}</span>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Switch */}
      <div className="flex items-center justify-between gap-4 flex-wrap border-b border-emerald-800/60 pb-3">
        <div className="flex gap-2">
          <button
            id="subtab-dept-employees"
            onClick={() => setSubTab('employees')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'employees'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-emerald-950/50 text-emerald-300 hover:bg-emerald-900/40'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>سجل موظفي الإدارة المعتمدين ({myEmployees.length})</span>
          </button>
          <button
            id="subtab-dept-requests"
            onClick={() => setSubTab('requests')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              subTab === 'requests'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-emerald-950/50 text-emerald-300 hover:bg-emerald-900/40'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>طلبات التوظيف ومتابعة الاعتماد ({myRequests.length})</span>
            {needsModRequests.length > 0 && (
              <span className="bg-amber-500 text-amber-950 font-black text-[10px] px-1.5 py-0.2 rounded-full animate-bounce">
                {needsModRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute right-3 top-3 text-emerald-400" />
          <input
            type="text"
            placeholder={subTab === 'employees' ? "ابحث بالاسم أو الهوية أو الوظيفة..." : "ابحث برقم الطلب أو اسم المرشح..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-emerald-950/60 border border-emerald-800/70 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-emerald-400/50 focus:outline-hidden focus:border-emerald-500 font-sans"
          />
        </div>
      </div>

      {/* VIEW 1: APPROVED EMPLOYEES */}
      {subTab === 'employees' && (
        <div className="space-y-4">
          {filteredEmployees.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEmployees.map((emp) => (
                <div
                  key={emp.id}
                  className="bg-emerald-900/25 border border-emerald-800/70 rounded-2xl p-4.5 hover:border-emerald-500/80 transition-all space-y-3.5 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white font-black text-sm shadow-md">
                        {emp.name.split(' ')[0][0]}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{emp.name}</h4>
                        <span className="text-[11px] text-emerald-300 font-medium">{emp.jobTitle}</span>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold border border-emerald-500/30">
                      {emp.employeeNumber}
                    </span>
                  </div>

                  <div className="bg-emerald-950/60 rounded-xl p-3 text-xs space-y-1.5 border border-emerald-800/50">
                    <div className="flex justify-between text-emerald-300/80">
                      <span>الهوية الوطنية:</span>
                      <span className="font-mono text-white font-bold">{emp.nationalId}</span>
                    </div>
                    {emp.section && (
                      <div className="flex justify-between text-emerald-300/80">
                        <span>الوحدة / القسم:</span>
                        <span className="text-white">{emp.section}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-emerald-300/80">
                      <span>نوع التوظيف:</span>
                      <span className="text-white">
                        {emp.employmentType === 'full_time' ? 'دوام كامل' :
                         emp.employmentType === 'part_time' ? 'دوام جزئي' :
                         emp.employmentType === 'volunteer_staff' ? 'كادر تطوعي معتمد' : 'عقد مؤقت'}
                      </span>
                    </div>
                    <div className="flex justify-between text-emerald-300/80">
                      <span>المؤهل:</span>
                      <span className="text-white">{emp.qualification || 'جامعي'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-emerald-300/80 pt-1 border-t border-emerald-800/40">
                    <div className="flex items-center gap-1.5 font-mono">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{emp.phone}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                      <span className="text-emerald-300 font-bold">على رأس العمل</span>
                    </div>
                  </div>

                  {/* Employee Card Button (Requirement 17) */}
                  <button
                    type="button"
                    onClick={() => setSelectedEmployeeForCard(emp)}
                    className="w-full mt-2 py-2 px-3 bg-emerald-800/40 hover:bg-emerald-700/50 text-emerald-200 text-xs font-bold rounded-xl border border-emerald-700/60 hover:border-emerald-500 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    <span>بطاقة الموظف الرسمية (عرض / تحميل)</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-emerald-900/20 border border-emerald-800/50 rounded-2xl p-12 text-center text-emerald-300/60 space-y-3">
              <Users className="w-12 h-12 mx-auto text-emerald-500/40" />
              <p className="text-sm font-bold text-white">لا يوجد موظفون مطابقون لبحثك حالياً</p>
              <p className="text-xs">يمكنك رفع طلب توظيف جديد عبر زر "رفع طلب إضافة موظف جديد" أعلاه.</p>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: EMPLOYEE REQUESTS */}
      {subTab === 'requests' && (
        <div className="space-y-4">
          {/* Status filter bar */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'all' ? 'bg-emerald-600 text-white' : 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/50'
              }`}
            >
              الكل ({myRequests.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'pending' ? 'bg-blue-600 text-white' : 'bg-emerald-950/60 text-blue-300 hover:bg-emerald-900/50'
              }`}
            >
              قيد المراجعة ({pendingRequests.length})
            </button>
            <button
              onClick={() => setStatusFilter('needs_modification')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'needs_modification' ? 'bg-amber-600 text-white' : 'bg-emerald-950/60 text-amber-300 hover:bg-emerald-900/50'
              }`}
            >
              تحتاج تعديل ({needsModRequests.length})
            </button>
            <button
              onClick={() => setStatusFilter('approved')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'approved' ? 'bg-emerald-600 text-white' : 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/50'
              }`}
            >
              المعتمدة ({approvedRequests.length})
            </button>
          </div>

          {filteredRequests.length > 0 ? (
            <div className="space-y-3">
              {filteredRequests.map((req) => {
                const isExpanded = expandedRequestId === req.id;
                return (
                  <div
                    key={req.id}
                    className={`bg-emerald-900/25 border rounded-2xl transition-all overflow-hidden ${
                      req.status === 'needs_modification'
                        ? 'border-amber-500/70 bg-amber-950/20'
                        : req.status === 'approved'
                        ? 'border-emerald-600/70'
                        : 'border-emerald-800/70'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-mono text-xs text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-800">
                            {req.requestNumber}
                          </span>
                          {getStatusBadge(req.status)}
                          <span className="text-[11px] text-emerald-300/70 font-mono">
                            {req.createdAt ? new Date(req.createdAt).toLocaleDateString('ar-SA') : ''}
                          </span>
                        </div>
                        <h3 className="text-base font-black text-white mt-1">{req.candidateName}</h3>
                        <p className="text-xs text-emerald-200/90 flex items-center gap-2">
                          <span>المسمى المرشح له: <strong>{req.jobTitle}</strong></span>
                          {req.section && <span>• الوحدة: {req.section}</span>}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center">
                        {req.status === 'needs_modification' && (
                          <button
                            id={`btn-edit-request-${req.id}`}
                            onClick={() => handleOpenEdit(req)}
                            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-amber-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer animate-pulse"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>تعديل واستكمال الطلب</span>
                          </button>
                        )}
                        <button
                          onClick={() => setExpandedRequestId(isExpanded ? null : req.id)}
                          className="px-3 py-2 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 text-xs font-bold rounded-xl border border-emerald-800/70 transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <span>{isExpanded ? 'طي التفاصيل' : 'عرض التفاصيل'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Needs Modification Attention Box */}
                    {req.status === 'needs_modification' && req.modificationNotes && (
                      <div className="mx-4 mb-4 bg-amber-950/60 border border-amber-500/70 p-3.5 rounded-xl text-xs space-y-1 text-amber-200">
                        <div className="flex items-center gap-2 font-bold text-amber-300">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>ملاحظات وتوجيهات الإدارة العليا لاستكمال الطلب:</span>
                        </div>
                        <p className="text-amber-100 pr-6 leading-relaxed whitespace-pre-wrap">{req.modificationNotes}</p>
                      </div>
                    )}

                    {/* Rejection Attention Box */}
                    {req.status === 'rejected' && req.rejectionReason && (
                      <div className="mx-4 mb-4 bg-rose-950/60 border border-rose-500/70 p-3.5 rounded-xl text-xs space-y-1 text-rose-200">
                        <div className="flex items-center gap-2 font-bold text-rose-300">
                          <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>سبب رفض الطلب من الإدارة العليا:</span>
                        </div>
                        <p className="text-rose-100 pr-6 leading-relaxed whitespace-pre-wrap">{req.rejectionReason}</p>
                      </div>
                    )}

                    {/* Expandable Details */}
                    {isExpanded && (
                      <div className="p-4 sm:p-5 border-t border-emerald-800/60 bg-emerald-950/40 space-y-4 text-xs animate-fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          <div className="bg-emerald-900/40 p-3 rounded-xl border border-emerald-800/50">
                            <span className="text-[10.5px] text-emerald-300/70 block">رقم الهوية / الإقامة:</span>
                            <span className="font-mono text-white font-bold">{req.nationalId}</span>
                          </div>
                          <div className="bg-emerald-900/40 p-3 rounded-xl border border-emerald-800/50">
                            <span className="text-[10.5px] text-emerald-300/70 block">رقم الجوال:</span>
                            <span className="font-mono text-white font-bold">{req.phone}</span>
                          </div>
                          <div className="bg-emerald-900/40 p-3 rounded-xl border border-emerald-800/50">
                            <span className="text-[10.5px] text-emerald-300/70 block">البريد الإلكتروني:</span>
                            <span className="text-white">{req.email || '-'}</span>
                          </div>
                          <div className="bg-emerald-900/40 p-3 rounded-xl border border-emerald-800/50">
                            <span className="text-[10.5px] text-emerald-300/70 block">المؤهل العلمي:</span>
                            <span className="text-white font-bold">{req.qualification || 'جامعي'}</span>
                          </div>
                          <div className="bg-emerald-900/40 p-3 rounded-xl border border-emerald-800/50">
                            <span className="text-[10.5px] text-emerald-300/70 block">نوع التوظيف:</span>
                            <span className="text-white">
                              {req.employmentType === 'full_time' ? 'دوام كامل' :
                               req.employmentType === 'part_time' ? 'دوام جزئي' :
                               req.employmentType === 'volunteer_staff' ? 'كادر تطوعي معتمد' : 'عقد مؤقت'}
                            </span>
                          </div>
                          <div className="bg-emerald-900/40 p-3 rounded-xl border border-emerald-800/50">
                            <span className="text-[10.5px] text-emerald-300/70 block">تاريخ المباشرة المتوقع:</span>
                            <span className="font-mono text-white">{req.hireDate || '-'}</span>
                          </div>
                        </div>

                        {/* Justification & Notes */}
                        {req.notes && (
                          <div className="bg-emerald-900/30 p-3.5 rounded-xl border border-emerald-800/50">
                            <strong className="text-emerald-300 block mb-1">المبررات الإدارية وملاحظات القسم:</strong>
                            <p className="text-emerald-100/90 leading-relaxed whitespace-pre-wrap">{req.notes}</p>
                          </div>
                        )}

                        {/* Documents */}
                        {req.documents && req.documents.length > 0 && (
                          <div>
                            <strong className="text-emerald-300 block mb-2 flex items-center gap-1.5">
                              <Paperclip className="w-3.5 h-3.5" />
                              <span>المرفقات والوثائق ({req.documents.length}):</span>
                            </strong>
                            <div className="flex flex-wrap gap-2">
                              {req.documents.map(doc => (
                                <div
                                  key={doc.id}
                                  className="bg-emerald-950 border border-emerald-800 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs text-emerald-200"
                                >
                                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>{doc.title}</span>
                                  <span className="text-[10px] text-emerald-400/60 font-mono">({doc.fileName})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Review History */}
                        {req.reviewHistory && req.reviewHistory.length > 0 && (
                          <div className="border-t border-emerald-800/50 pt-3">
                            <strong className="text-emerald-300 block mb-2 flex items-center gap-1.5">
                              <History className="w-3.5 h-3.5" />
                              <span>سجل مراجعة الطلب والمتابعة:</span>
                            </strong>
                            <div className="space-y-1.5">
                              {req.reviewHistory.map((step, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-[11px] text-emerald-200/80">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
                                  <div>
                                    <span className="font-bold text-white">
                                      {step.action === 'submitted' ? 'تم رفع الطلب' :
                                       step.action === 'resubmitted' ? 'تمت إعادة الإرسال بعد التعديل' :
                                       step.action === 'approved' ? 'تم الاعتماد والتوظيف' :
                                       step.action === 'needs_modification' ? 'طلب استكمال بيانات' : 'رفض الطلب'}
                                    </span>
                                    <span className="text-emerald-400/70 font-mono mx-1.5">({new Date(step.date).toLocaleDateString('ar-SA')})</span>
                                    <span>بواسطة: {step.performedBy}</span>
                                    {step.notes && <p className="text-emerald-300/70 mt-0.5">{step.notes}</p>}
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
            <div className="bg-emerald-900/20 border border-emerald-800/50 rounded-2xl p-12 text-center text-emerald-300/60 space-y-3">
              <FileText className="w-12 h-12 mx-auto text-emerald-500/40" />
              <p className="text-sm font-bold text-white">لا توجد طلبات توظيف تطابق المعايير</p>
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer mt-2"
              >
                رفع طلب توظيف جديد
              </button>
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT REQUEST MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 animate-fade-in no-print overflow-y-auto">
          <div className="bg-emerald-950 border border-emerald-700/80 rounded-2xl max-w-2xl w-full p-6 text-right space-y-5 shadow-2xl animate-scale-up my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-emerald-800/80 pb-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-emerald-400" />
                  <span>{editingRequest ? 'تعديل واستكمال بيانات طلب التوظيف' : 'رفع طلب إضافة موظف / كادر جديد للإدارة'}</span>
                </h3>
                <p className="text-xs text-emerald-300/80 mt-0.5">
                  يرفع هذا الطلب للإدارة العليا ومجلس الإدارة للمراجعة والاعتماد الرسمي
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-emerald-400 hover:text-white hover:bg-emerald-900/60 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* If editing after needs modification, show the notes */}
            {editingRequest && editingRequest.modificationNotes && (
              <div className="bg-amber-950/60 border border-amber-500/80 p-3.5 rounded-xl text-xs space-y-1 text-amber-200">
                <strong className="text-amber-300 block">توجيهات وملاحظات المراجعة المطلوبة:</strong>
                <p className="text-amber-100">{editingRequest.modificationNotes}</p>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-emerald-300 font-bold block mb-1">اسم المرشح الثلاثي / الرباعي *</label>
                  <input
                    type="text"
                    required
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    placeholder="مثال: عبدالمجيد طلال الصاعدي"
                    className="w-full bg-emerald-900/40 border border-emerald-700/70 rounded-xl px-3 py-2 text-white placeholder-emerald-400/40 focus:outline-hidden focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-emerald-300 font-bold block mb-1">رقم الهوية الوطنية / الإقامة (10 أرقام) *</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="مثال: 1087654321"
                    className="w-full bg-emerald-900/40 border border-emerald-700/70 rounded-xl px-3 py-2 text-white font-mono placeholder-emerald-400/40 focus:outline-hidden focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-emerald-300 font-bold block mb-1">المسمى الوظيفي المرشح له *</label>
                  <input
                    type="text"
                    required
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="مثال: أخصائي إعلام رقمي، منسق مبادرات..."
                    className="w-full bg-emerald-900/40 border border-emerald-700/70 rounded-xl px-3 py-2 text-white placeholder-emerald-400/40 focus:outline-hidden focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-emerald-300 font-bold block mb-1">الوحدة الإدارية / القسم التابع له</label>
                  <input
                    type="text"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    placeholder="مثال: قسم التصوير والتوثيق"
                    className="w-full bg-emerald-900/40 border border-emerald-700/70 rounded-xl px-3 py-2 text-white placeholder-emerald-400/40 focus:outline-hidden focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-emerald-300 font-bold block mb-1">رقم الجوال للتواصل *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="مثال: 0551234567"
                    className="w-full bg-emerald-900/40 border border-emerald-700/70 rounded-xl px-3 py-2 text-white font-mono placeholder-emerald-400/40 focus:outline-hidden focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-emerald-300 font-bold block mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@riadataleata.org.sa"
                    className="w-full bg-emerald-900/40 border border-emerald-700/70 rounded-xl px-3 py-2 text-white placeholder-emerald-400/40 focus:outline-hidden focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-emerald-300 font-bold block mb-1">نوع التوظيف / الارتباط</label>
                  <select
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value)}
                    className="w-full bg-emerald-900/40 border border-emerald-700/70 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-emerald-400"
                  >
                    <option value="full_time" className="bg-emerald-950 text-white">دوام كامل</option>
                    <option value="part_time" className="bg-emerald-950 text-white">دوام جزئي</option>
                    <option value="contractor" className="bg-emerald-950 text-white">عقد خدمات مؤقت</option>
                    <option value="volunteer_staff" className="bg-emerald-950 text-white">كادر إداري تطوعي معتمد</option>
                  </select>
                </div>

                <div>
                  <label className="text-emerald-300 font-bold block mb-1">المؤهل الأكاديمي</label>
                  <select
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    className="w-full bg-emerald-900/40 border border-emerald-700/70 rounded-xl px-3 py-2 text-white focus:outline-hidden focus:border-emerald-400"
                  >
                    <option value="دكتوراه" className="bg-emerald-950 text-white">دكتوراه</option>
                    <option value="ماجستير" className="bg-emerald-950 text-white">ماجستير</option>
                    <option value="بكالوريوس" className="bg-emerald-950 text-white">بكالوريوس</option>
                    <option value="دبلوم عالي" className="bg-emerald-950 text-white">دبلوم عالي</option>
                    <option value="دبلوم" className="bg-emerald-950 text-white">دبلوم</option>
                    <option value="ثانوي" className="bg-emerald-950 text-white">ثانوي</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-emerald-300 font-bold block mb-1">ملاحظات ومبررات طلب الإضافة للإدارة العليا</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="بيان مدى الحاجة للوظيفة، الخبرات والمهارات التي يتمتع بها المرشح، وأثر ذلك على الإدارة..."
                  className="w-full bg-emerald-900/40 border border-emerald-700/70 rounded-xl px-3 py-2 text-white placeholder-emerald-400/40 focus:outline-hidden focus:border-emerald-400"
                />
              </div>

              {/* Attachments Section */}
              <div className="bg-emerald-900/30 p-3.5 rounded-xl border border-emerald-800/60 space-y-2.5">
                <span className="text-emerald-300 font-bold block">المرفقات والوثائق الداعمة للطلب:</span>
                
                <div className="flex flex-wrap gap-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="bg-emerald-950 border border-emerald-700/70 px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-xs text-emerald-200"
                    >
                      <Paperclip className="w-3 h-3 text-emerald-400" />
                      <span>{doc.title}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDocument(doc.id)}
                        className="text-rose-400 hover:text-rose-200 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="عنوان المستند (مثال: شهادة الخبرة)..."
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                    className="flex-1 bg-emerald-950/80 border border-emerald-700/50 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-emerald-400/40 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleAddDocument}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-all cursor-pointer"
                  >
                    إرفاق
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-emerald-800/70">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'جاري الإرسال...' : editingRequest ? 'تحديث وإعادة إرسال الطلب' : 'رفع الطلب للاعتماد'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 bg-emerald-900/60 hover:bg-emerald-800/60 text-emerald-200 font-bold rounded-xl transition-all cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl border border-neutral-200 space-y-4 max-h-[92vh] overflow-y-auto text-neutral-900">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-150">
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
              departments={[currentDepartment]}
              title={`بطاقة موظف معتمدة: ${selectedEmployeeForCard.name}`}
            />
          </div>
        </div>
      )}
    </div>
  );
};
