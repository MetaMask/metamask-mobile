import React from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';

const Root = ({
  children,
  testID,
}: {
  children: React.ReactNode;
  testID?: string;
}) => (
  <Box twClassName="flex-row items-center gap-3" testID={testID}>
    {children}
  </Box>
);

/** The Outcome label with its chance drawn as a line underneath. */
const Label = ({
  label,
  percent,
  color,
  lineTestID,
}: {
  label: string;
  /** Line width in percent; no line when undefined. */
  percent?: number;
  color: string;
  lineTestID?: string;
}) => (
  <Box twClassName="min-w-0 flex-1 gap-2">
    <Text variant={TextVariant.BodyMd} numberOfLines={1}>
      {label}
    </Text>
    {percent === undefined ? null : (
      <Box
        testID={lineTestID}
        twClassName="h-0.5 rounded-full"
        style={{ width: `${percent}%`, backgroundColor: color }}
      />
    )}
  </Box>
);

/** A trailing value between the label and the price, such as a line. */
const Value = ({ children }: { children: string }) => (
  <Text
    variant={TextVariant.BodyMd}
    fontWeight={FontWeight.Medium}
    numberOfLines={1}
  >
    {children}
  </Text>
);

const Price = ({
  price,
  color,
  isDisabled,
  onPress,
  accessibilityLabel,
  testID,
}: {
  /** Formatted Ask Price; a dash when undefined. */
  price?: string;
  color: string;
  isDisabled: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  testID?: string;
}) => (
  <Button
    testID={testID}
    accessibilityLabel={accessibilityLabel}
    isDisabled={isDisabled}
    variant={ButtonVariant.Secondary}
    size={ButtonSize.Lg}
    onPress={onPress}
    twClassName="min-w-[64px] px-3"
  >
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      style={{ color }}
    >
      {price ?? '—'}
    </Text>
  </Button>
);

/**
 * One Outcome of a Market card: an optional leading avatar, the label with its
 * chance line, an optional trailing value, and the price that opens an Order.
 */
export const OutcomeRow = { Root, Label, Value, Price };
