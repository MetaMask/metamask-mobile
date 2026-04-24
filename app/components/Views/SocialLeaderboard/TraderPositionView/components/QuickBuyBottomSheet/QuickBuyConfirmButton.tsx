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
  disabled: {
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
  const { colors } = useTheme();
  const checkScale = useSharedValue(0);

  useEffect(() => {
    checkScale.value =
      state === 'success' ? withTiming(1, { duration: 200 }) : 0;
  }, [state, checkScale]);

  const checkmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: colors.primary.default },
        state === 'idle' && isDisabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={state !== 'idle' || isDisabled}
      testID={testID}
      activeOpacity={0.8}
    >
      {state === 'loading' && (
        <ActivityIndicator size="small" color={colors.primary.inverse} />
      )}
      {state === 'success' && (
        <Animated.View style={checkmarkStyle}>
          <Icon
            name={IconName.CheckBold}
            size={IconSize.Lg}
            color={colors.primary.inverse}
          />
        </Animated.View>
      )}
      {state === 'idle' && (
        <Text style={[styles.label, { color: colors.primary.inverse }]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export default QuickBuyConfirmButton;
