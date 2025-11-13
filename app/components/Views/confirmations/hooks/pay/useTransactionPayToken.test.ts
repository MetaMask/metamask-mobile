import { ChainId } from '@metamask/controller-utils';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useTransactionPayToken } from './useTransactionPayToken';
import { cloneDeep, merge } from 'lodash';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
// eslint-disable-next-line import/no-namespace
import * as ConfirmationMetricsReducer from '../../../../../core/redux/slices/confirmationMetrics';
import { RootState } from '../../../../../reducers';
import {
  otherControllersMock,
  tokenAddress1Mock,
} from '../../__mocks__/controllers/other-controllers-mock';
import { BridgeToken } from '../../../../UI/Bridge/types';
import { useTokenWithBalance } from '../tokens/useTokenWithBalance';
import { TransactionType } from '@metamask/transaction-controller';

jest.mock('../tokens/useTokenWithBalance');

const STATE_MOCK = merge(
  simpleSendTransactionControllerMock,
  transactionApprovalControllerMock,
  otherControllersMock,
) as unknown as RootState;

const TRANSACTION_ID_MOCK =
  STATE_MOCK.engine.backgroundState.TransactionController.transactions[0].id;

const PAY_TOKEN_MOCK: ConfirmationMetricsReducer.TransactionPayToken = {
  address: tokenAddress1Mock,
  chainId: '0x1',
};

const BRIDGE_TOKEN_MOCK = {
  address: tokenAddress1Mock,
  balance: '123.456',
  balanceFiat: '$456.12',
  decimals: 4,
  chainId: ChainId.mainnet,
  tokenFiatAmount: 456.123,
} as unknown as BridgeToken;

function runHook({
  currency,
  payToken,
  type,
}: {
  currency?: string;
  payToken?: ConfirmationMetricsReducer.TransactionPayToken;
  type?: TransactionType;
} = {}) {
  const mockState = cloneDeep(STATE_MOCK);

  if (payToken) {
    mockState.confirmationMetrics = {
      ...ConfirmationMetricsReducer.initialState,
      transactionPayTokenById: {
        [TRANSACTION_ID_MOCK]: payToken,
      },
    };
  }

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
  const useTokenWithBalanceMock = jest.mocked(useTokenWithBalance);

  beforeEach(() => {
    jest.resetAllMocks();
    useTokenWithBalanceMock.mockReturnValue(BRIDGE_TOKEN_MOCK as never);
  });

  it('returns undefined if no state', () => {
    useTokenWithBalanceMock.mockReset();
    const { result } = runHook();
    expect(result.current.payToken).toBeUndefined();
  });

  it('returns bridge token matching state', () => {
    const { result } = runHook({
      payToken: PAY_TOKEN_MOCK,
    });

    expect(result.current.payToken).toStrictEqual({
      ...BRIDGE_TOKEN_MOCK,
      balanceRaw: '1234560',
    });
  });

  it('returns USD balance if perps deposit', () => {
    const { result } = runHook({
      currency: 'gbp',
      payToken: PAY_TOKEN_MOCK,
      type: TransactionType.perpsDeposit,
    });

    expect(result.current.payToken).toStrictEqual({
      ...BRIDGE_TOKEN_MOCK,
      balanceFiat: '$912.25',
      balanceRaw: '1234560',
    });
  });

  it('sets token in state', () => {
    const setPayTokenActionMock = jest.spyOn(
      ConfirmationMetricsReducer,
      'setTransactionPayToken',
    );

    const { result } = runHook();

    result.current.setPayToken(PAY_TOKEN_MOCK);

    expect(setPayTokenActionMock).toHaveBeenCalledWith({
      transactionId: TRANSACTION_ID_MOCK,
      payToken: PAY_TOKEN_MOCK,
    });
  });
});
