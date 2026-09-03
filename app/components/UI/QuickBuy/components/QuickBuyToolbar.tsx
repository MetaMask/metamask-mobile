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
  const {
    features,
    hasSellableBalance,
    isQuickAmountPreferencesLoaded,
    onClose,
    setActiveScreen,
  } = useQuickBuyContext();

  const showFullToggle = features.tradeModes.length > 1 && hasSellableBalance;
  const showSettings = features.quickAmountPills;

  return (
    <Box
      twClassName="px-4 pt-4 pb-3"
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
    >
      {showSettings ? (
        <ButtonIcon
          iconName={DsIconName.Setting}
          size={ButtonIconSize.Md}
          isDisabled={!isQuickAmountPreferencesLoaded}
          onPress={() => setActiveScreen('editQuickAmounts')}
          testID="quick-buy-edit-amounts-button"
        />
      ) : (
        // Keep the toggle optically centered when settings is hidden.
        <Box twClassName="w-6 h-6" />
      )}

      {/* Hide the header control when Buy is the only option — a lone "Buy"
          pill is redundant next to the primary Buy CTA. */}
      {showFullToggle ? <QuickBuyTradeModeToggle /> : null}

      <ButtonIcon
        iconName={DsIconName.Close}
        size={ButtonIconSize.Md}
        onPress={onClose}
        testID="quick-buy-close-button"
      />
    </Box>
  );
};

export default QuickBuyToolbar;
