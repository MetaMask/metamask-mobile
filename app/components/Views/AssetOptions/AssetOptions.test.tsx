import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import AssetOptions from './AssetOptions';

import {
  createProviderConfig,
  selectEvmNetworkConfigurationsByChainId,
} from '../../../selectors/networkController';
import { TokenI } from '../../UI/Tokens/types';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import Engine from '../../../core/Engine';
import Logger from '../../../util/Logger';
import NotificationManager from '../../../core/NotificationManager';

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
  createProviderConfig: jest.fn((networkConfig, rpcEndpoint) => ({
    chainId: networkConfig.chainId,
    rpcUrl: rpcEndpoint.url,
    chainName: 'Example Chain',
    nativeCurrency: {
      name: 'Example Token',
      symbol: 'EXAMPLE',
      decimals: 18,
    },
  })),
}));

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({ bottom: 10 })),
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

jest.mock('../../../components/UI/Swaps/utils/useBlockExplorer', () =>
  jest.fn(() => ({
    baseUrl: 'https://example-explorer.com',
    token: (address: string) => `https://example-explorer.com/token/${address}`,
  })),
);

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
  createProviderConfig: jest.fn(() => ({
    chainId: '1',
    rpcUrl: 'https://example.com',
    chainName: 'Example Chain',
    nativeCurrency: {
      name: 'Example Token',
      symbol: 'EXAMPLE',
      decimals: 18,
    },
  })),
}));

jest.mock('../../../selectors/tokenListController', () => ({
  selectTokenList: jest.fn(() => ({})),
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
      if (selector.name === 'selectEvmChainId') return '1';
      if (selector.name === 'selectProviderConfig') return {};
      if (selector.name === 'selectTokenList')
        return { '0x123': { symbol: 'ABC' } };
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

  it('matches the snapshot', () => {
    const { toJSON } = render(
      <AssetOptions
        route={{
          params: {
            address: '0x123',
            chainId: '0x1',
            isNativeCurrency: false,
            asset: mockAsset as unknown as TokenI,
          },
        }}
      />,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('should match the snapshot', () => {
    const { toJSON } = render(
      <AssetOptions
        route={{
          params: {
            address: '0x123',
            chainId: '0x1',
            isNativeCurrency: false,
            asset: mockAsset as unknown as TokenI,
          },
        }}
      />,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly and displays options', () => {
    const { getByText } = render(
      <AssetOptions
        route={{
          params: {
            address: '0x123',
            chainId: '0x1',
            isNativeCurrency: false,
            asset: mockAsset as unknown as TokenI,
          },
        }}
      />,
    );

    expect(getByText('View on Portfolio')).toBeTruthy();
    expect(getByText('View on block explorer')).toBeTruthy();
    expect(getByText('Token details')).toBeTruthy();
    expect(getByText('Remove token')).toBeTruthy();
  });

  it('when reborn is unavailable, handles "View on Block Explorer" press with navigation to SimpleWebView', async () => {
    const { getByText } = render(
      <AssetOptions
        route={{
          params: {
            address: '0x123',
            chainId: '0x1',
            isNativeCurrency: false,
            asset: mockAsset as unknown as TokenI,
          },
        }}
      />,
    );

    (InAppBrowser.isAvailable as jest.Mock).mockResolvedValue(false);

    fireEvent.press(getByText('View on block explorer'));
    jest.runAllTimers();
    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: 'https://example-explorer.com/token/0x123',
          title: 'example-explorer.com',
        },
      });
    });
  });

  it('when reborn is available, handles "View on Block Explorer" press with navigation to reborn', async () => {
    const { getByText } = render(
      <AssetOptions
        route={{
          params: {
            address: '0x123',
            chainId: '0x1',
            isNativeCurrency: false,
            asset: mockAsset as unknown as TokenI,
          },
        }}
      />,
    );

    (InAppBrowser.isAvailable as jest.Mock).mockResolvedValue(true);

    fireEvent.press(getByText('View on block explorer'));
    jest.runAllTimers();
    await waitFor(() => {
      expect(InAppBrowser.open).toHaveBeenCalledWith(
        'https://example-explorer.com/token/0x123',
      );
    });
  });

  it('handles "Remove Token" press', () => {
    const { getByText } = render(
      <AssetOptions
        route={{
          params: {
            address: '0x123',
            chainId: '0x1',
            isNativeCurrency: false,
            asset: mockAsset as unknown as TokenI,
          },
        }}
      />,
    );

    fireEvent.press(getByText('Remove token'));
    jest.runAllTimers();
    expect(mockNavigation.navigate).toHaveBeenCalledWith('RootModalFlow', {
      screen: 'AssetHideConfirmation',
      params: expect.anything(),
    });
  });

  it('handles "Token Details" press', () => {
    const mockParams = {
      params: {
        address: '0x123',
        chainId: '0x1',
        isNativeCurrency: false,
        asset: mockAsset as unknown as TokenI,
      },
    };
    const { getByText } = render(<AssetOptions route={mockParams} />);

    fireEvent.press(getByText('Token details'));
    jest.runAllTimers();
    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      'AssetDetails',
      expect.anything(),
    );
  });

  describe('Portfolio and Network Configuration', () => {
    const mockNetworkConfigurations = {
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
    };

    beforeEach(() => {
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectEvmNetworkConfigurationsByChainId)
          return mockNetworkConfigurations;
        return {};
      });
    });

    it('should use correct provider config', () => {
      render(
        <AssetOptions
          route={{
            params: {
              address: '0x123',
              chainId: '0x1',
              isNativeCurrency: false,
              asset: mockAsset as unknown as TokenI,
            },
          }}
        />,
      );

      expect(createProviderConfig).toHaveBeenCalledWith(
        mockNetworkConfigurations['0x1'],
        mockNetworkConfigurations['0x1'].rpcEndpoints[0],
      );
    });
  });

  it('displays Remove token option for non-EVM chains', () => {
    const mockNonEvmChainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
    const mockNonEvmAddress =
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

    mockIsNonEvmChainId.mockReturnValue(true);

    const { getByText } = render(
      <AssetOptions
        route={{
          params: {
            address: mockNonEvmAddress,
            chainId: mockNonEvmChainId,
            isNativeCurrency: false,
            asset: mockAsset as unknown as TokenI,
          },
        }}
      />,
    );

    // Remove token option should be visible for non-EVM chains (this is a change from before)
    expect(getByText('Remove token')).toBeOnTheScreen();
  });

  describe('removeToken functionality', () => {
    it('logs error when no account found for non-EVM token removal', async () => {
      const mockNonEvmChainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
      const mockNonEvmAddress =
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

      mockIsNonEvmChainId.mockReturnValue(true);
      // Ensure mock is a function that returns null
      mockSelectInternalAccountByScope.mockReset();
      mockSelectInternalAccountByScope.mockImplementation(() => null);

      const { getByText } = render(
        <AssetOptions
          route={{
            params: {
              address: mockNonEvmAddress,
              chainId: mockNonEvmChainId,
              isNativeCurrency: false,
              asset: mockAsset as unknown as TokenI,
            },
          }}
        />,
      );

      fireEvent.press(getByText('Remove token'));
      jest.runAllTimers();

      // Get the onConfirm callback from navigation params
      const navigateCall = mockNavigation.navigate.mock.calls.find(
        (call) => call[0] === 'RootModalFlow',
      );
      const onConfirm = navigateCall?.[1]?.params?.onConfirm;

      // Execute the onConfirm callback
      await onConfirm();

      // Verify Logger.log was called (either with the specific message or with an error)
      expect(Logger.log).toHaveBeenCalled();

      // Verify MultichainAssetsController.ignoreAssets was NOT called
      expect(
        Engine.context.MultichainAssetsController.ignoreAssets,
      ).not.toHaveBeenCalled();
    });

    it('calls TokensController.ignoreTokens for EVM tokens', async () => {
      const mockEvmAddress = '0x123';
      const mockEvmChainId = '0x1';

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
        if (selector.name === 'selectEvmChainId') return '0x1';
        if (selector.name === 'selectProviderConfig') return {};
        if (selector.name === 'selectTokenList')
          return { '0x123': { symbol: 'TEST' } };
        return {};
      });

      const { getByText } = render(
        <AssetOptions
          route={{
            params: {
              address: mockEvmAddress,
              chainId: mockEvmChainId,
              isNativeCurrency: false,
              asset: mockAsset as unknown as TokenI,
            },
          }}
        />,
      );

      fireEvent.press(getByText('Remove token'));
      jest.runAllTimers();

      // Get the onConfirm callback from navigation params
      const navigateCall = mockNavigation.navigate.mock.calls.find(
        (call) => call[0] === 'RootModalFlow',
      );
      const onConfirm = navigateCall?.[1]?.params?.onConfirm;

      // Execute the onConfirm callback
      await onConfirm();

      // Verify TokensController.ignoreTokens was called
      expect(Engine.context.TokensController.ignoreTokens).toHaveBeenCalledWith(
        [mockEvmAddress],
        'test-network',
      );

      // Verify notification was shown
      expect(NotificationManager.showSimpleNotification).toHaveBeenCalled();

      // Verify tracking event was fired
      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });

  describe('openPortfolio', () => {
    it('navigates to existing portfolio tab when found', () => {
      const mockPortfolioUrl = 'https://portfolio.metamask.io';
      (useSelector as jest.Mock).mockImplementation((selector) => {
        const selectorStr = selector.toString();
        if (
          selectorStr.includes('browser.tabs') ||
          typeof selector === 'function'
        ) {
          return [
            { id: 'tab1', url: mockPortfolioUrl },
            { id: 'tab2', url: 'https://example.com' },
          ];
        }
        return {};
      });

      const { getByText } = render(
        <AssetOptions
          route={{
            params: {
              address: '0x123',
              chainId: '0x1',
              isNativeCurrency: false,
              asset: mockAsset as unknown as TokenI,
            },
          }}
        />,
      );

      fireEvent.press(getByText('View on Portfolio'));
      jest.runAllTimers();

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        'BrowserHome',
        expect.objectContaining({
          screen: 'BrowserView',
          params: expect.objectContaining({
            existingTabId: 'tab1',
          }),
        }),
      );
    });

    it('creates new portfolio tab when none exists', () => {
      (useSelector as jest.Mock).mockImplementation((selector) => {
        const selectorStr = selector.toString();
        if (
          selectorStr.includes('browser.tabs') ||
          typeof selector === 'function'
        ) {
          return [{ id: 'tab1', url: 'https://example.com' }];
        }
        if (selectorStr.includes('dataCollectionForMarketing')) {
          return true;
        }
        return {};
      });

      const { getByText } = render(
        <AssetOptions
          route={{
            params: {
              address: '0x123',
              chainId: '0x1',
              isNativeCurrency: false,
              asset: mockAsset as unknown as TokenI,
            },
          }}
        />,
      );

      fireEvent.press(getByText('View on Portfolio'));
      jest.runAllTimers();

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        'BrowserHome',
        expect.objectContaining({
          screen: 'BrowserView',
          params: expect.objectContaining({
            newTabUrl: expect.stringContaining('portfolio.metamask.io'),
          }),
        }),
      );

      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });

  describe('openOnBlockExplorer', () => {
    it('navigates to base URL for native currency', async () => {
      (InAppBrowser.isAvailable as jest.Mock).mockResolvedValue(false);

      const { getByText } = render(
        <AssetOptions
          route={{
            params: {
              address: '0x0',
              chainId: '0x1',
              isNativeCurrency: true,
              asset: mockAsset as unknown as TokenI,
            },
          }}
        />,
      );

      fireEvent.press(getByText('View on block explorer'));
      jest.runAllTimers();

      await waitFor(() => {
        expect(mockNavigation.navigate).toHaveBeenCalledWith('Webview', {
          screen: 'SimpleWebview',
          params: {
            url: 'https://example-explorer.com',
            title: 'example-explorer.com',
          },
        });
      });
    });

    it('uses non-EVM block explorer for Solana chains', async () => {
      const mockNonEvmChainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
      const mockNonEvmAddress =
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

      mockIsNonEvmChainId.mockReturnValue(true);
      (InAppBrowser.isAvailable as jest.Mock).mockResolvedValue(true);

      const { getByText } = render(
        <AssetOptions
          route={{
            params: {
              address: mockNonEvmAddress,
              chainId: mockNonEvmChainId,
              isNativeCurrency: false,
              asset: mockAsset as unknown as TokenI,
            },
          }}
        />,
      );

      fireEvent.press(getByText('View on block explorer'));
      jest.runAllTimers();

      await waitFor(() => {
        expect(InAppBrowser.open).toHaveBeenCalled();
      });
    });
  });

  describe('openTokenDetails', () => {
    it('displays options correctly for non-EVM chains', () => {
      const mockNonEvmChainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
      const mockNonEvmAddress =
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

      mockIsNonEvmChainId.mockReturnValue(true);

      const { getByText } = render(
        <AssetOptions
          route={{
            params: {
              address: mockNonEvmAddress,
              chainId: mockNonEvmChainId,
              isNativeCurrency: false,
              asset: mockAsset as unknown as TokenI,
            },
          }}
        />,
      );

      expect(getByText('Remove token')).toBeOnTheScreen();
    });
  });
});
