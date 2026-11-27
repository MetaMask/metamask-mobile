import { merge } from 'lodash';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';
import { TransactionType } from '@metamask/transaction-controller';
import { PaymentOverride } from '@metamask/transaction-pay-controller';
import {
  selectPaymentOverrideByTransactionId,
  selectTransactionPaymentTokenByTransactionId,
} from '../../../../../selectors/transactionPayController';
import { useIsPerpsBalanceSelected } from '../../../../UI/Perps/hooks/useIsPerpsBalanceSelected';
import { selectPredictSelectedPaymentToken } from '../../../../UI/Predict/selectors/predictController';
import { useIsMoneyAccountFlagDefault } from './useIsMoneyAccountFlagDefault';
import { useTransactionPayFiatPayment } from './useTransactionPayData';
import { usePaySectionSourceMetrics } from './usePaySectionSourceMetrics';
import { useTransactionPayingAccount } from '../transactions/useTransactionPayingAccount';
import { getAddressAccountType } from '../../../../../util/address';
import { useTransactionAccountOverride } from '../transactions/useTransactionAccountOverride';
import { getMemoizedInternalAccountByAddress } from '../../../../../selectors/accountsController';
import { createMockInternalAccount } from '../../../../../util/test/accountsControllerTestUtils';
import { KeyringType } from '@metamask/keyring-api/v2';

jest.mock('../../../../../selectors/transactionPayController');
jest.mock('../../../../UI/Perps/hooks/useIsPerpsBalanceSelected');
jest.mock('../../../../UI/Predict/selectors/predictController');
jest.mock('./useIsMoneyAccountFlagDefault');
jest.mock('../pay/useTransactionPayData');
jest.mock('../transactions/useTransactionPayingAccount');
jest.mock('../transactions/useTransactionAccountOverride');
jest.mock('../../../../../util/address');
jest.mock('../../../../../selectors/accountsController');

const selectPaymentOverrideMock = jest.mocked(
  selectPaymentOverrideByTransactionId,
);
const selectPaymentTokenMock = jest.mocked(
  selectTransactionPaymentTokenByTransactionId,
);
const useIsPerpsBalanceSelectedMock = jest.mocked(useIsPerpsBalanceSelected);
const selectPredictSelectedPaymentTokenMock = jest.mocked(
  selectPredictSelectedPaymentToken,
);
const useIsMoneyAccountFlagDefaultMock = jest.mocked(
  useIsMoneyAccountFlagDefault,
);
const useTransactionPayFiatPaymentMock = jest.mocked(
  useTransactionPayFiatPayment,
);
const useTransactionPayingAccountMock = jest.mocked(
  useTransactionPayingAccount,
);
const useTransactionAccountOverrideMock = jest.mocked(
  useTransactionAccountOverride,
);
const getAddressAccountTypeMock = jest.mocked(getAddressAccountType);
const getInternalAccountByAddressMock = jest.mocked(
  getMemoizedInternalAccountByAddress,
);

const PAYING_ACCOUNT_MOCK = '0x1111111111111111111111111111111111111111';
const SECOND_PAYING_ACCOUNT_MOCK = '0x2222222222222222222222222222222222222222';

function runHook({
  type,
  hasPayToken = true,
}: { type?: TransactionType; hasPayToken?: boolean } = {}) {
  const state = merge(
    {},
    simpleSendTransactionControllerMock,
    transactionApprovalControllerMock,
    otherControllersMock,
  );

  state.engine.backgroundState.TransactionController.transactions[0].type =
    type ?? TransactionType.perpsDeposit;

  return renderHookWithProvider(() => usePaySectionSourceMetrics(hasPayToken), {
    state,
  });
}

describe('usePaySectionSourceMetrics', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    selectPaymentOverrideMock.mockReturnValue(undefined);
    useIsPerpsBalanceSelectedMock.mockReturnValue(false);
    selectPredictSelectedPaymentTokenMock.mockReturnValue({
      address: '0x123',
      chainId: '0x1',
    });
    useIsMoneyAccountFlagDefaultMock.mockReturnValue(false);
    useTransactionPayFiatPaymentMock.mockReturnValue(undefined);
    useTransactionPayingAccountMock.mockReturnValue(PAYING_ACCOUNT_MOCK);
    useTransactionAccountOverrideMock.mockReturnValue(undefined);
    getAddressAccountTypeMock.mockReturnValue('MetaMask');
    getInternalAccountByAddressMock.mockReturnValue(undefined);
  });

  it('defaults to the MetaMask account type', () => {
    const { result } = runHook();

    expect(result.current).toEqual({
      presented: 'metamask',
      selected: 'metamask',
      switchCount: 0,
    });
  });

  it('falls back to crypto when the paying account is unavailable', () => {
    useTransactionPayingAccountMock.mockReturnValue(undefined);

    const { result } = runHook();

    expect(result.current.selected).toBe('crypto');
  });

  it.each([
    ['Imported', 'imported'],
    ['Ledger', 'Ledger'],
    ['QR Hardware', 'QR Hardware'],
  ] as const)(
    'returns %s as %s for a crypto source',
    (accountType, expected) => {
      getAddressAccountTypeMock.mockReturnValue(accountType);

      const { result } = runHook();

      expect(result.current.selected).toBe(expected);
    },
  );

  it('falls back to crypto when the account type is unavailable', () => {
    getAddressAccountTypeMock.mockImplementation(() => {
      throw new Error('Account unavailable');
    });

    const { result } = runHook();

    expect(result.current.selected).toBe('crypto');
  });

  it.each([
    [KeyringType.Hd, 'metamask'],
    [KeyringType.PrivateKey, 'imported'],
    [KeyringType.Money, 'money-account'],
    ['Money Keyring', 'money-account'],
    ['MONEY', 'money-account'],
    ['Snap Keyring', 'snap'],
    [KeyringType.Ledger, 'Ledger'],
    [KeyringType.Trezor, 'Trezor'],
    [KeyringType.Lattice, 'Lattice'],
    [KeyringType.Qr, 'QR Hardware'],
    [KeyringType.OneKey, 'QR Hardware'],
  ] as const)(
    'returns %s from the internal account as %s',
    (keyringType, expected) => {
      getInternalAccountByAddressMock.mockReturnValue({
        metadata: { keyring: { type: keyringType } },
      } as never);

      const { result } = runHook();

      expect(result.current.selected).toBe(expected);
      expect(getAddressAccountTypeMock).not.toHaveBeenCalled();
    },
  );

  it('uses the address account type for an unrecognized keyring', () => {
    getInternalAccountByAddressMock.mockReturnValue({
      metadata: { keyring: { type: 'unrecognized keyring' } },
    } as never);

    const { result } = runHook();

    expect(result.current.selected).toBe('metamask');
    expect(getAddressAccountTypeMock).toHaveBeenCalledWith(PAYING_ACCOUNT_MOCK);
  });

  it.each([
    TransactionType.moneyAccountDeposit,
    TransactionType.membershipSubscription,
  ] as const)(
    'captures the payer type after %s accountOverride loads',
    (type) => {
      const { result, rerender } = runHook({ type });

      expect(result.current.presented).toBeNull();
      expect(result.current.switchCount).toBe(0);

      useTransactionAccountOverrideMock.mockReturnValue(PAYING_ACCOUNT_MOCK);
      getAddressAccountTypeMock.mockReturnValue('Ledger');

      rerender({});

      expect(result.current).toEqual({
        presented: 'Ledger',
        selected: 'Ledger',
        switchCount: 0,
      });
    },
  );

  it('returns money-account when payment override is MoneyAccount', () => {
    selectPaymentOverrideMock.mockReturnValue(PaymentOverride.MoneyAccount);

    const { result } = runHook();

    expect(result.current.selected).toBe('money-account');
    expect(result.current.presented).toBe('money-account');
  });

  it('returns the account type for a Money Account deposit funded from Solana', () => {
    selectPaymentOverrideMock.mockReturnValue(PaymentOverride.MoneyAccount);
    selectPaymentTokenMock.mockReturnValue({
      assetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
      balanceFiat: '300',
      balanceHuman: '2',
      balanceRaw: '2000000000',
      balanceUsd: '300',
      decimals: 9,
      symbol: 'SOL',
    });
    useTransactionAccountOverrideMock.mockReturnValue(PAYING_ACCOUNT_MOCK);

    const { result } = runHook({ type: TransactionType.moneyAccountDeposit });

    expect(result.current.selected).toBe('metamask');
  });

  it('returns money-account when isDefaultMoneyAccount flag is true and no pay token is selected', () => {
    useIsMoneyAccountFlagDefaultMock.mockReturnValue(true);

    const { result } = runHook({ hasPayToken: false });

    expect(result.current.selected).toBe('money-account');
  });

  it('uses the selected pay token once the money-account override is cleared', () => {
    useIsMoneyAccountFlagDefaultMock.mockReturnValue(true);

    const { result } = runHook({ hasPayToken: true });

    expect(result.current.selected).toBe('metamask');
  });

  it.each([
    TransactionType.perpsDepositAndOrder,
    TransactionType.perpsLighterDepositAndOrder,
  ] as const)('returns perps when perps balance selected for %s', (type) => {
    useIsPerpsBalanceSelectedMock.mockReturnValue(true);

    const { result } = runHook({ type });

    expect(result.current.selected).toBe('perps');
  });

  it.each([
    TransactionType.moneyAccountDeposit,
    TransactionType.membershipSubscription,
  ] as const)(
    'tracks %s non-crypto section without waiting for accountOverride and counts switch to crypto',
    (type) => {
      selectPaymentOverrideMock.mockReturnValue(PaymentOverride.MoneyAccount);
      getInternalAccountByAddressMock.mockImplementation((_, address) =>
        createMockInternalAccount(address ?? PAYING_ACCOUNT_MOCK, 'Account'),
      );

      const { result, rerender } = runHook({ type });

      expect(result.current).toEqual({
        presented: 'money-account',
        selected: 'money-account',
        switchCount: 0,
      });

      selectPaymentOverrideMock.mockReturnValue(undefined);
      useTransactionAccountOverrideMock.mockReturnValue(PAYING_ACCOUNT_MOCK);
      useTransactionPayingAccountMock.mockReturnValue(PAYING_ACCOUNT_MOCK);

      rerender({});

      expect(result.current).toEqual({
        presented: 'money-account',
        selected: 'metamask',
        switchCount: 1,
      });
    },
  );

  it('returns the account type when perps balance is unused', () => {
    useIsPerpsBalanceSelectedMock.mockReturnValue(true);

    const { result } = runHook({ type: TransactionType.perpsDeposit });

    expect(result.current.selected).toBe('metamask');
  });

  it('returns predict when predict balance selected for predictDepositAndOrder', () => {
    selectPredictSelectedPaymentTokenMock.mockReturnValue(null);

    const { result } = runHook({
      type: TransactionType.predictDepositAndOrder,
    });

    expect(result.current.selected).toBe('predict');
  });

  it('returns bank-card when fiat payment is selected', () => {
    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'pm_123',
    } as never);

    const { result } = runHook();

    expect(result.current.selected).toBe('bank-card');
  });

  it('money-account takes priority over perps and predict', () => {
    selectPaymentOverrideMock.mockReturnValue(PaymentOverride.MoneyAccount);
    useIsPerpsBalanceSelectedMock.mockReturnValue(true);
    selectPredictSelectedPaymentTokenMock.mockReturnValue(null);

    const { result } = runHook({
      type: TransactionType.perpsDepositAndOrder,
    });

    expect(result.current.selected).toBe('money-account');
  });

  it('returns null presented when hasPayToken is false', () => {
    const { result } = runHook({ hasPayToken: false });

    expect(result.current.presented).toBeNull();
    expect(result.current.switchCount).toBe(0);
  });

  it('captures presented on first render and preserves it', () => {
    const { result, rerender } = runHook();

    expect(result.current.presented).toBe('metamask');

    selectPaymentOverrideMock.mockReturnValue(PaymentOverride.MoneyAccount);
    rerender({});

    expect(result.current.presented).toBe('metamask');
    expect(result.current.selected).toBe('money-account');
  });

  it('increments switchCount on section change', () => {
    const { result, rerender } = runHook();

    expect(result.current.switchCount).toBe(0);

    selectPaymentOverrideMock.mockReturnValue(PaymentOverride.MoneyAccount);
    rerender({});

    expect(result.current.switchCount).toBe(1);

    selectPaymentOverrideMock.mockReturnValue(undefined);
    rerender({});

    expect(result.current.switchCount).toBe(2);
  });

  it('does not increment switchCount when section stays the same', () => {
    const { result, rerender } = runHook();

    rerender({});
    rerender({});

    expect(result.current.switchCount).toBe(0);
  });

  it.each([
    TransactionType.moneyAccountDeposit,
    TransactionType.membershipSubscription,
  ] as const)(
    'increments switchCount when switching between two accounts of the same keyring type on %s',
    (type) => {
      getInternalAccountByAddressMock.mockImplementation((_, address) =>
        createMockInternalAccount(address ?? PAYING_ACCOUNT_MOCK, 'Account'),
      );
      useTransactionAccountOverrideMock.mockReturnValue(PAYING_ACCOUNT_MOCK);

      const { result, rerender } = runHook({ type });

      useTransactionAccountOverrideMock.mockReturnValue(
        SECOND_PAYING_ACCOUNT_MOCK,
      );
      useTransactionPayingAccountMock.mockReturnValue(
        SECOND_PAYING_ACCOUNT_MOCK,
      );

      rerender({});

      expect(result.current).toEqual({
        presented: 'metamask',
        selected: 'metamask',
        switchCount: 1,
      });
    },
  );

  it.each([
    TransactionType.moneyAccountDeposit,
    TransactionType.membershipSubscription,
  ] as const)(
    'increments switchCount twice when switching to another account and back on %s',
    (type) => {
      getInternalAccountByAddressMock.mockImplementation((_, address) =>
        createMockInternalAccount(address ?? PAYING_ACCOUNT_MOCK, 'Account'),
      );
      useTransactionAccountOverrideMock.mockReturnValue(PAYING_ACCOUNT_MOCK);

      const { result, rerender } = runHook({ type });

      useTransactionAccountOverrideMock.mockReturnValue(
        SECOND_PAYING_ACCOUNT_MOCK,
      );
      useTransactionPayingAccountMock.mockReturnValue(
        SECOND_PAYING_ACCOUNT_MOCK,
      );

      rerender({});

      useTransactionAccountOverrideMock.mockReturnValue(PAYING_ACCOUNT_MOCK);
      useTransactionPayingAccountMock.mockReturnValue(PAYING_ACCOUNT_MOCK);

      rerender({});

      expect(result.current.switchCount).toBe(2);
    },
  );

  it('increments switchCount when switching from crypto to bank-card and to another crypto account', () => {
    getInternalAccountByAddressMock.mockImplementation((_, address) =>
      createMockInternalAccount(address ?? PAYING_ACCOUNT_MOCK, 'Account'),
    );
    useTransactionAccountOverrideMock.mockReturnValue(PAYING_ACCOUNT_MOCK);

    const { result, rerender } = runHook({
      type: TransactionType.moneyAccountDeposit,
    });

    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'pm_123',
    });

    rerender({});

    useTransactionPayFiatPaymentMock.mockReturnValue(undefined);
    useTransactionAccountOverrideMock.mockReturnValue(
      SECOND_PAYING_ACCOUNT_MOCK,
    );
    useTransactionPayingAccountMock.mockReturnValue(SECOND_PAYING_ACCOUNT_MOCK);

    rerender({});

    expect(result.current).toEqual({
      presented: 'metamask',
      selected: 'metamask',
      switchCount: 2,
    });
  });

  it('does not increment switchCount when the same account is re-selected', () => {
    const accountLowercase =
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;
    const accountUppercase =
      '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' as const;
    useTransactionPayingAccountMock.mockReturnValue(accountLowercase);
    useTransactionAccountOverrideMock.mockReturnValue(accountLowercase);

    const { result, rerender } = runHook({
      type: TransactionType.moneyAccountDeposit,
    });

    useTransactionPayingAccountMock.mockReturnValue(accountUppercase);
    useTransactionAccountOverrideMock.mockReturnValue(accountUppercase);

    rerender({});

    expect(result.current.switchCount).toBe(0);
  });

  it('does not increment switchCount when payingAccount changes under a non-crypto section', () => {
    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'pm_123',
    });
    useTransactionAccountOverrideMock.mockReturnValue(PAYING_ACCOUNT_MOCK);

    const { result, rerender } = runHook({
      type: TransactionType.moneyAccountDeposit,
    });

    useTransactionAccountOverrideMock.mockReturnValue(
      SECOND_PAYING_ACCOUNT_MOCK,
    );
    useTransactionPayingAccountMock.mockReturnValue(SECOND_PAYING_ACCOUNT_MOCK);

    rerender({});

    expect(result.current.selected).toBe('bank-card');
    expect(result.current.switchCount).toBe(0);
  });
});
