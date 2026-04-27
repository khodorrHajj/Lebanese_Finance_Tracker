"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import {
  fetchCurrentUser,
  loginAPI,
  registerAPI,
} from "@/lib/api";
import type {
  LoginResponse,
  RegisterResponse,
  TokenResponse,
  User,
  UserResponse,
  UserCreate,
} from "@/types";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResponse>;
  register: (payload: UserCreate) => Promise<RegisterResponse>;
  logout: () => void;
  completeSession: (tokens: TokenResponse) => Promise<void>;
  refreshUser: () => Promise<UserResponse>;
  setUserProfile: (user: UserResponse) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function persistAuthTokens(tokens: TokenResponse) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
}

export function clearAuthStorage() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function readStoredAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function initializeSession() {
      const storedAccessToken = readStoredAccessToken();

      if (!storedAccessToken) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      try {
        const currentUser = await fetchCurrentUser();

        if (!isMounted) {
          return;
        }

        setAccessToken(storedAccessToken);
        setUser(currentUser);
      } catch {
        clearAuthStorage();

        if (isMounted) {
          setAccessToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void initializeSession();

    return () => {
      isMounted = false;
    };
  }, []);

  async function completeSession(tokens: TokenResponse) {
    setLoading(true);
    persistAuthTokens(tokens);
    setAccessToken(tokens.access_token);

    try {
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
    } catch (error) {
      clearAuthStorage();
      setAccessToken(null);
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function refreshUser() {
    const currentUser = await fetchCurrentUser();
    setUser(currentUser);
    return currentUser;
  }

  async function login(email: string, password: string) {
    const response = await loginAPI(email, password);

    if (response.access_token && response.refresh_token) {
      await completeSession({
        access_token: response.access_token,
        refresh_token: response.refresh_token,
        token_type: response.token_type,
      });
    }

    return response;
  }

  async function register(payload: UserCreate) {
    return registerAPI(payload);
  }

  function logout() {
    clearAuthStorage();
    setUser(null);
    setAccessToken(null);
    router.replace("/login");
  }

  const value: AuthContextValue = {
    user,
    accessToken,
    loading,
    login,
    register,
    logout,
    completeSession,
    refreshUser,
    setUserProfile: (nextUser) => setUser(nextUser),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
