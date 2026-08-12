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
  FiTrash2,
} from "react-icons/fi";
import Confirmation from "@/components/ui/Confirmation";
import { toast } from "react-hot-toast";
import { formatTimeDisplay } from "@/lib/dateUtils";

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
  const [isUpdating, setIsUpdating] = useState(false);
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
      // Fetch all data in parallel for faster loading
      Promise.all([
        fetchPackageCustomers(),
        fetchPackageDetails(),
      ]).catch((err) => {
        console.error("Error loading page data:", err);
      });
    }
  }, [packageId, date, time]);

  const fetchPackageCustomers = async () => {
    try {
      const response = await fetch(
        `/api/bookings?packageId=${packageId}&date=${date}&time=${time}`,
        {
          // Add cache control for better performance
          next: { revalidate: 10 }, // Revalidate every 10 seconds
        },
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
      const response = await fetch(`${endpoint}/${packageId}`, {
        // Package details rarely change, cache for longer
        next: { revalidate: 60 },
      });

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
        // Refresh the customer list after successful deletion
        await fetchPackageCustomers();

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
          data.error || "Unknown error",
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
    timeStr: string | undefined,
  ) => {
    try {
      const d = dateStr ? new Date(dateStr) : null;
      // Use Malaysia timezone consistently to match how dates are stored
      const datePart = d
        ? d.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            timeZone: "Asia/Kuala_Lumpur", // Force Malaysia timezone
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
    0,
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
                timeZone: "Asia/Kuala_Lumpur", // Force Malaysia timezone
              })}{" "}
              at {formatTimeDisplay(time || "")}
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
                  RM {Math.round(totalRevenue).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
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
                          {new Date(customer.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              timeZone: "Asia/Kuala_Lumpur",
                            },
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteConfirmation(
                            customer._id,
                            customer.contactInfo.name,
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
                      RM {Math.round(customer.total).toLocaleString()}
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
