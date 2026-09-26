import React, { useState, useRef, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  FileText, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Download, 
  Check, 
  X, 
  Trash2, 
  Eye, 
  HelpCircle,
  Users,
  Barcode,
  ArrowRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import { Beneficiary } from '../types';

// Set up pdfjs worker
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
} catch (e) {
  console.warn("Could not set PDF worker src:", e);
}

interface BeneficiariesImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingBeneficiaries: Beneficiary[];
  onImportConfirm: (beneficiaries: Partial<Beneficiary>[], fileType: 'excel' | 'pdf') => Promise<boolean>;
  lang?: 'ar' | 'en';
}

interface ParsedRow {
  index: number;
  name: string;
  nationalId: string;
  phone: string;
  familySize: number;
  address: string;
  category: string;
  beneficiaryNumber?: string;
  barcodeId?: string;
  notes?: string;
  status: 'valid' | 'duplicate' | 'incomplete';
  statusReason: string;
  raw: any;
}

export const BeneficiariesImportModal: React.FC<BeneficiariesImportModalProps> = ({
  isOpen,
  onClose,
  existingBeneficiaries = [],
  onImportConfirm,
  lang = 'ar'
}) => {
  // Step: 1 = choose type, 2 = upload & parse, 3 = preview & map & approve
  const [selectedFileType, setSelectedFileType] = useState<'excel' | 'pdf'>('excel');
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [filterPreview, setFilterPreview] = useState<'all' | 'new' | 'duplicate' | 'incomplete'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Download Sample Excel Template
  const handleDownloadSampleExcel = () => {
    const sampleData = [
      {
        "الاسم الكامل": "عبد الله بن محمد الحارثي",
        "رقم الهوية الوطنية": "1087654321",
        "رقم الجوال": "0551234567",
        "عدد أفراد الأسرة": 5,
        "العنوان والحي": "مكة المكرمة - العسيلة - مخطط 1",
        "فئة الاستحقاق": "أسر متعففة",
        "ملاحظات": "مستفيد معتمد - مستحق للسلال الغذائية والكسوة"
      },
      {
        "الاسم الكامل": "نورة بنت سعد العتيبي",
        "رقم الهوية الوطنية": "1098761234",
        "رقم الجوال": "0559876543",
        "عدد أفراد الأسرة": 3,
        "العنوان والحي": "مكة المكرمة - العسيلة - جوار المسجد الكبير",
        "فئة الاستحقاق": "أرامل وأيتام",
        "ملاحظات": "أرملة تعول طفلين"
      },
      {
        "الاسم الكامل": "منصور بن سالم الزهراني",
        "رقم الهوية الوطنية": "1045612378",
        "رقم الجوال": "0503344556",
        "عدد أفراد الأسرة": 2,
        "العنوان والحي": "مكة المكرمة - العسيلة - الشارع العام",
        "فئة الاستحقاق": "كبار السن ومرضى",
        "ملاحظات": "مستفيد مسن يحتاج رعاية وسلال دورية"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المستفيدين");
    XLSX.writeFile(wb, "نموذج_استيراد_بيانات_المستفيدين_ريادة_العطاء.xlsx");
  };

  // Normalization helper
  const normalizeText = (text: string) => {
    return (text || "").toString().trim().toLowerCase();
  };

  // Process rows against existing DB for deduplication & missing check
  const processAndValidateRows = (rawList: any[]): ParsedRow[] => {
    const existingIds = new Set(existingBeneficiaries.map(b => (b.nationalId || "").trim()));
    const existingBenNums = new Set(existingBeneficiaries.map(b => (b.beneficiaryNumber || "").trim().toLowerCase()));
    const existingBarcodes = new Set(existingBeneficiaries.map(b => (b.barcodeId || "").trim().toUpperCase()));

    return rawList.map((item, idx) => {
      // Field mapping logic
      const name = (
        item["الاسم الكامل"] || 
        item["الاسم"] || 
        item["اسم المستفيد"] || 
        item["name"] || 
        item["fullName"] || 
        item["المستفيد"] || 
        ""
      ).toString().trim();

      const nationalId = (
        item["رقم الهوية الوطنية"] || 
        item["رقم الهوية"] || 
        item["السجل المدني"] || 
        item["الإقامة"] || 
        item["nationalId"] || 
        item["idNumber"] || 
        ""
      ).toString().replace(/\D/g, '').trim();

      const phone = (
        item["رقم الجوال"] || 
        item["الجوال"] || 
        item["رقم الهاتف"] || 
        item["الهاتف"] || 
        item["phone"] || 
        item["mobile"] || 
        ""
      ).toString().trim();

      const rawFamily = item["عدد أفراد الأسرة"] || item["أفراد الأسرة"] || item["الأسرة"] || item["familySize"] || 1;
      const familySize = parseInt(String(rawFamily), 10) || 1;

      const address = (
        item["العنوان والحي"] || 
        item["العنوان"] || 
        item["الحي"] || 
        item["address"] || 
        item["city"] || 
        "مكة المكرمة - العسيلة"
      ).toString().trim();

      const category = (
        item["فئة الاستحقاق"] || 
        item["الفئة"] || 
        item["التصنيف"] || 
        item["category"] || 
        "أسر متعففة"
      ).toString().trim();

      const beneficiaryNumber = (item["رقم المستفيد"] || item["beneficiaryNumber"] || "").toString().trim();
      const barcodeId = (item["رمز الباركود"] || item["الباركود"] || item["barcodeId"] || "").toString().trim();
      const notes = (item["ملاحظات"] || item["notes"] || "").toString().trim();

      // Check completeness
      let status: 'valid' | 'duplicate' | 'incomplete' = 'valid';
      let statusReason = '✨ مستفيد جديد (سيتم إنشاء باركود فريد تلقائياً)';

      if (!name || name.length < 3) {
        status = 'incomplete';
        statusReason = '⚠️ الاسم ناقص أو غير صالح';
      } else if (!nationalId || nationalId.length < 9) {
        status = 'incomplete';
        statusReason = '⚠️ رقم الهوية الوطنية مفقود أو غير صحيح (يجب 10 أرقام)';
      } else if (
        existingIds.has(nationalId) || 
        (beneficiaryNumber && existingBenNums.has(beneficiaryNumber.toLowerCase())) ||
        (barcodeId && existingBarcodes.has(barcodeId.toUpperCase()))
      ) {
        status = 'duplicate';
        statusReason = '🔄 مستفيد مسجل مسبقاً (سيتم تحديث البيانات مع الحفاظ على باركوده الدائم)';
      }

      return {
        index: idx + 1,
        name,
        nationalId,
        phone,
        familySize,
        address,
        category,
        beneficiaryNumber,
        barcodeId,
        notes,
        status,
        statusReason,
        raw: item
      };
    });
  };

  // Parse Excel File
  const handleParseExcel = async (file: File) => {
    setIsProcessing(true);
    setParseError(null);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (!jsonData || jsonData.length === 0) {
        throw new Error("ملف الإكسل فارغ أو لا يحتوي على صفوف بيانات قابلة للقراءة.");
      }

      const validated = processAndValidateRows(jsonData);
      setParsedRows(validated);
    } catch (err: any) {
      console.error("Excel parse error:", err);
      setParseError(err?.message || "حدث خطأ أثناء قراءة ملف الإكسل. يرجى التأكد من سلامة الملف.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Parse PDF File
  const handleParsePdf = async (file: File) => {
    setIsProcessing(true);
    setParseError(null);
    try {
      const buffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: buffer });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;

      let extractedRows: any[] = [];

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Group items by vertical position (Y coordinate) to reconstruct table lines
        const items = textContent.items as any[];
        const lineMap = new Map<number, string[]>();

        items.forEach(item => {
          if (!item.str || !item.str.trim()) return;
          const y = Math.round(item.transform[5]); // Y coordinate
          
          // Find if there is a line with close Y within 4 pixels
          let matchedKey = Array.from(lineMap.keys()).find(k => Math.abs(k - y) <= 4);
          if (matchedKey === undefined) {
            matchedKey = y;
            lineMap.set(matchedKey, []);
          }
          lineMap.get(matchedKey)!.push(item.str.trim());
        });

        // Sort lines from top to bottom
        const sortedKeys = Array.from(lineMap.keys()).sort((a, b) => b - a);

        sortedKeys.forEach(k => {
          const cells = lineMap.get(k) || [];
          const fullLine = cells.join(" ");

          // Regex to detect National ID (10 digits starting with 1 or 2)
          const nationalIdMatch = fullLine.match(/\b([12]\d{9})\b/);
          // Regex to detect Saudi phone number (05xxxxxxxx)
          const phoneMatch = fullLine.match(/\b(05\d{8})\b/);
          // Regex to detect family size (1 to 2 digits isolated)
          const familyMatch = fullLine.match(/\b([1-9]|1\d)\b/);

          if (nationalIdMatch) {
            // Reconstruct candidate row
            const nationalId = nationalIdMatch[1];
            const phone = phoneMatch ? phoneMatch[1] : "";
            
            // Filter out the ID, phone, numbers from line to isolate the name and address
            const cleanedTokens = cells.filter(token => 
              token !== nationalId && 
              (!phone || token !== phone) &&
              !token.includes("الهوية") &&
              !token.includes("المستفيد") &&
              !token.includes("الاسم") &&
              !token.includes("الرقم")
            );

            const name = cleanedTokens[0] || `مستفيد (هوية ${nationalId})`;
            const address = cleanedTokens.slice(1).join(" ") || "مكة المكرمة - العسيلة";

            extractedRows.push({
              "الاسم الكامل": name,
              "رقم الهوية الوطنية": nationalId,
              "رقم الجوال": phone,
              "عدد أفراد الأسرة": familyMatch ? parseInt(familyMatch[1], 10) : 4,
              "العنوان والحي": address,
              "فئة الاستحقاق": "أسر متعففة"
            });
          }
        });
      }

      if (extractedRows.length === 0) {
        throw new Error("لم يتم العثور على جداول أو سجلات هوية واضحة في ملف الـ PDF. يرجى التأكد من أن الملف نصي ويحتوي على أرقام هويات وأسماء المستفيدين، أو استخدام صيغة Excel لتنظيم البيانات بدقة أعلى.");
      }

      const validated = processAndValidateRows(extractedRows);
      setParsedRows(validated);
    } catch (err: any) {
      console.error("PDF parse error:", err);
      setParseError(err?.message || "تعذر قراءة جداول ملف PDF. يرجى تجربة ملف Excel أو التأكد من سلامة الـ PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);

    if (selectedFileType === 'excel') {
      handleParseExcel(selected);
    } else {
      handleParsePdf(selected);
    }
  };

  // Remove a row before import
  const handleRemoveRow = (index: number) => {
    setParsedRows(prev => prev.filter(r => r.index !== index));
  };

  // Filtered rows for preview
  const filteredRows = useMemo(() => {
    if (filterPreview === 'all') return parsedRows;
    if (filterPreview === 'new') return parsedRows.filter(r => r.status === 'valid');
    if (filterPreview === 'duplicate') return parsedRows.filter(r => r.status === 'duplicate');
    if (filterPreview === 'incomplete') return parsedRows.filter(r => r.status === 'incomplete');
    return parsedRows;
  }, [parsedRows, filterPreview]);

  // Counts
  const counts = useMemo(() => {
    const total = parsedRows.length;
    const newItems = parsedRows.filter(r => r.status === 'valid').length;
    const duplicates = parsedRows.filter(r => r.status === 'duplicate').length;
    const incomplete = parsedRows.filter(r => r.status === 'incomplete').length;
    return { total, newItems, duplicates, incomplete };
  }, [parsedRows]);

  // Execute Import
  const handleConfirmImport = async () => {
    const validRowsToImport = parsedRows.filter(r => r.status !== 'incomplete');
    if (validRowsToImport.length === 0) {
      alert("لا يوجد صفوف صالحة للاستيراد. يرجى تصحيح الصفوف الناقصة.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<Beneficiary>[] = validRowsToImport.map(r => ({
        name: r.name,
        nationalId: r.nationalId,
        phone: r.phone,
        familySize: r.familySize,
        address: r.address,
        category: r.category,
        beneficiaryNumber: r.beneficiaryNumber,
        barcodeId: r.barcodeId,
        notes: r.notes,
        status: 'approved'
      }));

      const success = await onImportConfirm(payload, selectedFileType);
      if (success) {
        setImportSuccessMessage(`تم استيراد وحفظ ${payload.length} مستفيد بنجاح! تم تعيين باركود فريد وثابت لكل مستفيد جديد.`);
        setTimeout(() => {
          onClose();
          // Reset states
          setFile(null);
          setParsedRows([]);
          setImportSuccessMessage(null);
        }, 1800);
      }
    } catch (err: any) {
      alert("حدث خطأ أثناء الاستيراد: " + (err?.message || "خطأ غير متوقع"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedRows([]);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div 
        className="relative bg-white dark:bg-neutral-900 rounded-3xl max-w-4xl w-full p-5 sm:p-7 shadow-2xl border border-neutral-100 dark:border-neutral-800 text-right max-h-[92vh] flex flex-col"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-neutral-900 dark:text-white">
                استيراد بيانات المستفيدين الذكي
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                رفع ملفات Excel أو PDF مع تعيين باركود دائم لكل مستفيد ومنع التكرار
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="py-4 space-y-5 overflow-y-auto flex-1 pr-1">
          {importSuccessMessage ? (
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-black text-emerald-700 dark:text-emerald-400">
                اكتمل الاستيراد بنجاح!
              </h4>
              <p className="text-sm text-neutral-600 dark:text-neutral-300 max-w-md mx-auto">
                {importSuccessMessage}
              </p>
            </div>
          ) : parsedRows.length === 0 ? (
            /* Step 1 & 2: Select Type & Upload File */
            <div className="space-y-6">
              {/* File Type Selection */}
              <div>
                <label className="block text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-2">
                  1. اختر نوع الملف المراد رفعه:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <button
                    type="button"
                    onClick={() => { setSelectedFileType('excel'); handleReset(); }}
                    className={`p-4 rounded-2xl border-2 text-right transition-all cursor-pointer flex items-start gap-3.5 ${
                      selectedFileType === 'excel'
                        ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs'
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl ${selectedFileType === 'excel' ? 'bg-emerald-600 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'}`}>
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-black text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                        <span>رفع ملف Excel (.xlsx, .xls)</span>
                        {selectedFileType === 'excel' && <span className="text-xs text-emerald-600 font-bold">✓ محدد</span>}
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                        الصيغة المثالية والموصى بها لاستيراد جداول المستفيدين الكبيرة وربط الأعمدة تلقائيًا.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setSelectedFileType('pdf'); handleReset(); }}
                    className={`p-4 rounded-2xl border-2 text-right transition-all cursor-pointer flex items-start gap-3.5 ${
                      selectedFileType === 'pdf'
                        ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs'
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl ${selectedFileType === 'pdf' ? 'bg-emerald-600 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'}`}>
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-black text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                        <span>رفع ملف PDF (.pdf)</span>
                        {selectedFileType === 'pdf' && <span className="text-xs text-emerald-600 font-bold">✓ محدد</span>}
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                        استخراج البيانات من كشوفات وجداول ملفات الـ PDF الممسوحة أو المصدرة من الجهات.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Sample Excel Template Banner */}
              {selectedFileType === 'excel' && (
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    <span className="text-xs text-neutral-700 dark:text-neutral-300 font-bold">
                      يمكنك تحميل نموذج إكسل استرشادي جاهز لتعبئة بيانات المستفيدين:
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadSampleExcel}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-neutral-700 text-emerald-700 dark:text-emerald-300 border border-neutral-200 dark:border-neutral-600 hover:bg-emerald-50 dark:hover:bg-neutral-600 transition-all cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تحميل نموذج إكسل جاهز (.xlsx)</span>
                  </button>
                </div>
              )}

              {/* Upload Dropzone */}
              <div>
                <label className="block text-sm font-bold text-neutral-800 dark:text-neutral-200 mb-2">
                  2. اختر الملف من جهازك:
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-emerald-500/40 hover:border-emerald-600 rounded-3xl p-8 sm:p-10 text-center bg-emerald-50/20 dark:bg-emerald-950/10 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-all cursor-pointer group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={selectedFileType === 'excel' ? ".xlsx, .xls, .csv" : ".pdf"}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-14 h-14 rounded-2xl bg-white dark:bg-neutral-800 shadow-md flex items-center justify-center mx-auto text-emerald-600 group-hover:scale-110 transition-transform">
                    {isProcessing ? (
                      <RefreshCw className="w-7 h-7 animate-spin text-emerald-600" />
                    ) : (
                      <Upload className="w-7 h-7" />
                    )}
                  </div>
                  <h4 className="font-bold text-base text-neutral-900 dark:text-white mt-3">
                    {isProcessing ? "جاري قراءة وتحليل بيانات الملف..." : "اضغط هنا لاختيار الملف أو اسحبه وأفلته هنا"}
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5">
                    {selectedFileType === 'excel' ? "يدعم صيغ Excel الحديثة (.xlsx, .xls, .csv)" : "يدعم ملفات جداول PDF النصية (.pdf)"}
                  </p>
                </div>
              </div>

              {/* Error Box */}
              {parseError && (
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <XCircle className="w-4 h-4" />
                    <span>تنبيه في قراءة الملف:</span>
                  </div>
                  <p>{parseError}</p>
                </div>
              )}

              {/* Security & Permanent Barcode Note */}
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Barcode className="w-4 h-4 text-amber-600" />
                  <span>توليد الباركود الدائم ومنع التكرار:</span>
                </div>
                <p className="leading-relaxed">
                  سيتم إنشاء باركود فريد وثابت لكل مستفيد جديد يُستخدم في جميع توزيعات السلال، الكسوة، والمساعدات الإنسانية الحالية والمستقبلية. المستفيدون الموجودون مسبقاً في النظام لن تتكرر سجلاتهم وسيتم الحفاظ على باركودهم الثابت.
                </p>
              </div>
            </div>
          ) : (
            /* Step 3: Verification, Pre-check & Approval */
            <div className="space-y-4">
              {/* Summary Stats Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => setFilterPreview('all')}
                  className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                    filterPreview === 'all'
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 shadow-xs'
                      : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/40 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  <div className="text-[11px] font-bold">إجمالي المكتشف</div>
                  <div className="text-xl font-black text-neutral-900 dark:text-white mt-0.5">{counts.total}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterPreview('new')}
                  className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                    filterPreview === 'new'
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 shadow-xs'
                      : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/40 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">✨ مستفيدون جدد</div>
                  <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5">{counts.newItems}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterPreview('duplicate')}
                  className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                    filterPreview === 'duplicate'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 shadow-xs'
                      : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/40 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  <div className="text-[11px] font-bold text-blue-700 dark:text-blue-400">🔄 تحديث مسبق</div>
                  <div className="text-xl font-black text-blue-700 dark:text-blue-400 mt-0.5">{counts.duplicates}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterPreview('incomplete')}
                  className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                    filterPreview === 'incomplete'
                      ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 shadow-xs'
                      : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/40 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400">⚠️ بيانات ناقصة</div>
                  <div className="text-xl font-black text-amber-700 dark:text-amber-400 mt-0.5">{counts.incomplete}</div>
                </button>
              </div>

              {/* Instructions Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 text-xs text-neutral-600 dark:text-neutral-300">
                <span>
                  معاينة البيانات المكتشفة من: <strong>{file?.name}</strong> (عرض {filteredRows.length} من أصل {parsedRows.length})
                </span>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-bold self-end sm:self-auto cursor-pointer"
                >
                  رفع ملف آخر
                </button>
              </div>

              {/* Preview Table */}
              <div className="border border-neutral-200 dark:border-neutral-700 rounded-2xl overflow-hidden shadow-xs">
                <div className="max-h-72 overflow-y-auto overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-bold sticky top-0 z-10 border-b border-neutral-200 dark:border-neutral-700">
                      <tr>
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">الاسم</th>
                        <th className="p-2.5">رقم الهوية</th>
                        <th className="p-2.5">الجوال</th>
                        <th className="p-2.5">الأسرة</th>
                        <th className="p-2.5">العنوان</th>
                        <th className="p-2.5">حالة المطابقة</th>
                        <th className="p-2.5 text-center">إجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-neutral-800 dark:text-neutral-200">
                      {filteredRows.map((row) => (
                        <tr 
                          key={row.index}
                          className={`hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors ${
                            row.status === 'incomplete' 
                              ? 'bg-red-50/40 dark:bg-red-950/20' 
                              : row.status === 'duplicate' 
                              ? 'bg-blue-50/20 dark:bg-blue-950/10' 
                              : ''
                          }`}
                        >
                          <td className="p-2.5 font-mono text-neutral-400">{row.index}</td>
                          <td className="p-2.5 font-bold">{row.name || "---"}</td>
                          <td className="p-2.5 font-mono">{row.nationalId || "---"}</td>
                          <td className="p-2.5 font-mono" dir="ltr">{row.phone || "---"}</td>
                          <td className="p-2.5">{row.familySize} أفراد</td>
                          <td className="p-2.5 text-neutral-500 max-w-[150px] truncate">{row.address}</td>
                          <td className="p-2.5">
                            {row.status === 'valid' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>جديد</span>
                              </span>
                            )}
                            {row.status === 'duplicate' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200">
                                <RefreshCw className="w-3 h-3" />
                                <span>تحديث مسبق</span>
                              </span>
                            )}
                            {row.status === 'incomplete' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200">
                                <AlertTriangle className="w-3 h-3" />
                                <span>{row.statusReason}</span>
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(row.index)}
                              className="p-1 text-neutral-400 hover:text-red-600 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                              title="حذف هذا الصف من الاستيراد"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {counts.incomplete > 0 && (
                <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span>
                    ملاحظة: الصفوف غير المكتملة ({counts.incomplete}) لن يتم استيرادها تلقائيًا لتفادي تلف البيانات.
                  </span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
          >
            إلغاء
          </button>

          {parsedRows.length > 0 && !importSuccessMessage && (
            <button
              type="button"
              disabled={isSubmitting || counts.total - counts.incomplete === 0}
              onClick={handleConfirmImport}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-md transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري الحفظ في قاعدة البيانات...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>اعتماد الاستيراد وحفظ البيانات ({counts.total - counts.incomplete} مستفيد)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
