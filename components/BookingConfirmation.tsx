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
    packageFrom?: string;
    packageTo?: string;
    date: string;
    time?: string;
    adults?: number;
    children?: number;
    // optional flag for private packages
    isPrivate?: boolean;
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

      if (!wrapperRef.current)
        throw new Error("Confirmation wrapper not found");

      const pdfWidthMm = 210;
      const pdfHeightMm = 297;
      const dpi = 96;
      const pxPerMm = dpi / 25.4;
      const pagePaddingMm = 12;
      const targetPxWidth = Math.round(
        (pdfWidthMm - pagePaddingMm * 2) * pxPerMm
      );

      const wrapper = document.createElement("div");
      wrapper.style.width = `${targetPxWidth}px`;
      wrapper.style.boxSizing = "border-box";
      wrapper.style.padding = "0";
      wrapper.style.background = "#ffffff";
      wrapper.style.fontFamily = "Poppins, Arial, Helvetica, sans-serif";
      wrapper.style.position = "fixed";
      wrapper.style.left = `0`;
      wrapper.style.top = `-99999px`;

      const clone = wrapperRef.current.cloneNode(true) as HTMLElement;
      clone.style.width = "100%";
      clone.style.boxSizing = "border-box";

      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      const scale = 2;
      const canvas = await html2canvas(wrapper, {
        scale,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
      });

      document.body.removeChild(wrapper);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const pxToMm = (px: number) => (px / (dpi * scale)) * 25.4;
      const imgWidthMm = pxToMm(canvas.width);
      const imgHeightMm = pxToMm(canvas.height);

      const maxImgWidthMm = pdfWidthMm - pagePaddingMm * 2;
      const fitScaleVert = pdfHeightMm / imgHeightMm;
      const fitScaleWidth = maxImgWidthMm / imgWidthMm;
      const fitScale = Math.min(fitScaleVert, fitScaleWidth, 1);
      const minAllowedScale = 0.6;

      if (fitScale >= 1 || fitScale >= minAllowedScale) {
        const scaleToUse = Math.min(fitScale, 1);
        const sCanvas = document.createElement("canvas");
        sCanvas.width = Math.round(canvas.width * scaleToUse);
        sCanvas.height = Math.round(canvas.height * scaleToUse);
        const sCtx = sCanvas.getContext("2d");
        if (!sCtx) throw new Error("Canvas context not available");
        sCtx.fillStyle = "#ffffff";
        sCtx.fillRect(0, 0, sCanvas.width, sCanvas.height);
        sCtx.drawImage(
          canvas,
          0,
          0,
          canvas.width,
          canvas.height,
          0,
          0,
          sCanvas.width,
          sCanvas.height
        );

        const pageImgData = sCanvas.toDataURL("image/png");
        const pageImgWidthMm = pxToMm(sCanvas.width);
        const pageImgHeightMm = pxToMm(sCanvas.height);
        const x = (pdfWidthMm - pageImgWidthMm) / 2;
        const y = (pdfHeightMm - pageImgHeightMm) / 2;
        pdf.addImage(pageImgData, "PNG", x, y, pageImgWidthMm, pageImgHeightMm);
        pdf.save(`booking-confirmation-${bookingData.bookingId}.pdf`);
      } else {
        const pages = Math.ceil(imgHeightMm / pdfHeightMm);

        for (let i = 0; i < pages; i++) {
          const sY = (i * pdfHeightMm * (dpi * scale)) / 25.4;
          const pageCanvas = document.createElement("canvas");
          const pagePxWidth = canvas.width;
          const pagePxHeight = Math.min(
            canvas.height - sY,
            Math.round((pdfHeightMm * (dpi * scale)) / 25.4)
          );
          pageCanvas.width = pagePxWidth;
          pageCanvas.height = pagePxHeight;
          const ctx = pageCanvas.getContext("2d");
          if (!ctx) throw new Error("Canvas context not available");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(
            canvas,
            0,
            sY,
            pageCanvas.width,
            pageCanvas.height,
            0,
            0,
            pageCanvas.width,
            pageCanvas.height
          );

          const pageImgData = pageCanvas.toDataURL("image/png");
          const pageImgHeightMm = pxToMm(pageCanvas.height);
          const pageImgWidthMm = pxToMm(pageCanvas.width);

          const x = (pdfWidthMm - pageImgWidthMm) / 2;
          const y = 0;

          pdf.addImage(
            pageImgData,
            "PNG",
            x,
            y,
            pageImgWidthMm,
            pageImgHeightMm
          );
          if (i < pages - 1) pdf.addPage();
        }

        pdf.save(`booking-confirmation-${bookingData.bookingId}.pdf`);
      }

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
              {bookingData.packageTitle && (
                <p className="text-sm text-gray-600">
                  {bookingData.packageTitle}
                </p>
              )}
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
              {bookingData.packageFrom && bookingData.packageTo && (
                <div className="col-span-1 md:col-span-2">
                  <p className="text-sm text-gray-600">Route</p>
                  <p className="font-medium">
                    {bookingData.packageFrom} → {bookingData.packageTo}
                  </p>
                </div>
              )}
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
                    {bookingData.isPrivate ? (
                      "Private"
                    ) : bookingData.adults !== undefined ? (
                      <>
                        {bookingData.adults} Adult(s)
                        {bookingData.children &&
                          bookingData.children > 0 &&
                          `, ${bookingData.children} Children`}
                      </>
                    ) : (
                      // fallback when data missing
                      "N/A"
                    )}
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
