# @waits/openblocks-ui

Pre-built React components and hooks for multiplayer UI: cursors, avatars, and connection status.

## Install

```sh
bun add @waits/openblocks-ui
```

Peer deps:

```sh
bun add react react-dom @waits/openblocks-react
```

## Tailwind

Components use Tailwind classes. You must tell Tailwind to scan the package source.

**Tailwind v4** — add a `@source` directive to your CSS:

```css
/* globals.css */
@import "tailwindcss";
@source "../node_modules/@waits/openblocks-ui/dist";
```

In a Bun monorepo, point directly at the package source instead:

```css
@source "../../../packages/ui/src";
```

**Tailwind v3** — add to `content` in `tailwind.config.js`:

```js
export default {
  content: [
    // ...your app paths
    "./node_modules/@waits/openblocks-ui/dist/**/*.js",
  ],
};
```

---

## API

### `useCursorTracking<T extends HTMLElement>()`

Returns a `ref` and `onMouseMove` handler. Attach both to the container that wraps `<CursorOverlay>`. Cursor coordinates are computed relative to the container's bounding box and broadcast to the room automatically.

```tsx
const { ref, onMouseMove } = useCursorTracking<HTMLDivElement>();

// ref, onMouseMove, position:relative, and <CursorOverlay> must all be
// on the same element — this is the shared coordinate space.
return (
  <div ref={ref} onMouseMove={onMouseMove} className="relative">
    <CursorOverlay />
    {children}
  </div>
);
```

---

### `<CursorOverlay>`

Renders a `<Cursor>` for every other user in the room. Excludes the current user's own cursor. Must be inside a `position: relative` container that has the `useCursorTracking` ref attached.

```ts
interface CursorOverlayProps {
  className?: string; // extra class names applied to each <Cursor>
}
```

```tsx
<div ref={ref} onMouseMove={onMouseMove} className="relative">
  <CursorOverlay />
</div>
```

---

### `<Cursor>`

A single cursor indicator positioned absolutely within a `position: relative` container. Used internally by `<CursorOverlay>` but available for custom rendering.

```ts
interface CursorProps {
  x: number;
  y: number;
  color: string;
  displayName: string;
  className?: string;
}
```

```tsx
<Cursor x={120} y={80} color="#e11d48" displayName="Alice" />
```

---

### `<Avatar>`

A colored circle with the user's initials and a tooltip. Accepts a `PresenceUser` object from `@waits/openblocks-react`.

```ts
interface AvatarProps {
  user: PresenceUser;
  size?: "sm" | "md"; // default: "md"
  className?: string;
}
```

```tsx
const self = useSelf();
{self && <Avatar user={self} size="sm" />}
```

---

### `<AvatarStack>`

Stacked row of avatars for all users in the room. Shows a `+N` overflow badge when users exceed `max`.

```ts
interface AvatarStackProps {
  max?: number;     // max avatars before overflow badge, default: 4
  showSelf?: boolean; // include current user's avatar, default: true
  className?: string;
}
```

```tsx
<AvatarStack max={5} />
```

---

### `<ConnectionBadge>`

Shows a status pill when the connection is not `"connected"`. Returns `null` in the happy path — no badge when connected.

- Yellow: `"connecting"` / `"reconnecting"`
- Red: `"disconnected"`

```ts
interface ConnectionBadgeProps {
  className?: string;
}
```

```tsx
<div className="flex items-center gap-2">
  <ConnectionBadge />
  <AvatarStack />
</div>
```

---

## Full cursor tracking example

```tsx
import {
  useCursorTracking,
  CursorOverlay,
  AvatarStack,
  ConnectionBadge,
} from "@waits/openblocks-ui";

function Canvas() {
  const { ref, onMouseMove } = useCursorTracking<HTMLDivElement>();

  return (
    <div className="relative flex-1" ref={ref} onMouseMove={onMouseMove}>
      <CursorOverlay />
      {/* your canvas content */}
    </div>
  );
}

function Toolbar() {
  return (
    <div className="flex items-center gap-2">
      <ConnectionBadge />
      <AvatarStack max={5} />
    </div>
  );
}
```
