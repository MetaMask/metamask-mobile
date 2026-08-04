import React from 'react';
import { Animated } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Skeleton,
  Text,
  TextColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { getCurrencySymbol } from '../../../../../../util/number';
import { formatAmountWithLocaleSeparators } from '../../../../../UI/Bridge/utils/formatAmountWithLocaleSeparators';
import { useSelector } from 'react-redux';
import { selectCurrentCurrency } from '../../../../../../selectors/currencyRateController';
import {
  useIsTransactionPayLoading,
  useTransactionPayIsMaxAmount,
} from '../../../hooks/pay/useTransactionPayData';
import { useConfirmationContext } from '../../../context/confirmation-context';
import { useBlinkingCursor } from '../../../../../UI/Ramp/hooks/useBlinkingCursor';

export interface CustomAmountProps {
  amountFiat: string;
  currency?: string;
  disabled?: boolean;
  hasAlert?: boolean;
  isLoading?: boolean;
  onPress?: () => void;
  showCursor?: boolean;
}

function getFontSize(length: number) {
  if (length <= 8) return 64;
  if (length <= 13) return 40;
  if (length <= 18) return 30;
  return 20;
}

export const CustomAmount: React.FC<CustomAmountProps> = React.memo((props) => {
  const {
    amountFiat,
    currency: currencyProp,
    disabled: disabledProp = false,
    hasAlert = false,
    isLoading,
    onPress,
    showCursor = true,
  } = props;

  const tw = useTailwind();
  const { isHeadlessBuyInProgress } = useConfirmationContext();
  const disabled = disabledProp || isHeadlessBuyInProgress;
  const isMaxAmount = useTransactionPayIsMaxAmount();
  const isQuotesLoading = useIsTransactionPayLoading();
  const selectedCurrency = useSelector(selectCurrentCurrency);
  const currency = currencyProp ?? selectedCurrency;
  const fiatSymbol = getCurrencySymbol(currency);
  const formattedAmount = formatAmountWithLocaleSeparators(amountFiat);
  const amountLength = formattedAmount.length;
  const fontSize = getFontSize(amountLength);

  const showLoader = isLoading || (isMaxAmount && isQuotesLoading);
  const cursorVisible = showCursor && !disabled && !showLoader;
  const cursorOpacity = useBlinkingCursor(cursorVisible);

  const amountColor = hasAlert
    ? TextColor.ErrorDefault
    : disabled
      ? TextColor.TextMuted
      : TextColor.TextDefault;

  const amountTextStyle = tw.style({
    textAlign: 'center',
    fontSize,
    lineHeight: fontSize * 1.1,
    fontWeight: '500',
  });

  if (showLoader) {
    return <CustomAmountSkeleton />;
  }

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      justifyContent={BoxJustifyContent.Center}
      alignItems={BoxAlignItems.Center}
      twClassName="min-h-[70px]"
    >
      <Text
        testID="custom-amount-symbol"
        color={amountColor}
        style={amountTextStyle}
      >
        {fiatSymbol}
      </Text>
      <Text
        testID="custom-amount-input"
        color={amountColor}
        style={amountTextStyle}
        onPress={disabled ? undefined : onPress}
      >
        {formattedAmount}
      </Text>
      {cursorVisible && (
        <Animated.View
          testID="custom-amount-cursor"
          style={[
            tw.style({
              width: 1,
              height: Math.round(fontSize * 0.7),
              transform: [{ translateY: Math.round(fontSize * -0.08) }],
            }),
            tw`bg-primary-default`,
            { opacity: cursorOpacity },
          ]}
        />
      )}
    </Box>
  );
});

export function CustomAmountSkeleton() {
  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      justifyContent={BoxJustifyContent.Center}
      alignItems={BoxAlignItems.Center}
      twClassName="min-h-[70px]"
      testID="custom-amount-skeleton"
    >
      <Skeleton height={70} width={80} />
    </Box>
  );
}
