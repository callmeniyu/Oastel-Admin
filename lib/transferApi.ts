export interface TransferType {
    _id: string
    title: string
    slug: string
    image: string
    tags: string[]
    desc: string
    type: "Van" | "Van + Ferry" | "Private"
    vehicle?: string
    packageType: "transfer"
    duration: string
    status: "active" | "sold"
    bookedCount: number
    oldPrice: number
    newPrice: number
    childPrice: number
    minimumPerson: number
    maximumPerson?: number
    times: string[]
    label?: "Recommended" | "Popular" | "Best Value" | "Best seller" | null
    from: string
    to: string
    details: {
        about: string
        itinerary: string
        pickupOption: "admin" | "user"
        pickupLocations: string
        note?: string
        faq: Array<{
            question: string
            answer: string
        }>
    }
    createdAt: Date
    updatedAt: Date
}

export interface TransfersResponse {
    success: boolean
    data: TransferType[]
    pagination: {
        page: number
        limit: number
        total: number
        pages: number
    }
}

export interface ApiError {
    success: false
    message: string
    errors?: any
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"

export const transferApi = {
    // Upload transfer image
    uploadImage: async (file: File): Promise<{ success: boolean; data: { imageUrl: string; filename: string } }> => {
        try {
            const formData = new FormData()
            formData.append("image", file)

            const response = await fetch(`${API_BASE_URL}/api/upload/transfer-image`, {
                method: "POST",
                body: formData,
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            return await response.json()
        } catch (error) {
            console.error("Error uploading transfer image:", error)
            throw error
        }
    },

    // Get all transfers with optional filters and pagination
    getTransfers: async (params?: {
        page?: number
        limit?: number
        type?: string
        status?: string
    }): Promise<TransfersResponse> => {
        try {
            const searchParams = new URLSearchParams()

            if (params?.page) searchParams.append("page", params.page.toString())
            if (params?.limit) searchParams.append("limit", params.limit.toString())
            if (params?.type) searchParams.append("type", params.type)
            if (params?.status) searchParams.append("status", params.status)

            const response = await fetch(`${API_BASE_URL}/api/transfers?${searchParams}`)

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            return await response.json()
        } catch (error) {
            console.error("Error fetching transfers:", error)
            throw error
        }
    },

    // Delete a transfer
    deleteTransfer: async (id: string): Promise<{ success: boolean; message: string }> => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/transfers/${id}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            return await response.json()
        } catch (error) {
            console.error("Error deleting transfer:", error)
            throw error
        }
    },

    // Get transfer by ID
    getTransferById: async (id: string): Promise<{ success: boolean; data: TransferType }> => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/transfers/${id}`)

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            return await response.json()
        } catch (error) {
            console.error("Error fetching transfer:", error)
            throw error
        }
    },

    // Update transfer status
    updateTransferStatus: async (
        id: string,
        status: "active" | "sold"
    ): Promise<{ success: boolean; message: string; data: TransferType }> => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/transfers/${id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ status }),
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            return await response.json()
        } catch (error) {
            console.error("Error updating transfer status:", error)
            throw error
        }
    },

    // Update a transfer
    updateTransfer: async (
        id: string,
        transferData: any
    ): Promise<{ success: boolean; message: string; data: TransferType }> => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/transfers/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(transferData),
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            return await response.json()
        } catch (error) {
            console.error("Error updating transfer:", error)
            throw error
        }
    },

    // Create a new transfer
    createTransfer: async (transferData: any): Promise<{ success: boolean; message: string; data: TransferType }> => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/transfers`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(transferData),
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            return await response.json()
        } catch (error) {
            console.error("Error creating transfer:", error)
            throw error
        }
    },
}
