"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import AdminHeader from "@/components/admin/AdminHeader"
import MobileNav from "@/components/admin/MobileNav"
import DataTable from "@/components/admin/DataTable"
import StatusToggle from "@/components/admin/StatusToggle"
import Confirmation from "@/components/ui/Confirmation"
import Link from "next/link"
import { tourApi, TourType } from "@/lib/tourApi"
import { toast } from "react-hot-toast"

interface TourTableData {
    id: string
    name: string
    category: string
    period: string
    price: string | number // Allow both for formatted display
    status: React.ReactNode // Change to ReactNode to allow status toggle component
    _id: string
    originalStatus: "active" | "sold" // Keep original status for toggle functionality
    [key: string]: any // Index signature for DataTable compatibility
}

export default function ToursPage() {
    const router = useRouter()
    const [tours, setTours] = useState<TourTableData[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [deleteConfirmation, setDeleteConfirmation] = useState<{
        isOpen: boolean
        tourId: string | null
        tourName: string
    }>({
        isOpen: false,
        tourId: null,
        tourName: "",
    })

    // Fetch tours from API
    useEffect(() => {
        const fetchTours = async () => {
            try {
                setIsLoading(true)
                setError(null)
                const response = await tourApi.getTours({ limit: 100 }) // Get all tours

                // Transform the data to match the table structure
                const transformedTours: TourTableData[] = response.data.map((tour: TourType) => ({
                    id: tour._id,
                    name: tour.title,
                    category: tour.type === "co-tour" ? "Co-Tour" : "Private",
                    period: tour.period,
                    price: `RM ${tour.newPrice.toFixed(2)}`,
                    status: (
                        <StatusToggle
                            key={`${tour._id}-${tour.status}`} // Add key to force re-render
                            initialStatus={tour.status}
                            onStatusChange={(status) => handleStatusUpdate(tour._id, status)}
                        />
                    ),
                    originalStatus: tour.status,
                    _id: tour._id,
                }))

                setTours(transformedTours)
            } catch (err) {
                console.error("Error fetching tours:", err)
                setError("Failed to load tours. Please try again later.")
                toast.error("Failed to load tours")
            } finally {
                setIsLoading(false)
            }
        }

        fetchTours()
    }, [])

    // Handle tour status update
    const handleStatusUpdate = async (tourId: string, newStatus: "active" | "sold") => {
        try {
            await tourApi.updateTourStatus(tourId, newStatus)

            // Update the local state to trigger re-render
            setTours((prevTours) =>
                prevTours.map((tour) =>
                    tour._id === tourId
                        ? {
                              ...tour,
                              originalStatus: newStatus,
                              status: (
                                  <StatusToggle
                                      key={`${tourId}-${newStatus}`} // Add key to force re-render
                                      initialStatus={newStatus}
                                      onStatusChange={(status) => handleStatusUpdate(tourId, status)}
                                  />
                              ),
                          }
                        : tour
                )
            )

            toast.success(`Tour status updated to ${newStatus === "active" ? "Active" : "Sold Out"}`)
        } catch (error) {
            console.error("Error updating tour status:", error)
            toast.error("Failed to update tour status")
            throw error // Re-throw to let StatusToggle handle the error state
        }
    }

    // Handle tour deletion
    const handleDelete = async (id: string) => {
        const tourToDelete = tours.find((tour) => tour._id === id)
        if (!tourToDelete) return

        setDeleteConfirmation({
            isOpen: true,
            tourId: id,
            tourName: tourToDelete.name,
        })
    }

    // Confirm deletion
    const confirmDelete = async () => {
        if (!deleteConfirmation.tourId) return

        try {
            await tourApi.deleteTour(deleteConfirmation.tourId)
            // Remove the deleted tour from the local state
            setTours(tours.filter((tour) => tour._id !== deleteConfirmation.tourId))
            toast.success("Tour deleted successfully")
        } catch (error) {
            console.error("Error deleting tour:", error)
            toast.error("Failed to delete tour")
        } finally {
            setDeleteConfirmation({
                isOpen: false,
                tourId: null,
                tourName: "",
            })
        }
    }

    // Close confirmation dialog
    const closeDeleteConfirmation = () => {
        setDeleteConfirmation({
            isOpen: false,
            tourId: null,
            tourName: "",
        })
    }

    const columns = [
        { key: "name", label: "Tour Name" },
        { key: "category", label: "Category" },
        { key: "period", label: "Period" },
        { key: "price", label: "Price (RM)" },
        { key: "status", label: "Status" },
        { key: "actions", label: "Actions" },
    ]

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 pb-16">
                <AdminHeader />

                <main className="p-4">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold text-dark">Tour Packages</h1>
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
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 pb-16">
                <AdminHeader />

                <main className="p-4">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold text-dark">Tour Packages</h1>
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
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-16">
            <AdminHeader />

            <main className="p-4">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-dark">Tour Packages</h1>
                    <Link
                        href={"/tours/add-tour"}
                        className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium"
                    >
                        + Add Tour
                    </Link>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                    {tours.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <p className="text-lg font-semibold">No tours found</p>
                            <p className="text-sm mt-2">Get started by adding your first tour package.</p>
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
                            rowActions={["edit", "delete"]}
                            actionHandlers={{
                                onEdit: (row) => {
                                    // Navigate to edit page
                                    router.push(`/tours/${row._id}`)
                                },
                                onDelete: (row) => {
                                    handleDelete(row._id as string)
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
                        <p className="font-semibold text-red-600 mt-2">"{deleteConfirmation.tourName}"</p>
                        <p className="mt-2 text-sm text-gray-500">This action cannot be undone.</p>
                    </div>
                }
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
            />
        </div>
    )
}
