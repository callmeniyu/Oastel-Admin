"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import {
    FiPlus,
    FiX,
    FiClock,
    FiUsers,
    FiTag,
    FiDollarSign,
    FiUpload,
    FiImage,
    FiChevronDown,
    FiCheck,
    FiSave,
    FiRefreshCw,
} from "react-icons/fi"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, Controller, useFieldArray } from "react-hook-form"
import { toast } from "react-hot-toast"
import RichTextEditor from "@/components/RichTextEditor"
import TourCardPreview from "@/components/TourCardPreview"
import Confirmation from "@/components/ui/Confirmation"
import { tourApi } from "@/lib/tourApi"

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
        period: z.enum(["Half-Day", "Full-Day"]),
        status: z.enum(["active", "sold"]),
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

export default function EditTourPage() {
    const router = useRouter()
    const params = useParams()
    const tourId = params.id as string

    // Loading states
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [slugLoading, setSlugLoading] = useState(false)
    const [imagePreview, setImagePreview] = useState<string>("")
    const [uploadMethod, setUploadMethod] = useState<"upload" | "url">("upload")
    const [newTag, setNewTag] = useState("")
    const [showClearConfirmation, setShowClearConfirmation] = useState(false)
    const [showValidationErrors, setShowValidationErrors] = useState(false)

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
        period: "Half-Day" as const,
        status: "active" as const,
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
        trigger,
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

    // Auto-save draft key
    const DRAFT_KEY = "tour-draft"
    const autoSaveTimer = useRef<NodeJS.Timeout | null>(null)
    const [lastSavedData, setLastSavedData] = useState<string>("")
    const [richTextContentChanged, setRichTextContentChanged] = useState(false)

    // Enhanced auto-save functionality
    const saveToLocalStorage = (data: any) => {
        try {
            const dataString = JSON.stringify(data)
            localStorage.setItem(DRAFT_KEY, dataString)
            localStorage.setItem(`${DRAFT_KEY}-timestamp`, Date.now().toString())
            setLastSavedData(dataString)
            return true
        } catch (error) {
            console.error("Error saving draft:", error)
            return false
        }
    }

    const loadFromLocalStorage = () => {
        try {
            const savedData = localStorage.getItem(DRAFT_KEY)
            const timestamp = localStorage.getItem(`${DRAFT_KEY}-timestamp`)

            if (savedData && timestamp) {
                const parsedData = JSON.parse(savedData)
                const saveTime = new Date(parseInt(timestamp))
                return { data: parsedData, timestamp: saveTime }
            }
            return null
        } catch (error) {
            console.error("Error loading draft:", error)
            return null
        }
    }

    const clearDraftFromStorage = () => {
        try {
            localStorage.removeItem(DRAFT_KEY)
            localStorage.removeItem(`${DRAFT_KEY}-timestamp`)
            setLastSavedData("")
        } catch (error) {
            console.error("Error clearing draft:", error)
        }
    }

    // Load existing tour data
    useEffect(() => {
        const loadTourData = async () => {
            if (!tourId) return

            try {
                setIsLoading(true)
                const response = await tourApi.getTourById(tourId)
                const tourData = response.data

                // Reset form with existing tour data
                const formData = {
                    title: tourData.title || "",
                    slug: tourData.slug || "",
                    description: tourData.description || "",
                    image: tourData.image || "",
                    tags: tourData.tags || [],
                    type: tourData.type || "co-tour",
                    duration: tourData.duration || "",
                    period: tourData.period || "Half-Day",
                    status: tourData.status || "active",
                    bookedCount: tourData.bookedCount || 0,
                    oldPrice: tourData.oldPrice || 0,
                    newPrice: tourData.newPrice || 0,
                    childPrice: tourData.childPrice || 0,
                    minimumPerson: tourData.minimumPerson || 1,
                    maximumPerson: tourData.maximumPerson || 10,
                    departureTimes: tourData.departureTimes?.length > 0 ? tourData.departureTimes : ["08:00"],
                    label: (tourData.label as "Recommended" | "Popular" | "Best Value" | "None") || "None",
                    details: {
                        about: tourData.details?.about || "",
                        itinerary: tourData.details?.itinerary || "",
                        pickupLocation: tourData.details?.pickupLocation || "",
                        note: tourData.details?.note || "",
                        faq: tourData.details?.faq?.length > 0 ? tourData.details.faq : [{ question: "", answer: "" }],
                    },
                }

                reset(formData)

                // Set image preview if image exists
                if (tourData.image) {
                    setImagePreview(tourData.image)
                }

                toast.success("Tour data loaded successfully!")
            } catch (error) {
                console.error("Error loading tour data:", error)
                toast.error("Failed to load tour data")
                router.push("/tours")
            } finally {
                setIsLoading(false)
            }
        }

        loadTourData()
    }, [tourId, router, reset])

    // Enhanced auto-save functionality - watch all form values
    const formValues = watch()

    // Hide validation errors when user starts making changes
    useEffect(() => {
        if (showValidationErrors) {
            const timer = setTimeout(() => {
                setShowValidationErrors(false)
            }, 2000) // Hide errors after 2 seconds of making changes

            return () => clearTimeout(timer)
        }
    }, [formValues, showValidationErrors])

    useEffect(() => {
        // Clear existing timer
        if (autoSaveTimer.current) {
            clearTimeout(autoSaveTimer.current)
        }

        // Get current form values (this ensures we get the latest values including RichTextEditor content)
        const currentValues = getValues()

        // Check if there's meaningful data
        const hasData =
            currentValues.title ||
            currentValues.description ||
            currentValues.image ||
            (currentValues.tags && currentValues.tags.length > 0) ||
            currentValues.details?.about ||
            currentValues.details?.itinerary ||
            currentValues.details?.pickupLocation ||
            currentValues.details?.note ||
            (currentValues.details?.faq && currentValues.details.faq.some((faq) => faq.question || faq.answer))

        if (hasData) {
            const currentDataString = JSON.stringify(currentValues)

            // Only save if data has changed
            if (currentDataString !== lastSavedData) {
                const timer = setTimeout(() => {
                    if (saveToLocalStorage(currentValues)) {
                        // Show subtle auto-save indicator
                        const autoSaveIndicator = document.getElementById("auto-save-indicator")
                        if (autoSaveIndicator) {
                            autoSaveIndicator.textContent = `Auto-saved at ${new Date().toLocaleTimeString()}`
                            autoSaveIndicator.style.opacity = "1"
                            setTimeout(() => {
                                if (autoSaveIndicator) autoSaveIndicator.style.opacity = "0"
                            }, 2000)
                        }
                    }
                }, 1500) // Auto-save after 1.5 seconds of inactivity

                autoSaveTimer.current = timer
            }
        }

        // Cleanup timer on unmount
        return () => {
            if (autoSaveTimer.current) {
                clearTimeout(autoSaveTimer.current)
            }
        }
    }, [formValues, lastSavedData])

    // Save before page unload
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            const currentData = getValues()
            const hasData =
                currentData.title ||
                currentData.description ||
                currentData.image ||
                (currentData.tags && currentData.tags.length > 0) ||
                currentData.details?.about ||
                currentData.details?.itinerary ||
                currentData.details?.pickupLocation ||
                currentData.details?.note ||
                (currentData.details?.faq && currentData.details.faq.some((faq) => faq.question || faq.answer))

            if (hasData) {
                saveToLocalStorage(currentData)
                // Optional: warn user about unsaved changes
                e.preventDefault()
                e.returnValue = ""
            }
        }

        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden") {
                const currentData = getValues()
                saveToLocalStorage(currentData)
            }
        }

        window.addEventListener("beforeunload", handleBeforeUnload)
        document.addEventListener("visibilitychange", handleVisibilityChange)

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload)
            document.removeEventListener("visibilitychange", handleVisibilityChange)
        }
    }, [])

    // Manual save draft function
    const handleSaveDraft = () => {
        try {
            const currentData = getValues()
            console.log("Attempting to save draft...") // Debug log

            if (saveToLocalStorage(currentData)) {
                console.log("Draft saved successfully") // Debug log
                toast.success("Draft saved manually! 💾", {
                    duration: 3000,
                })
            } else {
                console.log("Failed to save draft") // Debug log
                toast.error("Failed to save draft! ❌", {
                    duration: 3000,
                })
            }
        } catch (error) {
            console.error("Error saving draft:", error)
            toast.error("Failed to save draft. Please try again. ❌", {
                duration: 3000,
            })
        }
    }

    // Clear draft function
    const handleClearDraft = () => {
        setShowClearConfirmation(true)
    }

    const confirmClearDraft = async () => {
        try {
            setShowClearConfirmation(false)

            // Reload the original tour data
            if (tourId) {
                setIsLoading(true)
                const response = await tourApi.getTourById(tourId)
                const tourData = response.data

                // Reset form with original tour data
                const formData = {
                    title: tourData.title || "",
                    slug: tourData.slug || "",
                    description: tourData.description || "",
                    image: tourData.image || "",
                    tags: tourData.tags || [],
                    type: tourData.type || "co-tour",
                    duration: tourData.duration || "",
                    period: tourData.period || "Half-Day",
                    status: tourData.status || "active",
                    bookedCount: tourData.bookedCount || 0,
                    oldPrice: tourData.oldPrice || 0,
                    newPrice: tourData.newPrice || 0,
                    childPrice: tourData.childPrice || 0,
                    minimumPerson: tourData.minimumPerson || 1,
                    maximumPerson: tourData.maximumPerson || 10,
                    departureTimes: tourData.departureTimes?.length > 0 ? tourData.departureTimes : ["08:00"],
                    label: (tourData.label as "Recommended" | "Popular" | "Best Value" | "None") || "None",
                    details: {
                        about: tourData.details?.about || "",
                        itinerary: tourData.details?.itinerary || "",
                        pickupLocation: tourData.details?.pickupLocation || "",
                        note: tourData.details?.note || "",
                        faq: tourData.details?.faq?.length > 0 ? tourData.details.faq : [{ question: "", answer: "" }],
                    },
                }

                reset(formData)

                // Reset states
                setImagePreview(tourData.image || "")
                setNewTag("")
                setUploadMethod("upload")
                setRichTextContentChanged((prev) => !prev)
                setIsLoading(false)

                toast.success("Form reset to original values! �", {
                    duration: 3000,
                })
            }
        } catch (error) {
            console.error("Error resetting form:", error)
            toast.error("Failed to reset form. Please try again. ❌", {
                duration: 3000,
            })
            setIsLoading(false)
        }
    }

    // Handle adding tags
    const addTag = (field: any) => {
        if (newTag.trim() && !field.value?.includes(newTag.trim())) {
            field.onChange([...(field.value || []), newTag.trim()])
            setNewTag("")
        } else if (field.value?.includes(newTag.trim())) {
            toast.error("Tag already exists ⚠️", {
                duration: 3000,
            })
        } else if (!newTag.trim()) {
            toast.error("Please enter a tag name ⚠️", {
                duration: 3000,
            })
        }
    }

    // Handle image upload
    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                // 5MB limit
                toast.error("Image size should be less than 5MB", {
                    duration: 4000,
                    icon: "⚠️",
                })
                return
            }

            // Show preview immediately using URL.createObjectURL
            const previewUrl = URL.createObjectURL(file)
            setImagePreview(previewUrl)

            try {
                toast.loading("Uploading image...", { id: "upload" })

                // Upload to server
                const formData = new FormData()
                formData.append("image", file)

                const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
                const response = await fetch(`${apiUrl}/api/upload/tour-image`, {
                    method: "POST",
                    body: formData,
                })

                if (!response.ok) {
                    const errorData = await response.json()
                    throw new Error(errorData.message || "Upload failed")
                }

                const result = await response.json()

                // Set the server image URL
                setValue("image", result.data.imageUrl)

                toast.success("Image uploaded successfully!", {
                    duration: 3000,
                    icon: "📸",
                    id: "upload",
                })

                // Clean up the preview URL
                URL.revokeObjectURL(previewUrl)
            } catch (error: any) {
                console.error("Image upload error:", error)
                toast.error(`Failed to upload image: ${error.message}`, {
                    duration: 4000,
                    icon: "❌",
                    id: "upload",
                })

                // Reset on error
                setImagePreview("")
                setValue("image", "")
                URL.revokeObjectURL(previewUrl)
            }
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

    // Handle save tour button click - validate first, then save if valid
    const handleSaveTour = async () => {
        // Force form validation
        const isFormValid = await trigger() // This will validate all fields

        if (!isFormValid || Object.keys(errors).length > 0) {
            // Show validation errors
            setShowValidationErrors(true)
            toast.error("Please fix all form errors before updating ⚠️", {
                duration: 4000,
            })
            return
        }

        // Additional custom validation
        const currentData = getValues()
        const validFaqs = currentData.details.faq.filter((faq) => faq.question.trim() && faq.answer.trim())
        if (validFaqs.length === 0) {
            setShowValidationErrors(true)
            toast.error("Please add at least one complete FAQ ⚠️", {
                duration: 4000,
            })
            return
        }

        // All validation passed, proceed with saving
        setShowValidationErrors(false)
        onSubmit(currentData)
    }

    const onSubmit = async (data: TourFormData) => {
        setIsSubmitting(true)
        try {
            // All validation already done in handleSaveTour
            const validFaqs = data.details.faq.filter((faq) => faq.question.trim() && faq.answer.trim())

            const tourData = {
                ...data,
                packageType: "tour", // Ensure packageType is always "tour"
                details: {
                    ...data.details,
                    faq: validFaqs,
                },
            }

            console.log("Updating tour...") // Debug log

            // Call the update API
            await tourApi.updateTour(tourId, tourData)

            // Clear draft after successful submission
            clearDraftFromStorage()
            console.log("Tour updated successfully") // Debug log
            toast.success("Tour updated successfully! 🎉", {
                duration: 4000,
            })
            router.push("/tours")
        } catch (error: any) {
            console.error("Error updating tour:", error)
            toast.error(`Failed to update tour: ${error.message || "Please try again."} ❌`, {
                duration: 4000,
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 pb-16">
                <div className="bg-white shadow-sm border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                        <h1 className="text-2xl font-bold">Edit Tour</h1>
                        <button onClick={() => router.push("/tours")} className="text-gray-500 hover:text-gray-700">
                            <FiX className="text-2xl" />
                        </button>
                    </div>
                </div>
                <div className="flex items-center justify-center min-h-[50vh]">
                    <div className="flex items-center gap-3">
                        <FiRefreshCw className="animate-spin text-primary text-xl" />
                        <span className="text-gray-600">Loading tour data...</span>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-16">
            <div className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Edit Tour</h1>
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Period *</label>
                                    <select
                                        {...register("period")}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    >
                                        <option value="Half-Day">Half-Day</option>
                                        <option value="Full-Day">Full-Day</option>
                                    </select>
                                    <p className="text-xs text-red-500 mt-1">{errors.period?.message}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                                    <select
                                        {...register("status")}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    >
                                        <option value="active">Active</option>
                                        <option value="sold">Sold Out</option>
                                    </select>
                                    <p className="text-xs text-red-500 mt-1">{errors.status?.message}</p>
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Booked Count *</label>
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
                                                onChange={(content) => {
                                                    field.onChange(content)
                                                    setRichTextContentChanged((prev) => !prev)
                                                }}
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
                                                onChange={(content) => {
                                                    field.onChange(content)
                                                    setRichTextContentChanged((prev) => !prev)
                                                }}
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
                                                onChange={(content) => {
                                                    field.onChange(content)
                                                    setRichTextContentChanged((prev) => !prev)
                                                }}
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
                                                onChange={(content) => {
                                                    field.onChange(content)
                                                    setRichTextContentChanged((prev) => !prev)
                                                }}
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
                                                            onChange={(content) => {
                                                                field.onChange(content)
                                                                setRichTextContentChanged((prev) => !prev)
                                                            }}
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

                            {/* Auto-save indicator */}
                            <div className="mb-4">
                                <p
                                    id="auto-save-indicator"
                                    className="text-xs text-gray-500 transition-opacity duration-300 opacity-0"
                                >
                                    Auto-saving...
                                </p>
                            </div>

                            {/* Form Validation Summary */}
                            {showValidationErrors && Object.keys(errors).length > 0 && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                                    <h3 className="text-sm font-medium text-red-800 mb-2 flex items-center">
                                        <FiX className="mr-1" size={16} />
                                        Please fix the following errors:
                                    </h3>
                                    <ul className="text-xs text-red-700 space-y-1 max-h-32 overflow-y-auto">
                                        {errors.title && <li>• {errors.title.message}</li>}
                                        {errors.slug && <li>• {errors.slug.message}</li>}
                                        {errors.description && <li>• {errors.description.message}</li>}
                                        {errors.image && <li>• {errors.image.message}</li>}
                                        {errors.tags && <li>• {errors.tags.message}</li>}
                                        {errors.duration && <li>• {errors.duration.message}</li>}
                                        {errors.oldPrice && <li>• Old price: {errors.oldPrice.message}</li>}
                                        {errors.newPrice && <li>• New price: {errors.newPrice.message}</li>}
                                        {errors.childPrice && <li>• Child price: {errors.childPrice.message}</li>}
                                        {errors.minimumPerson && <li>• Minimum persons: {errors.minimumPerson.message}</li>}
                                        {errors.maximumPerson && <li>• Maximum persons: {errors.maximumPerson.message}</li>}
                                        {errors.departureTimes && <li>• {errors.departureTimes.message}</li>}
                                        {errors.details?.about && <li>• About section: {errors.details.about.message}</li>}
                                        {errors.details?.itinerary && (
                                            <li>• Itinerary: {errors.details.itinerary.message}</li>
                                        )}
                                        {errors.details?.pickupLocation && (
                                            <li>• Pickup location: {errors.details.pickupLocation.message}</li>
                                        )}
                                        {errors.details?.note && <li>• Important notes: {errors.details.note.message}</li>}
                                        {errors.details?.faq &&
                                            Array.isArray(errors.details.faq) &&
                                            errors.details.faq.some((faq) => faq?.question || faq?.answer) && (
                                                <li>• FAQ: Please complete all question and answer pairs</li>
                                            )}
                                    </ul>
                                </div>
                            )}

                            {/* Form Status Indicator */}
                            {isValid && !showValidationErrors && (
                                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                                    <p className="text-sm text-green-800 flex items-center">
                                        <FiCheck className="mr-1" size={16} />
                                        Form is ready to submit!
                                    </p>
                                </div>
                            )}

                            <div className="space-y-3">
                                <button
                                    type="button"
                                    onClick={handleSaveTour}
                                    disabled={isSubmitting}
                                    className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                                    title="Update tour (will validate form first)"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <FiRefreshCw className="animate-spin mr-2" size={16} />
                                            Updating...
                                        </>
                                    ) : (
                                        <>
                                            <FiSave className="mr-2" size={16} />
                                            Update Tour
                                        </>
                                    )}
                                </button>

                                {/* Helper text */}
                                <p className="text-xs text-gray-500 text-center">Click to validate and update tour</p>

                                <button
                                    type="button"
                                    onClick={handleSaveDraft}
                                    className="w-full border border-blue-300 text-blue-600 py-2 px-4 rounded-md hover:bg-blue-50 transition-colors"
                                >
                                    Save Draft
                                </button>

                                <button
                                    type="button"
                                    onClick={handleClearDraft}
                                    className="w-full border border-red-300 text-red-600 py-2 px-4 rounded-md hover:bg-red-50 transition-colors"
                                >
                                    Reset to Original
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

            {/* Clear Form Confirmation Modal */}
            <Confirmation
                isOpen={showClearConfirmation}
                onClose={() => setShowClearConfirmation(false)}
                onConfirm={confirmClearDraft}
                title="Reset Form"
                message="Are you sure you want to reset the form to original values? All unsaved changes will be lost."
                confirmText="Reset"
                cancelText="Cancel"
                variant="danger"
            />
        </div>
    )
}
