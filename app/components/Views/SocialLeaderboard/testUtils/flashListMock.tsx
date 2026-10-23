import React from 'react';
import { FlatList } from 'react-native';
import type { FlashListProps } from '@shopify/flash-list';

/** Jest stand-in. The FlashList test entry throws, so rows render through FlatList. */
export const FlashList = React.forwardRef(
  (
    {
      renderScrollComponent: _renderScrollComponent,
      ...props
    }: FlashListProps<unknown>,
    ref: React.ForwardedRef<FlatList<unknown>>,
  ) => {
    const mockProps = {
      ...props,
      initialNumToRender: props.data?.length,
      ref,
    } as unknown as React.ComponentPropsWithRef<typeof FlatList>;

    return React.createElement(FlatList, mockProps);
  },
);
