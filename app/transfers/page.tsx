"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import AdminHeader from "@/components/admin/AdminHeader"
import MobileNav from "@/components/admin/MobileNav"
import DataTable from "@/components/admin/DataTable"
import StatusToggle from "@/components/admin/StatusToggle"
import Confirmation from "@/components/ui/Confirmation"
import Link from "next/link"
import { transferApi, TransferType } from "@/lib/transferApi"
import { toast } from "react-hot-toast"

interface TransferTableData {
    id: string
    name: string
    category: string
    route: string
    price: string | number // Allow both for formatted display
    status: React.ReactNode // Change to ReactNode to allow status toggle component
    _id: string
    originalStatus: "active" | "sold" // Keep original status for toggle functionality
    [key: string]: any // Index signature for DataTable compatibility
}

export default function TransfersPage() {
    const router = useRouter()
    const [transfers, setTransfers] = useState<TransferTableData[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [deleteConfirmation, setDeleteConfirmation] = useState<{
        isOpen: boolean
        transferId: string | null
        transferName: string
    }>({
        isOpen: false,
        transferId: null,
        transferName: "",
    })

    // Fetch transfers from API
    useEffect(() => {
        const fetchTransfers = async () => {
            try {
                setIsLoading(true)
                setError(null)
                const response = await transferApi.getTransfers({ limit: 100 }) // Get all transfers

                // Transform the data to match the table structure
                const transformedTransfers: TransferTableData[] = response.data.map((transfer: TransferType) => ({
                    id: transfer._id,
                    name: transfer.title,
                    category: transfer.type,
                    route: `${transfer.from} → ${transfer.to}`,
                    price: `RM ${transfer.newPrice.toFixed(2)}`,
                    status: (
                        <StatusToggle
                            key={`${transfer._id}-${transfer.status}`} // Add key to force re-render
                            initialStatus={transfer.status}
                            onStatusChange={(status) => handleStatusUpdate(transfer._id, status)}
                        />
                    ),
                    originalStatus: transfer.status,
                    _id: transfer._id,
                }))

                setTransfers(transformedTransfers)
            } catch (err) {
                console.error("Error fetching transfers:", err)
                setError("Failed to load transfers. Please try again later.")
                toast.error("Failed to load transfers")
            } finally {
                setIsLoading(false)
            }
        }

        fetchTransfers()
    }, [])

    // Handle transfer status update
    const handleStatusUpdate = async (transferId: string, newStatus: "active" | "sold") => {
        try {
            await transferApi.updateTransferStatus(transferId, newStatus)

            // Update the local state to trigger re-render
            setTransfers((prevTransfers) =>
                prevTransfers.map((transfer) =>
                    transfer._id === transferId
                        ? {
                              ...transfer,
                              originalStatus: newStatus,
                              status: (
                                  <StatusToggle
                                      key={`${transferId}-${newStatus}`} // Add key to force re-render
                                      initialStatus={newStatus}
                                      onStatusChange={(status) => handleStatusUpdate(transferId, status)}
                                  />
                              ),
                          }
                        : transfer
                )
            )

            toast.success(`Transfer status updated to ${newStatus === "active" ? "Active" : "Sold Out"}`)
        } catch (error) {
            console.error("Error updating transfer status:", error)
            toast.error("Failed to update transfer status")
            throw error // Re-throw to let StatusToggle handle the error state
        }
    }

    // Handle transfer deletion
    const handleDelete = async (id: string) => {
        const transferToDelete = transfers.find((transfer) => transfer._id === id)
        if (!transferToDelete) return

        setDeleteConfirmation({
            isOpen: true,
            transferId: id,
            transferName: transferToDelete.name,
        })
    }

    // Confirm deletion
    const confirmDelete = async () => {
        if (!deleteConfirmation.transferId) return

        try {
            await transferApi.deleteTransfer(deleteConfirmation.transferId)
            // Remove the deleted transfer from the local state
            setTransfers(transfers.filter((transfer) => transfer._id !== deleteConfirmation.transferId))
            toast.success("Transfer deleted successfully")
        } catch (error) {
            console.error("Error deleting transfer:", error)
            toast.error("Failed to delete transfer")
        } finally {
            setDeleteConfirmation({
                isOpen: false,
                transferId: null,
                transferName: "",
            })
        }
    }

    // Close confirmation dialog
    const closeDeleteConfirmation = () => {
        setDeleteConfirmation({
            isOpen: false,
            transferId: null,
            transferName: "",
        })
    }

    const columns = [
        { key: "name", label: "Transfer Name" },
        { key: "category", label: "Category" },
        { key: "route", label: "Route" },
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
                        <h1 className="text-2xl font-bold text-dark">Transfer Packages</h1>
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
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 pb-16">
                <AdminHeader />

                <main className="p-4">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold text-dark">Transfer Packages</h1>
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
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-16">
            <AdminHeader />

            <main className="p-4">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-dark">Transfer Packages</h1>
                    <Link
                        href={"/transfers/add-transfer"}
                        className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium"
                    >
                        + Add Transfer
                    </Link>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                    {transfers.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <p className="text-lg font-semibold">No transfers found</p>
                            <p className="text-sm mt-2">Get started by adding your first transfer package.</p>
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
                            rowActions={["edit", "delete"]}
                            actionHandlers={{
                                onEdit: (row) => {
                                    // Navigate to edit page
                                    router.push(`/transfers/${row._id}`)
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
                title="Delete Transfer"
                message={
                    <div>
                        <p>Are you sure you want to delete the transfer:</p>
                        <p className="font-semibold text-red-600 mt-2">"{deleteConfirmation.transferName}"</p>
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
