"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Base64 } from "js-base64";

export default function Dashboard() {
  const [attendance, setAttendance] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [iqamaNo, setIqamaNo] = useState(null);
  const [role, setRole] = useState(null);
  const [method, setMethod] = useState("");
  const [error, setError] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [fingerprintInput, setFingerprintInput] = useState("");
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveDate, setLeaveDate] = useState("");
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
      fetch(`/api/leave?iqamaNo=${id}`)
        .then((res) => res.json())
        .then((data) => setLeaveRequests(data));
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

  const handleLeaveRequest = async () => {
    if (!leaveReason || !leaveDate) {
      setError("يرجى إدخال سبب وتاريخ الإجازة");
      return;
    }

    try {
      const res = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ iqamaNo, reason: leaveReason, date: leaveDate }),
      });
      const data = await res.json();
      if (res.ok) {
        setLeaveRequests([data.request, ...leaveRequests]);
        setShowLeaveForm(false);
        setLeaveReason("");
        setLeaveDate("");
      } else {
        setError(data.error || "فشل تقديم طلب الإجازة");
      }
    } catch (error) {
      console.error("خطأ في تقديم طلب الإجازة:", error);
      setError("فشل الاتصال بالخادم");
    }
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
    <div className="min-h-screen bg-gray-900 p-4 sm:p-6 text-white text-right">
      <h1 className="text-xl sm:text-3xl font-bold text-teal-400 mb-6 sm:mb-8">لوحة تحكم المعلم</h1>

      {/* Progress Circle */}
      <div className="flex justify-center mb-6 sm:mb-8">
        <div className="relative w-32 h-32 sm:w-40 sm:h-40">
          <svg className="progress-ring w-full h-full" viewBox="0 0 200 200">
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
            <text className="progress-ring__text" x="50%" y="40%" fontSize="1.5rem" textAnchor="middle">
              {Math.round(progress * 100)}%
            </text>
            <text className="progress-ring__text" x="50%" y="60%" fontSize="0.8rem" textAnchor="middle">
              الوقت: {Math.floor(totalMinutes / 60)}:{Math.floor(totalMinutes % 60).toString().padStart(2, "0")} ساعة
            </text>
          </svg>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-800 text-white rounded text-center text-sm sm:text-base">
          {error}
        </div>
      )}

      {/* Attendance and Leave Buttons */}
      <div className="grid grid-cols-2 gap-4 sm:gap-6 max-w-md mx-auto mb-6 sm:mb-8">
        <div className="flex flex-col items-center">
          <button
            onClick={handleAuth}
            className="w-16 h-16 sm:w-20 sm:h-20 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transition"
          >
            <span className="text-xl sm:text-2xl">👆</span>
          </button>
          <span className="mt-2 text-sm sm:text-base">
            {method === "face" && !isCapturing ? "التعرف على الوجه" : "المصادقة"}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <button
            onClick={() => setShowLeaveForm(true)}
            className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition"
          >
            <span className="text-xl sm:text-2xl">📋</span>
          </button>
          <span className="mt-2 text-sm sm:text-base">طلب إجازة</span>
        </div>
      </div>

      {/* Face/Fingerprint Capture */}
      {method === "face" && isCapturing && (
        <div className="mb-6 sm:mb-8 max-w-md mx-auto">
          <video ref={videoRef} autoPlay className="w-full rounded" width="320" height="240" />
          <canvas ref={canvasRef} className="hidden" width="320" height="240" />
        </div>
      )}
      {method === "fingerprint" && isCapturing && (
        <div className="mb-6 sm:mb-8 max-w-md mx-auto text-center">
          <button
            onClick={simulateFingerprint}
            className="w-16 h-16 sm:w-20 sm:h-20 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transition mx-auto"
          >
            <span className="text-xl sm:text-2xl">👆</span>
          </button>
          {fingerprintInput && <p className="text-green-400 mt-2 text-sm sm:text-base">تم التقاط البصمة!</p>}
        </div>
      )}

      {/* Leave Request Form */}
      {showLeaveForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-4 sm:p-6 rounded-lg w-full max-w-md">
            <h2 className="text-lg sm:text-xl font-semibold mb-4">طلب إجازة</h2>
            <div className="mb-4">
              <label className="block text-white mb-2 text-sm sm:text-base">تاريخ الإجازة</label>
              <input
                type="date"
                value={leaveDate}
                onChange={(e) => setLeaveDate(e.target.value)}
                className="w-full p-3 bg-gray-700 text-white border-none rounded focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm sm:text-base"
              />
            </div>
            <div className="mb-4">
              <label className="block text-white mb-2 text-sm sm:text-base">سبب الإجازة</label>
              <textarea
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                className="w-full p-3 bg-gray-700 text-white border-none rounded focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm sm:text-base"
                rows="3"
                placeholder="أدخل سبب الإجازة"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleLeaveRequest}
                className="flex-1 bg-teal-500 text-white p-3 rounded-lg hover:bg-teal-600 transition text-sm sm:text-base"
              >
                تقديم
              </button>
              <button
                onClick={() => setShowLeaveForm(false)}
                className="flex-1 bg-gray-600 text-white p-3 rounded-lg hover:bg-gray-700 transition text-sm sm:text-base"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Requests Status */}
      <div className="bg-gray-800 p-4 sm:p-6 rounded-lg mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-xl font-semibold mb-4">طلبات الإجازة</h2>
        <div className="space-y-4">
          {leaveRequests.map((request) => (
            <div key={request.id} className={`p-3 rounded-lg ${request.status === "accepted" ? "bg-green-700" : request.status === "refused" ? "bg-red-700" : "bg-gray-700"}`}>
              <p className="text-sm sm:text-base">التاريخ: {new Date(request.date).toLocaleDateString()}</p>
              <p className="text-sm sm:text-base">السبب: {request.reason}</p>
              <p className="text-sm sm:text-base">
                الحالة: {request.status === "pending" ? "قيد الانتظار" : request.status === "accepted" ? "تم القبول" : "تم الرفض"}
              </p>
            </div>
          ))}
          {leaveRequests.length === 0 && (
            <p className="text-gray-400 text-sm sm:text-base">لا توجد طلبات إجازة</p>
          )}
        </div>
      </div>

      {/* Attendance History */}
      <div className="bg-gray-800 p-4 sm:p-6 rounded-lg">
        <h2 className="text-lg sm:text-xl font-semibold mb-4">سجل الحضور</h2>
        <div className="space-y-4">
          {attendance.map((record) => (
            <div key={record.id} className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
              <div>
                <p className="text-sm sm:text-base">{new Date(record.timestamp).toLocaleDateString()}</p>
                <p className="text-sm sm:text-base">{record.status === "check-in" ? "الحضور" : "الانصراف"}</p>
              </div>
              <p className="text-sm sm:text-base">{new Date(record.timestamp).toLocaleTimeString()}</p>
            </div>
          ))}
          {attendance.length === 0 && (
            <p className="text-gray-400 text-sm sm:text-base">لا توجد سجلات حضور</p>
          )}
        </div>
      </div>
    </div>
  );
}