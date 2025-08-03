"use client";
import { useState, useEffect } from "react";
import { FiBell, FiLogOut, FiUser } from "react-icons/fi";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function AdminHeader() {
  const [showDropdown, setShowDropdown] = useState(false);
  const { logout, getCurrentUser } = useAuth();
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    // Get current user on client side
    if (getCurrentUser) {
      setCurrentUser(getCurrentUser());
    }
  }, [getCurrentUser]);

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="bg-white shadow-sm py-4 px-4 flex items-center justify-between">
      <div className="flex items-center">
        <Link href="/" className="text-xl font-bold text-primary ">
          Admin
        </Link>
      </div>

      <div className="flex items-center space-x-3 ">
        <button className="relative p-1" disabled>
          <FiBell className="text-xl text-gray-600" />
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            3
          </span>
        </button>

        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-8 h-8 rounded-full overflow-hidden border-2 border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <Image
              src="/images/admin-avatar.jpg"
              alt="Admin"
              width={32}
              height={32}
              className="object-cover"
            />
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
              <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                <div className="flex items-center">
                  <FiUser className="mr-2" />
                  Administrator
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {currentUser || "administrator@oastel"}
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
              >
                <FiLogOut className="mr-2" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Overlay to close dropdown when clicking outside */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        ></div>
      )}
    </div>
  );
}
