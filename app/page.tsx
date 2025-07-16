import AdminHeader from '@/components/admin/AdminHeader';
import MobileNav from '@/components/admin/MobileNav';
import StatsCard from '@/components/admin/StatsCard';
import BookingCard from '@/components/admin/BookingCard';

export default function DashboardPage() {
  const stats = [
    { title: 'Total Bookings', value: '342', change: '+12%', icon: '📊' },
    { title: 'Active Tours', value: '14', change: '+2', icon: '🚗' },
    { title: 'Pending Requests', value: '23', change: '-5', icon: '⏱️' },
    { title: 'Revenue', value: 'RM 24,589', change: '+8.5%', icon: '💰', link:"revenue" },
  ];

  const recentBookings = [
    { id: 'BK001', tour: 'Full Day Land Rover', date: '15 Nov 2023', time: '08:30 AM', status: 'Confirmed' },
    { id: 'BK002', tour: 'Sunrise + Half Day', date: '16 Nov 2023', time: '05:00 AM', status: 'Pending' },
    { id: 'BK003', transfer: 'CH to KL', date: '17 Nov 2023', time: '02:00 PM', status: 'Completed' },
    { id: 'BK004', tour: 'Coral Hills Tour', date: '18 Nov 2023', time: '09:00 AM', status: 'Cancelled' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <AdminHeader />
      
      <main className="p-4">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-dark mb-4">Dashboard Overview</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            {stats.map((stat, index) => (
              <StatsCard 
                key={index}
                title={stat.title}
                value={stat.value}
                change={stat.change}
                icon={stat.icon}
                link=''
              />
            ))}
          </div>
        </div>
        
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-dark">Recent Bookings</h2>
            <button className="text-primary text-sm font-medium">View All</button>
          </div>
          
          <div className="space-y-3">
            {recentBookings.map((booking, index) => (
              <BookingCard key={index} booking={booking} />
            ))}
          </div>
        </div>
        
        <div>
          <h2 className="text-xl font-bold text-dark mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <button className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center justify-center">
              <span className="text-2xl mb-2">🚗</span>
              <span className="font-medium">Add Tour</span>
            </button>
            <button className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center justify-center">
              <span className="text-2xl mb-2">🚐</span>
              <span className="font-medium">Add Transfer</span>
            </button>
            <button className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center justify-center">
              <span className="text-2xl mb-2">📝</span>
              <span className="font-medium">Create Blog</span>
            </button>
            <button className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center justify-center">
              <span className="text-2xl mb-2">👥</span>
              <span className="font-medium">Manage Users</span>
            </button>
          </div>
        </div>
      </main>
      
      <MobileNav />
    </div>
  );
}