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
 * Share of the screen width a value may occupy before it truncates.
 *
 * `Content` renders the value in a wrapper we cannot style, and React Native
 * defaults `flexShrink` to 0, so that wrapper never gives ground: a long value
 * collapses the label and overflows the row instead of ellipsising. Bounding
 * the value text itself is the only lever `Content` exposes.
 */
const VALUE_MAX_WIDTH_RATIO = 0.45;

interface ProfileRowProps {
  /** Left-hand label, e.g. "Display name". */
  title: string;
  /** Right-hand value, truncated to a single line when it overflows. */
  value: string;
  /** Optional node rendered immediately before the value, e.g. a lock or social icon. */
  valueStartAccessory?: ReactNode;
  /**
   * Caps the value width in pixels, overriding the responsive default. Use a
   * smaller value to make a long field truncate earlier and sit further right.
   */
  valueMaxWidth?: number;
  /** Renders a hairline separator above the row. Use on every row but the first in a card. */
  showDivider?: boolean;
  /** Omit to render a read-only row that cannot be pressed. */
  onPress?: () => void;
  testID?: string;
}

/**
 * A single tappable row inside a Manage profile card: label on the left,
 * muted value plus chevron on the right. Both label and value truncate to one
 * line, so neither can push the other out of the row.
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

  // Without `isInteractive` the root is a Box rather than a Pressable, so the
  // row takes no touches and is not announced as a button.
  return onPress ? (
    <ListItem isInteractive onPress={onPress} {...contentProps} />
  ) : (
    <ListItem {...contentProps} />
  );
};

export default ProfileRow;
