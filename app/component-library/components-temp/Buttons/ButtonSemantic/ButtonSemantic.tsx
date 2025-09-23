import React, { useCallback } from 'react';

import { ButtonBase, ButtonSize } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

// Internal dependencies.
import {
  ButtonSemanticProps,
  ButtonSemanticSeverity,
} from './ButtonSemantic.types';

const ButtonSemantic: React.FC<ButtonSemanticProps> = ({
  severity,
  size = ButtonSize.Lg,
  ...props
}) => {
  const tw = useTailwind();

  const getTextClassName = useCallback(
    (_pressed: boolean) => {
      switch (severity) {
        case ButtonSemanticSeverity.Success:
          return 'text-success-default';
        case ButtonSemanticSeverity.Danger:
          return 'text-error-default';
        default:
          return 'text-success-default';
      }
    },
    [severity],
  );

  const getStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => {
      let baseStyle: string;
      let pressedStyle: string;

      switch (severity) {
        case ButtonSemanticSeverity.Success:
          baseStyle = 'bg-success-muted';
          pressedStyle = 'bg-success-muted-pressed';
          break;
        case ButtonSemanticSeverity.Danger:
          baseStyle = 'bg-error-muted';
          pressedStyle = 'bg-error-muted-pressed';
          break;
        default:
          baseStyle = 'bg-success-muted';
          pressedStyle = 'bg-success-muted-pressed';
          break;
      }

      return [tw.style(baseStyle, pressed && pressedStyle), props.style];
    },
    [tw, severity, props.style],
  );

  return (
    <ButtonBase
      size={size}
      textClassName={getTextClassName}
      {...props}
      style={getStyle}
    />
  );
};

export default ButtonSemantic;
