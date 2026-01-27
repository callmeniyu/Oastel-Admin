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
import {
  formatDateAsMYT,
  parseDateStringAsMYT,
  createMalaysianDate,
  isSameMalaysianDate,
  getMalaysianDateComponents,
  getMalaysianNow,
  addDaysMYT,
  getDaysInMonthMYT,
  getDayOfWeekMYT,
  parseFlexibleDate,
  formatMalaysianDateForDisplay,
} from "@/lib/dateUtils";

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
  vehicle?: string; // Vehicle name for private transfers
  transferType?: string; // Transfer type (Private, Van, etc.)
};

export default function BookingsPage() {
  const today = getMalaysianNow();
  const [currentDate, setCurrentDate] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const [activeTab, setActiveTab] = useState<"tours" | "transfers">("tours");
  const [realBookings, setRealBookings] = useState<any[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const router = useRouter();

  const handleRefresh = async () => {
    fetchRealBookings();
    fetchPackages();
  };

  useEffect(() => {
    fetchRealBookings();
    fetchPackages();
    fetchVehicles();

    // Set up auto-refresh for booking counts every 30 seconds
    const autoRefreshInterval = setInterval(() => {
      fetchRealBookings();
    }, 30000); // 30 seconds

    // Cleanup interval on component unmount
    return () => clearInterval(autoRefreshInterval);
  }, []);

  // Refetch bookings when navigating months (currentDate changes)
  useEffect(() => {
    fetchRealBookings();
  }, [currentDate]);

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

  const fetchVehicles = async () => {
    try {
      const response = await fetch("/api/vehicles");
      const data = await response.json();
      if (data.success) {
        setVehicles(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    }
  };

  const fetchRealBookings = async () => {
    try {
      setIsLoadingBookings(true);

      // Optimize: Only fetch bookings within a date range (current month ±15 days)
      // This significantly reduces data transfer and processing
      const startDate = addDaysMYT(currentDate, -15);
      const endDate = addDaysMYT(currentDate, 45);

      const startDateStr = formatDateAsMYT(startDate);
      const endDateStr = formatDateAsMYT(endDate);

      // Fetch bookings within the date range
      const res = await fetch(
        `/api/bookings?startDate=${startDateStr}&endDate=${endDateStr}`,
      );
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
    currentStatus: "active" | "sold",
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
        },
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
    date: Date,
  ): Package[] => {
    const dateStr = formatDateAsMYT(date);
    const safeBookings = Array.isArray(bookings) ? bookings : [];

    // Helper: normalize booking.date into Malaysian YYYY-MM-DD string
    function bookingDateToMalaysianYYYYMMDD(dateInput: any): string {
      try {
        if (!dateInput) return "";

        // Use the centralized date utility for flexible parsing
        const parsed = parseFlexibleDate(dateInput);
        if (!parsed) return "";

        return formatDateAsMYT(parsed);
      } catch (err) {
        console.error("Error parsing booking date:", dateInput, err);
        return "";
      }
    }

    // Filter bookings for the selected date
    const dateBookings = safeBookings.filter((booking) => {
      if (!booking || !booking.date) return false;
      const bookingDateStr = bookingDateToMalaysianYYYYMMDD(booking.date);
      return bookingDateStr === dateStr;
    });

    // Group bookings by package ID and time
    const bookingMap = new Map<string, any>();
    dateBookings.forEach((booking) => {
      if (!booking.packageId || !booking.packageId._id) return;
      const key = `${booking.packageId._id}-${booking.time}`;
      if (!bookingMap.has(key)) {
        // Determine maxSlots: prefer vehicle.units for private transfers if available
        let maxSlots = booking.packageId?.maximumPerson || 15;
        try {
          const isPrivate =
            booking.packageId?.type === "Private" ||
            booking.packageId?.type === "private";
          const vehicleName = booking.packageId?.vehicle;
          if (isPrivate && vehicleName && Array.isArray(vehicles)) {
            const v = vehicles.find((x) => x.name === vehicleName);
            if (v && typeof v.units === "number") maxSlots = v.units;
          }
        } catch (err) {
          // ignore and fallback
        }

        bookingMap.set(key, {
          id: booking.packageId._id,
          title: booking.packageId?.title || `${booking.packageType} Package`,
          type: booking.packageType,
          duration:
            booking.packageId?.period?.toLowerCase() ||
            (booking.packageType === "tour" ? "half-day" : undefined),
          currentBookings: 0,
          maxSlots,
          startTime: booking.time,
          price: `RM ${booking.packageId?.newPrice || booking.total}`,
          isAvailable: true, // Default to available, will be updated with actual slot data
          bookings: [], // <-- Fix: always initialize bookings array
          vehicle: booking.packageId?.vehicle || undefined,
          transferType: booking.packageId?.type || undefined,
        });
      }
      const packageData = bookingMap.get(key);
      // Count vehicle bookings as 1 (per-vehicle) instead of adults+children
      const increment = booking.isVehicleBooking
        ? 1
        : (booking.adults || 0) + (booking.children || 0);
      packageData.currentBookings += increment;
      packageData.bookings.push(booking);
    });

    // Merge with all available packages for the selected tab
    const availablePackages = Array.isArray(packages)
      ? packages.filter(
          (pkg) => pkg && pkg.packageType === activeTab.slice(0, -1),
        )
      : [];

    // For each available package, ensure it appears at least once (for each time slot if applicable)
    const mergedPackages: Package[] = [];
    availablePackages.forEach((pkg) => {
      // Find all bookings for this package
      const matchingBookings = dateBookings.filter(
        (b) => b.packageId?._id === pkg._id,
      );
      // If there are bookings, use their time slots
      if (matchingBookings.length > 0) {
        // For each time slot with bookings, use the bookingMap entry
        const timeSlots = Array.from(
          new Set(matchingBookings.map((b) => b.time)),
        );
        timeSlots.forEach((time) => {
          const key = `${pkg._id}-${time}`;
          if (bookingMap.has(key)) {
            mergedPackages.push(bookingMap.get(key));
          }
        });
      } else {
        // No bookings for this package on this date, show as available
        let maxSlots = pkg.maximumPerson || 15;
        try {
          const isPrivate = pkg.type === "Private" || pkg.type === "private";
          if (isPrivate && pkg.vehicle && Array.isArray(vehicles)) {
            const v = vehicles.find((x) => x.name === pkg.vehicle);
            if (v && typeof v.units === "number") maxSlots = v.units;
          }
        } catch (err) {
          // ignore
        }

        mergedPackages.push({
          id: pkg._id,
          title: pkg.title || "Package",
          type: pkg.packageType as "tour" | "transfer",
          duration:
            pkg.period?.toLowerCase() ||
            (pkg.packageType === "tour" ? "half-day" : undefined),
          currentBookings: 0,
          maxSlots,
          startTime: pkg.departureTimes?.[0] || pkg.times?.[0] || "Multiple",
          price: `RM ${pkg.newPrice || 0}`,
          isAvailable: true, // Default to available
          vehicle: pkg.vehicle || undefined,
          transferType: pkg.type || undefined,
        });
      }
    });

    return mergedPackages;
  };

  const selectedDatePackages = processBookingsIntoPackages(
    realBookings,
    selectedDate,
  );

  // Compute tour and transfer counts for the selected date independent of the active tab
  function bookingDateToMalaysianYYYYMMDD(dateInput: any): string {
    try {
      if (!dateInput) return "";

      const parsed = parseFlexibleDate(dateInput);
      if (!parsed) return "";

      return formatDateAsMYT(parsed);
    } catch (err) {
      console.error("Error parsing booking date:", dateInput, err);
      return "";
    }
  }

  const { tourCount, transferCount } = (function computeCounts() {
    const dateStr = formatDateAsMYT(selectedDate);
    const safeBookings = Array.isArray(realBookings) ? realBookings : [];
    let tCount = 0;
    let trCount = 0;
    for (const booking of safeBookings) {
      if (!booking) continue;
      const bDateStr = bookingDateToMalaysianYYYYMMDD(booking.date);
      if (bDateStr !== dateStr) continue;
      const increment = booking.isVehicleBooking
        ? 1
        : (booking.adults || 0) + (booking.children || 0);
      const explicitType = (booking.packageType || "").toString().toLowerCase();
      if (explicitType === "tour") {
        tCount += increment;
        continue;
      }
      if (explicitType === "transfer") {
        trCount += increment;
        continue;
      }
      // Fallback: check packageId.type or packageId.packageType
      const pkgType = (
        (booking.packageId &&
          (booking.packageId.type || booking.packageId.packageType)) ||
        ""
      )
        .toString()
        .toLowerCase();
      if (pkgType === "tour") tCount += increment;
      else if (pkgType === "transfer") trCount += increment;
    }
    return { tourCount: tCount, transferCount: trCount };
  })();

  // Calculate counts for both tours and transfers from all bookings (always for selectedDate)
  const allPackagesForSelectedDate = processBookingsIntoPackages(
    realBookings,
    selectedDate,
  );
  const tours = allPackagesForSelectedDate.filter((p) => p.type === "tour");
  const transfers = allPackagesForSelectedDate.filter(
    (p) => p.type === "transfer",
  );

  // Generate days for the current month view using Malaysian timezone
  const { year: currentYear, month: currentMonth } =
    getMalaysianDateComponents(currentDate);
  const daysInMonth = getDaysInMonthMYT(currentDate);
  const firstDayOfMonth = createMalaysianDate(currentYear, currentMonth, 1);
  const firstDayOfWeek = getDayOfWeekMYT(firstDayOfMonth);

  const navigateMonth = (direction: "prev" | "next") => {
    const { year, month } = getMalaysianDateComponents(currentDate);
    const newMonth = direction === "prev" ? month - 1 : month + 1;
    let newYear = year;
    let adjustedMonth = newMonth;

    if (newMonth < 1) {
      adjustedMonth = 12;
      newYear = year - 1;
    } else if (newMonth > 12) {
      adjustedMonth = 1;
      newYear = year + 1;
    }

    setCurrentDate(createMalaysianDate(newYear, adjustedMonth, 1));
  };

  const handleDateClick = (day: number) => {
    const { year, month } = getMalaysianDateComponents(currentDate);
    const clickedDate = createMalaysianDate(year, month, day);
    // Admin can select any date (past or future)
    setSelectedDate(clickedDate);
  };

  // Helper functions - now using centralized utilities
  function formatDate(date: Date): string {
    return formatDateAsMYT(date);
  }

  function formatDateFromString(dateString: string): string {
    const date = parseDateStringAsMYT(dateString);
    return formatDateAsMYT(date);
  }

  function getNextDay(date: Date, days = 1): Date {
    return addDaysMYT(date, days);
  }

  function isSameDay(date1: Date, date2: Date): boolean {
    return isSameMalaysianDate(date1, date2);
  }

  function isBeforeToday(date: Date): boolean {
    // Admin can view all days - no date restrictions
    return false;
  }

  function renderDay(day: number) {
    const { year, month } = getMalaysianDateComponents(currentDate);
    const date = createMalaysianDate(year, month, day);

    // Only show dot if there are actual bookings for this date
    const dateStr = formatDateAsMYT(date);
    const hasBookings =
      Array.isArray(realBookings) &&
      realBookings.some((booking) => {
        if (!booking || !booking.date) return false;
        const parsed = parseFlexibleDate(booking.date);
        if (!parsed) return false;
        return formatDateAsMYT(parsed) === dateStr;
      });
    const isSelected = isSameDay(date, selectedDate);
    const isDisabled = false; // Admin can select any day

    return (
      <button
        key={day}
        onClick={() => handleDateClick(day)}
        disabled={isDisabled}
        className={`min-h-16 p-1 border ${
          isSelected
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
              {formatMalaysianDateForDisplay(currentDate, {
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
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-16"></div>
            ))}

            {/* Days of the month */}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
              renderDay,
            )}
          </div>
        </div>

        {/* Selected Date Packages */}
        <div>
          <div className="mb-3">
            <h2 className="text-lg font-semibold">
              {isSameDay(selectedDate, today)
                ? "Today's Packages"
                : formatMalaysianDateForDisplay(selectedDate, {
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
                    Tours
                  </button>
                  <button
                    onClick={() => setActiveTab("transfers")}
                    className={`flex-1 px-4 py-3 text-sm font-medium ${
                      activeTab === "transfers"
                        ? "text-primary border-b-2 border-primary bg-primary/5"
                        : "text-light hover:text-dark"
                    }`}
                  >
                    Transfers
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
                            vehicles={vehicles}
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
                          vehicles={vehicles}
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
                      {tourCount}
                    </div>
                    <div className="text-sm text-light">Tour Bookings</div>
                  </div>
                  <div className="text-center p-3 bg-secondary/5 rounded-lg">
                    <div className="text-2xl font-bold text-secondary">
                      {transferCount}
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
  vehicles,
}: {
  package: Package;
  selectedDate: Date;
  formatDate: (date: Date) => string;
  toggleSlotStatus: (
    packageId: string,
    packageType: "tour" | "transfer",
    date: string,
    time: string,
    currentStatus: "active" | "sold",
  ) => Promise<void>;
  isLoadingBookings: boolean;
  vehicles: any[];
}) {
  const router = useRouter();

  // Calculate vehicle availability for private transfers
  const getVehicleAvailability = () => {
    if (
      pkg.type === "transfer" &&
      pkg.transferType === "Private" &&
      pkg.vehicle
    ) {
      const vehicle = vehicles.find((v) => v.name === pkg.vehicle);
      if (vehicle) {
        // For private transfers, each booking takes 1 vehicle
        const availableVehicles = vehicle.units - pkg.currentBookings;
        return {
          available: Math.max(0, availableVehicles),
          total: vehicle.units,
          isVehicleDisplay: true,
        };
      }
    }
    // Default for non-private transfers or when vehicle not found
    return {
      available: pkg.maxSlots - pkg.currentBookings,
      total: pkg.maxSlots,
      isVehicleDisplay: false,
    };
  };

  const availability = getVehicleAvailability();

  const handlePackageClick = () => {
    const dateStr = formatDate(selectedDate);
    router.push(
      `/bookings/${pkg.id}?date=${dateStr}&time=${pkg.startTime}&type=${pkg.type}`,
    );
  };

  const getAvailabilityColor = () => {
    if (!pkg.isAvailable) return "text-red-600";
    const percentage = (pkg.currentBookings / availability.total) * 100;
    if (percentage >= 90) return "text-red-600";
    if (percentage >= 70) return "text-yellow-600";
    return "text-green-600";
  };

  const getAvailabilityBg = () => {
    if (!pkg.isAvailable) return "bg-red-50 border-red-200";
    const percentage = (pkg.currentBookings / availability.total) * 100;
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

  const getPrivateBadge = () => {
    try {
      const t = pkg.transferType || pkg.type;
      if (!t) return null;
      if (typeof t === "string" && t.toLowerCase() === "private") {
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            Private
          </span>
        );
      }
    } catch (err) {
      return null;
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
            {getPrivateBadge()}
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
            {pkg.currentBookings} / {availability.total}
          </span>
        </div>

        <div className="text-right">
          <div className="text-xs text-light">
            {availability.available}{" "}
            {availability.isVehicleDisplay ? "vehicles" : "slots"} available
          </div>
          <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
            <div
              className={`h-2 rounded-full ${
                (pkg.currentBookings / availability.total) * 100 >= 90
                  ? "bg-red-500"
                  : (pkg.currentBookings / availability.total) * 100 >= 70
                    ? "bg-yellow-500"
                    : "bg-green-500"
              }`}
              style={{
                width: `${(pkg.currentBookings / availability.total) * 100}%`,
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
