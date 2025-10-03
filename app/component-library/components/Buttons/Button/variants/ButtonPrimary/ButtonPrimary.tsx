/* eslint-disable react/prop-types */

/**
 * @deprecated Please update your code to use `Button` from `@metamask/design-system-react-native` with variant `ButtonVariant.Primary`
 */

// Third party dependencies.
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, GestureResponderEvent } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import Button from '../../foundation/ButtonBase';
import { default as TextComponent } from '../../../../Texts/Text/Text';
import { TextColor } from '../../../../Texts/Text';

// Internal dependencies.
import { ButtonPrimaryProps } from './ButtonPrimary.types';
import styleSheet from './ButtonPrimary.styles';
import { DEFAULT_BUTTONPRIMARY_LABEL_TEXTVARIANT } from './ButtonPrimary.constants';

const ButtonPrimary = ({
  style,
  onPressIn,
  onPressOut,
  isDanger = false,
  isInverse = false,
  label,
  ...props
}: ButtonPrimaryProps) => {
  const [pressed, setPressed] = useState(false);
  const { styles, theme } = useStyles(styleSheet, {
    style,
    isDanger,
    isInverse,
    pressed,
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

  // Determine text color based on state combinations
  const getTextColor = () => {
    if (isInverse && isDanger) {
      // Inverse + Danger: colors.error.default → colors.error.defaultPressed
      return pressed ? TextColor.ErrorAlternative : TextColor.Error;
    } else if (isInverse) {
      // Inverse: colors.text.default
      return TextColor.Default;
    }
    // Default Primary and Danger: colors.primary.inverse
    return TextColor.Inverse;
  };

  // Get the actual color value for ActivityIndicator
  const getActivityIndicatorColor = () => {
    if (isInverse && isDanger) {
      return pressed
        ? theme.colors.error.defaultPressed
        : theme.colors.error.default;
    } else if (isInverse) {
      return theme.colors.text.default;
    }
    return theme.colors.primary.inverse;
  };

  const textColor = getTextColor();

  const renderLabel = () =>
    typeof label === 'string' ? (
      <TextComponent
        variant={DEFAULT_BUTTONPRIMARY_LABEL_TEXTVARIANT}
        color={textColor}
      >
        {label}
      </TextComponent>
    ) : (
      label
    );

  const renderLoading = () => (
    <ActivityIndicator size="small" color={getActivityIndicatorColor()} />
  );

  return (
    <Button
      style={styles.base}
      label={!props.loading ? renderLabel() : renderLoading()}
      labelColor={textColor}
      onPressIn={triggerOnPressedIn}
      onPressOut={triggerOnPressedOut}
      {...props}
    />
  );
};

export default ButtonPrimary;
