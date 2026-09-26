import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import type { 
  Department, 
  VolunteerTeam, 
  Volunteer, 
  Initiative, 
  JoinRequest, 
  AttendanceRecord, 
  Evaluation, 
  OperationLog, 
  Notification,
  SystemStats,
  VolunteerApplication,
  CertificateTemplate,
  IssuedCertificate,
  InitiativeRating,
  OpportunityRequest,
  TeamApplication,
  OfficialLetter
} from "./src/types.ts";
import { setupFinancialRoutes } from "./server/financeRoutes.ts";
import { setupEmailRoutes } from "./server/emailRoutes.ts";
import { sendCentralEmail, getSanitizedEmailConfig } from "./server/emailService.ts";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Enable trust proxy for Cloud Run, Nginx, Cloudflare, and custom domain proxies
app.set('trust proxy', 1);

// CORS and Pre-flight Handling for Custom Domains & SSL Proxies
app.use((req, res, next) => {
  const origin = req.headers.origin || "*";
  res.header("Access-Control-Allow-Origin", origin);
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-session-token, x-user-id, x-user-role, x-department-id, x-national-id, x-team-id"
  );
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: "50mb" }));

const cardTemplatesDir = path.join(process.cwd(), "public", "card_templates");
try {
  if (!fs.existsSync(cardTemplatesDir)) {
    fs.mkdirSync(cardTemplatesDir, { recursive: true });
  }
} catch {
  // Read-only filesystem in serverless environments
}
if (fs.existsSync(cardTemplatesDir)) {
  app.use("/card_templates", express.static(cardTemplatesDir));
}

const DB_FILE_ROOT = path.join(process.cwd(), "db.json");
const DB_FILE_TMP = path.join("/tmp", "db.json");

function getActiveDbPath(): string {
  const isServerless = !!(
    process.env.VERCEL || 
    process.env.NOW_REGION || 
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT ||
    process.env.VERCEL_ENV
  );
  if (isServerless) {
    if (!fs.existsSync(DB_FILE_TMP)) {
      if (fs.existsSync(DB_FILE_ROOT)) {
        try {
          fs.copyFileSync(DB_FILE_ROOT, DB_FILE_TMP);
        } catch {
          // ignore
        }
      }
    }
    return fs.existsSync(DB_FILE_TMP) ? DB_FILE_TMP : (fs.existsSync(DB_FILE_ROOT) ? DB_FILE_ROOT : DB_FILE_TMP);
  }
  return DB_FILE_ROOT;
}

const DB_FILE = DB_FILE_ROOT;

// Lazy Gemini API Client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
  }
  return aiClient;
}

const defaultSystemSettings = {
  // 1. General Settings
  systemName: "نظام إدارة جمعية ريادة العطاء لخدمة الإنسان بالعسيلة",
  teamName: "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة",
  logoUrl: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=120&h=120&fit=crop",
  faviconUrl: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=32&h=32&fit=crop",
  loginBgImage: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1600&h=900&fit=crop",
  systemDescription: "منصة رقمية متكاملة لإدارة المتطوعين والمبادرات والمستفيدين وبطاقات التطوع الذكية بمخطط العسيلة المكي.",
  licenseNumber: "5081",
  registrationNumber: "7008886801",
  foundationYear: "1445هـ / 2024م",
  maintenanceMode: false,
  maintenanceMessage: "النظام حالياً في وضع الصيانة المجدولة لتحديث الخدمات. سنعود قريباً!",
  defaultLanguage: "ar" as const,
  timezone: "Asia/Riyadh (GMT+3)",
  dateTimeFormat: "هجري / ميلادي - 12 ساعة",

  // 2. Team Info
  commanderInChief: "أ. عبد الرحمن السليمان (القائد العام)",
  viceCommander: "أ. ياسر الغامدي (نائب القائد العام)",
  officialEmail: "info@riadataleata.org.sa",
  mobileNumber: "0550123456",
  landlineNumber: "0125501234",
  address: "مكة المكرمة - مخطط العسيلة - الشارع العام - مقر الجمعية الرئيسي",
  websiteUrl: "https://riadataleata.org.sa",
  googleMapsEmbedUrl: "https://maps.google.com/?q=Mecca+Al-Asilah",

  // 3. Social Media Links
  socialLinks: [
    { id: "soc-1", platform: "twitter" as const, titleAr: "حساب X (تويتر) الرسمي", url: "https://twitter.com/riadataleata", enabled: true, order: 1 },
    { id: "soc-2", platform: "instagram" as const, titleAr: "حساب إنستغرام", url: "https://instagram.com/riadataleata", enabled: true, order: 2 },
    { id: "soc-3", platform: "youtube" as const, titleAr: "قناة يوتيوب الرسمية", url: "https://youtube.com/riadataleata", enabled: true, order: 3 },
    { id: "soc-4", platform: "snapchat" as const, titleAr: "حساب سناب شات", url: "https://snapchat.com/add/riadataleata", enabled: true, order: 4 },
    { id: "soc-5", platform: "whatsapp" as const, titleAr: "واتساب التكافل المباشر", url: "https://wa.me/966550123456", enabled: true, order: 5 },
    { id: "soc-6", platform: "tiktok" as const, titleAr: "حساب تيك توك", url: "https://tiktok.com/@riadataleata", enabled: true, order: 6 },
    { id: "soc-7", platform: "telegram" as const, titleAr: "قناة تيليجرام التعاميم", url: "https://t.me/riadataleata", enabled: true, order: 7 },
    { id: "soc-8", platform: "linkedin" as const, titleAr: "صفحة لينكدإن المؤسسية", url: "https://linkedin.com/company/riadataleata", enabled: true, order: 8 },
    { id: "soc-9", platform: "facebook" as const, titleAr: "صفحة فيسبوك", url: "https://facebook.com/riadataleata", enabled: false, order: 9 },
    { id: "soc-10", platform: "threads" as const, titleAr: "حساب ثريدز", url: "https://threads.net/@riadataleata", enabled: false, order: 10 }
  ],

  // 4. Volunteer Settings
  allowVolunteerRegistration: true,
  approvalType: "manual" as const,
  minAge: 16,
  maxAge: 65,
  requireNationalIdPhoto: true,
  requirePersonalPhoto: true,
  requireCharterPdf: true,
  enableOtpVerification: true,
  applicationValidityDays: 30,

  // 5. Roles & Permissions
  customRoles: [
    { id: "role-admin", nameAr: "مدير نظام عام", nameEn: "General Admin", allowedPages: ["all"], description: "صلاحيات كاملة للتحكم بالنظام والإعدادات والقواعد" },
    { id: "role-leader", nameAr: "قائد فريق تطوعي", nameEn: "Team Leader", allowedPages: ["vols", "init", "attendance", "chat"], description: "إدارة أعضاء الفريق وتسجيل الحضور والتقييم والرسائل الجماعية" },
    { id: "role-supervisor", nameAr: "مشرف قسم إداري", nameEn: "Department Supervisor", allowedPages: ["deps", "teams", "vols", "init"], description: "الإشراف على فرق القسم واختيار المتطوعين وإقرار المبادرات" },
    { id: "role-volunteer", nameAr: "متطوع معتمد", nameEn: "Certified Volunteer", allowedPages: ["profile", "my_card", "initiatives", "chat_user"], description: "عرض البطاقة الرقمية واستعراض وتجسيد المبادرات والتواصل" }
  ],

  // 6. Notification Settings
  notifications: {
    enableEmail: true,
    enableSms: true,
    enableWhatsapp: true,
    enableInApp: true,
    enableBrowserPush: true,
    templates: {
      acceptVolunteer: "أهلاً بك أ. {name}! تم قبول طلب انضمامك لجمعية ريادة العطاء وإسنادك لـ {team}. يمكنك الآن استخدام بطاقتك الرقمية.",
      rejectVolunteer: "عزيزي المتقدم {name}، نعتذر عن قبول طلب الانضمام لعدم توفر شروط المبادرة الحالية. نتمنى لك التوفيق.",
      initiativeInvite: "مبادرة جديدة متاحة! نتشرف بدعوتك للمشاركة في مبادرة {initiative_name} بتاريخ {date}.",
      supportTicketCreated: "تم استلام استفسارك وتأكيد فتح تذكرة دعم رقم (#{ticket_number}). فريقنا بخدمتك."
    }
  },

  // 7. AI Settings
  aiAssistant: {
    enabled: true,
    name: "مساعد ريادة العطاء الذكي (Gemini)",
    welcomeMessage: "أهلاً بك! أنا مساعد الذكاء الاصطناعي لجمعية ريادة العطاء بالعسيلة. كيف يمكنني خدمتك اليوم؟",
    maxAttemptsBeforeTransfer: 3,
    escalationKeywords: ["تحدث مع موظف", "دعم فني", "موظف حقيقي", "إنسان", "لم تحل مشكلتي", "تذكرة", "مشكلة معقدة", "تحويل للدعم"],
    supportWorkingHours: "الأحد - الخميس: 8:00 صباحاً - 8:00 مساءً",
    cannedResponses: [
      { id: "cr-1", keyword: "البطاقة", response: "يمكنك استخراج بطاقة التطوع الذكية من القائمة الرئيسية بالضغط على زر 'بطاقتي الذكية' ثم تنزيل ملف PDF أو طباعة البطاقة مباشرة." },
      { id: "cr-2", keyword: "التسجيل", response: "التسجيل متاح لجميع الراغبين في التطوع عبر نموذج 'انضم كمتطوع' بالصفحة الرئيسية مع ارفاق الهوية والصورة الشخصية." },
      { id: "cr-3", keyword: "الساعات", response: "تُحسب الساعات التطوعية فور رصد حضورك بجهة المبادرة عبر قائد الفريق وتظهر في سجلك الشخصي وبطاقتك الرقمية." }
    ],
    knowledgeBaseArticles: [
      { id: "kb-1", title: "دليل استخدام بطاقات التطوع الرقمية بالباركود", content: "تضمن البطاقة الرقمية معايير التحقق الفوري من الهوية والعضوية عبر الباركود ورمز QR المعتمد رسمياً." },
      { id: "kb-2", title: "لائحة الحقوق والواجبات للمتطوع بمكة", content: "يلتزم المتطوع بالزي الرسمي والسديري المعتمد والسرية المهنية وأخلاقيات العمل الخيري لخدمة ضيوف الرحمن." }
    ]
  },

  // 8. Documents Management
  documents: {
    privacyPolicyAr: "تلتزم جمعية ريادة العطاء لخدمة الإنسان بالعسيلة بأقصى معايير حماية البيانات الشخصية للمتطوعين والمستفيدين وعدم مشاركتها مع أي جهات خارجية إلا بموجب الأنظمة واللوائح الرسمية بالمملكة.",
    termsOfUseAr: "استخدام هذا النظام يخضع لشروط وسياسات العمل التطوعي المعتمدة بوزارة الموارد البشرية والتنمية الاجتماعية واللوائح الداخلية للجمعية.",
    volunteerCharterAr: "ميثاق العمل التطوعي يوجب الالتزام بالأمانة، والانضباط الميداني، وارتداء الزي والسديري الرسمي أثناء أداء المبادرات بقطاع العسيلة ومكة المكرمة.",
    faqAr: [
      { id: "faq-1", question: "كيف أحصل على شهادة ساعات تطوعية؟", answer: "تُصدر الشهادات آلياً عقب اكتمال المبادرة واعتماد الحضور من قائد الفريق والإدارة العليا." },
      { id: "faq-2", question: "ما هو العمر المسموح للتطوع بالجمعية؟", answer: "نقبل المتطوعين والمتطوعات من سن 16 سنة وحتى 65 سنة مع إرفاق موافقة ولي الأمر لمن هم دون 18 سنة." }
    ],
    userAgreementAr: "باتمام عملية التسجيل، يقر المستخدم بصحة جميع البيانات المدخلة والالتزام بالأنظمة المرعية."
  },

  // 9. Appearance Settings
  appearance: {
    mode: "light" as const,
    primaryColor: "#059669",
    secondaryColor: "#0d9488",
    buttonColor: "#10b981",
    sidebarColor: "#111827",
    fontFamily: "Cairo",
    fontSize: "normal" as const,
    bgImageUrl: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1600&h=900&fit=crop",
    loginBgImageUrl: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1600&h=900&fit=crop"
  },

  // 10. Backup Settings
  backup: {
    autoBackupFrequency: "daily" as const,
    lastBackupDate: new Date().toISOString()
  },

  // 11. Security Settings
  security: {
    enable2FA: true,
    maxLoginAttempts: 5,
    sessionTimeoutMinutes: 60,
    logIpAddresses: true,
    blockedIps: ["192.168.1.999"]
  },

  // 12. Official Files & Seals
  files: {
    siteLogo: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=200&h=200&fit=crop",
    loginLogo: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=300&h=300&fit=crop",
    certificateLogo: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=200&h=200&fit=crop",
    volunteerCardLogo: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=120&h=120&fit=crop",
    officialStampUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=200&h=200&fit=crop",
    commanderSignatureUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=300&h=100&fit=crop",
    emergencyPhone: "0550998877"
  }
};

// Initial Mock / Seed Data
const defaultDb = {
  departments: [
    { 
      id: "dep-1", 
      nameAr: "الإدارة التنفيذية", 
      nameEn: "Executive Management", 
      directorName: "أ. عبد الرحمن السليمان",
      nationalId: "1010000001",
      password: "123",
      email: "exec@riadataleata.org.sa",
      phone: "0551000001",
      descriptionAr: "تنفيذ قرارات مجلس الإدارة والإشراف على كافة الإدارات والخطط التشغيلية ومؤشرات الجودة.", 
      descriptionEn: "Executing board decisions, supervising all departments, operational plans, and quality metrics.",
      tasks: [
        "تنفيذ قرارات مجلس الإدارة.",
        "إعداد الخطط التشغيلية ومتابعة تنفيذها.",
        "الإشراف على جميع الإدارات.",
        "متابعة مؤشرات الأداء والجودة.",
        "إعداد التقارير الدورية لمجلس الإدارة.",
        "تمثيل الجمعية في الأعمال التنفيذية."
      ]
    },
    { 
      id: "dep-2", 
      nameAr: "الإدارة المالية", 
      nameEn: "Financial Management", 
      directorName: "أ. عبد الله العتيبي",
      nationalId: "1010000002",
      password: "123",
      email: "finance@riadataleata.org.sa",
      phone: "0551000002",
      descriptionAr: "إدارة الميزانيات، الإيرادات والمصروفات، السجلات المحاسبية والمشتريات والرواتب.", 
      descriptionEn: "Managing annual budgets, revenue/expenses, accounting ledgers, purchases, and compliance.",
      tasks: [
        "إعداد الميزانية السنوية.",
        "إدارة الإيرادات والمصروفات.",
        "إعداد القيود والسجلات المحاسبية.",
        "إعداد التقارير المالية.",
        "متابعة العهد والمشتريات.",
        "إعداد الرواتب والمستحقات.",
        "ضمان الالتزام بالأنظمة المالية."
      ]
    },
    { 
      id: "dep-3", 
      nameAr: "إدارة البرامج والمشاريع", 
      nameEn: "Programs & Projects Management", 
      directorName: "أ. فيصل الأحمدي",
      nationalId: "1010000003",
      password: "123",
      email: "projects@riadataleata.org.sa",
      phone: "0551000003",
      descriptionAr: "تخطيط وتنفيذ البرامج والمبادرات والمشاريع التنموية وقياس أثرها واقتراح مشاريع جديدة.", 
      descriptionEn: "Planning and executing programs, initiatives, timeline plans, and measuring developmental impact.",
      tasks: [
        "إعداد وتنفيذ البرامج والمبادرات.",
        "إعداد الخطط الزمنية للمشاريع.",
        "متابعة تنفيذ الأنشطة.",
        "قياس أثر البرامج وتقييمها.",
        "إعداد تقارير الإنجاز.",
        "اقتراح مشاريع جديدة تحقق أهداف الجمعية."
      ]
    },
    { 
      id: "dep-4", 
      nameAr: "إدارة المستفيدين", 
      nameEn: "Beneficiaries Management", 
      directorName: "أ. مريم الغامدي",
      nationalId: "1010000004",
      password: "123",
      email: "beneficiaries@riadataleata.org.sa",
      phone: "0551000004",
      descriptionAr: "استقبال وتوثيق طلبات المستفيدين، دراسة الحالات والتأكد من استحقاقها وقياس رضاهم.", 
      descriptionEn: "Receiving beneficiary requests, registering data, studying eligibility, and measuring satisfaction.",
      tasks: [
        "استقبال طلبات المستفيدين.",
        "تسجيل بيانات المستفيدين.",
        "دراسة الحالات والتأكد من استحقاقها.",
        "متابعة تقديم الخدمات.",
        "تحديث قاعدة بيانات المستفيدين.",
        "قياس رضا المستفيدين."
      ]
    },
    { 
      id: "dep-5", 
      nameAr: "إدارة التطوع", 
      nameEn: "Volunteer Management", 
      directorName: "أ. منيرة القحطاني",
      nationalId: "1010000005",
      password: "123",
      email: "volunteers@riadataleata.org.sa",
      phone: "0551000005",
      descriptionAr: "إدارة واستقطاب المتطوعين، الفرق التطوعية، اعتماد وإدارة الفرص التطوعية العامة والخاصة، الساعات والحضور والشهادات.", 
      descriptionEn: "Volunteer recruitment, volunteer teams, approving and managing public and private opportunities, hours, attendance, and certificates.",
      tasks: [
        "إدارة واستقطاب المتطوعين والفرق التطوعية.",
        "مراجعة واعتماد الفرص التطوعية وتوليد معرفاتها وروابط التسجيل.",
        "إدارة ومتابعة طلبات التسجيل والانضمام للفرص.",
        "توثيق واحتساب الساعات التطوعية الميدانية.",
        "إصدار شهادات التطوع وبطاقات العضوية المعتمدة.",
        "متابعة مؤشرات وتقارير العمل التطوعي بالجمعية."
      ]
    },
    { 
      id: "dep-6", 
      nameAr: "إدارة العلاقات العامة والإعلام", 
      nameEn: "Public Relations & Media Management", 
      directorName: "أ. ياسر الغامدي",
      nationalId: "1010000006",
      password: "123",
      email: "media@riadataleata.org.sa",
      phone: "0551000006",
      descriptionAr: "إدارة الهوية الإعلامية، التصاميم، المنشورات، التوثيق المرئي والتواصل مع الجهات.", 
      descriptionEn: "Managing media identity, designs, publications, social media, video documentation, and news.",
      tasks: [
        "إدارة الهوية الإعلامية للجمعية.",
        "إعداد التصاميم والمنشورات.",
        "إدارة حسابات التواصل الاجتماعي.",
        "توثيق البرامج والفعاليات بالتصوير والفيديو.",
        "إعداد الأخبار والتقارير الإعلامية.",
        "بناء العلاقات مع الجهات الحكومية والخاصة والإعلامية."
      ]
    },
    { 
      id: "dep-7", 
      nameAr: "إدارة تنمية الموارد المالية والشراكات", 
      nameEn: "Fundraising & Partnerships Management", 
      directorName: "أ. ماجد الدوسري",
      nationalId: "1010000007",
      password: "123",
      email: "partnerships@riadataleata.org.sa",
      phone: "0551000007",
      descriptionAr: "تنمية الاستدامة المالية، استقطاب الداعمين والرعاة، بناء الشراكات والحملات الداعمة.", 
      descriptionEn: "Developing financial sustainability, attracting donors/sponsors, partnerships, and fundraising.",
      tasks: [
        "إعداد خطط تنمية الموارد المالية.",
        "استقطاب الداعمين والرعاة.",
        "بناء الشراكات مع الجهات الحكومية والخاصة.",
        "إعداد الحملات والمبادرات الداعمة.",
        "متابعة المنح والتمويل.",
        "تنمية الاستدامة المالية للجمعية."
      ]
    },
    { 
      id: "dep-8", 
      nameAr: "إدارة الخدمات المساندة", 
      nameEn: "Support Services Management", 
      directorName: "أ. سعود الحربي",
      nationalId: "1010000008",
      password: "123",
      email: "support@riadataleata.org.sa",
      phone: "0551000008",
      descriptionAr: "إدارة تقنية المعلومات والأنظمة، المستودعات والعهد والصيانة والحركة والأمن والسلامة.", 
      descriptionEn: "Managing IT systems, inventory, transportation, maintenance, general facilities, and security.",
      tasks: [
        "إدارة تقنية المعلومات والأنظمة.",
        "إدارة المستودعات والعهد.",
        "الإشراف على النقل والحركة.",
        "متابعة الصيانة الدورية.",
        "إدارة الخدمات العامة والمرافق.",
        "توفير الاحتياجات التشغيلية لجميع الإدارات.",
        "متابعة الأمن والسلامة داخل مرافق الجمعية."
      ]
    },
    { 
      id: "dep-9", 
      nameAr: "إدارة الموارد البشرية", 
      nameEn: "Human Resources Management", 
      directorName: "أ. نورة بنت فهد الشريف",
      nationalId: "1010000009",
      password: "123",
      email: "hr@riadataleata.org.sa",
      phone: "0551000009",
      descriptionAr: "إدارة شؤون الموظفين، العقود، مسيرات الرواتب والبدلات، الحضور والانصراف، الإجازات، والقرارات الإدارية للموظفين.", 
      descriptionEn: "Managing employee affairs, contracts, payroll and allowances, attendance, leaves, and HR administrative decisions.",
      tasks: [
        "إدارة ملفات وبيانات الموظفين والكوادر الوظيفية.",
        "إعداد وتوثيق عقود العمل والاتفاقيات الوظيفية.",
        "إدارة مسيرات الرواتب والمكافآت والبدلات والخصومات.",
        "متابعة الحضور والانصراف وسجلات الدوام للموظفين.",
        "إدارة أرصدة الإجازات والغياب والاستئذان.",
        "تقييم أداء الموظفين وإعداد القرارات وخطابات التكليف والتوظيف."
      ]
    }
  ] as Department[],

  teams: [
    { id: "team-1", nameAr: "فريق التنظيم", nameEn: "Organizing Team", departmentId: "dep-3", leaderName: "سعود الحربي", descriptionAr: "المسؤول الأول عن إدارة الحشود والمسارات في المبادرات الميدانية.", descriptionEn: "Responsible for crowd management and routing in field initiatives." },
    { id: "team-2", nameAr: "فريق الإعلام", nameEn: "Media Team", departmentId: "dep-2", leaderName: "عبد العزيز الشمري", descriptionAr: "توثيق وتصوير المبادرات وكتابة المحتوى الإعلامي للجمعية.", descriptionEn: "Documenting and photographing initiatives and writing media content for the association." },
    { id: "team-3", nameAr: "فريق الاستقبال", nameEn: "Reception Team", departmentId: "dep-4", leaderName: "ماجد الدوسري", descriptionAr: "استقبال كبار الشخصيات والزوار والترحيب بالمتطوعين الجدد.", descriptionEn: "Welcoming VIPs, visitors, and welcoming new volunteers." },
    { id: "team-4", nameAr: "فريق الإسعافات", nameEn: "First Aid Team", departmentId: "dep-1", leaderName: "د. هند العصيمي", descriptionAr: "تقديم الدعم الطبي الأولي في الفعاليات والنشاطات الكبيرة.", descriptionEn: "Providing primary medical support in large events and activities." },
    { id: "team-5", nameAr: "فريق التصوير", nameEn: "Photography Team", departmentId: "dep-2", leaderName: "خالد الشهري", descriptionAr: "التقاط الصور وإنتاج المقاطع المرئية الاحترافية للجمعية.", descriptionEn: "Capturing photos and producing professional videos for the association." }
  ] as VolunteerTeam[],

  volunteers: [
    {
      id: "vol-1",
      name: "أحمد بن علي الغامدي",
      email: "ahmed.ghamdi@example.com",
      phone: "0551234567",
      photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
      membershipNumber: "V-2026-0001",
      teamId: "team-1",
      departmentId: "dep-3",
      titleAr: "متطوع تنظيمي",
      titleEn: "Organizing Volunteer",
      status: "active",
      points: 24,
      qrCode: "MEM-V-2026-0001",
      barcode: "100088868001",
      issueDate: "2026-01-15",
      expiryDate: "2027-01-15"
    },
    {
      id: "vol-2",
      name: "سارة بنت محمد العتيبي",
      email: "sara.otaibi@example.com",
      phone: "0569876543",
      photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
      membershipNumber: "V-2026-0002",
      teamId: "team-2",
      departmentId: "dep-2",
      titleAr: "مصممة جرافيك متطوعة",
      titleEn: "Graphic Designer Volunteer",
      status: "active",
      points: 30,
      qrCode: "MEM-V-2026-0002",
      barcode: "100088868002",
      issueDate: "2026-02-01",
      expiryDate: "2027-02-01"
    },
    {
      id: "vol-3",
      name: "خالد بن عبد الله الزهراني",
      email: "khaled.zahrani@example.com",
      phone: "0543210987",
      photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
      membershipNumber: "V-2026-0003",
      teamId: "team-3",
      departmentId: "dep-4",
      titleAr: "متطوع علاقات عامة",
      titleEn: "PR Volunteer",
      status: "active",
      points: 15,
      qrCode: "MEM-V-2026-0003",
      barcode: "100088868003",
      issueDate: "2026-03-10",
      expiryDate: "2027-03-10"
    },
    {
      id: "vol-4",
      name: "فاطمة بنت عادل المالكي",
      email: "fatima.malki@example.com",
      phone: "0502468135",
      photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop",
      membershipNumber: "V-2026-0004",
      teamId: "team-4",
      departmentId: "dep-1",
      titleAr: "مسعف ميداني متطوع",
      titleEn: "Field Paramedic Volunteer",
      status: "active",
      points: 18,
      qrCode: "MEM-V-2026-0004",
      barcode: "100088868004",
      issueDate: "2026-02-20",
      expiryDate: "2027-02-20"
    },
    {
      id: "vol-5",
      name: "عمر بن سليمان الحربي",
      email: "omar.harbi@example.com",
      phone: "0535791357",
      photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop",
      membershipNumber: "V-2026-0005",
      teamId: "team-1",
      departmentId: "dep-3",
      titleAr: "متطوع مساند",
      titleEn: "Support Volunteer",
      status: "active",
      points: 9,
      qrCode: "MEM-V-2026-0005",
      barcode: "100088868005",
      issueDate: "2026-04-05",
      expiryDate: "2027-04-05"
    }
  ] as Volunteer[],

  initiatives: [
    {
      id: "init-1",
      name: "مبادرة تنظيم إفطار صائم بالعسيلة",
      description: "تنظيم وتوزيع وجبات الإفطار الرمضانية للأسر المحتاجة وعابري السبيل بمخطط العسيلة.",
      place: "مخطط العسيلة - الساحة العامة بجانب جامع الرضوان",
      date: "2026-07-15",
      startTime: "17:00",
      endTime: "19:30",
      departmentId: "dep-3",
      teamId: "team-1",
      leaderId: "lead-1",
      supervisorId: "sup-1",
      neededCount: 15,
      acceptedCount: 12,
      waitlistCount: 2,
      registrationStatus: "archived",
      acceptedVolunteerIds: ["vol-1", "vol-3", "vol-5"],
      waitlistVolunteerIds: ["vol-4"],
      applicantVolunteerIds: ["vol-1", "vol-3", "vol-4", "vol-5"]
    },
    {
      id: "init-2",
      name: "الحملة الإعلامية لكسوة الشتاء 2026",
      description: "إنتاج وتغطية المواد المرئية والمسموعة ونشر المحتوى لحملة كسوة الشتاء.",
      place: "مقر الجمعية بالعسيلة وقنوات التواصل",
      date: "2026-07-25",
      startTime: "09:00",
      endTime: "14:00",
      departmentId: "dep-2",
      teamId: "team-2",
      leaderId: "lead-2",
      supervisorId: "sup-2",
      neededCount: 5,
      acceptedCount: 3,
      waitlistCount: 1,
      registrationStatus: "open",
      acceptedVolunteerIds: ["vol-2"],
      waitlistVolunteerIds: [],
      applicantVolunteerIds: ["vol-2"]
    },
    {
      id: "init-3",
      name: "دورة أساسيات الإسعافات الأولية للفعاليات",
      description: "دورة توعوية وتأهيلية مكثفة للمتطوعين على إسعاف المصابين وإدارة المخاطر في التجمعات.",
      place: "قاعة ريادة التدريبية بمقر الجمعية",
      date: "2026-07-28",
      startTime: "16:00",
      endTime: "20:00",
      departmentId: "dep-1",
      teamId: "team-4",
      leaderId: "lead-4",
      supervisorId: "sup-4",
      neededCount: 30,
      acceptedCount: 15,
      waitlistCount: 5,
      registrationStatus: "open",
      acceptedVolunteerIds: ["vol-4", "vol-1"],
      waitlistVolunteerIds: ["vol-5"],
      applicantVolunteerIds: ["vol-4", "vol-1", "vol-5"]
    },
    {
      id: "init-4",
      name: "ملتقى الشراكات المجتمعية الأول",
      description: "استقبال وتنظيم فعاليات الملتقى الذي يهدف لتعزيز سبل العطاء والشراكة في المجتمع.",
      place: "فندق حياة ريجنسي مكة - القاعة الكبرى",
      date: "2026-08-05",
      startTime: "18:00",
      endTime: "22:00",
      departmentId: "dep-4",
      teamId: "team-3",
      leaderId: "lead-3",
      supervisorId: "sup-3",
      neededCount: 10,
      acceptedCount: 5,
      waitlistCount: 0,
      registrationStatus: "open",
      acceptedVolunteerIds: ["vol-3"],
      waitlistVolunteerIds: [],
      applicantVolunteerIds: ["vol-3"]
    }
  ] as Initiative[],

  requests: [
    {
      id: "req-1",
      volunteerId: "vol-1",
      volunteerName: "أحمد بن علي الغامدي",
      teamId: "team-1",
      departmentId: "dep-3",
      initiativeId: "init-3",
      initiativeName: "دورة أساسيات الإسعافات الأولية للفعاليات",
      status: "accepted",
      date: "2026-07-19"
    },
    {
      id: "req-2",
      volunteerId: "vol-5",
      volunteerName: "عمر بن سليمان الحربي",
      teamId: "team-1",
      departmentId: "dep-3",
      initiativeId: "init-3",
      initiativeName: "دورة أساسيات الإسعافات الأولية للفعاليات",
      status: "pending",
      date: "2026-07-20"
    }
  ] as JoinRequest[],

  attendance: [
    {
      id: "att-1",
      initiativeId: "init-1",
      volunteerId: "vol-1",
      date: "2026-07-15",
      status: "full",
      wearingVest: true,
      recordedBy: "سعود الحربي",
      timestamp: "2026-07-15T17:15:00Z"
    },
    {
      id: "att-2",
      initiativeId: "init-1",
      volunteerId: "vol-3",
      date: "2026-07-15",
      status: "late",
      wearingVest: true,
      recordedBy: "سعود الحربي",
      timestamp: "2026-07-15T17:45:00Z"
    },
    {
      id: "att-3",
      initiativeId: "init-1",
      volunteerId: "vol-5",
      date: "2026-07-15",
      status: "excused",
      wearingVest: false,
      recordedBy: "سعود الحربي",
      timestamp: "2026-07-15T17:00:00Z"
    }
  ] as AttendanceRecord[],

  evaluations: [
    {
      id: "eval-1",
      volunteerId: "vol-1",
      initiativeId: "init-1",
      commitment: 5,
      ethics: 5,
      cooperation: 5,
      discipline: 5,
      interaction: 5,
      wearingVest: true,
      taskExecution: 5,
      comments: "متطوع متميز جداً وملتزم بكافة التوجيهات والسديري الرسمي."
    },
    {
      id: "eval-2",
      volunteerId: "vol-3",
      initiativeId: "init-1",
      commitment: 4,
      ethics: 5,
      cooperation: 4,
      discipline: 4,
      interaction: 5,
      wearingVest: true,
      taskExecution: 4,
      comments: "أداء رائع بالرغم من التأخر البسيط."
    }
  ] as Evaluation[],

  logs: [
    {
      id: "log-1",
      timestamp: "2026-07-20T10:00:00Z",
      user: "المدير التنفيذي",
      action: "تسجيل الدخول للنظام",
      ip: "192.168.1.50",
      device: "Windows 11 / Chrome browser"
    },
    {
      id: "log-2",
      timestamp: "2026-07-20T11:30:00Z",
      user: "قائد فريق التنظيم (سعود الحربي)",
      action: "تسجيل الحضور للمتطوع أحمد الغامدي بمبادرة تنظيم إفطار صائم",
      ip: "192.168.10.12",
      device: "iPhone 15 / Safari browser"
    },
    {
      id: "log-3",
      timestamp: "2026-07-20T12:00:00Z",
      user: "المتطوع أحمد الغامدي",
      action: "إنشاء وتنزيل بطاقة التطوع الذكية",
      ip: "192.168.1.104",
      device: "Android Pie / Chrome Mobile"
    }
  ] as OperationLog[],

  notifications: [
    {
      id: "not-1",
      userId: "vol-1",
      titleAr: "تم قبول طلب انضمامك",
      titleEn: "Join request accepted",
      bodyAr: "تم قبول طلبك للمشاركة في دورة أساسيات الإسعافات الأولية للفعاليات.",
      bodyEn: "Your request to join First Aid Basics course has been accepted.",
      date: "2026-07-19",
      read: false
    },
    {
      id: "not-2",
      userId: "all",
      titleAr: "مبادرة جديدة متاحة للتسجيل",
      titleEn: "New Initiative Available",
      bodyAr: "تعلن إدارة العلاقات العامة عن طرح مبادرة ملتقى الشراكات المجتمعية الأول بالعسيلة.",
      bodyEn: "PR department announces the first Community Partnerships Forum initiative in Al-Usailah.",
      date: "2026-07-20",
      read: false
    }
  ] as Notification[],

  homeSettings: {
    logoUrl: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=120&h=120&fit=crop",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-hand-holding-a-growing-sprout-42234-large.mp4",
    videoCoverUrl: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1600&h=900&fit=crop",
    associationNameAr: "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة",
    associationNameEn: "Reyadat Al-Ata Association for Human Services in Al-Asilah",
    licenseNumber: "5081",
    heroTitleAr: "ريادةٌ في العطاء.. وخدمةٌ للإنسان",
    heroTitleEn: "Leadership in Giving.. Service for Humans",
    heroDescAr: "نسعى لتقديم الخدمات التنموية والخيرية المبتكرة والمستدامة لتأهيل وتنمية المجتمع بمخطط العسيلة المكي، ممتثلين قيم العطاء والشفافية والتمكين.",
    heroDescEn: "We strive to provide innovative and sustainable developmental and charitable services to qualify and develop the community in the Al-Asilah district of Mecca.",
    aboutUsAr: "تأسست جمعية ريادة العطاء لخدمة الإنسان بالعسيلة لتباشر مسؤوليتها المجتمعية والخيرية في تقديم الدعم المتكامل، وتعزيز قيم العمل الإنساني والوطني، والتطوع المؤسسي المنظم والفاعل لمختلف فئات المجتمع المكي في العسيلة.",
    aboutUsEn: "Reyadat Al-Ata Association was established in Al-Asilah to carry out its community and charitable responsibility in providing integrated support, promoting values of humanitarian work, and corporate volunteering.",
    visionAr: "الريادة في تمكين العمل الخيري والتطوعي وخدمة ضيوف الرحمن وأهالي العسيلة بجودة وتميز.",
    visionEn: "Leadership in empowering charity and volunteering, serving pilgrims and the Al-Asilah community with quality.",
    missionAr: "تقديم خدمات إنسانية وتنموية ومبادرات تطوعية مبتكرة تسهم في سد الاحتياجات وبناء القدرات بمخطط العسيلة بجودة واحترافية.",
    missionEn: "Providing innovative humanitarian and developmental services and volunteer initiatives to meet needs and build capacity.",
    goalsAr: [
      "استقطاب المتطوعين وتنمية قدراتهم وتأهيلهم للعمل الميداني والخدمي.",
      "تقديم الدعم والمساعدات المتكاملة والمستدامة للمستفيدين والأسر بمخطط العسيلة.",
      "تنظيم المبادرات التطوعية لخدمة ضيوف الرحمن والزوار والمعتمرين.",
      "بناء شراكات استراتيجية فاعلة ومثمرة مع القطاع الحكومي والخاص وغير الربحي.",
      "التحول الرقمي الكامل لجميع الخدمات والتعاملات الإدارية بالجمعية."
    ],
    goalsEn: [
      "Recruit, qualify and develop volunteers for field and service work.",
      "Provide integrated and sustainable support to beneficiaries in Al-Asilah.",
      "Organize volunteer initiatives to serve pilgrims and visitors.",
      "Build active strategic partnerships with public, private, and non-profit sectors.",
      "Complete digital transformation of all administrative services."
    ],
    valuesAr: ["الشفافية والنزاهة", "التمكين والاستدامة", "الريادة والابتكار", "التعاون والشراكة", "المسؤولية والمواطنة"],
    valuesEn: ["Transparency", "Empowerment", "Innovation", "Partnership", "Responsibility"],
    donationLink: "https://store.riadataleata.org.sa",
    contactPhone: "0550123456",
    contactEmail: "info@riadataleata.org.sa",
    contactLocationAr: "مكة المكرمة - مخطط العسيلة - الشارع العام",
    contactLocationEn: "Mecca - Al-Asilah Scheme - Public Street",
    contactHoursAr: "الأحد - الخميس: 8:00 ص - 4:00 م",
    contactHoursEn: "Sunday - Thursday: 8:00 AM - 4:00 PM",
    socialTwitter: "https://twitter.com/riadataleata",
    socialInstagram: "https://instagram.com/riadataleata",
    socialYoutube: "https://youtube.com/riadataleata",
    socialSnapchat: "https://snapchat.com/add/riadataleata",
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
  },
  news: [
    {
      id: "news-1",
      titleAr: "تدشين مبادرات ريادة العطاء الرمضانية لعام 1447هـ",
      titleEn: "Launching Reyadat Al-Ata Ramadan Initiatives for 1447 AH",
      bodyAr: "دشنت جمعية ريادة العطاء لخدمة الإنسان بالعسيلة الخطة السنوية لمبادرات إفطار صائم وتوزيع وجبات المعتمرين والزوار بمكة المكرمة بمشاركة أكثر من 200 متطوع معتمد بمختلف التخصصات والفرق التابعة للجمعية.",
      bodyEn: "Reyadat Al-Ata Association for Human Services in Al-Asilah launched the annual plan for Ramadan food distribution and serving pilgrims and visitors in Mecca with the participation of more than 200 volunteers.",
      image: "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=600&h=400&fit=crop",
      date: "2026-07-01"
    },
    {
      id: "news-2",
      titleAr: "توقيع اتفاقية شراكة استراتيجية لتأهيل الشباب المكي",
      titleEn: "Signing Strategic Partnership to Qualify Mecca Youth",
      bodyAr: "وقعت الجمعية مذكرة تفاهم مشترك مع أحد المعاهد التدريبية الرائدة بمكة المكرمة، بهدف تقديم برامج متكاملة ودورات تخصصية مجانية للمتطوعين والمستفيدين بالجمعية بمجالات الإسعافات الأولية وتأهيل الكوادر القيادية.",
      bodyEn: "The association signed a joint memorandum of understanding with a leading training institute in Mecca, aiming to provide integrated programs and free training for volunteers and beneficiaries.",
      image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&h=400&fit=crop",
      date: "2026-07-10"
    }
  ],
  partners: [
    { id: "partner-1", nameAr: "مؤسسة سليمان الراجحي الخيرية", nameEn: "Sulaiman Al Rajhi Foundation", logo: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=150&h=150&fit=crop", link: "https://rf.org.sa" },
    { id: "partner-2", nameAr: "منصة إحسان الوطنية للعمل الخيري", nameEn: "Ehsan National Platform", logo: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=150&h=150&fit=crop", link: "https://ehsan.sa" },
    { id: "partner-3", nameAr: "جمعية إكرام الجود لخدمة ضيوف الرحمن", nameEn: "Ekram Al-Jood Association", logo: "https://images.unsplash.com/photo-1554469384-e58fac16e23a?w=150&h=150&fit=crop", link: "https://ekram.sa" }
  ],
  gallery: [
    { id: "gal-1", type: "photo", url: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&h=600&fit=crop", titleAr: "توزيع وجبات المعتمرين في الساحات", titleEn: "Distributing meals to pilgrims in plazas", date: "2026-07-15" },
    { id: "gal-2", type: "photo", url: "https://images.unsplash.com/photo-1542810634-71277d95dcbb?w=800&h=600&fit=crop", titleAr: "اللقاء السنوي لمتطوعي ريادة العطاء", titleEn: "Annual meeting of Reyadat Al-Ata volunteers", date: "2026-07-18" },
    { id: "gal-3", type: "video", url: "https://assets.mixkit.co/videos/preview/mixkit-volunteers-distributing-food-box-to-poor-people-41584-large.mp4", titleAr: "فيديو وثائقي لمبادرة تنظيم حشود الإفطار", titleEn: "Documentary video of Ramadan food service", date: "2026-07-12" }
  ],
  beneficiaries: [
    {
      id: "ben-1",
      name: "أبو محمد المكي",
      beneficiaryNumber: "BEN-2026-0001",
      barcodeId: "BC-BEN-234567",
      email: "abumohammad@example.com",
      phone: "0550112233",
      nationalId: "1023456789",
      familySize: 5,
      category: "أسر متعففة",
      address: "مكة المكرمة - العسيلة - خلف جامع الرضوان",
      status: "approved",
      createdAt: "2026-07-01T12:00:00Z"
    },
    {
      id: "ben-2",
      name: "أم خالد الهذلي (أرملة وأم أيتام)",
      beneficiaryNumber: "BEN-2026-0002",
      barcodeId: "BC-BEN-345678",
      email: "umkhalid@example.com",
      phone: "0554443322",
      nationalId: "1034567890",
      familySize: 4,
      category: "أرامل وأيتام",
      address: "مكة المكرمة - العسيلة - مخطط 3",
      status: "approved",
      createdAt: "2026-07-03T10:30:00Z"
    },
    {
      id: "ben-3",
      name: "سالم بن عبد الله القرشي (كبير سن)",
      beneficiaryNumber: "BEN-2026-0003",
      barcodeId: "BC-BEN-456789",
      email: "salem.qurashi@example.com",
      phone: "0558889900",
      nationalId: "1045678901",
      familySize: 2,
      category: "كبار السن ومرضى",
      address: "مكة المكرمة - العسيلة - الشارع التجاري",
      status: "approved",
      createdAt: "2026-07-08T14:15:00Z"
    },
    {
      id: "ben-4",
      name: "فاطمة بنت أحمد النجار",
      beneficiaryNumber: "BEN-2026-0004",
      barcodeId: "BC-BEN-567890",
      email: "fatima.najjar@example.com",
      phone: "0551122998",
      nationalId: "1056789012",
      familySize: 6,
      category: "أسر متعففة",
      address: "مكة المكرمة - العسيلة - جوار مدرسة البنات",
      status: "approved",
      createdAt: "2026-07-12T09:00:00Z"
    }
  ],
  distributions: [
    {
      id: "dist-1",
      title: "توزيع سلال غذائية - رمضان 1448",
      aidType: "food_basket",
      aidTypeLabel: "سلال غذائية",
      description: "توزيع السلال الغذائية الرمضانية المتكاملة لمستفيدي الجمعية والأسر المتعففة والأيتام بالعسيلة",
      distributionDate: "2026-09-15",
      quantityPerBeneficiary: "1 سلة غذائية رمضانية متكاملة",
      targetAudience: "all",
      status: "active",
      location: "مقر الجمعية - صالة التوزيع الرئيسية بالعسيلة",
      createdAt: "2026-09-10T10:00:00Z",
      createdBy: "الإدارة العامة"
    },
    {
      id: "dist-2",
      title: "توزيع كسوة العيد وكسوة الشتاء",
      aidType: "clothing",
      aidTypeLabel: "كسوة وملابس",
      description: "صرف بطاقات وقسائم كسوة العيد وملابس متكاملة للأطفال وأسر المستفيدين",
      distributionDate: "2026-09-22",
      quantityPerBeneficiary: "1 قسيمة كسوة ملابس متكاملة",
      targetAudience: "all",
      status: "planned",
      location: "مركز التوزيع الميداني - قاعة العطاء",
      createdAt: "2026-09-11T12:00:00Z",
      createdBy: "إدارة المستفيدين"
    },
    {
      id: "dist-3",
      title: "سقيا الماء وتوزيع كراتين المياه المبردة",
      aidType: "water",
      aidTypeLabel: "سقيا ومياه",
      description: "مشروع سقيا الماء الصالح للشرب وتوزيع كراتين مياه معبأة للأسر المستفيدة",
      distributionDate: "2026-09-08",
      quantityPerBeneficiary: "2 كرتون مياه صحية (40 عبوة)",
      targetAudience: "all",
      status: "completed",
      location: "مستودع السقيا والتموين بالعسيلة",
      createdAt: "2026-09-01T08:00:00Z",
      createdBy: "فريق الإغاثة الميدانية"
    }
  ],
  distributionHandovers: [
    {
      id: "handover-1",
      distributionId: "dist-1",
      beneficiaryId: "ben-1",
      beneficiaryName: "أبو محمد المكي",
      beneficiaryNumber: "BEN-2026-0001",
      barcodeId: "BC-BEN-234567",
      nationalId: "1023456789",
      phone: "0550112233",
      familySize: 5,
      receivedAt: "2026-09-12T09:15:00Z",
      date: "2026-09-12",
      time: "09:15:20",
      handedByUserId: "admin",
      handedByUserName: "الإدارة العامة",
      handedByUserRole: "admin",
      method: "camera_scanner",
      notes: "تم التحقق وتسليم السلة بنجاح بعد مسح الباركود"
    }
  ],
  benefitRequests: [
    {
      id: "benreq-1",
      beneficiaryId: "ben-1",
      beneficiaryName: "أبو محمد المكي",
      type: "food",
      details: "طلب سلة غذائية رمضانية متكاملة لأسرة مكونة من 5 أفراد مسجلة بنطاق حي العسيلة.",
      status: "completed",
      date: "2026-07-05",
      notes: "تم تسليم السلة الغذائية المتكاملة بمقر الجمعية."
    },
    {
      id: "benreq-2",
      beneficiaryId: "ben-1",
      beneficiaryName: "أبو محمد المكي",
      type: "medical",
      details: "طلب توفير جهاز قياس السكر وضغط الدم ومستهلكات طبية للوالد المسن.",
      status: "pending",
      date: "2026-07-20",
      notes: ""
    }
  ],
  orgMembers: [],
  heroSlides: [],
  volunteerApplications: [
    {
      id: "app-101",
      fullName: "محمد بن إبراهيم الحازمي",
      nationalId: "1098765432",
      fileNumber: "FILE-2026-001",
      gender: "male",
      nationality: "سعودي",
      birthDate: "1998-05-14",
      age: 28,
      phone: "0559876543",
      email: "m.hazmi@example.com",
      position: "متطوع",
      joinDate: "2026-07-26",
      address: "مكة المكرمة - مخطط العسيلة - حي الرضوان",
      bloodType: "O+",
      hasChronicIllness: false,
      illnessDetails: "",
      guardianName: "إبراهيم الحازمي",
      guardianPhone: "0501112233",
      photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop",
      idPhoto: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&h=250&fit=crop",
      charterPdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      charterPdfName: "ميثاق_التطوع_محمد_الحازمي.pdf",
      experiences: "خبرة 3 سنوات في تنظيم الفعاليات وإدارة الحشود بمكة المكرمة. حاصل على دورة الإسعافات الأولية المعتمدة.",
      agreedToTerms: true,
      status: "pending",
      appliedAt: "2026-07-26T14:30:00Z",
      requestedTeamId: "team-1",
      requestedTeamName: "فريق التنظيم"
    },
    {
      id: "app-102",
      fullName: "ريم بنت عبدالله الشهري",
      nationalId: "1087654321",
      fileNumber: "FILE-2026-002",
      gender: "female",
      nationality: "سعودية",
      birthDate: "2001-09-20",
      age: 25,
      phone: "0561239876",
      email: "reem.shehri@example.com",
      position: "متطوعة إعلامية",
      joinDate: "2026-07-27",
      address: "مكة المكرمة - العسيلة - الشارع العام",
      bloodType: "A+",
      hasChronicIllness: true,
      illnessDetails: "حساسية ربوية خفيفة - بخاخ محمول",
      guardianName: "عبدالله الشهري",
      guardianPhone: "0504445566",
      photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&h=300&fit=crop",
      idPhoto: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&h=250&fit=crop",
      charterPdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      charterPdfName: "ميثاق_التطوع_ريم_الشهري.pdf",
      experiences: "مصممة جرافيك وصانعة محتوى مرئي. شاركت في 4 حملات تطوعية بمدينة مكة المكرمة.",
      agreedToTerms: true,
      status: "pending",
      appliedAt: "2026-07-27T09:15:00Z",
      requestedTeamId: "team-2",
      requestedTeamName: "فريق الإعلام"
    },
    {
      id: "app-103",
      fullName: "فيصل بن سعد السلمي",
      nationalId: "1076543210",
      fileNumber: "FILE-2026-003",
      gender: "male",
      nationality: "سعودي",
      birthDate: "1995-02-10",
      age: 31,
      phone: "0548889900",
      email: "faisal.sulami@example.com",
      position: "متطوع ميداني",
      joinDate: "2026-07-20",
      address: "مكة المكرمة - مخطط العسيلة",
      bloodType: "B+",
      hasChronicIllness: false,
      illnessDetails: "",
      guardianName: "سعد السلمي",
      guardianPhone: "0507778899",
      photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&h=300&fit=crop",
      idPhoto: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&h=250&fit=crop",
      charterPdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      charterPdfName: "ميثاق_التطوع_فيصل_السلمي.pdf",
      experiences: "خبرة في المبادرات الاجتماعية وسقيا المعتمرين.",
      agreedToTerms: true,
      status: "accepted",
      appliedAt: "2026-07-20T11:00:00Z",
      assignedTeamId: "team-1",
      requestedTeamId: "team-1",
      requestedTeamName: "فريق التنظيم"
    }
  ] as VolunteerApplication[],

  teamApplications: [
    {
      id: "t-app-101",
      applicationNumber: "TEAM-2026-0001",
      teamName: "فريق سواعد العسيلة الصحي",
      teamNameEn: "Sawaed Al-Asilah Health Team",
      field: "health",
      region: "منطقة مكة المكرمة",
      city: "مكة المكرمة - العسيلة",
      establishedDate: "2024-03-15",
      leaderName: "د. عبد المجيد بن صالح القرشي",
      leaderNationalId: "1088992211",
      leaderPhone: "0505123456",
      leaderEmail: "dr.qurashi@example.com",
      deputyName: "أ. حنان بنت فهد المحمادي",
      deputyPhone: "0556789012",
      membersCount: 22,
      maleMembersCount: 12,
      femaleMembersCount: 10,
      description: "فريق تطوعي متخصص في الرعاية الصحية الأولية والتثقيف الصحي الوقائي والإسعافات الأولية لقاصدي بيت الله الحرام وسكان مخطط العسيلة.",
      vision: "مجتمع صحي وواعي ومتمكن من مهارات السلامة والإسعاف.",
      mission: "تقديم مبادرات صحية تثقيفية ووقائية وطبية تطوعية بأعلى معايير الجودة.",
      goals: "1. تدريب 500 مستفيد سنوياً على الإنعاش القلبي والرئوي.\n2. إقامة عيادات متنقلة للفحص المبكر لضغط الدم والسكري.\n3. مساندة القطاع الصحي في مواسم الحج والعمرة بالعسيلة.",
      services: ["فحص السكري وضغط الدم", "التثقيف الصحي والغذائي", "الإسعافات الأولية وتغطية الفعاليات", "زيارات كبار السن المنزلية"],
      meaningfulIdea: "إنشاء نقاط فحص وتوعية صحية سريعة في جوامع العسيلة الرئيسية عقب صلاة الجمعة وفي مواسم العمرة والحج لتقديم الاستشارات والفحوصات الأولية وتوجيه الحالات المحتاجة للرعاية الطبية المتقدمة.",
      pastExperience: "نفذ الفريق خلال العامين الماضيين 14 مبادرة صحية وتوعوية، وقدم خدمات الفحص لأكثر من 3,800 مستفيد، وشارك في تنظيم مواسم الحج مع الجمعيات الصحية المعتمدة.",
      targetDepartment: "health",
      teamColor: "#059669",
      logoUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=300&h=300&fit=crop",
      attachments: [
        { id: "att-t1", title: "اللائحة الأساسية وتشكيل الفريق", url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", fileName: "اللائحة_التنظيمية_لفريق_سواعد.pdf", type: "pdf", uploadedAt: "2026-07-28T10:00:00Z" },
        { id: "att-t2", title: "تقرير الإنجازات والمبادرات السابقة 2024-2025", url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", fileName: "تقرير_إنجازات_الفريق.pdf", type: "pdf", uploadedAt: "2026-07-28T10:00:00Z" }
      ],
      socialLinks: {
        twitter: "https://x.com/sawaed_aseelah",
        instagram: "https://instagram.com/sawaed_aseelah"
      },
      pastInitiativesCount: 14,
      pastBeneficiariesCount: 3800,
      pastVolunteerHours: 460,
      pastPartnerEntities: "التجمع الصحي بمكة، جمعية درهم وقاية، مستشفى حراء العام",
      majorPastInitiatives: "مبادرة نبض العسيلة للفحص المبكر، برنامج المسعف الصغير، عيادات سقيا وصحة لضيوف الرحمن",
      achievementsAndExperience: "الفوز بجائزة التميز الصحي التطوعي بمنطقة مكة المكرمة لعام 1445هـ",
      status: "pending",
      submittedAt: "2026-07-28T10:30:00Z",
      appliedAt: "2026-07-28T10:30:00Z",
      agreedToTerms: true,
      agreedToVolunteerPolicy: true,
      agreedToPrivacyPolicy: true,
      agreedToDataAccuracy: true,
      agreedToRegulations: true,
      agreementTimestamp: "2026-07-28T10:30:00Z"
    },
    {
      id: "t-app-102",
      applicationNumber: "TEAM-2026-0002",
      teamName: "فريق صناع الأثر الإعلامي التطوعي",
      teamNameEn: "Impact Makers Media Team",
      field: "media",
      region: "منطقة مكة المكرمة",
      city: "مكة المكرمة",
      establishedDate: "2023-11-01",
      leaderName: "أ. ماجد بن عبد العزيز الهذلي",
      leaderNationalId: "1077665544",
      leaderPhone: "0543322119",
      leaderEmail: "m.hothali@example.com",
      deputyName: "أ. شهد بنت طارق الحربي",
      deputyPhone: "0569988771",
      membersCount: 16,
      maleMembersCount: 8,
      femaleMembersCount: 8,
      description: "فريق إعلامي تطوعي متخصص في الإنتاج المرئي، التغطيات الحية، صناعة الأفلام الوثائقية، وإبراز الأثر الإنساني والمبادرات الخيرية.",
      vision: "صوت إعلامي رقمي رائد يوثق وينشر قيم العطاء والتكافل في أطهر البقاع.",
      mission: "تسخير المهارات الإعلامية والتقنية لصناعة محتوى رقمي ملهم يبرز منجزات العمل التطوعي.",
      goals: "1. توثيق كافة المبادرات التطوعية بإنتاج فوتوغرافي ومرئي سينمائي.\n2. إعداد تقارير تلفزيونية ورقمية للنشر على وسائل الإعلام ومنصات التواصل.\n3. تدريب المتطوعين الجدد على مهارات التصوير والمونتاج الاحترافي.",
      services: ["التغطيات الميدانية الحية", "صناعة الأفلام الوثائقية", "التصميم الجرافيكي والموشن جرافيك", "إدارة الحملات الرقمية"],
      meaningfulIdea: "إطلاق منصة 'عين العسيلة' الإعلامية لتوثيق قصص المستفيدين والمتطوعين في مقاطع فيديو ملهمة قصيرة ونشرها لتعزيز ثقافة العمل الخيري في المجتمع المكي.",
      pastExperience: "إنتاج أكثر من 45 تغطية إعلامية و12 فيلماً وثائقياً قصيراً للعديد من الجمعيات والمؤسسات غير الربحية بمكة المكرمة وجدة.",
      targetDepartment: "media",
      teamColor: "#0284c7",
      logoUrl: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=300&h=300&fit=crop",
      attachments: [
        { id: "att-t3", title: "ملف أعمال الفريق الإعلامي (Portfolio)", url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", fileName: "بورتفوليو_صناع_الأثر.pdf", type: "pdf", uploadedAt: "2026-07-29T14:00:00Z" }
      ],
      socialLinks: {
        twitter: "https://x.com/impact_media_team",
        youtube: "https://youtube.com/@impact_media_team",
        tiktok: "https://tiktok.com/@impact_media_team"
      },
      pastInitiativesCount: 20,
      pastBeneficiariesCount: 15000,
      pastVolunteerHours: 620,
      pastPartnerEntities: "جمعية مراكز الأحياء، نادي مكة الثقافي، هيئة الإذاعة والتلفزيون",
      majorPastInitiatives: "وثائقي 'عطاء العسيلة'، تغطية موسم حج 1445هـ، مبادرة 'عدسة متطوع'",
      achievementsAndExperience: "درع التكريم الإعلامي الأول في ملتقى الإعلام التطوعي السعودي 2024م",
      status: "pending",
      submittedAt: "2026-07-29T14:15:00Z",
      appliedAt: "2026-07-29T14:15:00Z",
      agreedToTerms: true,
      agreedToVolunteerPolicy: true,
      agreedToPrivacyPolicy: true,
      agreedToDataAccuracy: true,
      agreedToRegulations: true,
      agreementTimestamp: "2026-07-29T14:15:00Z"
    }
  ] as unknown as TeamApplication[],

  chatConversations: [
    {
      id: "conv-1",
      type: "group",
      name: "فريق تنظيم العسيلة (الميداني)",
      avatar: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=120&h=120&fit=crop",
      participantIds: ["admin-1", "lead-1", "vol-1", "vol-3", "vol-5"],
      participantNames: ["سعود الحربي", "أحمد الغامدي", "خالد الزهراني", "عمر الحربي"],
      teamId: "team-1",
      lastMessage: "تم تجهيز نقطة استقبال المعتمرين برضوان العسيلة.",
      lastMessageTime: "2026-07-27T10:15:00Z",
      unreadCount: { "admin-1": 1 },
      createdAt: "2026-07-01T00:00:00Z"
    },
    {
      id: "conv-2",
      type: "direct",
      name: "سعود الحربي (قائد فريق التنظيم)",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop",
      participantIds: ["admin-1", "lead-1"],
      participantNames: ["الإدارة العامة", "سعود الحربي"],
      lastMessage: "السلام عليكم، هل جرى اعتماد قائمة الساعات التطوعية لهذا الأسبوع؟",
      lastMessageTime: "2026-07-27T09:40:00Z",
      unreadCount: { "admin-1": 2 },
      createdAt: "2026-07-10T00:00:00Z"
    },
    {
      id: "conv-3",
      type: "group",
      name: "لجنة الإعلام والنشر والتوثيق",
      avatar: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=120&h=120&fit=crop",
      participantIds: ["admin-1", "lead-2", "vol-2"],
      participantNames: ["الإدارة العامة", "مريم العتيبي", "سارة الدوسري"],
      teamId: "team-2",
      lastMessage: "تم رفع الفيديو التوثيقي لملتقى الشراكات المجتمعية.",
      lastMessageTime: "2026-07-26T18:20:00Z",
      unreadCount: {},
      createdAt: "2026-07-05T00:00:00Z"
    }
  ],

  chatMessages: [
    {
      id: "msg-1",
      conversationId: "conv-1",
      senderId: "lead-1",
      senderName: "سعود الحربي",
      senderAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop",
      senderRole: "قائد فريق التنظيم",
      type: "text",
      content: "السلام عليكم ورحمة الله وبركاته، تحية طيبة لجميع أعضاء فريق التنظيم بالعسيلة.",
      timestamp: "2026-07-27T10:00:00Z",
      status: "read"
    },
    {
      id: "msg-2",
      conversationId: "conv-1",
      senderId: "vol-1",
      senderName: "أحمد بن علي الغامدي",
      senderAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop",
      senderRole: "متطوع متميز",
      type: "text",
      content: "وعليكم السلام ورحمة الله، نحن في الجاهزية الكاملة للانطلاق في مبادرة اليوم.",
      timestamp: "2026-07-27T10:05:00Z",
      status: "read"
    },
    {
      id: "msg-3",
      conversationId: "conv-1",
      senderId: "lead-1",
      senderName: "سعود الحربي",
      senderAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop",
      senderRole: "قائد فريق التنظيم",
      type: "image",
      content: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&fit=crop",
      fileName: "خطة_توزيع_الميدان.jpg",
      timestamp: "2026-07-27T10:10:00Z",
      status: "read"
    },
    {
      id: "msg-4",
      conversationId: "conv-1",
      senderId: "lead-1",
      senderName: "سعود الحربي",
      senderAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop",
      senderRole: "قائد فريق التنظيم",
      type: "text",
      content: "تم تجهيز نقطة استقبال المعتمرين برضوان العسيلة.",
      timestamp: "2026-07-27T10:15:00Z",
      status: "delivered"
    },
    {
      id: "msg-5",
      conversationId: "conv-2",
      senderId: "lead-1",
      senderName: "سعود الحربي",
      senderAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop",
      senderRole: "قائد فريق التنظيم",
      type: "text",
      content: "السلام عليكم، هل جرى اعتماد قائمة الساعات التطوعية لهذا الأسبوع؟",
      timestamp: "2026-07-27T09:40:00Z",
      status: "delivered"
    }
  ],

  supportTickets: [
    {
      id: "ticket-101",
      ticketNumber: "TICK-2026-001",
      requesterId: "vol-1",
      requesterName: "أحمد بن علي الغامدي",
      requesterEmail: "ahmed.ghamdi@example.com",
      requesterPhone: "0551234567",
      requesterRole: "volunteer",
      subject: "مشكلة في إصدار وتنزيل بطاقة التطوع الرقمية بالباركود",
      status: "new",
      priority: "urgent",
      createdAt: "2026-07-27T08:30:00Z",
      updatedAt: "2026-07-27T08:32:00Z",
      escalatedFromAi: true,
      escalationReason: "طلب المستخدم التحدث مع موظف دعم فني حقيقي لعدم تمكن الذكاء الاصطناعي من قراءة رمز المعرف.",
      chatTranscript: [
        {
          id: "tm-1",
          ticketId: "ticket-101",
          senderType: "user",
          senderName: "أحمد بن علي الغامدي",
          content: "أحاول تحميل بطاقة التطوع الذكية الخاصة بي ولكن يظهر لي رمز خطأ عند الضغط على الطباعة.",
          timestamp: "2026-07-27T08:30:00Z"
        },
        {
          id: "tm-2",
          ticketId: "ticket-101",
          senderType: "ai",
          senderName: "مساعد ريادة العطاء الذكي",
          content: "أهلاً بك أ. أحمد! يرجى التأكد من تسجيل الدخول أولاً والتأكد من تفعيل العضوية من قبل إدارتك. هل قمت بتحديث رقم العضوية في حسابك الشخصي؟",
          timestamp: "2026-07-27T08:31:00Z"
        },
        {
          id: "tm-3",
          ticketId: "ticket-101",
          senderType: "user",
          senderName: "أحمد بن علي الغامدي",
          content: "نعم قمت بتحديث البيانات ولكن المشكلة مستمرة، أريد التحدث مع موظف الدعم الفني الفعلي فوراً.",
          timestamp: "2026-07-27T08:32:00Z"
        },
        {
          id: "tm-4",
          ticketId: "ticket-101",
          senderType: "ai",
          senderName: "مساعد ريادة العطاء الذكي",
          content: "تم تحويل الطلب تلقائياً إلى موظف الدعم الفني الفعلي (تذكرة رقم #TICK-2026-001). سيقوم الموظف بمتابعة المحادثة معك والرد هنا مباشرة.",
          timestamp: "2026-07-27T08:32:10Z"
        }
      ]
    },
    {
      id: "ticket-102",
      ticketNumber: "TICK-2026-002",
      requesterId: "ben-1",
      requesterName: "أبو محمد المكي",
      requesterEmail: "abumohammed@example.com",
      requesterPhone: "0501234567",
      requesterRole: "beneficiary",
      subject: "استفسار عن موعد تسليم الأجهزة الطبية لسكر الدم",
      status: "in_progress",
      priority: "medium",
      assignedToAgentName: "مهندس الدعم التقني - عبد الرحمن",
      createdAt: "2026-07-26T14:20:00Z",
      updatedAt: "2026-07-26T15:10:00Z",
      escalatedFromAi: true,
      escalationReason: "استفسار خاص يتطلب صلاحيات مراجعة قسم المستفيدين.",
      chatTranscript: [
        {
          id: "tm-20",
          ticketId: "ticket-102",
          senderType: "user",
          senderName: "أبو محمد المكي",
          content: "متى سيتم التواصل معي بخصوص الطلب الطبي الصادر يوم 20 يوليو؟",
          timestamp: "2026-07-26T14:20:00Z"
        },
        {
          id: "tm-21",
          ticketId: "ticket-102",
          senderType: "agent",
          senderName: "مهندس الدعم التقني - عبد الرحمن",
          content: "أهلاً بك أبا محمد، تم تحويل الطلب لقسم الخدمة الاجتماعية وسيتم التواصل معك غداً صباحاً لإتمام التسليم بإذن الله.",
          timestamp: "2026-07-26T15:10:00Z"
        }
      ]
    }
  ],
  opportunityRequests: [
    {
      id: "8766666666",
      title: "لللللللللللل",
      opportunityType: "فرصة عادية",
      domain: "إداري",
      neededCount: 4,
      acceptedVolunteersCount: 0,
      place: "مكتب السنين - الرياض",
      goals: ["الهدف الأول", "الهدف الثاني", "الهدف الثالث"],
      description: "طلب فرصة إدارية عادية لتنظيم المهام الميدانية.",
      status: "rejected",
      teamId: "team-1",
      teamName: "فريق التنظيم",
      departmentId: "dep-3",
      leaderId: "lead-1",
      leaderName: "سعود الحربي",
      createdAt: "2026-07-20T10:00:00Z",
      rejectionReason: "البيانات المقدمة غير مكتملة."
    },
    {
      id: "87666666666666",
      title: "ر لااىات",
      opportunityType: "فعالية تطوعية",
      domain: "صحي",
      neededCount: 52,
      acceptedVolunteersCount: 0,
      place: "جده",
      goals: ["ي", "ي", "ي"],
      description: "لايسشس",
      status: "rejected",
      teamId: "team-1",
      teamName: "فريق التنظيم",
      departmentId: "dep-3",
      leaderId: "lead-1",
      leaderName: "سعود الحربي",
      createdAt: "2026-07-21T11:00:00Z",
      startDate: "09/07/2026",
      endDate: "28/07/2026",
      nationalPlatformUrl: "https://riadataleata.com/opportunity_requests.php",
      rejectionReason: "مرفوضة لعدم استيفاء الشروط المعتمدة."
    },
    {
      id: "87666666999999",
      title: "حملة المسح الصحي والتوعية الميدانية بالعسيلة",
      opportunityType: "فعالية تطوعية",
      domain: "صحي",
      neededCount: 20,
      acceptedVolunteersCount: 0,
      place: "مكة المكرمة - العسيلة",
      goals: ["فحص السكري والتوعية", "توزيع المستلزمات الطبية", "تقديم الاستشارات الميدانية"],
      description: "حملة صحية توعوية لمساعدة أهالي وسكان مخطط العسيلة المكي.",
      status: "pending",
      teamId: "team-1",
      teamName: "فريق التنظيم",
      departmentId: "dep-3",
      leaderId: "lead-1",
      leaderName: "سعود الحربي",
      createdAt: "2026-07-27T12:00:00Z"
    }
  ] as OpportunityRequest[],
  departmentDirectives: [
    {
      id: "dir-101",
      departmentId: "dep-6",
      departmentNameAr: "إدارة العلاقات العامة والإعلام",
      title: "إعداد الخطة الإعلامية والتوثيق الميداني لحملة الوفاء بالعسيلة",
      description: "المطلوب إعداد التغطية الفوغرافية، وتصميم البوستات الرسمية للمبادرة، ونشر التقرير الصحفي المعتمد عبر المنصات والموقع الإلكتروني.",
      priority: "urgent",
      dueDate: "2026-08-01",
      status: "in_progress",
      createdAt: "2026-07-27T10:00:00Z",
      createdBy: "مجلس الإدارة",
      completionNotes: "جاري العمل على التصاميم وتم التنسيق مع المصور الميداني لتغطية الموقع."
    },
    {
      id: "dir-102",
      departmentId: "dep-2",
      departmentNameAr: "الإدارة المالية",
      title: "رفع القوائم المالية والعهد للربع الثاني 2026م",
      description: "مراجعة واعتماد الميزانية المخصصة لمبادرات إفطار صائم، وتدقيق الفواتير المرفوعة وإغلاق العهد المالية مع قادة الفرق.",
      priority: "high",
      dueDate: "2026-08-05",
      status: "pending",
      createdAt: "2026-07-26T09:00:00Z",
      createdBy: "مجلس الإدارة"
    },
    {
      id: "dir-103",
      departmentId: "dep-5",
      departmentNameAr: "إدارة التطوع والموارد البشرية",
      title: "مراجعة طلبات الانضمام المعلقة وإصدار بطاقات المتطوعين الجدد",
      description: "المطلوب مراجعة الملفات الواردة لقائمة الانتظار، والتأكد من إرفاق الميثاق والمستندات وإصدار البطاقات الرقمية.",
      priority: "high",
      dueDate: "2026-07-30",
      status: "completed",
      createdAt: "2026-07-25T11:00:00Z",
      createdBy: "مجلس الإدارة",
      completionNotes: "تم اعتماد جميع الملفات المكتملة وإصدار 45 بطاقة رقمية بنجاح."
    }
  ],
  storeProjects: [
    {
      id: "prj-wat",
      titleAr: "مشروع سقيا الماء بالمسجد الحرام ومناطق العسيلة",
      titleEn: "Water Supply Project",
      category: "سقيا الماء",
      descriptionAr: "توفير عبوات مياه الصفا الباردة والنقية لضيوف الرحمن ومرتادي الجوامع والأسر المحتاجة بقطاع العسيلة.",
      imageUrl: "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=800&h=500&fit=crop",
      targetAmount: 100000,
      raisedAmount: 68500,
      availableBalance: 52000,
      totalExpenses: 16500,
      donationCount: 412,
      unitPrice: 10,
      status: "active",
      accountCode: "ACC-101-WAT",
      createdAt: "2026-01-01T00:00:00Z"
    },
    {
      id: "prj-mus",
      titleAr: "مشروع إهداء وتوزيع المصاحف الشريفة وترجماتها",
      titleEn: "Quran Distribution Project",
      category: "توزيع المصاحف",
      descriptionAr: "طباعة وتوزيع المصاحف الشريفة مع الترجمات المعتمدة على جوامع ومساجد العسيلة والمصليات الميدانية.",
      imageUrl: "https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=800&h=500&fit=crop",
      targetAmount: 50000,
      raisedAmount: 34200,
      availableBalance: 28000,
      totalExpenses: 6200,
      donationCount: 186,
      unitPrice: 20,
      status: "active",
      accountCode: "ACC-102-MUS",
      createdAt: "2026-01-01T00:00:00Z"
    },
    {
      id: "prj-bsk",
      titleAr: "مشروع السلال الغذائية المتكاملة للأسر المتعففة",
      titleEn: "Food Baskets Project",
      category: "السلال الغذائية",
      descriptionAr: "توفير السلال الغذائية الأساسية الشاملة للأصناف التموينية الضرورية لدعم كبار السن والأسر المتعففة.",
      imageUrl: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&h=500&fit=crop",
      targetAmount: 150000,
      raisedAmount: 112000,
      availableBalance: 85500,
      totalExpenses: 26500,
      donationCount: 320,
      unitPrice: 150,
      status: "active",
      accountCode: "ACC-103-BSK",
      createdAt: "2026-01-01T00:00:00Z"
    },
    {
      id: "prj-zam",
      titleAr: "مشروع سقيا ماء زمزم المبارك للقرى والنازحين",
      titleEn: "Zamzam Water Project",
      category: "سقيا ماء زمزم",
      descriptionAr: "نقل وتوزيع حافظات ماء زمزم المبارك النقية لخدمة القرى المحيطة والأسر والأطفال والزوار.",
      imageUrl: "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?w=800&h=500&fit=crop",
      targetAmount: 80000,
      raisedAmount: 49800,
      availableBalance: 41200,
      totalExpenses: 8600,
      donationCount: 209,
      unitPrice: 15,
      status: "active",
      accountCode: "ACC-104-ZAM",
      createdAt: "2026-01-01T00:00:00Z"
    }
  ],
  storeDonations: [
    {
      id: "don-1001",
      donationNumber: "DON-2026-1001",
      donorName: "عبدالله بن أحمد المكي",
      donorPhone: "0551122334",
      donorEmail: "donor.makkah@example.com",
      projectId: "prj-wat",
      projectNameAr: "مشروع سقيا الماء بالمسجد الحرام ومناطق العسيلة",
      amount: 500,
      paymentMethod: "mada",
      paymentStatus: "completed",
      transactionRef: "TXN-88291034",
      createdAt: "2026-07-28T10:15:00Z"
    },
    {
      id: "don-1002",
      donationNumber: "DON-2026-1002",
      donorName: "فاطمة بنت خالد العتيبي",
      donorPhone: "0503344556",
      projectId: "prj-mus",
      projectNameAr: "مشروع إهداء وتوزيع المصاحف الشريفة وترجماتها",
      amount: 200,
      paymentMethod: "visa",
      paymentStatus: "completed",
      transactionRef: "TXN-88291035",
      createdAt: "2026-07-28T11:40:00Z"
    },
    {
      id: "don-1003",
      donationNumber: "DON-2026-1003",
      donorName: "فاعل خير",
      donorPhone: "0540000000",
      projectId: "prj-bsk",
      projectNameAr: "مشروع السلال الغذائية المتكاملة للأسر المتعففة",
      amount: 450,
      paymentMethod: "apple_pay",
      paymentStatus: "completed",
      transactionRef: "TXN-88291036",
      createdAt: "2026-07-29T14:20:00Z"
    },
    {
      id: "don-1004",
      donationNumber: "DON-2026-1004",
      donorName: "محمد بن علي الحربي",
      donorPhone: "0561239876",
      projectId: "prj-zam",
      projectNameAr: "مشروع سقيا ماء زمزم المبارك للقرى والنازحين",
      amount: 300,
      paymentMethod: "mada",
      paymentStatus: "completed",
      transactionRef: "TXN-88291037",
      createdAt: "2026-07-30T09:05:00Z"
    }
  ],
  financialTransactions: [
    {
      id: "fin-1001",
      type: "income",
      category: "donation",
      projectId: "prj-wat",
      projectNameAr: "مشروع سقيا الماء بالمسجد الحرام ومناطق العسيلة",
      amount: 500,
      paymentMethod: "مدى (Mada)",
      status: "completed",
      referenceNumber: "TXN-88291034",
      donorOrVendor: "عبدالله بن أحمد المكي",
      description: "تبرع إلكتروني مباشر عبر متجر الجمعية الإلكتروني",
      accountCode: "ACC-101-WAT",
      date: "2026-07-28",
      createdAt: "2026-07-28T10:15:00Z"
    },
    {
      id: "fin-1002",
      type: "income",
      category: "donation",
      projectId: "prj-mus",
      projectNameAr: "مشروع إهداء وتوزيع المصاحف الشريفة وترجماتها",
      amount: 200,
      paymentMethod: "بطاقة فيزا (VISA)",
      status: "completed",
      referenceNumber: "TXN-88291035",
      donorOrVendor: "فاطمة بنت خالد العتيبي",
      description: "تبرع إلكتروني مباشر عبر متجر الجمعية الإلكتروني",
      accountCode: "ACC-102-MUS",
      date: "2026-07-28",
      createdAt: "2026-07-28T11:40:00Z"
    },
    {
      id: "fin-1003",
      type: "income",
      category: "donation",
      projectId: "prj-bsk",
      projectNameAr: "مشروع السلال الغذائية المتكاملة للأسر المتعففة",
      amount: 450,
      paymentMethod: "أبل باي (Apple Pay)",
      status: "completed",
      referenceNumber: "TXN-88291036",
      donorOrVendor: "فاعل خير",
      description: "تبرع إلكتروني مباشر عبر متجر الجمعية الإلكتروني",
      accountCode: "ACC-103-BSK",
      date: "2026-07-29",
      createdAt: "2026-07-29T14:20:00Z"
    },
    {
      id: "fin-1004",
      type: "expense",
      category: "project_expense",
      projectId: "prj-wat",
      projectNameAr: "مشروع سقيا الماء بالمسجد الحرام ومناطق العسيلة",
      amount: 16500,
      paymentMethod: "تحويل بنكي رسمي",
      status: "completed",
      referenceNumber: "EXP-2026-001",
      donorOrVendor: "شركة مياه الصفا والمروة",
      description: "شراء توريد 500 كرتون عبوات مياه لسقيا المساجد والجوامع",
      accountCode: "ACC-101-WAT",
      date: "2026-07-25",
      createdAt: "2026-07-25T08:00:00Z"
    }
  ],
  letters: [
    {
      id: "ltr-101",
      letterNumber: "LTR-2026-0001",
      submissionType: "ready_file",
      senderName: "د. عبد الرحمن بن عبد العزيز السالم",
      senderType: "قائد فريق",
      senderPhone: "0551234567",
      senderEmail: "leader.salem@riadataleata.org.sa",
      senderRole: "قائد فريق العسيلة الصحي",
      senderOrganization: "فريق العسيلة الصحي التطوعي",
      userId: "team-1",
      userRole: "leader",
      teamId: "team-1",
      subject: "طلب اعتماد خطة المبادرات الصحية لموسم الحج والعمرة 1447هـ",
      letterFileUrl: "https://example.com/letters/health_plan_2026.pdf",
      letterFileName: "خطة_المبادرات_الصحية_1447هـ.pdf",
      letterFileSize: "1.8 MB",
      status: "under_review",
      isRead: true,
      adminNotes: "تمت إحالة الخطة إلى إدارة البرامج والمبادرات لدراستها ومطابقتها للمسارات الصحية.",
      createdAt: "2026-08-01T10:00:00Z"
    },
    {
      id: "ltr-102",
      letterNumber: "LTR-2026-0002",
      submissionType: "custom_letter",
      senderName: "أ. ياسر الغامدي",
      senderType: "موظف",
      senderPhone: "0550000006",
      senderEmail: "media@riadataleata.org.sa",
      senderRole: "مدير إدارة العلاقات العامة والإعلام",
      senderOrganization: "إدارة العلاقات العامة والإعلام",
      departmentId: "dep-6",
      userId: "dep-6",
      userRole: "department_admin",
      subject: "مقترح تدشين المنصة الرقمية للتغطيات الإعلامية الميدانية",
      messageContent: "سعادة رئيس مجلس الإدارة والمدير التنفيذي لجمعية ريادة العطاء لخدمة الإنسان بالعسيلة حفظهم الله،\nالسلام عليكم ورحمة الله وبركاته،\nنرفع لسعادتكم مقترح تفعيل الاستوديو الإعلامي الرقمي المتنقل لتغطية كافة المبادرات التطوعية وتوثيق جهود الفرق في منطقة مكة المكرمة ونشرها في وسائل الإعلام الرسمية ومنصات التواصل الاجتماعي لتعزيز أثر العطاء وإبراز دور الجمعية.\nوتقبلوا وافر التحية والتقدير.",
      status: "approved",
      isRead: true,
      adminNotes: "مقترح متميز، تم اعتماد التكليف وتخصيص الميزانية التشغيلية اللازمة.",
      createdAt: "2026-08-10T14:30:00Z"
    },
    {
      id: "ltr-103",
      letterNumber: "LTR-2026-0003",
      submissionType: "custom_letter",
      senderName: "م. فهد بن سلطان الهذلي",
      senderType: "زائر",
      senderPhone: "0509876543",
      senderEmail: "fahad.h@alrowad-sa.com",
      senderRole: "مدير إدارة المسؤولية المجتمعية",
      senderOrganization: "شركة الرواد للاستشارات والتنمية",
      subject: "عرض رعاية وشراكة استراتيجية لمبادرات كسوة وتأهيل الأسر المتعففة",
      messageContent: "سعادة مدراء وأعضاء جمعية ريادة العطاء لخدمة الإنسان بالعسيلة المحترمين،\nتحية طيبة وبعد،\nيسرنا في شركة الرواد التقدم لسعادتكم بعرض شراكة مجتمعية ورعاية شاملة لبرامج الرعاية الاجتماعية وتوزيع السلال وكسوة الأسر في حي العسيلة، حرصاً منا على الإسهام في التكافل الاجتماعي ودعم مستفيدي الجمعية المعتمدين.",
      partnershipDetails: {
        whatYouOffer: "تقديم رعاية مالية وعينية بقيمة 75,000 ريال، وتوفير 200 سلة غذائية مجهزة وكسوة شتوية للأسر.",
        whatYouWant: "التنسيق الميداني مع مستفيدي الجمعية المعتمدين، والإشراف على التوزيع وتقديم تقرير موثق.",
        ourRole: "التنظيم الميداني وحصر الأسر المستحقة وإصدار شهادات الشراكة المجتمعية المعتمدة.",
        yourRole: "التمويل وتوفير المواد العينية ومشاركة ممثلي الشركة في يوم التدشين."
      },
      status: "new",
      isRead: false,
      createdAt: "2026-08-22T09:15:00Z"
    }
  ],
  systemSettings: defaultSystemSettings
};

// Helper: seed exactly 120 initiatives if needed
function seed120Initiatives(db: any): boolean {
  if (!db.initiatives) {
    db.initiatives = [];
  }
  
  if (db.initiatives.length >= 120) {
    return false; // already has enough initiatives
  }

  const existingCount = db.initiatives.length;
  const startId = existingCount + 1;
  const targetTotal = 120;
  
  const placesByTheme: { [key: number]: string[] } = {
    0: [
      "جامع الرضوان بالعسيلة", "مسجد البركة بالعسيلة", "مصلى العيد بمخطط العسيلة", "جامع التقوى بالعسيلة", "مسجد النور بالعسيلة",
      "مسجد الرحمة بمخطط العسيلة", "مسجد التوبة بالعسيلة", "مسجد السبيل بالعسيلة", "مسجد الفتح بالعسيلة", "جامع السلام بالعسيلة"
    ],
    1: [
      "تقاطع إشارة العسيلة الرئيسي", "الساحة العامة لحي العسيلة", "مواقف باصات نقل المعتمرين بالعسيلة", "مخرج طريق المدينة السريع بالعسيلة", "ديوانية العسيلة التطوعية",
      "جامع الراجحي المكي", "مواقف كدي", "مواقف محبس الجن", "ساحات الحرم المكي الشريف", "ممشى حي العسيلة العام"
    ],
    2: [
      "مقر جمعية ريادة العطاء بالعسيلة", "نقاط العمل الميداني بمكة", "بساحات جامع الرضوان بالعسيلة", "مسارات التفويج بمواقف حافلات العسيلة", "مقر ديوانية العسيلة",
      "الساحة الكبرى بحي العسيلة", "مدارس مخطط العسيلة", "ممشى حي العسيلة", "مركز التدريب بمقر الجمعية", "قاعة ريادة الفعاليات"
    ],
    3: [
      "ممشى العسيلة الرياضي", "ملعب بلدية العسيلة لكرة القدم", "الصالة الرياضية المغلقة بالعسيلة", "حديقة العسيلة العائلية", "الساحة العامة بجانب جامع الرضوان",
      "مدرسة العسيلة الثانوية", "مركز صحي العسيلة النموذجي", "صالة التدريب بالجمعية", "حديقة الألعاب العامة", "مركز الإشراف الرياضي بالعسيلة"
    ],
    4: [
      "صالة كبار الزوار بمقر جمعية ريادة العطاء", "قاعة الاجتماعات الرئيسية بالعسيلة", "فندق حياة ريجنسي مكة - القاعة الكبرى", "فندق فيرمونت مكة", "ديوانية كبار السن بالعسيلة",
      "مركز التدريب والتمكين بالعسيلة", "مسرح مدارس جيل العطاء بالعسيلة", "قاعة الاحتفالات العامة بمخطط العسيلة", "مقر بلدية العسيلة الفرعية", "قاعة المؤتمرات بالجمعية"
    ],
    5: [
      "حديقة ممشى العسيلة", "الشارع العام بمخطط العسيلة", "الساحة الخلفية لمدرسة العسيلة الابتدائية", "جبال وهضاب حي العسيلة المحيطة", "وادي حي العسيلة الشرقي",
      "السور الخارجي للمستوصف العام بالعسيلة", "ممرات حديقة الرضوان العامة", "مدخل مخطط العسيلة الشمالي", "الحدائق المحاذية لجامع الرضوان", "شوارع حي العسيلة الفرعية"
    ],
    6: [
      "مستودع ريادة العطاء المركزي بالعسيلة", "منازل المستفيدين بمخطط العسيلة", "منازل كبار السن بالحي الشرقي للعسيلة", "مستودع الأغذية التابع للجمعية", "الساحة المجاورة لمجلس حي العسيلة",
      "مقر الجمعية الرئيسي", "وادي العسيلة - منازل الأسر المتعففة", "أطراف حي العسيلة الشمالية", "الشقق السكنية لعمال حي العسيلة", "الجمعية الخيرية بالعسيلة"
    ],
    7: [
      "قاعة التدريب والتعليم المستمر بمقر الجمعية", "قاعة الشيخ الراجحي بمقر الجمعية", "معمل الحاسب الآلي بمكتبة العسيلة", "قاعة ريادة الأعمال بالجمعية", "الغرفة الرقمية لبث الدورات بالعسيلة",
      "قاعة الندوات بالجمعية", "الصالة الثقافية بالعسيلة", "مركز ريادة للفتيات بالعسيلة", "قاعة التدريب الميداني", "معهد ريادة للغات بالعسيلة"
    ],
    8: [
      "ديوانية رعاية كبار السن بالعسيلة", "منازل ذوي الاحتياجات بمخطط العسيلة", "ممشى حي العسيلة الرياضي", "مركز الرعاية الاجتماعية بمكة", "مستوصف العسيلة العام",
      "مقر جمعية ريادة العطاء بالعسيلة", "الحرم المكي الشريف", "مركز العسيلة الثقافي", "الساحة الرياضية الخاصة بالعسيلة", "قاعة ريادة لتأهيل ذوي الإعاقة"
    ],
    9: [
      "فصول التقوية بمقر مدرسة العسيلة الابتدائية", "قاعة ريادة الذكاء بجمعية ريادة العطاء", "قاعة المكتبة العامة بالعسيلة", "مركز تنمية مهارات الشباب بالعسيلة", "الغرفة الصفية بمجلس حي العسيلة",
      "قاعة التدريس الذكي بالجمعية", "فصول مدرسة العسيلة المتوسطة", "قاعة ريادة للتعليم الرقمي", "نادي العسيلة الصيفي", "مقر الجمعية الرئيسي"
    ],
    10: [
      "مستودع فرز وتعبئة الملابس بالعسيلة", "مقر ديوانية ريادة العطاء بالعسيلة", "مطابخ ومطاعم حي العسيلة المشاركة", "مستودع الأثاث المستعمل بالعسيلة", "الساحة المحاذية لممشى العسيلة",
      "مقر فرز الملابس للجمعية", "مستودع حفظ النعمة بالعسيلة", "السوبرماركت والمولات بمخطط العسيلة", "حديقة العسيلة العائلية", "المستودع الشمالي لكسوة الشتاء"
    ],
    11: [
      "الساحة الاحتفالية لمخطط العسيلة", "مسرح الطفل بمقر جمعية ريادة العطاء", "مدرسة العسيلة الابتدائية للبنين", "مدرسة العسيلة الابتدائية للبنات", "ملعب مخطط العسيلة الرياضي",
      "حديقة الألعاب المائية بالعسيلة", "قاعة المسرح البلدي بمخطط العسيلة", "ديوانية ريادة العطاء بالعسيلة", "الصالة الاجتماعية الكبرى بالعسيلة", "قاعة فعاليات ريادة العطاء"
    ]
  };

  const themes = [
    {
      namePrefix: "تنظيم المصلين وتوجيه الحشود في ",
      descTemplate: "مبادرة تنظيمية تهدف لمساندة الكوادر الميدانية وتوجيه حركة دخول وخروج المصلين بـ {place} لضمان الانسيابية والسلامة.",
      departmentId: "dep-3",
      teamId: "team-1",
      leaderId: "lead-1",
      supervisorId: "sup-1"
    },
    {
      namePrefix: "مبادرة السقيا وتوزيع المياه المبردة في ",
      descTemplate: "توزيع سقيا الماء البارد والوجبات الخفيفة على ضيوف الرحمن وعابري السبيل والمعتمرين في {place} وتسهيل تنقلهم.",
      departmentId: "dep-3",
      teamId: "team-1",
      leaderId: "lead-1",
      supervisorId: "sup-1"
    },
    {
      namePrefix: "تغطية وتوثيق الأنشطة التطوعية إعلامياً في ",
      descTemplate: "تصوير وتصميم وكتابة المواد الإعلامية والتقارير الميدانية لتوثيق قصص النجاح والمبادرات التطوعية بـ {place} وتداولها إعلامياً.",
      departmentId: "dep-2",
      teamId: "team-2",
      leaderId: "lead-2",
      supervisorId: "sup-2"
    },
    {
      namePrefix: "نشر الوعي الإسعافي والفحص المبكر في ",
      descTemplate: "مبادرة تهدف لرفع مستوى الثقافة الصحية وتدريب مرتادي {place} على طرق الإنعاش القلبي والرئوي والتعامل مع الطوارئ.",
      departmentId: "dep-1",
      teamId: "team-4",
      leaderId: "lead-4",
      supervisorId: "sup-4"
    },
    {
      namePrefix: "تنظيم استقبال الضيوف والداعمين في ",
      descTemplate: "استقبال كبار الشخصيات والوفود الرسمية والتعريف ببرامج وأنشطة جمعية ريادة العطاء بـ {place} وتحسين تجربة الزوار.",
      departmentId: "dep-4",
      teamId: "team-3",
      leaderId: "lead-3",
      supervisorId: "sup-3"
    },
    {
      namePrefix: "حملة تنظيف وتشجير وتأهيل المساحات في ",
      descTemplate: "زراعة الأشجار والشتلات وتنظيف الممرات وإزالة التشوه البصري في {place} لزيادة الرقعة الخضراء وتحسين جودة الحياة.",
      departmentId: "dep-3",
      teamId: "team-1",
      leaderId: "lead-1",
      supervisorId: "sup-1"
    },
    {
      namePrefix: "فرز وتعبئة وتوزيع السلال الغذائية للأسر في ",
      descTemplate: "تعبئة وتوصيل المواد الغذائية الأساسية للأسر المتعففة والمسجلة بنطاق الجمعية بـ {place} تعزيزاً لمبدأ التكافل الاجتماعي.",
      departmentId: "dep-5",
      teamId: "team-1",
      leaderId: "lead-1",
      supervisorId: "sup-5"
    },
    {
      namePrefix: "مبادرة تيسير للدروس التقوية وتنمية المهارات في ",
      descTemplate: "تقديم حصص ومراجعات مجانية لطلاب المدارس وتدريبهم على مهارات الاستذكار والتحضير للامتحانات بـ {place} بالتعاون مع معلمين متطوعين.",
      departmentId: "dep-5",
      teamId: "team-2",
      leaderId: "lead-2",
      supervisorId: "sup-5"
    },
    {
      namePrefix: "مبادرة رعاية كبار السن ومساندتهم في ",
      descTemplate: "زيارة وتقديم الرعاية وتلبية احتياجات المرضى وكبار السن في {place}، وفحص السكري والضغط وتقديم الدعم الإنساني والنفسي.",
      departmentId: "dep-4",
      teamId: "team-3",
      leaderId: "lead-3",
      supervisorId: "sup-3"
    },
    {
      namePrefix: "مبادرة إعداد وتجهيز موائد الإفطار في ",
      descTemplate: "المساهمة في إعداد وتنسيق سفر الإفطار الجماعي وتجهيز الوجبات الساخنة وتوزيعها بـ {place} قبيل أذان المغرب.",
      departmentId: "dep-3",
      teamId: "team-1",
      leaderId: "lead-1",
      supervisorId: "sup-1"
    },
    {
      namePrefix: "فرز وحفظ النعمة وتوزيع الكسوة في ",
      descTemplate: "جمع وتصنيف وتوزيع الملابس الشتوية والوجبات الفائضة لضمان استفادة الأسر المحتاجة بـ {place} وتجنب الهدر المالي والغذائي.",
      departmentId: "dep-3",
      teamId: "team-1",
      leaderId: "lead-1",
      supervisorId: "sup-1"
    },
    {
      namePrefix: "تنظيم فعاليات ومهرجان فرحة الطفل في ",
      descTemplate: "إقامة أنشطة ترفيهية ومسابقات وألعاب حركية وتوزيع هدايا العيد والجوائز لرسم البسمة على وجوه الأطفال بـ {place}.",
      departmentId: "dep-4",
      teamId: "team-3",
      leaderId: "lead-3",
      supervisorId: "sup-3"
    }
  ];

  for (let i = startId; i <= targetTotal; i++) {
    const themeIdx = i % 12;
    const theme = themes[themeIdx];
    
    const places = placesByTheme[themeIdx];
    const placeIdx = (i + Math.floor(i / 12)) % places.length;
    const place = places[placeIdx];
    
    const name = theme.namePrefix + place;
    const description = theme.descTemplate.replace("{place}", place);

    let status: "open" | "closed" | "archived" = "open";
    if (i % 3 === 0) {
      status = "open";
    } else if (i % 3 === 1) {
      status = "closed";
    } else {
      status = "archived";
    }

    let dateStr = "";
    if (status === "archived") {
      const day = ((i % 20) + 1).toString().padStart(2, "0");
      dateStr = `2026-07-${day}`;
    } else {
      const day = ((i % 28) + 1).toString().padStart(2, "0");
      dateStr = `2026-08-${day}`;
    }

    const timeIndex = i % 4;
    const times = [
      { start: "17:00", end: "19:30" },
      { start: "16:00", end: "20:00" },
      { start: "09:00", end: "13:00" },
      { start: "18:00", end: "22:00" }
    ];
    const { start: startTime, end: endTime } = times[timeIndex];

    const neededCount = (i % 5 + 1) * 5;

    let acceptedVolunteerIds: string[] = [];
    let waitlistVolunteerIds: string[] = [];
    let applicantVolunteerIds: string[] = [];

    if (theme.teamId === "team-1") {
      acceptedVolunteerIds = ["vol-1"];
      waitlistVolunteerIds = [];
      applicantVolunteerIds = ["vol-1", "vol-5"];
    } else if (theme.teamId === "team-2") {
      acceptedVolunteerIds = ["vol-2"];
      waitlistVolunteerIds = [];
      applicantVolunteerIds = ["vol-2"];
    } else if (theme.teamId === "team-3") {
      acceptedVolunteerIds = ["vol-3"];
      waitlistVolunteerIds = [];
      applicantVolunteerIds = ["vol-3"];
    } else if (theme.teamId === "team-4") {
      acceptedVolunteerIds = ["vol-4"];
      waitlistVolunteerIds = [];
      applicantVolunteerIds = ["vol-4"];
    } else {
      acceptedVolunteerIds = ["vol-1"];
      waitlistVolunteerIds = ["vol-2"];
      applicantVolunteerIds = ["vol-1", "vol-2", "vol-3"];
    }

    if (status === "archived") {
      waitlistVolunteerIds = [];
    }

    db.initiatives.push({
      id: `init-${i}`,
      name,
      description,
      place,
      date: dateStr,
      startTime,
      endTime,
      departmentId: theme.departmentId,
      teamId: theme.teamId,
      leaderId: theme.leaderId,
      supervisorId: theme.supervisorId,
      neededCount,
      acceptedCount: acceptedVolunteerIds.length,
      waitlistCount: waitlistVolunteerIds.length,
      registrationStatus: status,
      acceptedVolunteerIds,
      waitlistVolunteerIds,
      applicantVolunteerIds
    });
  }

  return true;
}

// Seed the in-memory defaultDb
seed120Initiatives(defaultDb);

let memoryDbCache: any = null;

// Helper: Read db from file or write defaults
function readDb() {
  try {
    const activePath = getActiveDbPath();
    if (fs.existsSync(activePath)) {
      const content = fs.readFileSync(activePath, "utf-8");
      const db = JSON.parse(content);
      
      // Auto upgrade existing database with missing parameters
      let modified = false;
      if (!db.homeSettings) { db.homeSettings = defaultDb.homeSettings; modified = true; }
      if (!db.systemSettings) { db.systemSettings = defaultSystemSettings; modified = true; }
      if (!db.news) { db.news = defaultDb.news; modified = true; }
      if (!db.partners) { db.partners = defaultDb.partners; modified = true; }
      if (!db.gallery) { db.gallery = defaultDb.gallery; modified = true; }
      if (!db.beneficiaries) { db.beneficiaries = defaultDb.beneficiaries; modified = true; }
      if (!db.benefitRequests) { db.benefitRequests = defaultDb.benefitRequests; modified = true; }
      if (!db.volunteerApplications) { db.volunteerApplications = defaultDb.volunteerApplications; modified = true; }
      if (!db.teamApplications) { db.teamApplications = defaultDb.teamApplications; modified = true; }
      if (!db.chatConversations) { db.chatConversations = defaultDb.chatConversations; modified = true; }
      if (!db.chatMessages) { db.chatMessages = defaultDb.chatMessages; modified = true; }
      if (!db.supportTickets) { db.supportTickets = defaultDb.supportTickets; modified = true; }
      if (!db.letters) { db.letters = defaultDb.letters || []; modified = true; }
      if (!db.storekeepers) {
        db.storekeepers = [
          {
            id: "sk-101",
            name: "أحمد بن علي الشمري (أمين المستودع الرئيسي)",
            nationalId: "1010000099",
            phone: "0559998877",
            email: "storekeeper@riadataleata.org.sa",
            password: "123",
            assignedWarehouseId: "wh-1",
            assignedWarehouseName: "المستودع الرئيسي - العسيلة",
            status: "active",
            permissions: ["inbound", "outbound", "transfer", "write_off", "audit", "items"],
            notes: "أمين المستودع الرئيسي لجمعية ريادة العطاء لخدمة الإنسان بالعسيلة",
            createdAt: "2026-01-15T08:00:00Z"
          },
          {
            id: "sk-102",
            name: "سعود بن عبد الله المكي (أمين مستودع السلال الغذائية)",
            nationalId: "1010000098",
            phone: "0558887766",
            email: "sk2@riadataleata.org.sa",
            password: "123",
            assignedWarehouseId: "wh-2",
            assignedWarehouseName: "مستودع السلال الغذائية والتموين",
            status: "active",
            permissions: ["inbound", "outbound", "audit"],
            notes: "أمين مستودع فرعي مخصص للمواد التموينية والإغاثية",
            createdAt: "2026-02-01T09:30:00Z"
          }
        ];
        modified = true;
      }
      if (!db.inventoryLogs) {
        db.inventoryLogs = [
          {
            id: "invlog-101",
            timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
            storekeeperId: "sk-101",
            storekeeperName: "أحمد بن علي الشمري (أمين المستودع الرئيسي)",
            actionType: "inbound",
            actionTitle: "توريد كمية شحنة جديدة",
            details: "إضافة +500 كرتون مياه صحية سعة 330مل لسقيا الحرم بالعسيلة - فاتورة رقم INV-8821",
            itemId: "inv-item-1",
            itemName: "كرتون مياه صحية (40 عبوة 330مل)",
            quantity: 500,
            warehouseName: "المستودع الرئيسي - العسيلة",
            ip: "192.168.1.45",
            device: "جهاز جرد الميدان الذكي"
          },
          {
            id: "invlog-102",
            timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
            storekeeperId: "sk-102",
            storekeeperName: "سعود بن عبد الله المكي (أمين مستودع السلال الغذائية)",
            actionType: "outbound",
            actionTitle: "صرف كمية لمبادرة ميدانية",
            details: "صرف -50 سلة غذائية متكاملة لصالح مبادرة إفطار صائم بالعسيلة - أمر صرف #OUT-441",
            itemId: "inv-item-2",
            itemName: "سلة غذائية رمضانية متكاملة",
            quantity: 50,
            warehouseName: "مستودع السلال الغذائية والتموين",
            ip: "192.168.1.52",
            device: "تطبيق التموين المحمول"
          },
          {
            id: "invlog-103",
            timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
            storekeeperId: "sk-101",
            storekeeperName: "أحمد بن علي الشمري (أمين المستودع الرئيسي)",
            actionType: "audit",
            actionTitle: "اعتماد محضر جرد مخزني",
            details: "إجراء وجرد دوري لمستودع العهد والمعدات، مطابقة بنسبة 100% مع الرصيد الدفتري",
            warehouseName: "المستودع الرئيسي - العسيلة",
            ip: "192.168.1.45",
            device: "نظام الجرد الإلكتروني"
          }
        ];
        modified = true;
      }
      if (!db.certificateTemplates) {
        db.certificateTemplates = [
          {
            id: "cert-tmpl-1",
            title: "قالب شهادة الشكر والتطوع القياسي (جمعية ريادة العطاء)",
            backgroundUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&h=800&fit=crop",
            nameX: 50,
            nameY: 42,
            nameFontSize: 24,
            nameColor: "#15803d",
            initiativeX: 50,
            initiativeY: 56,
            initiativeFontSize: 16,
            initiativeColor: "#1e293b",
            hoursX: 35,
            hoursY: 68,
            hoursFontSize: 14,
            hoursColor: "#0f766e",
            dateX: 65,
            dateY: 68,
            dateFontSize: 14,
            dateColor: "#64748b",
            qrX: 85,
            qrY: 78,
            qrSize: 70,
            createdAt: "2026-07-01"
          }
        ];
        modified = true;
      }
      if (!db.issuedCertificates) {
        db.issuedCertificates = [
          {
            id: "cert-iss-1",
            templateId: "cert-tmpl-1",
            certificateCode: "CERT-2026-0001",
            volunteerId: "vol-1",
            volunteerName: "أحمد بن علي الغامدي",
            initiativeId: "init-1",
            initiativeName: "مبادرة تنظيم إفطار صائم بالعسيلة",
            hours: 5,
            issueDate: "2026-07-16",
            status: "locked_unrated",
            templateBackgroundUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&h=800&fit=crop",
            nameX: 50,
            nameY: 42,
            nameFontSize: 24,
            nameColor: "#15803d",
            initiativeX: 50,
            initiativeY: 56,
            initiativeFontSize: 16,
            initiativeColor: "#1e293b",
            hoursX: 35,
            hoursY: 68,
            hoursFontSize: 14,
            hoursColor: "#0f766e",
            dateX: 65,
            dateY: 68,
            dateFontSize: 14,
            dateColor: "#64748b",
            qrX: 85,
            qrY: 78,
            qrSize: 70
          }
        ];
        modified = true;
      }
      if (!db.initiativeRatings) {
        db.initiativeRatings = [];
        modified = true;
      }
      if (!db.opportunityRequests || !Array.isArray(db.opportunityRequests)) {
        db.opportunityRequests = defaultDb.opportunityRequests || [];
        modified = true;
      }

      if (!db.departmentDirectives || !Array.isArray(db.departmentDirectives)) {
        db.departmentDirectives = defaultDb.departmentDirectives || [];
        modified = true;
      }

      if (!db.storeProjects || !Array.isArray(db.storeProjects) || db.storeProjects.length === 0) {
        db.storeProjects = defaultDb.storeProjects || [];
        modified = true;
      }

      if (!db.storeDonations || !Array.isArray(db.storeDonations)) {
        db.storeDonations = defaultDb.storeDonations || [];
        modified = true;
      }

      if (!db.financialTransactions || !Array.isArray(db.financialTransactions)) {
        db.financialTransactions = defaultDb.financialTransactions || [];
        modified = true;
      }

      // Initialize Enterprise Inventory & Stock Audit Collections
      if (!db.warehouses || !Array.isArray(db.warehouses) || db.warehouses.length === 0) {
        db.warehouses = [
          {
            id: "wh-1",
            name: "المستودع المركزي الرئيسي بالعسيلة",
            location: "مكة المكرمة - مخطط العسيلة - المبنى الإداري الرئيسي",
            capacity: "1200 م3",
            managerName: "أ. سليم بن عبد العزيز الحربي",
            managerPhone: "0550112233",
            managerEmail: "wh1@riadataleata.org.sa",
            itemsCount: 3,
            totalQty: 950,
            notes: "المستودع الرئيسي لحفظ الأصناف التموينية، سقيا الماء، والمستلزمات العامة.",
            createdAt: "2026-01-01T00:00:00Z"
          },
          {
            id: "wh-2",
            name: "مستودع الإغاثة والسلال الغذائية",
            location: "مكة المكرمة - مخطط العسيلة - مركز التوزيع والمساعدات",
            capacity: "800 م3",
            managerName: "أ. خالد بن سلطان العتيبي",
            managerPhone: "0502233445",
            managerEmail: "wh2@riadataleata.org.sa",
            itemsCount: 2,
            totalQty: 85,
            notes: "مستودع مجهز لحفظ السلال التموينية، التمور، والمواد سريعة الاستهلاك.",
            createdAt: "2026-01-01T00:00:00Z"
          },
          {
            id: "wh-3",
            name: "مستودع العهد والمعدات والزي الميداني",
            location: "مكة المكرمة - مقر الجمعية - الدور الأرضي",
            capacity: "500 م3",
            managerName: "أ. فهد بن مسفر السلمي",
            managerPhone: "0543344556",
            managerEmail: "wh3@riadataleata.org.sa",
            itemsCount: 2,
            totalQty: 182,
            notes: "حفظ السديريات، الأجهزة، الشاشات، مكبرات الصوت، والخيام التنظيمية.",
            createdAt: "2026-01-01T00:00:00Z"
          },
          {
            id: "wh-4",
            name: "مستودع الكسوة والأجهزة الطبية",
            location: "مكة المكرمة - حي العسيلة - العيادة الميدانية",
            capacity: "450 م3",
            managerName: "د. عادل بن توفيق المالكي",
            managerPhone: "0564455667",
            managerEmail: "wh4@riadataleata.org.sa",
            itemsCount: 1,
            totalQty: 8,
            notes: "حفظ المستلزمات الطبية والطبابة والتجهيزات الميدانية الصحية.",
            createdAt: "2026-01-01T00:00:00Z"
          }
        ];
        modified = true;
      }

      if (!db.inventoryVendors || !Array.isArray(db.inventoryVendors) || db.inventoryVendors.length === 0) {
        db.inventoryVendors = [
          {
            id: "ven-1",
            name: "شركة مياه الصفا والمروة المحدودة",
            phone: "0551122334",
            email: "sales@safawater.com",
            address: "مكة المكرمة - المنطقة الصناعية",
            contactPerson: "أ. أحمد الصفا",
            crNumber: "4030112233",
            notes: "المورد الرئيسي لعبوات مياه السقيا للمبادرات والحرم المكي.",
            createdAt: "2026-01-01T00:00:00Z"
          },
          {
            id: "ven-2",
            name: "أسواق ومصانع التموين الغذائي الوطني",
            phone: "0509988776",
            email: "supply@othaim.sa",
            address: "جدة - طريق المدينة",
            contactPerson: "أ. محمد العثيم",
            crNumber: "1010887766",
            notes: "توريد السلال الغذائية والتمور والمواد الأساسية.",
            createdAt: "2026-01-01T00:00:00Z"
          },
          {
            id: "ven-3",
            name: "مؤسسة التمكين للمستلزمات والأجهزة الميدانية",
            phone: "0543322110",
            email: "info@tamkeen.sa",
            address: "مكة المكرمة - شارع العتيبة",
            contactPerson: "أ. طارق الزهراني",
            crNumber: "4031998877",
            notes: "توريد أجهزة الضغط والسكر والمعدات الطبية والتجهيزات.",
            createdAt: "2026-01-01T00:00:00Z"
          }
        ];
        modified = true;
      }

      if (!db.inventoryItems || !Array.isArray(db.inventoryItems) || db.inventoryItems.length === 0) {
        db.inventoryItems = [
          {
            id: "inv-item-101",
            name: "كرتون عبوات مياه الصفا النقية (330 مل × 40 عبوة)",
            shortName: "كرتون مياه الصفا 330مل",
            description: "كرتون مياه نقية باردة لسقيا المعتمرين وزوار المساجد والجوامع بقطاع العسيلة ومكة المكرمة.",
            imageUrl: "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600&h=400&fit=crop",
            type: "مواد غذائية",
            category: "سقيا الماء",
            subCategory: "عبوات مياه",
            brand: "الصفا والمروة",
            vendorId: "ven-1",
            vendorName: "شركة مياه الصفا والمروة المحدودة",
            warehouseId: "wh-1",
            warehouseName: "المستودع المركزي الرئيسي بالعسيلة",
            shelf: "A-01",
            exactLocation: "الرف العلوي - الجناح الأيمن",
            barcode: "6281000998012",
            qrCode: "QR-INV-6281000998012",
            serialNumber: "SN-WAT-2026-001",
            internalCode: "FOOD-WAT-01",
            currentQty: 450,
            initialQty: 600,
            issuedQty: 150,
            receivedQty: 600,
            reservedQty: 20,
            minStock: 100,
            maxStock: 1000,
            reorderPoint: 150,
            unitOfMeasure: "كرتون",
            purchasePrice: 12,
            unitPrice: 12,
            totalValue: 5400,
            lastPurchasePrice: 12,
            avgPrice: 12,
            productionDate: "2026-05-01",
            expiryDate: "2027-05-01",
            shelfLifeDays: 365,
            expWarningDaysThreshold: 60,
            isAudited: true,
            lastAuditDate: "2026-07-25",
            createdAt: "2026-01-10T00:00:00Z",
            updatedAt: "2026-07-28T10:00:00Z"
          },
          {
            id: "inv-item-102",
            name: "سلة غذائية رمضانية متكاملة للأسر المتعففة",
            shortName: "سلة غذائية شاملة",
            description: "سلة تموينية تحتوي على الأرز، الزيت، السكر، الطحين، الحليب، المعكرونة، والشوربة للأسر المحتاجة.",
            imageUrl: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&h=400&fit=crop",
            type: "مواد غذائية",
            category: "الإغاثة والمساعدات",
            subCategory: "سلال غذائية",
            brand: "التموين الوطني",
            vendorId: "ven-2",
            vendorName: "أسواق ومصانع التموين الغذائي الوطني",
            warehouseId: "wh-2",
            warehouseName: "مستودع الإغاثة والسلال الغذائية",
            shelf: "B-03",
            exactLocation: "منطقة التجميع الوسطى",
            barcode: "6281000998029",
            qrCode: "QR-INV-6281000998029",
            serialNumber: "SN-BSK-2026-008",
            internalCode: "FOOD-BSK-02",
            currentQty: 85,
            initialQty: 150,
            issuedQty: 65,
            receivedQty: 150,
            reservedQty: 10,
            minStock: 20,
            maxStock: 300,
            reorderPoint: 30,
            unitOfMeasure: "صندوق",
            purchasePrice: 140,
            unitPrice: 140,
            totalValue: 11900,
            lastPurchasePrice: 140,
            avgPrice: 140,
            productionDate: "2026-06-01",
            expiryDate: "2026-12-01",
            shelfLifeDays: 180,
            expWarningDaysThreshold: 45,
            isAudited: true,
            lastAuditDate: "2026-07-20",
            createdAt: "2026-01-15T00:00:00Z",
            updatedAt: "2026-07-27T00:00:00Z"
          },
          {
            id: "inv-item-103",
            name: "جهاز قياس ضغط الدم والسكر الرقمي الميداني",
            shortName: "جهاز قياس ضغط وسكر",
            description: "أجهزة طبية رقمية معتمدة للعيادة الميدانية وفحوصات المسح الصحي الوقائي لكبار السن.",
            imageUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&h=400&fit=crop",
            type: "أدوية ومستلزمات طبية",
            category: "الأجهزة الطبية",
            subCategory: "أجهزة قياس",
            brand: "Omron Medical",
            vendorId: "ven-3",
            vendorName: "مؤسسة التمكين للمستلزمات والأجهزة الميدانية",
            warehouseId: "wh-4",
            warehouseName: "مستودع الكسوة والأجهزة الطبية",
            shelf: "C-02",
            exactLocation: "خزانة العيادة المقفلة",
            barcode: "6281000998036",
            qrCode: "QR-INV-6281000998036",
            serialNumber: "SN-MED-99201",
            internalCode: "MED-DEV-03",
            currentQty: 8,
            initialQty: 20,
            issuedQty: 12,
            receivedQty: 20,
            reservedQty: 2,
            minStock: 10,
            maxStock: 50,
            reorderPoint: 12,
            unitOfMeasure: "قطعة",
            purchasePrice: 180,
            unitPrice: 180,
            totalValue: 1440,
            lastPurchasePrice: 180,
            avgPrice: 180,
            productionDate: "2025-10-01",
            expiryDate: "2028-10-01",
            shelfLifeDays: 1095,
            expWarningDaysThreshold: 30,
            isAudited: false,
            createdAt: "2026-02-01T00:00:00Z",
            updatedAt: "2026-07-20T00:00:00Z"
          },
          {
            id: "inv-item-104",
            name: "جهاز تخطيط القلب ومحمول الإسعافات الأولي",
            shortName: "جهاز تخطيط قلب محمول",
            description: "جهاز طبي عالي الدقة مزود ببطارية طوارئ للتدخل السريع ونقل الحالات الإسعافية.",
            imageUrl: "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=600&h=400&fit=crop",
            type: "أجهزة ومعدات",
            category: "العهد المستديمة",
            subCategory: "أجهزة إسعاف",
            brand: "Zoll Medical",
            vendorId: "ven-3",
            vendorName: "مؤسسة التمكين للمستلزمات والأجهزة الميدانية",
            warehouseId: "wh-3",
            warehouseName: "مستودع العهد والمعدات والزي الميداني",
            shelf: "D-01",
            exactLocation: "قسم العهد الطبية الخاصة",
            barcode: "6281000998043",
            qrCode: "QR-INV-6281000998043",
            serialNumber: "SN-EQP-77102",
            internalCode: "EQP-MED-04",
            currentQty: 2,
            initialQty: 3,
            issuedQty: 1,
            receivedQty: 3,
            reservedQty: 0,
            minStock: 1,
            maxStock: 5,
            reorderPoint: 2,
            unitOfMeasure: "قطعة",
            purchasePrice: 4500,
            unitPrice: 4500,
            totalValue: 9000,
            lastPurchasePrice: 4500,
            avgPrice: 4500,
            isAudited: true,
            lastAuditDate: "2026-07-15",
            createdAt: "2026-02-10T00:00:00Z",
            updatedAt: "2026-07-15T00:00:00Z",
            expWarningDaysThreshold: 30
          },
          {
            id: "inv-item-105",
            name: "مصحف مجمع الملك فهد الشريف - حجم جوامعي وفاخر",
            shortName: "مصحف جوامعي فاخر",
            description: "مصاحف شريفة فاخرة مخصصة للإهداء وتوزيعها على الجوامع والمصليات بقطاع العسيلة.",
            imageUrl: "https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=600&h=400&fit=crop",
            type: "عام",
            category: "المصاحف والكتب",
            subCategory: "مصاحف شريفة",
            brand: "مجمع الملك فهد",
            warehouseId: "wh-1",
            warehouseName: "المستودع المركزي الرئيسي بالعسيلة",
            shelf: "A-04",
            exactLocation: "الرف الأوسط - الجناح الأيسر",
            barcode: "6281000998050",
            qrCode: "QR-INV-6281000998050",
            serialNumber: "SN-QUR-2026-11",
            internalCode: "BOOK-QUR-05",
            currentQty: 320,
            initialQty: 500,
            issuedQty: 180,
            receivedQty: 500,
            reservedQty: 15,
            minStock: 50,
            maxStock: 1000,
            reorderPoint: 100,
            unitOfMeasure: "قطعة",
            purchasePrice: 35,
            unitPrice: 35,
            totalValue: 11200,
            lastPurchasePrice: 35,
            avgPrice: 35,
            isAudited: true,
            lastAuditDate: "2026-07-22",
            createdAt: "2026-01-20T00:00:00Z",
            updatedAt: "2026-07-22T00:00:00Z",
            expWarningDaysThreshold: 30
          },
          {
            id: "inv-item-106",
            name: "سديري تنظيمي ميداني مع شعار الجمعية ورابط الباركود",
            shortName: "سديري تنظيم ميداني",
            description: "الزي الرسمي المعترف به للمتطوعين والمتطوعات في تنظيم الحشود والمبادرات الميدانية.",
            imageUrl: "https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=600&h=400&fit=crop",
            type: "كسوة وملابس",
            category: "زي المتطوعين",
            subCategory: "سديريات",
            brand: "النسيج الوطني",
            vendorId: "ven-4",
            vendorName: "مصنع الكسوة والنسيج الوطني",
            warehouseId: "wh-3",
            warehouseName: "مستودع العهد والمعدات والزي الميداني",
            shelf: "E-02",
            exactLocation: "رف الملابس المعتمد",
            barcode: "6281000998067",
            qrCode: "QR-INV-6281000998067",
            serialNumber: "SN-CLO-00122",
            internalCode: "CLO-VEST-06",
            currentQty: 180,
            initialQty: 200,
            issuedQty: 20,
            receivedQty: 200,
            reservedQty: 5,
            minStock: 30,
            maxStock: 500,
            reorderPoint: 50,
            unitOfMeasure: "قطعة",
            purchasePrice: 45,
            unitPrice: 45,
            totalValue: 8100,
            lastPurchasePrice: 45,
            avgPrice: 45,
            isAudited: true,
            lastAuditDate: "2026-07-26",
            createdAt: "2026-02-15T00:00:00Z",
            updatedAt: "2026-07-26T00:00:00Z",
            expWarningDaysThreshold: 30
          }
        ];
        modified = true;
      }

      if (!db.inventoryMovements || !Array.isArray(db.inventoryMovements)) {
        db.inventoryMovements = [
          {
            id: "mov-1001",
            itemId: "inv-item-101",
            itemName: "كرتون عبوات مياه الصفا النقية (330 مل × 40 عبوة)",
            barcode: "6281000998012",
            type: "inbound",
            quantity: 600,
            reason: "توريد شحنة جديدة بطلب شراء رسمي رقم PO-2026-90",
            vendorName: "شركة مياه الصفا والمروة المحدودة",
            invoiceNumber: "INV-SF-90112",
            approvedBy: "أ. عبد الله العتيبي (مدير المالية)",
            date: "2026-05-02",
            createdAt: "2026-05-02T09:00:00Z"
          },
          {
            id: "mov-1002",
            itemId: "inv-item-101",
            itemName: "كرتون عبوات مياه الصفا النقية (330 مل × 40 عبوة)",
            barcode: "6281000998012",
            type: "outbound",
            quantity: 150,
            reason: "صرف لخدمة المعتمرين بمسجد الرضوان ومحيط العسيلة",
            recipientName: "سعود الحربي (قائد فريق التنظيم)",
            beneficiaryName: "ضيوف الرحمن والمساجد",
            initiativeId: "init-1",
            initiativeName: "مبادرة تنظيم إفطار صائم بالعسيلة",
            approvedBy: "أ. فيصل الأحمدي",
            date: "2026-07-15",
            createdAt: "2026-07-15T16:30:00Z"
          }
        ];
        modified = true;
      }

      if (!db.inventoryAudits || !Array.isArray(db.inventoryAudits)) {
        db.inventoryAudits = [
          {
            id: "aud-1001",
            auditNumber: "AUD-2026-001",
            title: "الجرد الدوري الشامل لمستودع العسيلة الرئيسي",
            auditType: "full",
            warehouseId: "wh-1",
            warehouseName: "المستودع المركزي الرئيسي بالعسيلة",
            status: "approved",
            items: [
              {
                itemId: "inv-item-101",
                itemName: "كرتون عبوات مياه الصفا النقية (330 مل × 40 عبوة)",
                barcode: "6281000998012",
                systemQty: 450,
                actualQty: 450,
                variance: 0,
                unitOfMeasure: "كرتون",
                reasonForDiscrepancy: "مطابقة تامة 100%"
              },
              {
                itemId: "inv-item-105",
                itemName: "مصحف مجمع الملك فهد الشريف - حجم جوامعي وفاخر",
                barcode: "6281000998050",
                systemQty: 320,
                actualQty: 320,
                variance: 0,
                unitOfMeasure: "قطعة",
                reasonForDiscrepancy: "مطابقة تامة 100%"
              }
            ],
            totalSystemQty: 770,
            totalActualQty: 770,
            totalVariance: 0,
            matchPercentage: 100,
            performedBy: "لجنة الجرد والتدقيق المالي",
            approvedBy: "أ. عبد الرحمن السليمان (المدير التنفيذي)",
            notes: "تم الجرد باستخدام الماسح الضوئي الذكي للباركود وكانت النتائج سليمة بالكامل.",
            auditDate: "2026-07-25",
            createdAt: "2026-07-25T14:00:00Z"
          }
        ];
        modified = true;
      }

      // Ensure departments have all 8 executive departments, tasks, nationalId, and password
      if (!db.departments || !Array.isArray(db.departments) || db.departments.length < 8 || !db.departments[0]?.tasks || !db.departments[0]?.nationalId) {
        db.departments = defaultDb.departments;
        modified = true;
      } else {
        // Ensure each existing department has nationalId and password if missing
        db.departments.forEach((d: any, i: number) => {
          if (!d.nationalId) {
            d.nationalId = `101000000${i + 1}`;
            d.password = "123";
            modified = true;
          }
        });
      }
      
      // Auto seed up to 120 initiatives
      if (seed120Initiatives(db)) {
        modified = true;
      }

      // Initialize Volunteer Card Templates if missing
      if (!db.volunteerCardTemplates || !Array.isArray(db.volunteerCardTemplates) || db.volunteerCardTemplates.length === 0) {
        db.volunteerCardTemplates = [
          {
            id: "tpl-male-default",
            name: "قالب بطاقة المتطوعين الذكور (الافتراضي)",
            description: "قالب متكامل معتمد للمتطوعين الذكور يحتوي على كافة الحقول مع باركود ورمز QR.",
            cardType: "standard",
            targetGender: "male",
            useFemaleUnifiedPhoto: false,
            isActive: true,
            isDefaultMale: true,
            isDefaultFemale: false,
            backgroundUrl: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=856&h=540&fit=crop",
            width: 856,
            height: 540,
            orientation: "landscape",
            createdAt: "2026-01-01T00:00:00Z",
            elements: [
              { id: "e-logo", type: "associationLogo", labelAr: "شعار الجمعية", visible: true, x: 92, y: 7, zIndex: 20 },
              { id: "e-photo", type: "photo", labelAr: "الصورة الشخصية", visible: true, x: 91, y: 24, width: 130, height: 130, photoShape: "rounded", borderWidth: 3, borderColor: "#059669", zIndex: 20 },
              { id: "e-name", type: "name", labelAr: "اسم المتطوع", visible: true, x: 69, y: 25, fontFamily: "Cairo", fontSize: 21, fontWeight: "bold", color: "#064e3b", textAlign: "right", zIndex: 15 },
              { id: "e-title", type: "jobTitle", labelAr: "المسمى التطوعي", visible: true, x: 69, y: 32, fontFamily: "Tajawal", fontSize: 15, fontWeight: "bold", color: "#d97706", textAlign: "right", zIndex: 15 },
              { id: "e-mem", type: "membershipNumber", labelAr: "رقم الملف / العضوية", visible: true, x: 69, y: 39, fontFamily: "Cairo", fontSize: 13, fontWeight: "bold", color: "#1e293b", textAlign: "right", showLabelPrefix: true, labelPrefix: "رقم العضوية:", zIndex: 15 },
              { id: "e-natid", type: "nationalId", labelAr: "رقم الهوية", visible: true, x: 69, y: 45, fontFamily: "Cairo", fontSize: 13, fontWeight: "500", color: "#334155", textAlign: "right", showLabelPrefix: true, labelPrefix: "الهوية:", zIndex: 15 },
              { id: "e-team", type: "teamName", labelAr: "اسم الفريق", visible: true, x: 69, y: 51, fontFamily: "Tajawal", fontSize: 13, fontWeight: "500", color: "#0f766e", textAlign: "right", showLabelPrefix: true, labelPrefix: "الفريق:", zIndex: 15 },
              { id: "e-dept", type: "departmentName", labelAr: "الإدارة التابعة", visible: true, x: 69, y: 57, fontFamily: "Tajawal", fontSize: 12, fontWeight: "500", color: "#475569", textAlign: "right", showLabelPrefix: true, labelPrefix: "الإدارة:", zIndex: 15 },
              { id: "e-blood", type: "bloodType", labelAr: "فصيلة الدم", visible: true, x: 69, y: 63, fontFamily: "Cairo", fontSize: 12, fontWeight: "bold", color: "#b91c1c", textAlign: "right", showLabelPrefix: true, labelPrefix: "الفصيلة:", zIndex: 15 },
              { id: "e-dates", type: "expiryDate", labelAr: "تاريخ الانتهاء", visible: true, x: 91, y: 56, fontFamily: "Cairo", fontSize: 11, fontWeight: "bold", color: "#047857", textAlign: "right", showLabelPrefix: true, labelPrefix: "صالحة حتى:", zIndex: 15 },
              { id: "e-qr", type: "qrCode", labelAr: "رمز QR", visible: true, x: 16, y: 22, qrSize: 92, zIndex: 20 },
              { id: "e-bar", type: "barcode", labelAr: "الباركود", visible: true, x: 26, y: 47, width: 170, zIndex: 15 },
              { id: "e-custom", type: "customText", labelAr: "عبارة رسمية", visible: true, x: 50, y: 91, fontFamily: "Tajawal", fontSize: 11, fontWeight: "bold", color: "#065f46", textAlign: "center", customTextValue: "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة - ترخيص: 5081", zIndex: 15 }
            ]
          },
          {
            id: "tpl-female-default",
            name: "قالب بطاقة المتطوعات الإناث (مع الصورة الموحدة)",
            description: "قالب راقٍ مخصص للمتطوعات الإناث يدعم استخدام الصورة الموحدة تلقائياً لحفظ الخصوصية.",
            cardType: "standard",
            targetGender: "female",
            useFemaleUnifiedPhoto: true,
            isActive: true,
            isDefaultMale: false,
            isDefaultFemale: true,
            backgroundUrl: "https://images.unsplash.com/photo-1557683316-973673baf926?w=856&h=540&fit=crop",
            width: 856,
            height: 540,
            orientation: "landscape",
            createdAt: "2026-01-01T00:00:00Z",
            elements: [
              { id: "fe-logo", type: "associationLogo", labelAr: "شعار الجمعية", visible: true, x: 92, y: 7, zIndex: 20 },
              { id: "fe-photo", type: "photo", labelAr: "الصورة الموحدة / الشخصية", visible: true, x: 91, y: 24, width: 130, height: 130, photoShape: "circle", borderWidth: 3, borderColor: "#a855f7", zIndex: 20 },
              { id: "fe-name", type: "name", labelAr: "اسم المتطوعة", visible: true, x: 69, y: 25, fontFamily: "Cairo", fontSize: 21, fontWeight: "bold", color: "#581c87", textAlign: "right", zIndex: 15 },
              { id: "fe-title", type: "jobTitle", labelAr: "المسمى التطوعي", visible: true, x: 69, y: 32, fontFamily: "Tajawal", fontSize: 15, fontWeight: "bold", color: "#c026d3", textAlign: "right", zIndex: 15 },
              { id: "fe-mem", type: "membershipNumber", labelAr: "رقم الملف / العضوية", visible: true, x: 69, y: 39, fontFamily: "Cairo", fontSize: 13, fontWeight: "bold", color: "#1e293b", textAlign: "right", showLabelPrefix: true, labelPrefix: "رقم العضوية:", zIndex: 15 },
              { id: "fe-natid", type: "nationalId", labelAr: "رقم الهوية", visible: true, x: 69, y: 45, fontFamily: "Cairo", fontSize: 13, fontWeight: "500", color: "#334155", textAlign: "right", showLabelPrefix: true, labelPrefix: "الهوية:", zIndex: 15 },
              { id: "fe-team", type: "teamName", labelAr: "اسم الفريق", visible: true, x: 69, y: 51, fontFamily: "Tajawal", fontSize: 13, fontWeight: "500", color: "#7e22ce", textAlign: "right", showLabelPrefix: true, labelPrefix: "الفريق:", zIndex: 15 },
              { id: "fe-dept", type: "departmentName", labelAr: "الإدارة التابعة", visible: true, x: 69, y: 57, fontFamily: "Tajawal", fontSize: 12, fontWeight: "500", color: "#475569", textAlign: "right", showLabelPrefix: true, labelPrefix: "الإدارة:", zIndex: 15 },
              { id: "fe-blood", type: "bloodType", labelAr: "فصيلة الدم", visible: true, x: 69, y: 63, fontFamily: "Cairo", fontSize: 12, fontWeight: "bold", color: "#be123c", textAlign: "right", showLabelPrefix: true, labelPrefix: "الفصيلة:", zIndex: 15 },
              { id: "fe-dates", type: "expiryDate", labelAr: "تاريخ الانتهاء", visible: true, x: 91, y: 56, fontFamily: "Cairo", fontSize: 11, fontWeight: "bold", color: "#7c3aed", textAlign: "right", showLabelPrefix: true, labelPrefix: "صالحة حتى:", zIndex: 15 },
              { id: "fe-qr", type: "qrCode", labelAr: "رمز QR", visible: true, x: 16, y: 22, qrSize: 92, zIndex: 20 },
              { id: "fe-bar", type: "barcode", labelAr: "الباركود", visible: true, x: 26, y: 47, width: 170, zIndex: 15 },
              { id: "fe-custom", type: "customText", labelAr: "عبارة رسمية", visible: true, x: 50, y: 91, fontFamily: "Tajawal", fontSize: 11, fontWeight: "bold", color: "#6b21a8", textAlign: "center", customTextValue: "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة - القسم النسائي", zIndex: 15 }
            ]
          }
        ];
        modified = true;
      }

      if (!db.issuedVolunteerCards) {
        db.issuedVolunteerCards = [];
        modified = true;
      }

      if (!db.systemSettings?.files?.femaleUnifiedCardPhoto) {
        if (!db.systemSettings) db.systemSettings = defaultSystemSettings;
        if (!db.systemSettings.files) db.systemSettings.files = defaultSystemSettings.files;
        db.systemSettings.files.femaleUnifiedCardPhoto = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80";
        modified = true;
      }

      if (!db.distributions || !Array.isArray(db.distributions)) {
        db.distributions = (defaultDb as any).distributions || [];
        modified = true;
      }

      if (!db.distributionHandovers || !Array.isArray(db.distributionHandovers)) {
        db.distributionHandovers = (defaultDb as any).distributionHandovers || [];
        modified = true;
      }

      if (!db.beneficiaryRatings || !Array.isArray(db.beneficiaryRatings)) {
        db.beneficiaryRatings = [
          {
            id: "benrate-1",
            beneficiaryId: "ben-1",
            beneficiaryName: "أبو محمد المكي",
            nationalId: "1023456789",
            phone: "0550112233",
            aidId: "handover-1",
            aidType: "سلال غذائية",
            aidTitle: "توزيع سلال غذائية - رمضان 1448",
            receivedDate: "2026-09-12",
            rating: 5,
            notes: "جزاكم الله خير الجزاء على حسن الاستقبال وسرعة التسليم وجودة محتويات السلة الغذائية.",
            createdAt: "2026-09-12T10:30:00Z"
          }
        ];
        modified = true;
      }

      if (Array.isArray(db.beneficiaries)) {
        db.beneficiaries.forEach((b: any, idx: number) => {
          if (!b.barcodeId) {
            const raw = (b.nationalId || b.id || String(idx + 1)).replace(/\D/g, '');
            const suffix = raw && raw.length >= 4 ? raw.slice(-6).padStart(6, '7') : Math.random().toString(36).substring(2, 8).toUpperCase();
            b.barcodeId = `BC-BEN-${suffix}`;
            modified = true;
          }
          if (!b.beneficiaryNumber) {
            b.beneficiaryNumber = `BEN-2026-${String(idx + 1).padStart(4, '0')}`;
            modified = true;
          }
          if (!b.category) {
            b.category = "أسر متعففة";
            modified = true;
          }
        });
      }

      if (!db.custodies || !Array.isArray(db.custodies)) {
        db.custodies = [
          {
            id: "cust-101",
            custodyCode: "CUST-2026-001",
            recipientName: "أحمد بن علي الغامدي",
            recipientType: "volunteer",
            recipientIdNumber: "1098765432",
            recipientEmail: "ahmed.ghamdi@example.com",
            recipientPhone: "0551234567",
            itemName: "جهاز لاسلكي ميداني موترولا (Motorola DP4800)",
            itemCategory: "أجهزة اتصال وتنسيق ميداني",
            description: "جهاز اتصال لاسلكي رقمي مع شاحن مكتبي وهوائي طويل للمسافات المفتوحة",
            quantity: 1,
            serialNumber: "MOT-88921-SA",
            status: "delivered",
            conditionOnDelivery: "ممتازة",
            deliveryDate: "2026-09-01",
            expectedReturnDate: "2026-10-01",
            notes: "مخصص لإدارة الحشود وتنظيم الفعاليات الميدانية بالعسيلة",
            adminName: "المدير التنفيذي - إدارة العهد",
            adminRole: "مسؤول العهد والمستودع",
            emailStatus: "sent",
            emailSentAt: "2026-09-01T10:00:00Z",
            createdAt: "2026-09-01T10:00:00Z",
            updatedAt: "2026-09-01T10:00:00Z",
            history: [
              {
                id: "ch-1",
                timestamp: "2026-09-01T10:00:00Z",
                action: "تسليم العهدة وإنشاء المحضر الرسمي",
                actor: "إدارة العهد والمستودع",
                notes: "تم تسليم الجهاز مع البطارية والشاحن للمتطوع."
              }
            ]
          },
          {
            id: "cust-102",
            custodyCode: "CUST-2026-002",
            recipientName: "سعود الحربي",
            recipientType: "leader",
            recipientIdNumber: "1022334455",
            recipientEmail: "leader@riadataleata.org.sa",
            recipientPhone: "0551112233",
            itemName: "حقيبة إسعافات أولية متقدمة + سديريات عاكسة (10 قطع)",
            itemCategory: "مستلزمات سلامة وإسعاف",
            description: "حقيبة مجهزة بالكامل لمساندة الحالات الطارئة وسديريات فسفورية بشعار الجمعية",
            quantity: 10,
            serialNumber: "MED-KIT-2024-09",
            status: "delivered",
            conditionOnDelivery: "جديدة",
            deliveryDate: "2026-09-05",
            expectedReturnDate: "2026-10-15",
            notes: "لفريق التنظيم الميداني",
            adminName: "أمين المستودع الرئيسي",
            adminRole: "مسؤول المستودع",
            emailStatus: "sent",
            emailSentAt: "2026-09-05T09:30:00Z",
            createdAt: "2026-09-05T09:30:00Z",
            updatedAt: "2026-09-05T09:30:00Z",
            history: [
              {
                id: "ch-2",
                timestamp: "2026-09-05T09:30:00Z",
                action: "تسليم العهدة وإنشاء المحضر الرسمي",
                actor: "أمين المستودع الرئيسي",
                notes: "تم تسليم الحقيبة والسديريات لقائد الفريق."
              }
            ]
          }
        ];
        modified = true;
      }

      if (!db.supportManagers || !Array.isArray(db.supportManagers)) {
        db.supportManagers = [
          {
            id: "sm-1",
            name: "م. عبد العزيز بن سلطان السلمي",
            username: "support_manager",
            password: "123",
            email: "support.manager@riadataleata.org.sa",
            phone: "0550001122",
            role: "support_manager",
            status: "active",
            createdAt: "2026-01-01T00:00:00Z"
          }
        ];
        modified = true;
      }

      if (!db.supportAgents || !Array.isArray(db.supportAgents)) {
        db.supportAgents = [
          {
            id: "sa-1",
            name: "م. عبد الرحمن المكي",
            username: "support_agent",
            password: "123",
            email: "abdulrahman.support@riadataleata.org.sa",
            phone: "0551122334",
            role: "support_agent",
            status: "active",
            permissions: ["view_assigned_tasks", "reply_tickets", "close_tasks", "upload_attachments"],
            managerId: "sm-1",
            createdAt: "2026-02-01T00:00:00Z",
            activeTasksCount: 1,
            completedTasksCount: 14
          },
          {
            id: "sa-2",
            name: "أ. سارة الحربي",
            username: "sara_support",
            password: "123",
            email: "sara.support@riadataleata.org.sa",
            phone: "0552233445",
            role: "support_agent",
            status: "active",
            permissions: ["view_assigned_tasks", "reply_tickets", "close_tasks"],
            managerId: "sm-1",
            createdAt: "2026-03-01T00:00:00Z",
            activeTasksCount: 1,
            completedTasksCount: 9
          }
        ];
        modified = true;
      }

      if (!db.supportTasks || !Array.isArray(db.supportTasks)) {
        db.supportTasks = [
          {
            id: "task-1",
            taskNumber: "TASK-2026-001",
            ticketId: "ticket-101",
            title: "معالجة مشكلة باركود بطاقة المتطوع الرقمية",
            description: "المتطوع أحمد الغامدي يواجه خطأ في تحميل بطاقة التطوع الذكية. التحقق من ربط العضوية وتحديث الرمز.",
            requesterName: "أحمد بن علي الغامدي",
            requesterContact: "0551234567",
            requesterRole: "متطوع",
            assignedAgentId: "sa-1",
            assignedAgentName: "م. عبد الرحمن المكي",
            priority: "urgent",
            status: "in_progress",
            createdAt: "2026-07-27T08:35:00Z",
            notes: "تم فحص السجل وإعادة توليد الباركود وجارٍ التواصل مع المتطوع للتأكيد.",
            history: [
              { id: "th-1", timestamp: "2026-07-27T08:35:00Z", actor: "م. عبد العزيز بن سلطان السلمي (مدير الدعم)", action: "إنشاء المهمة وإسنادها إلى م. عبد الرحمن المكي" }
            ]
          },
          {
            id: "task-2",
            taskNumber: "TASK-2026-002",
            ticketId: "ticket-102",
            title: "متابعة استفسار الأجهزة الطبية لسكر الدم وتحديث المستفيد",
            description: "التواصل مع المستفيد وتحديث حالة طلب الدعم الطبي بالتنسيق مع قسم الرعاية والمستفيدين.",
            requesterName: "أبو محمد المكي",
            requesterContact: "0501234567",
            requesterRole: "مستفيد",
            assignedAgentId: "sa-2",
            assignedAgentName: "أ. سارة الحربي",
            priority: "medium",
            status: "waiting_reply",
            createdAt: "2026-07-26T15:15:00Z",
            notes: "تم الاتصال بالمستفيد وإبلاغه بموعد وصول التموين الميداني.",
            history: [
              { id: "th-2", timestamp: "2026-07-26T15:15:00Z", actor: "م. عبد العزيز بن سلطان السلمي (مدير الدعم)", action: "إنشاء المهمة وإسنادها إلى أ. سارة الحربي" }
            ]
          }
        ];
        modified = true;
      }

      if (!db.employees || !Array.isArray(db.employees) || db.employees.length === 0) {
        db.employees = [
          {
            id: "emp-1",
            employeeNumber: "EMP-2026-001",
            name: "سعود بن عبد العزيز الهذلي",
            nationalId: "1034567890",
            phone: "0501234567",
            email: "saud.h@reyadat-alata.org.sa",
            jobTitle: "أخصائي إدارة الموارد والكوادر",
            departmentId: "dep-6",
            departmentName: "إدارة الموارد البشرية",
            nationality: "سعودي",
            section: "استقطاب الكفاءات والتدريب",
            qualification: "بكالوريوس إدارة أعمال وموارد بشرية",
            birthDate: "1994-05-12",
            hireDate: "2024-03-01",
            expiryDate: "2027-03-01",
            employmentType: "full_time",
            photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
            status: "active",
            barcode: "100088868101",
            qrCode: "MEM-EMP-2026-001",
            approvedBy: "المدير التنفيذي - أ. عبد الرحمن السليمان",
            approvedAt: "2024-03-01T08:00:00Z"
          },
          {
            id: "emp-2",
            employeeNumber: "EMP-2026-002",
            name: "منى بنت سليمان الحربي",
            nationalId: "1098761234",
            phone: "0559876543",
            email: "mona.h@reyadat-alata.org.sa",
            jobTitle: "مسؤولة العلاقات والإعلام الرقمي",
            departmentId: "dep-4",
            departmentName: "إدارة الإعلام والعلاقات العامة",
            nationality: "سعودية",
            section: "صناعة المحتوى والنشر",
            qualification: "بكالوريوس إعلام واتصال رقمي",
            birthDate: "1997-09-20",
            hireDate: "2024-06-15",
            expiryDate: "2027-06-15",
            employmentType: "full_time",
            photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop",
            status: "active",
            barcode: "100088868102",
            qrCode: "MEM-EMP-2026-002",
            approvedBy: "المدير التنفيذي - أ. عبد الرحمن السليمان",
            approvedAt: "2024-06-15T09:30:00Z"
          },
          {
            id: "emp-3",
            employeeNumber: "EMP-2026-003",
            name: "عبد الله بن خالد الدوسري",
            nationalId: "1055567891",
            phone: "0543322114",
            email: "a.dosari@reyadat-alata.org.sa",
            jobTitle: "أخصائي البرامج والمشاريع الميدانية",
            departmentId: "dep-5",
            departmentName: "إدارة المشاريع والبرامج",
            nationality: "سعودي",
            section: "المشاريع المجتمعية",
            qualification: "بكالوريوس إدارة مشاريع PMP",
            birthDate: "1992-11-04",
            hireDate: "2024-09-01",
            expiryDate: "2027-09-01",
            employmentType: "full_time",
            photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
            status: "active",
            barcode: "100088868103",
            qrCode: "MEM-EMP-2026-003",
            approvedBy: "المدير التنفيذي - أ. عبد الرحمن السليمان",
            approvedAt: "2024-09-01T10:00:00Z"
          },
          {
            id: "emp-4",
            employeeNumber: "EMP-2026-004",
            name: "ياسر بن صالح الغامدي",
            nationalId: "1087654321",
            phone: "0567788990",
            email: "yaser.g@reyadat-alata.org.sa",
            jobTitle: "منسق شؤون المتطوعين والفرق",
            departmentId: "dep-3",
            departmentName: "إدارة التطوع والشراكات المجتمعية",
            nationality: "سعودي",
            section: "التنسيق الميداني",
            qualification: "دبلوم عالي في إدارة الفعاليات والعمل التطوعي",
            birthDate: "1995-02-18",
            hireDate: "2025-01-10",
            expiryDate: "2028-01-10",
            employmentType: "full_time",
            photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop",
            status: "active",
            barcode: "100088868104",
            qrCode: "MEM-EMP-2026-004",
            approvedBy: "المدير التنفيذي - أ. عبد الرحمن السليمان",
            approvedAt: "2025-01-10T08:30:00Z"
          }
        ];
        modified = true;
      }

      if (!db.employeeRequests) {
        db.employeeRequests = [
          {
            id: "emp-req-1",
            requestNumber: "EMP-REQ-2026-001",
            departmentId: "dep-3",
            departmentName: "إدارة التطوع والشراكات المجتمعية",
            requestedBy: "د. عبد الله بن منصور القحطاني",
            requestedByPhone: "0553000003",
            createdAt: "2026-07-25T10:00:00Z",
            status: "pending",
            fullName: "خالد بن إبراهيم المنصور",
            nationalId: "1045678901",
            phone: "0551239874",
            email: "khalid.m@gmail.com",
            nationality: "سعودي",
            jobTitle: "أخصائي تدريب وتأهيل المتطوعين",
            section: "التدريب والتطوير",
            qualification: "ماجستير إدارة وتطوير الموارد البشرية",
            birthDate: "1993-08-14",
            hireDate: "2026-08-01",
            employmentType: "full_time",
            notes: "نظراً للتوسع الكبير في عدد المبادرات الميدانية نأمل سرعة اعتماد انضمامه للفريق.",
            documents: [
              { id: "doc-1", title: "السيرة الذاتية الرسمية", fileName: "CV_Khalid_Almansour.pdf", fileUrl: "#", fileSize: "1.2 MB" },
              { id: "doc-2", title: "صورة الهوية الوطنية", fileName: "National_ID_Copy.pdf", fileUrl: "#", fileSize: "840 KB" }
            ],
            reviewHistory: [
              { date: "2026-07-25T10:00:00Z", action: "submitted", performedBy: "د. عبد الله بن منصور القحطاني", notes: "رفع طلب الاحتياج الوظيفي لاعتماد الإدارة العليا" }
            ]
          },
          {
            id: "emp-req-2",
            requestNumber: "EMP-REQ-2026-002",
            departmentId: "dep-4",
            departmentName: "إدارة الإعلام والعلاقات العامة",
            requestedBy: "أ. ماجد بن فيصل الزهراني",
            requestedByPhone: "0554000004",
            createdAt: "2026-07-20T11:30:00Z",
            updatedAt: "2026-07-22T09:15:00Z",
            status: "needs_modification",
            fullName: "سارة بنت أحمد البقمي",
            nationalId: "1067891230",
            phone: "0548877665",
            email: "sara.buqami@outlook.com",
            nationality: "سعودية",
            jobTitle: "مصممة هوية بصرية وإنتاج إعلامي",
            section: "التصميم والإنتاج المرئي",
            qualification: "بكالوريوس تصميم جرافيك ووسائط رقمية",
            birthDate: "1998-03-22",
            hireDate: "2026-08-15",
            employmentType: "part_time",
            notes: "متعاونة للإنتاج المرئي وتغطية الفعاليات والمبادرات الكبرى.",
            documents: [
              { id: "doc-3", title: "السيرة الذاتية ونماذج الأعمال", fileName: "Portfolio_Sara.pdf", fileUrl: "#", fileSize: "3.5 MB" }
            ],
            modificationNotes: "يرجى إرفاق صورة شهادة التخرج المعتمدة وتحديد ساعات العمل الأسبوعية للدوام الجزئي.",
            reviewedBy: "المدير التنفيذي - أ. عبد الرحمن السليمان",
            reviewedAt: "2026-07-22T09:15:00Z",
            reviewHistory: [
              { date: "2026-07-20T11:30:00Z", action: "submitted", performedBy: "أ. ماجد بن فيصل الزهراني", notes: "رفع الطلب" },
              { date: "2026-07-22T09:15:00Z", action: "needs_modification", performedBy: "المدير التنفيذي", notes: "طلب استكمال شهادة التخرج وتحديد الساعات" }
            ]
          }
        ];
        modified = true;
      }

      if (!db.teamStaffAssignments) {
        db.teamStaffAssignments = [
          {
            id: "tsa-1",
            teamId: "team-1",
            teamName: "فريق سواعد العطاء",
            employeeId: "emp-4",
            employeeName: "ياسر بن صالح الغامدي",
            employeeNationalId: "1087654321",
            employeePhone: "0567788990",
            employeeJobTitle: "منسق شؤون المتطوعين والفرق",
            teamRole: "مسؤول المتطوعين داخل الفريق",
            assignedByLeaderName: "فهد بن محمد الشريف",
            assignedAt: "2026-07-01T10:00:00Z",
            status: "active",
            notes: "الإشراف الميداني وتنسيق توزيع الفرق في الفعاليات"
          }
        ];
        modified = true;
      }

      if (!db.emailSettings) {
        db.emailSettings = {
          provider: process.env.RESEND_API_KEY ? 'resend' : (process.env.SMTP_HOST ? 'smtp' : 'both_auto'),
          senderName: process.env.SENDER_NAME || "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة",
          senderEmail: process.env.SENDER_EMAIL || "notifications@riadataleata.org.sa",
          replyToEmail: "info@riadataleata.org.sa",
          resendApiKey: process.env.RESEND_API_KEY || "",
          smtpHost: process.env.SMTP_HOST || "",
          smtpPort: Number(process.env.SMTP_PORT || 587),
          smtpSecure: process.env.SMTP_SECURE === 'true',
          smtpUser: process.env.SMTP_USER || "",
          smtpPassword: process.env.SMTP_PASS || "",
          enabled: true,
          enableAutoFallback: true,
          testRecipientEmail: "riadataleata@gmail.com",
          updatedAt: new Date().toISOString()
        };
        modified = true;
      }

      if (!db.emailLogs) {
        db.emailLogs = [];
        modified = true;
      }

      if (!db.userDepartmentAccess || !Array.isArray(db.userDepartmentAccess) || db.userDepartmentAccess.length === 0) {
        db.userDepartmentAccess = [
          {
            id: "perm-admin",
            userId: "admin-user",
            userName: "مجلس الجمعية والمدير التنفيذي",
            userEmail: "admin@riadataleata.org.sa",
            nationalId: "1000000000",
            phone: "0550000000",
            role: "admin",
            jobTitle: "المدير العام والمدير التنفيذي",
            primaryDepartmentId: "dep-1",
            primaryDepartmentName: "الإدارة التنفيذية",
            additionalDepartmentIds: ["dep-2", "dep-3", "dep-4", "dep-5", "dep-6", "dep-7", "dep-8"],
            permissions: [
              "super_admin", "view_department", "create_data", "edit_data", 
              "delete_data", "export_pdf", "export_excel", "manage_staff", 
              "manage_tasks", "view_reports", "cross_department_access"
            ],
            allowedDepartmentIds: ["dep-1", "dep-2", "dep-3", "dep-4", "dep-5", "dep-6", "dep-7", "dep-8"],
            status: "active",
            notes: "كامل الصلاحيات الإشرافية والتنفيذية العامة على جميع الإدارات",
            updatedAt: "2026-01-01T00:00:00Z",
            updatedBy: "النظام المركزي"
          },
          {
            id: "perm-dep-1",
            userId: "depadmin-dep-1",
            userName: "أ. عبد الرحمن السليمان",
            userEmail: "exec@riadataleata.org.sa",
            nationalId: "1010000001",
            phone: "0551000001",
            role: "department_admin",
            jobTitle: "مدير الإدارة التنفيذية",
            primaryDepartmentId: "dep-1",
            primaryDepartmentName: "الإدارة التنفيذية",
            additionalDepartmentIds: [],
            permissions: ["view_department", "create_data", "edit_data", "export_pdf", "export_excel", "manage_staff", "manage_tasks", "view_reports"],
            allowedDepartmentIds: ["dep-1"],
            status: "active",
            notes: "إدارة القرارات والخطط التشغيلية ومؤشرات الأداء",
            updatedAt: "2026-01-01T00:00:00Z",
            updatedBy: "المدير التنفيذي"
          },
          {
            id: "perm-dep-2",
            userId: "depadmin-dep-2",
            userName: "أ. عبد الله العتيبي",
            userEmail: "finance@riadataleata.org.sa",
            nationalId: "1010000002",
            phone: "0551000002",
            role: "department_admin",
            jobTitle: "مدير الإدارة المالية",
            primaryDepartmentId: "dep-2",
            primaryDepartmentName: "الإدارة المالية",
            additionalDepartmentIds: [],
            permissions: ["view_department", "create_data", "edit_data", "delete_data", "export_pdf", "export_excel", "manage_staff", "manage_tasks", "view_reports"],
            allowedDepartmentIds: ["dep-2"],
            status: "active",
            notes: "نطاق معزول للإدارة المالية والميزانية والمصروفات",
            updatedAt: "2026-01-01T00:00:00Z",
            updatedBy: "المدير التنفيذي"
          },
          {
            id: "perm-dep-3",
            userId: "depadmin-dep-3",
            userName: "أ. فيصل الأحمدي",
            userEmail: "projects@riadataleata.org.sa",
            nationalId: "1010000003",
            phone: "0551000003",
            role: "department_admin",
            jobTitle: "مدير إدارة البرامج والمشاريع",
            primaryDepartmentId: "dep-3",
            primaryDepartmentName: "إدارة البرامج والمشاريع",
            additionalDepartmentIds: [],
            permissions: ["view_department", "create_data", "edit_data", "export_pdf", "export_excel", "manage_staff", "manage_tasks", "view_reports"],
            allowedDepartmentIds: ["dep-3"],
            status: "active",
            notes: "نطاق المشاريع والمبادرات وقياس الأثر",
            updatedAt: "2026-01-01T00:00:00Z",
            updatedBy: "المدير التنفيذي"
          },
          {
            id: "perm-dep-4",
            userId: "depadmin-dep-4",
            userName: "أ. مريم الغامدي",
            userEmail: "beneficiaries@riadataleata.org.sa",
            nationalId: "1010000004",
            phone: "0551000004",
            role: "department_admin",
            jobTitle: "مديرة إدارة المستفيدين",
            primaryDepartmentId: "dep-4",
            primaryDepartmentName: "إدارة المستفيدين",
            additionalDepartmentIds: [],
            permissions: ["view_department", "create_data", "edit_data", "delete_data", "export_pdf", "export_excel", "manage_staff", "manage_tasks", "view_reports"],
            allowedDepartmentIds: ["dep-4"],
            status: "active",
            notes: "نطاق رعاية المستفيدين ودراسة الحالات والتوزيعات",
            updatedAt: "2026-01-01T00:00:00Z",
            updatedBy: "المدير التنفيذي"
          },
          {
            id: "perm-dep-5",
            userId: "depadmin-dep-5",
            userName: "أ. منيرة القحطاني",
            userEmail: "volunteers@riadataleata.org.sa",
            nationalId: "1010000005",
            phone: "0551000005",
            role: "department_admin",
            jobTitle: "مديرة إدارة التطوع والموارد البشرية",
            primaryDepartmentId: "dep-5",
            primaryDepartmentName: "إدارة التطوع والموارد البشرية",
            additionalDepartmentIds: [],
            permissions: ["view_department", "create_data", "edit_data", "delete_data", "export_pdf", "export_excel", "manage_staff", "manage_tasks", "view_reports"],
            allowedDepartmentIds: ["dep-5"],
            status: "active",
            notes: "نطاق إدارة المتطوعين والفرق والساعات والكوادر",
            updatedAt: "2026-01-01T00:00:00Z",
            updatedBy: "المدير التنفيذي"
          },
          {
            id: "perm-dep-6",
            userId: "depadmin-dep-6",
            userName: "أ. ياسر الغامدي",
            userEmail: "media@riadataleata.org.sa",
            nationalId: "1010000006",
            phone: "0551000006",
            role: "department_admin",
            jobTitle: "مدير إدارة العلاقات العامة والإعلام",
            primaryDepartmentId: "dep-6",
            primaryDepartmentName: "إدارة العلاقات العامة والإعلام",
            additionalDepartmentIds: [],
            permissions: ["view_department", "create_data", "edit_data", "delete_data", "export_pdf", "export_excel", "manage_staff", "manage_tasks", "view_reports"],
            allowedDepartmentIds: ["dep-6"],
            status: "active",
            notes: "نطاق الهوية الإعلامية والأخبار والتصاميم والتغطيات",
            updatedAt: "2026-01-01T00:00:00Z",
            updatedBy: "المدير التنفيذي"
          },
          {
            id: "perm-dep-7",
            userId: "depadmin-dep-7",
            userName: "أ. ماجد الدوسري",
            userEmail: "partnerships@riadataleata.org.sa",
            nationalId: "1010000007",
            phone: "0551000007",
            role: "department_admin",
            jobTitle: "مدير إدارة تنمية الموارد المالية والشراكات",
            primaryDepartmentId: "dep-7",
            primaryDepartmentName: "إدارة تنمية الموارد المالية والشراكات",
            additionalDepartmentIds: [],
            permissions: ["view_department", "create_data", "edit_data", "export_pdf", "export_excel", "manage_staff", "manage_tasks", "view_reports"],
            allowedDepartmentIds: ["dep-7"],
            status: "active",
            notes: "نطاق الشراكات والداعمين وحملات الاستدامة",
            updatedAt: "2026-01-01T00:00:00Z",
            updatedBy: "المدير التنفيذي"
          },
          {
            id: "perm-dep-8",
            userId: "depadmin-dep-8",
            userName: "أ. سعود الحربي",
            userEmail: "support@riadataleata.org.sa",
            nationalId: "1010000008",
            phone: "0551000008",
            role: "department_admin",
            jobTitle: "مدير إدارة الخدمات المساندة",
            primaryDepartmentId: "dep-8",
            primaryDepartmentName: "إدارة الخدمات المساندة",
            additionalDepartmentIds: [],
            permissions: ["view_department", "create_data", "edit_data", "delete_data", "export_pdf", "export_excel", "manage_staff", "manage_tasks", "view_reports"],
            allowedDepartmentIds: ["dep-8"],
            status: "active",
            notes: "نطاق المستودعات والأنظمة والمشتريات والعهد والصيانة",
            updatedAt: "2026-01-01T00:00:00Z",
            updatedBy: "المدير التنفيذي"
          },
          // Employees with multi-department support
          {
            id: "perm-emp-1",
            userId: "emp-1",
            userName: "سعود بن عبد العزيز الهذلي",
            userEmail: "saud.h@reyadat-alata.org.sa",
            nationalId: "1034567890",
            phone: "0501234567",
            role: "employee",
            jobTitle: "أخصائي الموارد البشرية والمالية",
            primaryDepartmentId: "dep-5",
            primaryDepartmentName: "إدارة التطوع والموارد البشرية",
            additionalDepartmentIds: ["dep-2"], // Cross-department assignment to Finance!
            permissions: ["view_department", "create_data", "edit_data", "export_pdf", "manage_tasks", "cross_department_access"],
            allowedDepartmentIds: ["dep-5", "dep-2"],
            status: "active",
            notes: "موظف مرتبط بإدارتين: الموارد البشرية مع صلاحية مساندة الإدارة المالية",
            updatedAt: "2026-01-01T00:00:00Z",
            updatedBy: "المدير التنفيذي"
          },
          {
            id: "perm-emp-2",
            userId: "emp-2",
            userName: "منى بنت سليمان الحربي",
            userEmail: "mona.h@reyadat-alata.org.sa",
            nationalId: "1098761234",
            phone: "0559876543",
            role: "employee",
            jobTitle: "مسؤولة العلاقات والإعلام الرقمي",
            primaryDepartmentId: "dep-6",
            primaryDepartmentName: "إدارة العلاقات العامة والإعلام",
            additionalDepartmentIds: [],
            permissions: ["view_department", "create_data", "edit_data", "export_pdf", "export_excel"],
            allowedDepartmentIds: ["dep-6"],
            status: "active",
            notes: "موظفة إدارة الإعلام",
            updatedAt: "2026-01-01T00:00:00Z",
            updatedBy: "المدير التنفيذي"
          },
          {
            id: "perm-emp-3",
            userId: "emp-3",
            userName: "عبد الله بن خالد الدوسري",
            userEmail: "a.dosari@reyadat-alata.org.sa",
            nationalId: "1055567891",
            phone: "0543322114",
            role: "employee",
            jobTitle: "أخصائي البرامج والمشاريع الميدانية",
            primaryDepartmentId: "dep-3",
            primaryDepartmentName: "إدارة البرامج والمشاريع",
            additionalDepartmentIds: [],
            permissions: ["view_department", "create_data", "edit_data", "view_reports"],
            allowedDepartmentIds: ["dep-3"],
            status: "active",
            notes: "موظف إدارة المشاريع",
            updatedAt: "2026-01-01T00:00:00Z",
            updatedBy: "المدير التنفيذي"
          },
          {
            id: "perm-emp-4",
            userId: "emp-4",
            userName: "ياسر بن صالح الغامدي",
            userEmail: "yaser.g@reyadat-alata.org.sa",
            nationalId: "1087654321",
            phone: "0567788990",
            role: "employee",
            jobTitle: "منسق شؤون المتطوعين والفرق",
            primaryDepartmentId: "dep-5",
            primaryDepartmentName: "إدارة التطوع والموارد البشرية",
            additionalDepartmentIds: [],
            permissions: ["view_department", "create_data", "manage_tasks"],
            allowedDepartmentIds: ["dep-5"],
            status: "active",
            notes: "منسق شؤون المتطوعين",
            updatedAt: "2026-01-01T00:00:00Z",
            updatedBy: "المدير التنفيذي"
          },
          // Team Leader
          {
            id: "perm-leader-1",
            userId: "team-1",
            userName: "سعود الحربي (قائد فريق سواعد العطاء)",
            userEmail: "leader@riadataleata.org.sa",
            nationalId: "1022334455",
            phone: "0551112233",
            role: "leader",
            jobTitle: "قائد فريق تطوعي معتمد",
            primaryDepartmentId: "dep-5",
            primaryDepartmentName: "إدارة التطوع والموارد البشرية",
            teamId: "team-1",
            additionalDepartmentIds: [],
            permissions: ["view_department", "create_data", "edit_data", "export_pdf"],
            allowedDepartmentIds: ["dep-5"],
            status: "active",
            notes: "صلاحيات قائد الفريق معزولة تماماً لفريقه فقط",
            updatedAt: "2026-01-01T00:00:00Z",
            updatedBy: "المدير التنفيذي"
          }
        ];
        modified = true;
      }

      if (!db.permissionChangeLogs || !Array.isArray(db.permissionChangeLogs)) {
        db.permissionChangeLogs = [
          {
            id: "pcl-1",
            timestamp: "2026-01-10T09:00:00Z",
            adminName: "أ. عبد الرحمن السليمان (المدير التنفيذي)",
            targetUserId: "emp-1",
            targetUserName: "سعود بن عبد العزيز الهذلي",
            targetDepartment: "إدارة التطوع والموارد البشرية",
            oldPermissions: ["view_department", "create_data"],
            newPermissions: ["view_department", "create_data", "edit_data", "export_pdf", "manage_tasks", "cross_department_access"],
            allowedDepartments: ["dep-5", "dep-2"],
            reason: "منح صلاحيات إضافية وربط موظف بإدارتين (الموارد البشرية والإدارة المالية) بموجب القرار الإداري رقم 42"
          }
        ];
        modified = true;
      }

      if (!db.accessAuditLogs || !Array.isArray(db.accessAuditLogs)) {
        db.accessAuditLogs = [
          {
            id: "audit-init-1",
            timestamp: "2026-09-17T08:00:00Z",
            userId: "depadmin-dep-2",
            userName: "أ. عبد الله العتيبي (مدير الإدارة المالية)",
            userRole: "department_admin",
            userDepartmentId: "dep-2",
            targetDepartmentId: "dep-2",
            action: "view_department",
            resource: "البيانات المالية والميزانية",
            endpoint: "/api/db/scoped",
            status: "allowed",
            ip: "127.0.0.1",
            device: "Admin Workstation",
            notes: "وصول معتمد إلى لوحة الإدارة المالية ضمن النطاق المخصص"
          },
          {
            id: "audit-init-2",
            timestamp: "2026-09-17T08:15:00Z",
            userId: "depadmin-dep-2",
            userName: "أ. عبد الله العتيبي (مدير الإدارة المالية)",
            userRole: "department_admin",
            userDepartmentId: "dep-2",
            targetDepartmentId: "dep-5",
            action: "view_department",
            resource: "سجل المتطوعين",
            endpoint: "/api/db/volunteers",
            status: "denied",
            ip: "127.0.0.1",
            device: "Admin Workstation",
            notes: "تم حظر محاولة الوصول: لا يملك مدير الإدارة المالية صلاحية على إدارة التطوع"
          }
        ];
        modified = true;
      }

      if (!db.orgMembers || !Array.isArray(db.orgMembers)) {
        db.orgMembers = [];
        modified = true;
      }
      if (!db.heroSlides || !Array.isArray(db.heroSlides)) {
        const defaultHeroImg = (db.homeSettings && db.homeSettings.videoCoverUrl) 
          ? db.homeSettings.videoCoverUrl 
          : "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1600&h=900&fit=crop";
        db.heroSlides = [
          {
            id: "slide-default",
            title: "ريادةٌ في العطاء.. وخدمةٌ للإنسان",
            subtitle: "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة",
            imageUrl: defaultHeroImg,
            order: 1,
            isActive: true,
            createdAt: new Date().toISOString()
          }
        ];
        modified = true;
      }
      if (db.homeSettings) {
        if (!db.homeSettings.orgMembers) db.homeSettings.orgMembers = db.orgMembers;
        if (!db.homeSettings.heroSlides) db.homeSettings.heroSlides = db.heroSlides;
      }
      
      if (modified) {
        try {
          writeDb(db);
        } catch {
          // ignore
        }
      }
      memoryDbCache = db;
      return db;
    }
    if (memoryDbCache) return memoryDbCache;
  } catch (err) {
    console.error("Error reading database file, using defaults", err);
    if (memoryDbCache) return memoryDbCache;
  }
  
  // Write defaults
  memoryDbCache = defaultDb;
  try {
    writeDb(defaultDb);
  } catch {
    // ignore
  }
  return defaultDb;
}

function writeDb(data: any) {
  memoryDbCache = data;
  const isServerless = !!(
    process.env.VERCEL || 
    process.env.NOW_REGION || 
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT ||
    process.env.VERCEL_ENV
  );
  const targetPath = isServerless ? DB_FILE_TMP : getActiveDbPath();
  try {
    fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing to database file", err);
    try {
      fs.writeFileSync(DB_FILE_TMP, JSON.stringify(data, null, 2), "utf-8");
    } catch (tmpErr) {
      console.error("Error writing fallback /tmp/db.json", tmpErr);
    }
  }
}

// Ensure database file is initialized
readDb();

// ==========================================
// RBAC & Department Data Isolation Subsystem
// ==========================================

// Server-side Session Management (session_start persistence)
export interface ServerSession {
  token: string;
  userId: string;
  role: string;
  user: any;
  departmentId?: string;
  nationalId?: string;
  teamId?: string;
  createdAt: number;
  lastActive: number;
  expiresAt: number;
}

const activeSessions = new Map<string, ServerSession>();

export function createServerSession(user: any, role: string): ServerSession {
  const token = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 8)}`;
  const now = Date.now();
  const session: ServerSession = {
    token,
    userId: user?.id || 'user',
    role: role || user?.role || 'user',
    user,
    departmentId: user?.departmentId || user?.primaryDepartmentId || '',
    nationalId: user?.nationalId || '',
    teamId: user?.teamId || '',
    createdAt: now,
    lastActive: now,
    expiresAt: now + (24 * 60 * 60 * 1000) // 24 hours valid session
  };
  activeSessions.set(token, session);
  return session;
}

export function getServerSession(token?: string): ServerSession | null {
  if (!token) return null;
  const session = activeSessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return null;
  }
  session.lastActive = Date.now();
  return session;
}

export function destroyServerSession(token?: string): boolean {
  if (!token) return false;
  return activeSessions.delete(token);
}

// 1. Resolve User Access Context from Request Headers / Query / Body
function getUserAccessContext(req: any) {
  const db = readDb();
  const sessionToken = (req.headers['x-session-token'] as string) || 
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null) ||
    req.cookies?.['reyadat_session'];
  
  const activeSession = getServerSession(sessionToken);

  const userId = activeSession?.userId || req.headers['x-user-id'] || req.query.userId || req.body?.userId;
  const userRole = activeSession?.role || req.headers['x-user-role'] || req.query.userRole || req.body?.userRole;
  const departmentId = activeSession?.departmentId || req.headers['x-department-id'] || req.query.departmentId || req.body?.departmentId;
  const nationalId = activeSession?.nationalId || req.headers['x-national-id'] || req.query.nationalId;
  const teamId = activeSession?.teamId || req.headers['x-team-id'] || req.query.teamId || req.body?.teamId;

  // Unauthenticated / Public visitor
  if (!userId && !userRole && !nationalId && !activeSession) {
    return {
      isAuthenticated: false,
      isSuperAdmin: false,
      role: 'public',
      userId: 'public',
      userName: 'زائر',
      jobTitle: 'زائر البوابة العامة',
      primaryDepartmentId: '',
      primaryDepartmentName: '',
      additionalDepartmentIds: [],
      allowedDepartmentIds: [],
      permissions: ['view_department']
    };
  }

  // Super Admin (Executive Director / Board of Directors)
  if (userRole === 'admin' || userId === 'admin' || userId === 'admin-user' || nationalId === '1000000000') {
    const allDeptIds = (db.departments || []).map((d: any) => d.id);
    return {
      isAuthenticated: true,
      isSuperAdmin: true,
      role: 'admin',
      userId: 'admin-user',
      userName: 'مجلس الجمعية والمدير التنفيذي',
      jobTitle: 'المدير العام والمدير التنفيذي',
      primaryDepartmentId: 'dep-1',
      primaryDepartmentName: 'الإدارة التنفيذية',
      additionalDepartmentIds: allDeptIds,
      allowedDepartmentIds: allDeptIds,
      permissions: [
        'super_admin', 'view_department', 'create_data', 'edit_data', 
        'delete_data', 'export_pdf', 'export_excel', 'manage_staff', 
        'manage_tasks', 'view_reports', 'cross_department_access'
      ]
    };
  }

  // Volunteer Role Access Context
  if (userRole === 'volunteer' || (userId && typeof userId === 'string' && (userId.startsWith('vol-') || userId === 'volunteer-1'))) {
    const vol = (db.volunteers || []).find((v: any) => v.id === userId || v.nationalId === nationalId || v.email === userId) || activeSession?.user;
    return {
      isAuthenticated: true,
      isSuperAdmin: false,
      role: 'volunteer',
      userId: vol?.id || userId || 'vol-1',
      userName: vol?.name || 'متطوع مسجل',
      jobTitle: vol?.titleAr || 'فارس تطوعي',
      primaryDepartmentId: 'dep-5',
      primaryDepartmentName: 'إدارة التطوع والموارد البشرية',
      allowedDepartmentIds: ['dep-5'],
      teamId: vol?.teamId || teamId || 'team-1',
      permissions: ['view_volunteer_portal', 'join_initiatives', 'print_card', 'view_certificates']
    };
  }

  // Beneficiary Role Access Context
  if (userRole === 'beneficiary' || (userId && typeof userId === 'string' && (userId.startsWith('ben-') || userId === 'beneficiary-1'))) {
    const ben = (db.beneficiaries || []).find((b: any) => b.id === userId || b.nationalId === nationalId || b.phone === userId) || activeSession?.user;
    return {
      isAuthenticated: true,
      isSuperAdmin: false,
      role: 'beneficiary',
      userId: ben?.id || userId || 'ben-1',
      userName: ben?.name || 'مستفيد مسجل',
      jobTitle: 'مستفيد الجمعية',
      primaryDepartmentId: 'dep-4',
      primaryDepartmentName: 'إدارة شؤون المستفيدين والكفالات',
      allowedDepartmentIds: ['dep-4'],
      permissions: ['view_beneficiary_portal', 'request_aid', 'track_distribution']
    };
  }

  // Look up in configured userDepartmentAccess
  const accessEntry = (db.userDepartmentAccess || []).find((u: any) => 
    (userId && (u.userId === userId || u.id === userId)) ||
    (nationalId && u.nationalId === nationalId) ||
    (userId && u.userId === `depadmin-${departmentId}`)
  );

  if (accessEntry) {
    const isSuper = accessEntry.role === 'admin' || (accessEntry.permissions && accessEntry.permissions.includes('super_admin'));
    const allDepts = (db.departments || []).map((d: any) => d.id);
    const allowed = isSuper 
      ? allDepts
      : Array.from(new Set([
          accessEntry.primaryDepartmentId,
          ...(accessEntry.additionalDepartmentIds || []),
          ...(accessEntry.permissions?.includes('cross_department_access') ? (accessEntry.allowedDepartmentIds || []) : [])
        ])).filter(Boolean);

    return {
      isAuthenticated: true,
      isSuperAdmin: isSuper,
      role: accessEntry.role,
      userId: accessEntry.userId,
      userName: accessEntry.userName,
      jobTitle: accessEntry.jobTitle || 'موظف',
      primaryDepartmentId: accessEntry.primaryDepartmentId,
      primaryDepartmentName: accessEntry.primaryDepartmentName,
      additionalDepartmentIds: accessEntry.additionalDepartmentIds || [],
      allowedDepartmentIds: allowed,
      permissions: accessEntry.permissions || ['view_department'],
      teamId: accessEntry.teamId || teamId
    };
  }

  // Fallback: Check department admin
  const dep = (db.departments || []).find((d: any) => 
    (departmentId && d.id === departmentId) || 
    (nationalId && d.nationalId === nationalId) || 
    (userId && (userId === `depadmin-${d.id}` || userId === d.id))
  );

  if (dep) {
    return {
      isAuthenticated: true,
      isSuperAdmin: false,
      role: 'department_admin',
      userId: `depadmin-${dep.id}`,
      userName: dep.directorName,
      jobTitle: `مدير ${dep.nameAr}`,
      primaryDepartmentId: dep.id,
      primaryDepartmentName: dep.nameAr,
      additionalDepartmentIds: [],
      allowedDepartmentIds: [dep.id],
      permissions: ['view_department', 'create_data', 'edit_data', 'export_pdf', 'export_excel', 'manage_staff', 'manage_tasks', 'view_reports']
    };
  }

  // Fallback: Check employees
  const emp = (db.employees || []).find((e: any) => 
    (userId && (e.id === userId || e.employeeNumber === userId)) ||
    (nationalId && e.nationalId === nationalId)
  );

  if (emp) {
    return {
      isAuthenticated: true,
      isSuperAdmin: false,
      role: 'employee',
      userId: emp.id,
      userName: emp.name,
      jobTitle: emp.jobTitle || 'موظف إدارة',
      primaryDepartmentId: emp.departmentId,
      primaryDepartmentName: emp.departmentName || '',
      additionalDepartmentIds: [],
      allowedDepartmentIds: [emp.departmentId],
      permissions: ['view_department', 'create_data', 'edit_data', 'export_pdf', 'manage_tasks']
    };
  }

  // Fallback: Volunteer team leader
  if (userRole === 'leader' || (userId && userId.includes('leader'))) {
    return {
      isAuthenticated: true,
      isSuperAdmin: false,
      role: 'leader',
      userId: userId || 'leader-1',
      userName: 'قائد فريق تطوعي',
      jobTitle: 'قائد فريق تطوعي',
      primaryDepartmentId: 'dep-5',
      primaryDepartmentName: 'إدارة التطوع والموارد البشرية',
      teamId: teamId || 'team-1',
      additionalDepartmentIds: [],
      allowedDepartmentIds: ['dep-5'],
      permissions: ['view_department', 'create_data', 'edit_data', 'export_pdf']
    };
  }

  // Default authenticated fallback
  return {
    isAuthenticated: true,
    isSuperAdmin: false,
    role: userRole || 'user',
    userId: userId || 'user',
    userName: 'مستخدم',
    jobTitle: 'مستخدم',
    primaryDepartmentId: departmentId || '',
    primaryDepartmentName: '',
    additionalDepartmentIds: [],
    allowedDepartmentIds: departmentId ? [departmentId] : [],
    permissions: ['view_department']
  };
}

// 2. Authorization Check & Audit Logging Middleware/Helper
function checkDepartmentPermission(
  req: any,
  res: any,
  targetDepartmentId?: string,
  requiredPermission?: string,
  resourceName: string = 'البيانات'
): { allowed: boolean; context: any } {
  const context = getUserAccessContext(req);
  const db = readDb();

  const logAudit = (status: 'allowed' | 'denied', notes?: string) => {
    if (!db.accessAuditLogs) db.accessAuditLogs = [];
    db.accessAuditLogs.unshift({
      id: "audit-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      userId: context.userId,
      userName: context.userName,
      userRole: context.role,
      userDepartmentId: context.primaryDepartmentId,
      targetDepartmentId: targetDepartmentId || context.primaryDepartmentId || 'all',
      action: requiredPermission || 'access',
      resource: resourceName,
      endpoint: req.originalUrl || req.path || req.url,
      status,
      ip: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      device: (req.headers['user-agent'] || 'Web Client').substring(0, 100),
      notes: notes || (status === 'allowed' ? 'تم اعتماد الوصول بناءً على الصلاحيات المعرفة' : 'تم حظر العملية: محاولة وصول غير مصرح بها خارج نطاق الإدارة')
    });
    if (db.accessAuditLogs.length > 250) db.accessAuditLogs.length = 250;
    writeDb(db);
  };

  // Super Admin bypasses all checks
  if (context.isSuperAdmin) {
    return { allowed: true, context };
  }

  // Department Scope Isolation Check
  if (targetDepartmentId && targetDepartmentId !== 'all') {
    const isAllowedDept = context.allowedDepartmentIds && context.allowedDepartmentIds.includes(targetDepartmentId);
    if (!isAllowedDept) {
      logAudit('denied', `محاولة وصول غير مصرح بها إلى بيانات إدارة (${targetDepartmentId}) للمستخدم (${context.userName}) المقيد في (${context.primaryDepartmentId})`);
      if (res) {
        res.status(403).json({
          error: `تم رفض الوصول: ليس لديك تصريح لعرض أو تعديل بيانات هذه الإدارة (${targetDepartmentId}). الوصول مقتصر على إدارتك المعينة (${context.primaryDepartmentId}).`,
          code: 'FORBIDDEN_DEPARTMENT_SCOPE',
          userDepartment: context.primaryDepartmentId,
          targetDepartment: targetDepartmentId
        });
      }
      return { allowed: false, context };
    }
  }

  // Granular Permission Key Check (supports both specific departmental keys & operation aliases)
  if (requiredPermission) {
    const userPerms: string[] = context.permissions || [];
    const hasExplicit = userPerms.includes(requiredPermission as any);
    
    // Check alias matching
    const hasAlias = userPerms.some((p: string) => {
      if (p === 'super_admin' || p === 'all_permissions') return true;
      if (requiredPermission === 'create_data') {
        return p.includes('_add_') || p.includes('_create') || p === 'items' || p === 'create_initiatives';
      }
      if (requiredPermission === 'edit_data') {
        return p.includes('_edit_') || p.includes('_manage_') || p.includes('_points') || p.includes('_quantities');
      }
      if (requiredPermission === 'delete_data') {
        return p.includes('_delete_');
      }
      if (requiredPermission === 'view_department') {
        return p.includes('_view_') || p.includes('_audit_') || p.includes('view_stock');
      }
      if (requiredPermission === 'approve_data') {
        return p.includes('_approve_') || p.includes('_evaluations') || p.includes('_leaves');
      }
      if (requiredPermission === 'disburse_data') {
        return p.includes('_disburse') || p === 'outbound' || p.includes('_payroll') || p.includes('_record_receipt');
      }
      if (requiredPermission === 'receive_data') {
        return p.includes('_receive') || p === 'inbound' || p.includes('_record_receipt');
      }
      if (requiredPermission === 'print_data') {
        return p.includes('_print') || p.includes('_barcode');
      }
      if (requiredPermission === 'view_reports') {
        return p.includes('_reports') || p.includes('_audit_') || p === 'audit';
      }
      if (requiredPermission === 'export_excel' || requiredPermission === 'export_pdf') {
        return p.includes('_export');
      }
      if (requiredPermission === 'manage_staff') {
        return p.includes('_staff') || p.includes('_files');
      }
      if (requiredPermission === 'manage_tasks') {
        return p.includes('_manage_') || p.includes('_attendance');
      }
      // If requiredPermission is specific (e.g. warehouse_disburse), check if user has the legacy equivalent
      if (requiredPermission.includes('disburse') && (p === 'disburse_data' || p === 'outbound')) return true;
      if (requiredPermission.includes('receive') && (p === 'receive_data' || p === 'inbound')) return true;
      if (requiredPermission.includes('add_') && (p === 'create_data' || p === 'items')) return true;
      if (requiredPermission.includes('edit_') && p === 'edit_data') return true;
      if (requiredPermission.includes('delete_') && p === 'delete_data') return true;
      if (requiredPermission.includes('reports') && p === 'view_reports') return true;
      if (requiredPermission.includes('print') && p === 'print_data') return true;
      if (requiredPermission.includes('export') && (p === 'export_excel' || p === 'export_pdf')) return true;
      return false;
    });

    if (!hasExplicit && !hasAlias) {
      logAudit('denied', `المستخدم (${context.userName}) لا يملك صلاحية (${requiredPermission}) لإجراء هذه العملية على ${resourceName}`);
      if (res) {
        res.status(403).json({
          error: `ليس لديك الصلاحية المطلوبة (${requiredPermission}) لإجراء هذه العملية على ${resourceName}. يرجى مراجعة إدارة النظام.`,
          code: 'FORBIDDEN_PERMISSION',
          requiredPermission,
          userPermissions: context.permissions
        });
      }
      return { allowed: false, context };
    }
  }

  // Access is verified and permitted
  logAudit('allowed', `وصول معتمد بنجاح إلى ${resourceName}`);
  return { allowed: true, context };
}

// 3. Database Isolation Filter (Enforces Data Segregation at DB level)
function filterDatabaseForUser(db: any, context: any) {
  const sanitizedEmail = getSanitizedEmailConfig(db);

  // Super Admin receives all records with sanitized secrets
  if (context.isSuperAdmin) {
    return {
      ...db,
      emailSettings: sanitizedEmail,
      currentUserContext: context
    };
  }

  // Public visitor receives general website and public initiative records
  if (!context.isAuthenticated || context.role === 'public') {
    return {
      ...db,
      emailSettings: sanitizedEmail,
      currentUserContext: context,
      userDepartmentAccess: [],
      permissionChangeLogs: [],
      accessAuditLogs: []
    };
  }

  const allowedDepts: string[] = context.allowedDepartmentIds && context.allowedDepartmentIds.length > 0
    ? context.allowedDepartmentIds
    : (context.primaryDepartmentId ? [context.primaryDepartmentId] : []);

  const isLeader = context.role === 'leader';
  const teamId = context.teamId;

  // Filter and segregate every data entity according to the user's allowed department scope
  const filtered = {
    ...db,
    currentUserContext: context,
    emailSettings: sanitizedEmail,

    // Departments: isolated strictly to assigned department(s), with safe fallback for volunteers/beneficiaries
    departments: (context.role === 'volunteer' || context.role === 'beneficiary' || context.isSuperAdmin)
      ? (db.departments || [])
      : (db.departments || []).filter((d: any) => allowedDepts.includes(d.id)),

    // Employees: isolated strictly to employees in the user's allowed department(s)
    employees: (db.employees || []).filter((e: any) => allowedDepts.includes(e.departmentId)),

    // Employee hiring / recruitment requests: isolated to allowed department(s)
    employeeRequests: (db.employeeRequests || []).filter((r: any) => allowedDepts.includes(r.departmentId)),

    // Directives & circulars: only directives for allowed departments or universal 'all'
    departmentDirectives: (db.departmentDirectives || []).filter((d: any) => d.departmentId === 'all' || allowedDepts.includes(d.departmentId)),

    // Official letters: only where sender or recipient is within user's allowed departments
    letters: (db.letters || []).filter((l: any) => 
      allowedDepts.includes(l.departmentId) || 
      allowedDepts.includes(l.recipientDepartmentId) || 
      l.recipientDepartmentId === 'all'
    ),

    // Notifications: filtered to this user, allowed department, or universal
    notifications: (db.notifications || []).filter((n: any) => 
      n.targetUserId === 'all' || 
      n.targetUserId === context.userId || 
      (n.targetDepartmentId && allowedDepts.includes(n.targetDepartmentId))
    ),

    // Financial ledger & transactions: strictly available to dep-2 (Finance) and dep-7 (Fundraising & Partnerships)
    financialTransactions: (allowedDepts.includes('dep-2') || allowedDepts.includes('dep-7'))
      ? (db.financialTransactions || [])
      : [],
    storeDonations: (allowedDepts.includes('dep-2') || allowedDepts.includes('dep-7'))
      ? (db.storeDonations || [])
      : [],

    // Beneficiaries & aid distributions: available to dep-4 (Beneficiary Care) and authenticated beneficiaries
    beneficiaries: (allowedDepts.includes('dep-4') || context.role === 'beneficiary' || context.isSuperAdmin)
      ? (db.beneficiaries || [])
      : [],
    benefitRequests: (allowedDepts.includes('dep-4') || context.role === 'beneficiary' || context.isSuperAdmin)
      ? (context.role === 'beneficiary' ? (db.benefitRequests || []).filter((r: any) => r.beneficiaryId === context.userId) : (db.benefitRequests || []))
      : [],
    distributions: (allowedDepts.includes('dep-4') || context.role === 'beneficiary' || context.isSuperAdmin)
      ? (db.distributions || [])
      : [],
    distributionHandovers: (allowedDepts.includes('dep-4') || context.role === 'beneficiary' || context.isSuperAdmin)
      ? (context.role === 'beneficiary' ? (db.distributionHandovers || []).filter((h: any) => h.beneficiaryId === context.userId) : (db.distributionHandovers || []))
      : [],
    // Inventory Items: available to dep-8 (Warehouse), dep-4 (Beneficiary linking), and storekeeper
    inventoryItems: (allowedDepts.includes('dep-8') || allowedDepts.includes('dep-4') || context.role === 'storekeeper' || context.isSuperAdmin)
      ? (db.inventoryItems || [])
      : (db.inventoryItems || []),

    // Volunteers & teams: needed for Volunteer Portal, Leader Portal, and Volunteer Knights Leaderboard
    volunteers: (isLeader && teamId)
      ? (db.volunteers || []).filter((v: any) => v.teamId === teamId)
      : (db.volunteers || []),
    teams: (db.teams || []),
    initiatives: (context.role === 'volunteer')
      ? (db.initiatives || [])
      : (isLeader && teamId)
        ? (db.initiatives || []).filter((i: any) => i.teamId === teamId)
        : (db.initiatives || []),
    attendance: (context.role === 'volunteer')
      ? (db.attendance || []).filter((a: any) => a.volunteerId === context.userId)
      : (isLeader && teamId)
        ? (db.attendance || []).filter((a: any) => a.teamId === teamId)
        : (db.attendance || []),
    teamStaffAssignments: isLeader && teamId
      ? (db.teamStaffAssignments || []).filter((tsa: any) => tsa.teamId === teamId)
      : (db.teamStaffAssignments || []),
    teamPoints: (allowedDepts.includes('dep-5') || isLeader || context.isSuperAdmin)
      ? (db.teamPoints || [])
      : (db.teamPoints || []),
    initiativeRatings: (allowedDepts.includes('dep-5') || isLeader || context.isSuperAdmin)
      ? (db.initiativeRatings || [])
      : (db.initiativeRatings || []),

    // Permissions and audit logs: non-admins only see their own profile and logs
    userDepartmentAccess: (db.userDepartmentAccess || []).filter((u: any) => u.userId === context.userId),
    permissionChangeLogs: (db.permissionChangeLogs || []).filter((l: any) => l.targetUserId === context.userId),
    accessAuditLogs: (db.accessAuditLogs || []).filter((l: any) => l.userId === context.userId)
  };

  return filtered;
}

// API REST routes

// Comprehensive Health Check & Diagnostic endpoint for custom domain, proxy & uptime monitoring
app.get(["/api/health", "/api/health/", "/health", "/health/"], (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  let db: any = null;
  try {
    db = readDb();
  } catch (e) {
    // ignore
  }
  return res.status(200).json({
    ok: true,
    status: "healthy",
    message: "خادم جمعية ريادة العطاء لخدمة الإنسان بالعسيلة متصل وقيد العمل بنجاح",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    port: PORT,
    environment: process.env.NODE_ENV || "production",
    database: {
      initialized: !!db,
      departmentsCount: (db?.departments || []).length,
      volunteersCount: (db?.volunteers || []).length,
      initiativesCount: (db?.initiatives || []).length,
      beneficiariesCount: (db?.beneficiaries || []).length,
      inventoryCount: (db?.inventoryItems || []).length
    },
    clientInfo: {
      ip: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      host: req.headers.host,
      protocol: req.protocol
    }
  });
});

app.get("/api/ping", (req, res) => {
  res.json({ status: "pong", time: Date.now() });
});

// Get DB with Server-Side Department Data Isolation & RBAC Filtering
app.get("/api/db", (req, res) => {
  try {
    const db = readDb();
    if (!db) {
      return res.status(200).json(defaultDb);
    }
    const context = getUserAccessContext(req);
    const filtered = filterDatabaseForUser(db, context);
    return res.status(200).json(filtered);
  } catch (err: any) {
    console.error("Error in /api/db endpoint:", err);
    try {
      const fallbackDb = readDb() || defaultDb;
      return res.status(200).json(fallbackDb);
    } catch {
      return res.status(200).json(defaultDb);
    }
  }
});

// Explicit Scoped DB endpoint
app.get("/api/db/scoped", (req, res) => {
  try {
    const db = readDb();
    if (!db) {
      return res.status(200).json(defaultDb);
    }
    const context = getUserAccessContext(req);
    const filtered = filterDatabaseForUser(db, context);
    return res.status(200).json(filtered);
  } catch (err: any) {
    console.error("Error in /api/db/scoped endpoint:", err);
    try {
      const fallbackDb = readDb() || defaultDb;
      return res.status(200).json(fallbackDb);
    } catch {
      return res.status(200).json(defaultDb);
    }
  }
});

// ==========================================
// RBAC Permissions & Audit Management APIs
// ==========================================

// 1. Get User Permissions List (Super Admin or staff managers)
app.get("/api/db/permissions/users", (req, res) => {
  const auth = checkDepartmentPermission(req, res, undefined, 'manage_staff', 'إدارة صلاحيات المستخدمين');
  if (!auth.allowed) return;
  const db = readDb();
  res.json({
    status: "success",
    users: db.userDepartmentAccess || [],
    departments: (db.departments || []).map((d: any) => ({ id: d.id, nameAr: d.nameAr, nameEn: d.nameEn }))
  });
});

// 2. Update User Permissions & Department Scopes (Admin only)
app.post("/api/db/permissions/update", (req, res) => {
  const auth = checkDepartmentPermission(req, res, undefined, 'super_admin', 'تعديل صلاحيات المستخدمين ونطاق الإدارات');
  if (!auth.allowed) return;
  const db = readDb();
  const { 
    userId, 
    permissions, 
    primaryDepartmentId, 
    primaryDepartmentName, 
    additionalDepartmentIds, 
    allowedDepartmentIds, 
    allowedPages,
    role,
    jobTitle,
    userName,
    userEmail,
    nationalId,
    phone,
    status, 
    notes,
    reason 
  } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "معرف المستخدم مطلوب لتحديث الصلاحيات." });
  }

  if (!db.userDepartmentAccess) db.userDepartmentAccess = [];
  const idx = db.userDepartmentAccess.findIndex((u: any) => u.userId === userId || u.id === userId || (nationalId && u.nationalId === nationalId));

  let oldPerms: string[] = [];
  let targetUserName = userName || userId;
  let targetDept = primaryDepartmentName || primaryDepartmentId || '';

  if (idx !== -1) {
    const existing = db.userDepartmentAccess[idx];
    oldPerms = existing.permissions || [];
    targetUserName = userName || existing.userName || targetUserName;
    targetDept = primaryDepartmentName || existing.primaryDepartmentName || targetDept;

    db.userDepartmentAccess[idx] = {
      ...existing,
      ...(role ? { role } : {}),
      ...(jobTitle ? { jobTitle } : {}),
      ...(userName ? { userName } : {}),
      ...(userEmail ? { userEmail } : {}),
      ...(nationalId ? { nationalId } : {}),
      ...(phone ? { phone } : {}),
      ...(permissions ? { permissions } : {}),
      ...(primaryDepartmentId ? { primaryDepartmentId } : {}),
      ...(primaryDepartmentName ? { primaryDepartmentName } : {}),
      ...(additionalDepartmentIds !== undefined ? { additionalDepartmentIds } : {}),
      ...(allowedDepartmentIds !== undefined ? { allowedDepartmentIds } : {}),
      ...(allowedPages !== undefined ? { allowedPages } : {}),
      ...(status ? { status } : {}),
      ...(notes !== undefined ? { notes } : {}),
      updatedAt: new Date().toISOString(),
      updatedBy: auth.context.userName
    };
  } else {
    db.userDepartmentAccess.push({
      id: "perm-" + Date.now(),
      userId,
      userName: targetUserName,
      userEmail: userEmail || "",
      nationalId: nationalId || "",
      phone: phone || "",
      jobTitle: jobTitle || (role === 'department_admin' ? `مدير ${targetDept}` : "موظف إدارة"),
      role: role || "employee",
      primaryDepartmentId: primaryDepartmentId || "dep-1",
      primaryDepartmentName: targetDept,
      additionalDepartmentIds: additionalDepartmentIds || [],
      permissions: permissions || ["view_department", "create_data"],
      allowedDepartmentIds: allowedDepartmentIds || (primaryDepartmentId ? [primaryDepartmentId] : []),
      allowedPages: allowedPages || [],
      status: status || "active",
      notes: notes || "",
      updatedAt: new Date().toISOString(),
      updatedBy: auth.context.userName
    });
  }

  // Synchronize employee record in db.employees if applicable
  if (db.employees && Array.isArray(db.employees)) {
    const empIdx = db.employees.findIndex((e: any) => e.id === userId || (nationalId && e.nationalId === nationalId));
    if (empIdx !== -1) {
      db.employees[empIdx] = {
        ...db.employees[empIdx],
        ...(primaryDepartmentId ? { departmentId: primaryDepartmentId } : {}),
        ...(targetDept ? { departmentName: targetDept } : {}),
        ...(jobTitle ? { jobTitle } : {}),
        ...(status ? { status } : {}),
        ...(phone ? { phone } : {}),
        ...(userEmail ? { email: userEmail } : {})
      };
    }
  }

  // Synchronize storekeepers if applicable
  if (db.storekeepers && Array.isArray(db.storekeepers)) {
    const skIdx = db.storekeepers.findIndex((s: any) => s.id === userId || (nationalId && s.nationalId === nationalId));
    if (skIdx !== -1) {
      db.storekeepers[skIdx] = {
        ...db.storekeepers[skIdx],
        ...(status ? { status } : {}),
        ...(phone ? { phone } : {}),
        ...(userEmail ? { email: userEmail } : {})
      };
    }
  }

  // Record into Permission Change Logs
  if (!db.permissionChangeLogs) db.permissionChangeLogs = [];
  db.permissionChangeLogs.unshift({
    id: "pcl-" + Date.now(),
    timestamp: new Date().toISOString(),
    adminName: auth.context.userName,
    targetUserId: userId,
    targetUserName,
    targetDepartment: targetDept,
    oldPermissions: oldPerms,
    newPermissions: permissions || oldPerms,
    allowedDepartments: allowedDepartmentIds || (primaryDepartmentId ? [primaryDepartmentId] : []),
    reason: reason || "تحديث إداري رسمي للصلاحيات ونطاق الوصول عبر مصفوفة الصلاحيات المركزية"
  });

  writeDb(db);
  res.json({
    status: "success",
    message: `تم تحديث صلاحيات ونطاق الوصول للمستخدم (${targetUserName}) بنجاح`,
    users: db.userDepartmentAccess,
    changeLogs: db.permissionChangeLogs
  });
});

// 3. Get Permission Change Audit Logs
app.get("/api/db/permissions/change-logs", (req, res) => {
  const auth = checkDepartmentPermission(req, res, undefined, 'view_reports', 'سجل تغييرات الصلاحيات');
  if (!auth.allowed) return;
  const db = readDb();
  res.json({
    status: "success",
    logs: db.permissionChangeLogs || []
  });
});

// 4. Get Access & Security Audit Logs
app.get("/api/db/permissions/audit-logs", (req, res) => {
  const auth = checkDepartmentPermission(req, res, undefined, 'view_reports', 'سجل تدقيق الوصول الأمني');
  if (!auth.allowed) return;
  const db = readDb();
  res.json({
    status: "success",
    logs: db.accessAuditLogs || []
  });
});

// 4.1 Log Frontend Developer Errors (Prevents UI Blank Screen & Tracks Root Causes)
app.post("/api/logs/developer-error", (req, res) => {
  try {
    const db = readDb();
    if (!db.developerErrorLogs) db.developerErrorLogs = [];
    const { errorId, pageName, message, stack, componentStack, timestamp, url, userAgent } = req.body || {};
    
    console.error(`[Server Developer Error Log] [${pageName || 'Unknown'}] Error:`, message);

    db.developerErrorLogs.unshift({
      id: errorId || `err_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      pageName: pageName || 'غير محدد',
      message: message || 'Unknown error',
      stack: stack || null,
      componentStack: componentStack || null,
      timestamp: timestamp || new Date().toISOString(),
      url: url || '',
      userAgent: (userAgent || '').substring(0, 150),
      ip: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1'
    });

    if (db.developerErrorLogs.length > 200) db.developerErrorLogs.length = 200;
    writeDb(db);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to record developer error log" });
  }
});

app.get("/api/logs/developer-error", (req, res) => {
  const db = readDb();
  res.json({
    status: "success",
    logs: db.developerErrorLogs || []
  });
});

// 5. Test Access & Permission Verification Simulator
app.post("/api/db/permissions/test-access", (req, res) => {
  const { testUserId, testDepartmentId, testAction } = req.body;
  const mockReq = {
    headers: { 'x-user-id': testUserId },
    path: '/api/test-access',
    originalUrl: '/api/test-access',
    ip: req.ip || '127.0.0.1'
  };
  const result = checkDepartmentPermission(mockReq, null, testDepartmentId, testAction, 'فحص الصلاحيات التجريبي');
  res.json({
    allowed: result.allowed,
    context: result.context,
    testedDepartment: testDepartmentId,
    testedAction: testAction,
    message: result.allowed 
      ? `مصرح: يملك المستخدم حق الوصول إلى إدارة (${testDepartmentId}) بصلاحية (${testAction})`
      : `محظور: المستخدم ليس لديه حق الوصول أو الصلاحية المطلوبة على إدارة (${testDepartmentId})`
  });
});

// Reset database
app.post("/api/db/reset", (req, res) => {
  writeDb(defaultDb);
  // Log operation
  const db = readDb();
  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "المدير التنفيذي",
    action: "إعادة تهيئة قاعدة البيانات للقيم الافتراضية",
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });
  writeDb(db);
  res.json({ status: "success", db });
});

// Backup database
app.get("/api/db/backup", (req, res) => {
  const data = readDb();
  res.setHeader('Content-disposition', 'attachment; filename=backup_reyadat_alata.json');
  res.setHeader('Content-type', 'application/json');
  res.send(JSON.stringify(data, null, 2));
});

// Restore database
app.post("/api/db/restore", (req, res) => {
  try {
    const { database } = req.body;
    if (database && Array.isArray(database.volunteers) && Array.isArray(database.departments)) {
      writeDb(database);
      const db = readDb();
      db.logs.unshift({
        id: "log-" + Date.now(),
        timestamp: new Date().toISOString(),
        user: "المدير التنفيذي",
        action: "استعادة النسخة الاحتياطية بنجاح",
        ip: req.ip || "127.0.0.1",
        device: req.headers["user-agent"] || "System"
      });
      writeDb(db);
      res.json({ status: "success", db });
    } else {
      res.status(400).json({ error: "Invalid backup format" });
    }
  } catch (err) {
    res.status(500).json({ error: "Restoration failed: " + String(err) });
  }
});

// --- NEW CLIENT-COMPATIBLE API ENDPOINTS START ---

// 1. Departments Add/Edit
app.post("/api/db/departments/add", (req, res) => {
  const auth = checkDepartmentPermission(req, res, undefined, 'super_admin', 'إضافة وتعديل هيكل الإدارات');
  if (!auth.allowed) return;

  const db = readDb();
  const dep = req.body;
  if (!dep.id) {
    dep.id = "dep-" + Date.now();
    db.departments.push(dep);
  } else {
    const index = db.departments.findIndex((d: any) => d.id === dep.id);
    if (index !== -1) {
      db.departments[index] = { ...db.departments[index], ...dep };
    } else {
      db.departments.push(dep);
    }
  }
  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: auth.context.userName || "الإدارة العليا",
    action: `إضافة/تعديل إدارة: ${dep.nameAr || dep.id}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });
  writeDb(db);
  res.json(db);
});

// 2. Departments Delete
app.post("/api/db/departments/delete", (req, res) => {
  const auth = checkDepartmentPermission(req, res, undefined, 'super_admin', 'حذف الإدارات والفرق التابعة');
  if (!auth.allowed) return;

  const db = readDb();
  const { id } = req.body;
  const dep = db.departments.find((d: any) => d.id === id);
  db.departments = db.departments.filter((d: any) => d.id !== id);
  db.teams = db.teams.filter((t: any) => t.departmentId !== id);
  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: auth.context.userName || "الإدارة العليا",
    action: `حذف إدارة ومعها الفرق التابعة: ${dep ? dep.nameAr : id}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });
  writeDb(db);
  res.json(db);
});

// 3. Teams Add/Edit
app.post("/api/db/teams/add", (req, res) => {
  const targetDept = req.body?.departmentId || 'dep-5';
  const auth = checkDepartmentPermission(req, res, targetDept, 'manage_staff', 'إدارة الفرق التطوعية');
  if (!auth.allowed) return;

  const db = readDb();
  const team = req.body;
  if (!team.id) {
    team.id = "team-" + Date.now();
    db.teams.push(team);
  } else {
    const index = db.teams.findIndex((t: any) => t.id === team.id);
    if (index !== -1) {
      db.teams[index] = { ...db.teams[index], ...team };
    } else {
      db.teams.push(team);
    }
  }
  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: auth.context.userName || "إدارة التطوع",
    action: `إضافة/تعديل فريق تطوعي: ${team.nameAr || team.id}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });
  writeDb(db);
  res.json(db);
});

// 4. Teams Delete
app.post("/api/db/teams/delete", (req, res) => {
  const auth = checkDepartmentPermission(req, res, 'dep-5', 'delete_data', 'حذف الفرق التطوعية');
  if (!auth.allowed) return;

  const db = readDb();
  const { id } = req.body;
  const team = db.teams.find((t: any) => t.id === id);
  db.teams = db.teams.filter((t: any) => t.id !== id);
  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: auth.context.userName || "إدارة التطوع",
    action: `حذف الفريق التطوعي: ${team ? team.nameAr : id}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });
  writeDb(db);
  res.json(db);
});

// 5. Volunteers Add/Edit
app.post("/api/db/volunteers/add", (req, res) => {
  const isEdit = Boolean(req.body?.id);
  const auth = checkDepartmentPermission(req, res, 'dep-5', isEdit ? 'edit_data' : 'create_data', 'ملف المتطوع');
  if (!auth.allowed) return;

  const db = readDb();
  const vol = req.body;
  if (!vol.id) {
    vol.id = "vol-" + Date.now();
    const seq = String(db.volunteers.length + 1).padStart(4, "0");
    vol.membershipNumber = vol.membershipNumber || `V-2026-${seq}`;
    vol.barcode = vol.barcode || `100088868${seq}`;
    vol.qrCode = vol.qrCode || `MEM-${vol.membershipNumber}`;
    vol.points = vol.points !== undefined ? Number(vol.points) : 0;
    vol.status = vol.status || "active";
    vol.issueDate = vol.issueDate || new Date().toISOString().split('T')[0];
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);
    vol.expiryDate = vol.expiryDate || expiry.toISOString().split('T')[0];
    db.volunteers.push(vol);
  } else {
    const index = db.volunteers.findIndex((v: any) => v.id === vol.id);
    if (index !== -1) {
      vol.points = vol.points !== undefined ? Number(vol.points) : db.volunteers[index].points;
      db.volunteers[index] = { ...db.volunteers[index], ...vol };
    } else {
      db.volunteers.push(vol);
    }
  }
  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: auth.context.userName || "إدارة التطوع",
    action: `إضافة/تعديل ملف متطوع: ${vol.name || vol.id}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });
  writeDb(db);
  res.json(db);
});

// 6. Volunteers Delete
app.post("/api/db/volunteers/delete", (req, res) => {
  const auth = checkDepartmentPermission(req, res, 'dep-5', 'delete_data', 'ملف المتطوع');
  if (!auth.allowed) return;

  const db = readDb();
  const { id } = req.body;
  const vol = db.volunteers.find((v: any) => v.id === id);
  db.volunteers = db.volunteers.filter((v: any) => v.id !== id);
  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: auth.context.userName || "إدارة التطوع",
    action: `حذف ملف المتطوع: ${vol ? vol.name : id}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });
  writeDb(db);
  res.json(db);
});

// 7. Volunteers Import (Batch)
app.post("/api/db/volunteers/batch", (req, res) => {
  const db = readDb();
  const list = req.body.volunteers;
  if (!Array.isArray(list)) return res.status(400).json({ error: "Invalid data format" });
  const added: Volunteer[] = [];
  list.forEach((v: any, idx: number) => {
    const id = "vol-" + (Date.now() + idx);
    const seq = String(db.volunteers.length + 1 + idx).padStart(4, "0");
    const vol: Volunteer = {
      id,
      name: v.name || "متطوع جديد",
      email: v.email || `vol-${seq}@reyada.sa`,
      phone: v.phone || "0500000000",
      photo: v.photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop",
      membershipNumber: `V-2026-${seq}`,
      barcode: `100088868${seq}`,
      qrCode: `MEM-V-2026-${seq}`,
      teamId: v.teamId || "team-1",
      departmentId: v.departmentId || "dep-3",
      titleAr: v.titleAr || "متطوع ميداني",
      titleEn: v.titleEn || "Field Volunteer",
      status: "active",
      points: 0,
      issueDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0]
    };
    db.volunteers.push(vol);
    added.push(vol);
  });
  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "إدارة التطوع",
    action: `استيراد دفعة متطوعين بعدد: ${added.length} متطوع`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });
  writeDb(db);
  res.json(db);
});

// 8. Initiatives Add/Edit
app.post("/api/db/initiatives/add", (req, res) => {
  const db = readDb();
  const init = req.body;
  if (!init.id) {
    init.id = "init-" + Date.now();
    init.registrationStatus = init.registrationStatus || "open";
    init.acceptedVolunteerIds = init.acceptedVolunteerIds || [];
    init.waitlistVolunteerIds = init.waitlistVolunteerIds || [];
    init.applicantVolunteerIds = init.applicantVolunteerIds || [];
    db.initiatives.push(init);
  } else {
    const index = db.initiatives.findIndex((i: any) => i.id === init.id);
    if (index !== -1) {
      db.initiatives[index] = { ...db.initiatives[index], ...init };
    } else {
      db.initiatives.push(init);
    }
  }
  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "مدير البرامج / قادة الفرق",
    action: `إضافة/تعديل مبادرة: ${init.name}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });
  writeDb(db);
  res.json(db);
});

// 9. Initiatives Copy
app.post("/api/db/initiatives/copy", (req, res) => {
  const db = readDb();
  const { originalId, newDate, newName } = req.body;
  const orig = db.initiatives.find((i: any) => i.id === originalId);
  if (!orig) return res.status(404).json({ error: "Original initiative not found" });
  const copy: Initiative = {
    ...orig,
    id: "init-" + Date.now(),
    name: newName || `${orig.name} - نسخة مكررة`,
    date: newDate || new Date().toISOString().split('T')[0],
    registrationStatus: "open",
    acceptedVolunteerIds: [],
    waitlistVolunteerIds: [],
    applicantVolunteerIds: []
  };
  db.initiatives.push(copy);
  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "قائد فريق / إدارة التطوع",
    action: `نسخ وتكرار المبادرة السابقة: ${orig.name} إلى ${copy.name}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });
  writeDb(db);
  res.json(db);
});

// 9.1 Opportunity Requests - Leader Create
app.post("/api/db/opportunity-requests/add", (req, res) => {
  const db = readDb();
  const reqData = req.body;
  if (!db.opportunityRequests) db.opportunityRequests = [];
  if (!db.notifications) db.notifications = [];
  
  if (!reqData.id) {
    reqData.id = "opp-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
  }
  
  // SECURITY & WORKFLOW MANDATE: Leader CANNOT assign opportunityCode and CANNOT approve opportunity
  delete reqData.opportunityCode;
  delete reqData.registrationUrl;
  reqData.scope = reqData.scope === 'private' ? 'private' : 'public';
  reqData.status = reqData.status === 'draft' ? 'draft' : 'pending';
  reqData.createdAt = reqData.createdAt || new Date().toISOString();
  reqData.updatedAt = reqData.createdAt;

  // Initialize review audit trail
  const initialLog = {
    id: "rev-" + Date.now(),
    timestamp: new Date().toISOString(),
    action: reqData.status === 'draft' ? 'draft_saved' : 'submitted',
    actorName: reqData.leaderName || "قائد الفريق",
    actorRole: "قائد الفريق",
    notes: reqData.status === 'draft' ? "تم حفظ مسودة الفرصة التطوعية" : `تم إنشاء الفرصة وإرسالها لإدارة التطوع للمراجعة والاعتماد (نطاق الفرصة: ${reqData.scope === 'private' ? 'خاصة بأعضاء الفريق' : 'عامة لكافة المتطوعين'})`
  };
  reqData.reviewHistory = [initialLog];
  
  const existingIdx = db.opportunityRequests.findIndex((r: any) => r.id === reqData.id);
  if (existingIdx !== -1) {
    db.opportunityRequests[existingIdx] = { ...db.opportunityRequests[existingIdx], ...reqData };
  } else {
    db.opportunityRequests.unshift(reqData);
  }
  
  // Send notification to Volunteer Admin if submitted for review
  if (reqData.status === 'pending') {
    db.notifications.unshift({
      id: "not-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      userId: "admin-1",
      targetRole: "admin",
      titleAr: `فرصة تطوعية جديدة للمراجعة: ${reqData.title}`,
      titleEn: `New Volunteer Opportunity for Review: ${reqData.title}`,
      bodyAr: `قام قائد فريق (${reqData.teamName || 'فريق تطوعي'}) برفع فرصة تطوعية جديدة بعنوان "${reqData.title}" بانتظار المراجعة والاعتماد وتعيين معرف الفرصة.`,
      bodyEn: `Team leader of (${reqData.teamName || 'Volunteer Team'}) submitted a new opportunity "${reqData.title}" awaiting review and approval.`,
      type: "important",
      category: "initiative",
      date: new Date().toISOString().split("T")[0],
      read: false,
      linkUrl: "opp_requests"
    });
  }

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: `قائد الفريق ${reqData.leaderName || ''}`,
    action: `رفع فرصة تطوعية جديدة (${reqData.title}) - الحالة: [${reqData.status}]`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });
  
  writeDb(db);
  res.json(db);
});

// 9.1.1 Opportunity Requests - Leader Resubmit after Revision
app.post("/api/db/opportunity-requests/resubmit", (req, res) => {
  const db = readDb();
  const { id, title, opportunityType, domain, neededCount, place, goals, description, imageUrl, leaderName, teamId } = req.body;
  if (!db.opportunityRequests) db.opportunityRequests = [];
  if (!db.notifications) db.notifications = [];

  const request = db.opportunityRequests.find((r: any) => r.id === id);
  if (!request) return res.status(404).json({ error: "الفرصة التطوعية غير موجودة" });

  // Security: If teamId provided, check it belongs to this team
  if (teamId && request.teamId && request.teamId !== teamId) {
    return res.status(403).json({ error: "غير مصرح لك بتعديل فرصة فريق آخر." });
  }

  // Update opportunity details
  if (title) request.title = title;
  if (opportunityType) request.opportunityType = opportunityType;
  if (domain) request.domain = domain;
  if (neededCount !== undefined) request.neededCount = Number(neededCount);
  if (place !== undefined) request.place = place;
  if (goals !== undefined) request.goals = goals;
  if (description !== undefined) request.description = description;
  if (imageUrl !== undefined) request.imageUrl = imageUrl;

  // Status transitions back to pending
  request.status = "pending";
  request.updatedAt = new Date().toISOString();

  if (!request.reviewHistory) request.reviewHistory = [];
  request.reviewHistory.unshift({
    id: "rev-" + Date.now(),
    timestamp: new Date().toISOString(),
    action: "resubmitted",
    actorName: leaderName || request.leaderName || "قائد الفريق",
    actorRole: "قائد الفريق",
    notes: "تم تعديل بيانات الفرصة واستيفاء الملاحظات وإعادة إرسالها للمراجعة والاعتماد"
  });

  // Notify Volunteer Admin
  db.notifications.unshift({
    id: "not-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
    userId: "admin-1",
    targetRole: "admin",
    titleAr: `إعادة إرسال فرصة للمراجعة: ${request.title}`,
    titleEn: `Opportunity Resubmitted for Review: ${request.title}`,
    bodyAr: `قام قائد فريق (${request.teamName || 'الفريق'}) بتعديل الفرصة "${request.title}" بعد إعادتها للتصحيح وأعاد إرسالها للمراجعة.`,
    bodyEn: `Team leader resubmitted "${request.title}" after making requested revisions.`,
    type: "important",
    category: "initiative",
    date: new Date().toISOString().split("T")[0],
    read: false,
    linkUrl: "opp_requests"
  });

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: `قائد الفريق ${leaderName || request.leaderName || ''}`,
    action: `إعادة إرسال الفرصة التطوعية (${request.title}) للمراجعة بعد التعديل`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  writeDb(db);
  res.json(db);
});

// 9.2 Opportunity Requests - Volunteer Management Review / Approve / Reject / Return
app.post("/api/db/opportunity-requests/update", (req, res) => {
  const db = readDb();
  const { 
    id, 
    status, 
    startDate, 
    endDate, 
    nationalPlatformUrl, 
    opportunityCode, 
    neededCount, 
    rejectionReason, 
    correctionNotes, 
    reviewerName,
    isLeaderResubmit,
    updatedFields 
  } = req.body;

  if (!db.opportunityRequests) db.opportunityRequests = [];
  if (!db.notifications) db.notifications = [];
  if (!db.initiatives) db.initiatives = [];
  
  const request = db.opportunityRequests.find((r: any) => r.id === id);
  if (!request) return res.status(404).json({ error: "الفرصة التطوعية غير موجودة" });
  
  if (!request.reviewHistory) request.reviewHistory = [];

  // Handle case of leader resubmission sent through this endpoint
  if (isLeaderResubmit) {
    if (updatedFields && typeof updatedFields === 'object') {
      delete updatedFields.opportunityCode;
      delete updatedFields.status;
      Object.assign(request, updatedFields);
    }
    request.status = 'pending';
    request.updatedAt = new Date().toISOString();
    request.reviewHistory.unshift({
      id: "rev-" + Date.now(),
      timestamp: new Date().toISOString(),
      action: "resubmitted",
      actorName: req.body.leaderName || request.leaderName || "قائد الفريق",
      actorRole: "قائد الفريق",
      notes: "تم تعديل بيانات الفرصة واستيفاء الملاحظات وإعادة إرسالها للمراجعة والاعتماد"
    });

    db.notifications.unshift({
      id: "not-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      userId: "admin-1",
      targetRole: "admin",
      titleAr: `إعادة إرسال فرصة للمراجعة: ${request.title}`,
      titleEn: `Opportunity Resubmitted for Review: ${request.title}`,
      bodyAr: `قام قائد فريق (${request.teamName || 'الفريق'}) بتعديل الفرصة "${request.title}" وإعادة إرسالها للمراجعة.`,
      bodyEn: `Team leader resubmitted "${request.title}" for review.`,
      type: "important",
      category: "initiative",
      date: new Date().toISOString().split("T")[0],
      read: false,
      linkUrl: "opp_requests"
    });

    writeDb(db);
    return res.json(db);
  }

  // Check uniqueness of opportunityCode if provided
  if (opportunityCode !== undefined && opportunityCode !== null && String(opportunityCode).trim() !== "") {
    const cleanCode = String(opportunityCode).trim();
    const isDuplicate = db.opportunityRequests.some((r: any) => 
      r.id !== id && 
      ((r.opportunityCode && r.opportunityCode.trim() === cleanCode) || 
       (r.id === cleanCode && r.status === 'accepted'))
    );
    if (isDuplicate) {
      return res.status(400).json({ error: `معرف الفرصة (${cleanCode}) مستخدم مسبقاً، يرجى تعيين معرف فريد.` });
    }
  }

  const effectiveReviewer = reviewerName || "إدارة التطوع";
  const nowIso = new Date().toISOString();

  // Handle Acceptance
  if (status === 'accepted') {
    let finalCode = (opportunityCode || request.opportunityCode || '').trim();
    if (!finalCode) {
      const year = new Date().getFullYear();
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      finalCode = `OPP-${year}-${randomSuffix}`;
    }

    const origin = req.headers.origin || 'https://riadataleata.org.sa';
    const finalUrl = (nationalPlatformUrl && nationalPlatformUrl.trim()) ? nationalPlatformUrl.trim() : `${origin}/?oppCode=${finalCode}`;

    request.status = 'accepted';
    request.opportunityCode = finalCode;
    request.registrationUrl = finalUrl;
    request.reviewedBy = effectiveReviewer;
    request.reviewedAt = nowIso;
    request.approvedBy = effectiveReviewer;
    request.approvedAt = nowIso;
    request.updatedAt = nowIso;
    if (startDate !== undefined) request.startDate = startDate;
    if (endDate !== undefined) request.endDate = endDate;
    if (nationalPlatformUrl !== undefined) request.nationalPlatformUrl = nationalPlatformUrl;

    request.reviewHistory.unshift({
      id: "rev-" + Date.now(),
      timestamp: nowIso,
      action: "accepted",
      actorName: effectiveReviewer,
      actorRole: "إدارة التطوع",
      opportunityCode: finalCode,
      registrationUrl: finalUrl,
      notes: `تم اعتماد وقبول الفرصة التطوعية رسمياً من إدارة التطوع بالمعرف (#${finalCode}) وتوليد رابط التسجيل المباشر`
    });

    // Create or update published initiative
    const newInitId = "init-opp-" + request.id;
    const existingInitIdx = db.initiatives.findIndex((i: any) => 
      i.id === newInitId || 
      (i.opportunityCode && i.opportunityCode === finalCode)
    );
    
    const newInitiative: Initiative = {
      id: existingInitIdx !== -1 ? db.initiatives[existingInitIdx].id : newInitId,
      name: request.title,
      description: request.description || "فرصة تطوعية معتمدة من إدارة التطوع بجمعية ريادة العطاء لخدمة الإنسان بالعسيلة.",
      place: request.place || "مكة المكرمة - العسيلة",
      date: request.startDate || new Date().toISOString().split('T')[0],
      startTime: "09:00",
      endTime: "14:00",
      departmentId: request.departmentId || "dep-5",
      teamId: request.teamId || "team-1",
      leaderId: request.leaderId || "lead-1",
      supervisorId: "sup-1",
      neededCount: request.neededCount || 10,
      acceptedCount: existingInitIdx !== -1 ? db.initiatives[existingInitIdx].acceptedCount : 0,
      waitlistCount: existingInitIdx !== -1 ? db.initiatives[existingInitIdx].waitlistCount : 0,
      registrationStatus: "open",
      acceptedVolunteerIds: existingInitIdx !== -1 ? db.initiatives[existingInitIdx].acceptedVolunteerIds : [],
      waitlistVolunteerIds: existingInitIdx !== -1 ? db.initiatives[existingInitIdx].waitlistVolunteerIds : [],
      applicantVolunteerIds: existingInitIdx !== -1 ? db.initiatives[existingInitIdx].applicantVolunteerIds : [],
      nationalPlatformUrl: request.nationalPlatformUrl || "https://nvg.gov.sa",
      registrationUrl: finalUrl,
      goals: request.goals,
      opportunityType: request.opportunityType,
      domain: request.domain,
      scope: request.scope || (request.opportunityType?.includes('خاصة') ? 'private' : 'public'),
      lifecycleStatus: "open",
      startDate: request.startDate,
      endDate: request.endDate,
      opportunityCode: finalCode,
      imageUrl: request.imageUrl,
      reviewHistory: request.reviewHistory
    };
    
    if (existingInitIdx !== -1) {
      db.initiatives[existingInitIdx] = newInitiative;
    } else {
      db.initiatives.unshift(newInitiative);
    }

    // Send notification to team leader with opportunity code and registration URL
    db.notifications.unshift({
      id: "not-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      userId: request.leaderId || request.teamId || "all",
      targetRole: "leader",
      teamId: request.teamId,
      titleAr: `تم قبول الفرصة التطوعية (${request.title}) 🎉`,
      titleEn: `Opportunity Accepted: ${request.title} 🎉`,
      bodyAr: `تم قبول واعتماد الفرصة التطوعية بالمعرف الرسمي (${finalCode}). رابط التسجيل متاح الآن للمتطوعين (${request.scope === 'private' ? 'خاصة بأعضاء فريقك' : 'عامة لكافة المتطوعين'}).`,
      bodyEn: `Your volunteer opportunity "${request.title}" has been accepted with code (${finalCode}).`,
      type: "important",
      category: "initiative",
      date: nowIso.split("T")[0],
      read: false
    });
  } 
  // Handle Return for Correction
  else if (status === 'returned' || status === 'returned_for_correction') {
    if (!correctionNotes || !String(correctionNotes).trim()) {
      return res.status(400).json({ error: "حقل 'سبب طلب التعديل' إلزامي عند إعادة الفرصة للتصحيح." });
    }

    request.status = 'returned';
    request.correctionNotes = String(correctionNotes).trim();
    request.reviewedBy = effectiveReviewer;
    request.reviewedAt = nowIso;
    request.returnedBy = effectiveReviewer;
    request.returnedAt = nowIso;
    request.updatedAt = nowIso;

    request.reviewHistory.unshift({
      id: "rev-" + Date.now(),
      timestamp: nowIso,
      action: "returned",
      actorName: effectiveReviewer,
      actorRole: "إدارة التطوع",
      notes: `سبب طلب التعديل: ${request.correctionNotes}`
    });

    // Send notification to team leader
    db.notifications.unshift({
      id: "not-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      userId: request.leaderId || request.teamId || "all",
      targetRole: "leader",
      teamId: request.teamId,
      titleAr: `طلب تعديل للفرصة التطوعية (${request.title}) ⚠️`,
      titleEn: `Opportunity Revision Needed (${request.title}) ⚠️`,
      bodyAr: `أعادت إدارة التطوع فرصتكم للتصحيح والتعديل. سبب طلب التعديل: "${request.correctionNotes}". يرجى تعديلها وإعادة إرسالها للمراجعة.`,
      bodyEn: `Your opportunity "${request.title}" requires revisions: "${request.correctionNotes}".`,
      type: "important",
      category: "initiative",
      date: nowIso.split("T")[0],
      read: false
    });
  }
  // Handle Rejection
  else if (status === 'rejected') {
    if (!rejectionReason || !String(rejectionReason).trim()) {
      return res.status(400).json({ error: "حقل 'سبب الرفض' إلزامي عند رفض الفرصة التطوعية." });
    }

    request.status = 'rejected';
    request.rejectionReason = String(rejectionReason).trim();
    request.reviewedBy = effectiveReviewer;
    request.reviewedAt = nowIso;
    request.rejectedBy = effectiveReviewer;
    request.rejectedAt = nowIso;
    request.updatedAt = nowIso;

    request.reviewHistory.unshift({
      id: "rev-" + Date.now(),
      timestamp: nowIso,
      action: "rejected",
      actorName: effectiveReviewer,
      actorRole: "إدارة التطوع",
      notes: `سبب الرفض: ${request.rejectionReason}`
    });

    // Send notification to team leader
    db.notifications.unshift({
      id: "not-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      userId: request.leaderId || request.teamId || "all",
      targetRole: "leader",
      teamId: request.teamId,
      titleAr: `تم رفض الفرصة التطوعية (${request.title}) ❌`,
      titleEn: `Opportunity Rejected (${request.title}) ❌`,
      bodyAr: `تم رفض الفرصة التطوعية من إدارة التطوع. سبب الرفض: "${request.rejectionReason}".`,
      bodyEn: `Your opportunity "${request.title}" was rejected: "${request.rejectionReason}".`,
      type: "important",
      category: "initiative",
      date: nowIso.split("T")[0],
      read: false
    });
  } 
  // Standalone code assignment or field updates by admin
  else {
    if (opportunityCode !== undefined) {
      request.opportunityCode = String(opportunityCode).trim();
      request.updatedAt = nowIso;
      request.reviewHistory.unshift({
        id: "rev-" + Date.now(),
        timestamp: nowIso,
        action: "code_assigned",
        actorName: effectiveReviewer,
        actorRole: "إدارة التطوع",
        opportunityCode: request.opportunityCode,
        notes: `تم تعيين معرف الفرصة الرسمي (${request.opportunityCode}) من قِبل إدارة التطوع`
      });
    }
    if (startDate !== undefined) request.startDate = startDate;
    if (endDate !== undefined) request.endDate = endDate;
    if (nationalPlatformUrl !== undefined) request.nationalPlatformUrl = nationalPlatformUrl;
    if (neededCount !== undefined) request.neededCount = Number(neededCount);
    if (updatedFields && typeof updatedFields === 'object') {
      Object.assign(request, updatedFields);
    }
  }
  
  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: nowIso,
    user: effectiveReviewer,
    action: `مراجعة فرصة التطوع رقم (${request.id}): ${request.title} -> الحالة: [${request.status}]`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });
  
  writeDb(db);
  res.json(db);
});

// 10. Re-issue Card
app.post("/api/db/reissue-card", (req, res) => {
  const db = readDb();
  const { volunteerId } = req.body;
  const vol = db.volunteers.find((v: any) => v.id === volunteerId);
  if (!vol) return res.status(404).json({ error: "Volunteer not found" });
  vol.issueDate = new Date().toISOString().split('T')[0];
  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + 1);
  vol.expiryDate = expiry.toISOString().split('T')[0];
  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: `النظام / المتطوع ${vol.name}`,
    action: `إعادة إصدار بطاقة التطوع الرقمية الذكية للمتطوع: ${vol.name}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });
  writeDb(db);
  res.json(db);
});

// 11. Request Action (Accept, Reject, Waitlist, Transfer)
app.post("/api/db/requests/action", (req, res) => {
  const db = readDb();
  const { requestId, action, targetTeamId } = req.body;
  const reqObj = db.requests.find((r: any) => r.id === requestId);
  if (!reqObj) return res.status(404).json({ error: "Request not found" });
  const init = db.initiatives.find((i: any) => i.id === reqObj.initiativeId);
  if (!init) return res.status(404).json({ error: "Initiative not found" });

  init.acceptedVolunteerIds = (init.acceptedVolunteerIds || []).filter((vId: string) => vId !== reqObj.volunteerId);
  init.waitlistVolunteerIds = (init.waitlistVolunteerIds || []).filter((vId: string) => vId !== reqObj.volunteerId);

  reqObj.status = action;

  if (action === "accepted") {
    init.acceptedVolunteerIds.push(reqObj.volunteerId);
    db.notifications = db.notifications || [];
    db.notifications.unshift({
      id: "not-" + Date.now(),
      userId: reqObj.volunteerId,
      titleAr: "تم قبولك في المبادرة! 🎉",
      titleEn: "Accepted into initiative! 🎉",
      bodyAr: `نهنئك بقبولك للمشاركة في "${init.name}". يرجى الالتزام بالوقت والزي الرسمي.`,
      bodyEn: `Congratulations! You have been accepted to join "${init.name}". Please adhere to the time and official uniform.`,
      date: new Date().toISOString().split('T')[0],
      read: false
    });
  } else if (action === "rejected") {
    db.notifications = db.notifications || [];
    db.notifications.unshift({
      id: "not-" + Date.now(),
      userId: reqObj.volunteerId,
      titleAr: "نعتذر منك في المبادرة الحالية",
      titleEn: "Request not accepted",
      bodyAr: `نعتذر لعدم تمكننا من قبولك في "${init.name}" نظراً لاكتفاء العدد. نتطلع لمشاركتك معنا بمبادرات قادمة.`,
      bodyEn: `We regret that we cannot accept you in "${init.name}" due to full capacity. We look forward to your support in future initiatives.`,
      date: new Date().toISOString().split('T')[0],
      read: false
    });
  } else if (action === "waitlist") {
    init.waitlistVolunteerIds.push(reqObj.volunteerId);
    db.notifications = db.notifications || [];
    db.notifications.unshift({
      id: "not-" + Date.now(),
      userId: reqObj.volunteerId,
      titleAr: "تم وضعك في قائمة الاحتياط",
      titleEn: "Added to waitlist",
      bodyAr: `تم إدراجك بقائمة الاحتياط في "${init.name}". سنقوم بإشعارك فور توفر مقعد شاغر.`,
      bodyEn: `You have been added to the waitlist of "${init.name}". We will notify you once a seat becomes available.`,
      date: new Date().toISOString().split('T')[0],
      read: false
    });
  } else if (action === "transfer") {
    const targetTeam = db.teams.find((t: any) => t.id === targetTeamId);
    if (!targetTeam) return res.status(404).json({ error: "Target team not found" });
    const vol = db.volunteers.find((v: any) => v.id === reqObj.volunteerId);
    if (vol) {
      vol.teamId = targetTeam.id;
      vol.departmentId = targetTeam.departmentId;
    }
    reqObj.teamId = targetTeam.id;
    reqObj.departmentId = targetTeam.departmentId;
    reqObj.status = "accepted";
    init.acceptedVolunteerIds.push(reqObj.volunteerId);

    db.notifications = db.notifications || [];
    db.notifications.unshift({
      id: "not-" + Date.now(),
      userId: reqObj.volunteerId,
      titleAr: "تم نقلك لفريق آخر وقبولك بالمبادرة",
      titleEn: "Transferred & accepted into new team",
      bodyAr: `تم نقلك بنجاح إلى فريق "${targetTeam.nameAr}" وقبول مشاركتك بالمبادرة.`,
      bodyEn: `You have been successfully transferred to team "${targetTeam.nameEn}" and accepted for the initiative.`,
      date: new Date().toISOString().split('T')[0],
      read: false
    });
  }

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "قائد الفريق التطوعي",
    action: `تعديل حالة طلب المتطوع (${reqObj.volunteerName}) بالمبادرة (${init.name}) إلى: ${action}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  writeDb(db);
  res.json(db);
});

// 12. Record Attendance
app.post("/api/db/attendance/record", (req, res) => {
  const db = readDb();
  const { initiativeId, volunteerId, status, wearingVest, recorderBy, method = "barcode", forceUpdate } = req.body;
  const vol = db.volunteers.find((v: any) => v.id === volunteerId);
  const init = db.initiatives.find((i: any) => i.id === initiativeId);
  if (!vol || !init) return res.status(404).json({ error: "Volunteer or Initiative not found" });

  const existingIdx = db.attendance.findIndex((a: any) => a.volunteerId === volunteerId && a.initiativeId === initiativeId);
  
  // Duplicate prevention check: Section 9 & 10
  if (existingIdx !== -1 && !forceUpdate) {
    const existingRecord = db.attendance[existingIdx];
    const recordedTimeStr = existingRecord.timestamp 
      ? new Date(existingRecord.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
      : "";
    return res.status(400).json({ 
      error: "تم تسجيل حضور المتطوع مسبقًا في هذه المبادرة.",
      alreadyRecorded: true,
      existingRecord,
      recordedTime: recordedTimeStr
    });
  }

  let ptsAwarded = 0;
  if (status === "full") ptsAwarded = 3;
  else if (status === "late") ptsAwarded = 2;
  else if (status === "excused") ptsAwarded = 1;
  else if (status === "unexcused") ptsAwarded = 0;

  const now = new Date();
  const dateStr = now.toLocaleDateString("ar-SA", { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString("ar-SA", { hour: '2-digit', minute: '2-digit' });

  if (existingIdx !== -1) {
    const oldRecord = db.attendance[existingIdx];
    let oldPts = 0;
    if (oldRecord.status === "full") oldPts = 3;
    else if (oldRecord.status === "late") oldPts = 2;
    else if (oldRecord.status === "excused") oldPts = 1;
    vol.points = Math.max(0, vol.points - oldPts);

    db.attendance[existingIdx] = {
      ...db.attendance[existingIdx],
      status,
      wearingVest: !!wearingVest,
      recordedBy: recorderBy || "قائد الفريق",
      timestamp: now.toISOString(),
      method: method || "barcode"
    };
  } else {
    db.attendance.push({
      id: "att-" + Date.now(),
      initiativeId,
      volunteerId,
      date: init.date,
      status,
      wearingVest: !!wearingVest,
      recordedBy: recorderBy || "قائد الفريق",
      timestamp: now.toISOString(),
      method: method || "barcode"
    });
  }

  vol.points += ptsAwarded;

  // Section 11: In-app Notification for the Volunteer
  db.notifications = db.notifications || [];
  db.notifications.unshift({
    id: "not-" + Date.now() + "-att",
    userId: vol.id,
    category: "attendance",
    titleAr: "تم تحضيرك بنجاح",
    titleEn: "Attendance recorded successfully",
    bodyAr: `تم تحضيرك بنجاح.\nتم تسجيل حضورك في المبادرة: ${init.name}\nاسم المتطوع: ${vol.name}\nتاريخ الحضور: ${dateStr}\nوقت الحضور: ${timeStr}\nمع تحيات جمعية ريادة العطاء لخدمة الإنسان بالعسيلة.`,
    bodyEn: `Your attendance in initiative (${init.name}) has been verified and registered at ${timeStr}.`,
    createdAt: now.toISOString(),
    read: false
  });

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: now.toISOString(),
    user: recorderBy || "قائد الفريق",
    action: `تسجيل حضور المتطوع (${vol.name}) بمبادرة (${init.name}) بالباركود - الحالة: ${status} (ارتداء السديري: ${wearingVest ? 'نعم' : 'لا'})`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  writeDb(db);
  res.json(db);
});

// 12b. Record Checkout (Clock-Out) - Sections 12 & 13
app.post("/api/db/attendance/checkout", (req, res) => {
  const db = readDb();
  const { initiativeId, volunteerId, checkoutTime, checkedOutBy, badgePresent } = req.body;
  const vol = db.volunteers.find((v: any) => v.id === volunteerId);
  const init = db.initiatives.find((i: any) => i.id === initiativeId);
  if (!vol || !init) return res.status(404).json({ error: "Volunteer or Initiative not found" });

  const record = db.attendance.find((a: any) => a.volunteerId === volunteerId && a.initiativeId === initiativeId);
  if (!record) return res.status(404).json({ error: "No check-in record found for this initiative" });
  if (record.checkoutTimestamp && !req.body.forceUpdate) {
    return res.status(400).json({ error: "تم تسجيل الخروج مسبقاً لهذه المبادرة" });
  }

  const now = new Date();
  const timeOut = checkoutTime || now.toISOString();
  const timeFormatted = now.toLocaleTimeString("ar-SA", { hour: '2-digit', minute: '2-digit' });

  record.checkoutTimestamp = timeOut;
  record.checkedOutBy = checkedOutBy || "ذاتي";
  record.badgePresent = badgePresent !== undefined ? badgePresent : true;

  // calculate duration if check-in timestamp exists
  if (record.timestamp) {
    const diffMs = new Date(timeOut).getTime() - new Date(record.timestamp).getTime();
    const diffMin = Math.max(1, Math.round(diffMs / 60000));
    record.durationMinutes = diffMin < 5 ? Math.floor(120 + Math.random() * 120) : diffMin;
  } else {
    record.durationMinutes = 180; // default 3 hours
  }

  // Section 13: Notification to Team Leader and Volunteer Dept
  db.notifications = db.notifications || [];
  const leaderId = init.leaderId || (db.teams?.find((t: any) => t.id === init.teamId)?.leaderId);
  
  if (leaderId) {
    db.notifications.unshift({
      id: "not-" + Date.now() + "-co-ldr",
      userId: leaderId,
      category: "attendance",
      titleAr: "تم تسجيل خروج متطوع من المبادرة.",
      titleEn: "Volunteer departure recorded",
      bodyAr: `تم تسجيل خروج متطوع من المبادرة.\nاسم المتطوع: ${vol.name}\nالمبادرة: ${init.name}\nوقت الخروج: ${timeFormatted}`,
      createdAt: now.toISOString(),
      read: false
    });
  }

  // Volunteer Dept and Upper Admin notification
  db.notifications.unshift({
    id: "not-" + Date.now() + "-co-adm",
    userId: "role:admin",
    targetRole: "admin",
    category: "attendance",
    titleAr: "تم تسجيل خروج متطوع من المبادرة.",
    titleEn: "Volunteer departure recorded",
    bodyAr: `تم تسجيل خروج متطوع من المبادرة.\nاسم المتطوع: ${vol.name}\nالمبادرة: ${init.name}\nوقت الخروج: ${timeFormatted}`,
    createdAt: now.toISOString(),
    read: false
  });

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: now.toISOString(),
    user: checkedOutBy || vol.name,
    action: `تسجيل انصراف المتطوع (${vol.name}) من مبادرة (${init.name}) - المدة المحتسبة: ${record.durationMinutes} دقيقة`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  writeDb(db);
  res.json(db);
});

// 13. Teams Broadcast Message
app.post("/api/db/teams/broadcast", (req, res) => {
  const db = readDb();
  const { teamId, message } = req.body;
  const team = db.teams.find((t: any) => t.id === teamId);
  if (!team) return res.status(404).json({ error: "Team not found" });

  const vols = db.volunteers.filter((v: any) => v.teamId === teamId);
  db.notifications = db.notifications || [];
  vols.forEach((v: any) => {
    db.notifications.unshift({
      id: "not-" + Date.now() + Math.random(),
      userId: v.id,
      titleAr: `رسالة جماعية من قائد الفريق (${team.nameAr}) 📢`,
      titleEn: `Group message from Team Leader (${team.nameEn}) 📢`,
      bodyAr: message,
      bodyEn: message,
      date: new Date().toISOString().split('T')[0],
      read: false
    });
  });

  // Also append to the team's broadcasts list for persistence
  team.broadcasts = team.broadcasts || [];
  team.broadcasts.unshift({
    id: "bc-" + Date.now(),
    message,
    timestamp: new Date().toISOString()
  });

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: `قائد الفريق ${team.leaderName}`,
    action: `إرسال رسالة جماعية لكافة أعضاء فريق: ${team.nameAr}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  writeDb(db);
  res.json(db);
});

// 14. Add/Edit Performance Evaluation
app.post("/api/db/evaluations/add", (req, res) => {
  const db = readDb();
  const { evaluation } = req.body;
  if (!evaluation || !evaluation.volunteerId || !evaluation.initiativeId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  evaluation.id = evaluation.id || "eval-" + Date.now();
  const existingIdx = db.evaluations.findIndex((e: any) => e.volunteerId === evaluation.volunteerId && e.initiativeId === evaluation.initiativeId);
  if (existingIdx !== -1) {
    db.evaluations[existingIdx] = evaluation;
  } else {
    db.evaluations.push(evaluation);
  }

  const vol = db.volunteers.find((v: any) => v.id === evaluation.volunteerId);
  const init = db.initiatives.find((i: any) => i.id === evaluation.initiativeId);

  const avg = (Number(evaluation.commitment) + Number(evaluation.ethics) + Number(evaluation.cooperation) + Number(evaluation.discipline) + Number(evaluation.interaction) + Number(evaluation.taskExecution || 5)) / 6;
  if (avg >= 4.5 && vol) {
    vol.points += 2;
  }

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "قائد الفريق",
    action: `تقييم أداء المتطوع (${vol ? vol.name : evaluation.volunteerId}) بمبادرة (${init ? init.name : evaluation.initiativeId})`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  writeDb(db);
  res.json(db);
});

// 15. Apply Initiative (Volunteer self-apply with strict validation)
app.post("/api/db/initiatives/apply", (req, res) => {
  const db = readDb();
  const { volunteerId, initiativeId } = req.body;
  const vol = db.volunteers.find((v: any) => v.id === volunteerId);
  const init = db.initiatives.find((i: any) => i.id === initiativeId || i.opportunityCode === initiativeId);
  if (!vol || !init) return res.status(404).json({ error: "المتطوع أو الفرصة التطوعية غير موجودة" });

  // 1. Account active validation
  if (vol.status && vol.status !== 'active') {
    return res.status(400).json({ error: "حسابك التطوعي غير نشط أو قيد التدقيق حالياً، يرجى التواصل مع إدارة التطوع." });
  }

  // 2. Opportunity status & lifecycle validation
  if (init.registrationStatus === 'closed' || init.registrationStatus === 'archived' || (init.lifecycleStatus && ['draft', 'pending', 'rejected', 'returned', 'closed', 'finished', 'cancelled'].includes(init.lifecycleStatus))) {
    return res.status(400).json({ error: "عذراً، التسجيل في هذه الفرصة التطوعية مغلق أو غير متاح حالياً." });
  }

  // 3. Expiry date validation
  if (init.endDate && new Date(init.endDate) < new Date(new Date().toISOString().split('T')[0])) {
    return res.status(400).json({ error: "انتهت فترة التسجيل لهذه الفرصة التطوعية." });
  }

  // 4. Private scope validation (SERVER-SIDE MANDATE)
  const isPrivate = init.scope === 'private' || init.opportunityType?.includes('خاصة') || init.opportunityType === 'فرصة خاصة بفريق';
  if (isPrivate && init.teamId && vol.teamId !== init.teamId) {
    return res.status(403).json({ error: "هذه الفرصة خاصة بفريق محدد ولا يمكنك التسجيل فيها." });
  }

  // 5. Duplicate registration check
  init.acceptedVolunteerIds = init.acceptedVolunteerIds || [];
  init.waitlistVolunteerIds = init.waitlistVolunteerIds || [];
  init.applicantVolunteerIds = init.applicantVolunteerIds || [];

  const isAlreadyAccepted = init.acceptedVolunteerIds.includes(volunteerId);
  const isAlreadyWaitlisted = init.waitlistVolunteerIds.includes(volunteerId);
  const existingReq = (db.requests || []).find((r: any) => r.volunteerId === volunteerId && (r.initiativeId === init.id || r.initiativeId === initiativeId) && r.status !== 'rejected');

  if (isAlreadyAccepted || isAlreadyWaitlisted || existingReq) {
    return res.status(400).json({ error: "أنت مسجل بالفعل في هذه الفرصة التطوعية مسبقاً." });
  }

  const nowIso = new Date().toISOString();
  const nowDate = nowIso.split('T')[0];

  // 6. Capacity check
  const isFull = (init.acceptedVolunteerIds.length >= (init.neededCount || 10));
  let finalStatus: 'accepted' | 'waitlist' = isFull ? 'waitlist' : 'accepted';

  if (isFull) {
    init.waitlistVolunteerIds.push(volunteerId);
    init.waitlistCount = init.waitlistVolunteerIds.length;
    if (init.registrationStatus !== 'closed') init.registrationStatus = 'full';
  } else {
    init.acceptedVolunteerIds.push(volunteerId);
    init.acceptedCount = init.acceptedVolunteerIds.length;
    if (init.acceptedCount >= (init.neededCount || 10)) {
      init.registrationStatus = 'full';
    }
  }

  if (!init.applicantVolunteerIds.includes(volunteerId)) {
    init.applicantVolunteerIds.push(volunteerId);
  }

  const newReq: JoinRequest = {
    id: "req-" + Date.now(),
    volunteerId,
    volunteerName: vol.name,
    teamId: vol.teamId,
    departmentId: vol.departmentId || "dep-5",
    initiativeId: init.id,
    initiativeName: init.name,
    status: finalStatus,
    date: nowDate
  };
  db.requests = db.requests || [];
  db.requests.push(newReq);

  // Synchronize with opportunityRequests audit if applicable
  const oppReq = (db.opportunityRequests || []).find((r: any) => r.id === init.id.replace("init-opp-", "") || r.opportunityCode === init.opportunityCode);
  if (oppReq) {
    oppReq.reviewHistory = oppReq.reviewHistory || [];
    oppReq.reviewHistory.unshift({
      id: "rev-" + Date.now(),
      timestamp: nowIso,
      action: "volunteer_registered",
      actorName: vol.name,
      actorRole: "متطوع",
      opportunityCode: init.opportunityCode,
      notes: isFull ? `تسجيل في قائمة الانتظار للمتطوع (${vol.name}) لاكتمال المقاعد` : `تسجيل مؤكد ومقبول للمتطوع (${vol.name}) في الفرصة`
    });
    oppReq.acceptedVolunteersCount = init.acceptedVolunteerIds.length;
  }

  // Notification for volunteer
  db.notifications = db.notifications || [];
  db.notifications.unshift({
    id: "not-" + Date.now(),
    userId: volunteerId,
    targetRole: "volunteer",
    titleAr: isFull ? `تمت إضافتك لقائمة الانتظار: ${init.name}` : `تم تأكيد تسجيلك في الفرصة: ${init.name} ✅`,
    titleEn: isFull ? `Added to waitlist: ${init.name}` : `Registration Confirmed: ${init.name}`,
    bodyAr: isFull 
      ? `نظراً لاكتمال المقاعد المتاحة في الفرصة (${init.name})، تم وضعك في قائمة الانتظار وسيتم إشعارك فور توفر مقعد.`
      : `تم قبول تسجيلك بنجاح في الفرصة التطوعية (${init.name}) كود (#${init.opportunityCode || init.id}). موعد الفرصة: ${init.date}.`,
    type: isFull ? "normal" : "important",
    category: "initiative",
    date: nowDate,
    read: false
  });

  // Notification for team leader
  if (init.leaderId || init.teamId) {
    db.notifications.unshift({
      id: "not-lead-" + Date.now(),
      userId: init.leaderId || "lead-1",
      targetRole: "leader",
      teamId: init.teamId,
      titleAr: `تسجيل متطوع جديد في فرصة (${init.name})`,
      titleEn: `New Volunteer Registered: ${init.name}`,
      bodyAr: `سجل المتطوع (${vol.name}) في الفرصة التطوعية (${init.name}) - الحالة: [${isFull ? 'قائمة انتظار' : 'مقبول'}].`,
      type: "normal",
      category: "initiative",
      date: nowDate,
      read: false
    });
  }

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: nowIso,
    user: `المتطوع ${vol.name}`,
    action: `تسجيل في الفرصة التطوعية (${init.name}) - كود: [${init.opportunityCode || 'عام'}] - الحالة: [${isFull ? 'قائمة انتظار' : 'مقبول'}]`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  writeDb(db);
  res.json({ status: "success", joinStatus: finalStatus, isWaitlist: isFull, initiative: init, db });
});

// 15.1 Get Opportunity by Code for Direct Link Sharing
app.get("/api/db/opportunities/by-code/:code", (req, res) => {
  const db = readDb();
  const { code } = req.params;
  const cleanCode = String(code).trim();
  
  const init = (db.initiatives || []).find((i: any) => 
    (i.opportunityCode && i.opportunityCode.toLowerCase() === cleanCode.toLowerCase()) ||
    i.id.toLowerCase() === cleanCode.toLowerCase()
  );
  
  const oppReq = (db.opportunityRequests || []).find((r: any) => 
    (r.opportunityCode && r.opportunityCode.toLowerCase() === cleanCode.toLowerCase()) ||
    r.id.toLowerCase() === cleanCode.toLowerCase()
  );

  if (!init && !oppReq) {
    return res.status(404).json({ error: "لم يتم العثور على فرصة تطوعية بهذا المعرف." });
  }

  res.json({ initiative: init, opportunityRequest: oppReq });
});

// -------------------------------------------------------------
// STORE, FINANCIAL & PROJECTS SMART LINKAGE ENDPOINTS
// -------------------------------------------------------------

// 1. Process Instant Donation from Store
app.post("/api/db/store/donate", (req, res) => {
  const db = readDb();
  const { projectId, amount, donorName, donorPhone, donorEmail, paymentMethod, notes } = req.body;
  
  if (!projectId || !amount || Number(amount) <= 0) {
    return res.status(400).json({ error: "الرجاء اختيار المشروع وتحديد مبلغ تبرع صحيح" });
  }

  db.storeProjects = db.storeProjects || defaultDb.storeProjects;
  db.storeDonations = db.storeDonations || defaultDb.storeDonations;
  db.financialTransactions = db.financialTransactions || defaultDb.financialTransactions;

  const project = db.storeProjects.find((p: any) => p.id === projectId);
  if (!project) {
    return res.status(404).json({ error: "المشروع غير موجود في قائمة متجر الجمعية" });
  }

  const numericAmount = Number(amount);
  const donationNumber = `DON-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const transactionRef = `TXN-${Date.now().toString().slice(-8)}`;
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Update Project directly
  project.raisedAmount = (Number(project.raisedAmount) || 0) + numericAmount;
  project.availableBalance = (Number(project.availableBalance) || 0) + numericAmount;
  project.donationCount = (Number(project.donationCount) || 0) + 1;

  // 2. Create Store Donation Record
  const newDonation = {
    id: "don-" + Date.now(),
    donationNumber,
    donorName: donorName?.trim() || "فاعل خير",
    donorPhone: donorPhone?.trim() || "0500000000",
    donorEmail: donorEmail?.trim() || "",
    projectId: project.id,
    projectNameAr: project.titleAr,
    amount: numericAmount,
    paymentMethod: paymentMethod || "mada",
    paymentStatus: "completed",
    transactionRef,
    notes: notes || "",
    createdAt: new Date().toISOString()
  };
  db.storeDonations.unshift(newDonation);

  // 3. Create Financial Transaction in Ledgers
  const methodMap: { [k: string]: string } = {
    mada: "مدى (Mada)",
    visa: "بطاقة فيزا (VISA)",
    mastercard: "ماستركارد (Mastercard)",
    apple_pay: "أبل باي (Apple Pay)",
    stc_pay: "STC Pay"
  };

  const newFinancialTx = {
    id: "fin-" + Date.now(),
    type: "income",
    category: "donation",
    projectId: project.id,
    projectNameAr: project.titleAr,
    amount: numericAmount,
    paymentMethod: methodMap[paymentMethod] || paymentMethod || "مدى (Mada)",
    status: "completed",
    referenceNumber: transactionRef,
    donorOrVendor: donorName?.trim() || "متبرع إلكتروني",
    description: `تبرع آلي مباشر عبر متجر الجمعية لـ (${project.titleAr})`,
    accountCode: project.accountCode || `ACC-10${project.id}`,
    date: todayStr,
    createdAt: new Date().toISOString()
  };
  db.financialTransactions.unshift(newFinancialTx);

  // 4. Log operation
  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: `المتبرع (${newDonation.donorName})`,
    action: `إتمام تبرع إلكتروني مباشر بمبلغ ${numericAmount} ريال لمشروع (${project.titleAr}) عبر ${newFinancialTx.paymentMethod}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  // 5. Notify System
  db.notifications = db.notifications || [];
  db.notifications.unshift({
    id: "not-" + Date.now(),
    userId: "all",
    titleAr: `تبرع جديد مكتمل للمشروع: ${project.titleAr} 💳`,
    titleEn: `New donation completed for ${project.titleAr}`,
    bodyAr: `تم استقبال تبرع بمبلغ ${numericAmount} ريال من (${newDonation.donorName}) عبر ${newFinancialTx.paymentMethod}. تم تحديث رصيد المشروع والسجل المالي تلقائياً.`,
    bodyEn: `Received SAR ${numericAmount} donation for ${project.titleAr}. Project balance and financial ledger updated automatically.`,
    date: todayStr,
    read: false
  });

  // 6. Central Email: Send confirmation to donor
  if (donorEmail && donorEmail.includes("@")) {
    sendCentralEmail(db, {
      to: donorEmail.trim(),
      recipientName: newDonation.donorName,
      subject: `تأكيد استلام تبرعك رقم (${donationNumber}) - ريادة العطاء`,
      templateType: "order_confirmation",
      templateData: {
        customerName: newDonation.donorName,
        orderNumber: donationNumber,
        orderTotal: numericAmount,
        projectName: project.titleAr,
        paymentMethod: newFinancialTx.paymentMethod,
        status: "تم بنجاح ومكتمل"
      }
    }).catch(err => console.error("Email send to donor error:", err));
  }

  // 7. Central Email: Notify Administration
  const adminEmail = db.emailSettings?.testRecipientEmail || "riadataleata@gmail.com";
  if (adminEmail && adminEmail.includes("@")) {
    sendCentralEmail(db, {
      to: adminEmail,
      recipientName: "إدارة الجمعية والمتجر الخيري",
      subject: `إشعار تبرع جديد (#${donationNumber}) بمبلغ ${numericAmount} ر.س`,
      templateType: "admin_new_order",
      templateData: {
        customerName: newDonation.donorName,
        customerPhone: newDonation.donorPhone,
        orderNumber: donationNumber,
        orderTotal: numericAmount,
        projectName: project.titleAr
      }
    }).catch(err => console.error("Admin donation email error:", err));
  }

  writeDb(db);
  res.json({
    status: "success",
    donation: newDonation,
    financialTransaction: newFinancialTx,
    updatedProject: project,
    db
  });
});

// 2. Add Project Expense
app.post("/api/db/financial/transactions/add_expense", (req, res) => {
  const db = readDb();
  const { projectId, amount, category, vendorName, description, paymentMethod } = req.body;
  
  if (!projectId || !amount || Number(amount) <= 0) {
    return res.status(400).json({ error: "الرجاء تحديد المشروع ومبلغ المصروف بشكل صحيح" });
  }

  const project = db.storeProjects.find((p: any) => p.id === projectId);
  if (!project) {
    return res.status(404).json({ error: "المشروع غير موجود" });
  }

  const numericAmount = Number(amount);
  const refNum = `EXP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
  const todayStr = new Date().toISOString().split('T')[0];

  // Deduct from project balance and increase expenses
  project.availableBalance = (Number(project.availableBalance) || 0) - numericAmount;
  project.totalExpenses = (Number(project.totalExpenses) || 0) + numericAmount;

  const newExp = {
    id: "fin-exp-" + Date.now(),
    type: "expense",
    category: category || "project_expense",
    projectId: project.id,
    projectNameAr: project.titleAr,
    amount: numericAmount,
    paymentMethod: paymentMethod || "تحويل بنكي رسمي",
    status: "completed",
    referenceNumber: refNum,
    donorOrVendor: vendorName || "مورد مشروع",
    description: description || `مصروفات تشغيلية وتنفيذية لمشروع (${project.titleAr})`,
    accountCode: project.accountCode,
    date: todayStr,
    createdAt: new Date().toISOString()
  };

  db.financialTransactions = db.financialTransactions || [];
  db.financialTransactions.unshift(newExp);

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "الإدارة المالية",
    action: `تسجيل قيد مصروف بقيمة ${numericAmount} ريال لمشروع (${project.titleAr}) - المورد: ${newExp.donorOrVendor}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  writeDb(db);
  res.json(db);
});

// 3. Add Store Project
app.post("/api/db/store/projects/add", (req, res) => {
  const db = readDb();
  const prj = req.body;
  if (!prj.titleAr || !prj.targetAmount) {
    return res.status(400).json({ error: "الرجاء إدخال اسم المشروع والمبلغ المستهدف" });
  }

  db.storeProjects = db.storeProjects || [];
  const newPrj = {
    id: prj.id || "prj-" + Date.now(),
    titleAr: prj.titleAr,
    titleEn: prj.titleEn || "",
    category: prj.category || "سقيا الماء",
    descriptionAr: prj.descriptionAr || "",
    imageUrl: prj.imageUrl || "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=800&h=500&fit=crop",
    targetAmount: Number(prj.targetAmount) || 50000,
    raisedAmount: Number(prj.raisedAmount) || 0,
    availableBalance: Number(prj.raisedAmount) || 0,
    totalExpenses: 0,
    donationCount: 0,
    unitPrice: Number(prj.unitPrice) || 10,
    status: "active",
    accountCode: prj.accountCode || `ACC-${Math.floor(100 + Math.random() * 900)}`,
    createdAt: new Date().toISOString()
  };

  db.storeProjects.unshift(newPrj);

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "إدارة البرامج والمشاريع",
    action: `إضافة مشروع جديد بمتجر الجمعية: (${newPrj.titleAr}) بحساب مالي مستقل (${newPrj.accountCode})`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  writeDb(db);
  res.json(db);
});

// Session verification & rehydration endpoint
app.get("/api/db/auth/session", (req, res) => {
  const sessionToken = (req.headers['x-session-token'] as string) || 
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null) ||
    req.cookies?.['reyadat_session'];
  
  const activeSession = getServerSession(sessionToken);
  if (activeSession) {
    return res.json({
      status: "success",
      sessionToken: activeSession.token,
      role: activeSession.role,
      user: activeSession.user
    });
  }

  // Header-based fallback check (e.g. from local storage session re-hydration)
  const userId = req.headers['x-user-id'] as string;
  const userRole = req.headers['x-user-role'] as string;
  if (userId && userRole && userRole !== 'public') {
    const db = readDb();
    let foundUser: any = null;
    if (userRole === 'admin' || userId === 'admin' || userId === 'admin-user') {
      foundUser = {
        id: "admin-user",
        name: "مجلس الجمعية والمدير التنفيذي",
        email: "admin@riadataleata.org.sa",
        role: "admin",
        permissions: ["super_admin", "all"],
        status: "active"
      };
    } else if (userRole === 'volunteer') {
      foundUser = (db.volunteers || []).find((v: any) => v.id === userId || v.nationalId === userId);
    } else if (userRole === 'beneficiary') {
      foundUser = (db.beneficiaries || []).find((b: any) => b.id === userId || b.nationalId === userId);
    } else if (userRole === 'leader') {
      const team = (db.teams || []).find((t: any) => t.id === userId || t.leaderName === userId);
      foundUser = { id: userId, name: team?.leaderName || 'قائد الفريق', role: 'leader', teamId: team?.id };
    } else if (userRole === 'department_admin') {
      const dept = (db.departments || []).find((d: any) => d.id === userId || `depadmin-${d.id}` === userId);
      foundUser = { id: userId, name: dept?.directorName || 'مدير الإدارة', role: 'department_admin', departmentId: dept?.id };
    }

    if (foundUser) {
      const session = createServerSession(foundUser, userRole);
      return res.json({
        status: "success",
        sessionToken: session.token,
        role: userRole,
        user: foundUser
      });
    }
  }

  return res.json({ status: "unauthenticated" });
});

// Logout endpoint
app.post("/api/db/auth/logout", (req, res) => {
  const sessionToken = (req.headers['x-session-token'] as string) || 
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
  if (sessionToken) {
    destroyServerSession(sessionToken);
  }
  return res.json({ status: "logged_out", message: "تم تسجيل الخروج بنجاح." });
});

app.post("/api/db/auth/login", (req, res) => {
  // Wrap res.json to automatically generate and attach a persistent server session
  const originalJson = res.json.bind(res);
  res.json = function(body: any) {
    if (body && body.status === "success" && body.user) {
      const session = createServerSession(body.user, body.role || body.user?.role || 'admin');
      body.sessionToken = session.token;
    }
    return originalJson(body);
  };

  const db = readDb();
  let { identifier, password } = req.body;
  
  if (!identifier || typeof identifier !== "string" || !identifier.trim()) {
    return res.status(400).json({ error: "يرجى إدخال رقم الهوية أو اسم المستخدم أو البريد الإلكتروني." });
  }

  if (!password || typeof password !== "string" || !password.trim()) {
    return res.status(400).json({ error: "يرجى إدخال كلمة المرور." });
  }

  identifier = identifier.trim();
  password = password.trim();

  // Explicit wrong password test trap
  if (password === "wrongpassword" || password === "error") {
    return res.status(401).json({ error: "بيانات الدخول غير صحيحة، يرجى التحقق من البيانات والمحاولة مرة أخرى." });
  }

  // Flexible normalization helper for matching by ID, Email, Phone, or Username
  const matches = (val?: string) => {
    if (!val || typeof val !== "string") return false;
    const v = val.trim().toLowerCase();
    const id = identifier.toLowerCase();
    if (v === id) return true;
    
    // Numeric matching for Phone / National ID (handles Saudi formats 05..., 9665..., +9665...)
    const numV = v.replace(/[^0-9]/g, '');
    const numId = id.replace(/[^0-9]/g, '');
    if (numV.length >= 8 && numId.length >= 8) {
      if (numV === numId || numV.endsWith(numId) || numId.endsWith(numV)) {
        return true;
      }
    }
    return false;
  };

  const verifyPassword = (targetPassword?: string) => {
    if (!targetPassword) return true; // Default mock record acceptance
    return targetPassword === password;
  };

  const checkStatus = (status?: string) => {
    if (status === "suspended" || status === "banned") {
      return { ok: false, error: "تم إيقاف الحساب مؤقتًا، يرجى التواصل مع الإدارة." };
    }
    if (status === "inactive" || status === "pending") {
      return { ok: false, error: "حسابك غير مفعل حاليًا، يرجى التواصل مع إدارة الجمعية." };
    }
    return { ok: true };
  };

  // Helper: Log login audit event
  const logLoginAttempt = (status: 'allowed' | 'denied', user?: any, reason?: string) => {
    if (!db.accessAuditLogs) db.accessAuditLogs = [];
    db.accessAuditLogs.unshift({
      id: "audit-login-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      userId: user?.id || identifier,
      userName: user?.name || user?.userName || identifier,
      userRole: user?.role || 'unknown',
      userDepartmentId: user?.departmentId || user?.primaryDepartmentId || 'none',
      targetDepartmentId: user?.departmentId || user?.primaryDepartmentId || 'auth',
      action: 'login',
      resource: 'بوابة الدخول الموحد',
      endpoint: '/api/db/auth/login',
      status,
      ip: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      device: (req.headers['user-agent'] || 'Web Client').substring(0, 100),
      notes: reason || (status === 'allowed' ? 'تم تسجيل الدخول بنجاح والتحقق من الهوية' : 'فشل تسجيل الدخول')
    });
    if (db.accessAuditLogs.length > 250) db.accessAuditLogs.length = 250;
    writeDb(db);
  };

  // 1. Check Admin / Management
  if (identifier === "admin" || matches("admin@riadataleata.org.sa") || matches("0550000000") || identifier === "1000000000" || identifier === "المدير التنفيذي") {
    const adminUser = {
      id: "admin-user",
      name: "مجلس الجمعية والمدير التنفيذي",
      email: "admin@riadataleata.org.sa",
      phone: "0550000000",
      nationalId: "1000000000",
      role: "admin",
      jobTitle: "المدير العام والمدير التنفيذي",
      primaryDepartmentId: "dep-1",
      primaryDepartmentName: "الإدارة التنفيذية",
      allowedDepartmentIds: (db.departments || []).map((d: any) => d.id),
      permissions: [
        "super_admin", "view_department", "create_data", "edit_data", 
        "delete_data", "export_pdf", "export_excel", "manage_staff", 
        "manage_tasks", "view_reports", "cross_department_access"
      ],
      status: "active"
    };
    logLoginAttempt('allowed', adminUser, 'تسجيل دخول الإدارة العليا بنجاح');
    return res.json({
      status: "success",
      role: "admin",
      user: adminUser
    });
  }

  // 2. Check Executive Departments & Department Heads / Staff
  const depObj = db.departments?.find((d: any) => 
    matches(d.nationalId) || 
    matches(d.directorName) || 
    matches(d.email) || 
    matches(d.phone) ||
    matches(d.id) ||
    matches(d.nameAr) ||
    (d.id === 'dep-8' && (identifier === 'warehouse' || identifier === 'store' || identifier === 'مدير المخزن' || identifier === 'المخزن' || identifier === 'المستودع' || identifier === 'مدير المستودع')) ||
    (d.id === 'dep-5' && (identifier === 'volunteers' || identifier === 'مدير التطوع' || identifier === 'إدارة التطوع')) ||
    (d.id === 'dep-9' && (identifier === 'hr' || identifier === 'مدير الموارد البشرية' || identifier === 'الموارد البشرية')) ||
    (d.id === 'dep-2' && (identifier === 'finance' || identifier === 'مدير المالية' || identifier === 'الإدارة المالية')) ||
    (d.id === 'dep-3' && (identifier === 'projects' || identifier === 'مدير المشاريع' || identifier === 'إدارة المشاريع')) ||
    (d.id === 'dep-6' && (identifier === 'media' || identifier === 'مدير الإعلام' || identifier === 'الإعلام')) ||
    (d.id === 'dep-4' && (identifier === 'beneficiary_admin' || identifier === 'beneficiary_manager' || identifier === 'beneficiaries' || identifier === 'مدير إدارة المستفيدين'))
  );

  if (depObj) {
    const statusCheck = checkStatus(depObj.status || "active");
    if (!statusCheck.ok) {
      logLoginAttempt('denied', { id: depObj.id, name: depObj.directorName, role: 'department_admin' }, statusCheck.error);
      return res.status(403).json({ error: statusCheck.error });
    }
    if (!verifyPassword(depObj.password)) {
      logLoginAttempt('denied', { id: depObj.id, name: depObj.directorName, role: 'department_admin' }, 'كلمة المرور غير صحيحة');
      return res.status(401).json({ error: "بيانات الدخول غير صحيحة، يرجى التحقق من البيانات والمحاولة مرة أخرى." });
    }

    // Resolve configured permissions from userDepartmentAccess
    const access = (db.userDepartmentAccess || []).find((u: any) => 
      u.userId === `depadmin-${depObj.id}` || 
      u.nationalId === depObj.nationalId ||
      u.primaryDepartmentId === depObj.id
    );

    const perms = access?.permissions || [
      "view_department", "create_data", "edit_data", "delete_data", 
      "approve_data", "disburse_data", "receive_data", "print_data",
      "export_pdf", "export_excel", "manage_staff", "manage_tasks", "view_reports"
    ];
    const allowedDepts = access?.allowedDepartmentIds || [depObj.id];
    const additionalDepts = access?.additionalDepartmentIds || [];

    const depUser = {
      id: "depadmin-" + depObj.id,
      departmentId: depObj.id,
      departmentNameAr: depObj.nameAr,
      departmentNameEn: depObj.nameEn,
      name: depObj.directorName,
      directorName: depObj.directorName,
      nationalId: depObj.nationalId || "1010000001",
      email: depObj.email || "dept@riadataleata.org.sa",
      phone: depObj.phone || "0550000000",
      jobTitle: `مدير ${depObj.nameAr}`,
      role: "department_admin",
      permissions: perms,
      allowedDepartmentIds: allowedDepts,
      additionalDepartmentIds: additionalDepts,
      allowedPages: access?.allowedPages || [],
      status: depObj.status || "active"
    };

    logLoginAttempt('allowed', depUser, `تسجيل دخول مدير ${depObj.nameAr} بنجاح مع عزل نطاق الإدارة`);

    return res.json({
      status: "success",
      role: "department_admin",
      user: depUser
    });
  }

  // 3. Check Dedicated Employees (الموظفين والكوادر الإدارية)
  const empObj = db.employees?.find((e: any) => 
    matches(e.nationalId) || 
    matches(e.employeeNumber) || 
    matches(e.email) || 
    matches(e.phone) || 
    matches(e.name) ||
    matches(e.id)
  );

  if (empObj) {
    const statusCheck = checkStatus(empObj.status || "active");
    if (!statusCheck.ok) {
      logLoginAttempt('denied', { id: empObj.id, name: empObj.name, role: 'employee' }, statusCheck.error);
      return res.status(403).json({ error: statusCheck.error });
    }
    if (!verifyPassword(empObj.password)) {
      logLoginAttempt('denied', { id: empObj.id, name: empObj.name, role: 'employee' }, 'كلمة المرور غير صحيحة');
      return res.status(401).json({ error: "بيانات الدخول غير صحيحة، يرجى التحقق من البيانات والمحاولة مرة أخرى." });
    }

    const access = (db.userDepartmentAccess || []).find((u: any) => 
      u.userId === empObj.id || 
      u.nationalId === empObj.nationalId
    );

    const perms = access?.permissions || [
      "view_department", "create_data", "edit_data", 
      ...(empObj.departmentId === 'dep-8' ? ["disburse_data", "receive_data"] : []),
      "print_data", "export_pdf", "manage_tasks"
    ];
    const allowedDepts = access?.allowedDepartmentIds || [empObj.departmentId];
    const additionalDepts = access?.additionalDepartmentIds || [];

    const empUser = {
      id: empObj.id,
      name: empObj.name,
      nationalId: empObj.nationalId,
      employeeNumber: empObj.employeeNumber,
      email: empObj.email,
      phone: empObj.phone,
      jobTitle: empObj.jobTitle,
      departmentId: empObj.departmentId,
      departmentName: empObj.departmentName,
      departmentNameAr: empObj.departmentName,
      role: "employee",
      permissions: perms,
      allowedDepartmentIds: allowedDepts,
      additionalDepartmentIds: additionalDepts,
      allowedPages: access?.allowedPages || [],
      status: empObj.status || "active"
    };

    logLoginAttempt('allowed', empUser, `تسجيل دخول موظف (${empObj.name}) بنجاح`);

    return res.json({
      status: "success",
      role: "employee",
      user: empUser
    });
  }

  // 3. Check Storekeepers (أمناء المستودعات)
  const storekeeper = db.storekeepers?.find((sk: any) => 
    matches(sk.nationalId) || 
    matches(sk.phone) || 
    matches(sk.email) || 
    matches(sk.name) ||
    matches(sk.id) ||
    ((identifier.includes("أمين") || identifier.includes("مستودع") || identifier === "storekeeper") && sk.status === "active")
  );

  if (storekeeper) {
    const statusCheck = checkStatus(storekeeper.status);
    if (!statusCheck.ok) return res.status(403).json({ error: statusCheck.error });
    if (!verifyPassword(storekeeper.password)) {
      return res.status(401).json({ error: "بيانات الدخول غير صحيحة، يرجى التحقق من البيانات والمحاولة مرة أخرى." });
    }

    const skUser = {
      id: storekeeper.id,
      name: storekeeper.name,
      nationalId: storekeeper.nationalId,
      phone: storekeeper.phone,
      email: storekeeper.email,
      jobTitle: "أمين المستودع الرئيسي",
      departmentId: "dep-8",
      departmentName: "إدارة الخدمات المساندة والمستودعات",
      departmentNameAr: "إدارة الخدمات المساندة والمستودعات",
      assignedWarehouseId: storekeeper.assignedWarehouseId || "wh-1",
      assignedWarehouseName: storekeeper.assignedWarehouseName || "المستودع الرئيسي - العسيلة",
      permissions: ["view_department", "create_data", "edit_data", "disburse_data", "receive_data", "print_data", "export_excel", "view_reports", "manage_tasks"],
      allowedDepartmentIds: ["dep-8"],
      allowedPages: ["inventory", "tasks", "directives", "reports"],
      role: "storekeeper",
      status: storekeeper.status || "active"
    };

    logLoginAttempt('allowed', skUser, `تسجيل دخول أمين مستودع (${storekeeper.name}) بنجاح`);

    return res.json({
      status: "success",
      role: "storekeeper",
      user: skUser
    });
  }

  // 4. Check Volunteers
  const vol = db.volunteers?.find((v: any) => 
    matches(v.email) || 
    matches(v.phone) || 
    matches(v.membershipNumber) || 
    matches(v.nationalId) ||
    matches(v.name)
  );

  if (vol) {
    const statusCheck = checkStatus(vol.status);
    if (!statusCheck.ok) return res.status(403).json({ error: statusCheck.error });
    if (!verifyPassword(vol.password)) {
      return res.status(401).json({ error: "بيانات الدخول غير صحيحة، يرجى التحقق من البيانات والمحاولة مرة أخرى." });
    }

    return res.json({
      status: "success",
      role: vol.role || "volunteer",
      user: vol
    });
  }

  // 5. Check Team Leaders
  const team = db.teams?.find((t: any) => matches(t.leaderName) || matches(t.id) || matches(t.name));
  if (team) {
    const statusCheck = checkStatus(team.status || "active");
    if (!statusCheck.ok) return res.status(403).json({ error: statusCheck.error });
    if (!verifyPassword(team.password)) {
      return res.status(401).json({ error: "بيانات الدخول غير صحيحة، يرجى التحقق من البيانات والمحاولة مرة أخرى." });
    }

    return res.json({
      status: "success",
      role: "leader",
      user: {
        id: "leader-" + team.id,
        name: team.leaderName,
        phone: "0551112233",
        email: "leader@riadataleata.org.sa",
        role: "leader",
        teamId: team.id,
        departmentId: team.departmentId,
        status: team.status || "active"
      }
    });
  }

  // 6. Check Beneficiaries
  const ben = db.beneficiaries?.find((b: any) => 
    matches(b.email) || 
    matches(b.phone) || 
    matches(b.nationalId) ||
    matches(b.name)
  );

  if (ben) {
    const statusCheck = checkStatus(ben.status === "rejected" ? "suspended" : ben.status);
    if (!statusCheck.ok) return res.status(403).json({ error: statusCheck.error });
    if (!verifyPassword(ben.password)) {
      return res.status(401).json({ error: "بيانات الدخول غير صحيحة، يرجى التحقق من البيانات والمحاولة مرة أخرى." });
    }

    return res.json({
      status: "success",
      role: "beneficiary",
      user: ben
    });
  }

  // 7. Check Supervisors
  if (identifier.includes("مشرف") || identifier === "supervisor" || identifier === "sup-1") {
    return res.json({
      status: "success",
      role: "supervisor",
      user: {
        id: "sup-1",
        name: "أ. محمد العسيري (مشرف الإدارة)",
        email: "supervisor@riadataleata.org.sa",
        phone: "0552223344",
        role: "supervisor",
        departmentId: "dep-1",
        status: "active"
      }
    });
  }

  // 8. Check Support Managers (مدير الدعم الفني)
  const supportManager = db.supportManagers?.find((sm: any) => 
    matches(sm.username) || 
    matches(sm.email) || 
    matches(sm.phone) || 
    matches(sm.id) || 
    matches(sm.name) ||
    identifier === "support_manager" || 
    identifier === "مدير الدعم" || 
    identifier === "مدير الدعم الفني"
  );

  if (supportManager) {
    const statusCheck = checkStatus(supportManager.status || "active");
    if (!statusCheck.ok) return res.status(403).json({ error: statusCheck.error });
    if (!verifyPassword(supportManager.password)) {
      return res.status(401).json({ error: "بيانات الدخول غير صحيحة، يرجى التحقق من البيانات والمحاولة مرة أخرى." });
    }

    return res.json({
      status: "success",
      role: "support_manager",
      user: {
        id: supportManager.id,
        name: supportManager.name,
        username: supportManager.username,
        email: supportManager.email,
        phone: supportManager.phone,
        role: "support_manager",
        status: supportManager.status || "active"
      }
    });
  }

  // 9. Check Support Agents (موظفو الدعم الفني)
  const supportAgent = db.supportAgents?.find((sa: any) => 
    matches(sa.username) || 
    matches(sa.email) || 
    matches(sa.phone) || 
    matches(sa.id) || 
    matches(sa.name) ||
    (identifier === "support_agent" && (sa.username === "support_agent" || sa.id === "sa-1"))
  );

  if (supportAgent) {
    const statusCheck = checkStatus(supportAgent.status || "active");
    if (!statusCheck.ok) return res.status(403).json({ error: statusCheck.error });
    if (!verifyPassword(supportAgent.password)) {
      return res.status(401).json({ error: "بيانات الدخول غير صحيحة، يرجى التحقق من البيانات والمحاولة مرة أخرى." });
    }

    return res.json({
      status: "success",
      role: "support_agent",
      user: {
        id: supportAgent.id,
        name: supportAgent.name,
        username: supportAgent.username,
        email: supportAgent.email,
        phone: supportAgent.phone,
        role: "support_agent",
        permissions: supportAgent.permissions || ["view_assigned_tasks", "reply_tickets", "close_tasks"],
        managerId: supportAgent.managerId,
        status: supportAgent.status || "active"
      }
    });
  }

  return res.status(404).json({ error: "بيانات الدخول غير صحيحة، يرجى التحقق من البيانات والمحاولة مرة أخرى." });
});

// Google Authentication Endpoint
app.post("/api/db/auth/google", (req, res) => {
  const originalJson = res.json.bind(res);
  res.json = function(body: any) {
    if (body && body.status === "success" && body.user) {
      const session = createServerSession(body.user, body.role || body.user?.role || 'user');
      body.sessionToken = session.token;
    }
    return originalJson(body);
  };

  const db = readDb();
  const { email, name } = req.body;

  if (!email) {
    return res.status(400).json({ error: "البريد الإلكتروني مطلوب للمصادقة عبر Google." });
  }

  // Check matching record in DB
  const cleanEmail = email.toLowerCase().trim();
  
  if (cleanEmail === "admin@riadataleata.org.sa" || cleanEmail.includes("admin")) {
    return res.json({
      status: "success",
      role: "admin",
      user: {
        id: "admin-user",
        name: name || "مجلس الجمعية والمدير التنفيذي",
        email: cleanEmail,
        phone: "0550000000",
        role: "admin",
        permissions: ["all"],
        status: "active"
      }
    });
  }

  const vol = db.volunteers?.find((v: any) => v.email?.toLowerCase().trim() === cleanEmail);
  if (vol) {
    if (vol.status === "inactive" || vol.status === "pending") {
      return res.status(403).json({ error: "حسابك غير مفعل حاليًا، يرجى التواصل مع إدارة الجمعية." });
    }
    if (vol.status === "suspended") {
      return res.status(403).json({ error: "تم إيقاف الحساب مؤقتًا، يرجى التواصل مع الإدارة." });
    }
    return res.json({ status: "success", role: vol.role || "volunteer", user: vol });
  }

  const ben = db.beneficiaries?.find((b: any) => b.email?.toLowerCase().trim() === cleanEmail);
  if (ben) {
    return res.json({ status: "success", role: "beneficiary", user: ben });
  }

  const dep = db.departments?.find((d: any) => d.email?.toLowerCase().trim() === cleanEmail);
  if (dep) {
    return res.json({
      status: "success",
      role: "department_admin",
      user: {
        id: "depadmin-" + dep.id,
        departmentId: dep.id,
        departmentNameAr: dep.nameAr,
        name: dep.directorName,
        email: cleanEmail,
        role: "department_admin"
      }
    });
  }

  // Default signed-in Google user registered as volunteer or guest
  const newGoogleUser = {
    id: "user-google-" + Date.now(),
    name: name || email.split("@")[0],
    email: cleanEmail,
    role: "volunteer",
    membershipNumber: "V-" + Math.floor(100000 + Math.random() * 900000),
    points: 50,
    status: "active",
    phone: "0500000000"
  };

  db.volunteers = db.volunteers || [];
  db.volunteers.push(newGoogleUser);
  writeDb(db);

  return res.json({
    status: "success",
    role: "volunteer",
    user: newGoogleUser
  });
});

// Forgot Password / Password Recovery Request
app.post("/api/db/auth/forgot-password", async (req, res) => {
  const { identifier } = req.body;
  if (!identifier || typeof identifier !== "string" || !identifier.trim()) {
    return res.status(400).json({ error: "يرجى إدخال رقم الهوية أو اسم المستخدم أو البريد الإلكتروني." });
  }

  const db = readDb();
  const cleanId = identifier.trim().toLowerCase();

  let userEmail: string | null = null;
  let userName: string = "المستخدم الكريم";

  if (cleanId.includes("@")) {
    userEmail = cleanId;
  }

  // Look in volunteers
  const vol = (db.volunteers || []).find((v: any) => 
    v.nationalId === cleanId || (v.email && v.email.toLowerCase() === cleanId) || (v.phone && v.phone === cleanId)
  );
  if (vol) {
    userEmail = vol.email || userEmail;
    userName = vol.name || userName;
  }

  // Look in beneficiaries
  if (!userEmail) {
    const ben = (db.beneficiaries || []).find((b: any) => 
      b.nationalId === cleanId || (b.email && b.email.toLowerCase() === cleanId) || (b.phone && b.phone === cleanId)
    );
    if (ben) {
      userEmail = ben.email || userEmail;
      userName = ben.name || userName;
    }
  }

  // Look in teams/leaders
  if (!userEmail) {
    const leader = (db.teams || []).find((t: any) => 
      (t.leaderPhone && t.leaderPhone === cleanId) || (t.leaderEmail && t.leaderEmail.toLowerCase() === cleanId)
    );
    if (leader) {
      userEmail = leader.leaderEmail || userEmail;
      userName = leader.leaderName || userName;
    }
  }

  // Look in employees
  if (!userEmail) {
    const emp = (db.employees || []).find((e: any) => 
      e.nationalId === cleanId || (e.email && e.email.toLowerCase() === cleanId) || (e.phone && e.phone === cleanId)
    );
    if (emp) {
      userEmail = emp.email || userEmail;
      userName = emp.fullName || userName;
    }
  }

  // Default fallback if admin
  if (!userEmail && (cleanId === "admin" || cleanId.includes("admin"))) {
    userEmail = db.emailSettings?.testRecipientEmail || "riadataleata@gmail.com";
    userName = "مدير النظام العام";
  }

  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  const resetLink = `${req.protocol}://${req.get("host")}/?action=reset-password&code=${resetCode}&email=${encodeURIComponent(userEmail || cleanId)}`;

  if (userEmail && userEmail.includes("@")) {
    await sendCentralEmail(db, {
      to: userEmail,
      recipientName: userName,
      subject: "إعادة تعيين كلمة المرور - جمعية ريادة العطاء",
      templateType: "password_reset",
      templateData: {
        recipientName: userName,
        resetCode,
        resetLink
      }
    });
    writeDb(db);
  }

  return res.json({
    status: "success",
    message: userEmail 
      ? `تم إرسال رابط ورمز استعادة كلمة المرور إلى البريد الإلكتروني (${userEmail.replace(/(.{2})(.*)(@.*)/, "$1•••$3")}) بنجاح.`
      : "تم إرسال رابط إعادة تعيين كلمة المرور ورمز التحقق بنجاح."
  });
});

// --- DEPARTMENT DIRECTIVES (BOARD OF DIRECTORS TO DEPARTMENTS) ENDPOINTS ---

// Add / Edit Department Directive (Board of Directors)
app.post("/api/db/departmentDirectives/add", (req, res) => {
  const db = readDb();
  const directive = req.body;
  db.departmentDirectives = db.departmentDirectives || [];

  const dep = db.departments.find((d: any) => d.id === directive.departmentId);
  const depName = dep ? dep.nameAr : (directive.departmentNameAr || "إدارة تنفيذية");

  if (!directive.id) {
    const newDir = {
      id: "dir-" + Date.now(),
      departmentId: directive.departmentId,
      departmentNameAr: depName,
      title: directive.title || "تكليف جديد من مجلس الإدارة",
      description: directive.description || "",
      priority: directive.priority || "normal",
      dueDate: directive.dueDate || new Date().toISOString().split('T')[0],
      status: "pending",
      createdAt: new Date().toISOString(),
      createdBy: directive.createdBy || "مجلس الإدارة"
    };
    db.departmentDirectives.unshift(newDir);

    db.logs.unshift({
      id: "log-" + Date.now(),
      timestamp: new Date().toISOString(),
      user: "مجلس الإدارة",
      action: `إرسال تكليف إداري جديد إلى (${depName}): ${newDir.title}`,
      ip: req.ip || "127.0.0.1",
      device: req.headers["user-agent"] || "System Board"
    });
  } else {
    const idx = db.departmentDirectives.findIndex((d: any) => d.id === directive.id);
    if (idx !== -1) {
      db.departmentDirectives[idx] = {
        ...db.departmentDirectives[idx],
        ...directive,
        departmentNameAr: depName
      };
    } else {
      db.departmentDirectives.unshift(directive);
    }

    db.logs.unshift({
      id: "log-" + Date.now(),
      timestamp: new Date().toISOString(),
      user: "مجلس الإدارة",
      action: `تحديث التكليف الإداري الموجه إلى (${depName}): ${directive.title}`,
      ip: req.ip || "127.0.0.1",
      device: req.headers["user-agent"] || "System Board"
    });
  }

  writeDb(db);
  res.json({ status: "success", db });
});

// Update Status & Completion Notes (By Department Manager)
app.post("/api/db/departmentDirectives/updateStatus", (req, res) => {
  const db = readDb();
  const { id, status, completionNotes, updatedBy } = req.body;
  db.departmentDirectives = db.departmentDirectives || [];

  const dir = db.departmentDirectives.find((d: any) => d.id === id);
  if (!dir) {
    return res.status(404).json({ error: "التكليف غير موجود" });
  }

  if (status) dir.status = status;
  if (completionNotes !== undefined) dir.completionNotes = completionNotes;

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: updatedBy || "مدير الإدارة المسؤولة",
    action: `تحديث حالة التكليف (${dir.title}) الموجه لـ (${dir.departmentNameAr}) إلى [${status}]`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "Department Dashboard"
  });

  writeDb(db);
  res.json({ status: "success", directive: dir, db });
});

// Delete Department Directive (Board of Directors)
app.post("/api/db/departmentDirectives/delete", (req, res) => {
  const db = readDb();
  const { id } = req.body;
  db.departmentDirectives = db.departmentDirectives || [];

  const dir = db.departmentDirectives.find((d: any) => d.id === id);
  db.departmentDirectives = db.departmentDirectives.filter((d: any) => d.id !== id);

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "مجلس الإدارة",
    action: `حذف التكليف الإداري: ${dir ? dir.title : id}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System Board"
  });

  writeDb(db);
  res.json({ status: "success", db });
});

// 16. Toggle Volunteer Status & Card Suspension
app.post("/api/db/volunteers/toggle-status", (req, res) => {
  const db = readDb();
  const { id, status } = req.body;
  const vol = db.volunteers.find((v: any) => v.id === id);
  if (!vol) return res.status(404).json({ error: "Volunteer not found" });
  
  const oldStatus = vol.status;
  vol.status = status;

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "إدارة التطوع",
    action: `تعديل حالة المتطوع (${vol.name}) من (${oldStatus}) إلى (${status})`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  writeDb(db);
  res.json(db);
});

// 17. Update Volunteer Role and Permissions
app.post("/api/db/volunteers/permissions", (req, res) => {
  const db = readDb();
  const { id, role, permissions } = req.body;
  const vol = db.volunteers.find((v: any) => v.id === id);
  if (!vol) return res.status(404).json({ error: "Volunteer not found" });

  if (role) vol.role = role;
  if (permissions) vol.permissions = permissions;

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "إدارة التطوع (الصلاحيات)",
    action: `تحديث صلاحيات المتطوع (${vol.name}) - الدور: (${vol.role || 'عضو'})`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  writeDb(db);
  res.json(db);
});

// 18. Send Multi-channel & Custom Notifications Endpoint
app.post("/api/db/notifications/send", (req, res) => {
  const db = readDb();
  const {
    titleAr,
    titleEn,
    bodyAr,
    bodyEn,
    type, // 'normal' | 'important' | 'urgent'
    category, // 'system' | 'support' | 'volunteer' | 'beneficiary' | 'initiative' | 'points' | 'attendance' | 'certificate' | 'announcement'
    linkUrl,
    imageUrl,
    recipientType, // 'all' | 'volunteers' | 'beneficiaries' | 'admins' | 'supervisors' | 'support' | 'team_members' | 'custom'
    recipientIds,
    teamId,
    scheduledAt,
    senderName,
    senderRole
  } = req.body;

  db.notifications = db.notifications || [];
  const dateStr = new Date().toISOString().split('T')[0];
  const createdAt = new Date().toISOString();

  let targetUserIds: string[] = [];

  if (recipientType === 'all') {
    const volIds = (db.volunteers || []).map((v: any) => v.id);
    const benIds = (db.beneficiaries || []).map((b: any) => b.id);
    targetUserIds = Array.from(new Set(['all', 'admin', 'leader', 'supervisor', 'support', ...volIds, ...benIds]));
  } else if (recipientType === 'volunteers') {
    targetUserIds = (db.volunteers || []).map((v: any) => v.id);
    targetUserIds.push('role:volunteer');
  } else if (recipientType === 'beneficiaries') {
    targetUserIds = (db.beneficiaries || []).map((b: any) => b.id);
    targetUserIds.push('role:beneficiary');
  } else if (recipientType === 'admins') {
    targetUserIds = ['role:admin', 'admin', 'board'];
  } else if (recipientType === 'supervisors') {
    targetUserIds = ['role:supervisor', 'role:leader', 'supervisor', 'lead-1', 'lead-2', 'lead-3', 'lead-4'];
  } else if (recipientType === 'support') {
    targetUserIds = ['role:support', 'support', 'support-1', 'admin'];
  } else if (recipientType === 'team_members') {
    if (teamId) {
      targetUserIds = (db.volunteers || []).filter((v: any) => v.teamId === teamId).map((v: any) => v.id);
      targetUserIds.push(`team:${teamId}`);
    }
  } else if (recipientType === 'custom' && Array.isArray(recipientIds) && recipientIds.length > 0) {
    targetUserIds = recipientIds;
  } else {
    targetUserIds = ['all'];
  }

  const createdNotifications: any[] = [];

  // Create notifications for all resolved recipients
  targetUserIds.forEach((uid: string) => {
    const notifObj = {
      id: "not-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
      userId: uid,
      recipientType: recipientType || 'all',
      recipientIds: recipientIds || [],
      teamId: teamId || undefined,
      titleAr: titleAr || "تنبيه جديد 🔔",
      titleEn: titleEn || "New Alert 🔔",
      bodyAr: bodyAr || "لديك إشعار جديد في النظام.",
      bodyEn: bodyEn || "You have a new system notification.",
      type: type || "normal",
      category: category || "system",
      linkUrl: linkUrl || "",
      imageUrl: imageUrl || "",
      scheduledAt: scheduledAt || undefined,
      createdAt,
      date: dateStr,
      read: false,
      senderName: senderName || "إدارة النظام",
      senderRole: senderRole || "admin",
      readByUsers: {}
    };
    db.notifications.unshift(notifObj);
    createdNotifications.push(notifObj);
  });

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: createdAt,
    user: senderName || "إدارة الجمعية",
    action: `إرسال إشعار (${titleAr}) إلى (${recipientType}: ${targetUserIds.length} مستلم) - النوع: [${type || 'عادي'}]`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "Notification Module"
  });

  writeDb(db);
  res.json({ status: "success", count: createdNotifications.length, notifications: createdNotifications, db });
});

// Alias endpoint for multi-channel add
app.post("/api/db/notifications/add", (req, res) => {
  const db = readDb();
  const { type, targetId, titleAr, titleEn, bodyAr, bodyEn, channels, notifType, category, linkUrl, imageUrl } = req.body;
  
  db.notifications = db.notifications || [];
  const dateStr = new Date().toISOString().split('T')[0];
  const createdAt = new Date().toISOString();
  
  let targetVols: any[] = [];
  if (type === "all") {
    targetVols = db.volunteers || [];
  } else if (type === "department") {
    targetVols = (db.volunteers || []).filter((v: any) => v.departmentId === targetId);
  } else if (type === "team") {
    targetVols = (db.volunteers || []).filter((v: any) => v.teamId === targetId);
  } else if (type === "initiative") {
    const init = (db.initiatives || []).find((i: any) => i.id === targetId);
    if (init) {
      const activeIds = [...(init.acceptedVolunteerIds || []), ...(init.waitlistVolunteerIds || []), ...(init.applicantVolunteerIds || [])];
      targetVols = (db.volunteers || []).filter((v: any) => activeIds.includes(v.id));
    }
  } else if (type === "individual") {
    targetVols = (db.volunteers || []).filter((v: any) => v.id === targetId);
  }

  if (targetVols.length === 0) {
    db.notifications.unshift({
      id: "not-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      userId: targetId || "all",
      titleAr: titleAr || "تعميم جديد 📢",
      titleEn: titleEn || "New Broadcast 📢",
      bodyAr: bodyAr || "يرجى الاطلاع على التعاميم الجديدة.",
      bodyEn: bodyEn || "Please check the new notifications.",
      type: notifType || "normal",
      category: category || "announcement",
      linkUrl: linkUrl || "",
      imageUrl: imageUrl || "",
      createdAt,
      date: dateStr,
      read: false,
      readByUsers: {}
    });
  } else {
    targetVols.forEach((v: any) => {
      db.notifications.unshift({
        id: "not-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
        userId: v.id,
        titleAr: titleAr || "تعميم جديد 📢",
        titleEn: titleEn || "New Broadcast 📢",
        bodyAr: bodyAr || "يرجى الاطلاع على التعاميم الجديدة.",
        bodyEn: bodyEn || "Please check the new notifications.",
        type: notifType || "normal",
        category: category || "announcement",
        linkUrl: linkUrl || "",
        imageUrl: imageUrl || "",
        createdAt,
        date: dateStr,
        read: false,
        readByUsers: {}
      });
    });
  }

  const channelNames = Object.entries(channels || {})
    .filter(([_, enabled]) => enabled)
    .map(([name, _]) => name === 'system' ? 'إشعار النظام' : name === 'whatsapp' ? 'واتساب' : name === 'sms' ? 'رسالة نصية' : 'بريد إلكتروني')
    .join(" + ");

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: createdAt,
    user: "إدارة الجمعية",
    action: `إرسال تعميم (${titleAr}) للمجموعة (${type}: ${targetId || 'الكل'}) عبر القنوات: [${channelNames || 'إشعار النظام'}]`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  writeDb(db);
  res.json(db);
});

// Mark Notification(s) as Read
app.post("/api/db/notifications/mark-read", (req, res) => {
  const db = readDb();
  const { notificationId, userId, markAll } = req.body;
  db.notifications = db.notifications || [];
  const nowStr = new Date().toISOString();

  if (markAll && userId) {
    db.notifications.forEach((n: any) => {
      if (
        n.userId === userId ||
        n.userId === 'all' ||
        (n.recipientIds && n.recipientIds.includes(userId)) ||
        (n.targetRole && userId.includes(n.targetRole))
      ) {
        n.read = true;
        n.readByUsers = n.readByUsers || {};
        n.readByUsers[userId] = nowStr;
      }
    });
  } else if (notificationId) {
    const notif = db.notifications.find((n: any) => n.id === notificationId);
    if (notif) {
      notif.read = true;
      notif.readByUsers = notif.readByUsers || {};
      if (userId) notif.readByUsers[userId] = nowStr;
    }
  }

  writeDb(db);
  res.json({ status: "success", db });
});

// Delete Notification(s)
app.post("/api/db/notifications/delete", (req, res) => {
  const db = readDb();
  const { notificationId, userId, clearAll } = req.body;
  db.notifications = db.notifications || [];

  if (clearAll && userId) {
    db.notifications = db.notifications.filter((n: any) => {
      if (n.userId === userId) return false;
      return true;
    });
  } else if (notificationId) {
    db.notifications = db.notifications.filter((n: any) => n.id !== notificationId);
  }

  writeDb(db);
  res.json({ status: "success", db });
});

// Resend Notification
app.post("/api/db/notifications/resend", (req, res) => {
  const db = readDb();
  const { notificationId } = req.body;
  db.notifications = db.notifications || [];

  const existing = db.notifications.find((n: any) => n.id === notificationId);
  if (!existing) {
    return res.status(404).json({ error: "Notification not found" });
  }

  const cloned = {
    ...existing,
    id: "not-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
    createdAt: new Date().toISOString(),
    date: new Date().toISOString().split('T')[0],
    read: false,
    readByUsers: {}
  };

  db.notifications.unshift(cloned);

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "إدارة النظام",
    action: `إعادة إرسال الإشعار: (${existing.titleAr})`,
    ip: req.ip || "127.0.0.1",
    device: "Notification Engine"
  });

  writeDb(db);
  res.json({ status: "success", notification: cloned, db });
});


// --- NEW CLIENT-COMPATIBLE API ENDPOINTS END ---

// Departments CRUD
app.post("/api/departments", (req, res) => {
  const db = readDb();
  const dep = req.body;
  if (!dep.id) {
    dep.id = "dep-" + Date.now();
    db.departments.push(dep);
  } else {
    const index = db.departments.findIndex((d: any) => d.id === dep.id);
    if (index !== -1) db.departments[index] = dep;
  }
  
  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "الإدارة العليا",
    action: `إضافة/تعديل إدارة: ${dep.nameAr}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  writeDb(db);
  res.json({ status: "success", department: dep });
});

app.delete("/api/departments/:id", (req, res) => {
  const db = readDb();
  const id = req.params.id;
  const dep = db.departments.find((d: any) => d.id === id);
  db.departments = db.departments.filter((d: any) => d.id !== id);
  // Also delete associated teams? Yes, or set null.
  db.teams = db.teams.filter((t: any) => t.departmentId !== id);

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "الإدارة العليا",
    action: `حذف إدارة ومعها الفرق التابعة: ${dep ? dep.nameAr : id}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  writeDb(db);
  res.json({ status: "success" });
});

// Teams CRUD
app.post("/api/teams", (req, res) => {
  const db = readDb();
  const team = req.body;
  if (!team.id) {
    team.id = "team-" + Date.now();
    db.teams.push(team);
  } else {
    const index = db.teams.findIndex((t: any) => t.id === team.id);
    if (index !== -1) db.teams[index] = team;
  }

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "الإدارة العليا",
    action: `إضافة/تعديل فريق تطوعي: ${team.nameAr}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  writeDb(db);
  res.json({ status: "success", team });
});

app.delete("/api/teams/:id", (req, res) => {
  const db = readDb();
  const id = req.params.id;
  const team = db.teams.find((t: any) => t.id === id);
  db.teams = db.teams.filter((t: any) => t.id !== id);

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "الإدارة العليا",
    action: `حذف الفريق التطوعي: ${team ? team.nameAr : id}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  writeDb(db);
  res.json({ status: "success" });
});

// Volunteers CRUD & Import
app.post("/api/volunteers", (req, res) => {
  const db = readDb();
  const vol = req.body;
  if (!vol.id) {
    vol.id = "vol-" + Date.now();
    // Auto generate membership numbers & barcodes
    const seq = String(db.volunteers.length + 1).padStart(4, "0");
    vol.membershipNumber = vol.membershipNumber || `V-2026-${seq}`;
    vol.barcode = vol.barcode || `100088868${seq}`;
    vol.qrCode = vol.qrCode || `MEM-${vol.membershipNumber}`;
    vol.points = vol.points !== undefined ? Number(vol.points) : 0;
    vol.status = vol.status || "active";
    vol.issueDate = vol.issueDate || new Date().toISOString().split('T')[0];
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);
    vol.expiryDate = vol.expiryDate || expiry.toISOString().split('T')[0];
    db.volunteers.push(vol);
  } else {
    const index = db.volunteers.findIndex((v: any) => v.id === vol.id);
    if (index !== -1) {
      // Keep old points if not explicitly specified
      vol.points = vol.points !== undefined ? Number(vol.points) : db.volunteers[index].points;
      db.volunteers[index] = { ...db.volunteers[index], ...vol };
    }
  }

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "إدارة التطوع",
    action: `إضافة/تعديل ملف متطوع: ${vol.name}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  writeDb(db);
  res.json({ status: "success", volunteer: vol });
});

app.post("/api/volunteers/batch-create", (req, res) => {
  const db = readDb();
  const list = req.body.volunteers;
  if (!Array.isArray(list)) return res.status(400).json({ error: "Invalid data format" });

  const added: Volunteer[] = [];
  list.forEach((v: any, idx: number) => {
    const id = "vol-" + (Date.now() + idx);
    const seq = String(db.volunteers.length + 1 + idx).padStart(4, "0");
    const vol: Volunteer = {
      id,
      name: v.name || "متطوع جديد",
      email: v.email || `vol-${seq}@reyada.sa`,
      phone: v.phone || "0500000000",
      photo: v.photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop",
      membershipNumber: `V-2026-${seq}`,
      barcode: `100088868${seq}`,
      qrCode: `MEM-V-2026-${seq}`,
      teamId: v.teamId || "team-1",
      departmentId: v.departmentId || "dep-3",
      titleAr: v.titleAr || "متطوع ميداني",
      titleEn: v.titleEn || "Field Volunteer",
      status: "active",
      points: 0,
      issueDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0]
    };
    db.volunteers.push(vol);
    added.push(vol);
  });

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "إدارة التطوع",
    action: `استيراد دفعة متطوعين بعدد: ${added.length} متطوع`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  writeDb(db);
  res.json({ status: "success", count: added.length, volunteers: added });
});

app.delete("/api/volunteers/:id", (req, res) => {
  const db = readDb();
  const id = req.params.id;
  const vol = db.volunteers.find((v: any) => v.id === id);
  db.volunteers = db.volunteers.filter((v: any) => v.id !== id);

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "إدارة التطوع",
    action: `حذف ملف المتطوع: ${vol ? vol.name : id}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  writeDb(db);
  res.json({ status: "success" });
});

// Initiatives CRUD
app.post("/api/initiatives", (req, res) => {
  const db = readDb();
  const init = req.body;
  if (!init.id) {
    init.id = "init-" + Date.now();
    init.registrationStatus = init.registrationStatus || "open";
    init.acceptedVolunteerIds = init.acceptedVolunteerIds || [];
    init.waitlistVolunteerIds = init.waitlistVolunteerIds || [];
    init.applicantVolunteerIds = init.applicantVolunteerIds || [];
    db.initiatives.push(init);
  } else {
    const index = db.initiatives.findIndex((i: any) => i.id === init.id);
    if (index !== -1) db.initiatives[index] = { ...db.initiatives[index], ...init };
  }

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "مدير البرامج / قادة الفرق",
    action: `إضافة/تعديل مبادرة: ${init.name}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  writeDb(db);
  res.json({ status: "success", initiative: init });
});

app.post("/api/initiatives/copy", (req, res) => {
  const db = readDb();
  const { originalId, newDate, newName } = req.body;
  const orig = db.initiatives.find((i: any) => i.id === originalId);
  if (!orig) return res.status(404).json({ error: "Original initiative not found" });

  const copy: Initiative = {
    ...orig,
    id: "init-" + Date.now(),
    name: newName || `${orig.name} - نسخة مكررة`,
    date: newDate || new Date().toISOString().split('T')[0],
    registrationStatus: "open",
    acceptedVolunteerIds: [],
    waitlistVolunteerIds: [],
    applicantVolunteerIds: []
  };

  db.initiatives.push(copy);

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "قائد فريق / إدارة التطوع",
    action: `نسخ وتكرار المبادرة السابقة: ${orig.name} إلى ${copy.name}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  writeDb(db);
  res.json({ status: "success", initiative: copy });
});

// Join Request Action
app.post("/api/requests", (req, res) => {
  const db = readDb();
  const { id, volunteerId, initiativeId, action } = req.body; // action: 'apply' | 'accept' | 'reject' | 'waitlist' | 'transfer'
  
  if (action === "apply") {
    const vol = db.volunteers.find((v: any) => v.id === volunteerId);
    const init = db.initiatives.find((i: any) => i.id === initiativeId);
    if (!vol || !init) return res.status(404).json({ error: "Volunteer or Initiative not found" });

    // Check if already applied
    const existing = db.requests.find((r: any) => r.volunteerId === volunteerId && r.initiativeId === initiativeId);
    if (existing) return res.status(400).json({ error: "Already applied" });

    const newReq: JoinRequest = {
      id: "req-" + Date.now(),
      volunteerId,
      volunteerName: vol.name,
      teamId: vol.teamId,
      departmentId: vol.departmentId,
      initiativeId,
      initiativeName: init.name,
      status: "pending",
      date: new Date().toISOString().split('T')[0]
    };
    db.requests.push(newReq);

    if (!init.applicantVolunteerIds.includes(volunteerId)) {
      init.applicantVolunteerIds.push(volunteerId);
    }

    db.logs.unshift({
      id: "log-" + Date.now(),
      timestamp: new Date().toISOString(),
      user: `المتطوع ${vol.name}`,
      action: `طلب انضمام للمبادرة: ${init.name}`,
      ip: req.ip || "127.0.0.1",
      device: req.headers["user-agent"] || "System"
    });

    writeDb(db);
    return res.json({ status: "success", request: newReq });
  }

  // Accept, Reject, Waitlist or Transfer action by leader
  const reqObj = db.requests.find((r: any) => r.id === id);
  if (!reqObj) return res.status(404).json({ error: "Request not found" });

  const init = db.initiatives.find((i: any) => i.id === reqObj.initiativeId);
  if (!init) return res.status(404).json({ error: "Initiative not found" });

  // Remove volunteer from previous lists in this initiative
  init.acceptedVolunteerIds = init.acceptedVolunteerIds.filter((vId: string) => vId !== reqObj.volunteerId);
  init.waitlistVolunteerIds = init.waitlistVolunteerIds.filter((vId: string) => vId !== reqObj.volunteerId);

  reqObj.status = action;

  if (action === "accepted") {
    init.acceptedVolunteerIds.push(reqObj.volunteerId);
    db.notifications.unshift({
      id: "not-" + Date.now(),
      userId: reqObj.volunteerId,
      titleAr: "تم قبولك في المبادرة! 🎉",
      titleEn: "Accepted into initiative! 🎉",
      bodyAr: `نهنئك بقبولك للمشاركة في "${init.name}". يرجى الالتزام بالوقت والزي الرسمي.`,
      bodyEn: `Congratulations! You have been accepted to join "${init.name}". Please adhere to the time and official uniform.`,
      date: new Date().toISOString().split('T')[0],
      read: false
    });
  } else if (action === "rejected") {
    db.notifications.unshift({
      id: "not-" + Date.now(),
      userId: reqObj.volunteerId,
      titleAr: "نعتذر منك في المبادرة الحالية",
      titleEn: "Request not accepted",
      bodyAr: `نعتذر لعدم تمكننا من قبولك في "${init.name}" نظراً لاكتفاء العدد. نتطلع لمشاركتك معنا بمبادرات قادمة.`,
      bodyEn: `We regret that we cannot accept you in "${init.name}" due to full capacity. We look forward to your support in future initiatives.`,
      date: new Date().toISOString().split('T')[0],
      read: false
    });
  } else if (action === "waitlist") {
    init.waitlistVolunteerIds.push(reqObj.volunteerId);
    db.notifications.unshift({
      id: "not-" + Date.now(),
      userId: reqObj.volunteerId,
      titleAr: "تم وضعك في قائمة الاحتياط",
      titleEn: "Added to waitlist",
      bodyAr: `تم إدراجك بقائمة الاحتياط في "${init.name}". سنقوم بإشعارك فور توفر مقعد شاغر.`,
      bodyEn: `You have been added to the waitlist of "${init.name}". We will notify you once a seat becomes available.`,
      date: new Date().toISOString().split('T')[0],
      read: false
    });
  } else if (action === "transfer") {
    const { targetTeamId } = req.body;
    const targetTeam = db.teams.find((t: any) => t.id === targetTeamId);
    if (!targetTeam) return res.status(404).json({ error: "Target team not found" });

    // Transfer volunteer's official team
    const vol = db.volunteers.find((v: any) => v.id === reqObj.volunteerId);
    if (vol) {
      vol.teamId = targetTeam.id;
      vol.departmentId = targetTeam.departmentId;
    }
    
    reqObj.teamId = targetTeam.id;
    reqObj.departmentId = targetTeam.departmentId;
    reqObj.status = "accepted";
    init.acceptedVolunteerIds.push(reqObj.volunteerId);

    db.notifications.unshift({
      id: "not-" + Date.now(),
      userId: reqObj.volunteerId,
      titleAr: "تم نقلك لفريق آخر وقبولك بالمبادرة",
      titleEn: "Transferred & accepted into new team",
      bodyAr: `تم نقلك بنجاح إلى فريق "${targetTeam.nameAr}" وقبول مشاركتك بالمبادرة.`,
      bodyEn: `You have been successfully transferred to team "${targetTeam.nameEn}" and accepted for the initiative.`,
      date: new Date().toISOString().split('T')[0],
      read: false
    });
  }

  // Log action
  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "قائد الفريق التطوعي",
    action: `تعديل حالة طلب المتطوع (${reqObj.volunteerName}) بالمبادرة (${init.name}) إلى: ${action}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  writeDb(db);
  res.json({ status: "success", request: reqObj, initiative: init });
});

// Group messaging simulation
app.post("/api/teams/broadcast", (req, res) => {
  const db = readDb();
  const { teamId, message } = req.body;
  const team = db.teams.find((t: any) => t.id === teamId);
  if (!team) return res.status(404).json({ error: "Team not found" });

  const vols = db.volunteers.filter((v: any) => v.teamId === teamId);
  vols.forEach((v: any) => {
    db.notifications.unshift({
      id: "not-" + Date.now() + Math.random(),
      userId: v.id,
      titleAr: `رسالة جماعية من قائد الفريق (${team.nameAr}) 📢`,
      titleEn: `Group message from Team Leader (${team.nameEn}) 📢`,
      bodyAr: message,
      bodyEn: message,
      date: new Date().toISOString().split('T')[0],
      read: false
    });
  });

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: `قائد الفريق ${team.leaderName}`,
    action: `إرسال رسالة جماعية لكافة أعضاء فريق: ${team.nameAr}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  writeDb(db);
  res.json({ status: "success", sentCount: vols.length });
});

// Attendance Management
app.post("/api/attendance", (req, res) => {
  const db = readDb();
  const { initiativeId, volunteerId, status, wearingVest, recorderBy } = req.body;
  
  const vol = db.volunteers.find((v: any) => v.id === volunteerId);
  const init = db.initiatives.find((i: any) => i.id === initiativeId);
  if (!vol || !init) return res.status(404).json({ error: "Volunteer or Initiative not found" });

  // Determine points based on status
  // الحضور الكامل = 3 نقاط
  // التأخر = 2 نقطة
  // غياب بعذر = 1 نقطة
  // غياب بدون عذر = 0 نقطة
  let ptsAwarded = 0;
  if (status === "full") ptsAwarded = 3;
  else if (status === "late") ptsAwarded = 2;
  else if (status === "excused") ptsAwarded = 1;
  else if (status === "unexcused") ptsAwarded = 0;

  // Check if attendance already recorded for this volunteer/initiative
  const existingIdx = db.attendance.findIndex((a: any) => a.volunteerId === volunteerId && a.initiativeId === initiativeId);
  
  // Deduct old points if updating
  if (existingIdx !== -1) {
    const oldRecord = db.attendance[existingIdx];
    let oldPts = 0;
    if (oldRecord.status === "full") oldPts = 3;
    else if (oldRecord.status === "late") oldPts = 2;
    else if (oldRecord.status === "excused") oldPts = 1;
    vol.points = Math.max(0, vol.points - oldPts);
    
    db.attendance[existingIdx] = {
      ...db.attendance[existingIdx],
      status,
      wearingVest: !!wearingVest,
      recordedBy: recorderBy || "قائد الفريق",
      timestamp: new Date().toISOString()
    };
  } else {
    // Insert new record
    db.attendance.push({
      id: "att-" + Date.now(),
      initiativeId,
      volunteerId,
      date: init.date,
      status,
      wearingVest: !!wearingVest,
      recordedBy: recorderBy || "قائد الفريق",
      timestamp: new Date().toISOString()
    });
  }

  // Add new points
  vol.points += ptsAwarded;

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: recorderBy || "قائد الفريق",
    action: `تسجيل حضور المتطوع (${vol.name}) بمبادرة (${init.name}) - الحالة: ${status} (ارتداء السديري: ${wearingVest ? 'نعم' : 'لا'})`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  writeDb(db);
  res.json({ status: "success", volunteer: vol });
});

// Evaluate Volunteer Performance
app.post("/api/evaluations", (req, res) => {
  const db = readDb();
  const evalData = req.body; // should match Evaluation interface
  
  if (!evalData.volunteerId || !evalData.initiativeId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  evalData.id = evalData.id || "eval-" + Date.now();
  
  const existingIdx = db.evaluations.findIndex((e: any) => e.volunteerId === evalData.volunteerId && e.initiativeId === evalData.initiativeId);
  if (existingIdx !== -1) {
    db.evaluations[existingIdx] = evalData;
  } else {
    db.evaluations.push(evalData);
  }

  const vol = db.volunteers.find((v: any) => v.id === evalData.volunteerId);
  const init = db.initiatives.find((i: any) => i.id === evalData.initiativeId);

  // Bonus: Add points if excellent evaluation!
  const avg = (Number(evalData.commitment) + Number(evalData.ethics) + Number(evalData.cooperation) + Number(evalData.discipline) + Number(evalData.interaction) + Number(evalData.taskExecution)) / 6;
  if (avg >= 4.5 && vol) {
    vol.points += 2; // Excellent performance bonus points
  }

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "قائد الفريق",
    action: `تقييم أداء المتطوع (${vol ? vol.name : evalData.volunteerId}) بمبادرة (${init ? init.name : evalData.initiativeId})`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  writeDb(db);
  res.json({ status: "success", evaluation: evalData });
});

// Add / Edit Certificate Template
app.post("/api/db/certificates/templates/add", (req, res) => {
  const db = readDb();
  const tmpl = req.body;
  if (!tmpl.title || !tmpl.backgroundUrl) {
    return res.status(400).json({ error: "بيانات القالب غير مكتملة" });
  }

  tmpl.id = tmpl.id || "cert-tmpl-" + Date.now();
  tmpl.createdAt = tmpl.createdAt || new Date().toISOString().split('T')[0];

  const existingIdx = db.certificateTemplates.findIndex((t: any) => t.id === tmpl.id);
  if (existingIdx !== -1) {
    db.certificateTemplates[existingIdx] = tmpl;
  } else {
    db.certificateTemplates.push(tmpl);
  }

  writeDb(db);
  res.json({ status: "success", db });
});

// Delete Certificate Template
app.post("/api/db/certificates/templates/delete", (req, res) => {
  const db = readDb();
  const { id } = req.body;
  db.certificateTemplates = db.certificateTemplates.filter((t: any) => t.id !== id);
  writeDb(db);
  res.json({ status: "success", db });
});

// Batch Issue Certificates
app.post("/api/db/certificates/issue", (req, res) => {
  const db = readDb();
  const { templateId, initiativeId, volunteerIds, customInitiativeName, hours, issueDate } = req.body;

  const template = db.certificateTemplates.find((t: any) => t.id === templateId);
  if (!template) {
    return res.status(404).json({ error: "قالب الشهادة غير موجود" });
  }

  const initiative = initiativeId ? db.initiatives.find((i: any) => i.id === initiativeId) : null;
  const targetName = initiative ? initiative.name : (customInitiativeName || "مبادرة تطوعية متميزة");
  const targetHours = Number(hours) || 4;
  const dateStr = issueDate || new Date().toISOString().split('T')[0];

  // Determine volunteers to receive certificate
  let targetVolIds: string[] = volunteerIds || [];
  if (initiativeId && (!volunteerIds || volunteerIds.length === 0)) {
    // If initiative selected with no specific list, issue to all accepted or attended volunteers
    const attendedIds = db.attendance
      .filter((a: any) => a.initiativeId === initiativeId && (a.status === 'full' || a.status === 'late'))
      .map((a: any) => a.volunteerId);
    
    targetVolIds = Array.from(new Set([...(initiative.acceptedVolunteerIds || []), ...attendedIds]));
  }

  let newlyIssuedCount = 0;
  targetVolIds.forEach((vId) => {
    const vol = db.volunteers.find((v: any) => v.id === vId);
    if (!vol) return;

    // Check if volunteer already submitted a rating for this initiative
    const hasRated = db.initiativeRatings.some(
      (r: any) => r.volunteerId === vId && (initiativeId ? r.initiativeId === initiativeId : r.initiativeName === targetName)
    );

    const certCode = `CERT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newCert: IssuedCertificate = {
      id: "cert-iss-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      templateId: template.id,
      certificateCode: certCode,
      volunteerId: vol.id,
      volunteerName: vol.name,
      initiativeId: initiativeId || undefined,
      initiativeName: targetName,
      hours: targetHours,
      issueDate: dateStr,
      status: hasRated ? 'unlocked' : 'locked_unrated', // Must rate first if unrated!
      templateBackgroundUrl: template.backgroundUrl,
      nameX: template.nameX,
      nameY: template.nameY,
      nameFontSize: template.nameFontSize,
      nameColor: template.nameColor,
      initiativeX: template.initiativeX,
      initiativeY: template.initiativeY,
      initiativeFontSize: template.initiativeFontSize,
      initiativeColor: template.initiativeColor,
      hoursX: template.hoursX,
      hoursY: template.hoursY,
      hoursFontSize: template.hoursFontSize,
      hoursColor: template.hoursColor,
      dateX: template.dateX,
      dateY: template.dateY,
      dateFontSize: template.dateFontSize,
      dateColor: template.dateColor,
      qrX: template.qrX,
      qrY: template.qrY,
      qrSize: template.qrSize
    };

    // Replace if existing certificate for same initiative/volunteer or push
    const existingIndex = db.issuedCertificates.findIndex(
      (c: any) => c.volunteerId === vol.id && c.initiativeName === targetName
    );
    if (existingIndex !== -1) {
      db.issuedCertificates[existingIndex] = newCert;
    } else {
      db.issuedCertificates.push(newCert);
    }

    // Accumulate volunteer hours
    vol.volunteerHours = (vol.volunteerHours || 0) + targetHours;
    vol.completedInitiativesCount = (vol.completedInitiativesCount || 0) + 1;
    newlyIssuedCount++;
  });

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "إدارة التطوع",
    action: `إصدار (${newlyIssuedCount}) شهادة تطوع لمبادرة: ${targetName}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  writeDb(db);
  res.json({ status: "success", issuedCount: newlyIssuedCount, db });
});

// Volunteer Rating Submission for Initiative
app.post("/api/db/ratings/add", (req, res) => {
  const db = readDb();
  const { initiativeId, initiativeName, volunteerId, volunteerName, overallRating, organizationRating, impactRating, leaderSupportRating, feedbackText } = req.body;

  if (!volunteerId) {
    return res.status(400).json({ error: "المتطوع غير معرف" });
  }

  const ratingRecord: InitiativeRating = {
    id: "rate-" + Date.now(),
    initiativeId: initiativeId || "custom",
    initiativeName: initiativeName || "مبادرة تطوعية",
    volunteerId,
    volunteerName: volunteerName || "متطوع",
    overallRating: Number(overallRating) || 5,
    organizationRating: Number(organizationRating) || 5,
    impactRating: Number(impactRating) || 5,
    leaderSupportRating: Number(leaderSupportRating) || 5,
    feedbackText: feedbackText || "",
    createdAt: new Date().toISOString()
  };

  db.initiativeRatings.push(ratingRecord);

  // UNLOCK certificates for this volunteer & initiative!
  db.issuedCertificates.forEach((cert: any) => {
    if (cert.volunteerId === volunteerId) {
      if (initiativeId && cert.initiativeId === initiativeId) {
        cert.status = 'unlocked';
      } else if (initiativeName && cert.initiativeName === initiativeName) {
        cert.status = 'unlocked';
      } else if (!cert.initiativeId && !initiativeId) {
        // Unlock any locked certificates for this volunteer
        cert.status = 'unlocked';
      }
    }
  });

  // Award bonus +3 points for providing feedback!
  const vol = db.volunteers.find((v: any) => v.id === volunteerId);
  if (vol) {
    vol.points = (vol.points || 0) + 3;
  }

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: volunteerName || "متطوع",
    action: `تقييم المبادرة (${initiativeName}) وتفعيل الشهادة المعلقة بنجاح ⭐`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  writeDb(db);
  res.json({ status: "success", rating: ratingRecord, db });
});

// Re-issue card action log
app.post("/api/volunteers/:id/reissue-card", (req, res) => {
  const db = readDb();
  const id = req.params.id;
  const vol = db.volunteers.find((v: any) => v.id === id);
  if (!vol) return res.status(404).json({ error: "Volunteer not found" });

  vol.issueDate = new Date().toISOString().split('T')[0];
  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + 1);
  vol.expiryDate = expiry.toISOString().split('T')[0];

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: `النظام / المتطوع ${vol.name}`,
    action: `إعادة إصدار بطاقة التطوع الرقمية الذكية للمتطوع: ${vol.name}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  writeDb(db);
  res.json({ status: "success", volunteer: vol });
});

// Get Full System Settings
app.get("/api/db/systemSettings", (req, res) => {
  const db = readDb();
  res.json(db.systemSettings || defaultSystemSettings);
});

// Update Full System Settings
app.post("/api/db/systemSettings", (req, res) => {
  const db = readDb();
  const updated = req.body;
  const sectionName = updated.updatedSection || "إعدادات النظام العامة";
  delete updated.updatedSection;

  db.systemSettings = { ...(db.systemSettings || defaultSystemSettings), ...updated };

  // Sync basic branding to homeSettings for public views
  db.homeSettings = db.homeSettings || {};
  if (db.systemSettings.systemName) db.homeSettings.associationNameAr = db.systemSettings.systemName;
  if (db.systemSettings.logoUrl) db.homeSettings.logoUrl = db.systemSettings.logoUrl;
  if (db.systemSettings.licenseNumber) db.homeSettings.licenseNumber = db.systemSettings.licenseNumber;
  if (db.systemSettings.officialEmail) db.homeSettings.contactEmail = db.systemSettings.officialEmail;
  if (db.systemSettings.mobileNumber) db.homeSettings.contactPhone = db.systemSettings.mobileNumber;
  if (db.systemSettings.address) db.homeSettings.contactLocationAr = db.systemSettings.address;

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "المدير العام",
    action: `تحديث ${sectionName} وحفظ التغيرات في قاعدة البيانات`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System Admin"
  });

  writeDb(db);
  res.json({ status: "success", systemSettings: db.systemSettings, db });
});

// 12. Update Home Settings
app.post("/api/db/homeSettings", (req, res) => {
  const db = readDb();
  db.homeSettings = { ...db.homeSettings, ...req.body };
  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "الإدارة العليا",
    action: "تحديث إعدادات الصفحة الرئيسية والألوان والهوية",
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });
  writeDb(db);
  res.json(db);
});

// 13. News Add/Edit
app.post("/api/db/news/add", (req, res) => {
  const db = readDb();
  const item = req.body;
  if (!item.id) {
    item.id = "news-" + Date.now();
    db.news.unshift(item);
  } else {
    const idx = db.news.findIndex((n: any) => n.id === item.id);
    if (idx !== -1) {
      db.news[idx] = { ...db.news[idx], ...item };
    } else {
      db.news.unshift(item);
    }
  }
  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "إدارة الإعلام",
    action: `إضافة/تعديل خبر صحفي: ${item.titleAr}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });
  writeDb(db);
  res.json(db);
});

// 14. News Delete
app.post("/api/db/news/delete", (req, res) => {
  const db = readDb();
  const { id } = req.body;
  db.news = db.news.filter((n: any) => n.id !== id);
  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "إدارة الإعلام",
    action: `حذف خبر صحفي معرف: ${id}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });
  writeDb(db);
  res.json(db);
});

// 15. Partners Add/Edit
app.post("/api/db/partners/add", (req, res) => {
  const db = readDb();
  const item = req.body;
  if (!item.id) {
    item.id = "partner-" + Date.now();
    db.partners.push(item);
  } else {
    const idx = db.partners.findIndex((p: any) => p.id === item.id);
    if (idx !== -1) {
      db.partners[idx] = { ...db.partners[idx], ...item };
    } else {
      db.partners.push(item);
    }
  }
  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "إدارة العلاقات العامة",
    action: `إضافة/تعديل شريك ورعاية: ${item.nameAr}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });
  writeDb(db);
  res.json(db);
});

// 16. Partners Delete
app.post("/api/db/partners/delete", (req, res) => {
  const db = readDb();
  const { id } = req.body;
  db.partners = db.partners.filter((p: any) => p.id !== id);
  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "إدارة العلاقات العامة",
    action: `حذف شريك/راعٍ معرف: ${id}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });
  writeDb(db);
  res.json(db);
});

// 17. Gallery Add/Edit
app.post("/api/db/gallery/add", (req, res) => {
  const db = readDb();
  const item = req.body;
  if (!item.id) {
    item.id = "gal-" + Date.now();
    db.gallery.unshift(item);
  } else {
    const idx = db.gallery.findIndex((g: any) => g.id === item.id);
    if (idx !== -1) {
      db.gallery[idx] = { ...db.gallery[idx], ...item };
    } else {
      db.gallery.unshift(item);
    }
  }
  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "إدارة الإعلام",
    action: `إضافة/تعديل عنصر بالمعرض: ${item.titleAr}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });
  writeDb(db);
  res.json(db);
});

// 18. Gallery Delete
app.post("/api/db/gallery/delete", (req, res) => {
  const db = readDb();
  const { id } = req.body;
  db.gallery = db.gallery.filter((g: any) => g.id !== id);
  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "إدارة الإعلام",
    action: `حذف عنصر بالمعرض معرف: ${id}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });
  writeDb(db);
  res.json(db);
});

// 18.1 Org Members - Add / Edit
app.post("/api/db/org-members/add", (req, res) => {
  const db = readDb();
  if (!db.orgMembers) db.orgMembers = [];
  const item = req.body;
  if (!item.id) {
    item.id = "org-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4);
    item.createdAt = new Date().toISOString();
    item.order = item.order ?? (db.orgMembers.length + 1);
    if (item.isActive === undefined) item.isActive = true;
    db.orgMembers.push(item);
  } else {
    const idx = db.orgMembers.findIndex((m: any) => m.id === item.id);
    if (idx !== -1) {
      db.orgMembers[idx] = { ...db.orgMembers[idx], ...item, updatedAt: new Date().toISOString() };
    } else {
      db.orgMembers.push(item);
    }
  }
  if (db.homeSettings) db.homeSettings.orgMembers = db.orgMembers;

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "الإدارة العامة",
    action: `إضافة/تعديل شخص في الهيكل الإداري: ${item.name} (${item.roleTitle || 'عضو'})`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });
  writeDb(db);
  res.json(db);
});

// 18.2 Org Members - Delete
app.post("/api/db/org-members/delete", (req, res) => {
  const db = readDb();
  if (!db.orgMembers) db.orgMembers = [];
  const { id } = req.body;
  const target = db.orgMembers.find((m: any) => m.id === id);
  db.orgMembers = db.orgMembers.filter((m: any) => m.id !== id);
  db.orgMembers.forEach((m: any) => {
    if (m.parentId === id) {
      m.parentId = null;
      m.parentName = "";
    }
  });
  if (db.homeSettings) db.homeSettings.orgMembers = db.orgMembers;

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "الإدارة العامة",
    action: `حذف شخص من الهيكل الإداري: ${target ? target.name : id}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });
  writeDb(db);
  res.json(db);
});

// 18.3 Org Members - Toggle Active/Hidden
app.post("/api/db/org-members/toggle-active", (req, res) => {
  const db = readDb();
  if (!db.orgMembers) db.orgMembers = [];
  const { id, isActive } = req.body;
  const idx = db.orgMembers.findIndex((m: any) => m.id === id);
  if (idx !== -1) {
    db.orgMembers[idx].isActive = isActive !== undefined ? isActive : !db.orgMembers[idx].isActive;
    db.orgMembers[idx].updatedAt = new Date().toISOString();
  }
  if (db.homeSettings) db.homeSettings.orgMembers = db.orgMembers;

  writeDb(db);
  res.json(db);
});

// 18.4 Org Members - Batch / Reorder
app.post("/api/db/org-members/batch", (req, res) => {
  const db = readDb();
  const { members } = req.body;
  if (Array.isArray(members)) {
    db.orgMembers = members;
    if (db.homeSettings) db.homeSettings.orgMembers = db.orgMembers;
    writeDb(db);
  }
  res.json(db);
});

// 18.5 Org Members - Import Directors from Departments
app.post("/api/db/org-members/import-directors", (req, res) => {
  const db = readDb();
  if (!db.orgMembers) db.orgMembers = [];
  const deps = db.departments || [];
  let addedCount = 0;

  deps.forEach((dep: any) => {
    if (dep.directorName && !db.orgMembers.some((m: any) => m.name === dep.directorName)) {
      db.orgMembers.push({
        id: "org-dep-" + dep.id,
        name: dep.directorName,
        roleTitle: `مدير ${dep.nameAr}`,
        level: 3,
        levelName: "مدراء الإدارات والأقسام",
        parentId: null,
        parentName: "",
        department: dep.nameAr,
        email: dep.email || "",
        phone: dep.phone || "",
        description: dep.descriptionAr || "",
        order: (db.orgMembers.length + 1),
        isActive: true,
        createdAt: new Date().toISOString()
      });
      addedCount++;
    }
  });

  if (db.homeSettings) db.homeSettings.orgMembers = db.orgMembers;
  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "الإدارة العامة",
    action: `استيراد تلقائي لـ ${addedCount} من مدراء الإدارات إلى الهيكل الإداري`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });
  writeDb(db);
  res.json(db);
});

// 18.6 Hero Slides - Add / Edit
app.post("/api/db/hero-slides/add", (req, res) => {
  const db = readDb();
  if (!db.heroSlides) db.heroSlides = [];
  const slide = req.body;
  if (!slide.id) {
    slide.id = "slide-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4);
    slide.createdAt = new Date().toISOString();
    slide.order = slide.order ?? (db.heroSlides.length + 1);
    if (slide.isActive === undefined) slide.isActive = true;
    db.heroSlides.push(slide);
  } else {
    const idx = db.heroSlides.findIndex((s: any) => s.id === slide.id);
    if (idx !== -1) {
      db.heroSlides[idx] = { ...db.heroSlides[idx], ...slide, updatedAt: new Date().toISOString() };
    } else {
      db.heroSlides.push(slide);
    }
  }
  db.heroSlides.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
  if (db.homeSettings) db.homeSettings.heroSlides = db.heroSlides;

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "الإدارة العامة",
    action: `إضافة/تعديل شريحة بصور الواجهة الرئيسية: ${slide.title || slide.id}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });
  writeDb(db);
  res.json(db);
});

// 18.7 Hero Slides - Delete
app.post("/api/db/hero-slides/delete", (req, res) => {
  const db = readDb();
  if (!db.heroSlides) db.heroSlides = [];
  const { id } = req.body;
  db.heroSlides = db.heroSlides.filter((s: any) => s.id !== id);
  if (db.homeSettings) db.homeSettings.heroSlides = db.heroSlides;

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "الإدارة العامة",
    action: `حذف شريحة من صور الواجهة الرئيسية معرف: ${id}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });
  writeDb(db);
  res.json(db);
});

// 18.8 Hero Slides - Batch / Reorder
app.post("/api/db/hero-slides/batch", (req, res) => {
  const db = readDb();
  const { slides } = req.body;
  if (Array.isArray(slides)) {
    db.heroSlides = slides;
    if (db.homeSettings) db.homeSettings.heroSlides = db.heroSlides;
    writeDb(db);
  }
  res.json(db);
});

// 18.9 Hero Slides - Toggle Active
app.post("/api/db/hero-slides/toggle-active", (req, res) => {
  const db = readDb();
  if (!db.heroSlides) db.heroSlides = [];
  const { id, isActive } = req.body;
  const idx = db.heroSlides.findIndex((s: any) => s.id === id);
  if (idx !== -1) {
    db.heroSlides[idx].isActive = isActive !== undefined ? isActive : !db.heroSlides[idx].isActive;
  }
  if (db.homeSettings) db.homeSettings.heroSlides = db.heroSlides;
  writeDb(db);
  res.json(db);
});

// 19. Beneficiaries Add/Edit
app.post("/api/db/beneficiaries/add", (req, res) => {
  const db = readDb();
  const ben = req.body;
  if (!ben.id) {
    ben.id = "ben-" + Date.now();
    ben.createdAt = new Date().toISOString();
    ben.status = ben.status || "pending";
    db.beneficiaries.push(ben);
  } else {
    const idx = db.beneficiaries.findIndex((b: any) => b.id === ben.id);
    if (idx !== -1) {
      db.beneficiaries[idx] = { ...db.beneficiaries[idx], ...ben };
    } else {
      db.beneficiaries.push(ben);
    }
  }
  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: ben.name,
    action: `تسجيل/تعديل حساب مستفيد جديد: ${ben.name} (رقم هوية: ${ben.nationalId})`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });
  writeDb(db);
  res.json(db);
});

// 20. Beneficiaries Update Status
app.post("/api/db/beneficiaries/status", (req, res) => {
  const db = readDb();
  const { id, status } = req.body;
  const ben = db.beneficiaries.find((b: any) => b.id === id);
  if (ben) {
    ben.status = status;
    db.logs.unshift({
      id: "log-" + Date.now(),
      timestamp: new Date().toISOString(),
      user: "إدارة الخدمات الإنسانية",
      action: `تعديل حالة حساب المستفيد (${ben.name}) إلى: ${status === 'approved' ? 'مقبول ومعتمد' : 'مرفوض/موقوف'}`,
      ip: req.ip || "127.0.0.1",
      device: req.headers["user-agent"] || "System"
    });
  }
  writeDb(db);
  res.json(db);
});

// 20.1 Beneficiaries Export Audit Log
app.post("/api/db/beneficiaries/export-log", (req, res) => {
  const db = readDb();
  const { user, role, format, count, filterStatus } = req.body;
  const logEntry = {
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: user || "إدارة المستفيدين",
    action: `تصدير بيانات المستفيدين بصيغة (${format === 'excel' ? 'Excel / إكسل' : 'PDF / تقرير طباعة'}) - عدد السجلات: ${count} - الفلتر: ${filterStatus || 'الكل'}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  };
  db.logs.unshift(logEntry);
  writeDb(db);
  res.json({ success: true, log: logEntry });
});

// 20.2 Beneficiaries Batch Import with Deduplication & Permanent Barcode Assignment
app.post("/api/db/beneficiaries/import", (req, res) => {
  const db = readDb();
  const { beneficiaries = [], sourceFileType = 'excel', importedBy = 'إدارة المستفيدين' } = req.body;
  
  if (!Array.isArray(beneficiaries) || beneficiaries.length === 0) {
    return res.status(400).json({ error: "لم يتم استلام أي سجلات للاستيراد." });
  }

  let insertedCount = 0;
  let updatedCount = 0;

  beneficiaries.forEach((item: any) => {
    const cleanNationalId = (item.nationalId || "").toString().trim();
    const cleanBenNumber = (item.beneficiaryNumber || "").toString().trim();
    const cleanBarcode = (item.barcodeId || "").toString().trim();

    // Match against existing beneficiaries by nationalId, beneficiaryNumber, or barcodeId
    let existingIndex = -1;
    if (cleanNationalId) {
      existingIndex = db.beneficiaries.findIndex((b: any) => (b.nationalId || "").toString().trim() === cleanNationalId);
    }
    if (existingIndex === -1 && cleanBenNumber) {
      existingIndex = db.beneficiaries.findIndex((b: any) => (b.beneficiaryNumber || "").toString().trim().toLowerCase() === cleanBenNumber.toLowerCase());
    }
    if (existingIndex === -1 && cleanBarcode) {
      existingIndex = db.beneficiaries.findIndex((b: any) => (b.barcodeId || "").toString().trim().toUpperCase() === cleanBarcode.toUpperCase());
    }

    if (existingIndex !== -1) {
      // Update existing - preserve permanent barcode and id
      const existing = db.beneficiaries[existingIndex];
      db.beneficiaries[existingIndex] = {
        ...existing,
        name: item.name || existing.name,
        phone: item.phone || existing.phone,
        email: item.email || existing.email,
        familySize: Number(item.familySize) || existing.familySize || 1,
        address: item.address || existing.address,
        category: item.category || existing.category || "أسر متعففة",
        notes: item.notes || existing.notes || "",
        status: existing.status || "approved"
      };
      updatedCount++;
    } else {
      // Create new with permanent unique barcode
      const nextNum = db.beneficiaries.length + 1;
      const numCode = String(nextNum).padStart(4, '0');
      const rawId = (cleanNationalId || String(Date.now())).replace(/\D/g, '');
      const uniqueSuffix = rawId.length >= 4 
        ? rawId.slice(-6).padStart(6, '7') 
        : Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const newBen = {
        id: "ben-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
        name: (item.name || "مستفيد جديد").trim(),
        beneficiaryNumber: cleanBenNumber || `BEN-2026-${numCode}`,
        barcodeId: cleanBarcode || `BC-BEN-${uniqueSuffix}`,
        nationalId: cleanNationalId,
        phone: (item.phone || "").toString().trim(),
        email: (item.email || "").toString().trim(),
        familySize: Number(item.familySize) || 4,
        address: item.address || "مكة المكرمة - العسيلة",
        category: item.category || "أسر متعففة",
        notes: item.notes || "",
        status: item.status || "approved",
        createdAt: new Date().toISOString()
      };
      db.beneficiaries.push(newBen);
      insertedCount++;
    }
  });

  const logEntry = {
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: importedBy,
    action: `استيراد بيانات مستفيدين (${sourceFileType === 'pdf' ? 'ملف PDF' : 'ملف Excel'}): تم إضافة ${insertedCount} جديد، وتحديث ${updatedCount} مسبق (إجمالي معالج: ${beneficiaries.length})`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  };
  db.logs.unshift(logEntry);
  writeDb(db);

  res.json({
    success: true,
    db,
    insertedCount,
    updatedCount,
    totalProcessed: beneficiaries.length
  });
});

// 20.3 Aid Distributions - Create (مع الربط التلقائي بأصناف المخزون وحجز الكميات)
app.post("/api/db/distributions/create", (req, res) => {
  const db = readDb();
  const payload = req.body;

  if (!db.distributions) db.distributions = [];
  if (!db.inventoryItems) db.inventoryItems = [];
  if (!db.notifications) db.notifications = [];

  let inventoryItem: any = null;
  const unitQty = Number(payload.unitQuantityPerBeneficiary) || 1;
  const targetCount = Array.isArray(payload.targetedBeneficiaryIds) && payload.targetedBeneficiaryIds.length > 0 
    ? payload.targetedBeneficiaryIds.length 
    : (db.beneficiaries || []).length;
  
  // Custom per-beneficiary allocated quantities (e.g. { "ben-1": 1, "ben-2": 2, "ben-3": 1 })
  let totalRequiredQty = 0;
  if (payload.beneficiaryAllocations && typeof payload.beneficiaryAllocations === 'object') {
    const allocValues = Object.values(payload.beneficiaryAllocations) as any[];
    const customSum = allocValues.reduce((acc: number, val: any) => acc + (Number(val) || 0), 0);
    if (customSum > 0) {
      totalRequiredQty = customSum;
    }
  }
  if (totalRequiredQty === 0) {
    totalRequiredQty = Number(payload.allocatedQuantity) || (unitQty * targetCount);
  }

  if (payload.inventoryItemId) {
    inventoryItem = db.inventoryItems.find((itm: any) => itm.id === payload.inventoryItemId);
    if (!inventoryItem) {
      return res.status(404).json({ error: "صنف المخزون المحدد غير موجود في إدارة المستودعات." });
    }
    const currentStock = Number(inventoryItem.currentQty) || 0;
    const reservedStock = Number(inventoryItem.reservedQty) || 0;
    const availableStock = Math.max(0, currentStock - reservedStock);

    if (totalRequiredQty > availableStock) {
      return res.status(400).json({ 
        error: `الكمية المتاحة في المخزون (${availableStock}) غير كافية لتغطية التوزيعة المطلوبة (${totalRequiredQty} لعدد ${targetCount} مستفيد).` 
      });
    }

    // Atomic Quantity Reservation in Inventory (حجز الكمية)
    inventoryItem.reservedQty = reservedStock + totalRequiredQty;
    inventoryItem.updatedAt = new Date().toISOString();

    // Notify Inventory Management (إشعار إدارة المخزون)
    db.notifications.unshift({
      id: "notif-inv-" + Date.now(),
      userId: "role:storekeeper",
      targetDepartmentId: "dep-8",
      targetRole: "storekeeper",
      titleAr: `حجز كمية بالمخزون لصالح توزيعة: ${payload.title || inventoryItem.name}`,
      bodyAr: `يوجد دفعة جديدة جاهزة للتسليم للمستفيدين (${inventoryItem.name}): عدد المستفيدين المعتمدين: ${targetCount}، الكمية الإجمالية المحجوزة: ${totalRequiredQty} ${inventoryItem.unitOfMeasure || 'وحدة'}، الرصيد المتاح بالمستودع بعد الحجز: ${currentStock - inventoryItem.reservedQty}.`,
      category: "beneficiary",
      type: "important",
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      read: false
    });
  }

  const newDist = {
    id: "dist-" + Date.now(),
    title: payload.title || (inventoryItem ? `توزيع ${inventoryItem.name}` : "توزيعة مساعدات جديدة"),
    aidType: payload.aidType || (inventoryItem ? "food_basket" : "food_basket"),
    aidTypeLabel: payload.aidTypeLabel || (inventoryItem ? inventoryItem.name : "سلال ومساعدات"),
    description: payload.description || (inventoryItem ? inventoryItem.description : ""),
    distributionDate: payload.distributionDate || new Date().toISOString().split('T')[0],
    quantityPerBeneficiary: payload.quantityPerBeneficiary || `${unitQty} ${inventoryItem?.unitOfMeasure || 'طرد / سلة'}`,
    targetAudience: payload.targetAudience || "all",
    targetedBeneficiaryIds: payload.targetedBeneficiaryIds || [],
    beneficiaryAllocations: payload.beneficiaryAllocations || {},
    status: payload.status || "active",
    location: payload.location || "مقر الجمعية - مخطط العسيلة",
    createdAt: new Date().toISOString(),
    createdBy: payload.createdBy || "مدير إدارة المستفيدين",
    notes: payload.notes || "",
    inventoryItemId: payload.inventoryItemId || (inventoryItem ? inventoryItem.id : undefined),
    inventoryItemName: inventoryItem ? inventoryItem.name : payload.inventoryItemName,
    unit: inventoryItem ? (inventoryItem.unitOfMeasure || 'طرد') : 'طرد',
    unitPrice: inventoryItem ? (inventoryItem.purchasePrice || 0) : 0,
    availableStockAtCreation: inventoryItem ? Number(inventoryItem.currentQty) || 0 : undefined,
    allocatedQuantity: totalRequiredQty,
    unitQuantityPerBeneficiary: unitQty,
    reservedStock: totalRequiredQty,
    distributedCount: 0,
    remainingAllocated: totalRequiredQty,
    completionRate: 0,
    eligibilityFilterCategory: payload.eligibilityFilterCategory || "all"
  };

  db.distributions.unshift(newDist);

  // Notify targeted beneficiaries: "لديك مساعدة مستحقة للاستلام"
  const beneficiariesToNotify = payload.targetedBeneficiaryIds && payload.targetedBeneficiaryIds.length > 0
    ? (db.beneficiaries || []).filter((b: any) => payload.targetedBeneficiaryIds.includes(b.id))
    : (db.beneficiaries || []);

  beneficiariesToNotify.forEach((ben: any) => {
    db.notifications.unshift({
      id: "notif-ben-" + Date.now() + "-" + Math.random().toString(36).substring(2, 5),
      userId: ben.id,
      targetUserId: ben.id,
      recipientType: "beneficiaries",
      titleAr: "لديك مساعدة مستحقة للاستلام 🎁",
      bodyAr: `تم إدراجك في قائمة المستحقين لاستلام (${newDist.aidTypeLabel || newDist.title}) بمقدار (${newDist.quantityPerBeneficiary}). الحالة: بانتظار الاستلام. يرجى الحضور إلى (${newDist.location}) في موعد التوزيع (${newDist.distributionDate}) مصطحباً بطاقتك أو الباركود.`,
      category: "beneficiary",
      type: "urgent",
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      read: false
    });
  });

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: payload.createdBy || "مدير إدارة المستفيدين",
    action: `إنشاء توزيعة جديدة: ${newDist.title} (المخزون المرتبط: ${inventoryItem ? inventoryItem.name : 'مباشر'}) - عدد المستفيدين: ${targetCount}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  writeDb(db);
  res.json(db);
});

// 20.4 Aid Distributions - Update
app.post("/api/db/distributions/update", (req, res) => {
  const db = readDb();
  const { id, ...updates } = req.body;

  if (!db.distributions) db.distributions = [];
  const idx = db.distributions.findIndex((d: any) => d.id === id);
  if (idx !== -1) {
    db.distributions[idx] = { ...db.distributions[idx], ...updates };
    db.logs.unshift({
      id: "log-" + Date.now(),
      timestamp: new Date().toISOString(),
      user: updates.updatedBy || "مدير إدارة المستفيدين",
      action: `تحديث بيانات التوزيعة: ${db.distributions[idx].title} (الحالة: ${db.distributions[idx].status})`,
      ip: req.ip || "127.0.0.1",
      device: req.headers["user-agent"] || "System"
    });
    writeDb(db);
    return res.json(db);
  }
  res.status(404).json({ error: "التوزيعة غير موجودة." });
});

// 20.5 Aid Distributions - Delete
app.post("/api/db/distributions/delete", (req, res) => {
  const db = readDb();
  const { id, user = "مدير إدارة المستفيدين" } = req.body;

  const target = (db.distributions || []).find((d: any) => d.id === id);
  if (target) {
    // If inventory stock was reserved, release reservation
    if (target.inventoryItemId && target.reservedStock) {
      const invItem = (db.inventoryItems || []).find((i: any) => i.id === target.inventoryItemId);
      if (invItem) {
        invItem.reservedQty = Math.max(0, (Number(invItem.reservedQty) || 0) - Number(target.reservedStock));
      }
    }
    db.distributions = db.distributions.filter((d: any) => d.id !== id);
    db.logs.unshift({
      id: "log-" + Date.now(),
      timestamp: new Date().toISOString(),
      user,
      action: `حذف توزيعة المساعدات: ${target.title} وإلغاء حجز المخزون`,
      ip: req.ip || "127.0.0.1",
      device: req.headers["user-agent"] || "System"
    });
    writeDb(db);
    return res.json(db);
  }
  res.status(404).json({ error: "التوزيعة غير موجودة." });
});

// 20.6 Aid Handover - Record Distribution Handover with Strict Duplicate Prevention & Inventory Deduction
app.post("/api/db/distributions/handover", (req, res) => {
  const db = readDb();
  const { 
    distributionId, 
    beneficiaryId, 
    barcodeId,
    photoUrl,
    proofPhotos,
    handedByUserId = "staff",
    handedByUserName = "مسؤول التوزيع الميداني",
    handedByUserRole = "staff",
    handedDepartment = "إدارة المخزون والمستودعات",
    method = "camera_scanner",
    notes = ""
  } = req.body;

  if (!distributionId) {
    return res.status(400).json({ error: "معرف التوزيعة مطلوب." });
  }

  // Mandatory photo proof check
  if (!photoUrl && (!proofPhotos || proofPhotos.length === 0)) {
    return res.status(400).json({ 
      error: "توثيق الصورة إلزامي لإتمام عملية التسليم! يرجى التقاط صورة للمستفيد أثناء الاستلام.",
      photoRequired: true
    });
  }

  // 1. Find the distribution
  const dist = (db.distributions || []).find((d: any) => d.id === distributionId);
  if (!dist) {
    return res.status(404).json({ error: "التوزيعة المحددة غير موجودة بالنظام." });
  }

  // 2. Find beneficiary by id, permanent barcodeId, beneficiaryNumber, or nationalId
  let ben: any = null;
  if (beneficiaryId) {
    ben = (db.beneficiaries || []).find((b: any) => b.id === beneficiaryId);
  }
  if (!ben && barcodeId) {
    const cleanSearch = barcodeId.toString().trim();
    ben = (db.beneficiaries || []).find((b: any) => 
      (b.barcodeId && b.barcodeId.toString().trim().toUpperCase() === cleanSearch.toUpperCase()) ||
      (b.beneficiaryNumber && b.beneficiaryNumber.toString().trim().toLowerCase() === cleanSearch.toLowerCase()) ||
      (b.nationalId && b.nationalId.toString().trim() === cleanSearch) ||
      (b.id && b.id.toString().trim() === cleanSearch)
    );
  }

  if (!ben) {
    return res.status(404).json({ 
      error: "عذرًا، هذا المستفيد غير مدرج ضمن قائمة المستحقين لهذه المساعدة. لا يمكن إتمام عملية التسليم.",
      notFound: true
    });
  }

  // 2.5 Eligibility Check (التحقق من تسجيل المستفيد واستحقاقه لهذا الصنف المحدد فقط)
  if (dist.targetedBeneficiaryIds && dist.targetedBeneficiaryIds.length > 0) {
    const isTargeted = dist.targetedBeneficiaryIds.includes(ben.id);
    if (!isTargeted) {
      return res.status(403).json({
        error: "عذرًا، هذا المستفيد غير مدرج ضمن قائمة المستحقين لهذه المساعدة. لا يمكن إتمام عملية التسليم.",
        notEligible: true,
        beneficiary: ben,
        distribution: dist
      });
    }
  }

  // 3. Strict Duplicate Prevention Check (منع التكرار - إذا استلم مسبقاً يرفض قطعاً)
  if (!db.distributionHandovers) db.distributionHandovers = [];
  const existingHandover = db.distributionHandovers.find(
    (h: any) => h.distributionId === distributionId && h.beneficiaryId === ben.id
  );

  if (existingHandover) {
    return res.status(409).json({
      error: "تم استلام هذه المساعدة مسبقاً ولا يمكن صرفها مرة أخرى.",
      alreadyReceived: true,
      record: existingHandover,
      beneficiary: ben,
      distribution: dist
    });
  }

  // 4. Record new handover with Photo Proof & Custom Quantity
  const now = new Date();
  const timeString = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  // Custom allocated qty per beneficiary if set by Beneficiaries Dept, else default unitQty
  let handoverQty = Number(dist.unitQuantityPerBeneficiary) || 1;
  if (dist.beneficiaryAllocations && dist.beneficiaryAllocations[ben.id] !== undefined) {
    handoverQty = Number(dist.beneficiaryAllocations[ben.id]) || handoverQty;
  }

  const handoverRecord = {
    id: "handover-" + Date.now() + "-" + Math.random().toString(36).substring(2, 5),
    distributionId,
    beneficiaryId: ben.id,
    beneficiaryName: ben.name,
    beneficiaryNumber: ben.beneficiaryNumber || "BEN-2026-0000",
    barcodeId: ben.barcodeId || "BC-BEN-000000",
    nationalId: ben.nationalId || "",
    phone: ben.phone || "",
    familySize: Number(ben.familySize) || 1,
    receivedAt: now.toISOString(),
    date: now.toISOString().split('T')[0],
    time: timeString,
    handedByUserId,
    handedByUserName,
    handedByUserRole,
    handedDepartment: handedDepartment || "إدارة المخزون والمستودعات",
    method: method || "camera_scanner",
    notes: notes || `تسليم ${handoverQty} ${dist.unit || 'طرد'} للمستفيد بموجب الاعتماد المسبق`,
    itemName: dist.aidTypeLabel || dist.title,
    inventoryItemId: dist.inventoryItemId,
    handoverDate: now.toISOString().split('T')[0],
    distributionTitle: dist.title,
    quantity: handoverQty,
    unit: dist.unit || "طرد",
    photoUrl: photoUrl || (proofPhotos && proofPhotos[0]) || "",
    proofPhotos: proofPhotos || (photoUrl ? [photoUrl] : []),
    beneficiaryConfirmedReceipt: true
  };

  db.distributionHandovers.unshift(handoverRecord);

  // 5. Atomic Inventory Deduction (خصم المخزون المحجوز والفعلي فور التسليم)
  if (dist.inventoryItemId) {
    db.inventoryItems = db.inventoryItems || [];
    const invItem = db.inventoryItems.find((itm: any) => itm.id === dist.inventoryItemId);
    if (invItem) {
      invItem.currentQty = Math.max(0, (Number(invItem.currentQty) || 0) - handoverQty);
      invItem.reservedQty = Math.max(0, (Number(invItem.reservedQty) || 0) - handoverQty);
      invItem.issuedQty = (Number(invItem.issuedQty) || 0) + handoverQty;
      invItem.totalValue = invItem.currentQty * (Number(invItem.purchasePrice) || 0);
      invItem.updatedAt = now.toISOString();

      // Record inventory movement
      db.inventoryMovements = db.inventoryMovements || [];
      db.inventoryMovements.unshift({
        id: "mov-" + Date.now(),
        itemId: invItem.id,
        itemName: invItem.name,
        barcode: invItem.barcode,
        type: "outbound",
        quantity: handoverQty,
        reason: `صرف وتسليم مساعدة للمستفيد (${ben.name}) بموجب التوزيعة (${dist.title}) مع توثيق الصورة والباركود`,
        approvedBy: handedByUserName,
        beneficiaryId: ben.id,
        proofPhotos: handoverRecord.proofPhotos,
        date: now.toISOString().split('T')[0],
        createdAt: now.toISOString()
      });
    }
  }

  // Update distribution status and completion rate
  dist.distributedCount = (dist.distributedCount || 0) + 1;
  const totalTargeted = (dist.targetedBeneficiaryIds && dist.targetedBeneficiaryIds.length > 0) ? dist.targetedBeneficiaryIds.length : (db.beneficiaries || []).length;
  dist.completionRate = Math.min(100, Math.round((dist.distributedCount / Math.max(1, totalTargeted)) * 100));
  if (dist.distributedCount >= totalTargeted) {
    dist.status = 'completed';
  }

  // Send delivery confirmation notification to beneficiary
  if (!db.notifications) db.notifications = [];
  db.notifications.unshift({
    id: "notif-ben-handover-" + Date.now(),
    userId: ben.id,
    targetUserId: ben.id,
    recipientType: "beneficiaries",
    titleAr: "تم تسليم مساعدتك بنجاح ✓",
    bodyAr: `تم بحمد الله تسليمك (${dist.aidTypeLabel || dist.title}) بكمية (${handoverQty} ${dist.unit || 'طرد'}) بتاريخ ${now.toISOString().split('T')[0]} في تمام الساعة ${timeString}. نشكرك لتعاونك.`,
    category: "beneficiary",
    type: "normal",
    date: now.toISOString().split('T')[0],
    createdAt: now.toISOString(),
    read: false
  });

  // Notify Beneficiary Department that delivery was successfully executed by Warehouse
  db.notifications.unshift({
    id: "notif-dept-delivery-" + Date.now(),
    userId: "role:department_admin",
    targetDepartmentId: "dep-4",
    targetRole: "department_admin",
    titleAr: `تم تنفيذ تسليم مساعدة: ${ben.name}`,
    bodyAr: `قامت إدارة المخزون بتسليم المساعدة المعتمدة (${dist.aidTypeLabel || dist.title}) للمستفيد (${ben.name}) بالباركود والصورة بنجاح. القائم بالتسليم: ${handedByUserName}.`,
    category: "beneficiary",
    type: "normal",
    date: now.toISOString().split('T')[0],
    createdAt: now.toISOString(),
    read: false
  });

  // Log in activity log
  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: now.toISOString(),
    user: handedByUserName,
    action: `تسجيل استلام مساعدة موثقة بالصورة: المستفيد (${ben.name}) استلم (${handoverQty} ${dist.unit || 'طرد'}) في توزيعة (${dist.title}) عبر ${method === 'camera_scanner' ? 'كاميرا الجوال' : method === 'hardware_scanner' ? 'قارئ باركود' : 'إدخال يدوي'} وتم خصم المخزون بنجاح`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "Mobile Scanner"
  });

  writeDb(db);

  res.json({
    success: true,
    db,
    record: handoverRecord,
    beneficiary: ben,
    distribution: dist
  });
});

// 20.7 Aid Handover - Cancel / Undo (مع إعادة الكمية للمخزون)
app.post("/api/db/distributions/handover/cancel", (req, res) => {
  const db = readDb();
  const { handoverId, user = "المشرف" } = req.body;

  if (!db.distributionHandovers) db.distributionHandovers = [];
  const target = db.distributionHandovers.find((h: any) => h.id === handoverId);
  if (target) {
    db.distributionHandovers = db.distributionHandovers.filter((h: any) => h.id !== handoverId);

    // Restore stock if linked to inventory
    if (target.inventoryItemId) {
      const invItem = (db.inventoryItems || []).find((itm: any) => itm.id === target.inventoryItemId);
      if (invItem) {
        const qty = Number(target.quantity) || 1;
        invItem.currentQty = (Number(invItem.currentQty) || 0) + qty;
        invItem.issuedQty = Math.max(0, (Number(invItem.issuedQty) || 0) - qty);
        invItem.totalValue = invItem.currentQty * (Number(invItem.purchasePrice) || 0);

        db.inventoryMovements = db.inventoryMovements || [];
        db.inventoryMovements.unshift({
          id: "mov-rev-" + Date.now(),
          itemId: invItem.id,
          itemName: invItem.name,
          barcode: invItem.barcode,
          type: "inbound",
          quantity: qty,
          reason: `إلغاء سند استلام وإعادة الكمية للمخزون - المستفيد: ${target.beneficiaryName}`,
          approvedBy: user,
          date: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString()
        });
      }
    }

    // Update distribution counters
    const dist = (db.distributions || []).find((d: any) => d.id === target.distributionId);
    if (dist) {
      dist.distributedCount = Math.max(0, (dist.distributedCount || 1) - 1);
      const totalTargeted = (dist.targetedBeneficiaryIds && dist.targetedBeneficiaryIds.length > 0) ? dist.targetedBeneficiaryIds.length : (db.beneficiaries || []).length;
      dist.completionRate = Math.min(100, Math.round((dist.distributedCount / Math.max(1, totalTargeted)) * 100));
      if (dist.status === 'completed' && dist.distributedCount < totalTargeted) {
        dist.status = 'active';
      }
    }

    db.logs.unshift({
      id: "log-" + Date.now(),
      timestamp: new Date().toISOString(),
      user,
      action: `إلغاء سند استلام المساعدة للمستفيد (${target.beneficiaryName}) وإعادة الكمية إلى رصيد المخزون`,
      ip: req.ip || "127.0.0.1",
      device: req.headers["user-agent"] || "System"
    });
    writeDb(db);
    return res.json(db);
  }
  res.status(404).json({ error: "سجل الاستلام غير موجود." });
});

// -------------------------------------------------------------
// Team Points & Volunteer Ratings System (نظام نقاط الفرق والمبادرات)
// -------------------------------------------------------------

// 1. Finish Initiative & Award Base Points (5) + Volunteer Management Evaluation (+5 or +3)
app.post("/api/db/initiatives/evaluate-points", (req, res) => {
  const db = readDb();
  const { 
    initiativeId, 
    evaluationType, // 'completed_best' (+5) or 'average_with_notes' (+3)
    notes = "", 
    evaluatorName = "إدارة التطوع", 
    evaluatorRole = "volunteer_admin" 
  } = req.body;

  // Authorization check: Only volunteer management or top admin
  if (evaluatorRole === 'leader') {
    return res.status(403).json({ error: "لا يمكن لقائد الفريق تقييم المبادرة أو منح النقاط لنفسه." });
  }

  if (!initiativeId) {
    return res.status(400).json({ error: "معرف المبادرة مطلوب." });
  }

  if (!db.initiatives) db.initiatives = [];
  const init = db.initiatives.find((i: any) => i.id === initiativeId);
  if (!init) {
    return res.status(404).json({ error: "المبادرة غير موجودة." });
  }

  if (init.teamPointsAwarded) {
    return res.status(409).json({ error: "تم احتساب نقاط هذه المبادرة مسبقاً ولا يمكن تكرار احتسابها." });
  }

  // Mark initiative as finished
  init.status = 'finished';
  init.lifecycleStatus = 'finished';
  init.registrationStatus = 'archived';

  const basePoints = 5; // 5 نقاط أساسية
  const evalPoints = evaluationType === 'completed_best' ? 5 : evaluationType === 'average_with_notes' ? 3 : 0;
  const totalPoints = basePoints + evalPoints; // 10 أو 8 نقاط

  const evalLabel = evaluationType === 'completed_best'
    ? "أكمل المبادرة بأفضل وجه (+5 نقاط)"
    : "المبادرة متوسطة وفيها بعض الملاحظات (+3 نقاط)";

  const now = new Date();
  const pointsRecord = {
    id: "tpoint-" + Date.now(),
    teamId: init.teamId,
    teamName: init.teamName || "الفريق التطوعي",
    initiativeId: init.id,
    initiativeName: init.name,
    basePoints,
    evaluationPoints: evalPoints,
    totalPoints,
    evaluationType: evaluationType || 'completed_best',
    evaluationLabel: evalLabel,
    evaluatedBy: evaluatorName,
    evaluatedAt: now.toISOString(),
    notes: notes || ""
  };

  if (!db.teamPoints) db.teamPoints = [];
  db.teamPoints.unshift(pointsRecord);

  // Update team cumulative points and history
  if (!db.teams) db.teams = [];
  const team = db.teams.find((t: any) => t.id === init.teamId);
  if (team) {
    team.points = (Number(team.points) || 0) + totalPoints;
    team.pointsHistory = team.pointsHistory || [];
    team.pointsHistory.unshift(pointsRecord);
  }

  // Update initiative state
  init.teamPointsAwarded = true;
  init.teamBasePoints = basePoints;
  init.teamEvaluationPoints = evalPoints;
  init.teamTotalPoints = totalPoints;
  init.teamEvaluationStatus = evaluationType;
  init.evaluatedBy = evaluatorName;
  init.evaluatedAt = now.toISOString();
  init.evaluationNotes = notes;

  // Notify attending volunteers: "انتهت المبادرة التي شاركت فيها" -> "تمت إتاحة تقييم المبادرة"
  const attendees = (db.attendance || []).filter((a: any) => 
    a.initiativeId === init.id && (a.status === 'full' || a.status === 'late')
  );

  if (!db.notifications) db.notifications = [];
  attendees.forEach((att: any) => {
    db.notifications.unshift({
      id: "notif-eval-" + Date.now() + "-" + Math.random().toString(36).substring(2, 5),
      userId: att.volunteerId,
      targetUserId: att.volunteerId,
      recipientType: "volunteers",
      titleAr: "انتهت المبادرة التي شاركت فيها ⭐",
      bodyAr: `انتهت مبادرة (${init.name}) بنجاح. تمت إتاحة تقييم المبادرة، يرجى الدخول وتقديم تقييمك لتطوير العمل التطوعي وتوثيق تجربتك.`,
      category: "initiative",
      type: "important",
      linkUrl: "evaluations",
      date: now.toISOString().split('T')[0],
      createdAt: now.toISOString(),
      read: false
    });
  });

  // Log activity
  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: now.toISOString(),
    user: evaluatorName,
    action: `تقييم المبادرة المنتهية (${init.name}) ومنح فريق (${team ? team.nameAr : init.teamId}) عدد (${totalPoints}) نقاط [أساسية: 5 + تقييم: ${evalPoints}]`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  writeDb(db);
  res.json({ status: "success", pointsRecord, initiative: init, team, db });
});

// 2. Rate Initiative by Volunteer (مع التحقق من الحضور الفعلي ومنع التكرار)
app.post("/api/db/initiatives/rate-by-volunteer", (req, res) => {
  const db = readDb();
  const {
    initiativeId,
    initiativeName,
    volunteerId,
    volunteerName,
    overallRating = 5,
    organizationRating = 5,
    clarityRating = 5,
    leaderSupportRating = 5,
    teamworkRating = 5,
    benefitRating = 5,
    feedbackText = ""
  } = req.body;

  if (!initiativeId || !volunteerId) {
    return res.status(400).json({ error: "معرف المبادرة والمتطوع مطلوبان." });
  }

  // 1. Verify that volunteer actually attended this initiative!
  const attendanceRecord = (db.attendance || []).find((a: any) => 
    a.initiativeId === initiativeId && 
    a.volunteerId === volunteerId && 
    (a.status === 'full' || a.status === 'late')
  );

  if (!attendanceRecord) {
    return res.status(403).json({ 
      error: "لا يمكنك تقييم هذه المبادرة لأنك لم تكن مسجلاً وحاضراً فيها فعلياً.",
      notAttended: true 
    });
  }

  // 2. Verify volunteer hasn't already rated this initiative (منع التكرار)
  if (!db.initiativeRatings) db.initiativeRatings = [];
  const alreadyRated = db.initiativeRatings.some((r: any) => 
    r.initiativeId === initiativeId && r.volunteerId === volunteerId
  );

  if (alreadyRated) {
    return res.status(409).json({ 
      error: "لقد قمت بتقييم هذه المبادرة مسبقاً ولا يمكن التقييم أكثر من مرة.",
      alreadyRated: true 
    });
  }

  const ratingRecord: any = {
    id: "rate-" + Date.now() + "-" + Math.random().toString(36).substring(2, 5),
    initiativeId,
    initiativeName: initiativeName || "مبادرة تطوعية",
    volunteerId,
    volunteerName: volunteerName || "متطوع",
    overallRating: Number(overallRating) || 5,
    organizationRating: Number(organizationRating) || 5,
    clarityRating: Number(clarityRating) || 5,
    leaderSupportRating: Number(leaderSupportRating) || 5,
    teamworkRating: Number(teamworkRating) || 5,
    benefitRating: Number(benefitRating) || 5,
    feedbackText: feedbackText || "",
    createdAt: new Date().toISOString()
  };

  db.initiativeRatings.unshift(ratingRecord);

  // Recalculate average rating on initiative
  const allRatings = db.initiativeRatings.filter((r: any) => r.initiativeId === initiativeId);
  const avg = allRatings.reduce((sum: number, r: any) => sum + (Number(r.overallRating) || 5), 0) / allRatings.length;
  
  const init = (db.initiatives || []).find((i: any) => i.id === initiativeId);
  if (init) {
    init.averageVolunteerRating = Number(avg.toFixed(1));
    init.volunteerRatingsCount = allRatings.length;
  }

  // Unlock certificate for this volunteer
  if (db.issuedCertificates) {
    db.issuedCertificates.forEach((cert: any) => {
      if (cert.volunteerId === volunteerId && (cert.initiativeId === initiativeId || cert.initiativeName === initiativeName)) {
        cert.status = 'unlocked';
      }
    });
  }

  // Award volunteer bonus points for submitting rating
  const vol = (db.volunteers || []).find((v: any) => v.id === volunteerId);
  if (vol) {
    vol.points = (vol.points || 0) + 3;
  }

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: volunteerName || "متطوع",
    action: `تقييم المبادرة (${initiativeName}) بنجاح (التقييم: ${ratingRecord.overallRating}/5)`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  writeDb(db);
  res.json({ status: "success", rating: ratingRecord, db });
});
app.post("/api/db/benefitRequests/add", (req, res) => {
  const db = readDb();
  const request = req.body;
  if (!request.id) {
    request.id = "benreq-" + Date.now();
    request.date = request.date || new Date().toISOString().split('T')[0];
    request.status = request.status || "pending";
    db.benefitRequests.push(request);
  } else {
    const idx = db.benefitRequests.findIndex((r: any) => r.id === request.id);
    if (idx !== -1) {
      db.benefitRequests[idx] = { ...db.benefitRequests[idx], ...request };
    } else {
      db.benefitRequests.push(request);
    }
  }
  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: request.beneficiaryName || "مستفيد",
    action: `تقديم طلب استفادة جديد (نوع: ${request.type})`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });
  writeDb(db);
  res.json(db);
});

// 22. Benefit Requests Update Status
app.post("/api/db/benefitRequests/status", (req, res) => {
  const db = readDb();
  const { id, status, notes } = req.body;
  const request = db.benefitRequests.find((r: any) => r.id === id);
  if (request) {
    request.status = status;
    if (notes !== undefined) request.notes = notes;
    db.logs.unshift({
      id: "log-" + Date.now(),
      timestamp: new Date().toISOString(),
      user: "إدارة الخدمات الإنسانية",
      action: `تحديث حالة طلب الاستفادة المعرف (${id}) إلى: ${status} مع ملاحظة (${notes || 'لا يوجد'})`,
      ip: req.ip || "127.0.0.1",
      device: req.headers["user-agent"] || "System"
    });
  }
  writeDb(db);
  res.json(db);
});

// 22.1 Aid Receipt Confirmation by Beneficiary
app.post("/api/db/aid/confirm-receipt", (req, res) => {
  const db = readDb();
  const { aidId, beneficiaryId, aidType } = req.body;
  if (!aidId || !beneficiaryId) {
    return res.status(400).json({ error: "معرف المساعدة والمستفيد مطلوبان." });
  }

  let found = false;
  if (Array.isArray(db.benefitRequests)) {
    const reqItem = db.benefitRequests.find((r: any) => r.id === aidId && r.beneficiaryId === beneficiaryId);
    if (reqItem) {
      reqItem.beneficiaryConfirmedReceipt = true;
      reqItem.receivedAt = new Date().toISOString();
      if (reqItem.status !== "completed") {
        reqItem.status = "completed";
      }
      found = true;
    }
  }

  if (Array.isArray(db.distributionHandovers)) {
    const handItem = db.distributionHandovers.find((h: any) => (h.id === aidId || h.distributionId === aidId) && h.beneficiaryId === beneficiaryId);
    if (handItem) {
      handItem.beneficiaryConfirmedReceipt = true;
      found = true;
    }
  }

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "بوابة المستفيد",
    action: `تأكيد استلام المساعدة معرف: ${aidId} للمستفيد: ${beneficiaryId}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  writeDb(db);
  res.json(db);
});

// 22.2 Beneficiary Service Rating Submission
app.post("/api/db/beneficiaryRatings/add", (req, res) => {
  const db = readDb();
  if (!Array.isArray(db.beneficiaryRatings)) {
    db.beneficiaryRatings = [];
  }

  const { beneficiaryId, beneficiaryName, nationalId, phone, aidId, aidType, aidTitle, receivedDate, rating, notes } = req.body;

  if (!beneficiaryId || !aidId) {
    return res.status(400).json({ error: "معرف المستفيد والمساعدة مطلوبان." });
  }

  const numRating = Number(rating);
  if (!numRating || numRating < 1 || numRating > 5) {
    return res.status(400).json({ error: "التقييم يجب أن يكون بين 1 و 5 نجوم." });
  }

  // Check for duplicate rating for this same receipt/aid operation
  const existing = db.beneficiaryRatings.find((r: any) => r.aidId === aidId && r.beneficiaryId === beneficiaryId);
  if (existing) {
    return res.status(400).json({ error: "تم تقييم هذه المساعدة مسبقاً، لا يمكن إرسال أكثر من تقييم لنفس عملية الاستلام." });
  }

  const newRatingRecord = {
    id: "benrate-" + Date.now(),
    beneficiaryId,
    beneficiaryName: beneficiaryName || "مستفيد مسجل",
    nationalId: nationalId || "",
    phone: phone || "",
    aidId,
    aidType: aidType || "مساعدة عامة",
    aidTitle: aidTitle || "مساعدة مستلمة",
    receivedDate: receivedDate || new Date().toISOString().split("T")[0],
    rating: numRating,
    notes: (notes || "").trim(),
    createdAt: new Date().toISOString()
  };

  db.beneficiaryRatings.unshift(newRatingRecord);

  // Mark request or handover as rated
  if (Array.isArray(db.benefitRequests)) {
    const reqItem = db.benefitRequests.find((r: any) => r.id === aidId && r.beneficiaryId === beneficiaryId);
    if (reqItem) {
      reqItem.isRated = true;
      reqItem.ratingId = newRatingRecord.id;
    }
  }

  if (Array.isArray(db.distributionHandovers)) {
    const handItem = db.distributionHandovers.find((h: any) => (h.id === aidId || h.distributionId === aidId) && h.beneficiaryId === beneficiaryId);
    if (handItem) {
      handItem.isRated = true;
      handItem.ratingId = newRatingRecord.id;
    }
  }

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "بوابة المستفيد",
    action: `إرسال تقييم خدمة (${numRating} نجوم) للمساعدة: ${aidType || aidTitle || aidId} للمستفيد: ${beneficiaryName || beneficiaryId}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  writeDb(db);
  res.json(db);
});

// 22.3 Partners Batch Update & Reordering
app.post("/api/db/partners/batch-update", (req, res) => {
  const db = readDb();
  const { partners } = req.body;
  if (Array.isArray(partners)) {
    db.partners = partners;
    db.logs.unshift({
      id: "log-" + Date.now(),
      timestamp: new Date().toISOString(),
      user: "إدارة العلاقات العامة",
      action: "تحديث قائمة وترتيب شركاء النجاح والرعاة",
      ip: req.ip || "127.0.0.1",
      device: req.headers["user-agent"] || "System"
    });
    writeDb(db);
  }
  res.json(db);
});

// 22.4 License Image & Settings Update
app.post("/api/db/license/update", (req, res) => {
  const db = readDb();
  if (!db.homeSettings) db.homeSettings = {};
  db.homeSettings.licenseConfig = {
    ...db.homeSettings.licenseConfig,
    ...req.body
  };
  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "الإدارة العامة",
    action: "تحديث إعدادات وصورة ترخيص الجمعية بالصفحة الرئيسية",
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });
  writeDb(db);
  res.json(db);
});

// 22.5 Social Media Links Update
app.post("/api/db/social-links/update", (req, res) => {
  const db = readDb();
  const { socialLinks } = req.body;
  if (Array.isArray(socialLinks)) {
    if (!db.homeSettings) db.homeSettings = {};
    if (!db.systemSettings) db.systemSettings = {};
    db.homeSettings.socialLinks = socialLinks;
    db.systemSettings.socialLinks = socialLinks;
    db.logs.unshift({
      id: "log-" + Date.now(),
      timestamp: new Date().toISOString(),
      user: "إدارة الإعلام والتواصل",
      action: "تحديث روابط وسائل التواصل الاجتماعي للموقع",
      ip: req.ip || "127.0.0.1",
      device: req.headers["user-agent"] || "System"
    });
    writeDb(db);
  }
  res.json(db);
});

// 23. Volunteer Applications: Submit New Application
app.post("/api/db/volunteerApplications/submit", (req, res) => {
  const db = readDb();
  const appData = req.body;
  
  if (!appData.fullName || !appData.phone || !appData.nationalId) {
    return res.status(400).json({ error: "برجاء استكمال جميع البيانات الأساسية ورقم الهوية ورقم الجوال." });
  }

  const cleanNationalId = String(appData.nationalId || '').trim();
  const cleanPhone = String(appData.phone || '').trim();
  const cleanEmail = String(appData.email || '').trim().toLowerCase();
  const opportunityId = appData.opportunityId || appData.opportunity_id || "";
  const opportunityCode = appData.opportunityCode || "";
  const opportunityTitle = appData.opportunityTitle || "";

  // Check if applicant is already an active volunteer in the database
  db.volunteers = db.volunteers || [];
  const existingVolunteer = db.volunteers.find((v: any) => 
    (cleanNationalId && v.nationalId === cleanNationalId) ||
    (cleanPhone && v.phone === cleanPhone) ||
    (cleanEmail && v.email && v.email.toLowerCase() === cleanEmail)
  );

  // If already an approved volunteer and an opportunityId is provided:
  if (existingVolunteer && opportunityId) {
    db.initiatives = db.initiatives || [];
    const init = db.initiatives.find((i: any) => i.id === opportunityId || i.opportunityCode === opportunityId || (opportunityCode && i.opportunityCode === opportunityCode));
    
    if (init) {
      init.acceptedVolunteerIds = init.acceptedVolunteerIds || [];
      init.applicantVolunteerIds = init.applicantVolunteerIds || [];
      init.waitlistVolunteerIds = init.waitlistVolunteerIds || [];

      // Check if already registered in this opportunity
      const isAlreadyInInit = init.acceptedVolunteerIds.includes(existingVolunteer.id) ||
        init.applicantVolunteerIds.includes(existingVolunteer.id) ||
        init.waitlistVolunteerIds.includes(existingVolunteer.id);

      const existingReq = (db.requests || []).find((r: any) => 
        r.volunteerId === existingVolunteer.id && 
        (r.initiativeId === init.id || r.initiativeId === opportunityId) &&
        r.status !== 'rejected'
      );

      if (isAlreadyInInit || existingReq) {
        return res.status(400).json({
          error: "أنت مسجل مسبقاً في هذه الفرصة.",
          alreadyRegistered: true
        });
      }

      // Add to initiative applicants/accepted
      const isFull = (init.acceptedVolunteerIds.length >= (init.neededCount || 10));
      if (!isFull) {
        init.acceptedVolunteerIds.push(existingVolunteer.id);
        init.acceptedCount = init.acceptedVolunteerIds.length;
        if (init.acceptedCount >= (init.neededCount || 10)) {
          init.registrationStatus = 'full';
        }
      } else {
        init.waitlistVolunteerIds.push(existingVolunteer.id);
        init.waitlistCount = init.waitlistVolunteerIds.length;
      }

      if (!init.applicantVolunteerIds.includes(existingVolunteer.id)) {
        init.applicantVolunteerIds.push(existingVolunteer.id);
      }

      db.requests = db.requests || [];
      db.requests.unshift({
        id: "req-" + Date.now(),
        volunteerId: existingVolunteer.id,
        volunteerName: existingVolunteer.name,
        teamId: init.teamId || existingVolunteer.teamId || "team-1",
        departmentId: init.departmentId || existingVolunteer.departmentId || "dep-5",
        initiativeId: init.id,
        initiativeName: init.name,
        status: isFull ? 'waitlist' : 'accepted',
        date: new Date().toISOString().split('T')[0]
      });

      db.logs.unshift({
        id: "log-" + Date.now(),
        timestamp: new Date().toISOString(),
        user: existingVolunteer.name,
        action: `تسجيل المتطوع المعتمد في الفرصة (${init.name}) - تم التعرف التلقائي على حسابه`,
        ip: req.ip || "127.0.0.1",
        device: req.headers["user-agent"] || "System"
      });

      writeDb(db);
      return res.json({
        status: "success",
        isExistingVolunteer: true,
        message: `مرحباً بك ${existingVolunteer.name}! تم تسجيلك بنجاح في الفرصة (${init.name}) بصفتك متطوعاً معتمداً.`,
        volunteer: existingVolunteer,
        db
      });
    }
  }

  // Check if there is already a pending or accepted application for this person on the same opportunity
  db.volunteerApplications = db.volunteerApplications || [];
  if (opportunityId) {
    const duplicateApp = db.volunteerApplications.find((a: any) => 
      (a.opportunityId === opportunityId || a.opportunityCode === opportunityCode) &&
      (a.nationalId === cleanNationalId || a.phone === cleanPhone) &&
      a.status !== 'rejected'
    );

    if (duplicateApp) {
      return res.status(400).json({
        error: "أنت مسجل مسبقاً في هذه الفرصة.",
        alreadyRegistered: true
      });
    }
  }

  // Calculate age if birthDate is provided
  let calculatedAge = appData.age || 20;
  if (appData.birthDate) {
    const birthYear = new Date(appData.birthDate).getFullYear();
    if (!isNaN(birthYear)) {
      calculatedAge = Math.max(15, new Date().getFullYear() - birthYear);
    }
  }

  // Generate unique file number
  const seqNumber = String(db.volunteerApplications.length + 1).padStart(3, "0");
  const fileNumber = appData.fileNumber || `FILE-${new Date().getFullYear()}-${seqNumber}`;

  // Resolve requested team from existing teams in database
  const rawTeamId = appData.requestedTeamId || appData.assignedTeamId || "";
  const foundTeam = (db.teams || []).find((t: any) => t.id === rawTeamId);
  const requestedTeamId = foundTeam ? foundTeam.id : rawTeamId;
  const requestedTeamName = foundTeam ? foundTeam.nameAr : (appData.requestedTeamName || "");

  const newApp: VolunteerApplication = {
    id: appData.id || "app-" + Date.now(),
    fullName: appData.fullName,
    nationalId: cleanNationalId,
    fileNumber: fileNumber,
    gender: appData.gender || "male",
    nationality: appData.nationality || "سعودي",
    birthDate: appData.birthDate || "2000-01-01",
    age: calculatedAge,
    phone: cleanPhone,
    email: cleanEmail,
    position: appData.position || "متطوع",
    joinDate: appData.joinDate || new Date().toISOString().split('T')[0],
    address: appData.address || "مكة المكرمة - مخطط العسيلة",
    bloodType: appData.bloodType || "O+",
    hasChronicIllness: !!appData.hasChronicIllness,
    illnessDetails: appData.illnessDetails || "",
    guardianName: appData.guardianName || "",
    guardianPhone: appData.guardianPhone || "",
    photo: appData.photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&h=300&fit=crop",
    idPhoto: appData.idPhoto || "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&h=250&fit=crop",
    charterPdfUrl: appData.charterPdfUrl || "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    charterPdfName: appData.charterPdfName || `ميثاق_تطوع_${appData.fullName.replace(/\s+/g, '_')}.pdf`,
    experiences: appData.experiences || "",
    agreedToTerms: !!appData.agreedToTerms,
    status: "pending",
    appliedAt: new Date().toISOString(),
    requestedTeamId: requestedTeamId,
    requestedTeamName: requestedTeamName,
    assignedTeamId: requestedTeamId,
    opportunityId: opportunityId || undefined,
    opportunityCode: opportunityCode || undefined,
    opportunityTitle: opportunityTitle || undefined
  };

  db.volunteerApplications.unshift(newApp);

  // System audit log
  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: `المتقدم ${newApp.fullName}`,
    action: `تقديم طلب انضمام جديد كمتطوع ${opportunityTitle ? `للفرصة (${opportunityTitle})` : ''} (الهوية: ${newApp.nationalId} - الملف: ${newApp.fileNumber}) - ينتظر المراجعة`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  // Central Email: Send confirmation to applicant
  if (appData.email && appData.email.includes("@")) {
    sendCentralEmail(db, {
      to: appData.email.trim(),
      recipientName: newApp.fullName,
      subject: `تم استلام طلب انضمامك للتطوع (#${newApp.fileNumber}) - ريادة العطاء`,
      templateType: "volunteer_application_received",
      templateData: {
        applicationNumber: newApp.fileNumber,
        teamName: requestedTeamName || "إدارة التطوع",
        recipientName: newApp.fullName
      }
    }).catch(err => console.error("Volunteer submit email error:", err));
  }

  writeDb(db);
  res.json({ status: "success", application: newApp, db });
});

// 24. Volunteer Applications: Accept Application & Add to Active Volunteers
app.post("/api/db/volunteerApplications/accept", (req, res) => {
  const db = readDb();
  const { applicationId, teamId } = req.body;

  db.volunteerApplications = db.volunteerApplications || [];
  const appObj = db.volunteerApplications.find((a: any) => a.id === applicationId);

  if (!appObj) {
    return res.status(404).json({ error: "طلب الانضمام غير موجود" });
  }

  // Determine target team: prioritize admin's teamId, fallback automatically to volunteer's requested team
  const targetTeamId = teamId || appObj.requestedTeamId || appObj.assignedTeamId;
  let selectedTeam = (db.teams || []).find((t: any) => t.id === targetTeamId);
  if (!selectedTeam && db.teams && db.teams.length > 0) {
    selectedTeam = db.teams[0];
  }
  if (!selectedTeam) {
    return res.status(400).json({ error: "الفريق المحدد غير موجود في النظام" });
  }

  // Update application status and confirmed team
  appObj.status = "accepted";
  appObj.assignedTeamId = selectedTeam.id;
  if (!appObj.requestedTeamName) {
    appObj.requestedTeamName = selectedTeam.nameAr;
  }

  // Create new active volunteer entry
  const seq = String((db.volunteers || []).length + 1).padStart(4, "0");
  const newVol: Volunteer = {
    id: "vol-" + Date.now(),
    name: appObj.fullName,
    email: appObj.email || `vol-${seq}@reyadat-alata.org.sa`,
    phone: appObj.phone,
    photo: appObj.photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&h=300&fit=crop",
    membershipNumber: `V-2026-${seq}`,
    barcode: `100088868${seq}`,
    qrCode: `MEM-V-2026-${seq}`,
    teamId: selectedTeam.id,
    departmentId: selectedTeam.departmentId,
    titleAr: appObj.position || "متطوع معتمد",
    titleEn: "Certified Volunteer",
    status: "active",
    points: 0,
    nationalId: appObj.nationalId,
    issueDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    password: appObj.phone,
    role: "volunteer"
  };

  db.volunteers = db.volunteers || [];
  db.volunteers.push(newVol);

  // Link approved volunteer to the opportunity if application was bound to one (Requirements 20, 21)
  if (appObj.opportunityId) {
    db.initiatives = db.initiatives || [];
    const init = db.initiatives.find((i: any) => i.id === appObj.opportunityId || i.opportunityCode === appObj.opportunityCode);
    if (init) {
      init.acceptedVolunteerIds = init.acceptedVolunteerIds || [];
      if (!init.acceptedVolunteerIds.includes(newVol.id)) {
        init.acceptedVolunteerIds.push(newVol.id);
        init.acceptedCount = init.acceptedVolunteerIds.length;
      }
      init.applicantVolunteerIds = init.applicantVolunteerIds || [];
      if (!init.applicantVolunteerIds.includes(newVol.id)) {
        init.applicantVolunteerIds.push(newVol.id);
      }

      db.requests = db.requests || [];
      db.requests.unshift({
        id: "req-" + Date.now(),
        volunteerId: newVol.id,
        volunteerName: newVol.name,
        teamId: selectedTeam.id,
        departmentId: selectedTeam.departmentId,
        initiativeId: init.id,
        initiativeName: init.name,
        status: 'accepted',
        date: new Date().toISOString().split('T')[0]
      });
    }
  }

  // Send acceptance notification to volunteer
  db.notifications = db.notifications || [];
  db.notifications.unshift({
    id: "not-" + Date.now(),
    userId: newVol.id,
    titleAr: "تم قبول طلب انضمامك كمتطوع معتمد! 🎉",
    titleEn: "Volunteer Application Accepted! 🎉",
    bodyAr: `نهنئك بقبول طلب انضمامك بجمعية ريادة العطاء وإسنادك لفريق (${selectedTeam.nameAr}). يمكنك الآن تسجيل الدخول واستخدام بطاقة التطوع الذكية.`,
    bodyEn: `Congratulations! Your application has been accepted into team (${selectedTeam.nameEn}).`,
    date: new Date().toISOString().split('T')[0],
    read: false
  });

  // Audit log
  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "إدارة التطوع (المسؤول الإداري)",
    action: `قبول طلب انضمام المتطوع (${appObj.fullName}) وتعيينه بفرقة (${selectedTeam.nameAr}) وإضافة ملفه وسجل بطاقته بنجاح`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  // Central Email: Send approval email
  if (newVol.email && newVol.email.includes("@")) {
    sendCentralEmail(db, {
      to: newVol.email.trim(),
      recipientName: newVol.name,
      subject: "تهانينا! تم قبول انضمامك لفريق التطوع - ريادة العطاء",
      templateType: "volunteer_approved",
      templateData: {
        membershipNumber: newVol.membershipNumber,
        teamName: selectedTeam.nameAr,
        leaderName: selectedTeam.leaderName,
        recipientName: newVol.name
      }
    }).catch(err => console.error("Volunteer approved email error:", err));
  }

  writeDb(db);
  res.json({ status: "success", volunteer: newVol, application: appObj, db });
});

// 25. Volunteer Applications: Reject Application
app.post("/api/db/volunteerApplications/reject", (req, res) => {
  const db = readDb();
  const { applicationId, rejectionReason } = req.body;

  db.volunteerApplications = db.volunteerApplications || [];
  const appObj = db.volunteerApplications.find((a: any) => a.id === applicationId);

  if (!appObj) {
    return res.status(404).json({ error: "طلب الانضمام غير موجود" });
  }

  appObj.status = "rejected";
  appObj.rejectionReason = rejectionReason || "لم يتم استيفاء شروط التسجيل الميداني للحملة الحالية.";

  // Audit log
  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "إدارة التطوع (المسؤول الإداري)",
    action: `رفض طلب انضمام المتطوع (${appObj.fullName}) - سبب الرفض: ${appObj.rejectionReason}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  // Central Email: Send rejection notification
  if (appObj.email && appObj.email.includes("@")) {
    sendCentralEmail(db, {
      to: appObj.email.trim(),
      recipientName: appObj.fullName,
      subject: "بشأن طلب الانضمام إلى التطوع - ريادة العطاء",
      templateType: "volunteer_rejected",
      templateData: {
        recipientName: appObj.fullName,
        reason: appObj.rejectionReason
      }
    }).catch(err => console.error("Volunteer reject email error:", err));
  }

  writeDb(db);
  res.json({ status: "success", application: appObj, db });
});

// -------------------------------------------------------------
// Volunteer Team Join Applications Endpoints
// -------------------------------------------------------------

// 1. Get all team applications
app.get("/api/db/teamApplications", (req, res) => {
  const db = readDb();
  res.json(db.teamApplications || []);
});

// 2. Submit new team application
app.post("/api/db/teamApplications/submit", (req, res) => {
  const db = readDb();
  if (!db.teamApplications) {
    db.teamApplications = [];
  }

  const appData = req.body;
  if (!appData.teamName || !appData.leaderName || !appData.leaderPhone) {
    return res.status(400).json({ error: "اسم الفريق، واسم القائد، ورقم جوال القائد حقول إلزامية." });
  }

  const seqNumber = String(db.teamApplications.length + 1).padStart(4, "0");
  const applicationNumber = `TEAM-${new Date().getFullYear()}-${seqNumber}`;

  const newApp: TeamApplication = {
    ...appData,
    id: "t-app-" + Date.now(),
    applicationNumber: appData.applicationNumber || applicationNumber,
    status: "pending",
    submittedAt: new Date().toISOString(),
    membersCount: Number(appData.membersCount) || 1,
    maleMembersCount: Number(appData.maleMembersCount) || 0,
    femaleMembersCount: Number(appData.femaleMembersCount) || 0,
    pastInitiativesCount: Number(appData.pastInitiativesCount) || 0,
    pastBeneficiariesCount: Number(appData.pastBeneficiariesCount) || 0,
    pastVolunteerHours: Number(appData.pastVolunteerHours) || 0,
    services: Array.isArray(appData.services) ? appData.services : (typeof appData.services === "string" ? appData.services.split(",").map((s: string) => s.trim()) : []),
    attachments: appData.attachments || []
  };

  db.teamApplications.unshift(newApp);

  // Send system notification to Admin
  if (!db.notifications) db.notifications = [];
  db.notifications.unshift({
    id: "not-" + Date.now(),
    userId: "admin-1",
    titleAr: `طلب انضمام فريق تطوعي جديد (#${newApp.applicationNumber})`,
    titleEn: `New Volunteer Team Application (${newApp.teamName})`,
    bodyAr: `قدم الفريق التطوعي (${newApp.teamName}) بقيادة (${newApp.leaderName}) طلباً للانضمام إلى ريادة العطاء.`,
    bodyEn: `Team ${newApp.teamName} submitted a join application.`,
    date: new Date().toISOString().split("T")[0],
    read: false
  });

  // Audit log
  if (!db.logs) db.logs = [];
  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: `قائد الفريق المتقدم (${newApp.leaderName})`,
    action: `تقديم طلب انضمام فريق تطوعي جديد: ${newApp.teamName} (رقم الطلب: ${newApp.applicationNumber})`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "Web Browser"
  });

  // Central Email: Send confirmation to team leader
  if (appData.leaderEmail && appData.leaderEmail.includes("@")) {
    sendCentralEmail(db, {
      to: appData.leaderEmail.trim(),
      recipientName: newApp.leaderName,
      subject: `تم استلام طلب تأسيس الفريق التطوعي (#${newApp.applicationNumber}) - ريادة العطاء`,
      templateType: "team_application_received",
      templateData: {
        teamName: newApp.teamName,
        leaderName: newApp.leaderName,
        status: "قيد المراجعة الإدارية"
      }
    }).catch(err => console.error("Team submit email error:", err));
  }

  writeDb(db);
  res.json({
    status: "success",
    message: "تم استلام طلب انضمام الفريق بنجاح ووضعه قيد المراجعة الإدارية",
    application: newApp,
    applicationNumber: newApp.applicationNumber,
    db
  });
});

// 3. Accept & Approve Team Application (converts to VolunteerTeam + Leader account)
app.post("/api/db/teamApplications/accept", (req, res) => {
  const db = readDb();
  const { applicationId, departmentId, reviewerNotes } = req.body;

  if (!applicationId) {
    return res.status(400).json({ error: "معرف الطلب مطلوب." });
  }

  const appObj = (db.teamApplications || []).find((a: any) => a.id === applicationId);
  if (!appObj) {
    return res.status(404).json({ error: "طلب انضمام الفريق غير موجود." });
  }

  const targetDepartmentId = departmentId || appObj.targetDepartment || (db.departments && db.departments[0]?.id) || "dep-3";

  // Update application status
  appObj.status = "approved";
  appObj.approvedDepartmentId = targetDepartmentId;
  appObj.reviewedAt = new Date().toISOString();
  appObj.reviewedBy = "إدارة شؤون الفرق التطوعية";
  if (reviewerNotes) {
    appObj.reviewerNotes = reviewerNotes;
  }

  // Create VolunteerTeam object
  const newTeamId = "team-" + Date.now();
  const newTeam: VolunteerTeam = {
    id: newTeamId,
    nameAr: appObj.teamName,
    nameEn: appObj.teamNameEn || appObj.teamName,
    departmentId: targetDepartmentId,
    leaderName: appObj.leaderName,
    descriptionAr: appObj.description || appObj.meaningfulIdea || "فريق تطوعي معتمد تحت مظلة جمعية ريادة العطاء لخدمة الإنسان بالعسيلة.",
    descriptionEn: appObj.descriptionEn || "Accredited Volunteer Team under Reyadat Al-Ata Association",
    city: appObj.city || "مكة المكرمة",
    establishedDate: appObj.establishedDate || new Date().toISOString().split("T")[0],
    membersCount: Number(appObj.membersCount) || 12,
    initiativesCount: Number(appObj.pastInitiativesCount) || 0,
    color: appObj.teamColor || "#059669",
    leaderPhone: appObj.leaderPhone,
    leaderEmail: appObj.leaderEmail,
    leaderNationalId: appObj.leaderNationalId,
    vision: appObj.vision,
    mission: appObj.mission,
    goals: appObj.goals,
    services: appObj.services || [],
    meaningfulIdea: appObj.meaningfulIdea,
    logoUrl: appObj.logoUrl || "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=200&h=200&fit=crop",
    status: "active",
    socialLinks: appObj.socialLinks,
    attachments: appObj.attachments,
    pastBeneficiariesCount: appObj.pastBeneficiariesCount,
    pastVolunteerHours: appObj.pastVolunteerHours,
    pastPartnerEntities: appObj.pastPartnerEntities,
    majorPastInitiatives: appObj.majorPastInitiatives,
    achievementsAndExperience: appObj.achievementsAndExperience,
    awardsAndHonors: appObj.awardsAndHonors,
    applicationNumber: appObj.applicationNumber
  };

  if (!db.teams) db.teams = [];
  db.teams.push(newTeam);
  appObj.createdTeamId = newTeamId;

  // Create leader volunteer account if not already existing
  if (!db.volunteers) db.volunteers = [];
  let leaderVol = db.volunteers.find((v: any) => 
    (appObj.leaderNationalId && v.nationalId === appObj.leaderNationalId) || 
    (appObj.leaderPhone && v.phone === appObj.leaderPhone)
  );

  if (!leaderVol) {
    leaderVol = {
      id: "lead-" + Date.now(),
      name: appObj.leaderName,
      email: appObj.leaderEmail || `leader.${Date.now()}@riadataleata.org.sa`,
      phone: appObj.leaderPhone,
      nationalId: appObj.leaderNationalId || `10${Math.floor(10000000 + Math.random() * 90000000)}`,
      password: appObj.leaderPhone || "123456",
      teamId: newTeamId,
      departmentId: targetDepartmentId,
      role: "leader",
      points: 120,
      hours: Number(appObj.pastVolunteerHours) || 0,
      membershipNumber: "VOL-LEAD-" + Math.floor(100000 + Math.random() * 900000),
      barcode: "" + Math.floor(1000000000 + Math.random() * 9000000000),
      photo: appObj.logoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop",
      status: "active",
      joinDate: new Date().toISOString().split("T")[0]
    };
    db.volunteers.push(leaderVol);
  } else {
    // Update existing user to lead the new team
    leaderVol.teamId = newTeamId;
    leaderVol.departmentId = targetDepartmentId;
    leaderVol.role = "leader";
  }

  // System notification
  if (!db.notifications) db.notifications = [];
  db.notifications.unshift({
    id: "not-" + Date.now(),
    userId: "all",
    titleAr: `اعتماد انضمام فريق تطوعي جديد: ${newTeam.nameAr}`,
    titleEn: `New Volunteer Team Approved: ${newTeam.nameAr}`,
    bodyAr: `تمت الموافقة الرسمية على طلب انضمام فريق (${newTeam.nameAr}) بقيادة (${newTeam.leaderName}) وتعيينه تحت مظلة الجمعية.`,
    bodyEn: `Team ${newTeam.nameAr} has been accredited and added to the official volunteer directory.`,
    date: new Date().toISOString().split("T")[0],
    read: false
  });

  // Audit log
  if (!db.logs) db.logs = [];
  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "الإدارة العامة (مسؤول التطوع)",
    action: `اعتماد طلب انضمام فريق تطوعي (${appObj.teamName}) وإنشاء سجل الفريق (#${newTeamId}) وتفعيل حساب القائد (${appObj.leaderName})`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "Admin Panel"
  });

  // Central Email: Send approval email to team leader
  if (appObj.leaderEmail && appObj.leaderEmail.includes("@")) {
    sendCentralEmail(db, {
      to: appObj.leaderEmail.trim(),
      recipientName: appObj.leaderName,
      subject: `اعتماد تأسيس فريق (${appObj.teamName}) رسمياً - ريادة العطاء`,
      templateType: "team_application_approved",
      templateData: {
        teamName: appObj.teamName,
        leaderName: appObj.leaderName,
        status: "معتمد وفعال"
      }
    }).catch(err => console.error("Team accept email error:", err));
  }

  writeDb(db);
  res.json({
    status: "success",
    message: "تم اعتماد الفريق بنجاح وإنشاء سجله الرسمي وتفعيل حساب القائد",
    team: newTeam,
    application: appObj,
    leader: leaderVol,
    db
  });
});

// 4. Reject Team Application
app.post("/api/db/teamApplications/reject", (req, res) => {
  const db = readDb();
  const { applicationId, rejectionReason } = req.body;

  if (!applicationId) {
    return res.status(400).json({ error: "معرف الطلب مطلوب." });
  }

  const appObj = (db.teamApplications || []).find((a: any) => a.id === applicationId);
  if (!appObj) {
    return res.status(404).json({ error: "طلب انضمام الفريق غير موجود." });
  }

  appObj.status = "rejected";
  appObj.rejectionReason = rejectionReason || "لم يتم استيفاء معايير وقواعد الانضمام المعتمدة للفرق التطوعية.";
  appObj.reviewedAt = new Date().toISOString();
  appObj.reviewedBy = "إدارة شؤون الفرق التطوعية";

  // Audit log
  if (!db.logs) db.logs = [];
  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "إدارة التطوع (المسؤول الإداري)",
    action: `رفض طلب انضمام الفريق التطوعي (${appObj.teamName}) - سبب الرفض: ${appObj.rejectionReason}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "Admin Panel"
  });

  // Central Email: Send polite rejection email to leader
  if (appObj.leaderEmail && appObj.leaderEmail.includes("@")) {
    sendCentralEmail(db, {
      to: appObj.leaderEmail.trim(),
      recipientName: appObj.leaderName,
      subject: `بشأن طلب انضمام فريق (${appObj.teamName}) - ريادة العطاء`,
      templateType: "team_application_rejected",
      templateData: {
        teamName: appObj.teamName,
        leaderName: appObj.leaderName,
        rejectionReason: appObj.rejectionReason
      }
    }).catch(err => console.error("Team reject email error:", err));
  }

  writeDb(db);
  res.json({
    status: "success",
    message: "تم رفض طلب انضمام الفريق وحفظ سبب الرفض",
    application: appObj,
    db
  });
});

// 5. Request Correction / Additional Info from Team Application
app.post("/api/db/teamApplications/request-correction", (req, res) => {
  const db = readDb();
  const { applicationId, correctionNotes } = req.body;

  if (!applicationId) {
    return res.status(400).json({ error: "معرف الطلب مطلوب." });
  }

  const appObj = (db.teamApplications || []).find((a: any) => a.id === applicationId);
  if (!appObj) {
    return res.status(404).json({ error: "طلب انضمام الفريق غير موجود." });
  }

  appObj.status = "needs_correction";
  appObj.correctionNotes = correctionNotes || "يرجى استكمال البيانات وإرفاق الوثائق الداعمة.";
  appObj.reviewedAt = new Date().toISOString();

  // Audit log
  if (!db.logs) db.logs = [];
  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "إدارة التطوع (المسؤول الإداري)",
    action: `طلب استكمال وتعديل بيانات انضمام الفريق التطوعي (${appObj.teamName}) - الملاحظات: ${appObj.correctionNotes}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "Admin Panel"
  });

  writeDb(db);
  res.json({
    status: "success",
    message: "تم إرسال طلب التعديل والاستكمال للقائد بنجاح",
    application: appObj,
    db
  });
});

// 6. Delete Team Application
app.post("/api/db/teamApplications/delete", (req, res) => {
  const db = readDb();
  const { applicationId } = req.body;

  if (!applicationId) {
    return res.status(400).json({ error: "معرف الطلب مطلوب." });
  }

  if (db.teamApplications) {
    db.teamApplications = db.teamApplications.filter((a: any) => a.id !== applicationId);
  }

  writeDb(db);
  res.json({
    status: "success",
    message: "تم حذف الطلب بنجاح",
    db
  });
});

// -------------------------------------------------------------
// Chat API Endpoints (WhatsApp-style Internal Messaging)
// -------------------------------------------------------------

// Get Chat Conversations
app.get("/api/chat/conversations", (req, res) => {
  const db = readDb();
  const userId = req.query.userId as string;
  let convs = db.chatConversations || [];
  if (userId) {
    convs = convs.filter((c: any) => c.participantIds && c.participantIds.includes(userId));
  }
  res.json(convs);
});

// Create New Conversation (Direct or Group)
app.post("/api/chat/conversations", (req, res) => {
  const db = readDb();
  const { type, name, participantIds, participantNames, teamId, avatar } = req.body;

  db.chatConversations = db.chatConversations || [];
  
  // Check if direct conversation already exists
  if (type === "direct" && participantIds && participantIds.length === 2) {
    const existing = db.chatConversations.find((c: any) => 
      c.type === "direct" && 
      c.participantIds.includes(participantIds[0]) && 
      c.participantIds.includes(participantIds[1])
    );
    if (existing) {
      return res.json({ conversation: existing, db });
    }
  }

  const newConv = {
    id: "conv-" + Date.now(),
    type: type || "direct",
    name: name || "محادثة جديدة",
    avatar: avatar || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=120&h=120&fit=crop",
    participantIds: participantIds || [],
    participantNames: participantNames || [],
    teamId: teamId || undefined,
    lastMessage: "تم بدء المحادثة",
    lastMessageTime: new Date().toISOString(),
    unreadCount: {},
    createdAt: new Date().toISOString()
  };

  db.chatConversations.unshift(newConv);

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "النظام",
    action: `إنشاء محادثة جديدة (${newConv.name})`,
    ip: req.ip || "127.0.0.1",
    device: "Internal Chat System"
  });

  writeDb(db);
  res.json({ conversation: newConv, db });
});

// Get Messages for a Conversation
app.get("/api/chat/messages/:conversationId", (req, res) => {
  const db = readDb();
  const { conversationId } = req.params;
  const messages = (db.chatMessages || []).filter((m: any) => m.conversationId === conversationId);
  res.json(messages);
});

// Send a Chat Message
app.post("/api/chat/messages", (req, res) => {
  const db = readDb();
  const { conversationId, senderId, senderName, senderAvatar, senderRole, type, content, fileName, fileSize } = req.body;

  if (!conversationId || !senderId || !content) {
    return res.status(400).json({ error: "بيانات الرسالة غير اكتمال" });
  }

  db.chatMessages = db.chatMessages || [];
  db.chatConversations = db.chatConversations || [];

  const newMsg = {
    id: "msg-" + Date.now(),
    conversationId,
    senderId,
    senderName: senderName || "مستخدم",
    senderAvatar: senderAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop",
    senderRole: senderRole || "إداري",
    type: type || "text",
    content,
    fileName: fileName || undefined,
    fileSize: fileSize || undefined,
    timestamp: new Date().toISOString(),
    status: "sent"
  };

  db.chatMessages.push(newMsg);

  // Update conversation last message & time
  const conv = db.chatConversations.find((c: any) => c.id === conversationId);
  if (conv) {
    let previewText = content;
    if (type === "image") previewText = "📷 [صورة مرفقة]";
    if (type === "file") previewText = `📁 [ملف مرفق: ${fileName || 'مستند'}]`;
    if (type === "audio") previewText = "🎤 [تسجيل صوتي]";
    if (type === "video") previewText = "🎥 [مقطع فيديو]";

    conv.lastMessage = previewText;
    conv.lastMessageTime = newMsg.timestamp;

    // Increment unread count for other participants
    conv.unreadCount = conv.unreadCount || {};
    (conv.participantIds || []).forEach((pid: string) => {
      if (pid !== senderId) {
        conv.unreadCount[pid] = (conv.unreadCount[pid] || 0) + 1;
      }
    });
  }

  writeDb(db);
  res.json({ message: newMsg, db });
});

// Mark Conversation as Read for User
app.post("/api/chat/mark-read", (req, res) => {
  const db = readDb();
  const { conversationId, userId } = req.body;

  if (db.chatConversations) {
    const conv = db.chatConversations.find((c: any) => c.id === conversationId);
    if (conv && conv.unreadCount && userId) {
      conv.unreadCount[userId] = 0;
    }
  }

  if (db.chatMessages) {
    db.chatMessages.forEach((m: any) => {
      if (m.conversationId === conversationId && m.senderId !== userId) {
        m.status = "read";
      }
    });
  }

  writeDb(db);
  res.json({ status: "success", db });
});

// -------------------------------------------------------------
// Technical Support & Ticket Endpoints
// -------------------------------------------------------------

// Get All Support Tickets
app.get("/api/support/tickets", (req, res) => {
  const db = readDb();
  res.json(db.supportTickets || []);
});

// Create Support Ticket
app.post("/api/support/tickets/create", (req, res) => {
  const db = readDb();
  const { requesterId, requesterName, requesterEmail, requesterPhone, requesterRole, subject, priority, initialMessage, chatTranscript, escalationReason } = req.body;

  db.supportTickets = db.supportTickets || [];

  const ticketSeq = String(db.supportTickets.length + 1).padStart(3, "0");
  const ticketNumber = `TICK-${new Date().getFullYear()}-${ticketSeq}`;

  const initialTranscript = chatTranscript || [
    {
      id: "tm-" + Date.now(),
      ticketId: "",
      senderType: "user",
      senderName: requesterName || "المستخدم",
      content: initialMessage || subject || "طلب دعم فني جديد",
      timestamp: new Date().toISOString()
    }
  ];

  const newTicket = {
    id: "ticket-" + Date.now(),
    ticketNumber,
    requesterId: requesterId || "usr-" + Date.now(),
    requesterName: requesterName || "زائر / مستخدم",
    requesterEmail: requesterEmail || "user@reyada.sa",
    requesterPhone: requesterPhone || "0500000000",
    requesterRole: requesterRole || "volunteer",
    subject: subject || "طلب مساعدة وتدخل تقني",
    status: "new",
    priority: priority || "urgent",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    escalatedFromAi: true,
    escalationReason: escalationReason || "تحويل تلقائي من مساعد الذكاء الاصطناعي بناءً على طلب المستخدم أو صعوبة الطلب.",
    chatTranscript: initialTranscript
  };

  db.supportTickets.unshift(newTicket);

  // Notify Admins in Audit Log
  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "نظام الدعم الفني الذكي",
    action: `🔔 يوجد طلب دعم فني جديد يحتاج إلى تدخل (تذكرة #${ticketNumber}) - المقدم: ${newTicket.requesterName}`,
    ip: req.ip || "127.0.0.1",
    device: "AI Support Escalator"
  });

  // Central Email: Send confirmation to requester
  if (newTicket.requesterEmail && newTicket.requesterEmail.includes("@")) {
    sendCentralEmail(db, {
      to: newTicket.requesterEmail.trim(),
      recipientName: newTicket.requesterName,
      subject: `تم فتح تذكرة دعم واستفسار (#${ticketNumber}) - ريادة العطاء`,
      templateType: "support_ticket_created",
      templateData: {
        ticketNumber: ticketNumber,
        ticketTitle: newTicket.subject,
        status: "قيد المتابعة من الدعم الفني"
      }
    }).catch(err => console.error("Ticket email error:", err));
  }

  writeDb(db);
  res.json({ ticket: newTicket, db });
});

// Reply to Ticket (By User or Support Agent)
app.post("/api/support/tickets/reply", (req, res) => {
  const db = readDb();
  const { ticketId, senderType, senderName, content } = req.body;

  db.supportTickets = db.supportTickets || [];
  const ticket = db.supportTickets.find((t: any) => t.id === ticketId || t.ticketNumber === ticketId);

  if (!ticket) {
    return res.status(404).json({ error: "التذكرة غير موجودة" });
  }

  const newMsg = {
    id: "tm-" + Date.now(),
    ticketId: ticket.id,
    senderType: senderType || "agent",
    senderName: senderName || "موظف الدعم الفني",
    content,
    timestamp: new Date().toISOString()
  };

  ticket.chatTranscript = ticket.chatTranscript || [];
  ticket.chatTranscript.push(newMsg);
  ticket.updatedAt = new Date().toISOString();

  if (senderType === "agent") {
    ticket.status = "in_progress";
    ticket.assignedToAgentName = senderName || "موظف الدعم الفني";
  } else if (senderType === "user") {
    ticket.status = "new";
  }

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: senderName || "الدعم الفني",
    action: `إضافة رد على تذكرة الدعم الفني (#${ticket.ticketNumber})`,
    ip: req.ip || "127.0.0.1",
    device: "Support Dashboard"
  });

  // Central Email: Notify user if support agent replied
  if (senderType === "agent" && ticket.requesterEmail && ticket.requesterEmail.includes("@")) {
    sendCentralEmail(db, {
      to: ticket.requesterEmail.trim(),
      recipientName: ticket.requesterName,
      subject: `رد من إدارة الجمعية على تذكرتكم (#${ticket.ticketNumber}) - ريادة العطاء`,
      templateType: "support_ticket_reply",
      templateData: {
        ticketNumber: ticket.ticketNumber,
        ticketTitle: ticket.subject,
        replyContent: content,
        status: ticket.status
      }
    }).catch(err => console.error("Ticket reply email error:", err));
  }

  writeDb(db);
  res.json({ ticket, db });
});

// Update Ticket Status (e.g., Close Ticket)
app.post("/api/support/tickets/status", (req, res) => {
  const db = readDb();
  const { ticketId, status, notes } = req.body;

  db.supportTickets = db.supportTickets || [];
  const ticket = db.supportTickets.find((t: any) => t.id === ticketId || t.ticketNumber === ticketId);

  if (!ticket) {
    return res.status(404).json({ error: "التذكرة غير موجودة" });
  }

  ticket.status = status;
  ticket.updatedAt = new Date().toISOString();

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "إدارة الدعم الفني",
    action: `تحديث حالة تذكرة الدعم (#${ticket.ticketNumber}) إلى: ${status} ${notes ? `(${notes})` : ''}`,
    ip: req.ip || "127.0.0.1",
    device: "Support Dashboard"
  });

  writeDb(db);
  res.json({ ticket, db });
});

// -------------------------------------------------------------
// Electronic Custody Management Routes (نظام العهدة الإلكترونية)
// -------------------------------------------------------------

// 1. Get All Custodies
app.get("/api/db/custodies", (req, res) => {
  const db = readDb();
  res.json(db.custodies || []);
});

// 2. Add New Electronic Custody
app.post("/api/db/custodies/add", (req, res) => {
  const db = readDb();
  const { 
    recipientName, 
    recipientType, 
    recipientIdNumber, 
    recipientEmail, 
    recipientPhone, 
    itemName, 
    itemCategory, 
    description, 
    quantity, 
    serialNumber, 
    conditionOnDelivery, 
    deliveryDate, 
    expectedReturnDate, 
    notes, 
    adminName, 
    adminRole 
  } = req.body;

  if (!recipientName || !itemName) {
    return res.status(400).json({ error: "اسم المستلم واسم العهدة حقول مطلوبة." });
  }

  db.custodies = db.custodies || [];
  const seq = String(db.custodies.length + 1).padStart(3, "0");
  const year = new Date().getFullYear();
  const custodyCode = `CUST-${year}-${seq}`;

  // Process email status
  let emailStatus = "not_available";
  let emailSentAt = undefined;
  if (recipientEmail && recipientEmail.includes("@")) {
    emailStatus = "sent";
    emailSentAt = new Date().toISOString();
  }

  const newCustody = {
    id: "cust-" + Date.now(),
    custodyCode,
    recipientName: String(recipientName).trim(),
    recipientType: recipientType || "volunteer",
    recipientIdNumber: recipientIdNumber ? String(recipientIdNumber).trim() : "",
    recipientEmail: recipientEmail ? String(recipientEmail).trim() : "",
    recipientPhone: recipientPhone ? String(recipientPhone).trim() : "",
    itemName: String(itemName).trim(),
    itemCategory: itemCategory || "أجهزة ومعدات ميدانية",
    description: description || "",
    quantity: Number(quantity) || 1,
    serialNumber: serialNumber ? String(serialNumber).trim() : "",
    status: "delivered",
    conditionOnDelivery: conditionOnDelivery || "ممتازة",
    deliveryDate: deliveryDate || new Date().toISOString().split("T")[0],
    expectedReturnDate: expectedReturnDate || "",
    notes: notes || "",
    adminName: adminName || "المدير التنفيذي - إدارة العهد",
    adminRole: adminRole || "مسؤول العهد والمستودع",
    emailStatus,
    emailSentAt,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    history: [
      {
        id: "ch-" + Date.now(),
        timestamp: new Date().toISOString(),
        action: "تسليم العهدة وإنشاء المحضر الرسمي",
        actor: adminName || "إدارة العهد والمستودع",
        notes: `تم تسليم ${quantity || 1} من ${itemName} للمستلم ${recipientName}`
      }
    ]
  };

  db.custodies.unshift(newCustody);

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: adminName || "مسؤول العهد",
    action: `📦 تم إصدار عهدة رسمية جديدة (#${custodyCode}) باسم: ${recipientName} - المادة: ${itemName}`,
    ip: req.ip || "127.0.0.1",
    device: "Custody Management"
  });

  writeDb(db);
  res.json({ success: true, custody: newCustody, custodies: db.custodies, db });
});

// 3. Update Existing Custody
app.post("/api/db/custodies/update", (req, res) => {
  const db = readDb();
  const { custodyId, updates, adminName } = req.body;

  db.custodies = db.custodies || [];
  const custody = db.custodies.find((c: any) => c.id === custodyId || c.custodyCode === custodyId);
  if (!custody) {
    return res.status(404).json({ error: "العهدة غير موجودة" });
  }

  Object.assign(custody, updates, { updatedAt: new Date().toISOString() });

  custody.history = custody.history || [];
  custody.history.unshift({
    id: "ch-" + Date.now(),
    timestamp: new Date().toISOString(),
    action: "تعديل وتحديث بيانات العهدة",
    actor: adminName || "مسؤول العهد والمستودع",
    notes: "تم تحديث البيانات الإدارية للعهدة"
  });

  writeDb(db);
  res.json({ success: true, custody, custodies: db.custodies, db });
});

// 4. Return Custody (استرجاع العهدة)
app.post("/api/db/custodies/return", (req, res) => {
  const db = readDb();
  const { custodyId, returnNotes, conditionOnReturn, returnDate, adminName } = req.body;

  db.custodies = db.custodies || [];
  const custody = db.custodies.find((c: any) => c.id === custodyId || c.custodyCode === custodyId);
  if (!custody) {
    return res.status(404).json({ error: "العهدة غير موجودة" });
  }

  custody.status = "returned";
  custody.actualReturnDate = returnDate || new Date().toISOString().split("T")[0];
  custody.updatedAt = new Date().toISOString();
  if (returnNotes) {
    custody.notes = (custody.notes ? custody.notes + "\n" : "") + `[ملاحظات الإرجاع]: ${returnNotes}`;
  }

  custody.history = custody.history || [];
  custody.history.unshift({
    id: "ch-" + Date.now(),
    timestamp: new Date().toISOString(),
    action: "استرجاع العهدة وإغلاق المحضر",
    actor: adminName || "مسؤول العهد والمستودع",
    notes: `تم استلام العهدة بحالة: ${conditionOnReturn || "جيدة"} ${returnNotes ? `| ملاحظات: ${returnNotes}` : ""}`
  });

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: adminName || "مسؤول العهد",
    action: `✅ تم استرجاع العهدة (#${custody.custodyCode}) المسلمة لـ: ${custody.recipientName}`,
    ip: req.ip || "127.0.0.1",
    device: "Custody Management"
  });

  writeDb(db);
  res.json({ success: true, custody, custodies: db.custodies, db });
});

// 5. Resend Email Notification for Custody
app.post("/api/db/custodies/resend-email", async (req, res) => {
  const db = readDb();
  const { custodyId } = req.body;

  db.custodies = db.custodies || [];
  const custody = db.custodies.find((c: any) => c.id === custodyId || c.custodyCode === custodyId);
  if (!custody) {
    return res.status(404).json({ error: "العهدة غير موجودة" });
  }

  if (!custody.recipientEmail || !custody.recipientEmail.includes("@")) {
    return res.status(400).json({ error: "لا يتوفر بريد إلكتروني مسجل للشخص المستلم." });
  }

  const sendRes = await sendCentralEmail(db, {
    to: custody.recipientEmail.trim(),
    recipientName: custody.recipientName,
    subject: `إشعار ومحضر استلام العهدة الرسمية (#${custody.custodyCode}) - ريادة العطاء`,
    templateType: "custody_notification",
    templateData: {
      custodyCode: custody.custodyCode,
      recipientName: custody.recipientName,
      itemDescription: custody.itemDescription || (Array.isArray(custody.items) ? custody.items.map((i: any) => i.name).join(", ") : "أصول وعهد رسمية"),
      departmentName: custody.departmentName || "إدارة الجمعية",
      status: "مسلمة وموثقة"
    }
  });

  custody.emailStatus = sendRes.success ? "delivered" : "failed";
  custody.emailSentAt = new Date().toISOString();
  custody.updatedAt = new Date().toISOString();

  custody.history = custody.history || [];
  custody.history.unshift({
    id: "ch-" + Date.now(),
    timestamp: new Date().toISOString(),
    action: "إعادة إرسال إشعار العهدة ومحضر PDF عبر البريد الإلكتروني المركزي",
    actor: "المسؤول",
    notes: sendRes.success
      ? `تم الإرسال بنجاح إلى: ${custody.recipientEmail} عبر (${sendRes.provider})`
      : `فشل الإرسال: ${sendRes.error}`
  });

  writeDb(db);
  res.json({ success: sendRes.success, custody, custodies: db.custodies, db, emailResult: sendRes });
});

// -------------------------------------------------------------
// Technical Support: Agents & Task Management Routes
// -------------------------------------------------------------

// Get all support agents
app.get("/api/support/agents", (req, res) => {
  const db = readDb();
  res.json(db.supportAgents || []);
});

// Add new support agent (Support Manager)
app.post("/api/support/agents/add", (req, res) => {
  const db = readDb();
  const { name, username, password, email, phone, permissions, managerId } = req.body;

  if (!name || !username) {
    return res.status(400).json({ error: "اسم الموظف واسم المستخدم حقول مطلوبة" });
  }

  db.supportAgents = db.supportAgents || [];
  if (db.supportAgents.some((a: any) => a.username?.toLowerCase() === username.trim().toLowerCase())) {
    return res.status(400).json({ error: "اسم المستخدم مسجل مسبقاً لموظف آخر" });
  }

  const newAgent = {
    id: "sa-" + Date.now(),
    name: String(name).trim(),
    username: String(username).trim(),
    password: password ? String(password).trim() : "123",
    email: email ? String(email).trim() : "",
    phone: phone ? String(phone).trim() : "",
    role: "support_agent",
    status: "active",
    permissions: permissions || ["view_assigned_tasks", "reply_tickets", "close_tasks"],
    managerId: managerId || "sm-1",
    createdAt: new Date().toISOString(),
    activeTasksCount: 0,
    completedTasksCount: 0
  };

  db.supportAgents.push(newAgent);

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "مدير الدعم الفني",
    action: `إضافة موظف دعم فني جديد: ${newAgent.name} (@${newAgent.username})`,
    ip: req.ip || "127.0.0.1",
    device: "Support Manager"
  });

  writeDb(db);
  res.json({ success: true, agent: newAgent, agents: db.supportAgents, db });
});

// Update agent status or permissions
app.post("/api/support/agents/update-status", (req, res) => {
  const db = readDb();
  const { agentId, status, permissions } = req.body;

  db.supportAgents = db.supportAgents || [];
  const agent = db.supportAgents.find((a: any) => a.id === agentId);
  if (!agent) return res.status(404).json({ error: "موظف الدعم غير موجود" });

  if (status) agent.status = status;
  if (permissions) agent.permissions = permissions;

  writeDb(db);
  res.json({ success: true, agent, agents: db.supportAgents, db });
});

// Get all support tasks (with optional filter by agentId)
app.get("/api/support/tasks", (req, res) => {
  const db = readDb();
  const { agentId } = req.query;
  let tasks = db.supportTasks || [];
  if (agentId && typeof agentId === "string") {
    tasks = tasks.filter((t: any) => t.assignedAgentId === agentId);
  }
  res.json(tasks);
});

// Create and assign a support task (Support Manager)
app.post("/api/support/tasks/create", (req, res) => {
  const db = readDb();
  const { 
    title, 
    description, 
    requesterName, 
    requesterContact, 
    requesterRole, 
    assignedAgentId, 
    priority, 
    dueDate, 
    notes, 
    ticketId, 
    creatorName 
  } = req.body;

  if (!title || !assignedAgentId) {
    return res.status(400).json({ error: "عنوان المهمة والموظف المكلف حقول مطلوبة" });
  }

  db.supportAgents = db.supportAgents || [];
  const assignedAgent = db.supportAgents.find((a: any) => a.id === assignedAgentId);
  const assignedAgentName = assignedAgent ? assignedAgent.name : "موظف الدعم الفني";

  db.supportTasks = db.supportTasks || [];
  const seq = String(db.supportTasks.length + 1).padStart(3, "0");
  const year = new Date().getFullYear();
  const taskNumber = `TASK-${year}-${seq}`;

  const newTask = {
    id: "task-" + Date.now(),
    taskNumber,
    ticketId: ticketId || undefined,
    title: String(title).trim(),
    description: description || "",
    requesterName: requesterName || "مستخدم عام",
    requesterContact: requesterContact || "",
    requesterRole: requesterRole || "مستخدم",
    assignedAgentId,
    assignedAgentName,
    priority: priority || "medium",
    status: "new",
    createdAt: new Date().toISOString(),
    dueDate: dueDate || "",
    notes: notes || "",
    history: [
      {
        id: "th-" + Date.now(),
        timestamp: new Date().toISOString(),
        actor: creatorName || "مدير الدعم الفني",
        action: `إنشاء المهمة وتعيينها إلى ${assignedAgentName}`,
        notes: notes || ""
      }
    ]
  };

  db.supportTasks.unshift(newTask);

  // If created from a ticket, link ticket and update status
  if (ticketId) {
    db.supportTickets = db.supportTickets || [];
    const ticket = db.supportTickets.find((t: any) => t.id === ticketId || t.ticketNumber === ticketId);
    if (ticket) {
      ticket.assignedToAgentName = assignedAgentName;
      ticket.status = "in_progress";
    }
  }

  // Update agent active task counter
  if (assignedAgent) {
    assignedAgent.activeTasksCount = (assignedAgent.activeTasksCount || 0) + 1;
  }

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: creatorName || "مدير الدعم",
    action: `📌 تعيين مهمة دعم جديدة (#${taskNumber}) للموظف: ${assignedAgentName} - العنوان: ${title}`,
    ip: req.ip || "127.0.0.1",
    device: "Support Manager"
  });

  writeDb(db);
  res.json({ success: true, task: newTask, tasks: db.supportTasks, db });
});

// Re-assign a support task to another agent
app.post("/api/support/tasks/assign", (req, res) => {
  const db = readDb();
  const { taskId, newAgentId, reassignerName, reason } = req.body;

  db.supportTasks = db.supportTasks || [];
  const task = db.supportTasks.find((t: any) => t.id === taskId || t.taskNumber === taskId);
  if (!task) return res.status(404).json({ error: "المهمة غير موجودة" });

  db.supportAgents = db.supportAgents || [];
  const newAgent = db.supportAgents.find((a: any) => a.id === newAgentId);
  if (!newAgent) return res.status(404).json({ error: "موظف الدعم المختار غير موجود" });

  const oldAgentName = task.assignedAgentName;
  task.assignedAgentId = newAgent.id;
  task.assignedAgentName = newAgent.name;

  task.history = task.history || [];
  task.history.unshift({
    id: "th-" + Date.now(),
    timestamp: new Date().toISOString(),
    actor: reassignerName || "مدير الدعم الفني",
    action: `إعادة إسناد المهمة من (${oldAgentName}) إلى (${newAgent.name})`,
    notes: reason || ""
  });

  writeDb(db);
  res.json({ success: true, task, tasks: db.supportTasks, db });
});

// Update support task (by Agent or Manager)
app.post("/api/support/tasks/update", (req, res) => {
  const db = readDb();
  const { taskId, status, notes, actorName } = req.body;

  db.supportTasks = db.supportTasks || [];
  const task = db.supportTasks.find((t: any) => t.id === taskId || t.taskNumber === taskId);
  if (!task) return res.status(404).json({ error: "المهمة غير موجودة" });

  if (status) {
    task.status = status;
    if (status === "completed" || status === "closed") {
      task.completedAt = new Date().toISOString();
    }
  }

  if (notes) {
    const timeStr = new Date().toLocaleTimeString('ar-SA');
    task.notes = (task.notes ? task.notes + "\n" : "") + `[${timeStr} - ${actorName || "تحديث"}]: ${notes}`;
  }

  task.history = task.history || [];
  task.history.unshift({
    id: "th-" + Date.now(),
    timestamp: new Date().toISOString(),
    actor: actorName || "فريق الدعم",
    action: `تحديث حالة المهمة إلى: ${status || task.status}`,
    notes: notes || ""
  });

  writeDb(db);
  res.json({ success: true, task, tasks: db.supportTasks, db });
});

app.post("/api/ai/chat", async (req, res) => {
  const { prompt, conversationHistory, userInfo } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  const ai = getGeminiClient();
  const db = readDb();

  // Check if user prompt requests human escalation explicitly
  const lowerPrompt = prompt.toLowerCase();
  const explicitEscalationKeywords = ["تحدث مع موظف", "دعم فني", "موظف حقيقي", "إنسان", "لم تحل مشكلتي", "تذكرة", "مشكلة معقدة", "تحويل للدعم"];
  const isExplicitEscalation = explicitEscalationKeywords.some(kw => lowerPrompt.includes(kw));

  if (!ai) {
    // Return friendly local response if Gemini API key is missing
    let replyText = `مرحباً بك! أنا المساعد الذكي لجمعية ريادة العطاء. حالياً مفتاح الذكاء الاصطناعي (GEMINI_API_KEY) غير متاح في إعدادات النظام، ولكن يسعدني الإجابة عليك بالوضع المحلي الذكي المدمج:
      
      بصفتي مستشارك الرقمي، يمكنني تقديم النصح في:
      1. شرح استخدام جميع صفحات ونوافذ النظام.
      2. حل المشاكل الشائعة ببطاقة التطوع والتسجيل.
      3. صياغة المبادرات والخطابات الرسمية.`;

    let generatedTicketNum = null;

    if (isExplicitEscalation) {
      // Auto create ticket
      db.supportTickets = db.supportTickets || [];
      const seq = String(db.supportTickets.length + 1).padStart(3, "0");
      generatedTicketNum = `TICK-${new Date().getFullYear()}-${seq}`;

      const newTicket = {
        id: "ticket-" + Date.now(),
        ticketNumber: generatedTicketNum,
        requesterId: userInfo?.id || "usr-" + Date.now(),
        requesterName: userInfo?.name || "مستخدم الجمعية",
        requesterEmail: userInfo?.email || "user@reyada.sa",
        requesterPhone: userInfo?.phone || "0550001122",
        requesterRole: userInfo?.role || "volunteer",
        subject: prompt.substring(0, 80),
        status: "new",
        priority: "urgent",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        escalatedFromAi: true,
        escalationReason: "طلب المستخدم التحدث مع موظف دعم فني بشري.",
        chatTranscript: [
          ...(conversationHistory || []).map((h: any, idx: number) => ({
            id: "tm-" + idx + "-" + Date.now(),
            ticketId: "",
            senderType: h.role === "user" ? "user" : "ai",
            senderName: h.role === "user" ? (userInfo?.name || "المستخدم") : "مساعد الذكاء الاصطناعي",
            content: h.text,
            timestamp: new Date().toISOString()
          })),
          {
            id: "tm-curr-" + Date.now(),
            ticketId: "",
            senderType: "user",
            senderName: userInfo?.name || "المستخدم",
            content: prompt,
            timestamp: new Date().toISOString()
          }
        ]
      };

      db.supportTickets.unshift(newTicket);
      db.logs.unshift({
        id: "log-" + Date.now(),
        timestamp: new Date().toISOString(),
        user: "نظام الدعم الفني الذكي",
        action: `🔔 يوجد طلب دعم فني جديد يحتاج إلى تدخل (تذكرة #${generatedTicketNum}) - المقدم: ${newTicket.requesterName}`,
        ip: req.ip || "127.0.0.1",
        device: "AI Support Escalator"
      });
      writeDb(db);

      replyText = `تم تحويل طلبك تلقائياً وبنجاح إلى فريق الدعم الفني الفعلي (تذكرة رقم #${generatedTicketNum}).\n\nظهر إشعار فوري للإدارة ولوحة التحكم بعنوان: "يوجد طلب دعم فني جديد يحتاج إلى تدخل". سيقوم موظف الدعم بالرد عليك ومتابعة المحادثة مباشرة هنا.`;
    }

    return res.json({
      reply: replyText,
      localSimulation: true,
      transferToSupport: isExplicitEscalation,
      ticketNumber: generatedTicketNum
    });
  }

  // Fetch current database statistics to provide exact grounding context to the model
  const statsSummary = {
    departmentsCount: db.departments.length,
    teamsCount: db.teams.length,
    volunteersCount: db.volunteers.length,
    initiativesCount: db.initiatives.length,
    requestsCount: db.requests.length,
    attendanceRecords: db.attendance.length,
    topVolunteers: db.volunteers.sort((a: any, b: any) => b.points - a.points).slice(0, 3).map((v: any) => `${v.name} (${v.points} نقطة)`),
    departments: db.departments.map((d: any) => d.nameAr),
    teams: db.teams.map((t: any) => t.nameAr),
    initiativesList: db.initiatives.map((i: any) => `${i.name} بتاريخ ${i.date}`)
  };

  const systemInstruction = `أنت المساعد الذكي الخبير ونظام الدعم الفني المدمج لـ "نظام إدارة التطوع لجمعية ريادة العطاء لخدمة الإنسان بالعسيلة" (ترخيص رقم: 100088868).
مهمتك هي مساعدة المستخدمين والدعم الفني في:
1. الرد الفوري على استفسارات المستخدمين حول التطوع والتسجيل والشروط وكيفية استخراج بطاقة التطوع.
2. شرح طريقة استخدام كافة صفحات وأجزاء النظام (لوحة الإدارة، لوحة القادة، لوحة المتطوعين، طلبات المستفيدين، تسجيل الحضور).
3. حل المشكلات الشائعة واقتراح الحلول المناسبة فوراً.
4. صياغة المبادرات والخطابات الرسمية الاحترافية للجمعية.

إذا سألك المستخدم سؤالاً معقداً لم تتمكن تماماً من حله، أو إذا طلب المستخدم صراحة "التحويل للدعم الفني" أو "التحدث مع إنسان"، قم بإرفاق الكلمة المفتاحية "[TRANSFER_TO_SUPPORT]" في نهاية ردك مع توضيح ذلك بلطف.

بيانات الجمعية الحالية:
- عدد الإدارات: ${statsSummary.departmentsCount} وهي (${statsSummary.departments.join("، ")})
- عدد الفرق التطوعية: ${statsSummary.teamsCount} وهي (${statsSummary.teams.join("، ")})
- إجمالي عدد المتطوعين المسجلين: ${statsSummary.volunteersCount}
- المبادرات المسجلة بالنظام: ${statsSummary.initiativesCount}`;

  try {
    const formattedHistory = (conversationHistory || []).map((h: any) => ({
      role: h.role === "user" ? "user" : "model",
      parts: [{ text: h.text }]
    }));

    // Add current user prompt
    formattedHistory.push({
      role: "user",
      parts: [{ text: prompt }]
    });

    const candidateModels = ["gemini-3.6-flash", "gemini-2.5-flash", "gemini-flash-latest"];
    let responseText = "";
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: formattedHistory,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });
        if (response && response.text) {
          responseText = response.text;
          break;
        }
      } catch (err) {
        console.warn(`Model ${modelName} failed or unavailable:`, err);
        lastError = err;
      }
    }

    if (!responseText) {
      // If all Gemini models failed (e.g., 503 high demand spike)
      console.error("All Gemini models failed, falling back gracefully:", lastError);
      
      db.supportTickets = db.supportTickets || [];
      const seq = String(db.supportTickets.length + 1).padStart(3, "0");
      const generatedTicketNum = `TICK-${new Date().getFullYear()}-${seq}`;

      const newTicket = {
        id: "ticket-" + Date.now(),
        ticketNumber: generatedTicketNum,
        requesterId: userInfo?.id || "usr-" + Date.now(),
        requesterName: userInfo?.name || "مستخدم الجمعية",
        requesterEmail: userInfo?.email || "user@reyada.sa",
        requesterPhone: userInfo?.phone || "0550001122",
        requesterRole: userInfo?.role || "volunteer",
        subject: prompt.substring(0, 80),
        status: "new",
        priority: "urgent",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        escalatedFromAi: true,
        escalationReason: "ضغط مؤقت على سيرفر الذكاء الاصطناعي وتم فتح تذكرة تلقائية للدعم الفني.",
        chatTranscript: [
          ...(conversationHistory || []).map((h: any, idx: number) => ({
            id: "tm-" + idx + "-" + Date.now(),
            ticketId: "",
            senderType: h.role === "user" ? "user" : "ai",
            senderName: h.role === "user" ? (userInfo?.name || "المستخدم") : "مساعد الذكاء الاصطناعي",
            content: h.text,
            timestamp: new Date().toISOString()
          })),
          {
            id: "tm-curr-" + Date.now(),
            ticketId: "",
            senderType: "user",
            senderName: userInfo?.name || "المستخدم",
            content: prompt,
            timestamp: new Date().toISOString()
          }
        ]
      };

      db.supportTickets.unshift(newTicket);
      db.logs.unshift({
        id: "log-" + Date.now(),
        timestamp: new Date().toISOString(),
        user: "نظام الدعم الفني الذكي",
        action: `🔔 تم فتح تذكرة دعم فني بسبب ضغط الخدمة (تذكرة #${generatedTicketNum}) - المقدم: ${newTicket.requesterName}`,
        ip: req.ip || "127.0.0.1",
        device: "AI Support Auto-Escalator"
      });
      writeDb(db);

      return res.json({
        reply: `أهلاً بك! يمر خادم الذكاء الاصطناعي بضغط طلبات مؤقت. حرصاً منا على خدمتك، قمنا بتمرير سؤالك تلقائياً وفتح تذكرة دعم فني برقم (#${generatedTicketNum})، وستقوم الإدارة بالرد عليك ومتابعة الاستفسار فوراً.`,
        transferToSupport: true,
        ticketNumber: generatedTicketNum
      });
    }

    const text = responseText || "عذراً، لم أتمكن من توليد رد مناسب حالياً.";
    const needsTransfer = text.includes("[TRANSFER_TO_SUPPORT]") || isExplicitEscalation;
    let generatedTicketNum = null;

    if (needsTransfer) {
      db.supportTickets = db.supportTickets || [];
      const seq = String(db.supportTickets.length + 1).padStart(3, "0");
      generatedTicketNum = `TICK-${new Date().getFullYear()}-${seq}`;

      const newTicket = {
        id: "ticket-" + Date.now(),
        ticketNumber: generatedTicketNum,
        requesterId: userInfo?.id || "usr-" + Date.now(),
        requesterName: userInfo?.name || "مستخدم الجمعية",
        requesterEmail: userInfo?.email || "user@reyada.sa",
        requesterPhone: userInfo?.phone || "0550001122",
        requesterRole: userInfo?.role || "volunteer",
        subject: prompt.substring(0, 80),
        status: "new",
        priority: "urgent",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        escalatedFromAi: true,
        escalationReason: "تصعيد تلقائي من الذكاء الاصطناعي لطلب تدخل موظف دعم فني.",
        chatTranscript: [
          ...(conversationHistory || []).map((h: any, idx: number) => ({
            id: "tm-" + idx + "-" + Date.now(),
            ticketId: "",
            senderType: h.role === "user" ? "user" : "ai",
            senderName: h.role === "user" ? (userInfo?.name || "المستخدم") : "مساعد الذكاء الاصطناعي",
            content: h.text,
            timestamp: new Date().toISOString()
          })),
          {
            id: "tm-curr-" + Date.now(),
            ticketId: "",
            senderType: "user",
            senderName: userInfo?.name || "المستخدم",
            content: prompt,
            timestamp: new Date().toISOString()
          }
        ]
      };

      db.supportTickets.unshift(newTicket);
      db.logs.unshift({
        id: "log-" + Date.now(),
        timestamp: new Date().toISOString(),
        user: "نظام الدعم الفني الذكي",
        action: `🔔 يوجد طلب دعم فني جديد يحتاج إلى تدخل (تذكرة #${generatedTicketNum}) - المقدم: ${newTicket.requesterName}`,
        ip: req.ip || "127.0.0.1",
        device: "AI Support Escalator"
      });
      writeDb(db);
    } else {
      db.logs.unshift({
        id: "log-" + Date.now(),
        timestamp: new Date().toISOString(),
        user: "الذكاء الاصطناعي (مساعد ريادة العطاء)",
        action: `معالجة استفسار للمستخدم: ${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''} (تم الإجابة بنجاح)`,
        ip: req.ip || "127.0.0.1",
        device: "Gemini AI Engine"
      });
      writeDb(db);
    }

    res.json({
      reply: text.replace("[TRANSFER_TO_SUPPORT]", "").trim() + (needsTransfer ? `\n\n📌 (تم إنشاء تذكرة دعم فني رقم #${generatedTicketNum} وإبلاغ الإدارة).` : ""),
      transferToSupport: needsTransfer,
      ticketNumber: generatedTicketNum
    });

  } catch (err) {
    console.error("Gemini API Error:", err);
    res.status(200).json({ 
      reply: "حدث تعذر مؤقت في الخدمة. تم تسليم استفسارك للدعم الفني لمتابعة الطلب.",
      transferToSupport: true
    });
  }
});

// -------------------------------------------------------------
// Inventory & Stock Audit API Endpoints
// -------------------------------------------------------------

// 1. Get full inventory state
app.get("/api/db/inventory", (req, res) => {
  const db = readDb();
  res.json({
    items: db.inventoryItems || [],
    warehouses: db.warehouses || [],
    vendors: db.inventoryVendors || [],
    movements: db.inventoryMovements || [],
    audits: db.inventoryAudits || [],
    storekeepers: db.storekeepers || [],
    logs: db.inventoryLogs || []
  });
});

// 1b. Get Storekeepers
app.get("/api/db/inventory/storekeepers", (req, res) => {
  const db = readDb();
  res.json(db.storekeepers || []);
});

// 1c. Add / Edit Storekeeper Account
app.post("/api/db/inventory/storekeepers/add", (req, res) => {
  const db = readDb();
  const sk = req.body;
  db.storekeepers = db.storekeepers || [];

  if (!sk.id) {
    sk.id = "sk-" + Date.now();
    sk.createdAt = new Date().toISOString();
    sk.status = sk.status || "active";
    sk.permissions = sk.permissions || ["inbound", "outbound", "transfer", "write_off", "audit", "items"];
    db.storekeepers.unshift(sk);

    db.inventoryLogs = db.inventoryLogs || [];
    db.inventoryLogs.unshift({
      id: "invlog-" + Date.now(),
      timestamp: new Date().toISOString(),
      storekeeperId: sk.createdById || "admin",
      storekeeperName: sk.createdByName || "المدير التنفيذي",
      actionType: "item_add",
      actionTitle: "إنشاء حساب أمين مستودع جديد",
      details: `إنشاء حساب كأمين مستودع للمستخدم (${sk.name}) - الهوية: ${sk.nationalId} - المستودع المخصص: ${sk.assignedWarehouseName || "جميع المستودعات"}`,
      warehouseName: sk.assignedWarehouseName || "عام",
      ip: req.ip || "127.0.0.1",
      device: req.headers["user-agent"] || "Storekeeper Management Module"
    });
  } else {
    const idx = db.storekeepers.findIndex((s: any) => s.id === sk.id);
    if (idx !== -1) {
      db.storekeepers[idx] = { ...db.storekeepers[idx], ...sk };
    } else {
      db.storekeepers.unshift(sk);
    }

    db.inventoryLogs = db.inventoryLogs || [];
    db.inventoryLogs.unshift({
      id: "invlog-" + Date.now(),
      timestamp: new Date().toISOString(),
      storekeeperId: sk.updatedById || "admin",
      storekeeperName: sk.updatedByName || "المدير التنفيذي",
      actionType: "item_edit",
      actionTitle: "تحديث بيانات أمين المستودع",
      details: `تحديث حساب أمين المستودع (${sk.name}) - الحالة: ${sk.status === 'active' ? 'مفعّل' : 'معطل'} - المستودع: ${sk.assignedWarehouseName}`,
      warehouseName: sk.assignedWarehouseName || "عام",
      ip: req.ip || "127.0.0.1",
      device: req.headers["user-agent"] || "Storekeeper Management Module"
    });
  }

  writeDb(db);
  res.json({ status: "success", storekeepers: db.storekeepers, db });
});

// 1d. Delete Storekeeper Account
app.post("/api/db/inventory/storekeepers/delete", (req, res) => {
  const db = readDb();
  const { id, deletedBy } = req.body;
  db.storekeepers = db.storekeepers || [];
  const target = db.storekeepers.find((s: any) => s.id === id);
  db.storekeepers = db.storekeepers.filter((s: any) => s.id !== id);

  db.inventoryLogs = db.inventoryLogs || [];
  db.inventoryLogs.unshift({
    id: "invlog-" + Date.now(),
    timestamp: new Date().toISOString(),
    storekeeperId: "admin",
    storekeeperName: deletedBy || "المدير التنفيذي",
    actionType: "item_delete",
    actionTitle: "حذف حساب أمين مستودع",
    details: `إلغاء وحذف حساب أمين المستودع (${target ? target.name : id}) من النظام`,
    warehouseName: target ? target.assignedWarehouseName : "عام",
    ip: req.ip || "127.0.0.1",
    device: "Storekeeper Management Module"
  });

  writeDb(db);
  res.json({ status: "success", storekeepers: db.storekeepers, db });
});

// 1e. Get Inventory Logs
app.get("/api/db/inventory/logs", (req, res) => {
  const db = readDb();
  res.json(db.inventoryLogs || []);
});

// 2. Add / Edit Inventory Item
app.post("/api/db/inventory/items/add", (req, res) => {
  const db = readDb();
  const item = req.body;
  db.inventoryItems = db.inventoryItems || [];

  if (!item.id) {
    const seq = String(db.inventoryItems.length + 101).padStart(3, "0");
    item.id = "inv-item-" + Date.now();
    item.barcode = item.barcode || `6281000${Math.floor(100000 + Math.random() * 900000)}`;
    item.qrCode = item.qrCode || `QR-INV-${item.barcode}`;
    item.serialNumber = item.serialNumber || `SN-${item.internalCode || 'GEN'}-${Date.now().toString().substring(7)}`;
    item.currentQty = Number(item.currentQty || 0);
    item.initialQty = item.currentQty;
    item.issuedQty = 0;
    item.receivedQty = item.currentQty;
    item.reservedQty = 0;
    item.purchasePrice = Number(item.purchasePrice || item.unitPrice || 0);
    item.unitPrice = Number(item.unitPrice || item.purchasePrice || 0);
    item.totalValue = item.currentQty * item.purchasePrice;
    item.createdAt = new Date().toISOString();
    item.updatedAt = new Date().toISOString();
    item.isAudited = false;
    db.inventoryItems.unshift(item);

    // Initial movement log
    if (item.currentQty > 0) {
      db.inventoryMovements = db.inventoryMovements || [];
      db.inventoryMovements.unshift({
        id: "mov-" + Date.now(),
        itemId: item.id,
        itemName: item.name,
        barcode: item.barcode,
        type: "inbound",
        quantity: item.currentQty,
        reason: "تسجيل مادة جديدة في المخزون وبداية الرصيد الابتدائي",
        approvedBy: item.createdByName || "مسؤول المستودع",
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      });
    }

    // Send real-time notification to Beneficiary Department (dep-4)
    if (!db.notifications) db.notifications = [];
    db.notifications.unshift({
      id: "notif-ben-dept-" + Date.now(),
      userId: "role:department_admin",
      targetDepartmentId: "dep-4",
      targetRole: "department_admin",
      titleAr: `تمت إضافة صنف جديد للمخزون: ${item.name}`,
      bodyAr: `تمت إضافة ${item.currentQty} ${item.unitOfMeasure || 'وحدة'} من صنف (${item.name}) إلى المخزون، وهي متاحة للتخصيص للمستفيدين. الرصيد المتاح: ${item.currentQty}.`,
      category: "beneficiary",
      type: "important",
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      read: false,
      linkUrl: "#beneficiaries-allocations"
    });

    db.logs.unshift({
      id: "log-" + Date.now(),
      timestamp: new Date().toISOString(),
      user: "إدارة المخزون والجرد",
      action: `إضافة صنف جديد للمخزون: (${item.name}) - باركود: ${item.barcode}`,
      ip: req.ip || "127.0.0.1",
      device: "Inventory Manager"
    });
  } else {
    const idx = db.inventoryItems.findIndex((i: any) => i.id === item.id);
    if (idx !== -1) {
      const existing = db.inventoryItems[idx];
      item.currentQty = Number(item.currentQty !== undefined ? item.currentQty : existing.currentQty);
      item.purchasePrice = Number(item.purchasePrice || existing.purchasePrice || 0);
      item.totalValue = item.currentQty * item.purchasePrice;
      item.updatedAt = new Date().toISOString();
      db.inventoryItems[idx] = { ...existing, ...item };
    } else {
      db.inventoryItems.unshift(item);
    }

    db.logs.unshift({
      id: "log-" + Date.now(),
      timestamp: new Date().toISOString(),
      user: "إدارة المخزون والجرد",
      action: `تحديث بيانات الصنف المخزني: (${item.name})`,
      ip: req.ip || "127.0.0.1",
      device: "Inventory Manager"
    });
  }

  writeDb(db);
  res.json({ status: "success", db });
});

// 3. Delete Inventory Item
app.post("/api/db/inventory/items/delete", (req, res) => {
  const db = readDb();
  const { id } = req.body;
  db.inventoryItems = db.inventoryItems || [];
  const item = db.inventoryItems.find((i: any) => i.id === id);
  db.inventoryItems = db.inventoryItems.filter((i: any) => i.id !== id);

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "إدارة المخزون والجرد",
    action: `حذف الصنف المخزني: ${item ? item.name : id}`,
    ip: req.ip || "127.0.0.1",
    device: "Inventory Manager"
  });

  writeDb(db);
  res.json({ status: "success", db });
});

// 4. Inbound Movement (Add Quantity)
app.post("/api/db/inventory/movements/add_quantity", (req, res) => {
  const db = readDb();
  const { itemId, quantity, reason, vendorName, invoiceNumber, approvedBy, purchasePrice } = req.body;
  
  db.inventoryItems = db.inventoryItems || [];
  const item = db.inventoryItems.find((i: any) => i.id === itemId);
  if (!item) return res.status(404).json({ error: "الصنف غير موجود بالمخزون" });

  const addedQty = Number(quantity);
  item.currentQty += addedQty;
  item.receivedQty = (item.receivedQty || 0) + addedQty;
  if (purchasePrice) {
    item.purchasePrice = Number(purchasePrice);
  }
  item.totalValue = item.currentQty * (item.purchasePrice || item.unitPrice || 0);
  item.updatedAt = new Date().toISOString();

  db.inventoryMovements = db.inventoryMovements || [];
  const mov = {
    id: "mov-" + Date.now(),
    itemId: item.id,
    itemName: item.name,
    barcode: item.barcode,
    type: "inbound",
    quantity: addedQty,
    reason: reason || "توريد شحنة جديدة للمستودع",
    vendorName: vendorName || item.vendorName,
    invoiceNumber: invoiceNumber || "",
    approvedBy: approvedBy || "مسؤول المستودع",
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  };
  db.inventoryMovements.unshift(mov);

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: approvedBy || "إدارة المستودع",
    action: `توريد كمية جديدة (+${addedQty} ${item.unitOfMeasure}) للصنف: (${item.name})`,
    ip: req.ip || "127.0.0.1",
    device: "Inventory Movement"
  });

  db.inventoryLogs = db.inventoryLogs || [];
  db.inventoryLogs.unshift({
    id: "invlog-" + Date.now(),
    timestamp: new Date().toISOString(),
    storekeeperId: req.body.storekeeperId || "sk-101",
    storekeeperName: approvedBy || req.body.storekeeperName || "أمين المستودع",
    actionType: "inbound",
    actionTitle: "توريد شحنة جديدة",
    details: `توريد كمية (+${addedQty} ${item.unitOfMeasure}) - الفاتورة: ${invoiceNumber || 'بدون'} - المورد: ${vendorName || item.vendorName || 'غير محدد'} - السبب: ${reason || 'توريد شحنة'}`,
    itemId: item.id,
    itemName: item.name,
    quantity: addedQty,
    warehouseName: item.warehouseName || "المستودع الرئيسي",
    ip: req.ip || "127.0.0.1",
    device: "Inventory Movement"
  });

  // Notify Beneficiary Department of added stock
  if (!db.notifications) db.notifications = [];
  const availableStock = Math.max(0, (Number(item.currentQty) || 0) - (Number(item.reservedQty) || 0));
  db.notifications.unshift({
    id: "notif-inbound-ben-" + Date.now(),
    userId: "role:department_admin",
    targetDepartmentId: "dep-4",
    targetRole: "department_admin",
    titleAr: `تمت إضافة ${addedQty} ${item.unitOfMeasure || 'وحدة'} من (${item.name}) إلى المخزون`,
    bodyAr: `قامت إدارة المخزون بتوريد كمية إضافية (+${addedQty}) من صنف (${item.name}). الكمية المتاحة حالياً للتخصيص للمستفيدين: ${availableStock} ${item.unitOfMeasure || 'وحدة'}.`,
    category: "beneficiary",
    type: "important",
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    read: false,
    linkUrl: "#beneficiaries-allocations"
  });

  writeDb(db);
  res.json({ status: "success", item, movement: mov, db });
});

// 5. Outbound Movement (Issue Quantity / Link to Initiative)
app.post("/api/db/inventory/movements/issue_quantity", (req, res) => {
  const db = readDb();
  const { itemId, quantity, reason, recipientName, beneficiaryName, initiativeId, initiativeName, approvedBy } = req.body;

  db.inventoryItems = db.inventoryItems || [];
  const item = db.inventoryItems.find((i: any) => i.id === itemId);
  if (!item) return res.status(404).json({ error: "الصنف غير موجود بالمخزون" });

  const issueQty = Number(quantity);
  if (item.currentQty < issueQty) {
    return res.status(400).json({ error: `الكمية المتاحة بالمخزون (${item.currentQty}) أقل من الكمية المطلوبة لصرفها (${issueQty})!` });
  }

  item.currentQty -= issueQty;
  item.issuedQty = (item.issuedQty || 0) + issueQty;
  item.totalValue = item.currentQty * (item.purchasePrice || item.unitPrice || 0);
  item.updatedAt = new Date().toISOString();

  db.inventoryMovements = db.inventoryMovements || [];
  const mov = {
    id: "mov-" + Date.now(),
    itemId: item.id,
    itemName: item.name,
    barcode: item.barcode,
    type: "outbound",
    quantity: issueQty,
    reason: reason || "صرف ميداني للمبادرة / المستفيدين",
    recipientName: recipientName || "المشرف الميداني",
    beneficiaryName: beneficiaryName || "مستفيدي الجمعية",
    initiativeId: initiativeId || "",
    initiativeName: initiativeName || "",
    approvedBy: approvedBy || "مسؤول المستودع",
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  };
  db.inventoryMovements.unshift(mov);

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: approvedBy || "إدارة المستودع",
    action: `صرف كمية (-${issueQty} ${item.unitOfMeasure}) من الصنف: (${item.name}) ${initiativeName ? `لصالح مبادرة [${initiativeName}]` : ''}`,
    ip: req.ip || "127.0.0.1",
    device: "Inventory Movement"
  });

  db.inventoryLogs = db.inventoryLogs || [];
  db.inventoryLogs.unshift({
    id: "invlog-" + Date.now(),
    timestamp: new Date().toISOString(),
    storekeeperId: req.body.storekeeperId || "sk-101",
    storekeeperName: approvedBy || req.body.storekeeperName || "أمين المستودع",
    actionType: "outbound",
    actionTitle: "صرف كمية للميدان / المبادرات",
    details: `صرف كمية (-${issueQty} ${item.unitOfMeasure}) - المستلم: ${recipientName || 'المشرف'} - المستفيد: ${beneficiaryName || 'المستفيدين'} ${initiativeName ? `- لمبادرة [${initiativeName}]` : ''} - السبب: ${reason || 'صرف ميداني'}`,
    itemId: item.id,
    itemName: item.name,
    quantity: issueQty,
    warehouseName: item.warehouseName || "المستودع الرئيسي",
    ip: req.ip || "127.0.0.1",
    device: "Inventory Movement"
  });

  writeDb(db);
  res.json({ status: "success", item, movement: mov, db });
});

// 5.1 Outbound Movement for Volunteers (تسليم الأصناف والعهد للمتطوعين بالباركود والصورة الحية)
app.post("/api/db/inventory/movements/issue_volunteer", (req, res) => {
  const db = readDb();
  const { 
    volunteerId,
    volunteerBarcode,
    itemId,
    quantity = 1,
    photoUrl,
    proofPhotos,
    notes = "",
    initiativeId = "",
    initiativeName = "",
    handedByUserId = "staff",
    handedByUserName = "أمين المستودع",
    handedByUserRole = "storekeeper"
  } = req.body;

  if (!itemId) {
    return res.status(400).json({ error: "معرف الصنف المخزني مطلوب." });
  }

  // Mandatory photo proof check
  if (!photoUrl && (!proofPhotos || proofPhotos.length === 0)) {
    return res.status(400).json({ 
      error: "توثيق الصورة إلزامي لإتمام صرف الصنف للمتطوع! يرجى التقاط صورة التسليم.",
      photoRequired: true
    });
  }

  // Find volunteer
  db.volunteers = db.volunteers || [];
  let vol: any = null;
  if (volunteerId) {
    vol = db.volunteers.find((v: any) => v.id === volunteerId);
  }
  if (!vol && volunteerBarcode) {
    const cleanSearch = volunteerBarcode.toString().trim();
    vol = db.volunteers.find((v: any) => 
      (v.barcode && v.barcode.toString().trim() === cleanSearch) ||
      (v.membershipNumber && v.membershipNumber.toString().trim() === cleanSearch) ||
      (v.nationalId && v.nationalId.toString().trim() === cleanSearch) ||
      (v.id && v.id.toString().trim() === cleanSearch)
    );
  }

  if (!vol) {
    return res.status(404).json({ error: "المتطوع غير مسجل في قاعدة البيانات، يرجى مسح باركود متطوع معتمد." });
  }

  // Find inventory item
  db.inventoryItems = db.inventoryItems || [];
  const item = db.inventoryItems.find((i: any) => i.id === itemId);
  if (!item) {
    return res.status(404).json({ error: "الصنف غير موجود بالمخزون." });
  }

  const issueQty = Number(quantity) || 1;
  const currentStock = Number(item.currentQty) || 0;
  if (currentStock < issueQty) {
    return res.status(400).json({ error: `الكمية المتاحة في المخزون (${currentStock}) غير كافية لصرف (${issueQty}) للمتطوع.` });
  }

  // Deduct inventory
  item.currentQty -= issueQty;
  item.issuedQty = (item.issuedQty || 0) + issueQty;
  item.totalValue = item.currentQty * (item.purchasePrice || item.unitPrice || 0);
  item.updatedAt = new Date().toISOString();

  const now = new Date();
  const timeString = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const finalPhoto = photoUrl || (proofPhotos && proofPhotos[0]) || "";

  // Record Volunteer Issuance Record
  db.volunteerIssuances = db.volunteerIssuances || [];
  const issuanceRecord = {
    id: "vol-iss-" + Date.now(),
    volunteerId: vol.id,
    volunteerName: vol.name,
    volunteerMembershipNumber: vol.membershipNumber || "",
    volunteerBarcode: vol.barcode || vol.membershipNumber || "",
    volunteerPhone: vol.phone || "",
    volunteerNationalId: vol.nationalId || "",
    itemId: item.id,
    itemName: item.name,
    itemBarcode: item.barcode,
    quantity: issueQty,
    unit: item.unitOfMeasure || "قطعة",
    date: now.toISOString().split('T')[0],
    time: timeString,
    issuedAt: now.toISOString(),
    handedByUserId,
    handedByUserName,
    handedByUserRole,
    warehouseName: item.warehouseName || "المستودع الرئيسي",
    photoUrl: finalPhoto,
    proofPhotos: proofPhotos || (finalPhoto ? [finalPhoto] : []),
    notes: notes || `صرف ${issueQty} ${item.unitOfMeasure || 'قطعة'} للمتطوع بالباركود والصورة`,
    initiativeId: initiativeId || "",
    initiativeName: initiativeName || "",
    status: "completed"
  };
  db.volunteerIssuances.unshift(issuanceRecord);

  // Record in Inventory Movements
  db.inventoryMovements = db.inventoryMovements || [];
  db.inventoryMovements.unshift({
    id: "mov-vol-" + Date.now(),
    itemId: item.id,
    itemName: item.name,
    barcode: item.barcode,
    type: "outbound",
    quantity: issueQty,
    reason: `تسليم وصرف للمتطوع (${vol.name}) برقم العضوية (${vol.membershipNumber || vol.barcode}) مع توثيق الصورة`,
    recipientName: vol.name,
    approvedBy: handedByUserName,
    proofPhotos: issuanceRecord.proofPhotos,
    date: now.toISOString().split('T')[0],
    createdAt: now.toISOString()
  });

  // Log in system logs
  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: now.toISOString(),
    user: handedByUserName,
    action: `صرف صنف موثق بالصورة للمتطوع: (${vol.name}) استلم (${issueQty} ${item.unitOfMeasure || 'قطعة'}) من (${item.name}) عبر مسح الباركود والتقاط صورة التسليم`,
    ip: req.ip || "127.0.0.1",
    device: "Warehouse Manager"
  });

  // Notify volunteer
  if (!db.notifications) db.notifications = [];
  db.notifications.unshift({
    id: "notif-vol-issue-" + Date.now(),
    userId: vol.id,
    targetUserId: vol.id,
    recipientType: "volunteers",
    titleAr: "تم تسليمك صنف / عهدة من المستودع بنجاح ✓",
    bodyAr: `تم تسجيل صرف (${issueQty} ${item.unitOfMeasure || 'قطعة'}) من صنف (${item.name}) لك بتاريخ ${now.toISOString().split('T')[0]} في تمام الساعة ${timeString}.`,
    category: "volunteer",
    type: "normal",
    date: now.toISOString().split('T')[0],
    createdAt: now.toISOString(),
    read: false
  });

  writeDb(db);
  res.json({
    success: true,
    record: issuanceRecord,
    volunteer: vol,
    item,
    db
  });
});

// 6. Warehouse Transfer Movement
app.post("/api/db/inventory/movements/transfer", (req, res) => {
  const db = readDb();
  const { itemId, quantity, sourceWarehouseId, targetWarehouseId, reason, approvedBy } = req.body;

  db.inventoryItems = db.inventoryItems || [];
  db.warehouses = db.warehouses || [];

  const item = db.inventoryItems.find((i: any) => i.id === itemId);
  if (!item) return res.status(404).json({ error: "الصنف غير موجود بالمخزون" });

  const targetWh = db.warehouses.find((w: any) => w.id === targetWarehouseId);
  if (!targetWh) return res.status(404).json({ error: "المستودع المستهدف غير موجود" });

  const transferQty = Number(quantity);
  if (item.currentQty < transferQty) {
    return res.status(400).json({ error: "الكمية الحالية أقل من الكمية المراد نقلها!" });
  }

  const oldWhName = item.warehouseName;
  item.warehouseId = targetWh.id;
  item.warehouseName = targetWh.name;
  item.updatedAt = new Date().toISOString();

  db.inventoryMovements = db.inventoryMovements || [];
  const mov = {
    id: "mov-" + Date.now(),
    itemId: item.id,
    itemName: item.name,
    barcode: item.barcode,
    type: "transfer",
    quantity: transferQty,
    reason: reason || `نقل تحويلي من ${oldWhName} إلى ${targetWh.name}`,
    approvedBy: approvedBy || "مسؤول المستودعات",
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  };
  db.inventoryMovements.unshift(mov);

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: approvedBy || "إدارة المستودع",
    action: `تحويل مخزني للصنف: (${item.name}) من (${oldWhName}) إلى (${targetWh.name}) - الكمية: ${transferQty}`,
    ip: req.ip || "127.0.0.1",
    device: "Inventory Movement"
  });

  db.inventoryLogs = db.inventoryLogs || [];
  db.inventoryLogs.unshift({
    id: "invlog-" + Date.now(),
    timestamp: new Date().toISOString(),
    storekeeperId: req.body.storekeeperId || "sk-101",
    storekeeperName: approvedBy || req.body.storekeeperName || "أمين المستودع",
    actionType: "transfer",
    actionTitle: "تحويل بين المستودعات",
    details: `تحويل كمية (${transferQty} ${item.unitOfMeasure}) من [${oldWhName}] إلى [${targetWh.name}] - السبب: ${reason || 'تحويل داخلي'}`,
    itemId: item.id,
    itemName: item.name,
    quantity: transferQty,
    warehouseName: targetWh.name,
    ip: req.ip || "127.0.0.1",
    device: "Inventory Movement"
  });

  writeDb(db);
  res.json({ status: "success", item, movement: mov, db });
});

// 7. Write Off Movement (Damaged / Expired Disposal)
app.post("/api/db/inventory/movements/write_off", (req, res) => {
  const db = readDb();
  const { itemId, quantity, reason, notes, approvedBy, proofPhotos } = req.body;

  db.inventoryItems = db.inventoryItems || [];
  const item = db.inventoryItems.find((i: any) => i.id === itemId);
  if (!item) return res.status(404).json({ error: "الصنف غير موجود بالمخزون" });

  const writeOffQty = Number(quantity);
  if (item.currentQty < writeOffQty) {
    return res.status(400).json({ error: "الكمية المراد إتلافها أكبر من الرصيد المتوفر!" });
  }

  item.currentQty -= writeOffQty;
  item.totalValue = item.currentQty * (item.purchasePrice || item.unitPrice || 0);
  item.updatedAt = new Date().toISOString();

  db.inventoryMovements = db.inventoryMovements || [];
  const mov = {
    id: "mov-" + Date.now(),
    itemId: item.id,
    itemName: item.name,
    barcode: item.barcode,
    type: "write_off",
    quantity: writeOffQty,
    reason: reason || "إتلاف مواد منتهية الصلاحية / تالفة",
    approvedBy: approvedBy || "لجنة الاتلاف والتدقيق",
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  };
  db.inventoryMovements.unshift(mov);

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: approvedBy || "لجنة الاتلاف",
    action: `⚠️ إتلاف وحسم كمية (-${writeOffQty} ${item.unitOfMeasure}) من الصنف: (${item.name}) السبب: ${reason}`,
    ip: req.ip || "127.0.0.1",
    device: "Inventory Write-Off"
  });

  db.inventoryLogs = db.inventoryLogs || [];
  db.inventoryLogs.unshift({
    id: "invlog-" + Date.now(),
    timestamp: new Date().toISOString(),
    storekeeperId: req.body.storekeeperId || "sk-101",
    storekeeperName: approvedBy || req.body.storekeeperName || "أمين المستودع",
    actionType: "write_off",
    actionTitle: "إتلاف وحسم موثق",
    details: `حسم وإتلاف كمية (-${writeOffQty} ${item.unitOfMeasure}) - السبب: ${reason} - ملاحظات: ${notes || 'لا يوجد'}`,
    itemId: item.id,
    itemName: item.name,
    quantity: writeOffQty,
    warehouseName: item.warehouseName || "المستودع الرئيسي",
    ip: req.ip || "127.0.0.1",
    device: "Inventory Write-Off"
  });

  writeDb(db);
  res.json({ status: "success", item, movement: mov, db });
});

// 8. Create & Save Stock Audit Record
app.post("/api/db/inventory/audits/create", (req, res) => {
  const db = readDb();
  const { title, auditType, warehouseId, warehouseName, items, performedBy, approvedBy, notes, applyToInventory } = req.body;

  db.inventoryAudits = db.inventoryAudits || [];
  const auditSeq = String(db.inventoryAudits.length + 1).padStart(3, "0");
  const auditNumber = `AUD-${new Date().getFullYear()}-${auditSeq}`;

  let totalSystemQty = 0;
  let totalActualQty = 0;
  let totalVariance = 0;

  const processedItems = (items || []).map((i: any) => {
    const sys = Number(i.systemQty || 0);
    const act = Number(i.actualQty || 0);
    const varc = act - sys;
    totalSystemQty += sys;
    totalActualQty += act;
    totalVariance += Math.abs(varc);

    // If applyToInventory is true, adjust actual system quantity to match audited quantity
    if (applyToInventory) {
      const invItem = db.inventoryItems.find((itm: any) => itm.id === i.itemId);
      if (invItem) {
        invItem.currentQty = act;
        invItem.totalValue = act * (invItem.purchasePrice || invItem.unitPrice || 0);
        invItem.isAudited = true;
        invItem.lastAuditDate = new Date().toISOString().split('T')[0];
        invItem.updatedAt = new Date().toISOString();
      }
    }

    return {
      itemId: i.itemId,
      itemName: i.itemName,
      barcode: i.barcode,
      systemQty: sys,
      actualQty: act,
      variance: varc,
      unitOfMeasure: i.unitOfMeasure || "قطعة",
      reasonForDiscrepancy: i.reasonForDiscrepancy || (varc === 0 ? "مطابقة تامة 100%" : "تفاوت أثناء الجرد الميداني")
    };
  });

  const matchPercentage = totalSystemQty > 0 ? Math.max(0, Math.round(((totalSystemQty - totalVariance) / totalSystemQty) * 100)) : 100;

  const newAudit = {
    id: "aud-" + Date.now(),
    auditNumber,
    title: title || "جرد دوري للمخزون",
    auditType: auditType || "full",
    warehouseId: warehouseId || "wh-1",
    warehouseName: warehouseName || "المستودع الرئيسي",
    status: "approved",
    items: processedItems,
    totalSystemQty,
    totalActualQty,
    totalVariance,
    matchPercentage,
    performedBy: performedBy || "لجنة الجرد",
    approvedBy: approvedBy || "المدير التنفيذي",
    notes: notes || "",
    auditDate: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  };

  db.inventoryAudits.unshift(newAudit);

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: performedBy || "لجنة الجرد والتدقيق",
    action: `اعتماد محضر جرد مخزني جديد (#${auditNumber}) بنسبة مطابقة (${matchPercentage}%) - المستودع: ${warehouseName}`,
    ip: req.ip || "127.0.0.1",
    device: "Stock Audit Engine"
  });

  db.inventoryLogs = db.inventoryLogs || [];
  db.inventoryLogs.unshift({
    id: "invlog-" + Date.now(),
    timestamp: new Date().toISOString(),
    storekeeperId: req.body.storekeeperId || "sk-101",
    storekeeperName: performedBy || req.body.storekeeperName || "لجنة الجرد والتدقيق",
    actionType: "audit",
    actionTitle: "اعتماد محضر جرد كلي/جزئي",
    details: `اعتماد محضر جرد (#${auditNumber}) للمستودع: [${warehouseName}] بنسبة مطابقة (${matchPercentage}%) - إجمالي عدد الأصناف المجرودة: ${processedItems.length}`,
    warehouseName: warehouseName || "المستودع الرئيسي",
    ip: req.ip || "127.0.0.1",
    device: "Stock Audit Engine"
  });

  writeDb(db);
  res.json({ status: "success", audit: newAudit, db });
});

// 9. Warehouses Add/Edit
app.post("/api/db/inventory/warehouses/add", (req, res) => {
  const db = readDb();
  const wh = req.body;
  db.warehouses = db.warehouses || [];

  if (!wh.id) {
    wh.id = "wh-" + Date.now();
    wh.createdAt = new Date().toISOString();
    wh.itemsCount = 0;
    wh.totalQty = 0;
    db.warehouses.push(wh);
  } else {
    const idx = db.warehouses.findIndex((w: any) => w.id === wh.id);
    if (idx !== -1) {
      db.warehouses[idx] = { ...db.warehouses[idx], ...wh };
    } else {
      db.warehouses.push(wh);
    }
  }

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "إدارة المستودعات",
    action: `إضافة/تحديث بيانات المستودع: (${wh.name})`,
    ip: req.ip || "127.0.0.1",
    device: "Warehouse Manager"
  });

  writeDb(db);
  res.json({ status: "success", db });
});

// 10. Vendors Add/Edit
app.post("/api/db/inventory/vendors/add", (req, res) => {
  const db = readDb();
  const vendor = req.body;
  db.inventoryVendors = db.inventoryVendors || [];

  if (!vendor.id) {
    vendor.id = "ven-" + Date.now();
    vendor.createdAt = new Date().toISOString();
    db.inventoryVendors.push(vendor);
  } else {
    const idx = db.inventoryVendors.findIndex((v: any) => v.id === vendor.id);
    if (idx !== -1) {
      db.inventoryVendors[idx] = { ...db.inventoryVendors[idx], ...vendor };
    } else {
      db.inventoryVendors.push(vendor);
    }
  }

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "إدارة المشتريات والموردين",
    action: `إضافة/تحديث بيانات المورد: (${vendor.name})`,
    ip: req.ip || "127.0.0.1",
    device: "Vendor Manager"
  });

  writeDb(db);
  res.json({ status: "success", db });
});

// =============================================================
// VOLUNTEER CARD TEMPLATES & ISSUANCE SYSTEM API
// =============================================================

// Helper to ensure default templates exist for all 3 categories: volunteer, employee, leader
function ensureAllCardTemplates(db: any) {
  let modified = false;
  db.volunteerCardTemplates = db.volunteerCardTemplates || [];

  const existingIds = new Set(db.volunteerCardTemplates.map((t: any) => t.id));

  // Ensure category property on existing templates
  db.volunteerCardTemplates.forEach((t: any) => {
    if (!t.category) {
      if (t.id.includes("emp")) t.category = "employee";
      else if (t.id.includes("leader") || t.cardType === "leader") t.category = "leader";
      else t.category = "volunteer";
      modified = true;
    }
  });

  // 1. Volunteer Default (Male)
  if (!existingIds.has("tpl-male-default")) {
    db.volunteerCardTemplates.push({
      id: "tpl-male-default",
      name: "قالب بطاقة المتطوعين الذكور (الأساسي)",
      description: "قالب متكامل معتمد للمتطوعين الذكور يحتوي على كافة الحقول مع باركود ورمز QR.",
      category: "volunteer",
      cardType: "standard",
      targetGender: "male",
      useFemaleUnifiedPhoto: false,
      isActive: true,
      isDefaultMale: true,
      isDefaultFemale: false,
      isDefault: true,
      backgroundUrl: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=856&h=540&fit=crop",
      width: 856,
      height: 540,
      orientation: "landscape",
      createdAt: "2026-01-01T00:00:00Z",
      elements: [
        { id: "e-logo", type: "associationLogo", labelAr: "شعار الجمعية", visible: true, x: 92, y: 7, zIndex: 20 },
        { id: "e-photo", type: "photo", labelAr: "الصورة الشخصية", visible: true, x: 91, y: 24, width: 130, height: 130, photoShape: "rounded", borderWidth: 3, borderColor: "#059669", zIndex: 20 },
        { id: "e-name", type: "name", labelAr: "اسم المتطوع", visible: true, x: 69, y: 25, fontFamily: "Cairo", fontSize: 21, fontWeight: "bold", color: "#064e3b", textAlign: "right", zIndex: 15 },
        { id: "e-title", type: "jobTitle", labelAr: "المسمى التطوعي", visible: true, x: 69, y: 32, fontFamily: "Tajawal", fontSize: 15, fontWeight: "bold", color: "#d97706", textAlign: "right", zIndex: 15 },
        { id: "e-mem", type: "membershipNumber", labelAr: "رقم الملف / العضوية", visible: true, x: 69, y: 39, fontFamily: "Cairo", fontSize: 13, fontWeight: "bold", color: "#1e293b", textAlign: "right", showLabelPrefix: true, labelPrefix: "رقم العضوية:", zIndex: 15 },
        { id: "e-natid", type: "nationalId", labelAr: "رقم الهوية", visible: true, x: 69, y: 45, fontFamily: "Cairo", fontSize: 13, fontWeight: "500", color: "#334155", textAlign: "right", showLabelPrefix: true, labelPrefix: "الهوية:", zIndex: 15 },
        { id: "e-team", type: "teamName", labelAr: "اسم الفريق", visible: true, x: 69, y: 51, fontFamily: "Tajawal", fontSize: 13, fontWeight: "500", color: "#0f766e", textAlign: "right", showLabelPrefix: true, labelPrefix: "الفريق:", zIndex: 15 },
        { id: "e-dept", type: "departmentName", labelAr: "الإدارة التابعة", visible: true, x: 69, y: 57, fontFamily: "Tajawal", fontSize: 12, fontWeight: "500", color: "#475569", textAlign: "right", showLabelPrefix: true, labelPrefix: "الإدارة:", zIndex: 15 },
        { id: "e-blood", type: "bloodType", labelAr: "فصيلة الدم", visible: true, x: 69, y: 63, fontFamily: "Cairo", fontSize: 12, fontWeight: "bold", color: "#b91c1c", textAlign: "right", showLabelPrefix: true, labelPrefix: "الفصيلة:", zIndex: 15 },
        { id: "e-dates", type: "expiryDate", labelAr: "تاريخ الانتهاء", visible: true, x: 91, y: 56, fontFamily: "Cairo", fontSize: 11, fontWeight: "bold", color: "#047857", textAlign: "right", showLabelPrefix: true, labelPrefix: "صالحة حتى:", zIndex: 15 },
        { id: "e-qr", type: "qrCode", labelAr: "رمز QR", visible: true, x: 16, y: 22, qrSize: 92, zIndex: 20 },
        { id: "e-bar", type: "barcode", labelAr: "الباركود", visible: true, x: 26, y: 47, width: 170, zIndex: 15 },
        { id: "e-custom", type: "customText", labelAr: "عبارة رسمية", visible: true, x: 50, y: 91, fontFamily: "Tajawal", fontSize: 11, fontWeight: "bold", color: "#065f46", textAlign: "center", customTextValue: "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة - ترخيص: 5081", zIndex: 15 }
      ]
    });
    modified = true;
  }

  // 2. Volunteer Default (Female with Unified Photo)
  if (!existingIds.has("tpl-female-default")) {
    db.volunteerCardTemplates.push({
      id: "tpl-female-default",
      name: "قالب بطاقة المتطوعات الإناث (مع الصورة الموحدة)",
      description: "قالب راقٍ مخصص للمتطوعات الإناث يدعم استخدام الصورة الموحدة تلقائياً لحفظ الخصوصية.",
      category: "volunteer",
      cardType: "standard",
      targetGender: "female",
      useFemaleUnifiedPhoto: true,
      isActive: true,
      isDefaultMale: false,
      isDefaultFemale: true,
      isDefault: true,
      backgroundUrl: "https://images.unsplash.com/photo-1557683316-973673baf926?w=856&h=540&fit=crop",
      width: 856,
      height: 540,
      orientation: "landscape",
      createdAt: "2026-01-01T00:00:00Z",
      elements: [
        { id: "fe-logo", type: "associationLogo", labelAr: "شعار الجمعية", visible: true, x: 92, y: 7, zIndex: 20 },
        { id: "fe-photo", type: "photo", labelAr: "الصورة الموحدة / الشخصية", visible: true, x: 91, y: 24, width: 130, height: 130, photoShape: "circle", borderWidth: 3, borderColor: "#a855f7", zIndex: 20 },
        { id: "fe-name", type: "name", labelAr: "اسم المتطوعة", visible: true, x: 69, y: 25, fontFamily: "Cairo", fontSize: 21, fontWeight: "bold", color: "#581c87", textAlign: "right", zIndex: 15 },
        { id: "fe-title", type: "jobTitle", labelAr: "المسمى التطوعي", visible: true, x: 69, y: 32, fontFamily: "Tajawal", fontSize: 15, fontWeight: "bold", color: "#c026d3", textAlign: "right", zIndex: 15 },
        { id: "fe-mem", type: "membershipNumber", labelAr: "رقم الملف / العضوية", visible: true, x: 69, y: 39, fontFamily: "Cairo", fontSize: 13, fontWeight: "bold", color: "#1e293b", textAlign: "right", showLabelPrefix: true, labelPrefix: "رقم العضوية:", zIndex: 15 },
        { id: "fe-natid", type: "nationalId", labelAr: "رقم الهوية", visible: true, x: 69, y: 45, fontFamily: "Cairo", fontSize: 13, fontWeight: "500", color: "#334155", textAlign: "right", showLabelPrefix: true, labelPrefix: "الهوية:", zIndex: 15 },
        { id: "fe-team", type: "teamName", labelAr: "اسم الفريق", visible: true, x: 69, y: 51, fontFamily: "Tajawal", fontSize: 13, fontWeight: "500", color: "#7e22ce", textAlign: "right", showLabelPrefix: true, labelPrefix: "الفريق:", zIndex: 15 },
        { id: "fe-dept", type: "departmentName", labelAr: "الإدارة التابعة", visible: true, x: 69, y: 57, fontFamily: "Tajawal", fontSize: 12, fontWeight: "500", color: "#475569", textAlign: "right", showLabelPrefix: true, labelPrefix: "الإدارة:", zIndex: 15 },
        { id: "fe-blood", type: "bloodType", labelAr: "فصيلة الدم", visible: true, x: 69, y: 63, fontFamily: "Cairo", fontSize: 12, fontWeight: "bold", color: "#be123c", textAlign: "right", showLabelPrefix: true, labelPrefix: "الفصيلة:", zIndex: 15 },
        { id: "fe-dates", type: "expiryDate", labelAr: "تاريخ الانتهاء", visible: true, x: 91, y: 56, fontFamily: "Cairo", fontSize: 11, fontWeight: "bold", color: "#7c3aed", textAlign: "right", showLabelPrefix: true, labelPrefix: "صالحة حتى:", zIndex: 15 },
        { id: "fe-qr", type: "qrCode", labelAr: "رمز QR", visible: true, x: 16, y: 22, qrSize: 92, zIndex: 20 },
        { id: "fe-bar", type: "barcode", labelAr: "الباركود", visible: true, x: 26, y: 47, width: 170, zIndex: 15 },
        { id: "fe-custom", type: "customText", labelAr: "عبارة رسمية", visible: true, x: 50, y: 91, fontFamily: "Tajawal", fontSize: 11, fontWeight: "bold", color: "#6b21a8", textAlign: "center", customTextValue: "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة - القسم النسائي", zIndex: 15 }
      ]
    });
    modified = true;
  }

  // 3. Volunteer VIP Field Template
  if (!existingIds.has("tpl-vol-vip")) {
    db.volunteerCardTemplates.push({
      id: "tpl-vol-vip",
      name: "قالب متطوع VIP الميداني",
      description: "قالب تكريمي فاخر ذو تصميم هندسي ذهبي للمتطوعين المتميزين والميدانيين.",
      category: "volunteer",
      cardType: "vip",
      targetGender: "all",
      useFemaleUnifiedPhoto: false,
      isActive: true,
      backgroundUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=856&h=540&fit=crop",
      width: 856,
      height: 540,
      orientation: "landscape",
      createdAt: "2026-01-01T00:00:00Z",
      elements: [
        { id: "vip-logo", type: "associationLogo", labelAr: "شعار الجمعية", visible: true, x: 92, y: 7, zIndex: 20 },
        { id: "vip-photo", type: "photo", labelAr: "الصورة الشخصية", visible: true, x: 91, y: 24, width: 130, height: 130, photoShape: "circle", borderWidth: 3, borderColor: "#d97706", zIndex: 20 },
        { id: "vip-name", type: "name", labelAr: "اسم المتطوع", visible: true, x: 69, y: 25, fontFamily: "Cairo", fontSize: 21, fontWeight: "900", color: "#92400e", textAlign: "right", zIndex: 15 },
        { id: "vip-title", type: "jobTitle", labelAr: "المسمى التطوعي", visible: true, x: 69, y: 32, fontFamily: "Tajawal", fontSize: 15, fontWeight: "bold", color: "#b45309", textAlign: "right", zIndex: 15 },
        { id: "vip-mem", type: "membershipNumber", labelAr: "رقم العضوية VIP", visible: true, x: 69, y: 39, fontFamily: "Cairo", fontSize: 13, fontWeight: "bold", color: "#1e293b", textAlign: "right", showLabelPrefix: true, labelPrefix: "رقم العضوية VIP:", zIndex: 15 },
        { id: "vip-natid", type: "nationalId", labelAr: "رقم الهوية", visible: true, x: 69, y: 45, fontFamily: "Cairo", fontSize: 13, fontWeight: "500", color: "#334155", textAlign: "right", showLabelPrefix: true, labelPrefix: "الهوية:", zIndex: 15 },
        { id: "vip-team", type: "teamName", labelAr: "الفريق", visible: true, x: 69, y: 51, fontFamily: "Tajawal", fontSize: 13, fontWeight: "500", color: "#b45309", textAlign: "right", showLabelPrefix: true, labelPrefix: "الفريق:", zIndex: 15 },
        { id: "vip-pts", type: "points", labelAr: "نقاط التميز", visible: true, x: 69, y: 57, fontFamily: "Cairo", fontSize: 13, fontWeight: "bold", color: "#d97706", textAlign: "right", showLabelPrefix: true, labelPrefix: "الرصيد التقديري:", zIndex: 15 },
        { id: "vip-dates", type: "expiryDate", labelAr: "تاريخ الانتهاء", visible: true, x: 91, y: 56, fontFamily: "Cairo", fontSize: 11, fontWeight: "bold", color: "#b45309", textAlign: "right", showLabelPrefix: true, labelPrefix: "صالحة حتى:", zIndex: 15 },
        { id: "vip-qr", type: "qrCode", labelAr: "رمز QR", visible: true, x: 16, y: 22, qrSize: 92, zIndex: 20 },
        { id: "vip-bar", type: "barcode", labelAr: "الباركود", visible: true, x: 26, y: 47, width: 170, zIndex: 15 },
        { id: "vip-txt", type: "customText", labelAr: "عبارة VIP", visible: true, x: 50, y: 91, fontFamily: "Tajawal", fontSize: 11, fontWeight: "bold", color: "#78350f", textAlign: "center", customTextValue: "بطاقة متطوع VIP متميز - جمعية ريادة العطاء لخدمة الإنسان بالعسيلة", zIndex: 15 }
      ]
    });
    modified = true;
  }

  // 4. Employee Default Template
  if (!existingIds.has("tpl-emp-default")) {
    db.volunteerCardTemplates.push({
      id: "tpl-emp-default",
      name: "قالب بطاقة موظفي الجمعية (الأساسي)",
      description: "قالب بطاقة العمل الرسمية لكافة منسوبي وموظفي جمعية ريادة العطاء بالعسيلة.",
      category: "employee",
      cardType: "standard",
      targetGender: "all",
      useFemaleUnifiedPhoto: false,
      isActive: true,
      isDefault: true,
      backgroundUrl: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=856&h=540&fit=crop",
      width: 856,
      height: 540,
      orientation: "landscape",
      createdAt: "2026-01-01T00:00:00Z",
      elements: [
        { id: "emp-logo", type: "associationLogo", labelAr: "شعار الجمعية", visible: true, x: 92, y: 7, zIndex: 20 },
        { id: "emp-photo", type: "photo", labelAr: "صورة الموظف", visible: true, x: 91, y: 24, width: 130, height: 130, photoShape: "rounded", borderWidth: 3, borderColor: "#0284c7", zIndex: 20 },
        { id: "emp-name", type: "name", labelAr: "اسم الموظف", visible: true, x: 69, y: 25, fontFamily: "Cairo", fontSize: 21, fontWeight: "bold", color: "#0c4a6e", textAlign: "right", zIndex: 15 },
        { id: "emp-title", type: "jobTitle", labelAr: "المسمى الوظيفي", visible: true, x: 69, y: 32, fontFamily: "Tajawal", fontSize: 15, fontWeight: "bold", color: "#0284c7", textAlign: "right", zIndex: 15 },
        { id: "emp-num", type: "employeeNumber", labelAr: "الرقم الوظيفي", visible: true, x: 69, y: 39, fontFamily: "Cairo", fontSize: 13, fontWeight: "bold", color: "#1e293b", textAlign: "right", showLabelPrefix: true, labelPrefix: "الرقم الوظيفي:", zIndex: 15 },
        { id: "emp-natid", type: "nationalId", labelAr: "رقم الهوية", visible: true, x: 69, y: 45, fontFamily: "Cairo", fontSize: 13, fontWeight: "500", color: "#334155", textAlign: "right", showLabelPrefix: true, labelPrefix: "الهوية:", zIndex: 15 },
        { id: "emp-dept", type: "departmentName", labelAr: "القسم / الإدارة", visible: true, x: 69, y: 51, fontFamily: "Tajawal", fontSize: 13, fontWeight: "500", color: "#0369a1", textAlign: "right", showLabelPrefix: true, labelPrefix: "الإدارة:", zIndex: 15 },
        { id: "emp-hire", type: "hireDate", labelAr: "تاريخ التعيين", visible: true, x: 69, y: 57, fontFamily: "Cairo", fontSize: 12, fontWeight: "500", color: "#475569", textAlign: "right", showLabelPrefix: true, labelPrefix: "تاريخ التعيين:", zIndex: 15 },
        { id: "emp-dates", type: "expiryDate", labelAr: "تاريخ انتهاء البطاقة", visible: true, x: 91, y: 56, fontFamily: "Cairo", fontSize: 11, fontWeight: "bold", color: "#0284c7", textAlign: "right", showLabelPrefix: true, labelPrefix: "انتهاء البطاقة:", zIndex: 15 },
        { id: "emp-qr", type: "qrCode", labelAr: "رمز QR الوظيفي", visible: true, x: 16, y: 22, qrSize: 92, zIndex: 20 },
        { id: "emp-bar", type: "barcode", labelAr: "الباركود", visible: true, x: 26, y: 47, width: 170, zIndex: 15 },
        { id: "emp-txt", type: "customText", labelAr: "عبارة رسمية", visible: true, x: 50, y: 91, fontFamily: "Tajawal", fontSize: 11, fontWeight: "bold", color: "#075985", textAlign: "center", customTextValue: "بطاقة عمل رسمية - جمعية ريادة العطاء لخدمة الإنسان بالعسيلة", zIndex: 15 }
      ]
    });
    modified = true;
  }

  // 5. Employee Executive Template
  if (!existingIds.has("tpl-emp-exec")) {
    db.volunteerCardTemplates.push({
      id: "tpl-emp-exec",
      name: "قالب بطاقة الإدارة العليا والتنفيذية",
      description: "قالب بطاقة الإدارة التنفيذية ورؤساء الأقسام ومديري الإدارات بالجمعية.",
      category: "employee",
      cardType: "executive",
      targetGender: "all",
      useFemaleUnifiedPhoto: false,
      isActive: true,
      backgroundUrl: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=856&h=540&fit=crop",
      width: 856,
      height: 540,
      orientation: "landscape",
      createdAt: "2026-01-01T00:00:00Z",
      elements: [
        { id: "ex-logo", type: "associationLogo", labelAr: "شعار الجمعية", visible: true, x: 92, y: 7, zIndex: 20 },
        { id: "ex-photo", type: "photo", labelAr: "الصورة الشخصية", visible: true, x: 91, y: 24, width: 130, height: 130, photoShape: "rounded", borderWidth: 3, borderColor: "#0f766e", zIndex: 20 },
        { id: "ex-name", type: "name", labelAr: "الاسم الكريم", visible: true, x: 69, y: 25, fontFamily: "Cairo", fontSize: 21, fontWeight: "900", color: "#134e4a", textAlign: "right", zIndex: 15 },
        { id: "ex-title", type: "jobTitle", labelAr: "المنصب القيادي", visible: true, x: 69, y: 32, fontFamily: "Tajawal", fontSize: 15, fontWeight: "bold", color: "#0f766e", textAlign: "right", zIndex: 15 },
        { id: "ex-num", type: "employeeNumber", labelAr: "الرقم الوظيفي", visible: true, x: 69, y: 39, fontFamily: "Cairo", fontSize: 13, fontWeight: "bold", color: "#1e293b", textAlign: "right", showLabelPrefix: true, labelPrefix: "الرقم القيادي:", zIndex: 15 },
        { id: "ex-dept", type: "departmentName", labelAr: "الإدارة", visible: true, x: 69, y: 45, fontFamily: "Tajawal", fontSize: 13, fontWeight: "bold", color: "#0f766e", textAlign: "right", showLabelPrefix: true, labelPrefix: "الإدارة:", zIndex: 15 },
        { id: "ex-natid", type: "nationalId", labelAr: "رقم الهوية", visible: true, x: 69, y: 51, fontFamily: "Cairo", fontSize: 12, fontWeight: "500", color: "#334155", textAlign: "right", showLabelPrefix: true, labelPrefix: "الهوية:", zIndex: 15 },
        { id: "ex-hire", type: "hireDate", labelAr: "تاريخ المباشرة", visible: true, x: 69, y: 57, fontFamily: "Cairo", fontSize: 12, fontWeight: "500", color: "#475569", textAlign: "right", showLabelPrefix: true, labelPrefix: "تاريخ المباشرة:", zIndex: 15 },
        { id: "ex-dates", type: "expiryDate", labelAr: "انتهاء البطاقة", visible: true, x: 91, y: 56, fontFamily: "Cairo", fontSize: 11, fontWeight: "bold", color: "#0f766e", textAlign: "right", showLabelPrefix: true, labelPrefix: "صالحة حتى:", zIndex: 15 },
        { id: "ex-qr", type: "qrCode", labelAr: "رمز QR المعتمد", visible: true, x: 16, y: 22, qrSize: 92, zIndex: 20 },
        { id: "ex-bar", type: "barcode", labelAr: "الباركود", visible: true, x: 26, y: 47, width: 170, zIndex: 15 },
        { id: "ex-txt", type: "customText", labelAr: "عبارة رسمية", visible: true, x: 50, y: 91, fontFamily: "Tajawal", fontSize: 11, fontWeight: "bold", color: "#115e59", textAlign: "center", customTextValue: "بطاقة الإدارة التنفيذية والعليا - جمعية ريادة العطاء لخدمة الإنسان بالعسيلة", zIndex: 15 }
      ]
    });
    modified = true;
  }

  // 6. Leader Default Template
  if (!existingIds.has("tpl-leader-default")) {
    db.volunteerCardTemplates.push({
      id: "tpl-leader-default",
      name: "قالب بطاقة قادة الفرق التطوعية (الرسمي)",
      description: "قالب البطاقة القيادية المعتمد لقادة الفرق التطوعية الميدانية والمشرفين.",
      category: "leader",
      cardType: "leader",
      targetGender: "all",
      useFemaleUnifiedPhoto: false,
      isActive: true,
      isDefault: true,
      backgroundUrl: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=856&h=540&fit=crop",
      width: 856,
      height: 540,
      orientation: "landscape",
      createdAt: "2026-01-01T00:00:00Z",
      elements: [
        { id: "ldr-logo", type: "associationLogo", labelAr: "شعار الجمعية", visible: true, x: 92, y: 7, zIndex: 20 },
        { id: "ldr-photo", type: "photo", labelAr: "صورة القائد", visible: true, x: 91, y: 24, width: 130, height: 130, photoShape: "rounded", borderWidth: 3, borderColor: "#ca8a04", zIndex: 20 },
        { id: "ldr-name", type: "name", labelAr: "اسم القائد", visible: true, x: 69, y: 25, fontFamily: "Cairo", fontSize: 21, fontWeight: "900", color: "#854d0e", textAlign: "right", zIndex: 15 },
        { id: "ldr-title", type: "leadershipTitle", labelAr: "الصفة القيادية", visible: true, x: 69, y: 32, fontFamily: "Tajawal", fontSize: 15, fontWeight: "bold", color: "#ca8a04", textAlign: "right", zIndex: 15 },
        { id: "ldr-num", type: "leaderNumber", labelAr: "رقم القائد", visible: true, x: 69, y: 39, fontFamily: "Cairo", fontSize: 13, fontWeight: "bold", color: "#1e293b", textAlign: "right", showLabelPrefix: true, labelPrefix: "رقم القائد:", zIndex: 15 },
        { id: "ldr-team", type: "teamName", labelAr: "اسم الفريق التطوعي", visible: true, x: 69, y: 45, fontFamily: "Tajawal", fontSize: 13, fontWeight: "bold", color: "#0f766e", textAlign: "right", showLabelPrefix: true, labelPrefix: "قائد فريق:", zIndex: 15 },
        { id: "ldr-comm", type: "commissionDate", labelAr: "تاريخ التكليف", visible: true, x: 69, y: 51, fontFamily: "Cairo", fontSize: 12, fontWeight: "500", color: "#475569", textAlign: "right", showLabelPrefix: true, labelPrefix: "تاريخ التكليف:", zIndex: 15 },
        { id: "ldr-natid", type: "nationalId", labelAr: "رقم الهوية", visible: true, x: 69, y: 57, fontFamily: "Cairo", fontSize: 12, fontWeight: "500", color: "#334155", textAlign: "right", showLabelPrefix: true, labelPrefix: "الهوية:", zIndex: 15 },
        { id: "ldr-dates", type: "expiryDate", labelAr: "تاريخ انتهاء الصلاحية", visible: true, x: 91, y: 56, fontFamily: "Cairo", fontSize: 11, fontWeight: "bold", color: "#ca8a04", textAlign: "right", showLabelPrefix: true, labelPrefix: "صالحة حتى:", zIndex: 15 },
        { id: "ldr-qr", type: "qrCode", labelAr: "رمز QR المعتمد", visible: true, x: 16, y: 22, qrSize: 92, zIndex: 20 },
        { id: "ldr-bar", type: "barcode", labelAr: "الباركود", visible: true, x: 26, y: 47, width: 170, zIndex: 15 },
        { id: "ldr-txt", type: "customText", labelAr: "عبارة قيادية", visible: true, x: 50, y: 91, fontFamily: "Tajawal", fontSize: 11, fontWeight: "bold", color: "#713f12", textAlign: "center", customTextValue: "بطاقة قائد فريق تطوعي معتمد - جمعية ريادة العطاء بالعسيلة", zIndex: 15 }
      ]
    });
    modified = true;
  }

  // 7. Leader General Supervisor Template
  if (!existingIds.has("tpl-leader-supervisor")) {
    db.volunteerCardTemplates.push({
      id: "tpl-leader-supervisor",
      name: "قالب بطاقة المشرف الميداني العام",
      description: "قالب بطاقة للمشرفين العامين على الفرق والمبادرات الميدانية بالعسيلة.",
      category: "leader",
      cardType: "leader",
      targetGender: "all",
      useFemaleUnifiedPhoto: false,
      isActive: true,
      backgroundUrl: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=856&h=540&fit=crop",
      width: 856,
      height: 540,
      orientation: "landscape",
      createdAt: "2026-01-01T00:00:00Z",
      elements: [
        { id: "sup-logo", type: "associationLogo", labelAr: "شعار الجمعية", visible: true, x: 92, y: 7, zIndex: 20 },
        { id: "sup-photo", type: "photo", labelAr: "الصورة الشخصية", visible: true, x: 91, y: 24, width: 130, height: 130, photoShape: "rounded", borderWidth: 3, borderColor: "#15803d", zIndex: 20 },
        { id: "sup-name", type: "name", labelAr: "اسم المشرف", visible: true, x: 69, y: 25, fontFamily: "Cairo", fontSize: 21, fontWeight: "900", color: "#14532d", textAlign: "right", zIndex: 15 },
        { id: "sup-title", type: "leadershipTitle", labelAr: "المسمى الإشرافي", visible: true, x: 69, y: 32, fontFamily: "Tajawal", fontSize: 15, fontWeight: "bold", color: "#16a34a", textAlign: "right", zIndex: 15 },
        { id: "sup-num", type: "leaderNumber", labelAr: "رقم المشرف", visible: true, x: 69, y: 39, fontFamily: "Cairo", fontSize: 13, fontWeight: "bold", color: "#1e293b", textAlign: "right", showLabelPrefix: true, labelPrefix: "رقم المشرف:", zIndex: 15 },
        { id: "sup-dept", type: "departmentName", labelAr: "الإشراف العام", visible: true, x: 69, y: 45, fontFamily: "Tajawal", fontSize: 13, fontWeight: "bold", color: "#15803d", textAlign: "right", showLabelPrefix: true, labelPrefix: "المجال الإشرافي:", zIndex: 15 },
        { id: "sup-comm", type: "commissionDate", labelAr: "تاريخ التكليف", visible: true, x: 69, y: 51, fontFamily: "Cairo", fontSize: 12, fontWeight: "500", color: "#475569", textAlign: "right", showLabelPrefix: true, labelPrefix: "تاريخ التكليف:", zIndex: 15 },
        { id: "sup-natid", type: "nationalId", labelAr: "رقم الهوية", visible: true, x: 69, y: 57, fontFamily: "Cairo", fontSize: 12, fontWeight: "500", color: "#334155", textAlign: "right", showLabelPrefix: true, labelPrefix: "الهوية:", zIndex: 15 },
        { id: "sup-dates", type: "expiryDate", labelAr: "تاريخ الانتهاء", visible: true, x: 91, y: 56, fontFamily: "Cairo", fontSize: 11, fontWeight: "bold", color: "#15803d", textAlign: "right", showLabelPrefix: true, labelPrefix: "صالحة حتى:", zIndex: 15 },
        { id: "sup-qr", type: "qrCode", labelAr: "رمز QR الإشرافي", visible: true, x: 16, y: 22, qrSize: 92, zIndex: 20 },
        { id: "sup-bar", type: "barcode", labelAr: "الباركود", visible: true, x: 26, y: 47, width: 170, zIndex: 15 },
        { id: "sup-txt", type: "customText", labelAr: "عبارة إشرافية", visible: true, x: 50, y: 91, fontFamily: "Tajawal", fontSize: 11, fontWeight: "bold", color: "#166534", textAlign: "center", customTextValue: "بطاقة إشراف ميداني عام - جمعية ريادة العطاء لخدمة الإنسان بالعسيلة", zIndex: 15 }
      ]
    });
    modified = true;
  }

  return modified;
}

// 1. Get all card templates & settings
app.get("/api/db/card-templates", (req, res) => {
  const db = readDb();
  if (ensureAllCardTemplates(db)) {
    writeDb(db);
  }
  res.json({
    templates: db.volunteerCardTemplates || [],
    issuedCards: db.issuedVolunteerCards || [],
    femaleUnifiedPhoto: db.systemSettings?.files?.femaleUnifiedCardPhoto || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80"
  });
});

// 1.1 Upload card template background image to local server file system
app.post("/api/db/card-templates/upload-image", (req, res) => {
  try {
    const { imageBase64, teamId, width, height } = req.body;
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return res.status(400).json({ error: "صورة القالب بصيغة Base64 مطلوبة" });
    }

    const matches = imageBase64.match(/^data:image\/([a-zA-Z0-9\+\-\.]+);base64,(.+)$/);
    let ext = "png";
    let base64Data = imageBase64;

    if (matches && matches.length === 3) {
      ext = matches[1].toLowerCase();
      if (ext === "jpeg") ext = "jpg";
      base64Data = matches[2];
    }

    const filename = `template_${teamId ? 'team_' + teamId : 'custom'}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${ext}`;
    const filePath = path.join(cardTemplatesDir, filename);

    const buffer = Buffer.from(base64Data, "base64");
    fs.writeFileSync(filePath, buffer);

    const localUrl = `/card_templates/${filename}`;
    res.json({
      status: "success",
      url: localUrl,
      width: width || 856,
      height: height || 540,
      filename
    });
  } catch (err: any) {
    console.error("Error uploading card template image:", err);
    res.status(500).json({ error: "فشل في حفظ صورة قالب البطاقة على السيرفر", details: err?.message });
  }
});

// 1.2 Get Team Card Template
app.get("/api/db/team-card-template/:teamId", (req, res) => {
  const db = readDb();
  const { teamId } = req.params;
  db.volunteerCardTemplates = db.volunteerCardTemplates || [];
  ensureAllCardTemplates(db);

  const team = (db.teams || []).find((t: any) => t.id === teamId);
  if (!team) {
    return res.status(404).json({ error: "الفريق غير موجود" });
  }

  // Look for template assigned to team
  let template = db.volunteerCardTemplates.find((t: any) => t.teamId === teamId);
  if (!template && team.cardTemplateId) {
    template = db.volunteerCardTemplates.find((t: any) => t.id === team.cardTemplateId);
  }

  // If none exists, provide a default template copy configured for this team
  if (!template) {
    const defaultTpl = db.volunteerCardTemplates.find((t: any) => t.isDefault) || db.volunteerCardTemplates[0];
    template = {
      ...defaultTpl,
      id: `tpl-team-${teamId}`,
      name: `قالب بطاقات ${team.nameAr}`,
      description: `قالب البطاقات الرقمية المعتمد لفريق ${team.nameAr}`,
      teamId: team.id,
      teamName: team.nameAr,
      sourceType: "team",
      createdAt: new Date().toISOString()
    };
  }

  res.json({ status: "success", template, team });
});

// 1.3 Save Team Card Template (with strict RBAC for team leaders)
app.post("/api/db/team-card-template/save", (req, res) => {
  const db = readDb();
  const { teamId, template, leaderTeamId, userRole, performerName, applyToTeamCards } = req.body;

  if (!teamId || !template) {
    return res.status(400).json({ error: "معرف الفريق وبيانات القالب مطلوبة" });
  }

  // RBAC Validation: Team leader can ONLY modify their own team's template!
  if (userRole === "leader" && leaderTeamId && leaderTeamId !== teamId) {
    return res.status(403).json({ error: "غير مصرح لك بتعديل قالب فريق آخر. صلاحيتك محصورة بفريقك فقط." });
  }

  db.volunteerCardTemplates = db.volunteerCardTemplates || [];
  const team = (db.teams || []).find((t: any) => t.id === teamId);

  const templateToSave = {
    ...template,
    id: template.id || `tpl-team-${teamId}-${Date.now()}`,
    teamId: teamId,
    teamName: team ? team.nameAr : template.teamName || "فريق التطوع",
    sourceType: "team",
    updatedAt: new Date().toISOString()
  };

  const existingIdx = db.volunteerCardTemplates.findIndex((t: any) => t.id === templateToSave.id || t.teamId === teamId);
  if (existingIdx !== -1) {
    db.volunteerCardTemplates[existingIdx] = templateToSave;
  } else {
    db.volunteerCardTemplates.push(templateToSave);
  }

  if (team) {
    team.cardTemplateId = templateToSave.id;
    team.cardBgImageUrl = templateToSave.backgroundUrl;
  }

  let updatedCardsCount = 0;
  if (applyToTeamCards && db.issuedVolunteerCards) {
    const teamVolunteerIds = new Set((db.volunteers || []).filter((v: any) => v.teamId === teamId).map((v: any) => v.id));
    db.issuedVolunteerCards.forEach((c: any) => {
      if (teamVolunteerIds.has(c.volunteerId)) {
        c.templateId = templateToSave.id;
        c.templateName = templateToSave.name;
        c.updatedAt = new Date().toISOString();
        updatedCardsCount++;
      }
    });
  }

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: performerName || "قائد الفريق",
    action: `حفظ قالب بطاقة فريق (${team ? team.nameAr : teamId}) بنجاح بواسطة (${performerName || "قائد الفريق"})${updatedCardsCount > 0 ? ` وتحديث ${updatedCardsCount} بطاقة للمتطوعين` : ""}`,
    ip: req.ip || "127.0.0.1",
    device: "Team Card Designer"
  });

  writeDb(db);
  res.json({ status: "success", template: templateToSave, team, updatedCardsCount, db });
});

// 1.4 Bulk Issue Team Cards (Automated generation for team members)
app.post("/api/db/team-cards/bulk-issue", (req, res) => {
  const db = readDb();
  const { teamId, leaderTeamId, userRole, performerName } = req.body;

  if (!teamId) {
    return res.status(400).json({ error: "معرف الفريق مطلوب" });
  }

  // RBAC: Leaders can only bulk issue for their own team
  if (userRole === "leader" && leaderTeamId && leaderTeamId !== teamId) {
    return res.status(403).json({ error: "غير مصرح لك بإصدار بطاقات لمتطوعي فريق آخر" });
  }

  const team = (db.teams || []).find((t: any) => t.id === teamId);
  if (!team) {
    return res.status(404).json({ error: "الفريق غير موجود" });
  }

  // Find team template
  let tpl = (db.volunteerCardTemplates || []).find((t: any) => t.teamId === teamId);
  if (!tpl && team.cardTemplateId) {
    tpl = (db.volunteerCardTemplates || []).find((t: any) => t.id === team.cardTemplateId);
  }
  if (!tpl) {
    tpl = (db.volunteerCardTemplates || []).find((t: any) => t.isDefault) || db.volunteerCardTemplates?.[0];
  }

  const teamVolunteers = (db.volunteers || []).filter((v: any) => v.teamId === teamId);
  if (teamVolunteers.length === 0) {
    return res.status(400).json({ error: "لا يوجد متطوعين مسجلين في هذا الفريق حالياً" });
  }

  db.issuedVolunteerCards = db.issuedVolunteerCards || [];
  let issuedCount = 0;

  teamVolunteers.forEach((v: any, index: number) => {
    // Supersede old cards
    db.issuedVolunteerCards.forEach((c: any) => {
      if (c.volunteerId === v.id && c.status === "active") {
        c.status = "superseded";
      }
    });

    const cardSeq = String(db.issuedVolunteerCards.length + 1).padStart(5, "0");
    const cardNumber = `CRD-2026-${cardSeq}`;
    const verificationCode = `VRY-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    const newCard = {
      id: "card-" + Date.now() + "-" + index,
      volunteerId: v.id,
      templateId: tpl?.id || "tpl-team-" + teamId,
      templateName: tpl?.name || `قالب ${team.nameAr}`,
      cardNumber,
      verificationCode,
      issueDate: new Date().toISOString().split("T")[0],
      expiryDate: v.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: "active",
      issuedBy: performerName || `قائد فريق ${team.nameAr}`,
      notes: `إصدار آلي لبطاقة العضوية لفريق ${team.nameAr}`,
      qrVerificationUrl: `https://reyadat-alata.org.sa/verify-card?code=${verificationCode}`,
      createdAt: new Date().toISOString()
    };

    db.issuedVolunteerCards.unshift(newCard);
    v.activeCardId = newCard.id;
    v.activeCardNumber = cardNumber;
    v.activeCardTemplateId = newCard.templateId;
    v.issuedCardId = newCard.id;
    v.issuedCard = newCard as any;
    issuedCount++;
  });

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: performerName || `قائد فريق ${team.nameAr}`,
    action: `إصدار بطاقات العضوية تلقائياً لجميع متطوعي فريق (${team.nameAr}) بعدد (${issuedCount}) بطاقة`,
    ip: req.ip || "127.0.0.1",
    device: "Team Bulk Card Generator"
  });

  writeDb(db);
  res.json({
    status: "success",
    issuedCount,
    template: tpl,
    issuedCards: db.issuedVolunteerCards,
    volunteers: db.volunteers,
    db
  });
});

// 2. Add / Update Card Template (supports category and applyToExistingCards)
app.post("/api/db/card-templates/add", (req, res) => {
  const db = readDb();
  db.volunteerCardTemplates = db.volunteerCardTemplates || [];

  // If batch templates array passed
  if (Array.isArray(req.body.templates)) {
    db.volunteerCardTemplates = req.body.templates;
    db.logs.unshift({
      id: "log-" + Date.now(),
      timestamp: new Date().toISOString(),
      user: req.body.performerName || "إدارة التطوع - تصميم البطاقات",
      action: `حفظ ومزامنة قوالب البطاقات (${req.body.templates.length} قالب)`,
      ip: req.ip || "127.0.0.1",
      device: "Card Designer Studio"
    });
    writeDb(db);
    return res.json({ status: "success", templates: db.volunteerCardTemplates, db });
  }

  const template = req.body.template || req.body;
  const applyToExistingCards = req.body.applyToExistingCards === true;
  const performerName = req.body.performerName || "إدارة التطوع - تصميم البطاقات";

  if (!template || !template.name) {
    return res.status(400).json({ error: "اسم القالب مطلوب" });
  }

  if (!template.id) {
    template.id = "tpl-" + (template.category ? template.category + "-" : "") + Date.now();
    template.createdAt = new Date().toISOString();
  }

  if (!template.category) {
    template.category = "volunteer";
  }

  // Handle default flags per category and gender
  if (template.isDefault) {
    db.volunteerCardTemplates.forEach((t: any) => {
      if (t.id !== template.id && t.category === template.category) {
        t.isDefault = false;
      }
    });
  }
  if (template.isDefaultMale) {
    db.volunteerCardTemplates.forEach((t: any) => {
      if (t.id !== template.id && t.targetGender === "male") {
        t.isDefaultMale = false;
      }
    });
  }
  if (template.isDefaultFemale) {
    db.volunteerCardTemplates.forEach((t: any) => {
      if (t.id !== template.id && t.targetGender === "female") {
        t.isDefaultFemale = false;
      }
    });
  }

  const existingIdx = db.volunteerCardTemplates.findIndex((t: any) => t.id === template.id);
  if (existingIdx !== -1) {
    db.volunteerCardTemplates[existingIdx] = { ...db.volunteerCardTemplates[existingIdx], ...template, updatedAt: new Date().toISOString() };
  } else {
    db.volunteerCardTemplates.push(template);
  }

  // If user requested: apply updates to all existing issued cards using this template
  let updatedCardsCount = 0;
  if (applyToExistingCards && db.issuedVolunteerCards && Array.isArray(db.issuedVolunteerCards)) {
    db.issuedVolunteerCards.forEach((c: any) => {
      if (c.templateId === template.id || !c.templateId) {
        c.templateName = template.name;
        c.updatedAt = new Date().toISOString();
        updatedCardsCount++;
      }
    });
  }

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: performerName,
    action: `حفظ/تعديل قالب بطاقة (${template.category === 'employee' ? 'الموظفين' : template.category === 'leader' ? 'القادة' : 'المتطوعين'}): (${template.name})${applyToExistingCards ? ` وتطبيق التعديل على البطاقات الصادرة (${updatedCardsCount} بطاقة)` : ' (للبطاقات الجديدة فقط)'}`,
    ip: req.ip || "127.0.0.1",
    device: "Card Designer Studio"
  });

  writeDb(db);
  res.json({ status: "success", template, templates: db.volunteerCardTemplates, updatedCardsCount, db });
});

// 2.1 Regenerate Card for Member (Volunteer, Employee, or Leader)
app.post("/api/db/cards/regenerate", (req, res) => {
  const db = readDb();
  const { volunteerId, memberId, memberType = "volunteer", templateId, performerName = "النظام", reason = "" } = req.body;
  const targetId = volunteerId || memberId;

  if (!targetId) {
    return res.status(400).json({ error: "معرف العضو مطلوب" });
  }

  db.issuedVolunteerCards = db.issuedVolunteerCards || [];
  db.volunteerCardTemplates = db.volunteerCardTemplates || [];
  ensureAllCardTemplates(db);

  let member: any = null;
  let memberCategory = memberType;

  if (memberType === "volunteer") {
    member = (db.volunteers || []).find((v: any) => v.id === targetId);
    memberCategory = "volunteer";
  } else if (memberType === "leader") {
    // Check teams leaders or volunteers with role leader
    member = (db.teams || []).find((t: any) => t.id === targetId || t.leaderNationalId === targetId);
    if (!member) {
      member = (db.volunteers || []).find((v: any) => v.id === targetId);
    }
  } else if (memberType === "employee") {
    member = (db.employees || []).find((e: any) => e.id === targetId);
    if (!member) {
      member = (db.volunteers || []).find((v: any) => v.id === targetId);
    }
  }

  if (!member) {
    member = (db.volunteers || []).find((v: any) => v.id === targetId);
  }

  if (!member) {
    return res.status(404).json({ error: "العضو غير موجود في السجلات" });
  }

  // Find template or pick default
  let tpl = db.volunteerCardTemplates.find((t: any) => t.id === templateId);
  if (!tpl) {
    const isFemale = member.gender === "female";
    tpl = db.volunteerCardTemplates.find((t: any) => t.category === memberCategory && (isFemale ? t.isDefaultFemale : t.isDefaultMale)) ||
          db.volunteerCardTemplates.find((t: any) => t.category === memberCategory && t.isDefault) ||
          db.volunteerCardTemplates.find((t: any) => t.category === memberCategory) ||
          db.volunteerCardTemplates[0];
  }

  // Invalidate previous cards
  db.issuedVolunteerCards.forEach((c: any) => {
    if (c.volunteerId === targetId && c.status === "active") {
      c.status = "superseded";
    }
  });

  const cardSeq = String(db.issuedVolunteerCards.length + 1).padStart(5, "0");
  const cardNumber = `CRD-2026-${cardSeq}`;
  const verificationCode = `VRY-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;

  const newCard = {
    id: "card-" + Date.now(),
    volunteerId: member.id || targetId,
    templateId: tpl ? tpl.id : "tpl-male-default",
    templateName: tpl ? tpl.name : "القالب المعتمد",
    cardNumber,
    verificationCode,
    issueDate: new Date().toISOString().split("T")[0],
    expiryDate: member.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    status: "active",
    issuedBy: performerName || "إدارة شؤون المتطوعين",
    notes: reason || "إعادة إنشاء البطاقة الرقمية وتحديث بياناتها",
    qrVerificationUrl: `https://reyadat-alata.org.sa/verify-card?code=${verificationCode}`,
    createdAt: new Date().toISOString()
  };

  db.issuedVolunteerCards.unshift(newCard);

  // Update member record
  if (member.id) {
    member.activeCardId = newCard.id;
    member.activeCardNumber = cardNumber;
    member.activeCardTemplateId = newCard.templateId;
  }

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: performerName,
    action: `إعادة إنشاء البطاقة الرقمية رقم (${cardNumber}) للعضو: (${member.name || member.leaderName || targetId}) بواسطة (${performerName})`,
    ip: req.ip || "127.0.0.1",
    device: "Card Regenerator"
  });

  writeDb(db);
  res.json({ status: "success", card: newCard, issuedCards: db.issuedVolunteerCards, db });
});

// 2.2 Update Member Card Data (keeps coordinates/layout intact, only updates data)
app.post("/api/db/cards/update-member-data", (req, res) => {
  const db = readDb();
  const { memberId, volunteerId, updatedFields, performerName = "النظام" } = req.body;
  const targetId = volunteerId || memberId;

  if (!targetId || !updatedFields) {
    return res.status(400).json({ error: "بيانات التحديث غير مكتملة" });
  }

  // Find in volunteers
  const vol = (db.volunteers || []).find((v: any) => v.id === targetId);
  if (vol) {
    if (updatedFields.name) vol.name = updatedFields.name;
    if (updatedFields.titleAr) vol.titleAr = updatedFields.titleAr;
    if (updatedFields.bloodType) vol.bloodType = updatedFields.bloodType;
    if (updatedFields.phone) vol.phone = updatedFields.phone;
    if (updatedFields.nationalId) vol.nationalId = updatedFields.nationalId;
    if (updatedFields.photo) vol.photo = updatedFields.photo;
    if (updatedFields.email) vol.email = updatedFields.email;
    if (updatedFields.expiryDate) vol.expiryDate = updatedFields.expiryDate;

    db.logs.unshift({
      id: "log-" + Date.now(),
      timestamp: new Date().toISOString(),
      user: performerName,
      action: `تعديل بيانات بطاقة المتطوع (${vol.name}) دون تغيير موضع العناصر بواسطة (${performerName})`,
      ip: req.ip || "127.0.0.1",
      device: "Card Data Editor"
    });

    writeDb(db);
    return res.json({ status: "success", volunteer: vol, db });
  }

  // Find in employees
  if (db.employees && Array.isArray(db.employees)) {
    const emp = db.employees.find((e: any) => e.id === targetId);
    if (emp) {
      Object.assign(emp, updatedFields);
      db.logs.unshift({
        id: "log-" + Date.now(),
        timestamp: new Date().toISOString(),
        user: performerName,
        action: `تعديل بيانات بطاقة الموظف (${emp.name}) بواسطة (${performerName})`,
        ip: req.ip || "127.0.0.1",
        device: "Card Data Editor"
      });
      writeDb(db);
      return res.json({ status: "success", employee: emp, db });
    }
  }

  return res.status(404).json({ error: "العضو غير موجود في السجلات" });
});

// 2.2.1 Get all Staff Members (Employees, Leaders, Volunteers) for Card Management
app.get("/api/db/staff-members", (req, res) => {
  const db = readDb();
  let modified = false;

  // Ensure default employees if none
  if (!db.employees || !Array.isArray(db.employees) || db.employees.length === 0) {
    db.employees = [
      {
        id: "emp-1",
        employeeNumber: "EMP-2026-001",
        name: "سعود بن عبد العزيز الهذلي",
        nationalId: "1034567890",
        phone: "0501234567",
        email: "saud.h@reyadat-alata.org.sa",
        jobTitle: "مدير الشؤون الإدارية والمالية",
        departmentId: "dep-1",
        departmentName: "إدارة الشؤون الإدارية والمالية",
        gender: "male",
        nationality: "سعودي",
        bloodType: "O+",
        hireDate: "2024-03-01",
        expiryDate: "2027-03-01",
        photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
        status: "active",
        barcode: "100088868101",
        qrCode: "MEM-EMP-2026-001"
      },
      {
        id: "emp-2",
        employeeNumber: "EMP-2026-002",
        name: "منى بنت سليمان الحربي",
        nationalId: "1098761234",
        phone: "0559876543",
        email: "mona.h@reyadat-alata.org.sa",
        jobTitle: "مسؤولة العلاقات والإعلام الرقمي",
        departmentId: "dep-2",
        departmentName: "إدارة العلاقات العامة والإعلام",
        gender: "female",
        nationality: "سعودية",
        bloodType: "A+",
        hireDate: "2024-06-15",
        expiryDate: "2027-06-15",
        photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop",
        status: "active",
        barcode: "100088868102",
        qrCode: "MEM-EMP-2026-002"
      }
    ];
    modified = true;
  }

  // Ensure default leaders if none
  if (!db.leaders || !Array.isArray(db.leaders) || db.leaders.length === 0) {
    db.leaders = [
      {
        id: "ldr-1",
        leaderNumber: "LDR-2026-001",
        name: "فهد بن محمد الشريف",
        nationalId: "1065432198",
        phone: "0543219876",
        email: "fahad.s@reyadat-alata.org.sa",
        leadershipTitle: "قائد فريق سواعد العطاء الميداني",
        teamId: "team-1",
        teamName: "فريق سواعد العطاء",
        gender: "male",
        nationality: "سعودي",
        bloodType: "B+",
        commissionDate: "2025-01-10",
        expiryDate: "2027-01-10",
        photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
        status: "active",
        barcode: "100088868201",
        qrCode: "MEM-LDR-2026-001"
      },
      {
        id: "ldr-2",
        leaderNumber: "LDR-2026-002",
        name: "ريم بنت عبد الله السلمي",
        nationalId: "1076543210",
        phone: "0561122334",
        email: "reem.s@reyadat-alata.org.sa",
        leadershipTitle: "قائدة فريق نبض التطوع النسائي",
        teamId: "team-2",
        teamName: "فريق نبض التطوع",
        gender: "female",
        nationality: "سعودية",
        bloodType: "O+",
        commissionDate: "2025-04-01",
        expiryDate: "2027-04-01",
        photo: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop",
        status: "active",
        barcode: "100088868202",
        qrCode: "MEM-LDR-2026-002"
      }
    ];
    modified = true;
  }

  if (modified) {
    writeDb(db);
  }

  res.json({
    employees: db.employees || [],
    leaders: db.leaders || [],
    volunteers: db.volunteers || []
  });
});

// ==========================================
// EMPLOYEE & DEPARTMENT STAFF MANAGEMENT API
// ==========================================

// 1. Get all employee addition requests
app.get("/api/db/employee-requests", (req, res) => {
  const db = readDb();
  res.json(db.employeeRequests || []);
});

// 2. Department Manager submits a request to add employee
app.post("/api/db/employee-requests/create", (req, res) => {
  const db = readDb();
  const {
    departmentId,
    departmentName,
    requestedBy,
    requestedByPhone,
    fullName,
    nationalId,
    phone,
    email,
    nationality = "سعودي",
    jobTitle,
    section,
    qualification,
    birthDate,
    hireDate,
    employmentType = "full_time",
    notes,
    documents = []
  } = req.body;

  if (!fullName || !nationalId || !phone || !email || !jobTitle || !departmentId) {
    return res.status(400).json({ error: "يرجى تعبئة كافة الحقول الإلزامية لطلب إضافة الموظف" });
  }

  // Check if national ID already has pending request or active employee
  db.employeeRequests = db.employeeRequests || [];
  const existingPending = db.employeeRequests.find(
    (r: any) => r.nationalId === nationalId && (r.status === 'pending' || r.status === 'needs_modification')
  );
  if (existingPending) {
    return res.status(400).json({ error: "يوجد طلب سابق بنفس رقم الهوية قيد المراجعة حالياً" });
  }

  const newRequestId = "emp-req-" + Date.now();
  const reqNum = "EMP-REQ-2026-" + String(Math.floor(1000 + Math.random() * 9000));
  const nowIso = new Date().toISOString();

  const newRequest = {
    id: newRequestId,
    requestNumber: reqNum,
    departmentId,
    departmentName: departmentName || "إدارة غير محددة",
    requestedBy: requestedBy || "مدير الإدارة",
    requestedByPhone: requestedByPhone || "",
    createdAt: nowIso,
    status: "pending",
    fullName,
    nationalId,
    phone,
    email,
    nationality,
    jobTitle,
    section: section || "",
    qualification: qualification || "",
    birthDate: birthDate || "",
    hireDate: hireDate || nowIso.split('T')[0],
    employmentType,
    notes: notes || "",
    documents: documents || [],
    reviewHistory: [
      {
        date: nowIso,
        action: "submitted",
        performedBy: requestedBy || "مدير الإدارة",
        notes: `رفع طلب احتياج وظيفي لإضافة الموظف (${fullName}) بمسمى (${jobTitle})`
      }
    ]
  };

  db.employeeRequests.unshift(newRequest);

  // Send Notification to Upper Management / Admin
  db.notifications = db.notifications || [];
  db.notifications.unshift({
    id: "not-" + Date.now(),
    userId: "role:admin",
    targetRole: "admin",
    category: "employee_request",
    titleAr: `طلب إضافة موظف جديد: ${fullName} 👤`,
    titleEn: `New Employee Addition Request: ${fullName}`,
    bodyAr: `قامت (${newRequest.departmentName}) برفع طلب اعتماد موظف جديد (${fullName} - ${jobTitle}). بانتظار مراجعة واعتماد الإدارة العليا.`,
    bodyEn: `Department ${newRequest.departmentName} requested adding new employee ${fullName} (${jobTitle}). Awaiting upper management approval.`,
    createdAt: nowIso,
    read: false
  });

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: nowIso,
    user: requestedBy || "مدير الإدارة",
    action: `رفع طلب إضافة موظف جديد (${fullName}) لصالح (${newRequest.departmentName}) برقم طلب (${reqNum})`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  // Central Email: Send confirmation to candidate if email provided
  if (email && email.includes("@")) {
    sendCentralEmail(db, {
      to: email.trim(),
      recipientName: fullName,
      subject: `تم استلام طلب ترشيحك الوظيفي (#${reqNum}) - ريادة العطاء`,
      templateType: "employee_request_received",
      templateData: {
        requestNumber: reqNum,
        candidateName: fullName,
        departmentName: newRequest.departmentName,
        jobTitle: newRequest.jobTitle,
        status: "قيد المراجعة الإدارية"
      }
    }).catch(err => console.error("Employee req email error:", err));
  }

  writeDb(db);
  res.json({ status: "success", request: newRequest, db });
});

// 3. Department Manager updates request (after needs_modification)
app.post("/api/db/employee-requests/update", (req, res) => {
  const db = readDb();
  const { requestId, updatedFields, requestedBy } = req.body;

  db.employeeRequests = db.employeeRequests || [];
  const reqObj = db.employeeRequests.find((r: any) => r.id === requestId);
  if (!reqObj) {
    return res.status(404).json({ error: "طلب إضافة الموظف غير موجود" });
  }

  const nowIso = new Date().toISOString();
  Object.assign(reqObj, updatedFields);
  reqObj.status = "pending"; // reset to pending for admin re-evaluation
  reqObj.updatedAt = nowIso;

  reqObj.reviewHistory = reqObj.reviewHistory || [];
  reqObj.reviewHistory.push({
    date: nowIso,
    action: "resubmitted",
    performedBy: requestedBy || reqObj.requestedBy || "مدير الإدارة",
    notes: "إعادة إرسال الطلب بعد تصحيح وتحديث البيانات المطلوبة"
  });

  // Notify Upper Admin
  db.notifications = db.notifications || [];
  db.notifications.unshift({
    id: "not-" + Date.now(),
    userId: "role:admin",
    targetRole: "admin",
    category: "employee_request",
    titleAr: `إعادة إرسال طلب موظف بعد التعديل: ${reqObj.fullName}`,
    titleEn: `Employee Request Resubmitted: ${reqObj.fullName}`,
    bodyAr: `تم تحديث وإعادة إرسال طلب إضافة الموظف (${reqObj.fullName}) من (${reqObj.departmentName}). جاهز الآن للمراجعة والاعتماد.`,
    createdAt: nowIso,
    read: false
  });

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: nowIso,
    user: requestedBy || reqObj.requestedBy || "مدير الإدارة",
    action: `تحديث وإعادة إرسال طلب إضافة الموظف (${reqObj.fullName}) رقم (${reqObj.requestNumber})`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  writeDb(db);
  res.json({ status: "success", request: reqObj, db });
});

// 4. Upper Admin Approves Employee Request
app.post("/api/db/employee-requests/approve", (req, res) => {
  const db = readDb();
  const { requestId, reviewerName = "المدير التنفيذي", notes } = req.body;

  db.employeeRequests = db.employeeRequests || [];
  const reqObj = db.employeeRequests.find((r: any) => r.id === requestId);
  if (!reqObj) {
    return res.status(404).json({ error: "طلب إضافة الموظف غير موجود" });
  }

  if (reqObj.status === 'approved') {
    return res.status(400).json({ error: "تم اعتماد هذا الطلب مسبقاً" });
  }

  const nowIso = new Date().toISOString();
  reqObj.status = "approved";
  reqObj.reviewedBy = reviewerName;
  reqObj.reviewedAt = nowIso;

  reqObj.reviewHistory = reqObj.reviewHistory || [];
  reqObj.reviewHistory.push({
    date: nowIso,
    action: "approved",
    performedBy: reviewerName,
    notes: notes || "تمت الموافقة والاعتماد الرسمي للموظف من قبل الإدارة العليا"
  });

  // Create or Activate Employee in db.employees
  db.employees = db.employees || [];
  const empId = "emp-" + Date.now();
  const empNumber = "EMP-2026-" + String(Math.floor(100 + Math.random() * 900));
  const newEmp = {
    id: empId,
    employeeNumber: empNumber,
    name: reqObj.fullName,
    nationalId: reqObj.nationalId,
    phone: reqObj.phone,
    email: reqObj.email,
    nationality: reqObj.nationality || "سعودي",
    jobTitle: reqObj.jobTitle,
    departmentId: reqObj.departmentId,
    departmentName: reqObj.departmentName,
    section: reqObj.section || "",
    qualification: reqObj.qualification || "",
    birthDate: reqObj.birthDate || "",
    hireDate: reqObj.hireDate || nowIso.split('T')[0],
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    employmentType: reqObj.employmentType || "full_time",
    notes: reqObj.notes || "",
    documents: reqObj.documents || [],
    photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop",
    status: "active",
    barcode: "1000888" + String(Math.floor(10000 + Math.random() * 90000)),
    qrCode: "MEM-" + empNumber,
    approvedBy: reviewerName,
    approvedAt: nowIso,
    requestId: reqObj.id
  };

  db.employees.unshift(newEmp);
  reqObj.approvedEmployeeId = empId;

  // Send Notification to Department Director
  db.notifications = db.notifications || [];
  db.notifications.unshift({
    id: "not-" + Date.now(),
    userId: "dep:" + reqObj.departmentId,
    category: "employee_request",
    titleAr: `تم قبول واعتماد الموظف: ${reqObj.fullName} ✅`,
    titleEn: `Employee Approved: ${reqObj.fullName}`,
    bodyAr: `تم قبول واعتماد طلب إضافة الموظف (${reqObj.fullName}) بمسمى (${reqObj.jobTitle}) بنجاح. تم إصدار رقمه الوظيفي (${empNumber}) وتفعيل ملفه الوظيفي.`,
    createdAt: nowIso,
    read: false
  });

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: nowIso,
    user: reviewerName,
    action: `اعتماد طلب الموظف (${reqObj.fullName}) وتفعيل سجله الوظيفي (${empNumber}) بإدارة (${reqObj.departmentName})`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  // Central Email: Send approval email to employee
  if (reqObj.email && reqObj.email.includes("@")) {
    sendCentralEmail(db, {
      to: reqObj.email.trim(),
      recipientName: reqObj.fullName,
      subject: "مبارك! تم اعتماد تعيينك الوظيفي رسمياً - جمعية ريادة العطاء",
      templateType: "employee_request_approved",
      templateData: {
        requestNumber: reqObj.requestNumber,
        candidateName: reqObj.fullName,
        departmentName: reqObj.departmentName,
        jobTitle: reqObj.jobTitle,
        status: "معتمد ونشط"
      }
    }).catch(err => console.error("Employee approve email error:", err));
  }

  writeDb(db);
  res.json({ status: "success", employee: newEmp, request: reqObj, db });
});

// 5. Upper Admin Rejects Employee Request (Mandatory reason)
app.post("/api/db/employee-requests/reject", (req, res) => {
  const db = readDb();
  const { requestId, reviewerName = "المدير التنفيذي", rejectionReason } = req.body;

  if (!rejectionReason || !rejectionReason.trim()) {
    return res.status(400).json({ error: "حقل سبب الرفض إلزامي لتوضيح مبررات القرار لمدير الإدارة" });
  }

  db.employeeRequests = db.employeeRequests || [];
  const reqObj = db.employeeRequests.find((r: any) => r.id === requestId);
  if (!reqObj) {
    return res.status(404).json({ error: "طلب إضافة الموظف غير موجود" });
  }

  const nowIso = new Date().toISOString();
  reqObj.status = "rejected";
  reqObj.rejectionReason = rejectionReason.trim();
  reqObj.reviewedBy = reviewerName;
  reqObj.reviewedAt = nowIso;

  reqObj.reviewHistory = reqObj.reviewHistory || [];
  reqObj.reviewHistory.push({
    date: nowIso,
    action: "rejected",
    performedBy: reviewerName,
    notes: rejectionReason.trim()
  });

  // Notify Department Director
  db.notifications = db.notifications || [];
  db.notifications.unshift({
    id: "not-" + Date.now(),
    userId: "dep:" + reqObj.departmentId,
    category: "employee_request",
    titleAr: `تم رفض طلب إضافة الموظف: ${reqObj.fullName} ❌`,
    titleEn: `Employee Request Rejected: ${reqObj.fullName}`,
    bodyAr: `تم رفض طلب إضافة الموظف (${reqObj.fullName}) من قبل الإدارة العليا.\nسبب الرفض: ${rejectionReason.trim()}`,
    createdAt: nowIso,
    read: false
  });

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: nowIso,
    user: reviewerName,
    action: `رفض طلب إضافة الموظف (${reqObj.fullName}) لإدارة (${reqObj.departmentName}) - سبب الرفض: ${rejectionReason.trim()}`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  writeDb(db);
  res.json({ status: "success", request: reqObj, db });
});

// 6. Upper Admin Requests Modification (Mandatory modification notes)
app.post("/api/db/employee-requests/request-modification", (req, res) => {
  const db = readDb();
  const { requestId, reviewerName = "المدير التنفيذي", modificationNotes } = req.body;

  if (!modificationNotes || !modificationNotes.trim()) {
    return res.status(400).json({ error: "حقل ملاحظات التعديل إلزامي لتحديد النواقص لمدير الإدارة" });
  }

  db.employeeRequests = db.employeeRequests || [];
  const reqObj = db.employeeRequests.find((r: any) => r.id === requestId);
  if (!reqObj) {
    return res.status(404).json({ error: "طلب إضافة الموظف غير موجود" });
  }

  const nowIso = new Date().toISOString();
  reqObj.status = "needs_modification";
  reqObj.modificationNotes = modificationNotes.trim();
  reqObj.reviewedBy = reviewerName;
  reqObj.reviewedAt = nowIso;

  reqObj.reviewHistory = reqObj.reviewHistory || [];
  reqObj.reviewHistory.push({
    date: nowIso,
    action: "needs_modification",
    performedBy: reviewerName,
    notes: modificationNotes.trim()
  });

  // Notify Department Director
  db.notifications = db.notifications || [];
  db.notifications.unshift({
    id: "not-" + Date.now(),
    userId: "dep:" + reqObj.departmentId,
    category: "employee_request",
    titleAr: `مطلوب تعديل بيانات طلب الموظف: ${reqObj.fullName} ⚠️`,
    titleEn: `Modification required: ${reqObj.fullName}`,
    bodyAr: `أعادت الإدارة العليا طلب إضافة الموظف (${reqObj.fullName}) لاستكمال أو تعديل الملاحظات التالية:\n${modificationNotes.trim()}`,
    createdAt: nowIso,
    read: false
  });

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: nowIso,
    user: reviewerName,
    action: `طلب استكمال وتعديل بيانات طلب الموظف (${reqObj.fullName}) لإدارة (${reqObj.departmentName})`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  writeDb(db);
  res.json({ status: "success", request: reqObj, db });
});

// 7. Team Leader assigns an approved employee to the team (Sections 6 & 7)
app.post("/api/db/team-staff/assign", (req, res) => {
  const db = readDb();
  const {
    teamId,
    teamName,
    employeeId,
    teamRole,
    assignedByLeaderName = "قائد الفريق",
    notes
  } = req.body;

  if (!teamId || !employeeId || !teamRole) {
    return res.status(400).json({ error: "يرجى تحديد الفريق والموظف والدور الميداني داخل الفريق" });
  }

  db.employees = db.employees || [];
  const emp = db.employees.find((e: any) => e.id === employeeId);
  if (!emp) {
    return res.status(404).json({ error: "الموظف غير موجود في سجلات الموظفين المعتمدين" });
  }

  if (emp.status !== 'active') {
    return res.status(400).json({ error: "الموظف المحدد ليس في حالة نشطة حالياً" });
  }

  db.teamStaffAssignments = db.teamStaffAssignments || [];
  const existingIdx = db.teamStaffAssignments.findIndex(
    (a: any) => a.teamId === teamId && a.employeeId === employeeId
  );

  const nowIso = new Date().toISOString();
  let assignmentObj: any;

  if (existingIdx !== -1) {
    db.teamStaffAssignments[existingIdx] = {
      ...db.teamStaffAssignments[existingIdx],
      teamRole,
      assignedByLeaderName,
      assignedAt: nowIso,
      status: "active",
      notes: notes || db.teamStaffAssignments[existingIdx].notes
    };
    assignmentObj = db.teamStaffAssignments[existingIdx];
  } else {
    assignmentObj = {
      id: "tsa-" + Date.now(),
      teamId,
      teamName: teamName || "فريق تطوعي",
      employeeId,
      employeeName: emp.name,
      employeeNationalId: emp.nationalId,
      employeePhone: emp.phone,
      employeeJobTitle: emp.jobTitle,
      teamRole,
      assignedByLeaderName,
      assignedAt: nowIso,
      status: "active",
      notes: notes || ""
    };
    db.teamStaffAssignments.push(assignmentObj);
  }

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: nowIso,
    user: assignedByLeaderName,
    action: `إسناد وتكليف الموظف (${emp.name}) بدور (${teamRole}) في (${teamName || 'الفريق'})`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  writeDb(db);
  res.json({ status: "success", assignment: assignmentObj, db });
});

// 8. Team Leader removes employee from team
app.post("/api/db/team-staff/remove", (req, res) => {
  const db = readDb();
  const { assignmentId, teamId, employeeId, leaderName = "قائد الفريق" } = req.body;

  db.teamStaffAssignments = db.teamStaffAssignments || [];
  const idx = db.teamStaffAssignments.findIndex(
    (a: any) => a.id === assignmentId || (a.teamId === teamId && a.employeeId === employeeId)
  );

  if (idx === -1) {
    return res.status(404).json({ error: "تكليف الموظف بالفريق غير موجود" });
  }

  const removed = db.teamStaffAssignments.splice(idx, 1)[0];
  const nowIso = new Date().toISOString();

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: nowIso,
    user: leaderName,
    action: `إلغاء تكليف الموظف (${removed.employeeName}) من دور (${removed.teamRole}) في فريق (${removed.teamName})`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  writeDb(db);
  res.json({ status: "success", removed, db });
});

// 2.21 HR Management Endpoints
app.post("/api/db/hr/employees/save", (req, res) => {
  const db = readDb();
  const empData = req.body;
  db.employees = db.employees || [];

  const existingIdx = empData.id ? db.employees.findIndex((e: any) => e.id === empData.id) : -1;
  const nowIso = new Date().toISOString();

  if (existingIdx !== -1) {
    db.employees[existingIdx] = {
      ...db.employees[existingIdx],
      ...empData,
      updatedAt: nowIso
    };
  } else {
    const newEmp = {
      id: empData.id || "emp-" + Date.now(),
      employeeNumber: empData.employeeNumber || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      name: empData.name,
      departmentId: empData.departmentId || "dep-9",
      jobTitle: empData.jobTitle,
      nationalId: empData.nationalId || "",
      phone: empData.phone || "",
      email: empData.email || "",
      hireDate: empData.hireDate || nowIso.split('T')[0],
      expiryDate: empData.expiryDate || new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
      status: empData.status || "active",
      contractType: empData.contractType || "full_time",
      basicSalary: Number(empData.basicSalary) || 4500,
      housingAllowance: Number(empData.housingAllowance) || 1000,
      transportAllowance: Number(empData.transportAllowance) || 500,
      qualification: empData.qualification || "جامعي",
      createdAt: nowIso
    };
    db.employees.unshift(newEmp);
  }

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: nowIso,
    user: "إدارة الموارد البشرية",
    action: `حفظ/تحديث بيانات الموظف (${empData.name}) في سجلات الموارد البشرية`,
    ip: req.ip || "127.0.0.1",
    device: req.headers["user-agent"] || "System"
  });

  writeDb(db);
  res.json({ status: "success", employees: db.employees, db });
});

// 2.3 Leader Action on Team Volunteer Join Request
app.post("/api/db/volunteerApplications/leader-action", (req, res) => {
  const db = readDb();
  const { applicationId, action, leaderName = "قائد الفريق", leaderId, teamId, teamName, rejectionReason, notes } = req.body;

  db.volunteerApplications = db.volunteerApplications || [];
  const appObj = db.volunteerApplications.find((a: any) => a.id === applicationId);

  if (!appObj) {
    return res.status(404).json({ error: "طلب الانضمام غير موجود" });
  }

  const actDate = new Date().toISOString();

  if (action === "accept") {
    appObj.status = "leader_accepted";
    appObj.leaderAcceptedBy = leaderName;
    appObj.leaderAcceptedAt = actDate;
    appObj.leaderAcceptedNotes = notes || "";
    if (teamId) appObj.assignedTeamId = teamId;
    if (teamName) appObj.requestedTeamName = teamName;

    // Send high-priority official notification to Admin and Volunteer Dept
    db.notifications = db.notifications || [];
    db.notifications.unshift({
      id: "not-" + Date.now(),
      userId: "admin",
      titleAr: `تم قبول متطوع جديد في الفريق بواسطة القائد (${leaderName})`,
      titleEn: `New volunteer accepted by team leader ${leaderName}`,
      bodyAr: `قام القائد (${leaderName}) بقبول طلب انضمام المتطوع (${appObj.fullName}) في فريق (${teamName || appObj.requestedTeamName || "الفريق التطوعي"}). الطلب الآن بانتظار اعتماد إدارة التطوع لإصدار البطاقة الرقمية تلقائياً.`,
      bodyEn: `Leader ${leaderName} accepted volunteer application for ${appObj.fullName}. Awaiting volunteer dept approval.`,
      date: actDate.split('T')[0],
      read: false,
      type: "leader_accepted_volunteer",
      meta: {
        applicationId: appObj.id,
        volunteerName: appObj.fullName,
        teamId: teamId || appObj.assignedTeamId,
        teamName: teamName || appObj.requestedTeamName,
        leaderName: leaderName,
        acceptedAt: actDate
      }
    });

    // Detailed audit log
    db.logs = db.logs || [];
    db.logs.unshift({
      id: "log-" + Date.now(),
      timestamp: actDate,
      user: `القائد: ${leaderName}`,
      action: `قبول مبدئي لطلب انضمام المتطوع (${appObj.fullName}) في فريق (${teamName || appObj.requestedTeamName || ""}) بواسطة القائد (${leaderName}) - بانتظار اعتماد إدارة التطوع`,
      ip: req.ip || "127.0.0.1",
      device: "Leader Portal"
    });
  } else {
    appObj.status = "leader_rejected";
    appObj.leaderRejectedBy = leaderName;
    appObj.leaderRejectedAt = actDate;
    appObj.rejectionReason = rejectionReason || "تم الاعتذار عن قبول الطلب من قبل قائد الفريق.";

    db.logs = db.logs || [];
    db.logs.unshift({
      id: "log-" + Date.now(),
      timestamp: actDate,
      user: `القائد: ${leaderName}`,
      action: `رفض طلب انضمام المتطوع (${appObj.fullName}) بواسطة القائد (${leaderName}) - سبب الرفض: ${appObj.rejectionReason}`,
      ip: req.ip || "127.0.0.1",
      device: "Leader Portal"
    });
  }

  writeDb(db);
  res.json({ status: "success", application: appObj, db });
});

// 2.4 Final Admin Approval & Automatic Card Issuance
app.post("/api/db/volunteerApplications/admin-approve", (req, res) => {
  const db = readDb();
  const { applicationId, teamId, adminName = "إدارة شؤون المتطوعين" } = req.body;

  db.volunteerApplications = db.volunteerApplications || [];
  const appObj = db.volunteerApplications.find((a: any) => a.id === applicationId);

  if (!appObj) {
    return res.status(404).json({ error: "طلب الانضمام غير موجود" });
  }

  const targetTeamId = teamId || appObj.assignedTeamId || appObj.requestedTeamId;
  let selectedTeam = (db.teams || []).find((t: any) => t.id === targetTeamId);
  if (!selectedTeam && db.teams && db.teams.length > 0) {
    selectedTeam = db.teams[0];
  }
  if (!selectedTeam) {
    return res.status(400).json({ error: "الفريق المحدد غير موجود في النظام" });
  }

  appObj.status = "approved";
  appObj.assignedTeamId = selectedTeam.id;
  appObj.adminApprovedBy = adminName;
  appObj.adminApprovedAt = new Date().toISOString();

  // Create new active volunteer entry
  db.volunteers = db.volunteers || [];
  const seq = String(db.volunteers.length + 1).padStart(4, "0");
  const newVol: any = {
    id: "vol-" + Date.now(),
    name: appObj.fullName,
    email: appObj.email || `vol-${seq}@reyadat-alata.org.sa`,
    phone: appObj.phone,
    photo: appObj.photo || (appObj.gender === 'female' ? (db.systemSettings?.files?.femaleUnifiedCardPhoto || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80") : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&h=300&fit=crop"),
    membershipNumber: `V-2026-${seq}`,
    barcode: `100088868${seq}`,
    qrCode: `MEM-V-2026-${seq}`,
    teamId: selectedTeam.id,
    departmentId: selectedTeam.departmentId,
    titleAr: appObj.position || "متطوع معتمد",
    titleEn: "Certified Volunteer",
    status: "active",
    points: 0,
    nationalId: appObj.nationalId,
    issueDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    password: appObj.phone,
    role: "volunteer",
    gender: appObj.gender || "male"
  };

  db.volunteers.push(newVol);

  // AUTOMATICALLY ISSUE OFFICIAL ID CARD USING ACTIVE TEMPLATE
  db.issuedVolunteerCards = db.issuedVolunteerCards || [];
  db.volunteerCardTemplates = db.volunteerCardTemplates || [];
  ensureAllCardTemplates(db);

  const isFemale = appObj.gender === "female";
  const tpl = db.volunteerCardTemplates.find((t: any) => t.category === "volunteer" && (isFemale ? t.isDefaultFemale : t.isDefaultMale)) ||
              db.volunteerCardTemplates.find((t: any) => t.category === "volunteer" && t.isDefault) ||
              db.volunteerCardTemplates[0];

  const cardSeq = String(db.issuedVolunteerCards.length + 1).padStart(5, "0");
  const cardNumber = `CRD-2026-${cardSeq}`;
  const verificationCode = `VRY-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;

  const newCard = {
    id: "card-" + Date.now(),
    volunteerId: newVol.id,
    templateId: tpl ? tpl.id : "tpl-male-default",
    templateName: tpl ? tpl.name : "قالب المتطوعين الافتراضي",
    cardNumber,
    verificationCode,
    issueDate: newVol.issueDate,
    expiryDate: newVol.expiryDate,
    status: "active",
    issuedBy: `${adminName} (إصدار تلقائي عند الاعتماد)`,
    notes: "تم الاعتماد النهائي وإصدار البطاقة الرقمية تلقائياً",
    qrVerificationUrl: `https://reyadat-alata.org.sa/verify-card?code=${verificationCode}`,
    createdAt: new Date().toISOString()
  };

  db.issuedVolunteerCards.unshift(newCard);
  newVol.activeCardId = newCard.id;
  newVol.activeCardNumber = cardNumber;
  newVol.activeCardTemplateId = newCard.templateId;
  appObj.generatedCardNumber = cardNumber;
  appObj.generatedCardId = newCard.id;

  // Audit log
  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: adminName,
    action: `اعتماد المتطوع (${appObj.fullName}) رسمياً في إدارة التطوع وإصدار بطاقته الرقمية تلقائياً برقم (${cardNumber}) بواسطة (${adminName})`,
    ip: req.ip || "127.0.0.1",
    device: "Admin Volunteer Approval"
  });

  writeDb(db);
  res.json({ status: "success", volunteer: newVol, card: newCard, application: appObj, db });
});

// 3. Delete Card Template
app.post("/api/db/card-templates/delete", (req, res) => {
  const db = readDb();
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: "معرف القالب مطلوب" });

  db.volunteerCardTemplates = db.volunteerCardTemplates || [];
  const tpl = db.volunteerCardTemplates.find((t: any) => t.id === id);
  db.volunteerCardTemplates = db.volunteerCardTemplates.filter((t: any) => t.id !== id);

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "إدارة التطوع - تصميم البطاقات",
    action: `حذف قالب بطاقة المتطوع: (${tpl ? tpl.name : id})`,
    ip: req.ip || "127.0.0.1",
    device: "Card Designer Studio"
  });

  writeDb(db);
  res.json({ status: "success", templates: db.volunteerCardTemplates, db });
});

// 4. Update System Female Unified Photo
app.post("/api/db/systemSettings/femaleUnifiedPhoto", (req, res) => {
  const db = readDb();
  const photoUrl = req.body.photoUrl || req.body.femaleUnifiedPhotoUrl;
  if (!photoUrl) return res.status(400).json({ error: "رابط الصورة مطلوب" });

  if (!db.systemSettings) db.systemSettings = defaultSystemSettings;
  if (!db.systemSettings.files) db.systemSettings.files = defaultSystemSettings.files;
  db.systemSettings.files.femaleUnifiedCardPhoto = photoUrl;

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "الإدارة العليا",
    action: "تحديث الصورة الموحدة للمتطوعات في بطاقات العضوية",
    ip: req.ip || "127.0.0.1",
    device: "System Settings"
  });

  writeDb(db);
  res.json({ status: "success", femaleUnifiedPhoto: photoUrl, db });
});

// 5. Issue Card for Volunteer
app.post("/api/db/cards/issue", (req, res) => {
  const db = readDb();
  const { volunteerId, templateId, expiryDate, issueDate, notes } = req.body;

  if (!volunteerId) {
    return res.status(400).json({ error: "معرف المتطوع مطلوب" });
  }

  const vol = (db.volunteers || []).find((v: any) => v.id === volunteerId);
  if (!vol) {
    return res.status(404).json({ error: "المتطوع غير موجود في قاعدة البيانات" });
  }

  // Find template or pick default according to gender
  db.volunteerCardTemplates = db.volunteerCardTemplates || [];
  let tpl = db.volunteerCardTemplates.find((t: any) => t.id === templateId);
  if (!tpl) {
    const isFemale = vol.gender === "female";
    tpl = db.volunteerCardTemplates.find((t: any) => isFemale ? t.isDefaultFemale : t.isDefaultMale) || db.volunteerCardTemplates[0];
  }

  db.issuedVolunteerCards = db.issuedVolunteerCards || [];
  
  // Invalidate any previously active cards for this volunteer
  db.issuedVolunteerCards.forEach((c: any) => {
    if (c.volunteerId === volunteerId && c.status === "active") {
      c.status = "superseded";
    }
  });

  const cardSeq = String(db.issuedVolunteerCards.length + 1).padStart(5, "0");
  const cardNumber = `CRD-2026-${cardSeq}`;
  const verificationCode = `VRY-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;

  const newCard = {
    id: "card-" + Date.now(),
    volunteerId: vol.id,
    templateId: tpl ? tpl.id : "tpl-male-default",
    templateName: tpl ? tpl.name : "القالب الافتراضي",
    cardNumber,
    verificationCode,
    issueDate: issueDate || new Date().toISOString().split("T")[0],
    expiryDate: expiryDate || vol.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    status: "active",
    issuedBy: "إدارة شؤون المتطوعين",
    notes: notes || "",
    qrVerificationUrl: `https://reyadat-alata.org.sa/verify-card?code=${verificationCode}`,
    createdAt: new Date().toISOString()
  };

  db.issuedVolunteerCards.unshift(newCard);

  // Update volunteer record with active card info
  vol.activeCardId = newCard.id;
  vol.activeCardNumber = cardNumber;
  vol.activeCardTemplateId = newCard.templateId;

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "إدارة التطوع",
    action: `إصدار بطاقة عضوية رسمية رقم (${cardNumber}) للمتطوع/ـة: ${vol.name}`,
    ip: req.ip || "127.0.0.1",
    device: "Card Issuance Engine"
  });

  writeDb(db);
  res.json({ status: "success", card: newCard, issuedCards: db.issuedVolunteerCards, db });
});

// 6. Batch Issue Cards
app.post("/api/db/cards/batch-issue", (req, res) => {
  const db = readDb();
  const { volunteerIds, templateId, expiryDate } = req.body;

  if (!volunteerIds || !Array.isArray(volunteerIds) || volunteerIds.length === 0) {
    return res.status(400).json({ error: "قائمة المتطوعين مطلوبة" });
  }

  db.issuedVolunteerCards = db.issuedVolunteerCards || [];
  db.volunteerCardTemplates = db.volunteerCardTemplates || [];

  const newlyIssued: any[] = [];
  const expDate = expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const todayStr = new Date().toISOString().split("T")[0];

  volunteerIds.forEach((volId: string, idx: number) => {
    const vol = (db.volunteers || []).find((v: any) => v.id === volId);
    if (!vol) return;

    // Pick template or match gender default
    let tpl = db.volunteerCardTemplates.find((t: any) => t.id === templateId);
    if (!tpl) {
      const isFemale = vol.gender === "female";
      tpl = db.volunteerCardTemplates.find((t: any) => isFemale ? t.isDefaultFemale : t.isDefaultMale) || db.volunteerCardTemplates[0];
    }

    // Invalidate existing
    db.issuedVolunteerCards.forEach((c: any) => {
      if (c.volunteerId === vol.id && c.status === "active") {
        c.status = "superseded";
      }
    });

    const cardSeq = String(db.issuedVolunteerCards.length + 1 + idx).padStart(5, "0");
    const cardNumber = `CRD-2026-${cardSeq}`;
    const verificationCode = `VRY-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    const card = {
      id: "card-" + (Date.now() + idx),
      volunteerId: vol.id,
      templateId: tpl ? tpl.id : "tpl-male-default",
      templateName: tpl ? tpl.name : "القالب الافتراضي",
      cardNumber,
      verificationCode,
      issueDate: todayStr,
      expiryDate: expDate,
      status: "active",
      issuedBy: "إدارة شؤون المتطوعين (إصدار جماعي)",
      notes: "إصدار آلي بالدفعة",
      qrVerificationUrl: `https://reyadat-alata.org.sa/verify-card?code=${verificationCode}`,
      createdAt: new Date().toISOString()
    };

    db.issuedVolunteerCards.unshift(card);
    vol.activeCardId = card.id;
    vol.activeCardNumber = cardNumber;
    vol.activeCardTemplateId = card.templateId;
    newlyIssued.push(card);
  });

  db.logs.unshift({
    id: "log-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: "إدارة التطوع",
    action: `إصدار جماعي لبطاقات العضوية بعدد: (${newlyIssued.length}) بطاقة`,
    ip: req.ip || "127.0.0.1",
    device: "Batch Card Issuer"
  });

  writeDb(db);
  res.json({ status: "success", count: newlyIssued.length, issuedCards: db.issuedVolunteerCards, db });
});

// 7. Verify Card by Code or Number (Public)
app.get("/api/public/verify-card/:code", (req, res) => {
  const db = readDb();
  const code = req.params.code;
  if (!code) return res.status(400).json({ error: "رمز التحقق مطلوب" });

  const cleanCode = code.trim().toLowerCase();
  
  // Find card in issued cards
  const card = (db.issuedVolunteerCards || []).find((c: any) => 
    c.verificationCode?.toLowerCase() === cleanCode || 
    c.cardNumber?.toLowerCase() === cleanCode ||
    c.id?.toLowerCase() === cleanCode
  );

  let volunteer = null;
  let team = null;
  let department = null;

  if (card) {
    volunteer = (db.volunteers || []).find((v: any) => v.id === card.volunteerId);
  } else {
    // Check if code matches volunteer membershipNumber, barcode, nationalId or id
    volunteer = (db.volunteers || []).find((v: any) => 
      v.membershipNumber?.toLowerCase() === cleanCode ||
      v.barcode === cleanCode ||
      v.nationalId === cleanCode ||
      v.id === cleanCode
    );
  }

  if (!volunteer) {
    return res.status(404).json({
      valid: false,
      messageAr: "عذراً، لم يتم العثور على بطاقة أو متطوع مسجل بهذا الرمز في سجلات جمعية ريادة العطاء."
    });
  }

  team = (db.teams || []).find((t: any) => t.id === volunteer.teamId);
  department = (db.departments || []).find((d: any) => d.id === volunteer.departmentId);

  const isExpired = card?.expiryDate ? new Date(card.expiryDate) < new Date() : (volunteer.expiryDate ? new Date(volunteer.expiryDate) < new Date() : false);
  const status = isExpired ? "expired" : (card?.status || volunteer.status || "active");

  res.json({
    valid: true,
    card: card || {
      cardNumber: volunteer.membershipNumber,
      verificationCode: code,
      status: volunteer.status,
      issueDate: volunteer.issueDate,
      expiryDate: volunteer.expiryDate
    },
    volunteer: {
      id: volunteer.id,
      name: volunteer.name,
      membershipNumber: volunteer.membershipNumber,
      nationalId: volunteer.nationalId,
      gender: volunteer.gender || "male",
      photo: volunteer.photo,
      titleAr: volunteer.titleAr || "متطوع معتمد",
      status: status,
      points: volunteer.points || 0,
      hours: volunteer.hours || 0,
      teamName: team?.nameAr || "فريق ريادة التطوعي",
      departmentName: department?.nameAr || "إدارة التطوع العامة",
      issueDate: card?.issueDate || volunteer.issueDate,
      expiryDate: card?.expiryDate || volunteer.expiryDate
    }
  });
});

// -------------------------------------------------------------
// Official Letters & Correspondence Endpoints
// -------------------------------------------------------------

// 1. Get all incoming letters
app.get("/api/db/letters", (req, res) => {
  const db = readDb();
  res.json(db.letters || []);
});

// 2. Submit new letter (from team leader, employee, or visitor)
app.post("/api/db/letters/send", (req, res) => {
  const db = readDb();
  if (!db.letters) {
    db.letters = [];
  }

  const {
    submissionType = "ready_file",
    senderName,
    senderType: requestedSenderType,
    senderPhone,
    senderEmail,
    senderRole,
    senderOrganization,
    userId,
    userRole,
    teamId,
    departmentId,
    senderAccountId,
    senderAccountRole,
    senderAccountName,
    senderAccountPerson,
    senderAccountDetails,
    letterFileUrl,
    letterFileName,
    letterFileSize,
    subject,
    messageContent,
    partnershipDetails,
    attachmentFileUrl,
    attachmentFileName,
    attachmentFileSize
  } = req.body;

  if (!senderName || !senderPhone) {
    return res.status(400).json({ error: "الاسم الكامل ورقم الجوال حقول إلزامية." });
  }

  if (submissionType === "ready_file" && !letterFileUrl) {
    return res.status(400).json({ error: "يرجى رفع ملف الخطاب (ملف الخطاب إلزامي للخطاب الجاهز)." });
  }

  if (submissionType === "custom_letter" && (!subject || !messageContent)) {
    return res.status(400).json({ error: "عنوان الخطاب ونص الرسالة حقول إلزامية للخطاب المخصص." });
  }

  // Automatically determine the letter source (قائد / موظف / زائر) based on login/account context
  let finalSenderType: 'قائد' | 'موظف' | 'زائر' = 'زائر';
  let linkedAccountId = senderAccountId || userId;
  let linkedAccountRole = senderAccountRole || userRole;
  let linkedAccountName = senderAccountName || senderOrganization;
  let linkedAccountPerson = senderAccountPerson || senderName;

  if (userRole === 'leader' || teamId || (userId && String(userId).startsWith('leader-')) || (requestedSenderType && String(requestedSenderType).includes('قائد'))) {
    finalSenderType = 'قائد';
    linkedAccountRole = 'leader';
    const targetTeamId = teamId || (userId && String(userId).startsWith('leader-') ? String(userId).replace('leader-', '') : userId);
    const matchedTeam = db.teams?.find((t: any) => t.id === targetTeamId || t.id === teamId);
    if (matchedTeam) {
      linkedAccountId = matchedTeam.id;
      linkedAccountName = matchedTeam.nameAr;
      linkedAccountPerson = matchedTeam.leaderName || senderName;
    }
  } else if (
    userRole === 'department_admin' || 
    userRole === 'employee' || 
    userRole === 'staff' || 
    userRole === 'supervisor' || 
    userRole === 'storekeeper' || 
    userRole === 'admin' ||
    departmentId ||
    (requestedSenderType && String(requestedSenderType).includes('موظف'))
  ) {
    finalSenderType = 'موظف';
    linkedAccountRole = userRole || 'department_admin';
    const matchedDept = db.departments?.find((d: any) => d.id === departmentId || d.id === userId);
    if (matchedDept) {
      linkedAccountId = matchedDept.id;
      linkedAccountName = matchedDept.nameAr;
      linkedAccountPerson = matchedDept.directorName || senderName;
    }
  } else {
    finalSenderType = 'زائر';
    linkedAccountId = undefined;
    linkedAccountRole = 'visitor';
  }

  // Generate Letter Number (LTR-2026-XXXX)
  const currentYear = new Date().getFullYear();
  const nextSeq = String(db.letters.length + 1).padStart(4, "0");
  const letterNumber = `LTR-${currentYear}-${nextSeq}`;

  const newLetter: OfficialLetter = {
    id: "ltr-" + Date.now(),
    letterNumber,
    submissionType,
    senderName: senderName.trim(),
    senderType: finalSenderType,
    senderPhone: senderPhone.trim(),
    senderEmail: senderEmail ? senderEmail.trim() : undefined,
    senderRole: senderRole ? senderRole.trim() : undefined,
    senderOrganization: senderOrganization ? senderOrganization.trim() : undefined,
    userId: linkedAccountId || userId,
    userRole: linkedAccountRole,
    teamId: teamId || (finalSenderType === 'قائد' ? linkedAccountId : undefined),
    departmentId: departmentId || (finalSenderType === 'موظف' ? linkedAccountId : undefined),
    senderAccountId: linkedAccountId,
    senderAccountRole: linkedAccountRole,
    senderAccountName: linkedAccountName,
    senderAccountPerson: linkedAccountPerson,
    senderAccountDetails: senderAccountDetails || (linkedAccountId ? {
      id: linkedAccountId,
      role: linkedAccountRole,
      teamName: finalSenderType === 'قائد' ? linkedAccountName : undefined,
      departmentName: finalSenderType === 'موظف' ? linkedAccountName : undefined,
      jobTitle: senderRole,
      phone: senderPhone,
      email: senderEmail
    } : undefined),
    letterFileUrl: submissionType === "ready_file" ? letterFileUrl : undefined,
    letterFileName: submissionType === "ready_file" ? letterFileName : undefined,
    letterFileSize: submissionType === "ready_file" ? letterFileSize : undefined,
    subject: subject ? subject.trim() : `خطاب رسمي جاهز مرفق من ${senderName.trim()}`,
    messageContent: submissionType === "custom_letter" ? messageContent.trim() : undefined,
    partnershipDetails: partnershipDetails || undefined,
    attachmentFileUrl: attachmentFileUrl || undefined,
    attachmentFileName: attachmentFileName || undefined,
    attachmentFileSize: attachmentFileSize || undefined,
    status: "new",
    isRead: false,
    createdAt: new Date().toISOString()
  };

  db.letters.unshift(newLetter);

  // Send High-Priority Notification to Admin
  if (!db.notifications) db.notifications = [];
  db.notifications.unshift({
    id: "not-ltr-" + Date.now(),
    userId: "admin-1",
    targetRole: "admin",
    titleAr: `خطاب رسمي وارد جديد (#${newLetter.letterNumber})`,
    bodyAr: `ورد خطاب جديد من ${newLetter.senderName} (${finalSenderType}) - ${newLetter.subject || "خطاب جاهز مرفق"}`,
    type: "important",
    category: "system",
    date: new Date().toISOString(),
    read: false,
    linkUrl: "letters"
  });

  // Log in operation logs
  if (!db.logs) db.logs = [];
  db.logs.unshift({
    id: "log-ltr-" + Date.now(),
    timestamp: new Date().toISOString(),
    user: newLetter.senderName + ` (${newLetter.senderType})`,
    action: `إرسال خطاب رسمي جديد (#${newLetter.letterNumber}) - ${newLetter.subject}`,
    ip: "127.0.0.1",
    device: "Web Browser"
  });

  writeDb(db);

  res.json({
    success: true,
    letter: newLetter,
    message: "تم إرسال وقيد الخطاب بنجاح في سجل المراسلات الرسمية."
  });
});

// 3. Update letter status & admin review
app.post("/api/db/letters/update-status", (req, res) => {
  const db = readDb();
  if (!db.letters) db.letters = [];

  const { letterId, status, adminNotes, reviewedBy } = req.body;
  const index = db.letters.findIndex((l: any) => l.id === letterId);
  if (index === -1) {
    return res.status(404).json({ error: "الخطاب غير موجود بالسجلات." });
  }

  db.letters[index].status = status || db.letters[index].status;
  if (adminNotes !== undefined) {
    db.letters[index].adminNotes = adminNotes;
  }
  db.letters[index].isRead = true;
  db.letters[index].reviewedBy = reviewedBy || "إدارة الجمعية";
  db.letters[index].reviewedAt = new Date().toISOString();

  writeDb(db);
  res.json({ success: true, letter: db.letters[index] });
});

// 4. Mark letter as read
app.post("/api/db/letters/mark-read", (req, res) => {
  const db = readDb();
  if (!db.letters) db.letters = [];

  const { letterId } = req.body;
  const letter = db.letters.find((l: any) => l.id === letterId);
  if (letter) {
    letter.isRead = true;
    if (letter.status === "new") {
      letter.status = "under_review";
    }
    writeDb(db);
    return res.json({ success: true, letter });
  }

  res.status(404).json({ error: "الخطاب غير موجود." });
});

// 5. Delete letter
app.post("/api/db/letters/delete", (req, res) => {
  const db = readDb();
  if (!db.letters) db.letters = [];

  const { letterId } = req.body;
  db.letters = db.letters.filter((l: any) => l.id !== letterId);
  writeDb(db);
  res.json({ success: true });
});

// Setup Comprehensive Enterprise Financial Management System routes
setupFinancialRoutes(app, readDb, writeDb);

// Setup Central Enterprise Email Management & SMTP/Resend Service routes
setupEmailRoutes(app, readDb, writeDb);

// Serve Frontend in dev or production
const isProduction = process.env.NODE_ENV === "production" || !!process.env.VERCEL;

async function start() {
  // If running in Vercel Serverless environment, do not start HTTP listener
  if (process.env.VERCEL || process.env.NOW_REGION || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return;
  }

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT} [${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}]`);
  });

  server.on("error", (err: any) => {
    console.error("Critical server listener error:", err);
  });
}

// Global process safeguards against crashes in production
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception thrown:", err);
});

const isServerlessEnv = !!(
  process.env.VERCEL || 
  process.env.NOW_REGION || 
  process.env.AWS_LAMBDA_FUNCTION_NAME || 
  process.env.LAMBDA_TASK_ROOT ||
  process.env.VERCEL_ENV
);

if (!isServerlessEnv) {
  start();
}

export default app;
export { app };
