# umbrelOS runtime test — UTM VM (emulated amd64)

The gate before submitting the umbrel-apps PR. Verifies Lively installs, opens,
collaborates over WebSockets **through Umbrel's app_proxy**, and survives a
reboot on a real umbrelOS install. ~45–60 min including the slow emulated boot.

## Why emulated amd64

umbrelOS ships `umbrelos-amd64-usb-installer.iso` (x86) and Raspberry Pi images
(`umbrelos-pi5.img`), but **no generic arm64 VM image** — the Pi images need Pi
firmware and won't boot in UTM. On Apple Silicon UTM must emulate x86 (QEMU TCG,
no Apple hypervisor). Slow to boot/click, but the test is functional not
performance. Our image is multi-arch; this verifies the **amd64** manifest. The
arm64 manifest was built by the same Dockerfile from the same commit and its
boot was smoke-tested locally on this arm64 Mac.

## 0. Prerequisites (your machine)

```bash
brew install --cask utm          # if not installed
```

Download the umbrelOS amd64 USB installer ISO from
<https://umbrel.com/umbrelos#install> (the "Install on any x86 system" / amd64
option → `umbrelos-amd64-usb-installer.iso`, ~1.5GB). Note the path.

## 1. Create the VM in UTM

- New → **Emulate** (not Virtualize — x86 on Apple Silicon) → Other.
- Boot ISO: the umbrelOS installer you downloaded.
- Architecture `x86_64`, System `Standard PC (Q35)`, **≥ 4096 MB RAM**, ≥ 4 CPU.
- Drive: create a new **≥ 32 GB** disk.
- Network: default (Shared/NAT is fine).
- After creating: VM → Edit → QEMU → ensure **UEFI boot** is enabled.

## 2. Install umbrelOS

- Boot the VM off the ISO. The installer writes umbrelOS to the virtual disk,
  then reboots. (Emulated — expect this to be slow; let it run.)
- After install completes, remove/eject the ISO from the drive list so it boots
  off disk, and reboot.
- On the host, open **http://umbrel.local** (or the VM's IP shown in UTM). Create
  the Umbrel account when prompted.

## 3. Point Umbrel at this app

Two ways — the Community App Store is the realistic reviewer path:

**A. Community App Store (recommended).** Settings → App Store → "Add community
store" → paste a git URL of a store repo containing `lively/`. Quickest is to
push the staged files to a throwaway public repo laid out as
`<repo>/lively/{umbrel-app.yml,docker-compose.yml}` (mirror `apps/umbrel/store/`,
minus the gallery/README). Then install "Lively" from that store.

**B. Manual (fast, no repo).** In the umbrelOS VM shell (UTM serial console or
`ssh umbrel@umbrel.local`, default pw `umbrel`):

```bash
sudo mkdir -p /home/umbrel/umbrel/app-stores/getumbrel-umbrel-apps-github-53f74447/lively
# copy umbrel-app.yml + docker-compose.yml into that dir, then:
sudo ~/umbrel/scripts/app install lively
```

## 4. Verify (the actual checklist)

- [ ] **Opens**: Lively tile appears, launches to the landing page through
      Umbrel's auth proxy (you should hit Umbrel's login gate first).
- [ ] **WebSockets through app_proxy** ← the one unproven risk. Open the
      Whiteboard, create a board. In the browser devtools Network tab, confirm
      the `/rooms/<id>` request is `101 Switching Protocols` and stays open.
      Watch it for **> 60s idle** — our heartbeat is 45s; if app_proxy has a
      shorter idle timeout the socket drops and the client shows reconnecting.
      If it drops: note the interval, we add a WS ping/pong keepalive < that.
- [ ] **Two-browser collab**: open the same board in a second browser (or
      incognito), confirm live cursors + shape sync both directions.
- [ ] **Reboot persistence**: create content in all four apps, reboot the VM
      (`sudo reboot`), reopen → boards/docs/todos survive (they live in
      `${APP_DATA_DIR}/data`).
- [ ] **Restart the app** from the Umbrel UI (stop/start) → data survives, the
      30s stop grace lets the persistence flush land.
- [ ] **Uninstall**: removes cleanly, no orphaned containers
      (`docker ps -a | grep lively` empty afterwards).

## 5. Record results

Fill the tested-on checklist in `PR.md` with exactly what passed and on what
(umbrelOS version, emulated amd64 VM). Be explicit that arm64 was CI-boot-tested,
not device-tested, unless you also run it on a Pi.
