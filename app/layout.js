import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'نظام حضور المعلمين',
  description: 'نظام لحضور المعلمين باستخدام التعرف على الوجه والبصمة',
};

export default function RootLayout({ children }) {
  const iqamaNo = typeof window !== 'undefined' ? localStorage.getItem('iqamaNo') : null;
  const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null;

  return (
    <html lang="ar">
      <body>
        <nav className="bg-gray-800 p-4 text-white">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center">
            <Link href="/" className="text-xl sm:text-2xl font-bold text-teal-400 mb-2 sm:mb-0">
              نظام حضور المعلمين
            </Link>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <Link href="/dashboard" className="hover:text-teal-400 text-center">لوحة التحكم</Link>
              {role === 'admin' && (
                <Link href="/admin" className="hover:text-teal-400 text-center">لوحة الإدارة</Link>
              )}
              {iqamaNo ? (
                <button
                  onClick={() => {
                    localStorage.removeItem('iqamaNo');
                    localStorage.removeItem('role');
                    window.location.href = '/login';
                  }}
                  className="hover:text-teal-400 text-center"
                >
                  تسجيل الخروج
                </button>
              ) : (
                <>
                  <Link href="/login" className="hover:text-teal-400 text-center">تسجيل الدخول</Link>
                  <Link href="/signup" className="hover:text-teal-400 text-center">التسجيل</Link>
                </>
              )}
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}