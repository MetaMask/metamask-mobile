import React, { useMemo } from 'react';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

const DEFAULT_MAX_ITEMS = 3;

export interface CardListProps<T> {
  data: T[];
  isLoading: boolean;
  renderItem: ListRenderItem<T>;
  Skeleton: React.ComponentType;
  /** @default 3 */
  max?: number;
  /** Stable id for the keyExtractor namespace. */
  idPrefix: string;
  listTestId?: string;
  /** @default 3 */
  skeletonCount?: number;
}

/**
 * Vertical list rendering up to `max` items via FlashList.
 * Shows `Skeleton` (rendered `skeletonCount` times) while loading.
 */
function CardList<T>({
  data,
  isLoading,
  renderItem,
  Skeleton,
  max = DEFAULT_MAX_ITEMS,
  idPrefix,
  listTestId,
  skeletonCount = DEFAULT_MAX_ITEMS,
}: CardListProps<T>) {
  const tw = useTailwind();
  const displayData = useMemo(() => data.slice(0, max), [data, max]);
  const contentInset = tw.style('px-4');

  if (isLoading) {
    return (
      <Box testID="explore-card-list" twClassName="px-4">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <Skeleton key={`${idPrefix}-skeleton-${i}`} />
        ))}
      </Box>
    );
  }

  return (
    <FlashList
      data={displayData}
      renderItem={renderItem}
      keyExtractor={(_, index) => `${idPrefix}-${index}`}
      keyboardShouldPersistTaps="handled"
      testID={listTestId ?? 'explore-card-list'}
      contentContainerStyle={contentInset}
    />
  );
}

export default CardList;
