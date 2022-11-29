/* eslint-disable react/prop-types */
// Third party dependencies.
import React, { useState, useMemo, useCallback } from 'react';
import { GestureResponderEvent } from 'react-native';

// External dependencies.
import Text, { TextVariants } from '../../../../Texts/Text';
import { useStyles } from '../../../../../hooks';
import { ButtonSize } from '../../Button.types';
import Button from '../../foundation/ButtonBase';

// Internal dependencies.
import { ButtonLinkProps } from './ButtonLink.types';
import styleSheet from './ButtonLink.styles';

const ButtonLink: React.FC<ButtonLinkProps> = ({
  onPress,
  style,
  textVariants = TextVariants.sBodyMD,
  onPressIn,
  onPressOut,
  isDanger = false,
  size = ButtonSize.Md,
  label,
  ...props
}) => {
  const [pressed, setPressed] = useState(false);
  const { styles, theme } = useStyles(styleSheet, { style });
  const labelColor = useMemo(() => {
    const colorObj = isDanger ? theme.colors.error : theme.colors.primary;
    const color: string = pressed ? colorObj.alternative : colorObj.default;
    return color;
  }, [theme, isDanger, pressed]);

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
    <>
      {size === ButtonSize.Auto ? (
        <Text
          onPress={onPress}
          suppressHighlighting
          style={styles.base}
          {...props}
          variant={textVariants}
        >
          {label}
        </Text>
      ) : (
        <Button
          style={styles.base}
          labelColor={labelColor}
          onPressIn={triggerOnPressedIn}
          onPressOut={triggerOnPressedOut}
          onPress={onPress}
          label={label}
          {...props}
        />
      )}
    </>
  );
};

export default ButtonLink;
