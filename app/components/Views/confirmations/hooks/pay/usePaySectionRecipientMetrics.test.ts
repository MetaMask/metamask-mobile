import { merge } from 'lodash';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';
import { TransactionType } from '@metamask/transaction-controller';
import { usePaySectionRecipientMetrics } from './usePaySectionRecipientMetrics';
import { PayWithSectionId } from '../../components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet.types';

function runHook({
  type,
  sourceSection = 'crypto' as PayWithSectionId,
  hasPayToken = true,
}: {
  type?: TransactionType;
  sourceSection?: PayWithSectionId;
  hasPayToken?: boolean;
} = {}) {
  const state = merge(
    {},
    simpleSendTransactionControllerMock,
    transactionApprovalControllerMock,
    otherControllersMock,
  );

  state.engine.backgroundState.TransactionController.transactions[0].type =
    type ?? TransactionType.perpsDeposit;

  return renderHookWithProvider(
    () => usePaySectionRecipientMetrics(sourceSection, hasPayToken),
    { state },
  );
}

describe('usePaySectionRecipientMetrics', () => {
  describe('deposit flows (fixed by transaction type)', () => {
    it('returns perps for perpsDeposit', () => {
      const { result } = runHook({ type: TransactionType.perpsDeposit });

      expect(result.current).toEqual({
        presented: 'perps',
        selected: 'perps',
        switchCount: 0,
      });
    });

    it('returns perps for perpsDepositAndOrder', () => {
      const { result } = runHook({
        type: TransactionType.perpsDepositAndOrder,
      });

      expect(result.current.selected).toBe('perps');
    });

    it('returns predict for predictDeposit', () => {
      const { result } = runHook({ type: TransactionType.predictDeposit });

      expect(result.current.selected).toBe('predict');
    });

    it('returns predict for predictDepositAndOrder', () => {
      const { result } = runHook({
        type: TransactionType.predictDepositAndOrder,
      });

      expect(result.current.selected).toBe('predict');
    });

    it('returns money-account for moneyAccountDeposit', () => {
      const { result } = runHook({
        type: TransactionType.moneyAccountDeposit,
      });

      expect(result.current.selected).toBe('money-account');
    });

    it('ignores sourceSection for deposit flows', () => {
      const { result } = runHook({
        type: TransactionType.perpsDeposit,
        sourceSection: 'bank-card',
      });

      expect(result.current.selected).toBe('perps');
    });
  });

  describe('withdraw flows (uses sourceSection)', () => {
    it('returns sourceSection for perpsWithdraw', () => {
      const { result } = runHook({
        type: TransactionType.perpsWithdraw,
        sourceSection: 'crypto',
      });

      expect(result.current.selected).toBe('crypto');
    });

    it('returns sourceSection for predictWithdraw', () => {
      const { result } = runHook({
        type: TransactionType.predictWithdraw,
        sourceSection: 'money-account',
      });

      expect(result.current.selected).toBe('money-account');
    });

    it('returns sourceSection for moneyAccountWithdraw', () => {
      const { result } = runHook({
        type: TransactionType.moneyAccountWithdraw,
        sourceSection: 'bank-card',
      });

      expect(result.current.selected).toBe('bank-card');
    });
  });

  describe('presented / switchCount tracking', () => {
    it('returns null presented when hasPayToken is false', () => {
      const { result } = runHook({ hasPayToken: false });

      expect(result.current.presented).toBeNull();
      expect(result.current.switchCount).toBe(0);
    });

    it('captures presented on first render and preserves it after sourceSection changes', () => {
      let currentSourceSection: PayWithSectionId = 'crypto';

      const state = merge(
        {},
        simpleSendTransactionControllerMock,
        transactionApprovalControllerMock,
        otherControllersMock,
      );
      state.engine.backgroundState.TransactionController.transactions[0].type =
        TransactionType.perpsWithdraw;

      const { result, rerender } = renderHookWithProvider(
        () => usePaySectionRecipientMetrics(currentSourceSection, true),
        { state },
      );

      expect(result.current.presented).toBe('crypto');

      currentSourceSection = 'money-account';
      rerender({});

      expect(result.current.presented).toBe('crypto');
      expect(result.current.selected).toBe('money-account');
      expect(result.current.switchCount).toBe(1);
    });

    it('does not increment switchCount for deposit flows (section is fixed)', () => {
      const { result, rerender } = runHook({
        type: TransactionType.perpsDeposit,
      });

      rerender({});
      rerender({});

      expect(result.current.switchCount).toBe(0);
    });
  });

  describe('fallback', () => {
    it('falls back to sourceSection for unrecognized transaction types', () => {
      const { result } = runHook({
        type: TransactionType.simpleSend,
        sourceSection: 'bank-card',
      });

      expect(result.current.selected).toBe('bank-card');
    });
  });
});
