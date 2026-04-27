export type Numeric = string | number;

export type Locale = "en" | "ar";
export type Currency = "LBP" | "USD";
export type CategoryType = "income" | "expense";
export type LifecycleType = "standard" | "monthly" | "event";
export type TransactionStatus = "confirmed" | "pending";
export type TransactionSource = "manual" | "ocr" | "auto_card" | "recurring";
export type Gender = "male" | "female" | "prefer_not_to_say";
export type CardType =
  | "Visa"
  | "Mastercard"
  | "Cash_LBP"
  | "Cash_USD"
  | "Meza"
  | string;

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  phone_number: string | null;
  gender: Gender | null;
  preferred_language: string;
  default_currency: string;
  email_verified: boolean;
  auth_provider: string;
  has_password: boolean;
  two_factor_enabled: boolean;
  created_at: string;
}

export type UserResponse = User;

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserCreate {
  full_name: string;
  email: string;
  phone_number: string;
  phone_country: string;
  gender: Gender;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface MessageResponse {
  message: string;
  retry_after_seconds?: number;
}

export interface PasswordResetCodeResponse {
  message: string;
  retry_after_seconds: number;
}

export interface RegisterResponse {
  email: string;
  email_verification_required: boolean;
}

export interface LoginResponse {
  requires_2fa: boolean;
  temp_token: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_type: string;
}

export interface Institution {
  id: number;
  user_id: number;
  name: string;
  card_type: CardType;
  last_four_digits: string | null;
  current_balance: Numeric;
  is_active: boolean;
  created_at: string;
  formatted_balance?: string;
}

export interface InstitutionCreate {
  name: string;
  card_type: "Visa" | "Mastercard" | "Cash_LBP" | "Cash_USD" | "Meza";
  last_four_digits?: string | null;
  current_balance: Numeric;
}

export interface Category {
  id: number;
  user_id: number;
  name_en: string;
  name_ar: string;
  type: CategoryType;
  lifecycle_type: LifecycleType;
  fixed_monthly_amount?: Numeric | null;
  event_date?: string | null;
  event_amount?: Numeric | null;
  icon?: string | null;
  created_at?: string;
}

export interface Tag {
  id: number;
  user_id?: number;
  category_id?: number | null;
  name_en: string;
  name_ar: string;
  created_at?: string;
}

export interface Transaction {
  id: number;
  user_id: number;
  institution_id: number | null;
  category: Pick<Category, "id" | "name_en" | "name_ar" | "type"> | null;
  amount: Numeric;
  currency: Currency;
  usd_equivalent: Numeric;
  description: string | null;
  transaction_date: string;
  status: TransactionStatus;
  source: TransactionSource;
  tags: Array<Pick<Tag, "id" | "name_en" | "name_ar">>;
  created_at: string;
}

export interface TransactionCreate {
  institution_id?: number | null;
  category_id?: number | null;
  amount: Numeric;
  currency: Currency;
  exchange_rate_id?: number | null;
  usd_equivalent?: Numeric | null;
  description?: string | null;
  transaction_date: string;
  tag_ids?: number[] | null;
}

export interface TransactionUpdatePayload {
  description?: string | null;
  category_id?: number | null;
  tag_ids?: number[] | null;
}

export interface ClaimPendingPayload {
  institution_id?: number | null;
  amount: Numeric;
  currency: Currency;
  description?: string | null;
  transaction_date: string;
  category_id: number;
  tag_ids: number[];
}

export interface SmsTransactionCreatePayload {
  raw_text: string;
  institution_id?: number | null;
}

export interface RecurringScheduleCreatePayload {
  institution_id: number;
  category_id: number;
  amount: Numeric;
  currency: Currency;
  description?: string | null;
  start_date: string;
  monthly_days: number[];
  include_last_day: boolean;
}

export interface RecurringSchedule {
  id: number;
  user_id: number;
  institution_id: number;
  category_id: number;
  amount: Numeric;
  currency: Currency;
  description?: string | null;
  start_date: string;
  monthly_days: number[];
  include_last_day: boolean;
  is_active: boolean;
  created_at: string;
}

export interface PaginatedTransactionResponse {
  items: Transaction[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface NetWorthData {
  total_lbp: Numeric;
  total_usd: Numeric;
  total_net_worth_usd: Numeric;
  latest_rate: Numeric | null;
  rate_timestamp: string | null;
}

export interface ForecastData {
  expected_income: Numeric;
  expected_expenses: Numeric;
  projected_savings: Numeric;
}

export interface LatestRateData {
  rate: Numeric | null;
  rate_timestamp: string | null;
}

export interface OCRScanResult {
  id: number;
  merchant: string;
  amount: Numeric | null;
  currency: string;
  transaction_date: string;
  description: string | null;
  raw_text: string;
  status: "pending";
  source: "ocr";
}

export interface ProfileUpdatePayload {
  full_name: string;
  phone_number: string;
  phone_country: string;
  gender: Gender;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export interface SetPasswordPayload {
  new_password: string;
}

export interface VerifyEmailPayload {
  email: string;
  otp: string;
}

export interface TwoFASetupResponse {
  qr_code_base64: string;
  secret: string;
}

export interface CreateCategoryPayload {
  name_en: string;
  name_ar: string;
  type: CategoryType;
  lifecycle_type?: LifecycleType;
  icon?: string | null;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  email: string;
  otp: string;
  new_password: string;
}

export interface ContactAdminPayload {
  name: string;
  email: string;
  message: string;
}
