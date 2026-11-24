import React from 'react';
import {
  ButtonBase,
  ButtonVariant,
  TextColor,
  type ButtonBaseProps,
} from '@metamask/design-system-react-native';
import FloatingActionButtonGlass from '../../../../../component-library/components-temp/ButtonGlass/FloatingActionButtonGlass';
import { useTheme } from '../../../../../util/theme';

export type PerpsDirection = 'long' | 'short';

interface PerpsDirectionButtonProps
  extends Omit<
    ButtonBaseProps,
    'iconClassName' | 'textClassName' | 'textProps' | 'twClassName'
  > {
  direction: PerpsDirection;
  twClassName?: string;
  /**
   * Floats the button on Liquid Glass, tinted with the direction colour. Lays
   * out as one of a row of equal-width floating actions.
   */
  isGlass?: boolean;
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

const DIRECTION_GLASS_TEXT_PROPS = {
  long: { color: TextColor.SuccessInverse },
  short: { color: TextColor.ErrorInverse },
} as const;

/**
 * Trade CTA that keeps Long and Short colors consistent across Perps surfaces.
 */
const PerpsDirectionButton = ({
  direction,
  twClassName = '',
  isGlass = false,
  ...props
}: PerpsDirectionButtonProps) => {
  const { colors } = useTheme();
  const colorClasses = DIRECTION_COLOR_CLASSES[direction];

  if (isGlass) {
    return (
      <FloatingActionButtonGlass
        {...props}
        isGlass
        variant={ButtonVariant.Primary}
        tintColor={
          direction === 'long' ? colors.success.default : colors.error.default
        }
        textProps={DIRECTION_GLASS_TEXT_PROPS[direction]}
      />
    );
  }

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
