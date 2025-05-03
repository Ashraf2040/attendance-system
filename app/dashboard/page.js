"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Base64 } from "js-base64";

export default function Dashboard() {
  const [attendance, setAttendance] = useState([]);
  const [iqamaNo, setIqamaNo] = useState(null);
  const [role, setRole] = useState(null);
  const [method, setMethod] = useState("");
  const [error, setError] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [fingerprintInput, setFingerprintInput] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const id = localStorage.getItem("iqamaNo");
    const userRole = localStorage.getItem("role");
    if (!id || userRole !== "teacher") {
      router.push(userRole === "admin" ? "/admin" : "/login");
    } else {
      setIqamaNo(id);
      setRole(userRole);
      fetch(`/api/attendance?iqamaNo=${id}`)
        .then((res) => res.json())
        .then((data) => setAttendance(data));
      fetch(`/api/teachers`)
        .then((res) => res.json())
        .then((teachers) => {
          const teacher = teachers.find((t) => t.iqama_no === id);
          setMethod(teacher?.auth_method || "face");
        });
    }
  }, [router]);

  useEffect(() => {
    if (method === "face" && isCapturing) {
      startCamera();
    }
    return () => stopCamera();
  }, [method, isCapturing]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setError("فشل الوصول إلى الكاميرا. يرجى السماح بالوصول.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const captureFace = () => {
    if (canvasRef.current && videoRef.current) {
      const context = canvasRef.current.getContext("2d");
      context.drawImage(videoRef.current, 0, 0, 320, 240);
      return Base64.encode(canvasRef.current.toDataURL("image/jpeg")).substring(0, 20);
    }
    return null;
  };

  const handleAuth = async () => {
    let authData = null;
    if (method === "face") {
      if (!isCapturing) {
        setIsCapturing(true);
        return;
      }
      authData = captureFace();
      if (!authData) {
        setError("فشل التقاط الوجه");
        return;
      }
      stopCamera();
    } else {
      if (!fingerprintInput) {
        setError("يرجى محاكاة مسح البصمة");
        return;
      }
      authData = Base64.encode(fingerprintInput);
    }

    try {
      const endpoint = method === "face" ? "/api/auth/face" : "/api/auth/fingerprint";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ iqamaNo, authData }),
      });
      const data = await res.json();
      if (res.ok) {
        const latestCheckIn = attendance.find((record) => record.status === "check-in" && !attendance.some((r) => r.status === "check-out" && r.timestamp > record.timestamp));
        const status = latestCheckIn ? "check-out" : "check-in";
        await fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ iqamaNo, status, timestamp: new Date().toISOString() }),
        });
        window.location.reload();
      } else {
        setError(data.error || "فشل المصادقة");
      }
    } catch (error) {
      console.error("خطأ في المصادقة:", error);
      setError("فشل الاتصال بالخادم");
    }
  };

  const simulateFingerprint = () => {
    setFingerprintInput("fingerprint-" + Math.random().toString(36).substring(2));
  };

  const calculateTotalTime = () => {
    let totalMinutes = 0;
    let checkInTime = null;
    attendance.forEach((record) => {
      if (record.status === "check-in") checkInTime = new Date(record.timestamp);
      else if (record.status === "check-out" && checkInTime) {
        const checkOutTime = new Date(record.timestamp);
        totalMinutes += (checkOutTime - checkInTime) / (1000 * 60);
        checkInTime = null;
      }
    });
    return totalMinutes;
  };

  const totalMinutes = calculateTotalTime();
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const progress = totalMinutes > 0 ? Math.min(totalMinutes / 480, 1) : 0;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="min-h-screen bg-gray-900 p-4 text-white text-right">
      <h1 className="text-2xl sm:text-4xl font-bold text-teal-400 mb-8">لوحة تحكم المعلم</h1>
      <div className="flex justify-center mb-8">
        <svg className="progress-ring w-40 h-40 sm:w-52 sm:h-52" width="200" height="200">
          <circle
            className="progress-ring__circle"
            stroke="#4a5568"
            strokeWidth="10"
            fill="transparent"
            r={radius}
            cx="100"
            cy="100"
          />
          <circle
            className="progress-ring__circle"
            stroke="#48bb78"
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            fill="transparent"
            r={radius}
            cx="100"
            cy="100"
          />
          <text className="progress-ring__text" x="50%" y="50%">
            {Math.round(progress * 100)}%
          </text>
          <text className="progress-ring__text" x="50%" y="60%" fontSize="0.8rem sm:1rem">
            الوقت: {Math.floor(totalMinutes / 60)}:{Math.floor(totalMinutes % 60)} ساعة
          </text>
        </svg>
      </div>
      {error && <div className="mb-4 p-3 bg-red-800 text-white rounded text-center">{error}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
        <button onClick={handleAuth} className="btn w-20 h-20 sm:w-24 sm:h-24 mx-auto">
          👆<br />{method === "face" && !isCapturing ? "التعرف على الوجه" : "المصادقة"}
        </button>
        {method === "face" && isCapturing && (
          <div className="col-span-1 sm:col-span-2 mb-6">
            <video ref={videoRef} autoPlay className="w-full rounded" width="320" height="240" />
            <canvas ref={canvasRef} className="hidden" width="320" height="240" />
          </div>
        )}
        {method === "fingerprint" && isCapturing && (
          <div className="col-span-1 sm:col-span-2 mb-6">
            <button onClick={simulateFingerprint} className="btn w-20 h-20 sm:w-24 sm:h-24 mx-auto">
              👆
            </button>
            {fingerprintInput && <p className="text-green-400 mt-2">تم التقاط البصمة!</p>}
          </div>
        )}
      </div>
      <div className="mt-8 bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl sm:text-2xl font-semibold mb-4">سجل الحضور</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm sm:text-base">
            <thead>
              <tr className="bg-gray-700">
                <th className="p-2 sm:p-3">التاريخ</th>
                <th className="p-2 sm:p-3">الحالة</th>
                <th className="p-2 sm:p-3">الوقت</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((record) => (
                <tr key={record.id} className="border-b border-gray-600">
                  <td className="p-2 sm:p-3">{new Date(record.timestamp).toLocaleDateString()}</td>
                  <td className="p-2 sm:p-3">{record.status === "check-in" ? "الحضور" : "الانصراف"}</td>
                  <td className="p-2 sm:p-3">{new Date(record.timestamp).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}