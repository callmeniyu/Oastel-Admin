"use client"
import Image from "next/image"

interface BlogCardPreviewProps {
    _id: string
    image: string
    title: string
    slug: string
    desc: string
    category: string
    views: number
    content: string
    createdAt: Date
    updatedAt: Date
}

export default function BlogCardPreview({ _id, image, title, slug, desc, category }: BlogCardPreviewProps) {
    return (
        <div className="rounded-xl overflow-hidden shadow-lg bg-white flex flex-col">
            <Image src={image} alt={title} width={400} height={300} className="h-48 w-full object-cover" />
            <div className="p-4 flex flex-col justify-between flex-grow">
                <div>
                    <h3 className="text-gray-900 font-semibold font-poppins text-base mb-2">{title}</h3>
                    <p className="text-gray-400 text-sm font-poppins">{desc}</p>
                </div>
                <div className="mt-4 flex justify-between items-center">
                    <button className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200">
                        Explore more
                    </button>
                    <span className="text-primary font-semibold text-sm font-poppins">{category}</span>
                </div>
            </div>
        </div>
    )
}
