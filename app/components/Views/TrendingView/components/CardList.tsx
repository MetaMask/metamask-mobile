import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import Card from '../../../../component-library/components/Cards/Card';

const DEFAULT_MAX_ITEMS = 3;

const styles = StyleSheet.create({
  cardContainer: {
    padding: 0,
    marginBottom: 28,
    borderWidth: 0,
  },
});

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
 * Card-wrapped vertical list rendering up to `max` items via FlashList.
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
  const displayData = useMemo(() => data.slice(0, max), [data, max]);

  return (
    <Card style={styles.cardContainer} disabled>
      {isLoading &&
        Array.from({ length: skeletonCount }).map((_, i) => (
          <Skeleton key={`${idPrefix}-skeleton-${i}`} />
        ))}
      {!isLoading && (
        <FlashList
          data={displayData}
          renderItem={renderItem}
          keyExtractor={(_, index) => `${idPrefix}-${index}`}
          keyboardShouldPersistTaps="handled"
          testID={listTestId}
        />
      )}
    </Card>
  );
}

export default CardList;
