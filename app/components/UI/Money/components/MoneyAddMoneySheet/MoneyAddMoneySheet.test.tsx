import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyAddMoneySheet from './MoneyAddMoneySheet';
import { MoneyAddMoneySheetTestIds } from './MoneyAddMoneySheet.testIds';
import { useMusdConversionFlowData } from '../../../Earn/hooks/useMusdConversionFlowData';
import { useRampNavigation } from '../../../Ramp/hooks/useRampNavigation';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import { useMoneyAccountDeposit } from '../../hooks/useMoneyAccount';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  MUSD_CONVERSION_DEFAULT_CHAIN_ID,
  MUSD_TOKEN_ADDRESS,
  MUSD_TOKEN_ASSET_ID_BY_CHAIN,
} from '../../../Earn/constants/musd';

const mockOnCloseBottomSheet = jest.fn((cb?: () => void) => cb?.());
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockGetChainIdForBuyFlow = jest.fn();
const mockGoToBuy = jest.fn();
const mockInitiateDeposit = jest.fn(() => Promise.resolve());

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

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

jest.mock('../../hooks/useMoneyAccount', () => ({
  useMoneyAccountDeposit: jest.fn(),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const { forwardRef, useImperativeHandle } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const { TouchableOpacity } = jest.requireActual('react-native');
  const MockBottomSheet = forwardRef(
    (
      {
        children,
        testID,
        goBack,
      }: {
        children: React.ReactNode;
        testID?: string;
        goBack?: () => void;
      },
      ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
    ) => {
      useImperativeHandle(ref, () => ({
        onCloseBottomSheet: mockOnCloseBottomSheet,
        onOpenBottomSheet: jest.fn(),
      }));
      return (
        <View testID={testID}>
          <TouchableOpacity
            testID="mock-bottom-sheet-go-back"
            onPress={goBack}
          />
          {children}
        </View>
      );
    },
  );
  const MockBottomSheetHeader = ({
    children,
    onClose,
  }: {
    children: React.ReactNode;
    onClose?: () => void;
  }) => (
    <View>
      <TouchableOpacity
        testID="mock-bottom-sheet-header-close"
        onPress={onClose}
      />
      {children}
    </View>
  );
  return {
    ...actual,
    BottomSheet: MockBottomSheet,
    BottomSheetHeader: MockBottomSheetHeader,
  };
});

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
    (useMoneyAccountBalance as jest.Mock).mockReturnValue({
      totalFiatFormatted: '$1,203.89',
    });
    (useMoneyAccountDeposit as jest.Mock).mockReturnValue({
      initiateDeposit: mockInitiateDeposit,
    });
  });

  it('renders all four options', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <MoneyAddMoneySheet />,
    );

    expect(getByText('Convert crypto')).toBeOnTheScreen();
    expect(getByText('Deposit funds')).toBeOnTheScreen();
    expect(getByText('Transfer your $1,203.89 mUSD')).toBeOnTheScreen();
    expect(getByText('Receive from external wallet')).toBeOnTheScreen();
    expect(getByText('Coming soon')).toBeOnTheScreen();
    expect(
      getByTestId(MoneyAddMoneySheetTestIds.RECEIVE_EXTERNAL_ROW),
    ).toBeOnTheScreen();
  });

  it('renders the "Add funds" title', () => {
    const { getByText } = renderWithProvider(<MoneyAddMoneySheet />);

    expect(getByText('Add funds')).toBeOnTheScreen();
  });

  it('renders a description under the Convert crypto row', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <MoneyAddMoneySheet />,
    );

    expect(
      getByTestId(MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_DESCRIPTION),
    ).toBeOnTheScreen();
    expect(getByText('From any account')).toBeOnTheScreen();
  });

  it('renders a description under the Deposit funds row', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <MoneyAddMoneySheet />,
    );

    expect(
      getByTestId(MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_DESCRIPTION),
    ).toBeOnTheScreen();
    expect(getByText('From debit card or bank')).toBeOnTheScreen();
  });

  it('preserves the locale fiat prefix in the Move mUSD row', () => {
    (useMoneyAccountBalance as jest.Mock).mockReturnValue({
      totalFiatFormatted: 'CA$1,500.00',
    });
    const { getByText } = renderWithProvider(<MoneyAddMoneySheet />);

    expect(getByText('Transfer your CA$1,500.00 mUSD')).toBeOnTheScreen();
  });

  it('falls back to the no-amount copy when the mUSD balance is unavailable', () => {
    (useMoneyAccountBalance as jest.Mock).mockReturnValue({
      totalFiatFormatted: undefined,
    });
    const { getByText } = renderWithProvider(<MoneyAddMoneySheet />);

    expect(getByText('Transfer your mUSD')).toBeOnTheScreen();
  });

  it('navigates to the Ramps buy flow with mUSD pre-selected when Deposit funds is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    fireEvent.press(
      getByTestId(MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION),
    );

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockGoToBuy).toHaveBeenCalledWith(
      {
        assetId: MUSD_TOKEN_ASSET_ID_BY_CHAIN[MUSD_CONVERSION_DEFAULT_CHAIN_ID],
      },
      { buyFlowOrigin: 'moneyAccountDeposit' },
    );
  });

  it('falls back to the default buy-flow chain when getChainIdForBuyFlow is unavailable', () => {
    (useMusdConversionFlowData as jest.Mock).mockReturnValue({
      getChainIdForBuyFlow: undefined,
    });
    const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    fireEvent.press(
      getByTestId(MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION),
    );

    expect(mockGoToBuy).toHaveBeenCalledWith(
      {
        assetId: MUSD_TOKEN_ASSET_ID_BY_CHAIN[MUSD_CONVERSION_DEFAULT_CHAIN_ID],
      },
      { buyFlowOrigin: 'moneyAccountDeposit' },
    );
  });

  it('initiates a deposit with no preferred token when Convert crypto is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    fireEvent.press(
      getByTestId(MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION),
    );

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    // Convert crypto must call initiateDeposit with no arguments so the
    // confirmation screen keeps its default "Pay with" token logic.
    expect(mockInitiateDeposit).toHaveBeenCalledWith();
    expect(mockGoToBuy).not.toHaveBeenCalled();
  });

  it('initiates a deposit with mUSD pre-selected when Move mUSD is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    fireEvent.press(getByTestId(MoneyAddMoneySheetTestIds.MOVE_MUSD_OPTION));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockInitiateDeposit).toHaveBeenCalledWith({
      preferredPaymentToken: {
        address: MUSD_TOKEN_ADDRESS,
        chainId: CHAIN_IDS.MAINNET,
      },
    });
    expect(mockGoToBuy).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('swallows initiateDeposit rejection when Move mUSD is pressed', async () => {
    mockInitiateDeposit.mockRejectedValueOnce(new Error('deposit failed'));
    const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    expect(() =>
      fireEvent.press(getByTestId(MoneyAddMoneySheetTestIds.MOVE_MUSD_OPTION)),
    ).not.toThrow();

    expect(mockInitiateDeposit).toHaveBeenCalledWith({
      preferredPaymentToken: {
        address: MUSD_TOKEN_ADDRESS,
        chainId: CHAIN_IDS.MAINNET,
      },
    });
  });

  it('goes back when the bottom sheet requests goBack', () => {
    const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    fireEvent.press(getByTestId('mock-bottom-sheet-go-back'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('closes the sheet when the header close control is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    fireEvent.press(getByTestId('mock-bottom-sheet-header-close'));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });
});
