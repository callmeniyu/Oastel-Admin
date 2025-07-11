type Booking = {
    id: string
    tour?: string
    transfer?: string
    date?: string
    time?: string
    status?: string
}

export default function BookingCard({ booking }: { booking: Booking }) {
    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-dark">{booking.tour || booking.transfer}</h3>
            </div>

            <div className="flex justify-between text-sm text-light">
                <div>
                    <div>ID: {booking.id}</div>
                    <div>
                        {booking.date} at {booking.time}
                    </div>
                </div>
                <button className="text-primary font-medium">View</button>
            </div>
        </div>
    )
}
