import type { IPlatformDriver } from '@metamask/client-mcp-core';
import { MetaMaskMobileStateSnapshotCapability } from '../capabilities/state-snapshot';

jest.mock('@metamask/client-mcp-core', () => ({}));

type MockPlatformDriver = Pick<IPlatformDriver, 'getAppState' | 'getTestIds'>;
type TestIdItem = Awaited<ReturnType<IPlatformDriver['getTestIds']>>[number];

const createTestIdItem = (testId: string): TestIdItem => ({
  testId,
  tag: 'View',
  visible: true,
});

describe('MetaMaskMobileStateSnapshotCapability', () => {
  let stateSnapshotCapability: MetaMaskMobileStateSnapshotCapability;
  let mockPlatformDriver: jest.Mocked<MockPlatformDriver>;
  let getPlatformDriverMock: jest.MockedFunction<
    () => IPlatformDriver | undefined
  >;

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
    } as unknown as jest.Mocked<MockPlatformDriver>;
    getPlatformDriverMock = jest.fn(
      () => mockPlatformDriver as unknown as IPlatformDriver,
    );
    stateSnapshotCapability = new MetaMaskMobileStateSnapshotCapability({
      getPlatformDriver: getPlatformDriverMock,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getState', () => {
    it('returns app state with current screen', async () => {
      mockPlatformDriver.getTestIds.mockResolvedValue([
        createTestIdItem('wallet-screen'),
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
      getPlatformDriverMock.mockReturnValue(undefined);

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
      mockPlatformDriver.getTestIds.mockResolvedValue([
        createTestIdItem('login'),
      ]);

      const result = await stateSnapshotCapability.detectCurrentScreen(
        undefined as never,
      );

      expect(result).toBe('unlock');
    });

    it('detects unlock screen from login-with-biometric-switch', async () => {
      mockPlatformDriver.getTestIds.mockResolvedValue([
        createTestIdItem('login-with-biometric-switch'),
      ]);

      const result = await stateSnapshotCapability.detectCurrentScreen(
        undefined as never,
      );

      expect(result).toBe('unlock');
    });

    it('detects onboarding-welcome screen from onboarding-screen', async () => {
      mockPlatformDriver.getTestIds.mockResolvedValue([
        createTestIdItem('onboarding-screen'),
      ]);

      const result = await stateSnapshotCapability.detectCurrentScreen(
        undefined as never,
      );

      expect(result).toBe('onboarding-welcome');
    });

    it('detects onboarding-welcome screen from create wallet button', async () => {
      mockPlatformDriver.getTestIds.mockResolvedValue([
        createTestIdItem('wallet-setup-screen-create-new-wallet-button-id'),
      ]);

      const result = await stateSnapshotCapability.detectCurrentScreen(
        undefined as never,
      );

      expect(result).toBe('onboarding-welcome');
    });

    it('detects home screen from wallet-screen testId', async () => {
      mockPlatformDriver.getTestIds.mockResolvedValue([
        createTestIdItem('wallet-screen'),
      ]);

      const result = await stateSnapshotCapability.detectCurrentScreen(
        undefined as never,
      );

      expect(result).toBe('home');
    });

    it('detects home screen from tab bar wallet testId', async () => {
      mockPlatformDriver.getTestIds.mockResolvedValue([
        createTestIdItem('tab-bar-item-Wallet'),
      ]);

      const result = await stateSnapshotCapability.detectCurrentScreen(
        undefined as never,
      );

      expect(result).toBe('home');
    });

    it('detects settings screen', async () => {
      mockPlatformDriver.getTestIds.mockResolvedValue([
        createTestIdItem('settings-scroll'),
      ]);

      const result = await stateSnapshotCapability.detectCurrentScreen(
        undefined as never,
      );

      expect(result).toBe('settings');
    });

    it('returns unknown when no matching testIds found', async () => {
      mockPlatformDriver.getTestIds.mockResolvedValue([
        createTestIdItem('unknown-screen'),
      ]);

      const result = await stateSnapshotCapability.detectCurrentScreen(
        undefined as never,
      );

      expect(result).toBe('unknown');
    });

    it('returns unknown when platform driver not available', async () => {
      getPlatformDriverMock.mockReturnValue(undefined);

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
        createTestIdItem('unknown-id'),
        createTestIdItem('wallet-screen'),
        createTestIdItem('settings-scroll'),
      ]);

      const result = await stateSnapshotCapability.detectCurrentScreen(
        undefined as never,
      );

      expect(result).toBe('home');
    });
  });
});
