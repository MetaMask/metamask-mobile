import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxBackgroundColor,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { SecurityPillSelectors } from './SecurityPill.testIds';

/**
 * Security screening outcome shown on the Token Details V1 security & social row.
 *
 * TODO(ASSETS-4018): derive from Blockaid once security data is wired up —
 * `Benign` -> screened, `Malicious` -> high_risk, no coverage -> unscreened,
 * scan still running -> pending. Liquidity and market cap do not feed the
 * verdict in V1.
 */
export type SecurityVerdict =
  | 'screened'
  | 'medium_risk'
  | 'high_risk'
  | 'unscreened'
  | 'pending';

interface VerdictConfig {
  background: BoxBackgroundColor;
  textColor: TextColor;
  iconColor: IconColor;
  labelKey: string;
}

/**
 * Every verdict shows the same plain shield; colour and label carry the state.
 * Design picked this over the per-state glyphs the icon set offers (tick,
 * slash, magnifier), so the shield reads as a "security" marker rather than as
 * a verdict of its own.
 */
const VERDICT_ICON = IconName.Security;

/**
 * Colours mirror the design-system `Tag` severity scale — success for a clean
 * screen, error for a bad one, neutral for the two states that carry no
 * judgement. The pill is composed from primitives instead of built on `Tag`
 * because design calls for a 28px capsule matching the social icon buttons
 * beside it, and `Tag` fixes its text variant and inner gap internally.
 */
const VERDICT_CONFIG: Record<SecurityVerdict, VerdictConfig> = {
  screened: {
    background: BoxBackgroundColor.SuccessMuted,
    textColor: TextColor.SuccessDefault,
    iconColor: IconColor.SuccessDefault,
    labelKey: 'token_details_v1.security_pill.screened',
  },
  medium_risk: {
    background: BoxBackgroundColor.WarningMuted,
    textColor: TextColor.WarningDefault,
    iconColor: IconColor.WarningDefault,
    labelKey: 'token_details_v1.security_pill.flags',
  },
  high_risk: {
    background: BoxBackgroundColor.ErrorMuted,
    textColor: TextColor.ErrorDefault,
    iconColor: IconColor.ErrorDefault,
    labelKey: 'token_details_v1.security_pill.high_risk',
  },
  unscreened: {
    background: BoxBackgroundColor.BackgroundMuted,
    textColor: TextColor.TextAlternative,
    iconColor: IconColor.IconAlternative,
    labelKey: 'token_details_v1.security_pill.unscreened',
  },
  pending: {
    background: BoxBackgroundColor.BackgroundMuted,
    textColor: TextColor.TextAlternative,
    iconColor: IconColor.IconAlternative,
    labelKey: 'token_details_v1.security_pill.pending',
  },
};

export interface SecurityPillProps {
  verdict: SecurityVerdict;
  /**
   * Number of security flags raised against the token. Only `medium_risk`
   * renders it, as the flag count is its label ("1 flag", "3 flags"). The
   * other verdicts have fixed labels and ignore it.
   */
  flagCount?: number;
  /**
   * Opens the Security tab, where the individual flags are listed. The pill
   * renders as static text when omitted, which is how the tab's own header
   * reuses it.
   */
  onPress?: () => void;
}

/**
 * Shield-and-a-verdict pill for the Token Details V1 security & social row.
 */
export const SecurityPill: React.FC<SecurityPillProps> = ({
  verdict,
  flagCount = 0,
  onPress,
}) => {
  const { background, textColor, iconColor, labelKey } =
    VERDICT_CONFIG[verdict];
  // `count` drives i18n pluralization for the flag labels and is ignored by
  // the fixed ones, so every verdict resolves through the same call.
  const label = strings(labelKey, { count: flagCount });

  const pill = (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      backgroundColor={background}
      twClassName="h-7 gap-1 rounded-full px-2.5"
      testID={SecurityPillSelectors.VERDICT}
    >
      <Icon name={VERDICT_ICON} size={IconSize.Sm} color={iconColor} />
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={textColor}
      >
        {label}
      </Text>
    </Box>
  );

  if (!onPress) {
    return pill;
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={strings(
        'token_details_v1.security_pill.accessibility_label',
        { verdict: label },
      )}
      testID={SecurityPillSelectors.PILL}
    >
      {pill}
    </TouchableOpacity>
  );
};

export default SecurityPill;
