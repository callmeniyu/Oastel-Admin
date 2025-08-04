import { useState } from 'react';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

interface DatePickerProps {
  onDateChange: (range: { startDate: Date; endDate: Date; key: string }) => void;
}

export default function DatePicker({ onDateChange }: DatePickerProps) {
  const [state, setState] = useState([
    {
      startDate: new Date(),
      endDate: new Date(),
      key: 'selection',
    },
  ]);

  return (
    <div className="p-2 md:p-4 bg-white rounded-lg shadow-sm w-full max-w-full">
      <DateRange
        editableDateInputs={true}
        onChange={item => {
          const { startDate, endDate, key } = item.selection;
          // Fallback to current date if undefined
          const safeStartDate = startDate ?? new Date();
          const safeEndDate = endDate ?? new Date();
          setState([{ startDate: safeStartDate, endDate: safeEndDate, key: key ?? 'selection' }]);
          onDateChange({ startDate: safeStartDate, endDate: safeEndDate, key: key ?? 'selection' });
        }}
        moveRangeOnFirstSelection={false}
        ranges={state}
        className="w-full"
      />
      <div className="flex flex-wrap gap-2 mt-4">
        <button 
          className="bg-primary text-white px-4 py-2 rounded text-sm"
          onClick={() => {/* Last 30 days logic */}}
        >
          Last 30 Days
        </button>
        <button 
          className="bg-light text-dark px-4 py-2 rounded text-sm"
          onClick={() => {/* This month logic */}}
        >
          This Month
        </button>
      </div>
    </div>
  );
}
