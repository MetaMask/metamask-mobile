import React, { useMemo, useState, useCallback } from 'react';
import { Box } from '@metamask/design-system-react-native';
import type { LayoutChangeEvent } from 'react-native';

interface Props<T> {
  data: T[];
  renderItem: (info: { item: T; index: number }) => React.ReactElement | null;
  // Height of each row (fixed-height version)
  itemHeight: number;
  // Parent scroll position in pixels (y offset from the page ScrollView)
  parentScrollY: number;
  // Viewport height of the parent scroll container (visible area, not total content)
  _parentViewportHeight: number;
  keyExtractor?: (item: T, index: number) => string;
  // Optional test ID for the container
  testID?: string;
  // Optional header component
  ListHeaderComponent?: React.ComponentType | React.ReactElement | null;
  // Optional footer component
  ListFooterComponent?: React.ComponentType | React.ReactElement | null;
  // Optional empty component
  ListEmptyComponent?: React.ComponentType | React.ReactElement | null;
}

export function ExternalVirtualized<T>({
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
}: Props<T>) {
  // State to track the list's Y position relative to the page
  const [listYPosition, setListYPosition] = useState<number | null>(null);

  // Callback to measure the list's Y position
  const handleListLayout = useCallback(
    (layoutEvent: LayoutChangeEvent) => {
      const { y } = layoutEvent.nativeEvent.layout;

      // Only update if the position actually changed to prevent render loops
      if (listYPosition !== y) {
        setListYPosition(y);
      }
    },
    [listYPosition],
  );

  // Calculate total height including footer space
  const baseHeight = data.length * itemHeight;
  // Add extra space for footer if it exists (estimate 120px for footer)
  const footerHeight = ListFooterComponent ? 120 : 0;
  const totalHeight = baseHeight + footerHeight;

  const { startIndex, endIndex, topSpacer, bottomSpacer } = useMemo(() => {
    if (data.length === 0) {
      return { startIndex: 0, endIndex: -1, topSpacer: 0, bottomSpacer: 0 };
    }

    // For initial load (scroll at top), show a reasonable number of items
    if (parentScrollY <= 50) {
      // Small threshold for "at top"
      const itemsToShow = Math.min(6, data.length); // Show 6 items initially
      const finalEndIndex = itemsToShow - 1;

      return {
        startIndex: 0,
        endIndex: finalEndIndex,
        topSpacer: 0,
        bottomSpacer: Math.max(0, (data.length - itemsToShow) * itemHeight),
      };
    }

    // Simple virtualization approach that works reliably
    // Show a reasonable number of items around the current scroll position
    const currentItemIndex = Math.floor(parentScrollY / itemHeight);
    const itemsToShowAbove = 5; // Show 5 items above current position
    const itemsToShowBelow = 10; // Show 10 items below current position
    const scrollStartIndex = Math.max(0, currentItemIndex - itemsToShowAbove);
    const scrollEndIndex = Math.min(
      data.length - 1,
      currentItemIndex + itemsToShowBelow,
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

  // Render header if provided
  const renderHeader = () => {
    if (!ListHeaderComponent) return null;
    if (React.isValidElement(ListHeaderComponent)) {
      return ListHeaderComponent;
    }
    const HeaderComponent = ListHeaderComponent as React.ComponentType;
    return <HeaderComponent />;
  };

  // Render footer if provided
  const renderFooter = () => {
    if (!ListFooterComponent) return null;

    if (React.isValidElement(ListFooterComponent)) {
      return ListFooterComponent;
    }
    const FooterComponent = ListFooterComponent as React.ComponentType;
    return <FooterComponent />;
  };

  // Render empty component if no data
  const renderEmpty = () => {
    if (data.length > 0 || !ListEmptyComponent) return null;
    if (React.isValidElement(ListEmptyComponent)) {
      return ListEmptyComponent;
    }
    const EmptyComponent = ListEmptyComponent as React.ComponentType;
    return <EmptyComponent />;
  };

  // If no data and empty component exists, render it
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
      {/* Virtualized content container */}
      <Box style={{ height: baseHeight }}>
        {renderHeader()}

        {/* Top spacer */}
        <Box style={{ height: topSpacer }} />

        {/* Rendered items */}
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

        {/* Bottom spacer */}
        <Box style={{ height: bottomSpacer }} />
      </Box>

      {/* Footer outside virtualized area - always visible */}
      {renderFooter()}
    </Box>
  );
}
