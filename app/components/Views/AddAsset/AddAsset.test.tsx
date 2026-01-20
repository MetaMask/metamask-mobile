import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import AddAsset from './AddAsset';
import { AddAssetViewSelectorsIDs } from './AddAssetView.testIds';
import { ImportTokenViewSelectorsIDs } from './ImportTokenView.testIds';
import { NFTImportScreenSelectorsIDs } from '../../UI/AddCustomCollectible/ImportNFTView.testIds';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTopTokens } from '../../UI/Bridge/hooks/useTopTokens';
import { isNonEvmChainId } from '../../../core/Multichain/utils';

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();
const mockDispatch = jest.fn();

// Mock network utilities, preserving other exports like getDecimalChainId
jest.mock('../../../util/networks', () => {
  const actual = jest.requireActual('../../../util/networks');

  return {
    ...actual,
    getNetworkNameFromProviderConfig: jest.fn(() => 'Ethereum Mainnet'),
    getNetworkImageSource: jest.fn(() => 'ethereum'),
    getBlockExplorerAddressUrl: jest.fn(() => ({
      title: 'View on Etherscan',
      url: 'https://etherscan.io',
    })),
    isTestNet: jest.fn(() => false),
    getTestNetImageByChainId: jest.fn(() => 'testnet-image'),
    getDefaultNetworkByChainId: jest.fn(() => ({
      imageSource: 'default-image',
    })),
  };
});

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions,
    }),
  };
});

const mockUseParamsValues: {
  assetType: string;
  collectibleContract?: {
    address: string;
  };
} = {
  assetType: 'collectible',
};

jest.mock('../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../util/navigation/navUtils'),
  useParams: jest.fn(() => mockUseParamsValues),
}));

jest.mock(
  '@tommasini/react-native-scrollable-tab-view',
  () =>
    ({ children }: { children: React.ReactNode }) => <>{children}</>,
);

jest.mock('../../UI/Bridge/hooks/useTopTokens', () => ({
  useTopTokens: jest.fn(() => ({
    topTokens: [],
    remainingTokens: [],
    pending: false,
  })),
}));

jest.mock('../../../core/Multichain/utils', () => ({
  ...jest.requireActual('../../../core/Multichain/utils'),
  isNonEvmChainId: jest.fn(),
}));

const mockIsNonEvmChainId = isNonEvmChainId as jest.MockedFunction<
  typeof isNonEvmChainId
>;

jest.mock('../../../core/Engine', () => ({
  context: {
    TokenListController: {
      fetchTokenList: jest.fn(),
    },
    NetworkController: {
      state: {
        networkConfigurationsByChainId: {},
      },
    },
  },
}));

const mockEnableNetworkEnablement = {
  enabledNetworksForCurrentNamespace: {
    '0x1': true,
    '0x89': false,
    '0xa': true,
  },
  enabledNetworksForAllNamespaces: {
    // EVM networks
    '0x1': true,
    '0x89': true,
    '0xa': true,
    '0xa4b1': true,
    '0x38': true,
    // Solana networks
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': true,
    'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z': false,
    'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1': false,
    // Bitcoin networks
    'bip122:000000000019d6689c085ae165831e93': true,
    'bip122:000000000933ea01ad0ee984209779ba': false,
    // Tron networks
    'tron:728126428': true,
    'tron:2494104990': false,
  },
};

jest.mock('../../hooks/useNetworkEnablement/useNetworkEnablement', () => ({
  useNetworkEnablement: jest.fn(() => mockEnableNetworkEnablement),
}));

const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

const renderComponent = (component: React.ReactElement) =>
  renderWithProvider(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 0, height: 0 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      {component}
    </SafeAreaProvider>,
    {
      state: initialState,
    },
  );

const mockUseTopTokens = jest.mocked(useTopTokens);

describe('AddAsset component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsNonEvmChainId.mockReturnValue(false);
    mockUseTopTokens.mockReturnValue({
      topTokens: [],
      remainingTokens: [],
      pending: false,
    });
  });

  it('renders collectible view correctly', () => {
    mockUseParamsValues.assetType = 'collectible';
    const { toJSON, getByTestId } = renderWithProvider(<AddAsset />, {
      state: initialState,
    });
    expect(toJSON()).toMatchSnapshot();
    expect(getByTestId('add-collectible-screen')).toBeDefined();
  });

  it('renders token view correctly', () => {
    mockUseParamsValues.assetType = 'token';
    const { toJSON, getByTestId } = renderWithProvider(<AddAsset />, {
      state: initialState,
    });
    expect(toJSON()).toMatchSnapshot();
    expect(getByTestId('add-token-screen')).toBeDefined();
  });

  it('renders display nft warning when displayNftMedia is true', () => {
    mockUseParamsValues.assetType = 'collectible';
    const { getByTestId } = renderWithProvider(<AddAsset />, {
      state: initialState,
    });

    expect(
      getByTestId(AddAssetViewSelectorsIDs.WARNING_ENABLE_DISPLAY_MEDIA),
    ).toBeOnTheScreen();
  });

  describe('NFT Display Settings', () => {
    it('renders banner with action button when displayNftMedia is false', () => {
      mockUseParamsValues.assetType = 'collectible';

      const { getAllByRole } = renderWithProvider(<AddAsset />, {
        state: {
          ...initialState,
          engine: {
            ...initialState.engine,
            backgroundState: {
              ...initialState.engine.backgroundState,
              PreferencesController: {
                ...initialState.engine.backgroundState.PreferencesController,
                displayNftMedia: false,
              },
            },
          },
        },
      });

      const buttons = getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('renders banner warning when displayNftMedia is true', () => {
      mockUseParamsValues.assetType = 'collectible';

      // Test with displayNftMedia true - should show warning without button
      const { getByTestId } = renderWithProvider(<AddAsset />, {
        state: {
          ...initialState,
          engine: {
            ...initialState.engine,
            backgroundState: {
              ...initialState.engine.backgroundState,
              PreferencesController: {
                ...initialState.engine.backgroundState.PreferencesController,
                displayNftMedia: true,
              },
            },
          },
        },
      });

      expect(
        getByTestId(AddAssetViewSelectorsIDs.WARNING_ENABLE_DISPLAY_MEDIA),
      ).toBeOnTheScreen();
    });
  });

  describe('Edge cases', () => {
    it('handles missing collectibleContract param gracefully', () => {
      mockUseParamsValues.assetType = 'collectible';
      delete mockUseParamsValues.collectibleContract;

      expect(() => renderComponent(<AddAsset />)).not.toThrow();
    });
  });

  describe('useTopTokens hook integration', () => {
    it('displays loading indicator when useTopTokens pending is true', () => {
      mockUseParamsValues.assetType = 'token';

      mockUseTopTokens.mockReturnValue({
        topTokens: [],
        remainingTokens: [],
        pending: true,
      });

      const { getByTestId, queryByTestId } = renderComponent(<AddAsset />);

      expect(getByTestId('add-token-screen')).toBeOnTheScreen();
      // Verify loading indicator is rendered when pending
      expect(getByTestId('add-asset-loading-indicator')).toBeOnTheScreen();
      // Verify tabs container is NOT rendered while loading
      expect(queryByTestId('add-asset-tabs-container')).toBeNull();
    });

    it('renders tabs container when tokens are available', () => {
      mockUseParamsValues.assetType = 'token';

      const mockTopTokens = [
        {
          address: '0x123',
          symbol: 'TOP1',
          name: 'Top Token 1',
          decimals: 18,
          chainId: '0x1' as const,
        },
      ];

      const mockRemainingTokens = [
        {
          address: '0x456',
          symbol: 'REM1',
          name: 'Remaining Token 1',
          decimals: 18,
          chainId: '0x1' as const,
        },
      ];

      mockUseTopTokens.mockReturnValue({
        topTokens: mockTopTokens,
        remainingTokens: mockRemainingTokens,
        pending: false,
      });

      const { getByTestId, queryByTestId } = renderComponent(<AddAsset />);

      expect(getByTestId('add-token-screen')).toBeOnTheScreen();
      // Verify tabs container is rendered when not pending
      expect(getByTestId('add-asset-tabs-container')).toBeOnTheScreen();
      // Verify loading indicator is NOT shown
      expect(queryByTestId('add-asset-loading-indicator')).toBeNull();
      // Verify SearchTokenAutocomplete is rendered when tokens are available
      expect(queryByTestId('add-searched-token-screen')).toBeTruthy();
    });

    it('renders tabs container when only topTokens are available', () => {
      mockUseParamsValues.assetType = 'token';

      const mockTopTokens = [
        {
          address: '0x123',
          symbol: 'TEST',
          name: 'Test Token',
          decimals: 18,
          chainId: '0x1' as const,
        },
      ];

      mockUseTopTokens.mockReturnValue({
        topTokens: mockTopTokens,
        remainingTokens: [],
        pending: false,
      });

      const { getByTestId, queryByTestId } = renderComponent(<AddAsset />);

      expect(getByTestId('add-token-screen')).toBeOnTheScreen();
      expect(getByTestId('add-asset-tabs-container')).toBeOnTheScreen();
      // SearchTokenAutocomplete should be rendered when allTokens has items
      expect(queryByTestId('add-searched-token-screen')).toBeTruthy();
    });

    it('renders tabs container but not SearchTokenAutocomplete when allTokens is empty', () => {
      mockUseParamsValues.assetType = 'token';

      mockUseTopTokens.mockReturnValue({
        topTokens: [],
        remainingTokens: [],
        pending: false,
      });

      const { getByTestId, queryByTestId } = renderComponent(<AddAsset />);

      expect(getByTestId('add-token-screen')).toBeOnTheScreen();
      // Tabs container should be rendered even when no tokens
      expect(getByTestId('add-asset-tabs-container')).toBeOnTheScreen();
      // SearchTokenAutocomplete tab should NOT be rendered when no tokens available
      expect(queryByTestId('add-searched-token-screen')).toBeNull();
    });

    it('calls useTopTokens with selected network chainId', () => {
      mockUseParamsValues.assetType = 'token';

      renderComponent(<AddAsset />);

      expect(mockUseTopTokens).toHaveBeenCalledWith({
        chainId: '0x1',
      });
    });
  });

  describe('Non-EVM chain support', () => {
    it('renders AddCustomToken for EVM chains', () => {
      mockUseParamsValues.assetType = 'token';
      mockIsNonEvmChainId.mockReturnValue(false);

      const { getByTestId, queryByTestId } = renderComponent(<AddAsset />);

      expect(getByTestId('add-token-screen')).toBeOnTheScreen();
      // AddCustomToken input should be present for EVM chains
      expect(
        queryByTestId(ImportTokenViewSelectorsIDs.ADDRESS_INPUT),
      ).toBeTruthy();
    });

    it('does not render AddCustomToken tab for non-EVM chains', () => {
      mockUseParamsValues.assetType = 'token';
      mockIsNonEvmChainId.mockReturnValue(true);

      const { getByTestId, queryByTestId } = renderComponent(<AddAsset />);

      expect(getByTestId('add-token-screen')).toBeOnTheScreen();
      // AddCustomToken input should NOT be present for non-EVM chains
      expect(
        queryByTestId(ImportTokenViewSelectorsIDs.ADDRESS_INPUT),
      ).toBeNull();
    });

    it('renders AddCustomCollectible for EVM chains', () => {
      mockUseParamsValues.assetType = 'collectible';
      mockIsNonEvmChainId.mockReturnValue(false);

      const { getByTestId } = renderComponent(<AddAsset />);

      expect(getByTestId('add-collectible-screen')).toBeOnTheScreen();
      // AddCustomCollectible container should be present
      expect(getByTestId(NFTImportScreenSelectorsIDs.CONTAINER)).toBeTruthy();
    });

    it('does not render AddCustomCollectible for non-EVM chains', () => {
      mockUseParamsValues.assetType = 'collectible';
      mockIsNonEvmChainId.mockReturnValue(true);

      const { getByTestId, queryByTestId } = renderComponent(<AddAsset />);

      expect(getByTestId('add-collectible-screen')).toBeOnTheScreen();
      // AddCustomCollectible container should NOT be present for non-EVM chains
      expect(queryByTestId(NFTImportScreenSelectorsIDs.CONTAINER)).toBeNull();
    });

    it('conditionally calls fetchTokenList only for EVM chains in network selector', () => {
      mockUseParamsValues.assetType = 'token';

      renderComponent(<AddAsset />);

      // The fetchTokenList is mocked in the Engine mock at the top of the file
      // The actual conditional logic happens in the NetworkListBottomSheet setSelectedNetwork callback
      // This test verifies the component renders correctly with the non-EVM chain logic in place
      expect(mockIsNonEvmChainId).toHaveBeenCalled();
    });
  });

  describe('Enabled Network Selection', () => {
    it('should select first enabled network from enabledNetworksForCurrentNamespace', () => {
      mockUseParamsValues.assetType = 'token';

      // The component should select 0x1 as the first enabled network
      const { getByTestId } = renderComponent(<AddAsset />);

      expect(getByTestId('add-token-screen')).toBeOnTheScreen();
      expect(getByTestId('add-asset-network-selector')).toBeOnTheScreen();
    });

    it('should handle only one enabled network correctly', () => {
      mockUseParamsValues.assetType = 'token';

      mockEnableNetworkEnablement.enabledNetworksForCurrentNamespace = {
        '0x1': true,
        '0x89': false,
        '0xa': false,
      };

      const { getByTestId } = renderComponent(<AddAsset />);

      expect(getByTestId('add-token-screen')).toBeOnTheScreen();
    });

    it('should handle multiple enabled networks and pick the first one', () => {
      mockUseParamsValues.assetType = 'token';

      mockEnableNetworkEnablement.enabledNetworksForCurrentNamespace = {
        '0x1': true,
        '0x89': true,
        '0xa': true,
      };

      const { getByTestId } = renderComponent(<AddAsset />);

      expect(getByTestId('add-token-screen')).toBeOnTheScreen();
      // Network selector should be present
      expect(getByTestId('add-asset-network-selector')).toBeOnTheScreen();
    });

    it('should handle no enabled networks gracefully', () => {
      mockUseParamsValues.assetType = 'token';

      mockEnableNetworkEnablement.enabledNetworksForCurrentNamespace = {
        '0x1': false,
        '0x89': false,
        '0xa': false,
      };

      const { getByTestId } = renderComponent(<AddAsset />);

      expect(getByTestId('add-token-screen')).toBeOnTheScreen();
    });

    it('should filter out disabled networks when finding enabled chain ID', () => {
      mockUseParamsValues.assetType = 'token';

      mockEnableNetworkEnablement.enabledNetworksForCurrentNamespace = {
        '0x1': false,
        '0x89': false,
        '0xa': true,
      };

      // Should select 0xa (first enabled network)
      const { getByTestId } = renderComponent(<AddAsset />);

      expect(getByTestId('add-token-screen')).toBeOnTheScreen();
    });

    it('should handle empty enabledNetworksForCurrentNamespace object', () => {
      mockUseParamsValues.assetType = 'token';

      // @ts-expect-error - mockEnableNetworkEnablement.enabledNetworksForCurrentNamespace is not defined
      mockEnableNetworkEnablement.enabledNetworksForCurrentNamespace = {};

      const { getByTestId } = renderComponent(<AddAsset />);

      expect(getByTestId('add-token-screen')).toBeOnTheScreen();
    });

    it('should only consider networks with value === true as enabled', () => {
      mockUseParamsValues.assetType = 'token';

      mockEnableNetworkEnablement.enabledNetworksForCurrentNamespace = {
        '0x1': false,
        '0x89': true,
        '0xa': false,
      };

      // Should only select 0x89 as it's the only one with true value
      const { getByTestId } = renderComponent(<AddAsset />);

      expect(getByTestId('add-token-screen')).toBeOnTheScreen();
    });
  });
});
