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
import { useHasNativeFiatProvider } from '../../../Ramp/hooks/useHasNativeFiatProvider';
import {
  MUSD_CONVERSION_DEFAULT_CHAIN_ID,
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
} from '../../../Earn/constants/musd';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import {
  BOTTOM_SHEET_NAMES,
  COMPONENT_NAMES,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';

const mockTrackBottomSheetViewed = jest.fn();
const mockTrackSurfaceClicked = jest.fn();

jest.mock('../../hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(),
}));

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

jest.mock('../../../Ramp/hooks/useHasNativeFiatProvider', () => ({
  useHasNativeFiatProvider: jest.fn(),
}));

jest.mock('../../../../../selectors/transactionController', () => ({
  ...jest.requireActual('../../../../../selectors/transactionController'),
  selectTransactions: jest.fn(() => []),
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

    (useMoneyAnalytics as jest.Mock).mockReturnValue({
      trackBottomSheetViewed: mockTrackBottomSheetViewed,
      trackSurfaceClicked: mockTrackSurfaceClicked,
    });
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
    (useHasNativeFiatProvider as jest.Mock).mockReturnValue(true);
  });

  it('renders all four options', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <MoneyAddMoneySheet />,
    );

    expect(getByText('Convert crypto')).toBeOnTheScreen();
    expect(getByText('Debit card or bank account')).toBeOnTheScreen();
    expect(getByText('$1,203.89 mUSD')).toBeOnTheScreen();
    expect(getByText('External address')).toBeOnTheScreen();
    expect(getByText('Coming soon')).toBeOnTheScreen();
    expect(
      getByTestId(MoneyAddMoneySheetTestIds.RECEIVE_EXTERNAL_ROW),
    ).toBeOnTheScreen();
  });

  it('renders the "Add funds" title', () => {
    const { getByText } = renderWithProvider(<MoneyAddMoneySheet />);

    expect(getByText('Add funds')).toBeOnTheScreen();
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

    expect(getByText('CA$1,500.00 mUSD')).toBeOnTheScreen();
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

  it('shows the move-mUSD row with the "$X mUSD" label when the selected EVM account mUSD fiat balance is positive', () => {
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
    expect(getByText('$12.34 mUSD')).toBeOnTheScreen();
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
    expect(getByText('42.50 mUSD')).toBeOnTheScreen();
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
    expect(mockInitiateDeposit).toHaveBeenCalledWith(undefined);
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
    expect(mockInitiateDeposit).toHaveBeenCalledWith(undefined);
  });

  it('shows the Deposit funds option when fiat deposit is enabled', () => {
    (useMMPayFiatConfig as jest.Mock).mockReturnValue({
      enabledTransactionTypes: [TransactionType.moneyAccountDeposit],
      maxDelayMinutesForPaymentMethods: 10,
    });

    const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    expect(
      getByTestId(MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION),
    ).toBeOnTheScreen();
  });

  it('hides the Deposit funds option when fiat deposit is disabled', () => {
    (useMMPayFiatConfig as jest.Mock).mockReturnValue({
      enabledTransactionTypes: [],
      maxDelayMinutesForPaymentMethods: 10,
    });

    const { queryByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    expect(
      queryByTestId(MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION),
    ).toBeNull();
  });

  it('shows the Deposit funds option enabled when a native provider is available', () => {
    (useHasNativeFiatProvider as jest.Mock).mockReturnValue(true);

    const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

    fireEvent.press(
      getByTestId(MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION),
    );

    expect(mockInitiateDeposit).toHaveBeenCalledWith({
      autoSelectFiatPayment: true,
    });
  });

  it('shows the Deposit funds option disabled with "Coming soon" when no native provider serves the region', () => {
    (useHasNativeFiatProvider as jest.Mock).mockReturnValue(false);

    const { getByTestId, getAllByText } = renderWithProvider(
      <MoneyAddMoneySheet />,
    );

    fireEvent.press(
      getByTestId(MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION),
    );

    // Two "Coming soon" tags now: the disabled Deposit row + Receive external.
    expect(getAllByText('Coming soon')).toHaveLength(2);
    expect(mockOnCloseBottomSheet).not.toHaveBeenCalled();
    expect(mockInitiateDeposit).not.toHaveBeenCalled();
  });

  // Returns the option-row testIDs in rendered order. Each row carries its
  // testID on both the composite TouchableOpacity and its host view, so we
  // dedupe to first occurrence (which preserves render order).
  const getOptionOrder = (
    root: ReturnType<typeof renderWithProvider>['UNSAFE_root'],
  ): string[] => {
    const optionTestIds: string[] = [
      MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION,
      MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION,
      MoneyAddMoneySheetTestIds.MOVE_MUSD_OPTION,
    ];
    const seen = new Set<string>();
    return root
      .findAll((node) => optionTestIds.includes(node.props.testID))
      .map((node) => node.props.testID as string)
      .filter((id) => {
        if (seen.has(id)) {
          return false;
        }
        seen.add(id);
        return true;
      });
  };

  it('keeps the original order when all options are enabled', () => {
    (useHasNativeFiatProvider as jest.Mock).mockReturnValue(true);

    const { UNSAFE_root } = renderWithProvider(<MoneyAddMoneySheet />);
    const order = getOptionOrder(UNSAFE_root);

    expect(order).toEqual([
      MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION,
      MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION,
      MoneyAddMoneySheetTestIds.MOVE_MUSD_OPTION,
    ]);
  });

  it('moves the disabled Deposit funds (Coming soon) row to the bottom of the options', () => {
    (useHasNativeFiatProvider as jest.Mock).mockReturnValue(false);

    const { UNSAFE_root } = renderWithProvider(<MoneyAddMoneySheet />);
    const order = getOptionOrder(UNSAFE_root);

    expect(order).toEqual([
      MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION,
      MoneyAddMoneySheetTestIds.MOVE_MUSD_OPTION,
      MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION,
    ]);
  });

  it('groups multiple disabled options at the bottom preserving their relative order', () => {
    (selectHasAnyNonZeroTokenBalance as unknown as jest.Mock).mockReturnValue(
      false,
    );
    (useHasNativeFiatProvider as jest.Mock).mockReturnValue(false);

    const { UNSAFE_root } = renderWithProvider(<MoneyAddMoneySheet />);
    const order = getOptionOrder(UNSAFE_root);

    expect(order).toEqual([
      MoneyAddMoneySheetTestIds.MOVE_MUSD_OPTION,
      MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION,
      MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION,
    ]);
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

  describe('analytics', () => {
    it('initialises useMoneyAnalytics with MONEY_ADD_MONEY_SHEET bottom_sheet_name', () => {
      renderWithProvider(<MoneyAddMoneySheet />);

      expect(useMoneyAnalytics).toHaveBeenCalledWith({
        bottom_sheet_name: BOTTOM_SHEET_NAMES.MONEY_ADD_MONEY_SHEET,
      });
    });

    it('calls trackBottomSheetViewed on mount', () => {
      renderWithProvider(<MoneyAddMoneySheet />);

      expect(mockTrackBottomSheetViewed).toHaveBeenCalledTimes(1);
    });

    it('calls trackSurfaceClicked with CONVERT_CRYPTO component when "Convert crypto" row is pressed', () => {
      const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

      fireEvent.press(
        getByTestId(MoneyAddMoneySheetTestIds.CONVERT_CRYPTO_OPTION),
      );

      expect(mockTrackSurfaceClicked).toHaveBeenCalledWith({
        component_name: COMPONENT_NAMES.MONEY_ADD_MONEY_SHEET_CONVERT_CRYPTO,
        redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
      });
    });

    it('calls trackSurfaceClicked with DEPOSIT_FUNDS component when "Deposit funds" row is pressed', () => {
      const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

      fireEvent.press(
        getByTestId(MoneyAddMoneySheetTestIds.DEPOSIT_FUNDS_OPTION),
      );

      expect(mockTrackSurfaceClicked).toHaveBeenCalledWith({
        component_name: COMPONENT_NAMES.MONEY_ADD_MONEY_SHEET_DEPOSIT_FUNDS,
        redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
      });
    });

    it('calls trackSurfaceClicked with MOVE_MUSD component when "Move mUSD" row is pressed', () => {
      const { getByTestId } = renderWithProvider(<MoneyAddMoneySheet />);

      fireEvent.press(getByTestId(MoneyAddMoneySheetTestIds.MOVE_MUSD_OPTION));

      expect(mockTrackSurfaceClicked).toHaveBeenCalledWith({
        component_name: COMPONENT_NAMES.MONEY_ADD_MONEY_SHEET_MOVE_MUSD,
        redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
      });
    });
  });
});
