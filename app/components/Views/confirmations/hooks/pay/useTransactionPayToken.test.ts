import { ChainId } from '@metamask/controller-utils';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useTransactionPayToken } from './useTransactionPayToken';
import { cloneDeep, merge } from 'lodash';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { RootState } from '../../../../../reducers';
import {
  otherControllersMock,
  tokenAddress1Mock,
} from '../../__mocks__/controllers/other-controllers-mock';
import { TransactionType } from '@metamask/transaction-controller';
import { TransactionPaymentToken } from '@metamask/transaction-pay-controller';
import Engine from '../../../../../core/Engine';
import { flushPromises } from '../../../../../util/test/utils';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    TransactionPayController: {
      updatePaymentToken: jest.fn(),
    },
    GasFeeController: {
      fetchGasFeeEstimates: jest.fn(),
    },
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(),
    },
  },
}));

const STATE_MOCK = merge(
  simpleSendTransactionControllerMock,
  transactionApprovalControllerMock,
  otherControllersMock,
) as unknown as RootState;

const TRANSACTION_ID_MOCK =
  STATE_MOCK.engine.backgroundState.TransactionController.transactions[0].id;

const NETWORK_CLIENT_ID_MOCK = 'network-client-id-mock';

const PAY_TOKEN_MOCK = {
  address: tokenAddress1Mock,
  balanceHuman: '123.456',
  balanceFiat: '456.12',
  balanceUsd: '456.123',
  balanceRaw: '123456000000000000000',
  chainId: ChainId.mainnet,
  decimals: 4,
  symbol: 'TST',
} as TransactionPaymentToken;

function runHook({
  currency,
  payToken,
  type,
}: {
  currency?: string;
  payToken?: TransactionPaymentToken;
  type?: TransactionType;
} = {}) {
  const mockState = cloneDeep(STATE_MOCK);

  mockState.engine.backgroundState.TransactionPayController = {
    transactionData: {
      [TRANSACTION_ID_MOCK]: {
        isLoading: false,
        paymentToken: payToken,
        tokens: [],
      },
    },
  };

  if (currency) {
    mockState.engine.backgroundState.CurrencyRateController = {
      currentCurrency: currency,
      currencyRates: {
        ETH: {
          conversionDate: 1732887955.694,
          conversionRate: 2,
          usdConversionRate: 4,
        },
      },
    };
  }

  if (type) {
    mockState.engine.backgroundState.TransactionController.transactions[0].type =
      type;
  }

  return renderHookWithProvider(useTransactionPayToken, {
    state: mockState,
  });
}

describe('useTransactionPayToken', () => {
  const updatePaymentTokenMock = jest.mocked(
    Engine.context.TransactionPayController.updatePaymentToken,
  );

  const findNetworkClientIdByChainIdMock = jest.mocked(
    Engine.context.NetworkController.findNetworkClientIdByChainId,
  );

  const fetchGasFeeEstimatesMock = jest.mocked(
    Engine.context.GasFeeController.fetchGasFeeEstimates,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    findNetworkClientIdByChainIdMock.mockReturnValue(NETWORK_CLIENT_ID_MOCK);
    fetchGasFeeEstimatesMock.mockResolvedValue({} as never);
  });

  it('returns undefined if no state', () => {
    const { result } = runHook();

    expect(result.current.payToken).toBeUndefined();
    expect(result.current.isNative).toBeFalsy();
  });

  it('returns token matching state', () => {
    const { result } = runHook({
      payToken: PAY_TOKEN_MOCK,
    });

    expect(result.current.payToken).toStrictEqual(PAY_TOKEN_MOCK);
    expect(result.current.isNative).toBe(false);
  });

  it('sets token in state', async () => {
    const { result } = runHook();

    result.current.setPayToken({
      address: PAY_TOKEN_MOCK.address,
      chainId: PAY_TOKEN_MOCK.chainId as ChainId,
    });

    await flushPromises();

    expect(updatePaymentTokenMock).toHaveBeenCalledWith({
      transactionId: TRANSACTION_ID_MOCK,
      tokenAddress: PAY_TOKEN_MOCK.address,
      chainId: PAY_TOKEN_MOCK.chainId,
    });
  });

  it('returns isNative true when pay token is native address', () => {
    const { result } = runHook({
      payToken: {
        ...PAY_TOKEN_MOCK,
        address: '0x0000000000000000000000000000000000000000',
      } as TransactionPaymentToken,
    });

    expect(result.current.isNative).toBe(true);
  });
});
