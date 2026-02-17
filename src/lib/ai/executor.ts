import type { BoardObject } from "@/types/board";
import { serializeBoardState } from "./system-prompt";

export interface ExecutorContext {
  boardId: string;
  boardUUID: string;
  userId: string;
  displayName: string;
  objects: BoardObject[];
  partyKitBaseUrl: string;
  aiSecret: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
}

interface ToolResult {
  result: string;
  objects?: BoardObject[];
}

function nextZIndex(objects: BoardObject[]): number {
  if (objects.length === 0) return 0;
  return Math.max(...objects.map((o) => o.z_index)) + 1;
}

function makeObject(
  ctx: ExecutorContext,
  overrides: Partial<BoardObject> & { type: BoardObject["type"] }
): BoardObject {
  return {
    id: crypto.randomUUID(),
    board_id: ctx.boardUUID,
    type: overrides.type,
    x: overrides.x ?? 400 + Math.random() * 400,
    y: overrides.y ?? 200 + Math.random() * 300,
    width: overrides.width ?? (overrides.type === "sticky" ? 200 : overrides.type === "text" ? 300 : 200),
    height: overrides.height ?? (overrides.type === "sticky" ? 200 : overrides.type === "text" ? 40 : 150),
    color: overrides.color ?? (overrides.type === "sticky" ? "#fef08a" : overrides.type === "rectangle" ? "#bfdbfe" : "transparent"),
    text: overrides.text ?? "",
    z_index: nextZIndex(ctx.objects),
    created_by: ctx.userId,
    created_by_name: `AI (${ctx.displayName})`,
    updated_at: new Date().toISOString(),
  };
}

async function persistToSupabase(ctx: ExecutorContext, obj: BoardObject): Promise<void> {
  try {
    const res = await fetch(`${ctx.supabaseUrl}/rest/v1/board_objects`, {
      method: "POST",
      headers: {
        apikey: ctx.supabaseServiceRoleKey,
        Authorization: `Bearer ${ctx.supabaseServiceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(obj),
    });
    if (!res.ok) {
      console.error(`persistToSupabase failed (${res.status}):`, await res.text());
    }
  } catch (e) {
    console.error("Failed to persist to Supabase:", e);
  }
}

async function deleteFromSupabase(ctx: ExecutorContext, objectId: string): Promise<void> {
  try {
    const res = await fetch(
      `${ctx.supabaseUrl}/rest/v1/board_objects?id=eq.${objectId}`,
      {
        method: "DELETE",
        headers: {
          apikey: ctx.supabaseServiceRoleKey,
          Authorization: `Bearer ${ctx.supabaseServiceRoleKey}`,
        },
      }
    );
    if (!res.ok) {
      console.error(`deleteFromSupabase failed (${res.status}):`, await res.text());
    }
  } catch (e) {
    console.error("Failed to delete from Supabase:", e);
  }
}

async function postToPartyKit(
  ctx: ExecutorContext,
  actions: Array<{ type: "create" | "update" | "delete"; object?: BoardObject; objectId?: string }>
): Promise<void> {
  const url = `${ctx.partyKitBaseUrl}/parties/main/${ctx.boardId}`;
  try {
    console.log("[AI] POST to PartyKit:", url);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ctx.aiSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ actions }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`[AI] PartyKit POST failed (${res.status}):`, body);
    } else {
      console.log("[AI] PartyKit POST success:", await res.json());
    }
  } catch (e) {
    console.error("[AI] Failed to POST to PartyKit:", e);
  }
}

export async function executeToolCall(
  toolName: string,
  toolInput: Record<string, unknown>,
  ctx: ExecutorContext
): Promise<ToolResult> {
  switch (toolName) {
    case "createStickyNote": {
      const obj = makeObject(ctx, {
        type: "sticky",
        x: toolInput.x as number | undefined,
        y: toolInput.y as number | undefined,
        color: (toolInput.color as string) || "#fef08a",
        text: (toolInput.text as string) || "",
      });
      await persistToSupabase(ctx, obj);
      await postToPartyKit(ctx, [{ type: "create", object: obj }]);
      ctx.objects.push(obj);
      return { result: `Created sticky note "${obj.text}" (id: ${obj.id})`, objects: [obj] };
    }

    case "createShape": {
      const shapeType = (toolInput.type as string) === "text" ? "text" as const : "rectangle" as const;
      const defaults = shapeType === "text"
        ? { width: 300, height: 40, color: "transparent" }
        : { width: 200, height: 150, color: "#bfdbfe" };
      const obj = makeObject(ctx, {
        type: shapeType,
        x: toolInput.x as number | undefined,
        y: toolInput.y as number | undefined,
        width: (toolInput.width as number) || defaults.width,
        height: (toolInput.height as number) || defaults.height,
        color: (toolInput.color as string) || defaults.color,
        text: (toolInput.text as string) || "",
      });
      await persistToSupabase(ctx, obj);
      await postToPartyKit(ctx, [{ type: "create", object: obj }]);
      ctx.objects.push(obj);
      return { result: `Created ${shapeType} (id: ${obj.id})`, objects: [obj] };
    }

    case "moveObject": {
      const obj = ctx.objects.find((o) => o.id === toolInput.objectId);
      if (!obj) return { result: `Error: object ${toolInput.objectId} not found` };
      obj.x = toolInput.x as number;
      obj.y = toolInput.y as number;
      obj.updated_at = new Date().toISOString();
      await persistToSupabase(ctx, obj);
      await postToPartyKit(ctx, [{ type: "update", object: obj }]);
      return { result: `Moved object ${obj.id} to (${obj.x}, ${obj.y})` };
    }

    case "resizeObject": {
      const obj = ctx.objects.find((o) => o.id === toolInput.objectId);
      if (!obj) return { result: `Error: object ${toolInput.objectId} not found` };
      obj.width = toolInput.width as number;
      obj.height = toolInput.height as number;
      obj.updated_at = new Date().toISOString();
      await persistToSupabase(ctx, obj);
      await postToPartyKit(ctx, [{ type: "update", object: obj }]);
      return { result: `Resized object ${obj.id} to ${obj.width}x${obj.height}` };
    }

    case "updateText": {
      const obj = ctx.objects.find((o) => o.id === toolInput.objectId);
      if (!obj) return { result: `Error: object ${toolInput.objectId} not found` };
      obj.text = toolInput.newText as string;
      obj.updated_at = new Date().toISOString();
      await persistToSupabase(ctx, obj);
      await postToPartyKit(ctx, [{ type: "update", object: obj }]);
      return { result: `Updated text of ${obj.id}` };
    }

    case "changeColor": {
      const obj = ctx.objects.find((o) => o.id === toolInput.objectId);
      if (!obj) return { result: `Error: object ${toolInput.objectId} not found` };
      obj.color = toolInput.color as string;
      obj.updated_at = new Date().toISOString();
      await persistToSupabase(ctx, obj);
      await postToPartyKit(ctx, [{ type: "update", object: obj }]);
      return { result: `Changed color of ${obj.id} to ${obj.color}` };
    }

    case "deleteObject": {
      const idx = ctx.objects.findIndex((o) => o.id === toolInput.objectId);
      if (idx === -1) return { result: `Error: object ${toolInput.objectId} not found` };
      await deleteFromSupabase(ctx, toolInput.objectId as string);
      await postToPartyKit(ctx, [{ type: "delete", objectId: toolInput.objectId as string }]);
      ctx.objects.splice(idx, 1);
      return { result: `Deleted object ${toolInput.objectId}` };
    }

    case "getBoardState": {
      return { result: serializeBoardState(ctx.objects) };
    }

    default:
      return { result: `Unknown tool: ${toolName}` };
  }
}
