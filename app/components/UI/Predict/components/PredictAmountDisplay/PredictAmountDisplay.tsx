import React, { useEffect, useRef } from 'react';
import { Animated, Platform, TouchableOpacity } from 'react-native';
import { PerpsAmountDisplaySelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { formatPrice, formatPositionSize } from '../../utils/format';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';

interface PredictAmountDisplayProps {
  amount: string;
  showWarning?: boolean;
  warningMessage?: string;
  onPress?: () => void;
  isActive?: boolean;
  label?: string;
  showTokenAmount?: boolean;
  tokenAmount?: string;
  tokenSymbol?: string;
  showMaxAmount?: boolean;
  hasError?: boolean;
}

const PredictAmountDisplay: React.FC<PredictAmountDisplayProps> = ({
  amount,
  showWarning = false,
  warningMessage = 'No funds available. Please deposit first.',
  onPress,
  isActive = false,
  label,
  showTokenAmount = false,
  tokenAmount,
  tokenSymbol,
  showMaxAmount = true,
  hasError = false,
}) => {
  const tw = useTailwind();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      // Start blinking animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      // Stop animation and hide cursor
      fadeAnim.setValue(0);
    }
  }, [isActive, fadeAnim]);

  const content = (
    <Box
      alignItems={BoxAlignItems.Center}
      twClassName="pt-12 px-6"
      testID={PerpsAmountDisplaySelectorsIDs.CONTAINER}
    >
      {label && (
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          style={tw.style('mb-2')}
        >
          {label}
        </Text>
      )}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
      >
        {/* Text only takes 1 arg */}
        <Text
          testID={PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL}
          color={hasError ? TextColor.Error : TextColor.Default}
          variant={TextVariant.BodyMDBold}
          style={tw.style(
            'text-[54px] tracking-tight leading-[74px]',
            Platform.OS === 'android' ? 'font-medium' : 'font-black',
          )}
        >
          {showTokenAmount && tokenAmount && tokenSymbol
            ? `${formatPositionSize(tokenAmount)} ${tokenSymbol}`
            : amount
            ? formatPrice(amount, { minimumDecimals: 0, maximumDecimals: 2 })
            : '$0'}
        </Text>
        {isActive && (
          <Animated.View
            testID="cursor"
            style={[
              tw.style('w-0.5 h-[54px] ml-1 bg-default'),
              {
                opacity: fadeAnim,
              },
            ]}
          />
        )}
      </Box>
      {/* Display token amount equivalent for current input */}
      {showMaxAmount && tokenAmount && tokenSymbol && (
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          style={tw.style('mt-1')}
          testID={PerpsAmountDisplaySelectorsIDs.MAX_LABEL}
        >
          {formatPositionSize(tokenAmount)} {tokenSymbol}
        </Text>
      )}
      {showWarning && (
        <Text
          variant={TextVariant.BodySM}
          color={TextColor.Warning}
          style={tw.style('mt-3')}
        >
          {warningMessage}
        </Text>
      )}
    </Box>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

export default PredictAmountDisplay;
