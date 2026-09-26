import React, { useState, useRef, useEffect } from "react";
import Draggable, { DraggableData, DraggableEvent } from "react-draggable";
import { 
  Upload, 
  Save, 
  Sparkles, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  Move, 
  Maximize2, 
  CheckCircle2, 
  Check, 
  X, 
  ChevronRight, 
  Type, 
  Palette, 
  AlignCenter, 
  AlignRight, 
  AlignLeft, 
  ShieldCheck, 
  Camera, 
  User, 
  Smartphone, 
  Layers, 
  Grid,
  Info,
  Sliders,
  AlertCircle
} from "lucide-react";
import QRCode from "qrcode";
import { 
  VolunteerCardTemplate, 
  CardElementConfig, 
  CardElementType, 
  Volunteer, 
  VolunteerTeam, 
  Department 
} from "../types";

export interface CardTemplateEditorProps {
  template: VolunteerCardTemplate;
  onSave: (updatedTemplate: VolunteerCardTemplate) => Promise<boolean | void> | boolean | void;
  onCancel?: () => void;
  teams?: VolunteerTeam[];
  departments?: Department[];
  isLeaderMode?: boolean;
  leaderTeamId?: string;
  performerName?: string;
  femaleUnifiedPhotoUrl?: string;
  titleOverride?: string;
}

const COLOR_PRESETS = [
  { label: "كحلي داكن", value: "#0f172a" },
  { label: "أخضر زمردي", value: "#047857" },
  { label: "ذهبي ملكي", value: "#b45309" },
  { label: "أبيض", value: "#ffffff" },
  { label: "رمادي داكن", value: "#334155" },
  { label: "أحمر عنابي", value: "#991b1b" },
  { label: "أزرق نيلي", value: "#1d4ed8" },
  { label: "بنفسجي ملكي", value: "#6b21a8" }
];

const FONT_PRESETS = [
  { label: "القاهرة (Cairo)", value: "Cairo" },
  { label: "تجوّل (Tajawal)", value: "Tajawal" },
  { label: "المراعي (Almarai)", value: "Almarai" },
  { label: "آي بي إم (IBM Plex)", value: "IBM Plex Sans Arabic" }
];

const DraggableComponent = Draggable as any;

// Helper to create safe DOM node ref for each draggable item to satisfy React 18/19 without findDOMNode
const DraggableElementItem: React.FC<{
  element: CardElementConfig;
  isSelected: boolean;
  onSelect: (id: string) => void;
  canvasW: number;
  canvasH: number;
  sampleValue: string;
  photoUrl: string;
  qrDataUrl: string;
  onPositionChange: (id: string, newXPercent: number, newYPercent: number) => void;
}> = ({
  element,
  isSelected,
  onSelect,
  canvasW,
  canvasH,
  sampleValue,
  photoUrl,
  qrDataUrl,
  onPositionChange
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);

  // Convert percentage (0-100%) to pixels on current scaled canvas
  const pixelX = Math.round(((element.x ?? 50) / 100) * canvasW);
  const pixelY = Math.round(((element.y ?? 50) / 100) * canvasH);

  const handleStop = (e: DraggableEvent, data: DraggableData) => {
    // Convert new pixel coordinates to percentage
    const newXPercent = Math.min(100, Math.max(0, Math.round((data.x / canvasW) * 1000) / 10));
    const newYPercent = Math.min(100, Math.max(0, Math.round((data.y / canvasH) * 1000) / 10));
    onPositionChange(element.id, newXPercent, newYPercent);
  };

  // Render content according to element type
  const renderContent = () => {
    if (element.type === "photo") {
      const size = Math.round(((element.width || 120) / 856) * canvasW);
      let shapeClass = "rounded-full";
      if (element.photoShape === "square") shapeClass = "rounded-none";
      if (element.photoShape === "rounded") shapeClass = "rounded-2xl";

      return (
        <div 
          style={{ width: `${size}px`, height: `${size}px` }} 
          className={`relative overflow-hidden shadow-md bg-neutral-200 border-2 ${shapeClass}`}
          style-border={element.borderColor || "#ffffff"}
        >
          <img 
            src={photoUrl} 
            alt="صورة المتطوع" 
            className="w-full h-full object-cover pointer-events-none select-none" 
            referrerPolicy="no-referrer"
          />
        </div>
      );
    }

    if (element.type === "qrCode") {
      const qrPixelSize = Math.round(((element.qrSize || 90) / 856) * canvasW);
      return (
        <div 
          style={{ width: `${qrPixelSize}px`, height: `${qrPixelSize}px` }}
          className="bg-white p-1 rounded-xl shadow-md border border-neutral-300 flex items-center justify-center pointer-events-none select-none"
        >
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR" className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full bg-neutral-900 rounded-sm flex items-center justify-center text-white text-[9px] font-bold">
              QR
            </div>
          )}
        </div>
      );
    }

    if (element.type === "barcode") {
      const barW = Math.round(((element.width || 160) / 856) * canvasW);
      return (
        <div 
          style={{ width: `${barW}px` }}
          className="bg-white/95 backdrop-blur-xs p-1 rounded-lg border border-neutral-300 shadow-sm flex flex-col items-center pointer-events-none select-none"
        >
          <div className="flex justify-between w-full h-[22px] items-end px-1">
            {[...Array(32)].map((_, i) => (
              <div 
                key={i} 
                style={{ 
                  width: i % 4 === 0 ? "2.5px" : "1.5px", 
                  height: "22px", 
                  backgroundColor: "#0f172a",
                  opacity: i % 5 === 0 ? 0.4 : 1
                }} 
              />
            ))}
          </div>
          <span className="text-[9px] font-mono font-bold text-neutral-800 mt-0.5">V-2026-0001</span>
        </div>
      );
    }

    // Text elements
    const scaleFactor = canvasW / 856;
    const computedFontSize = Math.max(10, Math.round((element.fontSize || 14) * scaleFactor));

    return (
      <div 
        style={{
          fontFamily: element.fontFamily || "Cairo",
          fontSize: `${computedFontSize}px`,
          fontWeight: element.fontWeight || "bold",
          color: element.color || "#0f172a",
          textAlign: element.textAlign || "right",
          textShadow: element.color === "#ffffff" ? "0 1px 3px rgba(0,0,0,0.8)" : "0 1px 2px rgba(255,255,255,0.7)"
        }}
        className="whitespace-nowrap px-1 pointer-events-none select-none leading-tight"
        dir="rtl"
      >
        {element.showLabelPrefix && element.labelPrefix && (
          <span className="opacity-80 ml-1 text-[0.88em] font-normal">{element.labelPrefix}</span>
        )}
        <span>{sampleValue}</span>
      </div>
    );
  };

  return (
    <DraggableComponent
      nodeRef={nodeRef as any}
      position={{ x: pixelX, y: pixelY }}
      bounds="parent"
      onStop={handleStop}
    >
      <div
        ref={nodeRef}
        id={`draggable-item-${element.id}`}
        onClick={(e: any) => {
          e.stopPropagation();
          onSelect(element.id);
        }}
        onTouchStart={(e: any) => {
          e.stopPropagation();
          onSelect(element.id);
        }}
        className={`absolute top-0 left-0 cursor-grab active:cursor-grabbing transition-shadow select-none group touch-none ${
          isSelected 
            ? "ring-2 ring-emerald-500 ring-offset-2 z-40" 
            : "hover:ring-1 hover:ring-amber-400/80 z-20"
        }`}
        style={{ touchAction: "none" }}
      >
        {/* Selected element badge indicator */}
        {isSelected && (
          <div className="absolute -top-6 right-0 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-t-md shadow-md flex items-center gap-1 pointer-events-none whitespace-nowrap">
            <Move className="w-3 h-3 animate-pulse" />
            <span>{element.labelAr}</span>
          </div>
        )}
        
        {/* Visual Content */}
        <div className="p-0.5 relative">
          {renderContent()}
        </div>

        {/* Selected handles */}
        {isSelected && (
          <>
            <span className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-emerald-500 border border-white rounded-full shadow-xs pointer-events-none" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 border border-white rounded-full shadow-xs pointer-events-none" />
            <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-emerald-500 border border-white rounded-full shadow-xs pointer-events-none" />
            <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-emerald-500 border border-white rounded-full shadow-xs pointer-events-none" />
          </>
        )}
      </div>
    </DraggableComponent>
  );
};

export const CardTemplateEditor: React.FC<CardTemplateEditorProps> = ({
  template: initialTemplate,
  onSave,
  onCancel,
  teams = [],
  departments = [],
  isLeaderMode = false,
  leaderTeamId,
  performerName = "قائد الفريق",
  femaleUnifiedPhotoUrl,
  titleOverride
}) => {
  const [template, setTemplate] = useState<VolunteerCardTemplate>(() => {
    // Clone template deeply to prevent direct mutations
    return JSON.parse(JSON.stringify(initialTemplate));
  });

  const [selectedElementId, setSelectedElementId] = useState<string | null>(() => {
    return initialTemplate.elements?.[0]?.id || null;
  });

  const [previewGender, setPreviewGender] = useState<"male" | "female">("male");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(856);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  // Measure canvas container on resize
  useEffect(() => {
    const updateSize = () => {
      if (canvasContainerRef.current) {
        const measured = canvasContainerRef.current.clientWidth;
        if (measured > 100) {
          setContainerWidth(measured);
        }
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Generate sample QR code
  useEffect(() => {
    QRCode.toDataURL("https://reyadat-alata.org.sa/verify-card?sample=1", {
      width: 200,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" }
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch(() => {});
  }, []);

  // Calculate scaled dimensions to preserve original image aspect ratio
  const originalWidth = template.width || 856;
  const originalHeight = template.height || 540;
  const aspectRatio = originalHeight / originalWidth;

  // Max display width in container
  const displayWidth = Math.min(containerWidth, 856);
  const displayHeight = Math.round(displayWidth * aspectRatio);

  // Selected element helper
  const selectedElement = template.elements.find((e) => e.id === selectedElementId) || null;

  // Update specific element properties
  const updateSelectedElement = (updates: Partial<CardElementConfig>) => {
    if (!selectedElementId) return;
    setTemplate((prev) => ({
      ...prev,
      elements: prev.elements.map((el) => {
        if (el.id === selectedElementId) {
          return { ...el, ...updates };
        }
        return el;
      })
    }));
  };

  // Toggle element visibility
  const toggleElementVisibility = (elementId: string) => {
    setTemplate((prev) => ({
      ...prev,
      elements: prev.elements.map((el) => {
        if (el.id === elementId) {
          return { ...el, visible: !el.visible };
        }
        return el;
      })
    }));
  };

  // Position update callback from Draggable (receives 0-100% relative coordinates)
  const handlePositionChange = (elementId: string, newXPercent: number, newYPercent: number) => {
    setTemplate((prev) => ({
      ...prev,
      elements: prev.elements.map((el) => {
        if (el.id === elementId) {
          return { ...el, x: newXPercent, y: newYPercent };
        }
        return el;
      })
    }));
  };

  // Image Upload handler: strictly from device file (Phone/PC)
  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    if (!file.type.startsWith("image/")) {
      setUploadError("يرجى اختيار ملف صورة صالح بصيغة PNG أو JPG أو WEBP");
      return;
    }

    setIsUploadingImage(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64String = reader.result as string;
        
        // 1. Measure natural dimensions of the uploaded image
        const img = new Image();
        img.onload = async () => {
          const naturalWidth = img.naturalWidth || 856;
          const naturalHeight = img.naturalHeight || 540;
          const isLandscape = naturalWidth >= naturalHeight;

          try {
            // 2. Upload to server to store in card_templates directory
            const res = await fetch("/api/db/card-templates/upload-image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                imageBase64: base64String,
                teamId: leaderTeamId || template.teamId || "general",
                width: naturalWidth,
                height: naturalHeight
              })
            });

            const data = await res.json();
            const storedUrl = data?.url || base64String;

            // 3. Update template with real dimensions and stored image path
            setTemplate((prev) => ({
              ...prev,
              backgroundUrl: storedUrl,
              width: naturalWidth,
              height: naturalHeight,
              orientation: isLandscape ? "landscape" : "portrait"
            }));

            setIsUploadingImage(false);
          } catch (uploadErr) {
            console.warn("Server upload failed, using local Data URL fallback:", uploadErr);
            // Fallback to base64 if network glitch
            setTemplate((prev) => ({
              ...prev,
              backgroundUrl: base64String,
              width: naturalWidth,
              height: naturalHeight,
              orientation: isLandscape ? "landscape" : "portrait"
            }));
            setIsUploadingImage(false);
          }
        };

        img.onerror = () => {
          setUploadError("تعذر قراءة أبعاد الصورة المرفوعة");
          setIsUploadingImage(false);
        };

        img.src = base64String;
      };

      reader.onerror = () => {
        setUploadError("فشل في قراءة ملف الصورة من جهازك");
        setIsUploadingImage(false);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setUploadError("حدث خطأ أثناء رفع الصورة: " + err.message);
      setIsUploadingImage(false);
    }
  };

  // Handle Save
  const handleSaveClick = async () => {
    setIsSaving(true);
    setSaveSuccessMsg(null);
    try {
      await onSave(template);
      setSaveSuccessMsg("تم حفظ قالب وتصميم البطاقة بنجاح ومزامنته مع النظام!");
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      alert("حدث خطأ أثناء الحفظ: " + (err?.message || "يرجى المحاولة مجدداً"));
    } finally {
      setIsSaving(false);
    }
  };

  // Sample Volunteer Data for Preview
  const sampleData = {
    male: {
      name: "فهد بن عبد العزيز السبيعي",
      nationalId: "1087654321",
      membershipNumber: "V-2026-0042",
      jobTitle: "أخصائي تنظيم ميداني",
      teamName: teams.find((t) => t.id === (leaderTeamId || template.teamId))?.nameAr || "فريق سواعد العطاء",
      departmentName: "إدارة التشغيل والميدان",
      bloodType: "O+",
      nationality: "سعودي",
      expiryDate: "2027-01-15",
      photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop"
    },
    female: {
      name: "سارة بنت منصور العتيبي",
      nationalId: "1098765432",
      membershipNumber: "V-2026-0089",
      jobTitle: "منسقة إشراف وتوجيه",
      teamName: teams.find((t) => t.id === (leaderTeamId || template.teamId))?.nameAr || "فريق سواعد العطاء",
      departmentName: "إدارة التطوع النسائي",
      bloodType: "A+",
      nationality: "سعودية",
      expiryDate: "2027-01-15",
      photo: femaleUnifiedPhotoUrl || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80"
    }
  };

  const activeSample = previewGender === "female" ? sampleData.female : sampleData.male;

  // Resolve sample text for each element type
  const getSampleTextForType = (el: CardElementConfig) => {
    switch (el.type) {
      case "name": return activeSample.name;
      case "nationalId": return activeSample.nationalId;
      case "membershipNumber": return activeSample.membershipNumber;
      case "jobTitle": return activeSample.jobTitle;
      case "teamName": return activeSample.teamName;
      case "departmentName": return activeSample.departmentName;
      case "bloodType": return activeSample.bloodType;
      case "nationality": return activeSample.nationality;
      case "expiryDate": return activeSample.expiryDate;
      case "customText": return el.customTextValue || "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة";
      default: return el.labelAr;
    }
  };

  return (
    <div className="bg-neutral-50 rounded-3xl border border-neutral-200 shadow-sm overflow-hidden animate-fadeIn" dir="rtl">
      {/* Top Header */}
      <div className="bg-white border-b border-neutral-200 p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-2 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-xl transition-all cursor-pointer"
              title="رجوع"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
          <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-neutral-900">
                {titleOverride || `محرر قالب البطاقة: ${template.name}`}
              </h2>
              {isLeaderMode && (
                <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md border border-emerald-300">
                  خاص بفريقك
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              اسحب العناصر وأفلتها مباشرة بأصبعك أو بالفأرة على صورة القالب دون الحاجة لكتابة أرقام إحداثيات.
            </p>
          </div>
        </div>

        {/* Action Buttons & Gender Preview Switch */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Gender preview switch */}
          <div className="flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setPreviewGender("male")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                previewGender === "male"
                  ? "bg-white text-emerald-800 shadow-xs font-black"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              عينة متطوع ♂
            </button>
            <button
              type="button"
              onClick={() => setPreviewGender("female")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                previewGender === "female"
                  ? "bg-white text-purple-800 shadow-xs font-black"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              عينة متطوعة ♀
            </button>
          </div>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? "جارٍ الحفظ..." : "حفظ قالب البطاقة"}</span>
          </button>
        </div>
      </div>

      {/* Save Success Alert Banner */}
      {saveSuccessMsg && (
        <div className="bg-emerald-50 border-b border-emerald-200 p-3 px-6 text-xs text-emerald-900 font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Upload Error Banner */}
      {uploadError && (
        <div className="bg-rose-50 border-b border-rose-200 p-3 px-6 text-xs text-rose-800 font-bold flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Hidden File Input for Background Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        onChange={handleImageFileSelect}
        className="hidden"
      />

      {/* Main Work Area: Visual Canvas + Sidebar Controls */}
      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Visual Canvas Column (Center Stage - 8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Canvas Card */}
          <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm p-4 sm:p-6">
            
            {/* Canvas Header Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-neutral-700">منطقة التصميم التفاعلية المباشرة:</span>
                <span className="text-[11px] font-mono text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-md">
                  {originalWidth} × {originalHeight} px
                </span>
              </div>

              {/* Upload Image Button (No URL box!) */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer self-start sm:self-auto"
              >
                <Camera className="w-4 h-4" />
                <span>{isUploadingImage ? "جارٍ رفع الصورة وقراءتها..." : "📷 رفع صورة القالب من جهازك"}</span>
              </button>
            </div>

            {/* Hint Notice */}
            <div className="mb-3 p-2.5 bg-emerald-50/70 border border-emerald-200/60 rounded-xl text-[11px] text-emerald-900 flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>طريقة العمل:</strong> انقر أو المس أي عنصر في البطاقة لتحديده، ثم اسحبه مباشرة إلى المكان المطلوب (يدعم اللمس على الجوال والماوس).
              </span>
            </div>

            {/* Draggable Interactive Canvas Box */}
            <div ref={canvasContainerRef} className="w-full flex justify-center py-2 overflow-hidden">
              <div
                id="card-editor-canvas-stage"
                style={{
                  width: `${displayWidth}px`,
                  height: `${displayHeight}px`,
                  backgroundImage: template.backgroundUrl ? `url(${template.backgroundUrl})` : undefined,
                  backgroundSize: "100% 100%",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat"
                }}
                className="relative rounded-2xl border-2 border-dashed border-emerald-400/80 shadow-md bg-neutral-100 overflow-hidden select-none"
              >
                {/* Fallback pattern if no background image */}
                {!template.backgroundUrl && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400 p-6 text-center">
                    <Upload className="w-10 h-10 mb-2 text-neutral-300 animate-bounce" />
                    <p className="text-xs font-bold">لا توجد صورة قالب مرفوعة حالياً</p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-2 bg-emerald-600 text-white text-xs font-bold px-4 py-1.5 rounded-lg shadow-xs hover:bg-emerald-700"
                    >
                      اختر صورة من جهازك
                    </button>
                  </div>
                )}

                {/* Render Visible Draggable Elements */}
                {template.elements.map((elem) => {
                  if (!elem.visible) return null;
                  return (
                    <DraggableElementItem
                      key={elem.id}
                      element={elem}
                      isSelected={selectedElementId === elem.id}
                      onSelect={(id) => setSelectedElementId(id)}
                      canvasW={displayWidth}
                      canvasH={displayHeight}
                      sampleValue={getSampleTextForType(elem)}
                      photoUrl={activeSample.photo}
                      qrDataUrl={qrCodeDataUrl}
                      onPositionChange={handlePositionChange}
                    />
                  );
                })}
              </div>
            </div>

            {/* Dimensions and aspect ratio confirmation bar */}
            <div className="mt-4 pt-3 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-neutral-500 gap-2">
              <span className="flex items-center gap-1.5 text-emerald-800 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>أبعاد القالب متطابقة 100% مع أبعاد الصورة المرفوعة دون أي تشويه أو اقتصاص</span>
              </span>
              <span className="font-mono bg-neutral-100 px-2 py-0.5 rounded text-neutral-600">
                نسبة العرض للارتفاع: {(originalWidth / originalHeight).toFixed(2)} : 1
              </span>
            </div>

          </div>

          {/* Quick Visibility Elements Chips Bar */}
          <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm p-4">
            <h4 className="text-xs font-black text-neutral-800 mb-2 flex items-center justify-between">
              <span>إظهار / إخفاء عناصر البطاقة:</span>
              <span className="text-[10px] text-neutral-400 font-normal">(انقر على العنصر لتفعيله أو إلغائه)</span>
            </h4>
            
            <div className="flex flex-wrap gap-2">
              {template.elements.map((el) => {
                const isSelected = selectedElementId === el.id;
                return (
                  <button
                    key={el.id}
                    type="button"
                    onClick={() => {
                      setSelectedElementId(el.id);
                      toggleElementVisibility(el.id);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                      el.visible
                        ? isSelected
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100"
                        : "bg-neutral-100 text-neutral-400 border-neutral-200 hover:bg-neutral-200"
                    }`}
                  >
                    {el.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{el.labelAr}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Selected Element Properties Inspector (Right Sidebar - 4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm p-5 text-xs">
            {selectedElement ? (
              <div className="space-y-4">
                
                {/* Selected Element Header */}
                <div className="flex items-center justify-between pb-3 border-b border-neutral-150">
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold block">العنصر المحدد للتحكم:</span>
                    <h3 className="text-sm font-black text-emerald-800 flex items-center gap-1.5 mt-0.5">
                      <Move className="w-4 h-4 text-emerald-600" />
                      <span>{selectedElement.labelAr}</span>
                    </h3>
                  </div>

                  {/* Visibility button */}
                  <button
                    type="button"
                    onClick={() => toggleElementVisibility(selectedElement.id)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer ${
                      selectedElement.visible 
                        ? "bg-emerald-100 text-emerald-800" 
                        : "bg-neutral-200 text-neutral-600"
                    }`}
                  >
                    {selectedElement.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    <span>{selectedElement.visible ? "ظاهر" : "مخفي"}</span>
                  </button>
                </div>

                {/* Quick Alignment / Centering */}
                <div>
                  <label className="block font-bold text-neutral-700 mb-1.5">محاذاة سريعة في منتصف البطاقة:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateSelectedElement({ x: 50 })}
                      className="p-2 bg-neutral-100 hover:bg-neutral-200 rounded-xl font-bold text-neutral-700 text-center transition-all cursor-pointer"
                    >
                      توسيط أفقي (Center)
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSelectedElement({ y: 50 })}
                      className="p-2 bg-neutral-100 hover:bg-neutral-200 rounded-xl font-bold text-neutral-700 text-center transition-all cursor-pointer"
                    >
                      توسيط عمودي (Middle)
                    </button>
                  </div>
                </div>

                {/* Photo Specific Settings */}
                {selectedElement.type === "photo" && (
                  <div className="space-y-3 p-3 bg-purple-50/60 border border-purple-200 rounded-2xl">
                    <label className="block font-black text-purple-900">شكل وحجم صورة المتطوع:</label>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => updateSelectedElement({ photoShape: "circle" })}
                        className={`p-2 rounded-xl text-center font-bold text-[11px] border transition-all cursor-pointer ${
                          selectedElement.photoShape === "circle" 
                            ? "bg-purple-600 text-white border-purple-600 shadow-xs" 
                            : "bg-white text-purple-900 border-purple-200"
                        }`}
                      >
                        دائري ◯
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSelectedElement({ photoShape: "rounded" })}
                        className={`p-2 rounded-xl text-center font-bold text-[11px] border transition-all cursor-pointer ${
                          selectedElement.photoShape === "rounded" 
                            ? "bg-purple-600 text-white border-purple-600 shadow-xs" 
                            : "bg-white text-purple-900 border-purple-200"
                        }`}
                      >
                        مستدير ▢
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSelectedElement({ photoShape: "square" })}
                        className={`p-2 rounded-xl text-center font-bold text-[11px] border transition-all cursor-pointer ${
                          selectedElement.photoShape === "square" 
                            ? "bg-purple-600 text-white border-purple-600 shadow-xs" 
                            : "bg-white text-purple-900 border-purple-200"
                        }`}
                      >
                        مربع ⬛
                      </button>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-purple-800 mb-1">حجم الصورة:</label>
                      <div className="grid grid-cols-3 gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => updateSelectedElement({ width: 100, height: 100 })}
                          className={`p-1.5 rounded-lg border font-bold cursor-pointer ${
                            (selectedElement.width || 120) <= 100 ? "bg-purple-600 text-white" : "bg-white text-purple-900"
                          }`}
                        >
                          صغير (100)
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSelectedElement({ width: 130, height: 130 })}
                          className={`p-1.5 rounded-lg border font-bold cursor-pointer ${
                            (selectedElement.width || 120) === 130 ? "bg-purple-600 text-white" : "bg-white text-purple-900"
                          }`}
                        >
                          متوسط (130)
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSelectedElement({ width: 160, height: 160 })}
                          className={`p-1.5 rounded-lg border font-bold cursor-pointer ${
                            (selectedElement.width || 120) >= 160 ? "bg-purple-600 text-white" : "bg-white text-purple-900"
                          }`}
                        >
                          كبير (160)
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Text Formatting Controls (if text element) */}
                {selectedElement.type !== "photo" && selectedElement.type !== "qrCode" && selectedElement.type !== "barcode" && (
                  <div className="space-y-3.5">
                    
                    {/* Font Size Step Buttons */}
                    <div>
                      <label className="block font-bold text-neutral-700 mb-1.5">حجم الخط:</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateSelectedElement({ fontSize: Math.max(10, (selectedElement.fontSize || 14) - 2) })}
                          className="w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-black text-sm flex items-center justify-center cursor-pointer"
                        >
                          -
                        </button>
                        <span className="flex-1 text-center font-bold font-mono text-neutral-800 bg-neutral-50 py-1.5 rounded-lg border border-neutral-200">
                          {selectedElement.fontSize || 14} بكسل
                        </span>
                        <button
                          type="button"
                          onClick={() => updateSelectedElement({ fontSize: Math.min(36, (selectedElement.fontSize || 14) + 2) })}
                          className="w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-black text-sm flex items-center justify-center cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Font Family Selection */}
                    <div>
                      <label className="block font-bold text-neutral-700 mb-1">نوع الخط:</label>
                      <select
                        value={selectedElement.fontFamily || "Cairo"}
                        onChange={(e) => updateSelectedElement({ fontFamily: e.target.value })}
                        className="w-full p-2 bg-neutral-50 border border-neutral-300 rounded-xl font-bold text-neutral-800"
                      >
                        {FONT_PRESETS.map((f) => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Font Color Presets */}
                    <div>
                      <label className="block font-bold text-neutral-700 mb-1.5">لون النص:</label>
                      <div className="flex flex-wrap gap-2">
                        {COLOR_PRESETS.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => updateSelectedElement({ color: c.value })}
                            title={c.label}
                            style={{ backgroundColor: c.value }}
                            className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer shadow-xs ${
                              selectedElement.color === c.value ? "ring-2 ring-emerald-500 scale-110 border-white" : "border-neutral-300"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Text Alignment */}
                    <div>
                      <label className="block font-bold text-neutral-700 mb-1.5">محاذاة النص:</label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => updateSelectedElement({ textAlign: "right" })}
                          className={`p-2 rounded-xl font-bold flex items-center justify-center gap-1 border cursor-pointer ${
                            selectedElement.textAlign === "right" || !selectedElement.textAlign 
                              ? "bg-emerald-50 border-emerald-500 text-emerald-800" 
                              : "bg-white border-neutral-200 text-neutral-600"
                          }`}
                        >
                          <AlignRight className="w-3.5 h-3.5" />
                          <span>يمين</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSelectedElement({ textAlign: "center" })}
                          className={`p-2 rounded-xl font-bold flex items-center justify-center gap-1 border cursor-pointer ${
                            selectedElement.textAlign === "center" 
                              ? "bg-emerald-50 border-emerald-500 text-emerald-800" 
                              : "bg-white border-neutral-200 text-neutral-600"
                          }`}
                        >
                          <AlignCenter className="w-3.5 h-3.5" />
                          <span>وسط</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSelectedElement({ textAlign: "left" })}
                          className={`p-2 rounded-xl font-bold flex items-center justify-center gap-1 border cursor-pointer ${
                            selectedElement.textAlign === "left" 
                              ? "bg-emerald-50 border-emerald-500 text-emerald-800" 
                              : "bg-white border-neutral-200 text-neutral-600"
                          }`}
                        >
                          <AlignLeft className="w-3.5 h-3.5" />
                          <span>يسار</span>
                        </button>
                      </div>
                    </div>

                    {/* Label Prefix Toggle */}
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-neutral-800">
                        <input
                          type="checkbox"
                          checked={selectedElement.showLabelPrefix ?? true}
                          onChange={(e) => updateSelectedElement({ showLabelPrefix: e.target.checked })}
                          className="w-4 h-4 rounded text-emerald-600"
                        />
                        <span>إظهار مسمى الحقل (بادئة)</span>
                      </label>
                      {selectedElement.showLabelPrefix && (
                        <input
                          type="text"
                          value={selectedElement.labelPrefix || ""}
                          placeholder="مثلاً: الهوية:"
                          onChange={(e) => updateSelectedElement({ labelPrefix: e.target.value })}
                          className="w-full p-2 bg-white border border-neutral-300 rounded-lg font-bold text-xs"
                        />
                      )}
                    </div>

                    {/* Custom Text value if type is customText */}
                    {selectedElement.type === "customText" && (
                      <div>
                        <label className="block font-bold text-neutral-700 mb-1">النص الرسمي المعتمد:</label>
                        <input
                          type="text"
                          value={selectedElement.customTextValue || ""}
                          onChange={(e) => updateSelectedElement({ customTextValue: e.target.value })}
                          className="w-full p-2 bg-neutral-50 border border-neutral-300 rounded-xl font-bold text-xs"
                        />
                      </div>
                    )}

                  </div>
                )}

                {/* QR Code Specific */}
                {selectedElement.type === "qrCode" && (
                  <div className="space-y-3 p-3 bg-emerald-50/60 border border-emerald-200 rounded-2xl">
                    <label className="block font-black text-emerald-900">حجم رمز التحقق السريع (QR):</label>
                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => updateSelectedElement({ qrSize: 75 })}
                        className={`p-2 rounded-lg border font-bold cursor-pointer ${
                          (selectedElement.qrSize || 90) <= 75 ? "bg-emerald-600 text-white" : "bg-white text-emerald-900"
                        }`}
                      >
                        صغير (75px)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSelectedElement({ qrSize: 95 })}
                        className={`p-2 rounded-lg border font-bold cursor-pointer ${
                          (selectedElement.qrSize || 90) === 95 ? "bg-emerald-600 text-white" : "bg-white text-emerald-900"
                        }`}
                      >
                        متوسط (95px)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSelectedElement({ qrSize: 120 })}
                        className={`p-2 rounded-lg border font-bold cursor-pointer ${
                          (selectedElement.qrSize || 90) >= 120 ? "bg-emerald-600 text-white" : "bg-white text-emerald-900"
                        }`}
                      >
                        كبير (120px)
                      </button>
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="text-center py-8 text-neutral-400">
                <Move className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                <p className="font-bold">انقر على أي عنصر داخل البطاقة لتعديل خياراته ومظهره</p>
              </div>
            )}
          </div>

          {/* Template General Info Card */}
          <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm p-5 text-xs space-y-3">
            <h4 className="font-black text-neutral-800">بيانات القالب:</h4>
            
            <div>
              <label className="block font-bold text-neutral-700 mb-1">اسم القالب:</label>
              <input
                type="text"
                value={template.name}
                onChange={(e) => setTemplate({ ...template, name: e.target.value })}
                className="w-full p-2 bg-neutral-50 border border-neutral-300 rounded-xl font-bold text-neutral-800"
              />
            </div>

            <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-purple-900">
                <input
                  type="checkbox"
                  checked={template.useFemaleUnifiedPhoto ?? true}
                  onChange={(e) => setTemplate({ ...template, useFemaleUnifiedPhoto: e.target.checked })}
                  className="w-4 h-4 rounded text-purple-600"
                />
                <span>الصورة الموحدة للمتطوعات الإناث تلقائياً</span>
              </label>
              <p className="text-[10px] text-purple-700 mt-1 leading-tight">
                لحفظ خصوصية المتطوعات، يتم وضع الصورة الموحدة المعتمدة تلقائياً في بطاقاتهن.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveClick}
              disabled={isSaving}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white p-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "جارٍ الحفظ والمزامنة..." : "حفظ التصميم وتطبيقه على الفريق"}</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
