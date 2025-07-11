import AdminHeader from '@/components/admin/AdminHeader';
import MobileNav from '@/components/admin/MobileNav';
import DataTable from '@/components/admin/DataTable';

export default function TransfersPage() {
  const transfers = [
    { 
      id: 'TR001', 
      route: 'Cameron Highlands → KL', 
      type: 'Van', 
      price: 120, 
      status: 'Active' 
    },
    { 
      id: 'TR002', 
      route: 'Taman Negara → CH', 
      type: 'Van + Ferry', 
      price: 200, 
      status: 'Active' 
    },
    { 
      id: 'TR003', 
      route: 'Kuala Besut → CH', 
      type: 'Van', 
      price: 180, 
      status: 'Sold' 
    },
  ];

  const columns = [
    { key: 'route', label: 'Route' },
    { key: 'type', label: 'Type' },
    { key: 'price', label: 'Price (RM)' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <AdminHeader />
      
      <main className="p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-dark">Transfers</h1>
          <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium">
            + Add Transfer
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <DataTable 
            columns={columns} 
            data={transfers} 
            rowActions={['edit', 'delete']} 
          />
        </div>
      </main>
      
      <MobileNav />
    </div>
  );
}