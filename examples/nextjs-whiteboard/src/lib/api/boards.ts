import { serverUrl } from "@/lib/sync/client";

export interface Board {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
  object_count: number;
}

export async function fetchBoards(): Promise<Board[]> {
  const res = await fetch(`${serverUrl}/api/boards`);
  if (!res.ok) throw new Error(`fetchBoards failed (${res.status})`);
  const { boards } = (await res.json()) as { boards: Board[] };
  return boards;
}

export async function createBoard(name: string, userId: string): Promise<Board> {
  const res = await fetch(`${serverUrl}/api/boards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, created_by: userId }),
  });
  if (!res.ok) throw new Error(`createBoard failed (${res.status})`);
  const { board } = (await res.json()) as { board: Board };
  return board;
}
