import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';
import {
  Box,
  Button,
  ButtonBaseSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { brandColor } from '@metamask/design-tokens';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../../../util/theme';
import type { QuickBuyTradeMode } from './types';

export type ConfirmButtonState = 'idle' | 'loading' | 'success';

const styles = StyleSheet.create({
  successContainer: {
    height: 48,
    width: '100%',
    // Temporary override — match primary button pill until DS default updates.
    borderRadius: 99,
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
  tradeMode: QuickBuyTradeMode;
  testID?: string;
}

const QuickBuyConfirmButton: React.FC<QuickBuyConfirmButtonProps> = ({
  state,
  label,
  isDisabled,
  onPress,
  tradeMode,
  testID,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const actionColor =
    tradeMode === 'sell' ? brandColor.orange400 : colors.success.default;
  const checkScale = useSharedValue(0);

  useEffect(() => {
    checkScale.value =
      state === 'success' ? withTiming(1, { duration: 200 }) : 0;
  }, [state, checkScale]);

  const checkmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  if (state === 'success') {
    return (
      <Box
        style={[styles.successContainer, { backgroundColor: actionColor }]}
        testID={testID}
      >
        <Animated.View style={checkmarkStyle}>
          <Icon
            name={IconName.CheckBold}
            size={IconSize.Lg}
            color={tw.style('text-primary-inverse').color as string}
          />
        </Animated.View>
      </Box>
    );
  }

  return (
    <Button
      variant={ButtonVariant.Primary}
      size={ButtonBaseSize.Lg}
      isLoading={state === 'loading'}
      onPress={onPress}
      isFullWidth
      testID={testID}
      isDisabled={state !== 'idle' || isDisabled}
      // Temporary override — pill radius + buy/sell action colors.
      twClassName="rounded-[99px]"
      style={{ backgroundColor: actionColor }}
    >
      {label}
    </Button>
  );
};

export default QuickBuyConfirmButton;
