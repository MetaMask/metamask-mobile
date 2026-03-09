import AgenticService, {
  walkFiber,
  findFiberByTestId,
  walkFiberRoots,
  type FiberNode,
  type ReactDevToolsHook,
} from './AgenticService';
import Engine from '../Engine';
import type { NavigationContainerRef } from '@react-navigation/native';

jest.mock('../Engine', () => ({
  context: {
    AccountsController: {
      listAccounts: jest.fn(() => []),
      getSelectedAccount: jest.fn(() => ({
        id: 'acc-1',
        address: '0xabc',
        metadata: { name: 'Account 1' },
      })),
    },
  },
  setSelectedAddress: jest.fn(),
}));

jest.mock('../redux', () => ({
  store: {},
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

// ─── AgenticService.install / __AGENTIC__ bridge tests ──────────────────────

describe('AgenticService.install', () => {
  let mockNavRef: NavigationContainerRef;
  let mockDeferredNav: NavigationContainerRef;
  let savedHook: ReactDevToolsHook | undefined;

  beforeEach(() => {
    jest.clearAllMocks();

    mockNavRef = {
      navigate: jest.fn(),
      reset: jest.fn(),
      goBack: jest.fn(),
      dispatch: jest.fn(),
      getCurrentRoute: jest.fn(() => ({ name: 'Wallet', key: 'w-1' })),
      dangerouslyGetState: jest.fn(() => ({})),
      canGoBack: jest.fn(() => true),
    } as unknown as NavigationContainerRef;

    mockDeferredNav = {
      navigate: jest.fn(),
      goBack: jest.fn(),
    } as unknown as NavigationContainerRef;

    savedHook = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;

    AgenticService.install(mockNavRef, mockDeferredNav);
  });

  afterEach(() => {
    globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ = savedHook;
    globalThis.__AGENTIC__ = undefined;
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
});
