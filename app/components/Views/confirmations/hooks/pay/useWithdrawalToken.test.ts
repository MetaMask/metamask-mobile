import { Hex } from '@metamask/utils';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useWithdrawalToken } from './useWithdrawalToken';
import { cloneDeep, merge } from 'lodash';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { RootState } from '../../../../../reducers';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';
import { TransactionType } from '@metamask/transaction-controller';
import Engine from '../../../../../core/Engine';
import { act } from '@testing-library/react-hooks';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(),
    },
    TransactionPayController: {
      updatePaymentToken: jest.fn(),
    },
  },
}));

jest.mock('../../../../../core/EngineService', () => ({
  flushState: jest.fn(),
}));

const STATE_MOCK = merge(
  simpleSendTransactionControllerMock,
  transactionApprovalControllerMock,
  otherControllersMock,
) as unknown as RootState;

const NETWORK_CLIENT_ID_MOCK = 'network-client-id-mock';

function runHook({ type }: { type?: TransactionType } = {}) {
  const mockState = cloneDeep(STATE_MOCK);

  if (type) {
    mockState.engine.backgroundState.TransactionController.transactions[0].type =
      type;
  }

  return renderHookWithProvider(useWithdrawalToken, {
    state: mockState,
  });
}

describe('useWithdrawalToken', () => {
  const findNetworkClientIdByChainIdMock = jest.mocked(
    Engine.context.NetworkController.findNetworkClientIdByChainId,
  );

  const updatePaymentTokenMock = jest.mocked(
    Engine.context.TransactionPayController.updatePaymentToken,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    findNetworkClientIdByChainIdMock.mockReturnValue(NETWORK_CLIENT_ID_MOCK);
  });

  describe('isWithdrawal', () => {
    it('returns false for non-withdrawal transaction types', () => {
      const { result } = runHook({ type: TransactionType.simpleSend });
      expect(result.current.isWithdrawal).toBe(false);
    });

    it('returns true for predictWithdraw transaction type', () => {
      const { result } = runHook({ type: TransactionType.predictWithdraw });
      expect(result.current.isWithdrawal).toBe(true);
    });
  });

  describe('canSelectWithdrawalToken', () => {
    it('returns false for non-withdrawal transactions regardless of feature flag', () => {
      const { result } = runHook({ type: TransactionType.simpleSend });
      expect(result.current.canSelectWithdrawalToken).toBe(false);
    });
  });

  describe('setWithdrawalToken', () => {
    it('calls TransactionPayController.updatePaymentToken with the new token', () => {
      const { result } = runHook({ type: TransactionType.predictWithdraw });

      act(() => {
        result.current.setWithdrawalToken({
          address: '0xNewTokenAddress' as Hex,
          chainId: '0x89' as Hex,
        });
      });

      expect(updatePaymentTokenMock).toHaveBeenCalledWith({
        transactionId: expect.any(String),
        tokenAddress: '0xNewTokenAddress',
        chainId: '0x89',
      });
    });

    it('does not call updatePaymentToken when network client not found', () => {
      findNetworkClientIdByChainIdMock.mockReturnValue(undefined as never);

      const { result } = runHook({ type: TransactionType.predictWithdraw });

      act(() => {
        result.current.setWithdrawalToken({
          address: '0xNewTokenAddress' as Hex,
          chainId: '0x999' as Hex,
        });
      });

      expect(updatePaymentTokenMock).not.toHaveBeenCalled();
    });
  });
});
