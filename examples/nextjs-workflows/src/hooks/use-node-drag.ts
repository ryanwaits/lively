"use client";

import { useRef, useCallback, useEffect } from "react";
import { screenToCanvas } from "@/lib/canvas-utils";
import { useViewportStore } from "@/lib/store/viewport-store";
import { useWorkflowStore } from "@/lib/store/workflow-store";
import type { WorkflowMutationsApi } from "@/lib/sync/mutations-context";

export function useNodeDrag(
  svgRef: React.RefObject<SVGSVGElement | null>,
  mutations: WorkflowMutationsApi,
) {
  const dragRef = useRef<{
    nodeId: string;
    startCanvasX: number;
    startCanvasY: number;
    startNodeX: number;
    startNodeY: number;
  } | null>(null);
  const mutationsRef = useRef(mutations);
  mutationsRef.current = mutations;

  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      const header = target.closest("[data-node-header]") as HTMLElement | null;
      if (!header) return;
      const nodeG = target.closest("[data-node-id]") as SVGGElement | null;
      if (!nodeG) return;
      const nodeId = nodeG.dataset.nodeId;
      if (!nodeId) return;
      if ((e.target as HTMLElement).closest("[data-node-port]")) return;

      const node = useWorkflowStore.getState().nodes.get(nodeId);
      if (!node) return;
      const svg = svgRef.current;
      if (!svg) return;
      const { pos, scale } = useViewportStore.getState();
      const rect = svg.getBoundingClientRect();
      const canvasPos = screenToCanvas(e.clientX, e.clientY, rect, pos, scale);

      dragRef.current = {
        nodeId,
        startCanvasX: canvasPos.x,
        startCanvasY: canvasPos.y,
        startNodeX: node.position.x,
        startNodeY: node.position.y,
      };
      useWorkflowStore.getState().selectNode(nodeId);
      e.preventDefault();
      e.stopPropagation();
    },
    [svgRef],
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragRef.current) return;
      const svg = svgRef.current;
      if (!svg) return;
      const { pos, scale } = useViewportStore.getState();
      const rect = svg.getBoundingClientRect();
      const canvasPos = screenToCanvas(e.clientX, e.clientY, rect, pos, scale);
      const dx = canvasPos.x - dragRef.current.startCanvasX;
      const dy = canvasPos.y - dragRef.current.startCanvasY;
      const node = useWorkflowStore.getState().nodes.get(dragRef.current.nodeId);
      if (!node) return;

      mutationsRef.current.updateNode({
        ...node,
        position: {
          x: dragRef.current.startNodeX + dx,
          y: dragRef.current.startNodeY + dy,
        },
      });
    },
    [svgRef],
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      svg.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [svgRef, handlePointerDown, handlePointerMove, handlePointerUp]);
}
