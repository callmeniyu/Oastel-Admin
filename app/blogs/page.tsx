"use client"

import AdminHeader from "@/components/admin/AdminHeader"
import MobileNav from "@/components/admin/MobileNav"
import DataTable from "@/components/admin/DataTable"

export default function BlogsPage() {
    const blogs = [
        {
            id: "B001",
            title: "Top 5 Tea Plantations to Visit",
            category: "Travel Tips",
            status: "Published",
            date: "2023-10-05",
        },
        {
            id: "B002",
            title: "Guide to Mossy Forest",
            category: "Adventure",
            status: "Draft",
            date: "2023-09-18",
        },
        {
            id: "B003",
            title: "Best Time to Visit Cameron Highlands",
            category: "Travel Tips",
            status: "Published",
            date: "2023-08-22",
        },
    ]

    const columns = [
        { key: "title", label: "Title" },
        { key: "category", label: "Category" },
        { key: "status", label: "Status" },
        { key: "date", label: "Publish Date" },
        { key: "actions", label: "Actions" },
    ]

    return (
        <div className="min-h-screen bg-gray-50 pb-16">
            <AdminHeader />

            <main className="p-4">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-dark">Blogs</h1>
                    <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium">
                        + New Blog Post
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                    <DataTable
                        columns={columns}
                        data={blogs}
                        rowActions={["edit", "delete", "more"]}
                        actionHandlers={{
                            onEdit: (row: any) => {
                                console.log("Edit blog:", row)
                                // TODO: Navigate to edit page
                            },
                            onDelete: (row: any) => {
                                console.log("Delete blog:", row)
                                // TODO: Implement delete functionality
                            },
                            onMore: (row: any) => {
                                console.log("More actions for blog:", row)
                                // TODO: Implement additional actions (publish/unpublish, etc.)
                            },
                        }}
                    />
                </div>
            </main>

            <MobileNav />
        </div>
    )
}
