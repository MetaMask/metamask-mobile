import NavigationService from '../NavigationService';
import DeeplinkManager from './DeeplinkManager';
import handleBrowserUrl from './Handlers/handleBrowserUrl';
import handleEthereumUrl from './Handlers/handleEthereumUrl';
import handleRampUrl from './Handlers/handleRampUrl';
import switchNetwork from './Handlers/switchNetwork';
import parseDeeplink from './ParseManager/parseDeeplink';
import approveTransaction from './TransactionManager/approveTransaction';
import { RampType } from '../../reducers/fiatOrders/types';
import { handleSwapUrl } from './Handlers/handleSwapUrl';
import { handleCreateAccountUrl } from './Handlers/handleCreateAccountUrl';
import { handlePerpsUrl, handlePerpsAssetUrl } from './Handlers/handlePerpsUrl';
import Routes from '../../constants/navigation/Routes';
import branch from 'react-native-branch';
import { Linking } from 'react-native';
import { handleDeeplink } from './Handlers/handleDeeplink';
import Logger from '../../util/Logger';
import { handleOpenHome } from './Handlers/handleOpenHome';

jest.mock('./TransactionManager/approveTransaction');
jest.mock('./Handlers/handleEthereumUrl');
jest.mock('./Handlers/handleBrowserUrl');
jest.mock('./Handlers/handleRampUrl');
jest.mock('./ParseManager/parseDeeplink');
jest.mock('./Handlers/switchNetwork');
jest.mock('./Handlers/handleSwapUrl');
jest.mock('./Handlers/handleCreateAccountUrl');
jest.mock('./Handlers/handlePerpsUrl');
jest.mock('./Handlers/handleDeeplink');
jest.mock('../../util/Logger');
jest.mock('../NavigationService', () => ({
  navigation: {
    navigate: jest.fn(),
  },
}));

jest.mock('react-native-branch', () => ({
  subscribe: jest.fn(),
  getLatestReferringParams: jest.fn(),
}));

describe('DeeplinkManager', () => {
  const mockNavigation = NavigationService.navigation.navigate as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should set, get, and expire a deeplink correctly', () => {
    const testUrl = 'https://example.com';
    DeeplinkManager.setDeeplink(testUrl);
    expect(DeeplinkManager.getPendingDeeplink()).toBe(testUrl);

    DeeplinkManager.expireDeeplink();
    expect(DeeplinkManager.getPendingDeeplink()).toBeNull();
  });

  it('should parse deeplinks correctly', async () => {
    const url = 'http://example.com';
    const browserCallBack = jest.fn();
    const origin = 'testOrigin';
    const onHandled = jest.fn();

    await DeeplinkManager.parse(url, {
      browserCallBack,
      origin,
      onHandled,
    });

    expect(parseDeeplink).toHaveBeenCalledWith({
      url,
      origin,
      browserCallBack,
      onHandled,
    });
  });

  // Tests for standalone handler functions
  it('should handle network switch correctly', () => {
    const chainId = '1';
    switchNetwork({ switchToChainId: chainId });
    expect(switchNetwork).toHaveBeenCalledWith({
      switchToChainId: chainId,
    });
  });

  it('should handle transaction approval correctly', async () => {
    const ethUrl = {
      parameters: {},
      target_address: '0x...',
      chain_id: '1',
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const origin = 'testOrigin';

    await approveTransaction({
      ethUrl,
      origin,
    });

    expect(approveTransaction).toHaveBeenCalledWith({
      ethUrl,
      origin,
    });
  });

  it('should handle Ethereum URL correctly', async () => {
    const url = 'ethereum://example.com';
    const origin = 'testOrigin';

    await handleEthereumUrl({
      url,
      origin,
    });

    expect(handleEthereumUrl).toHaveBeenCalledWith({
      url,
      origin,
    });
  });

  it('should handle browser URL correctly', () => {
    const url = 'http://example.com';
    const callback = jest.fn();

    handleBrowserUrl({
      url,
      callback,
    });

    expect(handleBrowserUrl).toHaveBeenCalledWith({
      url,
      callback,
    });
  });

  it('should handle buy crypto action correctly', () => {
    const rampPath = '/example/path?and=params';
    handleRampUrl({
      rampPath,
      rampType: RampType.BUY,
    });
    expect(handleRampUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        rampPath,
        rampType: RampType.BUY,
      }),
    );
  });

  it('should handle sell crypto action correctly', () => {
    const rampPath = '/example/path?and=params';
    handleRampUrl({
      rampPath,
      rampType: RampType.SELL,
    });
    expect(handleRampUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        rampPath,
        rampType: RampType.SELL,
      }),
    );
  });

  describe('Branch deeplink handling', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should initialize Linking listeners when start() is called', () => {
      const mockLinking = jest.mocked(Linking);
      mockLinking.getInitialURL = jest.fn().mockResolvedValue(null);
      mockLinking.addEventListener = jest.fn();

      DeeplinkManager.start();

      expect(mockLinking.getInitialURL).toHaveBeenCalled();
      expect(mockLinking.addEventListener).toHaveBeenCalledWith(
        'url',
        expect.any(Function),
      );
    });

    it('should subscribe to Branch deeplink events when start() is called', () => {
      (branch.getLatestReferringParams as jest.Mock).mockResolvedValue({});

      DeeplinkManager.start();

      expect(branch.subscribe).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should call getLatestReferringParams when branch subscription callback is triggered', async () => {
      (branch.getLatestReferringParams as jest.Mock).mockResolvedValue({});

      DeeplinkManager.start();

      // Trigger the branch subscription callback
      const subscribeCallback = (branch.subscribe as jest.Mock).mock
        .calls[0][0];
      await subscribeCallback({ error: null });

      expect(branch.getLatestReferringParams).toHaveBeenCalled();
    });

    it('should process cold start deeplink when non-branch link is found', async () => {
      const mockDeeplink = 'https://link.metamask.io/home';
      (branch.getLatestReferringParams as jest.Mock).mockResolvedValue({
        '+non_branch_link': mockDeeplink,
      });

      DeeplinkManager.start();

      // Trigger the branch subscription callback
      const subscribeCallback = (branch.subscribe as jest.Mock).mock
        .calls[0][0];
      await subscribeCallback({ error: null });

      expect(branch.getLatestReferringParams).toHaveBeenCalled();
      expect(handleDeeplink).toHaveBeenCalledWith({ uri: mockDeeplink });
    });

    it('should process deeplink from subscription callback when uri is provided', async () => {
      const mockUri = 'https://link.metamask.io/home';
      (branch.getLatestReferringParams as jest.Mock).mockResolvedValue({});

      DeeplinkManager.start();

      // Trigger the branch subscription callback with uri
      const subscribeCallback = (branch.subscribe as jest.Mock).mock
        .calls[0][0];
      await subscribeCallback({ uri: mockUri, error: null });

      expect(handleDeeplink).toHaveBeenCalledWith({ uri: mockUri });
    });

    it('should handle Branch subscription errors gracefully', async () => {
      const mockError = 'Branch subscription error';

      DeeplinkManager.start();

      // Trigger the branch subscription callback with error
      const subscribeCallback = (branch.subscribe as jest.Mock).mock
        .calls[0][0];
      await subscribeCallback({ error: mockError });

      // The error should be logged using Logger.error but not throw
      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        'Error subscribing to branch.',
      );
    });

    it('should handle initial Linking URL when available', async () => {
      const mockUrl = 'https://link.metamask.io/home';
      const mockLinking = jest.mocked(Linking);
      mockLinking.getInitialURL = jest.fn().mockResolvedValue(mockUrl);

      DeeplinkManager.start();

      // Wait for the async getInitialURL call
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(handleDeeplink).toHaveBeenCalledWith({ uri: mockUrl });
    });

    it('should setup Linking URL event listener and handle URL events', () => {
      const mockLinking = jest.mocked(Linking);
      let capturedCallback: ((params: { url: string }) => void) | undefined;

      mockLinking.getInitialURL = jest.fn().mockResolvedValue(null);
      mockLinking.addEventListener = jest
        .fn()
        .mockImplementation(
          (event: string, callback: (params: { url: string }) => void) => {
            if (event === 'url') {
              capturedCallback = callback;
            }
          },
        );

      DeeplinkManager.start();

      expect(mockLinking.addEventListener).toHaveBeenCalledWith(
        'url',
        expect.any(Function),
      );

      // Simulate URL event
      if (capturedCallback) {
        capturedCallback({ url: 'test://url' });
        expect(handleDeeplink).toHaveBeenCalledWith({ uri: 'test://url' });
      }
    });
  });

  it('should handle open home correctly', () => {
    handleOpenHome();
    expect(mockNavigation).toHaveBeenCalledWith(Routes.WALLET.HOME);
  });

  it('should handle swap correctly', () => {
    const swapPath = '/swap/path';
    handleSwapUrl({ swapPath });
    expect(handleSwapUrl).toHaveBeenCalledWith({
      swapPath,
    });
  });

  it('should handle create account correctly', () => {
    const createAccountPath = '/create/account/path';
    handleCreateAccountUrl({ path: createAccountPath });
    expect(handleCreateAccountUrl).toHaveBeenCalledWith({
      path: createAccountPath,
    });
  });

  it('should handle perps correctly', () => {
    const perpsPath = '/perps/markets';
    handlePerpsUrl({ perpsPath });
    expect(handlePerpsUrl).toHaveBeenCalledWith({
      perpsPath,
    });
  });

  it('should handle perps asset correctly', () => {
    const assetPath = '/BTC';
    handlePerpsAssetUrl({ assetPath });
    expect(handlePerpsAssetUrl).toHaveBeenCalledWith({
      assetPath,
    });
  });
});
