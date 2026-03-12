import {
  RiskLevel,
  type TokenSecurityFeature,
  type TokenSecurityFinancialStats,
} from '../types';
import {
  getRiskLevel,
  getFeatureTags,
  formatFeePercent,
  getTop10HoldingPct,
  getTotalLiquidityUSD,
  formatCompactUSD,
  formatCompactSupply,
  getWhaleConcentrationRisk,
  hasFeature,
  getSmartContractRisk,
  POSITIVE_FEATURE_LABELS,
} from './securityUtils';

describe('securityUtils', () => {
  describe('getRiskLevel', () => {
    it('returns Low for Verified', () => {
      expect(getRiskLevel('Verified')).toBe(RiskLevel.Low);
    });

    it('returns Low for Benign', () => {
      expect(getRiskLevel('Benign')).toBe(RiskLevel.Low);
    });

    it('returns Medium for Warning', () => {
      expect(getRiskLevel('Warning')).toBe(RiskLevel.Medium);
    });

    it('returns Medium for Spam', () => {
      expect(getRiskLevel('Spam')).toBe(RiskLevel.Medium);
    });

    it('returns High for Malicious', () => {
      expect(getRiskLevel('Malicious')).toBe(RiskLevel.High);
    });

    it('returns Unknown for undefined', () => {
      expect(getRiskLevel(undefined)).toBe(RiskLevel.Unknown);
    });

    it('returns Unknown for unrecognized resultType', () => {
      expect(getRiskLevel('SomethingElse' as never)).toBe(RiskLevel.Unknown);
    });
  });

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
        const features = Object.keys(POSITIVE_FEATURE_LABELS).map(makeFeature);

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

  describe('getTotalLiquidityUSD', () => {
    it('sums market reserves', () => {
      const stats = {
        markets: [{ reserveUSD: 1000 }, { reserveUSD: 2500 }],
      } as unknown as TokenSecurityFinancialStats;

      expect(getTotalLiquidityUSD(stats)).toBe(3500);
    });

    it('treats missing reserveUSD as 0', () => {
      const stats = {
        markets: [{ reserveUSD: 1000 }, { reserveUSD: undefined }],
      } as unknown as TokenSecurityFinancialStats;

      expect(getTotalLiquidityUSD(stats)).toBe(1000);
    });

    it('returns null when no markets', () => {
      expect(
        getTotalLiquidityUSD({
          markets: [],
        } as unknown as TokenSecurityFinancialStats),
      ).toBeNull();
    });

    it('returns null for null stats', () => {
      expect(getTotalLiquidityUSD(null)).toBeNull();
    });

    it('returns null for undefined stats', () => {
      expect(getTotalLiquidityUSD(undefined)).toBeNull();
    });
  });

  describe('formatCompactUSD', () => {
    it('formats billions', () => {
      expect(formatCompactUSD(2_500_000_000)).toBe('$2.50B');
    });

    it('formats millions', () => {
      expect(formatCompactUSD(1_230_000)).toBe('$1.23M');
    });

    it('formats thousands', () => {
      expect(formatCompactUSD(45_600)).toBe('$45.6K');
    });

    it('formats small values', () => {
      expect(formatCompactUSD(999)).toBe('$999.00');
    });

    it('formats zero', () => {
      expect(formatCompactUSD(0)).toBe('$0.00');
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

  describe('getWhaleConcentrationRisk', () => {
    it('returns Low when top10 < 20%', () => {
      expect(getWhaleConcentrationRisk(10)).toBe(RiskLevel.Low);
    });

    it('returns Medium when top10 is 20%', () => {
      expect(getWhaleConcentrationRisk(20)).toBe(RiskLevel.Medium);
    });

    it('returns Medium when top10 is between 20% and 50%', () => {
      expect(getWhaleConcentrationRisk(35)).toBe(RiskLevel.Medium);
    });

    it('returns Medium when top10 is exactly 50%', () => {
      expect(getWhaleConcentrationRisk(50)).toBe(RiskLevel.Medium);
    });

    it('returns High when top10 > 50%', () => {
      expect(getWhaleConcentrationRisk(75)).toBe(RiskLevel.High);
    });

    it('returns Unknown for null', () => {
      expect(getWhaleConcentrationRisk(null)).toBe(RiskLevel.Unknown);
    });
  });

  describe('hasFeature', () => {
    const features = [
      { featureId: 'VERIFIED_CONTRACT' },
      { featureId: 'HIGH_REPUTATION_TOKEN' },
    ] as TokenSecurityFeature[];

    it('returns true when feature is present', () => {
      expect(hasFeature(features, 'VERIFIED_CONTRACT')).toBe(true);
    });

    it('returns false when feature is absent', () => {
      expect(hasFeature(features, 'HONEYPOT')).toBe(false);
    });

    it('returns false for empty features array', () => {
      expect(hasFeature([], 'VERIFIED_CONTRACT')).toBe(false);
    });
  });

  describe('getSmartContractRisk', () => {
    it('returns Low for Verified', () => {
      expect(getSmartContractRisk('Verified')).toBe(RiskLevel.Low);
    });

    it('returns Low for Benign', () => {
      expect(getSmartContractRisk('Benign')).toBe(RiskLevel.Low);
    });

    it('returns Medium for Warning', () => {
      expect(getSmartContractRisk('Warning')).toBe(RiskLevel.Medium);
    });

    it('returns High for Malicious', () => {
      expect(getSmartContractRisk('Malicious')).toBe(RiskLevel.High);
    });

    it('returns Unknown for undefined', () => {
      expect(getSmartContractRisk(undefined)).toBe(RiskLevel.Unknown);
    });

    it('returns Unknown for Spam (not mapped in smart contract risk)', () => {
      expect(getSmartContractRisk('Spam' as never)).toBe(RiskLevel.Unknown);
    });
  });
});
