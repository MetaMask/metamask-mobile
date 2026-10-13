import {
  CONTRACT_CHECK_KEYS,
  ContractCheckKey,
} from '../components/V1/SecurityTab/SecurityTab.types';
import {
  buildSecurityData,
  CBXRP_VERIFIED,
  ETHOS_WARNING,
  feature,
} from './__fixtures__/securityData';
import {
  deriveSecurityFacts,
  emptySecurityFacts,
  resolveSecurityChecks,
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
  // stat bar and the Security tab cannot report different figures for it. The
  // age of the data is not here either: that is provenance of the request, and
  // a ticking value on `facts` would re-render the tab every tick.
  it('derives no statistics of its own', () => {
    expect(Object.keys(deriveSecurityFacts(CBXRP_VERIFIED)).sort()).toEqual([
      'checks',
      'flagCount',
      'reasons',
      'topTenPercentage',
      'verdict',
    ]);
  });
});

describe('resolveSecurityChecks', () => {
  it('resolves every contract check for any payload', () => {
    const checks = resolveSecurityChecks([]);

    expect(Object.keys(checks)).toStrictEqual([...CONTRACT_CHECK_KEYS]);
  });

  describe('no honeypot', () => {
    it('fails when HONEYPOT is present', () => {
      const checks = resolveSecurityChecks([feature('HONEYPOT', 'Warning')]);

      expect(checks[ContractCheckKey.NoHoneypot]).toStrictEqual({
        outcome: 'fail',
        value: 'Sells may fail',
      });
    });

    it('passes when HONEYPOT is absent', () => {
      const checks = resolveSecurityChecks([]);

      expect(checks[ContractCheckKey.NoHoneypot]).toStrictEqual({
        outcome: 'pass',
        value: 'Sells work',
      });
    });
  });

  describe('contract verified', () => {
    it('passes on VERIFIED_CONTRACT', () => {
      const checks = resolveSecurityChecks([
        feature('VERIFIED_CONTRACT', 'Benign'),
      ]);

      expect(checks[ContractCheckKey.ContractVerified]).toStrictEqual({
        outcome: 'pass',
        value: 'Yes',
      });
    });

    it('fails on UNVERIFIED_CONTRACT', () => {
      const checks = resolveSecurityChecks([
        feature('UNVERIFIED_CONTRACT', 'Info'),
      ]);

      expect(checks[ContractCheckKey.ContractVerified]).toStrictEqual({
        outcome: 'fail',
        value: 'No',
      });
    });

    // The only check Blockaid covers from both sides, so it is the only one
    // that can say "we do not know" instead of guessing. Solana sends neither.
    it('is unknown with a null value when neither feature arrives', () => {
      const checks = resolveSecurityChecks([]);

      expect(checks[ContractCheckKey.ContractVerified]).toStrictEqual({
        outcome: 'unknown',
        value: null,
      });
    });

    it('prefers the failure when both features arrive', () => {
      const checks = resolveSecurityChecks([
        feature('VERIFIED_CONTRACT', 'Benign'),
        feature('UNVERIFIED_CONTRACT', 'Info'),
      ]);

      expect(checks[ContractCheckKey.ContractVerified].outcome).toBe('fail');
    });
  });

  describe('renounced', () => {
    it('passes on OWNERSHIP_RENOUNCED', () => {
      const checks = resolveSecurityChecks([
        feature('OWNERSHIP_RENOUNCED', 'Benign'),
      ]);

      expect(checks[ContractCheckKey.Renounced]).toStrictEqual({
        outcome: 'pass',
        value: 'Renounced',
      });
    });

    // The one check that fails closed: silence means not renounced, so the
    // worst case is understating a good token rather than reassuring about a
    // bad one.
    it('fails rather than dashes when the feature is absent', () => {
      const checks = resolveSecurityChecks([]);

      expect(checks[ContractCheckKey.Renounced]).toStrictEqual({
        outcome: 'fail',
        value: 'Not renounced',
      });
    });

    it('passes regardless of the type the API gave the feature', () => {
      const asInfo = resolveSecurityChecks([
        feature('OWNERSHIP_RENOUNCED', 'Info'),
      ]);

      expect(asInfo[ContractCheckKey.Renounced].outcome).toBe('pass');
    });
  });

  describe('no blacklist', () => {
    it('fails when CAN_BLACKLIST is present', () => {
      const checks = resolveSecurityChecks([feature('CAN_BLACKLIST', 'Info')]);

      expect(checks[ContractCheckKey.NoBlacklist]).toStrictEqual({
        outcome: 'fail',
        value: 'Control detected',
      });
    });

    it('passes when CAN_BLACKLIST is absent', () => {
      const checks = resolveSecurityChecks([]);

      expect(checks[ContractCheckKey.NoBlacklist]).toStrictEqual({
        outcome: 'pass',
        value: 'No controls',
      });
    });
  });

  // The API types the same featureId differently per chain, so a rule that
  // consulted `type` would read the same on-chain fact two ways.
  it('ignores the feature type entirely', () => {
    const asWarning = resolveSecurityChecks([
      feature('CAN_BLACKLIST', 'Warning'),
    ]);
    const asInfo = resolveSecurityChecks([feature('CAN_BLACKLIST', 'Info')]);

    expect(asWarning).toStrictEqual(asInfo);
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
      expect(facts.flagCount).toBe(0);
    },
  );
});
