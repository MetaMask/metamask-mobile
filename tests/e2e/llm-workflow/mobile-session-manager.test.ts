import { MobileSessionManager } from './mobile-session-manager';

const mockOpenApp = jest.fn().mockResolvedValue(undefined);
const mockCloseApp = jest.fn().mockResolvedValue(undefined);
const mockGetAppState = jest.fn().mockResolvedValue({
  isLoaded: true,
  currentUrl: '',
  extensionId: 'io.metamask',
  isUnlocked: true,
  currentScreen: 'unknown',
  accountAddress: null,
  networkName: null,
  chainId: null,
  balance: null,
});
const mockScreenshot = jest.fn().mockResolvedValue({
  path: '/tmp/screenshot.png',
  base64: '',
  width: 0,
  height: 0,
});

jest.mock('@metamask/device-mcp', () => ({
  createLazyBackend: jest.fn(() => ({
    openApp: mockOpenApp,
    closeApp: mockCloseApp,
    platform: 'ios',
  })),
}));

jest.mock('@metamask/client-mcp-core', () => ({
  MobilePlatformDriver: jest.fn().mockImplementation(() => ({
    getAppState: mockGetAppState,
    screenshot: mockScreenshot,
    getPlatform: jest.fn().mockReturnValue('ios'),
  })),
  generateSessionId: jest.fn().mockReturnValue('mm-mobile-test-123'),
  ErrorCodes: {
    MM_SESSION_ALREADY_RUNNING: 'MM_SESSION_ALREADY_RUNNING',
    MM_INVALID_INPUT: 'MM_INVALID_INPUT',
    MM_NO_ACTIVE_SESSION: 'MM_NO_ACTIVE_SESSION',
    MM_CONTEXT_SWITCH_BLOCKED: 'MM_CONTEXT_SWITCH_BLOCKED',
  },
}));

describe('MobileSessionManager', () => {
  let manager: MobileSessionManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new MobileSessionManager();
  });

  describe('initial state', () => {
    it('has no active session', () => {
      expect(manager.hasActiveSession()).toBe(false);
    });

    it('returns undefined session id', () => {
      expect(manager.getSessionId()).toBeUndefined();
    });

    it('returns undefined session state', () => {
      expect(manager.getSessionState()).toBeUndefined();
    });

    it('returns undefined session metadata', () => {
      expect(manager.getSessionMetadata()).toBeUndefined();
    });

    it('returns empty refMap', () => {
      expect(manager.getRefMap().size).toBe(0);
    });
  });

  describe('launch', () => {
    it('creates session with default ios platform', async () => {
      const result = await manager.launch({ goal: 'test flow' });

      expect(result.sessionId).toBe('mm-mobile-test-123');
      expect(result.extensionId).toBe('io.metamask');
      expect(result.state.isLoaded).toBe(true);
      expect(manager.hasActiveSession()).toBe(true);
      expect(mockOpenApp).toHaveBeenCalledWith('io.metamask');
    });

    it('creates session with android platform', async () => {
      const result = await manager.launch({ platform: 'android' });

      expect(result.sessionId).toBe('mm-mobile-test-123');
      expect(mockOpenApp).toHaveBeenCalledWith('io.metamask');
    });

    it('uses custom bundle id', async () => {
      const custom = new MobileSessionManager('io.metamask.debug');
      await custom.launch({});

      expect(mockOpenApp).toHaveBeenCalledWith('io.metamask.debug');
    });

    it('rejects browser platform', async () => {
      await expect(manager.launch({ platform: 'browser' })).rejects.toThrow(
        'MobileSessionManager does not support browser platform',
      );
    });

    it('throws if session already active', async () => {
      await manager.launch({});

      await expect(manager.launch({})).rejects.toThrow(
        'Session already active',
      );
    });

    it('populates session state', async () => {
      await manager.launch({ goal: 'verify UI', flowTags: ['smoke'] });

      const state = manager.getSessionState();
      expect(state).toBeDefined();
      expect(state?.sessionId).toBe('mm-mobile-test-123');
      expect(state?.stateMode).toBe('default');
      expect(state?.ports).toEqual({ anvil: 0, fixtureServer: 0 });
    });

    it('populates session metadata', async () => {
      await manager.launch({
        goal: 'verify UI',
        flowTags: ['smoke'],
        tags: ['p1'],
      });

      const metadata = manager.getSessionMetadata();
      expect(metadata).toBeDefined();
      expect(metadata?.goal).toBe('verify UI');
      expect(metadata?.flowTags).toEqual(['smoke']);
      expect(metadata?.tags).toEqual(['p1']);
      expect(metadata?.schemaVersion).toBe(1);
    });
  });

  describe('cleanup', () => {
    it('returns false if no session', async () => {
      expect(await manager.cleanup()).toBe(false);
    });

    it('closes app and clears state', async () => {
      await manager.launch({});
      expect(manager.hasActiveSession()).toBe(true);

      const result = await manager.cleanup();

      expect(result).toBe(true);
      expect(mockCloseApp).toHaveBeenCalledWith('io.metamask');
      expect(manager.hasActiveSession()).toBe(false);
      expect(manager.getSessionId()).toBeUndefined();
      expect(manager.getSessionState()).toBeUndefined();
      expect(manager.getSessionMetadata()).toBeUndefined();
    });

    it('clears refMap on cleanup', async () => {
      await manager.launch({});
      manager.setRefMap(new Map([['e1', 'identifier:btn']]));
      expect(manager.getRefMap().size).toBe(1);

      await manager.cleanup();

      expect(manager.getRefMap().size).toBe(0);
    });
  });

  describe('getExtensionState', () => {
    it('returns app state from driver', async () => {
      await manager.launch({});

      const state = await manager.getExtensionState();

      expect(state.isLoaded).toBe(true);
      expect(state.currentUrl).toBe('');
      expect(mockGetAppState).toHaveBeenCalled();
    });

    it('throws if no session', async () => {
      await expect(manager.getExtensionState()).rejects.toThrow(
        'No active session',
      );
    });
  });

  describe('screenshot', () => {
    it('delegates to platform driver', async () => {
      await manager.launch({});

      await manager.screenshot({ name: 'test-shot' });

      expect(mockScreenshot).toHaveBeenCalledWith({
        name: 'test-shot',
        fullPage: undefined,
        selector: undefined,
      });
    });

    it('throws if no session', async () => {
      await expect(manager.screenshot({ name: 'test' })).rejects.toThrow(
        'No active session',
      );
    });
  });

  describe('refMap', () => {
    it('set and get refMap', () => {
      const map = new Map([
        ['e1', 'identifier:send-button'],
        ['e2', 'label:Settings'],
      ]);
      manager.setRefMap(map);

      expect(manager.getRefMap()).toBe(map);
      expect(manager.resolveA11yRef('e1')).toBe('identifier:send-button');
      expect(manager.resolveA11yRef('e99')).toBeUndefined();
    });

    it('clearRefMap empties the map', () => {
      manager.setRefMap(new Map([['e1', 'test']]));
      manager.clearRefMap();

      expect(manager.getRefMap().size).toBe(0);
    });
  });

  describe('browser-only methods throw', () => {
    it('getPage throws', () => {
      expect(() => manager.getPage()).toThrow('not supported on mobile');
    });

    it('setActivePage throws', () => {
      expect(() => manager.setActivePage({} as never)).toThrow(
        'not supported on mobile',
      );
    });

    it('getContext throws', () => {
      expect(() => manager.getContext()).toThrow('not supported on mobile');
    });

    it('navigateToHome throws', async () => {
      await expect(manager.navigateToHome()).rejects.toThrow(
        'not supported on mobile',
      );
    });

    it('navigateToSettings throws', async () => {
      await expect(manager.navigateToSettings()).rejects.toThrow(
        'not supported on mobile',
      );
    });

    it('navigateToUrl throws', async () => {
      await expect(
        manager.navigateToUrl('https://example.com'),
      ).rejects.toThrow('not supported on mobile');
    });

    it('navigateToNotification throws', async () => {
      await expect(manager.navigateToNotification()).rejects.toThrow(
        'not supported on mobile',
      );
    });

    it('waitForNotificationPage throws', async () => {
      await expect(manager.waitForNotificationPage(5000)).rejects.toThrow(
        'not supported on mobile',
      );
    });
  });

  describe('getTrackedPages returns empty', () => {
    it('returns empty array', () => {
      expect(manager.getTrackedPages()).toEqual([]);
    });
  });

  describe('classifyPageRole returns other', () => {
    it('returns other for any page', () => {
      expect(manager.classifyPageRole({} as never)).toBe('other');
    });
  });

  describe('capabilities return undefined', () => {
    it('getBuildCapability returns undefined', () => {
      expect(manager.getBuildCapability()).toBeUndefined();
    });

    it('getFixtureCapability returns undefined', () => {
      expect(manager.getFixtureCapability()).toBeUndefined();
    });

    it('getChainCapability returns undefined', () => {
      expect(manager.getChainCapability()).toBeUndefined();
    });

    it('getContractSeedingCapability returns undefined', () => {
      expect(manager.getContractSeedingCapability()).toBeUndefined();
    });

    it('getStateSnapshotCapability returns undefined', () => {
      expect(manager.getStateSnapshotCapability()).toBeUndefined();
    });
  });

  describe('environment configuration', () => {
    it('defaults to e2e mode', () => {
      expect(manager.getEnvironmentMode()).toBe('e2e');
    });

    it('setContext throws when session is active', async () => {
      await manager.launch({});

      expect(() => manager.setContext('prod')).toThrow(
        'Cannot switch context while session is active',
      );
    });

    it('setContext does not throw when no session', () => {
      expect(() => manager.setContext('prod')).not.toThrow();
    });

    it('getContextInfo reflects session state', async () => {
      const infoBeforeLaunch = manager.getContextInfo();
      expect(infoBeforeLaunch.hasActiveSession).toBe(false);
      expect(infoBeforeLaunch.sessionId).toBeNull();
      expect(infoBeforeLaunch.canSwitchContext).toBe(true);

      await manager.launch({});

      const infoAfterLaunch = manager.getContextInfo();
      expect(infoAfterLaunch.hasActiveSession).toBe(true);
      expect(infoAfterLaunch.sessionId).toBe('mm-mobile-test-123');
      expect(infoAfterLaunch.canSwitchContext).toBe(false);
    });
  });

  describe('platform driver', () => {
    it('returns undefined before launch', () => {
      expect(manager.getPlatformDriver()).toBeUndefined();
    });

    it('returns driver after launch', async () => {
      await manager.launch({});

      const platformDriver = manager.getPlatformDriver();
      expect(platformDriver).toBeDefined();
      expect(platformDriver?.getPlatform()).toBe('ios');
    });

    it('returns undefined after cleanup', async () => {
      await manager.launch({});
      await manager.cleanup();

      expect(manager.getPlatformDriver()).toBeUndefined();
    });
  });
});
