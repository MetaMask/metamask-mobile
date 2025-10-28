import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useEffect, useRef } from 'react';
import { Animated, TouchableOpacity } from 'react-native';
import { PerpsAmountDisplaySelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';

interface PredictAmountDisplayProps {
  amount: string;
  onPress?: () => void;
  isActive?: boolean;
  hasError?: boolean;
}

const PredictAmountDisplay: React.FC<PredictAmountDisplayProps> = ({
  amount,
  onPress,
  isActive = false,
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
      twClassName="px-6"
      testID={PerpsAmountDisplaySelectorsIDs.CONTAINER}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
      >
        {/* Text only takes 1 arg */}
        <Text
          testID={PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL}
          color={hasError ? TextColor.Error : TextColor.Default}
          variant={TextVariant.BodyMDMedium}
          style={tw.style(
            'text-[64px] tracking-tight leading-[74px] font-medium',
          )}
        >
          {`$${amount}` || '$0'}
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
