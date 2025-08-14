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

const BRIDGE_TOKEN_MOCK = {
  address: tokenAddress1Mock,
  balance: '123.456',
  decimals: 4,
  chainId: ChainId.mainnet,
  tokenFiatAmount: 456.123,
} as unknown as BridgeToken;

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
    useTokensWithBalanceMock.mockReturnValue([BRIDGE_TOKEN_MOCK]);
  });

  it('returns undefined if no state', () => {
    const { result } = runHook();
    expect(result.current.payToken).toBeUndefined();
  });

  it('returns bridge token matching state', () => {
    const { result } = runHook({
      payToken: PAY_TOKEN_MOCK,
    });

    expect(result.current.payToken).toStrictEqual(BRIDGE_TOKEN_MOCK);
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
