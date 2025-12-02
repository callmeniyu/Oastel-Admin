"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminHeader from "@/components/admin/AdminHeader";
import MobileNav from "@/components/admin/MobileNav";
import DataTable from "@/components/admin/DataTable";
import Confirmation from "@/components/ui/Confirmation";
import Link from "next/link";
import { transferApi, TransferType } from "@/lib/transferApi";
import { toast } from "react-hot-toast";
import { FiRefreshCw, FiCalendar } from "react-icons/fi";
import AdminBookingModal from "@/components/AdminBookingModal";
import BookingConfirmation from "@/components/BookingConfirmation";

interface TransferTableData {
  id: string;
  name: string;
  category: string;
  route: string;
  price: string | number; // Allow both for formatted display
  isAvailable: boolean; // Availability status
  _id: string;
  [key: string]: any; // Index signature for DataTable compatibility
}

export default function TransfersPage() {
  const router = useRouter();
  const [transfers, setTransfers] = useState<TransferTableData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    transferId: string | null;
    transferName: string;
  }>({
    isOpen: false,
    transferId: null,
    transferName: "",
  });

  // Admin booking modal state
  // Availability change confirmation state
  const [availabilityConfirmation, setAvailabilityConfirmation] = useState<{
    isOpen: boolean;
    transferId: string | null;
    transferName: string;
    currentStatus: boolean;
  }>({
    isOpen: false,
    transferId: null,
    transferName: "",
    currentStatus: true,
  });
  const [bookingModal, setBookingModal] = useState<{
    isOpen: boolean;
    transferDetails: TransferType | null;
  }>({
    isOpen: false,
    transferDetails: null,
  });

  // Booking confirmation modal state
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    bookingData: any;
  }>({
    isOpen: false,
    bookingData: null,
  });

  // Fetch transfers from API
  const fetchTransfers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await transferApi.getTransfers({ limit: 100 }); // Get all transfers

      // Transform the data to match the table structure
      const transformedTransfers: TransferTableData[] = response.data.map(
        (transfer: TransferType) => ({
          id: transfer._id,
          name: transfer.title,
          category: transfer.type,
          route: `${transfer.from} → ${transfer.to}`,
          price: `RM ${Math.round(transfer.newPrice).toLocaleString()}`,
          isAvailable:
            transfer.isAvailable !== undefined ? transfer.isAvailable : true,
          _id: transfer._id,
        })
      );

      setTransfers(transformedTransfers);
    } catch (err) {
      console.error("Error fetching transfers:", err);
      setError("Failed to load transfers. Please try again later.");
      toast.error("Failed to load transfers");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  // Handle transfer deletion
  const handleDelete = async (id: string) => {
    const transferToDelete = transfers.find((transfer) => transfer._id === id);
    if (!transferToDelete) return;

    setDeleteConfirmation({
      isOpen: true,
      transferId: id,
      transferName: transferToDelete.name,
    });
  };

  // Confirm deletion
  const confirmDelete = async () => {
    if (!deleteConfirmation.transferId) return;

    try {
      await transferApi.deleteTransfer(deleteConfirmation.transferId);
      // Remove the deleted transfer from the local state
      setTransfers(
        transfers.filter(
          (transfer) => transfer._id !== deleteConfirmation.transferId
        )
      );
      toast.success("Transfer deleted successfully");
    } catch (error) {
      console.error("Error deleting transfer:", error);
      toast.error("Failed to delete transfer");
    } finally {
      setDeleteConfirmation({
        isOpen: false,
        transferId: null,
        transferName: "",
      });
    }
  };

  // Close confirmation dialog
  const closeDeleteConfirmation = () => {
    setDeleteConfirmation({
      isOpen: false,
      transferId: null,
      transferName: "",
    });
  };

  // Handle admin booking
  const handleAdminBooking = async (id: string) => {
    const transferToBook = transfers.find((transfer) => transfer._id === id);
    if (!transferToBook) return;

    try {
      // Fetch full transfer details for booking
      const response = await transferApi.getTransferById(id);
      if (response.success && response.data) {
        setBookingModal({
          isOpen: true,
          transferDetails: response.data,
        });
      } else {
        toast.error("Failed to load transfer details for booking");
      }
    } catch (error) {
      console.error("Error fetching transfer details:", error);
      toast.error("Failed to load transfer details for booking");
    }
  };

  // Close booking modal
  const closeBookingModal = () => {
    setBookingModal({
      isOpen: false,
      transferDetails: null,
    });
  };

  // Handle booking success
  const handleBookingSuccess = () => {
    toast.success("Transfer booked successfully!");
    closeBookingModal();
    // Optionally refresh transfers data to update booking counts
    fetchTransfers();
  };

  // Handle toggle availability
  const handleToggleAvailability = async (
    id: string,
    currentStatus: boolean
  ) => {
    try {
      const newStatus = !currentStatus;
      await transferApi.toggleTransferAvailability(id, newStatus);

      // Update local state
      setTransfers(
        transfers.map((transfer) =>
          transfer._id === id
            ? { ...transfer, isAvailable: newStatus }
            : transfer
        )
      );

      toast.success(
        `Transfer ${newStatus ? "enabled" : "disabled"} successfully`
      );
    } catch (error) {
      console.error("Error toggling availability:", error);
      toast.error("Failed to toggle transfer availability");
    }
  };

  const columns = [
    { key: "name", label: "Transfer Name" },
    { key: "category", label: "Category" },
    { key: "route", label: "Route" },
    { key: "price", label: "Price (RM)" },
    { key: "availability", label: "Status" },
    { key: "actions", label: "Actions" },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-16">
        <AdminHeader />

        <main className="p-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-dark">Transfers</h1>
            <Link
              href={"/transfers/add-transfer"}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              + Add Transfer
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
            <div className="flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-gray-600">Loading transfers...</span>
            </div>
          </div>
        </main>

        <MobileNav />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 pb-16">
        <AdminHeader />

        <main className="p-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-dark">Transfers</h1>
            <Link
              href={"/transfers/add-transfer"}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              + Add Transfer
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
            <div className="text-center text-red-500">
              <p className="text-lg font-semibold">Error Loading Transfers</p>
              <p className="text-sm mt-2">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/80"
              >
                Retry
              </button>
            </div>
          </div>
        </main>

        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <AdminHeader />

      <main className="p-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-dark">Transfers</h1>
            <p className="text-gray-600 text-sm mt-1">
              {isLoading
                ? "Loading..."
                : `${transfers.length} transfer${
                    transfers.length !== 1 ? "s" : ""
                  } total`}
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={fetchTransfers}
              disabled={isLoading}
              className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center md:px-4"
              title="Refresh transfers"
            >
              <FiRefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""} md:mr-2`}
              />
              <span className="hidden md:inline">
                {isLoading ? "Refreshing..." : "Refresh"}
              </span>
            </button>
            <Link
              href={"/transfers/add-transfer"}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
            >
              + Add Transfer
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          {transfers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-lg font-semibold">No transfers found</p>
              <p className="text-sm mt-2">
                Get started by adding your first transfer package.
              </p>
              <Link
                href="/transfers/add-transfer"
                className="inline-block mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/80"
              >
                Add Transfer
              </Link>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={transfers}
              rowActions={["edit", "book", "delete"]}
              actionHandlers={{
                onEdit: (row) => {
                  // Navigate to edit page
                  router.push(`/transfers/${row._id}`);
                },
                onBook: (row) => {
                  handleAdminBooking(row._id as string);
                },
                onDelete: (row) => {
                  handleDelete(row._id as string);
                },
                onToggleAvailability: (row) => {
                  setAvailabilityConfirmation({
                    isOpen: true,
                    transferId: row._id as string,
                    transferName: row.name as string,
                    currentStatus: row.isAvailable as boolean,
                  });
                },
              }}
            />
          )}
        </div>
      </main>

      <MobileNav />

      {/* Delete Confirmation Dialog */}
      <Confirmation
        isOpen={deleteConfirmation.isOpen}
        onClose={closeDeleteConfirmation}
        onConfirm={confirmDelete}
        title="Delete Transfer"
        message={
          <div>
            <p>Are you sure you want to delete the transfer:</p>
            <p className="font-semibold text-red-600 mt-2">
              "{deleteConfirmation.transferName}"
            </p>
            <p className="mt-2 text-sm text-gray-500">
              This action cannot be undone.
            </p>
          </div>
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Availability Confirmation Dialog */}
      <Confirmation
        isOpen={availabilityConfirmation.isOpen}
        onClose={() =>
          setAvailabilityConfirmation({
            isOpen: false,
            transferId: null,
            transferName: "",
            currentStatus: true,
          })
        }
        onConfirm={async () => {
          if (!availabilityConfirmation.transferId) return;
          await handleToggleAvailability(
            availabilityConfirmation.transferId,
            availabilityConfirmation.currentStatus
          );
        }}
        title={
          availabilityConfirmation.currentStatus
            ? "Disable Transfer"
            : "Enable Transfer"
        }
        message={
          <div>
            <p>
              Are you sure you want to{" "}
              {availabilityConfirmation.currentStatus ? "disable" : "enable"}{" "}
              the transfer:
            </p>
            <p className="font-semibold text-primary_green mt-2">
              "{availabilityConfirmation.transferName}"
            </p>
          </div>
        }
        confirmText={
          availabilityConfirmation.currentStatus ? "Disable" : "Enable"
        }
        cancelText="Cancel"
        variant={availabilityConfirmation.currentStatus ? "danger" : "default"}
      />

      {/* Admin Booking Modal */}
      {bookingModal.transferDetails && (
        <AdminBookingModal
          isOpen={bookingModal.isOpen}
          onClose={closeBookingModal}
          onSuccess={handleBookingSuccess}
          onBookingComplete={(bookingData) => {
            setConfirmationModal({
              isOpen: true,
              bookingData,
            });
          }}
          packageType="transfer"
          packageDetails={{
            _id: bookingModal.transferDetails._id,
            title: bookingModal.transferDetails.title,
            newPrice: bookingModal.transferDetails.newPrice,
            childPrice: bookingModal.transferDetails.childPrice,
            minimumPerson: bookingModal.transferDetails.minimumPerson,
            maximumPerson: bookingModal.transferDetails.maximumPerson,
            type: bookingModal.transferDetails.type,
            from: bookingModal.transferDetails.from,
            to: bookingModal.transferDetails.to,
            details: {
              pickupLocations:
                bookingModal.transferDetails.details?.pickupLocations,
              pickupOption:
                bookingModal.transferDetails.details?.pickupOption || "user",
            },
          }}
        />
      )}

      {/* Booking Confirmation Modal */}
      <BookingConfirmation
        isOpen={confirmationModal.isOpen}
        onClose={() =>
          setConfirmationModal({ isOpen: false, bookingData: null })
        }
        bookingData={confirmationModal.bookingData}
      />
    </div>
  );
}
