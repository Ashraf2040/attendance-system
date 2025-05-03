import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
);

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const { status } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: "معرف الطلب والحالة مطلوبان" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("leave_requests")
      .update({ status })
      .eq("id", id)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "لم يتم العثور على طلب الإجازة" }, { status: 404 });
    }

    return NextResponse.json({ success: true, request: data[0] }, { status: 200 });
  } catch (error) {
    console.error("خطأ في تحديث حالة طلب الإجازة:", error);
    return NextResponse.json({ error: error.message || "خطأ داخلي في الخادم" }, { status: 500 });
  }
}