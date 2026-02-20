import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import NetworkListBottomSheet, {
  NETWORK_LIST_BOTTOM_SHEET,
} from './NetworkListBottomSheet';
import { Hex } from '@metamask/utils';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { strings } from '../../../../../../locales/i18n';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../../../../../util/networks', () => ({
  ...jest.requireActual('../../../../../util/networks'),
  getNetworkImageSource: jest.fn(() => ({ uri: 'mock-image-uri' })),
}));

const mockSetSelectedNetwork = jest.fn();
const mockSetOpenNetworkSelector = jest.fn();
const mockSheetRef = { current: null };

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      NetworkController: {
        ...backgroundState.NetworkController,
        networkConfigurationsByChainId: {
          '0x1': {
            chainId: '0x1' as Hex,
            name: 'Ethereum Mainnet',
            nativeCurrency: 'ETH',
            rpcEndpoints: [{ networkClientId: 'mainnet' }],
          },
          '0x89': {
            chainId: '0x89' as Hex,
            name: 'Polygon',
            nativeCurrency: 'POL',
            rpcEndpoints: [{ networkClientId: 'polygon' }],
          },
        } as Record<
          string,
          {
            chainId: Hex;
            name: string;
            nativeCurrency: string;
            rpcEndpoints: { networkClientId: string }[];
          }
        >,
      },
    },
  },
};

const defaultProps = {
  selectedNetwork: '0x1' as Hex,
  setSelectedNetwork: mockSetSelectedNetwork,
  setOpenNetworkSelector: mockSetOpenNetworkSelector,
  sheetRef: mockSheetRef,
};

const renderComponent = (
  overrides: {
    props?: Partial<typeof defaultProps>;
    state?: typeof mockInitialState;
  } = {},
) =>
  renderWithProvider(
    <NetworkListBottomSheet {...defaultProps} {...overrides.props} />,
    { state: overrides.state ?? mockInitialState },
  );

describe('NetworkListBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title and all network names', () => {
    const { getByText } = renderComponent();

    expect(getByText(strings('networks.select_network'))).toBeOnTheScreen();
    expect(getByText('Ethereum Mainnet')).toBeOnTheScreen();
    expect(getByText('Polygon')).toBeOnTheScreen();
  });

  it('calls setSelectedNetwork when a network is pressed', () => {
    const { getByText } = renderComponent();

    fireEvent.press(getByText('Polygon'));

    expect(mockSetSelectedNetwork).toHaveBeenCalledWith('0x89');
  });

  it('renders no networks when config is empty', () => {
    const emptyNetworkState = {
      ...mockInitialState,
      engine: {
        ...mockInitialState.engine,
        backgroundState: {
          ...mockInitialState.engine.backgroundState,
          NetworkController: {
            ...mockInitialState.engine.backgroundState.NetworkController,
            networkConfigurationsByChainId: {},
          },
        },
      },
    };

    const { queryByText } = renderComponent({ state: emptyNetworkState });

    expect(queryByText('Ethereum Mainnet')).toBeNull();
    expect(queryByText('Polygon')).toBeNull();
  });

  it('calls setOpenNetworkSelector(false) when BottomSheet is closed', () => {
    const { getByTestId } = renderComponent();

    fireEvent(getByTestId(NETWORK_LIST_BOTTOM_SHEET), 'onClose');

    expect(mockSetOpenNetworkSelector).toHaveBeenCalledWith(false);
  });
});
