import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import PerpsBalanceBottomSheet from './PerpsBalanceBottomSheet';
import { PerpsBalanceBottomSheetSelectorsIDs } from '../../Perps.testIds';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';

const mockHandleAddFunds = jest.fn();
const mockHandleWithdraw = jest.fn();
const mockCloseEligibilityModal = jest.fn();
let mockIsEligibilityModalVisible = false;

jest.mock('../../hooks/usePerpsHomeActions', () => ({
  usePerpsHomeActions: jest.fn(() => ({
    handleAddFunds: mockHandleAddFunds,
    handleWithdraw: mockHandleWithdraw,
    isEligibilityModalVisible: mockIsEligibilityModalVisible,
    closeEligibilityModal: mockCloseEligibilityModal,
    isEligible: true,
    isProcessing: false,
    error: null,
  })),
}));

const mockNavigateToActivity = jest.fn();

jest.mock('../../hooks/usePerpsNavigation', () => ({
  usePerpsNavigation: jest.fn(() => ({
    navigateToActivity: mockNavigateToActivity,
  })),
}));

let mockPerpsAccount: {
  totalBalance: string;
  spendableBalance: string;
  unrealizedPnl: string;
  returnOnEquity: string;
} | null = {
  totalBalance: '1234.56',
  spendableBalance: '1000.00',
  unrealizedPnl: '50.25',
  returnOnEquity: '5.5',
};

jest.mock('../../hooks/stream', () => ({
  usePerpsLiveAccount: jest.fn(() => ({
    account: mockPerpsAccount,
    isInitialLoading: false,
  })),
}));

jest.mock('../PerpsBottomSheetTooltip', () => {
  const { View, Text } = jest.requireActual('react-native');
  return jest.fn(({ isVisible, testID, onClose }) =>
    isVisible ? (
      // eslint-disable-next-line react/no-unknown-property
      <View testID={testID} onTouchEnd={onClose}>
        <Text>Mock Geo Block Tooltip</Text>
      </View>
    ) : null,
  );
});

const renderSheet = (
  props: Partial<React.ComponentProps<typeof PerpsBalanceBottomSheet>> = {},
  privacyMode = false,
) =>
  renderWithProvider(
    <PerpsBalanceBottomSheet isVisible onClose={jest.fn()} {...props} />,
    {
      state: {
        engine: {
          backgroundState: {
            ...backgroundState,
            PreferencesController: {
              ...backgroundState.PreferencesController,
              privacyMode,
            },
          },
        },
      },
    },
  );

describe('PerpsBalanceBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsEligibilityModalVisible = false;
    mockPerpsAccount = {
      totalBalance: '1234.56',
      spendableBalance: '1000.00',
      unrealizedPnl: '50.25',
      returnOnEquity: '5.5',
    };
  });

  it('renders nothing when not visible', () => {
    const { queryByTestId } = renderSheet({ isVisible: false });

    expect(
      queryByTestId(PerpsBalanceBottomSheetSelectorsIDs.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('renders the sheet with balance, available, and PnL values', () => {
    const { getByTestId } = renderSheet();

    expect(
      getByTestId(PerpsBalanceBottomSheetSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PerpsBalanceBottomSheetSelectorsIDs.BALANCE_VALUE),
    ).toHaveTextContent('$1,234.56');
    expect(
      getByTestId(PerpsBalanceBottomSheetSelectorsIDs.AVAILABLE_VALUE),
    ).toHaveTextContent('$1,000');
    expect(
      getByTestId(PerpsBalanceBottomSheetSelectorsIDs.PNL_VALUE),
    ).toHaveTextContent('+$50.25 (+5.5%)');
  });

  it('defaults balance values to zero when the account has not loaded yet', () => {
    mockPerpsAccount = null;
    const { getByTestId } = renderSheet();

    expect(
      getByTestId(PerpsBalanceBottomSheetSelectorsIDs.BALANCE_VALUE),
    ).toHaveTextContent('$0');
    expect(
      getByTestId(PerpsBalanceBottomSheetSelectorsIDs.AVAILABLE_VALUE),
    ).toHaveTextContent('$0');
  });

  it('closes the sheet when the close button is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = renderSheet({ onClose });

    fireEvent.press(
      getByTestId(PerpsBalanceBottomSheetSelectorsIDs.CLOSE_BUTTON),
    );

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes the sheet and navigates to activity when the history button is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = renderSheet({ onClose });

    fireEvent.press(
      getByTestId(PerpsBalanceBottomSheetSelectorsIDs.HISTORY_BUTTON),
    );

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockNavigateToActivity).toHaveBeenCalledTimes(1);
  });

  it('invokes handleWithdraw when the withdraw button is pressed', () => {
    const { getByTestId } = renderSheet();

    fireEvent.press(
      getByTestId(PerpsBalanceBottomSheetSelectorsIDs.WITHDRAW_BUTTON),
    );

    expect(mockHandleWithdraw).toHaveBeenCalledTimes(1);
  });

  it('invokes handleAddFunds when the add funds button is pressed', () => {
    const { getByTestId } = renderSheet();

    fireEvent.press(
      getByTestId(PerpsBalanceBottomSheetSelectorsIDs.ADD_FUNDS_BUTTON),
    );

    expect(mockHandleAddFunds).toHaveBeenCalledTimes(1);
  });

  it('renders the geo-block tooltip when the eligibility modal is visible', () => {
    mockIsEligibilityModalVisible = true;
    const { getByTestId } = renderSheet();

    expect(
      getByTestId(
        PerpsBalanceBottomSheetSelectorsIDs.GEO_BLOCK_BOTTOM_SHEET_TOOLTIP,
      ),
    ).toBeOnTheScreen();
  });

  it('does not render the geo-block tooltip when the eligibility modal is hidden', () => {
    const { queryByTestId } = renderSheet();

    expect(
      queryByTestId(
        PerpsBalanceBottomSheetSelectorsIDs.GEO_BLOCK_BOTTOM_SHEET_TOOLTIP,
      ),
    ).not.toBeOnTheScreen();
  });

  it('hides balance, available, and PnL values when privacy mode is enabled', () => {
    const { getByTestId, queryByText } = renderSheet({}, true);

    expect(queryByText('$1,234.56')).toBeNull();
    expect(
      getByTestId(PerpsBalanceBottomSheetSelectorsIDs.BALANCE_VALUE),
    ).toBeOnTheScreen();
  });
});
