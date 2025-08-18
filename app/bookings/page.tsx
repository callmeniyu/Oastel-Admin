"use client";
import AdminHeader from "@/components/admin/AdminHeader";
import MobileNav from "@/components/admin/MobileNav";
import { useState, useEffect } from "react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiUsers,
  FiRefreshCw,
} from "react-icons/fi";
import { useRouter } from "next/navigation";
import StatusToggle from "@/components/admin/StatusToggle";

type Package = {
  id: string;
  title: string;
  type: "tour" | "transfer";
  duration?: "half-day" | "full-day"; // Only for tours
  currentBookings: number;
  maxSlots: number;
  startTime: string;
  price: string;
  isAvailable: boolean; // Slot availability status
};

export default function BookingsPage() {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const [activeTab, setActiveTab] = useState<"tours" | "transfers">("tours");
  const [realBookings, setRealBookings] = useState<any[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const router = useRouter();

  const handleRefresh = async () => {
    fetchRealBookings();
    fetchPackages();
  };

  useEffect(() => {
    fetchRealBookings();
    fetchPackages();

    // Set up auto-refresh for booking counts every 30 seconds
    const autoRefreshInterval = setInterval(() => {
      fetchRealBookings();
    }, 30000); // 30 seconds

    // Cleanup interval on component unmount
    return () => clearInterval(autoRefreshInterval);
  }, []);

  useEffect(() => {
    fetchRealBookings();
  }, [selectedDate]);

  const fetchPackages = async () => {
    try {
      setIsLoadingPackages(true);
      const [toursResponse, transfersResponse] = await Promise.all([
        fetch("/api/tours"),
        fetch("/api/transfers"),
      ]);

      const toursData = await toursResponse.json();
      const transfersData = await transfersResponse.json();

      // Ensure server responses are normalized: tours -> packageType 'tour', transfers -> 'transfer'
      const allPackages = [
        ...(toursData.tours || []).map((tour: any) => ({
          ...tour,
          packageType: "tour",
        })),
        ...(transfersData.transfers || []).map((transfer: any) => ({
          ...transfer,
          packageType: "transfer",
        })),
      ];

      setPackages(allPackages);
    } catch (error) {
      console.error("Error fetching packages:", error);
    } finally {
      setIsLoadingPackages(false);
    }
  };

  const fetchRealBookings = async () => {
    try {
      setIsLoadingBookings(true);
      // Fetch all bookings regardless of activeTab to get proper counts
      const res = await fetch(`/api/bookings`);
      const data = await res.json();
      if (data.success) {
        setRealBookings(data.bookings || data.data || []);
        setLastUpdated(new Date()); // Update timestamp when data is successfully fetched
      } else {
        console.error("Failed to fetch bookings:", data.error);
        setRealBookings([]);
      }
    } catch (error) {
      console.error("Failed to fetch real bookings", error);
      setRealBookings([]);
    } finally {
      setIsLoadingBookings(false);
    }
  };

  // Toggle slot availability for a specific package, date, and time
  const toggleSlotStatus = async (
    packageId: string,
    packageType: "tour" | "transfer",
    date: string,
    time: string,
    currentStatus: "active" | "sold"
  ) => {
    try {
      const newStatus = currentStatus === "active" ? false : true; // isAvailable boolean

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/timeslots/toggle-availability`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            packageId,
            packageType,
            date,
            time,
            isAvailable: newStatus,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        // Refresh bookings data to reflect the change
        await fetchRealBookings();
      } else {
        console.error("Failed to toggle slot status:", data.error);
      }
    } catch (error) {
      console.error("Failed to toggle slot status", error);
    }
  };

  // Process real bookings data into Package format
  const processBookingsIntoPackages = (
    bookings: any[],
    date: Date
  ): Package[] => {
    const dateStr = formatDate(date);
    const safeBookings = Array.isArray(bookings) ? bookings : [];

    // Filter bookings for the selected date
    const dateBookings = safeBookings.filter((booking) => {
      if (!booking || !booking.date) return false;
      let bookingDateStr;
      if (booking.date.length >= 10) {
        bookingDateStr = booking.date.slice(0, 10); // YYYY-MM-DD
      } else {
        bookingDateStr = formatDateFromString(booking.date);
      }
      return bookingDateStr === dateStr;
    });

    // Group bookings by package ID and time
    const bookingMap = new Map<string, any>();
    dateBookings.forEach((booking) => {
      if (!booking.packageId || !booking.packageId._id) return;
      const key = `${booking.packageId._id}-${booking.time}`;
      if (!bookingMap.has(key)) {
        bookingMap.set(key, {
          id: booking.packageId._id,
          title: booking.packageId?.title || `${booking.packageType} Package`,
          type: booking.packageType,
          duration:
            booking.packageId?.period?.toLowerCase() ||
            (booking.packageType === "tour" ? "half-day" : undefined),
          currentBookings: 0,
          maxSlots: booking.packageId?.maximumPerson || 15,
          startTime: booking.time,
          price: `RM ${booking.packageId?.newPrice || booking.total}`,
          isAvailable: true, // Default to available, will be updated with actual slot data
          bookings: [], // <-- Fix: always initialize bookings array
        });
      }
      const packageData = bookingMap.get(key);
      packageData.currentBookings += booking.adults + booking.children;
      packageData.bookings.push(booking);
    });

    // Merge with all available packages for the selected tab
    const availablePackages = Array.isArray(packages)
      ? packages.filter(
          (pkg) => pkg && pkg.packageType === activeTab.slice(0, -1)
        )
      : [];

    // For each available package, ensure it appears at least once (for each time slot if applicable)
    const mergedPackages: Package[] = [];
    availablePackages.forEach((pkg) => {
      // Find all bookings for this package
      const matchingBookings = dateBookings.filter(
        (b) => b.packageId?._id === pkg._id
      );
      // If there are bookings, use their time slots
      if (matchingBookings.length > 0) {
        // For each time slot with bookings, use the bookingMap entry
        const timeSlots = Array.from(
          new Set(matchingBookings.map((b) => b.time))
        );
        timeSlots.forEach((time) => {
          const key = `${pkg._id}-${time}`;
          if (bookingMap.has(key)) {
            mergedPackages.push(bookingMap.get(key));
          }
        });
      } else {
        // No bookings for this package on this date, show as available
        mergedPackages.push({
          id: pkg._id,
          title: pkg.title || "Package",
          type: pkg.packageType as "tour" | "transfer",
          duration:
            pkg.period?.toLowerCase() ||
            (pkg.packageType === "tour" ? "half-day" : undefined),
          currentBookings: 0,
          maxSlots: pkg.maximumPerson || 15,
          startTime: pkg.departureTimes?.[0] || pkg.times?.[0] || "Multiple",
          price: `RM ${pkg.newPrice || 0}`,
          isAvailable: true, // Default to available
        });
      }
    });

    return mergedPackages;
  };

  const selectedDatePackages = processBookingsIntoPackages(
    realBookings,
    selectedDate
  );

  // Calculate counts for both tours and transfers from all bookings
  const getAllPackagesForType = (packageType: "tour" | "transfer") => {
    return processBookingsIntoPackages(realBookings, selectedDate).filter(
      (p) => p.type === packageType
    );
  };

  const tours = getAllPackagesForType("tour");
  const transfers = getAllPackagesForType("transfer");

  // Generate days for the current month view
  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();
  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  ).getDay();

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    newDate.setMonth(
      direction === "prev"
        ? currentDate.getMonth() - 1
        : currentDate.getMonth() + 1
    );
    setCurrentDate(newDate);
  };

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    );
    if (clickedDate >= today) {
      setSelectedDate(clickedDate);
    }
  };

  // Helper functions
  function formatDate(date: Date): string {
    // Fix timezone offset issues by using local date components
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatDateFromString(dateString: string): string {
    // Handle date strings more safely to prevent offset issues
    const date = new Date(dateString + "T12:00:00"); // Add noon time to prevent timezone shifts
    return formatDate(date);
  }

  function getNextDay(date: Date, days = 1): Date {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
  }

  function isSameDay(date1: Date, date2: Date): boolean {
    return formatDate(date1) === formatDate(date2);
  }

  function isBeforeToday(date: Date): boolean {
    return date < today && !isSameDay(date, today);
  }

  function renderDay(day: number) {
    const date = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    );
    // Only show dot if there are actual bookings for this date
    const dateStr = formatDate(date);
    const hasBookings =
      Array.isArray(realBookings) &&
      realBookings.some((booking) => {
        if (!booking || !booking.date) return false;
        let bookingDateStr;
        if (booking.date.length >= 10) {
          bookingDateStr = booking.date.slice(0, 10);
        } else {
          bookingDateStr = formatDateFromString(booking.date);
        }
        return bookingDateStr === dateStr;
      });
    const isSelected = isSameDay(date, selectedDate);
    const isDisabled = isBeforeToday(date);

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
        {hasBookings && (
          <div className="w-2 h-2 bg-primary rounded-full mx-auto"></div>
        )}
      </button>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <AdminHeader />

      <main className="p-4 pb-20 md:pb-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-dark">Bookings</h1>
            {lastUpdated && (
              <p className="text-sm text-gray-500 mt-1">
                Last updated: {lastUpdated.toLocaleTimeString()}
                <span className="ml-2 text-xs text-green-600">
                  Auto-refresh every 30s
                </span>
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 p-2 rounded-lg bg-gray-200 text-gray-500 hover:bg-green-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed sm:p-3 sm:px-4"
              title="Refresh Data"
            >
              <FiRefreshCw className="text-lg sm:text-xl" />
            </button>
            <button
              onClick={() => router.push("/bookings/history")}
              className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors sm:p-3"
              title="View Booking History"
            >
              <FiClock className="text-lg sm:text-xl" />
            </button>
          </div>
        </div>

        {/* Calendar Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => navigateMonth("prev")}
              className="p-1 rounded-full hover:bg-gray-100"
            >
              <FiChevronLeft className="text-xl" />
            </button>
            <h2 className="text-lg font-semibold">
              {currentDate.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <button
              onClick={() => navigateMonth("next")}
              className="p-1 rounded-full hover:bg-gray-100"
            >
              <FiChevronRight className="text-xl" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="text-center text-sm font-medium text-light p-2"
              >
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
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
              renderDay
            )}
          </div>
        </div>

        {/* Selected Date Packages */}
        <div>
          <div className="mb-3">
            <h2 className="text-lg font-semibold">
              {isSameDay(selectedDate, today)
                ? "Today's Packages"
                : selectedDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
            </h2>
            <p className="text-sm text-light">
              Available tours and transfers with booking status
            </p>
          </div>

          {selectedDatePackages.length === 0 ? (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 text-center">
              <p className="text-light">No packages available for this date</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Tabs */}
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
                      <div className="space-y-4">
                        {tours.map((pkg) => (
                          <PackageCard
                            key={pkg.id}
                            package={pkg}
                            selectedDate={selectedDate}
                            formatDate={formatDate}
                            toggleSlotStatus={toggleSlotStatus}
                            isLoadingBookings={isLoadingBookings}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-light text-center py-4">
                        No tours available for{" "}
                        {isSameDay(selectedDate, today) ? "today" : "this date"}
                      </p>
                    )
                  ) : transfers.length > 0 ? (
                    <div className="space-y-4">
                      {transfers.map((pkg) => (
                        <PackageCard
                          key={pkg.id}
                          package={pkg}
                          selectedDate={selectedDate}
                          formatDate={formatDate}
                          toggleSlotStatus={toggleSlotStatus}
                          isLoadingBookings={isLoadingBookings}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-light text-center py-4">
                      No transfers available for{" "}
                      {isSameDay(selectedDate, today) ? "today" : "this date"}
                    </p>
                  )}
                </div>
              </div>

              {/* Summary Stats */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                <h3 className="font-semibold text-dark mb-3">
                  {isSameDay(selectedDate, today) ? "Today's" : "Daily"}{" "}
                  Overview
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-primary/5 rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {tours.reduce((sum, p) => sum + p.currentBookings, 0)}
                    </div>
                    <div className="text-sm text-light">Tour Bookings</div>
                  </div>
                  <div className="text-center p-3 bg-secondary/5 rounded-lg">
                    <div className="text-2xl font-bold text-secondary">
                      {transfers.reduce((sum, p) => sum + p.currentBookings, 0)}
                    </div>
                    <div className="text-sm text-light">Transfer Bookings</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <MobileNav />
    </div>
  );
}

// Package Card Component
function PackageCard({
  package: pkg,
  selectedDate,
  formatDate,
  toggleSlotStatus,
  isLoadingBookings,
}: {
  package: Package;
  selectedDate: Date;
  formatDate: (date: Date) => string;
  toggleSlotStatus: (
    packageId: string,
    packageType: "tour" | "transfer",
    date: string,
    time: string,
    currentStatus: "active" | "sold"
  ) => Promise<void>;
  isLoadingBookings: boolean;
}) {
  const router = useRouter();

  const handlePackageClick = () => {
    const dateStr = formatDate(selectedDate);
    router.push(
      `/bookings/${pkg.id}?date=${dateStr}&time=${pkg.startTime}&type=${pkg.type}`
    );
  };

  const getAvailabilityColor = () => {
    if (!pkg.isAvailable) return "text-red-600";
    const percentage = (pkg.currentBookings / pkg.maxSlots) * 100;
    if (percentage >= 90) return "text-red-600";
    if (percentage >= 70) return "text-yellow-600";
    return "text-green-600";
  };

  const getAvailabilityBg = () => {
    if (!pkg.isAvailable) return "bg-red-50 border-red-200";
    const percentage = (pkg.currentBookings / pkg.maxSlots) * 100;
    if (percentage >= 90) return "bg-red-50 border-red-200";
    if (percentage >= 70) return "bg-yellow-50 border-yellow-200";
    return "bg-green-50 border-green-200";
  };

  const getDurationBadge = () => {
    if (pkg.type === "tour" && pkg.duration) {
      return (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            pkg.duration === "full-day"
              ? "bg-blue-100 text-blue-800"
              : "bg-purple-100 text-purple-800"
          }`}
        >
          {pkg.duration === "full-day" ? "Full Day" : "Half Day"}
        </span>
      );
    }
    return null;
  };

  // Status display is now handled by the badge, no toggle functionality in card

  return (
    <div
      className={`p-4 rounded-lg border ${getAvailabilityBg()} cursor-pointer hover:shadow-md transition-shadow`}
      onClick={handlePackageClick}
    >
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
        {/* Removed the 'Available'/'Sold Out' tag from the top right */}
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
          <div className="text-xs text-light">
            {pkg.maxSlots - pkg.currentBookings} slots available
          </div>
          <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
            <div
              className={`h-2 rounded-full ${
                (pkg.currentBookings / pkg.maxSlots) * 100 >= 90
                  ? "bg-red-500"
                  : (pkg.currentBookings / pkg.maxSlots) * 100 >= 70
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }`}
              style={{
                width: `${(pkg.currentBookings / pkg.maxSlots) * 100}%`,
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
