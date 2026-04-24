import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyAddMoneySheet from './MoneyAddMoneySheet';
import { MoneyAddMoneySheetTestIds } from './MoneyAddMoneySheet.testIds';
import { useMusdConversion } from '../../../Earn/hooks/useMusdConversion';
import { useMusdConversionFlowData } from '../../../Earn/hooks/useMusdConversionFlowData';
import { MUSD_CONVERSION_NAVIGATION_OVERRIDE } from '../../../Earn/types/musd.types';
import { useRampNavigation } from '../../../Ramp/hooks/useRampNavigation';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';

const mockOnCloseBottomSheet = jest.fn((cb?: () => void) => cb?.());
const mockInitiateCustomConversion = jest.fn().mockResolvedValue(undefined);
const mockGetPaymentTokenForSelectedNetwork = jest.fn();
const mockGoToBuy = jest.fn();

jest.mock('../../../Earn/hooks/useMusdConversion', () => ({
  useMusdConversion: jest.fn(),
}));

jest.mock('../../../Earn/hooks/useMusdConversionFlowData', () => ({
  useMusdConversionFlowData: jest.fn(),
}));

jest.mock('../../../Ramp/hooks/useRampNavigation', () => ({
  useRampNavigation: jest.fn(),
}));

jest.mock('../../hooks/useMoneyAccountBalance', () => ({
  __esModule: true,
  default: jest.fn(),
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

const mockPaymentToken = {
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as const,
  chainId: '0x1' as const,
};

describe('MoneyAddMoneySheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useMusdConversion as jest.Mock).mockReturnValue({
      initiateCustomConversion: mockInitiateCustomConversion,
    });
    (useMusdConversionFlowData as jest.Mock).mockReturnValue({
      getPaymentTokenForSelectedNetwork: mockGetPaymentTokenForSelectedNetwork,
    });
    (useRampNavigation as jest.Mock).mockReturnValue({
      goToBuy: mockGoToBuy,
    });
    (useMoneyAccountBalance as jest.Mock).mockReturnValue({
      musdFiatFormatted: '$1,203.89',
    });
    mockGetPaymentTokenForSelectedNetwork.mockReturnValue(mockPaymentToken);
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

  it('falls back to the no-amount copy when the mUSD balance is unavailable', () => {
    (useMoneyAccountBalance as jest.Mock).mockReturnValue({
      musdFiatFormatted: undefined,
    });
    const { getByText } = renderWithProvider(<MoneyAddMoneySheet />);

    expect(getByText('Move your mUSD')).toBeOnTheScreen();
  });

  it('navigates to the Ramps buy flow when Deposit funds is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    fireEvent.press(
      getByTestId(MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION),
    );

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockGoToBuy).toHaveBeenCalledTimes(1);
  });

  it('initiates mUSD conversion when Convert crypto is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    fireEvent.press(
      getByTestId(MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION),
    );

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockInitiateCustomConversion).toHaveBeenCalledWith({
      preferredPaymentToken: mockPaymentToken,
      navigationOverride: MUSD_CONVERSION_NAVIGATION_OVERRIDE.QUICK_CONVERT,
    });
  });

  it('closes the sheet without initiating conversion when no payment token is available', () => {
    mockGetPaymentTokenForSelectedNetwork.mockReturnValue(null);
    const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    fireEvent.press(
      getByTestId(MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION),
    );

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockInitiateCustomConversion).not.toHaveBeenCalled();
  });

  it('closes the sheet when Move mUSD is pressed (interim, no flow wired yet)', () => {
    const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    fireEvent.press(getByTestId(MoneyAddMoneySheetTestIds.MOVE_MUSD_OPTION));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockInitiateCustomConversion).not.toHaveBeenCalled();
    expect(mockGoToBuy).not.toHaveBeenCalled();
  });
});
