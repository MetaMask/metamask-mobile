import type {
  TokenSecurityFeature,
  TokenSecurityFinancialStats,
} from '../types';
import {
  getFeatureTags,
  formatFeePercent,
  getTop10HoldingPct,
  formatCompactSupply,
} from './securityUtils';

describe('securityUtils', () => {
  describe('getFeatureTags', () => {
    const makeFeature = (featureId: string): TokenSecurityFeature =>
      ({ featureId }) as TokenSecurityFeature;

    describe('Low risk (Verified / Benign)', () => {
      it('returns positive tags for known positive feature IDs', () => {
        const features = [
          makeFeature('VERIFIED_CONTRACT'),
          makeFeature('HIGH_REPUTATION_TOKEN'),
        ];

        const { tags, remainingCount } = getFeatureTags(features, 'Verified');

        expect(tags).toEqual([
          { label: 'Verified Contract' },
          { label: 'High Reputation' },
        ]);
        expect(remainingCount).toBe(0);
      });

      it('ignores negative feature IDs when resultType is Verified', () => {
        const features = [
          makeFeature('RUGPULL'),
          makeFeature('VERIFIED_CONTRACT'),
        ];

        const { tags } = getFeatureTags(features, 'Verified');

        expect(tags).toEqual([{ label: 'Verified Contract' }]);
      });

      it('caps display at 4 positive tags with no remainingCount', () => {
        const features = [
          makeFeature('HIGH_REPUTATION_TOKEN'),
          makeFeature('LISTED_ON_CENTRALIZED_EXCHANGE'),
          makeFeature('VERIFIED_CONTRACT'),
          makeFeature('HIGH_TRADE_VOLUME'),
          makeFeature('UNKNOWN_EXTRA'),
        ].map((f) => f);

        const { tags, remainingCount } = getFeatureTags(features, 'Verified');

        expect(tags.length).toBeLessThanOrEqual(4);
        expect(remainingCount).toBe(0);
      });

      it('defaults to positive behaviour when resultType is undefined', () => {
        const features = [makeFeature('HIGH_REPUTATION_TOKEN')];

        const { tags } = getFeatureTags(features, undefined);

        expect(tags).toEqual([{ label: 'High Reputation' }]);
      });
    });

    describe('Medium risk (Warning / Spam)', () => {
      it('returns Warning-type negative tags for Warning resultType', () => {
        const features = [
          makeFeature('HONEYPOT'),
          makeFeature('AIRDROP_PATTERN'),
        ];

        const { tags, remainingCount } = getFeatureTags(features, 'Warning');

        expect(tags).toEqual([
          { label: 'Honeypot Risk' },
          { label: 'Suspicious Airdrop' },
        ]);
        expect(remainingCount).toBe(0);
      });

      it('returns Spam-type negative tags for Spam resultType', () => {
        const features = [makeFeature('IMPERSONATOR_HIGH_CONFIDENCE')];

        const { tags } = getFeatureTags(features, 'Spam');

        expect(tags).toEqual([{ label: 'Impersonator (High)' }]);
      });

      it('ignores Malicious features when resultType is Warning', () => {
        const features = [makeFeature('RUGPULL'), makeFeature('HONEYPOT')];

        const { tags } = getFeatureTags(features, 'Warning');

        expect(tags).toEqual([{ label: 'Honeypot Risk' }]);
      });

      it('caps display at 3 and returns correct remainingCount', () => {
        const features = [
          makeFeature('HONEYPOT'),
          makeFeature('AIRDROP_PATTERN'),
          makeFeature('INORGANIC_VOLUME'),
          makeFeature('DYNAMIC_ANALYSIS'),
          makeFeature('UNSTABLE_TOKEN_PRICE'),
        ];

        const { tags, remainingCount } = getFeatureTags(features, 'Warning');

        expect(tags).toHaveLength(3);
        expect(remainingCount).toBe(2);
      });
    });

    describe('High risk (Malicious)', () => {
      it('returns Malicious-type negative tags', () => {
        const features = [
          makeFeature('RUGPULL'),
          makeFeature('KNOWN_MALICIOUS'),
        ];

        const { tags, remainingCount } = getFeatureTags(features, 'Malicious');

        expect(tags).toEqual([
          { label: 'Rugpull Risk' },
          { label: 'Known Malicious' },
        ]);
        expect(remainingCount).toBe(0);
      });

      it('ignores Warning features when resultType is Malicious', () => {
        const features = [makeFeature('HONEYPOT'), makeFeature('RUGPULL')];

        const { tags } = getFeatureTags(features, 'Malicious');

        expect(tags).toEqual([{ label: 'Rugpull Risk' }]);
      });

      it('caps display at 3 and returns correct remainingCount', () => {
        const features = [
          makeFeature('RUGPULL'),
          makeFeature('KNOWN_MALICIOUS'),
          makeFeature('UNSELLABLE_TOKEN'),
          makeFeature('SANCTIONED_CREATOR'),
          makeFeature('POST_DUMP'),
          makeFeature('TOKEN_BACKDOOR'),
        ];

        const { tags, remainingCount } = getFeatureTags(features, 'Malicious');

        expect(tags).toHaveLength(3);
        expect(remainingCount).toBe(3);
      });
    });

    it('ignores unknown feature IDs in all modes', () => {
      const features = [makeFeature('UNKNOWN_FEATURE')];

      expect(getFeatureTags(features, 'Verified').tags).toEqual([]);
      expect(getFeatureTags(features, 'Malicious').tags).toEqual([]);
      expect(getFeatureTags(features, 'Warning').tags).toEqual([]);
    });
  });

  describe('formatFeePercent', () => {
    it('formats a number as a percentage with one decimal', () => {
      expect(formatFeePercent(5)).toBe('5.0%');
    });

    it('formats zero', () => {
      expect(formatFeePercent(0)).toBe('0.0%');
    });

    it('returns N/A for null', () => {
      expect(formatFeePercent(null)).toBe('N/A');
    });

    it('returns N/A for undefined', () => {
      expect(formatFeePercent(undefined)).toBe('N/A');
    });
  });

  describe('getTop10HoldingPct', () => {
    it('sums holder percentages', () => {
      const stats = {
        topHolders: [
          { holdingPercentage: 10 },
          { holdingPercentage: 15 },
          { holdingPercentage: 5 },
        ],
      } as TokenSecurityFinancialStats;

      expect(getTop10HoldingPct(stats)).toBe(30);
    });

    it('caps at 100', () => {
      const stats = {
        topHolders: [{ holdingPercentage: 60 }, { holdingPercentage: 50 }],
      } as TokenSecurityFinancialStats;

      expect(getTop10HoldingPct(stats)).toBe(100);
    });

    it('treats missing holdingPercentage as 0', () => {
      const stats = {
        topHolders: [
          { holdingPercentage: 10 },
          { holdingPercentage: undefined },
        ],
      } as unknown as TokenSecurityFinancialStats;

      expect(getTop10HoldingPct(stats)).toBe(10);
    });

    it('returns null when no topHolders', () => {
      expect(
        getTop10HoldingPct({
          topHolders: [],
        } as unknown as TokenSecurityFinancialStats),
      ).toBeNull();
    });

    it('returns null for null stats', () => {
      expect(getTop10HoldingPct(null)).toBeNull();
    });

    it('returns null for undefined stats', () => {
      expect(getTop10HoldingPct(undefined)).toBeNull();
    });
  });

  describe('formatCompactSupply', () => {
    it('returns N/A for null', () => {
      expect(formatCompactSupply(null)).toBe('N/A');
    });

    it('returns N/A for undefined', () => {
      expect(formatCompactSupply(undefined)).toBe('N/A');
    });

    it('formats quadrillions', () => {
      expect(formatCompactSupply(2e15)).toBe('2.00Q');
    });

    it('formats trillions', () => {
      expect(formatCompactSupply(1.5e12)).toBe('1.50T');
    });

    it('formats billions', () => {
      expect(formatCompactSupply(10e9)).toBe('10.00B');
    });

    it('formats millions', () => {
      expect(formatCompactSupply(5_000_000)).toBe('5.00M');
    });

    it('formats thousands', () => {
      expect(formatCompactSupply(1_500)).toBe('1.50K');
    });

    it('formats small values as integers', () => {
      expect(formatCompactSupply(42)).toBe('42');
    });

    it('adjusts by decimals when provided', () => {
      const rawSupply = 1.6e25;
      const result = formatCompactSupply(rawSupply, 18);
      expect(result).toBe('16.00M');
    });

    it('does not adjust when decimals is 0', () => {
      expect(formatCompactSupply(5_000_000, 0)).toBe('5.00M');
    });
  });
});
