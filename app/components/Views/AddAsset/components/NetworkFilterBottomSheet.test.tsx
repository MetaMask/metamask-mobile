import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import NetworkFilterBottomSheet from './NetworkFilterBottomSheet';
import { FilterOption } from '../AddAsset';
import { strings } from '../../../../../locales/i18n';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      PreferencesController: {
        useTokenDetection: true,
      },
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

jest.mock('../../../../core/Engine', () => ({
  context: {
    PreferencesController: {
      setTokenNetworkFilter: jest.fn(),
    },
  },
}));

jest.mock('../../../../selectors/preferencesController', () => ({
  selectTokenNetworkFilter: jest.fn(),
}));

jest.mock('../../../../selectors/networkController', () => ({
  selectAllPopularNetworkConfigurations: jest.fn(),
  selectEvmChainId: jest.fn(),
}));

describe('NetworkFilterBottomSheet', () => {
  const mockOnFilterControlsBottomSheetPress = jest.fn();
  const mockSetOpenNetworkFilter = jest.fn();
  const mockSheetRef = { current: null };

  const defaultProps = {
    onFilterControlsBottomSheetPress: mockOnFilterControlsBottomSheetPress,
    setOpenNetworkFilter: mockSetOpenNetworkFilter,
    sheetRef: mockSheetRef,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with all networks selected', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <NetworkFilterBottomSheet {...defaultProps} />,
      {
        state: mockInitialState,
      },
    );

    expect(getByText(strings('wallet.filter_by'))).toBeTruthy();
    expect(getByTestId('wallet-view-token-network-filter-all')).toBeTruthy();
    expect(
      getByTestId('wallet-view-token-network-filter-current'),
    ).toBeTruthy();
  });

  //   it('handles "All Networks" selection', () => {
  //     const { getByTestId } = renderWithProvider(
  //       <NetworkFilterBottomSheet {...defaultProps} />,
  //       {
  //         state: mockInitialState,
  //       },
  //     );

  //     const allNetworksButton = getByTestId(
  //       'wallet-view-token-network-filter-all',
  //     );
  //     fireEvent.press(allNetworksButton);

  //     expect(mockOnFilterControlsBottomSheetPress).toHaveBeenCalledWith(
  //       FilterOption.AllNetworks,
  //     );
  //     expect(mockSetOpenNetworkFilter).toHaveBeenCalledWith(false);
  //   });

  //   it('handles "Current Network" selection', () => {
  //     const { getByTestId } = renderWithProvider(
  //       <NetworkFilterBottomSheet {...defaultProps} />,
  //       {
  //         state: mockInitialState,
  //       },
  //     );

  //     const currentNetworkButton = getByTestId(
  //       'wallet-view-token-network-filter-current',
  //     );
  //     fireEvent.press(currentNetworkButton);

  //     expect(mockOnFilterControlsBottomSheetPress).toHaveBeenCalledWith(
  //       FilterOption.CurrentNetwork,
  //     );
  //     expect(mockSetOpenNetworkFilter).toHaveBeenCalledWith(false);
  //   });

  //   it('closes bottom sheet when onClose is triggered', () => {
  //     const { getByTestId } = renderWithProvider(
  //       <NetworkFilterBottomSheet {...defaultProps} />,
  //       {
  //         state: mockInitialState,
  //       },
  //     );

  //     // Assuming BottomSheet component exposes onClose via testID
  //     const bottomSheet = getByTestId('bottom-sheet');
  //     fireEvent(bottomSheet, 'onClose');

  //     expect(mockSetOpenNetworkFilter).toHaveBeenCalledWith(false);
  //   });

  //   it('shows correct selection state for network filters', () => {
  //     const { getByTestId } = renderWithProvider(
  //       <NetworkFilterBottomSheet {...defaultProps} />,
  //       {
  //         state: mockInitialState,
  //       },
  //     );

  //     const allNetworksButton = getByTestId(
  //       'wallet-view-token-network-filter-all',
  //     );
  //     const currentNetworkButton = getByTestId(
  //       'wallet-view-token-network-filter-current',
  //     );

  //     expect(allNetworksButton.props.isSelected).toBe(true);
  //     expect(currentNetworkButton.props.isSelected).toBe(false);
  //   });
});
