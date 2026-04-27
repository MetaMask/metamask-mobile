import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyAddMoneySheet from './MoneyAddMoneySheet';
import { MoneyAddMoneySheetTestIds } from './MoneyAddMoneySheet.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import { useMusdConversionFlowData } from '../../../Earn/hooks/useMusdConversionFlowData';
import { useRampNavigation } from '../../../Ramp/hooks/useRampNavigation';
import { useMusdBalance } from '../../../Earn/hooks/useMusdBalance';
import {
  MUSD_CONVERSION_DEFAULT_CHAIN_ID,
  MUSD_TOKEN_ASSET_ID_BY_CHAIN,
} from '../../../Earn/constants/musd';

const mockOnCloseBottomSheet = jest.fn((cb?: () => void) => cb?.());
const mockNavigate = jest.fn();
const mockGetChainIdForBuyFlow = jest.fn();
const mockGoToBuy = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: jest.fn(),
    }),
  };
});

jest.mock('../../../Earn/hooks/useMusdConversionFlowData', () => ({
  useMusdConversionFlowData: jest.fn(),
}));

jest.mock('../../../Ramp/hooks/useRampNavigation', () => ({
  useRampNavigation: jest.fn(),
}));

jest.mock('../../../Earn/hooks/useMusdBalance', () => ({
  useMusdBalance: jest.fn(),
}));

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const { forwardRef, useImperativeHandle } = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    const MockBottomSheet = forwardRef(
      (
        { children, testID }: { children: React.ReactNode; testID?: string },
        ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
      ) => {
        useImperativeHandle(ref, () => ({
          onCloseBottomSheet: mockOnCloseBottomSheet,
        }));
        return <View testID={testID}>{children}</View>;
      },
    );
    return { __esModule: true, default: MockBottomSheet };
  },
);

describe('MoneyAddMoneySheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockGetChainIdForBuyFlow.mockReturnValue(MUSD_CONVERSION_DEFAULT_CHAIN_ID);

    (useMusdConversionFlowData as jest.Mock).mockReturnValue({
      getChainIdForBuyFlow: mockGetChainIdForBuyFlow,
    });
    (useRampNavigation as jest.Mock).mockReturnValue({
      goToBuy: mockGoToBuy,
    });
    (useMusdBalance as jest.Mock).mockReturnValue({
      fiatBalanceAggregatedFormatted: '$1,203.89',
    });
  });

  it('renders all four options', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <MoneyAddMoneySheet />,
    );

    expect(getByText('Convert crypto')).toBeOnTheScreen();
    expect(getByText('Deposit funds')).toBeOnTheScreen();
    expect(getByText('Move your $1,203.89 mUSD')).toBeOnTheScreen();
    expect(getByText('Receive from external wallet')).toBeOnTheScreen();
    expect(getByText('Coming soon')).toBeOnTheScreen();
    expect(
      getByTestId(MoneyAddMoneySheetTestIds.RECEIVE_EXTERNAL_ROW),
    ).toBeOnTheScreen();
  });

  it('preserves the locale fiat prefix in the Move mUSD row', () => {
    (useMusdBalance as jest.Mock).mockReturnValue({
      fiatBalanceAggregatedFormatted: 'CA$1,500.00',
    });
    const { getByText } = renderWithProvider(<MoneyAddMoneySheet />);

    expect(getByText('Move your CA$1,500.00 mUSD')).toBeOnTheScreen();
  });

  it('falls back to the no-amount copy when the mUSD balance is unavailable', () => {
    (useMusdBalance as jest.Mock).mockReturnValue({
      fiatBalanceAggregatedFormatted: undefined,
    });
    const { getByText } = renderWithProvider(<MoneyAddMoneySheet />);

    expect(getByText('Move your mUSD')).toBeOnTheScreen();
  });

  it('navigates to the Ramps buy flow with mUSD pre-selected when Deposit funds is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    fireEvent.press(
      getByTestId(MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION),
    );

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockGoToBuy).toHaveBeenCalledWith({
      assetId: MUSD_TOKEN_ASSET_ID_BY_CHAIN[MUSD_CONVERSION_DEFAULT_CHAIN_ID],
    });
  });

  it('navigates to the Quick Convert screen when Convert crypto is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    fireEvent.press(
      getByTestId(MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION),
    );

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.EARN.MUSD.QUICK_CONVERT);
  });

  it('closes the sheet when Move mUSD is pressed (interim, no flow wired yet)', () => {
    const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    fireEvent.press(getByTestId(MoneyAddMoneySheetTestIds.MOVE_MUSD_OPTION));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockGoToBuy).not.toHaveBeenCalled();
  });
});
