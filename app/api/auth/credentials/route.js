import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
);

export async function POST(request) {
  try {
    const { iqamaNo, password } = await request.json();
    if (!iqamaNo || !password) {
      return NextResponse.json({ error: "رقم الإقامة وكلمة المرور مطلوبة" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("teachers")
      .select("password, role")
      .eq("iqama_no", iqamaNo)
      .single();
    if (error && error.code !== "PGRST116") throw error;
    if (!data || !(await bcrypt.compare(password, data.password))) {
      return NextResponse.json({ error: "بيانات تسجيل الدخول غير صحيحة" }, { status: 401 });
    }
    return NextResponse.json({ success: true, role: data.role }, { status: 200 });
  } catch (error) {
    console.error("خطأ في المصادقة:", error);
    return NextResponse.json({ error: "خطأ داخلي في الخادم" }, { status: 500 });
  }
}