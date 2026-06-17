import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import {
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
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import TraderAvatar from '../../../Homepage/Sections/TopTraders/components/TraderAvatar';

const AVATAR_SIZE = 24;

export interface TraderPositionHeaderProps {
  traderName: string;
  traderImageUrl?: string;
  traderAddress?: string;
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
});

const TraderPositionHeader: React.FC<TraderPositionHeaderProps> = ({
  traderName,
  traderImageUrl,
  traderAddress,
  onBack,
  onTraderPress,
  backButtonTestID,
  traderNameTestID,
}) => (
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
        <TraderAvatar
          imageUrl={traderImageUrl}
          address={traderAddress}
          size={AVATAR_SIZE}
        />
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

export default TraderPositionHeader;
