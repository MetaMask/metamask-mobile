/* eslint-disable react/prop-types */

/**
 * @deprecated Please update your code to use `ButtonIcon` from `@metamask/design-system-react-native`
 */

// Third party dependencies.
import React, { useCallback, useState } from 'react';
import { GestureResponderEvent } from 'react-native';

// External dependencies.
import TouchableOpacity from '../../../../components/Base/TouchableOpacity';
import Icon from '../../Icons/Icon';
import { useStyles } from '../../../hooks';

// Internal dependencies.
import { ButtonIconProps } from './ButtonIcon.types';
import stylesheet from './ButtonIcon.styles';
import {
  DEFAULT_BUTTONICON_SIZE,
  DEFAULT_BUTTONICON_ICONCOLOR,
  ICONSIZE_BY_BUTTONICONSIZE,
} from './ButtonIcon.constants';

const ButtonIcon = ({
  iconName,
  onPress,
  onPressIn,
  onPressOut,
  style,
  size = DEFAULT_BUTTONICON_SIZE,
  iconColor = DEFAULT_BUTTONICON_ICONCOLOR,
  isDisabled = false,
  ...props
}: ButtonIconProps) => {
  const [pressed, setPressed] = useState(false);
  const { styles } = useStyles(stylesheet, {
    style,
    size,
    pressed,
    isDisabled,
  });

  const triggerOnPressedIn = useCallback(
    (e: GestureResponderEvent) => {
      setPressed(true);
      onPressIn?.(e);
    },
    [setPressed, onPressIn],
  );

  const triggerOnPressedOut = useCallback(
    (e: GestureResponderEvent) => {
      setPressed(false);
      onPressOut?.(e);
    },
    [setPressed, onPressOut],
  );

  return (
    <TouchableOpacity
      style={styles.base}
      onPress={!isDisabled ? onPress : undefined}
      onPressIn={!isDisabled ? triggerOnPressedIn : undefined}
      onPressOut={!isDisabled ? triggerOnPressedOut : undefined}
      accessible
      activeOpacity={1}
      disabled={isDisabled}
      {...props}
    >
      <Icon
        name={iconName}
        size={ICONSIZE_BY_BUTTONICONSIZE[size]}
        color={iconColor}
      />
    </TouchableOpacity>
  );
};

export default ButtonIcon;
