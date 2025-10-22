/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity as RNTouchableOpacity,
  TouchableOpacityProps,
  Platform,
  GestureResponderEvent,
  AccessibilityInfo,
} from 'react-native';

// External dependencies.
import Text from '../../../../Texts/Text';
import Icon from '../../../../Icons/Icon';
import { useStyles } from '../../../../../hooks';

// Internal dependencies.
import { ButtonBaseProps } from './ButtonBase.types';
import styleSheet from './ButtonBase.styles';
import {
  DEFAULT_BUTTONBASE_LABEL_COLOR,
  DEFAULT_BUTTONBASE_SIZE,
  DEFAULT_BUTTONBASE_WIDTH,
  DEFAULT_BUTTONBASE_ICON_SIZE,
  DEFAULT_BUTTONBASE_LABEL_TEXTVARIANT,
} from './ButtonBase.constants';
import {
  Pressable,
  Gesture,
  GestureDetector,
  type GestureStateChangeEvent,
  type TapGestureHandlerEventPayload,
} from 'react-native-gesture-handler';

export const TouchableOpacity = ({
  onPress,
  disabled,
  children,
  ...props
}: TouchableOpacityProps & {
  children?: React.ReactNode;
}) => {
  // Handle both 'disabled' and 'isDisabled' props for compatibility
  const isDisabled = disabled || (props as { isDisabled?: boolean }).isDisabled;

  return (
    <RNTouchableOpacity
      disabled={isDisabled}
      onPress={isDisabled ? undefined : onPress}
      {...props}
    >
      {children}
    </RNTouchableOpacity>
  );
};

const ButtonBase = ({
  label,
  labelColor = DEFAULT_BUTTONBASE_LABEL_COLOR,
  labelTextVariant = DEFAULT_BUTTONBASE_LABEL_TEXTVARIANT,
  startIconName,
  endIconName,
  size = DEFAULT_BUTTONBASE_SIZE,
  onPress,
  style,
  width = DEFAULT_BUTTONBASE_WIDTH,
  isDisabled,
  ...props
}: ButtonBaseProps) => {
  const { styles } = useStyles(styleSheet, {
    style,
    size,
    width,
    isDisabled,
  });

  // Disable gesture wrapper in test environments to prevent test interference
  const isE2ETest =
    process.env.IS_TEST === 'true' ||
    process.env.METAMASK_ENVIRONMENT === 'e2e';
  const isUnitTest = process.env.NODE_ENV === 'test';
  const TouchableComponent =
    Platform.OS === 'android' && !isE2ETest && !isUnitTest
      ? TouchableOpacity
      : RNTouchableOpacity;

  return (
    <TouchableComponent
      disabled={isDisabled}
      activeOpacity={1}
      onPress={isDisabled ? undefined : onPress}
      style={styles.base}
      accessibilityRole="button"
      accessible
      {...props}
    >
      {startIconName && (
        <Icon
          color={labelColor.toString()}
          name={startIconName}
          size={DEFAULT_BUTTONBASE_ICON_SIZE}
          style={styles.startIcon}
        />
      )}
      {typeof label === 'string' ? (
        <Text
          variant={labelTextVariant}
          style={styles.label}
          accessibilityRole="none"
        >
          {label}
        </Text>
      ) : (
        label
      )}
      {endIconName && (
        <Icon
          color={labelColor.toString()}
          name={endIconName}
          size={DEFAULT_BUTTONBASE_ICON_SIZE}
          style={styles.endIcon}
        />
      )}
    </TouchableComponent>
  );
};

export default ButtonBase;
