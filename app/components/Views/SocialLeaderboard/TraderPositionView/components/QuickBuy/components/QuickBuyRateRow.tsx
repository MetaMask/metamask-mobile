import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextVariant,
  TextColor,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../../locales/i18n';
import { useQuickBuyContext } from '../useQuickBuyContext';

const QuickBuyRateRow: React.FC = () => {
  const {
    formattedRate,
    formattedExchangeRate,
    setActiveScreen,
    isPriceImpactError,
  } = useQuickBuyContext();

  const rateLabel = formattedRate ?? formattedExchangeRate;

  if (!rateLabel && !isPriceImpactError) {
    return null;
  }

  const displayLabel = isPriceImpactError
    ? strings('bridge.price_impact_warning_title')
    : rateLabel;

  const textColor = isPriceImpactError
    ? TextColor.ErrorDefault
    : TextColor.TextDefault;

  const iconColor = isPriceImpactError
    ? IconColor.ErrorDefault
    : IconColor.IconDefault;

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="pb-5"
      testID="quick-buy-rate-row"
    >
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {strings('social_leaderboard.quick_buy.rate')}
      </Text>

      <TouchableOpacity
        onPress={() => setActiveScreen('quoteDetails')}
        activeOpacity={0.7}
        accessibilityRole="button"
        testID="quick-buy-rate-row-pressable"
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={2}
        >
          <Text variant={TextVariant.BodySm} color={textColor}>
            {displayLabel}
          </Text>
          <Icon
            name={IconName.ArrowRight}
            size={IconSize.Sm}
            color={iconColor}
          />
        </Box>
      </TouchableOpacity>
    </Box>
  );
};

export default QuickBuyRateRow;
