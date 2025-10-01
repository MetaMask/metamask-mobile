import type { LayoutChangeEvent } from 'react-native';

/**
 * Props for ScrollSyncedVirtualizedList component
 */
export interface ScrollSyncedVirtualizedListProps<T> {
  /** Array of data items to render */
  data: T[];
  /** Function to render each item */
  renderItem: (info: { item: T; index: number }) => React.ReactElement | null;
  /** Fixed height of each item in pixels */
  itemHeight: number;
  /** Current scroll position of the parent ScrollView */
  parentScrollY: number;
  /** Viewport height of the parent scroll container */
  _parentViewportHeight: number;
  /** Function to extract unique key for each item */
  keyExtractor?: (item: T, index: number) => string;
  /** Test ID for the container */
  testID?: string;
  /** Optional header component rendered at the top */
  ListHeaderComponent?: React.ComponentType | React.ReactElement | null;
  /** Optional footer component rendered at the bottom */
  ListFooterComponent?: React.ComponentType | React.ReactElement | null;
  /** Optional component to render when data is empty */
  ListEmptyComponent?: React.ComponentType | React.ReactElement | null;
}
