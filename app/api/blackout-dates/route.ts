import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/blackout-dates`,
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
                { success: false, error: errorData.error || 'Failed to fetch blackout dates' },
                { status: response.status }
            );
        }

        const data = await response.json();
        
        return NextResponse.json(
            { success: true, data: data.data || data.blackoutDates || [] },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error fetching blackout dates:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch blackout dates' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/blackout-dates`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body)
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            return NextResponse.json(
                { success: false, error: errorData.error || 'Failed to create blackout date' },
                { status: response.status }
            );
        }

        const data = await response.json();
        
        return NextResponse.json(
            { success: true, data: data.data || data },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error creating blackout date:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create blackout date' },
            { status: 500 }
        );
    }
}
