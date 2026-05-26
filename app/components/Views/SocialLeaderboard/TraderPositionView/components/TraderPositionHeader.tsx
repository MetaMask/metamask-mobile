import React from 'react';
import { Image, Pressable, StyleSheet } from 'react-native';
import {
  AvatarBase,
  AvatarBaseSize,
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';

const AVATAR_SIZE = 24;

export interface TraderPositionHeaderProps {
  traderName: string;
  traderImageUrl?: string;
  onBack: () => void;
  onTraderPress: () => void;
  backButtonTestID: string;
  traderNameTestID: string;
}

const styles = StyleSheet.create({
  traderNameButton: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  traderNameButtonPressed: {
    opacity: 0.7,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
});

const TraderPositionHeader: React.FC<TraderPositionHeaderProps> = ({
  traderName,
  traderImageUrl,
  onBack,
  onTraderPress,
  backButtonTestID,
  traderNameTestID,
}) => {
  const fallbackText = traderName.trim().charAt(0).toUpperCase() || '?';

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="px-2 py-2"
    >
      <Box twClassName="w-10">
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={onBack}
          testID={backButtonTestID}
        />
      </Box>
      <Pressable
        onPress={onTraderPress}
        testID={traderNameTestID}
        accessibilityRole="button"
        accessibilityLabel={
          traderName ? `View ${traderName} profile` : 'View trader profile'
        }
        style={({ pressed }) => [
          styles.traderNameButton,
          pressed && styles.traderNameButtonPressed,
        ]}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={2}
          twClassName="max-w-full"
        >
          {traderImageUrl ? (
            <Image
              source={{ uri: traderImageUrl }}
              style={styles.avatar}
              resizeMode="cover"
            />
          ) : (
            <AvatarBase size={AvatarBaseSize.Sm} fallbackText={fallbackText} />
          )}
          <Text
            variant={TextVariant.HeadingSm}
            fontWeight={FontWeight.Bold}
            color={TextColor.TextDefault}
            numberOfLines={1}
            twClassName="shrink text-center"
          >
            {traderName}
          </Text>
        </Box>
      </Pressable>
      <Box twClassName="w-10" />
    </Box>
  );
};

export default TraderPositionHeader;
