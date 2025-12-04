import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const packageType = searchParams.get('packageType');
        const status = searchParams.get('status');
        const date = searchParams.get('date');
        const packageId = searchParams.get('packageId');
        const time = searchParams.get('time');
        const beforeDate = searchParams.get('beforeDate');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        
        let url = `${process.env.NEXT_PUBLIC_API_URL}/api/bookings?`;
        if (packageType) url += `packageType=${packageType}&`;
        if (status) url += `status=${status}&`;
        if (date) url += `date=${date}&`;
        if (packageId) url += `packageId=${packageId}&`;
        if (time) url += `time=${time}&`;
        if (beforeDate) url += `beforeDate=${beforeDate}&`;
        if (startDate) url += `startDate=${startDate}&`;
        if (endDate) url += `endDate=${endDate}&`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            return NextResponse.json(
                { success: false, error: errorData.error || 'Failed to fetch bookings' },
                { status: response.status }
            );
        }

        const data = await response.json();
        const bookings = data.bookings || data.data || [];
        
        return NextResponse.json(
            { success: true, bookings },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error fetching bookings:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch bookings' },
            { status: 500 }
        );
    }
}
