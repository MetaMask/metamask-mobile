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
import { useTokenAmount } from '../useTokenAmount';
import { act } from '@testing-library/react-native';
import {
  selectTransactionBridgeQuotesById,
  updateConfirmationMetric,
} from '../../../../../core/redux/slices/confirmationMetrics';
import { TransactionType } from '@metamask/transaction-controller';
import { NATIVE_TOKEN_ADDRESS } from '../../constants/tokens';

jest.mock('./useTransactionPayToken');
jest.mock('../useTokenAmount');

jest.mock('../../../../../core/redux/slices/confirmationMetrics', () => ({
  ...jest.requireActual('../../../../../core/redux/slices/confirmationMetrics'),
  updateConfirmationMetric: jest.fn(),
  selectTransactionBridgeQuotesById: jest.fn(),
}));

const CHAIN_ID_MOCK = '0x1';
const TOKEN_AMOUNT_MOCK = '1.23';

const PAY_TOKEN_MOCK = {
  address: tokenAddress1Mock,
  chainId: CHAIN_ID_MOCK,
  symbol: 'TST',
};

function runHook() {
  const state = merge(
    {},
    simpleSendTransactionControllerMock,
    transactionApprovalControllerMock,
    otherControllersMock,
  );

  state.engine.backgroundState.TransactionController.transactions[0].type =
    TransactionType.perpsDeposit;

  return renderHookWithProvider(useTransactionPayMetrics, {
    state,
  });
}

describe('useTransactionPayMetrics', () => {
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const useTokenAmountMock = jest.mocked(useTokenAmount);
  const updateConfirmationMetricMock = jest.mocked(updateConfirmationMetric);

  const selectTransactionBridgeQuotesByIdMock = jest.mocked(
    selectTransactionBridgeQuotesById,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionPayTokenMock.mockReturnValue({
      payToken: undefined,
      setPayToken: noop,
    });

    useTokenAmountMock.mockReturnValue({
      amountPrecise: TOKEN_AMOUNT_MOCK,
    } as ReturnType<typeof useTokenAmount>);

    updateConfirmationMetricMock.mockReturnValue({
      type: 'test',
    } as never);

    selectTransactionBridgeQuotesByIdMock.mockReturnValue([] as never[]);
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

    selectTransactionBridgeQuotesByIdMock.mockReturnValue([
      {} as never,
      {} as never,
      {} as never,
    ] as never[]);

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

    selectTransactionBridgeQuotesByIdMock.mockReturnValue([
      {} as never,
      {} as never,
      {} as never,
    ] as never[]);

    runHook();

    await act(async () => noop());

    expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
      id: transactionIdMock,
      params: {
        properties: expect.objectContaining({
          mm_pay_use_case: 'perps_deposit',
          simulation_sending_assets_total_value: TOKEN_AMOUNT_MOCK,
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

    selectTransactionBridgeQuotesByIdMock.mockReturnValue([
      {
        quote: {
          minDestTokenAmount: '2000000',
        },
        request: {
          targetAmountMinimum: '1500000',
          targetTokenAddress: NATIVE_TOKEN_ADDRESS,
        },
      },
      {
        quote: {
          minDestTokenAmount: '3000000',
        },
        request: {
          targetAmountMinimum: '2500000',
          targetTokenAddress: tokenAddress1Mock,
        },
      },
    ] as never[]);

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
});
