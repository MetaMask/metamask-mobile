/**
 * AgenticService — __DEV__-only bridge for AI coding agents.
 *
 * This file is NEVER bundled in production builds (guarded by __DEV__).
 * It intentionally uses loose types, inline casts, and minimal abstractions
 * because it is throwaway dev tooling — not shared library code. Do not
 * apply production code standards (strict types, full error handling,
 * abstraction layers) here; keep it pragmatic and easy to change.
 */
import { NavigationContainerRef } from '@react-navigation/native';
import { Platform } from 'react-native';
import Logger from '../../util/Logger';
import ReduxService from '../redux';
import { persistor } from '../../store';
import Engine from '../Engine';
import {
  passwordSet,
  setExistingUser,
  logIn,
  seedphraseBackedUp,
} from '../../actions/user';
import { setCompletedOnboarding } from '../../actions/onboarding';
import { mnemonicPhraseToBytes } from '@metamask/key-tree';
import { AccountImportStrategy } from '@metamask/keyring-controller';
import StorageWrapper from '../../store/storage-wrapper';
import {
  PERPS_GTM_MODAL_SHOWN,
  PREDICT_GTM_MODAL_SHOWN,
  REWARDS_GTM_MODAL_SHOWN,
} from '../../constants/storage';
import { analytics } from '../../util/analytics/analytics';
import { setDataCollectionForMarketing } from '../../actions/security';
import AccountTreeInitService from '../../multichain-accounts/AccountTreeInitService';
import NavigationService from '../NavigationService';
import Routes from '../../constants/navigation/Routes';

// ─── Fiber tree types ──────────────────────────────────────────────────────

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
  setupWallet: (fixture: {
    password: string;
    accounts: {
      type: 'mnemonic' | 'privateKey';
      value: string;
      name?: string;
    }[];
    settings?: {
      metametrics?: boolean;
      skipGtmModals?: boolean;
      skipPerpsTutorial?: boolean;
    };
  }) => Promise<{
    ok: boolean;
    error?: string;
    accounts?: { address: string; name: string }[];
  }>;
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
 * Sibling traversal is iterative to avoid stack overflow on wide trees.
 */
function walkFiber(
  fiber: FiberNode | null,
  visitor: (f: FiberNode) => boolean,
): boolean {
  let current: FiberNode | null = fiber;
  while (current) {
    if (visitor(current)) return true;
    if (walkFiber(current.child, visitor)) return true;
    current = current.sibling;
  }
  return false;
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
    const fiberRoots = hook.getFiberRoots?.(id);
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

// ─── Shared helpers ─────────────────────────────────────────────────────────

/** Map an internal account to the slim shape exposed by the bridge. */
function toAccountSummary(a: {
  id: string;
  address: string;
  metadata: { name: string };
}): { id: string; address: string; name: string } {
  return { id: a.id, address: a.address, name: a.metadata.name };
}

/**
 * Walk a fiber sub-tree looking for a scrollable stateNode (scrollTo or
 * scrollToOffset). When `walkSiblings` is false only the child axis is
 * traversed — useful when starting from a testId anchor whose siblings
 * are unrelated components.
 */
function tryScroll(
  start: FiberNode | null,
  offset: number,
  animated: boolean,
  walkSiblings = true,
): boolean {
  let current: FiberNode | null = start;
  while (current) {
    const sn = current.stateNode;
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
    if (tryScroll(current.child, offset, animated)) return true;
    current = walkSiblings ? current.sibling : null;
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
      listAccounts: () =>
        Engine.context.AccountsController.listAccounts().map(toAccountSummary),
      getSelectedAccount: () =>
        toAccountSummary(
          Engine.context.AccountsController.getSelectedAccount(),
        ),
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
          const found = walkFiberRoots((rootFiber) => {
            if (scrollTestId) {
              const anchor = findFiberByTestId(rootFiber, scrollTestId);
              if (!anchor) return false;
              return tryScroll(anchor, offset, animated, false);
            }
            return tryScroll(rootFiber, offset, animated);
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
        const accounts = Engine.context.AccountsController.listAccounts();
        const target = accounts.find(
          (a: { address: string }) =>
            a.address.toLowerCase() === address.toLowerCase(),
        );
        if (!target) {
          throw new Error(`No account found for address ${address}`);
        }
        Engine.setSelectedAddress(target.address);
        return { switched: true, ...toAccountSummary(target) };
      },
      setupWallet: async (fixture) => {
        try {
          const {
            MultichainAccountService,
            KeyringController,
            AccountsController,
          } = Engine.context;
          const store = ReduxService.store;
          const settings = fixture.settings ?? {};

          // 1. Create wallet from the first mnemonic (same path as onboarding UI)
          const mnemonicAccount = fixture.accounts.find(
            (a) => a.type === 'mnemonic',
          );
          if (mnemonicAccount) {
            const mnemonic = mnemonicPhraseToBytes(mnemonicAccount.value);
            await MultichainAccountService.createMultichainAccountWallet({
              type: 'restore',
              password: fixture.password,
              mnemonic,
            });
          } else {
            await MultichainAccountService.createMultichainAccountWallet({
              type: 'create',
              password: fixture.password,
            });
          }

          // 2. Initialize services (same as Authentication.dispatchLogin)
          await AccountTreeInitService.initializeAccountTree();
          await MultichainAccountService.init();

          // 3. Import private key accounts
          for (const account of fixture.accounts) {
            if (account.type !== 'privateKey') continue;
            try {
              await KeyringController.importAccountWithStrategy(
                AccountImportStrategy.privateKey,
                [account.value],
              );
            } catch (e) {
              Logger.log(
                `[AgenticService] Failed to import key: ${(e as Error).message}`,
              );
            }
          }

          // 4. Dispatch all onboarding/auth flags
          store.dispatch(passwordSet());
          store.dispatch(seedphraseBackedUp());
          store.dispatch(setCompletedOnboarding(true));
          store.dispatch(setExistingUser(true));
          store.dispatch(logIn());

          // 5. Suppress post-onboarding modals if explicitly requested
          if (settings.skipGtmModals === true) {
            await Promise.all([
              StorageWrapper.setItem(PERPS_GTM_MODAL_SHOWN, 'true'),
              StorageWrapper.setItem(PREDICT_GTM_MODAL_SHOWN, 'true'),
              StorageWrapper.setItem(REWARDS_GTM_MODAL_SHOWN, 'true'),
            ]);
            // Suppress ExperienceEnhancer (marketing consent) modal
            store.dispatch(setDataCollectionForMarketing(false));
          }

          // 6. Skip perps tutorial onboarding if requested
          if (settings.skipPerpsTutorial === true) {
            Engine.context.PerpsController?.markTutorialCompleted();
          }

          // 7. Configure MetaMetrics if specified
          if (settings.metametrics === false) {
            await analytics.optOut();
          } else if (settings.metametrics === true) {
            await analytics.optIn();
          }

          // 8. Navigate to wallet (same as Authentication.unlockWallet)
          NavigationService.navigation?.reset({
            routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
          });

          // 9. Collect all ETH accounts for the summary
          const ethAccs = (
            Object.values(
              AccountsController.state.internalAccounts.accounts,
            ) as { id: string; address: string; metadata: { name: string } }[]
          )
            .filter((a) => a.address?.startsWith('0x'))
            .map(toAccountSummary);

          return { ok: true, accounts: ethAccs };
        } catch (e) {
          return { ok: false, error: String((e as Error).message || e) };
        }
      },
    };

    try {
      (globalThis as { store?: unknown }).store = ReduxService.store;
      (globalThis as { persistor?: unknown }).persistor = persistor;
    } catch {
      // ReduxService.store may not be initialized yet; skip.
    }
    (globalThis as { Engine?: unknown }).Engine = Engine;
  },
};

export default AgenticService;
export {
  walkFiber,
  findFiberByTestId,
  walkFiberRoots,
  tryScroll,
  toAccountSummary,
};
export type { FiberNode, FiberRoot, ReactDevToolsHook, AgenticBridge };
