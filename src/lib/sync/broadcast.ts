import type { ClientMessage } from "@/types/messages";
import type { BoardObject } from "@/types/board";

type SendFn = (msg: ClientMessage) => void;

export function broadcastObjectCreate(send: SendFn, object: BoardObject) {
  send({ type: "object:create", object });
}

export function broadcastObjectUpdate(send: SendFn, object: BoardObject, ephemeral = false) {
  send({ type: "object:update", object, ephemeral });
}

export function broadcastObjectDelete(send: SendFn, objectId: string) {
  send({ type: "object:delete", objectId });
}
