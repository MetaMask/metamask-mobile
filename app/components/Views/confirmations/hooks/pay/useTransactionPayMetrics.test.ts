import { merge, noop } from 'lodash';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  simpleSendTransactionControllerMock,
  transactionIdMock,
} from '../../__mocks__/controllers/transaction-controller-mock';
import { useTransactionPayMetrics } from './useTransactionPayMetrics';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import {
  otherControllersMock,
  tokenAddress1Mock,
} from '../../__mocks__/controllers/other-controllers-mock';
import { useTransactionPayToken } from './useTransactionPayToken';
import { act } from '@testing-library/react-native';
import { updateConfirmationMetric } from '../../../../../core/redux/slices/confirmationMetrics';
import { TransactionType } from '@metamask/transaction-controller';
import {
  PaymentOverride,
  TransactionPayQuote,
  TransactionPayRequiredToken,
  TransactionPayStrategy,
} from '@metamask/transaction-pay-controller';
import { Json } from '@metamask/utils';
import {
  useTransactionPayQuotes,
  useTransactionPayRequiredTokens,
  useTransactionPayFiatPayment,
} from './useTransactionPayData';
import { useTransactionPayAvailableTokens } from './useTransactionPayAvailableTokens';
import { useAccountTokens } from '../send/useAccountTokens';
import { AssetType } from '../../types/token';
import { selectPaymentOverrideByTransactionId } from '../../../../../selectors/transactionPayController';
import { useIsPerpsBalanceSelected } from '../../../../UI/Perps/hooks/useIsPerpsBalanceSelected';
import { selectPredictSelectedPaymentToken } from '../../../../UI/Predict/selectors/predictController';
import { useIsMoneyAccountFlagDefault } from './useIsMoneyAccountFlagDefault';

jest.mock('./useTransactionPayToken');
jest.mock('../useTokenAmount');
jest.mock('../../../../../selectors/transactionPayController');
jest.mock('../pay/useTransactionPayData');
jest.mock('./useTransactionPayAvailableTokens');
jest.mock('../send/useAccountTokens');
jest.mock('../../../../UI/Perps/hooks/useIsPerpsBalanceSelected');
jest.mock('../../../../UI/Predict/selectors/predictController');
jest.mock('./useIsMoneyAccountFlagDefault');

const mockSelectConfirmationMetricsById = jest.fn();

jest.mock('../../../../../core/redux/slices/confirmationMetrics', () => ({
  ...jest.requireActual('../../../../../core/redux/slices/confirmationMetrics'),
  updateConfirmationMetric: jest.fn(),
  selectConfirmationMetricsById: (...args: unknown[]) =>
    mockSelectConfirmationMetricsById(...args),
}));

const CHAIN_ID_MOCK = '0x1';
const TOKEN_AMOUNT_MOCK = '1.23';

const PAY_TOKEN_MOCK = {
  address: tokenAddress1Mock,
  chainId: CHAIN_ID_MOCK,
  symbol: 'TST',
};

const QUOTE_MOCK = {
  dust: {
    fiat: '0.6',
    usd: '0.5',
  },
  strategy: TransactionPayStrategy.Bridge,
} as TransactionPayQuote<Json>;

function runHook({ type }: { type?: TransactionType } = {}) {
  const state = merge(
    {},
    simpleSendTransactionControllerMock,
    transactionApprovalControllerMock,
    otherControllersMock,
  );

  state.engine.backgroundState.TransactionController.transactions[0].type =
    type ?? TransactionType.perpsDeposit;

  return renderHookWithProvider(useTransactionPayMetrics, {
    state,
  });
}

describe('useTransactionPayMetrics', () => {
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const updateConfirmationMetricMock = jest.mocked(updateConfirmationMetric);
  const useTransactionPayQuotesMock = jest.mocked(useTransactionPayQuotes);

  const useTransactionPayRequiredTokensMock = jest.mocked(
    useTransactionPayRequiredTokens,
  );

  const useTransactionPayAvailableTokensMock = jest.mocked(
    useTransactionPayAvailableTokens,
  );

  const useAccountTokensMock = jest.mocked(useAccountTokens);
  const selectPaymentOverrideMock = jest.mocked(
    selectPaymentOverrideByTransactionId,
  );
  const useIsPerpsBalanceSelectedMock = jest.mocked(useIsPerpsBalanceSelected);
  const selectPredictSelectedPaymentTokenMock = jest.mocked(
    selectPredictSelectedPaymentToken,
  );
  const useIsMoneyAccountFlagDefaultMock = jest.mocked(
    useIsMoneyAccountFlagDefault,
  );
  const useTransactionPayFiatPaymentMock = jest.mocked(
    useTransactionPayFiatPayment,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionPayTokenMock.mockReturnValue({
      payToken: undefined,
      setPayToken: noop as never,
    });

    useTransactionPayRequiredTokensMock.mockReturnValue([
      {
        amountHuman: TOKEN_AMOUNT_MOCK,
      } as TransactionPayRequiredToken,
    ]);

    updateConfirmationMetricMock.mockReturnValue({
      type: 'test',
    } as never);

    useTransactionPayQuotesMock.mockReturnValue([]);
    useAccountTokensMock.mockReturnValue([]);
    mockSelectConfirmationMetricsById.mockReturnValue(undefined);

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [{}, {}, {}, {}, {}] as AssetType[],
      hasTokens: true,
    });

    selectPaymentOverrideMock.mockReturnValue(undefined);
    useIsPerpsBalanceSelectedMock.mockReturnValue(false);
    selectPredictSelectedPaymentTokenMock.mockReturnValue({
      address: '0x123',
      chainId: '0x1',
    });
    useIsMoneyAccountFlagDefaultMock.mockReturnValue(false);
    useTransactionPayFiatPaymentMock.mockReturnValue(undefined);
  });

  it('dispatches empty properties if no pay token selected', async () => {
    runHook();

    await act(async () => noop());

    expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
      id: transactionIdMock,
      params: {
        properties: {},
        sensitiveProperties: {},
      },
    });
  });

  it('includes UI-only properties when pay token is selected', async () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: PAY_TOKEN_MOCK,
      setPayToken: noop,
    } as ReturnType<typeof useTransactionPayToken>);

    runHook();

    await act(async () => noop());

    expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
      id: transactionIdMock,
      params: {
        properties: expect.objectContaining({
          mm_pay_token_presented: PAY_TOKEN_MOCK.symbol,
          mm_pay_chain_presented: PAY_TOKEN_MOCK.chainId,
          mm_pay_payment_token_list_size: 5,
          mm_pay_quote_requested: false,
          mm_pay_quote_loaded: false,
          mm_pay_chain_highest_balance_caip: null,
        }),
        sensitiveProperties: {},
      },
    });
  });

  it('does not include builder-owned properties', async () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: PAY_TOKEN_MOCK,
      setPayToken: noop,
    } as ReturnType<typeof useTransactionPayToken>);

    useTransactionPayQuotesMock.mockReturnValue([QUOTE_MOCK]);

    runHook();

    await act(async () => noop());

    const calledProps = (
      updateConfirmationMetricMock.mock.calls[0]?.[0] as {
        params: { properties: Record<string, unknown> };
      }
    )?.params?.properties;

    expect(calledProps).not.toHaveProperty('mm_pay');
    expect(calledProps).not.toHaveProperty('mm_pay_token_selected');
    expect(calledProps).not.toHaveProperty('mm_pay_chain_selected');
    expect(calledProps).not.toHaveProperty('mm_pay_use_case');
    expect(calledProps).not.toHaveProperty('mm_pay_sending_value_usd');
    expect(calledProps).not.toHaveProperty('mm_pay_receiving_value_usd');
    expect(calledProps).not.toHaveProperty('mm_pay_metamask_fee_usd');
    expect(calledProps).not.toHaveProperty('mm_pay_strategy');
    expect(calledProps).not.toHaveProperty('mm_pay_network_fee_usd');
    expect(calledProps).not.toHaveProperty('mm_pay_provider_fee_usd');
    expect(calledProps).not.toHaveProperty('mm_pay_transaction_step');
    expect(calledProps).not.toHaveProperty('mm_pay_transaction_step_total');
  });

  it('includes simulation_sending_assets_total_value for perps deposit', async () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: PAY_TOKEN_MOCK,
      setPayToken: noop,
    } as ReturnType<typeof useTransactionPayToken>);

    runHook();

    await act(async () => noop());

    expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
      id: transactionIdMock,
      params: {
        properties: expect.objectContaining({
          simulation_sending_assets_total_value: 1.23,
        }),
        sensitiveProperties: {},
      },
    });
  });

  it('includes simulation_sending_assets_total_value for predict deposit', async () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: PAY_TOKEN_MOCK,
      setPayToken: noop,
    } as ReturnType<typeof useTransactionPayToken>);

    runHook({ type: TransactionType.predictDeposit });

    await act(async () => noop());

    expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
      id: transactionIdMock,
      params: {
        properties: expect.objectContaining({
          simulation_sending_assets_total_value: 1.23,
        }),
        sensitiveProperties: {},
      },
    });
  });

  it('includes simulation_sending_assets_total_value for predict deposit and order', async () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: PAY_TOKEN_MOCK,
      setPayToken: noop,
    } as ReturnType<typeof useTransactionPayToken>);

    runHook({ type: TransactionType.predictDepositAndOrder });

    await act(async () => noop());

    expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
      id: transactionIdMock,
      params: {
        properties: expect.objectContaining({
          simulation_sending_assets_total_value: 1.23,
        }),
        sensitiveProperties: {},
      },
    });
  });

  it('includes simulation_sending_assets_total_value for money account deposit', async () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: PAY_TOKEN_MOCK,
      setPayToken: noop,
    } as ReturnType<typeof useTransactionPayToken>);

    runHook({ type: TransactionType.moneyAccountDeposit });

    await act(async () => noop());

    expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
      id: transactionIdMock,
      params: {
        properties: expect.objectContaining({
          simulation_sending_assets_total_value: 1.23,
        }),
        sensitiveProperties: {},
      },
    });
  });

  it('omits simulation_sending_assets_total_value for money account withdraw', async () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: PAY_TOKEN_MOCK,
      setPayToken: noop,
    } as ReturnType<typeof useTransactionPayToken>);

    runHook({ type: TransactionType.moneyAccountWithdraw });

    await act(async () => noop());

    const calledProps = (
      updateConfirmationMetricMock.mock.calls[0]?.[0] as {
        params: { properties: Record<string, unknown> };
      }
    )?.params?.properties;

    expect(calledProps).not.toHaveProperty(
      'simulation_sending_assets_total_value',
    );
  });

  describe('mm_pay_quote_requested', () => {
    it('is false initially', async () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: PAY_TOKEN_MOCK,
        setPayToken: noop,
      } as ReturnType<typeof useTransactionPayToken>);

      runHook();

      await act(async () => noop());

      expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
        id: transactionIdMock,
        params: {
          properties: expect.objectContaining({
            mm_pay_quote_requested: false,
          }),
          sensitiveProperties: {},
        },
      });
    });

    it('is true when stored in metrics', async () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: PAY_TOKEN_MOCK,
        setPayToken: noop,
      } as ReturnType<typeof useTransactionPayToken>);
      mockSelectConfirmationMetricsById.mockReturnValue({
        properties: { mm_pay_quote_requested: true },
      });

      runHook();

      await act(async () => noop());

      expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
        id: transactionIdMock,
        params: {
          properties: expect.objectContaining({
            mm_pay_quote_requested: true,
          }),
          sensitiveProperties: {},
        },
      });
    });
  });

  describe('mm_pay_quote_loaded', () => {
    it('is true when has quotes', async () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: PAY_TOKEN_MOCK,
        setPayToken: noop,
      } as ReturnType<typeof useTransactionPayToken>);
      useTransactionPayQuotesMock.mockReturnValue([QUOTE_MOCK]);

      runHook();

      await act(async () => noop());

      expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
        id: transactionIdMock,
        params: {
          properties: expect.objectContaining({
            mm_pay_quote_loaded: true,
          }),
          sensitiveProperties: {},
        },
      });
    });

    it('is false when no quotes', async () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: PAY_TOKEN_MOCK,
        setPayToken: noop,
      } as ReturnType<typeof useTransactionPayToken>);
      useTransactionPayQuotesMock.mockReturnValue([]);

      runHook();

      await act(async () => noop());

      expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
        id: transactionIdMock,
        params: {
          properties: expect.objectContaining({
            mm_pay_quote_loaded: false,
          }),
          sensitiveProperties: {},
        },
      });
    });
  });

  describe('mm_pay_chain_highest_balance_caip', () => {
    it('is null when no tokens', async () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: PAY_TOKEN_MOCK,
        setPayToken: noop,
      } as ReturnType<typeof useTransactionPayToken>);
      useAccountTokensMock.mockReturnValue([]);

      runHook();

      await act(async () => noop());

      expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
        id: transactionIdMock,
        params: {
          properties: expect.objectContaining({
            mm_pay_chain_highest_balance_caip: null,
          }),
          sensitiveProperties: {},
        },
      });
    });

    it('returns CAIP chainId with highest balance', async () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: PAY_TOKEN_MOCK,
        setPayToken: noop,
      } as ReturnType<typeof useTransactionPayToken>);
      useAccountTokensMock.mockReturnValue([
        { chainId: '0x1', fiat: { balance: 100 } },
        { chainId: '0x1', fiat: { balance: 50 } },
        { chainId: '0x38', fiat: { balance: 200 } },
        { chainId: '0x89', fiat: { balance: 30 } },
      ] as AssetType[]);

      runHook();

      await act(async () => noop());

      expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
        id: transactionIdMock,
        params: {
          properties: expect.objectContaining({
            mm_pay_chain_highest_balance_caip: 'eip155:56',
          }),
          sensitiveProperties: {},
        },
      });
    });

    it('preserves CAIP chainId if already in CAIP format', async () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: PAY_TOKEN_MOCK,
        setPayToken: noop,
      } as ReturnType<typeof useTransactionPayToken>);
      useAccountTokensMock.mockReturnValue([
        {
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          fiat: { balance: 500 },
        },
        { chainId: '0x1', fiat: { balance: 100 } },
      ] as AssetType[]);

      runHook();

      await act(async () => noop());

      expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
        id: transactionIdMock,
        params: {
          properties: expect.objectContaining({
            mm_pay_chain_highest_balance_caip:
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          }),
          sensitiveProperties: {},
        },
      });
    });
  });

  describe('mm_pay_section_source', () => {
    beforeEach(() => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: PAY_TOKEN_MOCK,
        setPayToken: noop,
      } as ReturnType<typeof useTransactionPayToken>);
    });

    it('defaults to crypto when no override is active', async () => {
      runHook();

      await act(async () => noop());

      expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
        id: transactionIdMock,
        params: {
          properties: expect.objectContaining({
            mm_pay_section_source_presented: 'crypto',
            mm_pay_section_source_selected: 'crypto',
            mm_pay_section_source_switch_count: 0,
          }),
          sensitiveProperties: {},
        },
      });
    });

    it('is money-account when payment override is MoneyAccount', async () => {
      selectPaymentOverrideMock.mockReturnValue(PaymentOverride.MoneyAccount);

      runHook();

      await act(async () => noop());

      expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
        id: transactionIdMock,
        params: {
          properties: expect.objectContaining({
            mm_pay_section_source_presented: 'money-account',
            mm_pay_section_source_selected: 'money-account',
          }),
          sensitiveProperties: {},
        },
      });
    });

    it('is money-account when isDefaultMoneyAccount flag is true', async () => {
      useIsMoneyAccountFlagDefaultMock.mockReturnValue(true);

      runHook();

      await act(async () => noop());

      expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
        id: transactionIdMock,
        params: {
          properties: expect.objectContaining({
            mm_pay_section_source_presented: 'money-account',
            mm_pay_section_source_selected: 'money-account',
          }),
          sensitiveProperties: {},
        },
      });
    });

    it('is perps when perps balance selected for perpsDepositAndOrder', async () => {
      useIsPerpsBalanceSelectedMock.mockReturnValue(true);

      runHook({ type: TransactionType.perpsDepositAndOrder });

      await act(async () => noop());

      expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
        id: transactionIdMock,
        params: {
          properties: expect.objectContaining({
            mm_pay_section_source_presented: 'perps',
            mm_pay_section_source_selected: 'perps',
          }),
          sensitiveProperties: {},
        },
      });
    });

    it('is crypto when perps balance selected but not perpsDepositAndOrder', async () => {
      useIsPerpsBalanceSelectedMock.mockReturnValue(true);

      runHook({ type: TransactionType.perpsDeposit });

      await act(async () => noop());

      expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
        id: transactionIdMock,
        params: {
          properties: expect.objectContaining({
            mm_pay_section_source_selected: 'crypto',
          }),
          sensitiveProperties: {},
        },
      });
    });

    it('is predict when predict balance selected for predictDepositAndOrder', async () => {
      selectPredictSelectedPaymentTokenMock.mockReturnValue(null);

      runHook({ type: TransactionType.predictDepositAndOrder });

      await act(async () => noop());

      expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
        id: transactionIdMock,
        params: {
          properties: expect.objectContaining({
            mm_pay_section_source_presented: 'predict',
            mm_pay_section_source_selected: 'predict',
          }),
          sensitiveProperties: {},
        },
      });
    });

    it('is bank-card when fiat payment is selected', async () => {
      useTransactionPayFiatPaymentMock.mockReturnValue({
        selectedPaymentMethodId: 'pm_123',
      } as never);

      runHook();

      await act(async () => noop());

      expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
        id: transactionIdMock,
        params: {
          properties: expect.objectContaining({
            mm_pay_section_source_presented: 'bank-card',
            mm_pay_section_source_selected: 'bank-card',
          }),
          sensitiveProperties: {},
        },
      });
    });

    it('is not included when no pay token', async () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: undefined,
        setPayToken: noop as never,
      });

      runHook();

      await act(async () => noop());

      const calledProps = (
        updateConfirmationMetricMock.mock.calls[0]?.[0] as {
          params: { properties: Record<string, unknown> };
        }
      )?.params?.properties;

      expect(calledProps).not.toHaveProperty('mm_pay_section_source_presented');
      expect(calledProps).not.toHaveProperty('mm_pay_section_source_selected');
      expect(calledProps).not.toHaveProperty(
        'mm_pay_section_source_switch_count',
      );
    });

    it('increments switch count on section change', async () => {
      const { rerender } = runHook();

      await act(async () => noop());

      expect(updateConfirmationMetricMock).toHaveBeenLastCalledWith({
        id: transactionIdMock,
        params: {
          properties: expect.objectContaining({
            mm_pay_section_source_presented: 'crypto',
            mm_pay_section_source_selected: 'crypto',
            mm_pay_section_source_switch_count: 0,
          }),
          sensitiveProperties: {},
        },
      });

      selectPaymentOverrideMock.mockReturnValue(PaymentOverride.MoneyAccount);

      rerender({});

      await act(async () => noop());

      expect(updateConfirmationMetricMock).toHaveBeenLastCalledWith({
        id: transactionIdMock,
        params: {
          properties: expect.objectContaining({
            mm_pay_section_source_presented: 'crypto',
            mm_pay_section_source_selected: 'money-account',
            mm_pay_section_source_switch_count: 1,
          }),
          sensitiveProperties: {},
        },
      });
    });

    it('money-account override takes priority over perps and predict', async () => {
      selectPaymentOverrideMock.mockReturnValue(PaymentOverride.MoneyAccount);
      useIsPerpsBalanceSelectedMock.mockReturnValue(true);
      selectPredictSelectedPaymentTokenMock.mockReturnValue(null);

      runHook({ type: TransactionType.perpsDepositAndOrder });

      await act(async () => noop());

      expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
        id: transactionIdMock,
        params: {
          properties: expect.objectContaining({
            mm_pay_section_source_selected: 'money-account',
          }),
          sensitiveProperties: {},
        },
      });
    });
  });

  describe('mm_pay_section_recipient', () => {
    beforeEach(() => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: PAY_TOKEN_MOCK,
        setPayToken: noop,
      } as ReturnType<typeof useTransactionPayToken>);
    });

    it('is perps for perpsDeposit', async () => {
      runHook({ type: TransactionType.perpsDeposit });

      await act(async () => noop());

      expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
        id: transactionIdMock,
        params: {
          properties: expect.objectContaining({
            mm_pay_section_recipient_presented: 'perps',
            mm_pay_section_recipient_selected: 'perps',
            mm_pay_section_recipient_switch_count: 0,
          }),
          sensitiveProperties: {},
        },
      });
    });

    it('is perps for perpsDepositAndOrder', async () => {
      runHook({ type: TransactionType.perpsDepositAndOrder });

      await act(async () => noop());

      expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
        id: transactionIdMock,
        params: {
          properties: expect.objectContaining({
            mm_pay_section_recipient_presented: 'perps',
            mm_pay_section_recipient_selected: 'perps',
          }),
          sensitiveProperties: {},
        },
      });
    });

    it('is predict for predictDeposit', async () => {
      runHook({ type: TransactionType.predictDeposit });

      await act(async () => noop());

      expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
        id: transactionIdMock,
        params: {
          properties: expect.objectContaining({
            mm_pay_section_recipient_presented: 'predict',
            mm_pay_section_recipient_selected: 'predict',
          }),
          sensitiveProperties: {},
        },
      });
    });

    it('is money-account for moneyAccountDeposit', async () => {
      runHook({ type: TransactionType.moneyAccountDeposit });

      await act(async () => noop());

      expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
        id: transactionIdMock,
        params: {
          properties: expect.objectContaining({
            mm_pay_section_recipient_presented: 'money-account',
            mm_pay_section_recipient_selected: 'money-account',
          }),
          sensitiveProperties: {},
        },
      });
    });

    it('uses PayWithBottomSheet state for perpsWithdraw', async () => {
      runHook({ type: TransactionType.perpsWithdraw });

      await act(async () => noop());

      expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
        id: transactionIdMock,
        params: {
          properties: expect.objectContaining({
            mm_pay_section_recipient_presented: 'crypto',
            mm_pay_section_recipient_selected: 'crypto',
            mm_pay_section_recipient_switch_count: 0,
          }),
          sensitiveProperties: {},
        },
      });
    });

    it('uses PayWithBottomSheet state for predictWithdraw', async () => {
      runHook({ type: TransactionType.predictWithdraw });

      await act(async () => noop());

      expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
        id: transactionIdMock,
        params: {
          properties: expect.objectContaining({
            mm_pay_section_recipient_selected: 'crypto',
          }),
          sensitiveProperties: {},
        },
      });
    });

    it('uses PayWithBottomSheet state for moneyAccountWithdraw', async () => {
      selectPaymentOverrideMock.mockReturnValue(PaymentOverride.MoneyAccount);

      runHook({ type: TransactionType.moneyAccountWithdraw });

      await act(async () => noop());

      expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
        id: transactionIdMock,
        params: {
          properties: expect.objectContaining({
            mm_pay_section_recipient_selected: 'money-account',
          }),
          sensitiveProperties: {},
        },
      });
    });

    it('tracks recipient switch count for withdrawals', async () => {
      const { rerender } = runHook({ type: TransactionType.perpsWithdraw });

      await act(async () => noop());

      expect(updateConfirmationMetricMock).toHaveBeenLastCalledWith({
        id: transactionIdMock,
        params: {
          properties: expect.objectContaining({
            mm_pay_section_recipient_presented: 'crypto',
            mm_pay_section_recipient_selected: 'crypto',
            mm_pay_section_recipient_switch_count: 0,
          }),
          sensitiveProperties: {},
        },
      });

      selectPaymentOverrideMock.mockReturnValue(PaymentOverride.MoneyAccount);

      rerender({});

      await act(async () => noop());

      expect(updateConfirmationMetricMock).toHaveBeenLastCalledWith({
        id: transactionIdMock,
        params: {
          properties: expect.objectContaining({
            mm_pay_section_recipient_presented: 'crypto',
            mm_pay_section_recipient_selected: 'money-account',
            mm_pay_section_recipient_switch_count: 1,
          }),
          sensitiveProperties: {},
        },
      });
    });

    it('is not included when no pay token', async () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: undefined,
        setPayToken: noop as never,
      });

      runHook();

      await act(async () => noop());

      const calledProps = (
        updateConfirmationMetricMock.mock.calls[0]?.[0] as {
          params: { properties: Record<string, unknown> };
        }
      )?.params?.properties;

      expect(calledProps).not.toHaveProperty(
        'mm_pay_section_recipient_presented',
      );
      expect(calledProps).not.toHaveProperty(
        'mm_pay_section_recipient_selected',
      );
      expect(calledProps).not.toHaveProperty(
        'mm_pay_section_recipient_switch_count',
      );
    });
  });

  describe('mm_pay_entry_point', () => {
    beforeEach(() => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: PAY_TOKEN_MOCK,
        setPayToken: noop,
      } as ReturnType<typeof useTransactionPayToken>);
    });

    it('is perps for perpsDeposit', async () => {
      runHook({ type: TransactionType.perpsDeposit });

      await act(async () => noop());

      expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
        id: transactionIdMock,
        params: {
          properties: expect.objectContaining({
            mm_pay_entry_point: 'perps',
          }),
          sensitiveProperties: {},
        },
      });
    });

    it('is perps for perpsDepositAndOrder', async () => {
      runHook({ type: TransactionType.perpsDepositAndOrder });

      await act(async () => noop());

      expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
        id: transactionIdMock,
        params: {
          properties: expect.objectContaining({
            mm_pay_entry_point: 'perps',
          }),
          sensitiveProperties: {},
        },
      });
    });

    it('is perps for perpsWithdraw', async () => {
      runHook({ type: TransactionType.perpsWithdraw });

      await act(async () => noop());

      expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
        id: transactionIdMock,
        params: {
          properties: expect.objectContaining({
            mm_pay_entry_point: 'perps',
          }),
          sensitiveProperties: {},
        },
      });
    });

    it('is predict for predictDeposit', async () => {
      runHook({ type: TransactionType.predictDeposit });

      await act(async () => noop());

      expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
        id: transactionIdMock,
        params: {
          properties: expect.objectContaining({
            mm_pay_entry_point: 'predict',
          }),
          sensitiveProperties: {},
        },
      });
    });

    it('is predict for predictDepositAndOrder', async () => {
      runHook({ type: TransactionType.predictDepositAndOrder });

      await act(async () => noop());

      expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
        id: transactionIdMock,
        params: {
          properties: expect.objectContaining({
            mm_pay_entry_point: 'predict',
          }),
          sensitiveProperties: {},
        },
      });
    });

    it('is money_account for moneyAccountDeposit', async () => {
      runHook({ type: TransactionType.moneyAccountDeposit });

      await act(async () => noop());

      expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
        id: transactionIdMock,
        params: {
          properties: expect.objectContaining({
            mm_pay_entry_point: 'money_account',
          }),
          sensitiveProperties: {},
        },
      });
    });

    it('is money_account for moneyAccountWithdraw', async () => {
      runHook({ type: TransactionType.moneyAccountWithdraw });

      await act(async () => noop());

      expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
        id: transactionIdMock,
        params: {
          properties: expect.objectContaining({
            mm_pay_entry_point: 'money_account',
          }),
          sensitiveProperties: {},
        },
      });
    });

    it('is money_hub for musdConversion', async () => {
      runHook({ type: TransactionType.musdConversion });

      await act(async () => noop());

      expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
        id: transactionIdMock,
        params: {
          properties: expect.objectContaining({
            mm_pay_entry_point: 'money_hub',
          }),
          sensitiveProperties: {},
        },
      });
    });

    it('is null for unrecognized transaction types', async () => {
      runHook({ type: TransactionType.simpleSend });

      await act(async () => noop());

      expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
        id: transactionIdMock,
        params: {
          properties: expect.objectContaining({
            mm_pay_entry_point: null,
          }),
          sensitiveProperties: {},
        },
      });
    });

    it('is not included when no pay token', async () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: undefined,
        setPayToken: noop as never,
      });

      runHook();

      await act(async () => noop());

      const calledProps = (
        updateConfirmationMetricMock.mock.calls[0]?.[0] as {
          params: { properties: Record<string, unknown> };
        }
      )?.params?.properties;

      expect(calledProps).not.toHaveProperty('mm_pay_entry_point');
    });
  });
});
