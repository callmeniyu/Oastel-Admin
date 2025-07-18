import Image from "next/image"
import { MdAccessTimeFilled } from "react-icons/md"
import { FaBookmark } from "react-icons/fa"
import { FiMapPin } from "react-icons/fi"
import { IoFlagSharp } from "react-icons/io5"

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
    status?: "active" | "sold"
    from: string
    to: string
}

// Tag Component (inline since we don't have access to the client Tag component)
const Tag = ({ tag }: { tag: string }) => (
    <span className="bg-[#E6F1EE] text-primary px-2 py-1 rounded-md text-xs font-medium">{tag}</span>
)

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
    status = "active",
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
        <div className="rounded-xl shadow-lg bg-white flex flex-col flex-grow justify-between relative">
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
            <div className="p-4 flex flex-col justify-between gap-2 self-start font-poppins">
                <h3 className="text-primary font-semibold font-poppins text-base">{title || "Sample Transfer Title"}</h3>
                <div className="flex gap-2">
                    {(tags && tags.length > 0 ? tags : ["Sample Tag"]).map((tag, i) => (
                        <Tag key={i} tag={tag} />
                    ))}
                </div>
                <p className="text-gray-500 text-sm font-poppins">{desc || "Sample transfer description..."}</p>
                <div className="flex justify-between">
                    <div className="flex flex-col gap-2">
                        <div className="flex gap-2 items-center font-semibold">
                            <FiMapPin width={30} className="text-primary text-md" />
                            <p className="text-sm">{from || "From Location"}</p>
                        </div>
                        <div className="flex gap-2 items-center font-semibold">
                            <IoFlagSharp width={30} className="text-primary text-md" />
                            <p className="text-sm">{to || "To Location"}</p>
                        </div>
                    </div>
                    <div className="flex flex-col justify-between gap-2">
                        <div className="flex gap-2 items-center font-semibold">
                            <FaBookmark width={30} className="text-primary text-md" />
                            <p className="text-sm">{Number(bookedCount) || 0}+ Booked</p>
                        </div>
                        <div className="flex gap-2 items-center font-semibold">
                            <MdAccessTimeFilled width={30} className="text-primary text-lg" />
                            <p className="text-sm">{duration || "3"} hrs</p>
                        </div>
                    </div>
                </div>
                <div className="flex justify-between items-center mt-2">
                    <div className="flex flex-col items-start">
                        {oldPrice > 0 && oldPrice !== newPrice && (
                            <p className="text-gray-400 line-through font-poppins text-base">{oldPrice}</p>
                        )}
                        <h4 className="font-poppins text-xl font-bold">
                            {newPrice || 0} RM{" "}
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
