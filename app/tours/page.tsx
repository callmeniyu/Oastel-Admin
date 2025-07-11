import AdminHeader from '@/components/admin/AdminHeader';
import MobileNav from '@/components/admin/MobileNav';
import DataTable from '@/components/admin/DataTable';

export default function ToursPage() {
  const tours = [
    { id: 'T001', name: 'Full Day Land Rover', category: 'Co-Tour', period:"Half-Day", price: 449, status: 'Active' },
    { id: 'T002', name: 'Sunrise + Half Day', category: 'Private', period:"Full-Day", price: 299, status: 'Active' },
    { id: 'T003', name: 'Coral Hills Tour', category: 'Private', period:"Half-Day", price: 349, status: 'Active' },
    { id: 'T004', name: 'Mossy Forest Adventure', category: 'Co-Tour', period:"Half-Day", price: 399, status: 'Sold' },
    { id: 'T005', name: 'Tea Plantation Tour', category: 'Private', period:"Full-Day", price: 249, status: 'Active' },
  ];

  const columns = [
    { key: 'name', label: 'Tour Name' },
    { key: 'category', label: 'Category' },
    { key: 'period', label: 'Period' },
    { key: 'price', label: 'Price (RM)' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <AdminHeader />
      
      <main className="p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-dark">Tour Packages</h1>
          <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium">
            + Add Tour
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <DataTable 
            columns={columns} 
            data={tours} 
            rowActions={['edit', 'delete']} 
          />
        </div>
      </main>
      
      <MobileNav />
    </div>
  );
}