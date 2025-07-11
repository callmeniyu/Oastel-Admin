"use client"
import AdminHeader from "@/components/admin/AdminHeader"
import MobileNav from "@/components/admin/MobileNav"
import { useState } from "react"
import { FiArrowLeft, FiSearch } from "react-icons/fi"
import { useRouter } from "next/navigation"

// Types
type HistoryBooking = {
    id: string
    type: "tour" | "transfer"
    title: string
    date: string
    time: string
    user: string
    persons: {
        adults: number
        children?: number
    }
    amount: string
}

export default function BookingHistoryPage() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<"tours" | "transfers">("tours")
    const [searchQuery, setSearchQuery] = useState("")

    // Dummy historical data
    const historyData: HistoryBooking[] = [
        // Tours History
        {
            id: "BK101",
            type: "tour",
            title: "Full Day Land Rover",
            date: "2025-07-05",
            time: "08:30 AM",
            user: "Michael Chen",
            persons: { adults: 2, children: 1 },
            amount: "RM 450",
        },
        {
            id: "BK102",
            type: "tour",
            title: "Sunrise + Half Day",
            date: "2025-07-04",
            time: "05:00 AM",
            user: "Jessica Wong",
            persons: { adults: 4 },
            amount: "RM 600",
        },
        {
            id: "BK103",
            type: "tour",
            title: "Mossy Forest Adventure",
            date: "2025-07-03",
            time: "09:00 AM",
            user: "David Kumar",
            persons: { adults: 2 },
            amount: "RM 450",
        },
        {
            id: "BK104",
            type: "tour",
            title: "Tea Plantation Tour",
            date: "2025-07-02",
            time: "10:30 AM",
            user: "Amy Tan",
            persons: { adults: 3, children: 2 },
            amount: "RM 375",
        },
        {
            id: "BK105",
            type: "tour",
            title: "Coral Hills Tour",
            date: "2025-07-01",
            time: "09:00 AM",
            user: "Robert Lee",
            persons: { adults: 2 },
            amount: "RM 450",
        },

        // Transfers History
        {
            id: "BK201",
            type: "transfer",
            title: "CH → KL",
            date: "2025-07-06",
            time: "02:00 PM",
            user: "Sarah Johnson",
            persons: { adults: 3 },
            amount: "RM 180",
        },
        {
            id: "BK202",
            type: "transfer",
            title: "CH → Taman Negara",
            date: "2025-07-05",
            time: "11:00 AM",
            user: "Mark Wilson",
            persons: { adults: 1, children: 2 },
            amount: "RM 250",
        },
        {
            id: "BK203",
            type: "transfer",
            title: "KL → CH",
            date: "2025-07-04",
            time: "03:00 PM",
            user: "Linda Garcia",
            persons: { adults: 2 },
            amount: "RM 160",
        },
        {
            id: "BK204",
            type: "transfer",
            title: "CH → Genting",
            date: "2025-01-03",
            time: "08:00 AM",
            user: "Peter Singh",
            persons: { adults: 4 },
            amount: "RM 450",
        },
        {
            id: "BK205",
            type: "transfer",
            title: "CH → Airport",
            date: "2025-09-02",
            time: "06:00 AM",
            user: "Rachel Kim",
            persons: { adults: 1 },
            amount: "RM 120",
        },
    ]

    // Helper function to format date for search
    const formatDateForSearch = (dateString: string) => {
        const date = new Date(dateString)
        return {
            iso: dateString, // 2025-07-05
            readable: date.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
            }), // Jul 5, 2025
            monthDay: date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
            }), // Jul 5
            dayMonth: `${date.getDate()}/${date.getMonth() + 1}`, // 5/7
            fullDate: `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`, // 5/7/2025
            reverseDate: `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`, // 7/5/2025
        }
    }

    // Filter data based on active tab and search query
    const filteredData = historyData.filter((booking) => {
        const matchesTab = booking.type === (activeTab.slice(0, -1) as "tour" | "transfer")

        if (searchQuery === "") {
            return matchesTab
        }

        const query = searchQuery.toLowerCase()
        const dateFormats = formatDateForSearch(booking.date)

        const matchesSearch =
            booking.user.toLowerCase().includes(query) ||
            booking.title.toLowerCase().includes(query) ||
            booking.id.toLowerCase().includes(query) ||
            // Date search formats
            dateFormats.iso.includes(query) ||
            dateFormats.readable.toLowerCase().includes(query) ||
            dateFormats.monthDay.toLowerCase().includes(query) ||
            dateFormats.dayMonth.includes(query) ||
            dateFormats.fullDate.includes(query) ||
            dateFormats.reverseDate.includes(query) ||
            // Additional date patterns
            booking.date.replace(/-/g, "/").includes(query) ||
            booking.date.replace(/-/g, "").includes(query.replace(/\D/g, ""))

        return matchesTab && matchesSearch
    })

    // Sort by date (most recent first)
    const sortedData = filteredData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Calculate counts based on search results
    const getFilteredCount = (type: "tour" | "transfer") => {
        return historyData.filter((booking) => {
            const matchesType = booking.type === type

            if (searchQuery === "") {
                return matchesType
            }

            const query = searchQuery.toLowerCase()
            const dateFormats = formatDateForSearch(booking.date)

            const matchesSearch =
                booking.user.toLowerCase().includes(query) ||
                booking.title.toLowerCase().includes(query) ||
                booking.id.toLowerCase().includes(query) ||
                dateFormats.iso.includes(query) ||
                dateFormats.readable.toLowerCase().includes(query) ||
                dateFormats.monthDay.toLowerCase().includes(query) ||
                dateFormats.dayMonth.includes(query) ||
                dateFormats.fullDate.includes(query) ||
                dateFormats.reverseDate.includes(query) ||
                booking.date.replace(/-/g, "/").includes(query) ||
                booking.date.replace(/-/g, "").includes(query.replace(/\D/g, ""))

            return matchesType && matchesSearch
        }).length
    }

    const tourCount = getFilteredCount("tour")
    const transferCount = getFilteredCount("transfer")

    return (
        <div className="min-h-screen bg-gray-50 pb-16">
            <AdminHeader />

            <main className="p-4">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                        <FiArrowLeft className="text-xl text-dark" />
                    </button>
                    <h1 className="text-2xl font-bold text-dark">Booking History</h1>
                </div>

                {/* Search Bar */}
                <div className="relative mb-6">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-light" />
                    <input
                        type="text"
                        placeholder="date, user, booking ID, or service..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    {searchQuery && (
                        <div className="text-xs text-light mt-1 ml-10">
                            Try: "Jul 5", "5/7", "2025-07-05", or customer name
                        </div>
                    )}
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
                        {sortedData.length > 0 ? (
                            <div className="space-y-3">
                                {sortedData.map((booking) => (
                                    <HistoryBookingCard key={booking.id} booking={booking} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-light">
                                    {searchQuery
                                        ? `No ${activeTab} found matching "${searchQuery}"`
                                        : `No ${activeTab} history available`}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                    <h3 className="font-semibold text-dark mb-3">Summary</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-primary/5 rounded-lg">
                            <div className="text-2xl font-bold text-primary">{tourCount}</div>
                            <div className="text-sm text-light">Total Tours</div>
                        </div>
                        <div className="text-center p-3 bg-secondary/5 rounded-lg">
                            <div className="text-2xl font-bold text-secondary">{transferCount}</div>
                            <div className="text-sm text-light">Total Transfers</div>
                        </div>
                    </div>
                </div>
            </main>

            <MobileNav />
        </div>
    )
}

// History Booking Card Component
function HistoryBookingCard({ booking }: { booking: HistoryBooking }) {
    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        })
    }

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "completed":
                return "bg-green-100 text-green-800"
            case "cancelled":
                return "bg-red-100 text-red-800"
            case "no-show":
                return "bg-yellow-100 text-yellow-800"
            default:
                return "bg-gray-100 text-gray-800"
        }
    }

    const getStatusText = (status: string) => {
        switch (status) {
            case "completed":
                return "Completed"
            case "cancelled":
                return "Cancelled"
            case "no-show":
                return "No Show"
            default:
                return status
        }
    }

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-dark">{booking.user}</h3>
                        <span className="text-xs text-light">#{booking.id}</span>
                    </div>
                    <p className="text-sm text-light">{booking.title}</p>
                </div>
                <div className="text-right">
                    <div className="text-sm font-medium text-dark">{formatDate(booking.date)}</div>
                    <div className="text-sm text-light">{booking.time}</div>
                </div>
            </div>

            <div className="flex justify-between items-center">
                <div className="text-sm text-light">
                    {booking.persons.adults} adult{booking.persons.adults !== 1 ? "s" : ""}
                    {booking.persons.children
                        ? `, ${booking.persons.children} child${booking.persons.children !== 1 ? "ren" : ""}`
                        : ""}
                </div>

                <div className="flex items-center gap-3">
                    {booking.amount && <span className="text-sm font-medium text-primary">{booking.amount}</span>}
                </div>
            </div>
        </div>
    )
}
