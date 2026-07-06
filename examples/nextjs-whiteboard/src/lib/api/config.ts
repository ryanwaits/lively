"use client";

import { useEffect, useState } from "react";
import { serverUrl } from "@/lib/sync/client";

export interface ServerCapabilities {
  ai: boolean;
}

const DEFAULTS: ServerCapabilities = { ai: false };

let cached: Promise<ServerCapabilities> | null = null;

export function fetchServerConfig(): Promise<ServerCapabilities> {
  cached ??= fetch(`${serverUrl}/api/config`)
    .then((res) => (res.ok ? res.json() : DEFAULTS))
    .then((config) => ({ ...DEFAULTS, ...config }))
    .catch(() => DEFAULTS);
  return cached;
}

/** Capability flags from the server; everything off until the fetch lands. */
export function useServerConfig(): ServerCapabilities {
  const [config, setConfig] = useState<ServerCapabilities>(DEFAULTS);
  useEffect(() => {
    let active = true;
    fetchServerConfig().then((c) => {
      if (active) setConfig(c);
    });
    return () => {
      active = false;
    };
  }, []);
  return config;
}
