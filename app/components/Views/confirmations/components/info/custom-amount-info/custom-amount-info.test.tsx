import React, { act } from 'react';
import { merge, noop } from 'lodash';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import {
  CustomAmountInfo,
  CustomAmountInfoProps,
  CustomAmountInfoSkeleton,
} from './custom-amount-info';
import { simpleSendTransactionControllerMock } from '../../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../../__mocks__/controllers/approval-controller-mock';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { useTransactionCustomAmount } from '../../../hooks/transactions/useTransactionCustomAmount';
import { useConfirmationContext } from '../../../context/confirmation-context';
import { Alert, Severity } from '../../../types/alerts';
import { AlertKeys } from '../../../constants/alerts';
import {
  AlertsContextParams,
  useAlerts,
} from '../../../context/alert-system-context';
import { useTransactionCustomAmountAlerts } from '../../../hooks/transactions/useTransactionCustomAmountAlerts';
import { useAccountTokens } from '../../../hooks/send/useAccountTokens';
import { useTransactionPayAvailableTokens } from '../../../hooks/pay/useTransactionPayAvailableTokens';
import { AssetType } from '../../../types/token';
import {
  useTransactionPayRequiredTokens,
  useIsTransactionPayLoading,
  useTransactionPayQuotes,
} from '../../../hooks/pay/useTransactionPayData';
import { useTransactionPayHasSourceAmount } from '../../../hooks/pay/useTransactionPayHasSourceAmount';
import { strings } from '../../../../../../../locales/i18n';
import { Hex } from '@metamask/utils';
import { TransactionPayRequiredToken } from '@metamask/transaction-pay-controller';
import { fireEvent } from '@testing-library/react-native';
import { TransactionType } from '@metamask/transaction-controller';
import { useTransactionConfirm } from '../../../hooks/transactions/useTransactionConfirm';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { useTokenFiatRates } from '../../../hooks/tokens/useTokenFiatRates';
import { useTransactionPayWithdraw } from '../../../hooks/pay/useTransactionPayWithdraw';

jest.mock('../../../hooks/ui/useClearConfirmationOnBackSwipe');
jest.mock('../../../hooks/tokens/useTokenFiatRates');
jest.mock('../../../hooks/pay/useAutomaticTransactionPayToken');
jest.mock('../../../hooks/pay/useTransactionPayToken');
jest.mock('../../../hooks/transactions/useTransactionCustomAmount');
jest.mock('../../../context/confirmation-context');
jest.mock('../../../context/alert-system-context');
jest.mock('../../../hooks/transactions/useTransactionCustomAmountAlerts');
jest.mock('../../../hooks/pay/useTransactionPayMetrics');
jest.mock('../../../hooks/send/useAccountTokens');
jest.mock('../../../hooks/pay/useTransactionPayAvailableTokens');
jest.mock('../../../hooks/pay/useTransactionPayData');
jest.mock('../../../hooks/pay/useTransactionPayHasSourceAmount');
jest.mock('../../../hooks/pay/useTransactionPaySelectedFiatPaymentMethod');
jest.mock('../../../hooks/transactions/useTransactionConfirm');
jest.mock('../../../hooks/transactions/useTransactionMetadataRequest');
jest.mock('../../../hooks/pay/useTransactionPayWithdraw', () => ({
  useTransactionPayWithdraw: jest.fn(() => ({
    isWithdraw: false,
    canSelectWithdrawToken: false,
  })),
}));
jest.mock('../../../../../../util/transaction-controller', () => ({}));
jest.mock('../../../../../../core/Engine', () => ({
  context: {
    TransactionPayController: {
      updateFiatPayment: jest.fn(),
    },
  },
}));
jest.mock('../../PayAccountSelector', () => {
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      onAccountSelected,
      label,
      isPostQuote,
    }: {
      onAccountSelected?: (address: string) => void;
      label?: string;
      isPostQuote?: boolean;
    }) => (
      <TouchableOpacity
        testID="pay-account-selector"
        onPress={() => onAccountSelected?.('0xTestAccount')}
      >
        <Text testID="pay-account-selector-label">{label ?? 'To'}</Text>
        {isPostQuote && <Text testID="pay-account-selector-post-quote" />}
      </TouchableOpacity>
    ),
  };
});
jest.mock('../../../hooks/metrics/useConfirmationAlertMetrics', () => ({
  useConfirmationAlertMetrics: () => ({
    trackInlineAlertClicked: jest.fn(),
    trackAlertActionClicked: jest.fn(),
    trackAlertRendered: jest.fn(),
  }),
}));
jest.mock('../../../hooks/metrics/useConfirmationMetricEvents', () => ({
  useConfirmationMetricEvents: () => ({
    setConfirmationMetric: jest.fn(),
  }),
}));
jest.mock('../../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn(() => ({ build: jest.fn() })),
    })),
  }),
}));

const mockGoToBuy = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('../../../../../UI/Ramp/hooks/useRampNavigation', () => ({
  ...jest.requireActual('../../../../../UI/Ramp/hooks/useRampNavigation'),
  useRampNavigation: () => ({
    goToBuy: mockGoToBuy,
  }),
}));

jest.mock('../../../../../UI/Ramp/hooks/useRampsPaymentMethods', () => ({
  useRampsPaymentMethods: () => ({
    paymentMethods: [],
    selectedPaymentMethod: null,
    setSelectedPaymentMethod: jest.fn(),
    isFetching: false,
    isLoading: false,
    status: 'idle',
    isSuccess: false,
    error: null,
  }),
}));

const TOKEN_ADDRESS_MOCK = '0x123' as Hex;
const CHAIN_ID_MOCK = '0x1' as Hex;

function render(
  props: CustomAmountInfoProps & { transactionType?: TransactionType } = {},
) {
  return renderWithProvider(<CustomAmountInfo {...props} />, {
    state: merge(
      {},
      simpleSendTransactionControllerMock,
      transactionApprovalControllerMock,
      otherControllersMock,
      {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [
                {
                  type:
                    props.transactionType ||
                    TransactionType.contractInteraction,
                },
              ],
            },
          },
        },
      },
    ),
  });
}

describe('CustomAmountInfo', () => {
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const useConfirmationContextMock = jest.mocked(useConfirmationContext);
  const useAlertsMock = jest.mocked(useAlerts);
  const useAccountTokensMock = jest.mocked(useAccountTokens);
  const useTransactionConfirmMock = jest.mocked(useTransactionConfirm);

  const useTransactionPayRequiredTokensMock = jest.mocked(
    useTransactionPayRequiredTokens,
  );

  const useTransactionPayAvailableTokensMock = jest.mocked(
    useTransactionPayAvailableTokens,
  );

  const useIsTransactionPayLoadingMock = jest.mocked(
    useIsTransactionPayLoading,
  );

  const useTransactionPayQuotesMock = jest.mocked(useTransactionPayQuotes);

  const useTransactionPayHasSourceAmountMock = jest.mocked(
    useTransactionPayHasSourceAmount,
  );

  const useTransactionCustomAmountAlertsMock = jest.mocked(
    useTransactionCustomAmountAlerts,
  );

  const useTransactionCustomAmountMock = jest.mocked(
    useTransactionCustomAmount,
  );

  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );

  const useTokenFiatRatesMock = jest.mocked(useTokenFiatRates);
  const useTransactionPayWithdrawMock = jest.mocked(useTransactionPayWithdraw);

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionPayWithdrawMock.mockReturnValue({
      isWithdraw: false,
      canSelectWithdrawToken: false,
    });

    useTransactionPayTokenMock.mockReturnValue({
      payToken: {
        address: '0x123',
        balanceHuman: '0',
        balanceFiat: '0',
        balanceRaw: '0',
        balanceUsd: '0',
        chainId: '0x1',
        decimals: 18,
        symbol: 'TST',
      },
      setPayToken: noop as never,
    });

    useTransactionCustomAmountMock.mockReturnValue({
      amountFiat: '123.45',
      amountHuman: '0',
      amountHumanDebounced: '0',
      hasInput: true,
      isInputChanged: false,
      updatePendingAmount: noop,
      updatePendingAmountPercentage: noop,
      updateTokenAmount: noop,
    });

    useConfirmationContextMock.mockReturnValue({
      setIsFooterVisible: noop,
    } as ReturnType<typeof useConfirmationContext>);

    useAlertsMock.mockReturnValue({
      alerts: [] as Alert[],
      generalAlerts: [] as Alert[],
      fieldAlerts: [] as Alert[],
    } as AlertsContextParams);

    useTransactionCustomAmountAlertsMock.mockReturnValue({
      alertTitle: undefined,
      alertMessage: undefined,
    });

    useAccountTokensMock.mockReturnValue([]);
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [{}] as AssetType[],
      hasTokens: true,
    });
    useTransactionPayRequiredTokensMock.mockReturnValue([]);
    useTransactionConfirmMock.mockReturnValue({} as never);
    useIsTransactionPayLoadingMock.mockReturnValue(false);
    useTransactionPayQuotesMock.mockReturnValue([]);
    useTransactionPayHasSourceAmountMock.mockReturnValue(false);
    useTokenFiatRatesMock.mockReturnValue([1, 1]);
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.contractInteraction,
      txParams: { from: '0x123' },
    } as never);
  });

  it('renders amount', () => {
    const { getByText } = render();

    expect(getByText('123.45')).toBeOnTheScreen();
  });

  it('renders payment token', () => {
    const { getByText } = render();
    expect(getByText('0 TST')).toBeDefined();
  });

  it('does not render payment token if disablePay', () => {
    const { queryByText } = render({ disablePay: true });
    expect(queryByText('TST')).toBeNull();
  });

  it('renders alert', () => {
    useTransactionCustomAmountAlertsMock.mockReturnValue({
      alertTitle: 'Test Alert Title',
      alertMessage: 'Test Alert Message',
    });

    const { getByText } = render();

    expect(getByText('Test Alert Title')).toBeDefined();
    expect(getByText('Test Alert Message')).toBeDefined();
  });

  it('renders keyboard', () => {
    const { getByTestId } = render();
    expect(getByTestId('deposit-keyboard')).toBeDefined();
  });

  it('renders footerText when passed in', () => {
    const hint = 'Test footer text';
    const { getByText } = render({ footerText: hint });

    expect(getByText(hint)).toBeOnTheScreen();
  });

  it('does not render footerText when not passed in', () => {
    const hint = 'Test footer text';
    const { queryByText } = render();

    expect(queryByText(hint)).toBeNull();
  });

  it('renders buy button if no available tokens', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [],
      hasTokens: false,
    });

    const { getByText } = render();

    expect(
      getByText(strings('confirm.custom_amount.buy_button')),
    ).toBeDefined();
  });

  it('navigates to ramps if buy button pressed', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [],
      hasTokens: false,
    });

    useAccountTokensMock.mockReturnValue([
      {
        address: TOKEN_ADDRESS_MOCK,
        assetId: TOKEN_ADDRESS_MOCK,
        chainId: CHAIN_ID_MOCK,
      } as AssetType,
    ]);

    useTransactionPayRequiredTokensMock.mockReturnValue([
      {
        address: TOKEN_ADDRESS_MOCK,
        chainId: CHAIN_ID_MOCK,
      },
    ] as TransactionPayRequiredToken[]);

    const { getByText } = render();

    fireEvent.press(getByText(strings('confirm.custom_amount.buy_button')));

    expect(mockGoToBuy).toHaveBeenCalledTimes(1);
    expect(mockGoToBuy).toHaveBeenCalledWith({
      assetId: 'eip155:1/erc20:0x123',
    });
  });

  it.each([TransactionType.predictWithdraw, TransactionType.perpsWithdraw])(
    'renders the withdraw confirm label for %s transactions',
    async (transactionType) => {
      useTransactionMetadataRequestMock.mockReturnValue({
        type: transactionType,
        txParams: { from: '0x123' },
      } as never);

      const { getByText, findByText } = render({ transactionType });

      await act(async () => {
        fireEvent.press(getByText(strings('confirm.edit_amount_done')));
      });

      expect(
        await findByText(
          strings('confirm.deposit_edit_amount_predict_withdraw'),
        ),
      ).toBeOnTheScreen();
    },
  );

  it('hides PayTokenAmount when hidePayTokenAmount is true', () => {
    const { queryByText } = render({ hidePayTokenAmount: true });

    expect(queryByText('0 TST')).toBeNull();
    expect(
      queryByText(new RegExp(strings('confirm.label.pay_with'))),
    ).toBeOnTheScreen();
  });

  it('calls onAmountSubmit when Done button is pressed', async () => {
    const mockOnAmountSubmit = jest.fn();

    const { getByText } = render({ onAmountSubmit: mockOnAmountSubmit });

    await act(async () => {
      fireEvent.press(getByText(strings('confirm.edit_amount_done')));
    });

    expect(mockOnAmountSubmit).toHaveBeenCalledTimes(1);
  });

  it('does not render PayAccountSelector for non-moneyAccount transactions', () => {
    const { queryByTestId } = render();

    expect(queryByTestId('pay-account-selector')).toBeNull();
  });

  it('renders PayAccountSelector with isPostQuote for moneyAccountWithdraw', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.moneyAccountWithdraw,
      txParams: { from: '0x123' },
    } as never);

    const { getByTestId } = render({
      transactionType: TransactionType.moneyAccountWithdraw,
    });

    expect(getByTestId('pay-account-selector')).toBeOnTheScreen();
    expect(getByTestId('pay-account-selector-post-quote')).toBeOnTheScreen();
  });

  it('renders no funds alert message for moneyAccountDeposit when alert is present', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.moneyAccountDeposit,
      txParams: { from: '0x123' },
    } as never);

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [],
      hasTokens: false,
    });

    useTransactionCustomAmountAlertsMock.mockReturnValue({
      alertTitle: strings('alert_system.account_no_funds.message'),
      alertMessage: strings('alert_system.account_no_funds.message'),
    });

    const { getByText } = render({
      transactionType: TransactionType.moneyAccountDeposit,
    });

    expect(
      getByText(strings('alert_system.account_no_funds.message')),
    ).toBeOnTheScreen();
  });

  it('does not render no funds alert for moneyAccountDeposit when tokens available', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.moneyAccountDeposit,
      txParams: { from: '0x123' },
    } as never);

    const { queryByText } = render({
      transactionType: TransactionType.moneyAccountDeposit,
    });

    expect(
      queryByText(strings('alert_system.account_no_funds.message')),
    ).toBeNull();
  });

  it('renders PayAccountSelector without isPostQuote for moneyAccountDeposit', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.moneyAccountDeposit,
      txParams: { from: '0x123' },
    } as never);

    const { getByTestId, queryByTestId } = render({
      transactionType: TransactionType.moneyAccountDeposit,
    });

    expect(getByTestId('pay-account-selector')).toBeOnTheScreen();
    expect(getByTestId('pay-account-selector-label')).toHaveTextContent('From');
    expect(queryByTestId('pay-account-selector-post-quote')).toBeNull();
  });

  describe('showPaymentDetails', () => {
    async function pressDone(
      getByText: ReturnType<typeof render>['getByText'],
    ) {
      await act(async () => {
        fireEvent.press(getByText(strings('confirm.edit_amount_done')));
      });
    }

    it('shows fee rows for same-chain payment without quotes', async () => {
      useTransactionPayHasSourceAmountMock.mockReturnValue(false);
      useTransactionPayQuotesMock.mockReturnValue([]);

      const { getByText, getByTestId } = render();
      await pressDone(getByText);

      expect(getByTestId('bridge-fee-row')).toBeOnTheScreen();
    });

    it('hides fee rows when no-quotes alert is present', async () => {
      useTransactionPayHasSourceAmountMock.mockReturnValue(false);
      useTransactionPayQuotesMock.mockReturnValue([]);
      useAlertsMock.mockReturnValue({
        alerts: [
          {
            key: AlertKeys.NoPayTokenQuotes,
            severity: Severity.Danger,
            isBlocking: true,
          },
        ] as Alert[],
        generalAlerts: [] as Alert[],
        fieldAlerts: [] as Alert[],
      } as AlertsContextParams);

      const { getByText, queryByTestId } = render();
      await pressDone(getByText);

      expect(queryByTestId('bridge-fee-row')).toBeNull();
    });

    it('shows fee rows when quotes exist regardless of source amount', async () => {
      useTransactionPayHasSourceAmountMock.mockReturnValue(true);
      useTransactionPayQuotesMock.mockReturnValue([{} as never]);

      const { getByText, getByTestId } = render();
      await pressDone(getByText);

      expect(getByTestId('bridge-fee-row')).toBeOnTheScreen();
    });
  });
});

describe('CustomAmountInfoSkeleton', () => {
  it('renders skeleton without AccountSelectorSkeleton', () => {
    const { queryByTestId } = renderWithProvider(<CustomAmountInfoSkeleton />, {
      state: merge(
        {},
        simpleSendTransactionControllerMock,
        transactionApprovalControllerMock,
        otherControllersMock,
      ),
    });

    expect(queryByTestId('account-selector-skeleton')).toBeNull();
  });
});
