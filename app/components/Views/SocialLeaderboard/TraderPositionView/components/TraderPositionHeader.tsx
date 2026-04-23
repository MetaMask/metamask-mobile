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
  onClose: () => void;
  closeButtonTestID: string;
}

const TraderPositionHeader: React.FC<TraderPositionHeaderProps> = ({
  traderName,
  onClose,
  closeButtonTestID,
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    twClassName="px-2 py-2"
  >
    <Box twClassName="w-10" />
    <Text
      variant={TextVariant.HeadingSm}
      fontWeight={FontWeight.Bold}
      color={TextColor.TextDefault}
      numberOfLines={1}
    >
      {traderName}
    </Text>
    <Box twClassName="w-10 items-end">
      <ButtonIcon
        iconName={IconName.Close}
        size={ButtonIconSize.Md}
        onPress={onClose}
        testID={closeButtonTestID}
      />
    </Box>
  </Box>
);

export default TraderPositionHeader;
