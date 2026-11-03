import Link from "next/link";
export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      <h2 className="text-4xl font-black mb-6 text-gray-800 dark:text-gray-100">
        Welcome to POS System
      </h2>
      <div className="flex gap-4">
        <Link
          href="/inventory"
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl text-lg font-bold shadow-lg shadow-green-200 dark:shadow-none transition-all active:scale-95"
        >
          Manage Inventory
        </Link>
        <Link
          href="/billing"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-lg font-bold shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95"
        >
          Open Billing Screen
        </Link>
      </div>
    </div>
  );
}
