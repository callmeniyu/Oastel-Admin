import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/transfers`,
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
                { success: false, error: errorData.error || 'Failed to fetch transfers' },
                { status: response.status }
            );
        }

        const data = await response.json();
        
        return NextResponse.json(
            { success: true, transfers: data.transfers || data.data || [] },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error fetching transfers:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch transfers' },
            { status: 500 }
        );
    }
}
