# umbrelOS app package (staging)

Source of truth for the `lively/` directory submitted to
[getumbrel/umbrel-apps](https://github.com/getumbrel/umbrel-apps).

Submission checklist:

1. Tag a release (`git tag v0.1.0 && git push --tags`) — the release
   workflow publishes `ghcr.io/ryanwaits/lively:<version>` for
   amd64 + arm64. Make the ghcr package public (one-time).
2. Pin the image: `docker buildx imagetools inspect
   ghcr.io/ryanwaits/lively:<version>` → replace `<digest>` in
   `docker-compose.yml`.
3. Copy `umbrel-app.yml` + `docker-compose.yml` into a
   `lively/` dir in an umbrel-apps fork; run their lint:
   `npm run lint:apps -- lively --check-images`.
4. Runtime-test on umbrelOS (VM or device): install from a local
   community store, open the app, two-browser collab, reboot → data
   survives, uninstall cleans up. Verify WebSockets through app_proxy.
5. PR with the template: attach `icon.svg` (256×256) and ~1600×1000
   gallery screenshots (not committed), tested-on checklist, links to
   this repo as upstream + image source.
