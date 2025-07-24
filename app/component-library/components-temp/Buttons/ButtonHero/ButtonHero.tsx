/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, GestureResponderEvent } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../hooks';
import Button from '../../../components/Buttons/Button/foundation/ButtonBase';
import { default as TextComponent } from '../../../components/Texts/Text/Text';
import { TextColor } from '../../../components/Texts/Text';

// Internal dependencies.
import { ButtonHeroProps } from './ButtonHero.types';
import styleSheet from './ButtonHero.styles';
import { DEFAULT_BUTTONHERO_LABEL_TEXTVARIANT } from './ButtonHero.constants';

const ButtonHero = ({
  style,
  onPressIn,
  onPressOut,
  label,
  ...props
}: ButtonHeroProps) => {
  const [pressed, setPressed] = useState(false);
  const { styles, theme } = useStyles(styleSheet, {
    style,
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

  // ButtonHero always uses inverse text color (white text on primary background)
  const textColor = TextColor.Inverse;

  const renderLabel = () =>
    typeof label === 'string' ? (
      <TextComponent
        variant={DEFAULT_BUTTONHERO_LABEL_TEXTVARIANT}
        color={textColor}
      >
        {label}
      </TextComponent>
    ) : (
      label
    );

  const renderLoading = () => (
    <ActivityIndicator size="small" color={theme.colors.primary.inverse} />
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

export default ButtonHero;