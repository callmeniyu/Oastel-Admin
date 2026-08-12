import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const packageId = searchParams.get("packageId");
    const date = searchParams.get("date");
    const packageType = searchParams.get("packageType");

    if (!date) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameter: date",
        },
        { status: 400 }
      );
    }

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://192.168.163.50:3002";

    // Bulk query for all packages on a specific date
    if (!packageId) {
      const response = await fetch(
        `${backendUrl}/api/timeslots/all-by-date?date=${date}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        return NextResponse.json(
          {
            success: false,
            error: errorData.message || "Failed to fetch all time slots for date",
          },
          { status: response.status }
        );
      }

      const data = await response.json();
      return NextResponse.json({
        success: true,
        data: Array.isArray(data.data) ? data.data : [],
      });
    }

    if (!packageType) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing packageType parameter",
        },
        { status: 400 }
      );
    }

    // Call the backend API to get time slot availability (pass isAdmin=true)
    const response = await fetch(
      `${backendUrl}/api/timeslots/available?packageId=${packageId}&date=${date}&packageType=${packageType}&isAdmin=true`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
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
