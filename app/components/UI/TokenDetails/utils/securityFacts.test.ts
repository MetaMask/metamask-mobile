import { ContractCheckKey } from '../components/V1/SecurityTab/SecurityTab.types';
import {
  buildSecurityData,
  CBXRP_VERIFIED,
  ETHOS_WARNING,
  feature,
} from './__fixtures__/securityData';
import { deriveSecurityFacts, emptySecurityFacts } from './securityFacts';

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

  describe('holders', () => {
    it('sums the top ten and states the remainder', () => {
      const facts = deriveSecurityFacts(CBXRP_VERIFIED);

      expect(facts.holders).toStrictEqual({
        count: '12.9K',
        topTenPercentage: '18.4%',
        remainingPercentage: '81.6%',
        topTenFillPercentage: 18.4,
      });
    });

    it('dashes out rather than reporting zero when no holders came back', () => {
      const facts = deriveSecurityFacts(buildSecurityData());

      expect(facts.holders.topTenPercentage).toBeNull();
      expect(facts.holders.topTenFillPercentage).toBeNull();
    });

    it('caps a top ten that overshoots 100%', () => {
      const facts = deriveSecurityFacts(
        buildSecurityData({
          financialStats: {
            ...buildSecurityData().financialStats,
            topHolders: [
              {
                label: 'wallet',
                name: null,
                address: '0x1',
                holdingPercentage: 80,
              },
              {
                label: 'wallet',
                name: null,
                address: '0x2',
                holdingPercentage: 40,
              },
            ],
          },
        }),
      );

      expect(facts.holders.topTenPercentage).toBe('100.0%');
      expect(facts.holders.remainingPercentage).toBe('0.0%');
    });
  });

  describe('liquidity', () => {
    it('totals every market and names the deepest as primary', () => {
      const facts = deriveSecurityFacts(CBXRP_VERIFIED);

      expect(facts.liquidity.total).toBe('$680.0K');
      expect(facts.liquidity.primaryPool).toBe('Aerodrome \u00b7 CBXRP / WETH');
    });

    it('keeps zero locked liquidity as a reading rather than a dash', () => {
      const facts = deriveSecurityFacts(ETHOS_WARNING);

      expect(facts.liquidity.lpBurnedLocked).toBe('0.0%');
    });

    // Needs a market cap this payload does not carry (ASSETS-4056).
    it('leaves liquidity to market cap unresolved', () => {
      expect(
        deriveSecurityFacts(CBXRP_VERIFIED).liquidity.liquidityToMarketCap,
      ).toBeNull();
    });

    it('dashes the pool out when no markets came back', () => {
      expect(
        deriveSecurityFacts(ETHOS_WARNING).liquidity.primaryPool,
      ).toBeNull();
      expect(deriveSecurityFacts(ETHOS_WARNING).liquidity.total).toBeNull();
    });
  });

  describe('trading', () => {
    it('pairs the buy and sell fees', () => {
      expect(deriveSecurityFacts(CBXRP_VERIFIED).trading.buySellTax).toBe(
        '0% / 0%',
      );
    });

    // Solana returns every fee as null, which used to drop the whole section
    // and take the two rows Solana does populate with it.
    it('still reports volume flags when the chain has no fees', () => {
      const facts = deriveSecurityFacts(ETHOS_WARNING);

      expect(facts.trading.buySellTax).toBeNull();
      expect(facts.trading.volumeFlags).toBe('2 detected');
    });

    it('says none detected when no volume feature fired', () => {
      expect(deriveSecurityFacts(CBXRP_VERIFIED).trading.volumeFlags).toBe(
        'None detected',
      );
    });

    it('reports a centralized exchange listing', () => {
      const facts = deriveSecurityFacts(
        buildSecurityData({
          features: [feature('LISTED_ON_CENTRALIZED_EXCHANGE', 'Benign')],
        }),
      );

      expect(facts.trading.listedOnExchange).toBe('Yes');
    });
  });

  describe('origin', () => {
    // Formatted in UTC: the API sends midnight UTC, so device-local
    // formatting would show the previous day everywhere west of Greenwich.
    it('formats the creation date on the day the API meant', () => {
      expect(deriveSecurityFacts(CBXRP_VERIFIED).origin.created).toContain(
        '26',
      );
      expect(deriveSecurityFacts(CBXRP_VERIFIED).origin.created).toContain(
        '2026',
      );
    });

    it.each([['' as const], ['not-a-date']])(
      'dashes out for %p rather than rendering Invalid Date',
      (created) => {
        expect(
          deriveSecurityFacts(buildSecurityData({ created })).origin.created,
        ).toBeNull();
      },
    );
  });

  // Blockaid returns no scan timestamp, so the "checked N min ago" clause has
  // nothing behind it.
  it('leaves the scan age unresolved', () => {
    expect(deriveSecurityFacts(CBXRP_VERIFIED).checkedMinutesAgo).toBeNull();
  });

  it('resolves all four contract checks', () => {
    const facts = deriveSecurityFacts(CBXRP_VERIFIED);

    expect(facts.checks[ContractCheckKey.ContractVerified]?.outcome).toBe(
      'pass',
    );
    expect(facts.checks[ContractCheckKey.NoBlacklist]?.outcome).toBe('fail');
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
      expect(facts.holders.count).toBeNull();
      expect(facts.trading.volumeFlags).toBeNull();
      expect(facts.origin.created).toBeNull();
    },
  );
});
