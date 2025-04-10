import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import NetworkListBottomSheet from './NetworkListBottomSheet';
import { Hex } from '@metamask/utils';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      PreferencesController: {
        useTokenDetection: true,
      },
      NetworkController: {
        networkConfigurationsByChainId: {
          '0x1': {
            chainId: '0x1' as Hex,
            name: 'Ethereum Mainnet',
            nativeCurrency: 'ETH',
            rpcEndpoints: [
              {
                networkClientId: 'selectedNetworkClientId',
              },
            ],
          },
          '0x89': {
            chainId: '0x89' as Hex,
            name: 'Polygon',
            nativeCurrency: 'POL',
            rpcEndpoints: [
              {
                networkClientId: 'selectedNetworkClientId2',
              },
            ],
          },
        },
      },
    },
  },
};

// Mock navigation
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

jest.mock('../../../../util/networks', () => ({
  ...jest.requireActual('../../../../util/networks'),
  getNetworkImageSource: jest.fn(() => ({ uri: 'mock-image-uri' })),
}));

const mockSetSelectedNetwork = jest.fn();
const mockSetOpenNetworkSelector = jest.fn();
const mockSheetRef = { current: null };

const defaultProps = {
  selectedNetwork: '0x1' as Hex,
  setSelectedNetwork: mockSetSelectedNetwork,
  setOpenNetworkSelector: mockSetOpenNetworkSelector,
  sheetRef: mockSheetRef,
};

describe('NetworkListBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with network list', () => {
    const { getByText } = renderWithProvider(
      <NetworkListBottomSheet {...defaultProps} />,
      { state: mockInitialState },
    );

    expect(getByText(strings('networks.select_network'))).toBeTruthy();
    expect(getByText('Ethereum Mainnet')).toBeTruthy();
    expect(getByText('Polygon')).toBeTruthy();
  });

  it('handles network selection', () => {
    const { getByText } = renderWithProvider(
      <NetworkListBottomSheet {...defaultProps} />,
      { state: mockInitialState },
    );

    fireEvent.press(getByText('Polygon'));

    expect(mockSetSelectedNetwork).toHaveBeenCalledWith('0x89');
    expect(mockSetOpenNetworkSelector).toHaveBeenCalledWith(false);
  });

  it('renders empty state when no networks available', () => {
    const emptyNetworkState = {
      ...mockInitialState,
      engine: {
        ...mockInitialState.engine,
        backgroundState: {
          ...mockInitialState.engine.backgroundState,
          NetworkController: {
            networkConfigurationsByChainId: {},
          },
        },
      },
    };

    const { queryByText } = renderWithProvider(
      <NetworkListBottomSheet {...defaultProps} />,
      { state: emptyNetworkState },
    );

    expect(queryByText('Ethereum Mainnet')).toBeNull();
    expect(queryByText('Polygon')).toBeNull();
  });
});
