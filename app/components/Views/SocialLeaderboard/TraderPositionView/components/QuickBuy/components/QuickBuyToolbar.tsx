import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  IconName as DsIconName,
} from '@metamask/design-system-react-native';
import QuickBuyTradeModeToggle from './QuickBuyTradeModeToggle';
import { useQuickBuyContext } from '../useQuickBuyContext';

const QuickBuyToolbar: React.FC = () => {
  const { features, hasSellableBalance, setActiveScreen } =
    useQuickBuyContext();

  const showFullToggle = features.tradeModes.length > 1 && hasSellableBalance;

  return (
    <Box
      twClassName="px-4 pt-2 pb-3"
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
    >
      <QuickBuyTradeModeToggle buyOnly={!showFullToggle} />

      {features.quickAmountPills ? (
        <ButtonIcon
          iconName={DsIconName.Setting}
          size={ButtonIconSize.Md}
          onPress={() => setActiveScreen('editQuickAmounts')}
          testID="quick-buy-edit-amounts-button"
        />
      ) : (
        <Box />
      )}
    </Box>
  );
};

export default QuickBuyToolbar;
