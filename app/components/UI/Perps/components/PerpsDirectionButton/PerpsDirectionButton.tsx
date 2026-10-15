import React from 'react';
import {
  ButtonBase,
  type ButtonBaseProps,
} from '@metamask/design-system-react-native';

export type PerpsDirection = 'long' | 'short';

interface PerpsDirectionButtonProps
  extends Omit<
    ButtonBaseProps,
    'iconClassName' | 'textClassName' | 'textProps' | 'twClassName'
  > {
  direction: PerpsDirection;
  twClassName?: string;
}

const DIRECTION_COLOR_CLASSES: Record<
  PerpsDirection,
  { background: string; foreground: string }
> = {
  long: {
    background: 'bg-success-default',
    foreground: 'text-success-inverse',
  },
  short: {
    background: 'bg-error-default',
    foreground: 'text-error-inverse',
  },
};

/**
 * Trade CTA that keeps Long and Short colors consistent across Perps surfaces.
 */
const PerpsDirectionButton = ({
  direction,
  twClassName = '',
  ...props
}: PerpsDirectionButtonProps) => {
  const colorClasses = DIRECTION_COLOR_CLASSES[direction];

  return (
    <ButtonBase
      {...props}
      twClassName={`${twClassName} ${colorClasses.background}`}
      textClassName={() => colorClasses.foreground}
      iconClassName={() => colorClasses.foreground}
    />
  );
};

export default PerpsDirectionButton;
