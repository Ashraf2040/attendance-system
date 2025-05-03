import Link from "next/link";

export default function Home() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold text-indigo-600 mb-6">Teacher Attendance System</h1>
        <p className="text-lg text-gray-600 mb-8">
          Securely log in using face or fingerprint recognition to mark your attendance.
        </p>
        <Link
          href="/login"
          className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
        >
          Go to Login
        </Link>
      </div>
    </div>
  );
}