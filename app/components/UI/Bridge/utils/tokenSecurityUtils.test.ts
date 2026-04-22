import { IconColor, IconName } from '@metamask/design-system-react-native';
import { TagSeverity } from '../../../../component-library/base-components/TagBase';
import { strings } from '../../../../../locales/i18n';
import { SecurityDataType } from '../hooks/usePopularTokens';
import { createMockToken } from '../testUtils/fixtures';
import {
  getBridgeTokenSecurityConfig,
  getSecurityWarnings,
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
});
