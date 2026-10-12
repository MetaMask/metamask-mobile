import {
  CBXRP_VERIFIED,
  ETHOS_WARNING,
  feature,
} from './__fixtures__/securityData';
import { CONTRACT_CHECK_FEATURE_IDS } from './securityFacts';
import { countSecurityFlags, resolveSecurityReasons } from './securityReasons';

describe('resolveSecurityReasons', () => {
  it('lists the Benign features behind a screened verdict', () => {
    const reasons = resolveSecurityReasons(CBXRP_VERIFIED.features, 'screened');

    expect(reasons.map((reason) => reason.featureId)).toStrictEqual([
      'HIGH_TRADE_VOLUME',
      'HIGH_REPUTATION_TOKEN',
      'SIGNIFICANT_USD_RESERVES',
      'VERIFIED_CONTRACT',
    ]);
  });

  // The whole reason `Info` is excluded. Coinbase Wrapped XRP is `Verified`
  // and mintable and blacklistable, all three typed the same way, so trusting
  // `Info` would offer "can blacklist" as a reason the token is safe.
  it('never offers a capability flag as a reason a token is low risk', () => {
    const reasons = resolveSecurityReasons(CBXRP_VERIFIED.features, 'screened');
    const ids = reasons.map((reason) => reason.featureId);

    expect(ids).not.toContain('CAN_BLACKLIST');
    expect(ids).not.toContain('IS_MINTABLE');
    expect(ids).not.toContain('PROXY_CONTRACT');
    expect(ids).not.toContain('EXTERNAL_FUNCTIONS');
  });

  it('lists the Warning features behind a medium risk verdict', () => {
    const reasons = resolveSecurityReasons(
      ETHOS_WARNING.features,
      'medium_risk',
    );

    expect(reasons.map((reason) => reason.featureId)).toStrictEqual([
      'HIGH_DEV_PERCENTAGE',
      'LOW_REPUTATION_CREATOR',
      'WASH_TRADING',
      'SNIPE_AT_MINT',
      'INSUFFICIENT_LOCKED_LIQUIDITY',
      'FAKE_VOLUME',
    ]);
  });

  it('includes Spam alongside Warning, since both share the pill', () => {
    const reasons = resolveSecurityReasons(
      [
        feature('WASH_TRADING', 'Warning'),
        feature('IMPERSONATOR_HIGH_CONFIDENCE', 'Spam'),
      ],
      'medium_risk',
    );

    expect(reasons).toHaveLength(2);
  });

  it('lists only the Malicious features behind a high risk verdict', () => {
    const reasons = resolveSecurityReasons(
      [
        feature('KNOWN_MALICIOUS', 'Malicious'),
        feature('WASH_TRADING', 'Warning'),
        feature('HIGH_TRADE_VOLUME', 'Benign'),
      ],
      'high_risk',
    );

    expect(reasons.map((reason) => reason.featureId)).toStrictEqual([
      'KNOWN_MALICIOUS',
    ]);
  });

  it.each(['unscreened', 'pending'] as const)(
    'has nothing to explain for %s',
    (verdict) => {
      expect(
        resolveSecurityReasons(CBXRP_VERIFIED.features, verdict),
      ).toStrictEqual([]);
    },
  );

  // Blockaid ships ids faster than the label map grows — 13 of 35 seen across
  // 200 tokens were unknown — so this is the ordinary path, not an edge case.
  it('drops a feature it has no label for rather than showing raw English', () => {
    const reasons = resolveSecurityReasons(
      [
        feature('A_FEATURE_FROM_THE_FUTURE', 'Benign'),
        feature('HIGH_TRADE_VOLUME', 'Benign'),
      ],
      'screened',
    );

    expect(reasons.map((reason) => reason.featureId)).toStrictEqual([
      'HIGH_TRADE_VOLUME',
    ]);
  });

  // An id worth failing a contract check over is worth naming. Without this,
  // `UNVERIFIED_CONTRACT` shipped with a rule and no label: the contract row
  // read "No" while the section explaining why said nothing, and the flag
  // count — being the length of that section — came up short too.
  it.each(CONTRACT_CHECK_FEATURE_IDS)(
    'has a reason label for %s, which the contract checks read',
    (featureId) => {
      const reasons = resolveSecurityReasons(
        [feature(featureId, 'Warning')],
        'medium_risk',
      );

      expect(reasons).toHaveLength(1);
    },
  );

  it('gives every reason a translated label', () => {
    const reasons = resolveSecurityReasons(
      ETHOS_WARNING.features,
      'medium_risk',
    );

    for (const reason of reasons) {
      expect(reason.label).not.toBe('');
      expect(reason.label).not.toContain('token_details_v1');
      expect(reason.label).not.toContain('security_trust');
    }
  });
});

describe('countSecurityFlags', () => {
  it('counts the same features the medium risk list shows', () => {
    const reasons = resolveSecurityReasons(
      ETHOS_WARNING.features,
      'medium_risk',
    );

    expect(countSecurityFlags(ETHOS_WARNING.features)).toBe(reasons.length);
  });

  // The pill must never promise a row the list cannot draw, so an id with no
  // label leaves both. This is the case the old parallel filter got wrong: it
  // counted on `type` alone and would have reported 2 against a 1-row list.
  it('ignores a flag it has no label for, as the list does', () => {
    const features = [
      feature('WASH_TRADING', 'Warning'),
      feature('A_FEATURE_FROM_THE_FUTURE', 'Warning'),
    ];

    expect(countSecurityFlags(features)).toBe(1);
  });

  it('counts Spam alongside Warning', () => {
    const features = [
      feature('WASH_TRADING', 'Warning'),
      feature('IMPERSONATOR_HIGH_CONFIDENCE', 'Spam'),
    ];

    expect(countSecurityFlags(features)).toBe(2);
  });

  // Counting everything that is not Benign would call `OWNERSHIP_RENOUNCED` a
  // flag on EVM, where that good signal arrives typed `Info`.
  it('does not count capability flags', () => {
    expect(countSecurityFlags(CBXRP_VERIFIED.features)).toBe(0);
  });

  it('is zero for a payload with no features', () => {
    expect(countSecurityFlags([])).toBe(0);
  });
});
