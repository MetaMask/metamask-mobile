import React from 'react';
import { useSelector } from 'react-redux';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import {
  selectUnlockedRewardLoading,
  selectSeasonRewardById,
  selectUnlockedRewards,
  selectUnlockedRewardError,
  selectSeasonStartDate,
  selectCurrentTier,
} from '../../../../../../reducers/rewards/selectors';
import { RewardDto } from '../../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../../locales/i18n';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { REWARDS_VIEW_SELECTORS } from '../../../Views/RewardsView.constants';
import RewardItem from '../../RewardItem/RewardItem';
import { useUnlockedRewards } from '../../../hooks/useUnlockedRewards';
import { Skeleton } from '../../../../../../component-library/components/Skeleton';
import RewardsErrorBanner from '../../RewardsErrorBanner';
import { ActivityIndicator } from 'react-native';
interface UnlockedRewardItemProps {
  reward: RewardDto;
  isLast?: boolean;
}

const UnlockedRewardItem: React.FC<UnlockedRewardItemProps> = ({
  reward,
  isLast = false,
}) => {
  const seasonReward = useSelector(
    selectSeasonRewardById(reward.seasonRewardId),
  );
  if (!seasonReward) {
    return null;
  }

  return (
    <Box twClassName=" bg-background-muted">
      <RewardItem
        seasonReward={seasonReward}
        reward={reward}
        isLast={isLast}
        isLocked={false}
      />
    </Box>
  );
};

const SectionHeader: React.FC<{ count: number | null; isLoading: boolean }> = ({
  count,
  isLoading,
}) => (
  <Box>
    <Box twClassName="flex-row items-center gap-2">
      <Text variant={TextVariant.HeadingMd} twClassName="text-default">
        {strings('rewards.unlocked_rewards.title')}
      </Text>
      {isLoading && <ActivityIndicator size="small" />}
      {count !== null && !isLoading && (
        <Box twClassName="bg-text-muted rounded-lg w-6 h-6 items-center justify-center">
          <Text variant={TextVariant.BodySm} twClassName="text-default">
            {count}
          </Text>
        </Box>
      )}
    </Box>
  </Box>
);

const UnlockedRewards: React.FC = () => {
  const unlockedRewards = useSelector(selectUnlockedRewards);
  const isLoading = useSelector(selectUnlockedRewardLoading);
  const hasError = useSelector(selectUnlockedRewardError);
  const seasonStartDate = useSelector(selectSeasonStartDate);
  const currentTier = useSelector(selectCurrentTier);
  const tw = useTailwind();

  const { fetchUnlockedRewards } = useUnlockedRewards();

  const renderRewardsContent = () => {
    const shouldShowSkeleton =
      (isLoading || unlockedRewards === null) &&
      !unlockedRewards?.length &&
      !hasError &&
      !!currentTier?.pointsNeeded;

    if (shouldShowSkeleton) {
      return <Skeleton style={tw.style('h-32 bg-rounded')} />;
    }

    if (unlockedRewards?.length) {
      return (
        <Box twClassName="rounded-xl overflow-hidden bg-background-default">
          {unlockedRewards.map((reward, index) => (
            <UnlockedRewardItem
              key={reward.id}
              reward={reward}
              isLast={index === unlockedRewards.length - 1}
            />
          ))}
        </Box>
      );
    }

    return <></>;
  };
  if (
    (unlockedRewards && !unlockedRewards?.length) ||
    !currentTier?.pointsNeeded
  ) {
    // Not pending and empty, for unlocked rewards we don't show anything
    return null;
  }

  return (
    <Box
      twClassName="pt-2 pb-6 px-4 gap-4"
      testID={REWARDS_VIEW_SELECTORS.UNLOCKED_REWARDS}
    >
      {/* Always show section header */}
      <SectionHeader
        count={unlockedRewards?.length || null}
        isLoading={
          isLoading ||
          (unlockedRewards === null && !hasError && !!seasonStartDate)
        }
      />

      {/* Show error banner if there's an error */}
      {hasError && !unlockedRewards?.length && !isLoading && (
        <RewardsErrorBanner
          title={strings('rewards.unlocked_rewards_error.error_fetching_title')}
          description={strings(
            'rewards.unlocked_rewards_error.error_fetching_description',
          )}
          onConfirm={fetchUnlockedRewards}
          confirmButtonLabel={strings(
            'rewards.unlocked_rewards_error.retry_button',
          )}
        />
      )}

      {renderRewardsContent()}
    </Box>
  );
};

export default UnlockedRewards;
