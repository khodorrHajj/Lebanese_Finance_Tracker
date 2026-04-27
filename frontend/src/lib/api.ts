import axios from "axios";

import type {
  ChangePasswordPayload,
  Category,
  ClaimPendingPayload,
  ContactAdminPayload,
  CreateCategoryPayload,
  ForecastData,
  ForgotPasswordPayload,
  Institution,
  InstitutionCreate,
  LatestRateData,
  LoginResponse,
  LoginRequest,
  MessageResponse,
  NetWorthData,
  OCRScanResult,
  PaginatedTransactionResponse,
  PasswordResetCodeResponse,
  ProfileUpdatePayload,
  RecurringSchedule,
  RecurringScheduleCreatePayload,
  RegisterResponse,
  ResetPasswordPayload,
  SetPasswordPayload,
  Tag,
  TokenResponse,
  Transaction,
  TransactionCreate,
  TransactionStatus,
  TransactionUpdatePayload,
  SmsTransactionCreatePayload,
  TwoFASetupResponse,
  UserCreate,
  UserResponse,
  VerifyEmailPayload,
} from "@/types";

const baseURL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("access_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.log("Session expired");
    }

    return Promise.reject(error);
  },
);

export async function fetchNetWorth(): Promise<NetWorthData> {
  const { data } = await api.get<NetWorthData>("/analytics/net-worth");
  return data;
}

export async function fetchCurrentUser(): Promise<UserResponse> {
  const { data } = await api.get<UserResponse>("/auth/me");
  return data;
}

export async function getUserProfile(): Promise<UserResponse> {
  return fetchCurrentUser();
}

export async function loginAPI(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const payload: LoginRequest = { email, password };
  const { data } = await api.post<LoginResponse>("/auth/login", payload);
  return data;
}

export async function registerAPI(
  payload: UserCreate,
): Promise<RegisterResponse> {
  const { data } = await api.post<RegisterResponse>("/auth/register", payload);
  return data;
}

export async function verify2FA(
  tempToken: string,
  code: string,
): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>("/auth/verify-2fa", {
    temp_token: tempToken,
    totp_code: code,
  });
  return data;
}

export async function getGoogleAuthURL(): Promise<{ url: string }> {
  const { data } = await api.get<{ url: string }>("/auth/google/auth-url");
  return data;
}

export async function updateUserProfile(
  payload: ProfileUpdatePayload,
): Promise<UserResponse> {
  const { data } = await api.put<UserResponse>("/auth/profile", payload);
  return data;
}

export async function deleteCurrentUser(): Promise<MessageResponse> {
  const { data } = await api.delete<MessageResponse>("/auth/me");
  return data;
}

export async function changePassword(
  payload: ChangePasswordPayload,
): Promise<MessageResponse> {
  const { data } = await api.post<MessageResponse>("/auth/change-password", payload);
  return data;
}

export async function setPassword(
  payload: SetPasswordPayload,
): Promise<MessageResponse> {
  const { data } = await api.post<MessageResponse>("/auth/set-password", payload);
  return data;
}

export async function verifyEmail(
  payload: VerifyEmailPayload,
): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>("/auth/verify-email", payload);
  return data;
}

export async function resendEmailVerificationForEmail(
  email: string,
): Promise<MessageResponse> {
  const { data } = await api.post<MessageResponse>("/auth/resend-email-verification", {
    email,
  });
  return data;
}

export async function setup2FA(): Promise<TwoFASetupResponse> {
  const { data } = await api.post<TwoFASetupResponse>("/auth/setup-2fa");
  return data;
}

export async function enable2FA(
  payload: { totp_code: string },
): Promise<MessageResponse> {
  const { data } = await api.post<MessageResponse>("/auth/enable-2fa", payload);
  return data;
}

export async function fetchForecast(): Promise<ForecastData> {
  const { data } = await api.get<ForecastData>("/analytics/forecast");
  return data;
}

export async function fetchLatestRate(): Promise<LatestRateData> {
  const { data } = await api.get<{
    id: number;
    rate: string | number;
    source: string;
    recorded_at: string;
  }>("/rates/latest");

  return {
    rate: data.rate,
    rate_timestamp: data.recorded_at,
  };
}

export async function fetchTransactions(filters: {
  institution_id?: number;
  category_id?: number;
  status?: "all" | TransactionStatus;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}): Promise<Transaction[]> {
  const params = new URLSearchParams();

  if (filters.institution_id !== undefined) {
    params.set("institution_id", String(filters.institution_id));
  }
  if (filters.category_id !== undefined) {
    params.set("category_id", String(filters.category_id));
  }
  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status);
  }
  if (filters.start_date) {
    params.set("start_date", filters.start_date);
  }
  if (filters.end_date) {
    params.set("end_date", filters.end_date);
  }
  if (filters.page !== undefined) {
    params.set("page", String(filters.page));
  }
  if (filters.page_size !== undefined) {
    params.set("page_size", String(filters.page_size));
  }

  const query = params.toString();
  const endpoint = query ? `/transactions?${query}` : "/transactions";
  const { data } = await api.get<PaginatedTransactionResponse>(endpoint);
  return data.items;
}

export async function fetchPendingTransactions(): Promise<Transaction[]> {
  return fetchTransactions({ status: "pending", page_size: 100 });
}

export async function fetchCategories(): Promise<Category[]> {
  const { data } = await api.get<Category[]>("/categories");
  return data;
}

export async function createCategory(
  payload: CreateCategoryPayload,
): Promise<Category> {
  const { data } = await api.post<Category>("/categories", payload);
  return data;
}

export async function fetchWallets(): Promise<Institution[]> {
  const { data } = await api.get<Institution[]>("/wallets");
  return data;
}

export async function fetchWallet(walletId: number): Promise<Institution> {
  const { data } = await api.get<Institution>(`/wallets/${walletId}`);
  return data;
}

export async function fetchTags(category_id?: number): Promise<Tag[]> {
  const endpoint =
    category_id !== undefined ? `/tags?category_id=${category_id}` : "/tags";
  const { data } = await api.get<Tag[]>(endpoint);
  return data;
}

export async function createWallet(
  payload: InstitutionCreate,
): Promise<Institution> {
  const { data } = await api.post<Institution>("/wallets", payload);
  return data;
}

export async function deleteWallet(walletId: number): Promise<MessageResponse> {
  const { data } = await api.delete<MessageResponse>(`/wallets/${walletId}`);
  return data;
}

export async function createTransaction(
  payload: TransactionCreate,
): Promise<Transaction> {
  const { data } = await api.post<Transaction>("/transactions/", payload);
  return data;
}

export async function updateTransaction(
  transactionId: number,
  payload: TransactionUpdatePayload,
): Promise<Transaction> {
  const { data } = await api.put<Transaction>(
    `/transactions/${transactionId}`,
    payload,
  );
  return data;
}

export async function deleteTransaction(
  transactionId: number,
): Promise<MessageResponse> {
  const { data } = await api.delete<MessageResponse>(
    `/transactions/${transactionId}`,
  );
  return data;
}

export async function createRecurringSchedule(
  payload: RecurringScheduleCreatePayload,
): Promise<RecurringSchedule> {
  const { data } = await api.post<RecurringSchedule>("/recurring-schedules", payload);
  return data;
}

export async function claimTransaction(
  transactionId: number,
  payload: ClaimPendingPayload,
): Promise<Transaction> {
  const { data } = await api.post<Transaction>(
    `/transactions/claim-pending/${transactionId}`,
    payload,
  );
  return data;
}

export async function createTransactionFromSms(
  payload: SmsTransactionCreatePayload,
): Promise<Transaction> {
  const { data } = await api.post<Transaction>("/transactions/from-sms", payload);
  return data;
}

export async function scanReceipt(file: File): Promise<OCRScanResult> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post<OCRScanResult>("/ocr/scan-receipt", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data;
}

export async function requestPasswordReset(
  payload: ForgotPasswordPayload,
): Promise<PasswordResetCodeResponse> {
  const { data } = await api.post<PasswordResetCodeResponse>("/auth/forgot-password", payload);
  return data;
}

export async function resendPasswordResetCode(
  payload: ForgotPasswordPayload,
): Promise<PasswordResetCodeResponse> {
  const { data } = await api.post<PasswordResetCodeResponse>(
    "/auth/resend-password-reset-code",
    payload,
  );
  return data;
}

export async function resetPassword(
  payload: ResetPasswordPayload,
): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>("/auth/reset-password", payload);
  return data;
}

export async function contactAdmin(
  payload: ContactAdminPayload,
): Promise<MessageResponse> {
  const { data } = await api.post<MessageResponse>("/public/contact-admin", payload);
  return data;
}
