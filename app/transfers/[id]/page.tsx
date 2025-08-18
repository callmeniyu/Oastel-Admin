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
  FiMapPin,
  FiCheck,
} from "react-icons/fi";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { toast } from "react-hot-toast";
import TransferCardPreview from "@/components/TransferCardPreview";
import RichTextEditor from "@/components/RichTextEditor";
import Confirmation from "@/components/ui/Confirmation";
import { transferApi } from "@/lib/transferApi";

// Schema validation
const transferSchema = z
  .object({
    title: z
      .string()
      .min(20, "Title must be at least 20 characters")
      .max(100, "Title cannot exceed 100 characters"),
    slug: z
      .string()
      .regex(
        /^[a-z0-9-]*$/,
        "Slug can only contain lowercase letters, numbers and hyphens"
      )
      .optional()
      .or(z.literal("")),
    image: z.string().min(1, "Please provide an image"),
    tags: z.array(z.string().min(1)).min(1, "At least one tag is required"),
    description: z
      .string()
      .min(50, "Description must be at least 50 characters")
      .max(110, "Description cannot exceed 110 characters"),
    type: z.enum(["Van", "Van + Ferry", "Private"]),
    vehicle: z.string().optional(), // Vehicle name for private transfers
    from: z.string().min(2, "From location is required"),
    to: z.string().min(2, "To location is required"),
    duration: z.string().min(1, "Duration is required"),
    bookedCount: z.number().min(0),
    oldPrice: z.number().min(0, "Old price must be 0 or greater"),
    newPrice: z.number().min(0, "New price must be 0 or greater"),
    childPrice: z.number().min(0, "Child price must be 0 or greater"),
    minimumPerson: z.number().min(1, "Minimum must be at least 1 person"),
    maximumPerson: z.number().min(1, "Maximum must be at least 1 person"),
    departureTimes: z
      .array(z.string())
      .min(1, "At least one departure time is required"),
    label: z.enum(["Recommended", "Popular", "Best Value", "None"]),
    details: z.object({
      about: z
        .string()
        .min(100, "About section must be at least 100 characters"),
      itinerary: z
        .string()
        .min(100, "Itinerary must be at least 100 characters"),
      pickupOption: z.enum(["admin", "user"]),
      pickupLocation: z
        .string()
        .min(10, "Pickup location must be at least 10 characters"),
      pickupDescription: z.string().optional(),
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
      if (data.maximumPerson <= data.minimumPerson) {
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
      if (data.from.toLowerCase() === data.to.toLowerCase()) {
        return false;
      }
      return true;
    },
    {
      message: "From and To locations must be different",
      path: ["to"],
    }
  )
  .refine(
    (data) => {
      // For admin-defined pickup, both location and description are required
      if (data.details.pickupOption === "admin") {
        return (
          data.details.pickupLocation.length >= 10 &&
          data.details.pickupDescription &&
          data.details.pickupDescription.length >= 10
        );
      }
      // For user-defined pickup, only description is required
      return (
        data.details.pickupDescription &&
        data.details.pickupDescription.length >= 10
      );
    },
    {
      message: "Please provide the required pickup information",
      path: ["details.pickupDescription"],
    }
  )
  .refine(
    (data) => {
      // Vehicle is required for Private transfers
      if (data.type === "Private") {
        return data.vehicle && data.vehicle.length >= 2;
      }
      return true;
    },
    {
      message: "Vehicle name is required for private transfers",
      path: ["vehicle"],
    }
  );

type TransferFormData = z.infer<typeof transferSchema>;

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

export default function EditTransferPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { id: transferId } = params;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [slugLoading, setSlugLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageUploading, setImageUploading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");
  const [newTag, setNewTag] = useState("");
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [hasValidated, setHasValidated] = useState(false);
  const [validationSuccess, setValidationSuccess] = useState(false);
  const [originalSlug, setOriginalSlug] = useState<string>("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedChangesConfirmation, setShowUnsavedChangesConfirmation] =
    useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<
    (() => void) | null
  >(null);
  const [isNavigating, setIsNavigating] = useState(false);

  // Section visibility states
  const [sectionsExpanded, setSectionsExpanded] = useState({
    basicInfo: true,
    routeInfo: true,
    pricing: false,
    departureTimes: false,
    transferDetails: false,
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
    type: "Van" as const,
    vehicle: "", // Vehicle name for private transfers
    label: "None" as const,
    departureTimes: ["08:00"],
    oldPrice: 0,
    newPrice: 0,
    childPrice: 0,
    minimumPerson: 1,
    maximumPerson: 10,
    tags: [],
    from: "",
    to: "",
    details: {
      about: "",
      itinerary: "",
      pickupOption: "admin" as "admin" | "user",
      pickupLocation: "",
      pickupDescription: "",
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
    clearErrors,
    formState: { errors, isValid },
  } = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
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
  const watchLabel = watch("label");
  const watchSlug = watch("slug");
  const watchFrom = watch("from");
  const watchTo = watch("to");
  const watchPickupOption = watch("details.pickupOption");
  const watchDetailsPickupLocation = watch("details.pickupLocation");
  const watchDetailsPickupDescription = watch("details.pickupDescription");

  // Reset validation state when any form field changes
  useEffect(() => {
    // Skip setting unsaved changes during initial load or when navigating
    if (isLoading || isNavigating) return;

    if (hasValidated) {
      setHasValidated(false);
      setValidationSuccess(false);
      setShowValidationErrors(false);
    }
    // Mark form as having unsaved changes when any field is modified
    setHasUnsavedChanges(true);
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
    watchLabel,
    watchSlug,
    watchFrom,
    watchTo,
    watchPickupOption,
    watchDetailsPickupLocation,
    watchDetailsPickupDescription,
    isLoading,
    isNavigating,
  ]);

  // Clear unsaved changes flag when form is initially loaded or submitted successfully
  useEffect(() => {
    if (!isLoading) {
      // Set a timeout to avoid triggering unsaved changes immediately after data load
      const timer = setTimeout(() => {
        setHasUnsavedChanges(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // Add beforeunload event listener to warn about unsaved changes on page refresh/close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && !isNavigating) {
        e.preventDefault();
        e.returnValue =
          "You have unsaved changes. Are you sure you want to leave?";
        return "You have unsaved changes. Are you sure you want to leave?";
      }
    };

    // Handle popstate (browser back/forward buttons)
    const handlePopState = (e: PopStateEvent) => {
      if (hasUnsavedChanges && !isNavigating) {
        e.preventDefault();
        // Store the intended destination
        const currentPath = window.location.pathname;
        // Push current state back to prevent navigation
        window.history.pushState(null, "", currentPath);

        // Show confirmation dialog
        setPendingNavigation(() => () => {
          setIsNavigating(true);
          window.history.back();
        });
        setShowUnsavedChangesConfirmation(true);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [hasUnsavedChanges, isNavigating]);

  // Handle navigation with unsaved changes check
  const handleNavigation = (navigationFn: () => void) => {
    if (hasUnsavedChanges && !isNavigating) {
      setPendingNavigation(() => navigationFn);
      setShowUnsavedChangesConfirmation(true);
    } else {
      navigationFn();
    }
  };

  // Confirm navigation and lose unsaved changes
  const confirmNavigation = () => {
    setShowUnsavedChangesConfirmation(false);
    setIsNavigating(true);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  };

  // Cancel navigation
  const cancelNavigation = () => {
    setShowUnsavedChangesConfirmation(false);
    setPendingNavigation(null);
  };

  // Fetch existing transfer data on component mount
  useEffect(() => {
    const fetchTransferData = async () => {
      try {
        setIsLoading(true);
        const response = await transferApi.getTransferById(transferId);

        if (response.success) {
          const transfer = response.data as any; // Temporary cast to handle vehicle field

          // Map API response to form structure
          const formData: TransferFormData = {
            title: transfer.title || "",
            slug: transfer.slug || "",
            image: transfer.image || "",
            tags: transfer.tags || [],
            description: transfer.desc || "", // API uses 'desc', form uses 'description'
            type: (transfer.type as "Van" | "Van + Ferry" | "Private") || "Van",
            vehicle: transfer.vehicle || "", // Vehicle name for private transfers
            from: transfer.from || "",
            to: transfer.to || "",
            duration: transfer.duration || "",
            bookedCount: transfer.bookedCount || 0,
            oldPrice: transfer.oldPrice || 0,
            newPrice: transfer.newPrice || 0,
            childPrice: transfer.childPrice || 0,
            minimumPerson: transfer.minimumPerson || 1,
            maximumPerson: transfer.maximumPerson || 10,
            departureTimes: transfer.times || ["08:00"], // API uses 'times', form uses 'departureTimes'
            label:
              (transfer.label as
                | "Recommended"
                | "Popular"
                | "Best Value"
                | "None") || "None",
            details: {
              about: transfer.details?.about || "",
              itinerary: transfer.details?.itinerary || "",
              pickupOption:
                (transfer.details?.pickupOption as "admin" | "user") || "admin",
              pickupLocation:
                transfer.details?.pickupOption === "admin"
                  ? transfer.details?.pickupLocations || ""
                  : "",
              pickupDescription: transfer.details?.pickupLocations || "",
              note: transfer.details?.note || "",
              faq:
                transfer.details?.faq && transfer.details.faq.length > 0
                  ? transfer.details.faq
                  : [{ question: "", answer: "" }],
            },
          };

          // Set form values
          reset(formData);

          // Set other state values
          setOriginalSlug(transfer.slug || "");
          setUploadedImageUrl(transfer.image || "");
          setImagePreview(transfer.image || "");
        } else {
          toast.error("Failed to load transfer data ❌", {
            duration: 4000,
          });
          router.push("/transfers");
        }
      } catch (error) {
        console.error("Error fetching transfer:", error);
        toast.error("Failed to load transfer data ❌", {
          duration: 4000,
        });
        router.push("/transfers");
      } finally {
        setIsLoading(false);
      }
    };

    if (transferId) {
      fetchTransferData();
    }
  }, [transferId, router, reset]);

  // Hide validation errors when user starts making changes
  useEffect(() => {
    if (showValidationErrors) {
      const timer = setTimeout(() => {
        setShowValidationErrors(false);
      }, 2000); // Hide errors after 2 seconds of making changes

      return () => clearTimeout(timer);
    }
  }, [showValidationErrors]);

  // Clear vehicle field when transfer type changes from Private to other types
  useEffect(() => {
    if (watchType !== "Private") {
      setValue("vehicle", "");
    }
  }, [watchType, setValue]);

  // Clear form function
  const handleClearForm = () => {
    setShowClearConfirmation(true);
  };

  const confirmClearForm = () => {
    try {
      // Reset other states first
      setImagePreview("");
      setUploadedImageUrl("");
      setImageUploading(false);
      setNewTag("");
      setHasValidated(false);
      setValidationSuccess(false);
      setHasUnsavedChanges(false); // Clear unsaved changes flag

      // Reset section expansion to default
      setSectionsExpanded({
        basicInfo: true,
        routeInfo: true,
        pricing: false,
        departureTimes: false,
        transferDetails: false,
        faq: false,
      });

      // Reset form to default values
      reset(defaultValues);

      toast.success("Form cleared! 🗑️", {
        duration: 3000,
      });
    } catch (error) {
      console.error("Error clearing form:", error);
      toast.error("Failed to clear form. Please try again. ❌", {
        duration: 3000,
      });
    }
  };

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

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file ⚠️", {
        duration: 3000,
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB ⚠️", {
        duration: 4000,
      });
      return;
    }

    setImageUploading(true);
    setImagePreview(URL.createObjectURL(file));

    try {
      const response = await transferApi.uploadImage(file);

      if (response.success) {
        setUploadedImageUrl(response.data.imageUrl);
        setValue("image", response.data.imageUrl);
        clearErrors("image");
        toast.success("Image uploaded successfully! 📸", {
          duration: 3000,
        });
      } else {
        throw new Error("Failed to upload image");
      }
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error(
        error.message || "Failed to upload image. Please try again. ❌",
        {
          duration: 4000,
        }
      );
      // Clear preview on error
      setImagePreview("");
      setUploadedImageUrl("");
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

  const handleSaveTransfer = async () => {
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

  const onSubmit = async (data: TransferFormData) => {
    try {
      // Check if image is uploaded to Cloudinary
      if (!uploadedImageUrl) {
        toast.error("Please wait for the image to finish uploading", {
          duration: 3000,
        });
        return;
      }

      setIsSubmitting(true);

      // All validation already done in handleSaveTransfer
      const validFaqs = data.details.faq.filter(
        (faq) => faq.question.trim() && faq.answer.trim()
      );

      // Prepare transfer data for API
      const transferData = {
        ...data,
        // Use Cloudinary URL for upload method, or use the URL/preview for URL method
        image: uploadedImageUrl,
        details: {
          ...data.details,
          faq: validFaqs,
          // For admin-defined pickup, use pickupLocation; for user-defined, use pickupDescription
          pickupLocations:
            data.details.pickupOption === "admin"
              ? data.details.pickupLocation || ""
              : data.details.pickupDescription || "",
        },
        // Map form field names to API field names
        desc: data.description,
        times: data.departureTimes,
      };

      // Remove the form-specific fields that don't exist in the API
      const {
        description,
        departureTimes,
        details: { pickupLocation, pickupDescription, ...detailsRest },
        ...rest
      } = transferData;
      const finalTransferData = {
        ...rest,
        details: detailsRest,
        desc: description,
        times: departureTimes,
        // ensure vehicle is explicitly preserved
        vehicle: data.vehicle || rest.vehicle || "",
      };
      console.log("Updating transfer:", finalTransferData); // Debug log

      // Call the API to update the transfer
      const response = await transferApi.updateTransfer(
        transferId,
        finalTransferData
      );

      console.log("Transfer updated successfully"); // Debug log
      toast.success("Transfer updated successfully! 🚐", {
        duration: 4000,
      });
      setHasUnsavedChanges(false); // Clear unsaved changes flag
      setIsNavigating(true); // Prevent unsaved changes dialog during navigation
      router.push("/transfers");
    } catch (error) {
      console.error("Error updating transfer:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update transfer. Please try again. ❌",
        {
          duration: 4000,
        }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle validation button click
  const handleShowErrors = async () => {
    // Trigger validation
    const isFormValid = await trigger();

    // Additional custom validation
    if (isFormValid) {
      const currentData = getValues();
      const validFaqs = currentData.details.faq.filter(
        (faq) => faq.question.trim() && faq.answer.trim()
      );
      if (validFaqs.length === 0) {
        setValidationSuccess(false);
      } else {
        setValidationSuccess(true);
      }
    } else {
      setValidationSuccess(false);
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
              <h1 className="text-3xl font-bold text-gray-900">
                Edit Transfer
              </h1>
              <p className="text-gray-600 mt-2">
                Update and configure this transfer service
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Mobile Close Button */}
              <button
                type="button"
                onClick={() =>
                  handleNavigation(() => router.push("/transfers"))
                }
                className="md:hidden p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center"
                title="Close and go back to transfers"
                disabled={isLoading}
              >
                <FiX size={20} />
              </button>

              {/* Desktop Buttons */}
              <div className="hidden md:flex space-x-4">
                <button
                  type="button"
                  onClick={handleClearForm}
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
              <p className="text-gray-600">Loading transfer data...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Transfer Info */}
              <div className="lg:col-span-2 space-y-6">
                <CollapsibleSection
                  title="Basic Information"
                  isExpanded={sectionsExpanded.basicInfo}
                  onToggle={() => toggleSection("basicInfo")}
                >
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Transfer Title *
                      </label>
                      <input
                        {...register("title")}
                        type="text"
                        className={`w-full px-3 py-2 border rounded-md ${
                          errors.title ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="E.g., Private Van Transfer from Kuala Lumpur to Cameron Highlands"
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
                        placeholder="Brief description of the transfer service (50-110 characters)"
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
                        Transfer Image *
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
                                PNG, JPG, JPEG up to 5MB
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
                                placeholder="Eg: Scenic, Private, Ferry"
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

                {/* Route Information */}
                <CollapsibleSection
                  title="Route Information"
                  isExpanded={sectionsExpanded.routeInfo}
                  onToggle={() => toggleSection("routeInfo")}
                >
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          From *
                        </label>
                        <div className="relative">
                          <input
                            {...register("from")}
                            type="text"
                            className={`w-full px-3 py-2 border rounded-md ${
                              errors.from ? "border-red-500" : "border-gray-300"
                            }`}
                            placeholder="E.g., Kuala Lumpur International Airport"
                          />
                          <FiMapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        </div>
                        <p className="text-xs text-red-500 mt-1">
                          {errors.from?.message}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          To *
                        </label>
                        <div className="relative">
                          <input
                            {...register("to")}
                            type="text"
                            className={`w-full px-3 py-2 border rounded-md ${
                              errors.to ? "border-red-500" : "border-gray-300"
                            }`}
                            placeholder="E.g., Cameron Highlands"
                          />
                          <FiMapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        </div>
                        <p className="text-xs text-red-500 mt-1">
                          {errors.to?.message}
                        </p>
                      </div>
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
                          placeholder="E.g. 3, 3-4"
                        />
                        <FiClock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      </div>
                      <p className="text-xs text-red-500 mt-1">
                        {errors.duration?.message}
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
                        Transfer Type *
                      </label>
                      <select
                        {...register("type")}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="Van">Van</option>
                        <option value="Van + Ferry">Van + Ferry</option>
                        <option value="Private">Private</option>
                      </select>
                    </div>

                    {/* Vehicle field - only show for Private transfers */}
                    {watchType === "Private" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Vehicle Name *
                        </label>
                        <input
                          type="text"
                          {...register("vehicle")}
                          placeholder="e.g., Toyota Innova, Mercedes Vito"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                        {errors.vehicle && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors.vehicle.message}
                          </p>
                        )}
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
                      </select>
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

                {/* Transfer Details */}
                <CollapsibleSection
                  title="Transfer Details"
                  isExpanded={sectionsExpanded.transferDetails}
                  onToggle={() => toggleSection("transferDetails")}
                >
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        About This Transfer *
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
                            placeholder="Describe what makes this transfer service special..."
                            error={!!errors.details?.about}
                          />
                        )}
                      />
                      <p className="text-xs text-red-500 mt-1">
                        {errors.details?.about?.message}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Route & Schedule *
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
                            placeholder="Detail the transfer route, stops, and schedule..."
                            error={!!errors.details?.itinerary}
                          />
                        )}
                      />
                      <p className="text-xs text-red-500 mt-1">
                        {errors.details?.itinerary?.message}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Pickup Location Management *
                      </label>

                      {/* Pickup Option Selector */}
                      <div className="mb-4">
                        <div className="flex gap-4 mb-3">
                          <button
                            type="button"
                            onClick={() =>
                              setValue("details.pickupOption", "admin")
                            }
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                              watchPickupOption === "admin"
                                ? "bg-primary text-white"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            Admin Defines Location
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setValue("details.pickupOption", "user")
                            }
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                              watchPickupOption === "user"
                                ? "bg-primary text-white"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            User Provides Location
                          </button>
                        </div>

                        {/* Option descriptions */}
                        <div className="text-xs text-gray-600 mb-3">
                          {watchPickupOption === "admin" ? (
                            <p>
                              💡 You will specify exact pickup locations and
                              instructions for customers
                            </p>
                          ) : (
                            <p>
                              💡 Customers will be asked to provide their pickup
                              location during booking
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Conditional Content Based on Option */}
                      {watchPickupOption === "admin" ? (
                        // Admin-defined pickup - show both location and description fields
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Exact Pickup Location *
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
                                  placeholder="Provide the exact pickup location(s) - specific addresses, meeting points, landmarks, etc."
                                  error={!!errors.details?.pickupLocation}
                                />
                              )}
                            />
                            <p className="text-xs text-red-500 mt-1">
                              {errors.details?.pickupLocation?.message}
                            </p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Pickup Instructions & Description *
                            </label>
                            <Controller
                              name="details.pickupDescription"
                              control={control}
                              render={({ field }) => (
                                <RichTextEditor
                                  content={field.value || ""}
                                  onChange={(content) => {
                                    field.onChange(content);
                                  }}
                                  placeholder="Provide additional instructions, contact information, timing details, what customers should expect, etc."
                                  error={!!errors.details?.pickupDescription}
                                />
                              )}
                            />
                            <p className="text-xs text-red-500 mt-1">
                              {errors.details?.pickupDescription?.message}
                            </p>
                          </div>
                        </div>
                      ) : (
                        // User-defined pickup - show description field only
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Pickup Location Description *
                          </label>
                          <Controller
                            name="details.pickupDescription"
                            control={control}
                            render={({ field }) => (
                              <RichTextEditor
                                content={field.value || ""}
                                onChange={(content) => {
                                  field.onChange(content);
                                }}
                                placeholder="Describe what pickup information customers should provide (e.g., 'Please provide your hotel name and full address' or 'Specify your pickup location within the city center')..."
                                error={!!errors.details?.pickupDescription}
                              />
                            )}
                          />
                          <p className="text-xs text-red-500 mt-1">
                            {errors.details?.pickupDescription?.message}
                          </p>
                        </div>
                      )}
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
                            placeholder="Luggage restrictions, cancellation policy, contact information, etc..."
                            error={!!errors.details?.note}
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
              <div className="space-y-6">
                <div className="top-6">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                      <h2 className="text-xl font-semibold">Preview</h2>
                    </div>
                    <div className="px-6 py-4">
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600 mb-4">
                          Preview how your transfer will appear to users
                        </p>

                        {watchTitle || watchImage || uploadedImageUrl ? (
                          <TransferCardPreview
                            slug={watchSlug || "sample-transfer"}
                            image={
                              uploadedImageUrl ||
                              watchImage ||
                              imagePreview ||
                              "/images/placeholder-transfer.jpg"
                            }
                            title={watchTitle || "Sample Transfer Title"}
                            tags={
                              watchTags && watchTags.length > 0
                                ? watchTags
                                : ["Sample Tag"]
                            }
                            desc={
                              watchDescription ||
                              "Sample transfer description..."
                            }
                            duration={watchDuration || "3"}
                            bookedCount={watchBookedCount || 0}
                            oldPrice={watchOldPrice || 0}
                            newPrice={watchNewPrice || 0}
                            childPrice={watchChildPrice || 0}
                            type={watchType || "Van"}
                            label={watchLabel !== "None" ? watchLabel : null}
                            status="active"
                            from={watchFrom || "Sample Origin"}
                            to={watchTo || "Sample Destination"}
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
                          <span className="font-medium">
                            Validation Required
                          </span>
                        </div>
                        <p className="text-sm mt-1">
                          Please click "Validate Form" to check for errors
                          before creating your transfer.
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
                                      <strong>Slug:</strong>{" "}
                                      {errors.slug.message}
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
                                {errors.from && (
                                  <li className="flex items-start">
                                    <span className="w-2 h-2 bg-red-400 rounded-full mr-2 flex-shrink-0 mt-1.5"></span>
                                    <span>
                                      <strong>From:</strong>{" "}
                                      {errors.from.message}
                                    </span>
                                  </li>
                                )}
                                {errors.to && (
                                  <li className="flex items-start">
                                    <span className="w-2 h-2 bg-red-400 rounded-full mr-2 flex-shrink-0 mt-1.5"></span>
                                    <span>
                                      <strong>To:</strong> {errors.to.message}
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
                                      <strong>Current Price:</strong>{" "}
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
                                {errors.details?.about && (
                                  <li className="flex items-start">
                                    <span className="w-2 h-2 bg-red-400 rounded-full mr-2 flex-shrink-0 mt-1.5"></span>
                                    <span>
                                      <strong>About Transfer:</strong>{" "}
                                      {errors.details.about.message}
                                    </span>
                                  </li>
                                )}
                                {errors.details?.itinerary && (
                                  <li className="flex items-start">
                                    <span className="w-2 h-2 bg-red-400 rounded-full mr-2 flex-shrink-0 mt-1.5"></span>
                                    <span>
                                      <strong>Route & Schedule:</strong>{" "}
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
                      onClick={handleSaveTransfer}
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
                          <span>Updating Transfer...</span>
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
                          <span>Update Transfer</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Clear Form Confirmation Modal */}
        <Confirmation
          isOpen={showClearConfirmation}
          onClose={() => setShowClearConfirmation(false)}
          onConfirm={confirmClearForm}
          title="Clear Form Data"
          message="Are you sure you want to clear all form data? This action cannot be undone."
          confirmText="Clear All"
          cancelText="Cancel"
          variant="danger"
        />

        {/* Unsaved Changes Confirmation Modal */}
        <Confirmation
          isOpen={showUnsavedChangesConfirmation}
          title="Unsaved Changes"
          message="You have unsaved changes that will be lost if you continue. Make sure to save your changes before leaving."
          confirmText="Leave Without Saving"
          cancelText="Stay and Save"
          onConfirm={confirmNavigation}
          onClose={cancelNavigation}
          variant="danger"
        />
      </div>
    </div>
  );
}
