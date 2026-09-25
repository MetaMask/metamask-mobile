import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Icon,
  IconAlert,
  IconSize,
  Text as DesignSystemText,
  TextColor,
  TextVariant as DesignSystemTextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';

import type { ResultTypeConfig } from '../../utils/securityUtils';

export type SecurityTrustInlineBadgeConfig = NonNullable<
  ResultTypeConfig['badge']
>;

export interface SecurityTrustInlineBadgeProps {
  badge: SecurityTrustInlineBadgeConfig;
  /** When the badge has no pill (icon-only Verified), forwarded to Icon / IconAlert. */
  iconTestID?: string;
}

/**
 * Inline security badge (pill with label for Risky/Malicious; icon-only for Verified).
 */
const SecurityTrustInlineBadge = ({
  badge,
  iconTestID,
}: SecurityTrustInlineBadgeProps) => {
  if (badge.label === null) {
    return (
      <>
        {badge.iconAlertSeverity ? (
          <IconAlert
            severity={badge.iconAlertSeverity}
            size={IconSize.Sm}
            testID={iconTestID}
          />
        ) : (
          <Icon
            name={badge.icon}
            size={IconSize.Sm}
            color={badge.iconColor}
            testID={iconTestID}
          />
        )}
      </>
    );
  }

  const twBg = badge.bg ?? '';

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName={`rounded min-w-[22px] px-1.5 gap-1 shrink-0 ${twBg}`}
    >
      {badge.iconAlertSeverity ? (
        <IconAlert severity={badge.iconAlertSeverity} size={IconSize.Sm} />
      ) : (
        <Icon name={badge.icon} size={IconSize.Sm} color={badge.iconColor} />
      )}
      <DesignSystemText
        variant={DesignSystemTextVariant.BodySm}
        color={badge.textColor ?? TextColor.TextDefault}
        fontWeight={FontWeight.Medium}
        numberOfLines={1}
        twClassName="whitespace-nowrap"
      >
        {badge.label}
      </DesignSystemText>
    </Box>
  );
};

export default SecurityTrustInlineBadge;
