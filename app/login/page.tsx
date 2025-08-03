"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { FiEye, FiEyeOff, FiLock, FiMail } from "react-icons/fi";
import { toast } from "react-hot-toast";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

  // Check for failed attempts on mount
  useEffect(() => {
    const attempts = localStorage.getItem("admin_failed_attempts");
    const blockTime = localStorage.getItem("admin_block_time");

    if (attempts && blockTime) {
      const attemptsCount = parseInt(attempts);
      const blockTimeMs = parseInt(blockTime);
      const now = new Date().getTime();

      if (attemptsCount >= 5 && now < blockTimeMs) {
        setFailedAttempts(attemptsCount);
        setIsBlocked(true);
        const timeLeft = Math.ceil((blockTimeMs - now) / 1000 / 60);
        toast.error(
          `Too many failed attempts. Please try again in ${timeLeft} minutes.`
        );
      } else if (now >= blockTimeMs) {
        // Reset if block time has passed
        localStorage.removeItem("admin_failed_attempts");
        localStorage.removeItem("admin_block_time");
      } else {
        setFailedAttempts(attemptsCount);
      }
    }
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isBlocked) {
      toast.error("Account temporarily blocked. Please try again later.");
      return;
    }

    if (!username || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);

    try {
      const success = await login(username, password);

      if (success) {
        // Reset failed attempts on successful login
        localStorage.removeItem("admin_failed_attempts");
        localStorage.removeItem("admin_block_time");
        toast.success("Login successful!");
        router.push("/");
      } else {
        // Handle failed login
        const newFailedAttempts = failedAttempts + 1;
        setFailedAttempts(newFailedAttempts);
        localStorage.setItem(
          "admin_failed_attempts",
          newFailedAttempts.toString()
        );

        if (newFailedAttempts >= 5) {
          // Block for 15 minutes
          const blockTime = new Date().getTime() + 15 * 60 * 1000;
          localStorage.setItem("admin_block_time", blockTime.toString());
          setIsBlocked(true);
          toast.error(
            "Too many failed attempts. Account blocked for 15 minutes."
          );
        } else {
          const remaining = 5 - newFailedAttempts;
          toast.error(`Invalid credentials. ${remaining} attempts remaining.`);
        }
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="mx-auto h-12 w-12 bg-primary rounded-full flex items-center justify-center mb-4">
              <FiLock className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Admin Login</h2>
            <p className="mt-2 text-sm text-gray-600">
              Sign in to access the admin dashboard
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiMail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <FiEyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <FiEye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {failedAttempts > 0 && failedAttempts < 5 && !isBlocked && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ {failedAttempts} failed attempt
                  {failedAttempts > 1 ? "s" : ""}. Account will be blocked after
                  5 failed attempts.
                </p>
              </div>
            )}

            {isBlocked && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  🔒 Account temporarily blocked due to too many failed
                  attempts. Please try again in 15 minutes.
                </p>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading || isBlocked}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </div>
                ) : isBlocked ? (
                  "Account Blocked"
                ) : (
                  "Sign in"
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Oastel Admin Dashboard © 2025
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
