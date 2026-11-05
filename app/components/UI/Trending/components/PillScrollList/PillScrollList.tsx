import React, { useMemo } from 'react';
import { ScrollView } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';

const DEFAULT_MAX_PILLS = 12;
const DEFAULT_ROW_COUNT = 2;

interface PillRow<T> {
  items: T[];
  startIndex: number;
}

const normalizeRowCount = (rowCount: number) =>
  Math.max(1, Math.floor(rowCount));

function splitIntoRows<T>(items: T[], rowCount: number): PillRow<T>[] {
  if (items.length === 0) return [];

  const rows: PillRow<T>[] = [];
  let start = 0;

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    const remainingItems = items.length - start;
    const remainingRows = rowCount - rowIndex;
    const rowSize = Math.ceil(remainingItems / remainingRows);
    const row = items.slice(start, start + rowSize);

    if (row.length > 0) {
      rows.push({ items: row, startIndex: start });
    }

    start += rowSize;
  }

  return rows;
}

export interface PillScrollListProps<T> {
  data: T[];
  isLoading: boolean;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string;
  Skeleton: React.ComponentType<{ rowCount?: number }>;
  /** @default 12 */
  maxPills?: number;
  /** @default 2 */
  rowCount?: number;
  listTestId?: string;
  /**
   * Outer wrapper Tailwind classes. Defaults to transparent background.
   * Pass vertical spacing (e.g. `bg-transparent py-3`) when the parent owns gap.
   */
  wrapperTwClassName?: string;
}

/**
 * Multi-row horizontal scroll of pill-shaped items. Used for compact movers sections.
 * Splits incoming data evenly between rows.
 */
const DEFAULT_WRAPPER_TW = 'bg-transparent' as const;

function PillScrollList<T>({
  data,
  isLoading,
  renderItem,
  keyExtractor,
  Skeleton,
  maxPills = DEFAULT_MAX_PILLS,
  rowCount = DEFAULT_ROW_COUNT,
  listTestId,
  wrapperTwClassName = DEFAULT_WRAPPER_TW,
}: PillScrollListProps<T>) {
  const tw = useTailwind();
  const displayData = useMemo(() => data.slice(0, maxPills), [data, maxPills]);
  const normalizedRowCount = normalizeRowCount(rowCount);
  const rows = useMemo(
    () => splitIntoRows(displayData, normalizedRowCount),
    [displayData, normalizedRowCount],
  );

  const renderRow = (items: T[], startIndex: number) =>
    items.map((item, i) => (
      <React.Fragment key={keyExtractor(item)}>
        {renderItem(item, startIndex + i)}
      </React.Fragment>
    ));

  const handleRailLayout = (event: {
    nativeEvent: { layout: { height: number } };
  }) => {
    const { height } = event.nativeEvent.layout;
    if (!isLoading && rows.length > 0 && height <= 12) {
      DevLogger.log(
        `[TAT-4456] BUG_MARKER: pill rail reserved height collapsed to ${height} (rows=${rows.length})`,
      );
    }
  };

  return (
    <Box
      testID="pill-scroll-list-wrapper"
      twClassName={wrapperTwClassName}
      onLayout={handleRailLayout}
    >
      {isLoading && (
        <Box twClassName="px-4">
          <Skeleton rowCount={normalizedRowCount} />
        </Box>
      )}
      {!isLoading && rows.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          testID={listTestId}
          style={tw.style('bg-transparent grow-0 shrink-0')}
          contentContainerStyle={tw.style('flex-col px-4')}
        >
          <Box flexDirection={BoxFlexDirection.Column} twClassName="gap-2">
            {rows.map((row, rowIndex) => (
              <Box
                key={rowIndex}
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="flex-nowrap gap-2"
                testID={
                  listTestId ? `${listTestId}-row-${rowIndex}` : undefined
                }
              >
                {renderRow(row.items, row.startIndex)}
              </Box>
            ))}
          </Box>
        </ScrollView>
      )}
    </Box>
  );
}

export default PillScrollList;
