import { ContractCheckKey } from '../components/V1/SecurityTab/SecurityTab.types';
import {
  buildSecurityData,
  CBXRP_VERIFIED,
  ETHOS_WARNING,
} from './__fixtures__/securityData';
import {
  deriveSecurityFacts,
  emptySecurityFacts,
  sumTopTenPercentage,
} from './securityFacts';

describe('deriveSecurityFacts', () => {
  describe('verdict', () => {
    it.each([
      ['Verified', 'screened'],
      ['Benign', 'screened'],
      ['Warning', 'medium_risk'],
      ['Spam', 'medium_risk'],
      ['Malicious', 'high_risk'],
    ])('maps %s to %s', (resultType, verdict) => {
      expect(
        deriveSecurityFacts(buildSecurityData({ resultType })).verdict,
      ).toBe(verdict);
    });

    // The API gives no guarantee the five documented values are the only ones
    // it will send, and the safe reading of a word we do not know is that
    // nobody screened the token.
    it.each(['', 'Suspicious', 'LOW'])(
      'falls back to unscreened for %p',
      (resultType) => {
        expect(
          deriveSecurityFacts(buildSecurityData({ resultType })).verdict,
        ).toBe('unscreened');
      },
    );
  });

  describe('flags and reasons', () => {
    it('counts the flags it lists', () => {
      const facts = deriveSecurityFacts(ETHOS_WARNING);

      expect(facts.flagCount).toBe(6);
      expect(facts.reasons).toHaveLength(6);
    });

    // The finding that drove the whole design: a Warning token can pass every
    // contract check, because the flags are about trading behaviour rather
    // than the contract.
    it('reports flags on a token whose contract checks all pass', () => {
      const facts = deriveSecurityFacts(ETHOS_WARNING);
      const outcomes = Object.values(facts.checks).map(
        (check) => check.outcome,
      );

      expect(facts.flagCount).toBe(6);
      expect(outcomes).not.toContain('fail');
    });
  });

  it('resolves all four contract checks', () => {
    const facts = deriveSecurityFacts(CBXRP_VERIFIED);

    expect(facts.checks[ContractCheckKey.ContractVerified]?.outcome).toBe(
      'pass',
    );
    expect(facts.checks[ContractCheckKey.NoBlacklist]?.outcome).toBe('fail');
  });

  // Blockaid returns no scan timestamp, so the "checked N min ago" clause has
  // nothing behind it.
  it('leaves the scan age unresolved', () => {
    expect(deriveSecurityFacts(CBXRP_VERIFIED).checkedMinutesAgo).toBeNull();
  });

  // The one figure here rather than in `useTokenStats`, because the holders
  // bar needs it raw to size its fill.
  describe('topTenPercentage', () => {
    it('carries the top-ten share as a raw number', () => {
      expect(deriveSecurityFacts(CBXRP_VERIFIED).topTenPercentage).toBe(18.4);
    });

    it('leaves it unresolved rather than reporting zero concentration', () => {
      expect(
        deriveSecurityFacts(buildSecurityData()).topTenPercentage,
      ).toBeNull();
    });
  });

  // Everything else the payload carries — holders, liquidity, tax, pools,
  // the creation date — is a stat now, derived once in `useTokenStats` so the
  // stat bar and the Security tab cannot report different figures for it.
  it('derives no statistics of its own', () => {
    expect(Object.keys(deriveSecurityFacts(CBXRP_VERIFIED)).sort()).toEqual([
      'checkedMinutesAgo',
      'checks',
      'flagCount',
      'reasons',
      'topTenPercentage',
      'verdict',
    ]);
  });
});

describe('sumTopTenPercentage', () => {
  it('sums the top ten holders', () => {
    expect(sumTopTenPercentage(CBXRP_VERIFIED.financialStats)).toBe(18.4);
  });

  // The API can report shares that add past 100, and a bar wider than its
  // track or a negative remainder is worse than a slightly wrong number.
  it('caps a top ten that overshoots 100%', () => {
    const financialStats = {
      ...buildSecurityData().financialStats,
      topHolders: [
        { label: 'wallet', name: null, address: '0x1', holdingPercentage: 80 },
        { label: 'wallet', name: null, address: '0x2', holdingPercentage: 40 },
      ],
    };

    expect(sumTopTenPercentage(financialStats)).toBe(100);
  });

  it.each([null, undefined])('returns null for %p', (financialStats) => {
    expect(sumTopTenPercentage(financialStats)).toBeNull();
  });
});

describe('emptySecurityFacts', () => {
  it.each(['pending', 'unscreened'] as const)(
    'carries the %s verdict and nothing else',
    (verdict) => {
      const facts = emptySecurityFacts(verdict);

      expect(facts.verdict).toBe(verdict);
      expect(facts.reasons).toStrictEqual([]);
      expect(facts.checks).toStrictEqual({});
      expect(facts.topTenPercentage).toBeNull();
      expect(facts.checkedMinutesAgo).toBeNull();
    },
  );
});
