"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
} from "react-icons/fi";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { toast } from "react-hot-toast";
import RichTextEditor from "@/components/RichTextEditor";
import TourCardPreview from "@/components/TourCardPreview";
import Confirmation from "@/components/ui/Confirmation";
import { tourApi } from "@/lib/tourApi";

// Schema validation
const tourSchema = z
  .object({
    title: z
      .string()
      .min(20, "Title must be at least 20 characters")
      .max(100, "Title cannot exceed 100 characters"),
    slug: z
      .string()
      .min(1, "Slug is required")
      .regex(
        /^[a-z0-9-]*$/,
        "Slug can only contain lowercase letters, numbers and hyphens"
      ),
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
    vehicle: z.string().optional(),
    seatCapacity: z.number().optional(),
    departureTimes: z
      .array(z.string())
      .min(1, "At least one departure time is required"),
    label: z.enum([
      "Recommended",
      "Popular",
      "Best Value",
      "Best seller",
      "None",
    ]),
    details: z.object({
      about: z
        .string()
        .min(100, "About section must be at least 100 characters"),
      itinerary: z
        .string()
        .min(100, "Itinerary must be at least 100 characters"),
      pickupLocation: z
        .string()
        .min(10, "Pickup location must be at least 10 characters"),
      pickupGuidelines: z.string().optional(),
      note: z.string().min(10, "Note must be at least 10 characters"),
      faq: z
        .array(
          z.object({
            question: z.string(),
            answer: z.string(),
          })
        )
        .min(1, "At least one FAQ is required"),
    }),
  })
  .refine(
    (data) => {
      if (data.newPrice > data.oldPrice) {
        return false;
      }
      return true;
    },
    {
      message: "New price must be less than or equal to old price",
      path: ["newPrice"],
    }
  )
  .refine(
    (data) => {
      if (data.type !== "private" && data.maximumPerson <= data.minimumPerson) {
        return false;
      }
      return true;
    },
    {
      message: "Maximum persons must be greater than minimum persons",
      path: ["maximumPerson"],
    }
  )
  .refine(
    (data) => {
      if (
        data.type === "private" &&
        (!data.vehicle || data.vehicle.trim() === "")
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Vehicle is required for private tours",
      path: ["vehicle"],
    }
  );

type TourFormData = z.infer<typeof tourSchema>;

// Collapsible Section Component
interface CollapsibleSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}

const CollapsibleSection = ({
  title,
  isExpanded,
  onToggle,
  children,
  className = "",
}: CollapsibleSectionProps) => {
  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:bg-gray-50"
      >
        <h2 className="text-xl font-semibold text-left">{title}</h2>
        <div
          className={`transform transition-transform duration-300 ${
            isExpanded ? "rotate-180" : "rotate-0"
          }`}
        >
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
  );
};

export default function EditTourPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id: tourId } = params;
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [vehicleSubmitting, setVehicleSubmitting] = useState(false);
  const [vehicleName, setVehicleName] = useState("");
  const [vehicleUnits, setVehicleUnits] = useState(1);
  const [vehicleSeats, setVehicleSeats] = useState(4);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [slugLoading, setSlugLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageUploading, setImageUploading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");
  const [newTag, setNewTag] = useState("");
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [validationSuccess, setValidationSuccess] = useState(false);
  const [hasValidated, setHasValidated] = useState(false);
  const [originalSlug, setOriginalSlug] = useState<string>("");

  // Section visibility states
  const [sectionsExpanded, setSectionsExpanded] = useState({
    basicInfo: true,
    pricing: false,
    departureTimes: false,
    tourDetails: false,
    faq: false,
  });

  const toggleSection = (section: keyof typeof sectionsExpanded) => {
    setSectionsExpanded((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

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
    vehicle: "",
    seatCapacity: 4,
    tags: [],
    details: {
      about: "",
      itinerary: "",
      pickupLocation: "",
      pickupGuidelines: "",
      note: "",
      faq: [{ question: "", answer: "" }],
    },
  };

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
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "details.faq",
  });

  const watchTitle = watch("title");
  const watchType = watch("type");
  const watchDescription = watch("description");
  const watchImage = watch("image");
  const watchTags = watch("tags");
  const watchDuration = watch("duration");
  const watchBookedCount = watch("bookedCount");
  const watchOldPrice = watch("oldPrice");
  const watchNewPrice = watch("newPrice");
  const watchChildPrice = watch("childPrice");
  const watchMinimumPerson = watch("minimumPerson");
  const watchMaximumPerson = watch("maximumPerson");
  const watchVehicle = watch("vehicle");
  const watchPeriod = watch("period");
  const watchStatus = watch("status");
  const watchLabel = watch("label");
  const watchSlug = watch("slug");
  const watchDepartureTimes = watch("departureTimes");
  const watchDetailsAbout = watch("details.about");
  const watchDetailsItinerary = watch("details.itinerary");
  const watchDetailsPickupLocation = watch("details.pickupLocation");
  const watchDetailsPickupGuidelines = watch("details.pickupGuidelines");
  const watchDetailsNote = watch("details.note");
  const watchDetailsFaq = watch("details.faq");

  // Fetch existing tour data on component mount
  useEffect(() => {
    const fetchTourData = async () => {
      try {
        setIsLoading(true);
        const response = await tourApi.getTourById(tourId);

        if (response.success) {
          const tour = response.data;

          // Map API response to form structure
          const formData: TourFormData = {
            title: tour.title || "",
            slug: tour.slug || "",
            image: tour.image || "",
            tags: tour.tags || [],
            description: tour.description || "",
            type: (tour.type as "co-tour" | "private") || "co-tour",
            duration: tour.duration || "",
            period: (tour.period as "Half-Day" | "Full-Day") || "Half-Day",
            bookedCount: tour.bookedCount || 0,
            oldPrice: tour.oldPrice || 0,
            newPrice: tour.newPrice || 0,
            childPrice: tour.childPrice || 0,
            minimumPerson: tour.minimumPerson || 1,
            maximumPerson: tour.maximumPerson || 10,
            vehicle: (tour as any).vehicle || "",
            seatCapacity: (tour as any).seatCapacity || 4,
            departureTimes: tour.departureTimes || ["08:00"],
            label:
              (tour.label as
                | "Recommended"
                | "Popular"
                | "Best Value"
                | "None") || "None",
            status: (tour.status as "active" | "sold") || "active",
            details: {
              about: tour.details?.about || "",
              itinerary: tour.details?.itinerary || "",
              pickupLocation: tour.details?.pickupLocation || "",
              pickupGuidelines: (tour.details as any)?.pickupGuidelines || "",
              note: tour.details?.note || "",
              faq:
                tour.details?.faq && tour.details.faq.length > 0
                  ? tour.details.faq
                  : [{ question: "", answer: "" }],
            },
          };

          // Set form values
          reset(formData);

          // Set other state values
          setOriginalSlug(tour.slug || "");
          setUploadedImageUrl(tour.image || "");
          setImagePreview(tour.image || "");
        } else {
          toast.error("Failed to load tour data ❌", {
            duration: 4000,
          });
          router.push("/tours");
        }
      } catch (error) {
        console.error("Error fetching tour:", error);
        toast.error("Failed to load tour data ❌", {
          duration: 4000,
        });
        router.push("/tours");
      } finally {
        setIsLoading(false);
      }
    };

    if (tourId) {
      fetchTourData();
    }
  }, [tourId, router, reset]);

  // Reset validation state when any form field changes
  useEffect(() => {
    // Skip during initial load
    if (isLoading) return;

    if (hasValidated) {
      setHasValidated(false);
      setValidationSuccess(false);
      setShowValidationErrors(false);
    }
  }, [
    watchTitle,
    watchType,
    watchDescription,
    watchImage,
    watchTags,
    watchDuration,
    watchBookedCount,
    watchOldPrice,
    watchNewPrice,
    watchChildPrice,
    watchMinimumPerson,
    watchMaximumPerson,
    watchVehicle,
    watchPeriod,
    watchStatus,
    watchLabel,
    watchSlug,
    watchDepartureTimes,
    watchDetailsAbout,
    watchDetailsItinerary,
    watchDetailsPickupLocation,
    watchDetailsNote,
    watchDetailsFaq,
    isLoading,
  ]);

  // Fetch vehicles for private tour selection
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/vehicles`
        );
        const data = await res.json();
        if (data.success) setVehicles(data.data || []);
      } catch (err) {
        console.error("Failed to fetch vehicles", err);
      }
    };
    fetchVehicles();
  }, []);

  // Clear vehicle field when tour type changes from Private to other types
  useEffect(() => {
    if (watchType !== "private") {
      setValue("vehicle", "");
      setValue("seatCapacity", undefined as any);
    }
  }, [watchType, setValue]);

  // Set minimumPerson to 1 for Private tours (vehicle booking, not person-based)
  useEffect(() => {
    if (watchType === "private") {
      setValue("minimumPerson", 1);
    }
  }, [watchType, setValue]);

  const createVehicle = async () => {
    if (!vehicleName.trim()) return toast.error("Vehicle name required");
    setVehicleSubmitting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/vehicles`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: vehicleName.trim(),
            units: vehicleUnits,
            seats: vehicleSeats,
          }),
        }
      );
      const data = await res.json();
      if (data.success) {
        setVehicles((v) => [...v, data.data]);
        setShowAddVehicle(false);
        setVehicleName("");
        setVehicleSeats(4);
        setVehicleUnits(1);
        toast.success("Vehicle created");
      } else {
        toast.error(data.message || "Failed to create vehicle");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to create vehicle");
    } finally {
      setVehicleSubmitting(false);
    }
  };

  // Auto-hide validation errors after 8 seconds
  useEffect(() => {
    if (showValidationErrors && !validationSuccess) {
      const timer = setTimeout(() => {
        setShowValidationErrors(false);
      }, 8000); // 8 seconds for error messages

      return () => clearTimeout(timer);
    }
  }, [showValidationErrors, validationSuccess]);

  // Handle adding tags
  const addTag = (field: any) => {
    if (newTag.trim() && !field.value?.includes(newTag.trim())) {
      field.onChange([...(field.value || []), newTag.trim()]);
      setNewTag("");
    } else if (field.value?.includes(newTag.trim())) {
      toast.error("Tag already exists ⚠️", {
        duration: 3000,
      });
    } else if (!newTag.trim()) {
      toast.error("Please enter a tag name ⚠️", {
        duration: 3000,
      });
    }
  };

  // Handle image upload
  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImageUploading(true);

      // Create preview URL for immediate display
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);

      // Upload to server
      const formData = new FormData();
      formData.append("image", file);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const response = await fetch(`${apiUrl}/api/upload/tour-image`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Upload failed");
      }

      const result = await response.json();
      const imageUrl = result.data.imageUrl;

      setUploadedImageUrl(imageUrl);
      setValue("image", imageUrl);

      toast.success("Image uploaded successfully!", {
        duration: 3000,
        icon: "📸",
      });
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error(`Failed to upload image: ${error.message}`, {
        duration: 4000,
        icon: "❌",
      });
      // Clear preview on error
      setImagePreview("");
      setUploadedImageUrl("");
      setValue("image", "");
    } finally {
      setImageUploading(false);
    }
  };

  // Auto-generate slug from title
  useEffect(() => {
    if (watchTitle && watchTitle.trim() !== "") {
      setSlugLoading(true);
      const timer = setTimeout(() => {
        const generatedSlug = watchTitle
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9 -]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
        setValue("slug", generatedSlug);
        setSlugLoading(false);
      }, 500);

      return () => clearTimeout(timer);
    } else if (!watchTitle || watchTitle.trim() === "") {
      // Clear slug if title is empty
      setValue("slug", "");
      setSlugLoading(false);
    }
  }, [watchTitle, setValue]);

  // Handle save tour button click - validate first, then save if valid
  const handleSaveTour = async () => {
    // Only proceed if form has been validated and passed
    if (!hasValidated || !validationSuccess) {
      toast.error("Please validate the form first ⚠️", {
        duration: 4000,
      });
      return;
    }

    // All validation passed, proceed with updating
    const currentData = getValues();
    onSubmit(currentData);
  };

  const onSubmit = async (data: TourFormData) => {
    setIsSubmitting(true);
    try {
      // All validation already done in handleSaveTour
      const validFaqs = data.details.faq.filter(
        (faq) => faq.question.trim() && faq.answer.trim()
      );

      const tourData = {
        ...data,
        packageType: "tour", // Ensure packageType is always "tour"
        details: {
          ...data.details,
          faq: validFaqs,
        },
      };

      console.log("Updating tour..."); // Debug log

      // Call the API to update the tour
      const response = await tourApi.updateTour(tourId, tourData);

      console.log("Tour updated successfully"); // Debug log
      toast.success("Tour updated successfully! 🎉", {
        duration: 4000,
      });
      router.push("/tours");
    } catch (error: any) {
      console.error("Error updating tour:", error);
      toast.error(
        `Failed to update tour: ${error.message || "Please try again."} ❌`,
        {
          duration: 4000,
        }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle form clear
  const handleClearForm = () => {
    // Reset form with complete default values
    reset(defaultValues);

    // Clear image-related state
    setImagePreview("");
    setUploadedImageUrl("");

    // Clear file input
    const fileInput = document.getElementById(
      "image-upload"
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }

    // Clear validation states
    setShowValidationErrors(false);
    setValidationSuccess(false);
    setHasValidated(false);

    // Close confirmation modal
    setShowClearConfirmation(false);

    toast.success("Form cleared successfully!");
  };

  // Show validation errors
  const handleShowErrors = async () => {
    // Clear previous validation state first
    setShowValidationErrors(false);
    setValidationSuccess(false);

    try {
      // Trigger validation
      const isFormValid = await trigger();

      if (isFormValid) {
        // Additional custom validation for FAQ
        const currentData = getValues();
        const validFaqs = currentData.details.faq.filter(
          (faq) => faq.question.trim() && faq.answer.trim()
        );

        if (validFaqs.length === 0) {
          // Add a custom error for FAQ
          toast.error(
            "At least one complete FAQ (question and answer) is required",
            {
              duration: 4000,
            }
          );
          setValidationSuccess(false);
        } else {
          setValidationSuccess(true);

          // Auto-hide success message after 5 seconds
          setTimeout(() => {
            setShowValidationErrors(false);
          }, 5000);
        }
      } else {
        setValidationSuccess(false);
        toast.error("Please fix the validation errors below", {
          duration: 4000,
        });
      }
    } catch (error) {
      console.error("Validation error:", error);
      setValidationSuccess(false);
      toast.error("Validation failed. Please check your inputs.", {
        duration: 4000,
      });
    }

    // Show validation results
    setShowValidationErrors(true);
    setHasValidated(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Tour</h1>
              <p className="text-gray-600 mt-2">
                Update and configure this tour package
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Mobile Close Button */}
              <button
                type="button"
                onClick={() => router.push("/tours")}
                className="md:hidden p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center"
                title="Close and go back to tours"
                disabled={isLoading}
              >
                <FiX size={20} />
              </button>

              {/* Desktop Buttons */}
              <div className="hidden md:flex space-x-4">
                <button
                  type="button"
                  onClick={() => setShowClearConfirmation(true)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 flex items-center space-x-2"
                  disabled={isLoading}
                >
                  <FiX size={16} />
                  <span>Clear Form</span>
                </button>
                <button
                  type="button"
                  onClick={handleShowErrors}
                  className="px-4 py-2 bg-green-100/50 text-primary rounded-lg transition-colors duration-200 flex items-center space-x-2 hover:bg-green-100"
                  disabled={isLoading}
                >
                  <FiCheck size={16} />
                  <span>Validate Form</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Loading tour data...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tour Title *
                      </label>
                      <input
                        {...register("title")}
                        type="text"
                        className={`w-full px-3 py-2 border rounded-md ${
                          errors.title ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="E.g., Full Day Land Rover Adventure in Cameron Highlands"
                      />
                      <div className="flex justify-between mt-1">
                        <p className="text-xs text-red-500">
                          {errors.title?.message}
                        </p>
                        <div className="flex justify-between w-full">
                          <p className="text-xs text-gray-500">
                            {watchTitle?.length || 0}/100
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Slug *
                      </label>
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
                      <p className="text-xs text-red-500 mt-1">
                        {errors.slug?.message}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description*
                      </label>
                      <textarea
                        {...register("description")}
                        className={`w-full px-3 py-2 border rounded-md resize-none ${
                          errors.description
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                        rows={3}
                        placeholder="Brief description of the tour (50-110 characters)"
                      />
                      <div className="flex justify-between mt-1">
                        <p className="text-xs text-red-500">
                          {errors.description?.message}
                        </p>
                        <p className="text-xs text-gray-500">
                          {watch("description")?.length || 0}/110
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <FiImage className="inline mr-2" />
                        Tour Image *
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
                              <p className="text-xs text-gray-400">
                                Please wait
                              </p>
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
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-red-500 mt-1">
                        {errors.image?.message}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tags *
                      </label>
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
                                      const newTags = [...field.value];
                                      newTags.splice(index, 1);
                                      field.onChange(newTags);
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
                                    e.preventDefault();
                                    addTag(field);
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
                      <p className="text-xs text-red-500 mt-1">
                        {errors.tags?.message}
                      </p>
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tour Type *
                      </label>
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
                            errors.duration
                              ? "border-red-500"
                              : "border-gray-300"
                          }`}
                          placeholder="E.g. 4, 6-8"
                        />
                        <FiClock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      </div>
                      <p className="text-xs text-red-500 mt-1">
                        {errors.duration?.message}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Period *
                      </label>
                      <select
                        {...register("period")}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="Half-Day">Half-Day</option>
                        <option value="Full-Day">Full-Day</option>
                      </select>
                      <p className="text-xs text-red-500 mt-1">
                        {errors.period?.message}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status *
                      </label>
                      <select
                        {...register("status")}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="active">Active</option>
                        <option value="sold">Sold Out</option>
                      </select>
                      <p className="text-xs text-red-500 mt-1">
                        {errors.status?.message}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Old Price (RM) *
                      </label>
                      <div className="relative">
                        <input
                          {...register("oldPrice", { valueAsNumber: true })}
                          type="number"
                          min="0"
                          step="0.01"
                          className={`w-full px-3 py-2 border rounded-md ${
                            errors.oldPrice
                              ? "border-red-500"
                              : "border-gray-300"
                          }`}
                          placeholder="0.00"
                        />
                      </div>
                      <p className="text-xs text-red-500 mt-1">
                        {errors.oldPrice?.message}
                      </p>
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
                            errors.newPrice
                              ? "border-red-500"
                              : "border-gray-300"
                          }`}
                          placeholder="0.00"
                        />
                      </div>
                      <p className="text-xs text-red-500 mt-1">
                        {errors.newPrice?.message}
                      </p>
                    </div>

                    {watchType !== "private" && (
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
                              errors.childPrice
                                ? "border-red-500"
                                : "border-gray-300"
                            }`}
                            placeholder="0.00"
                          />
                        </div>
                        <p className="text-xs text-red-500 mt-1">
                          {errors.childPrice?.message}
                        </p>
                      </div>
                    )}

                    {/* Vehicle Selection for Private Tours */}
                    {watchType === "private" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Vehicle *
                        </label>
                        <div className="flex gap-2">
                          <select
                            {...register("vehicle")}
                            className={`flex-1 px-3 py-2 border rounded-md ${
                              errors.vehicle
                                ? "border-red-500"
                                : "border-gray-300"
                            }`}
                          >
                            <option value="">Select Vehicle</option>
                            {vehicles.map((vehicle) => (
                              <option key={vehicle._id} value={vehicle._id}>
                                {vehicle.name} ({vehicle.units} units,{" "}
                                {vehicle.seats} seats)
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => setShowAddVehicle(true)}
                            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-1"
                          >
                            <FiPlus size={16} />
                          </button>
                        </div>
                        <p className="text-xs text-red-500 mt-1">
                          {errors.vehicle?.message}
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Label
                      </label>
                      <select
                        {...register("label")}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="None">None</option>
                        <option value="Recommended">Recommended</option>
                        <option value="Popular">Popular</option>
                        <option value="Best Value">Best Value</option>
                        <option value="Best seller">Best seller</option>
                      </select>
                    </div>

                    {/* Show person capacity fields only for non-private tours */}
                    {watchType !== "private" && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Minimum Persons *
                          </label>
                          <div className="relative">
                            <input
                              {...register("minimumPerson", {
                                valueAsNumber: true,
                              })}
                              type="number"
                              min="1"
                              step="1"
                              className={`w-full px-3 py-2 border rounded-md ${
                                errors.minimumPerson
                                  ? "border-red-500"
                                  : "border-gray-300"
                              }`}
                              placeholder="1"
                            />
                            <FiUsers className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          </div>
                          <p className="text-xs text-red-500 mt-1">
                            {errors.minimumPerson?.message}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Maximum Persons *
                          </label>
                          <div className="relative">
                            <input
                              {...register("maximumPerson", {
                                valueAsNumber: true,
                              })}
                              type="number"
                              min="1"
                              step="1"
                              className={`w-full px-3 py-2 border rounded-md ${
                                errors.maximumPerson
                                  ? "border-red-500"
                                  : "border-gray-300"
                              }`}
                              placeholder="10"
                            />
                            <FiUsers className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          </div>
                          <p className="text-xs text-red-500 mt-1">
                            {errors.maximumPerson?.message}
                          </p>
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Booked Count *
                      </label>
                      <div className="relative">
                        <input
                          {...register("bookedCount", { valueAsNumber: true })}
                          type="number"
                          min="0"
                          step="1"
                          className={`w-full px-3 py-2 border rounded-md ${
                            errors.bookedCount
                              ? "border-red-500"
                              : "border-gray-300"
                          }`}
                          placeholder="0"
                        />
                        <FiUsers className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      </div>
                      <p className="text-xs text-red-500 mt-1">
                        {errors.bookedCount?.message}
                      </p>
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
                            <div
                              key={index}
                              className="flex items-center space-x-3"
                            >
                              <input
                                type="time"
                                value={time}
                                onChange={(e) => {
                                  const newTimes = [...field.value];
                                  newTimes[index] = e.target.value;
                                  field.onChange(newTimes);
                                }}
                                className="px-3 py-2 border border-gray-300 rounded-md"
                              />
                              {field.value.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newTimes = [...field.value];
                                    newTimes.splice(index, 1);
                                    field.onChange(newTimes);
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
                            onClick={() =>
                              field.onChange([...field.value, "08:00"])
                            }
                            className="text-primary hover:text-primary-dark flex items-center text-sm"
                          >
                            <FiPlus className="mr-1" /> Add another time
                          </button>
                        </div>
                      )}
                    />
                    <p className="text-xs text-red-500 mt-1">
                      {errors.departureTimes?.message}
                    </p>
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
                              field.onChange(content);
                            }}
                            placeholder="Describe what makes this tour special..."
                            error={!!errors.details?.about}
                            contentClassName="focus:outline-none min-h-[120px] p-4 text-sm leading-6"
                          />
                        )}
                      />
                      <p className="text-xs text-red-500 mt-1">
                        {errors.details?.about?.message}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Itinerary *
                      </label>
                      <Controller
                        name="details.itinerary"
                        control={control}
                        render={({ field }) => (
                          <RichTextEditor
                            content={field.value || ""}
                            onChange={(content) => {
                              field.onChange(content);
                            }}
                            placeholder="Detail the tour schedule step by step..."
                            error={!!errors.details?.itinerary}
                            contentClassName="focus:outline-none min-h-[120px] p-4 text-sm leading-6"
                          />
                        )}
                      />
                      <p className="text-xs text-red-500 mt-1">
                        {errors.details?.itinerary?.message}
                      </p>
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
                              field.onChange(content);
                            }}
                            placeholder="Describe pickup locations, meeting points, or transportation details..."
                            error={!!errors.details?.pickupLocation}
                            contentClassName="focus:outline-none min-h-[120px] p-4 text-sm leading-6"
                          />
                        )}
                      />
                      <p className="text-xs text-red-500 mt-1">
                        {errors.details?.pickupLocation?.message}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pickup Guidelines
                      </label>
                      <Controller
                        name="details.pickupGuidelines"
                        control={control}
                        render={({ field }) => (
                          <RichTextEditor
                            content={field.value || ""}
                            onChange={(content) => {
                              field.onChange(content);
                            }}
                            placeholder="Optional: provide any pickup guidelines or special instructions for guests..."
                            error={!!errors.details?.pickupGuidelines}
                            contentClassName="focus:outline-none min-h-[120px] p-4 text-sm leading-6"
                          />
                        )}
                      />
                      <p className="text-xs text-red-500 mt-1">
                        {errors.details?.pickupGuidelines?.message}
                      </p>
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
                              field.onChange(content);
                            }}
                            placeholder="What to bring, restrictions, dress code, weather considerations, etc..."
                            error={!!errors.details?.note}
                            contentClassName="focus:outline-none min-h-[120px] p-4 text-sm leading-6"
                          />
                        )}
                      />
                      <p className="text-xs text-red-500 mt-1">
                        {errors.details?.note?.message}
                      </p>
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
                      <div
                        key={field.id}
                        className="border border-gray-200 rounded-md p-4"
                      >
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
                                    field.onChange(content);
                                  }}
                                  placeholder="Enter answer"
                                  error={!!errors.details?.faq?.[index]?.answer}
                                  contentClassName="focus:outline-none min-h-[120px] p-4 text-sm leading-6"
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

              {/* Right Column - Preview */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden top-8">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-xl font-semibold">Preview</h2>
                  </div>
                  <div className="px-6 py-4">
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600 mb-4">
                        Preview how your tour will appear to users
                      </p>

                      {watchTitle || watchImage || uploadedImageUrl ? (
                        <TourCardPreview
                          id={1}
                          slug={watchSlug || "sample-tour"}
                          image={uploadedImageUrl || watchImage || imagePreview}
                          title={watchTitle || "Sample Tour Title"}
                          tags={
                            watchTags && watchTags.length > 0
                              ? watchTags
                              : ["Sample Tag"]
                          }
                          desc={
                            watchDescription || "Sample tour description..."
                          }
                          duration={watchDuration || "4"}
                          bookedCount={watchBookedCount || 0}
                          oldPrice={watchOldPrice || 0}
                          newPrice={watchNewPrice || 0}
                          type={watchType || "co-tour"}
                          label={watchLabel !== "None" ? watchLabel : null}
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
                        Please click "Validate Form" to check for errors before
                        updating your tour.
                      </p>
                    </div>
                  )}

                  {hasValidated && validationSuccess && (
                    <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
                      <div className="flex items-center">
                        <FiCheck className="h-5 w-5 text-green-500 mr-2" />
                        <span className="font-medium">
                          All validation checks passed!
                        </span>
                      </div>
                      <p className="text-sm mt-1">
                        Your form is ready to be submitted.
                      </p>
                    </div>
                  )}

                  {hasValidated &&
                    !validationSuccess &&
                    Object.keys(errors).length > 0 && (
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
                                    <strong>Title:</strong>{" "}
                                    {errors.title.message}
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
                              {errors.image && (
                                <li className="flex items-start">
                                  <span className="w-2 h-2 bg-red-400 rounded-full mr-2 flex-shrink-0 mt-1.5"></span>
                                  <span>
                                    <strong>Image:</strong>{" "}
                                    {errors.image.message}
                                  </span>
                                </li>
                              )}
                              {errors.tags && (
                                <li className="flex items-start">
                                  <span className="w-2 h-2 bg-red-400 rounded-full mr-2 flex-shrink-0 mt-1.5"></span>
                                  <span>
                                    <strong>Tags:</strong> {errors.tags.message}
                                  </span>
                                </li>
                              )}
                              {errors.duration && (
                                <li className="flex items-start">
                                  <span className="w-2 h-2 bg-red-400 rounded-full mr-2 flex-shrink-0 mt-1.5"></span>
                                  <span>
                                    <strong>Duration:</strong>{" "}
                                    {errors.duration.message}
                                  </span>
                                </li>
                              )}
                              {errors.oldPrice && (
                                <li className="flex items-start">
                                  <span className="w-2 h-2 bg-red-400 rounded-full mr-2 flex-shrink-0 mt-1.5"></span>
                                  <span>
                                    <strong>Old Price:</strong>{" "}
                                    {errors.oldPrice.message}
                                  </span>
                                </li>
                              )}
                              {errors.newPrice && (
                                <li className="flex items-start">
                                  <span className="w-2 h-2 bg-red-400 rounded-full mr-2 flex-shrink-0 mt-1.5"></span>
                                  <span>
                                    <strong>New Price:</strong>{" "}
                                    {errors.newPrice.message}
                                  </span>
                                </li>
                              )}
                              {errors.childPrice && (
                                <li className="flex items-start">
                                  <span className="w-2 h-2 bg-red-400 rounded-full mr-2 flex-shrink-0 mt-1.5"></span>
                                  <span>
                                    <strong>Child Price:</strong>{" "}
                                    {errors.childPrice.message}
                                  </span>
                                </li>
                              )}
                              {errors.minimumPerson && (
                                <li className="flex items-start">
                                  <span className="w-2 h-2 bg-red-400 rounded-full mr-2 flex-shrink-0 mt-1.5"></span>
                                  <span>
                                    <strong>Minimum Persons:</strong>{" "}
                                    {errors.minimumPerson.message}
                                  </span>
                                </li>
                              )}
                              {errors.maximumPerson && (
                                <li className="flex items-start">
                                  <span className="w-2 h-2 bg-red-400 rounded-full mr-2 flex-shrink-0 mt-1.5"></span>
                                  <span>
                                    <strong>Maximum Persons:</strong>{" "}
                                    {errors.maximumPerson.message}
                                  </span>
                                </li>
                              )}
                              {errors.departureTimes && (
                                <li className="flex items-start">
                                  <span className="w-2 h-2 bg-red-400 rounded-full mr-2 flex-shrink-0 mt-1.5"></span>
                                  <span>
                                    <strong>Departure Times:</strong>{" "}
                                    {errors.departureTimes.message}
                                  </span>
                                </li>
                              )}
                              {errors.bookedCount && (
                                <li className="flex items-start">
                                  <span className="w-2 h-2 bg-red-400 rounded-full mr-2 flex-shrink-0 mt-1.5"></span>
                                  <span>
                                    <strong>Booked Count:</strong>{" "}
                                    {errors.bookedCount.message}
                                  </span>
                                </li>
                              )}
                              {errors.period && (
                                <li className="flex items-start">
                                  <span className="w-2 h-2 bg-red-400 rounded-full mr-2 flex-shrink-0 mt-1.5"></span>
                                  <span>
                                    <strong>Period:</strong>{" "}
                                    {errors.period.message}
                                  </span>
                                </li>
                              )}
                              {errors.details?.about && (
                                <li className="flex items-start">
                                  <span className="w-2 h-2 bg-red-400 rounded-full mr-2 flex-shrink-0 mt-1.5"></span>
                                  <span>
                                    <strong>About:</strong>{" "}
                                    {errors.details.about.message}
                                  </span>
                                </li>
                              )}
                              {errors.details?.itinerary && (
                                <li className="flex items-start">
                                  <span className="w-2 h-2 bg-red-400 rounded-full mr-2 flex-shrink-0 mt-1.5"></span>
                                  <span>
                                    <strong>Itinerary:</strong>{" "}
                                    {errors.details.itinerary.message}
                                  </span>
                                </li>
                              )}
                              {errors.details?.pickupLocation && (
                                <li className="flex items-start">
                                  <span className="w-2 h-2 bg-red-400 rounded-full mr-2 flex-shrink-0 mt-1.5"></span>
                                  <span>
                                    <strong>Pickup Location:</strong>{" "}
                                    {errors.details.pickupLocation.message}
                                  </span>
                                </li>
                              )}
                              {errors.details?.note && (
                                <li className="flex items-start">
                                  <span className="w-2 h-2 bg-red-400 rounded-full mr-2 flex-shrink-0 mt-1.5"></span>
                                  <span>
                                    <strong>Important Notes:</strong>{" "}
                                    {errors.details.note.message}
                                  </span>
                                </li>
                              )}
                              {errors.details?.faq && (
                                <li className="flex items-start">
                                  <span className="w-2 h-2 bg-red-400 rounded-full mr-2 flex-shrink-0 mt-1.5"></span>
                                  <span>
                                    <strong>FAQ:</strong>{" "}
                                    {errors.details.faq.message ||
                                      "FAQ validation error"}
                                  </span>
                                </li>
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                  <div className="flex flex-col space-y-3 md:hidden mb-4">
                    <button
                      type="button"
                      onClick={() => setShowClearConfirmation(true)}
                      className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      <FiX size={16} />
                      <span>Clear Form</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleShowErrors}
                      className="w-full px-4 py-2 bg-green-100/50 text-primary rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 hover:bg-green-100"
                    >
                      <FiCheck size={16} />
                      <span>Validate Form</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveTour}
                    disabled={
                      isSubmitting || !hasValidated || !validationSuccess
                    }
                    className={`w-full py-3 px-6 rounded-lg focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors duration-200 flex items-center justify-center space-x-2 ${
                      isSubmitting || !hasValidated || !validationSuccess
                        ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                        : "bg-primary text-white hover:bg-primary/90"
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Updating Tour...</span>
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
                        <FiCheck size={18} />
                        <span>Update Tour</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Validation Errors Display */}
      {showValidationErrors && Object.keys(errors).length > 0 && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg z-50 max-w-md">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <FiX className="h-5 w-5 text-red-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium">
                Please fix the following errors:
              </h3>
              <ul className="mt-1 text-xs list-disc list-inside space-y-1">
                {Object.entries(errors).map(([field, error]: [string, any]) => (
                  <li key={field} className="break-words">
                    {error.message}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <button
            onClick={() => setShowValidationErrors(false)}
            className="absolute top-2 right-2 text-red-500 hover:text-red-700"
            type="button"
          >
            <FiX size={16} />
          </button>
        </div>
      )}

      {/* Confirmation Dialog for Clear Form */}
      <Confirmation
        isOpen={showClearConfirmation}
        title="Clear Form"
        message="Are you sure you want to clear all form data? This action cannot be undone."
        confirmText="Clear"
        cancelText="Cancel"
        onConfirm={handleClearForm}
        onClose={() => setShowClearConfirmation(false)}
        variant="danger"
      />

      {/* Add Vehicle Modal */}
      {showAddVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Add New Vehicle</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Name *
                </label>
                <input
                  type="text"
                  value={vehicleName}
                  onChange={(e) => setVehicleName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter vehicle name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Units *
                </label>
                <input
                  type="number"
                  value={vehicleUnits}
                  onChange={(e) => setVehicleUnits(Number(e.target.value))}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter number of units"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seats per Vehicle *
                </label>
                <input
                  type="number"
                  value={vehicleSeats}
                  onChange={(e) => setVehicleSeats(Number(e.target.value))}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter seats per vehicle"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowAddVehicle(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={createVehicle}
                disabled={vehicleSubmitting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {vehicleSubmitting ? "Creating..." : "Create Vehicle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
