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
    FiEdit3,
    FiChevronDown,
    FiChevronUp,
    FiTrash2,
    FiSave,
    FiRefreshCw,
} from "react-icons/fi"
import { BsInfoCircleFill, BsQuestionCircleFill } from "react-icons/bs"
import { MdOutlineCancel } from "react-icons/md"
import AdminHeader from "@/components/admin/AdminHeader"
import MobileNav from "@/components/admin/MobileNav"
import RichTextEditor from "@/components/RichTextEditor"
import Confirmation from "@/components/ui/Confirmation"
import { tourApi } from "@/lib/tourApi"
import { toast } from "react-hot-toast"

// Types
interface TourFormData {
    title: string
    slug: string
    description: string
    tags: string[]
    type: "co-tour" | "private"
    duration: string
    period: "Half-Day" | "Full-Day"
    bookedCount: number
    oldPrice: number
    newPrice: number
    childPrice: number
    minimumPerson: number
    maximumPerson: number
    departureTimes: string[]
    label: "Recommended" | "Popular" | "Best Value" | null
    image: string
    details: {
        about: string
        itinerary: string
        pickupLocation: string
        note: string
        faq: Array<{
            question: string
            answer: string
        }>
    }
}

interface FAQ {
    question: string
    answer: string
}

// Collapsible section component
const CollapsibleSection = ({
    title,
    icon,
    isExpanded,
    onToggle,
    children,
}: {
    title: string
    icon: React.ReactNode
    isExpanded: boolean
    onToggle: () => void
    children: React.ReactNode
}) => (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
            type="button"
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            onClick={onToggle}
        >
            <div className="flex items-center gap-3">
                {icon}
                <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
            </div>
            {isExpanded ? <FiChevronUp className="text-gray-600" /> : <FiChevronDown className="text-gray-600" />}
        </button>
        {isExpanded && <div className="p-4 bg-white border-t border-gray-200">{children}</div>}
    </div>
)

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

    // Expandable sections state
    const [sectionsExpanded, setSectionsExpanded] = useState({
        basic: true,
        pricing: true,
        details: true,
        media: true,
        availability: true,
        seo: true,
    })

    // Form data state
    const [formData, setFormData] = useState<TourFormData>({
        title: "",
        slug: "",
        description: "",
        tags: [],
        type: "co-tour",
        duration: "",
        period: "Half-Day",
        bookedCount: 0,
        oldPrice: 0,
        newPrice: 0,
        childPrice: 0,
        minimumPerson: 1,
        maximumPerson: 10,
        departureTimes: [""],
        label: null,
        image: "",
        details: {
            about: "",
            itinerary: "",
            pickupLocation: "",
            note: "",
            faq: [{ question: "", answer: "" }],
        },
    })

    // Auto-save functionality
    const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null)
    const [lastSavedData, setLastSavedData] = useState<string>("")
    const [richTextContentChanged, setRichTextContentChanged] = useState(false)

    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Load existing tour data
    useEffect(() => {
        const loadTourData = async () => {
            try {
                setIsLoading(true)
                const response = await tourApi.getTourById(tourId)
                const tourData = response.data

                // Populate form with existing data
                setFormData({
                    title: tourData.title || "",
                    slug: tourData.slug || "",
                    description: tourData.description || "",
                    tags: tourData.tags || [],
                    type: tourData.type || "co-tour",
                    duration: tourData.duration || "",
                    period: tourData.period || "Half-Day",
                    bookedCount: tourData.bookedCount || 0,
                    oldPrice: tourData.oldPrice || 0,
                    newPrice: tourData.newPrice || 0,
                    childPrice: tourData.childPrice || 0,
                    minimumPerson: tourData.minimumPerson || 1,
                    maximumPerson: tourData.maximumPerson || 10,
                    departureTimes: tourData.departureTimes?.length > 0 ? tourData.departureTimes : [""],
                    label: tourData.label || null,
                    image: tourData.image || "",
                    details: {
                        about: tourData.details?.about || "",
                        itinerary: tourData.details?.itinerary || "",
                        pickupLocation: tourData.details?.pickupLocation || "",
                        note: tourData.details?.note || "",
                        faq: tourData.details?.faq?.length > 0 ? tourData.details.faq : [{ question: "", answer: "" }],
                    },
                })

                // Set image preview if image exists
                if (tourData.image) {
                    setImagePreview(tourData.image)
                }

                toast.success("Tour data loaded successfully")
            } catch (error) {
                console.error("Error loading tour data:", error)
                toast.error("Failed to load tour data")
                router.push("/tours")
            } finally {
                setIsLoading(false)
            }
        }

        if (tourId) {
            loadTourData()
        }
    }, [tourId, router])

    // Auto-save functionality
    useEffect(() => {
        if (autoSaveTimer) {
            clearTimeout(autoSaveTimer)
        }

        const currentData = JSON.stringify(formData)
        if (currentData !== lastSavedData && lastSavedData !== "") {
            const timer = setTimeout(() => {
                console.log("Auto-saving...")
                setLastSavedData(currentData)
            }, 3000)

            setAutoSaveTimer(timer)
        }

        return () => {
            if (autoSaveTimer) {
                clearTimeout(autoSaveTimer)
            }
        }
    }, [formData, lastSavedData, autoSaveTimer])

    // Generate slug from title
    const generateSlug = (title: string) => {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .trim()
    }

    // Handle form input changes
    const handleInputChange = (field: string, value: any) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }))

        // Auto-generate slug when title changes
        if (field === "title" && typeof value === "string") {
            const newSlug = generateSlug(value)
            setFormData((prev) => ({
                ...prev,
                slug: newSlug,
            }))
        }
    }

    // Handle nested field changes (for details object)
    const handleDetailsChange = (field: string, value: any) => {
        setFormData((prev) => ({
            ...prev,
            details: {
                ...prev.details,
                [field]: value,
            },
        }))
    }

    // Handle FAQ changes
    const handleFAQChange = (index: number, field: "question" | "answer", value: string) => {
        setFormData((prev) => ({
            ...prev,
            details: {
                ...prev.details,
                faq: prev.details.faq.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
            },
        }))
    }

    // Add new FAQ
    const addFAQ = () => {
        setFormData((prev) => ({
            ...prev,
            details: {
                ...prev.details,
                faq: [...prev.details.faq, { question: "", answer: "" }],
            },
        }))
    }

    // Remove FAQ
    const removeFAQ = (index: number) => {
        if (formData.details.faq.length > 1) {
            setFormData((prev) => ({
                ...prev,
                details: {
                    ...prev.details,
                    faq: prev.details.faq.filter((_, i) => i !== index),
                },
            }))
        }
    }

    // Handle tag addition
    const addTag = () => {
        if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
            setFormData((prev) => ({
                ...prev,
                tags: [...prev.tags, newTag.trim()],
            }))
            setNewTag("")
        }
    }

    // Remove tag
    const removeTag = (tagToRemove: string) => {
        setFormData((prev) => ({
            ...prev,
            tags: prev.tags.filter((tag) => tag !== tagToRemove),
        }))
    }

    // Handle departure time changes
    const handleDepartureTimeChange = (index: number, value: string) => {
        setFormData((prev) => ({
            ...prev,
            departureTimes: prev.departureTimes.map((time, i) => (i === index ? value : time)),
        }))
    }

    // Add departure time
    const addDepartureTime = () => {
        setFormData((prev) => ({
            ...prev,
            departureTimes: [...prev.departureTimes, ""],
        }))
    }

    // Remove departure time
    const removeDepartureTime = (index: number) => {
        if (formData.departureTimes.length > 1) {
            setFormData((prev) => ({
                ...prev,
                departureTimes: prev.departureTimes.filter((_, i) => i !== index),
            }))
        }
    }

    // Handle image upload
    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file) {
            // Validate file type
            if (!file.type.startsWith("image/")) {
                toast.error("Please select a valid image file")
                return
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast.error("Image size should be less than 5MB")
                return
            }

            const reader = new FileReader()
            reader.onload = (e) => {
                const result = e.target?.result as string
                setImagePreview(result)
                setFormData((prev) => ({ ...prev, image: result }))
            }
            reader.readAsDataURL(file)
        }
    }

    // Handle image URL
    const handleImageUrl = (url: string) => {
        setImagePreview(url)
        setFormData((prev) => ({ ...prev, image: url }))
    }

    // Form validation
    const validateForm = () => {
        const errors: string[] = []

        if (!formData.title.trim()) errors.push("Title is required")
        if (!formData.slug.trim()) errors.push("Slug is required")
        if (!formData.description.trim()) errors.push("Description is required")
        if (!formData.duration) errors.push("Duration is required")
        if (!formData.newPrice || formData.newPrice <= 0) errors.push("New price must be greater than 0")
        if (!formData.image.trim()) errors.push("Image is required")
        if (!formData.details.about.trim()) errors.push("About section is required")
        if (!formData.details.itinerary.trim()) errors.push("Itinerary is required")
        if (!formData.details.pickupLocation.trim()) errors.push("Pickup location is required")

        return errors
    }

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const validationErrors = validateForm()
        if (validationErrors.length > 0) {
            setShowValidationErrors(true)
            validationErrors.forEach((error) => toast.error(error))
            return
        }

        setIsSubmitting(true)

        try {
            // Clean up the data before sending
            const submitData = {
                ...formData,
                departureTimes: formData.departureTimes.filter((time) => time.trim() !== ""),
                details: {
                    ...formData.details,
                    faq: formData.details.faq.filter((item) => item.question.trim() && item.answer.trim()),
                },
            }

            await tourApi.updateTour(tourId, submitData)
            toast.success("Tour updated successfully! 🎉")
            router.push("/tours")
        } catch (error: any) {
            console.error("Error updating tour:", error)
            toast.error(error.message || "Failed to update tour. Please try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    // Toggle section expansion
    const toggleSection = (section: keyof typeof sectionsExpanded) => {
        setSectionsExpanded((prev) => ({
            ...prev,
            [section]: !prev[section],
        }))
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <AdminHeader />
                <div className="flex items-center justify-center min-h-[50vh]">
                    <div className="flex items-center gap-3">
                        <FiRefreshCw className="animate-spin text-primary text-xl" />
                        <span className="text-gray-600">Loading tour data...</span>
                    </div>
                </div>
                <MobileNav />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <AdminHeader />

            <main className="max-w-4xl mx-auto p-4 pb-20">
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <button onClick={() => router.push("/tours")} className="text-gray-500 hover:text-gray-700">
                                <FiX className="w-6 h-6" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800">Edit Tour</h1>
                                <p className="text-gray-600">Update tour information and details</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowClearConfirmation(true)}
                                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                            >
                                <FiRefreshCw className="w-4 h-4" />
                                Reset Form
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Basic Information */}
                        <CollapsibleSection
                            title="Basic Information"
                            icon={<BsInfoCircleFill className="text-gray-500" />}
                            isExpanded={sectionsExpanded.basic}
                            onToggle={() => toggleSection("basic")}
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Title */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Tour Title *</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => handleInputChange("title", e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="e.g., Cameron Highlands Tea Plantation Tour"
                                        required
                                    />
                                </div>

                                {/* Slug */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">URL Slug *</label>
                                    <input
                                        type="text"
                                        value={formData.slug}
                                        onChange={(e) => handleInputChange("slug", e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="cameron-highlands-tea-plantation-tour"
                                        required
                                    />
                                </div>

                                {/* Type */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Tour Type *</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => handleInputChange("type", e.target.value as "co-tour" | "private")}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        required
                                    >
                                        <option value="co-tour">Co-Tour (Group)</option>
                                        <option value="private">Private Tour</option>
                                    </select>
                                </div>

                                {/* Period */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Tour Period *</label>
                                    <select
                                        value={formData.period}
                                        onChange={(e) =>
                                            handleInputChange("period", e.target.value as "Half-Day" | "Full-Day")
                                        }
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        required
                                    >
                                        <option value="Half-Day">Half-Day</option>
                                        <option value="Full-Day">Full-Day</option>
                                    </select>
                                </div>

                                {/* Duration */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Duration (hours) *
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.duration}
                                        onChange={(e) => handleInputChange("duration", e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="8"
                                        min="1"
                                        max="24"
                                        required
                                    />
                                </div>

                                {/* Label */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Tour Label</label>
                                    <select
                                        value={formData.label || ""}
                                        onChange={(e) => handleInputChange("label", e.target.value || null)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                    >
                                        <option value="">No Label</option>
                                        <option value="Recommended">Recommended</option>
                                        <option value="Popular">Popular</option>
                                        <option value="Best Value">Best Value</option>
                                    </select>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="mt-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Short Description *</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => handleInputChange("description", e.target.value)}
                                    rows={3}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="Brief description of the tour..."
                                    required
                                />
                            </div>

                            {/* Tags */}
                            <div className="mt-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {formData.tags.map((tag, index) => (
                                        <span
                                            key={index}
                                            className="inline-flex items-center gap-1 px-3 py-1 bg-primary bg-opacity-10 text-primary rounded-full text-sm"
                                        >
                                            {tag}
                                            <button
                                                type="button"
                                                onClick={() => removeTag(tag)}
                                                className="text-primary hover:text-red-500"
                                            >
                                                <FiX className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newTag}
                                        onChange={(e) => setNewTag(e.target.value)}
                                        onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                                        className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="Add a tag..."
                                    />
                                    <button
                                        type="button"
                                        onClick={addTag}
                                        className="px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                                    >
                                        <FiPlus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </CollapsibleSection>

                        {/* Pricing & Availability */}
                        <CollapsibleSection
                            title="Pricing & Availability"
                            icon={<FiDollarSign className="text-gray-500" />}
                            isExpanded={sectionsExpanded.pricing}
                            onToggle={() => toggleSection("pricing")}
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Old Price */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Original Price (RM)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.oldPrice}
                                        onChange={(e) => handleInputChange("oldPrice", parseFloat(e.target.value) || 0)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="150"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>

                                {/* New Price */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Current Price (RM) *
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.newPrice}
                                        onChange={(e) => handleInputChange("newPrice", parseFloat(e.target.value) || 0)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="120"
                                        min="0"
                                        step="0.01"
                                        required
                                    />
                                </div>

                                {/* Child Price */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Child Price (RM)</label>
                                    <input
                                        type="number"
                                        value={formData.childPrice}
                                        onChange={(e) => handleInputChange("childPrice", parseFloat(e.target.value) || 0)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="80"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>

                                {/* Minimum Person */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Minimum Persons *
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.minimumPerson}
                                        onChange={(e) => handleInputChange("minimumPerson", parseInt(e.target.value) || 1)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="1"
                                        min="1"
                                        required
                                    />
                                </div>

                                {/* Maximum Person */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Persons</label>
                                    <input
                                        type="number"
                                        value={formData.maximumPerson}
                                        onChange={(e) => handleInputChange("maximumPerson", parseInt(e.target.value) || 10)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="10"
                                        min="1"
                                    />
                                </div>

                                {/* Booked Count */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Booked Count</label>
                                    <input
                                        type="number"
                                        value={formData.bookedCount}
                                        onChange={(e) => handleInputChange("bookedCount", parseInt(e.target.value) || 0)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="45"
                                        min="0"
                                    />
                                </div>
                            </div>

                            {/* Departure Times */}
                            <div className="mt-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Departure Times</label>
                                <div className="space-y-3">
                                    {formData.departureTimes.map((time, index) => (
                                        <div key={index} className="flex gap-2">
                                            <input
                                                type="time"
                                                value={time}
                                                onChange={(e) => handleDepartureTimeChange(index, e.target.value)}
                                                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeDepartureTime(index)}
                                                className="px-3 py-3 text-red-500 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                                                disabled={formData.departureTimes.length === 1}
                                            >
                                                <FiTrash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={addDepartureTime}
                                    className="mt-3 px-4 py-2 text-primary border border-primary rounded-lg hover:bg-primary hover:text-white transition-colors flex items-center gap-2"
                                >
                                    <FiPlus className="w-4 h-4" />
                                    Add Departure Time
                                </button>
                            </div>
                        </CollapsibleSection>

                        {/* Submit Button */}
                        <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={() => router.push("/tours")}
                                className="px-6 py-3 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <FiRefreshCw className="w-4 h-4 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        <FiSave className="w-4 h-4" />
                                        Update Tour
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </main>

            {/* Clear Confirmation Modal */}
            <Confirmation
                isOpen={showClearConfirmation}
                onClose={() => setShowClearConfirmation(false)}
                onConfirm={() => {
                    setFormData({
                        title: "",
                        slug: "",
                        description: "",
                        tags: [],
                        type: "co-tour",
                        duration: "",
                        period: "Half-Day",
                        bookedCount: 0,
                        oldPrice: 0,
                        newPrice: 0,
                        childPrice: 0,
                        minimumPerson: 1,
                        maximumPerson: 10,
                        departureTimes: [""],
                        label: null,
                        image: "",
                        details: {
                            about: "",
                            itinerary: "",
                            pickupLocation: "",
                            note: "",
                            faq: [{ question: "", answer: "" }],
                        },
                    })
                    setImagePreview("")
                    setShowClearConfirmation(false)
                    toast.success("Form reset successfully")
                }}
                title="Reset Form"
                message="Are you sure you want to reset the form? All changes will be lost."
                confirmText="Reset"
                cancelText="Cancel"
                variant="danger"
            />

            <MobileNav />
        </div>
    )
}
