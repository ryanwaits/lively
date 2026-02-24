"use client";

import { useBoardStore } from "@/lib/store/board-store";
import { UNASSIGNED_WORKFLOW_ID } from "@/types/workflow";
import { getWorkflowBBox } from "@/lib/workflow/bounding-box";
import { WorkflowRegionTint } from "./workflow-region-tint";
import { WorkflowAnchorBadge } from "./workflow-anchor-badge";
import type { WorkflowMutationsApi } from "@/lib/sync/mutations-context";

// Match mock-d spacing: pad=40, badgeH=56, regionPadTop=16
// Region tint adds its own PADDING=40, so we extend bbox to compensate.
const BADGE_AREA = 72; // vertical extension above node bbox (badgeH + regionPadTop = 56+16)

function useWorkflowLayout() {
  const workflows = useBoardStore((s) => s.workflows);
  const nodes = useBoardStore((s) => s.nodes);

  const workflowNodeMap = new Map<string, typeof nodes extends Map<string, infer V> ? V[] : never>();
  for (const node of nodes.values()) {
    const arr = workflowNodeMap.get(node.workflowId) ?? [];
    arr.push(node);
    workflowNodeMap.set(node.workflowId, arr);
  }

  const entries: {
    wfId: string;
    wf: NonNullable<ReturnType<typeof workflows.get>>;
    bbox: ReturnType<typeof getWorkflowBBox>;
    extendedBbox: ReturnType<typeof getWorkflowBBox>;
    triggerX: number;
  }[] = [];

  for (const wfId of workflows.keys()) {
    if (wfId === UNASSIGNED_WORKFLOW_ID) continue;
    const wfNodes = workflowNodeMap.get(wfId) ?? [];
    if (wfNodes.length === 0) continue;
    const wf = workflows.get(wfId);
    if (!wf) continue;
    const bbox = getWorkflowBBox(wfNodes);
    const triggerNode = wfNodes.find((n) => n.type === "event-trigger");
    entries.push({
      wfId,
      wf,
      bbox,
      extendedBbox: { ...bbox, y: bbox.y - BADGE_AREA, h: bbox.h + BADGE_AREA },
      triggerX: triggerNode?.position.x ?? bbox.x,
    });
  }

  return entries;
}

/** Region tints — render BEFORE nodes so they sit behind. */
export function WorkflowRegionsLayer() {
  const entries = useWorkflowLayout();
  return (
    <g>
      {entries.map(({ wfId, wf, extendedBbox }) => (
        <WorkflowRegionTint
          key={wfId}
          wfId={wfId}
          bbox={extendedBbox}
          status={wf.stream.status}
          onClick={(e) => {
            e.stopPropagation();
            useBoardStore.getState().selectWorkflow(wfId, { shift: e.shiftKey });
          }}
        />
      ))}
    </g>
  );
}

/** Anchor badges — render AFTER nodes so dropdowns paint on top. */
export function WorkflowBadgesLayer({ mutations, boardId }: { mutations: WorkflowMutationsApi; boardId: string }) {
  const entries = useWorkflowLayout();
  return (
    <g>
      {entries.map(({ wfId, bbox, triggerX }) => (
        <WorkflowAnchorBadge
          key={wfId}
          wfId={wfId}
          bbox={bbox}
          triggerX={triggerX}
          mutations={mutations}
          boardId={boardId}
        />
      ))}
    </g>
  );
}
