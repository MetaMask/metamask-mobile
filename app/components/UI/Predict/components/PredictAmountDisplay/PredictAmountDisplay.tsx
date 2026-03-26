import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useEffect, useRef } from 'react';
import { Animated, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import { PerpsAmountDisplaySelectorsIDs } from '../../../Perps/Perps.testIds';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../../component-library/components/Texts/SensitiveText';
import {
  TextVariant as ComponentTextVariant,
} from '../../../../../component-library/components/Texts/Text/Text.types';
import { useTheme } from '../../../../../util/theme';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { PREDICT_AMOUNT_DISPLAY_TEST_IDS } from './PredictAmountDisplay.testIds';

interface PredictAmountDisplayProps {
  amount: string;
  onPress?: () => void;
  isActive?: boolean;
  hasError?: boolean;
}

const getFontSizeForInputLength = (contentLength: number) => {
  if (contentLength <= 8) {
    return 60;
  }
  if (contentLength <= 10) {
    return 48;
  }
  if (contentLength <= 12) {
    return 32;
  }
  if (contentLength <= 14) {
    return 24;
  }
  if (contentLength <= 18) {
    return 18;
  }
  return 12;
};

const PredictAmountDisplay: React.FC<PredictAmountDisplayProps> = ({
  amount,
  onPress,
  isActive = false,
  hasError = false,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const privacyMode = useSelector(selectPrivacyMode);
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

  const amountValue = amount ? `$${amount}` : '$0';
  const fontSize = getFontSizeForInputLength(amountValue.length);
  const lineHeight = fontSize + 10; // Add 10px to font size for line height

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
        {/* SensitiveText takes 1 arg */}
        <SensitiveText
          testID={PerpsAmountDisplaySelectorsIDs.AMOUNT_LABEL}
          variant={ComponentTextVariant.BodyMDMedium}
          isHidden={privacyMode}
          length={amountValue.length > 8 ? SensitiveTextLength.Long : SensitiveTextLength.Medium}
          style={tw.style(
            `text-[${fontSize}px] tracking-tight leading-[${lineHeight}px] font-medium px-2`,
            hasError && 'text-error',
          )}
        >
          {amountValue}
        </SensitiveText>
        {isActive && (
          <Animated.View
            testID={PREDICT_AMOUNT_DISPLAY_TEST_IDS.CURSOR}
            style={[
              tw.style(`w-0.5 h-[${lineHeight - 4}px] ml-0.5`),
              {
                opacity: fadeAnim,
                backgroundColor: colors.text.default,
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
