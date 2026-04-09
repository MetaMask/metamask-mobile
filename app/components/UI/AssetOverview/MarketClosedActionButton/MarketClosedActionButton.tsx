/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { Pressable, View, Animated } from 'react-native';

// External dependencies.
import Icon, {
  IconSize,
  IconColor,
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import {
  useAnimatedPressable,
  useStyles,
} from '../../../../component-library/hooks';

// Internal dependencies.
import { MarketClosedActionButtonProps } from './MarketClosedActionButton.types';
import styleSheet from './MarketClosedActionButton.styles';
import {
  MARKETCLOSED_ACTIONBUTTON_CLOCKICON_TEST_ID,
  MARKETCLOSED_ACTIONBUTTON_ICON_TEST_ID,
  MARKETCLOSED_ACTIONBUTTON_LABEL_TEST_ID,
} from './MarketClosedActionButton.constants';

const MarketClosedActionButton = ({
  iconName,
  label,
  onPress,
  onPressIn,
  onPressOut,
  style,
  ...props
}: MarketClosedActionButtonProps) => {
  const { styles } = useStyles(styleSheet, {
    style,
  });

  const { scaleAnim, handlePressIn, handlePressOut } = useAnimatedPressable({
    onPressIn: onPressIn ?? undefined,
    onPressOut: onPressOut ?? undefined,
  });

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        style={({ pressed }) => [styles.base, pressed && styles.pressed]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessible
        {...props}
      >
        <View style={styles.container}>
          <Icon
            style={styles.clockIcon}
            name={IconName.AfterHours}
            size={IconSize.Lg}
            color={IconColor.Alternative}
            testID={MARKETCLOSED_ACTIONBUTTON_CLOCKICON_TEST_ID}
          />
          <Text
            variant={TextVariant.BodyMDMedium}
            color={TextColor.Default}
            style={styles.label}
            numberOfLines={1}
            ellipsizeMode="tail"
            testID={MARKETCLOSED_ACTIONBUTTON_LABEL_TEST_ID}
          >
            {label}
          </Text>
          <Icon
            style={styles.icon}
            name={iconName}
            size={IconSize.Lg}
            color={IconColor.Alternative}
            testID={MARKETCLOSED_ACTIONBUTTON_ICON_TEST_ID}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
};

export default MarketClosedActionButton;
