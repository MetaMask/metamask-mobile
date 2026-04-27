// FlashList v2 jestSetup is broken (RecyclerView not exported from main index).
// Provide a simple mock that renders items directly.
// Usage: add jest.mock('@shopify/flash-list', () => require('../../util/test/mockFlashList').flashListMock());

import React from 'react';
import { View } from 'react-native';

export const flashListMock = () => {
  const actual = jest.requireActual('@shopify/flash-list');

  const MockFlashList = React.forwardRef(
    (
      props: {
        data: unknown[];
        renderItem: (info: {
          item: unknown;
          index: number;
        }) => React.ReactElement;
        keyExtractor: (item: unknown, index: number) => string;
        ListEmptyComponent?: React.ComponentType | React.ReactElement | null;
      },
      ref: React.ForwardedRef<unknown>,
    ) => {
      const { data, renderItem, keyExtractor, ListEmptyComponent } = props;
      React.useImperativeHandle(ref, () => ({
        scrollToIndex: jest.fn(),
        scrollToOffset: jest.fn(),
      }));
      if (!data || data.length === 0) {
        if (!ListEmptyComponent) return null;
        if (React.isValidElement(ListEmptyComponent)) return ListEmptyComponent;
        return React.createElement(ListEmptyComponent as React.ComponentType);
      }
      return React.createElement(
        View,
        null,
        data.map((item: unknown, index: number) => {
          const key = keyExtractor ? keyExtractor(item, index) : String(index);
          return React.createElement(
            React.Fragment,
            { key },
            renderItem({ item, index }),
          );
        }),
      );
    },
  );

  return {
    ...actual,
    FlashList: MockFlashList,
  };
};
