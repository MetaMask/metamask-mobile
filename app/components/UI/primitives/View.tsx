// Copy of the View primitive from #39856. Drop once that PR merges.
import React, { type ComponentRef, type Ref } from 'react';
import { View as RNView, type ViewProps } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

interface Props extends ViewProps {
  className?: string;
  ref?: Ref<ComponentRef<typeof RNView>>;
}

export function View({ className, style, ref, ...rest }: Props) {
  const tw = useTailwind();

  return (
    <RNView
      ref={ref}
      {...rest}
      style={className ? [tw.style(className), style] : style}
    />
  );
}
