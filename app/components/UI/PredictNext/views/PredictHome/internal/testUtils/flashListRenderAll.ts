import {
  createElement,
  Fragment,
  type ReactElement,
  type ReactNode,
} from 'react';
import { View } from 'react-native';

export interface FlashListRenderAllProps {
  data: unknown[];
  testID: string;
  keyExtractor: (item: unknown, index: number) => string;
  renderItem: (info: {
    item: unknown;
    index: number;
    target: string;
  }) => unknown;
}

/**
 * A `FlashList` that renders every cell at once. The real list measures
 * itself first and re-renders outside act(). Use it with
 * `jest.mock('@shopify/flash-list', () => jest.requireActual('./testUtils/flashListRenderAll').flashListRenderAllMock)`.
 */
export const FlashListRenderAll = (
  props: FlashListRenderAllProps,
): ReactElement =>
  createElement(
    View,
    { testID: props.testID },
    props.data.map((item, index) =>
      createElement(
        Fragment,
        { key: props.keyExtractor(item, index) },
        props.renderItem({ item, index, target: 'Cell' }) as ReactNode,
      ),
    ),
  );

export const flashListRenderAllMock = { FlashList: FlashListRenderAll };
