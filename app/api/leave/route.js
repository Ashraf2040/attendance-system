import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
);

export async function POST(request) {
  try {
    const { iqamaNo, reason, date } = await request.json();
    if (!iqamaNo || !reason || !date) {
      return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("leave_requests")
      .insert({ iqama_no: iqamaNo, reason, date, status: "pending" })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, request: data }, { status: 200 });
  } catch (error) {
    console.error("خطأ في تقديم طلب الإجازة:", error);
    return NextResponse.json({ error: "خطأ داخلي في الخادم" }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = request.nextUrl;
    const iqamaNo = searchParams.get("iqamaNo");

    let query = supabase
      .from("leave_requests")
      .select("*")
      .order("timestamp", { ascending: false });

    if (iqamaNo) {
      query = query.eq("iqama_no", iqamaNo);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("خطأ في استرجاع طلبات الإجازة:", error);
    return NextResponse.json({ error: "خطأ داخلي في الخادم" }, { status: 500 });
  }
}