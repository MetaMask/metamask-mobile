import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  type ListRenderItemInfo,
} from 'react-native';
import {
  type RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Box,
  Button,
  ButtonVariant,
  HeaderStandard,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useFeed } from '../../hooks/useFeed';
import {
  getFeedScreen,
  getFeedScreenTab,
  type FeedScreenDefinition,
} from '../../navigation/feedScreens';
import { PredictNextRoutes } from '../../navigation/routes';
import type { PredictNextStackParamList } from '../../navigation/types';
import { PredictEventCard } from '../../events/cards';
import type { PredictEvent, PredictVenueId } from '../../types';
import { FeedScreenTabs } from './internal/FeedScreenTabs';
import { PredictFeedScreenTestIds } from './PredictFeedScreen.testIds';

const FEED_PAGE_LIMIT = 20;

interface PredictFeedContentProps {
  venueId: PredictVenueId;
  definition: FeedScreenDefinition;
  selectedTabId?: string;
  onBack: () => void;
  onOpenEvent: (event: PredictEvent) => void;
}

const EventSeparator = () => <Box twClassName="h-3" />;

const FeedLoading = () => (
  <Box testID={PredictFeedScreenTestIds.LOADING} twClassName="gap-3 px-3 pt-2">
    <Box twClassName="h-40 rounded-2xl bg-muted" />
    <Box twClassName="h-40 rounded-2xl bg-muted" />
  </Box>
);

const FeedError = ({ onRetry }: { onRetry: () => void }) => (
  <Box
    testID={PredictFeedScreenTestIds.ERROR}
    twClassName="items-start gap-2 px-4 py-6"
  >
    <Text>Events couldn’t be loaded.</Text>
    <Button
      testID={PredictFeedScreenTestIds.RETRY}
      variant={ButtonVariant.Tertiary}
      onPress={onRetry}
    >
      Retry
    </Button>
  </Box>
);

const PredictFeedContent = ({
  venueId,
  definition,
  selectedTabId,
  onBack,
  onOpenEvent,
}: PredictFeedContentProps) => {
  const tw = useTailwind();
  const defaultTab = getFeedScreenTab(definition, selectedTabId);
  const [activeTabId, setActiveTabId] = useState(defaultTab.id);
  const activeTab = getFeedScreenTab(definition, activeTabId);
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useFeed(venueId, activeTab.feedId, { limit: FEED_PAGE_LIMIT });
  const events = useMemo(
    () => data?.pages.flatMap((page) => page.events) ?? [],
    [data],
  );
  const hasInitialError = isError && events.length === 0;
  const hasNextPageError = isError && events.length > 0;

  const handleEndReached = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage || isError) {
      return;
    }

    fetchNextPage().catch(() => undefined);
  }, [fetchNextPage, hasNextPage, isError, isFetchingNextPage]);

  const handleNextPageRetry = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) {
      return;
    }

    fetchNextPage().catch(() => undefined);
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const handleRetry = useCallback(() => {
    refetch().catch(() => undefined);
  }, [refetch]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<PredictEvent>) => (
      <PredictEventCard event={item} onPress={() => onOpenEvent(item)} />
    ),
    [onOpenEvent],
  );

  const renderEmpty = useCallback(
    () => (
      <Box
        testID={PredictFeedScreenTestIds.EMPTY}
        twClassName="items-center px-4 py-8"
      >
        <Text>No events available.</Text>
      </Box>
    ),
    [],
  );

  const renderFooter = useCallback(() => {
    if (isFetchingNextPage) {
      return (
        <Box
          testID={PredictFeedScreenTestIds.NEXT_PAGE_LOADING}
          twClassName="items-center py-4"
        >
          <ActivityIndicator />
        </Box>
      );
    }

    if (hasNextPageError) {
      return (
        <Box
          testID={PredictFeedScreenTestIds.NEXT_PAGE_ERROR}
          twClassName="items-start gap-2 px-4 py-4"
        >
          <Text>More events couldn’t be loaded.</Text>
          <Button
            testID={PredictFeedScreenTestIds.NEXT_PAGE_RETRY}
            variant={ButtonVariant.Tertiary}
            onPress={handleNextPageRetry}
          >
            Retry
          </Button>
        </Box>
      );
    }

    return null;
  }, [handleNextPageRetry, hasNextPageError, isFetchingNextPage]);

  let feedContent: React.ReactNode;
  if (isLoading) {
    feedContent = <FeedLoading />;
  } else if (hasInitialError) {
    feedContent = <FeedError onRetry={handleRetry} />;
  } else {
    feedContent = (
      <FlatList
        key={activeTab.id}
        testID={PredictFeedScreenTestIds.LIST}
        data={events}
        renderItem={renderItem}
        keyExtractor={(event) => `${event.venueId}-${event.id}`}
        ItemSeparatorComponent={EventSeparator}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        contentContainerStyle={tw.style('px-3 pb-6')}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.6}
        showsVerticalScrollIndicator={false}
      />
    );
  }

  return (
    <Box testID={PredictFeedScreenTestIds.VIEW} twClassName="flex-1 bg-default">
      <HeaderStandard
        title={definition.title}
        onBack={onBack}
        includesTopInset
        backButtonProps={{ testID: PredictFeedScreenTestIds.BACK }}
      />
      <Box twClassName="flex-1">
        <Box twClassName="px-4 pb-3 pt-4">
          {definition.selectionLabel ? (
            <Text variant={TextVariant.HeadingMd}>
              {definition.selectionLabel}
            </Text>
          ) : null}
        </Box>
        <FeedScreenTabs
          tabs={definition.tabs}
          selectedTabId={activeTab.id}
          onTabSelect={setActiveTabId}
        />
        {feedContent}
      </Box>
    </Box>
  );
};

export const PredictFeedScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<PredictNextStackParamList>>();
  const { venueId, feedScreenId, selectedTabId } =
    useRoute<RouteProp<PredictNextStackParamList, 'PredictNextFeed'>>().params;
  const definition = getFeedScreen(feedScreenId);

  const handleBack = useCallback(
    () =>
      navigation.canGoBack()
        ? navigation.goBack()
        : navigation.navigate(PredictNextRoutes.HOME),
    [navigation],
  );

  const handleOpenEvent = useCallback(
    (event: PredictEvent) =>
      navigation.navigate(PredictNextRoutes.EVENT_DETAIL, {
        venueId: event.venueId,
        eventId: event.id,
        title: event.title,
      }),
    [navigation],
  );

  if (!definition) {
    return (
      <Box
        testID={PredictFeedScreenTestIds.UNAVAILABLE}
        twClassName="flex-1 gap-6 p-4 pt-12"
      >
        <Button
          testID={PredictFeedScreenTestIds.BACK}
          variant={ButtonVariant.Tertiary}
          onPress={handleBack}
        >
          Back
        </Button>
        <Text>This feed is unavailable.</Text>
      </Box>
    );
  }

  return (
    <PredictFeedContent
      venueId={venueId}
      definition={definition}
      selectedTabId={selectedTabId}
      onBack={handleBack}
      onOpenEvent={handleOpenEvent}
    />
  );
};
