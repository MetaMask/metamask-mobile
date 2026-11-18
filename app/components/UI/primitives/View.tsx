// Copy of the View primitive from #39856. Drop once that PR merges.
import React, { type ComponentRef, type Ref } from 'react';
import { View as RNView, type ViewProps as RNViewProps } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

export interface ViewProps extends RNViewProps {
  className?: string;
  ref?: Ref<ComponentRef<typeof RNView>>;
}

export function View({ className, style, ref, ...rest }: ViewProps) {
  const tw = useTailwind();

  return (
    <RNView
      ref={ref}
      {...rest}
      style={className ? [tw.style(className), style] : style}
    />
  );
}
