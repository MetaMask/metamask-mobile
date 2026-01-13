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
  TransactionPayQuote,
  TransactionPayRequiredToken,
  TransactionPayStrategy,
} from '@metamask/transaction-pay-controller';
import { Json } from '@metamask/utils';
import {
  useIsTransactionPayQuoteLoading,
  useTransactionPayQuotes,
  useTransactionPayRequiredTokens,
  useTransactionPayTotals,
} from './useTransactionPayData';
import { useTransactionPayAvailableTokens } from './useTransactionPayAvailableTokens';
import { useAccountTokens } from '../send/useAccountTokens';
import { AssetType } from '../../types/token';

jest.mock('./useTransactionPayToken');
jest.mock('../useTokenAmount');
jest.mock('../../../../../selectors/transactionPayController');
jest.mock('../pay/useTransactionPayData');
jest.mock('./useTransactionPayAvailableTokens');
jest.mock('../send/useAccountTokens');

jest.mock('../../../../../core/redux/slices/confirmationMetrics', () => ({
  ...jest.requireActual('../../../../../core/redux/slices/confirmationMetrics'),
  updateConfirmationMetric: jest.fn(),
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
  const useTransactionPayTotalsMock = jest.mocked(useTransactionPayTotals);

  const useTransactionPayRequiredTokensMock = jest.mocked(
    useTransactionPayRequiredTokens,
  );

  const useTransactionPayAvailableTokensMock = jest.mocked(
    useTransactionPayAvailableTokens,
  );

  const useIsTransactionPayQuoteLoadingMock = jest.mocked(
    useIsTransactionPayQuoteLoading,
  );

  const useAccountTokensMock = jest.mocked(useAccountTokens);

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
    useIsTransactionPayQuoteLoadingMock.mockReturnValue(false);
    useAccountTokensMock.mockReturnValue([]);

    useTransactionPayAvailableTokensMock.mockReturnValue([
      {},
      {},
      {},
      {},
      {},
    ] as AssetType[]);
  });

  it('does not update metrics if no pay token selected', async () => {
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

  it('includes pay token properties if pay token selected', async () => {
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
          mm_pay: true,
          mm_pay_token_selected: PAY_TOKEN_MOCK.symbol,
          mm_pay_chain_selected: CHAIN_ID_MOCK,
          mm_pay_token_presented: PAY_TOKEN_MOCK.symbol,
          mm_pay_chain_presented: PAY_TOKEN_MOCK.chainId,
        }),
        sensitiveProperties: {},
      },
    });
  });

  it('includes step properties based on number of quotes', async () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: PAY_TOKEN_MOCK,
      setPayToken: noop,
    } as ReturnType<typeof useTransactionPayToken>);

    useTransactionPayQuotesMock.mockReturnValue([
      QUOTE_MOCK,
      QUOTE_MOCK,
      QUOTE_MOCK,
    ]);

    runHook();

    await act(async () => noop());

    expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
      id: transactionIdMock,
      params: {
        properties: expect.objectContaining({
          mm_pay_transaction_step_total: 4,
          mm_pay_transaction_step: 4,
        }),
        sensitiveProperties: {},
      },
    });
  });

  it('includes perps deposit properties', async () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: PAY_TOKEN_MOCK,
      setPayToken: noop,
    } as ReturnType<typeof useTransactionPayToken>);

    useTransactionPayQuotesMock.mockReturnValue([
      QUOTE_MOCK,
      QUOTE_MOCK,
      QUOTE_MOCK,
    ]);

    runHook();

    await act(async () => noop());

    expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
      id: transactionIdMock,
      params: {
        properties: expect.objectContaining({
          mm_pay_use_case: 'perps_deposit',
          simulation_sending_assets_total_value: 1.23,
        }),
        sensitiveProperties: {},
      },
    });
  });

  it('includes predict deposit properties', async () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: PAY_TOKEN_MOCK,
      setPayToken: noop,
    } as ReturnType<typeof useTransactionPayToken>);

    useTransactionPayQuotesMock.mockReturnValue([
      QUOTE_MOCK,
      QUOTE_MOCK,
      QUOTE_MOCK,
    ]);

    runHook({ type: TransactionType.predictDeposit });

    await act(async () => noop());

    expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
      id: transactionIdMock,
      params: {
        properties: expect.objectContaining({
          mm_pay_use_case: 'predict_deposit',
          simulation_sending_assets_total_value: 1.23,
        }),
        sensitiveProperties: {},
      },
    });
  });

  it('includes dust property for non-native quote', async () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: PAY_TOKEN_MOCK,
      setPayToken: noop,
    } as ReturnType<typeof useTransactionPayToken>);

    useTransactionPayQuotesMock.mockReturnValue([QUOTE_MOCK, QUOTE_MOCK]);

    runHook();

    await act(async () => noop());

    expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
      id: transactionIdMock,
      params: {
        properties: expect.objectContaining({
          mm_pay_dust_usd: '0.5',
        }),
        sensitiveProperties: {},
      },
    });
  });

  it('includes token size property', async () => {
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
          mm_pay_payment_token_list_size: 5,
        }),
        sensitiveProperties: {},
      },
    });
  });

  it('includes quote metrics', async () => {
    useTransactionPayTotalsMock.mockReturnValue({
      fees: {
        sourceNetwork: { estimate: { usd: '1.5', fiat: '1.6' } },
        targetNetwork: { usd: '2.5', fiat: '2.6' },
        provider: { usd: '0.5', fiat: '0.6' },
      },
    } as ReturnType<typeof useTransactionPayTotals>);

    useTransactionPayQuotesMock.mockReturnValue([QUOTE_MOCK]);

    runHook();

    await act(async () => noop());

    expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
      id: transactionIdMock,
      params: {
        properties: expect.objectContaining({
          mm_pay_network_fee_usd: '4',
          mm_pay_provider_fee_usd: '0.5',
          mm_pay_strategy: 'mm_swaps_bridge',
        }),
        sensitiveProperties: {},
      },
    });
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

    it('is true when loading starts', async () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: PAY_TOKEN_MOCK,
        setPayToken: noop,
      } as ReturnType<typeof useTransactionPayToken>);
      useIsTransactionPayQuoteLoadingMock.mockReturnValue(true);

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

    it('is true when has quotes even while loading new quotes', async () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: PAY_TOKEN_MOCK,
        setPayToken: noop,
      } as ReturnType<typeof useTransactionPayToken>);
      useIsTransactionPayQuoteLoadingMock.mockReturnValue(true);
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
});
