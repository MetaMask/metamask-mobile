import React, { type ComponentRef, type ReactElement, type Ref } from 'react';
import { View as RNView, type ViewProps as RNViewProps } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

export type ViewProps = RNViewProps & {
  /**
   * Optional prop for additional CSS classes to be applied to the View component.
   */
  className?: string;
  /** Forwarded to the underlying React Native View. */
  ref?: Ref<ComponentRef<typeof RNView>>;
};

/**
 * View that accepts an optional className.
 *
 * @param props - React Native View props plus an optional className.
 * @returns The rendered View.
 */
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
