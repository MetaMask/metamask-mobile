import React, { useCallback } from 'react';

import { ButtonBase } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import { ButtonFilterProps } from './ButtonFilter.types';

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
