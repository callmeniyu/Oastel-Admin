import { useState, useEffect } from "react"

interface StatusToggleProps {
    initialStatus: "active" | "sold"
    onStatusChange: (newStatus: "active" | "sold") => Promise<void>
    disabled?: boolean
}

export default function StatusToggle({ initialStatus, onStatusChange, disabled = false }: StatusToggleProps) {
    const [status, setStatus] = useState<"active" | "sold">(initialStatus)
    const [isUpdating, setIsUpdating] = useState(false)

    // Sync internal status with prop changes
    useEffect(() => {
        setStatus(initialStatus)
    }, [initialStatus])

    const handleToggle = async () => {
        if (disabled || isUpdating) return

        const newStatus = status === "active" ? "sold" : "active"
        setIsUpdating(true)

        try {
            await onStatusChange(newStatus)
            setStatus(newStatus)
        } catch (error) {
            console.error("Failed to update status:", error)
            // Keep the original status on error
        } finally {
            setIsUpdating(false)
        }
    }

    return (
        <div className="flex items-center space-x-2">
            <button
                onClick={handleToggle}
                disabled={disabled || isUpdating}
                className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed
                    ${status === "active" ? "bg-green-600" : "bg-red-600"}
                `}
                title={`Toggle status (currently ${status})`}
            >
                <span
                    className={`
                        inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out
                        ${status === "active" ? "translate-x-6" : "translate-x-1"}
                        ${isUpdating ? "animate-pulse" : ""}
                    `}
                />
            </button>
            <span className={`text-sm font-medium ${status === "active" ? "text-green-600" : "text-red-600"}`}>
                {isUpdating ? "Updating..." : status === "active" ? "Active" : "Sold Out"}
            </span>
        </div>
    )
}
