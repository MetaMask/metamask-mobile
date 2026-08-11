import React, { ReactNode } from 'react';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

/**
 * A labelled key/value row (label on the left, value on the right). Renders
 * nothing when `value` is empty, so callers can pass optional values directly.
 * String values are wrapped in a default `Text`; nodes are rendered as-is.
 */
export function ActivityDetailRow({
  label,
  value,
  testID,
}: {
  label: string;
  value: ReactNode;
  testID?: string;
}) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return (
    <Box
      twClassName="flex-row items-start justify-between gap-4"
      testID={testID}
    >
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
      >
        {label}
      </Text>
      {typeof value === 'string' ? (
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          twClassName="shrink text-right"
        >
          {value}
        </Text>
      ) : (
        value
      )}
    </Box>
  );
}

/** Groups a set of rows with consistent vertical spacing. */
export function ActivityDetailSection({
  children,
  testID,
}: {
  children: ReactNode;
  testID?: string;
}) {
  return (
    <Box twClassName="gap-4" testID={testID}>
      {children}
    </Box>
  );
}

/** Footer container for the screen's call-to-action buttons. */
export function ActivityDetailFooter({
  children,
  testID,
}: {
  children: ReactNode;
  testID?: string;
}) {
  return (
    <Box twClassName="gap-3" testID={testID}>
      {children}
    </Box>
  );
}
