"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FiPlus, FiX, FiClock, FiUsers, FiTag, FiDollarSign, FiUpload, FiImage, FiChevronDown } from "react-icons/fi"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, Controller, useFieldArray } from "react-hook-form"
import { toast } from "react-hot-toast"
import RichTextEditor from "@/components/RichTextEditor"
import TourCardPreview from "@/components/TourCardPreview"

// Schema validation
const tourSchema = z
    .object({
        title: z.string().min(20, "Title must be at least 20 characters").max(100, "Title cannot exceed 100 characters"),
        slug: z
            .string()
            .regex(/^[a-z0-9-]*$/, "Slug can only contain lowercase letters, numbers and hyphens")
            .optional()
            .or(z.literal("")),
        image: z.string().min(1, "Please provide an image"),
        tags: z.array(z.string().min(1)).min(1, "At least one tag is required"),
        description: z
            .string()
            .min(50, "Description must be at least 50 characters")
            .max(110, "Description cannot exceed 110 characters"),
        type: z.enum(["co-tour", "private"]),
        duration: z.string().min(1, "Duration is required"),
        bookedCount: z.number().min(0),
        oldPrice: z.number().min(0, "Old price must be 0 or greater"),
        newPrice: z.number().min(0, "New price must be 0 or greater"),
        childPrice: z.number().min(0, "Child price must be 0 or greater"),
        minimumPerson: z.number().min(1, "Minimum must be at least 1 person"),
        maximumPerson: z.number().min(1, "Maximum must be at least 1 person"),
        departureTimes: z.array(z.string()).min(1, "At least one departure time is required"),
        label: z.enum(["Recommended", "Popular", "Best Value", "None"]),
        details: z.object({
            about: z.string().min(100, "About section must be at least 100 characters"),
            itinerary: z.string().min(100, "Itinerary must be at least 100 characters"),
            pickupLocation: z.string().min(10, "Pickup location must be at least 10 characters"),
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

type TourFormData = z.infer<typeof tourSchema>

// Collapsible Section Component
interface CollapsibleSectionProps {
    title: string
    isExpanded: boolean
    onToggle: () => void
    children: React.ReactNode
    className?: string
}

const CollapsibleSection = ({ title, isExpanded, onToggle, children, className = "" }: CollapsibleSectionProps) => {
    return (
        <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
            <button
                type="button"
                onClick={onToggle}
                className="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:bg-gray-50"
            >
                <h2 className="text-xl font-semibold text-left">{title}</h2>
                <div className={`transform transition-transform duration-300 ${isExpanded ? "rotate-180" : "rotate-0"}`}>
                    <FiChevronDown className="text-gray-500" size={20} />
                </div>
            </button>
            <div
                className={`transition-all duration-300 ease-in-out ${
                    isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
                }`}
                style={{
                    overflow: isExpanded ? "visible" : "hidden",
                }}
            >
                <div className="px-6 pb-6 border-t border-gray-100">
                    <div className="pt-4">{children}</div>
                </div>
            </div>
        </div>
    )
}

export default function AddTourPage() {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [slugLoading, setSlugLoading] = useState(false)
    const [imagePreview, setImagePreview] = useState<string>("")
    const [uploadMethod, setUploadMethod] = useState<"upload" | "url">("upload")
    const [newTag, setNewTag] = useState("")

    // Section visibility states
    const [sectionsExpanded, setSectionsExpanded] = useState({
        basicInfo: true,
        pricing: false,
        departureTimes: false,
        tourDetails: false,
        faq: false,
    })

    const toggleSection = (section: keyof typeof sectionsExpanded) => {
        setSectionsExpanded((prev) => ({
            ...prev,
            [section]: !prev[section],
        }))
    }

    const defaultValues = {
        bookedCount: 0,
        type: "co-tour" as const,
        label: "None" as const,
        departureTimes: ["08:00"],
        oldPrice: 0,
        newPrice: 0,
        childPrice: 0,
        minimumPerson: 1,
        maximumPerson: 10,
        tags: [],
        details: {
            about: "",
            itinerary: "",
            pickupLocation: "",
            note: "",
            faq: [{ question: "", answer: "" }],
        },
    }

    const {
        register,
        handleSubmit,
        control,
        watch,
        setValue,
        getValues,
        reset,
        formState: { errors, isValid },
    } = useForm<TourFormData>({
        resolver: zodResolver(tourSchema),
        defaultValues,
    })

    const { fields, append, remove } = useFieldArray({
        control,
        name: "details.faq",
    })

    const watchTitle = watch("title")
    const watchType = watch("type")
    const watchDescription = watch("description")
    const watchImage = watch("image")
    const watchTags = watch("tags")
    const watchDuration = watch("duration")
    const watchBookedCount = watch("bookedCount")
    const watchOldPrice = watch("oldPrice")
    const watchNewPrice = watch("newPrice")
    const watchLabel = watch("label")
    const watchSlug = watch("slug")

    // Load draft on component mount
    useEffect(() => {
        const savedDraft = localStorage.getItem("tour-draft")
        if (savedDraft) {
            try {
                const draftData = JSON.parse(savedDraft)
                reset(draftData)
                toast.success("Draft loaded!")
            } catch (error) {
                console.error("Error loading draft:", error)
                localStorage.removeItem("tour-draft")
            }
        }
    }, [reset])

    // Handle adding tags
    const addTag = (field: any) => {
        if (newTag.trim() && !field.value?.includes(newTag.trim())) {
            field.onChange([...(field.value || []), newTag.trim()])
            setNewTag("")
        } else if (field.value?.includes(newTag.trim())) {
            toast.error("Tag already exists")
        }
    }

    // Handle image upload
    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                // 5MB limit
                toast.error("Image size should be less than 5MB")
                return
            }

            const reader = new FileReader()
            reader.onload = (e) => {
                const result = e.target?.result as string
                setImagePreview(result)
                setValue("image", result)
            }
            reader.readAsDataURL(file)
        }
    }

    // Auto-generate slug from title
    useEffect(() => {
        if (watchTitle && watchTitle.trim() !== "") {
            setSlugLoading(true)
            const timer = setTimeout(() => {
                const generatedSlug = watchTitle
                    .toLowerCase()
                    .trim()
                    .replace(/[^a-z0-9 -]/g, "")
                    .replace(/\s+/g, "-")
                    .replace(/-+/g, "-")
                    .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
                setValue("slug", generatedSlug)
                setSlugLoading(false)
            }, 500)

            return () => clearTimeout(timer)
        } else if (!watchTitle || watchTitle.trim() === "") {
            // Clear slug if title is empty
            setValue("slug", "")
            setSlugLoading(false)
        }
    }, [watchTitle, setValue])

    const onSubmit = async (data: TourFormData) => {
        setIsSubmitting(true)
        try {
            // Validate that at least one FAQ exists with content
            const validFaqs = data.details.faq.filter((faq) => faq.question.trim() && faq.answer.trim())
            if (validFaqs.length === 0) {
                toast.error("Please add at least one complete FAQ")
                return
            }

            // In a real app, you would call your API here
            console.log("Submitting tour:", { ...data, details: { ...data.details, faq: validFaqs } })
            await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate API call
            toast.success("Tour created successfully!")
            router.push("/tours")
        } catch (error) {
            console.error("Error creating tour:", error)
            toast.error("Failed to create tour. Please try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-16">
            <div className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Add New Tour</h1>
                    <button onClick={() => router.push("/tours")} className="text-gray-500 hover:text-gray-700">
                        <FiX className="text-2xl" />
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="max-w-7xl mx-auto px-4 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Basic Info */}
                    <div className="lg:col-span-2 space-y-6">
                        <CollapsibleSection
                            title="Basic Information"
                            isExpanded={sectionsExpanded.basicInfo}
                            onToggle={() => toggleSection("basicInfo")}
                        >
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tour Title *</label>
                                    <input
                                        {...register("title")}
                                        type="text"
                                        className={`w-full px-3 py-2 border rounded-md ${
                                            errors.title ? "border-red-500" : "border-gray-300"
                                        }`}
                                        placeholder="E.g., Full Day Land Rover Adventure in Cameron Highlands"
                                    />
                                    <div className="flex justify-between mt-1">
                                        <p className="text-xs text-red-500">{errors.title?.message}</p>
                                        <div className="flex justify-between w-full">
                                            <p className="text-xs text-gray-500">30-45 characters recommended</p>
                                            <p className="text-xs text-gray-500">{watchTitle?.length || 0}/100</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                                    <div className="relative">
                                        <input
                                            {...register("slug")}
                                            type="text"
                                            className={`w-full px-3 py-2 border rounded-md ${
                                                errors.slug ? "border-red-500" : "border-gray-300"
                                            } ${slugLoading ? "bg-gray-50" : ""}`}
                                            disabled={slugLoading}
                                            placeholder="Auto-generated from title"
                                        />
                                        {slugLoading && (
                                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-red-500 mt-1">{errors.slug?.message}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description*</label>
                                    <textarea
                                        {...register("description")}
                                        className={`w-full px-3 py-2 border rounded-md resize-none ${
                                            errors.description ? "border-red-500" : "border-gray-300"
                                        }`}
                                        rows={3}
                                        placeholder="Brief description of the tour (50-110 characters)"
                                    />
                                    <div className="flex justify-between mt-1">
                                        <p className="text-xs text-red-500">{errors.description?.message}</p>
                                        <p className="text-xs text-gray-500">{watch("description")?.length || 0}/110</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tour Image *</label>

                                    {/* Upload method selector */}
                                    <div className="flex gap-4 mb-3">
                                        <button
                                            type="button"
                                            onClick={() => setUploadMethod("upload")}
                                            className={`px-3 py-1 rounded text-sm ${
                                                uploadMethod === "upload"
                                                    ? "bg-primary text-white"
                                                    : "bg-gray-200 text-gray-700"
                                            }`}
                                        >
                                            Upload Image
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setUploadMethod("url")}
                                            className={`px-3 py-1 rounded text-sm ${
                                                uploadMethod === "url"
                                                    ? "bg-primary text-white"
                                                    : "bg-gray-200 text-gray-700"
                                            }`}
                                        >
                                            Image URL
                                        </button>
                                    </div>

                                    {uploadMethod === "upload" ? (
                                        <div>
                                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary transition-colors">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleImageUpload}
                                                    className="hidden"
                                                    id="image-upload"
                                                />
                                                <label
                                                    htmlFor="image-upload"
                                                    className="cursor-pointer flex flex-col items-center"
                                                >
                                                    <FiUpload className="text-3xl text-gray-400 mb-2" />
                                                    <span className="text-gray-600">Click to upload image</span>
                                                    <span className="text-xs text-gray-400 mt-1">
                                                        PNG, JPG, JPEG up to 5MB
                                                    </span>
                                                </label>
                                            </div>
                                            {imagePreview && (
                                                <div className="mt-3">
                                                    <img
                                                        src={imagePreview}
                                                        alt="Preview"
                                                        className="w-full h-32 object-cover rounded border"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <input
                                            {...register("image")}
                                            type="url"
                                            className={`w-full px-3 py-2 border rounded-md ${
                                                errors.image ? "border-red-500" : "border-gray-300"
                                            }`}
                                            placeholder="https://example.com/tour-image.jpg"
                                            onChange={(e) => {
                                                setValue("image", e.target.value)
                                                setImagePreview(e.target.value)
                                            }}
                                        />
                                    )}

                                    <p className="text-xs text-red-500 mt-1">{errors.image?.message}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tags *</label>
                                    <Controller
                                        name="tags"
                                        control={control}
                                        render={({ field }) => (
                                            <div>
                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    {field.value?.map((tag, index) => (
                                                        <div
                                                            key={index}
                                                            className="bg-primary/10 text-primary px-3 py-1 rounded-full flex items-center"
                                                        >
                                                            {tag}
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const newTags = [...field.value]
                                                                    newTags.splice(index, 1)
                                                                    field.onChange(newTags)
                                                                }}
                                                                className="ml-2 text-primary/70 hover:text-primary"
                                                            >
                                                                <FiX size={14} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={newTag}
                                                        onChange={(e) => setNewTag(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") {
                                                                e.preventDefault()
                                                                addTag(field)
                                                            }
                                                        }}
                                                        className="w-full md:flex-1 px-3 py-2 border border-gray-300 rounded-md"
                                                        placeholder="Eg: Co-Tour, Full-Day, Half-Day"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => addTag(field)}
                                                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark flex items-center gap-2"
                                                    >
                                                        <FiPlus size={16} />
                                                        Add
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    />
                                    <p className="text-xs text-red-500 mt-1">{errors.tags?.message}</p>
                                </div>
                            </div>
                        </CollapsibleSection>

                        {/* Pricing & Availability */}
                        <CollapsibleSection
                            title="Pricing & Availability"
                            isExpanded={sectionsExpanded.pricing}
                            onToggle={() => toggleSection("pricing")}
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tour Type *</label>
                                    <select
                                        {...register("type")}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    >
                                        <option value="co-tour">Co-Tour</option>
                                        <option value="private">Private</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Duration (hours) *
                                    </label>
                                    <div className="relative">
                                        <input
                                            {...register("duration")}
                                            type="text"
                                            className={`w-full px-3 py-2 border rounded-md ${
                                                errors.duration ? "border-red-500" : "border-gray-300"
                                            }`}
                                            placeholder="E.g. 4, 6-8"
                                        />
                                        <FiClock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    </div>
                                    <p className="text-xs text-red-500 mt-1">{errors.duration?.message}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Old Price (RM) *</label>
                                    <div className="relative">
                                        <input
                                            {...register("oldPrice", { valueAsNumber: true })}
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className={`w-full px-3 py-2 border rounded-md ${
                                                errors.oldPrice ? "border-red-500" : "border-gray-300"
                                            }`}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <p className="text-xs text-red-500 mt-1">{errors.oldPrice?.message}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Current Price (RM) *
                                    </label>
                                    <div className="relative">
                                        <input
                                            {...register("newPrice", { valueAsNumber: true })}
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className={`w-full px-3 py-2 border rounded-md ${
                                                errors.newPrice ? "border-red-500" : "border-gray-300"
                                            }`}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <p className="text-xs text-red-500 mt-1">{errors.newPrice?.message}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Child Price (RM) *
                                    </label>
                                    <div className="relative">
                                        <input
                                            {...register("childPrice", { valueAsNumber: true })}
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className={`w-full px-3 py-2 border rounded-md ${
                                                errors.childPrice ? "border-red-500" : "border-gray-300"
                                            }`}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <p className="text-xs text-red-500 mt-1">{errors.childPrice?.message}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                                    <select
                                        {...register("label")}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    >
                                        <option value="None">None</option>
                                        <option value="Recommended">Recommended</option>
                                        <option value="Popular">Popular</option>
                                        <option value="Best Value">Best Value</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Minimum Persons *
                                    </label>
                                    <div className="relative">
                                        <input
                                            {...register("minimumPerson", { valueAsNumber: true })}
                                            type="number"
                                            min="1"
                                            step="1"
                                            className={`w-full px-3 py-2 border rounded-md ${
                                                errors.minimumPerson ? "border-red-500" : "border-gray-300"
                                            }`}
                                            placeholder="1"
                                        />
                                        <FiUsers className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    </div>
                                    <p className="text-xs text-red-500 mt-1">{errors.minimumPerson?.message}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Maximum Persons *
                                    </label>
                                    <div className="relative">
                                        <input
                                            {...register("maximumPerson", { valueAsNumber: true })}
                                            type="number"
                                            min="1"
                                            step="1"
                                            className={`w-full px-3 py-2 border rounded-md ${
                                                errors.maximumPerson ? "border-red-500" : "border-gray-300"
                                            }`}
                                            placeholder="10"
                                        />
                                        <FiUsers className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    </div>
                                    <p className="text-xs text-red-500 mt-1">{errors.maximumPerson?.message}</p>
                                </div>

                                                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Booked Count *
                                    </label>
                                    <div className="relative">
                                        <input
                                            {...register("bookedCount", { valueAsNumber: true })}
                                            type="number"
                                            min="1"
                                            step="1"
                                            className={`w-full px-3 py-2 border rounded-md ${
                                                errors.bookedCount ? "border-red-500" : "border-gray-300"
                                            }`}
                                            placeholder="1"
                                        />
                                        <FiUsers className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    </div>
                                    <p className="text-xs text-red-500 mt-1">{errors.bookedCount?.message}</p>
                                </div>
                            </div>
                        </CollapsibleSection>

                        {/* Departure Times */}
                        <CollapsibleSection
                            title="Departure Times"
                            isExpanded={sectionsExpanded.departureTimes}
                            onToggle={() => toggleSection("departureTimes")}
                        >
                            <div>
                                <Controller
                                    name="departureTimes"
                                    control={control}
                                    render={({ field }) => (
                                        <div className="space-y-3">
                                            {field.value.map((time, index) => (
                                                <div key={index} className="flex items-center space-x-3">
                                                    <input
                                                        type="time"
                                                        value={time}
                                                        onChange={(e) => {
                                                            const newTimes = [...field.value]
                                                            newTimes[index] = e.target.value
                                                            field.onChange(newTimes)
                                                        }}
                                                        className="px-3 py-2 border border-gray-300 rounded-md"
                                                    />
                                                    {field.value.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newTimes = [...field.value]
                                                                newTimes.splice(index, 1)
                                                                field.onChange(newTimes)
                                                            }}
                                                            className="text-red-500 hover:text-red-700"
                                                        >
                                                            <FiX />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => field.onChange([...field.value, "08:00"])}
                                                className="text-primary hover:text-primary-dark flex items-center text-sm"
                                            >
                                                <FiPlus className="mr-1" /> Add another time
                                            </button>
                                        </div>
                                    )}
                                />
                                <p className="text-xs text-red-500 mt-1">{errors.departureTimes?.message}</p>
                            </div>
                        </CollapsibleSection>

                        {/* Tour Details */}
                        <CollapsibleSection
                            title="Tour Details"
                            isExpanded={sectionsExpanded.tourDetails}
                            onToggle={() => toggleSection("tourDetails")}
                        >
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        About This Tour *
                                    </label>
                                    <Controller
                                        name="details.about"
                                        control={control}
                                        render={({ field }) => (
                                            <RichTextEditor
                                                content={field.value || ""}
                                                onChange={field.onChange}
                                                placeholder="Describe what makes this tour special..."
                                                error={!!errors.details?.about}
                                            />
                                        )}
                                    />
                                    <p className="text-xs text-red-500 mt-1">{errors.details?.about?.message}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Itinerary *</label>
                                    <Controller
                                        name="details.itinerary"
                                        control={control}
                                        render={({ field }) => (
                                            <RichTextEditor
                                                content={field.value || ""}
                                                onChange={field.onChange}
                                                placeholder="Detail the tour schedule step by step..."
                                                error={!!errors.details?.itinerary}
                                            />
                                        )}
                                    />
                                    <p className="text-xs text-red-500 mt-1">{errors.details?.itinerary?.message}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Pickup Location *
                                    </label>
                                    <Controller
                                        name="details.pickupLocation"
                                        control={control}
                                        render={({ field }) => (
                                            <RichTextEditor
                                                content={field.value || ""}
                                                onChange={field.onChange}
                                                placeholder="Describe pickup locations, meeting points, or transportation details..."
                                                error={!!errors.details?.pickupLocation}
                                            />
                                        )}
                                    />
                                    <p className="text-xs text-red-500 mt-1">{errors.details?.pickupLocation?.message}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Important Notes *
                                    </label>
                                    <Controller
                                        name="details.note"
                                        control={control}
                                        render={({ field }) => (
                                            <RichTextEditor
                                                content={field.value || ""}
                                                onChange={field.onChange}
                                                placeholder="What to bring, restrictions, dress code, weather considerations, etc..."
                                                error={!!errors.details?.note}
                                            />
                                        )}
                                    />
                                    <p className="text-xs text-red-500 mt-1">{errors.details?.note?.message}</p>
                                </div>
                            </div>
                        </CollapsibleSection>

                        {/* FAQ Section */}
                        <CollapsibleSection
                            title="Frequently Asked Questions"
                            isExpanded={sectionsExpanded.faq}
                            onToggle={() => toggleSection("faq")}
                        >
                            <div className="space-y-4">
                                {fields.map((field, index) => (
                                    <div key={field.id} className="border border-gray-200 rounded-md p-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="font-medium">Question {index + 1}</h3>
                                            {fields.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => remove(index)}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <FiX />
                                                </button>
                                            )}
                                        </div>

                                        <div className="space-y-3">
                                            <div>
                                                <input
                                                    {...register(`details.faq.${index}.question`)}
                                                    type="text"
                                                    className={`w-full px-3 py-2 border rounded-md ${
                                                        errors.details?.faq?.[index]?.question
                                                            ? "border-red-500"
                                                            : "border-gray-300"
                                                    }`}
                                                    placeholder="Enter question"
                                                />
                                                <p className="text-xs text-red-500 mt-1">
                                                    {errors.details?.faq?.[index]?.question?.message}
                                                </p>
                                            </div>

                                            <div>
                                                <Controller
                                                    name={`details.faq.${index}.answer`}
                                                    control={control}
                                                    render={({ field }) => (
                                                        <RichTextEditor
                                                            content={field.value || ""}
                                                            onChange={field.onChange}
                                                            placeholder="Enter answer"
                                                            error={!!errors.details?.faq?.[index]?.answer}
                                                        />
                                                    )}
                                                />
                                                <p className="text-xs text-red-500 mt-1">
                                                    {errors.details?.faq?.[index]?.answer?.message}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    onClick={() => append({ question: "", answer: "" })}
                                    className="text-primary hover:text-primary-dark flex items-center text-sm"
                                >
                                    <FiPlus className="mr-1" /> Add another question
                                </button>
                            </div>
                        </CollapsibleSection>
                    </div>

                    {/* Right Column - Actions & Preview */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 top-6">
                            <h2 className="text-xl font-semibold mb-4">Actions</h2>

                            <div className="space-y-3">
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !isValid}
                                    className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Saving...
                                        </>
                                    ) : (
                                        "Save Tour"
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        if (confirm("Are you sure you want to clear all form data?")) {
                                            reset()
                                            localStorage.removeItem("tour-draft")
                                            toast.success("Form cleared!")
                                        }
                                    }}
                                    className="w-full border border-red-300 text-red-600 py-2 px-4 rounded-md hover:bg-red-50 transition-colors"
                                >
                                    Clear Form
                                </button>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <h2 className="text-xl font-semibold mb-4">Tour Preview</h2>
                            <div className="w-full max-w-sm mx-auto">
                                {watchTitle || watchImage ? (
                                    <TourCardPreview
                                        id={1}
                                        slug={watchSlug || "sample-tour"}
                                        image={watchImage || imagePreview || "/images/placeholder-tour.jpg"}
                                        title={watchTitle || "Sample Tour Title"}
                                        tags={watchTags && watchTags.length > 0 ? watchTags : ["Sample Tag"]}
                                        desc={watchDescription || "Sample tour description..."}
                                        duration={watchDuration || "4"}
                                        bookedCount={watchBookedCount || 0}
                                        oldPrice={watchOldPrice || 0}
                                        newPrice={watchNewPrice || 0}
                                        type={watchType || "co-tour"}
                                        label={watchLabel !== "None" ? watchLabel : null}
                                    />
                                ) : (
                                    <div className="border border-dashed border-gray-300 rounded-md p-8 text-center text-gray-500">
                                        <p>Fill in the form to see preview</p>
                                        <p className="text-sm mt-2">Start with title and image</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    )
}
