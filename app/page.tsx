"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminHeader from "@/components/admin/AdminHeader";
import MobileNav from "@/components/admin/MobileNav";
import StatsCard from "@/components/admin/StatsCard";
import BookingCard from "@/components/admin/BookingCard";

interface Booking {
  _id?: string;
  id?: string;
  packageId?: { title?: string };
  title?: string;
  packageType?: string;
  date?: string;
  createdAt?: string;
  time?: string;
  status?: string;
  total?: number;
}

interface BookingsApiResponse {
  success: boolean;
  bookings?: Booking[];
  data?: Booking[];
  error?: string;
}

interface Tour {
  status?: string;
}
interface Transfer {
  status?: string;
}

interface SortedBooking {
  id?: string;
  tour?: string;
  transfer?: string | null;
  date: string;
  time: string;
  status: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState([
    {
      title: "Total Bookings",
      value: "Loading...",
      icon: "📊",
      link: "/bookings",
    },
    { title: "Revenue", value: "Loading...", icon: "💰", link: "/revenew" },
    { title: "Active Tours", value: "Loading...", icon: "🚗", link: "/tours" },
    {
      title: "Active Transfers",
      value: "Loading...",
      icon: "⏱️",
      link: "/transfers",
    },
  ]);

  const [recentBookings, setRecentBookings] = useState<SortedBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch dashboard statistics
  const fetchDashboardStats = async () => {
    try {
      const [bookingsRes, toursRes, transfersRes] = await Promise.all([
        fetch("/api/bookings"),
        fetch("/api/tours"),
        fetch("/api/transfers"),
      ]);

      const bookingsData = await bookingsRes.json();
      const toursData = await toursRes.json();
      const transfersData = await transfersRes.json();

      // Calculate total bookings
      const totalBookings = bookingsData.success
        ? (bookingsData.bookings || bookingsData.data || []).length
        : 0;

      // Calculate revenue from bookings

      const revenue = bookingsData.success
        ? (
            (bookingsData.bookings || bookingsData.data || []) as Booking[]
          ).reduce(
            (sum: number, booking: Booking) => sum + (booking.total || 0),
            0
          )
        : 0;

      // Count active tours

      const activeTours: number = (toursData as BookingsApiResponse).success
        ? ((toursData.tours || toursData.data || []) as Tour[]).filter(
            (tour: Tour) => tour.status === "active"
          ).length
        : 0;

      const activeTransfers: number = (transfersData as BookingsApiResponse)
        .success
        ? (
            (transfersData.transfers || transfersData.data || []) as Transfer[]
          ).filter((transfer: Transfer) => transfer.status === "active").length
        : 0;

      setStats([
        {
          title: "Total Bookings",
          value: totalBookings.toString(),
          icon: "📊",
          link: "/bookings",
        },
        {
          title: "Revenue",
          value: `RM ${revenue.toLocaleString()}`,
          icon: "💰",
          link: "/revenew",
        },
        {
          title: "Active Tours",
          value: activeTours.toString(),
          icon: "🚗",
          link: "/tours",
        },
        {
          title: "Active Transfers",
          value: activeTransfers.toString(),
          icon: "⏱️",
          link: "/transfers",
        },
      ]);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      setStats([
        {
          title: "Total Bookings",
          value: "Error",
          icon: "📊",
          link: "/bookings",
        },
        { title: "Revenue", value: "Error", icon: "💰", link: "/revenew" },
        { title: "Active Tours", value: "Error", icon: "🚗", link: "/tours" },
        {
          title: "Active Transfers",
          value: "Error",
          icon: "⏱️",
          link: "/transfers",
        },
      ]);
    }
  };

  // Fetch recent bookings
  const fetchRecentBookings = async () => {
    try {
      const response = await fetch("/api/bookings");
      const data = await response.json();

      if (data.success) {
        const bookings = data.bookings || data.data || [];
        // Sort by creation date and take the latest 4

        const sortedBookings: SortedBooking[] = (bookings as Booking[])
          .sort(
            (a: Booking, b: Booking) =>
              new Date(b.createdAt || b.date!).getTime() -
              new Date(a.createdAt || a.date!).getTime()
          )
          .slice(0, 4)
          .map(
            (booking: Booking): SortedBooking => ({
              id: booking._id || booking.id,
              tour: booking.packageId?.title || booking.title,
              transfer:
                booking.packageType === "transfer"
                  ? booking.packageId?.title || booking.title
                  : null,
              date: booking.date
                ? new Date(booking.date).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "N/A",
              time: booking.time || "N/A",
              status: booking.status || "Confirmed",
            })
          );

        setRecentBookings(sortedBookings);
      } else {
        console.error("Failed to fetch recent bookings:", data.error);
        setRecentBookings([]);
      }
    } catch (error) {
      console.error("Error fetching recent bookings:", error);
      setRecentBookings([]);
    }
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      await Promise.all([fetchDashboardStats(), fetchRecentBookings()]);
      setIsLoading(false);
    };

    loadDashboardData();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <AdminHeader />

      <main className="p-4">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-dark mb-4">
            Dashboard Overview
          </h2>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {stats.map((stat, index) => (
              <StatsCard
                key={index}
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                link={stat.link}
              />
            ))}
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-dark">Recent Bookings</h2>
            <button
              onClick={() => router.push("/bookings")}
              className="text-primary text-sm font-medium hover:underline"
            >
              View All
            </button>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-4 text-gray-500">
                Loading recent bookings...
              </div>
            ) : recentBookings.length > 0 ? (
              recentBookings.map((booking, index) => (
                <BookingCard
                  key={index}
                  booking={{
                    ...booking,
                    id: booking.id ?? "",
                    transfer: booking.transfer ?? undefined,
                  }}
                />
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                No recent bookings found
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-dark mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => router.push("/tours/add-tour")}
              className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <span className="text-2xl mb-2">🚗</span>
              <span className="font-medium">Add Tour</span>
            </button>
            <button
              onClick={() => router.push("/transfers/add-transfer")}
              className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <span className="text-2xl mb-2">🚐</span>
              <span className="font-medium">Add Transfer</span>
            </button>
            <button
              onClick={() => router.push("/blogs/add-blog")}
              className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <span className="text-2xl mb-2">📝</span>
              <span className="font-medium">Create Blog</span>
            </button>
            <button
              onClick={() => router.push("/bookings")}
              className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <span className="text-2xl mb-2">🔖</span>
              <span className="font-medium">See Bookings</span>
            </button>
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
