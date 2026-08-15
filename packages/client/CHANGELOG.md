# @waits/lively-client

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
