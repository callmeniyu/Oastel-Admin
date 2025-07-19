"use client"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { FiX, FiSave, FiRefreshCw, FiMapPin, FiClock } from "react-icons/fi"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import { toast } from "react-hot-toast"
import RichTextEditor from "@/components/RichTextEditor"
import TransferCardPreview from "@/components/TransferCardPreview"
import Confirmation from "@/components/ui/Confirmation"
import { transferApi, TransferType } from "@/lib/transferApi"

// Schema validation
const transferSchema = z
    .object({
        title: z.string().min(20, "Title must be at least 20 characters").max(100, "Title cannot exceed 100 characters"),
        slug: z
            .string()
            .regex(/^[a-z0-9-]*$/, "Slug can only contain lowercase letters, numbers and hyphens")
            .optional()
            .or(z.literal("")),
        image: z.string().min(1, "Please provide an image"),
        tags: z.array(z.string().min(1)).min(1, "At least one tag is required"),
        desc: z
            .string()
            .min(50, "Description must be at least 50 characters")
            .max(110, "Description cannot exceed 110 characters"),
        type: z.enum(["Van", "Van + Ferry", "Private"]),
        duration: z.string().min(1, "Duration is required"),
        status: z.enum(["active", "sold"]),
        bookedCount: z.number().min(0),
        oldPrice: z.number().min(0, "Old price must be 0 or greater"),
        newPrice: z.number().min(0, "New price must be 0 or greater"),
        childPrice: z.number().min(0, "Child price must be 0 or greater"),
        minimumPerson: z.number().min(1, "Minimum must be at least 1 person"),
        maximumPerson: z.number().min(1, "Maximum must be at least 1 person"),
        times: z.array(z.string()).min(1, "At least one departure time is required"),
        label: z.enum(["Recommended", "Popular", "Best Value", "None"]),
        from: z.string().min(3, "From location is required"),
        to: z.string().min(3, "To location is required"),
        details: z.object({
            about: z.string().min(100, "About section must be at least 100 characters"),
            itinerary: z.string().min(100, "Itinerary must be at least 100 characters"),
            pickupOption: z.enum(["admin", "user"]),
            pickupLocations: z.string().min(10, "Pickup locations must be at least 10 characters"),
            note: z.string().min(10, "Note must be at least 10 characters"),
            faq: z.array(
                z.object({
                    question: z.string().min(1, "Question is required"),
                    answer: z.string().min(1, "Answer is required"),
                })
            ),
        }),
    })
    .refine(
        (data) => {
            if (data.newPrice > data.oldPrice) {
                return false
            }
            return true
        },
        {
            message: "New price must be less than or equal to old price",
            path: ["newPrice"],
        }
    )
    .refine(
        (data) => {
            if (data.maximumPerson <= data.minimumPerson) {
                return false
            }
            return true
        },
        {
            message: "Maximum persons must be greater than minimum persons",
            path: ["maximumPerson"],
        }
    )

type TransferFormData = z.infer<typeof transferSchema>

export default function EditTransferPage() {
    const router = useRouter()
    const params = useParams()
    const transferId = params.id as string

    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showSaveConfirmation, setShowSaveConfirmation] = useState(false)
    const [transferData, setTransferData] = useState<TransferType | null>(null)

    const {
        register,
        handleSubmit,
        control,
        watch,
        setValue,
        reset,
        formState: { errors, isDirty },
    } = useForm<TransferFormData>({
        resolver: zodResolver(transferSchema),
    })

    const { fields, append, remove } = useFieldArray({
        control,
        name: "details.faq",
    })

    const watchTitle = watch("title")
    const watchDesc = watch("desc")
    const watchImage = watch("image")
    const watchDuration = watch("duration")
    const watchOldPrice = watch("oldPrice")
    const watchNewPrice = watch("newPrice")
    const watchLabel = watch("label")
    const watchFrom = watch("from")
    const watchTo = watch("to")
    const watchTags = watch("tags")
    const watchBookedCount = watch("bookedCount")
    const watchChildPrice = watch("childPrice")
    const watchType = watch("type")

    // Load transfer data
    useEffect(() => {
        const loadTransfer = async () => {
            try {
                setIsLoading(true)
                const response = await transferApi.getTransferById(transferId)
                const transfer = response.data

                setTransferData(transfer)

                // Convert the data to match form structure
                const formData: TransferFormData = {
                    title: transfer.title,
                    slug: transfer.slug,
                    image: transfer.image,
                    tags: transfer.tags || [],
                    desc: transfer.desc,
                    type: transfer.type,
                    duration: transfer.duration,
                    status: transfer.status,
                    bookedCount: transfer.bookedCount,
                    oldPrice: transfer.oldPrice,
                    newPrice: transfer.newPrice,
                    childPrice: transfer.childPrice,
                    minimumPerson: transfer.minimumPerson,
                    maximumPerson: transfer.maximumPerson || 10,
                    times: transfer.times,
                    label: (transfer.label || "None") as "Recommended" | "Popular" | "Best Value" | "None",
                    from: transfer.from,
                    to: transfer.to,
                    details: {
                        about: transfer.details?.about || "",
                        itinerary: transfer.details?.itinerary || "",
                        pickupOption: transfer.details?.pickupOption || "admin",
                        pickupLocations: transfer.details?.pickupLocations || "",
                        note: transfer.details?.note || "",
                        faq: transfer.details?.faq?.length > 0 ? transfer.details.faq : [{ question: "", answer: "" }],
                    },
                }

                reset(formData)
            } catch (error) {
                console.error("Error loading transfer:", error)
                toast.error("Failed to load transfer data")
                router.push("/transfers")
            } finally {
                setIsLoading(false)
            }
        }

        if (transferId) {
            loadTransfer()
        }
    }, [transferId, reset, router])

    const onSubmit = async (data: TransferFormData) => {
        setIsSubmitting(true)
        try {
            // Convert form data to API format
            const updateData = {
                ...data,
                label: data.label === "None" ? null : data.label,
                packageType: "transfer",
            }

            await transferApi.updateTransfer(transferId, updateData)
            toast.success("Transfer updated successfully!")
            router.push("/transfers")
        } catch (error) {
            console.error("Error updating transfer:", error)
            toast.error("Failed to update transfer")
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="text-gray-600">Loading transfer...</span>
                </div>
            </div>
        )
    }

    if (!transferData) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600">Transfer not found</p>
                    <button
                        onClick={() => router.push("/transfers")}
                        className="mt-4 px-4 py-2 bg-primary text-white rounded-lg"
                    >
                        Back to Transfers
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => router.back()}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                type="button"
                            >
                                <FiX size={20} />
                            </button>
                            <h1 className="text-xl font-semibold">Edit Transfer</h1>
                            {isDirty && <span className="text-orange-500 text-sm">• Unsaved changes</span>}
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => reset()}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors flex items-center gap-2"
                                disabled={!isDirty}
                            >
                                <FiRefreshCw size={16} />
                                Reset
                            </button>
                            <button
                                type="submit"
                                form="transfer-form"
                                disabled={isSubmitting || !isDirty}
                                className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                            >
                                <FiSave size={16} />
                                {isSubmitting ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Form Section */}
                    <div className="lg:col-span-2">
                        <form id="transfer-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            {/* Basic Information */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h2 className="text-xl font-semibold mb-6">Basic Information</h2>
                                <div className="space-y-6">
                                    {/* Title */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Transfer Title <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            {...register("title")}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                            placeholder="Enter transfer title (minimum 20 characters)"
                                        />
                                        {errors.title && (
                                            <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
                                        )}
                                    </div>

                                    {/* From and To */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                From <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <FiMapPin
                                                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                                    size={18}
                                                />
                                                <input
                                                    type="text"
                                                    {...register("from")}
                                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                                    placeholder="Departure location"
                                                />
                                            </div>
                                            {errors.from && (
                                                <p className="text-red-500 text-sm mt-1">{errors.from.message}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                To <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <FiMapPin
                                                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                                    size={18}
                                                />
                                                <input
                                                    type="text"
                                                    {...register("to")}
                                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                                    placeholder="Destination location"
                                                />
                                            </div>
                                            {errors.to && <p className="text-red-500 text-sm mt-1">{errors.to.message}</p>}
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Description <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            {...register("desc")}
                                            rows={3}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                            placeholder="Enter transfer description (50-110 characters)"
                                        />
                                        <div className="flex justify-between items-center mt-1">
                                            {errors.desc && <p className="text-red-500 text-sm">{errors.desc.message}</p>}
                                            <p className="text-gray-400 text-sm ml-auto">
                                                {watchDesc?.length || 0}/110 characters
                                            </p>
                                        </div>
                                    </div>

                                    {/* Type and Duration */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Transfer Type <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                {...register("type")}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                            >
                                                <option value="Van">Van</option>
                                                <option value="Van + Ferry">Van + Ferry</option>
                                                <option value="Private">Private</option>
                                            </select>
                                            {errors.type && (
                                                <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Duration <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <FiClock
                                                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                                    size={18}
                                                />
                                                <input
                                                    type="text"
                                                    {...register("duration")}
                                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                                    placeholder="e.g., 2 hours"
                                                />
                                            </div>
                                            {errors.duration && (
                                                <p className="text-red-500 text-sm mt-1">{errors.duration.message}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Additional sections can be added here */}
                        </form>
                    </div>

                    {/* Preview Section */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24">
                            <h3 className="text-lg font-semibold mb-4">Preview</h3>
                            <TransferCardPreview
                                title={watchTitle || "Transfer Title"}
                                image={watchImage || "/images/placeholder-transfer.jpg"}
                                tags={watchTags || []}
                                desc={watchDesc || "Transfer description"}
                                from={watchFrom || "Departure"}
                                to={watchTo || "Destination"}
                                duration={watchDuration || "Duration"}
                                type={watchType || "Van"}
                                bookedCount={watchBookedCount || 0}
                                oldPrice={watchOldPrice || 0}
                                newPrice={watchNewPrice || 0}
                                childPrice={watchChildPrice || 0}
                                label={watchLabel === "None" ? null : watchLabel}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Confirmation Dialog */}
            <Confirmation
                isOpen={showSaveConfirmation}
                onClose={() => setShowSaveConfirmation(false)}
                onConfirm={() => {
                    setShowSaveConfirmation(false)
                    handleSubmit(onSubmit)()
                }}
                title="Save Changes"
                message="Are you sure you want to save the changes to this transfer?"
                confirmText="Save"
                cancelText="Cancel"
            />
        </div>
    )
}
