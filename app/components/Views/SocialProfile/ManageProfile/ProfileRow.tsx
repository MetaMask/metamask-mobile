import React, { type ReactNode } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  ContentVariant,
  Icon,
  IconColor,
  IconName,
  IconSize,
  ListItem,
  TextColor,
} from '@metamask/design-system-react-native';

/**
 * Share of the screen width a value may occupy before it truncates. `Content`
 * renders the value in a wrapper we cannot style and RN defaults `flexShrink`
 * to 0, so bounding the text itself is the only lever available.
 */
const VALUE_MAX_WIDTH_RATIO = 0.45;

interface ProfileRowProps {
  title: string;
  /** Truncated to a single line when it overflows. */
  value: string;
  /** Rendered immediately before the value, e.g. a lock or social icon. */
  valueStartAccessory?: ReactNode;
  /** Caps the value width in pixels, overriding the responsive default. */
  valueMaxWidth?: number;
  /** Hairline separator above the row. Use on every row but the first. */
  showDivider?: boolean;
  /** Omit to render a read-only row that cannot be pressed. */
  onPress?: () => void;
  testID?: string;
}

/**
 * A Manage profile card row: label left, muted value plus chevron right. Both
 * truncate to one line so neither can push the other out of the row.
 */
const ProfileRow = ({
  title,
  value,
  valueStartAccessory,
  valueMaxWidth,
  showDivider = false,
  onPress,
  testID,
}: ProfileRowProps) => {
  const { width } = useWindowDimensions();
  const resolvedValueMaxWidth =
    valueMaxWidth ?? Math.round(width * VALUE_MAX_WIDTH_RATIO);

  const contentProps = {
    variant: ContentVariant.OneLine,
    title,
    titleProps: { numberOfLines: 1 },
    value,
    valueProps: {
      color: TextColor.TextAlternative,
      numberOfLines: 1,
      style: { maxWidth: resolvedValueMaxWidth },
    },
    valueStartAccessory,
    endAccessory: (
      <Icon
        name={IconName.ArrowRight}
        size={IconSize.Sm}
        color={IconColor.IconAlternative}
      />
    ),
    accessoryGap: 2 as const,
    twClassName: showDivider ? 'border-t border-muted' : undefined,
    testID,
    accessibilityLabel: `${title}, ${value}`,
  };

  // Without `isInteractive` the root is a Box, so the row takes no touches and
  // is not announced as a button.
  return onPress ? (
    <ListItem isInteractive onPress={onPress} {...contentProps} />
  ) : (
    <ListItem {...contentProps} />
  );
};

export default ProfileRow;
