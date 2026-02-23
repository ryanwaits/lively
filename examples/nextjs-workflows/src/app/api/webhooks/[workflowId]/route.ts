import { NextRequest, NextResponse } from "next/server";

// POST /api/webhooks/[workflowId] — receive Secondlayer delivery payloads
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> },
) {
  const { workflowId } = await params;
  const body = await req.json();

  console.log(`[webhook] workflowId=${workflowId}`, JSON.stringify(body, null, 2));

  return NextResponse.json({ ok: true });
}
