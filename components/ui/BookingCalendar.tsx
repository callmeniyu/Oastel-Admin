"use client";

import { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

type BookingCalendarProps = {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
};

export default function BookingCalendar({
  selectedDate,
  onDateChange,
  minDate,
  maxDate,
}: BookingCalendarProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="font-semibold text-gray-900 mb-4">Select Date</h2>
      <DatePicker
        selected={selectedDate}
        onChange={(date) => {
          if (date) {
            onDateChange(date);
          }
        }}
        inline
        minDate={minDate}
        maxDate={maxDate}
        calendarClassName="!border-0"
        wrapperClassName="!block"
      />
    </div>
  );
}
