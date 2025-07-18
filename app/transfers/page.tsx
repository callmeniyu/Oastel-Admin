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
    route: string
    type: string
    price: string | number
    status: React.ReactNode
    _id: string
    originalStatus: "active" | "sold"
    [key: string]: any
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
                    route: `${transfer.from} → ${transfer.to}`,
                    type: transfer.type,
                    price: `RM ${transfer.newPrice.toFixed(2)}`,
                    status: (
                        <StatusToggle
                            key={`${transfer._id}-${transfer.status}`}
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
                                      key={`${transferId}-${newStatus}`}
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
            transferName: transferToDelete.route,
        })
    }

    // Confirm deletion
    const confirmDelete = async () => {
        if (!deleteConfirmation.transferId) return

        try {
            await transferApi.deleteTransfer(deleteConfirmation.transferId)
            setTransfers((prevTransfers) =>
                prevTransfers.filter((transfer) => transfer._id !== deleteConfirmation.transferId)
            )
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

    // Handle edit navigation
    const handleEdit = (id: string) => {
        router.push(`/transfers/edit/${id}`)
    }

    const columns = [
        { key: "route", label: "Route" },
        { key: "type", label: "Type" },
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
                        <h1 className="text-2xl font-bold text-dark">Transfers</h1>
                        <Link
                            href="/transfers/add-transfer"
                            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium"
                        >
                            + Add Transfer
                        </Link>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading transfers...</p>
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
                        <h1 className="text-2xl font-bold text-dark">Transfers</h1>
                        <Link
                            href="/transfers/add-transfer"
                            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium"
                        >
                            + Add Transfer
                        </Link>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
                        <div className="text-red-500 mb-4">
                            <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            <p className="text-lg font-semibold">{error}</p>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            Try Again
                        </button>
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
                    <h1 className="text-2xl font-bold text-dark">Transfers</h1>
                    <Link
                        href="/transfers/add-transfer"
                        className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium"
                    >
                        + Add Transfer
                    </Link>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                    <DataTable
                        columns={columns}
                        data={transfers}
                        rowActions={["edit", "delete"]}
                        actionHandlers={{
                            onEdit: (row: any) => handleEdit(row._id),
                            onDelete: (row: any) => handleDelete(row._id),
                        }}
                    />
                </div>
            </main>

            <MobileNav />

            {/* Delete Confirmation Modal */}
            <Confirmation
                isOpen={deleteConfirmation.isOpen}
                onClose={() => setDeleteConfirmation({ isOpen: false, transferId: null, transferName: "" })}
                onConfirm={confirmDelete}
                title="Delete Transfer"
                message={`Are you sure you want to delete "${deleteConfirmation.transferName}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
            />
        </div>
    )
}
