import React, { type ComponentRef, type ReactElement, type Ref } from 'react';
import { View as RNView, type ViewProps as RNViewProps } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

export type ViewProps = RNViewProps & {
  className?: string;
  ref?: Ref<ComponentRef<typeof RNView>>;
};

export const View = ({
  className,
  style,
  ref,
  ...rest
}: ViewProps): ReactElement => {
  const tw = useTailwind();

  return (
    <RNView
      ref={ref}
      {...rest}
      style={className ? [tw.style(className), style] : style}
    />
  );
};
