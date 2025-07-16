"use client";
import { useState } from 'react';
import DatePicker from './DatePicker';
import SummaryCard from '@/components/ui/SummaryCard';

export default function RevenuePage() {
  const [dateRange, setDateRange] = useState<{ startDate: Date; endDate: Date; key: string } | null>(null);

  const summaryData = {
    totalRevenue: 'RM 12,450',
    revenueChange: 15,
    totalBookings: 28,
    bookingsChange: -5,
    avgBooking: 'RM 445',
  };

  const packageSales = [
    { name: 'Half Day Land Rover', type: 'co-tour', bookings: 12, revenue: 'RM 5,400' },
    { name: 'Cameron Highlands Transfer', type: 'van', bookings: 8, revenue: 'RM 3,200' },
    // ...other packages
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <h1 className="text-2xl lg:text-3xl font-bold text-dark mb-4">Revenue Analytics</h1>

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <DatePicker onDateChange={setDateRange} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 my-6">
        <SummaryCard 
          title="Total Revenue" 
          value={summaryData.totalRevenue} 
          change={summaryData.revenueChange} 
        />
        <SummaryCard 
          title="Total Bookings" 
          value={summaryData.totalBookings} 
          change={summaryData.bookingsChange} 
        />
        <SummaryCard 
          title="Avg Booking Value" 
          value={summaryData.avgBooking} 
          change={0} 
        />
      </div>

      <div className="bg-white rounded-lg p-4 md:p-6 shadow-sm mt-6">
        <h2 className="text-lg lg:text-xl font-semibold text-dark mb-4">Package Performance</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm md:text-base">
            <thead>
              <tr className="text-left border-b">
                <th className="pb-2">Package</th>
                <th className="pb-2">Type</th>
                <th className="pb-2">Bookings</th>
                <th className="pb-2">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {packageSales.map((item, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-3">{item.name}</td>
                  <td>
                    <span className={`px-2 py-1 rounded-full text-xs 
                      ${item.type === 'co-tour' ? 'bg-blue-100 text-blue-800' : 
                        item.type === 'private-tour' ? 'bg-purple-100 text-purple-800' : 
                        'bg-green-100 text-green-800'}`}>
                      {item.type}
                    </span>
                  </td>
                  <td>{item.bookings}</td>
                  <td className="font-medium">{item.revenue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 flex justify-center md:justify-end">
        <button className="w-full md:w-auto bg-primary text-white py-2 px-6 rounded-lg">
          Export as CSV
        </button>
      </div>
    </div>
  );
}
