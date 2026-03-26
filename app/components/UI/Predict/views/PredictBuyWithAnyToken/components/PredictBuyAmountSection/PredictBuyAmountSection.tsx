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
import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../../../locales/i18n';
import Skeleton from '../../../../../../../component-library/components/Skeleton/Skeleton';
import { formatPrice } from '../../../../utils/format';
import PredictAmountDisplay from '../../../../components/PredictAmountDisplay';
import type { PredictKeypadHandles } from '../../../../components/PredictKeypad';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../../../../component-library/components/Texts/SensitiveText';
import {
  TextVariant as ComponentTextVariant,
} from '../../../../../../../component-library/components/Texts/Text/Text.types';
import { selectPrivacyMode } from '../../../../../../../selectors/preferencesController';

interface PredictBuyAmountSectionProps {
  currentValueUSDString: string;
  keypadRef: React.RefObject<PredictKeypadHandles>;
  isInputFocused: boolean;
  isBalanceLoading: boolean;
  isBalancePulsing: boolean;
  availableBalanceDisplay: string;
  toWin: number;
  isShowingToWinSkeleton: boolean;
}

const PredictBuyAmountSection = ({
  currentValueUSDString,
  keypadRef,
  isInputFocused,
  isBalanceLoading,
  isBalancePulsing,
  availableBalanceDisplay,
  toWin,
  isShowingToWinSkeleton,
}: PredictBuyAmountSectionProps) => {
  const tw = useTailwind();
  const privacyMode = useSelector(selectPrivacyMode);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isBalancePulsing) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      animation.start();
      return () => animation.stop();
    }
    pulseAnim.setValue(1);
    return undefined;
  }, [isBalancePulsing, pulseAnim]);

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
          <Animated.View style={{ opacity: pulseAnim }}>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              twClassName="text-center"
            >
              {`${strings('predict.order.available')}: `}
            </Text>
            <SensitiveText
              variant={ComponentTextVariant.BodyMd}
              isHidden={privacyMode}
              length={SensitiveTextLength.Medium}
              style={tw.style('text-center text-alternative')}
            >
              {availableBalanceDisplay}
            </SensitiveText>
          </Animated.View>
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
          <SensitiveText
            variant={ComponentTextVariant.BodyLg}
            isHidden={privacyMode}
            length={SensitiveTextLength.Medium}
            style={tw.style('font-medium text-success-default')}
          >
            {formatPrice(toWin, {
              minimumDecimals: 2,
              maximumDecimals: 2,
            })}
          </SensitiveText>
        )}
      </Box>
    </>
  );
};

export default PredictBuyAmountSection;
