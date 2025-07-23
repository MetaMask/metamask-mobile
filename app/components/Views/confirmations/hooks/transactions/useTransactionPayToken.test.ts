import { ChainId } from '@metamask/controller-utils';
import { EMPTY_ADDRESS } from '../../../../../constants/transaction';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useTransactionPayToken } from './useTransactionPayToken';
import { cloneDeep, merge } from 'lodash';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
// eslint-disable-next-line import/no-namespace
import * as ConfirmationMetricsReducer from '../../../../../core/redux/slices/confirmationMetrics';
import { RootState } from '../../../../../reducers';

const STATE_MOCK = merge(
  simpleSendTransactionControllerMock,
  transactionApprovalControllerMock,
) as unknown as RootState;

const TRANSACTION_ID_MOCK =
  STATE_MOCK.engine.backgroundState.TransactionController.transactions[0].id;

const PAY_TOKEN_MOCK: ConfirmationMetricsReducer.TransactionPayToken = {
  address: '0x1234567890abcdef1234567890abcdef12345678',
  chainId: '0x123',
};

function runHook({
  payToken,
}: { payToken?: ConfirmationMetricsReducer.TransactionPayToken } = {}) {
  const mockState = cloneDeep(STATE_MOCK);

  if (payToken) {
    mockState.confirmationMetrics = {
      metricsById: {},
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
  it('returns default token if no state', () => {
    const { result } = runHook();

    expect(result.current.payToken).toEqual({
      address: EMPTY_ADDRESS,
      chainId: ChainId.mainnet,
    });
  });

  it('returns token from state', () => {
    const { result } = runHook({
      payToken: PAY_TOKEN_MOCK,
    });

    expect(result.current.payToken).toEqual(PAY_TOKEN_MOCK);
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
