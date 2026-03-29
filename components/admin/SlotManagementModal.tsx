"use client";

import { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { tourApi } from "@/lib/tourApi";
import { toast } from "react-hot-toast";
import { FiCalendar, FiX, FiCheck, FiClock } from "react-icons/fi";
import Confirmation from "@/components/ui/Confirmation";

interface SlotManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  packageId: string;
  packageName: string;
  packageType: "tour" | "transfer";
  departureTimes: string[];
}

export default function SlotManagementModal({
  isOpen,
  onClose,
  packageId,
  packageName,
  packageType,
  departureTimes,
}: SlotManagementModalProps) {
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState<{
    show: boolean;
    isAvailable: boolean;
  }>({ show: false, isAvailable: false });

  if (!isOpen) return null;

  const toggleTime = (time: string) => {
    setSelectedTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time],
    );
  };

  const handleToggleRange = async (isAvailable: boolean) => {
    try {
      setIsSubmitting(true);

      const toMYT = (date: Date) => {
        const mytOffset = 8 * 60;
        const utcDate = new Date(
          date.getTime() + date.getTimezoneOffset() * 60000,
        );
        return new Date(utcDate.getTime() + mytOffset * 60000);
      };

      const mytStart = toMYT(startDate);
      const mytEnd = toMYT(endDate);

      const formattedStartDate = mytStart.toISOString().split("T")[0];
      const formattedEndDate = mytEnd.toISOString().split("T")[0];

      const response = await tourApi.toggleSlotsRange({
        packageId,
        packageType,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        times: selectedTimes,
        isAvailable,
      });

      if (response.success) {
        toast.success(
          `Successfully ${isAvailable ? "enabled" : "disabled"} ${
            response.data.updatedCount
          } time slot records`,
        );
        onClose();
      } else {
        toast.error(response.message || "Failed to update slots");
      }
    } catch (error) {
      console.error("Error updating slots:", error);
      toast.error("An error occurred while updating slots");
    } finally {
      setIsSubmitting(false);
      setShowConfirm({ show: false, isAvailable: false });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            Manage Time Slots: {packageName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Date Range Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <DatePicker
                selected={startDate}
                onChange={(date) => date && setStartDate(date)}
                selectsStart
                startDate={startDate}
                endDate={endDate}
                minDate={new Date()}
                dateFormat="dd/MM/yyyy"
                className="w-full p-2 border rounded-lg focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <DatePicker
                selected={endDate}
                onChange={(date) => date && setEndDate(date)}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate}
                dateFormat="dd/MM/yyyy"
                className="w-full p-2 border rounded-lg focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          {/* Time Slots Selection */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <FiClock className="mr-2" /> Select Time Slots to Apply
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() =>
                  setSelectedTimes(
                    selectedTimes.length === departureTimes.length
                      ? []
                      : [...departureTimes],
                  )
                }
                className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 mb-2 w-full text-left"
              >
                {selectedTimes.length === departureTimes.length
                  ? "Deselect All"
                  : "Select All"}
              </button>
              {departureTimes.map((time) => (
                <button
                  key={time}
                  onClick={() => toggleTime(time)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                    selectedTimes.includes(time)
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-gray-700 border-gray-200 hover:border-primary"
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex flex-col sm:flex-row justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => setShowConfirm({ show: true, isAvailable: false })}
            disabled={isSubmitting || selectedTimes.length === 0}
            className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiX className="mr-2" /> Disable Selected
          </button>
          <button
            onClick={() => setShowConfirm({ show: true, isAvailable: true })}
            disabled={isSubmitting || selectedTimes.length === 0}
            className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiCheck className="mr-2" /> Enable Selected
          </button>
        </div>
      </div>

      <Confirmation
        isOpen={showConfirm.show}
        onClose={() => setShowConfirm({ show: false, isAvailable: false })}
        onConfirm={() => handleToggleRange(showConfirm.isAvailable)}
        title={showConfirm.isAvailable ? "Enable Slots" : "Disable Slots"}
        message={
          <div>
            <p>
              Are you sure you want to{" "}
              <span className="font-bold underline">
                {showConfirm.isAvailable ? "ENABLE" : "DISABLE"}
              </span>{" "}
              the following {selectedTimes.length} time slots?
            </p>
            <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm border">
              <p className="font-semibold text-gray-700 mb-1">Range:</p>
              <p>
                {startDate.toLocaleDateString("en-GB")} -{" "}
                {endDate.toLocaleDateString("en-GB")}
              </p>
              <p className="font-semibold text-gray-700 mt-2 mb-1">Times:</p>
              <p className="text-gray-600 break-words">
                {selectedTimes.join(", ")}
              </p>
            </div>
          </div>
        }
        confirmText={showConfirm.isAvailable ? "Enable" : "Disable"}
        cancelText="Keep as is"
        variant={showConfirm.isAvailable ? "default" : "danger"}
      />
    </div>
  );
}
