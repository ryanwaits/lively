# app_proxy WebSocket verification (the last open risk)

The plan's open risk #2 — "WS heartbeat (45s) vs app_proxy idle timeout unknown"
— resolved by running the **real** Umbrel `app_proxy` (`getumbrel/app-proxy:1.7.0`,
the current umbrelOS proxy) in front of the published Lively image locally, in
the exact `app_proxy → web` topology the store compose declares.

## Source analysis (getumbrel/umbrel · containers/app-proxy)

- `PROXY_TIMEOUT` defaults to **`0` (disabled)** — app_proxy sets no idle
  timeout on the proxied socket, so it never closes a WebSocket for inactivity.
- Proxy uses `http-proxy-middleware` with `ws: true` and an explicit
  `server.on('upgrade')` handler that re-checks auth, then forwards the upgrade.
- `isAuthorized()` returns `true` immediately when `PROXY_AUTH_ADD=false`;
  otherwise a whitelisted path (`PROXY_AUTH_WHITELIST`) passes, or the
  `UMBREL_PROXY_TOKEN` cookie is validated. Our browser WS is same-origin and
  carries that cookie, so it authorizes under default (auth-on) settings.
- Independently, the Lively client sends a heartbeat every **30s**
  (`heartbeatIntervalMs = 30_000`), under the server's 45s window — so data
  flows regularly even setting the proxy aside.

## Empirical tests (real app_proxy 1.7.0 in front of the published image)

Topology: `lively_app_proxy_1` (getumbrel/app-proxy:1.7.0) → `lively_web_1`
(ghcr.io/ryanwaits/lively@sha256:72bfc538…) on a shared docker network, exactly
as `docker-compose.yml` declares (APP_HOST/APP_PORT).

| Check | Result |
|---|---|
| HTTP `GET /`, `/health`, `/api/config` through proxy | 200 / 200 / `{"ai":false}` |
| **Fully-idle WS held 150s through proxy** (3× the 45s window) | survived, readyState=OPEN ✓ |
| Idle WS still carries data afterward (2nd client join → presence) | received presence instantly ✓ |
| Auth ON, landing `/` protected | 302 → auth ✓ |
| Auth ON + `PROXY_AUTH_WHITELIST=/rooms/*`: external WS to `/rooms/*` | CONNECTED ✓ |
| Auth ON: non-whitelisted path WS (no cookie) | rejected ✓ |

**Conclusion:** app_proxy does not impose a WebSocket idle timeout (default
`PROXY_TIMEOUT=0`), confirmed empirically against a fully-idle socket held well
past the server's heartbeat window. The v1 design (proxy auth protects the app,
browser cookie authorizes the same-origin WS) and the v1.1 external-client path
(`PROXY_AUTH_WHITELIST: "/rooms/*"`) both work against the real proxy image.

This closes the app_proxy WebSocket question at the component level. The
umbrelOS VM install (RUNTIME-TEST.md) remains as end-to-end confirmation
(install → open → reboot persistence → uninstall) but is no longer gating the
core technical risk.
