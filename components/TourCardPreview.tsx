import Image from "next/image"
import { MdAccessTimeFilled } from "react-icons/md"
import { FaBookmark } from "react-icons/fa"
import { formatNumber } from "@/lib/utils"

// Image utility function for admin components
const resolveImageUrl = (imagePath: string): string => {
    if (!imagePath) return ""

    // If it's a blob URL, return as is (for previews)
    if (imagePath.startsWith("blob:")) {
        return imagePath
    }

    // If it's already a full URL (http/https), return as is
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
        return imagePath
    }

    // If it's a data URL (base64), return as is
    if (imagePath.startsWith("data:")) {
        return imagePath
    }

    // If it's a relative path starting with /uploads/, prepend API base URL
    if (imagePath.startsWith("/uploads/")) {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
        return `${API_BASE_URL}${imagePath}`
    }

    // For any other relative paths, prepend API base URL
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
    return `${API_BASE_URL}/${imagePath.replace(/^\//, "")}`
}

type TourCardProps = {
    id: number
    slug: string
    image: string
    title: string
    tags: string[]
    desc: string
    duration: string
    bookedCount: string | number
    oldPrice: number
    newPrice: number
    type: string
    label?: string | null
}

export default function TourCardPreview({
    id,
    slug,
    image,
    title,
    desc,
    duration,
    tags,
    bookedCount,
    oldPrice,
    newPrice,
    type,
    label,
}: TourCardProps) {
    // Label styling based on type
    const getLabelStyles = (labelType: string) => {
        switch (labelType) {
            case "Recommended":
                return "bg-primary_green text-white"
            case "Popular":
                return "bg-orange-500 text-white"
            case "Best Value":
                return "bg-blue-500 text-white"
            default:
                return "bg-gray-500 text-white"
        }
    }
    return (
        <div className="rounded-xl shadow-lg bg-white flex flex-col justify-between max-h-max relative">
            {/* Label Badge */}
            {label && (
                <div
                    className={`absolute top-3 left-3 z-10 px-3 py-1 rounded-full text-xs font-semibold ${getLabelStyles(
                        label
                    )}`}
                >
                    {label}
                </div>
            )}
            {image && image.startsWith("blob:") ? (
                // Use regular img tag for blob URLs (previews)
                <img src={resolveImageUrl(image)} alt={title} className="h-48 w-full object-cover rounded-t-lg" />
            ) : (
                // Use Next.js Image for all other URLs
                <Image
                    src={resolveImageUrl(image) || "/images/placeholder-tour.jpg"}
                    alt={title}
                    width={400}
                    height={400}
                    className="h-48 w-full object-cover rounded-t-lg"
                />
            )}
            <div className="p-4 flex flex-col justify-between gap-2 self-start">
                <h3 className="text-primary font-semibold font-poppins text-base">{title}</h3>
                <div className="flex gap-2">
                    {tags.map((tag, i) => (
                        <span key={i} className="bg-[#E6F1EE] text-primary px-2 py-1 rounded-md text-xs font-medium">
                            {tag}
                        </span>
                    ))}
                </div>
                <p className="text-gray-500 text-sm font-poppins">{desc}</p>
                <div className="flex justify-between gap-2">
                    <div className="flex gap-2 items-center font-semibold">
                        <MdAccessTimeFilled width={30} className="text-primary text-lg" />
                        <p className="text-sm">{duration} hrs</p>
                    </div>
                    <div className="flex gap-2 items-center font-semibold">
                        <FaBookmark width={30} className="text-primary text-md" />
                        <p className="text-sm">{formatNumber(Number(bookedCount))}+ Booked</p>
                    </div>
                </div>
                <div className="flex justify-between items-center mt-2">
                    <div className="flex flex-col items-start">
                        <p className="text-gray-400 line-through font-poppins text-base ">{oldPrice}</p>
                        <h4 className="font-poppins text-xl font-bold">
                            {newPrice} RM{" "}
                            <span className="text-sm font-light">{type === "private" ? "/group" : "/person"}</span>
                        </h4>
                    </div>

                    <button className="bg-primary text-white font-semibold py-2 px-4 rounded-md w-24 transition-colors">
                        Book
                    </button>
                </div>
            </div>
        </div>
    )
}
