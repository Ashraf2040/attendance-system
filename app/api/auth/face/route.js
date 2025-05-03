import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
);

export async function POST(request) {
  try {
    const { iqamaNo, authData } = await request.json();
    if (!iqamaNo || !authData) {
      return NextResponse.json({ error: "رقم الإقامة والبيانات المصادقة مطلوبة" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("teachers")
      .select("auth_data")
      .eq("iqama_no", iqamaNo)
      .eq("auth_method", "face")
      .single();
    if (error && error.code !== "PGRST116") throw error;
    if (!data || authData.substring(0, 20) !== data.auth_data.substring(0, 20)) {
      return NextResponse.json({ error: "فشل التعرف على الوجه" }, { status: 401 });
    }
    return NextResponse.json({ success: true, iqamaNo }, { status: 200 });
  } catch (error) {
    console.error("خطأ في المصادقة بواسطة الوجه:", error);
    return NextResponse.json({ error: "خطأ داخلي في الخادم" }, { status: 500 });
  }
}