import React, { useCallback, useMemo } from 'react';
import { Linking, Platform } from 'react-native';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
  FontWeight,
  BoxJustifyContent,
  Icon,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import {
  MM_APP_STORE_LINK,
  MM_PLAY_STORE_LINK,
} from '../../../../../constants/urls';
import generateDeviceAnalyticsMetaData from '../../../../../util/metrics';
import { RewardsMetricsButtons } from '../../utils';
import { useMetrics, MetaMetricsEvents } from '../../../../hooks/useMetrics';
import {
  selectUnlockedRewards,
  selectSeasonTiers,
  selectSeasonShouldInstallNewVersion,
  selectUnlockedRewardLoading,
  selectUnlockedRewardError,
  selectCurrentTier,
} from '../../../../../reducers/rewards/selectors';
import { useSelector } from 'react-redux';
import {
  RewardDto,
  SeasonRewardDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import { useUnlockedRewards } from '../../hooks/useUnlockedRewards';
import RewardsSeasonEndedNoUnlockedRewardsImage from '../../../../../images/rewards/rewards-season-ended-no-unlocked-rewards.svg';
import RewardsErrorBanner from '../RewardsErrorBanner';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import RewardItem from '../RewardItem/RewardItem';
import { useTheme } from '../../../../../util/theme';
import { hasMinimumRequiredVersion } from '../../../../../util/remoteFeatureFlag';
import Routes from '../../../../../constants/navigation/Routes';

const LINEA_TOKEN_REWARD_NAME = 'Your $LINEA is waiting';

const PreviousSeasonUnlockedRewards = () => {
  const { trackEvent, createEventBuilder } = useMetrics();
  const { fetchUnlockedRewards } = useUnlockedRewards();
  const tw = useTailwind();
  const theme = useTheme();
  const navigation = useNavigation();
  const unlockedRewards = useSelector(selectUnlockedRewards);
  const unlockedRewardsLoading = useSelector(selectUnlockedRewardLoading);
  const unlockedRewardsError = useSelector(selectUnlockedRewardError);
  const seasonTiers = useSelector(selectSeasonTiers);
  const currentTier = useSelector(selectCurrentTier);
  const seasonMinimumVersion = useSelector(selectSeasonShouldInstallNewVersion);

  const shouldInstallNewVersion = useMemo(
    () =>
      seasonMinimumVersion && !hasMinimumRequiredVersion(seasonMinimumVersion),
    [seasonMinimumVersion],
  );

  const handleRewardPress = useCallback(
    (rewardId: string, seasonReward: SeasonRewardDto) => {
      if (
        seasonReward.name?.toLowerCase() ===
        LINEA_TOKEN_REWARD_NAME.toLowerCase()
      ) {
        navigation.navigate(Routes.MODAL.LINEA_TOKEN_CLAIM_BOTTOM_SHEET, {
          rewardId,
        });
      }
    },
    [navigation],
  );

  const openAppStore = useCallback(() => {
    const storeUrl =
      Platform.OS === 'ios' ? MM_APP_STORE_LINK : MM_PLAY_STORE_LINK;

    trackEvent(
      createEventBuilder(MetaMetricsEvents.REWARDS_PAGE_BUTTON_CLICKED)
        .addProperties({
          ...generateDeviceAnalyticsMetaData(),
          button_type: RewardsMetricsButtons.VISIT_APP_STORE,
          store_url: storeUrl,
        })
        .build(),
    );

    Linking.openURL(storeUrl).catch((error) => {
      console.warn('Error opening MetaMask store:', error);
    });
  }, [trackEvent, createEventBuilder]);

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
                    return (
                      <RewardItem
                        key={unlockedReward.id}
                        reward={unlockedReward}
                        seasonReward={seasonReward}
                        canPressToNavigateToInfo
                        isLast={unlockedReward === endOfSeasonRewards.at(-1)}
                        isEndOfSeasonReward
                        compact
                        isLocked={false}
                        onPress={(rewardId) =>
                          handleRewardPress(rewardId, seasonReward)
                        }
                      />
                    );
                  })}
                </Box>

                <Box twClassName="flex-row justify-center items-center w-full">
                  <Icon
                    name={
                      shouldInstallNewVersion
                        ? IconName.Danger
                        : IconName.Question
                    }
                    size={IconSize.Sm}
                    color={IconColor.IconAlternative}
                  />
                  <Text
                    variant={TextVariant.BodySm}
                    twClassName="text-alternative ml-1"
                  >
                    {shouldInstallNewVersion ? (
                      <>
                        <Text
                          variant={TextVariant.BodySm}
                          twClassName="text-alternative underline"
                          onPress={openAppStore}
                        >
                          {strings(
                            'rewards.previous_season_summary.update_metamask_version',
                            {
                              version: seasonMinimumVersion,
                            },
                          )}
                        </Text>
                        <Text
                          variant={TextVariant.BodySm}
                          twClassName="text-alternative"
                        >
                          {strings(
                            'rewards.previous_season_summary.to_claim_rewards',
                          )}
                        </Text>
                      </>
                    ) : (
                      <Text
                        variant={TextVariant.BodySm}
                        twClassName="text-alternative"
                      >
                        {strings(
                          'rewards.previous_season_summary.check_back_soon',
                        )}
                      </Text>
                    )}
                  </Text>
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
