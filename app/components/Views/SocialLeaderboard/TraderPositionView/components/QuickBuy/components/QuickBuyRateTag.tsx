import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Text,
  TextVariant,
  TextColor,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../../locales/i18n';

interface QuickBuyRateTagProps {
  label: string | undefined;
  onPress?: () => void;
  isHighPriceImpact?: boolean;
}

const QuickBuyRateTag: React.FC<QuickBuyRateTagProps> = ({
  label,
  onPress,
  isHighPriceImpact = false,
}) => {
  if (!label && !isHighPriceImpact) return null;

  const displayLabel = isHighPriceImpact
    ? strings('bridge.price_impact_warning_title')
    : label;

  const textColor = isHighPriceImpact
    ? TextColor.ErrorDefault
    : TextColor.TextAlternative;

  const iconColor = isHighPriceImpact
    ? IconColor.ErrorDefault
    : IconColor.IconAlternative;

  const content = (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={1}
    >
      <Text variant={TextVariant.BodyXs} color={textColor}>
        {displayLabel}
      </Text>
      <Icon name={IconName.ArrowRight} size={IconSize.Sm} color={iconColor} />
    </Box>
  );

  return (
    <Box
      twClassName={
        isHighPriceImpact
          ? 'rounded-md bg-error-muted px-3 py-1'
          : 'rounded-md bg-muted px-3 py-1'
      }
      testID="quick-buy-rate-tag"
    >
      {onPress ? (
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          testID="quick-buy-rate-tag-pressable"
        >
          {content}
        </TouchableOpacity>
      ) : (
        content
      )}
    </Box>
  );
};

export default QuickBuyRateTag;
