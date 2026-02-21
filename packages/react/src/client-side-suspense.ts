import {
  createElement,
  useState,
  useEffect,
  Suspense,
  type ReactNode,
  type ReactElement,
} from "react";

/**
 * SSR-safe Suspense wrapper. Renders `fallback` during SSR and on the
 * initial client render, then renders `children()` inside `<Suspense>`.
 *
 * `children` is a render function so that hooks inside it are not
 * evaluated during SSR (where they would throw or return stale data).
 *
 * Same API as Liveblocks' `ClientSideSuspense`.
 *
 * @example
 * <ClientSideSuspense fallback={<Spinner />}>
 *   {() => <CollaborativeEditor />}
 * </ClientSideSuspense>
 */
export function ClientSideSuspense({
  children,
  fallback,
}: {
  children: () => ReactNode;
  fallback: ReactNode;
}): ReactElement {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return createElement("span", null, fallback);
  }

  return createElement(Suspense, { fallback }, children());
}
