import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';
import {
  Box,
  ButtonBase,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import type { QuickBuyTradeMode } from './types';

export type ConfirmButtonState = 'idle' | 'loading' | 'success';

const styles = StyleSheet.create({
  successContainer: {
    height: 48,
    width: '100%',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

interface QuickBuyConfirmButtonProps {
  state: ConfirmButtonState;
  label: string;
  hasValidAmount: boolean;
  isDisabled: boolean;
  onPress: () => void;
  /** Buy uses success (lime); sell uses error (red). */
  tradeMode?: QuickBuyTradeMode;
  testID?: string;
}

/**
 * Confirm CTA colors follow Figma Trade ButtonHero fills:
 * buy → success-default (#baf24a in dark), sell → error-default.
 * Do not use design-system ButtonHero here — its locked light primary is blue.
 */
const QuickBuyConfirmButton: React.FC<QuickBuyConfirmButtonProps> = ({
  state,
  label,
  isDisabled,
  onPress,
  tradeMode = 'buy',
  testID,
}) => {
  const tw = useTailwind();
  const checkScale = useSharedValue(0);
  const isSell = tradeMode === 'sell';
  const buttonDisabled = state !== 'idle' || isDisabled;
  const bgClass = isSell ? 'bg-error-default' : 'bg-success-default';
  const textClass = isSell ? 'text-error-inverse' : 'text-success-inverse';

  useEffect(() => {
    checkScale.value =
      state === 'success' ? withTiming(1, { duration: 200 }) : 0;
  }, [state, checkScale]);

  const checkmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  if (state === 'success') {
    return (
      <Box style={[styles.successContainer, tw.style(bgClass)]} testID={testID}>
        <Animated.View style={checkmarkStyle}>
          <Icon
            name={IconName.CheckBold}
            size={IconSize.Lg}
            color={tw.style(textClass).color as string}
          />
        </Animated.View>
      </Box>
    );
  }

  return (
    <ButtonBase
      size={ButtonSize.Lg}
      isLoading={state === 'loading'}
      onPress={onPress}
      isFullWidth
      testID={testID}
      isDisabled={buttonDisabled}
      twClassName={(pressed) =>
        `${bgClass}${pressed && !buttonDisabled && state === 'idle' ? ' opacity-90' : ''}`
      }
      textClassName={() => textClass}
    >
      {label}
    </ButtonBase>
  );
};

export default QuickBuyConfirmButton;
