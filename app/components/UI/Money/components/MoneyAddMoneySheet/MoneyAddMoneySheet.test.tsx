import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { TransactionType, CHAIN_IDS } from '@metamask/transaction-controller';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyAddMoneySheet from './MoneyAddMoneySheet';
import { MoneyAddMoneySheetTestIds } from './MoneyAddMoneySheet.testIds';
import { useMusdBalance } from '../../../Earn/hooks/useMusdBalance';
import { useMoneyAccountDeposit } from '../../hooks/useMoneyAccount';
import { useMMPayFiatConfig } from '../../../../Views/confirmations/hooks/pay/useMMPayFiatConfig';
import { selectHasAnyNonZeroTokenBalance } from '../../../../../selectors/tokenBalancesController';
import {
  getRampRoutingDecision,
  UnifiedRampRoutingType,
} from '../../../../../reducers/fiatOrders';
import {
  MUSD_CONVERSION_DEFAULT_CHAIN_ID,
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
} from '../../../Earn/constants/musd';

const mockOnCloseBottomSheet = jest.fn((cb?: () => void) => cb?.());
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
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

jest.mock('../../../Earn/hooks/useMusdBalance', () => ({
  useMusdBalance: jest.fn(),
}));

jest.mock('../../hooks/useMoneyAccount', () => ({
  useMoneyAccountDeposit: jest.fn(),
}));

jest.mock(
  '../../../../Views/confirmations/hooks/pay/useMMPayFiatConfig',
  () => ({
    useMMPayFiatConfig: jest.fn(),
  }),
);

jest.mock('../../../../../selectors/tokenBalancesController', () => ({
  ...jest.requireActual('../../../../../selectors/tokenBalancesController'),
  selectHasAnyNonZeroTokenBalance: jest.fn(),
}));

jest.mock('../../../../../reducers/fiatOrders', () => ({
  ...jest.requireActual('../../../../../reducers/fiatOrders'),
  getRampRoutingDecision: jest.fn(),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const { forwardRef, useImperativeHandle } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const MockBottomSheet = forwardRef(
    (
      { children, testID }: { children: React.ReactNode; testID?: string },
      ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
    ) => {
      useImperativeHandle(ref, () => ({
        onCloseBottomSheet: mockOnCloseBottomSheet,
        onOpenBottomSheet: jest.fn(),
      }));
      return <View testID={testID}>{children}</View>;
    },
  );
  const MockBottomSheetHeader = ({
    children,
  }: {
    children: React.ReactNode;
  }) => <View>{children}</View>;
  return {
    ...actual,
    BottomSheet: MockBottomSheet,
    BottomSheetHeader: MockBottomSheetHeader,
  };
});

describe('MoneyAddMoneySheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useMusdBalance as jest.Mock).mockReturnValue({
      fiatBalanceAggregated: '1203.89',
      fiatBalanceAggregatedFormatted: '$1,203.89',
      hasMusdBalanceOnAnyChain: true,
      tokenBalanceAggregated: '1203.89',
      tokenBalanceByChain: { [CHAIN_IDS.MAINNET]: '1203.89' },
    });
    (useMoneyAccountDeposit as jest.Mock).mockReturnValue({
      initiateDeposit: mockInitiateDeposit,
    });
    (useMMPayFiatConfig as jest.Mock).mockReturnValue({
      enabledTransactionTypes: [TransactionType.moneyAccountDeposit],
      maxDelayMinutesForPaymentMethods: 10,
    });
    (selectHasAnyNonZeroTokenBalance as unknown as jest.Mock).mockReturnValue(
      true,
    );
    (getRampRoutingDecision as jest.Mock).mockReturnValue(null);
  });

  it('renders all four options', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <MoneyAddMoneySheet />,
    );

    expect(getByText('Convert crypto')).toBeOnTheScreen();
    expect(getByText('Deposit funds')).toBeOnTheScreen();
    expect(getByText('Add your $1,203.89 mUSD')).toBeOnTheScreen();
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
    (useMusdBalance as jest.Mock).mockReturnValue({
      fiatBalanceAggregated: '1500.00',
      fiatBalanceAggregatedFormatted: 'CA$1,500.00',
      hasMusdBalanceOnAnyChain: true,
      tokenBalanceAggregated: '1500.00',
      tokenBalanceByChain: { [CHAIN_IDS.MAINNET]: '1500.00' },
    });
    const { getByText } = renderWithProvider(<MoneyAddMoneySheet />);

    expect(getByText('Add your CA$1,500.00 mUSD')).toBeOnTheScreen();
  });

  it('shows the move-mUSD row disabled with the "Add mUSD" label when the selected EVM account has no mUSD tokens or fiat balance', () => {
    (useMusdBalance as jest.Mock).mockReturnValue({
      fiatBalanceAggregated: undefined,
      fiatBalanceAggregatedFormatted: '$0.00',
      hasMusdBalanceOnAnyChain: false,
      tokenBalanceAggregated: '0',
      tokenBalanceByChain: {},
    });

    const { getByTestId, getByText } = renderWithProvider(
      <MoneyAddMoneySheet />,
    );

    expect(
      getByTestId(MoneyAddMoneySheetTestIds.MOVE_MUSD_OPTION),
    ).toBeOnTheScreen();
    expect(getByText('Add mUSD')).toBeOnTheScreen();

    fireEvent.press(getByTestId(MoneyAddMoneySheetTestIds.MOVE_MUSD_OPTION));

    expect(mockOnCloseBottomSheet).not.toHaveBeenCalled();
    expect(mockInitiateDeposit).not.toHaveBeenCalled();
  });

  it('shows the move-mUSD row disabled with the "Add mUSD" label when the selected EVM account mUSD fiat balance is zero', () => {
    (useMusdBalance as jest.Mock).mockReturnValue({
      fiatBalanceAggregated: '0',
      fiatBalanceAggregatedFormatted: '$0.00',
      hasMusdBalanceOnAnyChain: false,
      tokenBalanceAggregated: '0',
      tokenBalanceByChain: {},
    });

    const { getByTestId, getByText } = renderWithProvider(
      <MoneyAddMoneySheet />,
    );

    expect(
      getByTestId(MoneyAddMoneySheetTestIds.MOVE_MUSD_OPTION),
    ).toBeOnTheScreen();
    expect(getByText('Add mUSD')).toBeOnTheScreen();

    fireEvent.press(getByTestId(MoneyAddMoneySheetTestIds.MOVE_MUSD_OPTION));

    expect(mockOnCloseBottomSheet).not.toHaveBeenCalled();
    expect(mockInitiateDeposit).not.toHaveBeenCalled();
  });

  it('shows the move-mUSD row with the "Add your $X mUSD" label when the selected EVM account mUSD fiat balance is positive', () => {
    (useMusdBalance as jest.Mock).mockReturnValue({
      fiatBalanceAggregated: '12.34',
      fiatBalanceAggregatedFormatted: '$12.34',
      hasMusdBalanceOnAnyChain: true,
      tokenBalanceAggregated: '12.34',
      tokenBalanceByChain: { [CHAIN_IDS.MAINNET]: '12.34' },
    });

    const { getByTestId, getByText } = renderWithProvider(
      <MoneyAddMoneySheet />,
    );

    expect(
      getByTestId(MoneyAddMoneySheetTestIds.MOVE_MUSD_OPTION),
    ).toBeOnTheScreen();
    expect(getByText('Add your $12.34 mUSD')).toBeOnTheScreen();
  });

  it('shows the move-mUSD row with the token amount when the user has mUSD tokens but rates are unavailable', () => {
    (useMusdBalance as jest.Mock).mockReturnValue({
      fiatBalanceAggregated: undefined,
      fiatBalanceAggregatedFormatted: '$0.00',
      hasMusdBalanceOnAnyChain: true,
      tokenBalanceAggregated: '42.5',
      tokenBalanceByChain: { [CHAIN_IDS.MAINNET]: '42.5' },
    });

    const { getByTestId, getByText } = renderWithProvider(
      <MoneyAddMoneySheet />,
    );

    expect(
      getByTestId(MoneyAddMoneySheetTestIds.MOVE_MUSD_OPTION),
    ).toBeOnTheScreen();
    expect(getByText('Add your 42.50 mUSD')).toBeOnTheScreen();
  });

  it('initiates a deposit with autoSelectFiatPayment when Deposit funds is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    fireEvent.press(
      getByTestId(MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION),
    );

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockInitiateDeposit).toHaveBeenCalledWith({
      autoSelectFiatPayment: true,
    });
  });

  it('initiates a deposit when Convert crypto is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    fireEvent.press(
      getByTestId(MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION),
    );

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockInitiateDeposit).toHaveBeenCalledWith();
  });

  it('hides the Deposit funds option when moneyAccountDeposit is not in enabledTransactionTypes', () => {
    (useMMPayFiatConfig as jest.Mock).mockReturnValue({
      enabledTransactionTypes: [],
      maxDelayMinutesForPaymentMethods: 10,
    });

    const { queryByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    expect(
      queryByTestId(MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION),
    ).toBeNull();
  });

  it('disables the Convert crypto option when no account has any crypto balance', () => {
    (selectHasAnyNonZeroTokenBalance as unknown as jest.Mock).mockReturnValue(
      false,
    );

    const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    expect(
      getByTestId(MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION),
    ).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION),
    );

    expect(mockOnCloseBottomSheet).not.toHaveBeenCalled();
    expect(mockInitiateDeposit).not.toHaveBeenCalled();
  });

  it('enables the Convert crypto option when at least one account has a crypto balance', () => {
    (selectHasAnyNonZeroTokenBalance as unknown as jest.Mock).mockReturnValue(
      true,
    );

    const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    fireEvent.press(
      getByTestId(MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION),
    );

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockInitiateDeposit).toHaveBeenCalledWith();
  });

  it('hides the Deposit funds option when the ramp routing decision is UNSUPPORTED', () => {
    (getRampRoutingDecision as jest.Mock).mockReturnValue(
      UnifiedRampRoutingType.UNSUPPORTED,
    );

    const { queryByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    expect(
      queryByTestId(MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION),
    ).toBeNull();
  });

  it('shows the Deposit funds option when the ramp routing decision is DEPOSIT', () => {
    (getRampRoutingDecision as jest.Mock).mockReturnValue(
      UnifiedRampRoutingType.DEPOSIT,
    );

    const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    expect(
      getByTestId(MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION),
    ).toBeOnTheScreen();
  });

  it('shows the Deposit funds option when the ramp routing decision is AGGREGATOR', () => {
    (getRampRoutingDecision as jest.Mock).mockReturnValue(
      UnifiedRampRoutingType.AGGREGATOR,
    );

    const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    expect(
      getByTestId(MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION),
    ).toBeOnTheScreen();
  });

  it('shows the Deposit funds option when the ramp routing decision is null (fail-open)', () => {
    (getRampRoutingDecision as jest.Mock).mockReturnValue(null);

    const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    expect(
      getByTestId(MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION),
    ).toBeOnTheScreen();
  });

  it('shows the Deposit funds option when the ramp routing decision is ERROR (fail-open)', () => {
    (getRampRoutingDecision as jest.Mock).mockReturnValue(
      UnifiedRampRoutingType.ERROR,
    );

    const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    expect(
      getByTestId(MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION),
    ).toBeOnTheScreen();
  });

  it('initiates a deposit pre-selecting mUSD on the highest-balance chain when Move mUSD is pressed', () => {
    (useMusdBalance as jest.Mock).mockReturnValue({
      fiatBalanceAggregated: '1500.00',
      fiatBalanceAggregatedFormatted: '$1,500.00',
      hasMusdBalanceOnAnyChain: true,
      tokenBalanceAggregated: '1500.00',
      tokenBalanceByChain: {
        [CHAIN_IDS.MAINNET]: '500.00',
        [CHAIN_IDS.LINEA_MAINNET]: '1000.00',
      },
    });

    const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    fireEvent.press(getByTestId(MoneyAddMoneySheetTestIds.MOVE_MUSD_OPTION));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockInitiateDeposit).toHaveBeenCalledWith({
      intent: 'addMusd',
      preferredPaymentToken: {
        address: MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.LINEA_MAINNET],
        chainId: CHAIN_IDS.LINEA_MAINNET,
      },
    });
  });

  it('falls back to the default mUSD chain when no per-chain balances are available', () => {
    (useMusdBalance as jest.Mock).mockReturnValue({
      fiatBalanceAggregated: '12.34',
      fiatBalanceAggregatedFormatted: '$12.34',
      hasMusdBalanceOnAnyChain: true,
      tokenBalanceAggregated: '12.34',
      tokenBalanceByChain: undefined,
    });

    const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    fireEvent.press(getByTestId(MoneyAddMoneySheetTestIds.MOVE_MUSD_OPTION));

    expect(mockInitiateDeposit).toHaveBeenCalledWith({
      intent: 'addMusd',
      preferredPaymentToken: {
        address: MUSD_TOKEN_ADDRESS_BY_CHAIN[MUSD_CONVERSION_DEFAULT_CHAIN_ID],
        chainId: MUSD_CONVERSION_DEFAULT_CHAIN_ID,
      },
    });
  });
});
