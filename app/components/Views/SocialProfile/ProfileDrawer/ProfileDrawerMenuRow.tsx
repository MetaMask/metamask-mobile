import React, { type ReactNode } from 'react';
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
  label: ReactNode;
  /** Spoken name when `label` is not a string, such as a loading skeleton. */
  accessibilityLabel?: string;
  /** Renders a count badge before the chevron when greater than zero. */
  badgeCount?: number;
  /** Blocks the press while the label is still resolving. */
  isDisabled?: boolean;
  onPress: () => void;
  testID?: string;
}

/** A tappable drawer row: leading icon, label, optional badge, chevron. */
const ProfileDrawerMenuRow = ({
  iconName,
  label,
  accessibilityLabel,
  badgeCount,
  isDisabled = false,
  onPress,
  testID,
}: ProfileDrawerMenuRowProps) => (
  <ListItem
    isInteractive
    disabled={isDisabled}
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
    accessibilityLabel={
      accessibilityLabel ?? (typeof label === 'string' ? label : undefined)
    }
  />
);

export default ProfileDrawerMenuRow;
