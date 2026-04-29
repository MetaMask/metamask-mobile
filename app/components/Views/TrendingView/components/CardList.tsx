import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import Card from '../../../../component-library/components/Cards/Card';
import { useAppThemeFromContext } from '../../../../util/theme';
import type { Theme } from '../../../../util/theme/models';

const DEFAULT_MAX_ITEMS = 3;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    cardContainer: {
      borderRadius: 12,
      marginBottom: 20,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.background.muted,
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
  const theme = useAppThemeFromContext();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
