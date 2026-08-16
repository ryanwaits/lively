# @waits/lively-client

## 0.2.0

### Minor Changes

- Add layout-relative cursor coordinates. `useCursorTracking({ coordinates: "fraction" })` broadcasts positions as 0–1 of the container instead of raw pixels, so peers on different viewport widths see a cursor over the same content. Pass the same ref to `<CursorOverlay containerRef={ref} />` to convert back.

  Pixel coordinates remain the default and are still the right choice for a fixed coordinate space such as a canvas. Cursor payloads now describe their own space, so mixed clients stay correct on the wire.

### Patch Changes

- Updated dependencies
  - @waits/lively-types@0.2.0
  - @waits/lively-storage@0.2.0

## 0.1.2

### Patch Changes

- Trim whitespace from `serverUrl` before building the WebSocket URL. Environment variables routinely carry a trailing newline, which previously landed in the middle of the connection URL.
  - @waits/lively-storage@0.1.2
  - @waits/lively-types@0.1.2

## 0.1.1

### Patch Changes

- Updated dependencies [4efa332]
  - @waits/lively-storage@0.1.1
  - @waits/lively-types@0.1.1
