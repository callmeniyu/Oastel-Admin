import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const tourId = params.id;
        
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/tours/${tourId}`,
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
                { success: false, error: errorData.error || 'Failed to fetch tour' },
                { status: response.status }
            );
        }

        const data = await response.json();
        
        return NextResponse.json(
            { success: true, tour: data.tour || data.data || data },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error fetching tour:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch tour' },
            { status: 500 }
        );
    }
}
