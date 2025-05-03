import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const iqamaNo = searchParams.get("iqamaNo");
    let query = supabase.from("attendance").select("*");
    if (iqamaNo) query = query.eq("iqama_no", iqamaNo);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in GET /api/attendance:", error);
    return NextResponse.json({ error: "خطأ داخلي في الخادم" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { iqamaNo, status, timestamp } = await request.json();
    if (!iqamaNo || !status || !timestamp) {
      return NextResponse.json({ error: "رقم الإقامة، الحالة، والوقت مطلوبة" }, { status: 400 });
    }
    const { error } = await supabase.from("attendance").insert({
      iqama_no: iqamaNo,
      status,
      timestamp,
    });
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/attendance:", error);
    return NextResponse.json({ error: "خطأ داخلي في الخادم" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { id, timestamp } = await request.json();
    if (!id || !timestamp) {
      return NextResponse.json({ error: "معرف السجل والوقت الجديد مطلوبان" }, { status: 400 });
    }
    const { error } = await supabase
      .from("attendance")
      .update({ timestamp })
      .eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in PUT /api/attendance:", error);
    return NextResponse.json({ error: "خطأ داخلي في الخادم" }, { status: 500 });
  }
}