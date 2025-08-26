"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import {
  FiX,
  FiCalendar,
  FiClock,
  FiUsers,
  FiMapPin,
  FiDollarSign,
} from "react-icons/fi";

interface TimeSlot {
  time: string;
  capacity: number;
  bookedCount: number;
  isAvailable: boolean;
  minimumPerson: number;
}

interface ContactInfo {
  name: string;
  email: string;
  phone: string;
}

interface AdminBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onBookingComplete?: (bookingData: any) => void;
  packageType: "tour" | "transfer";
  packageDetails: {
    _id: string;
    title: string;
    newPrice: number;
    childPrice?: number;
    minimumPerson: number;
    maximumPerson?: number;
    type?: string;
    from?: string;
    to?: string;
    details?: {
      pickupLocations?: string;
      pickupOption?: string;
    };
  };
}

export default function AdminBookingModal({
  isOpen,
  onClose,
  onSuccess,
  onBookingComplete,
  packageType,
  packageDetails,
}: AdminBookingModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState("");
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [adults, setAdults] = useState(packageDetails.minimumPerson || 1);
  const [children, setChildren] = useState(0);
  const [pickupLocation, setPickupLocation] = useState("");
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    name: "",
    email: "",
    phone: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate minimum date (tomorrow)
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);

  useEffect(() => {
    if (isOpen && packageDetails._id) {
      fetchTimeSlots();
    }
  }, [isOpen, selectedDate, packageDetails._id]);

  // Compute currently selected slot (if any)
  const selectedSlot = timeSlots.find((s) => s.time === selectedTime);

  // Ensure adults respect slot/package minimum when slot changes
  useEffect(() => {
    const requiredMinimum =
      selectedSlot?.minimumPerson || packageDetails.minimumPerson || 1;
    if (adults < requiredMinimum) {
      setAdults(requiredMinimum);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTime, selectedSlot, packageDetails.minimumPerson]);

  const fetchTimeSlots = async () => {
    if (!packageDetails._id) return;

    try {
      setIsLoading(true);
      const formattedDate = format(selectedDate, "yyyy-MM-dd");

      const response = await fetch(
        `/api/timeslots?packageType=${packageType}&packageId=${packageDetails._id}&date=${formattedDate}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setTimeSlots(data.data || []);
        // Reset selected time when date changes
        setSelectedTime("");
      } else {
        console.error("Failed to fetch time slots:", data.message);
        setTimeSlots([]);
      }
    } catch (error) {
      console.error("Error fetching time slots:", error);
      setTimeSlots([]);
      toast.error("Failed to load available time slots");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotalPrice = () => {
    if (packageType === "tour" && packageDetails.type === "private") {
      // Private tours - price for entire group divided by 8 people
      return Math.ceil(adults / 8) * packageDetails.newPrice;
    } else {
      // Regular pricing per person
      return (
        adults * packageDetails.newPrice +
        children * (packageDetails.childPrice || 0)
      );
    }
  };

  const validateBooking = () => {
    const totalGuests = adults + children;

    // Check if date and time are selected
    if (!selectedDate) {
      toast.error("Please select a date");
      return false;
    }

    if (!selectedTime) {
      toast.error("Please select a time slot");
      return false;
    }

    // Check slot availability
    const selectedSlot = timeSlots.find((slot) => slot.time === selectedTime);
    if (!selectedSlot) {
      toast.error("Selected time slot is no longer available");
      return false;
    }

    // **MINIMUM PERSON RULE** - Check if this is the first booking for the slot
    const isFirstBooking = selectedSlot.bookedCount === 0;
    const requiredMinimum =
      selectedSlot.minimumPerson || packageDetails.minimumPerson || 1;

    if (isFirstBooking && totalGuests < requiredMinimum) {
      toast.error(
        `This is the first booking for this time slot. Minimum ${requiredMinimum} person${
          requiredMinimum > 1 ? "s" : ""
        } required.`
      );
      return false;
    }

    // For subsequent bookings (not first), minimum 1 adult is enough
    if (adults < 1) {
      toast.error("At least 1 adult is required");
      return false;
    }

    // Check maximum persons if defined
    if (
      packageDetails.maximumPerson &&
      totalGuests > packageDetails.maximumPerson
    ) {
      toast.error(`Maximum ${packageDetails.maximumPerson} guests allowed`);
      return false;
    }

    const availableCapacity = selectedSlot.capacity - selectedSlot.bookedCount;
    if (totalGuests > availableCapacity) {
      toast.error(
        `Only ${availableCapacity} seats available for this time slot`
      );
      return false;
    }

    // Check pickup location for transfers
    if (packageType === "transfer" && !pickupLocation.trim()) {
      toast.error("Pickup location is required for transfers");
      return false;
    }

    // Check contact info
    if (!contactInfo.name.trim()) {
      toast.error("Customer name is required");
      return false;
    }

    if (!contactInfo.email.trim()) {
      toast.error("Customer email is required");
      return false;
    }

    if (!contactInfo.phone.trim()) {
      toast.error("Customer phone is required");
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactInfo.email)) {
      toast.error("Please enter a valid email address");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateBooking()) {
      return;
    }

    try {
      setIsSubmitting(true);

      const bookingData = {
        packageType,
        packageId: packageDetails._id,
        date: format(selectedDate, "yyyy-MM-dd"),
        time: selectedTime,
        adults,
        children,
        pickupLocation: pickupLocation.trim(),
        contactInfo: {
          name: contactInfo.name.trim(),
          email: contactInfo.email.trim(),
          phone: contactInfo.phone.trim(),
          whatsapp: contactInfo.phone.trim(), // Use phone as WhatsApp
        },
        subtotal: calculateTotalPrice(),
        total: calculateTotalPrice(),
        paymentInfo: {
          amount: calculateTotalPrice(),
          bankCharge: 0,
          currency: "MYR",
          paymentStatus: "succeeded", // Admin bookings are pre-paid
        },
        // Mark as admin booking for tracking
        isAdminBooking: true,
      };

      // Create booking using existing booking API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bookings`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bookingData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();

      if (data.success) {
        toast.success("Booking created successfully!");

        // Prepare confirmation data
        const confirmationData = {
          bookingId: data.data._id || data.data.id || `BK${Date.now()}`,
          packageType,
          packageTitle: packageDetails.title,
          date: format(selectedDate, "yyyy-MM-dd"),
          time: selectedTime,
          adults,
          children,
          // mark if this package is private so consumers can render appropriately
          isPrivate: (packageDetails.type || "").toString().toLowerCase() === "private",
          pickupLocation: pickupLocation.trim(),
          customerName: contactInfo.name.trim(),
          customerEmail: contactInfo.email.trim(),
          customerPhone: contactInfo.phone.trim(),
          total: calculateTotalPrice(),
        };

        onSuccess?.();
        onClose();
        resetForm();

        // Show confirmation if callback provided
        if (onBookingComplete) {
          onBookingComplete(confirmationData);
        }
      } else {
        throw new Error(data.error || "Failed to create booking");
      }
    } catch (error) {
      console.error("Error creating booking:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create booking"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedDate(new Date());
    setSelectedTime("");
    setTimeSlots([]);
    setAdults(packageDetails.minimumPerson || 1);
    setChildren(0);
    setPickupLocation("");
    setContactInfo({
      name: "",
      email: "",
      phone: "",
    });
  };

  const formatTimeDisplay = (time: string) => {
    try {
      const [hours, minutes] = time.split(":");
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? "PM" : "AM";
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    } catch {
      return time;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Create Admin Booking
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {packageDetails.title} (
              {packageType === "tour" ? "Tour" : "Transfer"})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiCalendar className="inline w-4 h-4 mr-1" />
                Select Date
              </label>
              <input
                type="date"
                value={format(selectedDate, "yyyy-MM-dd")}
                min={format(minDate, "yyyy-MM-dd")}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>

            {/* Time Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiClock className="inline w-4 h-4 mr-1" />
                Select Time
              </label>
              {isLoading ? (
                <div className="p-3 border border-gray-300 rounded-lg bg-gray-50">
                  <p className="text-sm text-gray-500">Loading time slots...</p>
                </div>
              ) : timeSlots.length > 0 ? (
                <select
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                >
                  <option value="">Select a time</option>
                  {timeSlots.map((slot) => {
                    const availableSeats = slot.capacity - slot.bookedCount;
                    const isSlotAvailable =
                      slot.isAvailable && availableSeats > 0;

                    return (
                      <option
                        key={slot.time}
                        value={slot.time}
                        disabled={!isSlotAvailable}
                      >
                        {formatTimeDisplay(slot.time)}
                        {isSlotAvailable
                          ? ` (${availableSeats} seats available)`
                          : " (Fully booked)"}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <div className="p-3 border border-gray-300 rounded-lg bg-gray-50">
                  <p className="text-sm text-gray-500">
                    No time slots available for this date
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Guest Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FiUsers className="inline w-4 h-4 mr-1" />
                Adults (RM {packageDetails.newPrice}
                {packageDetails.type === "private" ? "/group" : "/person"})
              </label>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() =>
                    setAdults(
                      Math.max(
                        selectedSlot?.minimumPerson ||
                          packageDetails.minimumPerson ||
                          1,
                        adults - 1
                      )
                    )
                  }
                  disabled={
                    adults <=
                    (selectedSlot?.minimumPerson ||
                      packageDetails.minimumPerson ||
                      1)
                  }
                  className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  -
                </button>
                <span className="text-lg font-semibold min-w-[2rem] text-center">
                  {adults}
                </span>
                <button
                  type="button"
                  onClick={() => setAdults(adults + 1)}
                  disabled={
                    packageDetails.maximumPerson
                      ? adults + children >= packageDetails.maximumPerson
                      : false
                  }
                  className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Minimum:{" "}
                {selectedSlot?.minimumPerson ||
                  packageDetails.minimumPerson ||
                  1}{" "}
                adult(s)
              </p>
            </div>

            {packageDetails.type !== "private" &&
              packageDetails.childPrice !== undefined && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiUsers className="inline w-4 h-4 mr-1" />
                    Children (RM {packageDetails.childPrice}/person)
                  </label>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => setChildren(Math.max(0, children - 1))}
                      disabled={children <= 0}
                      className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      -
                    </button>
                    <span className="text-lg font-semibold min-w-[2rem] text-center">
                      {children}
                    </span>
                    <button
                      type="button"
                      onClick={() => setChildren(children + 1)}
                      disabled={
                        packageDetails.maximumPerson
                          ? adults + children >= packageDetails.maximumPerson
                          : false
                      }
                      className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Ages 3-11. Under 3 travel free.
                  </p>
                </div>
              )}
          </div>

          {/* Pickup Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FiMapPin className="inline w-4 h-4 mr-1" />
              Pickup Location{" "}
              {packageType === "transfer" ? "(Required)" : "(Optional)"}
            </label>
            {packageType === "transfer" &&
            packageDetails.details?.pickupLocations ? (
              <select
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required={packageType === "transfer"}
              >
                <option value="">Select pickup location</option>
                {packageDetails.details.pickupLocations
                  .split(",")
                  .map((location, index) => (
                    <option key={index} value={location.trim()}>
                      {location.trim()}
                    </option>
                  ))}
              </select>
            ) : (
              <input
                type="text"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                placeholder={
                  packageType === "tour"
                    ? "Enter pickup location or hotel name"
                    : "Enter pickup location"
                }
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required={packageType === "transfer"}
              />
            )}
          </div>

          {/* Customer Information */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Customer Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={contactInfo.name}
                  onChange={(e) =>
                    setContactInfo({ ...contactInfo, name: e.target.value })
                  }
                  placeholder="Customer's full name"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={contactInfo.email}
                  onChange={(e) =>
                    setContactInfo({ ...contactInfo, email: e.target.value })
                  }
                  placeholder="customer@example.com"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={contactInfo.phone}
                  onChange={(e) =>
                    setContactInfo({ ...contactInfo, phone: e.target.value })
                  }
                  placeholder="+60123456789"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>
            </div>
          </div>

          {/* Price Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              <FiDollarSign className="inline w-5 h-5 mr-1" />
              Price Summary
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>
                  Adults ({adults}x RM {packageDetails.newPrice})
                </span>
                <span>RM {(adults * packageDetails.newPrice).toFixed(2)}</span>
              </div>
              {children > 0 && packageDetails.childPrice && (
                <div className="flex justify-between">
                  <span>
                    Children ({children}x RM {packageDetails.childPrice})
                  </span>
                  <span>
                    RM {(children * packageDetails.childPrice).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>Total Amount</span>
                <span>RM {calculateTotalPrice().toFixed(2)}</span>
              </div>
              <p className="text-sm text-gray-600">
                * Admin booking - Payment collected in cash
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting ||
                !selectedDate ||
                !selectedTime ||
                !contactInfo.name ||
                !contactInfo.email ||
                !contactInfo.phone
              }
              className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? "Creating Booking..." : "Create Booking"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
