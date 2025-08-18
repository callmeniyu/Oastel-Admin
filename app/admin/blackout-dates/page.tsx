"use client";

import { useState, useEffect } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import DatePicker from "@/app/revenue/DatePicker";
import { toast } from "react-hot-toast";

interface BlackoutDate {
  _id: string;
  date: string;
  packageType: "tour" | "transfer";
  description?: string;
}

export default function BlackoutDatesPage() {
  const [blackoutDates, setBlackoutDates] = useState<BlackoutDate[]>([]);
  const [selectedRange, setSelectedRange] = useState<{
    startDate: Date;
    endDate: Date;
    key: string;
  }>({
    startDate: new Date(),
    endDate: new Date(),
    key: "selection",
  });
  const [packageType, setPackageType] = useState<"tour" | "transfer">("tour");
  const [description, setDescription] = useState("");

  useEffect(() => {
    fetchBlackoutDates();
  }, []);

  const fetchBlackoutDates = async () => {
    try {
      const res = await fetch("/api/blackout-dates");
      const data = await res.json();
      if (data.success) {
        setBlackoutDates(data.data);
      } else {
        toast.error("Failed to fetch blackout dates");
      }
    } catch (error) {
      toast.error("Error fetching blackout dates");
    }
  };

  const addBlackoutDates = async () => {
    const dates = getDatesInRange(
      selectedRange.startDate,
      selectedRange.endDate
    );
    try {
      for (const date of dates) {
        const res = await fetch("/api/blackout-dates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, packageType, description }),
        });
        const data = await res.json();
        if (!data.success) {
          toast.error(`Failed to add blackout date: ${date}`);
        }
      }
      toast.success("Blackout dates added");
      fetchBlackoutDates();
    } catch (error) {
      toast.error("Error adding blackout dates");
    }
  };

  const removeBlackoutDate = async (id: string) => {
    try {
      const res = await fetch(`/api/blackout-dates/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Blackout date removed");
        fetchBlackoutDates();
      } else {
        toast.error("Failed to remove blackout date");
      }
    } catch (error) {
      toast.error("Error removing blackout date");
    }
  };

  const getDatesInRange = (start: Date, end: Date) => {
    const dates = [];
    let current = new Date(start);
    while (current <= end) {
      dates.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <AdminHeader />
      <main className="p-4">
        <h1 className="text-2xl font-bold mb-4">Manage Blackout Dates</h1>
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <DatePicker onDateChange={setSelectedRange} />
          <div className="mt-4 flex items-center space-x-4">
            <select
              value={packageType}
              onChange={(e) =>
                setPackageType(e.target.value as "tour" | "transfer")
              }
              className="border rounded p-2"
            >
              <option value="tour">Tour</option>
              <option value="transfer">Transfer</option>
            </select>
            <input
              type="text"
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border rounded p-2 flex-1"
            />
            <button
              onClick={addBlackoutDates}
              className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark"
            >
              Add Blackout Dates
            </button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">
            Existing Blackout Dates
          </h2>
          {blackoutDates.length === 0 ? (
            <p>No blackout dates set.</p>
          ) : (
            <ul>
              {blackoutDates.map((bd) => (
                <li
                  key={bd._id}
                  className="flex justify-between items-center border-b py-2"
                >
                  <span>
                    {bd.date} - {bd.packageType}{" "}
                    {bd.description && `: ${bd.description}`}
                  </span>
                  <button
                    onClick={() => removeBlackoutDate(bd._id)}
                    className="text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
