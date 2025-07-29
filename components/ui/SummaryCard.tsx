// components/SummaryCard.jsx
type SummaryCardProps = {
  title: string;
  value: string | number;
};

export default function SummaryCard({ title, value }: SummaryCardProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h3 className="text-light text-sm">{title}</h3>
      <p className="text-dark text-2xl font-bold my-1">{value}</p>
    </div>
  );
}
