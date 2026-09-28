import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconName as DsIconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { QuickBuySheetSelectorsIDs } from '../QuickBuySheet.testIds';

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
    twClassName="h-14 px-2"
  >
    <ButtonIcon
      iconName={DsIconName.ArrowLeft}
      size={ButtonIconSize.Md}
      onPress={onBack}
      testID={QuickBuySheetSelectorsIDs.SUB_SCREEN_BACK}
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
      size={ButtonIconSize.Md}
      onPress={onClose}
      testID={QuickBuySheetSelectorsIDs.SUB_SCREEN_CLOSE}
    />
  </Box>
);

export default QuickBuySubScreenHeader;
