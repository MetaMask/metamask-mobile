/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  GestureResponderEvent,
  Pressable,
} from 'react-native';

// External dependencies.
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../util/theme';
import Text from '../../../components/Texts/Text';
import { TextColor } from '../../../components/Texts/Text';
import Icon from '../../../components/Icons/Icon';
import { IconColor } from '../../../components/Icons/Icon';

// Internal dependencies.
import { ButtonHeroProps } from './ButtonHero.types';
import { DEFAULT_BUTTONHERO_LABEL_TEXTVARIANT } from './ButtonHero.constants';

const ButtonHero = ({
  onPressIn,
  onPressOut,
  onPress,
  label,
  startIconName,
  endIconName,
  isDisabled,
  loading,
  ...props
}: ButtonHeroProps) => {
  const [pressed, setPressed] = useState(false);
  const tw = useTailwind();
  const { colors } = useTheme();

  const triggerOnPressedIn = useCallback(
    (event: GestureResponderEvent) => {
      setPressed(true);
      onPressIn?.(event);
    },
    [setPressed, onPressIn],
  );

  const triggerOnPressedOut = useCallback(
    (event: GestureResponderEvent) => {
      setPressed(false);
      onPressOut?.(event);
    },
    [setPressed, onPressOut],
  );

  const renderLabel = () =>
    typeof label === 'string' ? (
      <Text
        variant={DEFAULT_BUTTONHERO_LABEL_TEXTVARIANT}
        color={TextColor.Inverse}
      >
        {label}
      </Text>
    ) : (
      label
    );

  const renderLoading = () => (
    <ActivityIndicator size="small" color={colors.primary.inverse} />
  );

  const renderContent = () => {
    if (loading) {
      return renderLoading();
    }

    return (
      <>
        {startIconName && (
          <Icon name={startIconName} color={IconColor.Inverse} />
        )}
        {renderLabel()}
        {endIconName && <Icon name={endIconName} color={IconColor.Inverse} />}
      </>
    );
  };

  return (
    <Pressable
      onPress={!isDisabled ? onPress : undefined}
      onPressIn={!isDisabled ? triggerOnPressedIn : undefined}
      onPressOut={!isDisabled ? triggerOnPressedOut : undefined}
      disabled={isDisabled}
      style={tw.style(
        'bg-icon-default rounded-xl px-4 py-3 flex-row items-center justify-center gap-2',
        pressed && 'bg-icon-default-pressed',
        isDisabled && 'opacity-50',
      )}
      accessibilityRole="button"
      accessible
      {...props}
    >
      {renderContent()}
    </Pressable>
  );
};

export default ButtonHero;
