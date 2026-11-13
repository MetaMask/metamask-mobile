import React, { type ComponentRef, type ReactElement, type Ref } from 'react';
import { View as RNView, type ViewProps as RNViewProps } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

export interface ViewProps extends RNViewProps {
  /**
   * Tailwind classes from `@metamask/design-system-twrnc-preset`.
   * Resolved with `useTailwind()` and placed before `style`, so `style` wins.
   */
  className?: string;
  /** Forwarded to the underlying React Native `View`. */
  ref?: Ref<ComponentRef<typeof RNView>>;
}

/**
 * Opt-in `View` that accepts `className`.
 *
 * Import `{ View }` from this module where utility classes are wanted.
 * Files that still import `View` from `react-native` are unchanged.
 * A later NativeWind switch replaces this function with a re-export.
 * Call sites keep the same import.
 *
 * @param props - React Native `View` props plus an optional `className`.
 * @returns A `View` with `className` applied through the design-system preset.
 */
export function View({
  className,
  style,
  ref,
  ...rest
}: ViewProps): ReactElement {
  const tw = useTailwind();

  return (
    <RNView
      ref={ref}
      {...rest}
      style={className ? [tw.style(className), style] : style}
    />
  );
}
