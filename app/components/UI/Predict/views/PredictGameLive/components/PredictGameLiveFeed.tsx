import {
  Box,
  BoxAlignItems,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import React, { memo, useCallback, useEffect, useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { strings } from '../../../../../../../locales/i18n';
import type { GameLiveFeedItem } from '../../../services/gameEvents';
import type {
  PredictMarketGame,
  PredictOutcome,
  PredictOutcomeToken,
} from '../../../types';
import PredictFlashMarketCard from './PredictFlashMarketCard';
import PredictInlineMarketCard from './PredictInlineMarketCard';
import PredictPlayEventCard from './PredictPlayEventCard';
import { PREDICT_GAME_LIVE_TEST_IDS } from '../PredictGameLive.testIds';

interface PredictGameLiveFeedProps {
  items: GameLiveFeedItem[];
  game: PredictMarketGame;
  onBuyPress: (outcome: PredictOutcome, token: PredictOutcomeToken) => void;
}

/** Offsets at or below this still count as "at the top" for auto-pinning. */
const PIN_TO_TOP_THRESHOLD_PX = 24;

/**
 * Newest-first live feed: play-by-play cards interleaved with flash
 * micro-markets and real inline betting widgets. Stays pinned to the newest
 * item as plays arrive unless the user has scrolled down into history.
 */
const PredictGameLiveFeed: React.FC<PredictGameLiveFeedProps> = ({
  items,
  game,
  onBuyPress,
}) => {
  const listRef = useRef<FlashList<GameLiveFeedItem>>(null);
  const isAtTopRef = useRef(true);
  const newestItemId = items[0]?.id;

  const handleScroll = useCallback(
    (scrollEvent: NativeSyntheticEvent<NativeScrollEvent>) => {
      isAtTopRef.current =
        scrollEvent.nativeEvent.contentOffset.y <= PIN_TO_TOP_THRESHOLD_PX;
    },
    [],
  );

  useEffect(() => {
    if (newestItemId && isAtTopRef.current) {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  }, [newestItemId]);

  const renderItem: ListRenderItem<GameLiveFeedItem> = useCallback(
    ({ item }) => {
      switch (item.kind) {
        case 'play':
          return <PredictPlayEventCard event={item.event} game={game} />;
        case 'flash':
          return <PredictFlashMarketCard event={item.event} />;
        case 'market':
          return (
            <PredictInlineMarketCard
              marketKind={item.marketKind}
              outcomes={item.outcomes}
              game={game}
              onBuyPress={onBuyPress}
            />
          );
        default:
          return null;
      }
    },
    [game, onBuyPress],
  );

  if (items.length === 0) {
    return (
      <Box alignItems={BoxAlignItems.Center} twClassName="py-12 px-4">
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('predict.game_live.waiting_for_plays')}
        </Text>
      </Box>
    );
  }

  return (
    <FlashList
      ref={listRef}
      testID={PREDICT_GAME_LIVE_TEST_IDS.FEED}
      data={items}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      getItemType={(item) => item.kind}
      onScroll={handleScroll}
      scrollEventThrottle={16}
    />
  );
};

export default memo(PredictGameLiveFeed);
