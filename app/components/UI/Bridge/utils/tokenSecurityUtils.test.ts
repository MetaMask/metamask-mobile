import { TokenSecurityData } from '@metamask/assets-controllers';
import { IconColor, IconName } from '@metamask/design-system-react-native';
import { TagSeverity } from '../../../../component-library/base-components/TagBase';
import { strings } from '../../../../../locales/i18n';
import { SecurityDataType } from '../types';
import { createMockToken } from '../testUtils/fixtures';
import {
  adaptTokenSecurityData,
  getBridgeTokenSecurityConfig,
  getSecurityWarnings,
  isNegativeSecurityType,
} from './tokenSecurityUtils';

describe('tokenSecurityUtils', () => {
  describe('getSecurityWarnings', () => {
    it('returns descriptions from all features', () => {
      const token = createMockToken({
        securityData: {
          type: SecurityDataType.Malicious,
          metadata: {
            features: [
              {
                featureId: 'HONEYPOT',
                type: SecurityDataType.Warning,
                description: 'Honeypot risk',
              },
              {
                featureId: 'RUGPULL',
                type: SecurityDataType.Malicious,
                description: 'Rugpull risk',
              },
            ],
          },
        },
      });

      expect(getSecurityWarnings(token)).toEqual([
        'Honeypot risk',
        'Rugpull risk',
      ]);
    });

    it('returns empty array when metadata is absent', () => {
      const token = createMockToken({
        securityData: { type: SecurityDataType.Warning },
      });
      expect(getSecurityWarnings(token)).toEqual([]);
    });

    it('returns empty array when securityData is absent', () => {
      const token = createMockToken({ securityData: undefined });
      expect(getSecurityWarnings(token)).toEqual([]);
    });

    it('returns empty array for null token', () => {
      expect(getSecurityWarnings(null)).toEqual([]);
    });

    it('returns empty array for undefined token', () => {
      expect(getSecurityWarnings(undefined)).toEqual([]);
    });
  });

  describe('isNegativeSecurityType', () => {
    it.each([
      SecurityDataType.Warning,
      SecurityDataType.Malicious,
      SecurityDataType.Spam,
    ])('returns true for %s', (type) => {
      expect(isNegativeSecurityType(type)).toBe(true);
    });

    it.each([SecurityDataType.Benign, SecurityDataType.Info, undefined])(
      'returns false for %s',
      (type) => {
        expect(isNegativeSecurityType(type)).toBe(false);
      },
    );
  });

  describe('getBridgeTokenSecurityConfig', () => {
    it('returns Error icon, danger severity and malicious label for Malicious type', () => {
      const config = getBridgeTokenSecurityConfig(SecurityDataType.Malicious);

      expect(config.iconName).toBe(IconName.Error);
      expect(config.iconColor).toBe(IconColor.ErrorDefault);
      expect(config.severity).toBe(TagSeverity.Danger);
      expect(config.label).toBe(strings('bridge.token_malicious'));
    });

    it('returns Danger icon, warning severity and suspicious label for Warning type', () => {
      const config = getBridgeTokenSecurityConfig(SecurityDataType.Warning);

      expect(config.iconName).toBe(IconName.Danger);
      expect(config.iconColor).toBe(IconColor.WarningDefault);
      expect(config.severity).toBe(TagSeverity.Warning);
      expect(config.label).toBe(strings('bridge.token_suspicious'));
    });

    it('returns Danger icon, warning severity and suspicious label for Spam type', () => {
      const config = getBridgeTokenSecurityConfig(SecurityDataType.Spam);

      expect(config.iconName).toBe(IconName.Danger);
      expect(config.iconColor).toBe(IconColor.WarningDefault);
      expect(config.severity).toBe(TagSeverity.Warning);
      expect(config.label).toBe(strings('bridge.token_suspicious'));
    });

    it('returns Info icon and default severity for Benign type', () => {
      const config = getBridgeTokenSecurityConfig(SecurityDataType.Benign);

      expect(config.iconName).toBe(IconName.Info);
      expect(config.severity).toBe(TagSeverity.Default);
    });

    it('returns Info icon and default severity for Info type', () => {
      const config = getBridgeTokenSecurityConfig(SecurityDataType.Info);

      expect(config.iconName).toBe(IconName.Info);
      expect(config.severity).toBe(TagSeverity.Default);
    });
  });

  describe('adaptTokenSecurityData', () => {
    const buildTrendingShape = (
      overrides: Partial<TokenSecurityData> = {},
    ): TokenSecurityData => ({
      resultType: 'Verified',
      maliciousScore: '0',
      fees: { transfer: 0, transferFeeMaxAmount: null, buy: 0, sell: null },
      features: [],
      financialStats: {
        supply: 0,
        topHolders: [],
        holdersCount: 0,
        tradeVolume24h: null,
        lockedLiquidityPct: null,
        markets: [],
      },
      metadata: {
        externalLinks: {
          homepage: null,
          twitterPage: null,
          telegramChannelId: null,
        },
      },
      created: '2025-01-01T00:00:00Z',
      ...overrides,
    });

    it('returns undefined when input is undefined', () => {
      expect(adaptTokenSecurityData(undefined)).toBeUndefined();
    });

    it.each([
      SecurityDataType.Verified,
      SecurityDataType.Benign,
      SecurityDataType.Warning,
      SecurityDataType.Spam,
      SecurityDataType.Malicious,
      SecurityDataType.Info,
    ])('maps resultType %s to type', (value) => {
      const adapted = adaptTokenSecurityData(
        buildTrendingShape({ resultType: value }),
      );

      expect(adapted?.type).toBe(value);
    });

    it('passes through unknown resultType strings as-is', () => {
      const adapted = adaptTokenSecurityData(
        buildTrendingShape({ resultType: 'SomethingNew' }),
      );

      expect(adapted?.type).toBe('SomethingNew');
    });

    it('maps top-level features to metadata.features preserving fields', () => {
      const adapted = adaptTokenSecurityData(
        buildTrendingShape({
          features: [
            {
              featureId: 'HONEYPOT',
              type: 'Warning',
              description: 'Honeypot risk',
            },
            {
              featureId: 'RUGPULL',
              type: 'Malicious',
              description: 'Rugpull risk',
            },
          ],
        }),
      );

      expect(adapted?.metadata?.features).toEqual([
        {
          featureId: 'HONEYPOT',
          type: 'Warning',
          description: 'Honeypot risk',
        },
        {
          featureId: 'RUGPULL',
          type: 'Malicious',
          description: 'Rugpull risk',
        },
      ]);
    });

    it('returns metadata.features as empty array when input has no features', () => {
      const adapted = adaptTokenSecurityData(
        buildTrendingShape({ features: [] }),
      );

      expect(adapted?.metadata?.features).toEqual([]);
    });
  });
});
