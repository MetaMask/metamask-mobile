import React from 'react';
import NetworkFilterBottomSheet, {
  NETWORK_FILTER_BOTTOM_SHEET,
} from './NetworkFilterBottomSheet';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { Hex } from '@metamask/utils';
import { fireEvent } from '@testing-library/react-native';
import { WalletViewSelectorsIDs } from '../../Wallet/WalletView.testIds';
import { FilterOption } from '../AddAsset';

const mockOnFilterControlsBottomSheetPress = jest.fn();
const mockSetOpenNetworkSelector = jest.fn();
const mockClose = jest.fn();
const mockOnOpenBottomSheet = jest.fn();
const mockOnCloseBottomSheet = jest.fn();
const mockSheetRef = {
  current: {
    close: mockClose,
    onOpenBottomSheet: mockOnOpenBottomSheet,
    onCloseBottomSheet: mockOnCloseBottomSheet,
  },
};
const defaultProps = {
  onFilterControlsBottomSheetPress: mockOnFilterControlsBottomSheetPress,
  setOpenNetworkFilter: mockSetOpenNetworkSelector,
  sheetRef: mockSheetRef,
};

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      PreferencesController: {
        useTokenDetection: true,
      },
      MultichainNetworkController: {
        isEvmSelected: true,
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

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  }),
}));

describe('NetworkFilterBottomSheet', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <NetworkFilterBottomSheet {...defaultProps} />,
      { state: mockInitialState },
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('handles onPress for the All Networks list item', () => {
    const { getByTestId } = renderWithProvider(
      <NetworkFilterBottomSheet {...defaultProps} />,
      { state: mockInitialState },
    );

    // Query the first ListItemSelect using the testID provided by WalletViewSelectorsIDs.
    const allNetworksItem = getByTestId(
      WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER_ALL,
    );
    fireEvent.press(allNetworksItem);

    // Expect that the callback was called with the correct option and that the bottom sheet is closed.
    expect(mockOnFilterControlsBottomSheetPress).toHaveBeenCalledWith(
      FilterOption.AllNetworks,
    );
    expect(mockSetOpenNetworkSelector).toHaveBeenCalledWith(false);
  });

  it('handles onPress for the Current Network list item', () => {
    const { getByTestId } = renderWithProvider(
      <NetworkFilterBottomSheet {...defaultProps} />,
      { state: mockInitialState },
    );

    // Query the second ListItemSelect using its testID.
    const currentNetworkItem = getByTestId(
      WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER_CURRENT,
    );
    fireEvent.press(currentNetworkItem);

    // Expect that the callback was called with the correct option and that the bottom sheet is closed.
    expect(mockOnFilterControlsBottomSheetPress).toHaveBeenCalledWith(
      FilterOption.CurrentNetwork,
    );
    expect(mockSetOpenNetworkSelector).toHaveBeenCalledWith(false);
  });

  it('calls onClose when BottomSheet is closed', () => {
    const { getByTestId } = renderWithProvider(
      <NetworkFilterBottomSheet {...defaultProps} />,
      { state: mockInitialState },
    );

    const bottomSheet = getByTestId(NETWORK_FILTER_BOTTOM_SHEET);
    fireEvent(bottomSheet, 'onClose');

    expect(mockSetOpenNetworkSelector).toHaveBeenCalledWith(false);
  });
});
