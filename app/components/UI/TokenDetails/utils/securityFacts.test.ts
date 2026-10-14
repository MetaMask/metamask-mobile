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
  CONTRACT_CHECK_FEATURE_IDS,
  deriveSecurityFacts,
  emptySecurityFacts,
  resolveAdditionalChecks,
  resolveSecurityChecks,
  resolveVerdict,
  sumTopTenPercentage,
} from './securityFacts';

describe('deriveSecurityFacts', () => {
  describe('verdict', () => {
    // Reached only when nothing malicious and nothing warning was found, which
    // an empty payload satisfies.
    it.each([
      ['Verified', 'screened'],
      ['Benign', 'screened'],
      ['Warning', 'medium_risk'],
      ['Spam', 'medium_risk'],
      ['Malicious', 'high_risk'],
    ])(
      'falls back to %s -> %s when nothing was detected',
      (resultType, verdict) => {
        expect(
          deriveSecurityFacts(buildSecurityData({ resultType })).verdict,
        ).toBe(verdict);
      },
    );

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

  describe('risks', () => {
    // Six warning features, but `WASH_TRADING` and `FAKE_VOLUME` share a row
    // — which is the whole reason the count is rows rather than features.
    it('collapses six warning features onto five rows', () => {
      const facts = deriveSecurityFacts(ETHOS_WARNING);

      expect(facts.risks.map((risk) => risk.id)).toStrictEqual([
        'concentrated_ownership',
        'wash_trading',
        'sniped_at_launch',
        'suspicious_creator',
        'liquidity_withdrawal_risk',
      ]);
    });

    // The finding that drove the whole design: a Warning token can pass every
    // contract check, because the flags are about trading behaviour rather
    // than the contract.
    it('reports risks on a token whose contract checks all pass', () => {
      const facts = deriveSecurityFacts(ETHOS_WARNING);

      expect(facts.risks).toHaveLength(5);
      // `is_mintable` is left out: its `fail` means "No", not bad news, and
      // this token does not report a mint capability either way.
      for (const checkKey of [
        ContractCheckKey.NoHoneypot,
        ContractCheckKey.Renounced,
        ContractCheckKey.NoBlacklist,
      ]) {
        expect(facts.checks[checkKey]?.outcome).toBe('pass');
      }
    });

    it('finds nothing on a verified token whose features are all Info', () => {
      expect(deriveSecurityFacts(CBXRP_VERIFIED).risks).toStrictEqual([]);
    });
  });

  it('resolves all five contract checks', () => {
    const facts = deriveSecurityFacts(CBXRP_VERIFIED);

    expect(facts.checks[ContractCheckKey.ContractVerified]?.outcome).toBe(
      'pass',
    );
    expect(facts.checks[ContractCheckKey.NoBlacklist]?.outcome).toBe('fail');
    expect(facts.checks[ContractCheckKey.IsMintable]?.outcome).toBe('pass');
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
  //
  // No count either: the pill and the banner both read `risks.length`, so a
  // stored number would be one more thing to keep in step for nothing.
  it('derives no statistics and no count of its own', () => {
    expect(Object.keys(deriveSecurityFacts(CBXRP_VERIFIED)).sort()).toEqual([
      'checks',
      'risks',
      'topTenPercentage',
      'verdict',
    ]);
  });
});

describe('resolveVerdict', () => {
  const verdictFor = (
    features: Parameters<typeof resolveAdditionalChecks>[0],
    resultType = 'Verified',
  ) => {
    const securityData = buildSecurityData({
      resultType,
      features: [...features],
    });
    return resolveVerdict(securityData, resolveAdditionalChecks(features));
  };

  it('reads high risk off a malicious row', () => {
    expect(verdictFor([feature('SANCTIONED_CREATOR', 'Malicious')])).toBe(
      'high_risk',
    );
  });

  // The case the two-input verdict exists for. A detected honeypot produces no
  // row — the Contract section already shows it — so a verdict read from the
  // rows alone would call this token screened.
  it('reads high risk off a detected honeypot that produces no row', () => {
    const features = [feature('HONEYPOT', 'Malicious')];

    expect(resolveAdditionalChecks(features)).toStrictEqual([]);
    expect(verdictFor(features)).toBe('high_risk');
  });

  // Read literally off the spec the two branches would be exclusive, and this
  // token would report "1 flag" while carrying a honeypot.
  it('prefers high risk when a honeypot sits beside a warning row', () => {
    const features = [
      feature('HONEYPOT', 'Malicious'),
      feature('SNIPE_AT_MINT', 'Warning'),
    ];

    expect(verdictFor(features)).toBe('high_risk');
  });

  it('reads medium risk when every row is a warning', () => {
    expect(
      verdictFor([
        feature('SNIPE_AT_MINT', 'Warning'),
        feature('WASH_TRADING', 'Warning'),
      ]),
    ).toBe('medium_risk');
  });

  // The shape that proves `Info` cannot promote a verdict: five capability
  // signals, every one of them typed the same way as the good news beside it.
  it('reads screened off the Coinbase Wrapped XRP shape', () => {
    expect(resolveVerdict(CBXRP_VERIFIED, [])).toBe('screened');
  });

  it('reads unscreened for an unrecognised resultType with no findings', () => {
    expect(verdictFor([], 'Suspicious')).toBe('unscreened');
  });

  /**
   * The regression that matters most.
   *
   * `renounced` fails on silence, so a token that says nothing about ownership
   * shows a red cross on that row. The verdict must not follow it: it reads
   * types off features that are *present*, and silence carries no type.
   */
  it('stays screened when a check fails on silence rather than a signal', () => {
    const features = [feature('VERIFIED_CONTRACT', 'Benign')];
    const checks = resolveSecurityChecks(features);

    expect(checks[ContractCheckKey.Renounced].outcome).toBe('fail');
    expect(verdictFor(features)).toBe('screened');
  });
});

describe('resolveAdditionalChecks', () => {
  it('collapses sibling featureIds onto one row', () => {
    const risks = resolveAdditionalChecks([
      feature('HIGH_BUY_FEE', 'Malicious'),
      feature('HIGH_SELL_FEE', 'Malicious'),
      feature('HIGH_TRANSFER_FEE', 'Malicious'),
    ]);

    expect(risks).toHaveLength(1);
    expect(risks[0].id).toBe('high_token_fees');
    expect(risks[0].featureIds).toStrictEqual([
      'HIGH_TRANSFER_FEE',
      'HIGH_BUY_FEE',
      'HIGH_SELL_FEE',
    ]);
  });

  // Rows render in the sheet's order, not the order the API happened to list
  // its features in, so the screen reads the same for every token.
  it('orders rows as the sheet does regardless of the payload order', () => {
    const risks = resolveAdditionalChecks([
      feature('SANCTIONED_CREATOR', 'Malicious'),
      feature('EXIT_SCAM_RISK', 'Warning'),
      feature('KNOWN_MALICIOUS', 'Malicious'),
    ]);

    expect(risks.map((risk) => risk.id)).toStrictEqual([
      'known_malicious',
      'exit_scam_risk',
      'sanctioned_creator',
    ]);
  });

  // `Info` is the bucket Blockaid uses for "the contract can do this",
  // regardless of whether that is good or bad news, so listing it would offer
  // "can blacklist" as something we found wrong with a clean token.
  it.each(['Benign', 'Info'])('excludes features typed %s', (type) => {
    expect(
      resolveAdditionalChecks([feature('SNIPE_AT_MINT', type)]),
    ).toStrictEqual([]);
  });

  it('folds Spam in with the warnings', () => {
    const risks = resolveAdditionalChecks([feature('SPAM_TEXT', 'Spam')]);

    expect(risks).toHaveLength(1);
    expect(risks[0].id).toBe('suspicious_airdrop');
  });

  // A detected honeypot already shows as a red cross on "No honeypot", so
  // repeating it here would state the same fact twice and count it twice.
  it.each([...CONTRACT_CHECK_FEATURE_IDS])(
    'drops %s, which a contract check already shows',
    (featureId) => {
      expect(
        resolveAdditionalChecks([feature(featureId, 'Malicious')]),
      ).toStrictEqual([]);
    },
  );

  // The row's colour is the sheet's decision, not Blockaid's. The same id has
  // been observed arriving with different types on different chains, so a
  // severity read from the payload would repaint the row per chain.
  it.each(['Warning', 'Spam', 'Malicious'])(
    'keeps a row severity fixed when its feature arrives typed %s',
    (type) => {
      const risks = resolveAdditionalChecks([feature('EXIT_SCAM_RISK', type)]);

      expect(risks[0].severity).toBe('warning');
    },
  );

  it('localizes a mapped row title and description', () => {
    const risks = resolveAdditionalChecks([
      feature('SANCTIONED_CREATOR', 'Malicious'),
    ]);

    expect(risks[0].title).toBe('Sanctioned creator');
    expect(risks[0].description).toBe(
      "The token's creator is sanctioned by a government or financial institution.",
    );
  });

  describe('the default row', () => {
    it("carries Blockaid's own description under a generic title", () => {
      const risks = resolveAdditionalChecks([
        feature('INAPPROPRIATE_CONTENT', 'Warning'),
      ]);

      expect(risks[0]).toStrictEqual({
        id: 'INAPPROPRIATE_CONTENT',
        severity: 'warning',
        title: 'Risk detected',
        description: 'INAPPROPRIATE_CONTENT description',
        featureIds: ['INAPPROPRIATE_CONTENT'],
      });
    });

    // The one place a severity is read from the payload, because it is the one
    // place the sheet names no severity and a per-feature type is available.
    // Hardcoding it malicious would let any id Blockaid adds promote a token
    // to high risk before anyone has looked at it.
    it.each([
      ['Malicious', 'malicious'],
      ['Warning', 'warning'],
      ['Spam', 'warning'],
    ])('clamps a %s feature to %s', (type, severity) => {
      const risks = resolveAdditionalChecks([feature('BRAND_NEW_ID', type)]);

      expect(risks[0].severity).toBe(severity);
    });

    // Keyed by featureId rather than a shared `default`, so two unmapped
    // findings do not collide on one React key.
    it('gives each unmapped feature its own row', () => {
      const risks = resolveAdditionalChecks([
        feature('INORGANIC_VOLUME', 'Warning'),
        feature('HEAVILY_SNIPED', 'Warning'),
      ]);

      expect(risks.map((risk) => risk.id)).toStrictEqual([
        'INORGANIC_VOLUME',
        'HEAVILY_SNIPED',
      ]);
    });
  });

  it('returns nothing for an empty payload', () => {
    expect(resolveAdditionalChecks([])).toStrictEqual([]);
  });

  /**
   * One representative featureId per row of the sheet, restated here rather
   * than read off the table.
   *
   * The duplication is the point: the table's copy is reached by interpolating
   * the row id, so nothing fails to compile when a row ships without copy.
   * Driving every row through the resolver is what proves all 28 strings exist.
   */
  it('resolves copy for all fourteen rows of the sheet', () => {
    const oneIdPerRow = [
      'KNOWN_MALICIOUS',
      'TOKEN_BACKDOOR',
      'IMPERSONATOR',
      'RUGPULL',
      'EXIT_SCAM_RISK',
      'HIGH_BUY_FEE',
      'UNSTABLE_TOKEN_PRICE',
      'HIGH_DEV_PERCENTAGE',
      'WASH_TRADING',
      'SNIPE_AT_MINT',
      'LOW_REPUTATION_CREATOR',
      'SANCTIONED_CREATOR',
      'AIRDROP_PATTERN',
      'INSUFFICIENT_LOCKED_LIQUIDITY',
    ];

    const risks = resolveAdditionalChecks(
      oneIdPerRow.map((featureId) => feature(featureId, 'Warning')),
    );

    expect(risks).toHaveLength(oneIdPerRow.length);
    for (const risk of risks) {
      // An unresolved key comes back as `[missing "en.<key>" translation]`.
      expect(risk.title).not.toMatch(/\[missing/iu);
      expect(risk.description).not.toMatch(/\[missing/iu);
    }
  });
});

describe('resolveSecurityChecks', () => {
  it('resolves every contract check for any payload', () => {
    const checks = resolveSecurityChecks([]);

    expect(Object.keys(checks)).toStrictEqual([...CONTRACT_CHECK_KEYS]);
  });

  describe('no honeypot', () => {
    // Three ids, because a token that cannot be sold reads the same to the
    // holder however the chain expresses it.
    it.each(['HONEYPOT', 'UNSELLABLE_TOKEN', 'FREEZE_INSTRUCTION_TRIGGERED'])(
      'fails when %s is present',
      (featureId) => {
        const checks = resolveSecurityChecks([feature(featureId, 'Malicious')]);

        expect(checks[ContractCheckKey.NoHoneypot]).toStrictEqual({
          outcome: 'fail',
          value: 'Honeypot detected',
        });
      },
    );

    it('passes when none of them is present', () => {
      const checks = resolveSecurityChecks([]);

      expect(checks[ContractCheckKey.NoHoneypot]).toStrictEqual({
        outcome: 'pass',
        value: 'Honeypot not detected',
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

    it('fails on OWNERSHIP_NOT_RENOUNCED', () => {
      const checks = resolveSecurityChecks([
        feature('OWNERSHIP_NOT_RENOUNCED', 'Warning'),
      ]);

      expect(checks[ContractCheckKey.Renounced]).toStrictEqual({
        outcome: 'fail',
        value: 'Not renounced',
      });
    });

    // Still fails closed on silence: the worst case is understating a good
    // token rather than reassuring about a bad one. `resolveVerdict` is what
    // stops that understatement reaching the pill.
    it('fails rather than dashes when neither feature is present', () => {
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

  // The one check whose pass means the capability is present, which is why its
  // row carries no tick — see `resolveCheckPresentation`.
  describe('is mintable', () => {
    it('answers yes when IS_MINTABLE is present', () => {
      const checks = resolveSecurityChecks([feature('IS_MINTABLE', 'Info')]);

      expect(checks[ContractCheckKey.IsMintable]).toStrictEqual({
        outcome: 'pass',
        value: 'Yes',
      });
    });

    it('answers no when it is absent', () => {
      const checks = resolveSecurityChecks([]);

      expect(checks[ContractCheckKey.IsMintable]).toStrictEqual({
        outcome: 'fail',
        value: 'No',
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
      expect(facts.risks).toStrictEqual([]);
      expect(facts.checks).toStrictEqual({});
      expect(facts.topTenPercentage).toBeNull();
    },
  );
});
