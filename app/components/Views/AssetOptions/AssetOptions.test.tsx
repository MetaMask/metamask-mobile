import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import AssetOptions from './AssetOptions';

import { TokenI } from '../../UI/Tokens/types';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import Engine from '../../../core/Engine';
import NotificationManager from '../../../core/NotificationManager';
import { selectSelectedInternalAccountByScope } from '../../../selectors/multichainAccounts/accounts';
import { selectAssetsBySelectedAccountGroup } from '../../../selectors/assets/assets-list';
import Logger from '../../../util/Logger';
import { removeNonEvmToken } from '../../UI/Tokens/util';

jest.mock('../../../selectors/networkController', () => ({
  selectEvmChainId: jest.fn(() => '1'),
  selectProviderConfig: jest.fn(() => ({})),
  selectEvmNetworkConfigurationsByChainId: jest.fn(() => ({
    '0x1': {
      chainId: '0x1',
      rpcEndpoints: [{ url: 'https://mainnet.example.com' }],
      defaultRpcEndpointIndex: 0,
    },
    '0x89': {
      chainId: '0x89',
      rpcEndpoints: [{ url: 'https://polygon.example.com' }],
      defaultRpcEndpointIndex: 0,
    },
  })),
}));

const mockUseRoute = jest.fn();

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: () => mockUseRoute(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({ bottom: 10 })),
  useSafeAreaFrame: jest.fn(() => ({ width: 390, height: 844 })),
}));

// Mock InteractionManager.runAfterInteractions to execute callbacks immediately
const mockRunAfterInteractions = jest.fn((callback) => {
  // Execute the callback immediately for testing
  const result = callback();
  const promise =
    result && typeof result.then === 'function' ? result : Promise.resolve();

  return {
    then: (onfulfilled?: (value: unknown) => unknown) =>
      promise.then(onfulfilled),
    done: (
      onfulfilled?: (value: unknown) => unknown,
      onrejected?: (reason: unknown) => unknown,
    ) => promise.then(onfulfilled, onrejected),
    cancel: jest.fn(),
  };
});

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    InteractionManager: {
      runAfterInteractions: mockRunAfterInteractions,
    },
  };
});

jest.mock('../../../component-library/hooks', () => ({
  useStyles: () => ({ styles: {} }),
}));

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue('mockEvent'),
}));

jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    isEnabled: jest.fn(() => true),
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const mockGetBlockExplorerName = jest.fn(() => 'example-explorer.com');
const mockGetBlockExplorerUrl = jest.fn(
  (address: string) => `https://example-explorer.com/address/${address}`,
);
const mockGetBlockExplorerBaseUrl = jest.fn(
  () => 'https://example-explorer.com',
);

jest.mock('../../hooks/useBlockExplorer', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    getBlockExplorerName: mockGetBlockExplorerName,
    getBlockExplorerUrl: mockGetBlockExplorerUrl,
    getBlockExplorerBaseUrl: mockGetBlockExplorerBaseUrl,
    toBlockExplorer: jest.fn(),
    getEvmBlockExplorerUrl: jest.fn(),
  })),
}));

const mockSelectInternalAccountByScope = jest.fn();
jest.mock('../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(
    () => mockSelectInternalAccountByScope,
  ),
}));

const mockIsNonEvmChainId = jest.fn();
jest.mock('../../../core/Multichain/utils', () => ({
  ...jest.requireActual('../../../core/Multichain/utils'),
  isNonEvmChainId: (chainId: string) => mockIsNonEvmChainId(chainId),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    TokensController: {
      ignoreTokens: jest.fn(() => Promise.resolve()),
    },
    MultichainAssetsController: {
      ignoreAssets: jest.fn(() => Promise.resolve()),
      state: {
        assetsMetadata: {},
      },
    },
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(() => 'test-network'),
      state: {
        networkConfigurationsByChainId: {},
      },
    },
  },
  getTotalEvmFiatAccountBalance: jest.fn(),
}));

jest.mock('../../../core/NotificationManager', () => ({
  showSimpleNotification: jest.fn(),
}));

jest.mock('../../../util/Logger', () => ({
  log: jest.fn(),
}));

jest.mock('../../../constants/navigation/Routes', () => ({
  MODAL: {
    ROOT_MODAL_FLOW: 'RootModalFlow',
  },
  BROWSER: {
    HOME: 'BrowserHome',
    VIEW: 'BrowserView',
  },
}));

jest.mock('../../../selectors/networkController', () => ({
  selectEvmChainId: jest.fn(() => '1'),
  selectProviderConfig: jest.fn(() => ({})),
  selectEvmNetworkConfigurationsByChainId: jest.fn(() => ({})),
}));

jest.mock('../../../selectors/tokenListController', () => ({
  selectTokenList: jest.fn(() => ({})),
}));

jest.mock('../../../selectors/assets/assets-list', () => ({
  selectAssetsBySelectedAccountGroup: jest.fn(() => ({})),
}));

jest.mock('react-native-inappbrowser-reborn', () => ({
  isAvailable: jest.fn(),
  open: jest.fn(),
}));

jest.mock('../../../util/url', () => ({
  isPortfolioUrl: jest.fn((url: string) =>
    url.includes('portfolio.metamask.io'),
  ),
}));

jest.mock('../../../util/browser', () => ({
  appendURLParams: jest.fn(
    (baseUrl: string, params: Record<string, string | boolean>) => {
      const url = new URL(baseUrl);
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
      });
      return url;
    },
  ),
}));

jest.mock('../../../util/networks', () => ({
  findBlockExplorerForNonEvmChainId: jest.fn(
    () => 'https://solana-explorer.com',
  ),
  getDecimalChainId: jest.fn((chainId: string) => chainId),
}));

jest.mock('../../../core/AppConstants', () => ({
  PORTFOLIO: {
    URL: 'https://portfolio.metamask.io',
  },
}));

let mockRemoveNonEvmToken: jest.Mock;

jest.mock('../../UI/Tokens/util', () => ({
  removeNonEvmToken: jest.fn(),
}));

const mockAsset = {
  address: '0x750e4C4984a9e0f12978eA6742Bc1c5D248f40ed',
  balanceFiat: '$11.89',
  chainId: '0x89',
  decimals: 6,
  image:
    'https://static.cx.metamask.io/api/v1/tokenIcons/137/0x750e4c4984a9e0f12978ea6742bc1c5d248f40ed.png',
  isETH: false,
  isNative: false,
};

describe('AssetOptions Component', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
  };

  beforeEach(() => {
    // Get reference to the mocked function
    mockRemoveNonEvmToken = removeNonEvmToken as jest.Mock;

    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    mockIsNonEvmChainId.mockReturnValue(false);
    mockSelectInternalAccountByScope.mockImplementation(() => null);
    (useSelector as jest.Mock).mockImplementation((selector) => {
      const selectorStr = selector.toString();
      const selectorName = selector.name || '';
      if (
        selectorStr.includes('selectSelectedInternalAccountByScope') ||
        selectorName === 'selectSelectedInternalAccountByScope' ||
        selectorStr.includes('selectedInternalAccountByScope')
      ) {
        return mockSelectInternalAccountByScope;
      }
      if (selector === selectAssetsBySelectedAccountGroup)
        return {
          '0x1': [
            {
              assetId: '0x123',
              chainId: '0x1',
              symbol: 'ABC',
              decimals: 18,
              name: 'Test Token',
            },
          ],
        };
      if (selector.name === 'selectEvmChainId') return '1';
      if (selector.name === 'selectProviderConfig') return {};
      if (selector.name === 'selectTokenList')
        return { '0x123': { symbol: 'ABC' } };
      if (selector.name === 'selectIsAllNetworks') return false;
      if (selector.name === 'selectIsPopularNetwork') return false;
      return {};
    });
    mockNavigation.navigate.mockClear();
    mockNavigation.goBack.mockClear();
    (
      Engine.context.MultichainAssetsController.ignoreAssets as jest.Mock
    ).mockClear();
    (Engine.context.TokensController.ignoreTokens as jest.Mock).mockClear();
    (NotificationManager.showSimpleNotification as jest.Mock).mockClear();
    (InAppBrowser.isAvailable as jest.Mock).mockClear();
    (InAppBrowser.open as jest.Mock).mockClear();
    mockTrackEvent.mockClear();
    mockGetBlockExplorerName.mockClear();
    mockGetBlockExplorerUrl.mockClear();
    mockGetBlockExplorerBaseUrl.mockClear();
    if (mockRemoveNonEvmToken) {
      mockRemoveNonEvmToken.mockClear();
      mockRemoveNonEvmToken.mockResolvedValue(undefined);
    }
    jest.useFakeTimers({ legacyFakeTimers: true });
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runAllTimers();
    jest.clearAllTimers();
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterAll(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('renders correctly and displays options', () => {
    mockUseRoute.mockReturnValue({
      params: {
        address: '0x123',
        chainId: '0x1',
        isNativeCurrency: false,
        asset: mockAsset as unknown as TokenI,
      },
    });

    const { getByText } = render(<AssetOptions />);

    expect(getByText('View on Portfolio')).toBeTruthy();
    expect(getByText('View on block explorer')).toBeTruthy();
    expect(getByText('Token details')).toBeTruthy();
    expect(getByText('Remove token')).toBeTruthy();
  });

  it('when reborn is unavailable, handles "View on Block Explorer" press with navigation to SimpleWebView', async () => {
    mockUseRoute.mockReturnValue({
      params: {
        address: '0x123',
        chainId: '0x1',
        isNativeCurrency: false,
        asset: mockAsset as unknown as TokenI,
      },
    });

    const { getByText } = render(<AssetOptions />);

    (InAppBrowser.isAvailable as jest.Mock).mockResolvedValue(false);

    fireEvent.press(getByText('View on block explorer'));
    jest.runAllTimers();
    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: 'https://example-explorer.com/address/0x123',
          title: 'example-explorer.com',
        },
      });
    });
  });

  it('when reborn is available, handles "View on Block Explorer" press with navigation to reborn', async () => {
    mockUseRoute.mockReturnValue({
      params: {
        address: '0x123',
        chainId: '0x1',
        isNativeCurrency: false,
        asset: mockAsset as unknown as TokenI,
      },
    });

    const { getByText } = render(<AssetOptions />);

    (InAppBrowser.isAvailable as jest.Mock).mockResolvedValue(true);

    fireEvent.press(getByText('View on block explorer'));
    jest.runAllTimers();
    await waitFor(() => {
      expect(InAppBrowser.open).toHaveBeenCalledWith(
        'https://example-explorer.com/address/0x123',
      );
    });
  });

  it('handles "Remove Token" press', () => {
    mockUseRoute.mockReturnValue({
      params: {
        address: '0x123',
        chainId: '0x1',
        isNativeCurrency: false,
        asset: mockAsset as unknown as TokenI,
      },
    });

    const { getByText } = render(<AssetOptions />);

    fireEvent.press(getByText('Remove token'));
    jest.runAllTimers();
    expect(mockNavigation.navigate).toHaveBeenCalledWith('RootModalFlow', {
      screen: 'AssetHideConfirmation',
      params: expect.anything(),
    });
  });

  it('handles "Token Details" press', () => {
    mockUseRoute.mockReturnValue({
      params: {
        address: '0x123',
        chainId: '0x1',
        isNativeCurrency: false,
        asset: mockAsset as unknown as TokenI,
      },
    });

    const { getByText } = render(<AssetOptions />);

    fireEvent.press(getByText('Token details'));
    jest.runAllTimers();
    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      'AssetDetails',
      expect.anything(),
    );
  });

  describe('Portfolio and Network Configuration', () => {
    beforeEach(() => {
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectAssetsBySelectedAccountGroup) return {};
        if (selector.name === 'selectIsAllNetworks') return false;
        if (selector.name === 'selectIsPopularNetwork') return false;
        return {};
      });
    });

    it('renders portfolio option for EVM tokens', () => {
      mockUseRoute.mockReturnValue({
        params: {
          address: '0x123',
          chainId: '0x1',
          isNativeCurrency: false,
          asset: mockAsset as unknown as TokenI,
        },
      });

      const { getByText } = render(<AssetOptions />);

      expect(getByText('View on Portfolio')).toBeTruthy();
    });
  });

  describe('Block explorer navigation', () => {
    // Chain configurations for non-EVM networks
    const nonEvmChains = {
      solana: {
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        nativeAddress: 'native-sol-address',
        tokenAddress:
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        extractedTokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        wrappedNativeAddress:
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:So11111111111111111111111111111111111111111',
        extractedWrappedAddress: 'So11111111111111111111111111111111111111111',
      },
      bitcoin: {
        chainId: 'bip122:000000000019d6689c085ae165831e93',
        nativeAddress: 'native-btc-address',
        // Bitcoin doesn't typically have non-native tokens in the same way
      },
    };

    // Comprehensive test cases for block explorer URL generation
    const blockExplorerTestCases = [
      // EVM Native currencies
      {
        name: 'EVM native - Ethereum (ETH)',
        isNonEvm: false,
        isNativeCurrency: true,
        address: '0x0000000000000000000000000000000000000000',
        chainId: '0x1',
        assertCalls: () => {
          expect(mockGetBlockExplorerBaseUrl).toHaveBeenCalledWith('0x1');
          expect(mockGetBlockExplorerUrl).not.toHaveBeenCalled();
        },
      },
      {
        name: 'EVM native - Polygon (MATIC)',
        isNonEvm: false,
        isNativeCurrency: true,
        address: '0x0000000000000000000000000000000000000000',
        chainId: '0x89',
        assertCalls: () => {
          expect(mockGetBlockExplorerBaseUrl).toHaveBeenCalledWith('0x89');
          expect(mockGetBlockExplorerUrl).not.toHaveBeenCalled();
        },
      },
      // EVM Non-native (ERC20 tokens)
      {
        name: 'EVM non-native - ERC20 token on Ethereum',
        isNonEvm: false,
        isNativeCurrency: false,
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
        chainId: '0x1',
        assertCalls: () => {
          expect(mockGetBlockExplorerUrl).toHaveBeenCalledWith(
            '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            '0x1',
          );
          expect(mockGetBlockExplorerBaseUrl).not.toHaveBeenCalled();
        },
      },
      {
        name: 'EVM non-native - ERC20 token on Polygon',
        isNonEvm: false,
        isNativeCurrency: false,
        address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        chainId: '0x89',
        assertCalls: () => {
          expect(mockGetBlockExplorerUrl).toHaveBeenCalledWith(
            '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
            '0x89',
          );
          expect(mockGetBlockExplorerBaseUrl).not.toHaveBeenCalled();
        },
      },
      // Non-EVM Native currencies
      {
        name: 'Non-EVM native - Solana (SOL)',
        isNonEvm: true,
        isNativeCurrency: true,
        address: nonEvmChains.solana.nativeAddress,
        chainId: nonEvmChains.solana.chainId,
        assertCalls: () => {
          expect(mockGetBlockExplorerBaseUrl).toHaveBeenCalledWith(
            nonEvmChains.solana.chainId,
          );
          expect(mockGetBlockExplorerUrl).not.toHaveBeenCalled();
        },
      },
      {
        name: 'Non-EVM native - Bitcoin (BTC)',
        isNonEvm: true,
        isNativeCurrency: true,
        address: nonEvmChains.bitcoin.nativeAddress,
        chainId: nonEvmChains.bitcoin.chainId,
        assertCalls: () => {
          expect(mockGetBlockExplorerBaseUrl).toHaveBeenCalledWith(
            nonEvmChains.bitcoin.chainId,
          );
          expect(mockGetBlockExplorerUrl).not.toHaveBeenCalled();
        },
      },
      // Non-EVM Non-native (SPL tokens, etc.)
      {
        name: 'Non-EVM non-native - SPL token on Solana (USDC)',
        isNonEvm: true,
        isNativeCurrency: false,
        address: nonEvmChains.solana.tokenAddress,
        chainId: nonEvmChains.solana.chainId,
        assertCalls: () => {
          expect(mockGetBlockExplorerUrl).toHaveBeenCalledWith(
            nonEvmChains.solana.extractedTokenAddress,
            nonEvmChains.solana.chainId,
          );
          expect(mockGetBlockExplorerBaseUrl).not.toHaveBeenCalled();
        },
      },
      {
        // Wrapped SOL is treated as native token, so it navigates to base URL
        name: 'Non-EVM wrapped native - Wrapped SOL on Solana (treated as native)',
        isNonEvm: true,
        isNativeCurrency: false, // Not marked as native, but isNativeTokenAddress returns true
        address: nonEvmChains.solana.wrappedNativeAddress,
        chainId: nonEvmChains.solana.chainId,
        assertCalls: () => {
          expect(mockGetBlockExplorerBaseUrl).toHaveBeenCalledWith(
            nonEvmChains.solana.chainId,
          );
          expect(mockGetBlockExplorerUrl).not.toHaveBeenCalled();
        },
      },
    ];

    it.each(blockExplorerTestCases)(
      'navigates to block explorer for $name',
      async ({ isNonEvm, isNativeCurrency, address, chainId, assertCalls }) => {
        mockIsNonEvmChainId.mockReturnValue(isNonEvm);
        (InAppBrowser.isAvailable as jest.Mock).mockResolvedValue(true);

        mockUseRoute.mockReturnValue({
          params: {
            address,
            chainId,
            isNativeCurrency,
            asset: mockAsset as unknown as TokenI,
          },
        });

        const { getByText } = render(<AssetOptions />);

        fireEvent.press(getByText('View on block explorer'));
        jest.runAllTimers();

        await waitFor(() => {
          assertCalls();
        });
      },
    );

    it('hides Remove token option for wrapped SOL (native token)', () => {
      mockIsNonEvmChainId.mockReturnValue(true);

      mockUseRoute.mockReturnValue({
        params: {
          address: nonEvmChains.solana.wrappedNativeAddress,
          chainId: nonEvmChains.solana.chainId,
          isNativeCurrency: false,
          asset: mockAsset as unknown as TokenI,
        },
      });

      const { queryByText } = render(<AssetOptions />);

      expect(queryByText('Remove token')).not.toBeOnTheScreen();
    });
  });

  describe('Token removal', () => {
    it('removes non-EVM token and shows notification', async () => {
      mockIsNonEvmChainId.mockReturnValue(true);
      mockRemoveNonEvmToken.mockResolvedValue(undefined);

      const mockNonEvmChainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
      const mockNonEvmTokenAddress =
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

      const mockAccount = { id: 'account-123' };
      const mockAccountSelector = jest.fn(() => mockAccount);

      Engine.context.MultichainAssetsController.state.assetsMetadata = {
        [mockNonEvmTokenAddress]: {
          fungible: true as const,
          iconUrl: 'https://example.com/usdc.png',
          name: 'USD Coin',
          symbol: 'USDC',
          units: [
            {
              decimals: 6,
              name: 'USD Coin',
              symbol: 'USDC',
            },
          ],
        },
      };

      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectSelectedInternalAccountByScope) {
          return mockAccountSelector;
        }
        if (selector === selectAssetsBySelectedAccountGroup)
          return {
            [mockNonEvmChainId]: [
              {
                assetId: mockNonEvmTokenAddress,
                chainId: mockNonEvmChainId,
                symbol: 'USDC',
                decimals: 6,
                name: 'USD Coin',
              },
            ],
          };
        if (selector.name === 'selectEvmChainId') return '1';
        if (selector.name === 'selectTokenList') return {};
        if (selector.name === 'selectIsAllNetworks') return false;
        if (selector.name === 'selectIsPopularNetwork') return false;
        return {};
      });

      mockUseRoute.mockReturnValue({
        params: {
          address: mockNonEvmTokenAddress,
          chainId: mockNonEvmChainId,
          isNativeCurrency: false,
          asset: mockAsset as unknown as TokenI,
        },
      });

      const { getByText } = render(<AssetOptions />);

      fireEvent.press(getByText('Remove token'));
      jest.runAllTimers();

      const navigateCall = mockNavigation.navigate.mock.calls.find(
        (call) => call[0] === 'RootModalFlow',
      );
      const onConfirm = navigateCall?.[1]?.params?.onConfirm;

      expect(onConfirm).toBeDefined();

      await onConfirm();

      expect(mockRemoveNonEvmToken).toHaveBeenCalledWith({
        tokenAddress: mockNonEvmTokenAddress,
        tokenChainId: mockNonEvmChainId,
        selectInternalAccountByScope: expect.any(Function),
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith('WalletView');

      expect(NotificationManager.showSimpleNotification).toHaveBeenCalledWith({
        status: 'simple_notification',
        duration: 5000,
        title: expect.any(String),
        description: expect.any(String),
      });

      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('removes EVM token and shows notification', async () => {
      mockIsNonEvmChainId.mockReturnValue(false);

      (useSelector as jest.Mock).mockImplementation((selector) => {
        const selectorStr = selector.toString();
        const selectorName = selector.name || '';
        if (
          selectorStr.includes('selectSelectedInternalAccountByScope') ||
          selectorName === 'selectSelectedInternalAccountByScope' ||
          selectorStr.includes('selectedInternalAccountByScope')
        ) {
          return mockSelectInternalAccountByScope;
        }
        if (selector === selectAssetsBySelectedAccountGroup)
          return {
            '0x1': [
              {
                assetId: '0x123',
                chainId: '0x1',
                symbol: 'TEST',
                decimals: 18,
                name: 'Test Token',
              },
            ],
          };
        if (selector.name === 'selectEvmChainId') return '0x1';
        if (selector.name === 'selectTokenList')
          return { '0x123': { symbol: 'TEST' } };
        if (selector.name === 'selectIsAllNetworks') return false;
        if (selector.name === 'selectIsPopularNetwork') return false;
        return {};
      });

      mockUseRoute.mockReturnValue({
        params: {
          address: '0x123',
          chainId: '0x1',
          isNativeCurrency: false,
          asset: mockAsset as unknown as TokenI,
        },
      });

      const { getByText } = render(<AssetOptions />);

      fireEvent.press(getByText('Remove token'));
      jest.runAllTimers();

      const navigateCall = mockNavigation.navigate.mock.calls.find(
        (call) => call[0] === 'RootModalFlow',
      );
      const onConfirm = navigateCall?.[1]?.params?.onConfirm;

      expect(onConfirm).toBeDefined();

      await onConfirm();

      expect(Engine.context.TokensController.ignoreTokens).toHaveBeenCalledWith(
        ['0x123'],
        'test-network',
      );

      expect(mockNavigation.navigate).toHaveBeenCalledWith('WalletView');

      expect(NotificationManager.showSimpleNotification).toHaveBeenCalledWith({
        status: 'simple_notification',
        duration: 5000,
        title: expect.any(String),
        description: expect.any(String),
      });

      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('logs error when non-EVM token removal fails', async () => {
      const mockError = new Error('Failed to remove token');

      mockIsNonEvmChainId.mockReturnValue(true);
      mockRemoveNonEvmToken.mockClear();
      mockRemoveNonEvmToken.mockRejectedValue(mockError);

      const mockNonEvmChainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
      const mockNonEvmTokenAddress =
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

      const mockAccount = { id: 'account-123' };
      const mockAccountSelector = jest.fn(() => mockAccount);

      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectSelectedInternalAccountByScope) {
          return mockAccountSelector;
        }
        if (selector === selectAssetsBySelectedAccountGroup)
          return {
            [mockNonEvmChainId]: [
              {
                assetId: mockNonEvmTokenAddress,
                chainId: mockNonEvmChainId,
                symbol: 'USDC',
                decimals: 6,
                name: 'USD Coin',
              },
            ],
          };
        if (selector.name === 'selectEvmChainId') return '1';
        if (selector.name === 'selectTokenList') return {};
        if (selector.name === 'selectIsAllNetworks') return false;
        if (selector.name === 'selectIsPopularNetwork') return false;
        return {};
      });

      const mockLoggerLog = jest.spyOn(Logger, 'log');

      mockUseRoute.mockReturnValue({
        params: {
          address: mockNonEvmTokenAddress,
          chainId: mockNonEvmChainId,
          isNativeCurrency: false,
          asset: mockAsset as unknown as TokenI,
        },
      });

      const { getByText } = render(<AssetOptions />);

      fireEvent.press(getByText('Remove token'));
      jest.runAllTimers();

      const navigateCall = mockNavigation.navigate.mock.calls.find(
        (call) => call[0] === 'RootModalFlow',
      );
      const onConfirm = navigateCall?.[1]?.params?.onConfirm;

      await onConfirm();

      expect(mockLoggerLog).toHaveBeenCalledWith(
        mockError,
        'AssetDetails: Failed to hide token!',
      );
    });

    it('logs error when EVM token removal fails', async () => {
      mockIsNonEvmChainId.mockReturnValue(false);
      const mockError = new Error('Failed to ignore token');
      (
        Engine.context.TokensController.ignoreTokens as jest.Mock
      ).mockRejectedValue(mockError);

      (useSelector as jest.Mock).mockImplementation((selector) => {
        const selectorStr = selector.toString();
        const selectorName = selector.name || '';
        if (
          selectorStr.includes('selectSelectedInternalAccountByScope') ||
          selectorName === 'selectSelectedInternalAccountByScope' ||
          selectorStr.includes('selectedInternalAccountByScope')
        ) {
          return mockSelectInternalAccountByScope;
        }
        if (selector === selectAssetsBySelectedAccountGroup)
          return {
            '0x1': [
              {
                assetId: '0x123',
                chainId: '0x1',
                symbol: 'TEST',
                decimals: 18,
                name: 'Test Token',
              },
            ],
          };
        if (selector.name === 'selectEvmChainId') return '0x1';
        if (selector.name === 'selectTokenList')
          return { '0x123': { symbol: 'TEST' } };
        if (selector.name === 'selectIsAllNetworks') return false;
        if (selector.name === 'selectIsPopularNetwork') return false;
        return {};
      });

      const mockLoggerLog = jest.spyOn(Logger, 'log');

      mockUseRoute.mockReturnValue({
        params: {
          address: '0x123',
          chainId: '0x1',
          isNativeCurrency: false,
          asset: mockAsset as unknown as TokenI,
        },
      });

      const { getByText } = render(<AssetOptions />);

      fireEvent.press(getByText('Remove token'));
      jest.runAllTimers();

      const navigateCall = mockNavigation.navigate.mock.calls.find(
        (call) => call[0] === 'RootModalFlow',
      );
      const onConfirm = navigateCall?.[1]?.params?.onConfirm;

      await onConfirm();

      expect(mockLoggerLog).toHaveBeenCalledWith(
        mockError,
        'AssetDetails: Failed to hide token!',
      );
    });
  });
});
