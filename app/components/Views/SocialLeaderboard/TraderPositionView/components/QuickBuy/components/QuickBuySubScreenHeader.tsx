import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  ButtonIconVariant,
  FontWeight,
  IconName as DsIconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

interface QuickBuySubScreenHeaderProps {
  title: string;
  onBack: () => void;
  onClose: () => void;
}

const QuickBuySubScreenHeader: React.FC<QuickBuySubScreenHeaderProps> = ({
  title,
  onBack,
  onClose,
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    twClassName="h-12 px-4 pt-0 mb-3"
  >
    <ButtonIcon
      iconName={DsIconName.ArrowLeft}
      size={ButtonIconSize.Lg}
      variant={ButtonIconVariant.Filled}
      iconProps={{ size: IconSize.Md }}
      onPress={onBack}
      testID="quick-buy-sub-screen-back-button"
    />
    <Text
      variant={TextVariant.HeadingSm}
      fontWeight={FontWeight.Bold}
      color={TextColor.TextDefault}
    >
      {title}
    </Text>
    <ButtonIcon
      iconName={DsIconName.Close}
      size={ButtonIconSize.Lg}
      variant={ButtonIconVariant.Filled}
      iconProps={{ size: IconSize.Md }}
      onPress={onClose}
      testID="quick-buy-sub-screen-close-button"
    />
  </Box>
);

export default QuickBuySubScreenHeader;
