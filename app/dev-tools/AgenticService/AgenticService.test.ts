import AgenticService, {
  walkFiber,
  findFiberByTestId,
  walkFiberRoots,
  tryScroll,
  findMeasurableStateNode,
  toAccountSummary,
  getFixtureMnemonicCount,
  getFixtureAccountNames,
  type FiberNode,
  type FiberRoot,
  type ReactDevToolsHook,
} from './AgenticService';
import Engine from '../../core/Engine';
import { emitStepHud } from './AgentStepHud';
import { Platform } from 'react-native';
import type {
  NavigationContainerRef,
  ParamListBase,
} from '@react-navigation/native';
import { AccountGroupType, AccountWalletType } from '@metamask/account-api';

const mockCreateWallet = jest.fn().mockResolvedValue(undefined);
const mockCreateAccountGroups = jest.fn().mockResolvedValue([]);
const mockImportAccount = jest.fn().mockResolvedValue(undefined);
const mockIsUnlocked = jest.fn(() => true);
const mockSubmitPassword = jest.fn().mockResolvedValue(undefined);
const FIXTURE_WALLET_ID = 'entropy:keyring-1' as const;

function mockEvmAccount(id: string, address: string, name: string) {
  return {
    id,
    address,
    type: 'eip155:eoa' as const,
    options: {},
    scopes: ['eip155:1' as const],
    methods: [],
    metadata: {
      name,
      importTime: 0,
      keyring: { type: 'HD Key Tree' },
    },
  };
}

function mockEntropyGroup(
  groupIndex: number,
  accountIds: [string, ...string[]],
  name: string,
): {
  type: AccountGroupType.MultichainAccount;
  id: `${typeof FIXTURE_WALLET_ID}/${number}`;
  accounts: [string, ...string[]];
  metadata: {
    name: string;
    pinned: boolean;
    hidden: boolean;
    lastSelected: number;
    entropy: { groupIndex: number };
  };
} {
  return {
    type: AccountGroupType.MultichainAccount,
    id: `${FIXTURE_WALLET_ID}/${groupIndex}` as const,
    accounts: accountIds,
    metadata: {
      name,
      pinned: false,
      hidden: false,
      lastSelected: 0,
      entropy: { groupIndex },
    },
  };
}

jest.mock('./AgentStepHud', () => ({
  __esModule: true,
  default: () => null,
  emitStepHud: jest.fn(),
}));

jest.mock('../../core/Engine', () => ({
  context: {
    AccountsController: {
      listAccounts: jest.fn(() => []),
      getSelectedAccount: jest.fn(() => ({
        id: 'acc-1',
        address: '0xabc',
        metadata: { name: 'Account 1' },
      })),
      state: {
        internalAccounts: {
          accounts: {
            a1: {
              id: 'a1',
              address: '0xABC',
              metadata: { name: 'Account 1' },
            },
          },
        },
      },
    },
    AccountTreeController: {
      state: { accountTree: { wallets: {} } },
      setAccountGroupName: jest.fn(),
    },
    MultichainAccountService: {
      createMultichainAccountWallet: (...args: unknown[]) =>
        mockCreateWallet(...args),
      createMultichainAccountGroups: (...args: unknown[]) =>
        mockCreateAccountGroups(...args),
      init: jest.fn().mockResolvedValue(undefined),
    },
    KeyringController: {
      isUnlocked: () => mockIsUnlocked(),
      submitPassword: (password: string) => mockSubmitPassword(password),
      importAccountWithStrategy: (...args: unknown[]) =>
        mockImportAccount(...(args as [string, string[]])),
    },
    PerpsController: {
      markTutorialCompleted: jest.fn(),
      getPositions: jest.fn().mockResolvedValue([]),
    },
  },
  setSelectedAddress: jest.fn(),
  setAccountLabel: jest.fn(),
}));

// AgenticService imports the Engine *class* (for the disableAutomaticVaultBackup
// static) separately from the ../Engine facade. Stub it so the test does not
// pull in the full Engine/RewardsController/SecureKeychain stack.
jest.mock('../../core/Engine/Engine', () => ({
  Engine: class {
    static disableAutomaticVaultBackup = false;
  },
}));

const mockEnsureConnected = jest.fn().mockResolvedValue(undefined);
const mockClearAllChannels = jest.fn();

jest.mock('../../components/UI/Perps/services/PerpsConnectionManager', () => ({
  __esModule: true,
  default: {
    ensureConnected: (...args: unknown[]) => mockEnsureConnected(...args),
  },
}));

jest.mock('../../components/UI/Perps/providers/PerpsStreamManager', () => ({
  getStreamManagerInstance: () => ({
    clearAllChannels: (...args: unknown[]) => mockClearAllChannels(...args),
  }),
}));

// Authentication pulls in the full auth/keychain stack; stub the singleton.
jest.mock('../../core/Authentication', () => ({
  __esModule: true,
  default: {
    unlockWallet: jest.fn().mockResolvedValue(undefined),
  },
}));

// addNewHdAccount/importNewSecretRecoveryPhrase pull in a sentry/selector chain
// that cannot load in the unit-test env; stub them directly.
const mockAddNewHdAccount = jest.fn().mockResolvedValue(undefined);
const mockImportNewSecretRecoveryPhrase = jest
  .fn()
  .mockResolvedValue(undefined);
jest.mock('../../actions/multiSrp', () => ({
  addNewHdAccount: (...args: unknown[]) => mockAddNewHdAccount(...args),
  importNewSecretRecoveryPhrase: (...args: unknown[]) =>
    mockImportNewSecretRecoveryPhrase(...args),
}));

const mockDispatch = jest.fn();
jest.mock('../../core/redux', () => ({
  store: { dispatch: (...args: unknown[]) => mockDispatch(...args) },
}));

jest.mock('../../store', () => ({ persistor: {} }));
jest.mock('../../actions/user', () => ({
  passwordSet: () => ({ type: 'PASSWORD_SET' }),
  setExistingUser: () => ({ type: 'SET_EXISTING_USER' }),
  logIn: () => ({ type: 'LOG_IN' }),
  seedphraseBackedUp: () => ({ type: 'SEED_PHRASE_BACKED_UP' }),
  setMultichainAccountsIntroModalSeen: (seen: boolean) => ({
    type: 'SET_MULTICHAIN_ACCOUNTS_INTRO_MODAL_SEEN',
    payload: { seen },
  }),
}));
jest.mock('../../actions/onboarding', () => ({
  setCompletedOnboarding: () => ({ type: 'SET_COMPLETED_ONBOARDING' }),
}));
jest.mock('../../actions/security', () => ({
  setDataCollectionForMarketing: () => ({
    type: 'SET_DATA_COLLECTION_FOR_MARKETING',
  }),
  setOsAuthEnabled: (enabled: boolean) => ({
    type: 'SET_OS_AUTH_ENABLED',
    enabled,
  }),
}));
jest.mock('../../actions/settings', () => ({
  setLockTime: (lockTime: number) => ({ type: 'SET_LOCK_TIME', lockTime }),
}));
jest.mock('@metamask/key-tree', () => ({
  mnemonicPhraseToBytes: jest.fn((s: string) => new Uint8Array(s.length)),
}));
jest.mock('../../store/storage-wrapper', () => {
  const storageWrapper = {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
  };
  return {
    __esModule: true,
    default: storageWrapper,
    getItem: storageWrapper.getItem,
    setItem: storageWrapper.setItem,
  };
});
jest.mock('../../constants/storage', () => ({
  OPTIN_META_METRICS_UI_SEEN: 'optin_meta_metrics_ui_seen',
  PERPS_GTM_MODAL_SHOWN: 'perps_gtm',
  REWARDS_GTM_MODAL_SHOWN: 'rewards_gtm',
}));
jest.mock('../../util/analytics/analytics', () => ({
  analytics: {
    optOut: jest.fn().mockResolvedValue(undefined),
    optIn: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('../../multichain-accounts/AccountTreeInitService', () => ({
  initializeAccountTree: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../core/NavigationService', () => ({
  navigation: { reset: jest.fn() },
}));
jest.mock('../../constants/navigation/Routes', () => ({
  ONBOARDING: { HOME_NAV: 'HomeNav' },
}));
jest.mock('../../core/SecureKeychain', () => ({
  setGenericPassword: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../constants/userProperties', () => ({
  __esModule: true,
  default: { DEVICE_AUTHENTICATION: 'device_authentication' },
}));
jest.mock('../../core/SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));

const MockEngine = jest.mocked(Engine);

// ─── Test helpers ───────────────────────────────────────────────────────────

function makeFiber(
  overrides: Partial<FiberNode> & {
    testID?: string;
    onPress?: () => void;
    disabled?: boolean;
    isDisabled?: boolean;
    accessibilityState?: { disabled?: boolean };
    activityState?: number;
    style?: unknown;
  } = {},
): FiberNode {
  const {
    testID,
    onPress,
    disabled,
    isDisabled,
    accessibilityState,
    activityState,
    style,
    ...rest
  } = overrides;
  return {
    child: null,
    sibling: null,
    return: null,
    memoizedProps:
      testID || onPress || activityState !== undefined || style !== undefined
        ? {
            testID,
            onPress,
            disabled,
            isDisabled,
            accessibilityState,
            activityState,
            style,
          }
        : null,
    stateNode: null,
    ...rest,
  };
}

function bridge() {
  const b = globalThis.__AGENTIC__;
  if (!b) throw new Error('__AGENTIC__ not installed');
  return b;
}

function installFiberHook(rootFiber: FiberNode) {
  globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    renderers: new Map([[1, {}]]),
    getFiberRoots: () => new Set([{ current: rootFiber }]),
  };
}

function installOffscreenDuplicates(hidden: FiberNode, visible: FiberNode) {
  const hiddenBoundary = {
    ...makeFiber({ child: hidden }),
    tag: 22,
    memoizedState: { baseLanes: 0, cachePool: null },
  };
  const frozen = makeFiber({
    child: hiddenBoundary,
    memoizedProps: { freeze: true },
  });
  const hiddenRoute = makeFiber({ activityState: 2, child: frozen });
  const visibleBoundary: FiberNode & { tag: number; memoizedState: unknown } = {
    ...makeFiber({ child: visible }),
    tag: 22,
    memoizedState: null,
  };
  const visibleRoute = makeFiber({ activityState: 2, child: visibleBoundary });
  const root = makeFiber({ child: hiddenRoute });
  hidden.return = hiddenBoundary;
  hiddenBoundary.return = frozen;
  frozen.return = hiddenRoute;
  hiddenRoute.return = root;
  hiddenRoute.sibling = visibleRoute;
  visibleRoute.return = root;
  visibleBoundary.return = visibleRoute;
  visible.return = visibleBoundary;
  installFiberHook(root);
  return { root, hiddenBoundary, visibleBoundary };
}

function installCurrentFiberRoot(current: FiberNode): FiberRoot {
  const root = { current };
  globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    renderers: new Map([[1, {}]]),
    getFiberRoots: () => new Set([root]),
  };
  return root;
}

function holdNativeMeasurement() {
  let finish:
    | ((x: number, y: number, width: number, height: number) => void)
    | undefined;
  const measureInWindow = jest.fn((callback: NonNullable<typeof finish>) => {
    finish = callback;
  });
  return {
    stateNode: { measureInWindow },
    release: () => {
      if (!finish) throw new Error('Native measurement was not requested');
      finish(10, 10, 40, 40);
    },
  };
}

function sharedOffscreenDescendant(
  target: FiberNode,
  committedHidden: boolean,
) {
  const committed = makeFiber({
    child: target,
    tag: 22,
    memoizedState: committedHidden ? {} : null,
  });
  const alternate = makeFiber({
    child: target,
    tag: 22,
    memoizedState: committedHidden ? null : {},
  });
  const root = makeFiber({ child: committed });
  const alternateRoot = makeFiber({ child: alternate });
  Object.assign(committed, { alternate });
  Object.assign(alternate, { alternate: committed });
  Object.assign(root, { alternate: alternateRoot });
  Object.assign(alternateRoot, { alternate: root });
  committed.return = root;
  alternate.return = alternateRoot;
  // React's unfinished render can rewrite a shared child's parent before commit.
  target.return = alternate;
  installCurrentFiberRoot(root);
  return { root, committed, alternate };
}

function resetMockAccountState() {
  Engine.context.AccountsController.state.internalAccounts.accounts = {
    a1: mockEvmAccount('a1', '0xABC', 'Account 1'),
  };
  Engine.context.AccountTreeController.state.accountTree = { wallets: {} };
}

// ─── Fiber tree helper tests ────────────────────────────────────────────────

describe('walkFiber', () => {
  it('returns false for null fiber', () => {
    expect(walkFiber(null, () => true)).toBe(false);
  });

  it('calls visitor on root and returns true when visitor matches', () => {
    const fiber = makeFiber({ testID: 'a' });
    const result = walkFiber(fiber, (f) => f.memoizedProps?.testID === 'a');
    expect(result).toBe(true);
  });

  it('walks child nodes depth-first', () => {
    const child = makeFiber({ testID: 'target' });
    const root = makeFiber({ child });
    const result = walkFiber(root, (f) => f.memoizedProps?.testID === 'target');
    expect(result).toBe(true);
  });

  it('walks sibling nodes', () => {
    const sibling = makeFiber({ testID: 'target' });
    const child = makeFiber({ sibling });
    const root = makeFiber({ child });
    const result = walkFiber(root, (f) => f.memoizedProps?.testID === 'target');
    expect(result).toBe(true);
  });

  it('returns false when no node matches', () => {
    const root = makeFiber({ child: makeFiber({ testID: 'other' }) });
    const result = walkFiber(root, (f) => f.memoizedProps?.testID === 'nope');
    expect(result).toBe(false);
  });
});

describe('findFiberByTestId', () => {
  it('returns null for null fiber', () => {
    expect(findFiberByTestId(null, 'any')).toBeNull();
  });

  it('finds a fiber by testID', () => {
    const target = makeFiber({ testID: 'btn' });
    const root = makeFiber({ child: target });
    expect(findFiberByTestId(root, 'btn')).toBe(target);
  });

  it('returns null when testID not found', () => {
    const root = makeFiber({ child: makeFiber({ testID: 'other' }) });
    expect(findFiberByTestId(root, 'missing')).toBeNull();
  });

  it('finds the active duplicate outside a retained hidden route', () => {
    const hiddenTarget = makeFiber({ testID: 'shared-button' });
    const hiddenRoute = makeFiber({
      activityState: 0,
      child: hiddenTarget,
    });
    const activeTarget = makeFiber({ testID: 'shared-button' });
    const root = makeFiber({ child: hiddenRoute });
    hiddenTarget.return = hiddenRoute;
    hiddenRoute.return = root;
    hiddenRoute.sibling = activeTarget;
    activeTarget.return = root;

    const result = findFiberByTestId(root, 'shared-button');

    expect(result).toBe(activeTarget);
  });
});

describe('findMeasurableStateNode', () => {
  it('resolves the public instance from a Fabric host state node', () => {
    const publicInstance = {
      measureInWindow: jest.fn(),
    } as FiberNode['stateNode'];
    const fabricHost = makeFiber({
      stateNode: {
        canonical: { publicInstance },
      } as FiberNode['stateNode'],
    });

    const result = findMeasurableStateNode(fabricHost);

    expect(result).toBe(publicInstance);
  });

  it('keeps a measurable Fabric public instance when its child is flattened', () => {
    const publicInstance = {
      measureInWindow: jest.fn(),
    } as FiberNode['stateNode'];
    const flattenedChild = makeFiber({ stateNode: null });
    const fabricHost = makeFiber({
      stateNode: {
        canonical: { publicInstance },
      } as FiberNode['stateNode'],
      child: flattenedChild,
    });
    flattenedChild.return = fabricHost;

    const result = findMeasurableStateNode(fabricHost);

    expect(result).toBe(publicInstance);
  });

  it('uses a measurable ancestor for a flattened host node', () => {
    const measurableParent = makeFiber({
      stateNode: { measureInWindow: jest.fn() } as FiberNode['stateNode'],
    });
    const flattenedHost = makeFiber({ stateNode: null });
    flattenedHost.return = measurableParent;

    const result = findMeasurableStateNode(flattenedHost);

    expect(result).toBe(measurableParent.stateNode);
  });

  it('does not use a measurable sibling outside the target subtree', () => {
    const measurableStateNode = {
      measureInWindow: jest.fn(),
    } as FiberNode['stateNode'];
    const target = makeFiber();
    target.sibling = makeFiber({ stateNode: measurableStateNode });

    const result = findMeasurableStateNode(target, false);

    expect(result).toBeNull();
  });
});

describe('registered measurement ownership', () => {
  let savedHook: ReactDevToolsHook | undefined;

  beforeEach(() => {
    savedHook = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  });

  afterEach(() => {
    globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ = savedHook;
  });

  it('refuses a retained target when an installed renderer has no mounted roots', () => {
    const native = { measureInWindow: jest.fn() };
    const target = makeFiber({ stateNode: native });
    globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      renderers: new Map([[1, {}]]),
      getFiberRoots: () => new Set<FiberRoot>(),
    };

    const result = findMeasurableStateNode(target);

    expect(result).toBeNull();
  });

  it('refuses a previously mounted target after its registered root is removed', () => {
    const native = { measureInWindow: jest.fn() };
    const target = makeFiber({ stateNode: native });
    const root = { current: target };
    const roots = new Set<FiberRoot>([root]);
    globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      renderers: new Map([[1, {}]]),
      getFiberRoots: () => roots,
    };

    const mounted = findMeasurableStateNode(target);
    roots.delete(root);
    const unmounted = findMeasurableStateNode(target);

    expect(mounted).toBe(native);
    expect(unmounted).toBeNull();
  });

  it('refuses a retained target when the registered root current is null', () => {
    const native = { measureInWindow: jest.fn() };
    const target = makeFiber({ stateNode: native });
    const root = installCurrentFiberRoot(target);

    const mounted = findMeasurableStateNode(target);
    root.current = null;
    const unmounted = findMeasurableStateNode(target);

    expect(mounted).toBe(native);
    expect(unmounted).toBeNull();
  });

  it('refuses a retained measurable ancestor after its registered root is removed', () => {
    const native = { measureInWindow: jest.fn() };
    const target = makeFiber();
    const ancestor = makeFiber({ stateNode: native, child: target });
    target.return = ancestor;
    const root = { current: ancestor };
    const roots = new Set<FiberRoot>([root]);
    globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      renderers: new Map([[1, {}]]),
      getFiberRoots: () => roots,
    };

    const mounted = findMeasurableStateNode(target);
    roots.delete(root);
    const unmounted = findMeasurableStateNode(target);

    expect(mounted).toBe(native);
    expect(unmounted).toBeNull();
  });

  it('resolves a visible target in a registered mounted root', () => {
    const native = { measureInWindow: jest.fn() };
    const target = makeFiber({ stateNode: native });
    const root = makeFiber({ child: target });
    target.return = root;
    installFiberHook(root);

    const result = findMeasurableStateNode(target);

    expect(result).toBe(native);
  });

  it.each(['target', 'ancestor'])(
    'resolves a genuine standalone measurable %s without an installed hook',
    (location) => {
      const native = { measureInWindow: jest.fn() };
      const target = makeFiber({
        stateNode: location === 'target' ? native : null,
      });
      if (location === 'ancestor') {
        target.return = makeFiber({ stateNode: native, child: target });
      }
      globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ = undefined;

      const result = findMeasurableStateNode(target);

      expect(result).toBe(native);
    },
  );
});

describe('walkFiberRoots', () => {
  let savedHook: ReactDevToolsHook | undefined;

  beforeEach(() => {
    savedHook = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  });

  afterEach(() => {
    globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ = savedHook;
  });

  it('returns false when hook is not installed', () => {
    globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ = undefined;
    expect(walkFiberRoots(() => true)).toBe(false);
  });

  it('returns false when renderers is empty', () => {
    globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      renderers: new Map(),
    };
    expect(walkFiberRoots(() => true)).toBe(false);
  });

  it('calls visitor with root fiber and returns true on match', () => {
    const rootFiber = makeFiber({ testID: 'root' });
    const fiberRoots = new Set([{ current: rootFiber }]);
    globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      renderers: new Map([[1, {}]]),
      getFiberRoots: () => fiberRoots,
    };
    const visitor = jest.fn(() => true);
    expect(walkFiberRoots(visitor)).toBe(true);
    expect(visitor).toHaveBeenCalledWith(rootFiber);
  });

  it('skips roots with null current', () => {
    const fiberRoots = new Set([{ current: null }]);
    globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      renderers: new Map([[1, {}]]),
      getFiberRoots: () => fiberRoots,
    };
    expect(walkFiberRoots(() => true)).toBe(false);
  });

  it('returns false when no getFiberRoots', () => {
    globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      renderers: new Map([[1, {}]]),
    };
    expect(walkFiberRoots(() => true)).toBe(false);
  });
});

describe('toAccountSummary', () => {
  it('maps internal account to slim shape', () => {
    expect(
      toAccountSummary({
        id: 'x',
        address: '0x1',
        metadata: { name: 'Test' },
      }),
    ).toEqual({ id: 'x', address: '0x1', name: 'Test' });
  });
});

describe('getFixtureMnemonicCount', () => {
  it('defaults to 1 when no count is provided', () => {
    expect(getFixtureMnemonicCount(undefined)).toBe(1);
    expect(getFixtureMnemonicCount({})).toBe(1);
  });

  it('prefers count, falls back to numberOfAccounts', () => {
    expect(getFixtureMnemonicCount({ count: 3 })).toBe(3);
    expect(getFixtureMnemonicCount({ numberOfAccounts: 2 })).toBe(2);
    expect(getFixtureMnemonicCount({ count: 5, numberOfAccounts: 2 })).toBe(5);
  });

  it('throws on out-of-range or non-integer counts', () => {
    expect(() => getFixtureMnemonicCount({ count: 0 })).toThrow();
    expect(() => getFixtureMnemonicCount({ count: 101 })).toThrow();
    expect(() => getFixtureMnemonicCount({ count: 1.5 })).toThrow();
  });
});

describe('getFixtureAccountNames', () => {
  it('uses explicit names by index when present', () => {
    expect(getFixtureAccountNames({ names: ['One', 'Two'] }, 2)).toEqual([
      'One',
      'Two',
    ]);
  });

  it('uses name only for the first account', () => {
    expect(getFixtureAccountNames({ name: 'Primary' }, 2)).toEqual([
      'Primary',
      'Account 2',
    ]);
  });

  it('falls back to Account N when nothing is provided', () => {
    expect(getFixtureAccountNames(undefined, 3)).toEqual([
      'Account 1',
      'Account 2',
      'Account 3',
    ]);
  });
});

describe('tryScroll', () => {
  it('returns false for null start', () => {
    expect(tryScroll(null, 100, false)).toBe(false);
  });

  it('scrolls via scrollTo on stateNode', () => {
    const scrollTo = jest.fn();
    const fiber = makeFiber({
      stateNode: { scrollTo } as FiberNode['stateNode'],
    });
    expect(tryScroll(fiber, 200, true)).toBe(true);
    expect(scrollTo).toHaveBeenCalledWith({ y: 200, animated: true });
  });

  it('scrolls via scrollToOffset on stateNode', () => {
    const scrollToOffset = jest.fn();
    const fiber = makeFiber({
      stateNode: { scrollToOffset } as FiberNode['stateNode'],
    });
    expect(tryScroll(fiber, 400, false)).toBe(true);
    expect(scrollToOffset).toHaveBeenCalledWith({
      offset: 400,
      animated: false,
    });
  });

  it('walks child to find scrollable', () => {
    const scrollTo = jest.fn();
    const child = makeFiber({
      stateNode: { scrollTo } as FiberNode['stateNode'],
    });
    const root = makeFiber({ child });
    expect(tryScroll(root, 100, false)).toBe(true);
  });

  it('skips siblings when walkSiblings is false', () => {
    const scrollTo = jest.fn();
    const sibling = makeFiber({
      stateNode: { scrollTo } as FiberNode['stateNode'],
    });
    const root = makeFiber({ sibling });
    expect(tryScroll(root, 100, false, false)).toBe(false);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('walks siblings when walkSiblings is true', () => {
    const scrollTo = jest.fn();
    const sibling = makeFiber({
      stateNode: { scrollTo } as FiberNode['stateNode'],
    });
    const root = makeFiber({ sibling });
    expect(tryScroll(root, 100, false, true)).toBe(true);
    expect(scrollTo).toHaveBeenCalled();
  });
});

// ─── AgenticService.install / __AGENTIC__ bridge tests ──────────────────────

describe('AgenticService.install', () => {
  let mockNavRef: NavigationContainerRef<ParamListBase>;
  let mockDeferredNav: NavigationContainerRef<ParamListBase>;
  let savedHook: ReactDevToolsHook | undefined;
  let savedDev: boolean | undefined;

  beforeEach(() => {
    jest.clearAllMocks();

    mockNavRef = {
      navigate: jest.fn(),
      reset: jest.fn(),
      goBack: jest.fn(),
      dispatch: jest.fn(),
      getCurrentRoute: jest.fn(() => ({ name: 'Wallet', key: 'w-1' })),
      getState: jest.fn(() => ({})),
      canGoBack: jest.fn(() => true),
    } as unknown as NavigationContainerRef<ParamListBase>;

    mockDeferredNav = {
      navigate: jest.fn(),
      goBack: jest.fn(),
    } as unknown as NavigationContainerRef<ParamListBase>;

    savedHook = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    savedDev = (globalThis as { __DEV__?: boolean }).__DEV__;
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;

    AgenticService.install(mockNavRef, mockDeferredNav);
  });

  afterEach(() => {
    globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ = savedHook;
    globalThis.__AGENTIC__ = undefined;
    (globalThis as { __DEV__?: boolean }).__DEV__ = savedDev;
  });

  it('installs __AGENTIC__ on globalThis', () => {
    expect(globalThis.__AGENTIC__).toBeDefined();
    expect(bridge().platform).toBeDefined();
  });

  it('navigate delegates to deferred navigation', () => {
    bridge().navigate('Settings', { key: 'val' });
    expect(mockDeferredNav.navigate).toHaveBeenCalled();
  });

  it('getRoute returns current route', () => {
    const route = bridge().getRoute();
    expect(route).toEqual({ name: 'Wallet', key: 'w-1' });
  });

  it('getState returns navigation state', () => {
    expect(bridge().getState()).toEqual({});
  });

  it('reads detached Perps observations without controller or stream operations', () => {
    const snapshot = bridge().readPerpsUiObservations();
    snapshot.submissions.push({} as (typeof snapshot.submissions)[number]);

    const next = bridge().readPerpsUiObservations();

    expect(next.submissions).not.toEqual(snapshot.submissions);
    expect(next.submissionSequence).toBe(snapshot.submissionSequence);
    expect(
      MockEngine.context.PerpsController.getPositions,
    ).not.toHaveBeenCalled();
    expect(mockEnsureConnected).not.toHaveBeenCalled();
    expect(mockClearAllChannels).not.toHaveBeenCalled();
    expect(bridge()).not.toHaveProperty('beginPerpsUiSubmission');
    expect(bridge()).not.toHaveProperty('settlePerpsUiSubmission');
  });

  it('canGoBack returns boolean', () => {
    expect(bridge().canGoBack()).toBe(true);
  });

  it('goBack delegates to deferred navigation', () => {
    bridge().goBack();
    expect(mockDeferredNav.goBack).toHaveBeenCalled();
  });

  it('refreshPerpsStreams reconnects streams and reports position count', async () => {
    mockEnsureConnected.mockClear();
    mockClearAllChannels.mockClear();
    (
      MockEngine.context.PerpsController.getPositions as jest.Mock
    ).mockResolvedValue([{ coin: 'ETH' }, { coin: 'BTC' }]);

    await expect(bridge().refreshPerpsStreams()).resolves.toEqual({
      ok: true,
      positions: 2,
    });
    expect(mockEnsureConnected).toHaveBeenCalledWith({
      source: 'agentic_refresh_perps_streams',
      suppressError: true,
    });
    expect(mockClearAllChannels).toHaveBeenCalledTimes(1);
  });

  it('listAccounts returns mapped accounts', () => {
    (
      MockEngine.context.AccountsController.listAccounts as jest.Mock
    ).mockReturnValue([
      { id: '1', address: '0xabc', metadata: { name: 'Acc1' } },
    ]);
    const result = bridge().listAccounts();
    expect(result).toEqual([{ id: '1', address: '0xabc', name: 'Acc1' }]);
  });

  it('getSelectedAccount returns current account', () => {
    const result = bridge().getSelectedAccount();
    expect(result).toEqual({
      id: 'acc-1',
      address: '0xabc',
      name: 'Account 1',
    });
  });

  it('switchAccount switches to matching address', () => {
    (
      MockEngine.context.AccountsController.listAccounts as jest.Mock
    ).mockReturnValue([
      { id: '1', address: '0xABC', metadata: { name: 'Acc1' } },
    ]);
    const result = bridge().switchAccount('0xabc');
    expect(result.switched).toBe(true);
    expect(MockEngine.setSelectedAddress).toHaveBeenCalledWith('0xABC');
  });

  it('switchAccount throws for unknown address', () => {
    (
      MockEngine.context.AccountsController.listAccounts as jest.Mock
    ).mockReturnValue([]);
    expect(() => bridge().switchAccount('0xfff')).toThrow('No account found');
  });

  describe('showStep / hideStep', () => {
    const mockEmit = jest.mocked(emitStepHud);

    it('showStep emits step data to the HUD bus', () => {
      bridge().showStep({
        id: 'run 1/2',
        status: 'running',
        intent: 'Navigate to market',
        progress: { current: 1, total: 2 },
      });

      expect(mockEmit).toHaveBeenCalledWith({
        id: 'run 1/2',
        status: 'running',
        intent: 'Navigate to market',
        progress: { current: 1, total: 2 },
      });
    });

    it('hideStep emits null to the HUD bus', () => {
      bridge().hideStep();

      expect(mockEmit).toHaveBeenCalledWith(null);
    });
  });

  describe('findFiberByTestId (bridge)', () => {
    it('returns true when testID exists in fiber tree', () => {
      const fiber = makeFiber({
        child: makeFiber({ testID: 'target-btn' }),
      });
      installFiberHook(fiber);

      expect(bridge().findFiberByTestId('target-btn')).toBe(true);
    });

    it('returns false when testID does not exist', () => {
      installFiberHook(makeFiber());

      expect(bridge().findFiberByTestId('missing-id')).toBe(false);
    });
  });

  describe('committed Offscreen controls', () => {
    it('finds the visible duplicate while both native routes report active', () => {
      const hidden = makeFiber({ testID: 'shared-control' });
      const visible = makeFiber({ testID: 'shared-control' });
      const { root } = installOffscreenDuplicates(hidden, visible);

      const target = findFiberByTestId(root, 'shared-control');

      expect(target === visible).toBe(true);
    });

    it('presses only the visible duplicate with retained positive frames', async () => {
      const hiddenPress = jest.fn();
      const visiblePress = jest.fn();
      const hiddenMeasure = jest.fn(
        (
          callback: (
            x: number,
            y: number,
            width: number,
            height: number,
          ) => void,
        ) => callback(10, 10, 40, 40),
      );
      const hidden = makeFiber({
        testID: 'shared-control',
        onPress: hiddenPress,
        stateNode: { measureInWindow: hiddenMeasure },
      });
      const visible = makeFiber({
        testID: 'shared-control',
        onPress: visiblePress,
        stateNode: { measureInWindow: (callback) => callback(10, 10, 40, 40) },
      });
      installOffscreenDuplicates(hidden, visible);

      const result = await bridge().pressTestId('shared-control');

      expect(result.ok).toBe(true);
      expect(visiblePress).toHaveBeenCalledTimes(1);
      expect(hiddenPress).not.toHaveBeenCalled();
      expect(hiddenMeasure).not.toHaveBeenCalled();
    });

    it('presses text on the visible duplicate without dispatching the hidden handler', () => {
      const hiddenPress = jest.fn();
      const visiblePress = jest.fn();
      installOffscreenDuplicates(
        makeFiber({
          memoizedProps: { children: 'Advanced', onPress: hiddenPress },
        }),
        makeFiber({
          memoizedProps: { children: 'Advanced', onPress: visiblePress },
        }),
      );

      const result = bridge().pressText('Advanced');

      expect(result.ok).toBe(true);
      expect(visiblePress).toHaveBeenCalledTimes(1);
      expect(hiddenPress).not.toHaveBeenCalled();
    });

    it('resolves the visible exact scope beside a hidden duplicate scope', async () => {
      const hiddenPress = jest.fn();
      const visiblePress = jest.fn();
      const hidden = makeFiber({ testID: 'terminate', onPress: hiddenPress });
      const visible = makeFiber({
        testID: 'terminate',
        onPress: visiblePress,
        stateNode: { measureInWindow: (callback) => callback(10, 10, 40, 40) },
      });
      const hiddenScope = makeFiber({ testID: 'owned-group', child: hidden });
      const visibleScope = makeFiber({ testID: 'owned-group', child: visible });
      hidden.return = hiddenScope;
      visible.return = visibleScope;
      installOffscreenDuplicates(hiddenScope, visibleScope);

      const result = await bridge().pressTestId('terminate', {
        ancestorTestId: 'owned-group',
      });

      expect(result.ok).toBe(true);
      expect(visiblePress).toHaveBeenCalledTimes(1);
      expect(hiddenPress).not.toHaveBeenCalled();
    });

    it.each([undefined, { ancestorTestId: 'owned-group' }])(
      'refuses a control that becomes committed hidden during measurement with scope %j',
      async (options) => {
        const onPress = jest.fn();
        const control = makeFiber({ testID: 'terminate', onPress });
        const scope = makeFiber({ testID: 'owned-group', child: control });
        control.return = scope;
        const { visibleBoundary } = installOffscreenDuplicates(
          makeFiber(),
          scope,
        );
        control.stateNode = {
          measureInWindow: (callback) => {
            visibleBoundary.memoizedState = { baseLanes: 0, cachePool: null };
            callback(10, 10, 40, 40);
          },
        };

        const result = await bridge().pressTestId('terminate', options);

        expect(result.ok).toBe(false);
        expect(onPress).not.toHaveBeenCalled();
      },
    );

    it.each([undefined, 'shared-scroll'])(
      'scrolls visible content with anchor %s',
      (testId) => {
        const hiddenScroll = jest.fn();
        const visibleScroll = jest.fn();
        installOffscreenDuplicates(
          makeFiber({
            testID: 'shared-scroll',
            stateNode: { scrollTo: hiddenScroll },
          }),
          makeFiber({
            testID: 'shared-scroll',
            stateNode: { scrollTo: visibleScroll },
          }),
        );

        const result = bridge().scrollView({ testId, offset: 200 });

        expect(result.ok).toBe(true);
        expect(visibleScroll).toHaveBeenCalledWith({ y: 200, animated: false });
        expect(hiddenScroll).not.toHaveBeenCalled();
      },
    );

    it('sets input only on the visible duplicate', () => {
      const hiddenInput = jest.fn();
      const visibleInput = jest.fn();
      installOffscreenDuplicates(
        makeFiber({
          memoizedProps: { testID: 'shared-input', onChangeText: hiddenInput },
        }),
        makeFiber({
          memoizedProps: { testID: 'shared-input', onChangeText: visibleInput },
        }),
      );

      const result = bridge().setInput('shared-input', '125');

      expect(result.ok).toBe(true);
      expect(visibleInput).toHaveBeenCalledWith('125');
      expect(hiddenInput).not.toHaveBeenCalled();
    });

    it('reads text only from the visible duplicate', () => {
      installOffscreenDuplicates(
        makeFiber({
          memoizedProps: { testID: 'shared-label', children: 'Retained text' },
        }),
        makeFiber({
          memoizedProps: { testID: 'shared-label', children: 'Visible text' },
        }),
      );

      const result = bridge().getTextByTestId('shared-label', { all: true });

      expect(result).toEqual(['Visible text']);
    });

    it.each(['tree', 'viewport'] as const)(
      'does not report hidden input as present in %s queries',
      async (visibility) => {
        const hidden = makeFiber({
          testID: 'retained-input',
          stateNode: {
            measureInWindow: (callback) => callback(10, 10, 40, 40),
          },
        });
        installOffscreenDuplicates(hidden, makeFiber());

        const result = await bridge().queryUiTarget({
          testId: 'retained-input',
          visibility,
        });

        expect(result.present).toBe(false);
        expect(result.visible).toBe(false);
        expect(bridge().findFiberByTestId('retained-input')).toBe(false);
      },
    );

    it('does not report retained descendant text through visible ancestor props', async () => {
      const hidden = makeFiber({
        memoizedProps: { children: 'Retained text' },
      });
      const visible = makeFiber({
        memoizedProps: { children: 'Visible text' },
      });
      const { root } = installOffscreenDuplicates(hidden, visible);
      root.memoizedProps = {
        testID: 'screen',
        children: [
          { props: { children: 'Retained text' } },
          { props: { children: 'Visible text' } },
        ],
      };

      const query = await bridge().queryUiTarget({
        textContains: 'Retained text',
        visibility: 'tree',
      });
      const texts = bridge().getTextByTestId('screen', { all: true });

      expect(query.present).toBe(false);
      expect(texts).toEqual(['Visible text']);
    });

    it('does not return a retained hidden row value through the fallback reader', () => {
      const value = makeFiber({ memoizedProps: { children: '99 SOL' } });
      const hidden = makeFiber({
        memoizedProps: { children: 'Accepted' },
        child: value,
      });
      value.return = hidden;
      installOffscreenDuplicates(
        hidden,
        makeFiber({ memoizedProps: { children: 'Visible text' } }),
      );

      const result = bridge().getRowValue('Accepted', '^\\d+ SOL$');

      expect(result).toBeNull();
    });

    it('does not read primitive ancestor props when its committed children are hidden', async () => {
      const hidden = makeFiber({
        memoizedProps: { children: 'Retained text' },
      });
      const { hiddenBoundary } = installOffscreenDuplicates(
        hidden,
        makeFiber(),
      );
      const parent = hiddenBoundary.return;
      if (!parent) throw new Error('Missing frozen parent');
      parent.memoizedProps = { testID: 'frozen', children: 'Retained text' };

      const texts = bridge().getTextByTestId('frozen', { all: true });
      const query = await bridge().queryUiTarget({
        textContains: 'Retained text',
      });

      expect(texts).toBeNull();
      expect(query.present).toBe(false);
    });

    it('reads visible native text fiber props instead of uncommitted ancestor children', () => {
      const nativeText = makeFiber();
      // HostText fibers store a primitive instead of the component props shape.
      Object.assign(nativeText, { tag: 6, memoizedProps: 'Visible text' });
      const parent = makeFiber({
        testID: 'label',
        child: nativeText,
        memoizedProps: {
          testID: 'label',
          children: { props: { children: 'Uncommitted text' } },
        },
      });
      nativeText.return = parent;
      installFiberHook(parent);

      const texts = bridge().getTextByTestId('label', { all: true });

      expect(texts).toEqual(['Visible text']);
    });

    it('preserves visible leaf element text when no committed children exist', () => {
      const leaf = makeFiber({
        memoizedProps: {
          testID: 'label',
          children: { props: { children: ['Visible text', 12] } },
        },
      });
      installFiberHook(leaf);

      const texts = bridge().getTextByTestId('label', { all: true });

      expect(texts).toEqual(['Visible text', '12']);
    });

    it('reads a visible committed row label and value', () => {
      const label = makeFiber({ memoizedProps: { children: 'Accepted' } });
      const value = makeFiber({ memoizedProps: { children: '99 SOL' } });
      const row = makeFiber({ testID: 'row', child: label });
      label.return = row;
      label.sibling = value;
      value.return = row;
      installOffscreenDuplicates(makeFiber(), row);

      const result = bridge().getRowValue('Accepted', '^\\d+ SOL$', {
        anchorTestId: 'row',
      });

      expect(result).toBe('99 SOL');
    });

    it('does not measure a retained hidden descendant of a visible target', async () => {
      const measure = jest.fn(
        (
          callback: (
            x: number,
            y: number,
            width: number,
            height: number,
          ) => void,
        ) => callback(10, 10, 40, 40),
      );
      const hidden = makeFiber({ stateNode: { measureInWindow: measure } });
      const { root } = installOffscreenDuplicates(hidden, makeFiber());
      root.memoizedProps = { testID: 'screen' };

      const result = await bridge().queryUiTarget({
        testId: 'screen',
        visibility: 'viewport',
      });

      expect(result.present).toBe(true);
      expect(result.visible).toBe(false);
      expect(measure).not.toHaveBeenCalled();
    });

    it.each([
      { tag: 22, memoizedState: null },
      { tag: 0, memoizedState: { hookState: true } },
      { tag: undefined, memoizedState: undefined },
    ])('preserves visible controls for committed state %j', async (state) => {
      const onPress = jest.fn();
      const control = makeFiber({ testID: 'visible-control', onPress });
      const parent = {
        ...makeFiber({
          child: control,
          memoizedProps: { freeze: true, mode: 'hidden', activityState: 2 },
        }),
        ...state,
      };
      control.return = parent;
      installFiberHook(parent);

      const result = await bridge().pressTestId('visible-control');

      expect(result.ok).toBe(true);
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('committed ancestry with shared descendants', () => {
    it.each([true, false])('looks up the committed %s visibility', (hidden) => {
      const target = makeFiber({ testID: 'shared-control' });
      sharedOffscreenDescendant(target, hidden);

      const found = bridge().findFiberByTestId('shared-control');

      expect(found).toBe(!hidden);
    });

    it.each([true, false])('reads text with committed hidden=%s', (hidden) => {
      const target = makeFiber({
        memoizedProps: {
          testID: 'shared-control',
          children: 'Committed content',
        },
      });
      sharedOffscreenDescendant(target, hidden);

      const text = bridge().getTextByTestId('shared-control');

      expect(text).toBe(hidden ? null : 'Committed content');
    });

    it.each([true, false])(
      'presses only committed visible content with hidden=%s',
      async (hidden) => {
        const onPress = jest.fn();
        const target = makeFiber({ testID: 'shared-control', onPress });
        sharedOffscreenDescendant(target, hidden);

        const result = await bridge().pressTestId('shared-control');

        expect(result.ok).toBe(!hidden);
        expect(onPress).toHaveBeenCalledTimes(hidden ? 0 : 1);
      },
    );

    it.each([true, false])(
      'presses text with committed hidden=%s',
      (hidden) => {
        const onPress = jest.fn();
        const target = makeFiber({
          memoizedProps: { onPress, children: 'Committed content' },
        });
        sharedOffscreenDescendant(target, hidden);

        const result = bridge().pressText('Committed content');

        expect(result.ok).toBe(!hidden);
        expect(onPress).toHaveBeenCalledTimes(hidden ? 0 : 1);
      },
    );

    it.each([true, false])('sets input with committed hidden=%s', (hidden) => {
      const onChangeText = jest.fn();
      const target = makeFiber({
        memoizedProps: { testID: 'shared-control', onChangeText },
      });
      sharedOffscreenDescendant(target, hidden);

      const result = bridge().setInput('shared-control', '12');

      expect(result.ok).toBe(!hidden);
      expect(onChangeText).toHaveBeenCalledTimes(hidden ? 0 : 1);
    });

    it.each([true, false])('scrolls with committed hidden=%s', (hidden) => {
      const scrollTo = jest.fn();
      const target = makeFiber({
        testID: 'shared-control',
        stateNode: { scrollTo },
      });
      sharedOffscreenDescendant(target, hidden);

      const result = bridge().scrollView({
        testId: 'shared-control',
        offset: 100,
      });

      expect(result.ok).toBe(!hidden);
      expect(scrollTo).toHaveBeenCalledTimes(hidden ? 0 : 1);
    });

    it.each([true, false])(
      'measures only committed visible content with hidden=%s',
      async (hidden) => {
        const measureInWindow = jest.fn(
          (
            callback: (
              x: number,
              y: number,
              width: number,
              height: number,
            ) => void,
          ) => callback(10, 10, 40, 40),
        );
        const target = makeFiber({
          testID: 'shared-control',
          stateNode: { measureInWindow },
        });
        sharedOffscreenDescendant(target, hidden);

        const result = await bridge().queryUiTarget({
          testId: 'shared-control',
          visibility: 'viewport',
        });

        expect(result.present).toBe(!hidden);
        expect(result.visible).toBe(!hidden);
        expect(measureInWindow).toHaveBeenCalledTimes(hidden ? 0 : 1);
      },
    );

    it.each([true, false])(
      'resolves native measurement with committed hidden=%s',
      (hidden) => {
        const native = { measureInWindow: jest.fn() };
        const target = makeFiber({ stateNode: native });
        sharedOffscreenDescendant(target, hidden);

        const result = findMeasurableStateNode(target);

        expect(result).toBe(hidden ? null : native);
      },
    );

    it('does not measure a hidden target through a visible native ancestor', () => {
      const target = makeFiber();
      const { root, alternate } = sharedOffscreenDescendant(target, true);
      root.stateNode = { measureInWindow: jest.fn() };
      if (!alternate.return) throw new Error('Missing alternate root');
      alternate.return.stateNode = root.stateNode;

      const result = findMeasurableStateNode(target);

      expect(result).toBeNull();
    });

    it('uses the committed input ancestor instead of an unfinished handler', () => {
      const committedInput = jest.fn();
      const alternateInput = jest.fn();
      const target = makeFiber({ testID: 'shared-control' });
      const { committed, alternate } = sharedOffscreenDescendant(target, false);
      committed.memoizedProps = { onChangeText: committedInput };
      alternate.memoizedProps = { onChangeText: alternateInput };

      const result = bridge().setInput('shared-control', '12');

      expect(result.ok).toBe(true);
      expect(committedInput).toHaveBeenCalledWith('12');
      expect(alternateInput).not.toHaveBeenCalled();
    });
  });

  describe('unscoped press across native measurement', () => {
    it.each(['hidden', 'removed', 'replaced'])(
      'refuses a %s committed root replacement',
      async (change) => {
        const oldPress = jest.fn();
        const replacementPress = jest.fn();
        const held = holdNativeMeasurement();
        const target = makeFiber({
          testID: 'action',
          onPress: oldPress,
          stateNode: held.stateNode,
        });
        const initial = makeFiber({ child: target });
        target.return = initial;
        const root = installCurrentFiberRoot(initial);
        const pending = bridge().pressTestId('action');
        const replacement = makeFiber({
          testID: 'action',
          onPress: replacementPress,
        });
        const committed = makeFiber({
          child: change === 'removed' ? null : replacement,
          tag: 22,
          memoizedState: change === 'hidden' ? {} : null,
        });
        replacement.return = committed;
        root.current = committed;

        held.release();
        const result = await pending;

        expect(result.ok).toBe(false);
        expect(oldPress).not.toHaveBeenCalled();
        expect(replacementPress).not.toHaveBeenCalled();
      },
    );

    it.each(['handler', 'disabled', 'ambiguous', 'owner', 'native-node'])(
      'refuses a control whose %s changes while measurement is held',
      async (change) => {
        const oldPress = jest.fn();
        const replacementPress = jest.fn();
        const held = holdNativeMeasurement();
        const target = makeFiber({
          testID: 'action',
          onPress: oldPress,
          stateNode: held.stateNode,
        });
        const initial = makeFiber({ child: target });
        target.return = initial;
        installCurrentFiberRoot(initial);
        const pending = bridge().pressTestId('action');
        if (change === 'handler' && target.memoizedProps)
          target.memoizedProps.onPress = replacementPress;
        if (change === 'disabled' && target.memoizedProps)
          target.memoizedProps.disabled = true;
        if (change === 'ambiguous') {
          target.sibling = makeFiber({
            testID: 'action',
            onPress: replacementPress,
          });
          target.sibling.return = initial;
        }
        if (change === 'owner') {
          const owner = makeFiber({ child: target });
          initial.child = owner;
          owner.return = initial;
          target.return = owner;
        }
        if (change === 'native-node')
          target.stateNode = {
            measureInWindow: (callback) => callback(-100, 10, 40, 40),
          };

        held.release();
        const result = await pending;

        expect(result.ok).toBe(false);
        expect(oldPress).not.toHaveBeenCalled();
        expect(replacementPress).not.toHaveBeenCalled();
      },
    );

    it('presses a stable committed control after measurement is released', async () => {
      const onPress = jest.fn();
      const held = holdNativeMeasurement();
      const target = makeFiber({
        testID: 'action',
        onPress,
        stateNode: held.stateNode,
      });
      installCurrentFiberRoot(makeFiber({ child: target }));
      const pending = bridge().pressTestId('action');

      held.release();
      const result = await pending;

      expect(result.ok).toBe(true);
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('viewport query across native measurement', () => {
    it.each([
      'hidden',
      'removed',
      'replaced',
      'duplicate',
      'later-duplicate',
      'text',
      'native-node',
      'owner',
    ])('refuses stale evidence after the target becomes %s', async (change) => {
      const held = holdNativeMeasurement();
      const target = makeFiber({
        memoizedProps: { testID: 'label', children: 'Expected content' },
        stateNode: held.stateNode,
      });
      const initial = makeFiber({ child: target });
      target.return = initial;
      const root = installCurrentFiberRoot(initial);
      const pending = bridge().queryUiTarget({
        testId: 'label',
        textContains: 'Expected',
        visibility: 'viewport',
      });
      const replacement = makeFiber({
        memoizedProps: { testID: 'label', children: 'Expected replacement' },
        stateNode: { measureInWindow: (callback) => callback(10, 10, 40, 40) },
      });
      if (
        change === 'hidden' ||
        change === 'removed' ||
        change === 'replaced'
      ) {
        const committed = makeFiber({
          child: change === 'removed' ? null : replacement,
          tag: 22,
          memoizedState: change === 'hidden' ? {} : null,
        });
        replacement.return = committed;
        root.current = committed;
      }
      if (change === 'duplicate') {
        initial.child = replacement;
        replacement.sibling = target;
        replacement.return = initial;
      }
      if (change === 'later-duplicate') {
        target.sibling = replacement;
        replacement.return = initial;
      }
      if (change === 'text' && target.memoizedProps)
        target.memoizedProps.children = 'Different content';
      if (change === 'native-node') target.stateNode = replacement.stateNode;
      if (change === 'owner') {
        const owner = makeFiber({ child: target });
        initial.child = owner;
        owner.return = initial;
        target.return = owner;
      }

      held.release();
      const result = await pending;

      expect(result).toMatchObject({
        present: false,
        visible: false,
        textMatched: false,
      });
      expect(result.rect).toBeUndefined();
    });

    it('reports stable current text and the released frame', async () => {
      const held = holdNativeMeasurement();
      const target = makeFiber({
        memoizedProps: { testID: 'label', children: 'Expected content' },
        stateNode: held.stateNode,
      });
      installCurrentFiberRoot(makeFiber({ child: target }));
      const pending = bridge().queryUiTarget({
        testId: 'label',
        textContains: 'Expected',
        visibility: 'viewport',
      });

      held.release();
      const result = await pending;

      expect(result).toMatchObject({
        present: true,
        visible: true,
        textMatched: true,
        rect: { x: 10, y: 10, width: 40, height: 40 },
      });
    });
  });

  describe('pressTestId', () => {
    it('presses the existing control once inside its exact ancestor after sibling reorder', async () => {
      const ownedPress = jest.fn();
      const unrelatedPress = jest.fn();
      const owned = makeFiber({ testID: 'terminate', onPress: ownedPress });
      const unrelated = makeFiber({
        testID: 'terminate',
        onPress: unrelatedPress,
      });
      const scope = makeFiber({ testID: 'handle-owned', child: owned });
      const otherScope = makeFiber({
        testID: 'handle-other',
        child: unrelated,
      });
      const root = makeFiber({ child: scope });
      scope.return = root;
      otherScope.return = root;
      owned.return = scope;
      unrelated.return = otherScope;
      scope.sibling = otherScope;
      owned.stateNode = {
        measureInWindow: (callback) => {
          root.child = otherScope;
          otherScope.sibling = scope;
          scope.sibling = null;
          callback(10, 10, 40, 40);
        },
      };
      installFiberHook(root);

      const result = await bridge().pressTestId('terminate', {
        ancestorTestId: 'handle-owned',
      });

      expect(result.ok).toBe(true);
      expect(ownedPress).toHaveBeenCalledTimes(1);
      expect(unrelatedPress).not.toHaveBeenCalled();
    });

    it.each([
      'unmounted',
      'handler',
      'ancestor',
      'disabled',
      'inactive',
      'ancestor-disabled',
      'offscreen',
    ])(
      'refuses a scoped control that becomes %s during measurement',
      async (change) => {
        const onPress = jest.fn();
        const replacementPress = jest.fn();
        const control = makeFiber({ testID: 'terminate', onPress });
        const scope = makeFiber({ testID: 'handle-owned', child: control });
        const root = makeFiber({ child: scope });
        scope.return = root;
        control.return = scope;
        control.stateNode = {
          measureInWindow: (callback) => {
            if (change === 'unmounted') root.child = null;
            if (change === 'handler' && control.memoizedProps)
              control.memoizedProps.onPress = replacementPress;
            if (change === 'ancestor' && scope.memoizedProps)
              scope.memoizedProps.testID = 'handle-other';
            if (change === 'disabled' && control.memoizedProps)
              control.memoizedProps.disabled = true;
            if (change === 'inactive' && scope.memoizedProps)
              scope.memoizedProps.activityState = 0;
            if (change === 'ancestor-disabled' && scope.memoizedProps)
              scope.memoizedProps.disabled = true;
            callback(change === 'offscreen' ? -100 : 10, 10, 40, 40);
          },
        };
        installFiberHook(root);

        const result = await bridge().pressTestId('terminate', {
          ancestorTestId: 'handle-owned',
        });

        expect(result.ok).toBe(false);
        expect(onPress).not.toHaveBeenCalled();
        expect(replacementPress).not.toHaveBeenCalled();
      },
    );

    it.each(['ancestor', 'control'])(
      'refuses an ambiguous scoped %s',
      async (duplicate) => {
        const firstPress = jest.fn();
        const secondPress = jest.fn();
        const first = makeFiber({ testID: 'terminate', onPress: firstPress });
        const second = makeFiber({ testID: 'terminate', onPress: secondPress });
        const scope = makeFiber({ testID: 'handle-owned', child: first });
        const other = makeFiber({ testID: 'handle-owned', child: second });
        const root = makeFiber({ child: scope });
        scope.return = root;
        first.return = scope;
        if (duplicate === 'ancestor') {
          scope.sibling = other;
          other.return = root;
          second.return = other;
        } else {
          first.sibling = second;
          second.return = scope;
        }
        installFiberHook(root);

        const result = await bridge().pressTestId('terminate', {
          ancestorTestId: 'handle-owned',
        });

        expect(result.ok).toBe(false);
        expect(firstPress).not.toHaveBeenCalled();
        expect(secondPress).not.toHaveBeenCalled();
      },
    );

    it('requires a measurable visible frame for an exact scoped press', async () => {
      const onPress = jest.fn();
      const control = makeFiber({ testID: 'terminate', onPress });
      const scope = makeFiber({ testID: 'handle-owned', child: control });
      const root = makeFiber({ child: scope });
      scope.return = root;
      control.return = scope;
      installFiberHook(root);

      expect(bridge().pressTestIdScopeVersion).toBe(1);
      expect(
        await bridge().pressTestId('terminate', {
          ancestorTestId: 'handle-owned',
        }),
      ).toMatchObject({ ok: false });
      expect(onPress).not.toHaveBeenCalled();
    });

    it('presses a component found by testID', async () => {
      const onPress = jest.fn();
      const fiber = makeFiber({
        child: makeFiber({ testID: 'my-btn', onPress }),
      });
      installFiberHook(fiber);

      const result = await bridge().pressTestId('my-btn');

      expect(result).toEqual({ ok: true, testId: 'my-btn' });
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('returns error when testID not found', async () => {
      installFiberHook(makeFiber());

      const result = await bridge().pressTestId('missing');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('missing');
    });

    it('returns error when hook is not installed', async () => {
      globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ = undefined;

      const result = await bridge().pressTestId('any');

      expect(result.ok).toBe(false);
    });

    it('returns error when component has no onPress', async () => {
      const fiber = makeFiber({
        child: makeFiber({ testID: 'no-press' }),
      });
      installFiberHook(fiber);

      const result = await bridge().pressTestId('no-press');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('no-press');
    });

    it.each([
      { disabled: true },
      { isDisabled: true },
      { accessibilityState: { disabled: true } },
    ])('does not press a disabled component', async (disabledProps) => {
      const onPress = jest.fn();
      installFiberHook(
        makeFiber({ testID: 'disabled-button', onPress, ...disabledProps }),
      );

      const result = await bridge().pressTestId('disabled-button');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('disabled');
      expect(onPress).not.toHaveBeenCalled();
    });

    it('handles deeply nested components', async () => {
      const onPress = jest.fn();
      const deep = makeFiber({ testID: 'deep', onPress });
      const mid = makeFiber({ child: deep });
      const root = makeFiber({ child: mid });
      installFiberHook(root);

      const result = await bridge().pressTestId('deep');

      expect(result).toEqual({ ok: true, testId: 'deep' });
      expect(onPress).toHaveBeenCalled();
    });

    it('presses the active duplicate outside a retained hidden route', async () => {
      const hiddenPress = jest.fn();
      const activePress = jest.fn();
      const hiddenTarget = makeFiber({
        testID: 'shared-button',
        onPress: hiddenPress,
      });
      const hiddenRoute = makeFiber({
        style: { display: 'none' },
        child: hiddenTarget,
      });
      const activeTarget = makeFiber({
        testID: 'shared-button',
        onPress: activePress,
      });
      const root = makeFiber({ child: hiddenRoute });
      hiddenTarget.return = hiddenRoute;
      hiddenRoute.return = root;
      hiddenRoute.sibling = activeTarget;
      activeTarget.return = root;
      installFiberHook(root);

      const result = await bridge().pressTestId('shared-button');

      expect(result).toEqual({ ok: true, testId: 'shared-button' });
      expect(hiddenPress).not.toHaveBeenCalled();
      expect(activePress).toHaveBeenCalledTimes(1);
    });

    it('presses the viewport-visible duplicate in the active route', async () => {
      const hiddenPress = jest.fn();
      const visiblePress = jest.fn();
      const hiddenTarget = makeFiber({
        testID: 'shared-button',
        onPress: hiddenPress,
        stateNode: {
          measureInWindow: (callback) => callback(0, 0, 0, 0),
        } as FiberNode['stateNode'],
      });
      const visibleTarget = makeFiber({
        testID: 'shared-button',
        onPress: visiblePress,
        stateNode: {
          measureInWindow: (callback) => callback(10, 10, 40, 40),
        } as FiberNode['stateNode'],
      });
      const root = makeFiber({ child: hiddenTarget });
      hiddenTarget.return = root;
      hiddenTarget.sibling = visibleTarget;
      visibleTarget.return = root;
      installFiberHook(root);

      const result = await bridge().pressTestId('shared-button');

      expect(result).toEqual({ ok: true, testId: 'shared-button' });
      expect(hiddenPress).not.toHaveBeenCalled();
      expect(visiblePress).toHaveBeenCalledTimes(1);
    });

    it('presses one control whose test ID is forwarded through nested fibers', async () => {
      const onPress = jest.fn();
      const stateNode = {
        measureInWindow: (callback) => callback(10, 10, 40, 40),
      } as FiberNode['stateNode'];
      const innerTarget = makeFiber({
        testID: 'forwarded-button',
        onPress,
        stateNode,
      });
      const outerTarget = makeFiber({
        testID: 'forwarded-button',
        onPress,
        child: innerTarget,
      });
      innerTarget.return = outerTarget;
      installFiberHook(makeFiber({ child: outerTarget }));

      const result = await bridge().pressTestId('forwarded-button');

      expect(result).toEqual({ ok: true, testId: 'forwarded-button' });
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('does not collapse nested controls with different press handlers', async () => {
      const outerPress = jest.fn();
      const innerPress = jest.fn();
      const innerTarget = makeFiber({
        testID: 'nested-button',
        onPress: innerPress,
      });
      const outerTarget = makeFiber({
        testID: 'nested-button',
        onPress: outerPress,
        child: innerTarget,
      });
      innerTarget.return = outerTarget;
      installFiberHook(makeFiber({ child: outerTarget }));

      const result = await bridge().pressTestId('nested-button');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('duplicate matches');
      expect(outerPress).not.toHaveBeenCalled();
      expect(innerPress).not.toHaveBeenCalled();
    });

    it('does not borrow a visible frame from a duplicate sibling', async () => {
      const unmeasurablePress = jest.fn();
      const visiblePress = jest.fn();
      const unmeasurableTarget = makeFiber({
        testID: 'shared-button',
        onPress: unmeasurablePress,
      });
      const visibleTarget = makeFiber({
        testID: 'shared-button',
        onPress: visiblePress,
        stateNode: {
          measureInWindow: (callback) => callback(10, 10, 40, 40),
        } as FiberNode['stateNode'],
      });
      const root = makeFiber({ child: unmeasurableTarget });
      unmeasurableTarget.return = root;
      unmeasurableTarget.sibling = visibleTarget;
      visibleTarget.return = root;
      installFiberHook(root);

      const result = await bridge().pressTestId('shared-button');

      expect(result).toEqual({ ok: true, testId: 'shared-button' });
      expect(unmeasurablePress).not.toHaveBeenCalled();
      expect(visiblePress).toHaveBeenCalledTimes(1);
    });
  });

  describe('pressText', () => {
    it('presses an enabled component by text', () => {
      const onPress = jest.fn();
      installFiberHook(
        makeFiber({ memoizedProps: { children: 'Place order', onPress } }),
      );

      const result = bridge().pressText('Place order');

      expect(result).toEqual({ ok: true, text: 'Place order' });
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it.each([
      { disabled: true },
      { isDisabled: true },
      { accessibilityState: { disabled: true } },
    ])('does not press text on a disabled component', (disabledProps) => {
      const onPress = jest.fn();
      installFiberHook(
        makeFiber({
          memoizedProps: {
            children: 'Place order',
            onPress,
            ...disabledProps,
          },
        }),
      );

      const result = bridge().pressText('Place order');

      expect(result).toEqual({
        ok: false,
        text: 'Place order',
        error: 'Pressable for text="Place order" is disabled',
      });
      expect(onPress).not.toHaveBeenCalled();
    });

    it('presses active text outside a retained hidden route', () => {
      const hiddenPress = jest.fn();
      const activePress = jest.fn();
      const hiddenTarget = makeFiber({
        memoizedProps: { children: 'Place order', onPress: hiddenPress },
      });
      const hiddenRoute = makeFiber({
        activityState: 0,
        child: hiddenTarget,
      });
      const activeTarget = makeFiber({
        memoizedProps: { children: 'Place order', onPress: activePress },
      });
      const root = makeFiber({ child: hiddenRoute });
      hiddenTarget.return = hiddenRoute;
      hiddenRoute.return = root;
      hiddenRoute.sibling = activeTarget;
      activeTarget.return = root;
      installFiberHook(root);

      const result = bridge().pressText('Place order');

      expect(result).toEqual({ ok: true, text: 'Place order' });
      expect(hiddenPress).not.toHaveBeenCalled();
      expect(activePress).toHaveBeenCalledTimes(1);
    });
  });

  describe('queryUiTarget', () => {
    it('measures the active duplicate outside a retained hidden route', async () => {
      const hiddenTarget = makeFiber({ testID: 'shared-target' });
      const hiddenRoute = makeFiber({
        activityState: 0,
        child: hiddenTarget,
      });
      const activeTarget = makeFiber({
        testID: 'shared-target',
        stateNode: {
          measureInWindow: (callback) => callback(10, 10, 40, 40),
        } as FiberNode['stateNode'],
      });
      const root = makeFiber({ child: hiddenRoute });
      hiddenTarget.return = hiddenRoute;
      hiddenRoute.return = root;
      hiddenRoute.sibling = activeTarget;
      activeTarget.return = root;
      installFiberHook(root);

      const result = await bridge().queryUiTarget({
        testId: 'shared-target',
        visibility: 'viewport',
      });

      expect(result).toMatchObject({
        present: true,
        visible: true,
        rect: { x: 10, y: 10, width: 40, height: 40 },
      });
    });
  });

  describe('scrollView', () => {
    it('scrolls a ScrollView via scrollTo', () => {
      const scrollTo = jest.fn();
      const fiber = makeFiber({
        stateNode: { scrollTo } as FiberNode['stateNode'],
      });
      installFiberHook(fiber);

      const result = bridge().scrollView({ offset: 200 });

      expect(result.ok).toBe(true);
      expect(result.offset).toBe(200);
      expect(scrollTo).toHaveBeenCalledWith({ y: 200, animated: false });
    });

    it('scrolls a FlatList via scrollToOffset', () => {
      const scrollToOffset = jest.fn();
      const fiber = makeFiber({
        stateNode: { scrollToOffset } as FiberNode['stateNode'],
      });
      installFiberHook(fiber);

      const result = bridge().scrollView({
        offset: 500,
        animated: true,
      });

      expect(result.ok).toBe(true);
      expect(scrollToOffset).toHaveBeenCalledWith({
        offset: 500,
        animated: true,
      });
    });

    it('scrolls near a testID anchor', () => {
      const scrollTo = jest.fn();
      const publicInstance = { scrollTo } as FiberNode['stateNode'];
      const scrollChild = makeFiber({
        stateNode: {
          canonical: { publicInstance },
        } as FiberNode['stateNode'],
      });
      const anchor = makeFiber({
        testID: 'my-list',
        child: scrollChild,
      });
      const root = makeFiber({ child: anchor });
      installFiberHook(root);

      const result = bridge().scrollView({
        testId: 'my-list',
        offset: 100,
      });

      expect(result.ok).toBe(true);
      expect(scrollTo).toHaveBeenCalledWith({ y: 100, animated: false });
    });

    it('scrolls the nearest ancestor of a testID anchor', () => {
      const scrollTo = jest.fn();
      const publicInstance = { scrollTo } as FiberNode['stateNode'];
      const anchor = makeFiber({ testID: 'list-row' });
      const scrollParent = makeFiber({
        child: anchor,
        stateNode: {
          canonical: { publicInstance },
        } as FiberNode['stateNode'],
      });
      anchor.return = scrollParent;
      installFiberHook(makeFiber({ child: scrollParent }));

      const result = bridge().scrollView({
        testId: 'list-row',
        offset: 500,
      });

      expect(result.ok).toBe(true);
      expect(scrollTo).toHaveBeenCalledWith({ y: 500, animated: false });
    });

    it('returns error when no scrollable found', () => {
      installFiberHook(makeFiber());

      const result = bridge().scrollView();

      expect(result.ok).toBe(false);
      expect(result.error).toContain('No scrollable');
    });

    it('returns error when testID anchor not found', () => {
      installFiberHook(makeFiber());

      const result = bridge().scrollView({
        testId: 'missing',
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('missing');
    });

    it('uses default offset of 300', () => {
      const scrollTo = jest.fn();
      installFiberHook(
        makeFiber({
          stateNode: { scrollTo } as FiberNode['stateNode'],
        }),
      );

      bridge().scrollView();

      expect(scrollTo).toHaveBeenCalledWith({ y: 300, animated: false });
    });

    it('returns error when hook is not installed', () => {
      globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ = undefined;

      const result = bridge().scrollView();

      expect(result.ok).toBe(false);
    });
  });

  describe('setupWallet', () => {
    beforeEach(() => {
      mockCreateWallet.mockClear();
      mockCreateAccountGroups.mockReset();
      mockCreateAccountGroups.mockResolvedValue([]);
      mockImportAccount.mockClear();
      mockDispatch.mockClear();
      mockIsUnlocked.mockReset();
      mockIsUnlocked.mockReturnValue(true);
      mockSubmitPassword.mockClear();
      (
        Engine.context.AccountTreeController.setAccountGroupName as jest.Mock
      ).mockClear();
      resetMockAccountState();
    });

    it('dispatches all onboarding flags', async () => {
      await bridge().setupWallet({
        password: 'test123',
        accounts: [],
      });
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'PASSWORD_SET' });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SEED_PHRASE_BACKED_UP',
      });
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'LOG_IN' });
    });

    it('returns error on failure', async () => {
      mockCreateWallet.mockRejectedValueOnce(new Error('boom'));
      const result = await bridge().setupWallet({
        password: 'test123',
        accounts: [{ type: 'mnemonic', value: 'words' }],
      });
      expect(result.ok).toBe(false);
      expect(result.error).toBe('boom');
    });

    it('recovers an existing fixture vault when auth leaves the keyring locked', async () => {
      mockIsUnlocked
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValue(true);

      const result = await bridge().applyWalletFixture({
        password: 'test123',
        accounts: [],
      });

      expect(result.ok).toBe(true);
      expect(mockSubmitPassword).toHaveBeenCalledWith('test123');
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'PASSWORD_SET' });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SEED_PHRASE_BACKED_UP',
      });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_COMPLETED_ONBOARDING',
      });
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_EXISTING_USER' });
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'LOG_IN' });
    });

    it('sets metrics opt-in seen before applyWalletFixture unlocks', async () => {
      const StorageWrapper = jest.requireMock('../../store/storage-wrapper');
      const Authentication = jest.requireMock(
        '../../core/Authentication',
      ).default;
      StorageWrapper.setItem.mockClear();
      Authentication.unlockWallet.mockClear();
      mockIsUnlocked.mockReturnValueOnce(false).mockReturnValue(true);

      const result = await bridge().applyWalletFixture({
        password: 'test123',
        accounts: [],
        settings: { metametrics: false },
      });

      expect(result.ok).toBe(true);
      expect(StorageWrapper.setItem).toHaveBeenCalledWith(
        'optin_meta_metrics_ui_seen',
        'true',
      );
      expect(StorageWrapper.setItem.mock.invocationCallOrder[0]).toBeLessThan(
        Authentication.unlockWallet.mock.invocationCallOrder[0],
      );
    });

    it('creates missing fixture HD accounts with a batched account-group range', async () => {
      const mnemonic =
        'test test test test test test test test test test test junk';
      const group0Id = `${FIXTURE_WALLET_ID}/0` as const;
      Engine.context.AccountsController.state.internalAccounts.accounts = {
        a1: mockEvmAccount(
          'a1',
          '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
          'dev1',
        ),
      };
      Engine.context.AccountTreeController.state.accountTree = {
        wallets: {
          [FIXTURE_WALLET_ID]: {
            type: AccountWalletType.Entropy,
            id: FIXTURE_WALLET_ID,
            status: 'ready',
            metadata: { name: 'Fixture Wallet', entropy: { id: 'keyring-1' } },
            groups: {
              [group0Id]: mockEntropyGroup(0, ['a1'], 'dev1'),
            },
          },
        },
      };
      mockCreateAccountGroups.mockImplementationOnce(async () => {
        Engine.context.AccountsController.state.internalAccounts.accounts = {
          ...Engine.context.AccountsController.state.internalAccounts.accounts,
          a2: mockEvmAccount(
            'a2',
            '0x0000000000000000000000000000000000000002',
            'dev2',
          ),
          a3: mockEvmAccount(
            'a3',
            '0x0000000000000000000000000000000000000003',
            'dev3',
          ),
        };
        const wallet = Engine.context.AccountTreeController.state.accountTree
          .wallets[FIXTURE_WALLET_ID] as {
          groups: Record<string, unknown>;
        };
        wallet.groups[`${FIXTURE_WALLET_ID}/1`] = mockEntropyGroup(
          1,
          ['a2'],
          'dev2',
        );
        wallet.groups[`${FIXTURE_WALLET_ID}/2`] = mockEntropyGroup(
          2,
          ['a3'],
          'dev3',
        );
        return [];
      });

      const result = await bridge().setupWallet({
        password: 'test123',
        accounts: [
          {
            type: 'mnemonic',
            value: mnemonic,
            count: 3,
            names: ['dev1', 'dev2', 'dev3'],
          },
        ],
      });

      expect(result.ok).toBe(true);
      expect(mockCreateAccountGroups).toHaveBeenCalledWith({
        fromGroupIndex: 1,
        toGroupIndex: 2,
        entropySource: 'keyring-1',
      });
      expect(
        Engine.context.AccountTreeController.setAccountGroupName,
      ).toHaveBeenCalledWith(`${FIXTURE_WALLET_ID}/2`, 'dev3');
    });

    it('opts out of metametrics when specified', async () => {
      const { analytics } = jest.requireMock('../../util/analytics/analytics');
      await bridge().setupWallet({
        password: 'test123',
        accounts: [],
        settings: { metametrics: false },
      });
      expect(analytics.optOut).toHaveBeenCalled();
    });

    it('opts in to metametrics when specified', async () => {
      const { analytics } = jest.requireMock('../../util/analytics/analytics');
      await bridge().setupWallet({
        password: 'test123',
        accounts: [],
        settings: { metametrics: true },
      });
      expect(analytics.optIn).toHaveBeenCalled();
    });

    it('does not suppress GTM modals when skipGtmModals is undefined', async () => {
      const StorageWrapper = jest.requireMock('../../store/storage-wrapper');
      StorageWrapper.setItem.mockClear();
      await bridge().setupWallet({
        password: 'test123',
        accounts: [],
      });
      expect(StorageWrapper.setItem).not.toHaveBeenCalled();
    });

    it('suppresses GTM modals when skipGtmModals is true', async () => {
      const StorageWrapper = jest.requireMock('../../store/storage-wrapper');
      StorageWrapper.setItem.mockClear();
      await bridge().setupWallet({
        password: 'test123',
        accounts: [],
        settings: { skipGtmModals: true },
      });
      expect(StorageWrapper.setItem).toHaveBeenCalledWith('perps_gtm', 'true');
      expect(StorageWrapper.setItem).toHaveBeenCalledWith(
        'rewards_gtm',
        'true',
      );
    });

    it('calls markTutorialCompleted when skipPerpsTutorial is true', async () => {
      const mockMarkTutorial = MockEngine.context.PerpsController
        .markTutorialCompleted as jest.Mock;
      mockMarkTutorial.mockClear();
      await bridge().setupWallet({
        password: 'test123',
        accounts: [],
        settings: { skipPerpsTutorial: true },
      });
      expect(mockMarkTutorial).toHaveBeenCalledTimes(1);
    });

    it('does not call markTutorialCompleted when skipPerpsTutorial is undefined', async () => {
      const mockMarkTutorial = MockEngine.context.PerpsController
        .markTutorialCompleted as jest.Mock;
      mockMarkTutorial.mockClear();
      await bridge().setupWallet({
        password: 'test123',
        accounts: [],
      });
      expect(mockMarkTutorial).not.toHaveBeenCalled();
    });

    it('dispatches setLockTime(-1) when autoLockNever is true', async () => {
      mockDispatch.mockClear();
      await bridge().setupWallet({
        password: 'test123',
        accounts: [],
        settings: { autoLockNever: true },
      });
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'SET_LOCK_TIME', lockTime: -1 }),
      );
    });

    it('does not dispatch setLockTime when autoLockNever is not set', async () => {
      mockDispatch.mockClear();
      await bridge().setupWallet({
        password: 'test123',
        accounts: [],
      });
      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'SET_LOCK_TIME' }),
      );
    });

    it('dispatches setOsAuthEnabled(true) on Android when deviceAuthEnabled is true', async () => {
      mockDispatch.mockClear();
      const originalOS = Platform.OS;
      Platform.OS = 'android';
      try {
        await bridge().setupWallet({
          password: 'test123',
          accounts: [],
          settings: { deviceAuthEnabled: true },
        });
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'SET_OS_AUTH_ENABLED',
            enabled: true,
          }),
        );
      } finally {
        Platform.OS = originalOS;
      }
    });

    it('does not dispatch setOsAuthEnabled on iOS even when deviceAuthEnabled is true', async () => {
      mockDispatch.mockClear();
      const originalOS = Platform.OS;
      Platform.OS = 'ios';
      try {
        await bridge().setupWallet({
          password: 'test123',
          accounts: [],
          settings: { deviceAuthEnabled: true },
        });
        expect(mockDispatch).not.toHaveBeenCalledWith(
          expect.objectContaining({ type: 'SET_OS_AUTH_ENABLED' }),
        );
      } finally {
        Platform.OS = originalOS;
      }
    });

    it('does not dispatch setOsAuthEnabled when deviceAuthEnabled is not set', async () => {
      mockDispatch.mockClear();
      await bridge().setupWallet({
        password: 'test123',
        accounts: [],
      });
      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'SET_OS_AUTH_ENABLED' }),
      );
    });

    it('sets OPTIN_META_METRICS_UI_SEEN when metametrics is defined', async () => {
      const StorageWrapper = jest.requireMock('../../store/storage-wrapper');
      StorageWrapper.setItem.mockClear();
      await bridge().setupWallet({
        password: 'test123',
        accounts: [],
        settings: { metametrics: true },
      });
      expect(StorageWrapper.setItem).toHaveBeenCalledWith(
        'optin_meta_metrics_ui_seen',
        'true',
      );
    });

    it('resets to wallet home through the raw navigation ref before returning', async () => {
      const result = await bridge().setupWallet({
        password: 'test123',
        accounts: [],
      });

      expect(result.ok).toBe(true);
      expect(mockNavRef.reset).toHaveBeenCalledWith({
        routes: [{ name: 'HomeNav' }],
      });
    });

    it('does not set OPTIN_META_METRICS_UI_SEEN when metametrics is undefined', async () => {
      const StorageWrapper = jest.requireMock('../../store/storage-wrapper');
      StorageWrapper.setItem.mockClear();
      await bridge().setupWallet({
        password: 'test123',
        accounts: [],
      });
      expect(StorageWrapper.setItem).not.toHaveBeenCalledWith(
        'optin_meta_metrics_ui_seen',
        'true',
      );
    });

    it('always dispatches setMultichainAccountsIntroModalSeen', async () => {
      mockDispatch.mockClear();
      await bridge().setupWallet({
        password: 'test123',
        accounts: [],
      });
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SET_MULTICHAIN_ACCOUNTS_INTRO_MODAL_SEEN',
          payload: { seen: true },
        }),
      );
    });
  });
});
