import {
  parseWalletConnectUri,
  hideWCLoadingState,
  showWCLoadingState,
  isValidWCURI,
  waitForNetworkModalOnboarding,
  getApprovedSessionMethods,
  getScopedPermissions,
  checkWCPermissions,
  networkModalOnboardingConfig,
  onRequestUserApproval,
  getHostname,
} from './wc-utils';
import type { NavigationContainerRef } from '@react-navigation/native';
import Routes from '../../../app/constants/navigation/Routes';
// eslint-disable-next-line import/no-namespace
import * as StoreModule from '../../../app/store';
import { selectProviderConfig } from '../../selectors/networkController';
import {
  findExistingNetwork,
  switchToNetwork,
} from '../RPCMethods/lib/ethereum-chain-utils';

import Engine from '../Engine';
import DevLogger from '../SDKConnect/utils/DevLogger';

// Mock dependencies
jest.mock('../Engine', () => ({
  context: {
    ApprovalController: {
      clear: jest.fn(),
      add: jest.fn().mockResolvedValue({}),
    },
  },
}));

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

    it('navigates back from RETURN_TO_DAPP_MODAL', () => {
      mockNavigation.getCurrentRoute.mockReturnValue({
        name: Routes.SHEET.RETURN_TO_DAPP_MODAL,
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
      const methods = getApprovedSessionMethods({ origin: 'test' });
      expect(methods).toContain('eth_sendTransaction');
      expect(methods).toContain('wallet_switchEthereumChain');
    });
  });

  describe('getScopedPermissions', () => {
    it('returns correct scoped permissions', async () => {
      const result = await getScopedPermissions({ origin: 'test' });
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

  describe('checkWCPermissions', () => {
    beforeEach(() => {
      (findExistingNetwork as jest.Mock).mockReturnValue({ chainId: '0x1' });
    });

    it('returns true for permitted chain', async () => {
      const result = await checkWCPermissions({
        origin: 'test',
        caip2ChainId: 'eip155:1',
      });
      expect(result).toBe(true);
    });

    it('throws error for non-existent network', async () => {
      (findExistingNetwork as jest.Mock).mockReturnValue(null);
      await expect(
        checkWCPermissions({
          origin: 'test',
          caip2ChainId: 'eip155:2',
        }),
      ).rejects.toThrow('Invalid parameters');
    });

    it('throws error for not allowed chain', async () => {
      const mockPermittedChains =
        jest.requireMock('../Permissions').getPermittedChains;
      mockPermittedChains.mockResolvedValueOnce([]);
      await expect(
        checkWCPermissions({
          origin: 'test',
          caip2ChainId: 'eip155:2',
        }),
      ).rejects.toThrow('Invalid parameters');
    });

    it('switches network when chainIds differ', async () => {
      (selectProviderConfig as unknown as jest.Mock).mockReturnValue({ chainId: '0x2' });
      await checkWCPermissions({
        origin: 'test',
        caip2ChainId: 'eip155:1',
      });
      expect(switchToNetwork).toHaveBeenCalled();
    });

    it('adds permitted chain when allowSwitchingToNewChain is true', async () => {
      // Mock that the chain is not permitted
      const mockPermittedChains = jest.requireMock('../Permissions').getPermittedChains;
      mockPermittedChains.mockResolvedValueOnce([]);

      // Mock the updatePermittedChains function
      const mockUpdatePermittedChain = jest.requireMock('../Permissions').updatePermittedChains;

      // Test with allowSwitchingToNewChain set to true
      const result = await checkWCPermissions({
        origin: 'test-dapp.com',
        caip2ChainId: 'eip155:3',
        allowSwitchingToNewChain: true,
      });

      // Verify addPermittedChain was called with the right parameters
      expect(mockUpdatePermittedChain).toHaveBeenCalledWith(
        'test-dapp.com',
        ['eip155:3']
      );
      expect(switchToNetwork).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('onRequestUserApproval', () => {
    beforeEach(() => {
      // Clear all mocks before each test
      jest.clearAllMocks();
    });

    it('clears previous approval and adds new approval request', async () => {
      const origin = 'test-origin';
      const args = {
        type: 'test-type',
        requestData: { someData: 'test-data' },
      };

      // Get the approval handler function
      const approvalHandler = onRequestUserApproval(origin);

      // Mock the expected return value from add()
      const mockResponseData = { approved: true };
      (
        Engine.context.ApprovalController.add as jest.Mock
      ).mockResolvedValueOnce(mockResponseData);

      // Call the handler
      const result = await approvalHandler(args);

      // Verify clear was called with correct error
      expect(Engine.context.ApprovalController.clear).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 4001, // userRejectedRequest error code
          message: expect.any(String),
        }),
      );

      // Verify add was called with correct parameters
      expect(Engine.context.ApprovalController.add).toHaveBeenCalledWith({
        origin: 'test-origin',
        type: 'test-type',
        requestData: { someData: 'test-data' },
      });

      // Verify the handler returns the response data
      expect(result).toBe(mockResponseData);
    });

    it('propagates errors from ApprovalController', async () => {
      const origin = 'test-origin';
      const args = {
        type: 'test-type',
        requestData: {},
      };

      // Mock an error from add()
      const mockError = new Error('Approval failed');
      (
        Engine.context.ApprovalController.add as jest.Mock
      ).mockRejectedValueOnce(mockError);

      // Get the approval handler function
      const approvalHandler = onRequestUserApproval(origin);

      // Verify the error is propagated
      await expect(approvalHandler(args)).rejects.toThrow('Approval failed');
    });
  });

  describe('getHostname', () => {
    it('returns empty string for null or undefined URI', () => {
      expect(getHostname('')).toBe('');
      expect(getHostname(undefined as unknown as string)).toBe('');
      expect(getHostname(null as unknown as string)).toBe('');
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
