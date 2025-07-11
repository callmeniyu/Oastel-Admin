"use client"
import AdminHeader from "@/components/admin/AdminHeader"
import MobileNav from "@/components/admin/MobileNav"
import { useState, useEffect } from "react"
import { FiArrowLeft, FiUsers, FiClock } from "react-icons/fi"
import { useRouter, useSearchParams } from "next/navigation"

// Types
type Package = {
    id: string
    title: string
    type: "tour" | "transfer"
    duration?: "half-day" | "full-day" // Only for tours
    currentBookings: number
    maxSlots: number
    startTime: string
    price: string
}

export default function DailyPackagesPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [activeTab, setActiveTab] = useState<"tours" | "transfers">("tours")
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())

    // Get date from URL parameter or default to today
    useEffect(() => {
        const dateParam = searchParams.get("date")
        if (dateParam) {
            setSelectedDate(new Date(dateParam))
        } else {
            setSelectedDate(new Date())
        }
    }, [searchParams])

    // Format date for display
    const formatDisplayDate = (date: Date) => {
        const today = new Date()
        const isToday = date.toDateString() === today.toDateString()

        if (isToday) {
            return "Today"
        }

        return date.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
        })
    }

    // Dummy package data for today
    const packagesData: Package[] = [
        // Tours
        {
            id: "PKG-T001",
            title: "Full Day Land Rover Adventure",
            type: "tour",
            duration: "full-day",
            currentBookings: 8,
            maxSlots: 12,
            startTime: "08:30 AM",
            price: "RM 225",
        },
        {
            id: "PKG-T002",
            title: "Sunrise + Half Day Tour",
            type: "tour",
            duration: "half-day",
            currentBookings: 6,
            maxSlots: 8,
            startTime: "05:00 AM",
            price: "RM 150",
        },
        {
            id: "PKG-T003",
            title: "Mossy Forest Adventure",
            type: "tour",
            duration: "half-day",
            currentBookings: 4,
            maxSlots: 10,
            startTime: "09:00 AM",
            price: "RM 120",
        },
        {
            id: "PKG-T004",
            title: "Tea Plantation Experience",
            type: "tour",
            duration: "half-day",
            currentBookings: 14,
            maxSlots: 15,
            startTime: "10:30 AM",
            price: "RM 100",
        },
        {
            id: "PKG-T005",
            title: "Coral Hills Sunset Tour",
            type: "tour",
            duration: "half-day",
            currentBookings: 0,
            maxSlots: 8,
            startTime: "03:00 PM",
            price: "RM 130",
        },

        // Transfers
        {
            id: "PKG-TR001",
            title: "Cameron Highlands ↔ Kuala Lumpur",
            type: "transfer",
            currentBookings: 5,
            maxSlots: 8,
            startTime: "Multiple",
            price: "RM 60",
        },
        {
            id: "PKG-TR002",
            title: "Cameron Highlands ↔ Airport",
            type: "transfer",
            currentBookings: 2,
            maxSlots: 6,
            startTime: "Multiple",
            price: "RM 120",
        },
        {
            id: "PKG-TR003",
            title: "Cameron Highlands ↔ Taman Negara",
            type: "transfer",
            currentBookings: 3,
            maxSlots: 6,
            startTime: "Multiple",
            price: "RM 200",
        },
        {
            id: "PKG-TR004",
            title: "Cameron Highlands ↔ Genting",
            type: "transfer",
            currentBookings: 1,
            maxSlots: 4,
            startTime: "Multiple",
            price: "RM 180",
        },
        {
            id: "PKG-TR005",
            title: "Cameron Highlands ↔ Ipoh",
            type: "transfer",
            currentBookings: 0,
            maxSlots: 6,
            startTime: "Multiple",
            price: "RM 80",
        },
    ]

    // Filter packages based on active tab
    const filteredPackages = packagesData.filter((pkg) => pkg.type === (activeTab.slice(0, -1) as "tour" | "transfer"))

    const tourCount = packagesData.filter((p) => p.type === "tour").length
    const transferCount = packagesData.filter((p) => p.type === "transfer").length

    return (
        <div className="min-h-screen bg-gray-50 pb-16">
            <AdminHeader />

            <main className="p-4">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                        <FiArrowLeft className="text-xl text-dark" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-dark">Daily Packages</h1>
                        <p className="text-sm text-light">
                            {formatDisplayDate(selectedDate)} - Available tours and transfers
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-6">
                    <div className="flex border-b border-gray-100">
                        <button
                            onClick={() => setActiveTab("tours")}
                            className={`flex-1 px-4 py-3 text-sm font-medium ${
                                activeTab === "tours"
                                    ? "text-primary border-b-2 border-primary bg-primary/5"
                                    : "text-light hover:text-dark"
                            }`}
                        >
                            Tours ({tourCount})
                        </button>
                        <button
                            onClick={() => setActiveTab("transfers")}
                            className={`flex-1 px-4 py-3 text-sm font-medium ${
                                activeTab === "transfers"
                                    ? "text-primary border-b-2 border-primary bg-primary/5"
                                    : "text-light hover:text-dark"
                            }`}
                        >
                            Transfers ({transferCount})
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="p-4">
                        <div className="space-y-4">
                            {filteredPackages.map((pkg) => (
                                <PackageCard key={pkg.id} package={pkg} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                    <h3 className="font-semibold text-dark mb-3">{formatDisplayDate(selectedDate)} Overview</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-primary/5 rounded-lg">
                            <div className="text-2xl font-bold text-primary">
                                {packagesData
                                    .filter((p) => p.type === "tour")
                                    .reduce((sum, p) => sum + p.currentBookings, 0)}
                            </div>
                            <div className="text-sm text-light">Tour Bookings</div>
                        </div>
                        <div className="text-center p-3 bg-secondary/5 rounded-lg">
                            <div className="text-2xl font-bold text-secondary">
                                {packagesData
                                    .filter((p) => p.type === "transfer")
                                    .reduce((sum, p) => sum + p.currentBookings, 0)}
                            </div>
                            <div className="text-sm text-light">Transfer Bookings</div>
                        </div>
                    </div>
                </div>
            </main>

            <MobileNav />
        </div>
    )
}

// Package Card Component
function PackageCard({ package: pkg }: { package: Package }) {
    const getAvailabilityColor = () => {
        const percentage = (pkg.currentBookings / pkg.maxSlots) * 100
        if (percentage >= 90) return "text-red-600"
        if (percentage >= 70) return "text-yellow-600"
        return "text-green-600"
    }

    const getAvailabilityBg = () => {
        const percentage = (pkg.currentBookings / pkg.maxSlots) * 100
        if (percentage >= 90) return "bg-red-50 border-red-200"
        if (percentage >= 70) return "bg-yellow-50 border-yellow-200"
        return "bg-green-50 border-green-200"
    }

    const getDurationBadge = () => {
        if (pkg.type === "tour" && pkg.duration) {
            return (
                <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                        pkg.duration === "full-day" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                    }`}
                >
                    {pkg.duration === "full-day" ? "Full Day" : "Half Day"}
                </span>
            )
        }
        return null
    }

    return (
        <div className={`p-4 rounded-lg border ${getAvailabilityBg()}`}>
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-dark">{pkg.title}</h3>
                        {getDurationBadge()}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-light">
                        <div className="flex items-center gap-1">
                            <FiClock className="text-xs" />
                            <span>{pkg.startTime}</span>
                        </div>
                        <span className="font-medium text-primary">{pkg.price}</span>
                    </div>
                </div>
            </div>

            {/* Booking Status */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <FiUsers className="text-light" />
                    <span className="text-sm text-light">Bookings:</span>
                    <span className={`text-sm font-medium ${getAvailabilityColor()}`}>
                        {pkg.currentBookings} / {pkg.maxSlots}
                    </span>
                </div>

                <div className="text-right">
                    <div className="text-xs text-light">{pkg.maxSlots - pkg.currentBookings} slots available</div>
                    <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                        <div
                            className={`h-2 rounded-full ${
                                (pkg.currentBookings / pkg.maxSlots) * 100 >= 90
                                    ? "bg-red-500"
                                    : (pkg.currentBookings / pkg.maxSlots) * 100 >= 70
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                            }`}
                            style={{ width: `${(pkg.currentBookings / pkg.maxSlots) * 100}%` }}
                        ></div>
                    </div>
                </div>
            </div>
        </div>
    )
}
