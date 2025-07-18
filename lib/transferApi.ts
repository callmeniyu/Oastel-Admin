export interface TransferType {
    _id: string
    title: string
    slug: string
    image: string
    tags: string[]
    desc: string
    type: "Van" | "Van + Ferry" | "Private"
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
    label?: "Recommended" | "Popular" | "Best Value" | null
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

export const transferApi = {
    // Get all transfers
    async getTransfers(params?: {
        page?: number
        limit?: number
        type?: string
        status?: string
        search?: string
    }): Promise<TransfersResponse> {
        try {
            const searchParams = new URLSearchParams()

            if (params?.page) searchParams.append("page", params.page.toString())
            if (params?.limit) searchParams.append("limit", params.limit.toString())
            if (params?.type) searchParams.append("type", params.type)
            if (params?.status) searchParams.append("status", params.status)
            if (params?.search) searchParams.append("search", params.search)

            const response = await fetch(`${API_BASE_URL}/api/transfers?${searchParams}`)

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || "Failed to fetch transfers")
            }

            return await response.json()
        } catch (error) {
            console.error("Error fetching transfers:", error)
            throw error
        }
    },

    // Get transfer by ID
    async getTransferById(id: string): Promise<{ success: boolean; data: TransferType }> {
        try {
            const response = await fetch(`${API_BASE_URL}/api/transfers/${id}`)

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || "Failed to fetch transfer")
            }

            return await response.json()
        } catch (error) {
            console.error("Error fetching transfer:", error)
            throw error
        }
    },

    // Update transfer status
    async updateTransferStatus(id: string, status: "active" | "sold"): Promise<{ success: boolean; data: TransferType }> {
        try {
            const response = await fetch(`${API_BASE_URL}/api/transfers/${id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ status }),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || "Failed to update transfer status")
            }

            return await response.json()
        } catch (error) {
            console.error("Error updating transfer status:", error)
            throw error
        }
    },

    // Delete transfer
    async deleteTransfer(id: string): Promise<{ success: boolean; message: string }> {
        try {
            const response = await fetch(`${API_BASE_URL}/api/transfers/${id}`, {
                method: "DELETE",
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || "Failed to delete transfer")
            }

            return await response.json()
        } catch (error) {
            console.error("Error deleting transfer:", error)
            throw error
        }
    },

    // Update transfer
    async updateTransfer(id: string, data: Partial<TransferType>): Promise<{ success: boolean; data: TransferType }> {
        try {
            const response = await fetch(`${API_BASE_URL}/api/transfers/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || "Failed to update transfer")
            }

            return await response.json()
        } catch (error) {
            console.error("Error updating transfer:", error)
            throw error
        }
    },
}
