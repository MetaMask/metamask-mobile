import React, { useMemo } from 'react';
import { ScrollView } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

const DEFAULT_MAX_PILLS = 12;

function splitIntoTwoRows<T>(items: T[]): [T[], T[]] {
  if (items.length === 0) return [[], []];
  const mid = Math.ceil(items.length / 2);
  return [items.slice(0, mid), items.slice(mid)];
}

export interface PillScrollListProps<T> {
  data: T[];
  isLoading: boolean;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string;
  Skeleton: React.ComponentType;
  /** @default 12 */
  maxPills?: number;
  listTestId?: string;
  /**
   * Outer wrapper Tailwind classes. Defaults to Explore spacing (`mt-3 mb-9`).
   * Pass a slimmer value (e.g. `-mx-4 bg-transparent`) when the parent already
   * applies vertical gap (e.g. homepage section `Box gap={3}` + column `gap={8}`).
   */
  wrapperTwClassName?: string;
}

/**
 * Two-row horizontal scroll of pill-shaped items. Used for "crypto movers".
 * Splits incoming data evenly between the two rows.
 */
const DEFAULT_WRAPPER_TW = '-mx-4 bg-transparent mt-3 mb-9' as const;

function PillScrollList<T>({
  data,
  isLoading,
  renderItem,
  keyExtractor,
  Skeleton,
  maxPills = DEFAULT_MAX_PILLS,
  listTestId,
  wrapperTwClassName = DEFAULT_WRAPPER_TW,
}: PillScrollListProps<T>) {
  const tw = useTailwind();
  const displayData = useMemo(() => data.slice(0, maxPills), [data, maxPills]);
  const [row1, row2] = useMemo(
    () => splitIntoTwoRows(displayData),
    [displayData],
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
          <Skeleton />
        </Box>
      )}
      {!isLoading && (row1.length > 0 || row2.length > 0) && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          testID={listTestId}
          style={tw.style('bg-transparent')}
          contentContainerStyle={tw.style('flex-col px-4')}
        >
          <Box flexDirection={BoxFlexDirection.Column} twClassName="gap-2">
            {row1.length > 0 ? (
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="flex-nowrap gap-2"
              >
                {renderRow(row1, 0)}
              </Box>
            ) : null}
            {row2.length > 0 ? (
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="flex-nowrap gap-2"
              >
                {renderRow(row2, row1.length)}
              </Box>
            ) : null}
          </Box>
        </ScrollView>
      )}
    </Box>
  );
}

export default PillScrollList;
