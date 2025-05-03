"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Base64 } from "js-base64";

export default function Signup() {
  const [name, setName] = useState("");
  const [iqamaNo, setIqamaNo] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("teacher");
  const [method, setMethod] = useState("face");
  const [error, setError] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [fingerprintInput, setFingerprintInput] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const router = useRouter();

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

  const handleSignup = async () => {
    if (!name.trim() || !iqamaNo.trim() || !password.trim()) {
      setError("يرجى إدخال الاسم، رقم الإقامة، وكلمة المرور");
      return;
    }

    let authData = null;
    if (method === "face") {
      if (!isCapturing) {
        setIsCapturing(true);
        return;
      }
      authData = captureFace();
      if (!authData) {
        setError("فشل التقاط الصورة");
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
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, iqamaNo, password, role, authMethod: method, authData }),
      });
      if (res.ok) {
        alert("تم التسجيل بنجاح! يرجى تسجيل الدخول.");
        router.push("/login");
      } else {
        const data = await res.json();
        setError(data.error || "فشل التسجيل");
      }
    } catch {
      setError("فشل الاتصال بالخادم");
    }
  };

  const simulateFingerprint = () => {
    setFingerprintInput("fingerprint-" + Math.random().toString(36).substring(2));
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 p-4">
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-teal-400 mb-6">تسجيل جديد</h2>
        {error && <div className="mb-4 p-3 bg-red-800 text-white rounded">{error}</div>}
        <div className="mb-4">
          <label className="block text-white mb-2">الاسم</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 bg-gray-700 text-white border-none rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="أدخل اسمك"
          />
        </div>
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
        <div className="mb-4">
          <label className="block text-white mb-2">كلمة المرور</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 bg-gray-700 text-white border-none rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="أدخل كلمة المرور"
          />
        </div>
        <div className="mb-4">
          <label className="block text-white mb-2">الدور</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full p-3 bg-gray-700 text-white border-none rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="teacher">معلم</option>
            <option value="admin">إداري</option>
          </select>
        </div>
        <div className="mb-6">
          <label className="block text-white mb-2">طريقة المصادقة</label>
          <select
            value={method}
            onChange={(e) => {
              setMethod(e.target.value);
              setIsCapturing(false);
              stopCamera();
              setFingerprintInput("");
            }}
            className="w-full p-3 bg-gray-700 text-white border-none rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="face">التعرف على الوجه</option>
            <option value="fingerprint">البصمة</option>
          </select>
        </div>
        {method === "face" && isCapturing && (
          <div className="mb-6">
            <video ref={videoRef} autoPlay className="w-full rounded" width="320" height="240" />
            <canvas ref={canvasRef} className="hidden" width="320" height="240" />
          </div>
        )}
        {method === "fingerprint" && (
          <div className="mb-6">
            <button onClick={simulateFingerprint} className="btn w-24 sm:w-32 h-24 sm:h-32 mx-auto">
              👆
            </button>
            {fingerprintInput && <p className="text-green-400 mt-2">تم التقاط البصمة!</p>}
          </div>
        )}
        <button
          onClick={handleSignup}
          className="w-full bg-teal-500 text-white p-3 rounded-lg hover:bg-teal-600 transition mt-4"
        >
          {method === "face" && !isCapturing ? "بدء التقاط الوجه" : "تسجيل"}
        </button>
      </div>
    </div>
  );
}