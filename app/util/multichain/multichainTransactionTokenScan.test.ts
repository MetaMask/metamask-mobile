import type { Transaction } from '@metamask/keyring-api';
import {
  buildMultichainActivityTokenScanFingerprint,
  collectMultichainTransactionTokenScanKeys,
  filterMultichainTransactionsExcludingMaliciousTokenActivity,
  multichainTransactionInvolvesMaliciousTokenKey,
  type MultichainTokenScanKey,
} from './multichainTransactionTokenScan';

const SOL_MAINNET = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
const SPL_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';
const CAIP_TOKEN = `${SOL_MAINNET}/token:${SPL_MINT}`;

function makeReceiveTx(): Transaction {
  return {
    type: 'receive',
    id: 'tx-1',
    chain: SOL_MAINNET as `${string}:${string}`,
    status: 'confirmed',
    account: 'acc-1',
    timestamp: 1,
    from: [
      {
        address: 'Sender1111111111111111111111111111111111',
        asset: {
          fungible: true,
          type: `${SOL_MAINNET}/slip44:501`,
          unit: 'SOL',
          amount: '0.001',
        },
      },
    ],
    to: [
      {
        address: 'Recv111111111111111111111111111111111111',
        asset: {
          fungible: true,
          type: CAIP_TOKEN,
          unit: 'USDT',
          amount: '5000',
        },
      },
    ],
    events: [{ status: 'confirmed', timestamp: 1 }],
    fees: [
      {
        type: 'base',
        asset: {
          fungible: true,
          type: `${SOL_MAINNET}/slip44:501`,
          unit: 'SOL',
          amount: '0.00001',
        },
      },
    ],
  } as Transaction;
}

describe('multichainTransactionTokenScan', () => {
  it('collectMultichainTransactionTokenScanKeys returns only token namespace assets', () => {
    const keys = collectMultichainTransactionTokenScanKeys(makeReceiveTx());
    expect(keys).toEqual([`solana:${SPL_MINT}`]);
  });

  it('multichainTransactionInvolvesMaliciousTokenKey matches scan keys', () => {
    const tx = makeReceiveTx();
    const malicious = new Set<MultichainTokenScanKey>([
      `solana:${SPL_MINT}` as MultichainTokenScanKey,
    ]);
    expect(multichainTransactionInvolvesMaliciousTokenKey(tx, malicious)).toBe(
      true,
    );
    expect(multichainTransactionInvolvesMaliciousTokenKey(tx, new Set())).toBe(
      false,
    );
    expect(
      multichainTransactionInvolvesMaliciousTokenKey(
        tx,
        new Set([`solana:OtherMint111111111111111111111111111`]),
      ),
    ).toBe(false);
  });

  it('buildMultichainActivityTokenScanFingerprint is order-stable', () => {
    const a = buildMultichainActivityTokenScanFingerprint([
      makeReceiveTx(),
      makeReceiveTx(),
    ]);
    const b = buildMultichainActivityTokenScanFingerprint([makeReceiveTx()]);
    expect(a).toBe(b);
  });

  it('filterMultichainTransactionsExcludingMaliciousTokenActivity is a noop when malicious set is empty', () => {
    const txs = [makeReceiveTx(), { ...makeReceiveTx(), id: 'tx-2' }];
    expect(
      filterMultichainTransactionsExcludingMaliciousTokenActivity(
        txs,
        new Set(),
      ),
    ).toEqual(txs);
  });

  it('filterMultichainTransactionsExcludingMaliciousTokenActivity removes txs involving malicious keys', () => {
    const bad = makeReceiveTx();
    const base = makeReceiveTx();
    const good: Transaction = {
      ...base,
      id: 'tx-clean',
      to: [
        {
          address: base.to[0]?.address ?? '',
          asset: {
            fungible: true,
            type: `${SOL_MAINNET}/token:CleanMint1111111111111111111111111111`,
            unit: 'USDT',
            amount: '1',
          },
        },
      ],
    };
    const malicious = new Set<MultichainTokenScanKey>([
      `solana:${SPL_MINT}` as MultichainTokenScanKey,
    ]);
    expect(
      filterMultichainTransactionsExcludingMaliciousTokenActivity(
        [bad, good],
        malicious,
      ),
    ).toEqual([good]);
  });
});
