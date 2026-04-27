import type { Locale } from "@/types";

export const dictionary = {
  app_name: { en: "LiraTrack", ar: "ليرة تراك" },
  dashboard: { en: "Dashboard", ar: "لوحة التحكم" },
  transactions: { en: "Transactions", ar: "المعاملات" },
  review_queue: { en: "Needs review", ar: "بحاجة للمراجعة" },
  wallets: { en: "Wallets", ar: "المحافظ" },
  categories: { en: "Categories", ar: "الفئات" },
  settings: { en: "Settings", ar: "الإعدادات" },
  net_worth: { en: "Net Worth", ar: "صافي الثروة" },
  total_lbp: { en: "Total LBP", ar: "إجمالي الليرة" },
  total_usd: { en: "Total USD", ar: "إجمالي الدولار" },
  projected_savings: { en: "Projected Savings", ar: "الادخار المتوقع" },
  exchange_rate: { en: "Exchange Rate", ar: "سعر الصرف" },
  pending: { en: "Needs review", ar: "قيد الانتظار" },
  confirmed: { en: "Saved", ar: "مؤكد" },
  income: { en: "Income", ar: "دخل" },
  expense: { en: "Expense", ar: "مصروف" },
  total_net_worth: { en: "Total Net Worth", ar: "إجمالي صافي الثروة" },
  live_exchange_rate: { en: "Live Exchange Rate", ar: "سعر الصرف المباشر" },
  recent_transactions: { en: "Recent Transactions", ar: "آخر المعاملات" },
  getting_started: { en: "Getting Started", ar: "البدء" },
  finish_setting_up_account: {
    en: "Finish setting up your account",
    ar: "أكمل إعداد حسابك",
  },
  finish_setting_up_account_description: {
    en: "Follow these three steps to make the app useful right away.",
    ar: "اتبع هذه الخطوات الثلاث ليصبح التطبيق جاهزًا للاستخدام مباشرة.",
  },
  add_first_wallet_step: {
    en: "Add your first wallet",
    ar: "أضف محفظتك الأولى",
  },
  add_first_wallet_step_description: {
    en: "Start with the cash wallet, bank card, or account you use most.",
    ar: "ابدأ بالمحفظة النقدية أو البطاقة أو الحساب الذي تستخدمه أكثر من غيره.",
  },
  create_first_categories_step: {
    en: "Create your first categories",
    ar: "أنشئ فئاتك الأولى",
  },
  create_first_categories_step_description: {
    en: "Add a few simple categories like groceries, salary, transport, or bills.",
    ar: "أضف بعض الفئات البسيطة مثل البقالة والراتب والمواصلات أو الفواتير.",
  },
  record_first_transaction_step: {
    en: "Record your first transaction",
    ar: "سجّل أول معاملة",
  },
  record_first_transaction_step_description: {
    en: "Once your wallet and categories are ready, add one expense or income to begin tracking.",
    ar: "بعد تجهيز المحفظة والفئات، أضف مصروفًا أو دخلًا واحدًا لتبدأ التتبع.",
  },
  add_another_wallet: { en: "Add another wallet", ar: "أضف محفظة أخرى" },
  add_another_category: { en: "Add another category", ar: "أضف فئة أخرى" },
  add_another_transaction: { en: "Add another transaction", ar: "أضف معاملة أخرى" },
  finish_wallet_and_category_first: {
    en: "Finish the wallet and category steps first.",
    ar: "أكمل خطوة المحفظة والفئات أولاً.",
  },
  task_eight_placeholder: {
    en: "Recent Transactions - Coming in Task 8",
    ar: "آخر المعاملات - قادم في المهمة 8",
  },
  updated_just_now: { en: "Updated just now", ar: "تم التحديث الآن" },
  updated_minutes_ago: {
    en: "Updated {count} mins ago",
    ar: "تم التحديث منذ {count} دقيقة",
  },
  updated_hours_ago: {
    en: "Updated {count} hrs ago",
    ar: "تم التحديث منذ {count} ساعة",
  },
  loading_dashboard: { en: "Loading dashboard...", ar: "جار تحميل لوحة التحكم..." },
  unable_to_load_dashboard: {
    en: "Unable to load dashboard data right now.",
    ar: "تعذر تحميل بيانات لوحة التحكم الآن.",
  },
  mock_session_notice: {
    en: "UI shell is ready. Add an access token in localStorage to load live backend data.",
    ar: "الواجهة جاهزة. أضف access token في localStorage لتحميل البيانات الحية من الخادم.",
  },
  coming_soon: { en: "Coming soon", ar: "قريباً" },
  portfolio_shell: { en: "Portfolio-ready shell", ar: "واجهة جاهزة للعرض" },
  updated: { en: "Updated", ar: "آخر تحديث" },
  all: { en: "All", ar: "الكل" },
  date: { en: "Date", ar: "التاريخ" },
  description: { en: "Description", ar: "الوصف" },
  merchant: { en: "Merchant", ar: "التاجر" },
  category: { en: "Category", ar: "الفئة" },
  amount: { en: "Amount", ar: "المبلغ" },
  currency: { en: "Currency", ar: "العملة" },
  status: { en: "Status", ar: "الحالة" },
  actions: { en: "Actions", ar: "الإجراءات" },
  no_transactions_found: { en: "No transactions found", ar: "لا توجد معاملات" },
  review_pending: { en: "Review transactions", ar: "مراجعة المعلّق" },
  pending_transactions_banner: {
    en: "You have {count} transactions that need review.",
    ar: "لديك {count} معاملات معلّقة بانتظار التصنيف.",
  },
  categorize: { en: "Categorize", ar: "تصنيف" },
  claim: { en: "Review", ar: "اعتماد" },
  claim_transaction: { en: "Review transaction", ar: "اعتماد المعاملة" },
  source: { en: "How it was added", ar: "المصدر" },
  select_category: { en: "Select a category", ar: "اختر فئة" },
  available_tags: { en: "Available Tags", ar: "الوسوم المتاحة" },
  no_tags_available: { en: "No tags available", ar: "لا توجد وسوم" },
  cancel: { en: "Cancel", ar: "إلغاء" },
  dismiss: { en: "Dismiss", ar: "إغلاق" },
  saving: { en: "Saving...", ar: "جار الحفظ..." },
  assign_and_confirm: { en: "Save transaction", ar: "تعيين وتأكيد" },
  visa_auto_pay: { en: "Card message", ar: "تنبيه بطاقة" },
  ocr_scan: { en: "Receipt scan", ar: "مسح OCR" },
  manual_entry: { en: "Added manually", ar: "إدخال يدوي" },
  recurring_event: { en: "Scheduled transaction", ar: "حدث متكرر" },
  recurring_events: { en: "Scheduled transactions", ar: "الأحداث المتكررة" },
  add_recurring_event: { en: "Add Scheduled Transaction", ar: "إضافة حدث متكرر" },
  add_recurring_event_description: {
    en: "Create a monthly income or expense that is saved on its scheduled day.",
    ar: "أنشئ دخلاً أو مصروفاً شهرياً يبقى معلقاً حتى يومه المحدد.",
  },
  start_date: { en: "Start Date", ar: "تاريخ البدء" },
  monthly_days: { en: "Monthly Days", ar: "أيام الشهر" },
  monthly_days_placeholder: { en: "10, 15", ar: "10, 15" },
  first_day: { en: "First day", ar: "أول يوم" },
  last_day: { en: "Last day", ar: "آخر يوم" },
  recurring_event_note: {
    en: "We create upcoming entries for this month and next month, then save them automatically on their due date.",
    ar: "ننشىء إدخالات معلقة مستقبلية لهذا الشهر والشهر التالي، ثم نؤكدها تلقائياً عند تاريخ الاستحقاق.",
  },
  create_recurring_event: { en: "Create Scheduled Transaction", ar: "إنشاء حدث متكرر" },
  creating_recurring_event: { en: "Creating scheduled transaction...", ar: "جار إنشاء الحدث المتكرر..." },
  recurring_event_created: {
    en: "Scheduled transaction created.",
    ar: "تم إنشاء الحدث المتكرر بنجاح.",
  },
  failed_to_create_recurring_event: {
    en: "Unable to create the scheduled transaction right now.",
    ar: "تعذر إنشاء الحدث المتكرر الآن.",
  },
  paste_sms: { en: "Paste SMS", ar: "لصق SMS" },
  paste_sms_description: {
    en: "Paste the bank or card SMS. We will create a draft for review even if the parsing is incomplete.",
    ar: "Paste the bank or card SMS. We will create a pending draft even if the parsing is incomplete.",
  },
  sms_message: { en: "SMS Message", ar: "رسالة SMS" },
  sms_message_placeholder: {
    en: "Paste the full SMS alert here...",
    ar: "Paste the full SMS alert here...",
  },
  create_sms_draft: { en: "Create SMS Draft", ar: "إنشاء مسودة SMS" },
  creating_sms_draft: { en: "Creating draft...", ar: "جار إنشاء المسودة..." },
  failed_to_create_sms_draft: {
    en: "Unable to create the SMS draft right now.",
    ar: "تعذر إنشاء مسودة الرسالة الآن.",
  },
  sms_draft_hint: {
    en: "If we miss the amount, wallet, or date, you can fix them later from the review draft.",
    ar: "إذا لم نلتقط المبلغ أو المحفظة أو التاريخ، يمكنك تعديلها لاحقًا من المسودة المعلقة.",
  },
  review_pending_transaction: {
    en: "Review transaction",
    ar: "مراجعة المعاملة المعلقة",
  },
  filters: { en: "Filters", ar: "الفلاتر" },
  filter_from: { en: "From", ar: "من" },
  filter_to: { en: "To", ar: "إلى" },
  clear_filters: { en: "Clear filters", ar: "مسح الفلاتر" },
  failed_to_load_transactions: {
    en: "Unable to load transactions right now.",
    ar: "تعذر تحميل المعاملات الآن.",
  },
  failed_to_load_claim_data: {
    en: "Unable to load categories or tags right now.",
    ar: "تعذر تحميل الفئات أو الوسوم الآن.",
  },
  failed_to_claim_transaction: {
    en: "Unable to claim this transaction right now.",
    ar: "تعذر اعتماد هذه المعاملة الآن.",
  },
  choose_category_first: {
    en: "Choose a category to load related tags.",
    ar: "اختر فئة لتحميل الوسوم المرتبطة.",
  },
  transaction_details: { en: "Transaction Details", ar: "تفاصيل المعاملة" },
  add_wallet: { en: "Add Wallet", ar: "إضافة محفظة" },
  add_transaction: { en: "Add Transaction", ar: "إضافة معاملة" },
  wallet_name: { en: "Wallet Name", ar: "اسم المحفظة" },
  wallet_type: { en: "Wallet Type", ar: "نوع المحفظة" },
  cash_wallet: { en: "Cash wallet", ar: "محفظة نقدية" },
  card_wallet: { en: "Card wallet", ar: "محفظة بطاقة" },
  cash_wallet_currency: { en: "Cash wallet currency", ar: "عملة المحفظة النقدية" },
  usd_wallet: { en: "USD wallet", ar: "محفظة دولار" },
  lbp_wallet: { en: "LBP wallet", ar: "محفظة ليرة" },
  usd_and_lbp_wallets: { en: "USD + LBP wallets", ar: "محفظتا دولار وليرة" },
  visa_card: { en: "Visa card", ar: "بطاقة فيزا" },
  mastercard_card: { en: "Mastercard", ar: "ماستركارد" },
  meza_card: { en: "Meza card", ar: "بطاقة ميزة" },
  usd_starting_balance: { en: "USD starting balance", ar: "رصيد الدولار الابتدائي" },
  lbp_starting_balance: { en: "LBP starting balance", ar: "رصيد الليرة الابتدائي" },
  last_four_digits: { en: "Last 4 Digits", ar: "آخر 4 أرقام" },
  current_balance: { en: "Current Balance", ar: "الرصيد الحالي" },
  optional: { en: "Optional", ar: "اختياري" },
  create_wallet: { en: "Create Wallet", ar: "إنشاء محفظة" },
  creating_wallet: { en: "Creating wallet...", ar: "جار إنشاء المحفظة..." },
  add_wallet_description: {
    en: "Create a new wallet, cash account, or card.",
    ar: "أنشئ محفظة جديدة أو حساباً نقدياً أو بطاقة.",
  },
  wallet_name_placeholder: {
    en: "Bank Audi Visa",
    ar: "محفظة نقدية",
  },
  wallet_created_failed: {
    en: "Unable to create wallet right now.",
    ar: "تعذر إنشاء المحفظة الآن.",
  },
  failed_to_load_wallets: {
    en: "Unable to load wallets right now.",
    ar: "تعذر تحميل المحافظ الآن.",
  },
  no_wallets_found: { en: "No wallets found", ar: "لا توجد محافظ" },
  wallet_card_type: { en: "Wallet type", ar: "نوع البطاقة" },
  open_wallet: { en: "Open Wallet", ar: "فتح المحفظة" },
  wallet_history: { en: "Wallet History", ar: "سجل المحفظة" },
  wallet_overview: { en: "Wallet Overview", ar: "نظرة على المحفظة" },
  wallet_transactions: { en: "Wallet Transactions", ar: "معاملات المحفظة" },
  credits: { en: "Credits", ar: "الإيداعات" },
  debits: { en: "Debits", ar: "الخصومات" },
  remove_wallet: { en: "Remove Wallet", ar: "إزالة المحفظة" },
  removing_wallet: { en: "Removing wallet...", ar: "جار إزالة المحفظة..." },
  wallet_deleted: { en: "Wallet removed successfully.", ar: "تمت إزالة المحفظة بنجاح." },
  failed_to_delete_wallet: {
    en: "Unable to remove this wallet right now.",
    ar: "تعذر إزالة هذه المحفظة الآن.",
  },
  remove_wallet_confirm_title: {
    en: "Remove this wallet?",
    ar: "إزالة هذه المحفظة؟",
  },
  remove_wallet_confirm_description: {
    en: "This hides the wallet and turns off any scheduled transactions attached to it.",
    ar: "سيتم إخفاء المحفظة وإيقاف أي معاملات مجدولة مرتبطة بها.",
  },
  wallet_not_found: { en: "Wallet not found.", ar: "المحفظة غير موجودة." },
  no_wallet_transactions: {
    en: "No transactions found for this wallet.",
    ar: "لا توجد معاملات لهذه المحفظة.",
  },
  future_transaction_date: {
    en: "Future transaction dates are not allowed.",
    ar: "لا يمكن إدخال تاريخ معاملة في المستقبل.",
  },
  add_transaction_description: {
    en: "Log a manual transaction using one of your wallets.",
    ar: "سجّل معاملة يدوية باستخدام إحدى محافظك.",
  },
  select_wallet: { en: "Select a wallet", ar: "اختر محفظة" },
  transaction_date: { en: "Transaction Date", ar: "تاريخ المعاملة" },
  create_transaction: { en: "Create Transaction", ar: "إنشاء معاملة" },
  creating_transaction: {
    en: "Creating transaction...",
    ar: "جار إنشاء المعاملة...",
  },
  transaction_created_failed: {
    en: "Unable to create transaction right now.",
    ar: "تعذر إنشاء المعاملة الآن.",
  },
  failed_to_load_transaction_form: {
    en: "Unable to load wallets or categories right now.",
    ar: "تعذر تحميل المحافظ أو الفئات الآن.",
  },
  no_wallets_available: {
    en: "No wallets available. Create one first.",
    ar: "لا توجد محافظ متاحة. أنشئ واحدة أولاً.",
  },
  no_categories_available: {
    en: "No categories available.",
    ar: "لا توجد فئات متاحة.",
  },
  add_first_wallet: {
    en: "Add your first wallet to start tracking balances.",
    ar: "أضف أول محفظة لبدء تتبع الأرصدة.",
  },
  scan_receipt: { en: "Scan Receipt", ar: "\u0645\u0633\u062d \u0627\u0644\u0625\u064a\u0635\u0627\u0644" },
  export_pdf: { en: "Export PDF", ar: "\u062a\u0635\u062f\u064a\u0631 PDF" },
  analyze_receipt: {
    en: "Analyzing receipt...",
    ar: "\u062c\u0627\u0631 \u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0625\u064a\u0635\u0627\u0644...",
  },
  upload_receipt: {
    en: "Upload receipt image",
    ar: "\u0631\u0641\u0639 \u0635\u0648\u0631\u0629 \u0627\u0644\u0625\u064a\u0635\u0627\u0644",
  },
  drop_receipt_here: {
    en: "Drag and drop a JPG or PNG here, or click to browse.",
    ar: "\u0627\u0633\u062d\u0628 \u0648\u0623\u0641\u0644\u062a \u0635\u0648\u0631\u0629 JPG \u0623\u0648 PNG \u0647\u0646\u0627 \u0623\u0648 \u0627\u0636\u063a\u0637 \u0644\u0644\u0627\u062e\u062a\u064a\u0627\u0631.",
  },
  selected_receipt: {
    en: "Selected receipt",
    ar: "\u0627\u0644\u0625\u064a\u0635\u0627\u0644 \u0627\u0644\u0645\u062d\u062f\u062f",
  },
  receipt_summary: {
    en: "Receipt Summary",
    ar: "\u0645\u0644\u062e\u0635 \u0627\u0644\u0625\u064a\u0635\u0627\u0644",
  },
  import_transactions: {
    en: "Import transactions",
    ar: "استيراد المعاملات",
  },
  import_transactions_description: {
    en: "Scan a receipt or paste a bank SMS, then review the draft before it affects your wallet.",
    ar: "امسح إيصالاً أو الصق رسالة مصرفية، ثم راجع المسودة قبل أن تؤثر على محفظتك.",
  },
  review_workspace: {
    en: "Review workspace",
    ar: "مساحة المراجعة",
  },
  review_workspace_description: {
    en: "Finish drafts from receipts, card messages, and scheduled transactions in one place.",
    ar: "أكمل مسودات الإيصالات ورسائل البطاقة والمعاملات المجدولة في مكان واحد.",
  },
  no_transactions_to_review: {
    en: "No transactions need review.",
    ar: "لا توجد معاملات بحاجة للمراجعة.",
  },
  select_transaction_to_review: {
    en: "Select a transaction to review.",
    ar: "اختر معاملة لمراجعتها.",
  },
  queue: {
    en: "Queue",
    ar: "القائمة",
  },
  open_review_workspace: {
    en: "Open review workspace",
    ar: "فتح مساحة المراجعة",
  },
  review_next: {
    en: "Review next",
    ar: "مراجعة التالي",
  },
  next: {
    en: "Next",
    ar: "التالي",
  },
  receipt_saved_for_review: {
    en: "Receipt saved for review.",
    ar: "تم حفظ الإيصال للمراجعة.",
  },
  sms_saved_for_review: {
    en: "SMS saved for review.",
    ar: "تم حفظ الرسالة للمراجعة.",
  },
  go_to_review: {
    en: "Go to review",
    ar: "الانتقال للمراجعة",
  },
  scan: { en: "Scan", ar: "\u0645\u0633\u062d" },
  save_to_pending: {
    en: "Save for review",
    ar: "\u062d\u0641\u0638 \u0643\u0645\u0639\u0644\u0651\u0642",
  },
  amount_not_detected: {
    en: "Could not detect amount. It will be saved for you to review.",
    ar: "\u062a\u0639\u0630\u0631 \u0627\u0643\u062a\u0634\u0627\u0641 \u0627\u0644\u0645\u0628\u0644\u063a. \u0633\u064a\u062a\u0645 \u062d\u0641\u0638\u0647 \u0643\u0645\u0639\u0644\u0651\u0642 \u0644\u062a\u0643\u0645\u0644\u0647 \u0644\u0627\u062d\u0642\u064b\u0627.",
  },
  receipt_scan_failed: {
    en: "Unable to scan this receipt right now.",
    ar: "\u062a\u0639\u0630\u0631 \u0645\u0633\u062d \u0647\u0630\u0627 \u0627\u0644\u0625\u064a\u0635\u0627\u0644 \u062d\u0627\u0644\u064a\u064b\u0627.",
  },
  receipt_file_too_large: {
    en: "This file is too large. Please upload a smaller image.",
    ar: "\u0647\u0630\u0627 \u0627\u0644\u0645\u0644\u0641 \u0643\u0628\u064a\u0631 \u062c\u062f\u064b\u0627. \u064a\u0631\u062c\u0649 \u0631\u0641\u0639 \u0635\u0648\u0631\u0629 \u0623\u0635\u063a\u0631.",
  },
  invalid_receipt_file: {
    en: "Please select a JPG or PNG image.",
    ar: "\u064a\u0631\u062c\u0649 \u0627\u062e\u062a\u064a\u0627\u0631 \u0635\u0648\u0631\u0629 JPG \u0623\u0648 PNG.",
  },
  upload_receipt_first: {
    en: "Choose a receipt image to scan.",
    ar: "\u0627\u062e\u062a\u0631 \u0635\u0648\u0631\u0629 \u0625\u064a\u0635\u0627\u0644 \u0644\u0644\u0645\u0633\u062d.",
  },
  export_empty_transactions: {
    en: "There are no transactions in the current filter to export.",
    ar: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0639\u0627\u0645\u0644\u0627\u062a \u0641\u064a \u0627\u0644\u0641\u0644\u062a\u0631 \u0627\u0644\u062d\u0627\u0644\u064a \u0644\u062a\u0635\u062f\u064a\u0631\u0647\u0627.",
  },
  export_empty_transactions_title: {
    en: "Nothing to export",
    ar: "لا يوجد ما يمكن تصديره",
  },
  checking_session: {
    en: "Checking your session...",
    ar: "\u062c\u0627\u0631 \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u062c\u0644\u0633\u062a\u0643...",
  },
  login: { en: "Login", ar: "\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644" },
  logout: { en: "Logout", ar: "\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c" },
  register: { en: "Register", ar: "\u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628" },
  email: { en: "Email", ar: "\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a" },
  password: { en: "Password", ar: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631" },
  confirm_password: { en: "Confirm Password", ar: "\u062a\u0623\u0643\u064a\u062f \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631" },
  login_with_google: {
    en: "Login with Google",
    ar: "\u0627\u0644\u062f\u062e\u0648\u0644 \u0628\u0627\u0633\u062a\u062e\u062f\u0627\u0645 Google",
  },
  sign_up_with_google: {
    en: "Sign up with Google",
    ar: "\u0627\u0644\u062a\u0633\u062c\u064a\u0644 \u0628\u0627\u0633\u062a\u062e\u062f\u0627\u0645 Google",
  },
  forgot_password_placeholder: {
    en: "Forgot password? Coming soon.",
    ar: "\u0647\u0644 \u0646\u0633\u064a\u062a \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631\u061f \u0642\u0631\u064a\u0628\u064b\u0627.",
  },
  no_account_yet: {
    en: "Don't have an account?",
    ar: "\u0644\u0627 \u062a\u0645\u0644\u0643 \u062d\u0633\u0627\u0628\u064b\u0627\u061f",
  },
  already_have_account: {
    en: "Already have an account?",
    ar: "\u0644\u062f\u064a\u0643 \u062d\u0633\u0627\u0628 \u0628\u0627\u0644\u0641\u0639\u0644\u061f",
  },
  sign_in_to_continue: {
    en: "Sign in to continue to your dashboard.",
    ar: "\u0633\u062c\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0644\u0644\u0645\u062a\u0627\u0628\u0639\u0629 \u0625\u0644\u0649 \u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645.",
  },
  create_your_account: {
    en: "Create your account to start tracking money.",
    ar: "\u0623\u0646\u0634\u0626 \u062d\u0633\u0627\u0628\u0643 \u0644\u0628\u062f\u0621 \u062a\u062a\u0628\u0639 \u0627\u0644\u0623\u0645\u0648\u0627\u0644.",
  },
  auth_welcome: {
    en: "Welcome back",
    ar: "\u0645\u0631\u062d\u0628\u064b\u0627 \u0628\u0639\u0648\u062f\u062a\u0643",
  },
  create_account: {
    en: "Create account",
    ar: "\u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628",
  },
  logging_in: { en: "Logging in...", ar: "\u062c\u0627\u0631 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644..." },
  creating_account: {
    en: "Creating account...",
    ar: "\u062c\u0627\u0631 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062d\u0633\u0627\u0628...",
  },
  failed_to_login: {
    en: "Unable to log in with these credentials.",
    ar: "\u062a\u0639\u0630\u0631 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0628\u0647\u0630\u0647 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a.",
  },
  login_requires_verified_email: {
    en: "Verify your email first before logging in.",
    ar: "Verify your email first before logging in.",
  },
  login_credentials_invalid: {
    en: "Email or password is incorrect.",
    ar: "Email or password is incorrect.",
  },
  failed_to_register: {
    en: "Unable to create your account right now.",
    ar: "\u062a\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u062d\u0633\u0627\u0628\u0643 \u062d\u0627\u0644\u064a\u064b\u0627.",
  },
  email_already_registered: {
    en: "This email is already registered.",
    ar: "This email is already registered.",
  },
  email_invalid_format: {
    en: "Enter a valid email address.",
    ar: "أدخل بريدًا إلكترونيًا صحيحًا.",
  },
  phone_already_registered: {
    en: "This phone number is associated with another account.",
    ar: "رقم الهاتف هذا مرتبط بحساب آخر.",
  },
  phone_invalid_format: {
    en: "Enter a valid phone number for the selected country.",
    ar: "أدخل رقم هاتف صحيحًا للدولة المحددة.",
  },
  phone_digits_only: {
    en: "Phone number must contain digits only.",
    ar: "يجب أن يحتوي رقم الهاتف على أرقام فقط.",
  },
  full_name_too_short: {
    en: "Enter your full name.",
    ar: "أدخل اسمك الكامل.",
  },
  invalid_otp_code: {
    en: "This verification code is invalid.",
    ar: "This verification code is invalid.",
  },
  expired_otp_code: {
    en: "This verification code expired. Request a new one.",
    ar: "This verification code expired. Request a new one.",
  },
  passwords_do_not_match: {
    en: "Passwords do not match.",
    ar: "\u0643\u0644\u0645\u062a\u0627 \u0627\u0644\u0645\u0631\u0648\u0631 \u063a\u064a\u0631 \u0645\u062a\u0637\u0627\u0628\u0642\u062a\u064a\u0646.",
  },
  password_too_short: {
    en: "Password must be at least 8 characters.",
    ar: "\u064a\u062c\u0628 \u0623\u0646 \u062a\u0643\u0648\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 8 \u0623\u062d\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644.",
  },
  new_password_must_be_different: {
    en: "New password must be different from the current password.",
    ar: "New password must be different from the current password.",
  },
  registration_success: {
    en: "Account created. You can log in now.",
    ar: "\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062d\u0633\u0627\u0628. \u064a\u0645\u0643\u0646\u0643 \u0627\u0644\u062f\u062e\u0648\u0644 \u0627\u0644\u0622\u0646.",
  },
  two_factor_title: {
    en: "Two-factor verification",
    ar: "\u0627\u0644\u062a\u062d\u0642\u0642 \u0628\u062e\u0637\u0648\u062a\u064a\u0646",
  },
  two_factor_description: {
    en: "Enter your 6-digit code from Google Authenticator.",
    ar: "\u0623\u062f\u062e\u0644 \u0631\u0645\u0632\u0643 \u0627\u0644\u0645\u0643\u0648\u0646 \u0645\u0646 6 \u0623\u0631\u0642\u0627\u0645 \u0645\u0646 Google Authenticator.",
  },
  verification_code: { en: "Verification Code", ar: "\u0631\u0645\u0632 \u0627\u0644\u062a\u062d\u0642\u0642" },
  verify_code: { en: "Verify Code", ar: "\u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u0631\u0645\u0632" },
  verifying: { en: "Verifying...", ar: "\u062c\u0627\u0631 \u0627\u0644\u062a\u062d\u0642\u0642..." },
  failed_to_verify_2fa: {
    en: "Unable to verify your 2FA code.",
    ar: "\u062a\u0639\u0630\u0631 \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0631\u0645\u0632 \u0627\u0644\u062a\u062d\u0642\u0642.",
  },
  invalid_google_callback: {
    en: "Missing login tokens from Google callback.",
    ar: "\u062a\u0639\u0630\u0631 \u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u0631\u0645\u0648\u0632 \u0627\u0644\u062f\u062e\u0648\u0644 \u0645\u0646 Google.",
  },
  completing_login: {
    en: "Completing your login...",
    ar: "\u062c\u0627\u0631 \u0625\u0643\u0645\u0627\u0644 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644...",
  },
  profile: { en: "Profile", ar: "\u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062e\u0635\u064a" },
  security: { en: "Security", ar: "\u0627\u0644\u0623\u0645\u0627\u0646" },
  profile_settings: {
    en: "Profile Settings",
    ar: "\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062e\u0635\u064a",
  },
  security_settings: {
    en: "Security Settings",
    ar: "\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0623\u0645\u0627\u0646",
  },
  manage_profile_security: {
    en: "Manage your profile and account security.",
    ar: "\u0623\u062f\u0631 \u0645\u0644\u0641\u0643 \u0627\u0644\u0634\u062e\u0635\u064a \u0648\u0623\u0645\u0627\u0646 \u062d\u0633\u0627\u0628\u0643.",
  },
  preferred_language: {
    en: "Preferred Language",
    ar: "\u0627\u0644\u0644\u063a\u0629 \u0627\u0644\u0645\u0641\u0636\u0644\u0629",
  },
  english: { en: "English", ar: "\u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a\u0629" },
  arabic: { en: "Arabic", ar: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629" },
  saved: { en: "Saved", ar: "\u062a\u0645 \u0627\u0644\u062d\u0641\u0638" },
  profile_updated: {
    en: "Profile updated successfully.",
    ar: "\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062e\u0635\u064a \u0628\u0646\u062c\u0627\u062d.",
  },
  failed_to_load_profile: {
    en: "Unable to load your profile right now.",
    ar: "\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0645\u0644\u0641\u0643 \u0627\u0644\u0634\u062e\u0635\u064a \u0627\u0644\u0622\u0646.",
  },
  failed_to_update_profile: {
    en: "Unable to update your profile right now.",
    ar: "\u062a\u0639\u0630\u0631 \u062a\u062d\u062f\u064a\u062b \u0645\u0644\u0641\u0643 \u0627\u0644\u0634\u062e\u0635\u064a \u0627\u0644\u0622\u0646.",
  },
  account_email: { en: "Account Email", ar: "\u0628\u0631\u064a\u062f \u0627\u0644\u062d\u0633\u0627\u0628" },
  security_overview: {
    en: "Protect your account and keep your access secure.",
    ar: "\u0627\u062d\u0645 \u062d\u0633\u0627\u0628\u0643 \u0648\u062d\u0627\u0641\u0638 \u0639\u0644\u0649 \u0623\u0645\u0627\u0646 \u0627\u0644\u0648\u0635\u0648\u0644.",
  },
  two_factor_disabled: {
    en: "Your account is not protected with 2FA.",
    ar: "\u062d\u0633\u0627\u0628\u0643 \u063a\u064a\u0631 \u0645\u062d\u0645\u064a \u0628\u0627\u0644\u062a\u062d\u0642\u0642 \u0628\u062e\u0637\u0648\u062a\u064a\u0646.",
  },
  enable_two_factor: {
    en: "Enable 2FA",
    ar: "\u062a\u0641\u0639\u064a\u0644 \u0627\u0644\u062a\u062d\u0642\u0642 \u0628\u062e\u0637\u0648\u062a\u064a\u0646",
  },
  two_factor_active: {
    en: "Two-Factor Authentication is Active.",
    ar: "\u0627\u0644\u062a\u062d\u0642\u0642 \u0628\u062e\u0637\u0648\u062a\u064a\u0646 \u0646\u0634\u0637.",
  },
  disable_two_factor: {
    en: "Disable 2FA",
    ar: "\u0625\u064a\u0642\u0627\u0641 \u0627\u0644\u062a\u062d\u0642\u0642 \u0628\u062e\u0637\u0648\u062a\u064a\u0646",
  },
  contact_support_disable_2fa: {
    en: "Contact support to disable 2FA.",
    ar: "\u062a\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u062f\u0639\u0645 \u0644\u0625\u064a\u0642\u0627\u0641 \u0627\u0644\u062a\u062d\u0642\u0642 \u0628\u062e\u0637\u0648\u062a\u064a\u0646.",
  },
  scan_qr_code: {
    en: "Scan this QR code with Google Authenticator.",
    ar: "\u0627\u0645\u0633\u062d \u0631\u0645\u0632 QR \u0647\u0630\u0627 \u0628\u0648\u0627\u0633\u0637\u0629 Google Authenticator.",
  },
  manual_secret: {
    en: "Manual secret key",
    ar: "\u0645\u0641\u062a\u0627\u062d \u0633\u0631\u064a \u064a\u062f\u0648\u064a",
  },
  enter_six_digit_code: {
    en: "Enter 6-digit code",
    ar: "\u0623\u062f\u062e\u0644 \u0631\u0645\u0632\u064b\u0627 \u0645\u0643\u0648\u0646\u064b\u0627 \u0645\u0646 6 \u0623\u0631\u0642\u0627\u0645",
  },
  verify_enable: {
    en: "Verify & Enable",
    ar: "\u062a\u062d\u0642\u0642 \u0648\u062a\u0641\u0639\u064a\u0644",
  },
  failed_to_setup_2fa: {
    en: "Unable to start 2FA setup right now.",
    ar: "\u062a\u0639\u0630\u0631 \u0628\u062f\u0621 \u0625\u0639\u062f\u0627\u062f 2FA \u0627\u0644\u0622\u0646.",
  },
  failed_to_enable_2fa: {
    en: "Unable to enable 2FA right now.",
    ar: "\u062a\u0639\u0630\u0631 \u062a\u0641\u0639\u064a\u0644 2FA \u0627\u0644\u0622\u0646.",
  },
  two_factor_enabled_success: {
    en: "2FA enabled successfully.",
    ar: "\u062a\u0645 \u062a\u0641\u0639\u064a\u0644 2FA \u0628\u0646\u062c\u0627\u062d.",
  },
  change_password: {
    en: "Change Password",
    ar: "\u062a\u063a\u064a\u064a\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631",
  },
  current_password: {
    en: "Current Password",
    ar: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062d\u0627\u0644\u064a\u0629",
  },
  new_password: {
    en: "New Password",
    ar: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062c\u062f\u064a\u062f\u0629",
  },
  confirm_new_password: {
    en: "Confirm New Password",
    ar: "\u062a\u0623\u0643\u064a\u062f \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062c\u062f\u064a\u062f\u0629",
  },
  password_changed_success: {
    en: "Password changed successfully.",
    ar: "\u062a\u0645 \u062a\u063a\u064a\u064a\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0628\u0646\u062c\u0627\u062d.",
  },
  failed_to_change_password: {
    en: "Unable to change your password right now.",
    ar: "\u062a\u0639\u0630\u0631 \u062a\u063a\u064a\u064a\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u0622\u0646.",
  },
  save_changes: {
    en: "Save Changes",
    ar: "\u062d\u0641\u0638 \u0627\u0644\u062a\u063a\u064a\u064a\u0631\u0627\u062a",
  },
  settings_section_profile: {
    en: "Update how your account appears in the app.",
    ar: "\u062d\u062f\u0651\u062b \u0643\u064a\u0641 \u064a\u0638\u0647\u0631 \u062d\u0633\u0627\u0628\u0643 \u0641\u064a \u0627\u0644\u062a\u0637\u0628\u064a\u0642.",
  },
  settings_section_security: {
    en: "Manage authentication and password settings.",
    ar: "\u0623\u062f\u0631 \u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u062f\u062e\u0648\u0644 \u0648\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631.",
  },
  forgot_password: { en: "Forgot Password?", ar: "Forgot Password?" },
  full_name: { en: "Full Name", ar: "Full Name" },
  phone_number: { en: "Phone Number", ar: "Phone Number" },
  gender: { en: "Gender", ar: "Gender" },
  male: { en: "Male", ar: "Male" },
  female: { en: "Female", ar: "Female" },
  prefer_not_to_say: { en: "Prefer not to say", ar: "Prefer not to say" },
  verify_your_email: { en: "Verify your email", ar: "Verify your email" },
  verify_email_notice: {
    en: "Enter the 6-digit code we sent to your email address.",
    ar: "Enter the 6-digit code we sent to your email address.",
  },
  complete_signup_with_verification: {
    en: "Check your email, enter the code, and we will finish creating your session.",
    ar: "Check your email, enter the code, and we will finish creating your session.",
  },
  verify_email: { en: "Verify Email", ar: "Verify Email" },
  resend_code: { en: "Resend Code", ar: "Resend Code" },
  email_verified_success: {
    en: "Your email has been verified successfully.",
    ar: "Your email has been verified successfully.",
  },
  verification_code_sent_to_email: {
    en: "We sent a 6-digit verification code to {email}.",
    ar: "We sent a 6-digit verification code to {email}.",
  },
  verification_code_resent: {
    en: "A new verification code has been sent.",
    ar: "A new verification code has been sent.",
  },
  resend_verification_code_in: {
    en: "Resend code in {time}",
    ar: "Resend code in {time}",
  },
  verification_code_resend_wait: {
    en: "Please wait {time} before requesting another verification code.",
    ar: "Please wait {time} before requesting another verification code.",
  },
  verification_delivery_failed: {
    en: "Email delivery is not configured or is failing right now.",
    ar: "Email delivery is not configured or is failing right now.",
  },
  verification_failed: {
    en: "Unable to verify your email right now.",
    ar: "Unable to verify your email right now.",
  },
  rate_unavailable: { en: "Rate unavailable", ar: "Rate unavailable" },
  recent_activity: { en: "Recent activity", ar: "Recent activity" },
  all_categories: { en: "All Categories", ar: "All Categories" },
  no_description: { en: "No description", ar: "No description" },
  uncategorized: { en: "Uncategorized", ar: "Uncategorized" },
  add_password: { en: "Add Password", ar: "Add Password" },
  add_password_description: {
    en: "Create a password for this Google account so you can log in later with email and password too.",
    ar: "Create a password for this Google account so you can log in later with email and password too.",
  },
  set_password_notice: {
    en: "Your account currently uses Google sign-in only. Add a password to enable email and password login too.",
    ar: "Your account currently uses Google sign-in only. Add a password to enable email and password login too.",
  },
  password_set_success: {
    en: "Password added successfully.",
    ar: "Password added successfully.",
  },
  failed_to_set_password: {
    en: "Unable to add a password right now.",
    ar: "Unable to add a password right now.",
  },
  request_reset_code: { en: "Request reset code", ar: "Request reset code" },
  reset_password: { en: "Reset Password", ar: "Reset Password" },
  otp_code: { en: "OTP Code", ar: "OTP Code" },
  reset_code_sent: {
    en: "If the email exists, a reset code has been sent.",
    ar: "If the email exists, a reset code has been sent.",
  },
  reset_code_email_sent: {
    en: "We sent a reset code to your email.",
    ar: "أرسلنا رمز إعادة التعيين إلى بريدك الإلكتروني.",
  },
  resend_reset_code: { en: "Resend reset code", ar: "إعادة إرسال رمز التعيين" },
  resend_reset_code_in: {
    en: "Resend reset code in {time}",
    ar: "إعادة إرسال رمز التعيين خلال {time}",
  },
  reset_code_resend_wait: {
    en: "Please wait {time} before requesting another reset code.",
    ar: "يرجى الانتظار {time} قبل طلب رمز إعادة تعيين آخر.",
  },
  reset_password_failed: {
    en: "Unable to reset the password right now.",
    ar: "Unable to reset the password right now.",
  },
  send_code: { en: "Send Code", ar: "Send Code" },
  back_to_login: { en: "Back to login", ar: "Back to login" },
  add_category: { en: "Add Category", ar: "Add Category" },
  add_category_description: {
    en: "Create a category to organize transactions and filters.",
    ar: "Create a category to organize transactions and filters.",
  },
  category_name: {
    en: "Category Name",
    ar: "Category Name",
  },
  category_name_placeholder: {
    en: "Groceries / بقالة",
    ar: "Groceries / بقالة",
  },
  category_name_english: {
    en: "Category Name (English)",
    ar: "Category Name (English)",
  },
  category_name_arabic: {
    en: "Category Name (Arabic)",
    ar: "Category Name (Arabic)",
  },
  failed_to_create_category: {
    en: "Unable to create the category right now.",
    ar: "Unable to create the category right now.",
  },
  converted_from_lbp: {
    en: "Converted from {amount}",
    ar: "Converted from {amount}",
  },
  refresh_rate: {
    en: "Refresh rate",
    ar: "Refresh rate",
  },
  refreshing_rate: {
    en: "Refreshing...",
    ar: "Refreshing...",
  },
  refreshed_from: {
    en: "Updated at {time}",
    ar: "تم التحديث عند {time}",
  },
  start_guided_tour: {
    en: "Start guided tour",
    ar: "ابدأ الجولة الإرشادية",
  },
  usd_wallets_total: {
    en: "USD wallets total",
    ar: "إجمالي محافظ الدولار",
  },
  lbp_wallets_total: {
    en: "LBP wallets total",
    ar: "إجمالي محافظ الليرة",
  },
  net_worth_usd: {
    en: "Net worth in USD",
    ar: "صافي الثروة بالدولار",
  },
  rate_used: {
    en: "Rate used",
    ar: "سعر الصرف المستخدم",
  },
  native_usd_balances_only: {
    en: "Native USD balances only",
    ar: "أرصدة الدولار فقط",
  },
  native_lbp_balances_only: {
    en: "Native LBP balances only",
    ar: "أرصدة الليرة فقط",
  },
  all_wallets_converted_usd: {
    en: "All wallets converted into USD",
    ar: "كل المحافظ محوّلة إلى الدولار",
  },
  applied_to_lbp_conversion: {
    en: "Applied to LBP conversion",
    ar: "مستخدم لتحويل الليرة",
  },
  wallet_balances: { en: "Wallet Balances", ar: "أرصدة المحافظ" },
  wallet_balances_description: {
    en: "Each wallet balance is shown separately while total net worth combines them all.",
    ar: "يتم عرض رصيد كل محفظة بشكل منفصل بينما يجمع صافي الثروة الإجمالي الكل.",
  },
  included_in_total_net_worth: {
    en: "Included in total net worth",
    ar: "محتسب ضمن صافي الثروة الإجمالي",
  },
  approx_usd_value: {
    en: "Approx. {amount}",
    ar: "تقريباً {amount}",
  },
  type: { en: "Type", ar: "Type" },
  delete_account: { en: "Delete Account", ar: "حذف الحساب" },
  deleting_account: { en: "Deleting account...", ar: "جار حذف الحساب..." },
  delete_account_description: {
    en: "Delete your account and all of its wallets, transactions, categories, and settings permanently.",
    ar: "احذف حسابك وكل محافظه ومعاملاته وفئاته وإعداداته نهائياً.",
  },
  delete_account_confirm: {
    en: "Delete your account permanently? This cannot be undone.",
    ar: "هل تريد حذف حسابك نهائياً؟ لا يمكن التراجع عن هذا الإجراء.",
  },
  delete_account_confirm_title: {
    en: "Delete your account?",
    ar: "حذف حسابك؟",
  },
  failed_to_delete_account: {
    en: "Unable to delete your account right now.",
    ar: "تعذر حذف حسابك الآن.",
  },
  edit_transaction: { en: "Edit", ar: "تعديل" },
  delete_transaction: { en: "Delete", ar: "حذف" },
  edit_transaction_title: { en: "Edit transaction", ar: "تعديل المعاملة" },
  delete_transaction_title: { en: "Delete transaction?", ar: "حذف المعاملة؟" },
  delete_transaction_description: {
    en: "This removes the transaction and reverses its wallet balance impact.",
    ar: "سيتم حذف المعاملة وعكس تأثيرها على رصيد المحفظة.",
  },
  transaction_updated: {
    en: "Transaction updated.",
    ar: "تم تحديث المعاملة.",
  },
  transaction_deleted: {
    en: "Transaction deleted.",
    ar: "تم حذف المعاملة.",
  },
  failed_to_update_transaction: {
    en: "Unable to update this transaction right now.",
    ar: "تعذر تحديث هذه المعاملة الآن.",
  },
  failed_to_delete_transaction: {
    en: "Unable to delete this transaction right now.",
    ar: "تعذر حذف هذه المعاملة الآن.",
  },
  support_notice_title: {
    en: "Contact support",
    ar: "تواصل مع الدعم",
  },
} as const;

export type DictionaryKey = keyof typeof dictionary;

export function t(
  key: DictionaryKey,
  locale: Locale,
  params?: Record<string, string | number>,
): string {
  const template = String(dictionary[key][locale]);

  if (!params) {
    return template;
  }

  return Object.entries(params).reduce<string>((result, [paramKey, value]) => {
    return result.replace(`{${paramKey}}`, String(value));
  }, template);
}
