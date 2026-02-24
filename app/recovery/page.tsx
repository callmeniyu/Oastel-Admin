"use client";

import { useState, useEffect } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import MobileNav from "@/components/admin/MobileNav";
import {
  FiRefreshCw,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiMail,
  FiPackage,
  FiSearch,
  FiUsers,
} from "react-icons/fi";
import {
  recoveryApi,
  OrphanedPayment,
  PaymentDetails,
} from "@/lib/recoveryApi";

// Helper function to format ISO date to human-readable format
const formatDate = (dateString: string) => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-MY", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (error) {
    return dateString;
  }
};

// Helper function to format time
const formatTime = (timeString: string) => {
  if (!timeString) return "N/A";
  try {
    // If it's an ISO timestamp, extract time
    if (timeString.includes("T")) {
      const date = new Date(timeString);
      return date.toLocaleTimeString("en-MY", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }
    return timeString;
  } catch (error) {
    return timeString;
  }
};

// Helper function to format created date
const formatCreatedDate = (date: Date) => {
  try {
    return new Date(date).toLocaleString("en-MY", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch (error) {
    return String(date);
  }
};

export default function PaymentRecoveryPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [orphanedPayments, setOrphanedPayments] = useState<OrphanedPayment[]>(
    [],
  );
  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(
    new Set(),
  );
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const [scanSummary, setScanSummary] = useState<any>(null);
  const [isRecovering, setIsRecovering] = useState<string | null>(null);
  const [recoveryHistory, setRecoveryHistory] = useState<any[]>([]);

  // Manual recovery form
  const [manualPaymentId, setManualPaymentId] = useState("");
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(
    null,
  );

  // Toast notification
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    // Auto-scan on mount
    handleScan();
  }, []);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleScan = async (hours: number = 24) => {
    setIsScanning(true);
    try {
      const result = await recoveryApi.scanOrphanedPayments(hours, 100);
      setOrphanedPayments(result.orphanedPayments);
      setScanSummary(result.summary);
      setLastScanTime(new Date());

      if (result.orphanedPayments.length > 0) {
        showToast(
          `Found ${result.orphanedPayments.length} orphaned payment(s)`,
          "error",
        );
      } else {
        showToast("No orphaned payments found", "success");
      }
    } catch (error) {
      console.error("Scan error:", error);
      showToast("Failed to scan for orphaned payments", "error");
    } finally {
      setIsScanning(false);
    }
  };

  const handleRecover = async (paymentIntentId: string) => {
    setIsRecovering(paymentIntentId);
    try {
      const result = await recoveryApi.recoverPayment(paymentIntentId);

      if (result.success) {
        showToast(
          result.alreadyExists
            ? "Booking already exists"
            : `Successfully recovered! Booking ID: ${result.bookingId}`,
          "success",
        );

        // Add to history
        setRecoveryHistory((prev) => [
          {
            paymentIntentId,
            bookingId: result.bookingId,
            customerEmail: result.customerEmail,
            timestamp: new Date(),
            status: "success",
          },
          ...prev,
        ]);

        // Remove from orphaned list
        setOrphanedPayments((prev) =>
          prev.filter((p) => p.paymentIntentId !== paymentIntentId),
        );

        // Update summary
        if (scanSummary) {
          setScanSummary({
            ...scanSummary,
            orphanedPayments: scanSummary.orphanedPayments - 1,
            successfulWithBookings: scanSummary.successfulWithBookings + 1,
          });
        }
      } else {
        showToast(result.error || "Recovery failed", "error");
      }
    } catch (error: any) {
      console.error("Recovery error:", error);
      showToast(error.message || "Failed to recover payment", "error");
    } finally {
      setIsRecovering(null);
    }
  };

  const handleBatchRecover = async () => {
    if (selectedPayments.size === 0) {
      showToast("Please select payments to recover", "error");
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to recover ${selectedPayments.size} payment(s)?`,
    );
    if (!confirmed) return;

    setIsRecovering("batch");
    try {
      const result = await recoveryApi.batchRecover(
        Array.from(selectedPayments),
      );

      showToast(
        `Batch recovery complete: ${result.summary.successful} successful, ${result.summary.failed} failed`,
        result.summary.failed > 0 ? "error" : "success",
      );

      // Add successful recoveries to history
      result.results.forEach((r) => {
        if (r.success) {
          setRecoveryHistory((prev) => [
            {
              paymentIntentId: r.paymentIntentId,
              bookingId: r.bookingId,
              timestamp: new Date(),
              status: "success",
            },
            ...prev,
          ]);
        }
      });

      // Rescan after batch recovery
      await handleScan();
      setSelectedPayments(new Set());
    } catch (error: any) {
      console.error("Batch recovery error:", error);
      showToast(error.message || "Batch recovery failed", "error");
    } finally {
      setIsRecovering(null);
    }
  };

  const handleGetDetails = async () => {
    if (!manualPaymentId.trim()) {
      showToast("Please enter a payment intent ID", "error");
      return;
    }

    setIsLoadingDetails(true);
    try {
      const details = await recoveryApi.getPaymentDetails(manualPaymentId);
      setPaymentDetails(details);
    } catch (error: any) {
      console.error("Get details error:", error);
      showToast(error.message || "Failed to get payment details", "error");
      setPaymentDetails(null);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const togglePaymentSelection = (paymentIntentId: string) => {
    setSelectedPayments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(paymentIntentId)) {
        newSet.delete(paymentIntentId);
      } else {
        newSet.add(paymentIntentId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (selectedPayments.size === orphanedPayments.length) {
      setSelectedPayments(new Set());
    } else {
      setSelectedPayments(
        new Set(orphanedPayments.map((p) => p.paymentIntentId)),
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <MobileNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Toast Notification */}
        {toast && (
          <div
            className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg ${
              toast.type === "success" ? "bg-green-500" : "bg-red-500"
            } text-white flex items-center gap-2 animate-slide-in`}
          >
            {toast.type === "success" ? <FiCheckCircle /> : <FiAlertCircle />}
            {toast.message}
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FiAlertCircle className="text-red-500" />
            Payment Recovery Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Detect and recover successful payments that failed to create
            bookings
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Orphaned Payments</p>
                <p className="text-3xl font-bold text-red-600">
                  {scanSummary?.orphanedPayments || 0}
                </p>
              </div>
              <FiAlertCircle className="text-4xl text-red-300" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Successful</p>
                <p className="text-3xl font-bold text-green-600">
                  {scanSummary?.successfulWithBookings || 0}
                </p>
              </div>
              <FiCheckCircle className="text-4xl text-green-300" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Scanned</p>
                <p className="text-3xl font-bold text-blue-600">
                  {scanSummary?.totalScanned || 0}
                </p>
              </div>
              <FiPackage className="text-4xl text-blue-300" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Last Scan</p>
                <p className="text-sm font-medium text-gray-900">
                  {lastScanTime
                    ? new Date(lastScanTime).toLocaleTimeString()
                    : "Never"}
                </p>
              </div>
              <FiClock className="text-4xl text-gray-300" />
            </div>
          </div>
        </div>

        {/* Scan Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <button
                onClick={() => handleScan(24)}
                disabled={isScanning}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FiRefreshCw className={isScanning ? "animate-spin" : ""} />
                {isScanning ? "Scanning..." : "Scan Last 24 Hours"}
              </button>

              <button
                onClick={() => handleScan(48)}
                disabled={isScanning}
                className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Scan Last 48 Hours
              </button>

              <button
                onClick={() => handleScan(168)}
                disabled={isScanning}
                className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Scan Last Week
              </button>
            </div>

            {selectedPayments.size > 0 && (
              <button
                onClick={handleBatchRecover}
                disabled={isRecovering === "batch"}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FiCheckCircle />
                Recover Selected ({selectedPayments.size})
              </button>
            )}
          </div>
        </div>

        {/* Orphaned Payments Table */}
        {orphanedPayments.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Orphaned Payments ({orphanedPayments.length})
              </h2>
              <button
                onClick={selectAll}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {selectedPayments.size === orphanedPayments.length
                  ? "Deselect All"
                  : "Select All"}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Select
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Package Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Guests
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orphanedPayments.map((payment) => (
                    <tr
                      key={payment.paymentIntentId}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedPayments.has(
                            payment.paymentIntentId,
                          )}
                          onChange={() =>
                            togglePaymentSelection(payment.paymentIntentId)
                          }
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {payment.paymentIntentId.substring(0, 20)}...
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {payment.customerName}
                          </div>
                          <div className="text-gray-500">
                            {payment.customerEmail}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {payment.currency.toUpperCase()}{" "}
                          {payment.amount.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {payment.packageName || payment.packageType || "N/A"}
                        </div>
                        <span className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          {payment.packageType}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-900">
                          <FiUsers className="text-gray-400" />
                          {payment.totalGuests || "0"} guests
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="font-medium">
                          {formatDate(payment.date)}
                        </div>
                        <div className="text-gray-500">
                          {formatTime(payment.time)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatCreatedDate(payment.created)}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleRecover(payment.paymentIntentId)}
                          disabled={isRecovering === payment.paymentIntentId}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isRecovering === payment.paymentIntentId ? (
                            <>
                              <FiRefreshCw className="animate-spin" />
                              Recovering...
                            </>
                          ) : (
                            <>
                              <FiCheckCircle />
                              Recover
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Manual Recovery Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FiSearch />
              Manual Recovery
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Enter a payment intent ID to check details and recover manually
            </p>

            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualPaymentId}
                  onChange={(e) => setManualPaymentId(e.target.value)}
                  placeholder="pi_3T007nLco0sMvd2r2yLiJKij"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleGetDetails}
                  disabled={isLoadingDetails}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoadingDetails ? "Loading..." : "Check"}
                </button>
              </div>

              {paymentDetails && (
                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b">
                    <span className="text-sm font-medium text-gray-600">
                      Status:
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        paymentDetails.payment.status === "succeeded"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {paymentDetails.payment.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      Amount:
                    </span>
                    <span className="text-sm text-gray-900">
                      {paymentDetails.payment.currency.toUpperCase()}{" "}
                      {paymentDetails.payment.amount.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      Has Booking:
                    </span>
                    <span className="text-sm text-gray-900">
                      {paymentDetails.analysis.hasBooking ? (
                        <span className="text-green-600">✓ Yes</span>
                      ) : (
                        <span className="text-red-600">✗ No</span>
                      )}
                    </span>
                  </div>

                  {paymentDetails.booking && (
                    <div className="pt-3 border-t">
                      <p className="text-sm text-gray-600 mb-2">
                        Booking Details:
                      </p>
                      <div className="bg-gray-50 rounded p-3 space-y-2 text-sm">
                        <div>
                          Booking ID:{" "}
                          <code className="bg-white px-2 py-1 rounded">
                            {paymentDetails.booking.id}
                          </code>
                        </div>
                        <div>
                          Customer: {paymentDetails.booking.customerName}
                        </div>
                        <div>Email: {paymentDetails.booking.customerEmail}</div>
                        <div>
                          Status:{" "}
                          <span className="font-medium">
                            {paymentDetails.booking.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t">
                    <p className="text-sm font-medium text-gray-900 mb-2">
                      Recommendation:
                    </p>
                    <p className="text-sm text-gray-600">
                      {paymentDetails.analysis.recommendation}
                    </p>
                  </div>

                  {paymentDetails.analysis.canRecover && (
                    <button
                      onClick={() => handleRecover(paymentDetails.payment.id)}
                      disabled={isRecovering === paymentDetails.payment.id}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isRecovering === paymentDetails.payment.id ? (
                        <>
                          <FiRefreshCw className="animate-spin" />
                          Recovering...
                        </>
                      ) : (
                        <>
                          <FiCheckCircle />
                          Recover This Payment
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Recovery History */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FiClock />
              Recovery History
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Recently recovered payments (session only)
            </p>

            {recoveryHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No recoveries yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recoveryHistory.slice(0, 10).map((item, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FiCheckCircle className="text-green-500" />
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {item.paymentIntentId.substring(0, 20)}...
                          </code>
                        </div>
                        <div className="text-sm text-gray-600">
                          <div>
                            Booking:{" "}
                            <span className="font-medium">
                              {item.bookingId}
                            </span>
                          </div>
                          {item.customerEmail && (
                            <div className="flex items-center gap-1 mt-1">
                              <FiMail className="text-xs" />
                              {item.customerEmail}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Help Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            ℹ️ How to Use
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>
              <strong>1. Scan:</strong> Click scan buttons to detect orphaned
              payments (successful payments without bookings)
            </li>
            <li>
              <strong>2. Review:</strong> Check the orphaned payments table for
              details about each payment
            </li>
            <li>
              <strong>3. Recover:</strong> Click "Recover" button to create
              booking from payment metadata and send confirmation email
            </li>
            <li>
              <strong>4. Batch:</strong> Select multiple payments and use
              "Recover Selected" for bulk recovery
            </li>
            <li>
              <strong>5. Manual:</strong> Enter specific payment intent ID for
              detailed investigation and recovery
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
