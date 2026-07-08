import React, { useMemo } from 'react';
import { ScrollView } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

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
   * Outer wrapper Tailwind classes. Defaults to Explore spacing (`mt-3 mb-9`).
   * Pass a slimmer value (e.g. `-mx-4 bg-transparent`) when the parent already
   * applies vertical gap (e.g. homepage section `Box gap={3}` + column `gap={8}`).
   */
  wrapperTwClassName?: string;
}

/**
 * Multi-row horizontal scroll of pill-shaped items. Used for compact movers sections.
 * Splits incoming data evenly between rows.
 */
const DEFAULT_WRAPPER_TW = '-mx-4 bg-transparent' as const;

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

  return (
    <Box twClassName={wrapperTwClassName}>
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
          style={tw.style('bg-transparent')}
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
