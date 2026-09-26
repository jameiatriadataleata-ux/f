import React from "react";
import { Award, Download, Printer, CheckCircle2, ShieldCheck, Sparkles, QrCode } from "lucide-react";
import { IssuedCertificate } from "../types";

interface CertificateViewerProps {
  certificate: IssuedCertificate;
  onClose?: () => void;
}

export const CertificateViewer: React.FC<CertificateViewerProps> = ({ certificate, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Action Header */}
      <div className="flex items-center justify-between bg-neutral-900 text-white p-4 rounded-2xl no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center font-bold">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-black">{certificate.initiativeName || "شهادة تطوع متميزة"}</h3>
            <p className="text-[11px] text-neutral-400">
              كود التوثيق المعتمد: <span className="font-mono text-emerald-400 font-bold">{certificate.certificateCode}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة الشهادة</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer"
            >
              إغلاق
            </button>
          )}
        </div>
      </div>

      {/* Certificate Visual Rendering Canvas Container */}
      <div className="relative w-full aspect-16/11 bg-white rounded-2xl shadow-xl overflow-hidden border border-neutral-200 print:shadow-none print:border-none print:w-full">
        {/* Background Certificate Template Image */}
        <img
          src={certificate.templateBackgroundUrl || "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&h=800&fit=crop"}
          alt="قالب الشهادة الرسمية"
          className="w-full h-full object-cover select-none pointer-events-none"
        />

        {/* Dynamic Name Overlay */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 text-center font-black transition-all whitespace-nowrap"
          style={{
            left: `${certificate.nameX || 50}%`,
            top: `${certificate.nameY || 42}%`,
            fontSize: `clamp(14px, ${certificate.nameFontSize ? certificate.nameFontSize / 12 : 2}vw, 32px)`,
            color: certificate.nameColor || "#15803d",
            fontFamily: "'Cairo', 'Amiri', 'Traditional Arabic', sans-serif"
          }}
        >
          {certificate.volunteerName}
        </div>

        {/* Dynamic Initiative Title Overlay */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 text-center font-bold transition-all max-w-[80%]"
          style={{
            left: `${certificate.initiativeX || 50}%`,
            top: `${certificate.initiativeY || 56}%`,
            fontSize: `clamp(11px, ${certificate.initiativeFontSize ? certificate.initiativeFontSize / 14 : 1.4}vw, 22px)`,
            color: certificate.initiativeColor || "#1e293b",
            fontFamily: "'Cairo', sans-serif"
          }}
        >
          {certificate.initiativeName}
        </div>

        {/* Dynamic Hours Overlay */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 font-extrabold text-center transition-all whitespace-nowrap"
          style={{
            left: `${certificate.hoursX || 35}%`,
            top: `${certificate.hoursY || 68}%`,
            fontSize: `clamp(10px, ${certificate.hoursFontSize ? certificate.hoursFontSize / 16 : 1.2}vw, 18px)`,
            color: certificate.hoursColor || "#0f766e"
          }}
        >
          عدد الساعات: {certificate.hours} ساعات تطوعية
        </div>

        {/* Dynamic Date Overlay */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 font-bold text-center transition-all whitespace-nowrap"
          style={{
            left: `${certificate.dateX || 65}%`,
            top: `${certificate.dateY || 68}%`,
            fontSize: `clamp(10px, ${certificate.dateFontSize ? certificate.dateFontSize / 16 : 1.2}vw, 18px)`,
            color: certificate.dateColor || "#64748b"
          }}
        >
          التاريخ: {certificate.issueDate}
        </div>

        {/* Dynamic QR Code Verification Overlay */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 bg-white p-1 rounded-lg border border-neutral-200 shadow-sm flex flex-col items-center"
          style={{
            left: `${certificate.qrX || 85}%`,
            top: `${certificate.qrY || 78}%`,
            width: `${certificate.qrSize || 70}px`,
            height: `${certificate.qrSize || 70}px`
          }}
        >
          <div className="w-full h-full bg-neutral-900 rounded-md p-1 flex items-center justify-center text-white">
            <QrCode className="w-full h-full text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Verification Badge Footer */}
      <div className="bg-emerald-50 border border-emerald-200/60 p-3.5 rounded-xl flex items-center justify-between text-xs text-emerald-900 no-print">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>
            شهادة تطوع رسمية موثقة برقم قيد معتمد من <b>جمعية ريادة العطاء لخدمة الإنسان بالعسيلة</b>
          </span>
        </div>
        <span className="text-[10px] bg-emerald-600 text-white px-2.5 py-1 rounded-full font-bold">
          موثقة ومختومة آلياً ✓
        </span>
      </div>
    </div>
  );
};
