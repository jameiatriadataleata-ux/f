import nodemailer from "nodemailer";
import { promises as dnsPromises } from "dns";

export interface SendEmailPayload {
  to: string | string[];
  recipientName?: string;
  subject: string;
  templateType: string;
  templateData?: Record<string, any>;
  customHtml?: string;
  customText?: string;
  lang?: 'ar' | 'en' | 'fr';
  replyTo?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  provider: 'resend' | 'smtp' | 'simulation';
  error?: string;
  durationMs: number;
  timestamp: string;
}

// 1. Bulletproof Association HTML Email Templates Generator
export function generateEmailHtml(
  templateType: string,
  data: Record<string, any> = {},
  lang: 'ar' | 'en' | 'fr' = 'ar'
): { subject: string; html: string; text: string } {
  const isRtl = lang === 'ar';
  const associationNameAr = "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة";
  const associationSubAr = "مسجلة بالمركز الوطني لتنمية القطاع غير الربحي برقم (5253) - مكة المكرمة";
  const year = new Date().getFullYear();

  // Helper for dynamic token replacement in strings
  const rep = (str: string, tokens: Record<string, any>) => {
    let out = str;
    for (const [k, v] of Object.entries(tokens)) {
      out = out.replace(new RegExp(`{{${k}}}`, 'g'), String(v ?? ''));
    }
    return out;
  };

  let title = "إشعار رسمي من جمعية ريادة العطاء";
  let preheader = "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة";
  let greeting = `مرحباً ${data.recipientName || data.name || data.customerName || 'عزيزنا المستفيد / الشريك'}`;
  let bodyParagraphs: string[] = [];
  let actionButton: { text: string; url: string } | null = null;
  let highlightBadge: { label: string; value: string; color?: string } | null = null;
  let keyValues: { label: string; value: string }[] = [];

  switch (templateType) {
    case 'test_email':
      title = "اختبار نظام البريد الإلكتروني الحقيقي";
      preheader = "اختبار الربط والتكامل مع Resend / SMTP بنجاح";
      bodyParagraphs = [
        "تم إرسال هذه الرسالة لاختبار إعدادات وخادم البريد الإلكتروني بنجاح.",
        "نظام البريد الإلكتروني في جمعية ريادة العطاء لخدمة الإنسان بالعسيلة متصل وجاهز لإرسال الإشعارات، التنبيهات، رموز التحقق، وتحديثات المتجر والمبادرات للمستفيدين والمتطوعين والإدارة."
      ];
      highlightBadge = {
        label: "حالة الربط والاتصال",
        value: "ناجح ونشط (Active & Operational)",
        color: "#059669"
      };
      keyValues = [
        { label: "المزود المستخدم", value: data.providerName || "Resend / SMTP" },
        { label: "تاريخ ووقت الاختبار", value: new Date().toLocaleString('ar-SA') },
        { label: "المرسل الرسمي", value: data.sender || "جمعية ريادة العطاء" }
      ];
      break;

    case 'welcome':
    case 'new_account':
      title = "أهلاً بك في منصة جمعية ريادة العطاء";
      preheader = "تم إنشاء وتفعيل حسابك الرسمي بنجاح";
      bodyParagraphs = [
        "يسعدنا انضمامك إلى المنصة الرقمية لجمعية ريادة العطاء لخدمة الإنسان بالعسيلة بمكة المكرمة.",
        "يمكنك الآن الاستفادة من كافة الخدمات المتاحة، متابعة المبادرات التطوعية، الاطلاع على البرامج الاجتماعية، أو المساهمة في المتجر الخيري."
      ];
      keyValues = [
        { label: "اسم الحساب", value: data.name || data.recipientName || "-" },
        { label: "البريد الإلكتروني", value: data.email || "-" },
        { label: "الدور / الصفة", value: data.role || "عضو مسجل" },
        { label: "تاريخ التسجيل", value: new Date().toLocaleDateString('ar-SA') }
      ];
      if (data.loginUrl) {
        actionButton = { text: "الدخول إلى حسابي", url: data.loginUrl };
      }
      break;

    case 'password_reset':
      title = "إعادة تعيين كلمة المرور - ريادة العطاء";
      preheader = "طلب رمز استعادة كلمة المرور لحسابك";
      bodyParagraphs = [
        "تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في منصة جمعية ريادة العطاء.",
        "استخدم رمز التحقق التالي لإتمام إعادة تعيين كلمة المرور، أو اضغط على الزر أدناه:"
      ];
      if (data.resetCode) {
        highlightBadge = {
          label: "رمز استعادة كلمة المرور المؤقت",
          value: data.resetCode,
          color: "#0284c7"
        };
      }
      if (data.resetLink) {
        actionButton = { text: "إعادة تعيين كلمة المرور الآن", url: data.resetLink };
      }
      keyValues = [
        { label: "صلاحية الرمز", value: "30 دقيقة فقط" },
        { label: "تنبيه أمان", value: "إذا لم تقم بطلب هذا الرمز بنفسك، يرجى تجاهل هذه الرسالة أو إبلاغ الدعم الفني فوراً." }
      ];
      break;

    case 'email_verification':
      title = "تأكيد عنوان البريد الإلكتروني";
      preheader = "رمز التحقق والتفعيل الرسمي";
      bodyParagraphs = [
        "شكراً لتسجيلك. يرجى تأكيد عنوان بريدك الإلكتروني لضمان استلام التنبيهات والشهادات والتقارير المعتمدة."
      ];
      if (data.verificationCode) {
        highlightBadge = {
          label: "رمز التحقق",
          value: data.verificationCode,
          color: "#10b981"
        };
      }
      break;

    case 'volunteer_application_received':
      title = "تم استلام طلب انضمامك للتطوع بنجاح";
      preheader = `طلب تطوع رقم ${data.applicationNumber || ''}`;
      bodyParagraphs = [
        "شكراً لمبادرتك ورغبتك في خدمة مجتمعنا عبر جمعية ريادة العطاء لخدمة الإنسان بالعسيلة.",
        "تم تسجيل طلبك رسمياً وهو الآن قيد المراجعة والفرز من قبل إدارة التطوع."
      ];
      keyValues = [
        { label: "رقم الطلب", value: data.applicationNumber || `REQ-${Date.now().toString().slice(-6)}` },
        { label: "الفريق المستهدف", value: data.teamName || "الإدارة العامة للتطوع" },
        { label: "تاريخ التقديم", value: new Date().toLocaleDateString('ar-SA') },
        { label: "حالة الطلب", value: "قيد المراجعة والتدقيق" }
      ];
      break;

    case 'volunteer_approved':
      title = "تهانينا! تم قبول انضمامك لفريق التطوع";
      preheader = "اعتماد طلب التطوع وإصدار العضوية";
      bodyParagraphs = [
        `أهلاً بك ضمن كوكبة فرسان العطاء! يسرنا إبلاغك بأنه تم قبول طلب انضمامك رسمياً وإسنادك إلى: ${data.teamName || 'فريق التطوع'}.`,
        "تم إصدار بطاقتك الرقمية الرسمية وتفعيل حسابك للمشاركة في المبادرات الميدانية وحساب ساعاتك التطوعية في المنصة الوطنية."
      ];
      highlightBadge = {
        label: "رقم العضوية التطوعية",
        value: data.membershipNumber || data.volunteerId || "ريادة-2026",
        color: "#059669"
      };
      keyValues = [
        { label: "اسم المتطوع", value: data.recipientName || data.name || "-" },
        { label: "الفريق التطوعي", value: data.teamName || "-" },
        { label: "قائد الفريق", value: data.leaderName || "إدارة التطوع" }
      ];
      if (data.cardUrl || data.loginUrl) {
        actionButton = { text: "عرض بطاقتي الرقمية", url: data.cardUrl || data.loginUrl };
      }
      break;

    case 'volunteer_rejected':
      title = "بشأن طلب الانضمام إلى التطوع";
      preheader = "إشعار بقرار لجنة فرز طلبات التطوع";
      bodyParagraphs = [
        "نتقدم لك بخالص الشكر والتقدير على اهتمامك ورغبتك الكريمة في التطوع مع جمعية ريادة العطاء.",
        "نود إحاطتكم بأنه تعذر قبول الطلب في الوقت الحالي لاكتمال الطاقة الاستيعابية أو الشروط الخاصة بالفرص المتاحة.",
        data.reason ? `سبب القرار: ${data.reason}` : "نتطلع للتعاون معكم في مبادرات ومشاريع قادمة بإذن الله."
      ];
      break;

    case 'team_application_received':
    case 'team_application_approved':
    case 'team_application_rejected':
      title = templateType === 'team_application_approved'
        ? "اعتماد تأسيس الفريق التطوعي رسمياً"
        : (templateType === 'team_application_rejected' ? "بشأن طلب تأسيس فريق تطوعي" : "تم استلام طلب تأسيس الفريق التطوعي");
      bodyParagraphs = [
        templateType === 'team_application_approved'
          ? `نبارك لكم اعتماد تأسيس فريق (${data.teamName || ''}) تحت مظلة جمعية ريادة العطاء لخدمة الإنسان بالعسيلة.`
          : (templateType === 'team_application_rejected'
            ? `نعتذر عن عدم إمكانية اعتماد الفريق التطوعي (${data.teamName || ''}) حالياً.`
            : `تم استلام طلب تأسيس فريق (${data.teamName || ''}) وهو قيد الدراسة من الإشراف العام.`)
      ];
      keyValues = [
        { label: "اسم الفريق", value: data.teamName || "-" },
        { label: "قائد الفريق", value: data.leaderName || "-" },
        { label: "حالة الطلب", value: data.status || "محدث" }
      ];
      break;

    case 'order_confirmation':
    case 'donation_confirmation':
      title = "تأكيد استلام مساهمتك / طلبك بالمتجر الخيري";
      preheader = `طلب رقم ${data.orderNumber || ''} - جزاكم الله خيراً`;
      bodyParagraphs = [
        "جزاكم الله خيراً وكتب أجركم! تم استلام مساهمتكم الكريمة في متجر جمعية ريادة العطاء لخدمة الإنسان بالعسيلة بنجاح.",
        "مساهمتكم تصنع فارقاً حقيقياً ومباشراً في دعم الفئات الأكثر احتياجاً ورعاية الأسر بمكة المكرمة."
      ];
      highlightBadge = {
        label: "المبلغ الإجمالي",
        value: `${data.orderTotal || data.amount || 0} ر.س`,
        color: "#059669"
      };
      keyValues = [
        { label: "رقم الطلب / المساهمة", value: data.orderNumber || "-" },
        { label: "المشروع / الحزمة", value: data.projectName || data.itemsSummary || "سهم خيري" },
        { label: "طريقة الدفع", value: data.paymentMethod || "دفع إلكتروني آمن" },
        { label: "حالة الطلب", value: data.status || "تم بنجاح ومكتمل" },
        { label: "تاريخ العملية", value: new Date().toLocaleDateString('ar-SA') }
      ];
      if (data.receiptUrl) {
        actionButton = { text: "تحميل سند المساهمة الرسمي (PDF)", url: data.receiptUrl };
      }
      break;

    case 'order_status_updated':
      title = `تحديث حالة طلبك رقم (${data.orderNumber || ''})`;
      preheader = `الحالة الحالية: ${data.status || 'محدث'}`;
      bodyParagraphs = [
        "نود إشعاركم بأنه تم تحديث حالة طلبكم في متجر جمعية ريادة العطاء كما يلي:",
        data.statusNotes ? `ملاحظات الإدارة: ${data.statusNotes}` : ""
      ].filter(Boolean);
      highlightBadge = {
        label: "الحالة الجديدة للطلب",
        value: data.status || "محدث",
        color: "#0284c7"
      };
      keyValues = [
        { label: "رقم الطلب", value: data.orderNumber || "-" },
        { label: "المستفيد / العميل", value: data.customerName || data.recipientName || "-" },
        { label: "تاريخ التحديث", value: new Date().toLocaleString('ar-SA') }
      ];
      break;

    case 'admin_new_order':
      title = "إشعار إداري: مساهمة / طلب جديد بالمتجر";
      preheader = `طلب جديد بمبلغ ${data.orderTotal || data.amount || 0} ر.س`;
      bodyParagraphs = [
        "تم تسجيل مساهمة أو طلب تبرع جديد في متجر جمعية ريادة العطاء الإلكتروني.",
        "يرجى مراجعة تفاصيل المعاملة في لوحة الإدارة المالية والمتجر."
      ];
      keyValues = [
        { label: "رقم الطلب", value: data.orderNumber || "-" },
        { label: "اسم المساهم / المتبرع", value: data.customerName || "فاعل خير" },
        { label: "رقم الجوال", value: data.customerPhone || "-" },
        { label: "المبلغ", value: `${data.orderTotal || data.amount || 0} ر.س` },
        { label: "المشروع المستفيد", value: data.projectName || "-" }
      ];
      break;

    case 'beneficiary_request_received':
    case 'beneficiary_approved':
      title = templateType === 'beneficiary_approved'
        ? "تم اعتماد تسجيلكم في برامج الرعاية الاجتماعية"
        : "تم استلام طلب الاستفادة والرعاية الاجتماعية";
      bodyParagraphs = [
        templateType === 'beneficiary_approved'
          ? "يسر جمعية ريادة العطاء لخدمة الإنسان بالعسيلة إبلاغكم باعتماد ملفكم رسمياً في منظومة الرعاية الاجتماعية والمساعدات."
          : "تم استلام طلبكم في قسم الرعاية الاجتماعية وخدمة المستفيدين بنجاح، وسيتم دراسته من قبل الباحث الاجتماعي."
      ];
      keyValues = [
        { label: "رقم الملف / الطلب", value: data.fileNumber || data.requestId || "-" },
        { label: "اسم المستفيد", value: data.beneficiaryName || data.recipientName || "-" },
        { label: "حالة الملف", value: templateType === 'beneficiary_approved' ? "معتمد ونشط" : "قيد الدراسة والفرز" }
      ];
      break;

    case 'distribution_handover':
      title = "إشعار تسليم مساعدة / سلة غذائية رسمية";
      preheader = `محضر تسليم رقم ${data.handoverCode || data.code || ''}`;
      bodyParagraphs = [
        "نود إشعاركم بأنه تم تسجيل استلام مساعدة / سلة غذائية لصالح المستفيد المعتمد وفقاً لمحضر التسليم الرسمي."
      ];
      keyValues = [
        { label: "رقم المحضر", value: data.handoverCode || data.code || "-" },
        { label: "اسم المستلم", value: data.recipientName || "-" },
        { label: "نوع المساعدة", value: data.distributionTitle || "سلة غذائية / كسوة" },
        { label: "تاريخ ووقت التسليم", value: data.deliveredAt || new Date().toLocaleString('ar-SA') },
        { label: "المشرف الميداني", value: data.staffName || "فريق التوزيع الميداني" }
      ];
      break;

    case 'employee_request_received':
    case 'employee_request_approved':
    case 'employee_request_action':
      title = templateType === 'employee_request_approved'
        ? "اعتماد توظيف / استقطاب كادر بالإدارة"
        : (templateType === 'employee_request_action' ? "تحديث حول طلب التوظيف والاستقطاب" : "استلام طلب توظيف كادر إداري");
      bodyParagraphs = [
        data.notes || "إشعار رسمي من الإدارة التنفيذية لجمعية ريادة العطاء لخدمة الإنسان بالعسيلة بشأن الكوادر البشرية."
      ];
      keyValues = [
        { label: "رقم الطلب", value: data.requestNumber || "-" },
        { label: "اسم المرشح / الموظف", value: data.candidateName || data.fullName || "-" },
        { label: "الإدارة الطالبة", value: data.departmentName || "-" },
        { label: "المسمى الوظيفي", value: data.jobTitle || "-" },
        { label: "الحالة", value: data.status || "محدث" }
      ];
      break;

    case 'support_ticket_created':
    case 'support_ticket_reply':
      title = templateType === 'support_ticket_reply'
        ? `رد الإدارة على تذكرتكم رقم (${data.ticketNumber || ''})`
        : `تم فتح تذكرة دعم واستفسار رقم (${data.ticketNumber || ''})`;
      bodyParagraphs = [
        templateType === 'support_ticket_reply'
          ? `قامت إدارة الجمعية بالرد على استفساركم كما يلي:\n"${data.replyContent || data.reply || ''}"`
          : "تم استلام استفساركم وتوجيهه للفريق المختص بجمعية ريادة العطاء لخدمة الإنسان بالعسيلة."
      ];
      keyValues = [
        { label: "رقم التذكرة", value: data.ticketNumber || `TCK-${Date.now().toString().slice(-5)}` },
        { label: "الموضوع", value: data.ticketTitle || "استفسار وطلب دعم" },
        { label: "الحالة", value: data.status || "قيد المتابعة" }
      ];
      if (data.ticketUrl) {
        actionButton = { text: "متابعة التذكرة بالمنصة", url: data.ticketUrl };
      }
      break;

    case 'custody_notification':
      title = "إشعار تسليم واستلام عهدة رسمية";
      bodyParagraphs = [
        "تم توثيق محضر تسليم العهدة الإلكترونية رسمياً في نظام جمعية ريادة العطاء."
      ];
      keyValues = [
        { label: "كود العهدة", value: data.custodyCode || "-" },
        { label: "اسم المستلم", value: data.recipientName || "-" },
        { label: "بيان الأصناف", value: data.itemDescription || "-" },
        { label: "الجهة / الإدارة", value: data.departmentName || "-" }
      ];
      break;

    case 'broadcast_general':
    default:
      title = data.subject || data.title || "تعميم وإشعار رسمي من جمعية ريادة العطاء";
      preheader = data.preheader || "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة";
      if (data.message || data.content) {
        bodyParagraphs = [String(data.message || data.content)];
      } else {
        bodyParagraphs = ["نحيطكم علماً بصدور هذا الإشعار الرسمي من إدارة الجمعية."];
      }
      if (data.actionUrl && data.actionText) {
        actionButton = { text: data.actionText, url: data.actionUrl };
      }
      break;
  }

  // If user provided a specific custom subject in data, honor it
  const finalSubject = data.customSubject || title;

  // Build high-compatibility HTML template
  const html = `
<!DOCTYPE html>
<html lang="${lang}" dir="${isRtl ? 'rtl' : 'ltr'}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${finalSubject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f1f5f9;
      padding: 30px 10px;
    }
    .main-card {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
      border: 1px solid #e2e8f0;
    }
    .header-bar {
      background: linear-gradient(135deg, #064e3b 0%, #047857 100%);
      padding: 30px 24px;
      text-align: center;
      color: #ffffff;
    }
    .brand-logo-text {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin: 0;
      color: #ffffff;
      text-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }
    .brand-sub {
      font-size: 11px;
      color: #a7f3d0;
      margin: 6px 0 0 0;
      font-weight: 500;
    }
    .content-body {
      padding: 32px 28px;
    }
    .greeting {
      font-size: 16px;
      font-weight: 700;
      color: #065f46;
      margin-bottom: 16px;
    }
    .email-title {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 16px 0;
      line-height: 1.4;
    }
    .paragraph {
      font-size: 14px;
      line-height: 1.7;
      color: #334155;
      margin: 0 0 14px 0;
    }
    .highlight-box {
      margin: 24px 0;
      padding: 16px 20px;
      border-radius: 12px;
      text-align: center;
      background-color: #f0fdf4;
      border: 1px solid #bbf7d0;
    }
    .highlight-label {
      font-size: 11px;
      text-transform: uppercase;
      color: #065f46;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .highlight-value {
      font-size: 24px;
      font-weight: 900;
      color: #047857;
      letter-spacing: 0.5px;
    }
    .details-table {
      width: 100%;
      margin: 20px 0;
      border-collapse: collapse;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }
    .details-table td {
      padding: 10px 14px;
      font-size: 13px;
      border-bottom: 1px solid #f1f5f9;
    }
    .details-table tr:nth-child(even) {
      background-color: #f8fafc;
    }
    .details-label {
      font-weight: 700;
      color: #475569;
      width: 35%;
    }
    .details-value {
      color: #0f172a;
      font-weight: 600;
    }
    .btn-container {
      margin: 28px 0 16px 0;
      text-align: center;
    }
    .btn-primary {
      display: inline-block;
      background-color: #059669;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 28px;
      border-radius: 9999px;
      font-size: 14px;
      font-weight: 700;
      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      color: #64748b;
      font-size: 12px;
      line-height: 1.6;
    }
    .footer-divider {
      width: 40px;
      height: 2px;
      background-color: #cbd5e1;
      margin: 12px auto;
    }
  </style>
</head>
<body>
  <div class="wrapper" dir="${isRtl ? 'rtl' : 'ltr'}">
    <div class="main-card">
      <div class="header-bar">
        <h1 class="brand-logo-text">${associationNameAr}</h1>
        <p class="brand-sub">${associationSubAr}</p>
      </div>
      
      <div class="content-body">
        <div class="greeting">${greeting}</div>
        <h2 class="email-title">${title}</h2>
        
        ${bodyParagraphs.map(p => `<p class="paragraph">${p}</p>`).join('')}
        
        ${highlightBadge ? `
          <div class="highlight-box">
            <div class="highlight-label">${highlightBadge.label}</div>
            <div class="highlight-value" style="color: ${highlightBadge.color || '#059669'}">${highlightBadge.value}</div>
          </div>
        ` : ''}

        ${keyValues.length > 0 ? `
          <table class="details-table">
            <tbody>
              ${keyValues.map(kv => `
                <tr>
                  <td class="details-label">${kv.label}</td>
                  <td class="details-value">${kv.value}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        ${actionButton ? `
          <div class="btn-container">
            <a href="${actionButton.url}" target="_blank" class="btn-primary">${actionButton.text}</a>
          </div>
        ` : ''}
      </div>

      <div class="footer">
        <p style="margin: 0; font-weight: 600; color: #334155;">جمعية ريادة العطاء لخدمة الإنسان بالعسيلة</p>
        <p style="margin: 4px 0 0 0;">مكة المكرمة - المملكة العربية السعودية | هاتف: 0555700201 | info@riadataleata.org.sa</p>
        <div class="footer-divider"></div>
        <p style="margin: 0; font-size: 11px; color: #94a3b8;">
          تم إرسال هذا البريد تلقائياً من المنصة الرسمية للجمعية في ${new Date().toLocaleDateString('ar-SA')} - جميع الحقوق محفوظة © ${year}
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `${title}\n\n${greeting}\n\n${bodyParagraphs.join('\n\n')}\n\n${keyValues.map(kv => `${kv.label}: ${kv.value}`).join('\n')}\n\nجمعية ريادة العطاء لخدمة الإنسان بالعسيلة\ninfo@riadataleata.org.sa`;

  return { subject: finalSubject, html, text };
}

// 2. Central Helper to Read and Sanitize Email Configuration
export function getEmailConfig(db: any) {
  const dbSettings = db?.emailSettings || {};

  const provider = dbSettings.provider || (process.env.RESEND_API_KEY ? 'resend' : (process.env.SMTP_HOST ? 'smtp' : 'resend'));
  const senderName = dbSettings.senderName || process.env.SENDER_NAME || "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة";
  
  // Enforce official domain sender; reject free webmail domains like @gmail.com as 'From'
  let rawSenderEmail = (dbSettings.senderEmail || process.env.SENDER_EMAIL || "notifications@riadataleata.com").trim();
  if (/@(gmail|yahoo|hotmail|outlook)\.com$/i.test(rawSenderEmail) || rawSenderEmail.includes("riadataleata.org.sa")) {
    rawSenderEmail = "notifications@riadataleata.com";
  }
  const senderEmail = rawSenderEmail;

  // Association's official Gmail receives all replies
  const replyToEmail = (dbSettings.replyToEmail || "riadataleata@gmail.com").trim();

  const resendApiKey = (dbSettings.resendApiKey && dbSettings.resendApiKey.trim()) || process.env.RESEND_API_KEY || "";
  
  const smtpHost = dbSettings.smtpHost || process.env.SMTP_HOST || "";
  const smtpPort = Number(dbSettings.smtpPort || process.env.SMTP_PORT || 587);
  const smtpSecure = dbSettings.smtpSecure !== undefined ? Boolean(dbSettings.smtpSecure) : (process.env.SMTP_SECURE === 'true' || smtpPort === 465);
  const smtpUser = dbSettings.smtpUser || process.env.SMTP_USER || "";
  const smtpPassword = dbSettings.smtpPassword || process.env.SMTP_PASS || "";

  const enabled = dbSettings.enabled !== undefined ? Boolean(dbSettings.enabled) : true;
  const enableAutoFallback = dbSettings.enableAutoFallback !== undefined ? Boolean(dbSettings.enableAutoFallback) : true;
  const testRecipientEmail = dbSettings.testRecipientEmail || "riadataleata@gmail.com";

  return {
    provider,
    senderName,
    senderEmail,
    replyToEmail,
    resendApiKey,
    hasResendApiKey: Boolean(resendApiKey && resendApiKey.length > 5),
    smtpHost,
    smtpPort,
    smtpSecure,
    smtpUser,
    smtpPassword,
    hasSmtpPassword: Boolean(smtpPassword && smtpPassword.length > 0),
    enabled,
    enableAutoFallback,
    testRecipientEmail,
    updatedAt: dbSettings.updatedAt || new Date().toISOString()
  };
}

// 3. Sanitized Config for Safe Transmission to Frontend
export function getSanitizedEmailConfig(db: any) {
  const full = getEmailConfig(db);
  return {
    provider: full.provider,
    senderName: full.senderName,
    senderEmail: full.senderEmail,
    replyToEmail: full.replyToEmail,
    hasResendApiKey: full.hasResendApiKey,
    resendApiKeyMasked: full.resendApiKey ? `${full.resendApiKey.slice(0, 6)}••••••••${full.resendApiKey.slice(-4)}` : '',
    smtpHost: full.smtpHost,
    smtpPort: full.smtpPort,
    smtpSecure: full.smtpSecure,
    smtpUser: full.smtpUser,
    hasSmtpPassword: full.hasSmtpPassword,
    enabled: full.enabled,
    enableAutoFallback: full.enableAutoFallback,
    testRecipientEmail: full.testRecipientEmail,
    updatedAt: full.updatedAt
  };
}

// 4. Translate raw technical provider errors into clear Arabic guidance
export function translateEmailError(rawError: string, domain: string = "riadataleata.com"): string {
  const lower = (rawError || "").toLowerCase();
  
  if (lower.includes("gmail.com") && lower.includes("not verified")) {
    return `نطاق البريد غير موثق: يمنع مزود Resend استخدام بريد عام (@gmail.com) كعنوان المرسل (From) وفق بروتوكولات حماية البريد العالمية DMARC. تم ضبط عنوان المرسل المعتمد تلقائياً إلى (notifications@${domain}) وبريد الجمعية (riadataleata@gmail.com) في خانة بريد الرد (Reply-To) لاستقبال الردود.`;
  }
  if (lower.includes("domain is not verified") || (lower.includes("domain") && lower.includes("not verified"))) {
    return `نطاق البريد (${domain}) لم يكتمل توثيقه بعد في حساب Resend. يرجى إضافة سجلات الـ DNS (SPF / DKIM / DMARC) الموضحة في تبويب 'توثيق النطاق وسجلات DNS' ثم النقر على زر 'التحقق من النطاق في Resend'.`;
  }
  if (lower.includes("api key is invalid") || lower.includes("unauthorized") || lower.includes("restricted api key") || lower.includes("invalid api key")) {
    return "مفتاح Resend API غير صالح أو تنقصه الصلاحيات. تأكد من إدخال مفتاح كامل يبدأ بـ re_ وتفعيله بصلاحيات كاملة (Full Access) أو إرسال (Sending Access).";
  }
  if (lower.includes("only send testing emails to your own email") || lower.includes("sandbox")) {
    return `حساب Resend حالياً في الوضع التجريبي المقيد (Sandbox) بنطاق onboarding@resend.dev، ويسمح بالإرسال فقط إلى بريدك المسجل في Resend. لتمكين الإرسال لجميع المستفيدين، يرجى ربط وتوثيق النطاق الرسمي ${domain}.`;
  }
  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return "تم تجاوز حد الإرسال المؤقت لمزود البريد. يرجى الانتظار بضع دقائق ثم المحاولة مجدداً.";
  }
  if (lower.includes("validation_error") || lower.includes("missing required")) {
    return "بيانات الرسالة غير مكتملة أو عنوان البريد الإلكتروني غير صالح.";
  }
  return rawError;
}

// 5. Send via Resend REST API
async function sendViaResend(
  apiKey: string,
  from: string,
  to: string | string[],
  subject: string,
  html: string,
  text: string,
  replyTo?: string
): Promise<{ id: string }> {
  const toList = Array.isArray(to) ? to : [to];
  
  const payload: any = {
    from,
    to: toList,
    subject,
    html,
    text
  };

  if (replyTo) {
    payload.reply_to = replyTo;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const resJson: any = await response.json().catch(() => ({}));

  if (!response.ok) {
    const rawError = resJson.message || resJson.error?.message || `Resend API Error (Status ${response.status})`;
    const translated = translateEmailError(rawError, "riadataleata.com");
    throw new Error(translated);
  }

  return { id: resJson.id || "resend-" + Date.now() };
}

// 6. Resend Domain & DNS Management Types and Functions
export interface DnsRecordInfo {
  record: 'SPF' | 'DKIM' | 'DMARC' | 'MX';
  name: string;
  type: 'TXT' | 'MX' | 'CNAME';
  value: string;
  priority?: number;
  ttl: string;
  status: 'verified' | 'pending' | 'not_started';
  purposeAr: string;
}

export function getStandardResendDnsRecords(domain: string = "riadataleata.com"): DnsRecordInfo[] {
  return [
    {
      record: 'DKIM',
      name: `resend._domainkey.${domain}`,
      type: 'TXT',
      value: `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQD (مفتاح DKIM الفريد الصادر من حساب Resend)`,
      ttl: 'Auto',
      status: 'pending',
      purposeAr: 'سجل التوقيع الرقمي (DKIM) لتشفير رسائل الجمعية وحمايتها من التزييف وتجاوز فلترة البريد العشوائي (Spam).'
    },
    {
      record: 'SPF',
      name: `bounces.${domain}`,
      type: 'MX',
      value: 'feedback-smtp.us-east-1.amazonses.com',
      priority: 10,
      ttl: 'Auto',
      status: 'pending',
      purposeAr: 'سجل مسار ارتداد الرسائل (Return-Path MX) لمعالجة الارتدادات والإشعارات الفاشلة تلقائياً.'
    },
    {
      record: 'SPF',
      name: `bounces.${domain}`,
      type: 'TXT',
      value: 'v=spf1 include:amazonses.com ~all',
      ttl: 'Auto',
      status: 'pending',
      purposeAr: 'سجل تفويض الإرسال (SPF TXT) يسمح لخوادم Resend بإرسال الرسائل باسم النطاق بشكل معتمد رسمياً.'
    },
    {
      record: 'DMARC',
      name: `_dmarc.${domain}`,
      type: 'TXT',
      value: 'v=DMARC1; p=none; rua=mailto:riadataleata@gmail.com',
      ttl: 'Auto',
      status: 'pending',
      purposeAr: 'سجل سياسة حماية النطاق (DMARC) يرفع موثوقية النطاق لدى مزودي البريد (Gmail, Microsoft) ويوجه تقارير الفحص إلى بريد الجمعية.'
    }
  ];
}

export async function checkLiveDnsRecords(domain: string = "riadataleata.com") {
  const results = {
    domain,
    checkedAt: new Date().toISOString(),
    dkim: { detected: false, name: `resend._domainkey.${domain}`, type: 'TXT', value: '' },
    spfMx: { detected: false, name: `bounces.${domain}`, type: 'MX', value: '' },
    spfTxt: { detected: false, name: `bounces.${domain}`, type: 'TXT', value: '' },
    dmarc: { detected: false, name: `_dmarc.${domain}`, type: 'TXT', value: '' },
    domainMx: { detected: false, name: domain, type: 'MX', value: '' }
  };

  // 1. Check DKIM
  try {
    const dkimTxt = await dnsPromises.resolveTxt(`resend._domainkey.${domain}`);
    if (dkimTxt && dkimTxt.length > 0) {
      results.dkim.detected = true;
      results.dkim.value = dkimTxt.map(t => t.join("")).join(" ");
    }
  } catch (e) {
    results.dkim.detected = false;
  }

  // 2. Check SPF Bounces MX
  try {
    const mxList = await dnsPromises.resolveMx(`bounces.${domain}`);
    if (mxList && mxList.length > 0) {
      results.spfMx.detected = true;
      results.spfMx.value = mxList.map(m => `${m.exchange} (أولوية ${m.priority})`).join(", ");
    }
  } catch (e) {
    results.spfMx.detected = false;
  }

  // 3. Check SPF Bounces TXT
  try {
    const spfTxt = await dnsPromises.resolveTxt(`bounces.${domain}`);
    if (spfTxt && spfTxt.length > 0) {
      results.spfTxt.detected = true;
      results.spfTxt.value = spfTxt.map(t => t.join("")).join(" ");
    }
  } catch (e) {
    results.spfTxt.detected = false;
  }

  // 4. Check DMARC
  try {
    const dmarcTxt = await dnsPromises.resolveTxt(`_dmarc.${domain}`);
    if (dmarcTxt && dmarcTxt.length > 0) {
      results.dmarc.detected = true;
      results.dmarc.value = dmarcTxt.map(t => t.join("")).join(" ");
    }
  } catch (e) {
    results.dmarc.detected = false;
  }

  // 5. Check Root Domain MX
  try {
    const rootMx = await dnsPromises.resolveMx(domain);
    if (rootMx && rootMx.length > 0) {
      results.domainMx.detected = true;
      results.domainMx.value = rootMx.map(m => `${m.exchange} (أولوية ${m.priority})`).join(", ");
    }
  } catch (e) {
    results.domainMx.detected = false;
  }

  return results;
}

export async function fetchResendDomainsList(apiKey: string) {
  const response = await fetch("https://api.resend.com/domains", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`خطأ الاتصال بـ Resend Domains API (${response.status}): ${errText}`);
  }

  const json: any = await response.json();
  return json.data || [];
}

export async function fetchResendDomainDetails(apiKey: string, domainId: string) {
  const response = await fetch(`https://api.resend.com/domains/${domainId}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`خطأ جلب تفاصيل النطاق من Resend (${response.status}): ${errText}`);
  }

  return await response.json();
}

export async function createResendDomainRecord(apiKey: string, name: string = "riadataleata.com") {
  const response = await fetch("https://api.resend.com/domains", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name })
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`خطأ إضافة النطاق إلى Resend (${response.status}): ${errText}`);
  }

  return await response.json();
}

export async function triggerResendDomainVerification(apiKey: string, domainId: string) {
  const response = await fetch(`https://api.resend.com/domains/${domainId}/verify`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`خطأ طلب التحقق من Resend (${response.status}): ${errText}`);
  }

  return await response.json();
}

// 5. Send via Nodemailer (SMTP)
async function sendViaSmtp(
  config: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
  },
  from: string,
  to: string | string[],
  subject: string,
  html: string,
  text: string,
  replyTo?: string
): Promise<{ id: string }> {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    },
    tls: {
      rejectUnauthorized: false // Allow self-signed certs or internal relays without crashing
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    html,
    text,
    replyTo
  });

  return { id: info.messageId || "smtp-" + Date.now() };
}

// 6. Central Unified Send Function
export async function sendCentralEmail(
  db: any,
  payload: SendEmailPayload
): Promise<EmailSendResult> {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  const config = getEmailConfig(db);

  const recipientStr = Array.isArray(payload.to) ? payload.to.join(", ") : payload.to;
  const fromFormatted = `"${config.senderName}" <${config.senderEmail}>`;

  // Render Template or use custom
  let finalSubject = payload.subject;
  let finalHtml = payload.customHtml || "";
  let finalText = payload.customText || "";

  if (!finalHtml) {
    const rendered = generateEmailHtml(
      payload.templateType,
      {
        ...payload.templateData,
        recipientName: payload.recipientName,
        sender: config.senderName
      },
      payload.lang || 'ar'
    );
    finalSubject = payload.subject || rendered.subject;
    finalHtml = rendered.html;
    finalText = rendered.text;
  }

  // Ensure email log array exists
  db.emailLogs = db.emailLogs || [];

  // Check if email sending is globally enabled
  if (!config.enabled) {
    const result: EmailSendResult = {
      success: false,
      provider: 'simulation',
      error: "خدمة إرسال البريد الإلكتروني معطلة حالياً من إعدادات النظام.",
      durationMs: Date.now() - start,
      timestamp
    };
    logEmailAttempt(db, payload, finalSubject, result);
    return result;
  }

  const hasResend = Boolean(config.resendApiKey && config.resendApiKey.length > 5);
  const hasSmtp = Boolean(config.smtpHost && config.smtpUser && config.smtpPassword);

  // If neither provider is configured, do a simulated send so the app won't break
  if (!hasResend && !hasSmtp) {
    const errorMsg = "لم يتم تكوين مفتاح Resend API أو بيانات خادم SMTP في إعدادات البريد بعد.";
    const result: EmailSendResult = {
      success: false,
      provider: 'simulation',
      error: errorMsg,
      durationMs: Date.now() - start,
      timestamp
    };
    logEmailAttempt(db, payload, finalSubject, result);
    return result;
  }

  // Determine delivery strategy
  // If provider is explicitly 'resend', prioritize resend
  // If 'smtp', prioritize smtp
  // If 'both_auto', try resend first (cleanest, no port blocks), then fallback to smtp
  let primaryProvider: 'resend' | 'smtp' = 'resend';
  if (config.provider === 'smtp' && hasSmtp) {
    primaryProvider = 'smtp';
  } else if (hasResend) {
    primaryProvider = 'resend';
  } else {
    primaryProvider = 'smtp';
  }

  let lastError: string = "";
  let messageId: string | undefined;

  // Try Primary Provider
  try {
    if (primaryProvider === 'resend' && hasResend) {
      const res = await sendViaResend(
        config.resendApiKey,
        fromFormatted,
        payload.to,
        finalSubject,
        finalHtml,
        finalText,
        payload.replyTo || config.replyToEmail
      );
      messageId = res.id;
      const result: EmailSendResult = {
        success: true,
        messageId,
        provider: 'resend',
        durationMs: Date.now() - start,
        timestamp
      };
      logEmailAttempt(db, payload, finalSubject, result);
      return result;
    } else if (hasSmtp) {
      const res = await sendViaSmtp(
        {
          host: config.smtpHost,
          port: config.smtpPort,
          secure: config.smtpSecure,
          user: config.smtpUser,
          pass: config.smtpPassword
        },
        fromFormatted,
        payload.to,
        finalSubject,
        finalHtml,
        finalText,
        payload.replyTo || config.replyToEmail
      );
      messageId = res.id;
      const result: EmailSendResult = {
        success: true,
        messageId,
        provider: 'smtp',
        durationMs: Date.now() - start,
        timestamp
      };
      logEmailAttempt(db, payload, finalSubject, result);
      return result;
    }
  } catch (err: any) {
    lastError = `[فشل ${primaryProvider.toUpperCase()}]: ${err.message || String(err)}`;
    console.error(`Email Primary Attempt Failed (${primaryProvider}):`, err);
  }

  // Try Secondary Provider as Fallback if enabled
  if (config.enableAutoFallback) {
    const secondaryProvider = primaryProvider === 'resend' ? 'smtp' : 'resend';
    const canTrySecondary = secondaryProvider === 'resend' ? hasResend : hasSmtp;

    if (canTrySecondary) {
      try {
        if (secondaryProvider === 'resend' && hasResend) {
          const res = await sendViaResend(
            config.resendApiKey,
            fromFormatted,
            payload.to,
            finalSubject,
            finalHtml,
            finalText,
            payload.replyTo || config.replyToEmail
          );
          messageId = res.id;
          const result: EmailSendResult = {
            success: true,
            messageId,
            provider: 'resend',
            durationMs: Date.now() - start,
            timestamp
          };
          logEmailAttempt(db, payload, finalSubject, result);
          return result;
        } else if (hasSmtp) {
          const res = await sendViaSmtp(
            {
              host: config.smtpHost,
              port: config.smtpPort,
              secure: config.smtpSecure,
              user: config.smtpUser,
              pass: config.smtpPassword
            },
            fromFormatted,
            payload.to,
            finalSubject,
            finalHtml,
            finalText,
            payload.replyTo || config.replyToEmail
          );
          messageId = res.id;
          const result: EmailSendResult = {
            success: true,
            messageId,
            provider: 'smtp',
            durationMs: Date.now() - start,
            timestamp
          };
          logEmailAttempt(db, payload, finalSubject, result);
          return result;
        }
      } catch (fallbackErr: any) {
        lastError += ` | [فشل البديل ${secondaryProvider.toUpperCase()}]: ${fallbackErr.message || String(fallbackErr)}`;
        console.error(`Email Secondary Fallback Attempt Failed (${secondaryProvider}):`, fallbackErr);
      }
    }
  }

  // If all attempts failed
  const friendlyError = translateEmailError(lastError, "riadataleata.com");
  const failureResult: EmailSendResult = {
    success: false,
    provider: primaryProvider,
    error: friendlyError || "تعذر إرسال البريد الإلكتروني لأسباب غير متوقعة.",
    durationMs: Date.now() - start,
    timestamp
  };

  logEmailAttempt(db, payload, finalSubject, failureResult);
  return failureResult;
}

// 7. Record to db.emailLogs (Sanitized, capped to latest 200 items)
function logEmailAttempt(
  db: any,
  payload: SendEmailPayload,
  subject: string,
  result: EmailSendResult
) {
  db.emailLogs = db.emailLogs || [];
  const logEntry = {
    id: "eml-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
    timestamp: result.timestamp,
    recipient: Array.isArray(payload.to) ? payload.to.join(", ") : payload.to,
    recipientName: payload.recipientName || "",
    subject,
    templateType: payload.templateType || 'general',
    status: result.success ? 'sent' : 'failed',
    provider: result.provider,
    errorMessage: result.error || null,
    messageId: result.messageId || null,
    durationMs: result.durationMs,
    metadata: {
      lang: payload.lang || 'ar',
      hasCustomHtml: Boolean(payload.customHtml)
    }
  };

  db.emailLogs.unshift(logEntry);

  // Keep log size bounded
  if (db.emailLogs.length > 200) {
    db.emailLogs = db.emailLogs.slice(0, 200);
  }
}
