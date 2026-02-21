import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRoom } from "./room-context.js";
import { useOthers } from "./use-others.js";

const LERP_FACTOR = 0.25;
const LERP_POS_EPSILON = 0.5;
const LERP_SCALE_EPSILON = 0.001;

export interface UseFollowUserOptions {
  onViewportChange?: (pos: { x: number; y: number }, scale: number) => void;
  /** Auto-exit follow mode on user interaction (default: true) */
  exitOnInteraction?: boolean;
  onAutoExit?: (reason: "disconnected" | "interaction") => void;
  /** Lerp factor for viewport interpolation (0–1, default 0.25). Higher = snappier. */
  lerpFactor?: number;
}

export interface UseFollowUserReturn {
  followingUserId: string | null;
  followUser: (userId: string) => void;
  stopFollowing: () => void;
  followers: string[];
  isBeingFollowed: boolean;
}

export function useFollowUser(
  opts: UseFollowUserOptions = {}
): UseFollowUserReturn {
  const room = useRoom();
  const others = useOthers();
  const optsRef = useRef(opts);
  optsRef.current = opts;

  // Local state for immediate UI — presence metadata is sent for other clients
  const [followingUserId, setFollowingUserId] = useState<string | null>(null);

  const followUser = useCallback(
    (userId: string) => {
      setFollowingUserId(userId);
      room.followUser(userId);
    },
    [room]
  );

  // Lerp animation state
  const lerpTarget = useRef<{ x: number; y: number; scale: number } | null>(null);
  const lerpCurrent = useRef<{ x: number; y: number; scale: number } | null>(null);
  const lerpRaf = useRef(0);

  const stopFollowing = useCallback(() => {
    setFollowingUserId(null);
    room.stopFollowing();
    // Stop lerp animation
    lerpTarget.current = null;
    lerpCurrent.current = null;
    cancelAnimationFrame(lerpRaf.current);
    lerpRaf.current = 0;
  }, [room]);

  // Derive followers from others' presence metadata
  const followersCache = useRef<string[]>([]);
  const followers = useSyncExternalStore(
    useCallback((cb) => room.subscribe("presence", () => cb()), [room]),
    useCallback(() => {
      const next = room.getFollowers().sort();
      const prev = followersCache.current;
      if (
        prev.length === next.length &&
        prev.every((id, i) => id === next[i])
      ) {
        return prev;
      }
      followersCache.current = next;
      return next;
    }, [room]),
    () => [] as string[]
  );

  // 60fps lerp loop — interpolates toward target and calls onViewportChange
  useEffect(() => {
    if (!followingUserId) return;

    function tick() {
      const target = lerpTarget.current;
      const cur = lerpCurrent.current;
      if (!target || !cur) {
        lerpRaf.current = 0;
        return;
      }

      const factor = optsRef.current.lerpFactor ?? LERP_FACTOR;
      const dx = target.x - cur.x;
      const dy = target.y - cur.y;
      const ds = target.scale - cur.scale;

      const close =
        Math.abs(dx) < LERP_POS_EPSILON &&
        Math.abs(dy) < LERP_POS_EPSILON &&
        Math.abs(ds) < LERP_SCALE_EPSILON;

      if (close) {
        cur.x = target.x;
        cur.y = target.y;
        cur.scale = target.scale;
      } else {
        cur.x += dx * factor;
        cur.y += dy * factor;
        cur.scale += ds * factor;
      }

      optsRef.current.onViewportChange?.(
        { x: cur.x, y: cur.y },
        cur.scale
      );

      if (!close) {
        lerpRaf.current = requestAnimationFrame(tick);
      } else {
        lerpRaf.current = 0;
      }
    }

    // Subscribe to cursor events — update lerp target on each tick
    const lastVp = { x: 0, y: 0, s: 0 };
    const unsub = room.subscribe("cursors", () => {
      const cursors = room.getCursors();
      const targetCursor = cursors.get(followingUserId);
      if (
        !targetCursor?.viewportPos ||
        targetCursor.viewportScale == null
      ) return;

      const { viewportPos: vp, viewportScale: vs } = targetCursor;
      // Dedup identical updates
      if (vp.x === lastVp.x && vp.y === lastVp.y && vs === lastVp.s) return;
      lastVp.x = vp.x;
      lastVp.y = vp.y;
      lastVp.s = vs;

      // Initialize current position on first update
      if (!lerpCurrent.current) {
        lerpCurrent.current = { x: vp.x, y: vp.y, scale: vs };
        lerpTarget.current = { x: vp.x, y: vp.y, scale: vs };
        // Apply immediately on first update (no lerp needed)
        optsRef.current.onViewportChange?.(vp, vs);
        return;
      }

      lerpTarget.current = { x: vp.x, y: vp.y, scale: vs };

      // Start lerp loop if not already running
      if (!lerpRaf.current) {
        lerpRaf.current = requestAnimationFrame(tick);
      }
    });

    return () => {
      unsub();
      cancelAnimationFrame(lerpRaf.current);
      lerpRaf.current = 0;
      lerpTarget.current = null;
      lerpCurrent.current = null;
    };
  }, [room, followingUserId]);

  // Auto-exit when target disconnects
  useEffect(() => {
    if (!followingUserId) return;
    const stillHere = others.some((u) => u.userId === followingUserId);
    if (!stillHere) {
      setFollowingUserId(null);
      room.stopFollowing();
      lerpTarget.current = null;
      lerpCurrent.current = null;
      cancelAnimationFrame(lerpRaf.current);
      lerpRaf.current = 0;
      optsRef.current.onAutoExit?.("disconnected");
    }
  }, [room, followingUserId, others]);

  // Exit on user interaction
  useEffect(() => {
    if (!followingUserId) return;
    if (optsRef.current.exitOnInteraction === false) return;

    const handler = () => {
      setFollowingUserId(null);
      room.stopFollowing();
      lerpTarget.current = null;
      lerpCurrent.current = null;
      cancelAnimationFrame(lerpRaf.current);
      lerpRaf.current = 0;
      optsRef.current.onAutoExit?.("interaction");
    };

    document.addEventListener("wheel", handler, { passive: true });
    document.addEventListener("pointerdown", handler);

    return () => {
      document.removeEventListener("wheel", handler);
      document.removeEventListener("pointerdown", handler);
    };
  }, [room, followingUserId]);

  return {
    followingUserId,
    followUser,
    stopFollowing,
    followers,
    isBeingFollowed: followers.length > 0,
  };
}
