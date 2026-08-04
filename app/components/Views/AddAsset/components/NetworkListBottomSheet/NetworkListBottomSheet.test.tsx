import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { FlashList } from '@shopify/flash-list';
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

const buildNetworkConfigurations = (count: number) =>
  Object.fromEntries(
    Array.from({ length: count }, (_, index) => {
      const chainId = `0x${(index + 1).toString(16)}` as Hex;
      return [
        chainId,
        {
          chainId,
          name: `Network ${index + 1}`,
          nativeCurrency: 'ETH',
          rpcEndpoints: [{ networkClientId: `network-${index + 1}` }],
        },
      ];
    }),
  );

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

  it('renders networks in a virtualized list keyed by chain id', () => {
    const manyNetworksState = {
      ...mockInitialState,
      engine: {
        ...mockInitialState.engine,
        backgroundState: {
          ...mockInitialState.engine.backgroundState,
          NetworkController: {
            ...mockInitialState.engine.backgroundState.NetworkController,
            networkConfigurationsByChainId: buildNetworkConfigurations(30),
          },
        },
      },
    };

    const { UNSAFE_getByType, getByText } = renderComponent({
      state: manyNetworksState,
    });

    const list = UNSAFE_getByType(FlashList);
    expect(list.props.data).toHaveLength(30);
    expect(list.props.data.map(list.props.keyExtractor)).toEqual(
      list.props.data.map((network: { chainId: Hex }) => network.chainId),
    );
    expect(getByText('Network 1')).toBeOnTheScreen();
  });

  it('filters out non-EVM networks when displayEvmNetworksOnly is true', () => {
    const nonEvmState = {
      ...mockInitialState,
      engine: {
        ...mockInitialState.engine,
        backgroundState: {
          ...mockInitialState.engine.backgroundState,
          NetworkController: {
            ...mockInitialState.engine.backgroundState.NetworkController,
            networkConfigurationsByChainId: {
              ...mockInitialState.engine.backgroundState.NetworkController
                .networkConfigurationsByChainId,
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
                chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
                name: 'Solana',
                nativeCurrency: 'SOL',
                isEvm: false,
                rpcEndpoints: [{ networkClientId: 'solana' }],
              },
            },
          },
        },
      },
    } as unknown as typeof mockInitialState;

    const { queryByText } = renderComponent({ state: nonEvmState });

    expect(queryByText('Solana')).toBeNull();
    expect(queryByText('Ethereum Mainnet')).toBeOnTheScreen();
  });
});
