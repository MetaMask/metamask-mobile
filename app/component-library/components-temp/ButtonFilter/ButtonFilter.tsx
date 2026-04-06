import React, { useCallback } from 'react';

import { ButtonBase } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import { ButtonFilterProps } from './ButtonFilter.types';

/**
 * @deprecated Please update your code to use `ButtonFilter` from `@metamask/design-system-react-native`.
 * The API may have changed — compare props before migrating.
 * @see {@link https://github.com/MetaMask/metamask-design-system/blob/main/packages/design-system-react-native/src/components/ButtonFilter/README.md}
 * @since @metamask/design-system-react-native@0.11.0
 */
const ButtonFilter = ({
  children,
  isActive = false,
  textClassName,
  style,
  ...props
}: ButtonFilterProps) => {
  const tw = useTailwind();

  const getTextClassName = useCallback(
    () => (isActive ? 'text-icon-inverse' : 'text-default'),
    [isActive],
  );

  const getStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      tw.style(isActive ? 'bg-icon-default' : 'bg-background-muted'),
      typeof style === 'function' ? style({ pressed }) : style,
    ],
    [tw, isActive, style],
  );

  return (
    <ButtonBase
      textClassName={textClassName || getTextClassName}
      {...props}
      style={getStyle}
    >
      {children}
    </ButtonBase>
  );
};

export default ButtonFilter;
