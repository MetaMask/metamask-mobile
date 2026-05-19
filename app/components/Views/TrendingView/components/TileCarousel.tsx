import React, { useMemo } from 'react';
import { ScrollView } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(WPC-403): allowed by ADR-0020 backlog
import ViewMoreCard from '../../Homepage/components/ViewMoreCard';

/** Default number of tiles shown; sparkline fetches in `usePerpsFeed` must match. */
export const TILE_CAROUSEL_DEFAULT_MAX_TILES = 5;

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
  /**
   * When true, uses `mb-7` after the carousel so spacing matches {@link CardList}
   * section tails (~28px). Use for the first tile strip on Sites (Recents) to
   * mirror Crypto "Trending" → next section rhythm.
   */
  compactSectionTail?: boolean;
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
  max = TILE_CAROUSEL_DEFAULT_MAX_TILES,
  testID,
  viewMoreTestID,
  compactSectionTail = false,
}: TileCarouselProps<T>) {
  const tw = useTailwind();
  const displayItems = useMemo(() => data.slice(0, max), [data, max]);

  return (
    <Box twClassName={`-mx-4 mt-3 ${compactSectionTail ? 'mb-7' : 'mb-9'}`}>
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
