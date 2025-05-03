"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const [iqamaNo, setIqamaNo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    if (!iqamaNo.trim() || !password) {
      setError("يرجى إدخال رقم الإقامة وكلمة المرور");
      return;
    }

    try {
      const res = await fetch("/api/auth/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ iqamaNo, password }),
      });
      const data = await res.json();
      console.log("Login response:", data); // Debug the response
      if (res.ok) {
        localStorage.setItem("iqamaNo", iqamaNo);
        localStorage.setItem("role", data.role);
        const redirectPath = data.role === "admin" ? "/admin" : "/dashboard";
        console.log("Navigating to:", redirectPath); // Debug navigation
        router.push(redirectPath);
      } else {
        setError(data.error || "فشل تسجيل الدخول");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("فشل الاتصال بالخادم");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 p-4">
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-teal-400 mb-6">تسجيل دخول</h2>
        {error && <div className="mb-4 p-3 bg-red-800 text-white rounded">{error}</div>}
        <div className="mb-4">
          <label className="block text-white mb-2">رقم الإقامة</label>
          <input
            type="text"
            value={iqamaNo}
            onChange={(e) => setIqamaNo(e.target.value)}
            className="w-full p-3 bg-gray-700 text-white border-none rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="أدخل رقم الإقامة"
          />
        </div>
        <div className="mb-6">
          <label className="block text-white mb-2">كلمة المرور</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 bg-gray-700 text-white border-none rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="أدخل كلمة المرور"
          />
        </div>
        <button
          onClick={handleLogin}
          className="w-full bg-teal-500 text-white p-3 rounded-lg hover:bg-teal-600 transition mt-4"
        >
          تسجيل الدخول
        </button>
        <p className="mt-4 text-gray-400">
          مستخدم جديد؟{" "}
          <Link href="/signup" className="text-teal-400 hover:underline">
            التسجيل
          </Link>
        </p>
      </div>
    </div>
  );
}