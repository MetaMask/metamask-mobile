/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, GestureResponderEvent } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import Button from '../../foundation/ButtonBase';
import { default as TextComponent } from '../../../../Texts/Text/Text';
import { TextColor } from '../../../../Texts/Text';

// Internal dependencies.
import { ButtonSecondaryProps } from './ButtonSecondary.types';
import styleSheet from './ButtonSecondary.styles';
import { DEFAULT_BUTTONSECONDARY_LABEL_TEXTVARIANT } from './ButtonSecondary.constants';

const ButtonSecondary = ({
  style,
  onPressIn,
  onPressOut,
  isDanger = false,
  isInverse = false,
  label,
  labelTextVariant = DEFAULT_BUTTONSECONDARY_LABEL_TEXTVARIANT,
  ...props
}: ButtonSecondaryProps) => {
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
      // Inverse: colors.primary.inverse
      return TextColor.Inverse;
    } else if (isDanger) {
      // Danger: colors.error.default → colors.error.defaultPressed
      return pressed ? TextColor.ErrorAlternative : TextColor.Error;
    }
    // Default: colors.text.default
    return TextColor.Default;
  };

  // Get the actual color value for ActivityIndicator
  const getActivityIndicatorColor = () => {
    if (isInverse && isDanger) {
      return pressed
        ? theme.colors.error.defaultPressed
        : theme.colors.error.default;
    } else if (isInverse) {
      return theme.colors.primary.inverse;
    } else if (isDanger) {
      return pressed
        ? theme.colors.error.defaultPressed
        : theme.colors.error.default;
    }
    return theme.colors.text.default;
  };

  const textColor = getTextColor();

  const renderLabel = () =>
    typeof label === 'string' ? (
      <TextComponent variant={labelTextVariant} color={textColor}>
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

export default ButtonSecondary;
