"use client";
import AdminHeader from "@/components/admin/AdminHeader";
import MobileNav from "@/components/admin/MobileNav";
import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  FiArrowLeft,
  FiUser,
  FiCalendar,
  FiClock,
  FiMapPin,
  FiPhone,
  FiMail,
  FiToggleLeft,
  FiToggleRight,
  FiCheck,
  FiX,
  FiChevronDown,
  FiChevronUp,
  FiTrash2,
} from "react-icons/fi";
import Confirmation from "@/components/ui/Confirmation";
import { toast } from "react-hot-toast";

interface Customer {
  _id: string;
  contactInfo: {
    name: string;
    email: string;
    phone: string;
  };
  adults: number;
  children: number;
  // Booking date and time
  date: string;
  time: string;
  pickupLocation?: string;
  status: "pending" | "confirmed" | "cancelled";
  total: number;
  createdAt: string;
}

export default function PackageDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const packageId = params.id as string;
  const date = searchParams.get("date");
  const time = searchParams.get("time");
  const type = searchParams.get("type");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [packageDetails, setPackageDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<any[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isTimeslotSectionExpanded, setIsTimeslotSectionExpanded] =
    useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    bookingId: string;
    customerName: string;
  }>({
    isOpen: false,
    bookingId: "",
    customerName: "",
  });

  useEffect(() => {
    if (packageId && date && time) {
      fetchPackageCustomers();
      fetchPackageDetails();
      fetchTimeSlots();
    }
  }, [packageId, date, time]);

  const fetchPackageCustomers = async () => {
    try {
      const response = await fetch(
        `/api/bookings?packageId=${packageId}&date=${date}&time=${time}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch customers");
      }

      const data = await response.json();
      setCustomers(data.bookings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const fetchPackageDetails = async () => {
    try {
      const endpoint = type === "tour" ? "/api/tours" : "/api/transfers";
      const response = await fetch(`${endpoint}/${packageId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch package details");
      }

      const data = await response.json();
      setPackageDetails(data.tour || data.transfer);
    } catch (err) {
      console.error("Error fetching package details:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeSlots = async () => {
    try {
      if (!packageId || !date || !type) return;

      const response = await fetch(
        `/api/timeslots?packageId=${packageId}&date=${date}&packageType=${type}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch time slots");
      }

      const data = await response.json();
      setTimeSlots(data.data || []);
    } catch (err) {
      console.error("Error fetching time slots:", err);
    }
  };

  const toggleSlotAvailability = async (
    time: string,
    isCurrentlyAvailable: boolean
  ) => {
    try {
      setIsUpdating(true);

      const response = await fetch(`/api/timeslots/toggle-availability`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId,
          packageType: type,
          date,
          time,
          isAvailable: !isCurrentlyAvailable,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Re-fetch time slots to reflect the changes
        await fetchTimeSlots();
        await fetchPackageCustomers();
      } else {
        console.error("Failed to toggle slot status:", data.error);
      }
    } catch (error) {
      console.error("Failed to toggle slot availability:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    try {
      setIsUpdating(true);

      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Refresh the customer list and time slots after successful deletion
        await fetchPackageCustomers();
        await fetchTimeSlots();

        // Close the confirmation dialog
        setDeleteConfirmation({
          isOpen: false,
          bookingId: "",
          customerName: "",
        });
        // Show success toast
        toast.success("Booking deleted successfully");
      } else {
        console.error(
          "Failed to delete booking:",
          data.error || "Unknown error"
        );
        toast.error("Failed to delete booking. Please try again.");
      }
    } catch (error) {
      console.error("Error deleting booking:", error);
      toast.error("An error occurred while deleting the booking.");
    } finally {
      setIsUpdating(false);
    }
  };

  const openDeleteConfirmation = (bookingId: string, customerName: string) => {
    setDeleteConfirmation({
      isOpen: true,
      bookingId,
      customerName,
    });
  };

  const closeDeleteConfirmation = () => {
    setDeleteConfirmation({
      isOpen: false,
      bookingId: "",
      customerName: "",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Determine if the current package is a private package
  const isPackagePrivate = (() => {
    try {
      if (!packageDetails) return false;
      const t =
        packageDetails.type ||
        packageDetails.transferType ||
        packageDetails.packageType;
      return typeof t === "string" && t.toLowerCase() === "private";
    } catch (err) {
      return false;
    }
  })();

  const formatDateTime = (
    dateStr: string | undefined,
    timeStr: string | undefined
  ) => {
    try {
      const d = dateStr ? new Date(dateStr) : null;
      const datePart = d
        ? d.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "";

      let timePart = timeStr || "";
      if (timePart) {
        const [hh, mm] = timePart.split(":");
        const hour = parseInt(hh || "0", 10);
        const ampm = hour >= 12 ? "PM" : "AM";
        const hour12 = hour % 12 || 12;
        timePart = `${hour12}:${mm || "00"} ${ampm}`;
      }

      return `${datePart}${
        datePart && timePart ? " — " : ""
      }${timePart}`.trim();
    } catch {
      return `${dateStr || ""} ${timeStr || ""}`.trim();
    }
  };

  const totalCustomers = customers.reduce(
    (sum, customer) => sum + customer.adults + customer.children,
    0
  );
  const totalRevenue = customers
    .filter((customer) => customer.status !== "cancelled")
    .reduce((sum, customer) => sum + customer.total, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminHeader />
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />

      <div className="max-w-6xl mx-auto p-4 md:p-6 pb-20 md:pb-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiArrowLeft className="text-xl" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-dark">
              {packageDetails?.title || "Package Details"}
            </h1>
            <p className="text-light">
              {new Date(date || "").toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}{" "}
              at {time}
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="flex  md:grid md:grid-cols-3 gap-4 md:gap-6 mb-8">
          {/* Total Customers */}
          <div className="bg-white p-3 md:p-6 rounded-xl shadow-sm border flex-1 flex items-center md:block">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <div className="p-2 md:p-3 bg-blue-100 rounded-lg">
                <FiUser className="text-blue-600 text-lg md:text-xl" />
              </div>
              <div className="text-center md:text-left">
                <p className="text-light text-xs md:text-sm">Total Customers</p>
                <p className="text-lg md:text-2xl font-bold text-dark">
                  {totalCustomers}
                </p>
              </div>
            </div>
          </div>

          {/* Total Bookings */}
          <div className="bg-white p-3 md:p-6 rounded-xl shadow-sm border flex-1 flex items-center md:block">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <div className="p-2 md:p-3 bg-green-100 rounded-lg">
                <FiCalendar className="text-green-600 text-lg md:text-xl" />
              </div>
              <div className="text-center md:text-left">
                <p className="text-light text-xs md:text-sm ">Total Bookings</p>
                <p className="text-lg md:text-2xl font-bold text-dark">
                  {customers.length}
                </p>
              </div>
            </div>
          </div>

          {/* Total Revenue */}
          <div className="bg-white p-3 md:p-6 rounded-xl shadow-sm border flex-1 flex items-center md:block">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <div className="p-2 md:p-3 bg-primary/10 rounded-lg">
                <FiClock className="text-primary text-lg md:text-xl" />
              </div>
              <div className="text-center md:text-left">
                <p className="text-light text-xs md:text-sm">Total Revenue</p>
                <p className="text-lg md:text-2xl font-bold text-dark">
                  RM {totalRevenue}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Time Slot Management */}
        <div className="bg-white rounded-xl shadow-sm border mb-8">
          <button
            onClick={() =>
              setIsTimeslotSectionExpanded(!isTimeslotSectionExpanded)
            }
            className="w-full p-6 border-b flex justify-between items-center hover:bg-gray-50 transition-colors"
          >
            <div className="text-left">
              <h2 className="text-xl font-semibold text-dark">
                Time Slot Management
              </h2>
              <p className="text-sm text-light mt-1">
                Toggle availability for this package's time slots
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fetchTimeSlots();
                }}
                className="px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium"
                title="Refresh Time Slots"
              >
                Refresh
              </button>
              {isTimeslotSectionExpanded ? (
                <FiChevronUp className="text-xl text-gray-500" />
              ) : (
                <FiChevronDown className="text-xl text-gray-500" />
              )}
            </div>
          </button>

          {isTimeslotSectionExpanded && (
            <div className="p-6">
              {timeSlots.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-light mb-2">
                    No time slots found for this date
                  </p>
                  <p className="text-sm text-gray-500">
                    Try selecting a different date or package
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {timeSlots.map((slot) => (
                    <div
                      key={slot.time}
                      className={`p-5 rounded-xl border ${
                        slot.isAvailable
                          ? "border-green-200 bg-green-50"
                          : "border-red-200 bg-red-50"
                      } transition-all duration-300`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <FiClock
                              className={
                                slot.isAvailable
                                  ? "text-green-600"
                                  : "text-red-600"
                              }
                            />
                            <h3 className="font-semibold text-dark text-lg">
                              {slot.time}
                            </h3>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <FiUser className="text-gray-500" />
                            <p className="text-sm text-light">
                              Booked:{" "}
                              <span className="font-medium">
                                {slot.bookedCount} / {slot.capacity}
                              </span>
                            </p>
                          </div>
                        </div>
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            slot.isAvailable
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {slot.isAvailable ? "Available" : "Unavailable"}
                        </div>
                      </div>

                      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                        <div
                          className={`h-2 rounded-full ${
                            (slot.bookedCount / slot.capacity) * 100 >= 90
                              ? "bg-red-500"
                              : (slot.bookedCount / slot.capacity) * 100 >= 70
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          }`}
                          style={{
                            width: `${Math.min(
                              100,
                              (slot.bookedCount / slot.capacity) * 100
                            )}%`,
                          }}
                        ></div>
                      </div>

                      <button
                        onClick={() =>
                          toggleSlotAvailability(slot.time, slot.isAvailable)
                        }
                        disabled={isUpdating}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                          slot.isAvailable
                            ? "bg-red-100 text-red-800 hover:bg-red-200"
                            : "bg-green-100 text-green-800 hover:bg-green-200"
                        } transition-colors disabled:opacity-50`}
                      >
                        {isUpdating ? (
                          <>
                            <div className="w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin"></div>
                            <span>Updating...</span>
                          </>
                        ) : slot.isAvailable ? (
                          <>
                            <FiX className="text-red-800" />
                            <span>Mark as Unavailable</span>
                          </>
                        ) : (
                          <>
                            <FiCheck className="text-green-800" />
                            <span>Mark as Available</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Customer List */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-dark">
              Customer Bookings
            </h2>
          </div>

          {customers.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-light">
                No bookings found for this package on the selected date and
                time.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {customers.map((customer) => (
                <div
                  key={customer._id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <FiUser className="text-primary text-xl" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-dark">
                          {customer.contactInfo.name}
                        </h3>
                        <p className="text-light text-sm">
                          Booked on{" "}
                          {new Date(customer.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteConfirmation(
                            customer._id,
                            customer.contactInfo.name
                          );
                        }}
                        disabled={isUpdating}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete booking"
                      >
                        <FiTrash2 className="text-lg" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-light">
                      <FiCalendar className="text-xs" />
                      <span>
                        {formatDateTime(customer.date, customer.time)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-light">
                      <FiUser className="text-xs" />
                      <span className="">
                        {packageDetails?.title || "Package"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-light">
                      <FiPhone className="text-xs" />
                      <span>{customer.contactInfo.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-light">
                      <FiUser className="text-xs" />
                      <span>
                        {isPackagePrivate ? (
                          <span className="font-medium">Private</span>
                        ) : (
                          <>
                            {customer.adults} adults, {customer.children}{" "}
                            children
                          </>
                        )}
                      </span>
                    </div>
                    {customer.pickupLocation && (
                      <div className="flex items-center gap-2 text-light">
                        <FiMapPin className="text-xs" />
                        <span
                          dangerouslySetInnerHTML={{
                            __html: customer.pickupLocation,
                          }}
                        ></span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t flex justify-between items-center">
                    <span className="text-light text-sm">Total Amount</span>
                    <span className="font-semibold text-primary">
                      RM {customer.total}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Confirmation
        isOpen={deleteConfirmation.isOpen}
        onClose={closeDeleteConfirmation}
        onConfirm={() => handleDeleteBooking(deleteConfirmation.bookingId)}
        title="Delete Booking"
        message={
          <div>
            <p>Are you sure you want to delete the booking for:</p>
            <p className="font-semibold mt-2">
              {deleteConfirmation.customerName}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              This action cannot be undone.
            </p>
          </div>
        }
        confirmText="Yes, Delete"
        cancelText="Cancel"
        variant="danger"
      />

      <MobileNav />
    </div>
  );
}
