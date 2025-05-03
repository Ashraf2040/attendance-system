import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
);

export async function GET() {
  try {
    const { data, error } = await supabase.from("teachers").select("*");
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in GET /api/teachers:", error);
    return NextResponse.json({ error: "خطأ داخلي في الخادم" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name, iqamaNo, password, role, authMethod, authData } = await request.json();
    if (!name || !iqamaNo || !password || !role || !authMethod || !authData) {
      return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 });
    }
    const { data: existing, error: checkError } = await supabase
      .from("teachers")
      .select("iqama_no")
      .eq("iqama_no", iqamaNo)
      .single();
    if (checkError && checkError.code !== "PGRST116") {
      throw checkError;
    }
    if (existing) {
      return NextResponse.json({ error: "رقم الإقامة مستخدم بالفعل" }, { status: 400 });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const { error } = await supabase.from("teachers").insert({
      iqama_no: iqamaNo,
      name,
      password: hashedPassword,
      role,
      auth_method: authMethod,
      auth_data: authData,
    });
    if (error) throw error;
    return NextResponse.json({ success: true, teacher: { iqamaNo, name, role, authMethod, authData } });
  } catch (error) {
    console.error("خطأ في التسجيل:", error);
    return NextResponse.json({ error: "خطأ داخلي في الخادم: " + error.message }, { status: 500 });
  }
}