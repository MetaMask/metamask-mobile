import { AvatarTokenSize } from '@metamask/design-system-react-native';
import React, { useCallback } from 'react';
import PositionTokenAvatar from '../../../components/PositionTokenAvatar';
import { ExplorePill } from '../../../../../UI/Trending/components/ExplorePill';
import { PillScrollList } from '../../../../../UI/Trending/components/PillScrollList';
import { SectionPillsSkeleton } from '../../../../../UI/Trending/components/SectionPillsSkeleton';
import { useSocialV1HotTokens } from '../hooks/useSocialV1HotTokens';
import type { SocialV1FeedPost, SocialV1HotToken } from '../types';
import {
  getSocialV1HotTokenChipTestId,
  SOCIAL_V1_HOT_TOKENS_CAROUSEL_TEST_ID,
} from './HotTokensCarousel.testIds';

const EMPTY_POSTS: SocialV1FeedPost[] = [];

export interface HotTokensCarouselProps {
  /** Loaded feed posts the ranking is counted from. */
  posts?: readonly SocialV1FeedPost[];
  /** True during the feed's first fetch, before any post is on screen. */
  isLoading?: boolean;
  /** Chip id of the asset currently filtering the feed. */
  selectedTokenId?: string | null;
  /** Filters the feed to this asset. Pressing the selected chip clears it. */
  onTokenPress?: (token: SocialV1HotToken) => void;
}

/**
 * HotTokensCarousel -- the rail of asset chips above the Social V1 feed.
 *
 * Built on the shared `PillScrollList` + `ExplorePill` pair that the Perps and
 * Crypto Movers rails use, pinned to a single row. That gives it the same pill
 * shape, spacing and edge bleed as every other rail in the app: content padding
 * lives inside the scroll view, so a partly visible chip on either edge
 * advertises that there is more to scroll. The caller must therefore render it
 * outside its own horizontal padding.
 *
 * Chips are the assets that appear most often in `posts`. Icons go through
 * `PositionTokenAvatar`, the same resolution the position cards use, so a perp
 * keeps its raw market id and a spot token keeps its image URL.
 */
const HotTokensCarousel: React.FC<HotTokensCarouselProps> = ({
  posts = EMPTY_POSTS,
  isLoading = false,
  selectedTokenId = null,
  onTokenPress,
}) => {
  const { tokens, isLoading: showSkeleton } = useSocialV1HotTokens(
    posts,
    isLoading,
    selectedTokenId,
  );

  const renderItem = useCallback(
    (token: SocialV1HotToken) => (
      <ExplorePill
        testID={getSocialV1HotTokenChipTestId(token.id)}
        isSelected={token.id === selectedTokenId}
        leading={
          <PositionTokenAvatar
            position={token.avatar}
            size={AvatarTokenSize.Sm}
          />
        }
        title={token.label}
        onPress={() => onTokenPress?.(token)}
      />
    ),
    [onTokenPress, selectedTokenId],
  );

  const keyExtractor = useCallback((token: SocialV1HotToken) => token.id, []);

  // `PillScrollList` renders its wrapper either way. Returning null instead
  // lets the page's gap collapse, rather than leaving a rail-shaped hole above
  // the first post.
  if (!showSkeleton && tokens.length === 0) {
    return null;
  }

  return (
    <PillScrollList
      data={tokens}
      isLoading={showSkeleton}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      Skeleton={SectionPillsSkeleton}
      rowCount={1}
      listTestId={SOCIAL_V1_HOT_TOKENS_CAROUSEL_TEST_ID}
    />
  );
};

export default HotTokensCarousel;
