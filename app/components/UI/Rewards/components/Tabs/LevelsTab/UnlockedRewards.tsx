import React from 'react';
import { useSelector } from 'react-redux';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import {
  selectUnlockedRewardLoading,
  selectSeasonRewardById,
  selectUnlockedRewards,
  selectUnlockedRewardError,
  selectSeasonStartDate,
} from '../../../../../../reducers/rewards/selectors';
import { RewardDto } from '../../../../../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../../../../../locales/i18n';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { REWARDS_VIEW_SELECTORS } from '../../../Views/RewardsView.constants';
import RewardItem from './RewardItem';
import { useUnlockedRewards } from '../../../hooks/useUnlockedRewards';
import { Skeleton } from '../../../../../../component-library/components/Skeleton';
import BannerAlert from '../../../../../../component-library/components/Banners/Banner/variants/BannerAlert';
import { BannerAlertSeverity } from '../../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button/Button.types';
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
    <Box twClassName="flex-row items-center gap-2 items-center">
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
  const tw = useTailwind();

  const { fetchUnlockedRewards } = useUnlockedRewards();

  const renderRewardsContent = () => {
    const shouldShowSkeleton =
      (isLoading || unlockedRewards === null) &&
      !unlockedRewards?.length &&
      !hasError;

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
  if (unlockedRewards && !unlockedRewards?.length) {
    // Not pending and empty, for unlocked rewards we don't show anything
    return null;
  }

  return (
    <Box
      twClassName="py-4 gap-4"
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
        <BannerAlert
          severity={BannerAlertSeverity.Error}
          title={strings('rewards.unlocked_rewards_error.error_fetching_title')}
          description={strings(
            'rewards.unlocked_rewards_error.error_fetching_description',
          )}
          actionButtonProps={{
            size: ButtonSize.Md,
            style: tw.style('mt-2'),
            onPress: fetchUnlockedRewards,
            label: strings('rewards.unlocked_rewards_error.retry_button'),
            variant: ButtonVariants.Primary,
          }}
        />
      )}

      {renderRewardsContent()}
    </Box>
  );
};

export default UnlockedRewards;
