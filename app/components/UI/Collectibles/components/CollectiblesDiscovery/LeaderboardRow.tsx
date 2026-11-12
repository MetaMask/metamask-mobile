import React from 'react';
import { Pressable } from 'react-native';
import { Image } from 'expo-image';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { formatUsd } from '../../providers/pack-partner/utils/format';
import type {
  CollectiblesLeaderboardEntry,
  CollectiblesLeaderboardSort,
} from '../../services/clients/CollectiblesSocialApiClient';

/** Shared leaderboard row for home preview and the complete leaderboard. */
export default function LeaderboardRow({
  entry,
  sort,
  onProfile,
}: {
  entry: CollectiblesLeaderboardEntry;
  sort: CollectiblesLeaderboardSort;
  onProfile: (profileId: string) => void;
}) {
  const tw = useTailwind();
  const value =
    sort === 'collectiblesVolume'
      ? entry.summary.spentUsd === null
        ? '—'
        : formatUsd(Number(entry.summary.spentUsd))
      : sort === 'collectiblesEpic'
        ? entry.summary.epicCount
        : sort === 'collectiblesPokedex'
          ? `${entry.summary.pokedexCompletedCount}/${entry.summary.pokedexTotalCount}`
          : entry.summary.openedPackCount;
  return (
    <Pressable
      onPress={() => onProfile(entry.profile.profileId)}
      accessibilityRole="button"
      accessibilityLabel={entry.profile.displayName}
      testID={`collectibles-rank-${entry.rank}`}
    >
      <Box twClassName="flex-row items-center gap-3 py-3 border-b border-muted">
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          twClassName="w-5"
        >
          {entry.rank}
        </Text>
        {entry.profile.avatarUrl && (
          <Image
            source={entry.profile.avatarUrl}
            style={tw.style('h-10 w-10 rounded-full')}
            contentFit="cover"
          />
        )}
        <Box twClassName="flex-1" gap={1}>
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Bold}
            numberOfLines={1}
          >
            {entry.profile.displayName}
          </Text>
          <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
            @{entry.profile.username}
          </Text>
        </Box>
        <Box gap={1}>
          <Text fontWeight={FontWeight.Bold} twClassName="text-right">
            {value}
          </Text>
          <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
            {strings('collectibles_discovery.packs_count', {
              count: entry.summary.openedPackCount,
            })}
          </Text>
        </Box>
      </Box>
    </Pressable>
  );
}
