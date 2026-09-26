import React, { useEffect, useRef, useState } from "react";
import { 
  Download, 
  Printer, 
  RefreshCw, 
  QrCode, 
  ExternalLink, 
  CheckCircle, 
  Award, 
  ShieldCheck, 
  Eye, 
  Sparkles,
  Camera
} from "lucide-react";
import QRCode from "qrcode";
import { 
  Volunteer, 
  VolunteerCardTemplate, 
  CardElementConfig, 
  Department, 
  VolunteerTeam 
} from "../types";

interface CardRendererProps {
  template: VolunteerCardTemplate;
  volunteer: Volunteer;
  departments?: Department[];
  teams?: VolunteerTeam[];
  femaleUnifiedPhotoUrl?: string;
  onReissue?: (volunteerId: string) => void;
  scale?: number;
  showActions?: boolean;
  onOpenVerification?: (volunteer: Volunteer) => void;
  className?: string;
  isPrintMode?: boolean;
  interactive?: boolean;
  selectedElementId?: string | null;
  onSelectElement?: (elementId: string) => void;
  onUpdateElementPosition?: (elementId: string, newX: number, newY: number) => void;
}

export const CardRenderer: React.FC<CardRendererProps> = ({
  template,
  volunteer,
  departments = [],
  teams = [],
  femaleUnifiedPhotoUrl = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80",
  onReissue,
  scale = 1,
  showActions = true,
  onOpenVerification,
  className = "",
  isPrintMode = false,
  interactive = false,
  selectedElementId = null,
  onSelectElement,
  onUpdateElementPosition
}) => {
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);

  const team = teams.find((t) => t.id === volunteer.teamId);
  const dept = departments.find((d) => d.id === volunteer.departmentId);

  // Drag interaction handler for card designer
  const handleElementMouseDown = (e: React.MouseEvent, elemId: string, currentX: number, currentY: number) => {
    if (!interactive) return;
    e.stopPropagation();
    if (onSelectElement) onSelectElement(elemId);
    if (!onUpdateElementPosition) return;

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const initialX = currentX;
    const initialY = currentY;

    const onMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      const deltaX = moveEvent.clientX - startClientX;
      const deltaY = moveEvent.clientY - startClientY;
      const actualWidth = cardWidth * scale;
      const actualHeight = cardHeight * scale;

      const deltaXPercent = (deltaX / actualWidth) * 100;
      const deltaYPercent = (deltaY / actualHeight) * 100;

      const newX = Math.min(100, Math.max(0, Math.round((initialX + deltaXPercent) * 2) / 2));
      const newY = Math.min(100, Math.max(0, Math.round((initialY + deltaYPercent) * 2) / 2));

      onUpdateElementPosition(elemId, newX, newY);
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // Female check
  const isFemale = volunteer.gender === 'female' || 
    (volunteer.name && (volunteer.name.includes('أنثى') || volunteer.name.includes('سارة') || volunteer.name.includes('مريم') || volunteer.name.includes('فاطمة') || volunteer.name.includes('نورة') || volunteer.name.includes('بنت')));

  // Photo to use
  const shouldUseUnifiedPhoto = isFemale && template.useFemaleUnifiedPhoto;
  const effectivePhotoUrl = shouldUseUnifiedPhoto
    ? (femaleUnifiedPhotoUrl || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80")
    : (volunteer.photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop");

  // Mask sensitive national ID: e.g. 10****8901
  const maskNationalId = (id?: string) => {
    if (!id) return "10********";
    if (id.length <= 4) return id;
    const start = id.slice(0, 2);
    const end = id.slice(-2);
    return `${start}${"*".repeat(Math.max(4, id.length - 4))}${end}`;
  };

  // Verification URL for QR code
  const verificationUrl = typeof window !== "undefined"
    ? `${window.location.origin}?verifyCard=${encodeURIComponent(volunteer.membershipNumber || volunteer.id)}`
    : `https://riadataleata.org.sa/verify?card=${volunteer.membershipNumber}`;

  // Generate QR Code data URL
  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(
      verificationUrl,
      {
        width: 250,
        margin: 1,
        color: {
          dark: "#0f172a",
          light: "#ffffff"
        },
        errorCorrectionLevel: "M"
      },
      (err, url) => {
        if (!err && isMounted && url) {
          setQrDataUrl(url);
        }
      }
    );
    return () => {
      isMounted = false;
    };
  }, [verificationUrl]);

  // Dimensions & Orientation
  const cardWidth = template.width || 856;
  const cardHeight = template.height || 540;
  const isLandscape = template.orientation !== 'portrait';

  // Format element value dynamically
  const getElementValue = (elem: CardElementConfig) => {
    let rawValue = "";
    switch (elem.type) {
      case 'name':
        rawValue = volunteer.name || "اسم المتطوع الثلاثي";
        break;
      case 'nationalId':
        rawValue = volunteer.nationalId || "1098765432";
        break;
      case 'membershipNumber':
        rawValue = volunteer.membershipNumber || "V-2026-0001";
        break;
      case 'jobTitle':
        rawValue = volunteer.titleAr || "متطوع تنظيمي ميداني";
        break;
      case 'teamName':
        rawValue = team ? team.nameAr : "فريق التنظيم العام";
        break;
      case 'departmentName':
        rawValue = dept ? dept.nameAr : "إدارة التشغيل والمرافق";
        break;
      case 'gender':
        rawValue = isFemale ? "أنثى" : "ذكر";
        break;
      case 'nationality':
        rawValue = volunteer.nationality || "سعودي";
        break;
      case 'birthDate':
        rawValue = volunteer.birthDate || "1418/05/12هـ";
        break;
      case 'bloodType':
        rawValue = volunteer.bloodType || "O+";
        break;
      case 'joinDate':
        rawValue = volunteer.issueDate || "2026-01-15";
        break;
      case 'expiryDate':
        rawValue = volunteer.expiryDate || "2027-01-15";
        break;
      case 'points':
        rawValue = `${volunteer.points || 25} نقطة`;
        break;
      case 'customText':
        rawValue = elem.customTextValue || "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة";
        break;
      case 'employeeNumber':
        rawValue = (volunteer as any).employeeNumber || (volunteer as any).fileNumber || volunteer.membershipNumber || "EMP-2026-001";
        break;
      case 'leaderNumber':
        rawValue = (volunteer as any).leaderNumber || volunteer.membershipNumber || "LDR-2026-001";
        break;
      case 'leadershipTitle':
        rawValue = (volunteer as any).leadershipTitle || volunteer.titleAr || "قائد الفريق التطوعي";
        break;
      case 'commissionDate':
        rawValue = (volunteer as any).commissionDate || volunteer.issueDate || "2026-01-15";
        break;
      case 'hireDate':
        rawValue = (volunteer as any).hireDate || volunteer.issueDate || "2025-09-01";
        break;
      default:
        rawValue = "";
    }

    if (elem.showLabelPrefix && elem.labelPrefix) {
      return `${elem.labelPrefix} ${rawValue}`;
    }
    return rawValue;
  };

  // Render Barcode simulation
  const renderSimulatedBarcode = (code: string) => {
    const bars = [];
    for (let i = 0; i < 48; i++) {
      const width = i % 4 === 0 ? "2.5px" : i % 3 === 0 ? "1px" : "1.5px";
      const opacity = i % 7 === 0 ? "0.4" : "1";
      bars.push(
        <div 
          key={i} 
          style={{ 
            backgroundColor: "#1e293b", 
            height: "26px", 
            width, 
            opacity 
          }} 
        />
      );
    }
    return (
      <div className="flex flex-col items-center bg-white/95 backdrop-blur-xs p-1.5 rounded-md border border-neutral-300 shadow-2xs">
        <div className="flex justify-between w-full h-[26px] items-end px-1">{bars}</div>
        <span className="text-[10px] font-mono mt-0.5 text-neutral-700 font-bold tracking-widest">{code}</span>
      </div>
    );
  };

  // Export card as PNG or JPG using HTML5 Canvas
  const exportCardAsImage = async (format: 'png' | 'jpeg') => {
    if (!cardContainerRef.current) return;
    setIsExporting(true);

    try {
      const cardEl = cardContainerRef.current;
      const targetW = cardWidth;
      const targetH = cardHeight;

      // Create offscreen canvas matching the EXACT dimensions of the card template (e.g. 1000x600)
      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        alert("تعذر الوصول لمحرك الرسم بالمتصفح");
        setIsExporting(false);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // 1. Draw background image matching exact template dimensions
      if (template.backgroundUrl) {
        try {
          const bgImg = new Image();
          bgImg.crossOrigin = "anonymous";
          await new Promise((resolve) => {
            bgImg.onload = resolve;
            bgImg.onerror = () => resolve(null); // soft fallback
            bgImg.src = template.backgroundUrl;
          });
          if (bgImg.width) {
            ctx.drawImage(bgImg, 0, 0, targetW, targetH);
          } else {
            drawFallbackBackground(ctx, targetW, targetH);
          }
        } catch {
          drawFallbackBackground(ctx, targetW, targetH);
        }
      } else {
        drawFallbackBackground(ctx, targetW, targetH);
        // Only draw subtle header decorative gradient and border for fallback default
        const headGrad = ctx.createLinearGradient(0, 0, targetW, 80);
        headGrad.addColorStop(0, "rgba(5, 150, 105, 0.15)");
        headGrad.addColorStop(1, "rgba(245, 158, 11, 0.15)");
        ctx.fillStyle = headGrad;
        ctx.fillRect(0, 0, targetW, 80);

        ctx.strokeStyle = "#059669";
        ctx.lineWidth = 3;
        ctx.strokeRect(2, 2, targetW - 4, targetH - 4);
      }

      // Draw all configured visible elements
      for (const elem of template.elements) {
        if (!elem.visible) continue;

        const posX = (elem.x / 100) * targetW;
        const posY = (elem.y / 100) * targetH;

        if (elem.type === 'photo') {
          // Render photo
          try {
            const photoImg = new Image();
            photoImg.crossOrigin = "anonymous";
            await new Promise((resolve) => {
              photoImg.onload = resolve;
              photoImg.onerror = () => resolve(null);
              photoImg.src = effectivePhotoUrl;
            });

            const pSize = elem.width || 120;
            const pH = elem.height || pSize;

            ctx.save();
            ctx.beginPath();
            if (elem.photoShape === 'circle') {
              ctx.arc(posX + pSize / 2, posY + pH / 2, pSize / 2, 0, Math.PI * 2);
            } else {
              ctx.rect(posX, posY, pSize, pH);
            }
            ctx.clip();
            if (photoImg.width) {
              ctx.drawImage(photoImg, posX, posY, pSize, pH);
            } else {
              ctx.fillStyle = "#e2e8f0";
              ctx.fillRect(posX, posY, pSize, pH);
            }
            ctx.restore();

            // Border
            ctx.save();
            ctx.beginPath();
            if (elem.photoShape === 'circle') {
              ctx.arc(posX + pSize / 2, posY + pH / 2, pSize / 2, 0, Math.PI * 2);
            } else {
              ctx.rect(posX, posY, pSize, pH);
            }
            ctx.strokeStyle = elem.borderColor || "#f59e0b";
            ctx.lineWidth = elem.borderWidth || 3;
            ctx.stroke();
            ctx.restore();
          } catch (e) {
            console.warn("Photo render error:", e);
          }
        } else if (elem.type === 'qrCode') {
          // Render QR Code
          if (qrDataUrl) {
            try {
              const qrImg = new Image();
              await new Promise((resolve) => {
                qrImg.onload = resolve;
                qrImg.src = qrDataUrl;
              });
              const qSize = elem.qrSize || 90;
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(posX, posY, qSize, qSize);
              ctx.drawImage(qrImg, posX, posY, qSize, qSize);
              ctx.strokeStyle = "#cbd5e1";
              ctx.lineWidth = 1;
              ctx.strokeRect(posX, posY, qSize, qSize);
            } catch (e) {
              console.warn("QR render error:", e);
            }
          }
        } else if (elem.type === 'barcode') {
          // Render barcode text
          const bCode = volunteer.barcode || volunteer.membershipNumber || "100088868001";
          ctx.font = "bold 12px monospace";
          ctx.fillStyle = elem.color || "#0f172a";
          ctx.textAlign = "center";
          ctx.fillText(`|||| | ||||| |||| || ${bCode}`, posX + 60, posY + 20);
        } else if (elem.type === 'associationLogo') {
          // Association Logo circle
          ctx.save();
          ctx.beginPath();
          ctx.arc(posX + 24, posY + 24, 24, 0, Math.PI * 2);
          ctx.fillStyle = "#059669";
          ctx.fill();
          ctx.font = "bold 18px Cairo, sans-serif";
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("ر", posX + 24, posY + 24);
          ctx.restore();
        } else if (elem.type === 'teamLogo' && team?.logoUrl) {
          try {
            const teamImg = new Image();
            teamImg.crossOrigin = "anonymous";
            await new Promise((resolve) => {
              teamImg.onload = resolve;
              teamImg.onerror = () => resolve(null);
              teamImg.src = team.logoUrl || "";
            });
            if (teamImg.width) {
              ctx.drawImage(teamImg, posX, posY, 48, 48);
            }
          } catch (e) {
            // ignore
          }
        } else {
          // Text Element
          const text = getElementValue(elem);
          const fSize = elem.fontSize || 14;
          const fWeight = elem.fontWeight || "bold";
          const fFamily = elem.fontFamily || "Cairo";

          ctx.font = `${fWeight} ${fSize}px '${fFamily}', sans-serif`;
          ctx.fillStyle = elem.color || "#1e293b";
          ctx.textAlign = elem.textAlign === "center" ? "center" : elem.textAlign === "left" ? "left" : "right";
          ctx.direction = elem.direction || "rtl";
          ctx.fillText(text, posX, posY + fSize);
        }
      }

      // Download file
      const dataUrl = canvas.toDataURL(format === "png" ? "image/png" : "image/jpeg", 0.95);
      const link = document.createElement("a");
      const safeName = (volunteer.name || "volunteer").replace(/\s+/g, "_");
      link.download = `بطاقة_متطوع_${safeName}_${volunteer.membershipNumber || "2026"}.${format}`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export error:", err);
      alert("حدث خطأ أثناء تصدير الصورة، يرجى إعادة المحاولة.");
    } finally {
      setIsExporting(false);
    }
  };

  const drawFallbackBackground = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    // Beautiful gradient fallback matching the association's brand identity
    const grad = ctx.createLinearGradient(0, 0, w, h);
    if (template.targetGender === 'female') {
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.5, "#fdf4ff");
      grad.addColorStop(1, "#f5f3ff");
    } else {
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.5, "#f0fdf4");
      grad.addColorStop(1, "#fefce8");
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  };

  // Handle Print Action
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("يرجى السماح بفتح النوافذ المنبثقة للطباعة");
      return;
    }

    const cardHtml = cardContainerRef.current?.outerHTML || "";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <title>طباعة بطاقة متطوع - ${volunteer.name}</title>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Tajawal:wght@400;500;700;900&display=swap" rel="stylesheet">
          <style>
            @page {
              size: auto;
              margin: 10mm;
            }
            body {
              margin: 0;
              padding: 20px;
              background-color: #fff;
              font-family: 'Cairo', 'Tajawal', sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              direction: rtl;
            }
            .print-wrapper {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 20px;
            }
            .print-notes {
              font-size: 12px;
              color: #64748b;
              text-align: center;
              margin-top: 15px;
              border-top: 1px dashed #cbd5e1;
              padding-top: 10px;
              width: 100%;
              max-width: 500px;
            }
            /* Reset absolute scaling inside print window */
            #card-root {
              transform: none !important;
              box-shadow: 0 4px 14px rgba(0,0,0,0.15) !important;
              border: 2px solid #059669 !important;
              margin: 0 auto;
            }
          </style>
        </head>
        <body>
          <div class="print-wrapper">
            ${cardHtml}
            <div class="print-notes">
              <strong>جمعية ريادة العطاء لخدمة الإنسان بالعسيلة - بطاقة عضوية رسمية معتمدة</strong><br />
              الرقم الموحد: 100088868 | الترخيص: 5081 | تاريخ الطباعة: ${new Date().toLocaleDateString('ar-SA')}
            </div>
          </div>
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 600);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className={`flex flex-col items-center select-none ${className}`} dir="rtl">
      {/* Outer Scaled Viewport Container */}
      <div 
        className="relative overflow-hidden rounded-2xl shadow-md transition-all hover:shadow-xl border border-neutral-200 bg-neutral-100 flex items-center justify-center p-2"
        style={{
          width: isLandscape ? `${Math.min(cardWidth * scale + 16, cardWidth)}px` : `${Math.min(cardWidth * scale + 16, cardWidth)}px`,
          maxWidth: "100%"
        }}
      >
        {/* Scaled Wrapper for CSS transforms */}
        <div 
          style={{
            width: `${cardWidth}px`,
            height: `${cardHeight}px`,
            transform: `scale(${scale})`,
            transformOrigin: "top center",
            margin: "0 auto",
            marginBottom: scale < 1 ? `-${cardHeight * (1 - scale)}px` : "0px"
          }}
        >
          {/* Real Card DOM node */}
          <div
            ref={cardContainerRef}
            id="card-root"
            className="relative overflow-hidden rounded-2xl border-2 border-emerald-600/80 shadow-lg text-neutral-800"
            style={{
              width: `${cardWidth}px`,
              height: `${cardHeight}px`,
              backgroundColor: "#ffffff",
              backgroundImage: template.backgroundUrl ? `url("${template.backgroundUrl}")` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              fontFamily: "Cairo, sans-serif"
            }}
          >
            {/* Ambient Background Overlay if NO background image exists */}
            {!template.backgroundUrl && (
              <>
                <div className={`absolute inset-0 bg-gradient-to-br ${template.targetGender === 'female' ? 'from-white via-purple-50/50 to-amber-50/40' : 'from-white via-emerald-50/60 to-amber-50/40'} pointer-events-none`} />
                <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-emerald-600/15 via-amber-500/10 to-transparent rounded-bl-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-36 h-36 bg-gradient-to-tr from-teal-600/15 via-emerald-500/10 to-transparent rounded-tr-full pointer-events-none" />
              </>
            )}

            {/* Render Configured Elements */}
            {template.elements.map((elem) => {
              if (!elem.visible) return null;

              const transformParts: string[] = [];
              if (elem.rotation) transformParts.push(`rotate(${elem.rotation}deg)`);

              const style: React.CSSProperties = {
                position: "absolute",
                top: `${elem.y}%`,
                left: `${elem.x}%`,
                zIndex: elem.zIndex || 10,
                transform: transformParts.length > 0 ? transformParts.join(" ") : undefined,
                fontFamily: elem.fontFamily || "Cairo, sans-serif",
                fontSize: `${elem.fontSize || 14}px`,
                fontWeight: elem.fontWeight === "bold" ? 700 : elem.fontWeight === "900" ? 900 : elem.fontWeight === "500" ? 500 : 400,
                color: elem.color || "#1e293b",
                textAlign: elem.textAlign || "right",
                direction: elem.direction || "rtl",
                whiteSpace: "nowrap"
              };

              // 1. Photo Element
              if (elem.type === 'photo') {
                const pW = elem.width || 120;
                const pH = elem.height || pW;
                const shapeClass = elem.photoShape === 'circle' 
                  ? 'rounded-full' 
                  : elem.photoShape === 'square' 
                    ? 'rounded-none' 
                    : elem.photoShape === 'rectangle'
                      ? 'rounded-md'
                      : elem.photoShape === 'rounded' 
                        ? 'rounded-2xl' 
                        : 'rounded-xl';

                return (
                  <div
                    key={elem.id}
                    id={`elem-${elem.id}`}
                    onMouseDown={(e) => handleElementMouseDown(e, elem.id, elem.x, elem.y)}
                    onClick={(e) => {
                      if (interactive) {
                        e.stopPropagation();
                        onSelectElement?.(elem.id);
                      }
                    }}
                    style={{
                      position: "absolute",
                      top: `${elem.y}%`,
                      left: `${elem.x}%`,
                      width: `${pW}px`,
                      height: `${pH}px`,
                      zIndex: elem.zIndex || 15,
                      transform: elem.rotation ? `rotate(${elem.rotation}deg)` : undefined
                    }}
                    className={`flex flex-col items-center select-none ${
                      interactive ? 'cursor-move hover:ring-2 hover:ring-emerald-400 hover:ring-dashed' : ''
                    } ${interactive && selectedElementId === elem.id ? 'ring-2 ring-emerald-600 ring-offset-2' : ''}`}
                  >
                    <div 
                      className={`relative overflow-hidden bg-white shadow-md ${shapeClass}`}
                      style={{
                        width: `${pW}px`,
                        height: `${pH}px`,
                        border: `${elem.borderWidth || 3}px solid ${elem.borderColor || "#f59e0b"}`
                      }}
                    >
                      <img
                        src={effectivePhotoUrl}
                        alt={volunteer.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    {shouldUseUnifiedPhoto && (
                      <span className="mt-1 text-[9px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full border border-purple-300 shadow-2xs whitespace-nowrap">
                        صورة موحدة للمتطوعات
                      </span>
                    )}
                  </div>
                );
              }

              // 2. QR Code Element
              if (elem.type === 'qrCode') {
                const qSize = elem.qrSize || 85;
                return (
                  <div
                    key={elem.id}
                    id={`elem-${elem.id}`}
                    onMouseDown={(e) => handleElementMouseDown(e, elem.id, elem.x, elem.y)}
                    onClick={(e) => {
                      if (interactive) {
                        e.stopPropagation();
                        onSelectElement?.(elem.id);
                      } else if (onOpenVerification) {
                        onOpenVerification(volunteer);
                      }
                    }}
                    style={{
                      position: "absolute",
                      top: `${elem.y}%`,
                      left: `${elem.x}%`,
                      zIndex: elem.zIndex || 15
                    }}
                    className={`flex flex-col items-center select-none ${
                      interactive ? 'cursor-move hover:ring-2 hover:ring-emerald-400 hover:ring-dashed' : 'cursor-pointer group'
                    } ${interactive && selectedElementId === elem.id ? 'ring-2 ring-emerald-600 ring-offset-2' : ''}`}
                    title="رمز التحقق من العضوية"
                  >
                    <div 
                      className="bg-white p-1 rounded-xl shadow-xs border border-neutral-200 transition-all group-hover:scale-105 group-hover:border-emerald-500"
                      style={{ width: `${qSize}px`, height: `${qSize}px` }}
                    >
                      {qrDataUrl ? (
                        <img src={qrDataUrl} alt="QR Code" className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-400">
                          <QrCode className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <span className="text-[8px] font-bold text-neutral-500 mt-0.5 group-hover:text-emerald-700">
                      مسح للتحقق ✓
                    </span>
                  </div>
                );
              }

              // 3. Barcode Element
              if (elem.type === 'barcode') {
                return (
                  <div
                    key={elem.id}
                    id={`elem-${elem.id}`}
                    onMouseDown={(e) => handleElementMouseDown(e, elem.id, elem.x, elem.y)}
                    onClick={(e) => {
                      if (interactive) {
                        e.stopPropagation();
                        onSelectElement?.(elem.id);
                      }
                    }}
                    style={{
                      position: "absolute",
                      top: `${elem.y}%`,
                      left: `${elem.x}%`,
                      zIndex: elem.zIndex || 15,
                      width: elem.width ? `${elem.width}px` : "200px"
                    }}
                    className={`select-none ${
                      interactive ? 'cursor-move hover:ring-2 hover:ring-emerald-400 hover:ring-dashed' : ''
                    } ${interactive && selectedElementId === elem.id ? 'ring-2 ring-emerald-600 ring-offset-2' : ''}`}
                  >
                    {renderSimulatedBarcode(volunteer.barcode || volunteer.membershipNumber || "100088868001")}
                  </div>
                );
              }

              // 4. Association Logo Element
              if (elem.type === 'associationLogo') {
                return (
                  <div
                    key={elem.id}
                    id={`elem-${elem.id}`}
                    onMouseDown={(e) => handleElementMouseDown(e, elem.id, elem.x, elem.y)}
                    onClick={(e) => {
                      if (interactive) {
                        e.stopPropagation();
                        onSelectElement?.(elem.id);
                      }
                    }}
                    style={{
                      position: "absolute",
                      top: `${elem.y}%`,
                      left: `${elem.x}%`,
                      zIndex: elem.zIndex || 15
                    }}
                    className={`flex items-center gap-2 select-none ${
                      interactive ? 'cursor-move hover:ring-2 hover:ring-emerald-400 hover:ring-dashed' : ''
                    } ${interactive && selectedElementId === elem.id ? 'ring-2 ring-emerald-600 ring-offset-2' : ''}`}
                  >
                    <div className="w-11 h-11 rounded-full bg-emerald-600 flex items-center justify-center text-white font-black text-lg shadow-xs border-2 border-amber-400">
                      ر
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-emerald-900 leading-tight">جمعية ريادة العطاء لخدمة الإنسان بالعسيلة</h4>
                      <p className="text-[9.5px] text-neutral-500 font-bold leading-none">بمكة المكرمة</p>
                    </div>
                  </div>
                );
              }

              // 5. Team Logo Element
              if (elem.type === 'teamLogo') {
                if (!team?.logoUrl) return null;
                return (
                  <div
                    key={elem.id}
                    id={`elem-${elem.id}`}
                    onMouseDown={(e) => handleElementMouseDown(e, elem.id, elem.x, elem.y)}
                    onClick={(e) => {
                      if (interactive) {
                        e.stopPropagation();
                        onSelectElement?.(elem.id);
                      }
                    }}
                    style={{
                      position: "absolute",
                      top: `${elem.y}%`,
                      left: `${elem.x}%`,
                      zIndex: elem.zIndex || 15
                    }}
                    className={`select-none ${
                      interactive ? 'cursor-move hover:ring-2 hover:ring-emerald-400 hover:ring-dashed' : ''
                    } ${interactive && selectedElementId === elem.id ? 'ring-2 ring-emerald-600 ring-offset-2' : ''}`}
                  >
                    <img
                      src={team.logoUrl}
                      alt={team.nameAr}
                      className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500 shadow-xs"
                    />
                  </div>
                );
              }

              // Standard Text Element
              const displayText = getElementValue(elem);
              return (
                <div
                  key={elem.id}
                  id={`elem-${elem.id}`}
                  onMouseDown={(e) => handleElementMouseDown(e, elem.id, elem.x, elem.y)}
                  onClick={(e) => {
                    if (interactive) {
                      e.stopPropagation();
                      onSelectElement?.(elem.id);
                    }
                  }}
                  style={style}
                  className={`whitespace-nowrap leading-tight select-none ${
                    interactive ? 'cursor-move hover:ring-2 hover:ring-emerald-400 hover:ring-dashed' : ''
                  } ${interactive && selectedElementId === elem.id ? 'ring-2 ring-emerald-600 ring-offset-2 bg-emerald-500/10 rounded-sm' : ''}`}
                >
                  {displayText}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Buttons Bar */}
      {showActions && !isPrintMode && (
        <div className="w-full flex flex-wrap items-center justify-center gap-2 mt-4" dir="rtl">
          {onOpenVerification && (
            <button
              id={`btn-verify-${volunteer.id}`}
              onClick={() => onOpenVerification(volunteer)}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>معاينة التحقق الذكي</span>
            </button>
          )}

          <button
            id={`btn-dl-png-${volunteer.id}`}
            onClick={() => exportCardAsImage("png")}
            disabled={isExporting}
            className="bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isExporting ? "جاري التصدير..." : "تحميل PNG"}</span>
          </button>

          <button
            id={`btn-dl-jpg-${volunteer.id}`}
            onClick={() => exportCardAsImage("jpeg")}
            disabled={isExporting}
            className="bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-amber-600" />
            <span>تحميل JPG</span>
          </button>

          <button
            id={`btn-print-card-${volunteer.id}`}
            onClick={handlePrint}
            className="bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-blue-600" />
            <span>طباعة البطاقة</span>
          </button>

          {onReissue && (
            <button
              id={`btn-reissue-card-${volunteer.id}`}
              onClick={() => onReissue(volunteer.id)}
              className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
              <span>إعادة إنشاء البطاقة</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
