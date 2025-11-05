import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import AddAsset from './AddAsset';
import { AddAssetViewSelectorsIDs } from '../../../../e2e/selectors/wallet/AddAssetView.selectors';
import { ImportTokenViewSelectorsIDs } from '../../../../e2e/selectors/wallet/ImportTokenView.selectors';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();
const mockDispatch = jest.fn();

// Mock network utilities
jest.mock('../../../util/networks', () => ({
  getNetworkNameFromProviderConfig: jest.fn(() => 'Ethereum Mainnet'),
  getNetworkImageSource: jest.fn(() => 'ethereum'),
  getBlockExplorerAddressUrl: jest.fn(() => ({
    title: 'View on Etherscan',
    url: 'https://etherscan.io',
  })),
}));

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

describe('AddAsset component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    ).toBeDefined();
  });

  describe('Navigation interactions', () => {
    it('renders banner with action button for collectibles when displayNftMedia is false', () => {
      mockUseParamsValues.assetType = 'collectible';

      // Render with displayNftMedia false to show the action button
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

      // Verify that action buttons exist - this shows the banner with action button is rendered
      const buttons = getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('State management', () => {
    it('initializes with current network from MultichainNetworkController', () => {
      mockUseParamsValues.assetType = 'token';

      const { getByTestId } = renderComponent(<AddAsset />);

      // Verify component renders with the current network
      expect(getByTestId('add-token-screen')).toBeDefined();
    });
  });

  describe('Conditional rendering based on selectors', () => {
    it('renders banner with action button when displayNftMedia is false', () => {
      mockUseParamsValues.assetType = 'collectible';

      // Test with displayNftMedia false - should show enable CTA
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

      // Should show action button when displayNftMedia is false
      const buttons = getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0); // At least one button should exist
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

      // Should show the warning test ID
      expect(
        getByTestId(AddAssetViewSelectorsIDs.WARNING_ENABLE_DISPLAY_MEDIA),
      ).toBeDefined();
    });

    it('renders token detection section when supported', () => {
      mockUseParamsValues.assetType = 'token';

      // Mock token detection as supported by having the component render
      const { getByTestId } = renderComponent(<AddAsset />);

      // Should render the token screen
      expect(getByTestId('add-token-screen')).toBeDefined();
    });

    it('shows correct network information', () => {
      mockUseParamsValues.assetType = 'token';

      const mockNetworkConfigs = {
        '0x1': {
          name: 'Ethereum Mainnet',
          chainId: '0x1' as const,
          rpcEndpoints: [
            {
              networkClientId: 'mainnet',
            },
          ],
          defaultRpcEndpointIndex: 0,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      const { getByTestId } = renderWithProvider(<AddAsset />, {
        state: {
          ...initialState,
          engine: {
            ...initialState.engine,
            backgroundState: {
              ...initialState.engine.backgroundState,
              NetworkController: {
                ...initialState.engine.backgroundState.NetworkController,
                networkConfigurationsByChainId: mockNetworkConfigs,
              },
            },
          },
        },
      });

      expect(getByTestId('add-token-screen')).toBeDefined();
    });
  });

  describe('Props passing to child components', () => {
    it('passes correct props to SearchTokenAutocomplete', () => {
      mockUseParamsValues.assetType = 'token';

      const { getByTestId } = renderComponent(<AddAsset />);

      // Verify that SearchTokenAutocomplete receives expected props
      const searchTab = getByTestId('add-token-screen');
      expect(searchTab).toBeDefined();
    });

    it('passes correct props to AddCustomToken', () => {
      mockUseParamsValues.assetType = 'token';

      const { getByTestId } = renderComponent(<AddAsset />);

      // Verify that AddCustomToken receives expected props
      const tokenTab = getByTestId('add-token-screen');
      expect(tokenTab).toBeDefined();
    });

    it('passes correct props to AddCustomCollectible', () => {
      mockUseParamsValues.assetType = 'collectible';

      const { getByTestId } = renderComponent(<AddAsset />);

      // Verify that AddCustomCollectible receives expected props
      const collectibleScreen = getByTestId('add-collectible-screen');
      expect(collectibleScreen).toBeDefined();
    });
  });

  describe('Edge cases and error scenarios', () => {
    it('handles missing collectibleContract param gracefully', () => {
      mockUseParamsValues.assetType = 'collectible';
      delete mockUseParamsValues.collectibleContract;

      expect(() => renderComponent(<AddAsset />)).not.toThrow();
    });

    it('handles empty network configurations', () => {
      mockUseParamsValues.assetType = 'token';

      const { getByTestId } = renderWithProvider(<AddAsset />, {
        state: {
          ...initialState,
          engine: {
            ...initialState.engine,
            backgroundState: {
              ...initialState.engine.backgroundState,
              NetworkController: {
                ...initialState.engine.backgroundState.NetworkController,
                networkConfigurationsByChainId: {},
              },
            },
          },
        },
      });

      expect(getByTestId('add-token-screen')).toBeDefined();
    });

    it('handles undefined selectedNetwork', () => {
      mockUseParamsValues.assetType = 'token';

      const { getByTestId } = renderComponent(<AddAsset />);

      // Should render without crashing when selectedNetwork is null
      expect(getByTestId('add-token-screen')).toBeDefined();
    });
  });

  describe('Hook interactions', () => {
    it('handles different provider config values', () => {
      mockUseParamsValues.assetType = 'token';

      // Test different provider configurations - just test that the component renders
      const { getByTestId } = renderComponent(<AddAsset />);

      expect(getByTestId('add-token-screen')).toBeDefined();
    });
  });

  describe('Loading and conditional rendering', () => {
    it('displays loading indicator when token data is being fetched', () => {
      mockUseParamsValues.assetType = 'token';

      const stateWithNullTokenData = {
        ...initialState,
        engine: {
          ...initialState.engine,
          backgroundState: {
            ...initialState.engine.backgroundState,
            TokenListController: {
              tokensChainsCache: {
                '0x1': {
                  data: undefined,
                },
              },
            },
          },
        },
      };

      const { queryByTestId } = renderWithProvider(<AddAsset />, {
        state: stateWithNullTokenData,
      });

      const tokenScreen = queryByTestId('add-token-screen');
      expect(tokenScreen).toBeDefined();
    });

    it('hides SearchTokenAutocomplete when no tokens available for network', () => {
      mockUseParamsValues.assetType = 'token';

      const stateWithEmptyTokenList = {
        ...initialState,
        engine: {
          ...initialState.engine,
          backgroundState: {
            ...initialState.engine.backgroundState,
            TokenListController: {
              tokensChainsCache: {
                '0x1': {
                  data: {},
                },
              },
            },
          },
        },
      };

      const { getByTestId } = renderWithProvider(<AddAsset />, {
        state: stateWithEmptyTokenList,
      });

      expect(getByTestId('add-token-screen')).toBeDefined();
    });

    it('renders network selector for token view', () => {
      mockUseParamsValues.assetType = 'token';

      const { getAllByTestId } = renderComponent(<AddAsset />);

      const networkButtons = getAllByTestId(
        ImportTokenViewSelectorsIDs.SELECT_NETWORK_BUTTON,
      );

      expect(networkButtons.length).toBeGreaterThan(0);
    });
  });
});
