import express from "express";

export function setupFinancialRoutes(app: express.Application, readDb: () => any, writeDb: (data: any) => void) {
  // Helper to ensure all financial collections exist
  function ensureFinancialDb(db: any) {
    let modified = false;

    if (!db.financialSettings) {
      db.financialSettings = {
        associationName: "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة",
        licenseNumber: "ترخيص رسمي رقم: 100054219",
        logoUrl: "/logo.png",
        officialPhone: "0555551234",
        officialEmail: "finance@riadataleata.org.sa",
        currency: "ريال سعودي / SAR",
        fiscalYear: 2026,
        receiptPrefix: "REC-",
        paymentVoucherPrefix: "PAY-",
        expensePrefix: "EXP-",
        incomePrefix: "INC-",
        budgetWarningThreshold: 80,
        budgetAlertThreshold: 90,
        maxExpenseApprovalWithoutAudit: 5000,
        taxEnabled: true,
        defaultTaxRate: 15
      };
      modified = true;
    }

    if (!db.financialAccounts || !Array.isArray(db.financialAccounts) || db.financialAccounts.length === 0) {
      db.financialAccounts = [
        {
          id: "acc-1",
          accountNumber: "SA1280000412345678901234",
          name: "الحساب البنكي العام للجمعية (مصرف الراجحي)",
          type: "bank",
          bankName: "مصرف الراجحي",
          iban: "SA1280000412345678901234",
          openingBalance: 150000,
          currentBalance: 184500,
          currency: "SAR",
          status: "active",
          notes: "الحساب المعتمد لجميع العمليات التشغيلية والمصروفات الإدارية",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-09-01T00:00:00Z"
        },
        {
          id: "acc-2",
          accountNumber: "SA4410000998877665544332",
          name: "حساب التبرعات والإغاثة المخصصة (البنك الأهلي)",
          type: "donations",
          bankName: "البنك الأهلي السعودي (SNB)",
          iban: "SA4410000998877665544332",
          openingBalance: 250000,
          currentBalance: 320000,
          currency: "SAR",
          status: "active",
          notes: "حساب تبرعات السلال، كسوة الأسر، وإفطار صائم المخصصة بالعسيلة",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-09-01T00:00:00Z"
        },
        {
          id: "acc-3",
          accountNumber: "CASH-MAIN-01",
          name: "العهدة النقدية / صندوق الجمعية الرئيسي",
          type: "cash_box",
          bankName: "خزينة الجمعية بمقر العسيلة",
          iban: "خزينة نقدية رسمية",
          openingBalance: 15000,
          currentBalance: 12850,
          currency: "SAR",
          status: "active",
          notes: "عهدة نقدية للمصروفات النثرية العاجلة وضيافة مقر الجمعية",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-09-01T00:00:00Z"
        }
      ];
      modified = true;
    }

    if (!db.financialTransfers || !Array.isArray(db.financialTransfers)) {
      db.financialTransfers = [
        {
          id: "trf-1",
          transferNumber: "TRF-2026-0001",
          fromAccountId: "acc-1",
          fromAccountName: "الحساب البنكي العام للجمعية (مصرف الراجحي)",
          toAccountId: "acc-3",
          toAccountName: "العهدة النقدية / صندوق الجمعية الرئيسي",
          amount: 5000,
          date: "2026-08-15",
          referenceNumber: "REF-TRF-9901",
          notes: "تغذية الصندوق النقدي للضيافة والمستلزمات الميدانية",
          createdBy: "أ. عبد الله المالكي (المدير المالي)",
          createdAt: "2026-08-15T10:00:00Z"
        }
      ];
      modified = true;
    }

    if (!db.financialBudgets || !Array.isArray(db.financialBudgets) || db.financialBudgets.length === 0) {
      db.financialBudgets = [
        {
          id: "bud-1",
          budgetCode: "BUD-2026-001",
          name: "ميزانية مبادرة تنظيم إفطار صائم بالعسيلة",
          year: 2026,
          initiativeId: "init-1",
          initiativeName: "مبادرة تنظيم إفطار صائم بالعسيلة",
          departmentName: "إدارة البرامج والمشاريع الميدانية",
          approvedAmount: 50000,
          spentAmount: 32500,
          startDate: "2026-03-01",
          endDate: "2026-04-15",
          allowOverdraft: false,
          status: "active",
          notes: "وجبات ساخنة، سقيا ماء، وسلال تمر لزوار وأهالي العسيلة",
          createdById: "usr-admin",
          createdAt: "2026-01-10T00:00:00Z",
          updatedAt: "2026-08-01T00:00:00Z"
        },
        {
          id: "bud-2",
          budgetCode: "BUD-2026-002",
          name: "ميزانية توزيع السلال الغذائية للأسر المتعففة",
          year: 2026,
          initiativeName: "مشروع السلال التموينية الرمضانية والشهرية",
          departmentName: "إدارة الرعاية والخدمات الاجتماعية",
          approvedAmount: 85000,
          spentAmount: 48900,
          startDate: "2026-01-01",
          endDate: "2026-12-31",
          allowOverdraft: false,
          status: "active",
          notes: "توفير السلال التموينية المتكاملة لـ 500 أسرة مستفيدة مسجلة",
          createdById: "usr-admin",
          createdAt: "2026-01-10T00:00:00Z",
          updatedAt: "2026-08-10T00:00:00Z"
        },
        {
          id: "bud-3",
          budgetCode: "BUD-2026-003",
          name: "الميزانية التشغيلية وصيانة مرافق الجمعية 2026",
          year: 2026,
          departmentName: "الإدارة العامة والخدمات المشتركة",
          approvedAmount: 40000,
          spentAmount: 34200,
          startDate: "2026-01-01",
          endDate: "2026-12-31",
          allowOverdraft: false,
          status: "active",
          notes: "خدمات المقر، النظافة، شبكة الإنترنت، وفواتير الكهرباء والمياه",
          createdById: "usr-admin",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-08-20T00:00:00Z"
        }
      ];
      modified = true;
    }

    if (!db.financialSuppliers || !Array.isArray(db.financialSuppliers) || db.financialSuppliers.length === 0) {
      db.financialSuppliers = [
        {
          id: "sup-1",
          name: "شركة مياه الصفا والمروة المحدودة",
          businessType: "توريدات مياه وسقيا الحرم",
          phone: "0551122334",
          email: "sales@safawater.com",
          address: "مكة المكرمة - المنطقة الصناعية",
          bankName: "مصرف الراجحي",
          iban: "SA9980000123456789123456",
          taxNumber: "300123456700003",
          totalInvoiced: 45000,
          totalPaid: 40000,
          balanceDue: 5000,
          notes: "المورد الرئيسي لعبوات السقيا الميدانية",
          createdAt: "2026-01-15T00:00:00Z"
        },
        {
          id: "sup-2",
          name: "شركة أسواق ومخابز مكة المركزية",
          businessType: "مواد تموينية وسلال غذائية",
          phone: "0509988776",
          email: "orders@makkahmarkets.com",
          address: "مكة المكرمة - العسيلة - الشارع العام",
          bankName: "البنك الأهلي",
          iban: "SA2210000334455667788990",
          taxNumber: "300987654300003",
          totalInvoiced: 62000,
          totalPaid: 52000,
          balanceDue: 10000,
          notes: "توفير السكر والأرز والزيت والدقيق لسلال الأسر المتعففة",
          createdAt: "2026-02-01T00:00:00Z"
        },
        {
          id: "sup-3",
          name: "مؤسسة بصمة الإتقان للدعاية والطباعة",
          businessType: "مطبوعات وهوية بصرية وسديريات",
          phone: "0543322110",
          email: "info@itqanprint.sa",
          address: "مكة المكرمة - العزيزية",
          bankName: "مصرف الإنماء",
          iban: "SA5550000887766554433221",
          taxNumber: "310554433200003",
          totalInvoiced: 18500,
          totalPaid: 18500,
          balanceDue: 0,
          notes: "طباعة البنرات، الشهادات، بطاقات المتطوعين وسديريات العطاء",
          createdAt: "2026-02-15T00:00:00Z"
        }
      ];
      modified = true;
    }

    if (!db.financialDonors || !Array.isArray(db.financialDonors) || db.financialDonors.length === 0) {
      db.financialDonors = [
        {
          id: "don-1",
          name: "أوقاف الشيخ عبد الله بن عبد العزيز الراجحي",
          type: "charity",
          phone: "0114789000",
          email: "grant@rajhiawqaf.org.sa",
          organization: "مؤسسة أوقاف عبد الله الراجحي الخيرية",
          totalDonated: 120000,
          donationsCount: 3,
          lastDonationDate: "2026-08-10",
          notes: "دعم مخصص لمشروع سلال الأسر المتعففة وكفالة الأسر بالعسيلة",
          createdAt: "2026-01-20T00:00:00Z"
        },
        {
          id: "don-2",
          name: "فاعل خير (فاعل خير من أهالي مكة المكرمة)",
          type: "individual",
          phone: "0505554321",
          email: "donor.makkah@gmail.com",
          totalDonated: 25000,
          donationsCount: 4,
          lastDonationDate: "2026-08-28",
          notes: "تبرع مستمر شهرياً لسقيا الماء وإفطار صائم",
          createdAt: "2026-02-10T00:00:00Z"
        },
        {
          id: "don-3",
          name: "مجموعة بن لادن للمقاولات والخدمات العامة",
          type: "corporate",
          phone: "0125432100",
          email: "csr@sbg.com.sa",
          organization: "المسؤولية الاجتماعية - مجموعة بن لادن",
          totalDonated: 50000,
          donationsCount: 1,
          lastDonationDate: "2026-07-15",
          notes: "رعاية مبادرات النظافة والتشجير بحي العسيلة",
          createdAt: "2026-03-01T00:00:00Z"
        }
      ];
      modified = true;
    }

    if (!db.financialIncome || !Array.isArray(db.financialIncome) || db.financialIncome.length === 0) {
      db.financialIncome = [
        {
          id: "inc-1",
          operationNumber: "INC-2026-0001",
          type: "grant",
          source: "مؤسسة مانحة",
          donorName: "أوقاف الشيخ عبد الله بن عبد العزيز الراجحي",
          donorPhone: "0114789000",
          donorEmail: "grant@rajhiawqaf.org.sa",
          donorId: "don-1",
          amount: 50000,
          date: "2026-08-10",
          accountId: "acc-2",
          accountName: "حساب التبرعات والإغاثة المخصصة (البنك الأهلي)",
          projectName: "مشروع السلال التموينية الرمضانية والشهرية",
          initiativeName: "مشروع السلال التموينية الرمضانية والشهرية",
          donationType: "منحة رعاية سلال غذائية",
          isRestricted: true,
          restrictionPurpose: "صرف كامل المبلغ لسلال المواد الغذائية للأسر المسجلة بالعسيلة",
          receiptNumber: "REC-2026-0001",
          paymentMethod: "bank_transfer",
          notes: "حوالة رقم SAR-TR-88210 على الحساب المخصص",
          status: "completed",
          createdById: "usr-admin",
          createdByName: "أ. عبد الله المالكي (المدير المالي)",
          createdAt: "2026-08-10T11:00:00Z"
        },
        {
          id: "inc-2",
          operationNumber: "INC-2026-0002",
          type: "donation",
          source: "متبرع فردي",
          donorName: "فاعل خير من مكة المكرمة",
          donorPhone: "0505554321",
          donorId: "don-2",
          amount: 10000,
          date: "2026-08-28",
          accountId: "acc-2",
          accountName: "حساب التبرعات والإغاثة المخصصة (البنك الأهلي)",
          projectName: "مبادرة تنظيم إفطار صائم بالعسيلة",
          donationType: "سقيا ماء ووجبات إفطار",
          isRestricted: true,
          restrictionPurpose: "وجبات ساخنة للمصلين بالعسيلة",
          receiptNumber: "REC-2026-0002",
          paymentMethod: "card",
          notes: "تبرع مباشر عبر بوابة الدفع الإلكترونية",
          status: "completed",
          createdById: "usr-acc",
          createdByName: "أ. سامي العتيبي (المحاسب)",
          createdAt: "2026-08-28T14:30:00Z"
        },
        {
          id: "inc-3",
          operationNumber: "INC-2026-0003",
          type: "subscription",
          source: "رسوم اشتراك أعضاء الجمعية العمومية",
          donorName: "أعضاء الجمعية العمومية 2026",
          amount: 15000,
          date: "2026-09-01",
          accountId: "acc-1",
          accountName: "الحساب البنكي العام للجمعية (مصرف الراجحي)",
          isRestricted: false,
          receiptNumber: "REC-2026-0003",
          paymentMethod: "bank_transfer",
          notes: "اشتراكات سنوية معتمدة بحساب مصرف الراجحي",
          status: "completed",
          createdById: "usr-acc",
          createdByName: "أ. سامي العتيبي (المحاسب)",
          createdAt: "2026-09-01T09:00:00Z"
        }
      ];
      modified = true;
    }

    if (!db.financialExpenses || !Array.isArray(db.financialExpenses) || db.financialExpenses.length === 0) {
      db.financialExpenses = [
        {
          id: "exp-1",
          expenseNumber: "EXP-2026-0001",
          type: "purchases",
          description: "شراء وتوريد 500 كرتون مياه صحية لسقيا المصلين بالعسيلة",
          beneficiaryName: "شركة مياه الصفا والمروة المحدودة",
          amount: 6000,
          date: "2026-08-12",
          accountId: "acc-2",
          accountName: "حساب التبرعات والإغاثة المخصصة (البنك الأهلي)",
          projectName: "مبادرة تنظيم إفطار صائم بالعسيلة",
          initiativeName: "مبادرة تنظيم إفطار صائم بالعسيلة",
          budgetId: "bud-1",
          budgetName: "ميزانية مبادرة تنظيم إفطار صائم بالعسيلة",
          paymentMethod: "bank_transfer",
          invoiceNumber: "INV-SAFA-2026-441",
          supplierId: "sup-1",
          supplierName: "شركة مياه الصفا والمروة المحدودة",
          notes: "تم استلام الشحنة وإيداعها في المستودع الرئيسي",
          status: "paid",
          createdById: "usr-admin",
          createdByName: "أ. إبراهيم الزهراني (منسق المبادرات)",
          createdAt: "2026-08-11T09:00:00Z",
          reviewedById: "usr-auditor",
          reviewedByName: "أ. محمود الكردي (المراجع المالي)",
          reviewedAt: "2026-08-11T12:00:00Z",
          approvedById: "usr-finance-dir",
          approvedByName: "أ. عبد الله المالكي (المدير المالي)",
          approvedAt: "2026-08-12T08:30:00Z",
          paidById: "usr-acc",
          paidByName: "أ. سامي العتيبي (المحاسب)",
          paidAt: "2026-08-12T10:00:00Z",
          paymentReceiptNumber: "PAY-2026-0001",
          approvalHistory: [
            { step: "created", byUserId: "usr-admin", byUserName: "أ. إبراهيم الزهراني (منسق المبادرات)", date: "2026-08-11T09:00:00Z", notes: "تم رفع عرض السعر ومطابقة الحاجة" },
            { step: "reviewed", byUserId: "usr-auditor", byUserName: "أ. محمود الكردي (المراجع المالي)", date: "2026-08-11T12:00:00Z", notes: "مستندات مستوفية ومطابقة لمخصص البند" },
            { step: "approved", byUserId: "usr-finance-dir", byUserName: "أ. عبد الله المالكي (المدير المالي)", date: "2026-08-12T08:30:00Z", notes: "معتمد للصرف عبر الحساب الأهلي" },
            { step: "paid", byUserId: "usr-acc", byUserName: "أ. سامي العتيبي (المحاسب)", date: "2026-08-12T10:00:00Z", notes: "تم تحويل المبلغ وإرفاق إشعار البنك" }
          ]
        },
        {
          id: "exp-2",
          expenseNumber: "EXP-2026-0002",
          type: "operations",
          description: "صيانة أجهزة التكييف وشبكة الكهرباء بالمركز الإداري بالعسيلة",
          beneficiaryName: "مؤسسة درع البرودة للصيانة",
          amount: 3200,
          date: "2026-08-20",
          accountId: "acc-1",
          accountName: "الحساب البنكي العام للجمعية (مصرف الراجحي)",
          departmentName: "الإدارة العامة والخدمات المشتركة",
          budgetId: "bud-3",
          budgetName: "الميزانية التشغيلية وصيانة مرافق الجمعية 2026",
          paymentMethod: "bank_transfer",
          invoiceNumber: "INV-CLIM-8812",
          notes: "صيانة شاملة للمقر وغرف التدريب",
          status: "paid",
          createdById: "usr-admin",
          createdByName: "م. حسام الشهري (مشرف الخدمات)",
          createdAt: "2026-08-19T08:30:00Z",
          reviewedById: "usr-auditor",
          reviewedByName: "أ. محمود الكردي (المراجع المالي)",
          reviewedAt: "2026-08-19T11:00:00Z",
          approvedById: "usr-finance-dir",
          approvedByName: "أ. عبد الله المالكي (المدير المالي)",
          approvedAt: "2026-08-20T09:00:00Z",
          paidById: "usr-acc",
          paidByName: "أ. سامي العتيبي (المحاسب)",
          paidAt: "2026-08-20T10:15:00Z",
          paymentReceiptNumber: "PAY-2026-0002",
          approvalHistory: [
            { step: "created", byUserId: "usr-admin", byUserName: "م. حسام الشهري", date: "2026-08-19T08:30:00Z", notes: "طلب صيانة عاجل للمكيفات" },
            { step: "reviewed", byUserId: "usr-auditor", byUserName: "أ. محمود الكردي", date: "2026-08-19T11:00:00Z", notes: "مكتمل" },
            { step: "approved", byUserId: "usr-finance-dir", byUserName: "أ. عبد الله المالكي", date: "2026-08-20T09:00:00Z", notes: "معتمد" },
            { step: "paid", byUserId: "usr-acc", byUserName: "أ. سامي العتيبي", date: "2026-08-20T10:15:00Z", notes: "تم السداد" }
          ]
        },
        {
          id: "exp-3",
          expenseNumber: "EXP-2026-0003",
          type: "supplies",
          description: "طباعة بطاقات المتطوعين وسديريات ميدانية جديدة",
          beneficiaryName: "مؤسسة بصمة الإتقان للدعاية والطباعة",
          amount: 4500,
          date: "2026-09-05",
          budgetId: "bud-3",
          budgetName: "الميزانية التشغيلية وصيانة مرافق الجمعية 2026",
          paymentMethod: "bank_transfer",
          invoiceNumber: "INV-ITQ-2026",
          supplierId: "sup-3",
          supplierName: "مؤسسة بصمة الإتقان للدعاية والطباعة",
          notes: "بانتظار موافقة الإدارة المالية لاعتماد أمر الصرف",
          status: "pending_approval",
          createdById: "usr-admin",
          createdByName: "أ. إبراهيم الزهراني",
          createdAt: "2026-09-04T10:00:00Z",
          reviewedById: "usr-auditor",
          reviewedByName: "أ. محمود الكردي (المراجع المالي)",
          reviewedAt: "2026-09-04T13:00:00Z",
          reviewNotes: "تم التدقيق وتوفر الرصيد في البند المالي",
          approvalHistory: [
            { step: "created", byUserId: "usr-admin", byUserName: "أ. إبراهيم الزهراني", date: "2026-09-04T10:00:00Z", notes: "طلب اعتماد طباعة السديريات" },
            { step: "reviewed", byUserId: "usr-auditor", byUserName: "أ. محمود الكردي", date: "2026-09-04T13:00:00Z", notes: "تم التدقيق المالي وجاهز للاعتماد النهائي" }
          ]
        }
      ];
      modified = true;
    }

    if (!db.financialPurchases || !Array.isArray(db.financialPurchases) || db.financialPurchases.length === 0) {
      db.financialPurchases = [
        {
          id: "po-1",
          purchaseNumber: "PO-2026-0001",
          requestedById: "usr-admin",
          requestedByName: "أ. إبراهيم الزهراني",
          supplierId: "sup-1",
          supplierName: "شركة مياه الصفا والمروة المحدودة",
          items: [
            {
              id: "poi-1",
              itemName: "كرتون مياه صحية (40 عبوة 330مل)",
              quantity: 500,
              unit: "كرتون",
              unitPrice: 12,
              taxRate: 0,
              totalPrice: 6000,
              inventoryItemId: "inv-item-1"
            }
          ],
          subtotal: 6000,
          taxAmount: 0,
          totalAmount: 6000,
          projectName: "مبادرة تنظيم إفطار صائم بالعسيلة",
          budgetId: "bud-1",
          budgetName: "ميزانية مبادرة تنظيم إفطار صائم بالعسيلة",
          status: "received",
          addToInventoryOnReceive: true,
          isReceivedToInventory: true,
          notes: "تم الاستلام وإضافتها للمستودع المركزي",
          createdAt: "2026-08-10T10:00:00Z",
          receivedAt: "2026-08-12T11:00:00Z",
          paidAt: "2026-08-12T12:00:00Z"
        }
      ];
      modified = true;
    }

    if (!db.financialPayables || !Array.isArray(db.financialPayables) || db.financialPayables.length === 0) {
      db.financialPayables = [
        {
          id: "pay-1",
          payableNumber: "PAYABLE-2026-001",
          beneficiaryName: "شركة أسواق ومخابز مكة المركزية",
          category: "supplier",
          amount: 10000,
          dueDate: "2026-09-30",
          reason: "الدفعة الثانية المتبقية من فاتورة توريد سلال الأغذية الرمضانية",
          supplierId: "sup-2",
          isPaid: false,
          notes: "مستحق السداد بنهاية شهر سبتمبر حسب العقد المبرم",
          createdAt: "2026-08-25T09:00:00Z"
        },
        {
          id: "pay-2",
          payableNumber: "PAYABLE-2026-002",
          beneficiaryName: "شركة مياه الصفا والمروة المحدودة",
          category: "supplier",
          amount: 5000,
          dueDate: "2026-10-15",
          reason: "المتبقي من توريد مياه السقيا",
          supplierId: "sup-1",
          isPaid: false,
          notes: "تستحق بعد إتمام فحص الجرد الميداني",
          createdAt: "2026-08-26T10:00:00Z"
        }
      ];
      modified = true;
    }

    if (!db.financialPayroll || !Array.isArray(db.financialPayroll) || db.financialPayroll.length === 0) {
      db.financialPayroll = [
        {
          id: "pr-1",
          payrollNumber: "PAYROLL-2026-08",
          month: "2026-08",
          title: "مسير رواتب موظفي الجمعية - أغسطس 2026",
          employees: [
            {
              id: "prm-1",
              employeeId: "emp-101",
              employeeName: "أ. عبد الله بن محمد المالكي",
              jobTitle: "المدير المالي والإداري",
              basicSalary: 9500,
              allowances: 1500,
              bonuses: 500,
              deductions: 0,
              netSalary: 11500
            },
            {
              id: "prm-2",
              employeeId: "emp-102",
              employeeName: "أ. سامي بن فهد العتيبي",
              jobTitle: "محاسب الجمعية",
              basicSalary: 6500,
              allowances: 1000,
              bonuses: 0,
              deductions: 0,
              netSalary: 7500
            },
            {
              id: "prm-3",
              employeeId: "emp-103",
              employeeName: "أ. أحمد بن علي الشمري",
              jobTitle: "أمين المستودع الرئيسي",
              basicSalary: 5500,
              allowances: 800,
              bonuses: 200,
              deductions: 0,
              netSalary: 6500
            }
          ],
          totalBasic: 21500,
          totalAllowances: 3300,
          totalBonuses: 700,
          totalDeductions: 0,
          totalNet: 25500,
          status: "paid",
          paidFromAccountId: "acc-1",
          paidDate: "2026-08-27",
          approvedById: "usr-director",
          approvedByName: "أ. عبد الله المالكي",
          notes: "تم التحويل بنجاح لحسابات الموظفين عبر نظام حماية الأجور (WPS)",
          createdAt: "2026-08-25T08:00:00Z"
        }
      ];
      modified = true;
    }

    if (!db.financialReceipts || !Array.isArray(db.financialReceipts) || db.financialReceipts.length === 0) {
      db.financialReceipts = [
        {
          id: "rec-1",
          receiptNumber: "REC-2026-0001",
          type: "receipt",
          date: "2026-08-10",
          amount: 50000,
          amountInWords: "فقط خمسون ألف ريال سعودي لا غير",
          partyName: "أوقاف الشيخ عبد الله بن عبد العزيز الراجحي",
          reason: "دعم مخصص لسلال الأسر المتعففة بالعسيلة",
          accountId: "acc-2",
          accountName: "حساب التبرعات والإغاثة المخصصة (البنك الأهلي)",
          projectName: "مشروع السلال التموينية الرمضانية والشهرية",
          paymentMethod: "bank_transfer",
          referenceNumber: "SAR-TR-88210",
          issuedById: "usr-acc",
          issuedByName: "أ. سامي العتيبي (المحاسب)",
          qrVerificationCode: "QR-REC-2026-0001-VAL-9921",
          createdAt: "2026-08-10T11:30:00Z"
        },
        {
          id: "rec-2",
          receiptNumber: "PAY-2026-0001",
          type: "payment",
          date: "2026-08-12",
          amount: 6000,
          amountInWords: "فقط ستة آلاف ريال سعودي لا غير",
          partyName: "شركة مياه الصفا والمروة المحدودة",
          reason: "قيمة توريد 500 كرتون مياه صحية لسقيا المصلين بالعسيلة",
          accountId: "acc-2",
          accountName: "حساب التبرعات والإغاثة المخصصة (البنك الأهلي)",
          projectName: "مبادرة تنظيم إفطار صائم بالعسيلة",
          paymentMethod: "bank_transfer",
          referenceNumber: "INV-SAFA-2026-441",
          issuedById: "usr-acc",
          issuedByName: "أ. سامي العتيبي (المحاسب)",
          qrVerificationCode: "QR-PAY-2026-0001-VAL-4410",
          createdAt: "2026-08-12T10:15:00Z"
        }
      ];
      modified = true;
    }

    if (!db.financialDocuments || !Array.isArray(db.financialDocuments)) {
      db.financialDocuments = [
        {
          id: "doc-1",
          title: "فاتورة توريد مياه الصفا والمروة رقم 441",
          type: "invoice",
          fileUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800",
          fileName: "Invoice-SAFA-441.pdf",
          fileSize: "1.4 MB",
          relatedType: "expense",
          relatedId: "exp-1",
          relatedNumber: "EXP-2026-0001",
          uploadedById: "usr-admin",
          uploadedByName: "أ. إبراهيم الزهراني",
          isLocked: true,
          notes: "فاتورة ضريبية رسمية مختومة",
          createdAt: "2026-08-11T09:30:00Z"
        }
      ];
      modified = true;
    }

    if (!db.financialAuditLog || !Array.isArray(db.financialAuditLog) || db.financialAuditLog.length === 0) {
      db.financialAuditLog = [
        {
          id: "log-1",
          userId: "usr-admin",
          userName: "أ. عبد الله المالكي",
          userRole: "المدير المالي",
          action: "approve",
          targetType: "expense",
          targetId: "exp-1",
          targetNumber: "EXP-2026-0001",
          summary: "اعتماد صرف مبلغ 6,000 ريال لصالح شركة مياه الصفا والمروة",
          timestamp: "2026-08-12T08:30:00Z"
        },
        {
          id: "log-2",
          userId: "usr-acc",
          userName: "أ. سامي العتيبي",
          userRole: "المحاسب",
          action: "pay",
          targetType: "expense",
          targetId: "exp-1",
          targetNumber: "EXP-2026-0001",
          summary: "تنفيذ سداد المصروف بقيمة 6,000 ريال من حساب التبرعات الأهلي وإصدار سند الصرف PAY-2026-0001",
          timestamp: "2026-08-12T10:00:00Z"
        },
        {
          id: "log-3",
          userId: "usr-admin",
          userName: "أ. عبد الله المالكي",
          userRole: "المدير المالي",
          action: "transfer",
          targetType: "transfer",
          targetId: "trf-1",
          targetNumber: "TRF-2026-0001",
          summary: "إجراء تحويل داخلي بقيمة 5,000 ريال من حساب الراجحي إلى العهدة النقدية",
          timestamp: "2026-08-15T10:00:00Z"
        }
      ];
      modified = true;
    }

    if (modified) {
      writeDb(db);
    }
    return db;
  }

  // Record Audit Log helper
  function addAudit(db: any, req: express.Request, auditData: {
    userId?: string;
    userName?: string;
    userRole?: string;
    action: string;
    targetType: string;
    targetId: string;
    targetNumber?: string;
    summary: string;
    oldValue?: any;
    newValue?: any;
  }) {
    if (!db.financialAuditLog) db.financialAuditLog = [];
    const log = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: auditData.userId || (req.body?.user?.id || "admin"),
      userName: auditData.userName || (req.body?.user?.name || "مدير النظام"),
      userRole: auditData.userRole || (req.body?.user?.role || "المدير المالي"),
      action: auditData.action,
      targetType: auditData.targetType,
      targetId: auditData.targetId,
      targetNumber: auditData.targetNumber,
      summary: auditData.summary,
      oldValue: auditData.oldValue,
      newValue: auditData.newValue,
      ipAddress: req.ip || "127.0.0.1",
      timestamp: new Date().toISOString()
    };
    db.financialAuditLog.unshift(log);
  }

  // 1. Get All Financial Data (Optimized Centralized Fetch)
  app.get("/api/db/finance/all", (req, res) => {
    const db = ensureFinancialDb(readDb());
    res.json({
      success: true,
      settings: db.financialSettings,
      accounts: db.financialAccounts || [],
      transfers: db.financialTransfers || [],
      budgets: db.financialBudgets || [],
      suppliers: db.financialSuppliers || [],
      donors: db.financialDonors || [],
      income: db.financialIncome || [],
      expenses: db.financialExpenses || [],
      purchases: db.financialPurchases || [],
      payables: db.financialPayables || [],
      payroll: db.financialPayroll || [],
      receipts: db.financialReceipts || [],
      documents: db.financialDocuments || [],
      auditLog: (db.financialAuditLog || []).slice(0, 100)
    });
  });

  // 2. Settings Update
  app.post("/api/db/finance/settings", (req, res) => {
    const db = ensureFinancialDb(readDb());
    const oldSettings = { ...db.financialSettings };
    db.financialSettings = { ...db.financialSettings, ...req.body };
    addAudit(db, req, {
      action: "update",
      targetType: "settings",
      targetId: "settings",
      summary: "تحديث الإعدادات والسياسات المالية للجمعية",
      oldValue: oldSettings,
      newValue: db.financialSettings
    });
    writeDb(db);
    res.json({ success: true, settings: db.financialSettings });
  });

  // 3. Accounts CRUD & Transfers
  app.post("/api/db/finance/accounts/save", (req, res) => {
    const db = ensureFinancialDb(readDb());
    const accountData = req.body;
    let savedAcc: any;

    if (accountData.id) {
      const idx = db.financialAccounts.findIndex((a: any) => a.id === accountData.id);
      if (idx !== -1) {
        savedAcc = { ...db.financialAccounts[idx], ...accountData, updatedAt: new Date().toISOString() };
        db.financialAccounts[idx] = savedAcc;
        addAudit(db, req, {
          action: "update",
          targetType: "account",
          targetId: savedAcc.id,
          targetNumber: savedAcc.accountNumber,
          summary: `تحديث بيانات الحساب: ${savedAcc.name}`
        });
      }
    } else {
      savedAcc = {
        ...accountData,
        id: `acc-${Date.now()}`,
        currentBalance: Number(accountData.openingBalance || 0),
        currency: "SAR",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.financialAccounts.push(savedAcc);
      addAudit(db, req, {
        action: "create",
        targetType: "account",
        targetId: savedAcc.id,
        targetNumber: savedAcc.accountNumber,
        summary: `إنشاء حساب مالي جديد: ${savedAcc.name} برصيد افتتاحي ${savedAcc.openingBalance} ريال`
      });
    }

    writeDb(db);
    res.json({ success: true, account: savedAcc, accounts: db.financialAccounts });
  });

  app.post("/api/db/finance/transfers", (req, res) => {
    const db = ensureFinancialDb(readDb());
    const { fromAccountId, toAccountId, amount, referenceNumber, notes, user } = req.body;
    const numAmount = Number(amount);

    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ error: "المبلغ المحول غير صحيح" });
    }

    const fromAcc = db.financialAccounts.find((a: any) => a.id === fromAccountId);
    const toAcc = db.financialAccounts.find((a: any) => a.id === toAccountId);

    if (!fromAcc || !toAcc) {
      return res.status(404).json({ error: "أحد الحسابات غير موجود" });
    }

    if (fromAcc.currentBalance < numAmount) {
      return res.status(400).json({ error: "رصيد الحساب المحوّل منه لا يكفي لإتمام العملية" });
    }

    // Perform transfer
    fromAcc.currentBalance -= numAmount;
    toAcc.currentBalance += numAmount;

    const trfCount = (db.financialTransfers || []).length + 1;
    const transfer = {
      id: `trf-${Date.now()}`,
      transferNumber: `TRF-2026-${String(trfCount).padStart(4, "0")}`,
      fromAccountId,
      fromAccountName: fromAcc.name,
      toAccountId,
      toAccountName: toAcc.name,
      amount: numAmount,
      date: new Date().toISOString().split("T")[0],
      referenceNumber,
      notes,
      createdBy: user?.name || "المدير المالي",
      createdAt: new Date().toISOString()
    };

    db.financialTransfers.unshift(transfer);

    addAudit(db, req, {
      userId: user?.id,
      userName: user?.name,
      action: "transfer",
      targetType: "transfer",
      targetId: transfer.id,
      targetNumber: transfer.transferNumber,
      summary: `تحويل داخلي بقيمة ${numAmount} ريال من (${fromAcc.name}) إلى (${toAcc.name})`
    });

    writeDb(db);
    res.json({ success: true, transfer, accounts: db.financialAccounts });
  });

  // 4. Income & Donations
  app.post("/api/db/finance/income/save", (req, res) => {
    const db = ensureFinancialDb(readDb());
    const data = req.body;
    const numAmount = Number(data.amount || 0);

    const targetAccount = db.financialAccounts.find((a: any) => a.id === data.accountId);
    if (!targetAccount) {
      return res.status(400).json({ error: "يرجى تحديد الحساب المستلم للإيراد" });
    }

    let savedInc: any;
    if (data.id) {
      const idx = db.financialIncome.findIndex((i: any) => i.id === data.id);
      if (idx !== -1) {
        savedInc = { ...db.financialIncome[idx], ...data };
        db.financialIncome[idx] = savedInc;
        addAudit(db, req, {
          action: "update",
          targetType: "income",
          targetId: savedInc.id,
          targetNumber: savedInc.operationNumber,
          summary: `تعديل قيد الإيراد ${savedInc.operationNumber}`
        });
      }
    } else {
      const incCount = (db.financialIncome || []).length + 1;
      const opNum = `INC-2026-${String(incCount).padStart(4, "0")}`;
      const recNum = `REC-2026-${String(incCount).padStart(4, "0")}`;

      savedInc = {
        ...data,
        id: `inc-${Date.now()}`,
        operationNumber: opNum,
        receiptNumber: recNum,
        amount: numAmount,
        accountName: targetAccount.name,
        status: data.status || "completed",
        createdAt: new Date().toISOString()
      };

      // Deposit into account if completed
      if (savedInc.status === "completed") {
        targetAccount.currentBalance += numAmount;
      }

      db.financialIncome.unshift(savedInc);

      // Auto create receipt
      const receipt = {
        id: `rec-${Date.now()}`,
        receiptNumber: recNum,
        type: "receipt",
        date: savedInc.date,
        amount: numAmount,
        amountInWords: `${numAmount} ريال سعودي`,
        partyName: savedInc.donorName || "متبرع كريم",
        reason: savedInc.isRestricted ? `تبرع مخصص: ${savedInc.restrictionPurpose || savedInc.projectName}` : `إيراد عام: ${savedInc.source}`,
        accountId: targetAccount.id,
        accountName: targetAccount.name,
        projectName: savedInc.projectName,
        paymentMethod: savedInc.paymentMethod || "bank_transfer",
        referenceNumber: opNum,
        issuedById: data.user?.id || "usr-acc",
        issuedByName: data.user?.name || "المحاسب",
        qrVerificationCode: `QR-${recNum}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        createdAt: new Date().toISOString()
      };
      if (!db.financialReceipts) db.financialReceipts = [];
      db.financialReceipts.unshift(receipt);

      // Update or add donor stats if individual/corporate
      if (savedInc.donorName) {
        if (!db.financialDonors) db.financialDonors = [];
        let donor = db.financialDonors.find((d: any) => d.name.trim() === savedInc.donorName.trim());
        if (donor) {
          donor.totalDonated += numAmount;
          donor.donationsCount += 1;
          donor.lastDonationDate = savedInc.date;
        } else {
          donor = {
            id: `don-${Date.now()}`,
            name: savedInc.donorName,
            type: "individual",
            phone: savedInc.donorPhone || "",
            email: savedInc.donorEmail || "",
            totalDonated: numAmount,
            donationsCount: 1,
            lastDonationDate: savedInc.date,
            createdAt: new Date().toISOString()
          };
          db.financialDonors.push(donor);
        }
      }

      addAudit(db, req, {
        action: "create",
        targetType: "income",
        targetId: savedInc.id,
        targetNumber: savedInc.operationNumber,
        summary: `تسجيل إيراد/تبرع جديد بقيمة ${numAmount} ريال من (${savedInc.donorName}) وإصدار الإيصال ${recNum}`
      });
    }

    writeDb(db);
    res.json({ success: true, income: savedInc, accounts: db.financialAccounts });
  });

  // 5. Expense Lifecycle & Approvals
  app.post("/api/db/finance/expenses/save", (req, res) => {
    const db = ensureFinancialDb(readDb());
    const data = req.body;
    const numAmount = Number(data.amount || 0);

    // Budget check
    if (data.budgetId) {
      const budget = db.financialBudgets.find((b: any) => b.id === data.budgetId);
      if (budget) {
        const remaining = budget.approvedAmount - budget.spentAmount;
        if (numAmount > remaining && !budget.allowOverdraft && req.body.userRole !== "financial_director") {
          return res.status(400).json({
            error: `قيمة المصروف (${numAmount} ريال) تتجاوز الرصيد المتبقي في الميزانية (${remaining} ريال). يتطلب موافقة المدير المالي.`
          });
        }
      }
    }

    let savedExp: any;
    if (data.id) {
      const idx = db.financialExpenses.findIndex((e: any) => e.id === data.id);
      if (idx !== -1) {
        const oldExp = db.financialExpenses[idx];
        if (oldExp.status === "paid" && req.body.userRole !== "financial_director") {
          return res.status(403).json({ error: "لا يمكن تعديل مصروف تم صرفه وسداده نهائياً" });
        }
        savedExp = { ...oldExp, ...data };
        db.financialExpenses[idx] = savedExp;
        addAudit(db, req, {
          action: "update",
          targetType: "expense",
          targetId: savedExp.id,
          targetNumber: savedExp.expenseNumber,
          summary: `تعديل المصروف ${savedExp.expenseNumber}`
        });
      }
    } else {
      const expCount = (db.financialExpenses || []).length + 1;
      const expNum = `EXP-2026-${String(expCount).padStart(4, "0")}`;

      savedExp = {
        ...data,
        id: `exp-${Date.now()}`,
        expenseNumber: expNum,
        amount: numAmount,
        status: data.status || "under_review",
        createdById: data.user?.id || "usr-admin",
        createdByName: data.user?.name || "منسق الطلبات",
        createdAt: new Date().toISOString(),
        approvalHistory: [
          {
            step: "created",
            byUserId: data.user?.id || "usr-admin",
            byUserName: data.user?.name || "منسق الطلبات",
            date: new Date().toISOString(),
            notes: data.notes || "إنشاء طلب الصرف"
          }
        ]
      };

      db.financialExpenses.unshift(savedExp);

      addAudit(db, req, {
        action: "create",
        targetType: "expense",
        targetId: savedExp.id,
        targetNumber: savedExp.expenseNumber,
        summary: `إنشاء طلب صرف جديد: ${savedExp.description} بقيمة ${numAmount} ريال`
      });
    }

    writeDb(db);
    res.json({ success: true, expense: savedExp });
  });

  // Workflow Approval Route
  app.post("/api/db/finance/expenses/workflow", (req, res) => {
    const db = ensureFinancialDb(readDb());
    const { expenseId, action, notes, accountId, user } = req.body;
    // action: 'review' | 'approve' | 'reject' | 'pay' | 'cancel'

    const exp = db.financialExpenses.find((e: any) => e.id === expenseId);
    if (!exp) {
      return res.status(404).json({ error: "المصروف غير موجود" });
    }

    const userName = user?.name || "المسؤول المالي";
    const userId = user?.id || "usr-action";
    const now = new Date().toISOString();

    if (action === "review") {
      exp.status = "pending_approval";
      exp.reviewedById = userId;
      exp.reviewedByName = userName;
      exp.reviewedAt = now;
      exp.reviewNotes = notes;
      exp.approvalHistory.push({ step: "reviewed", byUserId: userId, byUserName: userName, date: now, notes });
      addAudit(db, req, { action: "review", targetType: "expense", targetId: exp.id, targetNumber: exp.expenseNumber, summary: `تمت مراجعة المصروف وتدقيقه: ${exp.expenseNumber}` });
    } else if (action === "approve") {
      exp.status = "approved";
      exp.approvedById = userId;
      exp.approvedByName = userName;
      exp.approvedAt = now;
      exp.approvalNotes = notes;
      exp.approvalHistory.push({ step: "approved", byUserId: userId, byUserName: userName, date: now, notes });
      addAudit(db, req, { action: "approve", targetType: "expense", targetId: exp.id, targetNumber: exp.expenseNumber, summary: `اعتماد طلب الصرف: ${exp.expenseNumber} بقيمة ${exp.amount} ريال` });
    } else if (action === "reject") {
      exp.status = "rejected";
      exp.approvalHistory.push({ step: "cancelled", byUserId: userId, byUserName: userName, date: now, notes: `مرفوض: ${notes}` });
      addAudit(db, req, { action: "reject", targetType: "expense", targetId: exp.id, targetNumber: exp.expenseNumber, summary: `رفض طلب الصرف: ${exp.expenseNumber}. السبب: ${notes}` });
    } else if (action === "cancel") {
      exp.status = "cancelled";
      exp.cancellationReason = notes;
      exp.cancelledById = userId;
      exp.cancelledByName = userName;
      exp.cancelledAt = now;
      exp.approvalHistory.push({ step: "cancelled", byUserId: userId, byUserName: userName, date: now, notes: `إلغاء: ${notes}` });
      addAudit(db, req, { action: "cancel", targetType: "expense", targetId: exp.id, targetNumber: exp.expenseNumber, summary: `إلغاء المصروف: ${exp.expenseNumber}. السبب: ${notes}` });
    } else if (action === "pay") {
      const selectedAccId = accountId || exp.accountId;
      const account = db.financialAccounts.find((a: any) => a.id === selectedAccId);
      if (!account) {
        return res.status(400).json({ error: "يرجى تحديد الحساب البنكي أو الصندوق المسحوب منه" });
      }

      if (account.currentBalance < exp.amount) {
        return res.status(400).json({ error: `رصيد الحساب (${account.name}) غير كافٍ لسداد المبلغ` });
      }

      // Deduct balance
      account.currentBalance -= exp.amount;
      exp.status = "paid";
      exp.accountId = account.id;
      exp.accountName = account.name;
      exp.paidById = userId;
      exp.paidByName = userName;
      exp.paidAt = now;

      // Update Budget spentAmount if linked
      if (exp.budgetId) {
        const budget = db.financialBudgets.find((b: any) => b.id === exp.budgetId);
        if (budget) {
          budget.spentAmount += exp.amount;
          if (budget.spentAmount > budget.approvedAmount) {
            budget.status = "exceeded";
          }
        }
      }

      // Create Payment Receipt
      const recCount = (db.financialReceipts || []).length + 1;
      const payVoucherNum = `PAY-2026-${String(recCount).padStart(4, "0")}`;
      exp.paymentReceiptNumber = payVoucherNum;

      const voucher = {
        id: `rec-${Date.now()}`,
        receiptNumber: payVoucherNum,
        type: "payment",
        date: now.split("T")[0],
        amount: exp.amount,
        amountInWords: `${exp.amount} ريال سعودي لا غير`,
        partyName: exp.beneficiaryName,
        reason: exp.description,
        accountId: account.id,
        accountName: account.name,
        projectName: exp.projectName,
        paymentMethod: exp.paymentMethod || "bank_transfer",
        referenceNumber: exp.expenseNumber,
        issuedById: userId,
        issuedByName: userName,
        qrVerificationCode: `QR-${payVoucherNum}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        createdAt: now
      };
      if (!db.financialReceipts) db.financialReceipts = [];
      db.financialReceipts.unshift(voucher);

      exp.approvalHistory.push({ step: "paid", byUserId: userId, byUserName: userName, date: now, notes: `تم الدفع من ${account.name} وسند الصرف ${payVoucherNum}` });

      addAudit(db, req, {
        action: "pay",
        targetType: "expense",
        targetId: exp.id,
        targetNumber: exp.expenseNumber,
        summary: `تنفيذ سداد المصروف ${exp.expenseNumber} بقيمة ${exp.amount} ريال من (${account.name}) وسند الصرف ${payVoucherNum}`
      });
    }

    writeDb(db);
    res.json({ success: true, expense: exp, accounts: db.financialAccounts, budgets: db.financialBudgets });
  });

  // 6. Budgets CRUD
  app.post("/api/db/finance/budgets/save", (req, res) => {
    const db = ensureFinancialDb(readDb());
    const data = req.body;
    let savedBudget: any;

    if (data.id) {
      const idx = db.financialBudgets.findIndex((b: any) => b.id === data.id);
      if (idx !== -1) {
        savedBudget = { ...db.financialBudgets[idx], ...data, updatedAt: new Date().toISOString() };
        db.financialBudgets[idx] = savedBudget;
        addAudit(db, req, {
          action: "update",
          targetType: "budget",
          targetId: savedBudget.id,
          targetNumber: savedBudget.budgetCode,
          summary: `تحديث ميزانية: ${savedBudget.name}`
        });
      }
    } else {
      const count = (db.financialBudgets || []).length + 1;
      savedBudget = {
        ...data,
        id: `bud-${Date.now()}`,
        budgetCode: `BUD-2026-${String(count).padStart(3, "0")}`,
        spentAmount: 0,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.financialBudgets.push(savedBudget);
      addAudit(db, req, {
        action: "create",
        targetType: "budget",
        targetId: savedBudget.id,
        targetNumber: savedBudget.budgetCode,
        summary: `اعتماد ميزانية جديدة: ${savedBudget.name} بمبلغ ${savedBudget.approvedAmount} ريال`
      });
    }

    writeDb(db);
    res.json({ success: true, budget: savedBudget, budgets: db.financialBudgets });
  });

  // 7. Suppliers CRUD
  app.post("/api/db/finance/suppliers/save", (req, res) => {
    const db = ensureFinancialDb(readDb());
    const data = req.body;
    let savedSupplier: any;

    if (data.id) {
      const idx = db.financialSuppliers.findIndex((s: any) => s.id === data.id);
      if (idx !== -1) {
        savedSupplier = { ...db.financialSuppliers[idx], ...data };
        db.financialSuppliers[idx] = savedSupplier;
        addAudit(db, req, {
          action: "update",
          targetType: "supplier",
          targetId: savedSupplier.id,
          summary: `تعديل بيانات المورد: ${savedSupplier.name}`
        });
      }
    } else {
      savedSupplier = {
        ...data,
        id: `sup-${Date.now()}`,
        totalInvoiced: 0,
        totalPaid: 0,
        balanceDue: 0,
        createdAt: new Date().toISOString()
      };
      db.financialSuppliers.push(savedSupplier);
      addAudit(db, req, {
        action: "create",
        targetType: "supplier",
        targetId: savedSupplier.id,
        summary: `إضافة مورد جديد: ${savedSupplier.name} (${savedSupplier.businessType})`
      });
    }

    writeDb(db);
    res.json({ success: true, supplier: savedSupplier, suppliers: db.financialSuppliers });
  });

  // 8. Purchases & Warehouse Stock Sync
  app.post("/api/db/finance/purchases/save", (req, res) => {
    const db = ensureFinancialDb(readDb());
    const data = req.body;
    let savedPo: any;

    if (data.id) {
      const idx = db.financialPurchases.findIndex((p: any) => p.id === data.id);
      if (idx !== -1) {
        savedPo = { ...db.financialPurchases[idx], ...data };
        db.financialPurchases[idx] = savedPo;
        addAudit(db, req, { action: "update", targetType: "purchase", targetId: savedPo.id, summary: `تحديث أمر الشراء ${savedPo.purchaseNumber}` });
      }
    } else {
      const count = (db.financialPurchases || []).length + 1;
      const poNum = `PO-2026-${String(count).padStart(4, "0")}`;

      const subtotal = (data.items || []).reduce((acc: number, item: any) => acc + (Number(item.unitPrice || 0) * Number(item.quantity || 0)), 0);
      const taxAmount = (data.items || []).reduce((acc: number, item: any) => acc + ((Number(item.unitPrice || 0) * Number(item.quantity || 0)) * (Number(item.taxRate || 0) / 100)), 0);
      const totalAmount = subtotal + taxAmount;

      savedPo = {
        ...data,
        id: `po-${Date.now()}`,
        purchaseNumber: poNum,
        subtotal,
        taxAmount,
        totalAmount,
        status: data.status || "quote",
        createdAt: new Date().toISOString()
      };

      db.financialPurchases.unshift(savedPo);

      addAudit(db, req, {
        action: "create",
        targetType: "purchase",
        targetId: savedPo.id,
        targetNumber: savedPo.purchaseNumber,
        summary: `إنشاء أمر شراء جديد ${poNum} للمورد (${savedPo.supplierName}) بإجمالي ${totalAmount} ريال`
      });
    }

    writeDb(db);
    res.json({ success: true, purchase: savedPo });
  });

  // Purchase Receive & Warehouse Integration
  app.post("/api/db/finance/purchases/receive", (req, res) => {
    const db = ensureFinancialDb(readDb());
    const { purchaseId, warehouseId, user } = req.body;

    const po = db.financialPurchases.find((p: any) => p.id === purchaseId);
    if (!po) return res.status(404).json({ error: "طلب الشراء غير موجود" });

    po.status = "received";
    po.receivedAt = new Date().toISOString();
    po.isReceivedToInventory = true;

    // Add items to inventory if requested
    if (po.addToInventoryOnReceive && Array.isArray(po.items)) {
      if (!db.inventoryItems) db.inventoryItems = [];
      if (!db.inventoryLogs) db.inventoryLogs = [];

      po.items.forEach((item: any) => {
        // Find existing or create item
        let invItem = db.inventoryItems.find((ii: any) => ii.id === item.inventoryItemId || ii.name.trim() === item.itemName.trim());
        if (invItem) {
          invItem.currentQty = (invItem.currentQty || 0) + Number(item.quantity);
          invItem.receivedQty = (invItem.receivedQty || 0) + Number(item.quantity);
          invItem.lastPurchasePrice = Number(item.unitPrice);
          invItem.totalValue = invItem.currentQty * invItem.unitPrice;
          invItem.updatedAt = new Date().toISOString();
        } else {
          invItem = {
            id: `inv-item-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            name: item.itemName,
            warehouseId: warehouseId || "wh-1",
            warehouseName: "المستودع الرئيسي - العسيلة",
            currentQty: Number(item.quantity),
            initialQty: Number(item.quantity),
            unitOfMeasure: item.unit || "حبة",
            unitPrice: Number(item.unitPrice),
            totalValue: Number(item.quantity) * Number(item.unitPrice),
            barcode: `628${Date.now().toString().slice(-10)}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          db.inventoryItems.push(invItem);
        }

        // Add inventory log
        db.inventoryLogs.unshift({
          id: `invlog-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          timestamp: new Date().toISOString(),
          storekeeperName: user?.name || "أمين المستودع",
          actionType: "inbound",
          actionTitle: `استلام مشتريات أمر ${po.purchaseNumber}`,
          details: `توريد +${item.quantity} ${item.unit || "حبة"} من ${item.itemName} للمستودع عبر المورد ${po.supplierName}`,
          itemId: invItem.id,
          itemName: invItem.name,
          quantity: Number(item.quantity),
          warehouseName: invItem.warehouseName || "المستودع الرئيسي"
        });
      });
    }

    addAudit(db, req, {
      userId: user?.id,
      userName: user?.name,
      action: "update",
      targetType: "purchase",
      targetId: po.id,
      targetNumber: po.purchaseNumber,
      summary: `اعتماد استلام أصناف أمر الشراء ${po.purchaseNumber} وإيداعها في مستودع الجمعية`
    });

    writeDb(db);
    res.json({ success: true, purchase: po, inventoryItems: db.inventoryItems });
  });

  // 9. Payables (المستحقات)
  app.post("/api/db/finance/payables/save", (req, res) => {
    const db = ensureFinancialDb(readDb());
    const data = req.body;
    let savedPay: any;

    if (data.id) {
      const idx = db.financialPayables.findIndex((p: any) => p.id === data.id);
      if (idx !== -1) {
        savedPay = { ...db.financialPayables[idx], ...data };
        db.financialPayables[idx] = savedPay;
        addAudit(db, req, { action: "update", targetType: "payable", targetId: savedPay.id, summary: `تحديث المستحق ${savedPay.payableNumber}` });
      }
    } else {
      const count = (db.financialPayables || []).length + 1;
      savedPay = {
        ...data,
        id: `pay-${Date.now()}`,
        payableNumber: `PAYABLE-2026-${String(count).padStart(3, "0")}`,
        isPaid: false,
        createdAt: new Date().toISOString()
      };
      db.financialPayables.unshift(savedPay);
      addAudit(db, req, {
        action: "create",
        targetType: "payable",
        targetId: savedPay.id,
        targetNumber: savedPay.payableNumber,
        summary: `تسجيل مستحق مالي جديد: ${savedPay.beneficiaryName} بمبلغ ${savedPay.amount} ريال تاريخ الاستحقاق ${savedPay.dueDate}`
      });
    }

    writeDb(db);
    res.json({ success: true, payable: savedPay });
  });

  // 10. Payroll (مسير الرواتب)
  app.post("/api/db/finance/payroll/save", (req, res) => {
    const db = ensureFinancialDb(readDb());
    const data = req.body;
    let savedPr: any;

    const totalBasic = (data.employees || []).reduce((acc: number, e: any) => acc + Number(e.basicSalary || 0), 0);
    const totalAllowances = (data.employees || []).reduce((acc: number, e: any) => acc + Number(e.allowances || 0), 0);
    const totalBonuses = (data.employees || []).reduce((acc: number, e: any) => acc + Number(e.bonuses || 0), 0);
    const totalDeductions = (data.employees || []).reduce((acc: number, e: any) => acc + Number(e.deductions || 0), 0);
    const totalNet = totalBasic + totalAllowances + totalBonuses - totalDeductions;

    if (data.id) {
      const idx = db.financialPayroll.findIndex((p: any) => p.id === data.id);
      if (idx !== -1) {
        savedPr = { ...db.financialPayroll[idx], ...data, totalBasic, totalAllowances, totalBonuses, totalDeductions, totalNet };
        db.financialPayroll[idx] = savedPr;
        addAudit(db, req, { action: "update", targetType: "payroll", targetId: savedPr.id, summary: `تعديل مسير رواتب ${savedPr.title}` });
      }
    } else {
      const count = (db.financialPayroll || []).length + 1;
      savedPr = {
        ...data,
        id: `pr-${Date.now()}`,
        payrollNumber: `PAYROLL-${data.month || "2026-09"}-${count}`,
        totalBasic,
        totalAllowances,
        totalBonuses,
        totalDeductions,
        totalNet,
        status: data.status || "draft",
        createdAt: new Date().toISOString()
      };
      db.financialPayroll.unshift(savedPr);
      addAudit(db, req, {
        action: "create",
        targetType: "payroll",
        targetId: savedPr.id,
        targetNumber: savedPr.payrollNumber,
        summary: `إعداد مسير رواتب جديد: ${savedPr.title} بإجمالي صافي ${totalNet} ريال`
      });
    }

    writeDb(db);
    res.json({ success: true, payroll: savedPr });
  });

  // Pay Payroll
  app.post("/api/db/finance/payroll/pay", (req, res) => {
    const db = ensureFinancialDb(readDb());
    const { payrollId, accountId, user } = req.body;

    const pr = db.financialPayroll.find((p: any) => p.id === payrollId);
    if (!pr) return res.status(404).json({ error: "مسير الرواتب غير موجود" });

    const account = db.financialAccounts.find((a: any) => a.id === accountId);
    if (!account) return res.status(400).json({ error: "يرجى تحديد حساب الصرف" });

    if (account.currentBalance < pr.totalNet) {
      return res.status(400).json({ error: "رصيد الحساب غير كافٍ لسداد إجمالي صافي الرواتب" });
    }

    account.currentBalance -= pr.totalNet;
    pr.status = "paid";
    pr.paidFromAccountId = account.id;
    pr.paidDate = new Date().toISOString().split("T")[0];
    pr.approvedById = user?.id || "usr-director";
    pr.approvedByName = user?.name || "المدير المالي";

    // Create Expense entry for payroll
    const expCount = (db.financialExpenses || []).length + 1;
    const expNum = `EXP-2026-${String(expCount).padStart(4, "0")}`;
    const exp = {
      id: `exp-${Date.now()}`,
      expenseNumber: expNum,
      type: "salaries",
      description: `صرف رواتب موظفي الجمعية - ${pr.title}`,
      beneficiaryName: "منسوبو وموظفو الجمعية",
      amount: pr.totalNet,
      date: pr.paidDate,
      accountId: account.id,
      accountName: account.name,
      departmentName: "الإدارة العامة والشؤون الإدارية",
      paymentMethod: "bank_transfer",
      status: "paid",
      createdById: user?.id || "usr-admin",
      createdByName: user?.name || "المدير المالي",
      createdAt: new Date().toISOString(),
      paidById: user?.id,
      paidByName: user?.name,
      paidAt: new Date().toISOString(),
      approvalHistory: [
        { step: "approved", byUserId: user?.id || "usr-admin", byUserName: user?.name || "المدير المالي", date: new Date().toISOString(), notes: "اعتماد مسير الرواتب" },
        { step: "paid", byUserId: user?.id || "usr-acc", byUserName: user?.name || "المحاسب", date: new Date().toISOString(), notes: `تم التحويل عبر ${account.name}` }
      ]
    };
    db.financialExpenses.unshift(exp);

    addAudit(db, req, {
      userId: user?.id,
      userName: user?.name,
      action: "pay",
      targetType: "payroll",
      targetId: pr.id,
      targetNumber: pr.payrollNumber,
      summary: `تنفيذ صرف مسير الرواتب ${pr.title} بقيمة ${pr.totalNet} ريال من (${account.name})`
    });

    writeDb(db);
    res.json({ success: true, payroll: pr, accounts: db.financialAccounts });
  });

  // 11. Documents repository
  app.post("/api/db/finance/documents/save", (req, res) => {
    const db = ensureFinancialDb(readDb());
    const data = req.body;
    const doc = {
      ...data,
      id: `doc-${Date.now()}`,
      isLocked: false,
      createdAt: new Date().toISOString()
    };
    if (!db.financialDocuments) db.financialDocuments = [];
    db.financialDocuments.unshift(doc);

    addAudit(db, req, {
      action: "upload_doc",
      targetType: "document",
      targetId: doc.id,
      summary: `رفع مستند مالي جديد: ${doc.title} (${doc.type})`
    });

    writeDb(db);
    res.json({ success: true, document: doc });
  });

  app.post("/api/db/finance/documents/delete", (req, res) => {
    const db = ensureFinancialDb(readDb());
    const { docId, userRole } = req.body;

    if (userRole !== "financial_director" && userRole !== "admin") {
      return res.status(403).json({ error: "لا تملك صلاحية حذف المستندات المالية بعد حفظها" });
    }

    const doc = (db.financialDocuments || []).find((d: any) => d.id === docId);
    if (!doc) return res.status(404).json({ error: "المستند غير موجود" });

    db.financialDocuments = db.financialDocuments.filter((d: any) => d.id !== docId);

    addAudit(db, req, {
      action: "delete_doc",
      targetType: "document",
      targetId: docId,
      summary: `حذف مستند مالي: ${doc.title}`
    });

    writeDb(db);
    res.json({ success: true });
  });

  // 12. Donors Save Route
  app.post("/api/db/finance/donors/save", (req, res) => {
    const db = ensureFinancialDb(readDb());
    const data = req.body;
    let savedDonor: any;

    if (data.id) {
      const idx = (db.financialDonors || []).findIndex((d: any) => d.id === data.id);
      if (idx !== -1) {
        savedDonor = { ...db.financialDonors[idx], ...data };
        db.financialDonors[idx] = savedDonor;
        addAudit(db, req, {
          action: "update",
          targetType: "donor",
          targetId: savedDonor.id,
          summary: `تحديث بيانات المتبرع / المانح: ${savedDonor.name}`
        });
      }
    } else {
      savedDonor = {
        ...data,
        id: `don-${Date.now()}`,
        totalDonated: Number(data.totalDonated || 0),
        donationsCount: Number(data.donationsCount || 0),
        createdAt: new Date().toISOString()
      };
      if (!db.financialDonors) db.financialDonors = [];
      db.financialDonors.push(savedDonor);
      addAudit(db, req, {
        action: "create",
        targetType: "donor",
        targetId: savedDonor.id,
        summary: `إضافة متبرع / داعم جديد: ${savedDonor.name} (${savedDonor.type || "فرد"})`
      });
    }

    writeDb(db);
    res.json({ success: true, donor: savedDonor, donors: db.financialDonors });
  });

  // 13. Payroll Auto-Generate from volunteers / staff records
  app.post("/api/db/finance/payroll/generate", (req, res) => {
    const db = ensureFinancialDb(readDb());
    const { month, notes, user } = req.body;
    const targetMonth = month || new Date().toISOString().substring(0, 7);

    // Default staff list if not in db
    const defaultStaff = [
      { id: "st-1", name: "أ. عبد الله المالكي", role: "المدير التنفيذي للجمعية", basic: 9500, allowances: 1500, deductions: 0 },
      { id: "st-2", name: "أ. سامي العتيبي", role: "المحاسب المالي ورئيس التدقيق", basic: 6500, allowances: 1000, deductions: 0 },
      { id: "st-3", name: "أ. منى الزهراني", role: "منسقة الرعاية والمستفيدين", basic: 5000, allowances: 800, deductions: 0 },
      { id: "st-4", name: "م. فهد القرشي", role: "مسؤول الإعلام والتقنية والتواصل", basic: 5200, allowances: 700, deductions: 0 },
      { id: "st-5", name: "أ. محمد السفياني", role: "أمين المستودع الرئيسي بالعسيلة", basic: 4800, allowances: 600, deductions: 0 }
    ];

    const employees = defaultStaff.map((staff, idx) => ({
      id: `emp-rec-${Date.now()}-${idx}`,
      employeeId: staff.id,
      employeeName: staff.name,
      jobTitle: staff.role,
      basicSalary: staff.basic,
      allowances: staff.allowances,
      bonuses: 0,
      deductions: staff.deductions,
      netSalary: staff.basic + staff.allowances - staff.deductions,
      notes: "مسجل وفق العقد الوظيفي المعتمد"
    }));

    const totalBasic = employees.reduce((sum, e) => sum + e.basicSalary, 0);
    const totalAllowances = employees.reduce((sum, e) => sum + e.allowances, 0);
    const totalBonuses = 0;
    const totalDeductions = employees.reduce((sum, e) => sum + e.deductions, 0);
    const totalNet = totalBasic + totalAllowances + totalBonuses - totalDeductions;

    const count = (db.financialPayroll || []).length + 1;
    const newPayroll = {
      id: `pr-${Date.now()}`,
      payrollNumber: `PAYROLL-${targetMonth}-${count}`,
      month: targetMonth,
      title: `مسير رواتب وأجور شهر ${targetMonth}`,
      employees,
      totalBasic,
      totalAllowances,
      totalBonuses,
      totalDeductions,
      totalNet,
      status: "draft",
      notes: notes || "تم إعداده آلياً استناداً لكادر الجمعية",
      createdAt: new Date().toISOString()
    };

    if (!db.financialPayroll) db.financialPayroll = [];
    db.financialPayroll.unshift(newPayroll);

    addAudit(db, req, {
      userId: user?.id,
      userName: user?.name,
      action: "create",
      targetType: "payroll",
      targetId: newPayroll.id,
      targetNumber: newPayroll.payrollNumber,
      summary: `توليد وإعداد مسير رواتب جديد لشهر ${targetMonth} بإجمالي صافي ${totalNet} ريال`
    });

    writeDb(db);
    res.json({ success: true, payroll: newPayroll, payrollList: db.financialPayroll });
  });
}
