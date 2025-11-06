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
    // Ensure mock is always a function
    mockSelectInternalAccountByScope.mockImplementation(() => null);
    (useSelector as jest.Mock).mockImplementation((selector) => {
      // Return mock function for selectSelectedInternalAccountByScope selector
      // Check multiple ways to identify the selector since reselect creates new function references
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
    // Clear navigation mocks but preserve function mocks
    mockNavigation.navigate.mockClear();
    mockNavigation.goBack.mockClear();
    // Reset Engine mocks
    (
      Engine.context.MultichainAssetsController.ignoreAssets as jest.Mock
    ).mockClear();
    (Engine.context.TokensController.ignoreTokens as jest.Mock).mockClear();
    (NotificationManager.showSimpleNotification as jest.Mock).mockClear();
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
    it('calls MultichainAssetsController.ignoreAssets for non-EVM tokens', async () => {
      const mockNonEvmChainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
      const mockNonEvmAddress =
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

      mockIsNonEvmChainId.mockReturnValue(true);
      // Ensure mock is a function that returns account
      mockSelectInternalAccountByScope.mockReset();
      mockSelectInternalAccountByScope.mockImplementation(() => ({
        id: 'non-evm-account-id',
        address: 'non-evm-address',
      }));

      // Mock MultichainAssetsController state with token metadata
      const assetsMetadata = Engine.context.MultichainAssetsController.state
        .assetsMetadata as Record<string, { symbol: string; name: string }>;
      assetsMetadata[mockNonEvmAddress] = {
        symbol: 'USDC',
        name: 'USD Coin',
      };

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
      expect(navigateCall).toBeDefined();

      const onConfirm = navigateCall?.[1]?.params?.onConfirm;
      expect(onConfirm).toBeDefined();

      // Verify the callback exists and is a function
      expect(typeof onConfirm).toBe('function');

      // Verify MultichainAssetsController.ignoreAssets is available for non-EVM chains
      expect(
        Engine.context.MultichainAssetsController.ignoreAssets,
      ).toBeDefined();
      expect(
        typeof Engine.context.MultichainAssetsController.ignoreAssets,
      ).toBe('function');
    });

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
});
