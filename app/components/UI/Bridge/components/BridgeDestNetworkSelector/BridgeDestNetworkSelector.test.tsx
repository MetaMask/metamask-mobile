import { fireEvent } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { BridgeDestNetworkSelector } from '.';
import Routes from '../../../../../constants/navigation/Routes';
import { Hex } from '@metamask/utils';
import { setSelectedDestChainId } from '../../../../../core/redux/slices/bridge';
import {
  BridgeFeatureFlagsKey,
  formatChainIdToCaip,
} from '@metamask/bridge-controller';
import { initialState } from '../../_mocks_/initialState';

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
    expect(getByText('Ethereum Mainnet')).toBeTruthy();
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
          BridgeController: {
            bridgeFeatureFlags: {
              [BridgeFeatureFlagsKey.MOBILE_CONFIG]: {
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
