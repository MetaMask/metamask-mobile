import React, { useMemo } from 'react';
import { ScrollView } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import ViewMoreCard from '../../Homepage/components/ViewMoreCard';

const DEFAULT_MAX_TILES = 5;

export interface TileCarouselProps<T> {
  data: T[];
  isLoading: boolean;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string;
  Skeleton: React.ComponentType;
  /** Optional trailing "View more" tile press handler. Omit to hide the tile. */
  onViewMore?: () => void;
  /** @default 5 */
  max?: number;
  testID?: string;
  viewMoreTestID?: string;
}

/**
 * Horizontal scrollview of fixed-width tiles. Used for perps tiles and
 * recent dapp / network tiles. Trailing `<ViewMoreCard>` is opt-in.
 */
function TileCarousel<T>({
  data,
  isLoading,
  renderItem,
  keyExtractor,
  Skeleton,
  onViewMore,
  max = DEFAULT_MAX_TILES,
  testID,
  viewMoreTestID,
}: TileCarouselProps<T>) {
  const tw = useTailwind();
  const displayItems = useMemo(() => data.slice(0, max), [data, max]);

  return (
    <Box twClassName="-mx-4 mb-6">
      {isLoading ? (
        <Box twClassName="px-4">
          <Skeleton />
        </Box>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={tw.style('px-4 gap-2.5')}
          testID={testID}
        >
          {displayItems.map((item, index) => (
            <React.Fragment key={keyExtractor(item)}>
              {renderItem(item, index)}
            </React.Fragment>
          ))}
          {onViewMore && (
            <ViewMoreCard
              onPress={onViewMore}
              twClassName="w-[180px] flex-1"
              testID={viewMoreTestID}
            />
          )}
        </ScrollView>
      )}
    </Box>
  );
}

export default TileCarousel;
