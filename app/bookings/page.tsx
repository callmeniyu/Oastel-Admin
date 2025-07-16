"use client"
import AdminHeader from "@/components/admin/AdminHeader"
import MobileNav from "@/components/admin/MobileNav"
import { useState } from "react"
import { FiChevronLeft, FiChevronRight, FiClock } from "react-icons/fi"
import { useRouter } from "next/navigation"

// Types
type Booking = {
    id: string
    type: "tour" | "transfer"
    title: string
    time: string
    user: string
    persons: {
        adults: number
        children?: number
    }
    pickupLocation?: string
    phone?: string
}

export default function BookingsPage() {
    const today = new Date()
    const [currentDate, setCurrentDate] = useState(today)
    const [selectedDate, setSelectedDate] = useState(today)
    const [activeTab, setActiveTab] = useState<"tours" | "transfers">("tours")
    const router = useRouter()

    // Generate dummy data
    const bookingsData: Record<string, Booking[]> = {
        // Today's bookings
        [formatDate(today)]: [
            {
                id: "BK001",
                type: "tour",
                title: "Full Day Land Rover",
                time: "08:30 AM",
                user: "Alex Cooper",
                persons: { adults: 2, children: 1 },
                pickupLocation: "Tanah Rata",
                phone: "012-3456789",
            },
            {
                id: "BK002",
                type: "transfer",
                title: "CH → KL",
                time: "02:00 PM",
                user: "Sarah Lim",
                persons: { adults: 3 },
                pickupLocation: "Tanah Rata",
                phone: "012-3456789",
            },
            {
                id: "BK003",
                type: "tour",
                title: "Sunrise Tour",
                time: "05:00 AM",
                user: "Raj Patel",
                persons: { adults: 4 },
                pickupLocation: "Tanah Rata",
                phone: "012-3456789",
            },
        ],
        // Tomorrow's bookings
        [formatDate(getNextDay(today))]: [
            {
                id: "BK004",
                type: "tour",
                title: "Mossy Forest Adventure",
                time: "09:00 AM",
                user: "Emma Watson",
                persons: { adults: 2 },
                pickupLocation: "Tanah Rata",
                phone: "012-3456789",
            },
        ],
        // Day after tomorrow
        [formatDate(getNextDay(today, 2))]: [
            {
                id: "BK005",
                type: "transfer",
                title: "CH → Taman Negara",
                time: "11:00 AM",
                user: "John Doe",
                persons: { adults: 1, children: 2 },
                pickupLocation: "Tanah Rata",
                phone: "012-3456789",
            },
            {
                id: "BK006",
                type: "tour",
                title: "Tea Plantation Tour",
                time: "10:30 AM",
                user: "Lisa Ray",
                persons: { adults: 3 },
                pickupLocation: "Tanah Rata",
                phone: "012-3456789",
            },
        ],
    }

    // Get bookings for selected date
    const selectedDateBookings = bookingsData[formatDate(selectedDate)] || []
    const tours = selectedDateBookings.filter((b) => b.type === "tour")
    const transfers = selectedDateBookings.filter((b) => b.type === "transfer")

    // Generate days for the current month view
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()

    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()

    const navigateMonth = (direction: "prev" | "next") => {
        const newDate = new Date(currentDate)
        newDate.setMonth(direction === "prev" ? currentDate.getMonth() - 1 : currentDate.getMonth() + 1)
        setCurrentDate(newDate)
    }

    const handleDateClick = (day: number) => {
        const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
        if (clickedDate >= today) {
            setSelectedDate(clickedDate)
        }
    }

    // Helper functions
    function formatDate(date: Date): string {
        return date.toISOString().split("T")[0]
    }

    function getNextDay(date: Date, days = 1): Date {
        const newDate = new Date(date)
        newDate.setDate(newDate.getDate() + days)
        return newDate
    }

    function isSameDay(date1: Date, date2: Date): boolean {
        return formatDate(date1) === formatDate(date2)
    }

    function isBeforeToday(date: Date): boolean {
        return date < today && !isSameDay(date, today)
    }

    function renderDay(day: number) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
        const hasBookings = bookingsData[formatDate(date)]?.length > 0
        const isSelected = isSameDay(date, selectedDate)
        const isDisabled = isBeforeToday(date)

        return (
            <button
                key={day}
                onClick={() => handleDateClick(day)}
                disabled={isDisabled}
                className={`min-h-16 p-1 border ${
                    isDisabled
                        ? "bg-gray-100 text-gray-400"
                        : isSelected
                        ? "bg-primary/10 border-primary"
                        : hasBookings
                        ? "bg-primary/5 border-gray-100"
                        : "border-gray-100"
                } ${isSameDay(date, today) ? "border-2 border-primary" : ""}`}
            >
                <div className="text-right text-sm mb-1">{day}</div>
                {hasBookings && <div className="w-2 h-2 bg-primary rounded-full mx-auto"></div>}
            </button>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-16">
            <AdminHeader />

            <main className="p-4">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-dark">Bookings</h1>
                    <button
                        onClick={() => router.push("/bookings/history")}
                        className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        title="View Booking History"
                    >
                        <FiClock className="text-xl" />
                    </button>
                </div>

                {/* Calendar Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <button onClick={() => navigateMonth("prev")} className="p-1 rounded-full hover:bg-gray-100">
                            <FiChevronLeft className="text-xl" />
                        </button>
                        <h2 className="text-lg font-semibold">
                            {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                        </h2>
                        <button onClick={() => navigateMonth("next")} className="p-1 rounded-full hover:bg-gray-100">
                            <FiChevronRight className="text-xl" />
                        </button>
                    </div>

                    {/* Day headers */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                            <div key={day} className="text-center text-sm font-medium text-light p-2">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar days */}
                    <div className="grid grid-cols-7 gap-1">
                        {/* Empty cells for days before the 1st */}
                        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                            <div key={`empty-${i}`} className="min-h-16"></div>
                        ))}

                        {/* Days of the month */}
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(renderDay)}
                    </div>
                </div>

                {/* Selected Date Bookings */}
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-lg font-semibold">
                            {isSameDay(selectedDate, today)
                                ? "Today's Bookings"
                                : selectedDate.toLocaleDateString("en-US", {
                                      weekday: "long",
                                      month: "short",
                                      day: "numeric",
                                  })}
                        </h2>
                        <button
                            onClick={() => router.push(`/bookings/daily-packages?date=${formatDate(selectedDate)}`)}
                            className="px-3 py-1 text-sm bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                        >
                            View Packages
                        </button>
                    </div>

                    {selectedDateBookings.length === 0 ? (
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 text-center">
                            <p className="text-light">No bookings for this date</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Show tabs for all dates */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-100">
                                {/* Tab Headers */}
                                <div className="flex border-b border-gray-100">
                                    <button
                                        onClick={() => setActiveTab("tours")}
                                        className={`flex-1 px-4 py-3 text-sm font-medium ${
                                            activeTab === "tours"
                                                ? "text-primary border-b-2 border-primary bg-primary/5"
                                                : "text-light hover:text-dark"
                                        }`}
                                    >
                                        Tours ({tours.length})
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("transfers")}
                                        className={`flex-1 px-4 py-3 text-sm font-medium ${
                                            activeTab === "transfers"
                                                ? "text-primary border-b-2 border-primary bg-primary/5"
                                                : "text-light hover:text-dark"
                                        }`}
                                    >
                                        Transfers ({transfers.length})
                                    </button>
                                </div>

                                {/* Tab Content */}
                                <div className="p-4">
                                    {activeTab === "tours" ? (
                                        tours.length > 0 ? (
                                            <div className="space-y-3">
                                                {tours.map((booking) => (
                                                    <BookingCard key={booking.id} booking={booking} />
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-light text-center py-4">
                                                No tours scheduled for{" "}
                                                {isSameDay(selectedDate, today) ? "today" : "this date"}
                                            </p>
                                        )
                                    ) : transfers.length > 0 ? (
                                        <div className="space-y-3">
                                            {transfers.map((booking) => (
                                                <BookingCard key={booking.id} booking={booking} />
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-light text-center py-4">
                                            No transfers scheduled for{" "}
                                            {isSameDay(selectedDate, today) ? "today" : "this date"}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <MobileNav />
        </div>
    )
}

// Booking Card Component
function BookingCard({ booking }: { booking: Booking }) {
    return (
        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                    <h3 className="font-medium">{booking.user}</h3>
                    <p className="text-sm text-light">{booking.title}</p>
                </div>
                <span className="text-sm text-light">{booking.time}</span>
            </div>

            <div className="space-y-1">
                <div className="text-sm text-light">
                    {booking.persons.adults} adult{booking.persons.adults !== 1 ? "s" : ""}
                    {booking.persons.children
                        ? `, ${booking.persons.children} child${booking.persons.children !== 1 ? "ren" : ""}`
                        : ""}
                </div>

                {booking.pickupLocation && (
                    <div className="text-sm text-light">
                        <span className="font-medium">Pickup:</span> {booking.pickupLocation}
                    </div>
                )}

                {booking.phone && (
                    <div className="text-sm text-light">
                        <span className="font-medium">Phone:</span> {booking.phone}
                    </div>
                )}
            </div>
        </div>
    )
}
