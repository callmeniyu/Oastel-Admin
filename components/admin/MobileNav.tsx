"use client";
import Link from "next/link";
import {
  FiPackage,
  FiCalendar,
  FiBook,
  FiAlertCircle,
} from "react-icons/fi";
import { RxDashboard } from "react-icons/rx";
import { usePathname } from "next/navigation";

export default function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Home", path: "/", icon: RxDashboard, matchPaths: ["/"] },
    { name: "Bookings", path: "/bookings", icon: FiCalendar, matchPaths: ["/bookings"] },
    { name: "Packages", path: "/tours", icon: FiPackage, matchPaths: ["/tours", "/transfers"] },
    { name: "Recovery", path: "/recovery", icon: FiAlertCircle, matchPaths: ["/recovery"] },
    { name: "Blogs", path: "/blogs", icon: FiBook, matchPaths: ["/blogs"] },
  ];

  const isItemActive = (item: (typeof navItems)[0]) => {
    if (item.matchPaths) {
      return item.matchPaths.some((p) =>
        p === "/" ? pathname === "/" : pathname.startsWith(p),
      );
    }
    return pathname === item.path;
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200 z-50">
        <div className="flex justify-around items-center py-2">
          {navItems.map((item) => {
            const active = isItemActive(item);
            return (
              <Link
                key={item.name}
                href={item.path}
                className={`flex flex-col items-center p-2 rounded-lg ${
                  active ? "text-primary font-semibold" : "text-light"
                }`}
              >
                <item.icon className="text-xl" />
                <span className="text-xs mt-1">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Spacer to prevent the fixed mobile nav from covering page content on small screens */}
      <div className="h-20 md:hidden" aria-hidden="true" />
    </>
  );
}
