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
} from "react-icons/fi";

interface Customer {
  _id: string;
  contactInfo: {
    name: string;
    email: string;
    phone: string;
  };
  adults: number;
  children: number;
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

  useEffect(() => {
    if (packageId && date && time) {
      fetchPackageCustomers();
      fetchPackageDetails();
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

      <div className="max-w-6xl mx-auto p-4 md:p-6">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FiUser className="text-blue-600 text-xl" />
              </div>
              <div>
                <p className="text-light text-sm">Total Customers</p>
                <p className="text-2xl font-bold text-dark">{totalCustomers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <FiCalendar className="text-green-600 text-xl" />
              </div>
              <div>
                <p className="text-light text-sm">Total Bookings</p>
                <p className="text-2xl font-bold text-dark">
                  {customers.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <FiClock className="text-primary text-xl" />
              </div>
              <div>
                <p className="text-light text-sm">Total Revenue</p>
                <p className="text-2xl font-bold text-dark">
                  RM {totalRevenue}
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
                          {new Date(customer.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                        customer.status
                      )}`}
                    >
                      {customer.status.charAt(0).toUpperCase() +
                        customer.status.slice(1)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-light">
                      <FiMail className="text-xs" />
                      <span>{customer.contactInfo.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-light">
                      <FiPhone className="text-xs" />
                      <span>{customer.contactInfo.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-light">
                      <FiUser className="text-xs" />
                      <span>
                        {customer.adults} adults, {customer.children} children
                      </span>
                    </div>
                    {customer.pickupLocation && (
                      <div className="flex items-center gap-2 text-light">
                        <FiMapPin className="text-xs" />
                        <span>{customer.pickupLocation}</span>
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

      <MobileNav />
    </div>
  );
}
