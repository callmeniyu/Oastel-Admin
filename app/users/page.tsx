"use client"

import AdminHeader from "@/components/admin/AdminHeader"
import MobileNav from "@/components/admin/MobileNav"
import DataTable from "@/components/admin/DataTable"

export default function UsersPage() {
    const users = [
        {
            id: "U001",
            name: "Alex Cooper",
            email: "alex@example.com",
            bookings: 12,
            joined: "2023-01-15",
        },
        {
            id: "U002",
            name: "Sarah Lim",
            email: "sarah@example.com",
            bookings: 5,
            joined: "2023-05-22",
        },
        {
            id: "U003",
            name: "Raj Patel",
            email: "raj@example.com",
            bookings: 3,
            joined: "2023-08-10",
        },
    ]

    const columns = [
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "bookings", label: "Bookings" },
        { key: "joined", label: "Joined On" },
        { key: "actions", label: "Actions" },
    ]

    return (
        <div className="min-h-screen bg-gray-50 pb-16">
            <AdminHeader />

            <main className="p-4">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-dark">Users</h1>
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            placeholder="Search users..."
                            className="bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                    <DataTable
                        columns={columns}
                        data={users}
                        rowActions={["view"]}
                        actionHandlers={{
                            onMore: (row: any) => {
                                console.log("View user:", row)
                                // TODO: Navigate to user details page
                            },
                        }}
                    />
                </div>
            </main>

            <MobileNav />
        </div>
    )
}
