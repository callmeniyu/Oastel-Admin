"use client"
import Link from "next/link"
import { FiCompass, FiTruck, FiCalendar, FiUsers, FiBook } from "react-icons/fi"
import { usePathname } from "next/navigation"

export default function MobileNav() {
    const pathname = usePathname()

    const navItems = [
        { name: "Tours", path: "/tours", icon: FiCompass },
        { name: "Transfers", path: "/transfers", icon: FiTruck },
        { name: "Bookings", path: "/bookings", icon: FiCalendar },
        { name: "Blogs", path: "/blogs", icon: FiBook },
        { name: "Users", path: "/users", icon: FiUsers },
    ]

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200 z-50">
            <div className="flex justify-around items-center py-2">
                {navItems.map((item) => (
                    <Link
                        key={item.path}
                        href={item.path}
                        className={`flex flex-col items-center p-2 rounded-lg ${
                            pathname === item.path ? "text-primary" : "text-light"
                        }`}
                    >
                        <item.icon className="text-xl" />
                        <span className="text-xs mt-1">{item.name}</span>
                    </Link>
                ))}
            </div>
        </div>
    )
}
