import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import TraderAvatar from '../../Homepage/Sections/TopTraders/components/TraderAvatar';

const AVATAR_SIZE_BY_VARIANT = {
  nav: 24,
  compact: 20,
  breadcrumb: 20,
} as const;

export type TraderHeaderIdentityVariant = keyof typeof AVATAR_SIZE_BY_VARIANT;

export interface TraderHeaderIdentityProps {
  traderName: string;
  traderImageUrl?: string | null;
  traderAddress?: string;
  variant?: TraderHeaderIdentityVariant;
  onPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
}

const styles = StyleSheet.create({
  pressable: {
    maxWidth: '100%',
  },
  pressablePressed: {
    opacity: 0.7,
  },
});

const TraderHeaderIdentity: React.FC<TraderHeaderIdentityProps> = ({
  traderName,
  traderImageUrl,
  traderAddress,
  variant = 'nav',
  onPress,
  testID,
  accessibilityLabel,
}) => {
  const avatarSize = AVATAR_SIZE_BY_VARIANT[variant];
  const textVariant =
    variant === 'nav'
      ? TextVariant.HeadingSm
      : variant === 'compact'
        ? TextVariant.BodyMd
        : TextVariant.BodySm;
  const fontWeight =
    variant === 'breadcrumb' ? FontWeight.Medium : FontWeight.Bold;

  const content = (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={2}
      twClassName="max-w-full"
    >
      <TraderAvatar
        imageUrl={traderImageUrl}
        address={traderAddress}
        size={avatarSize}
      />
      <Text
        variant={textVariant}
        fontWeight={fontWeight}
        color={TextColor.TextDefault}
        numberOfLines={1}
        twClassName="shrink"
      >
        {traderName}
      </Text>
    </Box>
  );

  if (!onPress) {
    return (
      <Box testID={testID} twClassName="max-w-full">
        {content}
      </Box>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel ??
        (traderName ? `View ${traderName} profile` : 'View trader profile')
      }
      style={({ pressed }) => [
        styles.pressable,
        pressed && styles.pressablePressed,
      ]}
    >
      {content}
    </Pressable>
  );
};

export default TraderHeaderIdentity;
