"use client";

import { useState, useRef } from "react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  FiX,
  FiDownload,
  FiCheck,
  FiCalendar,
  FiClock,
  FiUsers,
  FiMapPin,
  FiUser,
  FiMail,
  FiPhone,
  FiDollarSign,
} from "react-icons/fi";

interface BookingConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  bookingData: {
    bookingId: string;
    packageType: "tour" | "transfer";
    packageTitle: string;
    date: string;
    time: string;
    adults: number;
    children: number;
    pickupLocation: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    total: number;
  };
}

export default function BookingConfirmation({
  isOpen,
  onClose,
  bookingData,
}: BookingConfirmationProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);

      // Generate PDF using same approach as customer booking confirmation
      if (!wrapperRef.current) {
        throw new Error("Confirmation wrapper not found");
      }

      const canvas = await html2canvas(wrapperRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = 295; // A4 height in mm

      const imgProps = {
        width: pdfWidth,
        height: (canvas.height * pdfWidth) / canvas.width,
      };

      if (imgProps.height > pdfHeight) {
        imgProps.width = (canvas.width * pdfHeight) / canvas.height;
        imgProps.height = pdfHeight;
      }

      const x = (pdfWidth - imgProps.width) / 2;
      const y = (pdfHeight - imgProps.height) / 2;

      pdf.addImage(imgData, "PNG", x, y, imgProps.width, imgProps.height);
      pdf.save(`booking-confirmation-${bookingData.bookingId}.pdf`);

      toast.success("Booking confirmation downloaded!");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download confirmation");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        ref={wrapperRef}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-green-50">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
              <FiCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Booking Confirmed!
              </h2>
              <p className="text-sm text-gray-600">
                Booking ID: {bookingData.bookingId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Package Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Package Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <FiCalendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="font-medium">
                    {format(new Date(bookingData.date), "PPP")}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <FiClock className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Time</p>
                  <p className="font-medium">{bookingData.time}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <FiUsers className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Guests</p>
                  <p className="font-medium">
                    {bookingData.adults} Adult(s)
                    {bookingData.children > 0 &&
                      `, ${bookingData.children} Children`}
                  </p>
                </div>
              </div>
              {bookingData.pickupLocation && (
                <div className="flex items-center space-x-3">
                  <FiMapPin className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Pickup Location</p>
                    <p className="font-medium">{bookingData.pickupLocation}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Customer Information
            </h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <FiUser className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-medium">{bookingData.customerName}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <FiMail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{bookingData.customerEmail}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <FiPhone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium">{bookingData.customerPhone}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Payment Information
            </h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FiDollarSign className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="text-xl font-bold text-green-600">
                    RM {bookingData.total.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Payment Status</p>
                <p className="font-medium text-green-600">✓ Confirmed (Cash)</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-4">
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <FiDownload className="w-4 h-4" />
              <span>
                {isDownloading ? "Downloading..." : "Download Confirmation"}
              </span>
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>

          {/* Important Notes */}
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <h4 className="font-semibold text-gray-900 mb-2">
              Important Notes
            </h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Payment has been collected in cash at the office</li>
              <li>• Please arrive 15 minutes before departure time</li>
              <li>• Bring a valid ID for verification</li>
              <li>• Contact us for any changes or cancellations</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
