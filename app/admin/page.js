"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminPanel() {
  const [teachers, setTeachers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [adjustedTimes, setAdjustedTimes] = useState({});
  const [maxAttendanceTime, setMaxAttendanceTime] = useState("08:00");
  const router = useRouter();

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "admin") {
      router.push("/login");
    } else {
      fetch("/api/teachers")
        .then((res) => res.json())
        .then((data) => setTeachers(data));
      fetch("/api/attendance")
        .then((res) => res.json())
        .then((data) => setAttendance(data));
      fetch("/api/settings")
        .then((res) => res.json())
        .then((data) => setMaxAttendanceTime(data.max_attendance_time || "08:00"));
    }
  }, [router]);

  const calculateWorkingHours = (iqamaNo) => {
    let totalMinutes = 0;
    let checkInTime = null;
    attendance
      .filter((record) => record.iqama_no === iqamaNo)
      .forEach((record) => {
        if (record.status === "check-in") checkInTime = new Date(record.timestamp);
        else if (record.status === "check-out" && checkInTime) {
          const checkOutTime = new Date(record.timestamp);
          totalMinutes += (checkOutTime - checkInTime) / (1000 * 60);
          checkInTime = null;
        }
      });
    return totalMinutes;
  };

  const handleAdjustTime = async (recordId, newTime) => {
    try {
      const newTimestamp = new Date(`${selectedDate}T${newTime}:00`).toISOString();
      const res = await fetch("/api/attendance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: recordId, timestamp: newTimestamp }),
      });
      if (res.ok) {
        setAttendance((prev) =>
          prev.map((record) =>
            record.id === recordId ? { ...record, timestamp: newTimestamp } : record
          )
        );
        setAdjustedTimes((prev) => ({ ...prev, [recordId]: newTime }));
      }
    } catch (error) {
      console.error("Error adjusting time:", error);
    }
  };

  const handleUpdateMaxAttendanceTime = async () => {
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxAttendanceTime }),
      });
      if (!res.ok) {
        console.error("Failed to update max attendance time");
      }
    } catch (error) {
      console.error("Error updating max attendance time:", error);
    }
  };

  const handleResetAllData = async () => {
    if (!confirm("هل أنت متأكد أنك تريد إعادة تعيين جميع البيانات؟ سيتم حذف جميع المعلمين وسجلات الحضور!")) {
      return;
    }
    try {
      const res = await fetch("/api/reset", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        setTeachers([]);
        setAttendance([]);
      } else {
        alert(data.error || "فشل إعادة التعيين");
      }
    } catch (error) {
      console.error("Error resetting data:", error);
      alert("خطأ أثناء إعادة التعيين");
    }
  };

  const calculateDelay = (checkInTime) => {
    const expectedTime = new Date(`${selectedDate}T${maxAttendanceTime}:00`);
    const actualTime = new Date(checkInTime);
    if (actualTime <= expectedTime) return 0;
    return Math.round((actualTime - expectedTime) / (1000 * 60));
  };

  const getAttendanceStatus = () => {
    const recordsOnDate = attendance.filter(
      (record) =>
        new Date(record.timestamp).toISOString().split("T")[0] === selectedDate &&
        record.status === "check-in"
    );
    const attended = teachers.filter((teacher) =>
      recordsOnDate.some((record) => record.iqama_no === teacher.iqama_no)
    );
    const absent = teachers.filter(
      (teacher) => !recordsOnDate.some((record) => record.iqama_no === teacher.iqama_no)
    );
    return { attended, absent, recordsOnDate };
  };

  const { attended, absent, recordsOnDate } = getAttendanceStatus();

  const handlePrint = () => {
    const printContent = `
      <html lang="ar">
        <head>
          <title>تقرير الحضور</title>
          <style>
            body { font-family: 'Tajawal', sans-serif; direction: rtl; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #000; padding: 8px; text-align: center; }
            th { background-color: #4a5568; color: white; }
            h2 { text-align: center; }
          </style>
        </head>
        <body>
          <h2>تقرير الحضور ليوم ${selectedDate}</h2>
          <h3>المعلمون الحاضرون</h3>
          <table>
            <thead>
              <tr>
                <th>الاسم</th>
                <th>وقت الحضور</th>
                <th>التأخير (دقائق)</th>
              </tr>
            </thead>
            <tbody>
              ${attended
                .map((teacher) => {
                  const record = recordsOnDate.find((r) => r.iqama_no === teacher.iqama_no);
                  const delay = calculateDelay(record.timestamp);
                  return `
                    <tr>
                      <td>${teacher.name}</td>
                      <td>${new Date(record.timestamp).toLocaleTimeString()}</td>
                      <td>${delay}</td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
          <h3>المعلمون الغائبون</h3>
          <table>
            <thead>
              <tr>
                <th>الاسم</th>
              </tr>
            </thead>
            <tbody>
              ${absent
                .map(
                  (teacher) => `
                    <tr>
                      <td>${teacher.name}</td>
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4 text-white text-right">
      <h1 className="text-2xl sm:text-4xl font-bold text-teal-400 mb-8">لوحة الإدارة</h1>
      
      {/* Reset All Data Button */}
      <div className="bg-gray-800 p-4 sm:p-6 rounded-lg mb-8">
        <h2 className="text-xl sm:text-2xl font-semibold mb-4">إعادة تعيين البيانات</h2>
        <button
          onClick={handleResetAllData}
          className="bg-red-500 text-white p-3 rounded-lg hover:bg-red-600 transition"
        >
          إعادة تعيين جميع البيانات
        </button>
      </div>

      {/* Teachers List */}
      <div className="bg-gray-800 p-4 sm:p-6 rounded-lg mb-8">
        <h2 className="text-xl sm:text-2xl font-semibold mb-4">قائمة المعلمين</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm sm:text-base">
            <thead>
              <tr className="bg-gray-700">
                <th className="p-2 sm:p-3">رقم الإقامة</th>
                <th className="p-2 sm:p-3">الاسم</th>
                <th className="p-2 sm:p-3">ساعات العمل</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((teacher) => (
                <tr key={teacher.iqama_no} className="border-b border-gray-600">
                  <td className="p-2 sm:p-3">{teacher.iqama_no}</td>
                  <td className="p-2 sm:p-3">{teacher.name}</td>
                  <td className="p-2 sm:p-3">{Math.floor(calculateWorkingHours(teacher.iqama_no) / 60)}:{Math.floor(calculateWorkingHours(teacher.iqama_no) % 60)} ساعة</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Maximum Attendance Time */}
      <div className="bg-gray-800 p-4 sm:p-6 rounded-lg mb-8">
        <h2 className="text-xl sm:text-2xl font-semibold mb-4">إعدادات الحضور</h2>
        <div className="mb-4">
          <label className="block text-white mb-2">وقت الحضور الأقصى (بعد هذا الوقت يعتبر تأخيرًا)</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="time"
              value={maxAttendanceTime}
              onChange={(e) => setMaxAttendanceTime(e.target.value)}
              className="w-full sm:w-auto p-3 bg-gray-700 text-white border-none rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button
              onClick={handleUpdateMaxAttendanceTime}
              className="bg-teal-500 text-white p-3 rounded-lg hover:bg-teal-600 transition"
            >
              تحديث
            </button>
          </div>
        </div>
      </div>

      {/* Attendance Adjustment */}
      <div className="bg-gray-800 p-4 sm:p-6 rounded-lg mb-8">
        <h2 className="text-xl sm:text-2xl font-semibold mb-4">سجل الحضور</h2>
        <div className="mb-4">
          <label className="block text-white mb-2">اختر التاريخ</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full sm:w-auto p-3 bg-gray-700 text-white border-none rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm sm:text-base">
            <thead>
              <tr className="bg-gray-700">
                <th className="p-2 sm:p-3">رقم الإقامة</th>
                <th className="p-2 sm:p-3">الحالة</th>
                <th className="p-2 sm:p-3">التاريخ</th>
                <th className="p-2 sm:p-3">الوقت</th>
                <th className="p-2 sm:p-3">تعديل الوقت</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((record) => (
                <tr key={record.id} className="border-b border-gray-600">
                  <td className="p-2 sm:p-3">{record.iqama_no}</td>
                  <td className="p-2 sm:p-3">{record.status === "check-in" ? "الحضور" : "الانصراف"}</td>
                  <td className="p-2 sm:p-3">{new Date(record.timestamp).toLocaleDateString()}</td>
                  <td className="p-2 sm:p-3">{new Date(record.timestamp).toLocaleTimeString()}</td>
                  <td className="p-2 sm:p-3">
                    <input
                      type="time"
                      value={adjustedTimes[record.id] || new Date(record.timestamp).toTimeString().slice(0, 5)}
                      onChange={(e) => handleAdjustTime(record.id, e.target.value)}
                      className="p-2 bg-gray-700 text-white border-none rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attendance Status Table */}
      <div className="bg-gray-800 p-4 sm:p-6 rounded-lg">
        <h2 className="text-xl sm:text-2xl font-semibold mb-4">حالة الحضور ليوم {selectedDate}</h2>
        <button
          onClick={handlePrint}
          className="mb-4 bg-teal-500 text-white p-2 rounded-lg hover:bg-teal-600 transition"
        >
          طباعة التقرير
        </button>
        <h3 className="text-lg sm:text-xl font-semibold mb-2">المعلمون الحاضرون</h3>
        <div className="overflow-x-auto mb-8">
          <table className="w-full text-left text-sm sm:text-base">
            <thead>
              <tr className="bg-gray-700">
                <th className="p-2 sm:p-3">الاسم</th>
                <th className="p-2 sm:p-3">وقت الحضور</th>
                <th className="p-2 sm:p-3">التأخير (دقائق)</th>
              </tr>
            </thead>
            <tbody>
              {attended.map((teacher) => {
                const record = recordsOnDate.find((r) => r.iqama_no === teacher.iqama_no);
                const delay = calculateDelay(record.timestamp);
                return (
                  <tr key={teacher.iqama_no} className="border-b border-gray-600">
                    <td className="p-2 sm:p-3">{teacher.name}</td>
                    <td className="p-2 sm:p-3">{new Date(record.timestamp).toLocaleTimeString()}</td>
                    <td className="p-2 sm:p-3">{delay}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <h3 className="text-lg sm:text-xl font-semibold mb-2">المعلمون الغائبون</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm sm:text-base">
            <thead>
              <tr className="bg-gray-700">
                <th className="p-2 sm:p-3">الاسم</th>
              </tr>
            </thead>
            <tbody>
              {absent.map((teacher) => (
                <tr key={teacher.iqama_no} className="border-b border-gray-600">
                  <td className="p-2 sm:p-3">{teacher.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}