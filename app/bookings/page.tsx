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
  FiUser,
  FiSave,
  FiX,
  FiEdit,
} from "react-icons/fi";
import { useRouter } from "next/navigation";
import Confirmation from "@/components/ui/Confirmation";
import toast from "react-hot-toast";
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
  normalizeTime,
  formatTimeDisplay,
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
  minimumPerson: number;
  vehicle?: string; // Vehicle name for private transfers
  transferType?: string; // Transfer type (Private, Van, etc.)
  image?: string;
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
  const [timeSlotsMap, setTimeSlotsMap] = useState<
    Record<string, { isAvailable: boolean; minimumPerson: number }>
  >({});
  const router = useRouter();

  const handleRefresh = async () => {
    fetchRealBookings();
    fetchPackages();
    fetchTimeSlotsForDate(selectedDate);
  };

  useEffect(() => {
    fetchRealBookings();
    fetchPackages();
    fetchVehicles();
    fetchTimeSlotsForDate(selectedDate);

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
    fetchTimeSlotsForDate(selectedDate);
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

      const rawTours = toursData.tours || toursData.data || [];
      const rawTransfers = transfersData.transfers || transfersData.data || [];

      // Ensure server responses are normalized: tours -> packageType 'tour', transfers -> 'transfer'
      const allPackages = [
        ...(Array.isArray(rawTours) ? rawTours : []).map((tour: any) => ({
          ...tour,
          packageType: "tour",
        })),
        ...(Array.isArray(rawTransfers) ? rawTransfers : []).map((transfer: any) => ({
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

  const fetchTimeSlotsForDate = async (date: Date) => {
    const dateStr = formatDateAsMYT(date);
    try {
      const res = await fetch(`/api/timeslots?date=${dateStr}`);
      if (res.ok) {
        const result = await res.json();
        if (result.success && Array.isArray(result.data)) {
          const map: Record<string, { isAvailable: boolean; minimumPerson: number }> = {};
          result.data.forEach((pkgSlots: any) => {
            const pkgId = pkgSlots.packageId;
            if (pkgId && Array.isArray(pkgSlots.slots)) {
              pkgSlots.slots.forEach((slot: any) => {
                const normTime = normalizeTime(slot.time);
                map[`${pkgId}_${normTime}`] = {
                  isAvailable: slot.isAvailable,
                  minimumPerson: typeof slot.currentMinimum === "number" ? slot.currentMinimum : slot.minimumPerson
                };
              });
            }
          });
          setTimeSlotsMap(map);
        }
      }
    } catch (error) {
      console.error("Error fetching timeslots for date:", error);
    }
  };

  const toggleSlotAvailability = async (
    packageId: string,
    packageType: "tour" | "transfer",
    time: string,
    currentIsAvailable: boolean
  ) => {
    const normTime = normalizeTime(time);
    const dateStr = formatDateAsMYT(selectedDate);
    const slotMapKey = `${packageId}_${normTime}`;
    const newAvailable = !currentIsAvailable;

    // Optimistic Update
    setTimeSlotsMap((prev) => ({
      ...prev,
      [slotMapKey]: {
        isAvailable: newAvailable,
        minimumPerson: prev[slotMapKey]?.minimumPerson ?? 1,
      },
    }));

    try {
      const response = await fetch("/api/timeslots/toggle-availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId,
          packageType,
          date: dateStr,
          time: normTime,
          isAvailable: newAvailable,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        // Rollback
        setTimeSlotsMap((prev) => ({
          ...prev,
          [slotMapKey]: {
            isAvailable: currentIsAvailable,
            minimumPerson: prev[slotMapKey]?.minimumPerson ?? 1,
          },
        }));
        toast.error(data.error || "Failed to update availability");
      } else {
        toast.success(`Slot successfully ${newAvailable ? "activated" : "deactivated"}`);
      }
    } catch (error) {
      // Rollback
      setTimeSlotsMap((prev) => ({
        ...prev,
        [slotMapKey]: {
          isAvailable: currentIsAvailable,
          minimumPerson: prev[slotMapKey]?.minimumPerson ?? 1,
        },
      }));
      console.error("Failed to toggle slot status", error);
      toast.error("An error occurred while updating timeslot");
    }
  };

  const updateMinimumPerson = async (
    packageId: string,
    packageType: "tour" | "transfer",
    time: string,
    newMinimumPerson: number
  ) => {
    const normTime = normalizeTime(time);
    const dateStr = formatDateAsMYT(selectedDate);
    const slotMapKey = `${packageId}_${normTime}`;
    const originalMin = timeSlotsMap[slotMapKey]?.minimumPerson ?? 1;

    // Optimistic Update
    setTimeSlotsMap((prev) => ({
      ...prev,
      [slotMapKey]: {
        isAvailable: prev[slotMapKey]?.isAvailable ?? true,
        minimumPerson: newMinimumPerson,
      },
    }));

    try {
      const response = await fetch("/api/timeslots/minimum-person", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId,
          packageType,
          date: dateStr,
          time: normTime,
          minimumPerson: newMinimumPerson,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        // Rollback
        setTimeSlotsMap((prev) => ({
          ...prev,
          [slotMapKey]: {
            isAvailable: prev[slotMapKey]?.isAvailable ?? true,
            minimumPerson: originalMin,
          },
        }));
        toast.error(data.error || "Failed to update minimum person count");
      } else {
        toast.success("Minimum person count updated successfully");
      }
    } catch (error) {
      // Rollback
      setTimeSlotsMap((prev) => ({
        ...prev,
        [slotMapKey]: {
          isAvailable: prev[slotMapKey]?.isAvailable ?? true,
          minimumPerson: originalMin,
        },
      }));
      console.error("Failed to update minimum person count", error);
      toast.error("An error occurred while updating minimum person count");
    }
  };

  // Process real bookings data into Package format
  const processBookingsIntoPackages = (
    bookings: any[],
    date: Date,
    targetType?: "tour" | "transfer",
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

    // Merge with all available packages for the selected type or tab
    const requestedType = targetType || (activeTab.slice(0, -1) as "tour" | "transfer");

    // Group bookings by package ID and normalized time
    const bookingMap = new Map<string, any>();
    dateBookings.forEach((booking) => {
      if (!booking.packageId || !booking.packageId._id) return;

      // Ensure booking matches requestedType
      const bPkgType = (
        booking.packageType ||
        booking.packageId?.packageType ||
        ""
      )
        .toString()
        .toLowerCase();
      if (requestedType && bPkgType && bPkgType !== requestedType) {
        return;
      }

      const normTime = normalizeTime(booking.time);
      const key = `${booking.packageId._id}-${normTime}`;
      if (!bookingMap.has(key)) {
        // Determine maxSlots: prefer slotConfigs, then vehicle.units for private transfers, then maximumPerson
        let maxSlots = 15;
        const slotCfg = booking.packageId?.slotConfigs?.find(
          (sc: any) => normalizeTime(sc.time) === normTime,
        );
        if (slotCfg && typeof slotCfg.maximumPerson === "number") {
          maxSlots = slotCfg.maximumPerson;
        } else if (booking.packageId?.maximumPerson) {
          maxSlots = booking.packageId.maximumPerson;
        }
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
          type: booking.packageType || booking.packageId?.packageType || requestedType,
          duration:
            booking.packageId?.period?.toLowerCase() ||
            ((booking.packageType || booking.packageId?.packageType) === "tour" ? "half-day" : undefined),
          currentBookings: 0,
          maxSlots,
          startTime: booking.time,
          price: `RM ${booking.packageId?.newPrice || booking.total}`,
          isAvailable: true, // Default to available, will be updated with actual slot data
          minimumPerson: 1,
          bookings: [], // Always initialize bookings array
          vehicle: booking.packageId?.vehicle || undefined,
          transferType: booking.packageId?.type || undefined,
          image: booking.packageId?.image || undefined,
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

    const availablePackages = Array.isArray(packages)
      ? packages.filter(
          (pkg) => pkg && pkg.packageType === requestedType,
        )
      : [];

    // For each available package, ensure EVERY configured time slot appears
    const mergedPackages: Package[] = [];
    availablePackages.forEach((pkg) => {
      const configuredTimes: string[] = pkg.departureTimes || pkg.times || [];
      const matchingBookings = dateBookings.filter(
        (b) => b.packageId?._id === pkg._id,
      );
      const bookedTimes: string[] = matchingBookings.map((b) => b.time);

      // Collect unique time slots mapped to normalized key
      const timeslotMap = new Map<string, string>();
      configuredTimes.forEach((t) => {
        if (t) {
          const norm = normalizeTime(t);
          if (!timeslotMap.has(norm)) {
            timeslotMap.set(norm, t);
          }
        }
      });
      bookedTimes.forEach((t) => {
        if (t) {
          const norm = normalizeTime(t);
          if (!timeslotMap.has(norm)) {
            timeslotMap.set(norm, t);
          }
        }
      });

      if (timeslotMap.size === 0) {
        timeslotMap.set("08:00", "08:00 AM");
      }

      timeslotMap.forEach((displayTime, normTime) => {
        const key = `${pkg._id}-${normTime}`;
        const slotMapKey = `${pkg._id}_${normTime}`;
        const slotData = timeSlotsMap[slotMapKey];

        const slotCfg = pkg.slotConfigs?.find(
          (sc: any) => normalizeTime(sc.time) === normTime
        );
        const defaultMinPerson = slotCfg?.minimumPerson || pkg.minimumPerson || 1;

        const isAvailable = slotData ? slotData.isAvailable : true;
        const minimumPerson = slotData ? slotData.minimumPerson : defaultMinPerson;

        if (bookingMap.has(key)) {
          const bookingPkg = bookingMap.get(key);
          bookingPkg.isAvailable = isAvailable;
          bookingPkg.minimumPerson = minimumPerson;
          mergedPackages.push(bookingPkg);
        } else {
          let maxSlots = 15;
          if (slotCfg && typeof slotCfg.maximumPerson === "number") {
            maxSlots = slotCfg.maximumPerson;
          } else if (pkg.maximumPerson) {
            maxSlots = pkg.maximumPerson;
          }
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
            startTime: displayTime,
            price: `RM ${pkg.newPrice || 0}`,
            isAvailable,
            minimumPerson,
            vehicle: pkg.vehicle || undefined,
            transferType: pkg.type || undefined,
            image: pkg.image || undefined,
          });
        }
      });
    });

    // Sort packages with most bookings on top descending down
    mergedPackages.sort((a, b) => b.currentBookings - a.currentBookings);

    return mergedPackages;
  };

  const tours = processBookingsIntoPackages(
    realBookings,
    selectedDate,
    "tour",
  );
  const transfers = processBookingsIntoPackages(
    realBookings,
    selectedDate,
    "transfer",
  );
  const selectedDatePackages = activeTab === "tours" ? tours : transfers;

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
      // Fallback: check packageId.packageType or packageId.type
      const pkgType = (
        (booking.packageId &&
          (booking.packageId.packageType || booking.packageId.type)) ||
        ""
      )
        .toString()
        .toLowerCase();
      if (pkgType === "tour") tCount += increment;
      else if (pkgType === "transfer") trCount += increment;
    }
    return { tourCount: tCount, transferCount: trCount };
  })();

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

  function isSameDay(date1: Date, date2: Date): boolean {
    return isSameMalaysianDate(date1, date2);
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
                            key={`${pkg.id}-${pkg.startTime}`}
                            package={pkg}
                            selectedDate={selectedDate}
                            formatDate={formatDate}
                            toggleSlotAvailability={toggleSlotAvailability}
                            updateMinimumPerson={updateMinimumPerson}
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
                          key={`${pkg.id}-${pkg.startTime}`}
                          package={pkg}
                          selectedDate={selectedDate}
                          formatDate={formatDate}
                          toggleSlotAvailability={toggleSlotAvailability}
                          updateMinimumPerson={updateMinimumPerson}
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
  toggleSlotAvailability,
  updateMinimumPerson,
  isLoadingBookings,
  vehicles,
}: {
  package: Package;
  selectedDate: Date;
  formatDate: (date: Date) => string;
  toggleSlotAvailability: (
    packageId: string,
    packageType: "tour" | "transfer",
    time: string,
    currentIsAvailable: boolean
  ) => Promise<void>;
  updateMinimumPerson: (
    packageId: string,
    packageType: "tour" | "transfer",
    time: string,
    newMinimumPerson: number
  ) => Promise<void>;
  isLoadingBookings: boolean;
  vehicles: any[];
}) {
  const router = useRouter();

  const [showToggleConfirm, setShowToggleConfirm] = useState(false);
  const [showEditMinPersonModal, setShowEditMinPersonModal] = useState(false);
  const [editingMinPersonValue, setEditingMinPersonValue] = useState(
    pkg.minimumPerson.toString()
  );
  const [pendingMinPersonValue, setPendingMinPersonValue] = useState<number | null>(
    null
  );
  const [showMinPersonConfirm, setShowMinPersonConfirm] = useState(false);

  // Sync internal edit value when pkg.minimumPerson changes
  useEffect(() => {
    setEditingMinPersonValue(pkg.minimumPerson.toString());
  }, [pkg.minimumPerson]);

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
    if (!pkg.isAvailable) return "bg-red-50 border-red-300";
    const percentage = (pkg.currentBookings / availability.total) * 100;
    if (percentage >= 90) return "bg-red-50 border-red-200";
    if (percentage >= 70) return "bg-yellow-50 border-yellow-200";
    return "bg-green-50/70 border-green-200";
  };

  return (
    <div
      className={`p-4 rounded-lg border ${getAvailabilityBg()} cursor-pointer hover:shadow-md transition-shadow`}
      onClick={handlePackageClick}
    >
      <div className="flex items-center gap-3 mb-3">
        {pkg.image ? (
          <img
            src={pkg.image}
            alt={pkg.title}
            className="w-14 h-14 rounded-md object-cover flex-shrink-0 border border-gray-200"
          />
        ) : (
          <div className="w-14 h-14 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 text-gray-400 text-xs font-medium">
            No Image
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-dark truncate">{pkg.title}</h3>
          <div className="flex items-center gap-4 text-sm text-light mt-1">
            <div className="flex items-center gap-1">
              <FiClock className="text-xs" />
              <span>{formatTimeDisplay(pkg.startTime)}</span>
            </div>
            <span className="font-medium text-primary">{pkg.price}</span>
          </div>
        </div>
      </div>

      {/* Booking Status & Slot Control Layout */}
      <div
        className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Side: Bookings Count & ProgressBar */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-light">
            <span className="flex items-center gap-1.5">
              <FiUsers size={14} className="text-gray-400" />
              <span className="font-semibold text-dark">
                {pkg.currentBookings}
              </span>{" "}
              / <span className="font-semibold">{availability.total}</span>{" "}
              Booked
            </span>
            <span className="font-semibold text-gray-500">
              {availability.available}{" "}
              {availability.isVehicleDisplay ? "veh" : "slots"} left
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden border border-gray-200/50">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                !pkg.isAvailable
                  ? "bg-red-500"
                  : (pkg.currentBookings / availability.total) * 100 >= 90
                    ? "bg-red-500"
                    : (pkg.currentBookings / availability.total) * 100 >= 70
                      ? "bg-yellow-500"
                      : "bg-green-500"
              }`}
              style={{
                width: `${Math.min(
                  100,
                  (pkg.currentBookings / availability.total) * 100,
                )}%`,
              }}
            />
          </div>
        </div>

        {/* Right Side: Status Toggle & Minimum Person Info */}
        <div className="flex items-center justify-between sm:justify-end gap-4">
          {/* Toggle Switch with Active/Disabled label */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowToggleConfirm(true);
              }}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                pkg.isAvailable ? "bg-green-500" : "bg-gray-300"
              }`}
              aria-label={
                pkg.isAvailable ? "Deactivate timeslot" : "Activate timeslot"
              }
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  pkg.isAvailable ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
            <span
              className={`text-xs font-semibold ${
                pkg.isAvailable ? "text-green-600" : "text-red-500"
              }`}
            >
              {pkg.isAvailable ? "Active" : "Disabled"}
            </span>
          </div>

          {/* Minimum Person Display & Edit Button */}
          <div className="flex items-center gap-1.5 bg-gray-50 p-1.5 px-2.5 rounded-lg border border-gray-200 text-xs">
            <FiUser className="text-gray-400" />
            <span className="text-gray-500 font-medium">Min:</span>
            <span className="font-bold text-dark">{pkg.minimumPerson}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEditingMinPersonValue(pkg.minimumPerson.toString());
                setShowEditMinPersonModal(true);
              }}
              className="ml-1 px-2 py-0.5 text-[10px] bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded transition-colors font-semibold"
            >
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation & Edit Modals */}
      <Confirmation
        isOpen={showToggleConfirm}
        onClose={() => setShowToggleConfirm(false)}
        onConfirm={() => {
          toggleSlotAvailability(
            pkg.id,
            pkg.type,
            pkg.startTime,
            pkg.isAvailable,
          );
          setShowToggleConfirm(false);
        }}
        title={pkg.isAvailable ? "Deactivate Time Slot" : "Activate Time Slot"}
        message={
          <div>
            <p>
              Are you sure you want to{" "}
              <span className="font-bold underline">
                {pkg.isAvailable ? "DEACTIVATE" : "ACTIVATE"}
              </span>{" "}
              the{" "}
              <span className="font-semibold">
                {formatTimeDisplay(pkg.startTime)}
              </span>{" "}
              time slot for <span className="font-semibold">"{pkg.title}"</span>{" "}
              on{" "}
              <span className="font-semibold">
                {formatMalaysianDateForDisplay(selectedDate, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              ?
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {pkg.isAvailable
                ? "Deactivating this slot will prevent customers from booking this time slot."
                : "Activating this slot will allow customers to book this time slot."}
            </p>
          </div>
        }
        confirmText={pkg.isAvailable ? "Deactivate" : "Activate"}
        cancelText="Cancel"
        variant={pkg.isAvailable ? "danger" : "default"}
      />

      <Confirmation
        isOpen={showMinPersonConfirm}
        onClose={() => setShowMinPersonConfirm(false)}
        onConfirm={() => {
          if (pendingMinPersonValue !== null) {
            updateMinimumPerson(
              pkg.id,
              pkg.type,
              pkg.startTime,
              pendingMinPersonValue,
            );
          }
          setShowMinPersonConfirm(false);
        }}
        title="Update Minimum Person"
        message={
          <div>
            <p>
              Are you sure you want to change the minimum person requirement for{" "}
              <span className="font-semibold">
                {formatTimeDisplay(pkg.startTime)}
              </span>{" "}
              slot of <span className="font-semibold">"{pkg.title}"</span> from{" "}
              <span className="font-bold">{pkg.minimumPerson}</span> to{" "}
              <span className="font-bold text-primary">
                {pendingMinPersonValue}
              </span>
              ?
            </p>
          </div>
        }
        confirmText="Update"
        cancelText="Cancel"
        variant="default"
      />

      {/* Edit Minimum Person Popup Window */}
      {showEditMinPersonModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white rounded-xl shadow-xl border border-gray-100 max-w-sm w-full p-5 scale-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-dark mb-2">
              Edit Minimum Person
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Set the minimum number of persons required for the{" "}
              <span className="font-semibold">
                {formatTimeDisplay(pkg.startTime)}
              </span>{" "}
              slot of <span className="font-semibold">"{pkg.title}"</span>.
            </p>

            <div className="flex flex-col gap-1 mb-5">
              <label className="text-xs font-semibold text-gray-600">
                Minimum Person Count
              </label>
              <input
                type="number"
                min="1"
                value={editingMinPersonValue}
                onChange={(e) => setEditingMinPersonValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-bold text-center focus:ring-2 focus:ring-primary focus:border-primary text-dark"
                autoFocus
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const val = parseInt(editingMinPersonValue, 10);
                  if (isNaN(val) || val < 1) {
                    toast.error("Minimum person must be at least 1");
                    return;
                  }
                  if (val === pkg.minimumPerson) {
                    setShowEditMinPersonModal(false);
                    return;
                  }
                  setPendingMinPersonValue(val);
                  setShowMinPersonConfirm(true);
                  setShowEditMinPersonModal(false);
                }}
                className="flex-1 py-2 bg-primary text-white hover:bg-primary-dark rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <FiSave size={15} />
                <span>Save</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingMinPersonValue(pkg.minimumPerson.toString());
                  setShowEditMinPersonModal(false);
                }}
                className="flex-1 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <FiX size={15} />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
