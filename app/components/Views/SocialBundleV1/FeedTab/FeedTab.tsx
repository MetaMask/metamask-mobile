import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import FeedCard from './FeedCard';
import FilterPills from './FilterPills';
import { FEED_PAGE_SIZE, buildFeedPage } from './mocks/feedMockData';
import type { FeedAudience, FeedItem } from './mocks/types';

const APPEND_DELAY_MS = 500;

const Separator: React.FC = () => {
  const tw = useTailwind();
  return <View style={tw.style('h-px bg-border-muted mx-4')} />;
};

const EmptyFollowing: React.FC = () => {
  const tw = useTailwind();
  return (
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      style={tw.style('flex-1 px-6 py-16 gap-2')}
    >
      <Text variant={TextVariant.HeadingSm} color={TextColor.TextDefault}>
        Follow some traders to see them here
      </Text>
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        style={tw.style('text-center')}
      >
        Switch to Trending to see the live pulse of every trader.
      </Text>
    </Box>
  );
};

/**
 * Feed tab body: pill toggle + FlatList with fake-latency infinite append.
 *
 * The pill audience swap fully rebuilds the list from page 0. `onEndReached`
 * appends another page after a 500ms delay so scrolling feels alive without
 * shipping any real fetching for the prototype.
 */
const FeedTab: React.FC = () => {
  const tw = useTailwind();
  const [audience, setAudience] = useState<FeedAudience>('trending');
  const [items, setItems] = useState<FeedItem[]>(() =>
    buildFeedPage(0, 'trending'),
  );
  const [pageIndex, setPageIndex] = useState(0);
  const [isAppending, setIsAppending] = useState(false);
  // Guard `onEndReached` firing multiple times per scroll gesture.
  const isAppendingRef = useRef(false);

  const handleAudienceChange = useCallback((next: FeedAudience) => {
    setAudience(next);
    setPageIndex(0);
    setItems(buildFeedPage(0, next));
  }, []);

  const handleEndReached = useCallback(() => {
    if (isAppendingRef.current) return;
    // Following audience has a small deterministic mock set — after 3 pages,
    // stop appending so the empty state / bottom padding lands cleanly.
    if (audience === 'following' && items.length >= FEED_PAGE_SIZE) return;

    isAppendingRef.current = true;
    setIsAppending(true);
    const nextPage = pageIndex + 1;
    setTimeout(() => {
      setItems((prev) => [...prev, ...buildFeedPage(nextPage, audience)]);
      setPageIndex(nextPage);
      setIsAppending(false);
      isAppendingRef.current = false;
    }, APPEND_DELAY_MS);
  }, [audience, items.length, pageIndex]);

  // Reset the append lock whenever the audience swaps.
  useEffect(() => {
    isAppendingRef.current = false;
  }, [audience]);

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => <FeedCard item={item} />,
    [],
  );

  const keyExtractor = useCallback((item: FeedItem) => item.id, []);

  return (
    <Box style={tw.style('flex-1')}>
      <FilterPills audience={audience} onChange={handleAudienceChange} />
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ItemSeparatorComponent={Separator}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        contentContainerStyle={tw.style('pb-8')}
        ListEmptyComponent={
          audience === 'following' ? <EmptyFollowing /> : null
        }
        ListFooterComponent={
          isAppending ? (
            <Box style={tw.style('py-4')}>
              <ActivityIndicator />
            </Box>
          ) : null
        }
      />
    </Box>
  );
};

export default FeedTab;
