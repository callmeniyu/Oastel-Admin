"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import AdminHeader from "@/components/admin/AdminHeader"
import MobileNav from "@/components/admin/MobileNav"
import DataTable from "@/components/admin/DataTable"
import Confirmation from "@/components/ui/Confirmation"
import Link from "next/link"
import { blogApi, BlogType } from "@/lib/blogApi"
import { toast } from "react-hot-toast"

export default function BlogsPage() {
    const router = useRouter()
    const [blogs, setBlogs] = useState<BlogType[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
    const [blogToDelete, setBlogToDelete] = useState<BlogType | null>(null)

    // Fetch blogs on component mount
    useEffect(() => {
        fetchBlogs()
    }, [])

    const fetchBlogs = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await blogApi.getBlogs({
                sortBy: "createdAt",
                sortOrder: "desc",
                limit: 100, // Fetch up to 100 blogs
            })

            if (response.success) {
                setBlogs(response.data)
                console.log(`Loaded ${response.data.length} blogs`)
            } else {
                setError("Failed to fetch blogs")
            }
        } catch (error: any) {
            console.error("Error fetching blogs:", error)
            setError(error.message || "Failed to fetch blogs")
            toast.error("Failed to load blogs")
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteBlog = async (blog: BlogType) => {
        setBlogToDelete(blog)
        setShowDeleteConfirmation(true)
    }

    const confirmDeleteBlog = async () => {
        if (!blogToDelete) return

        try {
            await blogApi.deleteBlog(blogToDelete._id)
            toast.success("Blog deleted successfully!")
            // Refresh the blogs list
            fetchBlogs()
        } catch (error: any) {
            console.error("Error deleting blog:", error)
            toast.error(error.message || "Failed to delete blog")
        } finally {
            setShowDeleteConfirmation(false)
            setBlogToDelete(null)
        }
    }

    const cancelDeleteBlog = () => {
        setShowDeleteConfirmation(false)
        setBlogToDelete(null)
    }

    // Transform blogs data for the DataTable component
    const blogsTableData = blogs.map((blog) => ({
        id: blog._id,
        title: blog.title,
        category: blog.category,
        views: blog.views.toLocaleString(),
        date: new Date(blog.publishDate).toLocaleDateString("en-GB", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }),
    }))

    // Helper function to find blog by ID
    const findBlogById = (id: string) => blogs.find((blog) => blog._id === id)

    const columns = [
        { key: "title", label: "Title" },
        { key: "category", label: "Category" },
        { key: "views", label: "Views" },
        { key: "date", label: "Publish Date" },
        { key: "actions", label: "Actions" },
    ]

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 pb-16">
                <AdminHeader />
                <main className="p-4">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-dark">Blogs</h1>
                            <p className="text-gray-600 text-sm mt-1">Loading blogs...</p>
                        </div>
                        <Link
                            href="/blogs/add-blog"
                            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium"
                        >
                            + New Blog Post
                        </Link>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
                        <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            <span className="ml-2 text-gray-600">Loading blogs...</span>
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
                        <div>
                            <h1 className="text-2xl font-bold text-dark">Blogs</h1>
                            <p className="text-gray-600 text-sm mt-1">Error loading blogs</p>
                        </div>
                        <Link
                            href="/blogs/add-blog"
                            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium"
                        >
                            + New Blog Post
                        </Link>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
                        <div className="text-center">
                            <div className="text-red-500 text-lg mb-2">Error loading blogs</div>
                            <p className="text-gray-600 mb-4">{error}</p>
                            <button
                                onClick={fetchBlogs}
                                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
                            >
                                Try Again
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
                    <div>
                        <h1 className="text-2xl font-bold text-dark">Blogs</h1>
                        <p className="text-gray-600 text-sm mt-1">
                            {loading ? "Loading..." : `${blogs.length} blog${blogs.length !== 1 ? "s" : ""} total`}
                        </p>
                    </div>
                    <div className="flex space-x-3">
                        <button
                            onClick={fetchBlogs}
                            disabled={loading}
                            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Refreshing..." : "Refresh"}
                        </button>
                        <Link
                            href="/blogs/add-blog"
                            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
                        >
                            + New Blog Post
                        </Link>
                    </div>
                </div>

                {blogs.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
                        <div className="text-center">
                            <div className="text-gray-500 text-lg mb-2">No blogs found</div>
                            <p className="text-gray-400 mb-4">Get started by creating your first blog post</p>
                            <Link
                                href="/blogs/add-blog"
                                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
                            >
                                Create First Blog
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                        <DataTable
                            columns={columns}
                            data={blogsTableData}
                            rowActions={["edit", "delete", "more"]}
                            actionHandlers={{
                                onEdit: (row: any) => {
                                    const blog = findBlogById(row.id as string)
                                    if (blog) {
                                        console.log("Edit blog:", blog)
                                        router.push(`/blogs/${blog._id}`)
                                    }
                                },
                                onDelete: (row: any) => {
                                    const blog = findBlogById(row.id as string)
                                    if (blog) {
                                        handleDeleteBlog(blog)
                                    }
                                },
                                onMore: (row: any) => {
                                    const blog = findBlogById(row.id as string)
                                    if (blog) {
                                        console.log("More actions for blog:", blog)
                                        // TODO: Implement additional actions (publish/unpublish, analytics, etc.)
                                    }
                                },
                            }}
                        />
                    </div>
                )}
            </main>

            <MobileNav />

            {/* Delete Confirmation Modal */}
            {showDeleteConfirmation && blogToDelete && (
                <Confirmation
                    isOpen={showDeleteConfirmation}
                    onClose={cancelDeleteBlog}
                    onConfirm={confirmDeleteBlog}
                    title="Delete Blog"
                    message={`Are you sure you want to delete "${blogToDelete.title}"? This action cannot be undone.`}
                    confirmText="Delete Blog"
                    cancelText="Cancel"
                    variant="danger"
                />
            )}
        </div>
    )
}
