import Image from "next/image";
import { MdAccessTimeFilled } from "react-icons/md";
import { FaBookmark } from "react-icons/fa";
import { FiMapPin } from "react-icons/fi";
import { IoFlagSharp } from "react-icons/io5";

type TransferCardProps = {
  _id: string;
  slug: string;
  image: string;
  title: string;
  tags: string[];
  desc: string;
  duration: string;
  bookedCount: string | number;
  oldPrice: number;
  newPrice: number;
  type: string;
  from: string;
  to: string;
  label?: "Recommended" | "Popular" | "Best Value" | "Best seller" | null;
};

export default function TransferCard({
  _id,
  slug,
  image,
  title,
  desc,
  duration,
  tags,
  bookedCount,
  oldPrice,
  newPrice,
  type,
  from,
  to,
  label,
}: TransferCardProps) {
  // Label styling based on type
  const getLabelStyles = (labelType: string) => {
    switch (labelType) {
      case "Recommended":
        return "bg-purple-600 text-white";
      case "Popular":
        return "bg-orange-500 text-white";
      case "Best Value":
        return "bg-blue-500 text-white";
      case "Best seller":
        return "bg-red-600 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };
  return (
    <div className="rounded-xl shadow-lg bg-white flex flex-col flex-grow justify-between relative">
      {/* Label Badge */}
      {label && (
        <div
          className={`absolute top-3 left-3 z-10 px-3 py-1 rounded-full text-xs font-semibold ${getLabelStyles(
            label
          )}`}
        >
          {label}
        </div>
      )}
      <Image
        src={image}
        alt={title}
        width={400}
        height={400}
        className="h-48 w-full object-cover rounded-t-lg"
      />
      <div className="p-4 flex flex-col justify-between gap-2 self-start">
        <h3 className="text-primary_green font-semibold font-poppins text-base">
          {title}
        </h3>
        <div className="flex gap-2">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="bg-[#E6F1EE] text-primary px-2 py-1 rounded-md text-xs font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
        <p className="text-desc_gray text-sm font-poppins">{desc}</p>
        <div className="flex justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 items-center font-semibold">
              <FiMapPin width={30} className="text-primary_green text-md" />
              <p className="text-sm">{from}</p>
            </div>
            <div className="flex gap-2 items-center font-semibold">
              <IoFlagSharp width={30} className="text-primary_green text-md" />
              <p className="text-sm">{to}</p>
            </div>
          </div>
          <div className="flex flex-col justify-between gap-2">
            <div className="flex gap-2 items-center font-semibold">
              <FaBookmark width={30} className="text-primary_green text-md" />
              <p className="text-sm">{bookedCount}+ Booked</p>
            </div>
            <div className="flex gap-2 items-center font-semibold">
              <MdAccessTimeFilled
                width={30}
                className="text-primary_green text-lg"
              />
              <p className="text-sm">{duration} hrs</p>
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center mt-2">
          <div className="flex flex-col items-start">
            <p className="text-gray-400 line-through font-poppins text-base ">
              {oldPrice}
            </p>
            <h4 className="font-poppins text-xl font-bold">
              {newPrice} RM{" "}
              <span className="text-sm font-light">
                {type === "private" ? "/group" : "/person"}
              </span>
            </h4>
          </div>
          <button className="bg-primary hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md w-24 transition-colors">
            Book
          </button>{" "}
        </div>
      </div>
    </div>
  );
}
