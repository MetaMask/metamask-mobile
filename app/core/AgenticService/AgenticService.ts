import { NavigationContainerRef } from '@react-navigation/native';
import { Platform } from 'react-native';
import Logger from '../../util/Logger';
import ReduxService from '../redux';
import Engine from '../Engine';

// ─── Fiber tree types ───────────────────────────────────────────────────────

/**
 * Minimal React fiber node shape used to walk the component tree
 * via __REACT_DEVTOOLS_GLOBAL_HOOK__.
 */
interface FiberNode {
  child: FiberNode | null;
  sibling: FiberNode | null;
  memoizedProps: {
    testID?: string;
    onPress?: (...args: unknown[]) => unknown;
    onChangeText?: (text: string) => void;
    [key: string]: unknown;
  } | null;
  stateNode: {
    scrollTo?: (opts: { y: number; animated: boolean }) => void;
    scrollToOffset?: (opts: { offset: number; animated: boolean }) => void;
    [key: string]: unknown;
  } | null;
}

interface FiberRoot {
  current: FiberNode | null;
}

interface ReactDevToolsHook {
  renderers: Map<number, unknown>;
  getFiberRoots?: (id: number) => Set<FiberRoot>;
}

/** Shape of the __DEV__-only agentic bridge on globalThis. */
interface AgenticBridge {
  platform: string;
  navigate: (name: string, params?: object) => void;
  getRoute: () => unknown;
  getState: () => unknown;
  canGoBack: () => boolean;
  goBack: () => void;
  listAccounts: () => { id: string; address: string; name: string }[];
  getSelectedAccount: () => { id: string; address: string; name: string };
  pressTestId: (testId: string) => {
    ok: boolean;
    testId?: string;
    error?: string;
  };
  scrollView: (options?: {
    testId?: string;
    offset?: number;
    animated?: boolean;
  }) => {
    ok: boolean;
    error?: string;
    testId?: string;
    offset?: number;
    animated?: boolean;
  };
  switchAccount: (address: string) => {
    switched: boolean;
    id: string;
    address: string;
    name: string;
  };
}

declare global {
  // eslint-disable-next-line no-var
  var __AGENTIC__: AgenticBridge | undefined;
  // eslint-disable-next-line no-var
  var __REACT_DEVTOOLS_GLOBAL_HOOK__: ReactDevToolsHook | undefined;
}

// ─── Fiber tree helpers ─────────────────────────────────────────────────────

/**
 * Walk a fiber sub-tree depth-first, calling `visitor` on each node.
 * Returns true as soon as visitor returns true (short-circuit).
 */
function walkFiber(
  fiber: FiberNode | null,
  visitor: (f: FiberNode) => boolean,
): boolean {
  if (!fiber) return false;
  if (visitor(fiber)) return true;
  return walkFiber(fiber.child, visitor) || walkFiber(fiber.sibling, visitor);
}

/**
 * Find the first fiber node whose `testID` prop matches.
 */
function findFiberByTestId(
  fiber: FiberNode | null,
  testId: string,
): FiberNode | null {
  let result: FiberNode | null = null;
  walkFiber(fiber, (f) => {
    if (f.memoizedProps?.testID === testId) {
      result = f;
      return true;
    }
    return false;
  });
  return result;
}

/**
 * Iterate all React renderer roots and call `visitor` on each root fiber.
 * Returns true if any visitor call returns true.
 */
function walkFiberRoots(visitor: (rootFiber: FiberNode) => boolean): boolean {
  const hook = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!hook?.renderers) return false;

  for (const [id] of hook.renderers) {
    const fiberRoots = hook.getFiberRoots?.(id as number);
    if (!fiberRoots) continue;
    let found = false;
    fiberRoots.forEach((root) => {
      if (!found && root.current) {
        found = visitor(root.current);
      }
    });
    if (found) return true;
  }
  return false;
}

// ─── AgenticService ─────────────────────────────────────────────────────────

/**
 * __DEV__-only service that installs the `globalThis.__AGENTIC__` bridge.
 *
 * The bridge exposes navigation primitives, account helpers, and UI
 * interaction methods (pressTestId, scrollView) so that AI coding agents
 * can inspect and drive the app remotely via Metro's Hermes CDP WebSocket.
 *
 * Consumed by the scripts in `scripts/perps/agentic/`.
 * See docs/perps/perps-agentic-feedback-loop.md for the full workflow.
 */
const AgenticService = {
  /**
   * Install the agentic bridge on globalThis.
   *
   * @param navRef  - Raw (unwrapped) navigation container ref
   * @param deferredNav - The requestAnimationFrame-deferred proxy
   */
  install(navRef: NavigationContainerRef, deferredNav: NavigationContainerRef) {
    Logger.log('[AgenticService] __AGENTIC__ bridge installed');

    globalThis.__AGENTIC__ = {
      platform: Platform.OS,
      navigate: (name: string, params?: object) =>
        deferredNav.navigate(name as never, params as never),
      getRoute: () => navRef.getCurrentRoute(),
      getState: () => navRef.dangerouslyGetState(),
      canGoBack: () => navRef.canGoBack(),
      goBack: () => deferredNav.goBack(),
      listAccounts: () => {
        const ctrl = Engine.context.AccountsController;
        return ctrl
          .listAccounts()
          .map(
            (a: {
              id: string;
              address: string;
              metadata: { name: string };
            }) => ({
              id: a.id,
              address: a.address,
              name: a.metadata.name,
            }),
          );
      },
      getSelectedAccount: () => {
        const ctrl = Engine.context.AccountsController;
        const a = ctrl.getSelectedAccount();
        return { id: a.id, address: a.address, name: a.metadata.name };
      },
      pressTestId: (testId: string) => {
        try {
          const found = walkFiberRoots((rootFiber) =>
            walkFiber(rootFiber, (f) => {
              if (
                f.memoizedProps?.testID === testId &&
                typeof f.memoizedProps?.onPress === 'function'
              ) {
                f.memoizedProps.onPress();
                return true;
              }
              return false;
            }),
          );
          if (found) return { ok: true, testId };
          return {
            ok: false,
            error: `No component with testID="${testId}" found or no onPress prop`,
          };
        } catch (e) {
          return { ok: false, error: String(e) };
        }
      },
      scrollView: (
        options: {
          testId?: string;
          offset?: number;
          animated?: boolean;
        } = {},
      ) => {
        const {
          testId: scrollTestId,
          offset = 300,
          animated = false,
        } = options;
        try {
          const tryScroll = (fiber: FiberNode | null): boolean => {
            if (!fiber) return false;
            const sn = fiber.stateNode;
            if (sn) {
              if (typeof sn.scrollTo === 'function') {
                sn.scrollTo({ y: offset, animated });
                return true;
              }
              if (typeof sn.scrollToOffset === 'function') {
                sn.scrollToOffset({ offset, animated });
                return true;
              }
            }
            return tryScroll(fiber.child) || tryScroll(fiber.sibling);
          };

          const found = walkFiberRoots((rootFiber) => {
            if (scrollTestId) {
              const anchor = findFiberByTestId(rootFiber, scrollTestId);
              if (!anchor) return false;
              return tryScroll(anchor);
            }
            return tryScroll(rootFiber);
          });
          if (found)
            return { ok: true, testId: scrollTestId, offset, animated };
          return {
            ok: false,
            error: scrollTestId
              ? `No scrollable found near testID="${scrollTestId}"`
              : 'No scrollable found in fiber tree',
          };
        } catch (e) {
          return { ok: false, error: String(e) };
        }
      },
      switchAccount: (address: string) => {
        const ctrl = Engine.context.AccountsController;
        const accounts = ctrl.listAccounts();
        const target = accounts.find(
          (a: { address: string }) =>
            a.address.toLowerCase() === address.toLowerCase(),
        );
        if (!target) {
          throw new Error(`No account found for address ${address}`);
        }
        Engine.setSelectedAddress(target.address);
        return {
          switched: true,
          id: target.id,
          address: target.address,
          name: target.metadata.name,
        };
      },
    };

    try {
      (globalThis as { store?: unknown }).store = ReduxService.store;
    } catch {
      // ReduxService.store may not be initialized yet; skip.
    }
    (globalThis as { Engine?: unknown }).Engine = Engine;
  },
};

export default AgenticService;
export { walkFiber, findFiberByTestId, walkFiberRoots };
export type { FiberNode, FiberRoot, ReactDevToolsHook, AgenticBridge };
