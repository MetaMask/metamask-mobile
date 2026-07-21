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
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';

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
  testID?: string;
}

const QuickBuyConfirmButton: React.FC<QuickBuyConfirmButtonProps> = ({
  state,
  label,
  isDisabled,
  onPress,
  testID,
}) => {
  const tw = useTailwind();
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
        style={[styles.successContainer, tw.style('bg-icon-default')]}
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
    >
      {label}
    </Button>
  );
};

export default QuickBuyConfirmButton;
