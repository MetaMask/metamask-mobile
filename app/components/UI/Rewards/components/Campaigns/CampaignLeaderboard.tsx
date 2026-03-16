import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { FlatList, type ListRenderItemInfo } from 'react-native';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Text,
  TextColor,
  TextVariant,
  Icon,
  IconColor,
  IconName,
  IconSize,
  FontWeight,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { selectReferralCode } from '../../../../../reducers/rewards/selectors';
import { useGetCampaignLeaderboard } from '../../hooks/useGetCampaignLeaderboard';
import type { LeaderboardEntryDto } from '../../../../../core/Engine/controllers/rewards-controller/types';

export const CAMPAIGN_LEADERBOARD_TEST_IDS = {
  CONTAINER: 'campaign-leaderboard-container',
  HEADER: 'campaign-leaderboard-header',
  ROW: 'campaign-leaderboard-row',
  SEPARATOR: 'campaign-leaderboard-separator',
} as const;

interface CampaignLeaderboardProps {
  campaignId: string;
}

interface LeaderboardRow {
  type: 'entry';
  rank: number;
  entry: LeaderboardEntryDto;
}

interface SeparatorRow {
  type: 'separator';
}

type ListItem = LeaderboardRow | SeparatorRow;

function formatScore(score: string): string {
  const dollars = Math.floor(parseFloat(score));
  return '$' + dollars.toLocaleString('en-US');
}

const CampaignLeaderboard: React.FC<CampaignLeaderboardProps> = ({
  campaignId,
}) => {
  const { leaderboard } = useGetCampaignLeaderboard(campaignId);
  const userReferralCode = useSelector(selectReferralCode);
  const flatListRef = useRef<FlatList<ListItem>>(null);

  const userIndex = useMemo(() => {
    if (!leaderboard || !userReferralCode) return -1;
    return leaderboard.top20.findIndex(
      (entry) => entry.referralCode === userReferralCode,
    );
  }, [leaderboard, userReferralCode]);

  const listData = useMemo((): ListItem[] => {
    if (!leaderboard) return [];

    const items: ListItem[] = [];
    leaderboard.top20.forEach((entry, index) => {
      // Insert separator between rank 3 and user entry when user rank > 4
      if (index === 3 && userIndex > 3) {
        items.push({ type: 'separator' });
      }
      items.push({ type: 'entry', rank: index + 1, entry });
    });
    return items;
  }, [leaderboard, userIndex]);

  // The index in listData for the user's entry (accounting for the separator offset)
  const userListIndex = useMemo(() => {
    if (userIndex < 0) return -1;
    // If separator was inserted before the user's entry, shift by 1
    return userIndex > 3 ? userIndex + 1 : userIndex;
  }, [userIndex]);

  useEffect(() => {
    if (
      leaderboard &&
      userListIndex >= 0 &&
      flatListRef.current &&
      listData.length > 0
    ) {
      flatListRef.current.scrollToIndex({
        index: userListIndex,
        animated: true,
      });
    }
  }, [leaderboard, userListIndex, listData.length]);

  const renderHeader = useCallback(
    () => (
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="px-4 pt-4 pb-2"
        testID={CAMPAIGN_LEADERBOARD_TEST_IDS.HEADER}
      >
        <Text
          variant={TextVariant.HeadingMd}
          fontWeight={FontWeight.Bold}
          twClassName="mr-2"
        >
          {strings('rewards.campaign_details.leaderboard')}
        </Text>
        <Box twClassName="rounded-xl bg-muted px-2 py-1">
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('rewards.campaign_details.leaderboard_pending')}
          </Text>
        </Box>
        <Box twClassName="flex-1" />
        <Icon
          name={IconName.ArrowRight}
          size={IconSize.Md}
          color={IconColor.IconDefault}
        />
      </Box>
    ),
    [],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ListItem>) => {
      if (item.type === 'separator') {
        return (
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="px-4 py-2"
            testID={CAMPAIGN_LEADERBOARD_TEST_IDS.SEPARATOR}
          >
            <Box twClassName="flex-1 h-px bg-border-muted" />
            <Text twClassName="mx-2 text-alternative">···</Text>
            <Box twClassName="flex-1 h-px bg-border-muted" />
          </Box>
        );
      }

      const { rank, entry } = item;
      const isUser = entry.referralCode === userReferralCode;
      const color = isUser ? TextColor.SuccessDefault : TextColor.TextDefault;

      return (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="py-3 px-4"
          testID={`${CAMPAIGN_LEADERBOARD_TEST_IDS.ROW}-${rank}`}
        >
          <Box twClassName="w-9 h-9 rounded-full bg-overlay-default items-center justify-center mr-4">
            <Text color={color}>{rank}</Text>
          </Box>
          <Text color={color} twClassName="flex-1">
            /{entry.referralCode ?? '—'}
          </Text>
          <Text color={color}>{formatScore(entry.totalScore)}</Text>
        </Box>
      );
    },
    [userReferralCode],
  );

  if (!leaderboard || leaderboard.top20.length === 0) {
    return null;
  }

  return (
    <FlatList
      ref={flatListRef}
      data={listData}
      keyExtractor={(item, index) =>
        item.type === 'separator' ? `separator-${index}` : `rank-${item.rank}`
      }
      renderItem={renderItem}
      ListHeaderComponent={renderHeader}
      scrollEnabled={false}
      testID={CAMPAIGN_LEADERBOARD_TEST_IDS.CONTAINER}
      onScrollToIndexFailed={() => {
        // Silently ignore scroll failures (e.g. not yet laid out)
      }}
    />
  );
};

export default CampaignLeaderboard;
