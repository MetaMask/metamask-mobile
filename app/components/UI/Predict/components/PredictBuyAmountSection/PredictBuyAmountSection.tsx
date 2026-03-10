import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';
import { formatPrice } from '../../utils/format';
import PredictAmountDisplay from '../PredictAmountDisplay';
import type { PredictKeypadHandles } from '../PredictKeypad';

interface PredictBuyAmountSectionProps {
  currentValueUSDString: string;
  keypadRef: React.RefObject<PredictKeypadHandles>;
  isInputFocused: boolean;
  isBalanceLoading: boolean;
  availableBalanceDisplay: string;
  toWin: number;
  isShowingToWinSkeleton: boolean;
}

const PredictBuyAmountSection = ({
  currentValueUSDString,
  keypadRef,
  isInputFocused,
  isBalanceLoading,
  availableBalanceDisplay,
  toWin,
  isShowingToWinSkeleton,
}: PredictBuyAmountSectionProps) => {
  const tw = useTailwind();

  return (
    <>
      <Box twClassName="text-center leading-[72px]">
        <PredictAmountDisplay
          amount={currentValueUSDString}
          onPress={() => keypadRef.current?.handleAmountPress()}
          isActive={isInputFocused}
          hasError={false}
        />
      </Box>
      <Box twClassName="text-center mt-2">
        {isBalanceLoading ? (
          <Skeleton width={120} height={20} />
        ) : (
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {`${strings('predict.order.available')}: `}
            {availableBalanceDisplay}
          </Text>
        )}
      </Box>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="mt-2"
      >
        <Text
          variant={TextVariant.BodyLg}
          twClassName="font-medium"
          color={TextColor.SuccessDefault}
        >
          {`${strings('predict.order.to_win')} `}
        </Text>
        {isShowingToWinSkeleton ? (
          <Skeleton width={80} height={24} style={tw.style('rounded-md')} />
        ) : (
          <Text
            variant={TextVariant.BodyLg}
            twClassName="font-medium"
            color={TextColor.SuccessDefault}
          >
            {formatPrice(toWin, {
              minimumDecimals: 2,
              maximumDecimals: 2,
            })}
          </Text>
        )}
      </Box>
    </>
  );
};

export default PredictBuyAmountSection;
