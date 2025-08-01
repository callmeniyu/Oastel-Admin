import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const packageId = searchParams.get("packageId");
    const date = searchParams.get("date");
    const packageType = searchParams.get("packageType");

    if (!packageId || !date || !packageType) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameters: packageId, date, packageType",
        },
        { status: 400 }
      );
    }

    // Call the backend API to get time slot availability
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://192.168.163.50:3002";
    const response = await fetch(
      `${backendUrl}/api/timeslots/available?packageId=${packageId}&date=${date}&packageType=${packageType}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        {
          success: false,
          error: errorData.message || "Failed to fetch time slots",
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Ensure we have a consistent format with the slots properly formatted
    const formattedData = {
      success: true,
      data: Array.isArray(data.data) ? data.data : []
    };
    
    return NextResponse.json(formattedData);
  } catch (error) {
    console.error("Error fetching time slots:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
