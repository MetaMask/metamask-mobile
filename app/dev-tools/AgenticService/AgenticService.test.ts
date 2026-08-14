import AgenticService, {
  walkFiber,
  findFiberByTestId,
  walkFiberRoots,
  tryScroll,
  toAccountSummary,
  getFixtureMnemonicCount,
  getFixtureAccountNames,
  type FiberNode,
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
  } = {},
): FiberNode {
  const { testID, onPress, ...rest } = overrides;
  return {
    child: null,
    sibling: null,
    return: null,
    memoizedProps: testID || onPress ? { testID, onPress } : null,
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

  describe('pressTestId', () => {
    it('presses a component found by testID', () => {
      const onPress = jest.fn();
      const fiber = makeFiber({
        child: makeFiber({ testID: 'my-btn', onPress }),
      });
      installFiberHook(fiber);

      const result = bridge().pressTestId('my-btn');

      expect(result).toEqual({ ok: true, testId: 'my-btn' });
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('returns error when testID not found', () => {
      installFiberHook(makeFiber());

      const result = bridge().pressTestId('missing');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('missing');
    });

    it('returns error when hook is not installed', () => {
      globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ = undefined;

      const result = bridge().pressTestId('any');

      expect(result.ok).toBe(false);
    });

    it('returns error when component has no onPress', () => {
      const fiber = makeFiber({
        child: makeFiber({ testID: 'no-press' }),
      });
      installFiberHook(fiber);

      const result = bridge().pressTestId('no-press');

      expect(result.ok).toBe(false);
      expect(result.error).toContain('no-press');
    });

    it('handles deeply nested components', () => {
      const onPress = jest.fn();
      const deep = makeFiber({ testID: 'deep', onPress });
      const mid = makeFiber({ child: deep });
      const root = makeFiber({ child: mid });
      installFiberHook(root);

      const result = bridge().pressTestId('deep');

      expect(result).toEqual({ ok: true, testId: 'deep' });
      expect(onPress).toHaveBeenCalled();
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
      const scrollChild = makeFiber({
        stateNode: { scrollTo } as FiberNode['stateNode'],
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
