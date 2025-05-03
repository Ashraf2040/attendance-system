import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
);

export async function DELETE() {
  try {
    const { error: teachersError } = await supabase.from("teachers").delete().neq("id", 0);
    const { error: attendanceError } = await supabase.from("attendance").delete().neq("id", 0);
    if (teachersError || attendanceError) throw teachersError || attendanceError;
    return NextResponse.json({ success: true, message: "تم إعادة تعيين جميع البيانات بنجاح" });
  } catch (error) {
    console.error("Error resetting data:", error);
    return NextResponse.json({ error: "خطأ أثناء إعادة التعيين" }, { status: 500 });
  }
}