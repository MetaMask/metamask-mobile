import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useTransactionPayWithdraw } from './useTransactionPayWithdraw';
import { cloneDeep, merge } from 'lodash';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { RootState } from '../../../../../reducers';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';
import { TransactionType } from '@metamask/transaction-controller';

const STATE_MOCK = merge(
  {},
  simpleSendTransactionControllerMock,
  transactionApprovalControllerMock,
  otherControllersMock,
) as unknown as RootState;

function runHook({
  type,
  postQuoteFlags,
}: {
  type?: TransactionType;
  postQuoteFlags?: Record<string, unknown>;
} = {}) {
  const mockState = cloneDeep(STATE_MOCK);

  if (type) {
    mockState.engine.backgroundState.TransactionController.transactions[0].type =
      type;
  }

  mockState.engine.backgroundState.RemoteFeatureFlagController = {
    ...mockState.engine.backgroundState.RemoteFeatureFlagController,
    remoteFeatureFlags: {
      confirmations_pay_post_quote: postQuoteFlags ?? {
        default: { enabled: false },
      },
    },
  };

  return renderHookWithProvider(useTransactionPayWithdraw, {
    state: mockState,
  });
}

describe('useTransactionPayWithdraw', () => {
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
    it('returns false for non-withdraw transactions regardless of feature flag', () => {
      const { result } = runHook({
        type: TransactionType.simpleSend,
        postQuoteFlags: {
          default: { enabled: true },
        },
      });
      expect(result.current.canSelectWithdrawToken).toBe(false);
    });

    it('returns false for withdraw transactions when default is disabled', () => {
      const { result } = runHook({
        type: TransactionType.predictWithdraw,
        postQuoteFlags: {
          default: { enabled: false },
        },
      });
      expect(result.current.canSelectWithdrawToken).toBe(false);
    });

    it('returns true for withdraw transactions when default is enabled', () => {
      const { result } = runHook({
        type: TransactionType.predictWithdraw,
        postQuoteFlags: {
          default: { enabled: true },
        },
      });
      expect(result.current.canSelectWithdrawToken).toBe(true);
    });

    it('uses override config when override key matches transaction type', () => {
      const { result } = runHook({
        type: TransactionType.predictWithdraw,
        postQuoteFlags: {
          default: { enabled: false },
          override: {
            predictWithdraw: { enabled: true },
          },
        },
      });
      expect(result.current.canSelectWithdrawToken).toBe(true);
    });

    it('override disabled takes precedence over default enabled', () => {
      const { result } = runHook({
        type: TransactionType.predictWithdraw,
        postQuoteFlags: {
          default: { enabled: true },
          override: {
            predictWithdraw: { enabled: false },
          },
        },
      });
      expect(result.current.canSelectWithdrawToken).toBe(false);
    });
  });
});
