import {
  parseWalletConnectUri,
  hideWCLoadingState,
  showWCLoadingState,
  isValidWCURI,
  waitForNetworkModalOnboarding,
  getApprovedSessionMethods,
  getScopedPermissions,
  networkModalOnboardingConfig,
  getHostname,
} from './wc-utils';
import type { NavigationContainerRef } from '@react-navigation/native';
import Routes from '../../../app/constants/navigation/Routes';
// eslint-disable-next-line import/no-namespace
import * as StoreModule from '../../../app/store';
import DevLogger from '../SDKConnect/utils/DevLogger';

// Mock dependencies

jest.mock('../RPCMethods/RPCMethodMiddleware', () => ({
  getRpcMethodMiddlewareHooks: jest.fn(),
}));

jest.mock('../../../app/store', () => {
  const mockStore = {
    getState: jest.fn(),
  };
  return {
    store: mockStore,
  };
});

jest.mock('../Permissions', () => ({
  getPermittedAccounts: jest.fn().mockReturnValue(['0x123']),
  getPermittedChains: jest.fn().mockResolvedValue(['eip155:1']),
  updatePermittedChains: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../selectors/networkController', () => ({
  selectNetworkConfigurations: jest.fn().mockReturnValue({}),
  selectProviderConfig: jest
    .fn()
    .mockReturnValue({ chainId: '0x1' }) as jest.Mock,
}));

jest.mock('../../selectors/smartTransactionsController', () => ({
  selectSmartTransactionsEnabled: () => false,
}));

jest.mock('../RPCMethods/lib/ethereum-chain-utils', () => ({
  findExistingNetwork: jest.fn(),
  switchToNetwork: jest.fn().mockResolvedValue(true),
}));

jest.mock('../SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));

jest.mock('qs', () => ({
  parse: jest.fn((queryString: string) => {
    if (!queryString) return {};
    const params: { [key: string]: string } = {};
    const pairs = queryString.slice(1).split('&');
    pairs.forEach((pair) => {
      const [key, value] = pair.split('=');
      params[key] = value;
    });
    return params;
  }),
}));

jest.mock('@walletconnect/utils', () => ({
  parseRelayParams: jest.fn((params) =>
    params.relayProtocol ? { protocol: params.relayProtocol } : undefined,
  ),
}));

describe('WalletConnect Utils', () => {
  let mockNavigation: jest.Mocked<NavigationContainerRef>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockStore = (StoreModule as any).store;

  beforeEach(() => {
    mockNavigation = {
      getCurrentRoute: jest.fn(),
      navigate: jest.fn(),
      goBack: jest.fn(),
      canGoBack: jest.fn().mockReturnValue(true),
    } as unknown as jest.Mocked<NavigationContainerRef>;

    mockStore.getState.mockReturnValue({
      networkOnboarded: {
        networkOnboardedState: {},
      },
    });

    jest.clearAllMocks();
  });

  describe('parseWalletConnectUri', () => {
    it('parses v1 URI correctly', () => {
      const uri = 'wc:topic@1?bridge=https://bridge&key=abc&handshakeTopic=xyz';
      const result = parseWalletConnectUri(uri);
      expect(result).toEqual({
        protocol: 'wc',
        topic: 'topic',
        version: 1,
        bridge: 'https://bridge',
        key: 'abc',
        handshakeTopic: 'xyz',
        symKey: undefined,
        relay: undefined,
      });
    });

    it('parses v2 URI correctly', () => {
      const uri = 'wc:topic@2?symKey=def&relayProtocol=irn';
      const result = parseWalletConnectUri(uri);
      expect(result).toEqual({
        protocol: 'wc',
        topic: 'topic',
        version: 2,
        symKey: 'def',
        relay: { protocol: 'irn' },
        bridge: undefined,
        key: undefined,
        handshakeTopic: undefined,
      });
    });
  });

  describe('hideWCLoadingState', () => {
    it('navigates back from SDK_LOADING sheet', () => {
      mockNavigation.getCurrentRoute.mockReturnValue({
        name: Routes.SHEET.SDK_LOADING,
        key: '123',
      });
      hideWCLoadingState({ navigation: mockNavigation });
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });

    it('navigates back from RETURN_TO_DAPP_NOTIFICATION', () => {
      mockNavigation.getCurrentRoute.mockReturnValue({
        name: Routes.SDK.RETURN_TO_DAPP_NOTIFICATION,
        key: '123',
      });
      hideWCLoadingState({ navigation: mockNavigation });
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  describe('showWCLoadingState', () => {
    it('navigates to SDK_LOADING sheet', () => {
      showWCLoadingState({ navigation: mockNavigation });
      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.MODAL.ROOT_MODAL_FLOW,
        { screen: Routes.SHEET.SDK_LOADING },
      );
    });
  });

  describe('isValidWCURI', () => {
    it('validates v1 URI correctly', () => {
      const uri = 'wc:topic@1?bridge=https://bridge&key=abc&handshakeTopic=xyz';
      expect(isValidWCURI(uri)).toBe(true);
    });

    it('validates v2 URI correctly', () => {
      const uri = 'wc:topic@2?symKey=def&relayProtocol=irn';
      expect(isValidWCURI(uri)).toBe(true);
    });

    it('returns false for invalid URI', () => {
      const uri = 'wc:topic@1';
      expect(isValidWCURI(uri)).toBe(false);
    });

    it('returns false for invalid version URI', () => {
      const uri = 'wc:topic@5';
      expect(isValidWCURI(uri)).toBe(false);
    });
  });

  describe('waitForNetworkModalOnboarding', () => {
    it('waits until network is onboarded', async () => {
      mockStore.getState.mockReturnValueOnce({
        networkOnboarded: {
          networkOnboardedState: { '1': true },
        },
      });
      await expect(
        waitForNetworkModalOnboarding({ chainId: '1' }),
      ).resolves.toBeUndefined();
    });

    it('throws timeout error after max iterations', async () => {
      networkModalOnboardingConfig.MAX_LOOP_COUNTER = 1;
      mockStore.getState.mockReturnValue({
        networkOnboarded: {
          networkOnboardedState: { '1': false },
        },
      });
      await expect(
        waitForNetworkModalOnboarding({ chainId: '1' }),
      ).rejects.toThrow('Timeout error');
    });
  });

  describe('getApprovedSessionMethods', () => {
    it('returns all approved EIP-155 methods', () => {
      const methods = getApprovedSessionMethods();
      expect(methods).toContain('eth_sendTransaction');
      expect(methods).toContain('wallet_switchEthereumChain');
    });
  });

  describe('getScopedPermissions', () => {
    it('returns correct scoped permissions', async () => {
      const result = await getScopedPermissions({ channelId: 'test' });
      expect(result).toEqual({
        eip155: {
          chains: ['eip155:1'],
          methods: expect.any(Array),
          events: ['chainChanged', 'accountsChanged'],
          accounts: ['eip155:1:0x123'],
        },
      });
    });
  });

  describe('getHostname', () => {
    it('returns empty string for null or undefined URI', () => {
      expect(getHostname('')).toBe('');
    });

    it('returns protocol part for protocol-based URIs', () => {
      expect(getHostname('wc:topic@1')).toBe('wc');
      expect(getHostname('ethereum:0x123')).toBe('ethereum');
      expect(getHostname('metamask:pay')).toBe('metamask');
    });

    it('handles errors gracefully and returns original URI', () => {
      // Mock a scenario where uri.substring throws an error
      const expectedError = new Error('Substring failed');
      const maliciousUri = {
        includes: () => false,
        indexOf: () => 1,
        substring: () => {
          throw expectedError;
        },
        toString: () => 'malicious-uri',
      };

      expect(getHostname(maliciousUri as unknown as string)).toBe(maliciousUri);

      // Verify that DevLogger.log was called with the error
      expect(DevLogger.log).toHaveBeenCalledWith(
        'Error in getHostname:',
        expectedError,
      );
    });

    it('handles standard URLs with hostname extraction', () => {
      expect(getHostname('https://example.com/path')).toBe('example.com');
      expect(
        getHostname('http://subdomain.example.org:8080/path?query=1'),
      ).toBe('subdomain.example.org');
    });

    it('falls back to manual parsing when URL parsing fails', () => {
      // Create a URL with invalid characters that will fail URL parsing
      const invalidUrl = 'wc:topic@1';
      expect(getHostname(invalidUrl)).toBe('wc');
    });

    it('returns original URI when no protocol separator is found', () => {
      const noProtocolUri = 'example-with-no-protocol';
      expect(getHostname(noProtocolUri)).toBe(noProtocolUri);
    });
  });
});
