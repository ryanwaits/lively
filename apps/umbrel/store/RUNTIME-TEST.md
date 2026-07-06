# umbrelOS runtime test — results (QEMU VM, emulated amd64)

Full end-to-end install of Lively on a real **umbrelOS 1.7.3** instance, booted
headless in QEMU from the official `umbrelos-amd64.img` raw disk image (no UTM
GUI needed — a raw image boots directly).

## Verified end-to-end on genuine umbrelOS ✓

- **Boot + onboarding**: umbrelOS 1.7.3 amd64 boots under QEMU (UEFI/OVMF, rugpi
  A/B), web UI up, account creation completes, desktop + App Store load.
- **Install**: Lively template placed in the app store, installed via
  `umbreld client apps.install.mutate --appId lively`. Image
  `ghcr.io/ryanwaits/lively:0.1.0@sha256:72bfc538…` pulled (amd64 variant from
  our multi-arch manifest), `lively_app_proxy_1` + `lively_web_1` both **Up
  (healthy)**, app tile on the dashboard, data dir provisioned. Port 8401,
  bind-mount, and `user: "1000:1000"` all accepted.
- **Serves through app_proxy**: landing page and all four apps load behind
  Umbrel's auth (verified in a browser via the authed session on port 8401).
- **`/api/boards`**: create + list work through app_proxy.
- **WebSocket collaboration**: joined the whiteboard, created a board, placed
  shapes — storage ops flowed over `/rooms/*` through app_proxy and rendered.
- **Persistence**: rooms written to the bind-mounted `/data/rooms/` as
  `<board>.json` and Yjs `<room>.yjs`.
- **Reboot persistence**: after a full VM reboot, all room files were
  **byte-identical** (md5 match), both boards survived, and the app served them
  with correct object counts derived from the snapshots ("umbrelOS demo (2
  objs)", "main (1 obj)"). The SIGTERM flush during shutdown worked.
- **Clean uninstall**: `umbreld client apps.uninstall.mutate --appId lively` →
  both containers removed, app dropped from the apps list, app-data directory
  removed, nothing orphaned in trash, images pruned.

## One host caveat (emulation only, not a device defect)

The app process requires booting the QEMU VM with `-cpu max` (exposes AVX2 under
TCG). With QEMU's default `qemu64` CPU, `lively_web_1` exits **132 (SIGILL)** —
bun hits an illegal instruction because the emulated CPU lacks AVX2-class
instructions. This is the runtime twin of the build-time finding and is **not
reproducible on real hardware**:

- **amd64 real hardware** (Umbrel Home, NUC, x86 mini-PC): CI boot-smoke of the
  amd64 image on GitHub's native amd64 runner passed — all app surfaces 200.
- **arm64 real hardware** (Raspberry Pi): the arm64 image passed the full
  collaboration + restart-persistence smoke natively on an Apple Silicon Mac.
- **app_proxy WebSocket path**: separately verified against the real
  `getumbrel/app-proxy` image (see PROXY-VERIFICATION.md).

The only real-world caveat is bun's amd64 build wanting AVX2 (~2013+ CPUs);
Umbrel's supported x86 hardware qualifies, and bun ships a baseline build as a
fallback. (Inside the running container bun even self-selected its
`Linux x64 baseline` build.)

## For the PR "tested on" section

> Tested on umbrelOS 1.7.3 (amd64) in a QEMU VM: fresh install from a local app
> store, app opens through app_proxy behind Umbrel auth, all four apps load,
> real-time WebSocket collaboration works, data persists to the `/data` volume
> and **survives a reboot** (verified byte-identical), and **uninstall is clean**
> (no orphaned containers/data). The bundled `bun` server needs AVX2, so under
> pure CPU emulation the VM must expose it (`-cpu max`); on native amd64/arm64
> hardware it runs directly — verified via CI boot-smoke (amd64) and native
> collaboration smoke (arm64).
