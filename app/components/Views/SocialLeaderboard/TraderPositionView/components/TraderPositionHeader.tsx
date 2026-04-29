import React from 'react';
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

export interface TraderPositionHeaderProps {
  traderName: string;
  onBack: () => void;
  backButtonTestID: string;
}

const TraderPositionHeader: React.FC<TraderPositionHeaderProps> = ({
  traderName,
  onBack,
  backButtonTestID,
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
    <Text
      variant={TextVariant.HeadingSm}
      fontWeight={FontWeight.Bold}
      color={TextColor.TextDefault}
      numberOfLines={1}
    >
      {traderName}
    </Text>
    <Box twClassName="w-10" />
  </Box>
);

export default TraderPositionHeader;
