"use client";
import { useState, useEffect } from "react";

interface BookingData {
  _id: string;
  packageType: "tour" | "transfer";
  packageId: {
    _id: string;
    title: string;
    type?: string;
  };
  adults: number;
  children: number;
  total: number;
  status: string;
  date: string;
  createdAt: string;
}

interface PackagePerformance {
  name: string;
  type: string;
  bookings: number;
  totalPersons: number;
  revenue: number;
}

interface RevenueData {
  totalRevenue: number;
  totalBookings: number;
  totalPersons: number;
  avgBookingValue: number;
  packagePerformance: PackagePerformance[];
}

export default function RevenuePage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [revenueData, setRevenueData] = useState<RevenueData>({
    totalRevenue: 0,
    totalBookings: 0,
    totalPersons: 0,
    avgBookingValue: 0,
    packagePerformance: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRevenueData = async () => {
    if (!startDate || !endDate) {
      setError("Please select both start and end dates");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let url = `${process.env.NEXT_PUBLIC_API_URL}/api/bookings`;
      const params = new URLSearchParams();

      params.append("startDate", new Date(startDate).toISOString());
      params.append("endDate", new Date(endDate).toISOString());

      url += `?${params.toString()}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        const bookings: BookingData[] = data.bookings || [];

        // Filter bookings to ensure they fall within the selected date range
        const filteredBookings = bookings.filter((booking) => {
          const bookingDate = new Date(booking.date || booking.createdAt);
          const start = new Date(startDate);
          const end = new Date(endDate);
          return bookingDate >= start && bookingDate <= end;
        });

        // Calculate metrics for filtered data
        const totalRevenue = filteredBookings.reduce(
          (sum, booking) => sum + (booking.total || 0),
          0
        );
        const totalBookings = filteredBookings.length;
        const totalPersons = filteredBookings.reduce(
          (sum, booking) =>
            sum + (booking.adults || 0) + (booking.children || 0),
          0
        );
        const avgBookingValue =
          totalBookings > 0 ? totalRevenue / totalBookings : 0;

        // Group by package for performance analysis
        const packageMap = new Map<string, PackagePerformance>();

        filteredBookings.forEach((booking) => {
          const packageId = booking.packageId?._id || "unknown";
          const packageName = booking.packageId?.title || "Unknown Package";
          const packageType =
            booking.packageId?.type || booking.packageType || "unknown";

          if (!packageMap.has(packageId)) {
            packageMap.set(packageId, {
              name: packageName,
              type: packageType,
              bookings: 0,
              totalPersons: 0,
              revenue: 0,
            });
          }

          const packageData = packageMap.get(packageId)!;
          packageData.bookings += 1;
          packageData.totalPersons +=
            (booking.adults || 0) + (booking.children || 0);
          packageData.revenue += booking.total || 0;
        });

        const packagePerformance = Array.from(packageMap.values()).sort(
          (a, b) => b.revenue - a.revenue
        );

        setRevenueData({
          totalRevenue,
          totalBookings,
          totalPersons,
          avgBookingValue,
          packagePerformance,
        });
      } else {
        throw new Error(data.error || "Failed to fetch revenue data");
      }
    } catch (err) {
      console.error("Error fetching revenue data:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setIsLoading(false);
    }
  };

  const exportToSpreadsheet = () => {
    if (revenueData.packagePerformance.length === 0) {
      alert("No data available to export");
      return;
    }

    const csvData = revenueData.packagePerformance
      .map(
        (item) =>
          `"${item.name}","${item.type}","${item.type}",${item.bookings.toFixed(
            2
          )},${item.totalPersons.toFixed(2)},"RM ${item.revenue.toFixed(2)}"`
      )
      .join("\n");

    const header =
      "Package Name,Package Type,Tour Type,Total Bookings,Total Persons,Total Revenue\n";
    const totalRow = `\n"Total","All Packages","All Types",${revenueData.totalBookings.toFixed(
      2
    )},${revenueData.totalPersons.toFixed(
      2
    )},"RM ${revenueData.totalRevenue.toFixed(2)}"`;

    const csvContent = header + csvData + totalRow;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `revenue-analytics-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Remove automatic data fetching on mount - users must select dates first
  // useEffect(() => {
  //   fetchRevenueData();
  // }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Revenue Analytics Dashboard
        </h1>

        {/* Export to Spreadsheet button at the top */}
        <div className="flex justify-end mb-6">
          <button
            onClick={exportToSpreadsheet}
            disabled={revenueData.packagePerformance.length === 0}
            className="bg-primary hover:bg-primary text-white font-semibold py-3 px-6 rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            Export to Spreadsheet
          </button>
        </div>

        {/* Date filter box with shadow */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Filter by Date Range
          </h2>
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
            <div className="w-full lg:w-auto">
              <button
                onClick={fetchRevenueData}
                disabled={isLoading}
                className="w-full lg:w-auto bg-primary hover:bg-primary text-white font-semibold px-8 py-3 rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors duration-200"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                    Loading...
                  </>
                ) : (
                  <>Fetch Data</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-500">Error</span>
              </div>
              <div className="ml-3">
                <strong>Error:</strong> {error}
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600"></div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  RM {revenueData.totalRevenue.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600"></div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Bookings
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {revenueData.totalBookings.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600"></div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Persons
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {revenueData.totalPersons.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-orange-100 text-orange-600"></div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Avg Booking Value
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  RM {revenueData.avgBookingValue.toFixed(0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Package Performance Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Package Performance
            </h2>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : revenueData.packagePerformance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Package Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bookings
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Persons
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {revenueData.packagePerformance.map((item, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {item.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-medium
                          ${
                            item.type === "co-tour" || item.type === "tour"
                              ? "bg-blue-100 text-blue-800"
                              : item.type === "private-tour" ||
                                item.type === "private"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-primary text-primary"
                          }`}
                        >
                          {item.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.bookings}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.totalPersons}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        RM {item.revenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Data Available
              </h3>
              <p className="text-gray-500">
                No booking data available for the selected period.
                <br />
                Try adjusting your date range or check back later.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
