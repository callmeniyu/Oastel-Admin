import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { packageType, packageId, date, time, minimumPerson } = body;

    if (!packageType || !packageId || !date || !time || typeof minimumPerson !== "number") {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: packageType, packageId, date, time, minimumPerson",
        },
        { status: 400 }
      );
    }

    if (minimumPerson < 1) {
      return NextResponse.json(
        {
          success: false,
          error: "minimumPerson must be a positive number",
        },
        { status: 400 }
      );
    }

    // Call the backend API to update minimum person
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://192.168.163.50:3002";
    const response = await fetch(
      `${backendUrl}/api/timeslots/minimum-person`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packageType,
          packageId,
          date,
          time,
          minimumPerson
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        {
          success: false,
          error: errorData.message || "Failed to update minimum person",
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating minimum person:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}