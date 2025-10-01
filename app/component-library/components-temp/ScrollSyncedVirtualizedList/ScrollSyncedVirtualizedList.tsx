import React, { useMemo, useState, useCallback } from 'react';
import { Box } from '@metamask/design-system-react-native';
import type { LayoutChangeEvent } from 'react-native';
import type { ScrollSyncedVirtualizedListProps } from './ScrollSyncedVirtualizedList.types';

/**
 * A virtualized list component that syncs with parent scroll position.
 *
 * This component implements spacer-based virtualization, where only visible items
 * are rendered while invisible spacers maintain proper scroll physics and positioning.
 * It's designed to work within a parent ScrollView and responds to the parent's
 * scroll position to determine which items should be visible.
 *
 * Key features:
 * - Renders only visible items for performance
 * - Maintains proper scroll physics with spacers
 * - Syncs with parent ScrollView scroll position
 * - Supports header, footer, and empty state components
 * - Fixed item height for predictable layout
 * @example
 * ```tsx
 * <ScrollSyncedVirtualizedList
 *   data={items}
 *   renderItem={({ item }) => <ItemComponent item={item} />}
 *   itemHeight={64}
 *   parentScrollY={scrollY}
 *   _parentViewportHeight={viewportHeight}
 *   keyExtractor={(item) => item.id}
 * />
 * ```
 */
export function ScrollSyncedVirtualizedList<T>({
  data,
  renderItem,
  itemHeight,
  parentScrollY,
  _parentViewportHeight,
  keyExtractor,
  testID,
  ListHeaderComponent,
  ListFooterComponent,
  ListEmptyComponent,
}: ScrollSyncedVirtualizedListProps<T>) {
  const [listYPosition, setListYPosition] = useState<number | null>(null);
  const [footerHeight, setFooterHeight] = useState<number>(0);

  const handleListLayout = useCallback(
    (layoutEvent: LayoutChangeEvent) => {
      const { y } = layoutEvent.nativeEvent.layout;

      if (listYPosition !== y) {
        setListYPosition(y);
      }
    },
    [listYPosition],
  );

  const handleFooterLayout = useCallback(
    (layoutEvent: LayoutChangeEvent) => {
      const { height } = layoutEvent.nativeEvent.layout;
      if (footerHeight !== height) {
        setFooterHeight(height);
      }
    },
    [footerHeight],
  );

  const baseHeight = data.length * itemHeight;
  const totalHeight = baseHeight + footerHeight;

  const { startIndex, endIndex, topSpacer, bottomSpacer } = useMemo(() => {
    if (data.length === 0) {
      return { startIndex: 0, endIndex: -1, topSpacer: 0, bottomSpacer: 0 };
    }

    // For initial load (scroll at top), show a reasonable number of items
    if (parentScrollY <= 50) {
      const itemsToShow = Math.min(6, data.length);
      const finalEndIndex = itemsToShow - 1;

      return {
        startIndex: 0,
        endIndex: finalEndIndex,
        topSpacer: 0,
        bottomSpacer: Math.max(0, (data.length - itemsToShow) * itemHeight),
      };
    }

    // Virtualization: show items around current scroll position
    const currentItemIndex = Math.floor(parentScrollY / itemHeight);
    const itemsToShowAboveAndBelow = 6;
    const scrollStartIndex = Math.max(
      0,
      currentItemIndex - itemsToShowAboveAndBelow,
    );
    const scrollEndIndex = Math.min(
      data.length - 1,
      currentItemIndex + itemsToShowAboveAndBelow,
    );

    const scrollTopSpacer = scrollStartIndex * itemHeight;
    const renderedCount = Math.max(0, scrollEndIndex - scrollStartIndex + 1);
    const scrollBottomSpacer =
      totalHeight - scrollTopSpacer - renderedCount * itemHeight;

    return {
      startIndex: scrollStartIndex,
      endIndex: scrollEndIndex,
      topSpacer: scrollTopSpacer,
      bottomSpacer: scrollBottomSpacer,
    };
  }, [parentScrollY, itemHeight, totalHeight, data.length]);

  const renderHeader = () => {
    if (!ListHeaderComponent) return null;
    if (React.isValidElement(ListHeaderComponent)) {
      return ListHeaderComponent;
    }
    const HeaderComponent = ListHeaderComponent as React.ComponentType;
    return <HeaderComponent />;
  };

  const renderFooter = () => {
    if (!ListFooterComponent) return null;

    const footerContent = React.isValidElement(ListFooterComponent)
      ? ListFooterComponent
      : React.createElement(ListFooterComponent as React.ComponentType);

    return (
      <Box onLayout={handleFooterLayout as (event: unknown) => void}>
        {footerContent}
      </Box>
    );
  };

  const renderEmpty = () => {
    if (data.length > 0 || !ListEmptyComponent) return null;
    if (React.isValidElement(ListEmptyComponent)) {
      return ListEmptyComponent;
    }
    const EmptyComponent = ListEmptyComponent as React.ComponentType;
    return <EmptyComponent />;
  };

  if (data.length === 0) {
    return (
      <Box twClassName="w-full" testID={testID}>
        {renderHeader()}
        {renderEmpty()}
        {renderFooter()}
      </Box>
    );
  }

  return (
    <Box
      twClassName="w-full"
      testID={testID}
      onLayout={handleListLayout as (event: unknown) => void}
    >
      <Box style={{ height: baseHeight }}>
        {renderHeader()}
        <Box style={{ height: topSpacer }} />
        {(() => {
          const itemsToRender = data.slice(startIndex, endIndex + 1);

          return itemsToRender.map((item, i) => {
            const index = startIndex + i;
            const key = keyExtractor
              ? keyExtractor(item, index)
              : String(index);
            return (
              <Box
                key={key}
                style={{ height: itemHeight }}
                twClassName="overflow-hidden"
              >
                {renderItem({ item, index })}
              </Box>
            );
          });
        })()}
        <Box style={{ height: bottomSpacer }} />
      </Box>
      {renderFooter()}
    </Box>
  );
}
