/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { Pressable, View, Animated } from 'react-native';

// External dependencies.
import Icon, { IconSize, IconColor } from '../../components/Icons/Icon';
import Text, { TextVariant, TextColor } from '../../components/Texts/Text';
import { useAnimatedPressable, useStyles } from '../../hooks';

// Internal dependencies.
import { MainActionButtonProps } from './MainActionButton.types';
import styleSheet from './MainActionButton.styles';

/**
 * @deprecated Please update your code to use `MainActionButton` from `@metamask/design-system-react-native`.
 * The API may have changed — compare props before migrating.
 * @see {@link https://github.com/MetaMask/metamask-design-system/blob/main/packages/design-system-react-native/src/components/MainActionButton/README.md}
 * @since @metamask/design-system-react-native@0.11.0
 */
const MainActionButton = ({
  iconName,
  label,
  onPress,
  onPressIn,
  onPressOut,
  style,
  containerStyle,
  isDisabled = false,
  ...props
}: MainActionButtonProps) => {
  const { styles } = useStyles(styleSheet, {
    style,
    isDisabled,
  });

  const { scaleAnim, handlePressIn, handlePressOut } = useAnimatedPressable({
    onPressIn: onPressIn ?? undefined,
    onPressOut: onPressOut ?? undefined,
  });

  return (
    <Animated.View
      style={[{ transform: [{ scale: scaleAnim }] }, containerStyle]}
    >
      <Pressable
        style={({ pressed }) => [styles.base, pressed && styles.pressed]}
        onPress={!isDisabled ? onPress : undefined}
        onPressIn={!isDisabled ? handlePressIn : undefined}
        onPressOut={!isDisabled ? handlePressOut : undefined}
        disabled={isDisabled}
        {...props}
      >
        <View style={styles.container}>
          <Icon
            name={iconName}
            size={IconSize.Lg}
            color={IconColor.Alternative}
          />
          <Text
            variant={TextVariant.BodySMMedium}
            color={TextColor.Default}
            style={styles.label}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {label}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

export default MainActionButton;
