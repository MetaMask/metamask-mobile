import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import {
  payFlagForTransactionType,
  perpsPayFlagType,
  perpsProviderSelectionForType,
  perpsTransactionTypeForSelection,
} from './perps-lighter-transaction-type';

describe('perpsTransactionTypeForSelection', () => {
  it('switches a deposit to the Lighter type', () => {
    const nextType = perpsTransactionTypeForSelection({
      currentType: TransactionType.perpsDeposit,
      destination: 'lighter',
      source: 'hyperliquid',
    });

    expect(nextType).toBe(TransactionType.perpsLighterDeposit);
    expect(nextType).toBe('perpsLighterDeposit');
  });

  it('restores a Hyperliquid deposit from the Lighter type', () => {
    const nextType = perpsTransactionTypeForSelection({
      currentType: TransactionType.perpsLighterDeposit,
      destination: 'hyperliquid',
      source: 'lighter',
    });

    expect(nextType).toBe(TransactionType.perpsDeposit);
  });

  it('switches a withdraw from the From selector and ignores the deposit destination', () => {
    const nextType = perpsTransactionTypeForSelection({
      currentType: TransactionType.perpsWithdraw,
      destination: 'hyperliquid',
      source: 'lighter',
    });

    expect(nextType).toBe(TransactionType.perpsLighterWithdraw);
  });

  it('restores a Hyperliquid withdraw', () => {
    const nextType = perpsTransactionTypeForSelection({
      currentType: TransactionType.perpsLighterWithdraw,
      destination: 'lighter',
      source: 'hyperliquid',
    });

    expect(nextType).toBe(TransactionType.perpsWithdraw);
  });

  it('switches a deposit-and-order to the Lighter type', () => {
    const nextType = perpsTransactionTypeForSelection({
      currentType: TransactionType.perpsDepositAndOrder,
      destination: 'lighter',
      source: 'hyperliquid',
    });

    expect(nextType).toBe(TransactionType.perpsLighterDepositAndOrder);
  });

  it('leaves the current type when the selection already matches', () => {
    const nextType = perpsTransactionTypeForSelection({
      currentType: TransactionType.perpsDeposit,
      destination: 'hyperliquid',
      source: 'lighter',
    });

    expect(nextType).toBe(TransactionType.perpsDeposit);
  });

  it('returns undefined for a transaction that is not a Perps transfer', () => {
    const nextType = perpsTransactionTypeForSelection({
      currentType: TransactionType.simpleSend,
      destination: 'lighter',
      source: 'lighter',
    });

    expect(nextType).toBeUndefined();
  });
});

describe('perpsProviderSelectionForType', () => {
  it('selects Lighter for a Lighter deposit, withdraw, or deposit-and-order', () => {
    expect(
      perpsProviderSelectionForType(TransactionType.perpsLighterDeposit),
    ).toBe('lighter');
    expect(
      perpsProviderSelectionForType(TransactionType.perpsLighterWithdraw),
    ).toBe('lighter');
    expect(
      perpsProviderSelectionForType(
        TransactionType.perpsLighterDepositAndOrder,
      ),
    ).toBe('lighter');
  });

  it('selects Hyperliquid for the existing Perps types', () => {
    expect(perpsProviderSelectionForType(TransactionType.perpsDeposit)).toBe(
      'hyperliquid',
    );
    expect(perpsProviderSelectionForType(TransactionType.perpsWithdraw)).toBe(
      'hyperliquid',
    );
    expect(perpsProviderSelectionForType(undefined)).toBe('hyperliquid');
  });
});

describe('payFlagForTransactionType', () => {
  it('uses the Hyperliquid deposit flag for a Lighter deposit', () => {
    const flags = { perpsDeposit: 25 };

    const value = payFlagForTransactionType(flags, {
      type: TransactionType.perpsLighterDeposit,
    } as TransactionMeta);

    expect(perpsPayFlagType(TransactionType.perpsLighterDeposit)).toBe(
      TransactionType.perpsDeposit,
    );
    expect(value).toBe(25);
  });

  it('uses a flag set on the Lighter type when one exists', () => {
    const flags = { perpsDeposit: 25, perpsLighterDeposit: 10 };

    const value = payFlagForTransactionType(flags, {
      type: TransactionType.perpsLighterDeposit,
    } as TransactionMeta);

    expect(value).toBe(10);
  });
});
