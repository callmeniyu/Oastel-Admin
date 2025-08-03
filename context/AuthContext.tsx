"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  getCurrentUser: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Admin credentials
  const ADMIN_USERNAME = "administrator@oastel";
  const ADMIN_PASSWORD = "0aste!@765";

  useEffect(() => {
    // Check if user is already authenticated on page load
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("admin_token");
      const expiry = localStorage.getItem("admin_token_expiry");

      if (token && expiry) {
        const now = new Date().getTime();
        const expiryTime = parseInt(expiry);

        if (now < expiryTime) {
          setIsAuthenticated(true);
        } else {
          // Token expired, clear storage
          localStorage.removeItem("admin_token");
          localStorage.removeItem("admin_token_expiry");
          localStorage.removeItem("admin_user");
        }
      }
    }

    setLoading(false);
  }, []);

  const login = async (
    username: string,
    password: string
  ): Promise<boolean> => {
    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Trim whitespace and validate
      const trimmedUsername = username.trim();
      const trimmedPassword = password.trim();

      if (
        trimmedUsername === ADMIN_USERNAME &&
        trimmedPassword === ADMIN_PASSWORD
      ) {
        if (typeof window !== "undefined") {
          // Create session token (simple implementation)
          const token = btoa(
            `${trimmedUsername}:${Date.now()}:${Math.random()}`
          );
          const expiry = new Date().getTime() + 24 * 60 * 60 * 1000; // 24 hours

          localStorage.setItem("admin_token", token);
          localStorage.setItem("admin_token_expiry", expiry.toString());
          localStorage.setItem("admin_user", trimmedUsername);
        }

        setIsAuthenticated(true);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_token_expiry");
      localStorage.removeItem("admin_user");
    }
    setIsAuthenticated(false);
    router.push("/login");
  };

  const getCurrentUser = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("admin_user");
    }
    return null;
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, login, logout, loading, getCurrentUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};
