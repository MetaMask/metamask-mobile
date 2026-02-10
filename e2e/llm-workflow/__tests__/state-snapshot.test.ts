import { MetaMaskMobileStateSnapshotCapability } from '../capabilities/state-snapshot';
import { getPlatformDriver } from '@metamask/client-mcp-core';

jest.mock('@metamask/client-mcp-core', () => ({
  getPlatformDriver: jest.fn(),
}));

const mockGetPlatformDriver = getPlatformDriver as jest.MockedFunction<
  typeof getPlatformDriver
>;

describe('MetaMaskMobileStateSnapshotCapability', () => {
  let stateSnapshotCapability: MetaMaskMobileStateSnapshotCapability;
  let mockPlatformDriver: {
    getAppState: jest.Mock;
    getTestIds: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockPlatformDriver = {
      getAppState: jest.fn().mockResolvedValue({
        isLoaded: true,
        currentUrl: '',
        extensionId: '',
        isUnlocked: true,
        accountAddress: '0x123',
        networkName: 'Ethereum Mainnet',
        chainId: '1',
        balance: '1.5',
      }),
      getTestIds: jest.fn().mockResolvedValue([]),
    };

    mockGetPlatformDriver.mockReturnValue(mockPlatformDriver as never);

    stateSnapshotCapability = new MetaMaskMobileStateSnapshotCapability();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getState', () => {
    it('returns app state with current screen', async () => {
      mockPlatformDriver.getTestIds.mockResolvedValue([
        { testId: 'wallet-screen' },
      ]);

      const result = await stateSnapshotCapability.getState(
        undefined as never,
        {} as never,
      );

      expect(result).toEqual({
        isLoaded: true,
        currentUrl: '',
        extensionId: '',
        isUnlocked: true,
        accountAddress: '0x123',
        networkName: 'Ethereum Mainnet',
        chainId: '1',
        balance: '1.5',
        currentScreen: 'home',
      });
    });

    it('returns default state when platform driver not available', async () => {
      mockGetPlatformDriver.mockReturnValue(undefined);

      const result = await stateSnapshotCapability.getState(
        undefined as never,
        {} as never,
      );

      expect(result).toEqual({
        isLoaded: false,
        currentUrl: '',
        extensionId: '',
        isUnlocked: false,
        currentScreen: 'unknown',
        accountAddress: null,
        networkName: null,
        chainId: null,
        balance: null,
      });
    });
  });

  describe('detectCurrentScreen', () => {
    it('detects unlock screen from login testId', async () => {
      mockPlatformDriver.getTestIds.mockResolvedValue([{ testId: 'login' }]);

      const result = await stateSnapshotCapability.detectCurrentScreen(
        undefined as never,
      );

      expect(result).toBe('unlock');
    });

    it('detects unlock screen from login-with-biometric-switch', async () => {
      mockPlatformDriver.getTestIds.mockResolvedValue([
        { testId: 'login-with-biometric-switch' },
      ]);

      const result = await stateSnapshotCapability.detectCurrentScreen(
        undefined as never,
      );

      expect(result).toBe('unlock');
    });

    it('detects onboarding-welcome screen', async () => {
      mockPlatformDriver.getTestIds.mockResolvedValue([
        { testId: 'onboarding-screen' },
      ]);

      const result = await stateSnapshotCapability.detectCurrentScreen(
        undefined as never,
      );

      expect(result).toBe('onboarding-welcome');
    });

    it('detects home screen from wallet-screen testId', async () => {
      mockPlatformDriver.getTestIds.mockResolvedValue([
        { testId: 'wallet-screen' },
      ]);

      const result = await stateSnapshotCapability.detectCurrentScreen(
        undefined as never,
      );

      expect(result).toBe('home');
    });

    it('detects settings screen', async () => {
      mockPlatformDriver.getTestIds.mockResolvedValue([
        { testId: 'settings-scroll' },
      ]);

      const result = await stateSnapshotCapability.detectCurrentScreen(
        undefined as never,
      );

      expect(result).toBe('settings');
    });

    it('returns unknown when no matching testIds found', async () => {
      mockPlatformDriver.getTestIds.mockResolvedValue([
        { testId: 'unknown-screen' },
      ]);

      const result = await stateSnapshotCapability.detectCurrentScreen(
        undefined as never,
      );

      expect(result).toBe('unknown');
    });

    it('returns unknown when platform driver not available', async () => {
      mockGetPlatformDriver.mockReturnValue(undefined);

      const result = await stateSnapshotCapability.detectCurrentScreen(
        undefined as never,
      );

      expect(result).toBe('unknown');
    });

    it('returns unknown when getTestIds throws error', async () => {
      mockPlatformDriver.getTestIds.mockRejectedValue(
        new Error('Failed to get testIds'),
      );

      const result = await stateSnapshotCapability.detectCurrentScreen(
        undefined as never,
      );

      expect(result).toBe('unknown');
    });

    it('detects first matching screen when multiple testIds present', async () => {
      mockPlatformDriver.getTestIds.mockResolvedValue([
        { testId: 'unknown-id' },
        { testId: 'wallet-screen' },
        { testId: 'settings-scroll' },
      ]);

      const result = await stateSnapshotCapability.detectCurrentScreen(
        undefined as never,
      );

      expect(result).toBe('home');
    });
  });
});
