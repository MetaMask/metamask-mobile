import React, { useCallback } from 'react';
import PerpsTokenLogo from '../../../../../UI/Perps/components/PerpsTokenLogo';
import { ExplorePill } from '../../../../../UI/Trending/components/ExplorePill';
import { PillScrollList } from '../../../../../UI/Trending/components/PillScrollList';
import { SectionPillsSkeleton } from '../../../../../UI/Trending/components/SectionPillsSkeleton';
import { useSocialV1HotTokens } from '../hooks/useSocialV1HotTokens';
import type { SocialV1HotToken } from '../types';
import {
  getSocialV1HotTokenChipTestId,
  SOCIAL_V1_HOT_TOKENS_CAROUSEL_TEST_ID,
} from './HotTokensCarousel.testIds';

/**
 * Icon diameter in pixels, matching the Perps pill rails. `PerpsTokenLogo`
 * takes pixels rather than an `AvatarTokenSize` token.
 */
const LOGO_SIZE = 24;

export interface HotTokensCarouselProps {
  /** Opens the topic. Omitted until the hot-topic destination exists. */
  onTokenPress?: (token: SocialV1HotToken) => void;
}

/**
 * HotTokensCarousel -- the rail of trending-topic chips above the Social V1
 * feed.
 *
 * Built on the shared `PillScrollList` + `ExplorePill` pair that the Perps and
 * Crypto Movers rails use, pinned to a single row. That gives it the same pill
 * shape, spacing and edge bleed as every other rail in the app: content padding
 * lives inside the scroll view, so a partly visible chip on either edge
 * advertises that there is more to scroll. The caller must therefore render it
 * outside its own horizontal padding.
 *
 * Icons resolve by perps market symbol through `PerpsTokenLogo` -- the same
 * path the What's Happening pills and the feed's position cards use -- ending
 * at a two-letter monogram when a symbol has no published icon.
 */
const HotTokensCarousel: React.FC<HotTokensCarouselProps> = ({
  onTokenPress,
}) => {
  const { tokens, isLoading } = useSocialV1HotTokens();

  const renderItem = useCallback(
    (token: SocialV1HotToken) => (
      <ExplorePill
        testID={getSocialV1HotTokenChipTestId(token.id)}
        leading={
          <PerpsTokenLogo
            symbol={token.symbol}
            size={LOGO_SIZE}
            recyclingKey={token.symbol}
          />
        }
        title={token.label}
        onPress={() => onTokenPress?.(token)}
      />
    ),
    [onTokenPress],
  );

  const keyExtractor = useCallback((token: SocialV1HotToken) => token.id, []);

  // `PillScrollList` renders its wrapper either way. Returning null instead
  // lets the page's gap collapse, rather than leaving a rail-shaped hole above
  // the first post.
  if (!isLoading && tokens.length === 0) {
    return null;
  }

  return (
    <PillScrollList
      data={tokens}
      isLoading={isLoading}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      Skeleton={SectionPillsSkeleton}
      rowCount={1}
      listTestId={SOCIAL_V1_HOT_TOKENS_CAROUSEL_TEST_ID}
    />
  );
};

export default HotTokensCarousel;
