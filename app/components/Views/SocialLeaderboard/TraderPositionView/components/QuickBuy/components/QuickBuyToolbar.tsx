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
import { strings } from '../../../../../../../../locales/i18n';
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
      // Buy-only drops the taller segmented control — tighten bottom padding
      // so the amount sits closer to the title.
      twClassName={showFullToggle ? 'px-4 pt-4 pb-3' : 'px-4 pt-4 pb-1'}
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
        // Keep the title/toggle optically centered when settings is hidden.
        <Box twClassName="w-6 h-6" />
      )}

      {/* Buy/Sell control only when both modes are available. Buy-only shows a
          plain title so the header stays balanced without a redundant pill. */}
      {showFullToggle ? (
        <QuickBuyTradeModeToggle />
      ) : (
        <Text
          variant={TextVariant.HeadingSm}
          fontWeight={FontWeight.Bold}
          color={TextColor.TextDefault}
          testID="quick-buy-buy-only-title"
        >
          {strings('social_leaderboard.quick_buy.buy_label')}
        </Text>
      )}

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
