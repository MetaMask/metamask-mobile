import { TransactionMeta } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { getDeleGatorEnvironment, type Caveat } from '../../core/Delegation';
import {
  SUBSIDIZED_ORDER_ID_PLACEHOLDER,
  getSubsidizedCaveats,
  normalizeCallData,
} from './subsidized-caveats';

const ENV = getDeleGatorEnvironment(1);

const { caveatEnforcers } = ENV;

const ALLOWED_CALLDATA_ENFORCER = caveatEnforcers.AllowedCalldataEnforcer;
const ALLOWED_TARGETS_ENFORCER = caveatEnforcers.AllowedTargetsEnforcer;

const TARGET = '0x1234567890123456789012345678901234567890' as Hex;
const PLACEHOLDER_BODY = SUBSIDIZED_ORDER_ID_PLACEHOLDER.slice(2).toLowerCase();

const APPROVE_SELECTOR = '095ea7b3';
const DEPOSIT_SELECTOR = 'f9e4bab4';
const EXECUTE_SELECTOR = '1a2b3c4d';

// Full calldata of each nested call (selector + args), matching the real
// `transferAndMulticall` shape:
//  - APPROVE_DATA carries NO order-ID placeholder -> no split point (merges left).
//  - DEPOSIT_DATA carries the order-ID placeholder -> its selector gets a split.
const APPROVE_DATA = `${APPROVE_SELECTOR}${'22'.repeat(28)}`;
const DEPOSIT_DATA = `${DEPOSIT_SELECTOR}${APPROVE_SELECTOR}${'33'.repeat(12)}${PLACEHOLDER_BODY}${APPROVE_SELECTOR}${'33'.repeat(12)}`;

/**
 * Builds batch-encoded 7702 calldata with the given number of placeholder occurrences.
 */
const buildBatchData = (occurrences = 1): Hex => {
  const fill = (byte: string) => byte.repeat(16);
  const header = `${EXECUTE_SELECTOR}${fill('11')}${APPROVE_DATA}${DEPOSIT_DATA}`;
  const windows = Array.from(
    { length: occurrences },
    (_, index) => `${PLACEHOLDER_BODY}${fill(index === 0 ? '44' : '55')}`,
  ).join('');
  return `0x${header}${windows}${fill('cd')}` as Hex;
};

const buildTransactionMeta = (
  data: Hex,
  nestedTransactions: { data?: Hex; to?: Hex }[] = [],
): TransactionMeta =>
  ({
    chainId: '0x1' as Hex,
    txParams: {
      data,
      from: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      to: TARGET,
      value: '0x0',
    },
    nestedTransactions,
  }) as unknown as TransactionMeta;

const parseAllowedCalldata = (terms: string) => ({
  startIndex: parseInt(terms.slice(2, 2 + 64), 16),
  value: terms.slice(2 + 64).toLowerCase(),
});

const getAllowedCalldataTerms = (caveats: Caveat[]) =>
  caveats
    .filter((c) => c.enforcer === ALLOWED_CALLDATA_ENFORCER)
    .map((c) => parseAllowedCalldata(c.terms));

describe('getSubsidizedCaveats', () => {
  describe('allowedTargets caveat', () => {
    it('first caveat is allowedTargets for the batch target', () => {
      const data = buildBatchData(1);
      const txMeta = buildTransactionMeta(data);

      const result = getSubsidizedCaveats(ENV, txMeta);

      expect(result[0].enforcer).toBe(ALLOWED_TARGETS_ENFORCER);
      // terms = lowercased packed target address (20 bytes)
      expect(result[0].terms.toLowerCase()).toContain(TARGET.slice(2).toLowerCase());
    });
  });

  describe('placeholder window is free', () => {
    it('leaves the order-ID placeholder window free and enforces the full remainder', () => {
      const data = buildBatchData(1);
      const txMeta = buildTransactionMeta(data, [
        { data: `0x${APPROVE_DATA}` as Hex, to: TARGET },
        { data: `0x${DEPOSIT_DATA}` as Hex, to: TARGET },
      ]);

      const result = getSubsidizedCaveats(ENV, txMeta);
      const enforced = getAllowedCalldataTerms(result);
      const body = data.slice(2).toLowerCase();

      // No enforced segment contains the placeholder bytes.
      for (const { value } of enforced) {
        expect(value).not.toContain(PLACEHOLDER_BODY);
      }

      // Every non-placeholder byte is enforced exactly once: rebuilding
      // the enforced segments at their offsets, plus the placeholder window,
      // reproduces the full body.
      const rebuilt = Array.from(body);
      for (const { startIndex, value } of enforced) {
        for (let i = 0; i < value.length; i++) {
          rebuilt[startIndex * 2 + i] = value[i];
        }
      }
      expect(rebuilt.join('')).toBe(body);

      // The placeholder window itself is not covered by any segment.
      const placeholderStart = body.indexOf(PLACEHOLDER_BODY) / 2;
      const covered = enforced.some(
        ({ startIndex, value }) =>
          startIndex <= placeholderStart &&
          placeholderStart < startIndex + value.length / 2,
      );
      expect(covered).toBe(false);
    });

    it('frees every occurrence when the placeholder appears multiple times', () => {
      const data = buildBatchData(2);
      const txMeta = buildTransactionMeta(data, [
        { data: `0x${APPROVE_DATA}` as Hex, to: TARGET },
        { data: `0x${DEPOSIT_DATA}` as Hex, to: TARGET },
      ]);

      const result = getSubsidizedCaveats(ENV, txMeta);
      const enforced = getAllowedCalldataTerms(result);
      const body = data.slice(2).toLowerCase();

      for (const { value } of enforced) {
        expect(value).not.toContain(PLACEHOLDER_BODY);
      }

      // All three placeholder occurrences (one inside deposit args, two trailing windows) are free.
      let searchIndex = body.indexOf(PLACEHOLDER_BODY);
      const placeholderStarts: number[] = [];
      while (searchIndex !== -1) {
        placeholderStarts.push(searchIndex / 2);
        searchIndex = body.indexOf(PLACEHOLDER_BODY, searchIndex + 1);
      }
      expect(placeholderStarts).toHaveLength(3);

      for (const start of placeholderStarts) {
        const covered = enforced.some(
          ({ startIndex, value }) =>
            startIndex <= start && start < startIndex + value.length / 2,
        );
        expect(covered).toBe(false);
      }
    });
  });

  describe('split points', () => {
    it('splits only after order-ID-bearing call selectors, folding the selector into the preceding segment', () => {
      const data = buildBatchData(1);
      const body = data.slice(2).toLowerCase();
      const txMeta = buildTransactionMeta(data, [
        { data: `0x${APPROVE_DATA}` as Hex, to: TARGET },
        { data: `0x${DEPOSIT_DATA}` as Hex, to: TARGET },
      ]);

      const result = getSubsidizedCaveats(ENV, txMeta);
      const enforced = getAllowedCalldataTerms(result);

      // No segment is the bare selector (selector is folded into the preceding run).
      expect(enforced).not.toContainEqual(
        expect.objectContaining({ value: APPROVE_SELECTOR }),
      );
      expect(enforced).not.toContainEqual(
        expect.objectContaining({ value: DEPOSIT_SELECTOR }),
      );

      const approveSplit = body.indexOf(APPROVE_DATA) / 2 + 4;
      const depositSplit = body.indexOf(DEPOSIT_DATA) / 2 + 4;
      const segmentEnds = enforced.map(
        ({ startIndex, value }) => startIndex + value.length / 2,
      );

      // Deposit carries the placeholder -> its selector gets a split.
      expect(segmentEnds).toContain(depositSplit);

      // Approve carries no placeholder -> no split; merges into the preceding run.
      expect(segmentEnds).not.toContain(approveSplit);

      // Coincidental approve selectors inside deposit args must NOT create split points.
      const depositStart = body.indexOf(DEPOSIT_DATA) / 2;
      const innerApprove1 = depositStart + 4 + 4;
      expect(segmentEnds).not.toContain(innerApprove1);
    });

    it('produces far fewer caveats than a naive per-selector split (regression: 9 -> few)', () => {
      const data = buildBatchData(2);
      const txMeta = buildTransactionMeta(data, [
        { data: `0x${APPROVE_DATA}` as Hex, to: TARGET },
        { data: `0x${DEPOSIT_DATA}` as Hex, to: TARGET },
      ]);

      const result = getSubsidizedCaveats(ENV, txMeta);

      // allowedTargets + allowedCalldata segments. Old per-selector isolation emitted ~9 caveats.
      expect(result.length).toBeLessThanOrEqual(8);
    });
  });

  describe('error handling', () => {
    it('throws "Subsidized Caveats: Missing batch target or calldata" when target is missing', () => {
      const txMeta: TransactionMeta = {
        chainId: '0x1' as Hex,
        txParams: {
          data: '0xabcd1234' as Hex,
          from: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          to: undefined,
        },
      } as unknown as TransactionMeta;

      expect(() => getSubsidizedCaveats(ENV, txMeta)).toThrow(
        'Subsidized Caveats: Missing batch target or calldata',
      );
    });

    it('throws "Subsidized Caveats: Missing batch target or calldata" when calldata is missing', () => {
      const txMeta: TransactionMeta = {
        chainId: '0x1' as Hex,
        txParams: {
          data: undefined,
          from: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          to: TARGET,
        },
      } as unknown as TransactionMeta;

      expect(() => getSubsidizedCaveats(ENV, txMeta)).toThrow(
        'Subsidized Caveats: Missing batch target or calldata',
      );
    });
  });

  describe('no limitedCalls in subsidized caveats', () => {
    it('does not include a limitedCalls caveat', () => {
      const data = buildBatchData(1);
      const txMeta = buildTransactionMeta(data);

      const result = getSubsidizedCaveats(ENV, txMeta);

      const hasLimitedCalls = result.some(
        (c) => c.enforcer === caveatEnforcers.LimitedCallsEnforcer,
      );
      expect(hasLimitedCalls).toBe(false);
    });
  });
});

describe('normalizeCallData', () => {
  it('returns "0x" for undefined', () => {
    expect(normalizeCallData(undefined)).toBe('0x');
  });

  it('returns "0x" for null', () => {
    expect(normalizeCallData(null)).toBe('0x');
  });

  it('returns "0x" for empty string', () => {
    expect(normalizeCallData('')).toBe('0x');
  });

  it('returns "0x" for "0x" only', () => {
    expect(normalizeCallData('0x')).toBe('0x');
  });

  it('lowercases hex characters', () => {
    expect(normalizeCallData('0xABCDEF')).toBe('0xabcdef');
  });

  it('adds 0x prefix when missing', () => {
    expect(normalizeCallData('abcdef1234')).toBe('0xabcdef1234');
  });

  it('pads odd-length hex body with a leading zero', () => {
    expect(normalizeCallData('0xabc')).toBe('0x0abc');
  });

  it('pads odd-length hex body without prefix', () => {
    expect(normalizeCallData('abc')).toBe('0x0abc');
  });

  it('preserves even-length hex unchanged (modulo casing)', () => {
    expect(normalizeCallData('0xDEADBEEF')).toBe('0xdeadbeef');
  });
});
