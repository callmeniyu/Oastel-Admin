import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const transferId = params.id;
        
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/transfers/${transferId}`,
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
                { success: false, error: errorData.error || 'Failed to fetch transfer' },
                { status: response.status }
            );
        }

        const data = await response.json();
        
        return NextResponse.json(
            { success: true, transfer: data.transfer || data.data || data },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error fetching transfer:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch transfer' },
            { status: 500 }
        );
    }
}
