import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useTheme } from '../../../../../../util/theme';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';

export type ConfirmButtonState = 'idle' | 'loading' | 'success';

const styles = StyleSheet.create({
  container: {
    height: 48,
    width: '100%',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactive: {
    opacity: 0.5,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
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
  hasValidAmount,
  isDisabled,
  onPress,
  testID,
}) => {
  const { colors } = useTheme();
  const checkScale = useSharedValue(0);

  useEffect(() => {
    checkScale.value =
      state === 'success' ? withTiming(1, { duration: 200 }) : 0;
  }, [state, checkScale]);

  const checkmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const backgroundColor = hasValidAmount
    ? colors.background.default
    : colors.background.muted;
  const labelColor = colors.text.default;
  const showInactiveStyle = hasValidAmount && isDisabled && state === 'idle';

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor },
        showInactiveStyle && styles.inactive,
      ]}
      onPress={onPress}
      disabled={state !== 'idle' || isDisabled}
      testID={testID}
      activeOpacity={0.8}
    >
      {state === 'loading' && (
        <ActivityIndicator size="small" color={labelColor} />
      )}
      {state === 'success' && (
        <Animated.View style={checkmarkStyle}>
          <Icon
            name={IconName.CheckBold}
            size={IconSize.Lg}
            color={labelColor}
          />
        </Animated.View>
      )}
      {state === 'idle' && (
        <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};

export default QuickBuyConfirmButton;
