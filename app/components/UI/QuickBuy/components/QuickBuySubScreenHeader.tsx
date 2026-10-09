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
}

const QuickBuySubScreenHeader: React.FC<QuickBuySubScreenHeaderProps> = ({
  title,
  onBack,
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
    {/* Same size as the back button so the title stays centered. */}
    <Box twClassName="h-8 w-8" />
  </Box>
);

export default QuickBuySubScreenHeader;
