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
  iconName: IconName;
  label: string;
  /** Renders a count badge before the chevron when greater than zero. */
  badgeCount?: number;
  onPress: () => void;
  testID?: string;
}

/** A tappable drawer row: leading icon, label, optional badge, chevron. */
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
