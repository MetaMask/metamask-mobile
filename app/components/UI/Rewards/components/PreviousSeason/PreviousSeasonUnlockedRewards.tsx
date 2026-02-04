import React, { useCallback, useMemo } from 'react';
import { FlatList } from 'react-native';
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
  EndOfSeasonUrlData,
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

  // Requires special modal actions for end of season reward claims
  const handleEndOfSeasonClaim = useCallback(
    (reward: RewardDto, seasonReward: SeasonRewardDto) => {
      switch (seasonReward.rewardType) {
        case SeasonRewardType.METAL_CARD:
          navigation.navigate(
            Routes.MODAL.REWARDS_END_OF_SEASON_CLAIM_BOTTOM_SHEET,
            {
              rewardId: reward.id,
              seasonRewardId: seasonReward.id,
              title: seasonReward.name,
              description: strings('rewards.metal_card_claim.description'),
              contactInfo: strings('rewards.metal_card_claim.contact_info'),
              rewardType: SeasonRewardType.METAL_CARD,
              showEmail: 'required',
              showTelegram: 'optional',
            },
          );
          break;
        case SeasonRewardType.NANSEN:
          navigation.navigate(
            Routes.MODAL.REWARDS_END_OF_SEASON_CLAIM_BOTTOM_SHEET,
            {
              rewardId: reward.id,
              seasonRewardId: seasonReward.id,
              title: seasonReward.name,
              description: seasonReward.longUnlockedDescription,
              url: (reward.claim?.data as EndOfSeasonUrlData)?.url,
              rewardType: SeasonRewardType.NANSEN,
            },
          );
          break;
        case SeasonRewardType.OTHERSIDE:
          navigation.navigate(
            Routes.MODAL.REWARDS_END_OF_SEASON_CLAIM_BOTTOM_SHEET,
            {
              rewardId: reward.id,
              seasonRewardId: seasonReward.id,
              title: seasonReward.name,
              description: seasonReward.longUnlockedDescription,
              url: (reward.claim?.data as EndOfSeasonUrlData)?.url,
              rewardType: SeasonRewardType.OTHERSIDE,
            },
          );
          break;
        case SeasonRewardType.LINEA_TOKENS:
          navigation.navigate(
            Routes.MODAL.REWARDS_END_OF_SEASON_CLAIM_BOTTOM_SHEET,
            {
              rewardId: reward.id,
              seasonRewardId: seasonReward.id,
              title: seasonReward.name,
              rewardType: SeasonRewardType.LINEA_TOKENS,
              showAccount: true,
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
    <Box
      flexDirection={BoxFlexDirection.Column}
      twClassName="flex-col mt-2 max-h-[72.5%]"
    >
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
                <FlatList
                  data={endOfSeasonRewards}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                  style={tw.style('w-full')}
                  contentContainerStyle={tw.style('gap-4 pb-20')}
                  renderItem={({ item: unlockedReward, index }) => {
                    const seasonReward = seasonTiers
                      ?.flatMap((tier) => tier.rewards)
                      ?.find(
                        (sr) => sr.id === unlockedReward.seasonRewardId,
                      ) as SeasonRewardDto;

                    const claimIsRedeem =
                      seasonReward?.rewardType ===
                        SeasonRewardType.METAL_CARD ||
                      seasonReward?.rewardType ===
                        SeasonRewardType.LINEA_TOKENS;

                    const rewardUrl = (
                      unlockedReward.claim?.data as
                        | EndOfSeasonUrlData
                        | undefined
                    )?.url;

                    const isLast = index === endOfSeasonRewards.length - 1;

                    return (
                      <Box twClassName={isLast ? 'mb-12' : undefined}>
                        <RewardItem
                          reward={unlockedReward}
                          seasonReward={seasonReward}
                          isLast={isLast}
                          isEndOfSeasonReward
                          endOfSeasonClaimedDescription={
                            claimIsRedeem
                              ? strings(
                                  'rewards.end_of_season_rewards.arriving_soon',
                                )
                              : undefined
                          }
                          compact
                          // Can't do anything if we don't have reward url allocated yet
                          isLocked={!rewardUrl && !claimIsRedeem}
                          onPress={handleEndOfSeasonClaim}
                        />
                      </Box>
                    );
                  }}
                />
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
