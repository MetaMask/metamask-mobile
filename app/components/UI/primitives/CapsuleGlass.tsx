import React from 'react';
import DSCapsuleGlass, {
  type CapsuleGlassProps,
} from '../../../component-library/components-temp/CapsuleGlass/CapsuleGlass';

interface Props extends CapsuleGlassProps {
  className?: string;
}

export function CapsuleGlass({ className, ...rest }: Props) {
  return <DSCapsuleGlass {...rest} className={className} />;
}
