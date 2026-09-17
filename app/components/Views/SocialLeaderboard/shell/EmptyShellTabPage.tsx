import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, FlatList, type ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { strings } from '../../../../../locales/i18n';
import FollowingEmptyState from '../FeedView/components/FollowingEmptyState';
import type { FeedAudience } from '../FeedView/types';
import {
  SocialFeedPositionCard,
  SocialFeedPositionCardSkeleton,
} from '../SocialV1View/feed/components';
import { useSocialV1Feed } from '../SocialV1View/feed/hooks/useSocialV1Feed';
import type { SocialV1FeedItem } from '../SocialV1View/feed/types';
import type { SocialTabPageHandle } from '../shared/tabPageScroll';

type AnimatedScrollHandler = React.ComponentProps<
  typeof Animated.ScrollView
>['onScroll'];

const SKELETON_COUNT = 3;
const SKELETON_KEYS = Array.from(
  { length: SKELETON_COUNT },
  (_, index) => `social-v1-feed-skeleton-${index}`,
);

export type SocialFeedShellTab = 'trending' | 'following';

/** Which feed scope each V1 tab reads. */
const TAB_AUDIENCE: Record<SocialFeedShellTab, FeedAudience> = {
  trending: 'all',
  following: 'following',
};

export interface EmptyShellTabPageProps {
  tab: SocialFeedShellTab;
  /**
   * The pager mounts every page up front. Gate the query until the tab is
   * first opened so the inactive tab does not fetch on mount.
   */
  isActive?: boolean;
  onScroll?: AnimatedScrollHandler;
  pageRef?: React.Ref<SocialTabPageHandle>;
  containerTestID: string;
  scrollTestID: string;
}

/**
 * Social Bundle V1 Trending / Following page.
 *
 * Renders live trader activity in the V1 post cards. Trending reads the generic
 * `leaderboard` scope and Following the per-user one, each under its own query
 * key, so the two tabs never share a list.
 */
const EmptyShellTabPage: React.FC<EmptyShellTabPageProps> = ({
  tab,
  isActive = true,
  onScroll,
  pageRef,
  containerTestID,
  scrollTestID,
}) => {
  const tw = useTailwind();
  const listRef = useRef<FlatList<SocialV1FeedItem>>(null);
  const skeletonScrollRef = useRef<ScrollView>(null);
  const [hasBeenActive, setHasBeenActive] = useState(isActive);

  const audience = TAB_AUDIENCE[tab];
  const {
    items,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMore,
    error,
    refresh,
  } = useSocialV1Feed({ audience, enabled: hasBeenActive });

  useEffect(() => {
    if (isActive) {
      setHasBeenActive(true);
    }
  }, [isActive]);

  useImperativeHandle(
    pageRef,
    () => ({
      scrollToOffset: (offset: number, animated = false) => {
        listRef.current?.scrollToOffset({ offset, animated });
        skeletonScrollRef.current?.scrollTo({ y: offset, animated });
      },
    }),
    [],
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage) {
      loadMore();
    }
  }, [hasNextPage, loadMore]);

  const renderItem = useCallback(
    ({ item }: { item: SocialV1FeedItem }) => (
      <SocialFeedPositionCard item={item} />
    ),
    [],
  );

  const keyExtractor = useCallback((item: SocialV1FeedItem) => item.id, []);

  // A separator rather than a `gap` on the content container: `gap` there also
  // spaces the footer and empty state, which own their own padding.
  const renderSeparator = useCallback(() => <Box twClassName="h-6" />, []);

  const listFooter = useMemo(() => {
    if (items.length === 0) {
      return null;
    }

    return (
      <Box twClassName="gap-3 pt-2">
        {isFetchingNextPage ? (
          <Box alignItems={BoxAlignItems.Center}>
            <ActivityIndicator size="small" />
          </Box>
        ) : null}
        {/* Names what the `*` on invented values means, once per tab. */}
        <Text variant={TextVariant.BodyXs} color={TextColor.TextMuted}>
          {strings('social_leaderboard.feed.position_card.mock_data_footnote')}
        </Text>
      </Box>
    );
  }, [isFetchingNextPage, items.length]);

  const listEmpty = useMemo(() => {
    if (error) {
      return (
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="flex-1 px-8 py-16 gap-3"
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
          >
            {strings('social_leaderboard.feed.error.title')}
          </Text>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Sm}
            onPress={refresh}
          >
            {strings('social_leaderboard.feed.error.retry')}
          </Button>
        </Box>
      );
    }

    return <FollowingEmptyState audience={audience} />;
  }, [audience, error, refresh]);

  if (!hasBeenActive) {
    return <Box twClassName="flex-1 bg-default" testID={containerTestID} />;
  }

  if (isLoading && items.length === 0) {
    return (
      <Box twClassName="flex-1 bg-default" testID={containerTestID}>
        <Animated.ScrollView
          ref={skeletonScrollRef}
          style={tw.style('flex-1')}
          contentContainerStyle={tw.style('pt-4 pb-8 gap-6')}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          testID={scrollTestID}
        >
          {SKELETON_KEYS.map((key) => (
            <SocialFeedPositionCardSkeleton key={key} />
          ))}
        </Animated.ScrollView>
      </Box>
    );
  }

  return (
    <Box twClassName="flex-1 bg-default" testID={containerTestID}>
      <Animated.FlatList
        ref={listRef}
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListFooterComponent={listFooter}
        ListEmptyComponent={listEmpty}
        ItemSeparatorComponent={renderSeparator}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        contentContainerStyle={tw.style('flex-grow px-4 pt-4 pb-8')}
        testID={scrollTestID}
      />
    </Box>
  );
};

export default EmptyShellTabPage;
