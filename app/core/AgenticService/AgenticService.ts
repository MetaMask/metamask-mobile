/**
 * AgenticService — __DEV__-only bridge for AI coding agents.
 *
 * This file is NEVER bundled in production builds (guarded by __DEV__).
 * It intentionally uses loose types, inline casts, and minimal abstractions
 * because it is throwaway dev tooling — not shared library code. Do not
 * apply production code standards (strict types, full error handling,
 * abstraction layers) here; keep it pragmatic and easy to change.
 */
import {
  NavigationContainerRef,
  ParamListBase,
} from '@react-navigation/native';
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
  setMultichainAccountsIntroModalSeen,
} from '../../actions/user';
import { setCompletedOnboarding } from '../../actions/onboarding';
import { mnemonicPhraseToBytes } from '@metamask/key-tree';
import { AccountImportStrategy } from '@metamask/keyring-controller';
import StorageWrapper from '../../store/storage-wrapper';
import {
  OPTIN_META_METRICS_UI_SEEN,
  PERPS_GTM_MODAL_SHOWN,
  PREDICT_GTM_MODAL_SHOWN,
  REWARDS_GTM_MODAL_SHOWN,
} from '../../constants/storage';
import { analytics } from '../../util/analytics/analytics';
import {
  setDataCollectionForMarketing,
  setOsAuthEnabled,
} from '../../actions/security';
import { setLockTime } from '../../actions/settings';
import AccountTreeInitService from '../../multichain-accounts/AccountTreeInitService';
import NavigationService from '../NavigationService';
import Routes from '../../constants/navigation/Routes';
import SecureKeychain from '../SecureKeychain';
import AUTHENTICATION_TYPE from '../../constants/userProperties';
import DevLogger from '../SDKConnect/utils/DevLogger';

// ─── Fiber tree types ──────────────────────────────────────────────────────

/**
 * Minimal React fiber node shape used to walk the component tree
 * via __REACT_DEVTOOLS_GLOBAL_HOOK__.
 */
interface FiberNode {
  child: FiberNode | null;
  sibling: FiberNode | null;
  return: FiberNode | null;
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
  pressText: (
    text: string,
    options?: { requiredTexts?: string[]; maxTexts?: number },
  ) => { ok: boolean; text?: string; error?: string };
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
  setInput: (
    testId: string,
    value: string,
  ) => {
    ok: boolean;
    testId?: string;
    value?: string;
    error?: string;
  };
  getTextByTestId: (
    testId: string,
    options?: { all?: boolean },
  ) => string | string[] | null;
  getAncestorTextsByTestId: (
    testId: string,
    options?: { requiredLabels?: string[]; maxTexts?: number },
  ) => string[] | null;
  getRowValue: (
    label: string,
    pattern: string,
    options?: {
      anchorTestId?: string;
      requiredLabels?: string[];
      maxTexts?: number;
    },
  ) => string | null;
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
      autoLockNever?: boolean;
      deviceAuthEnabled?: boolean;
    };
  }) => Promise<{
    ok: boolean;
    error?: string;
    accounts?: { address: string; name: string }[];
  }>;
  showStep: (step: { id: string; description: string }) => void;
  hideStep: () => void;
  findFiberByTestId: (testId: string) => boolean;
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

function appendTextContent(value: unknown, out: string[]) {
  if (value === null || value === undefined) {
    return;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const text = String(value).trim();
    if (text.length > 0) {
      out.push(text);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => appendTextContent(entry, out));
    return;
  }
  if (typeof value === 'object' && value && 'props' in value) {
    const maybeProps = (value as { props?: { children?: unknown } }).props;
    if (maybeProps?.children !== undefined) {
      appendTextContent(maybeProps.children, out);
    }
  }
}

function dedupeTexts(texts: string[]): string[] {
  return texts.filter((text, index) => texts.indexOf(text) === index);
}

function collectFiberTexts(fiber: FiberNode | null): string[] {
  const texts: string[] = [];
  walkFiber(fiber, (node) => {
    if (node.memoizedProps?.children !== undefined) {
      appendTextContent(node.memoizedProps.children, texts);
    }
    return false;
  });
  return dedupeTexts(texts);
}

function findAncestorTexts(
  fiber: FiberNode | null,
  predicate: (texts: string[]) => boolean,
  maxTexts = 14,
): string[] | null {
  let current = fiber;
  while (current) {
    const texts = collectFiberTexts(current);
    if (texts.length > 0 && texts.length <= maxTexts && predicate(texts)) {
      return texts;
    }
    current = current.return;
  }
  return null;
}

function findRowTexts(
  label: string,
  options: {
    anchorTestId?: string;
    requiredLabels?: string[];
    maxTexts?: number;
  } = {},
): string[] | null {
  const { anchorTestId, requiredLabels = [], maxTexts = 14 } = options;
  const matchesRow = (texts: string[]) =>
    texts.includes(label) &&
    requiredLabels.every((requiredLabel) => texts.includes(requiredLabel));

  if (anchorTestId) {
    let anchoredMatch: string[] | null = null;
    walkFiberRoots((rootFiber) => {
      const anchor = findFiberByTestId(rootFiber, anchorTestId);
      if (!anchor) {
        return false;
      }
      anchoredMatch = findAncestorTexts(anchor, matchesRow, maxTexts);
      return Boolean(anchoredMatch);
    });
    if (anchoredMatch) {
      return anchoredMatch;
    }
  }

  let fallbackMatch: string[] | null = null;
  walkFiberRoots((rootFiber) =>
    walkFiber(rootFiber, (fiber) => {
      const texts = collectFiberTexts(fiber);
      if (texts.length === 0 || texts.length > maxTexts) {
        return false;
      }
      if (!matchesRow(texts)) {
        return false;
      }
      fallbackMatch = texts;
      return true;
    }),
  );

  return fallbackMatch;
}

function getRowValue(
  label: string,
  pattern: string,
  options: {
    anchorTestId?: string;
    requiredLabels?: string[];
    maxTexts?: number;
  } = {},
): string | null {
  try {
    const rowTexts = findRowTexts(label, options);
    if (!rowTexts) {
      return null;
    }
    const matcher = new RegExp(pattern);
    return (
      rowTexts.find((text) => text !== label && matcher.test(text)) ?? null
    );
  } catch {
    return null;
  }
}

// ─── Step HUD callback registry ─────────────────────────────────────────────

type StepHudCallback =
  | ((step: { id: string; description: string } | null) => void)
  | null;
let _stepHudCallback: StepHudCallback = null;

export function registerStepHudCallback(fn: StepHudCallback) {
  _stepHudCallback = fn;
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
  install(
    navRef: NavigationContainerRef<ParamListBase>,
    deferredNav: NavigationContainerRef<ParamListBase>,
  ) {
    Logger.log('[AgenticService] __AGENTIC__ bridge installed');

    globalThis.__AGENTIC__ = {
      platform: Platform.OS,
      navigate: (name: string, params?: object) =>
        (
          deferredNav as unknown as {
            navigate: (name: string, params?: object) => void;
          }
        ).navigate(name, params),
      getRoute: () => navRef.getCurrentRoute(),
      getState: () => navRef.getState(),
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
      pressText: (
        text: string,
        options: { requiredTexts?: string[]; maxTexts?: number } = {},
      ) => {
        const { requiredTexts = [], maxTexts = 14 } = options;
        try {
          let bestMatch: FiberNode | null = null;
          let bestTextCount = Number.POSITIVE_INFINITY;
          walkFiberRoots((rootFiber) =>
            walkFiber(rootFiber, (fiber) => {
              if (typeof fiber.memoizedProps?.onPress !== 'function') {
                return false;
              }
              const texts = collectFiberTexts(fiber);
              if (texts.length === 0 || texts.length > maxTexts) {
                return false;
              }
              if (!texts.includes(text)) {
                return false;
              }
              if (requiredTexts.some((required) => !texts.includes(required))) {
                return false;
              }
              if (texts.length < bestTextCount) {
                bestMatch = fiber;
                bestTextCount = texts.length;
              }
              return false;
            }),
          );
          const matched = bestMatch as FiberNode | null;
          if (matched && typeof matched.memoizedProps?.onPress === 'function') {
            matched.memoizedProps.onPress();
            return { ok: true, text };
          }
          return {
            ok: false,
            error: `No pressable found for text="${text}"`,
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
      setInput: (testId: string, value: string) => {
        try {
          const result: {
            ok: boolean;
            testId?: string;
            value?: string;
            error?: string;
          } = {
            ok: false,
            error: `No component with testID="${testId}" found`,
          };
          walkFiberRoots((rootFiber) => {
            const target = findFiberByTestId(rootFiber, testId);
            if (!target) return false;
            // Walk the found fiber and its parents looking for onChangeText
            let current: FiberNode | null = target;
            while (current) {
              if (typeof current.memoizedProps?.onChangeText === 'function') {
                current.memoizedProps.onChangeText(value);
                result.ok = true;
                result.testId = testId;
                result.value = value;
                result.error = undefined;
                return true;
              }
              current = current.return;
            }
            result.error = `Component with testID="${testId}" has no onChangeText prop`;
            return true;
          });
          return result;
        } catch (e) {
          return { ok: false, error: String(e) };
        }
      },
      getTextByTestId: (testId: string, options: { all?: boolean } = {}) => {
        let texts: string[] | null = null;
        walkFiberRoots((rootFiber) => {
          const target = findFiberByTestId(rootFiber, testId);
          if (!target) {
            return false;
          }
          texts = collectFiberTexts(target);
          return true;
        });
        const collected = texts as string[] | null;
        if (!collected || collected.length === 0) {
          return null;
        }
        return options.all ? collected : collected[0];
      },
      getAncestorTextsByTestId: (
        testId: string,
        options: { requiredLabels?: string[]; maxTexts?: number } = {},
      ) => {
        const { requiredLabels = [], maxTexts = 14 } = options;
        let texts: string[] | null = null;
        walkFiberRoots((rootFiber) => {
          const target = findFiberByTestId(rootFiber, testId);
          if (!target) {
            return false;
          }
          texts = findAncestorTexts(
            target,
            (candidateTexts) =>
              requiredLabels.every((label) => candidateTexts.includes(label)),
            maxTexts,
          );
          return Boolean(texts);
        });
        return texts;
      },
      getRowValue: (
        label: string,
        pattern: string,
        options: {
          anchorTestId?: string;
          requiredLabels?: string[];
          maxTexts?: number;
        } = {},
      ) => getRowValue(label, pattern, options),
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
      showStep: (step: { id: string; description: string }) => {
        _stepHudCallback?.(step);
      },
      hideStep: () => {
        _stepHudCallback?.(null);
      },
      findFiberByTestId: (testId: string): boolean => {
        let found = false;
        walkFiberRoots((rootFiber) => {
          if (findFiberByTestId(rootFiber, testId)) {
            found = true;
            return true;
          }
          return false;
        });
        return found;
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

          // 5b. Set metrics UI as seen (prevents Authentication.unlockWallet
          // from navigating to OptinMetrics after setupWallet resets to Wallet)
          if (settings.metametrics !== undefined) {
            await StorageWrapper.setItem(OPTIN_META_METRICS_UI_SEEN, 'true');
          }

          // 5c. Mark multichain accounts intro modal as seen
          store.dispatch(setMultichainAccountsIntroModalSeen(true));

          // 6. Skip perps tutorial onboarding if requested
          if (settings.skipPerpsTutorial === true) {
            Engine.context.PerpsController?.markTutorialCompleted();
          }

          // 7. Set auto-lock to "Never" (-1) for agentic workflows
          if (settings.autoLockNever === true) {
            ReduxService.store.dispatch(setLockTime(-1));
          }

          // 8. Enable device authentication (biometrics/passcode bypass)
          if (settings.deviceAuthEnabled === true) {
            ReduxService.store.dispatch(setOsAuthEnabled(true));
          }

          // 8b. Store password in SecureKeychain for device-auth auto-unlock on reload (Android only — iOS already handles this)
          if (
            settings.deviceAuthEnabled === true &&
            Platform.OS === 'android'
          ) {
            DevLogger.log('[AUTO-UNLOCK] Storing password in SecureKeychain', {
              authType: AUTHENTICATION_TYPE.DEVICE_AUTHENTICATION,
            });
            await SecureKeychain.setGenericPassword(
              fixture.password,
              AUTHENTICATION_TYPE.DEVICE_AUTHENTICATION,
            );
            DevLogger.log('[AUTO-UNLOCK] SecureKeychain password stored');
          }

          // 9. Configure MetaMetrics if specified
          if (settings.metametrics === false) {
            await analytics.optOut();
          } else if (settings.metametrics === true) {
            await analytics.optIn();
          }

          // 10. Navigate to wallet (same as Authentication.unlockWallet)
          NavigationService.navigation?.reset({
            routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
          });

          // 11. Collect all ETH accounts for the summary
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
