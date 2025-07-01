/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useRef } from 'react';
import {
  Pressable,
  View,
  Animated,
  GestureResponderEvent,
  Easing,
} from 'react-native';

// External dependencies.
import Icon, { IconSize, IconColor } from '../../components/Icons/Icon';
import Text, { TextVariant, TextColor } from '../../components/Texts/Text';
import { useStyles } from '../../hooks';

// Internal dependencies.
import { MainActionButtonProps } from './MainActionButton.types';
import styleSheet from './MainActionButton.styles';

const MainActionButton = ({
  iconName,
  label,
  onPress,
  onPressIn,
  onPressOut,
  style,
  isDisabled = false,
  ...props
}: MainActionButtonProps) => {
  const { styles } = useStyles(styleSheet, {
    style,
    isDisabled,
  });

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = (pressEvent: GestureResponderEvent) => {
    Animated.timing(scaleAnim, {
      toValue: 0.98,
      duration: 150,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
    onPressIn?.(pressEvent);
  };

  const handlePressOut = (pressEvent: GestureResponderEvent) => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 150,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
    onPressOut?.(pressEvent);
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        style={({ pressed }) => [styles.base, pressed && styles.pressed]}
        onPress={!isDisabled ? onPress : undefined}
        onPressIn={!isDisabled ? handlePressIn : undefined}
        onPressOut={!isDisabled ? handlePressOut : undefined}
        accessible
        disabled={isDisabled}
        {...props}
      >
        <View style={styles.container}>
          <Icon
            name={iconName}
            size={IconSize.Md}
            color={IconColor.Alternative}
          />
          <Text
            variant={TextVariant.BodySMMedium}
            color={TextColor.Default}
            style={styles.label}
          >
            {label}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

export default MainActionButton;
