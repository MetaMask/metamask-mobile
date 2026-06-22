import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '@metamask/design-system-react-native';
import QuickBuyTradeModeToggle from './QuickBuyTradeModeToggle';
import { useQuickBuyContext } from '../useQuickBuyContext';

const QuickBuyToolbar: React.FC = () => {
  const { onClose, features, hasSellableBalance } = useQuickBuyContext();

  const showFullToggle = features.tradeModes.length > 1 && hasSellableBalance;

  return (
    <Box
      twClassName="px-4 pt-2 pb-3"
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
    >
      <QuickBuyTradeModeToggle buyOnly={!showFullToggle} />

      <ButtonIcon
        iconName={IconName.Close}
        size={ButtonIconSize.Md}
        onPress={onClose}
        testID="quick-buy-close-button"
      />
    </Box>
  );
};

export default QuickBuyToolbar;
