import React, { useCallback, useMemo } from 'react';
import { FlatList, ListRenderItem } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
  Button,
  ButtonVariant,
  ButtonSize,
  TextButton,
  Icon,
  IconName,
  IconColor,
  TextButtonSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import RewardsErrorBanner from '../RewardsErrorBanner';
import { formatNumber } from '../../utils/formatUtils';
import {
  DropLeaderboardDto,
  DropLeaderboardEntryDto,
  DropStatus,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import { DROP_LEADERBOARD_RANK_TBD } from '../../../../../reducers/rewards';

interface DropLeaderboardProps {
  leaderboard: DropLeaderboardDto | null;
  isLoading: boolean;
  error: string | null;
  canCommit: boolean;
  dropStatus: DropStatus;
  onAddMorePoints?: () => void;
}

const DropLeaderboard: React.FC<DropLeaderboardProps> = ({
  leaderboard,
  isLoading,
  error,
  canCommit,
  dropStatus,
  onAddMorePoints,
}) => {
  const userRank = leaderboard?.userPosition?.rank;
  const renderEntry: ListRenderItem<DropLeaderboardEntryDto> = useCallback(
    ({ item }) => {
      const isUserRow = userRank !== undefined && item.rank === userRank;
      return (
        <Box
          twClassName={`flex-row items-center py-3 px-2 ${isUserRow ? 'bg-primary-muted rounded-lg' : ''}`}
          testID={`leaderboard-entry-${item.rank}`}
        >
          {/* Rank circle */}
          <Box twClassName="w-10 h-10 rounded-full bg-section items-center justify-center mr-3">
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {item.rank}
            </Text>
          </Box>

          {/* Identifier */}
          <Text
            variant={TextVariant.BodyMd}
            twClassName="flex-1 text-default"
            numberOfLines={1}
          >
            {item.identifier ?? '—'}
          </Text>

          {/* Points */}
          <Text variant={TextVariant.BodySm} twClassName="text-alternative">
            {strings('rewards.drop_detail.leaderboard_pts', {
              points: formatNumber(item.points),
            })}
          </Text>
        </Box>
      );
    },
    [userRank],
  );

  const keyExtractor = useCallback(
    (item: DropLeaderboardEntryDto) => String(item.rank),
    [],
  );

  // Format the rank display - show TBD if rank is pending calculation
  const formattedRank = useMemo(() => {
    const userPosition = leaderboard?.userPosition;
    if (!userPosition) {
      return null;
    }
    if (userPosition.rank === DROP_LEADERBOARD_RANK_TBD) {
      return strings('rewards.drop_detail.leaderboard_rank_tbd');
    }
    return `#${formatNumber(userPosition.rank)}`;
  }, [leaderboard?.userPosition]);

  if (isLoading) {
    return (
      <Box
        twClassName="h-40 bg-background-muted rounded-lg animate-pulse"
        testID="leaderboard-skeleton"
      />
    );
  }

  if (error) {
    return (
      <RewardsErrorBanner
        title={strings('rewards.drop_detail.error_title')}
        description={error}
        testID="leaderboard-error-banner"
      />
    );
  }

  if (!leaderboard) {
    return null;
  }

  const { userPosition, top20, totalParticipants } = leaderboard;
  const showAddMorePoints = canCommit && dropStatus === DropStatus.OPEN;

  return (
    <Box twClassName="gap-4" testID="drop-leaderboard">
      {/* User Position Panel */}
      {userPosition && (
        <Box
          twClassName="bg-section rounded-xl p-4"
          testID="leaderboard-user-position"
        >
          {/* Top row */}
          <Box twClassName="flex-row items-center">
            {/* Star icon */}
            <Box twClassName="w-10 h-10 rounded-full bg-muted items-center justify-center mr-3">
              <Icon name={IconName.Star} color={IconColor.WarningDefault} />
            </Box>

            {/* Rank info */}
            <Box twClassName="flex-1">
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
                {formattedRank}
              </Text>
              <Text variant={TextVariant.BodySm} twClassName="text-alternative">
                {strings('rewards.drop_detail.leaderboard_of', {
                  total: formatNumber(totalParticipants),
                })}
              </Text>
            </Box>

            {/* Points */}
            <Text variant={TextVariant.BodySm} twClassName="text-alternative">
              {strings('rewards.drop_detail.leaderboard_pts', {
                points: formatNumber(userPosition.points),
              })}
            </Text>
          </Box>

          {/* Divider */}
          <Box twClassName="h-px bg-border-muted my-3" />

          {/* Bottom row */}
          <Box twClassName="flex-row items-center">
            <Text
              variant={TextVariant.BodySm}
              twClassName="flex-1 text-alternative"
              numberOfLines={1}
            >
              {userPosition.identifier ?? '—'}
            </Text>
            <TextButton
              size={TextButtonSize.BodySm}
              isDisabled
              testID="leaderboard-change-button"
            >
              {strings('rewards.drop_detail.leaderboard_change')}
            </TextButton>
          </Box>
        </Box>
      )}

      {/* Leaderboard Entries */}
      {top20.length > 0 && (
        <FlatList
          data={top20}
          renderItem={renderEntry}
          keyExtractor={keyExtractor}
          scrollEnabled={false}
          testID="leaderboard-entries-list"
        />
      )}

      {/* Add more points button */}
      {showAddMorePoints && (
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={onAddMorePoints}
          twClassName="w-full mt-4"
          testID="leaderboard-add-more-points"
        >
          {strings('rewards.drop_detail.leaderboard_add_more_points')}
        </Button>
      )}
    </Box>
  );
};

export default DropLeaderboard;
