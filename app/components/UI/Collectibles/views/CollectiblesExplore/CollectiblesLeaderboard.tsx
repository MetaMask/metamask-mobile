import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useState } from 'react';
import { FlashList } from '@shopify/flash-list';
import { Box } from '@metamask/design-system-react-native';
import { useCollectiblesLeaderboard } from '../../hooks/useCollectiblesSocial';
import { useCollectiblesPresentation } from '../../hooks/useCollectiblesPresentation';
import type { CollectiblesLeaderboardSort } from '../../services/clients/CollectiblesSocialApiClient';
import LeaderboardRow from '../../components/CollectiblesDiscovery/LeaderboardRow';
import { ExploreState } from './ExploreState';
import CollectiblesLeaderboardSortControl from '../../components/CollectiblesDiscovery/CollectiblesLeaderboardSort';

/** Profiles ordered by Social using scores supplied by the Collectibles API. */
export default function CollectiblesLeaderboard({
  onProfile,
}: {
  onProfile: (profileId: string) => void;
}) {
  const tw = useTailwind();
  const [sort, setSort] =
    useState<CollectiblesLeaderboardSort>('collectiblesVolume');
  const result = useCollectiblesLeaderboard(sort);
  const presentation = useCollectiblesPresentation();
  return (
    <>
      <Box paddingHorizontal={4} paddingBottom={3} twClassName="items-end">
        <CollectiblesLeaderboardSortControl value={sort} onChange={setSort} />
      </Box>
      <FlashList
        data={result.data?.pages.flatMap((page) => page.items) ?? []}
        keyExtractor={(entry) => entry.profile.profileId}
        drawDistance={presentation.drawDistance}
        contentContainerStyle={tw.style('px-4 pb-6')}
        testID="collectibles-leaderboard-list"
        ListEmptyComponent={
          <ExploreState
            loading={result.isLoading}
            error={result.isError}
            onRetry={() => result.refetch()}
          />
        }
        renderItem={({ item }) => (
          <LeaderboardRow entry={item} sort={sort} onProfile={onProfile} />
        )}
        onEndReached={() => {
          if (result.hasNextPage && !result.isFetchingNextPage)
            return result.fetchNextPage();
        }}
      />
    </>
  );
}
