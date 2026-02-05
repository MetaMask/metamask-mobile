import React, { useCallback, useMemo } from 'react';
import { FlatList, ListRenderItem } from 'react-native';
import { useSelector } from 'react-redux';
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
import { useDropCommittedAddress } from '../../hooks/useDropCommittedAddress';
import AvatarAccount from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import { selectAvatarAccountType } from '../../../../../selectors/settings';
import {
  selectIsUpdatingDropAddress,
  selectIsValidatingDropAddress,
} from '../../../../../selectors/rewards';
import { Skeleton } from '../../../../../component-library/components/Skeleton';

/**
 * Shortens an address to 0x1234...5678 format
 */
const shortenAddress = (address: string): string => {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

interface DropLeaderboardProps {
  leaderboard: DropLeaderboardDto | null;
  isLoading: boolean;
  error: string | null;
  canCommit: boolean;
  dropStatus: DropStatus;
  dropId?: string;
  onAddMorePoints?: () => void;
  onChangeAccount?: () => void;
}

const DropLeaderboard: React.FC<DropLeaderboardProps> = ({
  leaderboard,
  isLoading,
  error,
  canCommit,
  dropStatus,
  dropId,
  onAddMorePoints,
  onChangeAccount,
}) => {
  const userRank = leaderboard?.userPosition?.rank;
  const userPoints = leaderboard?.userPosition?.points;
  const avatarAccountType = useSelector(selectAvatarAccountType);
  const isUpdatingAddress = useSelector(selectIsUpdatingDropAddress);
  const isValidatingAccount = useSelector(selectIsValidatingDropAddress);
  const {
    committedAddress,
    accountGroupInfo,
    isLoading: isLoadingCommittedAddress,
  } = useDropCommittedAddress(dropId);
  const renderEntry: ListRenderItem<DropLeaderboardEntryDto> = useCallback(
    ({ item }) => {
      const isUserRow = userRank !== undefined && item.rank === userRank;
      // If this is the user's row and the leaderboard entry has lower points than the user's actual points,
      // use the user's points instead (handles stale leaderboard data)
      const displayPoints =
        isUserRow && userPoints !== undefined && item.points < userPoints
          ? userPoints
          : item.points;
      return (
        <Box
          twClassName={`flex-row items-center py-3 px-2 rounded-lg`}
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
              points: formatNumber(displayPoints),
            })}
          </Text>
        </Box>
      );
    },
    [userRank, userPoints],
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

  if ((isLoading && !leaderboard?.dropId) || isUpdatingAddress || isValidatingAccount) {
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

  // Don't show user position if totalParticipants is 0 (empty leaderboard)
  const showUserPosition = userPosition && totalParticipants > 0;

  return (
    <Box twClassName="gap-4" testID="drop-leaderboard">
      {/* User Position Panel */}
      {showUserPosition && (
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

          {/* Bottom row - account info */}
          <Box twClassName="flex-row items-center">
            {isLoadingCommittedAddress ? (
              <Box twClassName="flex-1">
                <Skeleton width={120} height={16} />
              </Box>
            ) : accountGroupInfo ? (
              <Box
                twClassName="flex-row items-center flex-1"
                testID="leaderboard-account-group"
              >
                <AvatarAccount
                  accountAddress={accountGroupInfo.evmAddress}
                  type={avatarAccountType}
                  size={AvatarSize.Sm}
                />
                <Text
                  variant={TextVariant.BodySm}
                  twClassName="text-alternative ml-2"
                  numberOfLines={1}
                >
                  {accountGroupInfo.name}
                </Text>
              </Box>
            ) : (
              <Text
                variant={TextVariant.BodySm}
                twClassName="flex-1 text-alternative"
                numberOfLines={1}
              >
                {committedAddress
                  ? shortenAddress(committedAddress)
                  : (userPosition.identifier ?? '—')}
              </Text>
            )}

            <TextButton
              size={TextButtonSize.BodySm}
              onPress={onChangeAccount}
              isDisabled={isLoadingCommittedAddress}
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
          twClassName="w-full"
          testID="leaderboard-add-more-points"
        >
          {strings('rewards.drop_detail.leaderboard_add_more_points')}
        </Button>
      )}
    </Box>
  );
};

export default DropLeaderboard;
