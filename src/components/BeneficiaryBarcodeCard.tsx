import React, { useEffect, useRef, useState } from 'react';
import { 
  Printer, 
  Download, 
  Copy, 
  Check, 
  QrCode, 
  Barcode, 
  ShieldCheck, 
  User, 
  Phone, 
  CreditCard,
  Building2,
  X
} from 'lucide-react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { Beneficiary, HomeSettings } from '../types';

interface BeneficiaryBarcodeCardProps {
  beneficiary: Beneficiary;
  homeSettings?: HomeSettings;
  isOpen?: boolean;
  onClose?: () => void;
  lang?: "ar" | "en";
}

export const BeneficiaryBarcodeCard: React.FC<BeneficiaryBarcodeCardProps> = ({
  beneficiary,
  homeSettings,
  isOpen = true,
  onClose,
  lang = "ar"
}) => {
  const barcodeSvgRef = useRef<SVGSVGElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const barcodeValue = beneficiary.barcodeId || `BC-BEN-${beneficiary.nationalId ? beneficiary.nationalId.slice(-6) : beneficiary.id.slice(-6)}`;
  const benNumber = beneficiary.beneficiaryNumber || `BEN-2026-${beneficiary.id.replace(/\D/g, '').padStart(4, '0')}`;

  // Generate 1D and 2D barcodes
  useEffect(() => {
    if (barcodeSvgRef.current && barcodeValue) {
      try {
        JsBarcode(barcodeSvgRef.current, barcodeValue, {
          format: "CODE128",
          width: 2,
          height: 50,
          displayValue: true,
          font: "monospace",
          fontSize: 13,
          textMargin: 4,
          background: "transparent",
          lineColor: "#0f172a"
        });
      } catch (err) {
        console.error("JsBarcode generation error:", err);
      }
    }

    if (barcodeValue) {
      QRCode.toDataURL(barcodeValue, {
        width: 140,
        margin: 1,
        color: {
          dark: '#064e3b',
          light: '#ffffff'
        }
      })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error("QR generation error:", err));
    }
  }, [barcodeValue]);

  const handleCopyBarcode = () => {
    navigator.clipboard.writeText(barcodeValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const orgName = homeSettings?.siteNameAr || "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8">
          <title>بطاقة باركود المستفيد - ${beneficiary.name}</title>
          <style>
            @page { size: auto; margin: 10mm; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              background: #fff; 
              margin: 0; 
              padding: 20px; 
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .card {
              border: 2px solid #059669;
              border-radius: 16px;
              width: 380px;
              padding: 20px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.08);
              text-align: center;
              position: relative;
              background: #ffffff;
            }
            .header {
              border-bottom: 2px dashed #e2e8f0;
              padding-bottom: 12px;
              margin-bottom: 14px;
            }
            .title { font-size: 15px; font-weight: bold; color: #065f46; margin: 0; }
            .subtitle { font-size: 11px; color: #64748b; margin-top: 4px; }
            .name { font-size: 18px; font-weight: 800; color: #0f172a; margin: 8px 0 4px 0; }
            .meta { font-size: 12px; color: #475569; margin: 2px 0; }
            .badge { 
              display: inline-block; 
              padding: 3px 10px; 
              border-radius: 12px; 
              background: #ecfdf5; 
              color: #047857; 
              font-size: 11px; 
              font-weight: bold; 
              margin-bottom: 8px;
            }
            .barcode-box {
              margin: 12px 0;
              padding: 8px;
              background: #f8fafc;
              border-radius: 8px;
              border: 1px solid #e2e8f0;
            }
            .qr-box {
              margin-top: 8px;
            }
            .qr-box img {
              width: 100px;
              height: 100px;
            }
            .footer {
              font-size: 10px;
              color: #94a3b8;
              margin-top: 10px;
              border-top: 1px solid #f1f5f9;
              padding-top: 8px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div class="title">${orgName}</div>
              <div class="subtitle">بطاقة المستفيد الدائمة لصرف المساعدات والسلال</div>
            </div>
            <div class="badge">${beneficiary.category || "أسر متعففة"}</div>
            <div class="name">${beneficiary.name}</div>
            <div class="meta">رقم المستفيد: <strong>${benNumber}</strong></div>
            <div class="meta">رقم الهوية: <strong>${beneficiary.nationalId || '---'}</strong></div>
            <div class="meta">عدد الأفراد: <strong>${beneficiary.familySize || 1}</strong> | هاتف: ${beneficiary.phone || '---'}</div>
            
            <div class="barcode-box">
              ${barcodeSvgRef.current ? barcodeSvgRef.current.outerHTML : ''}
            </div>

            ${qrDataUrl ? `
              <div class="qr-box">
                <img src="${qrDataUrl}" alt="QR" />
                <div style="font-size: 11px; font-weight: bold; color: #0f172a; margin-top: 2px;">
                  رمز الباركود: ${barcodeValue}
                </div>
              </div>
            ` : ''}

            <div class="footer">
              معتمد ومسجل بقاعدة بيانات الجمعية • صالح لجميع التوزيعات المستقبلية
            </div>
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

  const handleDownloadPng = async () => {
    if (!cardRef.current) return;
    setIsDownloading(true);
    try {
      // Create a canvas representation
      const canvas = document.createElement('canvas');
      canvas.width = 440;
      canvas.height = 540;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Card border
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

      // Header background
      ctx.fillStyle = '#f0fdf4';
      ctx.fillRect(14, 14, canvas.width - 28, 80);

      // Header Text
      ctx.fillStyle = '#065f46';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(homeSettings?.siteNameAr || 'جمعية ريادة العطاء لخدمة الإنسان بالعسيلة', canvas.width / 2, 45);

      ctx.fillStyle = '#059669';
      ctx.font = '12px Arial';
      ctx.fillText('بطاقة المستفيد الدائمة لصرف المساعدات الإنسانية', canvas.width / 2, 70);

      // Beneficiary info
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 20px Arial';
      ctx.fillText(beneficiary.name, canvas.width / 2, 130);

      ctx.fillStyle = '#475569';
      ctx.font = '13px Arial';
      ctx.fillText(`رقم المستفيد: ${benNumber}`, canvas.width / 2, 160);
      ctx.fillText(`رقم الهوية: ${beneficiary.nationalId || '---'} | الأسرة: ${beneficiary.familySize || 1} أفراد`, canvas.width / 2, 185);

      // Draw QR Code if available
      if (qrDataUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve) => {
          img.onload = () => {
            ctx.drawImage(img, canvas.width / 2 - 60, 210, 120, 120);
            resolve(true);
          };
          img.src = qrDataUrl;
        });
      }

      // Barcode Code Text
      ctx.fillStyle = '#064e3b';
      ctx.font = 'bold 15px monospace';
      ctx.fillText(barcodeValue, canvas.width / 2, 360);

      ctx.fillStyle = '#64748b';
      ctx.font = '11px Arial';
      ctx.fillText('معتمد لجميع عمليات توزيع السلال، الكسوة، والمساعدات', canvas.width / 2, 395);
      ctx.fillText('صالح لجميع التوزيعات ومسح الباركود بكاميرا الجوال أو القارئ', canvas.width / 2, 420);

      // Download
      const link = document.createElement('a');
      link.download = `بطاقة_باركود_${beneficiary.name.replace(/\s+/g, '_')}_${barcodeValue}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error("Error generating card image:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div 
        className="relative bg-white dark:bg-neutral-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-neutral-100 dark:border-neutral-800 text-right"
        dir={lang === "ar" ? "rtl" : "ltr"}
      >
        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Modal Title */}
        <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <Barcode className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-neutral-900 dark:text-white">
              بطاقة الباركود الدائمة للمستفيد
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              باركود موحد وثابت ومعتمد في جميع التوزيعات المستقبلية
            </p>
          </div>
        </div>

        {/* The Card View */}
        <div 
          ref={cardRef}
          className="rounded-2xl border-2 border-emerald-600/30 bg-gradient-to-b from-emerald-50/40 via-white to-neutral-50 dark:from-emerald-950/20 dark:via-neutral-900 dark:to-neutral-900/60 p-5 shadow-inner relative overflow-hidden"
        >
          {/* Header */}
          <div className="text-center pb-3 border-b border-dashed border-emerald-200 dark:border-emerald-800/60">
            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              <span>{homeSettings?.siteNameAr || "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة"}</span>
            </div>
            <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
              نظام إدارة التوزيعات والمساعدات الإنسانية الذكي
            </div>
          </div>

          {/* Beneficiary Details */}
          <div className="mt-3.5 text-center space-y-1">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
              {beneficiary.category || "أسر متعففة"}
            </span>
            <h4 className="text-base font-black text-neutral-900 dark:text-white">
              {beneficiary.name}
            </h4>
            <div className="flex items-center justify-center gap-2 text-xs text-neutral-600 dark:text-neutral-300">
              <span>رقم المستفيد: <strong className="font-mono text-emerald-700 dark:text-emerald-400">{benNumber}</strong></span>
              <span>•</span>
              <span>الهوية: <strong className="font-mono">{beneficiary.nationalId || '---'}</strong></span>
            </div>
            {beneficiary.phone && (
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center justify-center gap-1">
                <Phone className="w-3 h-3 text-neutral-400" />
                <span dir="ltr">{beneficiary.phone}</span>
                <span>(عدد الأفراد: {beneficiary.familySize || 1})</span>
              </div>
            )}
          </div>

          {/* 1D Barcode Rendering */}
          <div className="mt-4 p-3 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 flex flex-col items-center justify-center overflow-x-auto shadow-xs">
            <svg ref={barcodeSvgRef} className="max-w-full h-14"></svg>
            <div className="text-[11px] font-mono font-bold text-neutral-700 dark:text-neutral-300 mt-1 flex items-center gap-1.5">
              <span>{barcodeValue}</span>
              <button 
                onClick={handleCopyBarcode}
                className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                title="نسخ رمز الباركود"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* 2D QR Code Rendering */}
          <div className="mt-3 flex items-center justify-center gap-3">
            {qrDataUrl && (
              <div className="p-1.5 bg-white rounded-xl border border-emerald-200 shadow-xs">
                <img src={qrDataUrl} alt="QR Code" className="w-20 h-20" />
              </div>
            )}
            <div className="text-right space-y-1">
              <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1">
                <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                <span>مسح سريع بالكاميرا</span>
              </div>
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-[200px]">
                يدعم القراءة الفورية عبر كاميرا جوال الموظف أو قارئ الباركود الخارجي المكتبي.
              </p>
              <div className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>معرف داخلي آمن ودائم</span>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-3.5 pt-2 text-center text-[10px] text-neutral-400 dark:text-neutral-500 border-t border-neutral-200/60 dark:border-neutral-800">
            صالح للاستخدام في كافة التوزيعات (سلال، كسوة، وجبات، مياه، أجهزة، إلخ)
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة البطاقة</span>
          </button>

          <button
            onClick={handleDownloadPng}
            disabled={isDownloading}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{isDownloading ? "جاري التجهيز..." : "تحميل صورة PNG"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
