import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    // Frontend se data lenge
    const body = await req.json();

    // Ab humara Backend server Expo ko request bhejega (Yahan CORS nahi aayega!)
    const expoResponse = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { 
        "Accept": "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json" 
      },
      body: JSON.stringify(body),
    });

    const data = await expoResponse.json();
    return NextResponse.json({ success: true, data }, { status: 200 });

  } catch (error) {
    console.error("Backend Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}