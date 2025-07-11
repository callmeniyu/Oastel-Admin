export default function StatsCard({ title, value, change, icon }: { 
  title: string, 
  value: string, 
  change: string, 
  icon: string 
}) {
  const isPositive = change.startsWith('+');
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-light text-sm">{title}</h3>
          <p className="text-xl font-bold text-dark">{value}</p>
        </div>
        <div className="text-2xl">{icon}</div>
      </div>
      
      <div className={`mt-2 text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {change}
      </div>
    </div>
  );
}