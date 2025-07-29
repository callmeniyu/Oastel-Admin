import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/tours`,
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
                { success: false, error: errorData.error || 'Failed to fetch tours' },
                { status: response.status }
            );
        }

        const data = await response.json();
        
        return NextResponse.json(
            { success: true, tours: data.tours || data.data || [] },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error fetching tours:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch tours' },
            { status: 500 }
        );
    }
}
