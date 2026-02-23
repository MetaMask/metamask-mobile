import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { cloneDeep, merge } from 'lodash';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { RootState } from '../../../../../reducers';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';
import { TransactionType } from '@metamask/transaction-controller';
import { useTransactionPayWithdraw } from './useTransactionPayWithdraw';

const STATE_MOCK = merge(
  {},
  simpleSendTransactionControllerMock,
  transactionApprovalControllerMock,
  otherControllersMock,
) as unknown as RootState;

function runHook({
  type,
  predictWithdrawAnyToken = false,
}: {
  type?: TransactionType;
  predictWithdrawAnyToken?: boolean;
} = {}) {
  const mockState = cloneDeep(STATE_MOCK);

  if (type) {
    mockState.engine.backgroundState.TransactionController.transactions[0].type =
      type;
  }

  mockState.engine.backgroundState.RemoteFeatureFlagController = {
    ...mockState.engine.backgroundState.RemoteFeatureFlagController,
    remoteFeatureFlags: {
      confirmations_pay: {
        predictWithdrawAnyToken,
      },
    },
  };

  return renderHookWithProvider(useTransactionPayWithdraw, {
    state: mockState,
  });
}

describe('useTransactionPayWithdraw', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.MM_PREDICT_WITHDRAW_ANY_TOKEN;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('isWithdraw', () => {
    it('returns false for non-withdraw transaction types', () => {
      const { result } = runHook({ type: TransactionType.simpleSend });
      expect(result.current.isWithdraw).toBe(false);
    });

    it('returns true for predictWithdraw transaction type', () => {
      const { result } = runHook({ type: TransactionType.predictWithdraw });
      expect(result.current.isWithdraw).toBe(true);
    });
  });

  describe('canSelectWithdrawToken', () => {
    it('returns false for non-withdraw transactions regardless of flags', () => {
      process.env.MM_PREDICT_WITHDRAW_ANY_TOKEN = 'true';
      const { result } = runHook({
        type: TransactionType.simpleSend,
        predictWithdrawAnyToken: true,
      });
      expect(result.current.canSelectWithdrawToken).toBe(false);
    });

    it('returns false when both env var and feature flag are disabled', () => {
      const { result } = runHook({
        type: TransactionType.predictWithdraw,
        predictWithdrawAnyToken: false,
      });
      expect(result.current.canSelectWithdrawToken).toBe(false);
    });

    it('returns false when only feature flag is enabled', () => {
      const { result } = runHook({
        type: TransactionType.predictWithdraw,
        predictWithdrawAnyToken: true,
      });
      expect(result.current.canSelectWithdrawToken).toBe(false);
    });

    it('returns false when only env var is enabled', () => {
      process.env.MM_PREDICT_WITHDRAW_ANY_TOKEN = 'true';
      const { result } = runHook({
        type: TransactionType.predictWithdraw,
        predictWithdrawAnyToken: false,
      });
      expect(result.current.canSelectWithdrawToken).toBe(false);
    });

    it('returns true when both env var and feature flag are enabled', () => {
      process.env.MM_PREDICT_WITHDRAW_ANY_TOKEN = 'true';
      const { result } = runHook({
        type: TransactionType.predictWithdraw,
        predictWithdrawAnyToken: true,
      });
      expect(result.current.canSelectWithdrawToken).toBe(true);
    });
  });
});
