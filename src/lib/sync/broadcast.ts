import type { ClientMessage } from "@/types/messages";
import type { BoardObject, Frame } from "@/types/board";

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

export function broadcastFrameCreate(send: SendFn, frame: Frame) {
  send({ type: "frame:create", frame });
}

export function broadcastFrameDelete(send: SendFn, frameId: string) {
  send({ type: "frame:delete", frameId });
}
