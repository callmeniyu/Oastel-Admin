import Image from "next/image"
import { FiMapPin, FiClock, FiUsers } from "react-icons/fi"
import { formatNumber } from "@/lib/utils"

type TransferCardProps = {
    id?: number
    slug?: string
    image: string
    title: string
    tags: string[]
    desc: string
    duration: string
    bookedCount: string | number
    oldPrice: number
    newPrice: number
    childPrice: number
    type: string
    label?: string | null
    from: string
    to: string
}

export default function TransferCardPreview({
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
    childPrice,
    type,
    label,
    from,
    to,
}: TransferCardProps) {
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
            {label && label !== "None" && (
                <div
                    className={`absolute top-3 left-3 z-10 px-3 py-1 rounded-full text-xs font-semibold ${getLabelStyles(
                        label
                    )}`}
                >
                    {label}
                </div>
            )}
            <Image
                src={image || "/images/placeholder-transfer.jpg"}
                alt={title || "Transfer Preview"}
                width={400}
                height={400}
                className="h-48 w-full object-cover rounded-t-lg"
            />
            <div className="p-4 flex flex-col justify-between gap-2 self-start">
                <h3 className="text-primary font-semibold font-poppins text-base line-clamp-2">
                    {title || "Sample Transfer Title"}
                </h3>

                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                    {(tags && tags.length > 0 ? tags : ["Sample Tag"]).map((tag, i) => (
                        <span key={i} className="bg-[#E6F1EE] text-primary px-2 py-1 rounded-md text-xs font-medium">
                            {tag}
                        </span>
                    ))}
                </div>

                {/* Route */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FiMapPin className="text-primary flex-shrink-0" />
                    <span className="line-clamp-1">
                        {from || "From Location"} → {to || "To Location"}
                    </span>
                </div>

                {/* Description */}
                <p className="text-gray-500 text-sm font-poppins line-clamp-2">
                    {desc || "Sample transfer description..."}
                </p>

                {/* Duration, Type & Booked Count */}
                <div className="flex justify-between gap-2 text-sm">
                    <div className="flex gap-3">
                        <div className="flex gap-1 items-center font-semibold">
                            <FiClock className="text-primary" />
                            <span>{duration || "3"}h</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                {type || "Van"}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-1 items-center font-semibold text-gray-600">
                        <FiUsers className="text-primary" />
                        <span>{formatNumber(Number(bookedCount) || 0)}+ Booked</span>
                    </div>
                </div>

                {/* Pricing */}
                <div className="flex justify-between items-center mt-2">
                    <div className="flex flex-col items-start">
                        {oldPrice > 0 && oldPrice !== newPrice && (
                            <p className="text-gray-400 line-through font-poppins text-sm">RM{oldPrice}</p>
                        )}
                        <div className="flex items-baseline gap-2">
                            <h4 className="font-poppins text-xl font-bold text-primary">RM{newPrice || 0}</h4>
                            <span className="text-sm font-light text-gray-600">
                                {type === "Private" ? "/group" : "/person"}
                            </span>
                        </div>
                        {childPrice > 0 && <p className="text-xs text-gray-500">Child: RM{childPrice}</p>}
                    </div>

                    <button
                        className="bg-primary hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md transition-colors"
                        disabled
                    >
                        Book Now
                    </button>
                </div>
            </div>
        </div>
    )
}
