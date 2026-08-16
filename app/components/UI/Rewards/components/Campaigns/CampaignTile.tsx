import React, { useMemo } from 'react';
import { ImageBackground, Pressable, useColorScheme } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../util/theme';
import NotificationIcon from '../../../../../images/rewards/notification.svg';
import moneyAccountSweepstakesCampaignArtwork from '../../../../../images/rewards/money-account-sweepstakes-campaign-v2.png';
import {
  CampaignType,
  type CampaignDto,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import {
  getCampaignStatusInfo,
  isCampaignTypeSupported,
} from './CampaignTile.utils';
import { strings } from '../../../../../../locales/i18n';
import useGetCampaignParticipantStatus from '../../hooks/useGetCampaignParticipantStatus';
import { useMoneyAccountSweepstakesParticipation } from '../../hooks/useMoneyAccountSweepstakesParticipation';
import { useCampaignReminderActions } from '../../hooks/useCampaignReminderActions';
import { navigateToRewardsRoute } from '../../utils';

interface CampaignTileProps {
  campaign: CampaignDto;
  /**
   * Custom press handler. If provided, this is called instead of the default
   * type-based navigation. Unsupported campaign types are only interactive
   * when an onPress handler is provided.
   */
  onPress?: () => void;
}

/**
 * CampaignTile displays campaign information with status.
 * Tapping behavior is determined by campaign type:
 * - ONDO_HOLDING: navigates to Ondo campaign details
 * - SEASON_1: navigates to season one campaign details
 * - PERPS_TRADING: navigates to Perps Trading campaign details
 * - PREDICT_THE_PITCH: navigates to Predict The Pitch campaign details
 * - MONEY_ACCOUNT_SWEEPSTAKES: navigates to Money Account Sweepstakes details
 * - Unsupported types: non-interactive unless onPress is provided
 * - With onPress: executes custom handler regardless of type
 */
const CampaignTile: React.FC<CampaignTileProps> = ({ campaign, onPress }) => {
  const tw = useTailwind();
  const colorScheme = useColorScheme();
  const { colors } = useTheme();
  const navigation = useNavigation<AppNavigationProp>();

  const isMoneyAccountSweepstakes =
    campaign.type === CampaignType.MONEY_ACCOUNT_SWEEPSTAKES;
  const campaignStatusInfo = useMemo(
    () => getCampaignStatusInfo(campaign),
    [campaign],
  );
  const campaignStatus = isMoneyAccountSweepstakes
    ? 'active'
    : campaignStatusInfo.status;
  const statusLabel = isMoneyAccountSweepstakes
    ? strings('rewards.campaign.pill_active')
    : campaignStatusInfo.statusLabel;
  const dateLabel = campaignStatusInfo.dateLabel;
  const campaignDisplayName = isMoneyAccountSweepstakes
    ? strings('rewards.money_account_sweepstakes.campaign_title')
    : campaign.name;

  const { status: participantStatus, isLoading: isParticipantStatusLoading } =
    useGetCampaignParticipantStatus(
      campaignStatus === 'active' &&
        (campaign.type === CampaignType.ONDO_HOLDING ||
          campaign.type === CampaignType.PERPS_TRADING ||
          campaign.type === CampaignType.PREDICT_THE_PITCH)
        ? campaign.id
        : undefined,
    );

  const {
    optedInAny: sweepstakesOptedInAny,
    isLoading: isSweepstakesParticipationLoading,
  } = useMoneyAccountSweepstakesParticipation(isMoneyAccountSweepstakes);

  const isOptedIn = isMoneyAccountSweepstakes
    ? sweepstakesOptedInAny
    : participantStatus?.optedIn === true;
  const isOptInLoading = isMoneyAccountSweepstakes
    ? isSweepstakesParticipationLoading
    : isParticipantStatusLoading;

  // Upcoming supported campaigns remain explorable so users can understand
  // the offer, timing, eligibility, and rules before opting in.
  const isInteractive =
    onPress != null || isCampaignTypeSupported(campaign.type);

  const reminderFeatureEnabled =
    campaignStatus === 'upcoming' &&
    !isMoneyAccountSweepstakes &&
    isCampaignTypeSupported(campaign.type);

  const { showRemindMeCta, handleRemindMePress } = useCampaignReminderActions(
    campaign,
    reminderFeatureEnabled,
  );

  // Money Account Sweepstakes uses opt-in rather than notifications. Its card
  // has one action: open the campaign and continue through eligibility checks.
  const showCardReminder = showRemindMeCta && !isMoneyAccountSweepstakes;

  const shouldShowDateLabel =
    !isMoneyAccountSweepstakes &&
    (campaignStatus !== 'upcoming' || campaign.showUpcomingDate);

  const displayedStatusLabel = statusLabel;

  const backgroundImageSource = isMoneyAccountSweepstakes
    ? moneyAccountSweepstakesCampaignArtwork
    : {
        uri:
          colorScheme === 'dark'
            ? campaign.image?.darkModeUrl
            : campaign.image?.lightModeUrl,
      };

  const hasTour = (campaign.details?.howItWorks?.tour?.length ?? 0) > 0;
  const shouldShowTour =
    hasTour && !isOptInLoading && !isOptedIn && campaignStatus === 'active';

  const handlePress = () => {
    if (!isInteractive) return;

    if (onPress) {
      onPress();
    } else if (campaign.type === CampaignType.ONDO_HOLDING) {
      if (shouldShowTour) {
        navigateToRewardsRoute(navigation, Routes.REWARDS_CAMPAIGN_TOUR_STEP, {
          campaignId: campaign.id,
        });
      } else {
        navigateToRewardsRoute(
          navigation,
          Routes.REWARDS_ONDO_CAMPAIGN_DETAILS_VIEW,
          {
            campaignId: campaign.id,
          },
        );
      }
    } else if (campaign.type === CampaignType.SEASON_1) {
      navigateToRewardsRoute(
        navigation,
        Routes.REWARDS_SEASON_ONE_CAMPAIGN_DETAILS_VIEW,
        {
          campaignId: campaign.id,
        },
      );
    } else if (campaign.type === CampaignType.PERPS_TRADING) {
      if (shouldShowTour) {
        navigateToRewardsRoute(navigation, Routes.REWARDS_CAMPAIGN_TOUR_STEP, {
          campaignId: campaign.id,
        });
      } else {
        navigateToRewardsRoute(
          navigation,
          Routes.REWARDS_PERPS_TRADING_CAMPAIGN_DETAILS_VIEW,
          {
            campaignId: campaign.id,
          },
        );
      }
    } else if (campaign.type === CampaignType.PREDICT_THE_PITCH) {
      if (shouldShowTour) {
        navigateToRewardsRoute(navigation, Routes.REWARDS_CAMPAIGN_TOUR_STEP, {
          campaignId: campaign.id,
        });
      } else {
        navigateToRewardsRoute(
          navigation,
          Routes.REWARDS_PREDICT_THE_PITCH_CAMPAIGN_DETAILS_VIEW,
          {
            campaignId: campaign.id,
          },
        );
      }
    } else if (campaign.type === CampaignType.MONEY_ACCOUNT_SWEEPSTAKES) {
      navigateToRewardsRoute(
        navigation,
        Routes.REWARDS_MONEY_ACCOUNT_SWEEPSTAKES_CAMPAIGN_DETAILS_VIEW,
        {
          campaignId: campaign.id,
        },
      );
    }
  };

  return (
    <Box twClassName="h-50 overflow-hidden rounded-xl bg-muted">
      <Pressable
        onPress={handlePress}
        disabled={!isInteractive}
        accessibilityRole={isInteractive ? 'button' : undefined}
        accessibilityLabel={campaignDisplayName}
        accessibilityHint={
          isInteractive
            ? strings('rewards.campaign.view_details_accessibility', {
                campaignName: campaignDisplayName,
              })
            : undefined
        }
        style={({ pressed }) =>
          tw.style('absolute inset-0', pressed && isInteractive && 'opacity-70')
        }
        testID={`campaign-tile-${campaign.id}`}
      >
        <ImageBackground
          source={backgroundImageSource}
          resizeMode="cover"
          style={tw.style('flex-1')}
          testID="campaign-tile-background"
        >
          <LinearGradient
            colors={['transparent', 'rgba(0, 0, 0, 0.78)']}
            locations={[0.25, 1]}
            pointerEvents="none"
            style={tw.style('absolute inset-0')}
          />
          {showCardReminder && (
            <Pressable
              onPress={() => {
                handleRemindMePress().catch(() => undefined);
              }}
              testID={`campaign-tile-remind-me-${campaign.id}`}
              accessibilityRole="button"
              accessibilityLabel={strings('rewards.campaign.notify_me')}
              hitSlop={12}
              style={({ pressed }) => [
                tw.style(
                  'absolute right-3 top-3 z-10 min-h-10 flex-row items-center gap-2 overflow-hidden rounded-full px-4',
                ),
                {
                  backgroundColor: pressed
                    ? 'rgba(10, 10, 14, 0.72)'
                    : 'rgba(10, 10, 14, 0.52)',
                  borderColor: 'rgba(255, 255, 255, 0.24)',
                  borderWidth: 1,
                  shadowColor: colors.shadow.default,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.22,
                  shadowRadius: 8,
                },
              ]}
            >
              <LinearGradient
                colors={[
                  'rgba(255, 255, 255, 0.14)',
                  'rgba(255, 255, 255, 0.02)',
                ]}
                pointerEvents="none"
                style={tw.style('absolute inset-0')}
              />
              <NotificationIcon
                name="notification"
                width={20}
                height={20}
                color={colors.overlay.inverse}
              />
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.OverlayInverse}
                fontWeight={FontWeight.Medium}
              >
                {strings('rewards.campaign.notify_me')}
              </Text>
            </Pressable>
          )}
          <Box
            flexDirection={BoxFlexDirection.Column}
            justifyContent={BoxJustifyContent.End}
            twClassName="p-4 flex-1"
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-1"
              testID="campaign-tile-status-label"
            >
              {participantStatus?.optedIn === true ? (
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.SuccessDefault}
                  fontWeight={FontWeight.Medium}
                  testID="campaign-tile-entered-label"
                >
                  {strings('rewards.campaign.entered')}
                </Text>
              ) : (
                <Text
                  variant={TextVariant.BodySm}
                  color={
                    isMoneyAccountSweepstakes && campaignStatus === 'upcoming'
                      ? TextColor.OverlayInverse
                      : colorScheme === 'dark'
                        ? TextColor.SuccessDefault
                        : TextColor.OverlayInverse
                  }
                  fontWeight={FontWeight.Medium}
                >
                  {displayedStatusLabel}
                </Text>
              )}
              {shouldShowDateLabel && (
                <>
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.OverlayInverse}
                    fontWeight={FontWeight.Medium}
                  >
                    •
                  </Text>
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.OverlayInverse}
                    fontWeight={FontWeight.Medium}
                    testID="campaign-tile-date-info"
                  >
                    {dateLabel}
                  </Text>
                </>
              )}
            </Box>

            <Text
              variant={TextVariant.HeadingLg}
              color={TextColor.OverlayInverse}
              twClassName={
                isMoneyAccountSweepstakes ? 'w-3/5 font-bold' : 'font-bold'
              }
              testID="campaign-tile-name"
            >
              {campaignDisplayName}
            </Text>
          </Box>
          <Box
            pointerEvents="none"
            twClassName="absolute inset-0 rounded-xl border border-border-muted"
          />
        </ImageBackground>
      </Pressable>
    </Box>
  );
};

export default CampaignTile;
