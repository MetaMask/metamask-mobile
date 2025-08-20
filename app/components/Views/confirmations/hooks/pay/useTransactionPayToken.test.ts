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
import { useTokensWithBalance } from '../../../../UI/Bridge/hooks/useTokensWithBalance';
import { BridgeToken } from '../../../../UI/Bridge/types';

jest.mock('../../../../UI/Bridge/hooks/useTokensWithBalance');

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

function runHook({
  payToken,
}: { payToken?: ConfirmationMetricsReducer.TransactionPayToken } = {}) {
  const mockState = cloneDeep(STATE_MOCK);

  if (payToken) {
    mockState.confirmationMetrics = {
      ...ConfirmationMetricsReducer.initialState,
      transactionPayTokenById: {
        [TRANSACTION_ID_MOCK]: payToken,
      },
    };
  }

  return renderHookWithProvider(useTransactionPayToken, {
    state: mockState,
  });
}

describe('useTransactionPayToken', () => {
  const useTokensWithBalanceMock = jest.mocked(useTokensWithBalance);

  beforeEach(() => {
    jest.resetAllMocks();

    useTokensWithBalanceMock.mockReturnValue([
      {
        address: tokenAddress1Mock,
        balance: '123.456',
        decimals: 4,
        chainId: ChainId.mainnet,
        tokenFiatAmount: 456.123,
      },
    ] as unknown as BridgeToken[]);
  });

  it('returns undefined if no state', () => {
    const { result } = runHook();
    expect(result.current.payToken).toBeUndefined();
  });

  it('returns token from state', () => {
    const { result } = runHook({
      payToken: PAY_TOKEN_MOCK,
    });

    expect(result.current.payToken).toEqual(PAY_TOKEN_MOCK);
  });

  it('returns decimals', () => {
    const { result } = runHook({
      payToken: PAY_TOKEN_MOCK,
    });

    expect(result.current.decimals).toEqual(4);
  });

  it('returns balance', () => {
    const { result } = runHook({
      payToken: PAY_TOKEN_MOCK,
    });

    expect(result.current.balanceHuman).toEqual('123.456');
  });

  it('returns fiat balance', () => {
    const { result } = runHook({
      payToken: PAY_TOKEN_MOCK,
    });

    expect(result.current.balanceFiat).toEqual('456.123');
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
