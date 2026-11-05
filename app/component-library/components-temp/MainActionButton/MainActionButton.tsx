/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View, Animated, Pressable } from 'react-native';

// External dependencies.
import Icon, { IconSize, IconColor } from '../../components/Icons/Icon';
import Text, { TextVariant, TextColor } from '../../components/Texts/Text';
import { useAnimatedPressable, useStyles } from '../../hooks';

// Internal dependencies.
import { MainActionButtonProps } from './MainActionButton.types';
import styleSheet from './MainActionButton.styles';
import RaisedSheenSurface from '../elevation/RaisedSheenSurface';
import {
  MAINACTIONBUTTON_CONTENT_TEST_ID,
  MAINACTIONBUTTON_GLASS_TEST_ID,
} from './MainActionButton.constants';

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
  isGlass: _isGlass = false,
  isRaisedPlate = false,
  testID,
  ...props
}: MainActionButtonProps) => {
  const { styles } = useStyles(styleSheet, {
    style,
    isDisabled,
    isRaisedPlate,
  });

  const { scaleAnim, handlePressIn, handlePressOut } = useAnimatedPressable({
    onPressIn: onPressIn ?? undefined,
    onPressOut: onPressOut ?? undefined,
  });

  const content = (
    <View
      style={[
        styles.container,
        isRaisedPlate && isDisabled && styles.disabledGlassContent,
      ]}
      testID={MAINACTIONBUTTON_CONTENT_TEST_ID}
    >
      <Icon name={iconName} size={IconSize.Lg} color={IconColor.Alternative} />
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
  );

  return (
    <Animated.View
      style={[containerStyle, { transform: [{ scale: scaleAnim }] }]}
    >
      <Pressable
        testID={testID}
        accessible
        style={styles.base}
        onPress={!isDisabled ? onPress : undefined}
        onPressIn={!isDisabled ? handlePressIn : undefined}
        onPressOut={!isDisabled ? handlePressOut : undefined}
        disabled={isDisabled}
        {...props}
      >
        {isRaisedPlate ? (
          <RaisedSheenSurface
            radiusClassName="rounded-2xl"
            style={styles.glassContent}
            testID={MAINACTIONBUTTON_GLASS_TEST_ID}
          >
            {content}
          </RaisedSheenSurface>
        ) : (
          content
        )}
      </Pressable>
    </Animated.View>
  );
};

export default MainActionButton;
