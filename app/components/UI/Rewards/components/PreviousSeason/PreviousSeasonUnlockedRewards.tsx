import React, { useCallback, useMemo } from 'react';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Text,
  TextVariant,
  FontWeight,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  selectUnlockedRewards,
  selectSeasonTiers,
  selectUnlockedRewardLoading,
  selectUnlockedRewardError,
  selectCurrentTier,
} from '../../../../../reducers/rewards/selectors';
import { useSelector } from 'react-redux';
import {
  RewardDto,
  SeasonRewardDto,
  SeasonRewardType,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import { useUnlockedRewards } from '../../hooks/useUnlockedRewards';
import RewardsSeasonEndedNoUnlockedRewardsImage from '../../../../../images/rewards/rewards-season-ended-no-unlocked-rewards.svg';
import RewardsErrorBanner from '../RewardsErrorBanner';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import RewardItem from '../RewardItem/RewardItem';
import { useTheme } from '../../../../../util/theme';
import Routes from '../../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';

const PreviousSeasonUnlockedRewards = () => {
  const navigation = useNavigation();
  const { fetchUnlockedRewards } = useUnlockedRewards();
  const tw = useTailwind();
  const theme = useTheme();
  const unlockedRewards = useSelector(selectUnlockedRewards);
  const unlockedRewardsLoading = useSelector(selectUnlockedRewardLoading);
  const unlockedRewardsError = useSelector(selectUnlockedRewardError);
  const seasonTiers = useSelector(selectSeasonTiers);
  const currentTier = useSelector(selectCurrentTier);
  const handleRewardPress = useCallback(
    (rewardId: string, seasonReward: SeasonRewardDto) => {
      if (seasonReward.rewardType === SeasonRewardType.METAL_CARD) {
        navigation.navigate(
          Routes.MODAL.REWARDS_METAL_CARD_CLAIM_BOTTOM_SHEET,
          {
            rewardId,
            seasonRewardId: seasonReward.id,
          },
        );
      }
    },
    [navigation],
  );

  const endOfSeasonRewards = useMemo(() => {
    if (unlockedRewards != null && unlockedRewards !== undefined) {
      return unlockedRewards.filter((reward: RewardDto) => {
        const matchingSeasonReward = seasonTiers
          ?.flatMap((tier) => tier.rewards)
          ?.find((sr) => sr.id === reward.seasonRewardId);
        return matchingSeasonReward?.isEndOfSeasonReward;
      });
    }

    if (currentTier?.pointsNeeded) {
      return null;
    }

    return [];
  }, [currentTier?.pointsNeeded, seasonTiers, unlockedRewards]);

  if (
    unlockedRewardsError &&
    !unlockedRewardsLoading &&
    endOfSeasonRewards === null
  ) {
    return (
      <Box flexDirection={BoxFlexDirection.Column} twClassName="flex-col mt-2">
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
      </Box>
    );
  }

  return (
    <Box flexDirection={BoxFlexDirection.Column} twClassName="flex-col mt-2">
      <Box flexDirection={BoxFlexDirection.Column} twClassName="gap-4">
        <Text
          variant={TextVariant.HeadingMd}
          fontWeight={FontWeight.Bold}
          twClassName="text-default"
        >
          {strings('rewards.unlocked_rewards.title')}
        </Text>

        {unlockedRewardsLoading || endOfSeasonRewards === null ? (
          <Box flexDirection={BoxFlexDirection.Column} twClassName="w-full">
            <Skeleton style={tw.style('h-32 bg-rounded')} />
          </Box>
        ) : (
          <Box
            flexDirection={BoxFlexDirection.Column}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
            twClassName="gap-4"
          >
            {endOfSeasonRewards?.length > 0 ? (
              <Box
                flexDirection={BoxFlexDirection.Column}
                twClassName="gap-4 w-full"
              >
                <Box twClassName="flex-col">
                  {endOfSeasonRewards?.map((unlockedReward: RewardDto) => {
                    const seasonReward = seasonTiers
                      ?.flatMap((tier) => tier.rewards)
                      ?.find(
                        (sr) => sr.id === unlockedReward.seasonRewardId,
                      ) as SeasonRewardDto;
                    const isClaimable =
                      seasonReward?.rewardType === SeasonRewardType.METAL_CARD;
                    return (
                      <RewardItem
                        key={unlockedReward.id}
                        reward={unlockedReward}
                        seasonReward={seasonReward}
                        isLast={unlockedReward === endOfSeasonRewards.at(-1)}
                        isEndOfSeasonReward
                        compact
                        isLocked={!isClaimable}
                        onPress={isClaimable ? handleRewardPress : undefined}
                      />
                    );
                  })}
                </Box>
              </Box>
            ) : (
              <>
                <RewardsSeasonEndedNoUnlockedRewardsImage
                  name="RewardsSeasonEndedNoUnlockedRewardsImage"
                  color={
                    theme.themeAppearance === 'dark'
                      ? theme.colors.background.default
                      : theme.colors.text.muted
                  }
                  width={80}
                  height={80}
                />

                <Text
                  variant={TextVariant.BodyMd}
                  twClassName="text-alternative max-w-xs text-center"
                >
                  {currentTier?.pointsNeeded
                    ? strings(
                        'rewards.previous_season_summary.verifying_rewards',
                      )
                    : strings(
                        'rewards.previous_season_summary.no_end_of_season_rewards',
                      )}
                </Text>
              </>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default PreviousSeasonUnlockedRewards;
