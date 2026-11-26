import { TransactionType } from '@metamask/transaction-controller';
import { merge } from 'lodash';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { PayWithSectionId } from '../../components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet.types';
import { useTransactionAccountOverride } from '../transactions/useTransactionAccountOverride';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { usePaySectionRecipientMetrics } from './usePaySectionRecipientMetrics';

jest.mock('../transactions/useTransactionAccountOverride');
jest.mock('../transactions/useTransactionMetadataRequest', () => {
  const actual = jest.requireActual(
    '../transactions/useTransactionMetadataRequest',
  );
  return {
    useTransactionMetadataRequest: jest.fn(() =>
      actual.useTransactionMetadataRequest(),
    ),
  };
});

const useTransactionAccountOverrideMock = jest.mocked(
  useTransactionAccountOverride,
);
const useTransactionMetadataRequestMock = jest.mocked(
  useTransactionMetadataRequest,
);

const RECIPIENT_ACCOUNT_MOCK = '0x1111111111111111111111111111111111111111';
const SECOND_RECIPIENT_ACCOUNT_MOCK =
  '0x2222222222222222222222222222222222222222';

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
  beforeEach(() => {
    jest.resetAllMocks();
    const actualTxMeta = jest.requireActual(
      '../transactions/useTransactionMetadataRequest',
    );
    useTransactionMetadataRequestMock.mockImplementation(() =>
      actualTxMeta.useTransactionMetadataRequest(),
    );
    useTransactionAccountOverrideMock.mockReturnValue(undefined);
  });

  describe('deposit flows (fixed by transaction type)', () => {
    it.each([
      TransactionType.perpsDeposit,
      TransactionType.perpsLighterDeposit,
      TransactionType.perpsDepositAndOrder,
      TransactionType.perpsLighterDepositAndOrder,
    ] as const)('returns perps for %s', (type) => {
      const { result } = runHook({ type });

      expect(result.current).toEqual({
        presented: 'perps',
        selected: 'perps',
        switchCount: 0,
      });
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

    it.each([
      TransactionType.moneyAccountDeposit,
      TransactionType.membershipSubscription,
    ] as const)('returns money-account for %s', (type) => {
      const { result } = runHook({ type });

      expect(result.current.selected).toBe('money-account');
    });

    it('ignores sourceSection changes for membershipSubscription', () => {
      let currentSourceSection: PayWithSectionId = 'metamask';

      const state = merge(
        {},
        simpleSendTransactionControllerMock,
        transactionApprovalControllerMock,
        otherControllersMock,
      );
      state.engine.backgroundState.TransactionController.transactions[0].type =
        TransactionType.membershipSubscription;

      const { result, rerender } = renderHookWithProvider(
        () => usePaySectionRecipientMetrics(currentSourceSection, true),
        { state },
      );

      currentSourceSection = 'bank-card';
      rerender({});

      expect(result.current).toEqual({
        presented: 'money-account',
        selected: 'money-account',
        switchCount: 0,
      });
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
    it.each([
      TransactionType.perpsWithdraw,
      TransactionType.perpsLighterWithdraw,
    ] as const)('returns sourceSection for %s', (type) => {
      const { result } = runHook({
        type,
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

  describe('moneyAccountWithdraw accountOverride tracking', () => {
    it('captures presented after accountOverride loads', () => {
      const { result, rerender } = runHook({
        type: TransactionType.moneyAccountWithdraw,
      });

      expect(result.current.presented).toBeNull();
      expect(result.current.switchCount).toBe(0);

      useTransactionAccountOverrideMock.mockReturnValue(RECIPIENT_ACCOUNT_MOCK);

      rerender({});

      expect(result.current).toEqual({
        presented: 'crypto',
        selected: 'crypto',
        switchCount: 0,
      });
    });

    it('increments switchCount when switching between two recipient accounts', () => {
      useTransactionAccountOverrideMock.mockReturnValue(RECIPIENT_ACCOUNT_MOCK);

      const { result, rerender } = runHook({
        type: TransactionType.moneyAccountWithdraw,
      });

      useTransactionAccountOverrideMock.mockReturnValue(
        SECOND_RECIPIENT_ACCOUNT_MOCK,
      );

      rerender({});

      expect(result.current).toEqual({
        presented: 'crypto',
        selected: 'crypto',
        switchCount: 1,
      });
    });

    it('increments switchCount twice when switching recipient account away and back', () => {
      useTransactionAccountOverrideMock.mockReturnValue(RECIPIENT_ACCOUNT_MOCK);

      const { result, rerender } = runHook({
        type: TransactionType.moneyAccountWithdraw,
      });

      useTransactionAccountOverrideMock.mockReturnValue(
        SECOND_RECIPIENT_ACCOUNT_MOCK,
      );

      rerender({});

      useTransactionAccountOverrideMock.mockReturnValue(RECIPIENT_ACCOUNT_MOCK);

      rerender({});

      expect(result.current.switchCount).toBe(2);
    });

    it('does not increment switchCount when the same recipient account is re-selected', () => {
      const accountLowercase =
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;
      const accountUppercase =
        '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' as const;
      useTransactionAccountOverrideMock.mockReturnValue(accountLowercase);

      const { result, rerender } = runHook({
        type: TransactionType.moneyAccountWithdraw,
      });

      useTransactionAccountOverrideMock.mockReturnValue(accountUppercase);

      rerender({});

      expect(result.current.switchCount).toBe(0);
    });

    it('does not increment switchCount on re-render without an account change', () => {
      useTransactionAccountOverrideMock.mockReturnValue(RECIPIENT_ACCOUNT_MOCK);

      const { result, rerender } = runHook({
        type: TransactionType.moneyAccountWithdraw,
      });

      rerender({});
      rerender({});

      expect(result.current.switchCount).toBe(0);
    });

    it('increments switchCount on section change for moneyAccountWithdraw', () => {
      let currentSourceSection: PayWithSectionId = 'crypto';
      useTransactionAccountOverrideMock.mockReturnValue(RECIPIENT_ACCOUNT_MOCK);

      const state = merge(
        {},
        simpleSendTransactionControllerMock,
        transactionApprovalControllerMock,
        otherControllersMock,
      );
      state.engine.backgroundState.TransactionController.transactions[0].type =
        TransactionType.moneyAccountWithdraw;

      const { result, rerender } = renderHookWithProvider(
        () => usePaySectionRecipientMetrics(currentSourceSection, true),
        { state },
      );

      currentSourceSection = 'money-account';

      rerender({});

      expect(result.current).toEqual({
        presented: 'crypto',
        selected: 'money-account',
        switchCount: 1,
      });
    });

    it.each([
      TransactionType.moneyAccountDeposit,
      TransactionType.membershipSubscription,
    ] as const)(
      'does not increment switchCount when accountOverride changes on %s',
      (type) => {
        useTransactionAccountOverrideMock.mockReturnValue(
          RECIPIENT_ACCOUNT_MOCK,
        );

        const { result, rerender } = runHook({ type });

        useTransactionAccountOverrideMock.mockReturnValue(
          SECOND_RECIPIENT_ACCOUNT_MOCK,
        );

        rerender({});

        expect(result.current.switchCount).toBe(0);
      },
    );
  });

  describe('sub-account recipient picker tracking', () => {
    it.each([
      [TransactionType.predictDeposit, 'predict'],
      [TransactionType.perpsDeposit, 'perps'],
      [TransactionType.perpsLighterDeposit, 'perps'],
    ] as const)(
      'counts recipient sub-account round trip as 2 for %s',
      (type, expectedSection) => {
        useTransactionMetadataRequestMock.mockReturnValue({
          id: 'tx-1',
          type,
          txParams: { from: RECIPIENT_ACCOUNT_MOCK },
        } as never);

        const { result, rerender } = runHook({
          type,
          sourceSection: 'money-account',
        });

        expect(result.current).toEqual({
          presented: expectedSection,
          selected: expectedSection,
          switchCount: 0,
        });

        useTransactionMetadataRequestMock.mockReturnValue({
          id: type === TransactionType.predictDeposit ? 'tx-1' : 'tx-2',
          type,
          txParams: { from: SECOND_RECIPIENT_ACCOUNT_MOCK },
        } as never);
        rerender({});

        expect(result.current.switchCount).toBe(1);

        useTransactionMetadataRequestMock.mockReturnValue({
          id: type === TransactionType.predictDeposit ? 'tx-1' : 'tx-3',
          type,
          txParams: { from: RECIPIENT_ACCOUNT_MOCK },
        } as never);
        rerender({});

        expect(result.current.switchCount).toBe(2);
      },
    );

    it.each([
      TransactionType.predictDeposit,
      TransactionType.perpsDeposit,
      TransactionType.perpsLighterDeposit,
    ] as const)(
      'does not increment switchCount when same sub-account is re-selected or re-rendered for %s',
      (type) => {
        const accountLowercase = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
        const accountUppercase = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

        useTransactionMetadataRequestMock.mockReturnValue({
          id: 'tx-1',
          type,
          txParams: { from: accountLowercase },
        } as never);

        const { result, rerender } = runHook({
          type,
          sourceSection: 'money-account',
        });

        useTransactionMetadataRequestMock.mockReturnValue({
          id: 'tx-1',
          type,
          txParams: { from: accountUppercase },
        } as never);
        rerender({});
        rerender({});

        expect(result.current.switchCount).toBe(0);
      },
    );

    it('does not increment switchCount when switching Perps provider with the same recipient account', () => {
      useTransactionMetadataRequestMock.mockReturnValue({
        id: 'tx-1',
        type: TransactionType.perpsDeposit,
        txParams: { from: RECIPIENT_ACCOUNT_MOCK },
      } as never);

      const { result, rerender } = runHook({
        type: TransactionType.perpsDeposit,
        sourceSection: 'money-account',
      });

      useTransactionMetadataRequestMock.mockReturnValue({
        id: 'tx-2',
        type: TransactionType.perpsLighterDeposit,
        txParams: { from: RECIPIENT_ACCOUNT_MOCK },
      } as never);
      rerender({});

      expect(result.current).toEqual({
        presented: 'perps',
        selected: 'perps',
        switchCount: 0,
      });
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
