import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { packageId, packageType, date, time, isAvailable } = body;

    if (!packageId || !packageType || !date || !time || typeof isAvailable !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: packageId, packageType, date, time, isAvailable",
        },
        { status: 400 }
      );
    }

    // Call the backend API to toggle slot availability
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://192.168.163.50:3002";
    const response = await fetch(
      `${backendUrl}/api/timeslots/toggle-availability`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packageId,
          packageType,
          date,
          time,
          isAvailable
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        {
          success: false,
          error: errorData.message || "Failed to update time slot availability",
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating time slot availability:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
