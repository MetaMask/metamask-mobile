import { IconColor, IconName } from '@metamask/design-system-react-native';
import { TagSeverity } from '../../../../component-library/base-components/TagBase';
import { strings } from '../../../../../locales/i18n';
import { getResultTypeConfig } from '../../SecurityTrust/utils/securityUtils';
import { SecurityDataType } from '../hooks/usePopularTokens';
import { BridgeToken } from '../types';

/**
 * Extracts security warning descriptions from a token's securityData metadata features.
 * Returns an empty array when the token has no security warnings.
 */
export const getSecurityWarnings = (
  token: BridgeToken | undefined | null,
): string[] =>
  token?.securityData?.metadata?.features?.map((f) => f.description) ?? [];

export interface BridgeTokenSecurityConfig {
  iconName: IconName;
  iconColor: IconColor;
  severity: TagSeverity;
  label: string;
}

/**
 * Returns true for security types that require the user to acknowledge before
 * proceeding (Warning, Malicious, Spam).
 */
export const isNegativeSecurityType = (
  type: SecurityDataType | undefined,
): type is
  | SecurityDataType.Warning
  | SecurityDataType.Malicious
  | SecurityDataType.Spam =>
  type === SecurityDataType.Warning ||
  type === SecurityDataType.Malicious ||
  type === SecurityDataType.Spam;

/**
 * Returns Bridge-specific icon, color, severity and label for a token's
 * security type. Used by the token selector tag, warning banner, and
 * warning modal.
 *
 * Icon names are Bridge-specific choices (Error for Malicious, Danger for
 * Warning/Spam) and intentionally differ from `getResultTypeConfig`. Colors
 * are sourced from `getResultTypeConfig` as the single source of truth.
 */
export const getBridgeTokenSecurityConfig = (
  securityType: SecurityDataType,
): BridgeTokenSecurityConfig => {
  const resultConfig = getResultTypeConfig(securityType);

  switch (securityType) {
    case SecurityDataType.Malicious:
      return {
        iconName: IconName.Error,
        iconColor: resultConfig.iconColor ?? IconColor.ErrorDefault,
        severity: TagSeverity.Danger,
        label: strings('bridge.token_malicious'),
      };
    case SecurityDataType.Warning:
    case SecurityDataType.Spam:
      return {
        iconName: IconName.Danger,
        iconColor: resultConfig.iconColor ?? IconColor.WarningDefault,
        severity: TagSeverity.Warning,
        label: strings('bridge.token_suspicious'),
      };
    default:
      return {
        iconName: IconName.Info,
        iconColor: resultConfig.iconColor ?? IconColor.InfoDefault,
        severity: TagSeverity.Default,
        label: resultConfig.label,
      };
  }
};
