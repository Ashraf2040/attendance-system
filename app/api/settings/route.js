import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("settings")
      .select("max_attendance_time")
      .single();
    if (error && error.code !== "PGRST116") throw error;
    return NextResponse.json(data || { max_attendance_time: "08:00" });
  } catch (error) {
    console.error("Error in GET /api/settings:", error);
    return NextResponse.json({ error: "خطأ داخلي في الخادم" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { maxAttendanceTime } = await request.json();
    if (!maxAttendanceTime) {
      return NextResponse.json({ error: "وقت الحضور الأقصى مطلوب" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("settings")
      .upsert({ max_attendance_time: maxAttendanceTime }, { onConflict: "id" });
    if (error) throw error;
    return NextResponse.json({ success: true, settings: data[0] });
  } catch (error) {
    console.error("Error in PUT /api/settings:", error);
    return NextResponse.json({ error: "خطأ داخلي في الخادم" }, { status: 500 });
  }
}