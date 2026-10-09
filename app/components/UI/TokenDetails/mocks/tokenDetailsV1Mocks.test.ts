import { SECURITY_CONTRACT_CHECKS } from '../components/V1/SecurityTab/SecurityTab.constants';
import { ContractCheckKey } from '../components/V1/SecurityTab/SecurityTab.types';
import {
  MOCK_SECURITY_FACTS_EVM,
  MOCK_SECURITY_FACTS_SOLANA,
  MOCK_SECURITY_FLAG_COUNT,
  MOCK_SECURITY_VERDICT,
  MOCK_SHARED_TOKEN_METRICS,
} from './tokenDetailsV1Mocks';

/** `$560.0K` -> 560000, `$12.4M` -> 12400000. */
const parseCompactUsd = (value: string): number => {
  const multiplier = { K: 1e3, M: 1e6, B: 1e9 }[value.slice(-1)] ?? 1;
  return parseFloat(value.replace(/[$,KMB]/g, '')) * multiplier;
};

describe('tokenDetailsV1Mocks', () => {
  // ASSETS-4056 requires these to be identical in the stat bar and the Security
  // tab. Two independently written mock sets can break that acceptance
  // criterion before any real data exists, which is the reason they are defined
  // once and derived from.
  describe('shared metrics', () => {
    it.each([
      [
        'holder count',
        'holdersCount',
        (facts: typeof MOCK_SECURITY_FACTS_EVM) => facts.holders.count,
      ],
      [
        'top ten share',
        'topTenPercentage',
        (facts: typeof MOCK_SECURITY_FACTS_EVM) =>
          facts.holders.topTenPercentage,
      ],
      [
        'total liquidity',
        'totalLiquidity',
        (facts: typeof MOCK_SECURITY_FACTS_EVM) => facts.liquidity.total,
      ],
      [
        'liquidity to market cap',
        'liquidityToMarketCap',
        (facts: typeof MOCK_SECURITY_FACTS_EVM) =>
          facts.liquidity.liquidityToMarketCap,
      ],
    ] as const)(
      'uses the same %s on both chains',
      (_label, primitive, read) => {
        expect(read(MOCK_SECURITY_FACTS_EVM)).toBe(
          MOCK_SHARED_TOKEN_METRICS[primitive],
        );
        expect(read(MOCK_SECURITY_FACTS_SOLANA)).toBe(
          MOCK_SHARED_TOKEN_METRICS[primitive],
        );
      },
    );

    // The V3 prototype shows $2.4M liquidity against Liq/MC 479.52%, which
    // would put liquidity at nearly five times market cap. That cannot happen,
    // so the figures here are checked rather than copied.
    it('states a liquidity ratio that the liquidity and market cap actually produce', () => {
      const ratio =
        (parseCompactUsd(MOCK_SHARED_TOKEN_METRICS.totalLiquidity) /
          parseCompactUsd(MOCK_SHARED_TOKEN_METRICS.marketCap)) *
        100;

      expect(ratio).toBeCloseTo(
        parseFloat(MOCK_SHARED_TOKEN_METRICS.liquidityToMarketCap),
        1,
      );
    });

    it('keeps the top-ten bar fill in step with the top-ten label', () => {
      expect(`${MOCK_SHARED_TOKEN_METRICS.topTenFillPercentage}%`).toBe(
        MOCK_SHARED_TOKEN_METRICS.topTenPercentage,
      );
    });

    // The bar shows these two as a single split, so a pair that does not sum to
    // 100% would put a figure on screen the picture contradicts.
    it('splits the whole supply between the top ten and everyone else', () => {
      const total =
        parseFloat(MOCK_SHARED_TOKEN_METRICS.topTenPercentage) +
        parseFloat(MOCK_SHARED_TOKEN_METRICS.remainingPercentage);

      expect(total).toBeCloseTo(100, 1);
    });
  });

  // The pill and the tab header render the same word, so deriving one from the
  // other is what stops them drifting while both are mocked.
  describe('pill mocks', () => {
    it('takes its verdict from the EVM fact set', () => {
      expect(MOCK_SECURITY_VERDICT).toBe(MOCK_SECURITY_FACTS_EVM.verdict);
    });

    it('takes its flag count from the EVM fact set', () => {
      expect(MOCK_SECURITY_FLAG_COUNT).toBe(MOCK_SECURITY_FACTS_EVM.flagCount);
    });
  });

  // Both chains now render the same rows, so this fixture no longer previews a
  // different list. It has to stay different in the ways the live API is.
  describe('the Solana fixture', () => {
    it('has no fee data, matching the live response', () => {
      expect(MOCK_SECURITY_FACTS_SOLANA.trading).toBeNull();
    });

    it('has no creation date, matching the live response', () => {
      expect(MOCK_SECURITY_FACTS_SOLANA.origin.created).toBeNull();
    });

    // Named rather than counted: the row has to be one the tab actually
    // renders, so that leaving it out puts a dash on screen instead of quietly
    // shortening the list.
    it('leaves a rendered contract check unresolved so the dash appears', () => {
      expect(SECURITY_CONTRACT_CHECKS).toContain(
        ContractCheckKey.ContractVerified,
      );
      expect(
        MOCK_SECURITY_FACTS_SOLANA.checks[ContractCheckKey.ContractVerified],
      ).toBeUndefined();
    });
  });

  describe('the EVM fixture', () => {
    it('leaves primary pool null so the dash renders on screen', () => {
      expect(MOCK_SECURITY_FACTS_EVM.liquidity.primaryPool).toBeNull();
    });

    // The two-phone-screen limit is a pass/fail acceptance row, and the real
    // payload is uglier than the prototype. Tidy mocks would make the size
    // check optimistic and hide the wrapping bugs it exists to find.
    it('carries full-sentence risk copy rather than a short tag', () => {
      expect(MOCK_SECURITY_FACTS_EVM.highRiskFlag?.length).toBeGreaterThan(40);
    });
  });
});
