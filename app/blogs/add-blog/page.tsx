"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FiPlus, FiX, FiUpload, FiImage, FiChevronDown, FiCheck, FiCalendar, FiEye, FiType, FiEdit3 } from "react-icons/fi"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, Controller } from "react-hook-form"
import { toast } from "react-hot-toast"
import RichTextEditor from "@/components/RichTextEditor"
import BlogCardPreview from "@/components/BlogCardPreview"
import Confirmation from "@/components/ui/Confirmation"
import { generateSlug, debounce } from "@/lib/utils"
import { blogApi } from "@/lib/blogApi"

// Schema validation
const blogSchema = z.object({
    title: z.string().min(10, "Title must be at least 10 characters").max(100, "Title cannot exceed 100 characters"),
    slug: z
        .string()
        .regex(/^[a-z0-9-]*$/, "Slug can only contain lowercase letters, numbers and hyphens")
        .optional()
        .or(z.literal("")),
    description: z
        .string()
        .min(30, "Description must be at least 30 characters")
        .max(200, "Description cannot exceed 200 characters"),
    category: z.enum(["Travel Tips", "Local Culture", "Food & Cuisine", "Adventure & Nature", "Stay", "Transportation"]),
    views: z.number().min(0, "Views must be 0 or greater"),
    publishDate: z.string().min(1, "Publish date is required"),
    image: z.string().min(1, "Please provide an image"),
    content: z.string().min(100, "Content must be at least 100 characters"),
})

type BlogFormData = z.infer<typeof blogSchema>

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

export default function AddBlogPage() {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [slugLoading, setSlugLoading] = useState(false)
    const [imagePreview, setImagePreview] = useState<string>("")
    const [imageUploading, setImageUploading] = useState(false)
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("")
    const [showClearConfirmation, setShowClearConfirmation] = useState(false)
    const [showValidationErrors, setShowValidationErrors] = useState(false)

    // Section visibility states
    const [sectionsExpanded, setSectionsExpanded] = useState({
        basicInfo: true,
        content: true,
    })

    const toggleSection = (section: keyof typeof sectionsExpanded) => {
        setSectionsExpanded((prev) => ({
            ...prev,
            [section]: !prev[section],
        }))
    }

    // Get current date for default publish date
    const getCurrentDate = () => {
        const today = new Date()
        return today.toISOString().split("T")[0]
    }

    const defaultValues = {
        views: 0,
        publishDate: getCurrentDate(),
        category: "Travel Tips" as const,
        content: "",
    }

    const {
        register,
        handleSubmit,
        control,
        watch,
        setValue,
        formState: { errors, isValid },
        reset,
        trigger,
        clearErrors,
    } = useForm<BlogFormData>({
        resolver: zodResolver(blogSchema),
        defaultValues,
        mode: "onChange",
    })

    // Watch form values for preview and slug generation
    const watchedValues = watch()
    const watchTitle = watch("title")
    const watchSlug = watch("slug")

    // Auto-generate slug when title changes
    const debouncedSlugGeneration = debounce(async (title: string) => {
        if (!title || watchSlug) return

        setSlugLoading(true)
        try {
            const generatedSlug = generateSlug(title)
            setValue("slug", generatedSlug)
            clearErrors("slug")
        } catch (error) {
            console.error("Error generating slug:", error)
        } finally {
            setSlugLoading(false)
        }
    }, 500)

    useEffect(() => {
        if (watchTitle && !watchSlug) {
            debouncedSlugGeneration(watchTitle)
        }
    }, [watchTitle, watchSlug, debouncedSlugGeneration])

    // Handle image upload
    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        try {
            setImageUploading(true)

            // Create preview URL for immediate display
            const previewUrl = URL.createObjectURL(file)
            setImagePreview(previewUrl)

            // Upload to Cloudinary
            const response = await blogApi.uploadImage(file)

            if (response.success) {
                const cloudinaryUrl = response.data.imageUrl
                setUploadedImageUrl(cloudinaryUrl)
                setValue("image", cloudinaryUrl)
                clearErrors("image")
                toast.success("Image uploaded successfully!")
            } else {
                throw new Error("Failed to upload image")
            }
        } catch (error: any) {
            console.error("Error uploading image:", error)
            toast.error(error.message || "Failed to upload image")
            // Clear preview on error
            setImagePreview("")
            setUploadedImageUrl("")
        } finally {
            setImageUploading(false)
        }
    }

    // Handle form submission
    const onSubmit = async (data: BlogFormData) => {
        try {
            // Check if image is uploaded to Cloudinary
            if (!uploadedImageUrl) {
                toast.error("Please wait for the image to finish uploading")
                return
            }

            setIsSubmitting(true)

            // Prepare the blog data for the API
            const blogData = {
                title: data.title,
                slug: data.slug || generateSlug(data.title), // Ensure slug is always a string
                image: uploadedImageUrl, // Use Cloudinary URL
                description: data.description,
                category: data.category,
                views: data.views,
                publishDate: data.publishDate,
                content: data.content,
            }

            console.log("Creating blog with data:", blogData)

            // Call the API to create the blog
            const response = await blogApi.createBlog(blogData)

            if (response.success) {
                toast.success("Blog created successfully!")
                router.push("/blogs")
            } else {
                throw new Error(response.message || "Failed to create blog")
            }
        } catch (error: any) {
            console.error("Error creating blog:", error)
            toast.error(error.message || "Failed to create blog. Please try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    // Handle form clear
    const handleClearForm = () => {
        reset(defaultValues)
        setImagePreview("")
        setUploadedImageUrl("")
        setShowClearConfirmation(false)
        toast.success("Form cleared successfully!")
    }

    // Show validation errors
    const handleShowErrors = () => {
        trigger()
        setShowValidationErrors(true)
        setTimeout(() => setShowValidationErrors(false), 5000)
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Add New Blog</h1>
                            <p className="text-gray-600 mt-2">Create and publish a new blog post</p>
                        </div>
                        <div className="flex space-x-4">
                            <button
                                type="button"
                                onClick={() => setShowClearConfirmation(true)}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 flex items-center space-x-2"
                            >
                                <FiX size={16} />
                                <span>Clear Form</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleShowErrors}
                                className="px-4 py-2 bg-green-100/50 text-primary rounded-lg transition-colors duration-200 flex items-center space-x-2"
                            >
                                <FiCheck size={16} />
                                <span>Validate</span>
                            </button>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column - Form Fields */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Basic Information Section */}
                            <CollapsibleSection
                                title="Basic Information"
                                isExpanded={sectionsExpanded.basicInfo}
                                onToggle={() => toggleSection("basicInfo")}
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Title */}
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <FiType className="inline mr-2" />
                                            Blog Title *
                                        </label>
                                        <input
                                            {...register("title")}
                                            type="text"
                                            placeholder="Enter blog title..."
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        />
                                        {errors.title && (
                                            <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                                        )}
                                        <p className="mt-1 text-xs text-gray-500">
                                            {watchTitle?.length || 0}/100 characters
                                        </p>
                                    </div>

                                    {/* Auto-generated Slug */}
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Slug (Auto-generated)
                                        </label>
                                        <div className="relative">
                                            <input
                                                {...register("slug")}
                                                type="text"
                                                placeholder="Auto-generated from title"
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-gray-50"
                                                readOnly
                                            />
                                            {slugLoading && (
                                                <div className="absolute right-3 top-3">
                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 "></div>
                                                </div>
                                            )}
                                        </div>
                                        {errors.slug && <p className="mt-1 text-sm text-red-600">{errors.slug.message}</p>}
                                    </div>

                                    {/* Description */}
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Description *
                                        </label>
                                        <textarea
                                            {...register("description")}
                                            rows={3}
                                            placeholder="Brief description of the blog post..."
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                                        />
                                        {errors.description && (
                                            <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                                        )}
                                        <p className="mt-1 text-xs text-gray-500">
                                            {watchedValues.description?.length || 0}/200 characters
                                        </p>
                                    </div>

                                    {/* Category */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                                        <select
                                            {...register("category")}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        >
                                            <option value="Travel Tips">Travel Tips</option>
                                            <option value="Local Culture">Local Culture</option>
                                            <option value="Food & Cuisine">Food & Cuisine</option>
                                            <option value="Adventure & Nature">Adventure & Nature</option>
                                            <option value="Stay">Stay</option>
                                            <option value="Transportation">Transportation</option>
                                        </select>
                                        {errors.category && (
                                            <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
                                        )}
                                    </div>

                                    {/* Views */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <FiEye className="inline mr-2" />
                                            Views
                                        </label>
                                        <input
                                            {...register("views", { valueAsNumber: true })}
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        />
                                        {errors.views && (
                                            <p className="mt-1 text-sm text-red-600">{errors.views.message}</p>
                                        )}
                                    </div>

                                    {/* Publish Date */}
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <FiCalendar className="inline mr-2" />
                                            Publish Date *
                                        </label>
                                        <input
                                            {...register("publishDate")}
                                            type="date"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        />
                                        {errors.publishDate && (
                                            <p className="mt-1 text-sm text-red-600">{errors.publishDate.message}</p>
                                        )}
                                    </div>

                                    {/* Image Upload */}
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <FiImage className="inline mr-2" />
                                            Blog Image *
                                        </label>

                                        {/* Upload File */}
                                        <div
                                            className={`border-2 border-dashed border-gray-300 rounded-lg p-6 text-center transition-colors ${
                                                imageUploading ? "border-primary bg-primary/5" : "hover:border-primary"
                                            }`}
                                        >
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="hidden"
                                                id="image-upload"
                                                disabled={imageUploading}
                                            />
                                            <label
                                                htmlFor="image-upload"
                                                className={`cursor-pointer ${imageUploading ? "pointer-events-none" : ""}`}
                                            >
                                                {imageUploading ? (
                                                    <>
                                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-2"></div>
                                                        <p className="text-sm text-primary font-medium">
                                                            Uploading image...
                                                        </p>
                                                        <p className="text-xs text-gray-400">Please wait</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <FiUpload className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                                                        <p className="text-sm text-gray-600">
                                                            Click to upload or drag and drop
                                                        </p>
                                                        <p className="text-xs text-gray-400">PNG, JPG, GIF up to 5MB</p>
                                                    </>
                                                )}
                                            </label>
                                        </div>

                                        {/* Image Preview */}
                                        {imagePreview && (
                                            <div className="mt-4">
                                                <div className="relative">
                                                    <img
                                                        src={imagePreview}
                                                        alt="Preview"
                                                        className="w-full h-48 object-cover rounded-lg"
                                                    />
                                                    {uploadedImageUrl && (
                                                        <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs flex items-center space-x-1">
                                                            <FiCheck size={12} />
                                                            <span>Uploaded</span>
                                                        </div>
                                                    )}
                                                    {imageUploading && (
                                                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-lg">
                                                            <div className="bg-white px-3 py-2 rounded-lg flex items-center space-x-2">
                                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                                                <span className="text-sm">Uploading...</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {errors.image && (
                                            <p className="mt-1 text-sm text-red-600">{errors.image.message}</p>
                                        )}
                                    </div>
                                </div>
                            </CollapsibleSection>

                            {/* Content Section */}
                            <CollapsibleSection
                                title="Content"
                                isExpanded={sectionsExpanded.content}
                                onToggle={() => toggleSection("content")}
                            >
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <FiEdit3 className="inline mr-2" />
                                        Blog Content *
                                    </label>
                                    <Controller
                                        name="content"
                                        control={control}
                                        render={({ field }) => (
                                            <RichTextEditor
                                                content={field.value}
                                                onChange={field.onChange}
                                                placeholder="Write your blog content here..."
                                            />
                                        )}
                                    />
                                    {errors.content && (
                                        <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
                                    )}
                                </div>
                            </CollapsibleSection>
                        </div>

                        {/* Right Column - Preview */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden top-8">
                                <div className="px-6 py-4 border-b border-gray-100">
                                    <h2 className="text-xl font-semibold">Preview</h2>
                                </div>
                                <div className="px-6 py-4">
                                    <div className="space-y-4">
                                        <p className="text-sm text-gray-600 mb-4">
                                            Preview how your blog will appear to users
                                        </p>

                                        {watchedValues.title && watchedValues.description && watchedValues.image ? (
                                            <BlogCardPreview
                                                _id="preview"
                                                title={watchedValues.title}
                                                slug={watchedValues.slug || "preview-slug"}
                                                desc={watchedValues.description}
                                                category={watchedValues.category}
                                                image={watchedValues.image}
                                                views={watchedValues.views || 0}
                                                content={watchedValues.content || ""}
                                                createdAt={new Date()}
                                                updatedAt={new Date()}
                                            />
                                        ) : (
                                            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                                                <FiImage className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                                                <p className="text-sm text-gray-500">Fill in the form to see preview</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="mt-6  top-8">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-primary text-white py-3 px-6 rounded-lg hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center space-x-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                            <span>Publishing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FiPlus size={18} />
                                            <span>Publish Blog</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>

                {/* Validation Errors Display */}
                {showValidationErrors && Object.keys(errors).length > 0 && (
                    <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg z-50">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <FiX className="h-5 w-5 text-red-500" />
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium">Please fix the following errors:</h3>
                                <ul className="mt-1 text-xs list-disc list-inside">
                                    {Object.entries(errors).map(([field, error]) => (
                                        <li key={field}>{error.message}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* Clear Confirmation Modal */}
                {showClearConfirmation && (
                    <Confirmation
                        isOpen={showClearConfirmation}
                        onClose={() => setShowClearConfirmation(false)}
                        onConfirm={handleClearForm}
                        title="Clear Form"
                        message="Are you sure you want to clear all form data? This action cannot be undone."
                        confirmText="Clear Form"
                        cancelText="Keep Data"
                        variant="danger"
                    />
                )}
            </div>
        </div>
    )
}
