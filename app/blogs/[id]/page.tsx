"use client"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import {
    FiPlus,
    FiX,
    FiUpload,
    FiImage,
    FiChevronDown,
    FiCheck,
    FiCalendar,
    FiEye,
    FiType,
    FiEdit3,
    FiSave,
} from "react-icons/fi"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, Controller } from "react-hook-form"
import { toast } from "react-hot-toast"
import RichTextEditor from "@/components/RichTextEditor"
import BlogCardPreview from "@/components/BlogCardPreview"
import Confirmation from "@/components/ui/Confirmation"
import { generateSlug, debounce } from "@/lib/utils"
import { blogApi, BlogType } from "@/lib/blogApi"

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

export default function EditBlogPage() {
    const router = useRouter()
    const params = useParams()
    const blogId = params.id as string

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [blog, setBlog] = useState<BlogType | null>(null)
    const [slugLoading, setSlugLoading] = useState(false)
    const [imagePreview, setImagePreview] = useState<string>("")
    const [imageUploading, setImageUploading] = useState(false)
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("")
    const [showClearConfirmation, setShowClearConfirmation] = useState(false)
    const [showValidationErrors, setShowValidationErrors] = useState(false)
    const [validationSuccess, setValidationSuccess] = useState(false)
    const [hasValidated, setHasValidated] = useState(false)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

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
        title: "",
        slug: "",
        description: "",
        category: "Travel Tips" as const,
        views: 0,
        publishDate: getCurrentDate(),
        image: "",
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

    // Fetch blog data on component mount
    useEffect(() => {
        const fetchBlogData = async () => {
            try {
                setIsLoading(true)
                const response = await blogApi.getBlogById(blogId)

                if (response.success && response.data) {
                    const blogData = response.data
                    setBlog(blogData)

                    // Populate form with blog data
                    reset({
                        title: blogData.title,
                        slug: blogData.slug,
                        description: blogData.description,
                        category: blogData.category,
                        views: blogData.views,
                        publishDate: blogData.publishDate,
                        image: blogData.image,
                        content: blogData.content,
                    })

                    // Set image states
                    setImagePreview(blogData.image)
                    setUploadedImageUrl(blogData.image)
                } else {
                    toast.error("Blog not found")
                    router.push("/blogs")
                }
            } catch (error: any) {
                console.error("Error fetching blog:", error)
                toast.error(error.message || "Failed to load blog data")
                router.push("/blogs")
            } finally {
                setIsLoading(false)
            }
        }

        if (blogId) {
            fetchBlogData()
        }
    }, [blogId, reset, router])

    // Watch form values for preview and slug generation
    const watchedValues = watch()
    const watchTitle = watch("title")
    const watchSlug = watch("slug")
    const watchDescription = watch("description")
    const watchCategory = watch("category")
    const watchViews = watch("views")
    const watchPublishDate = watch("publishDate")
    const watchImage = watch("image")
    const watchContent = watch("content")

    // Reset validation state when any form field changes
    useEffect(() => {
        // Only reset validation if user is actively making changes (not during initial load)
        if (hasValidated && !isLoading) {
            setHasValidated(false)
            setValidationSuccess(false)
            setShowValidationErrors(false)
        }
        // Mark form as having unsaved changes when any field is modified (but not during initial load)
        if (!isLoading) {
            setHasUnsavedChanges(true)
        }
    }, [
        watchTitle,
        watchSlug,
        watchDescription,
        watchCategory,
        watchViews,
        watchPublishDate,
        watchImage,
        watchContent,
        // Don't include hasValidated in dependencies to avoid loop
        isLoading,
    ])

    // Clear unsaved changes flag when form is initially loaded
    useEffect(() => {
        if (!isLoading) {
            // Set a timeout to avoid triggering unsaved changes immediately after data load
            const timer = setTimeout(() => {
                setHasUnsavedChanges(false)
            }, 1000)
            return () => clearTimeout(timer)
        }
    }, [isLoading])

    // Auto-generate slug when title changes (only for new blogs, not when editing)
    const debouncedSlugGeneration = debounce(async (title: string) => {
        // Don't auto-generate slug in edit mode unless slug is empty
        if (!title || (blog && blog.slug && watchSlug)) return

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
        // Only auto-generate slug if we don't have a blog loaded yet or if the slug is empty
        if (watchTitle && (!blog || !watchSlug)) {
            debouncedSlugGeneration(watchTitle)
        }
    }, [watchTitle, watchSlug, blog, debouncedSlugGeneration])

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
        if (!blog) return

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

            console.log("Updating blog with data:", blogData)

            // Call the API to update the blog
            const response = await blogApi.updateBlog(blog._id, blogData)

            if (response.success) {
                toast.success("Blog updated successfully!")
                setHasUnsavedChanges(false) // Clear unsaved changes flag
                router.push("/blogs")
            } else {
                throw new Error(response.message || "Failed to update blog")
            }
        } catch (error: any) {
            console.error("Error updating blog:", error)
            toast.error(error.message || "Failed to update blog. Please try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    // Handle form clear
    const handleClearForm = () => {
        if (blog) {
            // Reset to original blog data
            reset({
                title: blog.title,
                slug: blog.slug,
                description: blog.description,
                category: blog.category,
                views: blog.views,
                publishDate: blog.publishDate,
                image: blog.image,
                content: blog.content,
            })
            setImagePreview(blog.image)
            setUploadedImageUrl(blog.image)
        } else {
            // Fallback to default values
            reset(defaultValues)
            setImagePreview("")
            setUploadedImageUrl("")
        }
        setHasValidated(false)
        setValidationSuccess(false)
        setShowValidationErrors(false)
        setShowClearConfirmation(false)
        setHasUnsavedChanges(false) // Clear unsaved changes flag
        toast.success("Form reset to original values!")
    }

    // Show validation errors
    const handleShowErrors = async () => {
        // Clear previous validation state first
        setShowValidationErrors(false)
        setValidationSuccess(false)

        try {
            // Trigger validation
            const isFormValid = await trigger()

            if (isFormValid) {
                setValidationSuccess(true)
            } else {
                setValidationSuccess(false)
            }

            // Show validation results
            setShowValidationErrors(true)
            setHasValidated(true)
        } catch (error) {
            console.error("Validation error:", error)
            setValidationSuccess(false)
            setShowValidationErrors(true)
            setHasValidated(true)
        }
    }

    // Handle update blog button click - validate first, then update if valid
    const handleUpdateBlog = async () => {
        // Only proceed if form has been validated and passed
        if (!hasValidated || !validationSuccess) {
            toast.error("Please validate the form first ⚠️", {
                duration: 4000,
            })
            return
        }

        // All validation passed, proceed with updating blog
        const currentData = watch()
        onSubmit(currentData)
    }

    return (
        <>
            {/* Loading State */}
            {isLoading ? (
                <div className="min-h-screen bg-gray-50 py-8">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-gray-900">Edit Blog</h1>
                            <p className="text-gray-600 mt-2">Loading blog data...</p>
                        </div>
                        <div className="flex items-center justify-center py-12">
                            <div className="flex flex-col items-center space-y-4">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                                <p className="text-gray-600">Loading blog data...</p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="min-h-screen bg-gray-50 py-8">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="mb-8">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900">Edit Blog</h1>
                                    <p className="text-gray-600 mt-2">Update and modify your blog post</p>
                                </div>
                                <div className="flex space-x-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowClearConfirmation(true)}
                                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 flex items-center space-x-2"
                                    >
                                        <FiX size={16} />
                                        <span>Reset Form</span>
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

                                            {/* Slug */}
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Slug {blog ? "(Editable)" : "(Auto-generated)"}
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        {...register("slug")}
                                                        type="text"
                                                        placeholder={
                                                            blog ? "Edit the blog URL slug" : "Auto-generated from title"
                                                        }
                                                        className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                                                            blog ? "" : "bg-gray-50"
                                                        }`}
                                                        readOnly={!blog}
                                                    />
                                                    {slugLoading && (
                                                        <div className="absolute right-3 top-3">
                                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 "></div>
                                                        </div>
                                                    )}
                                                </div>
                                                {errors.slug && (
                                                    <p className="mt-1 text-sm text-red-600">{errors.slug.message}</p>
                                                )}
                                                <p className="mt-1 text-xs text-gray-500">
                                                    URL: /blog/{watchSlug || "your-blog-slug"}
                                                </p>
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
                                                    <p className="mt-1 text-sm text-red-600">
                                                        {errors.description.message}
                                                    </p>
                                                )}
                                                <p className="mt-1 text-xs text-gray-500">
                                                    {watchedValues.description?.length || 0}/200 characters
                                                </p>
                                            </div>

                                            {/* Category */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Category *
                                                </label>
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
                                                    <p className="mt-1 text-sm text-red-600">
                                                        {errors.publishDate.message}
                                                    </p>
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
                                                        imageUploading
                                                            ? "border-primary bg-primary/5"
                                                            : "hover:border-primary"
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
                                                        className={`cursor-pointer ${
                                                            imageUploading ? "pointer-events-none" : ""
                                                        }`}
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
                                                                <p className="text-xs text-gray-400">
                                                                    PNG, JPG, GIF up to 5MB
                                                                </p>
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
                                                        <p className="text-sm text-gray-500">
                                                            Fill in the form to see preview
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Submit Button */}
                                    <div className="mt-6 top-8">
                                        {/* Unified Validation Status Box */}
                                        {!hasValidated && (
                                            <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
                                                <div className="flex items-center">
                                                    <FiCheck className="h-5 w-5 text-blue-500 mr-2" />
                                                    <span className="font-medium">Validation Required</span>
                                                </div>
                                                <p className="text-sm mt-1">
                                                    Please click "Validate Form" to check for errors before updating your
                                                    blog.
                                                </p>
                                            </div>
                                        )}

                                        {hasValidated && validationSuccess && (
                                            <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
                                                <div className="flex items-center">
                                                    <FiCheck className="h-5 w-5 text-green-500 mr-2" />
                                                    <span className="font-medium">All validation checks passed!</span>
                                                </div>
                                                <p className="text-sm mt-1">Your form is ready to be submitted.</p>
                                            </div>
                                        )}

                                        {hasValidated && !validationSuccess && Object.keys(errors).length > 0 && (
                                            <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                                                <div className="flex items-start">
                                                    <FiX className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                                                    <div>
                                                        <h3 className="font-medium mb-2">
                                                            Please fix the following errors:
                                                        </h3>
                                                        <ul className="text-sm space-y-1">
                                                            {errors.title && (
                                                                <li className="flex items-start">
                                                                    <span className="w-2 h-2 bg-red-400 rounded-full mr-2 flex-shrink-0 mt-1.5"></span>
                                                                    <span>
                                                                        <strong>Title:</strong> {errors.title.message}
                                                                    </span>
                                                                </li>
                                                            )}
                                                            {errors.slug && (
                                                                <li className="flex items-start">
                                                                    <span className="w-2 h-2 bg-red-400 rounded-full mr-2 flex-shrink-0 mt-1.5"></span>
                                                                    <span>
                                                                        <strong>Slug:</strong> {errors.slug.message}
                                                                    </span>
                                                                </li>
                                                            )}
                                                            {errors.description && (
                                                                <li className="flex items-start">
                                                                    <span className="w-2 h-2 bg-red-400 rounded-full mr-2 flex-shrink-0 mt-1.5"></span>
                                                                    <span>
                                                                        <strong>Description:</strong>{" "}
                                                                        {errors.description.message}
                                                                    </span>
                                                                </li>
                                                            )}
                                                            {errors.category && (
                                                                <li className="flex items-start">
                                                                    <span className="w-2 h-2 bg-red-400 rounded-full mr-2 flex-shrink-0 mt-1.5"></span>
                                                                    <span>
                                                                        <strong>Category:</strong> {errors.category.message}
                                                                    </span>
                                                                </li>
                                                            )}
                                                            {errors.views && (
                                                                <li className="flex items-start">
                                                                    <span className="w-2 h-2 bg-red-400 rounded-full mr-2 flex-shrink-0 mt-1.5"></span>
                                                                    <span>
                                                                        <strong>Views:</strong> {errors.views.message}
                                                                    </span>
                                                                </li>
                                                            )}
                                                            {errors.publishDate && (
                                                                <li className="flex items-start">
                                                                    <span className="w-2 h-2 bg-red-400 rounded-full mr-2 flex-shrink-0 mt-1.5"></span>
                                                                    <span>
                                                                        <strong>Publish Date:</strong>{" "}
                                                                        {errors.publishDate.message}
                                                                    </span>
                                                                </li>
                                                            )}
                                                            {errors.image && (
                                                                <li className="flex items-start">
                                                                    <span className="w-2 h-2 bg-red-400 rounded-full mr-2 flex-shrink-0 mt-1.5"></span>
                                                                    <span>
                                                                        <strong>Image:</strong> {errors.image.message}
                                                                    </span>
                                                                </li>
                                                            )}
                                                            {errors.content && (
                                                                <li className="flex items-start">
                                                                    <span className="w-2 h-2 bg-red-400 rounded-full mr-2 flex-shrink-0 mt-1.5"></span>
                                                                    <span>
                                                                        <strong>Content:</strong> {errors.content.message}
                                                                    </span>
                                                                </li>
                                                            )}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            type="button"
                                            onClick={handleUpdateBlog}
                                            disabled={isSubmitting || !hasValidated || !validationSuccess}
                                            className={`w-full py-3 px-6 rounded-lg focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors duration-200 flex items-center justify-center space-x-2 ${
                                                isSubmitting || !hasValidated || !validationSuccess
                                                    ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                                                    : "bg-primary text-white hover:bg-primary/90"
                                            }`}
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                    <span>Updating...</span>
                                                </>
                                            ) : !hasValidated ? (
                                                <>
                                                    <FiCheck size={18} />
                                                    <span>Validate Form First</span>
                                                </>
                                            ) : !validationSuccess ? (
                                                <>
                                                    <FiX size={18} />
                                                    <span>Fix Errors to Update</span>
                                                </>
                                            ) : (
                                                <>
                                                    <FiSave size={18} />
                                                    <span>Update Blog</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>

                        {/* Clear Confirmation Modal */}
                        {showClearConfirmation && (
                            <Confirmation
                                isOpen={showClearConfirmation}
                                onClose={() => setShowClearConfirmation(false)}
                                onConfirm={handleClearForm}
                                title="Reset Form"
                                message="Are you sure you want to reset all changes back to the original blog data? This will discard any modifications you made."
                                confirmText="Reset Form"
                                cancelText="Keep Changes"
                                variant="danger"
                            />
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
