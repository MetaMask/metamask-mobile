import React from 'react';
import {
  BadgeCount,
  ContentVariant,
  Icon,
  IconColor,
  IconName,
  IconSize,
  ListItem,
} from '@metamask/design-system-react-native';

interface ProfileDrawerMenuRowProps {
  /** Leading icon for the row. */
  iconName: IconName;
  /** Row label, e.g. "Notifications". */
  label: string;
  /** When greater than zero, renders a count badge before the chevron. */
  badgeCount?: number;
  onPress: () => void;
  testID?: string;
}

/**
 * A single tappable row in the Side profile menu: leading icon, label, an
 * optional count badge, and a trailing chevron.
 */
const ProfileDrawerMenuRow = ({
  iconName,
  label,
  badgeCount,
  onPress,
  testID,
}: ProfileDrawerMenuRowProps) => (
  <ListItem
    isInteractive
    variant={ContentVariant.OneLine}
    avatar={
      <Icon name={iconName} size={IconSize.Md} color={IconColor.IconDefault} />
    }
    title={label}
    value={badgeCount ? <BadgeCount count={badgeCount} /> : undefined}
    endAccessory={
      <Icon
        name={IconName.ArrowRight}
        size={IconSize.Sm}
        color={IconColor.IconAlternative}
      />
    }
    accessoryGap={2}
    onPress={onPress}
    testID={testID}
    accessibilityLabel={label}
  />
);

export default ProfileDrawerMenuRow;
