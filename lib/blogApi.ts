export interface BlogType {
    _id: string
    title: string
    slug: string
    image: string
    description: string
    category: "Travel Tips" | "Local Culture" | "Food & Cuisine" | "Adventure & Nature" | "Stay" | "Transportation"
    views: number
    publishDate: string
    content: string
    createdAt: Date
    updatedAt: Date
}

export interface BlogsResponse {
    success: boolean
    data: BlogType[]
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

export const blogApi = {
    // Upload blog image to Cloudinary
    uploadImage: async (file: File): Promise<{ success: boolean; data: { imageUrl: string }; message: string }> => {
        try {
            const formData = new FormData()
            formData.append("image", file)

            const response = await fetch(`${API_BASE_URL}/api/upload/blog-image`, {
                method: "POST",
                body: formData,
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
            }

            return await response.json()
        } catch (error) {
            console.error("Error uploading image:", error)
            throw error
        }
    },

    // Create a new blog
    createBlog: async (
        blogData: Omit<BlogType, "_id" | "createdAt" | "updatedAt">
    ): Promise<{ success: boolean; message: string; data: BlogType }> => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/blogs`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(blogData),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
            }

            return await response.json()
        } catch (error) {
            console.error("Error creating blog:", error)
            throw error
        }
    },

    // Get all blogs with optional filters and pagination
    getBlogs: async (params?: {
        page?: number
        limit?: number
        category?: string
        sortBy?: string
        sortOrder?: "asc" | "desc"
    }): Promise<BlogsResponse> => {
        try {
            const searchParams = new URLSearchParams()

            if (params?.page) searchParams.append("page", params.page.toString())
            if (params?.limit) searchParams.append("limit", params.limit.toString())
            if (params?.category) searchParams.append("category", params.category)
            if (params?.sortBy) searchParams.append("sortBy", params.sortBy)
            if (params?.sortOrder) searchParams.append("sortOrder", params.sortOrder)

            const response = await fetch(`${API_BASE_URL}/api/blogs?${searchParams}`)

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            return await response.json()
        } catch (error) {
            console.error("Error fetching blogs:", error)
            throw error
        }
    },

    // Get blog by ID
    getBlogById: async (id: string): Promise<{ success: boolean; data: BlogType }> => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/blogs/${id}`)

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            return await response.json()
        } catch (error) {
            console.error("Error fetching blog:", error)
            throw error
        }
    },

    // Get blog by slug (for public viewing)
    getBlogBySlug: async (slug: string): Promise<{ success: boolean; data: BlogType }> => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/blogs/slug/${slug}`)

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            return await response.json()
        } catch (error) {
            console.error("Error fetching blog by slug:", error)
            throw error
        }
    },

    // Update a blog
    updateBlog: async (
        id: string,
        blogData: Partial<BlogType>
    ): Promise<{ success: boolean; message: string; data: BlogType }> => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/blogs/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(blogData),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
            }

            return await response.json()
        } catch (error) {
            console.error("Error updating blog:", error)
            throw error
        }
    },

    // Delete a blog
    deleteBlog: async (id: string): Promise<{ success: boolean; message: string }> => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/blogs/${id}`, {
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
            console.error("Error deleting blog:", error)
            throw error
        }
    },

    // Increment blog views
    incrementViews: async (id: string): Promise<{ success: boolean; message: string; data: BlogType }> => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/blogs/${id}/views`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            return await response.json()
        } catch (error) {
            console.error("Error incrementing blog views:", error)
            throw error
        }
    },
}
