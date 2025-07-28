import React, { useCallback } from 'react';

import {
  ButtonBase,
  ButtonBaseProps,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

const ButtonHero = ({
  children,
  onPress,
  isLoading,
  loadingText,
  isDisabled,
  textClassName,
  ...props
}: ButtonBaseProps) => {
  const tw = useTailwind();

  // Pressed color is the same as default state
  // TODO: @MetaMask/design-system-engineers we should change the type e.g. textClassName?: string | ((pressed: boolean) => string)
  const getTextClassName = useCallback(() => 'text-primary-inverse', []);

  const getStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      tw.style('bg-primary-default', pressed && 'bg-primary-default-pressed'),
      props.style,
    ],
    [tw, props.style],
  );

  return (
    <ButtonBase
      onPress={onPress}
      isDisabled={isDisabled}
      isLoading={isLoading}
      loadingText={loadingText}
      textClassName={textClassName || getTextClassName}
      {...props}
      style={getStyle}
    >
      {children}
    </ButtonBase>
  );
};

export default ButtonHero;
