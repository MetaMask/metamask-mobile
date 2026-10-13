import React from 'react';
import {
  Icon,
  IconAlert,
  IconAlertSeverity,
  IconSize,
  Tag,
  TagSeverity,
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

const TAG_SEVERITY_BY_ICON_ALERT: Record<IconAlertSeverity, TagSeverity> = {
  [IconAlertSeverity.Info]: TagSeverity.Info,
  [IconAlertSeverity.Success]: TagSeverity.Success,
  [IconAlertSeverity.Warning]: TagSeverity.Warning,
  [IconAlertSeverity.Danger]: TagSeverity.Danger,
};

/**
 * Inline security badge (design-system Tag for Risky/Malicious; icon-only for Verified).
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

  return (
    <Tag
      severity={
        badge.iconAlertSeverity
          ? TAG_SEVERITY_BY_ICON_ALERT[badge.iconAlertSeverity]
          : TagSeverity.Neutral
      }
      startIconName={badge.iconAlertSeverity ? undefined : badge.icon}
      startAccessory={
        badge.iconAlertSeverity ? (
          <IconAlert severity={badge.iconAlertSeverity} size={IconSize.Xs} />
        ) : undefined
      }
      twClassName="shrink-0"
    >
      {badge.label}
    </Tag>
  );
};

export default SecurityTrustInlineBadge;
