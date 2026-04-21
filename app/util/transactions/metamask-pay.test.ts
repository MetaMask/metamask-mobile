import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';

import {
  MM_PAY_DETAIL_TRANSACTION_TYPES,
  MM_PAY_DEPOSIT_CHILD_TRANSACTION_TYPES,
  MM_PAY_POSITIVE_TRANSFER_TRANSACTION_TYPES,
  getMetaMaskPayUseCase,
  getMetaMaskPayRouteTransactionType,
  hasMetaMaskPayDepositChildTransactionType,
  hasPerpsDepositTransactionType,
  hasPredictDepositTransactionType,
  hasPredictWithdrawTransactionType,
} from './metamask-pay';

describe('MetaMask Pay transaction helpers', () => {
  it('classifies perpsAcrossDeposit as a perps deposit child transaction', () => {
    const transactionMeta = {
      type: TransactionType.perpsAcrossDeposit,
    } as TransactionMeta;

    expect(hasPerpsDepositTransactionType(transactionMeta)).toBe(true);
    expect(hasMetaMaskPayDepositChildTransactionType(transactionMeta)).toBe(
      true,
    );
    expect(MM_PAY_DEPOSIT_CHILD_TRANSACTION_TYPES).toContain(
      TransactionType.perpsAcrossDeposit,
    );
    expect(getMetaMaskPayUseCase(transactionMeta)).toBe('perps_deposit');
  });

  it('classifies predictAcrossDeposit as a predict deposit child transaction', () => {
    const transactionMeta = {
      type: TransactionType.predictAcrossDeposit,
    } as TransactionMeta;

    expect(hasPredictDepositTransactionType(transactionMeta)).toBe(true);
    expect(hasMetaMaskPayDepositChildTransactionType(transactionMeta)).toBe(
      true,
    );
    expect(MM_PAY_DEPOSIT_CHILD_TRANSACTION_TYPES).toContain(
      TransactionType.predictAcrossDeposit,
    );
    expect(getMetaMaskPayUseCase(transactionMeta)).toBe('predict_deposit');
  });

  it('groups provider-specific deposit variants under the parent route type', () => {
    expect(
      getMetaMaskPayRouteTransactionType({
        type: TransactionType.perpsDepositAndOrder,
      } as TransactionMeta),
    ).toBe(TransactionType.perpsDeposit);

    expect(
      getMetaMaskPayRouteTransactionType({
        type: TransactionType.perpsAcrossDeposit,
      } as TransactionMeta),
    ).toBe(TransactionType.perpsDeposit);

    expect(
      getMetaMaskPayRouteTransactionType({
        type: TransactionType.predictDepositAndOrder,
      } as TransactionMeta),
    ).toBe(TransactionType.predictDeposit);

    expect(
      getMetaMaskPayRouteTransactionType({
        type: TransactionType.predictAcrossDeposit,
      } as TransactionMeta),
    ).toBe(TransactionType.predictDeposit);
  });

  it('classifies predictWithdraw and relay child variants correctly', () => {
    expect(
      hasPredictWithdrawTransactionType({
        type: TransactionType.predictWithdraw,
      } as TransactionMeta),
    ).toBe(true);

    expect(
      hasMetaMaskPayDepositChildTransactionType({
        type: TransactionType.relayDeposit,
      } as TransactionMeta),
    ).toBe(true);

    expect(
      hasMetaMaskPayDepositChildTransactionType({
        type: TransactionType.predictRelayDeposit,
      } as TransactionMeta),
    ).toBe(true);

    expect(
      getMetaMaskPayUseCase({
        type: TransactionType.predictWithdraw,
      } as TransactionMeta),
    ).toBe('predict_withdraw');
  });

  it('returns route transaction types for MM Pay transaction families and undefined otherwise', () => {
    expect(
      getMetaMaskPayRouteTransactionType({
        type: TransactionType.musdClaim,
      } as TransactionMeta),
    ).toBe(TransactionType.musdClaim);

    expect(
      getMetaMaskPayRouteTransactionType({
        type: TransactionType.musdConversion,
      } as TransactionMeta),
    ).toBe(TransactionType.musdConversion);

    expect(
      getMetaMaskPayRouteTransactionType({
        type: TransactionType.predictWithdraw,
      } as TransactionMeta),
    ).toBe(TransactionType.predictWithdraw);

    expect(
      getMetaMaskPayRouteTransactionType({
        type: TransactionType.swap,
      } as TransactionMeta),
    ).toBeUndefined();
  });

  it('includes MM Pay transfer/detail variants and excludes claim types', () => {
    expect(MM_PAY_POSITIVE_TRANSFER_TRANSACTION_TYPES).toContain(
      TransactionType.perpsAcrossDeposit,
    );
    expect(MM_PAY_POSITIVE_TRANSFER_TRANSACTION_TYPES).toContain(
      TransactionType.perpsWithdraw,
    );
    expect(MM_PAY_POSITIVE_TRANSFER_TRANSACTION_TYPES).toContain(
      TransactionType.predictAcrossDeposit,
    );
    expect(MM_PAY_POSITIVE_TRANSFER_TRANSACTION_TYPES).toContain(
      TransactionType.predictWithdraw,
    );
    expect(MM_PAY_DETAIL_TRANSACTION_TYPES).toContain(
      TransactionType.perpsWithdraw,
    );
    expect(MM_PAY_DETAIL_TRANSACTION_TYPES).toContain(
      TransactionType.predictDepositAndOrder,
    );
    expect(MM_PAY_POSITIVE_TRANSFER_TRANSACTION_TYPES).not.toContain(
      TransactionType.musdClaim,
    );
    expect(MM_PAY_POSITIVE_TRANSFER_TRANSACTION_TYPES).not.toContain(
      TransactionType.predictClaim,
    );
  });
});
