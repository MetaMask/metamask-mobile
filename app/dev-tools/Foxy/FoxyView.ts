import { AppState } from 'react-native';

/**
 * Which screen the user was on when a request was made (developer tooling, `__DEV__` + `FOXY=true` only).
 *
 * `NavigationService` registers the navigation container here once it exists. Until then (a fresh launch has no
 * navigator yet) a request is reported as made before navigation was ready. Only route NAMES and the names of
 * their params are reported, never param values.
 */
export interface FoxyView {
  /** The focused (leaf) screen, or null before navigation is ready. */
  route: string | null;
  /** Navigator chain down to the focused screen, outermost first. */
  path: string[];
  /** Names (not values) of the focused screen's params. */
  params?: string[];
  /** How long the focused screen had been showing when the request was made. */
  screenAgeMs?: number;
  /** Navigation container is mounted and has a state. */
  ready: boolean;
  /** `active`, `background` or `inactive`. */
  appState: string;
}

interface RouteLike {
  name: string;
  key?: string;
  params?: Record<string, unknown>;
  state?: StateLike;
}
interface StateLike {
  index?: number;
  routes?: RouteLike[];
}
interface NavLike {
  isReady?: () => boolean;
  getRootState?: () => StateLike | undefined;
  addListener?: (event: 'state', cb: () => void) => unknown;
}

const MAX_PARAMS = 12;
let navigation: NavLike | null = null;
let focusedKey: string | undefined;
let focusedSince = Date.now();

/** Follows `index` through nested navigators to the focused screen. */
export function focusedChain(state: StateLike | undefined): {
  path: string[];
  leaf?: RouteLike;
} {
  const path: string[] = [];
  let leaf: RouteLike | undefined;
  let current = state;
  let guard = 0;
  while (current?.routes?.length && guard++ < 20) {
    const route = current.routes[current.index ?? current.routes.length - 1];
    if (!route) break;
    path.push(route.name);
    leaf = route;
    current = route.state;
  }
  return { path, leaf };
}

const currentState = (): StateLike | undefined => {
  try {
    return navigation?.isReady?.() === false
      ? undefined
      : navigation?.getRootState?.();
  } catch {
    return undefined;
  }
};

const noteFocus = (): void => {
  const { path, leaf } = focusedChain(currentState());
  const key = leaf?.key ?? path.join('/');
  if (key !== focusedKey) {
    focusedKey = key;
    focusedSince = Date.now();
  }
};

export function registerFoxyNavigation(ref: NavLike): void {
  navigation = ref;
  noteFocus();
  try {
    ref.addListener?.('state', noteFocus);
  } catch {
    // a missing listener only costs the "time on screen" figure
  }
}

export function captureView(): FoxyView {
  const appState = String(AppState.currentState ?? 'unknown');
  const { path, leaf } = focusedChain(currentState());
  if (!leaf) return { route: null, path: [], ready: false, appState };
  const params = Object.keys(leaf.params ?? {})
    .filter((name) => name !== 'screen' && name !== 'params')
    .slice(0, MAX_PARAMS);
  return {
    route: leaf.name,
    path,
    ...(params.length ? { params } : {}),
    screenAgeMs: Math.max(0, Date.now() - focusedSince),
    ready: true,
    appState,
  };
}
