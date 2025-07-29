import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const blackoutId = params.id;
        
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/blackout-dates/${blackoutId}`,
            {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            return NextResponse.json(
                { success: false, error: errorData.error || 'Failed to delete blackout date' },
                { status: response.status }
            );
        }

        const data = await response.json();
        
        return NextResponse.json(
            { success: true, data: data.data || data },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error deleting blackout date:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete blackout date' },
            { status: 500 }
        );
    }
}
