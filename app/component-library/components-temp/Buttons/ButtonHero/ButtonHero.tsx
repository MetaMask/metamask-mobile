import React, { useCallback } from 'react';

import {
  ButtonBase,
  ButtonBaseProps,
} from '@metamask/design-system-react-native';
import {
  useTailwind,
  ThemeProvider,
  Theme,
} from '@metamask/design-system-twrnc-preset';

// Internal component that uses the locked theme
const ButtonHeroInner = ({
  children,
  onPress,
  isLoading,
  loadingText,
  isDisabled,
  textClassName,
  ...props
}: ButtonBaseProps) => {
  const tw = useTailwind(); // Now this gets the light theme from ThemeProvider

  // Pressed color is the same as default state
  // TODO: @MetaMask/design-system-engineers: The current type of textClassName in ButtonBaseProps requires a function,
  // even when the value is static. This forces unnecessary function creation. We should change the type to
  // textClassName?: string | ((pressed: boolean) => string) to allow static strings and improve efficiency.
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

/*
 * Lock ButtonHero to light theme
 * The useTailwind hook needs to be called inside the ThemeProvider context to get the locked theme.
 * By splitting into two components, we ensure the hook gets the correct theme context for all color calculations.
 */
const ButtonHero = (props: ButtonBaseProps) => (
  <ThemeProvider theme={Theme.Light}>
    <ButtonHeroInner {...props} />
  </ThemeProvider>
);

export default ButtonHero;
