import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        
        if (!from || !to) {
            return NextResponse.json(
                { success: false, message: 'From date and to date are required' },
                { status: 400 }
            );
        }
        
        // Call your backend API to get revenue data
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/bookings/revenue?from=${from}&to=${to}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            return NextResponse.json(
                { success: false, error: errorData.message || 'Failed to fetch revenue data' },
                { status: response.status }
            );
        }

        const data = await response.json();
        
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error('Error fetching revenue data:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch revenue data' },
            { status: 500 }
        );
    }
}
