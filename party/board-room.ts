import type * as Party from "partykit/server";
import type { ClientMessage, ServerMessage } from "../src/types/messages";
import type { PresenceUser, CursorData, BoardObject, Frame } from "../src/types/board";

const COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6",
];

interface ConnectionState {
  userId: string;
  displayName: string;
  color: string;
  connectedAt: number;
}

export default class BoardRoom implements Party.Server {
  connections: Map<string, ConnectionState> = new Map();
  objects: Map<string, BoardObject> = new Map();
  frames: Frame[] = [];

  constructor(readonly room: Party.Room) {}

  private get boardId(): string {
    return this.room.id === "default"
      ? "00000000-0000-0000-0000-000000000000"
      : this.room.id;
  }

  async onStart() {
    const supabaseUrl = this.room.env.SUPABASE_URL as string;
    const serviceRoleKey = this.room.env.SUPABASE_SERVICE_ROLE_KEY as string;

    if (supabaseUrl && serviceRoleKey) {
      try {
        // Load objects
        const objRes = await fetch(
          `${supabaseUrl}/rest/v1/board_objects?board_id=eq.${this.boardId}&select=*`,
          {
            headers: {
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
            },
          }
        );
        if (objRes.ok) {
          const rows: BoardObject[] = await objRes.json();
          for (const obj of rows) {
            this.objects.set(obj.id, obj);
          }
        }

        // Load frames from boards table
        const boardRes = await fetch(
          `${supabaseUrl}/rest/v1/boards?id=eq.${this.boardId}&select=frames`,
          {
            headers: {
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
            },
          }
        );
        if (boardRes.ok) {
          const boards = await boardRes.json();
          if (boards.length > 0 && Array.isArray(boards[0].frames) && boards[0].frames.length > 0) {
            this.frames = boards[0].frames;
          } else {
            // Default: single frame
            this.frames = [{ id: crypto.randomUUID(), index: 0, label: "Frame 1" }];
            this.persistFrames();
          }
        }
      } catch (e) {
        console.error("Failed to load board data:", e);
      }
    }

    // Ensure at least one frame exists
    if (this.frames.length === 0) {
      this.frames = [{ id: crypto.randomUUID(), index: 0, label: "Frame 1" }];
    }
  }

  async onRequest(req: Party.Request): Promise<Response> {
    if (req.method === "GET") {
      return Response.json({ objects: Array.from(this.objects.values()), frames: this.frames });
    }

    if (req.method === "POST") {
      const aiSecret = this.room.env.AI_SECRET as string;
      if (!aiSecret) {
        return Response.json({ error: "AI_SECRET not configured" }, { status: 500 });
      }
      const auth = req.headers.get("Authorization");
      if (auth !== `Bearer ${aiSecret}`) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = (await req.json()) as {
        actions: Array<{
          type: "create" | "update" | "delete";
          object?: BoardObject;
          objectId?: string;
        }>;
      };

      for (const action of body.actions) {
        switch (action.type) {
          case "create": {
            if (!action.object) continue;
            this.objects.set(action.object.id, action.object);
            const msg: ServerMessage = { type: "object:create", object: action.object };
            this.room.broadcast(JSON.stringify(msg));
            this.persistObject(action.object);
            break;
          }
          case "update": {
            if (!action.object) continue;
            const existing = this.objects.get(action.object.id);
            if (!existing || action.object.updated_at >= existing.updated_at) {
              this.objects.set(action.object.id, action.object);
              const msg: ServerMessage = { type: "object:update", object: action.object };
              this.room.broadcast(JSON.stringify(msg));
              this.persistObject(action.object);
            }
            break;
          }
          case "delete": {
            if (!action.objectId) continue;
            this.objects.delete(action.objectId);
            const msg: ServerMessage = { type: "object:delete", objectId: action.objectId };
            this.room.broadcast(JSON.stringify(msg));
            this.deleteObject(action.objectId);
            break;
          }
        }
      }

      return Response.json({ ok: true, processed: body.actions.length });
    }

    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    const url = new URL(ctx.request.url);
    const userId = url.searchParams.get("userId") || conn.id;
    const displayName = url.searchParams.get("displayName") || "Anonymous";
    const color = COLORS[Math.abs(hashCode(userId)) % COLORS.length];

    this.connections.set(conn.id, {
      userId,
      displayName,
      color,
      connectedAt: Date.now(),
    });

    // Send current objects to new client
    const syncMsg: ServerMessage = {
      type: "sync",
      objects: Array.from(this.objects.values()),
    };
    conn.send(JSON.stringify(syncMsg));

    // Send current frames to new client
    const frameSyncMsg: ServerMessage = {
      type: "frame:sync",
      frames: this.frames,
    };
    conn.send(JSON.stringify(frameSyncMsg));

    // Broadcast updated presence
    this.broadcastPresence();
  }

  onMessage(message: string, sender: Party.Connection) {
    const data: ClientMessage = JSON.parse(message);
    const senderState = this.connections.get(sender.id);
    if (!senderState) return;

    switch (data.type) {
      case "cursor:update": {
        const cursorMsg: ServerMessage = {
          type: "cursor:update",
          cursor: {
            userId: senderState.userId,
            displayName: senderState.displayName,
            color: senderState.color,
            x: data.x,
            y: data.y,
            lastUpdate: Date.now(),
          },
        };
        this.room.broadcast(JSON.stringify(cursorMsg), [sender.id]);
        break;
      }

      case "object:create": {
        this.objects.set(data.object.id, data.object);
        const msg: ServerMessage = { type: "object:create", object: data.object };
        this.room.broadcast(JSON.stringify(msg));
        this.persistObject(data.object);
        break;
      }

      case "object:update": {
        const existing = this.objects.get(data.object.id);
        if (!existing || data.object.updated_at >= existing.updated_at) {
          this.objects.set(data.object.id, data.object);
          const msg: ServerMessage = { type: "object:update", object: data.object };
          this.room.broadcast(JSON.stringify(msg), [sender.id]);
          if (!data.ephemeral) {
            this.persistObject(data.object);
          }
        }
        break;
      }

      case "object:delete": {
        this.objects.delete(data.objectId);
        const msg: ServerMessage = { type: "object:delete", objectId: data.objectId };
        this.room.broadcast(JSON.stringify(msg));
        this.deleteObject(data.objectId);
        break;
      }

      case "frame:create": {
        this.frames.push(data.frame);
        this.frames.sort((a, b) => a.index - b.index);
        const msg: ServerMessage = { type: "frame:create", frame: data.frame };
        this.room.broadcast(JSON.stringify(msg));
        this.persistFrames();
        break;
      }
    }
  }

  onClose(conn: Party.Connection) {
    this.connections.delete(conn.id);
    this.broadcastPresence();
  }

  private broadcastPresence() {
    const users: PresenceUser[] = Array.from(this.connections.values()).map((c) => ({
      userId: c.userId,
      displayName: c.displayName,
      color: c.color,
      connectedAt: c.connectedAt,
    }));
    const msg: ServerMessage = { type: "presence", users };
    this.room.broadcast(JSON.stringify(msg));
  }

  private async persistObject(obj: BoardObject) {
    const supabaseUrl = this.room.env.SUPABASE_URL as string;
    const serviceRoleKey = this.room.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!supabaseUrl || !serviceRoleKey) return;

    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/board_objects`, {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify(obj),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error(`persistObject failed (${res.status}):`, body);
      }
    } catch (e) {
      console.error("Failed to persist object:", e);
    }
  }

  private async persistFrames() {
    const supabaseUrl = this.room.env.SUPABASE_URL as string;
    const serviceRoleKey = this.room.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!supabaseUrl || !serviceRoleKey) return;

    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/boards?id=eq.${this.boardId}`,
        {
          method: "PATCH",
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ frames: this.frames }),
        }
      );
      if (!res.ok) {
        const body = await res.text();
        console.error(`persistFrames failed (${res.status}):`, body);
      }
    } catch (e) {
      console.error("Failed to persist frames:", e);
    }
  }

  private async deleteObject(objectId: string) {
    const supabaseUrl = this.room.env.SUPABASE_URL as string;
    const serviceRoleKey = this.room.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!supabaseUrl || !serviceRoleKey) return;

    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/board_objects?id=eq.${objectId}`,
        {
          method: "DELETE",
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
        }
      );
      if (!res.ok) {
        const body = await res.text();
        console.error(`deleteObject failed (${res.status}):`, body);
      }
    } catch (e) {
      console.error("Failed to delete object:", e);
    }
  }
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}

BoardRoom satisfies Party.Worker;
