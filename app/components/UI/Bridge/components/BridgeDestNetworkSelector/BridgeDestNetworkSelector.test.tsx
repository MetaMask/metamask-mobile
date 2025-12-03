import { initialState } from '../../_mocks_/initialState';
import { fireEvent } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { BridgeDestNetworkSelector } from '.';
import Routes from '../../../../../constants/navigation/Routes';
import { Hex } from '@metamask/utils';
import { setSelectedDestChainId } from '../../../../../core/redux/slices/bridge';
import { formatChainIdToCaip } from '@metamask/bridge-controller';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('../../../../../core/redux/slices/bridge', () => {
  const actual = jest.requireActual('../../../../../core/redux/slices/bridge');
  return {
    __esModule: true,
    ...actual,
    default: actual.default,
    setSelectedDestChainId: jest.fn(actual.setSelectedDestChainId),
  };
});

describe('BridgeDestNetworkSelector', () => {
  const mockChainId = '0x1' as Hex;
  const optimismChainId = '0xa' as Hex;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with initial state and displays networks', () => {
    const { getByText, toJSON } = renderScreen(
      BridgeDestNetworkSelector,
      {
        name: Routes.BRIDGE.MODALS.DEST_NETWORK_SELECTOR,
      },
      { state: initialState },
    );

    // Header should be visible
    expect(getByText('Select network')).toBeTruthy();

    // Networks should be visible
    expect(getByText('Optimism')).toBeTruthy();

    expect(toJSON()).toMatchSnapshot();
  });

  it('handles network selection correctly', () => {
    const { getByText } = renderScreen(
      BridgeDestNetworkSelector,
      {
        name: Routes.BRIDGE.MODALS.DEST_NETWORK_SELECTOR,
      },
      { state: initialState },
    );

    // Click on Optimism network
    const optimismNetwork = getByText('Optimism');
    fireEvent.press(optimismNetwork);

    // Should call setSelectedDestChainId with optimismChainId
    expect(setSelectedDestChainId).toHaveBeenCalledWith(optimismChainId);

    // Should navigate back
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('handles close button correctly', () => {
    const { getByTestId } = renderScreen(
      BridgeDestNetworkSelector,
      {
        name: Routes.BRIDGE.MODALS.DEST_NETWORK_SELECTOR,
      },
      { state: initialState },
    );

    const closeButton = getByTestId('bridge-network-selector-close-button');
    fireEvent.press(closeButton);

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('only displays active destination networks', () => {
    // Create a state with a network that has isActiveDest set to false
    const stateWithInactiveDest = {
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              bridgeConfig: {
                minimumVersion: '0.0.0',
                maxRefreshCount: 5,
                refreshRate: 30000,
                support: true,
                chains: {
                  [formatChainIdToCaip(mockChainId)]: {
                    isActiveSrc: true,
                    isActiveDest: false,
                  }, // Set Ethereum to inactive as dest
                  [formatChainIdToCaip(optimismChainId)]: {
                    isActiveSrc: true,
                    isActiveDest: true,
                  },
                },
              },
              bridgeConfigV2: {
                minimumVersion: '0.0.0',
                maxRefreshCount: 5,
                refreshRate: 30000,
                support: true,
                chains: {
                  [formatChainIdToCaip(mockChainId)]: {
                    isActiveSrc: true,
                    isActiveDest: false,
                  }, // Set Ethereum to inactive as dest
                  [formatChainIdToCaip(optimismChainId)]: {
                    isActiveSrc: true,
                    isActiveDest: true,
                  },
                },
              },
            },
          },
        },
      },
    };

    const { queryByText } = renderScreen(
      BridgeDestNetworkSelector,
      {
        name: Routes.BRIDGE.MODALS.DEST_NETWORK_SELECTOR,
      },
      { state: stateWithInactiveDest },
    );

    // Ethereum should not be visible as it's not active as a destination
    expect(queryByText('Ethereum Mainnet')).toBeNull();

    // Optimism and Base should be visible
    expect(queryByText('Optimism')).toBeTruthy();
  });
});

describe('BridgeDestNetworkSelector - ChainPopularity fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('assigns Infinity to chains without defined popularity', () => {
    // Add networks with and without defined popularity to test all branch combinations:
    // - Optimism: HAS defined popularity (10 in ChainPopularity)
    // - Palm: NO defined popularity (triggers ?? Infinity)
    // - zkSync Era: NO defined popularity (triggers ?? Infinity)
    // This ensures all branch combinations are tested:
    // 1. Both have defined popularity (Optimism already tested in existing tests)
    // 2. Both lack defined popularity (Palm vs zkSync Era)
    // 3. One has, one doesn't (Optimism vs Palm/zkSync)
    const stateWithMultipleNetworks = {
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              bridgeConfig: {
                minimumVersion: '0.0.0',
                maxRefreshCount: 5,
                refreshRate: 30000,
                support: true,
                chains: {
                  'eip155:1': {
                    isActiveSrc: true,
                    isActiveDest: true,
                  },
                  'eip155:10': {
                    // Optimism - HAS defined popularity
                    isActiveSrc: true,
                    isActiveDest: true,
                  },
                  'eip155:11297108109': {
                    // Palm - NOT in ChainPopularity
                    isActiveSrc: true,
                    isActiveDest: true,
                  },
                  'eip155:324': {
                    // zkSync Era - NOT in ChainPopularity
                    isActiveSrc: true,
                    isActiveDest: true,
                  },
                },
              },
              bridgeConfigV2: {
                minimumVersion: '0.0.0',
                maxRefreshCount: 5,
                refreshRate: 30000,
                support: true,
                chains: {
                  'eip155:1': {
                    isActiveSrc: true,
                    isActiveDest: true,
                    isGaslessSwapEnabled: true,
                  },
                  'eip155:10': {
                    // Optimism
                    isActiveSrc: true,
                    isActiveDest: true,
                    isGaslessSwapEnabled: false,
                  },
                  'eip155:11297108109': {
                    // Palm
                    isActiveSrc: true,
                    isActiveDest: true,
                    isGaslessSwapEnabled: false,
                  },
                  'eip155:324': {
                    // zkSync Era
                    isActiveSrc: true,
                    isActiveDest: true,
                    isGaslessSwapEnabled: false,
                  },
                },
              },
            },
          },
        },
      },
    };

    const { getByText } = renderScreen(
      BridgeDestNetworkSelector,
      {
        name: Routes.BRIDGE.MODALS.DEST_NETWORK_SELECTOR,
      },
      { state: stateWithMultipleNetworks },
    );

    // All three networks should be visible and sorted by popularity
    // Optimism (popularity 10) should appear before Palm and zkSync Era (both Infinity)
    expect(getByText('Optimism')).toBeTruthy();
    expect(getByText('Palm')).toBeTruthy();
    expect(getByText('zkSync')).toBeTruthy();
  });
});
