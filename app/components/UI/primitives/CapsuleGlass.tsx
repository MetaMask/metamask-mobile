import React from 'react';
import DSCapsuleGlass, {
  type CapsuleGlassProps as DSCapsuleGlassProps,
} from '../../../component-library/components-temp/CapsuleGlass/CapsuleGlass';

interface Props extends DSCapsuleGlassProps {
  className?: string;
}

/** CapsuleGlass with a `className` prop, like the other primitives. */
export function CapsuleGlass({ className, ...rest }: Props) {
  return <DSCapsuleGlass {...rest} twClassName={className} />;
}
