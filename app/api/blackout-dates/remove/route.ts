import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json();
        
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/blackout-dates/remove`,
            {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body)
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            return NextResponse.json(
                { success: false, error: errorData.error || 'Failed to remove blackout date' },
                { status: response.status }
            );
        }

        const data = await response.json();
        
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error('Error removing blackout date:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to remove blackout date' },
            { status: 500 }
        );
    }
}
