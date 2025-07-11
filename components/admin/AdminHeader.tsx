'use client';
import { FiMenu, FiBell, FiSearch } from 'react-icons/fi';
import Image from 'next/image';
import Link from 'next/link';

export default function AdminHeader() {

  return (
    <div className="bg-white shadow-sm py-4 px-4 flex items-center justify-between">
      <div className="flex items-center">
        <Link href="/" className="text-xl font-bold text-primary ">Admin</Link>
      </div>
      
      <div className="flex items-center space-x-3">
        <button className="relative p-1">
          <FiBell className="text-xl text-gray-600" />
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">3</span>
        </button>
        
        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-primary">
          <Image
            src="/images/admin-avatar.jpg"
            alt="Admin"
            width={32}
            height={32}
            className="object-cover"
          />
        </div>
      </div>
    </div>
  );
}