import Link from "next/link";

export default function StatsCard({
  title,
  value,
  icon,
  link,
}: {
  title: string;
  value: string;
  icon: string;
  link?: string;
}) {
  return (
    <Link
      href={link || "#"}
      className="bg-white p-4 rounded-lg shadow-sm border border-gray-100"
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-light text-sm">{title}</h3>
          <p className="text-xl font-bold text-dark">{value}</p>
        </div>
        <div className="text-2xl">{icon}</div>
      </div>
    </Link>
  );
}
