import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import {
  isMoneyAccountTx,
  isMoneyDepositTx,
  isMoneyWithdrawTx,
  nestedTxWithType,
  getMMPayChainIds,
} from './moneyTransactionGuards';

const baseTx = {
  id: 'tx-1',
  status: TransactionStatus.confirmed,
  time: 0,
  txParams: {},
} as unknown as TransactionMeta;

const makeTx = (
  type: TransactionType,
  nested?: { type: TransactionType }[],
): TransactionMeta =>
  ({
    ...baseTx,
    type,
    nestedTransactions: nested,
  }) as unknown as TransactionMeta;

describe('nestedTxWithType', () => {
  it('returns nested tx matching the target type', () => {
    const tx = makeTx(TransactionType.contractInteraction, [
      { type: TransactionType.moneyAccountDeposit },
    ]);
    const result = nestedTxWithType(tx, TransactionType.moneyAccountDeposit);
    expect(result?.type).toBe(TransactionType.moneyAccountDeposit);
  });

  it('returns undefined when no nested tx matches', () => {
    const tx = makeTx(TransactionType.contractInteraction, [
      { type: TransactionType.moneyAccountWithdraw },
    ]);
    expect(
      nestedTxWithType(tx, TransactionType.moneyAccountDeposit),
    ).toBeUndefined();
  });

  it('returns undefined when nestedTransactions is absent', () => {
    const tx = makeTx(TransactionType.contractInteraction);
    expect(
      nestedTxWithType(tx, TransactionType.moneyAccountDeposit),
    ).toBeUndefined();
  });
});

describe('isMoneyDepositTx', () => {
  it('returns true for top-level deposit tx', () => {
    expect(isMoneyDepositTx(makeTx(TransactionType.moneyAccountDeposit))).toBe(
      true,
    );
  });

  it('returns true for tx with nested deposit', () => {
    const tx = makeTx(TransactionType.contractInteraction, [
      { type: TransactionType.moneyAccountDeposit },
    ]);
    expect(isMoneyDepositTx(tx)).toBe(true);
  });

  it('returns false for withdraw tx', () => {
    expect(isMoneyDepositTx(makeTx(TransactionType.moneyAccountWithdraw))).toBe(
      false,
    );
  });

  it('returns false for unrelated tx type', () => {
    expect(isMoneyDepositTx(makeTx(TransactionType.contractInteraction))).toBe(
      false,
    );
  });
});

describe('isMoneyWithdrawTx', () => {
  it('returns true for top-level withdraw tx', () => {
    expect(
      isMoneyWithdrawTx(makeTx(TransactionType.moneyAccountWithdraw)),
    ).toBe(true);
  });

  it('returns true for tx with nested withdraw', () => {
    const tx = makeTx(TransactionType.contractInteraction, [
      { type: TransactionType.moneyAccountWithdraw },
    ]);
    expect(isMoneyWithdrawTx(tx)).toBe(true);
  });

  it('returns false for deposit tx', () => {
    expect(isMoneyWithdrawTx(makeTx(TransactionType.moneyAccountDeposit))).toBe(
      false,
    );
  });

  it('returns false for unrelated tx type', () => {
    expect(isMoneyWithdrawTx(makeTx(TransactionType.contractInteraction))).toBe(
      false,
    );
  });
});

describe('isMoneyAccountTx', () => {
  it('returns true for deposit', () => {
    expect(isMoneyAccountTx(makeTx(TransactionType.moneyAccountDeposit))).toBe(
      true,
    );
  });

  it('returns true for withdraw', () => {
    expect(isMoneyAccountTx(makeTx(TransactionType.moneyAccountWithdraw))).toBe(
      true,
    );
  });

  it('returns true for tx with nested deposit', () => {
    const tx = makeTx(TransactionType.contractInteraction, [
      { type: TransactionType.moneyAccountDeposit },
    ]);
    expect(isMoneyAccountTx(tx)).toBe(true);
  });

  it('returns true for tx with nested withdraw', () => {
    const tx = makeTx(TransactionType.contractInteraction, [
      { type: TransactionType.moneyAccountWithdraw },
    ]);
    expect(isMoneyAccountTx(tx)).toBe(true);
  });

  it('returns false for unrelated tx type', () => {
    expect(isMoneyAccountTx(makeTx(TransactionType.contractInteraction))).toBe(
      false,
    );
  });
});

describe('getMMPayChainIds', () => {
  const makePayTx = (
    chainId: `0x${string}`,
    payChainId: `0x${string}` | undefined,
    isPostQuote: boolean,
  ): TransactionMeta =>
    ({
      ...baseTx,
      chainId,
      type: TransactionType.moneyAccountDeposit,
      metamaskPay:
        payChainId !== undefined
          ? { chainId: payChainId, isPostQuote }
          : undefined,
    }) as unknown as TransactionMeta;

  it('returns pay chainId as source and local as destination when isPostQuote is false', () => {
    const tx = makePayTx('0x1', '0x89', false);

    const result = getMMPayChainIds(tx);

    expect(result.sourceChainId).toBe('0x89');
    expect(result.destinationChainId).toBe('0x1');
  });

  it('returns local chainId as source and pay chainId as destination when isPostQuote is true', () => {
    const tx = makePayTx('0x1', '0x89', true);

    const result = getMMPayChainIds(tx);

    expect(result.sourceChainId).toBe('0x1');
    expect(result.destinationChainId).toBe('0x89');
  });

  it('returns undefined source and undefined destination when metamaskPay is absent', () => {
    const tx = {
      ...baseTx,
      type: TransactionType.contractInteraction,
    } as unknown as TransactionMeta;

    const result = getMMPayChainIds(tx);

    expect(result.sourceChainId).toBe(tx.chainId);
    expect(result.destinationChainId).toBe(tx.chainId);
  });
});
