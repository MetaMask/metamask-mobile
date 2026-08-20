import {
  CHAIN_IDS,
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import { MUSD_TOKEN_ADDRESS } from '../../Earn/constants/musd';
import {
  isMoneyAccountTx,
  isMoneyDepositTx,
  isMoneyWithdrawTx,
  isSingleRowMusdMoneyWithdraw,
  isPerpsPredictMoneyActivity,
  isPerpsPredictMoneyDeposit,
  isPerpsPredictMoneyWithdraw,
  nestedTxWithType,
  perpsPredictServiceFamily,
  getMMPayChainIds,
  resolveMoneyDepositIntent,
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

describe('resolveMoneyDepositIntent', () => {
  const makeDepositTx = (
    metamaskPay?: Record<string, unknown>,
  ): TransactionMeta =>
    ({
      ...baseTx,
      type: TransactionType.moneyAccountDeposit,
      metamaskPay,
    }) as unknown as TransactionMeta;

  it('returns "card" for a fiat on-ramp deposit', () => {
    expect(resolveMoneyDepositIntent(makeDepositTx({ fiat: true }))).toBe(
      'card',
    );
  });

  it('returns "addMusd" for a deposit paid with mUSD', () => {
    expect(
      resolveMoneyDepositIntent(
        makeDepositTx({ tokenAddress: MUSD_TOKEN_ADDRESS }),
      ),
    ).toBe('addMusd');
  });

  it('returns "convert" for a crypto deposit with no fiat/mUSD payment', () => {
    expect(resolveMoneyDepositIntent(makeDepositTx())).toBe('convert');
    expect(
      resolveMoneyDepositIntent(
        makeDepositTx({
          tokenAddress: '0x1234567890123456789012345678901234567890',
        }),
      ),
    ).toBe('convert');
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

describe('isSingleRowMusdMoneyWithdraw', () => {
  it('returns true when destination is mUSD on Monad', () => {
    expect(
      isSingleRowMusdMoneyWithdraw({
        ...makeTx(TransactionType.moneyAccountWithdraw),
        metamaskPay: {
          tokenAddress: MUSD_TOKEN_ADDRESS,
          chainId: CHAIN_IDS.MONAD,
        },
      } as TransactionMeta),
    ).toBe(true);
  });

  it('returns true when destination is mUSD on another chain (cross-chain)', () => {
    expect(
      isSingleRowMusdMoneyWithdraw({
        ...makeTx(TransactionType.moneyAccountWithdraw),
        metamaskPay: {
          tokenAddress: MUSD_TOKEN_ADDRESS,
          chainId: CHAIN_IDS.LINEA_MAINNET,
        },
      } as TransactionMeta),
    ).toBe(true);
  });

  it('returns false when destination is a non-mUSD token', () => {
    expect(
      isSingleRowMusdMoneyWithdraw({
        ...makeTx(TransactionType.moneyAccountWithdraw),
        metamaskPay: {
          tokenAddress: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
          chainId: CHAIN_IDS.LINEA_MAINNET,
        },
      } as TransactionMeta),
    ).toBe(false);
  });

  it('returns false for deposit txs', () => {
    expect(
      isSingleRowMusdMoneyWithdraw({
        ...makeTx(TransactionType.moneyAccountDeposit),
        metamaskPay: {
          tokenAddress: MUSD_TOKEN_ADDRESS,
          chainId: CHAIN_IDS.MONAD,
        },
      } as TransactionMeta),
    ).toBe(false);
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

// mUSD on Monad as a MetaMask Pay token = funded by / landing in the Money
// account; any other token/chain is unrelated to it.
const MUSD_ON_MONAD = {
  tokenAddress: MUSD_TOKEN_ADDRESS,
  chainId: CHAIN_IDS.MONAD as Hex,
};
const USDC_ON_ARBITRUM = {
  tokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as Hex,
  chainId: CHAIN_IDS.ARBITRUM as Hex,
};

const makeServiceTx = (
  type: TransactionType | undefined,
  metamaskPay: Record<string, unknown> | undefined,
  nested?: { type: TransactionType }[],
): TransactionMeta =>
  ({
    ...baseTx,
    type,
    metamaskPay,
    nestedTransactions: nested,
  }) as unknown as TransactionMeta;

describe('isPerpsPredictMoneyDeposit', () => {
  it.each([
    TransactionType.perpsDeposit,
    TransactionType.perpsDepositAndOrder,
    TransactionType.predictDeposit,
    TransactionType.predictDepositAndOrder,
  ])('returns true for %s paid with mUSD on Monad', (type) => {
    expect(isPerpsPredictMoneyDeposit(makeServiceTx(type, MUSD_ON_MONAD))).toBe(
      true,
    );
  });

  it('returns false when the pay token is not mUSD on the Money chain', () => {
    expect(
      isPerpsPredictMoneyDeposit(
        makeServiceTx(TransactionType.perpsDeposit, USDC_ON_ARBITRUM),
      ),
    ).toBe(false);
  });

  it('returns false when there is no metamaskPay (not money-funded)', () => {
    expect(
      isPerpsPredictMoneyDeposit(
        makeServiceTx(TransactionType.perpsDeposit, undefined),
      ),
    ).toBe(false);
  });

  it('returns false for a withdraw type even with an mUSD pay token', () => {
    expect(
      isPerpsPredictMoneyDeposit(
        makeServiceTx(TransactionType.perpsWithdraw, MUSD_ON_MONAD),
      ),
    ).toBe(false);
  });
});

describe('isPerpsPredictMoneyWithdraw', () => {
  it('returns true for a top-level withdraw landing as mUSD on Monad', () => {
    expect(
      isPerpsPredictMoneyWithdraw(
        makeServiceTx(TransactionType.perpsWithdraw, MUSD_ON_MONAD),
      ),
    ).toBe(true);
  });

  it('returns true for an EIP-7702 batch with a nested predictWithdraw', () => {
    expect(
      isPerpsPredictMoneyWithdraw(
        makeServiceTx(TransactionType.batch, MUSD_ON_MONAD, [
          { type: TransactionType.predictWithdraw },
        ]),
      ),
    ).toBe(true);
  });

  it('returns false when the destination is not mUSD on the Money chain', () => {
    expect(
      isPerpsPredictMoneyWithdraw(
        makeServiceTx(TransactionType.predictWithdraw, USDC_ON_ARBITRUM),
      ),
    ).toBe(false);
  });

  it('returns false for a deposit type', () => {
    expect(
      isPerpsPredictMoneyWithdraw(
        makeServiceTx(TransactionType.perpsDeposit, MUSD_ON_MONAD),
      ),
    ).toBe(false);
  });
});

describe('isPerpsPredictMoneyActivity', () => {
  it('returns true for both a money-funded deposit and an mUSD withdraw', () => {
    expect(
      isPerpsPredictMoneyActivity(
        makeServiceTx(TransactionType.perpsDeposit, MUSD_ON_MONAD),
      ),
    ).toBe(true);
    expect(
      isPerpsPredictMoneyActivity(
        makeServiceTx(TransactionType.batch, MUSD_ON_MONAD, [
          { type: TransactionType.predictWithdraw },
        ]),
      ),
    ).toBe(true);
  });

  it('returns false for an unrelated tx', () => {
    expect(
      isPerpsPredictMoneyActivity(
        makeServiceTx(TransactionType.contractInteraction, MUSD_ON_MONAD),
      ),
    ).toBe(false);
  });
});

describe('perpsPredictServiceFamily', () => {
  it.each([
    [TransactionType.perpsDeposit, 'perps'],
    [TransactionType.perpsDepositAndOrder, 'perps'],
    [TransactionType.perpsWithdraw, 'perps'],
    [TransactionType.predictDeposit, 'predict'],
    [TransactionType.predictDepositAndOrder, 'predict'],
    [TransactionType.predictWithdraw, 'predict'],
  ])('maps %s to %s', (type, family) => {
    expect(perpsPredictServiceFamily(makeServiceTx(type, MUSD_ON_MONAD))).toBe(
      family,
    );
  });

  it('resolves the family from a nested batch call', () => {
    expect(
      perpsPredictServiceFamily(
        makeServiceTx(TransactionType.batch, MUSD_ON_MONAD, [
          { type: TransactionType.predictWithdraw },
        ]),
      ),
    ).toBe('predict');
  });

  it('returns undefined for a non-service tx', () => {
    expect(
      perpsPredictServiceFamily(
        makeServiceTx(TransactionType.moneyAccountWithdraw, undefined),
      ),
    ).toBeUndefined();
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
