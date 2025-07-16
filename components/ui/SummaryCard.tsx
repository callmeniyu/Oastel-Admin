// components/SummaryCard.jsx
type SummaryCardProps = {
  title: string;
  value: string | number;
  change: number;
};

export default function SummaryCard({ title, value, change }: SummaryCardProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h3 className="text-light text-sm">{title}</h3>
      <p className="text-dark text-2xl font-bold my-1">{value}</p>
      <p className={`text-xs ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
        {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% vs previous
      </p>
    </div>
  );
}