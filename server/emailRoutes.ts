import type { Express, Request, Response } from "express";
import {
  sendCentralEmail,
  getEmailConfig,
  getSanitizedEmailConfig,
  getStandardResendDnsRecords,
  checkLiveDnsRecords,
  fetchResendDomainsList,
  fetchResendDomainDetails,
  createResendDomainRecord,
  triggerResendDomainVerification,
  translateEmailError
} from "./emailService";

export function setupEmailRoutes(
  app: Express,
  readDb: () => any,
  writeDb: (db: any) => void
) {
  // 1. Get Sanitized Email Settings
  app.get("/api/db/email-settings", (req: Request, res: Response) => {
    try {
      const db = readDb();
      const sanitized = getSanitizedEmailConfig(db);
      res.json({
        success: true,
        settings: sanitized,
        logsCount: (db.emailLogs || []).length
      });
    } catch (err: any) {
      console.error("Error fetching email settings:", err);
      res.status(500).json({ error: "فشل استرجاع إعدادات البريد الإلكتروني." });
    }
  });

  // 2. Save Email Settings Securely
  app.post("/api/db/email-settings/save", (req: Request, res: Response) => {
    try {
      const db = readDb();
      const incoming = req.body || {};

      db.emailSettings = db.emailSettings || {};

      // Provider
      if (incoming.provider) {
        db.emailSettings.provider = incoming.provider;
      }

      // Sender identity: enforce riadataleata.com domain
      let noticeMsg = "";
      if (incoming.senderName !== undefined) {
        db.emailSettings.senderName = incoming.senderName.trim();
      }
      
      if (incoming.senderEmail !== undefined) {
        let sEmail = incoming.senderEmail.trim();
        if (/@(gmail|yahoo|hotmail|outlook)\.com$/i.test(sEmail)) {
          sEmail = "notifications@riadataleata.com";
          noticeMsg = " (تنبيه: تم تحويل المرسل تلقائياً إلى بريد النطاق الرسمي notifications@riadataleata.com لأن سياسات DMARC تمنع إرسال Gmail من خوادم سحابية)";
        }
        db.emailSettings.senderEmail = sEmail;
      }

      if (incoming.replyToEmail !== undefined) {
        db.emailSettings.replyToEmail = incoming.replyToEmail.trim() || "riadataleata@gmail.com";
      } else if (incoming.replyTo !== undefined) {
        db.emailSettings.replyToEmail = incoming.replyTo.trim() || "riadataleata@gmail.com";
      }

      // Resend API Key: Only update if a genuine new key is provided (not empty and not masked)
      if (incoming.resendApiKey !== undefined) {
        const rawKey = incoming.resendApiKey.trim();
        if (rawKey && !rawKey.includes("••••")) {
          db.emailSettings.resendApiKey = rawKey;
        } else if (rawKey === "") {
          // If explicitly cleared
          db.emailSettings.resendApiKey = "";
        }
      }

      // SMTP Server settings
      const smtpHost = incoming.smtpHost !== undefined ? incoming.smtpHost : incoming.smtp?.host;
      if (smtpHost !== undefined) {
        db.emailSettings.smtpHost = String(smtpHost).trim();
      }

      const smtpPort = incoming.smtpPort !== undefined ? incoming.smtpPort : incoming.smtp?.port;
      if (smtpPort !== undefined) {
        db.emailSettings.smtpPort = Number(smtpPort) || 587;
      }

      const smtpSecure = incoming.smtpSecure !== undefined ? incoming.smtpSecure : incoming.smtp?.secure;
      if (smtpSecure !== undefined) {
        db.emailSettings.smtpSecure = Boolean(smtpSecure);
      }

      const smtpUser = incoming.smtpUser !== undefined ? incoming.smtpUser : incoming.smtp?.user;
      if (smtpUser !== undefined) {
        db.emailSettings.smtpUser = String(smtpUser).trim();
      }

      // SMTP Password
      const rawSmtpPass = incoming.smtpPassword !== undefined ? incoming.smtpPassword : incoming.smtp?.pass;
      if (rawSmtpPass !== undefined) {
        const passStr = String(rawSmtpPass).trim();
        if (passStr && !passStr.includes("••••")) {
          db.emailSettings.smtpPassword = passStr;
        } else if (passStr === "") {
          db.emailSettings.smtpPassword = "";
        }
      }

      // Flags
      if (incoming.enabled !== undefined) {
        db.emailSettings.enabled = Boolean(incoming.enabled);
      }
      if (incoming.enableAutoFallback !== undefined) {
        db.emailSettings.enableAutoFallback = Boolean(incoming.enableAutoFallback);
      }
      if (incoming.testRecipientEmail !== undefined) {
        db.emailSettings.testRecipientEmail = incoming.testRecipientEmail.trim();
      }

      db.emailSettings.updatedAt = new Date().toISOString();
      db.emailSettings.updatedBy = incoming.updatedBy || "مسؤول النظام";

      // Audit Log
      db.logs = db.logs || [];
      db.logs.unshift({
        id: "log-" + Date.now(),
        timestamp: new Date().toISOString(),
        user: incoming.updatedBy || "مسؤول النظام",
        action: "تحديث إعدادات البريد الإلكتروني وخوادم Resend للنطاق riadataleata.com",
        ip: req.ip || "127.0.0.1",
        device: req.headers["user-agent"] || "Web Dashboard"
      });

      writeDb(db);

      const sanitized = getSanitizedEmailConfig(db);
      res.json({
        success: true,
        message: "تم حفظ إعدادات البريد الإلكتروني بنجاح." + noticeMsg,
        settings: sanitized
      });
    } catch (err: any) {
      console.error("Error saving email settings:", err);
      res.status(500).json({ error: "فشل حفظ إعدادات البريد الإلكتروني: " + err.message });
    }
  });

  // 3. Send Real Test Email
  app.post("/api/db/email/test", async (req: Request, res: Response) => {
    try {
      const db = readDb();
      const config = getEmailConfig(db);
      const recipient = (req.body.recipientEmail && req.body.recipientEmail.trim()) || 
        (req.body.to && req.body.to.trim()) || 
        config.testRecipientEmail || "riadataleata@gmail.com";

      if (!recipient || !recipient.includes("@")) {
        return res.status(400).json({ error: "يرجى تحديد عنوان بريد إلكتروني صالح للمستلم." });
      }

      // If user passed a temporary config override to test before saving
      let testDb = db;
      if (req.body.tempSettings) {
        testDb = {
          ...db,
          emailSettings: {
            ...db.emailSettings,
            ...req.body.tempSettings
          }
        };
      }

      const requestedLang = req.body.lang || req.body.language || 'ar';

      const sendResult = await sendCentralEmail(testDb, {
        to: recipient,
        recipientName: "المسؤول / المشرف العام",
        subject: requestedLang === 'en' 
          ? "Reyadat Al-Ata Association - Live Email System Test"
          : (requestedLang === 'fr' 
            ? "Association Reyadat Al-Ata - Test du système de messagerie" 
            : "اختبار نظام البريد الإلكتروني الحقيقي - جمعية ريادة العطاء"),
        templateType: "test_email",
        lang: requestedLang,
        templateData: {
          recipientName: "مدير النظام",
          providerName: config.provider || "خدمة Resend الرسمية"
        }
      });

      // Save database since sendCentralEmail added to db.emailLogs
      writeDb(testDb);

      const latestLog = (testDb.emailLogs || [])[0];

      if (sendResult.success) {
        return res.json({
          success: true,
          message: `تم إرسال البريد الاختباري بنجاح عبر (${sendResult.provider.toUpperCase()}) إلى ${recipient}`,
          provider: sendResult.provider,
          messageId: sendResult.messageId,
          durationMs: sendResult.durationMs,
          log: latestLog
        });
      } else {
        return res.status(400).json({
          success: false,
          error: sendResult.error || "فشل إرسال البريد الاختباري.",
          provider: sendResult.provider,
          durationMs: sendResult.durationMs,
          log: latestLog
        });
      }
    } catch (err: any) {
      console.error("Test email uncaught error:", err);
      const friendlyError = translateEmailError(err.message || String(err), "riadataleata.com");
      res.status(500).json({
        success: false,
        error: "حدث خطأ أثناء إرسال البريد الاختباري: " + friendlyError
      });
    }
  });

  // 4. Live DNS Checker for riadataleata.com
  app.get("/api/db/dns/check-live", async (req: Request, res: Response) => {
    try {
      const domain = (req.query.domain as string) || "riadataleata.com";
      const liveDns = await checkLiveDnsRecords(domain);
      const standardRecords = getStandardResendDnsRecords(domain);

      res.json({
        success: true,
        domain,
        liveDns,
        standardRecords
      });
    } catch (err: any) {
      console.error("DNS check error:", err);
      res.status(500).json({ error: "فشل التحقق من سجلات DNS: " + err.message });
    }
  });

  // 5. Resend Domain Management Status
  app.get("/api/db/resend/domain-status", async (req: Request, res: Response) => {
    try {
      const db = readDb();
      const config = getEmailConfig(db);
      const targetDomain = "riadataleata.com";
      const liveDns = await checkLiveDnsRecords(targetDomain);
      const standardRecords = getStandardResendDnsRecords(targetDomain);

      if (!config.hasResendApiKey) {
        return res.json({
          success: true,
          hasApiKey: false,
          domain: targetDomain,
          status: "needs_api_key",
          message: "يرجى إضافة مفتاح Resend API Key في تبويب الإعدادات لإتمام التوثيق التلقائي.",
          records: standardRecords,
          liveDns
        });
      }

      // Has API Key: query Resend Domains API
      try {
        const domainsList = await fetchResendDomainsList(config.resendApiKey);
        const match = domainsList.find((d: any) => d.name === targetDomain || d.name.endsWith(`.${targetDomain}`));

        if (!match) {
          return res.json({
            success: true,
            hasApiKey: true,
            domain: targetDomain,
            status: "not_added_to_resend",
            message: `النطاق ${targetDomain} لم تتم إضافته بعد إلى حساب Resend. يمكنك النقر على زر 'إضافة النطاق إلى Resend الآن' أدناه لإنشائه وجلب السجلات الدقيقة.`,
            records: standardRecords,
            liveDns
          });
        }

        // Domain exists in Resend: fetch full record details
        const details = await fetchResendDomainDetails(config.resendApiKey, match.id);

        return res.json({
          success: true,
          hasApiKey: true,
          domain: targetDomain,
          domainId: match.id,
          status: details.status || match.status || "pending",
          resendDetails: details,
          records: details.records || standardRecords,
          liveDns
        });
      } catch (apiErr: any) {
        const friendly = translateEmailError(apiErr.message, targetDomain);
        return res.json({
          success: false,
          hasApiKey: true,
          domain: targetDomain,
          status: "api_error",
          error: friendly,
          records: standardRecords,
          liveDns
        });
      }
    } catch (err: any) {
      res.status(500).json({ error: "فشل استعلام حالة نطاق Resend: " + err.message });
    }
  });

  // 6. Create Domain in Resend Account
  app.post("/api/db/resend/domains/create", async (req: Request, res: Response) => {
    try {
      const db = readDb();
      const config = getEmailConfig(db);
      const targetDomain = req.body.domain || "riadataleata.com";

      if (!config.hasResendApiKey) {
        return res.status(400).json({ error: "يرجى حفظ مفتاح Resend API أولاً." });
      }

      const created = await createResendDomainRecord(config.resendApiKey, targetDomain);
      res.json({
        success: true,
        message: `تمت إضافة النطاق ${targetDomain} بنجاح إلى حساب Resend.`,
        domain: created
      });
    } catch (err: any) {
      console.error("Error creating Resend domain:", err);
      const friendly = translateEmailError(err.message, "riadataleata.com");
      res.status(500).json({ error: friendly });
    }
  });

  // 7. Trigger Verification in Resend
  app.post("/api/db/resend/domains/verify", async (req: Request, res: Response) => {
    try {
      const db = readDb();
      const config = getEmailConfig(db);
      const { domainId } = req.body;

      if (!config.hasResendApiKey) {
        return res.status(400).json({ error: "يرجى حفظ مفتاح Resend API أولاً." });
      }

      if (!domainId) {
        return res.status(400).json({ error: "معرف النطاق في Resend مطلوب." });
      }

      const result = await triggerResendDomainVerification(config.resendApiKey, domainId);
      res.json({
        success: true,
        message: "تم إرسال طلب التحقق من سجلات DNS إلى Resend. قد يستغرق التحديث بعض الدقائق وفق سرعة انتشار الـ DNS.",
        result
      });
    } catch (err: any) {
      console.error("Error triggering Resend verify:", err);
      const friendly = translateEmailError(err.message, "riadataleata.com");
      res.status(500).json({ error: friendly });
    }
  });

  // 8. Get Email Logs
  app.get("/api/db/email-logs", (req: Request, res: Response) => {
    try {
      const db = readDb();
      res.json({
        success: true,
        logs: db.emailLogs || []
      });
    } catch (err: any) {
      res.status(500).json({ error: "فشل استرجاع سجل البريد." });
    }
  });

  // 9. Clear Email Logs
  app.post("/api/db/email-logs/clear", (req: Request, res: Response) => {
    try {
      const db = readDb();
      db.emailLogs = [];
      writeDb(db);
      res.json({ success: true, message: "تم مسح سجل البريد الإلكتروني بنجاح." });
    } catch (err: any) {
      res.status(500).json({ error: "فشل مسح سجل البريد." });
    }
  });

  // 10. Resend an Email from Log
  app.post("/api/db/email-logs/resend", async (req: Request, res: Response) => {
    try {
      const { logId } = req.body;
      const db = readDb();
      db.emailLogs = db.emailLogs || [];

      const log = db.emailLogs.find((l: any) => l.id === logId);
      if (!log) {
        return res.status(404).json({ error: "سجل البريد المحدد غير موجود." });
      }

      const result = await sendCentralEmail(db, {
        to: log.recipient,
        recipientName: log.recipientName,
        subject: `[إعادة إرسال] ${log.subject}`,
        templateType: log.templateType,
        templateData: {
          recipientName: log.recipientName,
          customSubject: log.subject
        }
      });

      writeDb(db);

      if (result.success) {
        res.json({
          success: true,
          message: "تمت إعادة إرسال البريد الإلكتروني بنجاح.",
          result
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error || "تعذرت إعادة الإرسال.",
          result
        });
      }
    } catch (err: any) {
      res.status(500).json({ error: "فشل تنفيذ إعادة الإرسال: " + err.message });
    }
  });
}

function sendResultProviderName(provider: string): string {
  switch (provider) {
    case 'resend': return 'Resend API (Cloud Direct)';
    case 'smtp': return 'SMTP Protocol';
    default: return 'محاكاة النظام (Simulation)';
  }
}
