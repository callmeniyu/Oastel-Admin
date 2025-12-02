"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminHeader from "@/components/admin/AdminHeader";
import MobileNav from "@/components/admin/MobileNav";
import DataTable from "@/components/admin/DataTable";
import Confirmation from "@/components/ui/Confirmation";
import Link from "next/link";
import { tourApi, TourType } from "@/lib/tourApi";
import { toast } from "react-hot-toast";
import { FiRefreshCw, FiCalendar } from "react-icons/fi";
import AdminBookingModal from "@/components/AdminBookingModal";
import BookingConfirmation from "@/components/BookingConfirmation";

interface TourTableData {
  id: string;
  name: string;
  category: string;
  period: string;
  price: string | number; // Allow both for formatted display
  isAvailable: boolean; // Availability status
  _id: string;
  [key: string]: any; // Index signature for DataTable compatibility
}

export default function ToursPage() {
  const router = useRouter();
  const [tours, setTours] = useState<TourTableData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    tourId: string | null;
    tourName: string;
  }>({
    isOpen: false,
    tourId: null,
    tourName: "",
  });

  // Admin booking modal state
  // Availability change confirmation state
  const [availabilityConfirmation, setAvailabilityConfirmation] = useState<{
    isOpen: boolean;
    tourId: string | null;
    tourName: string;
    currentStatus: boolean;
  }>({
    isOpen: false,
    tourId: null,
    tourName: "",
    currentStatus: true,
  });
  const [bookingModal, setBookingModal] = useState<{
    isOpen: boolean;
    tourDetails: TourType | null;
  }>({
    isOpen: false,
    tourDetails: null,
  });

  // Booking confirmation modal state
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    bookingData: any;
  }>({
    isOpen: false,
    bookingData: null,
  });

  // Fetch tours from API
  const fetchTours = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await tourApi.getTours({ limit: 100 }); // Get all tours

      // Transform the data to match the table structure
      const transformedTours: TourTableData[] = response.data.map(
        (tour: TourType) => ({
          id: tour._id,
          name: tour.title,
          category: tour.type === "co-tour" ? "Co-Tour" : "Private",
          period: tour.period,
          price: `RM ${Math.round(tour.newPrice).toLocaleString()}`,
          isAvailable: tour.isAvailable !== undefined ? tour.isAvailable : true,
          availability: (
            <button
              onClick={() =>
                setAvailabilityConfirmation({
                  isOpen: true,
                  tourId: tour._id,
                  tourName: tour.title,
                  currentStatus:
                    tour.isAvailable !== undefined ? tour.isAvailable : true,
                })
              }
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                (tour.isAvailable !== undefined ? tour.isAvailable : true)
                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                  : "bg-red-100 text-red-700 hover:bg-red-200"
              }`}
            >
              {(tour.isAvailable !== undefined ? tour.isAvailable : true)
                ? "Active"
                : "Inactive"}
            </button>
          ),
          _id: tour._id,
        })
      );

      setTours(transformedTours);
    } catch (err) {
      console.error("Error fetching tours:", err);
      setError("Failed to load tours. Please try again later.");
      toast.error("Failed to load tours");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTours();
  }, []);

  // Handle tour deletion
  const handleDelete = async (id: string) => {
    const tourToDelete = tours.find((tour) => tour._id === id);
    if (!tourToDelete) return;

    setDeleteConfirmation({
      isOpen: true,
      tourId: id,
      tourName: tourToDelete.name,
    });
  };

  // Confirm deletion
  const confirmDelete = async () => {
    if (!deleteConfirmation.tourId) return;

    try {
      await tourApi.deleteTour(deleteConfirmation.tourId);
      // Remove the deleted tour from the local state
      setTours(tours.filter((tour) => tour._id !== deleteConfirmation.tourId));
      toast.success("Tour deleted successfully");
    } catch (error) {
      console.error("Error deleting tour:", error);
      toast.error("Failed to delete tour");
    } finally {
      setDeleteConfirmation({
        isOpen: false,
        tourId: null,
        tourName: "",
      });
    }
  };

  // Close confirmation dialog
  const closeDeleteConfirmation = () => {
    setDeleteConfirmation({
      isOpen: false,
      tourId: null,
      tourName: "",
    });
  };

  // Handle admin booking
  const handleAdminBooking = async (id: string) => {
    const tourToBook = tours.find((tour) => tour._id === id);
    if (!tourToBook) return;

    try {
      // Fetch full tour details for booking
      const response = await tourApi.getTourById(id);
      if (response.success && response.data) {
        setBookingModal({
          isOpen: true,
          tourDetails: response.data,
        });
      } else {
        toast.error("Failed to load tour details for booking");
      }
    } catch (error) {
      console.error("Error fetching tour details:", error);
      toast.error("Failed to load tour details for booking");
    }
  };

  // Close booking modal
  const closeBookingModal = () => {
    setBookingModal({
      isOpen: false,
      tourDetails: null,
    });
  };

  // Handle booking success
  const handleBookingSuccess = () => {
    toast.success("Tour booked successfully!");
    closeBookingModal();
    // Optionally refresh tours data to update booking counts
    fetchTours();
  };

  // Handle toggle availability
  const handleToggleAvailability = async (
    id: string,
    currentStatus: boolean
  ) => {
    try {
      const newStatus = !currentStatus;
      await tourApi.toggleTourAvailability(id, newStatus);

      // Update local state
      setTours(
        tours.map((tour) =>
          tour._id === id ? { ...tour, isAvailable: newStatus } : tour
        )
      );

      toast.success(`Tour ${newStatus ? "enabled" : "disabled"} successfully`);
    } catch (error) {
      console.error("Error toggling availability:", error);
      toast.error("Failed to toggle tour availability");
    }
  };

  const columns = [
    { key: "name", label: "Tour Name" },
    { key: "category", label: "Category" },
    { key: "period", label: "Period" },
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
            <h1 className="text-2xl font-bold text-dark">Tours</h1>
            <Link
              href={"/tours/add-tour"}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              + Add Tour
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
            <div className="flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-gray-600">Loading tours...</span>
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
            <h1 className="text-2xl font-bold text-dark">Tour</h1>
            <Link
              href={"/tours/add-tour"}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              + Add Tour
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
            <div className="text-center text-red-500">
              <p className="text-lg font-semibold">Error Loading Tours</p>
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
            <h1 className="text-2xl font-bold text-dark">Tours</h1>
            <p className="text-gray-600 text-sm mt-1">
              {isLoading
                ? "Loading..."
                : `${tours.length} tour${tours.length !== 1 ? "s" : ""} total`}
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={fetchTours}
              disabled={isLoading}
              className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center md:px-4"
              title="Refresh tours"
            >
              <FiRefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""} md:mr-2`}
              />
              <span className="hidden md:inline">
                {isLoading ? "Refreshing..." : "Refresh"}
              </span>
            </button>
            <Link
              href={"/tours/add-tour"}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
            >
              + Add Tour
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          {tours.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-lg font-semibold">No tours found</p>
              <p className="text-sm mt-2">
                Get started by adding your first tour package.
              </p>
              <Link
                href="/tours/add-tour"
                className="inline-block mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/80"
              >
                Add Tour
              </Link>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={tours}
              rowActions={["edit", "book", "delete"]}
              actionHandlers={{
                onEdit: (row) => {
                  // Navigate to edit page
                  router.push(`/tours/${row._id}`);
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
                    tourId: row._id as string,
                    tourName: row.name as string,
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
        title="Delete Tour"
        message={
          <div>
            <p>Are you sure you want to delete the tour:</p>
            <p className="font-semibold text-red-600 mt-2">
              "{deleteConfirmation.tourName}"
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
            tourId: null,
            tourName: "",
            currentStatus: true,
          })
        }
        onConfirm={async () => {
          if (!availabilityConfirmation.tourId) return;
          await handleToggleAvailability(
            availabilityConfirmation.tourId,
            availabilityConfirmation.currentStatus
          );
        }}
        title={
          availabilityConfirmation.currentStatus
            ? "Disable Tour"
            : "Enable Tour"
        }
        message={
          <div>
            <p>
              Are you sure you want to{" "}
              {availabilityConfirmation.currentStatus ? "disable" : "enable"}{" "}
              the tour:
            </p>
            <p className="font-semibold text-primary_green mt-2">
              "{availabilityConfirmation.tourName}"
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
      {bookingModal.tourDetails && (
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
          packageType="tour"
          packageDetails={{
            _id: bookingModal.tourDetails._id,
            title: bookingModal.tourDetails.title,
            newPrice: bookingModal.tourDetails.newPrice,
            childPrice: bookingModal.tourDetails.childPrice,
            minimumPerson: bookingModal.tourDetails.minimumPerson,
            maximumPerson: bookingModal.tourDetails.maximumPerson,
            type: bookingModal.tourDetails.type,
            details: {
              pickupLocations: bookingModal.tourDetails.details?.pickupLocation,
              pickupOption: "user",
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
