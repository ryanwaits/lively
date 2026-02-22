"use client";

import { useRef, useState, useCallback, useEffect } from "react";

const MIN_WIDTH = 320;
const MAX_WIDTH = 800;

export function usePanelResize(initialWidth = 384) {
  const [width, setWidth] = useState(initialWidth);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragRef.current = { startX: e.clientX, startWidth: width };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      e.preventDefault();
    },
    [width],
  );

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!dragRef.current) return;
      const delta = dragRef.current.startX - e.clientX; // panel is right-aligned
      const maxVw = window.innerWidth * 0.6;
      const clamped = Math.min(Math.max(dragRef.current.startWidth + delta, MIN_WIDTH), Math.min(MAX_WIDTH, maxVw));
      setWidth(clamped);
    }

    function onUp() {
      if (!dragRef.current) return;
      dragRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return { width, handlePointerDown };
}
