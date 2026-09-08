import type { TransactionMeta } from '@metamask/transaction-controller';
import type { ClaimDto } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { resolveClaimTransaction } from './resolveClaimTransaction';

const MONEY_ACCOUNT = '0x89db8ee873bf22edb5da3b011c78a3ff990267b8';
const CHAIN_ID = '0x8f';
const OPENED_AT = '2026-09-07T10:00:00.000Z';
const OPENED_MS = Date.parse(OPENED_AT);

const createClaim = (overrides: Partial<ClaimDto> = {}): ClaimDto =>
  ({
    id: 'claim-1',
    money_account_address: MONEY_ACCOUNT,
    earning_origin_types: ['REFERRAL_REV_SHARE'],
    gross_amount: '200000',
    withheld_amount: '0',
    net_amount: '200000',
    withholding_rate_bps: 0,
    valid_before: null,
    status: 'AUTHORIZED',
    created_at: OPENED_AT,
    settled_tx_hash: null,
    settled_at: null,
    ...overrides,
  }) as ClaimDto;

const createTx = (
  id: string,
  time: number,
  overrides: Partial<TransactionMeta> = {},
): TransactionMeta =>
  ({
    id,
    time,
    chainId: CHAIN_ID,
    txParams: { from: MONEY_ACCOUNT },
    ...overrides,
  }) as unknown as TransactionMeta;

/** `selectSortedTransactions` hands back newest-first. */
const newestFirst = (...txs: TransactionMeta[]) =>
  [...txs].sort((a, b) => (b.time ?? 0) - (a.time ?? 0));

describe('resolveClaimTransaction', () => {
  it('matches exactly on the settled transaction hash', () => {
    const tx = createTx('tx-settled', OPENED_MS + 10_000, { hash: '0xABC' });

    const result = resolveClaimTransaction({
      claim: createClaim({ status: 'SETTLED', settled_tx_hash: '0xabc' }),
      transactions: [tx],
      chainId: CHAIN_ID,
    });

    expect(result).toEqual({ kind: 'exact', transactionId: 'tx-settled' });
  });

  it('matches exactly on an id captured at submission', () => {
    const tx = createTx('tx-known', OPENED_MS + 5_000);

    const result = resolveClaimTransaction({
      claim: createClaim(),
      transactions: [tx],
      chainId: CHAIN_ID,
      knownTransactionId: 'tx-known',
    });

    expect(result).toEqual({ kind: 'exact', transactionId: 'tx-known' });
  });

  /**
   * The later-session case: no hash yet and no in-session id, so the earliest
   * plausible transaction is offered as a guess rather than as fact.
   */
  it('infers the earliest transaction at or after the claim opened', () => {
    const result = resolveClaimTransaction({
      claim: createClaim(),
      transactions: newestFirst(
        createTx('tx-later', OPENED_MS + 90_000),
        createTx('tx-earliest', OPENED_MS + 2_000),
        createTx('tx-before', OPENED_MS - 1_000),
      ),
      chainId: CHAIN_ID,
    });

    expect(result).toEqual({ kind: 'inferred', transactionId: 'tx-earliest' });
  });

  it('never infers a transaction from before the claim opened', () => {
    const result = resolveClaimTransaction({
      claim: createClaim(),
      transactions: [createTx('tx-before', OPENED_MS - 1)],
      chainId: CHAIN_ID,
    });

    expect(result).toEqual({ kind: 'none' });
  });

  /**
   * The voucher lives 60 seconds, so a transaction well after the claim opened
   * is a different action. An unbounded search would confidently open an
   * unrelated transfer.
   */
  it('does not infer beyond the match window', () => {
    const result = resolveClaimTransaction({
      claim: createClaim(),
      transactions: [createTx('tx-much-later', OPENED_MS + 6 * 60 * 1000)],
      chainId: CHAIN_ID,
    });

    expect(result).toEqual({ kind: 'none' });
  });

  it('ignores transactions from another account or chain', () => {
    const result = resolveClaimTransaction({
      claim: createClaim(),
      transactions: [
        createTx('tx-other-account', OPENED_MS + 1_000, {
          txParams: { from: '0x1111111111111111111111111111111111111111' },
        } as unknown as Partial<TransactionMeta>),
        createTx('tx-other-chain', OPENED_MS + 1_000, {
          chainId: '0x1',
        } as unknown as Partial<TransactionMeta>),
      ],
      chainId: CHAIN_ID,
    });

    expect(result).toEqual({ kind: 'none' });
  });

  /**
   * `dev:settle-claim` moves a claim to SETTLED without a block or hash, which
   * is exactly the local testing state. Settled is not in flight, so there is
   * no pending transaction to guess at — the row stays inert rather than
   * opening whatever the account did next.
   */
  it('does not guess for a settled claim carrying no hash', () => {
    const result = resolveClaimTransaction({
      claim: createClaim({ status: 'SETTLED', settled_tx_hash: null }),
      transactions: [createTx('tx-guess', OPENED_MS + 3_000)],
      chainId: CHAIN_ID,
    });

    expect(result).toEqual({ kind: 'none' });
  });

  /**
   * A settled claim's hash is authoritative. Not finding it locally is a known
   * miss — pruned history, or settled on another install — not licence to open
   * a different transaction.
   */
  it('does not guess when a settled hash is absent from local history', () => {
    const result = resolveClaimTransaction({
      claim: createClaim({ status: 'SETTLED', settled_tx_hash: '0xmissing' }),
      transactions: [createTx('tx-unrelated', OPENED_MS + 1_000)],
      chainId: CHAIN_ID,
    });

    expect(result).toEqual({ kind: 'none' });
  });

  /**
   * These never reached the chain, so any match is definitionally wrong. The
   * dangerous case is a retry: expired rows sit right beside the successful
   * claim's transaction, which is exactly what a time window would grab.
   */
  it.each<['EXPIRED' | 'FAILED']>([['EXPIRED'], ['FAILED']])(
    'never guesses for a %s claim',
    (status) => {
      const result = resolveClaimTransaction({
        claim: createClaim({ status }),
        transactions: [createTx('tx-someone-elses', OPENED_MS + 1_000)],
        chainId: CHAIN_ID,
      });

      expect(result).toEqual({ kind: 'none' });
    },
  );

  /** A pending claim is the one case a guess is legitimate. */
  it.each<['AUTHORIZED' | 'PENDING_SIGNATURE']>([
    ['AUTHORIZED'],
    ['PENDING_SIGNATURE'],
  ])('still guesses for a %s claim', (status) => {
    const result = resolveClaimTransaction({
      claim: createClaim({ status }),
      transactions: [createTx('tx-inflight', OPENED_MS + 1_000)],
      chainId: CHAIN_ID,
    });

    expect(result).toEqual({ kind: 'inferred', transactionId: 'tx-inflight' });
  });

  /** An exact hash match still wins for a settled claim. */
  it('still opens a settled claim whose hash is in local history', () => {
    const result = resolveClaimTransaction({
      claim: createClaim({ status: 'SETTLED', settled_tx_hash: '0xabc' }),
      transactions: [
        createTx('tx-real', OPENED_MS + 10_000, { hash: '0xABC' }),
      ],
      chainId: CHAIN_ID,
    });

    expect(result).toEqual({ kind: 'exact', transactionId: 'tx-real' });
  });

  it('reports none when the claim has an unparseable timestamp', () => {
    const result = resolveClaimTransaction({
      claim: createClaim({ created_at: 'not-a-date' }),
      transactions: [createTx('tx-any', OPENED_MS)],
      chainId: CHAIN_ID,
    });

    expect(result).toEqual({ kind: 'none' });
  });

  it('reports none when there are no local transactions', () => {
    const result = resolveClaimTransaction({
      claim: createClaim(),
      transactions: [],
      chainId: CHAIN_ID,
    });

    expect(result).toEqual({ kind: 'none' });
  });
});
