// React Native fiber traversal
// Walks the fiber tree to discover all user components with native views.
//
// This file is dev/QA-only tooling (Designer Mode) and is excluded from normal
// builds. React's internal fiber tree and the DevTools global hook are untyped,
// so we model the minimal shapes we actually touch with local interfaces.

import { findNodeHandle, StyleSheet, UIManager } from 'react-native';
import type { RNComponentInfo } from './types';

/* ── Style Name Registry ──
 * Patches StyleSheet.create to build a reverse map from style ref → name.
 * Must be imported before app styles are created for full coverage.
 */
const styleIdToName = new Map<number, string>();
const styleObjToName = new WeakMap<object, string>();

const _originalCreate = StyleSheet.create;
const patchedCreate: typeof StyleSheet.create = (styles) => {
  const result = _originalCreate(styles);
  for (const [name, value] of Object.entries(result)) {
    if (typeof value === 'number') {
      // Production: StyleSheet.create returns numeric IDs
      styleIdToName.set(value, name);
    } else if (typeof value === 'object' && value !== null) {
      // Dev mode: StyleSheet.create returns the objects as-is
      styleObjToName.set(value as object, name);
    }
  }
  return result;
};
(StyleSheet as { create: typeof StyleSheet.create }).create = patchedCreate;

/** Resolve a single style entry (from the raw style prop) to its name. */
export function resolveStyleName(entry: unknown): string | null {
  if (typeof entry === 'number') {
    return styleIdToName.get(entry) ?? null;
  }
  if (typeof entry === 'object' && entry !== null) {
    return styleObjToName.get(entry) ?? null;
  }
  return null;
}

/** Extract all style names from a raw style prop (single or array). */
function extractStyleNames(rawStyle: unknown): string[] {
  const names: string[] = [];
  if (rawStyle == null) return names;

  const entries = Array.isArray(rawStyle) ? rawStyle : [rawStyle];
  for (const entry of entries) {
    if (entry == null || typeof entry === 'boolean') continue;
    // Recurse for nested arrays like style={[styles.a, [styles.b, styles.c]]}
    if (Array.isArray(entry)) {
      names.push(...extractStyleNames(entry));
      continue;
    }
    const name = resolveStyleName(entry);
    if (name) names.push(name);
  }
  return names;
}

interface Fiber {
  // `type` is a string (host), a component function, or a forwardRef object.
  type: unknown;
  memoizedProps: Record<string, unknown> | null;
  memoizedState: unknown;
  return: Fiber | null;
  child: Fiber | null;
  sibling: Fiber | null;
  // Native host instance (or tag); shape varies by RN architecture.
  stateNode: unknown;
  _debugSource?: { fileName: string; lineNumber: number } | null;
  tag: number;
}

interface FiberRoot {
  current: Fiber;
}

interface ReactRenderer {
  getFiberRoots?: (id: unknown) => Iterable<FiberRoot> | undefined;
}

interface DevToolsHook {
  renderers?: Map<unknown, ReactRenderer>;
  getFiberRoots?: (id: unknown) => Iterable<FiberRoot> | undefined;
}

// Fiber tags for host (native) components
const HOST_COMPONENT = 5;
const HOST_TEXT = 6;

// RN built-in names to skip when looking for user component names
const BUILTIN_NAMES = new Set([
  // React Native primitives
  'View',
  'RCTView',
  'Text',
  'RCTText',
  'Image',
  'RCTImage',
  'ScrollView',
  'RCTScrollView',
  'TextInput',
  'RCTTextInput',
  'SafeAreaView',
  'RCTSafeAreaView',
  'Pressable',
  'TouchableOpacity',
  'TouchableWithoutFeedback',
  'TouchableHighlight',
  'FlatList',
  'SectionList',
  'Modal',
  'ActivityIndicator',
  'StatusBar',
  'KeyboardAvoidingView',
  'VirtualizedList',
  // Designer Mode internals
  'DesignerModeRN',
  'PulseOrb',
  // React/RN internals
  'DebuggingOverlay',
  'AppContainer',
  'RootComponent',
]);

/** Names that indicate framework internals, not user components */
function isInternalName(name: string): boolean {
  if (BUILTIN_NAMES.has(name)) return true;
  // Filter out Context providers/consumers, HOC wrappers
  if (
    name.endsWith('Context') ||
    name.endsWith('Provider') ||
    name.endsWith('Consumer')
  )
    return true;
  if (name.startsWith('RCT') || name.startsWith('RNS')) return true;
  // Names with parentheses like "main(RootComponent)"
  if (name.includes('(') || name.includes(')')) return true;
  // Expo/React internals
  if (name === 'ErrorBoundary' || name === 'Suspense' || name === 'Fragment')
    return true;
  if (name === 'main' || name === 'PerformanceLogger') return true;
  return false;
}

/**
 * Get all fiber roots from the React DevTools hook.
 */
function getFiberRoots(): Fiber[] {
  const roots: Fiber[] = [];
  try {
    const hook = (global as { __REACT_DEVTOOLS_GLOBAL_HOOK__?: DevToolsHook })
      .__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!hook) return roots;

    // Method 1: getFiberRoots on renderers
    if (hook.renderers) {
      for (const [id, renderer] of hook.renderers) {
        if (renderer.getFiberRoots) {
          const fiberRoots = renderer.getFiberRoots(id);
          if (fiberRoots) {
            for (const root of fiberRoots) {
              if (root.current) roots.push(root.current);
            }
          }
        }
      }
    }

    // Method 2: getFiberRoots on hook itself
    if (roots.length === 0 && hook.getFiberRoots) {
      for (const [id] of hook.renderers ?? []) {
        const fiberRoots = hook.getFiberRoots(id);
        if (fiberRoots) {
          for (const root of fiberRoots) {
            if (root.current) roots.push(root.current);
          }
        }
      }
    }
  } catch {
    // Expected in production
  }
  return roots;
}

/**
 * Walk up from a host fiber to find the nearest user component.
 */
function getComponentName(type: unknown): string | null {
  if (!type) return null;
  if (typeof type === 'string') return null;
  if (typeof type !== 'function' && typeof type !== 'object') return null;
  const t = type as {
    displayName?: string;
    name?: string;
    render?: { displayName?: string; name?: string };
  };
  if (t.displayName) return t.displayName;
  if (t.name) return t.name;
  // ForwardRef
  if (t.render) {
    return t.render.displayName || t.render.name || null;
  }
  return null;
}

function findUserComponent(hostFiber: Fiber): {
  name: string;
  fiber: Fiber;
  source: { fileName: string; lineNumber: number } | null;
} | null {
  let current: Fiber | null = hostFiber;
  while (current) {
    try {
      const name = getComponentName(current.type);
      if (name && !isInternalName(name)) {
        return {
          name,
          fiber: current,
          source: current._debugSource ?? null,
        };
      }
    } catch {
      // Skip fibers with problematic types
    }
    current = current.return;
  }
  return null;
}

/**
 * Find the nearest named component (including builtins like Text, View).
 */
function findDirectComponent(hostFiber: Fiber): {
  name: string;
  source: { fileName: string; lineNumber: number } | null;
} | null {
  let current: Fiber | null = hostFiber;
  while (current) {
    try {
      // Check for string type (host components like "RCTText" → "Text")
      if (typeof current.type === 'string') {
        const name = current.type.replace(/^RCT/, '');
        if (name) return { name, source: current._debugSource ?? null };
      }
      const name = getComponentName(current.type);
      if (name) return { name, source: current._debugSource ?? null };
    } catch {
      /* skip */
    }
    current = current.return;
  }
  return null;
}

/**
 * Source locations inside these directories belong to shared primitives, not to
 * the application call site we want to point the designer/agent at.
 */
function isSharedPrimitivePath(fileName: string): boolean {
  return (
    fileName.includes('/component-library/') ||
    fileName.includes('/node_modules/') ||
    fileName.includes('/design-system')
  );
}

/** True when a source location is app code (a usable call site). */
function isAppCallSite(fileName: string | null | undefined): boolean {
  return !!fileName && !isSharedPrimitivePath(fileName);
}

/**
 * Walk up from the hit fiber to the nearest component whose element was authored
 * in application code (e.g. the screen that rendered `<ButtonTertiary>`), rather
 * than inside a shared design-system primitive. This is what lets the agent edit
 * the specific instance instead of the global primitive.
 */
function findCallSite(hostFiber: Fiber): {
  name: string;
  source: { fileName: string; lineNumber: number };
} | null {
  let current: Fiber | null = hostFiber;
  while (current) {
    try {
      const name = getComponentName(current.type);
      const src = current._debugSource;
      if (name && !isInternalName(name) && src && isAppCallSite(src.fileName)) {
        return { name, source: src };
      }
    } catch {
      /* skip fibers with problematic types */
    }
    current = current.return;
  }
  return null;
}

/**
 * Build the component composition chain from the tapped element up, each entry
 * annotated with its source location. Gives the agent the full path
 * (e.g. View → ButtonBase → ButtonTertiary → SomeScreen) to disambiguate.
 */
function buildComponentChain(
  hostFiber: Fiber,
): RNComponentInfo['componentChain'] {
  const chain: RNComponentInfo['componentChain'] = [];
  const seen = new Set<string>();
  let current: Fiber | null = hostFiber;
  while (current && chain.length < 12) {
    try {
      const name = getComponentName(current.type);
      if (name && !isInternalName(name)) {
        const src = current._debugSource ?? null;
        const key = `${name}@${src?.fileName ?? ''}:${src?.lineNumber ?? ''}`;
        if (!seen.has(key)) {
          seen.add(key);
          chain.push({
            name,
            fileName: src?.fileName ?? null,
            lineNumber: src?.lineNumber ?? null,
          });
        }
      }
    } catch {
      /* skip fibers with problematic types */
    }
    current = current.return;
  }
  return chain;
}

/**
 * Collect ALL leaf host (native) fibers from the tree.
 */
function collectAllHostFibers(root: Fiber | null, results: Fiber[]) {
  // Iterative DFS with an explicit stack — a MetaMask screen can have thousands
  // of fibers, which would overflow a recursive child+sibling walk on the
  // (bounded) JS call stack.
  const stack: (Fiber | null)[] = [root];
  while (stack.length > 0) {
    const fiber = stack.pop();
    if (!fiber) continue;
    if (fiber.tag === HOST_COMPONENT && fiber.stateNode) {
      results.push(fiber);
    }
    // Push sibling before child so child is processed first (DFS order preserved)
    if (fiber.sibling) stack.push(fiber.sibling);
    if (fiber.child) stack.push(fiber.child);
  }
}

/**
 * Measure a native view's layout on screen.
 *
 * `findNodeHandle` + `UIManager.measure` are deprecated, but remain the reliable
 * way to measure an arbitrary fiber's native view for hit-testing. The host
 * instance's own `measure()` is not consistently available across RN
 * architectures, so we keep this path. Dev-only tooling.
 */
function measureNativeView(
  hostFiber: Fiber,
): Promise<RNComponentInfo['layout']> {
  return new Promise((resolve) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- node-handle hit-testing for dev-only tooling
      const handle = findNodeHandle(
        hostFiber.stateNode as Parameters<typeof findNodeHandle>[0],
      );
      if (handle == null) {
        resolve(null);
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- node-handle hit-testing for dev-only tooling
      UIManager.measure(
        handle,
        (
          x: number,
          y: number,
          width: number,
          height: number,
          pageX: number,
          pageY: number,
        ) => {
          if (width === 0 && height === 0) {
            resolve(null);
            return;
          }
          resolve({ x, y, width, height, pageX, pageY });
        },
      );
    } catch {
      resolve(null);
    }
  });
}

/**
 * Discover the component at a touch point by:
 * 1. Collecting all native host fibers
 * 2. Measuring them all
 * 3. Hit-testing against the touch point
 * 4. Walking up from the best hit to find the owning user component
 */
export async function hitTestFromFiberTree(
  touchX: number,
  touchY: number,
): Promise<RNComponentInfo | null> {
  const roots = getFiberRoots();
  if (roots.length === 0) return null;

  // Collect all host fibers
  const hostFibers: Fiber[] = [];
  for (const root of roots) {
    collectAllHostFibers(root, hostFibers);
  }

  if (hostFibers.length === 0) return null;

  // Measure all in parallel
  const measured: {
    fiber: Fiber;
    layout: NonNullable<RNComponentInfo['layout']>;
  }[] = [];
  await Promise.all(
    hostFibers.map(async (fiber) => {
      const layout = await measureNativeView(fiber);
      if (layout) measured.push({ fiber, layout });
    }),
  );

  // Hit test — find host fibers containing the touch point
  const hits = measured.filter(({ layout }) => {
    const { pageX, pageY, width, height } = layout;
    return (
      touchX >= pageX &&
      touchX <= pageX + width &&
      touchY >= pageY &&
      touchY <= pageY + height
    );
  });

  if (hits.length === 0) return null;

  // Pick the smallest bounding box (most specific native view)
  const best = hits.reduce((prev, curr) => {
    const prevArea = prev.layout.width * prev.layout.height;
    const currArea = curr.layout.width * curr.layout.height;
    return currArea < prevArea ? curr : prev;
  });

  // Extract text content from the tapped element
  let textContent: string | null = null;
  const hitProps = best.fiber.memoizedProps;
  if (hitProps?.children) {
    if (typeof hitProps.children === 'string') {
      textContent = hitProps.children;
    } else if (typeof hitProps.children === 'number') {
      textContent = String(hitProps.children);
    } else if (Array.isArray(hitProps.children)) {
      // Mixed children (e.g. "text with " + <Text>bold</Text> + " more")
      const parts = hitProps.children
        .filter((c: unknown) => typeof c === 'string' || typeof c === 'number')
        .map(String);
      if (parts.length > 0) textContent = parts.join('');
    }
  }

  // Find direct component (e.g. Text, View) and user component (e.g. Card)
  const directComp = findDirectComponent(best.fiber);
  const userComp = findUserComponent(best.fiber);
  if (!userComp && !directComp) return null;

  // Use the direct component name as primary, user component as parent context
  const componentName = directComp?.name ?? userComp?.name ?? 'Unknown';
  const parentComponent =
    userComp && userComp.name !== directComp?.name ? userComp.name : null;

  // Resolve styles — always from the direct (hit) fiber
  let resolvedStyle: Record<string, unknown> | null = null;
  const styleProp =
    best.fiber.memoizedProps?.style ?? userComp?.fiber.memoizedProps?.style;
  if (styleProp) {
    try {
      resolvedStyle = StyleSheet.flatten(
        styleProp as Parameters<typeof StyleSheet.flatten>[0],
      ) as Record<string, unknown>;
    } catch {
      /* ignore */
    }
  }

  // Extract style names from raw style prop
  const styleNames = extractStyleNames(styleProp);

  // Measure layout
  let compLayout = best.layout;
  if (userComp) {
    let hostChild: Fiber | null = userComp.fiber;
    while (hostChild && hostChild.tag !== HOST_COMPONENT) {
      hostChild = hostChild.child;
    }
    if (hostChild && hostChild !== best.fiber) {
      const layout = await measureNativeView(hostChild);
      if (layout) compLayout = layout;
    }
  }

  // File path: prefer the app-code call site (the screen that used the
  // component) over a shared primitive's internal source.
  const callSite = findCallSite(best.fiber);
  const componentChain = buildComponentChain(best.fiber);
  const source =
    callSite?.source ?? directComp?.source ?? userComp?.source ?? null;

  // accessibilityLabel helps the agent grep for the specific instance.
  const accessibilityLabel =
    (best.fiber.memoizedProps?.accessibilityLabel as string) ??
    (userComp?.fiber.memoizedProps?.accessibilityLabel as string) ??
    null;

  // Parent component props (user-level props like color, label, onPress)
  const parentProps =
    userComp && userComp.name !== directComp?.name
      ? userComp.fiber.memoizedProps
      : null;

  // Build ancestor chain walking up from the hit fiber
  const ancestorChain: string[] = [];
  {
    let cur: Fiber | null = best.fiber;
    while (cur && ancestorChain.length < 10) {
      try {
        if (typeof cur.type === 'string') {
          const name = cur.type.replace(/^RCT/, '');
          if (name && !ancestorChain.includes(name)) ancestorChain.push(name);
        } else {
          const name = getComponentName(cur.type);
          if (name && !isInternalName(name) && !ancestorChain.includes(name)) {
            ancestorChain.push(name);
          }
        }
      } catch {
        /* skip */
      }
      cur = cur.return;
    }
  }

  return {
    componentName,
    parentComponent,
    textContent,
    filePath: source?.fileName ?? null,
    lineNumber: source?.lineNumber ?? null,
    callSiteComponent: callSite?.name ?? null,
    componentChain,
    accessibilityLabel,
    props: best.fiber.memoizedProps,
    parentProps,
    testID: (userComp?.fiber.memoizedProps?.testID as string) ?? null,
    ancestorChain,
    layout: compLayout,
    style: resolvedStyle,
    styleNames,
  };
}
